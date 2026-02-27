// backend/controllers/authController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthController {
    
    /**
     * LOGİN - Kullanıcı Girişi
     */
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            
            console.log('🔐 Login attempt for:', email);
            
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Email ve şifre gerekli!"
                });
            }
            
           
            const [users] = await db.query(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            
            if (!users || users.length === 0) {
                console.log('❌ User not found:', email);
                return res.status(401).json({
                    success: false,
                    message: "Email veya şifre hatalı!"
                });
            }
            
            const user = users[0];
            
           
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            
            if (!isPasswordValid) {
                console.log('❌ Invalid password for:', email);
                return res.status(401).json({
                    success: false,
                    message: "Email veya şifre hatalı!"
                });
            }
            
         
            const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-2024-edusupport';
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    user_type: user.user_type || 'donor',
                    first_name: user.first_name,
                    last_name: user.last_name
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            console.log('✅ Login successful:', email);
            
            res.json({
                success: true,
                message: "Giriş başarılı!",
                data: {
                    token: token,
                    user: {
                        id: user.id,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        user_type: user.user_type || 'donor',
                        phone: user.phone
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Login error:', error);
            res.status(500).json({
                success: false,
                message: "Giriş yapılırken hata oluştu: " + error.message
            });
        }
    }
    
    /**
     * REGISTER - Yeni Kullanıcı Kaydı
     */
    static async register(req, res) {
        try {
            const { email, password, first_name, last_name, phone } = req.body;
            
            console.log('📝 Register attempt for:', email);
            
            
            if (!email || !password || !first_name || !last_name) {
                return res.status(400).json({
                    success: false,
                    message: "Tüm alanları doldurun!"
                });
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: "Geçerli bir email adresi girin!"
                });
            }
            
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Şifre en az 6 karakter olmalıdır!"
                });
            }
            
            // Email kontrolü
            const [existing] = await db.query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );
            
            if (existing && existing.length > 0) {
                console.log('❌ Email already exists:', email);
                return res.status(400).json({
                    success: false,
                    message: "Bu email zaten kayıtlı!"
                });
            }
            
            // Şifreyi hashle
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Kullanıcıyı kaydet
            const [result] = await db.run(`
                INSERT INTO users 
                (email, password_hash, first_name, last_name, phone, user_type, email_verified)
                VALUES (?, ?, ?, ?, ?, 'donor', 1)
            `, [email, hashedPassword, first_name, last_name, phone || null]);
            
            const userId = result.insertId;
            
            // Bağışçı profili oluştur
            await db.run(`
                INSERT INTO donor_profiles (user_id, donor_type) 
                VALUES (?, 'individual')
            `, [userId]);
            
            // Token oluştur
            const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-2024-edusupport';
            const token = jwt.sign(
                {
                    id: userId,
                    email: email,
                    user_type: 'donor',
                    first_name: first_name,
                    last_name: last_name
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            console.log('✅ Registration successful:', email);
            
            res.status(201).json({
                success: true,
                message: "Kayıt başarılı!",
                data: {
                    token: token,
                    user: {
                        id: userId,
                        email: email,
                        first_name: first_name,
                        last_name: last_name,
                        user_type: 'donor',
                        phone: phone || null
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Register error:', error);
            res.status(500).json({
                success: false,
                message: "Kayıt sırasında hata oluştu: " + error.message
            });
        }
    }
    
    /**
     * VERIFY TOKEN
     */
    static async verifyToken(req, res) {
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    success: false,
                    message: "Token bulunamadı!"
                });
            }
            
            const token = authHeader.substring(7);
            const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-2024-edusupport';
            
            const decoded = jwt.verify(token, JWT_SECRET);
            
            const [users] = await db.query(
                'SELECT id, email, first_name, last_name, user_type, phone FROM users WHERE id = ?',
                [decoded.id]
            );
            
            if (!users || users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Kullanıcı bulunamadı!"
                });
            }
            
            res.json({
                success: true,
                data: {
                    user: users[0]
                }
            });
            
        } catch (error) {
            console.error('❌ Verify token error:', error);
            
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: "Geçersiz token!"
                });
            }
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: "Token süresi doldu!"
                });
            }
            
            res.status(500).json({
                success: false,
                message: "Token doğrulama hatası"
            });
        }
    }
}

module.exports = AuthController;