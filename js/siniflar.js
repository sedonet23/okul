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
    <div class="form-group"><label>Sınıf Adı</label><input id="f_sAd" value="${s?escapeHtml(s.ad):''}\" placeholder="örn: 5-A"></div>
    <div class="form-row">
      <div class="form-group"><label>Seviye</label><input id="f_sSeviye" value="${s?escapeHtml(s.seviye||''):''}\" placeholder="örn: 5"></div>
      <div class="form-group"><label>Derslik</label><input id="f_sDerslik" value="${s?escapeHtml(s.derslik||''):''}\" placeholder="örn: B Blok 3. Kat"></div>
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
  document.getElementById('detayOverlay').classList.add('active');
}

/* ---------- bilgi sekmesi ---------- */
function sinifDetayBilgiRender(s){
  const ogrenciler = veliler.filter(v=>v.sinifId===s.id);
  const gercekKiz   = ogrenciler.filter(v=>v.cinsiyet==='Kız').length;
  const gercekErkek = ogrenciler.filter(v=>v.cinsiyet==='Erkek').length;
  const toplamOgrenci = ogrenciler.length;

  document.getElementById('sinifDetayBilgi').innerHTML = `
    <div class="detay-card">
      <h4>Temel Bilgiler</h4>
      <div class="detay-row">Sınıf Öğretmeni: <strong>${escapeHtml(sinifOgretmeniAdi(s))}</strong></div>
      <div class="detay-row">Derslik: ${escapeHtml(s.derslik||'—')}</div>
      <div class="detay-row">
        Öğrenci: <strong>${toplamOgrenci}</strong> &nbsp;·&nbsp;
        Kız: <strong style="color:#c0392b;">${gercekKiz}</strong> &nbsp;·&nbsp;
        Erkek: <strong style="color:#2980b9;">${gercekErkek}</strong>
        ${toplamOgrenci !== (s.ogrenciSayisi||0) ? `<span style="font-size:12px;color:var(--ink-muted);"> (kayıt: ${s.ogrenciSayisi||0})</span>` : ''}
      </div>
      ${s.notlar?`<div class="detay-row detay-row-muted">${escapeHtml(s.notlar)}</div>`:''}
    </div>
    <div class="detay-card">
      <h4 style="display:flex;justify-content:space-between;align-items:center;">
        Öğrenci Listesi (${toplamOgrenci})
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="sinifOgrenciExcelModalAc('${s.id}')">⬆ Excel'den Ekle</button>
          <button class="btn btn-amber btn-sm" onclick="sinifVeliModalAc()">+ Öğrenci Ekle</button>
        </div>
      </h4>
      ${ogrenciler.length ? ogrenciler.sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr')).map(v=>`
        <div class="detay-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer;" onclick="ogrenciDetayModalAc('${v.id}')">
          <span>
            <strong>${escapeHtml(v.ogrenciAdi)}</strong>
            ${v.ogrenciNo?`<span class="detay-row-muted"> No:${escapeHtml(v.ogrenciNo)}</span>`:''}
            ${v.cinsiyet?`<span class="badge badge-${v.cinsiyet==='Kız'?'rose':'blue'}">${escapeHtml(v.cinsiyet)}</span>`:''}
            ${v.servisAdi?`<span class="badge badge-amber">🚌 ${escapeHtml(v.servisAdi)}</span>`:''}
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
    const telefonlar = [v.telefon1||v.telefon, v.telefon2, v.telefon3].filter(Boolean).join(' · ');
    return `
    <div class="detay-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer;" onclick="ogrenciDetayModalAc('${v.id}')">
      <span>
        <strong>${escapeHtml(v.ogrenciAdi)}</strong>
        ${v.ogrenciNo?`<span class="detay-row-muted"> No:${escapeHtml(v.ogrenciNo)}</span>`:''}
        ${v.cinsiyet?`<span class="badge badge-${v.cinsiyet==='Kız'?'rose':'blue'}">${escapeHtml(v.cinsiyet)}</span>`:''}
        ${v.servisAdi?`<span class="badge badge-amber">🚌 ${escapeHtml(v.servisAdi)}</span>`:''}
        <br><span style="font-size:12px;color:var(--ink-muted);">${escapeHtml(v.veliAdi||'—')}${v.yakinlik?' ('+escapeHtml(v.yakinlik)+')':''}</span>
        ${telefonlar?`<br><span style="font-size:12px;color:var(--ink-muted);">📞 ${escapeHtml(telefonlar)}</span>`:''}
      </span>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); sinifVeliModalAc('${v.id}')">Düzenle</button>
    </div>`;
  }).join('') : '<p class="empty-state">Henüz öğrenci eklenmedi.</p>';

  document.getElementById('sinifDetayOgrenci').innerHTML = `
    <div class="detay-card">
      <h4 style="display:flex;justify-content:space-between;align-items:center;">
        Öğrenci Listesi (${ogrenciler.length})
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="sinifOgrenciExcelModalAc('${s.id}')">⬆ Excel'den Ekle</button>
          <button class="btn btn-amber btn-sm" onclick="sinifVeliModalAc()">+ Öğrenci Ekle</button>
        </div>
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

function sinifVeliModalAc(id){
  const v = id ? veliler.find(x=>x.id===id) : null;
  const body = `
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
    <div class="form-row">
      <div class="form-group"><label>Veli Adı</label><input id="f_vVeli" value="${v?escapeHtml(v.veliAdi||''):''}"></div>
      <div class="form-group"><label>Yakınlık Derecesi</label>
        <select id="f_vYakinlik">${VELI_YAKINLIK_SECENEKLERI.map(y=>`<option ${v&&v.yakinlik===y?'selected':''}>${y}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group"><label>Telefon 1</label><input id="f_vTelefon1" value="${v?escapeHtml(v.telefon1||v.telefon||''):''}\" placeholder="05xx xxx xx xx"></div>
    <div class="form-group"><label>Telefon 2</label><input id="f_vTelefon2" value="${v?escapeHtml(v.telefon2||''):''}\" placeholder="05xx xxx xx xx"></div>
    <div class="form-group"><label>Telefon 3</label><input id="f_vTelefon3" value="${v?escapeHtml(v.telefon3||''):''}\" placeholder="05xx xxx xx xx"></div>
    <div class="form-group"><label>Adres</label><textarea id="f_vAdres" rows="2" placeholder="örn: Mahalle, sokak, no...">${v?escapeHtml(v.adres||''):''}</textarea></div>
    <div class="form-group"><label>Servis</label>
      <select id="f_vServis">
        <option value="">— Servis kullanmıyor —</option>
        ${servisler.map(sv=>`<option value="${sv.id}" ${v&&v.servisId===sv.id?'selected':''}>${escapeHtml(sv.servisAdi||'Servis')}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Notlar</label><textarea id="f_vNotlar" rows="2">${v?escapeHtml(v.notlar||''):''}</textarea></div>
  `;
  modalAc(v?'Öğrenci Düzenle':'Yeni Öğrenci Ekle', body, ()=>{
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
      telefon: document.getElementById('f_vTelefon1').value.trim(),
      adres: document.getElementById('f_vAdres').value.trim(),
      servisId,
      servisAdi: servisId ? (servisler.find(sv=>sv.id===servisId)||{}).servisAdi||'' : '',
      notlar: document.getElementById('f_vNotlar').value.trim(),
    });
    modalKapat();
  }, v ? ()=>{ if(confirm('Bu öğrenci kaydını silmek istediğinize emin misiniz?')){ db.collection(COL.veliler).doc(v.id).delete(); modalKapat(); } } : null);
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
      <div><div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">İletişim 1</div><div style="font-size:13px;">${escapeHtml(v.telefon1||v.telefon||'—')}</div></div>
      <div><div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">İletişim 2</div><div style="font-size:13px;">${escapeHtml(v.telefon2||'—')}</div></div>
      <div><div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">İletişim 3</div><div style="font-size:13px;">${escapeHtml(v.telefon3||'—')}</div></div>
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:10px 0;">
    <div style="margin-bottom:8px;">
      <div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">Adres</div>
      <div style="font-size:13px;">📍 ${escapeHtml(v.adres||'—')}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
      <div><div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">Sınıf</div><div><span class="badge badge-blue">${escapeHtml(sinifAdi)}</span></div></div>
      <div><div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">Servis</div><div>${v.servisId?`<span class="badge badge-amber">🚌 ${escapeHtml(servisAdi)}</span>`:'<span style="color:var(--ink-muted);">Servis yok</span>'}</div></div>
    </div>
    ${v.notlar?`<div style="margin-top:8px;font-size:13px;color:var(--ink-muted);">Not: ${escapeHtml(v.notlar)}</div>`:''}
    <div style="margin-top:14px;">
      <button class="btn btn-ghost btn-sm" onclick="modalKapat(); sinifVeliModalAc('${id}')">✎ Düzenle</button>
    </div>
  `;

  document.getElementById('modalTitle').textContent = `${escapeHtml(v.ogrenciAdi||'Öğrenci')} — Detay`;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalSilBtn').style.display = 'none';
  document.getElementById('modalKaydetBtn').style.display = 'none';
  document.getElementById('modalOverlay').classList.add('active');
}

/* ---------- sınıf seçim listesi ---------- */
function sinifAdlari(){
  const tanimli = siniflar.map(s=>s.ad);
  const programdaGecen = dersProgrami.map(d=>d.sinif);
  return [...new Set([...tanimli, ...programdaGecen])].sort((a,b)=>a.localeCompare(b,'tr'));
}
