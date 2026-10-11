const cds = require('@sap/cds')
const { shiftDemoDates } = require('./srv/lib/demo-dates')

// Sunucu ayağa kalkınca (veritabanı demo verisiyle dolduktan sonra) demo tarihlerini bugüne taşı.
// Kalıcı bir veritabanı kullanılırsa bu adım atlanır: cds.requires.db.credentials.url ':memory:' değilse.
cds.on('served', async () => {
    const url = cds.env.requires.db?.credentials?.url
    if (url === ':memory:') await shiftDemoDates()
})

module.exports = cds.server
