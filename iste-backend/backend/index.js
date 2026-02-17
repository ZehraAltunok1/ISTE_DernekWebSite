const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database'i initialize et
require('./config/database');

// CORS Middleware
app.use(cors({
    origin: 'http://localhost:8080',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/api')); // ← YENİ: Donors, Students, Activities

// Test route
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'EduSupport API is running',
        timestamp: new Date()
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Bir hata oluştu!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`✅ CORS enabled for http://localhost:8080`);
    console.log(`📋 API Routes:`);
    console.log(`   - POST /api/auth/admin/login`);
    console.log(`   - POST /api/auth/user/login`);
    console.log(`   - POST /api/auth/user/register`);
    console.log(`   - GET  /api/donors`);
    console.log(`   - POST /api/donors`);
    console.log(`   - GET  /api/students`);
    console.log(`   - POST /api/students`);
    console.log(`   - GET  /api/activities`);
});