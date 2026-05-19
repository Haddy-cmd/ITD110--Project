const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided. Access denied.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Re-fetch user to get current status (in case admin suspended them)
        const user = await User.findById(decoded.id).select('-passwordHash');
        if (!user) return res.status(401).json({ message: 'User not found.' });
        if (user.status !== 'active') {
            return res.status(403).json({ message: `Account is ${user.status}. Contact the admin.` });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};
