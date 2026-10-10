sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "pg/site/model/validation"
], function (BaseController, JSONModel, MessageBox, MessageToast, validation) {
    "use strict";

    return BaseController.extend("pg.site.controller.Contact", {

        onInit: function () {
            this.setModel(new JSONModel(), "contact");
            this.getRouter().getRoute("contact").attachPatternMatched(this._resetForm, this);
        },

        _resetForm: function () {
            this.getModel("contact").setData({
                name: "",
                email: "",
                subject: "",
                message: "",
                consentGiven: false,
                busy: false,
                state: {}
            });
        },

        /** İstemci tarafı doğrulama — kurallar model/validation.js'de (QUnit ile test edilir). */
        _validate: function () {
            var oModel = this.getModel("contact");
            var oResult = validation.checkContactMessage(oModel.getData());
            oModel.setProperty("/state", oResult.states);
            return oResult.valid;
        },

        onSubmit: function () {
            if (!this._validate()) {
                MessageToast.show(this.getText("formHasErrors"));
                return;
            }

            var oModel = this.getModel("contact");
            var d = oModel.getData();
            var oAction = this.getModel().bindContext("/sendContactMessage(...)");
            ["name", "email", "subject", "message"].forEach(function (sField) {
                oAction.setParameter(sField, d[sField].trim());
            });
            oAction.setParameter("consentGiven", d.consentGiven);

            oModel.setProperty("/busy", true);
            oAction.invoke()
                .then(function () {
                    MessageBox.success(this.getText("contactSuccess"), {
                        title: this.getText("contactSuccessTitle"),
                        onClose: this._resetForm.bind(this)
                    });
                }.bind(this))
                .catch(function (oError) {
                    MessageBox.error(oError.message);
                })
                .finally(function () {
                    oModel.setProperty("/busy", false);
                });
        }
    });
});
