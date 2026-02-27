sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Title",
    "sap/m/Text",
    "sap/m/ObjectStatus",
    "sap/ui/core/HTML"
], function (
    Controller, Fragment, JSONModel, MessageBox, MessageToast,
    VBox, HBox, Title, Text, ObjectStatus, HTML
) {
    "use strict";

    const API_BASE = "http://localhost:3000/api";

    return Controller.extend("edusupport.platform.controller.public.Home", {

        onInit: function () {
            this._checkLoginStatus();
            this._allMediaItems = [];
            this._mediaItems    = [];
            this._mediaIndex    = 0;

            this.getView().setModel(new JSONModel({
                loginType:    "user",
                email:        "",
                password:     "",
                rememberMe:   false,
                errorMessage: ""
            }), "loginModel");

            this.getOwnerComponent().getRouter()
                .getRoute("home")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this._checkLoginStatus();
            this._loadMediaForHome();
            this._loadPublicAnnouncements();
            var that = this;
            window._footerScroll = function (sSectionId) {
                var oPage    = that.getView().byId("mainPage");
                var oSection = that.getView().byId(sSectionId);
                if (oPage && oSection) {
                    oPage.scrollToSection(oSection.getId(), 500);
                }
            };
        },

        // ════════════════════════════════════════════════════════
        // AUTH
        // ════════════════════════════════════════════════════════

        _checkLoginStatus: function () {
            var oAppData  = this.getOwnerComponent().getModel("appData");
            var sToken    = localStorage.getItem("authToken");
            var sUserData = localStorage.getItem("userData");

            if (sToken && sUserData) {
                try {
                    var oUser = JSON.parse(sUserData);
                    oAppData.setProperty("/isAuthenticated", true);
                    oAppData.setProperty("/currentUser",     oUser);
                } catch (e) {
                    oAppData.setProperty("/isAuthenticated", false);
                    oAppData.setProperty("/currentUser",     null);
                }
            } else {
                oAppData.setProperty("/isAuthenticated", false);
                oAppData.setProperty("/currentUser",     null);
            }
        },

        
            // ════════════════════════════════════════════════════════
            // GÖNÜLLÜ BAŞVURUSU — Home.controller.js'e ekle
            // ════════════════════════════════════════════════════════

            onVolunteerPress: function () {
                var oView = this.getView();
                if (!this._pVolunteerDialog) {
                    this._pVolunteerDialog = sap.ui.core.Fragment.load({
                        id:         oView.getId(),
                        name:       "edusupport.platform.view.fragments.VolunteerDialog",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }
                this._pVolunteerDialog.then(function (oDialog) {
                    // Formu sıfırla
                    oView.byId("volFirstName").setValue("");
                    oView.byId("volLastName").setValue("");
                    oView.byId("volEmail").setValue("");
                    oView.byId("volPhone").setValue("");
                    oView.byId("volArea").setSelectedKey("");
                    oView.byId("volReason").setValue("");
                    oView.byId("volunteerError").setVisible(false);
                    oView.byId("volReasonCount").setText("0 / 500");

                    // Karakter sayacı
                    oView.byId("volReason").attachLiveChange(function (oEvent) {
                        var n = oEvent.getParameter("value").length;
                        oView.byId("volReasonCount").setText(n + " / 500");
                    });

                    oDialog.open();
                });
            },

            onVolunteerSubmit: function () {
                var oView = this.getView();

                var sFirst  = oView.byId("volFirstName").getValue().trim();
                var sLast   = oView.byId("volLastName").getValue().trim();
                var sEmail  = oView.byId("volEmail").getValue().trim();
                var sPhone  = oView.byId("volPhone").getValue().trim();
                var sArea   = oView.byId("volArea").getSelectedKey();
                var sReason = oView.byId("volReason").getValue().trim();

                var oError  = oView.byId("volunteerError");

                // Validasyon
                if (!sFirst || !sLast) {
                    oError.setText("Ad ve soyad zorunludur!"); oError.setVisible(true); return;
                }
                if (!sEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail)) {
                    oError.setText("Geçerli bir e-posta adresi girin!"); oError.setVisible(true); return;
                }
                if (!sPhone || sPhone.length < 10) {
                    oError.setText("Geçerli bir telefon numarası girin!"); oError.setVisible(true); return;
                }
                if (!sArea) {
                    oError.setText("Lütfen bir alan seçin!"); oError.setVisible(true); return;
                }
                if (!sReason || sReason.length < 20) {
                    oError.setText("Lütfen en az 20 karakter açıklama yazın!"); oError.setVisible(true); return;
                }

                oError.setVisible(false);

                var oSubmitBtn = oView.byId("volSubmitBtn");
                oSubmitBtn.setEnabled(false);
                oSubmitBtn.setText("Gönderiliyor...");

                var that = this;

                fetch("http://localhost:3000/api/volunteers/apply", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        first_name: sFirst,
                        last_name:  sLast,
                        email:      sEmail,
                        phone:      sPhone,
                        area:       sArea,
                        reason:     sReason
                    })
                })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    oSubmitBtn.setEnabled(true);
                    oSubmitBtn.setText("Başvuru Gönder");

                    if (data.success) {
                        that._pVolunteerDialog.then(function (d) { d.close(); });
                        sap.m.MessageBox.success(
                            "Başvurunuz alındı! 🎉\n\nYönetici onayından sonra sizinle iletişime geçilecektir.",
                            { title: "Başvuru Başarılı", actions: [sap.m.MessageBox.Action.OK] }
                        );
                    } else {
                        oError.setText(data.message || "Başvuru gönderilemedi!");
                        oError.setVisible(true);
                    }
                })
                .catch(function () {
                    oSubmitBtn.setEnabled(true);
                    oSubmitBtn.setText("Başvuru Gönder");
                    oError.setText("Sunucuya bağlanılamadı, lütfen tekrar deneyin!");
                    oError.setVisible(true);
                });
            },

            onCloseVolunteerDialog: function () {
                if (this._pVolunteerDialog) {
                    this._pVolunteerDialog.then(function (d) { d.close(); });
                }
            },
            // ════════════════════════════════════════════════════════
            // MEDYA — VERİ YÜKLEME
            // ════════════════════════════════════════════════════════

            _loadMediaForHome: function () {
                var that = this;
                this._setMediaState("loading");

                fetch(API_BASE + "/media")
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        var aAll = (data.success && data.media && data.media.length > 0) ? data.media : [];
                        that._allMediaItems = aAll;

                        if (aAll.length === 0) {
                            that._setMediaState("empty");
                        } else {
                            that._setMediaState("cards");
                            that._buildAllSections(aAll);
                        }
                    })
                    .catch(function () {
                        that._setMediaState("empty");
                    });
            },

            _setMediaState: function (sState) {
                var oView    = this.getView();
                var oLoading = oView.byId("mediaLoadingBox");
                var oEmpty   = oView.byId("mediaEmptyBox");
                var oCards   = oView.byId("mediaCardsBox");
                if (!oLoading) return;
                oLoading.setVisible(sState === "loading");
                oEmpty.setVisible(sState === "empty");
                oCards.setVisible(sState === "cards");
            },

            // Title'a göre gruplama
            _groupByTitle: function (aItems) {
                var oGroups = {};
                var aOrder  = [];
                aItems.forEach(function (oItem) {
                    var sKey = oItem.title || "Diğer";
                    if (!oGroups[sKey]) {
                        oGroups[sKey] = [];
                        aOrder.push(sKey);
                    }
                    oGroups[sKey].push(oItem);
                });
                return aOrder.map(function (sKey) {
                    return { title: sKey, items: oGroups[sKey] };
                });
            },

            _buildAllSections: function (aAll) {
                var that = this;

                var aPhotos = aAll.filter(function (m) { return m.type === "photo"; });
                var aVideos = aAll.filter(function (m) { return m.type === "video"; });

                var oMainBox = this.getView().byId("mediaCardsBox");
                oMainBox.destroyItems();

                // ── FOTOĞRAF GRUPLARI ──
                if (aPhotos.length > 0) {
                    var aPhotoGroups = this._groupByTitle(aPhotos);

                    var oPhotoSection = new sap.m.VBox().addStyleClass("faaliyetSection");
                    oPhotoSection.addItem(
                        new sap.m.Title({ text: "📷 Fotoğraflar", level: "H3" })
                            .addStyleClass("faaliyetSectionTitle")
                    );

                    aPhotoGroups.forEach(function (oGroup, nGrpIdx) {
                        that._buildGroupSlider(oPhotoSection, oGroup, "photo", nGrpIdx);
                    });

                    oMainBox.addItem(oPhotoSection);
                }

                // ── VIDEO GRUPLARI ──
                if (aVideos.length > 0) {
                    var aVideoGroups = this._groupByTitle(aVideos);

                    var oVideoSection = new sap.m.VBox().addStyleClass("faaliyetSection");
                    oVideoSection.addItem(
                        new sap.m.Title({ text: "▶ Videolar", level: "H3" })
                            .addStyleClass("faaliyetSectionTitle")
                    );

                    aVideoGroups.forEach(function (oGroup, nGrpIdx) {
                        that._buildGroupSlider(oVideoSection, oGroup, "video", nGrpIdx);
                    });

                    oMainBox.addItem(oVideoSection);
                }
            },

            _buildGroupSlider: function (oParent, oGroup, sType, nGrpIdx) {
                var that   = this;
                var aItems = oGroup.items;
                var sKey   = sType + "_" + nGrpIdx;

                // Her grup için index sakla
                if (!this._groupIndex) this._groupIndex = {};
                this._groupIndex[sKey] = 0;

                // Grup başlığı
                var oGroupHeader = new sap.m.HBox({ alignItems: "Center" })
                    .addStyleClass("faaliyetGroupHeader");
                oGroupHeader.addItem(
                    new sap.m.Title({ text: oGroup.title, level: "H5" })
                        .addStyleClass("faaliyetGroupTitle")
                );
                var oCounter = new sap.m.Text({ text: "1 / " + aItems.length })
                    .addStyleClass("faaliyetCounter");
                oGroupHeader.addItem(oCounter);
                oParent.addItem(oGroupHeader);

                // Slider satırı
                var oSliderRow = new sap.m.HBox({ alignItems: "Center" })
                    .addStyleClass("faaliyetSliderRow");

                var oCardArea = new sap.m.VBox().addStyleClass("faaliyetCardArea");

                var oBtnPrev = new sap.m.Button({
                    icon: "sap-icon://navigation-left-arrow",
                    type: "Transparent",
                    press: function () {
                        var nIdx = that._groupIndex[sKey];
                        nIdx = (nIdx - 1 + aItems.length) % aItems.length;
                        that._groupIndex[sKey] = nIdx;
                        that._renderGroupCard(oCardArea, aItems, nIdx, sType);
                        oCounter.setText((nIdx + 1) + " / " + aItems.length);
                    }
                }).addStyleClass("faaliyetArrowBtn");
                oBtnPrev.setVisible(aItems.length > 1);

                var oBtnNext = new sap.m.Button({
                    icon: "sap-icon://navigation-right-arrow",
                    type: "Transparent",
                    press: function () {
                        var nIdx = that._groupIndex[sKey];
                        nIdx = (nIdx + 1) % aItems.length;
                        that._groupIndex[sKey] = nIdx;
                        that._renderGroupCard(oCardArea, aItems, nIdx, sType);
                        oCounter.setText((nIdx + 1) + " / " + aItems.length);
                    }
                }).addStyleClass("faaliyetArrowBtn");
                oBtnNext.setVisible(aItems.length > 1);

                oSliderRow.addItem(oBtnPrev);
                oSliderRow.addItem(oCardArea);
                oSliderRow.addItem(oBtnNext);
                oParent.addItem(oSliderRow);

                // İlk kartı göster
                this._renderGroupCard(oCardArea, aItems, 0, sType);
            },

            _renderGroupCard: function (oArea, aItems, nIdx, sType) {
                oArea.destroyItems();
                var oItem  = aItems[nIdx];
                var sTitle = oItem.title       || "";
                var sDesc  = oItem.description || "";

                var sVisual;
                if (sType === "photo") {
                    sVisual =
                        "<div style='width:100%;height:220px;overflow:hidden;border-radius:12px 12px 0 0;'>" +
                            "<img src='http://localhost:3000" + oItem.url + "'" +
                            " style='width:100%;height:220px;object-fit:cover;display:block;" +
                            "transition:transform 0.3s;' loading='lazy'" +
                            " onmouseover=\"this.style.transform='scale(1.04)'\"" +
                            " onmouseout=\"this.style.transform='scale(1)'\"" +
                            " alt='" + sTitle.replace(/'/g, "") + "'/>" +
                        "</div>";
                } else {
                    sVisual =
                        "<div style='position:relative;width:100%;padding-bottom:56.25%;height:0;" +
                        "border-radius:12px 12px 0 0;overflow:hidden;'>" +
                            "<iframe src='" + oItem.url + "?rel=0&modestbranding=1'" +
                            " style='position:absolute;top:0;left:0;width:100%;height:100%;border:none;'" +
                            " allowfullscreen loading='lazy'></iframe>" +
                        "</div>";
                }

                var sCard =
                    "<div style='" +
                        "background:#fff;" +
                        "border-radius:12px;" +
                        "overflow:hidden;" +
                        "box-shadow:0 2px 12px rgba(0,0,0,0.08);" +
                        "transition:transform 0.2s,box-shadow 0.2s;" +
                        "cursor:pointer;" +
                    "' onmouseover=\"this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.13)'\"" +
                    "   onmouseout=\"this.style.transform='';this.style.boxShadow='0 2px 12px rgba(0,0,0,0.08)'\">" +

                        sVisual +

                        "<div style='padding:14px 16px 18px;'>" +
                            "<div style='" +
                                "font-size:1rem;" +
                                "font-weight:700;" +
                                "color:#1F2937;" +
                                "margin-bottom:8px;" +
                                "line-height:1.4;" +
                            "'>" + sTitle + "</div>" +

                            (sDesc ?
                                "<div style='" +
                                    "font-size:0.875rem;" +
                                    "color:#6B7280;" +
                                    "line-height:1.6;" +
                                    "white-space:normal;" +
                                "'>" + sDesc + "</div>"
                            : "") +

                        "</div>" +
                    "</div>";

                oArea.addItem(new HTML({ content: sCard }));
            },
            onNavToSection: function(oEvent) {
                var sSectionId = oEvent.getSource().data("sectionId");
                var oSection   = this.byId(sSectionId);
                var oPage      = this.byId("mainPage");
                oPage.scrollToSection(oSection.getId());
            },
            // eski metodlar boş bırak
            onPhotoPrev:            function () {},
            onPhotoNext:            function () {},
            onVideoPrev:            function () {},
            onVideoNext:            function () {},
            onMediaScrollLeft:      function () {},
            onMediaScrollRight:     function () {},
            onFilterMedia:          function () {},
            _renderMediaCards:      function () {},
            _renderSingleCard:      function () {},
            _showMediaCard:         function () {},
            _updateArrowVisibility: function () {},
            _buildPhotoSection:     function () {},
            _buildVideoSection:     function () {},
            _renderPhotoCard:       function () {},
            _renderVideoCard:       function () {},

        // ════════════════════════════════════════════════════════
        // SAYFA İÇİ SCROLL
        // ════════════════════════════════════════════════════════

        onScrollToSection: function (sId) {
            var o = this.getView().byId(sId);
            if (o && o.getDomRef()) {
                o.getDomRef().scrollIntoView({ behavior: "smooth", block: "start" });
            }
        },
        onScrollToAbout:        function () { this.onScrollToSection("aboutSection");        },
        onScrollToScholarships: function () { this.onScrollToSection("scholarshipsSection"); },
        onScrollToHowItWorks:   function () { this.onScrollToSection("howItWorksSection");   },
        onScrollToContact:      function () { this.onScrollToSection("contactSection");      },

        // ════════════════════════════════════════════════════════
        // NAVİGASYON
        // ════════════════════════════════════════════════════════

        onNavToHome:      function () { this.getOwnerComponent().getRouter().navTo("home");           },
        onNavToDashboard: function () { this.getOwnerComponent().getRouter().navTo("adminDashboard"); },
        onNavToLaunchpad: function () { this.getOwnerComponent().getRouter().navTo("launchpad");      },
        onViewProfile:    function () { this.getOwnerComponent().getRouter().navTo("profile");        },
        onSettings:       function () { MessageToast.show("Ayarlar yakında aktif olacak!");           },

        // ════════════════════════════════════════════════════════
        // LOGIN DIALOG
        // ════════════════════════════════════════════════════════

        onLoginPress: function () {
            var oView = this.getView();
            if (!this._pLoginDialog) {
                this._pLoginDialog = Fragment.load({
                    id:         oView.getId(),
                    name:       "edusupport.platform.view.fragments.Login",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            this._pLoginDialog.then(function (oDialog) {
                var oM = this.getView().getModel("loginModel");
                oM.setProperty("/email",        "");
                oM.setProperty("/password",     "");
                oM.setProperty("/errorMessage", "");
                oM.setProperty("/loginType",    "user");
                oDialog.open();
            }.bind(this));
        },

        onLoginSubmit: function () {
            var oM     = this.getView().getModel("loginModel");
            var sType  = oM.getProperty("/loginType");
            var sEmail = oM.getProperty("/email");
            var sPass  = oM.getProperty("/password");
            var bRem   = oM.getProperty("/rememberMe");

            if (!sEmail || !sPass) {
                oM.setProperty("/errorMessage", "Lütfen e-posta ve şifrenizi girin.");
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail)) {
                oM.setProperty("/errorMessage", "Geçerli bir e-posta adresi girin.");
                return;
            }

            var TEST_USERS = {
                "admin@test.com":   { password: "123456", user: { id: 1, email: "admin@test.com",   first_name: "Admin", last_name: "Kullanıcı", role: "admin", type: "admin" } },
                "donor@test.com":   { password: "123456", user: { id: 2, email: "donor@test.com",   first_name: "Ahmet", last_name: "Yılmaz",    role: "user",  type: "user"  } },
                "student@test.com": { password: "123456", user: { id: 3, email: "student@test.com", first_name: "Ayşe",  last_name: "Demir",     role: "user",  type: "user"  } }
            };

            var oU = TEST_USERS[sEmail];
            if (oU && oU.password === sPass) {
                if (sType === "admin" && oU.user.role !== "admin") {
                    oM.setProperty("/errorMessage", "Bu hesap yönetici değil.");
                    return;
                }
                var sToken = "test-token-" + Date.now();
                localStorage.setItem("authToken", sToken);
                localStorage.setItem("userData",  JSON.stringify(oU.user));
                if (bRem) localStorage.setItem("rememberMe", "true");

                var oAppData = this.getOwnerComponent().getModel("appData");
                oAppData.setProperty("/isAuthenticated", true);
                oAppData.setProperty("/currentUser",     oU.user);
                oAppData.setProperty("/authToken",       sToken);

                this._pLoginDialog.then(function (d) { d.close(); });
                MessageToast.show("Hoş geldiniz, " + oU.user.first_name + "!");

                setTimeout(function () {
                    this.getOwnerComponent().getRouter().navTo(
                        oU.user.type === "admin" ? "adminDashboard" : "launchpad"
                    );
                }.bind(this), 300);
            } else {
                oM.setProperty("/errorMessage", "E-posta veya şifre hatalı!");
            }
        },

        onCloseLoginDialog: function () {
            this._pLoginDialog.then(function (d) { d.close(); });
        },

        onLogout: function () {
            MessageBox.confirm("Çıkış yapmak istediğinize emin misiniz?", {
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        localStorage.removeItem("authToken");
                        localStorage.removeItem("userData");
                        var oAppData = this.getOwnerComponent().getModel("appData");
                        oAppData.setProperty("/isAuthenticated", false);
                        oAppData.setProperty("/currentUser",     null);
                        MessageToast.show("Başarıyla çıkış yapıldı!");
                        this.getOwnerComponent().getRouter().navTo("home");
                    }
                }.bind(this)
            });
        },
        onDonatePress: function () {
            this.getOwnerComponent().getRouter().navTo("donate");
        },

        onCloseDonateDialog: function () {
            if (this._oDonateDialog) {
                this._oDonateDialog.close();
            }
        },

        onPaymentMethodChange: function () {
            // Model binding otomatik günceller
        },

        onSelectAmount: function (oEvent) {
            var oBtn    = oEvent.getSource();
            var oData   = oBtn.getCustomData();
            var sAmount = "";

            // getCustomData() ile amount değerini al
            for (var i = 0; i < oData.length; i++) {
                if (oData[i].getKey() === "amount") {
                    sAmount = oData[i].getValue();
                    break;
                }
            }

            var oModel = this._oDonateDialog.getModel("donateModel");
            if (sAmount === "0") {
                oModel.setProperty("/amount", "");
            } else {
                oModel.setProperty("/amount", sAmount);
            }
        },

        onSubmitDonate: function () {
            var that   = this;
            var oModel = this._oDonateDialog.getModel("donateModel");
            var oData  = oModel.getData();

            var amount = parseFloat(oData.amount);
            if (!oData.amount || isNaN(amount) || amount < 10) {
                sap.m.MessageToast.show("Lütfen en az 10 ₺ tutar girin.");
                return;
            }
            if (!oData.name || !oData.name.trim()) {
                sap.m.MessageToast.show("Ad Soyad zorunludur.");
                return;
            }
            if (!oData.email || !oData.email.includes("@")) {
                sap.m.MessageToast.show("Geçerli bir e-posta girin.");
                return;
            }
            if (oData.method === "iyzico") {
                if (!oData.card_holder || !oData.card_number || !oData.expire_month || !oData.expire_year || !oData.cvc) {
                    sap.m.MessageToast.show("Kart bilgilerini eksiksiz doldurun.");
                    return;
                }
            }

            this._oDonateDialog.setBusy(true);

            var sEndpoint = oData.method === "iyzico"
                ? "http://localhost:3000/api/donate/iyzico"
                : "http://localhost:3000/api/donate/iban";

            var oPayload = {
                donor_name:  oData.name.trim(),
                donor_email: oData.email.trim(),
                donor_phone: oData.phone || "",
                amount:      amount,
                note:        oData.note  || ""
            };

            if (oData.method === "iyzico") {
                oPayload.card_holder  = oData.card_holder;
                oPayload.card_number  = oData.card_number.replace(/\s/g, "");
                oPayload.expire_month = oData.expire_month;
                oPayload.expire_year  = oData.expire_year;
                oPayload.cvc          = oData.cvc;
            }

            fetch(sEndpoint, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(oPayload)
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                that._oDonateDialog.setBusy(false);

                if (data.success) {
                    that._oDonateDialog.close();

                    if (oData.method === "iban") {
                        var oInfo = data.iban_info;
                        sap.m.MessageBox.success(
                            "Bağış kaydınız oluşturuldu!\n\n" +
                            "🏦 Banka: "         + oInfo.bank + "\n" +
                            "👤 Hesap Sahibi: Pati ve Gelecek Derneği\n" +
                            "💳 IBAN: "          + oInfo.iban + "\n" +
                            "💰 Tutar: "         + oInfo.amount + " ₺\n" +
                            "🔑 Referans Kodu: " + oInfo.reference + "\n\n" +
                            "⚠️ Havale açıklamasına referans kodunu yazmayı unutmayın!",
                            { title: "Havale Bilgileri", actions: [sap.m.MessageBox.Action.CLOSE] }
                        );
                    } else {
                        sap.m.MessageBox.success(
                            "Ödemeniz başarıyla tamamlandı! 🎉\n\nBağışınız için teşekkür ederiz.\nÖdeme No: " + data.payment_id,
                            { title: "Ödeme Başarılı" }
                        );
                    }
                } else {
                    sap.m.MessageBox.error(
                        data.message || "İşlem başarısız. Lütfen tekrar deneyin.",
                        { title: "Hata" }
                    );
                }
            })
            .catch(function () {
                that._oDonateDialog.setBusy(false);
                sap.m.MessageBox.error("Sunucuya bağlanılamadı.");
            });
        },

        // onSelectAmount'ı da güncelle (Select dropdown için):
        // ESKİ onSelectAmount'ı SİLİN, bu yeni versiyonu ekleyin:

        onSelectAmount: function (oEvent) {
            var sKey   = oEvent.getSource().getSelectedKey();
            var oModel = this._oDonateDialog.getModel("donateModel");
            if (sKey === "0") {
                oModel.setProperty("/amount", "");
            } else {
                oModel.setProperty("/amount", sKey);
            }
        },
        onCloseDonateDialog: function () {
            if (this._oDonateDialog) {
                this._oDonateDialog.close();
            }
        },

        onPaymentMethodChange: function () {
            // Model binding otomatik günceller, ekstra işlem gerekmez
        },

        onSelectAmount: function (oEvent) {
            var sAmount = oEvent.getSource().data("amount");
            var oModel  = this._oDonateDialog.getModel("donateModel");
            if (sAmount === "0") {
                oModel.setProperty("/amount", "");
            } else {
                oModel.setProperty("/amount", sAmount);
            }
        },

        onSubmitDonate: function () {
            var that   = this;
            var oModel = this._oDonateDialog.getModel("donateModel");
            var oData  = oModel.getData();

            // Validasyon
            var amount = parseFloat(oData.amount);
            if (!oData.amount || isNaN(amount) || amount < 10) {
                sap.m.MessageToast.show("Lütfen en az 10 ₺ tutar girin.");
                return;
            }
            if (!oData.name || !oData.name.trim()) {
                sap.m.MessageToast.show("Ad Soyad zorunludur.");
                return;
            }
            if (!oData.email || !oData.email.includes("@")) {
                sap.m.MessageToast.show("Geçerli bir e-posta girin.");
                return;
            }
            if (oData.method === "iyzico") {
                if (!oData.card_holder || !oData.card_number || !oData.expire_month || !oData.expire_year || !oData.cvc) {
                    sap.m.MessageToast.show("Kart bilgilerini eksiksiz doldurun.");
                    return;
                }
            }

            this._oDonateDialog.setBusy(true);

            var sEndpoint = oData.method === "iyzico"
                ? "http://localhost:3000/api/donate/iyzico"
                : "http://localhost:3000/api/donate/iban";

            var oPayload = {
                donor_name:  oData.name.trim(),
                donor_email: oData.email.trim(),
                donor_phone: oData.phone  || "",
                amount:      amount,
                note:        oData.note   || ""
            };

            if (oData.method === "iyzico") {
                oPayload.card_holder  = oData.card_holder;
                oPayload.card_number  = oData.card_number.replace(/\s/g, "");
                oPayload.expire_month = oData.expire_month;
                oPayload.expire_year  = oData.expire_year;
                oPayload.cvc          = oData.cvc;
            }

            fetch(sEndpoint, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(oPayload)
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                that._oDonateDialog.setBusy(false);

                if (data.success) {
                    that._oDonateDialog.close();

                    if (oData.method === "iban") {
                        var oInfo = data.iban_info;
                        sap.m.MessageBox.success(
                            "Bağış kaydınız oluşturuldu!\n\n" +
                            "🏦 Banka: "         + oInfo.bank + "\n" +
                            "👤 Hesap Sahibi: Pati ve Gelecek Derneği\n" +
                            "💳 IBAN: "          + oInfo.iban + "\n" +
                            "💰 Tutar: "         + oInfo.amount + " ₺\n" +
                            "🔑 Referans Kodu: " + oInfo.reference + "\n\n" +
                            "⚠️ Havale açıklamasına referans kodunu yazmayı unutmayın!",
                            { title: "Havale Bilgileri", actions: [sap.m.MessageBox.Action.CLOSE] }
                        );
                    } else {
                        sap.m.MessageBox.success(
                            "Ödemeniz başarıyla tamamlandı! 🎉\n\nBağışınız için teşekkür ederiz.\nÖdeme No: " + data.payment_id,
                            { title: "Ödeme Başarılı" }
                        );
                    }
                } else {
                    sap.m.MessageBox.error(
                        data.message || "İşlem başarısız. Lütfen tekrar deneyin.",
                        { title: "Hata" }
                    );
                }
            })
            .catch(function () {
                that._oDonateDialog.setBusy(false);
                sap.m.MessageBox.error("Sunucuya bağlanılamadı.");
            });
        },

        onScholarshipApply: function () {
            var that = this;
            MessageBox.confirm(
                "Burs başvurusu yapmak için giriş yapmanız gerekmektedir.\n\nGiriş yapmak ister misiniz?",
                {
                    title:            "Burs Başvurusu",
                    actions:          [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.YES) { that.onLoginPress(); }
                    }
                }
            );
        },
        _loadPublicAnnouncements: function () {
            var oBoxClear = this.getView().byId("annListBox");
            if (oBoxClear) oBoxClear.destroyItems();
            var that = this;

            fetch(API_BASE + "/announcements?status=active")
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    var aList  = data.announcements || [];
                    var oLoad  = that.getView().byId("annLoadingBox");
                    var oEmpty = that.getView().byId("annEmptyBox");
                    var oBox   = that.getView().byId("annListBox");

                    if (oLoad) oLoad.setVisible(false);

                    if (!aList.length) {
                        if (oEmpty) oEmpty.setVisible(true);
                        return;
                    }

                    if (oBox) oBox.setVisible(true);

                    aList.forEach(function (oAnn) {
                        var sColor = oAnn.type === "Warning" ? "#F59E0B" :
                                    oAnn.type === "Error"   ? "#EF4444" :
                                    oAnn.type === "Success" ? "#10B981" : "#0070F2";

                        var sIcon  = oAnn.type === "Warning" ? "⚠️" :
                                    oAnn.type === "Error"   ? "🚨" :
                                    oAnn.type === "Success" ? "✅" : "ℹ️";

                        var sHtml =
                            "<div onclick='window._openAnnDetail(" + oAnn.id + ")' style='" +
                                "border-left:4px solid " + sColor + ";" +
                                "background:#fff;" +
                                "border-radius:8px;" +
                                "padding:14px 18px;" +
                                "margin-bottom:10px;" +
                                "box-shadow:0 1px 6px rgba(0,0,0,0.07);" +
                                "cursor:pointer;" +
                                "transition:box-shadow 0.2s,transform 0.2s;" +
                            "' onmouseover=\"this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.13)'\"" +
                            "   onmouseout=\"this.style.transform='';this.style.boxShadow='0 1px 6px rgba(0,0,0,0.07)'\">" +
                                "<div style='font-weight:700;font-size:0.95rem;color:#1F2937;'>" +
                                    sIcon + " " + oAnn.title +
                                "</div>" +
                                "<div style='font-size:0.8rem;color:#9CA3AF;margin-top:4px;'>" +
                                    "Detaylar için tıklayın →" +
                                "</div>" +
                            "</div>";

                        if (oBox) oBox.addItem(new sap.ui.core.HTML({ content: sHtml }));
                    });

                    // Global handler — .then() içinde olmalı, aList burada erişilebilir
                    that._annData = aList;
                    window._openAnnDetail = function (nId) {
                        var oAnn = aList.find(function (a) { return a.id === nId; });
                        if (oAnn) that._showAnnDetail(oAnn);
                    };
                })
                .catch(function () {
                    var oLoad  = that.getView().byId("annLoadingBox");
                    var oEmpty = that.getView().byId("annEmptyBox");
                    if (oLoad)  oLoad.setVisible(false);
                    if (oEmpty) oEmpty.setVisible(true);
                });
        },
        _showAnnDetail: function (oAnn) {
            var sColor = oAnn.type === "Warning" ? "#F59E0B" :
                        oAnn.type === "Error"   ? "#EF4444" :
                        oAnn.type === "Success" ? "#10B981" : "#0070F2";

            var sIcon  = oAnn.type === "Warning" ? "⚠️" :
                        oAnn.type === "Error"   ? "🚨" :
                        oAnn.type === "Success" ? "✅" : "ℹ️";

            var sDate = oAnn.created_at
                ? new Date(oAnn.created_at).toLocaleDateString("tr-TR", {
                    day: "numeric", month: "long", year: "numeric"
                })
                : "";

            sap.m.MessageBox.show(
                oAnn.message || "İçerik bulunmuyor.",
                {
                    icon:    sap.m.MessageBox.Icon.NONE,
                    title:   sIcon + " " + oAnn.title,
                    actions: [sap.m.MessageBox.Action.CLOSE],
                    details: sDate ? "Tarih: " + sDate : undefined
                }
            );
        }
    });
});