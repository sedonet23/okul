/* =============================================================
   js/yillik-plan.js
   YILLIK PLAN MODÜLÜ
   ---------------------------------------------------------------
   MEB ünitelendirilmiş yıllık ders planlarının uygulama içi hâli.
   Her ders+seviye için bir "Plan Tanımı" vardır; her tanım, ortak
   bir "Ana Başlık" havuzundan (Tema, Kazanım, Etkinlik vb.) kendi
   kullandığı alt kümeyi seçer — dersler arasında sütun yapısı farklı
   olduğu için (bkz. Fen Bilimleri vs. Müzik vs. İngilizce şablonları)
   sabit sütunlu TEK bir tablo yerine bu esnek yapı kullanılıyor.

   Öğretmen, okuttuğu ders(ler) için hangi plan tanımını takip
   edeceğini SEÇER (bu seçim tamamen kişiseldir, kimseyi etkilemez).
   Haftalık kart görünümü bu ekranın ana kullanım şeklidir; referans
   tasarım (kullanıcının paylaştığı ekran görüntüsü) buna göre
   uygulanmıştır: turkuaz banner + tarih aralığı, ekranı-açık-tut
   kilidi, doldurulmuş başlıklar pill+metin olarak, boş olanlar hiç
   gösterilmez, alt gezinme "N / Toplam".
   ============================================================= */

let yillikPlanBasliklari = [];   // Ana Başlık havuzu — {id, ad, sira}
let yillikPlanTanimlari  = [];   // Plan tanımları  — {id, dersAdi, seviye, egitimOgretimYili, sutunlar:[baslikId,...], satirlar:[...]}
let _yplOgretmenSecimleri = null; // {ogretmenId, planIdler:[...]} — giriş yapan öğretmenin kendi seçimi
let _yplAcikPlanId = null;       // haftalık kart ekranında şu an açık olan plan
let _yplAcikHaftaIndex = 0;
let _yplWakeLock = null;         // Screen Wake Lock API tutamacı

/* ---------- Firestore bağlantısı (app.js baglantilariKur içinden, koşulsuz) ----------
   NOT: sosyalKulupler ile aynı gerekçe — plan tanımları ve başlık havuzu
   sadece "Yıllık Plan" sekmesine değil, Profilim üzerinden de erişilebilir
   olacağı için (ileride), tembel değil koşulsuz başlatılıyor. */
function yillikPlanBaglantilariniKur(){
  YillikPlanService.basliklariDinle(v => {
    yillikPlanBasliklari = v;
    if (typeof renderYillikPlanAnaSayfa === 'function') renderYillikPlanAnaSayfa();
  });
  YillikPlanService.tanimlariDinle(v => {
    yillikPlanTanimlari = v;
    if (typeof renderYillikPlanAnaSayfa === 'function') renderYillikPlanAnaSayfa();
  });
}

/* ================================================================
   TARİH YARDIMCILARI
   "hafta" alanı MEB dosyalarında "1.HAFTA(08-14)" biçiminde serbest
   metin olarak geliyor; buradan hafta no + gün aralığını çıkarıp,
   tanımın "egitimOgretimYili" alanına (örn. "2026-2027") göre GERÇEK
   takvim tarihine çeviriyoruz. Yıl alanı sonradan değişirse tarihler
   otomatik yeniden hesaplanır (hiçbir yerde sabit ISO tarih saklanmaz).
   ================================================================ */
const YPL_AY_NO = {
  'EYLÜL':9,'EKİM':10,'KASIM':11,'ARALIK':12,'OCAK':1,'ŞUBAT':2,
  'MART':3,'NİSAN':4,'MAYIS':5,'HAZİRAN':6,'TEMMUZ':7,'AĞUSTOS':8,
};
function _yplHaftaAyristir(hafta){
  const m = /\((\d{1,2})-(\d{1,2})\)/.exec(hafta || '');
  if (!m) return null;
  return { gunBaslangic: parseInt(m[1],10), gunBitis: parseInt(m[2],10) };
}
/* egitimOgretimYili "2026-2027" gibi bir metin — Eylül-Aralık ilk yıla,
   Ocak-Ağustos ikinci yıla denk gelir. */
function _yplSatirTarihAraligi(satir, egitimOgretimYili){
  const ayNo = YPL_AY_NO[(satir.ay||'').toLocaleUpperCase('tr')];
  const gunler = _yplHaftaAyristir(satir.hafta);
  if (!ayNo || !gunler) return null;
  const yillar = (egitimOgretimYili||'').split('-').map(y=>parseInt(y,10));
  if (yillar.length!==2 || !yillar[0]) return null;
  const yil1 = ayNo>=9 ? yillar[0] : yillar[1];
  let ayBitisNo = ayNo, yilBitis = yil1;
  if (gunler.gunBitis < gunler.gunBaslangic){ // ay sınırını aşan hafta (örn. 29 Eylül - 05 Ekim)
    ayBitisNo = ayNo===12 ? 1 : ayNo+1;
    yilBitis = ayBitisNo===1 && ayNo===12 ? yil1+1 : yil1;
  }
  const bas = new Date(yil1, ayNo-1, gunler.gunBaslangic);
  const bit = new Date(yilBitis, ayBitisNo-1, gunler.gunBitis);
  return { baslangic: bas, bitis: bit };
}
function _yplTarihMetni(satir, egitimOgretimYili){
  const ar = _yplSatirTarihAraligi(satir, egitimOgretimYili);
  if (!ar) return satir.hafta || '';
  const g = d => d.getDate();
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  const ayAdi = d => aylar[d.getMonth()];
  if (ar.baslangic.getMonth() === ar.bitis.getMonth()){
    return `${g(ar.baslangic)} – ${g(ar.bitis)} ${ayAdi(ar.bitis)}`;
  }
  return `${g(ar.baslangic)} ${ayAdi(ar.baslangic)} – ${g(ar.bitis)} ${ayAdi(ar.bitis)}`;
}
/* Bugünün tarihine en yakın / içine düşen hafta index'ini bulur —
   "şu an neredeyiz" gösterimi ve varsayılan açılış haftası için. */
function _yplBugunHaftaIndex(tanim){
  if (!tanim || !tanim.satirlar || !tanim.satirlar.length) return 0;
  const bugun = new Date(); bugun.setHours(0,0,0,0);
  for (let i=0;i<tanim.satirlar.length;i++){
    const ar = _yplSatirTarihAraligi(tanim.satirlar[i], tanim.egitimOgretimYili);
    if (!ar) continue;
    if (bugun >= ar.baslangic && bugun <= ar.bitis) return i;
  }
  // Bugün aralık dışındaysa (tatil/yaz), en yakın gelecekteki haftayı bul
  for (let i=0;i<tanim.satirlar.length;i++){
    const ar = _yplSatirTarihAraligi(tanim.satirlar[i], tanim.egitimOgretimYili);
    if (ar && ar.baslangic >= bugun) return i;
  }
  return 0;
}

function _yplBaslikAdi(id){ const b = yillikPlanBasliklari.find(x=>x.id===id); return b ? b.ad : id; }
function _yplTanim(id){ return yillikPlanTanimlari.find(t=>t.id===id); }

/* ================================================================
   ORTAK TABLO HTML — hem "Tüm Planı Görüntüle" ekran önizlemesinde
   hem de yazdırma çıktısında AYNI fonksiyon kullanılır (tekrar yok).
   ================================================================ */
/* Sütun genişlikleri — admin özelleştirmediyse makul varsayılanlar
   kullanılır (Ay/Hafta/Saat dar, içerik sütunları eşit paylaşır). */
const YPL_SISTEM_SUTUNLARI = [ ['_ay','Ay'], ['_hafta','Hafta'], ['_saat','Saat'] ];
/* A4 yatay gerçek genişlik (px, ~96dpi) — sinif-oturma.js'teki A4_PX.yatay.w
   ile aynı referans. Hem önizleme tuvali hem sayfa-sonu hesaplaması bunu kullanır. */
const YPL_A4_YATAY_PX = 1123;
function _yplSutunGenislikleri(tanim){
  const kayitli = tanim.sutunGenislikleri || {};
  const sutunlar = tanim.sutunlar || [];
  const sonuc = {};
  const varsayilanSistem = { _ay:4, _hafta:5, _saat:3.5 };
  YPL_SISTEM_SUTUNLARI.forEach(([k]) => { sonuc[k] = kayitli[k] || varsayilanSistem[k]; });
  const kalan = Math.max(0, 100 - sonuc._ay - sonuc._hafta - sonuc._saat);
  const esitPay = sutunlar.length ? +(kalan / sutunlar.length).toFixed(1) : 0;
  sutunlar.forEach(sid => { sonuc[sid] = kayitli[sid] || esitPay; });
  return sonuc;
}
/* Yazdırma ve ekran önizlemesinde ortak tam-kenarlıklı tablo görünümü —
   raporlama.js'in genel table/th/td kuralları sadece alt-çizgi verdiği
   için (diğer raporları etkilememesi adına) burada .ypl-tablo ile
   SINIRLANDIRILMIŞ ayrı bir stil bloğu ekleniyor.
   ÖNEMLİ: table-layout:fixed olmadan tarayıcı sütun genişliğini içeriğe
   göre kendi hesaplıyor ve <colgroup>'taki genişlikler yok sayılıyor —
   bu yüzden hem burada hem de sürükleyerek yeniden boyutlandırmada
   MUTLAKA <colgroup><col style="width:%"> kullanılıyor (satır içi th
   genişliği DEĞİL), tablo da width:100% ile sabit tutuluyor. */
