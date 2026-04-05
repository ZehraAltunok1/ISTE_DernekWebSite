const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title:            { type: String, required: true },
    description:      { type: String, default: '' },
    event_date:       { type: String, required: true },
    event_time:       { type: String, default: '' },
    end_date:         { type: String, default: '' },
    end_time:         { type: String, default: '' },
    location:         { type: String, default: '' },
    category:         { type: String, enum: ['toplanti','egitim','sosyal','bagis','diger'], default: 'diger' },
    capacity:         { type: Number, default: 0 },
    registered_count: { type: Number, default: 0 },
    status:           { type: String, enum: ['planned','active','completed','cancelled'], default: 'planned' },
    created_by:       { type: String, default: 'Admin' },
    participants: [{
        user_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        user_name:         { type: String, default: '' },
        user_email:        { type: String, default: '' },
        user_type:         { type: String, default: 'guest' },
        attendance_status: { type: String, enum: ['registered','attended','absent'], default: 'registered' },
        registered_at:     { type: Date, default: Date.now }
    }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Event', eventSchema);