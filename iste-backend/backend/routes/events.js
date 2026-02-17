// ==========================================
// routes/events.js - Etkinlik Yönetimi
// ==========================================

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==========================================
// TABLO OLUŞTURMA (ilk çalışmada)
// ==========================================
db.exec(`
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        event_date TEXT NOT NULL,
        event_time TEXT,
        end_date TEXT,
        end_time TEXT,
        location TEXT,
        category TEXT CHECK(category IN ('toplanti', 'egitim', 'sosyal', 'bagis', 'diger')) DEFAULT 'diger',
        capacity INTEGER DEFAULT 0,
        registered_count INTEGER DEFAULT 0,
        status TEXT CHECK(status IN ('planned', 'active', 'completed', 'cancelled')) DEFAULT 'planned',
        created_by TEXT DEFAULT 'Admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS event_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        user_id INTEGER,
        user_name TEXT,
        user_email TEXT,
        user_type TEXT,
        registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        attendance_status TEXT CHECK(attendance_status IN ('registered', 'attended', 'absent')) DEFAULT 'registered',
        FOREIGN KEY (event_id) REFERENCES events(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

// Seed data — başlangıç etkinlikleri
const checkEvents = db.prepare('SELECT COUNT(*) as count FROM events').get();
if (checkEvents.count === 0) {
    const seedEvents = [
        {
            title: 'Yıllık Olağan Genel Kurul',
            description: 'Derneğimizin yıllık olağan genel kurul toplantısı. Tüm üyelerin katılımı beklenmektedir.',
            event_date: '2026-03-15',
            event_time: '14:00',
            end_date: '2026-03-15',
            end_time: '17:00',
            location: 'İskenderun Kültür Merkezi - Büyük Salon',
            category: 'toplanti',
            capacity: 200,
            registered_count: 87,
            status: 'planned'
        },
        {
            title: 'Burs Başvuru Değerlendirme Toplantısı',
            description: '2026 yılı burs başvurularının değerlendirilmesi için yönetim kurulu toplantısı.',
            event_date: '2026-02-25',
            event_time: '10:00',
            end_date: '2026-02-25',
            end_time: '12:00',
            location: 'Dernek Genel Merkezi - Toplantı Odası',
            category: 'toplanti',
            capacity: 20,
            registered_count: 12,
            status: 'planned'
        },
        {
            title: 'Kariyer Günü Semineri',
            description: 'Burslu öğrencilerimiz için kariyer planlama ve iş hayatına giriş semineri.',
            event_date: '2026-03-22',
            event_time: '09:00',
            end_date: '2026-03-22',
            end_time: '17:00',
            location: 'İskenderun Teknik Üniversitesi - Konferans Salonu',
            category: 'egitim',
            capacity: 100,
            registered_count: 45,
            status: 'planned'
        },
        {
            title: 'Bahar Yardım Kampanyası',
            description: 'İhtiyaç sahibi öğrenciler için bağış toplama kampanyası başlangıç etkinliği.',
            event_date: '2026-04-05',
            event_time: '11:00',
            end_date: '2026-04-05',
            end_time: '19:00',
            location: 'İskenderun Merkez Meydan',
            category: 'bagis',
            capacity: 500,
            registered_count: 23,
            status: 'planned'
        },
        {
            title: 'Mezun Öğrenciler Buluşması',
            description: 'Derneğimizin desteğiyle hayatlarını kuran mezun öğrencilerimizle yıllık buluşma.',
            event_date: '2026-02-10',
            event_time: '18:00',
            end_date: '2026-02-10',
            end_time: '22:00',
            location: 'Deniz Restaurant - İskenderun',
            category: 'sosyal',
            capacity: 80,
            registered_count: 80,
            status: 'completed'
        },
        {
            title: 'Bağışçı Takdir Gecesi',
            description: 'Yıl boyunca destek veren değerli bağışçılarımıza teşekkür etkinliği.',
            event_date: '2026-05-20',
            event_time: '19:00',
            end_date: '2026-05-20',
            end_time: '23:00',
            location: 'Grand Hotel İskenderun - Balo Salonu',
            category: 'sosyal',
            capacity: 150,
            registered_count: 0,
            status: 'planned'
        }
    ];

    const insertEvent = db.prepare(`
        INSERT INTO events (title, description, event_date, event_time, end_date, end_time, location, category, capacity, registered_count, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const e of seedEvents) {
        insertEvent.run(e.title, e.description, e.event_date, e.event_time, e.end_date, e.end_time, e.location, e.category, e.capacity, e.registered_count, e.status);
    }
    console.log('✅ Etkinlik seed data hazır (6 kayıt)');
}

// ==========================================
// GET /api/events — Tüm etkinlikleri getir
// ==========================================
router.get('/', (req, res) => {
    try {
        const { status, category, month, year } = req.query;

        let query = 'SELECT * FROM events WHERE 1=1';
        const params = [];

        if (status)   { query += ' AND status = ?';   params.push(status); }
        if (category) { query += ' AND category = ?'; params.push(category); }
        if (month)    { query += ' AND strftime("%m", event_date) = ?'; params.push(month.padStart(2, '0')); }
        if (year)     { query += ' AND strftime("%Y", event_date) = ?'; params.push(year); }

        query += ' ORDER BY event_date ASC';

        const events = db.prepare(query).all(...params);

        res.json({ success: true, events: events || [] });
    } catch (error) {
        console.error('❌ Events fetch error:', error);
        res.status(500).json({ success: false, message: 'Etkinlikler yüklenemedi', error: error.message });
    }
});

