/* ====================================================================
   js/raporlama.js  (v2.0)
   Seçimli raporlama: Modal ile servis/sınıf seçimi, alan özelleştirmesi,
   Servis raporunda araç koltuk düzeni visual grid, A4 optimizasyonu.
   ==================================================================== */

/* ---------- Yardımcı: Modal Seçim Dialog Aç ---------- */
function _raporModalAc(baslik, icerikleri, onay) {
  const overlay = document.getElementById('modalOverlay');
  const modal = overlay.querySelector('.modal');
  document.getElementById('modalTitle').textContent = baslik;
  const body = document.getElementById('modalBody');
  body.innerHTML = icerikleri;
  document.getElementById('modalSilBtn').style.display = 'none';
  
  document.getElementById('modalKaydetBtn').onclick = onay;
  document.getElementById('modalKaydetBtn').textContent = 'Devam Et';
  overlay.classList.add('active');
}
/* NOT: modalKapat() burada tanımlanmıyor — app.js'teki tek/standart
   modalKapat() (classList.remove('active')) tüm modallar için kullanılıyor.
   Daha önce burada ikinci bir modalKapat() (style.display='none') tanımlıydı;
   script yükleme sırası nedeniyle app.js'teki sürüm onu eziyordu, ama bu rapor
   modalı doğrudan stille açıldığı için "Vazgeç" tıklanınca kapanmıyordu. */

