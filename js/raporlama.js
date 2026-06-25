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
  const logoGoster   = secenekler.logoGoster !== false;     // varsayılan: göster
  const ortaliBaslik = !!secenekler.ortaliBaslik;            // varsayılan: sola hizalı (logo yanında)
  const sayfaKenar    = secenekler.sayfaKenar || '10mm 12mm';

  const win = window.open('', '_blank', 'width=950,height=1000');
  if (!win) { toast('Açılır pencere engellendi. Tarayıcı ayarlarınızı kontrol edin.'); return null; }

  const okulAdi  = (okulBilgileriAyari && okulBilgileriAyari.okulAdi) || 'Okul Yönetim Paneli';
  const tarih    = new Date().toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' });

  const logoHtml = logoGoster
    ? `<img src="${window.location.origin + window.location.pathname.replace(/[^/]*$/, '')}assets/logo.png"
            alt="" style="height:48px;object-fit:contain;" onerror="this.style.display='none'">`
    : '';

  win.document.write(`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${baslik} — ${okulAdi}</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;
    }
    
    @page { size: A4 portrait; margin: ${sayfaKenar}; }
    
    body { 
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; 
      font-size: 11px; color: #1a1a1a; background: #fff; line-height: 1.4;
    }

    /* ---------- Rapor Başlığı ---------- */
    .rapor-header {
      display: flex; align-items: center; gap: 12px;
      border-bottom: 2.5px solid #4f46e5; padding-bottom: 10px; margin-bottom: 16px;
    }
    .rapor-header-text { flex: 1; }
    .rapor-header-text h1 { font-size: 16px; color: #4f46e5; font-weight: 700; }
    .rapor-header-text h2 { font-size: 12px; color: #555; font-weight: 400; margin-top: 1px; }
    .rapor-header-text .rapor-tarih { font-size: 10px; color: #888; margin-top: 3px; }
    /* Logosuz / ortalı başlık (örn. Nöbet Çizelgesi orijinal şablonu) */
    .rapor-header.rapor-header-ortali {
      flex-direction: column; text-align: center;
      padding-bottom: 6px; margin-bottom: 10px;
    }
    .rapor-header-ortali .rapor-header-text h1 { font-size: 15px; }

    /* ---------- Araç Çubuğu ---------- */
    .rapor-toolbar {
      display: flex; gap: 8px; margin-bottom: 18px;
      padding: 8px 12px; background: #f3f2ff; border-radius: 6px;
    }
    .rapor-toolbar button {
      padding: 6px 14px; border: none; border-radius: 5px;
      cursor: pointer; font-size: 12px; font-weight: 600;
    }
    .btn-yazdir { background: #4f46e5; color: #fff; }
    .btn-yazdir:hover { background: #4338ca; }
    .btn-kapat  { background: #e5e7eb; color: #374151; }
    .btn-kapat:hover { background: #d1d5db; }

    /* ---------- Özet Kutusu ---------- */
    .ozet-kutu {
      display: inline-block; background: #f5f3ff; border: 1px solid #c4b5fd;
      border-radius: 5px; padding: 3px 8px; font-size: 10px;
      color: #5b21b6; margin: 0 5px 10px 0; font-weight: 500;
    }

    /* ---------- Bölüm Başlığı ---------- */
    .bolum-baslik {
      background: #ede9fe; color: #4f46e5;
      font-weight: 700; font-size: 11.5px;
      padding: 4px 8px; margin: 12px 0 8px;
      border-left: 3px solid #4f46e5; border-radius: 0 3px 3px 0;
    }

    /* ---------- Tablo ---------- */
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    thead tr { background: #4f46e5; color: #fff; }
    thead th { padding: 5px 7px; text-align: left; font-size: 10px; font-weight: 700; }
    tbody tr:nth-child(even) { background: #f9f8ff; }
    tbody tr:hover { background: #ede9fe; }
    td { padding: 4px 7px; border-bottom: 1px solid #e5e7eb; font-size: 10.5px; }

    /* ---------- Nöbet Çizelgesi: tek sayfaya sığdırmak için sıkı yerleşim ---------- */
    .nobet-sik table { margin-bottom: 6px; }
    .nobet-sik thead th { padding: 2.5px 5px; font-size: 8.5px; }
    .nobet-sik tbody td { padding: 1.5px 5px; font-size: 8px; line-height: 1.15; }
    .nobet-sik .bolum-baslik { margin: 6px 0 4px; padding: 3px 6px; font-size: 9.5px; }
    .nobet-sik .ozet-kutu { margin: 0 0 6px 0; padding: 2px 7px; }
    .nobet-sik ol { font-size: 8px; line-height: 1.3; padding-left: 16px; }
    .nobet-sik ol li { margin-bottom: 1px; }
    .nobet-sik p { font-size: 8.5px; margin-top: 3px; }

    /* ---------- Servis Oturma Planı: Otobüs Gövdesi (canlı editörle aynı mantık) ---------- */
    .so-rapor-bilgi {
      font-size: 10.5px; color: #5b21b6; background: #f5f3ff; border: 1px solid #c4b5fd;
      border-radius: 6px; padding: 6px 10px; margin: 8px 0 10px; display: inline-block;
    }
    .so-rapor-govde {
      margin: 0 0 4px; padding: 12px 10px 8px; background: #fffbea;
      border: 2px solid #f3d77a; border-radius: 14px;
    }
    .so-rapor-ust-etiket {
      display: flex; justify-content: space-between;
      font-size: 9px; font-weight: 700; color: #92400e; margin-bottom: 8px;
    }
    .so-rapor-sofor-sira {
      display: flex; justify-content: flex-start; gap: 4px;
      padding-bottom: 6px; border-bottom: 2px dashed #d4b86a; margin-bottom: 6px;
    }
    .so-rapor-sira { display: flex; align-items: center; gap: 3px; margin-bottom: 3px; }
    .so-rapor-koridor { width: 14px; flex-shrink: 0; }
    .so-rapor-koltuk {
      flex: 1; min-width: 0; height: 34px; border-radius: 5px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      border: 1.5px solid rgba(0,0,0,0.18); overflow: hidden;
    }
    .so-rapor-koltuk-no { font-size: 8px; font-weight: 700; color: rgba(0,0,0,0.55); line-height: 1; }
    .so-rapor-koltuk-ad { font-size: 7.5px; font-weight: 600; color: rgba(0,0,0,0.8); text-align: center; line-height: 1.1; padding: 0 1px; word-break: break-word; }
    .so-rapor-dolu    { background: #dcfce7; border-color: #22c55e; }
    .so-rapor-rezerve { background: #dbeafe; border-color: #3b82f6; }
    .so-rapor-bos     { background: #f3f4f6; border-color: #9ca3af; }
    .so-rapor-koltuk.so-rapor-sofor-koltuk {
      background: #fef3c7; border-color: #f59e0b; font-size: 14px; flex: 0 0 15%;
    }
    .so-rapor-koltuk.so-rapor-refakatci-koltuk {
      background: #e0e7ff; border-color: #6366f1; font-size: 13px; flex: 0 0 15%;
    }
    .so-rapor-lejant { font-size: 9px; margin: -2px 0 10px; padding: 4px; background: #fff9e6; text-align: center; border-radius: 4px; }

    /* ---------- Print ---------- */
    @media print {
      .rapor-toolbar { display: none !important; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
      .sayfa-sonu { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="rapor-toolbar">
    <button class="btn-yazdir" onclick="window.print()">🖨️ Yazdır / PDF İndir</button>
    <button class="btn-kapat"  onclick="window.close()">✕ Kapat</button>
  </div>
  <div class="rapor-header${ortaliBaslik ? ' rapor-header-ortali' : ''}">
    ${logoHtml}
    <div class="rapor-header-text">
      <h1>${baslik}</h1>
      <h2>${okulAdi}</h2>
      <div class="rapor-tarih">Oluşturulma: ${tarih}</div>
    </div>
  </div>
  ${htmlIcerik}
</body>
</html>`);
  win.document.close();
  return win;
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
  const ayAdiKisa = AYLAR[ay];

  let html = `<div class="nobet-sik">
    <span class="ozet-kutu">${escapeHtml(ayAdiKisa)} ${yil}</span>`;

  let thHtml = '<th style="width:90px;">Tarih / Gün</th>';
  yerler.forEach(y => { thHtml += `<th>${escapeHtml(y.ad)}</th>`; });
  thHtml += '<th style="width:110px;">Nöbetçi Amir</th>';

  html += `<table style="table-layout:fixed;">
    <thead><tr>${thHtml}</tr></thead>
    <tbody>`;

  const amirleriBuAy = []; // Telefonlar bölümü için tekrarsız liste

  for (let d = 1; d <= gunSayisi; d++) {
    const iso = nobetTarihISO(yil, ay, d);
    const haftasonu = nobetHaftasonuMu(yil, ay, d);
    const tatil = nobetTatilMi(iso);
    const gunAdi = GUNADI[new Date(yil, ay, d).getDay()];

    html += `<tr><td style="font-weight:700;">${d} <span style="color:#6b7280;font-weight:400;">${escapeHtml(gunAdi)}</span></td>`;

    if (haftasonu) {
      html += `<td colspan="${yerler.length + 1}" style="text-align:center;background:#f3f4f6;color:#9ca3af;font-weight:600;">HAFTASONU</td>`;
    } else if (tatil) {
      html += `<td colspan="${yerler.length + 1}" style="text-align:center;background:#fff3cd;color:#92400e;font-weight:600;">RESMİ TATİL${tatil.aciklama ? ' — ' + escapeHtml(tatil.aciklama) : ''}</td>`;
    } else {
      yerler.forEach(y => {
        const atama = nobetAtamalari.find(a => a.tarih === iso && a.yerId === y.id);
        html += atama
          ? `<td>${escapeHtml(atama.ogretmenAdSoyad || '—')}</td>`
          : `<td style="color:#ccc;">—</td>`;
      });

      const amir = nobetciAmirleri.find(a => a.tarih === iso);
      if (amir && amir.ad) {
        html += `<td style="font-weight:600;color:#4f46e5;">${escapeHtml(amir.ad)}</td>`;
        const ad = amir.ad.trim();
        if (!amirleriBuAy.some(x => x.ad.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr'))) {
          amirleriBuAy.push({ ad, telefon: amir.telefon || '' });
        }
      } else {
        html += `<td style="color:#ccc;">—</td>`;
      }
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;

  // Telefonlar: sadece Okul Müdürü + bu ayın Nöbetçi Amiri/leri
  const telefonSatirlari = [];
  if (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.mudurId) {
    const mudur = ogretmenler.find(o => o.id === okulBilgileriAyari.mudurId);
    if (mudur) telefonSatirlari.push({ rol: 'Okul Müdürü', ad: `${mudur.ad} ${mudur.soyad}`, telefon: mudur.telefon || '' });
  }
  amirleriBuAy.forEach(a => telefonSatirlari.push({ rol: 'Nöbetçi Amiri', ad: a.ad, telefon: a.telefon }));

  if (telefonSatirlari.length) {
    html += `<div style="page-break-inside:avoid;margin-top:10px;padding-top:8px;border-top:2px solid #4f46e5;">
      <div class="bolum-baslik">📞 Telefonlar</div>
      <table style="font-size:10px;"><tbody>`;
    telefonSatirlari.forEach(t => {
      html += `<tr>
        <td style="width:50%;"><strong>${escapeHtml(t.ad)}</strong> <span style="color:#6b7280;">(${escapeHtml(t.rol)})</span></td>
        <td style="width:50%;">${escapeHtml(t.telefon || '—')}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
  }

  // Nöbet kuralları
  html += `<div style="page-break-inside:avoid;margin-top:10px;padding-top:8px;border-top:2px solid #4f46e5;">
    <div class="bolum-baslik">📋 Nöbet Öğretmenin Görevleri</div>
    <ol style="margin:0;">
      <li>Ders başlaması hemen öncesinde tüm öğrencilerin sınıflarında yerleştiğini kontrol edilmesi.</li>
      <li>Ders başladıktan sonra geç gelen öğrenci kalırsa öğretmenle iletişime geçilmesi.</li>
      <li>Teneffüslerde bahçe düzeni, zabıta görevine eşlik edilmesi ve güvenlik sağlanması.</li>
      <li>Trafik için yaya düzeni uygulanması, araçlara dikkat edilmesi ve güvenli yoldan geçişin sağlanması.</li>
      <li>Okuldan ayrılan öğrencilerin kontrol edilmesi.</li>
      <li>Sağlık açısından acil durumlarda okul yönetimine haber verilmesi ve gerekli müdahaleler yapılması.</li>
      <li>İdarece verilen diğer görevlerin yapılması.</li>
      <li>Nöbetçi öğretmenlerin görevlerinden başarısızlığında müdürle görüşülmesi.</li>
      <li>Öğrenci tarafından izinsiz bina terk etmesi durumunda derhal öğretmen ve müdüre haber verilmesi.</li>
      <li>Eğitim faaliyeti dışında konuşmaların yapılmaması.</li>
      <li>Nöbetçi görevlerinden bunaldıysa, müdürle bunu tartışması ve çözüm arayacaktır.</li>
      <li>Son geçen dersinin başlaması sonrasında çıkışta bitecek dersin dışında kalmamış denetim sağlanması.</li>
      <li>Hasta öğrenci için vasi bulunmadığında sevk işlemleri yapılmalı.</li>
      <li>Ders bitiminden sonra tüm öğrencilerin okul alanından ayrıldığını kontrol edilmesi.</li>
    </ol>
  </div>`;

  // Okul Müdürü imza alanı
  const mudur2 = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.mudurId)
    ? ogretmenler.find(o => o.id === okulBilgileriAyari.mudurId) : null;
  const gecerlilikGosterim = (() => {
    try {
      const [yy, mm, dd] = gecerlilikTarihiISO.split('-').map(Number);
      return new Date(yy, mm - 1, dd).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { return gecerlilikTarihiISO; }
  })();

  html += `<div style="page-break-inside:avoid;margin-top:10px;font-size:8.5px;line-height:1.35;">
    <p>Bu çizelge <strong>${escapeHtml(gecerlilikGosterim)}</strong> tarihinden itibaren geçerlidir.</p>
    <p style="margin-top:3px;">Öğretmen arkadaşların okuldaki eğitim öğretim hizmetlerinin verimli geçmesi için yukarıda sayılan talimatlara göre nöbet hizmetlerini yerine getirmelerini rica ederim.</p>
    <div style="text-align:right;margin-top:14px;">
      <div>${escapeHtml(gecerlilikGosterim)}</div>
      <div style="font-weight:700;margin-top:3px;">${mudur2 ? escapeHtml(`${mudur2.ad} ${mudur2.soyad}`) : '—'}</div>
      <div>Okul Müdürü</div>
    </div>
  </div>
  </div>`; // .nobet-sik kapanışı

  _raporPenceresiniAc(html, `🛡️ ${ayAdiKisa} Ayı Öğretmen Nöbet Çizelgesi`, {
    logoGoster: false,
    ortaliBaslik: true,
    sayfaKenar: '8mm 10mm'
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
    <div>
      <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Raporda Gösterilecek Alanlar:</label>
      <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
        <label style="cursor: pointer;"><input type="checkbox" id="alan_koltukDuzeni" checked> ✓ Araç Koltuk Düzeni (Görsel Grid)</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_koltukTablosu" checked> ✓ Koltuk Tablosu</label>
      </div>
    </div>
  `;

  _raporModalAc('🚌 Servis Oturma Planı', alanlarHtml, () => {
    const servisId = document.getElementById('servisSec').value;
    const seciliAlanlar = {
      koltukDuzeni: document.getElementById('alan_koltukDuzeni').checked,
      koltukTablosu: document.getElementById('alan_koltukTablosu').checked,
    };
    modalKapat();
    _raporServisOturmaGoster(servisId || null, seciliAlanlar);
  });
}

function _raporServisOturmaGoster(servisIdFiltre, seciliAlanlar) {
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

    if (plan && plan.koltuklar && plan.koltuklar.length) {
      const kapasite = plan.yerlesim?.length || plan.koltuklar.length;
      const dolu    = plan.koltuklar.filter(k => k.ogrenciId || k.ogrenciAdi).length;
      const rezerve = plan.koltuklar.filter(k => k.rezerve && !(k.ogrenciId || k.ogrenciAdi)).length;

      html += `<span class="ozet-kutu">Kapasite: ${kapasite}</span>
               <span class="ozet-kutu">Dolu: ${dolu}</span>
               <span class="ozet-kutu">Rezerve: ${rezerve}</span>
               <span class="ozet-kutu">Boş: ${Math.max(0, kapasite - dolu - rezerve)}</span>`;

      // Araç Koltuk Düzeni
      if (seciliAlanlar.koltukDuzeni) {
        html += (typeof soRaporGovdeHtml === 'function') ? soRaporGovdeHtml(servis, plan) : '';
      }

      // Koltuk Tablosu
      if (seciliAlanlar.koltukTablosu) {
        html += `<table>
          <thead><tr><th>Koltuk No</th><th>Öğrenci Adı</th><th>Sınıf</th><th>Veli / Telefon</th><th>Durum</th></tr></thead>
          <tbody>`;

        plan.koltuklar
          .sort((a, b) => (a.no || 0) - (b.no || 0))
          .forEach(k => {
            let ogrenciAdi = k.ogrenciAdi || '';
            let sinifAdi = '';
            let veliTel = '';

            if (k.ogrenciId) {
              const v = veliler.find(x => x.id === k.ogrenciId);
              if (v) {
                ogrenciAdi = v.ogrenciAdi || ogrenciAdi;
                const sn = siniflar.find(s => s.id === v.sinifId);
                sinifAdi = sn ? sn.ad : '';
                veliTel = [v.veliAdi, v.telefon1 || v.telefon].filter(Boolean).join(' / ');
              }
            }

            const durum = k.rezerve ? 'Rezerve' : (ogrenciAdi ? 'Dolu' : 'Boş');
            const renkMap = { 'Dolu': '#22c55e', 'Rezerve': '#3b82f6', 'Boş': '#9ca3af' };
            html += `<tr>
              <td style="text-align:center;font-weight:700;">${k.no || '—'}</td>
              <td>${escapeHtml(ogrenciAdi || '—')}</td>
              <td>${escapeHtml(sinifAdi || '—')}</td>
              <td>${escapeHtml(veliTel || '—')}</td>
              <td><span style="color:${renkMap[durum]};font-weight:600;">${durum}</span></td>
            </tr>`;
          });
        html += `</tbody></table>`;
      }
    } else {
      // Oturma planı yoksa listele
      const ogrenciler = veliler
        .filter(v => v.servisId === servis.id)
        .sort((a, b) => (a.ogrenciAdi || '').localeCompare(b.ogrenciAdi || '', 'tr'));

      if (ogrenciler.length) {
        html += `<p style="font-size:10px;color:#888;padding:0 0 4px 8px;">
          Oturma planı henüz oluşturulmamış. Servise kayıtlı ${ogrenciler.length} öğrenci listeleniyor.
        </p>`;
        html += `<table>
          <thead><tr><th>#</th><th>Öğrenci Adı</th><th>Sınıf</th><th>Veli</th><th>Telefon</th></tr></thead>
          <tbody>`;
        ogrenciler.forEach((v, i) => {
          const sn = siniflar.find(s => s.id === v.sinifId);
          html += `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(v.ogrenciAdi || '—')}</td>
            <td>${escapeHtml(sn ? sn.ad : '—')}</td>
            <td>${escapeHtml(v.veliAdi || '—')}</td>
            <td>${escapeHtml(v.telefon1 || v.telefon || '—')}</td>
          </tr>`;
        });
        html += `</tbody></table>`;
      } else {
        html += `<p style="color:#888;font-size:10px;padding:3px 8px;">Bu serviste kayıtlı öğrenci yok.</p>`;
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
