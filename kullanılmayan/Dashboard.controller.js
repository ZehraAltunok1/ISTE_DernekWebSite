sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, MessageBox, MessageToast, History, Fragment) {
    "use strict";

    return Controller.extend("edusupport.platform.controller.admin.Dashboard", {

        onInit: function () {
            console.log("📊 Dashboard initialized");
            
            // Token kontrolü
            const token = localStorage.getItem("authToken");
            if (!token) {
                this.getOwnerComponent().getRouter().navTo("home");
                return;
            }

            // Dashboard verilerini yükle
            this._loadDashboardData();

            // Router'a bağlan
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("adminDashboard").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            console.log("🎯 Dashboard route matched");
            
            // Admin kontrolü
            var oAppData = this.getOwnerComponent().getModel("appData");
            var oUser = oAppData.getProperty("/currentUser");
            
            if (!oUser) {
                // localStorage'dan yükle
                var sUserData = localStorage.getItem("userData");
                if (sUserData) {
                    try {
                        oUser = JSON.parse(sUserData);
                        oAppData.setProperty("/currentUser", oUser);
                        oAppData.setProperty("/isAuthenticated", true);
                    } catch (e) {
                        console.error("Error parsing user data:", e);
                    }
                }
            }
            
            if (!oUser || (oUser.role !== "admin" && oUser.type !== "admin")) {
                MessageBox.error("Bu alana erişim yetkiniz yok!", {
                    onClose: () => {
                        this.getOwnerComponent().getRouter().navTo("home");
                    }
                });
                return;
            }
            
            console.log("✅ Admin Dashboard loaded for:", oUser.first_name || oUser.full_name);
        },

        _loadDashboardData: function () {
            // Dashboard için mock data veya API'den veri çek
            var oDashboardModel = new JSONModel({
                lastUpdate: new Date().toLocaleString('tr-TR'),
                stats: {
                    totalDonors: 245,
                    newDonorsThisMonth: 12,
                    totalStudents: 158,
                    newStudentsThisMonth: 8,
                    totalDonationAmount: "1.245.000",
                    donationGrowth: 15,
                    activeProjects: 23,
                    completedProjects: 5,
                    totalMembers: 403
                },
                recentActivities: [
                    {
                        sender: "Ahmet Yılmaz",
                        icon: "sap-icon://heart",
                        text: "5,000 ₺ bağış yaptı",
                        timestamp: "2 saat önce",
                        info: "Bağış"
                    }
                ]
            });
            
            this.getView().setModel(oDashboardModel, "dashboardData");
        },

        // ==========================================
        // NAVIGATION
        // ==========================================

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("home", {}, true);
            }
        },
        
        onLogout: function () {
            MessageBox.confirm("Çıkış yapmak istediğinize emin misiniz?", {
                title: "Çıkış Yap",
                onClose: (oAction) => {
                    if (oAction === MessageBox.Action.OK) {
                        localStorage.removeItem("authToken");
                        localStorage.removeItem("userData");
                        
                        var oAppData = this.getOwnerComponent().getModel("appData");
                        oAppData.setProperty("/isAuthenticated", false);
                        oAppData.setProperty("/currentUser", null);
                        
                        MessageToast.show("Çıkış yapıldı!");
                        
                        setTimeout(() => {
                            this.getOwnerComponent().getRouter().navTo("home");
                        }, 500);
                    }
                }
            });
        },

        // ==========================================
        // QUICK ACTIONS
        // ==========================================

        onRefresh: function () {
            MessageToast.show("♻️ Veriler yenileniyor...");
            this._loadDashboardData();
            MessageToast.show("✅ Veriler güncellendi!");
        },

        onSettings: function () {
            MessageToast.show("⚙️ Ayarlar sayfası yakında aktif olacak!");
        },

// ==========================================
// BAĞIŞÇI EKLEME
// ==========================================

onAddDonor: function () {
    console.log("➕ Bağışçı ekleme dialog'u açılıyor...");
    var oView = this.getView();

    // Dialog zaten açıksa
    if (!this._oDonorDialog) {
        Fragment.load({
            id: oView.getId(),
            name: "edusupport.platform.view.fragments.DonorAddDialog",
            controller: this
        }).then(function (oDialog) {
            this._oDonorDialog = oDialog;
            oView.addDependent(oDialog);
            oDialog.open();
        }.bind(this));
    } else {
        this._oDonorDialog.open();
    }
},

onSaveDonor: function () {
    console.log("💾 Bağışçı kaydediliyor...");
    
    var oView = this.getView();
    
    // Input değerlerini al
    var sFirstName = oView.byId("donorFirstName").getValue().trim();
    var sLastName = oView.byId("donorLastName").getValue().trim();
    var sEmail = oView.byId("donorEmail").getValue().trim();
    var sPhone = oView.byId("donorPhone").getValue().trim();
    var sCity = oView.byId("donorCity").getValue().trim();
    var sDonationType = oView.byId("donorDonationType").getSelectedKey();
    var sAmount = oView.byId("donorAmount").getValue();

    // Validasyon
    if (!sFirstName || !sLastName || !sEmail || !sPhone) {
        MessageBox.error("Lütfen zorunlu alanları doldurun!\n\nZorunlu: Ad, Soyad, Email, Telefon");
        return;
    }

    // Email format kontrolü
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sEmail)) {
        MessageBox.error("Geçerli bir email adresi girin!");
        return;
    }

    // Dialog'u busy yap
    this._oDonorDialog.setBusy(true);

    // API'ye gönder
    var oDonorData = {
        first_name: sFirstName,
        last_name: sLastName,
        email: sEmail,
        phone: sPhone,
        city: sCity,
        donation_type: sDonationType || 'monthly',
        donation_amount: parseFloat(sAmount) || 0
    };

    fetch("http://localhost:3000/api/donors", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("authToken")
        },
        body: JSON.stringify(oDonorData)
    })
    .then(response => response.json())
    .then(data => {
        this._oDonorDialog.setBusy(false);
        
        if (data.success) {
            console.log("✅ Bağışçı kaydedildi:", data);
            
            MessageBox.success(
                "Bağışçı başarıyla kaydedildi!\n\n" +
                "Ad Soyad: " + sFirstName + " " + sLastName + "\n" +
                "Email: " + sEmail + "\n" +
                "Şifre: " + data.password + "\n\n" +
                "Giriş bilgileri email ile gönderildi.",
                {
                    title: "Başarılı",
                    onClose: () => {
                        this._oDonorDialog.close();
                        
                        // Formu temizle
                        oView.byId("donorFirstName").setValue("");
                        oView.byId("donorLastName").setValue("");
                        oView.byId("donorEmail").setValue("");
                        oView.byId("donorPhone").setValue("");
                        oView.byId("donorCity").setValue("");
                        
                        // Dashboard'u yenile
                        this._loadDashboardData();
                    }
                }
            );
        } else {
            console.error("❌ Bağışçı kaydetme hatası:", data.message);
            MessageBox.error(data.message || "Kayıt başarısız!");
        }
    })
    .catch(error => {
        console.error("❌ Donor save error:", error);
        this._oDonorDialog.setBusy(false);
        MessageBox.error("Sunucuya bağlanılamadı! Backend çalışıyor mu?");
    });
},

