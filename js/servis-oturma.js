/* ====================================================================
   js/servis-oturma.js  (v3.0)
   Servis Oturma Planı — Dikey Araç Şeması
   ────────────────────────────────────────────────────────────────────
   Firestore: COL.servisOturma → 'oy_servisOturma'
   Belge ID  = servisId
   Belge     = {
     servisId,
     sablon: 'minibus' | 'ducato' | 'buyuk',
     yerlesim: [{ sira, konum, soforYani? }],
     koltuklar: [{ no, ogrenciId, ogrenciAdi, rezerve }]
   }
   ────────────────────────────────────────────────────────────────────
   Yerleşim mantığı:
   • yerlesim dizisi araçtaki tüm yuvaları tutar (indeks = koltuk no - 1)
   • Kullanıcı + placeholder'a tıklarsa koltuk ekler
   • Koltuğa tıklarsa öğrenci atar veya koltuğu siler
   ────────────────────────────────────────────────────────────────────
   Şablonlar:
   minibus → 1+2, şoför yanı başlangıçta 1 sol + 1 sağ koltuk
   ducato  → 1+2, şoför yanı başlangıçta 1 sol + 2 sağ koltuk
   buyuk   → 2+2, 7 sıra + arka 5
   ==================================================================== */

let servisOturmaPlani = [];

/* ================================================================
   ŞABLON TANIMLARI
   ================================================================ */
const SO_SABLONLAR = {

  minibus: {
    ad: 'Minibüs',
    ikon: '🚐',
    aciklama: '1+2 düzen',
    yerlesimUret() {
      const y = [];
      // Sira 0: şoför yanı — başlangıç: sol 1, sağ 1
      y.push({ sira: 0, konum: 'sol-tek', soforYani: true });
      y.push({ sira: 0, konum: 'sag-dis', soforYani: true });
      // Sıra 1–5: 1+2
      for (let s = 1; s <= 5; s++) {
        y.push({ sira: s, konum: 'sol-tek' });
        y.push({ sira: s, konum: 'sag-ic' });
        y.push({ sira: s, konum: 'sag-dis' });
      }
      return y;
    },
  },

  ducato: {
    ad: 'Ducato',
    ikon: '🚎',
    aciklama: '1+2 düzen',
    yerlesimUret() {
      const y = [];
      // Sira 0: şoför yanı — başlangıç: sol 1, sağ 2
      y.push({ sira: 0, konum: 'sol-tek', soforYani: true });
      y.push({ sira: 0, konum: 'sag-ic',  soforYani: true });
      y.push({ sira: 0, konum: 'sag-dis', soforYani: true });
      // Sıra 1–6: 1+2
      for (let s = 1; s <= 6; s++) {
        y.push({ sira: s, konum: 'sol-tek' });
        y.push({ sira: s, konum: 'sag-ic' });
        y.push({ sira: s, konum: 'sag-dis' });
      }
      return y;
    },
  },

  buyuk: {
    ad: 'Büyük Servis',
    ikon: '🚍',
    aciklama: '2+2 düzen + arka sıra',
    yerlesimUret() {
      const y = [];
      // Sira 0: şoför yanı — sol 1, sağ 2
      y.push({ sira: 0, konum: 'sol-dis', soforYani: true });
      y.push({ sira: 0, konum: 'sag-ic',  soforYani: true });
      y.push({ sira: 0, konum: 'sag-dis', soforYani: true });
      // Sıra 1–6: 2+2
      for (let s = 1; s <= 6; s++) {
        y.push({ sira: s, konum: 'sol-dis' });
        y.push({ sira: s, konum: 'sol-ic'  });
        y.push({ sira: s, konum: 'sag-ic'  });
        y.push({ sira: s, konum: 'sag-dis' });
      }
      // Sıra 7: arka 5
      for (let k = 0; k < 5; k++) {
        y.push({ sira: 7, konum: 'arka' });
      }
      return y;
    },
  },
};

/* ================================================================
   FIRESTORE BAĞLANTISI
   ================================================================ */
