/* ====================================================================
   js/servis-oturma.js  (v5.0)
   Placeholder Sistem: Tüm yuvalar başlangıçta aktif: false
   + tıkla → aktif et → öğrenci ata
   Sil → aktif: false → + tekrar
   ==================================================================== */

let servisOturmaPlani = [];

/* ================================================================
   ŞABLON TANIMLARI
   ================================================================ */
const SO_SABLONLAR = {

  minibus: {
    ad: 'Minibüs', ikon: '🚐', aciklama: '1+2 düzen',
    yerlesimUret(siraMax = 5) {
      const y = [];
      // Sıra 0: şoför yanı
      y.push({ sira: 0, konum: 'sol-tek', soforYani: true, aktif: false });
      y.push({ sira: 0, konum: 'sag-ic', soforYani: true, aktif: false });
      y.push({ sira: 0, konum: 'sag-dis', soforYani: true, aktif: false });
      // Sıra 1–siraMax: 1+2
      for (let s = 1; s <= siraMax; s++) {
        y.push({ sira: s, konum: 'sol-tek', aktif: false });
        y.push({ sira: s, konum: 'sag-ic', aktif: false });
        y.push({ sira: s, konum: 'sag-dis', aktif: false });
      }
      return y;
    },
  },

  ducato: {
    ad: 'Ducato', ikon: '🚎', aciklama: '1+2 düzen',
    yerlesimUret(siraMax = 7) {
      const y = [];
      // Sıra 0: şoför yanı
      y.push({ sira: 0, konum: 'sol-tek', soforYani: true, aktif: false });
      y.push({ sira: 0, konum: 'sag-ic', soforYani: true, aktif: false });
      y.push({ sira: 0, konum: 'sag-dis', soforYani: true, aktif: false });
      // Sıra 1: sol çift + KAPI (sağ tarafta koltuk yok)
      y.push({ sira: 1, konum: 'sol-dis', kapiSag: true, aktif: false });
      y.push({ sira: 1, konum: 'sol-ic', kapiSag: true, aktif: false });
      // Sıra 2–siraMax: sol çift + sağ tek
      for (let s = 2; s <= siraMax; s++) {
        y.push({ sira: s, konum: 'sol-dis', aktif: false });
        y.push({ sira: s, konum: 'sol-ic', aktif: false });
        y.push({ sira: s, konum: 'sag-dis', aktif: false });
      }
      // Sıra siraMax+1: arka 4'lü
      for (let k = 0; k < 4; k++) y.push({ sira: siraMax + 1, konum: 'arka', aktif: false });
      return y;
    },
  },

  buyuk: {
    ad: 'Büyük Servis', ikon: '🚍', aciklama: '2+2 düzen + arka sıra',
    yerlesimUret(siraMax = 5) {
      const y = [];
      // Sıra 0: şoför yanı
      y.push({ sira: 0, konum: 'sol-dis', soforYani: true, kapiSag: true, aktif: false });
      // Sıra 1–siraMax: 2+2
      for (let s = 1; s <= siraMax; s++) {
        y.push({ sira: s, konum: 'sol-dis', aktif: false });
        y.push({ sira: s, konum: 'sol-ic', aktif: false });
        y.push({ sira: s, konum: 'sag-ic', aktif: false });
        y.push({ sira: s, konum: 'sag-dis', aktif: false });
      }
      // Sıra siraMax+1: sol 2+2 + arka kapı sağda
      y.push({ sira: siraMax + 1, konum: 'sol-dis', kapiSag: true, aktif: false });
      y.push({ sira: siraMax + 1, konum: 'sol-ic', kapiSag: true, aktif: false });
      y.push({ sira: siraMax + 1, konum: 'sag-ic', kapiSag: true, aktif: false });
      y.push({ sira: siraMax + 1, konum: 'sag-dis', kapiSag: true, aktif: false });
      // Sıra siraMax+2: arka 4'lü
      for (let k = 0; k < 4; k++) y.push({ sira: siraMax + 2, konum: 'arka', aktif: false });
      return y;
    },
  },
};

/* ================================================================
   FIRESTORE
   ================================================================ */
function servisOturmaBaglantisiKur() {
  if (!db) return;
  db.collection(COL.servisOturma).onSnapshot(snap => {
    servisOturmaPlani = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const aktifId = document.getElementById('soServisId')?.value;
    if (aktifId) _soRenderArac(aktifId);
    if (document.getElementById('oturmaServislerListesi')) renderOturmaServisler();
  }, err => console.warn('servisOturma:', err));
}

/* ================================================================
   ANA MODAL
   ================================================================ */
function servisOturmaModalAc(servisId) {
  const s = servisler.find(x => x.id === servisId);
  if (!s) return;

  const mevcut        = servisOturmaPlani.find(p => p.servisId === servisId);
  const secilenSablon = mevcut?.sablon || 'minibus';

  const sablonBtnler = Object.entries(SO_SABLONLAR).map(([key, val]) =>
    `<button class="so-sablon-btn${secilenSablon === key ? ' so-sablon-aktif' : ''}"
      onclick="soSablonSec('${key}','${servisId}')" data-sablon="${key}">
      ${val.ikon} ${val.ad}<small>${val.aciklama}</small>
    </button>`).join('');

  const icerik = `
    <div class="so-modal-wrap">
      <div class="so-servis-bilgi">
        🚌 <strong>${escapeHtml(s.servisAdi)}</strong>
        ${s.guzergah ? ` · ${escapeHtml(s.guzergah)}` : ''}
        ${s.plaka ? ` · Plaka: ${escapeHtml(s.plaka)}` : ''}
        ${s.soforAdi ? ` &nbsp;|&nbsp; Şoför: ${escapeHtml(s.soforAdi)}` : ''}
      </div>
      <input type="hidden" id="soServisId" value="${servisId}">
      <input type="hidden" id="soSecilenSablon" value="${secilenSablon}">
      <div class="so-sablon-grup">
        <div class="so-sablon-label">Araç Tipi</div>
        <div class="so-sablon-btnler">${sablonBtnler}</div>
      </div>
      <div class="so-arac-wrap"><div id="soAracSemasi"></div></div>
      <div class="so-alt-panel">
        <div class="so-ozet-kart">
          <div class="so-ozet-baslik">Özet</div>
          <div class="so-ozet-satir"><span class="so-nokta" style="background:#22c55e"></span>Aktif <strong id="soAktifSayisi">0</strong></div>
          <div class="so-ozet-satir"><span class="so-nokta" style="background:#f59e0b"></span>Dolu <strong id="soDoluSayisi">0</strong></div>
          <div class="so-ozet-satir"><span class="so-nokta so-nokta-bos"></span>Boş <strong id="soBosSayisi">0</strong></div>
          <div class="so-ozet-satir"><span class="so-nokta" style="background:#3b82f6"></span>Rezerve <strong id="soRezerveSayisi">0</strong></div>
          <div class="so-ozet-satir" style="border-top:1px solid #e5e7eb;padding-top:6px;margin-top:2px;">Toplam <strong id="soToplamSayisi">0</strong></div>
        </div>
        <div class="so-alt-sag">
          <div class="so-legend">
            <div class="so-legend-satir"><span class="so-koltuk so-k-mini so-dolu"></span>Dolu</div>
            <div class="so-legend-satir"><span class="so-koltuk so-k-mini"></span>+ Boş</div>
            <div class="so-legend-satir"><span class="so-koltuk so-k-mini so-rezerve"></span>Rezerve</div>
          </div>
          <div class="so-alt-butonlar">
            <button class="btn btn-ghost btn-sm" onclick="soTumunuTemizle()">🗑️ Atamaları Temizle</button>
            <button class="btn btn-ghost btn-sm" onclick="raporServisOturmaPlan('${servisId}')">🖨️ Rapor Al</button>
          </div>
        </div>
      </div>
    </div>
    <div id="soKoltukPanel" class="so-koltuk-panel-overlay" style="display:none;">
      <div class="so-koltuk-panel"></div>
    </div>`;

  modalAc(`💺 Oturma Planı — ${escapeHtml(s.servisAdi)}`, icerik, () => soKaydet(servisId));
  setTimeout(() => _soRenderArac(servisId), 60);
}

