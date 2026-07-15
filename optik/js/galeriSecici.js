// js/galeriSecici.js
//
// Galeriden seçilen fotoğrafı okumadan önce, ortak köşe seçim UI'sinden
// (koseSecici.js) geçirir. "Tamam" ile elle seçilen köşeler kullanılır;
// "Otomatik Devam Et" ile eski otomatik QR+hizalama tespiti denenir.
//
// TOPLU İÇE AKTARMA: input çoklu dosya seçimine izin verir (galeriden
// aynı anda birden fazla fotoğraf seçilebilir — "input multiple"). Tek
// dosya seçilirse eski akış (elle köşe düzeltme imkânı) aynen çalışır;
// birden fazla dosya seçilirse köşe seçim UI'si ATLANIR (onlarca kağıt
// için tek tek elle düzeltme pratik değil) ve her fotoğraf otomatik
// QR+hizalama tespitiyle sırayla okunur, sonuçlar Toplu Tarama oturumuna
// eklenir. Otomatik tespiti başarısız olan kağıtlar özetle bildirilir —
// o öğrencinin fotoğrafı tek başına (galeriden 1 dosya seçilerek) elle
// köşe düzeltmesiyle tekrar denenebilir.

import { formuOkuVeGoster, formuOkuElleKoseliVeGoster, formuOkuToplu } from "./formOkuyucu.js";
import { showStatus } from "./utils.js";
import { koseSeciciElemanlariniAl, koseSecimAkisi, KOSE_SECIM_IPTAL } from "./koseSecici.js";

/**
 * Seçilen dosyayı bir <img> nesnesine (yüklenmiş halde) çevirir.
 * @param {File} dosya
 * @returns {Promise<HTMLImageElement>}
 */
function dosyayiResmeCevir(dosya) {
    return new Promise((resolve, reject) => {

        const url = URL.createObjectURL(dosya);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Görsel yüklenemedi."));
        };

        img.src = url;

    });
}

/**
 * Birden fazla dosyayı sırayla, OTOMATİK tespitle (köşe seçim UI'si
 * ATLANARAK) okur. Her sonuç (başarılıysa) Toplu Tarama oturumuna
 * otomatik eklenir (bkz. formuOkuToplu → "omrSonucHazir" olayı).
 * @param {FileList|File[]} dosyalar
 * @param {HTMLCanvasElement} canvas - ara işlem canvas'ı
 */
async function topluIceAktar(dosyalar, canvas) {

    const toplam = dosyalar.length;
    let basarili = 0;
    const basarisizlar = [];

    for (let i = 0; i < toplam; i++) {

        const dosya = dosyalar[i];
        showStatus(`Taranıyor... (${i + 1}/${toplam}) ${dosya.name || ""}`);

        try {

            const img = await dosyayiResmeCevir(dosya);
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext("2d").drawImage(img, 0, 0);

            const sonuc = await formuOkuToplu(canvas);

            if (sonuc && sonuc.basarili) {
                basarili++;
            } else {
                basarisizlar.push(dosya.name || `#${i + 1}`);
            }

        } catch (err) {
            console.error("Toplu içe aktarma — dosya okunamadı:", dosya.name, err);
            basarisizlar.push(dosya.name || `#${i + 1}`);
        }

    }

    const ozetSatirlari = [`Toplu içe aktarma tamamlandı: ${basarili}/${toplam} başarılı.`];

    if (basarisizlar.length) {
        ozetSatirlari.push("");
        ozetSatirlari.push("Otomatik okunamayanlar (bunları tek tek, galeriden 1 fotoğraf seçip elle köşe düzelterek tekrar deneyin):");
        basarisizlar.forEach((ad) => ozetSatirlari.push("• " + ad));
    }

    showStatus(`Toplu içe aktarma: ${basarili}/${toplam} başarılı` + (basarisizlar.length ? `, ${basarisizlar.length} başarısız` : ""));

    const sonucKutusu = document.getElementById("sonucKutusu");
    if (sonucKutusu) {
        sonucKutusu.textContent = ozetSatirlari.join("\n");
        sonucKutusu.style.display = "block";
    }

    // Tüm dosyalar bitti — kamera overlay'ini kapatmak isteyen dinleyiciyi
    // (bkz. index.html overlayKapat) ŞİMDİ tetikle (batch sırasında ARA
    // adımlarda tetiklenmedi, bkz. formuOkuToplu).
    window.dispatchEvent(new CustomEvent("omrOkumaTamamlandi", { detail: { toplu: true, basarili, toplam } }));

}

