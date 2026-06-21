/* ====================================================================
   SINIFLAR MODÜLÜ
   ==================================================================== */

let siniflar = [];
let veliler = [];
let detaySinifId = null;
let detaySinifSekme = 'bilgi';

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
    <div class="form-group"><label>Sınıf Adı</label><input id="f_sAd" value="${s?escapeHtml(s.ad):''}" placeholder="örn: 5-A"></div>
    <div class="form-row">
      <div class="form-group"><label>Seviye</label><input id="f_sSeviye" value="${s?escapeHtml(s.seviye||''):''}" placeholder="örn: 5"></div>
      <div class="form-group"><label>Derslik</label><input id="f_sDerslik" value="${s?escapeHtml(s.derslik||''):''}" placeholder="örn: B Blok 3. Kat"></div>
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
    const varMi = siniflar.find(x=>x.ad===ad && (!s || x.id!==s.id));
    if(varMi){ toast('Bu isimde bir sınıf zaten var.'); return; }
    const kiz = parseInt(document.getElementById('f_sKiz').value)||0;
    const erkek = parseInt(document.getElementById('f_sErkek').value)||0;
    kaydet(COL.siniflar, s?s.id:null, {
      ad,
      seviye: document.getElementById('f_sSeviye').value.trim(),
      derslik: document.getElementById('f_sDerslik').value.trim(),
      sinifOgretmeniId: document.getElementById('f_sOgretmen').value,
      kizSayisi: kiz,
      erkekSayisi: erkek,
      ogrenciSayisi: kiz+erkek,
      notlar: document.getElementById('f_sNotlar').value.trim(),
    });
    modalKapat();
  }, s ? ()=>{ if(confirm('Bu sınıfı silmek istediğinize emin misiniz? (Ders programındaki kayıtlar silinmez.)')){ db.collection(COL.siniflar).doc(s.id).delete(); modalKapat(); } } : null);
}

