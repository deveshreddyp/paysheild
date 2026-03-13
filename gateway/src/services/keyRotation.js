const crypto = require('crypto');
const redisClient = require('./redisClient'); // We'll create this next
const config = require('../config');

let inMemorySecret = crypto.randomBytes(32).toString('hex');
let lastRotationTime = Date.now();

const generateSecret = () => crypto.randomBytes(32).toString('hex');

const initKeyRotation = async () => {
    try {
        const currentSecret = await redisClient.get('jwt:current_secret');
        if (!currentSecret) {
            const newSecret = generateSecret();
            await redisClient.set('jwt:current_secret', newSecret);
            await redisClient.set('jwt:last_rotation', Date.now().toString());
            console.log('[KeyRotation] Initialized new JWT secret in Redis');
        }

        // Start rotation interval
        setInterval(rotateKey, config.jwtRotationInterval * 1000);
    } catch (error) {
        console.warn('[KeyRotation] Redis unavailable, falling back to in-memory secret', error.message);
    }
};

const rotateKey = async () => {
    try {
        const nextSecret = generateSecret();
        await redisClient.set('jwt:next_secret', nextSecret);
        console.log('[KeyRotation] Generated next_secret. Waiting 30s grace period...');

        // 30 second grace period for in-flight tokens
        setTimeout(async () => {
            try {
                await redisClient.rename('jwt:next_secret', 'jwt:current_secret');
                await redisClient.set('jwt:last_rotation', Date.now().toString());
                console.log('[KeyRotation] Promoted next_secret to current_secret');
            } catch (err) {
                console.error('[KeyRotation] Failed to promote secret', err);
            }
        }, 30000);
    } catch (error) {
        console.error('[KeyRotation] Failed to start key rotation process', error);
    }
};

const getCurrentSecret = async () => {
    try {
        const secret = await redisClient.get('jwt:current_secret');
        return secret || inMemorySecret;
    } catch (error) {
        return inMemorySecret; // fallback
    }
};

const getNextExpiry = async () => {
    try {
        const lastRotation = await redisClient.get('jwt:last_rotation');
        if (!lastRotation) return Date.now() + (config.jwtRotationInterval * 1000);
        return parseInt(lastRotation, 10) + (config.jwtRotationInterval * 1000);
    } catch (error) {
        return Date.now() + (config.jwtRotationInterval * 1000);
    }
};

module.exports = {
    initKeyRotation,
    getCurrentSecret,
    getNextExpiry
};
