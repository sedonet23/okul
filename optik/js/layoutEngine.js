const A4 = { width: 210, height: 297 };

// Köşe karesi boyutu/payı — hem hizalamaIsaretleriEkle hem de
// sayfaCercevesiHesapla aynı sabitleri kullanmalı (çerçeve çizgisi köşe
// karelerinin TAM ORTASINDAN geçsin, görsel + algoritmik olarak "bağlı"
// olsun diye). BURADA (dosyanın en başında) tanımlı olmalı — bu sabitler
// modül yüklenirken hemen çalışan SABIT_SABLONLAR.lgs = lgsSablonuOlustur()
// gibi kodlardan kullanılıyor; const hoist edilmediğinden daha aşağıda
// tanımlanırlarsa "başlatılmadan erişim" hatası oluşuyordu.
const HIZALAMA_MARKER_BOYUT = 4; // mm, dolu kare
const HIZALAMA_PAY = 4; // mm, sayfa/bölge kenarından köşe karesine mesafe

// Köşe karesinin (HIZALAMA_PAY..HIZALAMA_PAY+HIZALAMA_MARKER_BOYUT aralığı,
// yani burada 4-8mm) içeriğe (başlık kutusu, çerçeve çizgisi) DEĞMEMESİ için
// gereken minimum kenar payı. miniHeaderOlustur bunu zaten KOSE_GUVENLI_PAY
// adıyla hesaplıyordu; standartHeaderOlustur (LGS/bursluluk sabit şablonları)
// ise sabit 8mm kullanıyordu — köşe karesinin sağ/alt kenarıyla TAM aynı
// noktada bittiği için başlık kutusu ile köşe karesi/çerçeve çizgisi görsel
// olarak iç içe giriyordu (gözlemlenen hata). Artık HER İKİ header
// üretici de bu ortak, güvenli payı kullanıyor.
const KOSE_GUVENLI_PAY = HIZALAMA_PAY + HIZALAMA_MARKER_BOYUT + 1; // = 9mm

/**
 * Her mini-form için 4 köşe hizalama işareti (fiducial marker) koordinatı.
 * Bunlar OMR okuma sırasında perspektif düzeltme için kritik referans noktalarıdır.
 */
function hizalamaIsaretleriEkle(bolge) {
  const MARKER_BOYUT = HIZALAMA_MARKER_BOYUT;
  // ÖNEMLİ: çoğu yazıcı/fotokopi kenara çok yakın alanı basamaz
  // (yazdırılamayan kenar payı — özellikle SAYFANIN ALT kenarında, kağıt
  // besleme mekanizması yüzünden diğer kenarlardan daha büyük olabilir).
  // PAY çok küçükse (eski değer: 2mm) köşe kareleri bu basılamayan
  // bölgeye düşüp kırpılabiliyor. 4mm, çoğu yazıcının garantili basılabilir
  // alanının içinde kalırken köşe içeriğiyle (KENAR_PAY=8mm) çakışmıyor.
  const PAY = HIZALAMA_PAY;
  return [
    { x: bolge.x + PAY, y: bolge.y + PAY, boyut: MARKER_BOYUT, konum: 'sol-ust' },
    { x: bolge.x + bolge.width - PAY - MARKER_BOYUT, y: bolge.y + PAY, boyut: MARKER_BOYUT, konum: 'sag-ust' },
    { x: bolge.x + PAY, y: bolge.y + bolge.height - PAY - MARKER_BOYUT, boyut: MARKER_BOYUT, konum: 'sol-alt' },
    { x: bolge.x + bolge.width - PAY - MARKER_BOYUT, y: bolge.y + bolge.height - PAY - MARKER_BOYUT, boyut: MARKER_BOYUT, konum: 'sag-alt' },
  ];
}

/**
 * 4 köşe karesini birbirine bağlayan ince dış çerçeve çizgisinin
 * koordinatlarını hesaplar — çizgi, köşe karelerinin TAM ORTASINDAN
 * geçer (görsel olarak "kareler çizgiye bağlı" algısı verir, ve OMR
 * tarafında kenar/çizgi tabanlı köşe tespitine sağlam bir referans
 * sağlar — bkz. omrEngine.js kenarCizgisiIleKoseBul).
 */
function sayfaCercevesiHesapla(bolge) {
  const yarim = HIZALAMA_MARKER_BOYUT / 2;
  const kenar = HIZALAMA_PAY + yarim;
  return {
    x: bolge.x + kenar,
    y: bolge.y + kenar,
    width: bolge.width - 2 * kenar,
    height: bolge.height - 2 * kenar,
  };
}

// Sabit sınavlar için önceden hazırlanmış şablonlar buraya eklenecek.
// (LGS / bursluluk gibi resmi formatları birebir MEB şablonlarına göre
// siz onaylayınca dolduracağız — şimdilik dinamik motor üzerinde duruyoruz.)
const SABIT_SABLONLAR = {
  // lgs: { ... },
  // bursluluk: { ... },
};

/**
 * FORM KODU — kağıdın HANGİ optik form şablonuyla üretildiğini (LGS /
 * Bursluluk / Özel) OMR ile doğrulamak için kullanılan, öğrencinin
 * doldurmadığı, PDF üretilirken OTOMATİK önceden işaretlenen (bkz.
 * pdfFormGenerator.js: formKoduAlaniCiz) küçük bir baloncuk bloğu.
 * Amaç: seçili sınavdan farklı bir optik form kağıdının yanlışlıkla
 * (o sınavın şablonuymuş gibi) okunmasını engellemek — bkz.
 * omrEngine.js: formKoduOku, formOkuyucu.js: form kodu doğrulaması.
 * Her şablon SABİT bir harfe karşılık gelir (kitapcikAlaniHesapla'daki
 * A/B/C... baloncuklarıyla aynı geometri, secenekSayisi=3 sabit).
 */
const FORM_KODU_HARFLERI = { lgs: 'A', bursluluk: 'B', ozel: 'C' };
function formKoduHarfiGetir(sinavTuru) {
  return FORM_KODU_HARFLERI[sinavTuru] || 'C';
}

