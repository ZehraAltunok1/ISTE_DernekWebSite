sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History"
], function (Controller, MessageBox, MessageToast, History) {
    "use strict";

    return Controller.extend("edusupport.platform.controller.user.Launchpad", {

        onInit: function () {
            console.log("🚀 User Launchpad initialized");
            
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("launchpad").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            var oAppData = this.getOwnerComponent().getModel("appData");
            
            if (!oAppData.getProperty("/isAuthenticated")) {
                MessageToast.show("Lütfen önce giriş yapın!");
                this.getOwnerComponent().getRouter().navTo("home");
                return;
            }

            var oUser = oAppData.getProperty("/currentUser");
            console.log("✅ Authenticated User:", oUser);
            
            if (oUser && oUser.first_name) {
                MessageToast.show("Hoş geldiniz, " + oUser.first_name + "!");
            }
        },

        // ==========================================
        // NAVIGATION - FİORİ ELEMENTS
        // ==========================================

        /**
         * Bağışlarım - Fiori Elements List Report'a git
         */
        onNavToMyDonations: function () {
            console.log("📊 Navigating to Donations (Fiori Elements)...");
            
            this.getOwnerComponent()
                .getRouter()
                .navTo("DonationsList");
        },

        /**
         * Desteklediğim öğrenciler
         */
        onNavToMyStudents: function () {
            MessageToast.show("🚧 Desteklediğiniz öğrenciler sayfası yakında aktif olacak!");
        },

        /**
         * Yeni bağış yap
         */
        onNavToDonate: function () {
            MessageToast.show("🚧 Bağış sayfası yakında aktif olacak!");
        },

        /**
         * Profil sayfası
         */
        onNavToProfile: function () {
            MessageToast.show("🚧 Profil sayfası yakında aktif olacak!");
        },

        /**
         * Ana sayfaya dön
         */
        onNavToHome: function () {
            MessageBox.confirm("Ana sayfaya dönmek istediğinize emin misiniz?", {
                title: "Ana Sayfaya Dön",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.YES) {
                        this.getOwnerComponent().getRouter().navTo("home");
                    }
                }.bind(this)
            });
        },

        // ==========================================
        // SHELL BAR FONKSİYONLARI
        // ==========================================

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            
            if (sQuery) {
                MessageToast.show("Arama: " + sQuery + " (Yakında aktif!)");
            }
        },

        onNotifications: function () {
            MessageBox.information(
                "3 yeni bildiriminiz var:\n\n" +
                "• Yeni bağış: 5,000 ₺\n" +
                "• Başvuru onaylandı\n" +
                "• Mesaj: Admin'den",
                {
                    title: "Bildirimler"
                }
            );
        },

        onSettings: function () {
            MessageToast.show("⚙️ Ayarlar sayfası yakında aktif olacak!");
        },

        onHelp: function () {
            MessageBox.information(
                "Yardım ve destek için:\n\n" +
                "📧 Email: destek@edusupport.com\n" +
                "📞 Tel: 0850 123 45 67\n" +
                "🌐 Web: www.edusupport.com/yardim",
                {
                    title: "Yardım"
                }
            );
        },

        onUserMenuPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oMenu = this.byId("userMenu");
            
            if (oMenu) {
                oMenu.openBy(oButton);
            }
        },

        onLogout: function () {
            MessageBox.confirm(
                "Çıkış yapmak istediğinize emin misiniz?",
                {
                    title: "Çıkış Yap",
                    icon: MessageBox.Icon.WARNING,
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.YES) {
                            this._performLogout();
                        }
                    }.bind(this)
                }
            );
        },

        _performLogout: function () {
            localStorage.removeItem("authToken");
            localStorage.removeItem("userData");

            var oAppData = this.getOwnerComponent().getModel("appData");
            oAppData.setProperty("/isAuthenticated", false);
            oAppData.setProperty("/currentUser", null);
            oAppData.setProperty("/authToken", null);

            MessageToast.show("✅ Çıkış yapıldı! Görüşmek üzere.");

            setTimeout(function() {
                this.getOwnerComponent().getRouter().navTo("home");
            }.bind(this), 800);
        },

        _getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        _getModel: function (sName) {
            return this.getView().getModel(sName);
        }
    });
});