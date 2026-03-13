const axios = require('axios');
const fs = require('fs');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const NUM_TXNS = 25;

const delay = ms => new Promise(res => setTimeout(res, ms));

async function getToken() {
    const res = await axios.post(`${GATEWAY_URL}/auth/token`);
    return res.data.token;
}

// Bins mapping to general countries and risks, same logic tested in backend 
const BINS = [
    '411111', '411110', '555555', '400000', '400010',
    '424242', '456789', '512345', '522222', '601100'
];

const DEVICES = ['dev123', 'dev456', 'dev789', 'dev000', 'devAAB', 'devXYX'];
const MERCHANTS = ['merch_A', 'merch_B', 'merch_C', 'merch_D', 'merch_E'];

const COUNTRIES = ['US', 'IN', 'GB', 'SG', 'AU'];

async function runSeed() {
    console.log(`[SeedScript] Starting PayShield Initial Data Seed. (${NUM_TXNS} txns)`);

    let token;
    try {
        token = await getToken();
    } catch (err) {
        console.error('[SeedScript] Failed to grab Auth Token', err.message);
        process.exit(1);
    }

    const client = axios.create({
        baseURL: GATEWAY_URL,
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const generateTx = () => {
        // Basic randomization logic for somewhat realistic variations
        const isFraud = Math.random() < 0.2; // 20% intentional bad data attempts

        // Default safe profile
        let amount = Math.floor(Math.random() * 50000) + 1000;
        let card_bin = BINS[Math.floor(Math.random() * 5)]; // Pick safe bins
        let device_fingerprint = DEVICES[Math.floor(Math.random() * DEVICES.length)];
        let merchant_id = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
        let country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];

        if (isFraud) {
            amount = Math.floor(Math.random() * 500000) + 150000; // Large amounts
            card_bin = BINS[Math.floor(Math.random() * BINS.length)]; // Any bin
            device_fingerprint = `bot_${Math.floor(Math.random() * 1000)}`; // Unseen device
            country = 'US'; // Example hardcoded country forcing geo-mismatch for IN/GB cards
        } else if (Math.random() < 0.1) {
            // Intentionally trigger validation error
            amount = -500;
        }

        return {
            amount,
            currency: "INR",
            card_bin,
            device_fingerprint,
            merchant_id,
            geo: {
                country,
                ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.1.1`
            }
        };
    };

    for (let i = 0; i < NUM_TXNS; i++) {
        const tx = generateTx();
        
        // Force the 10th transaction to be a Requestly Tamper Match
        const isTampered = (i === 10);
        const reqHeaders = { 'X-Idempotency-Key': `test-seed-${Date.now()}-${i}` };
        
        let payload = tx;
        
        if (isTampered) {
            payload = {
                amount: 1500000,
                currency: "INR",
                card_bin: "400010",
                device_fingerprint: "dev_seed_sim",
                merchant_id: "merch_demo",
                geo: { country: "IN", ip: "1.1.1.1" }
            };
            reqHeaders['X-Requestly-Modified'] = 'true';
            console.log(`[SeedScript] 🚨 Injecting Tampered Transaction at index ${i}...`);
        } else if (Math.random() < 0.15 && i > 0) {
            // Small 15% chance to duplicate an idempotency key to test cache
            reqHeaders['X-Idempotency-Key'] = `test-seed-${Date.now()}-${i - 1}`;
        }

        try {
            const res = await client.post('/api/v1/payment/initiate', payload, {
                headers: reqHeaders,
                validateStatus: () => true
            });

            const isReplay = res.headers && res.headers['x-idempotency-replay'] ? ' [CACHE HIT]' : '';
            const isTamperDetected = res.data.tampered ? ' 🚨 [TAMPER BLOCKED]' : '';
            const statusStr = res.data.status || res.data.error || 'UNKNOWN';
            const scoreStr = res.data.fraud_score !== undefined ? res.data.fraud_score : 'N/A';
            
            console.log(`[${i + 1}/${NUM_TXNS}] Sent: ${statusStr} | Score: ${scoreStr}${isReplay}${isTamperDetected}`);
        } catch (err) {
            console.error(`[SeedScript] Request Failed:`, err.message);
        }

        // Consistent delay to avoid hitting rate limits during seeding
        await delay(200);
    }

    console.log('[SeedScript] Seed finished successfully.');
}

runSeed();
