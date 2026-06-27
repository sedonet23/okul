/* ====================================================================
   js/dokumanlar.js
   DÖKÜMANLAR MODÜLÜ — Firebase Storage'a dosya yükleme, indirme, silme.
   Firestore koleksiyonu: oy_dokumanlar
   Storage klasörü: dokumanlar/
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

/* ---------- Firestore bağlantısı ---------- */
function dokumanlarBaglantisiKur() {
  db.collection(COL.dokumanlar).orderBy('yuklenmeTarihi', 'desc').onSnapshot(snap => {
    dokumanlarListesi = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDokumanlar();
    renderDokumanKategoriFiltre();
  }, hataGoster);
}

/* ---------- Kategori filtre select'ini doldur ---------- */
function renderDokumanKategoriFiltre() {
  const sel = document.getElementById('dokumanKategoriFiltre');
  if (!sel) return;
  const secili = sel.value;
  const mevcutKategoriler = [...new Set(dokumanlarListesi.map(d => d.kategori).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
  sel.innerHTML = '<option value="">Tüm Kategoriler</option>' +
    mevcutKategoriler.map(k => `<option value="${escapeHtml(k)}" ${secili===k?'selected':''}>${escapeHtml(k)}</option>`).join('');
}

/* ---------- Liste render ---------- */
function renderDokumanlar() {
  const hedef = document.getElementById('dokumanlarListesi');
  if (!hedef) return;

  const filtre = document.getElementById('dokumanKategoriFiltre')?.value || '';
  const liste = filtre
    ? dokumanlarListesi.filter(d => d.kategori === filtre)
    : dokumanlarListesi;

  if (!liste.length) {
    hedef.innerHTML = '<div class="empty-state">Henüz döküman yüklenmedi. "+ Döküman Yükle" ile ekleyin.</div>';
    return;
  }

  // Kategoriye göre grupla
  const gruplar = {};
  liste.forEach(d => {
    const k = d.kategori || 'Diğer';
    if (!gruplar[k]) gruplar[k] = [];
    gruplar[k].push(d);
  });

  hedef.innerHTML = Object.entries(gruplar).sort(([a],[b])=>a.localeCompare(b,'tr')).map(([kategori, belgeler]) => `
    <div style="margin-bottom:18px;">
      <div style="font-size:12px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;padding:0 4px;">
        📂 ${escapeHtml(kategori)} <span style="font-weight:400;">(${belgeler.length})</span>
      </div>
      ${belgeler.map(d => dokumanSatirHtml(d)).join('')}
    </div>
  `).join('');
}

function dokumanSatirHtml(d) {
  const tarih = d.yuklenmeTarihi
    ? new Date(d.yuklenmeTarihi.seconds ? d.yuklenmeTarihi.seconds * 1000 : d.yuklenmeTarihi).toLocaleDateString('tr-TR')
    : '—';
  const boyut = d.dosyaBoyutu ? dosyaBoyutuFormat(d.dosyaBoyutu) : '';
  const uzanti = (d.dosyaAdi || '').split('.').pop().toLowerCase();
  const ikon = dosyaIkonu(uzanti);

  return `
    <div class="evrak-row">
      <div class="evrak-body" style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:28px;line-height:1;flex-shrink:0;">${ikon}</div>
        <div style="min-width:0;">
          <div class="evrak-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(d.ad || d.dosyaAdi || 'Belge')}</div>
          <div class="evrak-meta">
            ${d.aciklama ? escapeHtml(d.aciklama) + ' · ' : ''}${tarih}${boyut ? ' · ' + boyut : ''}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <a class="btn btn-ghost btn-sm" href="${escapeHtml(d.dosyaUrl || '')}" target="_blank" download="${escapeHtml(d.dosyaAdi || 'dosya')}">⬇ İndir</a>
        <button class="btn btn-ghost btn-sm" onclick="dokumanSilOnay('${d.id}', '${escapeHtml(d.storagePath||'')}', '${escapeHtml(d.ad||d.dosyaAdi||'')}')">🗑</button>
      </div>
    </div>`;
}

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
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/* ---------- Yükleme modalı ---------- */
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
      <select id="dok_kategori" style="width:100%;">
        ${kategoriSecenekleri}
      </select>
    </div>
    <div class="form-group">
      <label>Açıklama (isteğe bağlı)</label>
      <input id="dok_aciklama" placeholder="Kısa açıklama..." style="width:100%;">
    </div>
    <div class="form-group">
      <label>Dosya</label>
      <input type="file" id="dok_dosya" style="width:100%;">
    </div>
    <div id="dok_ilerleme" style="display:none;margin-top:10px;">
      <div style="background:var(--nm-bg,#f0f0f3);border-radius:6px;overflow:hidden;height:8px;">
        <div id="dok_ilerlemeBar" style="height:100%;background:var(--accent,#4caf50);width:0%;transition:width .3s;"></div>
      </div>
      <div id="dok_ilerlemeYazi" style="font-size:12px;color:var(--ink-muted);margin-top:4px;text-align:center;">Yükleniyor...</div>
    </div>
  `;

  modalAc('📁 Döküman Yükle', body, () => {
    dokumanYukle();
  }, null);
  const kb = document.getElementById('modalKaydetBtn');
  if (kb) kb.textContent = '⬆ Yükle';
}

/* ---------- Firebase Storage'a yükle ---------- */
function dokumanYukle() {
  const ad       = document.getElementById('dok_ad').value.trim();
  const kategori = document.getElementById('dok_kategori').value;
  const aciklama = document.getElementById('dok_aciklama').value.trim();
  const dosyaEl  = document.getElementById('dok_dosya');
  const dosya    = dosyaEl.files[0];

  if (!ad)   { toast('Döküman adı zorunludur.'); return; }
  if (!dosya){ toast('Lütfen bir dosya seçin.'); return; }

  // Butonları kilitle
  const kaydetBtn = document.getElementById('modalKaydetBtn');
  const silBtn    = document.getElementById('modalSilBtn');
  if (kaydetBtn) kaydetBtn.disabled = true;
  if (silBtn)    silBtn.style.display = 'none';

  // İlerleme çubuğunu göster
  const ilerlemeDiv = document.getElementById('dok_ilerleme');
  const ilerlemeBar = document.getElementById('dok_ilerlemeBar');
  const ilerlemeYazi= document.getElementById('dok_ilerlemeYazi');
  if (ilerlemeDiv) ilerlemeDiv.style.display = 'block';

  const storagePath = `dokumanlar/${Date.now()}_${dosya.name}`;
  const storageRef  = firebase.storage().ref(storagePath);
  const yuklemGorevi= storageRef.put(dosya);

  yuklemGorevi.on('state_changed',
    snapshot => {
      const yuzde = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      if (ilerlemeBar)  ilerlemeBar.style.width  = yuzde + '%';
      if (ilerlemeYazi) ilerlemeYazi.textContent  = `Yükleniyor... %${yuzde}`;
    },
    err => {
      toast('Yükleme hatası: ' + err.message);
      if (kaydetBtn) kaydetBtn.disabled = false;
      if (ilerlemeDiv) ilerlemeDiv.style.display = 'none';
    },
    async () => {
      try {
        const url = await yuklemGorevi.snapshot.ref.getDownloadURL();
        await db.collection(COL.dokumanlar).add({
          ad,
          kategori,
          aciklama,
          dosyaAdi: dosya.name,
          dosyaUrl: url,
          dosyaBoyutu: dosya.size,
          storagePath,
          yuklenmeTarihi: firebase.firestore.FieldValue.serverTimestamp(),
        });
        toast(`"${ad}" başarıyla yüklendi.`);
        modalKapat();
      } catch (e) {
        toast('Kayıt hatası: ' + e.message);
        if (kaydetBtn) kaydetBtn.disabled = false;
      }
    }
  );
}

/* ---------- Silme ---------- */
function dokumanSilOnay(id, storagePath, ad) {
  if (!confirm(`"${ad}" dökümanını silmek istediğinize emin misiniz?\nDosya kalıcı olarak silinecek.`)) return;
  dokumanSil(id, storagePath);
}

async function dokumanSil(id, storagePath) {
  try {
    // Storage'dan sil
    if (storagePath) {
      try { await firebase.storage().ref(storagePath).delete(); }
      catch (e) { console.warn('Storage silme uyarısı:', e.message); }
    }
    // Firestore kaydını sil
    await db.collection(COL.dokumanlar).doc(id).delete();
    toast('Döküman silindi.');
  } catch (e) {
    toast('Silme hatası: ' + e.message);
  }
}
