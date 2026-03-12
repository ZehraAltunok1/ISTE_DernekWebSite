sap.ui.define([], function () {
    "use strict";

    const API_BASE = "http://localhost:3000/api";

    function getToken() {
        return localStorage.getItem("authToken");
    }

    // 401 gelince otomatik logout
    function handleUnauthorized() {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");

        var oComponent = sap.ui.getCore().getRootComponent
            ? sap.ui.getCore().getRootComponent()
            : null;

        if (oComponent) {
            var oAppData = oComponent.getModel("appData");
            if (oAppData) {
                oAppData.setProperty("/isAuthenticated", false);
                oAppData.setProperty("/authToken", null);
                oAppData.setProperty("/currentUser", null);
            }
            oComponent.getRouter().navTo("login");
        } else {
            // Fallback
            window.location.hash = "#/login";
        }

        sap.m.MessageBox.warning("Oturum süreniz doldu, lütfen tekrar giriş yapın.");
    }

    function handleResponse(response) {
        if (response.status === 401) {
            handleUnauthorized();
            return Promise.reject("401 Unauthorized");
        }
        return response.json();
    }

    return {

        get: function (url) {
            return fetch(API_BASE + url, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + getToken()
                }
            }).then(handleResponse);
        },

        post: function (url, data) {
            return fetch(API_BASE + url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + getToken()
                },
                body: JSON.stringify(data)
            }).then(handleResponse);
        },

        put: function (url, data) {
            return fetch(API_BASE + url, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + getToken()
                },
                body: JSON.stringify(data)
            }).then(handleResponse);
        },

        delete: function (url) {
            return fetch(API_BASE + url, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + getToken()
                }
            }).then(handleResponse);
        }
    };
});