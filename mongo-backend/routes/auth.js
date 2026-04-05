const express    = require("express");
const jwt        = require("jsonwebtoken");
const crypto     = require("crypto");
const bcrypt     = require("bcryptjs");
const nodemailer = require("nodemailer");
const User       = require("../models/user");
const Admin      = require("../models/admin");

const router      = express.Router();
const JWT_SECRET  = process.env.JWT_SECRET  || "edusupport_2026_super_secret_key_!A92kLmX";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

// ── Mail gönderici ─────────────────────────────────────
function createTransporter() {
    const user = process.env.GMAIL_USER || process.env.MAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD || process.env.MAIL_PASS;

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user,
            pass  // App Password — normal şifre değil!
        }
    });
}

// ── REGISTER ──────────────────────────────────────────
router.post("/register", async (req, res) => {
    try {
        const { first_name, last_name, email, password } = req.body;

        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ success: false, message: "Tüm alanlar zorunludur." });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ success: false, message: "Bu e-posta zaten kayıtlı." });
        }

        // password_hash alanına yazıyoruz — pre-save hook hashleyecek
        const user  = await User.create({ first_name, last_name, email, password_hash: password });
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

        res.status(201).json({
            success: true,
            message: "Kayıt başarılı!",
            data:    { token, user }
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ success: false, message: "Sunucu hatası." });
    }
});

// ── LOGIN ─────────────────────────────────────────────
router.post("/login", async (req, res) => {
    try {
        const { email, password, loginType } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "E-posta ve şifre zorunludur." });
        }

        // password_hash select:false olduğu için açıkça istiyoruz
        let user;
        if (loginType === "admin") {
            // Öncelikle Admin koleksiyonunda arama yap
            user = await Admin.findOne({ email }).select("+password_hash");
            // Eklenti: admin olarak User koleksiyonunda saklanan yönetici varsa da destekle
            if (!user) {
                user = await User.findOne({ email }).select("+password_hash");
            }
        } else {
            user = await User.findOne({ email }).select("+password_hash");
        }

        if (!user) {
            return res.status(401).json({ success: false, message: "Email veya şifre hatalı." });
        }

        let isMatch;
        if (loginType === "admin" && user.password_hash) {
            isMatch = await bcrypt.compare(password, user.password_hash);
        } else if (typeof user.comparePassword === "function") {
            isMatch = await user.comparePassword(password);
        } else {
            isMatch = false;
        }

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Email veya şifre hatalı." });
        }

        // Admin kontrolü
        const sRole = (user.role || user.user_type || "").toLowerCase();
        if (loginType === "admin" && sRole !== "admin" && sRole !== "super_admin") {
            return res.status(403).json({ success: false, message: "Yönetici yetkisi yok." });
        }

        // Son giriş tarihini güncelle
        user.last_login = new Date();
        await user.save({ validateBeforeSave: false });

        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

        const safeUser = (typeof user.toObject === "function") ? user.toObject() : { ...user };
        delete safeUser.password_hash;

        res.json({
            success: true,
            message: "Giriş başarılı!",
            data:    { token, user: safeUser }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ success: false, message: "Sunucu hatası." });
    }
});

// ── FORGOT PASSWORD ───────────────────────────────────
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "E-posta zorunludur." });
        }

        const user = await User.findOne({ email });

        // Kullanıcı bulunamasa bile aynı mesajı dön (güvenlik için)
        if (!user) {
            return res.json({ success: true, message: "Eğer bu e-posta kayıtlıysa sıfırlama bağlantısı gönderildi." });
        }

        // Token üret — 32 byte = 64 hex karakter
        const resetToken   = crypto.randomBytes(32).toString("hex");
        const resetExpires = Date.now() + 60 * 60 * 1000; // 1 saat

        user.resetPasswordToken   = resetToken;
        user.resetPasswordExpires = resetExpires;
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/index.html#/reset-password/${resetToken}`;

        if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
            console.warn("Forgot-password email env missing: GMAIL_USER or GMAIL_APP_PASSWORD");
            return res.status(500).json({
                success: false,
                message: "E-posta gönderimi yapılandırılmamış. .env içinde GMAIL_USER ve GMAIL_APP_PASSWORD ayarlarını kontrol edin."
            });
        }

        const transporter = createTransporter();

        try {
            await transporter.sendMail({
                from:    `"Pati ve Gelecek Derneği" <${process.env.GMAIL_USER}>`,
                to:      user.email,
                subject: "Şifre Sıfırlama Talebi",
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:30px;border:1px solid #eee;border-radius:12px;">
                        <div style="text-align:center;margin-bottom:24px;">
                            <h2 style="color:#2D6A4F;margin:0;">🐾 Pati ve Gelecek Derneği</h2>
                        </div>
                        <h3 style="color:#1F2937;">Şifre Sıfırlama</h3>
                        <p style="color:#4B5563;">Merhaba <strong>${user.first_name}</strong>,</p>
                        <p style="color:#4B5563;">Şifrenizi sıfırlamak için aşağıdaki butona tıklayın. Bu bağlantı <strong>1 saat</strong> geçerlidir.</p>
                        <div style="text-align:center;margin:32px 0;">
                            <a href="${resetUrl}"
                               style="background:#2D6A4F;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:1rem;">
                                Şifremi Sıfırla
                            </a>
                        </div>
                        <p style="color:#9CA3AF;font-size:0.85rem;">
                            Buton çalışmıyorsa şu adresi tarayıcınıza kopyalayın:<br/>
                            <a href="${resetUrl}" style="color:#2D6A4F;">${resetUrl}</a>
                        </p>
                        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
                        <p style="color:#9CA3AF;font-size:0.8rem;">Bu isteği siz yapmadıysanız bu e-postayı dikkate almayın.</p>
                    </div>
                `
            });
        } catch (mailErr) {
            console.error("Forgot password email send error:", mailErr);
            return res.status(500).json({
                success: false,
                message: "E-posta gönderilemedi. Lütfen SMTP ayarlarınızı kontrol edin (GMAIL_USER, GMAIL_APP_PASSWORD)."
            });
        }

        res.json({ success: true, message: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi." });

    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ success: false, message: "Mail gönderilemedi. Lütfen tekrar deneyin." });
    }
});

// ── RESET PASSWORD ────────────────────────────────────
router.post("/reset-password/:token", async (req, res) => {
    try {
        const { token }    = req.params;
        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ success: false, message: "Şifre en az 8 karakter olmalıdır." });
        }

        const user = await User.findOne({
            resetPasswordToken:   token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Link geçersiz veya süresi dolmuş. Lütfen yeni bir talep oluşturun."
            });
        }

        // password_hash'e yazıyoruz — pre-save hook hashleyecek
        user.password_hash        = password;
        user.resetPasswordToken   = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, message: "Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz." });

    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ success: false, message: "Şifre güncellenemedi." });
    }
});

module.exports = router;