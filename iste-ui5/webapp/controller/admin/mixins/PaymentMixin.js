sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (MessageBox, MessageToast, Filter, FilterOperator) {
    "use strict";

    /**
     * PaymentMixin
     * Kapsam: Ödeme listeleme, ekleme, silme, filtreleme
     */
    return {

        // ─────────────────────────────────────────────────────────────
        // VERİ YÜKLEME
        // ─────────────────────────────────────────────────────────────

        _loadPayments: function () {
            var that   = this;
            var oModel = this.getModel("dashboardData");

            Promise.all([
                this._apiCall("GET", "/payments"),
                this._apiCall("GET", "/payments/stats")
            ]).then(function (results) {

                if (results[0].success) {
                    var aPayments = results[0].payments.map(function (p) {
                        if (p.payment_date) {
                            p.payment_date = new Date(p.payment_date).toLocaleDateString("tr-TR");
                        }
                        if (p.due_date) {
                            p.due_date = new Date(p.due_date).toLocaleDateString("tr-TR");
                        }
                        return p;
                    });
                    oModel.setProperty("/payments", aPayments);
                }

                if (results[1].success) {
                    oModel.setProperty("/paymentStats", results[1].stats);
                }

            }).catch(function () {
                MessageToast.show("Ödemeler yüklenirken hata oluştu.");
            });
        },

        // ─────────────────────────────────────────────────────────────
        // FİLTRELEME
        // ─────────────────────────────────────────────────────────────

        onFilterPayments: function () {
            var sStatus  = this.byId("paymentFilterStatus")
                ? this.byId("paymentFilterStatus").getSelectedKey() : "";
            var oBinding = this.byId("paymentsTable")
                ? this.byId("paymentsTable").getBinding("items") : null;
            if (!oBinding) return;

            var aFilters = [];
            if (sStatus) aFilters.push(new Filter("status", FilterOperator.EQ, sStatus));
            oBinding.filter(aFilters);
        },

        // ─────────────────────────────────────────────────────────────
        // ÖDEME EKLEME
        // ─────────────────────────────────────────────────────────────

        onAddPayment: function () {
            this._openDialog(
                "_oPaymentDialog",
                "edusupport.platform.view.fragments.PaymentAddDialog",
                "paymentModel",
                {
                    user_id:        null,
                    payment_type:   "aidat",
                    amount:         500,
                    status:         "odendi",
                    payment_date:   "",
                    due_date:       "",
                    payment_method: "",
                    notes:          ""
                }
            );
        },

        onSavePayment: function () {
            var that     = this;
            var oData    = this._oPaymentDialog.getModel("paymentModel").getData();

            var nUserId  = this.byId("paymentUserId")  ? this.byId("paymentUserId").getSelectedKey()  : oData.user_id;
            var sType    = this.byId("paymentType")    ? this.byId("paymentType").getSelectedKey()    : oData.payment_type;
            var nAmount  = this.byId("paymentAmount")  ? this.byId("paymentAmount").getValue()        : oData.amount;
            var sStatus  = this.byId("paymentStatus")  ? this.byId("paymentStatus").getSelectedKey()  : oData.status;
            var sDate    = this.byId("paymentDate")    ? this.byId("paymentDate").getValue()           : oData.payment_date;
            var sDueDate = this.byId("paymentDueDate") ? this.byId("paymentDueDate").getValue()        : oData.due_date;
            var sMethod  = this.byId("paymentMethod")  ? this.byId("paymentMethod").getSelectedKey()  : oData.payment_method;
            var sNotes   = this.byId("paymentNotes")   ? this.byId("paymentNotes").getValue()          : oData.notes;

            if (!nUserId || !sType || !nAmount) {
                MessageBox.error("Üye, ödeme tipi ve tutar zorunludur!");
                return;
            }

            this._oPaymentDialog.setBusy(true);

            this._apiCall("POST", "/payments", {
                user_id:        nUserId,
                payment_type:   sType,
                amount:         nAmount,
                status:         sStatus,
                payment_date:   sDate,
                due_date:       sDueDate,
                payment_method: sMethod,
                notes:          sNotes
            }).then(function (data) {
                that._oPaymentDialog.setBusy(false);
                if (data.success) {
                    that._oPaymentDialog.close();
                    that._loadPayments();
                    MessageToast.show("Ödeme kaydedildi!");
                    setTimeout(function () { that._loadActivities(); }, 500);
                } else {
                    MessageBox.error(data.message || "Kayıt başarısız!");
                }
            }).catch(function () {
                that._oPaymentDialog.setBusy(false);
                MessageBox.error("Sunucuya bağlanılamadı!");
            });
        },

        onClosePaymentDialog: function () {
            if (this._oPaymentDialog) this._oPaymentDialog.close();
        },

        // ─────────────────────────────────────────────────────────────
        // ÖDEME SİLME
        // ─────────────────────────────────────────────────────────────

        onDeletePayment: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent()
                              .getBindingContext("dashboardData");
            var oPayment = oContext.getObject();
            var that     = this;

            MessageBox.confirm(
                oPayment.first_name + " " + oPayment.last_name +
                " için " + oPayment.amount + " ₺ kaydını silmek istediğinize emin misiniz?",
                {
                    title: "Ödeme Sil",
                    onClose: function (oAction) {
                        if (oAction !== MessageBox.Action.OK) return;

                        that._apiCall("DELETE", "/payments/" + oPayment.id)
                            .then(function (data) {
                                if (data.success) {
                                    that._loadPayments();
                                    MessageToast.show("Ödeme silindi.");
                                } else {
                                    MessageBox.error(data.message || "Silme başarısız!");
                                }
                            });
                    }
                }
            );
        }
    };
});
