sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "pg/site/model/validation"
], function (BaseController, JSONModel, Filter, FilterOperator, Sorter, Fragment, MessageBox, MessageToast, validation) {
    "use strict";

    var PRESETS = ["50", "100", "250", "500"];

    return BaseController.extend("pg.site.controller.Donate", {

        onInit: function () {
            // "donate" modeli yalnızca formun durumunu tutar; bağışın kendisi sunucuda oluşur.
            this.setModel(new JSONModel(), "donate");
            this.getRouter().getRoute("donate").attachPatternMatched(this._onRouteMatched, this);
        },

        // ── Sayfa açılışı ───────────────────────────────────────

        _onRouteMatched: function (oEvent) {
            var oQuery = oEvent.getParameter("arguments")["?query"] || {};
            this._resetForm();
            this._loadCampaigns().then(function () {
                // ?kampanya=<ID> ile gelindiyse o kampanyayı seç
                var oModel = this.getModel("donate");
                var bExists = oModel.getProperty("/campaigns").some(function (c) {
                    return c.ID === oQuery.kampanya;
                });
                oModel.setProperty("/campaignId", bExists ? oQuery.kampanya : "");
                this.onCampaignChange();
            }.bind(this));
        },

        /** Özet adımında gösterilecek kampanya adını günceller. */
        onCampaignChange: function () {
            var oModel = this.getModel("donate");
            var sId = oModel.getProperty("/campaignId");
            var oCampaign = oModel.getProperty("/campaigns").find(function (c) {
                return c.ID === sId;
            });
            oModel.setProperty("/campaignTitle", oCampaign ? oCampaign.title : "");
        },

        _resetForm: function () {
            this.getModel("donate").setData({
                campaigns: this.getModel("donate").getProperty("/campaigns") || [],
                campaignId: "",
                preset: "100",
                amount: 100,
                amountState: "None",
                amountValid: true,
                donorName: "",
                donorEmail: "",
                nameState: "None",
                emailState: "None",
                donorValid: false,
                message: "",
                isAnonymous: false,
                method: "Card",
                busy: false
            });
            var oWizard = this.byId("wizard");
            oWizard.discardProgress(oWizard.getSteps()[0]);
        },

        /**
         * Seçim listesi için aktif kampanyaları getirir.
         * Kontrole bağlı olmayan bir liste binding'i ile veriyi kodda okumanın örneği (requestContexts).
         */
        _loadCampaigns: function () {
            var oBinding = this.getModel().bindList(
                "/Campaigns",
                null,
                [new Sorter("title")],
                [new Filter("status", FilterOperator.EQ, "Active")],
                { $select: "ID,title" }
            );
            return oBinding.requestContexts(0, 100).then(function (aContexts) {
                var aCampaigns = [{ ID: "", title: this.getText("generalDonation") }].concat(
                    aContexts.map(function (oContext) {
                        return oContext.getObject();
                    })
                );
                this.getModel("donate").setProperty("/campaigns", aCampaigns);
                oBinding.destroy();
            }.bind(this));
        },

        // ── 1. Adım: tutar ──────────────────────────────────────

        onPresetChange: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            if (sKey !== "custom") {
                this.getModel("donate").setProperty("/amount", Number(sKey));
            }
            this._validateAmount();
        },

        onAmountChange: function () {
            var oModel = this.getModel("donate");
            var sAmount = String(oModel.getProperty("/amount"));
            oModel.setProperty("/preset", PRESETS.indexOf(sAmount) >= 0 ? sAmount : "custom");
            this._validateAmount();
        },

        _validateAmount: function () {
            var oModel = this.getModel("donate");
            var bValid = validation.isAmount(oModel.getProperty("/amount"));
            oModel.setProperty("/amountState", bValid ? "None" : "Error");
            oModel.setProperty("/amountValid", bValid);
            return bValid;
        },

        // ── 2. Adım: bağışçı ────────────────────────────────────

        /** Her tuş vuruşunda çağrılır; hatayı yalnızca kullanıcı bir şey yazdıktan sonra gösterir. */
        validateDonor: function () {
            var oModel = this.getModel("donate");
            var sName = (oModel.getProperty("/donorName") || "").trim();
            var sEmail = (oModel.getProperty("/donorEmail") || "").trim();
            var bNameOk = validation.isName(sName);
            var bEmailOk = validation.isEmail(sEmail);

            oModel.setProperty("/nameState", bNameOk || !sName ? "None" : "Error");
            oModel.setProperty("/emailState", bEmailOk || !sEmail ? "None" : "Error");
            oModel.setProperty("/donorValid", bNameOk && bEmailOk);
            return bNameOk && bEmailOk;
        },

        // ── 3. Adım: gönder ─────────────────────────────────────

        onSubmit: function () {
            var oModel = this.getModel("donate");
            if (!this._validateAmount() || !this.validateDonor()) {
                MessageToast.show(this.getText("formHasErrors"));
                return;
            }

            var oData = oModel.getData();
            // OData V4 "unbound action" çağrısı: POST /odata/v4/site/donate
            var oAction = this.getModel().bindContext("/donate(...)");
            if (oData.campaignId) {
                oAction.setParameter("campaignID", oData.campaignId);
            }
            oAction.setParameter("donorName", oData.donorName.trim());
            oAction.setParameter("donorEmail", oData.donorEmail.trim());
            oAction.setParameter("amount", String(oData.amount));
            oAction.setParameter("method", oData.method);
            oAction.setParameter("isAnonymous", oData.isAnonymous);
            oAction.setParameter("message", oData.message.trim());

            oModel.setProperty("/busy", true);
            oAction.invoke()
                .then(function () {
                    var oResult = oAction.getBoundContext().getObject();
                    if (oResult.status === "Failed") {
                        MessageBox.error(this.getText("cardFailed"), { title: this.getText("cardFailedTitle") });
                        return;
                    }
                    this._openResultDialog(oResult);
                }.bind(this))
                .catch(function (oError) {
                    MessageBox.error(oError.message);
                })
                .finally(function () {
                    oModel.setProperty("/busy", false);
                });
        },

        // ── Sonuç penceresi ─────────────────────────────────────

        _openResultDialog: function (oResult) {
            var oView = this.getView();
            var oResultModel = new JSONModel(oResult);

            if (!this._pResultDialog) {
                this._pResultDialog = Fragment.load({
                    id: oView.getId(),
                    name: "pg.site.view.fragments.DonationResult",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            this._pResultDialog.then(function (oDialog) {
                oDialog.setModel(oResultModel, "result");
                oDialog.open();
            });
        },

        onCopy: function (oEvent) {
            var sText = oEvent.getSource().data("copy");
            if (navigator.clipboard) {
                navigator.clipboard.writeText(sText).then(function () {
                    MessageToast.show(this.getText("copied"));
                }.bind(this));
            }
        },

        onCloseResult: function () {
            this.byId("resultDialog").close();
            this.getRouter().navTo("home");
        }
    });
});
