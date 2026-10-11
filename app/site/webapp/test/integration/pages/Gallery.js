sap.ui.define([
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/matchers/AggregationLengthEquals",
    "sap/ui/test/matchers/I18NText"
], function (Opa5, Press, AggregationLengthEquals, I18NText) {
    "use strict";

    Opa5.createPageObjects({

        onTheGalleryPage: {
            actions: {
                iOpenTheFirstAlbum: function () {
                    return this.waitFor({
                        controlType: "sap.m.Button",
                        viewName: "Gallery",
                        matchers: new I18NText({ propertyName: "text", key: "openAlbum" }),
                        success: function (aButtons) {
                            new Press().executeOn(aButtons[0]);
                        },
                        errorMessage: "'Albümü Aç' düğmesi bulunamadı"
                    });
                }
            },
            assertions: {
                iShouldSeeAlbumCount: function (iCount) {
                    return this.waitFor({
                        id: "albumGrid",
                        viewName: "Gallery",
                        matchers: new AggregationLengthEquals({ name: "content", length: iCount }),
                        success: function () {
                            Opa5.assert.ok(true, iCount + " albüm listelendi");
                        },
                        errorMessage: "Beklenen sayıda albüm yok: " + iCount
                    });
                }
            }
        },

        onTheAlbumPage: {
            actions: {
                iPressTheFirstPhoto: function () {
                    return this.waitFor({
                        id: "photoGrid",
                        viewName: "Album",
                        success: function (oGrid) {
                            new Press().executeOn(oGrid.getItems()[0]);
                        },
                        errorMessage: "Fotoğraf ızgarası bulunamadı"
                    });
                }
            },
            assertions: {
                iShouldSeePhotoCount: function (iCount) {
                    return this.waitFor({
                        id: "photoGrid",
                        viewName: "Album",
                        matchers: new AggregationLengthEquals({ name: "items", length: iCount }),
                        success: function () {
                            Opa5.assert.ok(true, iCount + " fotoğraf gösterildi");
                        },
                        errorMessage: "Beklenen sayıda fotoğraf yok: " + iCount
                    });
                },

                iShouldSeeTheLightBox: function () {
                    return this.waitFor({
                        controlType: "sap.m.LightBox",
                        searchOpenDialogs: true,
                        success: function () {
                            Opa5.assert.ok(true, "Fotoğraf büyük olarak açıldı");
                        },
                        errorMessage: "LightBox açılmadı"
                    });
                }
            }
        }
    });
});