/**
 * Sayfayı (A4 dikey ya da yatay) istenen forma-sayısına göre alt bölgelere ayırır.
 * @param {1|2|4|6} formsPerA4
 * @param {{width:number,height:number}} [sayfaBoyutu] - varsayılan A4 dikey; yatay için {width:297,height:210} verin.
 * @returns {Array<{x:number,y:number,width:number,height:number}>}
 */
function sayfayiBol(formsPerA4, sayfaBoyutu = A4) {
  const bolgeler = [];
  let cols, rows;

  switch (formsPerA4) {
    case 1: cols = 1; rows = 1; break;
    case 2: cols = 1; rows = 2; break; // üst / alt yarı
    case 4: cols = 2; rows = 2; break;
    case 6: cols = 2; rows = 3; break;
    default:
      throw new Error(`Desteklenmeyen sayfaDuzeni: ${formsPerA4}`);
  }

  const kesimBosluk = 4; // mm, kesim çizgisi için pay
  const bolgeWidth = (sayfaBoyutu.width - kesimBosluk * (cols + 1)) / cols;
  const bolgeHeight = (sayfaBoyutu.height - kesimBosluk * (rows + 1)) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      bolgeler.push({
        x: kesimBosluk + c * (bolgeWidth + kesimBosluk),
        y: kesimBosluk + r * (bolgeHeight + kesimBosluk),
        width: bolgeWidth,
        height: bolgeHeight,
      });
    }
  }
  return bolgeler;
}

// Baloncuk çapı SABİTTİR — güvenilir telefon kamerası okuması için asla küçültülmez.
// Bunun yerine soru sayısı arttıkça blok sayısı (yan yana soru sütunu grubu) artırılır.
const BALONCUK_CAP = 4.2; // mm
const IZIN_VERILEN_BLOK_SAYILARI = [1, 2, 4, 6];

/**
 * Tek bir mini-form bölgesi içinde soru/şık ızgarasını hesaplar.
 * Baloncuk boyutu sabit kalır; soru sayısı fazla geldikçe blok sayısı
 * (1 -> 2 -> 4 -> 6) artırılarak sığdırma denenir.
 */
function formIcinIzgaraHesapla(bolge, soruSayisi, sikSayisi, headerYukseklik) {
  const HEADER_YUKSEKLIK = headerYukseklik;
  const KENAR_PAY = 3; // mm

  const usableWidth = bolge.width - KENAR_PAY * 2;
  const usableHeight = bolge.height - HEADER_YUKSEKLIK - KENAR_PAY * 2;

  const baloncukCap = BALONCUK_CAP;
  const satirAraligi = baloncukCap * 2.1; // soru numarası + baloncuk satırı yüksekliği
  const maxSatirPerBlokTeorik = Math.max(1, Math.floor(usableHeight / satirAraligi));
  const soruNoGenisligi = 8;
  const blokGenisligi = soruNoGenisligi + sikSayisi * (baloncukCap * 1.8);
  const blokBosluk = 4;

  let secilenBlokSayisi = null;
  let maxSatirPerBlok = null;

  for (const blokSayisiAday of IZIN_VERILEN_BLOK_SAYILARI) {
    const gerekenToplamGenislik = blokSayisiAday * blokGenisligi + (blokSayisiAday - 1) * blokBosluk;
    const kapasite = blokSayisiAday * maxSatirPerBlokTeorik;

    if (gerekenToplamGenislik <= usableWidth && kapasite >= soruSayisi) {
      secilenBlokSayisi = blokSayisiAday;
      maxSatirPerBlok = Math.ceil(soruSayisi / blokSayisiAday);
      break;
    }
  }

  if (secilenBlokSayisi === null) {
    throw new Error(
      `Bu mini-form (${bolge.width.toFixed(0)}x${bolge.height.toFixed(0)}mm) ${soruSayisi} soru / ${sikSayisi} ` +
      `şıkkı, sabit ${baloncukCap}mm baloncuk boyutuyla ve izin verilen maksimum 6 blokla sığdıramıyor. ` +
      `Sayfa düzenini azaltın (ör. 6 yerine 4 veya 2 form/A4) ya da soru sayısını gözden geçirin.`
    );
  }

  const blokSayisi = secilenBlokSayisi;

  // Koordinat haritasını üret
  const sorular = [];

  for (let q = 0; q < soruSayisi; q++) {
    const blokIndex = Math.floor(q / maxSatirPerBlok);
    const satirIndex = q % maxSatirPerBlok;

    const blokX = bolge.x + KENAR_PAY + blokIndex * (blokGenisligi + blokBosluk);
    const satirY = bolge.y + HEADER_YUKSEKLIK + KENAR_PAY + satirIndex * satirAraligi;

    const sikler = [];
    for (let s = 0; s < sikSayisi; s++) {
      sikler.push({
        harf: String.fromCharCode(65 + s), // A, B, C, D, E
        cx: blokX + soruNoGenisligi + s * (baloncukCap * 1.8) + baloncukCap / 2,
        cy: satirY + baloncukCap / 2,
        r: baloncukCap / 2,
      });
    }

    sorular.push({
      soruNo: q + 1,
      // Soru numarası, eskiden blokX'te (bloğun sol dış kenarında) basılıyordu
      // — bu da rakamın baloncuklardan görsel olarak kopuk, sayfanın soluna
      // yapışık durmasına yol açıyordu. Artık dersSutunuHesapla ile aynı
      // mantıkla, kendisine ayrılan soruNoGenisligi sütununun ORTASINDA.
      etiketX: blokX + soruNoGenisligi * 0.5,
      etiketY: satirY + baloncukCap * 0.8,
      sikler,
    });
  }

  return {
    baloncukCap,
    blokSayisi,
    maxSatirPerBlok,
    sorular,
    headerAlani: {
      x: bolge.x + KENAR_PAY,
      y: bolge.y + KENAR_PAY,
      width: bolge.width - KENAR_PAY * 2,
      height: HEADER_YUKSEKLIK,
    },
  };
}

/**
 * Küçük mini-formlar (2/4/6'lı düzen) için TAM header'ı (Ad Soyad, Öğrenci No,
 * Sınıf, Kitapçık Türü, QR) bölgenin kendi boyutuna ORANTILI olarak üretir.
 * Böylece 6'lı düzende bile aynı bilgi alanları bulunur, sadece küçülmüş olur.
 */
