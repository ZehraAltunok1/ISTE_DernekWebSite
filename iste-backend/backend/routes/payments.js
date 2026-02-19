// ==========================================
// routes/payments.js - Aidat ve Bağış Yönetimi
// ==========================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==========================================
// TABLO OLUŞTURMA
// ==========================================
db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        payment_type TEXT CHECK(payment_type IN ('aidat', 'bagis')) NOT NULL,
        amount REAL NOT NULL,
        payment_date TEXT,
        due_date TEXT,
        status TEXT CHECK(status IN ('odendi', 'bekliyor', 'gecikmis')) DEFAULT 'bekliyor',
        payment_method TEXT,
        notes TEXT,
        created_by TEXT DEFAULT 'Admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

// Seed data
const checkPayments = db.prepare('SELECT COUNT(*) as count FROM payments').get();
if (checkPayments.count === 0) {
    const seedPayments = [
        { user_id: 1, payment_type: 'aidat', amount: 500, payment_date: '2026-01-15', status: 'odendi',   payment_method: 'banka' },
        { user_id: 2, payment_type: 'aidat', amount: 500, payment_date: '2026-01-20', status: 'odendi',   payment_method: 'nakit' },
        { user_id: 3, payment_type: 'bagis', amount: 2000, payment_date: '2026-02-05', status: 'odendi',  payment_method: 'kredi_karti' },
        { user_id: 1, payment_type: 'aidat', amount: 500, due_date: '2026-02-28',     status: 'bekliyor', payment_method: null },
        { user_id: 4, payment_type: 'aidat', amount: 500, due_date: '2026-01-31',     status: 'gecikmis', payment_method: null },
        { user_id: 5, payment_type: 'bagis', amount: 1500, payment_date: '2026-02-12', status: 'odendi', payment_method: 'banka' }
    ];

    const insert = db.prepare(`
        INSERT INTO payments (user_id, payment_type, amount, payment_date, due_date, status, payment_method)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of seedPayments) {
        insert.run(p.user_id, p.payment_type, p.amount, p.payment_date || null, p.due_date || null, p.status, p.payment_method || null);
    }
    console.log('✅ Ödeme seed data hazır (6 kayıt)');
}

// ==========================================
// GET /api/payments - Tüm ödemeleri getir
// ==========================================
router.get('/', (req, res) => {
    try {
        const { status, payment_type, user_id } = req.query;

        let query = `
            SELECT 
                p.*,
                u.first_name,
                u.last_name,
                u.email,
                u.user_type
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (status)       { query += ' AND p.status = ?';       params.push(status); }
        if (payment_type) { query += ' AND p.payment_type = ?'; params.push(payment_type); }
        if (user_id)      { query += ' AND p.user_id = ?';      params.push(user_id); }

        query += ' ORDER BY p.created_at DESC';

        const payments = db.prepare(query).all(...params);
        res.json({ success: true, payments: payments || [] });
    } catch (error) {
        console.error('❌ Payments fetch error:', error);
        res.status(500).json({ success: false, message: 'Ödemeler yüklenemedi', error: error.message });
    }
});

// ==========================================
// GET /api/payments/stats - Özet istatistikler
// ==========================================
router.get('/stats', (req, res) => {
    try {
        const totalIncome = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'odendi'
        `).get().total;

        const currentMonth = new Date().getMonth() + 1;
        const currentYear  = new Date().getFullYear();

        const monthlyIncome = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total FROM payments
            WHERE status = 'odendi'
            AND strftime('%m', payment_date) = ?
            AND strftime('%Y', payment_date) = ?
        `).get(String(currentMonth).padStart(2, '0'), String(currentYear)).total;

        const pendingAmount = db.prepare(`
            SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status IN ('bekliyor', 'gecikmis')
        `).get().total;

        const totalPayments = db.prepare(`SELECT COUNT(*) as count FROM payments WHERE status = 'odendi'`).get().count;
        const totalDue      = db.prepare(`SELECT COUNT(*) as count FROM payments WHERE payment_type = 'aidat'`).get().count;

        const collectionRate = totalDue > 0 ? Math.round((totalPayments / totalDue) * 100) : 0;

        res.json({
            success: true,
            stats: {
                totalIncome,
                monthlyIncome,
                pendingAmount,
                collectionRate
            }
        });
    } catch (error) {
        console.error('❌ Payment stats error:', error);
        res.status(500).json({ success: false, message: 'İstatistikler yüklenemedi' });
    }
});

// ==========================================
// POST /api/payments - Yeni ödeme ekle
// ==========================================
router.post('/', (req, res) => {
    try {
        const { user_id, payment_type, amount, payment_date, due_date, status, payment_method, notes } = req.body;

        if (!user_id || !payment_type || !amount) {
            return res.status(400).json({ success: false, message: 'Üye, ödeme tipi ve tutar zorunludur' });
        }

        const result = db.prepare(`
            INSERT INTO payments (user_id, payment_type, amount, payment_date, due_date, status, payment_method, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(user_id, payment_type, amount, payment_date || null, due_date || null, status || 'bekliyor', payment_method || null, notes || null);

        // Aktivite kaydı
        const user = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get(user_id);
        if (user) {
            db.prepare(`
                INSERT INTO activities (admin_name, action_type, action_description)
                VALUES ('Admin', 'create_payment', ?)
            `).run(`${user.first_name} ${user.last_name} - ${amount}₺ ${payment_type} kaydedildi`);
        }

        const newPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
        res.json({ success: true, message: 'Ödeme kaydedildi', payment: newPayment });
    } catch (error) {
        console.error('❌ Payment insert error:', error);
        res.status(500).json({ success: false, message: 'Ödeme eklenemedi', error: error.message });
    }
});

// ==========================================
// PUT /api/payments/:id - Ödeme güncelle
// ==========================================
router.put('/:id', (req, res) => {
    try {
        const { payment_date, status, payment_method, notes } = req.body;

        db.prepare(`
            UPDATE payments SET
                payment_date = ?, status = ?, payment_method = ?, notes = ?
            WHERE id = ?
        `).run(payment_date || null, status, payment_method || null, notes || null, req.params.id);

        res.json({ success: true, message: 'Ödeme güncellendi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Güncellenemedi', error: error.message });
    }
});

// ==========================================
// DELETE /api/payments/:id - Ödeme sil
// ==========================================
router.delete('/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
        res.json({ success: true, message: 'Ödeme silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Silinemedi', error: error.message });
    }
});

module.exports = router;