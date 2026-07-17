// js/sayfaTespitCV.js
//
// OpenCV.js (WASM) tabanlı, TEK GEÇİŞTE tüm sayfa çerçevesini bulan köşe
// tespiti. Eski iki yöntemin (kenarCizgisiIleKoseBul + enBuyukKareBlobuBul,
// 4 ayrı köşe penceresinde BAĞIMSIZ çalışıp birbirine düşen) yerini alır —
// layoutEngine.js: sayfaCercevesiHesapla() ile basılan TEK kesintisiz
// dikdörtgen çerçeveyi, klasik doküman tarayıcı yöntemiyle (Canny +
// findContours + approxPolyDP) doğrudan bulur.
//
// SÖZLEŞME (contract), eski omrEngine.js: sayfaKoseleriniAra() ile UYUMLU:
//   girdi:  ImageData (analiz çözünürlüğünde)
//   çıktı:  { solUst, sagUst, solAlt, sagAlt } -- ya HEPSİ dolu (kontur
//           yöntemi all-or-nothing çalışır) ya da hiçbiri (boş obje döner,
//           camera.js:_tumKoselerVarMi() zaten bunu bekliyor)
//
// ÖNEMLİ — BELLEK YÖNETİMİ: cv.Mat nesneleri WASM tarafında manuel
// yönetilir. Her mat mutlaka .delete() ile serbest bırakılmalı, aksi halde
// birkaç dakika içinde bellek sızıntısından uygulama çöker. Bu dosyadaki
// HER fonksiyon try/finally ile bunu garanti eder — yeni kod eklerken aynı
// deseni koruyun.
//
// KURULUM (bu dosyayı kullanmadan önce):
//   1) opencv.js (WASM build) dosyasını www/lib/opencv.js altına koyun
//      (offline APK için CDN'e değil, bundled asset'e ihtiyaç var).
//   2) index.html / kamera.html'e: <script src="lib/opencv.js"></script>
//      (async DEĞİL — cv objesi senkron beklenecek, aşağıdaki cvHazirBekle
//      zaten polling ile bekliyor ama script tag'in DOM'da olması yeterli.)
//   3) Kamera başlamadan önce: await cvHazirBekle();

const A4_ORANI_DIKEY = 210 / 297;   // ~0.707 (LGS vb. dikey A4)
const A4_ORANI_YATAY = 297 / 210;   // ~1.414 (yatay çekilirse)
const ORAN_TOLERANS = 0.18;         // en-boy oranında bu kadar sapmaya izin ver (kağıt hafif eğik tutulabilir)

const MIN_ALAN_ORANI = 0.12;        // çerçeve, analiz karesinin en az %12'sini kaplamalı (küçükse -> yanlış kontur)
const MAX_ALAN_ORANI = 0.97;        // %97'den büyükse muhtemelen kare kenarı/masa, sayfa değil

let _cvHazir = false;
let _cvHazirPromise = null;

/** OpenCV.js WASM modülünün yüklenmesini bekler (uygulama başına bir kere). */
export function cvHazirBekle() {
  if (_cvHazirPromise) return _cvHazirPromise;
  _cvHazirPromise = new Promise((resolve) => {
    if (typeof cv !== "undefined" && cv.Mat) {
      _cvHazir = true;
      resolve();
      return;
    }
    const kontrolAralik = setInterval(() => {
      if (typeof cv !== "undefined" && cv.Mat) {
        clearInterval(kontrolAralik);
        _cvHazir = true;
        resolve();
      }
    }, 50);
  });
  return _cvHazirPromise;
}

export function cvHazirMi() {
  return _cvHazir;
}

/**
 * 4 noktayı (herhangi bir sırada gelebilir) solUst/sagUst/sagAlt/solAlt
 * olarak sıralar. Standart "sum/diff" yöntemi:
 *   solÜst  = x+y EN KÜÇÜK      sağAlt = x+y EN BÜYÜK
 *   sağÜst  = x-y EN BÜYÜK      solAlt = x-y EN KÜÇÜK
 */
