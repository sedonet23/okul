/* =============================================================
   js/ogretmen-liste-olusturucu.js
   ÖĞRETMENE ÖZEL ÖĞRENCİ LİSTESİ OLUŞTURUCU
   ---------------------------------------------------------------
   Girişli öğretmen, ders programında girdiği (veya sınıf öğretmeni
   olduğu) sınıflardan birini seçer; istediği sütunları işaretler,
   isterse boş özel sütun ekler, düzeni şablon olarak kaydedebilir.
   Çıktı: Yazdır (dikey/yatay, zebra desenli — sınıf listesi ile
   aynı desen), Excel (.xlsx) ve PDF.
   ============================================================= */

const OL_HAZIR_SUTUNLAR = [
  { key: 'siraNo',     label: 'Sıra No',    fn: (v, i) => String(i + 1) },
  { key: 'ogrenciAdi', label: 'Ad Soyad',   fn: v => v.ogrenciAdi || '' },
  { key: 'ogrenciNo',  label: 'Öğrenci No', fn: v => v.ogrenciNo  || '' },
  { key: 'cinsiyet',   label: 'Cinsiyet',   fn: v => v.cinsiyet   || '' },
  { key: 'veliAdi',    label: 'Veli Adı',   fn: v => v.veliAdi    || '' },
  { key: 'yakinlik',   label: 'Yakınlık',   fn: v => v.yakinlik1 || v.yakinlik || '' },
  { key: 'telefon1',   label: 'Telefon 1',  fn: v => v.telefon1 || v.telefon || '' },
  { key: 'telefon2',   label: 'Telefon 2',  fn: v => v.telefon2   || '' },
  { key: 'adres',      label: 'Adres',      fn: v => v.adres      || '' },
  { key: 'servisAdi',  label: 'Servis',     fn: v => v.servisAdi  || '' },
  { key: 'notlar',     label: 'Notlar',     fn: v => v.notlar     || '' },
];

let _olSeciliSinif = '';
let _olOzelSutunSayaci = 0;

/* ---------- öğretmenin girdiği sınıflar ---------- */
function olKendiSiniflarim() {
  const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
  if (!ben) return [];
  const set = new Set();
  dersProgrami.filter(d => d.ogretmenId === ben.id).forEach(d => { if (d.sinif) set.add(d.sinif); });
  siniflar.filter(s => s.sinifOgretmeniId === ben.id).forEach(s => set.add(s.ad));
  return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
}

function olSablonId(sinifAdi) {
  const ben = bagliOgretmenimGetir();
  return `${ben.id}__${sinifAdi}`.replace(/[^\w\-]/g, '_');
}

/* ---------- sekme açılışı ---------- */
function ogretmenListeSekmesiAc() {
  const panel = document.getElementById('tab-ogretmenListe');
  if (!panel) return;
  const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;

  if (!ben) {
    document.getElementById('olIcerik').innerHTML =
      `<div class="card" style="text-align:center;color:var(--ink-muted);padding:30px;">
        Bu bölüm, hesabınıza bağlı bir öğretmen kaydı gerektirir.
      </div>`;
    return;
  }

  const siniflarim = olKendiSiniflarim();
  const secenekler = siniflarim.map(ad => `<option value="${escapeHtml(ad)}">${escapeHtml(ad)}</option>`).join('');

  document.getElementById('olIcerik').innerHTML = `
    <div class="card" style="margin-bottom:14px;">
      <label style="font-weight:600;font-size:13px;display:block;margin-bottom:6px;">Sınıf Seçin</label>
      <select id="olSinifSecici" style="width:100%;max-width:320px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;" onchange="olSinifSecildi(this.value)">
        <option value="">— Sınıf seçiniz —</option>
        ${secenekler}
      </select>
      ${!siniflarim.length ? '<div style="margin-top:8px;font-size:12.5px;color:var(--ink-muted);">Ders programında kayıtlı bir sınıfınız bulunamadı.</div>' : ''}
    </div>
    <div id="olCalismaAlani"></div>
  `;
}