/**
 * Galeri seçici <input type="file"> elemanını dinlemeye başlar.
 * @param {string} inputId
 * @param {string} canvasId - ara işlem için kullanılacak gizli canvas
 */
export function baglaGaleriSecici(inputId, canvasId) {

    const input = document.getElementById(inputId);
    const canvas = document.getElementById(canvasId);
    const koseElemanlari = koseSeciciElemanlariniAl();

    if (!input || !canvas || !koseElemanlari) {
        console.error("Galeri seçici için gerekli elemanlar bulunamadı.");
        return;
    }

    input.addEventListener("change", async () => {

        const dosyalar = input.files;

        if (!dosyalar || !dosyalar.length) {
            return;
        }

        try {

            if (dosyalar.length > 1) {

                // Toplu içe aktarma — köşe seçim UI'si atlanır.
                await topluIceAktar(dosyalar, canvas);

            } else {

                const dosya = dosyalar[0];

                showStatus("Fotoğraf yükleniyor...");

                const img = await dosyayiResmeCevir(dosya);

                // ÖNEMLİ: köşe seçim arayüzü (#koseSecimAlani) DOM'da
                // #kameraOverlay'in İÇİNDE yaşıyor (bkz. index.html). "+" >
                // "Galeri" akışında (galeriInputSheet) kamera hiç açılmamış
                // olabilir — bu durumda #kameraOverlay hâlâ `hidden`
                // durumdadır ve koseSecimAlani'yı "display:block" yapmak
                // onu GÖRÜNÜR KILMAZ, çünkü üst elemanı gizli. Sonuç:
                // kullanıcı hiçbir şey görmeden "takılı" kalıyordu — ta ki
                // Kamera'yı açıp aynı (zaten çizilmiş) köşe seçim ekranını
                // ortaya çıkarana kadar. Bunu düzeltmek için: köşe seçimine
                // başlamadan önce overlay'i (kamerayı BAŞLATMADAN, sadece
                // DOM'da görünür kılarak) geçici açıyoruz; biz açtıysak,
                // işlem bitince (veya hata olursa) tekrar gizliyoruz.
                const kameraOverlay = document.getElementById("kameraOverlay");
                const overlayBizActi = !!(kameraOverlay && kameraOverlay.hidden);
                if (overlayBizActi) {
                    kameraOverlay.hidden = false;
                }

                try {

                    const koseler = await koseSecimAkisi(img, img.naturalWidth, img.naturalHeight, koseElemanlari);

                    if (koseler === KOSE_SECIM_IPTAL) {
                        // Kullanıcı "✕" (Vazgeç, farklı resim seç) dedi —
                        // bu fotoğrafı HİÇ okumaya çalışma. "finally" bloğu
                        // (biz açtıysak) overlay'i zaten kapatacak; kullanıcı
                        // "Galeri"ye tekrar dokunup başka bir dosya seçebilir.
                        showStatus("İptal edildi. Galeriden başka bir fotoğraf seçebilirsiniz.");
                        return;
                    }

                    // Okuma için TEMİZ görüntüyü kullan — köşe seçim canvas'ında
                    // kullanıcının sürüklediği yeşil tutamaçlar/çizgiler çizili,
                    // onları piksel verisine karıştırmamak için ayrı bir canvas'a
                    // orijinal görseli yeniden çiziyoruz.
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    canvas.getContext("2d").drawImage(img, 0, 0);

                    if (koseler) {
                        await formuOkuElleKoseliVeGoster(canvas, koseler);
                    } else {
                        await formuOkuVeGoster(canvas);
                    }

                } finally {
                    // Normal akışta "omrOkumaTamamlandi" olayı zaten
                    // kameraKapat()'ı tetikleyip overlay'i gizler; ama bir
                    // hata/erken çıkış olursa (biz açtıysak) burada da
                    // güvenceye alıyoruz ki overlay açık takılı kalmasın.
                    if (overlayBizActi && kameraOverlay) {
                        kameraOverlay.hidden = true;
                    }
                }

            }

        } catch (err) {

            console.error("Galeriden okuma hatası:", err);
            showStatus("Fotoğraf okunamadı: " + err.message);

        } finally {

            // Aynı dosya(lar)ı art arda seçebilmek için input'u sıfırla
            // (tarayıcı aynı dosya seçilince "change" olayını tetiklemez).
            input.value = "";

        }

    });

}
