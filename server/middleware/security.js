import bcrypt from 'bcryptjs';

// Pre-computed dummy hash to prevent timing attacks / user enumeration
export const DUMMY_HASH = '$2b$12$e80yqX41n5s0R5eH96T8vOGy5fB5W7oQ2w2U2V5fG9lM1n4k8p0qW';

// In-memory failed login tracking: email/IP -> { count, lockedUntil, lastAttempt }
const failedAttempts = new Map();
// In-memory request rate limiting: ip -> { count, resetTime }
const ipRateLimits = new Map();

// Periodic cleanup of stale tracking entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of failedAttempts.entries()) {
    if (record.lockedUntil && record.lockedUntil < now && now - record.lastAttempt > 30 * 60 * 1000) {
      failedAttempts.delete(key);
    }
  }
  for (const [ip, record] of ipRateLimits.entries()) {
    if (now > record.resetTime) {
      ipRateLimits.delete(ip);
    }
  }
}, 10 * 60 * 1000);

/**
 * 1. Email format validation (strict RFC 5322 compliant)
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 255) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * 2. Password complexity validation:
 * - Minimum 8 characters, Maximum 128 characters (prevents bcrypt DoS)
 * - Must contain at least one letter and at least one digit
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, reason: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, reason: 'Password cannot exceed 128 characters' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  if (!hasLetter || !hasDigit) {
    return { valid: false, reason: 'Password must contain at least one letter and one number' };
  }
  return { valid: true };
}

/**
 * 3. String Sanitizer (prevents script injection & trims whitespace)
 */
export function sanitizeString(input, maxLength = 255) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>]/g, '') // Strip angle brackets
    .slice(0, maxLength);
}

/**
 * 4. General Auth Rate Limiter (IP-based)
 * Limits to 20 requests per minute per IP for sensitive auth routes
 */
export function authRateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 20;

  let record = ipRateLimits.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    ipRateLimits.set(ip, record);
  } else {
    record.count++;
  }

  if (record.count > maxRequests) {
    const retrySec = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader('Retry-After', retrySec);
    return res.status(429).json({
      error: `Too many requests from this IP. Please try again in ${retrySec} seconds.`,
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }

  next();
}

/**
 * 5. Account Lockout Protection (Email + IP based)
 * Locks out an account after 5 consecutive failed login attempts for 15 minutes.
 */
export function checkAccountLockout(identifier) {
  const now = Date.now();
  const record = failedAttempts.get(identifier);
  if (record && record.lockedUntil && record.lockedUntil > now) {
    const remainingMinutes = Math.ceil((record.lockedUntil - now) / (60 * 1000));
    return {
      locked: true,
      remainingMinutes,
      message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`
    };
  }
  return { locked: false };
}

export function recordLoginFailure(identifier) {
  const now = Date.now();
  const lockoutDuration = 15 * 60 * 1000; // 15 minutes lockout
  const maxAttempts = 5;

  let record = failedAttempts.get(identifier);
  if (!record || (record.lockedUntil && record.lockedUntil < now)) {
    record = { count: 1, lockedUntil: null, lastAttempt: now };
  } else {
    record.count++;
    record.lastAttempt = now;
  }

  if (record.count >= maxAttempts) {
    record.lockedUntil = now + lockoutDuration;
    console.warn(`[Security Alert] Account lockout triggered for: ${identifier} for 15 minutes.`);
  }

  failedAttempts.set(identifier, record);
  return record;
}

export function clearLoginFailure(identifier) {
  failedAttempts.delete(identifier);
}

/**
 * 6. Security Headers Middleware
 * Protects against MIME-sniffing, clickjacking, XSS, and caching sensitive auth data
 */
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Protect sensitive endpoints against clickjacking, while allowing public 3D model/gallery embeds
  if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/wallet') || req.path.startsWith('/api/admin')) {
    res.setHeader('X-Frame-Options', 'DENY');
  } else {
    // Permissive frame-ancestors for 3D WebAR iframe widgets on customer websites (Shopify, WordPress, etc.)
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *");
  }

  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Prevent browser caching of sensitive authenticated responses
  if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/wallet')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}
