/* ====================================================================
   js/raporlama.js  (v1.0)
   A4 optimizeli rapor yazdırma ve PDF indirme modülü.
   Her rapor: okul logosu + okul adı başlıkta, tarih, A4 sayfa yapısı.
   Raporlar:
     • 📋 Öğrenci Listesi        (veliler → sınıfa göre)
     • 👨‍👩‍👧 Veli İletişim Listesi  (veliler + telefon)
     • 🛡️  Nöbet Listesi          (nobetAtamalari + nobetYerleri)
     • 📅 Ders Programı          (dersProgrami + sınıf/öğretmen)
     • ⏰ Ders Saatleri          (dersSaatleri)
     • 🚌 Servis Oturma Planı    (servisler + servisOturmaPlani)
   ==================================================================== */

/* ---------- Yardımcı: Rapor penceresi aç ---------- */
function _raporPenceresiniAc(htmlIcerik, baslik) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { toast('Açılır pencere engellendi. Tarayıcı ayarlarınızı kontrol edin.'); return null; }

  const okulAdi  = (okulBilgileriAyari && okulBilgileriAyari.okulAdi) || 'Okul Yönetim Paneli';
  const tarih    = new Date().toLocaleDateString('tr-TR', { day:'2-digit', month:'long', year:'numeric' });

  // Logo: /assets/logo.png sayfayla aynı kökende varsayılır
  const logoHtml = `<img src="${window.location.origin + window.location.pathname.replace(/[^/]*$/, '')}assets/logo.png"
                        alt="" style="height:52px;object-fit:contain;" onerror="this.style.display='none'">`;

  win.document.write(`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${baslik} — ${okulAdi}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }

    /* ---------- Rapor Başlığı ---------- */
    .rapor-header {
      display: flex; align-items: center; gap: 14px;
      border-bottom: 2px solid #4f46e5; padding-bottom: 10px; margin-bottom: 18px;
    }
    .rapor-header-text { flex: 1; }
    .rapor-header-text h1 { font-size: 18px; color: #4f46e5; font-weight: 700; }
    .rapor-header-text h2 { font-size: 13px; color: #555; font-weight: 400; margin-top: 2px; }
    .rapor-header-text .rapor-tarih { font-size: 11px; color: #888; margin-top: 4px; }

    /* ---------- Araç Çubuğu (print'te gizlenir) ---------- */
    .rapor-toolbar {
      display: flex; gap: 10px; margin-bottom: 20px;
      padding: 10px 14px; background: #f5f5f5; border-radius: 8px;
    }
    .rapor-toolbar button {
      padding: 7px 16px; border: none; border-radius: 6px;
      cursor: pointer; font-size: 13px; font-weight: 600;
    }
    .btn-yazdir { background: #4f46e5; color: #fff; }
    .btn-yazdir:hover { background: #4338ca; }
    .btn-kapat  { background: #e5e7eb; color: #374151; }
    .btn-kapat:hover { background: #d1d5db; }

    /* ---------- Tablo ---------- */
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    thead tr { background: #4f46e5; color: #fff; }
    thead th { padding: 7px 10px; text-align: left; font-size: 11px; font-weight: 600; }
    tbody tr:nth-child(even) { background: #f9f8ff; }
    tbody tr:hover { background: #ede9fe; }
    td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11.5px; vertical-align: top; }

    /* ---------- Bölüm Başlığı ---------- */
    .bolum-baslik {
      background: #ede9fe; color: #4f46e5;
      font-weight: 700; font-size: 12px;
      padding: 5px 10px; margin: 14px 0 6px;
      border-left: 3px solid #4f46e5; border-radius: 0 4px 4px 0;
    }

    /* ---------- Özet Kutusu ---------- */
    .ozet-kutu {
      display: inline-block; background: #f5f3ff; border: 1px solid #c4b5fd;
      border-radius: 6px; padding: 4px 10px; font-size: 11px;
      color: #5b21b6; margin: 0 6px 10px 0;
    }

    /* ---------- Print ---------- */
    @media print {
      @page { size: A4 portrait; margin: 12mm 14mm; }
      body { font-size: 11px; }
      .rapor-toolbar { display: none !important; }
      thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .bolum-baslik { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
      <div class="rapor-tarih">Oluşturulma tarihi: ${tarih}</div>
    </div>
  </div>
  ${htmlIcerik}
</body>
</html>`);
  win.document.close();
  return win;
}

/* ================================================================
   1. 📋 Öğrenci Listesi  (Sınıflar sekmesi)
   ================================================================ */
