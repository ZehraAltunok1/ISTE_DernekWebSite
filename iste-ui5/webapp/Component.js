sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], function (UIComponent, JSONModel, Device) {
    "use strict";

    return UIComponent.extend("edusupport.platform.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            // Device model
            var oDeviceModel = new JSONModel(Device);
            oDeviceModel.setDefaultBindingMode("OneWay");
            this.setModel(oDeviceModel, "device");

            // AppData model
            var oAppData = new JSONModel({
                isAuthenticated: false,
                currentUser: null,
                authToken: null
            });
            this.setModel(oAppData, "appData");

            // ✅ YENİ: localStorage'dan token oku (sayfa yenilenince kaybolmasın)
            var sToken = localStorage.getItem("authToken");
            var sUserData = localStorage.getItem("userData");

            if (sToken) {
                oAppData.setProperty("/authToken", sToken);
                oAppData.setProperty("/isAuthenticated", true);

                if (sUserData) {
                    try {
                        oAppData.setProperty("/currentUser", JSON.parse(sUserData));
                    } catch(e) {
                        console.warn("userData parse hatası", e);
                    }
                }
                console.log("✅ Token localStorage'dan yüklendi");
            }

            // ✅ YENİ: Router Guard — korumalı sayfalara login olmadan girişi engelle
            var aProtectedRoutes = [
                "profile",
                "adminDashboard",
                "adminUsers",
                "adminDonations",
                "adminStudents",
                "adminActivities"
                // manifest.json'daki route isimlerini buraya ekle
            ];

            this.getRouter().attachBeforeRouteMatched(function (oEvent) {
                var sRoute = oEvent.getParameter("name");
                var bAuth = oAppData.getProperty("/isAuthenticated");

                if (!bAuth && aProtectedRoutes.includes(sRoute)) {
                    sap.m.MessageToast.show("Bu sayfaya erişmek için giriş yapmanız gerekiyor");
                    this.getRouter().navTo("login");
                }
            }.bind(this));

            this.getRouter().initialize();

            console.log("✅ Component initialized");
        }
    });
});