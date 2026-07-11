/* ============================================================
   NOTLAR.JS — Gelişmiş Not Defteri Modülü v1.0 — UI KATMANI
   Özellikler:
   - Zengin metin editörü (kalın, italik, başlık, liste)
   - Yapılacaklar listesi (checkbox todo)
   - El çizimi (canvas)
   - Görüntü ekleme (base64)
   - Tablo ekleme
   - Renk/etiket sistemi

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya)          → sadece DOM + NotlarService çağrısı, db bilmez
     js/core/services/notlar.service.js    → iş kuralı + yetki kontrolü
     js/core/repositories/notlar.repository.js → TEK Firestore erişim noktası
   ============================================================ */

/* ---- Renk Etiketleri ---- */
const NOT_RENKLERI = [
  { id: 'sari',  ad: 'Sarı',   bg: '#FEF9C3', border: '#EAB308' },
  { id: 'yesil', ad: 'Yeşil',  bg: '#DCFCE7', border: '#22C55E' },
  { id: 'mavi',  ad: 'Mavi',   bg: '#DBEAFE', border: '#3B82F6' },
  { id: 'mor',   ad: 'Mor',    bg: '#F3E8FF', border: '#A855F7' },
  { id: 'turuncu', ad: 'Turuncu', bg: '#FFEDD5', border: '#F97316' },
  { id: 'pembe', ad: 'Pembe',  bg: '#FCE7F3', border: '#EC4899' },
  { id: 'gri',   ad: 'Gri',    bg: '#F3F4F6', border: '#9CA3AF' },
];

/* ---- Aktif çizim durumu ---- */
let _cizimCiziyor = false;
let _cizimCanvas = null;
let _cizimCtx = null;
let _cizimRenk = '#1A2A2A';
let _cizimKalinlik = 4;
let _cizimArac = 'kalem';   // kalem | firca | highlighter | silgi | pan
let _cizimZemin = '#ffffff';

// Zoom & pan durumu
let _czZoom = 1;
let _czPanX = 0;
let _czPanY = 0;
let _czLastX = 0;
let _czLastY = 0;
let _czPinchBaslangic = null;
let _czPinchZoomBaslangic = 1;

// Offscreen buffer — SADECE çizim içeriği (şeffaf zemin)
let _czOffCanvas = null;
let _czOffCtx = null;
let _czAnimFrame = null;

// Zemin + şablon KENDİ katmanında tutulur; böylece zemin rengi değiştiğinde
// çizim içeriği (şeffaf pikseller) üstüne yeniden bindirilir, eski opak
// zemin çizimin üstüne "yapışıp" değişikliği gizlemez.
let _czBgCanvas = null;
let _czBgCtx = null;

// Gerçek cihaz piksel yoğunluğuna göre arabellek ölçeği (sabit 2x yerine)
let _czOlcek = 2;
// Mantıksal (CSS) canvas boyutu — yeniden boyutlandırmalarda ölçekleme için saklanır
let _czMantikselW = 340;
let _czMantikselH = 187;

// Tam ekran durumu
let _czTamEkranAktif = false;

/* ====================================================
   RENDER — Notlar Grid
   ==================================================== */
function renderNotlar() {
  const grid = document.getElementById('notlarGrid');
  if (!grid) return;

  if (!notlar.length) {
    grid.innerHTML = '<p class="empty-state">Henüz not eklenmedi.</p>';
    return;
  }

  // DÜZELTME: Admin/yönetici (Kullanıcı Yönetimi yetkisi olan) tüm kullanıcıların
  // notlarını görür — kendi notları "📌 Benim Notlarım" başlığı altında ayrı,
  // diğerleri "👥 Diğer Kullanıcıların Notları" altında sahip adı + tarih
  // etiketiyle gösterilir. Normal kullanıcı zaten sadece kendi notunu görür
  // (bkz. kisiselKayitGorunurMu), bu yüzden onda ayrım hiç görünmez.
  const yoneticiGorunumuMu = typeof kullaniciYonetimiYetkisiVar === 'function' && kullaniciYonetimiYetkisiVar()
    && notlar.some(n => n.sahipUid && (typeof AKTIF_KULLANICI==='undefined' || !AKTIF_KULLANICI || n.sahipUid !== AKTIF_KULLANICI.uid));

  if(!yoneticiGorunumuMu){
    const liste = [...notlar].sort((a, b) => (b.eklenmeTarihi || '').localeCompare(a.eklenmeTarihi || ''));
    grid.innerHTML = liste.map(n => _notKartHtml(n)).join('');
    return;
  }

  const benimUid = typeof AKTIF_KULLANICI!=='undefined' && AKTIF_KULLANICI ? AKTIF_KULLANICI.uid : null;
  const benimNotlar = notlar.filter(n => !n.sahipUid || n.sahipUid === benimUid).sort((a,b)=>(b.eklenmeTarihi||'').localeCompare(a.eklenmeTarihi||''));
  const digerNotlar = notlar.filter(n => n.sahipUid && n.sahipUid !== benimUid).sort((a,b)=>{
    const adA = _sahipAdiGetir(a.sahipUid), adB = _sahipAdiGetir(b.sahipUid);
    return adA.localeCompare(adB,'tr') || (b.eklenmeTarihi||'').localeCompare(a.eklenmeTarihi||'');
  });

  let html = '';
  if(benimNotlar.length){
    html += `<div class="not-bolum-baslik">📌 Benim Notlarım</div>`;
    html += `<div class="notlar-alt-grid">${benimNotlar.map(n => _notKartHtml(n)).join('')}</div>`;
  }
  if(digerNotlar.length){
    html += `<div class="not-bolum-baslik" style="margin-top:16px;">👥 Diğer Kullanıcıların Notları</div>`;
    html += `<div class="notlar-alt-grid">${digerNotlar.map(n => _notKartHtml(n, true)).join('')}</div>`;
  }
  grid.innerHTML = html || '<p class="empty-state">Henüz not eklenmedi.</p>';
}

function _notKartHtml(n, sahipEtiketiGoster){
  const renk = NOT_RENKLERI.find(r => r.id === n.renk) || NOT_RENKLERI[0];
  const onizleme = _notOnizleme(n);
  const etiketler = (n.etiketler || []).map(e =>
    `<span class="not-etiket">${escapeHtml(e)}</span>`
  ).join('');
  const sahipEtiket = sahipEtiketiGoster
    ? `<div class="note-sahip-etiket">👤 ${escapeHtml(_sahipAdiGetir(n.sahipUid))} · ${isoYereleCevir(n.eklenmeTarihi).tarih}</div>`
    : '';
  return `
    <div class="note-card" onclick="notDetayAc('${n.id}')"
         style="background:${renk.bg};border-left:3px solid ${renk.border};">
      <div class="note-header">
        <div class="note-title">${escapeHtml(n.baslik || '(Başlıksız)')}</div>
        <div class="note-type-badge">${_notTipIkonu(n.tip)}</div>
      </div>
      <div class="note-icerik">${onizleme}</div>
      ${etiketler ? `<div class="note-etiketler">${etiketler}</div>` : ''}
      ${sahipEtiket}
      <div class="note-tarih">${formatTarih(n.tarih || (n.eklenmeTarihi || '').slice(0, 10))}</div>
    </div>
  `;
}