function raporOgrenciListesi(sinifIdFiltre) {
  // sinifIdFiltre varsa o sınıf, yoksa tüm sınıflar
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
      html += `<p style="color:#888;font-size:11px;padding:4px 10px;">Bu sınıfta kayıtlı öğrenci yok.</p>`;
      return;
    }
    html += `<table>
      <thead><tr>
        <th>#</th><th>Öğrenci Adı Soyadı</th><th>Öğrenci No</th><th>Cinsiyet</th><th>Veli Adı</th><th>Yakınlık</th><th>Not</th>
      </tr></thead><tbody>`;
    ogrenciler.forEach((v, i) => {
      html += `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(v.ogrenciAdi || '—')}</td>
        <td>${escapeHtml(v.ogrenciNo || '—')}</td>
        <td>${escapeHtml(v.cinsiyet || '—')}</td>
        <td>${escapeHtml(v.veliAdi || '—')}</td>
        <td>${escapeHtml(v.yakinlik || '—')}</td>
        <td>${escapeHtml(v.not || '')}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
  });

  html = `<span class="ozet-kutu">Toplam Sınıf: ${seciliSiniflar.length}</span>
           <span class="ozet-kutu">Toplam Öğrenci: ${toplamOgrenci}</span>` + html;

  _raporPenceresiniAc(html, '📋 Öğrenci Listesi');
}

/* ================================================================
   2. 👨‍👩‍👧 Veli İletişim Listesi  (Sınıflar sekmesi)
   ================================================================ */
function raporVeliIletisimListesi(sinifIdFiltre) {
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
      html += `<p style="color:#888;font-size:11px;padding:4px 10px;">Kayıtlı öğrenci yok.</p>`;
      return;
    }
    html += `<table>
      <thead><tr>
        <th>#</th><th>Öğrenci Adı</th><th>Veli Adı</th><th>Yakınlık</th><th>Telefon 1</th><th>Telefon 2</th><th>Telefon 3</th>
      </tr></thead><tbody>`;
    ogrenciler.forEach((v, i) => {
      html += `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(v.ogrenciAdi || '—')}</td>
        <td>${escapeHtml(v.veliAdi || '—')}</td>
        <td>${escapeHtml(v.yakinlik || '—')}</td>
        <td>${escapeHtml(v.telefon1 || v.telefon || '—')}</td>
        <td>${escapeHtml(v.telefon2 || '—')}</td>
        <td>${escapeHtml(v.telefon3 || '—')}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
  });

  html = `<span class="ozet-kutu">Toplam: ${toplamVeli} kayıt</span>` + html;
  _raporPenceresiniAc(html, '👨‍👩‍👧 Veli İletişim Listesi');
}

/* ================================================================
   3. 🛡️ Nöbet Listesi  (Nöbet sekmesi)
   ================================================================ */
