sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, Fragment, JSONModel, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("edusupport.platform.controller.public.Home", {

        onInit: function () {
            console.log("🏠 Home page initialized");
            this._checkLoginStatus();
            
            // Login model oluştur
            var oLoginModel = new JSONModel({
                loginType: "user",
                email: "",
                password: "",
                rememberMe: false,
                errorMessage: ""
            });
            this.getView().setModel(oLoginModel, "loginModel");
            
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("home").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function() {
            console.log("🏠 Home route matched");
            this._checkLoginStatus();
        },

        _checkLoginStatus: function () {
            var oAppData = this.getOwnerComponent().getModel("appData");
            var sToken = localStorage.getItem("authToken");
            var sUserData = localStorage.getItem("userData");

            if (sToken && sUserData) {
                try {
                    var oUser = JSON.parse(sUserData);
                    oAppData.setProperty("/isAuthenticated", true);
                    oAppData.setProperty("/currentUser", oUser);
                    console.log("✅ User authenticated:", oUser.first_name);
                } catch (e) {
                    oAppData.setProperty("/isAuthenticated", false);
                    oAppData.setProperty("/currentUser", null);
                }
            } else {
                oAppData.setProperty("/isAuthenticated", false);
                oAppData.setProperty("/currentUser", null);
            }
        },

        // ==========================================
        // SCROLL NAVIGATION
        // ==========================================

        onScrollToSection: function(sectionId) {
            var oSection = this.getView().byId(sectionId);
            if (oSection) {
                oSection.getDomRef().scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        },

        onScrollToAbout: function() {
            this.onScrollToSection("aboutSection");
        },

        onScrollToScholarships: function() {
            this.onScrollToSection("scholarshipsSection");
        },

        onScrollToHowItWorks: function() {
            this.onScrollToSection("howItWorksSection");
        },

        onScrollToContact: function() {
            this.onScrollToSection("contactSection");
        },

        // ==========================================
        // NAVIGATION
        // ==========================================

        onNavToHome: function() {
            this.getOwnerComponent().getRouter().navTo("home");
        },

        onNavToDashboard: function() {
            this.getOwnerComponent().getRouter().navTo("adminDashboard");
        },

        onNavToLaunchpad: function() {
            this.getOwnerComponent().getRouter().navTo("launchpad");
        },

        onViewProfile: function() {
            this.getOwnerComponent().getRouter().navTo("profile");
        },

        onSettings: function() {
            MessageToast.show("Ayarlar yakında aktif olacak!");
        },

        // ==========================================
        // LOGIN DIALOG (FRAGMENT)
        // ==========================================

        onLoginPress: function () {
            console.log("🔑 Opening login dialog...");
            
            var oView = this.getView();
            
            // Dialog yoksa oluştur
            if (!this._pLoginDialog) {
                this._pLoginDialog = Fragment.load({
                    id: oView.getId(),
                    name: "edusupport.platform.view.fragments.Login",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            // Dialog'u aç
            this._pLoginDialog.then(function(oDialog) {
                // Temizle
                var oLoginModel = this.getView().getModel("loginModel");
                oLoginModel.setProperty("/email", "");
                oLoginModel.setProperty("/password", "");
                oLoginModel.setProperty("/errorMessage", "");
                oLoginModel.setProperty("/loginType", "user");
                
                oDialog.open();
            }.bind(this));
        },

        onLoginSubmit: function () {
            console.log("🔐 Login attempt...");
            
            var oLoginModel = this.getView().getModel("loginModel");
            var sLoginType = oLoginModel.getProperty("/loginType");
            var sEmail = oLoginModel.getProperty("/email");
            var sPassword = oLoginModel.getProperty("/password");
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

            // Test kullanıcıları
            var TEST_USERS = {
                "admin@test.com": {
                    password: "123456",
                    user: {
                        id: 1,
                        email: "admin@test.com",
                        first_name: "Admin",
                        last_name: "Kullanıcı",
                        role: "admin",
                        type: "admin"
                    }
                },
                "donor@test.com": {
                    password: "123456",
                    user: {
                        id: 2,
                        email: "donor@test.com",
                        first_name: "Ahmet",
                        last_name: "Yılmaz",
                        role: "user",
                        type: "user"
                    }
                },
                "student@test.com": {
                    password: "123456",
                    user: {
                        id: 3,
                        email: "student@test.com",
                        first_name: "Ayşe",
                        last_name: "Demir",
                        role: "user",
                        type: "user"
                    }
                }
            };

            var oTestUser = TEST_USERS[sEmail];
            
            if (oTestUser && oTestUser.password === sPassword) {
                
                // Role kontrolü
                if (sLoginType === "admin" && oTestUser.user.role !== "admin") {
                    oLoginModel.setProperty("/errorMessage", "Bu hesap yönetici değil. Kullanıcı girişi yapın.");
                    return;
                }
                
                console.log("✅ Login successful!");
                
                // Token oluştur
                var sToken = "test-token-" + Date.now();
                localStorage.setItem("authToken", sToken);
                localStorage.setItem("userData", JSON.stringify(oTestUser.user));

                if (bRememberMe) {
                    localStorage.setItem("rememberMe", "true");
                }

                // App Data güncelle
                var oAppData = this.getOwnerComponent().getModel("appData");
                oAppData.setProperty("/isAuthenticated", true);
                oAppData.setProperty("/currentUser", oTestUser.user);
                oAppData.setProperty("/authToken", sToken);

                // Dialog kapat
                this._pLoginDialog.then(function(oDialog) {
                    oDialog.close();
                });

                MessageToast.show("Hoş geldiniz, " + oTestUser.user.first_name + "!");

                // Yönlendir
                setTimeout(function() {
                    if (oTestUser.user.type === "admin") {
                        this.getOwnerComponent().getRouter().navTo("adminDashboard");
                    } else {
                        this.getOwnerComponent().getRouter().navTo("launchpad");
                    }
                }.bind(this), 300);
                
            } else {
                oLoginModel.setProperty("/errorMessage", "E-posta veya şifre hatalı!");
            }
        },

        onCloseLoginDialog: function () {
            this._pLoginDialog.then(function(oDialog) {
                oDialog.close();
            });
        },

        // ==========================================
        // LOGOUT
        // ==========================================

        onLogout: function() {
            
            MessageBox.confirm("Çıkış yapmak istediğinize emin misiniz?", {
                
                onClose: function(oAction) {
                    
                    if (oAction === MessageBox.Action.OK) {
    
                        localStorage.removeItem("authToken");
                        localStorage.removeItem("userData");

                        var oAppData = this.getOwnerComponent().getModel("appData");
                        oAppData.setProperty("/isAuthenticated", false);
                        oAppData.setProperty("/currentUser", null);

                        MessageToast.show("Başarıyla çıkış yapıldı!");

                        this.getOwnerComponent().getRouter().navTo("home");

                    }
                }.bind(this)
            });
        }
    });
});