function servisOturmaBaglantisiKur() {
  if (!db) return;
  db.collection(COL.servisOturma).onSnapshot(snap => {
    servisOturmaPlani = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const aktifId = document.getElementById('soServisId')?.value;
    if (aktifId) _soRenderArac(aktifId);
    if (document.getElementById('oturmaServislerListesi')) renderOturmaServisler();
  }, err => console.warn('servisOturma snapshot:', err));
}

/* ================================================================
   ANA MODAL
   ================================================================ */
function servisOturmaModalAc(servisId) {
  const s = servisler.find(x => x.id === servisId);
  if (!s) return;

  const mevcut        = servisOturmaPlani.find(p => p.servisId === servisId);
  const secilenSablon = mevcut?.sablon || 'minibus';

  const sablonButonlari = Object.entries(SO_SABLONLAR).map(([key, val]) => `
    <button class="so-sablon-btn${secilenSablon === key ? ' so-sablon-aktif' : ''}"
      onclick="soSablonSec('${key}','${servisId}')" data-sablon="${key}">
      ${val.ikon} ${val.ad}
      <small>${val.aciklama}</small>
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
        <div class="so-sablon-btnler">${sablonButonlari}</div>
      </div>

      <div class="so-icerik">
        <div class="so-arac-wrap">
          <div id="soAracSemasi"></div>
        </div>
        <div class="so-sag-panel">
          <div class="so-ozet-kart">
            <div class="so-ozet-baslik">Özet</div>
            <div class="so-ozet-satir"><span class="so-nokta" style="background:#22c55e"></span>Dolu <strong id="soDoluSayisi">0</strong></div>
            <div class="so-ozet-satir"><span class="so-nokta so-nokta-bos"></span>Boş <strong id="soBosSayisi">0</strong></div>
            <div class="so-ozet-satir"><span class="so-nokta" style="background:#3b82f6"></span>Rezerve <strong id="soRezerveSayisi">0</strong></div>
            <div class="so-ozet-satir" style="border-top:1px solid #e5e7eb;padding-top:6px;margin-top:4px;">Toplam <strong id="soToplamSayisi">0</strong></div>
          </div>
          <div class="so-legend">
            <div class="so-legend-satir"><span class="so-koltuk so-k-mini so-dolu"></span>Dolu</div>
            <div class="so-legend-satir"><span class="so-koltuk so-k-mini"></span>Boş</div>
            <div class="so-legend-satir"><span class="so-koltuk so-k-mini so-rezerve"></span>Rezerve</div>
            <div class="so-legend-satir"><span class="so-koltuk so-k-mini so-ekle-yuva">+</span>Koltuk ekle</div>
          </div>
          <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px;" onclick="soTumunuTemizle()">🗑️ Atamaları Temizle</button>
          <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:6px;" onclick="raporServisOturmaPlan('${servisId}')">🖨️ Rapor Al</button>
        </div>
      </div>
    </div>`;

  modalAc(`💺 Oturma Planı — ${escapeHtml(s.servisAdi)}`, icerik, () => soKaydet(servisId));
  setTimeout(() => _soRenderArac(servisId), 60);
}

/* ================================================================
   ŞABLON SEÇ
   ================================================================ */
function soSablonSec(sablon, servisId) {
  const mevcut     = servisOturmaPlani.find(p => p.servisId === servisId);
  const atamavar   = (mevcut?.koltuklar || []).some(k => k.ogrenciId || k.ogrenciAdi || k.rezerve);
  if (atamavar && !confirm('Araç tipi değiştirilirse mevcut atamalar sıfırlanacak. Devam?')) return;

  document.getElementById('soSecilenSablon').value = sablon;
  document.querySelectorAll('.so-sablon-btn').forEach(b =>
    b.classList.toggle('so-sablon-aktif', b.dataset.sablon === sablon));

  const yerlesim = SO_SABLONLAR[sablon].yerlesimUret();
  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon, yerlesim, koltuklar: [],
    guncellendi: new Date().toISOString(),
  }).catch(err => toast('Hata: ' + err.message));
}

