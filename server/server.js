require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve the client folder as static files
app.use(express.static(path.join(__dirname, '..', 'client')));

// ── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sales',    require('./routes/sales'));

// ── Catch-all: serve index.html for any non-API route ──────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// ── Connect to MongoDB and start server ────────────────────────────────────
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
            console.log(`📦 API available at http://localhost:${PORT}/api`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        process.exit(1);
    });
