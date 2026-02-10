sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("edusupport.platform.controller.public.Home", {

        onInit: function () {
            console.log("Home page initialized");
        },

        onNavToLogin: function () {
            this.getOwnerComponent().getRouter().navTo("login");
        },

        onNavToDashboard: function () {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        }
    });
});