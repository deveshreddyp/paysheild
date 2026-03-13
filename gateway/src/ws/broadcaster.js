// gateway/src/ws/broadcaster.js
const { WebSocketServer, WebSocket } = require('ws');

const initBroadcaster = (httpServer, redisSubClient, appEventEmitter) => {
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    wss.on('connection', (ws, req) => {
        console.log(`[WebSocket] Client connected. Total connections: ${wss.clients.size}`);
        ws.isAlive = true;

        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('close', () => {
            console.log(`[WebSocket] Client disconnected. Total connections: ${wss.clients.size}`);
        });

        ws.send(JSON.stringify({
            event: 'connected',
            data: {
                server_time: new Date().toISOString(),
                message: 'PayShield WebSocket connected'
            }
        }));
    });

    // Dedicated subscriber for transactions
    redisSubClient.subscribe('tx:live', (err, count) => {
        if (err) {
            console.error('[WebSocket] Redis subscription error:', err.message);
        } else {
            console.log(`[WebSocket] Subscribed to ${count} channel(s)`);
        }
    });

    redisSubClient.on('message', (channel, message) => {
        if (channel === 'tx:live') {
            broadcast(wss, {
                event: 'transaction',
                data: JSON.parse(message),
                server_timestamp: new Date().toISOString()
            });
        }
    });

    appEventEmitter.on('tamper_detected', (data) => {
        broadcast(wss, {
            event: 'tamper_detected',
            data,
            server_timestamp: new Date().toISOString()
        });
    });

    const heartbeat = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();

            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(heartbeat);
    });
};

const broadcast = (wss, payload) => {
    const data = JSON.stringify(payload);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

module.exports = { initBroadcaster };
