sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

    const API_BASE = "http://localhost:3000/api";

    return Controller.extend("edusupport.platform.controller.public.MediaDetail", {

        onInit: function () {
            this.getView().setModel(new JSONModel({
                title: "", description: "", date: "", type: "", url: ""
            }), "detailModel");

            this.getOwnerComponent().getRouter()
                .getRoute("mediaDetail")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var oArgs    = oEvent.getParameter("arguments");
            this._sType  = oArgs.type;
            this._sId    = oArgs.id;
            this._loadDetail(this._sType, this._sId);
        },

        _loadDetail: function (sType, sId) {
            var that = this;
            this.getView().byId("detailLoadingBox").setVisible(true);
            this.getView().byId("detailContentBox").setVisible(false);
            this.getView().byId("detailEmptyBox").setVisible(false);

            // ── FOTOĞRAF GRUBU ──
            if (sType === "photo_group") {
                try {
                    var aItems = JSON.parse(decodeURIComponent(sId.replace(/%27/g, "'")));
                    if (aItems && aItems.length) {
                        that._renderPhotoGrid(aItems);
                    } else {
                        that._showEmpty();
                    }
                } catch (e) {
                    console.error("photo_group parse hatası:", e);
                    that._showEmpty();
                }
                return;
            }

            // ── TEK VİDEO ──
            fetch(API_BASE + "/media/" + sId)
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.success && data.media) {
                        that._renderDetail(data.media);
                    } else {
                        that._showEmpty();
                    }
                })
                .catch(function () { that._showEmpty(); });
        },

        // ── Fotoğraf grid render ──
        _renderPhotoGrid: function (aItems) {
            var sGroupTitle = aItems[0].title || "Fotoğraf Galerisi";
            var sDate = aItems[0].created_at
                ? new Date(aItems[0].created_at).toLocaleDateString("tr-TR",
                    { day: "numeric", month: "long", year: "numeric" })
                : "";

            // Model güncelle — setProperty ile binding anında tetiklenir
            var oModel = this.getView().getModel("detailModel");
            oModel.setProperty("/title",       sGroupTitle);
            oModel.setProperty("/description", aItems[0].description || "");
            oModel.setProperty("/date",        sDate);
            oModel.setProperty("/type",        "photo_group");
            oModel.setProperty("/url",         "");

            // Grid HTML üret
            var sGrid = "<div class='mediaDetailPhotoGrid'>" +
                aItems.map(function (oItem) {
                    var sUrl = oItem.url
                        ? (oItem.url.startsWith("http") ? oItem.url : "http://localhost:3000" + oItem.url)
                        : "images/placeholder.jpg";
                    return "<div class='mediaDetailPhotoCell' onclick=\"window.open('" + sUrl + "','_blank')\">" +
                               "<img src='" + sUrl + "' loading='lazy'" +
                               " onerror=\"this.src='images/placeholder.jpg'\"/>" +
                           "</div>";
                }).join("") +
            "</div>";

            var oPhotoArea = this.getView().byId("photoDetailArea");
            var oVideoArea = this.getView().byId("videoDetailArea");
            oPhotoArea.setContent(sGrid);
            oVideoArea.setContent("");

            this.getView().byId("detailLoadingBox").setVisible(false);
            this.getView().byId("detailContentBox").setVisible(true);
        },

        // ── Tek video render ──
        _renderDetail: function (oItem) {
            var oModel = this.getView().getModel("detailModel");
            var sDate  = oItem.created_at
                ? new Date(oItem.created_at).toLocaleDateString("tr-TR",
                    { day: "numeric", month: "long", year: "numeric" })
                : "";

            // Model güncelle — setProperty ile binding anında tetiklenir
            oModel.setProperty("/title",       oItem.title       || "");
            oModel.setProperty("/description", oItem.description || "");
            oModel.setProperty("/date",        sDate);
            oModel.setProperty("/type",        oItem.type        || "");
            oModel.setProperty("/url",         oItem.url         || "");

            var oPhotoArea = this.getView().byId("photoDetailArea");
            var oVideoArea = this.getView().byId("videoDetailArea");

            oPhotoArea.setContent("");

            var sRaw   = oItem.url || "";
            var sEmbed = sRaw;
            var oMatch = sRaw.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
            if (oMatch) {
                sEmbed = "https://www.youtube.com/embed/" + oMatch[1] + "?rel=0&autoplay=1";
            }

            oVideoArea.setContent(
                "<div class='mediaDetailVideoWrap'>" +
                    "<iframe src='" + sEmbed + "'" +
                    " class='mediaDetailIframe' allowfullscreen" +
                    " allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'>" +
                    "</iframe>" +
                "</div>"
            );

            this.getView().byId("detailLoadingBox").setVisible(false);
            this.getView().byId("detailContentBox").setVisible(true);
        },

        _showEmpty: function () {
            this.getView().byId("detailLoadingBox").setVisible(false);
            this.getView().byId("detailEmptyBox").setVisible(true);
        },

        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            if (oHistory.getPreviousHash() !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("home");
            }
        }
    });
});