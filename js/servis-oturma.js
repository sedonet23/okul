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
      // Sıra 0: şoför solda (soforYani=true), sağda 2 koltuk
      y.push({ sira: 0, konum: 'sag-ic',  soforYani: false, aktif: true });
      y.push({ sira: 0, konum: 'sag-dis', soforYani: false, aktif: true });
      // Sıra 1: kapı sırası — sol 2 koltuk, sağ yok (kapiSag)
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
  let yerlesim    = (mevcut?.yerlesim?.length)
    ? mevcut.yerlesim.map(y => ({ aktif: true, ...y }))
    : sablonObj.yerlesimUret();
  const buyuk     = sablon === 'buyuk';

  // Ducato eski veri migration: sıra 0'da sol-tek varsa kaldır, sag-ic yoksa ekle
  if (!buyuk) {
    const sira0 = yerlesim.filter(y => y.sira === 0);
    const hasSolTek = sira0.some(y => y.konum === 'sol-tek');
    const hasSagIc  = sira0.some(y => y.konum === 'sag-ic');
    if (hasSolTek || !hasSagIc) {
      yerlesim = yerlesim.filter(y => !(y.sira === 0 && y.konum === 'sol-tek'));
      if (!hasSagIc) {
        // sag-dis'ten önce sag-ic ekle
        const sagDisIdx = yerlesim.findIndex(y => y.sira === 0 && y.konum === 'sag-dis');
        if (sagDisIdx >= 0) {
          yerlesim.splice(sagDisIdx, 0, { sira: 0, konum: 'sag-ic', aktif: true });
        }
      }
    }
  }

  const servislerData = (typeof servisler !== 'undefined') ? servisler.find(x => x.id === servisId) : null;

  /* ── CSS Grid şablonu ──
     Ducato: [sol-dis][sol-ic] [kor] [sag-dis]     → 3 koltuk sütunu + koridor
     Büyük:  [sol-dis][sol-ic] [kor] [sag-ic][sag-dis] → 4 koltuk sütunu + koridor
     Her koltuk: 40px, koridor: 14px, gap: 3px */
  const K = 40, KOR = 14, GAP = 3;
  const solKonumlar = buyuk ? ['sol-dis','sol-ic'] : ['sol-dis','sol-ic'];
  // Ducato: normal sıralarda sag-dis tek, şoför sırasında sag-ic+sag-dis
  const sagKonumlar = buyuk ? ['sag-ic','sag-dis'] : ['sag-dis'];
  const sagKonumlar0 = buyuk ? ['sag-ic','sag-dis'] : ['sag-ic','sag-dis']; // sıra 0 için

  // Grid sütun tanımı: solKoltuklar + koridor + sagKoltuklar
  const solSayisi = 2;
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

    // Pasif: görünmez yer tutucu
    if (aktif === false) {
      return `<div style="grid-column:${gridCol};width:${K}px;height:${K}px;visibility:hidden;"></div>`;
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

  /* Arka sıra — tüm koltuklar ortalanmış */
  const arkaSiraHtml = (yuvalar) => {
    let h = `<div class="so-sira so-arka-sira">`;
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
        // Ducato: sıra 0'da sag-ic + sag-dis — eski Firestore verisinde sag-ic olmayabilir
        // sagKonumlar0 = ['sag-ic','sag-dis'] — her ikisini de filtrele
        const s0Saglar = yuvalar.filter(y => sagKonumlar0.includes(y.konum));
        // Eğer hiç yoksa veya sadece 1 tane varsa eski veri — yerinden göster
        s0Saglar.forEach(y => { html += _soKoltukHtml(y, servisId, sablon); });
        // Ducato'da beklenen 2 koltuk — eksik olanları görünmez placeholder ile tamamla
        if (!buyuk && s0Saglar.length < 2) {
          for (let i = s0Saglar.length; i < 2; i++) {
            html += `<div class="so-koltuk" style="opacity:0.3;cursor:default;" title="Şablonu yenileyin">?</div>`;
          }
        }
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
  // Aktif koltuk sayısı: arka hariç tüm aktif yuvalar (şoför sırası koltukları dahil, arka yok)
  const aktifKoltukSayisi = yerlesim.filter(y => y.aktif !== false && y.konum !== 'arka').length;
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
// Inline onclick için global erişim güvencesi
window.tasimaAltSekmeSec = tasimaAltSekmeSec;

/* Sekme butonlarına addEventListener ile de bağla (onclick yedeği) */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-tasima-sekme]').forEach(btn => {
    btn.addEventListener('click', () => tasimaAltSekmeSec(btn.getAttribute('data-tasima-sekme')));
  });
});

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
   A4 Yatay, gri araç, min 14pt isim, plaka ön kısımda
   ================================================================ */
