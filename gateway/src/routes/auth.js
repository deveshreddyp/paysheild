const express = require('express');
const jwt = require('jsonwebtoken');
const { getCurrentSecret, getNextExpiry } = require('../services/keyRotation');
const { validateJWT } = require('../middleware/auth');
const redisClient = require('../services/redisClient');

const router = express.Router();

router.post('/token', async (req, res, next) => {
    try {
        const secret = await getCurrentSecret();
        const expiry = await getNextExpiry();
        const now = Math.floor(Date.now() / 1000);
        const ttl = 900; // 15 mins

        const payload = {
            sub: 'payshield_client',
            iat: now,
            exp: now + ttl
        };

        const token = jwt.sign(payload, secret);

        res.json({
            token,
            expires_in: ttl,
            next_rotation: new Date(expiry).toISOString()
        });
    } catch (error) {
        next(error);
    }
});

router.get('/status', validateJWT, async (req, res, next) => {
    try {
        const lastRotation = await redisClient.get('jwt:last_rotation');

        res.json({
            status: 'active',
            last_rotation: lastRotation ? new Date(parseInt(lastRotation, 10)).toISOString() : null,
            rotated_by: 'redis-auto',
            client: req.user.sub
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
