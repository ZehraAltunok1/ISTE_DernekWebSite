const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'edusupport-secret-key-2026';

// ==========================================
// BİRLEŞİK LOGIN (Admin + User)
// ==========================================

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Login attempt for:', email);
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email ve şifre gerekli!'
            });
        }
        
        // Önce admin tablosunda ara
        const admin = db.prepare(
            'SELECT * FROM admins WHERE (username = ? OR email = ?) AND status = ?'
        ).get(email, email, 'active');
        
        if (admin) {
            // Admin kullanıcı
            const isValidPassword = await bcrypt.compare(password, admin.password_hash);
            
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Email veya şifre hatalı!'
                });
            }
            
            const token = jwt.sign(
                { 
                    id: admin.id, 
                    username: admin.username,
                    email: admin.email,
                    role: admin.role,
                    type: 'admin'
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            db.prepare(
                'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
            ).run(admin.id);
            
            console.log('✅ Admin login successful:', email);
            
            return res.json({
                success: true,
                message: 'Giriş başarılı!',
                data: {
                    token: token,
                    user: {
                        id: admin.id,
                        email: admin.email,
                        first_name: admin.full_name ? admin.full_name.split(' ')[0] : 'Admin',
                        last_name: admin.full_name ? admin.full_name.split(' ').slice(1).join(' ') : 'User',
                        full_name: admin.full_name,
                        role: admin.role,
                        type: 'admin'
                    }
                }
            });
        }
        
        // Users tablosunda ara
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
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        db.prepare(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(user.id);
        
        console.log('✅ User login successful:', email);
        
        res.json({
            success: true,
            message: 'Giriş başarılı!',
            data: {
                token: token,
                user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    user_type: user.user_type,
                    type: user.user_type, // donor, student, volunteer
                    phone: user.phone
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası: ' + error.message
        });
    }
});

// ==========================================
// REGISTER
// ==========================================

router.post('/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name, phone } = req.body;
        
        console.log('📝 Registration attempt:', email);
        
        if (!email || !password || !first_name) {
            return res.status(400).json({
                success: false,
                message: 'Zorunlu alanları doldurun!'
            });
        }
        
        // Email kontrolü
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
            VALUES (?, ?, ?, ?, ?, 'donor', 1)
        `).run(email, hashedPassword, first_name, last_name || '', phone || null);
        
        const userId = result.lastInsertRowid;
        
        // Donor profili oluştur
        db.prepare(`
            INSERT INTO donor_profiles (user_id, donor_type) 
            VALUES (?, 'individual')
        `).run(userId);
        
        // Token oluştur
        const token = jwt.sign(
            { 
                id: userId, 
                email: email,
                user_type: 'donor',
                type: 'donor'
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log('✅ User registered successfully:', email);
        
        res.json({
            success: true,
            message: 'Kayıt başarılı!',
            data: {
                token: token,
                user: {
                    id: userId,
                    email: email,
                    first_name: first_name,
                    last_name: last_name || '',
                    user_type: 'donor',
                    type: 'donor',
                    phone: phone || null
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası: ' + error.message
        });
    }
});

module.exports = router;