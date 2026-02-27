sap.ui.define([
    "edusupport/platform/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    // ── Mixin'ler ──────────────────────────────────────────────────
    "edusupport/platform/controller/admin/mixins/MemberMixin",
    "edusupport/platform/controller/admin/mixins/EventMixin",
    "edusupport/platform/controller/admin/mixins/PaymentMixin",
    "edusupport/platform/controller/admin/mixins/ReportMixin",
    "edusupport/platform/controller/admin/mixins/MediaMixin",
    "edusupport/platform/controller/admin/mixins/VolunteerMixin"
], function (
    BaseController, JSONModel, MessageBox, MessageToast, History,
    MemberMixin, EventMixin, PaymentMixin, ReportMixin, MediaMixin, VolunteerMixin
) {
    "use strict";

    return BaseController.extend(
        "edusupport.platform.controller.admin.Dashboard",

        Object.assign({}, MemberMixin, EventMixin, PaymentMixin, ReportMixin, MediaMixin, VolunteerMixin, {

            onInit: function () {
                if (!localStorage.getItem("authToken")) {
                    this.getRouter().navTo("home");
                    return;
                }

                this.getView().setModel(new JSONModel({
                    lastUpdate: new Date().toLocaleString("tr-TR"),
                    stats: {
                        totalDonors:          0,
                        newDonorsThisMonth:   0,
                        totalStudents:        0,
                        newStudentsThisMonth: 0,
                        totalDonationAmount:  "0",
                        donationGrowth:       0,
                        activeProjects:       0,
                        completedProjects:    0,
                        totalMembers:         0,
                        totalEvents:          0
                    },
                    recentActivities: [],
                    members:          [],
                    events:           [],
                    mediaItems:       [],
                    payments:         [],
                    announcements:    [],
                    annStats: { total: 0, active: 0, passive: 0, today: 0 },
                    paymentStats: {
                        totalIncome:    0,
                        monthlyIncome:  0,
                        pendingAmount:  0,
                        collectionRate: 0
                    },
                    eventStats: {
                        total:             0,
                        planned:           0,
                        completed:         0,
                        totalParticipants: 0
                    }
                }), "dashboardData");

                this.getView().setModel(new JSONModel({
                    summary: {
                        totalDonations:         "0 ₺",
                        donationChange:         "+0%",
                        donationChangePositive: true,
                        newMembers:             0,
                        completedEvents:        0,
                        totalParticipants:      0,
                        activeRate:             "0%"
                    },
                    donationTrend:  [],
                    memberGrowth:   [],
                    categoryStats:  [],
                    selectedPeriod: "6months"
                }), "reportData");

                this.getOwnerComponent().getRouter()
                    .getRoute("adminDashboard")
                    .attachPatternMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: function () {
                var oAppData = this.getOwnerComponent().getModel("appData");
                var oUser    = oAppData.getProperty("/currentUser");

                if (!oUser) {
                    try {
                        var sData = localStorage.getItem("userData");
                        if (sData) {
                            oUser = JSON.parse(sData);
                            oAppData.setProperty("/currentUser",     oUser);
                            oAppData.setProperty("/isAuthenticated", true);
                        }
                    } catch (e) { /* ignore */ }
                }

                if (!oUser || (oUser.role !== "admin" && oUser.type !== "admin")) {
                    MessageBox.error("Bu alana erişim yetkiniz yok!", {
                        onClose: function () { this.getRouter().navTo("home"); }.bind(this)
                    });
                    return;
                }

                this._loadDashboardData();
            },

            _loadDashboardData: function () {
                this._loadStats();
                this._loadActivities();
                this._loadMembers();
                this._loadEvents();
                this._loadAnnouncements();
            },

            // ─────────────────────────────────────────────────────
            // DUYURULAR
            // ─────────────────────────────────────────────────────

            _loadAnnouncements: function () {
                var that   = this;
                var oModel = this.getModel("dashboardData");

                this._apiCall("GET", "/announcements").then(function (data) {
                    if (!data.success) return;
                    var aAll = data.announcements || [];

                    var today  = new Date().toDateString();
                    var nToday = aAll.filter(function (a) {
                        return new Date(a.created_at).toDateString() === today;
                    }).length;

                    oModel.setProperty("/announcements",    aAll);
                    oModel.setProperty("/annStats/total",   aAll.length);
                    oModel.setProperty("/annStats/active",  aAll.filter(function (a) { return a.status === "active";  }).length);
                    oModel.setProperty("/annStats/passive", aAll.filter(function (a) { return a.status === "passive"; }).length);
                    oModel.setProperty("/annStats/today",   nToday);
                }).catch(function () {
                    MessageToast.show("Duyurular yüklenirken hata oluştu.");
                });
            },

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
                    type: sType,   status: sStatus,
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
                        }
                    });
            },

            onDeleteAnnouncement: function (oEvent) {
                var that     = this;
                var oContext = oEvent.getSource().getParent().getParent()
                                  .getBindingContext("dashboardData");
                var oAnn     = oContext.getObject();

                MessageBox.confirm('"' + oAnn.title + '" duyurusunu silmek istediğinize emin misiniz?', {
                    title: "Duyuru Sil",
                    onClose: function (oAction) {
                        if (oAction !== MessageBox.Action.OK) return;
                        that._apiCall("DELETE", "/announcements/" + oAnn.id).then(function (data) {
                            if (data.success) {
                                that._loadAnnouncements();
                                MessageToast.show("Duyuru silindi.");
                            }
                        });
                    }
                });
            },

            // ─────────────────────────────────────────────────────
            // STATS
            // ─────────────────────────────────────────────────────

            _loadStats: function () {
                var oModel = this.getModel("dashboardData");
                this._apiCall("GET", "/stats")
                    .then(function (data) {
                        if (data.success) oModel.setProperty("/stats", data.stats);
                    })
                    .catch(function () {
                        Promise.all([
                            fetch("http://localhost:3000/api/donors",   { headers: { "Authorization": "Bearer " + localStorage.getItem("authToken") } }).then(function (r) { return r.json(); }),
                            fetch("http://localhost:3000/api/students", { headers: { "Authorization": "Bearer " + localStorage.getItem("authToken") } }).then(function (r) { return r.json(); })
                        ]).then(function (results) {
                            var donors   = results[0].success ? results[0].donors   : [];
                            var students = results[1].success ? results[1].students : [];
                            var nMonth   = new Date().getMonth();
                            oModel.setProperty("/stats/totalDonors",          donors.length);
                            oModel.setProperty("/stats/totalStudents",        students.length);
                            oModel.setProperty("/stats/totalMembers",         donors.length + students.length);
                            oModel.setProperty("/stats/newDonorsThisMonth",   donors.filter(function (d)   { return new Date(d.created_at).getMonth() === nMonth; }).length);
                            oModel.setProperty("/stats/newStudentsThisMonth", students.filter(function (s) { return new Date(s.created_at).getMonth() === nMonth; }).length);
                            oModel.setProperty("/stats/activeProjects",       23);
                            oModel.setProperty("/stats/completedProjects",    5);
                            oModel.setProperty("/stats/donationGrowth",       15);
                        });
                    });
            },

            _loadActivities: function () {
                var that   = this;
                var oModel = this.getModel("dashboardData");
                var oIconMap = {
                    create_donor:        "sap-icon://heart",
                    create_student:      "sap-icon://study-leave",
                    update_donor:        "sap-icon://edit",
                    update_student:      "sap-icon://edit",
                    delete_donor:        "sap-icon://delete",
                    delete_student:      "sap-icon://delete",
                    create_event:        "sap-icon://appointment-2",
                    update_event:        "sap-icon://edit",
                    delete_event:        "sap-icon://delete",
                    create_announcement: "sap-icon://bell",
                    update_announcement: "sap-icon://edit",
                    delete_announcement: "sap-icon://delete"
                };
                this._apiCall("GET", "/activities?limit=10")
                    .then(function (data) {
                        if (!data.success || !data.activities) return;
                        var aFormatted = data.activities.map(function (a) {
                            return {
                                sender:    a.admin_name || "Admin",
                                icon:      oIconMap[a.action_type] || "sap-icon://activity-individual",
                                text:      a.action_description,
                                timestamp: that._formatTimestamp(a.created_at),
                                info:      a.action_type.includes("donor")        ? "Bağışçı"  :
                                           a.action_type.includes("student")      ? "Öğrenci"  :
                                           a.action_type.includes("announcement") ? "Duyuru"   : "Etkinlik"
                            };
                        });
                        oModel.setProperty("/recentActivities", aFormatted);
                    })
                    .catch(function () { oModel.setProperty("/recentActivities", []); });
            },

            // ─────────────────────────────────────────────────────
            // TAB SEÇİMİ
            // ─────────────────────────────────────────────────────

            onTabSelect: function (oEvent) {
                var sKey = oEvent.getParameter("key");
                var oMap = {
                    members:       this._loadMembers.bind(this),
                    events:        this._loadEvents.bind(this),
                    accounting:    this._loadPayments.bind(this),
                    reports:       this._loadReportData.bind(this),
                    media:         this._loadMedia.bind(this),
                    volunteers:    this.onLoadVolunteers.bind(this),
                    announcements: this._loadAnnouncements.bind(this)
                };
                if (oMap[sKey]) oMap[sKey]();
            },

            onRefresh: function () {
                this.getModel("dashboardData").setProperty("/lastUpdate", new Date().toLocaleString("tr-TR"));
                this._loadDashboardData();
                MessageToast.show("Veriler yenilendi!");
            },

            onSettings:      function () { MessageToast.show("Ayarlar yakında aktif olacak!"); },
            onAddDonation:   function () { MessageToast.show("Bağış kaydetme formu yakında aktif olacak!"); },
            onGenerateReport:function () { MessageToast.show("Rapor oluşturuluyor..."); },

            onNavBack: function () {
                var sPrev = History.getInstance().getPreviousHash();
                sPrev !== undefined ? window.history.go(-1) : this.getRouter().navTo("home", {}, true);
            }

        })
    );
});