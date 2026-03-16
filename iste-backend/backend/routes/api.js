
const express = require('express');
const router = express.Router();
const db = require('../config/database');


router.get('/donors', (req, res) => {
    try {
        const donors = db.prepare(`
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                u.user_type,
                u.created_at,
                u.status,
                dp.donor_type,
                dp.company_name,
                dp.total_donated
            FROM users u
            LEFT JOIN donor_profiles dp ON u.id = dp.user_id
            WHERE u.user_type = 'donor'
            ORDER BY u.created_at DESC
        `).all();

        res.json({ success: true, donors: donors || [] });
    } catch (error) {
        console.error(' Donors fetch error:', error);
        res.status(500).json({ success: false, message: 'Bağışçılar yüklenemedi', error: error.message });
    }
});


router.post('/donors', async (req, res) => {
    try {
        const { first_name, last_name, email, phone, city } = req.body;

        if (!first_name || !last_name || !email || !phone) {
            return res.status(400).json({ success: false, message: 'Zorunlu alanları doldurun' });
        }

        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Bu email zaten kayıtlı!' });
        }

        const bcrypt = require('bcryptjs');
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        const result = db.prepare(`
            INSERT INTO users (email, password_hash, first_name, last_name, phone, user_type, email_verified)
            VALUES (?, ?, ?, ?, ?, 'donor', 1)
        `).run(email, hashedPassword, first_name, last_name, phone);

        const userId = result.lastInsertRowid;

        db.prepare(`
            INSERT INTO donor_profiles (user_id, donor_type) VALUES (?, 'individual')
        `).run(userId);

     
        db.prepare(`
            INSERT INTO activities (admin_name, action_type, action_description, related_user_id)
            VALUES ('Admin', 'create_donor', ?, ?)
        `).run(`${first_name} ${last_name} bağışçı olarak eklendi`, userId);

        console.log(' Donor added:', email);

        res.json({
            success: true,
            message: 'Bağışçı başarıyla eklendi',
            donor: {
                id: userId,
                first_name,
                last_name,
                email,
                phone,
                user_type: 'donor',
                status: 'active',
                created_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error(' Donor insert error:', error);
        res.status(500).json({ success: false, message: 'Bağışçı eklenemedi', error: error.message });
    }
});

// PUT Bağışçı güncelle
router.put('/donors/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, phone, status } = req.body;

        db.prepare(`
            UPDATE users SET first_name = ?, last_name = ?, phone = ?, status = ?
            WHERE id = ? AND user_type = 'donor'
        `).run(first_name, last_name, phone, status, id);

        db.prepare(`
            INSERT INTO activities (admin_name, action_type, action_description, related_user_id)
            VALUES ('Admin', 'update_donor', ?, ?)
        `).run(`${first_name} ${last_name} bilgileri güncellendi`, id);

        res.json({ success: true, message: 'Bağışçı güncellendi' });
    } catch (error) {
        console.error(' Donor update error:', error);
        res.status(500).json({ success: false, message: 'Güncellenemedi', error: error.message });
    }
});

// DELETE  Bağışçı sil (soft delete)
router.delete('/donors/:id', (req, res) => {
    try {
        const { id } = req.params;

        const user = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get(id);

        db.prepare(`UPDATE users SET status = 'inactive' WHERE id = ? AND user_type = 'donor'`).run(id);

        if (user) {
            db.prepare(`
                INSERT INTO activities (admin_name, action_type, action_description, related_user_id)
                VALUES ('Admin', 'delete_donor', ?, ?)
            `).run(`${user.first_name} ${user.last_name} bağışçı kaydı silindi`, id);
        }

        res.json({ success: true, message: 'Bağışçı silindi' });
    } catch (error) {
        console.error(' Donor delete error:', error);
        res.status(500).json({ success: false, message: 'Silinemedi', error: error.message });
    }
});


// GET /api/students
router.get('/students', (req, res) => {
    try {
        const students = db.prepare(`
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                u.user_type,
                u.created_at,
                u.status,
                sp.student_no,
                sp.university,
                sp.department,
                sp.grade_level,
                sp.gpa
            FROM users u
            LEFT JOIN student_profiles sp ON u.id = sp.user_id
            WHERE u.user_type = 'student'
            ORDER BY u.created_at DESC
        `).all();

        res.json({ success: true, students: students || [] });
    } catch (error) {
        console.error(' Students fetch error:', error);
        res.status(500).json({ success: false, message: 'Öğrenciler yüklenemedi', error: error.message });
    }
});

