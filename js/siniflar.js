/* ====================================================================
   js/siniflar.js
   SINIFLAR MODÜLÜ — UI KATMANI
   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya)          → sadece DOM + SiniflarService çağrısı, db bilmez
     js/core/services/siniflar.service.js    → iş kuralı + yetki kontrolü
     js/core/repositories/siniflar.repository.js → TEK Firestore erişim noktası
   ==================================================================== */

let siniflar = [];
let veliler = [];
let detaySinifId = null;
let detaySinifSekme = 'bilgi';

/* ---------- FIRESTORE BAĞLANTILARI (app.js baglantilariKur içinden çağrılır) ----------
   Artık doğrudan db.collection() çağrılmıyor — SiniflarRepository üzerinden dinleniyor. */
function sinifBaglantilariKur(){
  SiniflarRepository.siniflariDinle(v=>{
    siniflar = v;
    renderSiniflar(); renderDersGrid(); renderDashboard(); renderVeriSekmesi();
    if(detaySinifId){ const sn=siniflar.find(x=>x.id===detaySinifId); if(sn) sinifDetayBilgiRender(sn); }
    if(typeof globalAramaYap==='function') globalAramaYap();
    onbellekKaydet();
  });
  SiniflarRepository.velileriDinle(v=>{
    veliler = v;
    if(detaySinifId){ const sn=siniflar.find(x=>x.id===detaySinifId); if(sn){ sinifDetayBilgiRender(sn); sinifDetayOgrenciRender(sn); } }
    if(typeof renderOgrenciler==='function') renderOgrenciler();
    if(typeof globalAramaYap==='function') globalAramaYap();
    onbellekKaydet();
  });
}

function sinifAdiSirala(a,b){ return String(a.ad||'').localeCompare(String(b.ad||''), 'tr'); }

function sinifBul(ad){ return siniflar.find(s=>s.ad===ad); }
function sinifOgretmeniAdi(sinif){
  if(!sinif || !sinif.sinifOgretmeniId) return '—';
  return ogretmenAdi(sinif.sinifOgretmeniId);
}

/* ---------- liste ---------- */
function renderSiniflar(){
  const tbody = document.getElementById('siniflarTablo');
  if(!tbody) return;
  const aramaEl = document.getElementById('sinifArama');
  const arama = (aramaEl ? aramaEl.value : '').toLocaleLowerCase('tr');
  let liste = siniflar.filter(s => !arama || (s.ad+' '+(s.seviye||'')+' '+(s.derslik||'')).toLocaleLowerCase('tr').includes(arama));
  liste.sort(sinifAdiSirala);
  tbody.innerHTML = liste.length ? liste.map(s=>`
    <tr class="row-clickable" onclick="sinifDetayAc('${s.id}')">
      <td>${escapeHtml(s.ad)}</td>
      <td>${escapeHtml(s.seviye||'—')}</td>
      <td>${escapeHtml(sinifOgretmeniAdi(s))}</td>
      <td>${s.ogrenciSayisi||0}</td>
      <td>${s.kizSayisi||0}</td>
      <td>${s.erkekSayisi||0}</td>
      <td>${escapeHtml(s.derslik||'—')}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); sinifModalAc('${s.id}')">Düzenle</button></td>
    </tr>`).join('') : `<tr><td colspan="8" class="empty-state">Henüz sınıf eklenmedi.</td></tr>`;

  const ozetEl = document.getElementById('siniflarOzet');
  if(ozetEl){
    const toplamOgrenci = siniflar.reduce((t,s)=>t+(parseInt(s.ogrenciSayisi)||0),0);
    ozetEl.textContent = `${siniflar.length} sınıf · ${toplamOgrenci} öğrenci`;
  }
}

