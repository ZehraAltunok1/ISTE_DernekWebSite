const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    donor_name:        { type: String, required: true },
    donor_email:       { type: String, required: true },
    donor_phone:       { type: String, default: '' },
    amount:            { type: Number, required: true },
    currency:          { type: String, default: 'TRY' },
    payment_method:    { type: String, enum: ['iyzico','iban'], default: 'iban' },
    status:            { type: String, enum: ['pending','completed','failed'], default: 'pending' },
    iyzico_payment_id: { type: String, default: null },
    note:              { type: String, default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

donationSchema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Donation', donationSchema);