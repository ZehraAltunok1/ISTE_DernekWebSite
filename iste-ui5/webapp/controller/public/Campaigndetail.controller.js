sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast"
], function (Controller, History, MessageToast) {
    "use strict";

    return Controller.extend("edusupport.platform.controller.public.Campaigndetail", {

        onInit: function () {
            this.getOwnerComponent().getRouter()
                .getRoute("campaignDetail")
                .attachPatternMatched(this._onRoute, this);

            var that = this;
            window.addEventListener("message", function (oEvent) {
                var data = oEvent.data;
                if (!data) return;

                if (data.type === "cdDonate") {
                    that._onDonateAmount(data.amount);
                }
                if (data.type === "cdSwitchCampaign") {
                    that._switchCampaign(data.id);
                }
                if (data.type === "cdNavActivities") {
                    var oModel = that.getOwnerComponent().getModel("appData");
                    if (oModel) oModel.setProperty("/scrollToSection", "activitiesSection");
                    that.getOwnerComponent().getRouter().navTo("home", {}, true);
                }
                if (data.type === "cdNavHome") {
                    that.getOwnerComponent().getRouter().navTo("home");
                }
                if (data.type === "cdNavBack") {
                    that.onNavBack();
                }
            });
        },

        _onRoute: function (oEvent) {
            var args = oEvent.getParameter("arguments");
            var sId = (args && args.id) ? args.id : null;

            if (!sId || sId === "undefined") {
                var oModel = this.getOwnerComponent().getModel("appData");
                sId = (oModel && oModel.getProperty("/selectedCampaignId")) || "1";
            }

            this._campaignId = sId;
            this._fetchCampaign(sId);
        },

        _switchCampaign: function (sId) {
            if (this._campaignId === sId) return;
            this._campaignId = sId;
            var oModel = this.getOwnerComponent().getModel("appData");
            if (oModel) oModel.setProperty("/selectedCampaignId", sId);
            this._fetchCampaign(sId);
        },

        _fetchCampaign: function (sId) {
            var that = this;
            this._renderLoading();
            fetch("/api/campaigns/" + encodeURIComponent(sId), {
                headers: { "Accept": "application/json" }
            })
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (d) { that._renderPage(d); })
            .catch(function () { that._renderPage(that._getMock(sId)); });
        },

        _getMock: function (sId) {
            var all = {
                "1": {
                    id: "1", title: "Kampüs Kedileri İçin Kışlık Yuva",
                    category: "Barınak", emoji: "🏠",
                    description: [
                        "Soğuk kış aylarında kampüs alanında yaşayan yüzlerce kedi için sıcak, güvenli barınak alanları oluşturuyoruz. Her yuvada yalıtım, mama istasyonu ve su kabı bulunuyor.",
                        "Bağışlarınızla daha fazla kedi kışı sıcak geçirebilecek. Hedefimize ulaşırsak 50 yeni yuva inşa edeceğiz. Şimdiye kadar 23 yuva tamamlandı."
                    ],
                    raised: 18750, goal: 30000, donorCount: 142, daysLeft: 18,
                    activities: [
                        { date: "04 Mar 2026", title: "🏗️ 23. Yuva Tamamlandı", text: "Mühendislik Fakültesi bahçesine yeni ısıtmalı yuva kuruldu.", color: "green", tags: [{ label: "Tamamlandı", color: "green" }] },
                        { date: "01 Mar 2026", title: "💉 Toplu Aşı Uygulaması", text: "38 kediye kuduz ve karma aşı yapıldı.", color: "blue", tags: [{ label: "Sağlık", color: "blue" }] }
                    ],
                    recentDonors: [
                        { name: "Ayşe K.", initial: "A", amount: 250, time: "3 dk önce", gradient: "g1" },
                        { name: "Mehmet T.", initial: "M", amount: 100, time: "15 dk önce", gradient: "g2" }
                    ]
                },
                "2": {
                    id: "2", title: "Sokak Köpeklerine Sahiplenme Desteği",
                    category: "Sahiplendirme", emoji: "🐕",
                    description: ["Eğitimli köpekler çok daha kolay sahiplendiriliyor. Hedefimiz 60 köpeği yeni ailesiyle buluşturmak."],
                    raised: 9400, goal: 20000, donorCount: 87, daysLeft: 25,
                    activities: [{ date: "03 Mar 2026", title: "🏡 7 Köpek Yuva Buldu", text: "7 köpeğimiz yeni aileleriyle buluştu.", color: "green", tags: [{ label: "Sahiplendirme", color: "green" }] }],
                    recentDonors: [{ name: "Fatma Y.", initial: "F", amount: 200, time: "10 dk önce", gradient: "g1" }]
                },
                "3": {
                    id: "3", title: "Acil Tedavi Fonu",
                    category: "Sağlık", emoji: "💉",
                    description: ["Sokak hayvanlarının acil veteriner tedavi masraflarını karşılamak için oluşturulan dayanışma fonudur."],
                    raised: 5200, goal: 15000, donorCount: 63, daysLeft: 30,
                    activities: [{ date: "02 Mar 2026", title: "🚑 Pamuk Kurtarıldı", text: "Trafik kazasında yaralanan kedi 4 saatlik operasyonla kurtarıldı.", color: "orange", tags: [{ label: "Acil", color: "orange" }] }],
                    recentDonors: [{ name: "Elif S.", initial: "E", amount: 75, time: "20 dk önce", gradient: "g4" }]
                }
            };
            return all[sId] || all["1"];
        },

        _renderLoading: function () {
            this.byId("cdHTML").setContent(
                "<div class='cdWrap'><div class='cdLoading'>" +
                "<div class='cdLoadingLeaf'>🌿</div>" +
                "<div class='cdLoadingText'>Yükleniyor...</div>" +
                "</div></div>"
            );
        },

        _renderPage: function (d) {
            var pct = Math.min(Math.round((d.raised / d.goal) * 100), 100);
            var raised = Number(d.raised).toLocaleString("tr-TR");
            var goal = Number(d.goal).toLocaleString("tr-TR");
            var cid = d.id || this._campaignId || "1";

            var html =
                "<div class='cdRoot'>" +
                "<div class='cdBreadcrumb'>" +
                "<span class='cdBcLink' onclick=\"window.postMessage({type:'cdNavHome'},'*')\">Ana Sayfa</span>" +
                "<span class='cdBcSep'>›</span>" +
                "<span class='cdBcCurrent'>" + d.title + "</span>" +
                "</div>" +
                "<div class='cdLayout'>" +
                "<div class='cdLeft'>" +
                "<div class='cdHero'>" +
                "<div class='cdHeroBadge'>" + d.emoji + " " + d.category + "</div>" +
                "<h1 class='cdHeroTitle'>" + d.title + "</h1>" +
                "<div class='cdHeroMeta'>" +
                "<span class='cdMetaChip'>👥 " + d.donorCount + " bağışçı</span>" +
                "<span class='cdMetaChip cdMetaGreen'>✅ Aktif Kampanya</span>" +
                "<span class='cdMetaChip'>⏳ " + d.daysLeft + " gün kaldı</span>" +
                "</div></div>" +
                this._contentCards(d) +
                this._descriptionBlock(d) +
                this._activitiesBlock(d) +
                this._donorsBlock(d) +
                this._shareBlock(d) +
                "</div>" +
                "<div class='cdRight'>" +
                this._stickyPanel(d, pct, raised, goal) +
                this._sideNavBlock(cid) +
                "</div>" +
                "</div>" +
                "</div>" +
                this._scripts(pct, d.title, cid);

            this.byId("cdHTML").setContent(html);
        },

        _contentCards: function (d) {
            var cards = {
                "1": [{ img: "images/1.jpg", title: "Kışlık Yuva İnşası", text: "50 yuva hedefliyoruz." }, { img: "images/1.jpg", title: "Veteriner Desteği", text: "Sağlık taraması yapıyoruz." }],
                "2": [{ img: "images/1.jpg", title: "İtaat Eğitimi", text: "Eğitilen köpekler kolay sahipleniliyor." }],
                "3": [{ img: "images/1.jpg", title: "Acil Müdahale", text: "7/24 aktif veteriner hattımız." }]
            };
            var cid = d.id || "1";
            var list = cards[cid] || cards["1"];
            var html = "<div class='cdImgCards'>";
            list.forEach(function (c) {
                html += "<div class='cdImgCard'>" +
                    "<div class='cdImgCardPhoto'><img src='" + c.img + "' alt='" + c.title + "'/></div>" +
                    "<div class='cdImgCardBody'><h3 class='cdImgCardTitle'>" + c.title + "</h3><p class='cdImgCardText'>" + c.text + "</p></div></div>";
            });
            return html + "</div>";
        },

        _descriptionBlock: function (d) {
            var ps = (d.description || []).map(function (p) { return "<p class='cdDescP'>" + p + "</p>"; }).join("");
            return "<div class='cdSection'><div class='cdSectionHead'><h2 class='cdSectionTitle'>Kampanya Hakkında</h2></div><div class='cdDescBody'>" + ps + "</div></div>";
        },

        _activitiesBlock: function (d) {
            if (!d.activities || !d.activities.length) return "";
            var items = d.activities.map(function (a) {
                var tags = (a.tags || []).map(function (t) { return "<span class='cdTLTag " + t.color + "'>" + t.label + "</span>"; }).join("");
                return "<div class='cdTLItem'><div class='cdTLDotWrap'><div class='cdTLDot " + (a.color || "green") + "'></div><div class='cdTLLine'></div></div>" +
                    "<div class='cdTLContent'><div class='cdTLDate'>" + a.date + "</div><div class='cdTLTitle'>" + a.title + "</div>" +
                    "<div class='cdTLText'>" + a.text + "</div>" + (tags ? "<div class='cdTLTags'>" + tags + "</div>" : "") + "</div></div>";
            }).join("");
            return "<div class='cdSection'><div class='cdSectionHead'><h2 class='cdSectionTitle'>Yapılan İşler</h2></div><div class='cdTimeline'>" + items + "</div></div>";
        },

        _donorsBlock: function (d) {
            if (!d.recentDonors || !d.recentDonors.length) return "";
            var items = d.recentDonors.map(function (dn) {
                return "<div class='cdDonorRow'><div class='cdDonorAva " + (dn.gradient || "g1") + "'>" + dn.initial + "</div>" +
                    "<div class='cdDonorInfo'><div class='cdDonorName'>" + dn.name + "</div><div class='cdDonorTime'>" + dn.time + "</div></div>" +
                    "<div class='cdDonorAmt'>₺" + Number(dn.amount).toLocaleString("tr-TR") + "</div></div>";
            }).join("");
            return "<div class='cdSection'><div class='cdSectionHead'><h2 class='cdSectionTitle'>Son Bağışçılar</h2></div><div class='cdDonorList'>" + items + "</div></div>";
        },

        _shareBlock: function (d) {
            return "<div class='cdSection cdShareSection'><h2 class='cdSectionTitle'>Arkadaşlarına Anlat</h2><div class='cdShareBtns'>" +
                "<button class='cdShareBtn cdFb' data-share='fb'>Facebook</button><button class='cdShareBtn cdTw' data-share='tw'>Twitter / X</button>" +
                "<button class='cdShareBtn cdWa' data-share='wa'>WhatsApp</button><button class='cdShareBtn cdCp' data-share='cp' id='cdCopyBtn'>Linki Kopyala</button></div></div>";
        },

        _stickyPanel: function (d, pct, raised, goal) {
            return "<div class='cdSticky'><div class='cdStickyCard'><div class='cdStickyProgressTop'><div class='cdStickyRaised'>₺" + raised + "<span>toplandı</span></div>" +
                "<div class='cdStickyGoal'>Hedef ₺" + goal + "</div></div><div class='cdStickyTrack'><div class='cdStickyFill' id='cdSFill' style='width:0%'></div></div>" +
                "<div class='cdStickyStats'><div class='cdStickyStat'><div class='csn'>%" + pct + "</div><div class='csl'>tamamlandı</div></div>" +
                "<div class='cdStickyStat'><div class='csn'>" + d.donorCount + "</div><div class='csl'>bağışçı</div></div>" +
                "<div class='cdStickyStat'><div class='csn'>" + d.daysLeft + "</div><div class='csl'>gün kaldı</div></div></div></div>" +
                "<div class='cdStickyCard'><h3 class='cdStickyFormTitle'>🐾 Destek Ol</h3><div class='cdAmtGrid'>" +
                "<div class='cdAmtBtn' data-amt='50'>₺50</div><div class='cdAmtBtn cdAmtSel' data-amt='100'>₺100</div>" +
                "<div class='cdAmtBtn' data-amt='250'>₺250</div><div class='cdAmtBtn' data-amt='500'>₺500</div>" +
                "<div class='cdAmtBtn' data-amt='1000'>₺1000</div><div class='cdAmtBtn' data-amt='0'>Diğer</div></div>" +
                "<div class='cdCustomInput'><span>₺</span><input id='cdAmtInput' type='number' placeholder='Tutar' value='100' min='1'/></div>" +
                "<button id='cdDonateBtnMain' class='cdDonateBtn'>❤️ Şimdi Bağış Yap</button></div>" +
                "<button class='cdBackBtn' onclick=\"window.postMessage({type:'cdNavBack'},'*')\">← Geri Dön</button></div>";
        },

        _sideNavBlock: function (activeCid) {
            var campaigns = [
                { id: "1", emoji: "🏠", label: "Kampüs Kedileri" },
                { id: "2", emoji: "🐕", label: "Sahiplenme Desteği" },
                { id: "3", emoji: "💉", label: "Acil Tedavi Fonu" }
            ];
            var items = campaigns.map(function (c) {
                var active = c.id === activeCid ? " cdSideNavActive" : "";
                return "<div class='cdSideNavItem" + active + "' data-cid='" + c.id + "'><span class='cdSideNavLabel'>" + c.emoji + " " + c.label + "</span></div>";
            }).join("");
            return "<div class='cdSideNav'><div class='cdSideNavTitle'>Diğer Kampanyalar</div>" + items + "</div>";
        },

        _scripts: function (pct, title, activeCid) {
            var safeTitle = JSON.stringify(title);
            var safeActive = JSON.stringify(activeCid);
            return "<script>(function(){\n" +
                "setTimeout(function(){var f=document.getElementById('cdSFill'); if(f) f.style.width='" + pct + "%';},400);\n" +
                "document.addEventListener('click',function(e){\n" +
                "var b=e.target.closest('.cdAmtBtn'); if(!b) return;\n" +
                "document.querySelectorAll('.cdAmtBtn').forEach(function(x){x.classList.remove('cdAmtSel');});\n" +
                "b.classList.add('cdAmtSel'); var a=parseInt(b.getAttribute('data-amt'),10);\n" +
                "var inp=document.getElementById('cdAmtInput'); if(inp){inp.value=a>0?a:''; if(a===0)inp.focus();}\n" +
                "});\n" +
                "var db=document.getElementById('cdDonateBtnMain'); if(db){db.addEventListener('click',function(){\n" +
                "var inp=document.getElementById('cdAmtInput'); var amt=inp?parseFloat(inp.value):0;\n" +
                "if(!amt||amt<1) return; window.postMessage({type:'cdDonate',amount:amt},'*');\n" +
                "db.textContent='✅ Gönderildi!'; db.style.background='#2D6A4F';\n" +
                "setTimeout(function(){db.textContent='❤️ Şimdi Bağış Yap';db.style.background='';},2500);});}\n" +
                "document.addEventListener('click',function(e){\n" +
                "var item=e.target.closest('.cdSideNavItem'); if(!item) return;\n" +
                "var cid=item.getAttribute('data-cid'); if(cid===" + safeActive + ") return;\n" +
                "window.postMessage({type:'cdSwitchCampaign',id:cid},'*');});\n" +
                "})();<\/script>";
        },

        onNavBack: function () {
            var sPrev = History.getInstance().getPreviousHash();
            if (sPrev !== undefined) { window.history.go(-1); }
            else { this.getOwnerComponent().getRouter().navTo("home"); }
        },

        _onDonateAmount: function (fAmt) {
            MessageToast.show("₺" + Number(fAmt).toLocaleString("tr-TR") + " bağış başlatılıyor…");
        }
    });
});