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
  overlay.style.display = 'flex';
}

function modalKapat() {
  document.getElementById('modalOverlay').style.display = 'none';
}

/* ---------- Yardımcı: Rapor Penceresi Aç (A4 Optimize) ---------- */
function _raporPenceresiniAc(htmlIcerik, baslik) {
  const win = window.open('', '_blank', 'width=950,height=1000');
  if (!win) { toast('Açılır pencere engellendi. Tarayıcı ayarlarınızı kontrol edin.'); return null; }

  const okulAdi  = (okulBilgileriAyari && okulBilgileriAyari.okulAdi) || 'Okul Yönetim Paneli';
  const tarih    = new Date().toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' });

  const logoHtml = `<img src="${window.location.origin + window.location.pathname.replace(/[^/]*$/, '')}assets/logo.png"
                        alt="" style="height:48px;object-fit:contain;" onerror="this.style.display='none'">`;

  win.document.write(`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${baslik} — ${okulAdi}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    @page { size: A4 portrait; margin: 10mm 12mm; }
    
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

    /* ---------- Araç Koltuk Grid ---------- */
    .vehicle-diagram {
      margin: 14px 0; padding: 12px;
      background: #f9f8ff; border: 1px solid #c4b5fd;
      border-radius: 6px; font-size: 10px;
    }
    .vehicle-title { font-weight: 700; margin-bottom: 8px; color: #4f46e5; }
    .seats-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(32px, 1fr));
      gap: 6px; margin: 0 0 10px 0;
    }
    .seat {
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      border: 1px solid #ccc; border-radius: 4px; font-weight: 600;
      font-size: 10px; text-align: center; padding: 2px;
    }
    .seat-occupied { background: #dcfce7; border-color: #22c55e; color: #166534; }
    .seat-reserved { background: #dbeafe; border-color: #3b82f6; color: #1e40af; }
    .seat-empty { background: #f3f4f6; border-color: #9ca3af; color: #6b7280; }
    .seat-number { font-size: 9px; }

    /* ---------- Print ---------- */
    @media print {
      .rapor-toolbar { display: none !important; }
      thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .bolum-baslik { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .vehicle-diagram { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .seat { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .ozet-kutu { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
  <div class="rapor-header">
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
  if (!nobetAtamalari || !nobetAtamalari.length) {
    toast('Nöbet ataması bulunamadı.');
    return;
  }

  const alanlarHtml = `
    <div>
      <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Raporda Gösterilecek Alanlar:</label>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <label style="cursor: pointer;"><input type="checkbox" id="alan_tarih" checked> Tarih</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_ogretmen" checked> Öğretmen</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_nobet" checked> Nöbet Yeri</label>
        <label style="cursor: pointer;"><input type="checkbox" id="alan_durum" checked> Durum</label>
      </div>
    </div>
  `;

  _raporModalAc('🛡️ Nöbet Listesi', alanlarHtml, () => {
    const seciliAlanlar = {
      tarih: document.getElementById('alan_tarih').checked,
      ogretmen: document.getElementById('alan_ogretmen').checked,
      nobet: document.getElementById('alan_nobet').checked,
      durum: document.getElementById('alan_durum').checked,
    };
    modalKapat();
    _raporNobetGoster(seciliAlanlar);
  });
}

function _raporNobetGoster(seciliAlanlar) {
  let html = '';
  
  let thHtml = '<th>#</th>';
  if (seciliAlanlar.tarih) thHtml += '<th>Tarih</th>';
  if (seciliAlanlar.ogretmen) thHtml += '<th>Öğretmen</th>';
  if (seciliAlanlar.nobet) thHtml += '<th>Nöbet Yeri</th>';
  if (seciliAlanlar.durum) thHtml += '<th>Durum</th>';

  html += `<table><thead><tr>${thHtml}</tr></thead><tbody>`;
  
  nobetAtamalari.forEach((n, i) => {
    html += `<tr><td>${i + 1}</td>`;
    if (seciliAlanlar.tarih) html += `<td>${escapeHtml(n.tarih || '—')}</td>`;
    if (seciliAlanlar.ogretmen) {
      const ogr = ogretmenler.find(o => o.id === n.ogretmenId);
      const ogrAdi = ogr ? `${ogr.ad} ${ogr.soyad}` : (n.ogretmenAdSoyad || '—');
      html += `<td>${escapeHtml(ogrAdi)}</td>`;
    }
    if (seciliAlanlar.nobet) {
      const nobet = nobetYerleri.find(y => y.id === n.nobetYeriId);
      const nobetAdi = nobet ? nobet.ad : (n.nobetYeriAd || '—');
      html += `<td>${escapeHtml(nobetAdi)}</td>`;
    }
    if (seciliAlanlar.durum) html += `<td>${escapeHtml(n.durum || 'Atandı')}</td>`;
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  html = `<span class="ozet-kutu">Toplam Nöbet: ${nobetAtamalari.length}</span>` + html;

  _raporPenceresiniAc(html, '🛡️ Nöbet Listesi');
}

/* ================================================================
   4. 📅 Ders Programı  (Modal + alanlar)
   ================================================================ */
function raporDersProgrami() {
  if (!dersProgrami || !dersProgrami.length) {
    toast('Ders programı bulunamadı.');
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

  let html = '';

  hedefSiniflar.forEach(sinif => {
    const dersler = dersProgrami
      .filter(d => d.sinifId === sinif.id || d.sinif === sinif.ad)
      .sort((a, b) => GUNLER_SIRALAMA.indexOf(a.gun) - GUNLER_SIRALAMA.indexOf(b.gun) || a.saat - b.saat);

    if (!dersler.length) return;

    const saatler = [...new Set(dersler.map(d => d.saat))].sort((a, b) => a - b);

    html += `<div class="bolum-baslik">📚 ${escapeHtml(sinif.ad)}</div>
      <table>
        <thead><tr><th>Ders Saati</th>`;
    GUNLER_SIRALAMA.forEach(g => { html += `<th>${g}</th>`; });
    html += `</tr></thead><tbody>`;

    saatler.forEach(saat => {
      html += `<tr><td><strong>${saat}. Ders</strong></td>`;
      GUNLER_SIRALAMA.forEach(gun => {
        const ders = dersler.find(d => d.gun === gun && d.saat === saat);
        if (ders) {
          const ogr = ogretmenler.find(x => x.id === ders.ogretmenId);
          const ogrAdi = ogr ? `${ogr.ad} ${ogr.soyad}` : (ders.ogretmenAdSoyad || '');
          html += `<td>${escapeHtml(ders.ders || '—')}<br><span style="color:#6b7280;font-size:9px;">${escapeHtml(ogrAdi)}</span></td>`;
        } else {
          html += `<td style="color:#ccc;">—</td>`;
        }
      });
      html += `</tr>`;
    });
    html += `</tbody></table>`;
  });

  if (!html) { toast('Seçili sınıf için ders programı yok.'); return; }
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
      const kapasite = plan.kapasite || plan.koltuklar.length;
      const dolu = plan.koltuklar.filter(k => k.ogrenciId || k.ogrenciAdi).length;
      const rezerve = plan.koltuklar.filter(k => k.rezerve).length;
      
      html += `<span class="ozet-kutu">Kapasite: ${kapasite}</span>
               <span class="ozet-kutu">Dolu: ${dolu}</span>
               <span class="ozet-kutu">Rezerve: ${rezerve}</span>
               <span class="ozet-kutu">Boş: ${kapasite - dolu - rezerve}</span>`;

      // Araç Koltuk Düzeni (Visual Grid)
      if (seciliAlanlar.koltukDuzeni) {
        html += `<div class="vehicle-diagram">
          <div class="vehicle-title">🚗 Araç Koltuk Düzeni</div>
          <div class="seats-grid">`;
        
        plan.koltuklar
          .sort((a, b) => (a.no || 0) - (b.no || 0))
          .forEach(k => {
            const durum = k.rezerve ? 'reserved' : (k.ogrenciId || k.ogrenciAdi ? 'occupied' : 'empty');
            const renkClass = {
              occupied: 'seat-occupied',
              reserved: 'seat-reserved',
              empty: 'seat-empty'
            }[durum];
            
            const etiket = durum === 'occupied' ? '✓' : (durum === 'reserved' ? 'R' : '—');
            html += `<div class="seat ${renkClass}"><span class="seat-number">${k.no}</span><br><span style="font-size:8px;">${etiket}</span></div>`;
          });

        html += `</div>
          <div style="font-size:9px;margin-top:6px;padding:4px;background:#fff9e6;">
            <span style="color:#166534;">✓ = Dolu</span> | 
            <span style="color:#1e40af;">R = Rezerve</span> | 
            <span style="color:#6b7280;">— = Boş</span>
          </div>
        </div>`;
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
