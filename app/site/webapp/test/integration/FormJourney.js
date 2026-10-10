sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/App",
    "./pages/Pages"
], function (opaTest) {
    "use strict";

    QUnit.module("Formlar");

    opaTest("Boş gönüllü başvurusu gönderilemez; hatalı alanlar işaretlenir", function (Given, When, Then) {
        Given.iStartMyApp("gonullu-ol");

        When.onTheFormPage.iPressTheButton("Volunteer", "submitButton");

        Then.onTheFormPage.iShouldSeeAnErrorOn("Volunteer", "firstName")
            .and.iShouldSeeAnErrorOn("Volunteer", "email")
            .and.iShouldSeeAnErrorOn("Volunteer", "motivation");
    });

    opaTest("Boş iletişim formu gönderilemez", function (Given, When, Then) {
        When.onTheAppPage.iPressNavButton("navContactButton");
        When.onTheFormPage.iPressTheButton("Contact", "contactSubmit");

        Then.onTheFormPage.iShouldSeeAnErrorOn("Contact", "contactName")
            .and.iShouldSeeAnErrorOn("Contact", "contactEmail")
            .and.iShouldSeeAnErrorOn("Contact", "contactMessage");

        Then.iTeardownMyUIComponent();
    });
});
