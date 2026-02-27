const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ─────────────────────────────────────────────────────────────
// TABLO OLUŞTUR
// ─────────────────────────────────────────────────────────────
db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT    NOT NULL,
        message     TEXT    NOT NULL,
        type        TEXT    CHECK(type IN ('Information','Success','Warning','Error')) DEFAULT 'Information',
        status      TEXT    CHECK(status IN ('active','passive')) DEFAULT 'active',
        link_text   TEXT    DEFAULT '',
        link_url    TEXT    DEFAULT '',
        created_by  TEXT    DEFAULT 'Admin',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// Seed data — başlangıç duyuruları
const checkAnn = db.prepare('SELECT COUNT(*) as count FROM announcements').get();
if (checkAnn.count === 0) {
    const seedAnn = [
        {
            title:     '2026 Bahar Dönemi Burs Başvuruları Başladı!',
            message:   'Başvuru formu 30 Nisan 2026\'ya kadar açık olacaktır.',
            type:      'Information',
            status:    'active',
            link_text: 'Başvuru Yap',
            link_url:  '#scholarshipsSection'
        },
        {
            title:     'Online Seminer: Burs Başvuru Süreçleri - 20 Şubat 2026',
            message:   'Zoom üzerinden gerçekleşecek ücretsiz seminere kayıt olabilirsiniz.',
            type:      'Success',
            status:    'active',
            link_text: 'Katıl',
            link_url:  '#'
        },
        {
            title:     'Yeni Teknoloji Bursu Programı Açıldı!',
            message:   'Yazılım ve donanım alanında eğitim alan öğrencilere özel destek programı.',
            type:      'Warning',
            status:    'active',
            link_text: 'Detaylı Bilgi',
            link_url:  '#scholarshipsSection'
        }
    ];

    const ins = db.prepare(`
        INSERT INTO announcements (title, message, type, status, link_text, link_url)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const a of seedAnn) {
        ins.run(a.title, a.message, a.type, a.status, a.link_text, a.link_url);
    }
    console.log('✅ Duyuru seed data hazır (3 kayıt)');
}

// ─────────────────────────────────────────────────────────────
// GET / — Tüm duyurular (admin) veya sadece aktifler (public)
// ─────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
    try {
        const { status, type } = req.query;

        let query = 'SELECT * FROM announcements WHERE 1=1';
        const params = [];

        if (status) { query += ' AND status = ?'; params.push(status); }
        if (type)   { query += ' AND type = ?';   params.push(type); }

        query += ' ORDER BY created_at DESC';

        const announcements = db.prepare(query).all(...params);
        res.json({ success: true, announcements: announcements || [] });
    } catch (error) {
        console.error('❌ Announcements fetch error:', error);
        res.status(500).json({ success: false, message: 'Duyurular yüklenemedi', error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────
// POST / — Yeni duyuru ekle
// ─────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
    try {
        const { title, message, type, status, link_text, link_url } = req.body;

        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Başlık ve mesaj zorunludur' });
        }

        const result = db.prepare(`
            INSERT INTO announcements (title, message, type, status, link_text, link_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            title.trim(),
            message.trim(),
            type      || 'Information',
            status    || 'active',
            link_text || '',
            link_url  || ''
        );

        // Aktivite kaydı (events.js ile aynı pattern)
        try {
            db.prepare(`
                INSERT INTO activities (admin_name, action_type, action_description)
                VALUES ('Admin', 'create_announcement', ?)
            `).run(`"${title}" duyurusu oluşturuldu`);
        } catch (_) { /* activities tablosu yoksa sessizce geç */ }

        const newAnn = db.prepare('SELECT * FROM announcements WHERE id = ?').get(result.lastInsertRowid);
        res.json({ success: true, message: 'Duyuru oluşturuldu', announcement: newAnn });
    } catch (error) {
        console.error('❌ Announcement insert error:', error);
        res.status(500).json({ success: false, message: 'Duyuru eklenemedi', error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /:id — Duyuru güncelle
// ─────────────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
    try {
        const { title, message, type, status, link_text, link_url } = req.body;

        db.prepare(`
            UPDATE announcements
            SET title = ?, message = ?, type = ?, status = ?,
                link_text = ?, link_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            title.trim(), message.trim(),
            type || 'Information', status || 'active',
            link_text || '', link_url || '',
            req.params.id
        );

        try {
            db.prepare(`
                INSERT INTO activities (admin_name, action_type, action_description)
                VALUES ('Admin', 'update_announcement', ?)
            `).run(`"${title}" duyurusu güncellendi`);
        } catch (_) {}

        res.json({ success: true, message: 'Duyuru güncellendi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Güncellenemedi', error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────
// PATCH /:id — Sadece status güncelle (aktif/pasif toggle)
// ─────────────────────────────────────────────────────────────
router.patch('/:id', (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'passive'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Geçersiz durum' });
        }

        db.prepare(`
            UPDATE announcements SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(status, req.params.id);

        res.json({ success: true, message: 'Durum güncellendi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Durum güncellenemedi', error: error.message });
    }
});

// ─────────────────────────────────────────────────────────────
// DELETE /:id — Duyuru sil
// ─────────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
    try {
        const ann = db.prepare('SELECT title FROM announcements WHERE id = ?').get(req.params.id);
        db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);

        try {
            if (ann) {
                db.prepare(`
                    INSERT INTO activities (admin_name, action_type, action_description)
                    VALUES ('Admin', 'delete_announcement', ?)
                `).run(`"${ann.title}" duyurusu silindi`);
            }
        } catch (_) {}

        res.json({ success: true, message: 'Duyuru silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Silinemedi', error: error.message });
    }
});

module.exports = router;