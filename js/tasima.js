/* ====================================================================
   js/tasima.js
   TAŞIMA MODÜLÜ — servis araçları, şoför adı/telefonu ve güzergah
   bilgilerinin takibi. Veri modeli (bkz. firebase-init.js COL):
     servisler : {servisAdi, guzergah, soforAdi, soforTelefon,
                  ogrenciSayisi, durum:'Aktif'|'Pasif', notlar}
   ==================================================================== */

let servisler = [];
let servisFiltre = 'tumu';

function servisDurumRengi(d){ return d==='Pasif' ? 'gray' : 'sage'; }

/* ---------- liste ---------- */
function renderServisler(){
  const hedef = document.getElementById('servislerListesi');
  if(!hedef) return;
  let liste = servisFiltre==='tumu' ? servisler : servisler.filter(s=>s.durum===servisFiltre);
  liste = [...liste].sort((a,b)=>(a.servisAdi||'').localeCompare(b.servisAdi||'','tr'));

  hedef.innerHTML = liste.length ? liste.map(s=>`
    <div class="evrak-row" style="cursor:pointer;" onclick="servisDetayAc('${s.id}')">
      <div class="evrak-body">
        <div class="evrak-title">${escapeHtml(s.servisAdi||'Servis')} <span class="badge badge-${servisDurumRengi(s.durum)}">${escapeHtml(s.durum||'Aktif')}</span></div>
        <div class="evrak-meta">
          ${s.soforAdi ? 'Şoför: '+escapeHtml(s.soforAdi) : 'Şoför bilgisi yok'}${s.soforTelefon ? ' · '+escapeHtml(s.soforTelefon) : ''}${s.guzergah ? ' · '+escapeHtml(s.guzergah) : ''}${s.ogrenciSayisi ? ' · '+s.ogrenciSayisi+' öğrenci' : ''}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); servisModalAc('${s.id}')">Düzenle</button>
    </div>
  `).join('') : '<div class="empty-state">Henüz servis aracı eklenmedi. "+ Yeni Servis" ile ekleyin.</div>';
}

function servisFiltreSec(f){
  servisFiltre = f;
  document.querySelectorAll('#tab-tasima .filtre-btn').forEach(b=>b.classList.toggle('active', b.dataset.f===f));
  renderServisler();
}

/* ---------- servis detay paneli ---------- */
function servisDetayAc(id){
  const s = servisler.find(x=>x.id===id);
  if(!s) return;

  document.getElementById('detayBaslik').textContent = s.servisAdi || 'Servis';
  document.getElementById('detayAltBaslik').textContent = [
    s.guzergah ? ('Güzergah: ' + s.guzergah) : '',
    s.durum || 'Aktif'
  ].filter(Boolean).join(' · ');
  document.getElementById('detayDuzenleBtn').onclick = ()=>{ detayPanelKapat(); servisModalAc(id); };

  const servisOgrencileri = veliler.filter(v=>v.servisId===id)
    .sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));

  const ogrenciListeHtml = servisOgrencileri.length
    ? servisOgrencileri.map(v=>{
        const sinifObj = siniflar.find(s=>s.id===v.sinifId);
        const sinifAdi = sinifObj ? sinifObj.ad : (v.sinifId||'—');
        const telefonlar = [v.telefon1||v.telefon, v.telefon2, v.telefon3].filter(Boolean).map(t=>telefonEtiketle(v,t)).join(' · ');
        return `
        <div class="detay-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <span>
            <strong>${escapeHtml(v.ogrenciAdi)}</strong>
            ${v.ogrenciNo ? ` <span class="detay-row-muted">No: ${escapeHtml(v.ogrenciNo)}</span>` : ''}
            <span class="badge badge-blue">${escapeHtml(sinifAdi)}</span>
            ${v.cinsiyet ? ` <span class="badge badge-${v.cinsiyet==='Kız'?'rose':'blue'}">${escapeHtml(v.cinsiyet)}</span>` : ''}
            <br>👤 ${escapeHtml(v.veliAdi||'—')}
            ${telefonlar ? `<br><span class="detay-row-muted">📞 ${telefonlar}</span>` : ''}
          </span>
        </div>`;
      }).join('')
    : '<p class="empty-state">Bu serviste kayıtlı öğrenci yok.</p>';

  document.getElementById('detayBody').innerHTML = `
    <div style="padding:14px 18px;">
      <div class="detay-card">
        <h4>🚌 Servis Bilgileri</h4>
        <div class="detay-row">👨‍✈️ Şoför: ${escapeHtml(s.soforAdi||'—')}${s.soforTelefon ? ' · 📞 ' + escapeHtml(s.soforTelefon) : ''}</div>
        ${s.plaka ? `<div class="detay-row">🚘 Plaka: <strong>${escapeHtml(s.plaka)}</strong></div>` : ''}
        <div class="detay-row">🗺️ Güzergah: ${escapeHtml(s.guzergah||'—')}</div>
        <div class="detay-row">Durum: <span class="badge badge-${servisDurumRengi(s.durum)}">${escapeHtml(s.durum||'Aktif')}</span></div>
        ${s.notlar ? `<div class="detay-row detay-row-muted">📝 ${escapeHtml(s.notlar)}</div>` : ''}
      </div>
      <div class="detay-card">
        <h4 class="detay-card-header">
          <span class="detay-card-title">🧑‍🎓 Servis Öğrenci Listesi (${servisOgrencileri.length})</span>
          <span class="detay-card-actions">
            <button class="btn btn-ghost btn-sm" onclick="servisOgrenciExcelIceAktarModalAc('${id}')">📥 Excel'den Ekle</button>
            <button class="btn btn-amber btn-sm" onclick="servisOgrenciEkleModalAc('${id}')">➕ Öğrenci Ekle</button>
          </span>
        </h4>
        ${ogrenciListeHtml}
      </div>
    </div>
  `;

  document.getElementById('detayOverlay').classList.add('active');
}

