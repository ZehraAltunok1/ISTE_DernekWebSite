sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "pg/site/model/models",
    "pg/site/model/session",
    "pg/site/controller/LoginDialog"
], function (UIComponent, Device, models, Session, LoginDialog) {
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
            // Üye oturumu: "session" modeli arayüz için, "member" OData modeli üye verisi için
            this.setModel(models.createSessionModel(), "session");
            this._oSession = new Session(this);
            this._oSession.restore();

            this.getRouter().initialize();
        },

        getSession: function () {
            return this._oSession;
        },

        /** Giriş penceresi tek bir örnektir; ilk kullanımda kök view'a bağlanarak oluşturulur. */
        getLoginDialog: function () {
            if (!this._oLoginDialog) {
                this._oLoginDialog = new LoginDialog(this.getRootControl(), this._oSession);
            }
            return this._oLoginDialog;
        },

        exit: function () {
            if (this._oLoginDialog) {
                this._oLoginDialog.destroy();
            }
            this._oSession.destroy();
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
