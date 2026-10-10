// Entegrasyon testleri (OPA5) — gerçek uygulamayı gerçek CAP backend'iyle çalıştırır.
sap.ui.define([
    "sap/ui/test/Opa5",
    "./arrangements/Startup",
    "./NavigationJourney",
    "./FormJourney"
], function (Opa5, Startup) {
    "use strict";

    Opa5.extendConfig({
        arrangements: new Startup(),
        viewNamespace: "pg.site.view.",
        autoWait: true,
        timeout: 30
    });
});
