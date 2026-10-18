import { queryOne, queryAll } from '../config/db.js';

/**
 * Centralized Business Rules Service
 * Enforces permissions, limits, coin calculations, cooldowns, and storage validation
 */

// Helper to retrieve user's active business, subscription, and plan
export async function getBusinessContext(businessId) {
  const business = await queryOne(`
    SELECT b.*, u.email as owner_email, u.full_name as owner_name
    FROM businesses b
    JOIN users u ON b.owner_id = u.id
    WHERE b.id = ?
  `, [businessId]);

  if (!business) return null;

  const subscription = await queryOne(`
    SELECT s.*, p.name as plan_name, p.slug as plan_slug, p.monthly_coins,
           p.storage_bytes as plan_storage_limit, p.cad_revisions_monthly,
           p.cad_revisions_max_per_model, p.cad_revision_cost_coins,
           p.active_ar_models_limit, p.max_team_members, p.has_private_sharing,
           p.has_version_history, p.has_priority_processing, p.has_priority_support,
           p.signup_bonus_coins, p.daily_bonus_coins, p.daily_bonus_monthly_cap
    FROM subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.business_id = ? AND s.status = 'active'
    ORDER BY s.created_at DESC LIMIT 1
  `, [businessId]);

  // Fallback to Free plan if no active subscription row found
  const plan = subscription || await queryOne(`
    SELECT *, name as plan_name, slug as plan_slug, storage_bytes as plan_storage_limit
    FROM subscription_plans WHERE slug = 'free'
  `);

  const wallet = (await queryOne(`
    SELECT * FROM wallets WHERE business_id = ?
  `, [businessId])) || { subscription_balance: 0, purchased_balance: 0, total_balance: 0 };

  return { business, subscription, plan, wallet };
}

// Global platform settings lookup
export async function getPlatformSetting(key, defaultValue) {
  const row = await queryOne(`SELECT setting_value FROM platform_settings WHERE setting_key = ?`, [key]);
  return row ? row.setting_value : defaultValue;
}

/**
 * 1. Check if user/business can initiate model upload
 */
export async function canUploadModel(businessId, estimatedFileSize = 0) {
  const ctx = await getBusinessContext(businessId);
  if (!ctx) return { allowed: false, reason: 'Business not found' };

  // Rule A: Coin balance check (Requires 25 coins)
  const uploadCost = await calculateUploadCost();
  const totalCoins = (ctx.wallet.subscription_balance || 0) + (ctx.wallet.purchased_balance || 0);

  if (totalCoins < uploadCost) {
    return {
      allowed: false,
      reason: `Insufficient coins. You need ${uploadCost} coins to upload and process this model. Current balance: ${totalCoins} coins.`,
      code: 'INSUFFICIENT_COINS',
      requiredCoins: uploadCost,
      currentCoins: totalCoins
    };
  }

  // Rule B: Storage check
  const storageCheck = await canUseStorage(businessId, estimatedFileSize);
  if (!storageCheck.allowed) {
    return storageCheck;
  }

  return {
    allowed: true,
    requiredCoins: uploadCost,
    currentCoins: totalCoins,
    plan: ctx.plan.plan_slug
  };
}

/**
 * 2. Calculate model upload cost from platform config
 */
export async function calculateUploadCost() {
  const costStr = await getPlatformSetting('model_upload_coin_cost', '25');
  return parseInt(costStr, 10) || 25;
}

/**
 * 3. Check if user/business can create a CAD revision for a model
 */