/* ---------- sınıf detay paneli (sekmeli) ---------- */
function sinifDetaySekmeAc(sekme){
  detaySinifSekme = sekme;
  document.querySelectorAll('#detayBody .detay-tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.sekme===sekme));
  document.querySelectorAll('#detayBody .detay-tab-panel').forEach(p=>p.classList.toggle('active', p.dataset.sekme===sekme));
}

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
      <button class="detay-tab-btn" data-sekme="veli" onclick="sinifDetaySekmeAc('veli')">Veli Bilgileri</button>
    </div>
    <div style="padding:14px 18px;">
      <div class="detay-tab-panel active" data-sekme="bilgi" id="sinifDetayBilgi"></div>
      <div class="detay-tab-panel" data-sekme="ders" id="sinifDetayDers"></div>
      <div class="detay-tab-panel" data-sekme="veli" id="sinifDetayVeli"></div>
    </div>
  `;

  sinifDetayBilgiRender(s);
  sinifDetayDersRender(s);
  sinifDetayVeliRender(s);
}

function sinifDetayBilgiRender(s){
  document.getElementById('sinifDetayBilgi').innerHTML = `
    <div class="detay-card">
      <h4>Temel Bilgiler</h4>
      <div class="detay-row">Sınıf Öğretmeni: ${escapeHtml(sinifOgretmeniAdi(s))}</div>
      <div class="detay-row">Derslik: ${escapeHtml(s.derslik||'—')}</div>
      <div class="detay-row">Öğrenci Sayısı: ${s.ogrenciSayisi||0} (Kız: ${s.kizSayisi||0} · Erkek: ${s.erkekSayisi||0})</div>
      ${s.notlar?`<div class="detay-row detay-row-muted">${escapeHtml(s.notlar)}</div>`:''}
    </div>
  `;
}

function sinifDetayDersRender(s){
  const dersleri = dersProgrami.filter(d=>d.sinif===s.ad).sort((a,b)=> GUNLER.indexOf(a.gun)-GUNLER.indexOf(b.gun) || a.saat-b.saat);
  const html = dersleri.length ? dersleri.map(d=>
    `<div class="detay-row"><span class="badge badge-blue">${escapeHtml(d.gun)} · ${d.saat}.</span> ${escapeHtml(d.ders)} <span class="detay-row-muted">(${escapeHtml(ogretmenAdi(d.ogretmenId))})</span></div>`
  ).join('') : '<p class="empty-state">Bu sınıf için ders programı girilmemiş.</p>';
  document.getElementById('sinifDetayDers').innerHTML = `<div class="detay-card"><h4>Haftalık Ders Programı</h4>${html}</div>`;
}

function sinifDetayVeliRender(s){
  const liste = veliler.filter(v=>v.sinifId===s.id).sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));
  const html = liste.length ? liste.map(v=>{
    const telefonlar = [v.telefon1||v.telefon, v.telefon2, v.telefon3].filter(Boolean).map(escapeHtml).join(' · ');
    const cinsiyetRozeti = v.cinsiyet ? ` <span class="badge badge-blue">${escapeHtml(v.cinsiyet)}</span>` : '';
    const noEtiketi = v.ogrenciNo ? ` <span class="detay-row-muted">No: ${escapeHtml(v.ogrenciNo)}</span>` : '';
    const servisEtiketi = v.servisAdi ? ` <span class="badge badge-amber">🚌 ${escapeHtml(v.servisAdi)}</span>` : '';
    return `
    <div class="detay-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer;" onclick="sinifVeliModalAc('${v.id}')">
      <span><strong>${escapeHtml(v.ogrenciAdi)}</strong>${noEtiketi}${cinsiyetRozeti}${servisEtiketi}<br>${escapeHtml(v.veliAdi||'—')}${v.yakinlik?` <span class="badge badge-gray">${escapeHtml(v.yakinlik)}</span>`:''}${telefonlar?'<br><span class="detay-row-muted">'+telefonlar+'</span>':''}${v.adres?'<br><span class="detay-row-muted">📍 '+escapeHtml(v.adres)+'</span>':''}</span>
      <span style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); sinifVeliModalAc('${v.id}')">Düzenle</button>
      </span>
    </div>`;
  }).join('') : '<p class="empty-state">Henüz öğrenci kaydı eklenmedi.</p>';
  document.getElementById('sinifDetayVeli').innerHTML = `
    <div class="detay-card">
      <h4 style="display:flex;justify-content:space-between;align-items:center;">Öğrenci / Veli Listesi (${liste.length})
        <button class="btn btn-amber btn-sm" onclick="sinifVeliModalAc()">+ Ekle</button>
      </h4>
      ${html}
    </div>
  `;
}

const VELI_YAKINLIK_SECENEKLERI = ['Anne', 'Baba', 'Diğer'];

function sinifVeliModalAc(id){
  const v = id ? veliler.find(x=>x.id===id) : null;
  const body = `
    <div class="form-row">
      <div class="form-group"><label>Öğrenci Adı</label><input id="f_vOgrenci" value="${v?escapeHtml(v.ogrenciAdi||''):''}"></div>
      <div class="form-group"><label>Öğrenci No</label><input id="f_vOgrenciNo" value="${v?escapeHtml(v.ogrenciNo||''):''}" placeholder="örn: 1024"></div>
    </div>
    <div class="form-group"><label>Cinsiyet</label>
      <select id="f_vCinsiyet">
        <option value="">—</option>
        <option ${v&&v.cinsiyet==='Kız'?'selected':''}>Kız</option>
        <option ${v&&v.cinsiyet==='Erkek'?'selected':''}>Erkek</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Veli Adı</label><input id="f_vVeli" value="${v?escapeHtml(v.veliAdi||''):''}"></div>
      <div class="form-group"><label>Yakınlık Derecesi</label>
        <select id="f_vYakinlik">${VELI_YAKINLIK_SECENEKLERI.map(y=>`<option ${v&&v.yakinlik===y?'selected':''}>${y}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group"><label>Telefon 1</label><input id="f_vTelefon1" value="${v?escapeHtml(v.telefon1||v.telefon||''):''}" placeholder="05xx xxx xx xx"></div>
    <div class="form-group"><label>Telefon 2</label><input id="f_vTelefon2" value="${v?escapeHtml(v.telefon2||''):''}" placeholder="05xx xxx xx xx"></div>
    <div class="form-group"><label>Telefon 3</label><input id="f_vTelefon3" value="${v?escapeHtml(v.telefon3||''):''}" placeholder="05xx xxx xx xx"></div>
    <div class="form-group"><label>Adres</label><textarea id="f_vAdres" rows="2" placeholder="örn: Mahalle, sokak, no...">${v?escapeHtml(v.adres||''):''}</textarea></div>
    <div class="form-group"><label>Servis</label>
      <select id="f_vServis">
        <option value="">— Servis kullanmıyor —</option>
        ${servisler.map(sv=>`<option value="${sv.id}" ${v&&v.servisId===sv.id?'selected':''}>${escapeHtml(sv.servisAdi||'Servis')}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Notlar</label><textarea id="f_vNotlar" rows="2">${v?escapeHtml(v.notlar||''):''}</textarea></div>
  `;
  modalAc(v?'Öğrenci / Veli Bilgisi Düzenle':'Öğrenci / Veli Bilgisi Ekle', body, ()=>{
    const ogrenciAdi = document.getElementById('f_vOgrenci').value.trim();
    if(!ogrenciAdi){ toast('Öğrenci adı zorunludur.'); return; }
    const servisId = document.getElementById('f_vServis').value;
    kaydet(COL.veliler, v?v.id:null, {
      sinifId: detaySinifId,
      ogrenciAdi,
      ogrenciNo: document.getElementById('f_vOgrenciNo').value.trim(),
      cinsiyet: document.getElementById('f_vCinsiyet').value,
      veliAdi: document.getElementById('f_vVeli').value.trim(),
      yakinlik: document.getElementById('f_vYakinlik').value,
      telefon1: document.getElementById('f_vTelefon1').value.trim(),
      telefon2: document.getElementById('f_vTelefon2').value.trim(),
      telefon3: document.getElementById('f_vTelefon3').value.trim(),
      telefon: document.getElementById('f_vTelefon1').value.trim(), // geriye dönük uyumluluk
      adres: document.getElementById('f_vAdres').value.trim(),
      servisId,
      servisAdi: servisId ? (servisler.find(sv=>sv.id===servisId)||{}).servisAdi||'' : '',
      notlar: document.getElementById('f_vNotlar').value.trim(),
    });
    modalKapat();
  }, v ? ()=>{ if(confirm('Bu öğrenci/veli kaydını silmek istediğinize emin misiniz?')){ db.collection(COL.veliler).doc(v.id).delete(); modalKapat(); } } : null);
}

/* ---------- sınıf seçim listesi (Ders Programı vb. için ortak kaynak) ---------- */
function sinifAdlari(){
  // Sınıflar modülündeki tanımlı sınıflar + ders programında geçen ama henüz modüle eklenmemiş sınıflar (geriye dönük uyumluluk)
  const tanimli = siniflar.map(s=>s.ad);
  const programdaGecen = dersProgrami.map(d=>d.sinif);
  return [...new Set([...tanimli, ...programdaGecen])].sort((a,b)=>a.localeCompare(b,'tr'));
}
