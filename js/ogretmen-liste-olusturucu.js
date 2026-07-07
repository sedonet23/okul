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
let _olLogoDataUri = null;
let _olPdfFontBase64 = null;

/* ---------- PDF fontunu önbellekle ----------
   jsPDF'in yerleşik fontları (Helvetica vb.) WinAnsi kodlamasını
   kullanıyor ve Türkçe'ye özgü ı, ğ, ş, İ, Ğ, Ş karakterlerini
   içermiyor — bu yüzden "Sınıfı" gibi kelimeler "S1n1f1" şeklinde
   bozuk çıkıyordu. Çözüm: Türkçe karakterleri destekleyen bir Unicode
   TTF fontu (Roboto) çalışma anında indirip PDF'e gömüyoruz. */
async function olPdfFontBase64Getir() {
  if (_olPdfFontBase64 !== null) return _olPdfFontBase64;
  try {
    const resp = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.12/fonts/Roboto/Roboto-Regular.ttf');
    const buf = await resp.arrayBuffer();
    _olPdfFontBase64 = olArrayBufferToBase64(buf);
  } catch (e) {
    console.warn('PDF fontu yüklenemedi, Türkçe karakterler bozuk görünebilir:', e);
    _olPdfFontBase64 = '';
  }
  return _olPdfFontBase64;
}

function olArrayBufferToBase64(buffer) {
  let ikili = '';
  const bytes = new Uint8Array(buffer);
  const parcaBoyu = 0x8000; // büyük dosyalarda call-stack taşmasını önlemek için parça parça
  for (let i = 0; i < bytes.length; i += parcaBoyu) {
    ikili += String.fromCharCode.apply(null, bytes.subarray(i, i + parcaBoyu));
  }
  return btoa(ikili);
}

/* ---------- okul logosunu data URI olarak önbellekle ----------
   Yazdırma penceresi/PDF, sayfanın normal DOM bağlamının dışında
   (blob URL / native plugin) render edildiği için "assets/..." gibi
   göreli yollar çözülemiyor — bu yüzden logoyu bir kere base64'e
   çevirip önbellekte tutuyoruz. */
