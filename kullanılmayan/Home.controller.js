// ─────────────────────────────────────────────────────────────────────
// Home.controller.js  →  _loadMediaForHome + filtre metodunu buraya ekle
// ─────────────────────────────────────────────────────────────────────
//
// onInit veya _onRouteMatched içinde şunu çağır:
//   this._loadMediaForHome();
//
// ─────────────────────────────────────────────────────────────────────

sap.ui.define([
    "edusupport/platform/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, MessageToast) {
    "use strict";

    const API_BASE = "http://localhost:3000/api";

    return BaseController.extend("edusupport.platform.controller.Home", {

        onInit: function () {
            // Sayfa modeli — sadece media ile ilgili kısım gösteriliyor
            // Kendi mevcut onInit'inin içine _loadMediaForHome() ekle
            this.getView().setModel(new JSONModel({
                mediaItems:         [],    // tüm medya (fotoğraf + video)
                filteredMedia:      [],    // filtrelenmiş liste
                activeMediaFilter:  "all", // "all" | "photo" | "video"
                mediaLoading:       false
            }), "homeData");

            this._loadMediaForHome();
        },

        // ─────────────────────────────────────────────────────────────
        // MEDYA YÜKLEME
        // ─────────────────────────────────────────────────────────────

        _loadMediaForHome: function () {
            var that   = this;
            var oModel = this.getView().getModel("homeData");

            oModel.setProperty("/mediaLoading", true);

            fetch(API_BASE + "/media")
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    oModel.setProperty("/mediaLoading", false);

                    if (data.success) {
                        oModel.setProperty("/mediaItems",    data.media || []);
                        oModel.setProperty("/filteredMedia", data.media || []);
                    }
                })
                .catch(function () {
                    oModel.setProperty("/mediaLoading", false);
                    // Hata durumunda sessizce boş bırak
                });
        },

        // ─────────────────────────────────────────────────────────────
        // FİLTRELEME  (Tümü / Fotoğraflar / Videolar)
        // ─────────────────────────────────────────────────────────────

        onFilterMedia: function (oEvent) {
            var sKey   = oEvent.getParameter("key");               // "all" | "photo" | "video"
            var oModel = this.getView().getModel("homeData");
            var aAll   = oModel.getProperty("/mediaItems") || [];

            oModel.setProperty("/activeMediaFilter", sKey);

            var aFiltered = sKey === "all"
                ? aAll
                : aAll.filter(function (m) { return m.type === sKey; });

            oModel.setProperty("/filteredMedia", aFiltered);
        },

        // ─────────────────────────────────────────────────────────────
        // FOTOĞRAF BÜYÜTME (lightbox tarzı)
        // ─────────────────────────────────────────────────────────────

        onOpenPhoto: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("homeData");
            var oMedia   = oContext.getObject();
            if (oMedia.type !== "photo") return;

            var sUrl = "http://localhost:3000" + oMedia.url;

            // Basit lightbox — SAP Dialog ile
            if (!this._oLightbox) {
                this._oLightbox = new sap.m.Dialog({
                    contentWidth:  "80%",
                    contentHeight: "80%",
                    resizable:     true,
                    draggable:     true,
                    endButton: new sap.m.Button({
                        icon:  "sap-icon://decline",
                        press: function () { this._oLightbox.close(); }.bind(this)
                    })
                });
                this.getView().addDependent(this._oLightbox);
            }

            // İçeriği güncelle
            this._oLightbox.removeAllContent();
            this._oLightbox.setTitle(oMedia.title);
            this._oLightbox.addContent(
                new sap.m.VBox({
                    alignItems: "Center",
                    justifyContent: "Center",
                    height: "100%",
                    items: [
                        new sap.ui.core.HTML({
                            content: '<img src="' + sUrl + '" style="max-width:100%;max-height:65vh;border-radius:8px;object-fit:contain;"/>'
                        }),
                        new sap.m.Text({
                            text: oMedia.description || "",
                            wrapping: true,
                            textAlign: "Center"
                        }).addStyleClass("sapUiSmallMarginTop")
                    ]
                })
            );

            this._oLightbox.open();
        }
    });
});