// ==========================================
// GET /api/events/:id — Tek etkinlik
// ==========================================
router.get('/:id', (req, res) => {
    try {
        const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Etkinlik bulunamadı' });

        const participants = db.prepare(`
            SELECT * FROM event_participants WHERE event_id = ? ORDER BY registered_at DESC
        `).all(req.params.id);

        res.json({ success: true, event, participants });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Etkinlik yüklenemedi', error: error.message });
    }
});

// ==========================================
// POST /api/events — Yeni etkinlik ekle
// ==========================================
router.post('/', (req, res) => {
    try {
        const { title, description, event_date, event_time, end_date, end_time, location, category, capacity } = req.body;

        if (!title || !event_date) {
            return res.status(400).json({ success: false, message: 'Başlık ve tarih zorunludur' });
        }

        const result = db.prepare(`
            INSERT INTO events (title, description, event_date, event_time, end_date, end_time, location, category, capacity, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned')
        `).run(title, description || '', event_date, event_time || '', end_date || event_date, end_time || '', location || '', category || 'diger', capacity || 0);

        // Aktivite kaydı
        db.prepare(`
            INSERT INTO activities (admin_name, action_type, action_description)
            VALUES ('Admin', 'create_event', ?)
        `).run(`"${title}" etkinliği oluşturuldu`);

        const newEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);

        res.json({ success: true, message: 'Etkinlik oluşturuldu', event: newEvent });
    } catch (error) {
        console.error('❌ Event insert error:', error);
        res.status(500).json({ success: false, message: 'Etkinlik eklenemedi', error: error.message });
    }
});

// ==========================================
// PUT /api/events/:id — Etkinlik güncelle
// ==========================================
router.put('/:id', (req, res) => {
    try {
        const { title, description, event_date, event_time, end_date, end_time, location, category, capacity, status } = req.body;

        db.prepare(`
            UPDATE events SET
                title = ?, description = ?, event_date = ?, event_time = ?,
                end_date = ?, end_time = ?, location = ?, category = ?,
                capacity = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(title, description, event_date, event_time, end_date, end_time, location, category, capacity, status, req.params.id);

        db.prepare(`
            INSERT INTO activities (admin_name, action_type, action_description)
            VALUES ('Admin', 'update_event', ?)
        `).run(`"${title}" etkinliği güncellendi`);

        res.json({ success: true, message: 'Etkinlik güncellendi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Güncellenemedi', error: error.message });
    }
});

// ==========================================
// DELETE /api/events/:id — Etkinlik sil
// ==========================================
router.delete('/:id', (req, res) => {
    try {
        const event = db.prepare('SELECT title FROM events WHERE id = ?').get(req.params.id);
        db.prepare('DELETE FROM event_participants WHERE event_id = ?').run(req.params.id);
        db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);

        if (event) {
            db.prepare(`
                INSERT INTO activities (admin_name, action_type, action_description)
                VALUES ('Admin', 'delete_event', ?)
            `).run(`"${event.title}" etkinliği silindi`);
        }

        res.json({ success: true, message: 'Etkinlik silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Silinemedi', error: error.message });
    }
});

// ==========================================
// GET /api/events/:id/participants — Katılımcılar
// ==========================================
router.get('/:id/participants', (req, res) => {
    try {
        const participants = db.prepare(`
            SELECT ep.*, u.first_name, u.last_name, u.email, u.user_type
            FROM event_participants ep
            LEFT JOIN users u ON ep.user_id = u.id
            WHERE ep.event_id = ?
            ORDER BY ep.registered_at DESC
        `).all(req.params.id);

        res.json({ success: true, participants });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Katılımcılar yüklenemedi' });
    }
});

// ==========================================
// POST /api/events/:id/participants — Katılımcı ekle
// ==========================================
router.post('/:id/participants', (req, res) => {
    try {
        const { user_id, user_name, user_email, user_type } = req.body;
        const eventId = req.params.id;

        const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
        if (!event) return res.status(404).json({ success: false, message: 'Etkinlik bulunamadı' });

        if (event.capacity > 0 && event.registered_count >= event.capacity) {
            return res.status(400).json({ success: false, message: 'Etkinlik kapasitesi dolu!' });
        }

        // Zaten kayıtlı mı?
        if (user_id) {
            const existing = db.prepare('SELECT id FROM event_participants WHERE event_id = ? AND user_id = ?').get(eventId, user_id);
            if (existing) return res.status(400).json({ success: false, message: 'Bu kişi zaten kayıtlı!' });
        }

        db.prepare(`
            INSERT INTO event_participants (event_id, user_id, user_name, user_email, user_type)
            VALUES (?, ?, ?, ?, ?)
        `).run(eventId, user_id || null, user_name || '', user_email || '', user_type || 'guest');

        db.prepare('UPDATE events SET registered_count = registered_count + 1 WHERE id = ?').run(eventId);

        res.json({ success: true, message: 'Katılımcı eklendi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Katılımcı eklenemedi', error: error.message });
    }
});

module.exports = router;