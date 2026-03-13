const express = require('express');
const { v4: uuidv4 } = require('uuid');
const redisClient = require('../services/redisClient');
const { evaluateFraud } = require('../services/fraudClient');

const router = express.Router();

router.post('/initiate', async (req, res, next) => {
    try {
        const { amount, currency, card_bin, device_fingerprint, merchant_id, geo } = req.body;

        // 1. Basic Validation
        const errors = [];
        if (!amount || typeof amount !== 'number' || amount <= 0) errors.push('amount must be a positive integer (paise)');
        if (currency !== 'INR') errors.push('currency must be INR');
        if (!card_bin || typeof card_bin !== 'string' || !/^\d{6}$/.test(card_bin)) errors.push('card_bin must be exactly 6 digits');
        if (!device_fingerprint || typeof device_fingerprint !== 'string') errors.push('device_fingerprint is required');
        if (!merchant_id || typeof merchant_id !== 'string') errors.push('merchant_id is required');
        if (!geo || !geo.country || !geo.ip || geo.country.length !== 2) errors.push('geo object with 2-char country code and ip is required');

        if (errors.length > 0) {
            // Broadcast validation rejection to WebSocket clients
            const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';
            const geoInfo = geo ? geo : { country: 'Unknown', ip };
            const rejectionEvent = {
                transaction_id: `val-${Date.now()}-${uuidv4().slice(0, 6)}`,
                status: 'VALIDATION_FAILED',
                http_code: 400,
                fraud_score: 1.0,
                fraud_label: 'CRITICAL',
                triggered_rules: ['INVALID_PAYLOAD'],
                latency_ms: 1,
                amount: amount || 0,
                currency: currency || 'INR',
                merchant_id: merchant_id || 'Unknown',
                timestamp: new Date().toISOString(),
                geo: geoInfo,
                card_bin: card_bin || '000000',
                tampered: req.tampered || false
            };
            redisClient.publish('tx:live', JSON.stringify(rejectionEvent));

            return res.status(400).json({ error: 'VALIDATION_ERROR', message: errors.join(', ') });
        }

        // 2. Build Transaction Object
        const transactionId = uuidv4();
        const transaction = {
            transaction_id: transactionId,
            amount,
            currency,
            card_bin,
            device_fingerprint,
            merchant_id,
            geo,
            timestamp: new Date().toISOString(),
            request_id: req.requestId
        };

        // 3. Score against Fraud Engine
        const fraudResult = await evaluateFraud(transaction);

        // 4. Gateway Decision logic
        const score = fraudResult.risk_score;
        let status = 'SUCCESS';
        let httpCode = 200;

        if (score >= 0.8 || req.tampered) {
            status = 'FRAUD_FLAGGED';
            httpCode = 402; // Payment Required
        } else if (score >= 0.6) {
            // 30% chance timeout mock
            if (Math.random() < 0.3) {
                status = 'TIMEOUT';
                httpCode = 408;
            }
        }

        // 5. Build Complete Response
        const responsePayload = {
            transaction_id: transactionId,
            status,
            http_code: httpCode,
            fraud_score: score,
            fraud_label: fraudResult.risk_label,
            triggered_rules: fraudResult.triggered_rules,
            latency_ms: fraudResult.latency_ms,
            amount,
            currency,
            merchant_id,
            timestamp: transaction.timestamp,
            geo: transaction.geo,
            card_bin: transaction.card_bin,
            tampered: req.tampered || false
        };

        // 6. Cache Transaction details
        await redisClient.set(`tx:${transactionId}`, JSON.stringify(responsePayload), 'EX', 3600);

        // 7. Publish Event to WebSocket Broadcaster
        await redisClient.publish('tx:live', JSON.stringify(responsePayload));

        // 8. Return to Client Handled automatically by Idempotency wrapping logic
        res.status(httpCode).json(responsePayload);

    } catch (err) {
        next(err);
    }
});

router.post('/verify', async (req, res, next) => {
    // If the request makes it here, idempotency cache MISS occurred
    res.status(404).json({ error: 'TRANSACTION_NOT_FOUND', message: 'No cached response found for the provided Idempotency Key' });
});

router.get('/status/:id', async (req, res, next) => {
    try {
        const txId = req.params.id;
        const cache = await redisClient.get(`tx:${txId}`);

        if (cache) {
            return res.json(JSON.parse(cache));
        } else {
            return res.status(404).json({ error: 'TRANSACTION_NOT_FOUND', message: `Transaction ${txId} not found` });
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;