const YPL_TABLO_STIL = `<style>
  .ypl-tablo{ border-collapse:collapse; width:100%; table-layout:fixed; }
  .ypl-tablo th, .ypl-tablo td{
    border:1px solid #999 !important; padding:5px 6px;
    overflow:hidden; white-space:pre-line; word-break:break-word; overflow-wrap:break-word;
    vertical-align:top;
  }
  .ypl-tablo thead th{ background:#0A6E6E; color:#fff; vertical-align:middle; }
  .ypl-tablo .ypl-dikey{
    writing-mode:vertical-rl; text-orientation:mixed; transform:rotate(180deg);
    white-space:nowrap; text-align:center;
  }
  .ypl-tablo th.ypl-dikey{ padding:8px 4px; }
  .ypl-tablo td.ypl-dikey{ padding:6px 3px; }
  .ypl-sayfa-sonu{
    position:absolute; left:0; right:0; height:0; border-top:2px dashed #c0392b;
    pointer-events:none;
  }
  .ypl-sayfa-sonu span{
    position:absolute; right:4px; top:-9px; background:#c0392b; color:#fff;
    font-size:9px; font-weight:700; padding:1px 6px; border-radius:3px; font-family:sans-serif;
  }
  .ypl-resize-tutamac{
    position:absolute; top:0; bottom:0; width:10px; margin-left:-5px;
    cursor:col-resize; z-index:5; touch-action:none;
  }
  .ypl-resize-tutamac:hover, .ypl-resize-tutamac.ypl-surukleniyor{ background:rgba(10,110,110,0.25); }
</style>`;
const YPL_VARSAYILAN_FONT_PX = 9.5;
function _yplFontBoyutu(tanim){ return tanim.fontBoyutuPx || YPL_VARSAYILAN_FONT_PX; }

/* interaktif=true → ekran önizlemesi: sütun sınırlarına sürükle-bırak
   tutamaçları eklenir (bkz. _yplSurüklemeyiBagla). interaktif=false →
   yazdırma çıktısı: aynı colgroup genişlikleri, tutamaç yok. */
