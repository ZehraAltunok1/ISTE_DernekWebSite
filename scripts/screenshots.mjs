/**
 * README ekran görüntülerini üretir → docs/screenshots/*.png
 * Kullanım: önce `npm start`, sonra ayrı terminalde `npm run screenshots`
 */
import puppeteer from "puppeteer";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:4004";
const OUT = "docs/screenshots";
// Projenin kendi demo yönetici hesabı (package.json → cds.requires.auth)
const ADMIN = { username: "admin@example.com", password: "admin123" };

const shots = [
    { name: "01-ana-sayfa", url: "/site/webapp/index.html" },
    { name: "02-ana-sayfa-kampanyalar", url: "/site/webapp/index.html", scrollTo: "[id$='home--campaignGrid']" },
    { name: "03-kampanya-detay", url: "/site/webapp/index.html#/kampanyalar/c0000000-0000-4000-8000-000000000002" },
    { name: "04-bagis-sihirbazi", url: "/site/webapp/index.html#/bagis?kampanya=c0000000-0000-4000-8000-000000000003" },
    { name: "05-hakkimizda-galeri", url: "/site/webapp/index.html#/hakkimizda", scrollTo: ".pgGallery" },
    { name: "06-iletisim", url: "/site/webapp/index.html#/iletisim" },
    { name: "07-mobil", url: "/site/webapp/index.html", mobile: true },
    { name: "08-yonetim-dashboard", url: "/yonetim/webapp/index.html#PatiVeGelecek-manage", admin: true },
    { name: "09-yonetim-bagislar", url: "/yonetim/webapp/index.html#PatiVeGelecek-manage&/Donations", admin: true },
    { name: "10-yonetim-kampanya", url: "/yonetim/webapp/index.html#PatiVeGelecek-manage&/Campaigns(ID=c0000000-0000-4000-8000-000000000001,IsActiveEntity=true)", admin: true },
    { name: "11-yonetim-mesajlar", url: "/yonetim/webapp/index.html#PatiVeGelecek-manage&/ContactMessages", admin: true },
    { name: "12-sahiplen", url: "/site/webapp/index.html#/sahiplen" },
    { name: "13-hayvan-detay", url: "/site/webapp/index.html#/sahiplen/f1000000-0000-4000-8000-000000000001" },
    { name: "14-yonetim-hayvan", url: "/yonetim/webapp/index.html#PatiVeGelecek-manage&/Animals(ID=f1000000-0000-4000-8000-000000000001,IsActiveEntity=true)", admin: true },
    { name: "15-yonetim-sahiplenme-basvurulari", url: "/yonetim/webapp/index.html#PatiVeGelecek-manage&/AdoptionApplications", admin: true },
    { name: "16-etkinlikler", url: "/site/webapp/index.html#/etkinlikler" },
    { name: "17-etkinlik-detay", url: "/site/webapp/index.html#/etkinlikler/e1000000-0000-4000-8000-000000000001" },
    { name: "18-yonetim-etkinlik", url: "/yonetim/webapp/index.html#PatiVeGelecek-manage&/Events(ID=e1000000-0000-4000-8000-000000000001,IsActiveEntity=true)", admin: true }
];

/** UI5 yüklenip bekleyen istekler bitene kadar bekler. */
async function waitForUI5(page) {
    await page.waitForFunction(() => window.sap?.ui?.require?.("sap/ui/core/Element"), { timeout: 60000 });
    // FLP arka planda bağlantı açık tutabilir; ağ hiç "boşta" olmazsa yine de devam et
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2500)); // animasyonlar ve geç gelen veriler
}

await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: true });

for (const shot of shots) {
    const page = await browser.newPage();
    await page.setViewport(shot.mobile
        ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
        : { width: 1440, height: 900, deviceScaleFactor: 1 });
    if (shot.admin) await page.authenticate(ADMIN);

    await page.goto(BASE + shot.url, { waitUntil: "domcontentloaded" });
    await waitForUI5(page);
    if (shot.scrollTo) {
        await page.evaluate(sel => document.querySelector(sel)?.scrollIntoView({ block: "start" }), shot.scrollTo);
        await new Promise(r => setTimeout(r, 800));
    }
    await page.screenshot({ path: `${OUT}/${shot.name}.png` });
    console.log("✔", shot.name);
    await page.close();
}

await browser.close();
