sap.ui.define([
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/matchers/AggregationLengthEquals",
    "sap/ui/test/matchers/I18NText",
    "sap/ui/test/matchers/PropertyStrictEquals"
], function (Opa5, Press, AggregationLengthEquals, I18NText, PropertyStrictEquals) {
    "use strict";

    Opa5.createPageObjects({

        onTheEventsPage: {
            actions: {
                iSelectTimeFilter: function (sKey) {
                    return this.waitFor({
                        id: "timeFilter",
                        viewName: "Events",
                        success: function (oSegmented) {
                            var oItem = oSegmented.getItems().filter(function (i) {
                                return i.getKey() === sKey;
                            })[0];
                            oSegmented.setSelectedKey(sKey);
                            oSegmented.fireSelectionChange({ item: oItem });
                        },
                        errorMessage: "Zaman filtresi bulunamadı"
                    });
                },

                iPressTheFirstDetailsButton: function () {
                    return this.waitFor({
                        controlType: "sap.m.Button",
                        viewName: "Events",
                        matchers: new I18NText({ propertyName: "text", key: "details" }),
                        success: function (aButtons) {
                            new Press().executeOn(aButtons[0]);
                        },
                        errorMessage: "'Detaylar' düğmesi bulunamadı"
                    });
                }
            },
            assertions: {
                iShouldSeeEventCount: function (iCount) {
                    return this.waitFor({
                        id: "eventGrid",
                        viewName: "Events",
                        matchers: new AggregationLengthEquals({ name: "content", length: iCount }),
                        success: function () {
                            Opa5.assert.ok(true, iCount + " etkinlik listelendi");
                        },
                        errorMessage: "Beklenen sayıda etkinlik yok: " + iCount
                    });
                }
            }
        },

        onTheEventDetailPage: {
            actions: {
                iPressRegister: function () {
                    return this.waitFor({
                        id: "registerButton",
                        viewName: "EventDetail",
                        matchers: new PropertyStrictEquals({ name: "enabled", value: true }),
                        actions: new Press(),
                        errorMessage: "'Etkinliğe Katıl' düğmesi etkin değil"
                    });
                },

                iSubmitTheRegistration: function () {
                    return this.waitFor({
                        id: "regSubmit",
                        viewName: "EventDetail",
                        searchOpenDialogs: true,
                        actions: new Press(),
                        errorMessage: "Kaydı tamamla düğmesi bulunamadı"
                    });
                }
            },
            assertions: {
                iShouldSeeAnErrorInTheDialog: function (sControlId) {
                    return this.waitFor({
                        id: sControlId,
                        viewName: "EventDetail",
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
