// js/koseSecici.js
//
// Sürüklenebilir 4 köşeli esnek dörtgenle köşe seçim UI'sinin ortak
// (kaynağı img veya canvas olabilen) mantığı. Hem galeriSecici.js hem de
// camera.js tarafından kullanılır — kamera veya galeriden gelen görüntü,
// bu noktadan sonra AYNI köşe seçim deneyiminden geçer.
//
// Sıra: solUst, sagUst, sagAlt, solAlt (saat yönünde).

const KOSE_SIRASI = ["solUst", "sagUst", "sagAlt", "solAlt"];

/**
 * Sayfanın kenarlarına yakın, makul varsayılan başlangıç köşeleri üretir
 * (kullanıcı genelde sadece küçük bir düzeltme yapsın diye).
 *
 * @param {number} genislik - kaynağın piksel genişliği
 * @param {number} yukseklik - kaynağın piksel yüksekliği
 * @param {{ust: number, alt: number}} [disariBirakilanY] - üstte/altta, ekranda
 *   GERÇEKTEN görünür kontrol elemanlarının (talimat etiketi, buton çubuğu)
 *   kapladığı yükseklik, kaynak piksel biriminde. Verilmezse sabit %6 pay
 *   kullanılır (eski davranış, ölçüm mümkün değilse yedek).
 */
function varsayilanKoseler(genislik, yukseklik, disariBirakilanY = null) {

    const mx = genislik * 0.05;
    const TAMPON = yukseklik * 0.015; // ölçülen sınırın hemen dibine yapışmasın diye küçük ek boşluk

    // ÖNEMLİ: köşe seçim ekranının kendi kontrol çubuğu (Tamam/Sıfırla/
    // Otomatik Dene) canvas'ın ÜSTÜNDE ayrı bir katmanda duruyor ve alt
    // kenarda hep GÖRÜNÜR kalıyor. Varsayılan tutamaç bu çubuğun altına denk
    // gelirse ilk dokunuş canvas'a değil düğmelere gider — tutamaç hiç
    // sürüklenemez. Sabit bir yüzde (ör. %10) ekran/resim en-boy oranına göre
    // yetersiz kalabildiği için, mümkünse gerçek ölçülen çubuk yüksekliği
    // kullanılıyor; ölçülemezse %6'lık güvenli bir yedek pay uygulanıyor.
    const ustPay = disariBirakilanY && disariBirakilanY.ust > 0
        ? disariBirakilanY.ust + TAMPON
        : yukseklik * 0.06;
    const altPay = disariBirakilanY && disariBirakilanY.alt > 0
        ? disariBirakilanY.alt + TAMPON
        : yukseklik * 0.06;

    // Payların ikisi birden görüntünün tamamını yutmasın diye üst sınır.
    const ustPaySinirli = Math.min(ustPay, yukseklik * 0.35);
    const altPaySinirli = Math.min(altPay, yukseklik * 0.35);

    return {
        solUst: { x: mx, y: ustPaySinirli },
        sagUst: { x: genislik - mx, y: ustPaySinirli },
        sagAlt: { x: genislik - mx, y: yukseklik - altPaySinirli },
        solAlt: { x: mx, y: yukseklik - altPaySinirli }
    };

}

/**
 * Bir DOM elemanının, secimCanvas'ın GÖSTERİLEN (CSS) boyutuna göre
 * kapladığı dikey alanı canvas'ın PİKSEL koordinat uzayına çevirir.
 * Elemanın ekranda canvas'ın üst/alt kenarından ne kadar içeri taştığını
 * hesaplar (ör. alt buton çubuğunun canvas alt kenarından yukarı ne kadar
 * uzandığı).
 *
 * @returns {number} taşan yükseklik, canvas piksel biriminde (taşma yoksa 0)
 */
function altaTasanYukseklikPx(el, secimCanvas, canvasYukseklikPx) {

    if (!el) return 0;

    const canvasRect = secimCanvas.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (canvasRect.height <= 0) return 0;

    // Elemanın üst kenarı, canvas'ın alt kenarından ne kadar yukarıda kaldı?
    const tasmaCSS = Math.max(0, canvasRect.bottom - elRect.top);
    const olcek = canvasYukseklikPx / canvasRect.height;

    return tasmaCSS * olcek;

}

/** Aynı mantığın üst kenar için karşılığı (elemanın alt kenarı, canvas üst kenarının ne kadar altına taşıyor). */
function ustteTasanYukseklikPx(el, secimCanvas, canvasYukseklikPx) {

    if (!el) return 0;

    const canvasRect = secimCanvas.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (canvasRect.height <= 0) return 0;

    const tasmaCSS = Math.max(0, elRect.bottom - canvasRect.top);
    const olcek = canvasYukseklikPx / canvasRect.height;

    return tasmaCSS * olcek;

}

