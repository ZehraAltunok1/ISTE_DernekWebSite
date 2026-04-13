sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, MessageToast, MessageBox, Fragment) {
    "use strict";

    return Controller.extend("edusupport.platform.controller.App", {

    onInit: function () {
        console.log("✅ App Controller initialized");

        // ── window.postMessage dinleyici (CampaignDetail sayfasından mesajlar) ──
        var that = this;
        window.addEventListener("message", function (oEvent) {
            var data = oEvent.data;
            if (!data || typeof data !== "object") return;

            if (data.type === "cdNavBack") {
                var sPrev = window.history.length > 1;
                if (sPrev) { window.history.go(-1); }
                else { that.getOwnerComponent().getRouter().navTo("home"); }
            }
            if (data.type === "cdNavHome") {
                that.getOwnerComponent().getRouter().navTo("home");
            }
        });
    },

        /* ══════════════════════════════════════════════
           NAVİGASYON
        ══════════════════════════════════════════════ */
        onNavToHome:      function () { this.getOwnerComponent().getRouter().navTo("home");           },
        onNavToAbout:     function () { this.getOwnerComponent().getRouter().navTo("about");          },
        onNavToDonate:    function () { this.getOwnerComponent().getRouter().navTo("donate");         },
        onNavToDashboard: function () { this.getOwnerComponent().getRouter().navTo("adminDashboard"); },
        onNavToLaunchpad: function () { this.getOwnerComponent().getRouter().navTo("launchpad");      },
        onViewProfile:    function () { this.getOwnerComponent().getRouter().navTo("profile");        },
        
        onNavToFaaliyetler: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("home");
            setTimeout(function () {
                if (window._footerScroll) {
                    window._footerScroll("activitiesSection");
                }
            }, 800);
        },

        onNavToKampanyalar: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("home");
            setTimeout(function () {
                if (window._footerScroll) {
                    window._footerScroll("scholarshipsSection");
                }
            }, 800);
        },

        onNavToIletisim: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("home");
            setTimeout(function () {
                var oPage = sap.ui.getCore().byId("home---mainPage");
                if (oPage) oPage.scrollToSection("home---faqSection");
            }, 500);
        },
        /* ══════════════════════════════════════════════
           GİRİŞ YAP BUTONU → Fragment aç
           Promise tabanlı — fragment sadece 1 kez yüklenir,
           sonraki açılışlarda aynı instance kullanılır.
           Duplicate ID sorunu bu şekilde çözülür.
        ══════════════════════════════════════════════ */
        onLoginPress: function () {
            var oView = this.getView();

            // loginModel'i her açılışta sıfırla
            var oLoginModel = new JSONModel({
                email:        "",
                password:     "",
                loginType:    "user",
                rememberMe:   false,
                errorMessage: "",
                isLoading:    false
            });
            oView.setModel(oLoginModel, "loginModel");

            // Fragment daha önce yüklenmediyse yükle, sonraki çağrılarda aynı instance'ı kullan
            if (!this._pLoginDialog) {
                this._pLoginDialog = Fragment.load({
                    id:         oView.getId(),
                    name:       "edusupport.platform.view.fragments.Login",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pLoginDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onCloseLoginDialog: function () {
            if (this._pLoginDialog) {
                this._pLoginDialog.then(function (d) { d.close(); });
            }
        },

        /* ══════════════════════════════════════════════
           GİRİŞ İŞLEMİ
        ══════════════════════════════════════════════ */
        onLoginSubmit: function () {
            var that       = this;
            var oM         = this.getView().getModel("loginModel");
            var sEmail     = oM.getProperty("/email");
            var sPassword  = oM.getProperty("/password");
            var sLoginType = oM.getProperty("/loginType");
            var bRememberMe = oM.getProperty("/rememberMe");

            // Validasyon
            if (!sEmail || !sPassword) {
                oM.setProperty("/errorMessage", "Lütfen e-posta ve şifrenizi girin.");
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail)) {
                oM.setProperty("/errorMessage", "Geçerli bir e-posta adresi girin.");
                return;
            }

            oM.setProperty("/errorMessage", "");
            oM.setProperty("/isLoading",    true);

            fetch("http://localhost:3000/api/auth/login", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    email:     sEmail,
                    password:  sPassword,
                    loginType: sLoginType
                })
            })
            .then(function (r) {
                if (!r.ok) {
                    return r.text().then(function (txt) {
                        throw new Error("Sunucu hatası (" + r.status + "): " + txt);
                    });
                }
                return r.json();
            })
            .then(function (data) {
                if (!data.success) {
                    throw new Error(data.message || "Giriş başarısız.");
                }

                var sToken = data.data.token;
                var oUser  = data.data.user;

                if (!sToken) throw new Error("Token alınamadı.");

                var sRole = (oUser.role || oUser.type || oUser.user_type || "").toLowerCase();
                if (sLoginType === "admin" && sRole !== "admin" && sRole !== "super_admin") {
                    throw new Error("Bu hesap yönetici yetkisine sahip değil.");
                }

                that._completeLogin(sToken, oUser, bRememberMe);
            })
            .catch(function (err) {
                oM.setProperty("/errorMessage", err.message || "Giriş başarısız.");
            })
            .finally(function () {
                oM.setProperty("/isLoading", false);
            });
        },

        _completeLogin: function (sToken, oUser, bRememberMe) {
            // avatar_url düzelt
            if (oUser.avatar_url && !oUser.avatar_url.startsWith("http")) {
                oUser.avatar_url = "http://localhost:3000" + oUser.avatar_url;
            }
            // initials hesapla
            if (!oUser.initials && oUser.first_name) {
                oUser.initials =
                    (oUser.first_name.charAt(0) + (oUser.last_name || "").charAt(0)).toUpperCase();
            }

            // localStorage'a kaydet
            localStorage.setItem("authToken",  sToken);
            localStorage.setItem("userData",   JSON.stringify(oUser));
            if (bRememberMe) localStorage.setItem("rememberMe", "true");

            // appData güncelle
            var oAppData = this.getOwnerComponent().getModel("appData");
            oAppData.setProperty("/isAuthenticated", true);
            oAppData.setProperty("/authToken",       sToken);
            oAppData.setProperty("/currentUser",     oUser);

            // Dialog'u kapat
            if (this._pLoginDialog) {
                this._pLoginDialog.then(function (d) { if (d.isOpen()) d.close(); });
            }

            MessageToast.show("Hoş geldiniz, " + oUser.first_name + "!");

            var sRole  = (oUser.role || oUser.type || oUser.user_type || "").toLowerCase();
            var sRoute = (sRole === "admin" || sRole === "super_admin") ? "adminDashboard" : "home";
            this.getOwnerComponent().getRouter().navTo(sRoute);
        },
        

        /* ══════════════════════════════════════════════
           KAYIT OL → Register Fragment
        ══════════════════════════════════════════════ */
        onRegister: function () {
            var that  = this;
            var oView = this.getView();

            // Login dialog'u kapat
            if (this._pLoginDialog) {
                this._pLoginDialog.then(function (d) { if (d.isOpen()) d.close(); });
            }

            // Register modelini sıfırla
            oView.setModel(new JSONModel({
                first_name:            "",
                last_name:             "",
                email:                 "",
                password:              "",
                password_confirm:      "",
                errorMessage:          "",
                successMessage:        "",
                isLoading:             false,
                passwordStrength:      0,
                passwordStrengthState: "None",
                passwordStrengthText:  ""
            }), "registerModel");

            if (!this._pRegisterDialog) {
                this._pRegisterDialog = Fragment.load({
                    id:         oView.getId(),
                    name:       "edusupport.platform.view.fragments.Register",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pRegisterDialog.then(function (d) { d.open(); });
        },

        onCloseRegisterDialog: function () {
            if (this._pRegisterDialog) {
                this._pRegisterDialog.then(function (d) { d.close(); });
            }
        },

        onSwitchToLogin: function () {
            if (this._pRegisterDialog) {
                this._pRegisterDialog.then(function (d) { d.close(); });
            }
            this.onLoginPress();
        },

        onRegisterPasswordChange: function () {
            var oModel    = this.getView().getModel("registerModel");
            var sPassword = oModel.getProperty("/password");
            var iStrength = 0;
            if (sPassword.length >= 8)           iStrength += 25;
            if (/[A-Z]/.test(sPassword))         iStrength += 25;
            if (/[0-9]/.test(sPassword))         iStrength += 25;
            if (/[^A-Za-z0-9]/.test(sPassword))  iStrength += 25;

            var sState, sText;
            if      (iStrength >= 75) { sState = "Success"; sText = "Güçlü";     }
            else if (iStrength >= 50) { sState = "Warning"; sText = "Orta";      }
            else if (iStrength >= 25) { sState = "Error";   sText = "Zayıf";     }
            else                      { sState = "None";    sText = "Çok zayıf"; }

            oModel.setProperty("/passwordStrength",      iStrength);
            oModel.setProperty("/passwordStrengthState", sState);
            oModel.setProperty("/passwordStrengthText",  sText);
        },

        onRegisterFieldChange: function () {
            var oModel = this.getView().getModel("registerModel");
            if (oModel) oModel.setProperty("/errorMessage", "");
        },

        onRegisterSubmit: function () {
            var that   = this;
            var oModel = this.getView().getModel("registerModel");

            var sFirst = oModel.getProperty("/first_name").trim();
            var sLast  = oModel.getProperty("/last_name").trim();
            var sEmail = oModel.getProperty("/email").trim();
            var sPass  = oModel.getProperty("/password");
            var sConf  = oModel.getProperty("/password_confirm");

            if (!sFirst || !sLast) {
                oModel.setProperty("/errorMessage", "Ad ve soyad zorunludur."); return;
            }
            if (!sEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail)) {
                oModel.setProperty("/errorMessage", "Geçerli bir e-posta adresi girin."); return;
            }
            if (!sPass || sPass.length < 8) {
                oModel.setProperty("/errorMessage", "Şifre en az 8 karakter olmalıdır."); return;
            }
            if (sPass !== sConf) {
                oModel.setProperty("/errorMessage", "Şifreler eşleşmiyor."); return;
            }

            oModel.setProperty("/isLoading",    true);
            oModel.setProperty("/errorMessage", "");

            fetch("http://localhost:3000/api/auth/register", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    first_name: sFirst,
                    last_name:  sLast,
                    email:      sEmail,
                    password:   sPass
                })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.success) throw new Error(data.message || "Kayıt başarısız");

                var sToken = data.data.token;
                var oUser  = data.data.user;

                oModel.setProperty("/successMessage", "Hesabınız oluşturuldu! Giriş yapılıyor...");

                setTimeout(function () {
                    if (that._pRegisterDialog) {
                        that._pRegisterDialog.then(function (d) { d.close(); });
                    }
                    that._completeLogin(sToken, oUser, false);
                }, 1500);
            })
            .catch(function (err) {
                oModel.setProperty("/errorMessage", err.message || "Kayıt sırasında hata oluştu.");
            })
            .finally(function () {
                oModel.setProperty("/isLoading", false);
            });
        },

        /* ══════════════════════════════════════════════
           DİĞER
        ══════════════════════════════════════════════ */
        onForgotPassword: function () {
            var that  = this;
            var oView = this.getView();
            oView.setModel(new JSONModel({
                email: "", errorMessage: "", successMessage: "", isLoading: false
            }), "forgotModel");
            if (!this._pForgotDialog) {
                this._pForgotDialog = Fragment.load({
                    id: oView.getId(),
                    name: "edusupport.platform.view.fragments.ForgotPassword",
                    controller: this
                }).then(function (oDialog) { oView.addDependent(oDialog); return oDialog; });
            }
            if (this._pLoginDialog) {
                this._pLoginDialog.then(function (d) { if (d.isOpen()) d.close(); });
            }
            this._pForgotDialog.then(function (d) { d.open(); });
        },

        onForgotSubmit: function () {
            var oM    = this.getView().getModel("forgotModel");
            var sEmail = oM.getProperty("/email").trim();
            if (!sEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail)) {
                oM.setProperty("/errorMessage", "Geçerli bir e-posta adresi girin."); return;
            }
            oM.setProperty("/isLoading", true);
            oM.setProperty("/errorMessage", "");
            fetch("http://localhost:3000/api/auth/forgot-password", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: sEmail })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.success) throw new Error(data.message);
                oM.setProperty("/successMessage", data.message);
            })
            .catch(function (err) { oM.setProperty("/errorMessage", err.message || "Bir hata oluştu."); })
            .finally(function () { oM.setProperty("/isLoading", false); });
        },

        onCloseForgotDialog: function () {
            if (this._pForgotDialog) this._pForgotDialog.then(function (d) { d.close(); });
        },

        onNavToFaq:     function () { /* anchor scroll veya route */ },
        onNavToContact: function () { this.getOwnerComponent().getRouter().navTo("contact"); },
       
        onLogout: function () {
            var that = this;
            MessageBox.confirm("Çıkış yapmak istediğinize emin misiniz?", {
                title: "Çıkış",
                onClose: function (oAction) {
                    if (oAction !== MessageBox.Action.OK) return;

                    localStorage.removeItem("authToken");
                    localStorage.removeItem("userData");
                    localStorage.removeItem("rememberMe");

                    var oAppData = that.getOwnerComponent().getModel("appData");
                    oAppData.setProperty("/isAuthenticated", false);
                    oAppData.setProperty("/currentUser",     null);
                    oAppData.setProperty("/authToken",       null);

                    // ⚠️ _pLoginDialog'u NULL YAPMA — fragment tekrar yüklenirse duplicate ID olur
                    // Promise tutulur, sadece model sıfırlanır (onLoginPress'te zaten sıfırlanıyor)

                    MessageToast.show("Başarıyla çıkış yapıldı!");
                    that.getOwnerComponent().getRouter().navTo("home");
                }
            });
        }
    });
});