/**
 * Custom Next.js dev server with WebSocket proxy support.
 *
 * Problem: Next.js `rewrites()` only handles HTTP requests — it does NOT proxy
 * WebSocket `Upgrade` requests. The admin dashboard and payment status pages
 * connect via `ws://localhost:3000/ws` and expect the dev server to forward
 * the upgrade to the Express backend on port 5000.
 *
 * Solution: This custom server intercepts HTTP `upgrade` events for paths
 * starting with /ws and proxies them to the backend using http-proxy-middleware.
 * All other traffic (including the /api/* HTTP rewrites) is still handled by
 * Next.js as before.
 *
 * Usage:
 *   node server.js          (replaces `next dev`)
 *
 * In production this file is NOT used — Caddy handles WS proxying at the edge.
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { createProxyMiddleware } = require('http-proxy-middleware');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// WebSocket proxy — only used for upgrade events (ws:// connections).
// The `ws: true` flag tells http-proxy-middleware to handle WebSocket upgrades.
const wsProxy = createProxyMiddleware({
  target: BACKEND_URL,
  ws: true,
  changeOrigin: true,
  // Don't log every proxied frame
  logLevel: 'warn',
});

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);

    // Let Next.js handle everything (including /api/* HTTP rewrites defined
    // in next.config.mjs). We only need the custom server for WS upgrades.
    handle(req, res, parsedUrl);
  });

  // Intercept WebSocket upgrade requests for /ws and /ws/*
  // and proxy them to the Express backend.
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url, true);

    if (pathname === '/ws' || pathname.startsWith('/ws/')) {
      // Forward the upgrade to the backend
      wsProxy.upgrade(req, socket, head);
    }
    // Other upgrade requests (e.g. Next.js HMR) are handled by Next.js
    // automatically — we don't need to do anything for them.
  });

  server.listen(port, hostname, () => {
    console.log(`✅ Custom dev server ready on http://${hostname}:${port}`);
    console.log(`   WebSocket proxy: ws://${hostname}:${port}/ws → ${BACKEND_URL}/ws`);
  });
});
