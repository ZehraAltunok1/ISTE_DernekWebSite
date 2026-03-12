// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'edusupport-secret-key-2026';

module.exports = function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor!' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // req.user'a hem admin hem user için ortak alanları set et
        req.user = {
            id:       decoded.id,
            email:    decoded.email,
            name:     decoded.full_name || decoded.username || decoded.email,
            role:     decoded.role  || 'user',
            type:     decoded.type  || 'user'   // 'admin' | 'user' | 'donor' | 'student'
        };
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Oturum süresi dolmuş, tekrar giriş yapın!' });
    }
};