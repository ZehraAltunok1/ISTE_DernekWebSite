const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    type:          { type: String, enum: ['photo', 'video'], required: true },
    title:         { type: String, required: true, trim: true },
    description:   { type: String, default: '' },
    url:           { type: String, required: true },
    thumbnail_url: { type: String, default: '' },
    youtube_id:    { type: String, default: null },
    order:         { type: Number, default: 0 },
    is_cover:      { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Media', mediaSchema);