/* ====================================================================
   js/servis-oturma.js  (v5.0)
   Servis Oturma Planı — Dikey Araç Şeması
   ────────────────────────────────────────────────────────────────────
   Firestore: COL.servisOturma → 'oy_servisOturma'
   Belge ID  = servisId
   {servisId, sablon, yerlesim:[{sira,konum,aktif,soforYani?,kapiSag?}],
    koltuklar:[{no,ogrenciId,ogrenciAdi,rezerve}]}

   aktif:false → "+" placeholder gösterir, koltuk değil
   aktif:true veya tanımsız → normal koltuk

   Düzen kuralları:
   ducato → 2+1: şoför yanı sağda 2, kapı sırası, sonra sol çift+sağ tek, arka 4'lü
   buyuk  → 2+2: giriş kapısı sırası, 2+2 sıraları, ikinci kapı, arka 4'lü
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
      y.push({ sira: 0, konum: 'sol-tek', soforYani: true, aktif: true });
      y.push({ sira: 0, konum: 'sag-ic',  soforYani: true, aktif: true });
      y.push({ sira: 0, konum: 'sag-dis', soforYani: true, aktif: true });
      y.push({ sira: 1, konum: 'sol-dis', kapiSag: true, aktif: true });
      y.push({ sira: 1, konum: 'sol-ic',  kapiSag: true, aktif: true });
      for (let s = 2; s <= siraMax; s++) {
        y.push({ sira: s, konum: 'sol-dis', aktif: true });
        y.push({ sira: s, konum: 'sol-ic',  aktif: true });
        y.push({ sira: s, konum: 'sag-dis', aktif: true });
      }
      for (let k = 0; k < 4; k++) y.push({ sira: siraMax + 1, konum: 'arka', aktif: true });
      return y;
    },
  },

  buyuk: {
    ad: 'Büyük Servis', ikon: '🚍', aciklama: '2+2 düzen + arka sıra',
    yerlesimUret(siraMax = 5) {
      const y = [];
      y.push({ sira: 0, konum: 'sol-dis', soforYani: true, kapiSag: true, aktif: true });
      for (let s = 1; s <= siraMax; s++) {
        y.push({ sira: s, konum: 'sol-dis', aktif: true });
        y.push({ sira: s, konum: 'sol-ic',  aktif: true });
        y.push({ sira: s, konum: 'sag-ic',  aktif: true });
        y.push({ sira: s, konum: 'sag-dis', aktif: true });
      }
      y.push({ sira: siraMax + 1, konum: 'sol-dis', kapiSag: true, aktif: true });
      y.push({ sira: siraMax + 1, konum: 'sol-ic',  kapiSag: true, aktif: true });
      for (let k = 0; k < 4; k++) y.push({ sira: siraMax + 2, konum: 'arka', aktif: true });
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
        ${s.plaka ? ` &nbsp;|&nbsp; 🚘 ${escapeHtml(s.plaka)}` : ''}
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
            <button class="btn btn-ghost btn-sm" onclick="_soRaporDogrudan('${servisId}')">🖨️ Rapor Al</button>
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
   RAPOR — doğrudan servisId ile, modal kapatmadan önce aç
   ================================================================ */
