/**
 * Etkinlik testleri — kayıt kuralları, atomik kapasite kontrolü, katılım işaretleme
 * ve demo tarihlerinin kaydırılması.
 */
const cds = require('@sap/cds')
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { addDays } = require('../srv/lib/demo-dates')

const { GET, POST, DELETE } = cds.test(__dirname + '/..')

const SITE = '/odata/v4/site'
const ADMIN = '/odata/v4/admin'
const ADMIN_USER = { auth: { username: 'admin@example.com', password: 'admin123' } }

const ADOPTION_DAY = 'e1000000-0000-4000-8000-000000000001' // kapasite 60, 3 kayıt
const ORIENTATION = 'e1000000-0000-4000-8000-000000000002'  // kapasite 4, 4 kayıt (dolu)
const FEEDING_TOUR = 'e1000000-0000-4000-8000-000000000003' // kapasite 25, 2 kayıt
const PAST_EVENT = 'e1000000-0000-4000-8000-000000000006'
const CANCELLED = 'e1000000-0000-4000-8000-000000000007'
const DRAFT = 'e1000000-0000-4000-8000-000000000008'

async function failure(request) {
    try {
        await request
    } catch (error) {
        return { status: error.status ?? error.response?.status, code: error.response?.data?.error?.code }
    }
    assert.fail('İstek başarısız olmalıydı ama başarılı oldu')
}

const registration = (eventID, email = 'katilimci@example.com') =>
    ({ eventID, name: 'Test Katılımcı', email, consentGiven: true })

const registeredCount = async id => (await GET(`${ADMIN}/Events(ID=${id},IsActiveEntity=true)?$select=registeredCount`, ADMIN_USER)).data.registeredCount

describe('Etkinlikler — herkese açık', () => {

    it('taslakları göstermez, kayıt listesini vermez', async () => {
        const { data } = await GET(`${SITE}/Events?$select=ID,status`)
        assert.ok(data.value.every(e => e.status !== 'Draft'))
        assert.equal((await failure(GET(`${SITE}/Events(${DRAFT})`))).status, 404)
        assert.equal((await failure(GET(`${SITE}/EventRegistrations`))).status, 404)
    })
})

describe('Etkinlikler — kayıt', () => {

    it('kaydı alır ve sayacı sunucuda artırır', async () => {
        const before = await registeredCount(ADOPTION_DAY)
        await POST(`${SITE}/registerForEvent`, registration(ADOPTION_DAY))
        assert.equal(await registeredCount(ADOPTION_DAY), before + 1)
    })

    it('aynı e-postayla ikinci kaydı engeller (büyük/küçük harf duyarsız)', async () => {
        const { code } = await failure(POST(`${SITE}/registerForEvent`, registration(ADOPTION_DAY, 'KATILIMCI@example.com')))
        assert.equal(code, 'EVENT_ALREADY_REGISTERED')
    })

    it('dolu, iptal edilmiş ve geçmiş etkinliğe kayıt almaz', async () => {
        assert.equal((await failure(POST(`${SITE}/registerForEvent`, registration(ORIENTATION)))).code, 'EVENT_FULL')
        assert.equal((await failure(POST(`${SITE}/registerForEvent`, registration(CANCELLED)))).code, 'EVENT_CANCELLED')
        assert.equal((await failure(POST(`${SITE}/registerForEvent`, registration(PAST_EVENT)))).code, 'EVENT_PAST')
        assert.equal((await failure(POST(`${SITE}/registerForEvent`, registration(DRAFT)))).status, 404)
    })

    it('aynı anda gelen kayıtlar kapasiteyi aşamaz', async () => {
        // Kampüs Besleme Turu: kapasite 25, 2 kayıt → 23 boş yer; 30 eşzamanlı kayıt deneyelim
        const results = await Promise.allSettled(
            Array.from({ length: 30 }, (_, i) => POST(`${SITE}/registerForEvent`, registration(FEEDING_TOUR, `yarış${i}@example.com`)))
        )
        const ok = results.filter(r => r.status === 'fulfilled').length
        assert.equal(ok, 23)
        assert.equal(await registeredCount(FEEDING_TOUR), 25)
    })

    it('KVKK onayı olmadan kayıt almaz', async () => {
        const { code } = await failure(POST(`${SITE}/registerForEvent`, { ...registration(ADOPTION_DAY, 'onaysiz@example.com'), consentGiven: false }))
        assert.equal(code, 'CONSENT_REQUIRED')
    })
})

describe('Etkinlikler — yönetim', () => {

    it('katılımı işaretler', async () => {
        const id = 'e2000000-0000-4000-8000-000000000001'
        const { data } = await POST(`${ADMIN}/EventRegistrations(${id})/AdminService.markAttended`, {}, ADMIN_USER)
        assert.equal(data.attendance, 'Attended')
    })

    it('kaydı olan etkinlik silinemez', async () => {
        const { code } = await failure(DELETE(`${ADMIN}/Events(ID=${ADOPTION_DAY},IsActiveEntity=true)`, ADMIN_USER))
        assert.equal(code, 'EVENT_HAS_REGISTRATIONS')
    })
})

describe('Demo tarihleri', () => {

    it('tarih ve zaman damgalarını gün olarak kaydırır', () => {
        assert.equal(addDays('2026-10-11', 7), '2026-10-18')
        assert.equal(addDays('2026-12-30', 7), '2027-01-06')
        assert.equal(addDays('2026-10-18T07:00:00Z', 14), '2026-11-01T07:00:00.000Z')
        assert.equal(addDays(null, 7), null)
    })
})
