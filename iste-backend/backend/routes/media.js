const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

// ── DB BAĞLANTISI (better-sqlite3 — senkron) ──────────────────────
const db = require('../config/database');

// ── MEDIA TABLOSU OLUŞTUR (yoksa) ─────────────────────────────────
db.exec(`
    CREATE TABLE IF NOT EXISTS media (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        type          TEXT CHECK(type IN ('photo','video')) NOT NULL,
        title         TEXT NOT NULL,
        description   TEXT DEFAULT '',
        url           TEXT NOT NULL,
        thumbnail_url TEXT,
        youtube_id    TEXT,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// ── MULTER AYARI ───────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/media');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase();
        const name = Date.now() + '-' + Math.round(Math.random() * 1e6) + ext;
        cb(null, name);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        if (allowed.test(path.extname(file.originalname).toLowerCase())) {
            cb(null, true);
        } else {
            cb(new Error('Sadece görsel dosyalar yüklenebilir.'));
        }
    }
});

// ── GET /api/media ─────────────────────────────────────────────────
router.get('/', (req, res) => {
    try {
        const { type } = req.query;
        let rows;

        if (type === 'photo' || type === 'video') {
            rows = db.prepare('SELECT * FROM media WHERE type = ? ORDER BY created_at DESC').all(type);
        } else {
            rows = db.prepare('SELECT * FROM media ORDER BY created_at DESC').all();
        }

        res.json({ success: true, media: rows });
    } catch (err) {
        console.error('Media GET error:', err);
        res.json({ success: false, message: err.message });
    }
});

// ── POST /api/media/upload-photo ───────────────────────────────────
router.post('/upload-photo', upload.single('photo'), (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, message: 'Dosya bulunamadı!' });
        }

        const { title, description } = req.body;
        if (!title) {
            return res.json({ success: false, message: 'Başlık zorunludur!' });
        }

        const fileUrl = '/uploads/media/' + req.file.filename;

        db.prepare(
            'INSERT INTO media (type, title, description, url) VALUES (?, ?, ?, ?)'
        ).run('photo', title, description || '', fileUrl);

        res.json({ success: true, url: fileUrl });
    } catch (err) {
        console.error('Photo upload error:', err);
        res.json({ success: false, message: err.message });
    }
});

// ── POST /api/media/add-video ──────────────────────────────────────
router.post('/add-video', (req, res) => {
    try {
        const { title, description, youtube_url } = req.body;

        if (!title || !youtube_url) {
            return res.json({ success: false, message: 'Başlık ve YouTube URL zorunludur!' });
        }

        const match = youtube_url.match(
            /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&\n?#]+)/
        );
        if (!match) {
            return res.json({ success: false, message: 'Geçersiz YouTube URL!' });
        }

        const videoId  = match[1];
        const embedUrl = 'https://www.youtube.com/embed/' + videoId;
        const thumbUrl = 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg';

        db.prepare(
            'INSERT INTO media (type, title, description, url, thumbnail_url, youtube_id) VALUES (?, ?, ?, ?, ?, ?)'
        ).run('video', title, description || '', embedUrl, thumbUrl, videoId);

        res.json({ success: true });
    } catch (err) {
        console.error('Video add error:', err);
        res.json({ success: false, message: err.message });
    }
});

// ── DELETE /api/media/:id ──────────────────────────────────────────
router.delete('/:id', (req, res) => {
    try {
        const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);

        if (!media) {
            return res.json({ success: false, message: 'Kayıt bulunamadı!' });
        }

        // Fotoğrafsa fiziksel dosyayı da sil
        if (media.type === 'photo' && media.url) {
            const filePath = path.join(__dirname, '../', media.url);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error('Media delete error:', err);
        res.json({ success: false, message: err.message });
    }
});

module.exports = router;