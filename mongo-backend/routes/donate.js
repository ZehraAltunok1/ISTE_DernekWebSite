const express  = require('express');
const router   = express.Router();
const Donation = require('../models/donation');
const Activity = require('../models/activity');

// POST /api/donate/iban
router.post('/iban', async (req, res) => {
    try {
        const { donor_name, donor_email, donor_phone, amount, note } = req.body;
        if (!donor_name || !donor_email || !amount)
            return res.status(400).json({ success: false, message: 'Ad, email ve tutar zorunludur.' });
        if (isNaN(amount) || Number(amount) < 10)
            return res.status(400).json({ success: false, message: 'Minimum bağış tutarı 10 ₺ dir.' });

        const donation = await Donation.create({
            donor_name: donor_name.trim(), donor_email: donor_email.trim(),
            donor_phone: donor_phone || '', amount: Number(amount),
            payment_method: 'iban', status: 'pending', note: note || ''
        });

        try { await Activity.create({ action_type: 'donation_iban', action_description: `${donor_name} tarafından ${amount}₺ IBAN bağışı oluşturuldu` }); } catch (_) {}

        res.json({
            success: true,
            message: 'Bağış kaydınız alındı.',
            donation_id: donation._id,
            iban_info: {
                bank:      'Ziraat Bankası',
                iban:      'TR00 0000 0000 0000 0000 0000 00',
                name:      'Pati ve Gelecek Derneği',
                amount:    Number(amount),
                reference: `BAG-${donation._id}`,
                note:      'Havale açıklamasına referans kodunu yazmayı unutmayın!'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// POST /api/donate/iyzico
router.post('/iyzico', async (req, res) => {
    try {
        const { donor_name, donor_email, donor_phone, amount, note } = req.body;
        if (!donor_name || !donor_email || !amount)
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur.' });

        const donation = await Donation.create({
            donor_name: donor_name.trim(), donor_email: donor_email.trim(),
            donor_phone: donor_phone || '', amount: Number(amount),
            payment_method: 'iyzico', status: 'pending', note: note || ''
        });

        // iyzico entegrasyonu için Iyzipay eklenebilir
        // Şimdilik pending olarak kaydediyoruz
        res.json({ success: true, message: 'Ödeme kaydı oluşturuldu.', donation_id: donation._id });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

// GET /api/donate
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status         = req.query.status;
        if (req.query.method) filter.payment_method = req.query.method;

        const donations = await Donation.find(filter).sort({ created_at: -1 });
        res.json({ success: true, donations });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Bağışlar yüklenemedi.' });
    }
});

// PATCH /api/donate/:id/confirm
router.patch('/:id/confirm', async (req, res) => {
    try {
        await Donation.findByIdAndUpdate(req.params.id, { status: 'completed' });
        res.json({ success: true, message: 'Bağış onaylandı.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Onaylanamadı.' });
    }
});

module.exports = router;