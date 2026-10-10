sap.ui.define([
    "./BaseController",
    "sap/ui/core/Fragment"
], function (BaseController, Fragment) {
    "use strict";

    return BaseController.extend("pg.site.controller.App", {

        onInit: function () {
            this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

            var oRouter = this.getRouter();
            // Aktif menü düğmesini vurgulamak için güncel rota adını sakla
            oRouter.attachRouteMatched(function (oEvent) {
                this.getModel("appView").setProperty("/currentRoute", oEvent.getParameter("name"));
                // Her sayfa geçişinde en üstten başla (önbellekteki view'lar eski konumda kalmasın)
                var oPage = oEvent.getParameter("view").byId("page");
                if (oPage && oPage.scrollTo) {
                    oPage.scrollTo(0, 0);
                }
            }, this);
            oRouter.attachBypassed(function () {
                this.getModel("appView").setProperty("/currentRoute", "notFound");
            }, this);

            // Tarayıcı sekmesindeki başlık (manifest → targets.*.title)
            oRouter.attachTitleChanged(function (oEvent) {
                document.title = oEvent.getParameter("title") + " · " + this.getText("appTitle");
            }, this);
        },

        /** Telefonda menüyü açar. Fragment yalnızca ilk kullanımda yüklenir. */
        onOpenMenu: function (oEvent) {
            var oButton = oEvent.getSource();
            if (!this._pMenu) {
                this._pMenu = Fragment.load({
                    id: this.getView().getId(),
                    name: "pg.site.view.fragments.MobileMenu",
                    controller: this
                }).then(function (oMenu) {
                    this.getView().addDependent(oMenu);
                    return oMenu;
                }.bind(this));
            }
            this._pMenu.then(function (oMenu) {
                oMenu.openBy(oButton);
            });
        }
    });
});
