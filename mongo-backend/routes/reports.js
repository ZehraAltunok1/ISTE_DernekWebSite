const express  = require('express');
const router   = express.Router();
const User     = require('../models/user');
const Payment  = require('../models/payment');
const Event    = require('../models/event');

// GET /api/reports/members-growth
router.get('/members-growth', async (req, res) => {
    try {
        const months = parseInt(req.query.months) || 6;

        const donors = await User.aggregate([
            { $match: { user_type: 'donor' } },
            { $group: { _id: { $substr: ['$created_at', 0, 7] }, count: { $sum: 1 } } },
            { $sort: { _id: -1 } }, { $limit: months }
        ]);

        const students = await User.aggregate([
            { $match: { user_type: 'student' } },
            { $group: { _id: { $substr: ['$created_at', 0, 7] }, count: { $sum: 1 } } },
            { $sort: { _id: -1 } }, { $limit: months }
        ]);

        res.json({ success: true, donors, students });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Veri yüklenemedi' });
    }
});

// GET /api/reports/income-trend
router.get('/income-trend', async (req, res) => {
    try {
        const months = parseInt(req.query.months) || 6;

        const income = await Payment.aggregate([
            { $group: {
                _id: { $substr: ['$created_at', 0, 7] },
                income:  { $sum: { $cond: [{ $eq: ['$status', 'odendi'] }, '$amount', 0] } },
                pending: { $sum: { $cond: [{ $in: ['$status', ['bekliyor','gecikmis']] }, '$amount', 0] } }
            }},
            { $sort: { _id: -1 } }, { $limit: months }
        ]);

        res.json({ success: true, income });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Veri yüklenemedi' });
    }
});

// GET /api/reports/payment-status
router.get('/payment-status', async (req, res) => {
    try {
        const stats = await Payment.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }
        ]);
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Veri yüklenemedi' });
    }
});

// GET /api/reports/member-status
router.get('/member-status', async (req, res) => {
    try {
        const stats = await User.aggregate([
            { $match: { user_type: { $in: ['donor','student'] } } },
            { $group: { _id: { status: '$status', user_type: '$user_type' }, count: { $sum: 1 } } }
        ]);
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Veri yüklenemedi' });
    }
});

// GET /api/reports/event-participation
router.get('/event-participation', async (req, res) => {
    try {
        const events = await Event.find({}, 'title registered_count capacity status event_date')
            .sort({ event_date: -1 }).limit(10);
        res.json({ success: true, events });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Veri yüklenemedi' });
    }
});

module.exports = router;