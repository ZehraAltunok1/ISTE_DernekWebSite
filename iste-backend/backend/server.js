const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Middleware - ÖNCELİKLE CORS'U AYARLA
app.use(cors({
    origin: 'http://localhost:8080',  // Frontend URL'i
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));

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
});