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
  ov.style.cssText = 'position:fixed;inset:0;z-index:9400;background:var(--bg-app);overflow-y:auto;overscroll-behavior:contain;';
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
    <div id="klAnaGovde" style="padding:16px;"></div>
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
  ov.style.cssText = 'position:fixed;inset:0;z-index:9400;background:var(--bg-app);overflow-y:auto;overscroll-behavior:contain;';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  const yetkiVar = typeof duzenleyebilir==='function' && duzenleyebilir('kontrolListeleri');
  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-sidebar);color:var(--ink-on-dark);position:sticky;top:0;z-index:2;gap:6px;">
      <button class="btn btn-ghost btn-sm" onclick="_klDetayKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Geri</button>
      <div style="font-weight:700;font-size:13px;flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(liste.ad)}</div>
      ${yetkiVar ? `
        <button class="btn btn-ghost btn-sm" onclick="_klOzetGosterModalAc('${listeId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="Tamamlama özeti">📊</button>
        <button class="btn btn-ghost btn-sm" onclick="_klMaddeEkleModalAc('${listeId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">➕</button>
        <button class="btn btn-ghost btn-sm" onclick="_klListeSilOnay('${listeId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;">🗑️</button>
      ` : ''}
    </div>
    <div id="klDetayOzet" style="padding:10px 16px 0;"></div>
    <div id="klDetayGovde" style="padding:12px 16px 24px;"></div>
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
      ${yetkiVar ? `<button class="btn btn-ghost btn-sm" onclick="_klMaddeSilOnay('${liste.id}','${m.id}')" style="flex-shrink:0;color:#c0392b;padding:4px 8px;">✕</button>` : ''}
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
  const RENKLER = ['#1E88E5','#43A047','#FB8C00','#8E24AA','#00897B','#D81B60','#FFB300','#7E57C2'];
  const body = `
    <div class="form-row">
      <div class="form-group" style="flex:0 0 80px;"><label>İkon</label><input id="f_klMIkon" value="📌" style="font-size:20px;text-align:center;"></div>
      <div class="form-group"><label>Renk</label>
        <select id="f_klMRenk">${RENKLER.map(r=>`<option value="${r}" style="background:${r};">${r}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group"><label>Madde Metni</label><textarea id="f_klMMetin" rows="3" placeholder="Yapılacak işin açıklaması"></textarea></div>
  `;
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
