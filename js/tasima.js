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
    <div class="evrak-row">
      <div class="evrak-body">
        <div class="evrak-title">${escapeHtml(s.servisAdi||'Servis')} <span class="badge badge-${servisDurumRengi(s.durum)}">${escapeHtml(s.durum||'Aktif')}</span></div>
        <div class="evrak-meta">
          ${s.soforAdi ? 'Şoför: '+escapeHtml(s.soforAdi) : 'Şoför bilgisi yok'}${s.soforTelefon ? ' · '+escapeHtml(s.soforTelefon) : ''}${s.guzergah ? ' · '+escapeHtml(s.guzergah) : ''}${s.ogrenciSayisi ? ' · '+s.ogrenciSayisi+' öğrenci' : ''}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="servisModalAc('${s.id}')">Düzenle</button>
    </div>
  `).join('') : '<div class="empty-state">Henüz servis aracı eklenmedi. "+ Yeni Servis" ile ekleyin.</div>';
}

function servisFiltreSec(f){
  servisFiltre = f;
  document.querySelectorAll('#tab-tasima .filtre-btn').forEach(b=>b.classList.toggle('active', b.dataset.f===f));
  renderServisler();
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
      <div class="form-group"><label>Öğrenci Sayısı</label><input id="f_svOgrenci" type="number" min="0" value="${s&&s.ogrenciSayisi!=null?s.ogrenciSayisi:0}"></div>
      <div class="form-group"><label>Durum</label>
        <select id="f_svDurum">
          <option value="Aktif" ${!s||s.durum==='Aktif'?'selected':''}>Aktif</option>
          <option value="Pasif" ${s&&s.durum==='Pasif'?'selected':''}>Pasif</option>
        </select>
      </div>
    </div>
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
  }, hataGoster);
}
