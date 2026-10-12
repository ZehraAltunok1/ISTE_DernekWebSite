sap.ui.define([
    "pg/site/model/formatter"
], function (formatter) {
    "use strict";

    // Bazı formatter'lar "this" olarak controller bekler (i18n metni için).
    // Testte gerçek controller yerine, anahtarı ve parametreleri döndüren sahte bir nesne kullanıyoruz.
    var oFakeController = {
        getText: function (sKey, aArgs) {
            return aArgs ? sKey + ":" + aArgs.join(",") : sKey;
        }
    };

    var isoDateFromToday = function (iDays) {
        var d = new Date();
        d.setDate(d.getDate() + iDays);
        return d.toISOString().slice(0, 10);
    };

    QUnit.module("formatter — sayılar");

    QUnit.test("currency ve integer: binlik ayırıcı nokta", function (assert) {
        assert.ok(formatter.currency("20250.00").indexOf("20.250") >= 0, "20.250 içerir: " + formatter.currency("20250.00"));
        assert.ok(formatter.currency(100).indexOf("₺") >= 0, "TL simgesi içerir");
        assert.strictEqual(formatter.integer(1500), "1.500");
    });

    QUnit.test("labelCurrency: etiket + tutar", function (assert) {
        assert.ok(formatter.labelCurrency("Hedef", 40000).indexOf("Hedef: ") === 0);
    });

    QUnit.module("formatter — tarihler ve metinler");

    QUnit.test("date: ISO tarih → uzun Türkçe tarih", function (assert) {
        assert.ok(/Ekim/.test(formatter.date("2026-10-04")), formatter.date("2026-10-04"));
        assert.strictEqual(formatter.date(null), "", "boş tarih → boş metin");
    });

    QUnit.test("daysLeft: kampanya durumuna ve bitiş tarihine göre", function (assert) {
        var daysLeft = formatter.daysLeft.bind(oFakeController);
        assert.strictEqual(daysLeft(isoDateFromToday(10), "Completed"), "campaignCompleted", "tamamlanan kampanya");
        assert.strictEqual(daysLeft(isoDateFromToday(-3), "Active"), "campaignEnded", "süresi geçmiş");
        // Saat dilimi ve günün saatine göre ±1 gün oynayabilir; testin kararlı olması için aralık kabul ediyoruz
        assert.ok(/^campaignDaysLeft:(9|10|11)$/.test(daysLeft(isoDateFromToday(10), "Active")), "yaklaşık 10 gün kaldı");
        assert.strictEqual(daysLeft(null, "Active"), "", "bitiş tarihi yok");
    });

    QUnit.test("donationImpact: 50 ₺ ≈ 1 hafta mama, 200 ₺ ≈ 1 tedavi", function (assert) {
        var impact = formatter.donationImpact.bind(oFakeController);
        assert.strictEqual(impact(100), "impactFood:2");
        assert.strictEqual(impact(10), "impactFood:1", "en az 1 hafta");
        assert.strictEqual(impact(450), "impactTreatment:2");
    });

    QUnit.test("duyuru türü → renk ve ikon", function (assert) {
        assert.strictEqual(formatter.announcementHighlight("Urgent"), "Error");
        assert.strictEqual(formatter.announcementHighlight("Info"), "Information");
        assert.strictEqual(formatter.announcementIcon("Success"), "sap-icon://sys-enter-2");
    });

    QUnit.module("formatter — sahiplendirme");

    QUnit.test("ageText: 12 aydan küçükse ay, değilse yıl", function (assert) {
        var ageText = formatter.ageText.bind(oFakeController);
        assert.strictEqual(ageText(8), "ageMonths:8");
        assert.strictEqual(ageText(0), "ageMonths:1", "yeni doğan en az 1 aylık gösterilir");
        assert.strictEqual(ageText(36), "ageYears:3");
        assert.strictEqual(ageText(null), "", "yaş bilinmiyorsa boş");
    });

    QUnit.test("animalSummary ve traitsText", function (assert) {
        var summary = formatter.animalSummary.bind(oFakeController);
        assert.strictEqual(summary("Kedi", "Dişi", 30), "Kedi · Dişi · ageYears:2");
        assert.strictEqual(summary("Köpek", null, 5), "Köpek · ageMonths:5", "eksik bilgi atlanır");
        assert.strictEqual(formatter.traitsText("Uysal, Çocuklarla iyi ,  Oyunbaz"), "Uysal · Çocuklarla iyi · Oyunbaz");
        assert.strictEqual(formatter.traitsText(null), "");
    });

    QUnit.test("animalStatusState", function (assert) {
        assert.strictEqual(formatter.animalStatusState("Available"), "Success");
        assert.strictEqual(formatter.animalStatusState("Reserved"), "Warning");
        assert.strictEqual(formatter.animalStatusState("Adopted"), "None");
    });

    QUnit.module("formatter — etkinlikler");

    var isoFromNow = function (iHours) {
        return new Date(Date.now() + iHours * 3600 * 1000).toISOString();
    };

    QUnit.test("tarih rozeti ve saat aralığı (yerel saatle)", function (assert) {
        var sStart = new Date(2026, 9, 18, 10, 0).toISOString();
        var sEnd = new Date(2026, 9, 18, 16, 30).toISOString();
        assert.strictEqual(formatter.eventDay(sStart), "18");
        assert.strictEqual(formatter.eventMonth(sStart), "EKİ", "Türkçe büyük harf (i → İ)");
        assert.strictEqual(formatter.eventTime(sStart, sEnd), "10:00 – 16:30");
        assert.strictEqual(formatter.eventTime(sStart, null), "10:00", "bitiş yoksa yalnızca başlangıç");
        assert.strictEqual(formatter.eventDay(null), "");
    });

    QUnit.test("canRegister: yayında + gelecekte + boş yer", function (assert) {
        var sFuture = isoFromNow(48);
        assert.ok(formatter.canRegister("Published", sFuture, 3, 60));
        assert.notOk(formatter.canRegister("Published", sFuture, 4, 4), "kontenjan dolu");
        assert.notOk(formatter.canRegister("Cancelled", sFuture, 0, 30), "iptal");
        assert.notOk(formatter.canRegister("Published", isoFromNow(-2), 0, 30), "başlamış");
    });

    QUnit.test("registrationHint / registrationState: iptal > geçmiş > dolu > kalan yer", function (assert) {
        var hint = formatter.registrationHint.bind(oFakeController);
        var sFuture = isoFromNow(48);
        var sPast = isoFromNow(-48);
        assert.strictEqual(hint("Cancelled", sFuture, 0, 30), "eventCancelled");
        assert.strictEqual(hint("Published", sPast, 30, 30), "eventPast", "geçmiş etkinlik dolu da olsa 'gerçekleşti'");
        assert.strictEqual(hint("Published", sFuture, 4, 4), "eventFull");
        assert.strictEqual(hint("Published", sFuture, "3", "60"), "seatsLeft:57");
        assert.strictEqual(formatter.registrationState("Published", sPast, 30, 30), "None");
        assert.strictEqual(formatter.registrationState("Published", sFuture, 4, 4), "Error");
        assert.strictEqual(formatter.registrationState("Published", sFuture, 12, 15), "Warning", "5 veya daha az yer");
        assert.strictEqual(formatter.registrationState("Published", sFuture, 3, 60), "Success");
    });

    QUnit.test("capacityText", function (assert) {
        assert.strictEqual(formatter.capacityText.call(oFakeController, "3", 60), "capacityText:3,60");
    });

    QUnit.module("formatter — galeri");

    QUnit.test("photoCount: OData $count metin olarak da gelebilir", function (assert) {
        var photoCount = formatter.photoCount.bind(oFakeController);
        assert.strictEqual(photoCount("5"), "photoCount:5");
        assert.strictEqual(photoCount(undefined), "photoCount:0");
    });

    QUnit.module("formatter — üye alanı");

    QUnit.test("criticalityState: kod tablosundaki renk numarası → durum", function (assert) {
        assert.strictEqual(formatter.criticalityState(1), "Error");
        assert.strictEqual(formatter.criticalityState("2"), "Warning");
        assert.strictEqual(formatter.criticalityState(3), "Success");
        assert.strictEqual(formatter.criticalityState(null), "None");
    });

    QUnit.test("canCancelRegistration: yalnızca gelecekteki ve 'Kayıtlı' durumundaki kayıt", function (assert) {
        var sFuture = new Date(Date.now() + 86400000).toISOString();
        var sPast = new Date(Date.now() - 86400000).toISOString();
        assert.ok(formatter.canCancelRegistration(sFuture, "Registered"));
        assert.notOk(formatter.canCancelRegistration(sPast, "Registered"), "başlamış etkinlik");
        assert.notOk(formatter.canCancelRegistration(sFuture, "Attended"), "katılım işaretlenmiş");
    });
});
