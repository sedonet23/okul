/* ====================================================================
   js/dokumanlar.js
   DÖKÜMANLAR MODÜLÜ
   - Dosya içeriği: IndexedDB (cihaz hafızası)
   - Metadata: Firestore (oy_dokumanlar)
   - Opsiyonel: harici URL (Google Drive vb.)
   ==================================================================== */

let dokumanlarListesi = [];

const DOKUMAN_KATEGORILER = [
  'Öğrenci Formları',
  'Veli Formları',
  'Gezi & Etkinlik',
  'Proje Formları',
  'Yazılı Senaryoları',
  'Yönetim & İdari',
  'Diğer',
];

/* ================================================================
   IndexedDB
   ================================================================ */
const IDB_NAME    = 'okul_dokumanlar';
const IDB_VERSION = 1;
const IDB_STORE   = 'dosyalar';

function idbAc() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}

async function idbKaydet(id, blob) {
  const db = await idbAc();
  return new Promise((res, rej) => {
    const tx  = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put({ id, blob });
    tx.oncomplete = () => res();
    tx.onerror    = e => rej(e.target.error);
  });
}

async function idbOku(id) {
  const db = await idbAc();
  return new Promise((res, rej) => {
    const tx  = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(id);
    req.onsuccess = e => res(e.target.result ? e.target.result.blob : null);
    req.onerror   = e => rej(e.target.error);
  });
}

async function idbSil(id) {
  const db = await idbAc();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror    = e => rej(e.target.error);
  });
}

async function idbVarMi(id) {
  const blob = await idbOku(id);
  return blob !== null;
}

/* ================================================================
   Firestore bağlantısı
   ================================================================ */
function dokumanlarBaglantisiKur() {
  db.collection(COL.dokumanlar).orderBy('yuklenmeTarihi', 'desc').onSnapshot(snap => {
    dokumanlarListesi = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDokumanlar();
    renderDokumanKategoriFiltre();
  }, hataGoster);
}

/* ================================================================
   Render
   ================================================================ */
function renderDokumanKategoriFiltre() {
  const sel = document.getElementById('dokumanKategoriFiltre');
  if (!sel) return;
  const secili = sel.value;
  const mevcutlar = [...new Set(dokumanlarListesi.map(d => d.kategori).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'tr'));
  sel.innerHTML = '<option value="">Tüm Kategoriler</option>' +
    mevcutlar.map(k => `<option value="${escapeHtml(k)}" ${secili === k ? 'selected' : ''}>${escapeHtml(k)}</option>`).join('');
}

async function renderDokumanlar() {
  const hedef = document.getElementById('dokumanlarListesi');
  if (!hedef) return;

  const filtre = document.getElementById('dokumanKategoriFiltre')?.value || '';
  const liste  = filtre ? dokumanlarListesi.filter(d => d.kategori === filtre) : dokumanlarListesi;

  if (!liste.length) {
    hedef.innerHTML = '<div class="empty-state">Henüz döküman eklenmedi. "+ Döküman Ekle" ile ekleyin.</div>';
    return;
  }

  // Kategoriye göre grupla
  const gruplar = {};
  liste.forEach(d => {
    const k = d.kategori || 'Diğer';
    if (!gruplar[k]) gruplar[k] = [];
    gruplar[k].push(d);
  });

  // IndexedDB varlık kontrolü paralel yap
  const varlikMap = {};
  await Promise.all(liste.map(async d => {
    varlikMap[d.id] = await idbVarMi(d.id);
  }));

  hedef.innerHTML = Object.entries(gruplar)
    .sort(([a], [b]) => a.localeCompare(b, 'tr'))
    .map(([kategori, belgeler]) => `
      <div style="margin-bottom:18px;">
        <div style="font-size:12px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;padding:0 4px;">
          📂 ${escapeHtml(kategori)} <span style="font-weight:400;">(${belgeler.length})</span>
        </div>
        ${belgeler.map(d => dokumanSatirHtml(d, varlikMap[d.id])).join('')}
      </div>
    `).join('');
}

