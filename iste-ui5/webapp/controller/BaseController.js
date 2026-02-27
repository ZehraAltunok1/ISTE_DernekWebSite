        sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageBox, MessageToast, Fragment, JSONModel) {
    "use strict";

    const API_BASE = "http://localhost:3000/api";

    return Controller.extend("edusupport.platform.controller.BaseController", {

        // ─────────────────────────────────────────────────────────────
        // API ÇAĞRISI
        // ─────────────────────────────────────────────────────────────

        _apiCall: function (sMethod, sEndpoint, oBody) {
            var oOptions = {
                method: sMethod,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("authToken")
                }
            };
            if (oBody) oOptions.body = JSON.stringify(oBody);

            return fetch(API_BASE + sEndpoint, oOptions)
                .then(function (res) {
                    if (!res.ok) throw new Error("HTTP " + res.status);
                    return res.json();
                });
        },

        // ─────────────────────────────────────────────────────────────
        // ROUTER & MODEL KISAYOLLARI
        // ─────────────────────────────────────────────────────────────

        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        // ─────────────────────────────────────────────────────────────
        // DIALOG YARDIMCISI
        // ─────────────────────────────────────────────────────────────

        _openDialog: function (sProp, sFragment, sModelName, oDefaultData) {
            var oView = this.getView();
            var that  = this;

            if (!this[sProp]) {
                Fragment.load({
                    id: oView.getId(),
                    name: sFragment,
                    controller: this
                }).then(function (oDialog) {
                    that[sProp] = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.setModel(new JSONModel(oDefaultData), sModelName);
                    oDialog.open();
                }).catch(function (err) {
                    MessageBox.error("Dialog yüklenemedi: " + err.message);
                });
            } else {
                this[sProp].getModel(sModelName).setData(oDefaultData);
                this[sProp].open();
            }
        },

        // ─────────────────────────────────────────────────────────────
        // YARDIMCI FONKSİYONLAR
        // ─────────────────────────────────────────────────────────────

        _formatTimestamp: function (timestamp) {
            if (!timestamp) return "Bilinmiyor";
            var date      = new Date(timestamp);
            var now       = new Date();
            var diffMins  = Math.floor((now - date) / 60000);
            var diffHours = Math.floor(diffMins / 60);
            var diffDays  = Math.floor(diffHours / 24);

            if (diffMins  < 1)  return "Az önce";
            if (diffMins  < 60) return diffMins  + " dakika önce";
            if (diffHours < 24) return diffHours + " saat önce";
            if (diffDays  < 7)  return diffDays  + " gün önce";
            return date.toLocaleDateString("tr-TR");
        },

        _formatDateTR: function (sDate) {
            if (!sDate) return "-";
            var months = ["","Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
                          "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
            var p = sDate.split("-");
            return p.length === 3
                ? parseInt(p[2]) + " " + months[parseInt(p[1])] + " " + p[0]
                : sDate;
        }
    });
});
