// DNS'i en üste al — require('dotenv') dahil her şeyden önce
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// MongoDB'ye Bağlan
connectDB();

// Middleware
app.use(cors({
    origin: 'http://localhost:8080',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/profile',       require('./routes/profile'));
app.use('/api',               require('./routes/api'));
app.use('/api/volunteers',    require('./routes/volunteers'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/media',         require('./routes/media'));
app.use('/api/events',        require('./routes/events'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/donate',        require('./routes/donate'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/donor',         require('./routes/donor'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Bir hata oluştu!', message: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`));