/* =============================================
   js/servis-denetim.js
   OKUL SERVİS ARACI DENETİM FORMU — YAZDIRMA MODÜLÜ
   Kaynak: "Taşıma Yoluyla Eğitime Erişim Yönetmeliği" kapsamında
   kullanılan resmi denetim formunun birebir A4 baskı biçimi.
   Bağımlılıklar: firebase-init.js, tasima.js, app.js (okulBilgileriAyari,
   ogretmenler, servisler global değişkenleri)

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya) → sadece DOM + salt okuma, db bilmez.
     Form yalnızca ÖNİZLEME/YAZDIRMA amaçlıdır; Evet/Hayır/Açıklama
     alanları form kağıt üzerinde elle doldurulmak üzere boş bırakılır.
   ============================================= */

(function() {
  'use strict';

  // DENETLEME KONULARI — orijinal form ile birebir aynı sıra ve madde metni
  const DENETIM_MADDELERI = [
    { s: 'Aracın yaşı "Okul Servis Araçları Yönetmeliği"nde yer alan yaş şartına uygun mu?', r: 'Okul Servis Araçları Yönetmeliği 4/1-f' },
    { s: 'Okul servis aracı temiz, bakımlı, güvenli ve her fırsatta havalandırılmış vaziyette bulunduruluyor mu?', r: 'Okul Servis Araçları Yönetmeliği 4/1-e' },
    { s: 'Taşıma işinin gerçekleştirildiği okul servis aracı, yüklenici tarafından idareye bildirilen araç mı?', r: 'Teknik Şartname' },
    { s: 'Taşımayı gerçekleştiren şoför idareye bildirilen kişi mi?', r: 'Teknik Şartname' },
    { s: '"Sürücü Belgesi" taşıma hizmeti veren aracın kullanımı için yeterli ve uygun mu?', r: 'Okul Servis Araçları Yönetmeliği 9/1-c' },
    { s: 'Aracın camları, renkli film tabakaları yapıştırılması yasağına uygun mu?', r: 'Okul Servis Araçları Yönetmeliği 4/1-n' },
    { s: 'Aracın arkasında "OKUL TAŞITI" yazısını kapsayan numunesine uygun reflektif kuşak var mı?', r: 'Okul Servis Araçları Yönetmeliği 4/1-a' },
    { s: 'En az 30 cm çapında kırmızı ışık veren, üzerinde "DUR" yazısı okunan lamba tesis edilmiş mi?', r: 'Okul Servis Araçları Yönetmeliği 4/1-b' },
    { s: 'Öğrencilerin emniyet kemeri takmaları sağlanıyor mu?', r: 'MEB Taşıma Yoluyla Eğitime Erişim Yönetmeliği 15/2-ğ' },
    { s: 'Araca taşıma kapasitesi üzerinde öğrenci/kursiyer/veli alınıyor mu?', r: 'Teknik Şartname' },
    { s: 'Taşıma merkezi okul/kurum müdürlüğünce düzenlenen puantaj cetvelleri günlük düzenli olarak imzalanıyor mu?', r: 'MEB TYEE 15/2-e / Teknik Şartname' },
    { s: 'Şoför, temiz ve işe uygun kıyafetlerle çalışıyor mu?', r: 'Teknik Şartname' },
    { s: 'Şoför, öğrencilerin güvenli ve rahat yolculuk yapmasını sağlayarak azami sürelere uyuyor mu?', r: 'Okul Servis Araçları Yönetmeliği 9/1-ğ' },
    { s: 'Rehber personel (varsa), TS EN ISO 20471 standardına uygun "REHBER" yazılı ikaz yeleğini kullanıyor mu?', r: 'Okul Servis Araçları Yönetmeliği 9/2-f' },
    { s: 'Servis aracında "İlkyardım Çantası" bulunuyor mu?', r: 'Teknik Şartname' },
    { s: 'Servis aracında "Trafik Seti" bulunuyor mu?', r: 'Teknik Şartname' },
    { s: 'Servis aracında bakımlı ve süresi geçmemiş yangın söndürme tüpü bulunuyor mu?', r: 'Teknik Şartname' },
    { s: 'Araçta öğrencilerin kolayca yetişebileceği camlar ve pencereler sabit mi?', r: 'Okul Servis Araçları Yönetmeliği 4/1-c' },
    { s: 'Aracın iç düzenlemesinde açıkta olan demir aksam yumuşak bir madde ile kaplanmış mı?', r: 'Okul Servis Araçları Yönetmeliği 4/1-c' },
  ];

  let _servisId = null;
  let _servis = null;

  function _escape(t) {
    return (typeof escapeHtml === 'function') ? escapeHtml(t || '') : String(t || '');
  }

  // Gerçek öğrenci sayısı: o servise atanmış veli/öğrenci kayıtlarından sayılır
  // (bkz. js/tasima.js servisDetayAc — aynı filtre: veliler.filter(v=>v.servisId===id))
  function _ogrenciSayisiHesapla(servisId) {
    if (typeof veliler !== 'undefined' && Array.isArray(veliler)) {
      return veliler.filter(v => v.servisId === servisId).length;
    }
    return (_servis && _servis.ogrenciSayisi) || '';
  }

  // --- Okul / müdür / müdür yardımcısı bilgileri (bkz. js/tasima-takip.js _getMudurBilgileri) ---
  function _getOkulVeMuduBilgileri() {
    const okul = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari) || {};
    const okulAdi = okul.okulAdi || 'OKUL/KURUM ADI';
    const il = okul.il || '';
    const ilce = okul.ilce || '';

    let mudurAd = '', mudurYrdAd = '';
    if (typeof ogretmenler !== 'undefined' && Array.isArray(ogretmenler)) {
      const mudur = ogretmenler.find(o => o.id === okul.mudurId);
      if (mudur) mudurAd = `${mudur.ad || ''} ${mudur.soyad || ''}`.trim();
      const yrd = ogretmenler.find(o => (o.unvan || '').trim() === 'Müdür Yardımcısı');
      if (yrd) mudurYrdAd = `${yrd.ad || ''} ${yrd.soyad || ''}`.trim();
    }

    const baslikParcalari = [];
    if (il) baslikParcalari.push(`${il.toLocaleUpperCase('tr')} İLİ`);
    if (ilce) baslikParcalari.push(`${ilce.toLocaleUpperCase('tr')} İLÇESİ`);
    baslikParcalari.push(okulAdi.toLocaleUpperCase('tr'));

    return { okulBasligi: baslikParcalari.join(' '), mudurAd, mudurYrdAd };
  }

  // --- Denetim maddeleri tablosu (Evet/Hayır elle işaretlenir; madde metni ve açıklama düzenlenebilir) ---
  function _maddelerTablosuHtml() {
    return `
    <table class="sd-madde-tablo">
      <thead>
        <tr>
          <th class="sd-th-konu">DENETLEME KONULARI</th>
          <th class="sd-th-cevap">EVET</th>
          <th class="sd-th-cevap">HAYIR</th>
          <th class="sd-th-aciklama">AÇIKLAMALAR</th>
        </tr>
      </thead>
      <tbody>
        ${DENETIM_MADDELERI.map(m => `
        <tr>
          <td class="sd-konu-hucre">
            <span class="sd-madde-metin" contenteditable="true" spellcheck="false">${_escape(m.s)}</span>
            <span class="sd-madde-ref" contenteditable="true" spellcheck="false">(${_escape(m.r)})</span>
          </td>
          <td class="sd-cevap-hucre"></td>
          <td class="sd-cevap-hucre"></td>
          <td class="sd-aciklama-hucre" contenteditable="true" spellcheck="false"></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  // Nöbetçi öğretmen listesi: Müdür ve Müdür Yardımcısı hariç tüm öğretmenler
  function _nobetciOgretmenSecenekleri() {
    if (typeof ogretmenler === 'undefined' || !Array.isArray(ogretmenler)) return '';
    const okul = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari) || {};
    return ogretmenler
      .filter(o => o.id !== okul.mudurId && (o.unvan || '').trim() !== 'Müdür Yardımcısı')
      .map(o => {
        const ad = `${o.ad || ''} ${o.soyad || ''}`.trim();
        return `<option value="${_escape(ad)}">${_escape(ad)}</option>`;
      })
      .join('');
  }


  // --- Tam ekran overlay (in-page) önizleme — pop-up engelleyiciden etkilenmez ---

  // --- Form CSS (hem önizleme hem print için) ---
  function _formCss() {
    return `
      .sd-wrap { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff;
        display: flex; flex-direction: column; padding: 7mm; box-sizing: border-box; }
      .sd-baslik { text-align: center; margin-bottom: 3px; }
      .sd-baslik-okul { font-size: 11pt; font-weight: 800; letter-spacing: .2px; }
      .sd-baslik-1 { font-size: 8pt; font-weight: 700; margin-top: 1px; }
      .sd-baslik-2 { font-size: 9pt; font-weight: 800; margin-top: 1px; }
      .sd-baslik-3 { font-size: 6.8pt; font-style: italic; color: #333; margin-top: 1px; }
      .sd-bilgi-tablo { width: 100%; border-collapse: collapse; margin: 5px 0; font-size: 7.6pt; }
      .sd-bilgi-tablo td { border: 1px solid #333; padding: 2.5px 5px; background: #fff; }
      .sd-bilgi-tablo .sd-lbl { font-weight: 800; white-space: nowrap; width: 21%; }
      .sd-bilgi-tablo .sd-val { width: 29%; font-weight: 600; }
      .sd-madde-tablo { width: 100%; border-collapse: collapse; font-size: 7.1pt; margin-top: 3px; }
      .sd-madde-tablo th { font-weight: 800; text-align: center; padding: 2.5px 3px; border: 1.4px solid #333; background: #fff; }
      .sd-th-konu { width: 57%; text-align: left !important; padding-left: 5px !important; }
      .sd-th-cevap { width: 7%; }
      .sd-th-aciklama { width: 29%; }
      .sd-madde-tablo td { border: 1px solid #555; padding: 2px 4px; vertical-align: top; background: #fff; }
      .sd-madde-tablo tr { background: #fff; }
      .sd-konu-hucre { text-align: left; line-height: 1.18; }
      .sd-madde-ref { font-size: 6pt; color: #555; font-style: italic; }
      .sd-cevap-hucre { text-align: center; vertical-align: middle; }
      .sd-not { font-size: 5.8pt; color: #333; margin-top: 4px; line-height: 1.25; }
      .sd-imza-satir { display: flex; justify-content: space-around; margin-top: 10px; }
      .sd-imza-kutu { text-align: center; min-width: 140px; }
      .sd-imza-baslik { font-size: 7.5pt; font-weight: 700; margin-bottom: 14px; }
      .sd-imza-cizgi { border-top: 1px solid #333; padding-top: 2px; }
      .sd-imza-ad { font-size: 7.8pt; font-weight: 700; min-height: 11px; }
      .sd-imza-unvan { font-size: 7pt; color: #444; margin-top: 1px; }
      .sd-readonly { color: #333; }
      .sd-nobetci-select { font-family: inherit; font-size: 7.8pt; font-weight: 700;
        border: none; border-bottom: 1px solid #999; background: transparent;
        text-align: center; width: 100%; cursor: pointer; padding: 0; }
    `;
  }

  // --- Form gövdesi (sadece içerik, sarmalayıcı div ile) ---
  function _formGovdesi() {
    const s = _servis || {};
    const { okulBasligi, mudurAd, mudurYrdAd } = _getOkulVeMuduBilgileri();
    const ogrenciSayisi = _ogrenciSayisiHesapla(_servisId);

    return `
  <div class="sd-wrap">
    <div class="sd-baslik">
      <div class="sd-baslik-okul">${_escape(okulBasligi)}</div>
      <div class="sd-baslik-1">TAŞIMA YOLUYLA EĞİTİME ERİŞİM YÖNETMELİĞİ KAPSAMINDA HİZMET SUNAN</div>
      <div class="sd-baslik-2">OKUL SERVİS ARACI DENETİM FORMU</div>
      <div class="sd-baslik-3">(TAŞIMA MERKEZİ OKUL/KURUM MÜDÜRLÜĞÜNCE KULLANILACAK)</div>
    </div>

    <table class="sd-bilgi-tablo">
      <tr>
        <td class="sd-lbl">ARACIN PLAKASI</td><td class="sd-val" contenteditable="true" spellcheck="false">${_escape(s.plaka)}</td>
        <td class="sd-lbl">TELEFON / GSM</td><td class="sd-val" contenteditable="true" spellcheck="false">${_escape(s.soforTelefon)}</td>
      </tr>
      <tr>
        <td class="sd-lbl">ŞOFÖRÜN ADI SOYADI</td><td class="sd-val" contenteditable="true" spellcheck="false">${_escape(s.soforAdi)}</td>
        <td class="sd-lbl">ÖĞRENCİ SAYISI</td><td class="sd-val sd-readonly">${_escape(ogrenciSayisi)}</td>
      </tr>
      <tr>
        <td class="sd-lbl">ARACIN GÜZERGÂHI</td><td class="sd-val" contenteditable="true" spellcheck="false">${_escape(s.guzergah)}</td>
        <td class="sd-lbl">DENETLEME TARİHİ</td><td class="sd-val" contenteditable="true" spellcheck="false">…… / …… / 20……</td>
      </tr>
      <tr>
        <td class="sd-lbl">ARACIN MODEL YILI</td><td class="sd-val" contenteditable="true" spellcheck="false">${_escape(s.modelYili)}</td>
        <td class="sd-lbl">SÜRÜCÜ BELGESİ YIL / SINIFI</td><td class="sd-val" contenteditable="true" spellcheck="false">${_escape(s.ehliyetYili)}${s.ehliyetSinifi ? ' / ' + _escape(s.ehliyetSinifi) : ''}</td>
      </tr>
    </table>

    ${_maddelerTablosuHtml()}

    <div class="sd-not">
      Not: 1) Okul servis araçları her haftanın ilk iş günü denetlenip bu form tutanak haline getirilerek ay sonu puantajları ile birlikte
      milli eğitim müdürlüğüne bildirilecek ve okul/kurum müdürlüğü dosyasında imzalı ve onaylı bir şekilde saklanacaktır. (bkz. Teknik Şartname)<br>
      2) Çizelgede yer alan denetim maddeleri ile ilgili "Evet / Hayır" bölümü işaretlendikten sonra gerek duyulması halinde "AÇIKLAMALAR" bölümü kullanılacaktır.
    </div>

    <div class="sd-imza-satir">
      <div class="sd-imza-kutu">
        <div class="sd-imza-baslik">Denetleyen</div>
        <div class="sd-imza-cizgi">
          <div class="sd-imza-ad">
            <select class="sd-nobetci-select">
              <option value=""></option>
              ${_nobetciOgretmenSecenekleri()}
            </select>
          </div>
          <div class="sd-imza-unvan">Nöbetçi Öğretmen</div>
        </div>
      </div>
      <div class="sd-imza-kutu">
        <div class="sd-imza-baslik">Denetleyen</div>
        <div class="sd-imza-cizgi">
          <div class="sd-imza-ad">${_escape(mudurYrdAd)}</div>
          <div class="sd-imza-unvan">Müdür Yardımcısı</div>
        </div>
      </div>
      <div class="sd-imza-kutu">
        <div class="sd-imza-baslik">Denetleyen</div>
        <div class="sd-imza-cizgi">
          <div class="sd-imza-ad">${_escape(mudurAd)}</div>
          <div class="sd-imza-unvan">Okul Müdürü</div>
        </div>
      </div>
    </div>
  </div>`;
  }

  // --- Tam ekran overlay ---
  function _overlayOlustur() {
    // Varsa kapat ve yeniden oluştur (servis değişmiş olabilir)
    const mevcutOv = document.getElementById('sdOverlay');
    if (mevcutOv) mevcutOv.remove();

    // Print stili — ana sayfada bir kez tanımlanır
    let ps = document.getElementById('sd-print-style');
    if (!ps) {
      ps = document.createElement('style');
      ps.id = 'sd-print-style';
      ps.textContent = `
        @media print {
          @page { size: A4 portrait; margin: 7mm; }
          body > *:not(#sdOverlay) { display: none !important; }
          #sdOverlay { position: static !important; background: white !important;
            display: block !important; }
          #sdToolbar { display: none !important; }
          #sdFormIcerik { overflow: visible !important; padding: 0 !important; }
          .sd-wrap { padding: 0 !important; }
          [contenteditable="true"] { outline: none !important; background: transparent !important; }
          .sd-nobetci-select { -webkit-appearance: none; appearance: none; border: none; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `;
      document.head.appendChild(ps);
    }

    // Form CSS'i sayfaya ekle (önizleme için)
    let fs = document.getElementById('sd-form-style');
    if (!fs) {
      fs = document.createElement('style');
      fs.id = 'sd-form-style';
      fs.textContent = _formCss();
      document.head.appendChild(fs);
    }

    const ov = document.createElement('div');
    ov.id = 'sdOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#525659;display:flex;flex-direction:column;';
    ov.innerHTML = `
      <div id="sdToolbar" style="display:flex;align-items:center;justify-content:center;gap:10px;
        background:linear-gradient(135deg,#14304a,#1B3A5C);color:#fff;
        padding:10px 14px;flex-wrap:wrap;flex:0 0 auto;">
        <span style="font-weight:700;font-size:13px;">Okul Servis Aracı Denetim Formu</span>
        <button id="sdPrintBtn" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">🖨️ Yazdır / PDF</button>
        <button id="sdCloseBtn" style="background:rgba(220,0,0,.4);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">✕ Kapat</button>
      </div>
      <div id="sdFormIcerik" style="flex:1 1 auto;overflow:auto;padding:16px;background:#525659;">
        <div style="width:210mm;margin:0 auto;background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.4);">
          ${_formGovdesi()}
        </div>
      </div>
    `;
    document.body.appendChild(ov);
    document.body.classList.add('sd-overlay-acik');

    ov.querySelector('#sdCloseBtn').onclick = () => {
      ov.remove();
      document.body.classList.remove('sd-overlay-acik');
    };

    ov.querySelector('#sdPrintBtn').onclick = () => window.print();

    return ov;
  }

  // --- Public API ---
  window.ServisDenetim = {
    ac(servisId) {
      _servisId = servisId;
      _servis = (typeof servisler !== 'undefined')
        ? servisler.find(s => s.id === servisId) || null
        : null;
      _overlayOlustur();
    }
  };

  // Global, hatalara karşı korumalı giriş noktası (HTML onclick="" attribute'lerinden çağrılır)
  window.ServisDenetimAc = function(servisId) {
    try {
      window.ServisDenetim.ac(servisId);
    } catch (err) {
      alert('Denetim Formu açılırken hata oluştu: ' + (err && err.message ? err.message : err));
    }
  };

})();
