// js/formOkuyucu.js
//
// Kamera ile çekilen kareyi doğrudan gerçek OMR motoruna (LayoutEngine +
// OmrOkuyucu) veren köprü. OpenCV.js YOK — kağıt tespiti/perspektif
// düzeltmesi burada gerekmiyor, çünkü OmrOkuyucu.formuOku() zaten QR
// kodun 4 köşesinden kaba bir homografi, sonra hizalama işaretlerinden
// (fiducial marker) hassas bir homografi çıkarıp kendi düzeltmesini
// yapıyor (bkz. omrEngine.js).
//
// Bu dosya sadece: 1) okunacak "form" şablonunu (LayoutEngine ile) kurar,
// 2) canvas'ı OmrOkuyucu.formuOku()'ya verir, 3) sonucu ekrana yansıtır.

import { showStatus } from "./utils.js";

/**
 * Düzeltilmiş (dewarp edilmiş) kağıt görüntüsünü localStorage'a kaydedilecek
 * kadar küçültüp JPEG'e sıkıştırır. Amaç: her taranan kağıdın "sonuca
 * tıklayınca görüntüle + gerekirse elle düzelt" akışında kullanılmak üzere
 * saklanabilmesi — ama tam çözünürlükte onlarca/yüzlerce kağıt saklamak
 * localStorage kotasını (~5-10MB) hızla doldurur, bu yüzden küçültülüyor.
 * @param {HTMLCanvasElement} canvas
 * @param {number} maxGenislik
 * @param {number} kalite - 0..1 arası JPEG kalitesi
 * @returns {string|null} dataURL ya da (hata olursa) null
 */
function _kucukGoruntuUret(canvas, maxGenislik = 900, kalite = 0.55) {
    try {
        let kaynak = canvas;
        if (canvas.width > maxGenislik) {
            const oran = maxGenislik / canvas.width;
            const kucukCanvas = document.createElement("canvas");
            kucukCanvas.width = maxGenislik;
            kucukCanvas.height = Math.round(canvas.height * oran);
            kucukCanvas.getContext("2d").drawImage(canvas, 0, 0, kucukCanvas.width, kucukCanvas.height);
            kaynak = kucukCanvas;
        }
        return kaynak.toDataURL("image/jpeg", kalite);
    } catch (err) {
        console.error("Kağıt görüntüsü sıkıştırılamadı (kayıt görüntüsüz devam edecek):", err);
        return null;
    }
}

/**
 * Sayfadaki "Sınav Türü" seçimine (ve varsa soru/şık sayısı girdilerine)
 * göre okunacak form şablonunu kurar. İlgili elemanlar bulunamazsa
 * (ör. eski bir index.html) LGS'ye düşer.
 * @returns {{form: object, sinavTuru: string}}
 */
function testFormunuOlustur() {

    const sinavTuruSelect = document.getElementById("sinavTuru");
    const sinavTuru = sinavTuruSelect ? sinavTuruSelect.value : "lgs";

    let secenekler = { sinavTuru };

    if (sinavTuru === "ozel") {

        const soruSayisiInput = document.getElementById("soruSayisi");
        const sikSayisiInput = document.getElementById("sikSayisi");

        secenekler.soruSayisi = soruSayisiInput ? parseInt(soruSayisiInput.value, 10) || 20 : 20;
        secenekler.sikSayisi = sikSayisiInput ? parseInt(sikSayisiInput.value, 10) || 4 : 4;

    }

    const layout = window.LayoutEngine.layoutHesapla(secenekler);

    return { form: layout.formlar[0], sinavTuru };
}

/**
 * Okunan kağıdın FORM KODU'nun (bkz. layoutEngine.js: FORM_KODU_HARFLERI,
 * omrEngine.js: formKoduOku), o an aktif olan sınavın BEKLEDİĞİ form
 * koduyla eşleşip eşleşmediğini doğrular. Eşleşmiyorsa okumayı
 * BAŞARISIZ sayar — amaç, seçili sınavdan farklı bir optik form kağıdının
 * (ör. Bursluluk sınavı açıkken bir LGS kağıdının) yanlışlıkla o sınava
 * ait gibi okunup kaydedilmesini engellemek.
 *
 * `formKodu` okunamadıysa (null — eski/uyumsuz bir şablonla üretilmiş
 * kağıt) doğrulama ATLANIR, geriye dönük uyumluluk için okuma kabul edilir.
 */
