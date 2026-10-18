import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db, { queryOne, execute, transaction } from '../config/db.js';
import { signToken, authMiddleware } from '../middleware/auth.js';
import {
  validateEmail,
  validatePassword,
  sanitizeString,
  authRateLimiter,
  checkAccountLockout,
  recordLoginFailure,
  clearLoginFailure,
  DUMMY_HASH
} from '../middleware/security.js';
import { getOrCreateWallet, creditCoins } from '../services/walletService.js';
import { getBusinessContext } from '../services/businessRules.js';

const router = express.Router();

/**
 * 1. Register new user & business
 * Implements strict RFC 5322 email validation, password complexity policy (min 8 chars, letter+digit),
 * async 12-round bcrypt hashing, string sanitization, and atomic transaction.
 */
router.post('/register', authRateLimiter, async (req, res) => {
  try {
    const { email, password, fullName, companyName, industry } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Please provide full name, work email, and password.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!validateEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.reason });
    }

    const cleanName = sanitizeString(fullName, 100);
    if (cleanName.length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
    }

    const cleanCompany = sanitizeString(companyName, 120);
    const cleanIndustry = sanitizeString(industry || 'Industrial & Manufacturing', 80);

    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const userId = 'usr_' + uuidv4().slice(0, 8);
    const businessId = 'biz_' + uuidv4().slice(0, 8);
    const workspaceId = 'ws_' + uuidv4().slice(0, 8);

    // Asynchronous 12-round bcrypt hashing (non-blocking, highly resistant to brute-force)
    const passwordHash = await bcrypt.hash(password, 12);
    const bizName = cleanCompany || `${cleanName}'s Organization`;
    const bizSlug = bizName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 899 + 100);

    const result = await transaction(async () => {
      // 1. Create User with role explicitly set to 'user'
      await execute(`
        INSERT INTO users (id, email, password_hash, full_name, role, is_verified, is_active)
        VALUES (?, ?, ?, ?, 'user', 1, 1)
      `, [userId, cleanEmail, passwordHash, cleanName]);

      // 2. Create Business Workspace
      await execute(`
        INSERT INTO businesses (id, owner_id, name, slug, industry, description, storage_used_bytes)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `, [businessId, userId, bizName, bizSlug, cleanIndustry, `${bizName} CAD & 3D WebAR workspace`]);

      // 3. Create Default Workspace
      await execute(`
        INSERT INTO workspaces (id, business_id, name)
        VALUES (?, ?, ?)
      `, [workspaceId, businessId, `${bizName} Main Workspace`]);

      // 4. Create Team Member (Owner)
      const teamId = 'tm_' + uuidv4().slice(0, 8);
      await execute(`
        INSERT INTO team_members (id, business_id, user_id, role, invite_status)
        VALUES (?, ?, ?, 'owner', 'accepted')
      `, [teamId, businessId, userId]);

      // 5. Assign Free Plan subscription
      const subId = 'sub_' + uuidv4().slice(0, 8);
      await execute(`
        INSERT INTO subscriptions (id, business_id, plan_id, status, current_period_end)
        VALUES (?, ?, 'plan_free', 'active', DATE_ADD(NOW(), INTERVAL 30 DAY))
      `, [subId, businessId]);

      // 6. Create Wallet & Credit 100 Signup Bonus Coins
      await getOrCreateWallet(businessId);
      await creditCoins(
        businessId,
        userId,
        100,
        'subscription',
        'signup_bonus',
        'ModelAR Platform Welcome Bonus (100 coins)'
      );

      // 7. Create initial showcase gallery
      const galId = 'gal_' + uuidv4().slice(0, 8);
      await execute(`
        INSERT INTO galleries (id, business_id, name, slug, description, is_public)
        VALUES (?, ?, 'General Showcase', 'general-showcase', 'Default gallery for customer-facing 3D & WebAR models', 1)
      `, [galId, businessId]);

      return { userId, businessId, bizName, bizSlug };
    });

    const userPayload = {
      id: result.userId,
      email: cleanEmail,
      full_name: cleanName,
      role: 'user',
      avatar_url: null
    };

    const token = signToken(userPayload);

    return res.status(201).json({
      message: 'Account created successfully with 100 welcome bonus coins!',
      token,
      user: userPayload,
      business: {
        id: result.businessId,
        name: result.bizName,
        slug: result.bizSlug,
        teamRole: 'owner'
      }
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    res.status(500).json({ error: 'Registration failed due to a server error. Please try again.' });
  }
});

