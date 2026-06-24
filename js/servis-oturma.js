/* ====================================================================
   js/servis-oturma.js  (v1.1)
   Servis Oturma Planı Modülü
   ────────────────────────────────────────────────────────────────────
   Veri: COL.servisOturma → 'oy_servisOturma'
     Belge ID = servisId
     Alan: { servisId, kapasite, siraSayisi, duzen:'tek'|'cift'|'dort',
             soforKoltuguVarMi:bool, soforYaniSayisi:1|2,
             koltuklar:[{no, ogrenciId, ogrenciAdi, rezerve}] }
   ────────────────────────────────────────────────────────────────────
   Koltuk şablonları (okulun gerçek filosu):
     Minibüs 16+1  (16 öğrenci + 1 şoför)
     Minibüs 16+2  (16 öğrenci + şoför + refakatçi koltuğu)
     Minibüs 19+1  (19 öğrenci + 1 şoför)
     Minibüs 19+2  (19 öğrenci + şoför + refakatçi koltuğu)
     Otobüs  36    (36 öğrenci + 1 şoför)
   Renk kodlaması:
     🟢 dolu (#22c55e)   ⬜ boş (#e5e7eb)   🔵 rezerve (#3b82f6)
   ==================================================================== */

let servisOturmaPlani = [];     // tüm servislerin oturma planları

const SO_SABLONLAR = {
  minibus16_1: { ad: 'Minibüs 16+1', kapasite: 16, siraSayisi: 4, duzen: 'cift', soforKoltuguVarMi: true, soforYani: 'tekli' },
  minibus16_2: { ad: 'Minibüs 16+2', kapasite: 16, siraSayisi: 4, duzen: 'cift', soforKoltuguVarMi: true, soforYani: 'ikili' },
  minibus19_1: { ad: 'Minibüs 19+1', kapasite: 19, siraSayisi: 5, duzen: 'cift', soforKoltuguVarMi: true, soforYani: 'tekli' },
  minibus19_2: { ad: 'Minibüs 19+2', kapasite: 19, siraSayisi: 5, duzen: 'cift', soforKoltuguVarMi: true, soforYani: 'ikili' },
  otobus36:    { ad: 'Otobüs 36',    kapasite: 36, siraSayisi: 6, duzen: 'dort', soforKoltuguVarMi: true, soforYani: 'tekli' },
};

/* ---------- Firestore bağlantısı (app.js baglantilariKur içinden çağrılır) ---------- */
function servisOturmaBaglantisiKur() {
  if (!db) return;
  db.collection(COL.servisOturma).onSnapshot(snap => {
    servisOturmaPlani = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Aktif oturma editörü açıksa yenile
    const aktifServisId = document.getElementById('soServisId') ? document.getElementById('soServisId').value : null;
    if (aktifServisId) _soRenderGrid(aktifServisId);
  }, err => console.warn('servisOturma snapshot:', err));
}

/* ================================================================
   ANA MODAL: Oturma Planı Editörü
   ================================================================ */
