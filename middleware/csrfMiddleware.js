/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 * 
 * Note: cookie-parser middleware MUST be enabled in main app before using CSRF
 */

const csrf = require('csurf');

/**
 * Create CSRF protection middleware
 * Uses cookie-based CSRF tokens (double-submit cookie pattern)
 */
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict'
  }
});

/**
 * Middleware to attach CSRF token to response (for GET requests)
 * Attach to pages that need to display CSRF token in forms
 */
const attachCSRFToken = (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
};

/**
 * Middleware for POST/PUT/DELETE requests to protect against CSRF
 * Expects token in:
 * - Request body: _csrf parameter
 * - Request headers: X-CSRF-Token header
 * - Request query: _csrf parameter
 */
const protectAgainstCSRF = csrfProtection;

/**
 * Utility function to check if request should be CSRF protected
 * Skip CSRF for certain endpoints (API tokens, webhook callbacks, etc.)
 */
const shouldProtectRoute = (req) => {
  const skipPaths = [
    '/mpesa/callback', // M-Pesa uses different security
    '/api/health', // Health checks
    '/webhook' // Other webhooks
  ];

  return !skipPaths.some(path => req.path.startsWith(path));
};

/**
 * Conditional CSRF protection middleware
 * Applies CSRF protection based on route and method
 */
const conditionalCSRF = (req, res, next) => {
  // Only protect mutating requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip certain paths
  if (!shouldProtectRoute(req)) {
    return next();
  }

  // Apply CSRF protection
  csrfProtection(req, res, next);
};

/**
 * Error handler for CSRF token validation failures
 */
const csrfErrorHandler = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    console.error('🔴 CSRF TOKEN ERROR: Invalid or missing CSRF token');

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
  shouldProtectRoute
};
