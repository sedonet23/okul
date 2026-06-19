// SOSYAL KULÜP VE KURULLAR ÇİZELGESİ MOTORU
let kulüpListesi = dbMock.get('kulup_listesi', ["Kütüphanecilik Kulübü", "Yeşilay Kulübü", "Spor ve İzcilik Kulübü", "Tiyatro Kulübü"]);
let cizelgelerVeri = dbMock.get('cizelgeler_veri', {}); // Yapı: { 'Kulüp Adı': { 'ogr_id': {kulup: true, sok: false...} } }

function initCizelgeModulu() {
    const select = document.getElementById('cizelge-kulup-select');
    if (!select) return;
    
    select.innerHTML = '';
    kulüpListesi.forEach(k => {
        select.innerHTML += `<option value="${k}">${k}</option>`;
    });

    loadKulupTablosu();
}

function loadKulupTablosu() {
    const kulupAdi = document.getElementById('cizelge-kulup-select').value;
    const tbody = document.getElementById('kulup-etkinlik-body');
    if (!tbody || !kulupAdi) return;

    tbody.innerHTML = ogretmenler.length === 0 ? `<tr><td colspan="5" class="text-center">Öğretmen listesi boş olduğu için çizelge oluşturulamadı.</td></tr>` : '';
    
    if(!cizelgelerVeri[kulupAdi]) cizelgelerVeri[kulupAdi] = {};

    ogretmenler.forEach(o => {
        const d = cizelgelerVeri[kulupAdi][o.id] || { kulup: false, sok: false, zumre: false, maarif: false };
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="sticky-col">
                <div class="cz-rowlabel">
                    <strong>${o.ad}</strong>
                    <span class="cz-subtext">${o.brans}</span>
                </div>
            </td>
            <td>
                <input type="checkbox" ${d.kulup ? 'checked' : ''} onchange="updateCizelgeHucresi('${kulupAdi}', '${o.id}', 'kulup', this.checked)">
            </td>
            <td>
                <input type="checkbox" ${d.sok ? 'checked' : ''} onchange="updateCizelgeHucresi('${kulupAdi}', '${o.id}', 'sok', this.checked)">
            </td>
            <td>
                <input type="checkbox" ${d.zumre ? 'checked' : ''} onchange="updateCizelgeHucresi('${kulupAdi}', '${o.id}', 'zumre', this.checked)">
            </td>
            <td>
                <input type="checkbox" ${d.maarif ? 'checked' : ''} onchange="updateCizelgeHucresi('${kulupAdi}', '${o.id}', 'maarif', this.checked)">
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateCizelgeHucresi(kulupAdi, ogrId, alan, deger) {
    if(!cizelgelerVeri[kulupAdi]) cizelgelerVeri[kulupAdi] = {};
    if(!cizelgelerVeri[kulupAdi][ogrId]) cizelgelerVeri[kulupAdi][ogrId] = { kulup: false, sok: false, zumre: false, maarif: false };
    
    cizelgelerVeri[kulupAdi][ogrId][alan] = deger;
    dbMock.set('cizelgeler_veri', cizelgelerVeri);
}
      .catch(err=>toast('Eklenemedi: '+err.message));
  }, null);
}

function cizelgeSatirSil(tip, id){
  if(!confirm('Bu satırı silmek istediğinize emin misiniz?')) return;
  db.collection(COL[tip]).doc(id).delete()
    .then(()=>toast('Satır silindi.'))
    .catch(err=>toast('Silinemedi: '+err.message));
}

