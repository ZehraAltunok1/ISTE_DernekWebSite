/**
 * Üye alanı testleri — kimlik doğrulama, "yalnızca kendi kayıtların" kuralı,
 * profil güncelleme ve etkinlik kaydı iptali.
 */
const cds = require('@sap/cds')
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const { GET, POST, PATCH } = cds.test(__dirname + '/..')

const SITE = '/odata/v4/site'
const MEMBER = '/odata/v4/member'
const ADMIN = '/odata/v4/admin'
const UYE = { auth: { username: 'uye@example.com', password: 'uye123' } }
const ADMIN_USER = { auth: { username: 'admin@example.com', password: 'admin123' } }

const SEMINAR = 'e1000000-0000-4000-8000-000000000004'         // gelecekte; üyenin kaydı var
const UYE_SEMINAR_REG = 'e2000000-0000-4000-8000-000000000901'
const UYE_PAST_REG = 'e2000000-0000-4000-8000-000000000902'   // geçmiş etkinlik
const OTHER_REG = 'e2000000-0000-4000-8000-000000000001'      // başka bir kişinin kaydı
const OTHER_DONATION = 'd0000000-0000-4000-8000-000000000001'

async function failure(request) {
    try {
        await request
    } catch (error) {
        return { status: error.status ?? error.response?.status, code: error.response?.data?.error?.code }
    }
    assert.fail('İstek başarısız olmalıydı ama başarılı oldu')
}

const registeredCount = async id =>
    (await GET(`${ADMIN}/Events(ID=${id},IsActiveEntity=true)?$select=registeredCount`, ADMIN_USER)).data.registeredCount

describe('Üye alanı — giriş', () => {

    it('giriş yapmamış kullanıcıyı ve yanlış şifreyi reddeder (401)', async () => {
        assert.equal((await failure(GET(`${MEMBER}/me()`))).status, 401)
        const wrong = { auth: { username: 'uye@example.com', password: 'yanlis' } }
        assert.equal((await failure(GET(`${MEMBER}/me()`, wrong))).status, 401)
    })

    it('uygulamanın isteğinde 401 yanıtı tarayıcı giriş penceresini tetiklemez', async () => {
        const headers = { 'X-Requested-With': 'XMLHttpRequest' }
        const wrong = { headers, auth: { username: 'uye@example.com', password: 'yanlis' } }
        try {
            await GET(`${MEMBER}/me()`, wrong)
            assert.fail('401 bekleniyordu')
        } catch (error) {
            assert.equal(error.response.status, 401)
            assert.equal(error.response.headers['www-authenticate'], undefined)
        }
    })

    it('me() kullanıcının e-postasını, adını ve rolünü döner', async () => {
        const { data } = await GET(`${MEMBER}/me()`, UYE)
        assert.equal(data.email, 'uye@example.com')
        assert.equal(data.displayName, 'Demo Üye')
        assert.deepEqual(data.roles, ['member'])
    })

    it('profili olmayan kullanıcıya ilk girişte profil oluşturur', async () => {
        const { data } = await GET(`${MEMBER}/Profile`, ADMIN_USER)
        assert.equal(data.value.length, 1)
        assert.equal(data.value[0].email, 'admin@example.com')
        assert.equal(data.value[0].displayName, 'Demo Yönetici')
    })
})

describe('Üye alanı — yalnızca kendi kayıtları', () => {

    it('bağışlarım: yalnızca üyenin bağışları', async () => {
        const { data } = await GET(`${MEMBER}/MyDonations?$orderby=createdAt`, UYE)
        assert.equal(data.value.length, 2)
        assert.ok(data.value.every(d => d.donorEmail === 'uye@example.com'))
        assert.equal(data.value[0].campaignTitle.length > 0, true, 'kampanya adı da gelir')
    })

    it('başkasının kaydını ID ile istemek 404 döner', async () => {
        assert.equal((await failure(GET(`${MEMBER}/MyDonations(${OTHER_DONATION})`, UYE))).status, 404)
        assert.equal((await failure(GET(`${MEMBER}/MyEventRegistrations(${OTHER_REG})`, UYE))).status, 404)
    })

    it('başvurularım ve etkinliklerim', async () => {
        const vol = await GET(`${MEMBER}/MyVolunteerApplications`, UYE)
        assert.equal(vol.data.value.length, 1)
        assert.equal(vol.data.value[0].status, 'Approved')
        const regs = await GET(`${MEMBER}/MyEventRegistrations`, UYE)
        assert.equal(regs.data.value.length, 2)
    })

    it('profil yalnızca kendi profilini gösterir ve güncellenebilir', async () => {
        const { data } = await GET(`${MEMBER}/Profile`, UYE)
        assert.equal(data.value.length, 1)
        await PATCH(`${MEMBER}/Profile('uye@example.com')`, { city: 'İskenderun', notifyCampaigns: true }, UYE)
        const after = await GET(`${MEMBER}/Profile('uye@example.com')`, UYE)
        assert.equal(after.data.city, 'İskenderun')
        assert.equal((await failure(PATCH(`${MEMBER}/Profile('uye@example.com')`, { displayName: '  ' }, UYE))).code, 'NAME_REQUIRED')
        // Okumada başkasının kaydı "yok" (404) görünür; yazma ve action'da CAP 403 döner.
        assert.equal((await failure(PATCH(`${MEMBER}/Profile('admin@example.com')`, { city: 'X' }, UYE))).status, 403)
    })
})

describe('Üye alanı — etkinlik kaydı iptali', () => {

    it('geçmiş etkinliğin kaydı iptal edilemez', async () => {
        const { code } = await failure(POST(`${MEMBER}/MyEventRegistrations(${UYE_PAST_REG})/MemberService.cancel`, {}, UYE))
        assert.equal(code, 'EVENT_PAST')
    })

    it('başkasının kaydı iptal edilemez', async () => {
        const { status } = await failure(POST(`${MEMBER}/MyEventRegistrations(${OTHER_REG})/MemberService.cancel`, {}, UYE))
        assert.equal(status, 403)
    })

    it('iptal kaydı siler ve kontenjanı geri açar; aynı e-postayla yeniden kayıt olunabilir', async () => {
        const before = await registeredCount(SEMINAR)
        await POST(`${MEMBER}/MyEventRegistrations(${UYE_SEMINAR_REG})/MemberService.cancel`, {}, UYE)
        assert.equal(await registeredCount(SEMINAR), before - 1)

        await POST(`${SITE}/registerForEvent`, { eventID: SEMINAR, name: 'Demo Üye', email: 'uye@example.com', consentGiven: true })
        assert.equal(await registeredCount(SEMINAR), before)
    })
})