/* ---------- modal ---------- */
function sinifModalAc(id){
  const s = id ? siniflar.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Sınıf Adı</label><input id="f_sAd" value="${s?escapeHtml(s.ad):''}" placeholder="örn: 5-A" oninput="var v=this.value.trim(); var d=document.getElementById('f_sDerslik'); if(!d.dataset.edited) d.value=v;"></div>
    <div class="form-row">
      <div class="form-group"><label>Seviye</label><select id="f_sSeviye"><option value="">—</option>${[1,2,3,4,5,6,7,8].map(n=>`<option value="${n}" ${s&&s.seviye==n?"selected":""}>${n}</option>`).join("")}</select></div>
      <div class="form-group"><label>Derslik</label><input id="f_sDerslik" value="${s?escapeHtml(s.derslik||s.ad||''): ''}" placeholder="örn: 5-A veya B Blok" oninput="this.dataset.edited='1'"></div>
    </div>
    <div class="form-group"><label>Sınıf Öğretmeni</label><select id="f_sOgretmen">${ogretmenSecenekleri(s?s.sinifOgretmeniId:'')}</select></div>
    <div class="form-row">
      <div class="form-group"><label>Kız Öğrenci</label><input id="f_sKiz" type="number" min="0" value="${s&&s.kizSayisi!=null?s.kizSayisi:0}"></div>
      <div class="form-group"><label>Erkek Öğrenci</label><input id="f_sErkek" type="number" min="0" value="${s&&s.erkekSayisi!=null?s.erkekSayisi:0}"></div>
    </div>
    <div class="form-group"><label>Notlar</label><textarea id="f_sNotlar" rows="2">${s?escapeHtml(s.notlar||''):''}</textarea></div>
  `;
  modalAc(s?'Sınıf Düzenle':'Yeni Sınıf', body, ()=>{
    const ad = document.getElementById('f_sAd').value.trim();
    if(!ad){ toast('Sınıf adı zorunludur.'); return; }
    if(!SiniflarService.adBenzersizMi(siniflar, ad, s?s.id:null)){ toast('Bu isimde bir sınıf zaten var.'); return; }
    const kiz = parseInt(document.getElementById('f_sKiz').value)||0;
    const erkek = parseInt(document.getElementById('f_sErkek').value)||0;
    SiniflarService.sinifKaydet(s?s.id:null, {
      ad,
      seviye: document.getElementById('f_sSeviye').value,
      derslik: document.getElementById('f_sDerslik').value.trim(),
      sinifOgretmeniId: document.getElementById('f_sOgretmen').value,
      kizSayisi: kiz,
      erkekSayisi: erkek,
      ogrenciSayisi: kiz+erkek,
      notlar: document.getElementById('f_sNotlar').value.trim(),
    }).then(()=>toast('Kaydedildi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  }, s ? ()=>{ if(confirm('Bu sınıfı silmek istediğinize emin misiniz? (Ders programındaki kayıtlar silinmez.)')){ SiniflarService.sinifSil(s.id).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }); modalKapat(); } } : null);
}

/* ---------- detay panel sekme ---------- */
function sinifDetaySekmeAc(sekme){
  detaySinifSekme = sekme;
  document.querySelectorAll('#detayBody .detay-tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.sekme===sekme));
  document.querySelectorAll('#detayBody .detay-tab-panel').forEach(p=>p.classList.toggle('active', p.dataset.sekme===sekme));
}

/* ---------- sınıf detay paneli ---------- */
function sinifDetayAc(id){
  const s = siniflar.find(x=>x.id===id);
  if(!s) return;
  detaySinifId = id;
  detaySinifSekme = 'bilgi';

  document.getElementById('detayBaslik').textContent = s.ad;
  document.getElementById('detayAltBaslik').textContent = [s.seviye?('Seviye '+s.seviye):'', s.derslik].filter(Boolean).join(' · ') || 'Sınıf';
  document.getElementById('detayDuzenleBtn').onclick = ()=>{ detayPanelKapat(); sinifModalAc(id); };

  document.getElementById('detayBody').innerHTML = `
    <div class="detay-tabs">
      <button class="detay-tab-btn active" data-sekme="bilgi" onclick="sinifDetaySekmeAc('bilgi')">Bilgiler</button>
      <button class="detay-tab-btn" data-sekme="ders" onclick="sinifDetaySekmeAc('ders')">Ders Programı</button>
      <button class="detay-tab-btn" data-sekme="ogrenci" onclick="sinifDetaySekmeAc('ogrenci')">Öğrenciler</button>
    </div>
    <div style="padding:14px 18px;">
      <div class="detay-tab-panel active" data-sekme="bilgi" id="sinifDetayBilgi"></div>
      <div class="detay-tab-panel" data-sekme="ders" id="sinifDetayDers"></div>
      <div class="detay-tab-panel" data-sekme="ogrenci" id="sinifDetayOgrenci"></div>
    </div>
  `;

  sinifDetayBilgiRender(s);
  sinifDetayDersRender(s);
  sinifDetayOgrenciRender(s);

  /* ← PANEL AÇMA — bu satır eksikti */
  document.getElementById('detayOverlay').classList.add('active'); document.body.classList.add('modal-open');
  if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);
  if(typeof saltOkumaDetayUygula === 'function') saltOkumaDetayUygula('siniflar');
}

/* ---------- bilgi sekmesi ---------- */
function sinifDetayBilgiRender(s){
  const ogrenciler = veliler.filter(v=>v.sinifId===s.id);
  const gercekKiz   = ogrenciler.filter(v=>v.cinsiyet==='Kız').length;
  const gercekErkek = ogrenciler.filter(v=>v.cinsiyet==='Erkek').length;
  const toplamOgrenci = ogrenciler.length;

  document.getElementById('sinifDetayBilgi').innerHTML = `
    <div class="detay-card">
      <h4>📋 Temel Bilgiler</h4>
      <div class="detay-row">👩‍🏫 Sınıf Öğretmeni: <strong>${escapeHtml(sinifOgretmeniAdi(s))}</strong></div>
      <div class="detay-row">🏫 Derslik: ${escapeHtml(s.derslik||'—')}</div>
      <div class="detay-row">
        Öğrenci: <strong>${toplamOgrenci}</strong> &nbsp;·&nbsp;
        Kız: <strong style="color:#c0392b;">${gercekKiz}</strong> &nbsp;·&nbsp;
        Erkek: <strong style="color:#2980b9;">${gercekErkek}</strong>
        ${toplamOgrenci !== (s.ogrenciSayisi||0) ? `<span style="font-size:12px;color:var(--ink-muted);"> (kayıt: ${s.ogrenciSayisi||0})</span>` : ''}
      </div>
      ${s.notlar?`<div class="detay-row detay-row-muted">📝 ${escapeHtml(s.notlar)}</div>`:''}
    </div>
    <div class="detay-card">
      <h4 class="detay-card-header">
        <span class="detay-card-title">🧑‍🎓 Öğrenci Listesi (${toplamOgrenci})</span>
        <span class="detay-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="sinifOgrenciExcelModalAc('${s.id}')">📥 Excel'den Ekle</button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('eOkulBilgiInput_${s.id}').click()">📋 e-Okul Aktar</button>
          <input type="file" id="eOkulBilgiInput_${s.id}" accept=".xlsx,.xls" style="display:none;" onchange="eOkulListesiOku(this.files[0], '${s.id}'); this.value='';">
          <button class="btn btn-amber btn-sm" onclick="sinifVeliModalAc()">➕ Öğrenci Ekle</button>
          <button class="btn btn-ghost btn-sm" onclick="SinifOturma.ac('${s.id}')">🗺️ Oturma Planı</button>
        </span>
      </h4>
      ${ogrenciler.length ? ogrenciler.sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr')).map(v=>`
        <div class="detay-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer;" onclick="ogrenciDetayModalAc('${v.id}')">
          <span>
            <strong>${escapeHtml(v.ogrenciAdi)}</strong>
            ${v.ogrenciNo?`<span class="detay-row-muted"> No:${escapeHtml(v.ogrenciNo)}</span>`:''}
            ${v.cinsiyet?`<span class="badge badge-${v.cinsiyet==='Kız'?'rose':'blue'}">${escapeHtml(v.cinsiyet)}</span>`:''}
            ${v.servisAdi?`<span class="badge badge-amber">🚌 ${escapeHtml(v.servisAdi)}</span>`:''}
            ${v.kulupAdi?`<span class="badge badge-sage badge-kulup" title="${escapeHtml(v.kulupAdi)}">🎗️ <span class="badge-kulup-metin">${escapeHtml(v.kulupAdi)}</span></span>`:''}
            <br><span style="font-size:12px;color:var(--ink-muted);">${escapeHtml(v.veliAdi||'—')}</span>
          </span>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); sinifVeliModalAc('${v.id}')">Düzenle</button>
        </div>`).join('')
      : '<p class="empty-state">Henüz öğrenci eklenmedi.</p>'}
    </div>
  `;
}

