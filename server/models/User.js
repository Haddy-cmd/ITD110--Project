const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username:     { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName:    { type: String, required: true, trim: true },
    middleName:   { type: String, default: '', trim: true },
    lastName:     { type: String, required: true, trim: true },
    address:      { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    role:         { type: String, enum: ['cashier', 'admin'], default: 'cashier' },
    status:       { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
