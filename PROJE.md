# Pati ve Gelecek Derneği — SAPUI5 Portföy Projesi

> **Durum:** v0.9 · 11 Ekim 2026 — **Faz 1 ve Faz 2 tamamlandı**; Faz 3a (özel kontrol) tamamlandı, sırada dashboard grafikleri.
> Bu doküman projenin **tek referans kaynağıdır**. Her yeni özellik önce buraya eklenir, sonra kodlanır.
> Durum işaretleri: ✅ tamamlandı · 🟡 kısmen · ⬜ yapılmadı

---

## 1. Projenin Amacı

Bu proje **gerçek bir dernek sitesi değildir.** İki amacı vardır:

1. **SAPUI5'i derinlemesine öğrenmek** — freestyle UI5, Fiori elements, OData V4, routing, data binding, fragment'lar, formatter'lar, i18n ve testler; hepsi gerçekçi bir senaryo üzerinde.
2. **GitHub'da paylaşılabilir bir portföy projesi üretmek** — temiz kod, iyi dokümantasyon, tek komutla çalışan kurulum.

**Senaryo:** *Pati ve Gelecek Derneği*, İskenderun'da sokak hayvanlarının beslenmesi, tedavisi ve sahiplendirilmesi için çalışan **hayali** bir dernek. Herkese açık site tanıtım, bağış ve gönüllülük süreçlerini; yönetim paneli bu süreçlerin yönetimini kapsar.

### Temel kurallar
- **Gerçek bilgi yok.** Kişiler, IBAN'lar, telefonlar, adresler uydurmadır (`TR00 0000 …`, `@example.com`).
- **Gerçek ödeme yok.** Bağış akışı uçtan uca çalışır ama ödeme **simüle edilir**; sayfalarda "Demo" uyarısı görünür.
- **Gerçek e-posta yok.** E-postalar sunucu konsoluna yazılır (`srv/lib/mailer.js`).
- **Görseller:** Eski projedeki fotoğraflar web için küçültüldü (34 MB → 4 MB). Kaynakları [docs/gorsel-kaynaklari.md](docs/gorsel-kaynaklari.md)'de (Pexels, Unsplash, yapay zekâ); 2 fotoğrafın kaynağı bulunamadı.
- **Klonla ve çalıştır.** `npm install && npm start` yeterli; harici hesap, veritabanı kurulumu veya gizli anahtar gerekmez.

### Başarı ölçütleri

| Ölçüt | Hedef | Durum |
|---|---|---|
| Kurulum | Temiz makinede 2 komutla çalışır | ✅ |
| Kod kalitesi | UI5 Linter + ESLint bulgusuz; tarayıcı konsolunda hata/uyarı yok | ✅ |
| Güvenlik | Yetkisiz kullanıcı hiçbir admin işlemini yapamaz (testle kanıtlı) | ✅ |
| Öğrenme | Bölüm 3'teki her konu projede en az bir yerde kullanılmış | 🟡 |
| Sunum | README'de ekran görüntüleri, mimari şeması ve demo hesaplar | ✅ (`npm run screenshots`) |
| Otomatik kontrol | Her push'ta lint + tüm testler (GitHub Actions) | ✅ |

---

## 2. Eski Projeden Öğrenilenler

