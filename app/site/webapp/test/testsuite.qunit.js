/*
 * UI5 Test Starter — test paketi tanımı.
 * Bütün test sayfaları buradan üretilir: testsuite.qunit.html açıldığında
 * aşağıdaki her test için Test.qunit.html?testsuite=...&test=... sayfası çalıştırılır.
 */
sap.ui.define(function () {
    "use strict";

    return {
        name: "Pati ve Gelecek — site testleri",
        defaults: {
            page: "ui5://test-resources/pg/site/Test.qunit.html?testsuite={suite}&test={name}",
            qunit: {
                version: 2
            },
            sinon: {
                version: 4
            },
            ui5: {
                language: "tr",
                theme: "sap_horizon",
                "xx-componentPreload": "off"
            },
            coverage: {
                only: "pg/site/",
                never: "test-resources/pg/site/"
            },
            loader: {
                paths: {
                    "pg/site": "../"
                }
            }
        },
        tests: {
            "unit/unitTests": {
                title: "Birim testleri (formatter, doğrulama)"
            },
            "integration/opaTests": {
                title: "Entegrasyon testleri (OPA5) — CAP sunucusu açık olmalı",
                timeout: 120
            }
        }
    };
});
