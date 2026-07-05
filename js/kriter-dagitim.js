/* ====================================================================
   js/kriter-dagitim.js
   KRİTER PUAN DAĞITIM ARACI (Otomasyon)

   AMAÇ: e-Okul'dan alınan bir not döküm Excel'inde öğrencinin NİHAİ
   puanı zaten bellidir (örn. "1. Ders İçi Katılım Puanı" = 80). Bu araç,
   o nihai puanı üretecek şekilde, öğretmenin tanımladığı rubrik
   kriterlerine (her biri 1-5 gibi bir ölçekte) GERİYE DOĞRU bir puan
   dağılımı üretir ve bilisimle.com tarzı bir "Ders İçi Katılım Ölçeği"
   çizelgesi olarak yazdırmaya hazırlar.

   Excel'deki tekrarlayan bloklar (SIRA sütunu 1'den başlayıp tekrar 1'e
   dönen listeler) otomatik tespit edilir — her blok ayrı bir ders/sınıf
   listesidir. Her blok için birden fazla not sütunu (1. Etkinlik,
   2. Etkinlik, ...) doluysa, HER BİRİ için AYRI bir çizelge/sayfa üretilir.

   Mimari not (bkz. docs/Pragmatik-Mimari-Tasarimi.md §2): Bu modül
   Firestore/Storage'a HİÇ dokunmuz — Excel dosyası tamamen tarayıcıda
   okunup işlenir, sonuç sadece ekranda gösterilip yazdırılır, hiçbir şey
   kaydedilmez. Repository katmanı (DB/Storage erişimi) ve service katmanı
   (yetki kontrolü) bu yüzden burada YOK — ikisinin de yapacağı iş yok;
   dilekçe/maaş formu modülleriyle aynı gerekçe.
   ==================================================================== */

