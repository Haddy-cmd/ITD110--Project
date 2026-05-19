const router    = require('express').Router();
const Sale      = require('../models/Sale');
const Product   = require('../models/Product');
const auth      = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// ── POST /api/sales — Cashier: Record a new sale (checkout) ────────────────
router.post('/', auth, async (req, res) => {
    try {
        const { items } = req.body; // [{ productId, quantity }]
        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty.' });
        }

        const saleItems = [];
        let grandTotal = 0;

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) return res.status(404).json({ message: `Product not found: ${item.productId}` });
            if (product.quantity < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for "${product.name}". Available: ${product.quantity}` });
            }

            const subtotal = product.price * item.quantity;
            grandTotal += subtotal;

            // Embed full product snapshot (prices frozen at sale time)
            saleItems.push({
                productId:   product._id,
                code:        product.code,
                name:        product.name,
                category:    product.category,
                emoji:       product.emoji,
                image:       product.image,
                priceAtSale: product.price,
                quantity:    item.quantity,
                subtotal
            });

            // Deduct stock
            product.quantity -= item.quantity;
            await product.save();
        }

        const sale = await Sale.create({
            soldBy: {
                userId:   req.user._id,
                username: req.user.username,
                fullName: `${req.user.firstName} ${req.user.lastName}`
            },
            items: saleItems,
            grandTotal,
            saleDate: new Date()
        });

        res.status(201).json({ message: 'Sale recorded successfully.', sale });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── GET /api/sales/my — Cashier: Own order history ─────────────────────────
router.get('/my', auth, async (req, res) => {
    try {
        const sales = await Sale.find({ 'soldBy.userId': req.user._id })
            .sort({ saleDate: -1 });
        res.json(sales);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── GET /api/sales — Admin: All sales ──────────────────────────────────────
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const sales = await Sale.find().sort({ saleDate: -1 });
        res.json(sales);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── GET /api/sales/analytics — Admin: Revenue analytics ────────────────────
// Query: ?range=daily|weekly|monthly
router.get('/analytics', auth, adminOnly, async (req, res) => {
    try {
        const range = req.query.range || 'daily';
        const now   = new Date();
        let startDate;

        if (range === 'daily') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (range === 'weekly') {
            const day = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - day);
            startDate.setHours(0, 0, 0, 0);
        } else if (range === 'monthly') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
            return res.status(400).json({ message: 'Invalid range. Use: daily, weekly, monthly.' });
        }

        const sales = await Sale.find({ saleDate: { $gte: startDate } }).sort({ saleDate: -1 });

        // Total revenue
        const totalRevenue = sales.reduce((sum, s) => sum + s.grandTotal, 0);

        // Total transactions
        const totalTransactions = sales.length;

        // Top products by quantity sold
        const productMap = {};
        for (const sale of sales) {
            for (const item of sale.items) {
                const key = item.code;
                if (!productMap[key]) {
                    productMap[key] = { code: item.code, name: item.name, emoji: item.emoji, totalQty: 0, totalRevenue: 0 };
                }
                productMap[key].totalQty     += item.quantity;
                productMap[key].totalRevenue += item.subtotal;
            }
        }
        const topProducts = Object.values(productMap)
            .sort((a, b) => b.totalQty - a.totalQty)
            .slice(0, 10);

        // Sales by cashier
        const cashierMap = {};
        for (const sale of sales) {
            const key = sale.soldBy.username;
            if (!cashierMap[key]) {
                cashierMap[key] = { username: key, fullName: sale.soldBy.fullName, totalSales: 0, totalRevenue: 0 };
            }
            cashierMap[key].totalSales++;
            cashierMap[key].totalRevenue += sale.grandTotal;
        }
        const salesByCashier = Object.values(cashierMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

        // Revenue over time (grouped by date)
        const revenueByDate = {};
        for (const sale of sales) {
            const dateKey = sale.saleDate.toISOString().split('T')[0];
            if (!revenueByDate[dateKey]) revenueByDate[dateKey] = 0;
            revenueByDate[dateKey] += sale.grandTotal;
        }
        const revenueTimeline = Object.entries(revenueByDate)
            .map(([date, revenue]) => ({ date, revenue }))
            .sort((a, b) => a.date.localeCompare(b.date));

        res.json({
            range,
            startDate,
            totalRevenue,
            totalTransactions,
            topProducts,
            salesByCashier,
            revenueTimeline,
            recentSales: sales.slice(0, 20)
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

module.exports = router;
