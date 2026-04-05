const express = require('express');
const router  = express.Router();
const User    = require('../models/user');

// GET /api/donor — tüm bağışçılar
router.get('/', async (req, res) => {
    try {
        const donors = await User.find({ user_type: 'donor' }, '-password_hash').sort({ created_at: -1 });
        res.json(donors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/donor — yeni bağışçı
router.post('/', async (req, res) => {
    try {
        const { email, first_name, last_name, phone } = req.body;
        const bcrypt = require('bcryptjs');
        const user = await User.create({
            email: email.toLowerCase(),
            password_hash: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
            first_name, last_name, phone,
            user_type: 'donor',
            donor_profile: { donor_type: 'individual', total_donated: 0 }
        });
        res.json({ id: user._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;