function miniHeaderOlustur(bolge, baslikMetni) {
  // KENAR_PAY, sayfa köşe işaretini/çerçeve çizgisini (bkz. HIZALAMA_PAY +
  // HIZALAMA_MARKER_BOYUT, sayfanın en başındaki sabitler) KESİNLİKLE
  // GEÇMEMELİ — eskiden salt bölge genişliğinin bir yüzdesiydi ve küçük
  // mini-formlarda (ör. 2/4'lü düzen) bu köşe karesinden DAHA KÜÇÜK
  // çıkabiliyordu, bu da "Ad Soyad/Kitapçık" içeriğinin köşe karesiyle/
  // çerçeve çizgisiyle üst üste binmesine (görsel bozulmaya) yol açıyordu.
  const KENAR_PAY = Math.max(KOSE_GUVENLI_PAY, bolge.width * 0.018);
  // Dikey oranlar da eskisine göre biraz daha SIKI (kompakt) — soru
  // ızgarasına daha fazla yer kalsın, başlık alanı gereğinden şişkin
  // durmasın diye üst sınır da eklendi.
  const baslikYukseklik = Math.min(7, Math.max(3, bolge.height * 0.03));

  const genislik = bolge.width - KENAR_PAY * 2;

  const adSoyadYukseklik = Math.min(7, Math.max(4, bolge.height * 0.038));
  const satirBosluk = Math.min(2, Math.max(0.8, bolge.height * 0.005));
  const bilgiSatiriYukseklik = Math.min(6, Math.max(3.5, bolge.height * 0.032));

  const adSoyadY = bolge.y + baslikYukseklik + satirBosluk;
  const bilgiSatiriY = adSoyadY + adSoyadYukseklik + satirBosluk;

  const kutuBosluk = Math.max(0.8, genislik * 0.02);
  const kutuGenislik = (genislik - kutuBosluk) / 2;

  // Kitapçık + Numara: Ad Soyad / Öğrenci No / Sınıf satırlarının ALTINA,
  // YATAY bir şerit halinde (QR'nin eskiden durduğu yerin YERİNE geçiyor —
  // bkz. proje notları, QR tamamen kaldırıldı). Mini-formlar küçük
  // olabildiğinden baloncuklar "olcek" ile küçültülüyor.
  // Referans tasarımlarda (testplus.top) K+Numara baloncukları net/okunaklı
  // boyutta — küçültülmüş versiyon çok sıkışık duruyordu. Artık tam boyut
  // kullanılıyor; sığmayan sayfa düzenleri zaten sayfaDuzeniOner tarafından
  // otomatik elenip daha az form/sayfa'ya düşülüyor (mevcut mekanizma).
  const olcek = 1;
  const kimlikY = bilgiSatiriY + bilgiSatiriYukseklik + satirBosluk;
  const kitapcikAlani = kitapcikAlaniHesapla(bolge.x + KENAR_PAY, kimlikY, 4, olcek);
  const numaraAlani = numaraAlaniHesapla(
    bolge.x + KENAR_PAY + kitapcikAlani.genislik + KENAR_PAY,
    kimlikY,
    4,
    olcek,
    'yatay'
  );
  const kimlikYukseklik = Math.max(kitapcikAlani.height, numaraAlani.height);

  const toplamYukseklik = (kimlikY + kimlikYukseklik) - bolge.y + satirBosluk;

  return {
    baslikAlani: { x: bolge.x + KENAR_PAY, y: bolge.y, width: genislik, height: baslikYukseklik },
    adSoyadAlani: { x: bolge.x + KENAR_PAY, y: adSoyadY, width: genislik, height: adSoyadYukseklik },
    bilgiSatiri: {
      ogrenciNoAlani: { x: bolge.x + KENAR_PAY, y: bilgiSatiriY, width: kutuGenislik, height: bilgiSatiriYukseklik },
      sinifAlani: { x: bolge.x + KENAR_PAY + kutuGenislik + kutuBosluk, y: bilgiSatiriY, width: kutuGenislik, height: bilgiSatiriYukseklik },
    },
    kitapcikAlani,
    numaraAlani,
    baslikMetni,
    toplamYukseklik,
  };
}

/**
 * Uzun ders adlarını sütun genişliğine göre satırlara böler (kaba tahmin,
 * ortalama harf genişliği üzerinden). PDF/önizleme çiziminde de aynı
 * satırlar kullanılmalı — burada üretilip layout'a gömülüyor.
 */
function metniSatirlaraBol(metin, genislikMm, fontPt, kalin = true) {
  const harfGenisligi = fontPt * 0.3528 * (kalin ? 0.62 : 0.56);
  const maxKarakter = Math.max(4, Math.floor(genislikMm / harfGenisligi));
  if (metin.length <= maxKarakter) return [metin];

  const kelimeler = metin.split(' ');
  const satirlar = [];
  let mevcut = '';
  for (const kelime of kelimeler) {
    const aday = mevcut ? `${mevcut} ${kelime}` : kelime;
    if (aday.length <= maxKarakter) {
      mevcut = aday;
    } else {
      if (mevcut) satirlar.push(mevcut);
      mevcut = kelime;
    }
  }
  if (mevcut) satirlar.push(mevcut);
  return satirlar;
}

/**
 * Tek bir ders sütununu (ör. "Türkçe 1-20") hesaplar.
 * Sabit şablonlarda (LGS, bursluluk) her ders kendi 1'den başlayan
 * numaralandırmasına sahiptir — bu yüzden genel blok mantığından ayrı,
 * özel bir sütun hesaplayıcı kullanılır.
 *
 * baslikYuksekligi dışarıdan verilir (grup içindeki TÜM dersler aynı
 * yüksekliği kullanmalı, yoksa satırlar yatayda hizasız görünür).
 */