/* ---------- sınıf seçildiğinde ---------- */
async function olSinifSecildi(sinifAdi) {
  _olSeciliSinif = sinifAdi;
  const alan = document.getElementById('olCalismaAlani');
  if (!sinifAdi) { alan.innerHTML = ''; return; }

  alan.innerHTML = `<div class="card" style="color:var(--ink-muted);">Yükleniyor…</div>`;

  // kayıtlı şablon var mı?
  let sablon = null;
  try {
    const dogSnap = await db.collection('oy_ogretmenListeSablon').doc(olSablonId(sinifAdi)).get();
    if (dogSnap.exists) sablon = dogSnap.data();
  } catch (e) { console.error('Şablon okunamadı:', e); }

  const seciliKeyler = sablon?.secilenKeyler || OL_HAZIR_SUTUNLAR.map(c => c.key);
  const ozelSutunlar = sablon?.ozelSutunlar || [];

  const checkboxler = OL_HAZIR_SUTUNLAR.map(col => `
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:3px 0;">
      <input type="checkbox" class="ol-sutun-check" value="${col.key}" ${seciliKeyler.includes(col.key) ? 'checked' : ''} style="cursor:pointer;width:15px;height:15px;">
      <span>${escapeHtml(col.label)}</span>
    </label>`).join('');

  _olOzelSutunSayaci = 0;
  const ozelSutunHtml = ozelSutunlar.map(ad => olOzelSutunSatiri(ad)).join('');

  alan.innerHTML = `
    <div class="card" style="margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Sütunları Seç</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:2px 16px;padding:10px;background:var(--nm-bg,#f0f0f3);border-radius:8px;">
        ${checkboxler}
      </div>

      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">Özel Sütun Ekle (Boş)</div>
      <div id="olOzelSutunListesi" style="display:flex;flex-direction:column;gap:6px;">${ozelSutunHtml}</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="olOzelSutunEkle()">+ Özel Sütun Ekle</button>

      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">Sayfa Yönü</div>
      <div style="display:flex;gap:16px;">
        <label style="display:flex;align-items:center;gap:5px;cursor:pointer;">
          <input type="radio" name="olYon" value="portrait" checked> Dikey (A4)
        </label>
        <label style="display:flex;align-items:center;gap:5px;cursor:pointer;">
          <input type="radio" name="olYon" value="landscape"> Yatay (A4)
        </label>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">
        <button class="btn btn-amber" onclick="olOnizlemeGuncelle()">🔄 Önizlemeyi Güncelle</button>
        <button class="btn btn-ghost" onclick="olSablonKaydet()">💾 Şablonu Kaydet</button>
        <button class="btn btn-ghost" onclick="olYazdir()">🖨️ Yazdır</button>
        <button class="btn btn-ghost" onclick="olExcelAktar()">📊 Excel'e Aktar</button>
        <button class="btn btn-ghost" onclick="olPdfAktar()">📄 PDF'e Aktar</button>
      </div>
    </div>

    <div class="card">
      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Önizleme</div>
      <div id="olOnizlemeAlani" style="overflow-x:auto;"></div>
    </div>
  `;

  olOnizlemeGuncelle();
}

function olOzelSutunSatiri(ad) {
  _olOzelSutunSayaci++;
  return `
    <div style="display:flex;gap:6px;align-items:center;">
      <input class="ol-ozel-sutun-input" type="text" placeholder="Sütun adı (örn: İmza)" value="${escapeHtml(ad || '')}"
        style="flex:1;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px;">
      <button class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="this.parentElement.remove()">✕</button>
    </div>`;
}

function olOzelSutunEkle() {
  const kap = document.getElementById('olOzelSutunListesi');
  if (!kap) return;
  kap.insertAdjacentHTML('beforeend', olOzelSutunSatiri(''));
}