function dokumanSatirHtml(d, cihazda) {
  const tarih   = d.yuklenmeTarihi
    ? new Date(d.yuklenmeTarihi.seconds ? d.yuklenmeTarihi.seconds * 1000 : d.yuklenmeTarihi).toLocaleDateString('tr-TR')
    : '—';
  const boyut   = d.dosyaBoyutu ? dosyaBoyutuFormat(d.dosyaBoyutu) : '';
  const uzanti  = (d.dosyaAdi || d.hariciUrl || '').split('.').pop().toLowerCase();
  const ikon    = dosyaIkonu(uzanti);
  const harici  = !!d.hariciUrl;

  const depolamaBadge = harici
    ? `<span style="font-size:10px;color:#888;background:#f0f0f0;padding:1px 5px;border-radius:4px;">🔗 URL</span>`
    : cihazda
      ? `<span style="font-size:10px;color:#2e7d32;background:#e8f5e9;padding:1px 5px;border-radius:4px;">📱 Cihazda</span>`
      : `<span style="font-size:10px;color:#c0392b;background:#fdecea;padding:1px 5px;border-radius:4px;">⚠ Cihazda yok</span>`;

  return `
    <div class="evrak-row">
      <div class="evrak-body" style="display:flex;align-items:center;gap:12px;min-width:0;cursor:pointer;" onclick="dokumanAc('${d.id}')">
        <div style="font-size:26px;line-height:1;flex-shrink:0;">${ikon}</div>
        <div style="min-width:0;flex:1;">
          <div class="evrak-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(d.ad || d.dosyaAdi || 'Belge')}</div>
          <div class="evrak-meta" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            ${depolamaBadge}
            <span>${tarih}${boyut ? ' · ' + boyut : ''}${d.aciklama ? ' · ' + escapeHtml(d.aciklama) : ''}</span>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm" onclick="dokumanAc('${d.id}')" title="Aç">👁</button>
        <button class="btn btn-ghost btn-sm" onclick="dokumanIndir('${d.id}')" title="İndir">⬇</button>
        <button class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="dokumanSilOnay('${d.id}', '${escapeHtml(d.ad||'')}')">🗑</button>
      </div>
    </div>`;
}

/* ================================================================
   Dosya açma / görüntüleme
   ================================================================ */
async function dokumanAc(id) {
  dokumanIndir(id);
}

