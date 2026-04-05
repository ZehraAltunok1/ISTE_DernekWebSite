const express  = require('express');
const router   = express.Router();
const Event    = require('../models/event');
const Activity = require('../models/activity');

// Seed data
async function seedEvents() {
    const count = await Event.countDocuments();
    if (count > 0) return;
    await Event.insertMany([
        { title: 'Yıllık Olağan Genel Kurul', description: 'Derneğimizin yıllık olağan genel kurul toplantısı.', event_date: '2026-03-15', event_time: '14:00', end_time: '17:00', location: 'İskenderun Kültür Merkezi', category: 'toplanti', capacity: 200, registered_count: 87, status: 'planned' },
        { title: 'Kariyer Günü Semineri', description: 'Burslu öğrencilerimiz için kariyer semineri.', event_date: '2026-03-22', event_time: '09:00', end_time: '17:00', location: 'İskenderun Teknik Üniversitesi', category: 'egitim', capacity: 100, registered_count: 45, status: 'planned' },
        { title: 'Bahar Yardım Kampanyası', description: 'İhtiyaç sahibi öğrenciler için bağış kampanyası.', event_date: '2026-04-05', event_time: '11:00', end_time: '19:00', location: 'İskenderun Merkez Meydan', category: 'bagis', capacity: 500, registered_count: 23, status: 'planned' },
        { title: 'Mezun Öğrenciler Buluşması', description: 'Mezun öğrencilerimizle yıllık buluşma.', event_date: '2026-02-10', event_time: '18:00', end_time: '22:00', location: 'Deniz Restaurant', category: 'sosyal', capacity: 80, registered_count: 80, status: 'completed' },
    ]);
    console.log('✅ Etkinlik seed data hazır');
}
seedEvents();

// GET /api/events
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.status)   filter.status   = req.query.status;
        if (req.query.category) filter.category = req.query.category;
        if (req.query.month)    filter.event_date = new RegExp(`-${req.query.month.padStart(2,'0')}-`);
        if (req.query.year)     filter.event_date = new RegExp(`^${req.query.year}`);

        const events = await Event.find(filter).sort({ event_date: 1 });
        res.json({ success: true, events });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Etkinlikler yüklenemedi', error: error.message });
    }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Etkinlik bulunamadı' });
        res.json({ success: true, event, participants: event.participants });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Etkinlik yüklenemedi', error: error.message });
    }
});

// POST /api/events
router.post('/', async (req, res) => {
    try {
        const { title, description, event_date, event_time, end_date, end_time, location, category, capacity } = req.body;
        if (!title || !event_date)
            return res.status(400).json({ success: false, message: 'Başlık ve tarih zorunludur' });

        const event = await Event.create({ title, description, event_date, event_time, end_date, end_time, location, category, capacity });
        try { await Activity.create({ action_type: 'create_event', action_description: `"${title}" etkinliği oluşturuldu` }); } catch (_) {}
        res.json({ success: true, message: 'Etkinlik oluşturuldu', event });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Etkinlik eklenemedi', error: error.message });
    }
});

// PUT /api/events/:id
router.put('/:id', async (req, res) => {
    try {
        const { title, description, event_date, event_time, end_date, end_time, location, category, capacity, status } = req.body;
        await Event.findByIdAndUpdate(req.params.id, { title, description, event_date, event_time, end_date, end_time, location, category, capacity, status });
        try { await Activity.create({ action_type: 'update_event', action_description: `"${title}" etkinliği güncellendi` }); } catch (_) {}
        res.json({ success: true, message: 'Etkinlik güncellendi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Güncellenemedi', error: error.message });
    }
});

// DELETE /api/events/:id
router.delete('/:id', async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        try { if (event) await Activity.create({ action_type: 'delete_event', action_description: `"${event.title}" etkinliği silindi` }); } catch (_) {}
        res.json({ success: true, message: 'Etkinlik silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Silinemedi', error: error.message });
    }
});

// GET /api/events/:id/participants
router.get('/:id/participants', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Etkinlik bulunamadı' });
        res.json({ success: true, participants: event.participants });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Katılımcılar yüklenemedi' });
    }
});

// POST /api/events/:id/participants
router.post('/:id/participants', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Etkinlik bulunamadı' });
        if (event.capacity > 0 && event.registered_count >= event.capacity)
            return res.status(400).json({ success: false, message: 'Etkinlik kapasitesi dolu!' });

        const { user_id, user_name, user_email, user_type } = req.body;
        if (user_id && event.participants.some(p => String(p.user_id) === String(user_id)))
            return res.status(400).json({ success: false, message: 'Bu kişi zaten kayıtlı!' });

        event.participants.push({ user_id: user_id || null, user_name, user_email, user_type });
        event.registered_count += 1;
        await event.save();
        res.json({ success: true, message: 'Katılımcı eklendi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Katılımcı eklenemedi', error: error.message });
    }
});

module.exports = router;