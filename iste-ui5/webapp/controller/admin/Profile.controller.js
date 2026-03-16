sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, MessageBox, MessageToast, History, Fragment) {
    "use strict";

    const API_BASE = "http://localhost:3000/api";

    return Controller.extend("edusupport.platform.controller.admin.Profile", {

        onInit: function () {
            var oProfileModel = new JSONModel({
                full_name: "", first_name: "", last_name: "",
                email: "", phone: "", role: "", role_display: "",
                avatar: "", initials: "", created_at: "", updated_at: "",
                stats: {
                    loginCount: 0, lastLogin: "-",
                    approvedCount: 0, addedMembers: 0, activeDays: 0
                },
                donations: [],
                events: [],
                recentActivities: [],
                activeSessions: [
                    {
                        device: "Chrome - Windows",
                        deviceIcon: "sap-icon://laptop",
                        location: "Türkiye",
                        lastActive: "Şu anda aktif",
                        status: "Mevcut Oturum",
                        isCurrent: true
                    }
                ]
            });
            this.getView().setModel(oProfileModel, "profileData");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("profile").attachPatternMatched(this._onRouteMatched, this);
        },

        // ── Token & Header Helpers ──────────────────────────────────────

        _getToken: function () {
            var sToken = "";
            var oAppData = this.getOwnerComponent().getModel("appData");
            if (oAppData) sToken = oAppData.getProperty("/authToken");
            if (!sToken)  sToken = localStorage.getItem("authToken");
            if (!sToken) {
                MessageBox.error("Oturum süresi dolmuş. Tekrar giriş yapın.");
                this.getOwnerComponent().getRouter().navTo("login");
            }
            return sToken;
        },

        _authHeaders: function () {
            return {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this._getToken()
            };
        },

        _initials: function (oUser) {
            if (oUser.first_name && oUser.last_name)
                return oUser.first_name.charAt(0).toUpperCase() + oUser.last_name.charAt(0).toUpperCase();
            if (oUser.full_name) {
                var p = oUser.full_name.split(" ");
                return p[0].charAt(0).toUpperCase() + (p[1] ? p[1].charAt(0).toUpperCase() : "");
            }
            return "?";
        },

        // ── Route Matched ───────────────────────────────────────────────

        _onRouteMatched: function () {
            this._loadProfileData();
            this._loadStats();
            this._loadDonations();
            this._loadEvents();
        },

        // ── Veri Yükleme ────────────────────────────────────────────────

        _loadProfileData: function () {
            var that = this;
            fetch(API_BASE + "/profile", { headers: this._authHeaders() })
            .then(function (r) {
                if (r.status === 401) { that._handleUnauthorized(); return null; }
                return r.json();
            })
            .then(function (oRes) {
                if (!oRes || !oRes.success) {
                    MessageToast.show(oRes ? oRes.message : "Profil yüklenemedi.");
                    return;
                }
                var d = oRes.data;
                var m = that.getView().getModel("profileData");

                // Avatar URL'yi tam yap
                var sAvatar = "";
                if (d.avatar_url) {
                    sAvatar = d.avatar_url.startsWith("http")
                        ? d.avatar_url
                        : "http://localhost:3000" + d.avatar_url;
                }

                m.setProperty("/full_name",    d.full_name    || (d.first_name + " " + d.last_name).trim());
                m.setProperty("/first_name",   d.first_name   || "");
                m.setProperty("/last_name",    d.last_name    || "");
                m.setProperty("/email",        d.email        || "");
                m.setProperty("/phone",        d.phone        || "-");
                m.setProperty("/role",         d.user_type    || d.role || "");
                m.setProperty("/role_display", d.role_display || "Üye");
                m.setProperty("/avatar",       sAvatar);
                m.setProperty("/initials",     that._initials(d));
                m.setProperty("/created_at",   d.created_at   || "");
                m.setProperty("/updated_at",   d.updated_at   || "");

                // appData + localStorage güncelle — sayfa yenilenince kaybolmasın
                that._persistAvatar(sAvatar, that._initials(d));
            })
            .catch(function (err) {
                MessageToast.show("Profil yüklenemedi: " + err.message);
            });
        },

        _loadStats: function () {
            var that = this;
            fetch(API_BASE + "/profile/stats", { headers: this._authHeaders() })
            .then(function (r) { return r.json(); })
            .then(function (oRes) {
                if (oRes.success) {
                    that.getView().getModel("profileData").setProperty("/stats", oRes.stats);
                }
            })
            .catch(function () {});
        },

        _loadDonations: function () {
            var that = this;
            fetch(API_BASE + "/profile/donations", { headers: this._authHeaders() })
            .then(function (r) { return r.json(); })
            .then(function (oRes) {
                if (oRes.success) {
                    that.getView().getModel("profileData").setProperty("/donations", oRes.donations);
                }
            })
            .catch(function () {});
        },

        _loadEvents: function () {
            var that = this;
            fetch(API_BASE + "/profile/events", { headers: this._authHeaders() })
            .then(function (r) { return r.json(); })
            .then(function (oRes) {
                if (oRes.success) {
                    that.getView().getModel("profileData").setProperty("/events", oRes.events);
                }
            })
            .catch(function () {});
        },

        // ── 401 Handler ─────────────────────────────────────────────────

        _handleUnauthorized: function () {
            localStorage.removeItem("authToken");
            localStorage.removeItem("userData");
            var oAppData = this.getOwnerComponent().getModel("appData");
            if (oAppData) {
                oAppData.setProperty("/isAuthenticated", false);
                oAppData.setProperty("/authToken", null);
                oAppData.setProperty("/currentUser", null);
            }
            MessageBox.warning("Oturum süreniz doldu. Lütfen tekrar giriş yapın.", {
                onClose: function () {
                    this.getOwnerComponent().getRouter().navTo("login");
                }.bind(this)
            });
        },

        // ── Navigasyon ──────────────────────────────────────────────────

        onNavBack: function () {
            var sPrev = History.getInstance().getPreviousHash();
            if (sPrev !== undefined) window.history.go(-1);
            else this.getOwnerComponent().getRouter().navTo("adminDashboard", {}, true);
        },

        // ── Edit Dialog ─────────────────────────────────────────────────

        onOpenEditDialog: function () {
            var oView  = this.getView();
            var m      = oView.getModel("profileData");
            var sPhone = m.getProperty("/phone");

            oView.byId("editFirstName").setValue(m.getProperty("/first_name"));
            oView.byId("editLastName").setValue(m.getProperty("/last_name"));
            oView.byId("editPhone").setValue(sPhone === "-" ? "" : sPhone);

            oView.byId("currentPassword").setValue("");
            oView.byId("newPassword").setValue("");
            oView.byId("confirmPassword").setValue("");

            oView.byId("editTabBar").setSelectedKey("");
            oView.byId("editProfileDialog").open();
        },

        onCloseEditDialog: function () {
            this.getView().byId("editProfileDialog").close();
        },

        onSaveEditDialog: function () {
            var oView    = this.getView();
            var oItems   = oView.byId("editTabBar").getItems();
            var sCurPass = oView.byId("currentPassword").getValue();
            var sNewPass = oView.byId("newPassword").getValue();
            var sConf    = oView.byId("confirmPassword").getValue();

            if (sCurPass || sNewPass || sConf) {
                this._savePassword(sCurPass, sNewPass, sConf);
            } else {
                this._saveProfile();
            }
        },

        _saveProfile: function () {
            var oView  = this.getView();
            var sFirst = oView.byId("editFirstName").getValue().trim();
            var sLast  = oView.byId("editLastName").getValue().trim();
            var sPhone = oView.byId("editPhone").getValue().trim();
            var that   = this;

            if (!sFirst || !sLast) {
                MessageToast.show("Ad ve soyad zorunludur.");
                return;
            }

            fetch(API_BASE + "/profile", {
                method: "PUT",
                headers: this._authHeaders(),
                body: JSON.stringify({ first_name: sFirst, last_name: sLast, phone: sPhone })
            })
            .then(function (r) { return r.json(); })
            .then(function (oRes) {
                if (oRes.success) {
                    var m = oView.getModel("profileData");
                    m.setProperty("/first_name", sFirst);
                    m.setProperty("/last_name",  sLast);
                    m.setProperty("/full_name",  sFirst + " " + sLast);
                    m.setProperty("/phone",      sPhone || "-");

                    var oAppData = that.getOwnerComponent().getModel("appData");
                    var oUser    = oAppData.getProperty("/currentUser");
                    if (oUser) {
                        oUser.first_name = sFirst;
                        oUser.last_name  = sLast;
                        oAppData.setProperty("/currentUser", oUser);
                        localStorage.setItem("userData", JSON.stringify(oUser));
                    }

                    oView.byId("editProfileDialog").close();
                    MessageToast.show("Profil güncellendi ✓");
                } else {
                    MessageBox.error(oRes.message || "Güncelleme başarısız.");
                }
            })
            .catch(function (err) { MessageBox.error(err.message); });
        },

        _savePassword: function (sCurPass, sNewPass, sConf) {
            var oView = this.getView();

            if (!sCurPass || !sNewPass || !sConf) {
                MessageToast.show("Tüm şifre alanları zorunludur.");
                return;
            }
            if (sNewPass.length < 6) {
                MessageToast.show("Yeni şifre en az 6 karakter olmalıdır.");
                return;
            }
            if (sNewPass !== sConf) {
                MessageToast.show("Yeni şifreler eşleşmiyor.");
                return;
            }

            fetch(API_BASE + "/profile/password", {
                method: "PUT",
                headers: this._authHeaders(),
                body: JSON.stringify({ currentPassword: sCurPass, newPassword: sNewPass })
            })
            .then(function (r) { return r.json(); })
            .then(function (oRes) {
                if (oRes.success) {
                    oView.byId("editProfileDialog").close();
                    MessageToast.show("Şifre başarıyla değiştirildi ✓");
                } else {
                    MessageBox.error(oRes.message || "Şifre değiştirilemedi.");
                }
            })
            .catch(function (err) { MessageBox.error(err.message); });
        },

        // ── Avatar Yükleme ──────────────────────────────────────────────

        onChangeAvatar: function () {
            var that   = this;
            var oInput = document.createElement("input");
            oInput.type   = "file";
            oInput.accept = "image/jpeg,image/png,image/webp";

            oInput.onchange = function (e) {
                var oFile = e.target.files[0];
                if (!oFile) return;

                if (oFile.size > 5 * 1024 * 1024) {
                    MessageToast.show("Dosya boyutu 5MB'dan küçük olmalıdır.");
                    return;
                }

                MessageToast.show("Fotoğraf yükleniyor...");

                var oFormData = new FormData();
                oFormData.append("avatar", oFile);

                fetch(API_BASE + "/profile/avatar", {
                    method: "POST",
                    headers: { "Authorization": "Bearer " + localStorage.getItem("authToken") },
                    body: oFormData
                })
                .then(function (r) {
                    if (!r.ok) {
                        return r.json().then(function (e) {
                            throw new Error(e.message || "Sunucu hatası: " + r.status);
                        }).catch(function () {
                            throw new Error("Sunucu hatası: " + r.status);
                        });
                    }
                    return r.json();
                })
                .then(function (oRes) {
                    if (oRes.success) {
                        var sUrl = oRes.avatarUrl.startsWith("http")
                            ? oRes.avatarUrl
                            : "http://localhost:3000" + oRes.avatarUrl;

                        // 1. Profil sayfasındaki avatar
                        that.getView().getModel("profileData").setProperty("/avatar", sUrl);

                        // 2. appData + localStorage — kalıcı sakla
                        var sInitials = that.getView().getModel("profileData").getProperty("/initials");
                        that._persistAvatar(sUrl, sInitials);

                        MessageToast.show("Fotoğraf güncellendi ✓");
                    } else {
                        MessageBox.error(oRes.message || "Fotoğraf yüklenemedi.");
                    }
                })
                .catch(function (err) {
                    MessageBox.error("Fotoğraf yüklenemedi:\n" + err.message);
                });
            };

            oInput.click();
        },

        // ── Avatar Kalıcılığı — appData + localStorage ──────────────────

        _persistAvatar: function (sAvatarUrl, sInitials) {
            var oAppData = this.getOwnerComponent().getModel("appData");
            if (oAppData) {
                var oUser = oAppData.getProperty("/currentUser") || {};
                oUser.avatar_url = sAvatarUrl;
                if (sInitials) oUser.initials = sInitials;
                oAppData.setProperty("/currentUser",            oUser);
                oAppData.setProperty("/currentUser/avatar_url", sAvatarUrl);
                if (sInitials) {
                    oAppData.setProperty("/currentUser/initials", sInitials);
                }
            }

            try {
                var stored = JSON.parse(localStorage.getItem("userData") || "{}");
                stored.avatar_url = sAvatarUrl;
                if (sInitials) stored.initials = sInitials;
                localStorage.setItem("userData", JSON.stringify(stored));
            } catch (e) {
                console.warn("localStorage yazılamadı:", e);
            }
        },

        // ── Oturum Sonlandır ────────────────────────────────────────────

        onTerminateSession: function (oEvent) {
            var oCtx     = oEvent.getSource().getParent().getParent().getBindingContext("profileData");
            var oSession = oCtx.getObject();
            MessageBox.confirm(
                oSession.device + " — " + oSession.location + "\n\nBu oturumu sonlandırmak istiyor musunuz?",
                {
                    title: "Oturumu Sonlandır",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK)
                            MessageToast.show("Oturum sonlandırıldı.");
                    }
                }
            );
        },

        // ── Logout ──────────────────────────────────────────────────────

        onLogout: function () {
            var that = this;
            MessageBox.confirm("Çıkış yapmak istediğinize emin misiniz?", {
                title: "Çıkış Yap",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        localStorage.removeItem("authToken");
                        localStorage.removeItem("userData");
                        var oAppData = that.getOwnerComponent().getModel("appData");
                        oAppData.setProperty("/isAuthenticated", false);
                        oAppData.setProperty("/authToken", null);
                        oAppData.setProperty("/currentUser", null);
                        MessageToast.show("Çıkış yapıldı.");
                        that.getOwnerComponent().getRouter().navTo("home");
                    }
                }
            });
        },

        // ── Placeholder'lar ─────────────────────────────────────────────

        onChangeEmail: function () {
            MessageBox.information("Email değiştirme özelliği yakında aktif olacak.");
        },

        onNotificationSettings: function () {
            MessageToast.show("Bildirim ayarları sayfası açılıyor...");
        },

        onViewSessions: function () {
            MessageToast.show("Tüm oturum geçmişi görüntüleniyor...");
        }
    });
});