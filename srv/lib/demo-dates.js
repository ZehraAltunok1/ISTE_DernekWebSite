const cds = require('@sap/cds')
const LOG = cds.log('demo')

/**
 * Demo verisindeki tarihler 11 Ekim 2026'ya göre yazıldı. Proje aylar sonra klonlansa bile
 * "yaklaşan etkinlikler" ve "kampanyanın bitmesine X gün" ekranları anlamlı kalsın diye,
 * sunucu açılışında tarihleri o günden bu yana geçen TAM HAFTA kadar ileri kaydırırız
 * (haftanın günleri korunur). Yalnızca bellek içi demo veritabanında çalışır.
 */
const ANCHOR = Date.UTC(2026, 9, 11) // 11 Ekim 2026
const DAY = 24 * 60 * 60 * 1000

const addDays = (value, days) => {
    if (!value) return value
    const isDateOnly = value.length === 10
    const d = new Date(isDateOnly ? value + 'T00:00:00Z' : value)
    d.setTime(d.getTime() + days * DAY)
    return isDateOnly ? d.toISOString().slice(0, 10) : d.toISOString()
}

async function shiftDemoDates(now = Date.now()) {
    const weeks = Math.floor((now - ANCHOR) / (7 * DAY))
    if (weeks <= 0) return 0
    const days = weeks * 7
    const { Events, Campaigns } = cds.entities('pg')

    for (const e of await SELECT.from(Events).columns('ID', 'startDateTime', 'endDateTime')) {
        await UPDATE(Events, e.ID).with({ startDateTime: addDays(e.startDateTime, days), endDateTime: addDays(e.endDateTime, days) })
    }
    for (const c of await SELECT.from(Campaigns).columns('ID', 'startDate', 'endDate')) {
        await UPDATE(Campaigns, c.ID).with({ startDate: addDays(c.startDate, days), endDate: addDays(c.endDate, days) })
    }
    LOG.info(`Demo tarihleri ${days} gün ileri kaydırıldı`)
    return days
}

module.exports = { shiftDemoDates, addDays }
