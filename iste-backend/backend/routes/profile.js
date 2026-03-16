// routes/profile.js — better-sqlite3 (senkron), mevcut users tablosuyla uyumlu
const express        = require('express');
const router         = express.Router();
const bcrypt         = require('bcryptjs');
const multer         = require('multer');
const path           = require('path');
const fs             = require('fs');

const authMiddleware    = require('../middleware/authMiddleware');
const authenticateToken =
    typeof authMiddleware === 'function'
        ? authMiddleware
        : authMiddleware.authenticateToken
        || authMiddleware.verifyToken
        || authMiddleware.auth
        || authMiddleware.protect
        || Object.values(authMiddleware).find(v => typeof v === 'function');

if (!authenticateToken) throw new Error('authMiddleware içinde kullanılabilir bir fonksiyon bulunamadı.');

// ── Avatar upload ─────────────────────────────────────────────────
const avatarDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: avatarDir,
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, 'avatar-' + req.user.id + '-' + Date.now() + ext);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) =>
        /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase())
            ? cb(null, true) : cb(new Error('Sadece görsel yüklenebilir.'))
});

// ── Multer hata yakalayıcı wrapper ───────────────────────────────
// Multer kendi hatasını fırlatırsa Express'e düzgün iletmek için
function uploadSingle(fieldName) {
    return (req, res, next) => {
        upload.single(fieldName)(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE')
                    return res.status(400).json({ success: false, message: 'Dosya boyutu 5MB\'dan küçük olmalıdır.' });
                return res.status(400).json({ success: false, message: 'Dosya yükleme hatası: ' + err.message });
            }
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            next();
        });
    };
}

// ── Kullanıcı tablosunda avatar kolonu var mı? ────────────────────
function getAvatarColumn(db) {
    try {
        const cols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
        if (cols.includes('avatar_url')) return 'avatar_url';
        if (cols.includes('avatar'))     return 'avatar';
        return null;
    } catch {
        return null;
    }
}

const toDate = v => v ? new Date(v).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const userTypeMap = {
    admin: 'Yönetici', super_admin: 'Süper Yönetici', moderator: 'Moderatör',
    donor: 'Bağışçı', student: 'Öğrenci', volunteer: 'Gönüllü'
};

