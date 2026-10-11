const cds = require('@sap/cds')
const { shiftDemoDates } = require('./srv/lib/demo-dates')

// Sunucu ayağa kalkınca (veritabanı demo verisiyle dolduktan sonra) demo tarihlerini bugüne taşı.
// Kalıcı bir veritabanı kullanılırsa bu adım atlanır: cds.requires.db.credentials.url ':memory:' değilse.
cds.on('served', async () => {
    const url = cds.env.requires.db?.credentials?.url
    if (url === ':memory:') await shiftDemoDates()
})

/*
 * Üye alanı girişi uygulamanın kendi penceresinden yapılır (UI5 → fetch / OData).
 * Sunucu 401 yanıtına "WWW-Authenticate: Basic" eklerse bazı tarayıcılar kendi giriş
 * penceresini açar ya da isteği askıda bırakır. Uygulamanın gönderdiği isteklerde
 * (X-Requested-With başlığı) bu başlığı çıkarıyoruz; tarayıcıyla doğrudan açılan
 * adreslerde (ör. /odata/v4/admin) davranış değişmez.
 */
cds.on('bootstrap', app => {
    app.use('/odata/v4/member', (req, res, next) => {
        if (req.get('x-requested-with') === 'XMLHttpRequest') {
            const setHeader = res.setHeader
            res.setHeader = function (name, value) {
                if (String(name).toLowerCase() === 'www-authenticate') return this
                return setHeader.call(this, name, value)
            }
        }
        next()
    })
})

module.exports = cds.server
