sap.ui.define([], function () {
    "use strict";

    return {

        _AREA_LABELS: {
            egitim:       "Eğitim Desteği",
            etkinlik:     "Etkinlik Organizasyonu",
            sosyal_medya: "Sosyal Medya ve İletişim",
            bagis:        "Bağış ve Kaynak Geliştirme",
            diger:        "Diğer"
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

        onVolunteerDetail: function(oEvent) {

            var oSource = oEvent.getSource();
            var oContext = oSource.getBindingContext();

            if (!oContext) {
                console.error("Binding context yok");
                return;
            }

            var oObject = oContext.getObject();
            console.log(oObject);
        }

    };
});