function dersSutunuHesapla({
  x, y, width, dersAdi, soruSayisi, sikSayisi, baloncukCap,
  soruNoGenisligi = 8, aralikCarpani = 1.45, baslikYuksekligi,
  baslikFontPt = 6.4, baslikAltBosluk = 3,
}) {
  const dersAdiSatirlari = metniSatirlaraBol(dersAdi, width - 2, baslikFontPt, true);
  const satirAraligi = baloncukCap * 2.0;
  const sorular = [];

  for (let q = 0; q < soruSayisi; q++) {
    const satirY = y + baslikYuksekligi + baslikAltBosluk + q * satirAraligi;
    const sikler = [];
    for (let s = 0; s < sikSayisi; s++) {
      sikler.push({
        harf: String.fromCharCode(65 + s),
        cx: x + soruNoGenisligi + s * (baloncukCap * aralikCarpani) + baloncukCap / 2,
        cy: satirY + baloncukCap / 2,
        r: baloncukCap / 2,
      });
    }
    sorular.push({
      soruNo: q + 1,
      // Soru numarası artık kenardan belirgin şekilde içeride ve ortalanabilir bir alanda
      etiketX: x + soruNoGenisligi * 0.5,
      etiketY: satirY + baloncukCap * 0.8,
      sikler,
    });
  }

  return {
    dersAdi,
    dersAdiSatirlari,
    x, y, width,
    baslikYuksekligi,
    satirAraligi,
    toplamYukseklik: baslikYuksekligi + baslikAltBosluk + soruSayisi * satirAraligi,
    sorular,
    yerelCerceve: sutunCerceveHesapla({ x, width, sorular, baloncukCap }),
  };
}

/**
 * Bir ders sütununun baloncuk alanını (1. sorudan son soruya kadar) SIKI
 * biçimde saran, ince siyah kenarlıklı bir dikdörtgen (kutu) üretir.
 *
 * AMAÇ: Sayfanın tamamı için tek bir homografi (4 köşe) her zaman yeterli
 * olmuyor — kağıt farklı bölgelerde farklı derecede eğrilip bombeleşebiliyor
 * (tarama/fotoğraflama sırasında). Bu yüzden her ders sütunu, kendi dikey
 * VE yatay ölçek/kaymasını bağımsız hesaplayabilmesi için kendi yerel
 * referans çerçevesine sahip olmalı.
 *
 * Önceki tasarımda (küçük kareler) sadece 2 nokta vardı; kutu tasarımında
 * 4 kenar (üst/alt/sol/sağ) olduğu için hem y hem x ekseninde AYRI ayrı
 * ölçek+kayma hesaplanabiliyor — ayrıca ince bir çizgi, küçük bir kareden
 * çok daha fazla piksele yayıldığı için bulanık/düşük çözünürlüklü
 * fotoğraflarda tespiti daha sağlam.
 *
 * Kutu, sütunün TAM x aralığını (soru no + tüm şıklar) ve 1. sorudan son
 * soruya kadar olan y aralığını kapsar; küçük bir PAY ile baloncuklara
 * değmeden dışında kalır.
 */
function sutunCerceveHesapla({ x, width, sorular, baloncukCap }) {
  const PAY = 1.0; // mm — kutu çizgisinin üst/altta baloncuklara değmemesi için boşluk
  // Yatayda daha büyük bir pay kullanılıyor: genel ızgara çerçevesinin köşe
  // KARELERİ (bkz. genelIzgaraCercevesiHesapla) tam bu kutunun köşelerine
  // oturuyor — yatay pay yetersiz olursa (eskiden 0'dı) en dıştaki sütunun
  // son şıkkıyla (ör. D) neredeyse iç içe giriyordu (gözlemlenen hata).
  const PAY_YATAY = 2.2; // mm
  const ilkSoru = sorular[0];
  const sonSoru = sorular[sorular.length - 1];
  const ustY = ilkSoru.sikler[0].cy - baloncukCap / 2 - PAY;
  const altY = sonSoru.sikler[0].cy + baloncukCap / 2 + PAY;
  return {
    kutu: { x: x - PAY_YATAY, y: ustY, width: width + 2 * PAY_YATAY, height: altY - ustY },
  };
}

/**
 * TÜM ders sütunlarını (sözel + sayısal, tüm gruplar) TEK bir dikdörtgende
 * saran genel ızgara çerçevesi — bkz. genelIzgaraCercevesiCiz /
 * genelDuzeltmeHesapla.
 *
 * NEDEN (v3 — sütun bazlı köşelerden vazgeçildi): Her ders sütununun kendi
 * köşe işaretleri olması FİKREN doğruydu ama pratikte sütunlar arası boşluk
 * (~3mm) çok dar olduğu için komşu sütunun köşe karesiyle sürekli karışıyordu
 * (pencere daraltılsa da, küçültülse de). TEK bir büyük çerçeve — sayfanın
 * global 4 köşesiyle AYNI kanıtlanmış mantık, ama sayfanın tamamı yerine
 * sadece bubble ızgarasını kapsayan — hem bu karışma riskini TAMAMEN ortadan
 * kaldırıyor (izole, tek set köşe) hem de global köşelerden daha YAKIN
 * olduğu için (ızgaranın dışında kalan header/QR alanını atlıyor) daha
 * isabetli bir düzeltme sağlıyor.
 */
function genelIzgaraCercevesiHesapla(bolumler) {
  const tumSutunlar = [];
  bolumler.forEach((b) => b.dersSutunlari.forEach((d) => tumSutunlar.push(d)));

  const solX = Math.min(...tumSutunlar.map((d) => d.yerelCerceve.kutu.x));
  const sagX = Math.max(...tumSutunlar.map((d) => d.yerelCerceve.kutu.x + d.yerelCerceve.kutu.width));
  const ustY = Math.min(...tumSutunlar.map((d) => d.yerelCerceve.kutu.y));
  const altY = Math.max(...tumSutunlar.map((d) => d.yerelCerceve.kutu.y + d.yerelCerceve.kutu.height));

  return {
    kutu: { x: solX, y: ustY, width: sagX - solX, height: altY - ustY },
    // Global hizalama işaretleriyle (MARKER_BOYUT=4mm) aynı boyut — artık
    // komşu bir köşeye ~3mm mesafede değil, izole, o yüzden büyük/güvenilir
    // tutulabiliyor.
    koseBoyut: 4,
    koseler: {
      solUst: { x: solX, y: ustY },
      sagUst: { x: sagX, y: ustY },
      solAlt: { x: solX, y: altY },
      sagAlt: { x: sagX, y: altY },
    },
  };
}


