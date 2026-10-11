sap.ui.define([
    "./BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("pg.site.controller.Album", {

        onInit: function () {
            this.getRouter().getRoute("album").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sId = oEvent.getParameter("arguments").albumId;
            var oView = this.getView();

            if (!/^[0-9a-f-]{36}$/i.test(sId)) {
                this._showNotFound();
                return;
            }

            oView.bindElement({
                path: "/Albums(" + sId + ")",
                events: {
                    dataRequested: function () {
                        oView.setBusy(true);
                    },
                    dataReceived: function (oDataEvent) {
                        oView.setBusy(false);
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

        onOpenEvent: function () {
            var sEventId = this.getView().getBindingContext().getProperty("event_ID");
            this.getRouter().navTo("eventDetail", { eventId: sEventId });
        }
    });
});
