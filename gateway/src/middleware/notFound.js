// gateway/src/middleware/notFound.js
const notFound = (req, res, next) => {
    res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Endpoint not found',
        available_endpoints: [
            'POST /auth/token',
            'GET /auth/status',
            'POST /api/v1/payment/initiate',
            'POST /api/v1/payment/verify',
            'GET /api/v1/payment/status/:id',
            'GET /health',
            'WS /ws'
        ]
    });
};

module.exports = notFound;
