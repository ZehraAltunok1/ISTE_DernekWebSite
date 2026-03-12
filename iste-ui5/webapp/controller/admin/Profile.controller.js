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
                    donationCount: 0, donationTotal: 0,
                    eventCount: 0, volunteerStatus: null
                },
                donations: [],
                events: [],
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

        // ── Token & Header Helpers ────────────────────────────────────────

        _getToken: function () {
            var sToken = "";
            var oAppData = this.getOwnerComponent().getModel("appData");
            if (oAppData) sToken = oAppData.getProperty("/authToken");
            if (!sToken)  sToken = localStorage.getItem("authToken");
            if (!sToken) {
                MessageBox.error("Oturum süresi dolmuş. Tekrar giriş yapın.");
                this.getOwnerComponent().getRouter().navTo("login");
                return "";
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

        // ── Route Matched ─────────────────────────────────────────────────

        _onRouteMatched: function () {
            this._loadProfileData();
            this._loadStats();
            this._loadDonations();
            this._loadEvents();
        },

        // ── Veri Yükleme ──────────────────────────────────────────────────

        _loadProfileData: function () {
            var that = this;
            fetch(API_BASE + "/profile", { headers: this._authHeaders() })
            .then(function (r) {
                if (r.status === 401) {
                    that._handleUnauthorized();
                    return null;
                }
                return r.json();
            })
            .then(function (oRes) {
                if (!oRes || !oRes.success) {
                    MessageToast.show(oRes ? oRes.message : "Profil yüklenemedi.");
                    return;
                }
                var d = oRes.data;
                var m = that.getView().getModel("profileData");
                m.setProperty("/full_name",    d.full_name    || "");
                m.setProperty("/first_name",   d.first_name   || "");
                m.setProperty("/last_name",    d.last_name    || "");
                m.setProperty("/email",        d.email        || "");
                m.setProperty("/phone",        d.phone        || "-");
                m.setProperty("/role",         d.user_type    || d.role || "");
                m.setProperty("/role_display", d.role_display || "Üye");
                m.setProperty("/avatar",       d.avatar_url   || "");
                m.setProperty("/initials",     that._initials(d));
                m.setProperty("/created_at",   d.created_at   || "");
                m.setProperty("/updated_at",   d.updated_at   || "");
                console.log("✅ Profil yüklendi:", d.full_name);
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

        // ── 401 Handler ───────────────────────────────────────────────────

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

        // ── Navigasyon ────────────────────────────────────────────────────

        onNavBack: function () {
            var sPrev = History.getInstance().getPreviousHash();
            if (sPrev !== undefined) window.history.go(-1);
            else this.getOwnerComponent().getRouter().navTo("adminDashboard", {}, true);
        },

        // ── Profil Düzenleme Dialog ───────────────────────────────────────

        onEditProfile: function () {
            var that = this;
            if (!this._oEditDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "edusupport.platform.view.fragments.ProfileEditDialog",
                    controller: this
                }).then(function (oDialog) {
                    that._oEditDialog = oDialog;
                    that.getView().addDependent(oDialog);
                    that._fillEditForm();
                    oDialog.open();
                });
            } else {
                this._fillEditForm();
                this._oEditDialog.open();
            }
        },

        _fillEditForm: function () {
            var m = this.getView().getModel("profileData");
            this.byId("editFirstName").setValue(m.getProperty("/first_name"));
            this.byId("editLastName").setValue(m.getProperty("/last_name"));
            var sPhone = m.getProperty("/phone");
            this.byId("editPhone").setValue(sPhone === "-" ? "" : sPhone);
        },

        onSaveProfileEdit: function () {
            var sFirst = this.byId("editFirstName").getValue().trim();
            var sLast  = this.byId("editLastName").getValue().trim();
            var sPhone = this.byId("editPhone").getValue().trim();

            if (!sFirst || !sLast) {
                MessageToast.show("Ad ve soyad zorunludur.");
                return;
            }

            var that = this;
            fetch(API_BASE + "/profile", {
                method: "PUT",
                headers: this._authHeaders(),
                body: JSON.stringify({ first_name: sFirst, last_name: sLast, phone: sPhone })
            })
            .then(function (r) { return r.json(); })
            .then(function (oRes) {
                if (oRes.success) {
                    MessageToast.show("Profil güncellendi ✓");
                    that._oEditDialog.close();
                    that._loadProfileData();

                    // appData'yı da güncelle
                    var oAppData = that.getOwnerComponent().getModel("appData");
                    var oUser = oAppData.getProperty("/currentUser");
                    if (oUser) {
                        oUser.first_name = sFirst;
                        oUser.last_name  = sLast;
                        oAppData.setProperty("/currentUser", oUser);
                        localStorage.setItem("userData", JSON.stringify(oUser));
                    }
                } else {
                    MessageBox.error(oRes.message || "Güncelleme başarısız.");
                }
            })
            .catch(function (err) { MessageBox.error(err.message); });
        },

        onCancelProfileEdit: function () {
            if (this._oEditDialog) this._oEditDialog.close();
        },

        // ── Şifre Değiştirme Dialog ───────────────────────────────────────

        onChangePassword: function () {
            var that = this;
            if (!this._oPassDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "edusupport.platform.view.fragments.PasswordChangeDialog",
                    controller: this
                }).then(function (oDialog) {
                    that._oPassDialog = oDialog;
                    that.getView().addDependent(oDialog);
                    that._clearPasswordForm();
                    oDialog.open();
                });
            } else {
                this._clearPasswordForm();
                this._oPassDialog.open();
            }
        },

        _clearPasswordForm: function () {
            this.byId("currentPassword").setValue("");
            this.byId("newPassword").setValue("");
            this.byId("confirmPassword").setValue("");
        },

        onSavePassword: function () {
            var sCurrent = this.byId("currentPassword").getValue();
            var sNew     = this.byId("newPassword").getValue();
            var sConfirm = this.byId("confirmPassword").getValue();

            if (!sCurrent || !sNew || !sConfirm) {
                MessageToast.show("Tüm alanlar zorunludur.");
                return;
            }
            if (sNew.length < 6) {
                MessageToast.show("Yeni şifre en az 6 karakter olmalıdır.");
                return;
            }
            if (sNew !== sConfirm) {
                MessageToast.show("Yeni şifreler eşleşmiyor.");
                return;
            }

            var that = this;
            fetch(API_BASE + "/profile/password", {
                method: "PUT",
                headers: this._authHeaders(),
                body: JSON.stringify({ currentPassword: sCurrent, newPassword: sNew })
            })
            .then(function (r) { return r.json(); })
            .then(function (oRes) {
                if (oRes.success) {
                    MessageToast.show("Şifre başarıyla değiştirildi ✓");
                    that._oPassDialog.close();
                } else {
                    MessageBox.error(oRes.message || "Şifre değiştirilemedi.");
                }
            })
            .catch(function (err) { MessageBox.error(err.message); });
        },

        onCancelPasswordChange: function () {
            if (this._oPassDialog) this._oPassDialog.close();
        },

        // ── Avatar Değiştirme ─────────────────────────────────────────────

        onChangeAvatar: function () {
            // Gizli file input oluştur ve tıkla
            var oInput = document.createElement("input");
            oInput.type = "file";
            oInput.accept = "image/jpeg,image/png,image/webp";
            oInput.onchange = function (e) {
                var oFile = e.target.files[0];
                if (!oFile) return;
                if (oFile.size > 5 * 1024 * 1024) {
                    MessageToast.show("Dosya boyutu 5MB'dan küçük olmalıdır.");
                    return;
                }
                var oFormData = new FormData();
                oFormData.append("avatar", oFile);

                fetch(API_BASE + "/profile/avatar", {
                    method: "POST",
                    headers: { "Authorization": "Bearer " + localStorage.getItem("authToken") },
                    body: oFormData
                })
                .then(function (r) { return r.json(); })
                .then(function (oRes) {
                    if (oRes.success) {
                        MessageToast.show("Fotoğraf güncellendi ✓");
                        var sUrl = "http://localhost:3000" + oRes.avatarUrl;
                        this.getView().getModel("profileData").setProperty("/avatar", sUrl);
                    } else {
                        MessageBox.error(oRes.message);
                    }
                }.bind(this))
                .catch(function () { MessageToast.show("Fotoğraf yüklenemedi."); });
            }.bind(this);
            oInput.click();
        },

        // ── Oturum Sonlandır ──────────────────────────────────────────────

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

        // ── Logout ────────────────────────────────────────────────────────

        onLogout: function () {
            MessageBox.confirm("Çıkış yapmak istediğinize emin misiniz?", {
                title: "Çıkış Yap",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        localStorage.removeItem("authToken");
                        localStorage.removeItem("userData");
                        var oAppData = this.getOwnerComponent().getModel("appData");
                        oAppData.setProperty("/isAuthenticated", false);
                        oAppData.setProperty("/authToken", null);
                        oAppData.setProperty("/currentUser", null);
                        MessageToast.show("Çıkış yapıldı.");
                        this.getOwnerComponent().getRouter().navTo("home");
                    }
                }.bind(this)
            });
        },

        // ── Placeholder'lar ───────────────────────────────────────────────

        onChangeEmail: function () {
            MessageBox.information("Email değiştirme özelliği yakında aktif olacak.");
        },
        onSetup2FA: function () {
            MessageBox.information("İki faktörlü doğrulama kurulumu yakında aktif olacak.");
        },
        onNotificationSettings: function () {
            MessageToast.show("Bildirim ayarları sayfası açılıyor...");
        },
        onViewSessions: function () {
            MessageToast.show("Tüm oturum geçmişi görüntüleniyor...");
        }
    });
});