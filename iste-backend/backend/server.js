const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path'); 
const volunteersRouter = require("./routes/volunteers");
const announcementsRouter = require('./routes/announcements');
require('./config/database');
const db = require('./config/database');
app.locals.db = db; 
app.use(cors({
    origin: 'http://localhost:8080',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use('/api/auth', require('./routes/auth'));
app.use('/api',      require('./routes/api'));   // donors, students, activities, stats
app.use('/api/events', require('./routes/events'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/media', require('./routes/media'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use("/api/volunteers", volunteersRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/donate', require('./routes/donate'));
app.use('/api/profile', require('./routes/profile'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'EduSupport API is running',
        timestamp: new Date()
    });
});


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Bir hata oluştu!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});


app.listen(PORT, () => {
    console.log(` Server: http://localhost:${PORT}`);
});

