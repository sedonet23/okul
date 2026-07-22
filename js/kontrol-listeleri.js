/* =============================================================
   js/kontrol-listeleri.js
   KONTROL LİSTELERİ — genel amaçlı, renkli/ikonlu yapılacaklar listesi
   modülü. "Yıl Sonu İşlemleri" ilk örnek liste; admin dilediği kadar
   başka liste ekleyebilir (ör. "Yıl Başı İşlemleri"). Her öğretmen
   kendi tamamlama durumunu işaretler (kimse başkasınınkini göremez/
   değiştiremez); admin ise madde bazında kaç öğretmenin işaretlediğini
   özet olarak görebilir.
   ============================================================= */
let kontrolListeleri = [];         // [{id, ad, aciklama, sira, maddeler:[...]}]
let _klAcikListeId = null;
let _klTamamlanan = new Set();     // açık listede, GİRİŞ YAPAN öğretmenin işaretlediği madde ID'leri
let _klTumTamamlamaAboneligi = null; // admin özet ekranı açıkken aktif dinleyici (kapatılabilsin diye saklanıyor)

/* ================================================================
   SİMGE (İKON) PAKETİ ve RENK PAKETİ — madde ekle/düzenle formlarında
   kullanılan hazır seçim grid'leri.
   ================================================================ */
const KL_IKON_PAKETI = [
  // Ofis & Belgeler
  '📌','📋','📝','📑','📖','📚','📔','📕','📗','📘','📙','💻',
  '📊','📈','📉','✅','❌','🗂️','🗓️','📅','⏰','🔔','📮','📤',
  '📥','🧾','📐','🧮','📎','🖊️','✏️','🖨️','🗃️','🗄️','📦','📫',
  // İletişim & Kişiler
  '👨‍👩‍👧','👨‍👩‍👧‍👦','👥','🧑‍🏫','🧑‍🤝‍🧑','🤝','💬','📢','📣','🙋','🙋‍♂️','👤',
  '👩‍💼','👨‍💼','🧑‍💻','📞','📟','📠',
  // Okul & Eğitim
  '🎓','🏫','📒','🔬','🔭','🎨','🎭','🎵','🎤','🏋️','🏃','🧪',
  '🖥️','⌨️','🖱️','💡','📡','🔌','🔋',
  // Güvenlik & Yönetim
  '🔒','🔑','🔓','🛡️','⚙️','🔧','🔨','🪛','🧰','📋','🗝️','🚪',
  // Başarı & Durum
  '🎯','🏆','⭐','🚩','🏅','🥇','🎖️','🎀','🎗️','💯','✔️','☑️',
  // Takvim & Zaman
  '📆','🗒️','⌛','⏳','🕐','📇','🗑️','♻️',
  // Diğer
  '🚀','💎','🔍','🌟','💪','🤔','📍','🌐','🏠','🚗','✈️','🌈'
];
const KL_RENK_PAKETI = ['#1E88E5','#43A047','#FB8C00','#8E24AA','#00897B','#D81B60','#FFB300','#7E57C2'];

