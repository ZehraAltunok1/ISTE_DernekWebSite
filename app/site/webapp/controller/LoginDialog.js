sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "pg/site/model/validation"
], function (BaseObject, Fragment, JSONModel, MessageToast, validation) {
    "use strict";

    /**
     * Giriş penceresi — her sayfadan açılabilsin diye Component'te tek bir örnek olarak durur
     * (UI5 Walkthrough'taki "tekrar kullanılabilir dialog" deseni).
     * Fragment'taki olayların (press, submit) karşılığı bu sınıftaki metotlardır.
     */
    return BaseObject.extend("pg.site.controller.LoginDialog", {

        constructor: function (oView, oSession) {
            BaseObject.call(this);
            this._oView = oView;
            this._oSession = oSession;
            this._oModel = new JSONModel();
        },

        exit: function () {
            delete this._oView;
        },

        /**
         * @returns {Promise<boolean>} giriş yapılırsa true, pencere kapatılırsa false
         */
        open: function () {
            var oView = this._oView;
            this._oModel.setData({ email: "", password: "", error: "", busy: false, emailState: "None" });

            if (!this._pDialog) {
                this._pDialog = Fragment.load({
                    id: oView.getId(),
                    name: "pg.site.view.fragments.LoginDialog",
                    controller: this
                }).then(function (oDialog) {
                    oDialog.setModel(this._oModel, "login");
                    oView.addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }

            return this._pDialog.then(function (oDialog) {
                oDialog.open();
                return new Promise(function (resolve) {
                    this._fnResolve = resolve;
                }.bind(this));
            }.bind(this));
        },

        onLogin: function () {
            var d = this._oModel.getData();
            var bEmailOk = validation.isEmail(d.email);
            this._oModel.setProperty("/emailState", bEmailOk ? "None" : "Error");
            if (!bEmailOk || !d.password) {
                return;
            }

            var oBundle = this._oView.getModel("i18n").getResourceBundle();
            this._oModel.setProperty("/busy", true);
            this._oModel.setProperty("/error", "");

            this._oSession.login(d.email, d.password)
                .then(function (oMe) {
                    this._close(true);
                    MessageToast.show(oBundle.getText("welcomeBack", [oMe.displayName]));
                }.bind(this))
                .catch(function (oError) {
                    this._oModel.setProperty("/password", "");
                    this._oModel.setProperty("/error", oBundle.getText(
                        oError.message === "UNAUTHORIZED" ? "loginFailed" : "loginUnavailable"));
                }.bind(this))
                .finally(function () {
                    this._oModel.setProperty("/busy", false);
                }.bind(this));
        },

        onCancel: function () {
            this._close(false);
        },

        _close: function (bLoggedIn) {
            this._bLoggedIn = bLoggedIn;
            this._oView.byId("loginDialog").close();
        },

        /** Pencere nasıl kapanırsa kapansın (Esc dahil) open()'ın verdiği söz burada yerine gelir. */
        onAfterClose: function () {
            if (this._fnResolve) {
                this._fnResolve(!!this._bLoggedIn);
                this._fnResolve = null;
            }
            this._bLoggedIn = false;
        }
    });
});
