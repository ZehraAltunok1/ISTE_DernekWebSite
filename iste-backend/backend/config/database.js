const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../database/edusupport.db');
const db = new Database(dbPath);

console.log('📁 Database path:', dbPath);

// ==========================================
// TABLO OLUŞTURMA
// ==========================================
db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        role TEXT CHECK(role IN ('admin', 'moderator', 'accountant', 'viewer')),
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
        user_type TEXT CHECK(user_type IN ('donor', 'student', 'volunteer')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        email_verified INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        student_no TEXT,
        university TEXT,
        department TEXT,
        grade_level INTEGER,
        gpa REAL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS donor_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        donor_type TEXT CHECK(donor_type IN ('individual', 'corporate')),
        company_name TEXT,
        tax_number TEXT,
        total_donated REAL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS scholarship_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        application_year INTEGER,
        semester TEXT,
        requested_amount REAL,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id)
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

// ==========================================
// ADMIN KULLANICI
// ==========================================
const checkAdmin = db.prepare('SELECT * FROM admins WHERE username = ?').get('admin');
if (!checkAdmin) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
        INSERT INTO admins (username, password_hash, email, full_name, role)
        VALUES (?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, 'admin@edusupport.com', 'Admin User', 'admin');
    console.log('✅ Admin oluşturuldu → admin / admin123');
}

// ==========================================
// SEED DATA - BAĞIŞÇILAR (15 kişi)
// ==========================================
const seedDonors = [
    { first_name: 'Ahmet',   last_name: 'Yılmaz',    email: 'ahmet.yilmaz@gmail.com',    phone: '05321234501', total_donated: 5000  },
    { first_name: 'Mehmet',  last_name: 'Kaya',       email: 'mehmet.kaya@hotmail.com',    phone: '05321234502', total_donated: 12000 },
    { first_name: 'Fatma',   last_name: 'Demir',      email: 'fatma.demir@gmail.com',      phone: '05321234503', total_donated: 3500  },
    { first_name: 'Ayşe',    last_name: 'Çelik',      email: 'ayse.celik@yahoo.com',       phone: '05321234504', total_donated: 8000  },
    { first_name: 'Ali',     last_name: 'Şahin',      email: 'ali.sahin@gmail.com',        phone: '05321234505', total_donated: 15000 },
    { first_name: 'Zeynep',  last_name: 'Arslan',     email: 'zeynep.arslan@gmail.com',    phone: '05321234506', total_donated: 2500  },
    { first_name: 'Mustafa', last_name: 'Doğan',      email: 'mustafa.dogan@hotmail.com',  phone: '05321234507', total_donated: 6000  },
    { first_name: 'Elif',    last_name: 'Yıldız',     email: 'elif.yildiz@gmail.com',      phone: '05321234508', total_donated: 9500  },
    { first_name: 'İbrahim', last_name: 'Kılıç',      email: 'ibrahim.kilic@gmail.com',    phone: '05321234509', total_donated: 4200  },
    { first_name: 'Hatice',  last_name: 'Özdemir',    email: 'hatice.ozdemir@yahoo.com',   phone: '05321234510', total_donated: 7800  },
    { first_name: 'Hüseyin', last_name: 'Aydın',      email: 'huseyin.aydin@gmail.com',    phone: '05321234511', total_donated: 11000 },
    { first_name: 'Merve',   last_name: 'Erdoğan',    email: 'merve.erdogan@gmail.com',    phone: '05321234512', total_donated: 3000  },
    { first_name: 'Emre',    last_name: 'Koç',        email: 'emre.koc@hotmail.com',       phone: '05321234513', total_donated: 5500  },
    { first_name: 'Selin',   last_name: 'Keskin',     email: 'selin.keskin@gmail.com',     phone: '05321234514', total_donated: 18000 },
    { first_name: 'Burak',   last_name: 'Polat',      email: 'burak.polat@gmail.com',      phone: '05321234515', total_donated: 4700  },
];

const defaultPass = bcrypt.hashSync('Pass1234!', 10);

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

        // Aktivite kaydet
        db.prepare(`
            INSERT INTO activities (admin_name, action_type, action_description, related_user_id)
            VALUES ('Sistem', 'create_donor', ?, ?)
        `).run(`${donor.first_name} ${donor.last_name} bağışçı olarak eklendi`, result.lastInsertRowid);
    }
}
console.log('✅ Bağışçı seed data hazır (15 kayıt)');

