/* ====================================================================
   ANA UYGULAMA MANTIĞI
   ==================================================================== */

const GUNLER = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];
const GUNADI = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const ONCELIKLER = ['Düşük','Orta','Yüksek'];
const EVRAK_TURLERI = ['Gelen Evrak','Giden Evrak','İç Yazışma','Tutanak','Diğer'];
const EVRAK_DURUMLARI = ['Beklemede','İşlemde','Tamamlandı','Arşivlendi'];

let ogretmenler=[], dersProgrami=[], nobetProgrami=[], hatirlaticilar=[], gorevler=[], notDefteri=[], evrakTakibi=[], notlar=[];
let seciliSinif = '';
let ekstraSiniflar = [];
let ekstraKonumlar = [];
let hatirlaticiFiltre = 'tumu';
let evrakFiltre = 'tumu';
let notSinifFiltreVal = 'Tümü';
let notDersFiltreVal = 'Tümü';
let baglantilarKuruldu = false;

/* ---------- yardımcılar ---------- */
function escapeHtml(str){
  if(str===null||str===undefined) return '';
  return String(str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function todayISO(){ return new Date().toISOString().slice(0,10); }
function formatTarih(iso){ if(!iso) return ''; const p = iso.split('-'); return p.length===3 ? `${p[2]}.${p[1]}.${p[0]}` : iso; }
function bugunMetni(){ const d=new Date(); return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}, ${GUNADI[d.getDay()]}`; }
function oncelikRengi(o){ if(o==='Yüksek') return 'brick'; if(o==='Orta') return 'amber'; return 'sage'; }
function evrakRengi(durum){ if(durum==='Tamamlandı') return 'sage'; if(durum==='İşlemde') return 'amber'; if(durum==='Arşivlendi') return 'gray'; return 'blue'; }
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>el.classList.remove('show'), 3000);
}
function ogretmenSecenekleri(seciliId){
  return '<option value="">Seçiniz</option>' + ogretmenler.map(o=>
    `<option value="${o.id}" ${o.id===seciliId?'selected':''}>${escapeHtml(o.ad+' '+o.soyad)}</option>`
  ).join('');
}
function ogretmenAdi(id){ const o = ogretmenler.find(x=>x.id===id); return o ? `${o.ad} ${o.soyad}` : '—'; }
function kaydet(koleksiyon, id, veri){
  if(!db){ toast('Firebase bağlantısı yok.'); return; }
  const ref = db.collection(koleksiyon);
  const islem = id ? ref.doc(id).update(veri) : ref.add({...veri, eklenmeTarihi: new Date().toISOString()});
  islem.then(()=>toast('Kaydedildi.')).catch(err=>toast('Hata: '+err.message));
}
function hataGoster(err){ console.error(err); toast('Veri hatası: '+err.message); }

/* ---------- modal ---------- */
function modalAc(title, bodyHtml, kaydetFn, silFn){
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  const silBtn = document.getElementById('modalSilBtn');
  if(silFn){ silBtn.style.display='inline-flex'; silBtn.onclick = silFn; }
  else { silBtn.style.display='none'; silBtn.onclick=null; }
  document.getElementById('modalKaydetBtn').onclick = kaydetFn;
  document.getElementById('modalOverlay').classList.add('active');
}
function modalKapat(){ document.getElementById('modalOverlay').classList.remove('active'); }

/* ============== ÖĞRETMENLER ============== */
function renderOgretmenler(){
  const aramaEl = document.getElementById('ogretmenArama');
  const arama = (aramaEl ? aramaEl.value : '').toLocaleLowerCase('tr');
  let liste = ogretmenler.filter(o => !arama || (o.ad+' '+o.soyad+' '+(o.brans||'')).toLocaleLowerCase('tr').includes(arama));
  liste.sort((a,b)=>a.ad.localeCompare(b.ad,'tr'));
  document.getElementById('ogretmenlerTablo').innerHTML = liste.length ? liste.map(o=>`
    <tr>
      <td>${escapeHtml(o.ad+' '+o.soyad)}</td>
      <td>${escapeHtml(o.brans||'—')}</td>
      <td>${escapeHtml(o.telefon||'—')}</td>
      <td>${escapeHtml(o.eposta||'—')}</td>
      <td>${escapeHtml(o.sorumluSinif||'—')}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="ogretmenModalAc('${o.id}')">Düzenle</button></td>
    </tr>`).join('') : `<tr><td colspan="6" class="empty-state">Henüz öğretmen eklenmedi.</td></tr>`;
}
function ogretmenModalAc(id){
  const o = id ? ogretmenler.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Ad</label><input id="f_ad" value="${o?escapeHtml(o.ad):''}"></div>
    <div class="form-group"><label>Soyad</label><input id="f_soyad" value="${o?escapeHtml(o.soyad):''}"></div>
    <div class="form-group"><label>Branş</label><input id="f_brans" value="${o?escapeHtml(o.brans||''):''}" placeholder="örn: Matematik"></div>
    <div class="form-group"><label>Telefon</label><input id="f_telefon" value="${o?escapeHtml(o.telefon||''):''}"></div>
    <div class="form-group"><label>E-posta</label><input id="f_eposta" value="${o?escapeHtml(o.eposta||''):''}"></div>
    <div class="form-group"><label>Sorumlu Sınıf (opsiyonel)</label><input id="f_sorumluSinif" value="${o?escapeHtml(o.sorumluSinif||''):''}"></div>
    <div class="form-group"><label>Notlar</label><textarea id="f_notlar" rows="2">${o?escapeHtml(o.notlar||''):''}</textarea></div>
  `;
  modalAc(o?'Öğretmen Düzenle':'Öğretmen Ekle', body, ()=>{
    const ad = document.getElementById('f_ad').value.trim();
    const soyad = document.getElementById('f_soyad').value.trim();
    if(!ad || !soyad){ toast('Ad ve soyad zorunludur.'); return; }
    kaydet(COL.ogretmenler, o?o.id:null, {
      ad, soyad,
      brans: document.getElementById('f_brans').value.trim(),
      telefon: document.getElementById('f_telefon').value.trim(),
      eposta: document.getElementById('f_eposta').value.trim(),
      sorumluSinif: document.getElementById('f_sorumluSinif').value.trim(),
      notlar: document.getElementById('f_notlar').value.trim(),
    });
    modalKapat();
  }, o ? ()=>{ if(confirm('Bu öğretmeni silmek istediğinize emin misiniz?')){ db.collection(COL.ogretmenler).doc(o.id).delete(); modalKapat(); } } : null);
}

/* ============== DERS PROGRAMI ============== */
function dersSiniflari(){ return [...new Set([...dersProgrami.map(d=>d.sinif), ...ekstraSiniflar])].sort((a,b)=>a.localeCompare(b,'tr')); }
function sinifDegisti(v){ seciliSinif = v; renderDersGrid(); }
function yeniSinifEkleDers(){
  const yeni = prompt('Yeni sınıf adı (örn: 5-A):');
  if(yeni && yeni.trim()){ seciliSinif = yeni.trim(); if(!ekstraSiniflar.includes(seciliSinif)) ekstraSiniflar.push(seciliSinif); renderDersGrid(); }
}
function renderDersGrid(){
  const sel = document.getElementById('dersSinifSecimi');
  const siniflar = dersSiniflari();
  if(!seciliSinif && siniflar.length) seciliSinif = siniflar[0];
  sel.innerHTML = siniflar.length ? siniflar.map(s=>`<option ${s===seciliSinif?'selected':''}>${escapeHtml(s)}</option>`).join('') : '<option>Sınıf eklenmedi</option>';
  const bugun = GUNADI[new Date().getDay()];
  let html = '<thead><tr><th>Saat</th>' + GUNLER.map(g=>`<th class="${g===bugun?'bugun-kolon':''}">${g}</th>`).join('') + '</tr></thead><tbody>';
  for(let saat=1; saat<=8; saat++){
    html += `<tr><td class="sch-saat">${saat}.</td>`;
    for(const gun of GUNLER){
      const giris = dersProgrami.find(d=>d.sinif===seciliSinif && d.gun===gun && d.saat===saat);
      if(giris){
        html += `<td class="sch-cell sch-filled" onclick="dersModalAcById('${gun}',${saat},'${giris.id}')"><div class="sch-ders">${escapeHtml(giris.ders)}</div><div class="sch-ogretmen">${escapeHtml(ogretmenAdi(giris.ogretmenId))}</div></td>`;
      } else {
        html += `<td class="sch-cell sch-empty" onclick="dersModalAcById('${gun}',${saat},'')">+</td>`;
      }
    }
    html += '</tr>';
  }
  html += '</tbody>';
  document.getElementById('dersGridTablo').innerHTML = html;
}
function dersModalAcById(gun, saat, id){
  const mevcut = id ? dersProgrami.find(d=>d.id===id) : null;
  dersModalAc(gun, saat, mevcut);
}
function dersModalAc(gun, saat, mevcut){
  const body = `
    <div class="form-group"><label>Sınıf</label><input id="f_sinif" value="${escapeHtml(mevcut?mevcut.sinif:(seciliSinif||''))}" placeholder="örn: 5-A"></div>
    <div class="form-group"><label>Gün</label><select id="f_gun">${GUNLER.map(g=>`<option ${g===gun?'selected':''}>${g}</option>`).join('')}</select></div>
    <div class="form-group"><label>Ders Saati</label><select id="f_saat">${[1,2,3,4,5,6,7,8].map(s=>`<option ${s===saat?'selected':''}>${s}</option>`).join('')}</select></div>
    <div class="form-group"><label>Ders</label><input id="f_ders" value="${mevcut?escapeHtml(mevcut.ders):''}" placeholder="örn: Matematik"></div>
    <div class="form-group"><label>Öğretmen</label><select id="f_ogretmen">${ogretmenSecenekleri(mevcut?mevcut.ogretmenId:'')}</select></div>
  `;
  modalAc(mevcut?'Ders Düzenle':'Ders Ekle', body, ()=>{
    const sinif = document.getElementById('f_sinif').value.trim();
    const ders = document.getElementById('f_ders').value.trim();
    if(!sinif || !ders){ toast('Sınıf ve ders alanı zorunludur.'); return; }
    kaydet(COL.dersProgrami, mevcut?mevcut.id:null, {
      sinif, gun: document.getElementById('f_gun').value,
      saat: parseInt(document.getElementById('f_saat').value),
      ders, ogretmenId: document.getElementById('f_ogretmen').value
    });
    seciliSinif = sinif;
    modalKapat();
  }, mevcut ? ()=>{ if(confirm('Bu ders kaydını silmek istiyor musunuz?')){ db.collection(COL.dersProgrami).doc(mevcut.id).delete(); modalKapat(); } } : null);
}

/* ============== NÖBET PROGRAMI ============== */
function nobetKonumListesi(){
  const varsayilan = ['Bahçe','Kantin','1. Kat Koridor','2. Kat Koridor'];
  return [...new Set([...varsayilan, ...nobetProgrami.map(n=>n.konum), ...ekstraKonumlar])];
}
function yeniKonumEkle(){
  const yeni = prompt('Yeni nöbet yeri adı:');
  if(yeni && yeni.trim() && !ekstraKonumlar.includes(yeni.trim())){ ekstraKonumlar.push(yeni.trim()); renderNobetGrid(); }
}
function renderNobetGrid(){
  const bugun = GUNADI[new Date().getDay()];
  let html = '<thead><tr><th>Nöbet Yeri</th>' + GUNLER.map(g=>`<th class="${g===bugun?'bugun-kolon':''}">${g}</th>`).join('') + '</tr></thead><tbody>';
  for(const konum of nobetKonumListesi()){
    html += `<tr><td class="sch-saat">${escapeHtml(konum)}</td>`;
    for(const gun of GUNLER){
      const giris = nobetProgrami.find(n=>n.konum===konum && n.gun===gun);
      if(giris){
        html += `<td class="sch-cell sch-filled" onclick="nobetModalAcById('${escapeHtml(konum)}','${gun}','${giris.id}')"><div class="sch-ders">${escapeHtml(ogretmenAdi(giris.ogretmenId))}</div></td>`;
      } else {
        html += `<td class="sch-cell sch-empty" onclick="nobetModalAcById('${escapeHtml(konum)}','${gun}','')">+</td>`;
      }
    }
    html += '</tr>';
  }
  html += '</tbody>';
  document.getElementById('nobetGridTablo').innerHTML = html;
}
function nobetModalAcById(konum, gun, id){
  const mevcut = id ? nobetProgrami.find(n=>n.id===id) : null;
  nobetModalAc(konum, gun, mevcut);
}
function nobetModalAc(konum, gun, mevcut){
  const body = `
    <div class="form-group"><label>Nöbet Yeri</label><input id="f_konum" value="${escapeHtml(mevcut?mevcut.konum:konum)}"></div>
    <div class="form-group"><label>Gün</label><select id="f_gun">${GUNLER.map(g=>`<option ${g===gun?'selected':''}>${g}</option>`).join('')}</select></div>
    <div class="form-group"><label>Öğretmen</label><select id="f_ogretmen">${ogretmenSecenekleri(mevcut?mevcut.ogretmenId:'')}</select></div>
  `;
  modalAc(mevcut?'Nöbet Düzenle':'Nöbet Ata', body, ()=>{
    const konumVal = document.getElementById('f_konum').value.trim();
    const ogretmenId = document.getElementById('f_ogretmen').value;
    if(!konumVal || !ogretmenId){ toast('Nöbet yeri ve öğretmen seçimi zorunludur.'); return; }
    kaydet(COL.nobet, mevcut?mevcut.id:null, { konum: konumVal, gun: document.getElementById('f_gun').value, ogretmenId });
    modalKapat();
  }, mevcut ? ()=>{ if(confirm('Bu nöbet atamasını kaldırmak istiyor musunuz?')){ db.collection(COL.nobet).doc(mevcut.id).delete(); modalKapat(); } } : null);
}

/* ============== HATIRLATICILAR ============== */
function hatirlaticiFiltreSec(f){
  hatirlaticiFiltre = f;
  document.querySelectorAll('#tab-hatirlaticilar .filtre-btn').forEach(b=>b.classList.toggle('active', b.dataset.f===f));
  renderHatirlaticilar();
}
function renderHatirlaticilar(){
  let liste = [...hatirlaticilar];
  if(hatirlaticiFiltre==='bekleyen') liste = liste.filter(h=>!h.tamamlandi);
  if(hatirlaticiFiltre==='tamamlanan') liste = liste.filter(h=>h.tamamlandi);
  liste.sort((a,b)=>(a.tarih+(a.saat||'')).localeCompare(b.tarih+(b.saat||'')));
  const bugun = todayISO();
  document.getElementById('hatirlaticiListesi').innerHTML = liste.length ? liste.map(h=>{
    const gecikmis = !h.tamamlandi && h.tarih < bugun;
    return `<div class="reminder-row ${h.tamamlandi?'done':''} ${gecikmis?'overdue':''}">
      <input type="checkbox" style="width:auto;" ${h.tamamlandi?'checked':''} onchange="hatirlaticiTamamlandiToggle('${h.id}', this.checked)">
      <div class="reminder-body">
        <div class="reminder-title">${escapeHtml(h.baslik)}</div>
        <div class="reminder-meta">${formatTarih(h.tarih)}${h.saat?' · '+h.saat:''}${h.aciklama?' · '+escapeHtml(h.aciklama):''} — push: ${h.bildirimGonderildi?'gönderildi':'bekliyor'}</div>
      </div>
      <span class="badge badge-${oncelikRengi(h.oncelik)}">${escapeHtml(h.oncelik||'Orta')}</span>
      <button class="btn btn-ghost btn-sm" onclick="hatirlaticiModalAc('${h.id}')">Düzenle</button>
    </div>`;
  }).join('') : '<p class="empty-state">Hatırlatıcı bulunamadı.</p>';
}
function hatirlaticiTamamlandiToggle(id, deger){ db.collection(COL.hatirlaticilar).doc(id).update({tamamlandi:deger}); }
function hatirlaticiModalAc(id){
  const h = id ? hatirlaticilar.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Başlık</label><input id="f_baslik" value="${h?escapeHtml(h.baslik):''}"></div>
    <div class="form-group"><label>Tarih</label><input type="date" id="f_tarih" value="${h?h.tarih:todayISO()}"></div>
    <div class="form-group"><label>Saat (opsiyonel)</label><input type="time" id="f_saat" value="${h&&h.saat?h.saat:''}"></div>
    <div class="form-group"><label>Öncelik</label><select id="f_oncelik">${ONCELIKLER.map(o=>`<option ${o===(h?h.oncelik:'Orta')?'selected':''}>${o}</option>`).join('')}</select></div>
    <div class="form-group"><label>Açıklama</label><textarea id="f_aciklama" rows="2">${h?escapeHtml(h.aciklama||''):''}</textarea></div>
    ${h?'<p style="font-size:11.8px;color:var(--text-muted);">Tarih/saat değiştirirseniz push bildirimi tekrar gönderim için sıfırlanır.</p>':''}
  `;
  modalAc(h?'Hatırlatıcı Düzenle':'Hatırlatıcı Ekle', body, ()=>{
    const baslik = document.getElementById('f_baslik').value.trim();
    const tarih = document.getElementById('f_tarih').value;
    if(!baslik || !tarih){ toast('Başlık ve tarih zorunludur.'); return; }
    const saat = document.getElementById('f_saat').value;
    const tarihSaatDegisti = h && (h.tarih !== tarih || (h.saat||'') !== saat);
    kaydet(COL.hatirlaticilar, h?h.id:null, {
      baslik, tarih, saat,
      oncelik: document.getElementById('f_oncelik').value,
      aciklama: document.getElementById('f_aciklama').value.trim(),
      tamamlandi: h ? !!h.tamamlandi : false,
      bildirimGonderildi: h ? (tarihSaatDegisti ? false : !!h.bildirimGonderildi) : false
    });
    modalKapat();
  }, h ? ()=>{ if(confirm('Bu hatırlatıcıyı silmek istiyor musunuz?')){ db.collection(COL.hatirlaticilar).doc(h.id).delete(); modalKapat(); } } : null);
}

/* ============== GÖREVLER ============== */
function renderGorevler(){
  const kolonlar = { yapilacak: document.getElementById('kolonYapilacak'), yapiliyor: document.getElementById('kolonYapiliyor'), tamamlandi: document.getElementById('kolonTamamlandi') };
  Object.values(kolonlar).forEach(k=>k.innerHTML='');
  const sayac = { yapilacak:0, yapiliyor:0, tamamlandi:0 };
  const bugun = todayISO();
  gorevler.forEach(g=>{
    sayac[g.durum] = (sayac[g.durum]||0) + 1;
    const gecikmis = g.durum!=='tamamlandi' && g.sonTarih && g.sonTarih < bugun;
    const div = document.createElement('div');
    div.className = 'task-card';
    div.draggable = true;
    div.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', g.id); div.classList.add('dragging'); });
    div.addEventListener('dragend', ()=> div.classList.remove('dragging'));
    div.innerHTML = `
      <div class="task-title">${escapeHtml(g.baslik)}</div>
      ${g.aciklama?`<div class="task-desc">${escapeHtml(g.aciklama)}</div>`:''}
      <div class="task-meta">
        <span class="badge badge-${oncelikRengi(g.oncelik)}">${escapeHtml(g.oncelik||'Orta')}</span>
        ${g.sonTarih?`<span class="task-due ${gecikmis?'overdue':''}">${formatTarih(g.sonTarih)}</span>`:''}
      </div>
      <div class="task-actions"><button class="btn btn-ghost btn-sm" onclick="gorevModalAc('${g.id}')">Düzenle</button></div>
    `;
    (kolonlar[g.durum]||kolonlar.yapilacak).appendChild(div);
  });
  document.getElementById('sayacYapilacak').textContent = sayac.yapilacak||0;
  document.getElementById('sayacYapiliyor').textContent = sayac.yapiliyor||0;
  document.getElementById('sayacTamamlandi').textContent = sayac.tamamlandi||0;
}
function gorevBirak(e, yeniDurum){
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  if(id) db.collection(COL.gorevler).doc(id).update({durum:yeniDurum});
}
function gorevModalAc(id){
  const g = id ? gorevler.find(x=>x.id===id) : null;
  const durumlar = [['yapilacak','Yapılacak'],['yapiliyor','Yapılıyor'],['tamamlandi','Tamamlandı']];
  const body = `
    <div class="form-group"><label>Başlık</label><input id="f_baslik" value="${g?escapeHtml(g.baslik):''}"></div>
    <div class="form-group"><label>Açıklama</label><textarea id="f_aciklama" rows="2">${g?escapeHtml(g.aciklama||''):''}</textarea></div>
    <div class="form-group"><label>Son Tarih (opsiyonel)</label><input type="date" id="f_sonTarih" value="${g&&g.sonTarih?g.sonTarih:''}"></div>
    <div class="form-group"><label>Öncelik</label><select id="f_oncelik">${ONCELIKLER.map(o=>`<option ${o===(g?g.oncelik:'Orta')?'selected':''}>${o}</option>`).join('')}</select></div>
    <div class="form-group"><label>Durum</label><select id="f_durum">${durumlar.map(([v,l])=>`<option value="${v}" ${v===(g?g.durum:'yapilacak')?'selected':''}>${l}</option>`).join('')}</select></div>
  `;
  modalAc(g?'Görev Düzenle':'Görev Ekle', body, ()=>{
    const baslik = document.getElementById('f_baslik').value.trim();
    if(!baslik){ toast('Başlık zorunludur.'); return; }
    const sonTarih = document.getElementById('f_sonTarih').value;
    const sonTarihDegisti = g && (g.sonTarih||'') !== sonTarih;
    kaydet(COL.gorevler, g?g.id:null, {
      baslik, aciklama: document.getElementById('f_aciklama').value.trim(),
      sonTarih, oncelik: document.getElementById('f_oncelik').value,
      durum: document.getElementById('f_durum').value,
      bildirimGonderildi: g ? (sonTarihDegisti ? false : !!g.bildirimGonderildi) : false
    });
    modalKapat();
  }, g ? ()=>{ if(confirm('Bu görevi silmek istiyor musunuz?')){ db.collection(COL.gorevler).doc(g.id).delete(); modalKapat(); } } : null);
}

/* ============== EVRAK TAKİBİ ============== */
function evrakFiltreSec(f){
  evrakFiltre = f;
  document.querySelectorAll('#tab-evrak .filtre-btn').forEach(b=>b.classList.toggle('active', b.dataset.f===f));
  renderEvrakTakibi();
}
function renderEvrakTakibi(){
  let liste = [...evrakTakibi];
  if(evrakFiltre!=='tumu') liste = liste.filter(e=>e.durum===evrakFiltre);
  liste.sort((a,b)=> (b.tarih||'').localeCompare(a.tarih||''));
  document.getElementById('evrakListesi').innerHTML = liste.length ? liste.map(e=>`
    <div class="evrak-row">
      <div class="evrak-body">
        <div class="evrak-title">${escapeHtml(e.evrakAdi)} <span class="badge badge-gray">${escapeHtml(e.tur||'Diğer')}</span></div>
        <div class="evrak-meta">${formatTarih(e.tarih)}${e.aciklama?' · '+escapeHtml(e.aciklama):''}${e.dosyaLinki?` · <a href="${escapeHtml(e.dosyaLinki)}" target="_blank" rel="noopener">Dosyayı Aç ↗</a>`:''}</div>
      </div>
      <span class="badge badge-${evrakRengi(e.durum)}">${escapeHtml(e.durum)}</span>
      <button class="btn btn-ghost btn-sm" onclick="evrakModalAc('${e.id}')">Düzenle</button>
    </div>
  `).join('') : '<p class="empty-state">Evrak kaydı bulunamadı.</p>';
}
function evrakModalAc(id){
  const e = id ? evrakTakibi.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Evrak Adı</label><input id="f_evrakAdi" value="${e?escapeHtml(e.evrakAdi):''}" placeholder="örn: Veli Dilekçesi - 5A"></div>
    <div class="form-group"><label>Tür</label><select id="f_tur">${EVRAK_TURLERI.map(t=>`<option ${t===(e?e.tur:'Diğer')?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="form-group"><label>Tarih</label><input type="date" id="f_tarih" value="${e?e.tarih:todayISO()}"></div>
    <div class="form-group"><label>Durum</label><select id="f_durum">${EVRAK_DURUMLARI.map(d=>`<option ${d===(e?e.durum:'Beklemede')?'selected':''}>${d}</option>`).join('')}</select></div>
    <div class="form-group"><label>Dosya Linki (opsiyonel — Drive/OneDrive vb.)</label><input id="f_dosyaLinki" value="${e?escapeHtml(e.dosyaLinki||''):''}" placeholder="https://..."></div>
    <div class="form-group"><label>Açıklama</label><textarea id="f_aciklama" rows="2">${e?escapeHtml(e.aciklama||''):''}</textarea></div>
  `;
  modalAc(e?'Evrak Düzenle':'Evrak Ekle', body, ()=>{
    const evrakAdi = document.getElementById('f_evrakAdi').value.trim();
    if(!evrakAdi){ toast('Evrak adı zorunludur.'); return; }
    kaydet(COL.evrak, e?e.id:null, {
      evrakAdi, tur: document.getElementById('f_tur').value,
      tarih: document.getElementById('f_tarih').value,
      durum: document.getElementById('f_durum').value,
      dosyaLinki: document.getElementById('f_dosyaLinki').value.trim(),
      aciklama: document.getElementById('f_aciklama').value.trim()
    });
    modalKapat();
  }, e ? ()=>{ if(confirm('Bu evrak kaydını silmek istiyor musunuz?')){ db.collection(COL.evrak).doc(e.id).delete(); modalKapat(); } } : null);
}

/* ============== NOTLAR (genel notlar) ============== */
function renderNotlar(){
  let liste = [...notlar].sort((a,b)=>(b.eklenmeTarihi||'').localeCompare(a.eklenmeTarihi||''));
  document.getElementById('notlarGrid').innerHTML = liste.length ? liste.map(n=>`
    <div class="note-card" onclick="notlarModalAc('${n.id}')">
      <div class="note-title">${escapeHtml(n.baslik||'(Başlıksız)')}</div>
      <div class="note-icerik">${escapeHtml((n.icerik||'').slice(0,160))}</div>
      <div class="note-tarih">${formatTarih(n.tarih)}</div>
    </div>
  `).join('') : '<p class="empty-state">Henüz not eklenmedi.</p>';
}
function notlarModalAc(id){
  const n = id ? notlar.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Başlık</label><input id="f_baslik" value="${n?escapeHtml(n.baslik):''}"></div>
    <div class="form-group"><label>İçerik</label><textarea id="f_icerik" rows="6">${n?escapeHtml(n.icerik||''):''}</textarea></div>
    <div class="form-group"><label>Tarih</label><input type="date" id="f_tarih" value="${n?n.tarih:todayISO()}"></div>
  `;
  modalAc(n?'Not Düzenle':'Not Ekle', body, ()=>{
    const baslik = document.getElementById('f_baslik').value.trim();
    const icerik = document.getElementById('f_icerik').value.trim();
    if(!baslik && !icerik){ toast('Başlık veya içerik girilmelidir.'); return; }
    kaydet(COL.notlar, n?n.id:null, { baslik, icerik, tarih: document.getElementById('f_tarih').value });
    modalKapat();
  }, n ? ()=>{ if(confirm('Bu notu silmek istiyor musunuz?')){ db.collection(COL.notlar).doc(n.id).delete(); modalKapat(); } } : null);
}

/* ============== NOT DEFTERİ (öğrenci notları) ============== */
function notFiltreDegisti(){ notSinifFiltreVal = document.getElementById('notSinifFiltre').value; notDersFiltreVal='Tümü'; renderNotDefteri(); }
function renderNotDefteri(){
  const sinifSel = document.getElementById('notSinifFiltre');
  const siniflar = [...new Set(notDefteri.map(n=>n.sinif))].sort((a,b)=>a.localeCompare(b,'tr'));
  sinifSel.innerHTML = '<option>Tümü</option>' + siniflar.map(s=>`<option ${s===notSinifFiltreVal?'selected':''}>${escapeHtml(s)}</option>`).join('');
  notSinifFiltreVal = sinifSel.value;

  const dersSel = document.getElementById('notDersFiltre');
  const dersler = [...new Set(notDefteri.filter(n=> notSinifFiltreVal==='Tümü' || n.sinif===notSinifFiltreVal).map(n=>n.ders))].sort((a,b)=>a.localeCompare(b,'tr'));
  dersSel.innerHTML = '<option>Tümü</option>' + dersler.map(d=>`<option ${d===notDersFiltreVal?'selected':''}>${escapeHtml(d)}</option>`).join('');
  notDersFiltreVal = dersSel.value;

  let liste = notDefteri.filter(n => (notSinifFiltreVal==='Tümü'||n.sinif===notSinifFiltreVal) && (notDersFiltreVal==='Tümü'||n.ders===notDersFiltreVal));
  liste.sort((a,b)=> a.ogrenciAdi.localeCompare(b.ogrenciAdi,'tr') || a.tarih.localeCompare(b.tarih));

  document.getElementById('notTablo').innerHTML = liste.length ? liste.map(n=>`
    <tr>
      <td>${escapeHtml(n.ogrenciAdi)}</td>
      <td>${escapeHtml(n.sinavAdi)}</td>
      <td><strong>${n.not}</strong></td>
      <td>${formatTarih(n.tarih)}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="notModalAc('${n.id}')">Düzenle</button></td>
    </tr>`).join('') : '<tr><td colspan="5" class="empty-state">Kayıt bulunamadı.</td></tr>';

  const gruplar = {};
  liste.forEach(n=>{ (gruplar[n.ogrenciAdi] = gruplar[n.ogrenciAdi]||[]).push(n.not); });
  const ogrenciler = Object.keys(gruplar).sort((a,b)=>a.localeCompare(b,'tr'));
  document.getElementById('notOrtalamaTablo').innerHTML = ogrenciler.length ? ogrenciler.map(ad=>{
    const notlarListesi = gruplar[ad];
    const ort = notlarListesi.reduce((a,b)=>a+b,0)/notlarListesi.length;
    return `<tr><td>${escapeHtml(ad)}</td><td>${notlarListesi.length}</td><td><strong>${ort.toFixed(1)}</strong></td></tr>`;
  }).join('') : '<tr><td colspan="3" class="empty-state">Kayıt bulunamadı.</td></tr>';
}
function notModalAc(id){
  const n = id ? notDefteri.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Öğrenci Adı Soyadı</label><input id="f_ogrenci" value="${n?escapeHtml(n.ogrenciAdi):''}"></div>
    <div class="form-group"><label>Sınıf</label><input id="f_sinif" value="${n?escapeHtml(n.sinif):''}" placeholder="örn: 5-A"></div>
    <div class="form-group"><label>Ders</label><input id="f_ders" value="${n?escapeHtml(n.ders):''}" placeholder="örn: Matematik"></div>
    <div class="form-group"><label>Sınav/Ödev Adı</label><input id="f_sinav" value="${n?escapeHtml(n.sinavAdi):''}" placeholder="örn: 1. Yazılı"></div>
    <div class="form-group"><label>Not (0-100)</label><input type="number" min="0" max="100" id="f_not" value="${n?n.not:''}"></div>
    <div class="form-group"><label>Tarih</label><input type="date" id="f_tarih" value="${n?n.tarih:todayISO()}"></div>
  `;
  modalAc(n?'Not Düzenle':'Not Ekle', body, ()=>{
    const ogrenciAdi = document.getElementById('f_ogrenci').value.trim();
    const sinif = document.getElementById('f_sinif').value.trim();
    const ders = document.getElementById('f_ders').value.trim();
    const sinavAdi = document.getElementById('f_sinav').value.trim();
    const notDeger = parseFloat(document.getElementById('f_not').value);
    const tarih = document.getElementById('f_tarih').value;
    if(!ogrenciAdi || !sinif || !ders || !sinavAdi || isNaN(notDeger) || !tarih){ toast('Tüm alanlar zorunludur.'); return; }
    if(notDeger<0 || notDeger>100){ toast('Not 0-100 arasında olmalıdır.'); return; }
    kaydet(COL.notDefteri, n?n.id:null, { ogrenciAdi, sinif, ders, sinavAdi, not: notDeger, tarih });
    modalKapat();
  }, n ? ()=>{ if(confirm('Bu not kaydını silmek istiyor musunuz?')){ db.collection(COL.notDefteri).doc(n.id).delete(); modalKapat(); } } : null);
}

/* ============== GENEL BAKIŞ (DASHBOARD) ============== */
function renderDashboard(){
  document.getElementById('panelTarih').textContent = bugunMetni();
  const bugunGun = GUNADI[new Date().getDay()];
  document.getElementById('dashStats').innerHTML = `
    <div class="card stat-card"><div class="stat-num">${ogretmenler.length}</div><div class="stat-label">Öğretmen</div></div>
    <div class="card stat-card"><div class="stat-num">${gorevler.filter(g=>g.durum!=='tamamlandi').length}</div><div class="stat-label">Açık Görev</div></div>
    <div class="card stat-card"><div class="stat-num">${hatirlaticilar.filter(h=>!h.tamamlandi).length}</div><div class="stat-label">Bekleyen Hatırlatıcı</div></div>
    <div class="card stat-card"><div class="stat-num">${evrakTakibi.filter(e=>e.durum!=='Tamamlandı' && e.durum!=='Arşivlendi').length}</div><div class="stat-label">Açık Evrak</div></div>
  `;
  const buGunDersler = dersProgrami.filter(d=>d.gun===bugunGun).sort((a,b)=>a.saat-b.saat);
  document.getElementById('dashBugunDersler').innerHTML = !GUNLER.includes(bugunGun) ? '<p class="empty-state">Bugün hafta sonu.</p>' :
    (buGunDersler.length ? buGunDersler.map(d=>`<div class="dash-row"><span class="badge badge-blue">${d.saat}.</span> ${escapeHtml(d.sinif)} — ${escapeHtml(d.ders)} <span style="color:var(--text-muted)">(${escapeHtml(ogretmenAdi(d.ogretmenId))})</span></div>`).join('') : '<p class="empty-state">Bugün için ders programı girilmemiş.</p>');

  const buGunNobet = nobetProgrami.filter(n=>n.gun===bugunGun);
  document.getElementById('dashBugunNobet').innerHTML = !GUNLER.includes(bugunGun) ? '<p class="empty-state">Bugün hafta sonu.</p>' :
    (buGunNobet.length ? buGunNobet.map(n=>`<div class="dash-row">${escapeHtml(n.konum)} — <strong>${escapeHtml(ogretmenAdi(n.ogretmenId))}</strong></div>`).join('') : '<p class="empty-state">Bugün için nöbet ataması yok.</p>');

  const yaklasan = hatirlaticilar.filter(h=>!h.tamamlandi).sort((a,b)=>(a.tarih+(a.saat||'')).localeCompare(b.tarih+(b.saat||''))).slice(0,5);
  document.getElementById('dashHatirlaticilar').innerHTML = yaklasan.length ? yaklasan.map(h=>`<div class="dash-row">${formatTarih(h.tarih)} — ${escapeHtml(h.baslik)}</div>`).join('') : '<p class="empty-state">Bekleyen hatırlatıcı yok.</p>';

  document.getElementById('dashGorevler').innerHTML = `
    <div class="dash-row">Yapılacak: <strong>${gorevler.filter(g=>g.durum==='yapilacak').length}</strong></div>
    <div class="dash-row">Yapılıyor: <strong>${gorevler.filter(g=>g.durum==='yapiliyor').length}</strong></div>
    <div class="dash-row">Tamamlandı: <strong>${gorevler.filter(g=>g.durum==='tamamlandi').length}</strong></div>
  `;
}

/* ============== YEDEKLEME ============== */
function tumVerileriYedekle(){
  const yedek = { tarih: new Date().toISOString(), ogretmenler, dersProgrami, nobetProgrami, hatirlaticilar, gorevler, notDefteri, evrakTakibi, notlar };
  const blob = new Blob([JSON.stringify(yedek,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `okul-yedek-${todayISO()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
async function yedektenGeriYukle(file){
  if(!file) return;
  const metin = await file.text();
  try{
    const data = JSON.parse(metin);
    if(!confirm("Yedekteki kayıtlar mevcut verilerinizin üzerine yazılacak (aynı ID'ye sahip olanlar güncellenecek, yeni olanlar eklenecek). Devam edilsin mi?")) return;
    const eslemeler = [
      [data.ogretmenler, COL.ogretmenler],[data.dersProgrami, COL.dersProgrami],[data.nobetProgrami, COL.nobet],
      [data.hatirlaticilar, COL.hatirlaticilar],[data.gorevler, COL.gorevler],[data.notDefteri, COL.notDefteri],
      [data.evrakTakibi, COL.evrak],[data.notlar, COL.notlar]
    ];
    for(const [liste, koleksiyon] of eslemeler){
      if(!Array.isArray(liste)) continue;
      for(const oge of liste){
        const {id, ...veri} = oge;
        if(id){ await db.collection(koleksiyon).doc(id).set(veri); }
        else { await db.collection(koleksiyon).add(veri); }
      }
    }
    toast('Geri yükleme tamamlandı.');
  }catch(err){
    toast('Geri yükleme hatası: '+err.message);
  }
}

/* ============== FIRESTORE BAĞLANTILARI ============== */
function baglantilariKur(){
  if(baglantilarKuruldu) return;
  baglantilarKuruldu = true;
  db.collection(COL.ogretmenler).onSnapshot(s=>{ ogretmenler = s.docs.map(d=>({id:d.id,...d.data()})); renderOgretmenler(); renderDersGrid(); renderNobetGrid(); renderDashboard(); }, hataGoster);
  db.collection(COL.dersProgrami).onSnapshot(s=>{ dersProgrami = s.docs.map(d=>({id:d.id,...d.data()})); renderDersGrid(); renderDashboard(); }, hataGoster);
  db.collection(COL.nobet).onSnapshot(s=>{ nobetProgrami = s.docs.map(d=>({id:d.id,...d.data()})); renderNobetGrid(); renderDashboard(); }, hataGoster);
  db.collection(COL.hatirlaticilar).onSnapshot(s=>{ hatirlaticilar = s.docs.map(d=>({id:d.id,...d.data()})); renderHatirlaticilar(); renderDashboard(); }, hataGoster);
  db.collection(COL.gorevler).onSnapshot(s=>{ gorevler = s.docs.map(d=>({id:d.id,...d.data()})); renderGorevler(); renderDashboard(); }, hataGoster);
  db.collection(COL.notDefteri).onSnapshot(s=>{ notDefteri = s.docs.map(d=>({id:d.id,...d.data()})); renderNotDefteri(); }, hataGoster);
  db.collection(COL.evrak).onSnapshot(s=>{ evrakTakibi = s.docs.map(d=>({id:d.id,...d.data()})); renderEvrakTakibi(); renderDashboard(); }, hataGoster);
  db.collection(COL.notlar).onSnapshot(s=>{ notlar = s.docs.map(d=>({id:d.id,...d.data()})); renderNotlar(); }, hataGoster);
  db.collection(COL.sosyalKulupler).onSnapshot(s=>{ sosyalKulupler = s.docs.map(d=>({id:d.id,...d.data()})); renderSosyalKulupler(); }, hataGoster);
  db.collection(COL.belirliGunler).onSnapshot(s=>{ belirliGunler = s.docs.map(d=>({id:d.id,...d.data()})); renderBelirliGunler(); }, hataGoster);
  db.collection(COL.zumre).onSnapshot(s=>{ zumreListesi = s.docs.map(d=>({id:d.id,...d.data()})); renderZumre(); }, hataGoster);
  db.collection(COL.sok).onSnapshot(s=>{ sokListesi = s.docs.map(d=>({id:d.id,...d.data()})); renderSok(); }, hataGoster);
  db.collection(COL.bepPlani).onSnapshot(s=>{ bepListesi = s.docs.map(d=>({id:d.id,...d.data()})); renderBepPlani(); }, hataGoster);
  db.collection(COL.rehberlik).onSnapshot(s=>{ rehberlikListesi = s.docs.map(d=>({id:d.id,...d.data()})); renderRehberlik(); }, hataGoster);
  db.collection(COL.maarifRapor).onSnapshot(s=>{ maarifListesi = s.docs.map(d=>({id:d.id,...d.data()})); renderMaarifRapor(); }, hataGoster);
  db.collection(COL.digerEvrak).onSnapshot(s=>{ digerEvrakListesi = s.docs.map(d=>({id:d.id,...d.data()})); renderDigerEvrak(); }, hataGoster);
}

/* ============== UYGULAMA BAŞLATMA / GEZİNME ============== */
function sekmeAc(tab){
  document.querySelectorAll('.nav-tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active', p.id==='tab-'+tab));
}
function uygulamaBaslat(){
  document.getElementById('bugunMetni').textContent = bugunMetni();
  baglantilariKur();
  pushDurumGuncelle();
  pushOnMessageDinleyiciKur();
}

/* ============================================================
   YENİ MODÜLLER: SOSYAL KULÜPLER, BELİRLİ GÜN/HAFTALAR,
   ZÜMRE, ŞÖK, BEP PLANI, REHBERLİK, MAARİF RAPOR, DİĞER EVRAK
   ============================================================ */

const AYLAR_KISALT = ['Eylül','Ekim','Kasım','Aralık','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran'];
const DONEMLER = ['Sene Başı','2.Dönem','Sene Sonu'];

let sosyalKulupler=[], belirliGunler=[], zumreListesi=[], sokListesi=[], bepListesi=[], rehberlikListesi=[], maarifListesi=[], digerEvrakListesi=[];

/* ---- YARDIMCI: tikli tablo ---- */
function tikHucresi(kayitId, alan, deger, koleksiyon){
  const durum = deger ? '✓' : '–';
  const renk = deger ? 'color:var(--sage);font-weight:700;' : 'color:var(--text-muted);';
  return `<td style="text-align:center;cursor:pointer;${renk}" onclick="tikToggle('${koleksiyon}','${kayitId}','${alan}',${!deger})">${durum}</td>`;
}
function tikToggle(koleksiyon, id, alan, yeniDeger){
  if(!db) return;
  db.collection(koleksiyon).doc(id).update({[alan]: yeniDeger}).catch(err=>toast('Hata: '+err.message));
}

/* ============ SOSYAL KULÜPLER ============ */
function renderSosyalKulupler(){
  const el = document.getElementById('sosyalKuluplerTablo');
  if(!el) return;
  if(!sosyalKulupler.length){ el.innerHTML='<p class="empty-state">Henüz kulüp kaydı yok. + butonuyla ekleyin.</p>'; return; }
  const ayAlanlar = ['yillikPlan','topluHizmetPlani',...AYLAR_KISALT.map(a=>a.toLowerCase().replace('ş','s').replace('ı','i').replace('ü','u').replace('ç','c').replace('ğ','g')), 'yilSonuRaporu'];
  const basliklar = ['Yıllık Plan','Toplum Hizmet Planı',...AYLAR_KISALT,'Yıl Sonu Raporu'];
  el.innerHTML = `<table class="table"><thead><tr>
    <th>Kulüp Adı</th><th>Danışman Öğretmen</th>
    ${basliklar.map(b=>`<th style="text-align:center;font-size:11px;">${b}</th>`).join('')}
    <th></th>
  </tr></thead><tbody>
    ${sosyalKulupler.map(k=>`<tr>
      <td><strong>${escapeHtml(k.kulupAdi)}</strong></td>
      <td>${escapeHtml(k.danismanOgretmen||'')}</td>
      ${ayAlanlar.map(a=>tikHucresi(k.id,a,k[a],COL.sosyalKulupler)).join('')}
      <td><button class="btn btn-ghost btn-sm" onclick='sosyalKulupModalAc(${JSON.stringify(k)})'>Düzenle</button></td>
    </tr>`).join('')}
  </tbody></table>`;
}
function sosyalKulupModalAc(k){
  modalAc(k?'Kulüp Düzenle':'Yeni Kulüp', `
    <div class="form-group"><label>Kulüp Adı</label><input id="f_kulupAdi" value="${escapeHtml(k?.kulupAdi||'')}"></div>
    <div class="form-group"><label>Danışman Öğretmen</label><input id="f_danismanOgretmen" value="${escapeHtml(k?.danismanOgretmen||'')}"></div>
  `, ()=>{
    const veri = { kulupAdi: document.getElementById('f_kulupAdi').value.trim(), danismanOgretmen: document.getElementById('f_danismanOgretmen').value.trim() };
    if(!veri.kulupAdi){ toast('Kulüp adı zorunlu.'); return; }
    kaydet(COL.sosyalKulupler, k?.id||null, veri); modalKapat();
  }, k ? ()=>{ if(confirm('Silinsin mi?')){ db.collection(COL.sosyalKulupler).doc(k.id).delete(); modalKapat(); } } : null);
}

/* ============ BELİRLİ GÜN VE HAFTALAR ============ */
function renderBelirliGunler(){
  const el = document.getElementById('belirliGunlerTablo');
  if(!el) return;
  if(!belirliGunler.length){ el.innerHTML='<p class="empty-state">Henüz etkinlik kaydı yok.</p>'; return; }
  el.innerHTML = `<table class="table"><thead><tr>
    <th>Ay</th><th>Tarih</th><th>Belirli Gün / Hafta</th><th>Görevli Öğretmen</th><th style="text-align:center;">Takip</th><th></th>
  </tr></thead><tbody>
    ${belirliGunler.map(g=>`<tr>
      <td>${escapeHtml(g.ay||'')}</td>
      <td>${escapeHtml(g.tarih||'')}</td>
      <td>${escapeHtml(g.etkinlikAdi||'')}</td>
      <td>${escapeHtml(g.gorevliOgretmen||'')}</td>
      ${tikHucresi(g.id,'tamamlandi',g.tamamlandi,COL.belirliGunler)}
      <td><button class="btn btn-ghost btn-sm" onclick='belirliGunModalAc(${JSON.stringify(g)})'>Düzenle</button></td>
    </tr>`).join('')}
  </tbody></table>`;
}
function belirliGunModalAc(g){
  const AYLAR_TR = ['Eylül','Ekim','Kasım','Aralık','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos'];
  modalAc(g?'Etkinlik Düzenle':'Yeni Etkinlik', `
    <div class="form-group"><label>Ay</label><select id="f_ay">${AYLAR_TR.map(a=>`<option ${g?.ay===a?'selected':''}>${a}</option>`).join('')}</select></div>
    <div class="form-group"><label>Tarih / Hafta Bilgisi</label><input id="f_tarihBilgi" value="${escapeHtml(g?.tarih||'')}"></div>
    <div class="form-group"><label>Belirli Gün / Hafta Adı</label><input id="f_etkinlikAdi" value="${escapeHtml(g?.etkinlikAdi||'')}"></div>
    <div class="form-group"><label>Görevli Öğretmen</label><input id="f_gorevliOgretmen" value="${escapeHtml(g?.gorevliOgretmen||'')}"></div>
  `, ()=>{
    const veri = { ay: document.getElementById('f_ay').value, tarih: document.getElementById('f_tarihBilgi').value.trim(), etkinlikAdi: document.getElementById('f_etkinlikAdi').value.trim(), gorevliOgretmen: document.getElementById('f_gorevliOgretmen').value.trim() };
    if(!veri.etkinlikAdi){ toast('Etkinlik adı zorunlu.'); return; }
    kaydet(COL.belirliGunler, g?.id||null, veri); modalKapat();
  }, g ? ()=>{ if(confirm('Silinsin mi?')){ db.collection(COL.belirliGunler).doc(g.id).delete(); modalKapat(); } } : null);
}

/* ============ ZÜMRE ============ */
function renderZumre(){
  const el = document.getElementById('zumreTablo');
  if(!el) return;
  if(!zumreListesi.length){ el.innerHTML='<p class="empty-state">Henüz zümre kaydı yok.</p>'; return; }
  el.innerHTML = `<table class="table"><thead><tr>
    <th>Zümre</th>
    ${DONEMLER.map(d=>`<th style="text-align:center;">${d}</th>`).join('')}
    <th></th>
  </tr></thead><tbody>
    ${zumreListesi.map(z=>`<tr>
      <td><strong>${escapeHtml(z.zumreAdi||'')}</strong></td>
      ${tikHucresi(z.id,'seneBasi',z.seneBasi,COL.zumre)}
      ${tikHucresi(z.id,'ikincDonem',z.ikincDonem,COL.zumre)}
      ${tikHucresi(z.id,'seneSonu',z.seneSonu,COL.zumre)}
      <td><button class="btn btn-ghost btn-sm" onclick='zumreModalAc(${JSON.stringify(z)})'>Düzenle</button></td>
    </tr>`).join('')}
  </tbody></table>`;
}
function zumreModalAc(z){
  modalAc(z?'Zümre Düzenle':'Yeni Zümre', `
    <div class="form-group"><label>Zümre Adı</label><input id="f_zumreAdi" value="${escapeHtml(z?.zumreAdi||'')}"></div>
  `, ()=>{
    const veri = { zumreAdi: document.getElementById('f_zumreAdi').value.trim() };
    if(!veri.zumreAdi){ toast('Zümre adı zorunlu.'); return; }
    kaydet(COL.zumre, z?.id||null, veri); modalKapat();
  }, z ? ()=>{ if(confirm('Silinsin mi?')){ db.collection(COL.zumre).doc(z.id).delete(); modalKapat(); } } : null);
}

/* ============ ŞÖK ============ */
function renderSok(){
  const el = document.getElementById('sokTablo');
  if(!el) return;
  if(!sokListesi.length){ el.innerHTML='<p class="empty-state">Henüz ŞÖK kaydı yok.</p>'; return; }
  el.innerHTML = `<table class="table"><thead><tr>
    <th>Sınıf</th>
    ${DONEMLER.map(d=>`<th style="text-align:center;">${d}</th>`).join('')}
    <th></th>
  </tr></thead><tbody>
    ${sokListesi.map(s=>`<tr>
      <td><strong>${escapeHtml(s.sinif||'')}</strong></td>
      ${tikHucresi(s.id,'seneBasi',s.seneBasi,COL.sok)}
      ${tikHucresi(s.id,'ikincDonem',s.ikincDonem,COL.sok)}
      ${tikHucresi(s.id,'seneSonu',s.seneSonu,COL.sok)}
      <td><button class="btn btn-ghost btn-sm" onclick='sokModalAc(${JSON.stringify(s)})'>Düzenle</button></td>
    </tr>`).join('')}
  </tbody></table>`;
}
function sokModalAc(s){
  modalAc(s?'ŞÖK Düzenle':'Yeni ŞÖK Kaydı', `
    <div class="form-group"><label>Sınıf</label><input id="f_sokSinif" value="${escapeHtml(s?.sinif||'')}"></div>
  `, ()=>{
    const veri = { sinif: document.getElementById('f_sokSinif').value.trim() };
    if(!veri.sinif){ toast('Sınıf zorunlu.'); return; }
    kaydet(COL.sok, s?.id||null, veri); modalKapat();
  }, s ? ()=>{ if(confirm('Silinsin mi?')){ db.collection(COL.sok).doc(s.id).delete(); modalKapat(); } } : null);
}

/* ============ BEP PLANI ============ */
function renderBepPlani(){
  const el = document.getElementById('bepTablo');
  if(!el) return;
  if(!bepListesi.length){ el.innerHTML='<p class="empty-state">Henüz BEP/Yıllık Plan kaydı yok.</p>'; return; }
  el.innerHTML = `<table class="table"><thead><tr>
    <th>Öğretmen</th>
    <th style="text-align:center;">Yıllık Plan</th>
    <th style="text-align:center;">BEP</th>
    <th></th>
  </tr></thead><tbody>
    ${bepListesi.map(b=>`<tr>
      <td><strong>${escapeHtml(b.ogretmenAdi||'')}</strong></td>
      ${tikHucresi(b.id,'yillikPlan',b.yillikPlan,COL.bepPlani)}
      ${tikHucresi(b.id,'bep',b.bep,COL.bepPlani)}
      <td><button class="btn btn-ghost btn-sm" onclick='bepModalAc(${JSON.stringify(b)})'>Düzenle</button></td>
    </tr>`).join('')}
  </tbody></table>`;
}
function bepModalAc(b){
  modalAc(b?'Kayıt Düzenle':'Yeni BEP/Yıllık Plan Kaydı', `
    <div class="form-group"><label>Öğretmen Adı</label><input id="f_bepOgretmen" value="${escapeHtml(b?.ogretmenAdi||'')}"></div>
  `, ()=>{
    const veri = { ogretmenAdi: document.getElementById('f_bepOgretmen').value.trim() };
    if(!veri.ogretmenAdi){ toast('Öğretmen adı zorunlu.'); return; }
    kaydet(COL.bepPlani, b?.id||null, veri); modalKapat();
  }, b ? ()=>{ if(confirm('Silinsin mi?')){ db.collection(COL.bepPlani).doc(b.id).delete(); modalKapat(); } } : null);
}

/* ============ REHBERLİK ============ */
function renderRehberlik(){
  const el = document.getElementById('rehberlikTablo');
  if(!el) return;
  if(!rehberlikListesi.length){ el.innerHTML='<p class="empty-state">Henüz rehberlik kaydı yok.</p>'; return; }
  el.innerHTML = `<table class="table"><thead><tr>
    <th>Sınıf</th><th>Danışman Öğretmen</th>
    <th style="text-align:center;">Yıllık Plan</th>
    <th style="text-align:center;">Dönem Sonu</th>
    <th style="text-align:center;">Yıl Sonu</th>
    ${AYLAR_KISALT.map(a=>`<th style="text-align:center;font-size:11px;">${a}</th>`).join('')}
    <th></th>
  </tr></thead><tbody>
    ${rehberlikListesi.map(r=>`<tr>
      <td><strong>${escapeHtml(r.sinif||'')}</strong></td>
      <td>${escapeHtml(r.danismanOgretmen||'')}</td>
      ${tikHucresi(r.id,'yillikPlan',r.yillikPlan,COL.rehberlik)}
      ${tikHucresi(r.id,'donemSonuRaporu',r.donemSonuRaporu,COL.rehberlik)}
      ${tikHucresi(r.id,'yilSonuRaporu',r.yilSonuRaporu,COL.rehberlik)}
      ${AYLAR_KISALT.map(a=>{const key='ay_'+a.toLowerCase().replace(/[şğıüöç]/g,c=>({ş:'s',ğ:'g',ı:'i',ü:'u',ö:'o',ç:'c'}[c]||c)); return tikHucresi(r.id,key,r[key],COL.rehberlik);}).join('')}
      <td><button class="btn btn-ghost btn-sm" onclick='rehberlikModalAc(${JSON.stringify(r)})'>Düzenle</button></td>
    </tr>`).join('')}
  </tbody></table>`;
}
function rehberlikModalAc(r){
  modalAc(r?'Kayıt Düzenle':'Yeni Rehberlik Kaydı', `
    <div class="form-group"><label>Sınıf</label><input id="f_rhSinif" value="${escapeHtml(r?.sinif||'')}"></div>
    <div class="form-group"><label>Danışman Öğretmen</label><input id="f_rhDanisman" value="${escapeHtml(r?.danismanOgretmen||'')}"></div>
  `, ()=>{
    const veri = { sinif: document.getElementById('f_rhSinif').value.trim(), danismanOgretmen: document.getElementById('f_rhDanisman').value.trim() };
    if(!veri.sinif){ toast('Sınıf zorunlu.'); return; }
    kaydet(COL.rehberlik, r?.id||null, veri); modalKapat();
  }, r ? ()=>{ if(confirm('Silinsin mi?')){ db.collection(COL.rehberlik).doc(r.id).delete(); modalKapat(); } } : null);
}

/* ============ MAARİF MODEL AYLIK RAPORLAR ============ */
function renderMaarifRapor(){
  const el = document.getElementById('maarifTablo');
  if(!el) return;
  if(!maarifListesi.length){ el.innerHTML='<p class="empty-state">Henüz rapor kaydı yok.</p>'; return; }
  const siniflar = [...new Set(maarifListesi.map(m=>m.sinif))].sort();
  el.innerHTML = siniflar.map(sinif=>{
    const kayitlar = maarifListesi.filter(m=>m.sinif===sinif);
    return `<h3 style="margin:18px 0 8px;">${escapeHtml(sinif)}. Sınıf</h3>
    <table class="table"><thead><tr>
      <th>Ders</th>
      ${AYLAR_KISALT.map(a=>`<th style="text-align:center;font-size:11px;">${a}</th>`).join('')}
      <th style="text-align:center;font-size:11px;">Sene Sonu</th>
      <th></th>
    </tr></thead><tbody>
      ${kayitlar.map(m=>`<tr>
        <td><strong>${escapeHtml(m.ders||'')}</strong></td>
        ${AYLAR_KISALT.map(a=>{const key='ay_'+a.toLowerCase().replace(/[şğıüöç]/g,c=>({ş:'s',ğ:'g',ı:'i',ü:'u',ö:'o',ç:'c'}[c]||c)); return tikHucresi(m.id,key,m[key],COL.maarifRapor);}).join('')}
        ${tikHucresi(m.id,'seneSonu',m.seneSonu,COL.maarifRapor)}
        <td><button class="btn btn-ghost btn-sm" onclick='maarifModalAc(${JSON.stringify(m)})'>Düzenle</button></td>
      </tr>`).join('')}
    </tbody></table>`;
  }).join('');
}
function maarifModalAc(m){
  modalAc(m?'Kayıt Düzenle':'Yeni Rapor Kaydı', `
    <div class="form-group"><label>Sınıf (örn: 5, 6, 7, 8)</label><input id="f_mrSinif" value="${escapeHtml(m?.sinif||'')}"></div>
    <div class="form-group"><label>Ders</label><input id="f_mrDers" value="${escapeHtml(m?.ders||'')}"></div>
  `, ()=>{
    const veri = { sinif: document.getElementById('f_mrSinif').value.trim(), ders: document.getElementById('f_mrDers').value.trim() };
    if(!veri.sinif||!veri.ders){ toast('Sınıf ve ders zorunlu.'); return; }
    kaydet(COL.maarifRapor, m?.id||null, veri); modalKapat();
  }, m ? ()=>{ if(confirm('Silinsin mi?')){ db.collection(COL.maarifRapor).doc(m.id).delete(); modalKapat(); } } : null);
}

/* ============ DİĞER EVRAKLAR ============ */
function renderDigerEvrak(){
  const el = document.getElementById('digerEvrakTablo');
  if(!el) return;
  if(!digerEvrakListesi.length){ el.innerHTML='<p class="empty-state">Henüz evrak kaydı yok.</p>'; return; }
  el.innerHTML = `<table class="table"><thead><tr>
    <th>Öğretmen</th><th>Evrak Çeşidi</th><th>Sınıf</th><th>Tarih</th><th></th>
  </tr></thead><tbody>
    ${digerEvrakListesi.sort((a,b)=>(b.tarih||'').localeCompare(a.tarih||'')).map(e=>`<tr>
      <td>${escapeHtml(e.ogretmen||'')}</td>
      <td>${escapeHtml(e.evrakCesidi||'')}</td>
      <td>${escapeHtml(e.sinif||'')}</td>
      <td>${formatTarih(e.tarih?.slice?.(0,10)||e.tarih||'')}</td>
      <td><button class="btn btn-ghost btn-sm" onclick='digerEvrakModalAc(${JSON.stringify(e)})'>Düzenle</button></td>
    </tr>`).join('')}
  </tbody></table>`;
}
function digerEvrakModalAc(e){
  modalAc(e?'Evrak Düzenle':'Yeni Evrak', `
    <div class="form-group"><label>Öğretmen</label><input id="f_deOgretmen" value="${escapeHtml(e?.ogretmen||'')}"></div>
    <div class="form-group"><label>Evrak Çeşidi</label><input id="f_deEvrakCesidi" value="${escapeHtml(e?.evrakCesidi||'')}"></div>
    <div class="form-group"><label>Sınıf</label><input id="f_deSinif" value="${escapeHtml(e?.sinif||'')}"></div>
    <div class="form-group"><label>Tarih</label><input type="date" id="f_deTarih" value="${e?.tarih?.slice?.(0,10)||''}"></div>
  `, ()=>{
    const veri = { ogretmen: document.getElementById('f_deOgretmen').value.trim(), evrakCesidi: document.getElementById('f_deEvrakCesidi').value.trim(), sinif: document.getElementById('f_deSinif').value.trim(), tarih: document.getElementById('f_deTarih').value };
    if(!veri.ogretmen){ toast('Öğretmen adı zorunlu.'); return; }
    kaydet(COL.digerEvrak, e?.id||null, veri); modalKapat();
  }, e ? ()=>{ if(confirm('Silinsin mi?')){ db.collection(COL.digerEvrak).doc(e.id).delete(); modalKapat(); } } : null);
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('.nav-tab').forEach(btn=>{
    btn.addEventListener('click', ()=> sekmeAc(btn.dataset.tab));
  });
  document.getElementById('modalOverlay').addEventListener('click', e=>{ if(e.target.id==='modalOverlay') modalKapat(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') modalKapat(); });
  document.getElementById('loginForm').addEventListener('submit', girisYap);
  document.getElementById('cikisBtn').addEventListener('click', cikisYap);
  document.getElementById('bildirimAcBtn').addEventListener('click', bildirimleriAc);

  if(firebaseyiBaslat()){
    authDinleyiciKur();
  }
});
