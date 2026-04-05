// scripts/seed.js — MongoDB'ye admin ve örnek verileri ekler
// Çalıştırmak için: node scripts/seed.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/user');
const Admin    = require('../models/admin');
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlandı');

    const defaultPass = await bcrypt.hash('Pass1234!', 10);

    // ── Admin ──────────────────────────────────────────────────────
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
        await Admin.create({
            username:      'admin',
            email:         'admin@edusupport.com',
            password_hash: await bcrypt.hash('admin123', 10),
            full_name:     'Admin User',
            role:          'admin'
        });
        console.log('✅ Admin → admin@edusupport.com / admin123');
    } else {
        console.log('⚠️  Admin zaten mevcut');
    }

    // ── Bağışçılar ─────────────────────────────────────────────────
    const donors = [
        { first_name: 'Ahmet',   last_name: 'Yılmaz',  email: 'ahmet.yilmaz@gmail.com',   phone: '05321234501', total_donated: 5000  },
        { first_name: 'Mehmet',  last_name: 'Kaya',    email: 'mehmet.kaya@hotmail.com',   phone: '05321234502', total_donated: 12000 },
        { first_name: 'Fatma',   last_name: 'Demir',   email: 'fatma.demir@gmail.com',     phone: '05321234503', total_donated: 3500  },
        { first_name: 'Ayşe',    last_name: 'Çelik',   email: 'ayse.celik@yahoo.com',      phone: '05321234504', total_donated: 8000  },
        { first_name: 'Ali',     last_name: 'Şahin',   email: 'ali.sahin@gmail.com',       phone: '05321234505', total_donated: 15000 },
    ];

    for (const d of donors) {
        const exists = await User.findOne({ email: d.email });
        if (!exists) {
            await User.create({
                email: d.email, password_hash: defaultPass,
                first_name: d.first_name, last_name: d.last_name, phone: d.phone,
                user_type: 'donor',
                donor_profile: { donor_type: 'individual', total_donated: d.total_donated }
            });
            console.log(`✅ Bağışçı: ${d.email}`);
        }
    }

    // ── Gönüllüler ─────────────────────────────────────────────────
    const volunteers = [
        { first_name: 'Berk',  last_name: 'Güneş', email: 'berk.gunes@gmail.com',  phone: '05401234501', area: 'Eğitim',   total_donated: 0 },
        { first_name: 'Cansu', last_name: 'Ateş',  email: 'cansu.ates@gmail.com',  phone: '05401234502', area: 'Etkinlik', total_donated: 0 },
    ];

    for (const v of volunteers) {
        const exists = await User.findOne({ email: v.email });
        if (!exists) {
            await User.create({
                email: v.email, password_hash: defaultPass,
                first_name: v.first_name, last_name: v.last_name, phone: v.phone,
                user_type: 'volunteer'
            });
            console.log(`✅ Gönüllü: ${v.email}`);
        }
    }

    console.log('\n📋 GİRİŞ BİLGİLERİ:');
    console.log('─────────────────────────────────────────────────');
    console.log('ADMIN    : admin@edusupport.com / admin123');
    console.log('BAĞIŞÇI  : ahmet.yilmaz@gmail.com / Pass1234!');
    console.log('GÖNÜLLÜ  : berk.gunes@gmail.com / Pass1234!');
    console.log('─────────────────────────────────────────────────');

    await mongoose.disconnect();
    console.log('✅ Seed tamamlandı!');
}

seed().catch(err => { console.error(err); process.exit(1); });