function _yplTabloHtml(tanim, interaktif, genislikOverride, fontOverride){
  const sutunlar = tanim.sutunlar || [];
  const genislik = genislikOverride || _yplSutunGenislikleri(tanim);
  const fontPx = fontOverride || _yplFontBoyutu(tanim);
  const tumAnahtarlar = YPL_SISTEM_SUTUNLARI.map(([k])=>k).concat(sutunlar);

  let html = YPL_TABLO_STIL;
  html += `<table class="ypl-tablo" id="${interaktif?'yplTabloInteraktif':''}" style="font-size:${fontPx}px;"><colgroup>`;
  tumAnahtarlar.forEach(k => { html += `<col data-col-key="${k}" style="width:${genislik[k]}%;">`; });
  html += `</colgroup><thead><tr>`;
  YPL_SISTEM_SUTUNLARI.forEach(([k, ad]) => { html += `<th class="ypl-dikey" data-col-key="${k}">${escapeHtml(ad)}</th>`; });
  sutunlar.forEach(sid => { html += `<th data-col-key="${sid}">${escapeHtml(_yplBaslikAdi(sid))}</th>`; });
  html += `</tr></thead><tbody>`;
  (tanim.satirlar||[]).forEach(satir => {
    html += `<tr><td class="ypl-dikey">${escapeHtml(satir.ay||'')}</td><td class="ypl-dikey">${escapeHtml(_yplTarihMetni(satir, tanim.egitimOgretimYili))}</td><td class="ypl-dikey">${escapeHtml(satir.saat||'')}</td>`;
    sutunlar.forEach(sid => {
      html += `<td style="text-align:left;">${escapeHtml((satir.degerler||{})[sid]||'')}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  if (interaktif) {
    // Tutamaçlar tablonun DIŞINA, #yplTuval (position:relative) içine
    // mutlak konumlu ekleniyor — böylece sürüklerken hücre içeriğini bozmaz.
    html += `<div id="yplTutamacKatmani" style="position:absolute;top:0;left:0;right:0;height:0;"></div>`;
    html += `<div id="yplSayfaSonuKatmani" style="position:absolute;top:0;left:0;right:0;height:0;"></div>`;
  }
  return html;
}

/* Sürükle-bırak ile sütun genişliği ayarlama — sadece "Tüm Planı Görüntüle"
   önizlemesinde. Her tutamaç bir sütunun SAĞ kenarına karşılık gelir;
   sürüklendiğinde SADECE o sütunun yüzdesi değişir (komşu sütunlardan
   çalmaz — "tablo çizgisi" değil gerçek genişlik değişikliği), bırakınca
   Firestore'a kaydedilir ve hem colgroup hem tablo aynı anda güncellenir. */
/* ================================================================
   SAYFA SONU ÇİZGİLERİ — yazdırmada (raporlama.js: @page margin:5mm 7mm,
   A4 yatay) her sayfaya kaç satır sığacağını TAHMİN edip önizlemede kesik
   kırmızı çizgiyle gösterir. Tablonun <thead>'i her sayfada TEKRARLANDIĞI
   (tarayıcıların varsayılan tablo-yazdırma davranışı) ve 1. sayfada rapor
   başlığı (logo+ünvan) da yer kapladığı için bunlar hesaba katılıyor.
   NOT: Bu bir TAHMİNDİR — tarayıcının gerçek sayfalama algoritmasıyla
   birebir aynı olmayabilir, ama sayfa sonuna ne kadar kaldığını görmek
   için yeterince yakın bir referans verir. */
const YPL_PX_MM = YPL_A4_YATAY_PX / 297;               // 1123px = 297mm
const YPL_A4_YATAY_YUKSEKLIK_PX = Math.round(210 * YPL_PX_MM); // A4 yatay tam yükseklik
const YPL_SAYFA_KENAR_PX = 5 * YPL_PX_MM;               // @page margin: 5mm (üst+alt)
const YPL_ILK_SAYFA_BASLIK_PAYI_PX = 70;                 // rapor logosu+başlığı için yaklaşık pay

function _yplSayfaSonlariniCiz(){
  const tuval = document.getElementById('yplTuval');
  const tablo = document.getElementById('yplTabloInteraktif');
  const katman = document.getElementById('yplSayfaSonuKatmani');
  if (!tuval || !tablo || !katman) return;
  katman.innerHTML = '';

  // GÜVENİLİR ÖLÇÜM: style.zoom uygulanmışken offsetHeight'ın tam ne zaman
  // hangi ölçekte geldiği tarayıcıya göre değişebiliyor (bir önceki sürümde
  // buradaki "zoom'a böl" varsayımı YANLIŞ çıktı ve her satırı sayfa sonu
  // sanıyordu). Bunun yerine zoom'u GEÇİCİ olarak 1'e çekip, layout'u
  // zorlayıp, GERÇEK (zoom=1) yükseklikleri ölçüp eski zoom'u geri koyuyoruz
  // — belirsizlik kalmıyor.
  const oncekiZoom = tuval.style.zoom;
  tuval.style.zoom = 1;
  // eslint-disable-next-line no-unused-expressions
  tuval.offsetHeight; // reflow'u zorla

  const thead = tablo.querySelector('thead');
  const theadYukseklik = thead ? thead.offsetHeight : 0;
  const usableTam = YPL_A4_YATAY_YUKSEKLIK_PX - (YPL_SAYFA_KENAR_PX * 2);

  const satirlar = Array.from(tablo.querySelectorAll('tbody tr'));
  let sayfaNo = 1;
  let kalanYukseklik = usableTam - YPL_ILK_SAYFA_BASLIK_PAYI_PX - theadYukseklik;
  let birikenY = theadYukseklik;
  const kesimler = []; // {top, sayfaNo} — DOM'a zoom geri konduktan SONRA ekleniyor

  satirlar.forEach(tr => {
    const h = tr.offsetHeight;
    if (h > kalanYukseklik) {
      sayfaNo++;
      kesimler.push({ top: birikenY, sayfaNo });
      kalanYukseklik = usableTam - theadYukseklik;
    }
    kalanYukseklik -= h;
    birikenY += h;
  });
  const tabloTamYukseklik = tablo.offsetHeight;

  tuval.style.zoom = oncekiZoom; // gerçek zoom'u geri yükle

  kesimler.forEach(k => {
    const cizgi = document.createElement('div');
    cizgi.className = 'ypl-sayfa-sonu';
    cizgi.style.top = k.top + 'px';
    cizgi.innerHTML = `<span>Sayfa ${k.sayfaNo} →</span>`;
    katman.appendChild(cizgi);
  });
  katman.style.height = tabloTamYukseklik + 'px';
}

/* Sürükle-bırak ile sütun genişliği ayarlama — sadece "Tüm Planı Görüntüle"
   önizlemesinde. Her tutamaç bir sütunun SAĞ kenarına karşılık gelir;
   sürüklendiğinde SADECE o sütunun yüzdesi değişir (komşu sütunlardan
   çalmaz — "tablo çizgisi" değil gerçek genişlik değişikliği), bırakınca
   Firestore'a kaydedilir ve hem colgroup hem tablo aynı anda güncellenir. */
function _yplSurüklemeyiBagla(planId){
  const sarici = document.getElementById('yplTuval');
  const tablo = document.getElementById('yplTabloInteraktif');
  const katman = document.getElementById('yplTutamacKatmani');
  if (!sarici || !tablo || !katman) return;

  const cols = Array.from(tablo.querySelectorAll('colgroup col'));
  const basliklar = Array.from(tablo.querySelectorAll('thead th'));

  function tutamaclariYerlestir(){
    katman.innerHTML = '';
    let soldanPx = 0;
    const saricGenislik = sarici.clientWidth;
    basliklar.forEach((th, i) => {
      soldanPx += th.offsetWidth;
      if (i === basliklar.length - 1) return; // son sütunun sağında tutamaç yok
      const tut = document.createElement('div');
      tut.className = 'ypl-resize-tutamac';
      tut.style.left = soldanPx + 'px';
      tut.style.height = tablo.offsetHeight + 'px';
      tut.dataset.colIndex = i;
      katman.appendChild(tut);
    });
    katman.style.height = tablo.offsetHeight + 'px';
    katman.style.position = 'absolute';
  }
  tutamaclariYerlestir();
  _yplTutamaclariYerlestir = tutamaclariYerlestir;
  let surukleme = null;
  katman.addEventListener('pointerdown', (e) => {
    const tut = e.target.closest('.ypl-resize-tutamac');
    if (!tut) return;
    e.preventDefault();
    const i = parseInt(tut.dataset.colIndex, 10);
    surukleme = {
      index: i, baslangicX: e.clientX, saricGenislik: sarici.clientWidth,
      solBaslangic: parseFloat(cols[i].style.width),
      sagBaslangic: parseFloat(cols[i+1].style.width),
    };
    tut.classList.add('ypl-surukleniyor');
    tut.setPointerCapture(e.pointerId);
  });
  katman.addEventListener('pointermove', (e) => {
    if (!surukleme) return;
    const deltaPx = e.clientX - surukleme.baslangicX;
    const deltaYuzde = (deltaPx / surukleme.saricGenislik) * 100;
    // Soldaki sütun büyürken sağdaki AYNI miktarda küçülür (toplam sabit
    // kalır) — bu sayede en sağdaki sütun da komşusu üzerinden ayarlanabilir.
    const sinir = Math.min(surukleme.solBaslangic, surukleme.sagBaslangic) - 3;
    const sinirliDelta = Math.max(-sinir, Math.min(sinir, deltaYuzde));
    cols[surukleme.index].style.width = +(surukleme.solBaslangic + sinirliDelta).toFixed(1) + '%';
    cols[surukleme.index+1].style.width = +(surukleme.sagBaslangic - sinirliDelta).toFixed(1) + '%';
    tutamaclariYerlestir();
  });
  function surüklemeBitir(e){
    if (!surukleme) return;
    document.querySelectorAll('.ypl-surukleniyor').forEach(el=>el.classList.remove('ypl-surukleniyor'));
    const yeniGenislik = {};
    cols.forEach(c => { yeniGenislik[c.dataset.colKey] = parseFloat(c.style.width); });
    surukleme = null;
    const t = _yplTanim(planId);
    if (t) {
      YillikPlanService.goruntuAyarlariniKaydet(t.id, { sutunGenislikleri: yeniGenislik })
        .catch(err => { if (err.message!=='yetkisiz') toast('Genişlik kaydedilemedi: '+err.message); });
    }
    requestAnimationFrame(_yplSayfaSonlariniCiz); // sütun daralıp/genişleyince metin sarması satır yüksekliğini değiştirir
  }
  katman.addEventListener('pointerup', surüklemeBitir);
  katman.addEventListener('pointercancel', surüklemeBitir);
  window.addEventListener('resize', tutamaclariYerlestir);
}



/* İmza/başlık bloğu — kulüp raporundaki iki-uçlu yerleşimle birebir aynı
   desen: öğretmen solda, müdür sağda. */
function _yplImzaBlogu(tanim){
  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  const benAdi = ben ? `${ben.ad||''} ${ben.soyad||''}`.trim() : '';
  const benBrans = ben ? (ben.brans||'') : '';
  const mudurId = (typeof okulBilgileriAyari!=='undefined' && okulBilgileriAyari) ? okulBilgileriAyari.mudurId : null;
  const mudur = mudurId ? (typeof ogretmenler!=='undefined' ? ogretmenler.find(o=>o.id===mudurId) : null) : null;
  const mudurAdi = mudur ? `${mudur.ad||''} ${mudur.soyad||''}`.trim() : '';
  const mudurUnvan = (mudur && mudur.unvan) ? mudur.unvan : 'Okul Müdürü';
  if (!benAdi && !mudurAdi) return '';
  const tarihKaynagi = (tanim && tanim.imzaTarihi) ? new Date(tanim.imzaTarihi + 'T00:00:00') : new Date();
  const tarihMetni = tarihKaynagi.toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' });
  // Müdür tarafı iki satır daha (tarih + "Uygundur") uzun olduğu için,
  // öğretmen tarafına aynı yükseklikte GÖRÜNMEZ bir doldurucu ekleniyor —
  // böylece iki ad-soyad satırı da aynı hizada kalıyor (bkz. referans görsel).
  // "Uygundur" ile ad-soyad arasına GERÇEK imza için bolca boşluk bırakılıyor.
  return `<div style="display:flex;justify-content:space-between;gap:40px;flex-wrap:wrap;margin-top:36px;">
    <div style="text-align:center;">
      <div style="visibility:hidden;font-size:10px;">${escapeHtml(tarihMetni)}</div>
      <div style="visibility:hidden;font-weight:700;font-size:11px;">Uygundur</div>
      <div style="height:60px;"></div>
      <div style="font-weight:700;font-size:12px;color:#1a1a1a;margin-top:2px;">${escapeHtml(benAdi||'—')}</div>
      <div style="font-size:10px;color:#666;margin-top:2px;">${escapeHtml(benBrans||'Öğretmen')}</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:10px;color:#1a1a1a;">${escapeHtml(tarihMetni)}</div>
      <div style="font-weight:700;font-size:11px;color:#1a1a1a;margin-top:4px;">Uygundur</div>
      <div style="height:60px;"></div>
      <div style="font-weight:700;font-size:12px;color:#1a1a1a;margin-top:2px;">${escapeHtml(mudurAdi||'—')}</div>
      <div style="font-size:10px;color:#666;margin-top:2px;">${escapeHtml(mudurUnvan)}</div>
    </div>
  </div>`;
}

/* Rapor başlığı: Eğitim-Öğretim Yılı, Okul Adı, Ders Adı, Sınıf Adı —
   istenen 4 alan da burada, _raporPenceresiniAc'ın ustBaslik + ortaliBaslik
   seçenekleriyle birlikte kullanılıyor (raporlama.js'teki kulüp raporuyla
   aynı, halihazırda Android/Türkçe/z-index sorunları çözülmüş boru hattı). */
function yillikPlaniYazdir(planId, genislikOverride, fontOverride){
  const tanim = _yplTanim(planId);
  if (!tanim || typeof _raporPenceresiniAc !== 'function') return;
  const okulAdi = (typeof okulBilgileriAyari!=='undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) || 'Okul Yönetim Paneli';
  const seviyeMetni = `${tanim.seviye}. Sınıf`;
  const baslik = `${tanim.egitimOgretimYili||''} EĞİTİM ÖĞRETİM YILI — ${(tanim.dersAdi||'').toLocaleUpperCase('tr')} DERSİ — ${seviyeMetni} — ÜNİTELENDİRİLMİŞ YILLIK PLAN`.toLocaleUpperCase('tr');
  const html = _yplTabloHtml(tanim, false, genislikOverride, fontOverride) + _yplImzaBlogu(tanim);
  _raporPenceresiniAc(html, baslik, { ortaliBaslik:true, ustBaslik: okulAdi, yon: 'yatay' });
}
/* Önizlemedeki 🖨 butonu BUNU çağırır — Firestore'a yazılan sütun
   genişliğinin dinleyici üzerinden geri yansıması birkaç yüz ms sürebilir;
   kullanıcı sürükleyip HEMEN yazdırırsa eski (stale) genişlik kullanılmasın
   diye ekranda O AN GÖRÜNEN colgroup değerleri doğrudan okunup basılıyor. */
function yillikPlaniOnizlemedenYazdir(planId){
  const tablo = document.getElementById('yplTabloInteraktif');
  if (!tablo) { yillikPlaniYazdir(planId); return; }
  const genislik = {};
  tablo.querySelectorAll('colgroup col').forEach(c => { genislik[c.dataset.colKey] = parseFloat(c.style.width); });
  yillikPlaniYazdir(planId, genislik, _yplMevcutFontPx);
}

/* "Tüm Planı Görüntüle" — ekranda kaydırılabilir tam tablo önizlemesi,
   yazdırmayla aynı içerik üretici fonksiyonu kullanır. */
/* A4 yatay gerçek genişlik (px, ~96dpi) — sinif-oturma.js'teki A4_PX.yatay.w
   ile aynı referans. Önizleme tuvali HER ZAMAN bu genişlikte kalır; ekrana
   sığdırmak için içerik küçültülmez, style.zoom ile GÖRSEL olarak ölçeklenir
   — böylece sütun genişlikleri/dikey başlıklar telefon ekranında da yazdırma
   çıktısıyla BİREBİR aynı görünür (reflow yok). */
let _yplTabanZoom = 1, _yplManuelZoom = 1;
let _yplMevcutFontPx = YPL_VARSAYILAN_FONT_PX;

function yillikPlanTumunuGoster(planId){
  const tanim = _yplTanim(planId);
  if (!tanim) return;

  const ov = document.createElement('div');
  ov.id = 'yplOnizlemeOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9400;background:var(--bg-app);display:flex;flex-direction:column;';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:10px 14px;background:var(--bg-sidebar);color:#fff;">
      <button class="btn btn-ghost btn-sm" onclick="yillikPlanOnizlemeKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Kapat</button>
      <div style="font-weight:700;font-size:12.5px;text-align:center;flex:1;min-width:140px;">${escapeHtml(tanim.dersAdi)} — A4 Yatay Önizleme</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" id="yplFontAzalt" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="Yazıyı küçült (sayfa boşluğunu azaltır)">Aa➖</button>
        <button class="btn btn-ghost btn-sm" id="yplFontArtir" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="Yazıyı büyüt">Aa➕</button>
        <button class="btn btn-ghost btn-sm" id="yplZoomAzalt" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="Uzaklaştır">➖</button>
        <button class="btn btn-ghost btn-sm" id="yplZoomSigdir" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="Ekrana sığdır">🔍 Sığdır</button>
        <button class="btn btn-ghost btn-sm" id="yplZoomArtir" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="Yakınlaştır">➕</button>
        <button class="btn btn-ghost btn-sm" id="yplKaydetBtn" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">💾 Kaydet</button>
        <button class="btn btn-ghost btn-sm" onclick="yillikPlaniOnizlemedenYazdir('${planId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">🖨 Yazdır</button>
      </div>
    </div>
    <div style="font-size:11px;color:var(--ink-muted);display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;padding:4px 10px;background:var(--bg-app);border-bottom:1px solid var(--border);">
      <span>Sütun sınırlarını sürükleyin, yazı boyutunu ayarlayın — "💾 Kaydet" ile emin olun.</span>
      <label style="display:flex;align-items:center;gap:4px;">İmza Tarihi:
        <input type="date" id="yplImzaTarihiInput" value="${tanim.imzaTarihi || new Date().toISOString().slice(0,10)}" style="font-size:11px;padding:2px 4px;">
      </label>
    </div>
    <div id="yplTuvalKaydirma" style="flex:1;overflow:auto;background:#dcdfe1;padding:20px;">
      <div id="yplTuval" style="width:${YPL_A4_YATAY_PX}px;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.25);margin:0 auto;position:relative;padding-bottom:16px;">
        ${_yplTabloHtml(tanim, true)}
        <div style="padding:0 12px;" id="yplImzaBlogu">${_yplImzaBlogu(tanim)}</div>
      </div>
    </div>
  `;
  _yplMevcutFontPx = _yplFontBoyutu(tanim);
  requestAnimationFrame(() => {
    _yplZoomBagla();
    _yplSurüklemeyiBagla(planId);
    _yplSayfaSonlariniCiz();
    _yplFontKontrolleriBagla(planId);
    document.getElementById('yplKaydetBtn')?.addEventListener('click', () => _yplTumunuKaydet(planId, true));
    document.getElementById('yplImzaTarihiInput')?.addEventListener('change', (e) => {
      const guncel = _yplTanim(planId);
      const imzaAlani = document.getElementById('yplImzaBlogu');
      if (guncel && imzaAlani) imzaAlani.innerHTML = _yplImzaBlogu({ ...guncel, imzaTarihi: e.target.value });
      const t = _yplTanim(planId);
      if (t) {
        YillikPlanService.goruntuAyarlariniKaydet(t.id, { imzaTarihi: e.target.value || null })
          .then(()=>toast('İmza tarihi kaydedildi.'))
          .catch(err => { if (err.message!=='yetkisiz') toast('Hata: '+err.message); });
      }
    });
  });
}
function yillikPlanOnizlemeKapat(){
  const ov = document.getElementById('yplOnizlemeOverlay');
  if (ov) ov.remove();
  _yplTutamaclariYerlestir = null;
  document.body.classList.remove('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
}
let _yplTutamaclariYerlestir = null; // _yplSurüklemeyiBagla tarafından doldurulur — zoom değişince yeniden çağrılır
function _yplZoomUygula(){
  const tuval = document.getElementById('yplTuval');
  if (tuval) tuval.style.zoom = _yplTabanZoom * _yplManuelZoom;
  if (_yplTutamaclariYerlestir) requestAnimationFrame(_yplTutamaclariYerlestir);
  requestAnimationFrame(_yplSayfaSonlariniCiz);
}
function _yplEkraniSigdir(){
  const kaydirma = document.getElementById('yplTuvalKaydirma');
  if (!kaydirma) return;
  const mevcutGenislik = kaydirma.clientWidth - 40;
  _yplTabanZoom = Math.min(1, mevcutGenislik / YPL_A4_YATAY_PX);
  _yplManuelZoom = 1;
  _yplZoomUygula();
}
function _yplZoomBagla(){
  document.getElementById('yplZoomArtir')?.addEventListener('click', () => { _yplManuelZoom = Math.min(3, +(_yplManuelZoom+0.2).toFixed(2)); _yplZoomUygula(); });
  document.getElementById('yplZoomAzalt')?.addEventListener('click', () => { _yplManuelZoom = Math.max(0.3, +(_yplManuelZoom-0.2).toFixed(2)); _yplZoomUygula(); });
  document.getElementById('yplZoomSigdir')?.addEventListener('click', _yplEkraniSigdir);
  _yplEkraniSigdir();
}

/* Yazı boyutu — sayfa boşluğunu azaltmanın en etkili yolu genellikle budur
   (satır sayısı aynı kalır ama her satır daha az yer kaplar). Değiştikçe
   satır yükseklikleri değişir, bu yüzden sayfa sonu çizgileri de yeniden
   hesaplanıyor. */
function _yplFontKontrolleriBagla(planId){
  const uygula = (yeniPx) => {
    _yplMevcutFontPx = Math.max(6, Math.min(14, +yeniPx.toFixed(1)));
    const tablo = document.getElementById('yplTabloInteraktif');
    if (tablo) tablo.style.fontSize = _yplMevcutFontPx + 'px';
    if (_yplTutamaclariYerlestir) requestAnimationFrame(_yplTutamaclariYerlestir);
    requestAnimationFrame(_yplSayfaSonlariniCiz);
  };
  document.getElementById('yplFontArtir')?.addEventListener('click', () => uygula(_yplMevcutFontPx + 0.5));
  document.getElementById('yplFontAzalt')?.addEventListener('click', () => uygula(_yplMevcutFontPx - 0.5));
}

/* Açık "Kaydet" butonu — sürükleyerek/font değiştirerek yapılan ayarlar
   zaten anında Firestore'a yazılıyor (bkz. sürükleme bitince ve font
   tuşuna her basışta OTOMATİK kaydetme yok, sadece DOM güncelleniyor —
   bu fonksiyon o an ekrandaki TÜM ayarları TEK seferde, kullanıcının
   "kaydedildi" diye net bir onay görmesi için kaydeder). */
function _yplTumunuKaydet(planId, bildirimGoster){
  const t = _yplTanim(planId);
  const tablo = document.getElementById('yplTabloInteraktif');
  if (!t || !tablo) return;
  const genislik = {};
  tablo.querySelectorAll('colgroup col').forEach(c => { genislik[c.dataset.colKey] = parseFloat(c.style.width); });
  const tarihInput = document.getElementById('yplImzaTarihiInput');
  const veri = { sutunGenislikleri: genislik, fontBoyutuPx: _yplMevcutFontPx };
  if (tarihInput) veri.imzaTarihi = tarihInput.value || null;
  YillikPlanService.goruntuAyarlariniKaydet(t.id, veri)
    .then(() => { if (bildirimGoster) toast('Kaydedildi.'); })
    .catch(err => { if (err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ================================================================
   EKRANI AÇIK TUTMA (Wake Lock) — kilit ikonunun tek görevi bu;
   "salt okunur" ile HİÇBİR ilgisi yok. Tarayıcı desteklemiyorsa
   (Screen Wake Lock API), buton sessizce devre dışı kalır.
   ================================================================ */
async function _yplEkraniAcikTut(ac){
  try {
    if (ac){
      if ('wakeLock' in navigator){
        _yplWakeLock = await navigator.wakeLock.request('screen');
        _yplWakeLock.addEventListener('release', () => { _yplWakeLock = null; _yplKilitIkonuGuncelle(); });
      } else {
        toast('Bu cihaz/tarayıcı ekranı açık tutma özelliğini desteklemiyor.');
        return;
      }
    } else if (_yplWakeLock) {
      await _yplWakeLock.release();
      _yplWakeLock = null;
    }
  } catch (e) { console.warn('Wake lock hatası:', e); }
  _yplKilitIkonuGuncelle();
}
function _yplKilitIkonuGuncelle(){
  const btn = document.getElementById('yplKilitBtn');
  if (!btn) return;
  const acik = !!_yplWakeLock;
  btn.textContent = acik ? '🔒' : '🔓';
  btn.title = acik ? 'Ekran açık kalıyor — kapatmak için dokunun' : 'Ekranın kararmasını engellemek için dokunun';
}
function yplKilitTikla(){ _yplEkraniAcikTut(!_yplWakeLock); }

/* ================================================================
   HAFTALIK KART GÖRÜNÜMÜ
   ================================================================ */
function yillikPlanHaftaAc(planId, haftaIndex){
  const tanim = _yplTanim(planId);
  if (!tanim) { toast('Plan bulunamadı.'); return; }
  _yplAcikPlanId = planId;
  _yplAcikHaftaIndex = Math.max(0, Math.min(haftaIndex ?? _yplBugunHaftaIndex(tanim), (tanim.satirlar||[]).length - 1));

  const ov = document.createElement('div');
  ov.id = 'yplHaftaOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9400;background:var(--bg-app);overflow-y:auto;';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-sidebar);color:var(--ink-on-dark);position:sticky;top:0;z-index:2;">
      <button class="btn btn-ghost btn-sm" onclick="yillikPlanHaftaKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Kapat</button>
      <div style="text-align:center;flex:1;font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 8px;">${escapeHtml(tanim.dersAdi)} · ${tanim.seviye}. Sınıf</div>
      <div style="display:flex;gap:4px;">
        <button class="btn btn-ghost btn-sm" id="yplKilitBtn" onclick="yplKilitTikla()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-size:16px;" title="Ekranın kararmasını engellemek için dokunun">🔓</button>
        <button class="btn btn-ghost btn-sm" onclick="yplMenuAc('${planId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">⋮</button>
      </div>
    </div>
    <div id="yplHaftaGovde"></div>
  `;
  _yplHaftaGovdeCiz();
}
function yillikPlanHaftaKapat(){
  if (_yplWakeLock) _yplEkraniAcikTut(false);
  const ov = document.getElementById('yplHaftaOverlay');
  if (ov) ov.remove();
  document.body.classList.remove('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
}
function _yplHaftaGovdeCiz(){
  const tanim = _yplTanim(_yplAcikPlanId);
  const govde = document.getElementById('yplHaftaGovde');
  if (!tanim || !govde) return;
  const satirlar = tanim.satirlar || [];
  const satir = satirlar[_yplAcikHaftaIndex];
  if (!satir) { govde.innerHTML = '<p class="empty-state" style="padding:24px;">Bu planda hafta bulunmuyor.</p>'; return; }

  const pilller = (tanim.sutunlar||[]).map(sid => {
    const deger = (satir.degerler||{})[sid];
    if (!deger) return ''; // veri yoksa başlık HİÇ gösterilmez
    return `
      <div style="margin-bottom:18px;">
        <span style="display:inline-block;background:var(--brand);color:#fff;font-weight:700;font-size:13px;padding:8px 16px;border-radius:20px;margin-bottom:10px;">${escapeHtml(_yplBaslikAdi(sid))}</span>
        <div style="font-size:14.5px;color:var(--ink);white-space:pre-line;line-height:1.5;">${escapeHtml(deger)}</div>
      </div>`;
  }).join('');

  govde.innerHTML = `
    <div style="background:var(--brand);color:#fff;text-align:center;font-size:20px;font-weight:700;padding:16px;">
      ${escapeHtml(_yplTarihMetni(satir, tanim.egitimOgretimYili))}
    </div>
    <div style="background:var(--brand-light);padding:20px 18px 90px;min-height:calc(100vh - 130px);">
      ${pilller || '<p class="empty-state">Bu hafta için içerik girilmemiş.</p>'}
      <div id="yplNotAlani"></div>
    </div>
    <div style="position:sticky;bottom:0;background:var(--bg-app);border-top:1px solid var(--border);padding:10px 16px;display:flex;align-items:center;justify-content:space-between;">
      <button class="btn btn-ghost btn-sm" ${_yplAcikHaftaIndex===0?'disabled style="opacity:.3;"':''} onclick="yplHaftaDegistir(-1)">‹ Önceki</button>
      <span style="font-size:12.5px;color:var(--ink-muted);font-weight:600;">${_yplAcikHaftaIndex+1} / ${satirlar.length}</span>
      <button class="btn btn-ghost btn-sm" ${_yplAcikHaftaIndex===satirlar.length-1?'disabled style="opacity:.3;"':''} onclick="yplHaftaDegistir(1)">Sonraki ›</button>
    </div>
  `;
  _yplNotAlaniCiz();
}
function yplHaftaDegistir(delta){
  const tanim = _yplTanim(_yplAcikPlanId);
  if (!tanim) return;
  const yeni = _yplAcikHaftaIndex + delta;
  if (yeni < 0 || yeni >= (tanim.satirlar||[]).length) return;
  _yplAcikHaftaIndex = yeni;
  _yplHaftaGovdeCiz();
  const ov = document.getElementById('yplHaftaOverlay');
  if (ov) ov.scrollTop = 0;
}

/* ================================================================
   HAFTAYA ÖZEL NOT — genel Notlar modülünden bağımsız, sadece bu
   hafta+plan+öğretmen üçlüsüne ait TEK bir bilgi notu.
   ================================================================ */
let _yplNotVerisi = {}; // {planId: {haftaIndex: metin}} — açık planın notları önbelleği
function _yplNotAlaniCiz(){
  const alan = document.getElementById('yplNotAlani');
  if (!alan) return;
  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  if (!ben){ alan.innerHTML = ''; return; }
  const cached = (_yplNotVerisi[_yplAcikPlanId]||{})[_yplAcikHaftaIndex];
  if (cached !== undefined){
    _yplNotAlaniDoldur(cached);
  } else {
    alan.innerHTML = `<div style="text-align:center;padding:10px;"><span style="font-size:12px;color:var(--ink-muted);">Not yükleniyor…</span></div>`;
    YillikPlanService.notlariGetir(ben.id, _yplAcikPlanId).then(doc => {
      const notlar = (doc.exists && doc.data().notlar) || {};
      _yplNotVerisi[_yplAcikPlanId] = notlar;
      if (_yplAcikPlanId && document.getElementById('yplNotAlani')) _yplNotAlaniDoldur(notlar[_yplAcikHaftaIndex] || '');
    }).catch(()=>{ _yplNotAlaniDoldur(''); });
  }
}
function _yplNotAlaniDoldur(metin){
  const alan = document.getElementById('yplNotAlani');
  if (!alan) return;
  if (metin){
    alan.innerHTML = `
      <div style="background:#fff;border:1px solid rgba(0,0,0,0.12);border-radius:12px;padding:14px;margin-top:8px;">
        <div style="font-size:11px;font-weight:700;color:var(--brand);margin-bottom:6px;">📝 NOTUM</div>
        <div style="font-size:13.5px;white-space:pre-line;margin-bottom:10px;">${escapeHtml(metin)}</div>
        <button class="btn btn-ghost btn-sm" onclick="yplNotDuzenle()">Düzenle</button>
      </div>`;
  } else {
    alan.innerHTML = `<button class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="yplNotDuzenle()">📝 Not Ekle</button>`;
  }
}
function yplNotDuzenle(){
  const mevcut = (_yplNotVerisi[_yplAcikPlanId]||{})[_yplAcikHaftaIndex] || '';
  const body = `<div class="form-group"><label>Bu haftayla ilgili notunuz</label><textarea id="f_yplNot" rows="4" placeholder="örn. bu hafta materyal getirilecek, önceki konuyla bağlantı kurulacak...">${escapeHtml(mevcut)}</textarea></div>`;
  modalAc('📝 Hafta Notu', body, () => {
    const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
    if (!ben){ modalKapat(); return; }
    const metin = document.getElementById('f_yplNot').value.trim();
    _yplNotVerisi[_yplAcikPlanId] = _yplNotVerisi[_yplAcikPlanId] || {};
    _yplNotVerisi[_yplAcikPlanId][_yplAcikHaftaIndex] = metin;
    YillikPlanService.notKaydet(ben.id, _yplAcikPlanId, _yplAcikHaftaIndex, metin)
      .then(()=>toast('Not kaydedildi.'))
      .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
    _yplNotAlaniDoldur(metin);
  });
}

/* ================================================================
   ⋮ SEÇENEKLER MENÜSÜ — Tüm Planı Görüntüle / Haftaya Git / Yazdır
   ================================================================ */
function yplMenuAc(planId){
  const body = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <button class="btn btn-ghost" style="justify-content:flex-start;" onclick="modalKapat();yillikPlanTumunuGoster('${planId}')">📖 Tüm Planı Görüntüle</button>
      <button class="btn btn-ghost" style="justify-content:flex-start;" onclick="modalKapat();yillikPlanHaftayaGit('${planId}')">🗓 Haftaya Git</button>
      <button class="btn btn-ghost" style="justify-content:flex-start;" onclick="modalKapat();yillikPlaniYazdir('${planId}')">🖨 Planı Yazdır</button>
    </div>`;
  modalAc('Seçenekler', body, null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
}
function yillikPlanHaftayaGit(planId){
  const tanim = _yplTanim(planId);
  if (!tanim) return;
  const body = `
    <div style="display:flex;flex-direction:column;gap:2px;max-height:60vh;overflow-y:auto;">
      ${(tanim.satirlar||[]).map((s,i)=>`
        <button class="btn btn-ghost btn-sm" style="justify-content:space-between;text-align:left;" onclick="modalKapat();yillikPlanHaftaGit(${i})">
          <span>${escapeHtml(s.ay||'')} · ${escapeHtml(_yplTarihMetni(s, tanim.egitimOgretimYili))}</span>
          <span style="color:var(--ink-muted);">${i+1}</span>
        </button>`).join('')}
    </div>`;
  modalAc('🗓 Haftaya Git', body, null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
}
function yillikPlanHaftaGit(index){
  _yplAcikHaftaIndex = index;
  _yplHaftaGovdeCiz();
  const ov = document.getElementById('yplHaftaOverlay');
  if (ov) ov.scrollTop = 0;
}

/* ================================================================
   ANA EKRAN — "Takip Ettiğim Planlar" (herkes) + "Plan Tanımları
   Yönetimi" (sadece yillikPlan düzenleme yetkisi olan admin).
   ================================================================ */
function renderYillikPlanAnaSayfa(){
  const panel = document.getElementById('tab-yillikPlan');
  if (!panel) return;
  const yetkiVar = typeof duzenleyebilir==='function' && duzenleyebilir('yillikPlan');
  const yonBtn = document.getElementById('yplYonetimButonlari');
  const yonKart = document.getElementById('yplYonetimKarti');
  if (yonBtn) yonBtn.style.display = yetkiVar ? 'flex' : 'none';
  if (yonKart) yonKart.style.display = yetkiVar ? '' : 'none';

  _yplTakipListesiCiz();
  if (yetkiVar) _yplTanimListesiCiz();
}

function _yplTakipListesiCiz(){
  const el = document.getElementById('yplTakipListesi');
  if (!el) return;
  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  if (!ben){ el.innerHTML = '<p class="empty-state">Profilinize bağlı bir öğretmen kaydı bulunamadı.</p>'; return; }

  if (!_yplOgretmenSecimleri || _yplOgretmenSecimleri._ogretmenId !== ben.id){
    el.innerHTML = '<p class="empty-state">Yükleniyor…</p>';
    YillikPlanService.secimGetir(ben.id).then(doc => {
      _yplOgretmenSecimleri = { _ogretmenId: ben.id, planIdler: (doc.exists && doc.data().planIdler) || [] };
      _yplTakipListesiCiz();
    }).catch(()=>{ _yplOgretmenSecimleri = { _ogretmenId: ben.id, planIdler: [] }; _yplTakipListesiCiz(); });
    return;
  }

  const takipEdilenler = _yplOgretmenSecimleri.planIdler.map(id=>_yplTanim(id)).filter(Boolean);
  el.innerHTML = takipEdilenler.length ? takipEdilenler.map(t=>{
    const bugunIndex = _yplBugunHaftaIndex(t);
    const bugunSatir = (t.satirlar||[])[bugunIndex];
    const tema = bugunSatir ? ((bugunSatir.degerler||{})[t.sutunlar[0]] || '') : '';
    return `
      <div class="detay-row" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;" onclick="yillikPlanHaftaAc('${t.id}')">
        <div>
          <div style="font-weight:700;">${escapeHtml(t.dersAdi)} <span style="color:var(--ink-muted);font-weight:400;">· ${t.seviye}. Sınıf</span></div>
          ${tema ? `<div style="font-size:11.5px;color:var(--ink-muted);margin-top:2px;">Bu hafta: ${escapeHtml(tema.slice(0,60))}${tema.length>60?'…':''}</div>` : ''}
        </div>
        <span style="color:var(--ink-muted);">›</span>
      </div>`;
  }).join('') : '<p class="empty-state">Henüz bir plan seçmediniz. Aşağıdaki "Plan Ekle" ile başlayın.</p>';
}

function yillikPlanSecimModalAc(){
  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  if (!ben){ toast('Profilinize bağlı bir öğretmen kaydı bulunamadı.'); return; }
  const seviyeler = Array.from(new Set(yillikPlanTanimlari.map(t=>t.seviye))).sort((a,b)=>a-b);
  const body = `
    <p style="font-size:12px;color:var(--ink-muted);margin-bottom:10px;">Önce sınıfı seçin, sonra o sınıfa ait yıllık planlardan istediklerinizi sisteme ekleyin.</p>
    <div style="display:flex;flex-direction:column;gap:2px;max-height:55vh;overflow-y:auto;">
      ${seviyeler.map(s=>{
        const dersSayisi = yillikPlanTanimlari.filter(t=>t.seviye===s).length;
        return `
        <button class="btn btn-ghost btn-sm" style="justify-content:space-between;text-align:left;" onclick="modalKapat();_yplSecimPlanListesiAc(${s})">
          <span>${s}. Sınıf</span>
          <span style="color:var(--ink-muted);">${dersSayisi} ders ›</span>
        </button>`;
      }).join('') || '<p class="empty-state">Henüz hiç plan tanımı oluşturulmamış.</p>'}
    </div>`;
  modalAc('🎯 Sınıf Seçin', body, null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
}

function _yplSecimPlanListesiAc(seviye){
  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  if (!ben){ toast('Profilinize bağlı bir öğretmen kaydı bulunamadı.'); return; }
  const planlar = yillikPlanTanimlari.filter(t=>t.seviye===seviye).sort((a,b)=>(a.dersAdi||'').localeCompare(b.dersAdi||'','tr'));
  const secili = new Set((_yplOgretmenSecimleri && _yplOgretmenSecimleri.planIdler) || []);
  const body = `
    <div id="yplSecimPlanListesi" style="display:flex;flex-direction:column;gap:6px;max-height:55vh;overflow-y:auto;">
      ${planlar.map(t=>`
        <div class="detay-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <div>
            <div style="font-weight:700;">${escapeHtml(t.dersAdi)}</div>
            <div style="font-size:11.5px;color:var(--ink-muted);">${escapeHtml(t.egitimOgretimYili||'')} · ${(t.satirlar||[]).length} hafta</div>
          </div>
          <button class="btn btn-sm ypl-ekle-btn" data-plan-id="${t.id}" onclick="_yplSecimTikla('${t.id}', ${seviye})" style="${secili.has(t.id)?'background:var(--brand);color:#fff;':''}">${secili.has(t.id)?'✓ Eklendi':'➕ Sisteme Ekle'}</button>
        </div>`).join('') || '<p class="empty-state">Bu sınıf seviyesinde henüz plan yok.</p>'}
    </div>
    <button type="button" class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="modalKapat();yillikPlanSecimModalAc()">← Sınıf Seçimine Dön</button>
  `;
  modalAc(`🎯 ${seviye}. Sınıf — Yıllık Planlar`, body, null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
}

function _yplSecimTikla(planId, seviye){
  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  if (!ben) return;
  const mevcut = new Set((_yplOgretmenSecimleri && _yplOgretmenSecimleri.planIdler) || []);
  if (mevcut.has(planId)) mevcut.delete(planId); else mevcut.add(planId);
  const yeniSecim = Array.from(mevcut);
  YillikPlanService.secimKaydet(ben.id, yeniSecim).then(()=>{
    _yplOgretmenSecimleri = { _ogretmenId: ben.id, planIdler: yeniSecim };
    _yplTakipListesiCiz();
    _yplSecimPlanListesiAc(seviye); // düğme durumunu tazele
  }).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ================================================================
   ADMİN — Plan Tanımları Yönetimi
   ================================================================ */
function _yplTanimListesiCiz(){
  const el = document.getElementById('yplTanimListesi');
  if (!el) return;
  el.innerHTML = yillikPlanTanimlari.length ? yillikPlanTanimlari
    .sort((a,b)=> a.seviye-b.seviye || (a.dersAdi||'').localeCompare(b.dersAdi||'','tr'))
    .map(t=>`
      <div class="detay-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div>
          <div style="font-weight:700;">${escapeHtml(t.dersAdi)} <span class="badge badge-blue">${t.seviye}. Sınıf</span></div>
          <div style="font-size:11.5px;color:var(--ink-muted);margin-top:2px;">${escapeHtml(t.egitimOgretimYili||'')} · ${(t.satirlar||[]).length} hafta · ${(t.sutunlar||[]).length} başlık</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" onclick="yillikPlanTumunuGoster('${t.id}')">👁 Görüntüle</button>
          <button class="btn btn-ghost btn-sm" onclick="yillikPlanTanimModalAc('${t.id}')">Düzenle</button>
          <button class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="yillikPlanTanimSilOnay('${t.id}')">Sil</button>
        </div>
      </div>`).join('') : '<p class="empty-state">Henüz plan tanımı yok. "Yeni Plan Tanımı" veya "Örnek Planları İçe Aktar" ile başlayın.</p>';
}

function yillikPlanTanimModalAc(id){
  const t = id ? _yplTanim(id) : null;
  const secili = new Set(t ? t.sutunlar : []);
  const body = `
    <div class="form-row">
      <div class="form-group"><label>Ders Adı</label><input id="f_yplDers" value="${t?escapeHtml(t.dersAdi):''}" placeholder="örn: Fen Bilimleri"></div>
      <div class="form-group" style="flex:0 0 110px;"><label>Sınıf Seviyesi</label>
        <select id="f_yplSeviye">${[1,2,3,4,5,6,7,8].map(s=>`<option value="${s}" ${t&&t.seviye===s?'selected':''}>${s}. Sınıf</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Eğitim-Öğretim Yılı</label><input id="f_yplYil" value="${t?escapeHtml(t.egitimOgretimYili||''):'2026-2027'}" placeholder="örn: 2026-2027"></div>
      <div class="form-group" style="flex:0 0 160px;"><label>İmza Tarihi (yazdırmada)</label><input type="date" id="f_yplImzaTarihi" value="${t&&t.imzaTarihi?t.imzaTarihi:new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="form-group">
      <label>Bu Ders Hangi Ana Başlıkları Kullansın?</label>
      <div class="ogr-checkbox-liste">
        ${yillikPlanBasliklari.map(b=>`<label class="ogr-cb-row"><input type="checkbox" class="ypl-baslik-cb" value="${b.id}" ${secili.has(b.id)?'checked':''}><span>${escapeHtml(b.ad)}</span></label>`).join('') || '<p class="empty-state">Önce "Ana Başlıklar" ekranından başlık ekleyin.</p>'}
      </div>
      <p style="font-size:11px;color:var(--ink-muted);margin-top:4px;">Sadece işaretlediğiniz başlıklar bu derste gösterilir; veri girilmeyen hafta+başlık kombinasyonu otomatik atlanır.</p>
    </div>
    ${t ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button type="button" class="btn btn-ghost btn-sm" onclick="modalKapat();yillikPlanHaftaSatirlariniDuzenle('${t.id}')">📋 Hafta Satırlarını Düzenle (${(t.satirlar||[]).length})</button>
      <button type="button" class="btn btn-ghost btn-sm" onclick="modalKapat();yillikPlanSutunGenislikleriAc('${t.id}')">📐 Sütun Genişlikleri</button>
    </div>` : ''}
  `;
  modalAc(t?'Plan Tanımını Düzenle':'Yeni Plan Tanımı', body, () => {
    const dersAdi = document.getElementById('f_yplDers').value.trim();
    if (!dersAdi){ toast('Ders adı zorunludur.'); return; }
    const sutunlar = Array.from(document.querySelectorAll('.ypl-baslik-cb:checked')).map(cb=>cb.value);
    const veri = {
      dersAdi,
      seviye: parseInt(document.getElementById('f_yplSeviye').value, 10),
      egitimOgretimYili: document.getElementById('f_yplYil').value.trim(),
      imzaTarihi: document.getElementById('f_yplImzaTarihi').value || null,
      sutunlar,
    };
    if (t){
      YillikPlanService.tanimGuncelle(t.id, veri).then(()=>toast('Kaydedildi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    } else {
      veri.satirlar = [];
      YillikPlanService.tanimEkle(veri).then(()=>toast('Plan tanımı oluşturuldu — şimdi hafta satırlarını ekleyebilirsiniz.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    }
    modalKapat();
  }, t ? () => { if(confirm(`"${t.dersAdi} — ${t.seviye}. Sınıf" plan tanımını silmek istediğinize emin misiniz?`)){ YillikPlanService.tanimSil(t.id).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }); modalKapat(); } } : null);
}
function yillikPlanTanimSilOnay(id){
  const t = _yplTanim(id);
  if (!t) return;
  if (!confirm(`"${t.dersAdi} — ${t.seviye}. Sınıf" plan tanımını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
  YillikPlanService.tanimSil(id).then(()=>toast('Silindi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ================================================================
   ADMİN — Ana Başlık Havuzu Yönetimi
   ================================================================ */
function yillikPlanBaslikYonetimiAc(){
  const body = `
    <p style="font-size:12px;color:var(--ink-muted);margin-bottom:10px;">Bu liste tüm derslerin ortak kullandığı başlık havuzudur. Yeni bir ders farklı bir başlığa ihtiyaç duyarsa buradan ekleyin.</p>
    <div id="yplBaslikListesi" style="display:flex;flex-direction:column;gap:4px;max-height:45vh;overflow-y:auto;margin-bottom:10px;">
      ${yillikPlanBasliklari.map(b=>`
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-soft);">
          <span>${escapeHtml(b.ad)}</span>
          <button type="button" class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="_yplBaslikSil('${b.id}')">Sil</button>
        </div>`).join('') || '<p class="empty-state">Henüz başlık yok.</p>'}
    </div>
    <div class="form-row" style="align-items:flex-end;">
      <div class="form-group" style="flex:1;"><label>Yeni Başlık Adı</label><input id="f_yplYeniBaslik" placeholder="örn: Etkinlikler"></div>
      <button type="button" class="btn btn-amber btn-sm" onclick="_yplBaslikEkle()">Ekle</button>
    </div>`;
  modalAc('🏷️ Ana Başlıklar', body, null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
}
function _yplBaslikEkle(){
  const input = document.getElementById('f_yplYeniBaslik');
  const ad = input.value.trim();
  if (!ad) return;
  YillikPlanService.baslikEkle({ ad, sira: yillikPlanBasliklari.length })
    .then(()=>{ input.value=''; setTimeout(yillikPlanBaslikYonetimiAc, 250); })
    .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}
function _yplBaslikSil(id){
  const kullaniliyor = yillikPlanTanimlari.some(t=>(t.sutunlar||[]).includes(id));
  if (kullaniliyor && !confirm('Bu başlık en az bir plan tanımında kullanılıyor. Yine de silmek istiyor musunuz? (O plandaki bu başlığa ait veriler artık gösterilmez, ama silinmez.)')) return;
  YillikPlanService.baslikSil(id).then(()=>setTimeout(yillikPlanBaslikYonetimiAc, 250)).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ================================================================
   ADMİN — Hafta Satırlarını Düzenle (manuel bakım)
   ================================================================ */
function yillikPlanHaftaSatirlariniDuzenle(planId){
  const t = _yplTanim(planId);
  if (!t) return;
  const body = `
    <div style="display:flex;flex-direction:column;gap:2px;max-height:55vh;overflow-y:auto;margin-bottom:10px;">
      ${(t.satirlar||[]).map((s,i)=>`
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-soft);">
          <span style="font-size:12.5px;">${i+1}. ${escapeHtml(s.ay||'')} — ${escapeHtml(_yplTarihMetni(s, t.egitimOgretimYili))}</span>
          <div style="display:flex;gap:4px;">
            <button type="button" class="btn btn-ghost btn-sm" onclick="modalKapat();_yplSatirDuzenleModalAc('${planId}',${i})">Düzenle</button>
            <button type="button" class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="_yplSatirSil('${planId}',${i})">Sil</button>
          </div>
        </div>`).join('') || '<p class="empty-state">Henüz hafta satırı yok.</p>'}
    </div>
    <button type="button" class="btn btn-amber btn-sm" onclick="modalKapat();_yplSatirDuzenleModalAc('${planId}', null)">➕ Yeni Hafta Ekle</button>
  `;
  modalAc(`📋 ${t.dersAdi} — Hafta Satırları`, body, null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
  document.getElementById('modalKaydetBtn').style.display = 'none';
}
function _yplSatirDuzenleModalAc(planId, index){
  const t = _yplTanim(planId);
  if (!t) return;
  const satir = (index!==null && index!==undefined) ? t.satirlar[index] : null;
  const body = `
    <div class="form-row">
      <div class="form-group"><label>Ay</label><input id="f_yplAy" value="${satir?escapeHtml(satir.ay):''}" placeholder="örn: EYLÜL"></div>
      <div class="form-group"><label>Hafta (gün aralığı ile)</label><input id="f_yplHafta" value="${satir?escapeHtml(satir.hafta):''}" placeholder="örn: 1.HAFTA(08-14)"></div>
      <div class="form-group" style="flex:0 0 90px;"><label>Saat</label><input id="f_yplSaat" value="${satir?escapeHtml(satir.saat):''}" placeholder="4 SAAT"></div>
    </div>
    ${(t.sutunlar||[]).map(sid=>`
      <div class="form-group"><label>${escapeHtml(_yplBaslikAdi(sid))}</label><textarea id="f_ypl_${sid}" rows="2">${satir?escapeHtml((satir.degerler||{})[sid]||''):''}</textarea></div>
    `).join('')}
  `;
  modalAc(satir?'Hafta Satırını Düzenle':'Yeni Hafta Ekle', body, () => {
    const yeniSatir = {
      ay: document.getElementById('f_yplAy').value.trim(),
      hafta: document.getElementById('f_yplHafta').value.trim(),
      saat: document.getElementById('f_yplSaat').value.trim(),
      degerler: {},
    };
    (t.sutunlar||[]).forEach(sid => {
      const val = document.getElementById(`f_ypl_${sid}`).value.trim();
      if (val) yeniSatir.degerler[sid] = val;
    });
    const satirlar = (t.satirlar||[]).slice();
    if (index!==null && index!==undefined) satirlar[index] = yeniSatir; else satirlar.push(yeniSatir);
    YillikPlanService.tanimGuncelle(t.id, { satirlar })
      .then(()=>{ toast('Kaydedildi.'); modalKapat(); setTimeout(()=>yillikPlanHaftaSatirlariniDuzenle(planId), 250); })
      .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
  });
}
function _yplSatirSil(planId, index){
  const t = _yplTanim(planId);
  if (!t || !confirm('Bu hafta satırını silmek istediğinize emin misiniz?')) return;
  const satirlar = (t.satirlar||[]).slice();
  satirlar.splice(index, 1);
  YillikPlanService.tanimGuncelle(t.id, { satirlar })
    .then(()=>{ toast('Silindi.'); setTimeout(()=>yillikPlanHaftaSatirlariniDuzenle(planId), 250); })
    .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ================================================================
   ADMİN — Sütun Genişlikleri (yazdırma/önizleme tablosu için, %)
   ================================================================ */
function yillikPlanSutunGenislikleriAc(planId){
  const t = _yplTanim(planId);
  if (!t) return;
  const genislik = _yplSutunGenislikleri(t);
  const satirlar = YPL_SISTEM_SUTUNLARI.map(([k,ad])=>({k, ad}))
    .concat((t.sutunlar||[]).map(sid=>({k:sid, ad:_yplBaslikAdi(sid)})));
  const body = `
    <p style="font-size:12px;color:var(--ink-muted);margin-bottom:10px;">Her sütun için yüzde (%) genişlik girin — toplamın 100 olması önerilir, şu an <span id="yplGenislikToplam" style="font-weight:700;">${satirlar.reduce((s,r)=>s+genislik[r.k],0).toFixed(1)}</span>.</p>
    <div style="display:flex;flex-direction:column;gap:6px;max-height:50vh;overflow-y:auto;">
      ${satirlar.map(r=>`
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span style="font-size:12.5px;">${escapeHtml(r.ad)}</span>
          <input type="number" min="1" max="80" step="0.5" class="ypl-genislik-input" data-key="${r.k}" value="${genislik[r.k]}" style="width:70px;" oninput="_yplGenislikToplamGuncelle()">
        </div>`).join('')}
    </div>`;
  modalAc(`📐 ${t.dersAdi} — Sütun Genişlikleri`, body, () => {
    const yeniGenislik = {};
    document.querySelectorAll('.ypl-genislik-input').forEach(inp => { yeniGenislik[inp.dataset.key] = parseFloat(inp.value) || 1; });
    YillikPlanService.goruntuAyarlariniKaydet(t.id, { sutunGenislikleri: yeniGenislik })
      .then(()=>toast('Kaydedildi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  });
}
function _yplGenislikToplamGuncelle(){
  const toplamEl = document.getElementById('yplGenislikToplam');
  if (!toplamEl) return;
  let toplam = 0;
  document.querySelectorAll('.ypl-genislik-input').forEach(inp => { toplam += parseFloat(inp.value) || 0; });
  toplamEl.textContent = toplam.toFixed(1);
  toplamEl.style.color = Math.abs(toplam-100) > 2 ? '#c0392b' : '';
}

/* ================================================================
   ADMİN — Örnek Planları İçe Aktar (tek seferlik, YILLIK_PLAN_TOHUM_VERI)
   Zaten mevcut aynı ders+seviye tanımı varsa TEKRAR eklemez (idempotent).
   ================================================================ */
function yillikPlanOrnekVerileriIceAktar(){
  if (typeof YILLIK_PLAN_TOHUM_VERI === 'undefined'){ toast('Tohum veri dosyası bulunamadı.'); return; }
  if (!confirm('Fen Bilimleri, Matematik, Müzik (6.sınıf), Görsel Sanatlar (5.sınıf) ve İngilizce (6.sınıf) örnek yıllık planları içe aktarılacak. Devam edilsin mi?')) return;

  const baslikIslemleri = YILLIK_PLAN_TOHUM_VERI.baslikKatalogu
    .filter(b => !yillikPlanBasliklari.some(mevcut => mevcut.ad === b.ad))
    .map(b => YillikPlanService.baslikEkle({ ad: b.ad, sira: yillikPlanBasliklari.length + b.sira }));

  Promise.all(baslikIslemleri).then(() => {
    // Başlık id eşleştirmesi ADA göre yapılıyor (Firestore id'leri farklı
    // olacağı için tohum veride kullanılan kısa key'ler değil, GÜNCEL
    // başlık listesindeki id'ler kullanılmalı).
    setTimeout(() => {
      const adIdEslesme = {};
      yillikPlanBasliklari.forEach(b => { adIdEslesme[b.ad] = b.id; });
      const kisaAdHaritasi = {};
      YILLIK_PLAN_TOHUM_VERI.baslikKatalogu.forEach(b => { kisaAdHaritasi[b.id] = b.ad; });

      const tanimIslemleri = YILLIK_PLAN_TOHUM_VERI.tanimlar
        .filter(t => !yillikPlanTanimlari.some(m => m.dersAdi === t.dersAdi && m.seviye === t.seviye))
        .map(t => {
          const sutunlar = t.sutunlar.map(kisaId => adIdEslesme[kisaAdHaritasi[kisaId]]).filter(Boolean);
          const satirlar = t.satirlar.map(s => {
            const degerler = {};
            Object.keys(s.degerler||{}).forEach(kisaId => {
              const gercekId = adIdEslesme[kisaAdHaritasi[kisaId]];
              if (gercekId) degerler[gercekId] = s.degerler[kisaId];
            });
            return { ay: s.ay, hafta: s.hafta, saat: s.saat, degerler };
          });
          return YillikPlanService.tanimEkle({
            dersAdi: t.dersAdi, seviye: t.seviye, egitimOgretimYili: t.egitimOgretimYili,
            sutunlar, satirlar,
          });
        });
      Promise.all(tanimIslemleri).then(() => toast(`${tanimIslemleri.length} plan içe aktarıldı.`))
        .catch(err => toast('Hata: '+err.message));
    }, 600); // Firestore dinleyicisinin yeni başlıkları yillikPlanBasliklari'na yansıtması için kısa bekleme
  }).catch(err => { if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ================================================================
   WORD (.docx) DOSYASINDAN İÇE AKTARMA
   ---------------------------------------------------------------
   Uygulamada zaten yüklü olan mammoth.js (bkz. js/dokuman-okuyucu.js)
   ile istemci tarafında (sunucuya hiç gitmeden) dosyayı HTML'e çevirip
   içindeki EN BÜYÜK tabloyu satır/sütun olarak ayrıştırıyoruz. Her ders
   farklı sütun adları kullandığı için (Fen Bilimleri'nde "ÜNİTE",
   Müzik'te "ÜNİTE KONU" vb.) sütun eşleştirmesini KULLANICI yapar —
   ilk 3 sütun otomatik olarak Ay/Hafta/Saat'e önerilir (MEB
   şablonlarının tamamında bu sıradadır), geri kalanlar için "Ana
   Başlık" havuzundan seçim yapılır ya da yeni başlık oluşturulur.
   ================================================================ */
let _yplIceAktarSatirlar = null; // [[hücre, hücre, ...], ...] — ayrıştırılan ham tablo (0. satır: başlıklar)

function yillikPlanWordIceAktarAc(){
  if (typeof mammoth === 'undefined'){ toast('Word okuma kütüphanesi yüklenemedi.'); return; }
  _yplIceAktarSatirlar = null;
  const body = `
    <div class="form-row">
      <div class="form-group"><label>Ders Adı</label><input id="f_yplwDers" placeholder="örn: Sosyal Bilgiler"></div>
      <div class="form-group" style="flex:0 0 110px;"><label>Sınıf Seviyesi</label>
        <select id="f_yplwSeviye">${[1,2,3,4,5,6,7,8].map(s=>`<option value="${s}" ${s===6?'selected':''}>${s}. Sınıf</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group"><label>Eğitim-Öğretim Yılı</label><input id="f_yplwYil" value="2026-2027"></div>
    <div class="form-group">
      <label>Yıllık Plan Dosyası (.docx)</label>
      <input type="file" id="f_yplwDosya" accept=".docx" onchange="_yplWordDosyaSecildi(this.files[0])">
    </div>
    <div id="yplwEslesmeAlani"></div>
  `;
  modalAc('⇪ Word\'den İçe Aktar', body, () => _yplIceAktarKaydet(), null, 'Sütunları Eşleştirdim, Kaydet');
  // Eşleştirme yapılmadan kaydedilemesin diye, tablo ayrıştırılana kadar buton devre dışı
  const kaydetBtn = document.getElementById('modalKaydetBtn');
  if (kaydetBtn) kaydetBtn.disabled = true;
}

async function _yplWordDosyaSecildi(dosya){
  const alan = document.getElementById('yplwEslesmeAlani');
  if (!dosya || !alan) return;
  alan.innerHTML = `<p style="font-size:12px;color:var(--ink-muted);padding:10px 0;">Dosya okunuyor…</p>`;
  try {
    const buf = await dosya.arrayBuffer();
    const sonuc = await mammoth.convertToHtml({ arrayBuffer: buf });
    const gecici = document.createElement('div');
    gecici.innerHTML = sonuc.value;
    const tablolar = Array.from(gecici.querySelectorAll('table'));
    if (!tablolar.length){ alan.innerHTML = `<p style="color:#c0392b;font-size:12px;">Bu dosyada bir tablo bulunamadı.</p>`; return; }
    // Birden fazla tablo varsa en çok satırlı olanı (asıl yıllık plan tablosu) kullan.
    const tablo = tablolar.sort((a,b)=> b.querySelectorAll('tr').length - a.querySelectorAll('tr').length)[0];
    const satirlarDom = Array.from(tablo.querySelectorAll('tr'));
    _yplIceAktarSatirlar = satirlarDom.map(tr =>
      Array.from(tr.querySelectorAll('th,td')).map(td => (td.textContent||'').replace(/\s+/g,' ').replace(/^[#=]+/,'').trim())
    );
    _yplEslesmeFormuCiz();
  } catch (e) {
    alan.innerHTML = `<p style="color:#c0392b;font-size:12px;">Dosya okunamadı: ${escapeHtml(e.message)}</p>`;
  }
}

function _yplEslesmeFormuCiz(){
  const alan = document.getElementById('yplwEslesmeAlani');
  if (!alan || !_yplIceAktarSatirlar || !_yplIceAktarSatirlar.length) return;
  const basliklar = _yplIceAktarSatirlar[0];
  const ornekSatir = _yplIceAktarSatirlar[1] || [];
  const sistemSecenekleri = ['','ay','hafta','saat'];
  const sistemEtiket = { ay:'Ay (sistem)', hafta:'Hafta (sistem)', saat:'Saat (sistem)' };

  alan.innerHTML = `
    <p style="font-size:12px;color:var(--ink-muted);margin:10px 0;">${basliklar.length} sütun, ${_yplIceAktarSatirlar.length-1} veri satırı bulundu. Her sütunun neyi karşıladığını seçin — MEB şablonlarında ilk 3 sütun genelde Ay/Hafta/Saat'tir, otomatik önerdik.</p>
    <div style="display:flex;flex-direction:column;gap:8px;max-height:45vh;overflow-y:auto;">
      ${basliklar.map((baslikMetni, i) => `
        <div style="border:1px solid var(--border);border-radius:8px;padding:8px 10px;">
          <div style="font-weight:700;font-size:12.5px;">${escapeHtml(baslikMetni || '(başlıksız sütun)')}</div>
          <div style="font-size:11px;color:var(--ink-muted);margin:2px 0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">örn: ${escapeHtml((ornekSatir[i]||'').slice(0,60))}</div>
          <select class="ypl-eslesme-select" data-index="${i}" onchange="_yplEslesmeYeniBaslikGoster(this)">
            <option value="">— Yoksay (bu sütunu alma) —</option>
            <optgroup label="Sistem Alanları">
              ${sistemSecenekleri.slice(1).map(s=>`<option value="sys:${s}" ${i===sistemSecenekleri.indexOf(s)?'selected':''}>${sistemEtiket[s]}</option>`).join('')}
            </optgroup>
            <optgroup label="Ana Başlıklar">
              ${yillikPlanBasliklari.map(b=>`<option value="baslik:${b.id}">${escapeHtml(b.ad)}</option>`).join('')}
              <option value="yeni">+ Yeni Başlık Oluştur…</option>
            </optgroup>
          </select>
          <input type="text" class="ypl-yeni-baslik-input" data-index="${i}" placeholder="Yeni başlık adı" style="display:none;margin-top:6px;">
        </div>
      `).join('')}
    </div>
  `;
  const kaydetBtn = document.getElementById('modalKaydetBtn');
  if (kaydetBtn) kaydetBtn.disabled = false;
}
function _yplEslesmeYeniBaslikGoster(selectEl){
  const input = selectEl.parentElement.querySelector('.ypl-yeni-baslik-input');
  if (input) input.style.display = selectEl.value === 'yeni' ? 'block' : 'none';
}

function _yplIceAktarKaydet(){
  const dersAdi = document.getElementById('f_yplwDers').value.trim();
  if (!dersAdi){ toast('Ders adı zorunludur.'); return; }
  if (!_yplIceAktarSatirlar){ toast('Önce bir dosya seçip sütunları eşleştirin.'); return; }
  const seviye = parseInt(document.getElementById('f_yplwSeviye').value, 10);
  const egitimOgretimYili = document.getElementById('f_yplwYil').value.trim();

  const selectler = Array.from(document.querySelectorAll('.ypl-eslesme-select'));
  const yeniBaslikIslemleri = []; // {index, ad} — kaydetme sırasında gerçek id'ye çevrilecek
  const eslesme = {}; // index -> {tur:'sys'|'baslik', deger}
  selectler.forEach(sel => {
    const idx = parseInt(sel.dataset.index, 10);
    const val = sel.value;
    if (!val) return;
    if (val === 'yeni'){
      const ad = sel.parentElement.querySelector('.ypl-yeni-baslik-input').value.trim();
      if (ad) yeniBaslikIslemleri.push({ index: idx, ad });
    } else if (val.startsWith('sys:')){
      eslesme[idx] = { tur:'sys', deger: val.slice(4) };
    } else if (val.startsWith('baslik:')){
      eslesme[idx] = { tur:'baslik', deger: val.slice(7) };
    }
  });

  const satirlarHam = _yplIceAktarSatirlar.slice(1);
  const kaydetBtn = document.getElementById('modalKaydetBtn');
  if (kaydetBtn){ kaydetBtn.disabled = true; kaydetBtn.textContent = 'Kaydediliyor…'; }

  Promise.all(yeniBaslikIslemleri.map(y => YillikPlanService.baslikEkle({ ad: y.ad, sira: yillikPlanBasliklari.length })
    .then(ref => { eslesme[y.index] = { tur:'baslik', deger: ref.id }; })))
    .then(() => {
      const sutunlar = [];
      Object.keys(eslesme).forEach(idx => {
        const e = eslesme[idx];
        if (e.tur === 'baslik' && !sutunlar.includes(e.deger)) sutunlar.push(e.deger);
      });
      const satirlar = satirlarHam.filter(r => r.some(c=>c)).map(r => {
        const satir = { ay:'', hafta:'', saat:'', degerler:{} };
        Object.keys(eslesme).forEach(idx => {
          const e = eslesme[idx];
          const metin = (r[idx] || '').trim();
          if (!metin) return;
          if (e.tur === 'sys') satir[e.deger] = metin;
          else satir.degerler[e.deger] = metin;
        });
        return satir;
      });
      return YillikPlanService.tanimEkle({ dersAdi, seviye, egitimOgretimYili, sutunlar, satirlar });
    })
    .then(() => { toast(`İçe aktarıldı — ${satirlarHam.length} satır.`); modalKapat(); })
    .catch(err => {
      if (kaydetBtn){ kaydetBtn.disabled = false; kaydetBtn.textContent = 'Sütunları Eşleştirdim, Kaydet'; }
      if (err.message!=='yetkisiz') toast('Hata: '+err.message);
    });
}
