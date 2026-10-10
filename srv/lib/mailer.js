const cds = require('@sap/cds')
const LOG = cds.log('mail')

/**
 * Demo e-posta gönderici: gerçek e-posta göndermez, konsola yazar.
 * Gerçek bir sağlayıcıya geçmek için yalnızca bu dosyanın değişmesi yeterlidir.
 */
async function send({ to, subject, text }) {
    LOG.info(`\n──── E-POSTA (demo) ────\nKime : ${to}\nKonu : ${subject}\n\n${text}\n────────────────────────`)
}

module.exports = { send }
