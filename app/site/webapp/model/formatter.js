sap.ui.define([
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/format/DateFormat"
], function (NumberFormat, DateFormat) {
    "use strict";

    // OData V4, Decimal değerleri metin olarak gönderir ("20250.00"); bu yüzden önce sayıya çeviriyoruz.
    var toNumber = function (vValue) {
        var n = Number(vValue);
        return Number.isFinite(n) ? n : 0;
    };

    var oCurrency = NumberFormat.getCurrencyInstance({ currencyCode: false, maxFractionDigits: 0 });
    var oInteger = NumberFormat.getIntegerInstance({ groupingEnabled: true });
    var oDate = DateFormat.getDateInstance({ style: "long" });
    var oDay = DateFormat.getDateInstance({ pattern: "d" });
    var oMonth = DateFormat.getDateInstance({ pattern: "MMM" });
    var oFullDate = DateFormat.getDateInstance({ pattern: "d MMMM y EEEE" });
    var oTime = DateFormat.getTimeInstance({ pattern: "HH:mm" });
    var MS_PER_DAY = 24 * 60 * 60 * 1000;

    var formatter = {

        /** 20250 → "20.250 ₺" */
        currency: function (vAmount) {
            return oCurrency.format(toNumber(vAmount), "TRY");
        },

        /** 1500 → "1.500" */
        integer: function (vValue) {
            return oInteger.format(toNumber(vValue));
        },

        /** Toplanan / hedef → 0–100 arası tam sayı (ProgressIndicator için) */
        percent: function (vRaised, vGoal) {
            var nGoal = toNumber(vGoal);
            if (nGoal <= 0) {
                return 0;
            }
            return Math.min(100, Math.round(toNumber(vRaised) / nGoal * 100));
        },

        /** "%54" (Türkçede yüzde işareti sayının önüne yazılır) */
        percentText: function (vRaised, vGoal) {
            return "%" + formatter.percent(vRaised, vGoal);
        },

        /** ("Hedef", 40000) → "Hedef: 40.000 ₺" */
        labelCurrency: function (sLabel, vAmount) {
            return sLabel + ": " + formatter.currency(vAmount);
        },

        /** "2026-10-04" → "4 Ekim 2026" */
        date: function (sDate) {
            return sDate ? oDate.format(new Date(sDate)) : "";
        },

        /**
         * Kampanyanın bitişine kalan gün sayısını metne çevirir.
         * this: controller — view'da ".formatter.daysLeft" diye çağrıldığı için
         * i18n metinlerine BaseController.getText ile erişebiliriz.
         */
        daysLeft: function (sEndDate, sStatus) {
            if (sStatus === "Completed") {
                return this.getText("campaignCompleted");
            }
            if (!sEndDate) {
                return "";
            }
            var nDays = Math.ceil((new Date(sEndDate) - new Date()) / MS_PER_DAY);
            if (nDays < 0) {
                return this.getText("campaignEnded");
            }
            return nDays === 0 ? this.getText("campaignLastDay") : this.getText("campaignDaysLeft", [nDays]);
        },

        /**
         * Bağış tutarının somut karşılığı: 50 ₺ ≈ 1 haftalık mama, 200 ₺ ≈ 1 temel tedavi.
         * this: controller
         */
        donationImpact: function (vAmount) {
            var nAmount = toNumber(vAmount);
            if (nAmount >= 200) {
                return this.getText("impactTreatment", [Math.floor(nAmount / 200)]);
            }
            return this.getText("impactFood", [Math.max(1, Math.floor(nAmount / 50))]);
        },

        /**
         * Yaş (ay) → "8 aylık" / "3 yaşında". this: controller
         */
        ageText: function (vMonths) {
            if (vMonths === null || vMonths === undefined || vMonths === "") {
                return "";
            }
            var nMonths = toNumber(vMonths);
            return nMonths < 12
                ? this.getText("ageMonths", [Math.max(1, nMonths)])
                : this.getText("ageYears", [Math.floor(nMonths / 12)]);
        },

        /** ("Köpek", "Erkek", 36) → "Köpek · Erkek · 3 yaşında". this: controller */
        animalSummary: function (sSpecies, sSex, vMonths) {
            return [sSpecies, sSex, formatter.ageText.call(this, vMonths)].filter(Boolean).join(" · ");
        },

        /** "Uysal, Çocuklarla iyi" → "Uysal · Çocuklarla iyi" */
        traitsText: function (sTraits) {
            return (sTraits || "").split(",").map(function (s) {
                return s.trim();
            }).filter(Boolean).join(" · ");
        },

        /** Hayvan durumu → ObjectStatus rengi */
        animalStatusState: function (sStatus) {
            switch (sStatus) {
                case "Available": return "Success";
                case "Reserved": return "Warning";
                case "InTreatment": return "Information";
                default: return "None";
            }
        },

        // ── Etkinlikler ─────────────────────────────────────

        /** "2026-10-18T07:00:00Z" → "18" (tarih rozeti) */
        eventDay: function (sDateTime) {
            return sDateTime ? oDay.format(new Date(sDateTime)) : "";
        },

        /** "2026-10-18T07:00:00Z" → "EKİ" */
        eventMonth: function (sDateTime) {
            return sDateTime ? oMonth.format(new Date(sDateTime)).toLocaleUpperCase("tr-TR") : "";
        },

        /** → "18 Ekim 2026 Pazar" */
        eventDate: function (sDateTime) {
            return sDateTime ? oFullDate.format(new Date(sDateTime)) : "";
        },

        /** (başlangıç, bitiş) → "10:00 – 16:00" */
        eventTime: function (sStart, sEnd) {
            if (!sStart) {
                return "";
            }
            var sText = oTime.format(new Date(sStart));
            return sEnd ? sText + " – " + oTime.format(new Date(sEnd)) : sText;
        },

        /** Kayıt yapılabilir mi? Yayında + gelecekte + boş yer var. */
        canRegister: function (sStatus, sStart, vRegistered, vCapacity) {
            return sStatus === "Published" && !!sStart && new Date(sStart) > new Date()
                && toNumber(vRegistered) < toNumber(vCapacity);
        },

        /** (12, 60) → "12 / 60 kişi". this: controller */
        capacityText: function (vRegistered, vCapacity) {
            return this.getText("capacityText", [toNumber(vRegistered), toNumber(vCapacity)]);
        },

        /** Kayıt durumunu anlatan kısa metin. this: controller */
        registrationHint: function (sStatus, sStart, vRegistered, vCapacity) {
            var nLeft = toNumber(vCapacity) - toNumber(vRegistered);
            if (sStatus === "Cancelled") {
                return this.getText("eventCancelled");
            }
            if (sStart && new Date(sStart) <= new Date()) {
                return this.getText("eventPast");
            }
            if (nLeft <= 0) {
                return this.getText("eventFull");
            }
            return this.getText("seatsLeft", [nLeft]);
        },

        /** Kayıt durumu → ObjectStatus rengi (sıra registrationHint ile aynı) */
        registrationState: function (sStatus, sStart, vRegistered, vCapacity) {
            if (sStatus === "Cancelled") {
                return "Error";
            }
            if (sStart && new Date(sStart) <= new Date()) {
                return "None";
            }
            if (toNumber(vRegistered) >= toNumber(vCapacity)) {
                return "Error";
            }
            return toNumber(vCapacity) - toNumber(vRegistered) <= 5 ? "Warning" : "Success";
        },

        /** Duyuru türü → liste satırının renkli şeridi (sap.ui.core.MessageType / IndicationColor) */
        announcementHighlight: function (sType) {
            switch (sType) {
                case "Urgent": return "Error";
                case "Warning": return "Warning";
                case "Success": return "Success";
                default: return "Information";
            }
        },

        /** Duyuru türü → ikon */
        announcementIcon: function (sType) {
            switch (sType) {
                case "Urgent": return "sap-icon://alert";
                case "Warning": return "sap-icon://warning";
                case "Success": return "sap-icon://sys-enter-2";
                default: return "sap-icon://message-information";
            }
        }
    };

    return formatter;
});
