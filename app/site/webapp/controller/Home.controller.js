sap.ui.define([
    "./BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("pg.site.controller.Home", {

        onInit: function () {
            this.getRouter().getRoute("home").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            // Sayfaya tekrar dönüldüğünde (ör. bağıştan sonra) güncel rakamları getir.
            // İlk açılışta veri zaten yükleniyor; gereksiz ikinci isteği önlemek için atlıyoruz.
            if (this._bVisited) {
                this.byId("campaignGrid").getBinding("content").refresh();
                this.byId("statsBox").getBinding("items").refresh();
            }
            this._bVisited = true;
        }
    });
});
