sap.ui.define([
    "./BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (BaseController, MessageBox, MessageToast) {
    "use strict";

    var PROFILE_GROUP = "profile";
    var LIST_IDS = ["donationTable", "volunteerList", "adoptionList", "eventRegList"];

    return BaseController.extend("pg.site.controller.Account", {

        onInit: function () {
            this.getRouter().getRoute("account").attachPatternMatched(this._onRouteMatched, this);
            // Giriş/çıkış başka bir sayfadan (ör. üst menüden) yapılsa da haberimiz olsun
            this.getOwnerComponent().getEventBus().subscribe("session", "changed", this._onSessionChanged, this);
        },

        onExit: function () {
            this.getOwnerComponent().getEventBus().unsubscribe("session", "changed", this._onSessionChanged, this);
        },

        _onRouteMatched: function () {
            this._loadData();
        },

        _onSessionChanged: function () {
            this._loadData();
        },

        /** Oturum açıksa üye verisini getirir. İlk seferde binding'leri başlatır, sonra tazeler. */
        _loadData: function () {
            var oSession = this.getModel("session");
            if (!oSession.getProperty("/loggedIn")) {
                this.byId("profileBox").unbindElement("member");
                return;
            }

            LIST_IDS.forEach(function (sId) {
                var oControl = this.byId(sId);
                var oBinding = oControl.getBinding("items");
                if (oBinding.isSuspended()) {
                    oBinding.resume();
                } else {
                    oBinding.refresh();
                }
            }, this);

            // Profil: tek kayıt. Anahtar e-posta; tırnak içindeki ' karakteri OData'da '' olarak yazılır.
            var sKey = oSession.getProperty("/email").replace(/'/g, "''");
            this.byId("profileBox").bindElement({
                path: "/Profile('" + encodeURIComponent(sKey) + "')",
                model: "member",
                parameters: { $$updateGroupId: PROFILE_GROUP },
                events: {
                    // Her PATCH bitince: sunucu reddettiyse success=false (mesaj alanın altında görünür)
                    patchCompleted: function (oEvent) {
                        this._bPatchFailed = this._bPatchFailed || !oEvent.getParameter("success");
                    }.bind(this)
                }
            });
        },

        // ── Profil ──────────────────────────────────────────

        onSaveProfile: function () {
            var oModel = this.getModel("member");
            if (!oModel.hasPendingChanges(PROFILE_GROUP)) {
                MessageToast.show(this.getText("noChanges"));
                return;
            }
            var oView = this.getView();
            oView.setBusy(true);
            this._bPatchFailed = false;
            oModel.submitBatch(PROFILE_GROUP).then(function () {
                oView.setBusy(false);
                if (this._bPatchFailed) {
                    MessageBox.error(this.getText("profileSaveFailed"));
                    return;
                }
                MessageToast.show(this.getText("profileSaved"));
                // Menüdeki adı da güncelle
                var sName = this.byId("profileBox").getBindingContext("member").getProperty("displayName");
                this.getModel("session").setProperty("/displayName", sName);
            }.bind(this));
        },

        onResetProfile: function () {
            this.getModel("member").resetChanges(PROFILE_GROUP);
            // Reddedilmiş bir kaydın ekranda kalan değerlerini de sunucudaki haline döndür
            this.byId("profileBox").getElementBinding("member").refresh();
        },

        // ── Etkinliklerim ───────────────────────────────────

        onEventRegPress: function (oEvent) {
            var sId = oEvent.getSource().getBindingContext("member").getProperty("eventID");
            this.getRouter().navTo("eventDetail", { eventId: sId });
        },

        onAdoptionPress: function (oEvent) {
            var sId = oEvent.getSource().getBindingContext("member").getProperty("animalID");
            this.getRouter().navTo("animalDetail", { animalId: sId });
        },

        /** Bağlı (bound) action: MyEventRegistrations(ID)/MemberService.cancel */
        onCancelRegistration: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("member");
            var sTitle = oContext.getProperty("eventTitle");

            MessageBox.confirm(this.getText("cancelRegistrationConfirm", [sTitle]), {
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    var oAction = this.getModel("member").bindContext("MemberService.cancel(...)", oContext);
                    oAction.invoke()
                        .then(function () {
                            MessageToast.show(this.getText("registrationCancelled"));
                            this.byId("eventRegList").getBinding("items").refresh();
                            // Herkese açık etkinlik verisi (kontenjan) de değişti
                            this.getModel().refresh();
                        }.bind(this))
                        .catch(function (oError) {
                            MessageBox.error(oError.message);
                        });
                }.bind(this)
            });
        },

        onLogout: function () {
            this.getOwnerComponent().getSession().logout();
            MessageToast.show(this.getText("loggedOut"));
            this.getRouter().navTo("home");
        }
    });
});
