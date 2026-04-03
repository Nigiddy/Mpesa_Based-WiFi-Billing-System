/**
 * Enforce HTTPS in production.
 *
 * Skips the redirect for:
 *  1. Routes that are part of the captive-portal flow (/portal, /hotspot, 
 *     /api/v1/captive-portal) — these are served over HTTP by MikroTik's
 *     redirect before HTTPS is available to the client.
 *  2. The M-Pesa callback (/mpesa/callback) — Safaricom posts to the
 *     public URL which should already be HTTPS, but we rely on the
 *     reverse proxy to enforce this rather than nodding the redirect.
 *
 * The actual TLS termination is done by Caddy or Nginx in front of this
 * Express app (see Caddyfile / nginx/nginx.conf).  This middleware is a
 * belt-and-suspenders guard for any plain-HTTP requests that somehow
 * reach the Node process directly.
 */

// Paths that must remain accessible over plain HTTP (captive portal flow)
const HTTP_ALLOWED_PATHS = [
  '/portal',
  '/hotspot',
  '/api/v1/captive-portal',
];

module.exports = function enforceHTTPS(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();

  // Allow plain HTTP for captive portal paths so MikroTik redirect works
  const isPortalPath = HTTP_ALLOWED_PATHS.some((p) => req.path.startsWith(p));
  if (isPortalPath) return next();

  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, 'https://' + req.headers.host + req.url);
  }

  next();
};