function formKoduDogrula(sonuc, sinavTuru) {
    if (!sonuc || !sonuc.basarili || !sonuc.formKodu) return sonuc;

    const beklenen = window.LayoutEngine.formKoduHarfiGetir(sinavTuru);

    if (sonuc.formKodu !== beklenen) {
        sonuc.basarili = false;
        sonuc.uyarilar = [
            'Bu kağıt seçili sınavın optik formuyla eşleşmiyor (başka bir sınava/form türüne ait olabilir). ' +
            'Doğru sınavı seçtiğinizden ve doğru kağıdı taradığınızdan emin olun.',
            ...(sonuc.uyarilar || []),
        ];
    }

    return sonuc;
}

/**
 * Kamera canvas'ını okur, sonucu resultCanvas + status alanına yazar.
 * @param {HTMLCanvasElement} sourceCanvas
 * @returns {Promise<object>} OmrOkuyucu.formuOku() sonucu
 */
export async function formuOkuVeGoster(sourceCanvas) {

    if (typeof window.jsQR === "undefined") {
        showStatus("jsQR yüklenemedi.");
        return null;
    }

    if (typeof window.LayoutEngine === "undefined" || typeof window.OmrOkuyucu === "undefined") {
        showStatus("OMR motoru yüklenemedi (layoutEngine.js / omrEngine.js).");
        return null;
    }

    showStatus("Form okunuyor...");

    const { form, sinavTuru } = testFormunuOlustur();

    let sonuc;

    try {
        sonuc = await window.OmrOkuyucu.formuOku(sourceCanvas, form);
        formKoduDogrula(sonuc, sinavTuru);
    } catch (err) {
        console.error("formuOku hatası:", err);
        showStatus("Okuma sırasında hata oluştu: " + err.message);
        window.dispatchEvent(new CustomEvent("omrOkumaTamamlandi", { detail: null }));
        return null;
    }

    let gosterSonuc;
    try {
        gosterSonuc = sonucuGoster(sonuc);
    } catch (err) {
        console.error("sonucuGoster hatası:", err);
        showStatus("Sonuç gösterilirken hata oluştu: " + err.message);
        window.dispatchEvent(new CustomEvent("omrOkumaTamamlandi", { detail: sonuc }));
        return null;
    }

    // Toplu tarama oturumu için sonucu yayınla
    if (sonuc && sonuc.basarili) {
        window.dispatchEvent(new CustomEvent("omrSonucHazir", { detail: sonuc }));
    }

    // Başarılı/başarısız fark etmeksizin: okuma süreci bitti (ör. kamera
    // penceresini otomatik kapatmak isteyen UI kodu bunu dinleyebilir).
    window.dispatchEvent(new CustomEvent("omrOkumaTamamlandi", { detail: sonuc }));

    return gosterSonuc;
}

/**
 * Galeriden TOPLU (çoklu dosya) içe aktarma için kullanılır — otomatik
 * QR + hizalama tespitiyle okur (köşe seçim UI'sini ATLAR, çünkü onlarca
 * fotoğraf için tek tek elle köşe düzeltmesi pratik değil). formuOkuVeGoster()'dan
 * farkı: 1) paylaşılan resultCanvas/sonucKutusu'na diagnostic ÇİZMEZ (her
 * görüntü için pahalı ve gereksiz — sadece son işlenen görünürdü), 2)
 * "omrOkumaTamamlandi" olayını YAYMAZ (bu olay kamera overlay'ini otomatik
 * kapatıyor — toplu işlem sırasında ilk görüntüden sonra kapanmasını
 * engellemek için batch tamamlanana kadar bastırılır, çağıran taraf tüm
 * dosyalar bitince kendi tamamlandı olayını tetikler).
 * @param {HTMLCanvasElement} sourceCanvas
 * @returns {Promise<object>} OmrOkuyucu.formuOku() sonucu ({basarili, uyarilar, ...})
 */
export async function formuOkuToplu(sourceCanvas) {

    if (typeof window.jsQR === "undefined") {
        return { basarili: false, uyarilar: ["jsQR yüklenemedi."] };
    }

    if (typeof window.LayoutEngine === "undefined" || typeof window.OmrOkuyucu === "undefined") {
        return { basarili: false, uyarilar: ["OMR motoru yüklenemedi."] };
    }

    const { form, sinavTuru } = testFormunuOlustur();

    let sonuc;

    try {
        sonuc = await window.OmrOkuyucu.formuOku(sourceCanvas, form);
        formKoduDogrula(sonuc, sinavTuru);
    } catch (err) {
        console.error("formuOku (toplu) hatası:", err);
        return { basarili: false, uyarilar: ["Hata: " + err.message] };
    }

    if (sonuc && sonuc.basarili) {
        // Kalıcı kayıt için düzeltilmiş kağıt görüntüsünü de ekle (bkz.
        // sonucuGoster()'daki aynı işlem — burada resultCanvas'a çizim
        // yapılmadığı için doğrudan duzeltilmisCanvas'tan üretiliyor).
        const duzCanvas = sonuc.hataAyiklama && sonuc.hataAyiklama.duzeltilmisCanvas;
        if (duzCanvas) {
            sonuc.kagitGoruntusu = _kucukGoruntuUret(duzCanvas);
        }
        window.dispatchEvent(new CustomEvent("omrSonucHazir", { detail: sonuc }));
    }

    return sonuc;

}