/* ---------- seçili sütunları topla ---------- */
function olTumSutunlariGetir() {
  const seciliKeyler = [...document.querySelectorAll('.ol-sutun-check')]
    .filter(el => el.checked).map(el => el.value);
  const seciliSutunlar = OL_HAZIR_SUTUNLAR.filter(c => seciliKeyler.includes(c.key));

  const ozelSutunlar = [...document.querySelectorAll('.ol-ozel-sutun-input')]
    .map(el => el.value.trim()).filter(Boolean)
    .map(label => ({ key: '_ozel_' + label, label, fn: () => '' }));

  return [...seciliSutunlar, ...ozelSutunlar];
}

function olOgrencileriGetir() {
  const s = siniflar.find(x => x.ad === _olSeciliSinif);
  const sinifId = s ? s.id : _olSeciliSinif;
  return veliler
    .filter(v => v.sinifId === sinifId || v.sinifId === _olSeciliSinif)
    .sort((a, b) => (a.ogrenciAdi || '').localeCompare(b.ogrenciAdi || '', 'tr'));
}

/* ---------- önizleme ---------- */
function olOnizlemeGuncelle() {
  const alan = document.getElementById('olOnizlemeAlani');
  if (!alan) return;
  const sutunlar = olTumSutunlariGetir();
  const ogrenciler = olOgrencileriGetir();

  if (!sutunlar.length) { alan.innerHTML = '<div style="color:var(--ink-muted);">En az bir sütun seçin.</div>'; return; }

  const th = sutunlar.map(c => `<th style="padding:6px 8px;background:#1B3A5C;color:#fff;text-align:left;font-size:12px;">${escapeHtml(c.label)}</th>`).join('');
  const tr = ogrenciler.map((v, i) => `
    <tr style="${i % 2 === 1 ? 'background:#f2f5f8;' : ''}">
      ${sutunlar.map(c => `<td style="padding:5px 8px;font-size:12.5px;border-bottom:1px solid #e4e8ec;">${escapeHtml(c.fn(v, i))}</td>`).join('')}
    </tr>`).join('');

  alan.innerHTML = `
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>${th}</tr></thead>
      <tbody>${tr}</tbody>
    </table>
    <div style="margin-top:8px;font-size:12px;color:var(--ink-muted);">Toplam öğrenci: <strong>${ogrenciler.length}</strong></div>
  `;
}

/* ---------- şablon kaydet ---------- */
async function olSablonKaydet() {
  if (!_olSeciliSinif) { toast('Önce bir sınıf seçin.'); return; }
  const seciliKeyler = [...document.querySelectorAll('.ol-sutun-check')].filter(el => el.checked).map(el => el.value);
  const ozelSutunlar = [...document.querySelectorAll('.ol-ozel-sutun-input')].map(el => el.value.trim()).filter(Boolean);
  const ben = bagliOgretmenimGetir();

  try {
    await db.collection('oy_ogretmenListeSablon').doc(olSablonId(_olSeciliSinif)).set({
      ogretmenId: ben.id,
      sinif: _olSeciliSinif,
      secilenKeyler: seciliKeyler,
      ozelSutunlar: ozelSutunlar,
      guncellenme: new Date().toISOString(),
    });
    toast('Şablon kaydedildi. Bu sınıf için tekrar açtığınızda otomatik yüklenecek.');
  } catch (e) {
    console.error(e);
    toast('Şablon kaydedilemedi.');
  }
}

