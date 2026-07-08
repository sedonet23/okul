/* ====================================================================
   js/servis-oturma.js  (v5.0)
   Servis Oturma Planı — Dikey Araç Şeması — UI KATMANI
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

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2, §7
     UI (bu dosya)          → DOM + ServisOturmaService çağrısı, db bilmez
       (yerleşim/koltuk şablon mantığı render'a sıkı bağlı olduğu için
        bilinçli olarak burada bırakıldı — nöbet Excel içe aktarmadaki
        pragmatik ayrımla aynı ilke)
     js/core/services/servis-oturma.service.js    → yetki kontrolü
     js/core/repositories/servis-oturma.repository.js → TEK Firestore erişim noktası
   ==================================================================== */

let servisOturmaPlani = [];

/* ================================================================
   FAZ 2 — SÜRÜKLE-BIRAK DÜZENLEME MODU (yerel tampon + geri al/yinele)
   Düzenleme açıkken _soRenderArac verisini Firestore'daki plandan değil
   bu tampondan okur. "Kaydet" ile Firestore'a yazılır, "Vazgeç" ile atılır.
   Sürükleme SADECE atama içeriğini (öğrenci/rezerve/durak/not/renk/kilit)
   iki koltuk arasında takas eder — koltuğun fiziksel yeri (sıra/konum/
   kapı) ve koltuk numarası sabit kalır; böylece araç şasisi bozulmaz.
   ================================================================ */
let _soDuzenlemeAcik  = false;
let _soEditBuffer      = [];
let _soUndoYigini       = [];
let _soRedoYigini       = [];
let _soSurukleDurumu   = null; // { kaynakId, ghostEl, hedefEl, pointerId }

/* ================================================================
   ŞABLON TANIMLARI (SO_SABLONLAR) ve YENİ "elements" JSON ŞEMASI
   → js/core/servis-yerlesim-sema.js dosyasına taşındı (FAZ 1).
   Bu dosyada hâlâ SO_SABLONLAR[...].yerlesimUret() ile aynı şekilde
   kullanılır — geriye dönük uyumluluk korunmuştur.
   ================================================================ */

/* ================================================================
   FIRESTORE
   ================================================================ */
function servisOturmaBaglantisiKur() {
  if (!db) return;
  ServisOturmaRepository.planlariDinle(v => {
    servisOturmaPlani = v;
    const aktifId = document.getElementById('soServisId')?.value;
    if (aktifId) _soRenderArac(aktifId);
    if (document.getElementById('oturmaServislerListesi')) renderOturmaServisler();
  });
}

/* ================================================================
   ANA MODAL
   ================================================================ */
