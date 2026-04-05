const express  = require('express');
const router   = express.Router();
const Payment  = require('../models/payment');
const User     = require('../models/user');
const Activity = require('../models/activity');

// GET /api/payments
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.status)       filter.status       = req.query.status;
        if (req.query.payment_type) filter.payment_type = req.query.payment_type;
        if (req.query.user_id)      filter.user_id      = req.query.user_id;

        const payments = await Payment.find(filter)
            .populate('user_id', 'first_name last_name email user_type')
            .sort({ created_at: -1 });

        res.json({ success: true, payments });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ödemeler yüklenemedi', error: error.message });
    }
});

// GET /api/payments/stats
router.get('/stats', async (req, res) => {
    try {
        const now   = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalIncomeResult, monthlyResult, pendingResult, totalPaid, totalDue] = await Promise.all([
            Payment.aggregate([{ $match: { status: 'odendi' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
            Payment.aggregate([{ $match: { status: 'odendi', created_at: { $gte: start } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
            Payment.aggregate([{ $match: { status: { $in: ['bekliyor','gecikmis'] } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
            Payment.countDocuments({ status: 'odendi' }),
            Payment.countDocuments({ payment_type: 'aidat' })
        ]);

        res.json({
            success: true,
            stats: {
                totalIncome:    totalIncomeResult[0]?.total || 0,
                monthlyIncome:  monthlyResult[0]?.total || 0,
                pendingAmount:  pendingResult[0]?.total || 0,
                collectionRate: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'İstatistikler yüklenemedi' });
    }
});

// POST /api/payments
router.post('/', async (req, res) => {
    try {
        const { user_id, payment_type, amount, payment_date, due_date, status, payment_method, notes } = req.body;
        if (!user_id || !payment_type || !amount)
            return res.status(400).json({ success: false, message: 'Üye, ödeme tipi ve tutar zorunludur' });

        const payment = await Payment.create({ user_id, payment_type, amount, payment_date, due_date, status, payment_method, notes });

        try {
            const user = await User.findById(user_id);
            if (user) await Activity.create({ action_type: 'create_payment', action_description: `${user.first_name} ${user.last_name} - ${amount}₺ ${payment_type} kaydedildi` });
        } catch (_) {}

        res.json({ success: true, message: 'Ödeme kaydedildi', payment });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Ödeme eklenemedi', error: error.message });
    }
});

// PUT /api/payments/:id
router.put('/:id', async (req, res) => {
    try {
        const { payment_date, status, payment_method, notes } = req.body;
        await Payment.findByIdAndUpdate(req.params.id, { payment_date, status, payment_method, notes });
        res.json({ success: true, message: 'Ödeme güncellendi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Güncellenemedi', error: error.message });
    }
});

// DELETE /api/payments/:id
router.delete('/:id', async (req, res) => {
    try {
        await Payment.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Ödeme silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Silinemedi', error: error.message });
    }
});

module.exports = router;