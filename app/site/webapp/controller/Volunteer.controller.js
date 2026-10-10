sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "pg/site/model/validation"
], function (BaseController, JSONModel, MessageBox, MessageToast, validation) {
    "use strict";

    return BaseController.extend("pg.site.controller.Volunteer", {

        onInit: function () {
            this.setModel(new JSONModel(), "form");
            this.getRouter().getRoute("volunteer").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this._resetForm();
        },

        _resetForm: function () {
            this.getModel("form").setData({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                areaCode: "",
                availability: "",
                motivation: "",
                consentGiven: false,
                busy: false,
                state: {}
            });
        },

        /**
         * İstemci tarafı doğrulama: kullanıcıya hızlı geri bildirim verir.
         * Sunucu aynı kuralları tekrar kontrol eder — istemciye asla güvenilmez.
         * @returns {boolean} form geçerli mi
         */
        _validate: function () {
            var oModel = this.getModel("form");
            var oResult = validation.checkVolunteerApplication(oModel.getData());
            oModel.setProperty("/state", oResult.states);
            return oResult.valid;
        },

        onSubmit: function () {
            if (!this._validate()) {
                MessageToast.show(this.getText("formHasErrors"));
                return;
            }

            var oModel = this.getModel("form");
            var d = oModel.getData();
            var oAction = this.getModel().bindContext("/applyVolunteer(...)");
            ["firstName", "lastName", "email", "phone", "availability", "motivation"].forEach(function (sField) {
                oAction.setParameter(sField, d[sField].trim());
            });
            oAction.setParameter("areaCode", d.areaCode);
            oAction.setParameter("consentGiven", d.consentGiven);

            oModel.setProperty("/busy", true);
            oAction.invoke()
                .then(function () {
                    MessageBox.success(this.getText("applicationSuccess"), {
                        title: this.getText("applicationSuccessTitle"),
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
