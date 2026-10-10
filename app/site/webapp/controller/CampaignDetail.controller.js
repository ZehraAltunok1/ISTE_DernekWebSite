sap.ui.define([
    "./BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("pg.site.controller.CampaignDetail", {

        onInit: function () {
            this.getRouter().getRoute("campaignDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * URL'deki kampanya ID'sini okuyup sayfayı o kayda bağlar (element binding).
         * Örn. #/kampanyalar/c000...001 → /Campaigns(c000...001)
         */
        _onRouteMatched: function (oEvent) {
            var sId = oEvent.getParameter("arguments").campaignId;
            var oView = this.getView();

            // Geçersiz ID'yi sunucuya göndermeden yakala
            if (!/^[0-9a-f-]{36}$/i.test(sId)) {
                this._showNotFound();
                return;
            }

            oView.bindElement({
                path: "/Campaigns(" + sId + ")",
                events: {
                    dataRequested: function () {
                        oView.setBusy(true);
                    },
                    dataReceived: function (oDataEvent) {
                        oView.setBusy(false);
                        // Kayıt yoksa (ör. taslak kampanya) sunucu 404 döner
                        if (oDataEvent.getParameter("error")) {
                            this._showNotFound();
                        }
                    }.bind(this)
                }
            });
        },

        _showNotFound: function () {
            this.getView().unbindElement();
            this.getRouter().getTargets().display("notFound");
        },

        onDonate: function () {
            var sId = this.getView().getBindingContext().getProperty("ID");
            this.getRouter().navTo("donate", { query: { kampanya: sId } });
        }
    });
});
