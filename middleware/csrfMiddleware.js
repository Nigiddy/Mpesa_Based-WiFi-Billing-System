/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks using modern csrf-csrf (Double Submit Cookie Pattern).
 * Replaces deprecated 'csurf' package.
 */

const { doubleCsrf } = require('csrf-csrf');

const isProduction = process.env.NODE_ENV === 'production';

// AUTH-13 FIX: Removed the hardcoded 'kibaruani_csrf_secret_fallback_key_min32' fallback.
// Using a publicly-known hardcoded string as the CSRF signing secret would allow an
// attacker to forge valid CSRF tokens. If COOKIE_SECRET (preferred) and JWT_SECRET
// (fallback) are both absent the module now throws at startup.
// validateSecrets() in config/secrets.js also enforces this, but belt-and-suspenders
// is appropriate for a security-critical module.
const csrfSecret = process.env.COOKIE_SECRET || process.env.JWT_SECRET;
if (!csrfSecret) {
  throw new Error(
    '[CSRF] COOKIE_SECRET (or JWT_SECRET) must be set. ' +
    'Set a cryptographically random value in your .env file.'
  );
}

const {
  invalidCsrfTokenError,
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => csrfSecret,

  getSessionIdentifier: (req) => req.cookies?.admin_token || req.ip || 'anonymous',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    sameSite: 'lax',
    path: '/',
    secure: isProduction,
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'] || req.body?._csrf,
});

/**
 * Middleware to attach CSRF token to response (for GET requests)
 */
const attachCSRFToken = (req, res, next) => {
  res.locals.csrfToken = generateCsrfToken(req, res);
  next();
};

/**
 * Middleware for POST/PUT/DELETE requests to protect against CSRF
 */
const csrfProtection = doubleCsrfProtection;
const protectAgainstCSRF = doubleCsrfProtection;

/**
 * Utility function to check if request should be CSRF protected
 */
const shouldProtectRoute = (req) => {
  const skipPaths = [
    '/mpesa/callback', // M-Pesa uses different security
    '/api/health',     // Health checks
    '/webhook'         // Other webhooks
  ];

  return !skipPaths.some((p) => req.path.startsWith(p));
};

/**
 * Conditional CSRF protection middleware
 */
const conditionalCSRF = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (!shouldProtectRoute(req)) {
    return next();
  }

  csrfProtection(req, res, next);
};

/**
 * Error handler for CSRF token validation failures
 */
const csrfErrorHandler = (err, req, res, next) => {
  if (
    err === invalidCsrfTokenError ||
    err.code === 'EBADCSRFTOKEN' ||
    err.message?.toLowerCase().includes('csrf')
  ) {
    console.error('🔴 CSRF TOKEN ERROR:', err.message || 'Invalid or missing CSRF token');

    return res.status(403).json({
      success: false,
      error: 'CSRF validation failed',
      message: 'Invalid security token. Please try again.'
    });
  }

  next(err);
};

module.exports = {
  csrfProtection,
  attachCSRFToken,
  protectAgainstCSRF,
  conditionalCSRF,
  csrfErrorHandler,
  shouldProtectRoute,
  generateCsrfToken
};
