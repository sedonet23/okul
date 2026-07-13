import { formuOkuVeGoster, formuOkuElleKoseliVeGoster } from "./formOkuyucu.js";
import { koseSeciciElemanlariniAl, koseSecimAkisi } from "./koseSecici.js";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let stream = null;

/**
 * Kamerayı başlat
 */
export async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: {
                    ideal: "environment"
                },
                width: {
                    ideal: 1920
                },
                height: {
                    ideal: 1080
                }
            },
            audio: false
        });

        video.srcObject = stream;

        await video.play();

        console.log("Kamera başlatıldı.");

    } catch (err) {
        console.error("Kamera açılamadı:", err);
        alert("Kameraya erişilemedi.");
    }
}

/**
 * Fotoğraf çek, köşeleri elle seçtir, gerçek OMR motoruyla oku
 * @returns {Promise<object|null>} formuOku()/formuOkuElleKoseli() sonucu (veya hata durumunda null)
 */
export async function capturePhoto() {

    if (!video.videoWidth || !video.videoHeight) {
        alert("Kamera henüz hazır değil.");
        return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const koseElemanlari = koseSeciciElemanlariniAl();

    if (!koseElemanlari) {
        // Köşe seçim UI'sı yoksa (ör. eski index.html), eski otomatik yola düş.
        return formuOkuVeGoster(canvas);
    }

    const koseler = await koseSecimAkisi(canvas, canvas.width, canvas.height, koseElemanlari);

    if (koseler) {
        return formuOkuElleKoseliVeGoster(canvas, koseler);
    }

    return formuOkuVeGoster(canvas);
}

/**
 * Kamerayı durdur
 */
export function stopCamera() {

    if (!stream) return;

    stream.getTracks().forEach(track => track.stop());

    video.srcObject = null;

    stream = null;

    console.log("Kamera durduruldu.");
}

/**
 * Ön/arka kamera değiştir
 */
export async function switchCamera(facing = "environment") {

    stopCamera();

    try {

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facing
            },
            audio: false
        });

        video.srcObject = stream;

        await video.play();

    } catch (err) {

        console.error(err);

    }

}