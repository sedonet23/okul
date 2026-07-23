/* ====================================================================
   js/dokumanlar.js
   DÖKÜMANLAR MODÜLÜ — UI KATMANI
   - Dosya içeriği: Firebase Storage (bulut — herkes her cihazdan erişir)
   - Metadata: Firestore (oy_dokumanlar)
   - Opsiyonel: harici URL (Google Drive vb.)

   DÜZELTME (v2): Bu modül eskiden dosyaları IndexedDB'de (cihaz hafızası)
   tutuyordu — bu, "paylaşılan döküman arşivi" amacına aykırıydı, çünkü
   bir dosyayı yükleyen kişi DIŞINDA kimse göremiyordu. Artık Firebase
   Storage kullanıldığı için gerçek anlamda paylaşım var.

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya)          → DOM + DokumanlarService çağrısı, db/storage bilmez
     js/core/services/dokumanlar.service.js    → yetki kontrolü
     js/core/repositories/dokumanlar.repository.js → TEK Firestore+Storage erişim noktası
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
   Firestore bağlantısı
   ================================================================ */
function dokumanlarBaglantisiKur() {
  DokumanlarRepository.dokumanlariDinle(v => {
    dokumanlarListesi = DokumanlarService.gorunurListele(v);
    renderDokumanlar();
    renderDokumanKategoriFiltre();
  });
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

function renderDokumanlar() {
  const hedef = document.getElementById('dokumanlarListesi');
  if (!hedef) return;

  const filtre = document.getElementById('dokumanKategoriFiltre')?.value || '';
  const liste  = filtre ? dokumanlarListesi.filter(d => d.kategori === filtre) : dokumanlarListesi;

  if (!liste.length) {
    hedef.innerHTML = '<div class="empty-state">Henüz döküman eklenmedi. "+ Döküman Ekle" ile ekleyin.</div>';
    return;
  }

  const gruplar = {};
  liste.forEach(d => {
    const k = d.kategori || 'Diğer';
    if (!gruplar[k]) gruplar[k] = [];
    gruplar[k].push(d);
  });

  hedef.innerHTML = Object.entries(gruplar)
    .sort(([a], [b]) => a.localeCompare(b, 'tr'))
    .map(([kategori, belgeler]) => `
      <div style="margin-bottom:18px;">
        <div style="font-size:12px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;padding:0 4px;">
          📂 ${escapeHtml(kategori)} <span style="font-weight:400;">(${belgeler.length})</span>
        </div>
        ${belgeler.map(d => dokumanSatirHtml(d)).join('')}
      </div>
    `).join('');
}

function dokumanSatirHtml(d) {
  const tarihObj = d.yuklenmeTarihi
    ? new Date(d.yuklenmeTarihi.seconds ? d.yuklenmeTarihi.seconds * 1000 : d.yuklenmeTarihi)
    : null;
  const tarih   = tarihObj ? tarihObj.toLocaleDateString('tr-TR') + ' ' + tarihObj.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) : '—';
  const boyut   = d.dosyaBoyutu ? dosyaBoyutuFormat(d.dosyaBoyutu) : '';
  const uzanti  = (d.dosyaAdi || d.hariciUrl || '').split('.').pop().toLowerCase();
  const ikon    = dosyaIkonu(uzanti);
  const harici  = !!d.hariciUrl;

  const depolamaBadge = harici
    ? `<span style="font-size:10px;color:#888;background:#f0f0f0;padding:1px 5px;border-radius:4px;">🔗 URL</span>`
    : `<span style="font-size:10px;color:#2e7d32;background:#e8f5e9;padding:1px 5px;border-radius:4px;">☁️ Bulutta</span>`;
  const gorunurlukBadge = d.gorunurluk === 'herkes'
    ? `<span style="font-size:10px;color:#1565c0;background:#e3f2fd;padding:1px 5px;border-radius:4px;">🌐 Herkese Açık</span>`
    : `<span style="font-size:10px;color:#8a4b00;background:#fff3e0;padding:1px 5px;border-radius:4px;">🔒 Kişisel</span>`;
  // Kimin eklediği sadece admin için (veya "herkese açık" değilse zaten sahibi görüyordur) anlamlı — admin'e göster.
  const ekleyenGoster = (typeof AKTIF_KULLANICI!=='undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin && d.olusturanAdi)
    ? ` · 👤 ${escapeHtml(d.olusturanAdi)}` : '';
  const silinebilirMi = typeof DokumanlarService !== 'undefined' && DokumanlarService.dokumanSilinebilirMi(d);
  const gorunurlukDegistirilebilirMi = typeof DokumanlarService !== 'undefined' && DokumanlarService.gorunurlukDegistirilebilirMi();

  return `
    <div class="evrak-row">
      <div class="evrak-body" style="display:flex;align-items:center;gap:12px;min-width:0;cursor:pointer;" onclick="dokumanAc('${d.id}')">
        <div style="font-size:26px;line-height:1;flex-shrink:0;">${ikon}</div>
        <div style="min-width:0;flex:1;">
          <div class="evrak-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(d.ad || d.dosyaAdi || 'Belge')}</div>
          <div class="evrak-meta" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            ${depolamaBadge}${gorunurlukBadge}
            <span>${tarih}${boyut ? ' · ' + boyut : ''}${ekleyenGoster}${d.aciklama ? ' · ' + escapeHtml(d.aciklama) : ''}</span>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm" onclick="dokumanAc('${d.id}')" title="Aç">👁</button>
        <button class="btn btn-ghost btn-sm" onclick="dokumanIndir('${d.id}')" title="İndir">⬇</button>
        ${gorunurlukDegistirilebilirMi ? `<button class="btn btn-ghost btn-sm" onclick="dokumanGorunurlukDegistirTikla('${d.id}', '${d.gorunurluk === 'herkes' ? 'kisisel' : 'herkes'}', '${escapeHtml(d.ad||'')}')" title="${d.gorunurluk === 'herkes' ? 'Kişisel yap' : 'Herkese açık yap'}">${d.gorunurluk === 'herkes' ? '🔒' : '🌐'}</button>` : ''}
        ${silinebilirMi ? `<button class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="dokumanSilOnay('${d.id}', '${escapeHtml(d.ad||'')}')">🗑</button>` : ''}
      </div>
    </div>`;
}

/* ================================================================
   Dosya açma / indirme
   Desteklenen türler (pdf, xlsx, xls, docx) js/dokuman-okuyucu.js'deki
   UYGULAMA İÇİ okuyucuda (tam ekran, sayfa çevirici, zoom) açılır.

   DÜZELTME (Android): dokuman-okuyucu.js zaten index.html'de yükleniyordu
   ama dokumanAc() hiç ona yönlendirmiyordu — bu yüzden her tür için
   window.open(url,'_blank') çalışıyordu. Native (Capacitor) WebView'de
   bu, "harici" bir bağlantı gibi Intent.ACTION_VIEW ile sisteme
   devrediliyor; cihazda bunun karşılığı bir görüntüleyici değil de
   doğrudan İndirme Yöneticisi olduğundan "önizle" butonu da indirme
   yapıyormuş gibi davranıyordu. Resim gibi desteklenmeyen türlerde
   (okuyucunun kendisi de böyle davranıyor) eski window.open korunur.
   ================================================================ */
function dokumanAc(id) {
  const d = dokumanlarListesi.find(x => x.id === id);
  if (!d) return;
  const url = d.hariciUrl || d.dosyaUrl;
  if (!url) { toast('Bu dökümanın dosyası bulunamadı.'); return; }
  const ad = d.dosyaAdi || d.hariciUrl || '';
  if (typeof window.DokumanOkuyucu !== 'undefined' && window.DokumanOkuyucu.destekliMi(ad)) {
    window.DokumanOkuyucu.ac(url, ad);
  } else {
    window.open(url, '_blank');
  }
}

function dokumanIndir(id) {
  const d = dokumanlarListesi.find(x => x.id === id);
  if (!d) return;
  const url = d.hariciUrl || d.dosyaUrl;
  if (!url) { toast('Bu dökümanın dosyası bulunamadı.'); return; }
  const a = document.createElement('a');
  a.href = url;
  a.download = d.dosyaAdi || d.ad || 'dosya';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}


/* ================================================================
   Yükleme modalı
   ================================================================ */
function dokumanYukleModalAc() {
  const kategoriSecenekleri = DOKUMAN_KATEGORILER
    .map(k => `<option value="${k}">${k}</option>`).join('');
  const adminMi = typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true;

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

    ${adminMi ? `
    <div class="form-group">
      <label>Görünürlük</label>
      <select id="dok_gorunurluk" style="width:100%;">
        <option value="herkes">🌐 Herkese Açık — tüm kullanıcılar görür</option>
        <option value="kisisel">🔒 Sadece Bana Özel</option>
      </select>
    </div>` : `
    <div style="font-size:12px;color:var(--ink-muted);background:var(--nm-bg);border-radius:8px;padding:8px 10px;margin-bottom:4px;">
      🔒 Bu döküman sadece <strong>size</strong> ve <strong>yöneticiye</strong> görünür olacak.
    </div>`}

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
    <div id="dok_yukleme_durumu" style="display:none;font-size:12px;color:var(--ink-muted);margin-top:8px;"></div>
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
  const durumEl = document.getElementById('dok_yukleme_durumu');
  if (kaydetBtn) { kaydetBtn.disabled = true; kaydetBtn.textContent = 'Kaydediliyor...'; }

  try {
    const metaTaban = {
      ad, kategori, aciklama,
      yuklenmeTarihi: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const gorunurlukEl = document.getElementById('dok_gorunurluk');
    if (gorunurlukEl) metaTaban.gorunurluk = gorunurlukEl.value; // sadece admin'de var; DokumanlarService yine de doğrular

    if (hariciUrl) {
      metaTaban.hariciUrl = hariciUrl;
      metaTaban.dosyaAdi  = hariciUrl.split('/').pop().split('?')[0] || 'dosya';
      await DokumanlarService.dokumanEkle(metaTaban, null, null);
    } else {
      if (durumEl) { durumEl.style.display = ''; durumEl.textContent = `Yükleniyor… %0`; }
      await DokumanlarService.dokumanEkle(metaTaban, dosya, (yuzde)=>{
        if (durumEl) durumEl.textContent = `Yükleniyor… %${yuzde}`;
      });
    }

    toast(`"${ad}" kaydedildi.`);
    modalKapat();
  } catch (e) {
    const temizMesaj = e.message && e.message.startsWith('depolama-siniri:') ? e.message.slice('depolama-siniri:'.length) : null;
    toast('Kayıt hatası: ' + (temizMesaj || (e.message==='yetkisiz' ? 'Bu işlem için yetkiniz yok.' : e.message)));
    if (kaydetBtn) { kaydetBtn.disabled = false; kaydetBtn.textContent = '💾 Kaydet'; }
    if (durumEl) durumEl.style.display = 'none';
  }
}

/* ================================================================
   Silme
   ================================================================ */
function dokumanSilOnay(id, ad) {
  if (!confirm(`"${ad}" dökümanını silmek istediğinize emin misiniz?`)) return;
  dokumanSil(id);
}

/* Admin'in başka birinin (veya kendi) dökümanının görünürlüğünü sonradan
   değiştirmesi için — bkz. dokumanlar.service.js "gorunurMu" notu. */
function dokumanGorunurlukDegistirTikla(id, yeniGorunurluk, ad){
  const mesaj = yeniGorunurluk === 'herkes'
    ? `"${ad}" artık HERKESE AÇIK olacak — okuldaki tüm kullanıcılar görebilecek. Devam edilsin mi?`
    : `"${ad}" artık KİŞİSEL olacak — sadece ekleyen kişi ve admin görebilecek. Devam edilsin mi?`;
  if(!confirm(mesaj)) return;
  DokumanlarService.dokumanGorunurlukGuncelle(id, yeniGorunurluk)
    .then(()=> toast('Görünürlük güncellendi.'))
    .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

async function dokumanSil(id) {
  const d = dokumanlarListesi.find(x => x.id === id);
  try {
    await DokumanlarService.dokumanSil(id, d?.storagePath, d);
    toast('Döküman silindi.');
  } catch (e) {
    if (e.message === 'sahip-degil') { toast('Bu dökümanı sadece ekleyen kişi veya yönetici silebilir.'); return; }
    toast('Silme hatası: ' + (e.message==='yetkisiz' ? 'Bu işlem için yetkiniz yok.' : e.message));
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