/* ================================================================
   ŞABLON SEÇ
   ================================================================ */
function soSablonSec(sablon, servisId) {
  const mevcut   = servisOturmaPlani.find(p => p.servisId === servisId);
  const atanmis  = (mevcut?.koltuklar || []).some(k => k.ogrenciId || k.ogrenciAdi || k.rezerve);
  if (atanmis && !confirm('Araç tipi değiştirilirse atamalar sıfırlanacak. Devam?')) return;

  document.getElementById('soSecilenSablon').value = sablon;
  document.querySelectorAll('.so-sablon-btn').forEach(b =>
    b.classList.toggle('so-sablon-aktif', b.dataset.sablon === sablon));

  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon,
    yerlesim: SO_SABLONLAR[sablon].yerlesimUret(),
    koltuklar: [],
    guncellendi: new Date().toISOString(),
  }).catch(err => toast('Hata: ' + err.message));
}

/* ================================================================
   RENDERER
   ================================================================ */
function _soRenderArac(servisId) {
  const hedef = document.getElementById('soAracSemasi');
  if (!hedef) return;

  const sablon    = document.getElementById('soSecilenSablon')?.value || 'minibus';
  const mevcut    = servisOturmaPlani.find(p => p.servisId === servisId);
  const s         = servisler.find(x => x.id === servisId);
  const koltuklar = mevcut?.koltuklar || [];
  const yerlesim  = (mevcut?.yerlesim?.length) ? mevcut.yerlesim : SO_SABLONLAR[sablon].yerlesimUret();

  const siraMap = {};
  yerlesim.forEach((yuva, idx) => {
    const no = idx + 1;
    if (!siraMap[yuva.sira]) siraMap[yuva.sira] = [];
    siraMap[yuva.sira].push({ ...yuva, no, koltuk: koltuklar.find(k => k.no === no) || null });
  });

  const siralar = Object.keys(siraMap).map(Number).sort((a, b) => a - b);

  let html = `<div class="so-arac${sablon === 'buyuk' ? ' so-arac-buyuk' : ''}">`;

  /* ── ÖN CAM & PLAKA ── */
  html += `<div class="so-arac-on">
    <div class="so-on-cam"></div>
    ${s?.plaka ? `<div class="so-plaka">${escapeHtml(s.plaka)}</div>` : ''}
  </div>`;

  html += `<div class="so-koltuk-bolum">`;

  siralar.forEach(siraIdx => {
    const yuvalar = siraMap[siraIdx];
    const arkaVar = yuvalar.some(y => y.konum === 'arka');

    if (arkaVar) {
      html += `<div class="so-sira so-arka-sira">`;
      yuvalar.forEach(y => { html += _soKoltukHtml(y, servisId, sablon, s?.soforAdi); });
      html += `</div>`;
      return;
    }

    const soller = yuvalar.filter(y => ['sol-tek','sol-dis','sol-ic'].includes(y.konum));
    const saglar = yuvalar.filter(y => ['sag-ic','sag-dis','sag-ek'].includes(y.konum));
    const kapiSagVar = yuvalar.some(y => y.kapiSag);

    if (siraIdx === 0) {
      html += `<div class="so-sira so-sofor-sirasi">`;
      /* Şoför koltuğu — ad göster */
      html += `<div class="so-sofor-koltuk">🧑‍✈️<span>${s?.soforAdi || 'Şoför'}</span></div>`;
      html += `<div class="so-koridor"></div>`;
      html += `<div class="so-sag-grup">`;
      saglar.forEach(y => { html += _soKoltukHtml(y, servisId, sablon, s?.soforAdi); });
      html += `</div>`;
      html += `</div>`;
      return;
    }

    html += `<div class="so-sira">`;
    html += `<div class="so-sol-grup">`;
    soller.forEach(y => { html += _soKoltukHtml(y, servisId, sablon, s?.soforAdi); });
    html += `</div>`;

    if (kapiSagVar && saglar.length === 0) {
      html += `<div class="so-koridor"></div>`;
      html += `<div class="so-sag-grup">`;
      html += `<div class="so-kapi-gosterge">│<span>KAPI</span>│</div>`;
      html += `</div>`;
    } else if (kapiSagVar && saglar.length > 0) {
      html += `<div class="so-koridor"></div>`;
      html += `<div class="so-sag-grup">`;
      saglar.forEach(y => { html += _soKoltukHtml(y, servisId, sablon, s?.soforAdi); });
      html += `</div>`;
      html += `<div class="so-kapi-gosterge so-kapi-arka">│<span>KAPI</span>│</div>`;
    } else {
      html += `<div class="so-koridor"></div>`;
      html += `<div class="so-sag-grup">`;
      saglar.forEach(y => { html += _soKoltukHtml(y, servisId, sablon, s?.soforAdi); });
      html += `</div>`;
    }

    html += `</div>`;
  });

  html += `</div>`;
  html += `<div class="so-arac-arka"></div>`;
  html += `</div>`;

  hedef.innerHTML = html;
  _soOzetGuncelle(yerlesim, koltuklar);
}

/* ================================================================
   KOLTUK & PLACEHOLDER HTML
   ================================================================ */
function _soKoltukHtml(yuva, servisId, sablon, soforAdi) {
  const { no, konum, koltuk, aktif } = yuva;
  const dolu    = koltuk && (koltuk.ogrenciId || koltuk.ogrenciAdi);
  const rezerve = koltuk && koltuk.rezerve && !dolu;
  const ad      = dolu ? (koltuk.ogrenciAdi || '') : '';
  const kisa    = ad.length > 10 ? ad.substring(0, 9) + '…' : ad;

  let cls = 'so-koltuk';
  if (dolu)    cls += ' so-dolu';
  if (rezerve) cls += ' so-rezerve';
  if (!aktif)  cls += ' so-placeholder';
  if (konum === 'sol-dis' || konum === 'sol-tek') cls += ' so-kolcak-sol';
  if (konum === 'sag-dis')                        cls += ' so-kolcak-sag';

  const title = dolu ? `${no}. Koltuk — ${ad}` : rezerve ? `${no}. Koltuk — Rezerve` : `${no}. Koltuk`;

  return `<div class="${cls}" onclick="soKoltukTikla(${no},'${servisId}','${sablon}')" title="${escapeHtml(title)}">
    ${!aktif ? '+' : kisa ? `<span class="so-k-ad">${escapeHtml(kisa)}</span>` : ''}
  </div>`;
}

/* ================================================================
   KOLTUK TIKLA — INLINE PANEL
   ================================================================ */