/**
 * Birden fazla ders sütununu, aralarında grup boşlukları bırakarak
 * yan yana yerleştirir. `gruplar` = [{ baslik, dersler: [{ad, soruSayisi}] }, ...]
 *
 * Dikey yerleşim: [grupBaslikY, grupBaslikY+GRUP_BASLIK_YUKSEKLIK] = grup başlığı şeridi
 *                 sonra GRUP_BASLIK_BOSLUK mm boşluk
 *                 sonra ders sütunları başlar (dersSutunY)
 * Bu değerler önizleme/PDF çiziminde tekrar HESAPLANMAZ, doğrudan buradan okunur.
 */
function cokluBolumYerlestir({ x, y, gruplar, sikSayisi, baloncukCap, sutunGenisligi, sutunBosluk = 3, grupBosluk = 7, grupBasligiGoster = true }) {
  const GRUP_BASLIK_YUKSEKLIK = grupBasligiGoster ? 7 : 0;
  const GRUP_BASLIK_BOSLUK = grupBasligiGoster ? 3 : 0; // grup başlığı ile ders başlıkları arasındaki net boşluk
  const BASLIK_FONT_PT = 6.4;
  const TEK_SATIR_YUKSEKLIK = 6;
  const SATIR_BASINA_EK = 3.8; // 2. (ve sonraki) satır için ek yükseklik

  // Önce TÜM derslerin kaç satıra ihtiyaç duyduğunu hesapla, en büyüğünü bul.
  // Böylece bir gruptaki (ör. Sözel Bölüm) her ders aynı başlık yüksekliğini
  // kullanır ve soru satırları yatayda tam hizalı kalır.
  let maxSatirSayisi = 1;
  gruplar.forEach((grup) => {
    grup.dersler.forEach((ders) => {
      const satirlar = metniSatirlaraBol(ders.ad, sutunGenisligi - 2, BASLIK_FONT_PT, true);
      maxSatirSayisi = Math.max(maxSatirSayisi, satirlar.length);
    });
  });
  const ortakBaslikYuksekligi = TEK_SATIR_YUKSEKLIK + (maxSatirSayisi - 1) * SATIR_BASINA_EK;

  const dersSutunY = y + GRUP_BASLIK_YUKSEKLIK + GRUP_BASLIK_BOSLUK;

  const sonuclar = [];
  let cursorX = x;

  gruplar.forEach((grup) => {
    const grupBaslangicX = cursorX;
    const dersSutunlari = grup.dersler.map((ders) => {
      const sutun = dersSutunuHesapla({
        x: cursorX,
        y: dersSutunY,
        width: sutunGenisligi,
        dersAdi: ders.ad,
        soruSayisi: ders.soruSayisi,
        sikSayisi,
        baloncukCap,
        baslikYuksekligi: ortakBaslikYuksekligi,
        baslikFontPt: BASLIK_FONT_PT,
      });
      cursorX += sutunGenisligi + sutunBosluk;
      return sutun;
    });
    cursorX += grupBosluk - sutunBosluk;
    sonuclar.push({
      baslik: grup.baslik,
      x: grupBaslangicX,
      genislik: dersSutunlari[dersSutunlari.length - 1].x + dersSutunlari[dersSutunlari.length - 1].width - grupBaslangicX,
      baslikY: y,
      baslikYukseklik: GRUP_BASLIK_YUKSEKLIK,
      dersSutunlari,
    });
  });

  return sonuclar;
}

/**
 * "Kitapçık Türü" baloncuk bloğu: tek sütun, A/B/C/D (veya daha fazla)
 * alt alta dizilmiş daireler. testplus.top örnek formlarındaki "K"
 * sütununun karşılığı.
 */
function kitapcikAlaniHesapla(x, y, secenekSayisi = 4, olcek = 1) {
  const hucreYukseklik = 6 * olcek;
  const baslikYukseklik = 5 * olcek;
  const baloncukYaricap = 2 * olcek;
  const genislik = baloncukYaricap * 2 + 2 * olcek;

  const secenekler = [];
  for (let i = 0; i < secenekSayisi; i++) {
    secenekler.push({
      harf: String.fromCharCode(65 + i),
      cx: x + genislik / 2,
      cy: y + baslikYukseklik + i * hucreYukseklik + hucreYukseklik / 2,
      r: baloncukYaricap,
    });
  }

  return {
    x, y,
    genislik,
    baslikYukseklik,
    height: baslikYukseklik + secenekSayisi * hucreYukseklik,
    secenekler,
  };
}

/**
 * "Numara" (öğrenci no) baloncuk ızgarası: her basamak için ayrı bir sütun,
 * her sütunda 0-9 alt alta. QR kodunun YERİNİ alıyor — öğrenci kimliği
 * artık bir QR payload'ından değil, bu ızgaradaki en koyu baloncuklardan
 * (her sütunda bir tane) okunuyor. testplus.top örnek formlarındaki
 * "Numara" bloğunun karşılığı.
 */
/**
 * @param {'dikey'|'yatay'} yon - 'dikey' (varsayılan, LGS/Bursluluk'un sol
 *   blokta kullandığı): her basamak bir SÜTUN, 0-9 dikey sıralanır (dar/uzun).
 *   'yatay' (testplus.top referans tasarımı, mini/özel formlarda kullanılan):
 *   her basamak bir SATIR, 0-9 o satırda yan yana sıralanır (geniş/kısa) —
 *   K bloğuyla aynı satır yüksekliğinde hizalanıp yan yana yerleşebilsin diye.
 */
