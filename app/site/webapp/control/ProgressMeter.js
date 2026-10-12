sap.ui.define([
    "sap/ui/core/Control",
    "sap/ui/core/library",
    "sap/ui/core/format/NumberFormat"
], function (Control, coreLibrary, NumberFormat) {
    "use strict";

    var ValueState = coreLibrary.ValueState;

    /**
     * ProgressMeter — projenin kendi (custom) kontrolü.
     *
     * Bir değerin bir üst sınıra oranını yuvarlak uçlu, marka renklerinde bir çubukla gösterir
     * (kampanyada toplanan / hedef, etkinlikte kayıtlı / kontenjan).
     *
     * Öğrenme noktaları:
     *  - metadata: özellikler (property) ve tipleri; XML'de <pg:ProgressMeter value="..."/> diye kullanılır
     *  - renderer (apiVersion 2): HTML'i RenderManager ile yazmak; UI5 yalnızca değişen kısmı günceller
     *  - yaşam döngüsü: onBeforeRendering / onAfterRendering ile animasyon
     *  - erişilebilirlik: role="progressbar" ve aria-value* öznitelikleri
     *  - yerelleştirme: yüzde metni NumberFormat ile dile göre ("%54" / "54%")
     *
     * Hazır sap.m.ProgressIndicator yerine bunu yazmamızın nedeni: tema iç sınıflarını
     * (.sapMPIBar...) CSS ile ezmek kırılgandır; kendi kontrolümüzde HTML ve sınıflar bize aittir.
     */
    var ProgressMeter = Control.extend("pg.site.control.ProgressMeter", {
        metadata: {
            properties: {
                /** Şu anki değer (ör. toplanan tutar) */
                value: { type: "float", defaultValue: 0 },
                /** Üst sınır (ör. hedef tutar). 0 ya da boşsa yüzde 0 kabul edilir. */
                max: { type: "float", defaultValue: 100 },
                /** Çubuğun yanında gösterilecek metin; boşsa yüzde yazılır. */
                valueText: { type: "string", defaultValue: "" },
                /** Ekran okuyucu için açıklama (ör. "Kampanya ilerlemesi") */
                label: { type: "string", defaultValue: "" },
                /** Renk: None = marka yeşili, Warning = turuncu, Error = kırmızı, Success = koyu yeşil */
                state: { type: "sap.ui.core.ValueState", defaultValue: ValueState.None },
                /** Metin gösterilsin mi? */
                showText: { type: "boolean", defaultValue: true }
            }
        },

        renderer: {
            apiVersion: 2,

            /**
             * @param {sap.ui.core.RenderManager} oRm HTML yazıcısı
             * @param {pg.site.control.ProgressMeter} oControl çizilecek kontrol
             */
            render: function (oRm, oControl) {
                var fPercent = oControl.getPercent();
                var sState = oControl.getState();

                oRm.openStart("div", oControl);
                oRm.class("pgMeter");
                if (sState !== ValueState.None) {
                    oRm.class("pgMeter" + sState);
                }
                oRm.attr("role", "progressbar");
                oRm.attr("aria-valuemin", "0");
                oRm.attr("aria-valuemax", "100");
                oRm.attr("aria-valuenow", String(Math.round(fPercent)));
                oRm.attr("aria-valuetext", oControl.getDisplayText());
                if (oControl.getLabel()) {
                    oRm.attr("aria-label", oControl.getLabel());
                }
                oRm.openEnd();

                oRm.openStart("div").class("pgMeterTrack").openEnd();
                // Önce eski genişlikle çizilir; onAfterRendering yeni genişliğe kaydırır (CSS transition)
                oRm.openStart("div", oControl.getId() + "-fill")
                    .class("pgMeterFill")
                    .style("width", oControl._fRenderedPercent + "%")
                    .openEnd()
                    .close("div");
                oRm.close("div");

                if (oControl.getShowText()) {
                    oRm.openStart("span").class("pgMeterText").openEnd();
                    oRm.text(oControl.getDisplayText());
                    oRm.close("span");
                }

                oRm.close("div");
            }
        },

        init: function () {
            // Animasyon ilk açılışta 0'dan başlar, sonraki değişikliklerde önceki değerden
            this._fRenderedPercent = 0;
        },

        onAfterRendering: function () {
            var oFill = this.getDomRef("fill");
            var fPercent = this.getPercent();
            if (!oFill) {
                return;
            }
            // Bir sonraki karede genişliği değiştir ki tarayıcı geçişi (transition) oynatsın
            window.requestAnimationFrame(function () {
                oFill.style.width = fPercent + "%";
            });
            this._fRenderedPercent = fPercent;
        },

        /** @returns {number} 0–100 arasında yüzde */
        getPercent: function () {
            var fMax = this.getMax();
            if (!(fMax > 0)) {
                return 0;
            }
            return Math.max(0, Math.min(100, this.getValue() / fMax * 100));
        },

        /** @returns {string} valueText ya da dile göre biçimlenmiş yüzde */
        getDisplayText: function () {
            return this.getValueText() || ProgressMeter.formatPercent(this.getPercent());
        }
    });

    /** "%54" (tr) / "54%" (en) — NumberFormat oranı (0.54) bekler */
    ProgressMeter.formatPercent = function (fPercent) {
        return NumberFormat.getPercentInstance({ maxFractionDigits: 0 }).format(Math.round(fPercent) / 100);
    };

    return ProgressMeter;
});
