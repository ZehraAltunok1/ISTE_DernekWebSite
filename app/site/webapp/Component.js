sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "pg/site/model/models"
], function (UIComponent, Device, models) {
    "use strict";

    return UIComponent.extend("pg.site.Component", {

        metadata: {
            manifest: "json",
            interfaces: ["sap.ui.core.IAsyncContentCreation"]
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(models.createDeviceModel(), "device");
            // Uygulama genelindeki arayüz durumu (aktif sayfa vb.)
            this.setModel(models.createAppViewModel(), "appView");

            this.getRouter().initialize();
        },

        /**
         * Dokunmatik cihazlarda "cozy" (büyük dokunma alanları), diğerlerinde "compact" yoğunluk.
         * @returns {string} CSS sınıfı
         */
        getContentDensityClass: function () {
            return Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
        }
    });
});