/* ---------- Yardımcı: Rapor Penceresi Aç (A4 Optimize) ---------- */
function _raporPenceresiniAc(htmlIcerik, baslik, secenekler) {
  secenekler = secenekler || {};
  const logoGoster   = secenekler.logoGoster !== false;
  const ortaliBaslik = !!secenekler.ortaliBaslik;
  const servisRaporu = !!secenekler.servisRaporu;

  const okulAdi  = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) || 'Okul Yönetim Paneli';
  const tarih    = new Date().toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' });
  const logoSrc  = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'assets/logo.png';
  const logoHtml = logoGoster ? `<img src="${logoSrc}" alt="" style="height:28px;object-fit:contain;" onerror="this.style.display='none'">` : '';

  const tamHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${baslik} — ${okulAdi}</title>
  <style>
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact; }
    @page { size: A4 portrait; margin: 0; }
    body { font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; font-size:10px; color:#1a1a1a; background:#fff; line-height:1.4; }

    ${servisRaporu ? `
    @page { size: A4 portrait; margin: 8mm; }
    body { background: #fff; }
    ` : `
    @page { size: A4 portrait; margin: 5mm 7mm; }
    `}

    .rapor-header { display:flex; align-items:center; gap:6px; border-bottom:1.5px solid #0A6E6E; padding-bottom:3px; margin-bottom:4px; }
    .rapor-header-text { flex:1; }
    .rapor-header-text h1 { font-size:14px; color:#0A6E6E; font-weight:700; line-height:1.2; }
    .rapor-header-text h2 { font-size:8px; color:#555; font-weight:400; margin-top:1px; }
    .rapor-header-text .rapor-tarih { font-size:7px; color:#888; margin-top:0px; }
    .rapor-header.rapor-header-ortali { flex-direction:column; text-align:center; padding-bottom:3px; margin-bottom:4px; }
    .rapor-header-ortali .rapor-header-text h1 { font-size:15px; margin:0 auto; }

    .rapor-toolbar { display:flex; gap:8px; margin-bottom:10px; padding:6px 10px; background:#f3f2ff; border-radius:6px; align-items:center; flex-wrap:wrap; }
    .rapor-toolbar button { padding:6px 14px; border:none; border-radius:5px; cursor:pointer; font-size:12px; font-weight:600; }
    .btn-yazdir { background:#0A6E6E; color:#fff; }
    .btn-paylas { background:#25d366; color:#fff; }
    .btn-kapat  { background:#e5e7eb; color:#374151; }
    .zoom-grup  { display:flex; align-items:center; gap:4px; margin-left:auto; background:#fff; border:1px solid #d1d5db; border-radius:5px; padding:2px 6px; }
    .zoom-grup button { background:none; border:none; font-size:16px; font-weight:700; color:#374151; padding:2px 6px; cursor:pointer; border-radius:4px; line-height:1; }
    .zoom-grup button:hover { background:#f3f4f6; }
    .zoom-label { font-size:11px; color:#555; min-width:36px; text-align:center; font-weight:600; }

    .ozet-kutu { display:inline-block; background:#F0F8F8; border:1px solid #7ABABA; border-radius:5px; padding:3px 8px; font-size:10px; color:#075757; margin:0 5px 10px 0; font-weight:500; }
    .bolum-baslik { background:#E6F4F4; color:#0A6E6E; font-weight:700; font-size:11.5px; padding:4px 8px; margin:12px 0 8px; border-left:3px solid #0A6E6E; border-radius:0 3px 3px 0; }
    table { width:100%; border-collapse:collapse; margin-bottom:12px; }
    thead tr { background:#0A6E6E; color:#fff; }
    thead th { padding:5px 7px; text-align:left; font-size:10px; font-weight:700; }
    tbody tr:nth-child(even) { background:#f9f8ff; }
    td { padding:4px 7px; border-bottom:1px solid #e5e7eb; font-size:10.5px; }
    .nobet-sik table { margin-bottom:6px; }
    .nobet-sik thead th { padding:2.5px 5px; font-size:8.5px; }
    .nobet-sik tbody td { padding:1.5px 5px; font-size:8px; line-height:1.15; }
    .nobet-sik .bolum-baslik { margin:6px 0 4px; padding:3px 6px; font-size:9.5px; }
    .nobet-sik .ozet-kutu { margin:0 0 6px 0; padding:2px 7px; }
    .nobet-sik ol { font-size:8px; line-height:1.3; padding-left:16px; }
    .nobet-sik ol li { margin-bottom:1px; }
    .nobet-sik p { font-size:8.5px; margin-top:3px; }

    #icerik-sarici { transform-origin: top center; transition: transform 0.15s ease; }

    @media print {
      .rapor-toolbar { display:none !important; }
      #icerik-sarici { transform: none !important; }
      table { page-break-inside:auto; }
      tr { page-break-inside:avoid; }
      .sayfa-sonu { page-break-before:always; }
      body { overflow:hidden; }
    }
  </style>
</head>
<body>
  <div class="rapor-toolbar">
    <button class="btn-yazdir" onclick="window.print()">🖨️ Yazdır / PDF İndir</button>
    <button class="btn-paylas" onclick="raporPaylas()">📤 WhatsApp</button>
    <button class="btn-kapat"  onclick="window.close()">✕ Kapat</button>
    <div class="zoom-grup">
      <button onclick="zoomAyarla(-10)" title="Küçült">−</button>
      <span class="zoom-label" id="zoomLabel">100%</span>
      <button onclick="zoomAyarla(+10)" title="Büyüt">+</button>
      <button onclick="zoomSifirla()" title="Sıfırla" style="font-size:12px;color:#6b7280;">↺</button>
    </div>
  </div>
  <script>
    var _zoom = 100;
    function zoomUygula() {
      var el = document.getElementById('icerik-sarici');
      if (el) el.style.transform = 'scale(' + (_zoom/100) + ')';
      document.getElementById('zoomLabel').textContent = _zoom + '%';
    }
    function zoomAyarla(delta) {
      _zoom = Math.min(200, Math.max(30, _zoom + delta));
      zoomUygula();
    }
    function zoomSifirla() { _zoom = 100; zoomUygula(); }
    function raporPaylas() {
      window.print();
      setTimeout(function() {
        var mesaj = encodeURIComponent('Merhaba, servis oturma planını paylaşıyorum.');
        window.location.href = 'whatsapp://send?text=' + mesaj;
      }, 2000);
    }
  <\/script>
  <div id="icerik-sarici">
  <div class="rapor-header${ortaliBaslik ? ' rapor-header-ortali' : ''}">
    ${logoHtml}
    <div class="rapor-header-text">
      <h1>${baslik}</h1>
      ${servisRaporu
        ? `<h2 style="font-size:10px;color:#555;font-weight:400;">${okulAdi}</h2>`
        : `<h2>${okulAdi}</h2><div class="rapor-tarih">Oluşturulma: ${tarih}</div>`}
    </div>
  </div>
  ${htmlIcerik}
  </div>
</body>
</html>`;

  // Blob URL ile aç — gerçek origin, share API çalışır
  try {
    const blob = new Blob([tamHtml], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (!win) throw new Error('popup_blocked');
    // 60 saniye sonra URL'i serbest bırak
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return win;
  } catch(e) {
    // Fallback 1: eski window.open
    try {
      const win = window.open('', '_blank', 'width=950,height=1000');
      if (win) {
        win.document.write(tamHtml);
        win.document.close();
        return win;
      }
    } catch(e2) {}

    // Fallback 2: indirme linki (mobil Chrome popup engeli için)
    try {
      const blob2 = new Blob([tamHtml], { type: 'text/html;charset=utf-8' });
      const url2  = URL.createObjectURL(blob2);
      const a = document.createElement('a');
      a.href = url2;
      a.download = (baslik.replace(/[^\w\s\-·]/g,'').trim() || 'rapor') + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url2), 10000);
      toast('Rapor dosyası indirildi. Dosyayı açarak yazdırabilirsiniz.');
    } catch(e3) {
      toast('Açılır pencere engellendi. Tarayıcı popup iznini açın.');
    }
    return null;
  }
}

/* ================================================================
   1. 📋 Öğrenci Listesi  (Modal seçim + alan özelleştirmesi)
   ================================================================ */
function raporOgrenciListesi() {
  if (!siniflar || !siniflar.length) {
    toast('Sınıf bulunamadı.');
    return;
  }

  const siniflarHtml = siniflar
    .sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'))
    .map(s => `<option value="${s.id}">${escapeHtml(s.ad)}</option>`)
    .join('');

  const alanlarHtml = `
    <div style="margin-bottom: 14px;">
      <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Sınıf Seçin:</label>
      <select id="sinifSec" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 13px;">
        <option value="">— Tüm Sınıflar —</option>
        ${siniflarHtml}
      </select>
    </div>
    <div>
      <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Raporda Gösterilecek Alanlar:</label>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <label style="cursor: pointer;"><input type="checkbox" id="alan_ogrenciAdi" checked> Öğrenci Adı</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_ogrenciNo" checked> Öğrenci No</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_cinsiyet"> Cinsiyet</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_veliAdi" checked> Veli Adı</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_yakinlik"> Yakınlık</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_telefon"> Telefon</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_not"> Not</label>
      </div>
    </div>
  `;

  _raporModalAc('📋 Öğrenci Listesi', alanlarHtml, () => {
    const sinifId = document.getElementById('sinifSec').value;
    const seciliAlanlar = {
      ogrenciAdi: document.getElementById('alan_ogrenciAdi').checked,
      ogrenciNo: document.getElementById('alan_ogrenciNo').checked,
      cinsiyet: document.getElementById('alan_cinsiyet').checked,
      veliAdi: document.getElementById('alan_veliAdi').checked,
      yakinlik: document.getElementById('alan_yakinlik').checked,
      telefon: document.getElementById('alan_telefon').checked,
      not: document.getElementById('alan_not').checked,
    };
    modalKapat();
    _raporOgrenciListesiGoster(sinifId || null, seciliAlanlar);
  });
}

function _raporOgrenciListesiGoster(sinifIdFiltre, seciliAlanlar) {
  const seciliSiniflar = sinifIdFiltre
    ? siniflar.filter(s => s.id === sinifIdFiltre)
    : [...siniflar].sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));

  let html = '';
  let toplamOgrenci = 0;

  seciliSiniflar.forEach(sinif => {
    const ogrenciler = veliler
      .filter(v => v.sinifId === sinif.id)
      .sort((a, b) => (a.ogrenciAdi || '').localeCompare(b.ogrenciAdi || '', 'tr'));

    toplamOgrenci += ogrenciler.length;

    html += `<div class="bolum-baslik">📚 ${escapeHtml(sinif.ad)} — ${ogrenciler.length} öğrenci</div>`;
    if (!ogrenciler.length) {
      html += `<p style="color:#888;font-size:10px;padding:3px 8px;">Bu sınıfta kayıtlı öğrenci yok.</p>`;
      return;
    }

    let thHtml = '<th>#</th>';
    if (seciliAlanlar.ogrenciAdi) thHtml += '<th>Öğrenci Adı</th>';
    if (seciliAlanlar.ogrenciNo) thHtml += '<th>Öğrenci No</th>';
    if (seciliAlanlar.cinsiyet) thHtml += '<th>Cinsiyet</th>';
    if (seciliAlanlar.veliAdi) thHtml += '<th>Veli Adı</th>';
    if (seciliAlanlar.yakinlik) thHtml += '<th>Yakınlık</th>';
    if (seciliAlanlar.telefon) thHtml += '<th>Telefon</th>';
    if (seciliAlanlar.not) thHtml += '<th>Not</th>';

    html += `<table><thead><tr>${thHtml}</tr></thead><tbody>`;
    
    ogrenciler.forEach((v, i) => {
      html += `<tr><td>${i + 1}</td>`;
      if (seciliAlanlar.ogrenciAdi) html += `<td>${escapeHtml(v.ogrenciAdi || '—')}</td>`;
      if (seciliAlanlar.ogrenciNo) html += `<td>${escapeHtml(v.ogrenciNo || '—')}</td>`;
      if (seciliAlanlar.cinsiyet) html += `<td>${escapeHtml(v.cinsiyet || '—')}</td>`;
      if (seciliAlanlar.veliAdi) html += `<td>${escapeHtml(v.veliAdi || '—')}</td>`;
      if (seciliAlanlar.yakinlik) html += `<td>${escapeHtml(v.yakinlik || '—')}</td>`;
      if (seciliAlanlar.telefon) html += `<td>${escapeHtml(v.telefon1 || v.telefon || '—')}</td>`;
      if (seciliAlanlar.not) html += `<td>${escapeHtml(v.not || '')}</td>`;
      html += `</tr>`;
    });
    html += `</tbody></table>`;
  });

  html = `<span class="ozet-kutu">Toplam Sınıf: ${seciliSiniflar.length}</span>
           <span class="ozet-kutu">Toplam Öğrenci: ${toplamOgrenci}</span>` + html;

  _raporPenceresiniAc(html, '📋 Öğrenci Listesi');
}

/* ================================================================
   2. 👨‍👩‍👧 Veli İletişim Listesi  (Modal seçim + alanlar)
   ================================================================ */
function raporVeliIletisimListesi() {
  if (!siniflar || !siniflar.length) {
    toast('Sınıf bulunamadı.');
    return;
  }

  const siniflarHtml = siniflar
    .sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'))
    .map(s => `<option value="${s.id}">${escapeHtml(s.ad)}</option>`)
    .join('');

  const alanlarHtml = `
    <div style="margin-bottom: 14px;">
      <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Sınıf Seçin:</label>
      <select id="sinifSec" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 13px;">
        <option value="">— Tüm Sınıflar —</option>
        ${siniflarHtml}
      </select>
    </div>
    <div>
      <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Raporda Gösterilecek Alanlar:</label>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <label style="cursor: pointer;"><input type="checkbox" id="alan_ogrenciAdi" checked> Öğrenci Adı</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_veliAdi" checked> Veli Adı</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_yakinlik" checked> Yakınlık</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_telefon1" checked> Telefon 1</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_telefon2"> Telefon 2</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_telefon3"> Telefon 3</label>
      </div>
    </div>
  `;

  _raporModalAc('👨‍👩‍👧 Veli İletişim Listesi', alanlarHtml, () => {
    const sinifId = document.getElementById('sinifSec').value;
    const seciliAlanlar = {
      ogrenciAdi: document.getElementById('alan_ogrenciAdi').checked,
      veliAdi: document.getElementById('alan_veliAdi').checked,
      yakinlik: document.getElementById('alan_yakinlik').checked,
      telefon1: document.getElementById('alan_telefon1').checked,
      telefon2: document.getElementById('alan_telefon2').checked,
      telefon3: document.getElementById('alan_telefon3').checked,
    };
    modalKapat();
    _raporVeliIletisimGoster(sinifId || null, seciliAlanlar);
  });
}

function _raporVeliIletisimGoster(sinifIdFiltre, seciliAlanlar) {
  const seciliSiniflar = sinifIdFiltre
    ? siniflar.filter(s => s.id === sinifIdFiltre)
    : [...siniflar].sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));

  let html = '';
  let toplamVeli = 0;

  seciliSiniflar.forEach(sinif => {
    const ogrenciler = veliler
      .filter(v => v.sinifId === sinif.id)
      .sort((a, b) => (a.ogrenciAdi || '').localeCompare(b.ogrenciAdi || '', 'tr'));

    toplamVeli += ogrenciler.length;

    html += `<div class="bolum-baslik">📚 ${escapeHtml(sinif.ad)}</div>`;
    if (!ogrenciler.length) {
      html += `<p style="color:#888;font-size:10px;padding:3px 8px;">Kayıtlı öğrenci yok.</p>`;
      return;
    }

    let thHtml = '<th>#</th>';
    if (seciliAlanlar.ogrenciAdi) thHtml += '<th>Öğrenci Adı</th>';
    if (seciliAlanlar.veliAdi) thHtml += '<th>Veli Adı</th>';
    if (seciliAlanlar.yakinlik) thHtml += '<th>Yakınlık</th>';
    if (seciliAlanlar.telefon1) thHtml += '<th>Telefon 1</th>';
    if (seciliAlanlar.telefon2) thHtml += '<th>Telefon 2</th>';
    if (seciliAlanlar.telefon3) thHtml += '<th>Telefon 3</th>';

    html += `<table><thead><tr>${thHtml}</tr></thead><tbody>`;
    
    ogrenciler.forEach((v, i) => {
      html += `<tr><td>${i + 1}</td>`;
      if (seciliAlanlar.ogrenciAdi) html += `<td>${escapeHtml(v.ogrenciAdi || '—')}</td>`;
      if (seciliAlanlar.veliAdi) html += `<td>${escapeHtml(v.veliAdi || '—')}</td>`;
      if (seciliAlanlar.yakinlik) html += `<td>${escapeHtml(v.yakinlik || '—')}</td>`;
      if (seciliAlanlar.telefon1) html += `<td>${escapeHtml(v.telefon1 || '—')}</td>`;
      if (seciliAlanlar.telefon2) html += `<td>${escapeHtml(v.telefon2 || '—')}</td>`;
      if (seciliAlanlar.telefon3) html += `<td>${escapeHtml(v.telefon3 || '—')}</td>`;
      html += `</tr>`;
    });
    html += `</tbody></table>`;
  });

  html = `<span class="ozet-kutu">Toplam Sınıf: ${seciliSiniflar.length}</span>
           <span class="ozet-kutu">Toplam Veli: ${toplamVeli}</span>` + html;

  _raporPenceresiniAc(html, '👨‍👩‍👧 Veli İletişim Listesi');
}

/* ================================================================
   3. 🛡️  Nöbet Listesi  (Modal + alanlar)
   ================================================================ */
function raporNobetListesi() {
  if (!nobetYerleri || !nobetYerleri.length) {
    toast('Önce nöbet yeri tanımlayın.');
    return;
  }

  const ayBasiISO = nobetTarihISO(nobetGoruntulenenYil, nobetGoruntulenenAy, 1);
  const ayAdi = nobetAyAdiUzun(nobetGoruntulenenYil, nobetGoruntulenenAy);

  const alanlarHtml = `
    <div style="text-align:center;color:#6b7280;margin-bottom:14px;">
      <p style="margin-bottom:10px;line-height:1.5;">
        <strong>${escapeHtml(ayAdi)}</strong> ayı çizelgesi, Nöbet Programı ekranındaki görünümle aynı şekilde
        (tüm günler, hafta sonu/tatil satırları, Telefonlar ve Nöbet Kuralları dahil) yazdırılacak.
      </p>
    </div>
    <div class="form-group">
      <label style="display:block;margin-bottom:6px;font-weight:600;color:#374151;">Geçerlilik Tarihi (imza alanında kullanılacak):</label>
      <input type="date" id="nobetGecerlilikTarihi" value="${ayBasiISO}"
             style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:5px;font-size:13px;">
    </div>
  `;

  _raporModalAc('🛡️ Öğretmen Nöbet Çizelgesi', alanlarHtml, () => {
    const gecerlilikTarihi = document.getElementById('nobetGecerlilikTarihi').value || ayBasiISO;
    modalKapat();
    _raporNobetGoster(gecerlilikTarihi);
  });
}

function _raporNobetGoster(gecerlilikTarihiISO) {
  const yil = nobetGoruntulenenYil, ay = nobetGoruntulenenAy;
  const yerler = nobetYerSirali();
  if (!yerler.length) { toast('Önce nöbet yeri tanımlayın.'); return; }

  const gunSayisi = new Date(yil, ay + 1, 0).getDate();
  const ayAdi = AYLAR[ay].toUpperCase();
  const okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari?.okulAdi)
    ? okulBilgileriAyari.okulAdi.toUpperCase()
    : 'OKUL ADI';

  // Okul müdürü
  const mudur = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari?.mudurId)
    ? ogretmenler.find(o => o.id === okulBilgileriAyari.mudurId) : null;
  const mudurAd = mudur ? `${mudur.ad} ${mudur.soyad}` : '—';

  // Geçerlilik tarihi: ayın ilk iş günü
  let ilkIsGunu = gecerlilikTarihiISO;
  for (let d = 1; d <= gunSayisi; d++) {
    const iso = nobetTarihISO(yil, ay, d);
    if (!nobetHaftasonuMu(yil, ay, d) && !nobetTatilMi(iso)) { ilkIsGunu = iso; break; }
  }
  const gecerlilikGosterim = (() => {
    try {
      const [yy, mm, dd] = ilkIsGunu.split('-').map(Number);
      return new Date(yy, mm-1, dd).toLocaleDateString('tr-TR', {day:'numeric', month:'long', year:'numeric'});
    } catch(e) { return ilkIsGunu; }
  })();

  // Uzun tarih formatı: "1 Haziran 2026 Pazartesi"
  const uzunTarih = (d) => {
    const dt = new Date(yil, ay, d);
    const gun = GUNADI[dt.getDay()];
    const ayAdiTR = AYLAR[ay];
    return `${d} ${ayAdiTR} ${yil} ${gun}`;
  };

  // Telefonlar için nöbetçi amirleri topla
  const amirleriBuAy = [];
  for (let d = 1; d <= gunSayisi; d++) {
    const iso = nobetTarihISO(yil, ay, d);
    const amir = nobetciAmirleri.find(a => a.tarih === iso);
    if (amir?.ad) {
      const ad = amir.ad.trim();
      if (!amirleriBuAy.some(x => x.ad.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr')))
        amirleriBuAy.push({ ad, telefon: amir.telefon || '' });
    }
  }

  // Kolon genişlikleri
  const colTarih = 38; // mm
  const colYer   = Math.floor((180 - colTarih - 30) / yerler.length); // mm
  const colAmir  = 30; // mm

  const tdS = `border:0.3pt solid #999;padding:1.5pt 3pt;vertical-align:middle;font-size:7.5pt;`;
  const thS = `${tdS}background:#1e3a5f;color:#fff;font-weight:700;text-align:center;font-size:7pt;`;

  // Tablo başlığı
  let thHtml = `<th style="${thS}width:${colTarih}mm;text-align:left;">TARİH /GÜN</th>`;
  yerler.forEach(y => { thHtml += `<th style="${thS}width:${colYer}mm;">${escapeHtml(y.ad.toUpperCase())}</th>`; });
  thHtml += `<th style="${thS}width:${colAmir}mm;">NÖBETÇİ AMİR</th>`;

  // Satırlar
  let satirlar = '';
  for (let d = 1; d <= gunSayisi; d++) {
    const iso = nobetTarihISO(yil, ay, d);
    const haftasonu = nobetHaftasonuMu(yil, ay, d);
    const tatil     = nobetTatilMi(iso);
    const tarihMetin = uzunTarih(d);

    if (haftasonu) {
      satirlar += `<tr>
        <td style="${tdS}background:#e8e8e8;color:#777;font-weight:600;">${tarihMetin}</td>
        <td colspan="${yerler.length + 1}" style="${tdS}background:#e8e8e8;color:#777;text-align:center;"></td>
      </tr>`;
    } else if (tatil) {
      const tatilAciklama = tatil.aciklama ? tatil.aciklama.toUpperCase() : 'RESMİ TATİL';
      satirlar += `<tr>
        <td style="${tdS}background:#fff3cd;font-weight:600;">${tarihMetin}</td>
        <td colspan="${yerler.length + 1}" style="${tdS}background:#fff3cd;color:#7a5500;font-weight:600;text-align:center;">${escapeHtml(tatilAciklama)}</td>
      </tr>`;
    } else {
      satirlar += `<tr><td style="${tdS}font-weight:600;">${tarihMetin}</td>`;
      yerler.forEach(y => {
        const atama = nobetAtamalari.find(a => a.tarih === iso && a.yerId === y.id);
        satirlar += atama
          ? `<td style="${tdS}text-align:center;font-weight:600;">${escapeHtml(atama.ogretmenAdSoyad || '—')}</td>`
          : `<td style="${tdS}text-align:center;color:#bbb;">—</td>`;
      });
      const amir = nobetciAmirleri.find(a => a.tarih === iso);
      satirlar += amir?.ad
        ? `<td style="${tdS}text-align:center;font-weight:600;">${escapeHtml(amir.ad)}</td>`
        : `<td style="${tdS}text-align:center;color:#bbb;">—</td>`;
      satirlar += `</tr>`;
    }
  }

  // Telefonlar bölümü
  const telefonSatirlari = [];
  if (mudur) telefonSatirlari.push({ ad: mudurAd, tel: mudur.telefon || '' });
  amirleriBuAy.forEach(a => telefonSatirlari.push({ ad: a.ad, tel: a.telefon }));

  const telefonHTML = telefonSatirlari.length ? `
    <div style="margin-top:4pt;padding-top:3pt;border-top:0.4pt solid #555;">
      <span style="font-weight:700;font-size:6.5pt;margin-right:10pt;">TELEFONLAR</span>
      ${telefonSatirlari.map(t => `<span style="font-size:6.5pt;margin-right:12pt;"><strong>${escapeHtml(t.ad)}</strong>&nbsp;&nbsp;${escapeHtml(t.tel || '—')}</span>`).join('')}
    </div>` : '';

  // Görevler listesi
  const gorevler = [
    'Ders başlamadan 30 dk önce okula gelinmesi ve ders bitminden on beş dakika sonra okulun terk edilmesi,',
    'Nöbete başladığında ilk olarak okul bölümlerinin gezilmesi ve nöbet defterinin sabah bölümünün doldurulması,',
    'Yukarıdaki iki maddeye göre nöbetçi defterinin sabah bölümünün doldurulması,',
    'Hava yaşlığı değişirse koridoru boşaltma ve sınıf nöbetçilerinin kontrolü kontrol edilmesi,',
    'Müdahalesi açısından olaylarla nöbeti müdür yardımcısına durum iletilmesi,',
    'Taşıma çizelgesini her gün taşıma şoförlerine imzalatmak,',
    'Taşıma çizelgesini her gün taşıma şoförlerine imzalatmak,',
    'Öğrenciler yemekhaneden çıkarken veya paydos zamanında yola aniden çıkmalarının önlenmesi,',
    'Bahçenin temizliği için öğrencilere temizlik yaptırılması',
    'Törenlerin yapılması için düzeni sağlamak',
    'Okula gelen yabancıları gördüğünde yardımcı olmak ve olumsuz durumları nöbet defterine yazmak',
    'Derse geç giren öğretmenleri uyarmak',
    'Boş geçen derslere girmek şayet dersi doluysa nöbetçi müdür yardımcısına bildirmek',
    'Ders bitimlerinde okulda kalan öğrencileri dışarı çıkartmak, boşaltmak (önce sınıf öğretmeni )ve nöbet defterini doldurmak',
  ];

  // Logo src
  const logoSrc2 = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'assets/logo.png';

  const html = `
<style>
  @page { size:A4 portrait; margin:8mm 8mm 8mm 8mm; }
  * { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body { font-family:'Arial',sans-serif; font-size:7.5pt; color:#111; background:#fff; }
  table { border-collapse:collapse; width:100%; }
  .imza-alan { page-break-inside:avoid; }
  @media print { .rapor-toolbar { display:none !important; } }
</style>
<div style="width:100%;max-width:194mm;">

  <!-- Logo + Başlık (tek satır) -->
  <div style="display:flex;align-items:center;justify-content:center;gap:8pt;margin-bottom:5pt;border-bottom:1.5pt solid #1e3a5f;padding-bottom:4pt;">
    <img src="${logoSrc2}" alt="" style="height:30pt;object-fit:contain;" onerror="this.style.display='none'">
    <div style="text-align:center;">
      <div style="font-size:10pt;font-weight:700;letter-spacing:0.3pt;color:#1e3a5f;">
        ${escapeHtml(okulAdi)} ${yil} YILI ${ayAdi} AYI ÖĞRETMEN NÖBET ÇİZELGESİ
      </div>
    </div>
  </div>

  <!-- Ana tablo -->
  <table style="border-collapse:collapse;width:100%;">
    <thead><tr>${thHtml}</tr></thead>
    <tbody>${satirlar}</tbody>
  </table>

  <!-- Telefonlar — küçük, sol taraf -->
  ${telefonHTML}

  <!-- Görevler -->
  <div style="margin-top:5pt;border-top:0.4pt solid #555;padding-top:3pt;">
    <div style="font-weight:700;font-size:7.5pt;margin-bottom:2pt;">NÖBETÇİ ÖĞRETMENİN GÖREVLERİ</div>
    <ol style="margin:0;padding-left:13pt;font-size:6.5pt;line-height:1.4;">
      ${gorevler.map(g => `<li>${g}</li>`).join('')}
    </ol>
  </div>

  <!-- İmza — page-break-inside:avoid ile aynı sayfada kalır -->
  <div class="imza-alan" style="margin-top:5pt;font-size:6.5pt;line-height:1.5;">
    <p>Bu çizelge ${escapeHtml(gecerlilikGosterim)} tarihinden itibaren geçerlidir.</p>
    <p style="margin-top:2pt;">Öğretmen arkadaşların okuldaki eğitim öğretim hizmetlerinin verimli geçmesi için yukarıda sayılan talimatlara göre nöbet hizmetlerini yerine getirmelerini rica ederim.</p>
    <div style="text-align:right;margin-top:6pt;line-height:1.7;">
      <div>${escapeHtml(gecerlilikGosterim)}</div>
      <div style="font-weight:700;font-size:7.5pt;margin-top:1pt;">${escapeHtml(mudurAd)}</div>
      <div>Okul Müdürü</div>
    </div>
  </div>

</div>`;

  _raporPenceresiniAc(html, '', {
    logoGoster: false,
    ortaliBaslik: false,
    sayfaKenar: '8mm'
  });
}


/* ================================================================
   4. 📅 Ders Programı  (Modal + alanlar)
   ================================================================ */
function raporDersProgrami() {
  if (!siniflar || !siniflar.length) {
    toast('Sınıf bulunamadı.');
    return;
  }

  const siniflarHtml = [...siniflar]
    .sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'))
    .map(s => `<option value="${s.id}">${escapeHtml(s.ad)}</option>`)
    .join('');

  const alanlarHtml = `
    <div style="margin-bottom: 14px;">
      <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Sınıf Seçin:</label>
      <select id="sinifSec" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 13px;">
        <option value="">— Tüm Sınıflar —</option>
        ${siniflarHtml}
      </select>
    </div>
  `;

  _raporModalAc('📅 Ders Programı', alanlarHtml, () => {
    const sinifId = document.getElementById('sinifSec').value;
    modalKapat();
    _raporDersProgramiGoster(sinifId || null);
  });
}

function _raporDersProgramiGoster(sinifIdFiltre) {
  const GUNLER_SIRALAMA = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

  const hedefSiniflar = sinifIdFiltre
    ? siniflar.filter(s => s.id === sinifIdFiltre)
    : [...siniflar].sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));

  if (!hedefSiniflar.length) { toast('Sınıf bulunamadı.'); return; }

  const dersSaatAyari = (typeof dersSaatleriAyarlari !== 'undefined' && dersSaatleriAyarlari)
    ? dersSaatleriAyarlari
    : (typeof dersSaatleriVarsayilan === 'function' ? dersSaatleriVarsayilan() : { donemler: [] });
  const toplamSaat = (dersSaatAyari.donemler && dersSaatAyari.donemler.length) ? dersSaatAyari.donemler.length : 7;

  const saatEtiketi = (saat) => {
    const bilgi = (typeof dersSaatiBilgisi === 'function') ? dersSaatiBilgisi(saat) : null;
    return bilgi
      ? `${saat}.<span style="display:block;color:#6b7280;font-size:8.5px;font-weight:400;">${escapeHtml(bilgi.baslangic)}–${escapeHtml(bilgi.bitis)}</span>`
      : `${saat}. Ders`;
  };

  let html = '';

  hedefSiniflar.forEach(sinif => {
    const dersler = dersProgrami.filter(d => d.sinifId === sinif.id || d.sinif === sinif.ad);

    html += `<div class="bolum-baslik">📚 ${escapeHtml(sinif.ad)} Sınıfı Haftalık Ders Programı</div>
      <table style="table-layout:fixed;">
        <colgroup>
          <col style="width:13%;">
          ${GUNLER_SIRALAMA.map(() => '<col style="width:17.4%;">').join('')}
        </colgroup>
        <thead><tr><th>Ders Saati</th>`;
    GUNLER_SIRALAMA.forEach(g => { html += `<th>${g}</th>`; });
    html += `</tr></thead><tbody>`;

    for (let saat = 1; saat <= toplamSaat; saat++) {
      html += `<tr><td style="font-weight:700;text-align:center;">${saatEtiketi(saat)}</td>`;
      GUNLER_SIRALAMA.forEach(gun => {
        const ders = dersler.find(d => d.gun === gun && d.saat === saat);
        if (ders) {
          const ogr = ogretmenler.find(x => x.id === ders.ogretmenId);
          const ogrAdi = ogr ? `${ogr.ad} ${ogr.soyad}` : (ders.ogretmenAdSoyad || '');
          html += `<td>${escapeHtml(ders.ders || '—')}${ogrAdi ? `<br><span style="color:#6b7280;font-size:9px;">${escapeHtml(ogrAdi)}</span>` : ''}</td>`;
        } else {
          html += `<td style="color:#ccc;text-align:center;">—</td>`;
        }
      });
      html += `</tr>`;
    }
    html += `</tbody></table>`;
  });

  _raporPenceresiniAc(html, '📅 Ders Programı');
}

/* ================================================================
   5. ⏰ Ders Saatleri
   ================================================================ */
function raporDersSaatleri() {
  const ds = (typeof dersSaatleriAyarlari !== 'undefined') ? dersSaatleriAyarlari : null;
  if (!ds) { toast('Ders saatleri ayarlanmamış.'); return; }
  
  const saatler = (ds.donemler && ds.donemler.length && ds.donemler[0].dersler)
    ? ds.donemler[0].dersler
    : (ds.dersler || []);
  if (!saatler.length) { toast('Ders saati kaydı yok.'); return; }

  let html = `<span class="ozet-kutu">Toplam Ders Saati: ${saatler.length}</span>`;
  html += `<table>
    <thead><tr><th>Sıra</th><th>Ders No</th><th>Başlangıç</th><th>Bitiş</th><th>Süre (dk)</th></tr></thead>
    <tbody>`;
  saatler.forEach((s, i) => {
    const sure = (() => {
      try {
        const [bH, bM] = s.baslangic.split(':').map(Number);
        const [eH, eM] = s.bitis.split(':').map(Number);
        return (eH * 60 + eM) - (bH * 60 + bM);
      } catch { return '—'; }
    })();
    html += `<tr>
      <td>${i + 1}</td>
      <td><strong>${i + 1}. Ders</strong></td>
      <td>${escapeHtml(s.baslangic || '—')}</td>
      <td>${escapeHtml(s.bitis || '—')}</td>
      <td>${sure} dk</td>
    </tr>`;
  });
  html += `</tbody></table>`;

  const ogleArasi = ds.ogleArasi || {};
  if (ogleArasi.sure) {
    html += `<p style="margin-top:6px;font-size:10px;color:#555;">
      <strong>Öğle Arası:</strong> ${ogleArasi.sure} dakika
      ${ogleArasi.sonraDers ? `(${ogleArasi.sonraDers}. dersten önce)` : ''}
    </p>`;
  }

  _raporPenceresiniAc(html, '⏰ Ders Saatleri');
}

/* ================================================================
   6. 🚌 Servis Oturma Planı + Araç Koltuk Düzeni (Modal + Visual Grid)
   ================================================================ */
function raporServisOturmaPlan() {
  if (!servisler || !servisler.length) {
    toast('Servis bulunamadı.');
    return;
  }

  const servislerHtml = servisler
    .sort((a, b) => (a.servisAdi || '').localeCompare(b.servisAdi || '', 'tr'))
    .map(s => `<option value="${s.id}">${escapeHtml(s.servisAdi)}</option>`)
    .join('');

  const alanlarHtml = `
    <div style="margin-bottom: 14px;">
      <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Servis Seçin:</label>
      <select id="servisSec" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 13px;">
        <option value="">— Tüm Servisler —</option>
        ${servislerHtml}
      </select>
    </div>
  `;

  _raporModalAc('🚌 Servis Oturma Planı', alanlarHtml, () => {
    const servisId = document.getElementById('servisSec').value;
    modalKapat();
    _raporServisOturmaGoster(servisId || null);
  });
}

function _raporServisOturmaGoster(servisIdFiltre) {
  const hedefServisler = servisIdFiltre
    ? servisler.filter(s => s.id === servisIdFiltre)
    : [...servisler].sort((a, b) => (a.servisAdi || '').localeCompare(b.servisAdi || '', 'tr'));

  if (!hedefServisler.length) { toast('Servis bulunamadı.'); return; }

  let html = '';

  hedefServisler.forEach(servis => {
    const plan = (typeof servisOturmaPlani !== 'undefined' ? servisOturmaPlani : [])
      .find(p => p.servisId === servis.id);

    html += `<div class="bolum-baslik">🚌 ${escapeHtml(servis.servisAdi || 'Servis')}
      ${servis.guzergah ? ` — <span style="font-weight:400">${escapeHtml(servis.guzergah)}</span>` : ''}
    </div>`;

    html += `<p style="font-size:10px;color:#555;padding:0 0 6px 8px;">
      Şoför: ${escapeHtml(servis.soforAdi || '—')}
      ${servis.soforTelefon ? ` · 📞 ${escapeHtml(servis.soforTelefon)}` : ''}
      &nbsp;|&nbsp; Durum: ${escapeHtml(servis.durum || 'Aktif')}
    </p>`;

    if (plan && plan.yerlesim && plan.yerlesim.length) {
      const aktifYer = plan.yerlesim.filter(y => y.aktif !== false && !y.soforYani);
      const kapasite = aktifYer.length;
      const dolu    = (plan.koltuklar || []).filter(k => k.ogrenciId || k.ogrenciAdi).length;
      const rezerve = (plan.koltuklar || []).filter(k => k.rezerve && !(k.ogrenciId || k.ogrenciAdi)).length;

      html += `<span class="ozet-kutu">Kapasite: ${kapasite}</span>
               <span class="ozet-kutu">Dolu: ${dolu}</span>
               <span class="ozet-kutu">Rezerve: ${rezerve}</span>
               <span class="ozet-kutu">Boş: ${Math.max(0, kapasite - dolu - rezerve)}</span>`;

      // Araç Koltuk Düzeni — her zaman göster
      html += (typeof soRaporGovdeHtml === 'function') ? soRaporGovdeHtml(servis, plan) : '';

    } else {
      // Oturma planı oluşturulmamış — varsayılan Ducato (2+1) boş şablon bas
      html += `<p style="font-size:10px;color:#888;padding:0 0 6px 8px;">
        Oturma planı henüz oluşturulmamış. Varsayılan Ducato (2+1) şablonu boş olarak gösteriliyor.
      </p>`;

      const varsayilanPlan = {
        servisId: servis.id,
        sablon: 'ducato',
        yerlesim: (typeof SO_SABLONLAR !== 'undefined') ? SO_SABLONLAR.ducato.yerlesimUret() : [],
        koltuklar: [],
      };
      const kapasiteVars = varsayilanPlan.yerlesim.length;

      html += `<span class="ozet-kutu">Kapasite: ${kapasiteVars}</span>
               <span class="ozet-kutu">Dolu: 0</span>
               <span class="ozet-kutu">Rezerve: 0</span>
               <span class="ozet-kutu">Boş: ${kapasiteVars}</span>`;

      if (kapasiteVars) {
        html += (typeof soRaporGovdeHtml === 'function') ? soRaporGovdeHtml(servis, varsayilanPlan) : '';
      }
    }
  });

  _raporPenceresiniAc(html, '🚌 Servis Oturma Planı');
}

/* _soRaporGovdeHtml → servis-oturma.js içindeki soRaporGovdeHtml'e taşındı (v3.1) */
function _soRaporGovdeHtml_KALDIRILDI(servis, plan) {
  const kapasite   = plan.kapasite   || 14;
  const siraSayisi = plan.siraSayisi || 7;
  const duzen      = plan.duzen      || 'cift';
  const soforVar   = plan.soforKoltuguVarMi !== false;
  const bugun      = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

  const koltukMap = {};
  (plan.koltuklar || []).forEach(k => { koltukMap[k.no] = k; });

  const siraKoltukSayisi = duzen === 'tek' ? 3 : duzen === 'dort' ? 6 : 4;
  const gercekKapasite = Math.min(kapasite, siraSayisi * siraKoltukSayisi);

  const koltukKutu = (no) => {
    const veri = koltukMap[no];
    const doluMu = !!(veri && (veri.ogrenciId || veri.ogrenciAdi));
    const rezerveMi = !!(veri && veri.rezerve);
    const ad = doluMu ? (veri.ogrenciAdi || '') : '';
    const kisa = ad.length > 10 ? ad.substring(0, 9) + '…' : ad;
    const sinifAdi = rezerveMi ? 'so-rapor-rezerve' : doluMu ? 'so-rapor-dolu' : 'so-rapor-bos';
    return `<div class="so-rapor-koltuk ${sinifAdi}">
      <span class="so-rapor-koltuk-no">${no}</span>
      ${kisa ? `<span class="so-rapor-koltuk-ad">${escapeHtml(kisa)}</span>` : ''}
    </div>`;
  };

  let html = `<div class="so-rapor-bilgi">
    🚌 ${escapeHtml(servis.servisAdi || 'Servis')} &nbsp;·&nbsp; Şoför: ${escapeHtml(servis.soforAdi || '—')} &nbsp;·&nbsp; ${escapeHtml(bugun)}
  </div>`;

  html += `<div class="so-rapor-govde">
    <div class="so-rapor-ust-etiket"><span>🚪 GİRİŞ KAPISI</span><span>🚨 ACİL ÇIKIŞ</span></div>`;

  if (soforVar) {
    const refakatciVarMi = plan.soforYaniSayisi === 2;
    html += `<div class="so-rapor-sofor-sira">
      <div class="so-rapor-koltuk so-rapor-sofor-koltuk">🧑‍✈️</div>
      ${refakatciVarMi ? `<div class="so-rapor-koltuk so-rapor-refakatci-koltuk">🧑‍🏫</div>` : ''}
    </div>`;
  }

  let koltukNo = 1;
  for (let sira = 0; sira < siraSayisi && koltukNo <= gercekKapasite; sira++) {
    html += '<div class="so-rapor-sira">';
    const solSayisi = (duzen === 'tek') ? 1 : 2;
    for (let k = 0; k < solSayisi && koltukNo <= gercekKapasite; k++) { html += koltukKutu(koltukNo); koltukNo++; }
    html += '<div class="so-rapor-koridor"></div>';
    for (let k = 0; k < 2 && koltukNo <= gercekKapasite; k++) { html += koltukKutu(koltukNo); koltukNo++; }
    if (duzen === 'dort') {
      html += '<div class="so-rapor-koridor"></div>';
      for (let k = 0; k < 2 && koltukNo <= gercekKapasite; k++) { html += koltukKutu(koltukNo); koltukNo++; }
    }
    html += '</div>';
  }

  html += `</div>
  <div class="so-rapor-lejant">
    <span style="color:#166534;">🟩 Dolu</span>&nbsp;|&nbsp;
    <span style="color:#1e40af;">🟦 Rezerve</span>&nbsp;|&nbsp;
    <span style="color:#6b7280;">⬜ Boş</span>
  </div>`;

  return html;
}

/* ================================================================
   DERS PROGRAMI ÇARŞAF RAPORLARI — 4 tip
   ================================================================ */

function raporDersProgramiCarsafModalAc() {
  const _okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari?.okulAdi) ? okulBilgileriAyari.okulAdi : '';
  const _yil = `${new Date().getFullYear()}-${new Date().getFullYear()+1}`;
  const IS = 'width:100%;padding:5px 9px;border:1px solid var(--border);border-radius:6px;font-size:13px;';
  const B  = lbl => `<div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">${lbl}</div>`;

  const sinifAdlariListesi = [...new Set(dersProgrami.map(d=>d.sinif).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
  const sinifSecOptions    = sinifAdlariListesi.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  const ogretmenSecOptions = [...ogretmenler].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'))
    .map(o=>`<option value="${o.id}">${escapeHtml(o.ad||'')}</option>`).join('');

  const sinifCblar = sinifAdlariListesi.map(s=>`
    <label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer;padding:2px 0;">
      <input type="checkbox" class="crsf_sinifCb" value="${escapeHtml(s)}" checked>${escapeHtml(s)}
    </label>`).join('');

  const ogretmenCblar = [...ogretmenler].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr')).map(o=>`
    <label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer;padding:2px 0;">
      <input type="checkbox" class="crsf_ogrCb" value="${o.id}" checked>${escapeHtml(o.ad||'')}
    </label>`).join('');

  const body = `
    ${B('Rapor Tipi')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;padding:6px;border:1px solid var(--border);border-radius:8px;">
        <input type="radio" name="crsfTip" value="tekSinif" checked onchange="crsfTipDegisti()"> Tek Sınıf Programı
      </label>
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;padding:6px;border:1px solid var(--border);border-radius:8px;">
        <input type="radio" name="crsfTip" value="tekOgretmen" onchange="crsfTipDegisti()"> Tek Öğretmen Programı
      </label>
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;padding:6px;border:1px solid var(--border);border-radius:8px;">
        <input type="radio" name="crsfTip" value="tumSiniflar" onchange="crsfTipDegisti()"> Tüm Sınıflar Çarşaf
      </label>
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;padding:6px;border:1px solid var(--border);border-radius:8px;">
        <input type="radio" name="crsfTip" value="tumOgretmenler" onchange="crsfTipDegisti()"> Tüm Öğretmenler Çarşaf
      </label>
    </div>

    ${B('Sayfa Yönü')}
    <div style="display:flex;gap:16px;">
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;"><input type="radio" name="crsfYon" value="landscape" checked> Yatay (A4)</label>
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;"><input type="radio" name="crsfYon" value="portrait"> Dikey (A4)</label>
    </div>

    ${B('Başlık Bilgileri')}
    <div style="display:grid;gap:7px;">
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="crsf_okulAdi" value="${escapeHtml(_okulAdi)}" placeholder="Okul Adı" style="${IS}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="crsf_okulGoster" checked> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="crsf_baslik" value="Ders Programı" placeholder="Rapor Başlığı" style="${IS}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="crsf_baslikGoster" checked> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="crsf_yil" value="${escapeHtml(_yil)}" placeholder="Eğitim Yılı" style="${IS}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="crsf_yilGoster" checked> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="crsf_altBaslik" value="" placeholder="Alt Başlık (isteğe bağlı)" style="${IS}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="crsf_altBaslikGoster"> Göster</label>
      </div>
    </div>

    <!-- Tek sınıf seçimi -->
    <div id="crsf_panelTekSinif">
      ${B('Sınıf Seç')}
      <select id="crsf_tekSinif" style="${IS}">${sinifSecOptions}</select>
    </div>

    <!-- Tek öğretmen seçimi -->
    <div id="crsf_panelTekOgr" style="display:none;">
      ${B('Öğretmen Seç')}
      <select id="crsf_tekOgr" style="${IS}">${ogretmenSecOptions}</select>
    </div>

    <!-- Tüm sınıflar seçimi -->
    <div id="crsf_panelTumSinif" style="display:none;">
      ${B('Sınıfları Seç')}
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px 12px;padding:8px 10px;background:var(--nm-bg,#f0f0f3);border-radius:8px;">${sinifCblar}</div>
    </div>

    <!-- Tüm öğretmenler seçimi -->
    <div id="crsf_panelTumOgr" style="display:none;">
      ${B('Öğretmenleri Seç')}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;padding:8px 10px;background:var(--nm-bg,#f0f0f3);border-radius:8px;max-height:200px;overflow-y:auto;">${ogretmenCblar}</div>
    </div>
  `;

  modalAc('📊 Ders Programı Raporu', body, () => {
    const tip = document.querySelector('input[name="crsfTip"]:checked')?.value || 'tekSinif';
    const dispatch = {
      tekSinif:       raporTekSinifCarsaf,
      tekOgretmen:    raporTekOgretmenCarsaf,
      tumSiniflar:    raporTumSiniflarCarsaf,
      tumOgretmenler: raporTumOgretmenlerCarsaf,
    };
    dispatch[tip]?.();
  }, null);
  const kb = document.getElementById('modalKaydetBtn');
  if (kb) kb.textContent = '🖨️ Yazdır';
}

function crsfTipDegisti() {
  const tip = document.querySelector('input[name="crsfTip"]:checked')?.value;
  const paneller = {
    tekSinif:       'crsf_panelTekSinif',
    tekOgretmen:    'crsf_panelTekOgr',
    tumSiniflar:    'crsf_panelTumSinif',
    tumOgretmenler: 'crsf_panelTumOgr',
  };
  Object.entries(paneller).forEach(([t, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = t === tip ? '' : 'none';
  });
}

/* ── Yardımcılar ── */

function _crsfDers3(ders) {
  if (!ders) return '';
  // Önce dersListesi'nde kayıtlı kısaltmaya bak
  if (typeof dersListesi !== 'undefined' && dersListesi.length) {
    const kayit = dersListesi.find(d => (d.ad||'').toLocaleLowerCase('tr') === ders.toLocaleLowerCase('tr'));
    if (kayit && kayit.kisaltma) return kayit.kisaltma;
  }
  // Türkçe yaygın ders kısaltmaları (yedek)
  const kisaltmalar = {
    'matematik':'MAT','türkçe':'TÜR','fen bilimleri':'FEN','fen':'FEN',
    'sosyal bilgiler':'SOS','sosyal':'SOS','ingilizce':'İNG','din kültürü':'DİN',
    'din':'DİN','beden eğitimi':'BED','beden':'BED','müzik':'MÜZ','resim':'RES',
    'görsel sanatlar':'GRS','teknoloji':'TEK','bilişim':'BİL',
    'yazarlık':'YAZ','masal':'MAS','drama':'DRM','rehberlik':'REH',
    'tarih':'TAR','coğrafya':'COĞ','fizik':'FİZ','kimya':'KİM',
    'biyoloji':'BİY','ahlak':'AHL','vatandaşlık':'VAT','kuran':'KUR',
    'arapça':'ARP','spor':'SPR','çevre':'ÇEV','etkinlik':'ETK'
  };
  const anahtar = ders.toLocaleLowerCase('tr').trim();
  for (const [k, v] of Object.entries(kisaltmalar)) {
    if (anahtar.includes(k)) return v;
  }
  return ders.slice(0, 3).toUpperCase();
}

function _crsfOgrBasHarf(ogretmenId) {
  if (!ogretmenId) return '';
  const ad = ogretmenAdi(ogretmenId);
  if (!ad) return '';
  return ad.trim().split(/\s+/).map(p => p[0] ? p[0].toUpperCase() : '').join('');
}

function _crsfDersHtml(sinif, ders, ogretmenId) {
  const sinifHtml = sinif ? `<div class="c-sinif">${escapeHtml(sinif)}</div>` : '';
  const dersHtml  = ders  ? `<div class="c-ders">${escapeHtml(ders)}</div>`   : '';
  const ogrHtml   = ogretmenId ? `<div class="c-ogr">${escapeHtml(ogretmenAdi(ogretmenId))}</div>` : '';
  return sinifHtml + dersHtml + ogrHtml;
}
function _crsfDers(ders) {
  return ders ? `<div class="c-ders">${escapeHtml(ders)}</div>` : '';
}

function _crsfMeta() {
  const gc = id => document.getElementById(id)?.checked ?? false;
  const gv = id => document.getElementById(id)?.value?.trim() || '';
  return {
    okulAdi:   gc('crsf_okulGoster')     ? gv('crsf_okulAdi')   : '',
    baslik:    gc('crsf_baslikGoster')   ? gv('crsf_baslik')    : '',
    yil:       gc('crsf_yilGoster')      ? gv('crsf_yil')       : '',
    altBaslik: gc('crsf_altBaslikGoster')? gv('crsf_altBaslik') : '',
    yon:       document.querySelector('input[name="crsfYon"]:checked')?.value || 'landscape',
  };
}

function _crsfTabloStyle() {
  return `<style>
    .crsf-wrap{overflow-x:auto;}
    table.crsf{border-collapse:collapse;table-layout:fixed;font-size:7px;width:max-content;}
    table.crsf col.col-lbl{width:52px;}
    table.crsf col.col-hucre{width:36px;}
    table.crsf th.saat-th{background:#0A6E6E;color:#fff;padding:2px;text-align:center;font-size:7px;font-weight:700;border:1px solid #075757;width:52px;}
    table.crsf th.gun-th{background:#0A6E6E;color:#fff;padding:3px 4px;text-align:center;font-size:9px;font-weight:700;border:1px solid #075757;}
    table.crsf th.gun-grup{background:#1a6b9a;color:#fff;padding:2px 3px;text-align:center;font-size:7px;font-weight:700;border:1px solid #145a82;}
    table.crsf td.satir-lbl{background:#E6F4F4;color:#0A6E6E;font-weight:700;font-size:7px;border:1px solid #999 !important;padding:2px;text-align:center;vertical-align:middle;white-space:nowrap;overflow:hidden;width:48px;}
    table.crsf td.hucre{padding:4px 3px;border:1px solid #999 !important;vertical-align:middle;text-align:center;overflow:hidden;height:36px;}
    table.crsf td.bos{background:#fafafa;border:1px solid #999 !important;height:36px;}
    table.crsf tr:nth-child(even) td.hucre{background:inherit;}
    table.crsf tr:nth-child(even) td.bos{background:inherit;}
    table.crsf td.gun-dolgu{background:#c8e6e4 !important;}
    table.crsf th.gun-dolgu{background:#7fbfbb !important;color:#fff !important;}
    table.crsf td.gun-dolgu *{color:#111 !important;}
    table.crsf td.gun-ilk,
    table.crsf th.gun-ilk{border-left:2px solid #0A6E6E !important;}
    .c-sinif{font-weight:700;font-size:7px;color:#1a5276;line-height:1.2;white-space:nowrap;}
    .c-ders{font-weight:700;font-size:6.5px;color:#1a1a1a;line-height:1.2;white-space:nowrap;}
    .c-ogr{color:#6b7280;font-size:5.5px;margin-top:1px;line-height:1.1;overflow:hidden;text-overflow:ellipsis;display:block;white-space:nowrap;}
    .c-zaman{font-weight:400;font-size:6px;display:block;color:#0A8080;margin-top:1px;line-height:1.2;}
    #crsf-sarici{transform-origin:top left;display:inline-block;}
    .c-ders-tam{font-weight:700;font-size:10px;color:#1a1a1a;line-height:1.4;white-space:normal;}
    .c-ogr-kucuk{color:#555;font-size:8px;line-height:1.3;white-space:normal;display:block;max-width:100%;word-break:break-word;}
    @media print{
      .rapor-toolbar{display:none!important;}
      #icerik-sarici{transform:none!important;}
      #crsf-sarici{transform:none!important;display:block!important;}
      .crsf-wrap{overflow:visible!important;}
      table.crsf{width:100%!important;}
      body{margin:0;padding:0;}
    }
  </style>
`;
}

function _crsfGoster(tabloHtml, baslikMetin, m, landscape) {
  modalKapat();

  const ektraStyle = `
    <style>
      @page{size:A4 ${landscape?'landscape':'portrait'};margin:0.5cm;}
      @media print{@page{size:A4 ${landscape?'landscape':'portrait'};margin:0.5cm;}
        .rapor-toolbar{display:none!important;}
        #icerik-sarici{transform:none!important;}
        body{${landscape?'width:297mm;':''}}
      }
    </style>
    <script>
      function pdfKaydet() {
        var styleEl = document.getElementById('crsf-page-style');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'crsf-page-style';
          document.head.appendChild(styleEl);
        }
        // Tablo genişliğine göre scale hesapla
        var sarici = document.getElementById('crsf-sarici');
        var tablo  = sarici ? sarici.querySelector('table') : null;
        var tabloW = tablo ? tablo.scrollWidth : 0;
        // A4 yatay ~1122px @96dpi, dikey ~794px
        var hedefW = 1056; // A4 yatay - kenarlar
        var scale  = tabloW > hedefW ? (hedefW / tabloW) : 1;
        styleEl.textContent = [
          '@page { size: A4 landscape; margin: 8mm; }',
          '@media print {',
          '  .rapor-toolbar { display:none !important; }',
          '  html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }',
          '  body { margin:0; zoom:' + scale + '; }',
          '  .crsf-wrap { overflow:visible !important; }',
          '  table.crsf { table-layout:auto !important; }',
          '}'
        ].join('\n');
        window.print();
      }
    <\/script>`;

  // Toolbar'a Görüntü Kaydet butonu ekle — _raporPenceresiniAc'dan sonra enjekte edeceğiz
  // Bunun için htmlIcerik içine özel toolbar eki koyuyoruz
  const gorselBtn = `<button id="btn-gorsel" class="btn-gorsel" onclick="pdfKaydet()" style="background:#6366f1;color:#fff;">📄 PDF Kaydet</button>`;

  const pdfBaslik = `<div id="crsf-pdf-baslik" style="margin-bottom:8px;border-bottom:2px solid #0A6E6E;padding-bottom:5px;">
    <div style="font-size:14px;font-weight:700;color:#0A6E6E;">${escapeHtml(baslikMetin)}</div>
  </div>`;

  const icerik = ektraStyle +
    _crsfTabloStyle() +
    `<div id="crsf-extra-btn" style="display:none;">${gorselBtn}</div>` +
    pdfBaslik +
    `<div class="crsf-wrap" style="overflow-x:auto;"><div id="crsf-sarici" style="display:inline-block;min-width:100%;">${tabloHtml}</div></div>`;

  const win = _raporPenceresiniAc(icerik, baslikMetin, { ortaliBaslik: false });

  // Toolbar'a butonu ekle (blob açıldıktan sonra)
  setTimeout(function() {
    try {
      if (!win || win.closed) return;
      var toolbar = win.document.querySelector('.rapor-toolbar');
      var btn = win.document.getElementById('btn-gorsel');
      if (toolbar && btn) {
        var klon = btn.cloneNode(true);
        klon.onclick = win.pdfKaydet;
        toolbar.insertBefore(klon, toolbar.children[1]);
      }
    } catch(e) {}
  }, 1500);
}

const CRSF_SAATLER = [1,2,3,4,5,6,7];

/* ── Rapor 1: Tek Sınıf ── */
function raporTekSinifCarsaf() {
  const m  = _crsfMeta();
  const sn = document.getElementById('crsf_tekSinif')?.value;
  if (!sn) { toast('Sınıf seçin.'); return; }

  const saatRows = CRSF_SAATLER.map(saat => {
    const bil = dersSaatiBilgisi(saat);
    const saatEtiket = bil
      ? `<strong>${saat}. Ders</strong><span class="c-zaman">${bil.baslangic}–${bil.bitis}</span>`
      : `<strong>${saat}. Ders</strong>`;
    let row = `<tr><td class="satir-lbl">${saatEtiket}</td>`;
    GUNLER.forEach((gun, gi) => {
      const d = dersProgrami.find(x => x.sinif===sn && x.gun===gun && x.saat===saat);
      const ogrAdSoyad = d ? ogretmenAdi(d.ogretmenId) : '';
      const dolgu = gi % 2 === 0 ? ' gun-dolgu' : '';
      row += d
        ? `<td class="hucre${dolgu}"><div class="c-ders-tam">${escapeHtml(d.ders)}</div><div class="c-ogr-kucuk">${escapeHtml(ogrAdSoyad)}</div></td>`
        : `<td class="hucre bos${dolgu}"></td>`;
    });
    return row + '</tr>';
  }).join('');

  const thGun = GUNLER.map((g,gi)=>`<th class="gun-th${gi%2===0?' gun-dolgu':''} ">${g}</th>`).join('');
  const baslik = m.baslik || `${sn} Sınıfı Haftalık Ders Programı`;
  const tablo = `<table class="crsf" style="width:100%;table-layout:auto;">
    <thead><tr><th class="saat-th" style="width:90px;">Ders Saati</th>${thGun}</tr></thead>
    <tbody>${saatRows}</tbody>
  </table>`;
  _crsfGoster(tablo, baslik, m);
}

/* ── Rapor 2: Tek Öğretmen ── */
function raporTekOgretmenCarsaf() {
  const m    = _crsfMeta();
  const ogrId = document.getElementById('crsf_tekOgr')?.value;
  if (!ogrId) { toast('Öğretmen seçin.'); return; }
  const ogrAd = ogretmenAdi(ogrId);

  const saatRows = CRSF_SAATLER.map(saat => {
    const bil = dersSaatiBilgisi(saat);
    const saatEtiket = bil
      ? `<strong>${saat}. Ders</strong><span class="c-zaman">${bil.baslangic}–${bil.bitis}</span>`
      : `<strong>${saat}. Ders</strong>`;
    let row = `<tr><td class="satir-lbl">${saatEtiket}</td>`;
    GUNLER.forEach((gun, gi) => {
      const d = dersProgrami.find(x => x.ogretmenId===ogrId && x.gun===gun && x.saat===saat);
      const dolgu = gi % 2 === 0 ? ' gun-dolgu' : '';
      row += d
        ? `<td class="hucre${dolgu}">${_crsfDersHtml(d.sinif, d.ders, '')}</td>`
        : `<td class="hucre bos${dolgu}"></td>`;
    });
    return row + '</tr>';
  }).join('');

  const thGun = GUNLER.map((g,gi)=>`<th class="gun-th${gi%2===0?' gun-dolgu':''} ">${g}</th>`).join('');
  const baslik = m.baslik || `${ogrAd} — Haftalık Ders Programı`;
  const tablo = `<table class="crsf" style="width:100%;table-layout:auto;">
    <thead><tr><th class="saat-th" style="width:90px;">Ders Saati</th>${thGun}</tr></thead>
    <tbody>${saatRows}</tbody>
  </table>`;
  _crsfGoster(tablo, baslik, m);
}

/* ── Rapor 3: Tüm Sınıflar Çarşaf ── */
function raporTumSiniflarCarsaf() {
  const m = _crsfMeta();
  const seciliSiniflar = [...document.querySelectorAll('.crsf_sinifCb:checked')].map(c=>c.value);
  if (!seciliSiniflar.length) { toast('En az bir sınıf seçin.'); return; }

  // Başlık: gün grubu satırı + saat numarası satırı
  let th1 = `<th class="gun-grup"></th>`;
  GUNLER.forEach(g => { th1 += `<th class="gun-grup" colspan="${CRSF_SAATLER.length}">${g}</th>`; });
  let th2 = `<th class="saat-th">Sınıf</th>`;
  GUNLER.forEach((g, gi) => {
    const dolgu = gi % 2 === 0 ? ' gun-dolgu' : '';
    CRSF_SAATLER.forEach((s, si) => { th2 += `<th class="gun-th${si===0?' gun-ilk':''}${dolgu}">${s}</th>`; });
  });

  const rows = seciliSiniflar.map(sn => {
    let row = `<tr><td class="satir-lbl">${escapeHtml(sn)}</td>`;
    GUNLER.forEach(gun => {
      CRSF_SAATLER.forEach(saat => {
        const d = dersProgrami.find(x => x.sinif===sn && x.gun===gun && x.saat===saat);
        row += d
          ? `<td class="hucre"><div class="c-ders">${_crsfDers3(d.ders)}</div><div class="c-ogr">${_crsfOgrBasHarf(d.ogretmenId)}</div></td>`
          : `<td class="hucre bos"></td>`;
      });
    });
    return row + '</tr>';
  }).join('');

  const tablo = `<table class="crsf">
    <thead><tr>${th1}</tr><tr>${th2}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  _crsfGoster(tablo, m.baslik || 'Sınıflar Ders Programı', m, true);
}

/* ── Rapor 4: Tüm Öğretmenler Çarşaf ── */
function raporTumOgretmenlerCarsaf() {
  const m = _crsfMeta();
  const seciliIds = [...document.querySelectorAll('.crsf_ogrCb:checked')].map(c=>c.value);
  if (!seciliIds.length) { toast('En az bir öğretmen seçin.'); return; }

  const seciliOgretmenler = ogretmenler
    .filter(o => seciliIds.includes(o.id))
    .sort((a,b) => (a.ad||'').localeCompare(b.ad||'','tr'));

  let th1 = `<th class="gun-grup"></th>`;
  GUNLER.forEach(g => { th1 += `<th class="gun-grup" colspan="${CRSF_SAATLER.length}">${g}</th>`; });
  let th2 = `<th class="saat-th">Öğretmen</th>`;
  GUNLER.forEach((g, gi) => {
    const dolgu = gi % 2 === 0 ? ' gun-dolgu' : '';
    CRSF_SAATLER.forEach((s, si) => { th2 += `<th class="gun-th${si===0?' gun-ilk':''}${dolgu}">${s}</th>`; });
  });

  const rows = seciliOgretmenler.map(o => {
    const adParca  = o.ad  || '';
    const soyadParca = o.soyad || '';
    // Eğer ad alanı zaten "Ad Soyad" içeriyorsa böl, yoksa ayrı göster
    let adGoster, soyadGoster;
    if (soyadParca) {
      adGoster    = adParca;
      soyadGoster = soyadParca;
    } else {
      const parcalar = adParca.trim().split(' ');
      adGoster    = parcalar.slice(0, -1).join(' ') || adParca;
      soyadGoster = parcalar.length > 1 ? parcalar[parcalar.length - 1] : '';
    }
    const adHtml = `<span style="display:block;font-size:6.5px;font-weight:700;line-height:1.3;">${escapeHtml(adGoster)}</span>${soyadGoster ? `<span style="display:block;font-size:6px;font-weight:600;line-height:1.2;color:#0A5050;">${escapeHtml(soyadGoster)}</span>` : ''}`;
    let row = `<tr><td class="satir-lbl" style="font-size:6.5px;padding:2px 3px;">${adHtml}</td>`;
    GUNLER.forEach(gun => {
      CRSF_SAATLER.forEach(saat => {
        const d = dersProgrami.find(x => x.ogretmenId===o.id && x.gun===gun && x.saat===saat);
        row += d
          ? `<td class="hucre"><div class="c-sinif">${escapeHtml(d.sinif)}</div><div class="c-ders">${_crsfDers3(d.ders)}</div></td>`
          : `<td class="hucre bos"></td>`;
      });
    });
    return row + '</tr>';
  }).join('');

  const tablo = `<table class="crsf">
    <thead><tr>${th1}</tr><tr>${th2}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  _crsfGoster(tablo, m.baslik || 'Öğretmenler Ders Programı', m, true);
}
