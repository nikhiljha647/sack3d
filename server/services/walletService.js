import { v4 as uuidv4 } from 'uuid';
import { queryOne, queryAll, execute, transaction } from '../config/db.js';

/**
 * Wallet & Ledger Service
 * Strictly manages separate accounting for Subscription vs Purchased coins.
 * Every single coin balance change is recorded in coin_transactions ledger.
 */

export async function getOrCreateWallet(businessId) {
  let wallet = await queryOne('SELECT * FROM wallets WHERE business_id = ?', [businessId]);
  if (!wallet) {
    const id = 'wal_' + uuidv4().slice(0, 8);
    await execute(`
      INSERT INTO wallets (id, business_id, subscription_balance, purchased_balance, daily_bonus_claimed_this_month)
      VALUES (?, ?, 0, 0, 0)
    `, [id, businessId]);
    wallet = await queryOne('SELECT * FROM wallets WHERE id = ?', [id]);
  }
  return {
    id: wallet.id,
    businessId: wallet.business_id,
    subscriptionBalance: Number(wallet.subscription_balance || 0),
    purchasedBalance: Number(wallet.purchased_balance || 0),
    totalBalance: Number(wallet.subscription_balance || 0) + Number(wallet.purchased_balance || 0),
    dailyBonusClaimedThisMonth: Number(wallet.daily_bonus_claimed_this_month || 0),
    lastDailyBonusAt: wallet.last_daily_bonus_at
  };
}

export async function getTransactions(businessId, limit = 50, offset = 0) {
  return await queryAll(`
    SELECT t.*, u.full_name as user_name, u.email as user_email, m.title as model_title
    FROM coin_transactions t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN models m ON t.related_model_id = m.id
    WHERE t.business_id = ?
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `, [businessId, limit, offset]);
}

/**
 * Deduct coins from business wallet using FIFO:
 * First consumes subscription coins, then purchased coins.
 */
