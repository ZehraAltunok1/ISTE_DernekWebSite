const express = require('express');
const router  = express.Router();
const db      = require('../config/database');
const Iyzipay = require('iyzipay'); // npm install iyzipay

// ─── iyzico Sandbox Konfigürasyonu
const iyzipay = new Iyzipay({
    apiKey:    'sandbox-l3vOTPDF6LV064cuk0sh0ohKGThR5wDA',      // sandbox.iyzipay.com
    secretKey: 'sandbox-ut8SXIVXkNb6SDwt5jAqUszeCpQztbQM',   // sandbox.iyzipay.com
    uri:       'https://sandbox-api.iyzipay.com'
});

// ─── Tablo 
db.exec(`
    CREATE TABLE IF NOT EXISTS donations (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        donor_name      TEXT    NOT NULL,
        donor_email     TEXT    NOT NULL,
        donor_phone     TEXT,
        amount          REAL    NOT NULL,
        currency        TEXT    DEFAULT 'TRY',
        payment_method  TEXT    CHECK(payment_method IN ('iyzico','iban')) DEFAULT 'iban',
        status          TEXT    CHECK(status IN ('pending','completed','failed')) DEFAULT 'pending',
        iyzico_token    TEXT,
        iyzico_payment_id TEXT,
        note            TEXT,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// ════════════════════════════════════════════════════════════
// POST /api/donate/iban  — IBAN bağış kaydı
// ════════════════════════════════════════════════════════════
router.post('/iban', (req, res) => {
    try {
        const { donor_name, donor_email, donor_phone, amount, note } = req.body;

        if (!donor_name || !donor_email || !amount) {
            return res.status(400).json({ success: false, message: 'Ad, email ve tutar zorunludur.' });
        }
        if (isNaN(amount) || Number(amount) < 10) {
            return res.status(400).json({ success: false, message: 'Minimum bağış tutarı 10 ₺ dir.' });
        }

        const result = db.prepare(`
            INSERT INTO donations (donor_name, donor_email, donor_phone, amount, payment_method, status, note)
            VALUES (?, ?, ?, ?, 'iban', 'pending', ?)
        `).run(donor_name.trim(), donor_email.trim(), donor_phone || '', Number(amount), note || '');

        // Aktivite kaydı
        try {
            db.prepare(`
                INSERT INTO activities (admin_name, action_type, action_description)
                VALUES ('Sistem', 'donation_iban', ?)
            `).run(`${donor_name} tarafından ${amount}₺ IBAN bağışı oluşturuldu`);
        } catch (_) {}

        res.json({
            success:    true,
            message:    'Bağış kaydınız alındı.',
            donation_id: result.lastInsertRowid,
            // IBAN bilgileri — kendi bilgilerinizle değiştirin
            iban_info: {
                bank:       'Ziraat Bankası',
                iban:       'TR00 0000 0000 0000 0000 0000 00',
                name:       'Pati ve Gelecek Derneği',
                amount:     Number(amount),
                reference:  `BAG-${result.lastInsertRowid}`,  // açıklamaya yazması için
                note:       'Havale açıklamasına referans kodunu yazmayı unutmayın!'
            }
        });
    } catch (error) {
        console.error('IBAN donate error:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// ════════════════════════════════════════════════════════════
// POST /api/donate/iyzico  — iyzico Sandbox ödeme başlat
// ════════════════════════════════════════════════════════════
router.post('/iyzico', (req, res) => {
    try {
        const {
            donor_name, donor_email, donor_phone, amount,
            card_holder, card_number, expire_month, expire_year, cvc, note
        } = req.body;

        if (!donor_name || !donor_email || !amount || !card_number) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur.' });
        }

        // DB'ye pending kayıt
        const result = db.prepare(`
            INSERT INTO donations (donor_name, donor_email, donor_phone, amount, payment_method, status, note)
            VALUES (?, ?, ?, ?, 'iyzico', 'pending', ?)
        `).run(donor_name.trim(), donor_email.trim(), donor_phone || '', Number(amount), note || '');

        const donationId = result.lastInsertRowid;
        const amountStr  = Number(amount).toFixed(2); // iyzico string ister

        const nameParts = donor_name.trim().split(' ');
        const firstName = nameParts[0];
        const lastName  = nameParts.slice(1).join(' ') || '-';

        const request = {
            locale:          Iyzipay.LOCALE.TR,
            conversationId:  String(donationId),
            price:           amountStr,
            paidPrice:       amountStr,
            currency:        Iyzipay.CURRENCY.TRY,
            installment:     '1',
            basketId:        `BASKET-${donationId}`,
            paymentChannel:  Iyzipay.PAYMENT_CHANNEL.WEB,
            paymentGroup:    Iyzipay.PAYMENT_GROUP.PRODUCT,

            paymentCard: {
                cardHolderName: card_holder,
                cardNumber:     card_number.replace(/\s/g, ''),
                expireMonth:    expire_month,
                expireYear:     expire_year,
                cvc:            cvc,
                registerCard:   '0'
            },

            buyer: {
                id:                  String(donationId),
                name:                firstName,
                surname:             lastName,
                gsmNumber:           donor_phone || '+905000000000',
                email:               donor_email,
                identityNumber:      '74300864791', // sandbox için sabit
                lastLoginDate:       '2026-01-01 12:00:00',
                registrationDate:    '2026-01-01 12:00:00',
                registrationAddress: 'İskenderun, Hatay',
                ip:                  req.ip || '85.34.78.112',
                city:                'Hatay',
                country:             'Turkey',
                zipCode:             '31200'
            },

            shippingAddress: {
                contactName: donor_name,
                city:        'Hatay',
                country:     'Turkey',
                address:     'İskenderun, Hatay',
                zipCode:     '31200'
            },

            billingAddress: {
                contactName: donor_name,
                city:        'Hatay',
                country:     'Turkey',
                address:     'İskenderun, Hatay',
                zipCode:     '31200'
            },

            basketItems: [{
                id:        `DONATION-${donationId}`,
                name:      'Dernek Bağışı',
                category1: 'Bağış',
                itemType:  Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
                price:     amountStr
            }]
        };

        iyzipay.payment.create(request, (err, result) => {
            if (err) {
                console.error('iyzico error:', err);
                db.prepare(`UPDATE donations SET status='failed' WHERE id=?`).run(donationId);
                return res.status(500).json({ success: false, message: 'Ödeme servisi hatası.' });
            }

            if (result.status === 'success') {
                db.prepare(`
                    UPDATE donations SET status='completed', iyzico_payment_id=? WHERE id=?
                `).run(result.paymentId, donationId);

                try {
                    db.prepare(`
                        INSERT INTO activities (admin_name, action_type, action_description)
                        VALUES ('Sistem', 'donation_card', ?)
                    `).run(`${donor_name} tarafından ${amount}₺ kart bağışı tamamlandı`);
                } catch (_) {}

                res.json({
                    success:    true,
                    message:    'Ödeme başarıyla tamamlandı!',
                    payment_id: result.paymentId,
                    donation_id: donationId
                });
            } else {
                db.prepare(`UPDATE donations SET status='failed' WHERE id=?`).run(donationId);
                res.json({
                    success: false,
                    message: result.errorMessage || 'Ödeme başarısız.',
                    error_code: result.errorCode
                });
            }
        });

    } catch (error) {
        console.error('iyzico donate error:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// ════════════════════════════════════════════════════════════
// GET /api/donate  — Admin: tüm bağışları listele
// ════════════════════════════════════════════════════════════
router.get('/', (req, res) => {
    try {
        const { status, method } = req.query;
        let query  = 'SELECT * FROM donations WHERE 1=1';
        const params = [];
        if (status) { query += ' AND status = ?';         params.push(status); }
        if (method) { query += ' AND payment_method = ?'; params.push(method); }
        query += ' ORDER BY created_at DESC';

        const donations = db.prepare(query).all(...params);
        res.json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Bağışlar yüklenemedi.' });
    }
});

// ════════════════════════════════════════════════════════════
// PATCH /api/donate/:id/confirm  — Admin: IBAN bağışını onayla
// ════════════════════════════════════════════════════════════
router.patch('/:id/confirm', (req, res) => {
    try {
        db.prepare(`UPDATE donations SET status='completed' WHERE id=?`).run(req.params.id);
        res.json({ success: true, message: 'Bağış onaylandı.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Onaylanamadı.' });
    }
});

module.exports = router;