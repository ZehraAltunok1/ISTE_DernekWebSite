const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    username:      { type: String, required: true, unique: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true },
    password_hash: { type: String, required: true },
    full_name:     { type: String, default: '' },
    role:          { type: String, enum: ['admin', 'moderator', 'accountant', 'viewer', 'super_admin'], default: 'admin' },
    avatar_url:    { type: String, default: '' },
    status:        { type: String, enum: ['active', 'inactive'], default: 'active' },
    last_login:    { type: Date, default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Admin', adminSchema);