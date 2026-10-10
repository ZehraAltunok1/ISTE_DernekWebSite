sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], function (JSONModel, Device) {
    "use strict";

    return {
        /** Cihaz bilgisi (telefon mu, masaüstü mü?) — yalnızca okunur. */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

        /**
         * Uygulama genelindeki arayüz durumu.
         * Kural: JSONModel yalnızca arayüz durumu içindir; iş verisi OData modelinden gelir.
         */
        createAppViewModel: function () {
            return new JSONModel({
                currentRoute: "home"
            });
        }
    };
});
