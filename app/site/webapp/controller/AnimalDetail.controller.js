sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "pg/site/model/validation"
], function (BaseController, JSONModel, Fragment, MessageBox, MessageToast, validation) {
    "use strict";

    return BaseController.extend("pg.site.controller.AnimalDetail", {

        onInit: function () {
            this.setModel(new JSONModel(), "adopt");
            this.getRouter().getRoute("animalDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sId = oEvent.getParameter("arguments").animalId;
            var oView = this.getView();

            if (!/^[0-9a-f-]{36}$/i.test(sId)) {
                this._showNotFound();
                return;
            }

            oView.bindElement({
                path: "/Animals(" + sId + ")",
                events: {
                    dataRequested: function () {
                        oView.setBusy(true);
                    },
                    dataReceived: function (oDataEvent) {
                        oView.setBusy(false);
                        if (oDataEvent.getParameter("error")) {
                            this._showNotFound();
                        }
                    }.bind(this)
                }
            });
        },

        _showNotFound: function () {
            this.getView().unbindElement();
            this.getRouter().getTargets().display("notFound");
        },

        // ── Başvuru penceresi ───────────────────────────────────

        onOpenAdoption: function () {
            var oView = this.getView();
            var sName = oView.getBindingContext().getProperty("name");

            this.getModel("adopt").setData({
                title: this.getText("adoptionDialogTitle", [sName]),
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                city: "",
                housingType: "",
                hasGarden: false,
                otherPets: "",
                experience: "",
                householdAgrees: false,
                consentGiven: false,
                busy: false,
                state: {}
            });

            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: oView.getId(),
                    name: "pg.site.view.fragments.AdoptionDialog",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            this._pDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onCloseAdoption: function () {
            this.byId("adoptionDialog").close();
        },

        onSubmitAdoption: function () {
            var oModel = this.getModel("adopt");
            var d = oModel.getData();
            var oResult = validation.checkAdoptionApplication(d);
            oModel.setProperty("/state", oResult.states);
            if (!oResult.valid) {
                MessageToast.show(this.getText("formHasErrors"));
                return;
            }

            var oAction = this.getModel().bindContext("/applyForAdoption(...)");
            oAction.setParameter("animalID", this.getView().getBindingContext().getProperty("ID"));
            ["firstName", "lastName", "email", "phone", "city", "otherPets", "experience"].forEach(function (sField) {
                oAction.setParameter(sField, d[sField].trim());
            });
            ["housingType", "hasGarden", "householdAgrees", "consentGiven"].forEach(function (sField) {
                oAction.setParameter(sField, d[sField]);
            });

            oModel.setProperty("/busy", true);
            oAction.invoke()
                .then(function () {
                    this.byId("adoptionDialog").close();
                    MessageBox.success(this.getText("adoptionSuccess"), { title: this.getText("adoptionSuccessTitle") });
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
