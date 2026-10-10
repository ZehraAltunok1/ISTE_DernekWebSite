sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("pg.site.controller.Animals", {

        onInit: function () {
            this.setModel(new JSONModel({ countText: "" }), "animalsView");
            this.getRouter().getRoute("animals").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            if (this._bVisited) {
                this.byId("animalGrid").getBinding("content").refresh();
            }
            this._bVisited = true;
        },

        /**
         * Bütün filtre kontrollerinin değerlerini toplayıp tek seferde sunucuya gönderir.
         * Birden fazla Filter dizisi verildiğinde OData V4 bunları "and" ile birleştirir.
         */
        onFilterChange: function () {
            var aFilters = [];
            var sSpecies = this.byId("speciesFilter").getSelectedKey();
            var sSize = this.byId("sizeFilter").getSelectedKey();
            var sQuery = (this.byId("nameSearch").getValue() || "").trim();

            if (sSpecies !== "All") {
                aFilters.push(new Filter("species", FilterOperator.EQ, sSpecies));
            }
            if (sSize !== "All") {
                aFilters.push(new Filter("size", FilterOperator.EQ, sSize));
            }
            if (this.byId("neuteredFilter").getSelected()) {
                aFilters.push(new Filter("neutered", FilterOperator.EQ, true));
            }
            if (!this.byId("adoptedFilter").getSelected()) {
                aFilters.push(new Filter("status", FilterOperator.NE, "Adopted"));
            }
            if (sQuery) {
                aFilters.push(new Filter({ path: "name", operator: FilterOperator.Contains, value1: sQuery, caseSensitive: false }));
            }
            this.byId("animalGrid").getBinding("content").filter(aFilters);
        },

        onSearch: function () {
            this.onFilterChange();
        },

        /** Sonuç sayısını göster; hiç sonuç yoksa boş durum mesajını aç. */
        onDataReceived: function () {
            var iCount = this.byId("animalGrid").getBinding("content").getCount();
            this.getModel("animalsView").setProperty("/countText", this.getText("animalCount", [iCount]));
            this.byId("noAnimals").setVisible(iCount === 0);
        }
    });
});
