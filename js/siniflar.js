/* ====================================================================
   SINIFLAR MODÜLÜ
   ==================================================================== */

let siniflar = [];

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
    <tr class="row-clickable" onclick="sinifModalAc('${s.id}')">
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

/* ---------- sınıf seçim listesi (Ders Programı vb. için ortak kaynak) ---------- */
function sinifAdlari(){
  // Sınıflar modülündeki tanımlı sınıflar + ders programında geçen ama henüz modüle eklenmemiş sınıflar (geriye dönük uyumluluk)
  const tanimli = siniflar.map(s=>s.ad);
  const programdaGecen = dersProgrami.map(d=>d.sinif);
  return [...new Set([...tanimli, ...programdaGecen])].sort((a,b)=>a.localeCompare(b,'tr'));
}
