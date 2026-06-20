/* ====================================================================
   ANA UYGULAMA MANTIĞI
   ==================================================================== */

const GUNLER = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];
const GUNADI = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const ONCELIKLER = ['Düşük','Orta','Yüksek'];
const EVRAK_TURLERI = ['Gelen Evrak','Giden Evrak','İç Yazışma','Tutanak','Diğer'];
const EVRAK_DURUMLARI = ['Beklemede','İşlemde','Tamamlandı','Arşivlendi'];

let ogretmenler=[], dersProgrami=[], hatirlaticilar=[], gorevler=[], evrakTakibi=[], notlar=[];
let seciliSinif = '';
let hatirlaticiFiltre = 'tumu';
let evrakFiltre = 'tumu';
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
  let liste = ogretmenler.filter(o => !arama || (o.ad+' '+o.soyad+' '+(o.brans||'')+' '+(o.unvan||'')).toLocaleLowerCase('tr').includes(arama));
  liste.sort((a,b)=>a.ad.localeCompare(b.ad,'tr'));
  document.getElementById('ogretmenlerTablo').innerHTML = liste.length ? liste.map(o=>`
    <tr class="row-clickable" onclick="ogretmenDetayAc('${o.id}')">
      <td>${escapeHtml(o.ad+' '+o.soyad)}</td>
      <td>${escapeHtml(o.unvan||'Öğretmen')}</td>
      <td>${escapeHtml(o.brans||'—')}</td>
      <td>${escapeHtml(o.telefon||'—')}</td>
      <td>${escapeHtml(o.eposta||'—')}</td>
      <td>${escapeHtml(o.sorumluSinif||'—')}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); ogretmenModalAc('${o.id}')">Düzenle</button></td>
    </tr>`).join('') : `<tr><td colspan="7" class="empty-state">Henüz öğretmen eklenmedi.</td></tr>`;
}
const OGRETMEN_UNVANLARI = ['Öğretmen','Müdür','Müdür Yardımcısı','Rehber Öğretmen','İdari Personel'];
function ogretmenModalAc(id){
  const o = id ? ogretmenler.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Ad</label><input id="f_ad" value="${o?escapeHtml(o.ad):''}"></div>
    <div class="form-group"><label>Soyad</label><input id="f_soyad" value="${o?escapeHtml(o.soyad):''}"></div>
    <div class="form-group"><label>Ünvan</label>
      <input id="f_unvan" list="unvanListesi" value="${o?escapeHtml(o.unvan||''):''}" placeholder="örn: Öğretmen">
      <datalist id="unvanListesi">${OGRETMEN_UNVANLARI.map(u=>`<option value="${u}">`).join('')}</datalist>
    </div>
    <div class="form-group"><label>Branş</label><input id="f_brans" value="${o?escapeHtml(o.brans||''):''}" placeholder="örn: Matematik"></div>
    <div class="form-row">
      <div class="form-group"><label>Derece</label><select id="f_derece"><option value="">—</option>${[1,2,3,4,5,6,7,8,9].map(n=>`<option value="${n}" ${o&&o.derece===n?'selected':''}>${n}</option>`).join('')}</select></div>
      <div class="form-group"><label>Kademe</label><select id="f_kademe"><option value="">—</option>${[1,2,3].map(n=>`<option value="${n}" ${o&&o.kademe===n?'selected':''}>${n}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label>Telefon</label><input id="f_telefon" value="${o?escapeHtml(o.telefon||''):''}"></div>
    <div class="form-group"><label>E-posta</label><input id="f_eposta" value="${o?escapeHtml(o.eposta||''):''}"></div>
    <div class="form-row">
      <div class="form-group"><label>Cinsiyet</label><select id="f_cinsiyet">
        <option value="" ${o&&o.cinsiyet?'':'selected'}>Belirtilmedi</option>
        <option value="kadin" ${o&&o.cinsiyet==='kadin'?'selected':''}>Kadın</option>
        <option value="erkek" ${o&&o.cinsiyet==='erkek'?'selected':''}>Erkek</option>
      </select></div>
      <div class="form-group"><label>Sorumlu Sınıf (opsiyonel)</label><input id="f_sorumluSinif" value="${o?escapeHtml(o.sorumluSinif||''):''}"></div>
    </div>
    <div class="form-group"><label>Notlar</label><textarea id="f_notlar" rows="2">${o?escapeHtml(o.notlar||''):''}</textarea></div>
  `;
  modalAc(o?'Öğretmen Düzenle':'Öğretmen Ekle', body, ()=>{
    const ad = document.getElementById('f_ad').value.trim();
    const soyad = document.getElementById('f_soyad').value.trim();
    if(!ad || !soyad){ toast('Ad ve soyad zorunludur.'); return; }
    const dereceVal = document.getElementById('f_derece').value;
    const kademeVal = document.getElementById('f_kademe').value;
    kaydet(COL.ogretmenler, o?o.id:null, {
      ad, soyad,
      unvan: document.getElementById('f_unvan').value.trim(),
      brans: document.getElementById('f_brans').value.trim(),
      derece: dereceVal ? parseInt(dereceVal) : null,
      kademe: kademeVal ? parseInt(kademeVal) : null,
      telefon: document.getElementById('f_telefon').value.trim(),
      eposta: document.getElementById('f_eposta').value.trim(),
      cinsiyet: document.getElementById('f_cinsiyet').value,
      sorumluSinif: document.getElementById('f_sorumluSinif').value.trim(),
      notlar: document.getElementById('f_notlar').value.trim(),
    });
    modalKapat();
  }, o ? ()=>{ if(confirm('Bu öğretmeni silmek istediğinize emin misiniz?')){ db.collection(COL.ogretmenler).doc(o.id).delete(); modalKapat(); } } : null);
}

/* ============== DERS PROGRAMI ============== */
function dersSiniflari(){ return sinifAdlari(); }
function sinifDegisti(v){ seciliSinif = v; renderDersGrid(); }
function yeniSinifEkleDers(){
  // Sınıf tanımları artık Sınıflar modülünden yönetiliyor.
  sinifModalAc();
}
function renderDersGrid(){
  const sel = document.getElementById('dersSinifSecimi');
  const siniflar = dersSiniflari();
  if(!seciliSinif && siniflar.length) seciliSinif = siniflar[0];
  sel.innerHTML = siniflar.length ? siniflar.map(s=>`<option ${s===seciliSinif?'selected':''}>${escapeHtml(s)}</option>`).join('') : '<option>Sınıf eklenmedi</option>';
  const bugun = GUNADI[new Date().getDay()];
  let html = '<thead><tr><th>Saat</th>' + GUNLER.map(g=>`<th class="${g===bugun?'bugun-kolon':''}">${g}</th>`).join('') + '</tr></thead><tbody>';
  for(let saat=1; saat<=7; saat++){
    const bilgi = dersSaatiBilgisi(saat);
    const saatEtiket = bilgi ? `${saat}. <span class="sch-saat-zaman">${bilgi.baslangic}–${bilgi.bitis}</span>` : `${saat}.`;
    html += `<tr><td class="sch-saat">${saatEtiket}</td>`;
    for(const gun of GUNLER){
      const giris = dersProgrami.find(d=>d.sinif===seciliSinif && d.gun===gun && d.saat===saat);
      if(giris){
        html += `<td class="sch-cell sch-filled" onclick="dersModalAcById('${gun}',${saat},'${giris.id}')"><div class="sch-ders">${escapeHtml(giris.ders)}</div><div class="sch-ogretmen">${escapeHtml(ogretmenAdi(giris.ogretmenId))}</div></td>`;
      } else {
        html += `<td class="sch-cell sch-empty" onclick="dersModalAcById('${gun}',${saat},'')">+</td>`;
      }
    }
    html += '</tr>';
    const ara = sonrakiSegmentBilgisi(saat);
    if(ara && ara.fark>0){
      const araEtiket = ara.sonrakiTip==='ogle' ? `Öğle Arası (${ara.fark} dk)` : `Teneffüs (${ara.fark} dk)`;
      html += `<tr class="sch-ara-row"><td colspan="${GUNLER.length+1}">${araEtiket}</td></tr>`;
    }
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
    <div class="form-group"><label>Ders Saati</label><select id="f_saat">${[1,2,3,4,5,6,7].map(s=>`<option ${s===saat?'selected':''}>${s}</option>`).join('')}</select></div>
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

/* Nöbet Programı: bkz. js/nobet.js (tarih bazlı aylık modül) */

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
        <div class="reminder-meta">${formatTarih(h.tarih)}${h.saat?' · '+h.saat:''}${h.kategori?' · '+escapeHtml(h.kategori):''}${h.aciklama?' · '+escapeHtml(h.aciklama):''}</div>
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

/* ============== GENEL BAKIŞ (DASHBOARD) ============== */
function renderDashboard(){
  document.getElementById('panelTarih').textContent = bugunMetni();
  const bugunGun = GUNADI[new Date().getDay()];
  const toplamOgrenci = siniflar.reduce((t,s)=>t+(parseInt(s.ogrenciSayisi)||0),0);
  const kadinOgretmen = ogretmenler.filter(o=>o.cinsiyet==='kadin').length;
  const erkekOgretmen = ogretmenler.filter(o=>o.cinsiyet==='erkek').length;
  document.getElementById('dashStats').innerHTML = `
    <div class="card stat-card"><div class="stat-num">${ogretmenler.length}</div><div class="stat-label">Öğretmen</div></div>
    <div class="card stat-card"><div class="stat-num">${siniflar.length}</div><div class="stat-label">Sınıf</div></div>
    <div class="card stat-card"><div class="stat-num">${toplamOgrenci}</div><div class="stat-label">Öğrenci</div></div>
    <div class="card stat-card"><div class="stat-num">${kadinOgretmen} / ${erkekOgretmen}</div><div class="stat-label">Kadın / Erkek Öğretmen</div></div>
    <div class="card stat-card"><div class="stat-num">${gorevler.filter(g=>g.durum!=='tamamlandi').length}</div><div class="stat-label">Açık Görev</div></div>
    <div class="card stat-card"><div class="stat-num">${hatirlaticilar.filter(h=>!h.tamamlandi).length}</div><div class="stat-label">Bekleyen Hatırlatıcı</div></div>
    <div class="card stat-card"><div class="stat-num">${evrakTakibi.filter(e=>e.durum!=='Tamamlandı' && e.durum!=='Arşivlendi').length}</div><div class="stat-label">Açık Evrak</div></div>
  `;
  const buGunDersler = dersProgrami.filter(d=>d.gun===bugunGun).sort((a,b)=>a.saat-b.saat);
  document.getElementById('dashBugunDersler').innerHTML = !GUNLER.includes(bugunGun) ? '<p class="empty-state">Bugün hafta sonu.</p>' :
    (buGunDersler.length ? buGunDersler.map(d=>`<div class="dash-row"><span class="badge badge-blue">${d.saat}.</span> ${escapeHtml(d.sinif)} — ${escapeHtml(d.ders)} <span style="color:var(--text-muted)">(${escapeHtml(ogretmenAdi(d.ogretmenId))})</span></div>`).join('') : '<p class="empty-state">Bugün için ders programı girilmemiş.</p>');

  /* "Bugün Nöbetçi Öğretmenler" kartı artık js/nobet.js > renderNobetBugunVeHafta() tarafından dolduruluyor. */

  const yaklasan = hatirlaticilar.filter(h=>!h.tamamlandi).sort((a,b)=>(a.tarih+(a.saat||'')).localeCompare(b.tarih+(b.saat||''))).slice(0,5);
  document.getElementById('dashHatirlaticilar').innerHTML = yaklasan.length ? yaklasan.map(h=>`<div class="dash-row">${formatTarih(h.tarih)} — ${escapeHtml(h.baslik)}</div>`).join('') : '<p class="empty-state">Bekleyen hatırlatıcı yok.</p>';

  document.getElementById('dashGorevler').innerHTML = `
    <div class="dash-row">Yapılacak: <strong>${gorevler.filter(g=>g.durum==='yapilacak').length}</strong></div>
    <div class="dash-row">Yapılıyor: <strong>${gorevler.filter(g=>g.durum==='yapiliyor').length}</strong></div>
    <div class="dash-row">Tamamlandı: <strong>${gorevler.filter(g=>g.durum==='tamamlandi').length}</strong></div>
  `;

  /* ---- Son Notlar ---- */
  const notlarEl = document.getElementById('dashNotlar');
  if(notlarEl){
    const sonNotlar = [...notlar].sort((a,b)=>(b.eklenmeTarihi||'').localeCompare(a.eklenmeTarihi||'')).slice(0,4);
    notlarEl.innerHTML = sonNotlar.length ? sonNotlar.map(n=>`<div class="dash-row" style="cursor:pointer;" onclick="notlarModalAc('${n.id}')"><strong>${escapeHtml(n.baslik||'(Başlıksız)')}</strong> — ${escapeHtml((n.icerik||'').slice(0,70))}</div>`).join('') : '<p class="empty-state">Henüz not eklenmedi.</p>';
  }

  /* ---- Zil sayacı + şu anki ders saatindeki sınıflar ---- */
  renderZilSayaci(bugunGun);
}

function renderZilSayaci(bugunGun){
  const zilEl = document.getElementById('zilWidget');
  const suankiEl = document.getElementById('dashSuankiDers');
  if(!zilEl) return;
  if(!GUNLER.includes(bugunGun)){
    zilEl.innerHTML = `<div class="zil-durum">Bugün hafta sonu — okul saatleri geçerli değil.</div>`;
    if(suankiEl) suankiEl.innerHTML = '<p class="empty-state">Bugün hafta sonu.</p>';
    return;
  }
  const durum = suankiDersDurumu();
  if(durum.durum==='yok'){
    zilEl.innerHTML = `<div class="zil-durum">Ders saatleri henüz Ayarlar sayfasından girilmedi.</div>`;
    if(suankiEl) suankiEl.innerHTML = '<p class="empty-state">Ders saatleri girilmeden gösterilemiyor.</p>';
    return;
  }
  const etiketler = { ders:'Şu an ders saatinde', teneffus:'Teneffüste / derse hazırlanılıyor', ogle:'Öğle arasında', bitti:'Ders saatleri sona erdi' };
  if(durum.durum==='bitti'){
    zilEl.innerHTML = `<div class="zil-durum">Bugünün ders saatleri sona erdi.</div>`;
  } else {
    const altMetin = durum.durum==='ders' ? `${durum.etiket} bitimine kalan süre`
      : durum.durum==='ogle' ? 'Öğle arası bitimine kalan süre'
      : `${durum.etiket} başlamasına kalan süre`;
    zilEl.innerHTML = `
      <div><div class="zil-etiket">${etiketler[durum.durum]}</div><div class="zil-alt">${altMetin}</div></div>
      <div class="zil-sayac">${durum.kalanDk} <span>dk</span></div>
    `;
  }
  if(suankiEl){
    if(durum.durum==='ders'){
      const buSaatDersler = dersProgrami.filter(d=>d.gun===bugunGun && d.saat===durum.saat);
      suankiEl.innerHTML = buSaatDersler.length ? buSaatDersler.map(d=>`<div class="dash-row">${escapeHtml(d.sinif)} — ${escapeHtml(d.ders)} <span style="color:var(--ink-muted)">(${escapeHtml(ogretmenAdi(d.ogretmenId))})</span></div>`).join('') : '<p class="empty-state">Bu saat için ders programı girilmemiş.</p>';
    } else if(durum.durum==='ogle'){
      suankiEl.innerHTML = '<p class="empty-state">Şu an öğle arası.</p>';
    } else {
      suankiEl.innerHTML = `<p class="empty-state">Şu an teneffüs — sıradaki: ${escapeHtml(durum.etiket)}.</p>`;
    }
  }
}

/* ============== YEDEKLEME ============== */
function tumVerileriYedekle(){
  const yedek = {
    tarih: new Date().toISOString(), ogretmenler, dersProgrami, hatirlaticilar, gorevler, evrakTakibi, notlar,
    nobetYerleri, nobetAtamalari, nobetciAmirleri, resmiTatiller, periyodikIsler,
    dersSaatleriAyarlari: dersSaatleriAyarlari || undefined,
    siniflar,
    sosyalKulupler: cizelgeVerileri.sosyalKulupler, sok: cizelgeVerileri.sok, zumre: cizelgeVerileri.zumre,
    bepPlani: cizelgeVerileri.bepPlani, rehberlik: cizelgeVerileri.rehberlik, maarifRapor: cizelgeVerileri.maarifRapor,
    belirliGunler: belirliGunlerListesi, digerEvrak: digerEvrakListesi
  };
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
      [data.ogretmenler, COL.ogretmenler],[data.dersProgrami, COL.dersProgrami],
      [data.siniflar, COL.siniflar],
      [data.nobetYerleri, COL.nobetYerleri],[data.nobetAtamalari, COL.nobetAtamalari],
      [data.nobetciAmirleri, COL.nobetciAmirleri],[data.resmiTatiller, COL.resmiTatiller],
      [data.hatirlaticilar, COL.hatirlaticilar],[data.gorevler, COL.gorevler],
      [data.evrakTakibi, COL.evrak],[data.notlar, COL.notlar],
      [data.sosyalKulupler, COL.sosyalKulupler],[data.sok, COL.sok],[data.zumre, COL.zumre],
      [data.bepPlani, COL.bepPlani],[data.rehberlik, COL.rehberlik],[data.maarifRapor, COL.maarifRapor],
      [data.belirliGunler, COL.belirliGunler],[data.digerEvrak, COL.digerEvrak],
      [data.periyodikIsler, COL.periyodikIsler]
    ];
    for(const [liste, koleksiyon] of eslemeler){
      if(!Array.isArray(liste)) continue;
      for(const oge of liste){
        const {id, ...veri} = oge;
        if(id){ await db.collection(koleksiyon).doc(id).set(veri); }
        else { await db.collection(koleksiyon).add(veri); }
      }
    }
    if(data.dersSaatleriAyarlari){
      await db.collection(COL.dersSaatleri).doc('ayarlar').set(data.dersSaatleriAyarlari);
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
  db.collection(COL.ogretmenler).onSnapshot(s=>{ ogretmenler = s.docs.map(d=>({id:d.id,...d.data()})); renderOgretmenler(); renderDersGrid(); renderDashboard(); }, hataGoster);
  db.collection(COL.dersProgrami).onSnapshot(s=>{ dersProgrami = s.docs.map(d=>({id:d.id,...d.data()})); renderDersGrid(); renderDashboard(); }, hataGoster);
  db.collection(COL.siniflar).onSnapshot(s=>{ siniflar = s.docs.map(d=>({id:d.id,...d.data()})); renderSiniflar(); renderDersGrid(); renderDashboard(); }, hataGoster);
  nobetBaglantilariKur();
  db.collection(COL.hatirlaticilar).onSnapshot(s=>{ hatirlaticilar = s.docs.map(d=>({id:d.id,...d.data()})); renderHatirlaticilar(); renderDashboard(); }, hataGoster);
  db.collection(COL.gorevler).onSnapshot(s=>{ gorevler = s.docs.map(d=>({id:d.id,...d.data()})); renderGorevler(); renderDashboard(); }, hataGoster);
  db.collection(COL.evrak).onSnapshot(s=>{ evrakTakibi = s.docs.map(d=>({id:d.id,...d.data()})); renderEvrakTakibi(); renderDashboard(); }, hataGoster);
  db.collection(COL.notlar).onSnapshot(s=>{ notlar = s.docs.map(d=>({id:d.id,...d.data()})); renderNotlar(); }, hataGoster);

  ['sosyalKulupler','sok','zumre','bepPlani','rehberlik','maarifRapor'].forEach(tip=>{
    db.collection(COL[tip]).onSnapshot(s=>{ cizelgeVerileri[tip] = s.docs.map(d=>({id:d.id,...d.data()})); renderCizelge(tip); }, hataGoster);
  });
  db.collection(COL.belirliGunler).onSnapshot(s=>{ belirliGunlerListesi = s.docs.map(d=>({id:d.id,...d.data()})); renderBelirliGunler(); }, hataGoster);
  db.collection(COL.digerEvrak).onSnapshot(s=>{ digerEvrakListesi = s.docs.map(d=>({id:d.id,...d.data()})); renderDigerEvrak(); }, hataGoster);
  periyodikBaglantilariKur();
  db.collection(COL.dersSaatleri).doc('ayarlar').onSnapshot(doc=>{
    dersSaatleriAyarlari = doc.exists ? doc.data() : null;
    renderDersSaatleriForm(); renderDersGrid(); renderDashboard();
  }, hataGoster);
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
  setInterval(()=>{ renderZilSayaci(GUNADI[new Date().getDay()]); }, 30000);
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('.nav-tab').forEach(btn=>{
    btn.addEventListener('click', ()=> sekmeAc(btn.dataset.tab));
  });
  document.getElementById('modalOverlay')?.addEventListener('click', e=>{ if(e.target.id==='modalOverlay') modalKapat(); });
  document.getElementById('detayOverlay')?.addEventListener('click', e=>{ if(e.target.id==='detayOverlay') detayPanelKapat(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ modalKapat(); detayPanelKapat(); } });
  document.getElementById('bildirimAcBtn')?.addEventListener('click', bildirimleriAc);

  try{
    if(firebaseyiBaslat()){
      authDinleyiciKur();
    }
  }catch(err){
    console.error('Başlatma hatası:', err);
    const app = document.getElementById('app');
    if(app) app.classList.add('ready','show');
  }
});