function servisOturmaModalAc(servisId) {
  const s = servisler.find(x => x.id === servisId);
  if (!s) return;

  const mevcut = servisOturmaPlani.find(p => p.servisId === servisId);
  const kapasite    = mevcut ? mevcut.kapasite    : 16;
  const siraSayisi  = mevcut ? mevcut.siraSayisi  : 4;
  const duzen       = mevcut ? mevcut.duzen       : 'cift';
  const soforVar    = mevcut ? (mevcut.soforKoltuguVarMi !== false) : true;
  const soforYani   = mevcut ? (mevcut.soforYaniSayisi === 2 ? 'ikili' : 'tekli') : 'tekli';

  const modalIcerik = `
    <div style="display:flex;flex-direction:column;gap:12px;">

      <!-- Servis bilgisi -->
      <div style="background:#f5f3ff;border-radius:8px;padding:10px 14px;font-size:12px;color:#5b21b6;">
        🚌 <strong>${escapeHtml(s.servisAdi)}</strong>
        ${s.guzergah ? ` · ${escapeHtml(s.guzergah)}` : ''}
        &nbsp;|&nbsp; Şoför: ${escapeHtml(s.soforAdi || '—')}
      </div>

      <!-- Gizli servis id -->
      <input type="hidden" id="soServisId" value="${servisId}">

      <!-- Şablon hızlı seçim -->
      <div>
        <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Araç Şablonu (hızlı seçim)</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" onclick="soSablonUygula('minibus16_1')">🚐 Minibüs 16+1</button>
          <button class="btn btn-ghost btn-sm" onclick="soSablonUygula('minibus16_2')">🚐 Minibüs 16+2</button>
          <button class="btn btn-ghost btn-sm" onclick="soSablonUygula('minibus19_1')">🚐 Minibüs 19+1</button>
          <button class="btn btn-ghost btn-sm" onclick="soSablonUygula('minibus19_2')">🚐 Minibüs 19+2</button>
          <button class="btn btn-ghost btn-sm" onclick="soSablonUygula('otobus36')">🚌 Otobüs 36</button>
        </div>
      </div>

      <!-- Özel yapı -->
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
        <div class="form-group" style="flex:1;min-width:120px;">
          <label>Kapasite (10–60)</label>
          <input type="number" id="soKapasite" min="10" max="60" value="${kapasite}" oninput="soYapiGuncelle()">
        </div>
        <div class="form-group" style="flex:1;min-width:120px;">
          <label>Sıra Sayısı</label>
          <input type="number" id="soSiraSayisi" min="2" max="30" value="${siraSayisi}" oninput="soYapiGuncelle()">
        </div>
        <div class="form-group" style="flex:1;min-width:120px;">
          <label>Düzen</label>
          <select id="soDuzen" onchange="soYapiGuncelle()">
            <option value="cift" ${duzen === 'cift' ? 'selected' : ''}>2+2 (çift)</option>
            <option value="tek"  ${duzen === 'tek'  ? 'selected' : ''}>1+2 (tek sol)</option>
            <option value="dort"  ${duzen === 'dort' ? 'selected' : ''}>2+2+2 (geniş)</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;min-width:140px;">
          <label>Şoför Yanı</label>
          <select id="soSoforYani" onchange="soYapiGuncelle()" style="width:100%;">
            <option value="tekli" ${soforYani === 'tekli' ? 'selected' : ''}>🪑 Tekli (sadece şoför)</option>
            <option value="ikili" ${soforYani === 'ikili' ? 'selected' : ''}>🪑🪑 İkili (şoför + refakatçi)</option>
          </select>
        </div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:500;margin-bottom:8px;">
          <input type="checkbox" id="soSoforVar" ${soforVar ? 'checked' : ''} onchange="soYapiGuncelle()">
          Şoför koltuğu
        </label>
      </div>

      <!-- Koltuk grid -->
      <div id="soGridContainer" style="overflow:auto;max-height:420px;border:1px solid #e5e7eb;border-radius:10px;padding:14px;background:#fafafa;">
        <div id="soGrid"></div>
      </div>

      <!-- Özet -->
      <div id="soOzet" style="font-size:12px;color:#6b7280;display:flex;gap:14px;flex-wrap:wrap;align-items:center;">
        <span>🟢 Dolu: <strong id="soDoluSayisi">0</strong></span>
        <span>⬜ Boş: <strong id="soBosSayisi">0</strong></span>
        <span>🔵 Rezerve: <strong id="soRezerve">0</strong></span>
        <button class="btn btn-ghost btn-sm" onclick="soTumunuTemizle()" style="margin-left:auto;">🗑️ Tümünü Temizle</button>
        <button class="btn btn-ghost btn-sm" onclick="raporServisOturmaPlan('${servisId}')">🖨️ Rapor Al</button>
      </div>
    </div>
  `;

  modalAc(`🚌 Oturma Planı — ${escapeHtml(s.servisAdi)}`, modalIcerik, () => {
    soKaydet(servisId);
  });

  // Grid'i çiz
  setTimeout(() => _soRenderGrid(servisId), 50);
}

/* ---------- Şablon uygula ---------- */
function soSablonUygula(sablon) {
  const s = SO_SABLONLAR[sablon];
  if (!s) return;
  document.getElementById('soKapasite').value   = s.kapasite;
  document.getElementById('soSiraSayisi').value = s.siraSayisi;
  document.getElementById('soDuzen').value      = s.duzen;
  document.getElementById('soSoforVar').checked = s.soforKoltuguVarMi;
  document.getElementById('soSoforYani').value  = s.soforYani || 'tekli';
  soYapiGuncelle();
}

/* ---------- Yapı güncelle (input değişince) ---------- */
function soYapiGuncelle() {
  const servisId = document.getElementById('soServisId').value;
  _soRenderGrid(servisId);
}

