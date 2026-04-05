const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const User     = require('../models/user');
const Activity = require('../models/activity');

// ── GET /api/donors ──────────────────────────────────────────────
router.get('/donors', async (req, res) => {
    try {
        const donors = await User.find({ user_type: 'donor' }).sort({ created_at: -1 });
        res.json({ success: true, donors });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Bağışçılar yüklenemedi', error: error.message });
    }
});

// ── POST /api/donors ─────────────────────────────────────────────
router.post('/donors', async (req, res) => {
    try {
        const { first_name, last_name, email, phone } = req.body;
        if (!first_name || !last_name || !email || !phone)
            return res.status(400).json({ success: false, message: 'Zorunlu alanları doldurun' });

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ success: false, message: 'Bu email zaten kayıtlı!' });

        const randomPassword = Math.random().toString(36).slice(-8);
        const user = await User.create({
            email: email.toLowerCase(),
            password_hash: await bcrypt.hash(randomPassword, 10),
            first_name, last_name, phone,
            user_type: 'donor',
            donor_profile: { donor_type: 'individual', total_donated: 0 }
        });

        try { await Activity.create({ action_type: 'create_donor', action_description: `${first_name} ${last_name} bağışçı olarak eklendi`, related_user_id: user._id }); } catch (_) {}

        res.json({ success: true, message: 'Bağışçı başarıyla eklendi', donor: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Bağışçı eklenemedi', error: error.message });
    }
});

// ── PUT /api/donors/:id ──────────────────────────────────────────
router.put('/donors/:id', async (req, res) => {
    try {
        const { first_name, last_name, phone, status } = req.body;
        await User.findByIdAndUpdate(req.params.id, { first_name, last_name, phone, status });
        try { await Activity.create({ action_type: 'update_donor', action_description: `${first_name} ${last_name} bilgileri güncellendi`, related_user_id: req.params.id }); } catch (_) {}
        res.json({ success: true, message: 'Bağışçı güncellendi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Güncellenemedi', error: error.message });
    }
});

// ── DELETE /api/donors/:id (soft delete) ─────────────────────────
router.delete('/donors/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { status: 'inactive' });
        try { if (user) await Activity.create({ action_type: 'delete_donor', action_description: `${user.first_name} ${user.last_name} bağışçı kaydı silindi`, related_user_id: req.params.id }); } catch (_) {}
        res.json({ success: true, message: 'Bağışçı silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Silinemedi', error: error.message });
    }
});

// ── GET /api/students ────────────────────────────────────────────
router.get('/students', async (req, res) => {
    try {
        const students = await User.find({ user_type: 'student' }).sort({ created_at: -1 });
        res.json({ success: true, students });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Öğrenciler yüklenemedi', error: error.message });
    }
});

// ── POST /api/students ───────────────────────────────────────────
router.post('/students', async (req, res) => {
    try {
        const { first_name, last_name, email, phone, school_name } = req.body;
        if (!first_name || !last_name || !email)
            return res.status(400).json({ success: false, message: 'Zorunlu alanları doldurun' });

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ success: false, message: 'Bu email zaten kayıtlı!' });

        const user = await User.create({
            email: email.toLowerCase(),
            password_hash: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
            first_name, last_name, phone,
            user_type: 'student',
            student_profile: { university: school_name || null }
        });

        try { await Activity.create({ action_type: 'create_student', action_description: `${first_name} ${last_name} burslu öğrenci olarak eklendi`, related_user_id: user._id }); } catch (_) {}
        res.json({ success: true, message: 'Öğrenci başarıyla eklendi', student: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Öğrenci eklenemedi', error: error.message });
    }
});

// ── PUT /api/students/:id ────────────────────────────────────────
router.put('/students/:id', async (req, res) => {
    try {
        const { first_name, last_name, phone, status, university, department } = req.body;
        await User.findByIdAndUpdate(req.params.id, {
            first_name, last_name, phone, status,
            'student_profile.university': university,
            'student_profile.department': department
        });
        try { await Activity.create({ action_type: 'update_student', action_description: `${first_name} ${last_name} bilgileri güncellendi`, related_user_id: req.params.id }); } catch (_) {}
        res.json({ success: true, message: 'Öğrenci güncellendi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Güncellenemedi', error: error.message });
    }
});

// ── DELETE /api/students/:id ─────────────────────────────────────
router.delete('/students/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { status: 'inactive' });
        try { if (user) await Activity.create({ action_type: 'delete_student', action_description: `${user.first_name} ${user.last_name} öğrenci kaydı silindi`, related_user_id: req.params.id }); } catch (_) {}
        res.json({ success: true, message: 'Öğrenci silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Silinemedi', error: error.message });
    }
});

// ── GET /api/activities ──────────────────────────────────────────
router.get('/activities', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const activities = await Activity.find().sort({ created_at: -1 }).limit(limit);
        res.json({ success: true, activities });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Aktiviteler yüklenemedi' });
    }
});

// ── GET /api/stats ───────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const now   = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalDonors, totalStudents, newDonors, newStudents] = await Promise.all([
            User.countDocuments({ user_type: 'donor',   status: 'active' }),
            User.countDocuments({ user_type: 'student', status: 'active' }),
            User.countDocuments({ user_type: 'donor',   created_at: { $gte: start } }),
            User.countDocuments({ user_type: 'student', created_at: { $gte: start } })
        ]);

        const totalDonatedResult = await User.aggregate([
            { $match: { user_type: 'donor' } },
            { $group: { _id: null, total: { $sum: '$donor_profile.total_donated' } } }
        ]);
        const totalDonated = totalDonatedResult[0]?.total || 0;

        res.json({
            success: true,
            stats: {
                totalDonors, totalStudents,
                newDonorsThisMonth:   newDonors,
                newStudentsThisMonth: newStudents,
                totalDonationAmount:  totalDonated.toLocaleString('tr-TR'),
                donationGrowth: 15, activeProjects: 23, completedProjects: 5,
                totalMembers: totalDonors + totalStudents
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'İstatistikler yüklenemedi' });
    }
});

module.exports = router;