onCloseDonorDialog: function () {
    if (this._oDonorDialog) {
        this._oDonorDialog.close();
    }
},

// ==========================================
// ÖĞRENCİ EKLEME
// ==========================================

onAddStudent: function () {
    console.log("➕ Öğrenci ekleme dialog'u açılıyor...");
    var oView = this.getView();

    if (!this._oStudentDialog) {
        Fragment.load({
            id: oView.getId(),
            name: "edusupport.platform.view.fragments.StudentAddDialog",
            controller: this
        }).then(function (oDialog) {
            this._oStudentDialog = oDialog;
            oView.addDependent(oDialog);
            oDialog.open();
        }.bind(this));
    } else {
        this._oStudentDialog.open();
    }
},

onSaveStudent: function () {
    console.log("💾 Öğrenci kaydediliyor...");
    
    var oView = this.getView();
    
    // Input değerlerini al
    var sFirstName = oView.byId("studentFirstName").getValue().trim();
    var sLastName = oView.byId("studentLastName").getValue().trim();
    var sTcNo = oView.byId("studentTcNo").getValue().trim();
    var sBirthDate = oView.byId("studentBirthDate").getDateValue();
    var sEmail = oView.byId("studentEmail").getValue().trim();
    var sPhone = oView.byId("studentPhone").getValue().trim();
    var sCity = oView.byId("studentCity").getValue().trim();
    var sAddress = oView.byId("studentAddress").getValue().trim();
    var sSchoolName = oView.byId("studentSchoolName").getValue().trim();

    // Validasyon
    if (!sFirstName || !sLastName || !sTcNo || !sBirthDate || !sEmail || 
        !sPhone || !sCity || !sAddress || !sSchoolName) {
        MessageBox.error("Lütfen tüm zorunlu alanları doldurun!");
        return;
    }

    // TC No kontrolü
    if (sTcNo.length !== 11) {
        MessageBox.error("TC Kimlik No 11 haneli olmalıdır!");
        return;
    }

    // Email format kontrolü
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sEmail)) {
        MessageBox.error("Geçerli bir email adresi girin!");
        return;
    }

    // Dialog'u busy yap
    this._oStudentDialog.setBusy(true);

    // Tarihi formatla
    var sFormattedDate = sBirthDate.toISOString().split('T')[0];

    // API'ye gönder
    var oStudentData = {
        first_name: sFirstName,
        last_name: sLastName,
        tc_no: sTcNo,
        birth_date: sFormattedDate,
        email: sEmail,
        phone: sPhone,
        city: sCity,
        address: sAddress,
        school_name: sSchoolName,
        district: "",
        gender: "male",
        school_type: "university"
    };

    fetch("http://localhost:3000/api/students", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("authToken")
        },
        body: JSON.stringify(oStudentData)
    })
    .then(response => response.json())
    .then(data => {
        this._oStudentDialog.setBusy(false);
        
        if (data.success) {
            console.log("✅ Öğrenci kaydedildi:", data);
            
            MessageBox.success(
                "Öğrenci başarıyla kaydedildi!\n\n" +
                "Ad Soyad: " + sFirstName + " " + sLastName + "\n" +
                "Email: " + sEmail + "\n" +
                "Şifre: " + data.password,
                {
                    title: "Başarılı",
                    onClose: () => {
                        this._oStudentDialog.close();
                        
                        // Formu temizle
                        oView.byId("studentFirstName").setValue("");
                        oView.byId("studentLastName").setValue("");
                        oView.byId("studentTcNo").setValue("");
                        oView.byId("studentEmail").setValue("");
                        oView.byId("studentPhone").setValue("");
                        
                        // Dashboard'u yenile
                        this._loadDashboardData();
                    }
                }
            );
        } else {
            console.error("❌ Öğrenci kaydetme hatası:", data.message);
            MessageBox.error(data.message || "Kayıt başarısız!");
        }
    })
    .catch(error => {
        console.error("❌ Student save error:", error);
        this._oStudentDialog.setBusy(false);
        MessageBox.error("Sunucuya bağlanılamadı! Backend çalışıyor mu?");
    });
},

onCloseStudentDialog: function () {
    if (this._oStudentDialog) {
        this._oStudentDialog.close();
    }
}

    });
});