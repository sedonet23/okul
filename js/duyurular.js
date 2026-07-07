/* ====================================================================
   js/duyurular.js
   DUYURU PANOSU MODÜLÜ — UI KATMANI
   Haberler/RSS modülünden TAMAMEN BAĞIMSIZ — kendi sekmesi, kendi
   yetkisi, kendi okundu-takip sistemi var.

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya)          → sadece DOM + DuyurularService çağrısı, db bilmez
     js/core/services/duyurular.service.js    → iş kuralı + yetki kontrolü
     js/core/repositories/duyurular.repository.js → TEK Firestore erişim noktası
   ==================================================================== */

let duyurular = [];

/* ---------- Firestore bağlantısı (app.js baglantilariKur içinden çağrılır) ---------- */
function duyurularBaglantilariKur(){
  DuyurularRepository.duyurulariDinle(v=>{
    duyurular = v.sort((a,b)=>(b.tarih||'').localeCompare(a.tarih||''));
    renderDuyurular();
    renderDuyuruPanosu();
    if(typeof topbarBildirimRozetiGuncelle === 'function') topbarBildirimRozetiGuncelle();
  });
}

/* ---------- Sekme: tam liste ---------- */
function renderDuyurular(){
  const hedef = document.getElementById('duyurularListesi');
  if(!hedef) return;
  const aktifler = duyurular.filter(d => !d.arsivlendi);
  if(!aktifler.length){ hedef.innerHTML = '<p class="empty-state">Henüz duyuru eklenmedi.</p>'; return; }
  hedef.innerHTML = aktifler.map(d=>{
    const okuyanSayisi = Object.keys(d.okuyanlar||{}).length;
    const benOkudumMu = DuyurularService.benOkudumMu(d);
    return `
    <div class="card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:15px;display:flex;align-items:center;gap:6px;">📢 ${escapeHtml(d.baslik)}</div>
          <div style="font-size:11.5px;color:var(--ink-muted);margin-top:2px;">${escapeHtml(d.olusturanAdi||'Yönetici')} · ${isoYereleCevir(d.tarih).tarih} ${isoYereleCevir(d.tarih).saat}</div>
        </div>
        ${benOkudumMu
          ? `<span class="badge badge-sage" style="flex-shrink:0;">✓ Okudunuz</span>`
          : `<button class="btn btn-primary btn-sm" style="flex-shrink:0;" onclick="duyuruOkunduIsaretleTikla('${d.id}')">Okudum</button>`}
      </div>
      <div style="margin-top:10px;font-size:14px;white-space:pre-wrap;">${escapeHtml(d.icerik||'')}</div>
      ${_duyuruGaleriHtml(d.resimler, d.id, true)}
      <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <button class="btn btn-ghost btn-sm" onclick="duyuruDetayAc('${d.id}')">👁 ${okuyanSayisi} kişi okudu</button>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="duyuruModalAc('${d.id}')">Düzenle</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* not: "kimler okudu" görüntüleme artık duyuruDetayAc() içinde birleşik (bkz. aşağıda) */

/* ================================================================
   GÖRSEL DUYURU DESTEĞİ (YENİ)
   ================================================================ */

/* buyukIlk=true: ilk görsel tam genişlikte büyük gösterilir (kalan sayısı
   köşede rozet olarak), Ana Sayfa kartı ve liste önizlemesi için.
   buyukIlk=false: tüm görseller küçük bir ızgarada (detay modalı için). */
function _duyuruGaleriHtml(resimler, duyuruId, buyukIlk){
  if(!resimler || !resimler.length) return '';
  if(buyukIlk){
    const ilk = resimler[0];
    const kalanSayisi = resimler.length - 1;
    return `
      <div style="position:relative;margin-top:10px;border-radius:10px;overflow:hidden;cursor:pointer;" onclick="event.stopPropagation(); duyuruLightboxAcById('${duyuruId}', 0)">
        <img src="${escapeHtml(ilk.url)}" style="width:100%;max-height:340px;object-fit:cover;display:block;">
        ${kalanSayisi > 0 ? `<div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.65);color:#fff;font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;">+${kalanSayisi} daha</div>` : ''}
      </div>`;
  }
  return `
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
      ${resimler.map((r,i)=>`<img src="${escapeHtml(r.url)}" style="width:76px;height:76px;object-fit:cover;border-radius:8px;cursor:pointer;" onclick="event.stopPropagation(); duyuruLightboxAcById('${duyuruId}', ${i})">`).join('')}
    </div>`;
}

/* Tam ekran görsel görüntüleyici — bir duyurunun görsellerinden birine
   dokununca açılır, birden fazla görsel varsa ‹ › ile gezinilir. */
let _duyuruLightboxResimler = [];
let _duyuruLightboxIndex = 0;
function duyuruLightboxAcById(duyuruId, index){
  const d = duyurular.find(x=>x.id===duyuruId);
  if(!d || !d.resimler || !d.resimler.length) return;
  _duyuruLightboxResimler = d.resimler;
  _duyuruLightboxIndex = index;

  const eski = document.getElementById('duyuruLightbox');
  if(eski) eski.remove();
  const ov = document.createElement('div');
  ov.id = 'duyuruLightbox';
  ov.style.cssText = 'position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,.92);display:flex;flex-direction:column;';
  ov.innerHTML = `
    <div style="display:flex;justify-content:flex-end;padding:10px;">
      <button id="dlbKapat" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:20px;width:36px;height:36px;font-size:18px;cursor:pointer;">✕</button>
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;touch-action:none;">
      <button id="dlbOnceki" style="position:absolute;left:8px;background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:50%;width:40px;height:40px;font-size:20px;cursor:pointer;">‹</button>
      <img id="dlbResim" style="max-width:92%;max-height:92%;object-fit:contain;border-radius:6px;">
      <button id="dlbSonraki" style="position:absolute;right:8px;background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:50%;width:40px;height:40px;font-size:20px;cursor:pointer;">›</button>
    </div>
    <div id="dlbSayac" style="text-align:center;color:#fff;padding:10px;font-size:13px;"></div>
  `;
  document.body.appendChild(ov);
  document.body.classList.add('dlk-overlay-acik');
  if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  ov.querySelector('#dlbKapat').onclick = () => {
    ov.remove();
    document.body.classList.remove('dlk-overlay-acik');
    if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
  };
  let _dlbZoom = 1, _dlbPanX = 0, _dlbPanY = 0;
  function _dlbTransformUygula(){
    ov.querySelector('#dlbResim').style.transform = `translate(${_dlbPanX}px, ${_dlbPanY}px) scale(${_dlbZoom})`;
  }
  function goster(){
    _dlbZoom = 1; _dlbPanX = 0; _dlbPanY = 0;
    ov.querySelector('#dlbResim').src = _duyuruLightboxResimler[_duyuruLightboxIndex].url;
    _dlbTransformUygula();
    ov.querySelector('#dlbSayac').textContent = `${_duyuruLightboxIndex+1} / ${_duyuruLightboxResimler.length}`;
    const cokluMu = _duyuruLightboxResimler.length > 1;
    ov.querySelector('#dlbOnceki').style.display = cokluMu ? '' : 'none';
    ov.querySelector('#dlbSonraki').style.display = cokluMu ? '' : 'none';
  }
  ov.querySelector('#dlbOnceki').onclick = () => { _duyuruLightboxIndex = (_duyuruLightboxIndex - 1 + _duyuruLightboxResimler.length) % _duyuruLightboxResimler.length; goster(); };
  ov.querySelector('#dlbSonraki').onclick = () => { _duyuruLightboxIndex = (_duyuruLightboxIndex + 1) % _duyuruLightboxResimler.length; goster(); };

  // DÜZELTME (YENİ): Sadece ok butonlarına dokunmak yeterli değildi —
  // kullanıcılar doğal olarak parmakla kaydırmayı (swipe) deniyor.
  // Tek parmak yatay kaydırma (yakınlaştırma yokken) sayfa değiştirir.
  // YENİ: İki parmakla pinch-zoom + yakınlaştırılmışken tek parmakla
  // gezinme (pan) — dokuman-okuyucu.js'deki PDF davranışıyla aynı desen.
  ov.querySelector('#dlbResim').style.transformOrigin = 'center center';
  let _dlbBaslangicX = null, _dlbBaslangicY = null;
  let _dlbSurukleniyor = false, _dlbPanBaslX = 0, _dlbPanBaslY = 0;
  let _dlbPinchBaslangic = 0, _dlbZoomBaslangic = 1;
  const govdeEl = ov.querySelector('div[style*="flex:1"]');

  function _dlbMesafe(t1, t2){
    const dx = t1.clientX - t2.clientX, dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  govdeEl.addEventListener('touchstart', (e) => {
    if(e.touches.length === 2){
      _dlbPinchBaslangic = _dlbMesafe(e.touches[0], e.touches[1]);
      _dlbZoomBaslangic = _dlbZoom;
      _dlbBaslangicX = null;
      _dlbSurukleniyor = false;
    } else if(e.touches.length === 1){
      if(_dlbZoom > 1.02){
        _dlbSurukleniyor = true;
        _dlbBaslangicX = e.touches[0].clientX;
        _dlbBaslangicY = e.touches[0].clientY;
        _dlbPanBaslX = _dlbPanX; _dlbPanBaslY = _dlbPanY;
      } else {
        _dlbBaslangicX = e.touches[0].clientX;
      }
    }
  }, { passive: true });

  govdeEl.addEventListener('touchmove', (e) => {
    if(e.touches.length === 2){
      const mesafe = _dlbMesafe(e.touches[0], e.touches[1]);
      _dlbZoom = Math.min(4, Math.max(1, _dlbZoomBaslangic * (mesafe / _dlbPinchBaslangic)));
      if(_dlbZoom <= 1.02){ _dlbPanX = 0; _dlbPanY = 0; }
      _dlbTransformUygula();
    } else if(e.touches.length === 1 && _dlbSurukleniyor){
      _dlbPanX = _dlbPanBaslX + (e.touches[0].clientX - _dlbBaslangicX);
      _dlbPanY = _dlbPanBaslY + (e.touches[0].clientY - _dlbBaslangicY);
      _dlbTransformUygula();
    }
  }, { passive: true });

  govdeEl.addEventListener('touchend', (e) => {
    if(!_dlbSurukleniyor && _dlbZoom <= 1.02 && _dlbBaslangicX !== null && e.changedTouches.length === 1){
      const fark = e.changedTouches[0].clientX - _dlbBaslangicX;
      if(Math.abs(fark) > 50 && _duyuruLightboxResimler.length > 1){
        if(fark < 0) _duyuruLightboxIndex = (_duyuruLightboxIndex + 1) % _duyuruLightboxResimler.length;
        else _duyuruLightboxIndex = (_duyuruLightboxIndex - 1 + _duyuruLightboxResimler.length) % _duyuruLightboxResimler.length;
        goster();
      }
    }
    _dlbBaslangicX = null;
    _dlbSurukleniyor = false;
  });

  goster();
}

/* Yüklemeden önce görseli makul bir boyuta küçültür (uzun kenar max 1600px,
   JPEG %85 kalite) — telefon kameraları genelde 4000px+ ürettiği için,
   hâlâ net/okunaklı ama Storage/veri kullanımını mantıklı tutar. */
function _duyuruResimKucult(dosya){
  return new Promise((resolve, reject) => {
    const MAKS_KENAR = 1600;
    const url = URL.createObjectURL(dosya);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if(width > MAKS_KENAR || height > MAKS_KENAR){
        if(width >= height){ height = Math.round(height * MAKS_KENAR / width); width = MAKS_KENAR; }
        else { width = Math.round(width * MAKS_KENAR / height); height = MAKS_KENAR; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      // PNG şeffaflığı korunsun diye PNG kaynaklar PNG olarak kalır;
      // diğerleri (JPEG, WEBP vb.) daha küçük dosya boyutu için JPEG'e çevrilir.
      const pngMi = dosya.type === 'image/png';
      const cikisTipi = pngMi ? 'image/png' : 'image/jpeg';
      const uzanti = pngMi ? '.png' : '.jpg';
      const kalite = pngMi ? undefined : 0.85; // PNG kayıpsızdır, kalite parametresi anlamsız
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        if(!blob){ reject(new Error('Görsel işlenemedi.')); return; }
        resolve(new File([blob], dosya.name.replace(/\.[^.]+$/, '') + uzanti, { type: cikisTipi }));
      }, cikisTipi, kalite);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Görsel okunamadı.')); };
    img.src = url;
  });
}

function duyuruOkunduIsaretleTikla(id){
  DuyurularService.okunduIsaretle(id).catch(err=>{ if(err.message!=='kimlik-yok') toast('Hata: '+err.message); });
}

/* Modal açıkken düzenlenen galeri — "Kaydet"e basılınca duyuruya yazılır. */
let _duyuruModalResimler = [];

function _duyuruModalGaleriHtml(){
  if(!_duyuruModalResimler.length) return '<p style="font-size:12px;color:var(--ink-muted);margin:0;">Henüz görsel eklenmedi.</p>';
  return `<div style="display:flex;flex-wrap:wrap;gap:8px;">${_duyuruModalResimler.map((r,i)=>`
    <div style="position:relative;width:72px;height:72px;">
      <img src="${escapeHtml(r.url)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">
      <button onclick="_duyuruModalResimKaldir(${i})" style="position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;background:#c0392b;color:#fff;border:none;font-size:12px;cursor:pointer;line-height:1;">✕</button>
    </div>`).join('')}</div>`;
}

function _duyuruModalResimKaldir(index){
  // NOT: Storage'dan burada hemen silmiyoruz — kullanıcı modalı "Vazgeç" ile
  // kapatırsa dosya boşuna silinmiş olmaz. Sadece kaydedilecek listeden
  // çıkarılır; kayıtlı bir duyurudan kaldırılan görsel varsa, en son
  // "Kaydet" ile duyuru güncellendiğinde Storage'da yetim kalır — bu, yanlış
  // fotoğrafın kalıcı silinmesinden çok daha güvenli bir taviz.
  _duyuruModalResimler.splice(index, 1);
  const galeriEl = document.getElementById('f_duyuruResimGaleri');
  if(galeriEl) galeriEl.innerHTML = _duyuruModalGaleriHtml();
}

function duyuruModalAc(id){
  const d = id ? duyurular.find(x=>x.id===id) : null;
  _duyuruModalResimler = d ? JSON.parse(JSON.stringify(d.resimler||[])) : [];
  const body = `
    <div class="form-group"><label>Başlık</label><input id="f_duyuruBaslik" value="${escapeHtml(d?d.baslik:'')}" style="width:100%;" autofocus></div>
    <div class="form-group"><label>İçerik</label><textarea id="f_duyuruIcerik" rows="5" style="width:100%;">${escapeHtml(d?d.icerik:'')}</textarea></div>
    <div class="form-group">
      <label>Görseller (birden fazla seçilebilir — JPEG, PNG vb.)</label>
      <input type="file" id="f_duyuruResimSec" accept="image/*" multiple style="width:100%;margin-bottom:8px;">
      <div id="f_duyuruResimDurum" style="font-size:12px;color:var(--ink-muted);margin-bottom:6px;"></div>
      <div id="f_duyuruResimGaleri">${_duyuruModalGaleriHtml()}</div>
    </div>
  `;
  modalAc(d?'Duyuruyu Düzenle':'📢 Yeni Duyuru', body, ()=>{
    const baslik = document.getElementById('f_duyuruBaslik').value.trim();
    const icerik = document.getElementById('f_duyuruIcerik').value.trim();
    if(!baslik){ toast('Başlık zorunludur.'); return; }
    DuyurularService.duyuruKaydet(id||null, { baslik, icerik, resimler: _duyuruModalResimler })
      .then(()=>{ toast('Kaydedildi.'); modalKapat(); })
      .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
  }, d ? ()=>{ if(confirm('Bu duyuruyu arşivlemek istediğinize emin misiniz? (Görünürlükten kalkar ama silinmez — "📦 Arşiv" ekranından geri alabilirsiniz.)')){ DuyurularService.duyuruArsivle(id).then(()=>toast('Arşivlendi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }); modalKapat(); } } : null);
  if(d){
    const silBtn = document.getElementById('modalSilBtn');
    if(silBtn) silBtn.textContent = '📦 Arşivle';
  }

  // Dosya(lar) seçildiğinde: sırayla küçült + Storage'a yükle + galeriye ekle.
  const secEl = document.getElementById('f_duyuruResimSec');
  if(secEl) secEl.onchange = async (e) => {
    const dosyalar = Array.from(e.target.files || []);
    if(!dosyalar.length) return;
    const durumEl = document.getElementById('f_duyuruResimDurum');
    for(let i=0;i<dosyalar.length;i++){
      if(durumEl) durumEl.textContent = `Yükleniyor… (${i+1}/${dosyalar.length})`;
      try{
        const kucuk = await _duyuruResimKucult(dosyalar[i]);
        const sonuc = await DuyurularService.resimYukle(kucuk);
        _duyuruModalResimler.push(sonuc);
        const galeriEl = document.getElementById('f_duyuruResimGaleri');
        if(galeriEl) galeriEl.innerHTML = _duyuruModalGaleriHtml();
      }catch(err){ toast('Görsel yüklenemedi: ' + err.message); }
    }
    if(durumEl) durumEl.textContent = '';
    e.target.value = '';
  };
}

/* ---------- Anasayfa Duyuru Panosu kartı ----------
   Okunmamış duyurular ikonlu + yanıp sönen rozetle, "Okudum" butonuyla
   gösterilir. Okununca yanıp sönme durur, "✓ Okundu" görünür. */
function renderDuyuruPanosu(){
  const kart = document.getElementById('duyuruPanosuKart');
  const icerik = document.getElementById('duyuruPanosuIcerik');
  if(!kart || !icerik) return;
  const aktifler = duyurular.filter(d => !d.arsivlendi);
  if(!aktifler.length){ kart.style.display='none'; return; }
  kart.style.display = '';
  const gosterilecekler = aktifler.slice(0,5);
  icerik.innerHTML = gosterilecekler.map(d=>{
    const benOkudumMu = DuyurularService.benOkudumMu(d);
    return `
    <div class="dash-row ${benOkudumMu?'':'duyuru-okunmamis'}" style="align-items:flex-start;flex-direction:column;gap:6px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;" onclick="duyuruDetayAc('${d.id}')">
      <div style="display:flex;align-items:center;gap:8px;width:100%;">
        <span class="duyuru-ikon ${benOkudumMu?'':'duyuru-ikon-yanip-soner'}">📢</span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;">${escapeHtml(d.baslik)}</div>
          <div style="font-size:11px;color:var(--ink-muted);">${isoYereleCevir(d.tarih).tarih}</div>
        </div>
        ${benOkudumMu
          ? `<span class="badge badge-sage" style="flex-shrink:0;">✓ Okundu</span>`
          : `<button class="btn btn-primary btn-sm" style="flex-shrink:0;" onclick="event.stopPropagation(); duyuruOkunduIsaretleTikla('${d.id}')">Okudum</button>`}
      </div>
      ${d.icerik ? `<div style="font-size:12.5px;color:var(--ink-muted);padding-left:28px;">${escapeHtml(d.icerik.length>90?d.icerik.slice(0,90)+'…':d.icerik)}</div>` : ''}
      ${_duyuruGaleriHtml(d.resimler, d.id, true)}
    </div>`;
  }).join('');
}

/* Duyuru kartına/satırına tıklayınca tam içeriği bir modalda gösterir.
   Admin (duyurular:düzenle yetkisi olan) için "kimler okudu" listesi de
   aynı modalda görünür. */
function duyuruDetayAc(id){
  const d = duyurular.find(x=>x.id===id);
  if(!d) return;
  const benOkudumMu = DuyurularService.benOkudumMu(d);
  const duzenleyebilirMi = typeof duzenleyebilir==='function' && duzenleyebilir('duyurular');
  const okuyanlar = Object.values(d.okuyanlar||{}).sort((a,b)=>(a.tarih||'').localeCompare(b.tarih||''));

  const body = `
    <div style="font-size:12px;color:var(--ink-muted);margin-bottom:10px;">${escapeHtml(d.olusturanAdi||'Yönetici')} · ${isoYereleCevir(d.tarih).tarih} ${isoYereleCevir(d.tarih).saat}</div>
    <div style="font-size:14.5px;white-space:pre-wrap;line-height:1.5;">${escapeHtml(d.icerik||'')}</div>
    ${_duyuruGaleriHtml(d.resimler, d.id, false)}
    ${duzenleyebilirMi ? `
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);">
        <div style="font-weight:700;font-size:13px;margin-bottom:8px;">👁 Okuyanlar (${okuyanlar.length})</div>
        ${okuyanlar.length ? `<div style="max-height:220px;overflow-y:auto;">${okuyanlar.map(o=>`
          <div class="detay-row" style="display:flex;justify-content:space-between;">
            <span>${escapeHtml(o.ad)}</span>
            <span class="detay-row-muted">${isoYereleCevir(o.tarih).tarih} ${isoYereleCevir(o.tarih).saat}</span>
          </div>`).join('')}</div>` : '<p class="empty-state">Henüz kimse okumadı.</p>'}
      </div>` : ''}
  `;
  modalAc(`📢 ${escapeHtml(d.baslik)}`, body,
    (!benOkudumMu) ? ()=>{ duyuruOkunduIsaretleTikla(id); modalKapat(); } : null,
    null,
    benOkudumMu ? undefined : 'Okudum'
  );
  if(benOkudumMu){
    const kaydetBtn = document.getElementById('modalKaydetBtn');
    if(kaydetBtn) kaydetBtn.style.display = 'none';
  }
}

/* ================================================================
   ARŞİV EKRANI (YENİ) — "Sil" artık normal akışta kullanılmıyor;
   arşivlenen duyurular burada listelenir, geri alınabilir veya
   (isteyerek) kalıcı olarak silinebilir.
   ================================================================ */
function duyuruArsivModalAc(){
  const arsivdekiler = duyurular.filter(d => d.arsivlendi);
  const body = !arsivdekiler.length
    ? '<p class="empty-state">Arşivde duyuru yok.</p>'
    : arsivdekiler.map(d => `
      <div class="detay-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div style="min-width:0;">
          <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(d.baslik)}</div>
          <div class="detay-row-muted" style="font-size:11px;">${isoYereleCevir(d.tarih).tarih} tarihli · ${d.arsivTarihi ? isoYereleCevir(d.arsivTarihi).tarih + ' arşivlendi' : ''}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="btn btn-ghost btn-sm" onclick="duyuruArsivdenCikarTikla('${d.id}')">↩️ Geri Al</button>
          <button class="btn btn-danger btn-sm" onclick="duyuruKaliciSilTikla('${d.id}', '${escapeHtml(d.baslik)}')">🗑</button>
        </div>
      </div>`).join('');
  modalAc('📦 Arşivlenen Duyurular', body, null, null);
}

function duyuruArsivdenCikarTikla(id){
  DuyurularService.duyuruArsivdenCikar(id)
    .then(()=>{ toast('Arşivden çıkarıldı.'); modalKapat(); duyuruArsivModalAc(); })
    .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

function duyuruKaliciSilTikla(id, baslik){
  if(!confirm(`"${baslik}" duyurusu KALICI OLARAK silinecek, bu işlem geri alınamaz. Emin misiniz?`)) return;
  const d = duyurular.find(x=>x.id===id);
  DuyurularService.duyuruSil(id, d?.resimler||[])
    .then(()=>{ toast('Kalıcı olarak silindi.'); modalKapat(); duyuruArsivModalAc(); })
    .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}
