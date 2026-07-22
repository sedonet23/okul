/* =============================================================
   js/akademik-takvim.js
   Döküman ve Evraklar sayfasındaki "📅 Akademik Takvim" — okulun
   çalışma takvimi posterini tek bir tam sayfa görsel olarak gösteren
   özel bölüm. Sayfaya girilince görsel doğrudan açılır; SADECE admin
   görseli değiştirebilir (bkz. AkademikTakvimService).
   ============================================================= */
let _akademikTakvimVeri = null; // {gorselUrl, storagePath, guncellenmeTarihi, yukleyenAdi} | null
const AKADEMIK_TAKVIM_ONBELLEK_ANAHTARI = 'akademikTakvimOnbellek';

/* Görseli tarayıcının kendi localStorage'ına base64 olarak kaydeder —
   bir sonraki açılışta AĞ BEKLEMEDEN anında gösterilebilsin diye. Sadece
   storagePath değiştiğinde (admin yeni görsel yüklediğinde) yeniden
   indirip önbelleği güncelliyoruz; aynı görsel için tekrar tekrar
   indirmiyoruz. Depolama kotası dolarsa (büyük görsel + zaten dolu
   localStorage) sessizce vazgeçiyor — önbellek olmasa da uygulama normal
   (ağdan) çalışmaya devam eder. */
function _akademikTakvimOnbellekOku(){
  try {
    const ham = localStorage.getItem(AKADEMIK_TAKVIM_ONBELLEK_ANAHTARI);
    return ham ? JSON.parse(ham) : null;
  } catch (e) { return null; }
}
function _akademikTakvimOnbellegeYaz(storagePath, dataUri){
  try {
    localStorage.setItem(AKADEMIK_TAKVIM_ONBELLEK_ANAHTARI, JSON.stringify({ storagePath, dataUri }));
  } catch (e) { /* kota dolu vb. — sessizce vazgeç */ }
}
function _akademikTakvimGorseliOnbellekleAl(veri){
  if (!veri || !veri.gorselUrl || !veri.storagePath) return;
  fetch(veri.gorselUrl)
    .then(r => r.blob())
    .then(blob => new Promise((resolve, reject) => {
      const okuyucu = new FileReader();
      okuyucu.onloadend = () => resolve(okuyucu.result);
      okuyucu.onerror = reject;
      okuyucu.readAsDataURL(blob);
    }))
    .then(dataUri => _akademikTakvimOnbellegeYaz(veri.storagePath, dataUri))
    .catch(() => { /* önbellekleme başarısız olsa da görsel zaten ağdan gösteriliyor */ });
}

function akademikTakvimBaglantisiKur(){
  AkademikTakvimService.dinle(v => {
    _akademikTakvimVeri = v;
    // Ekran açıksa (kullanıcı içindeyken admin başka cihazdan değiştirdiyse) tazele
    if (document.getElementById('akademikTakvimOverlay')) _akademikTakvimIcerigiCiz();
  });
}

