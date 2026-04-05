const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    payment_type:   { type: String, enum: ['aidat','bagis'], required: true },
    amount:         { type: Number, required: true },
    payment_date:   { type: String, default: null },
    due_date:       { type: String, default: null },
    status:         { type: String, enum: ['odendi','bekliyor','gecikmis'], default: 'bekliyor' },
    payment_method: { type: String, default: null },
    notes:          { type: String, default: null },
    created_by:     { type: String, default: 'Admin' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Payment', paymentSchema);