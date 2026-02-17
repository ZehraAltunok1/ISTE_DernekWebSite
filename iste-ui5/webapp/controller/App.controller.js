sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("edusupport.platform.controller.App", {

        onInit: function () {
            console.log("📱 App Controller initialized");
            
            // Router initialize Component.js'te yapılıyor, burada TEKRAR yapma!
            // this.getOwnerComponent().getRouter().initialize(); ❌ KALDIR
        }
    });
});