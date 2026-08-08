const WebSocket = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken');
require('dotenv').config();

let wss;

/**
 * Parse a cookie header string into a key→value object.
 * @param {string} cookieHeader - The raw Cookie header value.
 * @returns {Record<string, string>}
 */
function parseCookies(cookieHeader) {
    if (!cookieHeader) return {};
    return Object.fromEntries(
        cookieHeader.split(';').map(pair => {
            const idx = pair.indexOf('=');
            return [
                pair.slice(0, idx).trim(),
                decodeURIComponent(pair.slice(idx + 1).trim())
            ];
        })
    );
}

/**
 * Initialize WebSocket Server
 * @param {Object} server - HTTP Server instance
 */
const initWebSocket = (server) => {
    wss = new WebSocket.Server({ noServer: true, path: '/ws' });

    server.on('upgrade', (request, socket, head) => {
        const pathname = url.parse(request.url).pathname;

        if (pathname !== '/ws') {
            socket.destroy();
            return;
        }

        // ── Authenticate the WebSocket upgrade ──────────────────────────────
        // The browser automatically sends all cookies (including admin_token)
        // on the HTTP Upgrade request. We verify the JWT here, before the WS
        // handshake is completed, so unauthenticated clients never get a socket.
        const cookies = parseCookies(request.headers['cookie']);
        const token = cookies['admin_token'];

        if (!token) {
            socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
            socket.destroy();
            return;
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.role !== 'admin') {
                throw new Error('Insufficient role');
            }
            // Attach the verified admin payload to the request so the connection
            // handler can use it for logging or targeted messaging.
            request.admin = decoded;
        } catch (err) {
            socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
            socket.destroy();
            return;
        }
        // ────────────────────────────────────────────────────────────────────

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });

    wss.on('connection', (ws, request) => {
        const adminEmail = request.admin?.email ?? 'unknown';
        console.log(`🔌 New WebSocket client connected (admin: ${adminEmail})`);

        ws.on('message', (message) => {
            console.log('📩 Received:', message);
        });

        ws.on('close', () => {
            console.log(`🔌 WebSocket client disconnected (admin: ${adminEmail})`);
        });

        // Send initial ping to keep connection alive
        ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket Connected' }));
    });

    console.log('✅ WebSocket Server Initialized');
};

/**
 * Broadcast message to all connected clients
 * @param {Object} data - Message payload
 */
const broadcast = (data) => {
    if (!wss) return;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

module.exports = { initWebSocket, broadcast };
