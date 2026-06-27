/* ============================================================
   NOTLAR.JS — Gelişmiş Not Defteri Modülü v1.0
   Özellikler:
   - Zengin metin editörü (kalın, italik, başlık, liste)
   - Yapılacaklar listesi (checkbox todo)
   - El çizimi (canvas)
   - Görüntü ekleme (base64)
   - Tablo ekleme
   - Renk/etiket sistemi
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
let _cizimAktif = false;
let _cizimCiziyor = false;
let _cizimCanvas = null;
let _cizimCtx = null;
let _cizimRenk = '#1A2A2A';
let _cizimKalinlik = 3;

/* ====================================================
   RENDER — Notlar Grid
   ==================================================== */
function renderNotlar() {
  const liste = [...notlar].sort((a, b) =>
    (b.eklenmeTarihi || '').localeCompare(a.eklenmeTarihi || '')
  );
  const grid = document.getElementById('notlarGrid');
  if (!grid) return;

  if (!liste.length) {
    grid.innerHTML = '<p class="empty-state">Henüz not eklenmedi.</p>';
    return;
  }

  grid.innerHTML = liste.map(n => {
    const renk = NOT_RENKLERI.find(r => r.id === n.renk) || NOT_RENKLERI[0];
    const onizleme = _notOnizleme(n);
    const etiketler = (n.etiketler || []).map(e =>
      `<span class="not-etiket">${escapeHtml(e)}</span>`
    ).join('');
    return `
      <div class="note-card" onclick="notlarDuzenle('${n.id}')"
           style="background:${renk.bg};border-left:3px solid ${renk.border};">
        <div class="note-header">
          <div class="note-title">${escapeHtml(n.baslik || '(Başlıksız)')}</div>
          <div class="note-type-badge">${_notTipIkonu(n.tip)}</div>
        </div>
        <div class="note-icerik">${onizleme}</div>
        ${etiketler ? `<div class="note-etiketler">${etiketler}</div>` : ''}
        <div class="note-tarih">${formatTarih(n.tarih || (n.eklenmeTarihi || '').slice(0, 10))}</div>
      </div>
    `;
  }).join('');
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
      // metin — HTML'den temiz metin çıkar
      const tmp = document.createElement('div');
      tmp.innerHTML = n.icerik || '';
      const temizMetin = (tmp.textContent || '').slice(0, 160);
      return `<span>${escapeHtml(temizMetin)}</span>`;
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
          onclick="notlarDuzenle('${n.id}')">
          <strong>${escapeHtml(n.baslik || '(Başlıksız)')}</strong>
          <span style="font-size:11px;color:var(--ink-muted);margin-left:6px;">${_notTipIkonu(n.tip)}</span>
        </div>`;
      }).join('')
    : '<p class="empty-state">Henüz not eklenmedi.</p>';
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
        db.collection(COL.notlar).doc(mevcutId).delete();
        modalKapat();
      }
    } : null
  );

  // Post-render işlemler
  setTimeout(() => {
    if (tip === 'cizim') _cizimBaslat(n.cizimData || '');
    if (tip === 'tablo') _tabloPostRender();
  }, 80);
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
      <label>Maddeler</label>
      <div id="todoListe" class="todo-liste">${satirlar}</div>
      <button type="button" class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="_todoMaddeEkle()">+ Madde Ekle</button>
    </div>
  `;
}

function _todoSatirHtml(idx, metin, tamamlandi) {
  return `
    <div class="todo-satir" id="todoSatir_${idx}" data-idx="${idx}">
      <input type="checkbox" class="todo-cb" ${tamamlandi ? 'checked' : ''}
        onchange="this.closest('.todo-satir').querySelector('.todo-input').classList.toggle('tamamlandi',this.checked)">
      <input type="text" class="todo-input${tamamlandi ? ' tamamlandi' : ''}"
        placeholder="Madde..." value="${escapeHtml(metin || '')}"
        onkeydown="if(event.key==='Enter'){event.preventDefault();_todoMaddeEkle(this)}">
      <button type="button" class="todo-sil-btn" onclick="this.closest('.todo-satir').remove()" title="Sil">✕</button>
    </div>
  `;
}

let _todoSayac = 100;
function _todoMaddeEkle(sonrasindakiInput) {
  const liste = document.getElementById('todoListe');
  const idx = _todoSayac++;
  const div = document.createElement('div');
  div.innerHTML = _todoSatirHtml(idx, '', false);
  const satir = div.firstElementChild;
  if (sonrasindakiInput) {
    sonrasindakiInput.closest('.todo-satir').insertAdjacentElement('afterend', satir);
  } else {
    liste.appendChild(satir);
  }
  satir.querySelector('.todo-input').focus();
}

function _todoVerisiOku() {
  const satirlar = document.querySelectorAll('#todoListe .todo-satir');
  return Array.from(satirlar).map(s => ({
    metin: s.querySelector('.todo-input').value.trim(),
    tamamlandi: s.querySelector('.todo-cb').checked
  })).filter(m => m.metin);
}

