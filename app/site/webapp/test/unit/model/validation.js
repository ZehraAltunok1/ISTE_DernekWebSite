sap.ui.define([
    "pg/site/model/validation"
], function (validation) {
    "use strict";

    QUnit.module("validation — tekil kurallar");

    QUnit.test("isEmail", function (assert) {
        assert.ok(validation.isEmail("ad@example.com"));
        assert.ok(validation.isEmail("  ad@example.com  "), "baştaki/sondaki boşluk yok sayılır");
        assert.notOk(validation.isEmail("ad@"), "alan adı yok");
        assert.notOk(validation.isEmail("ad example.com"), "@ yok");
        assert.notOk(validation.isEmail(undefined), "tanımsız değer");
    });

    QUnit.test("isPhone", function (assert) {
        assert.ok(validation.isPhone("0555 000 00 00"));
        assert.ok(validation.isPhone("+90 (555) 000-0000"));
        assert.notOk(validation.isPhone("12345"), "çok kısa");
        assert.notOk(validation.isPhone("0555-abc-0000"), "harf içeriyor");
    });

    QUnit.test("isAmount: 10 ₺ – 100.000 ₺", function (assert) {
        assert.ok(validation.isAmount(10));
        assert.ok(validation.isAmount("250"), "metin olarak sayı");
        assert.notOk(validation.isAmount(9.99));
        assert.notOk(validation.isAmount(100001));
        assert.notOk(validation.isAmount("abc"));
    });

    QUnit.module("validation — formlar");

    QUnit.test("checkVolunteerApplication: geçerli form", function (assert) {
        var oResult = validation.checkVolunteerApplication({
            firstName: "Ada", lastName: "Test", email: "ada@example.com", phone: "0555 000 00 00",
            areaCode: "care", motivation: "Hayvanlara yardım etmeyi çok istiyorum.", consentGiven: true
        });
        assert.ok(oResult.valid);
        assert.strictEqual(oResult.states.email, "None");
    });

    QUnit.test("checkVolunteerApplication: hatalı alanlar Error olarak işaretlenir", function (assert) {
        var oResult = validation.checkVolunteerApplication({
            firstName: "A", lastName: "Test", email: "bozuk", phone: "0555 000 00 00",
            areaCode: "", motivation: "kısa", consentGiven: false
        });
        assert.notOk(oResult.valid);
        assert.deepEqual(
            Object.keys(oResult.states).filter(function (k) { return oResult.states[k] === "Error"; }).sort(),
            ["areaCode", "consentGiven", "email", "firstName", "motivation"]
        );
    });

    QUnit.test("checkContactMessage", function (assert) {
        var oValid = { name: "Ada", email: "ada@example.com", subject: "Soru", message: "Bilgi almak istiyorum.", consentGiven: true };
        assert.ok(validation.checkContactMessage(oValid).valid);
        assert.notOk(validation.checkContactMessage(Object.assign({}, oValid, { message: "kısa" })).valid);
    });

    QUnit.test("checkDonor", function (assert) {
        assert.ok(validation.checkDonor({ donorName: "Ada Test", donorEmail: "ada@example.com" }).valid);
        assert.strictEqual(validation.checkDonor({ donorName: "", donorEmail: "ada@example.com" }).states.donorName, "Error");
    });

    QUnit.test("checkAdoptionApplication: ev halkı onayı ve konut tipi zorunlu", function (assert) {
        var oValid = {
            firstName: "Ada", lastName: "Test", email: "ada@example.com", phone: "0555 000 00 00", city: "Hatay",
            housingType: "House", experience: "Bahçeli evimizde köpek deneyimimiz var.", householdAgrees: true, consentGiven: true
        };
        assert.ok(validation.checkAdoptionApplication(oValid).valid);
        var oResult = validation.checkAdoptionApplication(Object.assign({}, oValid, { householdAgrees: false, housingType: "Castle" }));
        assert.notOk(oResult.valid);
        assert.strictEqual(oResult.states.householdAgrees, "Error");
        assert.strictEqual(oResult.states.housingType, "Error");
    });
});
