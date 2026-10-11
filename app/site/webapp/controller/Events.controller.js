sap.ui.define([
    "./BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter"
], function (BaseController, Filter, FilterOperator, Sorter) {
    "use strict";

    return BaseController.extend("pg.site.controller.Events", {

        onInit: function () {
            this.getRouter().getRoute("events").attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Liste binding'i XML'de "suspended" (askıda) başlar; çünkü "yaklaşan" filtresi
         * şimdiki zamana bağlıdır ve XML'de yazılamaz. Filtreyi kurup binding'i burada başlatıyoruz.
         */
        _onRouteMatched: function () {
            this.onFilterChange();
            var oBinding = this.byId("eventGrid").getBinding("content");
            if (oBinding.isSuspended()) {
                oBinding.resume();
            } else {
                oBinding.refresh();
            }
        },

        onFilterChange: function () {
            var sKey = this.byId("timeFilter").getSelectedKey();
            var sNow = new Date().toISOString();
            var oBinding = this.byId("eventGrid").getBinding("content");
            var aFilters = [];

            if (sKey === "Upcoming") {
                aFilters.push(new Filter("startDateTime", FilterOperator.GE, sNow));
            } else if (sKey === "Past") {
                aFilters.push(new Filter("startDateTime", FilterOperator.LT, sNow));
            }
            // Geçmiş etkinliklerde en yeni üstte, yaklaşanlarda en yakın üstte
            oBinding.sort(new Sorter("startDateTime", sKey === "Past"));
            oBinding.filter(aFilters);
        },

        onDataReceived: function () {
            var iCount = this.byId("eventGrid").getBinding("content").getCount();
            this.byId("noEvents").setVisible(iCount === 0);
        }
    });
});
