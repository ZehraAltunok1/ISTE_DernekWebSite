sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (MessageBox, MessageToast) {
    "use strict";

    return {

        // ─────────────────────────────────────────────────────────────
        // VERİ YÜKLEME
        // ─────────────────────────────────────────────────────────────

        _loadPendingComments: function () {
            var that   = this;
            var oModel = this.getModel("dashboardData");

            this._apiCall("GET", "/media/comments/pending/all")
                .then(function (data) {
                    if (data.success) {
                        var aComments = (data.comments || []).map(function (c) {
                            c.created_at_tr = c.created_at
                                ? new Date(c.created_at).toLocaleString("tr-TR", {
                                    day: "numeric", month: "long", year: "numeric",
                                    hour: "2-digit", minute: "2-digit"
                                  })
                                : "-";
                            return c;
                        });
                        oModel.setProperty("/pendingComments",      aComments);
                        oModel.setProperty("/pendingCommentCount",  aComments.length);
                    }
                })
                .catch(function () {
                    MessageToast.show("Bekleyen yorumlar yüklenemedi.");
                });
        },

        // ─────────────────────────────────────────────────────────────
        // ONAYLA
        // ─────────────────────────────────────────────────────────────

        onApproveComment: function (oEvent) {
            var that     = this;
            var oContext = this._getCommentContext(oEvent);
            if (!oContext) return;
            var oComment = oContext.getObject();

            this._apiCall("PATCH", "/media/comments/" + oComment.id + "/approve")
                .then(function (data) {
                    if (data.success) {
                        MessageToast.show("✓ Yorum onaylandı ve yayınlandı.");
                        that._loadPendingComments();
                    } else {
                        MessageBox.error(data.message || "İşlem başarısız!");
                    }
                })
                .catch(function () {
                    MessageBox.error("Sunucuya bağlanılamadı!");
                });
        },

        // ─────────────────────────────────────────────────────────────
        // REDDET
        // ─────────────────────────────────────────────────────────────

        onRejectComment: function (oEvent) {
            var that     = this;
            var oContext = this._getCommentContext(oEvent);
            if (!oContext) return;
            var oComment = oContext.getObject();

            MessageBox.confirm(
                '"' + oComment.user_name + '" kullanıcısının yorumu reddedilsin mi?',
                {
                    title: "Yorumu Reddet",
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (oAction) {
                        if (oAction !== MessageBox.Action.OK) return;

                        that._apiCall("PATCH", "/media/comments/" + oComment.id + "/reject")
                            .then(function (data) {
                                if (data.success) {
                                    MessageToast.show("Yorum reddedildi.");
                                    that._loadPendingComments();
                                } else {
                                    MessageBox.error(data.message || "İşlem başarısız!");
                                }
                            })
                            .catch(function () {
                                MessageBox.error("Sunucuya bağlanılamadı!");
                            });
                    }
                }
            );
        },

        // ─────────────────────────────────────────────────────────────
        // SİL
        // ─────────────────────────────────────────────────────────────

        onDeleteComment: function (oEvent) {
            var that     = this;
            var oContext = this._getCommentContext(oEvent);
            if (!oContext) return;
            var oComment = oContext.getObject();

            MessageBox.confirm("Bu yorum kalıcı olarak silinsin mi?", {
                title: "Yorumu Sil",
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (oAction) {
                    if (oAction !== MessageBox.Action.OK) return;

                    that._apiCall("DELETE", "/media/comments/" + oComment.id)
                        .then(function (data) {
                            if (data.success) {
                                MessageToast.show("Yorum silindi.");
                                that._loadPendingComments();
                            } else {
                                MessageBox.error(data.message || "Silme başarısız!");
                            }
                        })
                        .catch(function () {
                            MessageBox.error("Sunucuya bağlanılamadı!");
                        });
                }
            });
        },

        // ─────────────────────────────────────────────────────────────
        // YARDIMCI — BindingContext bulmak için parent zinciri
        // ─────────────────────────────────────────────────────────────

        _getCommentContext: function (oEvent) {
            var oSource  = oEvent.getSource();
            var oCurrent = oSource;

            for (var i = 0; i < 8; i++) {
                oCurrent = oCurrent.getParent();
                if (!oCurrent) break;
                var oCtx = oCurrent.getBindingContext("dashboardData");
                if (oCtx) return oCtx;
            }

            MessageBox.error("Kayıt bilgisi alınamadı, lütfen sayfayı yenileyin.");
            return null;
        }

    };
});