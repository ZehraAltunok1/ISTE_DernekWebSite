sap.ui.define([
    "sap/ui/base/Object"
], function (BaseObject) {
    "use strict";

    var STORAGE_KEY = "pg.site.auth";

    /** UTF-8 güvenli Base64 (btoa tek başına "ü", "ş" gibi harflerde hata verir). */
    var toBase64 = function (sText) {
        var aBytes = new TextEncoder().encode(sText);
        return btoa(String.fromCharCode.apply(null, aBytes));
    };

    var storage = {
        get: function () {
            try {
                return window.sessionStorage.getItem(STORAGE_KEY);
            } catch {
                return null;
            }
        },
        set: function (sValue) {
            try {
                if (sValue) {
                    window.sessionStorage.setItem(STORAGE_KEY, sValue);
                } else {
                    window.sessionStorage.removeItem(STORAGE_KEY);
                }
            } catch {
                // Gizli pencere vb. — oturum yalnızca bellekte kalır
            }
        }
    };

    /**
     * Üye oturumu.
     *
     * Backend demo amaçlı CAP "mocked" kimlik doğrulaması kullanır (HTTP Basic).
     * Giriş: e-posta + şifre → "Authorization: Basic ..." başlığı → MemberService/me() ile doğrulanır.
     * Başarılıysa başlık yalnızca "member" OData modeline eklenir; herkese açık model etkilenmez.
     *
     * ⚠️ Gerçek bir uygulamada şifre tarayıcıda saklanmaz; bunun yerine bir kimlik sağlayıcı
     * (ör. SAP BTP'de XSUAA/IAS) kısa ömürlü bir token ya da güvenli bir çerez verir.
     * Burada sayfa yenilenince oturum kaybolmasın diye başlık sekmeye özel sessionStorage'da durur.
     */
    return BaseObject.extend("pg.site.model.Session", {

        constructor: function (oComponent) {
            BaseObject.call(this);
            this._oComponent = oComponent;
            this._sServiceUrl = oComponent.getManifestEntry("/sap.app/dataSources/memberService/uri");
        },

        /** @returns {Promise<object>} başarılıysa kullanıcı bilgisi; yanlış şifrede hata */
        login: function (sEmail, sPassword) {
            var sAuth = "Basic " + toBase64(sEmail.trim().toLowerCase() + ":" + sPassword);
            return this._verify(sAuth);
        },

        logout: function () {
            var oMember = this._oComponent.getModel("member");
            oMember.resetChanges();
            // undefined = başlığı kaldır (null kabul edilmez)
            oMember.changeHttpHeaders({ Authorization: undefined, "X-Requested-With": undefined });
            storage.set(null);
            this._oComponent.getModel("session").setData({ loggedIn: false, email: "", displayName: "", roles: [] });
            this._publish();
        },

        /** Sayfa yenilendiğinde sekmede kayıtlı oturumu geri yükler (yine sunucuda doğrulanır). */
        restore: function () {
            var sAuth = storage.get();
            if (sAuth) {
                this._verify(sAuth).catch(function () {
                    storage.set(null);
                });
            }
        },

        _verify: function (sAuth) {
            return fetch(this._sServiceUrl + "me()", {
                headers: { Authorization: sAuth, Accept: "application/json", "X-Requested-With": "XMLHttpRequest" }
            }).then(function (oResponse) {
                if (oResponse.status === 401) {
                    throw new Error("UNAUTHORIZED");
                }
                if (!oResponse.ok) {
                    throw new Error("HTTP " + oResponse.status);
                }
                return oResponse.json();
            }).then(function (oMe) {
                this._oComponent.getModel("member").changeHttpHeaders({ Authorization: sAuth, "X-Requested-With": "XMLHttpRequest" });
                storage.set(sAuth);
                this._oComponent.getModel("session").setData({
                    loggedIn: true,
                    email: oMe.email,
                    displayName: oMe.displayName,
                    roles: oMe.roles
                });
                this._publish();
                return oMe;
            }.bind(this));
        },

        /** Hesabım sayfası gibi dinleyiciler veriyi tazelesin diye haber verir. */
        _publish: function () {
            this._oComponent.getEventBus().publish("session", "changed");
        }
    });
});