/* ====================================================
   TİP: ÇİZİM — Canvas
   ==================================================== */
function _cizimEditHtml(mevcutData) {
  return `
    <div class="form-group">
      <label>Çizim</label>
      <div class="cizim-araclari">
        <label>Renk: <input type="color" id="cizimRenk" value="${_cizimRenk}" onchange="_cizimRenkDegis(this.value)"></label>
        <label>Kalınlık:
          <select id="cizimKalinlik" onchange="_cizimKalinlikDegis(this.value)">
            <option value="1">İnce</option>
            <option value="3" selected>Normal</option>
            <option value="6">Kalın</option>
            <option value="14">Çok Kalın</option>
          </select>
        </label>
        <button type="button" class="btn btn-ghost btn-sm" onclick="_cizimSil()">🗑️ Temizle</button>
      </div>
      <canvas id="cizimCanvas" class="cizim-canvas" width="600" height="280"></canvas>
      <input type="hidden" id="f_cizimData" value="${escapeHtml(mevcutData)}">
    </div>
  `;
}

function _cizimBaslat(mevcutData) {
  _cizimCanvas = document.getElementById('cizimCanvas');
  if (!_cizimCanvas) return;
  _cizimCtx = _cizimCanvas.getContext('2d');

  // Canvas boyutunu container'a göre ayarla
  const w = _cizimCanvas.parentElement.clientWidth - 32;
  if (w > 100) _cizimCanvas.width = w;

  // Beyaz arka plan
  _cizimCtx.fillStyle = '#ffffff';
  _cizimCtx.fillRect(0, 0, _cizimCanvas.width, _cizimCanvas.height);

  // Mevcut çizimi yükle
  if (mevcutData) {
    const img = new Image();
    img.onload = () => _cizimCtx.drawImage(img, 0, 0);
    img.src = mevcutData;
  }

  // Mouse olayları
  _cizimCanvas.addEventListener('mousedown', _cizimBasla);
  _cizimCanvas.addEventListener('mousemove', _cizimCiz);
  _cizimCanvas.addEventListener('mouseup', _cizimBitir);
  _cizimCanvas.addEventListener('mouseleave', _cizimBitir);

  // Touch olayları (mobil)
  _cizimCanvas.addEventListener('touchstart', e => { e.preventDefault(); _cizimBasla(_touchToMouse(e)); }, { passive: false });
  _cizimCanvas.addEventListener('touchmove', e => { e.preventDefault(); _cizimCiz(_touchToMouse(e)); }, { passive: false });
  _cizimCanvas.addEventListener('touchend', _cizimBitir);
}

function _touchToMouse(e) {
  const rect = _cizimCanvas.getBoundingClientRect();
  const t = e.touches[0];
  return { clientX: t.clientX, clientY: t.clientY, _rect: rect };
}

function _cizimKonum(e) {
  const rect = e._rect || _cizimCanvas.getBoundingClientRect();
  const scaleX = _cizimCanvas.width / rect.width;
  const scaleY = _cizimCanvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function _cizimBasla(e) {
  _cizimCiziyor = true;
  const { x, y } = _cizimKonum(e);
  _cizimCtx.beginPath();
  _cizimCtx.moveTo(x, y);
}

function _cizimCiz(e) {
  if (!_cizimCiziyor) return;
  const { x, y } = _cizimKonum(e);
  _cizimCtx.lineTo(x, y);
  _cizimCtx.strokeStyle = _cizimRenk;
  _cizimCtx.lineWidth = _cizimKalinlik;
  _cizimCtx.lineCap = 'round';
  _cizimCtx.lineJoin = 'round';
  _cizimCtx.stroke();
}

function _cizimBitir() {
  if (!_cizimCiziyor) return;
  _cizimCiziyor = false;
  if (_cizimCanvas) {
    document.getElementById('f_cizimData').value = _cizimCanvas.toDataURL('image/png');
  }
}

function _cizimRenkDegis(v) { _cizimRenk = v; }
function _cizimKalinlikDegis(v) { _cizimKalinlik = parseInt(v); }

function _cizimSil() {
  if (!_cizimCanvas || !_cizimCtx) return;
  _cizimCtx.fillStyle = '#ffffff';
  _cizimCtx.fillRect(0, 0, _cizimCanvas.width, _cizimCanvas.height);
  document.getElementById('f_cizimData').value = '';
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
      // Canvas'tan son veriyi al
      if (_cizimCanvas) {
        document.getElementById('f_cizimData').value = _cizimCanvas.toDataURL('image/png');
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

  kaydet(COL.notlar, mevcutId, veri);
  modalKapat();
}

/* ====================================================
   TODO TAMAMLANDI TOGGLE (Grid'den direkt)
   ==================================================== */
function notTodoToggle(notId, maddeIdx) {
  const n = notlar.find(x => x.id === notId);
  if (!n || !n.maddeler) return;
  n.maddeler[maddeIdx].tamamlandi = !n.maddeler[maddeIdx].tamamlandi;
  db.collection(COL.notlar).doc(notId).update({ maddeler: n.maddeler });
}