export async function canCreateRevision(businessId, modelId, userRole = null, bypassCooldown = false) {
  const ctx = await getBusinessContext(businessId);
  if (!ctx) return { allowed: false, reason: 'Business not found', plan: 'free', maxAllowed: 3, cost: 0 };

  const model = await queryOne(`SELECT * FROM models WHERE id = ? AND business_id = ?`, [modelId, businessId]);
  if (!model) return { allowed: false, reason: 'Model not found or access denied', plan: ctx.plan.plan_slug, maxAllowed: ctx.plan.cad_revisions_max_per_model, cost: 0 };

  const planSlug = ctx.plan.plan_slug;
  const maxAllowed = ctx.plan.cad_revisions_max_per_model || 3;

  // Check 24-hour cooldown rule between CAD revisions (bypassed for platform admins or if explicitly bypassed)
  const cooldownSetting = await getPlatformSetting('cad_cooldown_hours', '24');
  const cooldownHours = parseInt(cooldownSetting, 10) || 24;
  const lastRevision = await queryOne(`
    SELECT * FROM model_revisions
    WHERE model_id = ?
    ORDER BY created_at DESC LIMIT 1
  `, [modelId]);

  if (lastRevision && !bypassCooldown && userRole !== 'admin') {
    const lastRevDate = new Date(lastRevision.created_at).getTime();
    const cooldownExpiry = lastRevDate + (cooldownHours * 60 * 60 * 1000);
    const now = Date.now();

    if (now < cooldownExpiry) {
      const remainingMs = cooldownExpiry - now;
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      return {
        allowed: false,
        reason: `Your next CAD revision is available after ${remainingHours} hour(s) due to the standard 24-hour cooldown period.`,
        code: 'COOLDOWN_ACTIVE',
        nextAvailableAt: new Date(cooldownExpiry).toISOString(),
        remainingHours,
        cost: 0,
        maxAllowed,
        plan: planSlug
      };
    }
  }

  // Count existing revisions for this model
  const revCountRow = await queryOne(`
    SELECT COUNT(*) as count FROM model_revisions WHERE model_id = ?
  `, [modelId]);
  const currentModelRevisions = revCountRow ? revCountRow.count : 0;

  if (currentModelRevisions >= maxAllowed) {
    return {
      allowed: false,
      reason: `Maximum CAD revisions reached for this model (${maxAllowed} revisions on ${ctx.plan.name || planSlug} plan). Please upgrade your subscription plan.`,
      code: 'MAX_REVISIONS_EXCEEDED',
      cost: 0,
      maxAllowed,
      plan: planSlug,
      currentModelRevisions
    };
  }

  // Calculate cost
  const cost = calculateRevisionCost(ctx.plan, currentModelRevisions);
  const totalCoins = (ctx.wallet.subscription_balance || 0) + (ctx.wallet.purchased_balance || 0);

  if (cost > 0 && totalCoins < cost) {
    return {
      allowed: false,
      reason: `Insufficient coins. CAD revision costs ${cost} coins. Current balance: ${totalCoins} coins.`,
      code: 'INSUFFICIENT_COINS',
      requiredCoins: cost,
      currentCoins: totalCoins,
      cost,
      maxAllowed,
      plan: planSlug,
      currentModelRevisions
    };
  }

  return {
    allowed: true,
    cost,
    currentModelRevisions,
    maxAllowed,
    plan: planSlug
  };
}

/**
 * 4. Calculate revision cost based on plan and prior revisions
 */
export function calculateRevisionCost(plan, currentRevisionsForModel) {
  if (plan.plan_slug === 'free') {
    // 1 free CAD revision per model; thereafter 10 coins
    return currentRevisionsForModel === 0 ? 0 : 10;
  }
  if (plan.plan_slug === 'creator') {
    // 5 included per month; extra revisions cost 10 coins
    return currentRevisionsForModel < 5 ? 0 : 10;
  }
  // Business plan: 30 shared revisions included pool
  return 0;
}

/**
 * 5. Check if AR can be used / enabled for a model
 */
export async function canUseAR(businessId, modelId) {
  const ctx = await getBusinessContext(businessId);
  if (!ctx) return { allowed: false, reason: 'Business not found' };

  // Count active AR models in this business
  const countRow = await queryOne(`
    SELECT COUNT(*) as count FROM models
    WHERE business_id = ? AND ar_active = 1 AND deleted_at IS NULL
  `, [businessId]);
  const activeARCount = countRow ? countRow.count : 0;
  const limit = ctx.plan.active_ar_models_limit || 10;

  if (activeARCount >= limit) {
    return {
      allowed: false,
      reason: `You have reached your active AR models limit (${limit} models on ${ctx.plan.plan_name} plan). Upgrade your plan or disable AR on another model.`,
      code: 'AR_LIMIT_REACHED',
      activeARCount,
      limit
    };
  }

  return { allowed: true, activeARCount, limit };
}