/* ================================================================
   ARAÇ RENDERER
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

  /* ---- Sıralara göre grupla ---- */
  const siraMap = {};
  yerlesim.forEach((yuva, idx) => {
    const k = koltuklar.find(k => k.no === idx + 1) || null;
    if (!siraMap[yuva.sira]) siraMap[yuva.sira] = [];
    siraMap[yuva.sira].push({ ...yuva, no: idx + 1, koltuk: k });
  });

  /* ---- Şoför yanı placeholder durumu ---- */
  // Şoför yanında sol tarafta en fazla kaç koltuk olabilir?
  // Minibüs/Ducato: sol 1+1=2 max, Büyük: sol 2 max
  const soforSirasi = siraMap[0] || [];
  const soforSollar = soforSirasi.filter(y => y.konum.startsWith('sol'));
  const soforSaglar = soforSirasi.filter(y => y.konum.startsWith('sag'));
  const maxSolSofor = buyuk ? 2 : 2;
  const maxSagSofor = buyuk ? 2 : 2;
  const ekSolVar    = soforSollar.length < maxSolSofor;
  const ekSagVar    = soforSaglar.length < maxSagSofor;

  let html = `<div class="so-arac${buyuk ? ' so-arac-buyuk' : ''}">`;

  /* Ön */
  html += `<div class="so-arac-on">
    <div class="so-sofor-koltuk">🧑‍✈️<span>Şoför</span></div>
    <div class="so-on-cam"></div>
  </div>`;

  html += `<div class="so-koltuk-bolum">`;

  const siralar = Object.keys(siraMap).map(Number).sort((a, b) => a - b);

  siralar.forEach(siraIdx => {
    const yuvalar  = siraMap[siraIdx];
    const arkaVar  = yuvalar.some(y => y.konum === 'arka');

    if (arkaVar) {
      html += `<div class="so-sira so-arka-sira">`;
      yuvalar.forEach(y => { html += _soYuvaHtml(y, servisId, sablon); });
      html += `</div>`;
      return;
    }

    const soller = yuvalar.filter(y => y.konum.startsWith('sol') || y.konum === 'sol-tek');
    const saglar = yuvalar.filter(y => y.konum.startsWith('sag'));

    html += `<div class="so-sira${siraIdx === 0 ? ' so-sofor-sirasi' : ''}">`;

    /* Sol grup */
    html += `<div class="so-sol-grup">`;
    soller.forEach(y => { html += _soYuvaHtml(y, servisId, sablon); });
    if (siraIdx === 0 && soller.length < maxSolSofor) {
      html += _soPlaceholderHtml(siraIdx, buyuk ? 'sol-ic' : 'sol-ek', servisId, sablon);
    }
    html += `</div>`;

    html += `<div class="so-koridor"></div>`;

    /* Sağ grup */
    html += `<div class="so-sag-grup">`;
    saglar.forEach(y => { html += _soYuvaHtml(y, servisId, sablon); });
    if (siraIdx === 0 && saglar.length < maxSagSofor) {
      html += _soPlaceholderHtml(siraIdx, 'sag-ek', servisId, sablon);
    }
    html += `</div>`;

    html += `</div>`; /* so-sira */
  });

  html += `</div>`; /* so-koltuk-bolum */
  html += `<div class="so-arac-arka"></div>`;
  html += `</div>`; /* so-arac */

  hedef.innerHTML = html;
  _soOzetGuncelle(koltuklar, yerlesim.length);
}

/* ================================================================
   YUVA & PLACEHOLDER HTML
   ================================================================ */
