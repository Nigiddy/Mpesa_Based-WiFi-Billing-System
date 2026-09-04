const WebSocket = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken');
require('dotenv').config();

let wssAdmin;
let wssPayment;

// Map of transactionId -> Set<WebSocket>
const paymentSubscribers = new Map();

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
 * Initialize WebSocket Server supporting:
 * 1. /ws: Admin dashboard (authenticated with admin_token cookie)
 * 2. /ws/payments/:transactionId: Guest user tracking payment status
 * @param {Object} server - HTTP Server instance
 */
const initWebSocket = (server) => {
    wssAdmin = new WebSocket.Server({ noServer: true });
    wssPayment = new WebSocket.Server({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
        const parsedUrl = url.parse(request.url);
        const pathname = parsedUrl.pathname || '';

        // ── Case 1: Admin WebSocket (/ws) ──────────────────────────────────
        if (pathname === '/ws') {
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
                request.admin = decoded;
            } catch {
                socket.write('HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
                socket.destroy();
                return;
            }

            wssAdmin.handleUpgrade(request, socket, head, (ws) => {
                wssAdmin.emit('connection', ws, request);
            });
            return;
        }

        // ── Case 2: Payment Status WebSocket (/ws/payments/:transactionId) ─
        const paymentMatch = pathname.match(/^\/ws\/payments\/([^/]+)$/);
        if (paymentMatch) {
            const transactionId = decodeURIComponent(paymentMatch[1]);
            if (!transactionId || transactionId.trim().length === 0) {
                socket.write('HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
                socket.destroy();
                return;
            }

            request.transactionId = transactionId.trim();
            wssPayment.handleUpgrade(request, socket, head, (ws) => {
                wssPayment.emit('connection', ws, request);
            });
            return;
        }

        // ── Unrecognized path ──────────────────────────────────────────────
        socket.write('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
        socket.destroy();
    });

    // ── Admin Connections Handler ──────────────────────────────────────────
    wssAdmin.on('connection', (ws, request) => {
        const adminEmail = request.admin?.email ?? 'unknown';
        console.log(`🔌 New WebSocket admin connected: ${adminEmail}`);

        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        ws.on('message', (message) => {
            console.log('📩 Admin WS Received:', message.toString().slice(0, 200));
        });

        ws.on('close', () => {
            console.log(`🔌 Admin WS disconnected: ${adminEmail}`);
        });

        // Initial connection message
        ws.send(JSON.stringify({ type: 'connected', message: 'Admin WebSocket Connected' }));
    });

    // ── Payment Status Connections Handler ─────────────────────────────────
    wssPayment.on('connection', (ws, request) => {
        const transactionId = request.transactionId;
        console.log(`🔌 New Payment WS client connected for transaction: ${transactionId}`);

        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        if (!paymentSubscribers.has(transactionId)) {
            paymentSubscribers.set(transactionId, new Set());
        }
        paymentSubscribers.get(transactionId).add(ws);

        ws.on('close', () => {
            const subs = paymentSubscribers.get(transactionId);
            if (subs) {
                subs.delete(ws);
                if (subs.size === 0) {
                    paymentSubscribers.delete(transactionId);
                }
            }
            console.log(`🔌 Payment WS client disconnected for transaction: ${transactionId}`);
        });

        ws.send(JSON.stringify({
            type: 'payment_status',
            payload: { transactionId, status: 'subscribed', message: 'Tracking payment status' }
        }));
    });

    // ── Heartbeat Interval ─────────────────────────────────────────────────
    const heartbeatInterval = setInterval(() => {
        if (wssAdmin) {
            wssAdmin.clients.forEach((ws) => {
                if (ws.isAlive === false) return ws.terminate();
                ws.isAlive = false;
                ws.ping();
            });
        }
        if (wssPayment) {
            wssPayment.clients.forEach((ws) => {
                if (ws.isAlive === false) return ws.terminate();
                ws.isAlive = false;
                ws.ping();
            });
        }
    }, 30000);

    server.on('close', () => clearInterval(heartbeatInterval));

    console.log('✅ WebSocket Server Initialized (Admin + Payment Status)');
};

/**
 * Broadcast message to all connected admin clients
 * @param {Object} data - Message payload
 */
const broadcast = (data) => {
    if (!wssAdmin) return;
    const msg = JSON.stringify(data);
    wssAdmin.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
};

/**
 * Send payment status update to clients subscribed to a specific transaction,
 * and also notify connected admin clients.
 * @param {string} transactionId - Transaction identifier
 * @param {Object} payload - Payment status payload
 */
const sendPaymentStatus = (transactionId, payload) => {
    const message = JSON.stringify({
        type: 'payment_status',
        payload: { transactionId, ...payload }
    });

    // Notify guest subscribers for this transaction
    const subs = paymentSubscribers.get(transactionId);
    if (subs && subs.size > 0) {
        subs.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    // Also broadcast to admin clients
    broadcast({
        type: 'payment_status',
        payload: { transactionId, ...payload }
    });
};

module.exports = {
    initWebSocket,
    broadcast,
    sendPaymentStatus
};
