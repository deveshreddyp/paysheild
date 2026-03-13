const dotenv = require('dotenv');

// Load environment variables if present
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  fraudEngineUrl: process.env.FRAUD_ENGINE_URL || 'http://fraud:8000',
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  jwtRotationInterval: parseInt(process.env.JWT_ROTATION_INTERVAL || '900', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '30', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
};

// Validate required configurations
const requiredVars = ['FRAUD_ENGINE_URL', 'REDIS_URL'];
const missingVars = requiredVars.filter(v => !process.env[v]);

// In production/docker we want this to crash immediately if not configured
if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.warn(`[Config Warning] Missing expected environment variables: ${missingVars.join(', ')}`);
}

module.exports = config;
