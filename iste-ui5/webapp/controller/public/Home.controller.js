sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/HTML"
], function (Controller, Fragment, JSONModel, MessageBox, MessageToast, HTML) {
    "use strict";

    var MAX_CARDS = 6;   // ana sayfada max kart
    var PER_PAGE  = 3;   // ekranda aynı anda görünen kart adedi

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

            var that = this;

        window._footerScroll = function (sSectionId) {
            var oSection = that.getView().byId(sSectionId);
            if (!oSection) return;
            
            var oDomRef = oSection.getDomRef();
            if (!oDomRef) return;

            var oScrollContainer = document.getElementById("container-edusupport.platform---home--mainPage-scroll");
            if (oScrollContainer) {
                oScrollContainer.scrollTo({ top: oDomRef.offsetTop - 50, behavior: "smooth" });
            }
        };
            this.getOwnerComponent().getRouter()
                .getRoute("home")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this._checkLoginStatus();
            this._loadMediaForHome();
            this._loadPublicAnnouncements();
            this._loadCampaigns();

            var oModel = this.getOwnerComponent().getModel("appData");
            var sSection = oModel.getProperty("/scrollTo");

            if (sSection) {
                this._scrollToSection = sSection;
            }
        },
        onAfterRendering: function () {

        if (this._scrollToSection) {

            var oPage = this.byId("mainPage");
            var oSection = this.byId(this._scrollToSection);

            console.log("AFTER RENDER Scroll:", this._scrollToSection);

            if (oPage && oSection) {
                oPage.scrollToSection(oSection.getId());
            }

            this._scrollToSection = null;
        }
    },

        _checkLoginStatus: function () {
            var oAppData  = this.getOwnerComponent().getModel("appData");
            var sToken    = localStorage.getItem("authToken");
            var sUserData = localStorage.getItem("userData");
            if (sToken && sUserData) {
                try {
                    var oUser = JSON.parse(sUserData);
                    oAppData.setProperty("/isAuthenticated", true);
                    oAppData.setProperty("/currentUser", oUser);
                    this._refreshAvatarFromServer(oAppData);
                } catch (e) {
                    oAppData.setProperty("/isAuthenticated", false);
                    oAppData.setProperty("/currentUser", null);
                }
            } else {
                oAppData.setProperty("/isAuthenticated", false);
                oAppData.setProperty("/currentUser", null);
            }
        },

        _refreshAvatarFromServer: function (oAppData) {
            var sToken = localStorage.getItem("authToken");
            if (!sToken) return;
            fetch("http://localhost:3000/api/profile", {
                headers: { "Authorization": "Bearer " + sToken }
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.success) return;
                var d    = data.data;
                var sUrl = d.avatar_url
                    ? (d.avatar_url.startsWith("http") ? d.avatar_url : "http://localhost:3000" + d.avatar_url)
                    : "";
                var sInitials = (d.first_name && d.last_name)
                    ? d.first_name.charAt(0).toUpperCase() + d.last_name.charAt(0).toUpperCase()
                    : "";
                var oUser = oAppData.getProperty("/currentUser") || {};
                oUser.avatar_url = sUrl;
                oUser.initials   = sInitials;
                oAppData.setProperty("/currentUser", oUser);
                localStorage.setItem("userData", JSON.stringify(oUser));
            })
            .catch(function () {});
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
            var oBtn    = oEvent.getSource();
            var sCampId = oBtn.data("campaignId") || "1";
            var oModel  = this.getOwnerComponent().getModel("appData");
            if (oModel) oModel.setProperty("/selectedCampaignId", sCampId);
            this.getOwnerComponent().getRouter().navTo("campaignDetail", { id: sCampId });
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

            var oPP = this.getView().byId("faalPhotoPanel");
            var oVP = this.getView().byId("faalVideoPanel");
            if (oPP) oPP.destroy();
            if (oVP) oVP.destroy();

            // Global state sıfırla
            window._faalCarousel       = {};
            window._faalSlide          = null;
            window._faalGoTo           = null;
            window._faalUpdateTrack    = null;
            window._faalOpenPhotoGroup = null;
            this._groupIndex           = {};

            // Fotoğraf grupları oluştur
            var oPhotoGroups = {}, aPhotoGroupOrder = [];
            aPhotos.forEach(function (m) {
                var sKey = (m.title || "Diğer").trim();
                if (!oPhotoGroups[sKey]) { oPhotoGroups[sKey] = []; aPhotoGroupOrder.push(sKey); }
                oPhotoGroups[sKey].push(m);
            });
            var aAllPhotoCards = aPhotoGroupOrder.map(function (sKey) {
                var aGrp = oPhotoGroups[sKey];
            
                // is_cover=true olan fotoğrafı bul, yoksa ilk elemanı kullan
                var oCover = aGrp.find(function (m) { return m.is_cover; }) || aGrp[0];
            
                return {
                    groupTitle : sKey,
                    count      : aGrp.length,
                    cover      : oCover,   // ← artık gerçek kapak fotoğrafı
                    items      : aGrp,
                    type       : "photo_group"
                };
            });

            // MAX_CARDS sınırı uygula
            var aPhotoCards = aAllPhotoCards.slice(0, MAX_CARDS);
            var aVideoCards = aVideos.slice(0, MAX_CARDS);

            var nPC = aPhotoCards.length;
            var nVC = aVideoCards.length;

            // Tab bar — badge'de gerçek toplam sayısı göster
            var sTabBar =
                "<div class='faaliyetTabBar'>" +
                (nPC > 0
                    ? "<button class='faaliyetTabBtn active' id='faalTabPhoto' onclick=\"window._faalSwitchTab('photo')\">📷 Fotoğraflar<span class='faaliyetTabBadge'>" + aPhotos.length + "</span></button>"
                    : "") +
                (nVC > 0
                    ? "<button class='faaliyetTabBtn" + (nPC === 0 ? " active" : "") + "' id='faalTabVideo' onclick=\"window._faalSwitchTab('video')\">▶ Videolar<span class='faaliyetTabBadge'>" + aVideos.length + "</span></button>"
                    : "") +
                "</div>";
            oMainBox.addItem(new sap.ui.core.HTML({ content: sTabBar }));

            if (nPC > 0) {
                var oPhotoPanel = new sap.m.VBox({ id: this.getView().createId("faalPhotoPanel") })
                    .addStyleClass("faaliyetPanel faaliyetPanelActive");
                this._buildCarouselInPanel(oPhotoPanel, aPhotoCards, "photo");
                oMainBox.addItem(oPhotoPanel);
            }
            if (nVC > 0) {
                var oVideoPanel = new sap.m.VBox({ id: this.getView().createId("faalVideoPanel") })
                    .addStyleClass("faaliyetPanel" + (nPC === 0 ? " faaliyetPanelActive" : ""));
                this._buildCarouselInPanel(oVideoPanel, aVideoCards, "video");
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
            var that = this;

            // Kart HTML'lerini üret
            var sCards = aItems.map(function (oItem, nIdx) {
                return that._buildCardHTML(oItem, sType, nIdx);
            }).join("");

            // Toplam sayfa sayısı
            var nTotalPages = Math.ceil(aItems.length / PER_PAGE);

            // ── DÜZELTME: dot butonunun içine sayfa numarasını yaz ──
            var sDots = nTotalPages > 1
                ? Array.from({ length: nTotalPages }, function (_, i) {
                    return "<button class='faaliyetDot" + (i === 0 ? " faaliyetDotActive" : "") +
                           "' onclick=\"window._faalGoTo('" + sType + "'," + i + ")\">" +
                           (i + 1) +        // ← numara buraya yazılıyor
                           "</button>";
                  }).join("")
                : "";

            var sHTML =
                "<div class='faaliyetCarouselRow'>" +
                    "<button class='faaliyetArrowBtn' id='faalPrev_" + sType + "' disabled " +
                            "onclick=\"window._faalSlide('" + sType + "',-1)\">&#8592;</button>" +
                    "<div class='faaliyetViewport'>" +
                        "<div class='faaliyetTrack' id='faalTrack_" + sType + "'>" +
                            sCards +
                        "</div>" +
                    "</div>" +
                    "<button class='faaliyetArrowBtn' id='faalNext_" + sType + "'" +
                            (nTotalPages <= 1 ? " disabled" : "") +
                            " onclick=\"window._faalSlide('" + sType + "',1)\">&#8594;</button>" +
                "</div>" +
                (sDots
                    ? "<div class='faaliyetDots' id='faalDots_" + sType + "'>" + sDots + "</div>"
                    : "");

            oPanel.addItem(new sap.ui.core.HTML({ content: sHTML }));

            // Sayfa bazlı state kaydet
            window._faalCarousel[sType] = {
                items:      aItems,
                pageIdx:    0,
                totalPages: nTotalPages
            };

            // Global fonksiyonları yalnızca bir kez tanımla
            if (!window._faalUpdateTrack) {

                window._faalUpdateTrack = function (sT) {
                    var oState = window._faalCarousel[sT];
                    if (!oState) return;

                    var nPage  = oState.pageIdx;
                    var aI     = oState.items;
                    var nTotal = oState.totalPages;

                    var oTrack = document.getElementById("faalTrack_" + sT);
                    if (!oTrack) return;

                    var aCards = oTrack.querySelectorAll(".faaliyetCard");
                    if (!aCards.length) return;

                    // offsetWidth 0 ise viewport'tan fallback hesapla
                    var oViewport = oTrack.parentElement;
                    var nVW       = oViewport ? oViewport.offsetWidth : 0;
                    var GAP       = 16;
                    var nCardW    = aCards[0].offsetWidth ||
                                    Math.floor((nVW - GAP * (PER_PAGE - 1)) / PER_PAGE);

                    // Sayfanın ilk kartına atla
                    var nFirstCard = nPage * PER_PAGE;
                    oTrack.style.transform = "translateX(-" + (nFirstCard * (nCardW + GAP)) + "px)";

                    // Ok butonları
                    var oPrev = document.getElementById("faalPrev_" + sT);
                    var oNext = document.getElementById("faalNext_" + sT);
                    if (oPrev) oPrev.disabled = nPage <= 0;
                    if (oNext) oNext.disabled = nPage >= nTotal - 1;

                    // Dot aktif sınıfı güncelle
                    var oDotBox = document.getElementById("faalDots_" + sT);
                    if (oDotBox) {
                        oDotBox.querySelectorAll(".faaliyetDot").forEach(function (d, i) {
                            d.classList.toggle("faaliyetDotActive", i === nPage);
                        });
                    }
                };

                window._faalSlide = function (sT, nDir) {
                    var oState = window._faalCarousel[sT];
                    if (!oState) return;
                    oState.pageIdx = Math.min(
                        Math.max(0, oState.pageIdx + nDir),
                        oState.totalPages - 1
                    );
                    window._faalUpdateTrack(sT);
                };

                window._faalGoTo = function (sT, nPageI) {
                    var oState = window._faalCarousel[sT];
                    if (!oState) return;
                    oState.pageIdx = nPageI;
                    window._faalUpdateTrack(sT);
                };
            }

            // Resize: pozisyonu yeniden hesapla
            window.addEventListener("resize", function () {
                window._faalUpdateTrack(sType);
            });

            // DOM hazır olunca ilk konumu ayarla
            oPanel.addEventDelegate({
                onAfterRendering: function () {
                    setTimeout(function () {
                        window._faalUpdateTrack(sType);
                    }, 120);
                }
            });
        },

        _buildCardHTML: function (oItem, sType, nIdx) {
            var that = this;

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

                var sEncoded = encodeURIComponent(oItem.groupTitle || "");

                if (!window._faalOpenPhotoGroup) {
                    window._faalOpenPhotoGroup = function (sEnc) {
                        that.getOwnerComponent().getRouter().navTo("mediaDetail", { type: "photo_group", id: sEnc });
                    };
                }

                return "<div class='faaliyetCard' onclick=\"window._faalOpenPhotoGroup('" + sEncoded + "')\">" +
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

            // Video kartı
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
        onNavToAbout:     function () { this.getOwnerComponent().getRouter().navTo("about");          },
        onViewProfile:    function () { this.getOwnerComponent().getRouter().navTo("profile");        },
        onSettings:       function () { MessageToast.show("Ayarlar yakında aktif olacak!");           },
        onDonatePress:    function () { this.getOwnerComponent().getRouter().navTo("donate");         },

        onScrollToSection:      function (sId) { var o = this.getView().byId(sId); if (o && o.getDomRef()) o.getDomRef().scrollIntoView({ behavior: "smooth", block: "start" }); },
        onScrollToAbout:        function () { this.onScrollToSection("aboutSection");        },
        onScrollToScholarships: function () { this.onScrollToSection("scholarshipsSection"); },
        onScrollToHowItWorks:   function () { this.onScrollToSection("howItWorksSection");   },
        onScrollToContact:      function () { this.onScrollToSection("contactSection");      },

        onLoginPress: function () {
            var oAppController = this.getOwnerComponent().getRootControl().getController();
            if (oAppController && oAppController.onLoginPress) {
                oAppController.onLoginPress();
            }
        },

        onLogout: function () {
            var oAppController = this.getOwnerComponent().getRootControl().getController();
            if (oAppController && oAppController.onLogout) {
                oAppController.onLogout();
            }
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