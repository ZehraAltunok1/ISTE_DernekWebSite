sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "pg/site/model/validation"
], function (BaseController, JSONModel, Fragment, MessageBox, MessageToast, validation) {
    "use strict";

    return BaseController.extend("pg.site.controller.EventDetail", {

        onInit: function () {
            this.setModel(new JSONModel(), "reg");
            this.getRouter().getRoute("eventDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sId = oEvent.getParameter("arguments").eventId;
            var oView = this.getView();

            if (!/^[0-9a-f-]{36}$/i.test(sId)) {
                this._showNotFound();
                return;
            }

            oView.bindElement({
                path: "/Events(" + sId + ")",
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

        // ── Kayıt penceresi ─────────────────────────────────────

        onOpenRegistration: function () {
            var oView = this.getView();
            this.getModel("reg").setData({
                title: this.getText("registrationDialogTitle", [oView.getBindingContext().getProperty("title")]),
                name: "",
                email: "",
                phone: "",
                consentGiven: false,
                busy: false,
                state: {}
            });

            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: oView.getId(),
                    name: "pg.site.view.fragments.EventRegistrationDialog",
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

        onCloseRegistration: function () {
            this.byId("registrationDialog").close();
        },

        onSubmitRegistration: function () {
            var oModel = this.getModel("reg");
            var d = oModel.getData();
            var oResult = validation.checkEventRegistration(d);
            oModel.setProperty("/state", oResult.states);
            if (!oResult.valid) {
                MessageToast.show(this.getText("formHasErrors"));
                return;
            }

            var oContext = this.getView().getBindingContext();
            var oAction = this.getModel().bindContext("/registerForEvent(...)");
            oAction.setParameter("eventID", oContext.getProperty("ID"));
            oAction.setParameter("name", d.name.trim());
            oAction.setParameter("email", d.email.trim());
            oAction.setParameter("phone", d.phone.trim());
            oAction.setParameter("consentGiven", d.consentGiven);

            oModel.setProperty("/busy", true);
            oAction.invoke()
                .then(function () {
                    this.byId("registrationDialog").close();
                    // Kontenjan bilgisini sunucudan tazele (kayıt sayısı arttı)
                    oContext.refresh();
                    MessageBox.success(this.getText("registrationSuccess"), { title: this.getText("registrationSuccessTitle") });
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
