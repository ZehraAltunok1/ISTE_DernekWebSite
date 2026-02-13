const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// ADMIN GİRİŞİ
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('🔐 Admin login attempt:', username);

        const admin = db.prepare(
            'SELECT * FROM admins WHERE username = ? AND status = ?'
        ).get(username, 'active');

        if (!admin) {
            return res.status(401).json({ 
                success: false,
                message: 'Kullanıcı adı veya şifre hatalı!' 
            });
        }

        const isValidPassword = await bcrypt.compare(password, admin.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                message: 'Kullanıcı adı veya şifre hatalı!' 
            });
        }

        const token = jwt.sign(
            { 
                id: admin.id, 
                username: admin.username, 
                role: admin.role,
                type: 'admin'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        db.prepare(
            'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(admin.id);

        console.log('✅ Admin login successful:', username);

        res.json({
            success: true,
            message: 'Giriş başarılı!',
            token: token,
            user: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                full_name: admin.full_name,
                role: admin.role,
                type: 'admin'
            }
        });

    } catch (error) {
        console.error('❌ Admin login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Sunucu hatası!'
        });
    }
});

// KULLANICI GİRİŞİ
router.post('/user/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 User login attempt:', email);

        const user = db.prepare(
            'SELECT * FROM users WHERE email = ? AND status = ?'
        ).get(email, 'active');

        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Email veya şifre hatalı!' 
            });
        }

        if (user.email_verified === 0) {
            return res.status(401).json({ 
                success: false,
                message: 'Email adresiniz henüz doğrulanmamış!' 
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                message: 'Email veya şifre hatalı!' 
            });
        }

        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email,
                user_type: user.user_type,
                type: 'user'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        db.prepare(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(user.id);

        console.log('✅ User login successful:', email);

        res.json({
            success: true,
            message: 'Giriş başarılı!',
            token: token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                user_type: user.user_type,
                type: 'user'
            }
        });

    } catch (error) {
        console.error('❌ User login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Sunucu hatası!'
        });
    }
});

// KULLANICI KAYIT
router.post('/user/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name, phone, user_type } = req.body;

        console.log('📝 Registration attempt:', email);

        // Email zaten kayıtlı mı?
        const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: 'Bu email adresi zaten kayıtlı!' 
            });
        }

        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(password, 10);

        // Kullanıcı oluştur
        const result = db.prepare(`
            INSERT INTO users (email, password_hash, first_name, last_name, phone, user_type, email_verified) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(email, hashedPassword, first_name, last_name, phone, user_type, 1);

        const userId = result.lastInsertRowid;

        // Kullanıcı tipine göre profil oluştur
        if (user_type === 'donor') {
            db.prepare(`
                INSERT INTO donor_profiles (user_id, donor_type) 
                VALUES (?, ?)
            `).run(userId, 'individual');
        } else if (user_type === 'student') {
            db.prepare(`
                INSERT INTO student_profiles (user_id) 
                VALUES (?)
            `).run(userId);
        }

        console.log('✅ User registered successfully:', email);

        res.json({
            success: true,
            message: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.',
            user: {
                id: userId,
                email: email,
                first_name: first_name,
                last_name: last_name,
                user_type: user_type
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Sunucu hatası!'
        });
    }
});

module.exports = router;