async function olLogoDataUriGetir() {
  if (_olLogoDataUri) return _olLogoDataUri;
  try {
    const resp = await fetch('assets/icon-192.png');
    const blob = await resp.blob();
    _olLogoDataUri = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  } catch (e) { console.warn('Okul logosu yüklenemedi:', e); _olLogoDataUri = ''; }
  return _olLogoDataUri;
}

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
  olLogoDataUriGetir(); // arka planda önbelleğe al, sonucu bekleme

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
  const bs = sablon?.baslikBilgisi || {};

  // Kayıtlı bir sıralama varsa onu kullan; yoksa varsayılan tanım sırası.
  // Şablonda olmayan (yeni eklenmiş) sütunlar listenin sonuna eklenir.
  let sutunSirasi = (sablon?.sutunSirasi || []).filter(k => OL_HAZIR_SUTUNLAR.some(c => c.key === k));
  OL_HAZIR_SUTUNLAR.forEach(c => { if (!sutunSirasi.includes(c.key)) sutunSirasi.push(c.key); });

  const checkboxler = sutunSirasi.map(key => {
    const col = OL_HAZIR_SUTUNLAR.find(c => c.key === key);
    if (!col) return '';
    return `
    <div class="ol-sutun-satir" data-key="${col.key}" style="display:flex;align-items:center;gap:4px;padding:5px 4px;border-bottom:1px solid var(--border);">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;">
        <input type="checkbox" class="ol-sutun-check" value="${col.key}" ${seciliKeyler.includes(col.key) ? 'checked' : ''} style="cursor:pointer;width:15px;height:15px;flex-shrink:0;">
        <span>${escapeHtml(col.label)}</span>
      </label>
      <button type="button" class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:13px;" onclick="olSutunTasi(this,-1)" title="Yukarı taşı">▲</button>
      <button type="button" class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:13px;" onclick="olSutunTasi(this,1)" title="Aşağı taşı">▼</button>
    </div>`;
  }).join('');

  _olOzelSutunSayaci = 0;
  const ozelSutunHtml = ozelSutunlar.map(ad => olOzelSutunSatiri(ad)).join('');

  // Varsayılan değerler
  const ben = bagliOgretmenimGetir();
  const _okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) ? okulBilgileriAyari.okulAdi : '';
  const _yil = (() => { const y = new Date().getFullYear(); return `${y}-${y + 1}`; })();
  const _ogretmenAdSoyad = ben ? `${ben.ad || ''} ${ben.soyad || ''}`.trim() : '';
  const _ogretmenBrans = ben ? (ben.brans || '') : '';
  const _mudur = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.mudurId)
    ? ogretmenler.find(o => o.id === okulBilgileriAyari.mudurId) : null;
  const _mudurAdSoyad = _mudur ? `${_mudur.ad || ''} ${_mudur.soyad || ''}`.trim() : '';

  const inputStil = 'width:100%;padding:5px 9px;border:1px solid var(--border);border-radius:6px;font-size:13px;';
  const satir = (id, placeholder, deger, gosterVarsayilan) => `
    <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
      <input id="${id}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(deger)}" style="${inputStil}">
      <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;">
        <input type="checkbox" id="${id}Goster" ${gosterVarsayilan ? 'checked' : ''}> Göster
      </label>
    </div>`;

  alan.innerHTML = `
    <div class="card" style="margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Başlık Bilgileri (İsteğe Bağlı)</div>
      <div style="display:grid;gap:7px;">
        ${satir('olOkulAdi', 'Okul Adı', bs.okulAdi ?? _okulAdi, bs.okulAdiGoster ?? true)}
        ${satir('olEgitimYili', 'Eğitim-Öğretim Yılı', bs.egitimYili ?? _yil, bs.egitimYiliGoster ?? true)}
        ${satir('olAltBaslik', 'Alt Başlık (isteğe bağlı, örn: Veli Toplantısı Listesi)', bs.altBaslik ?? '', bs.altBaslikGoster ?? false)}
      </div>

      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">İmza / Onay Satırı (İsteğe Bağlı)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="display:grid;gap:7px;">
          ${satir('olOgretmenAdSoyad', 'Öğretmen Ad Soyad', bs.ogretmenAdSoyad ?? _ogretmenAdSoyad, bs.ogretmenGoster ?? true)}
          ${satir('olOgretmenBrans', 'Branş', bs.ogretmenBrans ?? _ogretmenBrans, bs.ogretmenBransGoster ?? true)}
        </div>
        <div style="display:grid;gap:7px;">
          ${satir('olMudurAdSoyad', 'Okul Müdürü Ad Soyad', bs.mudurAdSoyad ?? _mudurAdSoyad, bs.mudurGoster ?? true)}
          ${satir('olMudurUnvan', 'Ünvan', bs.mudurUnvan ?? 'Okul Müdürü', bs.mudurUnvanGoster ?? true)}
        </div>
      </div>

      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">Sütunları Seç ve Sırala</div>
      <div style="font-size:11.5px;color:var(--ink-muted);margin-bottom:6px;">▲ / ▼ ile sütunların sırasını değiştirebilirsiniz.</div>
      <div id="olSutunListesi" style="display:flex;flex-direction:column;padding:4px 10px;background:var(--nm-bg,#f0f0f3);border-radius:8px;">
        ${checkboxler}
      </div>

      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">Özel Sütun Ekle (Boş)</div>
      <div id="olOzelSutunListesi" style="display:flex;flex-direction:column;gap:6px;">${ozelSutunHtml}</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="olOzelSutunEkle()">+ Özel Sütun Ekle</button>

      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">Sayfa Yönü</div>
      <div style="display:flex;gap:16px;">
        <label style="display:flex;align-items:center;gap:5px;cursor:pointer;">
          <input type="radio" name="olYon" value="portrait" ${(bs.yon ?? 'portrait') === 'portrait' ? 'checked' : ''}> Dikey (A4)
        </label>
        <label style="display:flex;align-items:center;gap:5px;cursor:pointer;">
          <input type="radio" name="olYon" value="landscape" ${bs.yon === 'landscape' ? 'checked' : ''}> Yatay (A4)
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

/* ---------- sütun sırasını değiştir (yukarı/aşağı) ---------- */
function olSutunTasi(btn, yon) {
  const satir = btn.closest('.ol-sutun-satir');
  if (!satir) return;
  if (yon < 0) {
    const onceki = satir.previousElementSibling;
    if (onceki) satir.parentElement.insertBefore(satir, onceki);
  } else {
    const sonraki = satir.nextElementSibling;
    if (sonraki) satir.parentElement.insertBefore(sonraki, satir);
  }
  olOnizlemeGuncelle();
}

/* ---------- seçili sütunları topla (ekrandaki güncel sıraya göre) ---------- */
function olTumSutunlariGetir() {
  const seciliSutunlar = [...document.querySelectorAll('.ol-sutun-satir')]
    .map(satir => satir.querySelector('.ol-sutun-check'))
    .filter(el => el && el.checked)
    .map(el => OL_HAZIR_SUTUNLAR.find(c => c.key === el.value))
    .filter(Boolean);

  const ozelSutunlar = [...document.querySelectorAll('.ol-ozel-sutun-input')]
    .map(el => el.value.trim()).filter(Boolean)
    .map(label => ({ key: '_ozel_' + label, label, fn: () => '' }));

  return [...seciliSutunlar, ...ozelSutunlar];
}

/* ---------- başlık / imza bilgilerini topla ---------- */
function olBaslikBilgisiGetir() {
  const g = id => document.getElementById(id);
  const gv = id => g(id)?.value?.trim() || '';
  const gc = id => g(id)?.checked ?? false;
  return {
    yon: document.querySelector('input[name="olYon"]:checked')?.value || 'portrait',
    okulAdi: gv('olOkulAdi'), okulAdiGoster: gc('olOkulAdiGoster'),
    egitimYili: gv('olEgitimYili'), egitimYiliGoster: gc('olEgitimYiliGoster'),
    altBaslik: gv('olAltBaslik'), altBaslikGoster: gc('olAltBaslikGoster'),
    ogretmenAdSoyad: gv('olOgretmenAdSoyad'), ogretmenGoster: gc('olOgretmenAdSoyadGoster'),
    ogretmenBrans: gv('olOgretmenBrans'), ogretmenBransGoster: gc('olOgretmenBransGoster'),
    mudurAdSoyad: gv('olMudurAdSoyad'), mudurGoster: gc('olMudurAdSoyadGoster'),
    mudurUnvan: gv('olMudurUnvan'), mudurUnvanGoster: gc('olMudurUnvanGoster'),
  };
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

  const ortalanacakAnahtarlar = ['siraNo', 'ogrenciNo'];
  const th = sutunlar.map(c => `<th style="padding:6px 8px;background:#1B3A5C;color:#fff;text-align:${ortalanacakAnahtarlar.includes(c.key) ? 'center' : 'left'};font-size:12px;border:1px solid #1B3A5C;">${escapeHtml(c.label)}</th>`).join('');
  const tr = ogrenciler.map((v, i) => `
    <tr style="${i % 2 === 1 ? 'background:#f2f5f8;' : ''}">
      ${sutunlar.map(c => `<td style="padding:5px 8px;font-size:12.5px;border:1px solid #e4e8ec;text-align:${ortalanacakAnahtarlar.includes(c.key) ? 'center' : 'left'};">${escapeHtml(c.fn(v, i))}</td>`).join('')}
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
  const sutunSirasi = [...document.querySelectorAll('.ol-sutun-satir')].map(satir => satir.dataset.key);
  const seciliKeyler = [...document.querySelectorAll('.ol-sutun-check')].filter(el => el.checked).map(el => el.value);
  const ozelSutunlar = [...document.querySelectorAll('.ol-ozel-sutun-input')].map(el => el.value.trim()).filter(Boolean);
  const ben = bagliOgretmenimGetir();

  try {
    await db.collection('oy_ogretmenListeSablon').doc(olSablonId(_olSeciliSinif)).set({
      ogretmenId: ben.id,
      sinif: _olSeciliSinif,
      secilenKeyler: seciliKeyler,
      sutunSirasi: sutunSirasi,
      ozelSutunlar: ozelSutunlar,
      baslikBilgisi: olBaslikBilgisiGetir(),
      guncellenme: new Date().toISOString(),
    });
    toast('Şablon kaydedildi. Bu sınıf için tekrar açtığınızda otomatik yüklenecek.');
  } catch (e) {
    console.error(e);
    toast('Şablon kaydedilemedi.');
  }
}