function numaraAlaniHesapla(x, y, basamakSayisi = 4, olcek = 1, yon = 'dikey') {
  const hucreGenislik = 6 * olcek;
  const hucreYukseklik = (yon === 'yatay') ? 6 * olcek : 5 * olcek;
  const baslikYukseklik = 5 * olcek;
  const baloncukYaricap = 2 * olcek;

  const basamaklar = [];

  if (yon === 'yatay') {
    for (let d = 0; d < basamakSayisi; d++) {
      const rowY = y + baslikYukseklik + d * hucreYukseklik + hucreYukseklik / 2;
      const bubbles = [];
      for (let v = 0; v <= 9; v++) {
        bubbles.push({
          deger: v,
          cx: x + v * hucreGenislik + hucreGenislik / 2,
          cy: rowY,
          r: baloncukYaricap,
        });
      }
      basamaklar.push({ index: d, y: rowY, bubbles });
    }

    return {
      x, y,
      basamakSayisi,
      hucreGenislik,
      hucreYukseklik,
      baslikYukseklik,
      width: 10 * hucreGenislik,
      height: baslikYukseklik + basamakSayisi * hucreYukseklik,
      basamaklar,
    };
  }

  for (let d = 0; d < basamakSayisi; d++) {
    const digitX = x + d * hucreGenislik + hucreGenislik / 2;
    const bubbles = [];
    for (let v = 0; v <= 9; v++) {
      bubbles.push({
        deger: v,
        cx: digitX,
        cy: y + baslikYukseklik + v * hucreYukseklik + hucreYukseklik / 2,
        r: baloncukYaricap,
      });
    }
    basamaklar.push({ index: d, x: digitX, bubbles });
  }

  return {
    x, y,
    basamakSayisi,
    hucreGenislik,
    hucreYukseklik,
    baslikYukseklik,
    width: basamakSayisi * hucreGenislik,
    height: baslikYukseklik + 10 * hucreYukseklik,
    basamaklar,
  };
}

/**
 * Ad Soyad / Öğrenci No / Sınıf / Kitapçık Türü / Sınav Adı alanlarını
 * içeren standart header'ı üretir. LGS ve bursluluk gibi tüm sabit şablonlar
 * bunu ortak kullanır — tek yerden değişir, hepsinde tutarlı kalır.
 *
 * NOT: QR kodu kaldırıldı (bkz. proje notları — QR tabanlı kaba homografi
 * kırılgan çıktı). Kimlik artık Kitapçık+Numara baloncuk bloğundan (ayrıca
 * hesaplanıp soru sütunlarının SOLUNA yerleştiriliyor, bkz. lgsSablonuOlustur/
 * burslulukSablonuOlustur) okunuyor — bu yüzden header artık sadece metin
 * alanlarından oluşuyor, bir "yan alan"a (QR'ye) yer ayırmıyor.
 */
function standartHeaderOlustur(KENAR_PAY, baslikMetni, opsiyonlar = {}) {
  const {
    bilgiSatiriOran = 1, // bilgi satırının toplam genislige orani (daraltmak icin < 1)
  } = opsiyonlar;

  const genislik = A4.width - KENAR_PAY * 2;

  // Ad Soyad / Öğrenci No / Sınıf artık TEK satırda: Ad Soyad geniş, Öğrenci
  // No ve Sınıf ondan daha dar iki kutu olarak yanına diziliyor.
  const satirGenisligi = genislik * bilgiSatiriOran;
  const kutuBosluk = 3;
  const adSoyadGenislik = satirGenisligi * 0.5;
  const digerKutuGenislik = (satirGenisligi - adSoyadGenislik - kutuBosluk * 2) / 2;
  const bilgiSatiriY = KENAR_PAY + 16;
  const bilgiSatiriYukseklik = 13;

  return {
    adSoyadAlani: { x: KENAR_PAY, y: bilgiSatiriY, width: adSoyadGenislik, height: bilgiSatiriYukseklik },
    bilgiSatiri: {
      ogrenciNoAlani: { x: KENAR_PAY + adSoyadGenislik + kutuBosluk, y: bilgiSatiriY, width: digerKutuGenislik, height: bilgiSatiriYukseklik },
      sinifAlani: { x: KENAR_PAY + adSoyadGenislik + kutuBosluk * 2 + digerKutuGenislik, y: bilgiSatiriY, width: digerKutuGenislik, height: bilgiSatiriYukseklik },
    },
    sinavAdiAlani: { x: KENAR_PAY, y: bilgiSatiriY + bilgiSatiriYukseklik + 2, width: genislik, height: 12 },
    baslikAlani: { x: KENAR_PAY, y: KENAR_PAY, width: A4.width - KENAR_PAY * 2, height: 13 },
    baslikMetni,
  };
}
const HEADER_TOPLAM_YUKSEKLIK = 45; // standartHeaderOlustur ile uyumlu sabit

// Soru sütunlarının SOLUNA yerleştirilen Kitapçık+Numara bloğu için
// ayrılan sabit genişlik/boşluk (bkz. lgsSablonuOlustur, burslulukSablonuOlustur).
const SOL_BLOK_GENISLIK = 24;
const SOL_BLOK_BOSLUK = 4;


/**
 * LGS sabit şablonunu üretir. Tek A4, tek form (sayfaDuzeni her zaman 1).
 * Kimlik doğrulama sadece QR ile yapılır — manuel baloncuk kimlik alanı YOK.
 */
