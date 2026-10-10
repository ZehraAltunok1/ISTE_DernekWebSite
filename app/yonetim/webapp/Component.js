sap.ui.define([
    "sap/fe/core/AppComponent"
], function (AppComponent) {
    "use strict";

    /**
     * Fiori elements uygulaması: ekranların çoğu annotations.cds'ten otomatik üretilir.
     * Burada yazılan kod yok denecek kadar azdır — bütün tanım manifest.json'dadır.
     */
    return AppComponent.extend("pg.yonetim.Component", {
        metadata: {
            manifest: "json"
        }
    });
});
