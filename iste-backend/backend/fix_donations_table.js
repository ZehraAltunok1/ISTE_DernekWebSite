// Bu dosyayı backend/ klasöründe çalıştırın:
// node fix_donations_table.js

const db = require('./config/database');

// Eski tabloyu sil ve yeniden oluştur
db.exec(`DROP TABLE IF EXISTS donations;`);

db.exec(`
    CREATE TABLE donations (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        donor_name        TEXT    NOT NULL,
        donor_email       TEXT    NOT NULL,
        donor_phone       TEXT    DEFAULT '',
        amount            REAL    NOT NULL,
        category          TEXT    DEFAULT 'genel',
        payment_method    TEXT    DEFAULT 'iban',
        status            TEXT    DEFAULT 'pending',
        iyzico_payment_id TEXT,
        note              TEXT    DEFAULT '',
        created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

console.log('✅ donations tablosu yeniden oluşturuldu!');
console.log('Kolonlar:', db.prepare("PRAGMA table_info(donations)").all().map(c => c.name));