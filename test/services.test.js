/**
 * Backend servis testleri — çalıştırmak için: npm test
 *
 * cds.test() projeyi bellek içi bir veritabanıyla başlatır ve demo verisini (db/data/*.csv) yükler.
 * Testler bu verilere dayanır; her test dosyası temiz bir veritabanıyla başlar.
 */
const cds = require('@sap/cds')
const { describe, it, before } = require('node:test')
const assert = require('node:assert/strict')

const { GET, POST, DELETE } = cds.test(__dirname + '/..')

const SITE = '/odata/v4/site'
const ADMIN = '/odata/v4/admin'
const ADMIN_USER = { auth: { username: 'admin@example.com', password: 'admin123' } }
const MEMBER_USER = { auth: { username: 'uye@example.com', password: 'uye123' } }

const KIS_YUVASI = 'c0000000-0000-4000-8000-000000000001'
const ACIL_TEDAVI = 'c0000000-0000-4000-8000-000000000002'
const TASLAK_KAMPANYA = 'c0000000-0000-4000-8000-000000000005'

/** Hata fırlatan isteğin HTTP durum kodunu ve sunucu mesaj kodunu döndürür. */
async function failure(request) {
    try {
        await request
    } catch (error) {
        return { status: error.status ?? error.response?.status, code: error.response?.data?.error?.code }
    }
    assert.fail('İstek başarısız olmalıydı ama başarılı oldu')
}

const raisedAmount = async id => Number((await GET(`${SITE}/Campaigns(${id})?$select=raisedAmount`)).data.raisedAmount)

const donation = overrides => ({
    campaignID: KIS_YUVASI,
    donorName: 'Test Bağışçı',
    donorEmail: 'test@example.com',
    amount: 100,
    method: 'IBAN',
    ...overrides
})

before(() => {
    // Kart simülasyonu testlerde her zaman başarılı olsun
    cds.env.demo = { ...cds.env.demo, cardFailureRate: 0 }
})

describe('SiteService — herkese açık okuma', () => {

    it('taslak kampanyaları göstermez', async () => {
        const { data } = await GET(`${SITE}/Campaigns?$select=ID,status`)
        assert.ok(data.value.length > 0)
        assert.ok(data.value.every(c => c.status !== 'Draft'))
        assert.equal((await failure(GET(`${SITE}/Campaigns(${TASLAK_KAMPANYA})`))).status, 404)
    })

    it('anonim bağışçının adını gizler ve e-postayı hiç vermez', async () => {
        const { data } = await GET(`${SITE}/RecentDonations?$filter=campaign_ID eq ${KIS_YUVASI}`)
        assert.ok(data.value.some(d => d.donorName === 'Anonim Bağışçı'))
        assert.ok(data.value.every(d => !('donorEmail' in d)))
        assert.equal((await failure(GET(`${SITE}/RecentDonations?$select=donorEmail`))).status, 400)
    })

    it('yalnızca yayında ve süresi dolmamış duyuruları gösterir', async () => {
        const { data } = await GET(`${SITE}/Announcements`)
        const titles = data.value.map(a => a.title)
        assert.ok(!titles.includes('Taslak duyuru'), 'pasif duyuru görünmemeli')
        assert.ok(!titles.includes('Yaz besleme rotası sona erdi'), 'süresi dolan duyuru görünmemeli')
    })

    it('ziyaretçinin entity\'lere doğrudan yazmasına izin vermez', async () => {
        const { status } = await failure(POST(`${SITE}/Announcements`, { title: 'x', body: 'y' }))
        assert.equal(status, 405)
    })
})

describe('SiteService — bağış', () => {

    it('geçersiz tutarı ve e-postayı reddeder', async () => {
        assert.equal((await failure(POST(`${SITE}/donate`, donation({ amount: 5 })))).code, 'AMOUNT_RANGE')
        assert.equal((await failure(POST(`${SITE}/donate`, donation({ donorEmail: 'bozuk' })))).code, 'EMAIL_INVALID')
        assert.equal((await failure(POST(`${SITE}/donate`, donation({ method: 'Cash' })))).code, 'METHOD_INVALID')
    })

    it('taslak kampanyaya bağış kabul etmez', async () => {
        const { status, code } = await failure(POST(`${SITE}/donate`, donation({ campaignID: TASLAK_KAMPANYA })))
        assert.equal(status, 409)
        assert.equal(code, 'CAMPAIGN_NOT_ACTIVE')
    })

    it('IBAN bağışını "Bekliyor" olarak kaydeder ve toplamı değiştirmez', async () => {
        const before = await raisedAmount(KIS_YUVASI)
        const { data } = await POST(`${SITE}/donate`, donation({ amount: 250 }))
        assert.equal(data.status, 'Pending')
        assert.match(data.referenceCode, /^PG-\d{4}-[A-Z2-9]{6}$/)
        assert.ok(data.iban, 'IBAN bilgisi dönmeli')
        assert.equal(await raisedAmount(KIS_YUVASI), before)
    })

    it('başarılı kart simülasyonu kampanya toplamını hemen artırır', async () => {
        const before = await raisedAmount(ACIL_TEDAVI)
        const { data } = await POST(`${SITE}/donate`, donation({ campaignID: ACIL_TEDAVI, method: 'Card', amount: 150 }))
        assert.equal(data.status, 'Confirmed')
        assert.ok(!data.iban, 'kart bağışında IBAN bilgisi dönmemeli')
        assert.equal(await raisedAmount(ACIL_TEDAVI), before + 150)
    })
})