function lgsSablonuOlustur() {
  // ÖNEMLİ: bu değer eskiden sabit 8mm'ydi — köşe hizalama karesi
  // HIZALAMA_PAY(4mm)..HIZALAMA_PAY+HIZALAMA_MARKER_BOYUT(8mm) aralığında
  // bittiği için, başlık kutusu (KENAR_PAY'den başlıyor) tam o noktadan
  // başlıyor ve köşe karesiyle/çerçeve çizgisiyle görsel olarak iç içe
  // giriyordu (gözlemlenen hata). KOSE_GUVENLI_PAY (9mm) kullanılarak en az
  // 1mm boşluk garanti ediliyor — bkz. sayfanın başındaki sabit tanımı.
  const KENAR_PAY = KOSE_GUVENLI_PAY;
  const HEADER_YUKSEKLIK = HEADER_TOPLAM_YUKSEKLIK;
  const baloncukCap = 2.75; // 6 sütun + sol Kitapçık/Numara bloğu yan yana sığması için ayarlandı, güvenli pay bırakılarak
  const sutunGenisligi = 8 + 4 * (baloncukCap * 1.45); // soruNoGenisligi(8) + 4 şık

  const gruplar = [
    {
      baslik: 'Sözel Bölüm',
      dersler: [
        { ad: 'Türkçe', soruSayisi: 20 },
        { ad: 'İnkılap Tarihi ve Atatürkçülük', soruSayisi: 10 },
        { ad: 'Din Kültürü ve Ahlak Bilgisi', soruSayisi: 10 },
        { ad: 'İngilizce', soruSayisi: 10 },
      ],
    },
    {
      baslik: 'Sayısal Bölüm',
      dersler: [
        { ad: 'Matematik', soruSayisi: 20 },
        { ad: 'Fen Bilimleri', soruSayisi: 20 },
      ],
    },
  ];

  const bolumBaslangicY = KENAR_PAY + HEADER_YUKSEKLIK + 4;

  // Kitapçık + Numara bloğu, soru sütunlarının SOLUNA yerleşir (bkz.
  // testplus.top örnek formları — bu proje için referans alındı).
  const solBlokX = KENAR_PAY;
  const kitapcikAlani = kitapcikAlaniHesapla(solBlokX, bolumBaslangicY);
  const numaraAlani = numaraAlaniHesapla(
    solBlokX,
    kitapcikAlani.y + kitapcikAlani.height + 4,
    4
  );
  // Form Kodu: sol blokta, Numara'nın hemen altında — bkz. FORM_KODU_HARFLERI notu.
  const formKoduAlani = kitapcikAlaniHesapla(solBlokX, numaraAlani.y + numaraAlani.height + 4, 3);

  const sutunBaslangicX = KENAR_PAY + SOL_BLOK_GENISLIK + SOL_BLOK_BOSLUK;

  const bolumler = cokluBolumYerlestir({
    x: sutunBaslangicX,
    y: bolumBaslangicY,
    gruplar,
    sikSayisi: 4,
    baloncukCap,
    sutunGenisligi,
  });

  const kullanilanGenislik =
    bolumler[bolumler.length - 1].x -
    bolumler[0].x +
    bolumler[bolumler.length - 1].dersSutunlari.length * (sutunGenisligi + 3) +
    (sutunBaslangicX - KENAR_PAY);

  return {
    versiyon: 1,
    sinavTuru: 'lgs',
    soruSayisi: 90,
    sikSayisi: 4,
    sayfaDuzeni: 1,
    sayfaBoyutu: A4,
    formlar: [
      {
        formIndex: 0,
        bolge: { x: 0, y: 0, width: A4.width, height: A4.height },
        hizalamaIsaretleri: hizalamaIsaretleriEkle({ x: 0, y: 0, width: A4.width, height: A4.height }),
        sayfaCercevesi: sayfaCercevesiHesapla({ x: 0, y: 0, width: A4.width, height: A4.height }),
        ...standartHeaderOlustur(KENAR_PAY, 'LGS SINAV CEVAP KAĞIDI'),
        kitapcikAlani,
        numaraAlani,
        formKoduAlani,
        bolumler, // dinamik "izgara" yerine bölüm bazlı yapı
        genelIzgaraCercevesi: genelIzgaraCercevesiHesapla(bolumler),
        kontrol: { hesaplananToplamGenislik: kullanilanGenislik, sayfaGenisligi: A4.width },
      },
    ],
  };
}

SABIT_SABLONLAR.lgs = lgsSablonuOlustur();

/**
 * Bursluluk sınavı şablonu: 4 ders x 20 soru, 4 şıklı, TEK düz sıra
 * (Sözel/Sayısal gibi bir gruplama YOK — grup başlığı banner'ı gizli).
 */
function burslulukSablonuOlustur() {
  // bkz. lgsSablonuOlustur'daki KENAR_PAY notu — aynı köşe-karesi/başlık
  // çakışması burada da geçerliydi, aynı sabitle düzeltiliyor.
  const KENAR_PAY = KOSE_GUVENLI_PAY;
  const HEADER_YUKSEKLIK = HEADER_TOPLAM_YUKSEKLIK;
  const baloncukCap = 4.5; // sadece 4 sütun oldugu icin daha rahat/buyuk baloncuk kullanabiliyoruz
  const sutunGenisligi = 9 + 4 * (baloncukCap * 1.6); // soruNoGenisligi(9) + 4 şık
  const DERS_SAYISI = 4;

  // Sütunları, sol bloğa (Kitapçık+Numara) ayrılan alan dışında kalan
  // genişliğe yayacak şekilde aralarındaki boşluğu hesapla.
  const kullanilabilirGenislik = A4.width - KENAR_PAY * 2 - SOL_BLOK_GENISLIK - SOL_BLOK_BOSLUK;
  const sutunBosluk = (kullanilabilirGenislik - DERS_SAYISI * sutunGenisligi) / (DERS_SAYISI - 1);

  const gruplar = [
    {
      baslik: '', // gruplama yok, banner gizli
      dersler: [
        { ad: 'Türkçe', soruSayisi: 20 },
        { ad: 'Matematik', soruSayisi: 20 },
        { ad: 'Fen Bilimleri', soruSayisi: 20 },
        { ad: 'Sosyal Bilgiler', soruSayisi: 20 },
      ],
    },
  ];

  const bolumBaslangicY = KENAR_PAY + HEADER_YUKSEKLIK + 4;

  const solBlokX = KENAR_PAY;
  const kitapcikAlani = kitapcikAlaniHesapla(solBlokX, bolumBaslangicY);
  const numaraAlani = numaraAlaniHesapla(
    solBlokX,
    kitapcikAlani.y + kitapcikAlani.height + 4,
    4
  );
  // Form Kodu: sol blokta, Numara'nın hemen altında — bkz. FORM_KODU_HARFLERI notu.
  const formKoduAlani = kitapcikAlaniHesapla(solBlokX, numaraAlani.y + numaraAlani.height + 4, 3);

  const sutunBaslangicX = KENAR_PAY + SOL_BLOK_GENISLIK + SOL_BLOK_BOSLUK;

  const bolumler = cokluBolumYerlestir({
    x: sutunBaslangicX,
    y: bolumBaslangicY,
    gruplar,
    sikSayisi: 4,
    baloncukCap,
    sutunGenisligi,
    sutunBosluk,
    grupBasligiGoster: false,
  });

  const dersler = bolumler[0].dersSutunlari;
  const sonKolon = dersler[dersler.length - 1]; // Sosyal Bilgiler

  const kullanilanGenislik = sonKolon.x + sonKolon.width - KENAR_PAY;

  return {
    versiyon: 1,
    sinavTuru: 'bursluluk',
    soruSayisi: 80,
    sikSayisi: 4,
    sayfaDuzeni: 1,
    sayfaBoyutu: A4,
    formlar: [
      {
        formIndex: 0,
        bolge: { x: 0, y: 0, width: A4.width, height: A4.height },
        hizalamaIsaretleri: hizalamaIsaretleriEkle({ x: 0, y: 0, width: A4.width, height: A4.height }),
        sayfaCercevesi: sayfaCercevesiHesapla({ x: 0, y: 0, width: A4.width, height: A4.height }),
        ...standartHeaderOlustur(KENAR_PAY, 'BURSLULUK SINAVI CEVAP KAĞIDI', {
          bilgiSatiriOran: 0.8, // öğrenci no / sınıf / kitapçık türü kutuları daha dar
        }),
        kitapcikAlani,
        numaraAlani,
        formKoduAlani,
        bolumler,
        genelIzgaraCercevesi: genelIzgaraCercevesiHesapla(bolumler),
        kontrol: { hesaplananToplamGenislik: kullanilanGenislik, sayfaGenisligi: A4.width },
      },
    ],
  };
}