/* ---------- Ana grid renderer ---------- */
function _soRenderGrid(servisId) {
  const grid = document.getElementById('soGrid');
  if (!grid) return;

  const kapasite   = parseInt(document.getElementById('soKapasite').value)   || 14;
  const siraSayisi = parseInt(document.getElementById('soSiraSayisi').value) || 7;
  const duzen      = document.getElementById('soDuzen').value || 'cift';
  const soforVar   = document.getElementById('soSoforVar').checked;
  const soforYani  = document.getElementById('soSoforYani').value || 'tekli';

  // Mevcut koltuk verileri
  const mevcut = servisOturmaPlani.find(p => p.servisId === servisId);
  const mevcutKoltuklar = mevcut ? (mevcut.koltuklar || []) : [];

  // Sıra başına koltuk sayıları
  const siraKoltukSayisi = duzen === 'tek' ? 3 : duzen === 'dort' ? 6 : 4;
  const gercekKapasite   = Math.min(kapasite, siraSayisi * siraKoltukSayisi);

  // Koltuk No → mevcut veri eşlemesi
  const koltukMap = {};
  mevcutKoltuklar.forEach(k => { koltukMap[k.no] = k; });

  let html = '<div class="so-arac-govde">';

  // Şoför koltuğu (+ varsa refakatçi koltuğu) — araç gövdesinin solunda
  if (soforVar) {
    html += `<div class="so-sofor-sira">
      <div class="so-koltuk so-sofor" title="Şoför">🧑‍✈️</div>
      ${soforYani === 'ikili' ? `<div class="so-koltuk so-refakatci" title="Refakatçi / Rehber Öğretmen">🧑‍🏫</div>` : ''}
    </div>`;
  }

  // Koltuk sıraları
  let koltukNo = 1;
  for (let sira = 0; sira < siraSayisi && koltukNo <= gercekKapasite; sira++) {
    html += '<div class="so-sira">';

    // Sol koltuklar
    const solSayisi = (duzen === 'tek') ? 1 : 2;
    const sagSayisi = 2;

    for (let k = 0; k < solSayisi && koltukNo <= gercekKapasite; k++) {
      html += _soKoltukHtml(koltukNo, koltukMap[koltukNo], servisId);
      koltukNo++;
    }

    html += '<div class="so-koridor"></div>';

    for (let k = 0; k < sagSayisi && koltukNo <= gercekKapasite; k++) {
      html += _soKoltukHtml(koltukNo, koltukMap[koltukNo], servisId);
      koltukNo++;
    }

    // Geniş düzende 3. çift
    if (duzen === 'dort') {
      html += '<div class="so-koridor"></div>';
      for (let k = 0; k < 2 && koltukNo <= gercekKapasite; k++) {
        html += _soKoltukHtml(koltukNo, koltukMap[koltukNo], servisId);
        koltukNo++;
      }
    }

    html += '</div>'; // .so-sira
  }

  html += '</div>'; // .so-arac-govde
  grid.innerHTML = html;

  _soOzetGuncelle(mevcutKoltuklar, gercekKapasite);
}

/* ---------- Tek koltuk HTML'i ---------- */
function _soKoltukHtml(no, veri, servisId) {
  const dolu    = veri && (veri.ogrenciId || veri.ogrenciAdi);
  const rezerve = veri && veri.rezerve;
  const sinif   = dolu ? (() => {
    const v = veliler.find(x => x.id === veri.ogrenciId);
    const sn = v ? siniflar.find(s => s.id === v.sinifId) : null;
    return sn ? sn.ad : '';
  })() : '';

  let renk  = rezerve ? '#3b82f6' : dolu ? '#22c55e' : '#e5e7eb';
  let ikon  = rezerve ? '🔵' : dolu ? '🟢' : '⬜';
  const ad  = dolu ? (veri.ogrenciAdi || '') : (rezerve ? 'Rezerve' : '');
  const kisa = ad.length > 12 ? ad.substring(0, 11) + '…' : ad;
  const title = ad ? `No:${no} — ${ad}${sinif ? ' ('+sinif+')' : ''}` : `No:${no} — Boş`;

  return `<div class="so-koltuk${dolu?' so-dolu':''}${rezerve?' so-rezerve':''}"
    style="background:${renk};"
    onclick="soKoltukTikla(${no}, '${servisId}')"
    title="${escapeHtml(title)}">
    <span class="so-koltuk-no">${no}</span>
    ${ad ? `<span class="so-koltuk-ad">${escapeHtml(kisa)}</span>` : ''}
  </div>`;
}

