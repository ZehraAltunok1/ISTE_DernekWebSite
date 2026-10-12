sap.ui.define([
    "pg/site/control/ProgressMeter",
    "sap/ui/qunit/utils/nextUIUpdate"
], function (ProgressMeter, nextUIUpdate) {
    "use strict";

    var oMeter;

    QUnit.module("ProgressMeter (özel kontrol)", {
        afterEach: function () {
            if (oMeter) {
                oMeter.destroy();
                oMeter = null;
            }
        }
    });

    QUnit.test("getPercent: oran 0–100 aralığına sıkıştırılır", function (assert) {
        oMeter = new ProgressMeter({ value: 20250, max: 40000 });
        assert.strictEqual(Math.round(oMeter.getPercent()), 51);
        oMeter.setValue(50000);
        assert.strictEqual(oMeter.getPercent(), 100, "hedef aşılsa da en fazla 100");
        oMeter.setMax(0);
        assert.strictEqual(oMeter.getPercent(), 0, "üst sınır 0 ise 0 (sıfıra bölme yok)");
    });

    QUnit.test("getDisplayText: valueText yoksa dile göre yüzde (Türkçe: %25)", function (assert) {
        oMeter = new ProgressMeter({ value: 1, max: 4 });
        assert.strictEqual(oMeter.getDisplayText(), "%25");
        oMeter.setValueText("3 / 60 kişi");
        assert.strictEqual(oMeter.getDisplayText(), "3 / 60 kişi");
    });

    QUnit.test("render: erişilebilirlik öznitelikleri ve renk sınıfı", async function (assert) {
        oMeter = new ProgressMeter({ value: 30, max: 40, label: "Kampanya ilerlemesi", state: "Warning" });
        oMeter.placeAt("qunit-fixture");
        await nextUIUpdate();

        var oDom = oMeter.getDomRef();
        assert.strictEqual(oDom.getAttribute("role"), "progressbar");
        assert.strictEqual(oDom.getAttribute("aria-valuenow"), "75");
        assert.strictEqual(oDom.getAttribute("aria-valuetext"), "%75");
        assert.strictEqual(oDom.getAttribute("aria-label"), "Kampanya ilerlemesi");
        assert.ok(oDom.classList.contains("pgMeterWarning"), "Warning durumu turuncu sınıfı ekler");
        assert.strictEqual(oDom.querySelector(".pgMeterText").textContent, "%75");
    });

    QUnit.test("değer değişince yeniden çizilir; çubuk yeni genişliğe kayar", async function (assert) {
        oMeter = new ProgressMeter({ value: 10, max: 100 });
        oMeter.placeAt("qunit-fixture");
        await nextUIUpdate();

        oMeter.setValue(60);
        await nextUIUpdate();
        await new Promise(function (resolve) {
            window.requestAnimationFrame(resolve);
        });
        assert.strictEqual(oMeter.getDomRef("fill").style.width, "60%");
        assert.strictEqual(oMeter.getDomRef().getAttribute("aria-valuenow"), "60");
    });
});