// ==========================================
// SEED DATA - ÖĞRENCİLER (10 kişi)
// ==========================================
const seedStudents = [
    { first_name: 'Berk',    last_name: 'Güneş',     email: 'berk.gunes@iste.edu.tr',     phone: '05401234501', university: 'İskenderun Teknik Üniversitesi', department: 'Bilgisayar Mühendisliği', grade_level: 2, gpa: 3.45 },
    { first_name: 'Cansu',   last_name: 'Ateş',      email: 'cansu.ates@iste.edu.tr',     phone: '05401234502', university: 'İskenderun Teknik Üniversitesi', department: 'Elektrik-Elektronik Mühendisliği', grade_level: 3, gpa: 3.20 },
    { first_name: 'Deniz',   last_name: 'Kara',      email: 'deniz.kara@iste.edu.tr',     phone: '05401234503', university: 'İskenderun Teknik Üniversitesi', department: 'Makine Mühendisliği', grade_level: 1, gpa: 3.70 },
    { first_name: 'Ece',     last_name: 'Bulut',     email: 'ece.bulut@iste.edu.tr',      phone: '05401234504', university: 'İskenderun Teknik Üniversitesi', department: 'İnşaat Mühendisliği', grade_level: 4, gpa: 3.10 },
    { first_name: 'Furkan',  last_name: 'Tan',       email: 'furkan.tan@iste.edu.tr',     phone: '05401234505', university: 'İskenderun Teknik Üniversitesi', department: 'Endüstri Mühendisliği', grade_level: 2, gpa: 2.95 },
    { first_name: 'Gizem',   last_name: 'Aktaş',     email: 'gizem.aktas@iste.edu.tr',    phone: '05401234506', university: 'İskenderun Teknik Üniversitesi', department: 'Kimya Mühendisliği', grade_level: 3, gpa: 3.55 },
    { first_name: 'Hakan',   last_name: 'Yurt',      email: 'hakan.yurt@iste.edu.tr',     phone: '05401234507', university: 'İskenderun Teknik Üniversitesi', department: 'Fizik', grade_level: 1, gpa: 3.80 },
    { first_name: 'İrem',    last_name: 'Sarı',      email: 'irem.sari@iste.edu.tr',      phone: '05401234508', university: 'İskenderun Teknik Üniversitesi', department: 'Matematik', grade_level: 4, gpa: 3.25 },
    { first_name: 'Kaan',    last_name: 'Çiftçi',    email: 'kaan.ciftci@iste.edu.tr',    phone: '05401234509', university: 'İskenderun Teknik Üniversitesi', department: 'Bilgisayar Mühendisliği', grade_level: 3, gpa: 3.60 },
    { first_name: 'Lara',    last_name: 'Yıldırım',  email: 'lara.yildirim@iste.edu.tr',  phone: '05401234510', university: 'İskenderun Teknik Üniversitesi', department: 'Biyomedikal Mühendisliği', grade_level: 2, gpa: 3.90 },
];

for (const student of seedStudents) {
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(student.email);
    if (!exists) {
        const result = db.prepare(`
            INSERT INTO users (email, password_hash, first_name, last_name, phone, user_type, email_verified)
            VALUES (?, ?, ?, ?, ?, 'student', 1)
        `).run(student.email, defaultPass, student.first_name, student.last_name, student.phone);

        db.prepare(`
            INSERT INTO student_profiles (user_id, university, department, grade_level, gpa)
            VALUES (?, ?, ?, ?, ?)
        `).run(result.lastInsertRowid, student.university, student.department, student.grade_level, student.gpa);

        // Aktivite kaydet
        db.prepare(`
            INSERT INTO activities (admin_name, action_type, action_description, related_user_id)
            VALUES ('Sistem', 'create_student', ?, ?)
        `).run(`${student.first_name} ${student.last_name} burslu öğrenci olarak eklendi`, result.lastInsertRowid);
    }
}
console.log('✅ Öğrenci seed data hazır (10 kayıt)');

console.log('✅ SQLite Database initialized');

module.exports = db;