function soKoltukTikla(koltukNo, servisId, sablon) {
  const mevcut    = servisOturmaPlani.find(p => p.servisId === servisId);
  const koltuklar = mevcut?.koltuklar || [];
  const koltuk    = koltuklar.find(k => k.no === koltukNo) || {};
  const yerlesim  = mevcut?.yerlesim || [];
  const yuva      = yerlesim.find(y => y.no === undefined) ? null : 
                    [...yerlesim].reverse().find((y, i) => (yerlesim.length - i) === koltukNo);

  const sb = sablon || mevcut?.sablon || 'minibus';
  const ogrs = veliler
    .filter(v => v.servisId === servisId)
    .sort((a, b) => (a.ogrenciAdi || '').localeCompare(b.ogrenciAdi || '', 'tr'));

  const secenekler = ogrs.map(v => {
    const atanmis = koltuklar.some(k => k.ogrenciId === v.id && k.no !== koltukNo);
    const sn      = siniflar.find(s => s.id === v.sinifId);
    return `<option value="${v.id}" ${koltuk.ogrenciId === v.id ? 'selected' : ''} ${atanmis ? 'disabled' : ''}>
      ${escapeHtml(v.ogrenciAdi || '')}${sn ? ' — ' + sn.ad : ''}${atanmis ? ' (atanmış)' : ''}
    </option>`;
  }).join('');

  const body = `
    <p class="so-koltuk-baslik"><strong>${koltukNo}. Koltuk</strong></p>
    <div class="form-group">
      <label>Öğrenci</label>
      <select id="soOgrenciSec">
        <option value="">— Boş bırak —</option>
        ${secenekler}
      </select>
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
        <input type="checkbox" id="soRezerveCheck" ${koltuk.rezerve && !koltuk.ogrenciId ? 'checked' : ''}>
        Rezerve olarak işaretle
      </label>
    </div>
    ${!ogrs.length ? `<p class="so-uyari" style="margin-top:8px;">⚠️ Bu serviste kayıtlı öğrenci bulunamadı.</p>` : ''}`;

  const panelEl = document.getElementById('soKoltukPanel');
  if (!panelEl) return;

  panelEl.innerHTML = `<div class="so-koltuk-panel">${body}</div>`;
  panelEl.style.display = 'flex';

  const kaydetchecks = () => {
    const ogrenciId = document.getElementById('soOgrenciSec')?.value;
    const rezerve   = document.getElementById('soRezerveCheck')?.checked && !ogrenciId;
    soKoltukGuncelle(servisId, koltukNo, ogrenciId || null, rezerve, sb);
    panelEl.style.display = 'none';
  };

  const vazgecFn = () => {
    panelEl.style.display = 'none';
  };

  panelEl.onmousedown = (e) => {
    if (e.target === panelEl) vazgecFn();
  };

  const btnDiv = document.createElement('div');
  btnDiv.className = 'so-koltuk-panel-butonlar';
  btnDiv.innerHTML = `
    <button class="btn btn-primary btn-sm" onclick="soKoltukTiklaSonlandır()">✓ Kaydet</button>
    <button class="btn btn-ghost btn-sm" onclick="soKoltukTiklaVazgec()">✕ Vazgeç</button>`;
  
  const panelDiv = panelEl.querySelector('.so-koltuk-panel');
  if (panelDiv && !panelDiv.querySelector('.so-koltuk-panel-butonlar')) {
    panelDiv.appendChild(btnDiv);
  }

  window.soKoltukTiklaSonlandır = kaydetchecks;
  window.soKoltukTiklaVazgec = vazgecFn;
}

/* ================================================================
   KOLTUK GÜNCELLE (aktif: true yapıyor)
   ================================================================ */
function soKoltukGuncelle(servisId, koltukNo, ogrenciId, rezerve, sablon) {
  const mevcut    = servisOturmaPlani.find(p => p.servisId === servisId);
  const sb        = sablon || mevcut?.sablon || 'minibus';
  let yerlesim    = mevcut?.yerlesim ? [...mevcut.yerlesim] : SO_SABLONLAR[sb].yerlesimUret();
  let koltuklar   = mevcut ? [...(mevcut.koltuklar || [])] : [];
  const v         = ogrenciId ? veliler.find(x => x.id === ogrenciId) : null;

  /* aktif: true yap */
  const yuvaBulundu = false;
  for (let i = 0; i < yerlesim.length; i++) {
    if (yerlesim[i].no === undefined) {
      const idx = yerlesim.filter((y, j) => j <= i && (y.no === undefined || !y.no)).findIndex(y => !yuvaBulundu);
      if (idx !== -1 && Math.max(...yerlesim.filter((y, j) => j <= i).map((y, j) => j)) === i) {
        yerlesim[i].aktif = true;
        break;
      }
    }
  }
  
  /* Basit çözüm: sıfırla ve indexle */
  yerlesim = yerlesim.map((y, idx) => {
    if ((idx + 1) === koltukNo) {
      return { ...y, no: koltukNo, aktif: !!(ogrenciId || rezerve) };
    }
    return y;
  });

  const yeni = { no: koltukNo, ogrenciId: ogrenciId || null, ogrenciAdi: v?.ogrenciAdi || '', rezerve };
  const idx  = koltuklar.findIndex(k => k.no === koltukNo);
  if (idx >= 0) koltuklar[idx] = yeni; else koltuklar.push(yeni);

  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon: sb, yerlesim, koltuklar,
    guncellendi: new Date().toISOString(),
  }, { merge: false }).catch(err => toast('Hata: ' + err.message));
}

/* ================================================================
   ÖZET
   ================================================================ */
function _soOzetGuncelle(yerlesim, koltuklar) {
  const aktif   = yerlesim.filter(y => y.aktif).length;
  const dolu    = koltuklar.filter(k => k.ogrenciId || k.ogrenciAdi).length;
  const rezerve = koltuklar.filter(k => k.rezerve && !(k.ogrenciId || k.ogrenciAdi)).length;
  const bos     = Math.max(0, aktif - dolu - rezerve);
  const toplam  = yerlesim.length;
  
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el('soAktifSayisi', aktif); el('soDoluSayisi', dolu);
  el('soBosSayisi', bos); el('soRezerveSayisi', rezerve); el('soToplamSayisi', toplam);
}

/* ================================================================
   KAYDET / TEMİZLE
   ================================================================ */
function soKaydet(servisId) {
  const sablon = document.getElementById('soSecilenSablon')?.value || 'minibus';
  const mevcut = servisOturmaPlani.find(p => p.servisId === servisId);
  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon,
    yerlesim:  mevcut?.yerlesim  || SO_SABLONLAR[sablon].yerlesimUret(),
    koltuklar: mevcut?.koltuklar || [],
    guncellendi: new Date().toISOString(),
  }, { merge: true })
    .then(() => toast('Oturma planı kaydedildi.'))
    .catch(err => toast('Hata: ' + err.message));
}

function soTumunuTemizle() {
  const servisId = document.getElementById('soServisId')?.value;
  if (!servisId) return;
  if (!confirm('Tüm öğrenci atamaları silinecek. Emin misiniz?')) return;
  db.collection(COL.servisOturma).doc(servisId)
    .update({ koltuklar: [], guncellendi: new Date().toISOString() })
    .then(() => toast('Atamalar temizlendi.'))
    .catch(err => toast('Hata: ' + err.message));
}

/* ================================================================
   SEKME & LİSTE
   ================================================================ */
function tasimaAltSekmeSec(sekme) {
  document.querySelectorAll('[data-tasima-sekme]').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-tasima-sekme') === sekme));
  const d1 = document.getElementById('tasima-bolum-servisler');
  const d2 = document.getElementById('tasima-bolum-oturma');
  if (d1) d1.style.display = sekme === 'servisler' ? '' : 'none';
  if (d2) d2.style.display = sekme === 'oturma'    ? '' : 'none';
  if (sekme === 'oturma') renderOturmaServisler();
}

