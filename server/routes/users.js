const router    = require('express').Router();
const User      = require('../models/User');
const auth      = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

// All routes below require a valid token + admin role
router.use(auth, adminOnly);

// ── GET /api/users — List all users (except the admin) ─────────────────────
router.get('/', async (req, res) => {
    try {
        const users = await User.find({ role: 'cashier' })
            .select('-passwordHash')
            .sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── PATCH /api/users/:id/approve — Approve a pending user ──────────────────
router.patch('/:id/approve', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'active' },
            { new: true, select: '-passwordHash' }
        );
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json({ message: `${user.firstName} has been approved.`, user });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── PATCH /api/users/:id/suspend — Suspend an active user ──────────────────
router.patch('/:id/suspend', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'suspended' },
            { new: true, select: '-passwordHash' }
        );
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json({ message: `${user.firstName} has been suspended.`, user });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── PATCH /api/users/:id/reactivate — Reactivate a suspended user ──────────
router.patch('/:id/reactivate', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'active' },
            { new: true, select: '-passwordHash' }
        );
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json({ message: `${user.firstName} has been reactivated.`, user });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── DELETE /api/users/:id — Delete a user account ──────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json({ message: `Account for ${user.firstName} has been deleted.` });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

module.exports = router;
