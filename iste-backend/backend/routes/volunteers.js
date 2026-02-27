const express = require("express");
const router  = express.Router();
const db      = require("../config/database");

// Volunteers tablosunu oluştur
db.exec(`
    CREATE TABLE IF NOT EXISTS volunteers (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name  TEXT NOT NULL,
        email      TEXT NOT NULL,
        phone      TEXT NOT NULL,
        area       TEXT NOT NULL,
        reason     TEXT NOT NULL,
        status     TEXT DEFAULT 'pending',
        notes      TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// POST /api/volunteers/apply
router.post("/apply", (req, res) => {
    try {
        const { first_name, last_name, email, phone, area, reason } = req.body;

        if (!first_name || !last_name || !email || !phone || !area || !reason) {
            return res.json({ success: false, message: "Tüm alanlar zorunludur!" });
        }

        const existing = db.prepare(
            "SELECT id, status FROM volunteers WHERE email = ?"
        ).get(email);

        if (existing) {
            const msg = existing.status === "approved"
                ? "Bu e-posta ile zaten onaylı bir gönüllü kaydı var!"
                : "Bu e-posta ile zaten bekleyen bir başvurunuz var!";
            return res.json({ success: false, message: msg });
        }

        db.prepare(`
            INSERT INTO volunteers (first_name, last_name, email, phone, area, reason)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(first_name, last_name, email, phone, area, reason);

        res.json({ success: true, message: "Başvurunuz alındı!" });

    } catch (err) {
        console.error("Volunteer apply error:", err);
        res.status(500).json({ success: false, message: "Sunucu hatası!" });
    }
});

// GET /api/volunteers
router.get("/", (req, res) => {
    try {
        const { status } = req.query;
        let rows;
        if (status && status !== "all") {
            rows = db.prepare(
                "SELECT * FROM volunteers WHERE status = ? ORDER BY created_at DESC"
            ).all(status);
        } else {
            rows = db.prepare(
                "SELECT * FROM volunteers ORDER BY created_at DESC"
            ).all();
        }
        res.json({ success: true, volunteers: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: "Sunucu hatası!" });
    }
});

// PATCH /api/volunteers/:id/status
router.patch("/:id/status", (req, res) => {
    try {
        const { id }            = req.params;
        const { status, notes } = req.body;

        if (!["approved", "rejected"].includes(status)) {
            return res.json({ success: false, message: "Geçersiz durum!" });
        }

        db.prepare(`
            UPDATE volunteers
            SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(status, notes || "", id);

        res.json({
            success: true,
            message: status === "approved" ? "Onaylandı!" : "Reddedildi!"
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Sunucu hatası!" });
    }
});

// DELETE /api/volunteers/:id
router.delete("/:id", (req, res) => {
    try {
        db.prepare("DELETE FROM volunteers WHERE id = ?").run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "Sunucu hatası!" });
    }
});

module.exports = router;