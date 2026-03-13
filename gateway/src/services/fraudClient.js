const axios = require('axios');
const config = require('../config');

// Creates an isolated configured instance to communicate with Fraud Engine
const fraudClient = axios.create({
    baseURL: config.fraudEngineUrl,
    timeout: 3000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Helper for HTTP requests with 1 retry on connection error
const evaluateFraud = async (transaction) => {
    let attempts = 0;
    const maxAttempts = 2; // 1 initial + 1 retry

    while (attempts < maxAttempts) {
        try {
            attempts++;
            const response = await fraudClient.post('/fraud/score', transaction);
            return response.data;
        } catch (error) {
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                if (attempts >= maxAttempts) {
                    console.warn('[FraudClient] Engine unreachable or timeout. Using fallback score.');
                    return getFallbackScore(transaction.transaction_id);
                }
                console.log(`[FraudClient] Retry attempt ${attempts} to reach Fraud Engine...`);
            } else {
                console.error('[FraudClient] Engine responded with error:', error.response?.data || error.message);
                return getFallbackScore(transaction.transaction_id);
            }
        }
    }
};

const getFallbackScore = (txId) => {
    return {
        transaction_id: txId,
        risk_score: 0.5,
        risk_label: 'MEDIUM',
        triggered_rules: ['FALLBACK_SCORE_ENGINE_DOWN'],
        latency_ms: 0,
        model_version: 'fallback'
    };
};

module.exports = { evaluateFraud };
