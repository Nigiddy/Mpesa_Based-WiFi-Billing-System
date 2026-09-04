/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks using modern csrf-csrf (Double Submit Cookie Pattern).
 * Replaces deprecated 'csurf' package.
 */

const { doubleCsrf } = require('csrf-csrf');

const isProduction = process.env.NODE_ENV === 'production';

const {
  invalidCsrfTokenError,
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'kibaruani_csrf_secret_fallback_key_min32',
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
