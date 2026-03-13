// gateway/src/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const redisClient = require('../services/redisClient');
const config = require('../config');

const { v4: uuidv4 } = require('uuid');

const rateLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers

    // Use Redis store
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),

    keyGenerator: (req) => {
        // Rely on ip or X-Forwarded-For if behind proxy
        return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    },

    handler: (req, res, next, options) => {
        const windowSeconds = Math.round(options.windowMs / 1000);

        // Broadcast rejection to WebSocket clients
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';
        const geoInfo = req.body && req.body.geo ? req.body.geo : { country: 'Unknown', ip };
        const rejectionEvent = {
            transaction_id: `rej-${Date.now()}-${uuidv4().slice(0, 6)}`,
            status: 'RATE_LIMITED',
            http_code: 429,
            fraud_score: 1.0,
            fraud_label: 'CRITICAL',
            triggered_rules: ['RATE_LIMIT_EXCEEDED'],
            latency_ms: 1,
            amount: req.body && req.body.amount ? req.body.amount : 0,
            currency: 'INR',
            merchant_id: req.body && req.body.merchant_id ? req.body.merchant_id : 'Unknown',
            timestamp: new Date().toISOString(),
            geo: geoInfo,
            card_bin: req.body && req.body.card_bin ? req.body.card_bin : '000000',
            tampered: false
        };
        redisClient.publish('tx:live', JSON.stringify(rejectionEvent));

        res.status(429).json({
            error: 'RATE_LIMITED',
            message: 'Too many requests',
            retry_after_seconds: windowSeconds,
            limit: options.max,
            window_seconds: windowSeconds
        });
    }
});

module.exports = rateLimiter;