function akademikTakvimAc(){
  const ov = document.createElement('div');
  ov.id = 'akademikTakvimOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9400;background:#222;display:flex;flex-direction:column;';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  const adminMi = typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true;
  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-sidebar);color:var(--ink-on-dark);">
      <button class="btn btn-ghost btn-sm" onclick="akademikTakvimKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Kapat</button>
      <div style="font-weight:700;font-size:14px;">📅 Akademik Takvim</div>
      <div>${adminMi ? `
        <input type="file" id="akademikTakvimDosyaInput" accept="image/*" style="display:none;" onchange="akademikTakvimDosyaSecildi(this.files[0])">
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('akademikTakvimDosyaInput').click()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">🖼️ Görsel ${_akademikTakvimVeri?'Değiştir':'Yükle'}</button>
      ` : ''}</div>
    </div>
    <div id="akademikTakvimIcerik" style="flex:1;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;touch-action:none;"></div>
    <div style="text-align:center;font-size:11px;color:rgba(255,255,255,.6);padding:6px;">İki parmakla yakınlaştırın · çift dokunuşla hızlı yakınlaştır</div>
  `;
  _akademikTakvimIcerigiCiz();
}
function akademikTakvimKapat(){
  const ov = document.getElementById('akademikTakvimOverlay');
  if (ov) ov.remove();
  document.body.classList.remove('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
}
function _akademikTakvimIcerigiCiz(){
  const el = document.getElementById('akademikTakvimIcerik');
  if (!el) return;
  if (!_akademikTakvimVeri || !_akademikTakvimVeri.gorselUrl){
    el.innerHTML = '<p class="empty-state" style="color:#fff;">Henüz bir akademik takvim görseli yüklenmemiş.</p>';
    return;
  }
  const onbellek = _akademikTakvimOnbellekOku();
  const kaynak = (onbellek && onbellek.storagePath === _akademikTakvimVeri.storagePath)
    ? onbellek.dataUri  // önbellekte var — AĞ BEKLENMEDEN anında gösterilir
    : _akademikTakvimVeri.gorselUrl; // önbellekte yok/eski — ağdan göster + arka planda önbellekle
  if (kaynak === _akademikTakvimVeri.gorselUrl) _akademikTakvimGorseliOnbellekleAl(_akademikTakvimVeri);
  // object-fit:contain + max-width/height:100% → sığdırılmış (fit-to-screen)
  // başlangıç görünümü; pinch-zoom/pan bundan sonra devreye giriyor.
  el.innerHTML = `<img id="akademikTakvimGorsel" src="${kaynak}" alt="Akademik Takvim" style="max-width:100%;max-height:100%;object-fit:contain;transform-origin:center center;will-change:transform;">`;
  _akademikTakvimJestBagla();
}

/* İki parmakla yakınlaştırma + tek parmakla kaydırma (pan) — bkz.
   js/dokuman-okuyucu.js aynı jest deseninin sadeleştirilmiş hali (tek
   görsel için sayfa-çevirme mantığı yok, sadece zoom+pan). */
function _akademikTakvimJestBagla(){
  const govde = document.getElementById('akademikTakvimIcerik');
  const img = document.getElementById('akademikTakvimGorsel');
  if (!govde || !img) return;
  let zoom = 1, panX = 0, panY = 0;
  let baslangicMesafe = 0, baslangicZoom = 1;
  let surukleniyor = false, surukleBasX = 0, surukleBasY = 0, panBasX = 0, panBasY = 0;
  let sonTapZamani = 0;
  // DÜZELTME: eskiden pinch bitip iki parmak art arda kalkınca (her biri
  // kendi touchend'ini tetikler) bu YANLIŞLIKLA "çift dokunuş" sanılıp
  // zoom sıfırlanıyordu. Artık bir dokunuşun ÇİFT-DOKUNUŞ ADAYI sayılması
  // için: TÜM temas süresince tek parmak kalmış olmalı (hiç 2 parmağa
  // çıkmamış) VE parmak neredeyse hiç hareket etmemiş olmalı.
  let dokunmaBirDegdi = false, dokunmaBasX = 0, dokunmaBasY = 0, coklu = false;

  function uygula(){ img.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`; }
  function mesafe(t1, t2){ const dx=t1.clientX-t2.clientX, dy=t1.clientY-t2.clientY; return Math.sqrt(dx*dx+dy*dy); }

  govde.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2){
      coklu = true;
      baslangicMesafe = mesafe(e.touches[0], e.touches[1]);
      baslangicZoom = zoom;
      surukleniyor = false;
    } else if (e.touches.length === 1){
      coklu = false;
      dokunmaBirDegdi = true;
      dokunmaBasX = e.touches[0].clientX; dokunmaBasY = e.touches[0].clientY;
      if (zoom > 1.02){
        surukleniyor = true;
        surukleBasX = e.touches[0].clientX; surukleBasY = e.touches[0].clientY;
        panBasX = panX; panBasY = panY;
      }
    }
  }, { passive:true });
  govde.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2){
      // Zoom SINIRLI AŞAĞI 1'de duruyor — pinch bittiğinde otomatik
      // sıfırlama YOK, kullanıcı elini çekene kadar (ya da tekrar
      // uzaklaştırana kadar) yakınlaşmış halde KALIR.
      zoom = Math.min(6, Math.max(1, baslangicZoom * (mesafe(e.touches[0], e.touches[1]) / baslangicMesafe)));
      uygula();
    } else if (e.touches.length === 1){
      if (Math.abs(e.touches[0].clientX-dokunmaBasX) > 10 || Math.abs(e.touches[0].clientY-dokunmaBasY) > 10) dokunmaBirDegdi = false;
      if (surukleniyor){
        panX = panBasX + (e.touches[0].clientX - surukleBasX);
        panY = panBasY + (e.touches[0].clientY - surukleBasY);
        uygula();
      }
    }
  }, { passive:true });
  govde.addEventListener('touchend', (e) => {
    surukleniyor = false;
    if (e.touches.length > 0) return; // hâlâ parmak varsa (pinch'ten tek parmağa geçiş) tap değerlendirme
    // Çift dokunuşla hızlı zoom aç/kapa — SADECE gerçek, tek-parmaklı,
    // neredeyse hareketsiz bir dokunuşta değerlendirilir.
    if (dokunmaBirDegdi && !coklu){
      const simdi = Date.now();
      if (simdi - sonTapZamani < 300){
        zoom = zoom > 1.02 ? 1 : 2.2; panX = 0; panY = 0; uygula();
        sonTapZamani = 0; // üçüncü dokunuşun tekrar tetiklenmesini önle
      } else {
        sonTapZamani = simdi;
      }
    }
    coklu = false;
  });
}
async function akademikTakvimDosyaSecildi(dosya){
  if (!dosya) return;
  const el = document.getElementById('akademikTakvimIcerik');
  const oncekiVeri = _akademikTakvimVeri;
  if (el) el.innerHTML = `<p class="empty-state">Yükleniyor… <span id="akademikTakvimYuzde">%0</span></p>`;
  try {
    const yeniVeri = await AkademikTakvimService.gorselYukle(dosya, (yuzde) => {
      const y = document.getElementById('akademikTakvimYuzde');
      if (y) y.textContent = `%${yuzde}`;
    }, oncekiVeri);
    _akademikTakvimVeri = yeniVeri;
    _akademikTakvimIcerigiCiz();
    toast('Akademik takvim güncellendi.');
  } catch (e) {
    if (e.message !== 'yetkisiz') toast('Yükleme hatası: ' + e.message);
    _akademikTakvimIcerigiCiz();
  }
}
