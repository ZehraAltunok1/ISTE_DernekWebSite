sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (MessageBox, MessageToast, Filter, FilterOperator) {
    "use strict";

    /**
     * EventMixin
     * Kapsam: Etkinlik listeleme, ekleme, düzenleme, silme, katılımcı görüntüleme
     */
    return {

        // ─────────────────────────────────────────────────────────────
        // VERİ YÜKLEME
        // ─────────────────────────────────────────────────────────────

        _loadEvents: function () {
            var that   = this;
            var oModel = this.getModel("dashboardData");

            this._apiCall("GET", "/events").then(function (data) {
                if (!data.success) return;

                var aEvents = data.events.map(function (e) {
                    e.event_date_tr = that._formatDateTR(e.event_date);
                    return e;
                });

                oModel.setProperty("/events", aEvents);
                oModel.setProperty("/stats/totalEvents", aEvents.length);

                var nPlanned   = aEvents.filter(function (e) { return e.status === "planned";   }).length;
                var nCompleted = aEvents.filter(function (e) { return e.status === "completed"; }).length;
                var nTotalPart = aEvents.reduce(function (s, e) { return s + (e.registered_count || 0); }, 0);

                oModel.setProperty("/eventStats/total",             aEvents.length);
                oModel.setProperty("/eventStats/planned",           nPlanned);
                oModel.setProperty("/eventStats/completed",         nCompleted);
                oModel.setProperty("/eventStats/totalParticipants", nTotalPart);

            }).catch(function () {
                MessageToast.show("Etkinlikler yüklenirken hata oluştu.");
            });
        },

        // ─────────────────────────────────────────────────────────────
        // FİLTRELEME
        // ─────────────────────────────────────────────────────────────

        onFilterEvents: function () {
            var sStatus   = this.byId("eventFilterStatus")   ? this.byId("eventFilterStatus").getSelectedKey()   : "";
            var sCategory = this.byId("eventFilterCategory") ? this.byId("eventFilterCategory").getSelectedKey() : "";
            var oBinding  = this.byId("eventsList") ? this.byId("eventsList").getBinding("items") : null;
            if (!oBinding) return;

            var aFilters = [];
            if (sStatus)   aFilters.push(new Filter("status",   FilterOperator.EQ, sStatus));
            if (sCategory) aFilters.push(new Filter("category", FilterOperator.EQ, sCategory));

            oBinding.filter(
                aFilters.length ? new Filter({ filters: aFilters, and: true }) : []
            );
        },

        // ─────────────────────────────────────────────────────────────
        // ETKİNLİK EKLEME
        // ─────────────────────────────────────────────────────────────

        onAddEvent: function () {
            this._openDialog(
                "_oEventDialog",
                "edusupport.platform.view.fragments.EventAddDialog",
                "eventModel",
                {
                    dialogTitle: "Yeni Etkinlik Ekle",
                    title: "", description: "", event_date: "", event_time: "",
                    end_date: "", end_time: "", location: "",
                    category: "diger", capacity: 0, status: "planned",
                    editMode: false, editId: null
                }
            );
        },

        // ─────────────────────────────────────────────────────────────
        // ETKİNLİK DÜZENLEME
        // ─────────────────────────────────────────────────────────────

        onEditEvent: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent().getParent()
                              .getBindingContext("dashboardData");
            var oData    = Object.assign({}, oContext.getObject(), {
                dialogTitle: "Etkinliği Düzenle",
                editMode:    true,
                editId:      oContext.getObject().id
            });

            this._openDialog(
                "_oEventDialog",
                "edusupport.platform.view.fragments.EventAddDialog",
                "eventModel",
                oData
            );
        },

        // ─────────────────────────────────────────────────────────────
        // ETKİNLİK KAYDETME (Ekle / Güncelle)
        // ─────────────────────────────────────────────────────────────

        onSaveEvent: function () {
            var that  = this;
            var oData = this._oEventDialog.getModel("eventModel").getData();

            var sTitle    = this.byId("eventTitle")       ? this.byId("eventTitle").getValue().trim()       : "";
            var sDate     = this.byId("eventDate")        ? this.byId("eventDate").getValue().trim()        : "";
            var sTime     = this.byId("eventTime")        ? this.byId("eventTime").getValue()               : "";
            var sEndDate  = this.byId("eventEndDate")     ? this.byId("eventEndDate").getValue()            : "";
            var sEndTime  = this.byId("eventEndTime")     ? this.byId("eventEndTime").getValue()            : "";
            var sDesc     = this.byId("eventDescription") ? this.byId("eventDescription").getValue()       : "";
            var sLocation = this.byId("eventLocation")   ? this.byId("eventLocation").getValue()           : "";
            var sCategory = this.byId("eventCategory")   ? this.byId("eventCategory").getSelectedKey()     : "diger";
            var nCapacity = this.byId("eventCapacity")   ? this.byId("eventCapacity").getValue()           : 0;
            var sStatus   = this.byId("eventStatus")     ? this.byId("eventStatus").getSelectedKey()       : "planned";

            if (!sTitle || !sDate) {
                MessageBox.error("Etkinlik adı ve başlangıç tarihi zorunludur!");
                return;
            }

            this._oEventDialog.setBusy(true);

            var sMethod   = oData.editMode ? "PUT"  : "POST";
            var sEndpoint = oData.editMode ? "/events/" + oData.editId : "/events";

            this._apiCall(sMethod, sEndpoint, {
                title: sTitle, description: sDesc,
                event_date: sDate, event_time: sTime,
                end_date: sEndDate, end_time: sEndTime,
                location: sLocation, category: sCategory,
                capacity: nCapacity, status: sStatus
            }).then(function (data) {
                that._oEventDialog.setBusy(false);
                if (data.success) {
                    that._oEventDialog.close();
                    that._loadEvents();
                    MessageToast.show(oData.editMode ? "Etkinlik güncellendi!" : "Etkinlik oluşturuldu!");
                    setTimeout(function () { that._loadActivities(); }, 500);
                } else {
                    MessageBox.error(data.message || "İşlem başarısız!");
                }
            }).catch(function () {
                that._oEventDialog.setBusy(false);
                MessageBox.error("Sunucuya bağlanılamadı!");
            });
        },

        onCloseEventDialog: function () {
            if (this._oEventDialog) this._oEventDialog.close();
        },

        // ─────────────────────────────────────────────────────────────
        // ETKİNLİK SİLME
        // ─────────────────────────────────────────────────────────────

        onDeleteEvent: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent()
                              .getBindingContext("dashboardData");
            var oEvt     = oContext.getObject();
            var that     = this;

            MessageBox.confirm(
                '"' + oEvt.title + '" etkinliğini silmek istediğinize emin misiniz?',
                {
                    title: "Etkinlik Sil",
                    onClose: function (oAction) {
                        if (oAction !== MessageBox.Action.OK) return;

                        that._apiCall("DELETE", "/events/" + oEvt.id).then(function (data) {
                            if (data.success) {
                                that._loadEvents();
                                MessageToast.show("Etkinlik silindi.");
                                setTimeout(function () { that._loadActivities(); }, 500);
                            } else {
                                MessageBox.error(data.message || "Silme başarısız!");
                            }
                        });
                    }
                }
            );
        },

        // ─────────────────────────────────────────────────────────────
        // KATILIMCI GÖRÜNTÜLEME
        // ─────────────────────────────────────────────────────────────

        onViewParticipants: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent().getParent()
                              .getBindingContext("dashboardData");
            var oEvt     = oContext.getObject();

            this._apiCall("GET", "/events/" + oEvt.id + "/participants")
                .then(function (data) {
                    var sMsg = '"' + oEvt.title + '" — Katılımcı Listesi\n\n';

                    if (!data.participants || data.participants.length === 0) {
                        sMsg += "Henüz kayıtlı katılımcı yok.";
                    } else {
                        data.participants.forEach(function (p, i) {
                            var sName = (p.first_name && p.last_name)
                                ? p.first_name + " " + p.last_name
                                : p.user_name || "Misafir";
                            sMsg += (i + 1) + ". " + sName;
                            if (p.email || p.user_email)
                                sMsg += " (" + (p.email || p.user_email) + ")";
                            sMsg += "\n";
                        });
                    }

                    MessageBox.information(sMsg, {
                        title: "Katılımcılar (" + oEvt.registered_count + ")"
                    });
                })
                .catch(function () {
                    MessageBox.error("Katılımcılar yüklenemedi!");
                });
        }
    };
});
