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
      y.push({ sira: 0, konum: 'sag-ic',  aktif: true });
      y.push({ sira: 0, konum: 'sag-dis', aktif: true });
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
            <button class="btn btn-ghost btn-sm" onclick="setTimeout(() => { toast('Rapor Al tıklandı'); _soRaporDogrudan('${servisId}'); }, 100)">🖨️ Rapor Al</button>
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
  toast('Rapor oluşturuluyor...');
  
  const servis = (typeof servisler !== 'undefined') ? servisler.find(x => x.id === servisId) : null;
  const plan   = servisOturmaPlani.find(p => p.servisId === servisId);

  if (!servis) { toast('❌ Servis bilgisi bulunamadı.'); return; }
  if (!plan || !plan.yerlesim || !plan.yerlesim.length) {
    toast('❌ Oturma planı henüz oluşturulmamış.'); return;
  }

  let govde = '';
  try {
    govde = soRaporGovdeHtml(servis, plan);
  } catch(e) {
    console.error('soRaporGovdeHtml hatası:', e);
    toast('❌ Rapor oluşturulurken hata: ' + e.message);
    return;
  }

  if (!govde) { toast('❌ Rapor içeriği oluşturulamadı.'); return; }

  const baslik = `🚌 ${servis.servisAdi || 'Servis'}${servis.plaka ? ' · 🚘 ' + servis.plaka : ''}`;

  if (typeof _raporPenceresiniAc !== 'function') {
    toast('❌ Rapor modülü bulunamadı. Sayfayı yenileyip tekrar deneyin.');
    return;
  }
  
  toast('✓ Rapor açılıyor...');
  _raporPenceresiniAc(govde, baslik, { logoGoster: true, servisRaporu: true, ortaliBaslik: true });
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
  const yerlesim  = (mevcut?.yerlesim?.length)
    ? mevcut.yerlesim.map(y => ({ aktif: true, ...y }))
    : sablonObj.yerlesimUret();
  const buyuk     = sablon === 'buyuk';
  const servislerData = (typeof servisler !== 'undefined') ? servisler.find(x => x.id === servisId) : null;

  /* ── CSS Grid şablonu ──
     Ducato: [sol-dis][sol-ic] [kor] [sag-dis]     → 3 koltuk sütunu + koridor
     Büyük:  [sol-dis][sol-ic] [kor] [sag-ic][sag-dis] → 4 koltuk sütunu + koridor
     Her koltuk: 40px, koridor: 14px, gap: 3px */
  const K = 40, KOR = 14, GAP = 3;
  const solKonumlar = buyuk ? ['sol-dis','sol-ic'] : ['sol-dis','sol-ic','sol-tek'];
  const sagKonumlar = buyuk ? ['sag-ic','sag-dis'] : ['sag-dis'];

  // Grid sütun tanımı: solKoltuklar + koridor + sagKoltuklar
  const solSayisi = buyuk ? 2 : 2;
  const sagSayisi = buyuk ? 2 : 1;
  const gridCols  = `repeat(${solSayisi},${K}px) ${KOR}px repeat(${sagSayisi},${K}px)`;

  /* Sıralara göre grupla */
  const siraMap = {};
  yerlesim.forEach((yuva, idx) => {
    if (!siraMap[yuva.sira]) siraMap[yuva.sira] = [];
    siraMap[yuva.sira].push({ ...yuva, no: idx + 1, koltuk: koltuklar.find(k => k.no === idx + 1) || null });
  });
  const siralar = Object.keys(siraMap).map(Number).sort((a, b) => a - b);

  /* Koltuk HTML — grid hücresinde sabit konum */
  const koltukHucre = (yuva) => {
    const { no, konum, koltuk, aktif, soforYani, kapiSag } = yuva;
    if (soforYani || konum === 'arka') return '';

    // Hangi grid sütununa gideceğini belirle
    let gridCol = null;
    if (konum === 'sol-dis' || konum === 'sol-tek') gridCol = 1;
    else if (konum === 'sol-ic') gridCol = 2;
    else if (konum === 'sag-ic') gridCol = buyuk ? 4 : null;
    else if (konum === 'sag-dis') gridCol = buyuk ? 5 : 4;

    if (gridCol === null) return '';

    // Pasif: "+" ile geri ekleme placeholder'ı
    if (aktif === false) {
      let pcls = 'so-koltuk so-placeholder';
      if (konum === 'sol-dis' || konum === 'sol-tek') pcls += ' so-kolcak-sol';
      if (konum === 'sag-dis') pcls += ' so-kolcak-sag';
      return `<div class="${pcls}" style="grid-column:${gridCol};" onclick="soYuvaAktifEt(${no},'${servisId}','${sablon}')" title="Koltuk ekle">+</div>`;
    }

    // Kapı göstergesi — koltuk yok, kapı var
    if (kapiSag && !koltuk && !aktif) return '';

    const dolu    = koltuk && (koltuk.ogrenciId || koltuk.ogrenciAdi);
    const rezerve = koltuk && koltuk.rezerve && !dolu;
    const ad      = dolu ? (koltuk.ogrenciAdi || '') : '';
    const kisa    = ad.length > 8 ? ad.substring(0, 7) + '…' : ad;

    let cls = 'so-koltuk';
    if (dolu)    cls += ' so-dolu';
    if (rezerve) cls += ' so-rezerve';
    if (konum === 'sol-dis' || konum === 'sol-tek') cls += ' so-kolcak-sol';
    if (konum === 'sag-dis') cls += ' so-kolcak-sag';

    const title = dolu ? `${no}. — ${ad}` : `${no}. Koltuk`;

    return `<div class="${cls}" style="grid-column:${gridCol};"
      onclick="soKoltukTikla(${no},'${servisId}','${sablon}')" title="${escapeHtml(title)}">
      ${kisa ? `<span class="so-k-ad">${escapeHtml(kisa)}</span>` : ''}
    </div>`;
  };

  /* Koridor hücresi */
  const koridorHucre = (kapiMetni) => {
    if (kapiMetni) {
      return `<div style="grid-column:${solSayisi+1};display:flex;align-items:center;justify-content:center;">
        <div class="so-kapi-gosterge">│<span>${kapiMetni}</span>│</div>
      </div>`;
    }
    return `<div style="grid-column:${solSayisi+1};width:${KOR}px;"></div>`;
  };

  /* Arka sıra — tüm koltuklar ortalanmış sabit grid */
  const arkaSiraHtml = (yuvalar) => {
    let h = `<div class="so-sira so-arka-sira">`;
    // Arka sıra: sabit 4 yuva — pasifler "+" placeholder, aktifler normal koltuk
    yuvalar.forEach(y => {
      h += _soKoltukHtml(y, servisId, sablon);
    });
    h += `</div>`;
    return h;
  };

  let html = `<div class="so-arac${buyuk ? ' so-arac-buyuk' : ''}">`;
  html += `<div class="so-arac-on"><div class="so-on-cam"></div>${servislerData?.plaka ? `<div class="so-plaka">${escapeHtml(servislerData.plaka)}</div>` : ''}</div>`;
  html += `<div class="so-koltuk-bolum">`;

  siralar.forEach(siraIdx => {
    const yuvalar = siraMap[siraIdx];
    const arkaVar = yuvalar.some(y => y.konum === 'arka');

    /* Arka sıra */
    if (arkaVar) {
      html += arkaSiraHtml(yuvalar);
      return;
    }

    const kapiSagVar = yuvalar.some(y => y.kapiSag);
    const saglarVar  = yuvalar.some(y => sagKonumlar.includes(y.konum));

    /* Şoför sırası */
    if (siraIdx === 0) {
      const solGrpW = solSayisi * K + (solSayisi - 1) * GAP;
      html += `<div class="so-sira so-sofor-sirasi">`;
      html += `<div class="so-sofor-koltuk" style="width:${solGrpW}px;min-width:${solGrpW}px;">👨‍✈️<span>${escapeHtml(servislerData?.soforAdi || 'Şoför')}</span></div>`;
      html += `<div style="width:${KOR}px;flex-shrink:0;"></div>`;
      html += `<div style="display:flex;gap:${GAP}px;">`;
      if (sablon === 'buyuk' && kapiSagVar && !saglarVar) {
        html += `<div class="so-kapi-gosterge">│<span>GİRİŞ</span>│</div>`;
      } else {
        yuvalar.filter(y => (y.konum === 'sag-ic' || y.konum === 'sag-dis') && !y.soforYani).forEach(y => {
          html += _soKoltukHtml(y, servisId, sablon);
        });
      }
      html += `</div></div>`;
      return;
    }

    /* Normal sıralar — CSS Grid ile tamamen sabit */
    const kapiMetni = kapiSagVar && !saglarVar ? 'KAPI' : null;
    html += `<div class="so-sira" style="display:grid;grid-template-columns:${gridCols};gap:${GAP}px;width:100%;">`;

    // Sol koltuklar
    yuvalar.filter(y => solKonumlar.includes(y.konum)).forEach(y => { html += koltukHucre(y); });

    // Koridor (kapı varsa metin)
    html += koridorHucre(kapiMetni);

    // Sağ koltuklar
    yuvalar.filter(y => sagKonumlar.includes(y.konum)).forEach(y => { html += koltukHucre(y); });

    // Sağ kapı (hem koltuk hem kapı varsa)
    if (kapiSagVar && saglarVar) {
      html += `<div style="grid-column:${solSayisi+sagSayisi+2};display:flex;align-items:center;">
        <div class="so-kapi-gosterge so-kapi-arka">│<span>KAPI</span>│</div>
      </div>`;
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

  /* Tüm yuvalar siraMap'e eklenir — pasifler görünmez placeholder olarak yer tutar */
  const siraMap = {};
  yerlesim.forEach((yuva, idx) => {
    const no = idx + 1;
    if (!siraMap[yuva.sira]) siraMap[yuva.sira] = [];
    siraMap[yuva.sira].push({ ...yuva, no, koltuk: koltukMap[no] || null });
  });
  const siralar = Object.keys(siraMap).map(Number).sort((a, b) => a - b);

  /* ── Koltuk boyutu: A4'e sığacak şekilde optimize ──
     @page { size:A4; margin: 5mm 7mm }  (toplam sayfa 210×297, marjın 7mm → 196×287)
     Kullanılabilir alan: 196mm × 287mm
     Rapor başlık: ~11mm
     Ön cam + plaka bölümü: ~7mm
     Alt margin: 3mm
     Koltuk bölgesine kalan: 287 - 11 - 7 - 3 = 266mm
     
     Araç yan padding: 4mm × 2 = 8mm  →  iç genişlik: 188mm
     Ducato: sol2 + gap(1) + kor + sag1
     Grid sütunları: KW + KW + G + KorW + KW = 3*KW + G + KorW
     Eğer G = KW*0.08, KorW = KW*0.32 ise:
     188 = KW * (3 + 0.08 + 0.32) = KW * 3.40
     KW = 55.3mm (çok büyük!)
     
     Çözüm: Daha kompakt yapı
     - Padding arttır: G = KW*0.05, KorW = KW*0.25
     188 = KW * (3 + 0.05 + 0.25) = KW * 3.30
     KW = 57mm (hala çok)
     
     Gerçekçi: Araç genişliğini 170mm hedefle
     170 = KW * 3.30  → KW = 51.5mm (makul)
     
     Ama bu durumda sayfayı doldurmak zor. 
     Pragmatik çözüm: KW = 35mm hedefle, gap ve padding'i sıkılaştır
  */
  const solSutun   = 2;
  const sagSutun   = buyuk ? 2 : 1;
  const toplamSira = siralar.length;

  // Target koltuk genişliği: 35-38mm (makul boyut)
  const targetKW = 36;
  
  // Bundan grid genişliğini hesapla
  const G_Ratio = 0.05;  // gap, KW'nin %5'i
  const KorW_Ratio = 0.25; // koridor, KW'nin %25'i
  
  // Gerçek grid genişliği
  const gridW = targetKW * (solSutun + sagSutun + G_Ratio * (solSutun - 1) + KorW_Ratio);
  
  // Araç toplam genişliği (padding ile)
  const aracPadYan = 3;
  const aracToplamW = gridW + aracPadYan * 2;
  
  // Sayfaya sığacak mı kontrol et, gerekirse KW küçült
  const sayfaW = 196 - aracPadYan * 2;  // 190mm net
  const maxGridW = sayfaW;
  
  const KW = gridW <= maxGridW ? targetKW : (sayfaW / (solSutun + sagSutun + G_Ratio * (solSutun - 1) + KorW_Ratio));
  const G = KW * G_Ratio;
  const korW = KW * KorW_Ratio;

  const sayfaH = 287;  // mm toplam yükseklik
  const headerMM = 11;   // rapor başlık
  const onCamMM = 7;    // ön cam + plaka
  const altPadMM = 3;   // alt boşluk

  const kullH = sayfaH - headerMM - onCamMM - altPadMM;
  const KH = Math.max(12, (kullH - (toplamSira - 1) * G) / toplamSira);

  // Araç toplam genişliği
  const aracIcW = solSutun * KW + G * (solSutun - 1) + korW
    + sagSutun * KW + G * (sagSutun > 1 ? sagSutun - 1 : 0);
  const aracPad = aracPadYan;
  const aracW   = aracIcW + aracPad * 2; // mm

  /* Sol/sağ grup genişliği mm */
  const solGrpW = solSutun * KW + G * (solSutun - 1);
  const sagGrpW = sagSutun * KW + G * (sagSutun > 1 ? sagSutun - 1 : 0);

  /* Yazı boyutları — okunabilir ve makul */
  const fontAdPt    = Math.min(10, Math.max(8, KW * 0.22));     // 8-10pt
  const fontSinifPt = Math.min(7.5,  Math.max(6, KW * 0.16));   // 6-7.5pt
  const fontSoforPt = Math.min(9, Math.max(7.5, KW * 0.22));    // 7.5-9pt
  const soforIkonMM = Math.min(4.5, Math.max(3.5, KW * 0.12));  // 3.5-4.5mm
  const borderRmm   = KW * 0.06;
  const kolcakW     = KW * 0.04;

  const m = (v) => `${v.toFixed(2)}mm`; // mm helper

  const koltukKutu = (yuva) => {
    if (yuva.soforYani) return '';

    if (yuva.aktif === false) {
      return `<div style="width:${m(KW)};height:${m(KH)};flex-shrink:0;visibility:hidden;display:inline-flex;"></div>`;
    }

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
    if (konum === 'sol-dis' || konum === 'sol-tek')
      kolcakStyle = `border-left:${m(kolcakW)} solid #a07840;border-radius:${m(borderRmm)} ${m(borderRmm*0.3)} ${m(borderRmm*0.3)} ${m(borderRmm)};`;
    if (konum === 'sag-dis')
      kolcakStyle = `border-right:${m(kolcakW)} solid #a07840;border-radius:${m(borderRmm*0.3)} ${m(borderRmm)} ${m(borderRmm)} ${m(borderRmm*0.3)};`;

    return `<div style="width:${m(KW)};height:${m(KH)};border-radius:${m(borderRmm)};display:flex;flex-direction:column;align-items:center;justify-content:center;background:${bg};border:0.5mm solid ${brd};color:${clr};flex-shrink:0;padding:0.7mm 0.4mm;overflow:hidden;${kolcakStyle}">
      ${ad ? `<span style="font-size:${fontAdPt.toFixed(1)}pt;line-height:1.15;text-align:center;font-weight:700;word-break:break-word;white-space:normal;overflow-wrap:break-word;display:block;">${escapeHtml(ad)}</span>` : ''}
      ${sinifAdi ? `<span style="font-size:${fontSinifPt.toFixed(1)}pt;line-height:1.1;text-align:center;opacity:0.9;display:block;margin-top:0.15mm;">${escapeHtml(sinifAdi)}</span>` : ''}
    </div>`;
  };

  const kapıHtml = (metin) =>
    `<div style="font-size:${Math.max(4,KW*0.14).toFixed(1)}mm;font-weight:800;color:#92400e;display:flex;align-items:center;padding:0 0.5mm;white-space:nowrap;">${metin}</div>`;

  let html = `<div style="width:100%;display:flex;justify-content:center;align-items:flex-start;">
  <div style="display:flex;flex-direction:column;align-items:center;background:#f5e642;border:0.8mm solid #c8a800;border-radius:${m(aracW*0.1)} ${m(aracW*0.1)} ${m(aracW*0.05)} ${m(aracW*0.05)};padding:0 ${m(aracPad)} ${m(altPadMM)};width:${m(aracW)};">`;

  /* Ön cam + plaka */
  html += `<div style="width:100%;display:flex;flex-direction:column;align-items:center;padding:${m(KW*0.10)} 0 ${m(KW*0.08)};border-bottom:0.5mm solid #c8a800;margin-bottom:${m(KH*0.12)};">
    <div style="width:52%;height:${m(KW*0.18)};background:linear-gradient(180deg,#b3d9f7,#d6eeff);border:0.4mm solid #93c5e8;border-radius:${m(KW*0.05)} ${m(KW*0.05)} 0 0;"></div>
    ${servis.plaka ? `<div style="font-size:${(KW*0.11).toFixed(1)}mm;font-weight:900;letter-spacing:0.25mm;color:#92400e;background:#fff8dc;border:0.3mm solid #c8a800;border-radius:0.7mm;padding:0.15mm 0.7mm;margin-top:0.4mm;">${escapeHtml(servis.plaka)}</div>` : ''}
  </div>`;

  /* Koltuk bölümü */
  html += `<div style="display:flex;flex-direction:column;gap:${m(G)};width:100%;align-items:center;">`;

  siralar.forEach(siraIdx => {
    const yuvalar = siraMap[siraIdx];
    const arkaVar = yuvalar.some(y => y.konum === 'arka');

    if (arkaVar) {
      // Arka sıra için de grid kullan (4 koltuk eşit şekilde dağıt)
      const arkaRGrid = `repeat(4,${m(KW)})`;
      html += `<div style="display:grid;grid-template-columns:${arkaRGrid};gap:${m(G)};border-top:0.5mm dashed #c8a800;padding-top:${m(KH*0.12)};margin-top:${m(KH*0.06)};justify-items:center;">`;
      yuvalar.filter(y => !y.soforYani).forEach((y, idx) => { 
        html += `<div style="grid-column:${idx+1};">${koltukKutu(y)}</div>`; 
      });
      html += `</div>`;
      return;
    }

    const solKonR = ['sol-tek','sol-dis','sol-ic'];
    const sagKonR = buyuk ? ['sag-ic','sag-dis'] : ['sag-dis'];
    const soller   = yuvalar.filter(y => solKonR.includes(y.konum));
    const saglar   = yuvalar.filter(y => sagKonR.includes(y.konum) && !y.soforYani);
    const kapiSagVar = yuvalar.some(y => y.kapiSag);

    if (siraIdx === 0) {
      // Birinci sıra: şoför + sağdaki 2 koltuk (grid düzeni)
      const rGrid0 = `${m(KW)} ${m(korW)} ${m(KW)} ${m(KW)}`;
      html += `<div style="display:grid;grid-template-columns:${rGrid0};gap:${m(G)};align-items:center;">`;
      
      // Şoför alanı (col 1)
      html += `<div style="grid-column:1;width:${m(KW)};height:${m(KH)};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden;">
        <span style="font-size:${m(soforIkonMM)};line-height:1;">👨‍✈️</span>
        <span style="font-size:${fontSoforPt.toFixed(1)}pt;color:#92400e;font-weight:700;margin-top:0.3mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${escapeHtml(servis.soforAdi || 'Şoför')}</span>
      </div>`;
      
      // Koridor (col 2)
      html += `<div style="grid-column:2;display:flex;align-items:center;justify-content:center;">`;
      if (kapiSagVar && yuvalar.filter(y => (y.konum === 'sag-ic' || y.konum === 'sag-dis') && y.aktif !== false).length === 0) {
        html += kapıHtml('│GİRİŞ│');
      }
      html += `</div>`;
      
      // Sağ koltuklar (col 3-4)
      const row0Saglar = yuvalar.filter(y => (y.konum === 'sag-ic' || y.konum === 'sag-dis') && !y.soforYani);
      row0Saglar.forEach((y, idx) => { 
        html += `<div style="grid-column:${3 + idx};">${koltukKutu(y)}</div>`; 
      });
      
      html += `</div>`;
      return;
    }

    const rGrid = `repeat(${solSutun},${m(KW)}) ${m(korW)} repeat(${sagSutun},${m(KW)})`;
    html += `<div style="display:grid;grid-template-columns:${rGrid};gap:${m(G)};">`;

    const renderKoltuk = (y, col) => {
      if (y.aktif === false) return `<div style="grid-column:${col};width:${m(KW)};height:${m(KH)};visibility:hidden;"></div>`;
      const dolu = y.koltuk && (y.koltuk.ogrenciId || y.koltuk.ogrenciAdi);
      const rezerve = y.koltuk && y.koltuk.rezerve && !dolu;
      const ad = dolu ? (y.koltuk.ogrenciAdi || '') : '';
      let sn = '';
      if (dolu && y.koltuk.ogrenciId) {
        const v2 = (typeof veliler !== 'undefined') ? veliler.find(x => x.id === y.koltuk.ogrenciId) : null;
        if (v2) { const s2 = (typeof siniflar !== 'undefined') ? siniflar.find(s => s.id === v2.sinifId) : null; sn = s2 ? s2.ad : ''; }
      }
      const bg  = dolu ? '#22c55e' : rezerve ? '#3b82f6' : '#f3f4f6';
      const brd = dolu ? '#16a34a' : rezerve ? '#2563eb' : '#d1d5db';
      const clr = (dolu||rezerve) ? '#fff' : '#111';
      const isSolDis = y.konum === 'sol-dis' || y.konum === 'sol-tek';
      const isSagDis = y.konum === 'sag-dis';
      const cs = isSolDis
        ? `border-left:${m(kolcakW)} solid #a07840;border-radius:${m(borderRmm)} ${m(borderRmm*0.3)} ${m(borderRmm*0.3)} ${m(borderRmm)};`
        : isSagDis
        ? `border-right:${m(kolcakW)} solid #a07840;border-radius:${m(borderRmm*0.3)} ${m(borderRmm)} ${m(borderRmm)} ${m(borderRmm*0.3)};`
        : '';
      return `<div style="grid-column:${col};width:${m(KW)};height:${m(KH)};border-radius:${m(borderRmm)};display:flex;flex-direction:column;align-items:center;justify-content:center;background:${bg};border:0.5mm solid ${brd};color:${clr};padding:0.7mm 0.4mm;overflow:hidden;${cs}">
        ${ad ? `<span style="font-size:${fontAdPt.toFixed(1)}pt;line-height:1.15;text-align:center;font-weight:700;word-break:break-word;white-space:normal;display:block;">${escapeHtml(ad)}</span>` : ''}
        ${sn ? `<span style="font-size:${fontSinifPt.toFixed(1)}pt;line-height:1.1;text-align:center;opacity:.9;display:block;margin-top:0.15mm;">${escapeHtml(sn)}</span>` : ''}
      </div>`;
    };

    soller.forEach(y => {
      const col = (y.konum === 'sol-dis' || y.konum === 'sol-tek') ? 1 : 2;
      html += renderKoltuk(y, col);
    });

    const kapiSadece = kapiSagVar && saglar.filter(y => y.aktif !== false).length === 0;
    html += `<div style="grid-column:${solSutun+1};display:flex;align-items:center;justify-content:center;">`;
    if (kapiSadece) html += kapıHtml('│KAPI│');
    html += `</div>`;

    saglar.forEach(y => {
      const col = buyuk ? (y.konum === 'sag-ic' ? solSutun+2 : solSutun+3) : solSutun+2;
      html += renderKoltuk(y, col);
    });

    html += `</div>`;
  });

  html += `</div>`; // koltuk bölümü
  html += `</div></div>`; // araç + sarmal

  return html;
}