function renderOturmaServisler() {
  const hedef = document.getElementById('oturmaServislerListesi');
  if (!hedef) return;
  const liste = [...servisler].sort((a, b) => (a.servisAdi || '').localeCompare(b.servisAdi || '', 'tr'));
  if (!liste.length) { hedef.innerHTML = '<div class="empty-state">Henüz servis eklenmedi.</div>'; return; }

  hedef.innerHTML = liste.map(s => {
    const plan      = servisOturmaPlani.find(p => p.servisId === s.id);
    const sablonObj = plan?.sablon ? SO_SABLONLAR[plan.sablon] : null;
    const aktif     = plan?.yerlesim?.filter(y => y.aktif).length || 0;
    const dolu      = (plan?.koltuklar || []).filter(k => k.ogrenciId || k.ogrenciAdi).length;
    const rezerve   = (plan?.koltuklar || []).filter(k => k.rezerve && !(k.ogrenciId || k.ogrenciAdi)).length;
    const bos       = Math.max(0, aktif - dolu - rezerve);
    return `<div class="oturma-servis-kart" onclick="servisOturmaModalAc('${s.id}')">
      <div style="flex:1;">
        <strong>${escapeHtml(s.servisAdi || 'Servis')}</strong>
        <span class="badge badge-${s.durum === 'Pasif' ? 'gray' : 'sage'}" style="margin-left:6px;">${escapeHtml(s.durum || 'Aktif')}</span>
        ${sablonObj ? `<span style="margin-left:6px;font-size:12px;color:#6b7280;">${sablonObj.ikon} ${sablonObj.ad}</span>` : ''}
        <div class="oturma-servis-ozet">
          ${s.guzergah ? escapeHtml(s.guzergah) + ' · ' : ''}
          ${plan ? `${aktif} aktif · 🟢 ${dolu} dolu · ⬜ ${bos} boş · 🔵 ${rezerve} rezerve` : 'Oturma planı henüz oluşturulmadı'}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();servisOturmaModalAc('${s.id}')">
        💺 ${plan ? 'Düzenle' : 'Oluştur'}
      </button>
    </div>`;
  }).join('');
}

/* ================================================================
   RAPOR — AKTİF OLANLAR GÖSTER (TABLO YOK)
   ================================================================ */
function soRaporGovdeHtml(servis, plan) {
  if (!plan || !plan.yerlesim || !plan.yerlesim.length) return '';

  const yerlesim  = plan.yerlesim.filter(y => y.aktif); // Sadece aktif olanlar
  const koltuklar = plan.koltuklar || [];
  const sablon    = plan.sablon || 'minibus';
  const bugun     = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

  const koltukMap = {};
  koltuklar.forEach(k => { koltukMap[k.no] = k; });

  const siraMap = {};
  yerlesim.forEach((yuva, idx) => {
    const no = idx + 1;
    if (!siraMap[yuva.sira]) siraMap[yuva.sira] = [];
    siraMap[yuva.sira].push({ ...yuva, no, koltuk: koltukMap[no] || null });
  });

  const koltukKutu = (yuva) => {
    const { no, konum, koltuk } = yuva;
    const dolu    = koltuk && (koltuk.ogrenciId || koltuk.ogrenciAdi);
    const rezerve = koltuk && koltuk.rezerve && !dolu;
    const ad      = dolu ? (koltuk.ogrenciAdi || '') : '';
    let kolcak = '';
    if (konum === 'sol-dis' || konum === 'sol-tek') kolcak = 'so-rapor-kolcak-sol';
    if (konum === 'sag-dis')                        kolcak = 'so-rapor-kolcak-sag';
    const cls = `so-rapor-koltuk ${dolu ? 'so-rapor-dolu' : rezerve ? 'so-rapor-rezerve' : 'so-rapor-bos'} ${kolcak}`;
    return `<div class="${cls}">
      ${ad ? `<span class="so-rapor-ad">${escapeHtml(ad)}</span>` : ''}
    </div>`;
  };

  const siralar = Object.keys(siraMap).map(Number).sort((a, b) => a - b);
  let html = `<div class="so-rapor-baslik">
    🚌 ${escapeHtml(servis.servisAdi || '')} · ${servis.plaka ? 'Plaka: ' + escapeHtml(servis.plaka) + ' · ' : ''}Şoför: ${escapeHtml(servis.soforAdi || '—')} · ${bugun}
  </div><div class="so-rapor-arac${sablon === 'buyuk' ? ' so-rapor-arac-buyuk' : ''}">`;

  html += `<div class="so-rapor-on"><div class="so-rapor-cam"></div></div>`;

  siralar.forEach(siraIdx => {
    const yuvalar = siraMap[siraIdx];
    const arkaVar = yuvalar.some(y => y.konum === 'arka');

    if (arkaVar) {
      html += `<div class="so-rapor-sira so-rapor-arka">`;
      yuvalar.forEach(y => { html += koltukKutu(y); });
      html += `</div>`;
      return;
    }

    const soller    = yuvalar.filter(y => ['sol-tek','sol-dis','sol-ic'].includes(y.konum));
    const saglar    = yuvalar.filter(y => y.konum.startsWith('sag'));
    const kapiSagVar = yuvalar.some(y => y.kapiSag);

    if (siraIdx === 0) {
      html += `<div class="so-rapor-sira so-rapor-sofor-sirasi">`;
      html += `<div class="so-rapor-sofor">🧑‍✈️<br><small>${escapeHtml(servis.soforAdi || 'Şoför')}</small></div>`;
      html += `<div class="so-rapor-koridor"></div>`;
      html += `<div class="so-rapor-grup">`;
      saglar.forEach(y => { html += koltukKutu(y); });
      html += `</div></div>`;
      return;
    }

    html += `<div class="so-rapor-sira">`;
    html += `<div class="so-rapor-grup">`; soller.forEach(y => { html += koltukKutu(y); }); html += `</div>`;
    html += `<div class="so-rapor-koridor"></div>`;
    html += `<div class="so-rapor-grup">`; saglar.forEach(y => { html += koltukKutu(y); }); html += `</div>`;
    if (kapiSagVar) html += `<div class="so-rapor-kapi so-rapor-kapi-arka">│KAPI│</div>`;
    html += `</div>`;
  });

  html += `</div>`;
  return html;
}

let servisOturmaPlani = [];

/* ================================================================
   ŞABLON TANIMLARI
   ================================================================ */
