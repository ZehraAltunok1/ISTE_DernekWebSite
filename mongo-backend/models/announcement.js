const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title:      { type: String, required: true, trim: true },
    message:    { type: String, required: true },
    type:       { type: String, enum: ['Information', 'Success', 'Warning', 'Error'], default: 'Information' },
    status:     { type: String, enum: ['active', 'passive'], default: 'active' },
    link_text:  { type: String, default: '' },
    link_url:   { type: String, default: '' },
    created_by: { type: String, default: 'Admin' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('announcement', announcementSchema);    