function noktalariSirala(noktalar) {
  const toplamSirali = [...noktalar].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const farkSirali = [...noktalar].sort((a, b) => (a.x - a.y) - (b.x - b.y));
  return {
    solUst: toplamSirali[0],
    sagAlt: toplamSirali[3],
    solAlt: farkSirali[0],
    sagUst: farkSirali[3],
  };
}

function kenarUzunluk(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/** Bulunan dörtgenin A4 en-boy oranına (dikey ya da yatay) yeterince yakın olup olmadığını kontrol eder. */
function enBoyOraniUygunMu(koseler) {
  const ust = kenarUzunluk(koseler.solUst, koseler.sagUst);
  const sol = kenarUzunluk(koseler.solUst, koseler.solAlt);
  if (ust < 1 || sol < 1) return false;
  const oran = ust / sol;
  const dikeyFark = Math.abs(oran - A4_ORANI_DIKEY) / A4_ORANI_DIKEY;
  const yatayFark = Math.abs(oran - A4_ORANI_YATAY) / A4_ORANI_YATAY;
  return dikeyFark < ORAN_TOLERANS || yatayFark < ORAN_TOLERANS;
}

/**
 * Bir ROI (bölge, tam gri görüntünün alt-matrisi) içinde en büyük geçerli
 * 4-köşeli konturu arar. roiOfsX/roiOfsY, sonucu ROI koordinatından TAM
 * görüntü koordinatına geri taşımak için eklenir. tamAlan, alan-oranı
 * filtresi için her zaman TAM KARENİN alanı olmalı (ROI'nin değil) —
 * aksi halde takip modunda MIN/MAX_ALAN_ORANI eşikleri anlamsızlaşır.
 */
function _konturAra(gri, roiOfsX, roiOfsY, tamAlan) {
  const kenarlar = new cv.Mat();
  const dilateKernel = cv.Mat.ones(3, 3, cv.CV_8U);
  const konturlar = new cv.MatVector();
  const hiyerarsi = new cv.Mat();

  let enIyi = null;
  let enIyiAlan = -1;

  try {
    // YENİ: eşikler (50,150)->(30,100) düşürüldü — ince/düşük kontrastlı
    // çerçeve çizgisi eski eşiklerde Canny'den hiç geçemiyordu. Dilate
    // iterasyonu 1->2 çıkarıldı — çizgi tek pikselin altına düştüğü
    // noktalarda kopukluğu kapatmak için.
    cv.Canny(gri, kenarlar, 30, 100);
    cv.dilate(kenarlar, kenarlar, dilateKernel, new cv.Point(-1, -1), 2);

    cv.findContours(kenarlar, konturlar, hiyerarsi, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    for (let i = 0; i < konturlar.size(); i++) {
      const kontur = konturlar.get(i);
      const cevre = cv.arcLength(kontur, true);
      const yaklasik = new cv.Mat();
      cv.approxPolyDP(kontur, yaklasik, 0.02 * cevre, true);

      if (yaklasik.rows === 4 && cv.isContourConvex(yaklasik)) {
        const alan = cv.contourArea(yaklasik);
        const alanOrani = alan / tamAlan;

        if (alanOrani >= MIN_ALAN_ORANI && alanOrani <= MAX_ALAN_ORANI && alan > enIyiAlan) {
          const ham = [];
          for (let k = 0; k < 4; k++) {
            ham.push({
              x: yaklasik.data32S[k * 2] + roiOfsX,
              y: yaklasik.data32S[k * 2 + 1] + roiOfsY,
            });
          }
          const sirali = noktalariSirala(ham);
          if (enBoyOraniUygunMu(sirali)) {
            enIyi = sirali;
            enIyiAlan = alan;
          }
        }
      }
      yaklasik.delete();
      kontur.delete();
    }
  } finally {
    kenarlar.delete();
    dilateKernel.delete();
    konturlar.delete();
    hiyerarsi.delete();
  }

  return enIyi;
}

/**
 * ANA FONKSİYON — eski sayfaKoseleriniAra(imageData, hassasiyet) ile
 * ÇAĞRI UYUMLU (camera.js tarafında tek satır değişiklikle takılabilir),
 * ek olarak TAKİP (tracking) için üçüncü parametre alır.
 *
 * @param {ImageData} imageData - analiz çözünürlüğünde kare
 * @param {object} [hassasiyet] - kullanılmıyor, eski çağrı imzasıyla
 *   uyumluluk için tutuldu (camera.js değiştirmeden geçirebilsin diye)
 * @param {{solUst,sagUst,solAlt,sagAlt}|null} [sonBilinenKoseler] - bir
 *   önceki turda bulunan köşeler. Verilirse ÖNCE onun etrafında dar bir
 *   ROI'de aranır (çok daha hızlı, "anlık" hissi bu sayede oluşur);
 *   bulunamazsa otomatik olarak TAM KARE aramasına düşer.
 * @returns {{solUst,sagUst,solAlt,sagAlt}} bulunamadıysa boş obje {}
 *   (camera.js: _tumKoselerVarMi() bunu "yok" olarak yorumluyor)
 */
export function sayfaKoseleriniAraCV(imageData, hassasiyet, sonBilinenKoseler) {
  if (!_cvHazir) return {};

  const src = cv.matFromImageData(imageData);
  const gri = new cv.Mat();
  let sonuc = null;

  try {
    cv.cvtColor(src, gri, cv.COLOR_RGBA2GRAY);
    // YENİ: (5,5) yerine (3,3) — sayfa çerçevesi zaten ince (0.35mm baskı,
    // ~0.8px analiz çözünürlüğünde); (5,5) blur bunu neredeyse tamamen
    // eritiyordu. (3,3) hâlâ gürültüyü azaltır ama ince çizgiyi silmez.
    cv.GaussianBlur(gri, gri, new cv.Size(3, 3), 0);

    const tamAlan = imageData.width * imageData.height;

    // ---- TAKİP MODU: son bilinen köşelerin etrafında dar ROI'de ara ----
    // Bu, "her turda sıfırdan tam kare taraması" yerine geçen asıl hız
    // kazanımı — önceki mesajda konuşulan "kare-kare hafıza yok" sorununun
    // çözümü burası.
    if (sonBilinenKoseler && sonBilinenKoseler.solUst && sonBilinenKoseler.sagAlt) {
      const PAY_ORANI = 0.28; // her yöne, dörtgen boyutunun bu kadarı kadar genişlet
      const minX = Math.min(sonBilinenKoseler.solUst.x, sonBilinenKoseler.solAlt.x);
      const maxX = Math.max(sonBilinenKoseler.sagUst.x, sonBilinenKoseler.sagAlt.x);
      const minY = Math.min(sonBilinenKoseler.solUst.y, sonBilinenKoseler.sagUst.y);
      const maxY = Math.max(sonBilinenKoseler.solAlt.y, sonBilinenKoseler.sagAlt.y);
      const genislik = maxX - minX, yukseklik = maxY - minY;
      const payX = genislik * PAY_ORANI, payY = yukseklik * PAY_ORANI;

      const x0 = Math.max(0, Math.round(minX - payX));
      const y0 = Math.max(0, Math.round(minY - payY));
      const x1 = Math.min(imageData.width, Math.round(maxX + payX));
      const y1 = Math.min(imageData.height, Math.round(maxY + payY));

      if (x1 - x0 > 20 && y1 - y0 > 20) {
        const roi = gri.roi(new cv.Rect(x0, y0, x1 - x0, y1 - y0));
        sonuc = _konturAra(roi, x0, y0, tamAlan);
        roi.delete();
      }
    }

    // ---- Takip başarısızsa (ya da hiç önceki köşe yoksa) TAM KARE araması ----
    if (!sonuc) {
      sonuc = _konturAra(gri, 0, 0, tamAlan);
    }
  } finally {
    src.delete();
    gri.delete();
  }

  return sonuc || {};
}
