const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../database/edusupport.db');
const db = new Database(dbPath);

console.log('📁 Database path:', dbPath);

// ════════════════════════════════════════
// TABLO OLUŞTURMA
// ════════════════════════════════════════
db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        role TEXT CHECK(role IN ('admin', 'moderator', 'accountant', 'viewer')) DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        avatar_url TEXT,
        user_type TEXT CHECK(user_type IN ('donor', 'volunteer')) DEFAULT 'donor',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        email_verified INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS donor_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        donor_type TEXT CHECK(donor_type IN ('individual', 'corporate')) DEFAULT 'individual',
        company_name TEXT,
        tax_number TEXT,
        total_donated REAL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS volunteer_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        area TEXT,
        reason TEXT,
        status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        donor_id INTEGER,
        amount REAL NOT NULL,
        donation_type TEXT,
        payment_method TEXT,
        donation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'completed',
        FOREIGN KEY (donor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_name TEXT,
        action_type TEXT,
        action_description TEXT,
        related_user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// ════════════════════════════════════════
// MİGRATION — mevcut tabloya avatar_url ekle
// ════════════════════════════════════════
try {
    const cols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
    if (!cols.includes('avatar_url')) {
        db.prepare("ALTER TABLE users ADD COLUMN avatar_url TEXT").run();
        console.log(' Migration: users.avatar_url kolonu eklendi');
    }
} catch (e) {
    console.warn('⚠️  Migration uyarısı (avatar_url):', e.message);
}

// admins tablosuna da avatar_url ekle (opsiyonel)
try {
    const cols = db.prepare("PRAGMA table_info(admins)").all().map(c => c.name);
    if (!cols.includes('avatar_url')) {
        db.prepare("ALTER TABLE admins ADD COLUMN avatar_url TEXT").run();
        console.log(' Migration: admins.avatar_url kolonu eklendi');
    }
} catch (e) {}

// ════════════════════════════════════════
// ADMIN KULLANICI
// ════════════════════════════════════════
const checkAdmin = db.prepare('SELECT * FROM admins WHERE username = ?').get('admin');
if (!checkAdmin) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
        INSERT INTO admins (username, password_hash, email, full_name, role)
        VALUES (?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, 'admin@edusupport.com', 'Admin User', 'admin');
    console.log(' Admin oluşturuldu → admin@edusupport.com / admin123');
}

// ════════════════════════════════════════
// BAĞIŞÇILAR — Örnek veri (15 kişi)
// ════════════════════════════════════════
const defaultPass = bcrypt.hashSync('Pass1234!', 10);

const seedDonors = [
    { first_name: 'Ahmet',   last_name: 'Yılmaz',   email: 'ahmet.yilmaz@gmail.com',   phone: '05321234501', total_donated: 5000  },
    { first_name: 'Mehmet',  last_name: 'Kaya',      email: 'mehmet.kaya@hotmail.com',   phone: '05321234502', total_donated: 12000 },
    { first_name: 'Fatma',   last_name: 'Demir',     email: 'fatma.demir@gmail.com',     phone: '05321234503', total_donated: 3500  },
    { first_name: 'Ayşe',    last_name: 'Çelik',     email: 'ayse.celik@yahoo.com',      phone: '05321234504', total_donated: 8000  },
    { first_name: 'Ali',     last_name: 'Şahin',     email: 'ali.sahin@gmail.com',       phone: '05321234505', total_donated: 15000 },
    { first_name: 'Zeynep',  last_name: 'Arslan',    email: 'zeynep.arslan@gmail.com',   phone: '05321234506', total_donated: 2500  },
    { first_name: 'Mustafa', last_name: 'Doğan',     email: 'mustafa.dogan@hotmail.com', phone: '05321234507', total_donated: 6000  },
    { first_name: 'Elif',    last_name: 'Yıldız',    email: 'elif.yildiz@gmail.com',     phone: '05321234508', total_donated: 9500  },
    { first_name: 'İbrahim', last_name: 'Kılıç',     email: 'ibrahim.kilic@gmail.com',   phone: '05321234509', total_donated: 4200  },
    { first_name: 'Hatice',  last_name: 'Özdemir',   email: 'hatice.ozdemir@yahoo.com',  phone: '05321234510', total_donated: 7800  },
    { first_name: 'Hüseyin', last_name: 'Aydın',     email: 'huseyin.aydin@gmail.com',   phone: '05321234511', total_donated: 11000 },
    { first_name: 'Merve',   last_name: 'Erdoğan',   email: 'merve.erdogan@gmail.com',   phone: '05321234512', total_donated: 3000  },
    { first_name: 'Emre',    last_name: 'Koç',       email: 'emre.koc@hotmail.com',      phone: '05321234513', total_donated: 5500  },
    { first_name: 'Selin',   last_name: 'Keskin',    email: 'selin.keskin@gmail.com',    phone: '05321234514', total_donated: 18000 },
    { first_name: 'Burak',   last_name: 'Polat',     email: 'burak.polat@gmail.com',     phone: '05321234515', total_donated: 4700  },
];

