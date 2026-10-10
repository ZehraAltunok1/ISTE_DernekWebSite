const cds = require('@sap/cds')

/**
 * Demo ayarları. Bu proje hayalidir: IBAN ve banka bilgileri gerçek değildir.
 * package.json → cds.demo altında değiştirilebilir.
 */
const defaults = {
    bankName: 'Örnek Bankası (Demo)',
    iban: 'TR00 0000 0000 0000 0000 0000 00',
    accountHolder: 'Pati ve Gelecek Derneği (Hayali)',
    // Kart simülasyonunda başarısız ödeme olasılığı (0–1). Testlerde 0 yapılır.
    cardFailureRate: 0.1
}

module.exports = {
    get config() {
        return { ...defaults, ...cds.env.demo }
    }
}
