sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/HTML"
], function (Controller, Fragment, JSONModel, MessageBox, MessageToast, HTML) {
    "use strict";

    const API_BASE = "http://localhost:3000/api";

    const DEMO_CAMPAIGNS = [
        { id: 1, title: "Kampüs Kedileri İçin Kışlık Yuva",      description: "Soğuk kış aylarında kampüs kedilerine sıcak barınak sağlıyoruz.",                             image_url: "images/kedi_kampanya.jpg",   collected_amount: 3500, target_amount: 5000 },
        { id: 2, title: "Sokak Köpeklerine Sahiplenme Desteği",   description: "Barınaktaki köpeklerin eğitim almasını ve sağlıklı yuvalara kavuşmasını destekliyoruz.",      image_url: "images/kopek_kampanya.jpg",  collected_amount: 2100, target_amount: 8000 },
        { id: 3, title: "Acil Tedavi Fonu",                        description: "Sokak hayvanlarının acil veteriner tedavi masraflarını karşılamak için dayanışma fonu.",      image_url: "images/tedavi_kampanya.jpg", collected_amount: 6800, target_amount: 7500 }
    ];

    return Controller.extend("edusupport.platform.controller.public.Home", {

        // ════════════════════════════════════════════════════════
        // INIT
        // ════════════════════════════════════════════════════════
        onInit: function () {
            this._checkLoginStatus();
            this._allMediaItems = [];
            this._groupIndex    = {};

            this.getView().setModel(new JSONModel({
                loginType: "user", email: "", password: "", rememberMe: false, errorMessage: ""
            }), "loginModel");

            this.getOwnerComponent().getRouter()
                .getRoute("home")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this._checkLoginStatus();
            this._loadMediaForHome();
            this._loadPublicAnnouncements();
            this._loadCampaigns();

            var that = this;
            window._footerScroll = function (sSectionId) {
                var oPage    = that.getView().byId("mainPage");
                var oSection = that.getView().byId(sSectionId);
                if (oPage && oSection) oPage.scrollToSection(oSection.getId(), 500);
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
        // KAMPANYALAR
        // ════════════════════════════════════════════════════════
        _loadCampaigns: function () {
            var that      = this;
            var oView     = this.getView();
            var oLoadBox  = oView.byId("campLoadingBox");
            var oEmptyBox = oView.byId("campEmptyBox");
            var oCardsBox = oView.byId("campCardsBox");
            if (!oLoadBox) return;
            oLoadBox.setVisible(true);
            oEmptyBox.setVisible(false);
            oCardsBox.setVisible(false);
            oCardsBox.destroyItems();
            setTimeout(function () {
                that._renderCampaignCards(DEMO_CAMPAIGNS, oLoadBox, oEmptyBox, oCardsBox);
            }, 500);
        },

        onCampaignPress: function (oEvent) {
            var sId = oEvent.getSource().data("campaignId");
            this.getOwnerComponent().getRouter().navTo("campaignDetail", { id: sId });
        },

        _renderCampaignCards: function (aCamps, oLoadBox, oEmptyBox, oCardsBox) {
            oLoadBox.setVisible(false);
            if (!aCamps || !aCamps.length) { oEmptyBox.setVisible(true); return; }
            var that = this;
            window._openCampaign = function (nId) {
                that.getOwnerComponent().getRouter().navTo("campaignDetail", { id: nId });
            };
            oCardsBox.setVisible(true);
            aCamps.forEach(function (camp) {
                var nPct      = camp.target_amount > 0 ? Math.min(Math.round((camp.collected_amount / camp.target_amount) * 100), 100) : 0;
                var sImg      = camp.image_url ? (camp.image_url.startsWith("http") ? camp.image_url : "http://localhost:3000" + camp.image_url) : "images/placeholder.jpg";
                var sBarColor = nPct >= 80 ? "#10B981" : nPct >= 40 ? "#2D6A4F" : "#F4A261";
                var sCard =
                    "<div class='campCard' onclick='window._openCampaign(" + camp.id + ")' style='cursor:pointer;'>" +
                        "<div style='position:relative;overflow:hidden;height:170px;'>" +
                            "<img class='campCardImage' src='" + sImg + "' alt='' onerror=\"this.src='images/placeholder.jpg'\"/>" +
                            "<div style='position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.55);color:#fff;font-size:0.75rem;font-weight:700;padding:4px 10px;border-radius:50px;backdrop-filter:blur(4px);'>" + nPct + "% tamamlandı</div>" +
                        "</div>" +
                        "<div class='campCardBody'>" +
                            "<p class='campCardTitle'>" + (camp.title || "") + "</p>" +
                            (camp.description ? "<p class='campCardDesc'>" + camp.description + "</p>" : "") +
                            "<div class='campCardProgress'><div class='campProgressTrack'><div class='campProgressFill' style='width:" + nPct + "%;background:" + sBarColor + ";'></div></div>" +
                            "<div style='display:flex;justify-content:space-between;margin-top:6px;font-size:0.78rem;'><span style='color:" + sBarColor + ";font-weight:700;'>" + parseFloat(camp.collected_amount).toLocaleString("tr-TR") + " ₺ toplandı</span>" +
                            (camp.target_amount > 0 ? "<span style='color:#6B7C75;'>Hedef: " + parseFloat(camp.target_amount).toLocaleString("tr-TR") + " ₺</span>" : "") + "</div></div>" +
                            "<div style='margin-top:10px;font-size:0.78rem;color:#2D6A4F;font-weight:600;'>Detaylar için tıkla →</div>" +
                        "</div>" +
                    "</div>";
                oCardsBox.addItem(new HTML({ content: sCard }));
            });
        },

        // ════════════════════════════════════════════════════════
        // GÖNÜLLÜ
        // ════════════════════════════════════════════════════════
        onVolunteerPress: function () {
            var oView = this.getView();
            if (!this._pVolunteerDialog) {
                this._pVolunteerDialog = sap.ui.core.Fragment.load({
                    id: oView.getId(), name: "edusupport.platform.view.fragments.VolunteerDialog", controller: this
                }).then(function (oDialog) { oView.addDependent(oDialog); return oDialog; });
            }
            this._pVolunteerDialog.then(function (oDialog) {
                oView.byId("volFirstName").setValue("");
                oView.byId("volLastName").setValue("");
                oView.byId("volEmail").setValue("");
                oView.byId("volPhone").setValue("");
                oView.byId("volArea").setSelectedKey("");
                oView.byId("volReason").setValue("");
                oView.byId("volunteerError").setVisible(false);
                oView.byId("volReasonCount").setText("0 / 500");
                oView.byId("volReason").attachLiveChange(function (oEvent) {
                    oView.byId("volReasonCount").setText(oEvent.getParameter("value").length + " / 500");
                });
                oDialog.open();
            });
        },

        onVolunteerSubmit: function () {
            var oView   = this.getView();
            var sFirst  = oView.byId("volFirstName").getValue().trim();
            var sLast   = oView.byId("volLastName").getValue().trim();
            var sEmail  = oView.byId("volEmail").getValue().trim();
            var sPhone  = oView.byId("volPhone").getValue().trim();
            var sArea   = oView.byId("volArea").getSelectedKey();
            var sReason = oView.byId("volReason").getValue().trim();
            var oError  = oView.byId("volunteerError");
            if (!sFirst || !sLast)                                        { oError.setText("Ad ve soyad zorunludur!");                    oError.setVisible(true); return; }
            if (!sEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail))   { oError.setText("Geçerli bir e-posta adresi girin!");           oError.setVisible(true); return; }
            if (!sPhone || sPhone.length < 10)                            { oError.setText("Geçerli bir telefon numarası girin!");         oError.setVisible(true); return; }
            if (!sArea)                                                    { oError.setText("Lütfen bir alan seçin!");                      oError.setVisible(true); return; }
            if (!sReason || sReason.length < 20)                          { oError.setText("Lütfen en az 20 karakter açıklama yazın!");    oError.setVisible(true); return; }
            oError.setVisible(false);
            var oBtn = oView.byId("volSubmitBtn");
            oBtn.setEnabled(false); oBtn.setText("Gönderiliyor...");
            var that = this;
            fetch("http://localhost:3000/api/volunteers/apply", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ first_name: sFirst, last_name: sLast, email: sEmail, phone: sPhone, area: sArea, reason: sReason })
            }).then(function (r) { return r.json(); }).then(function (data) {
                oBtn.setEnabled(true); oBtn.setText("Başvuru Gönder");
                if (data.success) {
                    that._pVolunteerDialog.then(function (d) { d.close(); });
                    sap.m.MessageBox.success("Başvurunuz alındı! 🎉\n\nYönetici onayından sonra sizinle iletişime geçilecektir.", { title: "Başvuru Başarılı", actions: [sap.m.MessageBox.Action.OK] });
                } else { oError.setText(data.message || "Başvuru gönderilemedi!"); oError.setVisible(true); }
            }).catch(function () {
                oBtn.setEnabled(true); oBtn.setText("Başvuru Gönder");
                oError.setText("Sunucuya bağlanılamadı!"); oError.setVisible(true);
            });
        },

        onCloseVolunteerDialog: function () {
            if (this._pVolunteerDialog) this._pVolunteerDialog.then(function (d) { d.close(); });
        },

        // ════════════════════════════════════════════════════════
        // MEDYA — YÜKLEME
        // ════════════════════════════════════════════════════════
        _loadMediaForHome: function () {
            var that = this;
            this._setMediaState("loading");
            fetch(API_BASE + "/media")
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    var aAll = (data.success && data.media && data.media.length > 0) ? data.media : [];
                    that._allMediaItems = aAll;
                    if (!aAll.length) { that._setMediaState("empty"); return; }
                    that._setMediaState("cards");
                    that._buildAllSections(aAll);
                })
                .catch(function () { that._setMediaState("empty"); });
        },

        _setMediaState: function (sState) {
            var oView = this.getView();
            var oL = oView.byId("mediaLoadingBox");
            var oE = oView.byId("mediaEmptyBox");
            var oC = oView.byId("mediaCardsBox");
            if (!oL) return;
            oL.setVisible(sState === "loading");
            oE.setVisible(sState === "empty");
            oC.setVisible(sState === "cards");
        },

        // ════════════════════════════════════════════════════════
        // MEDYA — CAROUSEL BUILD
        // ════════════════════════════════════════════════════════
        _buildAllSections: function (aAll) {
            var aPhotos = aAll.filter(function (m) { return m.type === "photo"; });
            var aVideos = aAll.filter(function (m) { return m.type === "video"; });

            var oMainBox = this.getView().byId("mediaCardsBox");
            oMainBox.destroyItems();

            // Duplicate ID koruması
            var oPP = this.getView().byId("faalPhotoPanel");
            var oVP = this.getView().byId("faalVideoPanel");
            if (oPP) oPP.destroy();
            if (oVP) oVP.destroy();

            window._faalSlide         = null;
            window._faalGoTo          = null;
            window._faalUpdateTrack   = null;
            window._faalRegisterItems = null;
            window._faalOpenPhotoGroup = null;
            this._groupIndex = {};

            // Fotoğrafları başlığa göre grupla — her grup 1 kart
            var oPhotoGroups = {}, aPhotoGroupOrder = [];
            aPhotos.forEach(function (m) {
                var sKey = (m.title || "Diğer").trim();
                if (!oPhotoGroups[sKey]) { oPhotoGroups[sKey] = []; aPhotoGroupOrder.push(sKey); }
                oPhotoGroups[sKey].push(m);
            });
            var aPhotoCards = aPhotoGroupOrder.map(function (sKey) {
                var aGrp = oPhotoGroups[sKey];
                return { groupTitle: sKey, count: aGrp.length, cover: aGrp[0], items: aGrp, type: "photo_group" };
            });

            var nPC = aPhotoCards.length;
            var nVC = aVideos.length;

            // Tab bar
            var sTabBar =
                "<div class='faaliyetTabBar'>" +
                (nPC > 0 ? "<button class='faaliyetTabBtn active' id='faalTabPhoto' onclick=\"window._faalSwitchTab('photo')\">📷 Fotoğraflar<span class='faaliyetTabBadge'>" + aPhotos.length + "</span></button>" : "") +
                (nVC > 0 ? "<button class='faaliyetTabBtn" + (nPC === 0 ? " active" : "") + "' id='faalTabVideo' onclick=\"window._faalSwitchTab('video')\">▶ Videolar<span class='faaliyetTabBadge'>" + nVC + "</span></button>" : "") +
                "</div>";
            oMainBox.addItem(new sap.ui.core.HTML({ content: sTabBar }));

            if (nPC > 0) {
                var oPhotoPanel = new sap.m.VBox({ id: this.getView().createId("faalPhotoPanel") }).addStyleClass("faaliyetPanel faaliyetPanelActive");
                this._buildCarouselInPanel(oPhotoPanel, aPhotoCards, "photo");
                oMainBox.addItem(oPhotoPanel);
            }
            if (nVC > 0) {
                var oVideoPanel = new sap.m.VBox({ id: this.getView().createId("faalVideoPanel") }).addStyleClass("faaliyetPanel" + (nPC === 0 ? " faaliyetPanelActive" : ""));
                this._buildCarouselInPanel(oVideoPanel, aVideos, "video");
                oMainBox.addItem(oVideoPanel);
            }

            var oView = this.getView();
            window._faalSwitchTab = function (sType) {
                var bP = document.getElementById("faalTabPhoto");
                var bV = document.getElementById("faalTabVideo");
                if (bP) bP.classList.toggle("active", sType === "photo");
                if (bV) bV.classList.toggle("active", sType === "video");
                var oPhoto = oView.byId("faalPhotoPanel");
                var oVideo = oView.byId("faalVideoPanel");
                if (oPhoto && oPhoto.getDomRef()) oPhoto.getDomRef().classList.toggle("faaliyetPanelActive", sType === "photo");
                if (oVideo && oVideo.getDomRef()) oVideo.getDomRef().classList.toggle("faaliyetPanelActive", sType === "video");
            };
        },

        _buildCarouselInPanel: function (oPanel, aItems, sType) {
            var that    = this;
            var VISIBLE = 3;
            this._groupIndex[sType + "_carousel"] = 0;

            var sCards = aItems.map(function (oItem, nIdx) {
                return that._buildCardHTML(oItem, sType, nIdx);
            }).join("");

            var nPages = Math.max(1, aItems.length - VISIBLE + 1);
            var sDots  = Array.from({ length: nPages }, function (_, i) {
                return "<button class='faaliyetDot" + (i === 0 ? " faaliyetDotActive" : "") + "' onclick=\"window._faalGoTo('" + sType + "'," + i + ")\"></button>";
            }).join("");

            var sHTML =
                "<div class='faaliyetCarouselRow'>" +
                    "<button class='faaliyetArrowBtn' id='faalPrev_" + sType + "' disabled onclick=\"window._faalSlide('" + sType + "',-1)\">&#8592;</button>" +
                    "<div class='faaliyetViewport'><div class='faaliyetTrack' id='faalTrack_" + sType + "'>" + sCards + "</div></div>" +
                    "<button class='faaliyetArrowBtn' id='faalNext_" + sType + "'" + (aItems.length <= VISIBLE ? " disabled" : "") + " onclick=\"window._faalSlide('" + sType + "',1)\">&#8594;</button>" +
                "</div>" +
                "<div class='faaliyetDots' id='faalDots_" + sType + "'>" + sDots + "</div>";

            oPanel.addItem(new sap.ui.core.HTML({ content: sHTML }));

            if (!window._faalSlide) {
                var oItemsMap = {};
                var oIdxMap   = this._groupIndex;

                window._faalRegisterItems = function (sT, aI) { oItemsMap[sT] = aI; };
                window._faalSlide = function (sT, nDir) {
                    var aI = oItemsMap[sT] || [];
                    oIdxMap[sT + "_carousel"] = Math.min(Math.max(0, oIdxMap[sT + "_carousel"] + nDir), Math.max(0, aI.length - VISIBLE));
                    window._faalUpdateTrack(sT, aI);
                };
                window._faalGoTo = function (sT, nI) {
                    oIdxMap[sT + "_carousel"] = nI;
                    window._faalUpdateTrack(sT, oItemsMap[sT] || []);
                };
                window._faalUpdateTrack = function (sT, aI) {
                    var nIdx   = oIdxMap[sT + "_carousel"];
                    var oTrack = document.getElementById("faalTrack_" + sT);
                    if (!oTrack) return;
                    var aCards = oTrack.querySelectorAll(".faaliyetCard");
                    if (!aCards.length) return;
                    oTrack.style.transform = "translateX(-" + (nIdx * (aCards[0].offsetWidth + 16)) + "px)";
                    var oPrev = document.getElementById("faalPrev_" + sT);
                    var oNext = document.getElementById("faalNext_" + sT);
                    if (oPrev) oPrev.disabled = nIdx === 0;
                    if (oNext) oNext.disabled = nIdx >= aI.length - VISIBLE;
                    document.querySelectorAll("#faalDots_" + sT + " .faaliyetDot")
                        .forEach(function (d, i) { d.classList.toggle("faaliyetDotActive", i === nIdx); });
                };
            }

            window._faalRegisterItems(sType, aItems);
            window.addEventListener("resize", function () { window._faalUpdateTrack(sType, aItems); });
        },

        // TEK _buildCardHTML — temiz versiyon
        _buildCardHTML: function (oItem, sType, nIdx) {
            var that = this;

            // ── FOTOĞRAF GRUBU ──
            if (sType === "photo") {
                var sCover      = oItem.cover || {};
                var sRawUrl     = sCover.url || "";
                var sImgUrl     = sRawUrl
                    ? (sRawUrl.startsWith("http") ? sRawUrl : "http://localhost:3000" + sRawUrl)
                    : "images/placeholder.jpg";
                var sGroupTitle = (oItem.groupTitle || "").replace(/'/g, "&#39;");
                var nCount      = oItem.count || 1;
                var sDate       = sCover.created_at
                    ? new Date(sCover.created_at).toLocaleDateString("tr-TR", { month: "short", year: "numeric" })
                    : "";
                // Tüm item bilgilerini encode et (fetch yapmadan detayda render için)
                var sEncoded = encodeURIComponent(JSON.stringify(oItem.items));

                if (!window._faalOpenPhotoGroup) {
                    window._faalOpenPhotoGroup = function (sEnc) {
                        that.getOwnerComponent().getRouter().navTo("mediaDetail", { type: "photo_group", id: sEnc });
                    };
                }

                return "<div class='faaliyetCard' onclick=\"window._faalOpenPhotoGroup('" + sEncoded.replace(/'/g, "%27") + "')\">" +
                    "<div class='faaliyetThumb'>" +
                        "<img src='" + sImgUrl + "' alt='" + sGroupTitle + "' loading='lazy' onerror=\"this.src='images/placeholder.jpg'\"/>" +
                        "<span class='faaliyetBadge faaliyetBadgePhoto'>📷 " + nCount + " Fotoğraf</span>" +
                        "<span class='faaliyetGoChip'>Galeriyi Gör →</span>" +
                    "</div>" +
                    "<div class='faaliyetCardBody'>" +
                        "<div class='faaliyetCardTitle'>" + sGroupTitle + "</div>" +
                        (sDate ? "<div class='faaliyetCardDate'>📅 " + sDate + "</div>" : "") +
                    "</div>" +
                "</div>";
            }

            // ── VİDEO — direkt iframe ──
            var sTitle  = (oItem.title || "").replace(/'/g, "&#39;");
            var sDesc   = (oItem.description || "").replace(/'/g, "&#39;");
            var sDate2  = oItem.created_at
                ? new Date(oItem.created_at).toLocaleDateString("tr-TR", { month: "short", year: "numeric" })
                : "";
            var sRaw    = oItem.url || "";
            var sEmbed  = sRaw;
            var oMatch  = sRaw.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
            if (oMatch) sEmbed = "https://www.youtube.com/embed/" + oMatch[1] + "?rel=0&modestbranding=1";

            return "<div class='faaliyetCard faaliyetCardVideo'>" +
                "<div class='faaliyetThumb faaliyetThumbVideo'>" +
                    "<iframe src='" + sEmbed + "' class='faaliyetVideoIframe' allowfullscreen" +
                    " allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'" +
                    " loading='lazy' frameborder='0'></iframe>" +
                    "<span class='faaliyetBadge faaliyetBadgeVideo'>Video</span>" +
                "</div>" +
                "<div class='faaliyetCardBody'>" +
                    "<div class='faaliyetCardTitle'>" + sTitle + "</div>" +
                    (sDesc  ? "<div class='faaliyetCardDesc'>"  + sDesc  + "</div>" : "") +
                    (sDate2 ? "<div class='faaliyetCardDate'>📅 " + sDate2 + "</div>" : "") +
                "</div>" +
            "</div>";
        },

        // ════════════════════════════════════════════════════════
        // NAVİGASYON & SCROLL
        // ════════════════════════════════════════════════════════
        onNavToHome:      function () { this.getOwnerComponent().getRouter().navTo("home");           },
        onNavToDashboard: function () { this.getOwnerComponent().getRouter().navTo("adminDashboard"); },
        onNavToLaunchpad: function () { this.getOwnerComponent().getRouter().navTo("launchpad");      },
        onViewProfile:    function () { this.getOwnerComponent().getRouter().navTo("profile");        },
        onSettings:       function () { MessageToast.show("Ayarlar yakında aktif olacak!");           },
        onDonatePress:    function () { this.getOwnerComponent().getRouter().navTo("donate");         },

        onScrollToSection:      function (sId) { var o = this.getView().byId(sId); if (o && o.getDomRef()) o.getDomRef().scrollIntoView({ behavior: "smooth", block: "start" }); },
        onScrollToAbout:        function () { this.onScrollToSection("aboutSection");        },
        onScrollToScholarships: function () { this.onScrollToSection("scholarshipsSection"); },
        onScrollToHowItWorks:   function () { this.onScrollToSection("howItWorksSection");   },
        onScrollToContact:      function () { this.onScrollToSection("contactSection");      },

        // ════════════════════════════════════════════════════════
        // LOGIN
        // ════════════════════════════════════════════════════════
        onLoginPress: function () {
            var oView = this.getView();
            if (!this._pLoginDialog) {
                this._pLoginDialog = Fragment.load({
                    id: oView.getId(), name: "edusupport.platform.view.fragments.Login", controller: this
                }).then(function (oDialog) { oView.addDependent(oDialog); return oDialog; });
            }
            this._pLoginDialog.then(function (oDialog) {
                var oM = this.getView().getModel("loginModel");
                oM.setProperty("/email", ""); oM.setProperty("/password", "");
                oM.setProperty("/errorMessage", ""); oM.setProperty("/loginType", "user");
                oDialog.open();
            }.bind(this));
        },

        onLoginSubmit: function () {
            var that  = this;
            var oM    = this.getView().getModel("loginModel");
            var sType = oM.getProperty("/loginType");
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

            oM.setProperty("/errorMessage", "");

            // ✅ Gerçek API'ye git
            fetch("http://localhost:3000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: sEmail, password: sPass, loginType: sType })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                console.log("✅ LOGIN RESPONSE:", JSON.stringify(data));

                if (!data.success) {
                    oM.setProperty("/errorMessage", data.message || "Giriş başarısız.");
                    return;
                }

                // ✅ Backend { success, data: { token, user } } döndürüyor
                var sToken = data.data.token;
                var oUser  = data.data.user;

                if (!sToken) {
                    oM.setProperty("/errorMessage", "Token alınamadı.");
                    return;
                }

                var sUserRole = (oUser.role || oUser.type || oUser.user_type || "").toLowerCase();
                if (sType === "admin" && sUserRole !== "admin" && sUserRole !== "super_admin") {
                    oM.setProperty("/errorMessage", "Bu hesap yönetici yetkisine sahip değil.");
                    return;
                }

                // ✅ Kaydet
                localStorage.setItem("authToken", sToken);
                localStorage.setItem("userData", JSON.stringify(oUser));
                if (bRem) localStorage.setItem("rememberMe", "true");

                var oAppData = that.getOwnerComponent().getModel("appData");
                oAppData.setProperty("/isAuthenticated", true);
                oAppData.setProperty("/currentUser", oUser);
                oAppData.setProperty("/authToken", sToken);

                that._pLoginDialog.then(function (d) { d.close(); });
                MessageToast.show("Hoş geldiniz, " + oUser.first_name + "!");

                var sRoute = (sUserRole === "admin" || sUserRole === "super_admin")
                    ? "adminDashboard" : "home";

                setTimeout(function () {
                    that.getOwnerComponent().getRouter().navTo(sRoute);
                }, 300);
            })
            .catch(function (err) {
                console.error("❌ Login error:", err);
                oM.setProperty("/errorMessage", "Sunucuya bağlanılamadı.");
            });
        },

        onRegister: function () {
            var that = this;

            // Login dialog'u kapat
            if (this._pLoginDialog) {
                this._pLoginDialog.then(function (d) { if (d.isOpen()) d.close(); });
            }

            // Register modelini sıfırla
            var oRegisterModel = new JSONModel({
                first_name: "", last_name: "", email: "",
                password: "", password_confirm: "",
                errorMessage: "", successMessage: "",
                isLoading: false,
                passwordStrength: 0,
                passwordStrengthState: "None",
                passwordStrengthText: ""
            });
            this.getView().setModel(oRegisterModel, "registerModel");

            if (!this._pRegisterDialog) {
                this._pRegisterDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "edusupport.platform.view.fragments.Register",
                    controller: this
                }).then(function (oDialog) {
                    that.getView().addDependent(oDialog);
                    return oDialog;
                });
            }
            this._pRegisterDialog.then(function (d) { d.open(); });
        },

        onCloseRegisterDialog: function () {
            if (this._pRegisterDialog) this._pRegisterDialog.then(function (d) { d.close(); });
        },

        onSwitchToLogin: function () {
            if (this._pRegisterDialog) {
                this._pRegisterDialog.then(function (d) { d.close(); });
            }
            this.onLoginPress();
        },

        onRegisterFieldChange: function () {
            var oModel = this.getView().getModel("registerModel");
            if (oModel) oModel.setProperty("/errorMessage", "");
        },

        onRegisterPasswordChange: function () {
            var oModel    = this.getView().getModel("registerModel");
            var sPassword = oModel.getProperty("/password");
            var iStrength = 0;
            if (sPassword.length >= 8)          iStrength += 25;
            if (/[A-Z]/.test(sPassword))        iStrength += 25;
            if (/[0-9]/.test(sPassword))        iStrength += 25;
            if (/[^A-Za-z0-9]/.test(sPassword)) iStrength += 25;
            var sState, sText;
            if      (iStrength >= 75) { sState = "Success"; sText = "Güçlü";     }
            else if (iStrength >= 50) { sState = "Warning"; sText = "Orta";      }
            else if (iStrength >= 25) { sState = "Error";   sText = "Zayıf";     }
            else                      { sState = "None";    sText = "Çok zayıf"; }
            oModel.setProperty("/passwordStrength",      iStrength);
            oModel.setProperty("/passwordStrengthState", sState);
            oModel.setProperty("/passwordStrengthText",  sText);
        },

        onRegisterSubmit: function () {
            var that   = this;
            var oModel = this.getView().getModel("registerModel");
            var sFirst = oModel.getProperty("/first_name").trim();
            var sLast  = oModel.getProperty("/last_name").trim();
            var sEmail = oModel.getProperty("/email").trim();
            var sPass  = oModel.getProperty("/password");
            var sConf  = oModel.getProperty("/password_confirm");

            if (!sFirst || !sLast) { oModel.setProperty("/errorMessage", "Ad ve soyad zorunludur."); return; }
            if (!sEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail)) { oModel.setProperty("/errorMessage", "Geçerli e-posta girin."); return; }
            if (!sPass || sPass.length < 8) { oModel.setProperty("/errorMessage", "Şifre en az 8 karakter olmalıdır."); return; }
            if (sPass !== sConf) { oModel.setProperty("/errorMessage", "Şifreler eşleşmiyor."); return; }

            oModel.setProperty("/isLoading", true);
            oModel.setProperty("/errorMessage", "");

            fetch("http://localhost:3000/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ first_name: sFirst, last_name: sLast, email: sEmail, password: sPass })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.success) throw new Error(data.message || "Kayıt başarısız");

                var sToken = data.data.token;
                var oUser  = data.data.user;

                oModel.setProperty("/successMessage", "Hesabınız oluşturuldu! Giriş yapılıyor...");

                setTimeout(function () {
                    if (that._pRegisterDialog) that._pRegisterDialog.then(function (d) { d.close(); });
                    localStorage.setItem("authToken", sToken);
                    localStorage.setItem("userData", JSON.stringify(oUser));
                    var oAppData = that.getOwnerComponent().getModel("appData");
                    oAppData.setProperty("/isAuthenticated", true);
                    oAppData.setProperty("/authToken", sToken);
                    oAppData.setProperty("/currentUser", oUser);
                    MessageToast.show("Hoş geldiniz, " + oUser.first_name + "!");
                    that.getOwnerComponent().getRouter().navTo("home");
                }, 1500);
            })
            .catch(function (err) {
                oModel.setProperty("/errorMessage", err.message || "Kayıt hatası.");
            })
            .finally(function () {
                oModel.setProperty("/isLoading", false);
            });
        },

        onScholarshipApply: function () {
            var that = this;
            MessageBox.confirm("Burs başvurusu yapmak için giriş yapmanız gerekmektedir.\n\nGiriş yapmak ister misiniz?", {
                title: "Burs Başvurusu", actions: [MessageBox.Action.YES, MessageBox.Action.NO], emphasizedAction: MessageBox.Action.YES,
                onClose: function (oAction) { if (oAction === MessageBox.Action.YES) that.onLoginPress(); }
            });
        },

        // ════════════════════════════════════════════════════════
        // DUYURULAR
        // ════════════════════════════════════════════════════════
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
                    if (!aList.length) { if (oEmpty) oEmpty.setVisible(true); return; }
                    if (oBox) oBox.setVisible(true);
                    aList.forEach(function (oAnn) {
                        var sColor = oAnn.type === "Warning" ? "#F59E0B" : oAnn.type === "Error" ? "#EF4444" : oAnn.type === "Success" ? "#10B981" : "#0070F2";
                        var sIcon  = oAnn.type === "Warning" ? "⚠️" : oAnn.type === "Error" ? "🚨" : oAnn.type === "Success" ? "✅" : "ℹ️";
                        var sHtml =
                            "<div onclick='window._openAnnDetail(" + oAnn.id + ")' style='border-left:4px solid " + sColor + ";background:#fff;border-radius:8px;padding:14px 18px;margin-bottom:10px;box-shadow:0 1px 6px rgba(0,0,0,0.07);cursor:pointer;transition:box-shadow 0.2s,transform 0.2s;'" +
                            " onmouseover=\"this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.13)'\"" +
                            " onmouseout=\"this.style.transform='';this.style.boxShadow='0 1px 6px rgba(0,0,0,0.07)'\">" +
                            "<div style='font-weight:700;font-size:0.95rem;color:#1F2937;'>" + sIcon + " " + oAnn.title + "</div>" +
                            "<div style='font-size:0.8rem;color:#9CA3AF;margin-top:4px;'>Detaylar için tıklayın →</div></div>";
                        if (oBox) oBox.addItem(new sap.ui.core.HTML({ content: sHtml }));
                    });
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
            var sDate = oAnn.created_at ? new Date(oAnn.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "";
            var sIcon = oAnn.type === "Warning" ? "⚠️" : oAnn.type === "Error" ? "🚨" : oAnn.type === "Success" ? "✅" : "ℹ️";
            sap.m.MessageBox.show(oAnn.message || "İçerik bulunmuyor.", {
                icon: sap.m.MessageBox.Icon.NONE, title: sIcon + " " + oAnn.title,
                actions: [sap.m.MessageBox.Action.CLOSE],
                details: sDate ? "Tarih: " + sDate : undefined
            });
        },

        onLogout: function () {
            var that = this;
            MessageBox.confirm("Çıkış yapmak istediğinize emin misiniz?", {
                title: "Çıkış",
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        localStorage.removeItem("authToken");
                        localStorage.removeItem("userData");
                        localStorage.removeItem("rememberMe");

                        var oAppData = that.getOwnerComponent().getModel("appData");
                        oAppData.setProperty("/isAuthenticated", false);
                        oAppData.setProperty("/currentUser", null);
                        oAppData.setProperty("/authToken", null);

                        MessageToast.show("Başarıyla çıkış yapıldı!");
                        that.getOwnerComponent().getRouter().navTo("home");
                        setTimeout(function () { location.reload(); }, 500);
                    }
                }
            });
        },
        // Stub'lar — XML bağlamları bozulmasın
        onPhotoPrev: function () {}, onPhotoNext: function () {},
        onVideoPrev: function () {}, onVideoNext: function () {},
        onMediaScrollLeft: function () {}, onMediaScrollRight: function () {},
        onFilterMedia: function () {}, _renderMediaCards: function () {},
        _renderSingleCard: function () {}, _showMediaCard: function () {},
        _updateArrowVisibility: function () {}, _buildPhotoSection: function () {},
        _buildVideoSection: function () {}, _renderPhotoCard: function () {},
        _renderVideoCard: function () {}, _renderGroupCard: function () {},
        _buildGroupSlider: function () {}, _groupByTitle: function () {}
    });
});