function servisOturmaModalAc(servisId) {
  const s = servisler.find(x => x.id === servisId);
  if (!s) return;

  _soDuzenlemeAcik = false; _soEditBuffer = []; _soUndoYigini = []; _soRedoYigini = [];

  const mevcut        = servisOturmaPlani.find(p => p.servisId === servisId);
  const secilenSablon = mevcut?.sablon || 'ducato';

  const sablonBtnler = Object.entries(SO_SABLONLAR).map(([key, val]) =>
    `<button class="so-sablon-btn${secilenSablon === key ? ' so-sablon-aktif' : ''}"
      onclick="soSablonSec('${key}','${servisId}')" data-sablon="${key}">
      ${val.ikon} ${val.ad}<small>${val.aciklama}</small>
    </button>`).join('');

  const icerik = `
    <div class="so-modal-wrap">
      <div id="soHeroKart"></div>
      <input type="hidden" id="soServisId" value="${servisId}">
      <input type="hidden" id="soSecilenSablon" value="${secilenSablon}">
      <div class="so-sablon-grup">
        <div class="so-sablon-label">Araç Tipi</div>
        <div class="so-sablon-btnler">${sablonBtnler}</div>
      </div>
      <div class="so-duzenle-satir">
        <button class="btn btn-ghost btn-sm sye-duzenle-toggle-btn" id="soDuzenleBtn"
          onclick="soDuzenlemeToggle('${servisId}')">✏️ Düzenlemeyi Aç</button>
      </div>
      <div id="soDuzenleToolbar"></div>
      <div class="so-arac-wrap"><div id="soAracSemasi"></div></div>
      <div class="so-alt-panel">
        <div class="sye-legend-kart">
          <div class="sye-legend-satir"><span class="sye-nokta sye-nokta-dolu"></span>Dolu</div>
          <div class="sye-legend-satir"><span class="sye-nokta sye-nokta-bos"></span>Boş</div>
          <div class="sye-legend-satir"><span class="sye-nokta sye-nokta-rezerve"></span>Rezerve</div>
          <div class="sye-legend-satir"><span class="sye-nokta sye-nokta-kilitli"></span>Kilitli</div>
        </div>
        <div class="so-alt-sag">
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

  modalAc(`💺 Oturma Planı — ${escapeHtml(s.servisAdi)}`, icerik, () => soKaydet(servisId), null, '💾 Kaydet');

  // FAZ 1 otomatik migrasyon: eski {yerlesim,koltuklar} şemalı ama "elements" alanı
  // olmayan planları, ilk açılışta yeni şemaya çevirip sessizce kaydeder.
  if (mevcut && soPlanMigrasyonGerekliMi(mevcut)) {
    const elements = soPlanElementleriGetir(mevcut, secilenSablon);
    _soPlanKaydetElements(servisId, secilenSablon, elements, true)
      .catch(err => console.warn('servisOturma migrasyon:', err));
  }

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

  const yeniElements = _soYerlesimKoltuklariElementeCevir(SO_SABLONLAR[sablon].yerlesimUret(), []);
  _soPlanKaydetElements(servisId, sablon, yeniElements, false)
    .catch(err => { if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
}

/* ================================================================
   RENDERER — FAZ 1: "elements" tabanlı modern şasi + koltuk kartı
   ================================================================ */
function _soRenderArac(servisId) {
  const hedef = document.getElementById('soAracSemasi');
  if (!hedef) return;

  const sablon    = document.getElementById('soSecilenSablon')?.value || 'ducato';
  const sablonObj = SO_SABLONLAR[sablon];
  if (!sablonObj) return;

  const mevcut   = servisOturmaPlani.find(p => p.servisId === servisId);
  const elements = _soDuzenlemeAcik ? _soEditBuffer : soPlanElementleriGetir(mevcut, sablon);
  const buyuk    = sablon === 'buyuk' || sablon === 'midibus';
  const servislerData = (typeof servisler !== 'undefined') ? servisler.find(x => x.id === servisId) : null;

  /* ── CSS Grid şablonu ──
     2+1: [sol-dis][sol-ic] [kor] [sag-dis]
     2+2: [sol-dis][sol-ic] [kor] [sag-ic][sag-dis]
     Her koltuk kartı 42px, koridor 16px, gap 4px */
  const K = 42, KOR = 16, GAP = 4;
  const solKonumlar  = ['sol-dis', 'sol-ic'];
  const sagKonumlar  = buyuk ? ['sag-ic', 'sag-dis'] : ['sag-dis'];
  const sagKonumlar0 = ['sag-ic', 'sag-dis'];
  const solSayisi = 2;
  const sagSayisi = buyuk ? 2 : 1;
  const gridCols  = `repeat(${solSayisi},${K}px) ${KOR}px repeat(${sagSayisi},${K}px)`;

  const siraMap = {};
  elements.forEach(el => { (siraMap[el.row] = siraMap[el.row] || []).push(el); });
  const siralar = Object.keys(siraMap).map(Number).sort((a, b) => a - b);

  /* Koltuk kartı — dolu/boş/rezerve/kilitli renkleri + rumuz avatar */
  const koltukKartOrtak = (el, gridCol) => {
    const p = el.properties || {};
    if (el.visible === false) {
      const gc = gridCol ? `grid-column:${gridCol};` : '';
      return `<div class="sye-koltuk sye-plus" style="${gc}" data-el-id="${el.id}"
        onclick="if(!_soTiklamayiEngelle())soYuvaAktifEt(${el.seatNumber},'${servisId}','${sablon}')" title="Koltuk ekle">+</div>`;
    }
    if (p.kapiSag && el.seatNumber === null) return '';

    const dolu    = !!(el.studentId || p.studentName);
    const rezerve = !!p.reserved && !dolu;
    const ad      = dolu ? (p.studentName || '') : '';
    const kisa    = ad.length > 9 ? ad.substring(0, 8) + '…' : ad;
    const harf    = ad.trim() ? ad.trim().charAt(0).toUpperCase() : '';

    let cls = 'sye-koltuk';
    cls += dolu ? ' sye-dolu' : rezerve ? ' sye-rezerve' : ' sye-bos';
    if (el.locked) cls += ' sye-kilitli';
    if (p.konum === 'sol-dis' || p.konum === 'sol-tek') cls += ' sye-kolcak-sol';
    if (p.konum === 'sag-dis') cls += ' sye-kolcak-sag';

    const title = dolu ? `${el.seatNumber}. — ${ad}` : rezerve ? `${el.seatNumber}. Koltuk — Rezerve` : `${el.seatNumber}. Koltuk`;
    const gc    = gridCol ? `grid-column:${gridCol};` : '';
    const renkStil = el.color ? `border-color:${el.color};` : '';

    return `<div class="${cls}" style="${gc}${renkStil}" data-el-id="${el.id}"
      onclick="if(!_soTiklamayiEngelle())soKoltukTikla(${el.seatNumber},'${servisId}','${sablon}')" title="${escapeHtml(title)}">
      <span class="sye-badge">${el.seatNumber}</span>
      ${el.locked ? `<span class="sye-kilit-ikon">🔒</span>` : ''}
      ${dolu ? `<span class="sye-avatar">${escapeHtml(harf)}</span><span class="sye-k-ad">${escapeHtml(kisa)}</span>` : ''}
    </div>`;
  };

  const koltukKart = (el) => {
    const p = el.properties || {};
    if (p.soforYani || el.type === 'sofor') return '';
    let gridCol = null;
    if (p.konum === 'sol-dis' || p.konum === 'sol-tek') gridCol = 1;
    else if (p.konum === 'sol-ic') gridCol = 2;
    else if (p.konum === 'sag-ic') gridCol = buyuk ? 4 : null;
    else if (p.konum === 'sag-dis') gridCol = buyuk ? 5 : 4;
    if (gridCol === null) return '';
    return koltukKartOrtak(el, gridCol);
  };

  /* Koridor hücresi — hafif gri çizgiyle belirgin */
  const koridorHucre = (kapiMetni) => {
    if (kapiMetni) {
      return `<div class="sye-koridor" style="grid-column:${solSayisi + 1};display:flex;align-items:center;justify-content:center;">
        <div class="sye-kapi" title="Kapı">🚪</div>
      </div>`;
    }
    return `<div class="sye-koridor" style="grid-column:${solSayisi + 1};width:${KOR}px;"></div>`;
  };

  let html = `<div class="sye-arac${buyuk ? ' sye-arac-buyuk' : ''}">`;
  html += `<div class="sye-govde">`;
  html += `<div class="sye-on-blok">
    <span class="sye-cikis-ikon" title="Acil çıkış">🚨</span>
    <div class="sye-on-cam"></div>
    <span class="sye-cikis-ikon" title="Acil çıkış">🚨</span>
  </div>`;
  if (servislerData?.plaka) html += `<div class="sye-plaka">${escapeHtml(servislerData.plaka)}</div>`;
  html += `<div class="sye-koltuk-bolum">`;
  if (sablon === 'ozel' && !elements.length) {
    html += `<div class="sye-ozel-bos">🛠️ Şasi boş.<br>Aşağıdaki butonlarla sıra ekleyerek başlayın.</div>`;
  }

  siralar.forEach(siraIdx => {
    const yuvalar = siraMap[siraIdx];
    const arkaVar = yuvalar.some(el => el.type === 'arka-koltuk' || el.properties?.konum === 'arka');

    /* Arka sıra — tüm koltuklar ortalanmış */
    if (arkaVar) {
      html += `<div class="sye-sira sye-arka-sira">`;
      yuvalar.forEach(el => { html += koltukKartOrtak(el, null); });
      html += `</div>`;
      return;
    }

    const kapiSagVar = yuvalar.some(el => el.properties?.kapiSag);
    const saglarVar  = yuvalar.some(el => sagKonumlar.includes(el.properties?.konum));

    /* Şoför sırası */
    if (siraIdx === 0) {
      const solGrpW = solSayisi * K + (solSayisi - 1) * GAP;
      html += `<div class="sye-sira sye-sofor-sirasi">`;
      html += `<div class="sye-sofor-blok" style="width:${solGrpW}px;min-width:${solGrpW}px;">
        <span class="sye-sofor-ikon">🧑‍✈️</span><span class="sye-sofor-ad">${escapeHtml(servislerData?.soforAdi || 'Şoför')}</span>
      </div>`;
      html += `<div class="sye-koridor" style="width:${KOR}px;flex-shrink:0;"></div>`;
      html += `<div style="display:flex;gap:${GAP}px;">`;
      if (buyuk && kapiSagVar && !saglarVar) {
        html += `<div class="sye-kapi" title="Giriş">🚪<span>GİRİŞ</span></div>`;
      } else {
        const s0Saglar = yuvalar.filter(el => sagKonumlar0.includes(el.properties?.konum));
        s0Saglar.forEach(el => { html += koltukKartOrtak(el, null); });
        if (!buyuk && s0Saglar.length < 2) {
          for (let i = s0Saglar.length; i < 2; i++) {
            html += `<div class="sye-koltuk sye-bos" style="opacity:.3;cursor:default;" title="Şablonu yenileyin">?</div>`;
          }
        }
      }
      html += `</div></div>`;
      return;
    }

    /* Normal sıralar — CSS Grid ile sabit */
    const kapiMetni = kapiSagVar && !saglarVar ? 'KAPI' : null;
    html += `<div class="sye-sira" style="display:grid;grid-template-columns:${gridCols};gap:${GAP}px;width:100%;">`;
    yuvalar.filter(el => solKonumlar.includes(el.properties?.konum)).forEach(el => { html += koltukKart(el); });
    html += koridorHucre(kapiMetni);
    yuvalar.filter(el => sagKonumlar.includes(el.properties?.konum)).forEach(el => { html += koltukKart(el); });
    if (kapiSagVar && saglarVar) {
      html += `<div style="grid-column:${solSayisi + sagSayisi + 2};display:flex;align-items:center;">
        <div class="sye-kapi sye-kapi-arka" title="Kapı">🚪</div>
      </div>`;
    }
    html += `</div>`;
  });

  html += `</div>`; // sye-koltuk-bolum
  html += `<div class="sye-arka-tampon"></div>`;
  html += `</div>`; // sye-govde
  html += `</div>`; // sye-arac
  html += _soDuzenlemeAcik ? '' : (sablon === 'ozel' ? _sozelBuilderHtml(servisId) : `<div class="sye-sira-ekle-ana">
    <button class="btn btn-ghost btn-sm" onclick="soSiraEkle('${servisId}','${sablon}')">➕ Sıra Ekle</button>
    <button class="btn btn-ghost btn-sm sye-sira-sil-btn" onclick="soSiraSil('${servisId}','${sablon}')">➖ Sıra Sil</button>
  </div>`);

  hedef.innerHTML = html;

  const stats = soElementIstatistik(elements);
  const heroEl = document.getElementById('soHeroKart');
  if (heroEl) heroEl.innerHTML = _soHeroKartHtml(servislerData, sablonObj, stats);

  /* FAZ 2 — düzenleme modu görsel durumu + sürükle-bırak dinleyicisi */
  const aracEl = hedef.querySelector('.sye-arac');
  if (aracEl) aracEl.classList.toggle('sye-duzenleme-modu', _soDuzenlemeAcik);
  _soSurukleDinleyiciBagla(hedef, servisId, sablon);
  _soToolbarRenderGuncelle(servisId, sablon);
}

/* ================================================================
   HERO KART — üstte canlı güncellenen büyük bilgi kartı
   ================================================================ */
function _soHeroKartHtml(servis, sablonObj, stats) {
  if (!servis) return '';
  return `<div class="sye-hero-kart">
    <div class="sye-hero-baslik">🚌 ${escapeHtml(servis.servisAdi || 'Servis')}</div>
    <div class="sye-hero-satir">
      <div class="sye-hero-hucre"><span class="sye-hero-etiket">Şoför</span><span class="sye-hero-deger">${escapeHtml(servis.soforAdi || '—')}</span></div>
      <div class="sye-hero-hucre"><span class="sye-hero-etiket">Araç</span><span class="sye-hero-deger">${sablonObj ? sablonObj.ikon + ' ' + escapeHtml(sablonObj.ad) : '—'}</span></div>
      <div class="sye-hero-hucre"><span class="sye-hero-etiket">Koltuk</span><span class="sye-hero-deger">${stats.dolu} / ${stats.toplam}</span></div>
      <div class="sye-hero-hucre"><span class="sye-hero-etiket">Doluluk</span><span class="sye-hero-deger">%${stats.doluluk}</span></div>
    </div>
    ${(servis.guzergah || servis.plaka) ? `<div class="sye-hero-alt">${servis.guzergah ? escapeHtml(servis.guzergah) : ''}${servis.guzergah && servis.plaka ? ' · ' : ''}${servis.plaka ? '🚘 ' + escapeHtml(servis.plaka) : ''}</div>` : ''}
  </div>`;
}

/* ================================================================
   FAZ 2 — DÜZENLEME MODU: AÇ / KAYDET / VAZGEÇ
   ================================================================ */
function soDuzenlemeToggle(servisId) {
  if (_soDuzenlemeAcik) {
    if (_soUndoYigini.length && !confirm('Kaydedilmemiş yerleşim değişiklikleri var. Vazgeçilsin mi?')) return;
    _soDuzenlemeKapat(servisId, false);
  } else {
    const sablon   = document.getElementById('soSecilenSablon')?.value || 'ducato';
    const mevcut   = servisOturmaPlani.find(p => p.servisId === servisId);
    _soEditBuffer  = soPlanElementleriGetir(mevcut, sablon).map(el => ({ ...el, properties: { ...el.properties } }));
    _soUndoYigini  = [];
    _soRedoYigini  = [];
    _soDuzenlemeAcik = true;
    const btn = document.getElementById('soDuzenleBtn');
    if (btn) { btn.textContent = '✕ Düzenlemeyi Kapat'; btn.classList.add('sye-aktif'); }
    document.querySelectorAll('.so-sablon-btn').forEach(b => { b.disabled = true; b.style.opacity = '.5'; b.style.pointerEvents = 'none'; });
    _soRenderArac(servisId);
  }
}

function _soDuzenlemeKapat(servisId, render) {
  _soDuzenlemeAcik = false;
  _soEditBuffer = []; _soUndoYigini = []; _soRedoYigini = [];
  const btn = document.getElementById('soDuzenleBtn');
  if (btn) { btn.textContent = '✏️ Düzenlemeyi Aç'; btn.classList.remove('sye-aktif'); }
  const tb = document.getElementById('soDuzenleToolbar');
  if (tb) tb.innerHTML = '';
  document.querySelectorAll('.so-sablon-btn').forEach(b => { b.disabled = false; b.style.opacity = ''; b.style.pointerEvents = ''; });
  if (render !== false) _soRenderArac(servisId);
}

function soDuzenlemeKaydet(servisId) {
  const sablon = document.getElementById('soSecilenSablon')?.value || 'ducato';
  _soPlanKaydetElements(servisId, sablon, _soEditBuffer, true)
    .then(() => { toast('Yerleşim kaydedildi.'); _soDuzenlemeKapat(servisId); })
    .catch(err => { if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
}

function soDuzenlemeVazgec(servisId) {
  if (_soUndoYigini.length && !confirm('Değişiklikler kaydedilmeyecek. Emin misiniz?')) return;
  _soDuzenlemeKapat(servisId);
}

function soGeriAl(servisId) {
  if (!_soUndoYigini.length) return;
  _soRedoYigini.push(_soEditBuffer);
  _soEditBuffer = _soUndoYigini.pop();
  _soRenderArac(servisId);
}

function soYinele(servisId) {
  if (!_soRedoYigini.length) return;
  _soUndoYigini.push(_soEditBuffer);
  _soEditBuffer = _soRedoYigini.pop();
  _soRenderArac(servisId);
}

function _soToolbarRenderGuncelle(servisId, sablon) {
  const tb = document.getElementById('soDuzenleToolbar');
  if (!tb) return;
  if (!_soDuzenlemeAcik) { tb.innerHTML = ''; return; }
  const kirli = _soUndoYigini.length > 0;
  tb.innerHTML = `
    <div class="sye-toolbar">
      <button class="sye-tool-btn" onclick="soGeriAl('${servisId}')" ${_soUndoYigini.length ? '' : 'disabled'}>
        <span class="sye-tool-ikon">↩</span>Geri Al</button>
      <button class="sye-tool-btn" onclick="soYinele('${servisId}')" ${_soRedoYigini.length ? '' : 'disabled'}>
        <span class="sye-tool-ikon">↪</span>Yinele</button>
      <div class="sye-tool-ayirici"></div>
      <span class="sye-tool-durum">${kirli ? '● Kaydedilmemiş değişiklik' : 'Bir koltuğu basılı tutup sürükleyerek yer değiştirin'}</span>
      <div class="sye-tool-ayirici"></div>
      <button class="sye-tool-btn" onclick="soDuzenlemeVazgec('${servisId}')"><span class="sye-tool-ikon">✕</span>Vazgeç</button>
      <button class="sye-tool-btn" onclick="soDuzenlemeKaydet('${servisId}')" ${kirli ? '' : 'disabled'}>
        <span class="sye-tool-ikon">💾</span>Kaydet</button>
    </div>`;
}

/* ================================================================
   FAZ 2 — SÜRÜKLE-BIRAK (Pointer Events, uzun basma ile aktive olur)
   Takas edilen alanlar: öğrenci ataması, rezerve, durak, not, renk,
   kilit — koltuğun fiziksel yeri (sıra/konum/kapı/koltuk no) SABİT
   kalır, sadece "kim nerede oturuyor" yer değiştirir.
   ================================================================ */
const SO_UZUN_BASMA_MS  = 260;
const SO_SURUKLEME_ESIGI = 9; // px — bu kadar hareket olmadan önce uzun basma iptal olur

let _soTiklamaEngelli = false;
function _soTiklamayiEngelle() { return _soTiklamaEngelli; }

function _soSurukleDinleyiciBagla(hedef, servisId, sablon) {
  if (hedef.dataset.syeDragBagli === '1') return; // aynı container'a tekrar bağlama
  hedef.dataset.syeDragBagli = '1';

  let basmaZamanlayici = null;
  let baslangic = null; // {x,y,el}

  const temizle = () => {
    if (basmaZamanlayici) { clearTimeout(basmaZamanlayici); basmaZamanlayici = null; }
    baslangic = null;
  };

  hedef.addEventListener('pointerdown', (e) => {
    if (!_soDuzenlemeAcik) return;
    const kart = e.target.closest('.sye-koltuk');
    if (!kart || kart.classList.contains('sye-plus')) return;
    baslangic = { x: e.clientX, y: e.clientY, el: kart, pointerId: e.pointerId };
    basmaZamanlayici = setTimeout(() => {
      if (!baslangic) return;
      _soSuruklemeyiBaslat(baslangic.el, baslangic.pointerId, hedef, servisId);
      basmaZamanlayici = null;
    }, SO_UZUN_BASMA_MS);
  });

  hedef.addEventListener('pointermove', (e) => {
    if (_soSurukleDurumu) { _soSuruklemeyiTakipEt(e, hedef); return; }
    if (!baslangic) return;
    const dx = Math.abs(e.clientX - baslangic.x), dy = Math.abs(e.clientY - baslangic.y);
    if (dx > SO_SURUKLEME_ESIGI || dy > SO_SURUKLEME_ESIGI) temizle(); // scroll/tap niyeti — uzun basmayı iptal et
  });

  const bitir = (e) => {
    if (_soSurukleDurumu) { _soSuruklemeyiBitir(e, servisId, sablon); return; }
    temizle();
  };
  hedef.addEventListener('pointerup', bitir);
  hedef.addEventListener('pointercancel', bitir);
  hedef.addEventListener('pointerleave', (e) => { if (!_soSurukleDurumu) temizle(); });
}

function _soSuruklemeyiBaslat(kartEl, pointerId, hedef, servisId) {
  kartEl.classList.add('sye-surukleniyor');
  const rect = kartEl.getBoundingClientRect();
  const ghost = kartEl.cloneNode(true);
  ghost.classList.add('sye-drag-ghost');
  ghost.classList.remove('sye-surukleniyor');
  ghost.style.width = rect.width + 'px';
  ghost.style.height = rect.height + 'px';
  ghost.style.left = rect.left + 'px';
  ghost.style.top = rect.top + 'px';
  document.body.appendChild(ghost);
  try { kartEl.setPointerCapture(pointerId); } catch (e) {}
  _soSurukleDurumu = { kaynakId: kartEl.dataset.elId, kaynakEl: kartEl, ghostEl: ghost, hedefEl: null, pointerId, offsetX: rect.width / 2, offsetY: rect.height / 2 };
  _soTiklamaEngelli = true;
  if (navigator.vibrate) navigator.vibrate(12);
}

function _soSuruklemeyiTakipEt(e, hedef) {
  const d = _soSurukleDurumu;
  if (!d) return;
  d.ghostEl.style.left = (e.clientX - d.offsetX) + 'px';
  d.ghostEl.style.top  = (e.clientY - d.offsetY) + 'px';

  d.ghostEl.style.visibility = 'hidden';
  const altta = document.elementFromPoint(e.clientX, e.clientY);
  d.ghostEl.style.visibility = '';

  const yeniHedef = altta ? altta.closest('.sye-koltuk') : null;
  const gecerli = yeniHedef && !yeniHedef.classList.contains('sye-plus') && yeniHedef !== d.kaynakEl;

  if (d.hedefEl && d.hedefEl !== yeniHedef) d.hedefEl.classList.remove('sye-hedef');
  if (gecerli) { yeniHedef.classList.add('sye-hedef'); d.hedefEl = yeniHedef; }
  else d.hedefEl = null;
}

function _soSuruklemeyiBitir(e, servisId, sablon) {
  const d = _soSurukleDurumu;
  if (!d) return;
  d.kaynakEl.classList.remove('sye-surukleniyor');
  if (d.hedefEl) d.hedefEl.classList.remove('sye-hedef');
  d.ghostEl.remove();
  try { d.kaynakEl.releasePointerCapture(d.pointerId); } catch (err) {}

  const hedefId = d.hedefEl?.dataset.elId;
  _soSurukleDurumu = null;
  setTimeout(() => { _soTiklamaEngelli = false; }, 50); // olası click olayını yut

  if (!hedefId || hedefId === d.kaynakId) return; // aynı yere bırakıldı veya geçersiz hedef — no-op

  _soEditTakasUygula(d.kaynakId, hedefId, servisId, sablon);
}

/* İki elementin ATAMA içeriğini (fiziksel yer hariç) takas eder + geri al kaydı oluşturur */
function _soEditTakasUygula(idA, idB, servisId, sablon) {
  const idxA = _soEditBuffer.findIndex(el => el.id === idA);
  const idxB = _soEditBuffer.findIndex(el => el.id === idB);
  if (idxA < 0 || idxB < 0) return;

  _soUndoYigini.push(_soEditBuffer.map(el => ({ ...el, properties: { ...el.properties } })));
  _soRedoYigini = [];

  const yeni = _soEditBuffer.map(el => ({ ...el, properties: { ...el.properties } }));
  const a = yeni[idxA], b = yeni[idxB];
  const alanlar = ['studentId', 'color', 'locked'];
  alanlar.forEach(k => { const t = a[k]; a[k] = b[k]; b[k] = t; });
  const pAlanlar = ['studentName', 'reserved', 'stop', 'note'];
  pAlanlar.forEach(k => { const t = a.properties[k]; a.properties[k] = b.properties[k]; b.properties[k] = t; });

  _soEditBuffer = yeni;
  _soRenderArac(servisId);
  toast(`${a.seatNumber}. ↔ ${b.seatNumber}. koltuk yer değiştirdi.`);
}

/* ================================================================
   FAZ 3 — MANUEL ŞASİ OLUŞTURUCU ("Özel Tasarım" şablonu)
   Sıfırdan araç: kullanıcı istediği tipte sıraları alt alta ekleyerek
   şasiyi kurar. Mevcut "elements" render/rapor motorunu DEĞİŞTİRMEDEN
   kullanır — sadece eski {sira,konum,kapiSag,soforYani} yerleşim
   şeklinde satır üretip _soYerlesimKoltuklariElementeCevir ile
   elements'e çevirir (tüm şablonların kullandığı aynı dönüştürücü).
   ================================================================ */
function _sozelBuilderHtml(servisId) {
  const btn = (tip, ikon, etiket) =>
    `<button class="sye-tool-btn" onclick="sozelSiraEkle('${servisId}','${tip}')">
      <span class="sye-tool-ikon">${ikon}</span>${etiket}</button>`;
  return `<div class="sye-ozel-olusturucu">
    <div class="sye-ozel-baslik">🛠️ Şasi Oluşturucu — sıra ekleyerek araç şeklini kur</div>
    <div class="sye-toolbar sye-ozel-toolbar">
      ${btn('sofor', '🧑‍✈️', 'Şoför Sırası')}
      ${btn('tekli', '🪑', 'Tekli Koltuk')}
      ${btn('ikili', '🪑🪑', 'İkili Koltuk')}
      ${btn('uclu21', '🪑🪑🪑', '2+1 Sıra')}
      ${btn('dortlu22', '🪑🪑🪑🪑', '2+2 Sıra')}
      ${btn('kapi', '🚪', 'Kapı Sırası')}
      ${btn('arka4', '🛋️', 'Arka Sıra (4\'lü)')}
      <div class="sye-tool-ayirici"></div>
      <button class="sye-tool-btn" onclick="sozelSonSiraSil('${servisId}')"><span class="sye-tool-ikon">↩</span>Son Sırayı Sil</button>
      <button class="sye-tool-btn" onclick="sozelTumunuSil('${servisId}')"><span class="sye-tool-ikon">🗑️</span>Şasiyi Sıfırla</button>
    </div>
  </div>`;
}

/* Yeni bir sıra ekler — eski {sira,konum,...} yerleşim biçiminde üretir,
   mevcut dönüştürücüyle elements'e çevirip kaydeder. */
function sozelSiraEkle(servisId, tip) {
  const mevcut   = servisOturmaPlani.find(p => p.servisId === servisId);
  const yerlesim = mevcut?.yerlesim ? [...mevcut.yerlesim] : [];
  const yeniSira = yerlesim.length ? Math.max(...yerlesim.map(y => y.sira)) + 1 : 0;

  const satirlar = {
    sofor:    [{ sira: yeniSira, konum: 'sol-dis', soforYani: true, aktif: true }],
    tekli:    [{ sira: yeniSira, konum: 'sol-dis', aktif: true }],
    ikili:    [{ sira: yeniSira, konum: 'sol-dis', aktif: true }, { sira: yeniSira, konum: 'sol-ic', aktif: true }],
    uclu21:   [{ sira: yeniSira, konum: 'sol-dis', aktif: true }, { sira: yeniSira, konum: 'sol-ic', aktif: true }, { sira: yeniSira, konum: 'sag-dis', aktif: true }],
    dortlu22: [{ sira: yeniSira, konum: 'sol-dis', aktif: true }, { sira: yeniSira, konum: 'sol-ic', aktif: true }, { sira: yeniSira, konum: 'sag-ic', aktif: true }, { sira: yeniSira, konum: 'sag-dis', aktif: true }],
    kapi:     [{ sira: yeniSira, konum: 'sol-dis', kapiSag: true, aktif: true }, { sira: yeniSira, konum: 'sol-ic', kapiSag: true, aktif: true }],
    arka4:    [0, 1, 2, 3].map(() => ({ sira: yeniSira, konum: 'arka', aktif: true })),
  }[tip];
  if (!satirlar) return;

  const yeniYerlesim = [...yerlesim, ...satirlar];
  const elements = _soYerlesimKoltuklariElementeCevir(yeniYerlesim, mevcut?.koltuklar || []);
  _soPlanKaydetElements(servisId, 'ozel', elements, false)
    .then(() => toast('Sıra eklendi.'))
    .catch(err => { if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
}

/* En son eklenen sırayı (en yüksek "sira" indeksi) tamamen kaldırır. */
function sozelSonSiraSil(servisId) {
  const mevcut   = servisOturmaPlani.find(p => p.servisId === servisId);
  const yerlesim = mevcut?.yerlesim ? [...mevcut.yerlesim] : [];
  if (!yerlesim.length) { toast('Silinecek sıra yok.'); return; }

  const sonSira = Math.max(...yerlesim.map(y => y.sira));
  const silinecekYuvalar = yerlesim.map((y, idx) => ({ ...y, no: idx + 1 })).filter(y => y.sira === sonSira);
  const atamaliVar = silinecekYuvalar.some(y => {
    const k = (mevcut?.koltuklar || []).find(k => k.no === y.no);
    return k && (k.ogrenciId || k.ogrenciAdi || k.rezerve);
  });
  if (atamaliVar && !confirm('Son sırada atanmış koltuk var. Silmek atamaları da kaldırır. Devam?')) return;

  const yeniYerlesim   = yerlesim.filter(y => y.sira !== sonSira);
  const silinecekNolar = new Set(silinecekYuvalar.map(y => y.no));
  const koltuklar      = (mevcut?.koltuklar || []).filter(k => !silinecekNolar.has(k.no));
  const elements = _soYerlesimKoltuklariElementeCevir(yeniYerlesim, koltuklar);
  _soPlanKaydetElements(servisId, 'ozel', elements, false)
    .then(() => toast('Son sıra silindi.'))
    .catch(err => { if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
}

/* Tüm şasiyi sıfırlar (boş elements). */
function sozelTumunuSil(servisId) {
  if (!confirm('Tüm şasi ve atamalar silinecek, sıfırdan başlayacaksınız. Emin misiniz?')) return;
  _soPlanKaydetElements(servisId, 'ozel', [], false)
    .then(() => toast('Şasi sıfırlandı.'))
    .catch(err => { if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
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

  if (_soDuzenTipi(sb) === 'B') {
    yerlesim.push({ sira: eklemeSira, konum: 'sol-dis', aktif: true });
    yerlesim.push({ sira: eklemeSira, konum: 'sol-ic',  aktif: true });
    yerlesim.push({ sira: eklemeSira, konum: 'sag-ic',  aktif: true });
    yerlesim.push({ sira: eklemeSira, konum: 'sag-dis', aktif: true });
  } else {
    yerlesim.push({ sira: eklemeSira, konum: 'sol-dis', aktif: true });
    yerlesim.push({ sira: eklemeSira, konum: 'sol-ic',  aktif: true });
    yerlesim.push({ sira: eklemeSira, konum: 'sag-dis', aktif: true });
  }

  const elements = _soYerlesimKoltuklariElementeCevir(yerlesim, mevcut?.koltuklar || []);
  _soPlanKaydetElements(servisId, sb, elements, false)
    .then(() => toast('Sıra eklendi.'))
    .catch(err => { if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
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
    const ikinciKapiMi = _soDuzenTipi(sb) === 'B' && grup.length === 2 &&
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

  const elements = _soYerlesimKoltuklariElementeCevir(yerlesimFinal, koltuklar);
  _soPlanKaydetElements(servisId, sb, elements, false)
    .then(() => toast('Sıra silindi.'))
    .catch(err => { if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
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
    const ikinciKapiMi = _soDuzenTipi(sb) === 'B' && grup.length === 2 &&
      grup.every(y => y.kapiSag && (y.konum === 'sol-dis' || y.konum === 'sol-ic'));
    if (arkaMi || ikinciKapiMi) sabitSiralar.push(sira);
  });

  return sabitSiralar.length ? Math.min(...sabitSiralar) : maxSira + 1;
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

  const elements = _soYerlesimKoltuklariElementeCevir(yerlesim, mevcut?.koltuklar || []);
  _soPlanKaydetElements(servisId, sb, elements, false)
    .then(() => toast('Koltuk eklendi.'))
    .catch(err => { if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
}

/* ================================================================
   KOLTUK TIKLA — INLINE PANEL AÇAR
   ================================================================ */
function soKoltukTikla(koltukNo, servisId, sablon) {
  const mevcut    = servisOturmaPlani.find(p => p.servisId === servisId);
  const koltuklar = mevcut?.koltuklar || [];
  const koltuk    = koltuklar.find(k => k.no === koltukNo) || {};
  const sb        = sablon || mevcut?.sablon || 'ducato';

  const ogrs = ogrencileriSinifSiralaSirala(veliler.filter(v => v.servisId === servisId));

  const secenekler = ogrs.map(v => {
    const atanmis = koltuklar.some(k => k.ogrenciId === v.id && k.no !== koltukNo);
    const sn      = siniflar.find(s => s.id === v.sinifId);
    return `<option value="${v.id}" data-sinif="${sn ? escapeHtml(sn.ad) : ''}" data-telefon="${escapeHtml(v.telefon || '')}" data-veli="${escapeHtml(v.veliAdi || '')}"
      ${koltuk.ogrenciId === v.id ? 'selected' : ''} ${atanmis ? 'disabled' : ''}>
      ${escapeHtml(v.ogrenciAdi || '')}${sn ? ' — ' + sn.ad : ''}${atanmis ? ' (atanmış)' : ''}
    </option>`;
  }).join('');

  const secilenOgr = koltuk.ogrenciId ? veliler.find(v => v.id === koltuk.ogrenciId) : null;
  const secilenSinif = secilenOgr ? siniflar.find(s => s.id === secilenOgr.sinifId) : null;
  const renkler = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#64748b'];

  const body = `
    <p class="so-koltuk-baslik"><strong>${koltukNo}. Koltuk</strong></p>
    <div class="form-group">
      <label>Öğrenci</label>
      <select id="soOgrenciSec" onchange="_soOgrOzetGuncelle()">
        <option value="">— Boş bırak —</option>
        ${secenekler}
      </select>
    </div>
    <div class="form-group" id="soOgrOzetGrup" style="${secilenOgr ? '' : 'display:none;'}">
      <div class="so-ogr-ozet-satir"><span>Sınıf</span><strong id="soOgrSinif">${escapeHtml(secilenSinif?.ad || '—')}</strong></div>
      <div class="so-ogr-ozet-satir"><span>Telefon</span><strong id="soOgrTelefon">${escapeHtml(secilenOgr?.telefon || '—')}</strong></div>
      <div class="so-ogr-ozet-satir"><span>Veli</span><strong id="soOgrVeli">${escapeHtml(secilenOgr?.veliAdi || '—')}</strong></div>
    </div>
    <div class="form-group">
      <label>Durak</label>
      <input type="text" id="soDurakInput" value="${escapeHtml(koltuk.durak || '')}" placeholder="İniş/biniş durağı">
    </div>
    <div class="form-group">
      <label>Not</label>
      <textarea id="soNotInput" rows="2" placeholder="Varsa özel not">${escapeHtml(koltuk.not || '')}</textarea>
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
        <input type="checkbox" id="soRezerveCheck" ${koltuk.rezerve && !koltuk.ogrenciId ? 'checked' : ''}>
        Rezerve olarak işaretle
      </label>
    </div>
    <div class="form-group">
      <label>Renk</label>
      <div class="so-renk-secici">
        ${renkler.map(r => `<button type="button" class="so-renk-nokta${koltuk.renk === r ? ' so-renk-secili' : ''}" style="background:${r};" data-renk="${r}" onclick="_soRenkSec(this)"></button>`).join('')}
        <button type="button" class="so-renk-nokta so-renk-yok${!koltuk.renk ? ' so-renk-secili' : ''}" data-renk="" onclick="_soRenkSec(this)" title="Varsayılan">✕</button>
      </div>
      <input type="hidden" id="soRenkInput" value="${koltuk.renk || ''}">
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
        <input type="checkbox" id="soKilitCheck" ${koltuk.kilit ? 'checked' : ''}>
        Koltuğu Kilitle
      </label>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:10px 0 8px;">
    <div class="so-koltuk-butonlar">
      ${koltuk.ogrenciId ? `<button class="btn btn-ghost btn-sm" onclick="document.getElementById('soOgrenciSec').value='';_soOgrOzetGuncelle();">👤 Öğrenciyi Kaldır</button>` : ''}
      <button class="btn btn-danger btn-sm" onclick="soKoltukDeaktifEt(${koltukNo},'${servisId}','${sb}')">
        ✕ Koltuğu Kaldır (+)
      </button>
    </div>
    ${!ogrs.length ? `<p class="so-uyari" style="margin-top:8px;">⚠️ Bu serviste kayıtlı öğrenci bulunamadı.</p>` : ''}`;

  const panelEl = document.getElementById('soKoltukPanel');
  if (!panelEl) return;

  panelEl.innerHTML = `<div class="so-koltuk-panel">${body}</div>`;
  panelEl.style.display = 'flex';

  window._soOgrOzetGuncelle = () => {
    const sel  = document.getElementById('soOgrenciSec');
    const grup = document.getElementById('soOgrOzetGrup');
    const opt  = sel?.selectedOptions?.[0];
    if (!sel?.value) { if (grup) grup.style.display = 'none'; return; }
    if (grup) grup.style.display = '';
    const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v || '—'; };
    el('soOgrSinif',   opt?.dataset.sinif);
    el('soOgrTelefon', opt?.dataset.telefon);
    el('soOgrVeli',    opt?.dataset.veli);
  };

  window._soRenkSec = (btn) => {
    document.querySelectorAll('.so-renk-nokta').forEach(b => b.classList.remove('so-renk-secili'));
    btn.classList.add('so-renk-secili');
    const input = document.getElementById('soRenkInput');
    if (input) input.value = btn.dataset.renk || '';
  };

  const kaydetchecks = () => {
    const ogrenciId = document.getElementById('soOgrenciSec')?.value;
    const rezerve   = document.getElementById('soRezerveCheck')?.checked && !ogrenciId;
    const durak     = document.getElementById('soDurakInput')?.value.trim() || '';
    const not       = document.getElementById('soNotInput')?.value.trim() || '';
    const renk      = document.getElementById('soRenkInput')?.value || null;
    const kilit     = !!document.getElementById('soKilitCheck')?.checked;
    soKoltukGuncelle(servisId, koltukNo, { ogrenciId: ogrenciId || null, rezerve, durak, not, renk, kilit }, sb);
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

  const elements = _soYerlesimKoltuklariElementeCevir(yerlesim, koltuklar);
  _soPlanKaydetElements(servisId, sb, elements, false)
    .then(() => toast('Koltuk kaldırıldı. "+" ile geri ekleyebilirsiniz.'))
    .catch(err => { if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
}

/* ================================================================
   KOLTUK GÜNCELLE
   ================================================================ */
/* detay: { ogrenciId, rezerve, durak, not, renk, kilit } */
function soKoltukGuncelle(servisId, koltukNo, detay, sablon) {
  const mevcut    = servisOturmaPlani.find(p => p.servisId === servisId);
  const koltuklar = mevcut ? [...(mevcut.koltuklar || [])] : [];
  const sb        = sablon || mevcut?.sablon || 'ducato';
  const yerlesim  = mevcut?.yerlesim?.length ? mevcut.yerlesim : SO_SABLONLAR[sb].yerlesimUret();
  const { ogrenciId, rezerve, durak, not, renk, kilit } = detay || {};
  const v = ogrenciId ? veliler.find(x => x.id === ogrenciId) : null;

  const yeni = {
    no: koltukNo, ogrenciId: ogrenciId || null, ogrenciAdi: v?.ogrenciAdi || '',
    rezerve: !!rezerve, durak: durak || '', not: not || '', renk: renk || null, kilit: !!kilit,
  };
  const idx = koltuklar.findIndex(k => k.no === koltukNo);
  if (idx >= 0) koltuklar[idx] = yeni; else koltuklar.push(yeni);

  const elements = _soYerlesimKoltuklariElementeCevir(yerlesim, koltuklar);
  _soPlanKaydetElements(servisId, sb, elements, false)
    .catch(err => { if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
}

/* ================================================================
   KAYDET / TEMİZLE / ÖZET
   ================================================================ */
function soKaydet(servisId) {
  const sablon = document.getElementById('soSecilenSablon')?.value || 'ducato';
  const mevcut = servisOturmaPlani.find(p => p.servisId === servisId);
  const elements = _soDuzenlemeAcik ? _soEditBuffer : soPlanElementleriGetir(mevcut, sablon);
  _soPlanKaydetElements(servisId, sablon, elements, true)
    .then(() => { toast('Oturma planı kaydedildi.'); if (_soDuzenlemeAcik) _soDuzenlemeKapat(servisId, false); })
    .catch(err => { if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
}

function soTumunuTemizle() {
  const servisId = document.getElementById('soServisId')?.value;
  if (!servisId) return;
  if (!confirm('Tüm öğrenci atamaları silinecek. Koltuk düzeni korunacak. Emin misiniz?')) return;
  const mevcut   = servisOturmaPlani.find(p => p.servisId === servisId);
  const sablon   = document.getElementById('soSecilenSablon')?.value || mevcut?.sablon || 'ducato';
  const elements = soPlanElementleriGetir(mevcut, sablon).map(el => ({
    ...el, studentId: null,
    properties: { ...el.properties, studentName: '', reserved: false, stop: '', note: '' },
  }));
  _soPlanKaydetElements(servisId, sablon, elements, false)
    .then(() => toast('Atamalar temizlendi.'))
    .catch(err => { if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
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
  const sablon   = plan?.sablon || 'ducato';
  const buyuk    = sablon === 'buyuk' || sablon === 'midibus';
  const elements = soPlanElementleriGetir(plan, sablon);
  if (!elements.length) return '';

  /* Öğrenci → sınıf adı çözümleyici (küçük önbellek) */
  const sinifAdiBul = (studentId) => {
    if (!studentId || typeof veliler === 'undefined') return '';
    const v = veliler.find(x => x.id === studentId);
    if (!v || typeof siniflar === 'undefined') return '';
    const sn = siniflar.find(s => s.id === v.sinifId);
    return sn ? sn.ad : '';
  };

  /* siraMap — elements'i fiziksel sıraya (row) göre grupla */
  const siraMap = {};
  elements.forEach(el => {
    const row = el.row ?? 0;
    if (!siraMap[row]) siraMap[row] = [];
    siraMap[row].push(el);
  });
  const siralar = Object.keys(siraMap).map(Number).sort((a, b) => a - b);

  /* ── Boyut hesabı: Dikey A4 (portrait) ──
     A4 portrait: 210mm × 297mm, margin 8mm → iç alan 194mm × 281mm
     Araç dikey çizilir: genişlik 194mm, yükseklik 281mm
     Header: 16mm → araç yüksekliği: 281 - 16 - 6(güvenlik) = 259mm
     NOT: sagSutun HER ZAMAN 2 olarak ayrılır — Ducato ailesinde şoförün
     yanındaki ön sırada (row 0) 2 koltuk (sag-ic + sag-dis) bulunur;
     bunu hesaba katmayan eski kod sağdaki koltuğun taşmasına (kesilmesine)
     neden oluyordu. Normal sıralarda tek sağ koltuk dış (sag-dis/pencere)
     kolonuna yerleştirilir, iç kolon o sıralarda boş kalır.
  */
  const solSutun   = 2;
  const sagSutun   = 2;
  const toplamSira = siralar.length;

  const headerMM   = 16;
  const aracPad    = 4;

  const sayfaKullanW = 194; // mm
  const aracIcW_max  = sayfaKullanW - aracPad * 2; // 186mm

  const colToplam = solSutun + sagSutun;
  const katsayi_w = colToplam + 0.1 * (colToplam - 1) + 0.28;
  const K_w       = aracIcW_max / katsayi_w;

  const kullH_max  = 281 - headerMM - 6; // 259mm
  const sabitMM    = 12 + 4;
  const koltukH    = kullH_max - sabitMM;
  const n          = toplamSira;
  const katsayi_h  = 1.5 + (n - 2) + 1.3 + (n - 1) * 0.1;
  const K_h        = koltukH / katsayi_h;

  const K    = Math.max(4, Math.min(K_w, K_h));
  const G    = K * 0.1;
  const korW = K * 0.28;
  const aracIcW = solSutun * K + G * (solSutun - 1) + korW + sagSutun * K + G * (sagSutun - 1);
  const aracW   = aracIcW + aracPad * 2;

  const m = (v) => `${v.toFixed(2)}mm`;

  const fontAdPt    = Math.max(5, Math.min(8, K * 0.38));
  const fontSinifPt = Math.max(4, Math.min(6, K * 0.28));
  const fontSoforPt = Math.max(9, Math.min(14, K * 0.55));
  const fontBadgePt = Math.max(3.5, Math.min(5.5, K * 0.22));
  const soforIkonMM = Math.max(11, K * 0.75);
  const soforSiraH  = K * 1.3;
  const borderRmm   = K * 0.12;
  const kolcakW     = K * 0.07;

  const gridCols  = `repeat(${solSutun},${m(K)}) ${m(korW)} repeat(${sagSutun},${m(K)})`;
  const sagKolonHarita = { 'sag-ic': solSutun + 2, 'sag-dis': solSutun + 3 };

  /* Koltuk kutusu — tek ortak render fonksiyonu (şoför sırası dahil TÜM sıralar) */
  const koltukKutu = (el, col) => {
    if (el.visible === false) {
      return `<div style="grid-column:${col};width:${m(K)};height:${m(K)};flex-shrink:0;visibility:hidden;"></div>`;
    }
    const p       = el.properties || {};
    const dolu    = !!(el.studentId || p.studentName);
    const rezerve = !!(p.reserved && !dolu);
    const ad      = dolu ? (p.studentName || '') : '';
    const sinifAdi = dolu ? sinifAdiBul(el.studentId) : '';
    const bg  = dolu ? '#22c55e' : rezerve ? '#3b82f6' : '#e5e7eb';
    const brd = dolu ? '#16a34a' : rezerve ? '#2563eb' : '#9ca3af';
    const clr = (dolu || rezerve) ? '#fff' : '#111';
    let kolcakStyle = '';
    if (p.konum === 'sol-dis' || p.konum === 'sol-tek')
      kolcakStyle = `border-left:${m(kolcakW)} solid #6b7280;border-radius:${m(borderRmm)} ${m(borderRmm*0.3)} ${m(borderRmm*0.3)} ${m(borderRmm)};`;
    if (p.konum === 'sag-dis')
      kolcakStyle = `border-right:${m(kolcakW)} solid #6b7280;border-radius:${m(borderRmm*0.3)} ${m(borderRmm)} ${m(borderRmm)} ${m(borderRmm*0.3)};`;
    return `<div style="grid-column:${col};width:${m(K)};height:${m(K)};position:relative;border-radius:${m(borderRmm)};display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;background:${bg};border:0.4mm solid ${brd};color:${clr};flex-shrink:0;padding:0 0.8mm;${kolcakStyle}">
      ${el.seatNumber ? `<span style="position:absolute;top:0.3mm;left:0.6mm;font-size:${fontBadgePt.toFixed(1)}pt;font-weight:800;opacity:.75;line-height:1;">${el.seatNumber}</span>` : ''}
      ${el.locked ? `<span style="position:absolute;top:-0.8mm;right:-0.8mm;font-size:${(fontBadgePt+1).toFixed(1)}pt;background:#fff;border-radius:50%;line-height:1;">🔒</span>` : ''}
      ${ad ? `<span style="font-size:${fontAdPt.toFixed(1)}pt;line-height:1.15;text-align:center;font-weight:700;white-space:normal;word-break:break-word;overflow:hidden;max-width:100%;display:block;">${escapeHtml(ad)}</span>` : ''}
      ${sinifAdi ? `<span style="font-size:${fontSinifPt.toFixed(1)}pt;line-height:1.1;text-align:center;opacity:0.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:block;">${escapeHtml(sinifAdi)}</span>` : ''}
    </div>`;
  };

  const kapiHtml = (metin) =>
    `<div style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:${Math.max(9,K*0.32).toFixed(1)}pt;font-weight:800;color:#374151;letter-spacing:0.5mm;display:flex;align-items:center;justify-content:center;">${metin}</div>`;

  const altPadMM = 5;
  const maxAracH = kullH_max;

  let html = `<div style="width:100%;display:flex;justify-content:center;align-items:flex-start;">
  <div style="display:flex;flex-direction:column;align-items:center;background:#d1d5db;border:0.7mm solid #6b7280;border-radius:${m(aracW*0.07)} ${m(aracW*0.07)} ${m(aracW*0.04)} ${m(aracW*0.04)};padding:0 ${m(aracPad)} ${m(altPadMM)};width:${m(aracW)};max-height:${m(maxAracH)};overflow:hidden;">`;

  html += `<div style="width:100%;display:flex;flex-direction:column;align-items:center;padding:${m(K*0.15)} 0 ${m(K*0.1)};border-bottom:0.5mm solid #6b7280;margin-bottom:${m(K*0.12)};">
    ${servis.plaka ? `<div style="font-size:${Math.max(8,K*0.22).toFixed(1)}pt;font-weight:900;letter-spacing:0.8mm;color:#1f2937;background:#f9fafb;border:0.5mm solid #374151;border-radius:1mm;padding:0.3mm 2mm;margin-bottom:1mm;">${escapeHtml(servis.plaka)}</div>` : ''}
    <div style="width:60%;height:${m(K*0.28)};background:linear-gradient(180deg,#bfdbfe,#dbeafe);border:0.4mm solid #93c5fd;border-radius:${m(K*0.08)} ${m(K*0.08)} 0 0;"></div>
  </div>`;

  html += `<div style="display:flex;flex-direction:column;gap:${m(G)};width:100%;align-items:center;">`;

  siralar.forEach(siraIdx => {
    const yuvalar = siraMap[siraIdx];
    const arkaVar = yuvalar.some(el => el.type === 'arka-koltuk' || el.properties?.konum === 'arka');

    /* Arka sıra — düz flex, 4 (veya kaç varsa) koltuk tam genişliğe yayılır */
    if (arkaVar) {
      const arkaKoltukSayisi = yuvalar.length || 4;
      const arkaK = (aracIcW - G * (arkaKoltukSayisi - 1)) / arkaKoltukSayisi;
      html += `<div style="display:flex;gap:${m(G)};border-top:0.4mm dashed #6b7280;padding-top:${m(K*0.12)};margin-top:${m(K*0.06)};width:${m(aracIcW)};">`;
      yuvalar.forEach(el => {
        if (el.visible === false) {
          html += `<div style="width:${m(arkaK)};height:${m(K)};flex-shrink:0;visibility:hidden;"></div>`;
        } else {
          const p       = el.properties || {};
          const dolu    = !!(el.studentId || p.studentName);
          const rezerve = !!(p.reserved && !dolu);
          const ad      = dolu ? (p.studentName || '') : '';
          const bg  = dolu ? '#22c55e' : rezerve ? '#3b82f6' : '#e5e7eb';
          const brd = dolu ? '#16a34a' : rezerve ? '#2563eb' : '#9ca3af';
          const clr = (dolu || rezerve) ? '#fff' : '#111';
          html += `<div style="width:${m(arkaK)};height:${m(K)};position:relative;flex-shrink:0;border-radius:${m(borderRmm)};display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;background:${bg};border:0.4mm solid ${brd};color:${clr};padding:0 0.8mm;">
            ${el.seatNumber ? `<span style="position:absolute;top:0.3mm;left:0.6mm;font-size:${fontBadgePt.toFixed(1)}pt;font-weight:800;opacity:.75;line-height:1;">${el.seatNumber}</span>` : ''}
            ${el.locked ? `<span style="position:absolute;top:-0.8mm;right:-0.8mm;font-size:${(fontBadgePt+1).toFixed(1)}pt;background:#fff;border-radius:50%;line-height:1;">🔒</span>` : ''}
            ${ad ? `<span style="font-size:${fontAdPt.toFixed(1)}pt;line-height:1.15;font-weight:700;white-space:normal;word-break:break-word;overflow:hidden;max-width:100%;display:block;text-align:center;">${escapeHtml(ad)}</span>` : ''}
          </div>`;
        }
      });
      html += `</div>`;
      return;
    }

    /* Şoför sırası (row 0) — normal sıralarla AYNI grid şablonunu kullanır.
       NOT: Ducato ailesinde şoför bir veri elemanı DEĞİLDİR (sadece Büyük
       Servis/Midibüs'te soforYani:true elemanı vardır) — bu yüzden şart
       "sofor elemanı var mı"ya değil, doğrudan "bu satır 0 mı"ya bağlı. */
    if (siraIdx === 0) {
      const soforEl = yuvalar.find(el => el.type === 'sofor');
      html += `<div style="display:grid;grid-template-columns:${gridCols};gap:${m(G)};width:${m(aracIcW)};">`;
      html += `<div style="grid-column:1/${solSutun+1};height:${m(soforSiraH)};display:flex;align-items:flex-start;justify-content:center;overflow:hidden;">
        <div style="width:100%;height:100%;border-radius:${m(borderRmm)};background:rgba(245,158,11,0.14);border:0.4mm solid rgba(245,158,11,0.55);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 1mm;">
          <span style="font-size:${m(soforIkonMM)};line-height:1;">👨‍✈️</span>
          <span style="font-size:${fontSoforPt.toFixed(1)}pt;color:#92400e;font-weight:700;margin-top:${m(K*0.3)};text-align:center;word-break:break-word;white-space:normal;line-height:1.15;display:block;">${escapeHtml(servis.soforAdi || 'Şoför')}</span>
        </div>
      </div>`;
      html += `<div style="grid-column:${solSutun+1};height:${m(soforSiraH)};"></div>`;
      const digerYuvalar = yuvalar.filter(el => el.type !== 'sofor');
      if (!digerYuvalar.length && soforEl?.properties?.kapiSag) {
        html += `<div style="grid-column:${solSutun+2}/${solSutun+sagSutun+2};height:${m(soforSiraH)};display:flex;align-items:center;justify-content:center;">
          <div style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:${Math.max(9,K*0.32).toFixed(1)}pt;font-weight:800;color:#374151;letter-spacing:0.5mm;">GİRİŞ</div>
        </div>`;
      } else {
        digerYuvalar.forEach(el => {
          const col = sagKolonHarita[el.properties?.konum] || (solSutun + 2);
          html += koltukKutu(el, col);
        });
      }
      html += `</div>`;
      return;
    }

    /* Normal sıralar (row 0'daki Ducato ön koltukları da buraya düşer) */
    const kapiSagVar = yuvalar.some(el => el.properties?.kapiSag);
    const solKonumlar = ['sol-dis', 'sol-ic', 'sol-tek'];
    const soller = yuvalar.filter(el => solKonumlar.includes(el.properties?.konum));
    const saglar = yuvalar.filter(el => ['sag-ic','sag-dis'].includes(el.properties?.konum));
    const kapiSadece = kapiSagVar && saglar.filter(el => el.visible !== false).length === 0;

    html += `<div style="display:grid;grid-template-columns:${gridCols};gap:${m(G)};width:${m(aracIcW)};">`;

    soller.forEach(el => {
      const konum = el.properties?.konum;
      const col = (konum === 'sol-dis' || konum === 'sol-tek') ? 1 : 2;
      html += koltukKutu(el, col);
    });

    html += `<div style="grid-column:${solSutun+1};display:flex;align-items:center;justify-content:center;">`;
    if (kapiSadece) html += kapiHtml('KAPI');
    html += `</div>`;

    saglar.forEach(el => {
      const col = sagKolonHarita[el.properties?.konum] || (solSutun + 3);
      html += koltukKutu(el, col);
    });
    // sağ tarafta koltuk sayısı 2'den azsa kalan kolon(lar) grid'de otomatik boş kalır (placeholder gerekmez)

    if (kapiSagVar && !kapiSadece) {
      html += `<div style="grid-column:${solSutun+sagSutun+1};display:flex;align-items:center;">
        ${kapiHtml('KAPI')}
      </div>`;
    }

    html += `</div>`;
  });

  html += `</div>`; // koltuk bölümü
  html += `</div></div>`; // araç + sarmal

  return html;
}
