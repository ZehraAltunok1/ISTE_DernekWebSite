sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/App",
    "./pages/Gallery"
], function (opaTest) {
    "use strict";

    QUnit.module("Galeri");

    opaTest("Yayındaki albümler listelenir; albüm fotoğrafları büyük açılır", function (Given, When, Then) {
        Given.iStartMyApp("galeri");

        // 4 albümden biri yayında değil
        Then.onTheGalleryPage.iShouldSeeAlbumCount(3);

        When.onTheGalleryPage.iOpenTheFirstAlbum();
        Then.onTheAlbumPage.iShouldSeePhotoCount(5);

        When.onTheAlbumPage.iPressTheFirstPhoto();
        Then.onTheAlbumPage.iShouldSeeTheLightBox();

        Then.iTeardownMyUIComponent();
    });
});
