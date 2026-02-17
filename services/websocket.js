const WebSocket = require('ws');
const url = require('url');

let wss;

/**
 * Initialize WebSocket Server
 * @param {Object} server - HTTP Server instance
 */
const initWebSocket = (server) => {
    wss = new WebSocket.Server({ noServer: true, path: '/ws' });

    server.on('upgrade', (request, socket, head) => {
        const pathname = url.parse(request.url).pathname;

        if (pathname === '/ws') {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    });

    wss.on('connection', (ws) => {
        console.log('🔌 New WebSocket client connected');

        ws.on('message', (message) => {
            console.log('📩 Received:', message);
        });

        ws.on('close', () => {
            console.log('🔌 WebSocket client disconnected');
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