/* ---------- Koltuk tıklama: dropdown ---------- */
function soKoltukTikla(koltukNo, servisId) {
  const mevcut = servisOturmaPlani.find(p => p.servisId === servisId);
  const koltuklar = mevcut ? (mevcut.koltuklar || []) : [];
  const koltuk = koltuklar.find(k => k.no === koltukNo) || {};

  // Servisteki öğrenciler
  const servisOgrencileri = veliler
    .filter(v => v.servisId === servisId)
    .sort((a, b) => (a.ogrenciAdi || '').localeCompare(b.ogrenciAdi || '', 'tr'));

  const secenekler = servisOgrencileri.map(v => {
    const zatenAtanmis = koltuklar.some(k => k.ogrenciId === v.id && k.no !== koltukNo);
    const sn = siniflar.find(s => s.id === v.sinifId);
    return `<option value="${v.id}" ${koltuk.ogrenciId === v.id ? 'selected' : ''} ${zatenAtanmis ? 'disabled' : ''}>
      ${escapeHtml(v.ogrenciAdi)}${sn ? ' — ' + sn.ad : ''}${zatenAtanmis ? ' (atanmış)' : ''}
    </option>`;
  }).join('');

  const body = `
    <p style="margin:0 0 10px;font-size:13px;color:#374151;">
      <strong>${koltukNo}. Koltuk</strong> için öğrenci seçin veya durum belirleyin.
    </p>
    <div class="form-group">
      <label>Öğrenci</label>
      <select id="soOgrenciSec">
        <option value="">— Boş bırak —</option>
        ${secenekler}
      </select>
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
        <input type="checkbox" id="soRezerveCheck" ${koltuk.rezerve ? 'checked' : ''}>
        Rezerve olarak işaretle (öğrenci seçilmemişse)
      </label>
    </div>
    ${!servisOgrencileri.length ? `<p style="font-size:12px;color:#f59e0b;">⚠️ Bu serviste kayıtlı öğrenci yok. Önce servise öğrenci ekleyin.</p>` : ''}
  `;

  modalAc(`Koltuk Düzeni — ${koltukNo}. Koltuk`, body, () => {
    const ogrenciId = document.getElementById('soOgrenciSec').value;
    const rezerve   = document.getElementById('soRezerveCheck').checked && !ogrenciId;
    soKoltukGuncelle(servisId, koltukNo, ogrenciId, rezerve);
    // Modal AÇIK kalır — kullanıcı başka koltuk seçebilsin
    // Grid otomatik yenilenecek (snapshot listener aracılığıyla)
  });
}

/* ---------- Koltuk güncelle (Firestore) ---------- */
function soKoltukGuncelle(servisId, koltukNo, ogrenciId, rezerve) {
  const mevcut = servisOturmaPlani.find(p => p.servisId === servisId);
  let koltuklar = mevcut ? [...(mevcut.koltuklar || [])] : [];

  // Mevcut koltuk kaydını güncelle ya da ekle
  const idx = koltuklar.findIndex(k => k.no === koltukNo);
  const v   = ogrenciId ? veliler.find(x => x.id === ogrenciId) : null;

  const yeniKoltuk = {
    no: koltukNo,
    ogrenciId:  ogrenciId || null,
    ogrenciAdi: v ? (v.ogrenciAdi || '') : '',
    rezerve:    rezerve,
  };

  if (idx >= 0) koltuklar[idx] = yeniKoltuk;
  else koltuklar.push(yeniKoltuk);

  const kapasite   = parseInt(document.getElementById('soKapasite')?.value)   || mevcut?.kapasite   || 14;
  const siraSayisi = parseInt(document.getElementById('soSiraSayisi')?.value) || mevcut?.siraSayisi || 7;
  const duzen      = document.getElementById('soDuzen')?.value || mevcut?.duzen || 'cift';
  const soforVar   = document.getElementById('soSoforVar')?.checked ?? (mevcut?.soforKoltuguVarMi !== false);
  const soforYaniSayisi = (document.getElementById('soSoforYani')?.value === 'ikili') ? 2 : 1;

  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, kapasite, siraSayisi, duzen,
    soforKoltuguVarMi: soforVar,
    soforYaniSayisi,
    koltuklar,
    guncellendi: new Date().toISOString(),
  }, { merge: false }).catch(err => toast('Hata: ' + err.message));
}

/* ---------- Tümünü temizle ---------- */
function soTumunuTemizle() {
  const servisId = document.getElementById('soServisId')?.value;
  if (!servisId) return;
  if (!confirm('Bu servisin tüm koltuk atamaları silinecek. Emin misiniz?')) return;
  const mevcut = servisOturmaPlani.find(p => p.servisId === servisId);
  if (!mevcut) return;
  db.collection(COL.servisOturma).doc(servisId).update({ koltuklar: [] })
    .then(() => toast('Koltuk atamaları temizlendi.'))
    .catch(err => toast('Hata: ' + err.message));
}