| Eski projedeki sorun | Yeni projedeki çözüm |
|---|---|
| Admin API'lerinde giriş/yetki kontrolü yoktu | `@requires: 'admin'` ile servis seviyesinde deklaratif yetki; testle doğrulanıyor |
| CAP'in şifresiz demo kullanıcıları (alice vb.) admin rolüne sahip | `package.json`'da hepsi kapatıldı; yalnızca iki demo hesap var |
| `.env` GitHub'a gitti | Gizli bilgiye ihtiyaç yok; `.gitignore` ilk commit'ten önce yazıldı |
| `node_modules` repoya girdi, `.gitignore` UTF-16'ydı | `.gitignore` UTF-8; `.gitattributes` ile satır sonları sabit |
| `core:HTML` + `innerHTML` ile veri basıldı (XSS) | Arayüz yalnızca UI5 kontrolleriyle; ham HTML yok |
| `localhost:3000` 32 yerde sabit | Servis adresi yalnızca `manifest.json` → `dataSources`'ta, göreli yolla |
| 38 ayrı `fetch`, elle `JSONModel` doldurma | OData V4 modeli + binding; action'lar `bindContext("/donate(...)")` ile |
| `window._xxx` globalleri | Olaylar controller'da; ortak olanlar `BaseController`'da |
| 1035 satırlık mixin'ler | En uzun controller ~200 satır; tekrar eden UI fragment'ta (`CampaignCard`) |
| Sahte veri kodun içindeydi | Demo verisi yalnızca `db/data/*.csv`; ekrandaki sayılar veriden |
| `id` / `_id` karışıklığı | CDS `cuid` → her yerde tek tip `ID` |
| Dosya adı büyük/küçük harf hataları | UI5 Linter + tutarlı `PascalCase` adlandırma |
| 12 CSS dosyası, iki kez yükleme | Tek `style.css`; marka renkleri tema değişkenlerini ezerek |
| Test yoktu | 21 backend testi + 15 QUnit birim testi + 6 OPA5 senaryosu; hepsi CI'da |

---

## 3. Öğrenme Hedefleri — Hangi Konu Nerede?

| UI5 / SAP konusu | Nerede | Durum |
|---|---|---|
| Component, `manifest.json` (v2), bootstrap | `app/site/webapp`, `app/yonetim/webapp` | ✅ |
| XML View, Controller yaşam döngüsü, `BaseController` | `app/site/webapp/controller` | ✅ |
| Routing, parametreli rota, `?query`, 404 (`bypassed`), sekme başlığı (`titleChanged`) | `manifest.json`, `App.controller.js` | ✅ |
| **OData V4**: liste, nesne (`bindElement`), property binding | Ana sayfa, Kampanya detayı | ✅ |
| Sunucu tarafı filtre ve sıralama | Kampanyalar sayfası (`binding.filter`) | ✅ |
| Navigasyon özelliği ile ilişkili veri (`$expand`) | Kampanya → son bağışlar | ✅ |
| Gruplama (`sorter.group`) | SSS | ✅ |
| Kodla veri okuma (`bindList().requestContexts`, `$count`) | Bağış sihirbazı, Dashboard | ✅ |
| OData **action** çağırma (`bindContext("/x(...)").invoke()`) | Bağış, gönüllü başvurusu, iletişim | ✅ |
| JSONModel yalnızca arayüz durumu için | `donate`, `form`, `appView` modelleri | ✅ |
| Expression binding (`%{}` ve `${}` farkı), formatter'lar | Kartlar, durum metinleri | ✅ |
| Fragment ve Dialog (tembel yükleme) | Sonuç penceresi, mobil menü, ortak footer | ✅ |
| Form doğrulama, `ValueState`, test edilebilir saf fonksiyonlar | `model/validation.js` → bağış, gönüllü, iletişim | ✅ |
| `sap.m.Wizard` | Bağış akışı | ✅ |
| i18n | Bütün metinler | ✅ |
| Duyarlı tasarım: `Grid`, `FlexBox`, `device` modeli, `sap.tnt.ToolPage` | Bütün site | ✅ |
| Tema: `sap_horizon` + tema değişkenleri | `css/style.css` | ✅ |
| **Fiori elements**: List Report + Object Page | Yönetim paneli (9 modül) | ✅ |
| Composition (alt tablo), taslakta satır ekleme/silme | Hayvan → fotoğraflar | ✅ |
| `sap.m.Carousel`, liste binding'i sayfalar (pages) olarak | Hayvan detayı | ✅ |
| Birden fazla filtrenin birleştirilmesi, `Contains` (büyük/küçük harf duyarsız), `$count` | Sahiplen sayfası | ✅ |
| Binding olayları XML'de (`events: {dataReceived}`), boş durum (`IllustratedMessage`) | Sahiplen sayfası | ✅ |
| CDS annotation'ları (LineItem, FieldGroup, Facets, DataPoint, ValueList, Criticality) | `app/yonetim/annotations.cds` | ✅ |
| Draft (taslak kaydetme) | Kampanya, duyuru, SSS, istatistik düzenleme | ✅ |
| Bound action + `Core.OperationAvailable` | Bağışı onayla/reddet, başvuruyu değerlendir | ✅ |
| **FPM** (Flexible Programming Model) özel sayfa | Yönetim paneli dashboard'u | ✅ |
| **Fiori Launchpad** sandbox | `app/yonetim/webapp/index.html` | ✅ |
| **SAP CAP**: CDS modelleme, servisler, handler'lar, yetkiler, i18n mesajları | `db/`, `srv/`, `_i18n/` | ✅ |
| UI5 Tooling (`ui5.yaml`), UI5 Linter | Her iki uygulama | ✅ |
| Backend testleri (`cds.test`) | `test/services.test.js` | ✅ |
| Özel kontrol (custom control): metadata, renderer (apiVersion 2), yaşam döngüsü, ARIA, yerel yüzde biçimi | `control/ProgressMeter.js` → kampanya kartı/detayı, etkinlik doluluğu | ✅ |
| QUnit (formatter, doğrulama) + OPA5 (gezinme, formlar), sayfa nesneleri | `app/site/webapp/test` | ✅ |
| UI5 **Test Starter** (`testsuite.qunit.js`), başsız test (`ui5-test-runner`) | `npm run test:ui`, CI | ✅ |

