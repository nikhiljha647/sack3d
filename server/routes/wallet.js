import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getOrCreateWallet, getTransactions, claimDailyBonus } from '../services/walletService.js';
import { getBusinessContext } from '../services/businessRules.js';

const router = express.Router();

// Get wallet balance breakdown & daily bonus status
router.get('/', authMiddleware, async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.business.id);
    const ctx = await getBusinessContext(req.business.id);

    const dailyBonusCoins = Number(ctx.plan.daily_bonus_coins || 0);
    const dailyBonusMonthlyCap = Number(ctx.plan.daily_bonus_monthly_cap || 0);
    const claimedThisMonth = Number(wallet.dailyBonusClaimedThisMonth || 0);
    const isEligible = dailyBonusCoins > 0;

    let canClaimDaily = isEligible && claimedThisMonth < dailyBonusMonthlyCap;
    let nextAvailableInHours = 0;

    if (canClaimDaily && wallet.lastDailyBonusAt) {
      const elapsedHours = (Date.now() - new Date(wallet.lastDailyBonusAt).getTime()) / (1000 * 60 * 60);
      if (elapsedHours < 20) {
        canClaimDaily = false;
        nextAvailableInHours = Math.ceil(20 - elapsedHours);
      }
    }

    res.json({
      wallet,
      plan: ctx.plan.plan_name,
      planSlug: ctx.plan.plan_slug,
      dailyBonus: {
        isEligible,
        dailyAmount: dailyBonusCoins,
        monthlyCap: dailyBonusMonthlyCap,
        claimedThisMonth,
        remainingThisMonth: Math.max(0, dailyBonusMonthlyCap - claimedThisMonth),
        canClaimNow: canClaimDaily,
        nextAvailableInHours
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get transactions ledger
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const transactions = await getTransactions(req.business.id, parseInt(limit, 10), parseInt(offset, 10));
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Claim daily login bonus
router.post('/claim-daily-bonus', authMiddleware, async (req, res) => {
  try {
    const result = await claimDailyBonus(req.business.id, req.user.id);
    res.json({
      message: `Successfully claimed +${result.coinsAwarded} daily bonus coins!`,
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
