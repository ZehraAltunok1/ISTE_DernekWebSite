sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/App",
    "./pages/Pages"
], function (opaTest) {
    "use strict";

    QUnit.module("Gezinme");

    opaTest("Ana sayfa açılır; istatistikler ve aktif kampanyalar backend'den gelir", function (Given, When, Then) {
        Given.iStartMyApp();

        Then.onTheHomePage.iShouldSeeTheStatistics(4)
            .and.iShouldSeeActiveCampaigns();
        Then.onTheAppPage.iShouldSeeTheTabTitle("Ana Sayfa");
    });

    opaTest("Menüden Kampanyalar sayfasına gidilir ve filtre sunucuda uygulanır", function (Given, When, Then) {
        When.onTheAppPage.iPressNavButton("navCampaignsButton");
        Then.onTheCampaignsPage.iShouldSeeCampaignCount(3);

        When.onTheCampaignsPage.iSelectFilter("Completed");
        Then.onTheCampaignsPage.iShouldSeeCampaignCount(1);

        When.onTheCampaignsPage.iSelectFilter("All");
        Then.onTheCampaignsPage.iShouldSeeCampaignCount(4);
    });

    opaTest("Kampanya detayında son bağışlar listelenir", function (Given, When, Then) {
        When.onTheCampaignsPage.iPressTheFirstDetailsButton();
        Then.onTheCampaignDetailPage.iShouldSeeRecentDonations();
    });

    opaTest("Taslak kampanya ve bilinmeyen adres 404 sayfasına düşer", function (Given, When, Then) {
        When.onTheAppPage.iNavigateToHash("kampanyalar/c0000000-0000-4000-8000-000000000005");
        Then.onTheNotFoundPage.iShouldSeeTheNotFoundMessage();

        When.onTheAppPage.iNavigateToHash("boyle-bir-sayfa-yok");
        Then.onTheNotFoundPage.iShouldSeeTheNotFoundMessage();

        Then.iTeardownMyUIComponent();
    });
});
