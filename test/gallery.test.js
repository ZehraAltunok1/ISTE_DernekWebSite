/**
 * Galeri testleri — yayın kuralları, seçki fotoğrafları ve taslak (draft) akışında
 * sunucu doğrulaması.
 */
const cds = require('@sap/cds')
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const { GET, POST, PATCH } = cds.test(__dirname + '/..')

const SITE = '/odata/v4/site'
const ADMIN = '/odata/v4/admin'
const ADMIN_USER = { auth: { username: 'admin@example.com', password: 'admin123' } }

const FEEDING_ALBUM = 'a1000000-0000-4000-8000-000000000001' // etkinliğe bağlı, 5 fotoğraf
const WINTER_ALBUM = 'a1000000-0000-4000-8000-000000000004'  // yayında değil

async function failure(request) {
    try {
        await request
    } catch (error) {
        return { status: error.status ?? error.response?.status, code: error.response?.data?.error?.code, error: error.response?.data?.error }
    }
    assert.fail('İstek başarısız olmalıydı ama başarılı oldu')
}

const draftOf = id => `${ADMIN}/Albums(ID=${id},IsActiveEntity=false)`

describe('Galeri — herkese açık', () => {

    it('yalnızca yayındaki albümleri ve onların fotoğraflarını gösterir', async () => {
        const { data } = await GET(`${SITE}/Albums?$select=ID`)
        assert.equal(data.value.length, 3)
        assert.equal((await failure(GET(`${SITE}/Albums(${WINTER_ALBUM})`))).status, 404)

        const media = await GET(`${SITE}/MediaItems?$filter=album_ID eq ${WINTER_ALBUM}`)
        assert.equal(media.data.value.length, 0, 'yayında olmayan albümün fotoğrafı sızmamalı')
    })

    it('albümü fotoğraf sayısı ve bağlı etkinlikle birlikte verir', async () => {
        const { data } = await GET(`${SITE}/Albums(${FEEDING_ALBUM})?$expand=media($orderby=sortOrder;$count=true),event($select=title)`)
        assert.equal(Number(data['media@odata.count']), 5)
        assert.equal(data.media[0].layout, 'Wide')
        assert.equal(data.event.title, 'Hafta Sonu Besleme Maratonu')
    })

    it('Hakkımızda seçkisi için 5 fotoğraf işaretli', async () => {
        const { data } = await GET(`${SITE}/MediaItems?$filter=featured eq true&$count=true&$top=0`)
        assert.equal(Number(data['@odata.count']), 5)
    })
})

describe('Galeri — yönetim (taslak akışı)', () => {

    it('fotoğrafı olmayan albüm yayınlanamaz', async () => {
        const { data } = await POST(`${ADMIN}/Albums`, { title: 'Boş albüm', albumDate: '2026-10-01', isPublished: true }, ADMIN_USER)
        const { status, code } = await failure(POST(`${draftOf(data.ID)}/AdminService.draftActivate`, {}, ADMIN_USER))
        assert.equal(status, 400)
        assert.equal(code, 'ALBUM_EMPTY')
    })

    it('güvensiz görsel adresini reddeder, düzeltilince yayınlar', async () => {
        const { data } = await POST(`${ADMIN}/Albums`, { title: 'Yeni albüm', albumDate: '2026-10-02', isPublished: true }, ADMIN_USER)
        const photo = await POST(`${draftOf(data.ID)}/media`, { url: 'javascript:alert(1)', caption: 'x' }, ADMIN_USER)

        const { status, error } = await failure(POST(`${draftOf(data.ID)}/AdminService.draftActivate`, {}, ADMIN_USER))
        assert.equal(status, 400)
        assert.equal(error.code, 'MEDIA_URL_INVALID')

        await PATCH(`${ADMIN}/MediaItems(ID=${photo.data.ID},IsActiveEntity=false)`, { url: '/site/webapp/images/photos/sokak-kedisi.jpg' }, ADMIN_USER)
        await POST(`${draftOf(data.ID)}/AdminService.draftActivate`, {}, ADMIN_USER)

        const site = await GET(`${SITE}/Albums(${data.ID})?$expand=media`)
        assert.equal(site.data.media.length, 1)
    })
})
