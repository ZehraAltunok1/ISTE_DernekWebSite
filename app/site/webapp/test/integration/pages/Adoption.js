sap.ui.define([
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/matchers/AggregationFilled",
    "sap/ui/test/matchers/AggregationLengthEquals",
    "sap/ui/test/matchers/I18NText",
    "sap/ui/test/matchers/PropertyStrictEquals"
], function (Opa5, Press, AggregationFilled, AggregationLengthEquals, I18NText, PropertyStrictEquals) {
    "use strict";

    Opa5.createPageObjects({

        onTheAnimalsPage: {
            actions: {
                iFilterBySpecies: function (sKey) {
                    return this.waitFor({
                        id: "speciesFilter",
                        viewName: "Animals",
                        success: function (oSegmented) {
                            var oItem = oSegmented.getItems().filter(function (i) {
                                return i.getKey() === sKey;
                            })[0];
                            oSegmented.setSelectedKey(sKey);
                            oSegmented.fireSelectionChange({ item: oItem });
                        },
                        errorMessage: "Tür filtresi bulunamadı"
                    });
                },

                iPressTheFirstMeetButton: function () {
                    return this.waitFor({
                        controlType: "sap.m.Button",
                        viewName: "Animals",
                        matchers: new I18NText({ propertyName: "text", key: "meetAnimal" }),
                        success: function (aButtons) {
                            new Press().executeOn(aButtons[0]);
                        },
                        errorMessage: "'Tanış' düğmesi bulunamadı"
                    });
                }
            },
            assertions: {
                iShouldSeeAnimalCount: function (iCount) {
                    return this.waitFor({
                        id: "animalGrid",
                        viewName: "Animals",
                        matchers: new AggregationLengthEquals({ name: "content", length: iCount }),
                        success: function () {
                            Opa5.assert.ok(true, iCount + " ilan listelendi");
                        },
                        errorMessage: "Beklenen sayıda ilan yok: " + iCount
                    });
                }
            }
        },

        onTheAnimalDetailPage: {
            actions: {
                iPressAdopt: function () {
                    return this.waitFor({
                        id: "adoptButton",
                        viewName: "AnimalDetail",
                        matchers: new PropertyStrictEquals({ name: "enabled", value: true }),
                        actions: new Press(),
                        errorMessage: "'Sahiplenmek İstiyorum' düğmesi etkin değil"
                    });
                },

                iSubmitTheApplication: function () {
                    return this.waitFor({
                        id: "adoptSubmit",
                        viewName: "AnimalDetail",
                        searchOpenDialogs: true,
                        actions: new Press(),
                        errorMessage: "Başvuru gönder düğmesi bulunamadı"
                    });
                }
            },
            assertions: {
                iShouldSeeThePhotoCarousel: function () {
                    return this.waitFor({
                        id: "photoCarousel",
                        viewName: "AnimalDetail",
                        matchers: new AggregationFilled({ name: "pages" }),
                        success: function () {
                            Opa5.assert.ok(true, "Fotoğraflar composition üzerinden yüklendi");
                        },
                        errorMessage: "Fotoğraf karuseli boş"
                    });
                },

                iShouldSeeAnErrorInTheDialog: function (sControlId) {
                    return this.waitFor({
                        id: sControlId,
                        viewName: "AnimalDetail",
                        searchOpenDialogs: true,
                        matchers: new PropertyStrictEquals({ name: "valueState", value: "Error" }),
                        success: function () {
                            Opa5.assert.ok(true, sControlId + " alanı hatalı olarak işaretlendi");
                        },
                        errorMessage: sControlId + " alanında hata gösterilmedi"
                    });
                }
            }
        }
    });
});
