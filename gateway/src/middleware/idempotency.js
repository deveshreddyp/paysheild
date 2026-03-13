// gateway/src/middleware/idempotency.js
const redisClient = require('../services/redisClient');
const crypto = require('crypto');

const idempotency = async (req, res, next) => {
    if (req.method !== 'POST') {
        return next();
    }

    const idempotencyKey = req.headers['x-idempotency-key'];

    if (!idempotencyKey) {
        return res.status(400).json({
            error: 'MISSING_IDEMPOTENCY_KEY',
            message: 'X-Idempotency-Key header required for all POST requests'
        });
    }

    try {
        const cacheKey = `idempotency:${idempotencyKey}`;
        const cachedResponse = await redisClient.get(cacheKey);

        if (cachedResponse) {
            // 200 Cached HIT
            const parsedBody = JSON.parse(cachedResponse);

            // We set the idempotency replay header true explicitly to mark the request as replayed
            res.setHeader('X-Idempotency-Replay', 'true');
            return res.status(200).json(parsedBody);
        }
    } catch (error) {
        console.warn('[Idempotency] Redis error during key check, bypass cache', error.message);
    }

    // Idempotency Store Helper function
    req.storeIdempotencyResponse = async (responseBody) => {
        try {
            const cacheKey = `idempotency:${idempotencyKey}`;
            // Set TTL 86400 (24h)
            await redisClient.set(cacheKey, JSON.stringify(responseBody), 'EX', 86400);
            console.log(`[Idempotency] Cached response payload for ${idempotencyKey}`);
        } catch (error) {
            console.warn(`[Idempotency] Failed to store payload for ${idempotencyKey}`, error.message);
        }
    };

    // Ensure we intercept the response before we send the response back
    const originalJson = res.json;

    res.json = function (body) {
        // Attempt caching body before JSON triggers to emit to stream
        req.storeIdempotencyResponse(body).catch((err) => {
            console.warn('[Idempotency] Cache response skipped due to store error', err.message);
        });

        return originalJson.call(this, body);
    };

    next();
};

module.exports = idempotency;
