const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    admin_name:          { type: String, default: 'Admin' },
    action_type:         { type: String },
    action_description:  { type: String },
    related_user_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Activity', activitySchema);