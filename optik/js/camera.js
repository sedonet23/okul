import { formuOkuVeGoster, formuOkuElleKoseliVeGoster } from "./formOkuyucu.js";
import { koseSeciciElemanlariniAl, koseSecimAkisi, KOSE_SECIM_IPTAL } from "./koseSecici.js";
import { ayarlariGetir } from "./hassasiyetAyarlari.js";
// YENİ: canlı önizleme köşe/çerçeve tespiti artık OpenCV.js (Canny +
// findContours) tabanlı sayfaTespitCV.js üzerinden yapılıyor — eski
// window.OmrOkuyucu.sayfaKoseleriniAra (blob+çizgi ikili yöntemi) SADECE
// gerçek okuma anındaki hassas hizalama-işareti tespiti için kullanılmaya
// devam ediyor (bkz. omrEngine.js: formuOtomatikDuzlestir). İkisi FARKLI
// hedefleri buluyor (sayfa çerçevesi vs. küçük hizalama kareleri), o
// yüzden burada değiştirilen SADECE canlı gösterge/otomatik-tetikleme
// döngüsü — okuma hassasiyeti bu değişiklikten etkilenmez.
import { sayfaKoseleriniAraCV, cvHazirBekle, cvHazirMi } from "./sayfaTespitCV.js";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let stream = null;

// ────────────────────────────────────────────────────────────────
// CANLI KÖŞE YAKALAMA GÖSTERGESİ + CANLI TARAMA MODU
// ────────────────────────────────────────────────────────────────
// Kamera önizlemesi (video) üzerine, sayfanın ÇERÇEVESİNİN o an fotoğrafta
// YAKALANIP yakalanmadığını gösteren canlı bir gösterge çizer: bulunduysa
// YEŞİL, bulunamadıysa (o köşe bölgesinin yaklaşık beklenen konumunda)
// KIRMIZI daire+artı işareti; 4 köşe ayrıca bir dörtgen ÇİZGİSİYLE
// birbirine bağlanır (sayfanın genel hizasını göstermek için).
// sayfaTespitCV.js (OpenCV.js, Canny+findContours) kullanır — bu, gerçek
// okuma anında hizalama işaretlerini bulan omrEngine.js:sayfaKoseleriniAra
// ile AYNI fonksiyon DEĞİLDİR (bkz. yukarıdaki import notu); sadece "sayfa
// kabaca hizalı mı" sorusuna hızlı cevap vermek için var.
//
// CANLI TARAMA MODU açıkken (bkz. canliTaramaBaslat/Durdur): 4 köşe art
// arda birkaç kare boyunca STABİL (neredeyse aynı yerde) bulunursa tam
// okuma otomatik tetiklenir — kullanıcı çekim tuşuna basmadan kağıt
// okunup kaydedilir. Aynı kağıt kameradan çıkana kadar tekrar tetiklenmez
// (bkz. _sonIslenenImza).
const _koseTespitAnalizCanvas = document.createElement("canvas");
let _koseTespitTimer = null;
let _koseTespitCalisiyor = false; // örtüşen (üst üste binen) çalıştırmaları engelle

const KOSE_TESPIT_ANALIZ_GENISLIK = 480; // YENİ: 360'ta ince (0.35mm) çerçeve çizgisi neredeyse yok oluyordu (~0.6px) — CV kontur tespiti için 480'e çıkarıldı (~0.8px, hâlâ ince ama Canny+dilate ile yakalanabilir düzeyde). Kalıcı çözüm form tarafında çizgiyi kalınlaştırmak (bkz. pdfFormGenerator.js notu).

// Bir önceki turda CV ile bulunan çerçeve köşeleri — sayfaKoseleriniAraCV'ye
// TAKİP (tracking) ipucu olarak geçiriliyor; her turda sıfırdan tam kare
// aramak yerine bu noktanın etrafında dar bir ROI'de arar (çok daha hızlı).
// Yeni bir başarılı tespitte güncellenir, kamera durdurulduğunda sıfırlanır.
let _sonBulunanCerceveKoseleri = null;

// ---- Canlı tarama modu durumu ----
let _canliModAktif = false;
let _canliIsleniyor = false;       // tam okuma o an çalışıyor mu (döngü bu sürece dokunmaz)
let _sonIslenenImza = null;        // son işlenen kağıdın köşe "imzası" — aynı kağıdı tekrar tetiklememek için
let _stabilGecmis = [];            // son birkaç tespit turunun köşe konumları (stabilite kontrolü için)
const STABIL_GEREKEN_TUR = 3;      // bu kadar ardışık turda ~aynı konumda bulunursa "stabil" say
const STABIL_TOLERANS_PX = 6;      // analiz çözünürlüğünde izin verilen konum sapması