function _soYuvaHtml(yuva, servisId, sablon) {
  const { no, konum, koltuk } = yuva;
  const dolu    = koltuk && (koltuk.ogrenciId || koltuk.ogrenciAdi);
  const rezerve = koltuk && koltuk.rezerve && !dolu;
  const ad      = dolu ? (koltuk.ogrenciAdi || '') : '';
  const kisa    = ad.length > 8 ? ad.substring(0, 7) + '…' : ad;

  let cls = 'so-koltuk';
  if (dolu)    cls += ' so-dolu';
  if (rezerve) cls += ' so-rezerve';
  if (konum === 'sol-dis' || konum === 'sol-tek') cls += ' so-kolcak-sol';
  if (konum === 'sag-dis') cls += ' so-kolcak-sag';

  const title = dolu
    ? `${no}. Koltuk — ${ad}`
    : rezerve ? `${no}. Koltuk — Rezerve` : `${no}. Koltuk — Boş (tıkla: öğrenci ata)`;

  return `<div class="${cls}" onclick="soKoltukTikla(${no},'${servisId}','${sablon}')" title="${escapeHtml(title)}">
    <span class="so-k-no">${no}</span>
    ${kisa ? `<span class="so-k-ad">${escapeHtml(kisa)}</span>` : ''}
  </div>`;
}

function _soPlaceholderHtml(sira, konum, servisId, sablon) {
  return `<div class="so-koltuk so-ekle-yuva"
    onclick="soKoltukEkle(${sira},'${konum}','${servisId}','${sablon}')"
    title="Koltuk ekle">+</div>`;
}

/* ================================================================
   KOLTUK EKLE
   ================================================================ */
function soKoltukEkle(sira, konum, servisId, sablon) {
  const mevcut   = servisOturmaPlani.find(p => p.servisId === servisId);
  const sb       = sablon || mevcut?.sablon || 'minibus';
  const yerlesim = mevcut?.yerlesim ? [...mevcut.yerlesim] : SO_SABLONLAR[sb].yerlesimUret();

  // Zaten aynı konum var mı?
  if (yerlesim.some(y => y.sira === sira && y.konum === konum)) {
    toast('Bu pozisyonda zaten koltuk var.'); return;
  }

  // Aynı siranın son yuvasından sonra ekle
  let sonIdx = -1;
  yerlesim.forEach((y, i) => { if (y.sira === sira) sonIdx = i; });
  const yeniYuva = { sira, konum, soforYani: sira === 0 };
  if (sonIdx >= 0) yerlesim.splice(sonIdx + 1, 0, yeniYuva);
  else yerlesim.push(yeniYuva);

  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon: sb, yerlesim,
    koltuklar: mevcut?.koltuklar || [],
    guncellendi: new Date().toISOString(),
  }, { merge: false })
    .then(() => toast('Koltuk eklendi.'))
    .catch(err => toast('Hata: ' + err.message));
}

/* ================================================================
   KOLTUK TIKLA → Modal
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
    return `<option value="${v.id}"
      ${koltuk.ogrenciId === v.id ? 'selected' : ''}
      ${atanmis ? 'disabled' : ''}>
      ${escapeHtml(v.ogrenciAdi || '')}${sn ? ' — ' + sn.ad : ''}${atanmis ? ' (atanmış)' : ''}
    </option>`;
  }).join('');

  const body = `
    <div class="so-koltuk-modal">
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
      <button class="btn btn-danger btn-sm" onclick="soKoltukSil(${koltukNo},'${servisId}','${sb}')">
        🗑️ Bu Koltuğu Kaldır
      </button>
      ${!ogrs.length ? `<p class="so-uyari" style="margin-top:8px;">⚠️ Bu serviste kayıtlı öğrenci bulunamadı.</p>` : ''}
    </div>`;

  modalAc(`💺 ${koltukNo}. Koltuk`, body, () => {
    const ogrenciId = document.getElementById('soOgrenciSec').value;
    const rezerve   = document.getElementById('soRezerveCheck').checked && !ogrenciId;
    soKoltukGuncelle(servisId, koltukNo, ogrenciId, rezerve, sb);
  });
}

/* ================================================================
   KOLTUK GÜNCELLE
   ================================================================ */
