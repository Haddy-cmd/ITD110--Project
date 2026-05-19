const mongoose = require('mongoose');

// Each line item embeds a full product snapshot at the time of sale.
// This preserves historical accuracy even if product prices change later.
const saleItemSchema = new mongoose.Schema({
    productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    code:        { type: String, required: true },
    name:        { type: String, required: true },
    category:    { type: String },
    emoji:       { type: String, default: '📦' },
    image:       { type: String, default: '' },
    priceAtSale: { type: Number, required: true },  // snapshot — never changes
    quantity:    { type: Number, required: true, min: 1 },
    subtotal:    { type: Number, required: true }
}, { _id: false });

const saleSchema = new mongoose.Schema({
    soldBy: {
        userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        username: { type: String, required: true },
        fullName: { type: String, required: true }
    },
    items:      { type: [saleItemSchema], required: true },
    grandTotal: { type: Number, required: true, min: 0 },
    saleDate:   { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);
