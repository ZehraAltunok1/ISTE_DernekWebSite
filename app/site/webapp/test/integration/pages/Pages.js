sap.ui.define([
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/matchers/AggregationFilled",
    "sap/ui/test/matchers/AggregationLengthEquals",
    "sap/ui/test/matchers/I18NText",
    "sap/ui/test/matchers/PropertyStrictEquals"
], function (Opa5, Press, AggregationFilled, AggregationLengthEquals, I18NText, PropertyStrictEquals) {
    "use strict";

    /*
     * Sayfa nesneleri (page objects): testler "ne" yapıldığını anlatır,
     * kontrolün "nasıl" bulunduğu burada saklanır. Arayüz değişirse yalnızca bu dosya güncellenir.
     */
    Opa5.createPageObjects({

        onTheHomePage: {
            assertions: {
                iShouldSeeTheStatistics: function (iCount) {
                    return this.waitFor({
                        id: "statsBox",
                        viewName: "Home",
                        matchers: new AggregationLengthEquals({ name: "items", length: iCount }),
                        success: function () {
                            Opa5.assert.ok(true, iCount + " istatistik kartı OData'dan yüklendi");
                        },
                        errorMessage: "İstatistik kartları yüklenmedi"
                    });
                },

                iShouldSeeActiveCampaigns: function () {
                    return this.waitFor({
                        id: "campaignGrid",
                        viewName: "Home",
                        matchers: new AggregationFilled({ name: "content" }),
                        success: function (oGrid) {
                            Opa5.assert.ok(oGrid.getContent().length <= 3, "ana sayfada en fazla 3 aktif kampanya");
                        },
                        errorMessage: "Ana sayfada kampanya kartı yok"
                    });
                }
            }
        },

        onTheCampaignsPage: {
            actions: {
                iSelectFilter: function (sKey) {
                    return this.waitFor({
                        id: "statusFilter",
                        viewName: "Campaigns",
                        success: function (oSegmented) {
                            var oItem = oSegmented.getItems().filter(function (i) {
                                return i.getKey() === sKey;
                            })[0];
                            // Kullanıcının seçimini taklit et: anahtarı seç ve olayı tetikle
                            oSegmented.setSelectedKey(sKey);
                            oSegmented.fireSelectionChange({ item: oItem });
                        },
                        errorMessage: "Durum filtresi bulunamadı"
                    });
                },

                iPressTheFirstDetailsButton: function () {
                    return this.waitFor({
                        controlType: "sap.m.Button",
                        viewName: "Campaigns",
                        matchers: new I18NText({ propertyName: "text", key: "details" }),
                        success: function (aButtons) {
                            new Press().executeOn(aButtons[0]);
                        },
                        errorMessage: "'Detaylar' düğmesi bulunamadı"
                    });
                }
            },
            assertions: {
                iShouldSeeCampaignCount: function (iCount) {
                    return this.waitFor({
                        id: "campaignGrid",
                        viewName: "Campaigns",
                        matchers: new AggregationLengthEquals({ name: "content", length: iCount }),
                        success: function () {
                            Opa5.assert.ok(true, "Listede " + iCount + " kampanya var");
                        },
                        errorMessage: "Beklenen sayıda kampanya yok: " + iCount
                    });
                }
            }
        },

        onTheCampaignDetailPage: {
            assertions: {
                iShouldSeeRecentDonations: function () {
                    return this.waitFor({
                        id: "donationList",
                        viewName: "CampaignDetail",
                        matchers: new AggregationFilled({ name: "items" }),
                        success: function () {
                            Opa5.assert.ok(true, "Son bağışlar $expand ile yüklendi");
                        },
                        errorMessage: "Son bağışlar listesi boş"
                    });
                }
            }
        },

        onTheNotFoundPage: {
            assertions: {
                iShouldSeeTheNotFoundMessage: function () {
                    return this.waitFor({
                        controlType: "sap.m.IllustratedMessage",
                        viewName: "NotFound",
                        success: function () {
                            Opa5.assert.ok(true, "404 sayfası gösterildi");
                        },
                        errorMessage: "404 sayfası gösterilmedi"
                    });
                }
            }
        },

        onTheFormPage: {
            actions: {
                iPressTheButton: function (sViewName, sButtonId) {
                    return this.waitFor({
                        id: sButtonId,
                        viewName: sViewName,
                        actions: new Press(),
                        errorMessage: "Düğme bulunamadı: " + sButtonId
                    });
                }
            },
            assertions: {
                iShouldSeeAnErrorOn: function (sViewName, sControlId) {
                    return this.waitFor({
                        id: sControlId,
                        viewName: sViewName,
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
