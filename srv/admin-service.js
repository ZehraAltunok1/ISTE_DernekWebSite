const cds = require('@sap/cds')
const mailer = require('./lib/mailer')

module.exports = class AdminService extends cds.ApplicationService {
    init() {
        const { Campaigns, Donations, VolunteerApplications, ContactMessages } = this.entities
        const db = cds.entities('pg')

        // ── Kampanyalar ──────────────────────────────────────

        this.before('SAVE', Campaigns, req => {
            const { startDate, endDate } = req.data
            if (startDate && endDate && endDate < startDate) req.error(400, 'END_BEFORE_START', 'endDate')
        })

        this.before('DELETE', Campaigns, async req => {
            const id = req.params.at(-1)?.ID ?? req.params.at(-1)
            const donation = await SELECT.one.from(db.Donations).where({ campaign_ID: id }).columns('ID')
            if (donation) req.reject(409, 'CAMPAIGN_HAS_DONATIONS')
        })

        // ── Bağışlar ─────────────────────────────────────────

        this.on('confirm', Donations, async req => {
            const donation = await pendingOnly(req, db.Donations, 'DONATION_NOT_PENDING')
            await UPDATE(db.Donations, donation.ID).with({ status: 'Confirmed' })
            if (donation.campaign_ID) {
                await UPDATE(db.Campaigns, donation.campaign_ID).with({ raisedAmount: { '+=': donation.amount } })
            }
            await mailer.send({
                to: donation.donorEmail,
                subject: 'Bağışınız ulaştı — teşekkürler!',
                text: `Merhaba ${donation.donorName},\n\n${donation.referenceCode} referanslı ${donation.amount} ₺ bağışınız hesabımıza ulaştı.`
            })
            return SELECT.one.from(Donations, donation.ID)
        })

        this.on('decline', Donations, async req => {
            const donation = await pendingOnly(req, db.Donations, 'DONATION_NOT_PENDING')
            await UPDATE(db.Donations, donation.ID).with({ status: 'Rejected', statusNote: req.data.reason })
            return SELECT.one.from(Donations, donation.ID)
        })

        // ── Gönüllü başvuruları ──────────────────────────────

        this.on('approve', VolunteerApplications, async req => {
            const app = await pendingOnly(req, db.VolunteerApplications, 'APPLICATION_NOT_PENDING')
            await UPDATE(db.VolunteerApplications, app.ID).with({ status: 'Approved', adminNote: req.data.note })
            await mailer.send({
                to: app.email,
                subject: 'Gönüllü başvurunuz onaylandı 🐾',
                text: `Merhaba ${app.firstName},\n\nAilemize hoş geldiniz! Ekibimiz oryantasyon için sizinle iletişime geçecek.`
            })
            return SELECT.one.from(VolunteerApplications, app.ID)
        })

        this.on('decline', VolunteerApplications, async req => {
            const app = await pendingOnly(req, db.VolunteerApplications, 'APPLICATION_NOT_PENDING')
            await UPDATE(db.VolunteerApplications, app.ID).with({ status: 'Rejected', adminNote: req.data.note })
            await mailer.send({
                to: app.email,
                subject: 'Gönüllü başvurunuz hakkında',
                text: `Merhaba ${app.firstName},\n\nİlginiz için teşekkür ederiz. Bu dönem başvurunuzu kabul edemiyoruz; ilerleyen dönemlerde tekrar başvurabilirsiniz.`
            })
            return SELECT.one.from(VolunteerApplications, app.ID)
        })

        // ── İletişim mesajları ───────────────────────────────

        this.on('markAnswered', ContactMessages, async req => {
            const key = req.params.at(-1)
            const msg = await SELECT.one.from(db.ContactMessages, key.ID ?? key).forUpdate()
            if (!msg) return req.reject(404)
            if (msg.status === 'Answered') return req.reject(409, 'MESSAGE_NOT_NEW')
            await UPDATE(db.ContactMessages, msg.ID).with({ status: 'Answered', adminNote: req.data.note })
            return SELECT.one.from(ContactMessages, msg.ID)
        })

        return super.init()
    }
}

/**
 * Bound action'ın hedef kaydını okur; yalnızca "Pending" durumundaysa devam eder.
 * Durum geçişlerini sunucuda denetlemek, arayüzde butonu gizlemekten daha güvenlidir.
 */
async function pendingOnly(req, entity, errorKey) {
    const key = req.params.at(-1)
    const row = await SELECT.one.from(entity, key.ID ?? key).forUpdate()
    if (!row) return req.reject(404)
    if (row.status !== 'Pending') return req.reject(409, errorKey)
    return row
}
