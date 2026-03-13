const jwt = require('jsonwebtoken');
const { getCurrentSecret } = require('../services/keyRotation');

const validateJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'UNAUTHORIZED',
                message: 'Missing or malformed Authorization header'
            });
        }

        const token = authHeader.split(' ')[1];
        const secret = await getCurrentSecret();

        jwt.verify(token, secret, (err, decoded) => {
            if (err) {
                return res.status(401).json({
                    error: 'UNAUTHORIZED',
                    message: 'Invalid or expired token'
                });
            }
            req.user = decoded;
            next();
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { validateJWT };