/**
 * Bir <canvas> üzerinde sürüklenebilir 4 köşeli esnek bir dörtgenle köşe
 * seçimini yönetir. "Tamam" butonuna basılınca o anki 4 nokta ile resolve
 * olur; "Sıfırla" başlangıç konumuna döner.
 *
 * @param {CanvasImageSource} kaynak - tam çözünürlükte çizilebilir görüntü kaynağı (img veya canvas)
 * @param {number} genislik - kaynağın doğal/tam piksel genişliği
 * @param {number} yukseklik - kaynağın doğal/tam piksel yüksekliği
 * @param {HTMLCanvasElement} secimCanvas
 * @param {HTMLElement} talimatEl
 * @param {HTMLButtonElement} tamamBtn
 * @param {HTMLButtonElement} sifirlaBtn
 * @returns {Promise<{solUst,sagUst,sagAlt,solAlt}>} kaynağın piksel koordinatlarında köşeler
 */
export function koseleriSectir(kaynak, genislik, yukseklik, secimCanvas, talimatEl, tamamBtn, sifirlaBtn) {

    return new Promise((resolve) => {

        // Önceki bir seçim "Otomatik Devam Et" ile yarım bırakıldıysa, o
        // oturumun dinleyicileri hâlâ canvas'a asılı olabilir — önce onu
        // temizle (aksi halde sürükleme olayları birikip çakışabilir).
        if (secimCanvas._aktifTemizle) {
            secimCanvas._aktifTemizle();
        }

        secimCanvas.width = genislik;
        secimCanvas.height = yukseklik;

        // Alt buton çubuğu (Tamam/Sıfırla/Otomatik Dene) tamamBtn'in ebeveyni;
        // canvas'ın gösterildiği gerçek boyuta göre ne kadar alanı kapladığını
        // ölçüp varsayılan tutamaçların bu bölgenin DIŞINDA (üstünde) kalmasını
        // sağlıyoruz — sabit yüzdelik pay farklı en-boy oranlarında yetersiz
        // kalabiliyordu.
        const altButonCubugu = tamamBtn ? tamamBtn.parentElement : null;
        // .km-ust-bar normalde köşe seçimi sırasında gizleniyor (bkz.
        // koseSecimAkisi) ve gizliyken genişliği/yüksekliği 0 ölçülür, yani
        // burada bir etkisi olmaz. Yine de EK bir güvenlik payı olarak
        // hesaba katılıyor — herhangi bir nedenle hâlâ görünür kalırsa
        // (dokunuşlar artık pointer-events:none ile zaten ona gitmiyor,
        // ama varsayılan tutamaç görsel olarak da altında kalmasın diye).
        const ustBar = document.querySelector(".km-ust-bar");
        const disariBirakilanY = {
            ust: Math.max(
                ustteTasanYukseklikPx(talimatEl, secimCanvas, yukseklik),
                ustteTasanYukseklikPx(ustBar, secimCanvas, yukseklik)
            ),
            alt: altaTasanYukseklikPx(altButonCubugu, secimCanvas, yukseklik)
        };

        const ctx = secimCanvas.getContext("2d");
        let noktalar = varsayilanKoseler(genislik, yukseklik, disariBirakilanY);

        const TUTAMAC_YARICAP = Math.max(24, genislik * 0.018);
        const CIZGI_KALINLIK = Math.max(2, genislik * 0.0018);

        function yenidenCiz() {

            ctx.drawImage(kaynak, 0, 0);

            // Dörtgenin kenarları
            ctx.beginPath();
            KOSE_SIRASI.forEach((k, i) => {
                const p = noktalar[k];
                if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.lineWidth = CIZGI_KALINLIK;
            ctx.strokeStyle = "#2ecc71";
            ctx.stroke();

            // Sürüklenebilir köşe tutamaçları
            KOSE_SIRASI.forEach((k) => {

                const p = noktalar[k];

                ctx.beginPath();
                ctx.arc(p.x, p.y, TUTAMAC_YARICAP, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(46, 204, 113, 0.35)";
                ctx.fill();
                ctx.lineWidth = CIZGI_KALINLIK * 1.5;
                ctx.strokeStyle = "#2ecc71";
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(p.x, p.y, TUTAMAC_YARICAP * 0.15, 0, Math.PI * 2);
                ctx.fillStyle = "#2ecc71";
                ctx.fill();

            });

        }

        function buyutecCiz(nokta, rect) {

            const olcekX = secimCanvas.width / rect.width;
            const olcekY = secimCanvas.height / rect.height;

            const GORUNEN_CAP_CSS = 130; // ekranda görünecek çap (CSS piksel)
            const BUYUTME = 3;

            const capCanvas = GORUNEN_CAP_CSS * olcekX;
            const kaynakYariCap = capCanvas / (2 * BUYUTME);

            // Büyüteç parmağın üstünü kapatmasın diye touch noktasının
            // biraz yukarısına (üstte yer yoksa altına) çizilir.
            const KAYDIRMA_CSS = 90;
            let merkezY = nokta.y - KAYDIRMA_CSS * olcekY;
            if (merkezY - capCanvas / 2 < 0) {
                merkezY = nokta.y + KAYDIRMA_CSS * olcekY;
            }

            let merkezX = Math.max(capCanvas / 2, Math.min(secimCanvas.width - capCanvas / 2, nokta.x));

            ctx.save();

            ctx.beginPath();
            ctx.arc(merkezX, merkezY, capCanvas / 2, 0, Math.PI * 2);
            ctx.clip();

            ctx.fillStyle = "#fff";
            ctx.fillRect(merkezX - capCanvas / 2, merkezY - capCanvas / 2, capCanvas, capCanvas);

            ctx.drawImage(
                kaynak,
                nokta.x - kaynakYariCap, nokta.y - kaynakYariCap, kaynakYariCap * 2, kaynakYariCap * 2,
                merkezX - capCanvas / 2, merkezY - capCanvas / 2, capCanvas, capCanvas
            );

            ctx.restore();

            // Çerçeve
            ctx.beginPath();
            ctx.arc(merkezX, merkezY, capCanvas / 2, 0, Math.PI * 2);
            ctx.lineWidth = Math.max(2, secimCanvas.width * 0.0025);
            ctx.strokeStyle = "#2ecc71";
            ctx.stroke();

            // Tam hedef noktayı işaret eden kırmızı artı
            const kol = capCanvas * 0.14;
            ctx.beginPath();
            ctx.moveTo(merkezX - kol, merkezY);
            ctx.lineTo(merkezX + kol, merkezY);
            ctx.moveTo(merkezX, merkezY - kol);
            ctx.lineTo(merkezX, merkezY + kol);
            ctx.lineWidth = Math.max(1.5, secimCanvas.width * 0.0012);
            ctx.strokeStyle = "red";
            ctx.stroke();

        }

        function koordinatCanvasa(clientX, clientY) {

            const rect = secimCanvas.getBoundingClientRect();
            const olcekX = secimCanvas.width / rect.width;
            const olcekY = secimCanvas.height / rect.height;

            return {
                x: (clientX - rect.left) * olcekX,
                y: (clientY - rect.top) * olcekY
            };

        }

        let surukleneAnahtar = null;

        function asagi(evt) {

            const p = koordinatCanvasa(evt.clientX, evt.clientY);

            let enYakinAnahtar = null;
            let enYakinMesafe = Infinity;

            KOSE_SIRASI.forEach((k) => {
                const dx = noktalar[k].x - p.x;
                const dy = noktalar[k].y - p.y;
                const mesafe = Math.sqrt(dx * dx + dy * dy);
                if (mesafe < enYakinMesafe) {
                    enYakinMesafe = mesafe;
                    enYakinAnahtar = k;
                }
            });

            if (enYakinMesafe <= TUTAMAC_YARICAP * 1.8) {
                surukleneAnahtar = enYakinAnahtar;
                secimCanvas.setPointerCapture(evt.pointerId);
                evt.preventDefault();
                yenidenCiz();
                buyutecCiz(noktalar[surukleneAnahtar], secimCanvas.getBoundingClientRect());
            }

        }

        function hareket(evt) {

            if (!surukleneAnahtar) {
                return;
            }

            evt.preventDefault();

            const rect = secimCanvas.getBoundingClientRect();
            const olcekX = secimCanvas.width / rect.width;
            const olcekY = secimCanvas.height / rect.height;

            const p = {
                x: (evt.clientX - rect.left) * olcekX,
                y: (evt.clientY - rect.top) * olcekY
            };

            noktalar[surukleneAnahtar] = {
                x: Math.max(0, Math.min(genislik, p.x)),
                y: Math.max(0, Math.min(yukseklik, p.y))
            };

            yenidenCiz();
            buyutecCiz(noktalar[surukleneAnahtar], rect);

        }

        function yukari() {
            surukleneAnahtar = null;
            yenidenCiz(); // büyüteci temizle
        }

        secimCanvas.addEventListener("pointerdown", asagi);
        secimCanvas.addEventListener("pointermove", hareket);
        secimCanvas.addEventListener("pointerup", yukari);
        secimCanvas.addEventListener("pointercancel", yukari);

        function temizle() {
            secimCanvas.removeEventListener("pointerdown", asagi);
            secimCanvas.removeEventListener("pointermove", hareket);
            secimCanvas.removeEventListener("pointerup", yukari);
            secimCanvas.removeEventListener("pointercancel", yukari);
            tamamBtn.onclick = null;
            sifirlaBtn.onclick = null;
            secimCanvas._aktifTemizle = null;
        }

        secimCanvas._aktifTemizle = temizle;

        tamamBtn.onclick = () => {
            temizle();
            resolve({ ...noktalar });
        };

        sifirlaBtn.onclick = () => {
            noktalar = varsayilanKoseler(genislik, yukseklik, disariBirakilanY);
            yenidenCiz();
        };

        talimatEl.textContent =
            "Yeşil noktaları sürükleyip sayfanın 4 köşesindeki dolu kare " +
            "işaretlerin TAM MERKEZİNE (ortasına) yerleştir, sonra " +
            "\"Tamam\"a dokun.";

        yenidenCiz();

    });

}

/**
 * Köşe seçim UI'sinin DOM elemanlarını toplar. Bulunamayanlar için
 * console.error basar ve null döner.
 */
export function koseSeciciElemanlariniAl() {

    const elemanlar = {
        koseAlani: document.getElementById("koseSecimAlani"),
        koseCanvas: document.getElementById("koseSecimCanvas"),
        koseTalimat: document.getElementById("koseTalimat"),
        koseTamamBtn: document.getElementById("koseTamam"),
        koseSifirlaBtn: document.getElementById("koseSifirla"),
        koseVazgecBtn: document.getElementById("koseVazgec")
    };

    const eksik = Object.entries(elemanlar).filter(([, el]) => !el);

    if (eksik.length) {
        console.error("Köşe seçim arayüzü bulunamadı:", eksik.map(([ad]) => ad).join(", "));
        return null;
    }

    return elemanlar;

}

/**
 * Ortak akış: köşe seçim UI'sini gösterir, kullanıcı "Tamam" derse seçilen
 * köşeleri, "Otomatik Devam Et" derse null döner. Her iki durumda da
 * koseAlani'yı tekrar gizler.
 *
 * @param {CanvasImageSource} kaynak
 * @param {number} genislik
 * @param {number} yukseklik
 * @param {object} elemanlar - koseSeciciElemanlariniAl() çıktısı
 * @returns {Promise<{solUst,sagUst,sagAlt,solAlt}|null>}
 */
export async function koseSecimAkisi(kaynak, genislik, yukseklik, elemanlar) {

    const { koseAlani, koseCanvas, koseTalimat, koseTamamBtn, koseSifirlaBtn, koseVazgecBtn } = elemanlar;

    // Kamera ekranının üst bar'ı, alt bar'ı, ipucu bandı ve seviye
    // göstergesi köşe seçim UI'sinin ÜSTÜNDE (daha yüksek z-index) kalıyor
    // ve dokunuşları engelliyor — üst bar özellikle üst köşe tutamaçlarının
    // TAM ÜSTÜNE denk geldiği için onları tamamen erişilemez kılıyordu
    // (kullanıcı köşeleri sürükleyemiyordu). Köşe seçimi sırasında
    // bunları gizleyip işlem bitince eski haline döndürüyoruz.
    const gizlenecekler = [
        document.querySelector(".km-ust-bar"),
        document.querySelector(".km-alt-bar"),
        document.getElementById("kmIpucu"),
        document.getElementById("seviyeGosterge")
    ].filter(Boolean);

    // NOT: display:none zaten görsel olarak gizler VE dokunuşları da devre
    // dışı bırakır — ama (ör. bu elemanlardan biri başka bir kod yolunca
    // tekrar görünür kılınırsa) sağlam olsun diye pointer-events:none de
    // ayrıca veriliyor. Böylece görünürlük her ne sebeple bozulursa bozulsun,
    // dokunuşlar bu barların ALTINDAKİ canvas'a ulaşmaya devam eder — köşe
    // tutamaçları "hiç sürüklenemiyor" durumuna asla düşmez.
    const oncekiGorunum = gizlenecekler.map((el) => el.style.display);
    const oncekiPointerEvents = gizlenecekler.map((el) => el.style.pointerEvents);
    gizlenecekler.forEach((el) => {
        el.style.display = "none";
        el.style.pointerEvents = "none";
    });

    koseAlani.style.display = "block";

    let vazgecildi = false;

    const vazgecPromise = new Promise((resolve) => {
        koseVazgecBtn.onclick = () => {
            vazgecildi = true;
            resolve(null);
        };
    });

    const koseSecimPromise = koseleriSectir(
        kaynak, genislik, yukseklik, koseCanvas, koseTalimat, koseTamamBtn, koseSifirlaBtn
    );

    const koseler = await Promise.race([koseSecimPromise, vazgecPromise]);

    koseAlani.style.display = "none";
    koseVazgecBtn.onclick = null;

    gizlenecekler.forEach((el, i) => {
        el.style.display = oncekiGorunum[i];
        el.style.pointerEvents = oncekiPointerEvents[i];
    });

    return vazgecildi ? null : koseler;

}
