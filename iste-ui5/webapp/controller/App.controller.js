sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("edusupport.platform.controller.App", {

        onInit: function () {
            console.log("📱 App Controller initialized");
        }
    });
});