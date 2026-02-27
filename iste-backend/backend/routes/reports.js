
const express = require('express');
const router = express.Router();
const db = require('../config/database');


// GET - Üye artış trendi

router.get('/members-growth', (req, res) => {
    try {
        const { months = 6 } = req.query;

        // Son X ayın verisi
        const donors = db.prepare(`
            SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
            FROM users
            WHERE user_type = 'donor'
            GROUP BY month
            ORDER BY month DESC
            LIMIT ?
        `).all(parseInt(months));

        const students = db.prepare(`
            SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
            FROM users
            WHERE user_type = 'student'
            GROUP BY month
            ORDER BY month DESC
            LIMIT ?
        `).all(parseInt(months));

        res.json({ success: true, donors, students });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Veri yüklenemedi' });
    }
});

// GET- Gelir trendi
router.get('/income-trend', (req, res) => {
    try {
        const { months = 6 } = req.query;

        const income = db.prepare(`
            SELECT 
                strftime('%Y-%m', COALESCE(payment_date, due_date)) as month,
                SUM(CASE WHEN status = 'odendi' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN status IN ('bekliyor', 'gecikmis') THEN amount ELSE 0 END) as pending
            FROM payments
            WHERE month IS NOT NULL
            GROUP BY month
            ORDER BY month DESC
            LIMIT ?
        `).all(parseInt(months));

        res.json({ success: true, income });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Veri yüklenemedi' });
    }
});


// GET  - Ödeme durum dağılımı

router.get('/payment-status', (req, res) => {
    try {
        const stats = db.prepare(`
            SELECT 
                status,
                COUNT(*) as count,
                SUM(amount) as total
            FROM payments
            GROUP BY status
        `).all();

        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Veri yüklenemedi' });
    }
});

// GET - Aktif/pasif üye
router.get('/member-status', (req, res) => {
    try {
        const stats = db.prepare(`
            SELECT 
                status,
                user_type,
                COUNT(*) as count
            FROM users
            WHERE user_type IN ('donor', 'student')
            GROUP BY status, user_type
        `).all();

        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Veri yüklenemedi' });
    }
});

// GET - Etkinlik katılım
router.get('/event-participation', (req, res) => {
    try {
        const events = db.prepare(`
            SELECT 
                title,
                registered_count,
                capacity,
                status
            FROM events
            ORDER BY event_date DESC
            LIMIT 10
        `).all();

        res.json({ success: true, events });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Veri yüklenemedi' });
    }
});

module.exports = router;