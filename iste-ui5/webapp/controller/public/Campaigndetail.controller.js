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

            // core:HTML içindeki script'lerden gelen mesajları yakala
            // SAP UI5'te iframe yoktur — window.postMessage kullanılır (parent değil)
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
            });
        },

        /* ── Route matched: URL'den id al ── */
        _onRoute: function (oEvent) {
            var args = oEvent.getParameter("arguments");
            var sId  = (args && args.id) ? args.id : null;

            if (!sId || sId === "undefined") {
                var oModel = this.getOwnerComponent().getModel("appData");
                sId = (oModel && oModel.getProperty("/selectedCampaignId")) || "1";
            }

            this._campaignId = sId;
            this._fetchCampaign(sId);
        },

        /* ── Tab geçişi: navTo KULLANMA, sadece içeriği güncelle ── */
        _switchCampaign: function (sId) {
            if (this._campaignId === sId) return;
            this._campaignId = sId;

            var oModel = this.getOwnerComponent().getModel("appData");
            if (oModel) oModel.setProperty("/selectedCampaignId", sId);

            // navTo çağırmıyoruz — route'u değiştirmek _onRoute'u tekrar tetikler
            // ve tab state sıfırlanır. Sadece içeriği güncelliyoruz.
            this._fetchCampaign(sId);
        },

        /* ── API / Mock ── */
        _fetchCampaign: function (sId) {
            var that = this;
            this._renderLoading();
            fetch("/api/campaigns/" + encodeURIComponent(sId), {
                headers: { "Accept": "application/json" }
            })
                .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
                .then(function (d) { that._renderPage(d); })
                .catch(function ()  { that._renderPage(that._getMock(sId)); });
        },

        _getMock: function (sId) {
            var all = {
                "1": {
                    id:"1", title:"Kampüs Kedileri İçin Kışlık Yuva",
                    category:"Barınak", emoji:"🏠",
                    description:[
                        "Soğuk kış aylarında kampüs alanında yaşayan yüzlerce kedi için sıcak, güvenli barınak alanları oluşturuyoruz. Her yuvada yalıtım, mama istasyonu ve su kabı bulunuyor.",
                        "Bağışlarınızla daha fazla kedi kışı sıcak geçirebilecek. Hedefimize ulaşırsak 50 yeni yuva inşa edeceğiz. Şimdiye kadar 23 yuva tamamlandı."
                    ],
                    raised:18750, goal:30000, donorCount:142, daysLeft:18,
                    activities:[
                        { date:"04 Mar 2026", title:"🏗️ 23. Yuva Tamamlandı",
                          text:"Mühendislik Fakültesi bahçesine yeni ısıtmalı yuva kuruldu. 4 kedi hemen yerleşti.",
                          color:"green", tags:[{label:"Tamamlandı",color:"green"},{label:"4 Kedi",color:"blue"}] },
                        { date:"01 Mar 2026", title:"💉 Toplu Aşı Uygulaması",
                          text:"Veteriner ekibiyle 38 kediye kuduz ve karma aşı yapıldı.",
                          color:"blue", tags:[{label:"Sağlık",color:"blue"},{label:"38 Hayvan",color:"green"}] },
                        { date:"26 Şub 2026", title:"🍽️ Otomatik Mama İstasyonu",
                          text:"Kütüphane önüne akıllı mama istasyonu yerleştirildi. Günde 2 kez otomatik besleme.",
                          color:"orange", tags:[{label:"Besleme",color:"orange"}] },
                        { date:"20 Şub 2026", title:"🤝 Gönüllü Eğitimi",
                          text:"12 yeni gönüllüye kedi bakımı ve ilk yardım eğitimi verildi.",
                          color:"yellow", tags:[{label:"Eğitim",color:"yellow"},{label:"12 Gönüllü",color:"green"}] },
                        { date:"15 Şub 2026", title:"🚀 Kampanya Başladı",
                          text:"50 yuva hedefiyle kampanyamız hayata geçti. İlk 3 günde 40 bağışçı.",
                          color:"green", tags:[{label:"Başlangıç",color:"green"}] }
                    ],
                    recentDonors:[
                        {name:"Ayşe K.",   initial:"A", amount:250,  time:"3 dk önce",   gradient:"g1"},
                        {name:"Mehmet T.", initial:"M", amount:100,  time:"15 dk önce",  gradient:"g2"},
                        {name:"Zeynep Ö.", initial:"Z", amount:500,  time:"1 saat önce", gradient:"g3"},
                        {name:"Can D.",    initial:"C", amount:50,   time:"2 saat önce", gradient:"g4"},
                        {name:"Selin A.",  initial:"S", amount:1000, time:"dün",         gradient:"g5"}
                    ]
                },
                "2": {
                    id:"2", title:"Sokak Köpeklerine Sahiplenme Desteği",
                    category:"Sahiplendirme", emoji:"🐕",
                    description:[
                        "Barınaktaki köpeklerin temel itaat eğitimi almasını, kısırlaştırılmasını ve sağlıklı yuvalara kavuşmasını destekliyoruz.",
                        "Eğitimli köpekler çok daha kolay sahiplendiriliyor. Bu yıl hedefimiz 60 köpeği yeni ailesiyle buluşturmak."
                    ],
                    raised:9400, goal:20000, donorCount:87, daysLeft:25,
                    activities:[
                        { date:"03 Mar 2026", title:"🏡 7 Köpek Yuva Buldu",
                          text:"Bu hafta 7 köpeğimiz titizlikle seçilen yeni aileleriyle buluştu.",
                          color:"green", tags:[{label:"Sahiplendirme",color:"green"},{label:"7 Köpek",color:"blue"}] },
                        { date:"28 Şub 2026", title:"🎓 İtaat Eğitimi Tamamlandı",
                          text:"15 köpek 4 haftalık pozitif pekiştirme eğitimini başarıyla bitirdi.",
                          color:"blue", tags:[{label:"Eğitim",color:"blue"}] },
                        { date:"22 Şub 2026", title:"✂️ Toplu Kısırlaştırma",
                          text:"20 köpek ücretsiz kısırlaştırma operasyonundan başarıyla geçti.",
                          color:"orange", tags:[{label:"Sağlık",color:"orange"}] }
                    ],
                    recentDonors:[
                        {name:"Fatma Y.", initial:"F", amount:200, time:"10 dk önce",  gradient:"g1"},
                        {name:"Ali R.",   initial:"A", amount:150, time:"45 dk önce",  gradient:"g3"},
                        {name:"Hakan B.", initial:"H", amount:300, time:"3 saat önce", gradient:"g2"}
                    ]
                },
                "3": {
                    id:"3", title:"Acil Tedavi Fonu",
                    category:"Sağlık", emoji:"💉",
                    description:[
                        "Sokak hayvanlarının acil veteriner tedavi masraflarını karşılamak için oluşturulan dayanışma fonudur. Hiçbir hayvan maddi engel nedeniyle tedavisiz kalmıyor.",
                        "Trafik kazası, zehirlenme veya yaralanma yaşayan hayvanlara anında müdahale sağlıyoruz. Bağışınız doğrudan veteriner faturasına aktarılır."
                    ],
                    raised:5200, goal:15000, donorCount:63, daysLeft:30,
                    activities:[
                        { date:"02 Mar 2026", title:"🚑 Acil Operasyon: Pamuk",
                          text:"Trafik kazasında yaralanan 'Pamuk' adlı kedi 4 saatlik operasyonla kurtarıldı.",
                          color:"orange", tags:[{label:"Acil",color:"orange"},{label:"Başarılı",color:"green"}] },
                        { date:"27 Şub 2026", title:"💊 Zehirlenme Vakası",
                          text:"Çöpten zehirlenen 3 kedi yoğun bakıma alındı. 2'si tamamen iyileşti.",
                          color:"blue", tags:[{label:"Zehirlenme",color:"blue"}] }
                    ],
                    recentDonors:[
                        {name:"Elif S.",  initial:"E", amount:75,  time:"20 dk önce",  gradient:"g4"},
                        {name:"Burak M.", initial:"B", amount:500, time:"2 saat önce", gradient:"g2"}
                    ]
                }
            };
            return all[sId] || all["1"];
        },

        /* ── Loading ── */
        _renderLoading: function () {
            this.byId("cdHTML").setContent(
                "<div class='cdWrap'><div class='cdLoading'>" +
                "<div class='cdLoadingLeaf'>🌿</div>" +
                "<div class='cdLoadingText'>Yükleniyor...</div>" +
                "</div></div>"
            );
        },

        /* ════════════════════
           FULL PAGE RENDER
        ════════════════════ */
        _renderPage: function (d) {
            var pct    = Math.min(Math.round((d.raised / d.goal) * 100), 100);
            var raised = Number(d.raised).toLocaleString("tr-TR");
            var goal   = Number(d.goal).toLocaleString("tr-TR");
            var cid    = d.id || this._campaignId || "1";

            var html =
                "<div class='cdWrap'>" +
                this._tabBar(cid) +
                "<div class='cdBody'>" +
                "<div class='cdBlockHeader'>"   + this._campaignHeader(d, pct) + "</div>" +
                "<div class='cdBlockProgress'>" + this._progress(d, pct, raised, goal) + "</div>" +
                "<div class='cdBlockInfo'>"     + this._description(d) + "</div>" +
                "<div class='cdBlockDonate'>"   + this._donate(d) + "</div>" +
                "<div class='cdBlockTimeline'>" + this._activities(d) + "</div>" +
                "<div class='cdBlockDonors'>"   + this._donors(d) + this._share() + "</div>" +
                "</div></div>" +
                this._scripts(pct, d.title, cid);

            this.byId("cdHTML").setContent(html);
        },

        /* ════════════════════
           TAB BAR
        ════════════════════ */
        _tabBar: function (activeCid) {
            var campaigns = [
                { id:"1", emoji:"🏠", label:"Kışlık Yuva" },
                { id:"2", emoji:"🐕", label:"Sahiplenme Desteği" },
                { id:"3", emoji:"💉", label:"Acil Tedavi Fonu" }
            ];
            var tabs = campaigns.map(function(c) {
                var cls = "cdTab" + (c.id === activeCid ? " cdTabActive" : "");
                return "<button class='" + cls + "' data-cid='" + c.id + "'>" +
                    "<span class='cdTabEmoji'>" + c.emoji + "</span>" +
                    "<span class='cdTabLabel'>" + c.label + "</span>" +
                    "</button>";
            }).join("");

            return "<div class='cdTabBar'>" +
                "<div class='cdTabBarInner'>" +
                "<span class='cdTabBarTitle'>🐾 Aktif Kampanyalar</span>" +
                "<div class='cdTabBtns'>" + tabs + "</div>" +
                "</div></div>";
        },

        /* ════════════════════
           CAMPAIGN HEADER
        ════════════════════ */
        _campaignHeader: function (d, pct) {
            return "<div class='cdCampHeader'>" +
                "<div class='cdCampHeaderLeft'>" +
                "<div class='cdCampEmoji'>" + d.emoji + "</div>" +
                "<div class='cdCampHeaderText'>" +
                "<div class='cdCampCategory'>" + d.category + "</div>" +
                "<h1 class='cdCampTitle'>" + d.title + "</h1>" +
                "<div class='cdCampMeta'>" +
                "<span class='cdCampMetaItem'>👥 " + d.donorCount + " bağışçı</span>" +
                "<span class='cdCampMetaItem'>🎯 %" + pct + " tamamlandı</span>" +
                "<span class='cdCampMetaItem'>⏳ " + d.daysLeft + " gün kaldı</span>" +
                "<span class='cdCampMetaItem cdMetaLive'>✅ Aktif</span>" +
                "</div></div></div>" +
                "<button class='cdActivitiesLink' id='cdBtnActivities'>📸 Faaliyetlerimize Göz At →</button>" +
                "</div>";
        },

        /* ════════════════════
           PROGRESS
        ════════════════════ */
        _progress: function (d, pct, raised, goal) {
            return "<div class='cdCard'>" +
                "<div class='cdCardHead'>" +
                "<div class='cdCardTitle'><span class='cti'>💚</span> Bağış Durumu</div>" +
                "<span class='cdCardPill'>%" + pct + " TAMAMLANDI</span>" +
                "</div>" +
                "<div class='cdProgressNumbers'>" +
                "<div class='cdProgressRaised'>₺" + raised + "<small>toplandı</small></div>" +
                "<div class='cdProgressGoal'>Hedef: ₺" + goal + "</div>" +
                "</div>" +
                "<div class='cdProgressTrack'><div class='cdProgressFill' id='cdPFill'></div></div>" +
                "<div class='cdProgressPct'>%" + pct + "</div>" +
                "<div class='cdProgStats'>" +
                "<div class='cdProgStat'><div class='psNum'>%" + pct + "</div><div class='psLabel'>Tamamlanan</div></div>" +
                "<div class='cdProgStat'><div class='psNum'>" + d.donorCount + "</div><div class='psLabel'>Bağışçı</div></div>" +
                "<div class='cdProgStat'><div class='psNum'>" + d.daysLeft + "</div><div class='psLabel'>Gün Kaldı</div></div>" +
                "</div></div>";
        },

        /* ════════════════════
           DESCRIPTION
        ════════════════════ */
        _description: function (d) {
            var ps = (d.description || []).map(function(p) {
                return "<p>" + p + "</p>";
            }).join("");
            return "<div class='cdCard'>" +
                "<div class='cdCardHead'><div class='cdCardTitle'><span class='cti'>📋</span> Kampanya Hakkında</div></div>" +
                "<div class='cdDesc'>" + ps + "</div></div>";
        },

        /* ════════════════════
           DONATE CARD
        ════════════════════ */
        _donate: function (d) {
            var subtitle = (d && d.category === "Sağlık")
                ? "Acil bir hayatı kurtarmak için küçük bir katkı bile yeter."
                : "Her bağış gerçek bir fark yaratır. Bugün bir can dostunun hayatına dokunun.";

            return "<div class='cdDonateCard'>" +
                "<h3>🐾 Destek Ol</h3>" +
                "<p>" + subtitle + "</p>" +
                "<div class='cdAmtGrid'>" +
                "<div class='cdAmtBtn' data-amt='50'>₺50</div>" +
                "<div class='cdAmtBtn sel' data-amt='100'>₺100</div>" +
                "<div class='cdAmtBtn' data-amt='250'>₺250</div>" +
                "<div class='cdAmtBtn' data-amt='500'>₺500</div>" +
                "<div class='cdAmtBtn' data-amt='1000'>₺1000</div>" +
                "<div class='cdAmtBtn' data-amt='0'>Diğer</div>" +
                "</div>" +
                "<div class='cdCustom'><span>₺</span>" +
                "<input id='cdAmtInput' type='number' placeholder='Tutar girin' value='100' min='1'/>" +
                "</div>" +
                "<button id='cdDonateBtnMain' class='cdDonateBtn'>❤️ Şimdi Bağış Yap</button>" +
                "<div class='cdDonateSecure'>🔒 Güvenli ödeme · SSL şifreli</div>" +
                "</div>";
        },

        /* ════════════════════
           TIMELINE
        ════════════════════ */
        _activities: function (d) {
            if (!d.activities || !d.activities.length) return "";
            var items = d.activities.map(function(a) {
                var tags = (a.tags || []).map(function(t) {
                    return "<span class='cdTLTag " + t.color + "'>" + t.label + "</span>";
                }).join("");
                return "<div class='cdTLItem'>" +
                    "<div class='cdTLDot " + (a.color || "green") + "'></div>" +
                    "<div class='cdTLBody'>" +
                    "<div class='cdTLTop'><div class='cdTLTitle'>" + a.title + "</div>" +
                    "<div class='cdTLDate'>" + a.date + "</div></div>" +
                    "<div class='cdTLText'>" + a.text + "</div>" +
                    (tags ? "<div class='cdTLTags'>" + tags + "</div>" : "") +
                    "</div></div>";
            }).join("");
            return "<div class='cdCard'>" +
                "<div class='cdCardHead'>" +
                "<div class='cdCardTitle'><span class='cti'>📌</span> Yapılan İşler</div>" +
                "<span class='cdCardPill'>" + d.activities.length + " KAYIT</span>" +
                "</div>" +
                "<div class='cdTimeline'>" + items + "</div></div>";
        },

        /* ════════════════════
           DONORS
        ════════════════════ */
        _donors: function (d) {
            if (!d.recentDonors || !d.recentDonors.length) return "";
            var items = d.recentDonors.map(function(dn) {
                return "<li class='cdDonorItem'>" +
                    "<div class='cdDonorAva " + (dn.gradient || "g1") + "'>" + dn.initial + "</div>" +
                    "<div class='cdDonorInfo'>" +
                    "<div class='cdDonorName'>" + dn.name + "</div>" +
                    "<div class='cdDonorTime'>" + dn.time + "</div>" +
                    "</div>" +
                    "<div class='cdDonorAmt'>₺" + Number(dn.amount).toLocaleString("tr-TR") + "</div>" +
                    "</li>";
            }).join("");
            return "<div class='cdCard' style='margin-bottom:18px'>" +
                "<div class='cdCardHead'><div class='cdCardTitle'><span class='cti'>🏅</span> Son Bağışçılar</div></div>" +
                "<ul class='cdDonorList'>" + items + "</ul></div>";
        },

        /* ════════════════════
           SHARE
        ════════════════════ */
        _share: function () {
            return "<div class='cdCard'>" +
                "<div class='cdCardHead'><div class='cdCardTitle'><span class='cti'>📢</span> Paylaş</div></div>" +
                "<div class='cdShareGrid'>" +
                "<button class='cdShareBtn fb' data-share='fb'>f Facebook</button>" +
                "<button class='cdShareBtn tw' data-share='tw'>✕ Twitter</button>" +
                "<button class='cdShareBtn wa' data-share='wa'>📱 WhatsApp</button>" +
                "<button class='cdShareBtn cp' data-share='cp'>🔗 Kopyala</button>" +
                "</div></div>";
        },

        /* ════════════════════════════════════════════════
           SCRIPTS
           ⚠️  window.postMessage  — parent değil!
               SAP UI5'te iframe yoktur.
        ════════════════════════════════════════════════ */
        _scripts: function (pct, title, activeCid) {
            var safeTitle  = JSON.stringify(title);
            var safeActive = JSON.stringify(activeCid);

            return "<script>(function(){\n" +

                /* 1. Progress bar */
                "  setTimeout(function(){\n" +
                "    var el=document.getElementById('cdPFill');\n" +
                "    if(el) el.style.width='" + pct + "%';\n" +
                "  },350);\n" +

                /* 2. Tab geçişi — window.postMessage (parent değil!) */
                "  document.addEventListener('click',function(e){\n" +
                "    var tab=e.target.closest('.cdTab');\n" +
                "    if(!tab) return;\n" +
                "    var cid=tab.getAttribute('data-cid');\n" +
                "    if(cid===" + safeActive + ") return;\n" +
                "    window.postMessage({type:'cdSwitchCampaign',id:cid},'*');\n" +
                "  });\n" +

                /* 3. Tutar seçme */
                "  document.addEventListener('click',function(e){\n" +
                "    var btn=e.target.closest('.cdAmtBtn');\n" +
                "    if(!btn) return;\n" +
                "    document.querySelectorAll('.cdAmtBtn').forEach(function(b){b.classList.remove('sel');});\n" +
                "    btn.classList.add('sel');\n" +
                "    var amt=parseInt(btn.getAttribute('data-amt'),10);\n" +
                "    var inp=document.getElementById('cdAmtInput');\n" +
                "    if(inp){ inp.value=amt>0?amt:''; if(amt===0) inp.focus(); }\n" +
                "  });\n" +

                /* 4. Bağış butonu — window.postMessage */
                "  var donateBtn=document.getElementById('cdDonateBtnMain');\n" +
                "  if(donateBtn){\n" +
                "    donateBtn.addEventListener('click',function(){\n" +
                "      var inp=document.getElementById('cdAmtInput');\n" +
                "      var amt=inp?parseFloat(inp.value):0;\n" +
                "      if(!amt||amt<1){\n" +
                "        inp && inp.classList.add('cdInputErr');\n" +
                "        setTimeout(function(){ inp && inp.classList.remove('cdInputErr'); },1200);\n" +
                "        return;\n" +
                "      }\n" +
                "      window.postMessage({type:'cdDonate',amount:amt},'*');\n" +
                "      donateBtn.textContent='✅ Gönderildi!';\n" +
                "      donateBtn.style.background='#2D6A4F';\n" +
                "      setTimeout(function(){\n" +
                "        donateBtn.textContent='❤️ Şimdi Bağış Yap';\n" +
                "        donateBtn.style.background='';\n" +
                "      },2500);\n" +
                "    });\n" +
                "  }\n" +

                /* 5. Faaliyetler linki — window.postMessage */
                "  var actBtn=document.getElementById('cdBtnActivities');\n" +
                "  if(actBtn){\n" +
                "    actBtn.addEventListener('click',function(){\n" +
                "      window.postMessage({type:'cdNavActivities'},'*');\n" +
                "    });\n" +
                "  }\n" +

                /* 6. Paylaş */
                "  document.addEventListener('click',function(e){\n" +
                "    var sbtn=e.target.closest('.cdShareBtn');\n" +
                "    if(!sbtn) return;\n" +
                "    var p=sbtn.getAttribute('data-share');\n" +
                "    var u=encodeURIComponent(window.location.href);\n" +
                "    var t=encodeURIComponent(" + safeTitle + ");\n" +
                "    if(p==='fb') window.open('https://www.facebook.com/sharer/sharer.php?u='+u,'_blank');\n" +
                "    else if(p==='tw') window.open('https://twitter.com/intent/tweet?url='+u+'&text='+t,'_blank');\n" +
                "    else if(p==='wa') window.open('https://api.whatsapp.com/send?text='+t+' '+u,'_blank');\n" +
                "    else if(p==='cp'){\n" +
                "      navigator.clipboard.writeText(window.location.href).then(function(){\n" +
                "        sbtn.textContent='✅ Kopyalandı!';\n" +
                "        setTimeout(function(){ sbtn.textContent='🔗 Kopyala'; },2000);\n" +
                "      });\n" +
                "    }\n" +
                "  });\n" +

                "})();<\/script>";
        },

        /* ════════════════════
           SAP EVENTS
        ════════════════════ */
        onNavBack: function () {
            var sPrev = History.getInstance().getPreviousHash();
            if (sPrev !== undefined) { window.history.go(-1); }
            else { this.getOwnerComponent().getRouter().navTo("home"); }
        },

        onDonatePress: function () {
            // Header'daki "Bağış Yap" butonu — DOM'dan güncel tutarı oku
            var oHTML = this.byId("cdHTML");
            var oDom  = oHTML && oHTML.getDomRef();
            var inp   = oDom && oDom.querySelector("#cdAmtInput");
            var fAmt  = inp ? (parseFloat(inp.value) || 100) : 100;
            this._onDonateAmount(fAmt);
        },

        _onDonateAmount: function (fAmt) {
            MessageToast.show("₺" + Number(fAmt).toLocaleString("tr-TR") + " bağış başlatılıyor…");
            // Gerçek ödeme akışı buraya:
            // this.getOwnerComponent().getRouter().navTo("payment", { amount: fAmt });
        }
    });
});