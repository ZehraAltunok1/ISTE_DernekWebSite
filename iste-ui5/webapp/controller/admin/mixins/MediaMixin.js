sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (MessageBox, MessageToast) {
    "use strict";

    return {

        // ─────────────────────────────────────────────────────────────
        // VERİ YÜKLEME
        // ─────────────────────────────────────────────────────────────

        _loadMedia: function () {
            var that   = this;
            var oModel = this.getModel("dashboardData");

            this._apiCall("GET", "/media")
                .then(function (data) {
                    if (data.success) {
                        var aMedia = (data.media || []).map(function (m) {
                            m.created_at_tr = m.created_at
                                ? new Date(m.created_at).toLocaleDateString("tr-TR")
                                : "-";
                            return m;
                        });
                        oModel.setProperty("/mediaItems", aMedia);
                    }
                })
                .catch(function () {
                    MessageToast.show("Medya yüklenemedi.");
                });
        },

        // ─────────────────────────────────────────────────────────────
        // FOTOĞRAF YÜKLEME  (çoklu dosya)
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
                var files = Array.from(event.target.files || []);
                that._addPhotoFiles(files);
            };

            window._handlePhotoDrop = function (event) {
                event.preventDefault();
                var dropZone = document.getElementById("photoDropZone");
                if (dropZone) dropZone.style.background = "#F0F7FF";
                var files = Array.from(event.dataTransfer.files || []).filter(function (f) {
                    return f.type.startsWith("image/");
                });
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
                if (!bExists) {
                    that._selectedPhotoFiles.push(oFile);
                }
            });

            if (aRejected.length > 0) {
                MessageToast.show("Atlandı: " + aRejected.join(", "));
            }

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
                var oReader = new FileReader();
                oReader.onload = function (e) {
                    var sCard = [
                        "<div style='position:relative;width:90px;'>",
                            "<img src='" + e.target.result + "' style='",
                                "width:90px;height:72px;object-fit:cover;",
                                "border-radius:8px;display:block;",
                                "box-shadow:0 2px 8px rgba(0,0,0,0.12);'/>",
                            "<button onclick='window._removePhotoFile(" + nIdx + ")'",
                                " style='position:absolute;top:-6px;right:-6px;",
                                " width:20px;height:20px;border-radius:50%;",
                                " background:#EF4444;color:#fff;border:none;",
                                " cursor:pointer;font-size:11px;line-height:1;",
                                " box-shadow:0 1px 4px rgba(0,0,0,0.2);",
                                " display:flex;align-items:center;justify-content:center;'>",
                                "&#x2715;",
                            "</button>",
                            "<div style='font-size:0.65rem;color:#6B7280;",
                                " white-space:nowrap;overflow:hidden;",
                                " text-overflow:ellipsis;max-width:90px;",
                                " margin-top:4px;text-align:center;'>",
                                oFile.name,
                            "</div>",
                        "</div>"
                    ].join("");

                    var oDiv       = document.createElement("div");
                    oDiv.innerHTML = sCard;
                    oContainer.appendChild(oDiv.firstChild);
                };
                oReader.readAsDataURL(oFile);
            });

            var nCount = this._selectedPhotoFiles.length;
            if (oCountText) {
                oCountText.setText(nCount > 0 ? nCount + " dosya seçildi" : "");
                oCountText.setVisible(nCount > 0);
            }
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
            if (!this._selectedPhotoFiles || this._selectedPhotoFiles.length === 0) {
                MessageBox.error("Lütfen en az bir fotoğraf seçin!");
                return;
            }

            this._oPhotoDialog.setBusy(true);

            var aFiles      = this._selectedPhotoFiles.slice();
            var nTotal      = aFiles.length;
            var nSuccess    = 0;
            var nFail       = 0;
            var sAuthHeader = "Bearer " + localStorage.getItem("authToken");

            var fnUploadNext = function (nIdx) {
                if (nIdx >= aFiles.length) {
                    that._oPhotoDialog.setBusy(false);
                    that._oPhotoDialog.close();
                    that._loadMedia();
                    var sMsg = nTotal === 1
                        ? "Fotoğraf başarıyla yüklendi!"
                        : nSuccess + "/" + nTotal + " fotoğraf yüklendi" + (nFail > 0 ? ", " + nFail + " başarısız." : "!");
                    MessageToast.show(sMsg);
                    return;
                }

                var oFile     = aFiles[nIdx];
                var oFormData = new FormData();
                oFormData.append("photo",       oFile);
                oFormData.append("title", sTitle);
                oFormData.append("description", sDesc);

                fetch("http://localhost:3000/api/media/upload-photo", {
                    method:  "POST",
                    headers: { "Authorization": sAuthHeader },
                    body:    oFormData
                })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.success) { nSuccess++; } else { nFail++; }
                    fnUploadNext(nIdx + 1);
                })
                .catch(function () {
                    nFail++;
                    fnUploadNext(nIdx + 1);
                });
            };

            fnUploadNext(0);
        },

        onClosePhotoDialog: function () {
            if (this._oPhotoDialog) this._oPhotoDialog.close();
            this._selectedPhotoFiles = [];
        },

        // ─────────────────────────────────────────────────────────────
        // YOUTUBE VİDEO EKLEME
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
            var sUrl     = oEvent.getParameter("value").trim();
            var sEmbedId = this._extractYoutubeId(sUrl);
            var oArea    = document.getElementById("videoPreviewArea");
            var oFrame   = document.getElementById("videoPreviewFrame");
            if (!oArea || !oFrame) return;

            if (sEmbedId) {
                oFrame.src          = "https://www.youtube.com/embed/" + sEmbedId + "?rel=0&modestbranding=1";
                oArea.style.display = "block";
            } else {
                oFrame.src          = "";
                oArea.style.display = "none";
            }
        },

        _extractYoutubeId: function (sUrl) {
            if (!sUrl) return null;
            var aPatterns = [
                /youtube\.com\/watch\?v=([^&]+)/,
                /youtu\.be\/([^?&]+)/,
                /youtube\.com\/embed\/([^?&]+)/,
                /youtube\.com\/shorts\/([^?&]+)/
            ];
            for (var i = 0; i < aPatterns.length; i++) {
                var oMatch = sUrl.match(aPatterns[i]);
                if (oMatch) return oMatch[1];
            }
            return null;
        },

        onSaveVideo: function () {
            var that   = this;
            var sTitle = this.byId("videoTitle").getValue().trim();
            var sDesc  = this.byId("videoDescription").getValue().trim();
            var sUrl   = this.byId("videoYoutubeUrl").getValue().trim();

            if (!sTitle || !sUrl) {
                MessageBox.error("Başlık ve YouTube URL zorunludur!");
                return;
            }
            if (!this._extractYoutubeId(sUrl)) {
                MessageBox.error("Geçerli bir YouTube URL giriniz!\nÖrnek: https://www.youtube.com/watch?v=XXXXX");
                return;
            }

            this._oVideoDialog.setBusy(true);

            this._apiCall("POST", "/media/add-video", {
                title:       sTitle,
                description: sDesc,
                youtube_url: sUrl
            }).then(function (data) {
                that._oVideoDialog.setBusy(false);
                if (data.success) {
                    that._oVideoDialog.close();
                    that._loadMedia();
                    MessageToast.show("Video eklendi! Anasayfada görünecek.");
                } else {
                    MessageBox.error(data.message || "Ekleme başarısız!");
                }
            }).catch(function () {
                that._oVideoDialog.setBusy(false);
                MessageBox.error("Sunucuya bağlanılamadı!");
            });
        },

        onCloseVideoDialog: function () {
            if (this._oVideoDialog) this._oVideoDialog.close();
        },

        // ─────────────────────────────────────────────────────────────
        // MEDYA SİLME  ← HATA BURADAYDI
        // ─────────────────────────────────────────────────────────────

        onDeleteMedia: function (oEvent) {
            var that    = this;
            var oSource = oEvent.getSource();

            // ColumnListItem içindeki parent zinciri değişken olabiliyor.
            // En güvenli yol: context bulunana kadar yukarı çık.
            var oContext = null;
            var oCurrent = oSource;

            for (var i = 0; i < 10; i++) {
                oCurrent = oCurrent.getParent();
                if (!oCurrent) break;
                oContext = oCurrent.getBindingContext("dashboardData");
                if (oContext) break;
            }

            if (!oContext) {
                MessageBox.error("Kayıt bilgisi alınamadı, lütfen sayfayı yenileyin.");
                return;
            }

            var oMedia = oContext.getObject();

            MessageBox.confirm(
                '"' + oMedia.title + '" silinsin mi?\nAnasayfadan da kaldırılacak.',
                {
                    title:            "Medya Sil",
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: function (oAction) {
                        if (oAction !== MessageBox.Action.OK) return;

                        that._apiCall("DELETE", "/media/" + oMedia.id)
                            .then(function (data) {
                                if (data.success) {
                                    that._loadMedia();
                                    MessageToast.show("Medya silindi.");
                                } else {
                                    MessageBox.error(data.message || "Silme başarısız!");
                                }
                            })
                            .catch(function () {
                                MessageBox.error("Sunucuya bağlanılamadı!");
                            });
                    }
                }
            );
        }

    };
});