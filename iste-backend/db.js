const { Pool } = require('pg');

// PostgreSQL bağlantı ayarları
const pool = new Pool({
  user: 'postgres',          // PostgreSQL kullanıcı adı
  host: 'localhost',         // Genellikle localhost
  database: 'dernekdb',      // Oluşturduğun veritabanı adı
  password: 'sifre123',      // PostgreSQL şifren
  port: 5432,                // Default port
});

pool.connect()
  .then(() => console.log("PostgreSQL'e bağlandı"))
  .catch(err => console.error("Bağlantı hatası", err));

module.exports = pool;