function _klSeciciGridHtml(inputId, tip, secili){
  const secenekler = tip==='ikon' ? KL_IKON_PAKETI : KL_RENK_PAKETI;
  const grid = secenekler.map(deger => {
    const aktifMi = deger === secili;
    if (tip==='ikon'){
      return `<button type="button" class="kl-secici-btn" data-inputid="${inputId}" data-tip="ikon" data-deger="${deger}"
        onclick="_klSecimYap(this)"
        style="width:34px;height:34px;font-size:17px;border-radius:8px;border:2px solid ${aktifMi?'var(--brand)':'transparent'};background:${aktifMi?'rgba(0,0,0,0.06)':'transparent'};cursor:pointer;">${deger}</button>`;
    }
    return `<button type="button" class="kl-secici-btn" data-inputid="${inputId}" data-tip="renk" data-deger="${deger}"
      onclick="_klSecimYap(this)"
      style="width:30px;height:30px;border-radius:50%;background:${deger};border:3px solid ${aktifMi?'#000':'transparent'};box-shadow:0 0 0 1px rgba(0,0,0,0.15);cursor:pointer;"></button>`;
  }).join('');
  const ozelSatir = tip==='ikon' ? `
    <div style="display:flex;align-items:center;gap:6px;margin-top:6px;padding-top:6px;border-top:1px solid var(--border-soft);">
      <input id="${inputId}_ozel" type="text" maxlength="2" placeholder="Emoji gir…"
        style="width:60px;height:34px;font-size:20px;text-align:center;border:1px solid var(--border-soft);border-radius:8px;background:var(--bg-card,#fff);">
      <button type="button" onclick="_klOzelEmojiEkle('${inputId}')"
        style="height:34px;padding:0 10px;border-radius:8px;border:1px solid var(--border-soft);background:var(--brand,#1E88E5);color:#fff;font-size:13px;cursor:pointer;">Ekle</button>
      <span style="font-size:11.5px;color:var(--ink-muted);">Listede olmayan bir emoji kullanabilirsin.</span>
    </div>` : '';
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;max-height:160px;overflow-y:auto;padding:6px;border:1px solid var(--border-soft);border-radius:8px;">${grid}</div>${ozelSatir}`;
}
function _klOzelEmojiEkle(inputId){
  const inp = document.getElementById(inputId + '_ozel');
  if (!inp) return;
  const deger = inp.value.trim();
  if (!deger){ toast('Bir emoji gir.'); return; }
  const input = document.getElementById(inputId);
  if (input) input.value = deger;
  const onizleme = document.getElementById(inputId + '_onizleme');
  if (onizleme) onizleme.textContent = deger;
  // grid'deki seçim vurgularını temizle
  const grid = document.querySelector(`[data-inputid="${inputId}"]`)?.parentElement;
  if (grid) Array.from(grid.querySelectorAll('.kl-secici-btn')).forEach(b => {
    b.style.border = '2px solid transparent';
    b.style.background = 'transparent';
  });
  inp.value = '';
  toast('Simge seçildi: ' + deger);
}
function _klSecimYap(btn){
  const inputId = btn.getAttribute('data-inputid');
  const deger = btn.getAttribute('data-deger');
  const input = document.getElementById(inputId);
  if (input) input.value = deger;
  const onizlemeId = inputId + '_onizleme';
  const onizleme = document.getElementById(onizlemeId);
  if (onizleme){
    if (btn.getAttribute('data-tip')==='ikon') onizleme.textContent = deger;
    else onizleme.style.background = deger;
  }
  // aynı grid içindeki diğer butonların aktif görünümünü kaldır
  const grid = btn.parentElement;
  if (grid) Array.from(grid.children).forEach(b => {
    const aktif = b === btn;
    if (b.getAttribute('data-tip')==='ikon'){
      b.style.border = aktif ? '2px solid var(--brand)' : '2px solid transparent';
      b.style.background = aktif ? 'rgba(0,0,0,0.06)' : 'transparent';
    } else {
      b.style.border = aktif ? '3px solid #000' : '3px solid transparent';
    }
  });
}
function _klMaddeFormBody(mevcutIkon, mevcutRenk, mevcutMetin){
  const ikon = mevcutIkon || '📌';
  const renk = mevcutRenk || KL_RENK_PAKETI[0];
  return `
    <input type="hidden" id="f_klMIkon" value="${ikon}">
    <input type="hidden" id="f_klMRenk" value="${renk}">
    <div class="form-row" style="gap:14px;">
      <div style="flex-shrink:0;text-align:center;">
        <div id="f_klMIkon_onizleme" style="width:44px;height:44px;border-radius:50%;background:rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 4px;">${ikon}</div>
        <div id="f_klMRenk_onizleme" style="width:20px;height:20px;border-radius:50%;background:${renk};margin:0 auto;border:1px solid rgba(0,0,0,0.2);"></div>
      </div>
      <div style="flex:1;">
        <div class="form-group"><label>Simge Seç</label>${_klSeciciGridHtml('f_klMIkon','ikon',ikon)}</div>
      </div>
    </div>
    <div class="form-group"><label>Renk Seç</label>${_klSeciciGridHtml('f_klMRenk','renk',renk)}</div>
    <div class="form-group"><label>Madde Metni</label><textarea id="f_klMMetin" rows="3" placeholder="Yapılacak işin açıklaması">${escapeHtml(mevcutMetin||'')}</textarea></div>
  `;
}