describe('SiteService — gönüllü başvurusu', () => {
    const application = {
        firstName: 'Deniz',
        lastName: 'Test',
        email: 'deniz.test@example.com',
        phone: '0555 000 00 99',
        areaCode: 'care',
        motivation: 'Barınaktaki hayvanlara düzenli olarak yardım etmek istiyorum.',
        consentGiven: true
    }

    it('KVKK onayı olmadan başvuru almaz', async () => {
        const { code } = await failure(POST(`${SITE}/applyVolunteer`, { ...application, consentGiven: false }))
        assert.equal(code, 'CONSENT_REQUIRED')
    })

    it('aynı e-postayla ikinci bekleyen başvuruyu engeller (büyük/küçük harf duyarsız)', async () => {
        await POST(`${SITE}/applyVolunteer`, application)
        const { status, code } = await failure(POST(`${SITE}/applyVolunteer`, { ...application, email: 'DENIZ.TEST@example.com' }))
        assert.equal(status, 409)
        assert.equal(code, 'APPLICATION_ALREADY_PENDING')
    })
})

describe('AdminService — yetki', () => {

    it('giriş yapmamış kullanıcıyı reddeder (401)', async () => {
        assert.equal((await failure(GET(`${ADMIN}/Donations`))).status, 401)
    })

    it('admin rolü olmayan üyeyi reddeder (403)', async () => {
        assert.equal((await failure(GET(`${ADMIN}/Donations`, MEMBER_USER))).status, 403)
    })

    it('CAP\'in varsayılan şifresiz demo kullanıcıları kapalıdır', async () => {
        const alice = { auth: { username: 'alice', password: '' } }
        assert.equal((await failure(GET(`${ADMIN}/Donations`, alice))).status, 401)
    })

    it('yöneticiye izin verir', async () => {
        const { status } = await GET(`${ADMIN}/Donations`, ADMIN_USER)
        assert.equal(status, 200)
    })
})

describe('AdminService — bağış onayı', () => {
    const PENDING_DONATION = 'd0000000-0000-4000-8000-000000000005' // 1000 ₺, Kışlık Yuva

    it('bekleyen bağışı onaylar ve kampanya toplamını artırır', async () => {
        const before = await raisedAmount(KIS_YUVASI)
        const { data } = await POST(`${ADMIN}/Donations(${PENDING_DONATION})/AdminService.confirm`, {}, ADMIN_USER)
        assert.equal(data.status, 'Confirmed')
        assert.equal(await raisedAmount(KIS_YUVASI), before + 1000)
    })

    it('aynı bağışı ikinci kez onaylamaz (durum geçişi sunucuda denetlenir)', async () => {
        const { status, code } = await failure(POST(`${ADMIN}/Donations(${PENDING_DONATION})/AdminService.confirm`, {}, ADMIN_USER))
        assert.equal(status, 409)
        assert.equal(code, 'DONATION_NOT_PENDING')
    })

    it('reddetmek için gerekçe ister', async () => {
        const pending = 'd0000000-0000-4000-8000-000000000014'
        assert.equal((await failure(POST(`${ADMIN}/Donations(${pending})/AdminService.decline`, {}, ADMIN_USER))).status, 400)
        const { data } = await POST(`${ADMIN}/Donations(${pending})/AdminService.decline`, { reason: 'Havale gelmedi' }, ADMIN_USER)
        assert.equal(data.status, 'Rejected')
    })

    it('bağış almış kampanyanın silinmesini engeller', async () => {
        const { status, code } = await failure(DELETE(`${ADMIN}/Campaigns(ID=${KIS_YUVASI},IsActiveEntity=true)`, ADMIN_USER))
        assert.equal(status, 409)
        assert.equal(code, 'CAMPAIGN_HAS_DONATIONS')
    })
})

describe('İletişim mesajları', () => {
    const message = {
        name: 'Test Ziyaretçi',
        email: 'ziyaretci@example.com',
        subject: 'Bilgi talebi',
        message: 'Gönüllülük hakkında bilgi almak istiyorum.',
        consentGiven: true
    }

    it('kısa mesajı ve onaysız gönderimi reddeder', async () => {
        assert.equal((await failure(POST(`${SITE}/sendContactMessage`, { ...message, message: 'kısa' }))).code, 'MESSAGE_TOO_SHORT')
        assert.equal((await failure(POST(`${SITE}/sendContactMessage`, { ...message, consentGiven: false }))).code, 'CONSENT_REQUIRED')
    })

    it('mesajı kaydeder; yönetici "yanıtlandı" olarak işaretler, ikinci kez işaretleyemez', async () => {
        await POST(`${SITE}/sendContactMessage`, message)
        const { data } = await GET(`${ADMIN}/ContactMessages?$filter=email eq 'ziyaretci@example.com'`, ADMIN_USER)
        assert.equal(data.value.length, 1)
        assert.equal(data.value[0].status, 'New')

        const id = data.value[0].ID
        const answered = await POST(`${ADMIN}/ContactMessages(${id})/AdminService.markAnswered`, { note: 'E-postayla yanıtlandı' }, ADMIN_USER)
        assert.equal(answered.data.status, 'Answered')
        assert.equal((await failure(POST(`${ADMIN}/ContactMessages(${id})/AdminService.markAnswered`, {}, ADMIN_USER))).code, 'MESSAGE_NOT_NEW')
    })

    it('mesajlar herkese açık servisten okunamaz', async () => {
        assert.equal((await failure(GET(`${SITE}/ContactMessages`))).status, 404)
    })
})
