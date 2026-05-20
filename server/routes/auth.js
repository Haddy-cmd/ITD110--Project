const router  = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const auth     = require('../middleware/auth');

// ── Helper: sign JWT ────────────────────────────────────────────────────────
function signToken(user) {
    return jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );
}

// ── POST /api/auth/register — Cashier self-registration ────────────────────
router.post('/register', async (req, res) => {
    try {
        const { username, password, firstName, middleName, lastName, address, email } = req.body;

        if (!username || !password || !firstName || !lastName || !address || !email) {
            return res.status(400).json({ message: 'All required fields must be filled.' });
        }

        const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRx.test(email)) return res.status(400).json({ message: 'Invalid email address.' });

        const pwRx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
        if (!pwRx.test(password)) {
            return res.status(400).json({ message: 'Password must be 8+ chars with uppercase, lowercase, and a special character.' });
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) return res.status(409).json({ message: 'Username already taken.' });

        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) return res.status(409).json({ message: 'Email already in use.' });

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({
            username, passwordHash,
            firstName, middleName: middleName || '', lastName,
            address, email: email.toLowerCase(),
            role: 'cashier', status: 'pending'
        });

        res.status(201).json({ message: `Account created for ${firstName}. Awaiting admin approval.` });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── POST /api/auth/admin-register — One-time owner account creation ─────────
router.post('/admin-register', async (req, res) => {
    try {
        // Lock: if any admin already exists, block registration
        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) {
            return res.status(403).json({ message: 'An admin account already exists. Registration is locked.' });
        }

        const { username, password, firstName, middleName, lastName, address, email } = req.body;

        if (!username || !password || !firstName || !lastName || !address || !email) {
            return res.status(400).json({ message: 'All required fields must be filled.' });
        }

        const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRx.test(email)) return res.status(400).json({ message: 'Invalid email address.' });

        const pwRx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
        if (!pwRx.test(password)) {
            return res.status(400).json({ message: 'Password must be 8+ chars with uppercase, lowercase, and a special character.' });
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) return res.status(409).json({ message: 'Username already taken.' });

        const passwordHash = await bcrypt.hash(password, 12);
        const admin = await User.create({
            username, passwordHash,
            firstName, middleName: middleName || '', lastName,
            address, email: email.toLowerCase(),
            role: 'admin', status: 'active'
        });

        res.status(201).json({ message: `Admin account created for ${firstName}. You may now log in.` });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── POST /api/auth/login — Universal login for cashier + admin ──────────────
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Username and password required.' });

        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ message: 'Wrong username or password.' });

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) return res.status(401).json({ message: 'Wrong username or password.' });

        if (user.status === 'pending') {
            return res.status(403).json({ message: 'Your account is pending admin approval. Please wait.' });
        }
        if (user.status === 'suspended') {
            return res.status(403).json({ message: 'Your account has been suspended. Contact the admin.' });
        }

        const token = signToken(user);
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                firstName: user.firstName,
                middleName: user.middleName || '',
                lastName: user.lastName,
                email: user.email,
                address: user.address,
                role: user.role,
                status: user.status
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── GET /api/auth/check-admin — Check if admin account exists (for UI lock) ─
router.get('/check-admin', async (req, res) => {
    const adminExists = await User.findOne({ role: 'admin' }).lean();
    res.json({ adminExists: !!adminExists });
});

// ── PUT /api/auth/profile — Update logged-in user profile ───────────────────
router.put('/profile', auth, async (req, res) => {
    try {
        const { firstName, middleName, lastName, address, email } = req.body;
        
        if (!firstName || !lastName || !address || !email) {
            return res.status(400).json({ message: 'Required fields missing.' });
        }

        const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRx.test(email)) return res.status(400).json({ message: 'Invalid email address.' });

        const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user.id } });
        if (existingEmail) return res.status(409).json({ message: 'Email already in use by another account.' });

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { firstName, middleName: middleName || '', lastName, address, email: email.toLowerCase() },
            { new: true, select: '-passwordHash' }
        );

        if (!updatedUser) return res.status(404).json({ message: 'User not found.' });

        res.json({ message: 'Profile updated successfully.', user: updatedUser });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── GET /api/auth/profile — Get logged-in user profile ──────────────────────
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-passwordHash');
        if (!user) return res.status(404).json({ message: 'User not found.' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

// ── PATCH /api/auth/change-password — Change logged-in user password ────────
router.patch('/change-password', auth, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Old and new passwords required.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const match = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!match) return res.status(400).json({ message: 'Incorrect old password.' });

        const pwRx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
        if (!pwRx.test(newPassword)) {
            return res.status(400).json({ message: 'Password must be 8+ chars with uppercase, lowercase, and a special character.' });
        }

        user.passwordHash = await bcrypt.hash(newPassword, 12);
        await user.save();

        res.json({ message: 'Password updated successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error.', error: err.message });
    }
});

module.exports = router;
