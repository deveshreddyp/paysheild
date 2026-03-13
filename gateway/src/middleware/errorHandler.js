// gateway/src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    const timestamp = new Date().toISOString();

    // Format log context stripping sensitive attributes
    const logContext = {
        timestamp,
        message: err.message,
        stack: err.stack,
        request_id: req.requestId || 'unknown',
        method: req.method,
        path: req.path,
        user: req.user ? req.user.sub : 'unauthenticated',
        ip: req.ip || req.connection.remoteAddress
    };

    console.error('[Error]', JSON.stringify(logContext));

    // Default to 500 server error
    let statusCode = 500;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';

    // Map known errors
    if (err.name === 'UnauthorizedError' || err.message.includes('jwt')) {
        statusCode = 401;
        code = 'UNAUTHORIZED';
        message = 'Invalid or expired authentication token';
    } else if (err.status === 400 || err.name === 'ValidationError') {
        statusCode = 400;
        code = 'BAD_REQUEST';
        message = err.message;
    } else if (err.status === 429) {
        statusCode = 429;
        code = 'RATE_LIMITED';
        message = 'Too many requests, please try again later';
    }

    // Never leak stack trace to client
    res.status(statusCode).json({
        error: code,
        message,
        request_id: req.requestId || 'unknown',
        timestamp
    });
};

module.exports = errorHandler;
