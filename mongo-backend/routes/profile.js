const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const User     = require('../models/user');
const Admin    = require('../models/admin');
const auth     = require('../middleware/authMiddleware');

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

const toDate = v => v ? new Date(v).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const roleMap = { admin: 'Yönetici', super_admin: 'Süper Yönetici', moderator: 'Moderatör', accountant: 'Muhasebeci', viewer: 'İzleyici', donor: 'Bağışçı', student: 'Öğrenci', volunteer: 'Gönüllü' };

// ── Kullanıcıyı bul: önce User, sonra Admin ──────────────
async function findUser(id) {
    let user = await User.findById(id).select('-password_hash');
    let isAdmin = false;
    if (!user) {
        user = await Admin.findById(id).select('-password_hash');
        isAdmin = true;
    }
    return { user, isAdmin };
}

// ── Admin için first_name / last_name yardımcısı ─────────
function splitFullName(full_name) {
    const parts = (full_name || '').trim().split(' ');
    const first = parts[0] || '';
    const last  = parts.slice(1).join(' ') || '';
    return { first, last };
}

// ── GET /api/profile ─────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const { user, isAdmin } = await findUser(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

        let first_name, last_name;
        if (isAdmin) {
            const n  = splitFullName(user.full_name);
            first_name = n.first;
            last_name  = n.last;
        } else {
            first_name = user.first_name || '';
            last_name  = user.last_name  || '';
        }

        const role = user.role || user.user_type || '';

        res.json({
            success: true,
            data: {
                id:           user._id,
                first_name,
                last_name,
                full_name:    (first_name + ' ' + last_name).trim() || user.full_name || '',
                email:        user.email      || '',
                phone:        user.phone      || '',
                avatar_url:   user.avatar_url || '',
                user_type:    role,
                role,
                role_display: roleMap[role] || 'Üye',
                created_at:   toDate(user.created_at),
                updated_at:   toDate(user.updated_at)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── PUT /api/profile ─────────────────────────────────────
router.put('/', auth, async (req, res) => {
    try {
        const { first_name, last_name, phone } = req.body;
        if (!first_name || !last_name)
            return res.status(400).json({ success: false, message: 'Ad ve soyad zorunludur' });

        const { user, isAdmin } = await findUser(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

        if (isAdmin) {
            await Admin.findByIdAndUpdate(req.user.id, {
                full_name: (first_name.trim() + ' ' + last_name.trim()).trim()
            });
        } else {
            await User.findByIdAndUpdate(req.user.id, {
                first_name: first_name.trim(),
                last_name:  last_name.trim(),
                phone:      phone || null
            });
        }

        res.json({ success: true, message: 'Profil başarıyla güncellendi' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── PUT /api/profile/password ────────────────────────────
router.put('/password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword, current_password, new_password } = req.body;
        const sCurrent = currentPassword || current_password;
        const sNew     = newPassword     || new_password;

        if (!sCurrent || !sNew)
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur' });
        if (sNew.length < 6)
            return res.status(400).json({ success: false, message: 'Yeni şifre en az 6 karakter olmalıdır' });

        // Admin veya User — password_hash alanını da çek
        let user = await User.findById(req.user.id).select('+password_hash');
        let isAdmin = false;
        if (!user) {
            user = await Admin.findById(req.user.id).select('+password_hash');
            isAdmin = true;
        }
        if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });

        if (!await bcrypt.compare(sCurrent, user.password_hash))
            return res.status(400).json({ success: false, message: 'Mevcut şifre hatalı' });

        const hashed = await bcrypt.hash(sNew, 12);
        if (isAdmin) {
            await Admin.findByIdAndUpdate(req.user.id, { password_hash: hashed });
        } else {
            await User.findByIdAndUpdate(req.user.id, { password_hash: hashed });
        }

        res.json({ success: true, message: 'Şifre başarıyla değiştirildi' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── POST /api/profile/avatar ─────────────────────────────
router.post('/avatar', auth, (req, res, next) => {
    upload.single('avatar')(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        try {
            if (!req.file) return res.status(400).json({ success: false, message: 'Dosya bulunamadı.' });

            const avatarUrl = '/uploads/avatars/' + req.file.filename;

            // Eski avatarı sil
            const { user, isAdmin } = await findUser(req.user.id);
            if (user?.avatar_url && !user.avatar_url.startsWith('http')) {
                const oldPath = path.join(__dirname, '../', user.avatar_url);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }

            if (isAdmin) {
                await Admin.findByIdAndUpdate(req.user.id, { avatar_url: avatarUrl });
            } else {
                await User.findByIdAndUpdate(req.user.id, { avatar_url: avatarUrl });
            }

            res.json({ success: true, avatarUrl });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
});

// ── GET /api/profile/stats ───────────────────────────────
router.get('/stats', auth, async (req, res) => {
    res.json({ success: true, stats: { donationCount: 0, donationTotal: 0, eventCount: 0, volunteerStatus: null } });
});

// ── GET /api/profile/donations ───────────────────────────
router.get('/donations', auth, async (req, res) => {
    res.json({ success: true, donations: [] });
});

// ── GET /api/profile/events ──────────────────────────────
router.get('/events', auth, async (req, res) => {
    res.json({ success: true, events: [] });
});

module.exports = router;