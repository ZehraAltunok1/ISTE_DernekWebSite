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
                authToken: null,
                scrollToSection: null
            });
            this.setModel(oAppData, "appData");

            // localStorage'dan token + kullanıcı bilgisi oku
            var sToken    = localStorage.getItem("authToken");
            var sUserData = localStorage.getItem("userData");

            if (sToken) {
                oAppData.setProperty("/authToken",       sToken);
                oAppData.setProperty("/isAuthenticated", true);

                if (sUserData) {
                    try {
                        var oUser = JSON.parse(sUserData);

                        // avatar_url: göreli path ise tam URL'ye çevir
                        if (oUser.avatar_url && !oUser.avatar_url.startsWith("http")) {
                            oUser.avatar_url = "http://localhost:3000" + oUser.avatar_url;
                        }

                        // initials yoksa hesapla
                        if (!oUser.initials) {
                            var sFirst = (oUser.first_name || "").charAt(0).toUpperCase();
                            var sLast  = (oUser.last_name  || "").charAt(0).toUpperCase();
                            if (sFirst || sLast) {
                                oUser.initials = sFirst + sLast;
                            }
                        }

                        oAppData.setProperty("/currentUser", oUser);

                        // Düzeltilmiş veriyi localStorage'a geri yaz
                        localStorage.setItem("userData", JSON.stringify(oUser));

                    } catch (e) {
                        console.warn("userData parse hatası:", e);
                        localStorage.removeItem("userData");
                    }
                }

                console.log("✅ Token localStorage'dan yüklendi");
            }

            // Router Guard — korumalı sayfalara login olmadan girişi engelle
            var aProtectedRoutes = [
                "profile",
                "adminDashboard",
                "adminUsers",
                "adminDonations",
                "adminStudents",
                "adminActivities"
            ];

            this.getRouter().attachBeforeRouteMatched(function (oEvent) {
                var sRoute = oEvent.getParameter("name");
                var bAuth  = oAppData.getProperty("/isAuthenticated");

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