function soRaporGovdeHtml(servis, plan) {
  if (!plan || !plan.yerlesim || !plan.yerlesim.length) return '';

  let yerlesim    = plan.yerlesim.map(y => ({ aktif: true, ...y }));
  const koltuklar = plan.koltuklar || [];
  const sablon    = plan.sablon || 'ducato';
  const buyuk     = sablon === 'buyuk';

  // Ducato eski veri migration
  if (!buyuk) {
    const sira0    = yerlesim.filter(y => y.sira === 0);
    const hasSolTek = sira0.some(y => y.konum === 'sol-tek');
    const hasSagIc  = sira0.some(y => y.konum === 'sag-ic');
    if (hasSolTek || !hasSagIc) {
      yerlesim = yerlesim.filter(y => !(y.sira === 0 && y.konum === 'sol-tek'));
      if (!hasSagIc) {
        const sagDisIdx = yerlesim.findIndex(y => y.sira === 0 && y.konum === 'sag-dis');
        if (sagDisIdx >= 0) yerlesim.splice(sagDisIdx, 0, { sira: 0, konum: 'sag-ic', aktif: true });
      }
    }
  }

  const koltukMap = {};
  koltuklar.forEach(k => { koltukMap[k.no] = k; });

  /* siraMap */
  const siraMap = {};
  yerlesim.forEach((yuva, idx) => {
    const no = idx + 1;
    if (!siraMap[yuva.sira]) siraMap[yuva.sira] = [];
    siraMap[yuva.sira].push({ ...yuva, no, koltuk: koltukMap[no] || null });
  });
  const siralar = Object.keys(siraMap).map(Number).sort((a, b) => a - b);

  /* ── Boyut hesabı: Dikey A4 (portrait) ──
     A4 portrait: 210mm × 297mm, margin 8mm → iç alan 194mm × 281mm
     Araç dikey çizilir: genişlik 194mm, yükseklik 281mm
     Header: 16mm → araç yüksekliği: 281 - 16 - 6(güvenlik) = 259mm
  */
  const solSutun   = 2;
  const sagSutun   = buyuk ? 2 : 1;
  const toplamSira = siralar.length;

  const headerMM   = 16;
  const aracPad    = 4;

  // Genişlik: portrait A4 iç alan 194mm
  const sayfaKullanW = 194; // mm
  const aracIcW_max  = sayfaKullanW - aracPad * 2; // 186mm

  const colToplam = solSutun + sagSutun;
  const katsayi_w = colToplam + 0.1 * (colToplam - 1) + 0.28;
  const K_w       = aracIcW_max / katsayi_w;

  // Yükseklik: portrait A4 iç alan 281mm → 281 - 16(header) - 6(güvenlik) = 259mm
  const kullH_max  = 281 - headerMM - 6; // 259mm
  const sabitMM    = 12 + 4; // cam+plaka + altPad
  const koltukH    = kullH_max - sabitMM; // 243mm
  const n          = toplamSira;
  // K*(1.6 + (n-2) + 1.3 + (n-1)*0.1) = koltukH
  const katsayi_h  = 1.6 + (n - 2) + 1.3 + (n - 1) * 0.1;
  const K_h        = koltukH / katsayi_h;

  const K    = Math.max(4, Math.min(K_w, K_h));
  const G    = K * 0.1;
  const korW = K * 0.28;
  const aracIcW = solSutun * K + G * (solSutun - 1) + korW + sagSutun * K + G * (sagSutun > 1 ? sagSutun - 1 : 0);
  const aracW   = aracIcW + aracPad * 2;

  const m = (v) => `${v.toFixed(2)}mm`;

  // Font boyutları — koltuk boyutuna göre sınırlı
  const fontAdPt    = Math.max(5, Math.min(8, K * 0.38));  // pt — öğrenci adı
  const fontSinifPt = Math.max(4, Math.min(6, K * 0.28));  // pt — sınıf adı
  const fontSoforPt = Math.max(5, Math.min(7, K * 0.32));  // pt — şoför adı
  const soforIkonMM = Math.max(6, K * 0.45);
  const borderRmm   = K * 0.12;
  const kolcakW     = K * 0.07;

  /* Sol/sağ grup genişliği */
  const solGrpW = solSutun * K + G * (solSutun - 1);
  const sagGrpW = sagSutun * K + G * (sagSutun > 1 ? sagSutun - 1 : 0);
  const toplamGenislik = solGrpW + korW + sagGrpW + G * 2;

  /* Koltuk kutusu — sabit height, overflow:hidden */
  const koltukKutu = (yuva) => {
    if (yuva.aktif === false) {
      return `<div style="width:${m(K)};height:${m(K)};flex-shrink:0;visibility:hidden;"></div>`;
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
    const bg  = dolu ? '#22c55e' : rezerve ? '#3b82f6' : '#e5e7eb';
    const brd = dolu ? '#16a34a' : rezerve ? '#2563eb' : '#9ca3af';
    const clr = (dolu || rezerve) ? '#fff' : '#111';
    let kolcakStyle = '';
    if (konum === 'sol-dis' || konum === 'sol-tek')
      kolcakStyle = `border-left:${m(kolcakW)} solid #6b7280;border-radius:${m(borderRmm)} ${m(borderRmm*0.3)} ${m(borderRmm*0.3)} ${m(borderRmm)};`;
    if (konum === 'sag-dis')
      kolcakStyle = `border-right:${m(kolcakW)} solid #6b7280;border-radius:${m(borderRmm*0.3)} ${m(borderRmm)} ${m(borderRmm)} ${m(borderRmm*0.3)};`;

    return `<div style="width:${m(K)};height:${m(K)};border-radius:${m(borderRmm)};display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;background:${bg};border:0.4mm solid ${brd};color:${clr};flex-shrink:0;padding:0 0.8mm;${kolcakStyle}">
      ${ad ? `<span style="font-size:${fontAdPt.toFixed(1)}pt;line-height:1.15;text-align:center;font-weight:700;white-space:normal;word-break:break-word;overflow:hidden;max-width:100%;display:block;">${escapeHtml(ad)}</span>` : ''}
      ${sinifAdi ? `<span style="font-size:${fontSinifPt.toFixed(1)}pt;line-height:1.1;text-align:center;opacity:0.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:block;">${escapeHtml(sinifAdi)}</span>` : ''}
    </div>`;
  };

  const kapiHtml = (metin) =>
    `<div style="font-size:${Math.max(4,K*0.14).toFixed(1)}mm;font-weight:800;color:#374151;display:flex;align-items:center;padding:0 0.5mm;white-space:nowrap;">${metin}</div>`;

  const altPadMM = 5;
  const maxAracH = kullH_max; // araç için toplam kullanılabilir alan

  /* Araç gövdesi — gri */
  let html = `<div style="width:100%;display:flex;justify-content:center;align-items:flex-start;">
  <div style="display:flex;flex-direction:column;align-items:center;background:#d1d5db;border:0.7mm solid #6b7280;border-radius:${m(aracW*0.07)} ${m(aracW*0.07)} ${m(aracW*0.04)} ${m(aracW*0.04)};padding:0 ${m(aracPad)} ${m(altPadMM)};width:${m(aracW)};max-height:${m(maxAracH)};overflow:hidden;">`;

  /* Ön cam + plaka — plaka camın üstünde */
  html += `<div style="width:100%;display:flex;flex-direction:column;align-items:center;padding:${m(K*0.15)} 0 ${m(K*0.1)};border-bottom:0.5mm solid #6b7280;margin-bottom:${m(K*0.12)};">
    ${servis.plaka ? `<div style="font-size:${Math.max(8,K*0.22).toFixed(1)}pt;font-weight:900;letter-spacing:0.8mm;color:#1f2937;background:#f9fafb;border:0.5mm solid #374151;border-radius:1mm;padding:0.3mm 2mm;margin-bottom:1mm;">${escapeHtml(servis.plaka)}</div>` : ''}
    <div style="width:60%;height:${m(K*0.28)};background:linear-gradient(180deg,#bfdbfe,#dbeafe);border:0.4mm solid #93c5fd;border-radius:${m(K*0.08)} ${m(K*0.08)} 0 0;"></div>
  </div>`;

  /* Koltuk bölümü */
  html += `<div style="display:flex;flex-direction:column;gap:${m(G)};width:100%;align-items:center;">`;

  siralar.forEach(siraIdx => {
    const yuvalar = siraMap[siraIdx];
    const arkaVar = yuvalar.some(y => y.konum === 'arka');

    /* Arka sıra */
    if (arkaVar) {
      // Arka sıra: 4 koltuk, toplam genişlik = aracIcW
      const arkaKoltukSayisi = yuvalar.length || 4;
      const arkaK = (aracIcW - G * (arkaKoltukSayisi - 1)) / arkaKoltukSayisi;
      html += `<div style="display:flex;gap:${m(G)};border-top:0.4mm dashed #6b7280;padding-top:${m(K*0.12)};margin-top:${m(K*0.06)};width:${m(aracIcW)};">`;
      yuvalar.forEach(y => {
        if (y.aktif === false) {
          html += `<div style="width:${m(arkaK)};height:${m(K)};flex-shrink:0;visibility:hidden;"></div>`;
        } else {
          const dolu    = y.koltuk && (y.koltuk.ogrenciId || y.koltuk.ogrenciAdi);
          const rezerve = y.koltuk && y.koltuk.rezerve && !dolu;
          const ad      = dolu ? (y.koltuk.ogrenciAdi || '') : '';
          const bg  = dolu ? '#22c55e' : rezerve ? '#3b82f6' : '#e5e7eb';
          const brd = dolu ? '#16a34a' : rezerve ? '#2563eb' : '#9ca3af';
          const clr = (dolu || rezerve) ? '#fff' : '#111';
          html += `<div style="width:${m(arkaK)};height:${m(K)};flex-shrink:0;border-radius:${m(borderRmm)};display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;background:${bg};border:0.4mm solid ${brd};color:${clr};padding:0 0.8mm;">
            ${ad ? `<span style="font-size:${fontAdPt.toFixed(1)}pt;line-height:1.15;font-weight:700;white-space:normal;word-break:break-word;overflow:hidden;max-width:100%;display:block;text-align:center;">${escapeHtml(ad)}</span>` : ''}
          </div>`;
        }
      });
      html += `</div>`;
      return;
    }

    /* Şoför sırası (sıra 0) */
    if (siraIdx === 0) {
      // Ducato: şoför + 2 koltuk (sag-ic, sag-dis) sağda — sol boş/gizli
      // Büyük: şoför solda, sağda giriş kapısı
      const on0Koltuklar = yuvalar.filter(y => y.konum !== 'arka' && !y.soforYani);

      html += `<div style="display:flex;align-items:center;gap:${m(G)};width:${m(toplamGenislik)};">`;

      if (buyuk) {
        // Büyük: şoför sol tarafta, sağ tarafta GİRİŞ kapısı
        html += `<div style="width:${m(solGrpW)};height:${m(K*1.5)};display:flex;align-items:center;justify-content:center;gap:${m(G)};">
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:${m(K)};height:${m(K*1.5)};overflow:hidden;">
            <span style="font-size:${m(soforIkonMM)};line-height:1;">👨‍✈️</span>
            <span style="font-size:${fontSoforPt.toFixed(1)}pt;color:#1f2937;font-weight:700;margin-top:0.3mm;text-align:center;word-break:break-word;white-space:normal;line-height:1.1;display:block;">${escapeHtml(servis.soforAdi || 'Şoför')}</span>
          </div>
        </div>`;
        html += `<div style="width:${m(korW)};height:${m(K*1.5)};"></div>`;
        html += `<div style="width:${m(sagGrpW)};height:${m(K*1.5)};display:flex;align-items:center;justify-content:center;">
          <div style="font-size:${Math.max(5,K*0.14).toFixed(1)}mm;font-weight:800;color:#374151;">│GİRİŞ│</div>
        </div>`;
      } else {
        // Ducato: şoför solda genişliği = solGrpW, sağda 2 koltuk
        html += `<div style="width:${m(solGrpW)};height:${m(K*1.5)};display:flex;align-items:center;justify-content:center;overflow:hidden;">
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;">
            <span style="font-size:${m(soforIkonMM)};line-height:1;">👨‍✈️</span>
            <span style="font-size:${fontSoforPt.toFixed(1)}pt;color:#1f2937;font-weight:700;margin-top:0.3mm;text-align:center;word-break:break-word;line-height:1.1;display:block;">${escapeHtml(servis.soforAdi || 'Şoför')}</span>
          </div>
        </div>`;
        html += `<div style="width:${m(korW)};height:${m(K*1.5)};"></div>`;
        // Sağ taraf: sıra 0'da sag-ic ve sag-dis koltukları
        const yon0Saglar = yuvalar.filter(y => ['sag-ic','sag-dis'].includes(y.konum));
        html += `<div style="display:flex;gap:${m(G)};align-items:center;">`;
        yon0Saglar.forEach(y => { html += koltukKutu(y); });
        html += `</div>`;
      }
      html += `</div>`;
      return;
    }

    /* Normal sıralar — CSS Grid */
    const kapiSagVar = yuvalar.some(y => y.kapiSag);
    const solKonumlar = ['sol-dis', 'sol-ic', 'sol-tek'];
    const sagKonumlar = buyuk ? ['sag-ic', 'sag-dis'] : ['sag-dis'];
    const soller = yuvalar.filter(y => solKonumlar.includes(y.konum));
    const saglar = yuvalar.filter(y => sagKonumlar.includes(y.konum));
    const kapiSadece = kapiSagVar && saglar.filter(y => y.aktif !== false).length === 0;

    const gridCols = `repeat(${solSutun},${m(K)}) ${m(korW)} repeat(${sagSutun},${m(K)})`;
    html += `<div style="display:grid;grid-template-columns:${gridCols};gap:${m(G)};">`;

    const renderKoltuk = (y, col) => {
      if (y.aktif === false) {
        return `<div style="grid-column:${col};width:${m(K)};height:${m(K)};visibility:hidden;"></div>`;
      }
      const dolu    = y.koltuk && (y.koltuk.ogrenciId || y.koltuk.ogrenciAdi);
      const rezerve = y.koltuk && y.koltuk.rezerve && !dolu;
      const ad      = dolu ? (y.koltuk.ogrenciAdi || '') : '';
      let sn = '';
      if (dolu && y.koltuk.ogrenciId) {
        const v2 = (typeof veliler !== 'undefined') ? veliler.find(x => x.id === y.koltuk.ogrenciId) : null;
        if (v2) { const s2 = (typeof siniflar !== 'undefined') ? siniflar.find(s => s.id === v2.sinifId) : null; sn = s2 ? s2.ad : ''; }
      }
      const bg  = dolu ? '#22c55e' : rezerve ? '#3b82f6' : '#e5e7eb';
      const brd = dolu ? '#16a34a' : rezerve ? '#2563eb' : '#9ca3af';
      const clr = (dolu || rezerve) ? '#fff' : '#111';
      const isSolDis = y.konum === 'sol-dis' || y.konum === 'sol-tek';
      const isSagDis = y.konum === 'sag-dis';
      const cs = isSolDis
        ? `border-left:${m(kolcakW)} solid #6b7280;border-radius:${m(borderRmm)} ${m(borderRmm*0.3)} ${m(borderRmm*0.3)} ${m(borderRmm)};`
        : isSagDis
        ? `border-right:${m(kolcakW)} solid #6b7280;border-radius:${m(borderRmm*0.3)} ${m(borderRmm)} ${m(borderRmm)} ${m(borderRmm*0.3)};`
        : '';
      return `<div style="grid-column:${col};width:${m(K)};height:${m(K)};overflow:hidden;border-radius:${m(borderRmm)};display:flex;flex-direction:column;align-items:center;justify-content:center;background:${bg};border:0.4mm solid ${brd};color:${clr};padding:0 0.8mm;${cs}">
        ${ad ? `<span style="font-size:${fontAdPt.toFixed(1)}pt;line-height:1.15;text-align:center;font-weight:700;white-space:normal;word-break:break-word;overflow:hidden;max-width:100%;display:block;">${escapeHtml(ad)}</span>` : ''}
        ${sn ? `<span style="font-size:${fontSinifPt.toFixed(1)}pt;line-height:1.1;text-align:center;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:block;">${escapeHtml(sn)}</span>` : ''}
      </div>`;
    };

    soller.forEach(y => {
      const col = (y.konum === 'sol-dis' || y.konum === 'sol-tek') ? 1 : 2;
      html += renderKoltuk(y, col);
    });

    html += `<div style="grid-column:${solSutun+1};display:flex;align-items:center;justify-content:center;">`;
    if (kapiSadece) html += kapiHtml('│KAPI│');
    html += `</div>`;

    saglar.forEach(y => {
      const col = buyuk ? (y.konum === 'sag-ic' ? solSutun + 2 : solSutun + 3) : solSutun + 2;
      html += renderKoltuk(y, col);
    });

    if (kapiSagVar && !kapiSadece) {
      html += `<div style="grid-column:${solSutun+sagSutun+2};display:flex;align-items:center;">
        ${kapiHtml('│KAPI│')}
      </div>`;
    }

    html += `</div>`;
  });

  html += `</div>`; // koltuk bölümü
  html += `</div></div>`; // araç + sarmal

  return html;
}
