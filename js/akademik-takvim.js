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
  ov.style.cssText = 'position:fixed;inset:0;z-index:9400;background:var(--bg-app);overflow-y:auto;overscroll-behavior:contain;';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  const adminMi = typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true;
  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-sidebar);color:var(--ink-on-dark);position:sticky;top:0;z-index:2;">
      <button class="btn btn-ghost btn-sm" onclick="akademikTakvimKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Kapat</button>
      <div style="font-weight:700;font-size:14px;">📅 Akademik Takvim</div>
      <div>${adminMi ? `
        <input type="file" id="akademikTakvimDosyaInput" accept="image/*" style="display:none;" onchange="akademikTakvimDosyaSecildi(this.files[0])">
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('akademikTakvimDosyaInput').click()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">🖼️ Görsel ${_akademikTakvimVeri?'Değiştir':'Yükle'}</button>
      ` : ''}</div>
    </div>
    <div id="akademikTakvimIcerik" style="padding:16px;"></div>
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
    el.innerHTML = '<p class="empty-state">Henüz bir akademik takvim görseli yüklenmemiş.</p>';
    return;
  }
  el.innerHTML = `<img src="${_akademikTakvimVeri.gorselUrl}" alt="Akademik Takvim" style="width:100%;height:auto;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.15);">`;
}
async function akademikTakvimDosyaSecildi(dosya){
  if (!dosya) return;
  const el = document.getElementById('akademikTakvimIcerik');
  const oncekiVeri = _akademikTakvimVeri;
  if (el) el.innerHTML = `<p class="empty-state">Yükleniyor… <span id="akademikTakvimYuzde">%0</span></p>`;
  try {
    await AkademikTakvimService.gorselYukle(dosya, (yuzde) => {
      const y = document.getElementById('akademikTakvimYuzde');
      if (y) y.textContent = `%${yuzde}`;
    }, oncekiVeri);
    toast('Akademik takvim güncellendi.');
  } catch (e) {
    if (e.message !== 'yetkisiz') toast('Yükleme hatası: ' + e.message);
    _akademikTakvimIcerigiCiz();
  }
}
