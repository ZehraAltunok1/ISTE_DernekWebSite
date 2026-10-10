const cds = require('@sap/cds')
const crypto = require('node:crypto')
const demo = require('./lib/demo')
const mailer = require('./lib/mailer')

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^[0-9+()\s-]{10,20}$/
const MIN_AMOUNT = 10
const MAX_AMOUNT = 100000

module.exports = class SiteService extends cds.ApplicationService {
    init() {
        const { Announcements } = this.entities
        const { Campaigns, Donations, VolunteerApplications, VolunteerAreas, ContactMessages } = cds.entities('pg')

        // Yalnızca yayın tarihi gelmiş ve süresi dolmamış duyurular
        this.before('READ', Announcements, req => {
            const today = new Date().toISOString().slice(0, 10)
            req.query.where`publishDate <= ${today} and (expiryDate is null or expiryDate >= ${today})`
        })

        this.on('donate', async req => {
            const data = req.data
            const donorName = clean(data.donorName)
            const donorEmail = clean(data.donorEmail).toLowerCase()
            const amount = Math.round(Number(data.amount) * 100) / 100
            const method = data.method

            if (donorName.length < 2) return req.reject(400, 'DONOR_NAME_REQUIRED', 'donorName')
            if (!EMAIL.test(donorEmail)) return req.reject(400, 'EMAIL_INVALID', 'donorEmail')
            if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT)
                return req.reject(400, 'AMOUNT_RANGE', 'amount', [MIN_AMOUNT, MAX_AMOUNT])
            if (method !== 'IBAN' && method !== 'Card') return req.reject(400, 'METHOD_INVALID', 'method')

            if (data.campaignID) {
                const campaign = await SELECT.one.from(Campaigns, data.campaignID).columns('status')
                if (!campaign) return req.reject(404, 'CAMPAIGN_NOT_FOUND')
                if (campaign.status !== 'Active') return req.reject(409, 'CAMPAIGN_NOT_ACTIVE')
            }

            // Kart ödemesi simülasyonu: gerçek ödeme sağlayıcısı yerine rastgele sonuç
            let status = 'Pending'
            if (method === 'Card') status = Math.random() < demo.config.cardFailureRate ? 'Failed' : 'Confirmed'

            const referenceCode = newReferenceCode()
            await INSERT.into(Donations).entries({
                referenceCode,
                campaign_ID: data.campaignID || null,
                donorName,
                donorEmail,
                amount,
                method,
                status,
                isAnonymous: !!data.isAnonymous,
                message: clean(data.message).slice(0, 500) || null
            })

            if (status === 'Confirmed' && data.campaignID) {
                await UPDATE(Campaigns, data.campaignID).with({ raisedAmount: { '+=': amount } })
            }

            const { bankName, iban, accountHolder } = demo.config
            if (status === 'Pending') {
                await mailer.send({
                    to: donorEmail,
                    subject: `Bağış talimatınız alındı — ${referenceCode}`,
                    text: `Merhaba ${donorName},\n\n${amount} ₺ tutarındaki bağışınızı aşağıdaki hesaba gönderebilirsiniz.\n` +
                        `Banka: ${bankName}\nIBAN: ${iban}\nAlıcı: ${accountHolder}\nAçıklama: ${referenceCode}`
                })
            } else if (status === 'Confirmed') {
                await mailer.send({
                    to: donorEmail,
                    subject: 'Bağışınız için teşekkürler!',
                    text: `Merhaba ${donorName},\n\n${amount} ₺ tutarındaki bağışınız alındı. Referans: ${referenceCode}`
                })
            }

            const result = { referenceCode, status, method, amount }
            if (method === 'IBAN') Object.assign(result, { bankName, iban, accountHolder })
            return result
        })

        this.on('applyVolunteer', async req => {
            const data = req.data
            const app = {
                firstName: clean(data.firstName),
                lastName: clean(data.lastName),
                email: clean(data.email).toLowerCase(),
                phone: clean(data.phone),
                area_code: data.areaCode,
                availability: clean(data.availability) || null,
                motivation: clean(data.motivation),
                consentGiven: data.consentGiven === true
            }

            if (app.firstName.length < 2) return req.reject(400, 'FIRST_NAME_REQUIRED', 'firstName')
            if (app.lastName.length < 2) return req.reject(400, 'LAST_NAME_REQUIRED', 'lastName')
            if (!EMAIL.test(app.email)) return req.reject(400, 'EMAIL_INVALID', 'email')
            if (!PHONE.test(app.phone)) return req.reject(400, 'PHONE_INVALID', 'phone')
            if (app.motivation.length < 20) return req.reject(400, 'MOTIVATION_TOO_SHORT', 'motivation', [20])
            if (!app.consentGiven) return req.reject(400, 'CONSENT_REQUIRED', 'consentGiven')

            const area = await SELECT.one.from(VolunteerAreas, { code: app.area_code })
            if (!area) return req.reject(400, 'AREA_INVALID', 'areaCode')

            const pending = await SELECT.one.from(VolunteerApplications).where({ email: app.email, status: 'Pending' })
            if (pending) return req.reject(409, 'APPLICATION_ALREADY_PENDING')

            await INSERT.into(VolunteerApplications).entries(app)
            await mailer.send({
                to: app.email,
                subject: 'Gönüllü başvurunuz alındı',
                text: `Merhaba ${app.firstName},\n\nBaşvurunuz bize ulaştı. Ekibimiz en kısa sürede inceleyip size dönüş yapacak.`
            })
            return 'OK'
        })

        this.on('sendContactMessage', async req => {
            const data = req.data
            const msg = {
                name: clean(data.name),
                email: clean(data.email).toLowerCase(),
                subject: clean(data.subject),
                message: clean(data.message),
                consentGiven: data.consentGiven === true
            }

            if (msg.name.length < 2) return req.reject(400, 'NAME_REQUIRED', 'name')
            if (!EMAIL.test(msg.email)) return req.reject(400, 'EMAIL_INVALID', 'email')
            if (msg.subject.length < 3) return req.reject(400, 'SUBJECT_REQUIRED', 'subject')
            if (msg.message.length < 10) return req.reject(400, 'MESSAGE_TOO_SHORT', 'message', [10])
            if (!msg.consentGiven) return req.reject(400, 'CONSENT_REQUIRED', 'consentGiven')

            await INSERT.into(ContactMessages).entries(msg)
            await mailer.send({
                to: msg.email,
                subject: `Mesajınızı aldık: ${msg.subject}`,
                text: `Merhaba ${msg.name},\n\nMesajınız bize ulaştı. En kısa sürede size dönüş yapacağız.`
            })
            return 'OK'
        })

        return super.init()
    }
}

const clean = value => (typeof value === 'string' ? value.trim() : '')

/** Örn. PG-2026-7K3QX9 — karışmaması için 0/O, 1/I harfleri kullanılmaz. */
function newReferenceCode() {
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    const random = Array.from(crypto.randomBytes(6), b => alphabet[b % alphabet.length]).join('')
    return `PG-${new Date().getFullYear()}-${random}`
}
