sap.ui.define([
    "edusupport/platform/controller/BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("edusupport.platform.controller.public.Donate", {

        onInit: function () {
            this.getOwnerComponent().getRouter()
                .getRoute("donate")
                .attachPatternMatched(this._onRouteMatched, this);

            // JS fonksiyonlarını global scope'a bağla (core:HTML içinden erişim için)
            var that = this;
            window.selectCategory = function(el) { that._selectCategory(el); };
            window.setAmount      = function(v)  { that._setAmount(v); };
            window.focusCustom    = function()   { that._focusCustom(); };
            window.onCustomAmount = function(el) { that._onCustomAmount(el); };
            window.goToPayment    = function()   { that._goToPayment(); };
            window.switchMethod   = function(m)  { that._switchMethod(m); };
            window.submitDonate   = function()   { that._submitDonate(); };
        },

        _onRouteMatched: function () {
            // Sayfayı başa sıfırla
            this._selectedCategory = null;
            this._selectedAmount   = 0;
            this._paymentMethod    = "iban";
            this._showStep("categories");
        },

        _showStep: function (step) {
            var oSteps = {
                categories: this.byId("donateStepCategories"),
                amount:     this.byId("donateStepAmount"),
                payment:    this.byId("donateStepPayment"),
                success:    this.byId("donateStepSuccess")
            };
            Object.keys(oSteps).forEach(function (k) {
                if (oSteps[k]) {
                    oSteps[k].removeStyleClass("donate-step-hidden");
                    if (k !== step) oSteps[k].addStyleClass("donate-step-hidden");
                }
            });
            // Sayfanın üstüne scroll
            window.scrollTo({ top: 0, behavior: "smooth" });
        },

        _selectCategory: function (el) {
            // Önceki seçimi kaldır
            document.querySelectorAll(".donate-cat-inner").forEach(function (c) {
                c.classList.remove("donate-cat-selected");
            });
            el.classList.add("donate-cat-selected");

            var catMap = {
                mama:       "Hayvan Maması / Mama Yardımı",
                veteriner:  "Veteriner Tedavi Desteği",
                burs:       "Burs Bağışı",
                barinak:    "Barınak Altyapı Desteği"
            };

            this._selectedCategory = el.dataset.cat;
            this._showStep("amount");

            // Seçilen kategori label'ı güncelle
            setTimeout(function () {
                var lbl = document.getElementById("selectedCatLabel");
                if (lbl) lbl.textContent = catMap[el.dataset.cat] || el.dataset.cat;
            }, 100);
        },

        _setAmount: function (val) {
            this._selectedAmount = val;
            // Buton aktif görünümü
            document.querySelectorAll(".donate-preset-btn").forEach(function (b) {
                b.classList.remove("active");
                if (parseInt(b.textContent) === val || b.textContent === val + " ₺") {
                    b.classList.add("active");
                }
            });
            var inp = document.getElementById("donateCustomAmount");
            if (inp) inp.value = val;
            this._updateImpact(val);
        },

        _focusCustom: function () {
            var inp = document.getElementById("donateCustomAmount");
            if (inp) { inp.value = ""; inp.focus(); }
            document.querySelectorAll(".donate-preset-btn").forEach(function (b) {
                b.classList.remove("active");
            });
        },

        _onCustomAmount: function (el) {
            this._selectedAmount = parseFloat(el.value) || 0;
            this._updateImpact(this._selectedAmount);
        },

        _updateImpact: function (amount) {
            var msg = "";
            var cat = this._selectedCategory;
            if (cat === "mama"      && amount >= 50)  msg = "🐾 " + Math.floor(amount / 50)  + " haftalık mama sağlayabilirsiniz!";
            if (cat === "veteriner" && amount >= 200) msg = "🏥 " + Math.floor(amount / 200) + " temel tedaviye destek olabilirsiniz!";
            if (cat === "burs"      && amount >= 500) msg = "🎓 " + Math.floor(amount / 500) + " aylık burs sağlayabilirsiniz!";
            if (cat === "barinak"   && amount >= 1000)msg = "🏠 " + Math.floor(amount / 1000)+ " barınak bölmesi yapılabilir!";
            var el = document.getElementById("donateImpactMsg");
            if (el) el.textContent = msg;
        },

        _goToPayment: function () {
            var inp = document.getElementById("donateCustomAmount");
            if (inp && inp.value) this._selectedAmount = parseFloat(inp.value);

            if (!this._selectedAmount || this._selectedAmount < 10) {
                sap.m.MessageToast.show("Lütfen en az 10 ₺ tutar girin.");
                return;
            }

            this._showStep("payment");

            setTimeout(function () {
                var sc = document.getElementById("summCat");
                var sa = document.getElementById("summAmount");
                var catMap = {
                    mama: "Hayvan Maması", veteriner: "Veteriner Tedavisi",
                    burs: "Burs Bağışı",  barinak:   "Barınak Desteği"
                };
                if (sc) sc.textContent = catMap[this._selectedCategory] || "-";
                if (sa) sa.textContent = this._selectedAmount;
            }.bind(this), 100);
        },

        _switchMethod: function (method) {
            this._paymentMethod = method;
            var ibanSec = document.getElementById("ibanSection");
            var cardSec = document.getElementById("cardSection");
            var tabIban = document.getElementById("tabIban");
            var tabCard = document.getElementById("tabCard");

            if (method === "iban") {
                if (ibanSec) ibanSec.style.display = "";
                if (cardSec) cardSec.style.display = "none";
                if (tabIban) tabIban.classList.add("active");
                if (tabCard) tabCard.classList.remove("active");
            } else {
                if (ibanSec) ibanSec.style.display = "none";
                if (cardSec) cardSec.style.display = "";
                if (tabIban) tabIban.classList.remove("active");
                if (tabCard) tabCard.classList.add("active");
            }
        },

        _submitDonate: function () {
            var name  = (document.getElementById("pName")  || {}).value || "";
            var email = (document.getElementById("pEmail") || {}).value || "";
            var phone = (document.getElementById("pPhone") || {}).value || "";
            var note  = (document.getElementById("pNote")  || {}).value || "";

            if (!name.trim())        { sap.m.MessageToast.show("Ad Soyad zorunludur."); return; }
            if (!email.includes("@")){ sap.m.MessageToast.show("Geçerli e-posta girin."); return; }

            var payload = {
                donor_name:  name.trim(),
                donor_email: email.trim(),
                donor_phone: phone,
                amount:      this._selectedAmount,
                category:    this._selectedCategory,
                note:        note
            };

            if (this._paymentMethod === "iyzico") {
                var holder = (document.getElementById("cHolder") || {}).value || "";
                var number = (document.getElementById("cNumber") || {}).value || "";
                var month  = (document.getElementById("cMonth")  || {}).value || "";
                var year   = (document.getElementById("cYear")   || {}).value || "";
                var cvc    = (document.getElementById("cCvc")    || {}).value || "";

                if (!holder || !number || !month || !year || !cvc) {
                    sap.m.MessageToast.show("Kart bilgilerini eksiksiz doldurun.");
                    return;
                }
                payload.card_holder  = holder;
                payload.card_number  = number;
                payload.expire_month = month;
                payload.expire_year  = year;
                payload.cvc          = cvc;
            }

            // Spinner göster
            var spinner = document.getElementById("donateSpinner");
            var btn     = document.getElementById("donateSubmitBtn");
            if (spinner) spinner.style.display = "block";
            if (btn)     btn.style.display = "none";

            var endpoint = this._paymentMethod === "iyzico"
                ? "http://localhost:3000/api/donate/iyzico"
                : "http://localhost:3000/api/donate/iban";

            var that = this;

            fetch(endpoint, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload)
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (spinner) spinner.style.display = "none";

                if (data.success) {
                    that._showStep("success");

                    setTimeout(function () {
                        var msg = document.getElementById("successMsg");
                        var box = document.getElementById("ibanResultBox");

                        if (that._paymentMethod === "iban" && data.iban_info) {
                            var info = data.iban_info;
                            if (msg) msg.textContent = "Bağışınız kaydedildi! Lütfen aşağıdaki bilgilere havale yapın.";
                            if (box) {
                                box.style.display = "block";
                                box.innerHTML =
                                    "<div class='donate-iban-result-row'><span>Banka</span><strong>" + info.bank + "</strong></div>" +
                                    "<div class='donate-iban-result-row'><span>Hesap Sahibi</span><strong>Pati ve Gelecek Derneği</strong></div>" +
                                    "<div class='donate-iban-result-row'><span>IBAN</span><strong class='donate-iban-num'>" + info.iban + "</strong></div>" +
                                    "<div class='donate-iban-result-row'><span>Tutar</span><strong>" + info.amount + " ₺</strong></div>" +
                                    "<div class='donate-iban-result-row donate-ref'><span>🔑 Referans Kodu</span><strong>" + info.reference + "</strong></div>";
                            }
                        } else {
                            if (msg) msg.textContent = "Ödemeniz başarıyla tamamlandı! Ödeme No: " + (data.payment_id || "-");
                        }
                    }, 200);
                } else {
                    if (btn) btn.style.display = "block";
                    sap.m.MessageBox.error(data.message || "İşlem başarısız oldu.");
                }
            })
            .catch(function () {
                if (spinner) spinner.style.display = "none";
                if (btn)     btn.style.display = "block";
                sap.m.MessageBox.error("Sunucuya bağlanılamadı.");
            });
        },

        onNavBack: function () {
            this.getRouter().navTo("home");
        }
    });
});