---

## 4. Kullanıcılar ve Roller

| Rol | Ne yapabilir? | Demo hesap |
|---|---|---|
| **Ziyaretçi** | Herkese açık sayfalar; bağış (simülasyon), gönüllü başvurusu, iletişim mesajı | — |
| **Üye** | Ziyaretçinin yapabildikleri + üye alanı: kendi bağışları, başvuruları, etkinlik kayıtları (iptal), profil | `uye@example.com` / `uye123` |
| **Yönetici** | Yönetim panelindeki her şey | `admin@example.com` / `admin123` |

Kimlik doğrulama CAP'in **mocked** (basic auth) yöntemiyle yapılır; tarayıcı yönetim paneli açılırken kullanıcı adı/şifre sorar. Canlı demo yapılırsa gerçek bir yönteme (IAS/JWT) geçilmelidir.

---

## 5. Kapsam ve Fazlar

### Faz 1 — Temel ✅
CAP backend, herkese açık site (ana sayfa, kampanyalar, detay, bağış, gönüllü, hakkımızda, SSS, iletişim, 404), Fiori elements yönetim paneli, eski projenin tasarımı ve fotoğrafları, backend + UI testleri, CI, ekran görüntüleri.

### Faz 2 — Topluluk ✅
✅ Sahiplendirme (hayvan ilanları + başvuru). ✅ Etkinlikler + kayıt. ✅ Galeri. ✅ Üye girişi ve üye alanı.

### Faz 3 — Cila ve Sunum 🟡
- ✅ 3a Özel kontrol: `pg.site.control.ProgressMeter` (hazır `ProgressIndicator` + tema sınıflarını ezen CSS yerine)
- ⬜ 3b Yönetim dashboard'una grafikler
- ⬜ 3c İngilizce (i18n)
- ⬜ 3d Canlı demo (barındırma kararı kullanıcıda)

---

## 6. Fonksiyonel Gereksinimler

### 6.1 Herkese Açık Site (freestyle UI5)