/* ---------- ders sekmesi ---------- */
function sinifDetayDersRender(s){
  const dersleri = dersProgrami.filter(d=>d.sinif===s.ad).sort((a,b)=> GUNLER.indexOf(a.gun)-GUNLER.indexOf(b.gun) || a.saat-b.saat);
  const html = dersleri.length ? dersleri.map(d=>
    `<div class="detay-row"><span class="badge badge-blue">${escapeHtml(d.gun)} · ${d.saat}.</span> ${escapeHtml(d.ders)} <span class="detay-row-muted">(${escapeHtml(ogretmenAdi(d.ogretmenId))})</span></div>`
  ).join('') : '<p class="empty-state">Bu sınıf için ders programı girilmemiş.</p>';
  document.getElementById('sinifDetayDers').innerHTML = `<div class="detay-card"><h4>Haftalık Ders Programı</h4>${html}</div>`;
}

/* ---------- öğrenci sekmesi (tam liste + filtre) ---------- */
function sinifDetayOgrenciRender(s){
  const ogrenciler = veliler.filter(v=>v.sinifId===s.id)
    .sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));

  const html = ogrenciler.length ? ogrenciler.map(v=>{
    const telefonlar = [v.telefon1||v.telefon, v.telefon2, v.telefon3].filter(Boolean).map(t=>telefonEtiketle(v,t)).join(' · ');
    return `
    <div class="detay-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer;" onclick="ogrenciDetayModalAc('${v.id}')">
      <span>
        <strong>${escapeHtml(v.ogrenciAdi)}</strong>
        ${v.ogrenciNo?`<span class="detay-row-muted"> No:${escapeHtml(v.ogrenciNo)}</span>`:''}
        ${v.cinsiyet?`<span class="badge badge-${v.cinsiyet==='Kız'?'rose':'blue'}">${escapeHtml(v.cinsiyet)}</span>`:''}
        ${v.servisAdi?`<span class="badge badge-amber">🚌 ${escapeHtml(v.servisAdi)}</span>`:''}
        <br><span style="font-size:12px;color:var(--ink-muted);">${escapeHtml(v.veliAdi||'—')}${v.yakinlik?' ('+escapeHtml(v.yakinlik)+')':''}</span>
        ${telefonlar?`<br><span style="font-size:12px;color:var(--ink-muted);">📞 ${telefonlar}</span>`:''}
      </span>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); sinifVeliModalAc('${v.id}')">Düzenle</button>
    </div>`;
  }).join('') : '<p class="empty-state">Henüz öğrenci eklenmedi.</p>';

  document.getElementById('sinifDetayOgrenci').innerHTML = `
    <div class="detay-card">
      <h4 class="detay-card-header">
        <span class="detay-card-title">🧑‍🎓 Öğrenci Listesi (${ogrenciler.length})</span>
        <span class="detay-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="sinifOgrenciExcelModalAc('${s.id}')">📥 Excel'den Ekle</button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('eOkulOgrInput_${s.id}').click()">📋 e-Okul Aktar</button>
          <input type="file" id="eOkulOgrInput_${s.id}" accept=".xlsx,.xls" style="display:none;" onchange="eOkulListesiOku(this.files[0], '${s.id}'); this.value='';">
          <button class="btn btn-amber btn-sm" onclick="sinifVeliModalAc()">➕ Öğrenci Ekle</button>
          <button class="btn btn-ghost btn-sm" onclick="sinifListeOlusturModalAc('${s.id}')">📋 Liste Oluştur</button>
        </span>
      </h4>
      ${html}
    </div>
  `;
}

