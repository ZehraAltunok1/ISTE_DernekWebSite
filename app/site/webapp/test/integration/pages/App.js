sap.ui.define([
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/core/routing/HashChanger"
], function (Opa5, Press, HashChanger) {
    "use strict";

    Opa5.createPageObjects({
        onTheAppPage: {
            actions: {
                /** Üst menüdeki bir düğmeye basar (ör. "navCampaignsButton"). */
                iPressNavButton: function (sButtonId) {
                    return this.waitFor({
                        id: sButtonId,
                        viewName: "App",
                        actions: new Press(),
                        errorMessage: "Menü düğmesi bulunamadı: " + sButtonId
                    });
                },

                iNavigateToHash: function (sHash) {
                    return this.waitFor({
                        success: function () {
                            HashChanger.getInstance().setHash(sHash);
                        }
                    });
                }
            },
            assertions: {
                iShouldSeeTheTabTitle: function (sTitlePart) {
                    return this.waitFor({
                        check: function () {
                            return document.title.indexOf(sTitlePart) >= 0;
                        },
                        success: function () {
                            Opa5.assert.ok(true, "Sekme başlığı: " + document.title);
                        },
                        errorMessage: "Sekme başlığı '" + sTitlePart + "' içermiyor"
                    });
                }
            }
        }
    });
});