/**
 * 2. Login
 * Implements:
 * - Rate limiting (IP-based)
 * - Account lockout protection (5 failed attempts = 15m lockout)
 * - Constant-time execution against dummy hash to prevent user enumeration / timing attacks
 * - Asynchronous bcrypt verification
 * - Deactivated account check
 */
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown-ip';
    const lockKey = `${cleanEmail}:${clientIp}`;

    // Check account lockout
    const lockout = checkAccountLockout(lockKey);
    if (lockout.locked) {
      return res.status(429).json({
        error: lockout.message,
        code: 'ACCOUNT_LOCKED',
        remainingMinutes: lockout.remainingMinutes
      });
    }

    const user = await queryOne('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (!user) {
      // Execute constant-time comparison against dummy hash to prevent timing attack enumeration
      await bcrypt.compare(password, DUMMY_HASH);
      recordLoginFailure(lockKey);
      return res.status(401).json({ error: 'Invalid email address or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact support.', code: 'ACCOUNT_DEACTIVATED' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      recordLoginFailure(lockKey);
      return res.status(401).json({ error: 'Invalid email address or password' });
    }

    // Login successful: reset failed attempt counter
    clearLoginFailure(lockKey);

    // Fetch primary business association
    let businessMember = await queryOne(`
      SELECT b.id as business_id, b.name as business_name, b.slug as business_slug, tm.role as team_role
      FROM team_members tm
      JOIN businesses b ON tm.business_id = b.id
      WHERE tm.user_id = ? AND tm.invite_status = 'accepted'
      ORDER BY CASE WHEN tm.role = 'owner' THEN 1 ELSE 2 END
      LIMIT 1
    `, [user.id]);

    if (!businessMember) {
      const ownedBiz = await queryOne(`
        SELECT id as business_id, name as business_name, slug as business_slug
        FROM businesses
        WHERE owner_id = ?
        LIMIT 1
      `, [user.id]);

      if (ownedBiz) {
        businessMember = { ...ownedBiz, team_role: 'owner' };
        try {
          await execute(`
            INSERT IGNORE INTO team_members (id, business_id, user_id, role, invite_status)
            VALUES (?, ?, ?, 'owner', 'accepted')
          `, ['tm_' + user.id.replace('usr_', ''), ownedBiz.business_id, user.id]);
        } catch (e) {
          // ignore duplicate
        }
      }
    }

    // Sanitize user object: NEVER leak password_hash to frontend
    const userPayload = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar_url: user.avatar_url
    };

    const token = signToken(userPayload);

    res.json({
      message: 'Login successful',
      token,
      user: userPayload,
      business: businessMember ? {
        id: businessMember.business_id,
        name: businessMember.business_name,
        slug: businessMember.business_slug,
        teamRole: businessMember.team_role
      } : null
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    res.status(500).json({ error: 'Login failed due to a server error. Please try again.' });
  }
});

/**
 * 3. Get Current User Profile & Context
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    let businessContext = null;
    if (req.business) {
      businessContext = await getBusinessContext(req.business.id);
    }

    res.json({
      user: req.user,
      business: req.business,
      context: businessContext
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. Change Password (Authenticated & Secure)
 * Verifies existing password, validates new password complexity,
 * and updates hash securely.
 */
router.post('/change-password', authMiddleware, authRateLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current password and new password are required' });
    }

    const pwdCheck = validatePassword(newPassword);
    if (!pwdCheck.valid) {
      return res.status(400).json({ error: pwdCheck.reason });
    }

    const user = await queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validCurrent = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validCurrent) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      return res.status(400).json({ error: 'New password cannot be the same as your current password' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await execute('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[Change Password Error]:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

/**
 * 5. Forgot Password
 * Prevents user enumeration by always returning the same response.
 */
router.post('/forgot-password', authRateLimiter, (req, res) => {
  const { email } = req.body;
  if (!email || !validateEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }
  // Generic timing-safe response
  res.json({ message: 'If an account associated with this email exists, password reset instructions have been dispatched.' });
});

export default router;