let _onSonucCallback = null;       // app.js tarafından set edilir: canlı modda her okuma sonrası çağrılır
let _onDurumCallback = null;       // app.js tarafından set edilir: "aranıyor/hizalandı/okunuyor" durumu için

function _koseTespitTemizle() {
    const overlay = document.getElementById("koseTespitOverlay");
    if (!overlay) return;
    const octx = overlay.getContext("2d");
    octx.clearRect(0, 0, overlay.width, overlay.height);
}

function _koseTespitBaslat() {
    _koseTespitDurdur();
    const aralik = (ayarlariGetir().tespitAraligiMs) || 350;
    _koseTespitTimer = setInterval(_koseTespitCalistir, aralik);
}

function _koseTespitDurdur() {
    if (_koseTespitTimer) {
        clearInterval(_koseTespitTimer);
        _koseTespitTimer = null;
    }
    _koseTespitTemizle();
    _sonBulunanCerceveKoseleri = null; // eski oturumun takip noktası yeni oturuma sızmasın
}

/** İki köşe kümesinin (analiz çözünürlüğünde) birbirine yeterince yakın olup olmadığını kontrol eder. */
function _koselerYakinMi(a, b) {
    if (!a || !b) return false;
    const anahtarlar = ["solUst", "sagUst", "solAlt", "sagAlt"];
    for (const k of anahtarlar) {
        if (!a[k] || !b[k]) return false;
        const dx = a[k].x - b[k].x, dy = a[k].y - b[k].y;
        if (Math.sqrt(dx * dx + dy * dy) > STABIL_TOLERANS_PX) return false;
    }
    return true;
}

/** 4 köşenin hepsi bulunmuş mu? */
function _tumKoselerVarMi(koseler) {
    return !!(koseler && koseler.solUst && koseler.sagUst && koseler.solAlt && koseler.sagAlt);
}

/** Basit bir "imza" — aynı fiziksel kağıdın kamerada durmaya devam edip etmediğini anlamak için. */
function _imzaUret(koseler) {
    if (!_tumKoselerVarMi(koseler)) return null;
    const r = (n) => Math.round(n / 4) * 4; // 4px'e yuvarla — küçük titreşimleri yut
    return ["solUst", "sagUst", "solAlt", "sagAlt"].map(k => `${r(koseler[k].x)},${r(koseler[k].y)}`).join("|");
}

function _koseTespitCalistir() {

    if (_koseTespitCalisiyor || _canliIsleniyor) return; // önceki tur / tam okuma hâlâ sürüyor, atla
    if (!video.videoWidth || !video.videoHeight) return;
    if (!cvHazirMi()) return; // OpenCV.js WASM henüz yüklenmediyse bu turu atla

    const overlay = document.getElementById("koseTespitOverlay");
    if (!overlay) return;

    _koseTespitCalisiyor = true;

    try {

        const ayarlar = ayarlariGetir();
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

        const hassasiyet = { yuzdelik: ayarlar.yuzdelik, minDoluluk: ayarlar.minDoluluk };
        const koseler = sayfaKoseleriniAraCV(imageData, hassasiyet, _sonBulunanCerceveKoseleri);
        // Başarılı tespitte takip noktasını güncelle (sonraki tur bu noktanın
        // etrafında dar ROI'de arasın); bulunamazsa ELDEKİ son bilinen noktayı
        // KORU — sayfaKoseleriniAraCV zaten ROI'de bulamazsa otomatik tam kare
        // aramasına düşüyor, burada erken sıfırlamak sadece gereksiz tam-kare
        // aramasını hızlandırmaz, tam tersine bir sonraki turun da takipsiz
        // (daha yavaş) başlamasına yol açar.
        if (_tumKoselerVarMi(koseler)) {
            _sonBulunanCerceveKoseleri = koseler;
        }

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

        const ekranNoktalari = {};

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

            ekranNoktalari[konum] = { x: cx, y: cy, bulunduMu };

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

        // 4 köşeyi birbirine bağlayan dörtgen — bulunan komşu köşeler
        // arasında YEŞİL düz, en az biri eksikse KIRMIZI kesikli çizgi
        // (kullanıcı sayfanın genel hizasını/eğikliğini anlık görsün diye).
        const sira = [["solUst", "sagUst"], ["sagUst", "sagAlt"], ["sagAlt", "solAlt"], ["solAlt", "solUst"]];
        for (const [a, b] of sira) {
            const p1 = ekranNoktalari[a], p2 = ekranNoktalari[b];
            const ikisiDeVar = p1.bulunduMu && p2.bulunduMu;
            octx.beginPath();
            octx.setLineDash(ikisiDeVar ? [] : [6, 5]);
            octx.moveTo(p1.x, p1.y);
            octx.lineTo(p2.x, p2.y);
            octx.strokeStyle = ikisiDeVar ? "rgba(46,204,113,.85)" : "rgba(231,76,60,.55)";
            octx.lineWidth = 2;
            octx.stroke();
            octx.setLineDash([]);
        }

        // ---- Canlı tarama modu: stabilite kontrolü + otomatik tetikleme ----
        if (_canliModAktif) {
            const tumuVar = _tumKoselerVarMi(koseler);

            _stabilGecmis.push(tumuVar ? koseler : null);
            if (_stabilGecmis.length > STABIL_GEREKEN_TUR) _stabilGecmis.shift();

            if (typeof _onDurumCallback === "function") {
                _onDurumCallback(tumuVar ? "hizalandi" : "araniyor");
            }

            if (_stabilGecmis.length === STABIL_GEREKEN_TUR && _stabilGecmis.every(k => k)) {
                const ilkTur = _stabilGecmis[0];
                const stabilMi = _stabilGecmis.every(k => _koselerYakinMi(k, ilkTur));

                if (stabilMi) {
                    const imza = _imzaUret(ilkTur);
                    if (imza && imza !== _sonIslenenImza) {
                        _sonIslenenImza = imza;
                        _stabilGecmis = [];
                        _canliOtomatikOku();
                    }
                }
            }
        }

    } catch (err) {
        console.error("Canlı köşe tespiti hatası (görmezden gelindi):", err);
    } finally {
        _koseTespitCalisiyor = false;
    }

}