async function dokumanIndir(id) {
  const d = dokumanlarListesi.find(x => x.id === id);
  if (!d) return;

  if (d.hariciUrl) {
    window.open(d.hariciUrl, '_blank');
    return;
  }

  const blob = await idbOku(id);
  if (!blob) { toast('Bu dosya bu cihazda mevcut değil.'); return; }

  // FileReader ile base64'e çevir — mobil Chrome'da en güvenilir yöntem
  const reader = new FileReader();
  reader.onload = e => {
    const a = document.createElement('a');
    a.href     = e.target.result;
    a.download = d.dosyaAdi || d.ad || 'dosya';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  reader.readAsDataURL(blob);
}

/* ================================================================
   Yükleme modalı
   ================================================================ */
function dokumanYukleModalAc() {
  const kategoriSecenekleri = DOKUMAN_KATEGORILER
    .map(k => `<option value="${k}">${k}</option>`).join('');

  const body = `
    <div class="form-group">
      <label>Döküman Adı</label>
      <input id="dok_ad" placeholder="örn: Veli Rıza Onay Formu" style="width:100%;">
    </div>
    <div class="form-group">
      <label>Kategori</label>
      <select id="dok_kategori" style="width:100%;">${kategoriSecenekleri}</select>
    </div>
    <div class="form-group">
      <label>Açıklama (isteğe bağlı)</label>
      <input id="dok_aciklama" placeholder="Kısa açıklama..." style="width:100%;">
    </div>

    <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-top:4px;">
      <div style="display:flex;">
        <button id="dok_sekme_dosya" class="btn btn-ghost" style="flex:1;border-radius:0;border-bottom:2px solid var(--accent,#4caf50);font-weight:600;" onclick="dokumanSekmeAc('dosya')">📎 Dosya Yükle</button>
        <button id="dok_sekme_url" class="btn btn-ghost" style="flex:1;border-radius:0;border-bottom:2px solid transparent;" onclick="dokumanSekmeAc('url')">🔗 URL Ekle</button>
      </div>
      <div style="padding:12px;">
        <div id="dok_panel_dosya">
          <input type="file" id="dok_dosya" style="width:100%;" onchange="dokumanDosyaSecildi(this)">
          <div id="dok_dosya_bilgi" style="font-size:12px;color:var(--ink-muted);margin-top:6px;"></div>
        </div>
        <div id="dok_panel_url" style="display:none;">
          <input id="dok_url" placeholder="https://drive.google.com/..." style="width:100%;">
          <div style="font-size:12px;color:var(--ink-muted);margin-top:4px;">Google Drive, Dropbox vb. paylaşım linki</div>
        </div>
      </div>
    </div>
  `;

  modalAc('📁 Döküman Ekle', body, () => dokumanKaydet(), null);
  const kb = document.getElementById('modalKaydetBtn');
  if (kb) kb.textContent = '💾 Kaydet';
}

function dokumanSekmeAc(sekme) {
  document.getElementById('dok_panel_dosya').style.display = sekme === 'dosya' ? '' : 'none';
  document.getElementById('dok_panel_url').style.display   = sekme === 'url'   ? '' : 'none';
  document.getElementById('dok_sekme_dosya').style.borderBottom = sekme === 'dosya' ? '2px solid var(--accent,#4caf50)' : '2px solid transparent';
  document.getElementById('dok_sekme_dosya').style.fontWeight   = sekme === 'dosya' ? '600' : '400';
  document.getElementById('dok_sekme_url').style.borderBottom   = sekme === 'url'   ? '2px solid var(--accent,#4caf50)' : '2px solid transparent';
  document.getElementById('dok_sekme_url').style.fontWeight     = sekme === 'url'   ? '600' : '400';
}

function dokumanDosyaSecildi(input) {
  const dosya = input.files[0];
  const bilgi = document.getElementById('dok_dosya_bilgi');
  if (dosya && bilgi) {
    bilgi.textContent = `${dosya.name} · ${dosyaBoyutuFormat(dosya.size)}`;
    // Döküman adı boşsa dosya adından doldur
    const adEl = document.getElementById('dok_ad');
    if (adEl && !adEl.value.trim()) {
      adEl.value = dosya.name.replace(/\.[^.]+$/, '');
    }
  }
}

async function dokumanKaydet() {
  const ad       = document.getElementById('dok_ad').value.trim();
  const kategori = document.getElementById('dok_kategori').value;
  const aciklama = document.getElementById('dok_aciklama').value.trim();
  const urlPanel = document.getElementById('dok_panel_url');
  const urlGoster= urlPanel && urlPanel.style.display !== 'none';
  const hariciUrl= urlGoster ? (document.getElementById('dok_url')?.value.trim() || '') : '';
  const dosyaEl  = document.getElementById('dok_dosya');
  const dosya    = dosyaEl?.files[0];

  if (!ad) { toast('Döküman adı zorunludur.'); return; }
  if (!hariciUrl && !dosya) { toast('Dosya seçin veya URL girin.'); return; }

  const kaydetBtn = document.getElementById('modalKaydetBtn');
  if (kaydetBtn) { kaydetBtn.disabled = true; kaydetBtn.textContent = 'Kaydediliyor...'; }

  try {
    // Firestore'a metadata yaz
    const meta = {
      ad, kategori, aciklama,
      yuklenmeTarihi: firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (hariciUrl) {
      meta.hariciUrl = hariciUrl;
      meta.dosyaAdi  = hariciUrl.split('/').pop().split('?')[0] || 'dosya';
    } else {
      meta.dosyaAdi    = dosya.name;
      meta.dosyaBoyutu = dosya.size;
      meta.dosyaTipi   = dosya.type;
    }

    const docRef = await db.collection(COL.dokumanlar).add(meta);

    // Dosya varsa IndexedDB'ye kaydet
    if (dosya) {
      await idbKaydet(docRef.id, dosya);
    }

    toast(`"${ad}" kaydedildi.`);
    modalKapat();
  } catch (e) {
    toast('Kayıt hatası: ' + e.message);
    if (kaydetBtn) { kaydetBtn.disabled = false; kaydetBtn.textContent = '💾 Kaydet'; }
  }
}

/* ================================================================
   Silme
   ================================================================ */
function dokumanSilOnay(id, ad) {
  if (!confirm(`"${ad}" dökümanını silmek istediğinize emin misiniz?`)) return;
  dokumanSil(id);
}

async function dokumanSil(id) {
  try {
    await idbSil(id);
    await db.collection(COL.dokumanlar).doc(id).delete();
    toast('Döküman silindi.');
  } catch (e) {
    toast('Silme hatası: ' + e.message);
  }
}

/* ================================================================
   Yardımcılar
   ================================================================ */
function dosyaIkonu(uzanti) {
  const ikonlar = {
    pdf: '📄', doc: '📝', docx: '📝',
    xls: '📊', xlsx: '📊',
    ppt: '📊', pptx: '📊',
    jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼',
    zip: '🗜', rar: '🗜',
    mp4: '🎬', mp3: '🎵',
  };
  return ikonlar[uzanti] || '📎';
}

function dosyaBoyutuFormat(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
