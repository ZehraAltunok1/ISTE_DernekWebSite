sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (MessageBox, MessageToast) {
    "use strict";

    const API_BASE = "http://localhost:3000/api";

    return {

        // ─────────────────────────────────────────────────────────────
        // VERİ YÜKLEME — başlığa göre grupla
        // ─────────────────────────────────────────────────────────────

        _loadMedia: function () {
            var that   = this;
            var oModel = this.getModel("dashboardData");

            this._apiCall("GET", "/media")
                .then(function (data) {
                    if (!data.success) return;

                    var aAll = data.media || [];

                    // ── Fotoğrafları başlığa göre grupla ──────────────────────
                    var oPhotoGroups = {};
                    var aPhotoOrder  = [];

                    aAll.filter(function (m) { return m.type === "photo"; })
                        .forEach(function (m) {
                            var sKey = (m.title || "Diğer").trim();
                            if (!oPhotoGroups[sKey]) {
                                oPhotoGroups[sKey] = [];
                                aPhotoOrder.push(sKey);
                            }
                            oPhotoGroups[sKey].push(m);
                        });

                    var aPhotoGroups = aPhotoOrder.map(function (sKey) {
                        var aItems    = oPhotoGroups[sKey];
                        var oCover    = aItems.find(function (i) { return i.is_cover; }) || aItems[0];
                        var sCoverUrl = oCover.url
                            ? (oCover.url.startsWith("http") ? oCover.url : "http://localhost:3000" + oCover.url)
                            : "";
                        return {
                            _isGroup:      true,
                            groupTitle:    sKey,
                            count:         aItems.length,
                            coverUrl:      sCoverUrl,
                            items:         aItems,
                            ids:           aItems.map(function (i) { return i._id || i.id; }),
                            created_at_tr: oCover.created_at
                                ? new Date(oCover.created_at).toLocaleDateString("tr-TR")
                                : "-"
                        };
                    });

                    // ── Videoları düz liste olarak bırak ──────────────────────
                    var aVideos = aAll
                        .filter(function (m) { return m.type === "video"; })
                        .map(function (m) {
                            m._isGroup      = false;
                            m.created_at_tr = m.created_at
                                ? new Date(m.created_at).toLocaleDateString("tr-TR")
                                : "-";
                            return m;
                        });

                    oModel.setProperty("/mediaGroups", aPhotoGroups);
                    oModel.setProperty("/mediaVideos", aVideos);
                    oModel.setProperty("/mediaItems",  aAll);
                })
                .catch(function () {
                    MessageToast.show("Medya yüklenemedi.");
                });
        },

        // ─────────────────────────────────────────────────────────────
        // FOTOĞRAF YÜKLEME  (çoklu dosya) — DEĞİŞMEDİ
        // ─────────────────────────────────────────────────────────────

        onAddPhoto: function () {
            var that = this;
            this._selectedPhotoFiles = [];

            this._openDialog(
                "_oPhotoDialog",
                "edusupport.platform.view.fragments.PhotoUploadDialog",
                "photoModel",
                { title: "", description: "" }
            );

            setTimeout(function () { that._bindPhotoDropZone(); }, 400);
        },

        _bindPhotoDropZone: function () {
            var that = this;

            window._handlePhotoSelect = function (event) {
                that._addPhotoFiles(Array.from(event.target.files || []));
            };

            window._handlePhotoDrop = function (event) {
                event.preventDefault();
                var dropZone = document.getElementById("photoDropZone");
                if (dropZone) dropZone.style.background = "#F0F7FF";
                var files = Array.from(event.dataTransfer.files || [])
                    .filter(function (f) { return f.type.startsWith("image/"); });
                that._addPhotoFiles(files);
            };
        },

        _addPhotoFiles: function (aNewFiles) {
            var that      = this;
            var aAllowed  = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            var nMaxSize  = 20 * 1024 * 1024;
            var aRejected = [];

            aNewFiles.forEach(function (oFile) {
                if (!aAllowed.includes(oFile.type)) {
                    aRejected.push(oFile.name + " (desteklenmeyen format)");
                    return;
                }
                if (oFile.size > nMaxSize) {
                    aRejected.push(oFile.name + " (20 MB'tan büyük)");
                    return;
                }
                var bExists = that._selectedPhotoFiles.some(function (f) {
                    return f.name === oFile.name && f.size === oFile.size;
                });
                if (!bExists) that._selectedPhotoFiles.push(oFile);
            });

            if (aRejected.length) MessageToast.show("Atlandı: " + aRejected.join(", "));
            this._renderPhotoPreview();
        },

        _renderPhotoPreview: function () {
            var that       = this;
            var oContainer = document.getElementById("photoPreviewContainer");
            var oCountText = this.byId("photoFileCount");
            var oUploadBtn = this.byId("photoUploadBtn");

            if (!oContainer) return;
            oContainer.innerHTML = "";

            this._selectedPhotoFiles.forEach(function (oFile, nIdx) {
                var oReader    = new FileReader();
                oReader.onload = function (e) {
                    var oDiv = document.createElement("div");
                    oDiv.style.cssText = "position:relative;width:90px;";
                    oDiv.innerHTML =
                        "<img src='" + e.target.result + "' style='width:90px;height:72px;object-fit:cover;" +
                        "border-radius:8px;display:block;box-shadow:0 2px 8px rgba(0,0,0,0.12);'/>" +
                        "<button onclick='window._removePhotoFile(" + nIdx + ")' style='position:absolute;" +
                        "top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#EF4444;" +
                        "color:#fff;border:none;cursor:pointer;font-size:11px;'>✕</button>" +
                        "<div style='font-size:0.65rem;color:#6B7280;white-space:nowrap;overflow:hidden;" +
                        "text-overflow:ellipsis;max-width:90px;margin-top:4px;text-align:center;'>" +
                        oFile.name + "</div>";
                    oContainer.appendChild(oDiv);
                };
                oReader.readAsDataURL(oFile);
            });

            var nCount = this._selectedPhotoFiles.length;
            if (oCountText) { oCountText.setText(nCount > 0 ? nCount + " dosya seçildi" : ""); oCountText.setVisible(nCount > 0); }
            if (oUploadBtn) oUploadBtn.setEnabled(nCount > 0);

            window._removePhotoFile = function (nIdx) {
                that._selectedPhotoFiles.splice(nIdx, 1);
                that._renderPhotoPreview();
            };
        },

        onSavePhoto: function () {
            var that   = this;
            var sTitle = this.byId("photoTitle").getValue().trim();
            var sDesc  = this.byId("photoDescription").getValue().trim();

            if (!sTitle) { MessageBox.error("Başlık zorunludur!"); return; }
            if (!this._selectedPhotoFiles || !this._selectedPhotoFiles.length) {
                MessageBox.error("Lütfen en az bir fotoğraf seçin!");
                return;
            }

            this._oPhotoDialog.setBusy(true);

            var aFiles   = this._selectedPhotoFiles.slice();
            var nTotal   = aFiles.length;
            var nSuccess = 0;
            var nFail    = 0;
            var sAuth    = "Bearer " + localStorage.getItem("authToken");

            var fnNext = function (nIdx) {
                if (nIdx >= aFiles.length) {
                    that._oPhotoDialog.setBusy(false);
                    that._oPhotoDialog.close();
                    that._loadMedia();
                    MessageToast.show(nTotal === 1
                        ? "Fotoğraf yüklendi!"
                        : nSuccess + "/" + nTotal + " fotoğraf yüklendi" + (nFail > 0 ? ", " + nFail + " başarısız." : "!"));
                    return;
                }
                var oFD = new FormData();
                oFD.append("photo",       aFiles[nIdx]);
                oFD.append("title",       sTitle);
                oFD.append("description", sDesc);

                fetch(API_BASE + "/media/upload-photo", {
                    method: "POST", headers: { "Authorization": sAuth }, body: oFD
                })
                .then(function (r) { return r.json(); })
                .then(function (d) { d.success ? nSuccess++ : nFail++; fnNext(nIdx + 1); })
                .catch(function ()  { nFail++;                          fnNext(nIdx + 1); });
            };

            fnNext(0);
        },

        onClosePhotoDialog: function () {
            if (this._oPhotoDialog) this._oPhotoDialog.close();
            this._selectedPhotoFiles = [];
        },

        // ─────────────────────────────────────────────────────────────
        // FOTOĞRAF GRUBU DÜZENLE — GELİŞTİRİLDİ
        // ─────────────────────────────────────────────────────────────

        onEditPhotoGroup: function (oEvent) {
            var that     = this;
            var oContext = this._getContext(oEvent, "dashboardData", "/mediaGroups");
            if (!oContext) return;
            var oGroup   = oContext.getObject();

            // Durum değişkenlerini sıfırla
            this._editNewFiles      = [];   // yeni eklenecek File nesneleri
            this._editDeletedIds    = [];   // silinecek _id'ler
            this._editCurrentPhotos = [];   // mevcut fotoğraflar
            this._editCoverId       = null; // kapak _id'si

            // Mevcut fotoğrafları hazırla
            this._editCurrentPhotos = oGroup.items.map(function (m, i) {
                return {
                    _id     : m._id || m.id,
                    url     : m.url
                        ? (m.url.startsWith("http") ? m.url : "http://localhost:3000" + m.url)
                        : "",
                    is_cover: !!m.is_cover,
                    order   : typeof m.order === "number" ? m.order : i
                };
            });

            // Kapak id'sini bul
            var oCover = this._editCurrentPhotos.find(function (p) { return p.is_cover; });
            this._editCoverId = oCover
                ? oCover._id
                : (this._editCurrentPhotos[0] ? this._editCurrentPhotos[0]._id : null);

            this._openDialog(
                "_oPhotoEditDialog",
                "edusupport.platform.view.fragments.PhotoEditDialog",
                "photoEditModel",
                {
                    groupTitle : oGroup.groupTitle,
                    description: oGroup.items[0] ? (oGroup.items[0].description || "") : "",
                    ids        : oGroup.ids
                }
            );

            setTimeout(function () {
                that._renderEditGrid();
                that._bindEditDropZone();
            }, 400);
        },


        _renderEditGrid: function () {
            var that  = this;
            var oGrid = document.getElementById("photoEditGrid");
            if (!oGrid) return;
            oGrid.innerHTML = "";

            this._editCurrentPhotos.forEach(function (oPhoto) {
                var bIsCover = (oPhoto._id === that._editCoverId);
                var div      = document.createElement("div");
                div.dataset.id = oPhoto._id;
                div.draggable  = true;
                div.style.cssText =
                    "position:relative;width:110px;height:110px;border-radius:8px;" +
                    "overflow:hidden;cursor:grab;background:#F3F4F6;flex-shrink:0;" +
                    "border:3px solid " + (bIsCover ? "#F0AB00" : "#E5E7EB") + ";";

                div.innerHTML =
                    "<img src='" + oPhoto.url + "' alt='' style='width:100%;height:100%;" +
                    "object-fit:cover;display:block;' onerror=\"this.src='images/placeholder.jpg'\"/>" +

                    // ── Kapak göstergesi ──
                    (bIsCover
                        ? "<div style='position:absolute;bottom:0;left:0;right:0;" +
                        "background:rgba(240,171,0,0.88);color:#fff;font-size:0.65rem;" +
                        "font-weight:700;text-align:center;padding:3px 0;'>⭐ KAPAK</div>"
                        : "") +

                    // ── Kapak yap butonu ──
                    "<button title='Kapak yap' data-id='" + oPhoto._id + "'" +
                    " style='position:absolute;top:4px;left:4px;background:rgba(255,255,255,0.90);" +
                    "border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;" +
                    "font-size:13px;line-height:26px;text-align:center;" +
                    (bIsCover ? "opacity:0.4;cursor:default;" : "") + "'>" +
                    (bIsCover ? "⭐" : "☆") + "</button>" +

                    // ── Sil butonu ──
                    "<button title='Sil' data-del='" + oPhoto._id + "'" +
                    " style='position:absolute;top:4px;right:4px;background:rgba(220,38,38,0.85);" +
                    "color:#fff;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;" +
                    "font-size:12px;line-height:26px;text-align:center;'>🗑</button>";

                // ── Kapak yap — event listener (window fonksiyonu YOK, doğrudan) ──
                var oCoverBtn = div.querySelector("button[data-id]");
                if (oCoverBtn && !bIsCover) {
                    oCoverBtn.addEventListener("click", function () {
                        that._editCoverId = oPhoto._id;
                        that._renderEditGrid();   // grid yeniden çizilir
                    });
                }

                // ── Sil — event listener ──
                var oDelBtn = div.querySelector("button[data-del]");
                if (oDelBtn) {
                    oDelBtn.addEventListener("click", function () {
                        if (!that._editDeletedIds.includes(oPhoto._id)) {
                            that._editDeletedIds.push(oPhoto._id);
                        }
                        that._editCurrentPhotos = that._editCurrentPhotos.filter(function (p) {
                            return p._id !== oPhoto._id;
                        });
                        // Silinen kapaksa bir sonrakini kapak yap
                        if (that._editCoverId === oPhoto._id) {
                            that._editCoverId = that._editCurrentPhotos.length
                                ? that._editCurrentPhotos[0]._id
                                : null;
                        }
                        that._renderEditGrid();
                    });
                }

                // ── Drag & Drop sıralama ──
                div.addEventListener("dragstart", function (e) {
                    e.dataTransfer.setData("text/plain", oPhoto._id);
                    div.style.opacity = "0.45";
                });
                div.addEventListener("dragend", function () {
                    div.style.opacity = "1";
                });
                div.addEventListener("dragover", function (e) {
                    e.preventDefault();
                    div.style.outline = "2px dashed #0070F2";
                });
                div.addEventListener("dragleave", function () {
                    div.style.outline = "none";
                });
                div.addEventListener("drop", function (e) {
                    e.preventDefault();
                    div.style.outline = "none";
                    var sFromId  = e.dataTransfer.getData("text/plain");
                    var oFromDiv = oGrid.querySelector("[data-id='" + sFromId + "']");
                    if (oFromDiv && oFromDiv !== div) {
                        oGrid.insertBefore(oFromDiv, div);
                        that._syncOrderFromGrid();
                    }
                });

                oGrid.appendChild(div);
            });
        },

        // ── Kaydet ───────────────────────────────────────────────
        onSavePhotoEdit: function () {
            var that      = this;
            var oModel    = this._oPhotoEditDialog.getModel("photoEditModel");
            var sNewTitle = (this.byId("photoEditTitle")
                ? this.byId("photoEditTitle").getValue()
                : oModel.getProperty("/groupTitle")).trim();
            var sNewDesc  = (this.byId("photoEditDescription")
                ? this.byId("photoEditDescription").getValue()
                : "").trim();

            if (!sNewTitle) { sap.m.MessageBox.error("Başlık boş olamaz!"); return; }

            // Kapak seçilmemişse ilk fotoğrafı kapak yap
            if (!that._editCoverId && that._editCurrentPhotos.length) {
                that._editCoverId = that._editCurrentPhotos[0]._id;
            }

            this._oPhotoEditDialog.setBusy(true);
            var sAuth = "Bearer " + localStorage.getItem("authToken");

            // 1) Başlık + açıklama + sıra + kapak — tek seferde her fotoğrafa gönder
            var aUpdateReqs = this._editCurrentPhotos.map(function (oPhoto, i) {
                // Sıra DOM'dan güncelle
                var oGrid  = document.getElementById("photoEditGrid");
                var nOrder = i;
                if (oGrid) {
                    var els = Array.from(oGrid.children);
                    var idx = els.findIndex(function (el) { return el.dataset.id === oPhoto._id; });
                    if (idx !== -1) nOrder = idx;
                }

                return fetch(API_BASE + "/media/" + oPhoto._id, {
                    method : "PUT",
                    headers: { "Content-Type": "application/json", "Authorization": sAuth },
                    body   : JSON.stringify({
                        title      : sNewTitle,
                        description: sNewDesc,
                        order      : nOrder,
                        is_cover   : (oPhoto._id === that._editCoverId)  // ← kapak bilgisi
                    })
                }).then(function (r) { return r.json(); });
            });

            // 2) Silinecekler
            var aDeleteReqs = this._editDeletedIds.map(function (sId) {
                return fetch(API_BASE + "/media/" + sId, {
                    method : "DELETE",
                    headers: { "Authorization": sAuth }
                }).then(function (r) { return r.json(); });
            });

            // 3) Yeni fotoğrafları yükle
            var fnUploadNew = function () {
                if (!that._editNewFiles.length) return Promise.resolve();
                return that._editNewFiles.reduce(function (pChain, f, i) {
                    return pChain.then(function () {
                        var fd = new FormData();
                        fd.append("photo",       f);
                        fd.append("title",       sNewTitle);
                        fd.append("description", sNewDesc);
                        return fetch(API_BASE + "/media/upload-photo", {
                            method : "POST",
                            headers: { "Authorization": sAuth },
                            body   : fd
                        }).then(function (r) { return r.json(); });
                    });
                }, Promise.resolve());
            };

            Promise.all(aUpdateReqs)
                .then(function () { return Promise.all(aDeleteReqs); })
                .then(function () { return fnUploadNew(); })
                .then(function () {
                    that._oPhotoEditDialog.setBusy(false);
                    that._oPhotoEditDialog.close();
                    that._loadMedia();
                    sap.m.MessageToast.show("✅ Grup güncellendi!");
                })
                .catch(function (err) {
                    that._oPhotoEditDialog.setBusy(false);
                    sap.m.MessageBox.error("Güncelleme sırasında hata oluştu!\n" + (err.message || ""));
                });
        },

        // DOM'dan sıralamayı güncelle
        _syncOrderFromGrid: function () {
            var that  = this;
            var oGrid = document.getElementById("photoEditGrid");
            if (!oGrid) return;
            Array.from(oGrid.children).forEach(function (el, i) {
                var oPhoto = that._editCurrentPhotos.find(function (p) { return p._id === el.dataset.id; });
                if (oPhoto) oPhoto.order = i;
            });
        },

        // ── Yeni fotoğraf drop zone ──
        _bindEditDropZone: function () {
            var that = this;

            window._editHandleSelect = function (event) {
                that._addEditFiles(Array.from(event.target.files || []));
                event.target.value = "";
            };

            window._editHandleDrop = function (event) {
                event.preventDefault();
                var zone = document.getElementById("editDropZone");
                if (zone) zone.style.background = "#F0F7FF";
                var files = Array.from(event.dataTransfer.files || [])
                    .filter(function (f) { return f.type.startsWith("image/"); });
                that._addEditFiles(files);
            };
        },

        _addEditFiles: function (aFiles) {
            var that     = this;
            var allowed  = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            var maxSize  = 20 * 1024 * 1024;
            var rejected = [];

            aFiles.forEach(function (f) {
                if (!allowed.includes(f.type)) { rejected.push(f.name + " (desteklenmeyen format)"); return; }
                if (f.size > maxSize)          { rejected.push(f.name + " (20 MB sınırı)");           return; }
                var exists = that._editNewFiles.some(function (x) {
                    return x.name === f.name && x.size === f.size;
                });
                if (!exists) that._editNewFiles.push(f);
            });

            if (rejected.length) MessageToast.show("Atlandı: " + rejected.join(", "));
            this._renderEditNewPreviews();
        },

        _renderEditNewPreviews: function () {
            var that      = this;
            var container = document.getElementById("editNewPreviewContainer");
            var oCount    = this.byId("editNewCount");
            if (!container) return;
            container.innerHTML = "";

            this._editNewFiles.forEach(function (f, i) {
                var reader    = new FileReader();
                reader.onload = function (e) {
                    var wrap = document.createElement("div");
                    wrap.style.cssText = "position:relative;width:80px;flex-shrink:0;";
                    wrap.innerHTML =
                        "<img src='" + e.target.result + "' style='width:80px;height:64px;" +
                        "object-fit:cover;border-radius:6px;display:block;" +
                        "box-shadow:0 2px 6px rgba(0,0,0,0.12);'/>" +
                        "<button onclick='window._editRemoveNew(" + i + ")'" +
                        " style='position:absolute;top:-6px;right:-6px;width:18px;height:18px;" +
                        "border-radius:50%;background:#EF4444;color:#fff;border:none;" +
                        "cursor:pointer;font-size:10px;line-height:18px;text-align:center;'>✕</button>" +
                        "<div style='font-size:0.6rem;color:#6B7280;white-space:nowrap;overflow:hidden;" +
                        "text-overflow:ellipsis;max-width:80px;margin-top:2px;text-align:center;'>" +
                        f.name + "</div>";
                    container.appendChild(wrap);
                };
                reader.readAsDataURL(f);
            });

            var n = this._editNewFiles.length;
            if (oCount) {
                oCount.setText(n > 0 ? n + " yeni fotoğraf eklenecek" : "");
                oCount.setVisible(n > 0);
            }

            window._editRemoveNew = function (idx) {
                that._editNewFiles.splice(idx, 1);
                that._renderEditNewPreviews();
            };
        },

        onClosePhotoEditDialog: function () {
            if (this._oPhotoEditDialog) this._oPhotoEditDialog.close();
            this._editNewFiles   = [];
            this._editDeletedIds = [];
            var c = document.getElementById("editNewPreviewContainer");
            if (c) c.innerHTML = "";
        },

        // ─────────────────────────────────────────────────────────────
        // FOTOĞRAF GRUBU SİL — DEĞİŞMEDİ
        // ─────────────────────────────────────────────────────────────

        onDeletePhotoGroup: function (oEvent) {
            var that     = this;
            var oContext = this._getContext(oEvent, "dashboardData", "/mediaGroups");
            if (!oContext) return;
            var oGroup   = oContext.getObject();

            MessageBox.confirm(
                '"' + oGroup.groupTitle + '" grubundaki ' + oGroup.count + ' fotoğraf silinsin mi?\nBu işlem geri alınamaz.',
                {
                    title: "Grubu Sil",
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (oAction) {
                        if (oAction !== MessageBox.Action.OK) return;

                        var sAuth = "Bearer " + localStorage.getItem("authToken");
                        var aReqs = oGroup.ids.map(function (sId) {
                            return fetch(API_BASE + "/media/" + sId, {
                                method: "DELETE", headers: { "Authorization": sAuth }
                            }).then(function (r) { return r.json(); });
                        });

                        Promise.all(aReqs)
                            .then(function () {
                                that._loadMedia();
                                MessageToast.show("Grup silindi.");
                            })
                            .catch(function () {
                                MessageBox.error("Silme sırasında hata oluştu!");
                            });
                    }
                }
            );
        },

        // ─────────────────────────────────────────────────────────────
        // VİDEO EKLEME — DEĞİŞMEDİ
        // ─────────────────────────────────────────────────────────────

        onAddVideo: function () {
            this._openDialog(
                "_oVideoDialog",
                "edusupport.platform.view.fragments.VideoAddDialog",
                "videoModel",
                { title: "", description: "", youtube_url: "" }
            );
        },

        onVideoUrlChange: function (oEvent) {
            var sUrl   = oEvent.getParameter("value").trim();
            var sId    = this._extractYoutubeId(sUrl);
            var oArea  = document.getElementById("videoPreviewArea");
            var oFrame = document.getElementById("videoPreviewFrame");
            if (!oArea || !oFrame) return;
            if (sId) {
                oFrame.src = "https://www.youtube.com/embed/" + sId + "?rel=0&modestbranding=1";
                oArea.style.display = "block";
            } else {
                oFrame.src = ""; oArea.style.display = "none";
            }
        },

        _extractYoutubeId: function (sUrl) {
            if (!sUrl) return null;
            var aP = [
                /youtube\.com\/watch\?v=([^&]+)/,
                /youtu\.be\/([^?&]+)/,
                /youtube\.com\/embed\/([^?&]+)/,
                /youtube\.com\/shorts\/([^?&]+)/
            ];
            for (var i = 0; i < aP.length; i++) {
                var m = sUrl.match(aP[i]);
                if (m) return m[1];
            }
            return null;
        },

        onSaveVideo: function () {
            var that   = this;
            var sTitle = this.byId("videoTitle").getValue().trim();
            var sDesc  = this.byId("videoDescription").getValue().trim();
            var sUrl   = this.byId("videoYoutubeUrl").getValue().trim();

            if (!sTitle || !sUrl) { MessageBox.error("Başlık ve YouTube URL zorunludur!"); return; }
            if (!this._extractYoutubeId(sUrl)) { MessageBox.error("Geçerli bir YouTube URL giriniz!"); return; }

            this._oVideoDialog.setBusy(true);

            this._apiCall("POST", "/media/add-video", { title: sTitle, description: sDesc, youtube_url: sUrl })
                .then(function (data) {
                    that._oVideoDialog.setBusy(false);
                    if (data.success) {
                        that._oVideoDialog.close();
                        that._loadMedia();
                        MessageToast.show("Video eklendi!");
                    } else {
                        MessageBox.error(data.message || "Ekleme başarısız!");
                    }
                })
                .catch(function () {
                    that._oVideoDialog.setBusy(false);
                    MessageBox.error("Sunucuya bağlanılamadı!");
                });
        },

        onCloseVideoDialog: function () {
            if (this._oVideoDialog) this._oVideoDialog.close();
        },

        // ─────────────────────────────────────────────────────────────
        // VİDEO DÜZENLE — GELİŞTİRİLDİ (thumbnail desteği eklendi)
        // ─────────────────────────────────────────────────────────────

        onEditVideo: function (oEvent) {
            var that     = this;
            var oContext = this._getContext(oEvent, "dashboardData", "/mediaVideos");
            if (!oContext) return;
            var oVideo   = oContext.getObject();

            this._videoThumbFile   = null;
            this._videoRemoveThumb = false;

            this._openDialog(
                "_oVideoEditDialog",
                "edusupport.platform.view.fragments.VideoEditDialog",
                "videoEditModel",
                {
                    id           : oVideo._id || oVideo.id,
                    title        : oVideo.title        || "",
                    description  : oVideo.description  || "",
                    youtube_url  : oVideo.url           || "",
                    thumbnail_url: oVideo.thumbnail_url || ""
                }
            );

            setTimeout(function () {
                that._renderVideoCurrentThumb(oVideo.thumbnail_url || "");
                that._bindVideoThumbDropZone();
            }, 400);
        },

        _renderVideoCurrentThumb: function (sUrl) {
            var area = document.getElementById("videoCurrentThumbArea");
            if (!area) return;

            if (sUrl) {
                var fullUrl = sUrl.startsWith("http") ? sUrl : "http://localhost:3000" + sUrl;
                area.innerHTML =
                    "<div style='margin-bottom:6px;'>" +
                    "<span style='font-size:0.78rem;color:#6B7280;font-weight:600;'>Mevcut kapak:</span>" +
                    "</div>" +
                    "<img src='" + fullUrl + "' alt='kapak'" +
                    " style='width:180px;height:101px;object-fit:cover;border-radius:8px;" +
                    "border:2px solid #D1E9DC;box-shadow:0 2px 8px rgba(0,0,0,0.10);'" +
                    " onerror=\"this.src='images/placeholder.jpg'\"/>";
                var btn = document.getElementById("videoRemoveThumbBtn");
                if (btn) btn.style.display = "block";
            } else {
                area.innerHTML =
                    "<span style='font-size:0.78rem;color:#9CA3AF;'>Henüz kapak fotoğrafı yok.</span>";
                var btn2 = document.getElementById("videoRemoveThumbBtn");
                if (btn2) btn2.style.display = "none";
            }
        },

        _bindVideoThumbDropZone: function () {
            var that = this;

            window._videoThumbSelect = function (event) {
                var files = Array.from(event.target.files || []);
                if (files.length) that._setVideoThumbFile(files[0]);
                event.target.value = "";
            };

            window._videoThumbDrop = function (event) {
                event.preventDefault();
                var zone = document.getElementById("videoThumbZone");
                if (zone) zone.style.background = "#F0F7FF";
                var files = Array.from(event.dataTransfer.files || [])
                    .filter(function (f) { return f.type.startsWith("image/"); });
                if (files.length) that._setVideoThumbFile(files[0]);
            };

            window._videoRemoveThumb = function () {
                that._videoThumbFile   = null;
                that._videoRemoveThumb = true;
                var curArea = document.getElementById("videoCurrentThumbArea");
                if (curArea) curArea.innerHTML =
                    "<span style='font-size:0.78rem;color:#9CA3AF;'>Kapak fotoğrafı kaldırılacak.</span>";
                var newArea = document.getElementById("videoNewThumbArea");
                if (newArea) newArea.innerHTML = "";
                var btn = document.getElementById("videoRemoveThumbBtn");
                if (btn) btn.style.display = "none";
            };
        },

        _setVideoThumbFile: function (oFile) {
            var that    = this;
            var allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            if (!allowed.includes(oFile.type)) {
                MessageToast.show("Desteklenmeyen format: " + oFile.name); return;
            }
            if (oFile.size > 20 * 1024 * 1024) {
                MessageToast.show("Dosya 20 MB'tan büyük: " + oFile.name); return;
            }

            this._videoThumbFile   = oFile;
            this._videoRemoveThumb = false;

            var reader    = new FileReader();
            reader.onload = function (e) {
                var area = document.getElementById("videoNewThumbArea");
                if (!area) return;
                area.innerHTML =
                    "<div style='margin:4px 0 2px;font-size:0.78rem;color:#0070F2;font-weight:600;'>" +
                    "Yeni seçilen kapak:</div>" +
                    "<div style='position:relative;display:inline-block;'>" +
                    "<img src='" + e.target.result + "'" +
                    " style='width:180px;height:101px;object-fit:cover;border-radius:8px;" +
                    "border:2px solid #0070F2;box-shadow:0 2px 8px rgba(0,0,0,0.12);'/>" +
                    "<button onclick='window._videoRemoveThumb()'" +
                    " style='position:absolute;top:-6px;right:-6px;width:20px;height:20px;" +
                    "border-radius:50%;background:#EF4444;color:#fff;border:none;" +
                    "cursor:pointer;font-size:11px;line-height:20px;text-align:center;'>✕</button>" +
                    "</div>";
            };
            reader.readAsDataURL(oFile);

            var btn = document.getElementById("videoRemoveThumbBtn");
            if (btn) btn.style.display = "block";
        },

        onSaveVideoEdit: function () {
            var that   = this;
            var oModel = this._oVideoEditDialog.getModel("videoEditModel");
            var sId    = oModel.getProperty("/id");
            var sTitle = (this.byId("videoEditTitle")
                ? this.byId("videoEditTitle").getValue()
                : oModel.getProperty("/title")).trim();
            var sDesc  = (this.byId("videoEditDescription")
                ? this.byId("videoEditDescription").getValue()
                : "").trim();
            var sUrl   = (this.byId("videoEditUrl")
                ? this.byId("videoEditUrl").getValue()
                : oModel.getProperty("/youtube_url")).trim();

            if (!sTitle) { MessageBox.error("Başlık zorunludur!"); return; }

            this._oVideoEditDialog.setBusy(true);
            var sAuth = "Bearer " + localStorage.getItem("authToken");

            // 1) Temel alanları güncelle
            var oBody = { title: sTitle, description: sDesc, youtube_url: sUrl };
            if (this._videoRemoveThumb) oBody.remove_thumbnail = true;

            var pMain = fetch(API_BASE + "/media/" + sId, {
                method : "PUT",
                headers: { "Content-Type": "application/json", "Authorization": sAuth },
                body   : JSON.stringify(oBody)
            }).then(function (r) { return r.json(); });

            // 2) Yeni thumbnail varsa yükle
            var pThumb = Promise.resolve();
            if (this._videoThumbFile) {
                var fd = new FormData();
                fd.append("thumbnail", this._videoThumbFile);
                pThumb = fetch(API_BASE + "/media/" + sId + "/thumbnail", {
                    method : "POST",
                    headers: { "Authorization": sAuth },
                    body   : fd
                }).then(function (r) { return r.json(); });
            }

            Promise.all([pMain, pThumb])
                .then(function (results) {
                    var mainRes = results[0];
                    if (!mainRes.success) throw new Error(mainRes.message || "Güncelleme başarısız");
                    that._oVideoEditDialog.setBusy(false);
                    that._oVideoEditDialog.close();
                    that._loadMedia();
                    MessageToast.show("✅ Video güncellendi!");
                })
                .catch(function (err) {
                    that._oVideoEditDialog.setBusy(false);
                    MessageBox.error("Hata: " + (err.message || "Bilinmeyen hata"));
                });
        },

        onCloseVideoEditDialog: function () {
            if (this._oVideoEditDialog) this._oVideoEditDialog.close();
            this._videoThumbFile   = null;
            this._videoRemoveThumb = false;
        },

        // ─────────────────────────────────────────────────────────────
        // VİDEO SİL — DEĞİŞMEDİ
        // ─────────────────────────────────────────────────────────────

        onDeleteMedia: function (oEvent) {
            var that     = this;
            var oContext = this._getContext(oEvent, "dashboardData", "/mediaVideos");
            if (!oContext) return;
            var oMedia   = oContext.getObject();

            MessageBox.confirm('"' + oMedia.title + '" silinsin mi?', {
                title: "Video Sil",
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (oAction) {
                    if (oAction !== MessageBox.Action.OK) return;
                    that._apiCall("DELETE", "/media/" + (oMedia._id || oMedia.id))
                        .then(function (data) {
                            if (data.success) {
                                that._loadMedia();
                                MessageToast.show("Video silindi.");
                            } else {
                                MessageBox.error(data.message || "Silme başarısız!");
                            }
                        })
                        .catch(function () { MessageBox.error("Sunucuya bağlanılamadı!"); });
                }
            });
        },

        // ─────────────────────────────────────────────────────────────
        // YARDIMCI: context bul — DEĞİŞMEDİ
        // ─────────────────────────────────────────────────────────────

        _getContext: function (oEvent, sModel, sPath) {
            var oCurrent = oEvent.getSource();
            for (var i = 0; i < 12; i++) {
                oCurrent = oCurrent.getParent();
                if (!oCurrent) break;
                var oCtx = oCurrent.getBindingContext(sModel);
                if (oCtx) return oCtx;
            }
            MessageBox.error("Kayıt bilgisi alınamadı.");
            return null;
        }
    };
});