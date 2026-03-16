sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("edusupport.platform.controller.public.About", {

        onInit: function () {
            var that = this;

            this.getOwnerComponent().getRouter()
                .getRoute("about")
                .attachPatternMatched(this._onRouteMatched, this);

            // Global nav fonksiyonları (core:HTML içinden erişim için)
            window._aboutNavBack = function () {
                that.getOwnerComponent().getRouter().navTo("home");
            };
            window._aboutNavDonate = function () {
                that.getOwnerComponent().getRouter().navTo("donate");
            };
            // YENİ — fragment dialog açıyor
            window._aboutNavVolunteer = function () {
                var oView = that.getView();
                if (!that._pVolunteerDialog) {
                    that._pVolunteerDialog = sap.ui.core.Fragment.load({
                        id: oView.getId(),
                        name: "edusupport.platform.view.fragments.VolunteerDialog",
                        controller: that
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }
                that._pVolunteerDialog.then(function (oDialog) {
                    oView.byId("volFirstName").setValue("");
                    oView.byId("volLastName").setValue("");
                    oView.byId("volEmail").setValue("");
                    oView.byId("volPhone").setValue("");
                    oView.byId("volArea").setSelectedKey("");
                    oView.byId("volReason").setValue("");
                    oView.byId("volunteerError").setVisible(false);
                    oView.byId("volReasonCount").setText("0 / 500");
                    oView.byId("volReason").attachLiveChange(function (oEvent) {
                        oView.byId("volReasonCount").setText(oEvent.getParameter("value").length + " / 500");
                    });
                    oDialog.open();
                });
            };
        },
        onVolunteerSubmit: function () {
            var oView   = this.getView();
            var sFirst  = oView.byId("volFirstName").getValue().trim();
            var sLast   = oView.byId("volLastName").getValue().trim();
            var sEmail  = oView.byId("volEmail").getValue().trim();
            var sPhone  = oView.byId("volPhone").getValue().trim();
            var sArea   = oView.byId("volArea").getSelectedKey();
            var sReason = oView.byId("volReason").getValue().trim();
            var oError  = oView.byId("volunteerError");

            if (!sFirst || !sLast)                                       { oError.setText("Ad ve soyad zorunludur!");           oError.setVisible(true); return; }
            if (!sEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail)) { oError.setText("Geçerli bir e-posta adresi girin!"); oError.setVisible(true); return; }
            if (!sPhone || sPhone.length < 10)                           { oError.setText("Geçerli bir telefon numarası girin!"); oError.setVisible(true); return; }
            if (!sArea)                                                  { oError.setText("Lütfen bir alan seçin!");            oError.setVisible(true); return; }
            if (!sReason || sReason.length < 20)                         { oError.setText("Lütfen en az 20 karakter yazın!");   oError.setVisible(true); return; }

            oError.setVisible(false);
            var oBtn = oView.byId("volSubmitBtn");
            oBtn.setEnabled(false);
            oBtn.setText("Gönderiliyor...");

            var that = this;
            fetch("http://localhost:3000/api/volunteers/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    first_name: sFirst, last_name: sLast,
                    email: sEmail, phone: sPhone,
                    area: sArea, reason: sReason
                })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                oBtn.setEnabled(true);
                oBtn.setText("Başvuru Gönder");
                if (data.success) {
                    that._pVolunteerDialog.then(function (d) { d.close(); });
                    sap.m.MessageBox.success(
                        "Başvurunuz alındı! 🎉\n\nYönetici onayından sonra sizinle iletişime geçilecektir.",
                        { title: "Başvuru Başarılı", actions: [sap.m.MessageBox.Action.OK] }
                    );
                } else {
                    oError.setText(data.message || "Başvuru gönderilemedi!");
                    oError.setVisible(true);
                }
            })
            .catch(function () {
                oBtn.setEnabled(true);
                oBtn.setText("Başvuru Gönder");
                oError.setText("Sunucuya bağlanılamadı!");
                oError.setVisible(true);
            });
        },

        onCloseVolunteerDialog: function () {
            if (this._pVolunteerDialog) {
                this._pVolunteerDialog.then(function (d) { d.close(); });
            }
        },

        onAreaSelectChange: function (oEvent) {
            var sKey  = oEvent.getParameter("selectedItem").getKey();
            var oView = this.getView();
            var bDiger = sKey === "diger";
            oView.byId("otherAreaLabel").setVisible(bDiger);
            oView.byId("digerAciklama").setVisible(bDiger);
        },
        _onRouteMatched: function () {
            // Sayfa açılınca en üste scroll
            window.scrollTo({ top: 0, behavior: "smooth" });
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("home");
        }
    });
});