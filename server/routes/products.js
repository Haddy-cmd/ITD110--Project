const router    = require('express').Router();
const Product   = require('../models/Product');
const auth      = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// ── GET /api/products — All active users can browse products ────────────────
router.get('/', auth, async (req, res) => {
    try {
        const products = await Product.find().sort({ category: 1, name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── GET /api/products/:id — Single product ──────────────────────────────────
router.get('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found.' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── POST /api/products — Admin: Add new product ─────────────────────────────
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { code, name, category, price, quantity, emoji, image } = req.body;
        if (!code || !name || !category || price == null || quantity == null) {
            return res.status(400).json({ message: 'code, name, category, price, and quantity are required.' });
        }
        const exists = await Product.findOne({ code });
        if (exists) return res.status(409).json({ message: `Product code ${code} already exists.` });

        const product = await Product.create({ code, name, category, price, quantity, emoji, image });
        res.status(201).json({ message: `Product "${name}" added.`, product });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── PUT /api/products/:id — Admin: Update product ───────────────────────────
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { name, category, price, quantity, emoji, image } = req.body;
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { name, category, price, quantity, emoji, image },
            { new: true, runValidators: true }
        );
        if (!product) return res.status(404).json({ message: 'Product not found.' });
        res.json({ message: `Product "${product.name}" updated.`, product });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── PATCH /api/products/:id/stock — Admin: Adjust stock only ───────────────
router.patch('/:id/stock', auth, adminOnly, async (req, res) => {
    try {
        const { quantity } = req.body;
        if (quantity == null || quantity < 0) {
            return res.status(400).json({ message: 'A valid quantity (≥ 0) is required.' });
        }
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { quantity },
            { new: true }
        );
        if (!product) return res.status(404).json({ message: 'Product not found.' });
        res.json({ message: `Stock for "${product.name}" updated to ${quantity}.`, product });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── DELETE /api/products/:id — Admin: Delete product ───────────────────────
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found.' });
        res.json({ message: `Product "${product.name}" deleted.` });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

module.exports = router;
