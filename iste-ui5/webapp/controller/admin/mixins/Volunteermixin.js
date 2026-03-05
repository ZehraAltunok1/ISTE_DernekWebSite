sap.ui.define([], function () {
    "use strict";

    return {

        _AREA_LABELS: {
            besleme:       "Sokak Hayvanlarını Besleme",
            barinak:       "Barınak Ziyareti ve Temizlik",
            sahiplendirme: "Sahiplendirme Etkinliği",
            tedavi:        "Tedavi ve İlaç Desteği",
           
        },
        onAreaSelectChange: function (oEvent) {
            var sSelectedKey = oEvent.getSource().getSelectedKey();
            var bIsOther = (sSelectedKey === "diger");
            
            // oView.byId yerine parent üzerinden bul
            var oSelect = oEvent.getSource();
            var oVBox   = oSelect.getParent();

            oVBox.getItems().forEach(function (oItem) {
                var sId = oItem.getId ? oItem.getId() : "";
                if (sId.indexOf("digerAciklama") > -1) {
                    oItem.setVisible(bIsOther);
                    if (!bIsOther && oItem.setValue) oItem.setValue("");
                }
                if (sId.indexOf("otherAreaLabel") > -1) {
                    oItem.setVisible(bIsOther);
                }
            });
        },

        onLoadVolunteers: function () {
            var that  = this;
            var oView = this.getView();

            // adminData modeli yoksa oluştur
            if (!oView.getModel("adminData")) {
                oView.setModel(
                    new sap.ui.model.json.JSONModel({ volunteers: [] }),
                    "adminData"
                );
            }
            var oModel = oView.getModel("adminData");

            var oFilter = oView.byId("volStatusFilter");
            var sKey    = oFilter ? oFilter.getSelectedKey() : "all";
            var sUrl    = "http://localhost:3000/api/volunteers" +
                          (sKey && sKey !== "all" ? "?status=" + sKey : "");

            fetch(sUrl, {
                headers: { "Authorization": "Bearer " + localStorage.getItem("authToken") }
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.success) return;

                var aList = (data.volunteers || []).map(function (v) {
                    v.area_label    = that._AREA_LABELS[v.area] || v.area;
                    v.created_at_tr = v.created_at
                        ? new Date(v.created_at).toLocaleDateString("tr-TR")
                        : "-";
                    v.status_label  = v.status === "approved" ? "Onaylı"
                                    : v.status === "rejected"  ? "Reddedildi"
                                    : "Bekliyor";
                    v.status_state  = v.status === "approved" ? "Success"
                                    : v.status === "rejected"  ? "Error"
                                    : "Warning";
                    return v;
                });

                oModel.setProperty("/volunteers", aList);

                // KPI güncelle
                var nPending  = aList.filter(function (v) { return v.status === "pending";  }).length;
                var nApproved = aList.filter(function (v) { return v.status === "approved"; }).length;

                var oPending  = oView.byId("volKpiPendingNum");
                var oApproved = oView.byId("volKpiApprovedNum");
                var oTotal    = oView.byId("volKpiTotalNum");

                if (oPending)  oPending.setText(nPending);
                if (oApproved) oApproved.setText(nApproved);
                if (oTotal)    oTotal.setText(aList.length);
            })
            .catch(function () {
                sap.m.MessageToast.show("Gönüllüler yüklenemedi!");
            });
        },

        onVolStatusFilter: function () {
            this.onLoadVolunteers();
        },

        onApproveVolunteer: function (oEvent) {
            var that     = this;
            var oContext = oEvent.getSource().getBindingContext("adminData");
            var oVol     = oContext.getObject();

            sap.m.MessageBox.confirm(
                oVol.first_name + " " + oVol.last_name + " adlı kişiyi onaylamak istiyor musunuz?",
                {
                    title:            "Gönüllü Onayla",
                    emphasizedAction: sap.m.MessageBox.Action.OK,
                    onClose: function (oAction) {
                        if (oAction !== sap.m.MessageBox.Action.OK) return;
                        that._updateVolunteerStatus(oVol.id, "approved");
                    }
                }
            );
        },

        onRejectVolunteer: function (oEvent) {
            var that     = this;
            var oContext = oEvent.getSource().getBindingContext("adminData");
            var oVol     = oContext.getObject();

            sap.m.MessageBox.confirm(
                oVol.first_name + " " + oVol.last_name + " adlı kişinin başvurusunu reddetmek istiyor musunuz?",
                {
                    title:            "Başvuruyu Reddet",
                    emphasizedAction: sap.m.MessageBox.Action.OK,
                    onClose: function (oAction) {
                        if (oAction !== sap.m.MessageBox.Action.OK) return;
                        that._updateVolunteerStatus(oVol.id, "rejected");
                    }
                }
            );
        },

        _updateVolunteerStatus: function (nId, sStatus) {
            var that = this;
            fetch("http://localhost:3000/api/volunteers/" + nId + "/status", {
                method:  "PATCH",
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("authToken")
                },
                body: JSON.stringify({ status: sStatus })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.success) {
                    sap.m.MessageToast.show(data.message);
                    that.onLoadVolunteers();
                } else {
                    sap.m.MessageBox.error(data.message || "İşlem başarısız!");
                }
            })
            .catch(function () {
                sap.m.MessageBox.error("Sunucuya bağlanılamadı!");
            });
        },

        onVolunteerDetail: function (oEvent) {
            var oSource  = oEvent.getSource();
            // Önce adminData'ya bak, yoksa default modele bak
            var oContext = oSource.getBindingContext("adminData") 
                        || oSource.getBindingContext();

            if (!oContext) {
                sap.m.MessageToast.show("Bağlam bulunamadı.");
                return;
            }

            var oObject = oContext.getObject();
            console.log("Gönüllü detayı:", oObject);
        },
        onShowReason: function (oEvent) {
        var oSource  = oEvent.getSource();
        var oContext = oSource.getBindingContext("adminData");
        var oVol     = oContext.getObject();

        if (!this._oReasonPopover) {
            this._oReasonPopover = new sap.m.Popover({
                title:        "Açıklama",
                placement:    "Auto",
                contentWidth: "320px",
                content: [
                    new sap.m.VBox({
                        class: "sapUiSmallMargin",
                        items: [
                            new sap.m.Text({ id: "reasonPopoverName", text: "" }),
                            new sap.m.Text({ id: "reasonPopoverText", text: "", wrapping: true })
                        ]
                    })
                ]
            });
            this.getView().addDependent(this._oReasonPopover);
        }

        sap.ui.getCore().byId("reasonPopoverName").setText(
            oVol.first_name + " " + oVol.last_name
        );
        sap.ui.getCore().byId("reasonPopoverText").setText(
            oVol.reason || "Açıklama girilmemiş."
        );

        this._oReasonPopover.openBy(oSource);
    },
        onDeleteVolunteer: function (oEvent) {
        var that     = this;
        var oContext = oEvent.getSource().getBindingContext("adminData");
        var oVol     = oContext.getObject();

        sap.m.MessageBox.confirm(
            oVol.first_name + " " + oVol.last_name + " adlı kişiyi silmek istiyor musunuz?",
            {
                title: "Gönüllü Sil",
                emphasizedAction: sap.m.MessageBox.Action.OK,
                onClose: function (oAction) {
                    if (oAction !== sap.m.MessageBox.Action.OK) return;

                    fetch("http://localhost:3000/api/volunteers/" + oVol.id, {
                        method: "DELETE",
                        headers: {
                            "Authorization": "Bearer " + localStorage.getItem("authToken")
                        }
                    })
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        if (data.success) {
                            sap.m.MessageToast.show("Gönüllü silindi.");
                            that.onLoadVolunteers();
                        } else {
                            sap.m.MessageBox.error("Silinemedi!");
                        }
                    })
                    .catch(function () {
                        sap.m.MessageBox.error("Sunucuya bağlanılamadı!");
                    });
                }
            }
        );
    },

    };
});