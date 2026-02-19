sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, MessageBox, MessageToast, History, Fragment, Filter, FilterOperator) {
    "use strict";

    const API_BASE = "http://localhost:3000/api";

    return Controller.extend("edusupport.platform.controller.admin.Dashboard", {

        onInit: function () {
            var token = localStorage.getItem("authToken");
            if (!token) {
                this.getOwnerComponent().getRouter().navTo("home");
                return;
            }

            var oDashboardModel = new JSONModel({
                lastUpdate: new Date().toLocaleString('tr-TR'),
                stats: {
                    totalDonors: 0,
                    newDonorsThisMonth: 0,
                    totalStudents: 0,
                    newStudentsThisMonth: 0,
                    totalDonationAmount: "0",
                    donationGrowth: 0,
                    activeProjects: 0,
                    completedProjects: 0,
                    totalMembers: 0,
                    totalEvents: 0
                },
                recentActivities: [],
                members: [],
                filteredMembers: [],
                events: [],
                eventStats: {
                    total: 0,
                    planned: 0,
                    completed: 0,
                    totalParticipants: 0
                }
            });

            this.getView().setModel(oDashboardModel, "dashboardData");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("adminDashboard").attachPatternMatched(this._onRouteMatched, this);
            var oReportModel = new JSONModel({
                summary: {
                    totalDonations: "0 ₺",
                    donationChange: "+0%",
                    donationChangePositive: true,
                    newMembers: 0,
                    completedEvents: 0,
                    totalParticipants: 0,
                    activeRate: "0%"
                },
                donationTrend: [],
                memberGrowth: [],
                categoryStats: [],
                selectedPeriod: "6months"
            });
            this.getView().setModel(oReportModel, "reportData");
            },
        // ROUTE & AUTH
        _onRouteMatched: function () {
            var oAppData = this.getOwnerComponent().getModel("appData");
            var oUser = oAppData.getProperty("/currentUser");

            if (!oUser) {
                var sUserData = localStorage.getItem("userData");
                if (sUserData) {
                    try {
                        oUser = JSON.parse(sUserData);
                        oAppData.setProperty("/currentUser", oUser);
                        oAppData.setProperty("/isAuthenticated", true);
                    } catch (e) { /* ignore */ }
                }
            }

            if (!oUser || (oUser.role !== "admin" && oUser.type !== "admin")) {
                MessageBox.error("Bu alana erişim yetkiniz yok!", {
                    onClose: function () {
                        this.getOwnerComponent().getRouter().navTo("home");
                    }.bind(this)
                });
                return;
            }

            this._loadDashboardData();
        },

        // YARDIMCI: API ÇAĞRISI

        _apiCall: function (sMethod, sEndpoint, oBody) {
            var oOptions = {
                method: sMethod,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("authToken")
                }
            };
            if (oBody) {
                oOptions.body = JSON.stringify(oBody);
            }
            return fetch(API_BASE + sEndpoint, oOptions).then(function (res) {
                return res.json();
            });
        },

        // VERİ YÜKLEME

        _loadDashboardData: function () {
            this._loadStats();
            this._loadActivities();
            this._loadMembers();
            this._loadEvents();
        },

        _loadStats: function () {
            var oDashboardModel = this.getView().getModel("dashboardData");

            this._apiCall("GET", "/stats")
                .then(function (data) {
                    if (data.success) {
                        oDashboardModel.setProperty("/stats", data.stats);
                    }
                })
                .catch(function () {
                    Promise.all([
                        fetch(API_BASE + "/donors",   { headers: { "Authorization": "Bearer " + localStorage.getItem("authToken") } }).then(r => r.json()),
                        fetch(API_BASE + "/students", { headers: { "Authorization": "Bearer " + localStorage.getItem("authToken") } }).then(r => r.json())
                    ]).then(function (results) {
                        var donors   = results[0].success ? results[0].donors   : [];
                        var students = results[1].success ? results[1].students : [];
                        var currentMonth = new Date().getMonth();

                        oDashboardModel.setProperty("/stats/totalDonors",         donors.length);
                        oDashboardModel.setProperty("/stats/totalStudents",        students.length);
                        oDashboardModel.setProperty("/stats/totalMembers",         donors.length + students.length);
                        oDashboardModel.setProperty("/stats/newDonorsThisMonth",   donors.filter(d => new Date(d.created_at).getMonth() === currentMonth).length);
                        oDashboardModel.setProperty("/stats/newStudentsThisMonth", students.filter(s => new Date(s.created_at).getMonth() === currentMonth).length);
                        oDashboardModel.setProperty("/stats/activeProjects",       23);
                        oDashboardModel.setProperty("/stats/completedProjects",    5);
                        oDashboardModel.setProperty("/stats/donationGrowth",       15);
                    });
                });
        },

        _loadActivities: function () {
            var that = this;
            var oDashboardModel = this.getView().getModel("dashboardData");

            this._apiCall("GET", "/activities?limit=10")
                .then(function (data) {
                    if (data.success && data.activities) {
                        var aFormatted = data.activities.map(function (a) {
                            var sIcon = "sap-icon://activity-individual";
                            if (a.action_type === "create_donor")   sIcon = "sap-icon://heart";
                            if (a.action_type === "create_student") sIcon = "sap-icon://study-leave";
                            if (a.action_type === "update_donor")   sIcon = "sap-icon://edit";
                            if (a.action_type === "update_student") sIcon = "sap-icon://edit";
                            if (a.action_type === "delete_donor")   sIcon = "sap-icon://delete";
                            if (a.action_type === "delete_student") sIcon = "sap-icon://delete";
                            if (a.action_type === "create_event")   sIcon = "sap-icon://appointment-2";
                            if (a.action_type === "update_event")   sIcon = "sap-icon://edit";
                            if (a.action_type === "delete_event")   sIcon = "sap-icon://delete";

                            return {
                                sender: a.admin_name || "Admin",
                                icon: sIcon,
                                text: a.action_description,
                                timestamp: that._formatTimestamp(a.created_at),
                                info: a.action_type.includes("donor")   ? "Bağışçı" :
                                      a.action_type.includes("student") ? "Öğrenci" : "Etkinlik"
                            };
                        });
                        oDashboardModel.setProperty("/recentActivities", aFormatted);
                    }
                })
                .catch(function () {
                    oDashboardModel.setProperty("/recentActivities", []);
                });
        },

        _loadMembers: function () {
            var that = this;
            var oDashboardModel = this.getView().getModel("dashboardData");

            Promise.all([
                this._apiCall("GET", "/donors"),
                this._apiCall("GET", "/students")
            ]).then(function (results) {
                var aMembers = [];

                if (results[0].success) {
                    results[0].donors.forEach(function (d) {
                        aMembers.push({
                            id: d.id,
                            first_name: d.first_name,
                            last_name: d.last_name,
                            email: d.email,
                            phone: d.phone || "-",
                            user_type: "donor",
                            status: d.status || "active",
                            created_at: new Date(d.created_at).toLocaleDateString('tr-TR'),
                            total_donated: d.total_donated || 0
                        });
                    });
                }

                if (results[1].success) {
                    results[1].students.forEach(function (s) {
                        aMembers.push({
                            id: s.id,
                            first_name: s.first_name,
                            last_name: s.last_name,
                            email: s.email,
                            phone: s.phone || "-",
                            user_type: "student",
                            status: s.status || "active",
                            created_at: new Date(s.created_at).toLocaleDateString('tr-TR'),
                            university: s.university || "-"
                        });
                    });
                }

                oDashboardModel.setProperty("/members", aMembers);
                oDashboardModel.setProperty("/stats/totalMembers", aMembers.length);

            }).catch(function (err) {
                console.error("Members load error:", err);
                MessageToast.show("Üyeler yüklenirken hata oluştu.");
            });
        },
        // TABLO ARAMA
        onSearchMembers: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            var oTable = this.byId("membersTable");
            var oBinding = oTable.getBinding("items");
            if (!oBinding) return;

            if (!sQuery) {
                oBinding.filter([]);
                return;
            }

            var aFilters = [
                new Filter("first_name", FilterOperator.Contains, sQuery),
                new Filter("last_name",  FilterOperator.Contains, sQuery),
                new Filter("email",      FilterOperator.Contains, sQuery),
                new Filter("phone",      FilterOperator.Contains, sQuery)
            ];
            oBinding.filter(new Filter({ filters: aFilters, and: false }));
        },
        // TAB SEÇİMİ

        onTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            if (sKey === "members") {
                this._loadMembers();
            } else if (sKey === "events") {
                this._loadEvents();
            } else if (sKey === "reports") {
                this._loadReportData();
            }
        },
        // BAĞIŞÇI EKLEME
        onAddDonor: function () {
            var oView = this.getView();
            var that  = this;

            if (!this._oDonorDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "edusupport.platform.view.fragments.DonorAddDialog",
                    controller: this
                }).then(function (oDialog) {
                    that._oDonorDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.setModel(new JSONModel({}), "donorModel");
                    oDialog.open();
                }).catch(function (err) {
                    MessageBox.error("Dialog yüklenemedi: " + err.message);
                });
            } else {
                this._oDonorDialog.getModel("donorModel").setData({});
                this._oDonorDialog.open();
            }
        },

        onSaveDonor: function () {
            var oView = this.getView();
            var that  = this;

            var sFirstName = oView.byId("donorFirstName").getValue().trim();
            var sLastName  = oView.byId("donorLastName").getValue().trim();
            var sEmail     = oView.byId("donorEmail").getValue().trim();
            var sPhone     = oView.byId("donorPhone").getValue().trim();
            var sCity      = oView.byId("donorCity") ? oView.byId("donorCity").getValue().trim() : "";

            if (!sFirstName || !sLastName || !sEmail || !sPhone) {
                MessageBox.error("Lütfen zorunlu alanları doldurun!");
                return;
            }

            this._oDonorDialog.setBusy(true);

            this._apiCall("POST", "/donors", {
                first_name: sFirstName,
                last_name:  sLastName,
                email:      sEmail,
                phone:      sPhone,
                city:       sCity
            }).then(function (data) {
                that._oDonorDialog.setBusy(false);

                if (data.success) {
                    var oDashboardModel = that.getView().getModel("dashboardData");
                    var aMembers = oDashboardModel.getProperty("/members") || [];
                    aMembers.unshift({
                        id:         data.donor.id,
                        first_name: data.donor.first_name,
                        last_name:  data.donor.last_name,
                        email:      data.donor.email,
                        phone:      data.donor.phone || "-",
                        user_type:  "donor",
                        status:     "active",
                        created_at: new Date().toLocaleDateString('tr-TR')
                    });
                    oDashboardModel.setProperty("/members", aMembers);
                    oDashboardModel.setProperty("/stats/totalDonors",  oDashboardModel.getProperty("/stats/totalDonors")  + 1);
                    oDashboardModel.setProperty("/stats/totalMembers", oDashboardModel.getProperty("/stats/totalMembers") + 1);
                    that._oDonorDialog.close();
                    MessageToast.show("Bağışçı başarıyla eklendi!");
                    setTimeout(function () { that._loadActivities(); that._loadStats(); }, 500);
                } else {
                    MessageBox.error(data.message || "Kayıt başarısız!");
                }
            }).catch(function () {
                that._oDonorDialog.setBusy(false);
                MessageBox.error("Sunucuya bağlanılamadı!");
            });
        },

        onCloseDonorDialog: function () {
            if (this._oDonorDialog) this._oDonorDialog.close();
        },
        // ÖĞRENCİ EKLEME
        onAddStudent: function () {
            var oView = this.getView();
            var that  = this;

            if (!this._oStudentDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "edusupport.platform.view.fragments.StudentAddDialog",
                    controller: this
                }).then(function (oDialog) {
                    that._oStudentDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.setModel(new JSONModel({}), "studentModel");
                    oDialog.open();
                }).catch(function (err) {
                    MessageBox.error("Dialog yüklenemedi: " + err.message);
                });
            } else {
                this._oStudentDialog.getModel("studentModel").setData({});
                this._oStudentDialog.open();
            }
        },

        onSaveStudent: function () {
            var oView = this.getView();
            var that  = this;

            var sFirstName  = oView.byId("studentFirstName").getValue().trim();
            var sLastName   = oView.byId("studentLastName").getValue().trim();
            var sTcNo       = oView.byId("studentTcNo")       ? oView.byId("studentTcNo").getValue().trim()       : "";
            var sBirthDate  = oView.byId("studentBirthDate")  ? oView.byId("studentBirthDate").getDateValue()     : null;
            var sEmail      = oView.byId("studentEmail").getValue().trim();
            var sPhone      = oView.byId("studentPhone").getValue().trim();
            var sCity       = oView.byId("studentCity")       ? oView.byId("studentCity").getValue().trim()       : "";
            var sAddress    = oView.byId("studentAddress")    ? oView.byId("studentAddress").getValue().trim()    : "";
            var sSchoolName = oView.byId("studentSchoolName") ? oView.byId("studentSchoolName").getValue().trim() : "";

            if (!sFirstName || !sLastName || !sEmail) {
                MessageBox.error("Lütfen zorunlu alanları doldurun!");
                return;
            }

            this._oStudentDialog.setBusy(true);

            this._apiCall("POST", "/students", {
                first_name:  sFirstName,
                last_name:   sLastName,
                tc_no:       sTcNo,
                birth_date:  sBirthDate ? sBirthDate.toISOString().split('T')[0] : null,
                email:       sEmail,
                phone:       sPhone,
                city:        sCity,
                address:     sAddress,
                school_name: sSchoolName
            }).then(function (data) {
                that._oStudentDialog.setBusy(false);

                if (data.success) {
                    var oDashboardModel = that.getView().getModel("dashboardData");
                    var aMembers = oDashboardModel.getProperty("/members") || [];
                    aMembers.unshift({
                        id:         data.student.id,
                        first_name: data.student.first_name,
                        last_name:  data.student.last_name,
                        email:      data.student.email,
                        phone:      data.student.phone || "-",
                        user_type:  "student",
                        status:     "active",
                        created_at: new Date().toLocaleDateString('tr-TR'),
                        university: sSchoolName || "-"
                    });
                    oDashboardModel.setProperty("/members", aMembers);
                    oDashboardModel.setProperty("/stats/totalStudents", oDashboardModel.getProperty("/stats/totalStudents") + 1);
                    oDashboardModel.setProperty("/stats/totalMembers",  oDashboardModel.getProperty("/stats/totalMembers")  + 1);
                    that._oStudentDialog.close();
                    MessageToast.show("Öğrenci başarıyla eklendi!");
                    setTimeout(function () { that._loadActivities(); that._loadStats(); }, 500);
                } else {
                    MessageBox.error(data.message || "Kayıt başarısız!");
                }
            }).catch(function () {
                that._oStudentDialog.setBusy(false);
                MessageBox.error("Sunucuya bağlanılamadı!");
            });
        },

        onCloseStudentDialog: function () {
            if (this._oStudentDialog) this._oStudentDialog.close();
        },

        // ÜYE DÜZENLEME

        onEditMember: function (oEvent) {
            var oItem    = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext("dashboardData");
            var oMember  = oContext.getObject();
            var that     = this;

            MessageBox.confirm(
                oMember.first_name + " " + oMember.last_name + " kaydını düzenlemek istiyor musunuz?\n\nDetaylı düzenleme formu yakında eklenecek.",
                {
                    title: "Üye Düzenle",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            var sEndpoint  = oMember.user_type === "donor" ? "/donors/" : "/students/";
                            var sNewStatus = oMember.status === "active" ? "inactive" : "active";

                            that._apiCall("PUT", sEndpoint + oMember.id, {
                                first_name: oMember.first_name,
                                last_name:  oMember.last_name,
                                phone:      oMember.phone,
                                status:     sNewStatus
                            }).then(function (data) {
                                if (data.success) {
                                    oContext.getModel().setProperty(oContext.getPath() + "/status", sNewStatus);
                                    MessageToast.show("Durum güncellendi: " + (sNewStatus === "active" ? "Aktif" : "Pasif"));
                                }
                            });
                        }
                    }
                }
            );
        },
        // ÜYE SİLME

        onDeleteMember: function (oEvent) {
            var oItem    = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext("dashboardData");
            var oMember  = oContext.getObject();
            var that     = this;

            MessageBox.confirm(
                oMember.first_name + " " + oMember.last_name + " kaydını silmek istediğinize emin misiniz?",
                {
                    title: "Üye Sil",
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            var sEndpoint = oMember.user_type === "donor"
                                ? "/donors/"  + oMember.id
                                : "/students/" + oMember.id;

                            that._apiCall("DELETE", sEndpoint).then(function (data) {
                                if (data.success) {
                                    var oDashboardModel = that.getView().getModel("dashboardData");
                                    var aMembers = oDashboardModel.getProperty("/members") || [];
                                    var aFiltered = aMembers.filter(function (m) { return m.id !== oMember.id; });
                                    oDashboardModel.setProperty("/members", aFiltered);
                                    oDashboardModel.setProperty("/stats/totalMembers", aFiltered.length);
                                    if (oMember.user_type === "donor") {
                                        oDashboardModel.setProperty("/stats/totalDonors", oDashboardModel.getProperty("/stats/totalDonors") - 1);
                                    } else {
                                        oDashboardModel.setProperty("/stats/totalStudents", oDashboardModel.getProperty("/stats/totalStudents") - 1);
                                    }
                                    MessageToast.show(oMember.first_name + " " + oMember.last_name + " silindi.");
                                    setTimeout(function () { that._loadActivities(); }, 500);
                                } else {
                                    MessageBox.error(data.message || "Silme işlemi başarısız!");
                                }
                            }).catch(function () {
                                MessageBox.error("Sunucuya bağlanılamadı!");
                            });
                        }
                    }
                }
            );
        },
        // ETKİNLİK YÖNETİMİ
        _loadEvents: function () {
            var that = this;
            var oDashboardModel = this.getView().getModel("dashboardData");

            this._apiCall("GET", "/events")
                .then(function (data) {
                    if (data.success) {
                        var aEvents = data.events.map(function (e) {
                            // Tarihi Türkçe formatla
                            if (e.event_date) {
                                var parts = e.event_date.split("-");
                                var months = ["", "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
                                e.event_date_tr = parseInt(parts[2]) + " " + months[parseInt(parts[1])] + " " + parts[0];
                            } else {
                                e.event_date_tr = "-";
                            }
                            return e;
                        });

                        oDashboardModel.setProperty("/events", aEvents);
                        oDashboardModel.setProperty("/stats/totalEvents", aEvents.length);

                        var planned   = aEvents.filter(function (e) { return e.status === "planned";   }).length;
                        var completed = aEvents.filter(function (e) { return e.status === "completed"; }).length;
                        var totalPart = aEvents.reduce(function (s, e) { return s + (e.registered_count || 0); }, 0);

                        oDashboardModel.setProperty("/eventStats/total",             aEvents.length);
                        oDashboardModel.setProperty("/eventStats/planned",           planned);
                        oDashboardModel.setProperty("/eventStats/completed",         completed);
                        oDashboardModel.setProperty("/eventStats/totalParticipants", totalPart);
                    }
                })
                .catch(function () {
                    MessageToast.show("Etkinlikler yüklenirken hata oluştu.");
                });
        },

        onFilterEvents: function () {
            var sStatus   = this.byId("eventFilterStatus")   ? this.byId("eventFilterStatus").getSelectedKey()   : "";
            var sCategory = this.byId("eventFilterCategory") ? this.byId("eventFilterCategory").getSelectedKey() : "";
            var oList     = this.byId("eventsList");
            var oBinding  = oList ? oList.getBinding("items") : null;
            if (!oBinding) return;

            var aFilters = [];
            if (sStatus)   aFilters.push(new Filter("status",   FilterOperator.EQ, sStatus));
            if (sCategory) aFilters.push(new Filter("category", FilterOperator.EQ, sCategory));
            oBinding.filter(aFilters.length ? new Filter({ filters: aFilters, and: true }) : []);
        },

        onAddEvent: function () {
            var oView = this.getView();
            var that  = this;

            var oDefaultData = {
                dialogTitle: "Yeni Etkinlik Ekle",
                title: "", description: "", event_date: "", event_time: "",
                end_date: "", end_time: "", location: "",
                category: "diger", capacity: 0, status: "planned",
                editMode: false, editId: null
            };

            if (!this._oEventDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "edusupport.platform.view.fragments.EventAddDialog",
                    controller: this
                }).then(function (oDialog) {
                    that._oEventDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.setModel(new JSONModel(oDefaultData), "eventModel");
                    oDialog.open();
                }).catch(function (err) {
                    MessageBox.error("Dialog yüklenemedi: " + err.message);
                });
            } else {
                this._oEventDialog.getModel("eventModel").setData(oDefaultData);
                this._oEventDialog.open();
            }
        },

        onEditEvent: function (oEvent) {
            var oSource  = oEvent.getSource();
            var oItem    = oSource.getParent().getParent().getParent();
            var oContext = oItem.getBindingContext("dashboardData");
            var oData    = Object.assign({}, oContext.getObject());
            var that     = this;

            oData.dialogTitle = "Etkinliği Düzenle";
            oData.editMode    = true;
            oData.editId      = oData.id;

            if (!this._oEventDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "edusupport.platform.view.fragments.EventAddDialog",
                    controller: this
                }).then(function (oDialog) {
                    that._oEventDialog = oDialog;
                    that.getView().addDependent(oDialog);
                    oDialog.setModel(new JSONModel(oData), "eventModel");
                    oDialog.open();
                });
            } else {
                this._oEventDialog.getModel("eventModel").setData(oData);
                this._oEventDialog.open();
            }
        },

        onSaveEvent: function () {
            var that      = this;
            var oModel    = this._oEventDialog.getModel("eventModel");
            var oData     = oModel.getData();

            var sTitle    = this.byId("eventTitle")    ? this.byId("eventTitle").getValue().trim()    : "";
            var sDate     = this.byId("eventDate")     ? this.byId("eventDate").getValue().trim()     : "";
            var sTime     = this.byId("eventTime")     ? this.byId("eventTime").getValue()            : "";
            var sEndDate  = this.byId("eventEndDate")  ? this.byId("eventEndDate").getValue()         : "";
            var sEndTime  = this.byId("eventEndTime")  ? this.byId("eventEndTime").getValue()         : "";
            var sDesc     = this.byId("eventDescription") ? this.byId("eventDescription").getValue() : "";
            var sLocation = this.byId("eventLocation") ? this.byId("eventLocation").getValue()       : "";
            var sCategory = this.byId("eventCategory") ? this.byId("eventCategory").getSelectedKey() : "diger";
            var nCapacity = this.byId("eventCapacity") ? this.byId("eventCapacity").getValue()       : 0;
            var sStatus   = this.byId("eventStatus")   ? this.byId("eventStatus").getSelectedKey()   : "planned";

            if (!sTitle || !sDate) {
                MessageBox.error("Etkinlik adı ve başlangıç tarihi zorunludur!");
                return;
            }

            this._oEventDialog.setBusy(true);

            var oPayload = {
                title: sTitle, description: sDesc, event_date: sDate,
                event_time: sTime, end_date: sEndDate, end_time: sEndTime,
                location: sLocation, category: sCategory,
                capacity: nCapacity, status: sStatus
            };

            var sMethod   = oData.editMode ? "PUT"  : "POST";
            var sEndpoint = oData.editMode ? "/events/" + oData.editId : "/events";

            this._apiCall(sMethod, sEndpoint, oPayload)
                .then(function (data) {
                    that._oEventDialog.setBusy(false);
                    if (data.success) {
                        that._oEventDialog.close();
                        that._loadEvents();
                        MessageToast.show(oData.editMode ? "Etkinlik güncellendi!" : "Etkinlik oluşturuldu!");
                        setTimeout(function () { that._loadActivities(); }, 500);
                    } else {
                        MessageBox.error(data.message || "İşlem başarısız!");
                    }
                })
                .catch(function () {
                    that._oEventDialog.setBusy(false);
                    MessageBox.error("Sunucuya bağlanılamadı!");
                });
        },

        onCloseEventDialog: function () {
            if (this._oEventDialog) this._oEventDialog.close();
        },

        onDeleteEvent: function (oEvent) {
            var oSource  = oEvent.getSource();
            var oItem    = oSource.getParent().getParent();
            var oContext = oItem.getBindingContext("dashboardData");
            var oEvt     = oContext.getObject();
            var that     = this;

            MessageBox.confirm(
                '"' + oEvt.title + '" etkinliğini silmek istediğinize emin misiniz?',
                {
                    title: "Etkinlik Sil",
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            that._apiCall("DELETE", "/events/" + oEvt.id)
                                .then(function (data) {
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
                }
            );
        },

        onViewParticipants: function (oEvent) {
            var oSource  = oEvent.getSource();
            var oItem    = oSource.getParent().getParent().getParent();
            var oContext = oItem.getBindingContext("dashboardData");
            var oEvt     = oContext.getObject();
            var that     = this;

            this._apiCall("GET", "/events/" + oEvt.id + "/participants")
                .then(function (data) {
                    var sMsg = '"' + oEvt.title + '" — Katılımcı Listesi\n\n';
                    if (!data.participants || data.participants.length === 0) {
                        sMsg += 'Henüz kayıtlı katılımcı yok.';
                    } else {
                        data.participants.forEach(function (p, i) {
                            var sName = (p.first_name && p.last_name)
                                ? p.first_name + " " + p.last_name
                                : p.user_name || "Misafir";
                            sMsg += (i + 1) + ". " + sName;
                            if (p.email || p.user_email) sMsg += " (" + (p.email || p.user_email) + ")";
                            sMsg += "\n";
                        });
                    }
                    MessageBox.information(sMsg, { title: "Katılımcılar (" + oEvt.registered_count + ")" });
                })
                .catch(function () {
                    MessageBox.error("Katılımcılar yüklenemedi!");
                });
        },
        // RAPOR VERİLERİNİ YÜKLEME

        _loadReportData: function () {
            var sPeriod = this.getView().getModel("reportData").getProperty("/selectedPeriod");
            this._loadReportSummary(sPeriod);
            this._loadDonationTrend(sPeriod);
            this._loadMemberGrowth(sPeriod);
            this._loadCategoryStats(sPeriod);
        },

        _loadReportSummary: function (sPeriod) {
            var that = this;
            var oReportModel = this.getView().getModel("reportData");

            this._apiCall("GET", "/reports/summary?period=" + sPeriod)
                .then(function (data) {
                    if (data.success) {
                        oReportModel.setProperty("/summary", {
                            totalDonations: (data.summary.totalDonations || 0).toLocaleString('tr-TR') + " ₺",
                            donationChange: (data.summary.donationChange > 0 ? "+" : "") + data.summary.donationChange + "%",
                            donationChangePositive: data.summary.donationChange >= 0,
                            newMembers: data.summary.newMembers || 0,
                            completedEvents: data.summary.completedEvents || 0,
                            totalParticipants: data.summary.totalParticipants || 0,
                            activeRate: (data.summary.activeRate || 0) + "%"
                        });
                    }
                })
                .catch(function () {
                    // Fallback: Hesapla
                    var oDashboardModel = that.getView().getModel("dashboardData");
                    var aMembers = oDashboardModel.getProperty("/members") || [];
                    var aEvents = oDashboardModel.getProperty("/events") || [];

                    var nDonors = aMembers.filter(m => m.user_type === "donor").length;
                    var nStudents = aMembers.filter(m => m.user_type === "student").length;
                    var nCompleted = aEvents.filter(e => e.status === "completed").length;
                    var nTotalPart = aEvents.reduce((sum, e) => sum + (e.registered_count || 0), 0);

                    oReportModel.setProperty("/summary", {
                        totalDonations: "0 ₺",
                        donationChange: "+0%",
                        donationChangePositive: true,
                        newMembers: nDonors + nStudents,
                        completedEvents: nCompleted,
                        totalParticipants: nTotalPart,
                        activeRate: "75%"
                    });
                });
        },

        _loadDonationTrend: function (sPeriod) {
            var that = this;
            var oReportModel = this.getView().getModel("reportData");

            this._apiCall("GET", "/reports/donation-trend?period=" + sPeriod)
                .then(function (data) {
                    if (data.success && data.trend) {
                        oReportModel.setProperty("/donationTrend", data.trend);
                        setTimeout(function () { that._renderDonationChart(); }, 100);
                    }
                })
                .catch(function () {
                    // Mock data
                    var aMockTrend = [
                        { month: "Ocak", amount: 15000 },
                        { month: "Şubat", amount: 18000 },
                        { month: "Mart", amount: 22000 },
                        { month: "Nisan", amount: 19000 },
                        { month: "Mayıs", amount: 25000 },
                        { month: "Haziran", amount: 28000 }
                    ];
                    oReportModel.setProperty("/donationTrend", aMockTrend);
                    setTimeout(function () { that._renderDonationChart(); }, 100);
                });
        },

        _loadMemberGrowth: function (sPeriod) {
            var that = this;
            var oReportModel = this.getView().getModel("reportData");

            this._apiCall("GET", "/reports/member-growth?period=" + sPeriod)
                .then(function (data) {
                    if (data.success && data.growth) {
                        oReportModel.setProperty("/memberGrowth", data.growth);
                        setTimeout(function () { that._renderMemberChart(); }, 100);
                    }
                })
                .catch(function () {
                    // Mock data
                    var aMockGrowth = [
                        { month: "Ocak", donors: 120, students: 80 },
                        { month: "Şubat", donors: 135, students: 85 },
                        { month: "Mart", donors: 142, students: 90 },
                        { month: "Nisan", donors: 148, students: 95 },
                        { month: "Mayıs", donors: 155, students: 98 },
                        { month: "Haziran", donors: 160, students: 102 }
                    ];
                    oReportModel.setProperty("/memberGrowth", aMockGrowth);
                    setTimeout(function () { that._renderMemberChart(); }, 100);
                });
        },

        _loadCategoryStats: function (sPeriod) {
            var oReportModel = this.getView().getModel("reportData");

            var aMockStats = [
                { category: "Eğitim", donorCount: 85, studentCount: 60, totalDonation: "125,000 ₺", avgDonation: "1,470 ₺", trend: "+12%", trendPositive: true },
                { category: "Sosyal", donorCount: 42, studentCount: 25, totalDonation: "68,000 ₺", avgDonation: "1,619 ₺", trend: "+8%", trendPositive: true },
                { category: "Sağlık", donorCount: 33, studentCount: 17, totalDonation: "45,000 ₺", avgDonation: "1,364 ₺", trend: "-3%", trendPositive: false }
            ];
            oReportModel.setProperty("/categoryStats", aMockStats);
        },

        // GRAFİK RENDER FONKSİYONLARI 
        _renderDonationChart: function () {
            var oReportModel = this.getView().getModel("reportData");
            var aTrend = oReportModel.getProperty("/donationTrend");

            if (!aTrend || aTrend.length === 0) return;

            var aLabels = aTrend.map(function (t) { return t.month; });
            var aData = aTrend.map(function (t) { return t.amount; });

            var canvas = document.getElementById("donationChart");
            if (!canvas) return;

            if (this._donationChartInstance) {
                this._donationChartInstance.destroy();
            }

            this._donationChartInstance = new Chart(canvas.getContext("2d"), {
                type: "line",
                data: {
                    labels: aLabels,
                    datasets: [{
                        label: "Bağış Tutarı (₺)",
                        data: aData,
                        borderColor: "#0070F2",
                        backgroundColor: "rgba(0, 112, 242, 0.1)",
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: "top" },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return context.parsed.y.toLocaleString('tr-TR') + " ₺";
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return value.toLocaleString('tr-TR') + " ₺";
                                }
                            }
                        }
                    }
                }
            });
        },

        _renderMemberChart: function () {
            var oReportModel = this.getView().getModel("reportData");
            var aGrowth = oReportModel.getProperty("/memberGrowth");

            if (!aGrowth || aGrowth.length === 0) return;

            var aLabels = aGrowth.map(function (g) { return g.month; });
            var aDonors = aGrowth.map(function (g) { return g.donors; });
            var aStudents = aGrowth.map(function (g) { return g.students; });

            var canvas = document.getElementById("memberChart");
            if (!canvas) return;

            if (this._memberChartInstance) {
                this._memberChartInstance.destroy();
            }

            this._memberChartInstance = new Chart(canvas.getContext("2d"), {
                type: "bar",
                data: {
                    labels: aLabels,
                    datasets: [
                        {
                            label: "Bağışçılar",
                            data: aDonors,
                            backgroundColor: "#10B981"
                        },
                        {
                            label: "Öğrenciler",
                            data: aStudents,
                            backgroundColor: "#F59E0B"
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: "top" }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        },
        // EVENT HANDLERS
        onChangePeriod: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            this.getView().getModel("reportData").setProperty("/selectedPeriod", sKey);
            this._loadReportData();
        },

        onRefreshReports: function () {
            this._loadReportData();
            MessageToast.show("Raporlar yenilendi!");
        },
        // EXCEL EXPORT FONKSİYONLARI
        onExportDonationTrend: function () {
            var that = this;
            MessageToast.show("Excel dosyası hazırlanıyor...");

            var oReportModel = this.getView().getModel("reportData");
            var aTrend = oReportModel.getProperty("/donationTrend");

            var aData = [["Ay", "Bağış Tutarı (₺)"]];
            aTrend.forEach(function (t) {
                aData.push([t.month, t.amount]);
            });

            this._generateExcelFile("Bağış_Trendi_" + new Date().toISOString().split('T')[0] + ".xlsx", aData);
        },

        onExportMemberGrowth: function () {
            MessageToast.show("Excel dosyası hazırlanıyor...");

            var oReportModel = this.getView().getModel("reportData");
            var aGrowth = oReportModel.getProperty("/memberGrowth");

            var aData = [["Ay", "Bağışçılar", "Öğrenciler"]];
            aGrowth.forEach(function (g) {
                aData.push([g.month, g.donors, g.students]);
            });

            this._generateExcelFile("Üye_Artışı_" + new Date().toISOString().split('T')[0] + ".xlsx", aData);
        },

        onExportDonorList: function () {
            var that = this;
            MessageToast.show("Bağışçı listesi hazırlanıyor...");

            this._apiCall("GET", "/donors")
                .then(function (data) {
                    if (data.success && data.donors) {
                        var aData = [["ID", "Ad", "Soyad", "Email", "Telefon", "Şehir", "Durum", "Kayıt Tarihi"]];
                        data.donors.forEach(function (d) {
                            aData.push([
                                d.id,
                                d.first_name,
                                d.last_name,
                                d.email,
                                d.phone || "-",
                                d.city || "-",
                                d.status === "active" ? "Aktif" : "Pasif",
                                new Date(d.created_at).toLocaleDateString('tr-TR')
                            ]);
                        });
                        that._generateExcelFile("Bağışçı_Listesi_" + new Date().toISOString().split('T')[0] + ".xlsx", aData);
                    }
                });
        },

        onExportStudentList: function () {
            var that = this;
            MessageToast.show("Öğrenci listesi hazırlanıyor...");

            this._apiCall("GET", "/students")
                .then(function (data) {
                    if (data.success && data.students) {
                        var aData = [["ID", "Ad", "Soyad", "Email", "Telefon", "Şehir", "Okul", "Durum", "Kayıt Tarihi"]];
                        data.students.forEach(function (s) {
                            aData.push([
                                s.id,
                                s.first_name,
                                s.last_name,
                                s.email,
                                s.phone || "-",
                                s.city || "-",
                                s.school_name || "-",
                                s.status === "active" ? "Aktif" : "Pasif",
                                new Date(s.created_at).toLocaleDateString('tr-TR')
                            ]);
                        });
                        that._generateExcelFile("Öğrenci_Listesi_" + new Date().toISOString().split('T')[0] + ".xlsx", aData);
                    }
                });
        },

        onExportEventReport: function () {
            var that = this;
            MessageToast.show("Etkinlik raporu hazırlanıyor...");

            this._apiCall("GET", "/events")
                .then(function (data) {
                    if (data.success && data.events) {
                        var aData = [["ID", "Başlık", "Kategori", "Tarih", "Saat", "Konum", "Kapasite", "Katılımcı", "Durum"]];
                        data.events.forEach(function (e) {
                            aData.push([
                                e.id,
                                e.title,
                                e.category,
                                e.event_date,
                                e.event_time || "-",
                                e.location || "-",
                                e.capacity || "Sınırsız",
                                e.registered_count || 0,
                                e.status === "active" ? "Aktif" : e.status === "completed" ? "Tamamlandı" : e.status === "planned" ? "Planlandı" : "İptal"
                            ]);
                        });
                        that._generateExcelFile("Etkinlik_Raporu_" + new Date().toISOString().split('T')[0] + ".xlsx", aData);
                    }
                });
        },

        onExportFinancialReport: function () {
            MessageToast.show("Mali rapor hazırlanıyor...");
            var oDashboardModel = this.getView().getModel("dashboardData");
            var stats = oDashboardModel.getProperty("/stats");

            var aData = [
                ["Mali Durum Özeti"],
                [""],
                ["Metrik", "Değer"],
                ["Toplam Bağışçı", stats.totalDonors || 0],
                ["Toplam Öğrenci", stats.totalStudents || 0],
                ["Toplam Bağış Tutarı (₺)", stats.totalDonationAmount || 0],
                ["Bu Ay Yeni Bağışçı", stats.newDonorsThisMonth || 0],
                ["Aktif Proje Sayısı", stats.activeProjects || 0],
                ["Tamamlanan Proje", stats.completedProjects || 0]
            ];

            this._generateExcelFile("Mali_Rapor_" + new Date().toISOString().split('T')[0] + ".xlsx", aData);
        },

        onExportExecutiveSummary: function () {
            MessageToast.show("Yönetim özet raporu hazırlanıyor...");
            var oDashboardModel = this.getView().getModel("dashboardData");
            var stats = oDashboardModel.getProperty("/stats");

            var aData = [
                ["Yönetim Kurulu Özet Raporu", ""],
                ["Rapor Tarihi:", new Date().toLocaleDateString('tr-TR')],
                [""],
                ["Kategori", "Değer"],
                ["Toplam Bağışçı", stats.totalDonors || 0],
                ["Toplam Öğrenci", stats.totalStudents || 0],
                ["Toplam Bağış (₺)", stats.totalDonationAmount || 0],
                ["Aktif Projeler", stats.activeProjects || 0],
                ["Büyüme Oranı (%)", stats.donationGrowth || 0]
            ];

            this._generateExcelFile("Yönetim_Özet_" + new Date().toISOString().split('T')[0] + ".xlsx", aData);
        },

        // PDF Export placeholders
        onExportDonorListPDF: function () {
            MessageToast.show("PDF export yakında aktif olacak!");
        },

        onExportStudentListPDF: function () {
            MessageToast.show("PDF export yakında aktif olacak!");
        },

        onExportEventReportPDF: function () {
            MessageToast.show("PDF export yakında aktif olacak!");
        },

        onExportFinancialReportPDF: function () {
            MessageToast.show("PDF export yakında aktif olacak!");
        },

        onExportExecutiveSummaryPDF: function () {
            MessageToast.show("PDF export yakında aktif olacak!");
        },
        // EXCEL OLUŞTURMA FONKSİYONU
        _generateExcelFile: function (sFileName, aData) {
            var that = this;

            // Backend'e istek at
            fetch(API_BASE + "/reports/generate-excel", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("authToken")
                },
                body: JSON.stringify({ data: aData, fileName: sFileName })
            })
            .then(function (res) {
                if (res.ok) {
                    return res.blob();
                }
                throw new Error("Export failed");
            })
            .then(function (blob) {
                // Download file
                var url = window.URL.createObjectURL(blob);
                var a = document.createElement("a");
                a.href = url;
                a.download = sFileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                MessageToast.show("Excel dosyası indirildi!");
            })
            .catch(function () {
                MessageToast.show("Excel oluşturulamadı. Lütfen tekrar deneyin.");
            });
        },
        // MUHASEBE YÖNETİMİ 
        _loadPayments: function () {
    var that = this;
    var oDashboardModel = this.getView().getModel("dashboardData");

    Promise.all([
        this._apiCall("GET", "/payments"),
        this._apiCall("GET", "/payments/stats")
    ]).then(function (results) {
        if (results[0].success) {
            var aPayments = results[0].payments.map(function (p) {
                if (p.payment_date) {
                    p.payment_date = new Date(p.payment_date).toLocaleDateString('tr-TR');
                } else if (p.due_date) {
                    p.due_date = new Date(p.due_date).toLocaleDateString('tr-TR');
                }
                return p;
            });
            oDashboardModel.setProperty("/payments", aPayments);
        }

        if (results[1].success) {
            oDashboardModel.setProperty("/paymentStats", results[1].stats);
        }
    }).catch(function () {
        MessageToast.show("Ödemeler yüklenirken hata oluştu.");
    });
        },

        onFilterPayments: function () {
    var sStatus  = this.byId("paymentFilterStatus") ? this.byId("paymentFilterStatus").getSelectedKey() : "";
    var oTable   = this.byId("paymentsTable");
    var oBinding = oTable ? oTable.getBinding("items") : null;
    if (!oBinding) return;

    var aFilters = [];
    if (sStatus) aFilters.push(new Filter("status", FilterOperator.EQ, sStatus));
    oBinding.filter(aFilters);
        },

        onAddPayment: function () {
    var oView = this.getView();
    var that  = this;

    var oDefaultData = {
        user_id: null,
        payment_type: "aidat",
        amount: 500,
        status: "odendi",
        payment_date: "",
        due_date: "",
        payment_method: "",
        notes: ""
    };

    if (!this._oPaymentDialog) {
        Fragment.load({
            id: oView.getId(),
            name: "edusupport.platform.view.fragments.PaymentAddDialog",
            controller: this
        }).then(function (oDialog) {
            that._oPaymentDialog = oDialog;
            oView.addDependent(oDialog);
            oDialog.setModel(new JSONModel(oDefaultData), "paymentModel");
            oDialog.open();
        }).catch(function (err) {
            MessageBox.error("Dialog yüklenemedi: " + err.message);
        });
    } else {
        this._oPaymentDialog.getModel("paymentModel").setData(oDefaultData);
        this._oPaymentDialog.open();
    }
        },

        onSavePayment: function () {
    var that       = this;
    var oModel     = this._oPaymentDialog.getModel("paymentModel");
    var oData      = oModel.getData();

    var nUserId    = this.byId("paymentUserId")   ? this.byId("paymentUserId").getSelectedKey()   : oData.user_id;
    var sType      = this.byId("paymentType")     ? this.byId("paymentType").getSelectedKey()     : oData.payment_type;
    var nAmount    = this.byId("paymentAmount")   ? this.byId("paymentAmount").getValue()         : oData.amount;
    var sStatus    = this.byId("paymentStatus")   ? this.byId("paymentStatus").getSelectedKey()   : oData.status;
    var sDate      = this.byId("paymentDate")     ? this.byId("paymentDate").getValue()           : oData.payment_date;
    var sDueDate   = this.byId("paymentDueDate")  ? this.byId("paymentDueDate").getValue()        : oData.due_date;
    var sMethod    = this.byId("paymentMethod")   ? this.byId("paymentMethod").getSelectedKey()   : oData.payment_method;
    var sNotes     = this.byId("paymentNotes")    ? this.byId("paymentNotes").getValue()          : oData.notes;

    if (!nUserId || !sType || !nAmount) {
        MessageBox.error("Üye, ödeme tipi ve tutar zorunludur!");
        return;
    }

    this._oPaymentDialog.setBusy(true);

    var oPayload = {
        user_id: nUserId,
        payment_type: sType,
        amount: nAmount,
        status: sStatus,
        payment_date: sDate,
        due_date: sDueDate,
        payment_method: sMethod,
        notes: sNotes
    };

    this._apiCall("POST", "/payments", oPayload)
        .then(function (data) {
            that._oPaymentDialog.setBusy(false);
            if (data.success) {
                that._oPaymentDialog.close();
                that._loadPayments();
                MessageToast.show("Ödeme kaydedildi!");
                setTimeout(function () { that._loadActivities(); }, 500);
            } else {
                MessageBox.error(data.message || "Kayıt başarısız!");
            }
        })
        .catch(function () {
            that._oPaymentDialog.setBusy(false);
            MessageBox.error("Sunucuya bağlanılamadı!");
        });
        },

        onClosePaymentDialog: function () {
    if (this._oPaymentDialog) this._oPaymentDialog.close();
        },

        onDeletePayment: function (oEvent) {
    var oSource  = oEvent.getSource();
    var oItem    = oSource.getParent().getParent();
    var oContext = oItem.getBindingContext("dashboardData");
    var oPayment = oContext.getObject();
    var that     = this;

    MessageBox.confirm(
        oPayment.first_name + " " + oPayment.last_name + " için " + oPayment.amount + "₺ kaydını silmek istediğinize emin misiniz?",
        {
            title: "Ödeme Sil",
            onClose: function (oAction) {
                if (oAction === MessageBox.Action.OK) {
                    that._apiCall("DELETE", "/payments/" + oPayment.id)
                        .then(function (data) {
                            if (data.success) {
                                that._loadPayments();
                                MessageToast.show("Ödeme silindi.");
                            } else {
                                MessageBox.error(data.message || "Silme başarısız!");
                            }
                        });
                }
            }
        }
    );
        },

        // DİĞER İŞLEVLER
        onAddMember: function () {
            var that = this;
            MessageBox.confirm("Hangi tip üye eklemek istiyorsunuz?", {
                title: "Üye Tipi Seç",
                actions: ["Bağışçı", "Öğrenci", MessageBox.Action.CANCEL],
                onClose: function (oAction) {
                    if (oAction === "Bağışçı") that.onAddDonor();
                    if (oAction === "Öğrenci") that.onAddStudent();
                }
            });
        },

        onAddDonation: function () {
            MessageToast.show("Bağış kaydetme formu yakında aktif olacak!");
        },

        onGenerateReport: function () {
            MessageToast.show("Rapor oluşturuluyor...");
        },

        onRefresh: function () {
            var oDashboardModel = this.getView().getModel("dashboardData");
            oDashboardModel.setProperty("/lastUpdate", new Date().toLocaleString('tr-TR'));
            this._loadDashboardData();
            MessageToast.show("Veriler yenilendi!");
        },

        onSettings: function () {
            MessageToast.show("Ayarlar yakında aktif olacak!");
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("home", {}, true);
            }
        },

        _formatTimestamp: function (timestamp) {
            if (!timestamp) return "Bilinmiyor";
            var date      = new Date(timestamp);
            var now       = new Date();
            var diffMs    = now - date;
            var diffMins  = Math.floor(diffMs / 60000);
            var diffHours = Math.floor(diffMins / 60);
            var diffDays  = Math.floor(diffHours / 24);

            if (diffMins  < 1)  return "Az önce";
            if (diffMins  < 60) return diffMins  + " dakika önce";
            if (diffHours < 24) return diffHours + " saat önce";
            if (diffDays  < 7)  return diffDays  + " gün önce";
            return date.toLocaleDateString('tr-TR');
        },
                
        });
        });