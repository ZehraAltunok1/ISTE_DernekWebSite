sap.ui.define([
    "./BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("pg.site.controller.Campaigns", {

        onInit: function () {
            this.getRouter().getRoute("campaigns").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            if (this._bVisited) {
                this.byId("campaignGrid").getBinding("content").refresh();
            }
            this._bVisited = true;
        },

        /**
         * Filtre sunucuda uygulanır: OData V4 modeli isteğe $filter ekler.
         * Böylece yalnızca gereken kayıtlar ağdan gelir.
         */
        onFilterChange: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            var aFilters = sKey === "All" ? [] : [new Filter("status", FilterOperator.EQ, sKey)];
            this.byId("campaignGrid").getBinding("content").filter(aFilters);
        }
    });
});
