const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
    first_name: { type: String, required: true, trim: true },
    last_name:  { type: String, required: true, trim: true },
    email:      { type: String, required: true, lowercase: true, trim: true },
    phone:      { type: String, required: true },
    area:       { type: String, required: true },
    reason:     { type: String, required: true },
    status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    notes:      { type: String, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Volunteer', volunteerSchema);