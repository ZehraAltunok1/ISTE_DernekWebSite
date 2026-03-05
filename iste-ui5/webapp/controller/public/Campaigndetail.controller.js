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
        },

        _onRoute: function () {
            var oModel = this.getOwnerComponent().getModel("appData");
            var sId    = (oModel && oModel.getProperty("/selectedCampaignId")) || "1";
            this._campaignId = sId;
            this._fetchCampaign(sId);
        },

        /* ── API ── */
        _fetchCampaign: function (sId) {
            var that = this;
            this._renderLoading();
            fetch("/api/campaigns/" + encodeURIComponent(sId), { headers: { "Accept": "application/json" } })
                .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
                .then(function (d) { that._renderPage(d); })
                .catch(function ()  { that._renderPage(that._getMock(sId)); });
        },

        /* ── Mock ── */
        _getMock: function (sId) {
            var all = {
                "1": {
                    id:"1", title:"Kampüs Kedileri İçin Kışlık Yuva",
                    category:"Barınak", emoji:"🏠", heroImage:"images/camp_hero1.jpg",
                    description:[
                        "Soğuk kış aylarında kampüs alanında yaşayan yüzlerce kedi için sıcak, güvenli barınak alanları oluşturuyoruz. Her yuvada yalıtım, mama istasyonu ve su kabı bulunuyor.",
                        "Bağışlarınızla daha fazla kedi kışı sıcak geçirebilecek. Hedefimize ulaşırsak 50 yeni yuva inşa edeceğiz."
                    ],
                    raised:18750, goal:30000, donorCount:142, daysLeft:18,
                    images:["images/c1a.jpg","images/c1b.jpg","images/c1c.jpg","images/c1d.jpg","images/c1e.jpg"],
                    activities:[
                        { date:"04 Mar 2026", title:"🏗️ 23. Yuva Tamamlandı",
                          text:"Mühendislik Fakültesi bahçesine yeni ısıtmalı yuva kuruldu. 4 kedi hemen yerleşti.",
                          color:"green", tags:[{label:"Tamamlandı",color:"green"},{label:"4 Kedi",color:"blue"}] },
                        { date:"01 Mar 2026", title:"💉 Toplu Aşı Uygulaması",
                          text:"Veteriner ekibiyle 38 kediye kuduz ve karma aşı yapıldı.",
                          color:"blue", tags:[{label:"Sağlık",color:"blue"},{label:"38 Hayvan",color:"green"}] },
                        { date:"26 Şub 2026", title:"🍽️ Mama İstasyonu",
                          text:"Kütüphane önüne otomatik mama istasyonu yerleştirildi. Günde 2 kez besleme.",
                          color:"orange", tags:[{label:"Besleme",color:"orange"}] },
                        { date:"20 Şub 2026", title:"🤝 Gönüllü Eğitimi",
                          text:"12 yeni gönüllüye bakım ve ilk yardım eğitimi verildi.",
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
                    category:"Sahiplendirme", emoji:"🐕", heroImage:"images/camp_hero2.jpg",
                    description:[
                        "Barınaktaki köpeklerin eğitim almasını, kısırlaştırılmasını ve sağlıklı yuvalara kavuşmasını destekliyoruz.",
                        "Eğitimli köpekler çok daha kolay sahiplendiriliyor."
                    ],
                    raised:9400, goal:20000, donorCount:87, daysLeft:25,
                    images:["images/c2a.jpg","images/c2b.jpg","images/c2c.jpg"],
                    activities:[
                        { date:"03 Mar 2026", title:"🏡 7 Köpek Yuva Buldu",
                          text:"Bu hafta 7 köpeğimiz yeni aileleriyle buluştu.",
                          color:"green", tags:[{label:"Sahiplendirme",color:"green"},{label:"7 Köpek",color:"blue"}] },
                        { date:"28 Şub 2026", title:"🎓 İtaat Eğitimi",
                          text:"15 köpek 4 haftalık eğitimi başarıyla bitirdi.",
                          color:"blue", tags:[{label:"Eğitim",color:"blue"}] },
                        { date:"22 Şub 2026", title:"✂️ Kısırlaştırma",
                          text:"20 köpek ücretsiz operasyondan geçti.",
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
                    category:"Sağlık", emoji:"💉", heroImage:"images/camp_hero3.jpg",
                    description:[
                        "Sokak hayvanlarının acil veteriner tedavi masraflarını karşılamak için oluşturulan dayanışma fonu.",
                        "Trafik kazası, zehirlenme veya yaralanma yaşayan hayvanlar için anında müdahale sağlıyoruz."
                    ],
                    raised:5200, goal:15000, donorCount:63, daysLeft:30,
                    images:["images/c3a.jpg","images/c3b.jpg","images/c3c.jpg"],
                    activities:[
                        { date:"02 Mar 2026", title:"🚑 Acil Operasyon: Pamuk",
                          text:"Trafik kazasında yaralanan 'Pamuk' 4 saatlik operasyonla kurtarıldı.",
                          color:"orange", tags:[{label:"Acil",color:"orange"},{label:"Başarılı",color:"green"}] },
                        { date:"27 Şub 2026", title:"💊 Zehirlenme Vakası",
                          text:"Çöpten zehirlenen 3 kedi yoğun bakıma alındı. 2'si iyileşti.",
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

        /* ── Full Page ── */
        _renderPage: function (d) {
            var pct    = Math.min(Math.round((d.raised / d.goal) * 100), 100);
            var raised = Number(d.raised).toLocaleString("tr-TR");
            var goal   = Number(d.goal).toLocaleString("tr-TR");

            var html =
                "<div class='cdWrap'>" +
                this._hero(d, pct) +
                "<div class='cdBody'>" +

                // Satır 1: Progress — tam genişlik
                "<div class='cdBlockProgress'>" + this._progress(d, pct, raised, goal) + "</div>" +

                // Satır 2: Kampanya bilgisi (sol) + Bağış (sağ)
                "<div class='cdBlockInfo'>"   + this._description(d) + "</div>" +
                "<div class='cdBlockDonate'>" + this._donate()       + "</div>" +

                // Satır 3: Timeline (sol) + Son bağışçılar + paylaş (sağ)
                "<div class='cdBlockTimeline'>" + this._activities(d) + "</div>" +
                "<div class='cdBlockDonors'>"   + this._donors(d) + this._share() + "</div>" +

                // Satır 4: Galeri — tam genişlik
                (d.images && d.images.length
                    ? "<div class='cdBlockGallery'>" + this._gallery(d) + "</div>"
                    : "") +

                "</div></div>" +
                this._scripts(pct, d.title);

            this.byId("cdHTML").setContent(html);
            window._cdDonate = this._onDonateAmount.bind(this);
        },

        /* ── Builders ── */
        _hero: function (d, pct) {
            return "<div class='cdHero'>" +
                "<img class='cdHeroImg' src='"+(d.heroImage||"")+"' onerror=\"this.style.display='none'\" alt=''/>" +
                "<div class='cdHeroOverlay'></div>" +
                "<div class='cdHeroLeaves'><span>🍃</span><span>🌿</span><span>🍃</span><span>🌱</span><span>🍃</span></div>" +
                "<div class='cdHeroContent'>" +
                "  <div class='cdHeroBadges'>" +
                "    <span class='cdHeroBadge cat'>"+d.emoji+" "+d.category+"</span>" +
                "    <span class='cdHeroBadge days'>⏳ "+d.daysLeft+" Gün Kaldı</span>" +
                "    <span class='cdHeroBadge live'>✅ Aktif</span>" +
                "  </div>" +
                "  <h1 class='cdHeroTitle'>"+d.title+"</h1>" +
                "  <div class='cdHeroMeta'>" +
                "    <span class='cdHeroMetaItem'>👥 "+d.donorCount+" bağışçı</span>" +
                "    <span class='cdHeroMetaItem'>🎯 %"+pct+" tamamlandı</span>" +
                "    <span class='cdHeroMetaItem'>📋 "+(d.activities?d.activities.length:0)+" aktivite</span>" +
                "  </div>" +
                "</div></div>";
        },

        _progress: function (d, pct, raised, goal) {
            return "<div class='cdCard'>" +
                "<div class='cdCardHead'>" +
                "  <div class='cdCardTitle'><span class='cti'>💚</span> Bağış Durumu</div>" +
                "  <span class='cdCardPill'>%"+pct+" TAMAMLANDI</span>" +
                "</div>" +
                "<div class='cdProgressNumbers'>" +
                "  <div class='cdProgressRaised'>₺"+raised+"<small>toplandı</small></div>" +
                "  <div class='cdProgressGoal'>Hedef: ₺"+goal+"</div>" +
                "</div>" +
                "<div class='cdProgressTrack'><div class='cdProgressFill' id='cdPFill'></div></div>" +
                "<div class='cdProgressPct'>%"+pct+"</div>" +
                "<div class='cdProgStats'>" +
                "  <div class='cdProgStat'><div class='psNum'>%"+pct+"</div><div class='psLabel'>Tamamlanan</div></div>" +
                "  <div class='cdProgStat'><div class='psNum'>"+d.donorCount+"</div><div class='psLabel'>Bağışçı</div></div>" +
                "  <div class='cdProgStat'><div class='psNum'>"+d.daysLeft+"</div><div class='psLabel'>Gün Kaldı</div></div>" +
                "</div></div>";
        },

        _description: function (d) {
            var ps = (d.description||[]).map(function(p){return "<p>"+p+"</p>";}).join("");
            return "<div class='cdCard'>" +
                "<div class='cdCardHead'><div class='cdCardTitle'><span class='cti'>📋</span> Kampanya Hakkında</div></div>" +
                "<div class='cdDesc'>"+ps+"</div></div>";
        },

        _donate: function () {
            return "<div class='cdDonateCard'>" +
                "<h3>🐾 Destek Ol</h3>" +
                "<p>Her bağış gerçek bir fark yaratır. Bugün bir can dostunun hayatına dokunun.</p>" +
                "<div class='cdAmtGrid'>" +
                "  <div class='cdAmtBtn' onclick='window._cdAmt(this,50)'>₺50</div>" +
                "  <div class='cdAmtBtn sel' onclick='window._cdAmt(this,100)'>₺100</div>" +
                "  <div class='cdAmtBtn' onclick='window._cdAmt(this,250)'>₺250</div>" +
                "  <div class='cdAmtBtn' onclick='window._cdAmt(this,500)'>₺500</div>" +
                "  <div class='cdAmtBtn' onclick='window._cdAmt(this,1000)'>₺1000</div>" +
                "  <div class='cdAmtBtn' onclick='window._cdAmt(this,0)'>Diğer</div>" +
                "</div>" +
                "<div class='cdCustom'><span>₺</span>" +
                "  <input id='cdAmtInput' type='number' placeholder='Tutar girin' value='100' min='1'/>" +
                "</div>" +
                "<button class='cdDonateBtn' onclick='window._cdDonateNow()'>❤️ Şimdi Bağış Yap</button>" +
                "<div class='cdDonateSecure'>🔒 Güvenli ödeme altyapısı</div>" +
                "</div>";
        },

        _activities: function (d) {
            if (!d.activities || !d.activities.length) return "";
            var items = d.activities.map(function(a) {
                var tags = (a.tags||[]).map(function(t){
                    return "<span class='cdTLTag "+t.color+"'>"+t.label+"</span>";
                }).join("");
                return "<div class='cdTLItem'>" +
                    "<div class='cdTLDot "+(a.color||"green")+"'></div>" +
                    "<div class='cdTLBody'>" +
                    "  <div class='cdTLTop'><div class='cdTLTitle'>"+a.title+"</div><div class='cdTLDate'>"+a.date+"</div></div>" +
                    "  <div class='cdTLText'>"+a.text+"</div>" +
                    (tags?"<div class='cdTLTags'>"+tags+"</div>":"") +
                    "</div></div>";
            }).join("");
            return "<div class='cdCard'>" +
                "<div class='cdCardHead'>" +
                "  <div class='cdCardTitle'><span class='cti'>📌</span> Yapılan İşler</div>" +
                "  <span class='cdCardPill'>"+d.activities.length+" KAYIT</span>" +
                "</div>" +
                "<div class='cdTimeline'>"+items+"</div></div>";
        },

        _donors: function (d) {
            if (!d.recentDonors || !d.recentDonors.length) return "";
            var items = d.recentDonors.map(function(dn){
                return "<li class='cdDonorItem'>" +
                    "<div class='cdDonorAva "+(dn.gradient||"g1")+"'>"+dn.initial+"</div>" +
                    "<div class='cdDonorInfo'><div class='cdDonorName'>"+dn.name+"</div><div class='cdDonorTime'>"+dn.time+"</div></div>" +
                    "<div class='cdDonorAmt'>₺"+Number(dn.amount).toLocaleString("tr-TR")+"</div>" +
                    "</li>";
            }).join("");
            return "<div class='cdCard' style='margin-bottom:18px'>" +
                "<div class='cdCardHead'><div class='cdCardTitle'><span class='cti'>🏅</span> Son Bağışçılar</div></div>" +
                "<ul class='cdDonorList'>"+items+"</ul></div>";
        },

        _share: function () {
            return "<div class='cdCard'>" +
                "<div class='cdCardHead'><div class='cdCardTitle'><span class='cti'>📢</span> Paylaş</div></div>" +
                "<div class='cdShareGrid'>" +
                "  <button class='cdShareBtn fb' onclick='window._cdShare(\"fb\")'>f Facebook</button>" +
                "  <button class='cdShareBtn tw' onclick='window._cdShare(\"tw\")'>✕ Twitter</button>" +
                "  <button class='cdShareBtn wa' onclick='window._cdShare(\"wa\")'>📱 WhatsApp</button>" +
                "  <button class='cdShareBtn cp' onclick='window._cdShare(\"cp\")'>🔗 Kopyala</button>" +
                "</div></div>";
        },

        _gallery: function (d) {
            var imgs = d.images.map(function(src, i){
                return "<div class='cdGalleryItem'>" +
                    "<img src='"+src+"' alt='Görsel "+(i+1)+"' " +
                    "     onerror=\"this.closest('.cdGalleryItem').style.background='#E2F0E2'\"/>" +
                    "<div class='cdGalleryOverlay'>🔍</div>" +
                    "</div>";
            }).join("");
            return "<div class='cdCard'>" +
                "<div class='cdCardHead'>" +
                "  <div class='cdCardTitle'><span class='cti'>📸</span> Galeri</div>" +
                "  <span class='cdCardPill'>"+d.images.length+" FOTOĞRAF</span>" +
                "</div>" +
                "<div class='cdGallery'>"+imgs+"</div></div>";
        },

        _scripts: function (pct, title) {
            var t = encodeURIComponent(title);
            return "<script>" +
                "(function(){setTimeout(function(){var el=document.getElementById('cdPFill');if(el)el.style.width='"+pct+"%';},350);})();" +
                "window._cdAmt=function(el,amt){document.querySelectorAll('.cdAmtBtn').forEach(function(b){b.classList.remove('sel');});el.classList.add('sel');var inp=document.getElementById('cdAmtInput');if(inp){inp.value=amt>0?amt:'';if(amt===0)inp.focus();}};" +
                "window._cdDonateNow=function(){var inp=document.getElementById('cdAmtInput');var amt=inp?parseFloat(inp.value):0;if(!amt||amt<1){alert('Lütfen geçerli bir tutar girin.');return;}if(window._cdDonate)window._cdDonate(amt);};" +
                "window._cdShare=function(p){var u=encodeURIComponent(window.location.href);if(p==='fb')window.open('https://www.facebook.com/sharer/sharer.php?u='+u,'_blank');else if(p==='tw')window.open('https://twitter.com/intent/tweet?url='+u+'&text="+t+"','_blank');else if(p==='wa')window.open('https://api.whatsapp.com/send?text="+t+" '+u,'_blank');else if(p==='cp')navigator.clipboard.writeText(window.location.href).then(function(){alert('Kopyalandı!');});};" +
                "<\/script>";
        },

        /* ── SAP Events ── */
        onNavBack: function () {
            var sPrev = History.getInstance().getPreviousHash();
            if (sPrev !== undefined) { window.history.go(-1); }
            else { this.getOwnerComponent().getRouter().navTo("home"); }
        },

        onDonatePress: function () {
            var inp = document.getElementById("cdAmtInput");
            this._onDonateAmount(inp ? parseFloat(inp.value) || 100 : 100);
        },

        _onDonateAmount: function (fAmt) {
            MessageToast.show("₺" + fAmt + " bağış başlatılıyor…");
        }
    });
});