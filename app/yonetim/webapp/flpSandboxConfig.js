/*
 * Yerel Fiori Launchpad (FLP) sandbox ayarı — sandbox2.js'ten ÖNCE yüklenmelidir.
 * Gerçek SAP sistemlerinde uygulamalar FLP içinde çalışır; sandbox bu ortamı taklit eder
 * ve bize üst bar, "Ana Sayfa" / "Geri" düğmeleri ile uygulama kutucuğu sağlar.
 * (Satır içi <script> yerine ayrı dosya: Content Security Policy uyumu için.)
 */
window["sap-ushell-config"] = {
    defaultRenderer: "fiori2",
    renderers: {
        fiori2: {
            componentData: {
                config: { search: "hidden", enablePersonalization: false }
            }
        }
    },
    applications: {
        "PatiVeGelecek-manage": {
            title: "Yönetim Paneli",
            description: "Bağış, gönüllü ve içerik yönetimi",
            icon: "sap-icon://heart",
            additionalInformation: "SAPUI5.Component=pg.yonetim",
            applicationType: "URL",
            url: "./"
        }
    }
};

// Doğrudan uygulamayla başla (kutucuk ekranını görmek için adres çubuğunda #Shell-home açın)
if (!window.location.hash) {
    window.location.hash = "#PatiVeGelecek-manage";
}
