/* ================================================================
   js/sinif-oturma.js
   SINIF İÇİ OTURMA PLANI — tam ekran editör.

   Motor (sürükle-bırak, döndürme, öge-bazlı büyütme, otomatik yerleşim,
   yön/zoom, yazdırma) bir prototipte tasarlanıp tarayıcıda test edildi;
   burada GERÇEK sınıf öğrenci listesine (global `veliler` dizisi, bkz.
   js/siniflar.js) ve Firestore'a (SinifOturmaService) bağlanacak şekilde
   uyarlanmıştır. Dış API: window.SinifOturma.ac(sinifId).
   ================================================================ */

const SinifOturma = (function(){
  const IZGARA = 14;
  const TIKLAMA_ESIGI = 6;
  const BASLIK_PAYI = 60;
  const A4_PX = {
    dikey: { w:794,  h:1123 - BASLIK_PAYI },
    yatay: { w:1123, h:794  - BASLIK_PAYI },
  };
  const KOLTUK_DUZENI = {
    'tekli-sira':    { adet:1, sutun:1, satir:1 },
    'ikili-masa':    { adet:2, sutun:2, satir:1 },
    'grup-masasi-4': { adet:4, sutun:2, satir:2 },
    'grup-masasi-6': { adet:6, sutun:3, satir:2 },
  };
  const VARSAYILAN_BOYUT = {
    'tekli-sira':      { w:82,  h:58 },
    'ikili-masa':      { w:224, h:98 },
    'grup-masasi-4':   { w:140, h:140 },
    'grup-masasi-6':   { w:200, h:140 },
    'ogretmen-masasi': { w:224, h:112, etiket:'🧑‍🏫\nÖğretmen' },
    'kapi':            { w:28,  h:168, etiket:'🚪' },
    'pencere':         { w:14,  h:224, etiket:'' },
    'yazi-tahtasi':    { w:336, h:28,  etiket:'📋 Yazı Tahtası' },
  };
  const OGE_MIN_BOYUT = 18, OGE_MAX_BOYUT = 500;

  let sinifId = null, sinifAdi = '', ov = null, tuval = null;
  let sayac = 0, seciliOge = null, mevcutYon = 'dikey';
  let sutunBoslugu = 12, satirBoslugu = 66, topluTasimaAcik = false;
  let tabanZoom = 1, manuelZoom = 1;
  let AKTIF_BOYUT = {};
  let kaydedilmemisDegisiklik = false;

  function izgaraHizala(deger){ return Math.round(deger / IZGARA) * IZGARA; }

  // Masa/sıra büyüdükçe veya küçüldükçe, içindeki koltukların yazı boyutu da
  // KENDİ gerçek piksel boyutlarına ORANTILI olarak büyür/küçülür — böylece
  // büyük bir masada isim küçük kalmaz, küçük bir masada da taşmaz.
  function koltukYaziBoyutuAyarla(masaEl){
    masaEl.querySelectorAll('.so-koltuk').forEach(k => {
      const boyut = Math.min(k.offsetWidth, k.offsetHeight);
      const punto = Math.max(9, Math.min(26, Math.round(boyut * 0.30)));
      k.style.fontSize = punto + 'px';
    });
  }

  function sinifOgrencileri(){
    return (typeof veliler !== 'undefined' ? veliler : [])
      .filter(v => v.sinifId === sinifId)
      .sort((a,b) => (a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));
  }
  function atanmisOgrenciIdSeti(){
    const set = new Set();
    tuval.querySelectorAll('.so-koltuk[data-ogrenci-id]').forEach(k => { if (k.dataset.ogrenciId) set.add(k.dataset.ogrenciId); });
    return set;
  }
  function atanmamisHavuzuGuncelle(){
    const kapsayici = document.getElementById('soHavuz');
    if (!kapsayici) return;
    const atanmis = atanmisOgrenciIdSeti();
    const hepsi = sinifOgrencileri();
    const kalanlar = hepsi.filter(v => !atanmis.has(v.id));
    document.getElementById('soHavuzSayi').textContent = `${kalanlar.length}/${hepsi.length}`;
    kapsayici.innerHTML = kalanlar.length
      ? kalanlar.map(v => `<div class="so-havuz-item">🧑‍🎓 ${escapeHtml(v.ogrenciAdi)}</div>`).join('')
      : `<div class="so-havuz-bos">${hepsi.length ? 'Tüm öğrenciler bir koltuğa atanmış ✅' : 'Bu sınıfa henüz öğrenci eklenmemiş.'}</div>`;
  }

  function koltukSecimAc(koltukEl){
    const eski = document.getElementById('soSecimOverlay');
    if (eski) eski.remove();

    const atanmis = atanmisOgrenciIdSeti();
    const mevcutOgrenciId = koltukEl.dataset.ogrenciId || '';
    const hepsi = sinifOgrencileri();
    const secilebilir = hepsi.filter(v => v.id === mevcutOgrenciId || !atanmis.has(v.id));

    const kutu = document.createElement('div');
    kutu.id = 'soSecimOverlay';
    kutu.innerHTML = `
      <div class="so-secim-kutu">
        <h4>Öğrenci Seç</h4>
        ${secilebilir.length ? secilebilir.map(v => `
          <div class="so-secim-item" data-id="${v.id}" data-ad="${escapeHtml(v.ogrenciAdi)}">
            <span>${v.id === mevcutOgrenciId ? '✅ ' : ''}${escapeHtml(v.ogrenciAdi)}</span>
          </div>`).join('')
        : '<div class="so-havuz-bos">Atanacak öğrenci kalmadı.</div>'}
        <div class="so-secim-alt">
          <button class="so-btn so-btn-ghost" id="soSecimSerbest" style="flex:1;">✏️ Serbest İsim</button>
          ${koltukEl.dataset.isim ? '<button class="so-btn so-btn-ghost" id="soSecimBosalt" style="flex:1;">🗑 Boşalt</button>' : ''}
          <button class="so-btn so-btn-ghost" id="soSecimKapat" style="flex:1;">✕ Kapat</button>
        </div>
      </div>`;
    document.body.appendChild(kutu);

    kutu.addEventListener('click', (e) => { if (e.target === kutu) kutu.remove(); });
    kutu.querySelectorAll('.so-secim-item').forEach(item => {
      item.addEventListener('click', () => {
        koltukEl.dataset.ogrenciId = item.dataset.id;
        koltukEl.dataset.isim = item.dataset.ad;
        koltukEl.textContent = item.dataset.ad;
        koltukEl.classList.remove('so-bos');
        kutu.remove();
        atanmamisHavuzuGuncelle();
        kaydedilmemisDegisiklik = true;
      });
    });
    document.getElementById('soSecimSerbest').addEventListener('click', () => {
      const yeni = prompt('Öğrenci adı (serbest metin):', koltukEl.dataset.isim || '');
      kutu.remove();
      if (yeni === null) return;
      delete koltukEl.dataset.ogrenciId;
      koltukEl.dataset.isim = yeni;
      koltukEl.textContent = yeni.trim() ? yeni : '+';
      koltukEl.classList.toggle('so-bos', !yeni.trim());
      atanmamisHavuzuGuncelle();
      kaydedilmemisDegisiklik = true;
    });
    const bosaltBtn = document.getElementById('soSecimBosalt');
    if (bosaltBtn) bosaltBtn.addEventListener('click', () => {
      delete koltukEl.dataset.ogrenciId;
      koltukEl.dataset.isim = '';
      koltukEl.textContent = '+';
      koltukEl.classList.add('so-bos');
      kutu.remove();
      atanmamisHavuzuGuncelle();
      kaydedilmemisDegisiklik = true;
    });
    document.getElementById('soSecimKapat').addEventListener('click', () => kutu.remove());
  }

  function ogretmenAdiSor(el){
    const mevcut = el.dataset.isim || '';
    const yeni = prompt('Öğretmen adı:', mevcut);
    if (yeni === null) return;
    el.dataset.isim = yeni;
    el.textContent = yeni.trim() ? yeni : VARSAYILAN_BOYUT['ogretmen-masasi'].etiket;
    kaydedilmemisDegisiklik = true;
  }

  function ogeOlustur(tur, x, y, hizalaMi){
    if (hizalaMi === undefined) hizalaMi = true;
    const varsayilan = VARSAYILAN_BOYUT[tur];
    const aktifBoyut = AKTIF_BOYUT[tur];
    const duzen = KOLTUK_DUZENI[tur];
    const id = 'so-oge-' + (++sayac);
    const el = document.createElement('div');
    el.className = 'so-oge ' + tur;
    el.id = id;
    el.dataset.tur = tur;
    el.dataset.rotasyon = '0';
    el.style.width = aktifBoyut.w + 'px';
    el.style.height = aktifBoyut.h + 'px';
    el.style.left = (hizalaMi ? izgaraHizala(x) : Math.round(x)) + 'px';
    el.style.top  = (hizalaMi ? izgaraHizala(y) : Math.round(y)) + 'px';

    if (duzen) {
      // DÜZELTME: CSS Grid (grid-template-columns/rows) yerine her koltuğa
      // AÇIKÇA hesaplanmış yüzde konum/boyut veriliyor — html2canvas, CSS
      // Grid'in "stretch" davranışını güvenilir şekilde render edemiyor
      // (koltuklar küçük bir kare olarak kalıyordu); mutlak yüzde
      // konumlandırma bu sınırlamadan tamamen bağımsız, her zaman doğru
      // sonuç veriyor. Bu aynı zamanda "isim tam masanın yarısı olsun"
      // isteğini de birebir karşılıyor (2'li masada her koltuk tam %50x%100).
      const izgara = document.createElement('div');
      izgara.className = 'so-koltuklar';
      for (let i = 0; i < duzen.adet; i++) {
        const sutunNo = i % duzen.sutun, satirNo = Math.floor(i / duzen.sutun);
        const koltuk = document.createElement('div');
        koltuk.className = 'so-koltuk so-bos';
        koltuk.textContent = '+';
        koltuk.style.left   = (sutunNo * 100 / duzen.sutun) + '%';
        koltuk.style.top    = (satirNo * 100 / duzen.satir) + '%';
        koltuk.style.width  = (100 / duzen.sutun) + '%';
        koltuk.style.height = (100 / duzen.satir) + '%';
        izgara.appendChild(koltuk);
      }
      el.appendChild(izgara);

      const donBtn = document.createElement('div');
      donBtn.className = 'so-dondur';
      donBtn.textContent = '↻';
      donBtn.onclick = (e) => { e.stopPropagation(); ogeDondur(el); };
      el.appendChild(donBtn);
    } else if (tur === 'ogretmen-masasi') {
      const etiketSpan = document.createElement('span');
      etiketSpan.className = 'so-ogretmen-ad';
      etiketSpan.style.whiteSpace = 'pre-line';
      etiketSpan.textContent = varsayilan.etiket;
      el.appendChild(etiketSpan);
    } else {
      const etiketSpan = document.createElement('span');
      etiketSpan.style.whiteSpace = 'pre-line';
      etiketSpan.textContent = varsayilan.etiket;
      el.appendChild(etiketSpan);
    }

    const silBtn = document.createElement('div');
    silBtn.className = 'so-sil';
    silBtn.textContent = '✕';
    silBtn.onclick = (e) => {
      e.stopPropagation();
      el.remove();
      if (seciliOge === el) seciliOge = null;
      atanmamisHavuzuGuncelle();
      kaydedilmemisDegisiklik = true;
    };
    el.appendChild(silBtn);

    const buyutBtn = document.createElement('div');
    buyutBtn.className = 'so-boyut so-buyut';
    buyutBtn.textContent = '＋';
    buyutBtn.title = 'Bu türdeki tüm ögeleri büyüt';
    buyutBtn.onclick = (e) => { e.stopPropagation(); turBazliBoyutlandir(tur, 1.15); };
    el.appendChild(buyutBtn);

    const kucultBtn = document.createElement('div');
    kucultBtn.className = 'so-boyut so-kucult';
    kucultBtn.textContent = '－';
    kucultBtn.title = 'Bu türdeki tüm ögeleri küçült';
    kucultBtn.onclick = (e) => { e.stopPropagation(); turBazliBoyutlandir(tur, 0.87); };
    el.appendChild(kucultBtn);

    surukleBagla(el);
    tuval.appendChild(el);
    koltukYaziBoyutuAyarla(el);
    ogeSec(el);
    kaydedilmemisDegisiklik = true;
    return el;
  }

  function ogeDondur(el){
    let rot = (parseInt(el.dataset.rotasyon, 10) + 90) % 360;
    el.dataset.rotasyon = rot;
    el.style.transform = `rotate(${rot}deg)`;
    kaydedilmemisDegisiklik = true;
  }

  function ogeBoyutlandir(el, carpan){
    const yeniW = Math.max(OGE_MIN_BOYUT, Math.min(OGE_MAX_BOYUT, Math.round(el.offsetWidth * carpan)));
    const yeniH = Math.max(OGE_MIN_BOYUT, Math.min(OGE_MAX_BOYUT, Math.round(el.offsetHeight * carpan)));
    el.style.width  = izgaraHizala(yeniW) + 'px';
    el.style.height = izgaraHizala(yeniH) + 'px';
    koltukYaziBoyutuAyarla(el);
  }

  function turBazliBoyutlandir(tur, carpan){
    const eller = tuval.querySelectorAll(`.so-oge[data-tur="${tur}"]`);
    eller.forEach(el => ogeBoyutlandir(el, carpan));
    if (eller.length) {
      AKTIF_BOYUT[tur] = { w: eller[0].offsetWidth, h: eller[0].offsetHeight };
    } else {
      const b = AKTIF_BOYUT[tur];
      AKTIF_BOYUT[tur] = {
        w: izgaraHizala(Math.max(OGE_MIN_BOYUT, Math.min(OGE_MAX_BOYUT, Math.round(b.w * carpan)))),
        h: izgaraHizala(Math.max(OGE_MIN_BOYUT, Math.min(OGE_MAX_BOYUT, Math.round(b.h * carpan)))),
      };
    }
    boyutGosterGuncelle(tur);
    kaydedilmemisDegisiklik = true;
  }

  function ogeSec(el){
    if (seciliOge) seciliOge.classList.remove('so-secili');
    seciliOge = el;
    if (seciliOge) seciliOge.classList.add('so-secili');
  }

  function surukleBagla(el){
    let basX = 0, basY = 0, ogeBasX = 0, ogeBasY = 0, surukleniyor = false, basHedef = null;
    let grup = null;

    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.so-sil, .so-dondur, .so-boyut')) return;
      ogeSec(el);
      surukleniyor = true;
      basHedef = e.target;
      el.classList.add('so-surukleniyor');
      el.setPointerCapture(e.pointerId);
      basX = e.clientX; basY = e.clientY;
      ogeBasX = el.offsetLeft; ogeBasY = el.offsetTop;

      if (topluTasimaAcik && KOLTUK_DUZENI[el.dataset.tur]) {
        const parcalar = Array.from(tuval.querySelectorAll('.so-oge')).filter(d => KOLTUK_DUZENI[d.dataset.tur]);
        const konumlar = parcalar.map(d => ({ el: d, x: d.offsetLeft, y: d.offsetTop }));
        grup = {
          konumlar,
          minX: Math.min(...konumlar.map(k => k.x)),
          minY: Math.min(...konumlar.map(k => k.y)),
          maxX: Math.max(...konumlar.map(k => k.x + k.el.offsetWidth)),
          maxY: Math.max(...konumlar.map(k => k.y + k.el.offsetHeight)),
        };
      } else {
        grup = null;
      }
    });

    el.addEventListener('pointermove', (e) => {
      if (!surukleniyor) return;
      let dx = e.clientX - basX, dy = e.clientY - basY;
      if (grup) {
        dx = Math.max(-grup.minX, Math.min(tuval.clientWidth - grup.maxX, dx));
        dy = Math.max(-grup.minY, Math.min(tuval.clientHeight - grup.maxY, dy));
        grup.konumlar.forEach(k => {
          k.el.style.left = (k.x + dx) + 'px';
          k.el.style.top  = (k.y + dy) + 'px';
        });
      } else {
        let yeniX = ogeBasX + dx, yeniY = ogeBasY + dy;
        yeniX = Math.max(0, Math.min(tuval.clientWidth - el.offsetWidth, yeniX));
        yeniY = Math.max(0, Math.min(tuval.clientHeight - el.offsetHeight, yeniY));
        el.style.left = yeniX + 'px';
        el.style.top = yeniY + 'px';
      }
    });

    const birak = (e) => {
      if (!surukleniyor) return;
      surukleniyor = false;
      el.classList.remove('so-surukleniyor');
      if (grup) {
        const hizaliX = izgaraHizala(el.offsetLeft);
        const hizaliY = izgaraHizala(el.offsetTop);
        const dX = hizaliX - el.offsetLeft, dY = hizaliY - el.offsetTop;
        grup.konumlar.forEach(k => {
          k.el.style.left = (k.el.offsetLeft + dX) + 'px';
          k.el.style.top  = (k.el.offsetTop + dY) + 'px';
        });
        grup = null;
      } else {
        el.style.left = izgaraHizala(el.offsetLeft) + 'px';
        el.style.top = izgaraHizala(el.offsetTop) + 'px';
      }

      const mesafe = Math.hypot((e.clientX || basX) - basX, (e.clientY || basY) - basY);
      if (mesafe < TIKLAMA_ESIGI && basHedef && basHedef.classList) {
        if (basHedef.classList.contains('so-koltuk')) {
          koltukSecimAc(basHedef);
        } else if (basHedef.classList.contains('so-ogretmen-ad')) {
          ogretmenAdiSor(basHedef);
        }
      } else if (mesafe >= TIKLAMA_ESIGI) {
        kaydedilmemisDegisiklik = true;
      }
    };
    el.addEventListener('pointerup', birak);
    el.addEventListener('pointercancel', birak);
  }

  function sayfaYonunuUygula(yon){
    mevcutYon = yon;
    const boyut = A4_PX[yon];
    tuval.style.width  = boyut.w + 'px';
    tuval.style.height = boyut.h + 'px';
    ov.querySelector('#btnSoYonDikey').classList.toggle('so-aktif', yon === 'dikey');
    ov.querySelector('#btnSoYonYatay').classList.toggle('so-aktif', yon === 'yatay');
    tuvalEkraniSigdir();
  }

  function zoomUygula(){ tuval.style.zoom = tabanZoom * manuelZoom; }
  function tuvalEkraniSigdir(){
    const kaydirma = ov.querySelector('.so-tuval-kaydirma');
    const mevcutGenislik = kaydirma.clientWidth - 28;
    const gercekGenislik = A4_PX[mevcutYon].w;
    tabanZoom = Math.min(1, mevcutGenislik / gercekGenislik);
    zoomUygula();
  }

  function otomatikYerlestir(sessiz){
    const masaTuru = ov.querySelector('#soMasaTuru').value;
    const sutun = Math.max(1, parseInt(ov.querySelector('#soSutun').value, 10) || 1);
    const satir = Math.max(1, parseInt(ov.querySelector('#soSatir').value, 10) || 1);
    const kapiSol = ov.querySelector('#soKapiYonu').value === 'sol';

    if (!sessiz && tuval.children.length && !confirm('Mevcut yerleşim silinip otomatik düzene göre yeniden oluşturulacak. Devam edilsin mi?')) return;
    tuval.innerHTML = '';
    seciliOge = null;

    const boyut = AKTIF_BOYUT[masaTuru];
    const KENAR_MARJ = 60, UST_SIRA_Y = 55, ON_MARJ = 130;
    const izgaraGenislik  = sutun * boyut.w + (sutun - 1) * sutunBoslugu;
    const izgaraYukseklik = satir * boyut.h + (satir - 1) * satirBoslugu;
    const baslangicX = KENAR_MARJ, baslangicY = ON_MARJ;

    for (let c = 0; c < sutun; c++){
      for (let r = 0; r < satir; r++){
        const x = baslangicX + c * (boyut.w + sutunBoslugu);
        const y = baslangicY + r * (boyut.h + satirBoslugu);
        ogeOlustur(masaTuru, x, y, false);
      }
    }

    const duvarX = kapiSol ? (baslangicX + izgaraGenislik + 25) : 15;
    const kapiX  = kapiSol ? 15 : (baslangicX + izgaraGenislik + 25);
    const ogretmenBoyut = AKTIF_BOYUT['ogretmen-masasi'];
    const ogretmenX = kapiSol ? (baslangicX + izgaraGenislik - ogretmenBoyut.w) : baslangicX;

    ogeOlustur('kapi', kapiX, UST_SIRA_Y, false);
    const ogretmenEl = ogeOlustur('ogretmen-masasi', ogretmenX, UST_SIRA_Y, false);
    const s = _soSinifNesnesi();
    const ogretmenVarsayilanAd = (typeof sinifOgretmeniAdi === 'function' && s) ? sinifOgretmeniAdi(s) : '';
    if (ogretmenVarsayilanAd && ogretmenVarsayilanAd !== '—') {
      const span = ogretmenEl.querySelector('.so-ogretmen-ad');
      span.textContent = ogretmenVarsayilanAd;
      ogretmenEl.dataset.isim = ogretmenVarsayilanAd;
    }

    const pencereBoyut = AKTIF_BOYUT['pencere'];
    const pencereBaslangicY = UST_SIRA_Y + ogretmenBoyut.h + 24;
    const pencereBolgeYukseklik = Math.max(0, (baslangicY + izgaraYukseklik) - pencereBaslangicY);
    const pencereAraligi = pencereBoyut.h + 30;
    const pencereSayisi = Math.max(1, Math.floor(pencereBolgeYukseklik / pencereAraligi));
    for (let i = 0; i < pencereSayisi; i++){
      const dilim = pencereBolgeYukseklik / pencereSayisi;
      const y = pencereBaslangicY + (i + 0.5) * dilim - pencereBoyut.h / 2;
      ogeOlustur('pencere', duvarX, Math.max(10, y), false);
    }

    const tahtaBoyut = AKTIF_BOYUT['yazi-tahtasi'];
    const tahtaX = baslangicX + izgaraGenislik / 2 - tahtaBoyut.w / 2;
    ogeOlustur('yazi-tahtasi', Math.max(10, tahtaX), 15, false);

    ogeSec(null);

    const durumEl = ov.querySelector('#soOtoDurum');
    let sagUc = 0, altUc = 0;
    Array.from(tuval.children).forEach(el => {
      sagUc = Math.max(sagUc, el.offsetLeft + el.offsetWidth);
      altUc = Math.max(altUc, el.offsetTop + el.offsetHeight);
    });
    const sigiyor = sagUc <= tuval.offsetWidth && altUc <= tuval.offsetHeight;
    durumEl.textContent = sigiyor ? '· ✅ sayfaya sığıyor' : '· ⚠️ sayfayı taşıyor — sütun/satır azaltın ya da yön değiştirin';
    durumEl.style.color = sigiyor ? '#2e7d32' : '#c0392b';
    atanmamisHavuzuGuncelle();
  }

  function otomatikDoldur(){
    const ogrenciler = sinifOgrencileri();
    const koltuklar = Array.from(tuval.querySelectorAll('.so-koltuk'));
    let i = 0;
    for (const k of koltuklar){
      if (i >= ogrenciler.length) break;
      const v = ogrenciler[i++];
      k.dataset.ogrenciId = v.id;
      k.dataset.isim = v.ogrenciAdi;
      k.textContent = v.ogrenciAdi;
      k.classList.remove('so-bos');
    }
    atanmamisHavuzuGuncelle();
  }

  function boyutGosterGuncelle(tur){
    const idMap = {
      'ikili-masa':'soMasaBoyutGoster', 'tekli-sira':'soMasaBoyutGoster',
      'grup-masasi-4':'soMasaBoyutGoster', 'grup-masasi-6':'soMasaBoyutGoster',
      'ogretmen-masasi':'soOgretmenBoyutGoster', 'kapi':'soKapiBoyutGoster',
      'pencere':'soPencereBoyutGoster', 'yazi-tahtasi':'soTahtaBoyutGoster',
    };
    const seciliMasaTuru = ov.querySelector('#soMasaTuru').value;
    if (tur === 'ogretmen-masasi' || tur === 'kapi' || tur === 'pencere' || tur === 'yazi-tahtasi' || tur === seciliMasaTuru) {
      const spanId = idMap[tur];
      const el = spanId && ov.querySelector('#'+spanId);
      if (el) { const b = AKTIF_BOYUT[tur]; el.textContent = b.w + '×' + b.h; }
    }
  }

  function planiSerilestir(){
    const ogeler = Array.from(tuval.children).map(el => {
      const obj = {
        tur: el.dataset.tur,
        x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight,
        rotasyon: parseInt(el.dataset.rotasyon, 10) || 0,
      };
      if (el.dataset.isim) obj.isim = el.dataset.isim;
      const koltuklar = el.querySelectorAll('.so-koltuk');
      if (koltuklar.length) {
        obj.koltuklar = Array.from(koltuklar).map(k => ({
          ogrenciId: k.dataset.ogrenciId || null,
          isim: k.dataset.isim || '',
        }));
      }
      return obj;
    });
    return {
      sinifId, ogeler,
      sayfaYonu: mevcutYon, sutunBoslugu, satirBoslugu,
      masaTuru: ov.querySelector('#soMasaTuru').value,
      sutunSayisi: ov.querySelector('#soSutun').value,
      satirSayisi: ov.querySelector('#soSatir').value,
      kapiYonu: ov.querySelector('#soKapiYonu').value,
      guncellemeTarihi: new Date().toISOString(),
    };
  }

  function planiYukle(kayit){
    tuval.innerHTML = '';
    seciliOge = null;
    sayfaYonunuUygula(kayit.sayfaYonu === 'yatay' ? 'yatay' : 'dikey');
    sutunBoslugu = Number.isFinite(kayit.sutunBoslugu) ? kayit.sutunBoslugu : sutunBoslugu;
    satirBoslugu = Number.isFinite(kayit.satirBoslugu) ? kayit.satirBoslugu : satirBoslugu;
    sutunAraligiGoster(); satirAraligiGoster();
    if (kayit.masaTuru) ov.querySelector('#soMasaTuru').value = kayit.masaTuru;
    if (kayit.sutunSayisi) ov.querySelector('#soSutun').value = kayit.sutunSayisi;
    if (kayit.satirSayisi) ov.querySelector('#soSatir').value = kayit.satirSayisi;
    if (kayit.kapiYonu) ov.querySelector('#soKapiYonu').value = kayit.kapiYonu;

    (kayit.ogeler || []).forEach(o => {
      const el = ogeOlustur(o.tur, o.x, o.y, false);
      el.style.width = o.w + 'px';
      el.style.height = o.h + 'px';
      koltukYaziBoyutuAyarla(el);
      if (o.rotasyon) { el.dataset.rotasyon = o.rotasyon; el.style.transform = `rotate(${o.rotasyon}deg)`; }
      if (o.isim) {
        el.dataset.isim = o.isim;
        const span = el.querySelector('.so-ogretmen-ad') || el.querySelector('span');
        if (span) span.textContent = o.isim;
      }
      if (o.koltuklar) {
        const koltukEller = el.querySelectorAll('.so-koltuk');
        o.koltuklar.forEach((k, i) => {
          const kEl = koltukEller[i];
          if (!kEl) return;
          if (k.ogrenciId) kEl.dataset.ogrenciId = k.ogrenciId;
          if (k.isim) { kEl.dataset.isim = k.isim; kEl.textContent = k.isim; kEl.classList.remove('so-bos'); }
        });
      }
      AKTIF_BOYUT[o.tur] = { w: o.w, h: o.h };
    });
    Object.keys(AKTIF_BOYUT).forEach(boyutGosterGuncelle);
    ogeSec(null);
    atanmamisHavuzuGuncelle();
    kaydedilmemisDegisiklik = false;
  }

  async function kaydet(){
    const btn = ov.querySelector('#btnSoKaydet');
    const eskiMetin = btn.textContent;
    btn.disabled = true; btn.textContent = '⏳ Kaydediliyor…';
    try {
      await SinifOturmaService.planKaydet(sinifId, planiSerilestir());
      kaydedilmemisDegisiklik = false;
      btn.textContent = '✅ Kaydedildi';
      setTimeout(() => { btn.textContent = eskiMetin; btn.disabled = false; }, 1400);
    } catch (e) {
      alert('Kaydetme hatası: ' + (e.message === 'yetkisiz' ? 'Bu işlem için yetkiniz yok.' : e.message));
      btn.disabled = false; btn.textContent = eskiMetin;
    }
  }

  function sutunAraligiGoster(){ const el = ov.querySelector('#soSutunAraligiGoster'); if (el) el.textContent = sutunBoslugu + 'px'; }
  function satirAraligiGoster(){ const el = ov.querySelector('#soSatirAraligiGoster'); if (el) el.textContent = satirBoslugu + 'px'; }

  function _soSinifNesnesi(){
    return (typeof siniflar !== 'undefined') ? siniflar.find(x => x.id === sinifId) : null;
  }

  // "2026 - 2027 EĞİTİM ÖĞRETİM YILI 2-A SINIFI OTURMA DÜZENİ" biçiminde
  // başlık üretir (bkz. ilk istenen format). Eğitim yılı, uygulama genelinde
  // tek bir ortak değişken olmadığı için takvimden hesaplanır: Eylül-Aralık
  // arası "bu yıl - gelecek yıl", Ocak-Ağustos arası "geçen yıl - bu yıl".
  function _egitimYiliHesapla(){
    const su_an = new Date();
    const yil = su_an.getFullYear();
    return (su_an.getMonth() >= 8) ? `${yil} - ${yil + 1}` : `${yil - 1} - ${yil}`;
  }
  function _soBaslikMetni(){
    return `${_egitimYiliHesapla()} EĞİTİM ÖĞRETİM YILI ${(sinifAdi || '').toLocaleUpperCase('tr')} SINIFI OTURMA DÜZENİ`;
  }

  // DÜZELTME (Android kök sebep — TAMAMEN FARKLI YOL): window.print() +
  // CSS @page/zoom/transform ile üç ayrı ölçekleme tekniği denendi, hepsi
  // masaüstünde çalıştı ama Android'in yazdırma altyapısında ısrarla bozuk
  // sonuç verdi. window.print() TAMAMEN terk edildi — bunun yerine tuval
  // doğrudan bir görüntüye (html2canvas) çevrilip jsPDF ile bir PDF'e
  // gömülüyor ve uygulamanın zaten var olan güvenilir native kaydetme
  // köprüsüyle (uygulamaDosyaKaydet — bkz. ogretmen-liste-olusturucu.js'de
  // aynı desen) kaydediliyor. Tarayıcının yazdırma/önizleme motoruna hiç
  // uğramadığı için önceki tutarsızlıklara bağımlı değil.
  async function yazdir(){
    const btn = ov.querySelector('#btnSoYazdir');
    const eskiMetin = btn.textContent;
    btn.disabled = true; btn.textContent = '⏳ PDF Oluşturuluyor…';

    const eskiSecili = seciliOge;
    ogeSec(null); // sil/döndür/boyut düğmeleri görüntüye girmesin
    tuval.classList.add('so-yakalama-modu'); // boş koltuklardaki "+" işareti çıktıda görünmesin
    const ekranZoom = tuval.style.zoom;
    tuval.style.zoom = ''; // yakalama sırasında ekrana-sığdırma zoom'u karışmasın, gerçek boyut kullanılsın
    await new Promise(r => setTimeout(r, 60)); // seçim kaldırma/zoom sıfırlamanın ekrana yansıması için kısa bekleme

    try {
      const canvas = await html2canvas(tuval, { scale: 2, backgroundColor: '#ffffff' });
      const { jsPDF } = window.jspdf;
      const oranGenYuk = canvas.width / canvas.height;
      const sayfaGenMM = mevcutYon === 'yatay' ? 297 : 210;
      const sayfaYukMM = mevcutYon === 'yatay' ? 210 : 297;
      const doc = new jsPDF({ orientation: mevcutYon === 'yatay' ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });

      // DÜZELTME: jsPDF'in yerleşik fontları (Helvetica vb.) Türkçe'ye özgü
      // karakterleri (Ğ, İ, ı, Ş, ğ, ş) desteklemiyor, "0" gibi bozuk
      // karakterlere dönüşüyordu — uygulamada zaten var olan, Türkçe
      // destekli Roboto fontunu yükleyen ortak yardımcı (bkz.
      // ogretmen-liste-olusturucu.js) burada da kullanılıyor.
      let fontAdi = 'helvetica';
      if (typeof olPdfFontBase64Getir === 'function') {
        try {
          const fontB64 = await olPdfFontBase64Getir();
          if (fontB64) {
            doc.addFileToVFS('Roboto-Regular.ttf', fontB64);
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
            fontAdi = 'Roboto';
          }
        } catch (e) { /* yüklenemezse helvetica ile devam edilir */ }
      }
      doc.setFont(fontAdi, 'normal');

      const kenarMM = 8, ustBaslikPayiMM = 18;
      const kullanilabilirGenMM = sayfaGenMM - kenarMM * 2;
      // DÜZELTME: başlık metni sabit 13pt ile sayfa genişliğini aşıp
      // kırpılıyordu — artık metin genişliği ölçülüp, sığana kadar punto
      // kademeli olarak küçültülüyor (7pt'nin altına inmiyor).
      const baslikMetni = _soBaslikMetni();
      let baslikPunto = 13;
      doc.setFontSize(baslikPunto);
      while (doc.getTextWidth(baslikMetni) > kullanilabilirGenMM && baslikPunto > 7) {
        baslikPunto -= 0.5;
        doc.setFontSize(baslikPunto);
      }
      doc.text(baslikMetni, sayfaGenMM / 2, 12, { align: 'center' });

      const kullanilabilirYukMM = sayfaYukMM - ustBaslikPayiMM - kenarMM;
      let cizimGenMM = kullanilabilirGenMM, cizimYukMM = cizimGenMM / oranGenYuk;
      if (cizimYukMM > kullanilabilirYukMM) { cizimYukMM = kullanilabilirYukMM; cizimGenMM = cizimYukMM * oranGenYuk; }
      const xMM = (sayfaGenMM - cizimGenMM) / 2;
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', xMM, ustBaslikPayiMM, cizimGenMM, cizimYukMM);

      const dosyaAdi = `${(sinifAdi || 'Sinif').replace(/[^\wğüşıöçĞÜŞİÖÇ-]/g, '_')}_Oturma_Plani.pdf`;
      if (typeof uygulamaDosyaKaydet === 'function') {
        const datauri = doc.output('datauristring');
        const base64 = datauri.split('base64,')[1];
        await uygulamaDosyaKaydet(base64, dosyaAdi, 'application/pdf');
      } else {
        doc.save(dosyaAdi);
      }
    } catch (e) {
      alert('PDF oluşturma hatası: ' + e.message);
    } finally {
      tuval.classList.remove('so-yakalama-modu');
      tuval.style.zoom = ekranZoom;
      if (eskiSecili) ogeSec(eskiSecili);
      btn.disabled = false; btn.textContent = eskiMetin;
    }
  }

  function _iskeletHtml(){
    return `
      <div class="so-header">
        <button class="so-btn so-btn-ghost" id="btnSoKapat">← Kapat</button>
        <h1 id="soBaslik">Sınıf Oturma Planı</h1>
        <div style="display:flex; gap:8px;">
          <button class="so-btn so-btn-ghost" id="btnSoTemizle">🗑 Tümünü Temizle</button>
          <button class="so-btn so-btn-brand" id="btnSoKaydet">💾 Kaydet</button>
          <button class="so-btn so-btn-brand" id="btnSoYazdir">📄 PDF Oluştur</button>
        </div>
      </div>
      <div class="so-govde">
        <div class="so-palet so-nm-raised">
          <div class="so-palet-grup">
            <h3>Masa / Sıra</h3>
            <button class="so-palet-btn" data-tur="tekli-sira"><span class="so-ikon">▭</span> Tekli Sıra</button>
            <button class="so-palet-btn" data-tur="ikili-masa"><span class="so-ikon">▬</span> İkili Masa</button>
            <button class="so-palet-btn" data-tur="grup-masasi-4"><span class="so-ikon">▦</span> Grup Masası (4'lü)</button>
            <button class="so-palet-btn" data-tur="grup-masasi-6"><span class="so-ikon">▦</span> Grup Masası (6'lı)</button>
          </div>
          <div class="so-palet-grup">
            <h3>Sınıf Unsurları</h3>
            <button class="so-palet-btn" data-tur="ogretmen-masasi"><span class="so-ikon">🧑‍🏫</span> Öğretmen Masası</button>
            <button class="so-palet-btn" data-tur="kapi"><span class="so-ikon">🚪</span> Kapı</button>
            <button class="so-palet-btn" data-tur="pencere"><span class="so-ikon">🪟</span> Pencere</button>
            <button class="so-palet-btn" data-tur="yazi-tahtasi"><span class="so-ikon">📋</span> Yazı Tahtası</button>
          </div>

          <div class="so-palet-grup so-oto-panel">
            <h3>🪄 Otomatik Yerleşim</h3>
            <label class="so-oto-etiket">Masa türü</label>
            <select id="soMasaTuru" class="so-oto-input">
              <option value="tekli-sira">Tekli Sıra</option>
              <option value="ikili-masa" selected>İkili Masa</option>
              <option value="grup-masasi-4">Grup Masası (4'lü)</option>
              <option value="grup-masasi-6">Grup Masası (6'lı)</option>
            </select>
            <div class="so-oto-satir-2">
              <div>
                <label class="so-oto-etiket">Yan yana (sütun)</label>
                <input type="number" id="soSutun" class="so-oto-input" value="3" min="1" max="10">
              </div>
              <div>
                <label class="so-oto-etiket">Arka arkaya (satır)</label>
                <input type="number" id="soSatir" class="so-oto-input" value="5" min="1" max="15">
              </div>
            </div>
            <label class="so-oto-etiket">Kapı konumu</label>
            <select id="soKapiYonu" class="so-oto-input">
              <option value="sol">Sol</option>
              <option value="sag" selected>Sağ</option>
            </select>
            <label class="so-oto-etiket">Sütun aralığı (koridor)</label>
            <div class="so-oto-stepper">
              <button type="button" class="so-yon-btn" id="btnSoSutunAraligiAzalt">－</button>
              <span id="soSutunAraligiGoster">12px</span>
              <button type="button" class="so-yon-btn" id="btnSoSutunAraligiArtir">＋</button>
            </div>
            <label class="so-oto-etiket">Satır aralığı</label>
            <div class="so-oto-stepper">
              <button type="button" class="so-yon-btn" id="btnSoSatirAraligiAzalt">－</button>
              <span id="soSatirAraligiGoster">66px</span>
              <button type="button" class="so-yon-btn" id="btnSoSatirAraligiArtir">＋</button>
            </div>
            <div class="so-palet-not" style="padding:6px 2px 8px;">Öğretmen masası ve pencereler kapının ters tarafına yerleştirilir.</div>
            <button class="so-btn so-btn-brand" id="btnSoOtoYerlestir" style="width:100%; justify-content:center;">🪄 Otomatik Yerleştir</button>
          </div>

          <div class="so-palet-grup so-oto-panel">
            <h3>📐 Öge Boyutları</h3>
            <label class="so-oto-etiket">Masa (yukarıda seçili tür)</label>
            <div class="so-oto-stepper">
              <button type="button" class="so-yon-btn" id="btnSoMasaBoyutAzalt">－</button>
              <span id="soMasaBoyutGoster">224×98</span>
              <button type="button" class="so-yon-btn" id="btnSoMasaBoyutArtir">＋</button>
            </div>
            <label class="so-oto-etiket">Öğretmen Masası</label>
            <div class="so-oto-stepper">
              <button type="button" class="so-yon-btn" id="btnSoOgretmenBoyutAzalt">－</button>
              <span id="soOgretmenBoyutGoster">224×112</span>
              <button type="button" class="so-yon-btn" id="btnSoOgretmenBoyutArtir">＋</button>
            </div>
            <label class="so-oto-etiket">Kapı</label>
            <div class="so-oto-stepper">
              <button type="button" class="so-yon-btn" id="btnSoKapiBoyutAzalt">－</button>
              <span id="soKapiBoyutGoster">28×168</span>
              <button type="button" class="so-yon-btn" id="btnSoKapiBoyutArtir">＋</button>
            </div>
            <label class="so-oto-etiket">Pencere</label>
            <div class="so-oto-stepper">
              <button type="button" class="so-yon-btn" id="btnSoPencereBoyutAzalt">－</button>
              <span id="soPencereBoyutGoster">14×224</span>
              <button type="button" class="so-yon-btn" id="btnSoPencereBoyutArtir">＋</button>
            </div>
            <label class="so-oto-etiket">Yazı Tahtası</label>
            <div class="so-oto-stepper">
              <button type="button" class="so-yon-btn" id="btnSoTahtaBoyutAzalt">－</button>
              <span id="soTahtaBoyutGoster">336×28</span>
              <button type="button" class="so-yon-btn" id="btnSoTahtaBoyutArtir">＋</button>
            </div>
          </div>

          <div class="so-palet-grup">
            <h3>👥 Atanmamış Öğrenciler <span id="soHavuzSayi" style="color:var(--ink-muted);"></span></h3>
            <div id="soHavuz"></div>
          </div>

          <div class="so-palet-not">
            Üstteki butonla öge ekleyin, tuval üzerinde sürükleyerek yerleştirin. Seçili ögede ↻ döndürür,
            ✕ siler. <strong>Masa içindeki her kutucuk ayrı bir öğrenci koltuğudur</strong> — dokununca sınıfın
            gerçek öğrenci listesinden seçim yapabilirsiniz. <strong>Öğretmen masasına</strong> da dokununca isim yazabilirsiniz.
          </div>
        </div>

        <div class="so-tuval-sarici so-nm-raised">
          <div class="so-tuval-baslik">
            <span class="so-ad">Sınıf Yerleşimi <span id="soOtoDurum" style="font-weight:600;"></span></span>
            <div class="so-yon-secim">
              <button class="so-yon-btn so-aktif" id="btnSoYonDikey" data-yon="dikey">📄 Dikey A4</button>
              <button class="so-yon-btn" id="btnSoYonYatay" data-yon="yatay">📄 Yatay A4</button>
            </div>
            <div class="so-yon-secim">
              <button class="so-yon-btn" id="btnSoZoomAzalt" title="Uzaklaştır">➖</button>
              <button class="so-yon-btn" id="btnSoZoomSigdir" title="Ekrana sığdır">🔍 Sığdır</button>
              <button class="so-yon-btn" id="btnSoZoomArtir" title="Yakınlaştır">➕</button>
            </div>
            <div class="so-yon-secim">
              <button class="so-yon-btn" id="btnSoTopluTasima" title="Açıkken herhangi bir masayı sürüklemek TÜM masaları birlikte taşır">🔗 Masaları Birlikte Taşı</button>
            </div>
            <span class="so-ipucu">Sayfa sınırı siyah çerçeve · Boş alanı sürükleyerek kaydırın</span>
          </div>
          <div class="so-tuval-kaydirma">
            <div id="soTuval"></div>
          </div>
        </div>
      </div>
      <div class="so-footer">Değişiklikler otomatik kaydedilmez — bitirdiğinizde 💾 Kaydet'e basmayı unutmayın.</div>
    `;
  }

  function _olaylariBagla(){
    ov.querySelector('#btnSoKapat').addEventListener('click', () => {
      if (kaydedilmemisDegisiklik && !confirm('Kaydedilmemiş değişiklikleriniz var. Yine de kapatılsın mı?')) return;
      kapat();
    });
    ov.querySelector('#btnSoTemizle').addEventListener('click', () => {
      if (!tuval.children.length) return;
      if (confirm('Tüm yerleşimi temizlemek istediğinize emin misiniz?')) { tuval.innerHTML = ''; seciliOge = null; atanmamisHavuzuGuncelle(); kaydedilmemisDegisiklik = true; }
    });
    ov.querySelector('#btnSoKaydet').addEventListener('click', kaydet);
    ov.querySelector('#btnSoYazdir').addEventListener('click', yazdir);

    ov.querySelectorAll('.so-palet-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tur = btn.dataset.tur;
        const x = 30 + (sayac % 9) * 130;
        const y = 30 + Math.floor(sayac / 9) * 120;
        ogeOlustur(tur, x, y);
      });
    });

    tuval.addEventListener('click', (e) => { if (e.target === tuval) ogeSec(null); });

    ov.querySelector('#btnSoYonDikey').addEventListener('click', () => sayfaYonunuUygula('dikey'));
    ov.querySelector('#btnSoYonYatay').addEventListener('click', () => sayfaYonunuUygula('yatay'));
    ov.querySelector('#btnSoTopluTasima').addEventListener('click', (e) => {
      topluTasimaAcik = !topluTasimaAcik;
      e.currentTarget.classList.toggle('so-aktif', topluTasimaAcik);
    });
    ov.querySelector('#btnSoZoomArtir').addEventListener('click', () => { manuelZoom = Math.min(3, +(manuelZoom+0.2).toFixed(2)); zoomUygula(); });
    ov.querySelector('#btnSoZoomAzalt').addEventListener('click', () => { manuelZoom = Math.max(0.3, +(manuelZoom-0.2).toFixed(2)); zoomUygula(); });
    ov.querySelector('#btnSoZoomSigdir').addEventListener('click', () => { manuelZoom = 1; tuvalEkraniSigdir(); });
    window.addEventListener('resize', tuvalEkraniSigdir);

    ov.querySelector('#btnSoOtoYerlestir').addEventListener('click', () => otomatikYerlestir(false));

    ov.querySelector('#btnSoSutunAraligiArtir').addEventListener('click', () => { sutunBoslugu = Math.min(120, sutunBoslugu+6); sutunAraligiGoster(); });
    ov.querySelector('#btnSoSutunAraligiAzalt').addEventListener('click', () => { sutunBoslugu = Math.max(0, sutunBoslugu-6); sutunAraligiGoster(); });
    ov.querySelector('#btnSoSatirAraligiArtir').addEventListener('click', () => { satirBoslugu = Math.min(80, satirBoslugu+4); satirAraligiGoster(); });
    ov.querySelector('#btnSoSatirAraligiAzalt').addEventListener('click', () => { satirBoslugu = Math.max(0, satirBoslugu-4); satirAraligiGoster(); });

    const boyutStepperBagla = (azaltId, artirId, turBul) => {
      ov.querySelector('#'+artirId).addEventListener('click', () => turBazliBoyutlandir(turBul(), 1.15));
      ov.querySelector('#'+azaltId).addEventListener('click', () => turBazliBoyutlandir(turBul(), 0.87));
    };
    boyutStepperBagla('btnSoMasaBoyutAzalt', 'btnSoMasaBoyutArtir', () => ov.querySelector('#soMasaTuru').value);
    boyutStepperBagla('btnSoOgretmenBoyutAzalt', 'btnSoOgretmenBoyutArtir', () => 'ogretmen-masasi');
    boyutStepperBagla('btnSoKapiBoyutAzalt', 'btnSoKapiBoyutArtir', () => 'kapi');
    boyutStepperBagla('btnSoPencereBoyutAzalt', 'btnSoPencereBoyutArtir', () => 'pencere');
    boyutStepperBagla('btnSoTahtaBoyutAzalt', 'btnSoTahtaBoyutArtir', () => 'yazi-tahtasi');
    ov.querySelector('#soMasaTuru').addEventListener('change', (e) => boyutGosterGuncelle(e.target.value));
  }

  function kapat(){
    if (ov) { ov.remove(); ov = null; }
    // DÜZELTME: Burada _pullToRefreshAyarla(true) ÇAĞRILMIYOR — bu editör
    // her zaman zaten açık bir sınıf detay panelinin (#detayOverlay) İÇİNDEN
    // açılıyor; o panel açılırken jesti kendisi kapatmıştı (sinifDetayAc)
    // ve kendisi kapanırken tekrar açacak (detayPanelKapat). Burada tekrar
    // açarsak, kullanıcı editörü kapatıp hâlâ açık olan sınıf detayında
    // kaydırdığında yenileme jesti erken devreye giriyordu (bulunan hata).
    // (modal-open sınıfı da kaldırılmıyor — aynı sebeple, alttaki panel
    // hâlâ "modal açık" durumunda.)
  }

  function ac(id){
    sinifId = id;
    const s = _soSinifNesnesi();
    sinifAdi = s ? s.ad : '';

    const eski = document.getElementById('sinifOturmaOverlay');
    if (eski) eski.remove();
    ov = document.createElement('div');
    ov.id = 'sinifOturmaOverlay';
    ov.innerHTML = _iskeletHtml();
    document.body.appendChild(ov);
    document.body.classList.add('modal-open');
    if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

    tuval = ov.querySelector('#soTuval');
    ov.querySelector('#soBaslik').textContent = _soBaslikMetni();

    AKTIF_BOYUT = {};
    Object.keys(VARSAYILAN_BOYUT).forEach(tur => { AKTIF_BOYUT[tur] = { w: VARSAYILAN_BOYUT[tur].w, h: VARSAYILAN_BOYUT[tur].h }; });
    sayac = 0; seciliOge = null; mevcutYon = 'dikey';
    sutunBoslugu = 12; satirBoslugu = 66; topluTasimaAcik = false;
    tabanZoom = 1; manuelZoom = 1;

    _olaylariBagla();
    sayfaYonunuUygula('dikey');
    Object.keys(AKTIF_BOYUT).forEach(boyutGosterGuncelle);

    SinifOturmaService.planGetir(sinifId).then(doc => {
      if (doc.exists) {
        planiYukle(doc.data());
      } else {
        otomatikYerlestir(true);
        otomatikDoldur();
        kaydedilmemisDegisiklik = false;
      }
    }).catch(err => {
      console.warn('sinifOturma planGetir:', err);
      otomatikYerlestir(true);
      otomatikDoldur();
    });
  }

  return { ac };
})();

window.SinifOturma = SinifOturma;