for (const donor of seedDonors) {
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(donor.email);
    if (!exists) {
        const result = db.prepare(`
            INSERT INTO users (email, password_hash, first_name, last_name, phone, user_type, email_verified)
            VALUES (?, ?, ?, ?, ?, 'donor', 1)
        `).run(donor.email, defaultPass, donor.first_name, donor.last_name, donor.phone);

        db.prepare(`
            INSERT INTO donor_profiles (user_id, donor_type, total_donated)
            VALUES (?, 'individual', ?)
        `).run(result.lastInsertRowid, donor.total_donated);

        db.prepare(`
            INSERT INTO activities (admin_name, action_type, action_description, related_user_id)
            VALUES ('Sistem', 'create_donor', ?, ?)
        `).run(`${donor.first_name} ${donor.last_name} bağışçı olarak eklendi`, result.lastInsertRowid);
    }
}
console.log(' Bağışçı seed data hazır (15 kayıt)');

// ════════════════════════════════════════
// GÖNÜLLÜLER — Örnek veri (5 kişi)
// ════════════════════════════════════════
const seedVolunteers = [
    { first_name: 'Berk',   last_name: 'Güneş',  email: 'berk.gunes@gmail.com',   phone: '05401234501', area: 'Eğitim',    reason: 'Eğitime destek olmak istiyorum.'                        },
    { first_name: 'Cansu',  last_name: 'Ateş',   email: 'cansu.ates@gmail.com',   phone: '05401234502', area: 'Etkinlik',  reason: 'Etkinlik organizasyonlarında yer almak istiyorum.'       },
    { first_name: 'Deniz',  last_name: 'Kara',   email: 'deniz.kara@gmail.com',   phone: '05401234503', area: 'İletişim', reason: 'Sosyal medya ve iletişimde destek verebilirim.'          },
    { first_name: 'Ece',    last_name: 'Bulut',  email: 'ece.bulut@gmail.com',    phone: '05401234504', area: 'Teknik',    reason: 'Teknik konularda destek olmak istiyorum.'               },
    { first_name: 'Furkan', last_name: 'Tan',    email: 'furkan.tan@gmail.com',   phone: '05401234505', area: 'Bağış',    reason: 'Bağış kampanyalarında aktif rol almak istiyorum.'        },
];

for (const vol of seedVolunteers) {
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(vol.email);
    if (!exists) {
        const result = db.prepare(`
            INSERT INTO users (email, password_hash, first_name, last_name, phone, user_type, email_verified)
            VALUES (?, ?, ?, ?, ?, 'volunteer', 1)
        `).run(vol.email, defaultPass, vol.first_name, vol.last_name, vol.phone);

        db.prepare(`
            INSERT INTO volunteer_profiles (user_id, area, reason, status)
            VALUES (?, ?, ?, 'approved')
        `).run(result.lastInsertRowid, vol.area, vol.reason);

        db.prepare(`
            INSERT INTO activities (admin_name, action_type, action_description, related_user_id)
            VALUES ('Sistem', 'create_volunteer', ?, ?)
        `).run(`${vol.first_name} ${vol.last_name} gönüllü olarak eklendi`, result.lastInsertRowid);
    }
}
console.log('Gönüllü seed data hazır (5 kayıt)');

console.log(' SQLite Database initialized');
console.log('');
console.log('📋 GİRİŞ BİLGİLERİ:');
console.log('─────────────────────────────────────────────────');
console.log('ADMIN     : admin@edusupport.com / admin123');
console.log('BAĞIŞÇI   : ahmet.yilmaz@gmail.com / Pass1234!');
console.log('GÖNÜLLÜ   : berk.gunes@gmail.com / Pass1234!');
console.log('─────────────────────────────────────────────────');

module.exports = db;