/* ---------- servise öğrenci ekleme modalı ---------- */
function servisOgrenciEkleModalAc(servisId){
  const s = servisler.find(x=>x.id===servisId);
  if(!s) return;

  // Sınıf seçenekleri
  const sinifSecenekleri = siniflar
    .sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'))
    .map(sn=>`<option value="${sn.id}">${escapeHtml(sn.ad)}</option>`).join('');

  const body = `
    <p style="margin:0 0 10px;color:var(--ink-muted);font-size:13px;">
      Servise eklenecek öğrencileri seçin: <strong>${escapeHtml(s.servisAdi)}</strong>
    </p>
    <div class="form-group">
      <label>Sınıf Seçin</label>
      <select id="sv_sinifSec" onchange="servisOgrenciSinifSecildi('${servisId}')">
        <option value="">— Sınıf seçin —</option>
        ${sinifSecenekleri}
      </select>
    </div>
    <div id="sv_ogrenciListeDiv" style="max-height:320px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:4px;display:none;">
    </div>
    <div id="sv_seciliSayac" style="font-size:13px;color:var(--ink-muted);margin-top:6px;"></div>
  `;

  modalAc(`Öğrenci Ekle — ${escapeHtml(s.servisAdi)}`, body, ()=>{
    const sinifId = document.getElementById('sv_sinifSec').value;
    if(!sinifId){ toast('Lütfen sınıf seçin.'); return; }
    const checkboxlar = document.querySelectorAll('#sv_ogrenciListeDiv input[type=checkbox]:checked');
    if(!checkboxlar.length){ toast('En az bir öğrenci seçin.'); return; }

    const batch = [];
    checkboxlar.forEach(cb=>{
      const vId = cb.value;
      batch.push(db.collection(COL.veliler).doc(vId).update({
        servisId: servisId,
        servisAdi: s.servisAdi
      }));
    });
    Promise.all(batch).then(()=>{
      toast(`${checkboxlar.length} öğrenci servise eklendi.`);
      modalKapat();
      servisDetayAc(servisId);
    }).catch(err=>toast('Hata: '+err.message));
  });
}

function servisOgrenciSinifSecildi(servisId){
  const sinifId = document.getElementById('sv_sinifSec').value;
  const div = document.getElementById('sv_ogrenciListeDiv');
  const sayac = document.getElementById('sv_seciliSayac');
  if(!sinifId){ div.style.display='none'; sayac.textContent=''; return; }

  const sinifOgrencileri = veliler
    .filter(v=>v.sinifId===sinifId)
    .sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));

  if(!sinifOgrencileri.length){
    div.innerHTML='<p class="empty-state" style="padding:12px;">Bu sınıfta kayıtlı öğrenci yok.</p>';
    div.style.display='block';
    return;
  }

  div.innerHTML = sinifOgrencileri.map(v=>{
    const zatenServiste = v.servisId === servisId;
    const baskaSehirde = v.servisId && v.servisId !== servisId;
    const etiketi = zatenServiste
      ? ` <span class="badge badge-sage">Bu serviste</span>`
      : baskaSehirde
        ? ` <span class="badge badge-amber">Başka serviste: ${escapeHtml(v.servisAdi||'')}</span>`
        : '';
    return `
      <label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--border);cursor:pointer;${zatenServiste?'opacity:0.5;':''}">
        <input type="checkbox" value="${v.id}" ${zatenServiste?'disabled checked':''} onchange="servisOgrenciSecimGuncelle()">
        <span>
          <strong>${escapeHtml(v.ogrenciAdi)}</strong>
          ${v.ogrenciNo ? `<span class="detay-row-muted"> No:${escapeHtml(v.ogrenciNo)}</span>` : ''}
          ${etiketi}
        </span>
      </label>`;
  }).join('');
  div.style.display = 'block';
  servisOgrenciSecimGuncelle();
}