/* ---------- yazdırma (dikey/yatay seçilebilir + zebra desen) ---------- */
async function olYazdir() {
  const sutunlar = olTumSutunlariGetir();
  const ogrenciler = olOgrencileriGetir();
  if (!sutunlar.length) { toast('En az bir sütun seçin.'); return; }

  const bs = olBaslikBilgisiGetir();
  const logo = await olLogoDataUriGetir();

  const ortalanacakAnahtarlar = ['siraNo', 'ogrenciNo'];
  const thHTML = sutunlar.map(c => `<th class="${ortalanacakAnahtarlar.includes(c.key) ? 'ortali' : ''}">${escapeHtml(c.label)}</th>`).join('');
  const trHTML = ogrenciler.map((v, i) =>
    `<tr>${sutunlar.map(c => `<td class="${ortalanacakAnahtarlar.includes(c.key) ? 'ortali' : ''}">${escapeHtml(c.fn(v, i))}</td>`).join('')}</tr>`
  ).join('');

  const metaParcalar = [];
  if (bs.egitimYiliGoster && bs.egitimYili) metaParcalar.push(escapeHtml(bs.egitimYili) + ' Eğitim-Öğretim Yılı');

  const imzaSol = bs.ogretmenGoster
    ? `Öğretmen: <strong>${escapeHtml(bs.ogretmenAdSoyad || '...............................')}</strong>` +
      (bs.ogretmenBransGoster && bs.ogretmenBrans ? `<br>${escapeHtml(bs.ogretmenBrans)}` : '') +
      `<br><br>İmza: .......................`
    : '';
  const imzaSag = bs.mudurGoster
    ? `${bs.mudurUnvanGoster && bs.mudurUnvan ? escapeHtml(bs.mudurUnvan) : 'Okul Müdürü'}: <strong>${escapeHtml(bs.mudurAdSoyad || '...............................')}</strong>` +
      `<br><br>İmza: .......................`
    : '';

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(_olSeciliSinif)} Öğrenci Listesi</title>
<style>
  @page { size: A4 ${bs.yon}; margin: 1.2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; }
  .header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; border-bottom: 2px solid #333; padding-bottom: 10px; }
  .header .logo { width: 64px; height: 64px; object-fit: contain; flex-shrink: 0; }
  .header .metin { flex: 1; text-align: center; }
  .header .logo-bosluk { width: 64px; flex-shrink: 0; }
  .header .okul { font-size: 15px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; }
  .header .baslik { font-size: 13px; font-weight: 600; margin-top: 5px; }
  .header .alt-baslik { font-size: 11px; margin-top: 3px; color: #444; }
  .header .meta { font-size: 10px; color: #666; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background: #1B3A5C; color: #fff; padding: 5px 6px; text-align: left; font-size: 10px; font-weight: 600; white-space: nowrap; border: 1px solid #1B3A5C; }
  td { padding: 4px 6px; border: 1px solid #ddd; vertical-align: top; }
  th.ortali, td.ortali { text-align: center; }
  tr:nth-child(even) td { background: #f7f7f7; }
  tr:last-child td { border-bottom: 2px solid #333; }
  .ogrenci-sayisi { margin-top: 8px; font-size: 10px; color: #444; text-align: right; }
  .footer { margin-top: 16px; display: flex; justify-content: space-between; font-size: 10px; color: #444; line-height: 1.8; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    ${logo ? `<img class="logo" src="${logo}" alt="Okul Logosu">` : ''}
    <div class="metin">
      ${bs.okulAdiGoster && bs.okulAdi ? `<div class="okul">${escapeHtml(bs.okulAdi)}</div>` : ''}
      <div class="baslik">${escapeHtml(_olSeciliSinif)} Sınıfı Öğrenci Listesi</div>
      ${bs.altBaslikGoster && bs.altBaslik ? `<div class="alt-baslik">${escapeHtml(bs.altBaslik)}</div>` : ''}
      ${metaParcalar.length ? `<div class="meta">${metaParcalar.join(' &nbsp;·&nbsp; ')}</div>` : ''}
    </div>
    ${logo ? `<div class="logo-bosluk"></div>` : ''}
  </div>
  <table>
    <thead><tr>${thHTML}</tr></thead>
    <tbody>${trHTML}</tbody>
  </table>
  <div class="ogrenci-sayisi">Toplam öğrenci sayısı: <strong>${ogrenciler.length}</strong></div>
  ${(imzaSol || imzaSag) ? `<div class="footer"><div>${imzaSol}</div><div style="text-align:right;">${imzaSag}</div></div>` : ''}
</body>
</html>`;

  // Android'de window.open + window.print() çıplak WebView'de çalışmıyor —
  // uygulama genelinde kullanılan ortak yazdırma yardımcısı (native
  // PrintPlugin / blob-URL fallback) üzerinden yazdırılıyor.
  uygulamaHtmlYazdir(html, `${_olSeciliSinif}_Ogrenci_Listesi`, bs.yon === 'landscape' ? 'yatay' : 'dikey');
}

/* ---------- Excel'e aktar ----------
   Not: Bu projede daha önce kullanılan SheetJS'in (XLSX) ücretsiz sürümü
   .xlsx yazarken hücre biçimlendirmesi (kalın yazı, dolgu rengi, kenarlık,
   donmuş satır) uygulayamıyor — sadece ham veri yazılabiliyor. Bu yüzden
   yazma işlemi için, uygulamada zaten yüklü olan ve tam biçimlendirme
   desteği sunan ExcelJS kütüphanesi kullanılıyor (bkz. dokuman-okuyucu.js
   içindeki aynı gerekçe). */
async function olExcelAktar() {
  const sutunlar = olTumSutunlariGetir();
  const ogrenciler = olOgrencileriGetir();
  if (!sutunlar.length) { toast('En az bir sütun seçin.'); return; }
  if (typeof ExcelJS === 'undefined') { toast('Excel kütüphanesi yüklenemedi.'); return; }

  const bs = olBaslikBilgisiGetir();
  const sutunSayisi = sutunlar.length;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet((_olSeciliSinif || 'Liste').slice(0, 31));
  ws.columns = sutunlar.map(() => ({ width: 18 }));

  let satirNo = 1;
  const baslikSatiriEkle = (metin, { boyut = 11, renk = 'FF1B3A5C', yukseklik = 18 } = {}) => {
    ws.mergeCells(satirNo, 1, satirNo, sutunSayisi);
    const hucre = ws.getCell(satirNo, 1);
    hucre.value = metin;
    hucre.alignment = { horizontal: 'center', vertical: 'middle' };
    hucre.font = { bold: true, size: boyut, color: { argb: renk } };
    ws.getRow(satirNo).height = yukseklik;
    satirNo++;
  };

  if (bs.okulAdiGoster && bs.okulAdi) baslikSatiriEkle(bs.okulAdi, { boyut: 13 });
  baslikSatiriEkle(`${_olSeciliSinif} Sınıfı Öğrenci Listesi`, { boyut: 12 });
  if (bs.altBaslikGoster && bs.altBaslik) baslikSatiriEkle(bs.altBaslik, { boyut: 10, renk: 'FF444444' });
  if (bs.egitimYiliGoster && bs.egitimYili) baslikSatiriEkle(`${bs.egitimYili} Eğitim-Öğretim Yılı`, { boyut: 9, renk: 'FF666666', yukseklik: 16 });
  satirNo++; // boş satır

  const basliklarRowNo = satirNo;
  const basliklarRow = ws.getRow(basliklarRowNo);
  const kenarlikIncGri = { style: 'thin', color: { argb: 'FFB8C2CC' } };
  const ortalanacakAnahtarlar = ['siraNo', 'ogrenciNo'];
  sutunlar.forEach((c, i) => {
    const hucre = basliklarRow.getCell(i + 1);
    hucre.value = c.label;
    hucre.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    hucre.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A5C' } };
    hucre.alignment = { horizontal: ortalanacakAnahtarlar.includes(c.key) ? 'center' : 'left', vertical: 'middle' };
    hucre.border = { top: kenarlikIncGri, left: kenarlikIncGri, bottom: kenarlikIncGri, right: kenarlikIncGri };
  });
  basliklarRow.height = 20;
  satirNo++;

  ogrenciler.forEach((v, i) => {
    const row = ws.getRow(satirNo);
    sutunlar.forEach((c, ci) => {
      const hucre = row.getCell(ci + 1);
      hucre.value = c.fn(v, i);
      hucre.font = { size: 10 };
      hucre.border = { top: kenarlikIncGri, left: kenarlikIncGri, bottom: kenarlikIncGri, right: kenarlikIncGri };
      hucre.alignment = { vertical: 'middle', horizontal: ortalanacakAnahtarlar.includes(c.key) ? 'center' : 'left' };
      if (i % 2 === 1) hucre.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };
    });
    satirNo++;
  });

  const toplamHucre = ws.getCell(satirNo, 1);
  ws.mergeCells(satirNo, 1, satirNo, sutunSayisi);
  toplamHucre.value = `Toplam öğrenci sayısı: ${ogrenciler.length}`;
  toplamHucre.font = { italic: true, size: 9, color: { argb: 'FF444444' } };
  toplamHucre.alignment = { horizontal: 'right' };

  ws.views = [{ state: 'frozen', ySplit: basliklarRowNo }];

  const dosyaAdi = `${_olSeciliSinif}_Ogrenci_Listesi.xlsx`;
  const mimeTuru = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  try {
    const buffer = await wb.xlsx.writeBuffer();
    // Android'in çıplak WebView'i <a download> ile blob indirmeyi
    // desteklemiyor — bu yüzden uygulama genelindeki ortak kaydetme
    // yardımcısı (native SavePlugin / blob fallback) kullanılıyor.
    if (typeof uygulamaDosyaKaydet === 'function') {
      uygulamaDosyaKaydet(olArrayBufferToBase64(buffer), dosyaAdi, mimeTuru);
    } else {
      const blob = new Blob([buffer], { type: mimeTuru });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = dosyaAdi; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  } catch (e) {
    console.error('Excel oluşturulamadı:', e);
    toast('Excel oluşturulamadı.');
  }
}

/* ---------- PDF'e aktar ---------- */
async function olPdfAktar() {
  const sutunlar = olTumSutunlariGetir();
  const ogrenciler = olOgrencileriGetir();
  if (!sutunlar.length) { toast('En az bir sütun seçin.'); return; }
  if (typeof window.jspdf === 'undefined') { toast('PDF kütüphanesi yüklenemedi.'); return; }

  const bs = olBaslikBilgisiGetir();
  const logo = await olLogoDataUriGetir();
  const fontB64 = await olPdfFontBase64Getir();
  const fontAdi = fontB64 ? 'Roboto' : 'helvetica'; // Roboto Türkçe karakterleri (ı,ğ,ş,İ,Ğ,Ş) destekliyor
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: bs.yon === 'landscape' ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });

  if (fontB64) {
    doc.addFileToVFS('Roboto-Regular.ttf', fontB64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  }
  doc.setFont(fontAdi, 'normal');

  const logoBoyutu = 26; // mm — daha büyük logo
  const logoX = 12, logoY = 8;
  const metinX = logo ? logoX + logoBoyutu + 5 : 14; // logonun sağından yeterli boşluk bırak
  if (logo) {
    try { doc.addImage(logo, 'PNG', logoX, logoY, logoBoyutu, logoBoyutu); } catch (e) { console.warn('PDF logo eklenemedi:', e); }
  }

  let y = 14;
  if (bs.okulAdiGoster && bs.okulAdi) { doc.setFontSize(9); doc.text(bs.okulAdi, metinX, y); y += 6; }
  doc.setFontSize(12);
  doc.text(`${_olSeciliSinif} Sınıfı Öğrenci Listesi`, metinX, y); y += 6;
  if (bs.altBaslikGoster && bs.altBaslik) { doc.setFontSize(9); doc.text(bs.altBaslik, metinX, y); y += 5; }
  if (bs.egitimYiliGoster && bs.egitimYili) { doc.setFontSize(8); doc.setTextColor(100); doc.text(`${bs.egitimYili} Eğitim-Öğretim Yılı`, metinX, y); doc.setTextColor(0); y += 4; }
  y = Math.max(y, logo ? logoY + logoBoyutu + 4 : y);

  // Sıra No / Öğrenci No sütunları ortaya hizalı olsun (kullanıcı sütun sırasını
  // değiştirebildiği için indeksi burada, güncel sıraya göre buluyoruz).
  const ortalanacakAnahtarlar = ['siraNo', 'ogrenciNo'];
  const sutunStilleri = {};
  sutunlar.forEach((c, i) => {
    if (ortalanacakAnahtarlar.includes(c.key)) sutunStilleri[i] = { halign: 'center' };
  });

  doc.autoTable({
    startY: y + 2,
    head: [sutunlar.map(c => c.label)],
    body: ogrenciler.map((v, i) => sutunlar.map(c => c.fn(v, i))),
    theme: 'grid', // sütunlar arasında da kenarlık olsun
    styles: { fontSize: 8, cellPadding: 1.5, font: fontAdi, fontStyle: 'normal', lineWidth: 0.1, lineColor: [200, 200, 200] },
    headStyles: { fillColor: [27, 58, 92], textColor: 255, font: fontAdi, fontStyle: 'normal', lineColor: [27, 58, 92] },
    columnStyles: sutunStilleri,
    alternateRowStyles: { fillColor: [247, 247, 247] }, // zebra desen
    didDrawPage: (data) => {
      // İmza/onay satırı — sadece son sayfada
      if (data.pageNumber === doc.internal.getNumberOfPages()) {
        const yFooter = data.cursor.y + 14;
        const sayfaGenislik = doc.internal.pageSize.getWidth();
        doc.setFont(fontAdi, 'normal');
        doc.setFontSize(8);
        if (bs.ogretmenGoster) {
          const brans = bs.ogretmenBransGoster && bs.ogretmenBrans ? ` (${bs.ogretmenBrans})` : '';
          doc.text(`Öğretmen: ${bs.ogretmenAdSoyad || '...............................'}${brans}`, 14, yFooter);
          doc.text('İmza: .......................', 14, yFooter + 6);
        }
        if (bs.mudurGoster) {
          const unvan = bs.mudurUnvanGoster && bs.mudurUnvan ? bs.mudurUnvan : 'Okul Müdürü';
          doc.text(`${unvan}: ${bs.mudurAdSoyad || '...............................'}`, sayfaGenislik - 90, yFooter);
          doc.text('İmza: .......................', sayfaGenislik - 90, yFooter + 6);
        }
      }
    },
  });

  const dosyaAdi = `${_olSeciliSinif}_Ogrenci_Listesi.pdf`;

  // Android'in çıplak WebView'i doc.save() (blob + <a download>) ile
  // dosya indirmeyi desteklemiyor — bu yüzden ortak kaydetme yardımcısı
  // (native SavePlugin / blob fallback) üzerinden kaydediliyor.
  if (typeof uygulamaDosyaKaydet === 'function') {
    const datauri = doc.output('datauristring');
    const base64 = datauri.split('base64,')[1];
    uygulamaDosyaKaydet(base64, dosyaAdi, 'application/pdf');
  } else {
    doc.save(dosyaAdi); // yardımcı yoksa eski yönteme dön
  }
}
