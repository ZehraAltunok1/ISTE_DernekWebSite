sap.ui.define([
    "sap/ui/test/Opa5"
], function (Opa5) {
    "use strict";

    return Opa5.extend("pg.site.test.integration.arrangements.Startup", {

        /**
         * Uygulamayı bileşen (component) olarak başlatır.
         * @param {string} [sHash] açılacak sayfanın adresi, ör. "kampanyalar"
         */
        iStartMyApp: function (sHash) {
            this.iStartMyUIComponent({
                componentConfig: {
                    name: "pg.site",
                    async: true
                },
                hash: sHash || ""
            });
        }
    });
});
