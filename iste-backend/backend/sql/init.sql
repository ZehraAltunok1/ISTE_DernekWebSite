-- Kullanıcılar Tablosu
CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('USER', 'ADMIN')) NOT NULL
);

-- Örnek Admin Hesabı
INSERT OR IGNORE INTO Users (name, email, password, role) 
VALUES ('Sistem Yöneticisi', 'admin@edusupport.com', 'admin123', 'ADMIN');