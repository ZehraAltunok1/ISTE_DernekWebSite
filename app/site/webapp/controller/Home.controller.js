sap.ui.define([
    "./BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("pg.site.controller.Home", {

        onInit: function () {
            this.getRouter().getRoute("home").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            // "Yaklaşan" şimdiki zamana bağlı olduğu için filtre her girişte yeniden kurulur;
            // filter() isteği kendisi tetiklediğinden aşağıdaki refresh listesinde yok.
            var oEvents = this.byId("eventGrid").getBinding("content");
            oEvents.filter(new Filter("startDateTime", FilterOperator.GT, new Date().toISOString()));
            if (oEvents.isSuspended()) {
                oEvents.resume();
            }

            // Sayfaya tekrar dönüldüğünde (ör. bağıştan sonra) güncel rakamları getir.
            // İlk açılışta veri zaten yükleniyor; gereksiz ikinci isteği önlemek için atlıyoruz.
            if (this._bVisited) {
                this.byId("campaignGrid").getBinding("content").refresh();
                this.byId("statsBox").getBinding("items").refresh();
                this.byId("animalGrid").getBinding("content").refresh();
            }
            this._bVisited = true;
        }
    });
});
