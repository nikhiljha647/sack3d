import jwt from 'jsonwebtoken';
import { queryOne, execute } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'modelar-super-secret-key-prod-2026';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'modelar-super-secret-key-prod-2026')) {
  console.warn('[Security Warning]: Using default or unset JWT_SECRET in production! Please define a strong, unique 64+ char JWT_SECRET in your .env file.');
}
const JWT_ISSUER = 'modelar.io';
const JWT_AUDIENCE = 'modelar-api';

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '24h',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }
  );
}

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required', code: 'UNAUTHORIZED' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });

    const user = await queryOne('SELECT id, email, full_name, role, avatar_url, is_active FROM users WHERE id = ?', [decoded.id]);

    if (!user) {
      return res.status(401).json({ error: 'User account not found', code: 'USER_NOT_FOUND' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'User account is deactivated or suspended. Please contact support.', code: 'ACCOUNT_DEACTIVATED' });
    }

    // Attach active business context
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

    req.user = user;
    req.business = businessMember ? {
      id: businessMember.business_id,
      name: businessMember.business_name,
      slug: businessMember.business_slug,
      teamRole: businessMember.team_role
    } : null;

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please sign in again.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid authentication token', code: 'INVALID_TOKEN' });
  }
}

// Optional auth for public model pages where a user might be logged in or anonymous
export async function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    req.business = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });

    const user = await queryOne('SELECT id, email, full_name, role, avatar_url, is_active FROM users WHERE id = ?', [decoded.id]);
    if (user && user.is_active) {
      let businessMember = await queryOne(`
        SELECT b.id as business_id, b.name as business_name, b.slug as business_slug, tm.role as team_role
        FROM team_members tm
        JOIN businesses b ON tm.business_id = b.id
        WHERE tm.user_id = ? AND tm.invite_status = 'accepted'
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
        }
      }

      req.user = user;
      req.business = businessMember ? {
        id: businessMember.business_id,
        name: businessMember.business_name,
        slug: businessMember.business_slug,
        teamRole: businessMember.team_role
      } : null;
    }
  } catch (err) {
    // Ignore invalid optional tokens
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin privileges required', code: 'FORBIDDEN' });
  }
  next();
}

export function requireBusinessRole(roles = ['owner', 'admin', 'editor']) {
  return (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next(); // Platform admins bypass
    if (!req.business) {
      return res.status(403).json({ error: 'No active business organization associated with this account', code: 'NO_BUSINESS' });
    }
    if (!roles.includes(req.business.teamRole)) {
      return res.status(403).json({ error: `Permission denied. Requires one of: ${roles.join(', ')}`, code: 'INSUFFICIENT_ROLE' });
    }
    next();
  };
}