const SO_SABLONLAR = {

  minibus: {
    ad: 'Minibüs', ikon: '🚐', aciklama: '1+2 düzen',
    yerlesimUret(siraMax = 5) {
      const y = [];
      // Sıra 0: şoför yanı — başlangıç: sol 1, sağ 2
      y.push({ sira: 0, konum: 'sol-tek', soforYani: true });
      y.push({ sira: 0, konum: 'sag-ic', soforYani: true });
      y.push({ sira: 0, konum: 'sag-dis', soforYani: true });
      // Sıra 1–siraMax: 1+2
      for (let s = 1; s <= siraMax; s++) {
        y.push({ sira: s, konum: 'sol-tek' });
        y.push({ sira: s, konum: 'sag-ic'  });
        y.push({ sira: s, konum: 'sag-dis' });
      }
      return y;
    },
  },

  ducato: {
    ad: 'Ducato', ikon: '🚎', aciklama: '1+2 düzen',
    yerlesimUret(siraMax = 7) {
      const y = [];
      // Sıra 0: şoför yanı — şoför(sol-tek) + sağda 2 koltuk
      y.push({ sira: 0, konum: 'sol-tek', soforYani: true });
      y.push({ sira: 0, konum: 'sag-ic',  soforYani: true });
      y.push({ sira: 0, konum: 'sag-dis', soforYani: true });
      // Sıra 1: sol çift + KAPI (sağ tarafta koltuk yok)
      y.push({ sira: 1, konum: 'sol-dis', kapiSag: true });
      y.push({ sira: 1, konum: 'sol-ic',  kapiSag: true });
      // Sıra 2–siraMax: sol çift + sağ tek
      for (let s = 2; s <= siraMax; s++) {
        y.push({ sira: s, konum: 'sol-dis' });
        y.push({ sira: s, konum: 'sol-ic'  });
        y.push({ sira: s, konum: 'sag-dis' });
      }
      // Sıra siraMax+1: arka 4'lü
      for (let k = 0; k < 4; k++) y.push({ sira: siraMax + 1, konum: 'arka' });
      return y;
    },
  },

  buyuk: {
    ad: 'Büyük Servis', ikon: '🚍', aciklama: '2+2 düzen + arka sıra',
    yerlesimUret(siraMax = 5) {
      const y = [];
      // Sıra 0: şoför yanı — şoför(sol-dis) + giriş kapısı sağda
      y.push({ sira: 0, konum: 'sol-dis', soforYani: true, kapiSag: true });
      // Sıra 1–siraMax: 2+2
      for (let s = 1; s <= siraMax; s++) {
        y.push({ sira: s, konum: 'sol-dis' });
        y.push({ sira: s, konum: 'sol-ic'  });
        y.push({ sira: s, konum: 'sag-ic'  });
        y.push({ sira: s, konum: 'sag-dis' });
      }
      // Sıra siraMax+1: sol 2+2 + arka kapı sağda
      y.push({ sira: siraMax + 1, konum: 'sol-dis', kapiSag: true });
      y.push({ sira: siraMax + 1, konum: 'sol-ic',  kapiSag: true });
      y.push({ sira: siraMax + 1, konum: 'sag-ic',  kapiSag: true });
      y.push({ sira: siraMax + 1, konum: 'sag-dis', kapiSag: true });
      // Sıra siraMax+2: arka 4'lü
      for (let k = 0; k < 4; k++) y.push({ sira: siraMax + 2, konum: 'arka' });
      return y;
    },
  },
};

/* ================================================================
   FIRESTORE
   ================================================================ */
function servisOturmaBaglantisiKur() {
  if (!db) return;
  db.collection(COL.servisOturma).onSnapshot(snap => {
    servisOturmaPlani = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const aktifId = document.getElementById('soServisId')?.value;
    if (aktifId) _soRenderArac(aktifId);
    if (document.getElementById('oturmaServislerListesi')) renderOturmaServisler();
  }, err => console.warn('servisOturma:', err));
}

/* ================================================================
   ANA MODAL
   ================================================================ */
function servisOturmaModalAc(servisId) {
  const s = servisler.find(x => x.id === servisId);
  if (!s) return;

  const mevcut        = servisOturmaPlani.find(p => p.servisId === servisId);
  const secilenSablon = mevcut?.sablon || 'minibus';

  const sablonBtnler = Object.entries(SO_SABLONLAR).map(([key, val]) =>
    `<button class="so-sablon-btn${secilenSablon === key ? ' so-sablon-aktif' : ''}"
      onclick="soSablonSec('${key}','${servisId}')" data-sablon="${key}">
      ${val.ikon} ${val.ad}<small>${val.aciklama}</small>
    </button>`).join('');

  const icerik = `
    <div class="so-modal-wrap">
      <div class="so-servis-bilgi">
        🚌 <strong>${escapeHtml(s.servisAdi)}</strong>
        ${s.guzergah ? ` · ${escapeHtml(s.guzergah)}` : ''}
        ${s.soforAdi ? ` &nbsp;|&nbsp; Şoför: ${escapeHtml(s.soforAdi)}` : ''}
      </div>
      <input type="hidden" id="soServisId" value="${servisId}">
      <input type="hidden" id="soSecilenSablon" value="${secilenSablon}">
      <div class="so-sablon-grup">
        <div class="so-sablon-label">Araç Tipi</div>
        <div class="so-sablon-btnler">${sablonBtnler}</div>
      </div>
      <div class="so-arac-wrap"><div id="soAracSemasi"></div></div>
      <div class="so-alt-panel">
        <div class="so-ozet-kart">
          <div class="so-ozet-baslik">Özet</div>
          <div class="so-ozet-satir"><span class="so-nokta" style="background:#22c55e"></span>Dolu <strong id="soDoluSayisi">0</strong></div>
          <div class="so-ozet-satir"><span class="so-nokta so-nokta-bos"></span>Boş <strong id="soBosSayisi">0</strong></div>
          <div class="so-ozet-satir"><span class="so-nokta" style="background:#3b82f6"></span>Rezerve <strong id="soRezerveSayisi">0</strong></div>
          <div class="so-ozet-satir" style="border-top:1px solid #e5e7eb;padding-top:6px;margin-top:2px;">Toplam <strong id="soToplamSayisi">0</strong></div>
        </div>
        <div class="so-alt-sag">
          <div class="so-legend">
            <div class="so-legend-satir"><span class="so-koltuk so-k-mini so-dolu"></span>Dolu</div>
            <div class="so-legend-satir"><span class="so-koltuk so-k-mini"></span>Boş</div>
            <div class="so-legend-satir"><span class="so-koltuk so-k-mini so-rezerve"></span>Rezerve</div>
          </div>
          <div class="so-alt-butonlar">
            <button class="btn btn-ghost btn-sm" onclick="soTumunuTemizle()">🗑️ Atamaları Temizle</button>
            <button class="btn btn-ghost btn-sm" onclick="raporServisOturmaPlan('${servisId}')">🖨️ Rapor Al</button>
          </div>
        </div>
      </div>
    </div>
    <div id="soKoltukPanel" class="so-koltuk-panel-overlay" style="display:none;">
      <div class="so-koltuk-panel"></div>
    </div>`;

  modalAc(`💺 Oturma Planı — ${escapeHtml(s.servisAdi)}`, icerik, () => soKaydet(servisId));
  setTimeout(() => _soRenderArac(servisId), 60);
}

/* ================================================================
   ŞABLON SEÇ
   ================================================================ */
function soSablonSec(sablon, servisId) {
  const mevcut   = servisOturmaPlani.find(p => p.servisId === servisId);
  const atamavar = (mevcut?.koltuklar || []).some(k => k.ogrenciId || k.ogrenciAdi || k.rezerve);
  if (atamavar && !confirm('Araç tipi değiştirilirse atamalar sıfırlanacak. Devam?')) return;

  document.getElementById('soSecilenSablon').value = sablon;
  document.querySelectorAll('.so-sablon-btn').forEach(b =>
    b.classList.toggle('so-sablon-aktif', b.dataset.sablon === sablon));

  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon,
    yerlesim: SO_SABLONLAR[sablon].yerlesimUret(),
    koltuklar: [],
    guncellendi: new Date().toISOString(),
  }).catch(err => toast('Hata: ' + err.message));
}

/* ================================================================
   RENDERER
   ================================================================ */