| Kod | Gereksinim | Faz | Durum |
|---|---|---|---|
| PUB-01 | Ana sayfa: hero, istatistikler, aktif kampanyalar, nasıl çalışır, duyurular, çağrı bandı | 1 | ✅ |
| PUB-02 | Hakkımızda: hikâye, misyon/vizyon/değerler, faaliyetler | 1 | ✅ |
| PUB-03 | Kampanyalar: kart listesi (Aktif/Tamamlanan/Tümü filtresi) + detay (ilerleme, kalan gün, son bağışlar) | 1 | ✅ |
| PUB-04 | SSS: kategorili, açılır-kapanır, veriler backend'den | 1 | ✅ |
| PUB-05 | İletişim: form (ad, e-posta, konu, mesaj, KVKK onayı) + iletişim bilgileri | 1 | ✅ |
| PUB-06 | 404 sayfası (geçersiz rota ve yayında olmayan kampanya) | 1 | ✅ |
| PUB-07 | Sahiplendirme ilanları | 2 | ✅ (bkz. 6.4) |
| PUB-08 | Etkinlikler | 2 | ✅ (bkz. 6.5) |
| PUB-09 | Galeri: albüm listesi (fotoğraf sayısıyla), albüm sayfası (veriden boyutlanan ızgara), fotoğrafı büyütme (`LightBox`); Hakkımızda seçkisi veriden | 2 | ✅ |
| PUB-10 | Mobil uyum (telefon menüsü, duyarlı ızgaralar) | 1 | ✅ |

### 6.2 Bağış (simülasyon)

| Kod | Gereksinim | Faz | Durum |
|---|---|---|---|
| BAG-01 | Kampanya / genel bağış seçimi; hazır tutarlar + özel tutar; tutarın somut karşılığı | 1 | ✅ |
| BAG-02 | IBAN: benzersiz referans kodu (`PG-2026-XXXXXX`), hayali banka bilgisi, "Bekliyor" kaydı | 1 | ✅ |
| BAG-03 | Kart simülasyonu: kart formu yok, %90 başarılı / %10 başarısız (testlerde %0) | 1 | ✅ |
| BAG-04 | Yönetici IBAN bağışını onaylar/reddeder; onayda kampanya toplamı sunucuda artar | 1 | ✅ |
| BAG-05 | Anonim bağış (herkese açık listede "Anonim Bağışçı") | 1 | ✅ |
| BAG-06 | Tutarlar `Decimal(12,2)`; toplamlar sunucuda hesaplanır | 1 | ✅ |

### 6.3 Gönüllülük

