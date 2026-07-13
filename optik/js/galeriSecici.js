// js/galeriSecici.js
//
// Galeriden seçilen fotoğrafı okumadan önce, ortak köşe seçim UI'sinden
// (koseSecici.js) geçirir. "Tamam" ile elle seçilen köşeler kullanılır;
// "Otomatik Devam Et" ile eski otomatik QR+hizalama tespiti denenir.

import { formuOkuVeGoster, formuOkuElleKoseliVeGoster } from "./formOkuyucu.js";
import { showStatus } from "./utils.js";
import { koseSeciciElemanlariniAl, koseSecimAkisi } from "./koseSecici.js";

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

        const dosya = input.files && input.files[0];

        if (!dosya) {
            return;
        }

        try {

            showStatus("Fotoğraf yükleniyor...");

            const img = await dosyayiResmeCevir(dosya);

            const koseler = await koseSecimAkisi(img, img.naturalWidth, img.naturalHeight, koseElemanlari);

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

        } catch (err) {

            console.error("Galeriden okuma hatası:", err);
            showStatus("Fotoğraf okunamadı: " + err.message);

        } finally {

            // Aynı dosyayı art arda seçebilmek için input'u sıfırla
            // (tarayıcı aynı dosya seçilince "change" olayını tetiklemez).
            input.value = "";

        }

    });

}
