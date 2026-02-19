const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Database yolunu ayarlayın
const DB_PATH = path.join(__dirname, '../database.sqlite'); 

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Test kullanıcıları
const TEST_USERS = [
  {
    email: 'admin@test.com',
    password: '123456',
    first_name: 'Admin',
    last_name: 'Kullanıcı',
    type: 'admin',
    phone: '5551234560'
  },
  {
    email: 'donor@test.com',
    password: '123456',
    first_name: 'Ahmet',
    last_name: 'Yılmaz',
    type: 'donor',
    phone: '5551234561'
  },
  {
    email: 'student@test.com',
    password: '123456',
    first_name: 'Ayşe',
    last_name: 'Demir',
    type: 'student',
    phone: '5551234562'
  }
];

async function createAdmins() {
  console.log('\n🔧 Admin kullanıcıları oluşturuluyor...\n');

  for (const user of TEST_USERS) {
    try {
      // Email kontrolü
      const existing = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM users WHERE email = ?',
          [user.email],
          (err, row) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      });

      if (existing) {
        console.log(`⚠️  ${user.email} zaten mevcut, atlanıyor...`);
        continue;
      }

      // Şifreyi hash'le
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Kullanıcı ekle
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO users (email, password, first_name, last_name, type, phone, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [user.email, hashedPassword, user.first_name, user.last_name, user.type, user.phone],
          function(err) {
            if (err) reject(err);
            resolve(this.lastID);
          }
        );
      });

      console.log(`✅ ${user.type.toUpperCase()}: ${user.email} / ${user.password}`);

    } catch (error) {
      console.error(`❌ ${user.email} eklenemedi:`, error.message);
    }
  }

  console.log('\n🎉 İşlem tamamlandı!\n');
  console.log('📋 GİRİŞ BİLGİLERİ:');
  console.log('─────────────────────────────────────');
  TEST_USERS.forEach(user => {
    console.log(`${user.type.toUpperCase().padEnd(10)} : ${user.email} / ${user.password}`);
  });
  console.log('─────────────────────────────────────\n');

  db.close((err) => {
    if (err) {
      console.error('❌ Database close error:', err);
    }
    process.exit(0);
  });
}

// Script'i çalıştır
createAdmins().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});