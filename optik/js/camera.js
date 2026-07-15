import { formuOkuVeGoster, formuOkuElleKoseliVeGoster } from "./formOkuyucu.js";
import { koseSeciciElemanlariniAl, koseSecimAkisi, KOSE_SECIM_IPTAL } from "./koseSecici.js";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let stream = null;

// ────────────────────────────────────────────────────────────────
// CANLI KÖŞE YAKALAMA GÖSTERGESİ
// ────────────────────────────────────────────────────────────────
// Kamera önizlemesi (video) üzerine, sayfanın 4 köşesindeki hizalama
// karelerinin o an fotoğrafta YAKALANIP yakalanmadığını gösteren canlı
// bir gösterge çizer: bulunduysa YEŞİL, bulunamadıysa (o köşe bölgesinin
// yaklaşık beklenen konumunda) KIRAMIZI daire+artı işareti. Gerçek
// yakalama/okuma mantığıyla AYNI fonksiyonu (OmrOkuyucu.sayfaKoseleriniAra)
// kullanır — bu yüzden "yeşil görününce çek" kuralı gerçek okuma
// başarısıyla doğrudan ilişkilidir.
const _koseTespitAnalizCanvas = document.createElement("canvas");
let _koseTespitTimer = null;
let _koseTespitCalisiyor = false; // örtüşen (üst üste binen) çalıştırmaları engelle

const KOSE_TESPIT_ARALIK_MS = 450;
const KOSE_TESPIT_ANALIZ_GENISLIK = 480; // analiz hızı için düşürülmüş çözünürlük

function _koseTespitTemizle() {
    const overlay = document.getElementById("koseTespitOverlay");
    if (!overlay) return;
    const octx = overlay.getContext("2d");
    octx.clearRect(0, 0, overlay.width, overlay.height);
}

function _koseTespitBaslat() {
    _koseTespitDurdur();
    _koseTespitTimer = setInterval(_koseTespitCalistir, KOSE_TESPIT_ARALIK_MS);
}

function _koseTespitDurdur() {
    if (_koseTespitTimer) {
        clearInterval(_koseTespitTimer);
        _koseTespitTimer = null;
    }
    _koseTespitTemizle();
}

function _koseTespitCalistir() {

    if (_koseTespitCalisiyor) return; // önceki tur hâlâ işleniyor, atla
    if (!video.videoWidth || !video.videoHeight) return;
    if (typeof window.OmrOkuyucu === "undefined" || typeof window.OmrOkuyucu.sayfaKoseleriniAra !== "function") return;

    const overlay = document.getElementById("koseTespitOverlay");
    if (!overlay) return;

    _koseTespitCalisiyor = true;

    try {

        const aOlcek = KOSE_TESPIT_ANALIZ_GENISLIK / video.videoWidth;
        const aGenislik = KOSE_TESPIT_ANALIZ_GENISLIK;
        const aYukseklik = Math.round(video.videoHeight * aOlcek);

        _koseTespitAnalizCanvas.width = aGenislik;
        _koseTespitAnalizCanvas.height = aYukseklik;
        const actx = _koseTespitAnalizCanvas.getContext("2d", { willReadFrequently: true });
        actx.drawImage(video, 0, 0, aGenislik, aYukseklik);

        let imageData;
        try {
            imageData = actx.getImageData(0, 0, aGenislik, aYukseklik);
        } catch (err) {
            return; // (nadir) canvas okuma hatası — bu turu sessizce atla
        }

        const koseler = window.OmrOkuyucu.sayfaKoseleriniAra(imageData);

        // Analiz çözünürlüğünden GERÇEK (native) video çözünürlüğüne geri ölçekle
        const geriOlcek = video.videoWidth / aGenislik;

        // <video> object-fit:cover kullanıyor — native çözünürlükten CSS
        // (ekranda görünen) boyuta, ORTADAN KIRPILARAK ölçekleniyor. Tespit
        // noktalarını doğru yerde göstermek için aynı dönüşümü uyguluyoruz.
        const rect = video.getBoundingClientRect();
        const dispW = rect.width, dispH = rect.height;
        if (!dispW || !dispH) return;

        const kapsamaOlcek = Math.max(dispW / video.videoWidth, dispH / video.videoHeight);
        const kirpilmisGenislik = dispW / kapsamaOlcek;
        const kirpilmisYukseklik = dispH / kapsamaOlcek;
        const ofsX = (video.videoWidth - kirpilmisGenislik) / 2;
        const ofsY = (video.videoHeight - kirpilmisYukseklik) / 2;

        overlay.width = dispW;
        overlay.height = dispH;
        const octx = overlay.getContext("2d");
        octx.clearRect(0, 0, dispW, dispH);

        const YARICAP = Math.max(16, dispW * 0.032);

        const BEKLENEN = {
            solUst: { x: dispW * 0.08, y: dispH * 0.07 },
            sagUst: { x: dispW * 0.92, y: dispH * 0.07 },
            solAlt: { x: dispW * 0.08, y: dispH * 0.93 },
            sagAlt: { x: dispW * 0.92, y: dispH * 0.93 },
        };

        Object.keys(BEKLENEN).forEach((konum) => {

            const nokta = koseler[konum];
            let cx, cy, bulunduMu;

            if (nokta) {
                const fx = nokta.x * geriOlcek;
                const fy = nokta.y * geriOlcek;
                cx = (fx - ofsX) * kapsamaOlcek;
                cy = (fy - ofsY) * kapsamaOlcek;
                bulunduMu = true;
            } else {
                cx = BEKLENEN[konum].x;
                cy = BEKLENEN[konum].y;
                bulunduMu = false;
            }

            const renk = bulunduMu ? "#2ecc71" : "#e74c3c";

            octx.beginPath();
            octx.arc(cx, cy, YARICAP, 0, Math.PI * 2);
            octx.strokeStyle = renk;
            octx.lineWidth = 3;
            octx.stroke();

            octx.beginPath();
            octx.moveTo(cx - YARICAP * 0.5, cy);
            octx.lineTo(cx + YARICAP * 0.5, cy);
            octx.moveTo(cx, cy - YARICAP * 0.5);
            octx.lineTo(cx, cy + YARICAP * 0.5);
            octx.strokeStyle = renk;
            octx.lineWidth = 2;
            octx.stroke();

        });

    } catch (err) {
        console.error("Canlı köşe tespiti hatası (görmezden gelindi):", err);
    } finally {
        _koseTespitCalisiyor = false;
    }

}

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

        _koseTespitBaslat();

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

    // Fotoğraf çekilir çekilmez canlı göstergeyi durdur — artık gereksiz
    // (video hâlâ arka planda akıyor olabilir ama üstü köşe seçim/okuma
    // ekranlarıyla kaplanacak).
    _koseTespitDurdur();

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

    if (koseler === KOSE_SECIM_IPTAL) {
        // Kullanıcı "✕" (Vazgeç, farklı resim seç) dedi — bu fotoğrafı HİÇ
        // okumaya çalışma. Kamera zaten açık/akıyor durumda kalır, kullanıcı
        // doğrudan tekrar çekim yapabilir.
        return null;
    }

    if (koseler) {
        return formuOkuElleKoseliVeGoster(canvas, koseler);
    }

    return formuOkuVeGoster(canvas);
}

/**
 * Kamerayı durdur
 */
export function stopCamera() {

    _koseTespitDurdur();

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

        _koseTespitBaslat();

    } catch (err) {

        console.error(err);

    }

}