SABIT_SABLONLAR.bursluluk = burslulukSablonuOlustur();


/**
 * Her mini-form için 4 köşe hizalama işareti (fiducial marker) koordinatı.
 * Bunlar OMR okuma sırasında perspektif düzeltme için kritik referans noktalarıdır.
 * (Sabitler ve hizalamaIsaretleriEkle/sayfaCercevesiHesapla fonksiyonları
 * dosyanın EN BAŞINA taşındı — bkz. A4 sabitinin hemen altı. Sebep: bu
 * fonksiyonlar SABIT_SABLONLAR.lgs = lgsSablonuOlustur() gibi modül
 * yüklenirken hemen çalışan kodlardan çağrılıyor; const'lar function'lar
 * gibi hoist edilmediğinden, dosyanın ortasında kalsalar "başlatılmadan
 * erişim" hatası veriyordu.)
 */

/**
 * Ana giriş noktası: bir sınav tanımından tam koordinat haritasını üretir.
 *
 * @param {Object} params
 * @param {'lgs'|'bursluluk'|'ozel'} params.sinavTuru
 * @param {number} params.soruSayisi
 * @param {number} params.sikSayisi - genelde 4 veya 5
 * @param {1|2|4|6} params.sayfaDuzeni - A4 başına form sayısı
 * @returns {Object} layout - PDF üretimi ve OMR okuma için ortak koordinat haritası
 */
/**
 * Soru sayısı ve şık sayısına göre en KAĞIT TASARRUFLU sayfa düzenini önerir.
 * 6'lıdan başlayıp sığan en büyük "form/A4" değerini döndürür (kağıttan
 * tasarruf için mümkün olduğunca çok öğrenciyi tek sayfaya sığdırmaya çalışır).
 */
function sayfaDuzeniOner(soruSayisi, sikSayisi = 4, sayfaBoyutu = A4) {
  for (const aday of [6, 4, 2, 1]) {
    try {
      const bolgeler = sayfayiBol(aday, sayfaBoyutu);
      const headerYukseklik = miniHeaderOlustur(bolgeler[0], '').toplamYukseklik;
      formIcinIzgaraHesapla(bolgeler[0], soruSayisi, sikSayisi, headerYukseklik);
      return aday; // hata fırlatmadıysa sığmış demektir
    } catch (e) {
      continue;
    }
  }
  throw new Error(`${soruSayisi} soru / ${sikSayisi} şık, hiçbir sayfa düzenine (1/2/4/6) sığmıyor.`);
}

function layoutHesapla({ sinavTuru, soruSayisi, sikSayisi = 4, sayfaDuzeni = 'otomatik', yon = 'dikey' }) {
  if (SABIT_SABLONLAR[sinavTuru]) {
    return SABIT_SABLONLAR[sinavTuru]; // sabit şablon varsa direkt onu döndür (her zaman dikey A4)
  }

  const sayfaBoyutu = yon === 'yatay' ? { width: A4.height, height: A4.width } : { width: A4.width, height: A4.height };

  const gercekSayfaDuzeni = sayfaDuzeni === 'otomatik' ? sayfaDuzeniOner(soruSayisi, sikSayisi, sayfaBoyutu) : sayfaDuzeni;
  const bolgeler = sayfayiBol(gercekSayfaDuzeni, sayfaBoyutu);
  const baslikMetni = 'CEVAP KAĞIDI';

  const formlar = bolgeler.map((bolge, index) => {
    const header = miniHeaderOlustur(bolge, baslikMetni);
    const izgara = formIcinIzgaraHesapla(bolge, soruSayisi, sikSayisi, header.toplamYukseklik);
    const hizalama = hizalamaIsaretleriEkle(bolge);
    return {
      formIndex: index, // A4 üzerindeki kaçıncı mini-form (0-tabanlı)
      bolge,
      hizalamaIsaretleri: hizalama,
      sayfaCercevesi: sayfaCercevesiHesapla(bolge),
      ...header,
      izgara,
    };
  });

  return {
    versiyon: 1,
    sinavTuru,
    soruSayisi,
    sikSayisi,
    sayfaDuzeni: gercekSayfaDuzeni,
    sayfaDuzeniOtomatikSecildi: sayfaDuzeni === 'otomatik',
    yon,
    sayfaBoyutu,
    formlar, // her biri sayfadaki bir mini-formu temsil eder
  };
}

window.LayoutEngine = {
  A4,
  layoutHesapla,
  sayfaDuzeniOner,
  lgsSablonuOlustur,
  burslulukSablonuOlustur,
  formKoduHarfiGetir,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.LayoutEngine;
}
