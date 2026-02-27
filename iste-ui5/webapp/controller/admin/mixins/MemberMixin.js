sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (MessageBox, MessageToast, Filter, FilterOperator) {
    "use strict";

    /**
     * MemberMixin
     * Kapsam: Bağışçı & Öğrenci CRUD işlemleri + tablo arama
     */
    return {

        // ─────────────────────────────────────────────────────────────
        // VERİ YÜKLEME
        // ─────────────────────────────────────────────────────────────

        _loadMembers: function () {
            var that   = this;
            var oModel = this.getModel("dashboardData");

            Promise.all([
                this._apiCall("GET", "/donors"),
                this._apiCall("GET", "/students")
            ]).then(function (results) {
                var aMembers = [];

                if (results[0].success) {
                    results[0].donors.forEach(function (d) {
                        aMembers.push({
                            id:           d.id,
                            first_name:   d.first_name,
                            last_name:    d.last_name,
                            email:        d.email,
                            phone:        d.phone || "-",
                            user_type:    "donor",
                            status:       d.status || "active",
                            created_at:   new Date(d.created_at).toLocaleDateString("tr-TR"),
                            total_donated: d.total_donated || 0
                        });
                    });
                }

                if (results[1].success) {
                    results[1].students.forEach(function (s) {
                        aMembers.push({
                            id:         s.id,
                            first_name: s.first_name,
                            last_name:  s.last_name,
                            email:      s.email,
                            phone:      s.phone || "-",
                            user_type:  "student",
                            status:     s.status || "active",
                            created_at: new Date(s.created_at).toLocaleDateString("tr-TR"),
                            university: s.university || "-"
                        });
                    });
                }

                oModel.setProperty("/members", aMembers);
                oModel.setProperty("/stats/totalMembers", aMembers.length);

            }).catch(function () {
                MessageToast.show("Üyeler yüklenirken hata oluştu.");
            });
        },

        // ─────────────────────────────────────────────────────────────
        // TABLO ARAMA
        // ─────────────────────────────────────────────────────────────

        onSearchMembers: function (oEvent) {
            var sQuery   = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            var oBinding = this.byId("membersTable").getBinding("items");
            if (!oBinding) return;

            if (!sQuery) {
                oBinding.filter([]);
                return;
            }

            oBinding.filter(new Filter({
                filters: [
                    new Filter("first_name", FilterOperator.Contains, sQuery),
                    new Filter("last_name",  FilterOperator.Contains, sQuery),
                    new Filter("email",      FilterOperator.Contains, sQuery),
                    new Filter("phone",      FilterOperator.Contains, sQuery)
                ],
                and: false
            }));
        },

        // ─────────────────────────────────────────────────────────────
        // ÜYE TİPİ SEÇİMİ
        // ─────────────────────────────────────────────────────────────

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

        // ─────────────────────────────────────────────────────────────
        // BAĞIŞÇI EKLEME
        // ─────────────────────────────────────────────────────────────

        onAddDonor: function () {
            this._openDialog(
                "_oDonorDialog",
                "edusupport.platform.view.fragments.DonorAddDialog",
                "donorModel",
                { first_name: "", last_name: "", email: "", phone: "", city: "" }
            );
        },

        onSaveDonor: function () {
            var that  = this;
            var oView = this.getView();

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
                first_name: sFirstName, last_name: sLastName,
                email: sEmail, phone: sPhone, city: sCity
            }).then(function (data) {
                that._oDonorDialog.setBusy(false);

                if (data.success) {
                    var oModel   = that.getModel("dashboardData");
                    var aMembers = oModel.getProperty("/members") || [];

                    aMembers.unshift({
                        id:           data.donor.id,
                        first_name:   data.donor.first_name,
                        last_name:    data.donor.last_name,
                        email:        data.donor.email,
                        phone:        data.donor.phone || "-",
                        user_type:    "donor",
                        status:       "active",
                        created_at:   new Date().toLocaleDateString("tr-TR")
                    });

                    oModel.setProperty("/members", aMembers);
                    oModel.setProperty("/stats/totalDonors",
                        oModel.getProperty("/stats/totalDonors") + 1);
                    oModel.setProperty("/stats/totalMembers",
                        oModel.getProperty("/stats/totalMembers") + 1);

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

        // ─────────────────────────────────────────────────────────────
        // ÖĞRENCİ EKLEME
        // ─────────────────────────────────────────────────────────────

        onAddStudent: function () {
            this._openDialog(
                "_oStudentDialog",
                "edusupport.platform.view.fragments.StudentAddDialog",
                "studentModel",
                { first_name: "", last_name: "", email: "", phone: "",
                  city: "", address: "", school_name: "", tc_no: "" }
            );
        },

        onSaveStudent: function () {
            var that  = this;
            var oView = this.getView();

            var sFirstName  = oView.byId("studentFirstName").getValue().trim();
            var sLastName   = oView.byId("studentLastName").getValue().trim();
            var sEmail      = oView.byId("studentEmail").getValue().trim();
            var sPhone      = oView.byId("studentPhone").getValue().trim();
            var sTcNo       = oView.byId("studentTcNo")       ? oView.byId("studentTcNo").getValue().trim()       : "";
            var sCity       = oView.byId("studentCity")       ? oView.byId("studentCity").getValue().trim()       : "";
            var sAddress    = oView.byId("studentAddress")    ? oView.byId("studentAddress").getValue().trim()    : "";
            var sSchoolName = oView.byId("studentSchoolName") ? oView.byId("studentSchoolName").getValue().trim() : "";
            var oBirthDate  = oView.byId("studentBirthDate")  ? oView.byId("studentBirthDate").getDateValue()     : null;

            if (!sFirstName || !sLastName || !sEmail) {
                MessageBox.error("Lütfen zorunlu alanları doldurun!");
                return;
            }

            this._oStudentDialog.setBusy(true);

            this._apiCall("POST", "/students", {
                first_name:  sFirstName,
                last_name:   sLastName,
                tc_no:       sTcNo,
                birth_date:  oBirthDate ? oBirthDate.toISOString().split("T")[0] : null,
                email:       sEmail,
                phone:       sPhone,
                city:        sCity,
                address:     sAddress,
                school_name: sSchoolName
            }).then(function (data) {
                that._oStudentDialog.setBusy(false);

                if (data.success) {
                    var oModel   = that.getModel("dashboardData");
                    var aMembers = oModel.getProperty("/members") || [];

                    aMembers.unshift({
                        id:         data.student.id,
                        first_name: data.student.first_name,
                        last_name:  data.student.last_name,
                        email:      data.student.email,
                        phone:      data.student.phone || "-",
                        user_type:  "student",
                        status:     "active",
                        university: sSchoolName || "-",
                        created_at: new Date().toLocaleDateString("tr-TR")
                    });

                    oModel.setProperty("/members", aMembers);
                    oModel.setProperty("/stats/totalStudents",
                        oModel.getProperty("/stats/totalStudents") + 1);
                    oModel.setProperty("/stats/totalMembers",
                        oModel.getProperty("/stats/totalMembers") + 1);

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

        // ─────────────────────────────────────────────────────────────
        // ÜYE DÜZENLEME
        // ─────────────────────────────────────────────────────────────

        onEditMember: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent()
                              .getBindingContext("dashboardData");
            var oMember  = oContext.getObject();
            var that     = this;

            MessageBox.confirm(
                oMember.first_name + " " + oMember.last_name + " kaydını düzenlemek istiyor musunuz?\n\nDurum aktif ↔ pasif olarak değiştirilecek.",
                {
                    title: "Üye Düzenle",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction !== MessageBox.Action.OK) return;

                        var sEndpoint  = "/" + (oMember.user_type === "donor" ? "donors" : "students") + "/" + oMember.id;
                        var sNewStatus = oMember.status === "active" ? "inactive" : "active";

                        that._apiCall("PUT", sEndpoint, {
                            first_name: oMember.first_name,
                            last_name:  oMember.last_name,
                            phone:      oMember.phone,
                            status:     sNewStatus
                        }).then(function (data) {
                            if (data.success) {
                                oContext.getModel().setProperty(
                                    oContext.getPath() + "/status", sNewStatus
                                );
                                MessageToast.show(
                                    "Durum güncellendi: " + (sNewStatus === "active" ? "Aktif" : "Pasif")
                                );
                            }
                        });
                    }
                }
            );
        },

        // ─────────────────────────────────────────────────────────────
        // ÜYE SİLME
        // ─────────────────────────────────────────────────────────────

        onDeleteMember: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent()
                              .getBindingContext("dashboardData");
            var oMember  = oContext.getObject();
            var that     = this;

            MessageBox.confirm(
                oMember.first_name + " " + oMember.last_name + " kaydını silmek istediğinize emin misiniz?",
                {
                    title: "Üye Sil",
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (oAction) {
                        if (oAction !== MessageBox.Action.OK) return;

                        var sEndpoint = "/" + (oMember.user_type === "donor" ? "donors" : "students") + "/" + oMember.id;

                        that._apiCall("DELETE", sEndpoint).then(function (data) {
                            if (data.success) {
                                var oModel    = that.getModel("dashboardData");
                                var aFiltered = (oModel.getProperty("/members") || [])
                                    .filter(function (m) { return m.id !== oMember.id; });

                                oModel.setProperty("/members", aFiltered);
                                oModel.setProperty("/stats/totalMembers", aFiltered.length);

                                var sStatKey = oMember.user_type === "donor"
                                    ? "/stats/totalDonors" : "/stats/totalStudents";
                                oModel.setProperty(sStatKey,
                                    oModel.getProperty(sStatKey) - 1);

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
            );
        }
    };
});
