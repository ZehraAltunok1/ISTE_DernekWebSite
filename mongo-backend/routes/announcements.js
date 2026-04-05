const express      = require('express');
const router       = express.Router();
const Announcement = require('../models/announcement');
const Activity     = require('../models/activity');

// Seed data — ilk çalışmada ekle
async function seedAnnouncements() {
    const count = await Announcement.countDocuments();
    if (count > 0) return;

    await Announcement.insertMany([
        { title: '2026 Bahar Dönemi Burs Başvuruları Başladı!', message: 'Başvuru formu 30 Nisan 2026\'ya kadar açık olacaktır.', type: 'Information', status: 'active', link_text: 'Başvuru Yap', link_url: '#scholarshipsSection' },
        { title: 'Online Seminer: Burs Başvuru Süreçleri - 20 Şubat 2026', message: 'Zoom üzerinden gerçekleşecek ücretsiz seminere kayıt olabilirsiniz.', type: 'Success', status: 'active', link_text: 'Katıl', link_url: '#' },
        { title: 'Yeni Teknoloji Bursu Programı Açıldı!', message: 'Yazılım ve donanım alanında eğitim alan öğrencilere özel destek programı.', type: 'Warning', status: 'active', link_text: 'Detaylı Bilgi', link_url: '#scholarshipsSection' }
    ]);
    console.log('✅ Duyuru seed data hazır');
}
seedAnnouncements();

// ── GET /api/announcements ───────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.type)   filter.type   = req.query.type;

        const announcements = await Announcement.find(filter).sort({ created_at: -1 });
        res.json({ success: true, announcements });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Duyurular yüklenemedi', error: error.message });
    }
});

// ── POST /api/announcements ──────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const { title, message, type, status, link_text, link_url } = req.body;
        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Başlık ve mesaj zorunludur' });
        }

        const ann = await Announcement.create({
            title: title.trim(), message: message.trim(),
            type: type || 'Information', status: status || 'active',
            link_text: link_text || '', link_url: link_url || ''
        });

        try { await Activity.create({ action_type: 'create_announcement', action_description: `"${title}" duyurusu oluşturuldu` }); } catch (_) {}

        res.json({ success: true, message: 'Duyuru oluşturuldu', announcement: ann });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Duyuru eklenemedi', error: error.message });
    }
});

// ── PUT /api/announcements/:id ───────────────────────────────────
router.put('/:id', async (req, res) => {
    try {
        const { title, message, type, status, link_text, link_url } = req.body;
        await Announcement.findByIdAndUpdate(req.params.id, {
            title: title.trim(), message: message.trim(),
            type: type || 'Information', status: status || 'active',
            link_text: link_text || '', link_url: link_url || ''
        });
        try { await Activity.create({ action_type: 'update_announcement', action_description: `"${title}" duyurusu güncellendi` }); } catch (_) {}
        res.json({ success: true, message: 'Duyuru güncellendi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Güncellenemedi', error: error.message });
    }
});

// ── PATCH /api/announcements/:id — sadece status ─────────────────
router.patch('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'passive'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Geçersiz durum' });
        }
        await Announcement.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true, message: 'Durum güncellendi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Durum güncellenemedi', error: error.message });
    }
});

// ── DELETE /api/announcements/:id ───────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const ann = await Announcement.findByIdAndDelete(req.params.id);
        try { if (ann) await Activity.create({ action_type: 'delete_announcement', action_description: `"${ann.title}" duyurusu silindi` }); } catch (_) {}
        res.json({ success: true, message: 'Duyuru silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Silinemedi', error: error.message });
    }
});

module.exports = router;