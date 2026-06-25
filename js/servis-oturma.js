/* ====================================================================
   js/servis-oturma.js  (v4.0)
   Servis Oturma Planı — Dikey Araç Şeması
   ────────────────────────────────────────────────────────────────────
   Firestore: COL.servisOturma → 'oy_servisOturma'
   Belge ID  = servisId
   {servisId, sablon, yerlesim:[{sira,konum,soforYani?}], koltuklar:[{no,ogrenciId,ogrenciAdi,rezerve}]}

   Düzen kuralları:
   minibus  → 1+2: sol=sol-tek(1), sağ=sag-ic+sag-dis(2)
   ducato   → 2+1: şoför yanı sağda 2, sonra sol çift+kapı sırası, sonra
              sol-dis+sol-ic+sag-dis(2+1), arkada 4'lü banket
   buyuk    → 2+2: şoför yanı kapı, sol-dis+sol-ic+sag-ic+sag-dis(2+2) sıraları,
              ardından sadece sol 2 koltuk + 2.kapı sırası, arkada 4'lü banket
   ==================================================================== */

let servisOturmaPlani = [];

/* ================================================================
   ŞABLON TANIMLARI
   ================================================================ */
const SO_SABLONLAR = {

  ducato: {
    ad: 'Ducato', ikon: '🚎', aciklama: '2+1 düzen',
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
      // Sıra siraMax+1: sadece sol 2 koltuk + arka kapı sağda (sağda koltuk yok)
      y.push({ sira: siraMax + 1, konum: 'sol-dis', kapiSag: true });
      y.push({ sira: siraMax + 1, konum: 'sol-ic',  kapiSag: true });
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
  const secilenSablon = mevcut?.sablon || 'ducato';

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

  const sablon    = document.getElementById('soSecilenSablon')?.value || 'ducato';
  const sablonObj = SO_SABLONLAR[sablon];
  if (!sablonObj) return;

  const mevcut    = servisOturmaPlani.find(p => p.servisId === servisId);
  const koltuklar = mevcut?.koltuklar || [];
  const yerlesim  = (mevcut?.yerlesim?.length) ? mevcut.yerlesim : sablonObj.yerlesimUret();
  const buyuk     = sablon === 'buyuk';
  const ducato    = sablon === 'ducato';
  const servislerData = (typeof servisler !== 'undefined') ? servisler.find(x => x.id === servisId) : null;

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
  html += `<div class="so-arac-on"><div class="so-on-cam"></div>${servislerData?.plaka ? `<div class="so-plaka">${escapeHtml(servislerData.plaka)}</div>` : ''}</div>`;

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
      html += `<div class="so-sofor-koltuk">👨‍✈️<span>${escapeHtml(servislerData?.soforAdi || 'Şoför')}</span></div>`;

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
  html += `<div class="so-sira-ekle-ana">
    <button class="btn btn-ghost btn-sm" onclick="soSiraEkle('${servisId}','${sablon}')">➕ Sıra Ekle</button>
    <button class="btn btn-ghost btn-sm" onclick="soSiraSil('${servisId}','${sablon}')" style="color:#ef4444;">➖ Sıra Sil</button>
  </div>`;

  hedef.innerHTML = html;
  _soOzetGuncelle(koltuklar, yerlesim.length);
}

/* ================================================================
   SIRA EKLE (Alta satır ekleme)
   ================================================================ */
function soSiraEkle(servisId, sablon) {
  const mevcut       = servisOturmaPlani.find(p => p.servisId === servisId);
  const sb           = sablon || mevcut?.sablon || 'ducato';
  const yerlesimEski = mevcut?.yerlesim ? [...mevcut.yerlesim] : SO_SABLONLAR[sb].yerlesimUret();

  const eklemeSira = _soDinamikEklemeSirasi(sb, yerlesimEski);

  /* Ekleme noktasından itibaren olan sabit sıraları (kapı/arka) 1 ileri kaydır.
     Dizideki sıralama (index) DEĞİŞMİYOR — sadece 'sira' alanı güncelleniyor.
     Böylece mevcut koltuk atamaları (no = dizideki index+1) bozulmaz. */
  const yerlesim = yerlesimEski.map(y => y.sira >= eklemeSira ? { ...y, sira: y.sira + 1 } : y);

  /* Yeni dinamik sırayı, şablonun tekrar eden satır deseniyle ekle */
  if (sb === 'ducato') {
    yerlesim.push({ sira: eklemeSira, konum: 'sol-dis' });
    yerlesim.push({ sira: eklemeSira, konum: 'sol-ic' });
    yerlesim.push({ sira: eklemeSira, konum: 'sag-dis' });
  } else if (sb === 'buyuk') {
    yerlesim.push({ sira: eklemeSira, konum: 'sol-dis' });
    yerlesim.push({ sira: eklemeSira, konum: 'sol-ic' });
    yerlesim.push({ sira: eklemeSira, konum: 'sag-ic' });
    yerlesim.push({ sira: eklemeSira, konum: 'sag-dis' });
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
   SIRA SİL (Son dinamik sırayı sil)
   ================================================================ */
function soSiraSil(servisId, sablon) {
  const mevcut       = servisOturmaPlani.find(p => p.servisId === servisId);
  const sb           = sablon || mevcut?.sablon || 'ducato';
  const yerlesimEski = mevcut?.yerlesim ? [...mevcut.yerlesim] : SO_SABLONLAR[sb].yerlesimUret();

  /* Sabit sıraları bul (kapı/arka) */
  const siraGruplari = {};
  yerlesimEski.forEach(y => { (siraGruplari[y.sira] = siraGruplari[y.sira] || []).push(y); });

  const sabitSiralar = new Set();
  Object.keys(siraGruplari).forEach(s => {
    const sira = Number(s);
    if (sira === 0) return;
    const grup = siraGruplari[s];
    const arkaMi = grup.some(y => y.konum === 'arka');
    const ikinciKapiMi = sb === 'buyuk' && grup.length === 2 &&
      grup.every(y => y.kapiSag && (y.konum === 'sol-dis' || y.konum === 'sol-ic'));
    if (arkaMi || ikinciKapiMi) sabitSiralar.add(sira);
  });

  /* Silinebilir dinamik sıraları bul */
  const dinamikSiralar = Object.keys(siraGruplari).map(Number)
    .filter(s => s !== 0 && !sabitSiralar.has(s))
    .sort((a, b) => b - a); // büyükten küçüğe

  if (!dinamikSiralar.length) { toast('Silinecek sıra bulunamadı.'); return; }

  const silinecekSira = dinamikSiralar[0];

  /* O sıradaki koltuklara atama var mı? */
  const silinecekYuvalar = yerlesimEski
    .map((y, idx) => ({ ...y, no: idx + 1 }))
    .filter(y => y.sira === silinecekSira);
  const atamaliKoltuklar = silinecekYuvalar.filter(y => {
    const k = (mevcut?.koltuklar || []).find(k => k.no === y.no);
    return k && (k.ogrenciId || k.ogrenciAdi || k.rezerve);
  });

  if (atamaliKoltuklar.length && !confirm(`${silinecekSira}. sırada atanmış koltuk var. Sırayı silmek atamaları da kaldırır. Devam?`)) return;

  /* Sırayı yerlesimden çıkar, koltukları temizle */
  const yerlesimYeni = yerlesimEski.filter(y => y.sira !== silinecekSira);
  const silinecekNolar = new Set(silinecekYuvalar.map(y => y.no));
  const koltuklar = (mevcut?.koltuklar || []).filter(k => !silinecekNolar.has(k.no));

  /* Üstteki sabit sıraların numaralarını 1 geri al */
  const yerlesimFinal = yerlesimYeni.map(y => y.sira > silinecekSira ? { ...y, sira: y.sira - 1 } : y);

  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon: sb, yerlesim: yerlesimFinal, koltuklar,
    guncellendi: new Date().toISOString(),
  }, { merge: false })
    .then(() => toast('Sıra silindi.'))
    .catch(err => toast('Hata: ' + err.message));
}


function _soDinamikEklemeSirasi(sb, yerlesim) {
  const maxSira = Math.max(...yerlesim.map(y => y.sira), 0);

  const siraGruplari = {};
  yerlesim.forEach(y => { (siraGruplari[y.sira] = siraGruplari[y.sira] || []).push(y); });

  const sabitSiralar = [];
  Object.keys(siraGruplari).forEach(s => {
    const sira = Number(s);
    if (sira === 0) return; // şoför sırası — her zaman en başta, dikkate alma
    const grup = siraGruplari[s];
    const arkaMi = grup.some(y => y.konum === 'arka');
    const ikinciKapiMi = sb === 'buyuk' && grup.length === 2 &&
      grup.every(y => y.kapiSag && (y.konum === 'sol-dis' || y.konum === 'sol-ic'));
    if (arkaMi || ikinciKapiMi) sabitSiralar.push(sira);
  });

  return sabitSiralar.length ? Math.min(...sabitSiralar) : maxSira + 1;
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
  const sb        = sablon || mevcut?.sablon || 'ducato';

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

  /* Dışına tıklanırsa kapat — modalOverlay'e propagation engelle */
  panelEl.onmousedown = (e) => {
    if (e.target === panelEl) {
      e.stopPropagation();
      vazgecFn();
    }
  };
  panelEl.onclick = (e) => {
    e.stopPropagation();
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
  const sb        = sablon || mevcut?.sablon || 'ducato';
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
  if (!confirm(`${koltukNo}. koltuktan atama kaldırılacak. Emin misiniz?`)) return;

  const mevcut    = servisOturmaPlani.find(p => p.servisId === servisId);
  const sb        = sablon || mevcut?.sablon || 'ducato';
  /* Yerlesimi bozmadan sadece koltuk atamasını temizle */
  const yerlesim  = mevcut?.yerlesim ? [...mevcut.yerlesim] : SO_SABLONLAR[sb].yerlesimUret();
  const koltuklar = (mevcut?.koltuklar || []).filter(k => k.no !== koltukNo);

  /* Panel kapat */
  const panelEl = document.getElementById('soKoltukPanel');
  if (panelEl) panelEl.style.display = 'none';

  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon: sb, yerlesim, koltuklar,
    guncellendi: new Date().toISOString(),
  }, { merge: false })
    .then(() => toast('Koltuk ataması kaldırıldı.'))
    .catch(err => toast('Hata: ' + err.message));
}