function _notTipIkonu(tip) {
  const ikonlar = { metin: '📝', todo: '✅', cizim: '✏️', goruntu: '🖼️', tablo: '📊' };
  return ikonlar[tip] || '📝';
}

function _notOnizleme(n) {
  switch (n.tip) {
    case 'todo': {
      const maddeler = (n.maddeler || []).slice(0, 3);
      return maddeler.map(m =>
        `<div class="note-todo-satir${m.tamamlandi ? ' tamamlandi' : ''}">
          ${m.tamamlandi ? '☑' : '☐'} ${escapeHtml(m.metin || '')}
        </div>`
      ).join('') + (n.maddeler && n.maddeler.length > 3
        ? `<div style="font-size:11px;color:var(--ink-muted)">+${n.maddeler.length - 3} madde daha</div>` : '');
    }
    case 'cizim':
      return n.cizimData
        ? `<img src="${n.cizimData}" style="max-width:100%;border-radius:6px;max-height:80px;object-fit:cover;">`
        : '<span style="color:var(--ink-muted);font-size:12px;">Çizim</span>';
    case 'goruntu':
      return n.goruntu
        ? `<img src="${n.goruntu}" style="max-width:100%;border-radius:6px;max-height:80px;object-fit:cover;">`
        : '<span style="color:var(--ink-muted);font-size:12px;">Görüntü</span>';
    case 'tablo': {
      const satirlar = (n.tabloVeri || []).slice(0, 2);
      if (!satirlar.length) return '<span style="color:var(--ink-muted);font-size:12px;">Tablo</span>';
      return `<table class="note-onizleme-tablo">${satirlar.map((s, i) =>
        `<tr>${(s || []).slice(0, 3).map(h =>
          `<${i === 0 ? 'th' : 'td'}>${escapeHtml(h || '')}</${i === 0 ? 'th' : 'td'}>`
        ).join('')}</tr>`
      ).join('')}</table>`;
    }
    default: {
      // metin — HTML yapısını koru (liste, kalın vb. görünsün), güvenli kırp
      const tmp = document.createElement('div');
      tmp.innerHTML = n.icerik || '';
      // 160 karakteri aşan metin düğümlerini kırp
      let karakter = 0;
      const kırp = (node) => {
        if (karakter >= 160) { node.parentNode && node.parentNode.removeChild(node); return; }
        if (node.nodeType === 3) {
          const kalan = 160 - karakter;
          if (node.textContent.length > kalan) node.textContent = node.textContent.slice(0, kalan) + '…';
          karakter += node.textContent.length;
        } else {
          Array.from(node.childNodes).forEach(kırp);
        }
      };
      Array.from(tmp.childNodes).forEach(kırp);
      return `<div class="note-icerik-onizleme">${tmp.innerHTML}</div>`;
    }
  }
}

/* ====================================================
   DASHBOARD — Son Notlar
   ==================================================== */
function renderDashboardNotlar() {
  const el = document.getElementById('dashNotlar');
  if (!el) return;
  const sonNotlar = [...notlar]
    .sort((a, b) => (b.eklenmeTarihi || '').localeCompare(a.eklenmeTarihi || ''))
    .slice(0, 4);
  el.innerHTML = sonNotlar.length
    ? sonNotlar.map(n => {
        const renk = NOT_RENKLERI.find(r => r.id === n.renk) || NOT_RENKLERI[0];
        return `<div class="dash-row" style="cursor:pointer;border-left:3px solid ${renk.border};padding-left:8px;"
          onclick="notDetayAc('${n.id}')">
          <strong>${escapeHtml(n.baslik || '(Başlıksız)')}</strong>
          <span style="font-size:11px;color:var(--ink-muted);margin-left:6px;">${_notTipIkonu(n.tip)}</span>
        </div>`;
      }).join('')
    : '<p class="empty-state">Henüz not eklenmedi.</p>';
}

/* ====================================================
   NOT DETAYI (kart/satır tıklanınca açılır — Duyurular ile aynı desen)
   Salt-okunur tam içerik + Düzenle/Sil butonları buradan.
   ==================================================== */
function notDetayAc(id) {
  const n = notlar.find(x => x.id === id);
  if (!n) return;

  const ben = typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI ? AKTIF_KULLANICI.uid : null;
  const baskasininMi = n.sahipUid && n.sahipUid !== ben;
  const etiketler = (n.etiketler || []).map(e => `<span class="not-etiket">${escapeHtml(e)}</span>`).join('');
  const sahipSatiri = baskasininMi
    ? `<div class="note-sahip-etiket" style="margin-top:10px;">👤 ${escapeHtml(_sahipAdiGetir(n.sahipUid))} tarafından eklendi</div>`
    : '';

  const body = `
    <div style="font-size:12px;color:var(--ink-muted);margin-bottom:10px;">${_notTipIkonu(n.tip)} ${formatTarih(n.tarih || (n.eklenmeTarihi || '').slice(0, 10))}</div>
    ${_notTamIcerik(n)}
    ${etiketler ? `<div class="note-etiketler" style="margin-top:10px;">${etiketler}</div>` : ''}
    ${sahipSatiri}
  `;

  modalAc(n.baslik || '(Başlıksız)', body,
    () => { modalKapat(); setTimeout(() => notlarDuzenle(id), 150); },
    () => { if (confirm('Bu notu silmek istiyor musunuz?')) { NotlarService.notSil(id).catch(err => { if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); }); modalKapat(); } },
    '✏️ Düzenle'
  );
}

/* Not tipine göre TAM (kırpılmamış) içerik — detay sayfasında kullanılır. */
function _notTamIcerik(n) {
  switch (n.tip) {
    case 'todo': {
      const maddeler = n.maddeler || [];
      return maddeler.length
        ? maddeler.map((m, i) => `
          <div class="note-todo-satir${m.tamamlandi ? ' tamamlandi' : ''}" style="cursor:pointer;" onclick="notTodoToggle('${n.id}', ${i})">
            ${m.tamamlandi ? '☑' : '☐'} ${escapeHtml(m.metin || '')}
          </div>`).join('')
        : '<p class="empty-state">Madde yok.</p>';
    }
    case 'cizim':
      return n.cizimData
        ? `<img src="${n.cizimData}" style="max-width:100%;border-radius:8px;">`
        : '<p class="empty-state">Çizim yok.</p>';
    case 'goruntu':
      return n.goruntu
        ? `<img src="${n.goruntu}" style="max-width:100%;border-radius:8px;">`
        : '<p class="empty-state">Görüntü yok.</p>';
    case 'tablo': {
      const satirlar = n.tabloVeri || [];
      if (!satirlar.length) return '<p class="empty-state">Tablo boş.</p>';
      return `<table class="note-onizleme-tablo" style="width:100%;">${satirlar.map((s, i) =>
        `<tr>${(s || []).map(h => `<${i === 0 ? 'th' : 'td'}>${escapeHtml(h || '')}</${i === 0 ? 'th' : 'td'}>`).join('')}</tr>`
      ).join('')}</table>`;
    }
    default:
      return `<div class="note-icerik-onizleme" style="font-size:14px;line-height:1.6;">${n.icerik || ''}</div>`;
  }
}

/* ====================================================
   ANA MODAL — Tip Seçimi + Düzenleme
   ==================================================== */
function notlarModalAc(id) {
  // Yeni not — tip seçim ekranı
  _tipSecimModalAc();
}

