/* ====================================================================
   js/proje-degerlendirme.js
   PROJE DEĞERLENDİRME ÖLÇEĞİ (Otomasyon)

   "Kriter Puan Dağıtım Aracı" (js/kriter-dagitim.js) ile aynı temel fikri
   kullanır (nihai not → geriye doğru kriter puanı dağıtımı), ama daha
   basit bir akışı var:
     - Blok tespiti YOK (SIRA sütununda 1'e dönüş aranmaz).
     - Excel'in TAMAMI taranır; sadece PROJE NOTU sütunu (1.Dönem'de H,
       2.Dönem'de U) dolu olan satırlar alınır, boş olanlar atlanır.
     - Bulunan tüm öğrenciler (hangi ders bloğundan geldiğine bakılmaksızın)
       TEK bir çizelgede birleştirilir.
     - Ders seçimi YOK, sadece TEK bir sınıf seçilir (Genel Bilgiler'de).

   Kriterleri "Kriter Puan Dağıtım Aracı"ndan bağımsız, kendi ölçütleri
   var (ayrı localStorage anahtarı) — çünkü proje değerlendirmesi farklı
   kazanımlara bakar.

   Mimari not (bkz. docs/Pragmatik-Mimari-Tasarimi.md §2): Bu modül de
   Firestore/Storage'a hiç dokunmaz, tamamen tarayıcıda çalışır — repository/
   service katmanına ihtiyaç yok (kriter-dagitim.js ile aynı gerekçe).
   ==================================================================== */

