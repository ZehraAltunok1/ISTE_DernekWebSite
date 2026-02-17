const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// DATABASE - Seed data dahil initialize et
// ==========================================
require('./config/database');

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors({
    origin: 'http://localhost:8080',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ==========================================
// ROUTES
// ==========================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api',      require('./routes/api'));   // donors, students, activities, stats
app.use('/api/events', require('./routes/events'));
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'EduSupport API is running',
        timestamp: new Date()
    });
});

// ==========================================
// ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Bir hata oluştu!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==========================================
// START
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`📋 Endpoints:`);
    console.log(`   GET  /api/health`);
    console.log(`   POST /api/auth/login`);
    console.log(`   GET  /api/donors`);
    console.log(`   POST /api/donors`);
    console.log(`   PUT  /api/donors/:id`);
    console.log(`   DELETE /api/donors/:id`);
    console.log(`   GET  /api/students`);
    console.log(`   POST /api/students`);
    console.log(`   PUT  /api/students/:id`);
    console.log(`   DELETE /api/students/:id`);
    console.log(`   GET  /api/activities`);
    console.log(`   GET  /api/stats`);
});