/* ---------- Modal kaydet (tüm yapıyı kaydet) ---------- */
function soKaydet(servisId) {
  // Koltuk atamaları zaten anlık kaydediliyor, burada sadece yapı ayarlarını güncelle
  const mevcut = servisOturmaPlani.find(p => p.servisId === servisId);
  const kapasite   = parseInt(document.getElementById('soKapasite')?.value)   || 14;
  const siraSayisi = parseInt(document.getElementById('soSiraSayisi')?.value) || 7;
  const duzen      = document.getElementById('soDuzen')?.value || 'cift';
  const soforVar   = document.getElementById('soSoforVar')?.checked ?? true;
  const soforYaniSayisi = (document.getElementById('soSoforYani')?.value === 'ikili') ? 2 : 1;

  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, kapasite, siraSayisi, duzen,
    soforKoltuguVarMi: soforVar,
    soforYaniSayisi,
    koltuklar: mevcut ? (mevcut.koltuklar || []) : [],
  }, { merge: true }).then(() => toast('Oturma planı kaydedildi.'))
    .catch(err => toast('Hata: ' + err.message));
}

/* ---------- Özet güncelle ---------- */
function _soOzetGuncelle(koltuklar, kapasite) {
  const dolu    = koltuklar.filter(k => k.ogrenciId || k.ogrenciAdi).length;
  const rezerve = koltuklar.filter(k => k.rezerve && !(k.ogrenciId || k.ogrenciAdi)).length;
  const bos     = kapasite - dolu - rezerve;

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('soDoluSayisi', dolu);
  el('soBosSayisi', Math.max(0, bos));
  el('soRezerve', rezerve);
}

/* ================================================================
   Taşıma alt sekme kontrolü
   ================================================================ */
function tasimaAltSekmeSec(sekme) {
  document.querySelectorAll('[data-tasima-sekme]').forEach(b => {
    b.classList.toggle('active', b.dataset.tasimaSekmė === sekme || b.getAttribute('data-tasima-sekme') === sekme);
  });
  const servislerDiv = document.getElementById('tasima-bolum-servisler');
  const oturmaDiv    = document.getElementById('tasima-bolum-oturma');
  if (servislerDiv) servislerDiv.style.display = sekme === 'servisler' ? '' : 'none';
  if (oturmaDiv)    oturmaDiv.style.display    = sekme === 'oturma'    ? '' : 'none';
  if (sekme === 'oturma') renderOturmaServisler();
}

/* ================================================================
   Oturma planı servis listesi render
   ================================================================ */
function renderOturmaServisler() {
  const hedef = document.getElementById('oturmaServislerListesi');
  if (!hedef) return;

  const liste = [...servisler].sort((a, b) => (a.servisAdi || '').localeCompare(b.servisAdi || '', 'tr'));

  if (!liste.length) {
    hedef.innerHTML = '<div class="empty-state">Henüz servis eklenmedi.</div>';
    return;
  }

  hedef.innerHTML = liste.map(s => {
    const plan = servisOturmaPlani.find(p => p.servisId === s.id);
    const kapasite = plan ? (plan.kapasite || 0) : 0;
    const dolu     = plan ? (plan.koltuklar || []).filter(k => k.ogrenciId || k.ogrenciAdi).length : 0;
    const bos      = kapasite - dolu;
    const rezerve  = plan ? (plan.koltuklar || []).filter(k => k.rezerve && !(k.ogrenciId || k.ogrenciAdi)).length : 0;
    const planVar  = !!plan;

    return `<div class="oturma-servis-kart" onclick="servisOturmaModalAc('${s.id}')">
      <div>
        <strong>${escapeHtml(s.servisAdi || 'Servis')}</strong>
        <span class="badge badge-${s.durum === 'Pasif' ? 'gray' : 'sage'}" style="margin-left:6px;">${escapeHtml(s.durum || 'Aktif')}</span>
        <div class="oturma-servis-ozet">
          ${s.guzergah ? escapeHtml(s.guzergah) + ' · ' : ''}
          ${planVar
            ? `Kapasite: ${kapasite} · 🟢 Dolu: ${dolu} · ⬜ Boş: ${bos - rezerve} · 🔵 Rezerve: ${rezerve}`
            : 'Oturma planı henüz oluşturulmadı'}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); servisOturmaModalAc('${s.id}')">
        💺 ${planVar ? 'Düzenle' : 'Oluştur'}
      </button>
    </div>`;
  }).join('');
}