(function() {
  'use strict';

  const LS_ANAHTAR = 'projeDagitimAyarlari';

  function _varsayilanKriterAyari() {
    return {
      puanMin: 1,
      puanMax: 5,
      puanEtiketleri: ['ZAYIF', 'KABUL EDİLEBİLİR', 'ORTA', 'İYİ', 'ÇOK İYİ'],
      gruplar: [
        { ad: '1.PROJE PLANLAMA', kriterler: ['Proje konusunu ve amacını açıkça belirler.', 'Çalışma takvimini planlar.'] },
        { ad: '2.ARAŞTIRMA VE KAYNAK KULLANIMI', kriterler: ['Konuyla ilgili güvenilir kaynaklara ulaşır.', 'Topladığı bilgileri düzenler ve yorumlar.'] },
        { ad: '3.ÜRÜN VE İÇERİK', kriterler: ['Proje ürünü amaca uygun ve özgündür.', 'İçerik konuya uygun ve yeterince derinliklidir.'] },
        { ad: '4.SUNUM', kriterler: ['Projesini açık ve anlaşılır şekilde sunar.', 'Sorulan sorulara uygun yanıtlar verir.'] }
      ]
    };
  }

  function _kriterAyariYukle() {
    try {
      const ham = localStorage.getItem(LS_ANAHTAR);
      if (ham) return JSON.parse(ham);
    } catch (e) { /* yoksay */ }
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

  function _harfdenIndexe(harf) {
    harf = (harf || '').toUpperCase().trim();
    let sonuc = 0;
    for (let i = 0; i < harf.length; i++) sonuc = sonuc * 26 + (harf.charCodeAt(i) - 64);
    return sonuc - 1;
  }

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

  function _varsayilanEgitimYili() {
    const d = new Date();
    const ay = d.getMonth() + 1;
    const yil = d.getFullYear();
    return (ay >= 8) ? `${yil}-${yil + 1}` : `${yil - 1}-${yil}`;
  }
  function _getOkulAdi() {
    if (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) return okulBilgileriAyari.okulAdi;
    return 'KORUK İLK - ORTAOKULU';
  }
  function _varsayilanMuduAdi() {
    const okul = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari) || {};
    if (!okul.mudurId || typeof ogretmenler === 'undefined') return '';
    const o = ogretmenler.find(x => x.id === okul.mudurId);
    return o ? `${o.ad} ${o.soyad}` : '';
  }

  /* ================================================================
     STATE
     ================================================================ */
  function _bosState() {
    return {
      adim: 1,
      egitimYili: _varsayilanEgitimYili(),
      donem: '1. Dönem',
      ogretmenId: '', ogretmenAdi: '', brans: '',
      okulAdi: _getOkulAdi(), muduAdi: _varsayilanMuduAdi(),
      ders: '',
      aoa: null,
      ogrenciler: [] // { no, ad, notu }
    };
  }
  let _state = null;

  /* ================================================================
     EXCEL'İN TAMAMINI TARAYIP PROJE NOTU DOLU SATIRLARI TOPLAMA
     (blok tespiti YOK — sıra sütunu aranmaz)
     ================================================================ */
  function _projeSutunuBul() {
    return (_state.donem === '2. Dönem') ? 'U' : 'H';
  }

  function _excelTara() {
    const isimIdx = _harfdenIndexe('C');
    const noIdx = _harfdenIndexe('B');
    const notIdx = _harfdenIndexe(_projeSutunuBul());
    const aoa = _state.aoa;
    const ogrenciler = [];

    for (let r = 0; r < aoa.length; r++) {
      const satir = aoa[r] || [];
      const ad = (satir[isimIdx] || '').toString().trim();
      if (!ad) continue;
      const ham = satir[notIdx];
      const sayi = (typeof ham === 'number') ? ham : parseFloat((ham || '').toString().replace(',', '.'));
      if (isNaN(sayi)) continue; // DÜZELTME: proje notu boşsa bu satır tamamen atlanır
      ogrenciler.push({ no: satir[noIdx] ?? '', ad, notu: sayi });
    }
    _state.ogrenciler = ogrenciler;
  }

  /* ================================================================
     ÇİZELGE HTML (tek, birleşik çizelge)
     ================================================================ */
  function _cizelgeHtml() {
    const kriterler = _tumKriterler();
    const kriterSayisi = kriterler.length;
    const puanMin = _kriterAyari.puanMin, puanMax = _kriterAyari.puanMax;

    const grupBaslikHtml = _kriterAyari.gruplar.map(g =>
      `<th colspan="${g.kriterler.length}" class="pd-grup-th">${escapeHtml(g.ad)}</th>`
    ).join('');
    const kriterBaslikHtml = kriterler.map(k =>
      `<th class="pd-kriter-th"><div class="pd-donen-yazi">${escapeHtml(k.metin)}</div></th>`
    ).join('');

    const satirlarHtml = _state.ogrenciler.map((o, i) => {
      const dagilim = _puanDagit(o.notu, kriterSayisi, puanMin, puanMax);
      const puanHucreleri = dagilim.map(p => `<td class="pd-puan">${p}</td>`).join('');
      return `<tr><td class="pd-sira">${i + 1}</td><td class="pd-no">${escapeHtml(String(o.no))}</td><td class="pd-ad">${escapeHtml(o.ad)}</td>${puanHucreleri}<td class="pd-toplam">${Math.round(o.notu)}</td></tr>`;
    }).join('');

    const olcutLejantYatay = _kriterAyari.puanEtiketleri.map((etiket, i) =>
      `<span class="pd-lejant-ogesi"><b>${puanMin + i}</b> - ${escapeHtml(etiket)}</span>`
    ).join('');

    const govdeHtml = `
    <div class="pd-sayfa">
      <table class="pd-ust-tablo">
        <tr><td colspan="3" class="pd-ust-baslik">${escapeHtml(_state.egitimYili)} EĞİTİM ÖĞRETİM YILI ${escapeHtml(_state.okulAdi.toLocaleUpperCase('tr'))}</td></tr>
        <tr><td colspan="3" class="pd-ust-baslik">${escapeHtml((_state.ders || 'DERS').toLocaleUpperCase('tr'))} DERSİ ${escapeHtml(_state.donem.toLocaleUpperCase('tr'))} PROJE DEĞERLENDİRME ÖLÇEĞİ</td></tr>
      </table>

      <table class="pd-govde-tablo">
        <tr>
          <td class="pd-th-sabit" rowspan="3">SIRA</td>
          <td class="pd-th-sabit" rowspan="3">NO</td>
          <td class="pd-th-sabit pd-ad-basligi" rowspan="3">ADI SOYADI</td>
          <td colspan="${kriterSayisi}" class="pd-kazanim-baslik">Öğrencide Gözlenecek Kazanımlar</td>
          <td class="pd-th-sabit pd-donen-yazi-th" rowspan="3"><div class="pd-donen-yazi">PROJE PUANI</div></td>
        </tr>
        <tr>${grupBaslikHtml}</tr>
        <tr>${kriterBaslikHtml}</tr>
        ${satirlarHtml}
      </table>

      <div class="pd-lejant-not"><b>ÖLÇÜTLER:</b> ${olcutLejantYatay}</div>

      <table class="pd-alt-tablo">
        <tr>
          <td class="pd-imza-hucre">
            <div>${escapeHtml(_state.ogretmenAdi)}</div>
            <div class="pd-unvan">${escapeHtml(((_state.brans || '').replace(/\s*öğretmeni\s*$/i, '').trim()).toLocaleUpperCase('tr'))} ÖĞRETMENİ</div>
          </td>
          <td class="pd-imza-hucre">
            <div>${escapeHtml(_state.muduAdi)}</div>
            <div class="pd-unvan">OKUL MÜDÜRÜ</div>
          </td>
        </tr>
      </table>
    </div>`;

    return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Proje Değerlendirme Ölçeği</title>
      <style>${_pdStilBlogu()}</style></head><body>${govdeHtml}</body></html>`;
  }

  function _pdStilBlogu() {
    return `
    * { box-sizing:border-box; }
    body { font-family:Arial,sans-serif; margin:0; padding:0; background:#fff; }
    .pd-sayfa { width:100%; padding:10mm; }
    table { border-collapse:collapse; width:100%; }
    .pd-ust-tablo { margin-bottom:2mm; }
    .pd-ust-baslik { text-align:center; font-weight:700; font-size:11pt; padding:2px; }
    .pd-govde-tablo td, .pd-govde-tablo th { border:1px solid #000; text-align:center; font-size:8pt; padding:2px; }
    .pd-th-sabit { font-weight:700; background:#f0f0f0; }
    .pd-ad-basligi { text-align:left !important; vertical-align:bottom !important; padding:4px 6px !important; }
    .pd-kazanim-baslik { font-weight:700; background:#f0f0f0; }
    .pd-grup-th { font-weight:700; background:#f7f7f7; font-size:7.5pt; }
    .pd-kriter-th { width:20px; height:65px; vertical-align:bottom; padding:2px 0; }
    .pd-donen-yazi { writing-mode: vertical-rl; transform: rotate(180deg); font-size:7pt; font-weight:400; white-space:nowrap; margin:0 auto; }
    .pd-donen-yazi-th { width:24px; }
    .pd-sira { width:22px; } .pd-no { width:30px; } .pd-ad { text-align:left !important; min-width:120px; font-weight:600; }
    .pd-puan { font-weight:600; }
    .pd-toplam { font-weight:700; background:#f0f0f0; }
    .pd-lejant-not { font-size:8pt; margin:2mm 0 4mm; padding:3px 0; border-bottom:1px solid #000; }
    .pd-lejant-ogesi { margin-right:10px; white-space:nowrap; }
    .pd-alt-tablo { margin-top:10mm; }
    .pd-imza-hucre { text-align:center; width:50%; font-weight:700; font-size:10pt; border:none; padding-top:6mm; }
    .pd-unvan { font-weight:400; font-size:9pt; margin-top:1mm; }
    `;
  }

  /* ================================================================
     OVERLAY / SİHİRBAZ ARAYÜZÜ
     ================================================================ */
  function _overlayOlustur() {
    const eski = document.getElementById('pdOverlay');
    if (eski) eski.remove();
    const ov = document.createElement('div');
    ov.id = 'pdOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#525659;display:flex;flex-direction:column;';
    ov.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:linear-gradient(135deg,#1b5e20,#2e7d32);color:#fff;padding:10px 14px;flex-wrap:wrap;">
        <span style="font-weight:700;font-size:14px;">📐 Proje Değerlendirme Ölçeği</span>
        <div style="display:flex;gap:8px;">
          <button id="pdOlcutDuzenleBtn" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:700;">⚙️ Ölçütleri Düzenle</button>
          <button id="pdKapatBtn" style="background:rgba(220,0,0,.4);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">✕ Kapat</button>
        </div>
      </div>
      <div id="pdGovde" style="flex:1 1 auto;overflow:auto;padding:16px;display:flex;justify-content:center;align-items:flex-start;"></div>
    `;
    document.body.appendChild(ov);
    document.body.classList.add('dlk-overlay-acik');
    if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

    ov.querySelector('#pdKapatBtn').onclick = () => {
      ov.remove();
      document.body.classList.remove('dlk-overlay-acik');
      if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
    };
    ov.querySelector('#pdOlcutDuzenleBtn').onclick = () => _olcutModaliAc();

    return ov;
  }

  function _panel(ov) { return ov.querySelector('#pdGovde'); }
  function _kutu(icHtml) {
    return `<div style="background:#fff;border-radius:10px;padding:18px;max-width:480px;width:100%;box-shadow:0 4px 14px rgba(0,0,0,.3);font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;">${icHtml}</div>`;
  }
  const _girdi = (id, deger, placeholder) =>
    `<input id="${id}" value="${escapeHtml(deger || '')}" placeholder="${escapeHtml(placeholder || '')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:12px;">`;
  const _etiket = (metin) => `<label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">${metin}</label>`;

  /* ---- Adım 1: Genel Bilgiler + Ders Seçimi ---- */
  function _adim1Render(ov) {
    if (!_state.okulAdi) _state.okulAdi = _getOkulAdi();
    if (!_state.muduAdi) _state.muduAdi = _varsayilanMuduAdi();

    const ogretmenSecenekleri = (typeof ogretmenler !== 'undefined' ? ogretmenler : []).slice()
      .sort((a, b) => `${a.ad} ${a.soyad}`.localeCompare(`${b.ad} ${b.soyad}`, 'tr'))
      .map(o => `<option value="${o.id}" ${_state.ogretmenId === o.id ? 'selected' : ''}>${escapeHtml(o.ad + ' ' + o.soyad)}</option>`).join('');
    const dersSecenekleri = (typeof dersListesi !== 'undefined' ? dersListesi : [])
      .map(d => `<option value="${escapeHtml(d.ad)}" ${_state.ders === d.ad ? 'selected' : ''}>${escapeHtml(d.ad)}</option>`).join('');

    _panel(ov).innerHTML = _kutu(`
      <h3 style="font-size:15px;margin-bottom:14px;color:#1b5e20;">1/3 — Genel Bilgiler</h3>
      ${_etiket('Eğitim-Öğretim Yılı')}${_girdi('pd_yil', _state.egitimYili, 'örn: 2025-2026')}
      ${_etiket('Dönem (proje notu sütununu belirler: 1.Dönem→H, 2.Dönem→U)')}
      <select id="pd_donem" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:12px;">
        <option value="1. Dönem" ${_state.donem === '1. Dönem' ? 'selected' : ''}>1. Dönem</option>
        <option value="2. Dönem" ${_state.donem === '2. Dönem' ? 'selected' : ''}>2. Dönem</option>
      </select>
      ${_etiket('Ders')}
      <select id="pd_ders" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:12px;">
        <option value="">— Ders seçin —</option>${dersSecenekleri}
      </select>
      ${_etiket('Öğretmen')}
      <select id="pd_ogretmen" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;margin-bottom:12px;">
        <option value="">— Öğretmen seçin —</option>${ogretmenSecenekleri}
      </select>
      ${_etiket('Branşı')}${_girdi('pd_brans', _state.brans, 'öğretmen seçilince otomatik dolar')}
      ${_etiket('Okul Adı')}${_girdi('pd_okul', _state.okulAdi)}
      ${_etiket('Müdür Adı')}${_girdi('pd_mudur', _state.muduAdi)}
      <button id="pd_ileri1" style="width:100%;padding:10px;border:none;background:#1b5e20;color:#fff;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;margin-top:6px;">İleri →</button>
    `);
    ov.querySelector('#pd_ogretmen').onchange = (e) => {
      const o = (typeof ogretmenler !== 'undefined') ? ogretmenler.find(x => x.id === e.target.value) : null;
      _state.ogretmenId = e.target.value;
      if (o) { _state.ogretmenAdi = `${o.ad} ${o.soyad}`; _state.brans = o.brans || ''; ov.querySelector('#pd_brans').value = _state.brans; }
    };
    ov.querySelector('#pd_ileri1').onclick = () => {
      _state.egitimYili = ov.querySelector('#pd_yil').value.trim();
      _state.donem = ov.querySelector('#pd_donem').value;
      _state.ders = ov.querySelector('#pd_ders').value;
      _state.brans = ov.querySelector('#pd_brans').value.trim();
      _state.okulAdi = ov.querySelector('#pd_okul').value.trim();
      _state.muduAdi = ov.querySelector('#pd_mudur').value.trim();
      if (!_state.ogretmenAdi) { toast('Öğretmen seçin.'); return; }
      if (!_state.ders) { toast('Ders seçin.'); return; }
      _state.adim = 2;
      _render(ov);
    };
  }

  /* ---- Adım 2: Excel Yükleme ---- */
  function _adim2Render(ov) {
    _panel(ov).innerHTML = _kutu(`
      <h3 style="font-size:15px;margin-bottom:14px;color:#1b5e20;">2/3 — Excel Dosyası Yükle</h3>
      <p style="font-size:12.5px;color:#666;margin-bottom:12px;">e-Okul'dan indirdiğin not döküm dosyasını seç. Dosyanın tamamı taranır; sadece proje notu (${_projeSutunuBul()} sütunu) dolu olan öğrenciler alınır, boş olanlar atlanır.</p>
      <input id="pd_dosya" type="file" style="width:100%;margin-bottom:14px;">
      <div style="display:flex;gap:8px;">
        <button id="pd_geri2" style="flex:1;padding:10px;border:1px solid #ccc;background:#fff;border-radius:6px;font-size:14px;cursor:pointer;">← Geri</button>
        <button id="pd_ileri2" style="flex:2;padding:10px;border:none;background:#1b5e20;color:#fff;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;">Tara ve Devam Et →</button>
      </div>
    `);
    ov.querySelector('#pd_geri2').onclick = () => { _state.adim = 1; _render(ov); };
    ov.querySelector('#pd_ileri2').onclick = async () => {
      const dosya = ov.querySelector('#pd_dosya').files[0];
      if (!dosya) { toast('Bir dosya seçin.'); return; }
      try {
        const buf = await dosya.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        _state.aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
        _excelTara();
        if (!_state.ogrenciler.length) { toast(`${_projeSutunuBul()} sütununda dolu not bulunamadı.`); return; }
        _state.adim = 3;
        _render(ov);
      } catch (e) { toast('Dosya okunamadı: ' + e.message); }
    };
  }

  /* ---- Adım 3: Önizleme + Yazdır ---- */
  function _adim3Render(ov) {
    const govde = _panel(ov);
    govde.style.alignItems = 'flex-start';
    govde.innerHTML = `
      <div style="width:100%;max-width:900px;">
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;">
          <button id="pd_geri3" style="padding:9px 14px;border:1px solid #ccc;background:#fff;border-radius:6px;font-size:13px;cursor:pointer;">← Geri</button>
          <button id="pd_yenidenDagit" style="padding:9px 14px;border:1px solid #1b5e20;color:#1b5e20;background:#fff;border-radius:6px;font-size:13px;cursor:pointer;">🔀 Dağılımı Yenile</button>
          <button id="pd_yazdir" style="padding:9px 14px;border:none;background:#1b5e20;color:#fff;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">🖨️ Yazdır / PDF</button>
          <span style="font-size:12px;color:#666;">${_state.ogrenciler.length} öğrenci bulundu</span>
        </div>
        <iframe id="pd_frame" style="width:100%;min-height:600px;border:none;background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.4);"></iframe>
      </div>
    `;
    const frame = govde.querySelector('#pd_frame');
    frame.srcdoc = _cizelgeHtml();

    govde.querySelector('#pd_geri3').onclick = () => { _state.adim = 2; _render(ov); };
    govde.querySelector('#pd_yenidenDagit').onclick = () => { frame.srcdoc = _cizelgeHtml(); };
    govde.querySelector('#pd_yazdir').onclick = () => {
      if (!frame.contentWindow) { toast('Belge henüz yüklenmedi.'); return; }
      if (typeof uygulamaHtmlYazdir === 'function') {
        const html = frame.contentDocument ? frame.contentDocument.documentElement.outerHTML : null;
        if (!html) { toast('İçerik okunamadı.'); return; }
        uygulamaHtmlYazdir(html, 'Proje_Degerlendirme_Olcegi', 'yatay');
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
  }

  /* ================================================================
     ÖLÇÜT DÜZENLEME MODALI (kriter-dagitim.js'deki ile aynı desen,
     ama AYRI localStorage anahtarı — bu araç kendi kriterlerine sahip)
     ================================================================ */
  function _olcutModaliAc() {
    const eski = document.getElementById('pdOlcutModal');
    if (eski) eski.remove();

    const taslak = JSON.parse(JSON.stringify(_kriterAyari));

    const modal = document.createElement('div');
    modal.id = 'pdOlcutModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `<div style="background:#fff;border-radius:10px;padding:18px;max-width:520px;width:100%;max-height:85vh;overflow:auto;font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;">
      <h3 style="font-size:15px;margin-bottom:14px;color:#1b5e20;">⚙️ Ölçütleri Düzenle (Proje)</h3>

      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <div style="flex:1;">
          <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">Puan Aralığı (min)</label>
          <input id="pd_om_min" type="number" value="${taslak.puanMin}" style="width:100%;padding:6px 7px;border:1px solid #ccc;border-radius:6px;">
        </div>
        <div style="flex:1;">
          <label style="font-size:12px;font-weight:700;color:#555;display:block;margin-bottom:4px;">Puan Aralığı (max)</label>
          <input id="pd_om_max" type="number" value="${taslak.puanMax}" style="width:100%;padding:6px 7px;border:1px solid #ccc;border-radius:6px;">
        </div>
      </div>

      <div style="font-size:12px;font-weight:700;color:#555;margin-bottom:6px;">Puan Karşılıkları (etiketler)</div>
      <div id="pd_om_etiketler" style="margin-bottom:14px;"></div>

      <div style="font-size:12px;font-weight:700;color:#555;margin-bottom:6px;">Kriter Grupları</div>
      <div id="pd_om_gruplar" style="margin-bottom:10px;"></div>
      <button id="pd_om_grupEkle" style="width:100%;padding:7px;border:1px dashed #999;background:#f7f7f7;border-radius:6px;font-size:12.5px;cursor:pointer;margin-bottom:14px;">➕ Grup Ekle</button>

      <div style="display:flex;gap:8px;">
        <button id="pd_om_vazgec" style="flex:1;padding:10px;border:1px solid #ccc;background:#fff;border-radius:6px;font-size:14px;cursor:pointer;">Vazgeç</button>
        <button id="pd_om_kaydet" style="flex:2;padding:10px;border:none;background:#1b5e20;color:#fff;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;">Kaydet</button>
      </div>
    </div>`;
    document.body.appendChild(modal);

    function etiketleriRenderEt() {
      const puanSayisi = (taslak.puanMax - taslak.puanMin + 1);
      while (taslak.puanEtiketleri.length < puanSayisi) taslak.puanEtiketleri.push('');
      taslak.puanEtiketleri.length = Math.max(puanSayisi, 0);
      modal.querySelector('#pd_om_etiketler').innerHTML = taslak.puanEtiketleri.map((et, i) => `
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:5px;">
          <span style="width:22px;text-align:center;font-weight:700;font-size:12.5px;">${taslak.puanMin + i}</span>
          <input class="pd_om_etiket" data-i="${i}" value="${escapeHtml(et)}" style="flex:1;padding:5px 7px;border:1px solid #ccc;border-radius:6px;font-size:12.5px;">
        </div>`).join('');
      modal.querySelectorAll('.pd_om_etiket').forEach(el => el.oninput = (e) => { taslak.puanEtiketleri[+e.target.dataset.i] = e.target.value; });
    }

    function gruplariRenderEt() {
      modal.querySelector('#pd_om_gruplar').innerHTML = taslak.gruplar.map((g, gi) => `
        <div style="border:1px solid #ddd;border-radius:8px;padding:8px;margin-bottom:8px;">
          <div style="display:flex;gap:6px;margin-bottom:6px;">
            <input class="pd_om_grupAd" data-gi="${gi}" value="${escapeHtml(g.ad)}" placeholder="Grup adı" style="flex:1;padding:6px 7px;border:1px solid #ccc;border-radius:6px;font-size:12.5px;font-weight:700;">
            <button class="pd_om_grupSil" data-gi="${gi}" style="border:none;background:#fdecea;color:#c0392b;border-radius:6px;width:28px;cursor:pointer;">✕</button>
          </div>
          ${g.kriterler.map((k, ki) => `
            <div style="display:flex;gap:6px;margin-bottom:5px;padding-left:10px;">
              <input class="pd_om_kriter" data-gi="${gi}" data-ki="${ki}" value="${escapeHtml(k)}" style="flex:1;padding:5px 7px;border:1px solid #ccc;border-radius:6px;font-size:12px;">
              <button class="pd_om_kriterSil" data-gi="${gi}" data-ki="${ki}" style="border:none;background:#fdecea;color:#c0392b;border-radius:6px;width:24px;cursor:pointer;font-size:11px;">✕</button>
            </div>`).join('')}
          <button class="pd_om_kriterEkle" data-gi="${gi}" style="width:100%;padding:5px;border:1px dashed #bbb;background:#fff;border-radius:6px;font-size:11.5px;cursor:pointer;margin-top:2px;">+ Kriter Ekle</button>
        </div>`).join('');

      modal.querySelectorAll('.pd_om_grupAd').forEach(el => el.oninput = (e) => { taslak.gruplar[+e.target.dataset.gi].ad = e.target.value; });
      modal.querySelectorAll('.pd_om_grupSil').forEach(el => el.onclick = (e) => { taslak.gruplar.splice(+e.target.dataset.gi, 1); gruplariRenderEt(); });
      modal.querySelectorAll('.pd_om_kriter').forEach(el => el.oninput = (e) => { taslak.gruplar[+e.target.dataset.gi].kriterler[+e.target.dataset.ki] = e.target.value; });
      modal.querySelectorAll('.pd_om_kriterSil').forEach(el => el.onclick = (e) => { taslak.gruplar[+e.target.dataset.gi].kriterler.splice(+e.target.dataset.ki, 1); gruplariRenderEt(); });
      modal.querySelectorAll('.pd_om_kriterEkle').forEach(el => el.onclick = (e) => { taslak.gruplar[+e.target.dataset.gi].kriterler.push('Yeni kriter'); gruplariRenderEt(); });
    }

    modal.querySelector('#pd_om_min').oninput = (e) => { taslak.puanMin = parseInt(e.target.value, 10) || 1; etiketleriRenderEt(); };
    modal.querySelector('#pd_om_max').oninput = (e) => { taslak.puanMax = parseInt(e.target.value, 10) || 5; etiketleriRenderEt(); };
    modal.querySelector('#pd_om_grupEkle').onclick = () => { taslak.gruplar.push({ ad: 'YENİ GRUP', kriterler: ['Yeni kriter'] }); gruplariRenderEt(); };
    modal.querySelector('#pd_om_vazgec').onclick = () => modal.remove();
    modal.querySelector('#pd_om_kaydet').onclick = () => {
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
  window.ProjeDegerlendirmeAraci = {
    ac() {
      _state = _bosState();
      const ov = _overlayOlustur();
      _render(ov);
    }
  };

})();
