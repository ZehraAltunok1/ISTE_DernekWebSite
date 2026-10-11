sap.ui.define([
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/actions/EnterText",
    "sap/ui/test/matchers/AggregationLengthEquals",
    "sap/ui/test/matchers/PropertyStrictEquals"
], function (Opa5, Press, EnterText, AggregationLengthEquals, PropertyStrictEquals) {
    "use strict";

    // Giriş penceresi kök view'a (App) bağlıdır
    var LOGIN_VIEW = "App";

    Opa5.createPageObjects({

        onTheLoginDialog: {
            actions: {
                iLogInAs: function (sEmail, sPassword) {
                    this.waitFor({
                        id: "loginEmail",
                        viewName: LOGIN_VIEW,
                        searchOpenDialogs: true,
                        actions: new EnterText({ text: sEmail, clearTextFirst: true })
                    });
                    this.waitFor({
                        id: "loginPassword",
                        viewName: LOGIN_VIEW,
                        searchOpenDialogs: true,
                        actions: new EnterText({ text: sPassword, clearTextFirst: true })
                    });
                    return this.waitFor({
                        id: "loginSubmit",
                        viewName: LOGIN_VIEW,
                        searchOpenDialogs: true,
                        actions: new Press(),
                        errorMessage: "Giriş düğmesi bulunamadı"
                    });
                }
            },
            assertions: {
                iShouldSeeTheLoginError: function () {
                    return this.waitFor({
                        id: "loginError",
                        viewName: LOGIN_VIEW,
                        searchOpenDialogs: true,
                        matchers: new PropertyStrictEquals({ name: "visible", value: true }),
                        success: function () {
                            Opa5.assert.ok(true, "Hatalı giriş mesajı gösterildi");
                        },
                        errorMessage: "Hatalı giriş mesajı görünmedi"
                    });
                }
            }
        },

        onTheAccountPage: {
            actions: {
                iLogOut: function () {
                    return this.waitFor({
                        id: "logoutButton",
                        viewName: "Account",
                        actions: new Press(),
                        errorMessage: "Çıkış düğmesi bulunamadı"
                    });
                }
            },
            assertions: {
                iShouldSeeMyDonations: function (iCount) {
                    return this.waitFor({
                        id: "donationTable",
                        viewName: "Account",
                        matchers: new AggregationLengthEquals({ name: "items", length: iCount }),
                        success: function () {
                            Opa5.assert.ok(true, "Üyenin " + iCount + " bağışı listelendi");
                        },
                        errorMessage: "Bağışlarım tablosunda beklenen satır yok"
                    });
                },

                iShouldSeeTheAccountButtonText: function (sText) {
                    return this.waitFor({
                        id: "accountButton",
                        viewName: "App",
                        matchers: new PropertyStrictEquals({ name: "text", value: sText }),
                        success: function () {
                            Opa5.assert.ok(true, "Menüdeki hesap düğmesi: " + sText);
                        },
                        errorMessage: "Hesap düğmesinin metni '" + sText + "' değil"
                    });
                }
            }
        }
    });
});
