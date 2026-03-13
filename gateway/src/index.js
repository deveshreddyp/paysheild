const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const EventEmitter = require('events');
const http = require('http');

const config = require('./config');
const redisClient = require('./services/redisClient');
const { initKeyRotation } = require('./services/keyRotation');
const { initBroadcaster } = require('./ws/broadcaster');
const { addRequestId, tamperDetection, setupLogScrubbing } = require('./middleware/security');
const { validateJWT } = require('./middleware/auth');
const rateLimiter = require('./middleware/rateLimit');
const idempotency = require('./middleware/idempotency');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const authRouter = require('./routes/auth');
const paymentRouter = require('./routes/payment');
const { setupSwagger } = require('./swagger');

const app = express();
const server = http.createServer(app);
const appEventEmitter = new EventEmitter();

// Initialize Key Rotation early
initKeyRotation();

// Setup Morgan to strip Authorization headers
setupLogScrubbing(morgan);

// 1. Security & Core Middleware
app.use(helmet());
app.use(cors());
app.use(addRequestId);
app.use(morgan(':method :url :status :res[content-length] - :response-time ms - reqId: :req[X-Request-ID] headers: :scrubbed-headers'));
app.use(express.json());

// 2. Health Endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'gateway',
        timestamp: new Date().toISOString(),
        redis: redisClient.status === 'ready' ? 'connected' : 'disconnected'
    });
});

// 3. Swagger API Docs
setupSwagger(app);

// 4. Mount Routes
app.use('/auth', authRouter);

// Payment routes stack
app.use('/api/v1/payment',
    validateJWT,
    rateLimiter,
    idempotency,
    tamperDetection(appEventEmitter),
    paymentRouter
);

// 4. Fallbacks & Handlers
app.use(notFound);
app.use(errorHandler);

// 5. Initialize WebSocket server sharing the same underlying port
// Create a separate Redis connection strictly for Pub/Sub
const redisSubClient = redisClient.duplicate();
initBroadcaster(server, redisSubClient, appEventEmitter);

// 6. Start Server
server.listen(config.port, () => {
    console.log(`[Gateway] API started on port ${config.port}`);
    console.log(`[Gateway] Fraud Engine target: ${config.fraudEngineUrl}`);
    console.log(`[Gateway] Redis connected at: ${config.redisUrl}`);
});

// Graceful Shutdown on termination
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        redisClient.quit();
        redisSubClient.quit();
        process.exit(0);
    });
});