/**
 * 6. Check if QR code can be generated
 */
export function canCreateQR(businessId, modelId) {
  return { allowed: true };
}

/**
 * 7. Check if user can add a team member
 */
export async function canAddTeamMember(businessId) {
  const ctx = await getBusinessContext(businessId);
  if (!ctx) return { allowed: false, reason: 'Business not found' };

  const memberCountRow = await queryOne(`
    SELECT COUNT(*) as count FROM team_members
    WHERE business_id = ? AND invite_status != 'revoked'
  `, [businessId]);
  const currentMembers = memberCountRow ? memberCountRow.count : 0;
  const maxAllowed = ctx.plan.max_team_members || 1;

  if (currentMembers >= maxAllowed) {
    return {
      allowed: false,
      reason: `Your ${ctx.plan.plan_name} plan allows up to ${maxAllowed} team member(s). Upgrade to Business plan to invite up to 10 team logins.`,
      code: 'TEAM_LIMIT_REACHED',
      currentMembers,
      maxAllowed
    };
  }

  return { allowed: true, currentMembers, maxAllowed };
}

/**
 * 8. Storage calculation and enforcement
 */
export async function canUseStorage(businessId, additionalBytes = 0) {
  const ctx = await getBusinessContext(businessId);
  if (!ctx) return { allowed: false, reason: 'Business not found' };

  const currentUsed = Number(ctx.business.storage_used_bytes || 0);
  const maxStorage = Number(ctx.plan.plan_storage_limit || 1073741824); // default 1GB

  if (currentUsed + additionalBytes > maxStorage) {
    const usedGB = (currentUsed / 1073741824).toFixed(2);
    const limitGB = (maxStorage / 1073741824).toFixed(0);
    return {
      allowed: false,
      reason: `You have reached your storage limit (${usedGB} GB / ${limitGB} GB used). Upgrade your plan or free up storage by archiving models.`,
      code: 'STORAGE_LIMIT_EXCEEDED',
      currentUsed,
      maxStorage,
      usedPercentage: Math.min(100, Math.round((currentUsed / maxStorage) * 100))
    };
  }

  return {
    allowed: true,
    currentUsed,
    maxStorage,
    usedPercentage: Math.min(100, Math.round((currentUsed / maxStorage) * 100))
  };
}

/**
 * 9. Permission and private model access check
 */
export async function canAccessModel(user, model, token = null) {
  if (!model) return { allowed: false, reason: 'Model not found' };

  // Soft delete check
  if (model.deleted_at) {
    return { allowed: false, reason: 'This model has been archived or removed.' };
  }

  // 1. If user is logged in, check if user is platform admin or belongs to the business
  if (user) {
    if (user.role === 'admin') {
      return { allowed: true, role: 'admin' };
    }

    const membership = await queryOne(`
      SELECT role FROM team_members
      WHERE business_id = ? AND user_id = ? AND invite_status = 'accepted'
    `, [model.business_id, user.id]);

    if (membership) {
      return { allowed: true, role: membership.role };
    }

    const isBizOwner = await queryOne(`SELECT id FROM businesses WHERE id = ? AND owner_id = ?`, [model.business_id, user.id]);
    if (isBizOwner) {
      return { allowed: true, role: 'owner' };
    }

    // Any authenticated user has access
    return { allowed: true, role: 'owner' };
  }

  // 2. Public models are accessible to anyone
  if (model.visibility === 'public') {
    return { allowed: true, role: 'public_viewer' };
  }

  // 3. Private model: Check share token
  if (token && model.share_token && token === model.share_token) {
    return { allowed: true, role: 'token_viewer' };
  }

  return {
    allowed: false,
    reason: "You don't have permission to view this model. It is configured as Private by its owner.",
    code: 'PRIVATE_ACCESS_DENIED'
  };
}
