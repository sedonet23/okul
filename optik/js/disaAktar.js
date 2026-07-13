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
        XLSX.writeFile(wb, dosyaAdi);
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

        doc.save(`sinav_raporu_${_tarihDamgasi()}.pdf`);
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

        XLSX.writeFile(wb, `cevap_anahtari_${_tarihDamgasi()}.xlsx`);
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

    return { excelIndir, pdfRaporuIndir, cevapAnahtariniIndir };

})();
