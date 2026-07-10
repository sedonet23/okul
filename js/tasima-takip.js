/* =============================================
   js/tasima-takip.js
   TAŞIMA TAKİP ÇİZELGESİ MODÜLÜ (salt görüntü / yazdırma)
   Bağımlılıklar: firebase-init.js, tasima.js, nobet.js, app.js

   Mimari not (bkz. docs/Pragmatik-Mimari-Tasarimi.md §2): Bu modül yalnızca
   OKUMA yapar (yazma yok), bu yüzden servis/yetki katmanı gerekmiyor.
   Yedek veri kaynağı sorgusu js/core/repositories/servis-oturma.repository.js
   üzerinden yapılır (COL.servisOturma TEK erişim noktası).
   ============================================= */

(function() {
  'use strict';

  const AY_ISIMLERI = [
    'Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
    'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'
  ];

  const GUNLER = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];

  const SABIT_LISTE_BOYU = 30; // en az 30 kişilik sabit liste

  // Durum değişkenleri
  let _servisId   = null;
  let _servis     = null;
  let _yil        = new Date().getFullYear();
  let _ay         = new Date().getMonth();
  let _ogrenciler = [];
  let _listeBoyu  = 30;

  // --- Yardımcı fonksiyonlar ---

  function _isoTarih(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // Nöbet sayfasındaki resmi tatil listesini kullan (global resmiTatiller + nobetTatilMi)
  function _isResmiTatil(iso) {
    if (typeof nobetTatilMi === 'function') {
      const t = nobetTatilMi(iso);
      return t ? (t.aciklama || 'Resmi Tatil') : null;
    }
    if (typeof resmiTatiller !== 'undefined' && Array.isArray(resmiTatiller)) {
      const t = resmiTatiller.find(x => x.tarih === iso);
      return t ? (t.aciklama || 'Resmi Tatil') : null;
    }
    return null;
  }

  // Öğrenci listesi: veliler koleksiyonu (asıl kaynak, tasima.js'deki servisDetayAc ile birebir
  // aynı sorgu) -> sınıf adı eksikse oturma planından tamamla -> hedef boyuta göre boş satır ekle
  async function _getOgrenciler(servisId) {
    let liste = [];
    const baskanIdSeti = new Set(
      (_servis && Array.isArray(_servis.baskanlar)) ? _servis.baskanlar : []
    );

    // 1. oy_veliler koleksiyonu (ana kaynak — tasima.js servisDetayAc ile aynı filtre)
    if (typeof veliler !== 'undefined') {
      const svVeliler = (typeof ogrencileriSinifSiralaSirala === 'function')
        ? ogrencileriSinifSiralaSirala(veliler.filter(v => v.servisId === servisId))
        : veliler.filter(v => v.servisId === servisId)
            .sort((a,b) => (a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));
      liste = svVeliler.map(v => {
        const sinifObj = (typeof siniflar !== 'undefined')
          ? siniflar.find(s => s.id === v.sinifId) : null;
        return { ad: v.ogrenciAdi || '', sinif: sinifObj ? sinifObj.ad : (v.sinifId || ''), baskan: baskanIdSeti.has(v.id) };
      });
    }

    // 2. veliler boşsa, yedek kaynak olarak oy_servisOturma koleksiyonuna bak
    if (!liste.length) {
      try {
        const snap = await ServisOturmaRepository.planServisIdIleGetir(servisId);
        if (!snap.empty) {
          snap.docs.forEach(doc => {
            const koltuklar = doc.data().koltuklar || {};
            Object.values(koltuklar).forEach(k => {
              if (k && k.ogrenciAdi) {
                let sinifAdi = k.sinifAdi || '';
                if (!sinifAdi && k.sinifId && typeof siniflar !== 'undefined') {
                  const sObj = siniflar.find(s => s.id === k.sinifId);
                  if (sObj) sinifAdi = sObj.ad;
                }
                liste.push({ ad: k.ogrenciAdi, sinif: sinifAdi, baskan: k.ogrenciId ? baskanIdSeti.has(k.ogrenciId) : false });
              }
            });
          });
        }
      } catch(e) {}
    }

    // Sınıf adı eksik kalanları doldurmaya çalış (isimle eşleştirerek)
    if (typeof veliler !== 'undefined' && typeof siniflar !== 'undefined') {
      liste = liste.map(o => {
        if (o.sinif) return o;
        const vMatch = veliler.find(v => (v.ogrenciAdi||'').trim() === (o.ad||'').trim());
        if (vMatch) {
          const sObj = siniflar.find(s => s.id === vMatch.sinifId);
          if (sObj) return { ...o, sinif: sObj.ad };
        }
        return o;
      });
    }

    // En az SABIT_LISTE_BOYU satır olacak şekilde boş satırlarla tamamla
    // (gerçek öğrenci sayısı daha fazlaysa liste büyütülür, her zaman çift sayıda tutulur)
    let hedefBoy = SABIT_LISTE_BOYU;
    if (liste.length > hedefBoy) {
      hedefBoy = liste.length;
      if (hedefBoy % 2 !== 0) hedefBoy++;
    }
    while (liste.length < hedefBoy) liste.push({ ad: '', sinif: '' });
    _listeBoyu = hedefBoy;

    return liste;
  }

  // Müdür ve Müdür Yardımcısı bilgilerini getir
  function _getMudurBilgileri() {
    let mudurAd = '', mudurYrdAd = '';
    if (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && typeof ogretmenler !== 'undefined') {
      const mudur = ogretmenler.find(o => o.id === okulBilgileriAyari.mudurId);
      if (mudur) mudurAd = `${mudur.ad||''} ${mudur.soyad||''}`.trim();
    }
    if (typeof ogretmenler !== 'undefined') {
      const yrd = ogretmenler.find(o => (o.unvan||'').trim() === 'Müdür Yardımcısı');
      if (yrd) mudurYrdAd = `${yrd.ad||''} ${yrd.soyad||''}`.trim();
    }
    return { mudurAd, mudurYrdAd };
  }

  // --- HTML üretimi (önizleme penceresinde kullanılacak tam sayfa) ---

  function _ogrenciGridHtml() {
    const yarisi = Math.ceil(_listeBoyu / 2);
    const sol    = _ogrenciler.slice(0, yarisi);
    const sag    = _ogrenciler.slice(yarisi, _listeBoyu);

    function kolHtml(liste, baslangic) {
      return `<table class="tt-ogr-tablo">
        <thead><tr><th class="tt-ogr-sira">SIRA</th><th>ÖĞRENCİ ADI SOYADI</th><th class="tt-ogr-sinif">SINIF</th></tr></thead>
        <tbody>
        ${liste.map((o,i) => `
        <tr>
          <td class="tt-ogr-sira">${baslangic+i+1}</td>
          <td class="tt-ogr-ad">${o.baskan ? '👑 ' : ''}${escapeHtml(o.ad||'')}</td>
          <td class="tt-ogr-sinif">${escapeHtml(o.sinif||'')}</td>
        </tr>`).join('')}
        </tbody>
      </table>`;
    }
    return `<table class="tt-ogrenci-disgrid"><tr>
      <td class="tt-ogr-hucre">${kolHtml(sol, 0)}</td>
      <td class="tt-ogr-hucre">${kolHtml(sag, yarisi)}</td>
    </tr></table>`;
  }

  function _tabloSatirlariHtml() {
    const sonGun = new Date(_yil, _ay+1, 0).getDate();
    let html = '';
    for (let g = 1; g <= sonGun; g++) {
      const dt  = new Date(_yil, _ay, g);
      const iso = _isoTarih(dt);
      const gn  = dt.getDay();
      const hs  = gn === 0 || gn === 6;
      const tatil = !hs ? _isResmiTatil(iso) : null;
      // İstenen format: "1 Haziran 2026 Pazartesi"
      const tarihStr = `${g} ${AY_ISIMLERI[_ay]} ${_yil} ${GUNLER[gn]}`;

      if (hs) {
        html += `<tr class="tt-hs">
          <td class="tt-tarih-hucre">${tarihStr}</td>
          ${'<td class="tt-hs-cell">Hafta Sonu</td>'.repeat(8)}
        </tr>`;
      } else if (tatil) {
        html += `<tr class="tt-tatil" title="${escapeHtml(tatil)}">
          <td class="tt-tarih-hucre">${tarihStr}</td>
          ${'<td class="tt-tatil-cell">Resmi Tatil</td>'.repeat(8)}
        </tr>`;
      } else {
        html += `<tr class="tt-gun">
          <td class="tt-tarih-hucre">${tarihStr}</td>
          ${'<td class="tt-bos-hucre"></td>'.repeat(8)}
        </tr>`;
      }
    }
    return html;
  }

  function _sayfaHtml() {
    const ayAdi = `${AY_ISIMLERI[_ay].toLocaleUpperCase('tr')} - ${_yil}`;
    const { mudurAd, mudurYrdAd } = _getMudurBilgileri();
    const s = _servis || {};

    // DÜZELTME: Ana tablo eskiden flexbox'ın "kalan alanı otomatik
    // doldurma" özelliğine (flex:1 1 auto + height:100%) güvenerek satır
    // yüksekliğini tek sayfaya sığdırmaya çalışıyordu. Bu EKRANDA çalışır
    // ama YAZDIRMA/PDF çıktısında güvenilir değil — yazıcı motoru sayfayı
    // içeriğin doğal boyutuna göre böler, flex-shrink'i sayfalar arası
    // uygulamaz. Sonuç: 31 günlük aylarda (Temmuz, Ağustos, Ekim...) son
    // birkaç satır + imza bloğu ikinci sayfaya taşıyordu. Artık gün
    // sayısına göre yazı boyutu/dolgu JS'te hesaplanıp SABİT olarak
    // uygulanıyor — flex'in "tahminine" güvenmiyoruz.
    const sonGun = new Date(_yil, _ay+1, 0).getDate();
    const buyukAy = sonGun >= 31; // önceki (küçük) küçültme yetersiz kaldı — daha agresif gidiyoruz
    const anaFontPt = buyukAy ? 5.0 : sonGun === 30 ? 6.3 : 6.6;
    const anaPadY   = buyukAy ? 0.6 : sonGun === 30 ? 1.25 : 1.5;
    const subFontPt = buyukAy ? 4.6 : 6.2;
    const ustBoslukMb = buyukAy ? 3 : 8; // 31 günlük aylarda üst tablolar arası boşluk da daraltılır
    const baslik1Pt = buyukAy ? 12 : 14;
    const baslik2Pt = buyukAy ? 9 : 10.5;
    const infoFontPt = buyukAy ? 7.5 : 8.5;
    const infoPadY   = buyukAy ? 2 : 3;
    const ogrFontPt  = buyukAy ? 6.0 : 7;
    const ogrPadY    = buyukAy ? 1 : 1.5;
    const imzaPadTop = buyukAy ? 6 : 12;

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(s.servisAdi||'Servis')} — ${escapeHtml(ayAdi)} Taşıma Takip Çizelgesi</title>
<style>
  /* DÜZELTME: @page margin, tarayıcının yazdırma diyaloğundaki "Kenar
     Boşlukları" ayarına göre GÖRMEZDEN GELİNEBİLİYOR/üzerine yazılabiliyor
     (Chrome'un varsayılanı genelde bizim 7mm/6mm'den daha büyük) — bu da
     31 günlük aylarda web'de hâlâ taşmaya sebep oluyordu (Android native
     tarafta PrintPlugin.java marjı sıfırladığı için orada sorun yoktu).
     Marjı @page'den değil, body dolgusundan veriyoruz — bu tarayıcının
     marj ayarından tamamen bağımsız, her zaman uygulanan normal bir
     kutu modeli özelliği, güvenilir çalışır. */
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif; color: #111; background:#fff;
    display: flex; flex-direction: column; min-height: 100vh;
    padding: 7mm 6mm;
  }

  .tt-sayfa-baslik { text-align: center; margin-bottom: 8px; flex: 0 0 auto; }
  .tt-baslik-1 { font-size: ${baslik1Pt}pt; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; }
  .tt-baslik-2 { font-size: ${baslik2Pt}pt; font-weight: 700; color: #2e7d32; margin-top: 2px; }

  .tt-info-tablo { width: 100%; border-collapse: collapse; margin-bottom: ${ustBoslukMb}px; font-size: ${infoFontPt}pt; flex: 0 0 auto; }
  .tt-info-tablo td { border: 1px solid #888; padding: ${infoPadY}px 6px; }
  .tt-info-tablo .tt-lbl { background: #c8e6c9; font-weight: 700; white-space: nowrap; color:#1b5e20; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  /* Öğrenci listesi: iki sütunu yan yana taşıyan dış tablo */
  .tt-ogrenci-disgrid { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: ${ustBoslukMb}px; flex: 0 0 auto; }
  .tt-ogr-hucre { width: 50%; border: 1px solid #888; vertical-align: top; padding: 0; }

  .tt-ogr-tablo { width: 100%; border-collapse: collapse; font-size: ${ogrFontPt}pt; }
  .tt-ogr-tablo th {
    background: #a5d6a7; font-weight: 700; text-align: center; padding: ${ogrPadY}px 2px;
    border-bottom: 1px solid #888; border-right: 1px solid #bbb;
    -webkit-print-color-adjust:exact; print-color-adjust:exact;
  }
  .tt-ogr-tablo th:last-child { border-right: none; }
  .tt-ogr-tablo td {
    padding: ${ogrPadY}px 3px; text-align: center; border-bottom: 1px solid #ddd; border-right: 1px solid #e3e3e3;
    line-height: 1.35;
  }
  .tt-ogr-tablo td:last-child { border-right: none; }
  .tt-ogr-tablo tr:last-child td { border-bottom: none; }
  .tt-ogr-tablo tr:nth-child(even) td { background: #f6f6f6; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .tt-ogr-sira { width: 24px; }
  .tt-ogr-sinif { width: 42px; }
  .tt-ogr-ad { text-align: left !important; padding-left: 4px !important; }

  /* Ana takip tablosu: kalan dikey alanı tamamen doldurur */
  .tt-tablo-kapsayici { flex: 1 1 auto; display: flex; min-height: 0; }
  .tt-ana-tablo { width: 100%; height: 100%; border-collapse: collapse; font-size: ${anaFontPt}pt; table-layout: fixed; }
  .tt-ana-tablo th, .tt-ana-tablo td { border: 1px solid #888; padding: ${anaPadY}px 2px; text-align: center; vertical-align: middle; }
  .tt-th-tarih { background: #c8e6c9; font-weight: 700; text-align: left !important; padding-left: 6px; width: 125px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .tt-th-sabah, .tt-th-aksam { background: #a5d6a7; font-weight: 700; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .tt-th-sub { background: #c8e6c9; font-weight: 600; font-size: ${subFontPt}pt; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  .tt-tarih-hucre { text-align: left !important; padding-left: 6px; white-space: nowrap; }
  .tt-bos-hucre { min-width: 30px; }

  /* tbody satırları kalan yüksekliği eşit paylaşır */
  .tt-ana-tablo tbody tr { height: 1px; }

  tr.tt-hs td, tr.tt-tatil td { background: #e3e3e3; color: #777; font-style: italic; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  .tt-imza-satir { display: flex; justify-content: space-between; padding: ${imzaPadTop}px 10px 0; flex: 0 0 auto; }
  .tt-imza-kutu { text-align: center; min-width: 130px; }
  .tt-imza-ad { font-size: 8.5pt; font-weight: 700; color: #111; }
  .tt-imza-unvan { font-size: 7.5pt; color: #444; margin-top: 3px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="tt-sayfa-baslik">
    <div class="tt-baslik-1">KORUK İLK-ORTAOKULU</div>
    <div class="tt-baslik-2">${escapeHtml(ayAdi)} TAŞIMA TAKİP ÇİZELGESİ</div>
  </div>

  <table class="tt-info-tablo">
    <tr>
      <td class="tt-lbl">SERVİS ADI</td><td colspan="3">${escapeHtml(s.servisAdi||'')}</td>
      <td class="tt-lbl">CEP NO</td><td>${escapeHtml(s.soforTelefon||'')}</td>
      <td class="tt-lbl">AİT OLDUĞU AY</td><td>${escapeHtml(ayAdi)}</td>
    </tr>
    <tr>
      <td class="tt-lbl">SÜRÜCÜ</td><td colspan="3">${escapeHtml(s.soforAdi||'')}</td>
      <td class="tt-lbl">PLAKA</td><td colspan="3">${escapeHtml(s.plaka||'')}</td>
    </tr>
  </table>

  ${_ogrenciGridHtml()}

  <div class="tt-tablo-kapsayici">
  <table class="tt-ana-tablo">
      <thead>
        <tr>
          <th class="tt-th-tarih" rowspan="2">TARİH</th>
          <th class="tt-th-sabah" colspan="4">ÖĞLE</th>
          <th class="tt-th-aksam" colspan="4">AKŞAM</th>
        </tr>
        <tr>
          <th class="tt-th-sub">GELİŞ<br>SAATİ</th>
          <th class="tt-th-sub">GELEN<br>SAYI</th>
          <th class="tt-th-sub">ŞOFÖR<br>İMZA</th>
          <th class="tt-th-sub">N.ÖĞRT<br>İMZA</th>
          <th class="tt-th-sub">ÇIKIŞ<br>SAATİ</th>
          <th class="tt-th-sub">GİDEN<br>SAYI</th>
          <th class="tt-th-sub">ŞOFÖR<br>İMZA</th>
          <th class="tt-th-sub">N.ÖĞRT<br>İMZA</th>
        </tr>
      </thead>
      <tbody>${_tabloSatirlariHtml()}</tbody>
  </table>
  </div>

  <div class="tt-imza-satir">
    <div class="tt-imza-kutu">
      <div class="tt-imza-ad">${escapeHtml(mudurYrdAd)}</div>
      <div class="tt-imza-unvan">Müdür Yardımcısı</div>
    </div>
    <div class="tt-imza-kutu">
      <div class="tt-imza-ad">${escapeHtml(mudurAd)}</div>
      <div class="tt-imza-unvan">Okul Müdürü</div>
    </div>
  </div>
</body>
</html>`;
  }

  // --- Tam ekran overlay (in-page) önizleme — pop-up engelleyiciden etkilenmez ---

  function _overlayOlustur() {
    if (document.getElementById('ttOverlay')) return document.getElementById('ttOverlay');

    const ov = document.createElement('div');
    ov.id = 'ttOverlay';
    ov.style.cssText = `
      position:fixed; inset:0; z-index:99999; background:#525659;
      display:flex; flex-direction:column;
    `;
    ov.innerHTML = `
      <div id="ttToolbar" style="
        display:flex; align-items:center; justify-content:center; gap:10px;
        background: linear-gradient(135deg,#1b5e20,#2e7d32); color:#fff;
        padding:10px 14px; flex-wrap:wrap; flex:0 0 auto;
      ">
        <button id="ttPrevBtn" disabled style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">◀ Önceki Ay</button>
        <span id="ttAyEtiket" style="font-weight:700;min-width:140px;text-align:center;font-size:13px;">Yükleniyor...</span>
        <button id="ttNextBtn" disabled style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">Sonraki Ay ▶</button>
        <button id="ttPrintBtn" disabled style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">🖨️ Yazdır / PDF</button>
        <button id="ttCloseBtn" style="background:rgba(220,0,0,.4);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">✕ Kapat</button>
      </div>
      <div style="flex:1 1 auto; overflow:auto; padding:16px 0 40px; display:flex; justify-content:center;">
        <div id="ttYukleniyor" style="color:#fff; text-align:center; padding:60px 20px; font-size:14px;">Çizelge hazırlanıyor, lütfen bekleyin…</div>
        <iframe id="ttFrame" style="display:none; width:210mm; min-height:297mm; border:none; background:#fff; box-shadow:0 4px 18px rgba(0,0,0,.4);"></iframe>
      </div>
    `;
    document.body.appendChild(ov);
    document.body.classList.add('tt-overlay-acik');

    ov.querySelector('#ttCloseBtn').onclick = () => {
      ov.remove();
      document.body.classList.remove('tt-overlay-acik');
    };

    return ov;
  }

  function _overlayDoldur(ov) {
    if (!ov) return;

    const yukDiv = ov.querySelector('#ttYukleniyor');
    const frame  = ov.querySelector('#ttFrame');
    if (yukDiv) yukDiv.style.display = 'none';
    if (frame)  frame.style.display = 'block';

    const yazFrame = () => {
      frame.srcdoc = _sayfaHtml();
      ov.querySelector('#ttAyEtiket').textContent = `${AY_ISIMLERI[_ay].toLocaleUpperCase('tr')} - ${_yil}`;
    };
    yazFrame();

    const prevBtn  = ov.querySelector('#ttPrevBtn');
    const nextBtn  = ov.querySelector('#ttNextBtn');
    const printBtn = ov.querySelector('#ttPrintBtn');
    prevBtn.disabled = false; nextBtn.disabled = false; printBtn.disabled = false;

    prevBtn.onclick = () => { _ay--; if (_ay < 0) { _ay = 11; _yil--; } yazFrame(); };
    nextBtn.onclick = () => { _ay++; if (_ay > 11) { _ay = 0; _yil++; } yazFrame(); };
    printBtn.onclick = () => {
      // DÜZELTME: diğer modüllerdeki (dilekçe, tebliğ-tebellüğ, kriter dağıtım)
      // gibi native kontrolü hiç yoktu — Android'de (Capacitor WebView)
      // window.print() desteklenmediği için buton sessizce hiçbir şey
      // yapmıyordu. Native köprü varsa önce onu kullan, yoksa (web) eski
      // davranışa (iframe.print()) devam et.
      if (typeof uygulamaHtmlYazdir === 'function') {
        uygulamaHtmlYazdir(_sayfaHtml(), `Tasima_Takip_${AY_ISIMLERI[_ay]}_${_yil}`, 'dikey');
        return;
      }
      const fr = ov.querySelector('#ttFrame');
      fr.contentWindow.focus();
      fr.contentWindow.print();
    };
  }

  // --- Public API ---
  window.TasimaTakip = {

    async ac(servisId) {
      _servisId = servisId;
      _yil = new Date().getFullYear();
      _ay  = new Date().getMonth();

      // Overlay'i hemen DOM'a ekle (pop-up değil, normal bir element —
      // hiçbir pop-up engelleyiciden etkilenmez).
      const ov = _overlayOlustur();

      _servis = (typeof servisler !== 'undefined')
        ? servisler.find(s => s.id === servisId) || null
        : null;

      try {
        _ogrenciler = await _getOgrenciler(servisId);
      } catch(e) {
        _ogrenciler = [];
      }

      _overlayDoldur(ov);
    }
  };

  // Global, hatalara karşı korumalı giriş noktası (HTML onclick="" attribute'lerinden çağrılır)
  window.TasimaTakipAc = function(servisId) {
    try {
      window.TasimaTakip.ac(servisId);
    } catch (err) {
      alert('Takip Çizelgesi açılırken hata oluştu: ' + (err && err.message ? err.message : err));
    }
  };

})();
