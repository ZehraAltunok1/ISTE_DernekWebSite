sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("edusupport.platform.controller.auth.Login", {

        onInit: function () {
            console.log("🔐 Login Controller initialized");

            // Login model
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

            // Check if already authenticated
            this._checkIfAlreadyLoggedIn();
        },

        _checkIfAlreadyLoggedIn: function () {
            var oAppData = this.getOwnerComponent().getModel("appData");
            
            if (oAppData && oAppData.getProperty("/isAuthenticated")) {
                console.log("✅ User already authenticated, redirecting...");
                this._redirectToUserPanel();
            }
        },

        /* ==========================================
           KULLANICI GİRİŞİ
           ========================================== */

        onUserLoginPress: function () {
            console.log("👤 Opening User Login Dialog");
            
            // Clear previous data
            var oLoginModel = this.getView().getModel("loginModel");
            oLoginModel.setProperty("/userEmail", "");
            oLoginModel.setProperty("/userPassword", "");
            oLoginModel.setProperty("/errorMessage", "");
            
            // Open dialog with UNIQUE ID
            this.byId("isteUserLoginDialog").open();
        },

        onUserLogin: function () {
            var oLoginModel = this.getView().getModel("loginModel");
            var sEmail = oLoginModel.getProperty("/userEmail");
            var sPassword = oLoginModel.getProperty("/userPassword");
            var bRememberMe = oLoginModel.getProperty("/rememberMe");

            // Validation
            if (!sEmail || !sPassword) {
                oLoginModel.setProperty("/errorMessage", "Lütfen e-posta ve şifrenizi girin.");
                return;
            }

            // Email format check
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sEmail)) {
                oLoginModel.setProperty("/errorMessage", "Geçerli bir e-posta adresi girin.");
                return;
            }

            // Set loading
            oLoginModel.setProperty("/isLoading", true);
            oLoginModel.setProperty("/errorMessage", "");

            // API Call
            this._performLogin(sEmail, sPassword, bRememberMe, "user");
        },

        onCloseUserDialog: function () {
            this.byId("isteUserLoginDialog").close();
        },

        /* ==========================================
           YÖNETİCİ GİRİŞİ
           ========================================== */

        onAdminLoginPress: function () {
            console.log("🔑 Opening Admin Login Dialog");
            
            // Clear previous data
            var oLoginModel = this.getView().getModel("loginModel");
            oLoginModel.setProperty("/adminEmail", "");
            oLoginModel.setProperty("/adminPassword", "");
            oLoginModel.setProperty("/errorMessageAdmin", "");
            
            // Open dialog with UNIQUE ID
            this.byId("isteAdminLoginDialog").open();
        },

        onAdminLogin: function () {
            var oLoginModel = this.getView().getModel("loginModel");
            var sEmail = oLoginModel.getProperty("/adminEmail");
            var sPassword = oLoginModel.getProperty("/adminPassword");
            var bRememberMe = oLoginModel.getProperty("/rememberMeAdmin");

            // Validation
            if (!sEmail || !sPassword) {
                oLoginModel.setProperty("/errorMessageAdmin", "Lütfen e-posta ve şifrenizi girin.");
                return;
            }

            // Email format check
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sEmail)) {
                oLoginModel.setProperty("/errorMessageAdmin", "Geçerli bir e-posta adresi girin.");
                return;
            }

            // Set loading
            oLoginModel.setProperty("/isLoading", true);
            oLoginModel.setProperty("/errorMessageAdmin", "");

            // API Call
            this._performLogin(sEmail, sPassword, bRememberMe, "admin");
        },

        onCloseAdminDialog: function () {
            this.byId("isteAdminLoginDialog").close();
        },

        /* ==========================================
           COMMON LOGIN LOGIC
           ========================================== */

        _performLogin: function (sEmail, sPassword, bRememberMe, sLoginType) {
            var that = this;

            // API endpoint
            var sUrl = "/api/auth/login";

            // Request
            fetch(sUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: sEmail,
                    password: sPassword,
                    loginType: sLoginType  // "user" or "admin"
                })
            })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Login failed");
                }
                return response.json();
            })
            .then(function (data) {
                console.log("✅ Login successful:", data);
                
                // Verify role matches login type
                var sUserRole = data.user.role || data.user.type;
                
                if (sLoginType === "admin" && sUserRole !== "admin") {
                    throw new Error("Unauthorized: Not an admin user");
                }
                
                if (sLoginType === "user" && sUserRole === "admin") {
                    // Admin kullanıcı girişi yaptıysa yönlendir
                    MessageBox.information(
                        "Yönetici hesabınızla giriş yapıyorsunuz. Yönetici paneline yönlendirileceksiniz.",
                        {
                            title: "Bilgi",
                            onClose: function() {
                                that._completeLogin(data, bRememberMe);
                            }
                        }
                    );
                    return;
                }
                
                // Complete login
                that._completeLogin(data, bRememberMe);
            })
            .catch(function (error) {
                console.error("❌ Login error:", error);
                
                var sErrorMessage = "Giriş başarısız. Lütfen e-posta ve şifrenizi kontrol edin.";
                
                if (error.message === "Unauthorized: Not an admin user") {
                    sErrorMessage = "Bu hesap yönetici yetkisine sahip değil. Lütfen kullanıcı girişi yapın.";
                }
                
                var oLoginModel = that.getView().getModel("loginModel");
                
                if (sLoginType === "admin") {
                    oLoginModel.setProperty("/errorMessageAdmin", sErrorMessage);
                } else {
                    oLoginModel.setProperty("/errorMessage", sErrorMessage);
                }
            })
            .finally(function () {
                var oLoginModel = that.getView().getModel("loginModel");
                oLoginModel.setProperty("/isLoading", false);
            });
        },

        _completeLogin: function (data, bRememberMe) {
            // Save to localStorage
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("userData", JSON.stringify(data.user));

            if (bRememberMe) {
                localStorage.setItem("rememberMe", "true");
            }

            // Update app model
            var oAppData = this.getOwnerComponent().getModel("appData");
            oAppData.setProperty("/isAuthenticated", true);
            oAppData.setProperty("/currentUser", data.user);
            oAppData.setProperty("/authToken", data.token);

            // Set OData auth header
            this._setODataAuthHeader(data.token);

            // Close dialogs with UNIQUE IDs
            var oUserDialog = this.byId("isteUserLoginDialog");
            var oAdminDialog = this.byId("isteAdminLoginDialog");
            
            if (oUserDialog && oUserDialog.isOpen()) {
                oUserDialog.close();
            }
            
            if (oAdminDialog && oAdminDialog.isOpen()) {
                oAdminDialog.close();
            }

            // Success message
            MessageToast.show("Giriş başarılı! Hoş geldiniz " + data.user.first_name);

            // Redirect
            this._redirectToUserPanel();
        },

        _setODataAuthHeader: function (sToken) {
            var oODataModel = this.getOwnerComponent().getModel();
            
            if (oODataModel && oODataModel.setHeaders) {
                oODataModel.setHeaders({
                    "Authorization": "Bearer " + sToken
                });
                console.log("✅ OData Authorization header set");
            }
        },

        _redirectToUserPanel: function () {
            var oAppData = this.getOwnerComponent().getModel("appData");
            var oUser = oAppData.getProperty("/currentUser");
            var oRouter = this.getOwnerComponent().getRouter();

            if (!oUser) {
                console.error("❌ User data not found");
                return;
            }

            // Check user role/type
            var sRole = oUser.role || oUser.type;

            if (sRole === "admin") {
                console.log("🔑 Redirecting to admin dashboard");
                oRouter.navTo("adminDashboard");
            } else {
                console.log("👤 Redirecting to user launchpad");
                oRouter.navTo("launchpad");
            }
        },

        /* ==========================================
           DIALOG EVENTS
           ========================================== */

        onDialogClose: function () {
            // Clear error messages when dialog closes
            var oLoginModel = this.getView().getModel("loginModel");
            oLoginModel.setProperty("/errorMessage", "");
            oLoginModel.setProperty("/errorMessageAdmin", "");
        },

        /* ==========================================
           OTHER ACTIONS
           ========================================== */

        onForgotPassword: function () {
            MessageBox.information(
                "Şifre sıfırlama bağlantısı e-posta adresinize gönderilecektir.",
                {
                    title: "Şifremi Unuttum",
                    actions: [MessageBox.Action.OK]
                }
            );
        },

        onRegister: function () {
            MessageBox.information(
                "Kayıt sayfası yakında aktif olacaktır.",
                {
                    title: "Kayıt Ol",
                    actions: [MessageBox.Action.OK]
                }
            );
        },

        onGoToHome: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("home");
        },

        onHelp: function () {
            MessageBox.information(
                "Yardım için:\n\nE-posta: info@istedernek.com\nTelefon: +90 (212) 555 66 77\n\nÇalışma Saatleri: Hafta içi 09:00 - 18:00",
                {
                    title: "Yardım ve Destek",
                    actions: [MessageBox.Action.OK]
                }
            );
        },

        onContact: function () {
            this.onGoToHome();
        }

    });
});