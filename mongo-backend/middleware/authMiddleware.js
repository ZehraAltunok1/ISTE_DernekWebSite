const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "edusupport_2026_super_secret_key_!A92kLmX";

module.exports = function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor!' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            id:    decoded.id,
            email: decoded.email,
            role:  decoded.role  || 'user',
            type:  decoded.type  || 'user'
        };
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Oturum süresi dolmuş, tekrar giriş yapın!' });
    }
};