function kontrolListeleriBaglantisiniKur(){
  KontrolListeleriService.listeleriDinle(v => {
    kontrolListeleri = v;
    if (document.getElementById('kontrolListeleriOverlay')) _klAnaEkraniCiz();
    if (document.getElementById('klDetayOverlay')) _klDetayCiz();
  });
}

/* ================================================================
   ANA EKRAN — Liste Listesi
   ================================================================ */
function kontrolListeleriAc(){
  const ov = document.createElement('div');
  ov.id = 'kontrolListeleriOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9400;background:var(--bg-app);overflow-y:auto;overscroll-behavior:none;';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  const yetkiVar = typeof duzenleyebilir==='function' && duzenleyebilir('kontrolListeleri');
  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-sidebar);color:var(--ink-on-dark);position:sticky;top:0;z-index:2;">
      <button class="btn btn-ghost btn-sm" onclick="kontrolListeleriKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Kapat</button>
      <div style="font-weight:700;font-size:14px;">📋 Kontrol Listeleri</div>
      <div>${yetkiVar ? `<button class="btn btn-ghost btn-sm" onclick="kontrolListesiYeniOlustur()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">➕ Yeni Liste</button>` : ''}</div>
    </div>
    <div id="klAnaGovde" style="padding:16px 16px calc(16px + env(safe-area-inset-bottom, 0px) + 90px);"></div>
  `;
  _klAnaEkraniCiz();
}
function kontrolListeleriKapat(){
  const ov = document.getElementById('kontrolListeleriOverlay');
  if (ov) ov.remove();
  document.body.classList.remove('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
}
function _klAnaEkraniCiz(){
  const govde = document.getElementById('klAnaGovde');
  if (!govde) return;
  const yetkiVar = typeof duzenleyebilir==='function' && duzenleyebilir('kontrolListeleri');

  if (!kontrolListeleri.length){
    govde.innerHTML = `<p class="empty-state">Henüz bir kontrol listesi yok.</p>` +
      (yetkiVar ? `<button class="btn btn-amber btn-sm" style="margin-top:10px;" onclick="kontrolListesiOrnekIceAktar()">⇪ "Yıl Sonu İşlemleri" Örneğini İçe Aktar</button>` : '');
    return;
  }
  govde.innerHTML = kontrolListeleri.map(l => `
    <div class="card dash-card-clickable" style="margin-bottom:10px;display:flex;align-items:center;gap:10px;" onclick="_klListeyeGit('${l.id}')">
      <span style="font-size:22px;">📋</span>
      <div style="flex:1;"><strong>${escapeHtml(l.ad)}</strong>
        <div style="font-size:12px;color:var(--ink-muted);">${(l.maddeler||[]).length} madde${l.aciklama?' · '+escapeHtml(l.aciklama):''}</div>
      </div>
      <span style="color:var(--ink-muted);">›</span>
    </div>
  `).join('') + (yetkiVar ? `<button class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="kontrolListesiOrnekIceAktar()">⇪ "Yıl Sonu İşlemleri" Örneğini İçe Aktar</button>` : '');
}
function _klListeyeGit(listeId){
  kontrolListeleriKapat();
  _klDetayAc(listeId);
}

/* ================================================================
   DETAY EKRANI — renkli/ikonlu madde listesi + öğretmenin kendi
   onay kutuları + (admin) madde ekle/sil/sırala + tamamlama özeti.
   ================================================================ */
function _klDetayAc(listeId){
  _klAcikListeId = listeId;
  const liste = kontrolListeleri.find(l=>l.id===listeId);
  if (!liste) { toast('Liste bulunamadı.'); return; }

  const ov = document.createElement('div');
  ov.id = 'klDetayOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9400;background:var(--bg-app);overflow-y:auto;overscroll-behavior:none;';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  const yetkiVar = typeof duzenleyebilir==='function' && duzenleyebilir('kontrolListeleri');
  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-sidebar);color:var(--ink-on-dark);position:sticky;top:0;z-index:2;gap:6px;">
      <button class="btn btn-ghost btn-sm" onclick="_klDetayKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Geri</button>
      <div style="font-weight:700;font-size:13px;flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(liste.ad)}</div>
      <button class="btn btn-ghost btn-sm" onclick="_klYazdir('${listeId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="Yazdır">🖨️</button>
      ${yetkiVar ? `
        <button class="btn btn-ghost btn-sm" onclick="_klOzetGosterModalAc('${listeId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="Tamamlama özeti">📊</button>
        <button class="btn btn-ghost btn-sm" onclick="_klMaddeEkleModalAc('${listeId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">➕</button>
        <button class="btn btn-ghost btn-sm" onclick="_klListeSilOnay('${listeId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;">🗑️</button>
      ` : ''}
    </div>
    <div id="klDetayOzet" style="padding:10px 16px 0;"></div>
    <div id="klDetayGovde" style="padding:12px 16px calc(24px + env(safe-area-inset-bottom, 0px) + 90px);"></div>
  `;

  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  if (ben){
    KontrolListeleriService.tamamlamaGetir(ben.id, listeId).then(doc => {
      _klTamamlanan = new Set((doc.exists && doc.data().tamamlananMaddeIdler) || []);
      _klDetayCiz();
    }).catch(()=>{ _klTamamlanan = new Set(); _klDetayCiz(); });
  } else {
    _klTamamlanan = new Set();
    _klDetayCiz();
  }
}
function _klDetayKapat(geriDonme){
  const ov = document.getElementById('klDetayOverlay');
  if (ov) ov.remove();
  _klAcikListeId = null;
  document.body.classList.remove('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
  if (geriDonme !== false) kontrolListeleriAc(); // liste-listesi ekranına dön (sadece kullanıcı "Geri" derse)
}
function _klDetayCiz(){
  const liste = kontrolListeleri.find(l=>l.id===_klAcikListeId);
  const govde = document.getElementById('klDetayGovde');
  const ozetEl = document.getElementById('klDetayOzet');
  if (!liste || !govde) return;
  const yetkiVar = typeof duzenleyebilir==='function' && duzenleyebilir('kontrolListeleri');
  const maddeler = (liste.maddeler||[]).slice().sort((a,b)=>a.sira-b.sira);

  if (ozetEl){
    const toplam = maddeler.length;
    const tamam = maddeler.filter(m=>_klTamamlanan.has(m.id)).length;
    ozetEl.innerHTML = toplam ? `<div style="font-size:12.5px;font-weight:700;color:var(--brand);">${tamam} / ${toplam} tamamlandı</div>` : '';
  }

  govde.innerHTML = maddeler.map((m,i) => {
    const tamamMi = _klTamamlanan.has(m.id);
    return `
    <div class="card" style="display:flex;align-items:center;gap:12px;margin-bottom:10px;border-left:5px solid ${m.renk||'var(--brand)'};${tamamMi?'opacity:.55;':''}">
      <div style="width:36px;height:36px;border-radius:50%;background:${m.renk||'var(--brand)'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0;">${i+1}</div>
      <div style="font-size:22px;flex-shrink:0;">${m.ikon||'📌'}</div>
      <div style="flex:1;font-size:13.5px;line-height:1.4;${tamamMi?'text-decoration:line-through;':''}">${escapeHtml(m.metin||'')}</div>
      <label style="flex-shrink:0;display:flex;align-items:center;">
        <input type="checkbox" ${tamamMi?'checked':''} onchange="_klMaddeIsaretle('${m.id}', this.checked)" style="width:22px;height:22px;accent-color:var(--brand);">
      </label>
      ${yetkiVar ? `<button class="btn btn-ghost btn-sm" onclick="_klMaddeDuzenleModalAc('${liste.id}','${m.id}')" style="flex-shrink:0;color:var(--brand);padding:4px 8px;" title="Düzenle">✏️</button>` : ''}
      ${yetkiVar ? `<button class="btn btn-ghost btn-sm" onclick="_klMaddeSilOnay('${liste.id}','${m.id}')" style="flex-shrink:0;color:#c0392b;padding:4px 8px;" title="Sil">✕</button>` : ''}
    </div>`;
  }).join('') || '<p class="empty-state">Bu listede henüz madde yok.</p>';
}
function _klMaddeIsaretle(maddeId, isaretli){
  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  if (!ben) return;
  if (isaretli) _klTamamlanan.add(maddeId); else _klTamamlanan.delete(maddeId);
  KontrolListeleriService.tamamlamaKaydet(ben.id, _klAcikListeId, Array.from(_klTamamlanan))
    .catch(err => { if (err.message!=='yetkisiz') toast('Hata: '+err.message); });
  _klDetayCiz();
}

/* ================================================================
   YAZDIRMA — liste, A4 dikey formatta okul adı başlığıyla yazdırılır.
   Diğer modüllerdeki ortak yazdırma alt yapısı (_raporOverlayOlustur +
   uygulamaHtmlYazdir) kullanılıyor: önizleme overlay'i iframe(srcdoc)
   ile açılır, "Yazdır" tuşuna basınca native (Android/Capacitor) ise
   PrintPlugin, değilse tarayıcı blob penceresi + window.print() devreye
   girer — böylece hem Android hem web'de çalışır.
   ================================================================ */
function _klYazdir(listeId){
  const liste = kontrolListeleri.find(l=>l.id===listeId);
  if (!liste) { toast('Liste bulunamadı.'); return; }
  if (typeof _raporOverlayOlustur !== 'function'){ toast('Yazdırma bileşeni yüklenemedi.'); return; }

  const okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi)
    ? okulBilgileriAyari.okulAdi : 'Koruk İlk-Ortaokulu';
  const tarih = new Date().toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'});
  const maddeler = (liste.maddeler||[]).slice().sort((a,b)=>a.sira-b.sira);
  const toplam = maddeler.length;
  const tamam = maddeler.filter(m=>_klTamamlanan.has(m.id)).length;

  const satirlar = maddeler.map((m,i) => {
    const tamamMi = _klTamamlanan.has(m.id);
    return `
      <div class="kl-yzd-satir" style="border-left-color:${m.renk||'#0A7A7A'};">
        <span class="kl-yzd-no">${i+1}</span>
        <span class="kl-yzd-ikon">${m.ikon||'📌'}</span>
        <span class="kl-yzd-metin${tamamMi?' tamam':''}">${escapeHtml(m.metin||'')}</span>
        <span class="kl-yzd-kutu">${tamamMi?'☑':'☐'}</span>
      </div>`;
  }).join('') || '<p style="color:#777;">Bu listede henüz madde yok.</p>';

  const html = `<!DOCTYPE html><html lang="tr"><head>
    <meta charset="UTF-8">
    <title>${escapeHtml(liste.ad)}</title>
    <style>
      @page{ size:A4 portrait; margin:16mm 14mm; }
      *{box-sizing:border-box;}
      body{font-family:'Segoe UI',Arial,sans-serif;font-size:12.5px;color:#111;margin:0;padding:20px;}
      h1{font-size:17px;margin:0 0 2px;text-align:center;}
      .kl-yzd-alt{font-size:11.5px;color:#555;text-align:center;margin-bottom:4px;}
      .kl-yzd-ozet{font-size:12px;font-weight:700;color:#0A7A7A;text-align:center;margin-bottom:16px;}
      .kl-yzd-satir{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #ddd;border-left-width:5px;border-left-style:solid;border-radius:4px;margin-bottom:8px;break-inside:avoid;}
      .kl-yzd-no{width:22px;height:22px;border-radius:50%;background:#0A7A7A;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
      .kl-yzd-ikon{font-size:16px;flex-shrink:0;}
      .kl-yzd-metin{flex:1;line-height:1.4;}
      .kl-yzd-metin.tamam{text-decoration:line-through;color:#777;}
      .kl-yzd-kutu{font-size:18px;flex-shrink:0;}
      @media print{ body{padding:0;} }
    </style>
  </head><body>
    <h1>${escapeHtml(okulAdi)}</h1>
    <div class="kl-yzd-alt">${escapeHtml(liste.ad)}${liste.aciklama?' · '+escapeHtml(liste.aciklama):''} · ${tarih}</div>
    ${toplam ? `<div class="kl-yzd-ozet">${tamam} / ${toplam} tamamlandı</div>` : ''}
    ${satirlar}
  </body></html>`;

  _raporOverlayOlustur(liste.ad, html);
}