/* ================================================================
   KAYDET / TEMİZLE / ÖZET
   ================================================================ */
function soKaydet(servisId) {
  const sablon = document.getElementById('soSecilenSablon')?.value || 'ducato';
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
  const sablon    = plan.sablon || 'ducato';
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
    let sinifAdi = '';
    if (dolu && koltuk.ogrenciId) {
      const v = (typeof veliler !== 'undefined') ? veliler.find(x => x.id === koltuk.ogrenciId) : null;
      if (v) {
        const sn = (typeof siniflar !== 'undefined') ? siniflar.find(s => s.id === v.sinifId) : null;
        sinifAdi = sn ? sn.ad : '';
      }
    }
    let kolcak = '';
    if (konum === 'sol-dis' || konum === 'sol-tek') kolcak = 'so-rapor-kolcak-sol';
    if (konum === 'sag-dis')                        kolcak = 'so-rapor-kolcak-sag';
    const cls = `so-rapor-koltuk ${dolu ? 'so-rapor-dolu' : rezerve ? 'so-rapor-rezerve' : 'so-rapor-bos'} ${kolcak}`;
    return `<div class="${cls}">
      ${ad ? `<span class="so-rapor-ad">${escapeHtml(ad)}</span>` : ''}
      ${sinifAdi ? `<span class="so-rapor-sinif">${escapeHtml(sinifAdi)}</span>` : ''}
    </div>`;
  };

  const siralar = Object.keys(siraMap).map(Number).sort((a, b) => a - b);
  let html = `<div class="so-rapor-baslik">
    🚌 ${escapeHtml(servis.servisAdi || '')}${servis.plaka ? ` · 🚘 ${escapeHtml(servis.plaka)}` : ''} · ${bugun}
  </div><div style="display:flex;justify-content:center;width:100%;padding:8px 0;"><div class="so-rapor-arac${buyuk ? ' so-rapor-arac-buyuk' : ''}">`;

  /* Ön cam + plaka */
  html += `<div class="so-rapor-on"><div class="so-rapor-cam"></div>${servis.plaka ? `<div class="so-rapor-plaka">${escapeHtml(servis.plaka)}</div>` : ''}</div>`;

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
      html += `<div class="so-rapor-sofor">👨‍✈️<br><small>${escapeHtml(servis.soforAdi || 'Şoför')}</small></div>`;
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

  html += `</div></div>`;
  return html;
}
