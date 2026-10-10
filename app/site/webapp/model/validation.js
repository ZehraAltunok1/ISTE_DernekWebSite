sap.ui.define([], function () {
    "use strict";

    /*
     * Form doğrulama kuralları — saf fonksiyonlar (UI5 kontrollerine bağımlı değil),
     * bu yüzden QUnit ile kolayca test edilebilir (test/unit/model/validation.js).
     * Sunucu aynı kuralları ayrıca kontrol eder; istemci doğrulaması yalnızca hızlı geri bildirim içindir.
     */

    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var PHONE = /^[0-9+()\s-]{10,20}$/;

    var trim = function (v) {
        return typeof v === "string" ? v.trim() : "";
    };

    /** Her alanın sonucunu ValueState'e ("None" / "Error") çevirir. */
    var toResult = function (oChecks) {
        var oStates = {};
        var bValid = true;
        Object.keys(oChecks).forEach(function (sField) {
            oStates[sField] = oChecks[sField] ? "None" : "Error";
            bValid = bValid && oChecks[sField];
        });
        return { valid: bValid, states: oStates };
    };

    var validation = {
        MIN_AMOUNT: 10,
        MAX_AMOUNT: 100000,
        MIN_MOTIVATION: 20,
        MIN_MESSAGE: 10,

        isEmail: function (sValue) {
            return EMAIL.test(trim(sValue));
        },

        isPhone: function (sValue) {
            return PHONE.test(trim(sValue));
        },

        isName: function (sValue) {
            return trim(sValue).length >= 2;
        },

        isAmount: function (vValue) {
            var n = Number(vValue);
            return Number.isFinite(n) && n >= validation.MIN_AMOUNT && n <= validation.MAX_AMOUNT;
        },

        checkDonor: function (d) {
            return toResult({
                donorName: validation.isName(d.donorName),
                donorEmail: validation.isEmail(d.donorEmail)
            });
        },

        checkVolunteerApplication: function (d) {
            return toResult({
                firstName: validation.isName(d.firstName),
                lastName: validation.isName(d.lastName),
                email: validation.isEmail(d.email),
                phone: validation.isPhone(d.phone),
                areaCode: !!d.areaCode,
                motivation: trim(d.motivation).length >= validation.MIN_MOTIVATION,
                consentGiven: d.consentGiven === true
            });
        },

        checkContactMessage: function (d) {
            return toResult({
                name: validation.isName(d.name),
                email: validation.isEmail(d.email),
                subject: trim(d.subject).length >= 3,
                message: trim(d.message).length >= validation.MIN_MESSAGE,
                consentGiven: d.consentGiven === true
            });
        }
    };

    return validation;
});