(function() {
  'use strict';

  const LS_ANAHTAR = 'krtDagitimAyarlari';

  /* ---- Varsayılan kriter şablonu (Ölçütleri Düzenle ile değiştirilebilir) ---- */
  function _varsayilanKriterAyari() {
    return {
      puanMin: 1,
      puanMax: 5,
      puanEtiketleri: ['ZAYIF', 'KABUL EDİLEBİLİR', 'ORTA', 'İYİ', 'ÇOK İYİ'],
      gruplar: [
        { ad: '1.DERSE HAZIRLIK', kriterler: ['Kaynak bilgisi sorgular.', 'Bilgi kaynaklarını kendisi bulur.'] },
        { ad: '2.ETKİNLİKLERE KATILIM', kriterler: ['Bilgiyi nereden edineceğini bildiğini söyler.', 'Derse değişik yardımcı kaynaklarla gelir.', 'Derse hazırlıklı gelir.'] },
        { ad: '3.ARAŞTIRMA-GÖZLEM', kriterler: ['Kendiliğinden söz alarak görüşünü söyler.', 'Kendisine görüş sorulduğunda konuşur.', 'Belirttiği görüş ve verdiği örnekler özgündür.'] },
        { ad: '4.SUNUM', kriterler: ['Yeni ve özgün sorular sorar.', 'Dersi dinlediğini gösteren özgün sorular sorar.'] },
        { ad: '5.UYGULAMA', kriterler: ['Bilgi toplamak için çeşitli kaynaklara başvurur.', 'Verilenden farklı kaynakları da araştırır.'] }
      ]
    };
  }

  function _kriterAyariYukle() {
    try {
      const ham = localStorage.getItem(LS_ANAHTAR);
      if (ham) return JSON.parse(ham);
    } catch (e) { /* yoksay, varsayılana dön */ }
    return _varsayilanKriterAyari();
  }

  function _kriterAyariKaydet(ayar) {
    _kriterAyari = ayar;
    try { localStorage.setItem(LS_ANAHTAR, JSON.stringify(ayar)); } catch (e) { /* önemli değil */ }
  }

  let _kriterAyari = _kriterAyariYukle();

  function _tumKriterler() {
    const liste = [];
    _kriterAyari.gruplar.forEach(g => g.kriterler.forEach(k => liste.push({ grupAd: g.ad, metin: k })));
    return liste;
  }

  /* ---- Sütun harfi <-> index yardımcıları ---- */
  function _harfdenIndexe(harf) {
    harf = (harf || '').toUpperCase().trim();
    let sonuc = 0;
    for (let i = 0; i < harf.length; i++) sonuc = sonuc * 26 + (harf.charCodeAt(i) - 64);
    return sonuc - 1;
  }

  /* ---- Hedef puanı kriterlere geriye doğru dağıtma algoritması ---- */
  function _puanDagit(hedefPuan, kriterSayisi, puanMin, puanMax) {
    if (kriterSayisi <= 0) return [];
    const enDusukToplam = kriterSayisi * puanMin;
    const enYuksekToplam = kriterSayisi * puanMax;
    let hedefToplam = Math.round((hedefPuan / 100) * kriterSayisi * puanMax);
    hedefToplam = Math.max(enDusukToplam, Math.min(enYuksekToplam, hedefToplam));

    const taban = Math.floor(hedefToplam / kriterSayisi);
    let kalan = hedefToplam - taban * kriterSayisi;

    const degerler = new Array(kriterSayisi).fill(Math.max(puanMin, Math.min(puanMax, taban)));
    const indeksler = Array.from({ length: kriterSayisi }, (_, i) => i);
    for (let i = indeksler.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indeksler[i], indeksler[j]] = [indeksler[j], indeksler[i]];
    }
    for (let i = 0; i < indeksler.length && kalan > 0; i++) {
      const idx = indeksler[i];
      if (degerler[idx] < puanMax) { degerler[idx]++; kalan--; }
    }
    return degerler;
  }

  /* ---- Genel yardımcılar ---- */
  function _varsayilanEgitimYili() {
    const d = new Date();
    const ay = d.getMonth() + 1;
    const yil = d.getFullYear();
    return (ay >= 8) ? `${yil}-${yil + 1}` : `${yil - 1}-${yil}`;
  }
  function _varsayilanMuduAdi() {
    const okul = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari) || {};
    return (okul.mudurId && typeof ogretmenAdi === 'function') ? (ogretmenAdi(okul.mudurId) || '') : '';
  }
  function _getOkulAdi() {
    return (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) ? okulBilgileriAyari.okulAdi : '';
  }

  /* ================================================================
     GENEL AKIŞ STATE'İ
     ================================================================ */
  function _bosState() {
    return {
      adim: 1,
      egitimYili: _varsayilanEgitimYili(),
      donem: '1. Dönem',
      ogretmenId: '',
      ogretmenAdi: '',
      brans: '',
      okulAdi: _getOkulAdi(),
      muduAdi: _varsayilanMuduAdi(),

      aoa: null,
      siraSutunu: 'A',
      isimSutunu: 'C',
      notSutunlari: [{ sutun: '', ad: '1. Etkinlik Notu' }, { sutun: '', ad: '2. Etkinlik Notu' }, { sutun: '', ad: '3. Etkinlik Notu' }],

      bloklar: []
    };
  }

  let _state = null;

  /* ================================================================
     EXCEL OKUMA + BLOKLARA AYIRMA
     ================================================================ */
  async function _excelOkuVeBlokla() {
    const siraIdx = _harfdenIndexe(_state.siraSutunu);
    const isimIdx = _harfdenIndexe(_state.isimSutunu);
    const notIdxleri = _state.notSutunlari.filter(n => n.sutun).map(n => ({ idx: _harfdenIndexe(n.sutun), ad: n.ad }));

    const aoa = _state.aoa;
    const bloklar = [];
    let mevcutBlok = null;

    for (let r = 0; r < aoa.length; r++) {
      const satir = aoa[r] || [];
      const siraDeger = satir[siraIdx];
      const siraSayi = (typeof siraDeger === 'number') ? siraDeger : parseInt(siraDeger, 10);
      const ad = (satir[isimIdx] || '').toString().trim();

      if (siraSayi === 1) {
        if (mevcutBlok && mevcutBlok.ogrenciler.length) bloklar.push(mevcutBlok);
        mevcutBlok = { baslangic: r, ogrenciler: [], ders: '', sinif: '' };
      }
      if (!mevcutBlok) continue;
      if (!ad || isNaN(siraSayi)) continue;

      const notlar = {};
      notIdxleri.forEach(n => {
        const ham = satir[n.idx];
        const sayi = (typeof ham === 'number') ? ham : parseFloat((ham || '').toString().replace(',', '.'));
        notlar[n.ad] = isNaN(sayi) ? null : sayi;
      });

      mevcutBlok.ogrenciler.push({ no: satir[_harfdenIndexe('B')] ?? '', ad, notlar });
    }
    if (mevcutBlok && mevcutBlok.ogrenciler.length) bloklar.push(mevcutBlok);

    _state.bloklar = bloklar;
  }

  /* ================================================================
     ÇİZELGE HTML ÜRETİMİ (bilisimle.com formatı, kendi bilgilerimizle)
     ================================================================ */
  function _cizelgeHtml(blok, notAdi) {
    const kriterler = _tumKriterler();
    const kriterSayisi = kriterler.length;
    const puanMin = _kriterAyari.puanMin, puanMax = _kriterAyari.puanMax;

    const grupBaslikHtml = _kriterAyari.gruplar.map(g =>
      `<th colspan="${g.kriterler.length}" class="kd-grup-th">${escapeHtml(g.ad)}</th>`
    ).join('');
    const kriterBaslikHtml = kriterler.map(k =>
      `<th class="kd-kriter-th"><div class="kd-donen-yazi">${escapeHtml(k.metin)}</div></th>`
    ).join('');

    const satirlarHtml = blok.ogrenciler.map((o, i) => {
      const hedef = o.notlar[notAdi];
      if (hedef === null || hedef === undefined) {
        return `<tr><td class="kd-sira">${i + 1}</td><td class="kd-no">${escapeHtml(String(o.no))}</td><td class="kd-ad">${escapeHtml(o.ad)}</td>${kriterler.map(() => '<td></td>').join('')}<td></td></tr>`;
      }
      const dagilim = _puanDagit(hedef, kriterSayisi, puanMin, puanMax);
      const puanHucreleri = dagilim.map(p => `<td class="kd-puan">${p}</td>`).join('');
      return `<tr><td class="kd-sira">${i + 1}</td><td class="kd-no">${escapeHtml(String(o.no))}</td><td class="kd-ad">${escapeHtml(o.ad)}</td>${puanHucreleri}<td class="kd-toplam">${Math.round(hedef)}</td></tr>`;
    }).join('');

    const olcutLejant = _kriterAyari.puanEtiketleri.map((etiket, i) =>
      `<tr><td class="kd-lejant-no">${puanMin + i}</td><td class="kd-lejant-etiket">${escapeHtml(etiket)}</td></tr>`
    ).join('');

    return `
    <div class="kd-sayfa">
      <table class="kd-ust-tablo">
        <tr><td colspan="3" class="kd-ust-baslik">${escapeHtml(_state.egitimYili)} EĞİTİM ÖĞRETİM YILI ${escapeHtml(_state.okulAdi.toLocaleUpperCase('tr'))}</td></tr>
        <tr><td colspan="3" class="kd-ust-baslik">${escapeHtml((blok.sinif || '').toLocaleUpperCase('tr'))} SINIFI ${escapeHtml((blok.ders || 'DERS').toLocaleUpperCase('tr'))} DERSİ ${escapeHtml(_state.donem.toLocaleUpperCase('tr'))} ${escapeHtml(notAdi.toLocaleUpperCase('tr'))} DERS İÇİ KATILIM ÖLÇEĞİ</td></tr>
      </table>

      <table class="kd-govde-tablo">
        <tr>
          <td class="kd-sinif-kutu" rowspan="3">
            <div class="kd-olcutler-dikey">ÖLÇÜTLER</div>
            <table class="kd-lejant-tablo">${olcutLejant}</table>
          </td>
          <td class="kd-th-sabit" rowspan="3">SIRA</td>
          <td class="kd-th-sabit" rowspan="3">NO</td>
          <td class="kd-th-sabit" rowspan="3">ADI SOYADI</td>
          <td colspan="${kriterSayisi}" class="kd-kazanim-baslik">Öğrencide Gözlenecek Kazanımlar</td>
          <td class="kd-th-sabit kd-donen-yazi-th" rowspan="3"><div class="kd-donen-yazi">${escapeHtml(notAdi.toLocaleUpperCase('tr'))} PUANI</div></td>
        </tr>
        <tr>${grupBaslikHtml}</tr>
        <tr>${kriterBaslikHtml}</tr>
        ${satirlarHtml}
      </table>

      <table class="kd-alt-tablo">
        <tr>
          <td class="kd-imza-hucre">
            <div>${escapeHtml(_state.ogretmenAdi)}</div>
            <div class="kd-unvan">${escapeHtml((_state.brans || '').toLocaleUpperCase('tr'))} ÖĞRETMENİ</div>
          </td>
          <td class="kd-imza-hucre">
            <div>${escapeHtml(_state.muduAdi)}</div>
            <div class="kd-unvan">OKUL MÜDÜRÜ</div>
          </td>
        </tr>
      </table>
    </div>`;
  }

  function _kdStilBlogu() {
    return `
    * { box-sizing:border-box; }
    body { font-family:Arial,sans-serif; margin:0; padding:0; background:#fff; }
    .kd-sayfa { width:100%; padding:10mm; page-break-after:always; }
    .kd-sayfa:last-child { page-break-after:auto; }
    table { border-collapse:collapse; width:100%; }
    .kd-ust-tablo { margin-bottom:2mm; }
    .kd-ust-baslik { text-align:center; font-weight:700; font-size:11pt; padding:2px; }
    .kd-govde-tablo td, .kd-govde-tablo th { border:1px solid #000; text-align:center; font-size:8pt; padding:2px; }
    .kd-th-sabit { font-weight:700; background:#f0f0f0; }
    .kd-kazanim-baslik { font-weight:700; background:#f0f0f0; }
    .kd-grup-th { font-weight:700; background:#f7f7f7; font-size:7.5pt; }
    .kd-kriter-th { width:20px; height:90px; vertical-align:bottom; padding:2px 0; }
    .kd-donen-yazi { writing-mode: vertical-rl; transform: rotate(180deg); font-size:7pt; font-weight:400; white-space:nowrap; margin:0 auto; }
    .kd-donen-yazi-th { width:24px; }
    .kd-sinif-kutu { text-align:center; font-weight:700; padding:4px; width:40px; }
    .kd-olcutler-dikey { writing-mode:vertical-rl; transform:rotate(180deg); font-weight:700; font-size:10pt; margin-bottom:4px; display:inline-block; }
    .kd-lejant-tablo td { border:1px solid #000; font-size:7pt; padding:1px 3px; }
    .kd-lejant-no { font-weight:700; text-align:center; width:14px; }
    .kd-lejant-etiket { text-align:left; }
    .kd-sira { width:22px; } .kd-no { width:30px; } .kd-ad { text-align:left !important; min-width:120px; font-weight:600; }
    .kd-puan { font-weight:600; }
    .kd-toplam { font-weight:700; background:#f0f0f0; }
    .kd-alt-tablo { margin-top:10mm; }
    .kd-imza-hucre { text-align:center; width:50%; font-weight:700; font-size:10pt; border:none; padding-top:6mm; }
    .kd-unvan { font-weight:400; font-size:9pt; margin-top:1mm; }
    @media print { .kd-sayfa { padding:8mm; } }
    `;
  }

  function _tumCizelgelerHtml() {
    const parcalar = [];
    _state.bloklar
      .filter(blok => blok.ders && blok.sinif) // DÜZELTME: ders/sınıf seçilmemiş bloklar atlanır
      .forEach(blok => {
        const notAdlari = _state.notSutunlari.filter(n => n.sutun).map(n => n.ad)
          .filter(notAd => blok.ogrenciler.some(o => o.notlar[notAd] !== null && o.notlar[notAd] !== undefined));
        notAdlari.forEach(notAd => parcalar.push(_cizelgeHtml(blok, notAd)));
      });
    return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Kriter Puan Dağıtım Çizelgeleri</title>
      <style>${_kdStilBlogu()}</style></head><body>${parcalar.join('') || '<p style="padding:20px;">Ders/Sınıf seçilmiş hiçbir liste bulunamadı.</p>'}</body></html>`;
  }

  /* ================================================================
     OVERLAY / SİHİRBAZ ARAYÜZÜ
     ================================================================ */
  function _overlayOlustur() {
    const eski = document.getElementById('kdOverlay');
    if (eski) eski.remove();
    const ov = document.createElement('div');
    ov.id = 'kdOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#525659;display:flex;flex-direction:column;';
    ov.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:linear-gradient(135deg,#1b5e20,#2e7d32);color:#fff;padding:10px 14px;flex-wrap:wrap;">
        <span style="font-weight:700;font-size:14px;">📊 Kriter Puan Dağıtım Aracı</span>
        <div style="display:flex;gap:8px;">
          <button id="kdOlcutDuzenleBtn" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:700;">⚙️ Ölçütleri Düzenle</button>
          <button id="kdKapatBtn" style="background:rgba(220,0,0,.4);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">✕ Kapat</button>
        </div>
      </div>
      <div id="kdGovde" style="flex:1 1 auto;overflow:auto;padding:16px;display:flex;justify-content:center;align-items:flex-start;"></div>
    `;
    document.body.appendChild(ov);
    document.body.classList.add('dlk-overlay-acik');
    if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

    ov.querySelector('#kdKapatBtn').onclick = () => {
      ov.remove();
      document.body.classList.remove('dlk-overlay-acik');
      if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
    };
    ov.querySelector('#kdOlcutDuzenleBtn').onclick = () => _olcutModaliAc(ov);

    return ov;
  }

  function _panel(ov) { return ov.querySelector('#kdGovde'); }
  function _kutu(icHtml) {
    return `<div style="background:#fff;border-radius:10px;padding:18px;max-width:480px;width:100%;box-shadow:0 4px 14px rgba(0,0,0,.3);font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;">${icHtml}</div>`;
  }
  const _girdi = (id, deger, placeholder) =>
    `<input id="${id}" value="${escapeHtml(deger || '')}" placeholder="${escapeHtml(placeholder || '')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:12px;">`;
  const _etiket = (metin) => `<label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">${metin}</label>`;

  /* ---- Adım 1: Genel Bilgiler ---- */
  function _adim1Render(ov) {
    const ogretmenSecenekleri = (typeof ogretmenler !== 'undefined' ? ogretmenler : []).slice()
      .sort((a, b) => `${a.ad} ${a.soyad}`.localeCompare(`${b.ad} ${b.soyad}`, 'tr'))
      .map(o => `<option value="${o.id}" ${_state.ogretmenId === o.id ? 'selected' : ''}>${escapeHtml(o.ad + ' ' + o.soyad)}</option>`).join('');

    _panel(ov).innerHTML = _kutu(`
      <h3 style="font-size:15px;margin-bottom:14px;color:#1b5e20;">1/4 — Genel Bilgiler</h3>
      ${_etiket('Eğitim-Öğretim Yılı')}${_girdi('kd_yil', _state.egitimYili, 'örn: 2025-2026')}
      ${_etiket('Dönem')}
      <select id="kd_donem" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:12px;">
        <option value="1. Dönem" ${_state.donem === '1. Dönem' ? 'selected' : ''}>1. Dönem</option>
        <option value="2. Dönem" ${_state.donem === '2. Dönem' ? 'selected' : ''}>2. Dönem</option>
      </select>
      ${_etiket('Öğretmen')}
      <select id="kd_ogretmen" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:12px;">
        <option value="">— Öğretmen seçin —</option>${ogretmenSecenekleri}
      </select>
      ${_etiket('Branşı')}${_girdi('kd_brans', _state.brans, 'öğretmen seçilince otomatik dolar')}
      ${_etiket('Okul Adı')}${_girdi('kd_okul', _state.okulAdi)}
      ${_etiket('Müdür Adı')}${_girdi('kd_mudur', _state.muduAdi)}
      <button id="kd_ileri1" style="width:100%;padding:10px;border:none;background:#1b5e20;color:#fff;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;margin-top:6px;">İleri →</button>
    `);
    ov.querySelector('#kd_ogretmen').onchange = (e) => {
      const o = (typeof ogretmenler !== 'undefined') ? ogretmenler.find(x => x.id === e.target.value) : null;
      _state.ogretmenId = e.target.value;
      if (o) { _state.ogretmenAdi = `${o.ad} ${o.soyad}`; _state.brans = o.brans || ''; ov.querySelector('#kd_brans').value = _state.brans; }
    };
    ov.querySelector('#kd_ileri1').onclick = () => {
      _state.egitimYili = ov.querySelector('#kd_yil').value.trim();
      _state.donem = ov.querySelector('#kd_donem').value;
      _state.brans = ov.querySelector('#kd_brans').value.trim();
      _state.okulAdi = ov.querySelector('#kd_okul').value.trim();
      _state.muduAdi = ov.querySelector('#kd_mudur').value.trim();
      if (!_state.ogretmenAdi) { toast('Öğretmen seçin.'); return; }
      _state.adim = 2;
      _render(ov);
    };
  }

  /* ---- Adım 2: Excel Yükleme ---- */
  // DÜZELTME: Sütun eşleme artık her seferinde SORULMUYOR — kullanıcının
  // daha önce belirttiği sabit sütunlar kullanılıyor: A=sıra, C=isim,
  // 1.Dönem'de J/K/L, 2.Dönem'de W/X/Y = 1./2./3. Etkinlik notları.
  function _sabitSutunEslemesiUygula() {
    _state.siraSutunu = 'A';
    _state.isimSutunu = 'C';
    _state.notSutunlari = (_state.donem === '2. Dönem')
      ? [{ sutun: 'W', ad: '1. Etkinlik Notu' }, { sutun: 'X', ad: '2. Etkinlik Notu' }, { sutun: 'Y', ad: '3. Etkinlik Notu' }]
      : [{ sutun: 'J', ad: '1. Etkinlik Notu' }, { sutun: 'K', ad: '2. Etkinlik Notu' }, { sutun: 'L', ad: '3. Etkinlik Notu' }];
  }

  function _adim2Render(ov) {
    _panel(ov).innerHTML = _kutu(`
      <h3 style="font-size:15px;margin-bottom:14px;color:#1b5e20;">2/4 — Excel Dosyası Yükle</h3>
      <p style="font-size:12.5px;color:#666;margin-bottom:12px;">e-Okul'dan indirdiğin not döküm dosyasını (.xls/.xlsx) seç. Aynı dosyada birden fazla sınıf/ders listesi varsa hepsi otomatik ayrıştırılacak.</p>
      <input id="kd_dosya" type="file" style="width:100%;margin-bottom:14px;">
      <p style="font-size:11px;color:#999;margin:-10px 0 12px;">Dosya seçme ekranında filtre yok — her türlü dosya listelenir, .xls/.xlsx olmayanı seçersen ayrıştırma hatası verir.</p>
      <div style="display:flex;gap:8px;">
        <button id="kd_geri2" style="flex:1;padding:10px;border:1px solid #ccc;background:#fff;border-radius:6px;font-size:14px;cursor:pointer;">← Geri</button>
        <button id="kd_ileri2" style="flex:2;padding:10px;border:none;background:#1b5e20;color:#fff;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;">İleri →</button>
      </div>
    `);
    ov.querySelector('#kd_geri2').onclick = () => { _state.adim = 1; _render(ov); };
    ov.querySelector('#kd_ileri2').onclick = async () => {
      const dosya = ov.querySelector('#kd_dosya').files[0];
      if (!dosya) { toast('Bir dosya seçin.'); return; }
      try {
        const buf = await dosya.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        _state.aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
        _sabitSutunEslemesiUygula();
        await _excelOkuVeBlokla();
        if (!_state.bloklar.length) { toast('Hiç blok/liste bulunamadı — sütun eşlemesi bu dosyayla uyuşmuyor olabilir.'); return; }
        _state.adim = 3;
        _render(ov);
      } catch (e) { toast('Dosya okunamadı: ' + e.message); }
    };
  }

  /* ---- Adım 3: Sütun Eşleme ---- */
  /* ---- Adım 3: Blok Başına Ders/Sınıf Seçimi ---- */
  function _adim3Render(ov) {
    const dersSecenekleri = (typeof dersListesi !== 'undefined' ? dersListesi : []).map(d => `<option value="${escapeHtml(d.ad)}">${escapeHtml(d.ad)}</option>`).join('');
    const sinifSecenekleri = (typeof siniflar !== 'undefined' ? siniflar : []).slice()
      .sort((a, b) => `${a.seviye || ''}${a.sube || ''}`.localeCompare(`${b.seviye || ''}${b.sube || ''}`, 'tr'))
      .map(s => `<option value="${escapeHtml(s.ad || (s.seviye + '/' + s.sube))}">${escapeHtml(s.ad || (s.seviye + '/' + s.sube))}</option>`).join('');

    const blokKartlari = _state.bloklar.map((b, i) => `
      <div style="border:1px solid #ddd;border-radius:8px;padding:10px;margin-bottom:10px;">
        <div style="font-weight:700;font-size:12.5px;margin-bottom:8px;">Liste ${i + 1} — ${b.ogrenciler.length} öğrenci <span style="font-weight:400;color:#888;">(örn: ${escapeHtml(b.ogrenciler[0]?.ad || '')})</span></div>
        <div style="display:flex;gap:6px;">
          <select class="kd_blokDers" data-i="${i}" style="flex:1;padding:6px 7px;border:1px solid #ccc;border-radius:6px;font-size:12.5px;">
            <option value="">— Ders seç —</option>${dersSecenekleri}
          </select>
          <select class="kd_blokSinif" data-i="${i}" style="flex:1;padding:6px 7px;border:1px solid #ccc;border-radius:6px;font-size:12.5px;">
            <option value="">— Sınıf seç —</option>${sinifSecenekleri}
          </select>
        </div>
      </div>`).join('');

    _panel(ov).innerHTML = _kutu(`
      <h3 style="font-size:15px;margin-bottom:14px;color:#1b5e20;">3/4 — Bulunan Listeler (${_state.bloklar.length})</h3>
      <p style="font-size:12px;color:#666;margin-bottom:12px;">Her liste için hangi ders ve sınıfa ait olduğunu seç.</p>
      <div id="kd_bloklar">${blokKartlari}</div>
      <div style="display:flex;gap:8px;margin-top:6px;">
        <button id="kd_geri4" style="flex:1;padding:10px;border:1px solid #ccc;background:#fff;border-radius:6px;font-size:14px;cursor:pointer;">← Geri</button>
        <button id="kd_ileri4" style="flex:2;padding:10px;border:none;background:#1b5e20;color:#fff;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;">Çizelgeleri Oluştur →</button>
      </div>
    `);
    ov.querySelectorAll('.kd_blokDers').forEach(el => { el.onchange = (e) => { _state.bloklar[+e.target.dataset.i].ders = e.target.value; }; });
    ov.querySelectorAll('.kd_blokSinif').forEach(el => { el.onchange = (e) => { _state.bloklar[+e.target.dataset.i].sinif = e.target.value; }; });
    ov.querySelector('#kd_geri4').onclick = () => { _state.adim = 2; _render(ov); };
    ov.querySelector('#kd_ileri4').onclick = () => {
      if (!_state.bloklar.some(b => b.ders && b.sinif)) { toast('En az bir liste için Ders ve Sınıf seçmelisin.'); return; }
      _state.adim = 4; _render(ov);
    };
  }

  /* ---- Adım 4: Önizleme + Yazdır ---- */
  function _adim4Render(ov) {
    const govde = _panel(ov);
    govde.style.alignItems = 'flex-start';
    govde.innerHTML = `
      <div style="width:100%;max-width:900px;">
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <button id="kd_geri5" style="padding:9px 14px;border:1px solid #ccc;background:#fff;border-radius:6px;font-size:13px;cursor:pointer;">← Geri</button>
          <button id="kd_yenidenDagit" style="padding:9px 14px;border:1px solid #1b5e20;color:#1b5e20;background:#fff;border-radius:6px;font-size:13px;cursor:pointer;">🔀 Dağılımı Yenile</button>
          <button id="kd_yazdir" style="padding:9px 14px;border:none;background:#1b5e20;color:#fff;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">🖨️ Yazdır / PDF</button>
        </div>
        <iframe id="kd_frame" style="width:100%;min-height:600px;border:none;background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.4);"></iframe>
      </div>
    `;
    const frame = govde.querySelector('#kd_frame');
    frame.srcdoc = _tumCizelgelerHtml();

    govde.querySelector('#kd_geri5').onclick = () => { _state.adim = 3; _render(ov); };
    govde.querySelector('#kd_yenidenDagit').onclick = () => { frame.srcdoc = _tumCizelgelerHtml(); };
    govde.querySelector('#kd_yazdir').onclick = () => {
      if (!frame.contentWindow) { toast('Belge henüz yüklenmedi.'); return; }
      if (typeof uygulamaHtmlYazdir === 'function') {
        const html = frame.contentDocument ? frame.contentDocument.documentElement.outerHTML : null;
        if (!html) { toast('İçerik okunamadı.'); return; }
        uygulamaHtmlYazdir(html, 'Kriter_Puan_Dagitim_Cizelgeleri', 'yatay');
        return;
      }
      frame.contentWindow.focus();
      frame.contentWindow.print();
    };
  }

  function _render(ov) {
    if (_state.adim === 1) _adim1Render(ov);
    else if (_state.adim === 2) _adim2Render(ov);
    else if (_state.adim === 3) _adim3Render(ov);
    else if (_state.adim === 4) _adim4Render(ov);
  }

  /* ================================================================
     ÖLÇÜT DÜZENLEME MODALI
     ================================================================ */
  function _olcutModaliAc() {
    const eski = document.getElementById('kdOlcutModal');
    if (eski) eski.remove();

    const taslak = JSON.parse(JSON.stringify(_kriterAyari));

    const modal = document.createElement('div');
    modal.id = 'kdOlcutModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `<div style="background:#fff;border-radius:10px;padding:18px;max-width:520px;width:100%;max-height:85vh;overflow:auto;font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;">
      <h3 style="font-size:15px;margin-bottom:14px;color:#1b5e20;">⚙️ Ölçütleri Düzenle</h3>

      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <div style="flex:1;">
          <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">Puan Aralığı (min)</label>
          <input id="kd_om_min" type="number" value="${taslak.puanMin}" style="width:100%;padding:6px 7px;border:1px solid #ccc;border-radius:6px;">
        </div>
        <div style="flex:1;">
          <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">Puan Aralığı (max)</label>
          <input id="kd_om_max" type="number" value="${taslak.puanMax}" style="width:100%;padding:6px 7px;border:1px solid #ccc;border-radius:6px;">
        </div>
      </div>

      <div style="font-size:12px;font-weight:700;color:#555;margin-bottom:6px;">Puan Karşılıkları (etiketler)</div>
      <div id="kd_om_etiketler" style="margin-bottom:14px;"></div>

      <div style="font-size:12px;font-weight:700;color:#555;margin-bottom:6px;">Kriter Grupları</div>
      <div id="kd_om_gruplar" style="margin-bottom:10px;"></div>
      <button id="kd_om_grupEkle" style="width:100%;padding:7px;border:1px dashed #999;background:#f7f7f7;border-radius:6px;font-size:12.5px;cursor:pointer;margin-bottom:14px;">➕ Grup Ekle</button>

      <div style="display:flex;gap:8px;">
        <button id="kd_om_vazgec" style="flex:1;padding:10px;border:1px solid #ccc;background:#fff;border-radius:6px;font-size:14px;cursor:pointer;">Vazgeç</button>
        <button id="kd_om_kaydet" style="flex:2;padding:10px;border:none;background:#1b5e20;color:#fff;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;">Kaydet</button>
      </div>
    </div>`;
    document.body.appendChild(modal);

    function etiketleriRenderEt() {
      const puanSayisi = (taslak.puanMax - taslak.puanMin + 1);
      while (taslak.puanEtiketleri.length < puanSayisi) taslak.puanEtiketleri.push('');
      taslak.puanEtiketleri.length = Math.max(puanSayisi, 0);
      modal.querySelector('#kd_om_etiketler').innerHTML = taslak.puanEtiketleri.map((et, i) => `
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:5px;">
          <span style="width:22px;text-align:center;font-weight:700;font-size:12.5px;">${taslak.puanMin + i}</span>
          <input class="kd_om_etiket" data-i="${i}" value="${escapeHtml(et)}" style="flex:1;padding:5px 7px;border:1px solid #ccc;border-radius:6px;font-size:12.5px;">
        </div>`).join('');
      modal.querySelectorAll('.kd_om_etiket').forEach(el => el.oninput = (e) => { taslak.puanEtiketleri[+e.target.dataset.i] = e.target.value; });
    }

    function gruplariRenderEt() {
      modal.querySelector('#kd_om_gruplar').innerHTML = taslak.gruplar.map((g, gi) => `
        <div style="border:1px solid #ddd;border-radius:8px;padding:8px;margin-bottom:8px;">
          <div style="display:flex;gap:6px;margin-bottom:6px;">
            <input class="kd_om_grupAd" data-gi="${gi}" value="${escapeHtml(g.ad)}" placeholder="Grup adı" style="flex:1;padding:6px 7px;border:1px solid #ccc;border-radius:6px;font-size:12.5px;font-weight:700;">
            <button class="kd_om_grupSil" data-gi="${gi}" style="border:none;background:#fdecea;color:#c0392b;border-radius:6px;width:28px;cursor:pointer;">✕</button>
          </div>
          ${g.kriterler.map((k, ki) => `
            <div style="display:flex;gap:6px;margin-bottom:5px;padding-left:10px;">
              <input class="kd_om_kriter" data-gi="${gi}" data-ki="${ki}" value="${escapeHtml(k)}" style="flex:1;padding:5px 7px;border:1px solid #ccc;border-radius:6px;font-size:12px;">
              <button class="kd_om_kriterSil" data-gi="${gi}" data-ki="${ki}" style="border:none;background:#fdecea;color:#c0392b;border-radius:6px;width:24px;cursor:pointer;font-size:11px;">✕</button>
            </div>`).join('')}
          <button class="kd_om_kriterEkle" data-gi="${gi}" style="width:100%;padding:5px;border:1px dashed #bbb;background:#fff;border-radius:6px;font-size:11.5px;cursor:pointer;margin-top:2px;">+ Kriter Ekle</button>
        </div>`).join('');

      modal.querySelectorAll('.kd_om_grupAd').forEach(el => el.oninput = (e) => { taslak.gruplar[+e.target.dataset.gi].ad = e.target.value; });
      modal.querySelectorAll('.kd_om_grupSil').forEach(el => el.onclick = (e) => { taslak.gruplar.splice(+e.target.dataset.gi, 1); gruplariRenderEt(); });
      modal.querySelectorAll('.kd_om_kriter').forEach(el => el.oninput = (e) => { taslak.gruplar[+e.target.dataset.gi].kriterler[+e.target.dataset.ki] = e.target.value; });
      modal.querySelectorAll('.kd_om_kriterSil').forEach(el => el.onclick = (e) => { taslak.gruplar[+e.target.dataset.gi].kriterler.splice(+e.target.dataset.ki, 1); gruplariRenderEt(); });
      modal.querySelectorAll('.kd_om_kriterEkle').forEach(el => el.onclick = (e) => { taslak.gruplar[+e.target.dataset.gi].kriterler.push('Yeni kriter'); gruplariRenderEt(); });
    }

    modal.querySelector('#kd_om_min').oninput = (e) => { taslak.puanMin = parseInt(e.target.value, 10) || 1; etiketleriRenderEt(); };
    modal.querySelector('#kd_om_max').oninput = (e) => { taslak.puanMax = parseInt(e.target.value, 10) || 5; etiketleriRenderEt(); };
    modal.querySelector('#kd_om_grupEkle').onclick = () => { taslak.gruplar.push({ ad: 'YENİ GRUP', kriterler: ['Yeni kriter'] }); gruplariRenderEt(); };
    modal.querySelector('#kd_om_vazgec').onclick = () => modal.remove();
    modal.querySelector('#kd_om_kaydet').onclick = () => {
      if (taslak.puanMin >= taslak.puanMax) { toast('Min, max\'tan küçük olmalı.'); return; }
      _kriterAyariKaydet(taslak);
      modal.remove();
      toast('Ölçütler kaydedildi.');
    };

    etiketleriRenderEt();
    gruplariRenderEt();
  }

  /* ================================================================
     PUBLIC API
     ================================================================ */
  window.KriterDagitimAraci = {
    ac() {
      _state = _bosState();
      const ov = _overlayOlustur();
      _render(ov);
    }
  };

})();