/* ---------- Excel'den öğrenci ekleme modalı ---------- */
function sinifOgrenciExcelModalAc(sinifId){
  const s = siniflar.find(x=>x.id===sinifId);
  if(!s) return;
  const body = `
    <p style="margin:0 0 10px;color:var(--ink-muted);font-size:13px;">
      <strong>${escapeHtml(s.ad)}</strong> sınıfına Excel'den öğrenci ekler.
    </p>
    <div class="form-group">
      <label>Excel Dosyası (.xlsx / .xls)</label>
      <input type="file" id="sinif_excelDosya" accept=".xlsx,.xls">
    </div>
    <p style="font-size:12px;color:var(--ink-muted);margin:8px 0 0;">
      Sütunlar: <strong>Öğrenci Adı · Öğrenci No · Cinsiyet · Veli Adı · Yakınlık · Telefon 1 · Telefon 2 · Telefon 3 · Adres · Servis · Notlar</strong>
    </p>
  `;
  modalAc(`Excel'den Öğrenci Ekle — ${escapeHtml(s.ad)}`, body, async ()=>{
    const dosya = document.getElementById('sinif_excelDosya').files[0];
    if(!dosya){ toast('Lütfen Excel dosyası seçin.'); return; }
    modalKapat();
    await ogrenciVeliExceliIceAktar(dosya, sinifId);
    const sGuncel = siniflar.find(x=>x.id===sinifId);
    if(sGuncel) { sinifDetayBilgiRender(sGuncel); sinifDetayOgrenciRender(sGuncel); }
  });
}

const VELI_YAKINLIK_SECENEKLERI = ['Anne', 'Baba', 'Diğer'];

/* Öğrenci formundaki "Sosyal Kulüp" seçeneklerini, verilen sınıfa göre
   uygun (aktif + sınıf kısıtı uyan, ya da öğrencinin zaten sahip olduğu)
   kulüplerle üretir. Sınıf dropdown'ı değiştiğinde de yeniden çağrılır. */
