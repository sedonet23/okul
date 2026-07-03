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
  if(!duyurular.length){ hedef.innerHTML = '<p class="empty-state">Henüz duyuru eklenmedi.</p>'; return; }
  hedef.innerHTML = duyurular.map(d=>{
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

function duyuruOkunduIsaretleTikla(id){
  DuyurularService.okunduIsaretle(id).catch(err=>{ if(err.message!=='kimlik-yok') toast('Hata: '+err.message); });
}

/* ---------- Ekle / Düzenle ---------- */
function duyuruModalAc(id){
  const d = id ? duyurular.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Başlık</label><input id="f_duyuruBaslik" value="${escapeHtml(d?d.baslik:'')}" style="width:100%;" autofocus></div>
    <div class="form-group"><label>İçerik</label><textarea id="f_duyuruIcerik" rows="5" style="width:100%;">${escapeHtml(d?d.icerik:'')}</textarea></div>
  `;
  modalAc(d?'Duyuruyu Düzenle':'📢 Yeni Duyuru', body, ()=>{
    const baslik = document.getElementById('f_duyuruBaslik').value.trim();
    const icerik = document.getElementById('f_duyuruIcerik').value.trim();
    if(!baslik){ toast('Başlık zorunludur.'); return; }
    DuyurularService.duyuruKaydet(id||null, { baslik, icerik })
      .then(()=>{ toast('Kaydedildi.'); modalKapat(); })
      .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
  }, d ? ()=>{ if(confirm('Bu duyuruyu silmek istediğinize emin misiniz?')){ DuyurularService.duyuruSil(id).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }); modalKapat(); } } : null);
}

/* ---------- Anasayfa Duyuru Panosu kartı ----------
   Okunmamış duyurular ikonlu + yanıp sönen rozetle, "Okudum" butonuyla
   gösterilir. Okununca yanıp sönme durur, "✓ Okundu" görünür. */
function renderDuyuruPanosu(){
  const kart = document.getElementById('duyuruPanosuKart');
  const icerik = document.getElementById('duyuruPanosuIcerik');
  if(!kart || !icerik) return;
  if(!duyurular.length){ kart.style.display='none'; return; }
  kart.style.display = '';
  const gosterilecekler = duyurular.slice(0,5);
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