/**
 * Kullanıcının elle işaretlediği 4 köşeyle okur (otomatik QR/hizalama
 * tespiti atlanır). Köşe seçimi güvenilmez/başarısız otomatik tespiti
 * atlatmak veya doğrulamak için kullanılır.
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {{solUst,sagUst,solAlt,sagAlt}} koseler - canvas piksel koordinatları
 */
export async function formuOkuElleKoseliVeGoster(sourceCanvas, koseler) {

    if (typeof window.LayoutEngine === "undefined" || typeof window.OmrOkuyucu === "undefined") {
        showStatus("OMR motoru yüklenemedi (layoutEngine.js / omrEngine.js).");
        return null;
    }

    showStatus("Form (elle seçilen köşelerle) okunuyor...");

    const { form, sinavTuru } = testFormunuOlustur();

    let sonuc;

    try {
        sonuc = await window.OmrOkuyucu.formuOkuElleKoseli(sourceCanvas, form, koseler);
        formKoduDogrula(sonuc, sinavTuru);
    } catch (err) {
        console.error("formuOkuElleKoseli hatası:", err);
        showStatus("Okuma sırasında hata oluştu: " + err.message);
        window.dispatchEvent(new CustomEvent("omrOkumaTamamlandi", { detail: null }));
        return null;
    }

    let gosterSonuc;
    try {
        gosterSonuc = sonucuGoster(sonuc);
    } catch (err) {
        console.error("sonucuGoster hatası:", err);
        showStatus("Sonuç gösterilirken hata oluştu: " + err.message);
        window.dispatchEvent(new CustomEvent("omrOkumaTamamlandi", { detail: sonuc }));
        return null;
    }

    if (sonuc && sonuc.basarili) {
        window.dispatchEvent(new CustomEvent("omrSonucHazir", { detail: sonuc }));
    }

    window.dispatchEvent(new CustomEvent("omrOkumaTamamlandi", { detail: sonuc }));

    return gosterSonuc;
}

/**
 * formuOku()/formuOkuElleKoseli() sonucunu resultCanvas + durum +
 * sonuçKutusu'na yansıtan ortak kısım.
 */