function raporNobetListesi() {
  const atamalar = (typeof nobetAtamalari !== 'undefined' ? nobetAtamalari : [])
    .sort((a, b) => a.tarih.localeCompare(b.tarih));

  if (!atamalar.length) {
    toast('Nöbet ataması bulunamadı.'); return;
  }

  // Aya göre grupla
  const aylar = {};
  atamalar.forEach(a => {
    const ay = a.tarih.substring(0, 7); // 'YYYY-MM'
    if (!aylar[ay]) aylar[ay] = [];
    aylar[ay].push(a);
  });

  let html = `<span class="ozet-kutu">Toplam Atama: ${atamalar.length}</span>`;

  Object.keys(aylar).sort().forEach(ay => {
    const [yil, ayNo] = ay.split('-');
    const ayAdi = new Date(parseInt(yil), parseInt(ayNo) - 1, 1)
      .toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    html += `<div class="bolum-baslik">📅 ${ayAdi}</div>
      <table>
        <thead><tr><th>Tarih</th><th>Gün</th><th>Nöbet Yeri</th><th>Öğretmen</th></tr></thead>
        <tbody>`;
    aylar[ay].forEach(a => {
      const yer = (typeof nobetYerleri !== 'undefined' ? nobetYerleri.find(y => y.id === a.yerId) : null);
      const tarihObj = new Date(a.tarih + 'T00:00:00');
      const gun = tarihObj.toLocaleDateString('tr-TR', { weekday: 'long' });
      const tarihGoster = tarihObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const ogr = a.ogretmenAdSoyad || (() => {
        const o = (typeof ogretmenler !== 'undefined' ? ogretmenler.find(x => x.id === a.ogretmenId) : null);
        return o ? `${o.ad} ${o.soyad}` : '—';
      })();
      html += `<tr>
        <td>${tarihGoster}</td><td>${gun}</td>
        <td>${escapeHtml(yer ? yer.ad : (a.yerId || '—'))}</td>
        <td>${escapeHtml(ogr)}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
  });

  _raporPenceresiniAc(html, '🛡️ Nöbet Listesi');
}

/* ================================================================
   4. 📅 Ders Programı  (Ders Programı sekmesi)
   ================================================================ */
function raporDersProgrami(sinifIdFiltre) {
  const GUNLER_SIRALAMA = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

  if (!dersProgrami || !dersProgrami.length) {
    toast('Ders programı bulunamadı.'); return;
  }

  const hedefSiniflar = sinifIdFiltre
    ? siniflar.filter(s => s.id === sinifIdFiltre)
    : [...siniflar].sort((a, b) => (a.ad || '').localeCompare(b.ad || '', 'tr'));

  let html = '';

  hedefSiniflar.forEach(sinif => {
    const dersler = dersProgrami
      .filter(d => d.sinifId === sinif.id || d.sinif === sinif.ad)
      .sort((a, b) => GUNLER_SIRALAMA.indexOf(a.gun) - GUNLER_SIRALAMA.indexOf(b.gun) || a.saat - b.saat);

    if (!dersler.length) return;

    // Benzersiz saat numaraları
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
          const ogr = (typeof ogretmenler !== 'undefined' ? ogretmenler.find(x => x.id === ders.ogretmenId) : null);
          const ogrAdi = ogr ? `${ogr.ad} ${ogr.soyad}` : (ders.ogretmenAdSoyad || '');
          html += `<td>${escapeHtml(ders.ders || '—')}<br><span style="color:#6b7280;font-size:10px;">${escapeHtml(ogrAdi)}</span></td>`;
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
   5. ⏰ Ders Saatleri  (Ayarlar / Ders Saatleri)
   ================================================================ */
function raporDersSaatleri() {
  // ders-saatleri.js'de değişken adı: dersSaatleriAyarlari
  const ds = (typeof dersSaatleriAyarlari !== 'undefined') ? dersSaatleriAyarlari : null;
  if (!ds) { toast('Ders saatleri ayarlanmamış.'); return; }
  // Donemler varsa birinci dönemi al, yoksa düz dersler listesine bak
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
    html += `<p style="margin-top:8px;font-size:11px;color:#555;">
      <strong>Öğle Arası:</strong> ${ogleArasi.sure} dakika
      ${ogleArasi.sonraDers ? `(${ogleArasi.sonraDers}. dersten önce)` : ''}
    </p>`;
  }

  _raporPenceresiniAc(html, '⏰ Ders Saatleri');
}

/* ================================================================
   6. 🚌 Servis Oturma Planı  (Taşıma sekmesi)
   ================================================================ */
function raporServisOturmaPlan(servisIdFiltre) {
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

    html += `<p style="font-size:11px;color:#555;padding:0 0 6px 10px;">
      Şoför: ${escapeHtml(servis.soforAdi || '—')}
      ${servis.soforTelefon ? ` · 📞 ${escapeHtml(servis.soforTelefon)}` : ''}
      &nbsp;|&nbsp; Durum: ${escapeHtml(servis.durum || 'Aktif')}
    </p>`;

    if (plan && plan.koltuklar && plan.koltuklar.length) {
      const kapasite = plan.kapasite || plan.koltuklar.length;
      const dolu = plan.koltuklar.filter(k => k.ogrenciId || k.ogrenciAdi).length;
      html += `<span class="ozet-kutu">Kapasite: ${kapasite}</span>
               <span class="ozet-kutu">Dolu: ${dolu}</span>
               <span class="ozet-kutu">Boş: ${kapasite - dolu}</span>`;

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
    } else {
      // Oturma planı yoksa servisteki öğrencileri listele
      const ogrenciler = veliler
        .filter(v => v.servisId === servis.id)
        .sort((a, b) => (a.ogrenciAdi || '').localeCompare(b.ogrenciAdi || '', 'tr'));

      if (ogrenciler.length) {
        html += `<p style="font-size:11px;color:#888;padding:0 0 4px 10px;">
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
        html += `<p style="color:#888;font-size:11px;padding:4px 10px;">Bu serviste kayıtlı öğrenci yok.</p>`;
      }
    }
  });

  _raporPenceresiniAc(html, '🚌 Servis Oturma Planı');
}