function _soRaporDogrudan(servisId) {
  const servis = servisler.find(x => x.id === servisId);
  const plan   = servisOturmaPlani.find(p => p.servisId === servisId);
  if (!servis) return;

  const govde = (typeof soRaporGovdeHtml === 'function') ? soRaporGovdeHtml(servis, plan) : '';
  if (!govde) { toast('Oturma planı henüz oluşturulmamış.'); return; }

  const baslik = `🚌 ${servis.servisAdi || 'Servis'}${servis.plaka ? ' · 🚘 ' + servis.plaka : ''}`;
  if (typeof _raporPenceresiniAc === 'function') {
    _raporPenceresiniAc(govde, baslik, { logoGoster: true, servisRaporu: true });
  }
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
  // Eski veri aktif alanı içermeyebilir — varsayılan true
  const yerlesim  = (mevcut?.yerlesim?.length)
    ? mevcut.yerlesim.map(y => ({ aktif: true, ...y }))
    : sablonObj.yerlesimUret();
  const buyuk     = sablon === 'buyuk';
  const servislerData = (typeof servisler !== 'undefined') ? servisler.find(x => x.id === servisId) : null;

  /* Sıralara göre grupla — DİZİ SIRASI (index = koltuk no - 1) korunur */
  const siraMap = {};
  yerlesim.forEach((yuva, idx) => {
    const sira = yuva.sira;
    if (!siraMap[sira]) siraMap[sira] = [];
    siraMap[sira].push({ ...yuva, no: idx + 1, koltuk: koltuklar.find(k => k.no === idx + 1) || null });
  });

  const siralar = Object.keys(siraMap).map(Number).sort((a, b) => a - b);

  let html = `<div class="so-arac${buyuk ? ' so-arac-buyuk' : ''}">`;

  /* Ön cam + plaka */
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

    const soller    = yuvalar.filter(y => ['sol-tek','sol-dis','sol-ic'].includes(y.konum));
    const saglar    = yuvalar.filter(y => ['sag-ic','sag-dis','sag-ek'].includes(y.konum));
    const kapiSagVar = yuvalar.some(y => y.kapiSag);

    /* ── ŞOFÖR SIRASI (sıra 0) ── */
    if (siraIdx === 0) {
      // Sol grup genişliği: koltuk sayısı × 40px + (n-1) × 3px boşluk
      // Ducato: 2 koltuk → 83px | Büyük: 1 koltuk → 40px
      const solKoltukSayisi = sablon === 'buyuk' ? 1 : 2;
      const solGrupGenislik = solKoltukSayisi * 40 + (solKoltukSayisi - 1) * 3;

      html += `<div class="so-sira so-sofor-sirasi">`;
      html += `<div class="so-sofor-koltuk" style="width:${solGrupGenislik}px;min-width:${solGrupGenislik}px;">👨‍✈️<span>${escapeHtml(servislerData?.soforAdi || 'Şoför')}</span></div>`;
      html += `<div class="so-koridor"></div>`;
      html += `<div class="so-sag-grup">`;
      if (sablon === 'buyuk' && kapiSagVar && saglar.length === 0) {
        html += `<div class="so-kapi-gosterge">│<span>GİRİŞ</span>│</div>`;
      } else {
        saglar.forEach(y => { html += _soKoltukHtml(y, servisId, sablon); });
      }
      html += `</div></div>`;
      return;
    }

    /* ── NORMAL SIRALAR ── */
    html += `<div class="so-sira">`;

    /* Sol grup — büyük serviste her sıra 2 koltuk sol içerir;
       arka kapı sırasında da sol gruba sabit genişlik ver (kayma önleme) */
    const solGrupStyle = (sablon === 'buyuk' && kapiSagVar && saglar.length === 0)
      ? ` style="min-width:${2 * 40 + 3}px;"` // 2 koltuk × 40px + 3px gap
      : '';
    html += `<div class="so-sol-grup"${solGrupStyle}>`;
    soller.forEach(y => { html += _soKoltukHtml(y, servisId, sablon); });
    html += `</div>`;

    if (kapiSagVar && saglar.length === 0) {
      html += `<div class="so-koridor"></div><div class="so-sag-grup"><div class="so-kapi-gosterge">│<span>KAPI</span>│</div></div>`;
    } else if (kapiSagVar && saglar.length > 0) {
      html += `<div class="so-koridor"></div><div class="so-sag-grup">`;
      saglar.forEach(y => { html += _soKoltukHtml(y, servisId, sablon); });
      html += `</div><div class="so-kapi-gosterge so-kapi-arka">│<span>KAPI</span>│</div>`;
    } else {
      html += `<div class="so-koridor"></div><div class="so-sag-grup">`;
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
    <button class="btn btn-ghost btn-sm so-sira-sil-btn" onclick="soSiraSil('${servisId}','${sablon}')">➖ Sıra Sil</button>
  </div>`;

  hedef.innerHTML = html;

  // Özet: sadece aktif koltukları say
  const aktifYuvalar = yerlesim.filter(y => y.aktif !== false && y.konum !== 'arka' || y.konum === 'arka');
  // Şoför koltukları hariç aktif koltuk sayısı
  const aktifKoltukSayisi = yerlesim.filter(y => y.aktif !== false && !y.soforYani).length;
  _soOzetGuncelle(koltuklar, aktifKoltukSayisi);
}

/* ================================================================
   SIRA EKLE
   ================================================================ */
function soSiraEkle(servisId, sablon) {
  const mevcut       = servisOturmaPlani.find(p => p.servisId === servisId);
  const sb           = sablon || mevcut?.sablon || 'ducato';
  const yerlesimEski = mevcut?.yerlesim ? [...mevcut.yerlesim] : SO_SABLONLAR[sb].yerlesimUret();

  const eklemeSira = _soDinamikEklemeSirasi(sb, yerlesimEski);

  const yerlesim = yerlesimEski.map(y => y.sira >= eklemeSira ? { ...y, sira: y.sira + 1 } : y);

  if (sb === 'ducato') {
    yerlesim.push({ sira: eklemeSira, konum: 'sol-dis', aktif: true });
    yerlesim.push({ sira: eklemeSira, konum: 'sol-ic',  aktif: true });
    yerlesim.push({ sira: eklemeSira, konum: 'sag-dis', aktif: true });
  } else if (sb === 'buyuk') {
    yerlesim.push({ sira: eklemeSira, konum: 'sol-dis', aktif: true });
    yerlesim.push({ sira: eklemeSira, konum: 'sol-ic',  aktif: true });
    yerlesim.push({ sira: eklemeSira, konum: 'sag-ic',  aktif: true });
    yerlesim.push({ sira: eklemeSira, konum: 'sag-dis', aktif: true });
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

  const dinamikSiralar = Object.keys(siraGruplari).map(Number)
    .filter(s => s !== 0 && !sabitSiralar.has(s))
    .sort((a, b) => b - a);

  if (!dinamikSiralar.length) { toast('Silinecek sıra bulunamadı.'); return; }

  const silinecekSira = dinamikSiralar[0];

  const silinecekYuvalar = yerlesimEski
    .map((y, idx) => ({ ...y, no: idx + 1 }))
    .filter(y => y.sira === silinecekSira);
  const atamaliKoltuklar = silinecekYuvalar.filter(y => {
    const k = (mevcut?.koltuklar || []).find(k => k.no === y.no);
    return k && (k.ogrenciId || k.ogrenciAdi || k.rezerve);
  });

  if (atamaliKoltuklar.length && !confirm(`${silinecekSira}. sırada atanmış koltuk var. Sırayı silmek atamaları da kaldırır. Devam?`)) return;

  const yerlesimYeni   = yerlesimEski.filter(y => y.sira !== silinecekSira);
  const silinecekNolar = new Set(silinecekYuvalar.map(y => y.no));
  const koltuklar      = (mevcut?.koltuklar || []).filter(k => !silinecekNolar.has(k.no));
  const yerlesimFinal  = yerlesimYeni.map(y => y.sira > silinecekSira ? { ...y, sira: y.sira - 1 } : y);

  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon: sb, yerlesim: yerlesimFinal, koltuklar,
    guncellendi: new Date().toISOString(),
  }, { merge: false })
    .then(() => toast('Sıra silindi.'))
    .catch(err => toast('Hata: ' + err.message));
}

/* ================================================================
   SIRA EKLE — sabit sıralardan önceki ekleme noktası
   ================================================================ */
function _soDinamikEklemeSirasi(sb, yerlesim) {
  const maxSira = Math.max(...yerlesim.map(y => y.sira), 0);
  const siraGruplari = {};
  yerlesim.forEach(y => { (siraGruplari[y.sira] = siraGruplari[y.sira] || []).push(y); });

  const sabitSiralar = [];
  Object.keys(siraGruplari).forEach(s => {
    const sira = Number(s);
    if (sira === 0) return;
    const grup = siraGruplari[s];
    const arkaMi = grup.some(y => y.konum === 'arka');
    const ikinciKapiMi = sb === 'buyuk' && grup.length === 2 &&
      grup.every(y => y.kapiSag && (y.konum === 'sol-dis' || y.konum === 'sol-ic'));
    if (arkaMi || ikinciKapiMi) sabitSiralar.push(sira);
  });

  return sabitSiralar.length ? Math.min(...sabitSiralar) : maxSira + 1;
}

/* ================================================================
   KOLTUK HTML — aktif:false ise "+" placeholder
   ================================================================ */
function _soKoltukHtml(yuva, servisId, sablon) {
  const { no, konum, koltuk, aktif, soforYani } = yuva;

  /* Şoför koltuğu: sıra 0'da soforYani, render edilmez (şoför ikonu alıyor) */
  if (soforYani) return '';

  /* Placeholder "+" — aktif değil */
  if (aktif === false) {
    let cls = 'so-koltuk so-placeholder';
    if (konum === 'sol-dis' || konum === 'sol-tek') cls += ' so-kolcak-sol';
    if (konum === 'sag-dis') cls += ' so-kolcak-sag';
    return `<div class="${cls}" onclick="soYuvaAktifEt(${no},'${servisId}','${sablon}')" title="Koltuk ekle">+</div>`;
  }

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
   YUVA AKTİF ET (placeholder'a tıklanınca)
   ================================================================ */
function soYuvaAktifEt(no, servisId, sablon) {
  const mevcut    = servisOturmaPlani.find(p => p.servisId === servisId);
  const sb        = sablon || mevcut?.sablon || 'ducato';
  const yerlesim  = mevcut?.yerlesim ? [...mevcut.yerlesim] : SO_SABLONLAR[sb].yerlesimUret();
  const idx       = no - 1;
  if (!yerlesim[idx]) return;
  yerlesim[idx] = { ...yerlesim[idx], aktif: true };

  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon: sb, yerlesim,
    koltuklar: mevcut?.koltuklar || [],
    guncellendi: new Date().toISOString(),
  }, { merge: false })
    .then(() => toast('Koltuk eklendi.'))
    .catch(err => toast('Hata: ' + err.message));
}

/* ================================================================
   KOLTUK TIKLA — INLINE PANEL AÇAR
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
      <button class="btn btn-danger btn-sm" onclick="soKoltukDeaktifEt(${koltukNo},'${servisId}','${sb}')">
        ✕ Koltuğu Kaldır (+)
      </button>
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

  const vazgecFn = () => { panelEl.style.display = 'none'; };

  const kaydetBtn = panelEl.querySelector('.so-koltuk-panel');
  if (kaydetBtn) kaydetBtn.onkeydown = (e) => { if (e.key === 'Enter') kaydetchecks(); };

  panelEl.onmousedown = (e) => { if (e.target === panelEl) { e.stopPropagation(); vazgecFn(); } };
  panelEl.onclick = (e) => { e.stopPropagation(); };

  const btnDiv = document.createElement('div');
  btnDiv.className = 'so-koltuk-panel-butonlar';
  btnDiv.innerHTML = `
    <button class="btn btn-primary btn-sm" onclick="soKoltukTiklaSonlandır()">✓ Kaydet</button>
    <button class="btn btn-ghost btn-sm"   onclick="soKoltukTiklaVazgec()">✕ Vazgeç</button>`;

  const panelDiv = panelEl.querySelector('.so-koltuk-panel');
  if (panelDiv && !panelDiv.querySelector('.so-koltuk-panel-butonlar')) panelDiv.appendChild(btnDiv);

  window.soKoltukTiklaSonlandır = kaydetchecks;
  window.soKoltukTiklaVazgec    = vazgecFn;
}

/* ================================================================
   KOLTUK DEAKTİF ET — yerinden kaldırıp "+" yap, atamayı sil
   ================================================================ */
function soKoltukDeaktifEt(koltukNo, servisId, sablon) {
  const mevcut    = servisOturmaPlani.find(p => p.servisId === servisId);
  const sb        = sablon || mevcut?.sablon || 'ducato';
  const yerlesim  = mevcut?.yerlesim ? [...mevcut.yerlesim] : SO_SABLONLAR[sb].yerlesimUret();
  const koltuklar = (mevcut?.koltuklar || []).filter(k => k.no !== koltukNo);

  // Yuvanın aktifliğini false yap — yeri değişmez
  const idx = koltukNo - 1;
  if (yerlesim[idx]) yerlesim[idx] = { ...yerlesim[idx], aktif: false };

  const panelEl = document.getElementById('soKoltukPanel');
  if (panelEl) panelEl.style.display = 'none';

  db.collection(COL.servisOturma).doc(servisId).set({
    servisId, sablon: sb, yerlesim, koltuklar,
    guncellendi: new Date().toISOString(),
  }, { merge: false })
    .then(() => toast('Koltuk kaldırıldı. "+" ile geri ekleyebilirsiniz.'))
    .catch(err => toast('Hata: ' + err.message));
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
    const aktifYer  = (plan?.yerlesim || []).filter(y => y.aktif !== false && !y.soforYani);
    const toplam    = aktifYer.length;
    const dolu      = (plan?.koltuklar || []).filter(k => k.ogrenciId || k.ogrenciAdi).length;
    const rezerve   = (plan?.koltuklar || []).filter(k => k.rezerve && !(k.ogrenciId || k.ogrenciAdi)).length;
    const bos       = Math.max(0, toplam - dolu - rezerve);
    return `<div class="oturma-servis-kart" onclick="servisOturmaModalAc('${s.id}')">
      <div style="flex:1;">
        <strong>${escapeHtml(s.servisAdi || 'Servis')}</strong>
        <span class="badge badge-${s.durum === 'Pasif' ? 'gray' : 'sage'}" style="margin-left:6px;">${escapeHtml(s.durum || 'Aktif')}</span>
        ${sablonObj ? `<span style="margin-left:6px;font-size:12px;color:#6b7280;">${sablonObj.ikon} ${sablonObj.ad}</span>` : ''}
        ${s.plaka ? `<span style="margin-left:6px;font-size:12px;color:#6b7280;">🚘 ${escapeHtml(s.plaka)}</span>` : ''}
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
   RAPOR — soRaporGovdeHtml (raporlama.js tarafından kullanılır)
   ================================================================ */
function soRaporGovdeHtml(servis, plan) {
  if (!plan || !plan.yerlesim || !plan.yerlesim.length) return '';

  const yerlesim  = plan.yerlesim.map(y => ({ aktif: true, ...y }));
  const koltuklar = plan.koltuklar || [];
  const sablon    = plan.sablon || 'ducato';
  const buyuk     = sablon === 'buyuk';
  const bugun     = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

  const koltukMap = {};
  koltuklar.forEach(k => { koltukMap[k.no] = k; });

  /* Sadece aktif yuvalar */
  const siraMap = {};
  yerlesim.forEach((yuva, idx) => {
    if (yuva.aktif === false) return;
    const no = idx + 1;
    if (!siraMap[yuva.sira]) siraMap[yuva.sira] = [];
    siraMap[yuva.sira].push({ ...yuva, no, koltuk: koltukMap[no] || null });
  });
  const siralar = Object.keys(siraMap).map(Number).sort((a, b) => a - b);

  /* ── Koltuk boyutu dinamik hesapla ──
     A4 yazdırılabilir yükseklik ~245mm = ~927px @96dpi
     Header ~70px, baslik ~30px, padding ~20px → araç için ~800px
     Her sıra: koltuk + 6px gap. Şoför sırası + arka sıra da var. */
  const toplamSira = siralar.length; // şoför + normal + arka
  const aracPaddingDikey = 80; // top/bottom padding + cam bölümü
  const kullanilabilirH  = 800 - aracPaddingDikey;
  const hesaplananK = Math.floor((kullanilabilirH - (toplamSira - 1) * 5) / toplamSira);
  const K = Math.min(62, Math.max(36, hesaplananK)); // 36–62px arası
  const G = Math.round(K * 0.07); // gap = %7 koltuk boyutu

  /* Şablon sütun sayıları */
  // Ducato: sol 2, sağ 1 | Büyük: sol 2, sağ 2
  const solSutun = 2;
  const sagSutun = buyuk ? 2 : 1;
  const korW     = Math.round(K * 0.3);

  /* Araç genişliği */
  const aracIcW  = solSutun * K + G * (solSutun - 1) + korW + sagSutun * K + G * (sagSutun - 1);
  const aracW    = aracIcW + K * 0.75; // padding her iki taraf

  /* CSS stil değerleri */
  const S = {
    K, G, korW,
    fontAd:   Math.max(7, Math.round(K * 0.155)),
    fontSinif: Math.max(6, Math.round(K * 0.115)),
    fontSofor: Math.max(8, Math.round(K * 0.17)),
    soforIkon: Math.max(18, Math.round(K * 0.55)),
    borderR:  Math.round(K * 0.18),
  };

  /* Sol grup min-width — hizalama için sabit */
  const solGrpW = solSutun * K + G * (solSutun - 1);
  const sagGrpW = sagSutun * K + G * (sagSutun - 1);

  const koltukKutu = (yuva, forceWidth) => {
    if (yuva.soforYani) return '';
    const { konum, koltuk } = yuva;
    const dolu    = koltuk && (koltuk.ogrenciId || koltuk.ogrenciAdi);
    const rezerve = koltuk && koltuk.rezerve && !dolu;
    const ad      = dolu ? (koltuk.ogrenciAdi || '') : '';
    let sinifAdi  = '';
    if (dolu && koltuk.ogrenciId) {
      const v = (typeof veliler !== 'undefined') ? veliler.find(x => x.id === koltuk.ogrenciId) : null;
      if (v) {
        const sn = (typeof siniflar !== 'undefined') ? siniflar.find(s => s.id === v.sinifId) : null;
        sinifAdi = sn ? sn.ad : '';
      }
    }
    const bg  = dolu ? '#22c55e' : rezerve ? '#3b82f6' : '#f3f4f6';
    const brd = dolu ? '#16a34a' : rezerve ? '#2563eb' : '#d1d5db';
    const clr = (dolu || rezerve) ? '#fff' : '#111';
    let kolcakStyle = '';
    if (konum === 'sol-dis' || konum === 'sol-tek') kolcakStyle = `border-left:${Math.ceil(S.K*0.09)}px solid #a07840;border-radius:${S.borderR}px ${Math.ceil(S.borderR*0.3)}px ${Math.ceil(S.borderR*0.3)}px ${S.borderR}px;`;
    if (konum === 'sag-dis') kolcakStyle = `border-right:${Math.ceil(S.K*0.09)}px solid #a07840;border-radius:${Math.ceil(S.borderR*0.3)}px ${S.borderR}px ${S.borderR}px ${Math.ceil(S.borderR*0.3)}px;`;
    const w = forceWidth || S.K;
    return `<div style="width:${w}px;min-height:${S.K}px;border-radius:${S.borderR}px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${bg};border:2px solid ${brd};color:${clr};flex-shrink:0;padding:3px 2px;${kolcakStyle}">
      ${ad       ? `<span style="font-size:${S.fontAd}px;line-height:1.25;text-align:center;font-weight:700;word-break:break-word;white-space:normal;overflow-wrap:break-word;display:block;max-width:${w-6}px;">${escapeHtml(ad)}</span>` : ''}
      ${sinifAdi ? `<span style="font-size:${S.fontSinif}px;line-height:1.1;text-align:center;opacity:0.9;display:block;margin-top:2px;">${escapeHtml(sinifAdi)}</span>` : ''}
    </div>`;
  };

  const kapıHtml = (metin) =>
    `<div style="font-size:${Math.max(9,S.K*0.17)}px;font-weight:800;color:#92400e;display:flex;align-items:center;padding:0 3px;white-space:nowrap;">${metin}</div>`;

  let html = `<div style="width:100%;display:flex;justify-content:center;align-items:flex-start;">
  <div style="display:flex;flex-direction:column;align-items:center;background:#f5e642;border:3px solid #c8a800;border-radius:${Math.round(aracW*0.12)}px ${Math.round(aracW*0.12)}px ${Math.round(aracW*0.06)}px ${Math.round(aracW*0.06)}px;padding:0 ${Math.round(aracW*0.06)}px ${Math.round(S.K*0.4)}px;width:${Math.round(aracW)}px;">`;

  /* Ön cam + plaka */
  html += `<div style="width:100%;display:flex;flex-direction:column;align-items:center;padding:${Math.round(S.K*0.25)}px 0 ${Math.round(S.K*0.18)}px;border-bottom:2.5px solid #c8a800;margin-bottom:${Math.round(S.K*0.18)}px;">
    <div style="width:55%;height:${Math.round(S.K*0.38)}px;background:linear-gradient(180deg,#b3d9f7,#d6eeff);border:2px solid #93c5e8;border-radius:${Math.round(S.K*0.12)}px ${Math.round(S.K*0.12)}px 0 0;"></div>
    ${servis.plaka ? `<div style="font-size:${Math.round(S.K*0.2)}px;font-weight:900;letter-spacing:2px;color:#92400e;background:#fff8dc;border:1.5px solid #c8a800;border-radius:4px;padding:2px 8px;margin-top:4px;">${escapeHtml(servis.plaka)}</div>` : ''}
  </div>`;

  /* Koltuk bölümü */
  html += `<div style="display:flex;flex-direction:column;gap:${G}px;width:100%;align-items:center;">`;

  siralar.forEach(siraIdx => {
    const yuvalar = siraMap[siraIdx];
    const arkaVar = yuvalar.some(y => y.konum === 'arka');

    if (arkaVar) {
      const aktifArka = yuvalar.filter(y => !y.soforYani);
      html += `<div style="display:flex;justify-content:center;gap:${G}px;border-top:2px dashed #c8a800;padding-top:${Math.round(S.K*0.15)}px;margin-top:${Math.round(S.K*0.08)}px;width:100%;">`;
      aktifArka.forEach(y => { html += koltukKutu(y); });
      html += `</div>`;
      return;
    }

    const soller    = yuvalar.filter(y => ['sol-tek','sol-dis','sol-ic'].includes(y.konum));
    const saglar    = yuvalar.filter(y => y.konum.startsWith('sag') && !y.soforYani);
    const kapiSagVar = yuvalar.some(y => y.kapiSag);

    /* Şoför sırası */
    if (siraIdx === 0) {
      html += `<div style="display:flex;align-items:center;gap:${korW}px;width:100%;">`;
      // Şoför ikonu — sol grup genişliğinde
      html += `<div style="width:${solGrpW}px;min-width:${solGrpW}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
        <span style="font-size:${S.soforIkon}px;line-height:1;">${'👨‍✈️'}</span>
        <span style="font-size:${S.fontSofor}px;color:#92400e;font-weight:700;margin-top:2px;white-space:nowrap;max-width:${solGrpW+10}px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(servis.soforAdi || 'Şoför')}</span>
      </div>`;
      // Sağ: giriş veya koltuklar
      html += `<div style="display:flex;gap:${G}px;min-width:${sagGrpW}px;">`;
      if (kapiSagVar && saglar.length === 0) {
        html += kapıHtml('│GİRİŞ│');
      } else {
        saglar.forEach(y => { html += koltukKutu(y); });
      }
      html += `</div></div>`;
      return;
    }

    /* Normal sıra — sol + koridor + sağ, hepsi sabit genişlik */
    html += `<div style="display:flex;align-items:flex-start;width:100%;">`;
    // Sol grup — her zaman solGrpW genişliğinde
    html += `<div style="display:flex;gap:${G}px;width:${solGrpW}px;min-width:${solGrpW}px;flex-shrink:0;">`;
    soller.forEach(y => { html += koltukKutu(y); });
    html += `</div>`;
    // Koridor
    html += `<div style="width:${korW}px;min-width:${korW}px;flex-shrink:0;"></div>`;
    // Sağ
    if (kapiSagVar && saglar.length === 0) {
      // Büyük servis arka kapı: sağda hiç koltuk yok, sadece kapı
      html += `<div style="display:flex;gap:${G}px;width:${sagGrpW}px;min-width:${sagGrpW}px;align-items:center;">`;
      html += kapıHtml('│KAPI│');
      html += `</div>`;
    } else {
      html += `<div style="display:flex;gap:${G}px;width:${sagGrpW}px;min-width:${sagGrpW}px;flex-shrink:0;">`;
      saglar.forEach(y => { html += koltukKutu(y); });
      html += `</div>`;
      if (kapiSagVar) html += kapıHtml('│KAPI│');
    }
    html += `</div>`;
  });

  html += `</div>`; // koltuk bölümü
  html += `</div></div>`; // araç + sarmal

  return html;
}