| Kod | Gereksinim | Faz | Durum |
|---|---|---|---|
| GON-01 | Başvuru formu (alan listesi OData'dan) + KVKK onayı | 1 | ✅ |
| GON-02 | Aynı e-postayla bekleyen başvuru varken yenisi açılamaz | 1 | ✅ |
| GON-03 | Yönetici onaylar/reddeder, not ekler; e-posta konsola yazılır | 1 | ✅ |

### 6.4 Sahiplendirme ✅

| Kod | Gereksinim | Faz | Durum |
|---|---|---|---|
| SAH-01 | Hayvan kaydı: ad, tür, cins, yaş, cinsiyet, boyut, kısırlaştırma, aşı, karakter, sağlık notu, hikâye, fotoğraflar (composition), durum | 2 | ✅ |
| SAH-02 | Sahiplenme başvurusu: kişisel bilgiler, konut tipi, bahçe, diğer hayvanlar, deneyim, ev halkı onayı, KVKK onayı; yalnızca "yuva arıyor" durumundaki hayvana | 2 | ✅ |
| SAH-03 | Başvuru onaylanınca hayvan otomatik "Rezerve" olur; aynı hayvanın diğer başvuruları artık onaylanamaz | 2 | ✅ |
| SAH-04 | Site: filtrelenebilir liste (tür, boyut, kısırlaştırma, isim araması, yuvaya kavuşanlar) + fotoğraf karuselli detay + başvuru penceresi; ana sayfada son 4 ilan | 2 | ✅ |
| SAH-05 | Yönetim: hayvan List Report / Object Page (fotoğraf alt tablosu, başvurular), başvuru değerlendirme, dashboard sayacı | 2 | ✅ |
| SAH-06 | Sahiplendirme sonrası takip notları | 3 | ⬜ |

### 6.5 Etkinlikler ✅

| Kod | Gereksinim | Faz | Durum |
|---|---|---|---|
| ETK-01 | Etkinlik kaydı: başlık, özet, açıklama, kategori, başlangıç/bitiş, yer, kontenjan, kapak görseli, durum (`Draft`/`Published`/`Cancelled`); taslaklar sitede görünmez | 2 | ✅ |
| ETK-02 | Ziyaretçi kaydı: ad, e-posta, isteğe bağlı telefon, KVKK onayı; aynı e-postayla ikinci kayıt, iptal/geçmiş etkinliğe kayıt reddedilir | 2 | ✅ |
| ETK-03 | Kontenjan kontrolü sunucuda **atomik** (`registeredCount < capacity` koşullu UPDATE) — aynı anda gelen kayıtlar kontenjanı aşamaz (testle doğrulanır) | 2 | ✅ |
| ETK-04 | Site: Yaklaşan/Geçmiş/Tümü filtresi, tarih rozetli kartlar, detay sayfası, kayıt penceresi, kalan yer bilgisi; ana sayfada yaklaşan 3 etkinlik | 2 | ✅ |
| ETK-05 | Yönetim: etkinlik List Report / Object Page (doluluk çubuğu, kayıtlar alt tablosu), katıldı/katılmadı işaretleme, dashboard sayacı; kayıtlı etkinlik silinemez, kontenjan kayıt sayısının altına düşürülemez | 2 | ✅ |
| ETK-06 | Demo tarihleri: sunucu açılırken etkinlik ve kampanya tarihleri tam hafta olarak bugüne kaydırılır (`srv/lib/demo-dates.js`), böylece demo hep "güncel" görünür | 2 | ✅ |

### 6.6 İçerik

| Kod | Gereksinim | Faz | Durum |
|---|---|---|---|
| ICR-01 | Duyurular: tür, yayın/bitiş tarihi; süresi dolan ve pasif olanlar sitede görünmez | 1 | ✅ |
| ICR-02 | Galeri yönetimi: albüm + fotoğraf alt tablosu (taslak), etkinliğe bağlama, yayın durumu, ızgara boyutu, "Hakkımızda'da göster"; fotoğrafsız albüm yayınlanamaz, görsel adresi sunucuda doğrulanır | 2 | ✅ |
| ICR-03 | Ana sayfa sayaçları yönetim panelinden düzenlenir | 1 | ✅ |

### 6.7 Üye Alanı ✅

| Kod | Gereksinim | Faz | Durum |
|---|---|---|---|
| UYE-01 | Giriş / çıkış: sitenin kendi penceresinden (e-posta + şifre); oturum sekme kapanana kadar sürer; menüde üyenin adı | 2 | ✅ |
| UYE-02 | Profil: ad, telefon, şehir, bildirim tercihleri; değişiklikler "Kaydet"e kadar sunucuya gitmez; sunucu hatası alanın altında | 2 | ✅ |
| UYE-03 | Hesabım: Bağışlarım, Başvurularım (gönüllü + sahiplenme), Etkinliklerim — yalnızca üyenin kendi kayıtları (`@restrict … where e-posta = $user`) | 2 | ✅ |
| UYE-04 | Gelecekteki etkinlik kaydını iptal: kayıt silinir, kontenjan geri açılır | 2 | ✅ |
| UYE-05 | Giriş yapmış üyenin etkinlik kayıt formu adı ve e-postayla dolu gelir | 2 | ✅ |

> Kimlik doğrulama demo amaçlıdır (CAP *mocked* auth, HTTP Basic). Gerçek bir kurulumda bunun yerine bir kimlik sağlayıcı (ör. SAP BTP XSUAA / IAS) ve kısa ömürlü token kullanılır; yeni üye kaydı da o sağlayıcıda olur.

### 6.8 Yönetim Paneli (Fiori elements)

| Kod | Gereksinim | Faz | Durum |
|---|---|---|---|
| ADM-01 | Her modül için List Report + Object Page (7 modül) | 1 | ✅ |
| ADM-02 | Draft ile düzenleme | 1 | ✅ |
| ADM-03 | Action butonları; yalnızca uygun durumda etkin | 1 | ✅ |
| ADM-04 | Renkli durum alanları (criticality) ve Türkçe durum metinleri | 1 | ✅ |
| ADM-05 | Dashboard: bekleyen işler sayaçları | 1→3 | 🟡 sayaçlar var, grafik yok |
| ADM-06 | CSV/Excel dışa aktarım | 3 | 🟡 Fiori elements'in hazır Excel dışa aktarımı mevcut |
| ADM-07 | İletişim mesajları: liste, detay, "yanıtlandı" olarak işaretleme; dashboard'da yeni mesaj sayacı | 1 | ✅ |

---

## 7. Fonksiyonel Olmayan Gereksinimler

### 7.1 Güvenlik
- ✅ Yetki CDS'te: `SiteService` herkese açık ve salt okunur; `AdminService` `@requires: 'admin'`.
- ✅ Ziyaretçi yalnızca `donate`, `applyVolunteer` ve `sendContactMessage` action'larını çağırabilir; mesajlar herkese açık servisten okunamaz.
- ✅ Girdiler sunucuda doğrulanır (handler kontrolleri + CDS tip/uzunluk kontrolleri); hata mesajları `_i18n/messages.properties`'te Türkçe.
- ✅ Durum geçişleri sunucuda denetlenir (yalnızca "Bekliyor" kayıtlar onaylanır).
- ✅ Kişisel veriler (e-posta, telefon) herkese açık servisten verilmez.
- ✅ Bağış almış kampanya silinemez.
- ⬜ Rate limit / bot koruması (canlı demo yapılırsa).

### 7.2 Kullanılabilirlik
- ✅ `sap_horizon`, marka renkleri tema değişkenleriyle.
- ✅ Mobil uyum, dokunmatik cihazlarda "cozy" yoğunluk.
- ✅ Bütün metinler i18n'de.

### 7.3 Kod Kalitesi
- ✅ `npm run lint` (ESLint + UI5 Linter) temiz.
- ✅ `npm test` 21/21 · `npm run test:ui` QUnit 15/15, OPA5 6/6.
- ✅ GitHub Actions: lint + backend testleri + başsız Chrome'da UI testleri (`.github/workflows/ci.yml`).
- ✅ Action adları CAP'in temel sınıf metotlarıyla çakışmaz (`reject` → `decline`).

---

## 8. Teknik Mimari

```
                   ┌─────────────────────────────────────────┐
                   │            SAP CAP (Node.js)             │
                   │  db/schema.cds · db/codes.cds · CSV veri │
                   │  SQLite (bellek içi) · mocked auth       │
                   └──────┬──────────────────────────┬───────┘
                 /odata/v4/site               /odata/v4/admin
             (salt okunur + 3 action)      (@requires: 'admin')
                          │                          │
          ┌───────────────┴─────────┐   ┌────────────┴────────────────┐
          │ app/site                 │   │ app/yonetim                  │
          │ Freestyle SAPUI5         │   │ FLP sandbox                  │
          │ ToolPage + NavContainer  │   │  └ FPM Dashboard             │
          │ 9 sayfa, Wizard, Dialog  │   │  └ 7× List Report/Object Page│
          └──────────────────────────┘   └──────────────────────────────┘
```

| Katman | Teknoloji | Not |
|---|---|---|
| Backend | SAP CAP 10 (Node.js ≥ 22) | OData V4, yetki, draft, i18n mesajları |
| Veritabanı | SQLite, bellek içi (`:memory:`) | Her açılışta CSV demo verisi yüklenir |
| Site | SAPUI5 1.148 (LTS), JavaScript, `sap_horizon` | CDN'den yüklenir; derleme gerekmez |
| Yönetim | Fiori elements V4 + FPM + FLP sandbox | Ekranlar `annotations.cds`'ten |
| Test | `node:test` + `@cap-js/cds-test`; QUnit + OPA5 + `ui5-test-runner` (Puppeteer) | `npm test`, `npm run test:ui` |
| CI | GitHub Actions | Her push ve pull request'te |
| Kalite | ESLint 10, UI5 Linter | `npm run lint` |

### Klasör yapısı

```
PativeGelecek/
├── app/
│   ├── index.html                 → giriş sayfası (iki uygulamaya bağlantı)
│   ├── services.cds               → UI annotation'larını modele dahil eder
│   ├── site/                      → herkese açık freestyle UI5
│   │   ├── ui5.yaml
│   │   └── webapp/
│   │       ├── controller/        → BaseController + 8 sayfa controller'ı
│   │       ├── view/              → 10 view + fragments/ (CampaignCard, Footer, MobileMenu, DonationResult)
│   │       ├── model/             → formatter.js, validation.js, models.js
│   │       ├── test/              → testsuite (Test Starter), unit/ (QUnit), integration/ (OPA5)
│   │       ├── i18n/  css/  images/photos/
│   │       ├── Component.js
│   │       └── manifest.json
│   └── yonetim/                   → Fiori elements yönetim paneli
│       ├── annotations.cds        → ekran tanımları
│       ├── ui5.yaml
│       └── webapp/
│           ├── ext/dashboard/     → FPM özel sayfa
│           ├── flpSandboxConfig.js, flpInit.js
│           ├── Component.js, manifest.json, i18n/
│           └── index.html         → FLP sandbox
├── db/
│   ├── schema.cds                 → varlıklar ve tipler
│   ├── codes.cds                  → durum metinleri + renkler (kod tabloları)
│   ├── labels.cds                 → alan etiketleri (i18n)
│   └── data/                      → demo verisi (CSV)
├── srv/
│   ├── site-service.cds/.js       → herkese açık servis + bağış/başvuru mantığı
│   ├── admin-service.cds/.js      → yönetim servisi + onay/red mantığı
│   └── lib/                       → demo ayarları, e-posta (konsol)
├── _i18n/                         → etiketler ve sunucu hata mesajları
├── test/services.test.js          → backend testleri
├── scripts/screenshots.mjs        → README ekran görüntüleri (Puppeteer)
├── docs/                          → ekran görüntüleri, görsel kaynakları
├── .github/workflows/ci.yml       → GitHub Actions
├── eslint.config.mjs
├── package.json                   → CAP ayarları (db, auth) dahil
├── README.md
└── PROJE.md
```

---

## 9. Veri Modeli

Bütün iş varlıkları `cuid` (UUID `ID`) ve `managed` (`createdAt/By`, `modifiedAt/By`) kullanır. Durum alanları CDS `enum`'dur; Türkçe metin ve renk `db/codes.cds`'teki kod tablolarından gelir.

| Varlık | Temel alanlar |
|---|---|
| `Campaigns` | title, summary, description, coverImage, goalAmount, raisedAmount (salt okunur), startDate, endDate, status (`Draft`/`Active`/`Completed`) · → donations |
| `Donations` | referenceCode, campaign?, donorName, donorEmail, amount, currency, method (`IBAN`/`Card`), status (`Pending`/`Confirmed`/`Rejected`/`Failed`), isAnonymous, message, statusNote |
| `VolunteerAreas` | code, name, descr (CodeList) |
| `VolunteerApplications` | firstName, lastName, email, phone, area, availability, motivation, consentGiven, status (`Pending`/`Approved`/`Rejected`), adminNote |
| `Announcements` | title, body, type (`Info`/`Success`/`Warning`/`Urgent`), publishDate, expiryDate, isActive |
| `Faqs` | category, question, answer, sortOrder |
| `SiteStats` | code, label, value, icon, sortOrder |
| `ContactMessages` | name, email, subject, message, consentGiven, status (`New`/`Read`/`Answered`), adminNote |
| `Animals` | name, species (`Cat`/`Dog`/`Other`), breed, ageMonths, sex, size, neutered, vaccinated, traits, healthNotes, story, coverImage, arrivalDate, status (`Available`/`Reserved`/`Adopted`/`InTreatment`) · → photos (composition), applications |
| `AnimalPhotos` | animal, url, caption, sortOrder |
| `AdoptionApplications` | animal, firstName, lastName, email, phone, city, housingType (`Apartment`/`House`/`Farm`), hasGarden, otherPets, experience, householdAgrees, consentGiven, status, adminNote |
| `Events` | title, summary, description, category (`Adoption`/`Neutering`/`Feeding`/`Awareness`/`Meeting`), startDateTime, endDateTime, location, capacity, registeredCount, coverImage, status · → registrations |
| `EventRegistrations` | event, name, email, phone, consentGiven, attendance (`Registered`/`Attended`/`Absent`) · (event, email) tekil |
| `*StatusTexts`, `*TypeTexts`, `*MethodTexts` | code, text, criticality (kod tabloları) |

| `Albums` | title, description, albumDate, coverImage, event (isteğe bağlı), isPublished · → media (composition) |
| `MemberProfiles` | email (anahtar = giriş e-postası), displayName, phone, city, notifyEvents, notifyCampaigns |
| `MediaItems` | album, url, caption, layout (`Normal`/`Wide`/`Tall`/`Large`), featured, sortOrder |

Görsel yolları sunucu köküne göre mutlaktır (`/site/webapp/images/...`); böylece hem sitede hem yönetim panelinde çalışır.

---

## 10. Yol Haritası

| Adım | İş | Durum |
|---|---|---|
| 0 | Eski repoyu sil; Atlas ve Gmail şifrelerini değiştir | 🟡 şifreler değiştiriliyor |
| 1 | Repo, CAP projesi, `.gitignore`, ESLint | ✅ |
| 2 | Veri modeli, demo verisi, servisler, yetkiler | ✅ |
| 3 | Site iskeleti: Component, routing, ToolPage, footer, 404 | ✅ |
| 4 | Ana sayfa, kampanyalar, kampanya detayı | ✅ |
| 5 | Bağış sihirbazı (IBAN + kart simülasyonu) | ✅ |
| 6 | Gönüllü başvurusu, SSS, hakkımızda | ✅ |
| 7 | Fiori elements yönetim paneli + FPM dashboard + FLP sandbox | ✅ |
| 8 | Backend testleri, UI5 Linter, README | ✅ |
| 9 | İletişim formu, QUnit + OPA5, GitHub Actions, ekran görüntüleri, görsel kaynakları | ✅ |
| 9b | GitHub'a ilk push, `v0.1.0` etiketi | ✅ |
| 10 | Faz 2a: sahiplendirme (backend, site, yönetim, testler) | ✅ |
| 11 | Faz 2b: etkinlikler (backend, site, yönetim, testler) | ✅ |
| 12 | Faz 2c: galeri (backend, site, yönetim, testler) | ✅ |
| 13 | Faz 2d: üye alanı (MemberService, giriş, Hesabım, testler) | ✅ |
| 14 | Faz 3a: özel kontrol ProgressMeter + birim testleri | ✅ |
| 15+ | Faz 3b–3d: grafikler, İngilizce, canlı demo | ⬜ |

---

## 11. Açık Sorular

1. ~~GitHub repo adı~~ — https://github.com/ZehraAltunok1/ISTE_DernekWebSite (eski proje bu repoda yeni projeyle değiştirildi).
2. **Dil** — README ve arayüz yalnızca Türkçe mi kalsın, yoksa İngilizce de eklensin mi?
3. **Canlı demo** — Proje bir yerde yayınlanacak mı (Render, SAP BTP trial)? Yayınlanacaksa mocked auth yerine gerçek kimlik doğrulama gerekir.
4. **Kaynağı bilinmeyen 2 fotoğraf** (`kus-evi-agac.jpg`, `kedi-tirmalama.jpg`) — kaynağı bulunsun ya da lisanslı bir fotoğrafla değiştirilsin.
