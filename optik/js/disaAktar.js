/**
 * disaAktar.js
 * ------------
 * Tarama sonuçlarını PDF rapor veya Excel olarak dışa aktarır.
 *
 * API (window.DisaAktar):
 *   .pdfRaporuIndir(sonuclar, ozet)   → Promise<void>
 *   .excelIndir(sonuclar, ozet)       → Promise<void>
 */

window.DisaAktar = (function () {

    // ----------------------------------------------------------------
    // Native (Android) uyumlu dosya kaydetme köprüsü
    // ----------------------------------------------------------------
    // XLSX.writeFile / jsPDF doc.save(), gizli bir <a download> linkine
    // tıklama tekniğiyle çalışır — Android'in çıplak WebView bileşeni bu
    // blob-indirme davranışını DESTEKLEMİYOR. Optik ayrı bir IFRAME
    // içinde çalıştığından `window.Capacitor` kendi penceresinde hiç
    // bulunmaz (Capacitor köprü script'i sadece ana index.html'e ekleniyor).
    //
    // ÖNEMLİ (geçmiş): Önceki sürüm, iframe içinden DOĞRUDAN
    // `window.parent.Capacitor.Plugins.SavePlugin.kaydet(...)` çağırmayı
    // deniyordu. GERÇEK CİHAZDA bu çağrı ne çözülüyor ne reddediliyor —
    // hiçbir izin diyaloğu bile çıkmadan sonsuza dek asılı kalıyordu
    // (bkz. kullanıcı bildirimi + eklenen zaman aşımı sayesinde görülen
    // "20 saniyede tamamlanmadı" hatası). Cross-frame'den bir metodu
    // "koparıp" çağırmak güvenilir değil. Bunun yerine standart
    // `postMessage` protokolü kullanılıyor: üst pencereye bir istek
    // gönderilir, kaydetme üst pencerenin KENDİ context'inde yapılır
    // (bkz. js/app.js'teki 'message' dinleyicisi) ve sonuç geri bildirilir.
    function _postMessageIleKaydet(base64, dosyaAdi, mimeTuru, zamanAsimiMs) {
        return new Promise((resolve, reject) => {
            const ustPencere = (window.parent && window.parent !== window) ? window.parent : null;
            if (!ustPencere) { reject(new Error('Üst pencereye erişilemedi (optik bağımsız mı açıldı?)')); return; }

            const id = 'optikKaydet_' + Date.now() + '_' + Math.random().toString(36).slice(2);
            let tamamlandi = false;

            const zamanlayici = setTimeout(() => {
                if (tamamlandi) return;
                tamamlandi = true;
                window.removeEventListener('message', dinleyici);
                reject(new Error('Ana uygulamadan yanıt gelmedi (postMessage zaman aşımı).'));
            }, zamanAsimiMs);

            function dinleyici(event) {
                const veri = event.data;
                if (!veri || veri.__optikDosyaKaydetYanit !== true || veri.id !== id) return;
                if (tamamlandi) return;
                tamamlandi = true;
                clearTimeout(zamanlayici);
                window.removeEventListener('message', dinleyici);
                if (veri.basarili) resolve(true);
                else reject(new Error(veri.hata || 'Ana uygulama dosyayı kaydedemedi.'));
            }
            window.addEventListener('message', dinleyici);

            ustPencere.postMessage({ __optikDosyaKaydetIstek: true, id, base64, dosyaAdi, mimeTuru }, '*');
        });
    }

    function _nativeCapacitorBul() {
        try {
            const c = window.Capacitor;
            if (c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.SavePlugin) return c;
        } catch (e) { /* yoksay */ }
        return null;
    }

    async function _dosyaKaydet(base64, dosyaAdi, mimeTuru, eskiYontem) {
        const icindeIframeMi = window.parent && window.parent !== window;

        if (icindeIframeMi) {
            // Normal çalışma şekli: optik-entegrasyon.js iframe'i içinde.
            return _postMessageIleKaydet(base64, dosyaAdi, mimeTuru, 15000);
        }

        // Bağımsız (iframe'siz) çalışıyorsa — ör. geliştirme/test sırasında
        // optik/index.html doğrudan açıldıysa — kendi native köprüsünü dene,
        // yoksa tarayıcı yöntemine düş.
        const capacitor = _nativeCapacitorBul();
        if (capacitor) {
            const sonuc = await capacitor.Plugins.SavePlugin.kaydet({ base64, dosyaAdi, mimeTuru, paylas: false });
            console.log("[DisaAktar] Dosya SavePlugin ile kaydedildi:", dosyaAdi, sonuc);
            return true;
        }
        if (typeof eskiYontem === "function") {
            eskiYontem();
            console.log("[DisaAktar] Native Capacitor bulunamadı, tarayıcı yöntemi kullanıldı:", dosyaAdi);
            return true;
        }
        throw new Error("Dosya kaydedilemedi: ne native köprü ne de tarayıcı yöntemi kullanılabildi.");
    }

    // ----------------------------------------------------------------
    // EXCEL dışa aktarma (SheetJS)
    // ----------------------------------------------------------------

    async function excelIndir(sonuclar, ozet) {

        await _xlsxYukle();

        const wb = XLSX.utils.book_new();

        // ---- 1. Sayfa: Özet ----
        const ozetData = [
            ["Sınav Adı", ozet.sinavAdi || ""],
            ["Toplam Öğrenci", ozet.toplamOgrenci],
            ["Ortalama Puan", ozet.ortPuan ?? "—"],
            ["En Yüksek", ozet.enYuksek ?? "—"],
            ["En Düşük", ozet.enDusuk ?? "—"],
            [],
            ["Sıra", "Ad Soyad", "Öğrenci No", "Sınıf", "Kitapçık",
             "Doğru", "Yanlış", "Boş", "Puan", "Tarih"]
        ];

        for (const r of sonuclar) {
            const ogr = r.ogrenci || {};
            ozetData.push([
                r.sira,
                ogr.adSoyad || ogr.ad_soyad || "—",
                ogr.ogrenciNo || ogr.ogrenci_no || "—",
                ogr.sinif || "—",
                ogr.kitapcikTuru || ogr.kitapcik || "—",
                r.puan.dogru ?? "—",
                r.puan.yanlis ?? "—",
                r.puan.bos ?? "—",
                r.puan.toplam ?? "—",
                r.tarih || ""
            ]);
        }

        const ws1 = XLSX.utils.aoa_to_sheet(ozetData);

        // Sütun genişlikleri
        ws1["!cols"] = [
            {wch:6},{wch:20},{wch:14},{wch:10},{wch:10},
            {wch:8},{wch:8},{wch:6},{wch:8},{wch:12}
        ];

        XLSX.utils.book_append_sheet(wb, ws1, "Özet");

        // ---- 2. Sayfa: Detay ----
        if (sonuclar.length > 0) {
            // Tüm soruları topla
            const tumSorular = _tumSorulariTopla(sonuclar);

            const baslik = [
                "Sıra", "Ad Soyad", "Öğrenci No", "Sınıf", "Puan",
                ...tumSorular.map(s => (s.ders && s.ders !== "null" ? `${s.ders} ${s.soruNo}` : `S${s.soruNo}`))
            ];
            const detayData = [baslik];

            for (const r of sonuclar) {
                const ogr = r.ogrenci || {};
                const satir = [
                    r.sira,
                    ogr.adSoyad || "—",
                    ogr.ogrenciNo || "—",
                    ogr.sinif || "—",
                    r.puan.toplam ?? "—"
                ];

                // Her soru için işaretlenen şık
                for (const sq of tumSorular) {
                    const bulunan = (r.puan.detay || []).find(
                        d => d.soruNo === sq.soruNo && (d.ders || null) === (sq.ders || null)
                    );
                    satir.push(bulunan ? (bulunan.isaretli || "—") : "—");
                }

                detayData.push(satir);
            }

            // Cevap anahtarı satırı (varsa)
            const anahtar = window.CevapAnahtari && window.CevapAnahtari.getir();
            if (anahtar) {
                const anahtarSatir = ["", "CEVAP ANAHTARI", "", "", ""];
                for (const sq of tumSorular) {
                    const ders = (anahtar.dersler || []).find(
                        d => d.dersAdi === (sq.ders || "Genel") || d.dersAdi === "Genel"
                    );
                    const anahtarKayit = ders
                        ? (ders.anahtarlar || []).find(a => a.soruNo === sq.soruNo)
                        : null;
                    anahtarSatir.push(anahtarKayit ? anahtarKayit.dogru : "");
                }
                detayData.push(anahtarSatir);
            }

            const ws2 = XLSX.utils.aoa_to_sheet(detayData);
            XLSX.utils.book_append_sheet(wb, ws2, "Detay");
        }

        // İndir
        const dosyaAdi = `sinav_sonuclari_${_tarihDamgasi()}.xlsx`;
        try {
            return await _dosyaKaydet(
                XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }),
                dosyaAdi,
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                () => XLSX.writeFile(wb, dosyaAdi)
            );
        } catch (e) {
            console.error("[DisaAktar] Excel kaydedilemedi:", e);
            alert("Excel dosyası kaydedilemedi: " + e.message);
            throw e;
        }
    }

    // ----------------------------------------------------------------
    // PDF rapor dışa aktarma (jsPDF)
    // ----------------------------------------------------------------

    async function pdfRaporuIndir(sonuclar, ozet) {

        if (!window.jspdf && !window.jsPDF) {
            await _jspdfYukle();
        }

        const { jsPDF } = window.jspdf || window;
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

        const margin = 15;
        const pageW = 210;
        const pageH = 297;
        let y = margin;

        // ---- Başlık ----
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("SINAV SONUÇ RAPORU", pageW / 2, y, { align: "center" });
        y += 8;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(ozet.sinavAdi || "İsimsiz Sınav", pageW / 2, y, { align: "center" });
        y += 6;

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("Oluşturulma: " + new Date().toLocaleString("tr-TR"), pageW / 2, y, { align: "center" });
        doc.setTextColor(0);
        y += 8;

        // ---- Özet kutusu ----
        doc.setDrawColor(180);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(margin, y, pageW - margin * 2, 22, 2, 2, "FD");

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        const ozetSatir1 = [
            `Toplam Öğrenci: ${ozet.toplamOgrenci}`,
            `Ortalama: ${ozet.ortPuan ?? "—"}`,
            `En Yüksek: ${ozet.enYuksek ?? "—"}`,
            `En Düşük: ${ozet.enDusuk ?? "—"}`
        ];
        const colW = (pageW - margin * 2) / ozetSatir1.length;
        ozetSatir1.forEach((t, i) => {
            doc.text(t, margin + i * colW + colW / 2, y + 9, { align: "center" });
        });
        y += 28;

        // ---- Sonuçlar tablosu ----
        const colBasliklar = ["#", "Ad Soyad", "No", "Sınıf", "D", "Y", "B", "Puan"];
        const colGenislikleri = [10, 55, 24, 18, 10, 10, 10, 16];
        const satirYukseklik = 7;

        // Tablo başlığı
        doc.setFillColor(60, 90, 150);
        doc.setTextColor(255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);

        let x = margin;
        doc.rect(margin, y, pageW - margin * 2, satirYukseklik, "F");

        colBasliklar.forEach((b, i) => {
            doc.text(b, x + colGenislikleri[i] / 2, y + 4.5, { align: "center" });
            x += colGenislikleri[i];
        });
        y += satirYukseklik;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        doc.setFontSize(8);

        sonuclar.forEach((r, idx) => {
            if (y + satirYukseklik > pageH - margin) {
                doc.addPage();
                y = margin;
            }

            const ogr = r.ogrenci || {};
            const p = r.puan;

            if (idx % 2 === 1) {
                doc.setFillColor(240, 244, 255);
                doc.rect(margin, y, pageW - margin * 2, satirYukseklik, "F");
            }

            const hucre = [
                String(r.sira),
                _kisalt(ogr.adSoyad || "—", 22),
                _kisalt(String(ogr.ogrenciNo || "—"), 9),
                _kisalt(String(ogr.sinif || "—"), 7),
                String(p.dogru ?? "—"),
                String(p.yanlis ?? "—"),
                String(p.bos ?? "—"),
                p.toplam != null ? String(p.toplam) + "%" : "—"
            ];

            x = margin;
            hucre.forEach((h, i) => {
                doc.text(h, x + colGenislikleri[i] / 2, y + 4.5, { align: "center" });
                x += colGenislikleri[i];
            });

            // Satır alt çizgisi
            doc.setDrawColor(220);
            doc.line(margin, y + satirYukseklik, pageW - margin, y + satirYukseklik);

            y += satirYukseklik;
        });

        // ---- Cevap anahtarı bölümü ----
        const anahtar = window.CevapAnahtari && window.CevapAnahtari.getir();
        if (anahtar && anahtar.dersler) {
            if (y + 20 > pageH - margin) { doc.addPage(); y = margin; }

            y += 10;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("CEVAP ANAHTARI", margin, y);
            y += 7;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);

            for (const ders of anahtar.dersler) {
                if (y + 10 > pageH - margin) { doc.addPage(); y = margin; }

                doc.setFont("helvetica", "bold");
                doc.text(ders.dersAdi + ":", margin, y);
                doc.setFont("helvetica", "normal");

                const satirlar = [];
                let satirMetni = "";
                ders.anahtarlar.forEach((a, i) => {
                    satirMetni += `${a.soruNo}:${a.dogru}  `;
                    if ((i + 1) % 15 === 0) {
                        satirlar.push(satirMetni.trim());
                        satirMetni = "";
                    }
                });
                if (satirMetni.trim()) satirlar.push(satirMetni.trim());

                y += 5;
                for (const s of satirlar) {
                    if (y > pageH - margin) { doc.addPage(); y = margin; }
                    doc.text(s, margin + 4, y);
                    y += 5;
                }
                y += 3;
            }
        }

        const dosyaAdi = `sinav_raporu_${_tarihDamgasi()}.pdf`;
        try {
            return await _dosyaKaydet(
                doc.output('datauristring').split(',')[1],
                dosyaAdi,
                'application/pdf',
                () => doc.save(dosyaAdi)
            );
        } catch (e) {
            console.error("[DisaAktar] PDF kaydedilemedi:", e);
            alert("PDF dosyası kaydedilemedi: " + e.message);
            throw e;
        }
    }

    // ----------------------------------------------------------------
    // Yardımcılar
    // ----------------------------------------------------------------

    function _tumSorulariTopla(sonuclar) {
        const set = new Map();
        for (const r of sonuclar) {
            for (const d of (r.puan.detay || [])) {
                const key = `${d.ders || ""}:${d.soruNo}`;
                if (!set.has(key)) set.set(key, { ders: d.ders || null, soruNo: d.soruNo });
            }
        }
        return [...set.values()].sort((a, b) => {
            if (a.ders !== b.ders) return (a.ders || "").localeCompare(b.ders || "");
            return a.soruNo - b.soruNo;
        });
    }

    /**
     * Cevap anahtarını "Ders | Soru | Cevap" sütunlarıyla bir Excel dosyası
     * olarak indirir — CevapAnahtari.exceldenYukle() ile aynı format,
     * yani indirilen dosya düzenlenip aynı ekrandan geri yüklenebilir
     * (yedekleme/paylaşma için).
     */
    async function cevapAnahtariniIndir() {
        const anahtar = window.CevapAnahtari && window.CevapAnahtari.getir();
        const toplamSoru = anahtar
            ? (anahtar.dersler || []).reduce((t, d) => t + (d.anahtarlar || []).length, 0)
            : 0;

        if (!toplamSoru) {
            throw new Error("Dışa aktarılacak bir cevap anahtarı yok.");
        }

        await _xlsxYukle();

        const veri = [["Ders", "Soru", "Cevap"]];
        for (const ders of (anahtar.dersler || [])) {
            const siraliAnahtarlar = [...(ders.anahtarlar || [])].sort((a, b) => a.soruNo - b.soruNo);
            for (const a of siraliAnahtarlar) {
                veri.push([ders.dersAdi, a.soruNo, a.dogru]);
            }
        }

        const ws = XLSX.utils.aoa_to_sheet(veri);
        ws["!cols"] = [{ wch: 28 }, { wch: 8 }, { wch: 8 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Cevap Anahtarı");

        const dosyaAdi = `cevap_anahtari_${_tarihDamgasi()}.xlsx`;
        try {
            return await _dosyaKaydet(
                XLSX.write(wb, { bookType: 'xlsx', type: 'base64' }),
                dosyaAdi,
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                () => XLSX.writeFile(wb, dosyaAdi)
            );
        } catch (e) {
            console.error("[DisaAktar] Cevap anahtarı kaydedilemedi:", e);
            alert("Cevap anahtarı kaydedilemedi: " + e.message);
            throw e;
        }
    }

    function _tarihDamgasi() {
        const d = new Date();
        return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}_${String(d.getHours()).padStart(2,"0")}${String(d.getMinutes()).padStart(2,"0")}`;
    }

    function _kisalt(str, max) {
        return str.length > max ? str.slice(0, max - 1) + "…" : str;
    }

    function _xlsxYukle() {
        return new Promise((resolve, reject) => {
            if (window.XLSX) { resolve(); return; }
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
            s.onload = resolve;
            s.onerror = () => reject(new Error("SheetJS yüklenemedi."));
            document.head.appendChild(s);
        });
    }

    function _jspdfYukle() {
        return new Promise((resolve, reject) => {
            if (window.jspdf || window.jsPDF) { resolve(); return; }
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
            s.onload = resolve;
            s.onerror = () => reject(new Error("jsPDF yüklenemedi."));
            document.head.appendChild(s);
        });
    }

    // ----------------------------------------------------------------
    // MİNİ CEVAP ANAHTARI — yazdırıp öğrencilere dağıtmak için, tek A4
    // sayfasına çoklu küçük kopya (kesme çizgileriyle). Tüm sınav türleri
    // (LGS, Bursluluk, Özel) için ortak — dersler/anahtar dinamik olarak
    // gelir, sabit bir şablona bağlı değildir.
    // ----------------------------------------------------------------

    /**
     * @param {Array<{dersAdi,soruSayisi,sikSayisi}>} dersler - formDersleriniGetir() çıktısı
     * @param {{dersler: Array<{dersAdi, anahtarlar:[{soruNo,dogru}]}>}} anahtar - DB.anahtariGetir() çıktısı
     * @param {string} sinavAdi
     * @param {number} [kopyaSayisi=12] - sayfa başına kopya sayısı (varsayılan 12 = 3×4).
     *   Desteklenen ızgaralar: 2(1×2), 4(2×2), 6(2×3), 8(2×4), 12(3×4), 15(3×5).
     *   Font boyutu HER SINAV TÜRÜ İÇİN (LGS'nin 6 dersi de dahil) içerik gerçekten
     *   hücreye sığana kadar otomatik küçültülür — sabit bir tahmine güvenilmez.
     */
    async function miniAnahtarPdfIndir(dersler, anahtar, sinavAdi, kopyaSayisi = 12) {

        const toplamSoru = (dersler || []).reduce((t, d) => t + (d.soruSayisi || 0), 0);
        if (!toplamSoru) { alert('Bu sınav için ders/soru tanımı bulunamadı.'); return; }

        const anahtarMap = {}; // dersAdi -> {soruNo: dogru}
        (anahtar?.dersler || []).forEach(d => {
            anahtarMap[d.dersAdi] = {};
            (d.anahtarlar || []).forEach(a => { anahtarMap[d.dersAdi][a.soruNo] = a.dogru; });
        });
        const doluSoruSayisi = Object.values(anahtarMap).reduce((t, m) => t + Object.keys(m).length, 0);
        if (!doluSoruSayisi) { alert('Cevap anahtarı boş — önce en az bir soruyu işaretleyin.'); return; }

        if (!window.jspdf && !window.jsPDF) { await _jspdfYukle(); }
        const { jsPDF } = window.jspdf || window;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        // YENİ: jsPDF'in yerleşik "helvetica" fontu Türkçe İ/ı/ğ/Ğ/Ş/ş
        // karakterlerini desteklemiyor (WinAnsi kodlaması) — "İnkılap" gibi
        // kelimeler "0nk1lap" çıkıyordu. pdfFormGenerator.js'te aynı sorun
        // için zaten gömülmüş olan Roboto TTF'i burada da kullanıyoruz.
        // (Cevap ızgarasındaki "1:A 2:B..." kısmı Türkçe karakter İÇERMEDİĞİ
        // için orada hizalama amacıyla courier kalabilir.)
        try {
            const { fontlariKaydet } = await import('./pdfFormGenerator.js');
            fontlariKaydet(doc);
        } catch (e) {
            console.warn('[DisaAktar] Roboto fontu yüklenemedi, Türkçe karakterler bozuk çıkabilir:', e);
        }

        const pageW = 210, pageH = 297, disMargin = 6;
        const gridler = { 2: [1, 2], 4: [2, 2], 6: [2, 3], 8: [2, 4], 12: [3, 4], 15: [3, 5] };
        const [kolon, satirSayisi] = gridler[kopyaSayisi] || gridler[12];
        const hucreW = (pageW - disMargin * 2) / kolon;
        const hucreH = (pageH - disMargin * 2) / satirSayisi;

        // YENİ: font boyutu artık "soru sayısına göre kaba tahmin" değil,
        // içerik gerçekten hücreye sığana kadar 7pt'den başlayıp adım adım
        // küçültülerek bulunuyor (7 → 4.2pt, 0.2pt adımlarla). Böylece LGS
        // gibi çok-dersli sınavlar dar hücrelerde (3+ sütun) bile taşıp
        // ders eksik göstermez — okunaklılığın izin verdiği en büyük fontla basılır.
        const ustBosluk = 6 + 4 + 4.5; // başlık + "CEVAP ANAHTARI" için
        let fontPt = 4.2; // bulunamazsa en okunaklı taban budur
        for (let i = 0; i <= 14; i++) { // 7.0, 6.8, ..., 4.2 (tam 14 adım — float birikim hatasından kaçınmak için tam sayı sayaçla)
            const deneme = 7 - i * 0.2;
            const satirYuksekligiDeneme = deneme * 0.42;
            const gerekli = _miniKopyaYuksekligiHesapla(dersler, anahtarMap, hucreW, deneme, satirYuksekligiDeneme);
            if (gerekli <= hucreH - 8) { fontPt = deneme; break; } // -8: kesme çizgisi + alt pay
            fontPt = deneme; // hiçbiri sığmazsa en küçük (son denenen = 4.2) ile devam edilir
        }
        const satirYuksekligi = fontPt * 0.42;

        for (let k = 0; k < kolon * satirSayisi; k++) {
            const col = k % kolon, row = Math.floor(k / kolon);
            const x0 = disMargin + col * hucreW;
            const y0 = disMargin + row * hucreH;
            _miniKopyaCiz(doc, dersler, anahtarMap, sinavAdi, x0, y0, hucreW, hucreH, fontPt, satirYuksekligi);
        }

        const dosyaAdi = `mini_cevap_anahtari_${_tarihDamgasi()}.pdf`;
        try {
            return await _dosyaKaydet(
                doc.output('datauristring').split(',')[1],
                dosyaAdi,
                'application/pdf',
                () => doc.save(dosyaAdi)
            );
        } catch (e) {
            console.error('[DisaAktar] Mini cevap anahtarı kaydedilemedi:', e);
            alert('PDF dosyası kaydedilemedi: ' + e.message);
        }
    }

    /** Bir mini kopyanın (çizmeden) ne kadar YÜKSEKLİK (mm) kaplayacağını hesaplar — satır sayısını belirlemek için. */
    function _miniKopyaYuksekligiHesapla(dersler, anahtarMap, hucreW, fontPt, satirYuksekligi) {
        let y = 6 + 4 + 4.5; // başlık + "CEVAP ANAHTARI" için sabit üst boşluk
        const karakterGenisligiMM = fontPt * 0.42;
        const satirBasinaKarakter = Math.floor((hucreW - 6) / karakterGenisligiMM);
        for (const ders of dersler) {
            y += satirYuksekligi + 0.8; // ders başlığı
            let satirMetni = '';
            for (let s = 1; s <= ders.soruSayisi; s++) {
                const p = s + ':' + ((anahtarMap[ders.dersAdi] || {})[s] || '-');
                const aday = satirMetni ? satirMetni + '  ' + p : p;
                if (aday.length > satirBasinaKarakter) { y += satirYuksekligi; satirMetni = p; }
                else { satirMetni = aday; }
            }
            if (satirMetni) y += satirYuksekligi;
            y += 1.2;
        }
        return y - 6; // y0'a göre göreli yükseklik (üstteki 6mm başlangıç payını çıkar)
    }

    /** Tek bir mini kopyayı (x0,y0) konumuna, (hucreW,hucreH) boyutunda çizer. */
    function _miniKopyaCiz(doc, dersler, anahtarMap, sinavAdi, x0, y0, hucreW, hucreH, fontPt, satirYuksekligi) {
        // Kesme çizgisi (kesik çizgi çerçeve)
        doc.setDrawColor(160);
        doc.setLineDashPattern([1.2, 1], 0);
        doc.rect(x0 + 1.5, y0 + 1.5, hucreW - 3, hucreH - 3, 'S');
        doc.setLineDashPattern([], 0);

        let y = y0 + 6;
        const xMerkez = x0 + hucreW / 2;

        doc.setFont('Roboto', 'bold');
        doc.setFontSize(9);
        doc.text(String(sinavAdi || 'Sınav'), xMerkez, y, { align: 'center' });
        y += 4;
        doc.setFontSize(7);
        doc.setFont('Roboto', 'normal');
        doc.text('CEVAP ANAHTARI', xMerkez, y, { align: 'center' });
        y += 4.5;

        const karakterGenisligiMM = fontPt * 0.42;
        const satirBasinaKarakter = Math.floor((hucreW - 6) / karakterGenisligiMM);

        for (const ders of dersler) {
            if (y > y0 + hucreH - 4) break; // taşarsa kes (hücre dolduysa)
            doc.setFont('Roboto', 'bold');
            doc.setFontSize(fontPt + 0.5);
            doc.text(String(ders.dersAdi), x0 + 3, y);
            y += satirYuksekligi + 0.8;

            const dMap = anahtarMap[ders.dersAdi] || {};
            const parcalar = [];
            for (let s = 1; s <= ders.soruSayisi; s++) {
                parcalar.push(s + ':' + (dMap[s] || '-'));
            }
            doc.setFont('courier', 'normal');
            doc.setFontSize(fontPt);
            let satirMetni = '';
            for (const p of parcalar) {
                const aday = satirMetni ? satirMetni + '  ' + p : p;
                if (aday.length > satirBasinaKarakter) {
                    doc.text(satirMetni, x0 + 3, y);
                    y += satirYuksekligi;
                    satirMetni = p;
                    if (y > y0 + hucreH - 3) break;
                } else {
                    satirMetni = aday;
                }
            }
            if (satirMetni && y <= y0 + hucreH - 3) { doc.text(satirMetni, x0 + 3, y); y += satirYuksekligi; }
            y += 1.2;
        }
    }

    return { excelIndir, pdfRaporuIndir, cevapAnahtariniIndir, miniAnahtarPdfIndir, dosyaKaydet: _dosyaKaydet };

})();
