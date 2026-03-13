const Redis = require('ioredis');
const config = require('../config');

// Using ioredis for robust connection handling
const redisClient = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

redisClient.on('error', (err) => {
    console.error('[Redis Error]', err.message);
});

redisClient.on('connect', () => {
    console.log('[Redis] Connected to ' + config.redisUrl);
});

module.exports = redisClient;