// POST /api/students
router.post('/students', async (req, res) => {
    try {
        const { first_name, last_name, tc_no, birth_date, email, phone, city, address, school_name } = req.body;

        if (!first_name || !last_name || !email) {
            return res.status(400).json({ success: false, message: 'Zorunlu alanları doldurun' });
        }

        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Bu email zaten kayıtlı!' });
        }

        const bcrypt = require('bcryptjs');
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        const result = db.prepare(`
            INSERT INTO users (email, password_hash, first_name, last_name, phone, user_type, email_verified)
            VALUES (?, ?, ?, ?, ?, 'student', 1)
        `).run(email, hashedPassword, first_name, last_name, phone);

        const userId = result.lastInsertRowid;

        db.prepare(`
            INSERT INTO student_profiles (user_id, university) VALUES (?, ?)
        `).run(userId, school_name || null);

        //  Aktivite kaydı oluştur
        db.prepare(`
            INSERT INTO activities (admin_name, action_type, action_description, related_user_id)
            VALUES ('Admin', 'create_student', ?, ?)
        `).run(`${first_name} ${last_name} burslu öğrenci olarak eklendi`, userId);

        console.log('Student added:', email);

        res.json({
            success: true,
            message: 'Öğrenci başarıyla eklendi',
            student: {
                id: userId,
                first_name,
                last_name,
                email,
                phone,
                user_type: 'student',
                status: 'active',
                created_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error(' Student insert error:', error);
        res.status(500).json({ success: false, message: 'Öğrenci eklenemedi', error: error.message });
    }
});

// PUT  - Öğrenci güncelle
router.put('/students/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, phone, status, university, department } = req.body;

        db.prepare(`
            UPDATE users SET first_name = ?, last_name = ?, phone = ?, status = ?
            WHERE id = ? AND user_type = 'student'
        `).run(first_name, last_name, phone, status, id);

        db.prepare(`
            UPDATE student_profiles SET university = ?, department = ?
            WHERE user_id = ?
        `).run(university, department, id);

        db.prepare(`
            INSERT INTO activities (admin_name, action_type, action_description, related_user_id)
            VALUES ('Admin', 'update_student', ?, ?)
        `).run(`${first_name} ${last_name} bilgileri güncellendi`, id);

        res.json({ success: true, message: 'Öğrenci güncellendi' });
    } catch (error) {
        console.error(' Student update error:', error);
        res.status(500).json({ success: false, message: 'Güncellenemedi', error: error.message });
    }
});

// DELETE - Öğrenci sil (soft delete)
router.delete('/students/:id', (req, res) => {
    try {
        const { id } = req.params;

        const user = db.prepare('SELECT first_name, last_name FROM users WHERE id = ?').get(id);

        db.prepare(`UPDATE users SET status = 'inactive' WHERE id = ? AND user_type = 'student'`).run(id);

        if (user) {
            db.prepare(`
                INSERT INTO activities (admin_name, action_type, action_description, related_user_id)
                VALUES ('Admin', 'delete_student', ?, ?)
            `).run(`${user.first_name} ${user.last_name} öğrenci kaydı silindi`, id);
        }

        res.json({ success: true, message: 'Öğrenci silindi' });
    } catch (error) {
        console.error(' Student delete error:', error);
        res.status(500).json({ success: false, message: 'Silinemedi', error: error.message });
    }
});


router.get('/activities', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const activities = db.prepare(`
            SELECT * FROM activities
            ORDER BY created_at DESC
            LIMIT ?
        `).all(limit);

        res.json({ success: true, activities: activities || [] });
    } catch (error) {
        console.error(' Activities fetch error:', error);
        res.status(500).json({ success: false, message: 'Aktiviteler yüklenemedi' });
    }
});


router.get('/stats', (req, res) => {
    try {
        const totalDonors   = db.prepare(`SELECT COUNT(*) as count FROM users WHERE user_type = 'donor' AND status = 'active'`).get().count;
        const totalStudents = db.prepare(`SELECT COUNT(*) as count FROM users WHERE user_type = 'student' AND status = 'active'`).get().count;
        const totalDonated  = db.prepare(`SELECT COALESCE(SUM(total_donated), 0) as total FROM donor_profiles`).get().total;

        const currentMonth = new Date().getMonth() + 1;
        const currentYear  = new Date().getFullYear();

        const newDonors = db.prepare(`
            SELECT COUNT(*) as count FROM users
            WHERE user_type = 'donor'
            AND strftime('%m', created_at) = ?
            AND strftime('%Y', created_at) = ?
        `).get(String(currentMonth).padStart(2, '0'), String(currentYear)).count;

        const newStudents = db.prepare(`
            SELECT COUNT(*) as count FROM users
            WHERE user_type = 'student'
            AND strftime('%m', created_at) = ?
            AND strftime('%Y', created_at) = ?
        `).get(String(currentMonth).padStart(2, '0'), String(currentYear)).count;

        res.json({
            success: true,
            stats: {
                totalDonors,
                totalStudents,
                newDonorsThisMonth: newDonors,
                newStudentsThisMonth: newStudents,
                totalDonationAmount: totalDonated.toLocaleString('tr-TR'),
                donationGrowth: 15,
                activeProjects: 23,
                completedProjects: 5,
                totalMembers: totalDonors + totalStudents
            }
        });
    } catch (error) {
        console.error(' Stats fetch error:', error);
        res.status(500).json({ success: false, message: 'İstatistikler yüklenemedi' });
    }
});

module.exports = router;