function sonucuGoster(sonuc) {

    if (!sonuc.basarili) {
        showStatus("Okunamadı: " + (sonuc.uyarilar[0] || "bilinmeyen hata"));
        return sonuc;
    }

    // Düzeltilmiş (canonical) görüntüyü resultCanvas'ta göster.
    const resultCanvas = document.getElementById("resultCanvas");
    const duzCanvas = sonuc.hataAyiklama && sonuc.hataAyiklama.duzeltilmisCanvas;

    // Kalıcı kayıt için: TEMİZ (teşhis noktaları çizilmeden ÖNCEKİ) kağıt
    // görüntüsünü sıkıştırıp sonuca ekle. TopluTarama.ekle() bunu saklar,
    // "sonuca tıkla → kağıdı gör" akışında kullanılır.
    if (duzCanvas) {
        sonuc.kagitGoruntusu = _kucukGoruntuUret(duzCanvas);
    }

    if (duzCanvas && resultCanvas) {
        resultCanvas.width = duzCanvas.width;
        resultCanvas.height = duzCanvas.height;

        const rctx = resultCanvas.getContext("2d");
        rctx.drawImage(duzCanvas, 0, 0);

        // TEŞHİS: otomatik tespitte kullanılan (QR veya hizalama işareti)
        // 4 köşe noktasını sarı daire + numarayla işaretle. Bunlar
        // dewarp edilmiş görüntüdeki karşılıklar — hangi köşenin doğru
        // sayfa köşesine denk geldiğini/gelmediğini gözle görmek için.
        const noktalar = sonuc.hataAyiklama && sonuc.hataAyiklama.hizalamaNoktalari;

        if (noktalar && noktalar.length) {

            const r = Math.max(6, duzCanvas.width * 0.01);

            noktalar.forEach((p, i) => {
                rctx.beginPath();
                rctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                rctx.strokeStyle = "yellow";
                rctx.lineWidth = Math.max(2, duzCanvas.width * 0.002);
                rctx.stroke();
                rctx.fillStyle = "yellow";
                rctx.font = `bold ${Math.max(12, duzCanvas.width * 0.015)}px Arial`;
                rctx.fillText(String(i + 1), p.x + r + 2, p.y - r - 2);
            });

        }

        // TEŞHİS 2: hizalama işaretleri "bulundu ama güvenilmez" sayılıp
        // REDDEDİLDİYSE, sarı noktalar (yukarıdaki) QR köşelerine döner —
        // asıl bulunan (ama reddedilen) noktaları görmek için bunları
        // TURUNCU olarak ayrıca işaretle.
        const hamNoktalar = sonuc.hataAyiklama && sonuc.hataAyiklama.hamHizalamaNoktalari;

        if (hamNoktalar && hamNoktalar.length) {

            const r2 = Math.max(6, duzCanvas.width * 0.01);

            hamNoktalar.forEach((p, i) => {
                rctx.beginPath();
                rctx.arc(p.x, p.y, r2, 0, Math.PI * 2);
                rctx.strokeStyle = "orange";
                rctx.lineWidth = Math.max(2, duzCanvas.width * 0.002);
                rctx.stroke();
                rctx.fillStyle = "orange";
                rctx.font = `bold ${Math.max(12, duzCanvas.width * 0.015)}px Arial`;
                rctx.fillText("H" + (i + 1), p.x + r2 + 2, p.y + r2 + 14);
            });

        }

        // TEŞHİS 3: Her BALONCUĞUN gerçek örnekleme noktasını (homografi +
        // satır-kilit + yerel ince-ayar sonrası kullanılan piksel) küçük bir
        // nokta olarak çiz. AMAÇ: köşeler/homografi doğru olsa bile, kağıt
        // kavisi/bombesi yüzünden ORTAYA ÇIKAN yerel kaymayı (bir sütunun
        // aşağı doğru gittikçe baloncuklardan uzaklaşması gibi) GÖZLE görmek.
        // Renk kodu: koyuluk oranı yüksekse (dolu/işaretli sayılmışsa) YEŞİL,
        // düşükse (boş sayılmışsa) KIRMIZI — böylece "aslında dolu olduğu
        // hâlde nokta baloncuğun dışına düşmüş" durumları hemen fark edilir:
        // fotoğrafta gözle dolu görünen bir baloncukta nokta KIRMIZI ve
        // baloncuğun biraz dışındaysa, sorun kesinlikle yerel hizalamadır.
        //
        // try/catch: bu SADECE görsel bir teşhis katmanı — burada beklenmeyen
        // bir veri şekli/hata olsa bile asıl okuma sonucunu (cevaplar) veya
        // ekrana yansıtmayı ASLA bozmasın diye sarmalandı.
        try {
            const ornekNoktalari = sonuc.hataAyiklama && sonuc.hataAyiklama.ornekNoktalari;

            if (ornekNoktalari && ornekNoktalari.length) {

                const nr = Math.max(2, duzCanvas.width * 0.0025);

                ornekNoktalari.forEach((soru) => {
                    soru.sikler.forEach((s) => {
                        rctx.beginPath();
                        rctx.arc(s.px, s.py, nr, 0, Math.PI * 2);
                        rctx.fillStyle = s.oran >= 0.5 ? "#00ff00" : "#ff2020";
                        rctx.fill();
                    });
                });

            }
        } catch (err) {
            console.error("Örnek noktaları çizilirken hata (görmezden gelindi):", err);
        }

        resultCanvas.classList.add("visible");
    }

    const isaretliSayisi = sonuc.cevaplar.filter((c) => c.isaretliSik).length;

    showStatus(
        `Okuma tamamlandı: ${sonuc.cevaplar.length} soru, ${isaretliSayisi} işaretli` +
        (sonuc.uyarilar.length ? ` (${sonuc.uyarilar.length} uyarı)` : "")
    );

    // Her sorunun tek tek dökümü — hangi sorunun neden işaretli/işaretsiz
    // sayıldığını görebilmek için (özellikle yanlış pozitif/negatifleri
    // teşhis ederken).
    const sonucKutusu = document.getElementById("sonucKutusu");

    if (sonucKutusu) {

        const baslikSatirlari = sonuc.uyarilar.map((u) => "⚠ " + u);

        const satirlar = sonuc.cevaplar.map((c) => {
            const ders = c.ders ? c.ders + " " : "";
            const isaretli = c.isaretliSik || "—";
            const uyari = c.uyari ? ` (${c.uyari})` : "";
            const guven = typeof c.guven === "number" ? c.guven.toFixed(2) : c.guven;
            return `${ders}Soru ${c.soruNo}: ${isaretli}${uyari}  [güven: ${guven}]`;
        });

        sonucKutusu.textContent = [...baslikSatirlari, "", ...satirlar].join("\n");
        sonucKutusu.style.display = "block";

    }

    return sonuc;
}
