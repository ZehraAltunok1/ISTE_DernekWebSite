const express    = require("express");
const router     = express.Router();
const db         = require("../config/database");
const nodemailer = require("nodemailer");

// ── Mail gönderici ──────────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});
console.log("MAIL_USER:", process.env.MAIL_USER);
console.log("MAIL_PASS:", process.env.MAIL_PASS ? "VAR" : "YOK");
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
router.patch("/:id/status", async (req, res) => {
    try {
        const { id }            = req.params;
        const { status, notes } = req.body;

        if (!["approved", "rejected"].includes(status)) {
            return res.json({ success: false, message: "Geçersiz durum!" });
        }

        // Gönüllüyü bul
        const vol = db.prepare("SELECT * FROM volunteers WHERE id = ?").get(id);
        if (!vol) {
            return res.json({ success: false, message: "Gönüllü bulunamadı!" });
        }

        // Durumu güncelle
        db.prepare(`
            UPDATE volunteers
            SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(status, notes || "", id);

        // ── Mail gönder ─────────────────────────────────────
        try {
            let subject, html;

            if (status === "approved") {
                subject = `🐾 Gönüllü Başvurunuz Onaylandı! [Ref: ${vol.id}-${Date.now()}]`;;
                html = `
                    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                        <div style="background:linear-gradient(135deg,#2D6A4F,#40916C);
                                    padding:32px;text-align:center;border-radius:12px 12px 0 0;">
                            <div style="font-size:3rem;">🐾</div>
                            <h1 style="color:white;margin:8px 0 0;">Tebrikler!</h1>
                        </div>
                        <div style="padding:32px;background:#f9f9f9;border-radius:0 0 12px 12px;">
                            <p style="font-size:1.05rem;">
                                Merhaba <strong>${vol.first_name} ${vol.last_name}</strong>,
                            </p>
                            <p>
                                <strong>Pati ve Gelecek Derneği</strong>'ne gönüllü başvurunuz 
                                onaylanmıştır! Artık ailemizin bir parçasısınız. 🎉
                            </p>
                            <p>
                                <strong>Seçtiğiniz alan:</strong> ${vol.area}
                            </p>
                            <div style="background:#E8F5EE;border-left:4px solid #2D6A4F;
                                        padding:16px;border-radius:0 8px 8px 0;margin:24px 0;">
                                <p style="margin:0;color:#2D6A4F;font-weight:600;">
                                    Sizinle en kısa sürede iletişime geçeceğiz!
                                </p>
                            </div>
                            <hr style="border:1px solid #e0e0e0;margin:24px 0;"/>
                            <p style="margin:0;font-weight:600;">Bize ulaşın:</p>
                            <p style="margin:8px 0;">📧 info@patigeleeck.org</p>
                            <p style="margin:8px 0;">📞 0 (850) 311 51 42</p>
                            <p style="margin:8px 0;">📍 İskenderun, Hatay</p>
                            <hr style="border:1px solid #e0e0e0;margin:24px 0;"/>
                            <p style="color:#888;font-size:0.82rem;margin:0;">
                                Pati ve Gelecek Derneği — Her pati için bir umut ışığı 🐾
                            </p>
                        </div>
                    </div>
                `;
            } else {
                subject = "Pati ve Gelecek Derneği — Başvurunuz Hakkında";
                html = `
                    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                        <div style="background:linear-gradient(135deg,#555,#777);
                                    padding:32px;text-align:center;border-radius:12px 12px 0 0;">
                            <h1 style="color:white;margin:0;">Başvurunuz Değerlendirildi</h1>
                        </div>
                        <div style="padding:32px;background:#f9f9f9;border-radius:0 0 12px 12px;">
                            <p style="font-size:1.05rem;">
                                Merhaba <strong>${vol.first_name} ${vol.last_name}</strong>,
                            </p>
                            <p>
                                Pati ve Gelecek Derneği'ne gönüllü olmak için gösterdiğiniz ilgi 
                                ve zaman ayırdığınız için çok teşekkür ederiz.
                            </p>
                            <p>
                                Maalesef bu dönemde başvurunuzu kabul edemiyoruz. 
                                Ancak ilerleyen dönemlerde tekrar başvurabilirsiniz.
                            </p>
                            <hr style="border:1px solid #e0e0e0;margin:24px 0;"/>
                            <p style="margin:0;font-weight:600;">Sorularınız için:</p>
                            <p style="margin:8px 0;">📧 info@patigeleeck.org</p>
                            <p style="margin:8px 0;">📞 0 (850) 311 51 42</p>
                            <hr style="border:1px solid #e0e0e0;margin:24px 0;"/>
                            <p style="color:#888;font-size:0.82rem;margin:0;">
                                Pati ve Gelecek Derneği — Her pati için bir umut ışığı 🐾
                            </p>
                        </div>
                    </div>
                `;
            }

            await transporter.sendMail({
                from: `"Pati ve Gelecek Derneği" <${process.env.MAIL_USER}>`,
                to:      vol.email,
                subject,
                html
            });

            console.log("Mail gönderildi:", vol.email);

        } catch (mailErr) {
            // Mail hatası işlemi engellemesin, sadece logla
            console.error("Mail gönderilemedi:", mailErr.message);
        }

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