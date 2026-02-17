const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(
  path.join(__dirname, '../database.sqlite')
);

// GET all donors
router.get('/', (req, res) => {
  db.all("SELECT * FROM users WHERE type = 'donor'", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST new donor
router.post('/', (req, res) => {
  const { email, password, first_name, last_name, phone } = req.body;

  db.run(
    `INSERT INTO users (email, password, first_name, last_name, type, phone, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'donor', ?, datetime('now'), datetime('now'))`,
    [email, password, first_name, last_name, phone],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

module.exports = router;