function _soRenderArac(servisId) {
  const hedef = document.getElementById('soAracSemasi');
  if (!hedef) return;

  const sablon    = document.getElementById('soSecilenSablon')?.value || 'minibus';
  const sablonObj = SO_SABLONLAR[sablon];
  if (!sablonObj) return;

  const mevcut    = servisOturmaPlani.find(p => p.servisId === servisId);
  const koltuklar = mevcut?.koltuklar || [];
  const yerlesim  = (mevcut?.yerlesim?.length) ? mevcut.yerlesim : sablonObj.yerlesimUret();
  const buyuk     = sablon === 'buyuk';
  const ducato    = sablon === 'ducato';
  const minibus   = sablon === 'minibus';

  /* Sıralara göre grupla */
  const siraMap = {};
  yerlesim.forEach((yuva, idx) => {
    const sira = yuva.sira;
    if (!siraMap[sira]) siraMap[sira] = [];
    siraMap[sira].push({ ...yuva, no: idx + 1, koltuk: koltuklar.find(k => k.no === idx + 1) || null });
  });

  const siralar = Object.keys(siraMap).map(Number).sort((a, b) => a - b);
  const maxSira = Math.max(...siralar);

  let html = `<div class="so-arac${buyuk ? ' so-arac-buyuk' : ''}">`;

  /* ── ÖN CAM — ortalı üst bant ── */
  html += `<div class="so-arac-on"><div class="so-on-cam"></div></div>`;

  html += `<div class="so-koltuk-bolum">`;

  siralar.forEach(siraIdx => {
    const yuvalar = siraMap[siraIdx];
    const arkaVar = yuvalar.some(y => y.konum === 'arka');

    /* ── ARKA SIRA ── */
    if (arkaVar) {
      html += `<div class="so-sira so-arka-sira">`;
      yuvalar.forEach(y => { html += _soKoltukHtml(y, servisId, sablon); });
      html += `</div>`;
      return;
    }

    /* ── Yuvayı sol/sağ ayır ── */
    const soller = yuvalar.filter(y => ['sol-tek','sol-dis','sol-ic'].includes(y.konum));
    const saglar = yuvalar.filter(y => ['sag-ic','sag-dis','sag-ek'].includes(y.konum));

    /* Kapı işareti */
    const kapiSagVar = yuvalar.some(y => y.kapiSag);

    /* ── ŞOFÖR SIRASI (sıra 0) ── */
    if (siraIdx === 0) {
      html += `<div class="so-sira so-sofor-sirasi">`;
      html += `<div class="so-sofor-koltuk">🧑‍✈️<span>Şoför</span></div>`;

      if (sablon === 'buyuk') {
        html += `<div class="so-koridor"></div>`;
        html += `<div class="so-sag-grup">`;
        saglar.forEach(y => { html += _soKoltukHtml(y, servisId, sablon); });
        if (kapiSagVar && saglar.length === 0) {
          html += `<div class="so-kapi-gosterge">│<span>GİRİŞ</span>│</div>`;
        }
        html += `</div>`;
      } else {
        html += `<div class="so-koridor"></div>`;
        html += `<div class="so-sag-grup">`;
        saglar.forEach(y => { html += _soKoltukHtml(y, servisId, sablon); });
        html += `</div>`;
      }

      html += `</div>`;
      return;
    }

    /* ── NORMAL SIRALAR ── */
    html += `<div class="so-sira">`;

    /* Sol grup */
    html += `<div class="so-sol-grup">`;
    soller.forEach(y => { html += _soKoltukHtml(y, servisId, sablon); });
    html += `</div>`;

    /* Sağ taraf */
    if (kapiSagVar && saglar.length === 0) {
      html += `<div class="so-koridor"></div>`;
      html += `<div class="so-sag-grup">`;
      html += `<div class="so-kapi-gosterge">│<span>KAPI</span>│</div>`;
      html += `</div>`;
    } else if (kapiSagVar && saglar.length > 0) {
      html += `<div class="so-koridor"></div>`;
      html += `<div class="so-sag-grup">`;
      saglar.forEach(y => { html += _soKoltukHtml(y, servisId, sablon); });
      html += `</div>`;
      html += `<div class="so-kapi-gosterge so-kapi-arka">│<span>KAPI</span>│</div>`;
    } else {
      html += `<div class="so-koridor"></div>`;
      html += `<div class="so-sag-grup">`;
      saglar.forEach(y => { html += _soKoltukHtml(y, servisId, sablon); });
      html += `</div>`;
    }

    html += `</div>`;
  });

  html += `</div>`;
  html += `<div class="so-arac-arka"></div>`;
  html += `</div>`;

  hedef.innerHTML = html;
  _soOzetGuncelle(koltuklar, yerlesim.length);

  /* Sıra ekleme butonu */
  const soAracWrap = document.querySelector('.so-arac-wrap');
  if (soAracWrap) {
    const ekleDiv = document.createElement('div');
    ekleDiv.className = 'so-sira-ekle-ana';
    ekleDiv.innerHTML = `<button class="btn btn-ghost btn-sm" onclick="soSiraEkle('${servisId}','${sablon}')">➕ Sıra Ekle</button>`;
    soAracWrap.appendChild(ekleDiv);
  }
}

/* ================================================================
   SIRA EKLE (Alta satır ekleme)
   ================================================================ */
function soSiraEkle(servisId, sablon) {
  const mevcut   = servisOturmaPlani.find(p => p.servisId === servisId);
  const sb       = sablon || mevcut?.sablon || 'minibus';
  const yerlesim = mevcut?.yerlesim ? [...mevcut.yerlesim] : SO_SABLONLAR[sb].yerlesimUret();
  
  const maxSira = Math.max(...yerlesim.map(y => y.sira), 0);
  const yeniSira = maxSira + 1;

  /* Yeni sıra için koltuklar oluştur */
  if (sb === 'minibus') {
    yerlesim.push({ sira: yeniSira, konum: 'sol-tek' });
    yerlesim.push({ sira: yeniSira, konum: 'sag-ic' });
    yerlesim.push({ sira: yeniSira, konum: 'sag-dis' });
  } else if (sb === 'ducato') {
    yerlesim.push({ sira: yeniSira, konum: 'sol-dis' });
    yerlesim.push({ sira: yeniSira, konum: 'sol-ic' });
    yerlesim.push({ sira: yeniSira, konum: 'sag-dis' });
  } else if (sb === 'buyuk') {
    yerlesim.push({ sira: yeniSira, konum: 'sol-dis' });
    yerlesim.push({ sira: yeniSira, konum: 'sol-ic' });
    yerlesim.push({ sira: yeniSira, konum: 'sag-ic' });
    yerlesim.push({ sira: yeniSira, konum: 'sag-dis' });
  }

  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon: sb, yerlesim,
    koltuklar: mevcut?.koltuklar || [],
    guncellendi: new Date().toISOString(),
  }, { merge: false })
    .then(() => toast('Sıra eklendi.'))
    .catch(err => toast('Hata: ' + err.message));
}

/* ================================================================
   KOLTUK & PLACEHOLDER HTML
   ================================================================ */
function _soKoltukHtml(yuva, servisId, sablon) {
  const { no, konum, koltuk } = yuva;
  const dolu    = koltuk && (koltuk.ogrenciId || koltuk.ogrenciAdi);
  const rezerve = koltuk && koltuk.rezerve && !dolu;
  const ad      = dolu ? (koltuk.ogrenciAdi || '') : '';
  const kisa    = ad.length > 8 ? ad.substring(0, 7) + '…' : ad;

  let cls = 'so-koltuk';
  if (dolu)    cls += ' so-dolu';
  if (rezerve) cls += ' so-rezerve';
  if (konum === 'sol-dis' || konum === 'sol-tek') cls += ' so-kolcak-sol';
  if (konum === 'sag-dis')                        cls += ' so-kolcak-sag';

  const title = dolu ? `${no}. Koltuk — ${ad}` : rezerve ? `${no}. Koltuk — Rezerve` : `${no}. Koltuk`;

  return `<div class="${cls}" onclick="soKoltukTikla(${no},'${servisId}','${sablon}')" title="${escapeHtml(title)}">
    ${kisa ? `<span class="so-k-ad">${escapeHtml(kisa)}</span>` : ''}
  </div>`;
}

