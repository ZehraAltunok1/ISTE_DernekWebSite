const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash:  { type: String, required: true, select: false },
    first_name:     { type: String, trim: true },
    last_name:      { type: String, trim: true },
    phone:          { type: String, default: null },
    avatar_url:     { type: String, default: '' },
    user_type:      { type: String, enum: ['donor', 'volunteer', 'student'], default: 'donor' },
    role:           { type: String, enum: ['user', 'admin', 'super_admin'], default: 'user' },
    email_verified: { type: Boolean, default: true },
    status:         { type: String, enum: ['active', 'inactive'], default: 'active' },
    last_login:     { type: Date, default: null },
    donor_profile: {
        donor_type:    { type: String, enum: ['individual', 'corporate'], default: 'individual' },
        company_name:  { type: String, default: null },
        tax_number:    { type: String, default: null },
        total_donated: { type: Number, default: 0 }
    },
    student_profile: {
        student_no:  { type: String, default: null },
        university:  { type: String, default: null },
        department:  { type: String, default: null },
        grade_level: { type: String, default: null },
        gpa:         { type: Number, default: null }
    },

    // ── Şifre sıfırlama ──────────────────────────────
    resetPasswordToken:   { type: String,  default: null },
    resetPasswordExpires: { type: Date,    default: null }

}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// ── Kayıt öncesi şifreyi hashle ──────────────────────
// Sizin modelinizde alan adı password_hash, bu yüzden
// register route'unda { password_hash: bcrypt.hash(...) } yerine
// burası otomatik hallediyor.
userSchema.pre('save', async function () {
    // password_hash değişmediyse geç
    if (!this.isModified('password_hash')) return;
    this.password_hash = await bcrypt.hash(this.password_hash, 12);
});

// ── Şifre karşılaştırma metodu ────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password_hash);
};

userSchema.set('toJSON', {
    virtuals:   true,
    versionKey: false,
    transform:  function (doc, ret) {
        delete ret.password_hash;       // JSON'da şifre görünmesin
        delete ret.resetPasswordToken;  // Token da görünmesin
        return ret;
    }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);