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
            // Parent init
            UIComponent.prototype.init.apply(this, arguments);

            // Device model
            var oDeviceModel = new JSONModel(Device);
            oDeviceModel.setDefaultBindingMode("OneWay");
            this.setModel(oDeviceModel, "device");

            // App Data Model (Kullanıcı durumu için)
            var oAppData = new JSONModel({
                isAuthenticated: false,
                currentUser: null,
                authToken: null
            });
            this.setModel(oAppData, "appData");

            // Router'ı başlat
            this.getRouter().initialize();

            console.log("✅ Component initialized");
        }
    });
});