function soKoltukGuncelle(servisId, koltukNo, ogrenciId, rezerve, sablon) {
  const mevcut    = servisOturmaPlani.find(p => p.servisId === servisId);
  const koltuklar = mevcut ? [...(mevcut.koltuklar || [])] : [];
  const sb        = sablon || mevcut?.sablon || 'minibus';

  const v    = ogrenciId ? veliler.find(x => x.id === ogrenciId) : null;
  const yeni = { no: koltukNo, ogrenciId: ogrenciId || null, ogrenciAdi: v?.ogrenciAdi || '', rezerve };

  const idx = koltuklar.findIndex(k => k.no === koltukNo);
  if (idx >= 0) koltuklar[idx] = yeni;
  else koltuklar.push(yeni);

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

  // Yerleşimden kaldır (no - 1 = index)
  yerlesim.splice(koltukNo - 1, 1);

  // Kalan atamaların no'larını kaydır
  koltuklar = koltuklar.map(k => ({ ...k, no: k.no > koltukNo ? k.no - 1 : k.no }));

  // Modalı kapat
  document.querySelectorAll('.modal-overlay, #modal').forEach(el => el.style.display = 'none');

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
  const sablon  = document.getElementById('soSecilenSablon')?.value || 'minibus';
  const mevcut  = servisOturmaPlani.find(p => p.servisId === servisId);
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
  el('soDoluSayisi',    dolu);
  el('soBosSayisi',     bos);
  el('soRezerveSayisi', rezerve);
  el('soToplamSayisi',  toplam);
}

/* ================================================================
   SEKME & SERVİS LİSTESİ
   ================================================================ */
function tasimaAltSekmeSec(sekme) {
  document.querySelectorAll('[data-tasima-sekme]').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-tasima-sekme') === sekme));
  const div1 = document.getElementById('tasima-bolum-servisler');
  const div2 = document.getElementById('tasima-bolum-oturma');
  if (div1) div1.style.display = sekme === 'servisler' ? '' : 'none';
  if (div2) div2.style.display = sekme === 'oturma'    ? '' : 'none';
  if (sekme === 'oturma') renderOturmaServisler();
}

function renderOturmaServisler() {
  const hedef = document.getElementById('oturmaServislerListesi');
  if (!hedef) return;

  const liste = [...servisler].sort((a, b) => (a.servisAdi || '').localeCompare(b.servisAdi || '', 'tr'));
  if (!liste.length) {
    hedef.innerHTML = '<div class="empty-state">Henüz servis eklenmedi.</div>';
    return;
  }

  hedef.innerHTML = liste.map(s => {
    const plan      = servisOturmaPlani.find(p => p.servisId === s.id);
    const sablonObj = plan?.sablon ? SO_SABLONLAR[plan.sablon] : null;
    const toplam    = plan?.yerlesim?.length || 0;
    const dolu      = (plan?.koltuklar || []).filter(k => k.ogrenciId || k.ogrenciAdi).length;
    const rezerve   = (plan?.koltuklar || []).filter(k => k.rezerve && !(k.ogrenciId || k.ogrenciAdi)).length;
    const bos       = Math.max(0, toplam - dolu - rezerve);
    const planVar   = !!plan;

    return `<div class="oturma-servis-kart" onclick="servisOturmaModalAc('${s.id}')">
      <div style="flex:1;">
        <strong>${escapeHtml(s.servisAdi || 'Servis')}</strong>
        <span class="badge badge-${s.durum === 'Pasif' ? 'gray' : 'sage'}" style="margin-left:6px;">${escapeHtml(s.durum || 'Aktif')}</span>
        ${sablonObj ? `<span style="margin-left:6px;font-size:12px;color:#6b7280;">${sablonObj.ikon} ${sablonObj.ad}</span>` : ''}
        <div class="oturma-servis-ozet">
          ${s.guzergah ? escapeHtml(s.guzergah) + ' · ' : ''}
          ${planVar
            ? `${toplam} koltuk · 🟢 ${dolu} dolu · ⬜ ${bos} boş · 🔵 ${rezerve} rezerve`
            : 'Oturma planı henüz oluşturulmadı'}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); servisOturmaModalAc('${s.id}')">
        💺 ${planVar ? 'Düzenle' : 'Oluştur'}
      </button>
    </div>`;
  }).join('');
}