/* ================================================================
   ADMİN — Liste ve Madde Yönetimi
   ================================================================ */
function _klMaddeIdUret(){ return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function kontrolListesiYeniOlustur(){
  const body = `<div class="form-group"><label>Liste Adı</label><input id="f_klAd" placeholder="örn: Yıl Başı İşlemleri"></div>
    <div class="form-group"><label>Açıklama (opsiyonel)</label><input id="f_klAciklama" placeholder="kısa açıklama"></div>`;
  modalAc('➕ Yeni Kontrol Listesi', body, () => {
    const ad = document.getElementById('f_klAd').value.trim();
    if (!ad){ toast('Liste adı zorunludur.'); return; }
    KontrolListeleriService.listeEkle({
      ad, aciklama: document.getElementById('f_klAciklama').value.trim(),
      sira: kontrolListeleri.length, maddeler: [],
    }).then(()=>toast('Liste oluşturuldu.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  });
}
function kontrolListesiOrnekIceAktar(){
  if (typeof KONTROL_LISTESI_TOHUM_VERI === 'undefined'){ toast('Tohum veri dosyası bulunamadı.'); return; }
  if (kontrolListeleri.some(l=>l.ad === KONTROL_LISTESI_TOHUM_VERI.ad)){ toast('Bu liste zaten eklenmiş.'); return; }
  const maddeler = KONTROL_LISTESI_TOHUM_VERI.maddeler.map((m,i) => ({ id:_klMaddeIdUret(), sira:i, ikon:m.ikon, renk:m.renk, metin:m.metin }));
  KontrolListeleriService.listeEkle({
    ad: KONTROL_LISTESI_TOHUM_VERI.ad, aciklama: KONTROL_LISTESI_TOHUM_VERI.aciklama,
    sira: kontrolListeleri.length, maddeler,
  }).then(()=>toast('"Yıl Sonu İşlemleri" listesi eklendi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}
function _klListeSilOnay(listeId){
  const liste = kontrolListeleri.find(l=>l.id===listeId);
  if (!liste) return;
  if (!confirm(`"${liste.ad}" listesini SİLMEK istediğinize emin misiniz? Tüm maddeler ve öğretmen işaretlemeleri kaybolur.`)) return;
  KontrolListeleriService.listeSil(listeId)
    .then(()=>{ toast('Silindi.'); _klDetayKapat(); })
    .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}
function _klMaddeEkleModalAc(listeId){
  const body = _klMaddeFormBody('📌', KL_RENK_PAKETI[0], '');
  modalAc('➕ Yeni Madde', body, () => {
    const metin = document.getElementById('f_klMMetin').value.trim();
    if (!metin){ toast('Madde metni zorunludur.'); return; }
    const liste = kontrolListeleri.find(l=>l.id===listeId);
    const maddeler = (liste.maddeler||[]).slice();
    maddeler.push({ id:_klMaddeIdUret(), sira:maddeler.length, ikon:document.getElementById('f_klMIkon').value.trim()||'📌', renk:document.getElementById('f_klMRenk').value, metin });
    KontrolListeleriService.listeGuncelle(listeId, { maddeler })
      .then(()=>toast('Madde eklendi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  });
}
function _klMaddeDuzenleModalAc(listeId, maddeId){
  const liste = kontrolListeleri.find(l=>l.id===listeId);
  if (!liste) return;
  const madde = (liste.maddeler||[]).find(m=>m.id===maddeId);
  if (!madde) return;
  const body = _klMaddeFormBody(madde.ikon, madde.renk, madde.metin);
  modalAc('✏️ Maddeyi Düzenle', body, () => {
    const metin = document.getElementById('f_klMMetin').value.trim();
    if (!metin){ toast('Madde metni zorunludur.'); return; }
    const ikon = document.getElementById('f_klMIkon').value.trim()||'📌';
    const renk = document.getElementById('f_klMRenk').value;
    const maddeler = (liste.maddeler||[]).map(m => m.id===maddeId ? { ...m, ikon, renk, metin } : m);
    KontrolListeleriService.listeGuncelle(listeId, { maddeler })
      .then(()=>toast('Madde güncellendi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  });
}
function _klMaddeSilOnay(listeId, maddeId){
  if (!confirm('Bu maddeyi silmek istediğinize emin misiniz?')) return;
  const liste = kontrolListeleri.find(l=>l.id===listeId);
  if (!liste) return;
  const maddeler = (liste.maddeler||[]).filter(m=>m.id!==maddeId).map((m,i)=>({...m, sira:i}));
  KontrolListeleriService.listeGuncelle(listeId, { maddeler })
    .then(()=>toast('Silindi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ---- Admin özeti: madde başına kaç öğretmen işaretlemiş ---- */
function _klOzetGosterModalAc(listeId){
  const liste = kontrolListeleri.find(l=>l.id===listeId);
  if (!liste) return;
  modalAc('📊 Tamamlama Özeti', '<p class="empty-state">Yükleniyor…</p>', null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
  if (_klTumTamamlamaAboneligi) { _klTumTamamlamaAboneligi(); _klTumTamamlamaAboneligi = null; }
  _klTumTamamlamaAboneligi = KontrolListeleriService.tumTamamlamalariDinle(listeId, (kayitlar) => {
    const body = document.getElementById('modalBody');
    if (!body) return;
    const maddeler = (liste.maddeler||[]).slice().sort((a,b)=>a.sira-b.sira);
    const sayaclar = {};
    maddeler.forEach(m => sayaclar[m.id] = 0);
    kayitlar.forEach(k => (k.tamamlananMaddeIdler||[]).forEach(id => { if (sayaclar[id]!==undefined) sayaclar[id]++; }));
    body.innerHTML = `
      <p style="font-size:11.5px;color:var(--ink-muted);margin-bottom:8px;">${kayitlar.length} öğretmen bu listeyle ilgili en az bir madde işaretlemiş.</p>
      ${maddeler.map((m,i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-soft);">
          <span style="font-size:16px;">${m.ikon||'📌'}</span>
          <span style="flex:1;font-size:12.5px;">${i+1}. ${escapeHtml((m.metin||'').slice(0,50))}${(m.metin||'').length>50?'…':''}</span>
          <span style="font-weight:700;color:var(--brand);font-size:12.5px;">${sayaclar[m.id]||0}</span>
        </div>`).join('')}
    `;
  });
}