export async function deductCoins(businessId, userId, amount, transactionType, description, relatedModelId = null, relatedRevisionId = null) {
  if (amount <= 0) throw new Error('Deduction amount must be positive');

  return await transaction(async () => {
    const walletRow = await queryOne('SELECT * FROM wallets WHERE business_id = ?', [businessId]);
    if (!walletRow) throw new Error('Wallet not found');

    const subBal = Number(walletRow.subscription_balance || 0);
    const purBal = Number(walletRow.purchased_balance || 0);
    const totalBal = subBal + purBal;

    if (totalBal < amount) {
      throw new Error(`Insufficient coins. Required: ${amount}, Available: ${totalBal}`);
    }

    let deductSub = 0;
    let deductPur = 0;
    let coinSource = 'subscription';

    if (subBal >= amount) {
      deductSub = amount;
      coinSource = 'subscription';
    } else {
      deductSub = subBal;
      deductPur = amount - subBal;
      coinSource = subBal > 0 ? 'mixed' : 'purchased';
    }

    const newSubBal = subBal - deductSub;
    const newPurBal = purBal - deductPur;
    const newTotal = newSubBal + newPurBal;

    // Update wallet
    await execute(`
      UPDATE wallets
      SET subscription_balance = ?, purchased_balance = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newSubBal, newPurBal, walletRow.id]);

    // Insert ledger transaction
    const txId = 'tx_' + uuidv4().slice(0, 8);
    await execute(`
      INSERT INTO coin_transactions (
        id, wallet_id, user_id, business_id, amount, coin_source, transaction_type,
        description, related_model_id, related_revision_id, payment_id, balance_after
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    `, [
      txId,
      walletRow.id,
      userId,
      businessId,
      -amount,
      coinSource,
      transactionType,
      description,
      relatedModelId,
      relatedRevisionId,
      newTotal
    ]);

    return {
      success: true,
      transactionId: txId,
      amountDeducted: amount,
      deductedFromSubscription: deductSub,
      deductedFromPurchased: deductPur,
      newBalance: {
        subscriptionBalance: newSubBal,
        purchasedBalance: newPurBal,
        totalBalance: newTotal
      }
    };
  });
}

/**
 * Credit coins to business wallet (Purchased or Subscription allowance)
 */
export async function creditCoins(businessId, userId, amount, coinSource, transactionType, description, paymentId = null) {
  if (amount <= 0) throw new Error('Credit amount must be positive');

  return await transaction(async () => {
    let walletRow = await queryOne('SELECT * FROM wallets WHERE business_id = ?', [businessId]);
    if (!walletRow) {
      await getOrCreateWallet(businessId);
      walletRow = await queryOne('SELECT * FROM wallets WHERE business_id = ?', [businessId]);
    }

    let subBal = Number(walletRow.subscription_balance || 0);
    let purBal = Number(walletRow.purchased_balance || 0);

    if (coinSource === 'subscription') {
      subBal += amount;
    } else {
      purBal += amount;
    }

    const newTotal = subBal + purBal;

    await execute(`
      UPDATE wallets
      SET subscription_balance = ?, purchased_balance = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [subBal, purBal, walletRow.id]);

    const txId = 'tx_' + uuidv4().slice(0, 8);
    await execute(`
      INSERT INTO coin_transactions (
        id, wallet_id, user_id, business_id, amount, coin_source, transaction_type,
        description, related_model_id, related_revision_id, payment_id, balance_after
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
    `, [
      txId,
      walletRow.id,
      userId,
      businessId,
      amount,
      coinSource,
      transactionType,
      description,
      paymentId,
      newTotal
    ]);

    return {
      success: true,
      transactionId: txId,
      creditedAmount: amount,
      coinSource,
      newBalance: {
        subscriptionBalance: subBal,
        purchasedBalance: purBal,
        totalBalance: newTotal
      }
    };
  });
}

/**
 * Claim Free Plan Daily Bonus (+20 coins/day, capped at 60/month)
 */
export async function claimDailyBonus(businessId, userId) {
  return await transaction(async () => {
    const walletRow = await queryOne('SELECT * FROM wallets WHERE business_id = ?', [businessId]);
    if (!walletRow) throw new Error('Wallet not found');

    const subscription = await queryOne(`
      SELECT p.daily_bonus_coins, p.daily_bonus_monthly_cap, p.slug
      FROM subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.business_id = ? AND s.status = 'active'
    `, [businessId]);

    const dailyBonus = subscription ? Number(subscription.daily_bonus_coins || 0) : 0;
    const monthlyCap = subscription ? Number(subscription.daily_bonus_monthly_cap || 0) : 0;

    if (dailyBonus <= 0) {
      throw new Error('Daily bonus is not available on this plan');
    }

    const currentClaimed = Number(walletRow.daily_bonus_claimed_this_month || 0);
    if (currentClaimed >= monthlyCap) {
      throw new Error(`You have reached the monthly daily bonus cap of ${monthlyCap} coins.`);
    }

    // Check last claim timestamp (must be at least 20 hours ago)
    if (walletRow.last_daily_bonus_at) {
      const lastClaimTime = new Date(walletRow.last_daily_bonus_at).getTime();
      const elapsedHours = (Date.now() - lastClaimTime) / (1000 * 60 * 60);
      if (elapsedHours < 20) {
        const nextInHours = Math.ceil(20 - elapsedHours);
        throw new Error(`Daily bonus already claimed today. Next bonus available in ${nextInHours} hour(s).`);
      }
    }

    const coinsToAward = Math.min(dailyBonus, monthlyCap - currentClaimed);
    const subBal = Number(walletRow.subscription_balance || 0) + coinsToAward;
    const purBal = Number(walletRow.purchased_balance || 0);
    const newTotal = subBal + purBal;

    await execute(`
      UPDATE wallets
      SET subscription_balance = ?, daily_bonus_claimed_this_month = daily_bonus_claimed_this_month + ?,
          last_daily_bonus_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [subBal, coinsToAward, walletRow.id]);

    const txId = 'tx_' + uuidv4().slice(0, 8);
    await execute(`
      INSERT INTO coin_transactions (
        id, wallet_id, user_id, business_id, amount, coin_source, transaction_type,
        description, balance_after
      ) VALUES (?, ?, ?, ?, ?, 'subscription', 'daily_credit', ?, ?)
    `, [
      txId,
      walletRow.id,
      userId,
      businessId,
      coinsToAward,
      `Free Tier daily login bonus (+${coinsToAward} coins)`,
      newTotal
    ]);

    return {
      success: true,
      coinsAwarded: coinsToAward,
      totalClaimedThisMonth: currentClaimed + coinsToAward,
      monthlyCap,
      newBalance: {
        subscriptionBalance: subBal,
        purchasedBalance: purBal,
        totalBalance: newTotal
      }
    };
  });
}