/* ================================================================
   KOLTUK TIKLA — INLINE PANEL AÇAR (MODAL DEĞİL)
   ================================================================ */
function soKoltukTikla(koltukNo, servisId, sablon) {
  const mevcut    = servisOturmaPlani.find(p => p.servisId === servisId);
  const koltuklar = mevcut?.koltuklar || [];
  const koltuk    = koltuklar.find(k => k.no === koltukNo) || {};
  const sb        = sablon || mevcut?.sablon || 'minibus';

  const ogrs = veliler
    .filter(v => v.servisId === servisId)
    .sort((a, b) => (a.ogrenciAdi || '').localeCompare(b.ogrenciAdi || '', 'tr'));

  const secenekler = ogrs.map(v => {
    const atanmis = koltuklar.some(k => k.ogrenciId === v.id && k.no !== koltukNo);
    const sn      = siniflar.find(s => s.id === v.sinifId);
    return `<option value="${v.id}" ${koltuk.ogrenciId === v.id ? 'selected' : ''} ${atanmis ? 'disabled' : ''}>
      ${escapeHtml(v.ogrenciAdi || '')}${sn ? ' — ' + sn.ad : ''}${atanmis ? ' (atanmış)' : ''}
    </option>`;
  }).join('');

  const body = `
    <p class="so-koltuk-baslik"><strong>${koltukNo}. Koltuk</strong></p>
    <div class="form-group">
      <label>Öğrenci</label>
      <select id="soOgrenciSec">
        <option value="">— Boş bırak —</option>
        ${secenekler}
      </select>
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
        <input type="checkbox" id="soRezerveCheck" ${koltuk.rezerve && !koltuk.ogrenciId ? 'checked' : ''}>
        Rezerve olarak işaretle
      </label>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:10px 0 8px;">
    <div class="so-koltuk-butonlar">
      <button class="btn btn-danger btn-sm" onclick="soKoltukSil(${koltukNo},'${servisId}','${sb}')">
        🗑️ Bu Koltuğu Kaldır
      </button>
    </div>
    ${!ogrs.length ? `<p class="so-uyari" style="margin-top:8px;">⚠️ Bu serviste kayıtlı öğrenci bulunamadı.</p>` : ''}`;

  const panelEl = document.getElementById('soKoltukPanel');
  if (!panelEl) return;

  panelEl.innerHTML = `<div class="so-koltuk-panel">${body}</div>`;
  panelEl.style.display = 'flex';

  /* Kaydet */
  const kaydetchecks = () => {
    const ogrenciId = document.getElementById('soOgrenciSec')?.value;
    const rezerve   = document.getElementById('soRezerveCheck')?.checked && !ogrenciId;
    soKoltukGuncelle(servisId, koltukNo, ogrenciId || null, rezerve, sb);
    panelEl.style.display = 'none';
  };

  /* Vazgeç */
  const vazgecFn = () => {
    panelEl.style.display = 'none';
  };

  /* Panele event listeners ekle */
  const kaydetBtn = panelEl.querySelector('.so-koltuk-panel');
  if (kaydetBtn) {
    kaydetBtn.onkeydown = (e) => { if (e.key === 'Enter') kaydetchecks(); };
  }

  /* Dışına tıklanırsa kapat */
  panelEl.onmousedown = (e) => {
    if (e.target === panelEl) vazgecFn();
  };

  /* Kaydet & Vazgeç butonları ekle */
  const btnDiv = document.createElement('div');
  btnDiv.className = 'so-koltuk-panel-butonlar';
  btnDiv.innerHTML = `
    <button class="btn btn-primary btn-sm" onclick="soKoltukTiklaSonlandır()">✓ Kaydet</button>
    <button class="btn btn-ghost btn-sm" onclick="soKoltukTiklaVazgec()">✕ Vazgeç</button>`;
  
  const panelDiv = panelEl.querySelector('.so-koltuk-panel');
  if (panelDiv && !panelDiv.querySelector('.so-koltuk-panel-butonlar')) {
    panelDiv.appendChild(btnDiv);
  }

  window.soKoltukTiklaSonlandır = kaydetchecks;
  window.soKoltukTiklaVazgec = vazgecFn;
}

/* ================================================================
   KOLTUK GÜNCELLE
   ================================================================ */
function soKoltukGuncelle(servisId, koltukNo, ogrenciId, rezerve, sablon) {
  const mevcut    = servisOturmaPlani.find(p => p.servisId === servisId);
  const koltuklar = mevcut ? [...(mevcut.koltuklar || [])] : [];
  const sb        = sablon || mevcut?.sablon || 'minibus';
  const v         = ogrenciId ? veliler.find(x => x.id === ogrenciId) : null;

  const yeni = { no: koltukNo, ogrenciId: ogrenciId || null, ogrenciAdi: v?.ogrenciAdi || '', rezerve };
  const idx  = koltuklar.findIndex(k => k.no === koltukNo);
  if (idx >= 0) koltuklar[idx] = yeni; else koltuklar.push(yeni);

  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon: sb,
    yerlesim:  mevcut?.yerlesim || SO_SABLONLAR[sb].yerlesimUret(),
    koltuklar,
    guncellendi: new Date().toISOString(),
  }, { merge: false }).catch(err => toast('Hata: ' + err.message));
}

/* ================================================================
   KOLTUK SİL
   ================================================================ */
function soKoltukSil(koltukNo, servisId, sablon) {
  if (!confirm(`${koltukNo}. koltuk kaldırılacak. Emin misiniz?`)) return;

  const mevcut    = servisOturmaPlani.find(p => p.servisId === servisId);
  const sb        = sablon || mevcut?.sablon || 'minibus';
  let yerlesim    = mevcut?.yerlesim ? [...mevcut.yerlesim] : SO_SABLONLAR[sb].yerlesimUret();
  let koltuklar   = (mevcut?.koltuklar || []).filter(k => k.no !== koltukNo);

  yerlesim.splice(koltukNo - 1, 1);
  koltuklar = koltuklar.map(k => ({ ...k, no: k.no > koltukNo ? k.no - 1 : k.no }));

  /* Panel kapat */
  const panelEl = document.getElementById('soKoltukPanel');
  if (panelEl) panelEl.style.display = 'none';

  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon: sb, yerlesim, koltuklar,
    guncellendi: new Date().toISOString(),
  }, { merge: false })
    .then(() => toast('Koltuk kaldırıldı.'))
    .catch(err => toast('Hata: ' + err.message));
}

/* ================================================================
   KAYDET / TEMİZLE / ÖZET
   ================================================================ */
function soKaydet(servisId) {
  const sablon = document.getElementById('soSecilenSablon')?.value || 'minibus';
  const mevcut = servisOturmaPlani.find(p => p.servisId === servisId);
  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon,
    yerlesim:  mevcut?.yerlesim  || SO_SABLONLAR[sablon].yerlesimUret(),
    koltuklar: mevcut?.koltuklar || [],
    guncellendi: new Date().toISOString(),
  }, { merge: true })
    .then(() => toast('Oturma planı kaydedildi.'))
    .catch(err => toast('Hata: ' + err.message));
}

function soTumunuTemizle() {
  const servisId = document.getElementById('soServisId')?.value;
  if (!servisId) return;
  if (!confirm('Tüm öğrenci atamaları silinecek. Koltuk düzeni korunacak. Emin misiniz?')) return;
  db.collection(COL.servisOturma).doc(servisId)
    .update({ koltuklar: [], guncellendi: new Date().toISOString() })
    .then(() => toast('Atamalar temizlendi.'))
    .catch(err => toast('Hata: ' + err.message));
}

