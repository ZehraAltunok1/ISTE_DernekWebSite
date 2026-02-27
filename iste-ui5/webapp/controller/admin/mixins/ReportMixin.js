sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (MessageBox, MessageToast) {
    "use strict";

    /**
     * ReportMixin
     * Kapsam: Rapor verileri yükleme, Chart.js grafik render, Excel/PDF export
     */
    return {

        // ─────────────────────────────────────────────────────────────
        // ANA YÜKLEME
        // ─────────────────────────────────────────────────────────────

        _loadReportData: function () {
            var sPeriod = this.getModel("reportData").getProperty("/selectedPeriod");
            this._loadReportSummary(sPeriod);
            this._loadDonationTrend(sPeriod);
            this._loadMemberGrowth(sPeriod);
            this._loadCategoryStats(sPeriod);
        },

        // ─────────────────────────────────────────────────────────────
        // ÖZET İSTATİSTİKLER
        // ─────────────────────────────────────────────────────────────

        _loadReportSummary: function (sPeriod) {
            var that         = this;
            var oReportModel = this.getModel("reportData");

            this._apiCall("GET", "/reports/summary?period=" + sPeriod)
                .then(function (data) {
                    if (!data.success) return;
                    var s = data.summary;
                    oReportModel.setProperty("/summary", {
                        totalDonations:         (s.totalDonations  || 0).toLocaleString("tr-TR") + " ₺",
                        donationChange:         (s.donationChange  > 0 ? "+" : "") + s.donationChange + "%",
                        donationChangePositive: s.donationChange  >= 0,
                        newMembers:             s.newMembers       || 0,
                        completedEvents:        s.completedEvents  || 0,
                        totalParticipants:      s.totalParticipants|| 0,
                        activeRate:             (s.activeRate      || 0) + "%"
                    });
                })
                .catch(function () {
                    // Fallback — dashboard verisinden hesapla
                    var oModel     = that.getModel("dashboardData");
                    var aMembers   = oModel.getProperty("/members") || [];
                    var aEvents    = oModel.getProperty("/events")  || [];
                    var nCompleted = aEvents.filter(function (e) { return e.status === "completed"; }).length;
                    var nTotalPart = aEvents.reduce(function (s, e) { return s + (e.registered_count || 0); }, 0);

                    oReportModel.setProperty("/summary", {
                        totalDonations:         "0 ₺",
                        donationChange:         "+0%",
                        donationChangePositive: true,
                        newMembers:             aMembers.length,
                        completedEvents:        nCompleted,
                        totalParticipants:      nTotalPart,
                        activeRate:             "75%"
                    });
                });
        },

        // ─────────────────────────────────────────────────────────────
        // BAĞIŞ TRENDİ
        // ─────────────────────────────────────────────────────────────

        _loadDonationTrend: function (sPeriod) {
            var that         = this;
            var oReportModel = this.getModel("reportData");

            this._apiCall("GET", "/reports/donation-trend?period=" + sPeriod)
                .then(function (data) {
                    if (data.success && data.trend) {
                        oReportModel.setProperty("/donationTrend", data.trend);
                        setTimeout(function () { that._renderDonationChart(); }, 100);
                    }
                })
                .catch(function () {
                    var aMock = [
                        { month: "Ocak",    amount: 15000 },
                        { month: "Şubat",   amount: 18000 },
                        { month: "Mart",    amount: 22000 },
                        { month: "Nisan",   amount: 19000 },
                        { month: "Mayıs",   amount: 25000 },
                        { month: "Haziran", amount: 28000 }
                    ];
                    oReportModel.setProperty("/donationTrend", aMock);
                    setTimeout(function () { that._renderDonationChart(); }, 100);
                });
        },

        // ─────────────────────────────────────────────────────────────
        // ÜYE ARTIŞI
        // ─────────────────────────────────────────────────────────────

        _loadMemberGrowth: function (sPeriod) {
            var that         = this;
            var oReportModel = this.getModel("reportData");

            this._apiCall("GET", "/reports/member-growth?period=" + sPeriod)
                .then(function (data) {
                    if (data.success && data.growth) {
                        oReportModel.setProperty("/memberGrowth", data.growth);
                        setTimeout(function () { that._renderMemberChart(); }, 100);
                    }
                })
                .catch(function () {
                    var aMock = [
                        { month: "Ocak",    donors: 120, students: 80  },
                        { month: "Şubat",   donors: 135, students: 85  },
                        { month: "Mart",    donors: 142, students: 90  },
                        { month: "Nisan",   donors: 148, students: 95  },
                        { month: "Mayıs",   donors: 155, students: 98  },
                        { month: "Haziran", donors: 160, students: 102 }
                    ];
                    oReportModel.setProperty("/memberGrowth", aMock);
                    setTimeout(function () { that._renderMemberChart(); }, 100);
                });
        },

        // ─────────────────────────────────────────────────────────────
        // KATEGORİ ANALİZİ
        // ─────────────────────────────────────────────────────────────

        _loadCategoryStats: function () {
            var oReportModel = this.getModel("reportData");
            oReportModel.setProperty("/categoryStats", [
                { category: "Eğitim", donorCount: 85, studentCount: 60,
                  totalDonation: "125,000 ₺", avgDonation: "1,470 ₺", trend: "+12%", trendPositive: true  },
                { category: "Sosyal", donorCount: 42, studentCount: 25,
                  totalDonation: "68,000 ₺",  avgDonation: "1,619 ₺", trend: "+8%",  trendPositive: true  },
                { category: "Sağlık", donorCount: 33, studentCount: 17,
                  totalDonation: "45,000 ₺",  avgDonation: "1,364 ₺", trend: "-3%",  trendPositive: false }
            ]);
        },

        // ─────────────────────────────────────────────────────────────
        // GRAFİK RENDER
        // ─────────────────────────────────────────────────────────────

        _renderDonationChart: function () {
            var aTrend = this.getModel("reportData").getProperty("/donationTrend");
            if (!aTrend || !aTrend.length) return;

            var canvas = document.getElementById("donationChart");
            if (!canvas) return;

            if (this._donationChartInstance) this._donationChartInstance.destroy();

            this._donationChartInstance = new Chart(canvas.getContext("2d"), {
                type: "line",
                data: {
                    labels:   aTrend.map(function (t) { return t.month; }),
                    datasets: [{
                        label:           "Bağış Tutarı (₺)",
                        data:            aTrend.map(function (t) { return t.amount; }),
                        borderColor:     "#0070F2",
                        backgroundColor: "rgba(0,112,242,0.1)",
                        tension:         0.4,
                        fill:            true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: "top" },
                        tooltip: {
                            callbacks: {
                                label: function (ctx) {
                                    return ctx.parsed.y.toLocaleString("tr-TR") + " ₺";
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (v) {
                                    return v.toLocaleString("tr-TR") + " ₺";
                                }
                            }
                        }
                    }
                }
            });
        },

        _renderMemberChart: function () {
            var aGrowth = this.getModel("reportData").getProperty("/memberGrowth");
            if (!aGrowth || !aGrowth.length) return;

            var canvas = document.getElementById("memberChart");
            if (!canvas) return;

            if (this._memberChartInstance) this._memberChartInstance.destroy();

            this._memberChartInstance = new Chart(canvas.getContext("2d"), {
                type: "bar",
                data: {
                    labels:   aGrowth.map(function (g) { return g.month; }),
                    datasets: [
                        {
                            label:           "Bağışçılar",
                            data:            aGrowth.map(function (g) { return g.donors;   }),
                            backgroundColor: "#10B981"
                        },
                        {
                            label:           "Öğrenciler",
                            data:            aGrowth.map(function (g) { return g.students; }),
                            backgroundColor: "#F59E0B"
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: "top" } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        },

        // ─────────────────────────────────────────────────────────────
        // DÖNEM DEĞİŞİKLİĞİ & YENİLE
        // ─────────────────────────────────────────────────────────────

        onChangePeriod: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            this.getModel("reportData").setProperty("/selectedPeriod", sKey);
            this._loadReportData();
        },

        onRefreshReports: function () {
            this._loadReportData();
            MessageToast.show("Raporlar yenilendi!");
        },

        // ─────────────────────────────────────────────────────────────
        // EXCEL EXPORT
        // ─────────────────────────────────────────────────────────────

        onExportDonationTrend: function () {
            var aTrend = this.getModel("reportData").getProperty("/donationTrend");
            var aData  = [["Ay", "Bağış Tutarı (₺)"]];
            aTrend.forEach(function (t) { aData.push([t.month, t.amount]); });
            this._generateExcelFile("Bağış_Trendi_" + this._today() + ".xlsx", aData);
        },

        onExportMemberGrowth: function () {
            var aGrowth = this.getModel("reportData").getProperty("/memberGrowth");
            var aData   = [["Ay", "Bağışçılar", "Öğrenciler"]];
            aGrowth.forEach(function (g) { aData.push([g.month, g.donors, g.students]); });
            this._generateExcelFile("Üye_Artışı_" + this._today() + ".xlsx", aData);
        },

        onExportDonorList: function () {
            var that = this;
            MessageToast.show("Bağışçı listesi hazırlanıyor...");
            this._apiCall("GET", "/donors").then(function (data) {
                if (!data.success) return;
                var aData = [["ID","Ad","Soyad","Email","Telefon","Şehir","Durum","Kayıt Tarihi"]];
                data.donors.forEach(function (d) {
                    aData.push([d.id, d.first_name, d.last_name, d.email,
                        d.phone || "-", d.city || "-",
                        d.status === "active" ? "Aktif" : "Pasif",
                        new Date(d.created_at).toLocaleDateString("tr-TR")]);
                });
                that._generateExcelFile("Bağışçı_Listesi_" + that._today() + ".xlsx", aData);
            });
        },

        onExportStudentList: function () {
            var that = this;
            MessageToast.show("Öğrenci listesi hazırlanıyor...");
            this._apiCall("GET", "/students").then(function (data) {
                if (!data.success) return;
                var aData = [["ID","Ad","Soyad","Email","Telefon","Şehir","Okul","Durum","Kayıt Tarihi"]];
                data.students.forEach(function (s) {
                    aData.push([s.id, s.first_name, s.last_name, s.email,
                        s.phone || "-", s.city || "-", s.school_name || "-",
                        s.status === "active" ? "Aktif" : "Pasif",
                        new Date(s.created_at).toLocaleDateString("tr-TR")]);
                });
                that._generateExcelFile("Öğrenci_Listesi_" + that._today() + ".xlsx", aData);
            });
        },

        onExportEventReport: function () {
            var that = this;
            MessageToast.show("Etkinlik raporu hazırlanıyor...");
            this._apiCall("GET", "/events").then(function (data) {
                if (!data.success) return;
                var aData = [["ID","Başlık","Kategori","Tarih","Saat","Konum","Kapasite","Katılımcı","Durum"]];
                data.events.forEach(function (e) {
                    var sStatus = { active:"Aktif", completed:"Tamamlandı", planned:"Planlandı" }[e.status] || "İptal";
                    aData.push([e.id, e.title, e.category, e.event_date,
                        e.event_time || "-", e.location || "-",
                        e.capacity || "Sınırsız", e.registered_count || 0, sStatus]);
                });
                that._generateExcelFile("Etkinlik_Raporu_" + that._today() + ".xlsx", aData);
            });
        },

        onExportFinancialReport: function () {
            var stats = this.getModel("dashboardData").getProperty("/stats");
            var aData = [
                ["Mali Durum Özeti"], [""],
                ["Metrik",               "Değer"],
                ["Toplam Bağışçı",       stats.totalDonors          || 0],
                ["Toplam Öğrenci",       stats.totalStudents        || 0],
                ["Toplam Bağış Tutarı",  stats.totalDonationAmount  || 0],
                ["Bu Ay Yeni Bağışçı",   stats.newDonorsThisMonth   || 0],
                ["Aktif Proje Sayısı",   stats.activeProjects       || 0],
                ["Tamamlanan Proje",     stats.completedProjects    || 0]
            ];
            this._generateExcelFile("Mali_Rapor_" + this._today() + ".xlsx", aData);
        },

        onExportExecutiveSummary: function () {
            var stats = this.getModel("dashboardData").getProperty("/stats");
            var aData = [
                ["Yönetim Kurulu Özet Raporu", ""],
                ["Rapor Tarihi:", new Date().toLocaleDateString("tr-TR")], [""],
                ["Kategori",          "Değer"],
                ["Toplam Bağışçı",    stats.totalDonors         || 0],
                ["Toplam Öğrenci",    stats.totalStudents       || 0],
                ["Toplam Bağış (₺)",  stats.totalDonationAmount || 0],
                ["Aktif Projeler",    stats.activeProjects      || 0],
                ["Büyüme Oranı (%)",  stats.donationGrowth      || 0]
            ];
            this._generateExcelFile("Yönetim_Özet_" + this._today() + ".xlsx", aData);
        },

        // PDF placeholders
        onExportDonorListPDF:        function () { MessageToast.show("PDF export yakında aktif olacak!"); },
        onExportStudentListPDF:      function () { MessageToast.show("PDF export yakında aktif olacak!"); },
        onExportEventReportPDF:      function () { MessageToast.show("PDF export yakında aktif olacak!"); },
        onExportFinancialReportPDF:  function () { MessageToast.show("PDF export yakında aktif olacak!"); },
        onExportExecutiveSummaryPDF: function () { MessageToast.show("PDF export yakında aktif olacak!"); },

        // ─────────────────────────────────────────────────────────────
        // EXCEL DOSYASI OLUŞTURMA
        // ─────────────────────────────────────────────────────────────

        _generateExcelFile: function (sFileName, aData) {
            MessageToast.show("Excel dosyası hazırlanıyor...");

            fetch("http://localhost:3000/api/reports/generate-excel", {
                method:  "POST",
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("authToken")
                },
                body: JSON.stringify({ data: aData, fileName: sFileName })
            })
            .then(function (res) {
                if (!res.ok) throw new Error("Export failed");
                return res.blob();
            })
            .then(function (blob) {
                var url = window.URL.createObjectURL(blob);
                var a   = document.createElement("a");
                a.href  = url;
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

        // ─────────────────────────────────────────────────────────────
        // YARDIMCI
        // ─────────────────────────────────────────────────────────────

        _today: function () {
            return new Date().toISOString().split("T")[0];
        }
    };
});