/**
 * Canlı modda: kullanıcı çekim tuşuna basmadan, video karesini yakalayıp
 * otomatik (elle köşe seçim UI'sı OLMADAN) okur. Okuma bitince sonucu
 * app.js'e (bkz. canliTaramaBaslat'a verilen callback) iletir, kamerayı
 * KAPATMAZ — döngü otomatik olarak sıradaki kağıt için devam eder.
 */
async function _canliOtomatikOku() {
    if (!video.videoWidth || !video.videoHeight) return;
    _canliIsleniyor = true;
    if (typeof _onDurumCallback === "function") _onDurumCallback("okunuyor");

    try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const sonuc = await formuOkuVeGoster(canvas);

        if (typeof _onSonucCallback === "function") _onSonucCallback(sonuc);

    } catch (err) {
        console.error("Canlı otomatik okuma hatası:", err);
    } finally {
        // Kısa bir "soğuma" süresi — sonuç kartının bir an ekranda kalması
        // ve aynı kağıdın hemen art arda tekrar tetiklenmemesi için.
        setTimeout(() => { _canliIsleniyor = false; }, 900);
    }
}

/** app.js tarafından çağrılır: canlı tarama modunu açar. */
export function canliTaramaBaslat(onSonuc, onDurum) {
    _canliModAktif = true;
    _sonIslenenImza = null;
    _stabilGecmis = [];
    _onSonucCallback = onSonuc || null;
    _onDurumCallback = onDurum || null;
}

/** app.js tarafından çağrılır: canlı tarama modunu kapatır (manuel çekim moduna döner). */
export function canliTaramaDurdur() {
    _canliModAktif = false;
    _sonIslenenImza = null;
    _stabilGecmis = [];
}

export function canliTaramaAktifMi() {
    return _canliModAktif;
}

// ────────────────────────────────────────────────────────────────
// KAMERA FLAŞI (TORCH)
// ────────────────────────────────────────────────────────────────
/** Cihaz/tarayıcı torch (flaş) özelliğini destekliyor mu? */
export function torchDesteginiKontrolEt() {
    try {
        if (!stream) return false;
        const track = stream.getVideoTracks()[0];
        if (!track || typeof track.getCapabilities !== "function") return false;
        const cap = track.getCapabilities();
        return !!(cap && cap.torch);
    } catch (e) {
        return false;
    }
}

let _torchAcikMi = false;
export async function torchAyarla(acik) {
    try {
        if (!stream) return false;
        const track = stream.getVideoTracks()[0];
        if (!track) return false;
        await track.applyConstraints({ advanced: [{ torch: !!acik }] });
        _torchAcikMi = !!acik;
        return true;
    } catch (e) {
        console.error("Torch ayarlanamadı:", e);
        return false;
    }
}
export function torchDurumu() { return _torchAcikMi; }

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

        // OpenCV.js WASM modülü henüz yüklenmediyse (uygulama yeni açıldıysa
        // birkaç yüz ms sürebilir) burada bekleniyor — kamera görüntüsü zaten
        // akmaya başladı, kullanıcı bekleme farkını hissetmez, sadece köşe
        // göstergesi cv hazır olana kadar bir an gecikmeli başlar.
        await cvHazirBekle();
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
    _canliModAktif = false;

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

        await cvHazirBekle();
        _koseTespitBaslat();

    } catch (err) {

        console.error(err);

    }

}