function _soOzetGuncelle(koltuklar, toplam) {
  const dolu    = koltuklar.filter(k => k.ogrenciId || k.ogrenciAdi).length;
  const rezerve = koltuklar.filter(k => k.rezerve && !(k.ogrenciId || k.ogrenciAdi)).length;
  const bos     = Math.max(0, toplam - dolu - rezerve);
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el('soDoluSayisi', dolu); el('soBosSayisi', bos);
  el('soRezerveSayisi', rezerve); el('soToplamSayisi', toplam);
}

/* ================================================================
   SEKME & LİSTE
   ================================================================ */
function tasimaAltSekmeSec(sekme) {
  document.querySelectorAll('[data-tasima-sekme]').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-tasima-sekme') === sekme));
  const d1 = document.getElementById('tasima-bolum-servisler');
  const d2 = document.getElementById('tasima-bolum-oturma');
  if (d1) d1.style.display = sekme === 'servisler' ? '' : 'none';
  if (d2) d2.style.display = sekme === 'oturma'    ? '' : 'none';
  if (sekme === 'oturma') renderOturmaServisler();
}

function renderOturmaServisler() {
  const hedef = document.getElementById('oturmaServislerListesi');
  if (!hedef) return;
  const liste = [...servisler].sort((a, b) => (a.servisAdi || '').localeCompare(b.servisAdi || '', 'tr'));
  if (!liste.length) { hedef.innerHTML = '<div class="empty-state">Henüz servis eklenmedi.</div>'; return; }

  hedef.innerHTML = liste.map(s => {
    const plan      = servisOturmaPlani.find(p => p.servisId === s.id);
    const sablonObj = plan?.sablon ? SO_SABLONLAR[plan.sablon] : null;
    const toplam    = plan?.yerlesim?.length || 0;
    const dolu      = (plan?.koltuklar || []).filter(k => k.ogrenciId || k.ogrenciAdi).length;
    const rezerve   = (plan?.koltuklar || []).filter(k => k.rezerve && !(k.ogrenciId || k.ogrenciAdi)).length;
    const bos       = Math.max(0, toplam - dolu - rezerve);
    return `<div class="oturma-servis-kart" onclick="servisOturmaModalAc('${s.id}')">
      <div style="flex:1;">
        <strong>${escapeHtml(s.servisAdi || 'Servis')}</strong>
        <span class="badge badge-${s.durum === 'Pasif' ? 'gray' : 'sage'}" style="margin-left:6px;">${escapeHtml(s.durum || 'Aktif')}</span>
        ${sablonObj ? `<span style="margin-left:6px;font-size:12px;color:#6b7280;">${sablonObj.ikon} ${sablonObj.ad}</span>` : ''}
        <div class="oturma-servis-ozet">
          ${s.guzergah ? escapeHtml(s.guzergah) + ' · ' : ''}
          ${plan ? `${toplam} koltuk · 🟢 ${dolu} dolu · ⬜ ${bos} boş · 🔵 ${rezerve} rezerve` : 'Oturma planı henüz oluşturulmadı'}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();servisOturmaModalAc('${s.id}')">
        💺 ${plan ? 'Düzenle' : 'Oluştur'}
      </button>
    </div>`;
  }).join('');
}

/* ================================================================
   RAPOR YARDIMCI — raporlama.js tarafından kullanılır
   ================================================================ */
function soRaporGovdeHtml(servis, plan) {
  if (!plan || !plan.yerlesim || !plan.yerlesim.length) return '';

  const yerlesim  = plan.yerlesim;
  const koltuklar = plan.koltuklar || [];
  const sablon    = plan.sablon || 'minibus';
  const buyuk     = sablon === 'buyuk';
  const bugun     = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

  const koltukMap = {};
  koltuklar.forEach(k => { koltukMap[k.no] = k; });

  /* Sıralara göre grupla */
  const siraMap = {};
  yerlesim.forEach((yuva, idx) => {
    const no = idx + 1;
    if (!siraMap[yuva.sira]) siraMap[yuva.sira] = [];
    siraMap[yuva.sira].push({ ...yuva, no, koltuk: koltukMap[no] || null });
  });

  const koltukKutu = (yuva) => {
    const { no, konum, koltuk } = yuva;
    const dolu    = koltuk && (koltuk.ogrenciId || koltuk.ogrenciAdi);
    const rezerve = koltuk && koltuk.rezerve && !dolu;
    const ad      = dolu ? (koltuk.ogrenciAdi || '') : '';
    const kisa    = ad.length > 12 ? ad.substring(0, 11) + '…' : ad;
    let kolcak = '';
    if (konum === 'sol-dis' || konum === 'sol-tek') kolcak = 'so-rapor-kolcak-sol';
    if (konum === 'sag-dis')                        kolcak = 'so-rapor-kolcak-sag';
    const cls = `so-rapor-koltuk ${dolu ? 'so-rapor-dolu' : rezerve ? 'so-rapor-rezerve' : 'so-rapor-bos'} ${kolcak}`;
    return `<div class="${cls}">
      ${kisa ? `<span class="so-rapor-ad">${escapeHtml(kisa)}</span>` : ''}
    </div>`;
  };

  const siralar = Object.keys(siraMap).map(Number).sort((a, b) => a - b);
  let html = `<div class="so-rapor-baslik">
    🚌 ${escapeHtml(servis.servisAdi || '')} · Şoför: ${escapeHtml(servis.soforAdi || '—')} · ${bugun}
  </div><div class="so-rapor-arac${buyuk ? ' so-rapor-arac-buyuk' : ''}">`;

  /* Ön cam — ortalı */
  html += `<div class="so-rapor-on"><div class="so-rapor-cam"></div></div>`;

  siralar.forEach(siraIdx => {
    const yuvalar = siraMap[siraIdx];
    const arkaVar = yuvalar.some(y => y.konum === 'arka');

    if (arkaVar) {
      html += `<div class="so-rapor-sira so-rapor-arka">`;
      yuvalar.forEach(y => { html += koltukKutu(y); });
      html += `</div>`;
      return;
    }

    const soller    = yuvalar.filter(y => ['sol-tek','sol-dis','sol-ic'].includes(y.konum));
    const saglar    = yuvalar.filter(y => y.konum.startsWith('sag'));
    const kapiSagVar = yuvalar.some(y => y.kapiSag);

    if (siraIdx === 0) {
      /* Şoför sırası */
      html += `<div class="so-rapor-sira so-rapor-sofor-sirasi">`;
      html += `<div class="so-rapor-sofor">🧑‍✈️<br><small>Şoför</small></div>`;
      html += `<div class="so-rapor-koridor"></div>`;
      html += `<div class="so-rapor-grup">`;
      if (kapiSagVar && saglar.length === 0) {
        html += `<div class="so-rapor-kapi">│GİRİŞ│</div>`;
      } else {
        saglar.forEach(y => { html += koltukKutu(y); });
      }
      html += `</div></div>`;
      return;
    }

    html += `<div class="so-rapor-sira">`;
    html += `<div class="so-rapor-grup">`; soller.forEach(y => { html += koltukKutu(y); }); html += `</div>`;
    html += `<div class="so-rapor-koridor"></div>`;
    if (kapiSagVar && saglar.length === 0) {
      html += `<div class="so-rapor-kapi">│KAPI│</div>`;
    } else {
      html += `<div class="so-rapor-grup">`; saglar.forEach(y => { html += koltukKutu(y); }); html += `</div>`;
      if (kapiSagVar) html += `<div class="so-rapor-kapi so-rapor-kapi-arka">│KAPI│</div>`;
    }
    html += `</div>`;
  });

  html += `</div>`;
  return html;
}
