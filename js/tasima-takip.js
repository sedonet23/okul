/* =============================================
   js/tasima-takip.js
   TAŞIMA TAKİP ÇİZELGESİ MODÜLÜ (salt görüntü / yazdırma)
   Bağımlılıklar: firebase-init.js, tasima.js, nobet.js, app.js
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

    // 1. oy_veliler koleksiyonu (ana kaynak — tasima.js servisDetayAc ile aynı filtre)
    if (typeof veliler !== 'undefined') {
      const svVeliler = veliler.filter(v => v.servisId === servisId)
        .sort((a,b) => (a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));
      liste = svVeliler.map(v => {
        const sinifObj = (typeof siniflar !== 'undefined')
          ? siniflar.find(s => s.id === v.sinifId) : null;
        return { ad: v.ogrenciAdi || '', sinif: sinifObj ? sinifObj.ad : (v.sinifId || '') };
      });
    }

    // 2. veliler boşsa, yedek kaynak olarak oy_servisOturma koleksiyonuna bak
    if (!liste.length) {
      try {
        const snap = await db.collection(COL.servisOturma)
          .where('servisId','==', servisId).get();
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
                liste.push({ ad: k.ogrenciAdi, sinif: sinifAdi });
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
      return `<div class="tt-ogr-col">
        <div class="tt-ogr-head">
          <span>SIRA</span><span>ÖĞRENCİ ADI SOYADI</span><span>SINIF</span>
        </div>
        ${liste.map((o,i) => `
        <div class="tt-ogr-row">
          <span>${baslangic+i+1}</span>
          <span class="tt-ogr-ad">${escapeHtml(o.ad||'')}</span>
          <span>${escapeHtml(o.sinif||'')}</span>
        </div>`).join('')}
      </div>`;
    }
    return `<div class="tt-ogrenci-grid">${kolHtml(sol, 0)}${kolHtml(sag, yarisi)}</div>`;
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
    const ayAdi = `${AY_ISIMLERI[_ay]} - ${_yil}`;
    const { mudurAd, mudurYrdAd } = _getMudurBilgileri();
    const s = _servis || {};

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(s.servisAdi||'Servis')} — ${escapeHtml(ayAdi)} Taşıma Takip Çizelgesi</title>
<style>
  @page { size: A4 portrait; margin: 7mm 6mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background:#fff; }

  .tt-sayfa-baslik { text-align: center; margin-bottom: 8px; }
  .tt-baslik-1 { font-size: 14pt; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; }
  .tt-baslik-2 { font-size: 10.5pt; font-weight: 700; color: #2e7d32; margin-top: 2px; }

  .tt-info-tablo { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 8.5pt; }
  .tt-info-tablo td { border: 1px solid #888; padding: 3px 6px; }
  .tt-info-tablo .tt-lbl { background: #c8e6c9; font-weight: 700; white-space: nowrap; color:#1b5e20; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  .tt-ogrenci-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #888; margin-bottom: 8px; }
  .tt-ogr-col { border-right: 1px solid #888; }
  .tt-ogr-col:last-child { border-right: none; }
  .tt-ogr-head { display: grid; grid-template-columns: 24px 1fr 42px; background: #a5d6a7; font-size: 7pt; font-weight: 700; text-align: center; border-bottom: 1px solid #888; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .tt-ogr-head span { padding: 2px 1px; border-right: 1px solid #bbb; }
  .tt-ogr-head span:last-child { border-right: none; }
  .tt-ogr-row { display: grid; grid-template-columns: 24px 1fr 42px; font-size: 7pt; border-bottom: 1px solid #ddd; line-height: 1.35; }
  .tt-ogr-row:last-child { border-bottom: none; }
  .tt-ogr-row:nth-child(even) { background: #f6f6f6; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .tt-ogr-row span { padding: 1.5px 1px; text-align: center; border-right: 1px solid #e3e3e3; }
  .tt-ogr-row span:last-child { border-right: none; }
  .tt-ogr-row .tt-ogr-ad { text-align: left; padding-left: 4px; }

  .tt-ana-tablo { width: 100%; border-collapse: collapse; font-size: 6.6pt; }
  .tt-ana-tablo th, .tt-ana-tablo td { border: 1px solid #888; padding: 1.5px 2px; text-align: center; vertical-align: middle; }
  .tt-th-tarih { background: #c8e6c9; font-weight: 700; text-align: left; padding-left: 6px; width: 110px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .tt-th-sabah, .tt-th-aksam { background: #a5d6a7; font-weight: 700; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .tt-th-sub { background: #c8e6c9; font-weight: 600; font-size: 6.2pt; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  .tt-tarih-hucre { text-align: left; padding-left: 6px; }
  .tt-bos-hucre { min-width: 30px; }

  tr.tt-hs td, tr.tt-tatil td { background: #e3e3e3; color: #777; font-style: italic; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  .tt-imza-satir { display: flex; justify-content: space-between; padding: 12px 10px 0; }
  .tt-imza-kutu { text-align: center; min-width: 130px; }
  .tt-imza-unvan { font-size: 8pt; font-weight: 700; }
  .tt-imza-ad { font-size: 7.5pt; color: #444; margin-top: 3px; }

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

  <div class="tt-imza-satir">
    <div class="tt-imza-kutu">
      <div class="tt-imza-unvan">Müdür Yardımcısı</div>
      <div class="tt-imza-ad">${escapeHtml(mudurYrdAd)}</div>
    </div>
    <div class="tt-imza-kutu">
      <div class="tt-imza-unvan">Okul Müdürü</div>
      <div class="tt-imza-ad">${escapeHtml(mudurAd)}</div>
    </div>
  </div>
</body>
</html>`;
  }

  // --- Üst kontrol çubuğu (ay gezinme + yazdır) ile birlikte önizleme penceresi açar ---

  function _pencereAc() {
    const w = window.open('', '_blank', 'width=900,height=900');
    if (!w) { if (typeof toast === 'function') toast('Pop-up engellendi, lütfen izin verin.'); return; }

    const ayAdi = `${AY_ISIMLERI[_ay]} - ${_yil}`;

    w.document.write(`<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Taşıma Takip Çizelgesi</title>
<style>
  body { margin:0; font-family:'Segoe UI',Arial,sans-serif; background:#525659; }
  .tt-toolbar {
    position: sticky; top:0; z-index:10;
    display:flex; align-items:center; justify-content:center; gap:10px;
    background: linear-gradient(135deg,#1b5e20,#2e7d32);
    color:#fff; padding:10px 14px; flex-wrap:wrap;
  }
  .tt-toolbar button {
    background: rgba(255,255,255,0.2); border:none; color:#fff;
    border-radius:7px; padding:6px 14px; font-size:13px; font-weight:700; cursor:pointer;
  }
  .tt-toolbar button:hover { background: rgba(255,255,255,0.35); }
  .tt-toolbar span { font-weight:700; min-width:140px; text-align:center; font-size:13px; }
  .tt-sayfa-kapsayici { padding: 16px 0 40px; display:flex; justify-content:center; }
  iframe { width: 210mm; min-height: 297mm; border:none; background:#fff; box-shadow:0 4px 18px rgba(0,0,0,0.4); }
  @media print {
    .tt-toolbar { display:none !important; }
    .tt-sayfa-kapsayici { padding:0; }
    iframe { box-shadow:none; width:100%; min-height:0; }
  }
</style>
</head>
<body>
  <div class="tt-toolbar">
    <button id="ttPrevBtn">◀ Önceki Ay</button>
    <span id="ttAyEtiket">${escapeHtml(ayAdi)}</span>
    <button id="ttNextBtn">Sonraki Ay ▶</button>
    <button id="ttPrintBtn">🖨️ Yazdır / PDF</button>
  </div>
  <div class="tt-sayfa-kapsayici">
    <iframe id="ttFrame"></iframe>
  </div>
</body>
</html>`);
    w.document.close();

    _ttWin = w;

    const yazFrame = () => {
      const frame = w.document.getElementById('ttFrame');
      frame.srcdoc = _sayfaHtml();
      w.document.getElementById('ttAyEtiket').textContent = `${AY_ISIMLERI[_ay]} - ${_yil}`;
    };
    yazFrame();

    w.document.getElementById('ttPrevBtn').onclick = async () => {
      _ay--; if (_ay < 0) { _ay = 11; _yil--; }
      yazFrame();
    };
    w.document.getElementById('ttNextBtn').onclick = async () => {
      _ay++; if (_ay > 11) { _ay = 0; _yil++; }
      yazFrame();
    };
    w.document.getElementById('ttPrintBtn').onclick = () => {
      const frame = w.document.getElementById('ttFrame');
      frame.contentWindow.focus();
      frame.contentWindow.print();
    };
  }

  let _ttWin = null;

  // --- Public API ---
  window.TasimaTakip = {

    async ac(servisId) {
      _servisId = servisId;
      _yil = new Date().getFullYear();
      _ay  = new Date().getMonth();

      _servis = (typeof servisler !== 'undefined')
        ? servisler.find(s => s.id === servisId) || null
        : null;

      _ogrenciler = await _getOgrenciler(servisId);

      _pencereAc();
    }
  };

})();