/* ---------- yazdırma (dikey/yatay seçilebilir + zebra desen) ---------- */
function olYazdir() {
  const sutunlar = olTumSutunlariGetir();
  const ogrenciler = olOgrencileriGetir();
  if (!sutunlar.length) { toast('En az bir sütun seçin.'); return; }

  const yon = document.querySelector('input[name="olYon"]:checked')?.value || 'portrait';
  const okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) ? okulBilgileriAyari.okulAdi : '';
  const ben = bagliOgretmenimGetir();
  const ogretmenAdSoyad = ben ? `${ben.ad || ''} ${ben.soyad || ''}`.trim() : '';

  const thHTML = sutunlar.map(c => `<th>${escapeHtml(c.label)}</th>`).join('');
  const trHTML = ogrenciler.map((v, i) =>
    `<tr>${sutunlar.map(c => `<td>${escapeHtml(c.fn(v, i))}</td>`).join('')}</tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(_olSeciliSinif)} Öğrenci Listesi</title>
<style>
  @page { size: A4 ${yon}; margin: 1.2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; }
  .header { text-align: center; margin-bottom: 14px; border-bottom: 2px solid #333; padding-bottom: 10px; }
  .header .okul { font-size: 15px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; }
  .header .baslik { font-size: 13px; font-weight: 600; margin-top: 5px; }
  .header .meta { font-size: 10px; color: #666; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background: #1B3A5C; color: #fff; padding: 5px 6px; text-align: left; font-size: 10px; font-weight: 600; white-space: nowrap; }
  td { padding: 4px 6px; border-bottom: 1px solid #ddd; vertical-align: top; }
  tr:nth-child(even) td { background: #f7f7f7; }
  tr:last-child td { border-bottom: 2px solid #333; }
  .ogrenci-sayisi { margin-top: 8px; font-size: 10px; color: #444; text-align: right; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    ${okulAdi ? `<div class="okul">${escapeHtml(okulAdi)}</div>` : ''}
    <div class="baslik">${escapeHtml(_olSeciliSinif)} Sınıfı Öğrenci Listesi</div>
    <div class="meta">${ogretmenAdSoyad ? escapeHtml(ogretmenAdSoyad) + ' &nbsp;·&nbsp; ' : ''}${new Date().toLocaleDateString('tr-TR')}</div>
  </div>
  <table>
    <thead><tr>${thHTML}</tr></thead>
    <tbody>${trHTML}</tbody>
  </table>
  <div class="ogrenci-sayisi">Toplam öğrenci sayısı: <strong>${ogrenciler.length}</strong></div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}

/* ---------- Excel'e aktar ---------- */
function olExcelAktar() {
  const sutunlar = olTumSutunlariGetir();
  const ogrenciler = olOgrencileriGetir();
  if (!sutunlar.length) { toast('En az bir sütun seçin.'); return; }
  if (typeof XLSX === 'undefined') { toast('Excel kütüphanesi yüklenemedi.'); return; }

  const basliklar = sutunlar.map(c => c.label);
  const satirlar = ogrenciler.map((v, i) => sutunlar.map(c => c.fn(v, i)));
  const ws = XLSX.utils.aoa_to_sheet([basliklar, ...satirlar]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (_olSeciliSinif || 'Liste').slice(0, 31));
  XLSX.writeFile(wb, `${_olSeciliSinif}_Ogrenci_Listesi.xlsx`);
}

/* ---------- PDF'e aktar ---------- */
function olPdfAktar() {
  const sutunlar = olTumSutunlariGetir();
  const ogrenciler = olOgrencileriGetir();
  if (!sutunlar.length) { toast('En az bir sütun seçin.'); return; }
  if (typeof window.jspdf === 'undefined') { toast('PDF kütüphanesi yüklenemedi.'); return; }

  const yon = document.querySelector('input[name="olYon"]:checked')?.value || 'portrait';
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: yon === 'landscape' ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });

  const okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) ? okulBilgileriAyari.okulAdi : '';
  doc.setFontSize(12);
  doc.text(`${_olSeciliSinif} Sınıfı Öğrenci Listesi`, 14, 14);
  if (okulAdi) { doc.setFontSize(9); doc.text(okulAdi, 14, 20); }

  doc.autoTable({
    startY: okulAdi ? 24 : 20,
    head: [sutunlar.map(c => c.label)],
    body: ogrenciler.map((v, i) => sutunlar.map(c => c.fn(v, i))),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [27, 58, 92], textColor: 255 },
    alternateRowStyles: { fillColor: [247, 247, 247] }, // zebra desen
  });

  doc.save(`${_olSeciliSinif}_Ogrenci_Listesi.pdf`);
}
