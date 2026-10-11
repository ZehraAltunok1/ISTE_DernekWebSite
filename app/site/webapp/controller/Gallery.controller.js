sap.ui.define([
    "./BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("pg.site.controller.Gallery", {

        /** Albüm kartındaki görsel ya da "Albümü Aç" düğmesi */
        onAlbumPress: function (oEvent) {
            var sId = oEvent.getSource().getBindingContext().getProperty("ID");
            this.getRouter().navTo("album", { albumId: sId });
        }
    });
});
