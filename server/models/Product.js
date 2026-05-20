const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name:     { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price:    { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    emoji:    { type: String, default: '📦' },
    image:    { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