function servisOgrenciSecimGuncelle(){
  const sayac = document.getElementById('sv_seciliSayac');
  if(!sayac) return;
  const secili = document.querySelectorAll('#sv_ogrenciListeDiv input[type=checkbox]:not(:disabled):checked').length;
  sayac.textContent = secili ? `${secili} öğrenci seçildi` : '';
}

/* ---------- Excel'den servise öğrenci aktarma modalı ---------- */
function servisOgrenciExcelIceAktarModalAc(servisId){
  const s = servisler.find(x=>x.id===servisId);
  if(!s) return;
  const body = `
    <p style="margin:0 0 10px;color:var(--ink-muted);font-size:13px;">
      Excel dosyasından <strong>${escapeHtml(s.servisAdi)}</strong> servisine öğrenci ekler.
    </p>
    <div class="form-group">
      <label>Excel Dosyası (.xlsx / .xls)</label>
      <input type="file" id="sv_excelDosya" accept=".xlsx,.xls">
    </div>
    <p style="font-size:12px;color:var(--ink-muted);margin:8px 0 0;">
      Şablon sütunları: <strong>Öğrenci Adı · Öğrenci No · Cinsiyet · Veli Adı · Yakınlık · Telefon 1 · Telefon 2 · Telefon 3 · Adres · Sınıf · Notlar</strong><br>
      Sınıf sütunundaki değer, mevcut sınıf adlarıyla eşleştirilir.
    </p>
  `;
  modalAc(`Excel'den Öğrenci Ekle — ${escapeHtml(s.servisAdi)}`, body, ()=>{
    const dosya = document.getElementById('sv_excelDosya').files[0];
    if(!dosya){ toast('Lütfen Excel dosyası seçin.'); return; }
    servisOgrenciExceliIceAktar(dosya, servisId, s.servisAdi);
    modalKapat();
    setTimeout(()=>servisDetayAc(servisId), 1500);
  });
}

/* ---------- modal ---------- */
function servisModalAc(id){
  const s = id ? servisler.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Servis Adı</label><input id="f_svAd" value="${s?escapeHtml(s.servisAdi||''):''}" placeholder="örn: 1. Servis — Mavi Güzergah"></div>
    <div class="form-group"><label>Güzergah</label><input id="f_svGuzergah" value="${s?escapeHtml(s.guzergah||''):''}" placeholder="örn: Merkez · Yeşilköy · Okul"></div>
    <div class="form-row">
      <div class="form-group"><label>Şoför Adı</label><input id="f_svSofor" value="${s?escapeHtml(s.soforAdi||''):''}"></div>
      <div class="form-group"><label>Şoför Telefonu</label><input id="f_svTel" value="${s?escapeHtml(s.soforTelefon||''):''}" placeholder="örn: 0532 000 00 00"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Plaka</label><input id="f_svPlaka" value="${s?escapeHtml(s.plaka||''):''}" placeholder="örn: 34 ABC 123" style="text-transform:uppercase;"></div>
      <div class="form-group"><label>Durum</label>
        <select id="f_svDurum">
          <option value="Aktif" ${!s||s.durum==='Aktif'?'selected':''}>Aktif</option>
          <option value="Pasif" ${s&&s.durum==='Pasif'?'selected':''}>Pasif</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>Öğrenci Sayısı</label><input id="f_svOgrenci" type="number" min="0" value="${s&&s.ogrenciSayisi!=null?s.ogrenciSayisi:0}"></div>
    <div class="form-group"><label>Notlar</label><textarea id="f_svNotlar" rows="2">${s?escapeHtml(s.notlar||''):''}</textarea></div>
  `;
  modalAc(s?'Servis Düzenle':'Yeni Servis', body, ()=>{
    const servisAdi = document.getElementById('f_svAd').value.trim();
    if(!servisAdi){ toast('Servis adı zorunludur.'); return; }
    kaydet(COL.servisler, s?s.id:null, {
      servisAdi,
      guzergah: document.getElementById('f_svGuzergah').value.trim(),
      soforAdi: document.getElementById('f_svSofor').value.trim(),
      soforTelefon: document.getElementById('f_svTel').value.trim(),
      plaka: document.getElementById('f_svPlaka').value.trim().toUpperCase(),
      ogrenciSayisi: parseInt(document.getElementById('f_svOgrenci').value)||0,
      durum: document.getElementById('f_svDurum').value,
      notlar: document.getElementById('f_svNotlar').value.trim(),
    });
    modalKapat();
  }, s ? ()=>{ if(confirm('Bu servis kaydını silmek istediğinize emin misiniz?')){ db.collection(COL.servisler).doc(s.id).delete(); modalKapat(); } } : null);
}

/* ---------- FIRESTORE BAĞLANTISI (app.js baglantilariKur içinden çağrılır) ---------- */
function tasimaBaglantilariKur(){
  db.collection(COL.servisler).onSnapshot(s=>{
    servisler = s.docs.map(d=>({id:d.id,...d.data()}));
    renderServisler();
    renderVeriSekmesi();
  }, hataGoster);
}
