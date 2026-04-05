sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("edusupport.platform.controller.public.ResetPassword", {

        onInit: function () {
            var oModel = new JSONModel({
                password:              "",
                passwordConfirm:       "",
                errorMessage:          "",
                isLoading:             false,
                isSuccess:             false,
                isInvalidToken:        false,
                passwordStrength:      0,
                passwordStrengthState: "None",
                passwordStrengthText:  ""
            });
            this.getView().setModel(oModel, "resetModel");

            // Route eşleşince token'ı al
            this.getOwnerComponent().getRouter()
                .getRoute("resetPassword")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            this._sToken = oEvent.getParameter("arguments").token;
            // Modeli sıfırla
            var oModel = this.getView().getModel("resetModel");
            oModel.setProperty("/password",              "");
            oModel.setProperty("/passwordConfirm",       "");
            oModel.setProperty("/errorMessage",          "");
            oModel.setProperty("/isLoading",             false);
            oModel.setProperty("/isSuccess",             false);
            oModel.setProperty("/isInvalidToken",        false);
            oModel.setProperty("/passwordStrength",      0);
            oModel.setProperty("/passwordStrengthState", "None");
            oModel.setProperty("/passwordStrengthText",  "");
        },

        onPasswordChange: function () {
            var oModel    = this.getView().getModel("resetModel");
            var sPassword = oModel.getProperty("/password");
            var iStrength = 0;

            if (sPassword.length >= 8)           iStrength += 25;
            if (/[A-Z]/.test(sPassword))         iStrength += 25;
            if (/[0-9]/.test(sPassword))         iStrength += 25;
            if (/[^A-Za-z0-9]/.test(sPassword))  iStrength += 25;

            var sState, sText;
            if      (iStrength >= 75) { sState = "Success"; sText = "Güçlü";     }
            else if (iStrength >= 50) { sState = "Warning"; sText = "Orta";      }
            else if (iStrength >= 25) { sState = "Error";   sText = "Zayıf";     }
            else                      { sState = "None";    sText = "Çok zayıf"; }

            oModel.setProperty("/passwordStrength",      iStrength);
            oModel.setProperty("/passwordStrengthState", sState);
            oModel.setProperty("/passwordStrengthText",  sText);
        },

        onResetSubmit: function () {
            var that   = this;
            var oModel = this.getView().getModel("resetModel");
            var sPass  = oModel.getProperty("/password");
            var sConf  = oModel.getProperty("/passwordConfirm");

            if (!sPass || sPass.length < 8) {
                oModel.setProperty("/errorMessage", "Şifre en az 8 karakter olmalıdır.");
                return;
            }
            if (sPass !== sConf) {
                oModel.setProperty("/errorMessage", "Şifreler eşleşmiyor.");
                return;
            }

            oModel.setProperty("/isLoading",    true);
            oModel.setProperty("/errorMessage", "");

            fetch("http://localhost:3000/api/auth/reset-password/" + this._sToken, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ password: sPass })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.success) {
                    // Token geçersiz / süresi dolmuş
                    if (data.message && data.message.includes("geçersiz")) {
                        oModel.setProperty("/isInvalidToken", true);
                    } else {
                        throw new Error(data.message || "Şifre güncellenemedi.");
                    }
                    return;
                }
                oModel.setProperty("/isSuccess", true);
            })
            .catch(function (err) {
                oModel.setProperty("/errorMessage", err.message || "Bir hata oluştu.");
            })
            .finally(function () {
                oModel.setProperty("/isLoading", false);
            });
        },

        onGoToHome: function () {
            this.getOwnerComponent().getRouter().navTo("home");
        }
    });
});