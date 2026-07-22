/* =============================================================
   js/akademik-takvim.js
   Döküman ve Evraklar sayfasındaki "📅 Akademik Takvim" — okulun
   çalışma takvimi posterini tek bir tam sayfa görsel olarak gösteren
   özel bölüm. Sayfaya girilince görsel doğrudan açılır; SADECE admin
   görseli değiştirebilir (bkz. AkademikTakvimService).
   ============================================================= */
let _akademikTakvimVeri = null; // {gorselUrl, storagePath, guncellenmeTarihi, yukleyenAdi} | null

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
  // object-fit:contain + max-width/height:100% → sığdırılmış (fit-to-screen)
  // başlangıç görünümü; pinch-zoom/pan bundan sonra devreye giriyor.
  el.innerHTML = `<img id="akademikTakvimGorsel" src="${_akademikTakvimVeri.gorselUrl}" alt="Akademik Takvim" style="max-width:100%;max-height:100%;object-fit:contain;transform-origin:center center;will-change:transform;">`;
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

  function uygula(){ img.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`; }
  function mesafe(t1, t2){ const dx=t1.clientX-t2.clientX, dy=t1.clientY-t2.clientY; return Math.sqrt(dx*dx+dy*dy); }
  function sinirla(){
    if (zoom <= 1.02){ zoom = 1; panX = 0; panY = 0; }
  }

  govde.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2){
      baslangicMesafe = mesafe(e.touches[0], e.touches[1]);
      baslangicZoom = zoom;
      surukleniyor = false;
    } else if (e.touches.length === 1 && zoom > 1.02){
      surukleniyor = true;
      surukleBasX = e.touches[0].clientX; surukleBasY = e.touches[0].clientY;
      panBasX = panX; panBasY = panY;
    }
  }, { passive:true });
  govde.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2){
      zoom = Math.min(6, Math.max(1, baslangicZoom * (mesafe(e.touches[0], e.touches[1]) / baslangicMesafe)));
      sinirla(); uygula();
    } else if (e.touches.length === 1 && surukleniyor){
      panX = panBasX + (e.touches[0].clientX - surukleBasX);
      panY = panBasY + (e.touches[0].clientY - surukleBasY);
      uygula();
    }
  }, { passive:true });
  govde.addEventListener('touchend', (e) => {
    surukleniyor = false;
    // Çift dokunuşla hızlı zoom aç/kapa
    if (e.changedTouches.length === 1){
      const simdi = Date.now();
      if (simdi - sonTapZamani < 300){
        zoom = zoom > 1.02 ? 1 : 2.2; panX = 0; panY = 0; uygula();
      }
      sonTapZamani = simdi;
    }
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