function notlarDuzenle(id) {
  const n = notlar.find(x => x.id === id);
  if (!n) return;
  _notEditModalAc(n);
}

function _tipSecimModalAc() {
  const body = `
    <div class="not-tip-grid">
      <button class="not-tip-kart" onclick="_yeniNotAc('metin')">
        <span class="not-tip-ikon">📝</span>
        <span class="not-tip-ad">Metin</span>
        <span class="not-tip-acik">Zengin metin editörü</span>
      </button>
      <button class="not-tip-kart" onclick="_yeniNotAc('todo')">
        <span class="not-tip-ikon">✅</span>
        <span class="not-tip-ad">Yapılacaklar</span>
        <span class="not-tip-acik">Checkbox listesi</span>
      </button>
      <button class="not-tip-kart" onclick="_yeniNotAc('cizim')">
        <span class="not-tip-ikon">✏️</span>
        <span class="not-tip-ad">Çizim</span>
        <span class="not-tip-acik">El yazısı & eskiz</span>
      </button>
      <button class="not-tip-kart" onclick="_yeniNotAc('goruntu')">
        <span class="not-tip-ikon">🖼️</span>
        <span class="not-tip-ad">Görüntü</span>
        <span class="not-tip-acik">Fotoğraf ekle</span>
      </button>
      <button class="not-tip-kart" onclick="_yeniNotAc('tablo')">
        <span class="not-tip-ikon">📊</span>
        <span class="not-tip-ad">Tablo</span>
        <span class="not-tip-acik">Satır & sütun tablosu</span>
      </button>
    </div>
  `;
  modalAc('Not Türü Seçin', body, null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
}

function _yeniNotAc(tip) {
  modalKapat();
  setTimeout(() => _notEditModalAc({ tip }), 120);
}

/* ====================================================
   EDIT MODAL — Tüm tipler
   ==================================================== */
function _notEditModalAc(n) {
  const mevcutId = n.id || null;
  const tip = n.tip || 'metin';
  const renk = n.renk || 'sari';

  const renkSecici = `
    <div class="form-group">
      <label>Renk</label>
      <div class="not-renk-secici">
        ${NOT_RENKLERI.map(r => `
          <button type="button" class="not-renk-btn${r.id === renk ? ' aktif' : ''}"
            style="background:${r.bg};border-color:${r.border};"
            title="${r.ad}"
            onclick="_notRenkSec('${r.id}',this)"></button>
        `).join('')}
      </div>
      <input type="hidden" id="f_renk" value="${renk}">
    </div>
  `;

  const etiketInput = `
    <div class="form-group">
      <label>Etiketler <span style="font-size:11px;color:var(--ink-muted)">(virgülle ayır)</span></label>
      <input id="f_etiketler" placeholder="örn: önemli, toplantı, ödül" value="${escapeHtml((n.etiketler || []).join(', '))}">
    </div>
  `;

  const tarihInput = `
    <div class="form-group">
      <label>Tarih</label>
      <input type="date" id="f_tarih" value="${n.tarih || todayISO()}">
    </div>
  `;

  let tipIcerigi = '';
  switch (tip) {
    case 'metin':
      tipIcerigi = _metinEditHtml(n.icerik || '');
      break;
    case 'todo':
      tipIcerigi = _todoEditHtml(n.maddeler || []);
      break;
    case 'cizim':
      tipIcerigi = _cizimEditHtml(n.cizimData || '');
      break;
    case 'goruntu':
      tipIcerigi = _goruntuEditHtml(n.goruntu || '');
      break;
    case 'tablo':
      tipIcerigi = _tabloEditHtml(n.tabloVeri || null, n.tabloSatir || 3, n.tabloSutun || 3);
      break;
  }

  const body = `
    <div class="form-group">
      <label>Başlık</label>
      <input id="f_baslik" value="${escapeHtml(n.baslik || '')}" placeholder="Not başlığı...">
    </div>
    ${tipIcerigi}
    ${renkSecici}
    ${etiketInput}
    ${tarihInput}
  `;

  const tipBaslik = { metin: '📝 Metin Notu', todo: '✅ Yapılacaklar', cizim: '✏️ Çizim', goruntu: '🖼️ Görüntü', tablo: '📊 Tablo' };

  modalAc(
    mevcutId ? `${tipBaslik[tip]} — Düzenle` : tipBaslik[tip],
    body,
    () => _notKaydet(mevcutId, tip),
    mevcutId ? () => {
      if (confirm('Bu notu silmek istiyor musunuz?')) {
        NotlarService.notSil(mevcutId).catch(err => { if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
        modalKapat();
      }
    } : null
  );

  // Post-render işlemler
  setTimeout(() => {
    if (tip === 'cizim') {
      _cizimBaslat(n.cizimData || '');
      // Şablon butonlarını aktif yap
      _czUpdateSablonButtons(_czSablonTipi);
    }
    if (tip === 'tablo') _tabloPostRender();
  }, 150);
}

function _notRenkSec(renkId, btn) {
  document.querySelectorAll('.not-renk-btn').forEach(b => b.classList.remove('aktif'));
  btn.classList.add('aktif');
  document.getElementById('f_renk').value = renkId;
}

/* ====================================================
   TİP: METİN — Zengin Metin Editörü
   ==================================================== */
function _metinEditHtml(icerik) {
  return `
    <div class="form-group">
      <label>İçerik</label>
      <div class="zme-toolbar">
        <button type="button" class="zme-btn" title="Kalın" onclick="_zmeKomut('bold')"><b>K</b></button>
        <button type="button" class="zme-btn" title="İtalik" onclick="_zmeKomut('italic')"><i>İ</i></button>
        <button type="button" class="zme-btn" title="Altı Çizili" onclick="_zmeKomut('underline')"><u>A</u></button>
        <div class="zme-ayirici"></div>
        <button type="button" class="zme-btn" title="Başlık 1" onclick="_zmeBaslik('h2')">B1</button>
        <button type="button" class="zme-btn" title="Başlık 2" onclick="_zmeBaslik('h3')">B2</button>
        <div class="zme-ayirici"></div>
        <button type="button" class="zme-btn" title="Madde listesi" onclick="_zmeKomut('insertUnorderedList')">• ≡</button>
        <button type="button" class="zme-btn" title="Numaralı liste" onclick="_zmeKomut('insertOrderedList')">1. ≡</button>
        <div class="zme-ayirici"></div>
        <button type="button" class="zme-btn" title="Sola hizala" onclick="_zmeKomut('justifyLeft')">⬅</button>
        <button type="button" class="zme-btn" title="Ortaya hizala" onclick="_zmeKomut('justifyCenter')">⬌</button>
        <button type="button" class="zme-btn" title="Sağa hizala" onclick="_zmeKomut('justifyRight')">➡</button>
        <div class="zme-ayirici"></div>
        <button type="button" class="zme-btn" title="Bağlantı ekle" onclick="_zmeBaglantiEkle()">🔗</button>
        <button type="button" class="zme-btn zme-temizle" title="Biçimi temizle" onclick="_zmeKomut('removeFormat')">✕</button>
      </div>
      <div id="zmeEditor" class="zme-editor" contenteditable="true" spellcheck="true">${icerik}</div>
    </div>
  `;
}

function _zmeKomut(komut) {
  document.getElementById('zmeEditor').focus();
  document.execCommand(komut, false, null);
}

function _zmeBaslik(tag) {
  document.getElementById('zmeEditor').focus();
  document.execCommand('formatBlock', false, tag);
}

function _zmeBaglantiEkle() {
  const url = prompt('Bağlantı adresi:');
  if (url) {
    document.getElementById('zmeEditor').focus();
    document.execCommand('createLink', false, url);
  }
}

/* ====================================================
   TİP: TODO — Yapılacaklar Listesi
   ==================================================== */
function _todoEditHtml(maddeler) {
  const satirlar = maddeler.length
    ? maddeler.map((m, i) => _todoSatirHtml(i, m.metin, m.tamamlandi)).join('')
    : _todoSatirHtml(0, '', false);

  return `
    <div class="form-group">
      <label>Yapılacaklar</label>
      <div class="todo-lista" id="todoLista">
        ${satirlar}
      </div>
      <button type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="_todoSatirEkle()">➕ Madde Ekle</button>
    </div>
  `;
}

function _todoSatirHtml(idx, metin, tamamlandi) {
  return `
    <div class="todo-satir" style="display:flex;gap:8px;margin-bottom:6px;align-items:center;">
      <input type="checkbox" ${tamamlandi ? 'checked' : ''} class="todo-checkbox" data-idx="${idx}" onchange="_todoCheckToggle(this)">
      <input type="text" class="todo-metin" data-idx="${idx}" value="${escapeHtml(metin)}" placeholder="Yapılacak madde...">
      <button type="button" class="btn btn-ghost btn-xs" onclick="_todoSatirSil(${idx})">🗑️</button>
    </div>
  `;
}

function _todoSatirEkle() {
  const lista = document.getElementById('todoLista');
  const sayi = lista.querySelectorAll('.todo-satir').length;
  const html = _todoSatirHtml(sayi, '', false);
  lista.insertAdjacentHTML('beforeend', html);
  // Yeni eklenen input'a odaklan
  const inputs = lista.querySelectorAll('.todo-metin');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function _todoSatirSil(idx) {
  const satir = document.querySelector(`.todo-satir input[data-idx="${idx}"]`).closest('.todo-satir');
  satir.remove();
}

function _todoCheckToggle(el) {
  // Visual feedback
}

function _todoVerisiOku() {
  const maddeler = [];
  document.querySelectorAll('.todo-satir').forEach(s => {
    const metin = s.querySelector('.todo-metin').value.trim();
    const tamamlandi = s.querySelector('.todo-checkbox').checked;
    if (metin) maddeler.push({ metin, tamamlandi });
  });
  return maddeler;
}

/* ====================================================
   TİP: ÇİZİM — Canvas el çizimi
   ==================================================== */
function _cizimEditHtml(mevcutData) {
  return `
    <div class="form-group cizim-container" id="cizimContainer">
      <label>Çizim</label>

      <!-- Araç Çubuğu Satır 1: Araçlar -->
      <div class="cizim-toolbar">
        <div class="cizim-arac-grup">
          <button type="button" class="cizim-arac-btn aktif" id="czArac_kalem"
            onclick="_czAracSec('kalem',this)" title="Kalem">✏️</button>
          <button type="button" class="cizim-arac-btn" id="czArac_firca"
            onclick="_czAracSec('firca',this)" title="Fırça">🖌️</button>
          <button type="button" class="cizim-arac-btn" id="czArac_highlighter"
            onclick="_czAracSec('highlighter',this)" title="İşaretleyici">🖍️</button>
          <button type="button" class="cizim-arac-btn" id="czArac_silgi"
            onclick="_czAracSec('silgi',this)" title="Silgi">🧹</button>
          <button type="button" class="cizim-arac-btn" id="czArac_pan"
            onclick="_czAracSec('pan',this)" title="Kaydır/Zoom">🤚</button>
        </div>

        <div class="cizim-ayirici-v"></div>

        <!-- Renk -->
        <div class="cizim-arac-grup">
          <input type="color" id="czRenk" value="${_cizimRenk}" title="Renk"
            onchange="_czRenkDegis(this.value)" style="width:34px;height:34px;padding:2px;border-radius:8px;border:2px solid var(--border);cursor:pointer;">
          <div class="cizim-hazir-renkler">
            ${['#1A2A2A','#DC2626','#2563EB','#16A34A','#F97316','#9333EA','#ffffff'].map(r=>
              `<button type="button" class="cz-hazir-renk" style="background:${r};${r==='#ffffff'?'border:2px solid #ccc;':''}"
                onclick="_czHizliRenk('${r}')" title="${r}"></button>`
            ).join('')}
          </div>
        </div>

        <div class="cizim-ayirici-v"></div>

        <!-- Kalınlık -->
        <div class="cizim-arac-grup">
          ${[2,4,8,16].map((k,i)=>
            `<button type="button" class="cz-kalinlik-btn${i===1?' aktif':''}" data-k="${k}"
              onclick="_czKalinlikSec(${k},this)" title="${k}px">
              <span style="display:block;width:${Math.min(k,14)}px;height:${Math.min(k,14)}px;background:currentColor;border-radius:50%;"></span>
            </button>`
          ).join('')}
        </div>

        <div class="cizim-ayirici-v"></div>

        <!-- Zemin Rengi -->
        <div class="cizim-arac-grup">
          <label style="font-size:11px;color:var(--ink-muted);line-height:1;">Zemin</label>
          <div class="cizim-hazir-renkler">
            ${['#ffffff','#FEF9C3','#DCFCE7','#DBEAFE','#F3F4F6','#1C1C1C'].map(z=>
              `<button type="button" class="cz-hazir-renk"
                style="background:${z};${z==='#ffffff'?'border:2px solid #ccc;':''}"
                onclick="_czZeminDegis('${z}')" title="Zemin: ${z}"></button>`
            ).join('')}
          </div>
        </div>

        <div style="margin-left:auto;">
          <button type="button" class="btn btn-ghost btn-sm" onclick="_czGeriAl()" title="Geri Al">↩</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="_czTemizle()" title="Temizle">🗑️</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="_czTamEkranAc()" title="Tam Ekran" id="czTamEkranBtn">🗖</button>
        </div>
      </div>

      <!-- Şablon Seçimi -->
      <div class="cizim-sablon-bar">
        <label style="font-size:11px;font-weight:600;color:var(--ink-muted);">Şablon:</label>
        <div class="cizim-sablon-grup">
          <button type="button" class="cz-sablon-btn aktif" data-sablon="duz" onclick="_czSablonDegis('duz'); _czUpdateSablonButtons('duz');" title="Düz">⬜</button>
          <button type="button" class="cz-sablon-btn" data-sablon="cizgili" onclick="_czSablonDegis('cizgili'); _czUpdateSablonButtons('cizgili');" title="Çizgili">📝</button>
          <button type="button" class="cz-sablon-btn" data-sablon="kareleli" onclick="_czSablonDegis('kareleli'); _czUpdateSablonButtons('kareleli');" title="Kareleli">📊</button>
          <button type="button" class="cz-sablon-btn" data-sablon="noktalı" onclick="_czSablonDegis('noktalı'); _czUpdateSablonButtons('noktalı');" title="Noktalı">⠿</button>
          <button type="button" class="cz-sablon-btn" data-sablon="defter" onclick="_czSablonDegis('defter'); _czUpdateSablonButtons('defter');" title="Defter">📓</button>
        </div>
      </div>

      <!-- Canvas Kapsayıcı (clip + overflow) -->
      <div class="cizim-kapsayici" id="czKapsayici">
        <canvas id="cizimCanvas" class="cizim-canvas"></canvas>
      </div>

      <div style="font-size:11px;color:var(--ink-muted);margin-top:4px;text-align:center;">
        İki parmakla yakınlaştır/uzaklaştır · 🤚 ile kaydır
      </div>
      <input type="hidden" id="f_cizimData" value="${escapeHtml(mevcutData)}">
    </div>
  `;
}

function _cizimBaslat(mevcutData) {
  _cizimCanvas = document.getElementById('cizimCanvas');
  if (!_cizimCanvas) return;
  _cizimCtx = _cizimCanvas.getContext('2d', { alpha: true });

  // Canvas rendering kalitesi
  _cizimCtx.imageSmoothingEnabled = true;
  _cizimCtx.imageSmoothingQuality = 'high';

  // Zoom/pan sıfırla
  _czZoom = 1; _czPanX = 0; _czPanY = 0;
  _czTamEkranAktif = false;

  // Canvas görüntü boyutu (CSS)
  const kap = document.getElementById('czKapsayici');
  let w = 340;  // Varsayılan genişlik
  if (kap) {
    // Wait for layout to be ready
    w = kap.offsetWidth || kap.clientWidth || 340;
  }
  const h = Math.max(300, Math.round(w * 0.55));  // En az 300px yükseklik
  _czMantikselW = w; _czMantikselH = h;

  // Gerçek cihaz piksel yoğunluğu — sabit 2x yerine ekrana göre keskin çizim.
  // 3'te sınırlanır (çok yüksek DPI'da bellek/performans şişmesin diye).
  _czOlcek = Math.max(2, Math.min(3, window.devicePixelRatio || 1));

  // Canvas CSS boyutu
  _cizimCanvas.style.width = w + 'px';
  _cizimCanvas.style.height = h + 'px';

  // Zemin+şablon katmanı (opak) — ayrı tutulur, sadece renk değişince yeniden çizilir
  _czBgCanvas = document.createElement('canvas');
  _czBgCanvas.width = Math.round(w * _czOlcek);
  _czBgCanvas.height = Math.round(h * _czOlcek);
  _czBgCtx = _czBgCanvas.getContext('2d', { alpha: false });

  // Çizim (içerik) katmanı — şeffaf, sadece kullanıcının çizdiği vuruşlar burada
  _czOffCanvas = document.createElement('canvas');
  _czOffCanvas.width = Math.round(w * _czOlcek);
  _czOffCanvas.height = Math.round(h * _czOlcek);
  _czOffCtx = _czOffCanvas.getContext('2d', { alpha: true });
  _czOffCtx.imageSmoothingEnabled = true;
  _czOffCtx.imageSmoothingQuality = 'high';

  // Display canvas — canvas element'in gerçek piksel boyutu (retina keskinliği)
  _cizimCanvas.width = Math.round(w * _czOlcek);
  _cizimCanvas.height = Math.round(h * _czOlcek);

  // Zemin — şablonla beraber çiz (kendi katmanına)
  _czZeminVeSablonuCiz();

  // Mevcut çizimi yükle (eski kayıtlar zemin+çizim birleşik/düz PNG olabilir;
  // içerik katmanına çizilir, üstte kalan zemin katmanı görünür kalır)
  if (mevcutData) {
    const img = new Image();
    img.onload = () => {
      _czOffCtx.drawImage(img, 0, 0, _czOffCanvas.width, _czOffCanvas.height);
      _czEkranaYaz();
    };
    img.src = mevcutData;
  } else {
    _czEkranaYaz();
  }

  _czGecmis = [];
  _czGecmisKaydet();

  // Olayları kaldır (varsa)
  const c = _cizimCanvas;
  c.removeEventListener('mousedown', _czMouseBasla);
  c.removeEventListener('mousemove', _czMouseHareket);
  c.removeEventListener('mouseup', _czMouseBitir);
  c.removeEventListener('mouseleave', _czMouseBitir);
  c.removeEventListener('wheel', _czTeker);
  c.removeEventListener('touchstart', _czTouchBasla);
  c.removeEventListener('touchmove', _czTouchHareket);
  c.removeEventListener('touchend', _czTouchBitir);

  // Olayları ekle
  c.addEventListener('mousedown', _czMouseBasla);
  c.addEventListener('mousemove', _czMouseHareket);
  c.addEventListener('mouseup', _czMouseBitir);
  c.addEventListener('mouseleave', _czMouseBitir);
  c.addEventListener('wheel', _czTeker, { passive: false });
  c.addEventListener('touchstart', _czTouchBasla, { passive: false });
  c.addEventListener('touchmove', _czTouchHareket, { passive: false });
  c.addEventListener('touchend', _czTouchBitir);
}

// Geçmiş (geri al)
let _czGecmis = [];
function _czGecmisKaydet() {
  if (!_czOffCanvas) return;
  if (_czGecmis.length > 30) _czGecmis.shift();
  _czGecmis.push(_czOffCanvas.toDataURL());
}
function _czGeriAl() {
  if (_czGecmis.length < 2) return;
  _czGecmis.pop();
  const snap = _czGecmis[_czGecmis.length - 1];
  const img = new Image();
  img.onload = () => {
    _czOffCtx.clearRect(0, 0, _czOffCanvas.width, _czOffCanvas.height);
    _czOffCtx.drawImage(img, 0, 0);
    _czEkranaYaz();
  };
  img.src = snap;
}

// Ekrana yaz (zoom+pan uygulanmış) — önce zemin katmanı, üstüne çizim katmanı
function _czEkranaYaz() {
  if (!_cizimCtx || !_czOffCanvas) return;
  _cizimCtx.clearRect(0, 0, _cizimCanvas.width, _cizimCanvas.height);
  _cizimCtx.save();
  _cizimCtx.translate(_czPanX * _czOlcek, _czPanY * _czOlcek);
  _cizimCtx.scale(_czZoom, _czZoom);
  if (_czBgCanvas) _cizimCtx.drawImage(_czBgCanvas, 0, 0);
  _cizimCtx.drawImage(_czOffCanvas, 0, 0);
  _cizimCtx.restore();
}

// Canvas → offscreen koordinat dönüşümü
function _czEkrandenOff(ex, ey) {
  const rect = _cizimCanvas.getBoundingClientRect();
  const scaleX = (_cizimCanvas.width / rect.width);
  const scaleY = (_cizimCanvas.height / rect.height);
  const cx = (ex - rect.left) * scaleX;
  const cy = (ey - rect.top) * scaleY;
  return {
    x: (cx - _czPanX * _czOlcek) / _czZoom,
    y: (cy - _czPanY * _czOlcek) / _czZoom
  };
}

// Araç ayarları
function _czAracAyarla(ctx, silgi) {
  if (silgi) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = _cizimKalinlik * 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    switch (_cizimArac) {
      case 'firca':
        ctx.strokeStyle = _cizimRenk;
        ctx.lineWidth = _cizimKalinlik * 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.6;
        break;
      case 'highlighter':
        ctx.strokeStyle = _cizimRenk;
        ctx.lineWidth = _cizimKalinlik * 6;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'bevel';
        ctx.globalAlpha = 0.35;
        break;
      default: // kalem
        ctx.strokeStyle = _cizimRenk;
        ctx.lineWidth = _cizimKalinlik;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 1;
    }
  }
}

// Mouse
function _czMouseBasla(e) {
  _cizimCiziyor = true;
  const { x, y } = _czEkrandenOff(e.clientX, e.clientY);
  _czLastX = x; _czLastY = y;
  if (_cizimArac === 'pan') {
    // Pan başlangıç - ekran koordinatını kaydet
    _czLastX = e.clientX;
    _czLastY = e.clientY;
    return;
  }
  const silgi = _cizimArac === 'silgi';
  _czAracAyarla(_czOffCtx, silgi);
  _czOffCtx.beginPath();
  _czOffCtx.moveTo(x, y);
}

function _czMouseHareket(e) {
  if (!_cizimCiziyor) return;
  
  if (_cizimArac === 'pan') {
    // Pan - basit offset hesaplaması
    const deltaX = e.clientX - _czLastX;
    const deltaY = e.clientY - _czLastY;
    _czPanX += deltaX / _czZoom;
    _czPanY += deltaY / _czZoom;
    _czLastX = e.clientX;
    _czLastY = e.clientY;
    _czEkranaYaz();
    return;
  }
  
  const { x, y } = _czEkrandenOff(e.clientX, e.clientY);
  _czOffCtx.lineTo(x, y);
  _czOffCtx.stroke();
  _czEkranaYaz();
  _czLastX = x; _czLastY = y;
}

function _czMouseBitir() {
  if (!_cizimCiziyor) return;
  _cizimCiziyor = false;
  _czOffCtx.globalAlpha = 1;
  _czGecmisKaydet();
  _czVeriKaydet();
}

// Tekerlek zoom
function _czTeker(e) {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 1.1 : 0.9;
  const yeniZoom = Math.max(0.5, Math.min(5, _czZoom * delta));
  _czZoom = yeniZoom;
  _czEkranaYaz();
}

// Touch
function _czTouchBasla(e) {
  e.preventDefault();
  if (e.touches.length === 2) {
    _cizimCiziyor = false;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    _czPinchBaslangic = Math.hypot(dx, dy);
    _czPinchZoomBaslangic = _czZoom;
    _czLastX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    _czLastY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    return;
  }
  const t = e.touches[0];
  const synth = { clientX: t.clientX, clientY: t.clientY };
  _czMouseBasla(synth);
}
function _czTouchHareket(e) {
  e.preventDefault();
  if (e.touches.length === 2) {
    // Pinch zoom
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    if (_czPinchBaslangic) {
      _czZoom = Math.max(0.5, Math.min(5, _czPinchZoomBaslangic * dist / _czPinchBaslangic));
    }
    // Pan (iki parmak ortası)
    const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    _czPanX += (mx - _czLastX) / _czZoom;
    _czPanY += (my - _czLastY) / _czZoom;
    _czLastX = mx; _czLastY = my;
    _czEkranaYaz();
    return;
  }
  const t = e.touches[0];
  _czMouseHareket({ clientX: t.clientX, clientY: t.clientY });
}
function _czTouchBitir(e) {
  _czPinchBaslangic = null;
  if (e.touches.length === 0) _czMouseBitir();
}

// Araç seçimi
function _czAracSec(arac, btn) {
  _cizimArac = arac;
  document.querySelectorAll('.cizim-arac-btn').forEach(b => b.classList.remove('aktif'));
  btn.classList.add('aktif');
}

// Renk
function _czRenkDegis(renk) {
  _cizimRenk = renk;
  document.getElementById('czRenk').value = renk;
}
function _czHizliRenk(renk) {
  _cizimRenk = renk;
  document.getElementById('czRenk').value = renk;
}

// Kalınlık
function _czKalinlikSec(k, btn) {
  _cizimKalinlik = k;
  document.querySelectorAll('.cz-kalinlik-btn').forEach(b => b.classList.remove('aktif'));
  btn.classList.add('aktif');
}

// Zemin + içerik katmanlarını tek düz PNG'de birleştir (dışa aktarım için)
function _czBirlesikGoruntu() {
  if (!_czOffCanvas) return '';
  const birlesik = document.createElement('canvas');
  birlesik.width = _czOffCanvas.width;
  birlesik.height = _czOffCanvas.height;
  const ctx = birlesik.getContext('2d');
  if (_czBgCanvas) ctx.drawImage(_czBgCanvas, 0, 0);
  ctx.drawImage(_czOffCanvas, 0, 0);
  return birlesik.toDataURL('image/png');
}

// Veri kaydetme
function _czVeriKaydet() {
  if (_czOffCanvas) {
    document.getElementById('f_cizimData').value = _czBirlesikGoruntu();
  }
}

// Zemin değiştirme
// ÖNEMLİ DÜZELTME: Eskiden zemin ve çizim aynı (opak) katmanda tutuluyordu.
// Renk değişince önce yeni zemin çiziliyor, SONRA eski görüntünün "snapshot"ı
// tamamen opak olduğu için üstüne aynen geri basılıyordu — bu da yeni rengi
// anında görünmez kılıyordu (buton hiçbir şey yapmıyormuş gibi görünüyordu).
// Artık zemin (_czBgCanvas) ve çizim (_czOffCanvas, şeffaf) ayrı katmanlar
// olduğundan, sadece zemin katmanını yeniden çizmek yeterli; çizim katmanına
// hiç dokunulmuyor.
function _czZeminDegis(renk) {
  _cizimZemin = renk;
  if (!_czBgCtx || !_czBgCanvas) return;
  _czZeminVeSablonuCiz();
  _czEkranaYaz();
  _czVeriKaydet();
}

// Şablon sistemi
let _czSablonTipi = 'duz'; // duz | cizgili | kareleli | noktalı | defter

function _czUpdateSablonButtons(sablon) {
  // Tüm butonları güncelle
  document.querySelectorAll('.cz-sablon-btn').forEach(btn => {
    if (btn.dataset.sablon === sablon) {
      btn.classList.add('aktif');
    } else {
      btn.classList.remove('aktif');
    }
  });
}

function _czSablonDegis(sablon) {
  _czSablonTipi = sablon;
  _czZeminDegis(_cizimZemin);
}

function _czZeminVeSablonuCiz() {
  if (!_czBgCtx || !_czBgCanvas) return;
  
  // Zemin rengi
  _czBgCtx.globalCompositeOperation = 'source-over';
  _czBgCtx.globalAlpha = 1;
  _czBgCtx.fillStyle = _cizimZemin;
  _czBgCtx.fillRect(0, 0, _czBgCanvas.width, _czBgCanvas.height);
  
  // Şablon
  _czBgCtx.strokeStyle = _czSablonRengi();
  _czBgCtx.globalAlpha = 0.3;
  _czBgCtx.lineWidth = 1;
  
  const w = _czBgCanvas.width;
  const h = _czBgCanvas.height;
  const spacing = 20 * _czOlcek; // 20px mantıksal birim, gerçek ölçeğe göre

  switch (_czSablonTipi) {
    case 'cizgili':
      // Yatay çizgiler (defter çizgileri)
      for (let y = spacing; y < h; y += spacing) {
        _czBgCtx.beginPath();
        _czBgCtx.moveTo(0, y);
        _czBgCtx.lineTo(w, y);
        _czBgCtx.stroke();
      }
      // Sol kenar çizgisi (defter kenar çizgisi)
      _czBgCtx.strokeStyle = _czSablonRengi(0.6);
      _czBgCtx.lineWidth = 2;
      _czBgCtx.beginPath();
      _czBgCtx.moveTo(spacing * 1.2, 0);
      _czBgCtx.lineTo(spacing * 1.2, h);
      _czBgCtx.stroke();
      break;
      
    case 'kareleli':
      // Kare ızgarası
      for (let x = spacing; x < w; x += spacing) {
        _czBgCtx.beginPath();
        _czBgCtx.moveTo(x, 0);
        _czBgCtx.lineTo(x, h);
        _czBgCtx.stroke();
      }
      for (let y = spacing; y < h; y += spacing) {
        _czBgCtx.beginPath();
        _czBgCtx.moveTo(0, y);
        _czBgCtx.lineTo(w, y);
        _czBgCtx.stroke();
      }
      break;
      
    case 'noktalı':
      // Nokta şablonu
      _czBgCtx.fillStyle = _czSablonRengi();
      _czBgCtx.globalAlpha = 0.4;
      for (let x = spacing; x < w; x += spacing) {
        for (let y = spacing; y < h; y += spacing) {
          _czBgCtx.beginPath();
          _czBgCtx.arc(x, y, 2, 0, Math.PI * 2);
          _czBgCtx.fill();
        }
      }
      break;
      
    case 'defter':
      // Defter şablonu (çizgili + kenar)
      _czBgCtx.strokeStyle = _czSablonRengi();
      _czBgCtx.globalAlpha = 0.25;
      _czBgCtx.lineWidth = 1;
      for (let y = spacing; y < h; y += spacing) {
        _czBgCtx.beginPath();
        _czBgCtx.moveTo(0, y);
        _czBgCtx.lineTo(w, y);
        _czBgCtx.stroke();
      }
      // Sol kenar (kırmızı hatırlatıcı)
      _czBgCtx.strokeStyle = '#DC2626';
      _czBgCtx.globalAlpha = 0.3;
      _czBgCtx.lineWidth = 2;
      _czBgCtx.beginPath();
      _czBgCtx.moveTo(spacing * 0.8, 0);
      _czBgCtx.lineTo(spacing * 0.8, h);
      _czBgCtx.stroke();
      break;
      
    case 'duz':
    default:
      // Sadece zemin rengi
      break;
  }
  
  _czBgCtx.globalAlpha = 1;
}

function _czSablonRengi(alpha = 0.3) {
  // Zeminin rengine göre uygun şablon rengi
  if (_cizimZemin === '#ffffff' || _cizimZemin === '#fff') {
    return '#000000'; // Beyaz zemin → siyah şablon
  } else if (_cizimZemin === '#1C1C1C' || _cizimZemin === '#000000') {
    return '#ffffff'; // Koyu zemin → beyaz şablon
  } else {
    // Açık renkler için siyah, koyu renkler için beyaz
    return '#000000';
  }
}
function _czTemizle() {
  if (!_czOffCtx || !_czOffCanvas) return;
  _czOffCtx.globalCompositeOperation = 'source-over';
  _czOffCtx.globalAlpha = 1;
  _czOffCtx.clearRect(0, 0, _czOffCanvas.width, _czOffCanvas.height);
  _czEkranaYaz();
  _czGecmisKaydet();
  _czVeriKaydet();
}

// Zemin+içerik arabelleklerini yeni mantıksal (CSS) boyuta göre yeniden oluşturur.
// Eskiden tam ekrana geçişte SADECE görünen canvas büyütülüyor, offscreen
// arabellek (_czOffCanvas) eski küçük boyutunda kalıyordu — bu da çizimin
// büyütülmüş alanın bir köşesinde küçük/bulanık kalmasına yol açıyordu.
function _czBufferYenidenBoyutlandir(w, h) {
  if (!_czOffCanvas || !_czBgCanvas) return;
  const yeniW = Math.round(w * _czOlcek);
  const yeniH = Math.round(h * _czOlcek);

  const yeniBg = document.createElement('canvas');
  yeniBg.width = yeniW; yeniBg.height = yeniH;
  yeniBg.getContext('2d').drawImage(_czBgCanvas, 0, 0, yeniW, yeniH);

  const yeniOff = document.createElement('canvas');
  yeniOff.width = yeniW; yeniOff.height = yeniH;
  yeniOff.getContext('2d').drawImage(_czOffCanvas, 0, 0, yeniW, yeniH);

  _czBgCanvas = yeniBg;
  _czBgCtx = yeniBg.getContext('2d');
  _czOffCanvas = yeniOff;
  _czOffCtx = yeniOff.getContext('2d', { alpha: true });
  _czOffCtx.imageSmoothingEnabled = true;
  _czOffCtx.imageSmoothingQuality = 'high';

  _czMantikselW = w; _czMantikselH = h;
  _cizimCanvas.style.width = w + 'px';
  _cizimCanvas.style.height = h + 'px';
  _cizimCanvas.width = yeniW;
  _cizimCanvas.height = yeniH;

  _czEkranaYaz();
}

// Tam ekran modu
function _czTamEkranAc() {
  _czTamEkranAktif = !_czTamEkranAktif;
  const container = document.getElementById('cizimContainer');
  if (!container) return;
  
  if (_czTamEkranAktif) {
    // Tam ekran aç
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.right = '0';
    container.style.bottom = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '9999';
    container.style.padding = '10px';
    container.style.backgroundColor = 'var(--bg-app)';
    container.style.overflow = 'auto';
    container.style.borderRadius = '0';
    document.body.style.overflow = 'hidden';
    
    document.getElementById('czTamEkranBtn').title = 'Tam Ekrandan Çık';
    
    // Canvas'ı (ve arabellekleri) yeniden boyutlandır
    setTimeout(() => {
      const kap = document.getElementById('czKapsayici');
      if (kap) {
        const w = Math.min(kap.offsetWidth - 20, window.innerWidth - 20);
        const h = Math.min(kap.offsetHeight - 80, window.innerHeight - 100);
        _czBufferYenidenBoyutlandir(w, h);
      }
    }, 50);
  } else {
    // Tam ekrandan çık
    container.style.position = '';
    container.style.top = '';
    container.style.left = '';
    container.style.right = '';
    container.style.bottom = '';
    container.style.width = '';
    container.style.height = '';
    container.style.zIndex = '';
    container.style.padding = '';
    container.style.backgroundColor = '';
    container.style.overflow = '';
    container.style.borderRadius = '';
    document.body.style.overflow = '';
    
    document.getElementById('czTamEkranBtn').title = 'Tam Ekran';
    
    // Canvas'ı normal boyutlandır
    _cizimBaslat(document.getElementById('f_cizimData').value);
  }
}

/* ====================================================
   TİP: GÖRÜNTÜ
   ==================================================== */
function _goruntuEditHtml(mevcutData) {
  return `
    <div class="form-group">
      <label>Görüntü</label>
      <div class="goruntu-alan" id="goruntuAlan" onclick="document.getElementById('goruntuInput').click()"
           style="cursor:pointer;${mevcutData ? 'border-style:solid;' : ''}">
        ${mevcutData
          ? `<img src="${mevcutData}" id="goruntuOnizleme" style="max-width:100%;max-height:260px;border-radius:8px;">`
          : `<div class="goruntu-placeholder">
               <span style="font-size:36px;">🖼️</span>
               <span>Görüntü seçmek için tıklayın</span>
             </div>`
        }
      </div>
      <input type="file" id="goruntuInput" accept="image/*" style="display:none;" onchange="_goruntuSec(this)">
      <input type="hidden" id="f_goruntu" value="${escapeHtml(mevcutData)}">
      ${mevcutData ? `<button type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="_goruntuSil()">🗑️ Görüntüyü Kaldır</button>` : ''}
    </div>
  `;
}

function _goruntuSec(input) {
  const dosya = input.files[0];
  if (!dosya) return;
  const reader = new FileReader();
  reader.onload = e => {
    const data = e.target.result;
    document.getElementById('f_goruntu').value = data;
    const alan = document.getElementById('goruntuAlan');
    alan.innerHTML = `<img src="${data}" id="goruntuOnizleme" style="max-width:100%;max-height:260px;border-radius:8px;">`;
    alan.style.borderStyle = 'solid';
  };
  reader.readAsDataURL(dosya);
}

function _goruntuSil() {
  document.getElementById('f_goruntu').value = '';
  document.getElementById('goruntuAlan').innerHTML = `
    <div class="goruntu-placeholder">
      <span style="font-size:36px;">🖼️</span>
      <span>Görüntü seçmek için tıklayın</span>
    </div>`;
}

/* ====================================================
   TİP: TABLO
   ==================================================== */
function _tabloEditHtml(tabloVeri, satirSayisi, sutunSayisi) {
  const s = satirSayisi || 3;
  const c = sutunSayisi || 3;
  return `
    <div class="form-group">
      <label>Tablo Boyutu</label>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">
        <label style="font-size:13px;">Satır: <input type="number" id="tabloSatir" value="${s}" min="1" max="20" style="width:60px;" onchange="_tabloYeniden()"></label>
        <label style="font-size:13px;">Sütun: <input type="number" id="tabloSutun" value="${c}" min="1" max="10" style="width:60px;" onchange="_tabloYeniden()"></label>
      </div>
      <div class="tablo-sarici" id="tabloSarici">
        ${_tabloHtmlOlustur(tabloVeri, s, c)}
      </div>
    </div>
  `;
}

function _tabloHtmlOlustur(veriler, satirSayisi, sutunSayisi) {
  let html = '<table class="not-tablo-edit">';
  for (let r = 0; r < satirSayisi; r++) {
    html += '<tr>';
    for (let c = 0; c < sutunSayisi; c++) {
      const deger = veriler && veriler[r] && veriler[r][c] ? escapeHtml(veriler[r][c]) : '';
      if (r === 0) {
        html += `<th><input class="tablo-hucre" data-r="${r}" data-c="${c}" value="${deger}" placeholder="Başlık ${c + 1}"></th>`;
      } else {
        html += `<td><input class="tablo-hucre" data-r="${r}" data-c="${c}" value="${deger}" placeholder="..."></td>`;
      }
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

function _tabloPostRender() {
  // Tab tuşuyla hücreler arası geçiş
  document.getElementById('tabloSarici').addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const hucreler = Array.from(document.querySelectorAll('.tablo-hucre'));
      const idx = hucreler.indexOf(document.activeElement);
      if (idx >= 0 && idx < hucreler.length - 1) hucreler[idx + 1].focus();
    }
  });
}

function _tabloYeniden() {
  const s = parseInt(document.getElementById('tabloSatir').value) || 3;
  const c = parseInt(document.getElementById('tabloSutun').value) || 3;
  const mevcutVeri = _tabloVerisiOku();
  document.getElementById('tabloSarici').innerHTML = _tabloHtmlOlustur(mevcutVeri, s, c);
  _tabloPostRender();
}

function _tabloVerisiOku() {
  const hucreler = document.querySelectorAll('.tablo-hucre');
  const veri = [];
  hucreler.forEach(h => {
    const r = parseInt(h.dataset.r);
    const c = parseInt(h.dataset.c);
    if (!veri[r]) veri[r] = [];
    veri[r][c] = h.value.trim();
  });
  return veri;
}

/* ====================================================
   KAYDET
   ==================================================== */
function _notKaydet(mevcutId, tip) {
  const baslik = (document.getElementById('f_baslik')?.value || '').trim();
  const renk = document.getElementById('f_renk')?.value || 'sari';
  const tarih = document.getElementById('f_tarih')?.value || todayISO();
  const etiketlerRaw = (document.getElementById('f_etiketler')?.value || '').trim();
  const etiketler = etiketlerRaw
    ? etiketlerRaw.split(',').map(e => e.trim()).filter(Boolean)
    : [];

  let veri = { baslik, renk, tarih, etiketler, tip };

  switch (tip) {
    case 'metin': {
      const editEl = document.getElementById('zmeEditor');
      const icerik = editEl ? editEl.innerHTML : '';
      if (!baslik && !editEl?.textContent.trim()) {
        toast('Başlık veya içerik girilmelidir.');
        return;
      }
      veri.icerik = icerik;
      break;
    }
    case 'todo': {
      const maddeler = _todoVerisiOku();
      if (!baslik && !maddeler.length) {
        toast('En az bir madde veya başlık girilmelidir.');
        return;
      }
      veri.maddeler = maddeler;
      break;
    }
    case 'cizim': {
      if (_czOffCanvas) {
        document.getElementById('f_cizimData').value = _czBirlesikGoruntu();
      }
      const cizimData = document.getElementById('f_cizimData')?.value || '';
      veri.cizimData = cizimData;
      break;
    }
    case 'goruntu': {
      const goruntu = document.getElementById('f_goruntu')?.value || '';
      veri.goruntu = goruntu;
      break;
    }
    case 'tablo': {
      const tabloVeri = _tabloVerisiOku();
      const satirSayisi = parseInt(document.getElementById('tabloSatir')?.value) || 3;
      const sutunSayisi = parseInt(document.getElementById('tabloSutun')?.value) || 3;
      veri.tabloVeri = tabloVeri;
      veri.tabloSatir = satirSayisi;
      veri.tabloSutun = sutunSayisi;
      break;
    }
  }

  NotlarService.notKaydet(mevcutId, veri).then(()=>toast('Kaydedildi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
  modalKapat();
}

/* ====================================================
   TODO TAMAMLANDI TOGGLE (Grid'den direkt)
   ==================================================== */
function notTodoToggle(notId, maddeIdx) {
  const n = notlar.find(x => x.id === notId);
  if (!n || !n.maddeler) return;
  n.maddeler[maddeIdx].tamamlandi = !n.maddeler[maddeIdx].tamamlandi;
  NotlarService.notMaddeleriGuncelle(notId, n.maddeler).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ---------- FIRESTORE BAĞLANTISI (app.js baglantilariKur içinden çağrılır) ----------
   Artık doğrudan db.collection() çağrılmıyor — NotlarRepository üzerinden dinleniyor.
   Görünürlük filtresi (kişisel notlar) NotlarService.gorunurListele() ile uygulanır. */
function notlarBaglantilariKur(){
  NotlarRepository.notlariDinle(v=>{
    notlar = NotlarService.gorunurListele(v);
    renderNotlar();
    if(typeof renderDashboardNotlar==='function') renderDashboardNotlar();
    if(typeof globalAramaYap==='function') globalAramaYap();
    if(typeof onbellekKaydet==='function') onbellekKaydet();
  });
}