// ── GET /api/profile ──────────────────────────────────────────────
router.get('/', authenticateToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        let user;
        try {
            user = db.prepare(`
                SELECT id, first_name, last_name, email, phone,
                       COALESCE(avatar_url, avatar, '') AS avatar_url,
                       COALESCE(user_type, role, 'user') AS user_type,
                       created_at, updated_at
                FROM   users WHERE id = ?`).get(req.user.id);
        } catch {
            user = db.prepare(`
                SELECT id, first_name, last_name, email,
                       '' AS phone, '' AS avatar_url, '' AS user_type,
                       created_at, '' AS updated_at
                FROM   users WHERE id = ?`).get(req.user.id);
        }

        if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

        res.json({
            success: true,
            data: {
                id:           user.id,
                first_name:   user.first_name  || '',
                last_name:    user.last_name   || '',
                full_name:    ((user.first_name || '') + ' ' + (user.last_name || '')).trim(),
                email:        user.email       || '',
                phone:        user.phone       || '',
                avatar:       user.avatar_url  || '',
                avatar_url:   user.avatar_url  || '',
                user_type:    user.user_type   || '',
                role:         user.user_type   || '',
                role_display: userTypeMap[user.user_type] || 'Üye',
                created_at:   toDate(user.created_at),
                updated_at:   toDate(user.updated_at)
            }
        });
    } catch (err) {
        console.error('Profile GET error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── GET /api/profile/stats ────────────────────────────────────────
router.get('/stats', authenticateToken, (req, res) => {
    try {
        const db  = req.app.locals.db;
        const uid = req.user.id;
        const stats = { donationCount: 0, donationTotal: 0, eventCount: 0, volunteerStatus: null };

        try {
            const r = db.prepare(`
                SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
                FROM   donations WHERE user_id = ?`).get(uid);
            stats.donationCount = r?.count || 0;
            stats.donationTotal = r?.total || 0;
        } catch {}

        try {
            const r = db.prepare(`SELECT COUNT(*) AS count FROM event_registrations WHERE user_id = ?`).get(uid);
            stats.eventCount = r?.count || 0;
        } catch {}

        try {
            const r = db.prepare(`
                SELECT status FROM volunteers
                WHERE  email = (SELECT email FROM users WHERE id = ?) LIMIT 1`).get(uid);
            stats.volunteerStatus = r?.status || null;
        } catch {}

        res.json({ success: true, stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── GET /api/profile/donations ────────────────────────────────────
router.get('/donations', authenticateToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        let rows = [];

        try {
            rows = db.prepare(`
                SELECT id, amount, status,
                       COALESCE(campaign_title, campaign_name, 'Genel Bağış') AS campaign_title,
                       message, created_at
                FROM   donations WHERE user_id = ?
                ORDER  BY created_at DESC`).all(req.user.id);
        } catch {
            try {
                rows = db.prepare(`
                    SELECT id, amount, status, 'Genel Bağış' AS campaign_title,
                           '' AS message, created_at
                    FROM   donations WHERE user_id = ?
                    ORDER  BY created_at DESC`).all(req.user.id);
            } catch { rows = []; }
        }

        const statusMap   = { approved:'Onaylandı', completed:'Tamamlandı', paid:'Ödendi', pending:'Beklemede', rejected:'Reddedildi' };
        const statusState = { approved:'Success',   completed:'Success',    paid:'Success', pending:'Warning',  rejected:'Error' };

        const donations = rows.map(d => ({
            id:             d.id,
            amount:         parseFloat(d.amount || 0).toLocaleString('tr-TR') + ' ₺',
            amountRaw:      parseFloat(d.amount || 0),
            status:         d.status || 'pending',
            statusText:     statusMap[d.status]   || d.status,
            statusState:    statusState[d.status] || 'None',
            campaign_title: d.campaign_title || 'Genel Bağış',
            message:        d.message || '',
            date:           toDate(d.created_at)
        }));

        res.json({ success: true, donations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── GET /api/profile/events ───────────────────────────────────────
router.get('/events', authenticateToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        let rows = [];

        try {
            rows = db.prepare(`
                SELECT er.id, er.status, er.created_at AS registered_at,
                       e.title, e.description, e.event_date, e.location, e.image_url
                FROM   event_registrations er
                JOIN   events e ON e.id = er.event_id
                WHERE  er.user_id = ?
                ORDER  BY e.event_date DESC`).all(req.user.id);
        } catch { rows = []; }

        const now = new Date();
        const events = rows.map(e => ({
            id:            e.id,
            title:         e.title       || 'Etkinlik',
            description:   e.description || '',
            event_date:    toDate(e.event_date),
            location:      e.location    || '',
            image_url:     e.image_url   || '',
            registered_at: toDate(e.registered_at),
            status:        e.status      || 'registered',
            isPast:        e.event_date ? new Date(e.event_date) < now : false
        }));

        res.json({ success: true, events });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── PUT /api/profile ──────────────────────────────────────────────
router.put('/', authenticateToken, (req, res) => {
    try {
        const db = req.app.locals.db;
        const { first_name, last_name, phone } = req.body;
        if (!first_name || !last_name)
            return res.status(400).json({ success: false, message: 'Ad ve soyad zorunludur' });

        db.prepare('UPDATE users SET first_name = ?, last_name = ?, phone = ? WHERE id = ?')
          .run(first_name.trim(), last_name.trim(), phone || null, req.user.id);

        res.json({ success: true, message: 'Profil başarıyla güncellendi' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── PUT /api/profile/password ─────────────────────────────────────
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { currentPassword, newPassword, current_password, new_password } = req.body;
        const sCurrent = currentPassword || current_password;
        const sNew     = newPassword     || new_password;

        if (!sCurrent || !sNew)
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur' });
        if (sNew.length < 6)
            return res.status(400).json({ success: false, message: 'Yeni şifre en az 6 karakter olmalıdır' });

        let user, passwordField = 'password_hash';
        try {
            user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
        } catch {
            user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
            passwordField = 'password';
        }

        if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

        if (!await bcrypt.compare(sCurrent, user[passwordField]))
            return res.status(400).json({ success: false, message: 'Mevcut şifre hatalı' });

        const hashed = await bcrypt.hash(sNew, 12);
        db.prepare(`UPDATE users SET ${passwordField} = ? WHERE id = ?`).run(hashed, req.user.id);
        res.json({ success: true, message: 'Şifre başarıyla değiştirildi' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── POST /api/profile/avatar ──────────────────────────────────────
router.post('/avatar', authenticateToken, uploadSingle('avatar'), (req, res) => {
    try {
        const db = req.app.locals.db;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Dosya bulunamadı.' });
        }

        const avatarUrl    = '/uploads/avatars/' + req.file.filename;
        const avatarColumn = getAvatarColumn(db);

        // Eski fotoğrafı sil
        try {
            const cols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
            let oldUrl = '';
            if (cols.includes('avatar_url')) {
                oldUrl = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(req.user.id)?.avatar_url || '';
            } else if (cols.includes('avatar')) {
                oldUrl = db.prepare('SELECT avatar FROM users WHERE id = ?').get(req.user.id)?.avatar || '';
            }
            if (oldUrl && !oldUrl.startsWith('data:') && !oldUrl.startsWith('http')) {
                const oldPath = path.join(__dirname, '../', oldUrl);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        } catch (delErr) {
            console.warn('Eski avatar silinemedi:', delErr.message);
        }

        // Yeni URL'yi kaydet
        if (!avatarColumn) {
            // Kolon yok — migration yap
            try {
                db.prepare('ALTER TABLE users ADD COLUMN avatar_url TEXT').run();
                db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, req.user.id);
            } catch (altErr) {
                console.error('Avatar kolonu eklenemedi:', altErr.message);
                return res.status(500).json({ success: false, message: 'Veritabanında avatar kolonu bulunamadı: ' + altErr.message });
            }
        } else {
            db.prepare(`UPDATE users SET ${avatarColumn} = ? WHERE id = ?`).run(avatarUrl, req.user.id);
        }

        res.json({ success: true, avatarUrl });
    } catch (err) {
        console.error('Avatar POST error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;