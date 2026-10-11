sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/m/MessageBox",
    "pg/site/model/formatter"
], function (Controller, UIComponent, MessageBox, formatter) {
    "use strict";

    /**
     * Bütün sayfa controller'larının ortak atası.
     * Tekrar eden kısayollar ve navigasyon burada durur; böylece controller'lar kısa kalır.
     */
    return Controller.extend("pg.site.controller.BaseController", {

        formatter: formatter,

        getRouter: function () {
            return UIComponent.getRouterFor(this);
        },

        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        setModel: function (oModel, sName) {
            this.getView().setModel(oModel, sName);
            return this;
        },

        getText: function (sKey, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        },

        // ── Ortak navigasyon olayları (view'lardan ve fragment'lardan çağrılır) ──

        onNavHome: function () {
            this.getRouter().navTo("home");
        },

        onNavCampaigns: function () {
            this.getRouter().navTo("campaigns");
        },

        onNavAnimals: function () {
            this.getRouter().navTo("animals");
        },

        /** Hayvan kartındaki "Tanış" — karta bağlı hayvanın detayına gider. */
        onAnimalPress: function (oEvent) {
            var sId = oEvent.getSource().getBindingContext().getProperty("ID");
            this.getRouter().navTo("animalDetail", { animalId: sId });
        },

        onNavEvents: function () {
            this.getRouter().navTo("events");
        },

        /** Etkinlik kartındaki "Detaylar" — karta bağlı etkinliğin detayına gider. */
        onEventPress: function (oEvent) {
            var sId = oEvent.getSource().getBindingContext().getProperty("ID");
            this.getRouter().navTo("eventDetail", { eventId: sId });
        },

        onNavDonate: function () {
            this.getRouter().navTo("donate");
        },

        onNavVolunteer: function () {
            this.getRouter().navTo("volunteer");
        },

        onNavAbout: function () {
            this.getRouter().navTo("about");
        },

        onNavFaq: function () {
            this.getRouter().navTo("faq");
        },

        onNavContact: function () {
            this.getRouter().navTo("contact");
        },

        /** Formlardaki "Aydınlatma metni" bağlantısı (demo KVKK metni). */
        onShowPrivacy: function () {
            MessageBox.information(this.getText("privacyNoticeText"), {
                title: this.getText("privacyNotice")
            });
        },

        /** Kampanya kartındaki "Detaylar" — karta bağlı (binding) kampanyanın ID'sini okur. */
        onCampaignPress: function (oEvent) {
            var sId = oEvent.getSource().getBindingContext().getProperty("ID");
            this.getRouter().navTo("campaignDetail", { campaignId: sId });
        },

        /** Kampanya kartındaki "Destek Ol" — bağış sayfasını kampanya seçili olarak açar. */
        onCampaignDonate: function (oEvent) {
            var sId = oEvent.getSource().getBindingContext().getProperty("ID");
            this.getRouter().navTo("donate", { query: { kampanya: sId } });
        }
    });
});
