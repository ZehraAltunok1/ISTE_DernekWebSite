sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, MessageBox, MessageToast, Fragment) {
    "use strict";

    return Controller.extend("edusupport.platform.controller.auth.Login", {

        onInit: function () {
            console.log("🔐 Login Controller initialized");

            var oLoginModel = new JSONModel({
                userEmail: "",
                userPassword: "",
                adminEmail: "",
                adminPassword: "",
                rememberMe: false,
                rememberMeAdmin: false,
                errorMessage: "",
                errorMessageAdmin: "",
                isLoading: false
            });
            this.getView().setModel(oLoginModel, "loginModel");

            this._checkIfAlreadyLoggedIn();
        },

        _checkIfAlreadyLoggedIn: function () {
            var oAppData = this.getOwnerComponent().getModel("appData");
            if (oAppData && oAppData.getProperty("/isAuthenticated")) {
                console.log("✅ Kullanıcı zaten giriş yapmış, yönlendiriliyor...");
                this._redirectToUserPanel();
            }
        },

        /* ==========================================
           KULLANICI GİRİŞİ
           ========================================== */

        onUserLoginPress: function () {
            var oLoginModel = this.getView().getModel("loginModel");
            oLoginModel.setProperty("/userEmail", "");
            oLoginModel.setProperty("/userPassword", "");
            oLoginModel.setProperty("/errorMessage", "");
            this.byId("isteUserLoginDialog").open();
        },

        onUserLogin: function () {
            var oLoginModel = this.getView().getModel("loginModel");
            var sEmail    = oLoginModel.getProperty("/userEmail");
            var sPassword = oLoginModel.getProperty("/userPassword");
            var bRemember = oLoginModel.getProperty("/rememberMe");

            if (!sEmail || !sPassword) {
                oLoginModel.setProperty("/errorMessage", "Lütfen e-posta ve şifrenizi girin.");
                return;
            }
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sEmail)) {
                oLoginModel.setProperty("/errorMessage", "Geçerli bir e-posta adresi girin.");
                return;
            }

            oLoginModel.setProperty("/isLoading", true);
            oLoginModel.setProperty("/errorMessage", "");
            this._performLogin(sEmail, sPassword, bRemember, "user");
        },

        onCloseUserDialog: function () {
            this.byId("isteUserLoginDialog").close();
        },

        /* ==========================================
           YÖNETİCİ GİRİŞİ
           ========================================== */

        onAdminLoginPress: function () {
            var oLoginModel = this.getView().getModel("loginModel");
            oLoginModel.setProperty("/adminEmail", "");
            oLoginModel.setProperty("/adminPassword", "");
            oLoginModel.setProperty("/errorMessageAdmin", "");
            this.byId("isteAdminLoginDialog").open();
        },

        onAdminLogin: function () {
            var oLoginModel = this.getView().getModel("loginModel");
            var sEmail    = oLoginModel.getProperty("/adminEmail");
            var sPassword = oLoginModel.getProperty("/adminPassword");
            var bRemember = oLoginModel.getProperty("/rememberMeAdmin");

            if (!sEmail || !sPassword) {
                oLoginModel.setProperty("/errorMessageAdmin", "Lütfen e-posta ve şifrenizi girin.");
                return;
            }
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sEmail)) {
                oLoginModel.setProperty("/errorMessageAdmin", "Geçerli bir e-posta adresi girin.");
                return;
            }

            oLoginModel.setProperty("/isLoading", true);
            oLoginModel.setProperty("/errorMessageAdmin", "");
            this._performLogin(sEmail, sPassword, bRemember, "admin");
        },

        onCloseAdminDialog: function () {
            this.byId("isteAdminLoginDialog").close();
        },

        /* ==========================================
           ORTAK GİRİŞ MANTIĞI
           ========================================== */

        _performLogin: function (sEmail, sPassword, bRememberMe, sLoginType) {
            var that = this;
            var sApiBase = "http://localhost:3000"; // backend sunucusu

            fetch(sApiBase + "/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: sEmail,
                    password: sPassword,
                    loginType: sLoginType
                })
            })
            .then(function (response) {
                if (!response.ok) {
                    return response.text().then(function (txt) {
                        throw new Error("Sunucu hatası (" + response.status + "): " + txt);
                    });
                }
                return response.json();
            })
            .then(function (data) {
                console.log("✅ LOGIN RESPONSE:", JSON.stringify(data));

                if (!data.success) {
                    throw new Error(data.message || "Giriş başarısız");
                }

                // ✅ Backend { success, data: { token, user } } formatında dönüyor
                var sToken = data.data.token;
                var oUser  = data.data.user;

                if (!sToken) {
                    throw new Error("Token alınamadı, lütfen tekrar deneyin.");
                }

                var sUserRole = (oUser.role || oUser.type || oUser.user_type || "").toLowerCase();
                if (sLoginType === "admin" && sUserRole !== "admin" && sUserRole !== "super_admin") {
                    throw new Error("Unauthorized: Not an admin user");
                }

                that._completeLogin(sToken, oUser, bRememberMe);
            })
            .catch(function (error) {
                console.error("❌ Login error:", error);

                var sErrorMessage = "Giriş başarısız. E-posta veya şifre hatalı.";
                if (error.message === "Unauthorized: Not an admin user") {
                    sErrorMessage = "Bu hesap yönetici yetkisine sahip değil.";
                } else if (error.message) {
                    sErrorMessage = error.message;
                }

                var oLoginModel = that.getView().getModel("loginModel");
                if (sLoginType === "admin") {
                    oLoginModel.setProperty("/errorMessageAdmin", sErrorMessage);
                } else {
                    oLoginModel.setProperty("/errorMessage", sErrorMessage);
                }
            })
            .finally(function () {
                that.getView().getModel("loginModel").setProperty("/isLoading", false);
            });
        },

        _completeLogin: function (sToken, oUser, bRememberMe) {
            // ✅ localStorage'a kaydet
            localStorage.setItem("authToken", sToken);
            localStorage.setItem("userData", JSON.stringify(oUser));
            if (bRememberMe) localStorage.setItem("rememberMe", "true");

            // ✅ appData modelini güncelle
            var oAppData = this.getOwnerComponent().getModel("appData");
            oAppData.setProperty("/isAuthenticated", true);
            oAppData.setProperty("/authToken", sToken);
            oAppData.setProperty("/currentUser", oUser);

            console.log("✅ Token kaydedildi:", sToken);

            // Tüm açık dialog'ları kapat
            var oUserDialog  = this.byId("isteUserLoginDialog");
            var oAdminDialog = this.byId("isteAdminLoginDialog");
            if (oUserDialog  && oUserDialog.isOpen())  oUserDialog.close();
            if (oAdminDialog && oAdminDialog.isOpen()) oAdminDialog.close();

            MessageToast.show("Hoş geldiniz, " + oUser.first_name + "!");
            this._redirectToUserPanel();
        },

        _redirectToUserPanel: function () {
            var oAppData = this.getOwnerComponent().getModel("appData");
            var oUser    = oAppData.getProperty("/currentUser");
            if (!oUser) return;

            var sRole  = (oUser.role || oUser.type || oUser.user_type || "").toLowerCase();
            var sRoute = (sRole === "admin" || sRole === "super_admin") ? "adminDashboard" : "home";

            console.log("🔀 Yönlendiriliyor:", sRoute, "| Rol:", sRole);
            this.getOwnerComponent().getRouter().navTo(sRoute);
        },

        /* ==========================================
           KAYIT (REGISTER) — Dialog
           ========================================== */

        onRegister: function () {
            var that = this;

            // Açık login dialog'larını kapat
            var oUserDialog  = this.byId("isteUserLoginDialog");
            var oAdminDialog = this.byId("isteAdminLoginDialog");
            if (oUserDialog  && oUserDialog.isOpen())  oUserDialog.close();
            if (oAdminDialog && oAdminDialog.isOpen()) oAdminDialog.close();

            // Register modelini sıfırla
            var oRegisterModel = new JSONModel({
                first_name: "",
                last_name: "",
                email: "",
                password: "",
                password_confirm: "",
                errorMessage: "",
                successMessage: "",
                isLoading: false,
                passwordStrength: 0,
                passwordStrengthState: "None",
                passwordStrengthText: ""
            });
            this.getView().setModel(oRegisterModel, "registerModel");

            // Fragment'i yükle ve dialog'u aç
            if (!this._oRegisterDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "edusupport.platform.view.fragments.Register",
                    controller: this
                }).then(function (oDialog) {
                    that._oRegisterDialog = oDialog;
                    that.getView().addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._oRegisterDialog.open();
            }
        },

        onCloseRegisterDialog: function () {
            if (this._oRegisterDialog) this._oRegisterDialog.close();
        },

        // Register dialog'daki "Giriş Yap" linkine basınca
        onSwitchToLogin: function () {
            if (this._oRegisterDialog) this._oRegisterDialog.close();
            var oUserDialog = this.byId("isteUserLoginDialog");
            if (oUserDialog) {
                this.getView().getModel("loginModel").setProperty("/errorMessage", "");
                oUserDialog.open();
            }
        },

        // Şifre yazarken güç göstergesi
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
            this.getView().getModel("registerModel").setProperty("/errorMessage", "");
        },

        onRegisterSubmit: function () {
            var that   = this;
            var oModel = this.getView().getModel("registerModel");

            var sFirst    = oModel.getProperty("/first_name").trim();
            var sLast     = oModel.getProperty("/last_name").trim();
            var sEmail    = oModel.getProperty("/email").trim();
            var sPassword = oModel.getProperty("/password");
            var sConfirm  = oModel.getProperty("/password_confirm");

            // Validasyon
            if (!sFirst || !sLast) {
                oModel.setProperty("/errorMessage", "Ad ve soyad zorunludur.");
                return;
            }
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!sEmail || !emailRegex.test(sEmail)) {
                oModel.setProperty("/errorMessage", "Geçerli bir e-posta adresi girin.");
                return;
            }
            if (!sPassword || sPassword.length < 8) {
                oModel.setProperty("/errorMessage", "Şifre en az 8 karakter olmalıdır.");
                return;
            }
            if (sPassword !== sConfirm) {
                oModel.setProperty("/errorMessage", "Şifreler eşleşmiyor.");
                return;
            }

            oModel.setProperty("/isLoading", true);
            oModel.setProperty("/errorMessage", "");
            oModel.setProperty("/successMessage", "");

            fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    first_name: sFirst,
                    last_name:  sLast,
                    email:      sEmail,
                    password:   sPassword
                })
            })
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                console.log("✅ REGISTER RESPONSE:", JSON.stringify(data));

                if (!data.success) {
                    throw new Error(data.message || "Kayıt başarısız");
                }

                // ✅ Kayıt başarılı → otomatik giriş yap
                var sToken = data.data.token;
                var oUser  = data.data.user;

                oModel.setProperty("/successMessage", "Hesabınız oluşturuldu! Giriş yapılıyor...");

                setTimeout(function () {
                    if (that._oRegisterDialog) that._oRegisterDialog.close();
                    that._completeLogin(sToken, oUser, false);
                }, 1500);
            })
            .catch(function (error) {
                console.error("❌ Register error:", error);
                oModel.setProperty("/errorMessage", error.message || "Kayıt sırasında hata oluştu.");
            })
            .finally(function () {
                oModel.setProperty("/isLoading", false);
            });
        },

        /* ==========================================
           DİĞER AKSIYONLAR
           ========================================== */

        onDialogClose: function () {
            var oLoginModel = this.getView().getModel("loginModel");
            oLoginModel.setProperty("/errorMessage", "");
            oLoginModel.setProperty("/errorMessageAdmin", "");
        },

        onForgotPassword: function () {
            MessageBox.information(
                "Şifre sıfırlama bağlantısı e-posta adresinize gönderilecektir.",
                { title: "Şifremi Unuttum", actions: [MessageBox.Action.OK] }
            );
        },

        onGoToHome: function () {
            this.getOwnerComponent().getRouter().navTo("home");
        },

        onHelp: function () {
            MessageBox.information(
                "Yardım için:\n\nE-posta: info@istedernek.com\nTelefon: +90 (212) 555 66 77\n\nÇalışma Saatleri: Hafta içi 09:00 - 18:00",
                { title: "Yardım ve Destek", actions: [MessageBox.Action.OK] }
            );
        },

        onContact: function () {
            this.onGoToHome();
        }
    });
});