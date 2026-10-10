sap.ui.define([
    "sap/fe/core/PageController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (PageController, JSONModel, Filter, FilterOperator) {
    "use strict";

    /**
     * FPM sayfa controller'ı. sap.fe.core.PageController'dan türediği için
     * this.routing gibi Fiori elements yardımcılarını kullanabilir.
     */
    return PageController.extend("pg.yonetim.ext.dashboard.Dashboard", {

        onInit: function () {
            PageController.prototype.onInit.apply(this, arguments);
            this.getView().setModel(new JSONModel({}), "kpi");
        },

        /** Sayfa her görüntülendiğinde sayıları tazele (ör. bir bağış onaylandıktan sonra). */
        onPageReady: function () {
            PageController.prototype.onPageReady.apply(this, arguments);
            this._loadKpis();
        },

        _loadKpis: function () {
            var oKpi = this.getView().getModel("kpi");
            var oCounts = {
                pendingDonations: this._count("/Donations", new Filter("status", FilterOperator.EQ, "Pending")),
                pendingApplications: this._count("/VolunteerApplications", new Filter("status", FilterOperator.EQ, "Pending")),
                newMessages: this._count("/ContactMessages", new Filter("status", FilterOperator.EQ, "New")),
                activeCampaigns: this._count("/Campaigns", new Filter("status", FilterOperator.EQ, "Active")),
                activeAnnouncements: this._count("/Announcements", new Filter("isActive", FilterOperator.EQ, true))
            };
            Object.keys(oCounts).forEach(function (sKey) {
                oCounts[sKey].then(function (iCount) {
                    oKpi.setProperty("/" + sKey, String(iCount));
                });
            });
        },

        /**
         * Kayıtları indirmeden yalnızca sayısını ister: GET /Donations?$count=true&$top=0
         * @returns {Promise<number>} kayıt sayısı
         */
        _count: function (sPath, oFilter) {
            var aFilters = [oFilter];
            // Taslak destekli entity'lerde yalnızca etkin (kaydedilmiş) kayıtları say
            if (sPath === "/Campaigns" || sPath === "/Announcements") {
                aFilters.push(new Filter("IsActiveEntity", FilterOperator.EQ, true));
            }
            var oBinding = this.getView().getModel().bindList(sPath, null, null, aFilters, { $count: true });
            return oBinding.requestContexts(0, 1).then(function () {
                var iCount = oBinding.getCount();
                oBinding.destroy();
                return iCount;
            });
        },

        onNavigate: function (oEvent) {
            this.routing.navigateToRoute(oEvent.getSource().data("route"));
        },

        onOpenSite: function () {
            window.open("../../site/webapp/index.html", "_blank", "noopener");
        }
    });
});
