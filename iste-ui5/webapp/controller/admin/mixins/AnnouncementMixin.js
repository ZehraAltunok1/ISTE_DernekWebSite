sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (MessageBox, MessageToast) {
    "use strict";

    /**
     * AnnouncementMixin
     * EventMixin ile tamamen aynı pattern.
     * Dashboard controller'ınıza diğer mixin'lerle aynı şekilde ekleyin.
     */
    return {

        // ─────────────────────────────────────────────────────────────
        // VERİ YÜKLEME
        // ─────────────────────────────────────────────────────────────

        _loadAnnouncements: function () {
            var that   = this;
            var oModel = this.getModel("dashboardData");

            this._apiCall("GET", "/announcements").then(function (data) {
                if (!data.success) return;

                var aAll     = data.announcements || [];
                var nActive  = aAll.filter(function (a) { return a.status === "active";  }).length;
                var nPassive = aAll.filter(function (a) { return a.status === "passive"; }).length;

                var today  = new Date().toDateString();
                var nToday = aAll.filter(function (a) {
                    return new Date(a.created_at).toDateString() === today;
                }).length;

                oModel.setProperty("/announcements",    aAll);
                oModel.setProperty("/annStats/total",   aAll.length);
                oModel.setProperty("/annStats/active",  nActive);
                oModel.setProperty("/annStats/passive", nPassive);
                oModel.setProperty("/annStats/today",   nToday);

            }).catch(function () {
                MessageToast.show("Duyurular yüklenirken hata oluştu.");
            });
        },

        // ─────────────────────────────────────────────────────────────
        // FİLTRELEME
        // ─────────────────────────────────────────────────────────────

        onFilterAnnouncements: function () {
            var sType   = this.byId("annFilterType")   ? this.byId("annFilterType").getSelectedKey()   : "";
            var sStatus = this.byId("annFilterStatus") ? this.byId("annFilterStatus").getSelectedKey() : "";
            var aAll    = this.getModel("dashboardData").getProperty("/announcements") || [];

            var aFiltered = aAll.filter(function (a) {
                var okType   = !sType   || sType   === "all" || a.type   === sType;
                var okStatus = !sStatus || sStatus === "all" || a.status === sStatus;
                return okType && okStatus;
            });

            this.getModel("dashboardData").setProperty("/announcementsFiltered", aFiltered);
        },

        // ─────────────────────────────────────────────────────────────
        // YENİ DUYURU
        // ─────────────────────────────────────────────────────────────

        onAddAnnouncement: function () {
            this._openDialog(
                "_oAnnouncementDialog",
                "edusupport.platform.view.fragments.AnnouncementAddDialog",
                "announcementModel",
                {
                    dialogTitle: "Yeni Duyuru Ekle",
                    title: "", message: "", type: "Information",
                    status: "active", link_text: "", link_url: "",
                    editMode: false, editId: null
                }
            );
        },

        // ─────────────────────────────────────────────────────────────
        // DUYURU DÜZENLE
        // ─────────────────────────────────────────────────────────────

        onEditAnnouncement: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent().getParent()
                              .getBindingContext("dashboardData");
            var oData = Object.assign({}, oContext.getObject(), {
                dialogTitle: "Duyuru Düzenle",
                editMode: true,
                editId:   oContext.getObject().id
            });

            this._openDialog(
                "_oAnnouncementDialog",
                "edusupport.platform.view.fragments.AnnouncementAddDialog",
                "announcementModel",
                oData
            );
        },

        // ─────────────────────────────────────────────────────────────
        // DUYURU KAYDET
        // ─────────────────────────────────────────────────────────────

        onSaveAnnouncement: function () {
            var that  = this;
            var oData = this._oAnnouncementDialog.getModel("announcementModel").getData();

            var sTitle   = this.byId("annTitle")    ? this.byId("annTitle").getValue().trim()    : "";
            var sMessage = this.byId("annMessage")  ? this.byId("annMessage").getValue().trim()  : "";
            var sType    = this.byId("annType")     ? this.byId("annType").getSelectedKey()      : "Information";
            var sStatus  = this.byId("annStatus")   ? this.byId("annStatus").getSelectedKey()    : "active";
            var sLinkTxt = this.byId("annLinkText") ? this.byId("annLinkText").getValue().trim() : "";
            var sLinkUrl = this.byId("annLinkUrl")  ? this.byId("annLinkUrl").getValue().trim()  : "";

            if (!sTitle || !sMessage) {
                MessageBox.error("Başlık ve mesaj zorunludur!");
                return;
            }

            this._oAnnouncementDialog.setBusy(true);

            var sMethod   = oData.editMode ? "PUT"  : "POST";
            var sEndpoint = oData.editMode ? "/announcements/" + oData.editId : "/announcements";

            this._apiCall(sMethod, sEndpoint, {
                title: sTitle, message: sMessage,
                type: sType, status: sStatus,
                link_text: sLinkTxt, link_url: sLinkUrl
            }).then(function (data) {
                that._oAnnouncementDialog.setBusy(false);
                if (data.success) {
                    that._oAnnouncementDialog.close();
                    that._loadAnnouncements();
                    MessageToast.show(oData.editMode ? "Duyuru güncellendi!" : "Duyuru oluşturuldu!");
                } else {
                    MessageBox.error(data.message || "İşlem başarısız!");
                }
            }).catch(function () {
                that._oAnnouncementDialog.setBusy(false);
                MessageBox.error("Sunucuya bağlanılamadı!");
            });
        },

        onCloseAnnouncementDialog: function () {
            if (this._oAnnouncementDialog) this._oAnnouncementDialog.close();
        },

        // ─────────────────────────────────────────────────────────────
        // AKTİF / PASİF TOGGLE
        // ─────────────────────────────────────────────────────────────

        onToggleAnnouncementStatus: function (oEvent) {
            var that       = this;
            var oContext   = oEvent.getSource().getParent().getParent()
                                .getBindingContext("dashboardData");
            var oAnn       = oContext.getObject();
            var sNewStatus = oAnn.status === "active" ? "passive" : "active";

            this._apiCall("PATCH", "/announcements/" + oAnn.id, { status: sNewStatus })
                .then(function (data) {
                    if (data.success) {
                        that._loadAnnouncements();
                        MessageToast.show(sNewStatus === "active" ? "Aktif edildi." : "Pasife alındı.");
                    } else {
                        MessageBox.error("Durum güncellenemedi!");
                    }
                })
                .catch(function () { MessageBox.error("Sunucuya bağlanılamadı!"); });
        },

        // ─────────────────────────────────────────────────────────────
        // DUYURU SİL
        // ─────────────────────────────────────────────────────────────

        onDeleteAnnouncement: function (oEvent) {
            var that     = this;
            var oContext = oEvent.getSource().getParent().getParent()
                              .getBindingContext("dashboardData");
            var oAnn     = oContext.getObject();

            MessageBox.confirm(
                '"' + oAnn.title + '" duyurusunu silmek istediğinize emin misiniz?',
                {
                    title: "Duyuru Sil",
                    onClose: function (oAction) {
                        if (oAction !== MessageBox.Action.OK) return;

                        that._apiCall("DELETE", "/announcements/" + oAnn.id)
                            .then(function (data) {
                                if (data.success) {
                                    that._loadAnnouncements();
                                    MessageToast.show("Duyuru silindi.");
                                } else {
                                    MessageBox.error("Silme başarısız!");
                                }
                            })
                            .catch(function () { MessageBox.error("Sunucuya bağlanılamadı!"); });
                    }
                }
            );
        }
    };
});