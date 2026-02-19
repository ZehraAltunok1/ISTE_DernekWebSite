sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History"
], function (Controller, JSONModel, MessageBox, MessageToast, History) {
    "use strict";

    return Controller.extend("edusupport.platform.controller.admin.Profile", {

        onInit: function () {
            console.log("👤 Profile Controller initialized");
            
            // Profile Data Model
            var oProfileModel = new JSONModel({
                full_name: "",
                first_name: "",
                last_name: "",
                username: "",
                email: "",
                phone: "",
                role: "admin",
                role_display: "Yönetici",
                avatar: "",
                initials: "",
                created_at: "",
                updated_at: "",
                stats: {
                    loginCount: 0,
                    lastLogin: "",
                    approvedCount: 0,
                    addedMembers: 0,
                    activeDays: 0
                },
                recentActivities: [],
                activeSessions: []
            });
            
            this.getView().setModel(oProfileModel, "profileData");
            
            // Router'a bağlan
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("profile").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            console.log("👤 Profile route matched");
            this._loadProfileData();
        },

        _loadProfileData: function () {
            var oAppData = this.getOwnerComponent().getModel("appData");
            var oUser = oAppData.getProperty("/currentUser");
            
            if (!oUser) {
                MessageBox.error("Kullanıcı bilgisi bulunamadı!", {
                    onClose: () => {
                        this.getOwnerComponent().getRouter().navTo("home");
                    }
                });
                return;
            }
            
            console.log("📊 Loading profile data for:", oUser);
            
            // Initials oluştur
            var sInitials = "";
            if (oUser.first_name && oUser.last_name) {
                sInitials = oUser.first_name.charAt(0) + oUser.last_name.charAt(0);
            } else if (oUser.full_name) {
                var aParts = oUser.full_name.split(" ");
                sInitials = aParts[0].charAt(0) + (aParts[1] ? aParts[1].charAt(0) : "");
            }
            
            var oProfileModel = this.getView().getModel("profileData");
            
            // Temel bilgiler
            oProfileModel.setProperty("/full_name", oUser.full_name || (oUser.first_name + " " + oUser.last_name));
            oProfileModel.setProperty("/first_name", oUser.first_name || "");
            oProfileModel.setProperty("/last_name", oUser.last_name || "");
            oProfileModel.setProperty("/username", oUser.username || "");
            oProfileModel.setProperty("/email", oUser.email || "");
            oProfileModel.setProperty("/phone", oUser.phone || "-");
            oProfileModel.setProperty("/role", oUser.role || oUser.type);
            oProfileModel.setProperty("/role_display", this._getRoleDisplay(oUser.role || oUser.type));
            oProfileModel.setProperty("/initials", sInitials);
            oProfileModel.setProperty("/created_at", oUser.created_at || new Date().toLocaleDateString('tr-TR'));
            oProfileModel.setProperty("/updated_at", oUser.updated_at || new Date().toLocaleDateString('tr-TR'));
            
            // API'den veya mock data ile diğer bilgileri yükle
            this._loadStatistics();
            this._loadRecentActivities();
            this._loadActiveSessions();
        },

        _getRoleDisplay: function(sRole) {
            var oRoles = {
                "admin": "Yönetici",
                "super_admin": "Süper Yönetici",
                "moderator": "Moderatör",
                "donor": "Bağışçı",
                "student": "Öğrenci",
                "volunteer": "Gönüllü"
            };
            return oRoles[sRole] || "Kullanıcı";
        },

        _loadStatistics: function() {
            // Gerçek uygulamada API'den gelecek
            var oProfileModel = this.getView().getModel("profileData");
            
            oProfileModel.setProperty("/stats", {
                loginCount: 127,
                lastLogin: new Date().toLocaleString('tr-TR'),
                approvedCount: 23,
                addedMembers: 15,
                activeDays: 18
            });
        },

        _loadRecentActivities: function() {
            // Mock data
            var aActivities = [
                {
                    icon: "sap-icon://accept",
                    color: "#10B981",
                    action: "Bağış Onaylandı",
                    details: "5,000 ₺ - Ahmet Yılmaz",
                    timestamp: "2 saat önce",
                    state: "Success"
                },
                {
                    icon: "sap-icon://add",
                    color: "#0070F2",
                    action: "Üye Eklendi",
                    details: "Ayşe Demir - Öğrenci",
                    timestamp: "5 saat önce",
                    state: "Information"
                },
                {
                    icon: "sap-icon://edit",
                    color: "#F59E0B",
                    action: "Profil Güncellendi",
                    details: "Telefon numarası değiştirildi",
                    timestamp: "1 gün önce",
                    state: "Warning"
                },
                {
                    icon: "sap-icon://email",
                    color: "#8B5CF6",
                    action: "Email Gönderildi",
                    details: "Burs bilgilendirme - 25 alıcı",
                    timestamp: "2 gün önce",
                    state: "Information"
                }
            ];
            
            this.getView().getModel("profileData").setProperty("/recentActivities", aActivities);
        },

        _loadActiveSessions: function() {
            // Mock data
            var aSessions = [
                {
                    device: "Chrome - Windows 10",
                    deviceIcon: "sap-icon://laptop",
                    location: "İstanbul, Türkiye",
                    lastActive: "Şu anda aktif",
                    status: "Mevcut Oturum",
                    isCurrent: true
                },
                {
                    device: "Safari - iPhone 13",
                    deviceIcon: "sap-icon://iphone",
                    location: "İstanbul, Türkiye",
                    lastActive: "2 saat önce",
                    status: "Aktif",
                    isCurrent: false
                }
            ];
            
            this.getView().getModel("profileData").setProperty("/activeSessions", aSessions);
        },
        // NAVIGATION
        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("adminDashboard", {}, true);
            }
        },
        // PROFILE ACTIONS

        onEditProfile: function() {
            MessageToast.show("Profil düzenleme sayfası açılıyor...");
         
        },

        onChangeAvatar: function() {
            MessageToast.show("Fotoğraf değiştirme özelliği yakında aktif olacak!");
           
        },

        onChangePassword: function() {
            MessageBox.information("Şifre değiştirme formu yakında aktif olacak!");
            
        },

        onChangeEmail: function() {
            MessageBox.information("Email değiştirme formu yakında aktif olacak!");
     
        },

        onSetup2FA: function() {
            MessageBox.information("İki faktörlü doğrulama kurulumu yakında aktif olacak!");
           
        },

        onNotificationSettings: function() {
            MessageToast.show("Bildirim ayarları sayfası açılıyor...");
            
        },

        onViewSessions: function() {
            MessageToast.show("Oturum geçmişi görüntüleniyor...");
     
        },

        onTerminateSession: function(oEvent) {
            var oItem = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext("profileData");
            var oSession = oContext.getObject();
            
            MessageBox.confirm(
                "Bu oturumu sonlandırmak istediğinize emin misiniz?\n\n" + 
                oSession.device + "\n" + 
                oSession.location,
                {
                    title: "Oturumu Sonlandır",
                    onClose: function(oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            MessageToast.show("Oturum sonlandırıldı!");
                            // TODO: API call to terminate session
                        }
                    }
                }
            );
        }
    });
});