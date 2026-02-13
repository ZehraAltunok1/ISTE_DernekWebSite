const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Veritabanı dosyası
const dbPath = path.join(__dirname, '../database/edusupport.db');
const db = new Database(dbPath);

console.log('📁 Database path:', dbPath);

// Tabloları oluştur
db.exec(`
    -- Yöneticiler (Admin kullanıcılar)
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

    -- Kayıtlı Kullanıcılar (Bağışçılar, Öğrenciler vb.)
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

    -- Öğrenci profil bilgileri
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

    -- Bağışçı profil bilgileri
    CREATE TABLE IF NOT EXISTS donor_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        donor_type TEXT CHECK(donor_type IN ('individual', 'corporate')),
        company_name TEXT,
        tax_number TEXT,
        total_donated REAL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Bağışlar
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

    -- Burs başvuruları
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
`);

// Test admin kullanıcısı
const checkAdmin = db.prepare('SELECT * FROM admins WHERE username = ?').get('admin');

if (!checkAdmin) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    
    db.prepare(`
        INSERT INTO admins (username, password_hash, email, full_name, role) 
        VALUES (?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, 'admin@edusupport.com', 'Admin User', 'admin');
    
    console.log('✅ Test admin oluşturuldu');
    console.log('   👤 Kullanıcı Adı: admin');
    console.log('   🔑 Şifre: admin123');
}

// Test normal kullanıcı
const checkUser = db.prepare('SELECT * FROM users WHERE email = ?').get('test@test.com');

if (!checkUser) {
    const hashedPassword = bcrypt.hashSync('test123', 10);
    
    const result = db.prepare(`
        INSERT INTO users (email, password_hash, first_name, last_name, user_type, email_verified) 
        VALUES (?, ?, ?, ?, ?, ?)
    `).run('test@test.com', hashedPassword, 'Test', 'Kullanıcı', 'donor', 1);
    
    // Bağışçı profili oluştur
    db.prepare(`
        INSERT INTO donor_profiles (user_id, donor_type) 
        VALUES (?, ?)
    `).run(result.lastInsertRowid, 'individual');
    
    console.log('✅ Test kullanıcı oluşturuldu');
    console.log('   📧 Email: test@test.com');
    console.log('   🔑 Şifre: test123');
}

console.log('✅ SQLite Database initialized');

module.exports = db;