/* ============== BELİRLİ GÜN VE HAFTALAR ============== */
function renderBelirliGunler(){
  const hedef = document.getElementById('belirliGunlerTablo');
  if(!hedef) return;
  if(belirliGunlerListesi.length === 0){
    hedef.innerHTML = `<div class="empty-state">Henüz etkinlik eklenmedi.</div>`;
    return;
  }
  const gruplar = {};
  const siraNo = [...belirliGunlerListesi].sort((a,b)=>(a.sira||0)-(b.sira||0));
  siraNo.forEach(e=>{
    const grup = e.ayGrubu || 'DİĞER';
    (gruplar[grup] = gruplar[grup]||[]).push(e);
  });
  let html = '';
  Object.keys(gruplar).forEach(grup=>{
    html += `<div class="bgh-ay-baslik">${escapeHtml(grup)}</div>`;
    gruplar[grup].forEach(e=>{
      html += `<div class="bgh-row">
        <div class="cz-check ${e.tamamlandi?'on':''}" onclick="belirliGunToggle('${e.id}',${!e.tamamlandi})">${e.tamamlandi?'✓':''}</div>
        <div class="bgh-main">
          <div class="bgh-title">${escapeHtml(e.baslik)}</div>
          <div class="bgh-meta">${escapeHtml(e.tarih||'')}${e.gorevliOgretmen?' · '+escapeHtml(e.gorevliOgretmen):''}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="belirliGunModalAc('${e.id}')">Düzenle</button>
      </div>`;
    });
  });
  hedef.innerHTML = html;
}
function belirliGunToggle(id, deger){
  db.collection(COL.belirliGunler).doc(id).update({tamamlandi:deger}).catch(err=>toast('Hata: '+err.message));
}
function belirliGunModalAc(id){
  const e = id ? belirliGunlerListesi.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Başlık</label><input id="f_bghBaslik" value="${e?escapeHtml(e.baslik):''}" placeholder="örn: Cumhuriyet Bayramı"></div>
    <div class="form-group"><label>Tarih / Dönem</label><input id="f_bghTarih" value="${e?escapeHtml(e.tarih||''):''}" placeholder="örn: 29 Ekim ya da 'Ekim ayının 3. haftası'"></div>
    <div class="form-group"><label>Ay Grubu</label><input id="f_bghAyGrubu" value="${e?escapeHtml(e.ayGrubu||''):''}" placeholder="örn: EKİM"></div>
    <div class="form-group"><label>Görevli Öğretmen(ler)</label><input id="f_bghGorevli" value="${e?escapeHtml(e.gorevliOgretmen||''):''}"></div>
  `;
  modalAc(e?'Etkinliği Düzenle':'Yeni Etkinlik', body, ()=>{
    const baslik = document.getElementById('f_bghBaslik').value.trim();
    if(!baslik){ toast('Başlık zorunludur.'); return; }
    const veri = {
      baslik, tarih: document.getElementById('f_bghTarih').value.trim(),
      ayGrubu: document.getElementById('f_bghAyGrubu').value.trim().toLocaleUpperCase('tr'),
      gorevliOgretmen: document.getElementById('f_bghGorevli').value.trim()
    };
    const islem = e ? db.collection(COL.belirliGunler).doc(e.id).update(veri)
                     : db.collection(COL.belirliGunler).add({...veri, tamamlandi:false, sira: belirliGunlerListesi.length+1});
    islem.then(()=>{ toast('Kaydedildi.'); modalKapat(); }).catch(err=>toast('Hata: '+err.message));
  }, e ? ()=>{ if(confirm('Bu etkinliği silmek istiyor musunuz?')){ db.collection(COL.belirliGunler).doc(e.id).delete(); modalKapat(); } } : null);
}

/* ============== DİĞER EVRAKLAR ============== */
function renderDigerEvrak(){
  const hedef = document.getElementById('digerEvrakTablo');
  if(!hedef) return;
  if(digerEvrakListesi.length === 0){
    hedef.innerHTML = `<div class="empty-state">Henüz evrak kaydı yok.</div>`;
    return;
  }
  const liste = [...digerEvrakListesi].sort((a,b)=>(b.tarih||'').localeCompare(a.tarih||''));
  hedef.innerHTML = liste.map(e=>`
    <div class="evrak-row">
      <div class="cz-check ${e.teslimEdildi?'on':''}" onclick="digerEvrakToggle('${e.id}',${!e.teslimEdildi})" title="Teslim edildi mi?">${e.teslimEdildi?'✓':''}</div>
      <div class="evrak-body">
        <div class="evrak-title">${escapeHtml(e.evrakTuru||'Evrak')} <span class="badge badge-gray">${escapeHtml(e.sinif||'—')}</span></div>
        <div class="evrak-meta">${escapeHtml(e.ogretmen||'—')} · ${formatTarih(e.tarih)}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="digerEvrakModalAc('${e.id}')">Düzenle</button>
    </div>
  `).join('');
}
function digerEvrakToggle(id, deger){
  db.collection(COL.digerEvrak).doc(id).update({teslimEdildi:deger}).catch(err=>toast('Hata: '+err.message));
}
function digerEvrakModalAc(id){
  const e = id ? digerEvrakListesi.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Öğretmen</label><input id="f_deOgretmen" value="${e?escapeHtml(e.ogretmen):''}"></div>
    <div class="form-group"><label>Evrak Çeşidi</label><input id="f_deTuru" value="${e?escapeHtml(e.evrakTuru):''}" placeholder="örn: Veli Toplantı Tutanağı"></div>
    <div class="form-group"><label>Sınıf</label><input id="f_deSinif" value="${e?escapeHtml(e.sinif||''):''}" placeholder="örn: 5-A"></div>
    <div class="form-group"><label>Tarih</label><input type="date" id="f_deTarih" value="${e?e.tarih:todayISO()}"></div>
  `;
  modalAc(e?'Evrakı Düzenle':'Yeni Evrak', body, ()=>{
    const ogretmen = document.getElementById('f_deOgretmen').value.trim();
    const evrakTuru = document.getElementById('f_deTuru').value.trim();
    if(!ogretmen || !evrakTuru){ toast('Öğretmen ve evrak çeşidi zorunludur.'); return; }
    const veri = { ogretmen, evrakTuru, sinif: document.getElementById('f_deSinif').value.trim(), tarih: document.getElementById('f_deTarih').value };
    const islem = e ? db.collection(COL.digerEvrak).doc(e.id).update(veri)
                     : db.collection(COL.digerEvrak).add({...veri, teslimEdildi:true});
    islem.then(()=>{ toast('Kaydedildi.'); modalKapat(); }).catch(err=>toast('Hata: '+err.message));
  }, e ? ()=>{ if(confirm('Bu evrak kaydını silmek istiyor musunuz?')){ db.collection(COL.digerEvrak).doc(e.id).delete(); modalKapat(); } } : null);
}