function _kulupSecenekleriHtml(sinifId, v){
  const secenekler = (typeof cizelgeVerileri!=='undefined'?cizelgeVerileri.sosyalKulupler:[])
    .filter(k=>(k.aktif!==false && (!k.sinifIdler||!k.sinifIdler.length||k.sinifIdler.includes(sinifId))) || (v&&v.kulupId===k.id))
    .sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'));
  return `<option value="">— Kulüp seçilmedi —</option>` +
    secenekler.map(k=>`<option value="${k.id}" ${v&&v.kulupId===k.id?'selected':''}>${escapeHtml(k.ad)}</option>`).join('');
}
function _kulupSecenekleriYenile(){
  const sinifSel = document.getElementById('f_vSinif');
  const kulupSel = document.getElementById('f_vKulup');
  if(!sinifSel || !kulupSel) return;
  const oncekiSecim = kulupSel.value;
  kulupSel.innerHTML = _kulupSecenekleriHtml(sinifSel.value || null, null);
  // Kullanıcının az önce seçtiği kulüp yeni sınıf için de uygunsa koru.
  if(oncekiSecim && Array.from(kulupSel.options).some(o=>o.value===oncekiSecim)) kulupSel.value = oncekiSecim;
}
function sinifVeliModalAc(id){
  const v = id ? veliler.find(x=>x.id===id) : null;
  // DÜZELTME: Bu formda ŞİMDİYE KADAR bir "Sınıf" alanı YOKTU — kayıt hep
  // sessizce global detaySinifId'ye yazılıyordu. Bu, sınıf detayının
  // İÇİNDEN açılınca doğru çalışıyordu ama Arama/Öğrenci Detayı üzerinden
  // "Düzenle" ile açılınca (detaySinifId o an başka bir sınıfa ait ya da
  // boş olabilir) öğrenci yanlış sınıfa taşınabiliyor ya da "Sınıfsız"
  // kalabiliyordu. Artık sınıf açıkça seçiliyor ve kaydediliyor.
  const mevcutSinifId = v ? v.sinifId : detaySinifId;
  const body = `
    <div class="form-group"><label>Sınıf</label>
      <select id="f_vSinif" onchange="_kulupSecenekleriYenile()">
        <option value="">— Sınıfsız —</option>
        ${siniflar.slice().sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr')).map(s=>`<option value="${s.id}" ${mevcutSinifId===s.id?'selected':''}>${escapeHtml(s.ad)}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Öğrenci Adı</label><input id="f_vOgrenci" value="${v?escapeHtml(v.ogrenciAdi||''):''}"></div>
      <div class="form-group"><label>Öğrenci No</label><input id="f_vOgrenciNo" value="${v?escapeHtml(v.ogrenciNo||''):''}\" placeholder="örn: 1024"></div>
    </div>
    <div class="form-group"><label>Cinsiyet</label>
      <select id="f_vCinsiyet">
        <option value="">—</option>
        <option ${v&&v.cinsiyet==='Kız'?'selected':''}>Kız</option>
        <option ${v&&v.cinsiyet==='Erkek'?'selected':''}>Erkek</option>
      </select>
    </div>
    <div class="form-group"><label>Veli Adı</label><input id="f_vVeli" value="${v?escapeHtml(v.veliAdi||''): ''}"></div>
    <div class="form-row" style="align-items:flex-end;">
      <div class="form-group" style="flex:1;"><label>Telefon 1</label><input id="f_vTelefon1" value="${v?escapeHtml(v.telefon1||v.telefon||''): ''}" placeholder="05xx xxx xx xx"></div>
      <div class="form-group" style="flex:0 0 120px;"><label>Yakınlık 1</label><select id="f_vYakinlik1">${VELI_YAKINLIK_SECENEKLERI.map(y=>`<option ${v&&(v.yakinlik1||v.yakinlik)===y?'selected':''} value="${y}">${y}</option>`).join('')}</select></div>
    </div>
    <div class="form-row" style="align-items:flex-end;">
      <div class="form-group" style="flex:1;"><label>Telefon 2</label><input id="f_vTelefon2" value="${v?escapeHtml(v.telefon2||''): ''}" placeholder="05xx xxx xx xx"></div>
      <div class="form-group" style="flex:0 0 120px;"><label>Yakınlık 2</label><select id="f_vYakinlik2"><option value="">—</option>${VELI_YAKINLIK_SECENEKLERI.map(y=>`<option ${v&&v.yakinlik2===y?'selected':''} value="${y}">${y}</option>`).join('')}</select></div>
    </div>
    <div class="form-row" style="align-items:flex-end;">
      <div class="form-group" style="flex:1;"><label>Telefon 3</label><input id="f_vTelefon3" value="${v?escapeHtml(v.telefon3||''): ''}" placeholder="05xx xxx xx xx"></div>
      <div class="form-group" style="flex:0 0 120px;"><label>Yakınlık 3</label><select id="f_vYakinlik3"><option value="">—</option>${VELI_YAKINLIK_SECENEKLERI.map(y=>`<option ${v&&v.yakinlik3===y?'selected':''} value="${y}">${y}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label>Adres</label><textarea id="f_vAdres" rows="2" placeholder="örn: Mahalle, sokak, no...">${v?escapeHtml(v.adres||''):''}</textarea></div>
    <div class="form-group"><label>Servis</label>
      <select id="f_vServis">
        <option value="">— Servis kullanmıyor —</option>
        ${servisler.map(sv=>`<option value="${sv.id}" ${v&&v.servisId===sv.id?'selected':''}>${escapeHtml(sv.servisAdi||'Servis')}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Sosyal Kulüp</label>
      <select id="f_vKulup">
        ${_kulupSecenekleriHtml(mevcutSinifId, v)}
      </select>
      ${v&&v.kulupId&&!(typeof cizelgeVerileri!=='undefined'&&cizelgeVerileri.sosyalKulupler.some(k=>k.id===v.kulupId&&(k.aktif!==false)&&(!k.sinifIdler||!k.sinifIdler.length||k.sinifIdler.includes(mevcutSinifId))))?'<p style="font-size:11px;color:#c0392b;margin-top:4px;">⚠️ Mevcut kulüp bu sınıf için artık uygun değil ya da pasif — listede görünmeyebilir, gerekirse değiştirin.</p>':''}
    </div>
    <div class="form-group"><label>Notlar</label><textarea id="f_vNotlar" rows="2">${v?escapeHtml(v.notlar||''):''}</textarea></div>
  `;
  modalAc(v?'Öğrenci Düzenle':'Yeni Öğrenci Ekle', body, ()=>{
    const ogrenciAdi = document.getElementById('f_vOgrenci').value.trim();
    if(!ogrenciAdi){ toast('Öğrenci adı zorunludur.'); return; }
    const servisId = document.getElementById('f_vServis').value;
    const kulupId = document.getElementById('f_vKulup').value;
    const sinifId = document.getElementById('f_vSinif').value || null;
    SiniflarService.veliKaydet(v?v.id:null, {
      sinifId,
      ogrenciAdi,
      ogrenciNo: document.getElementById('f_vOgrenciNo').value.trim(),
      cinsiyet: document.getElementById('f_vCinsiyet').value,
      veliAdi: document.getElementById('f_vVeli').value.trim(),
      yakinlik: document.getElementById('f_vYakinlik1').value,
      yakinlik1: document.getElementById('f_vYakinlik1').value,
      yakinlik2: document.getElementById('f_vYakinlik2').value,
      yakinlik3: document.getElementById('f_vYakinlik3').value,
      telefon1: document.getElementById('f_vTelefon1').value.trim(),
      telefon2: document.getElementById('f_vTelefon2').value.trim(),
      telefon3: document.getElementById('f_vTelefon3').value.trim(),
      telefon: document.getElementById('f_vTelefon1').value.trim(),
      adres: document.getElementById('f_vAdres').value.trim(),
      servisId,
      servisAdi: servisId ? (servisler.find(sv=>sv.id===servisId)||{}).servisAdi||'' : '',
      kulupId,
      kulupAdi: kulupId ? ((typeof cizelgeVerileri!=='undefined'?cizelgeVerileri.sosyalKulupler:[]).find(k=>k.id===kulupId)||{}).ad||'' : '',
      notlar: document.getElementById('f_vNotlar').value.trim(),
    }).then(()=>toast('Kaydedildi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  }, v ? ()=>{ if(confirm('Bu öğrenci kaydını silmek istediğinize emin misiniz?')){ SiniflarService.veliSil(v.id).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }); modalKapat(); } } : null);
}

/* ---------- öğrenci detay modalı (görüntüleme) ---------- */
function ogrenciDetayModalAc(id){
  const v = veliler.find(x=>x.id===id);
  if(!v) return;
  const sinifObj = siniflar.find(s=>s.id===v.sinifId);
  const sinifAdi = sinifObj ? sinifObj.ad : '—';
  const servisObj = servisler.find(s=>s.id===v.servisId);
  const servisAdi = servisObj ? servisObj.servisAdi : (v.servisAdi||'—');

  const body = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
      <div><div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">Öğrenci No</div><div style="font-weight:600;">${escapeHtml(v.ogrenciNo||'—')}</div></div>
      <div><div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">Cinsiyet</div><div>${v.cinsiyet?`<span class="badge badge-${v.cinsiyet==='Kız'?'rose':'blue'}">${escapeHtml(v.cinsiyet)}</span>`:'—'}</div></div>
    </div>
    <div style="margin-bottom:12px;">
      <div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">Öğrenci Adı Soyadı</div>
      <div style="font-size:16px;font-weight:700;">${escapeHtml(v.ogrenciAdi||'—')}</div>
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:10px 0;">
    <div style="margin-bottom:8px;">
      <div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">Veli Adı Soyadı</div>
      <div style="font-weight:600;">${escapeHtml(v.veliAdi||'—')} ${v.yakinlik?`<span class="badge badge-gray">${escapeHtml(v.yakinlik)}</span>`:''}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
      <div><div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">İletişim 1</div><div style="font-size:13px;">${telefonEtiketle(v, v.telefon1||v.telefon)||'—'}</div></div>
      <div><div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">İletişim 2</div><div style="font-size:13px;">${telefonEtiketle(v, v.telefon2)||'—'}</div></div>
      <div><div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">İletişim 3</div><div style="font-size:13px;">${telefonEtiketle(v, v.telefon3)||'—'}</div></div>
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:10px 0;">
    <div style="margin-bottom:8px;">
      <div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">Adres</div>
      <div style="font-size:13px;">📍 ${escapeHtml(v.adres||'—')}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">
      <div><div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">Sınıf</div><div><span class="badge badge-blue">${escapeHtml(sinifAdi)}</span></div></div>
      <div><div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">Servis</div><div>${v.servisId?`<span class="badge badge-amber">🚌 ${escapeHtml(servisAdi)}</span>`:'<span style="color:var(--ink-muted);">Servis yok</span>'}</div></div>
      <div><div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">Sosyal Kulüp</div><div>${v.kulupAdi?`<span class="badge badge-sage badge-kulup" title="${escapeHtml(v.kulupAdi)}">🎗️ <span class="badge-kulup-metin">${escapeHtml(v.kulupAdi)}</span></span>`:'<span style="color:var(--ink-muted);">Kulüp yok</span>'}</div></div>
    </div>
    ${v.notlar?`<div style="margin-top:8px;font-size:13px;color:var(--ink-muted);">Not: ${escapeHtml(v.notlar)}</div>`:''}
    <div style="margin-top:14px;">
      <button class="btn btn-success btn-sm" onclick="telefonAra('${(v.telefon1||v.telefon||'').replace(/'/g,'')}')">📞 Ara</button>
      <button class="btn btn-ghost btn-sm" onclick="whatsappGonder('${(v.telefon1||v.telefon||'').replace(/'/g,'')}', 'Merhaba')">💬 WhatsApp</button>
      <button class="btn btn-ghost btn-sm" onclick="modalKapat(); sinifVeliModalAc('${id}')">📝 Düzenle</button>
    </div>
  `;

  document.getElementById('modalTitle').textContent = `${escapeHtml(v.ogrenciAdi||'Öğrenci')} — Detay`;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalSilBtn').style.display = 'none';
  document.getElementById('modalKaydetBtn').style.display = 'none';
  document.getElementById('modalOverlay').classList.add('active');
  document.body.classList.add('modal-open');
}

/* ---------- sınıf seçim listesi ---------- */
function sinifAdlari(){
  const tanimli = siniflar.map(s=>s.ad);
  const programdaGecen = dersProgrami.map(d=>d.sinif);
  return [...new Set([...tanimli, ...programdaGecen])].sort((a,b)=>a.localeCompare(b,'tr'));
}

/* ================================================================
   SINIF LİSTE OLUŞTUR
   ================================================================ */

const LISTE_HAZIR_SUTUNLAR = [
  { key: 'siraNo',     label: 'Sıra No',      fn: (v, i) => String(i + 1) },
  { key: 'ogrenciAdi', label: 'Ad Soyad',     fn: v => v.ogrenciAdi || '' },
  { key: 'ogrenciNo',  label: 'Öğrenci No',   fn: v => v.ogrenciNo  || '' },
  { key: 'cinsiyet',   label: 'Cinsiyet',      fn: v => v.cinsiyet   || '' },
  { key: 'veliAdi',    label: 'Veli Adı',      fn: v => v.veliAdi    || '' },
  { key: 'yakinlik',   label: 'Yakınlık',      fn: v => v.yakinlik1 || v.yakinlik || '' },
  { key: 'telefon1',   label: 'Telefon 1',     fn: v => v.telefon1 || v.telefon || '' },
  { key: 'telefon2',   label: 'Telefon 2',     fn: v => v.telefon2   || '' },
  { key: 'adres',      label: 'Adres',         fn: v => v.adres      || '' },
  { key: 'servisAdi',  label: 'Servis',        fn: v => v.servisAdi  || '' },
  { key: 'notlar',     label: 'Notlar',        fn: v => v.notlar     || '' },
];

/* ---------- modal ---------- */
function sinifListeOlusturModalAc(sinifId) {
  const s = siniflar.find(x => x.id === sinifId);
  if (!s) return;

  const checkboxler = LISTE_HAZIR_SUTUNLAR.map(col => `
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:3px 0;">
      <input type="checkbox" value="${col.key}" checked style="cursor:pointer;width:15px;height:15px;">
      <span>${escapeHtml(col.label)}</span>
    </label>`).join('');

  const _okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) ? okulBilgileriAyari.okulAdi : '';
  const _ogretmenAdi = sinifOgretmeniAdi(s) === '—' ? '' : sinifOgretmeniAdi(s);
  const _yil = (() => { const y = new Date().getFullYear(); return `${y}-${y+1}`; })();
  const inputStil = 'width:100%;padding:5px 9px;border:1px solid var(--border);border-radius:6px;font-size:13px;';
  const bolum = (lbl) => `<div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">${lbl}</div>`;

  const body = `
    ${bolum('Sayfa Yönü')}
    <div style="display:flex;gap:16px;">
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;">
        <input type="radio" name="listeYon" value="portrait" checked> Dikey (A4)
      </label>
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;">
        <input type="radio" name="listeYon" value="landscape"> Yatay (A4)
      </label>
    </div>

    ${bolum('Başlık Bilgileri')}
    <div style="display:grid;gap:7px;">
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="lb_okulAdi" placeholder="Okul Adı" value="${escapeHtml(_okulAdi)}" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="lb_okulAdiGoster" checked> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="lb_baslik" placeholder="Liste Başlığı" value="${escapeHtml(s.ad)} Sınıfı Öğrenci Listesi" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="lb_baslikGoster" checked> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="lb_altBaslik" placeholder="Alt Başlık (isteğe bağlı)" value="" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="lb_altBaslikGoster"> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="lb_egitimYili" placeholder="Eğitim-Öğretim Yılı" value="${escapeHtml(_yil)}" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="lb_egitimYiliGoster" checked> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="lb_tarih" placeholder="Tarih" value="${new Date().toLocaleDateString('tr-TR')}" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="lb_tarihGoster" checked> Göster</label>
      </div>
    </div>

    ${bolum('İmza / Onay Satırı')}
    <div style="display:grid;gap:7px;">
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="lb_ogretmen" placeholder="Sınıf Öğretmeni Adı" value="${escapeHtml(_ogretmenAdi)}" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="lb_ogretmenGoster" checked> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="lb_mudur" placeholder="Müdür / Onay Kişisi Adı" value="" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="lb_mudurGoster" checked> Göster</label>
      </div>
    </div>

    ${bolum('Sütunları Seç')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;padding:10px;background:var(--nm-bg,#f0f0f3);border-radius:8px;">
      ${checkboxler}
    </div>

    ${bolum('Özel Sütun Ekle (Boş)')}
    <div id="ozelSutunListesi" style="display:flex;flex-direction:column;gap:6px;"></div>
    <button class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="listeOzelSutunEkle()">+ Özel Sütun Ekle</button>
  `;

  modalAc(`📋 Liste Oluştur — ${escapeHtml(s.ad)}`, body, () => {
    sinifListesiYazdir(sinifId);
  }, null, '🖨️ Listeyi Yazdır');
}

function listeOzelSutunEkle() {
  const kap = document.getElementById('ozelSutunListesi');
  if (!kap) return;
  const sira = kap.children.length + 1;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:6px;align-items:center;';
  div.innerHTML = `
    <input class="ozel-sutun-input" type="text" placeholder="Sütun adı (örn: İmza)" value=""
      style="flex:1;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px;">
    <button class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="this.parentElement.remove()">✕</button>
  `;
  kap.appendChild(div);
}

/* ---------- yazdırma ---------- */
function sinifListesiYazdir(sinifId) {
  const s = siniflar.find(x => x.id === sinifId);
  if (!s) return;

  // seçili hazır sütunlar
  const seciliKeyler = [...document.querySelectorAll('#modalBody input[type=checkbox]')]
    .filter(el => el.checked && !el.id.startsWith('lb_'))
    .map(el => el.value);
  const seciliSutunlar = LISTE_HAZIR_SUTUNLAR.filter(c => seciliKeyler.includes(c.key));

  // özel sütunlar
  const ozelSutunlar = [...document.querySelectorAll('.ozel-sutun-input')]
    .map(el => el.value.trim()).filter(Boolean)
    .map(label => ({ key: '_ozel_' + label, label, fn: () => '' }));

  const tumSutunlar = [...seciliSutunlar, ...ozelSutunlar];
  if (!tumSutunlar.length) { toast('En az bir sütun seçin.'); return; }

  const g = id => document.getElementById(id);
  const gv = id => g(id)?.value?.trim() || '';
  const gc = id => g(id)?.checked ?? false;

  const yon       = document.querySelector('input[name="listeYon"]:checked')?.value || 'portrait';
  const okulAdi   = gv('lb_okulAdi');
  const baslik    = gv('lb_baslik') || `${s.ad} Sınıfı Öğrenci Listesi`;
  const altBaslik = gv('lb_altBaslik');
  const egitimYili= gv('lb_egitimYili');
  const tarih     = gv('lb_tarih') || new Date().toLocaleDateString('tr-TR');
  const ogretmen  = gv('lb_ogretmen');
  const mudur     = gv('lb_mudur');

  const gosterOkul    = gc('lb_okulAdiGoster');
  const gosterBaslik  = gc('lb_baslikGoster');
  const gosterAlt     = gc('lb_altBaslikGoster');
  const gosterYil     = gc('lb_egitimYiliGoster');
  const gosterTarih   = gc('lb_tarihGoster');
  const gosterOgretmen= gc('lb_ogretmenGoster');
  const gosterMudur   = gc('lb_mudurGoster');

  const ogrenciler = veliler
    .filter(v => v.sinifId === s.id)
    .sort((a, b) => (a.ogrenciAdi || '').localeCompare(b.ogrenciAdi || '', 'tr'));

  const thHTML = tumSutunlar.map(c => `<th>${escapeHtml(c.label)}</th>`).join('');
  const trHTML = ogrenciler.map((v, i) =>
    `<tr>${tumSutunlar.map(c => `<td>${escapeHtml(c.fn(v, i))}</td>`).join('')}</tr>`
  ).join('');

  const metaParcalar = [];
  if (gosterYil && egitimYili) metaParcalar.push(escapeHtml(egitimYili) + ' Eğitim-Öğretim Yılı');
  if (gosterTarih && tarih) metaParcalar.push(escapeHtml(tarih));

  const imzaSol = gosterOgretmen && ogretmen
    ? `Sınıf Öğretmeni: <strong>${escapeHtml(ogretmen)}</strong><br><br>İmza: .......................`
    : (gosterOgretmen ? 'Sınıf Öğretmeni: ...............................<br><br>İmza: .......................' : '');
  const imzaSag = gosterMudur && mudur
    ? `Müdür: <strong>${escapeHtml(mudur)}</strong><br><br>İmza: .......................`
    : (gosterMudur ? 'Müdür: ...............................<br><br>İmza: .......................' : '');

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(baslik)}</title>
<style>
  @page { size: A4 ${yon}; margin: 1.2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; }
  .header { text-align: center; margin-bottom: 14px; border-bottom: 2px solid #333; padding-bottom: 10px; }
  .header .okul { font-size: 15px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; }
  .header .baslik { font-size: 13px; font-weight: 600; margin-top: 5px; }
  .header .alt-baslik { font-size: 11px; margin-top: 3px; color: #444; }
  .header .meta { font-size: 10px; color: #666; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background: #333; color: #fff; padding: 5px 6px; text-align: left; font-size: 10px; font-weight: 600; white-space: nowrap; }
  td { padding: 4px 6px; border-bottom: 1px solid #ddd; vertical-align: top; }
  tr:nth-child(even) td { background: #f7f7f7; }
  tr:last-child td { border-bottom: 2px solid #333; }
  .ogrenci-sayisi { margin-top: 8px; font-size: 10px; color: #444; text-align: right; }
  .footer { margin-top: 16px; display: flex; justify-content: space-between; font-size: 10px; color: #444; line-height: 1.8; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    ${gosterOkul && okulAdi ? `<div class="okul">${escapeHtml(okulAdi)}</div>` : ''}
    ${gosterBaslik ? `<div class="baslik">${escapeHtml(baslik)}</div>` : ''}
    ${gosterAlt && altBaslik ? `<div class="alt-baslik">${escapeHtml(altBaslik)}</div>` : ''}
    ${metaParcalar.length ? `<div class="meta">${metaParcalar.join(' &nbsp;·&nbsp; ')}</div>` : ''}
  </div>
  <table>
    <thead><tr>${thHTML}</tr></thead>
    <tbody>${trHTML}</tbody>
  </table>
  <div class="ogrenci-sayisi">Toplam öğrenci sayısı: <strong>${ogrenciler.length}</strong></div>
  ${(imzaSol || imzaSag) ? `<div class="footer"><div>${imzaSol}</div><div style="text-align:right;">${imzaSag}</div></div>` : ''}
</body>
</html>`;

  modalKapat();
  const yonTr = (yon === 'landscape') ? 'yatay' : 'dikey';
  uygulamaHtmlYazdir(html, (s.ad || 'Sinif') + '_Ogrenci_Listesi', yonTr);
}
