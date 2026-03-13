const { v4: uuidv4 } = require('uuid');

// Add request ID to every incoming request
const addRequestId = (req, res, next) => {
    const requestId = uuidv4();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
};

// Check for Requestly rule intervention
const tamperDetection = (appEventEmitter) => (req, res, next) => {
    const isModified = req.header('X-Requestly-Modified') === 'true';

    if (isModified) {
        req.tampered = true;
        appEventEmitter.emit('tamper_detected', {
            timestamp: new Date().toISOString(),
            request_id: req.requestId || 'unknown',
            ip: req.ip || req.connection.remoteAddress
        });
    }
    next();
};

// Configure morgan tokens to strip authorization
const setupLogScrubbing = (morgan) => {
    morgan.token('scrubbed-headers', (req) => {
        const headers = { ...req.headers };
        if (headers.authorization) {
            headers.authorization = 'Bearer ***';
        }
        return JSON.stringify(headers);
    });
};

module.exports = {
    addRequestId,
    tamperDetection,
    setupLogScrubbing
};
