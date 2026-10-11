const cds = require('@sap/cds')

module.exports = class MemberService extends cds.ApplicationService {
    init() {
        const { Profile, MyEventRegistrations } = this.entities
        const db = cds.entities('pg')

        this.on('me', async req => {
            const profile = await ensureProfile(req.user)
            return {
                email: req.user.id,
                displayName: profile.displayName,
                roles: Object.keys(req.user.roles ?? {}).filter(r => req.user.is(r))
            }
        })

        // Profil satırı yoksa (yeni üye) okumadan önce oluştur; böylece arayüz hep bir kayıt bulur.
        this.before('READ', Profile, req => ensureProfile(req.user))

        // E-posta, oturumdaki kullanıcıya bağlı anahtardır; değiştirilemez (anahtar zaten PATCH'te gönderilemez).
        this.before('UPDATE', Profile, req => {
            const { displayName, phone } = req.data
            if (displayName !== undefined && !displayName?.trim()) req.error(400, 'NAME_REQUIRED', 'displayName')
            if (phone && !/^[0-9 +()-]{10,20}$/.test(phone)) req.error(400, 'PHONE_INVALID', 'phone')
        })

        /**
         * Kayıt iptali: yalnızca henüz başlamamış etkinlikte. Kayıt silinir ve
         * etkinliğin kayıt sayısı aynı işlemde (transaction) bir azaltılır.
         * Başka üyenin kaydı @restrict sayesinde buraya hiç ulaşmaz (CAP 403 döner).
         */
        this.on('cancel', MyEventRegistrations, async req => {
            const key = req.params.at(-1)
            const id = key.ID ?? key
            const reg = await SELECT.one.from(db.EventRegistrations, id)
                .where({ email: req.user.id })
                .columns('ID', 'event_ID', 'attendance')
            if (!reg) return req.reject(404)

            const event = await SELECT.one.from(db.Events, reg.event_ID).columns('startDateTime')
            if (new Date(event.startDateTime) <= new Date()) return req.reject(409, 'EVENT_PAST')

            await DELETE.from(db.EventRegistrations, reg.ID)
            await UPDATE(db.Events, reg.event_ID)
                .set`registeredCount = registeredCount - 1`
                .where`registeredCount > 0`
        })

        return super.init()
    }
}

async function ensureProfile(user) {
    const { MemberProfiles } = cds.entities('pg')
    let profile = await SELECT.one.from(MemberProfiles, user.id)
    if (!profile) {
        profile = { email: user.id, displayName: user.attr?.name ?? user.id }
        await INSERT.into(MemberProfiles).entries(profile)
    }
    return profile
}
