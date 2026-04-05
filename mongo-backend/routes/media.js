const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const Media   = require('../models/media');

const uploadDir = path.join(__dirname, '../uploads/media');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
        }
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) =>
        /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase())
            ? cb(null, true) : cb(new Error('Sadece görsel dosyalar yüklenebilir.'))
});

// ── GET /api/media ─────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const filter = req.query.type ? { type: req.query.type } : {};
        const rows   = await Media.find(filter).sort({ created_at: -1 });
        res.json({ success: true, media: rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ── GET /api/media/:id ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const media = await Media.findById(req.params.id);
        if (!media) return res.json({ success: false, message: 'Kayıt bulunamadı!' });
        res.json({ success: true, media });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ── POST /api/media/upload-photo ───────────────────────────────
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.json({ success: false, message: 'Dosya bulunamadı!' });
        const { title, description } = req.body;
        if (!title) return res.json({ success: false, message: 'Başlık zorunludur!' });

        // Gruptaki mevcut max order'ı bul
        const maxOrderDoc = await Media
            .findOne({ type: 'photo', title: title.trim() })
            .sort({ order: -1 });
        const nextOrder = maxOrderDoc ? (maxOrderDoc.order + 1) : 0;

        // Grupta hiç fotoğraf yoksa ilk fotoğraf kapak olsun
        const groupCount = await Media.countDocuments({ type: 'photo', title: title.trim() });
        const isCover    = groupCount === 0;

        const fileUrl = '/uploads/media/' + req.file.filename;
        const created = await Media.create({
            type:        'photo',
            title:       title.trim(),
            description: description || '',
            url:         fileUrl,
            order:       nextOrder,
            is_cover:    isCover
        });
        res.json({ success: true, url: fileUrl, media: created });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ── POST /api/media/add-video ──────────────────────────────────
router.post('/add-video', async (req, res) => {
    try {
        const { title, description, youtube_url } = req.body;
        if (!title || !youtube_url)
            return res.json({ success: false, message: 'Başlık ve YouTube URL zorunludur!' });

        const match = youtube_url.match(
            /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&\n?#]+)/
        );
        if (!match) return res.json({ success: false, message: 'Geçersiz YouTube URL!' });

        const videoId = match[1];
        await Media.create({
            type:          'video',
            title,
            description:   description || '',
            url:           'https://www.youtube.com/embed/' + videoId,
            thumbnail_url: 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg',
            youtube_id:    videoId
        });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ── PUT /api/media/:id ─────────────────────────────────────────
router.put('/:id', async (req, res) => {
    try {
        const { title, description, youtube_url, order, is_cover } = req.body;
        const media = await Media.findById(req.params.id);
        if (!media) return res.json({ success: false, message: 'Kayıt bulunamadı!' });

        if (title       !== undefined) media.title       = title.trim();
        if (description !== undefined) media.description = description;
        if (order       !== undefined) media.order       = order;
        if (is_cover    !== undefined) media.is_cover    = is_cover;

        // Kapak seçilirse aynı gruptaki diğerlerinin kapak özelliğini kaldır
        if (is_cover === true) {
            await Media.updateMany(
                { type: 'photo', title: media.title, _id: { $ne: media._id } },
                { $set: { is_cover: false } }
            );
        }

        // Video URL güncellemesi
        if (media.type === 'video' && youtube_url) {
            const match = youtube_url.match(
                /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&\n?#]+)/
            );
            if (match) {
                media.url           = 'https://www.youtube.com/embed/' + match[1];
                media.thumbnail_url = 'https://img.youtube.com/vi/' + match[1] + '/hqdefault.jpg';
                media.youtube_id    = match[1];
            }
        }

        await media.save();
        res.json({ success: true, media });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ── DELETE /api/media/:id ──────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const media = await Media.findById(req.params.id);
        if (!media) return res.json({ success: false, message: 'Kayıt bulunamadı!' });

        if (media.type === 'photo' && media.url) {
            const filePath = path.join(__dirname, '../', media.url);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        // Kapak siliniyorsa gruptaki ilk fotoğrafı kapak yap
        if (media.is_cover) {
            const next = await Media
                .findOne({ type: 'photo', title: media.title, _id: { $ne: media._id } })
                .sort({ order: 1 });
            if (next) await Media.findByIdAndUpdate(next._id, { is_cover: true });
        }

        await Media.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

module.exports = router;