sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/App",
    "./pages/Events"
], function (opaTest) {
    "use strict";

    QUnit.module("Etkinlikler");

    // Demo tarihleri sunucu açılırken haftalık kaydırıldığı için (server.js) sayılar her gün aynıdır:
    // 6 yaklaşan (biri iptal), 1 geçmiş; taslak etkinlik sitede hiç görünmez.
    opaTest("Etkinlikler zamana göre sunucuda filtrelenir", function (Given, When, Then) {
        Given.iStartMyApp();

        When.onTheAppPage.iPressNavButton("navEventsButton");
        Then.onTheEventsPage.iShouldSeeEventCount(6);
        Then.onTheAppPage.iShouldSeeTheTabTitle("Etkinlikler");

        When.onTheEventsPage.iSelectTimeFilter("Past");
        Then.onTheEventsPage.iShouldSeeEventCount(1);

        When.onTheEventsPage.iSelectTimeFilter("Upcoming");
        Then.onTheEventsPage.iShouldSeeEventCount(6);
    });

    opaTest("Boş kayıt formu gönderilemez", function (Given, When, Then) {
        When.onTheEventsPage.iPressTheFirstDetailsButton();
        When.onTheEventDetailPage.iPressRegister();
        When.onTheEventDetailPage.iSubmitTheRegistration();

        Then.onTheEventDetailPage.iShouldSeeAnErrorInTheDialog("regName")
            .and.iShouldSeeAnErrorInTheDialog("regEmail")
            .and.iShouldSeeAnErrorInTheDialog("regConsent");

        Then.iTeardownMyUIComponent();
    });
});
