/**
 * FLP sandbox'ı başlatır: UI5 yüklendikten sonra (data-sap-ui-on-init) launchpad kabuğunu
 * oluşturup sayfaya yerleştirir. Yalnızca yerel geliştirme/demo içindir.
 */
sap.ui.define([
    "sap/ushell/Container"
], function (Container) {
    "use strict";

    Container.createRendererInternal("fiori2").then(function (oRenderer) {
        oRenderer.placeAt("content");
    });
});
