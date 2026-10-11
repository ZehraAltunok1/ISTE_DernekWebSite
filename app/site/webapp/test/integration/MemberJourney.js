sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/App",
    "./pages/Member"
], function (opaTest) {
    "use strict";

    QUnit.module("Üye alanı");

    // Demo hesabı (package.json → cds.requires.auth); gerçek bir hesap değildir.
    var DEMO_EMAIL = "uye@example.com";

    opaTest("Yanlış şifre reddedilir; doğru şifreyle Hesabım açılır ve çıkış yapılır", function (Given, When, Then) {
        Given.iStartMyApp();

        When.onTheAppPage.iPressNavButton("accountButton");
        When.onTheLoginDialog.iLogInAs(DEMO_EMAIL, "yanlis-sifre");
        Then.onTheLoginDialog.iShouldSeeTheLoginError();

        When.onTheLoginDialog.iLogInAs(DEMO_EMAIL, "uye123");
        Then.onTheAccountPage.iShouldSeeMyDonations(2)
            .and.iShouldSeeTheAccountButtonText("Demo Üye");

        When.onTheAccountPage.iLogOut();
        Then.onTheAccountPage.iShouldSeeTheAccountButtonText("Giriş Yap");

        Then.iTeardownMyUIComponent();
    });
});
