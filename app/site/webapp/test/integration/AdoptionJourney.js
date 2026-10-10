sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/App",
    "./pages/Adoption"
], function (opaTest) {
    "use strict";

    QUnit.module("Sahiplendirme");

    opaTest("İlanlar listelenir ve türe göre sunucuda filtrelenir", function (Given, When, Then) {
        Given.iStartMyApp();

        When.onTheAppPage.iPressNavButton("navAdoptButton");
        Then.onTheAnimalsPage.iShouldSeeAnimalCount(6);

        When.onTheAnimalsPage.iFilterBySpecies("Cat");
        Then.onTheAnimalsPage.iShouldSeeAnimalCount(2);
    });

    opaTest("İlan detayında fotoğraflar görünür; boş başvuru gönderilemez", function (Given, When, Then) {
        When.onTheAnimalsPage.iPressTheFirstMeetButton();
        Then.onTheAnimalDetailPage.iShouldSeeThePhotoCarousel();

        When.onTheAnimalDetailPage.iPressAdopt();
        When.onTheAnimalDetailPage.iSubmitTheApplication();

        Then.onTheAnimalDetailPage.iShouldSeeAnErrorInTheDialog("adoptFirstName")
            .and.iShouldSeeAnErrorInTheDialog("adoptHousing")
            .and.iShouldSeeAnErrorInTheDialog("adoptHousehold");

        Then.iTeardownMyUIComponent();
    });
});
