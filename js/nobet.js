/* ====================================================================
   js/nobet.js
   YENİ NÖBET MODÜLÜ — tarih bazlı aylık sistem (haftalık yapının yerine).
   Veri modeli (bkz. firebase-init.js COL):
     nobetYerleri    : {ad, sira}                                  — dinamik nöbet konumları (sütunlar)
     nobetAtamalari  : {tarih:'YYYY-MM-DD', yerId, ogretmenAdSoyad} — bir hücre = bir atama
     nobetciAmirleri : {tarih:'YYYY-MM-DD', ad, telefon}            — günün nöbetçi amiri (serbest metin)
     resmiTatiller   : {tarih:'YYYY-MM-DD', aciklama}               — silinebilir/eklenebilir tatil listesi
   ==================================================================== */
let nobetYerleri = [];
let nobetAtamalari = [];
let nobetciAmirleri = [];
let resmiTatiller = [];
let nobetGoruntulenenYil, nobetGoruntulenenAy; // 0-11

(function nobetAyiBugunSet(){
  const d = new Date();
  nobetGoruntulenenYil = d.getFullYear();
  nobetGoruntulenenAy = d.getMonth();
})();

/* ---------- yardımcılar ---------- */
function nobetTarihISO(y,m,d){ return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function nobetHaftasonuMu(y,m,d){ const g = new Date(y,m,d).getDay(); return g===0 || g===6; }
function nobetTatilMi(iso){ return resmiTatiller.find(t=>t.tarih===iso); }
function nobetAyAdiUzun(y,m){ return `${AYLAR[m]} ${y}`; }
function nobetYerSirali(){ return [...nobetYerleri].sort((a,b)=>(a.sira||0)-(b.sira||0)); }
function nobetHaftaAraligi(tarihISO){
  const d = new Date(tarihISO+'T00:00:00');
  const gun = d.getDay() || 7; // Pazartesi=1 ... Pazar=7
  const pazartesi = new Date(d); pazartesi.setDate(d.getDate()-gun+1);
  const gunler = [];
  for(let i=0;i<5;i++){ const x=new Date(pazartesi); x.setDate(pazartesi.getDate()+i); gunler.push(nobetTarihISO(x.getFullYear(), x.getMonth(), x.getDate())); }
  return gunler;
}

/* ---------- AY GEZİNME ---------- */
function nobetAyDegistir(delta){
  nobetGoruntulenenAy += delta;
  if(nobetGoruntulenenAy<0){ nobetGoruntulenenAy=11; nobetGoruntulenenYil--; }
  if(nobetGoruntulenenAy>11){ nobetGoruntulenenAy=0; nobetGoruntulenenYil++; }
  renderNobetTakvimi();
}

/* ---------- NÖBET YERLERİ CRUD ---------- */
function nobetYeriEkle(){
  const ad = prompt('Yeni nöbet yeri adı (örn: Bahçe):');
  if(!ad || !ad.trim()) return;
  db.collection(COL.nobetYerleri).add({ ad: ad.trim(), sira: nobetYerleri.length+1, eklenmeTarihi:new Date().toISOString() })
    .then(()=>toast('Nöbet yeri eklendi.')).catch(err=>toast('Hata: '+err.message));
}
function nobetYeriDuzenle(id){
  const yer = nobetYerleri.find(y=>y.id===id); if(!yer) return;
  const yeniAd = prompt('Nöbet yerini yeniden adlandır:', yer.ad);
  if(!yeniAd || !yeniAd.trim() || yeniAd.trim()===yer.ad) return;
  db.collection(COL.nobetYerleri).doc(id).update({ ad: yeniAd.trim() })
    .then(()=>toast('Nöbet yeri güncellendi.')).catch(err=>toast('Hata: '+err.message));
}
async function nobetYeriSil(id){
  const yer = nobetYerleri.find(y=>y.id===id); if(!yer) return;
  const bagliSayisi = nobetAtamalari.filter(a=>a.yerId===id).length;
  const mesaj = bagliSayisi>0
    ? `"${yer.ad}" silinsin mi? Bu yere bağlı ${bagliSayisi} nöbet ataması da silinecek.`
    : `"${yer.ad}" nöbet yerini silmek istediğinize emin misiniz?`;
  if(!confirm(mesaj)) return;
  try{
    const batch = db.batch();
    batch.delete(db.collection(COL.nobetYerleri).doc(id));
    nobetAtamalari.filter(a=>a.yerId===id).forEach(a=> batch.delete(db.collection(COL.nobetAtamalari).doc(a.id)) );
    await batch.commit();
    toast('Nöbet yeri ve bağlı atamalar silindi.');
  }catch(err){ toast('Hata: '+err.message); }
}

/* ---------- RESMİ TATİL LİSTESİ ---------- */
function nobetTatilEkle(){
  const body = `
    <div class="form-group"><label>Tarih</label><input type="date" id="f_tatilTarih" value="${todayISO()}"></div>
    <div class="form-group"><label>Açıklama</label><input id="f_tatilAciklama" placeholder="örn: 19 Mayıs Atatürk'ü Anma Gençlik ve Spor Bayramı"></div>
  `;
  modalAc('Resmi Tatil Ekle', body, ()=>{
    const tarih = document.getElementById('f_tatilTarih').value;
    const aciklama = document.getElementById('f_tatilAciklama').value.trim();
    if(!tarih){ toast('Tarih zorunludur.'); return; }
    if(nobetTatilMi(tarih)){ toast('Bu tarih zaten tatil listesinde.'); return; }
    db.collection(COL.resmiTatiller).add({ tarih, aciklama })
      .then(()=>{ toast('Tatil eklendi.'); modalKapat(); }).catch(err=>toast('Hata: '+err.message));
  }, null);
}
function nobetTatilSil(id){
  if(!confirm('Bu tatili listeden kaldırmak istiyor musunuz? (Nöbet ataması yapılabilir hale gelir.)')) return;
  db.collection(COL.resmiTatiller).doc(id).delete().then(()=>toast('Tatil kaldırıldı.')).catch(err=>toast('Hata: '+err.message));
}
function renderNobetTatilListesi(){
  const hedef = document.getElementById('nobetTatilListesi');
  if(!hedef) return;
  const liste = [...resmiTatiller].sort((a,b)=>a.tarih.localeCompare(b.tarih));
  hedef.innerHTML = liste.length ? liste.map(t=>`
    <div class="dash-row" style="display:flex;align-items:center;gap:8px;">
      <span class="badge badge-amber">${formatTarih(t.tarih)}</span>
      <span style="flex:1;min-width:0;">${escapeHtml(t.aciklama||'—')}</span>
      <button class="cz-del" title="Kaldır" onclick="nobetTatilSil('${t.id}')">🗑</button>
    </div>`).join('') : '<p class="empty-state">Resmi tatil eklenmedi.</p>';
}

/* ---------- ATAMA / AMİR MODALLARI ---------- */
function nobetAtamaModalAc(tarihISO, yerId){
  const yer = nobetYerleri.find(y=>y.id===yerId);
  const mevcut = nobetAtamalari.find(a=>a.tarih===tarihISO && a.yerId===yerId);
  const siraliOgretmenler = [...ogretmenler].sort((a,b)=>a.ad.localeCompare(b.ad,'tr'));
  const body = `
    <div class="form-group"><label>Tarih / Yer</label><input value="${formatTarih(tarihISO)} — ${escapeHtml(yer?yer.ad:'')}" disabled></div>
    <div class="form-group"><label>Nöbetçi Öğretmen</label>
      ${siraliOgretmenler.length ? `
        <select id="f_nobetOgretmen">
          <option value="">Seçiniz</option>
          ${siraliOgretmenler.map(o=>`<option value="${o.id}" ${mevcut && mevcut.ogretmenId===o.id?'selected':''}>${escapeHtml(o.ad+' '+o.soyad)}</option>`).join('')}
        </select>
      ` : '<p class="empty-state">Önce Öğretmenler sekmesinden öğretmen ekleyin.</p>'}
    </div>
  `;
  modalAc(mevcut?'Nöbet Atamasını Düzenle':'Nöbet Ata', body, ()=>{
    const sel = document.getElementById('f_nobetOgretmen');
    if(!sel || !sel.value){ toast('Öğretmen seçimi zorunludur.'); return; }
    const ogretmenObj = ogretmenler.find(o=>o.id===sel.value);
    const veri = { tarih: tarihISO, yerId, ogretmenAdSoyad: `${ogretmenObj.ad} ${ogretmenObj.soyad}`, ogretmenId: ogretmenObj.id };
    const islem = mevcut ? db.collection(COL.nobetAtamalari).doc(mevcut.id).update(veri)
                          : db.collection(COL.nobetAtamalari).add(veri);
    islem.then(()=>{ toast('Kaydedildi.'); modalKapat(); }).catch(err=>toast('Hata: '+err.message));
  }, mevcut ? ()=>{ if(confirm('Bu atamayı kaldırmak istiyor musunuz?')){ db.collection(COL.nobetAtamalari).doc(mevcut.id).delete(); modalKapat(); } } : null);
}
function nobetAmirModalAc(tarihISO){
  const mevcut = nobetciAmirleri.find(a=>a.tarih===tarihISO);
  const adaylar = muduYardimcilari();
  const body = `
    <div class="form-group"><label>Tarih</label><input value="${formatTarih(tarihISO)}" disabled></div>
    <div class="form-group"><label>Nöbetçi Amir</label>
      ${adaylar.length ? `
        <select id="f_amirId" onchange="document.getElementById('f_amirTel').value = (this.selectedOptions[0] ? this.selectedOptions[0].dataset.tel : '')||'';">
          <option value="">Seçiniz</option>
          ${adaylar.map(o=>`<option value="${o.id}" data-tel="${escapeHtml(o.telefon||'')}" data-ad="${escapeHtml(o.ad+' '+o.soyad)}" ${mevcut && mevcut.ogretmenId===o.id?'selected':''}>${escapeHtml(o.ad+' '+o.soyad)}</option>`).join('')}
        </select>
      ` : '<p class="empty-state">Henüz Müdür Yardımcısı tanımlanmadı. Öğretmenler sekmesinde (veya Okul Bilgileri sekmesinde "+ Yeni Müdür Yardımcısı" ile) ünvanı "Müdür Yardımcısı" olan bir kayıt ekleyin.</p>'}
    </div>
    <div class="form-group"><label>Telefon (değiştirilebilir)</label><input id="f_amirTel" value="${mevcut?escapeHtml(mevcut.telefon||''): ''}" placeholder="05xx xxx xx xx"></div>
  `;
  modalAc(mevcut?'Nöbetçi Amiri Düzenle':'Nöbetçi Amir Ata', body, ()=>{
    const sel = document.getElementById('f_amirId');
    if(!sel || !sel.value){ toast('Nöbetçi amir seçimi zorunludur.'); return; }
    const secili = sel.selectedOptions[0];
    const veri = { tarih: tarihISO, ad: secili.dataset.ad, telefon: (document.getElementById('f_amirTel')||{value:''}).value.trim()||secili.dataset.tel||'', ogretmenId: sel.value };
    const islem = mevcut ? db.collection(COL.nobetciAmirleri).doc(mevcut.id).update(veri)
                          : db.collection(COL.nobetciAmirleri).add(veri);
    islem.then(()=>{ toast('Kaydedildi.'); modalKapat(); }).catch(err=>toast('Hata: '+err.message));
  }, mevcut ? ()=>{ if(confirm('Bu amir atamasını kaldırmak istiyor musunuz?')){ db.collection(COL.nobetciAmirleri).doc(mevcut.id).delete(); modalKapat(); } } : null);
}

/* ---------- AYLIK TAKVİM RENDER ---------- */
function renderNobetTakvimi(){
  const baslikEl = document.getElementById('nobetAyBasligi');
  if(baslikEl) baslikEl.textContent = nobetAyAdiUzun(nobetGoruntulenenYil, nobetGoruntulenenAy);
  const hedef = document.getElementById('nobetGridTablo');
  if(!hedef) return;
  const yerler = nobetYerSirali();
  const gunSayisi = new Date(nobetGoruntulenenYil, nobetGoruntulenenAy+1, 0).getDate();
  const bugunISO = todayISO();

  if(yerler.length===0){
    hedef.innerHTML = `<div class="empty-state">Henüz nöbet yeri tanımlanmadı. "+ Yeni Nöbet Yeri" ile ekleyin veya Excel'den içe aktarın.</div>`;
    return;
  }

  let html = `<thead><tr><th>Tarih / Gün</th>${yerler.map(y=>`<th>${escapeHtml(y.ad)} <button class="cz-del" style="margin-left:4px;" title="Düzenle/Sil" onclick="event.stopPropagation(); nobetYerMenuAc('${y.id}')">⋮</button></th>`).join('')}<th>Nöbetçi Amir</th></tr></thead><tbody>`;

  for(let d=1; d<=gunSayisi; d++){
    const iso = nobetTarihISO(nobetGoruntulenenYil, nobetGoruntulenenAy, d);
    const haftasonu = nobetHaftasonuMu(nobetGoruntulenenYil, nobetGoruntulenenAy, d);
    const tatil = nobetTatilMi(iso);
    const gunAdi = GUNADI[new Date(nobetGoruntulenenYil, nobetGoruntulenenAy, d).getDay()];
    const bugunSinif = iso===bugunISO ? 'bugun-kolon' : '';

    html += `<tr class="${bugunSinif}"><td class="sch-saat">${d} ${gunAdi}</td>`;
    if(haftasonu){
      html += `<td class="sch-cell nobet-kilitli" colspan="${yerler.length}">HAFTASONU</td><td class="sch-cell nobet-kilitli">—</td>`;
    } else if(tatil){
      html += `<td class="sch-cell nobet-tatil" colspan="${yerler.length}">RESMİ TATİL${tatil.aciklama?' — '+escapeHtml(tatil.aciklama):''}</td><td class="sch-cell nobet-tatil">—</td>`;
    } else {
      yerler.forEach(y=>{
        const atama = nobetAtamalari.find(a=>a.tarih===iso && a.yerId===y.id);
        html += atama
          ? `<td class="sch-cell sch-filled" onclick="nobetAtamaModalAc('${iso}','${y.id}')"><div class="sch-ders">${escapeHtml(atama.ogretmenAdSoyad)}</div></td>`
          : `<td class="sch-cell sch-empty" onclick="nobetAtamaModalAc('${iso}','${y.id}')">+</td>`;
      });
      const amir = nobetciAmirleri.find(a=>a.tarih===iso);
      html += amir
        ? `<td class="sch-cell sch-filled" onclick="nobetAmirModalAc('${iso}')"><div class="sch-ders">${escapeHtml(amir.ad)}</div></td>`
        : `<td class="sch-cell sch-empty" onclick="nobetAmirModalAc('${iso}')">+</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody>';
  hedef.innerHTML = html;
}
function nobetYerMenuAc(id){
  const secim = prompt('"d" yazıp Enter\'a basarsanız yeniden adlandırırsınız, "s" yazarsanız silersiniz:', 'd');
  if(secim==='s') nobetYeriSil(id);
  else if(secim==='d') nobetYeriDuzenle(id);
}

/* ---------- BUGÜN / BU HAFTA WIDGET'LARI (Dashboard + Nöbet sekmesi) ---------- */
function nobetGununOzeti(iso){
  const atamalar = nobetAtamalari.filter(a=>a.tarih===iso);
  const amir = nobetciAmirleri.find(a=>a.tarih===iso);
  const tatil = nobetTatilMi(iso);
  const haftasonu = nobetHaftasonuMu(...iso.split('-').map((v,i)=>i===1?parseInt(v)-1:parseInt(v)));
  return { atamalar, amir, tatil, haftasonu };
}
/* Nöbet yeri adına göre uygun bir emoji seçer (görsel zenginlik). */
function nobetYeriIkon(ad){
  const a = (ad||'').toLocaleLowerCase('tr');
  if(a.includes('bahçe')||a.includes('bahce')) return '🌳';
  if(a.includes('kapı')||a.includes('kapi')||a.includes('giriş')||a.includes('giris')) return '🚪';
  if(a.includes('kantin')||a.includes('yemekhane')) return '🍽️';
  if(a.includes('koridor')) return '🚶';
  if(a.includes('merdiven')) return '🪜';
  if(a.includes('servis')||a.includes('otopark')) return '🚌';
  if(a.includes('tuvalet')) return '🚻';
  return '📍';
}
function renderNobetBugunVeHafta(){
  // Tatil modunda içerik doldurma
  const tatilAktif = typeof dersSaatleriAyarlari !== 'undefined' && dersSaatleriAyarlari && dersSaatleriAyarlari.tatilModu;
  if(tatilAktif) return;

  const bugunISO = todayISO();
  const ozet = nobetGununOzeti(bugunISO);
  const bugunHTML = ozet.haftasonu ? '<p class="empty-state">🌤️ Bugün hafta sonu.</p>'
    : ozet.tatil ? `<p class="empty-state">🎉 Bugün resmi tatil${ozet.tatil.aciklama?' — '+escapeHtml(ozet.tatil.aciklama):''}.</p>`
    : (ozet.atamalar.length ? ozet.atamalar.map(a=>{
        const yer = nobetYerleri.find(y=>y.id===a.yerId);
        return `<div class="dash-row">${nobetYeriIkon(yer?yer.ad:'')} ${escapeHtml(yer?yer.ad:'?')} — <strong>👤 ${escapeHtml(a.ogretmenAdSoyad)}</strong></div>`;
      }).join('') + (ozet.amir?`<div class="dash-row">👮 Nöbetçi Amir — <strong>${escapeHtml(ozet.amir.ad)}</strong>${(()=>{ const ogr=ogretmenler.find(o=>o.id===ozet.amir.ogretmenId); const tel=ogr?ogr.telefon:ozet.amir.telefon; return tel?' (📞 '+escapeHtml(tel)+')':''; })()}</div>`:'')
      : '<p class="empty-state">📭 Bugün için nöbet ataması yok.</p>');

  ['dashBugunNobet','nobetBugunKutu'].forEach(elId=>{
    const el = document.getElementById(elId); if(el) el.innerHTML = bugunHTML;
  });

  const haftaKutu = document.getElementById('nobetHaftaKutu');
  if(haftaKutu){
    const gunler = nobetHaftaAraligi(bugunISO);
    haftaKutu.innerHTML = gunler.map(iso=>{
      const o = nobetGununOzeti(iso);
      const gunAdiKisa = GUNADI[new Date(iso+'T00:00:00').getDay()];
      const icerik = o.tatil ? `<span class="badge badge-amber">🎉 Resmi Tatil</span>`
        : (o.atamalar.length ? o.atamalar.map(a=>{
            const yer = nobetYerleri.find(y=>y.id===a.yerId);
            return `<div>${nobetYeriIkon(yer?yer.ad:'')} ${escapeHtml(yer?yer.ad:'?')}: <strong>👤 ${escapeHtml(a.ogretmenAdSoyad)}</strong></div>`;
          }).join('') : '<span style="color:var(--ink-muted);">📭 Atama yok</span>');
      return `<div class="dash-row" style="align-items:flex-start;"><strong style="min-width:90px;display:inline-block;">${gunAdiKisa} ${formatTarih(iso)}</strong><div style="flex:1;">${icerik}</div></div>`;
    }).join('');
  }
}

/* ---------- FIRESTORE BAĞLANTILARI (app.js baglantilariKur içinden çağrılır) ---------- */
function nobetBaglantilariKur(){
  db.collection(COL.nobetYerleri).onSnapshot(s=>{ nobetYerleri = s.docs.map(d=>({id:d.id,...d.data()})); renderNobetTakvimi(); }, hataGoster);
  db.collection(COL.nobetAtamalari).onSnapshot(s=>{ nobetAtamalari = s.docs.map(d=>({id:d.id,...d.data()})); renderNobetTakvimi(); renderNobetBugunVeHafta(); }, hataGoster);
  db.collection(COL.nobetciAmirleri).onSnapshot(s=>{ nobetciAmirleri = s.docs.map(d=>({id:d.id,...d.data()})); renderNobetTakvimi(); renderNobetBugunVeHafta(); }, hataGoster);
  db.collection(COL.resmiTatiller).onSnapshot(s=>{ resmiTatiller = s.docs.map(d=>({id:d.id,...d.data()})); renderNobetTakvimi(); renderNobetTatilListesi(); renderNobetBugunVeHafta(); }, hataGoster);
  nobetRotasyonDinle();
}

/* ====================================================================
   ESNEK EXCEL İÇE AKTARMA — NÖBET (v4.0)
   Not: js/excel-import.js'teki eski nobetExceliIceAktar() fonksiyonu,
   script yükleme sırası nedeniyle (nobet.js index.html'de ondan SONRA
   yükleniyor) burada tanımlanan yeni sürüm tarafından geçersiz kılınır.
   excel-import.js'teki diğer 3 fonksiyon (öğretmen / ders programı /
   çizelgeler) dokunulmadan aynen çalışmaya devam eder.

   excelOkuDosya / excelTarihHucresiISO / excelAdiSadelestir /
   excelOgretmenEslestir yardımcıları, sütun başlığı tamamen sabit
   olmayan diğer modül içe aktarmalarında da (Öğretmenler, Ders
   Programı, Sınıflar/Öğrenciler, Kulüpler, Belirli Gün/Haftalar,
   Evrak Takip) yeniden kullanılabilir — niyetle genel tutuldu.
   ==================================================================== */

function excelOkuDosya(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = (e)=>{
      try{
        const wb = XLSX.read(e.target.result, { type:'array', cellDates:true });
        resolve(wb);
      }catch(err){ reject(err); }
    };
    reader.onerror = ()=> reject(new Error('Dosya okunamadı.'));
    reader.readAsArrayBuffer(file);
  });
}

function excelTarihHucresiISO(deger){
  if(deger instanceof Date && !isNaN(deger)) return deger.toISOString().slice(0,10);
  if(typeof deger === 'number'){
    const ms = Math.round((deger - 25569) * 86400 * 1000); // Excel 1900 tarih sistemi
    const d = new Date(ms);
    if(!isNaN(d)) return d.toISOString().slice(0,10);
  }
  return null;
}

/* "(BAHÇE-GİRİŞ K.)" */
function excelAdiSadelestir(metin){
  return String(metin||'').replace(/\(.*?\)/g,'').trim();
}

function excelOgretmenEslestir(adSoyad){
  const aranan = excelAdiSadelestir(adSoyad).toLocaleLowerCase('tr');
  if(!aranan) return null;
  return ogretmenler.find(o=> `${o.ad} ${o.soyad}`.toLocaleLowerCase('tr').trim() === aranan) || null;
}

/* ---------- NÖBET: dosya seçilince çalışır ---------- */
async function nobetExceliIceAktar(file){
  if(!file) return;
  try{
    const wb = await excelOkuDosya(file);
    // "VERİ" / "DATA" / "REFERANS" gibi referans sayfaları hariç tut.
    const adaylar = wb.SheetNames.filter(ad=> !/^veri$|^data$|^referans$/i.test(ad.trim()));
    if(!adaylar.length){ toast('Uygun bir ay sayfası bulunamadı.'); return; }
    const sayfaAdi = adaylar[adaylar.length-1]; // workbook'taki en son sekme = en güncel ay
    const sayfa = wb.Sheets[sayfaAdi];
    const satirlar = XLSX.utils.sheet_to_json(sayfa, { header:1, defval:'' });

    // Başlık satırını bul: "AMİR" geçen hücrenin olduğu satır.
    let baslikIdx = -1, amirCol = -1;
    for(let i=0;i<Math.min(6,satirlar.length);i++){
      const c = (satirlar[i]||[]).findIndex(h=>/amir/i.test(String(h)));
      if(c>-1){ baslikIdx=i; amirCol=c; break; }
    }
    if(baslikIdx===-1){ toast(`"${sayfaAdi}" sayfasında "NÖBETÇİ AMİR" başlığı bulunamadı.`); return; }

    const tarihIdxBulunan = (satirlar[baslikIdx]||[]).findIndex(h=>/tarih|gün|date/i.test(String(h)));
    const tarihCol = tarihIdxBulunan>-1 ? tarihIdxBulunan : 0;

    const altBaslik = satirlar[baslikIdx+1] || [];
    const ornekSatir = satirlar.slice(baslikIdx+2).find(r=> (r||[]).some(v=>v!=='')) || [];

    const kolonlar = [];
    for(let c=tarihCol+1; c<amirCol; c++){
      const etiketHam = String(altBaslik[c]||'').trim();
      const ornek = excelAdiSadelestir(ornekSatir[c]||'');
      kolonlar.push({
        index:c,
        onerilenEtiket: etiketHam || `Sütun ${c+1}`,
        ornekDeger: ornek,
        onerilenRol: 'yer'
      });
    }

    nobetIceAktarOnayModalAc(sayfaAdi, satirlar, baslikIdx, tarihCol, amirCol, kolonlar);
  }catch(err){
    console.error(err);
    toast('Excel okunamadı: '+err.message);
  }
}

/* ---------- Onay / düzeltme ekranı ---------- */
function nobetIceAktarOnayModalAc(sayfaAdi, satirlar, baslikIdx, tarihCol, amirCol, kolonlar){
  const satirHtml = (k) => `
    <div class="form-row ek-satir" style="align-items:flex-end;gap:8px;margin-bottom:10px;">
      <div class="form-group" style="flex:2;">
        <label>Sütun ${k.index+1}${k.ornekDeger?' — örn: "'+escapeHtml(k.ornekDeger)+'"':''}</label>
        <input class="ek_etiket" value="${escapeHtml(k.onerilenEtiket)}" placeholder="Nöbet yeri adı, örn: Bahçe">
      </div>
      <div class="form-group" style="flex:1;">
        <select class="ek_rol">
          <option value="yer" selected>Nöbet Yeri</option>
          <option value="yoksay">Yoksay</option>
        </select>
      </div>
    </div>`;
  const body = `
    <p style="color:var(--ink-muted);font-size:13px;margin-bottom:10px;">
      "<strong>${escapeHtml(sayfaAdi)}</strong>" sayfası algılandı. "Nöbetçi Amir" sütunu otomatik bulundu (Sütun ${amirCol+1}). Aşağıdaki sütunların hangi nöbet yerine ait olduğunu kontrol edip gerekirse düzeltin.
    </p>
    <div id="nobetEslemeSatirlari">${kolonlar.map(satirHtml).join('')}</div>
  `;
  modalAc(`İçe Aktar — ${sayfaAdi}`, body, async ()=>{
    const satirEls = Array.from(document.querySelectorAll('#nobetEslemeSatirlari .ek-satir'));
    const eslemeler = kolonlar.map((k,i)=>({
      index: k.index,
      etiket: satirEls[i].querySelector('.ek_etiket').value.trim(),
      rol: satirEls[i].querySelector('.ek_rol').value
    })).filter(e=>e.rol==='yer' && e.etiket);

    if(!eslemeler.length){ toast('En az bir nöbet yeri eşlemesi gerekli.'); return; }
    modalKapat();
    await nobetVerisiniUygula(satirlar, baslikIdx, tarihCol, amirCol, eslemeler);
  }, null);
}

/* ---------- Eşlemeler onaylandıktan sonra Firestore'a yazar ---------- */
async function nobetVerisiniUygula(satirlar, baslikIdx, tarihCol, amirCol, eslemeler){
  toast('İçe aktarılıyor, lütfen bekleyin...');

  // 1) Eşlenen etiketlere karşılık gelen nöbet yerlerini bul/oluştur.
  const yerIdMap = {};
  let yeniSira = nobetYerleri.length;
  for(const e of eslemeler){
    const mevcutYer = nobetYerleri.find(y=> y.ad.toLocaleLowerCase('tr')===e.etiket.toLocaleLowerCase('tr'));
    if(mevcutYer){
      yerIdMap[e.index] = mevcutYer.id;
    } else {
      yeniSira++;
      const ref = await db.collection(COL.nobetYerleri).add({ ad:e.etiket, sira:yeniSira, eklenmeTarihi:new Date().toISOString() });
      yerIdMap[e.index] = ref.id;
    }
  }

  let atamaSayisi=0, amirSayisi=0, gunSayisi=0;
  let batch = db.batch();
  let batchSayac = 0;

  for(let r=baslikIdx+2; r<satirlar.length; r++){
    const satir = satirlar[r] || [];
    if(!satir.length || satir.every(v=>v==='')) continue;
    const iso = excelTarihHucresiISO(satir[tarihCol]);
    if(!iso) continue;
    gunSayisi++;

    for(const e of eslemeler){
      const ham = satir[e.index];
      if(!ham || String(ham).trim()==='') continue;
      const adSoyad = excelAdiSadelestir(ham);
      const ogretmenObj = excelOgretmenEslestir(adSoyad);
      const yerId = yerIdMap[e.index];
      const mevcut = nobetAtamalari.find(a=>a.tarih===iso && a.yerId===yerId);
      const veri = { tarih: iso, yerId, ogretmenAdSoyad: ogretmenObj?`${ogretmenObj.ad} ${ogretmenObj.soyad}`:adSoyad, ogretmenId: ogretmenObj?ogretmenObj.id:null };
      const ref = mevcut ? db.collection(COL.nobetAtamalari).doc(mevcut.id) : db.collection(COL.nobetAtamalari).doc();
      batch.set(ref, veri); batchSayac++; atamaSayisi++;
    }

    const amirHam = satir[amirCol];
    if(amirHam && String(amirHam).trim()!==''){
      const adSoyad = excelAdiSadelestir(amirHam);
      const ogretmenObj = excelOgretmenEslestir(adSoyad);
      const mevcutAmir = nobetciAmirleri.find(a=>a.tarih===iso);
      const veri = { tarih: iso, ad: adSoyad, telefon: ogretmenObj?(ogretmenObj.telefon||''):'', ogretmenId: ogretmenObj?ogretmenObj.id:null };
      const ref = mevcutAmir ? db.collection(COL.nobetciAmirleri).doc(mevcutAmir.id) : db.collection(COL.nobetciAmirleri).doc();
      batch.set(ref, veri); batchSayac++; amirSayisi++;
    }

    if(batchSayac>=400){ await batch.commit(); batch = db.batch(); batchSayac=0; }
  }
  if(batchSayac>0) await batch.commit();

  toast(`İçe aktarıldı: ${gunSayisi} gün · ${atamaSayisi} nöbet ataması · ${amirSayisi} amir ataması.`);
}

/* ====================================================================
   OTOMATİK HAFTALIK ROTASYON DAĞITIMI  (v3)
   ====================================================================
   VERİ MODELİ — Firestore: COL.nobetRotasyon / belge id: 'sablon'
   {
     yerler: { bahce: yerId, bina: yerId },   // seçilen 2 yer
     amirListesi: [ogretmenId, ...],           // amir sırası
     referansHafta: {                          // kullanıcının girdiği veya
       "1": { bahce: ogretmenId, bina: ogretmenId },  // sonuncusundan çıkarılan
       "2": { ... },                           // 1=Pzt,2=Sal,3=Çar,4=Per,5=Cum
       "3": { ... },
       "4": { ... },
       "5": { ... }
     },
     sonHafta: {                               // en son üretilen haftanın durumu
       iso: 'YYYY-MM-DD',                      // o haftanın Pazartesi ISO
       "1": { bahce: ogretmenId, bina: ogretmenId },
       ...
     },
     guncelleme: 'YYYY-MM-DD'
   }

   ALGORİTMA:
   ─ "sonHafta" varsa: bir sonraki hafta Pzt'sinden itibaren devam et,
     bahçe↔bina ters çevrilmiş olarak her gün için şablondaki kişiyi bul
   ─ "sonHafta" yoksa: kullanıcı referansHafta'yı girer, oradan başla
   ─ Her hafta: önceki haftanın pzt günü kim bahçedeyse bu hafta bina, tersi
   ─ Tatil günü: o günü atla, atama yapma; o günün öğretmeni aynı yerde
     bir sonraki hafta o gün nöbet tutar (gün sabittir, kişi sabit, yer döner)
   ─ Amir: amirListesi sırayla, her iş günü bir kişi (tatil atlanır)
   ==================================================================== */

let _nobetRotasyonSablon = null; // Firestore'dan yüklenen şablon

/* Şablonu Firestore'dan yükle (app başlangıcında nobetBaglantilariKur içinden çağrılır) */
function nobetRotasyonDinle() {
  if (!db || !COL.nobetRotasyon) return;
  db.collection(COL.nobetRotasyon).doc('sablon').onSnapshot(snap => {
    _nobetRotasyonSablon = snap.exists ? snap.data() : null;
  }, err => console.warn('nobetRotasyon:', err));
}

/* ── MODAL: Otomatik Dağıtım ── */
function nobetOtomatikDagitimModalAc() {
  const yerler = nobetYerSirali();
  if (yerler.length < 2) { toast('En az 2 nöbet yeri gerekli.'); return; }
  if (ogretmenler.length === 0) { toast('Öğretmen listesi boş.'); return; }

  const sablon = _nobetRotasyonSablon;
  const varMi  = sablon && sablon.sonHafta && sablon.sonHafta.iso;

  // --- Nöbet yeri seçimi ---
  const yerOpt = (secili) => yerler.map(y =>
    `<option value="${y.id}" ${secili===y.id?'selected':''}>${escapeHtml(y.ad)}</option>`).join('');

  const bahceYerId = sablon?.yerler?.bahce || yerler[0]?.id || '';
  const binaYerId  = sablon?.yerler?.bina  || yerler[1]?.id || '';

  // --- Öğretmen listesi (sıralı) ---
  const siraliOgr = [...ogretmenler].sort((a,b) =>
    (a.ad+' '+a.soyad).localeCompare(b.ad+' '+b.soyad,'tr'));

  // --- Amir listesi mevcut mu ---
  const amirListesi = sablon?.amirListesi || [];
  const amirSirali  = siraliOgr.filter(o => amirListesi.includes(o.id));
  const amirBosHTML = siraliOgr.map(o =>
    `<option value="${o.id}" ${amirListesi.includes(o.id)?'selected':''}>${escapeHtml(o.ad+' '+o.soyad)}</option>`).join('');

  // --- Referans hafta tablosu ---
  const GUNLAR = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  const refHafta = sablon?.referansHafta || {};

  const refTabloHTML = [1,2,3,4,5].map(g => {
    const bahceId = refHafta[g]?.bahce || '';
    const binaId  = refHafta[g]?.bina  || '';
    const ogrOpt  = (secili) => `<option value="">—</option>` +
      siraliOgr.map(o => `<option value="${o.id}" ${secili===o.id?'selected':''}>${escapeHtml(o.ad+' '+o.soyad)}</option>`).join('');
    return `
      <tr>
        <td style="padding:4px 6px;font-weight:600;white-space:nowrap;">${GUNLAR[g]}</td>
        <td style="padding:4px 6px;"><select id="ref_bahce_${g}" style="width:100%;">${ogrOpt(bahceId)}</select></td>
        <td style="padding:4px 6px;"><select id="ref_bina_${g}" style="width:100%;">${ogrOpt(binaId)}</select></td>
      </tr>`;
  }).join('');

  // Başlangıç tarihi: sonHafta varsa ondan sonraki hafta, yoksa bu hafta
  let baslangicISO;
  if (varMi) {
    const sonPzt = new Date(sablon.sonHafta.iso + 'T00:00:00');
    sonPzt.setDate(sonPzt.getDate() + 7);
    baslangicISO = nobetTarihISO(sonPzt.getFullYear(), sonPzt.getMonth(), sonPzt.getDate());
  } else {
    const bugun = new Date();
    const hw = bugun.getDay() || 7;
    const pzt = new Date(bugun); pzt.setDate(bugun.getDate() - hw + 1);
    baslangicISO = nobetTarihISO(pzt.getFullYear(), pzt.getMonth(), pzt.getDate());
  }

  const body = `
    <div style="max-height:72vh;overflow-y:auto;padding-right:4px;">

      ${varMi ? `<div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:10px;margin-bottom:14px;font-size:13px;">
        ✅ Kayıtlı şablon bulundu. Son üretilen hafta: <strong>${sablon.sonHafta.iso}</strong><br>
        Yeni üretim o haftanın hemen ardından başlayacak.
      </div>` : `<div style="background:#fff8e1;border:1px solid #ffd54f;border-radius:8px;padding:10px;margin-bottom:14px;font-size:13px;">
        ℹ️ İlk kullanım: Aşağıdaki referans hafta tablosunu doldurun. Bu şablon kaydedilecek ve sonraki üretimlerde otomatik devam edecektir.
      </div>`}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        <div>
          <label style="font-weight:700;display:block;margin-bottom:5px;">Başlangıç (Pazartesi)</label>
          <input type="date" id="oto_baslangic" value="${baslangicISO}" style="width:100%;">
        </div>
        <div>
          <label style="font-weight:700;display:block;margin-bottom:5px;">Kaç hafta üretilsin?</label>
          <select id="oto_hafta" style="width:100%;">
            <option value="4">4 hafta</option>
            <option value="8" selected>8 hafta</option>
            <option value="12">12 hafta</option>
            <option value="16">16 hafta</option>
          </select>
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <div style="font-weight:700;margin-bottom:8px;">🗺️ Nöbet Yerleri</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div><label style="font-size:12px;display:block;margin-bottom:3px;">Bahçe</label>
            <select id="oto_yer_bahce" style="width:100%;">${yerOpt(bahceYerId)}</select></div>
          <div><label style="font-size:12px;display:block;margin-bottom:3px;">Okul Binası</label>
            <select id="oto_yer_bina" style="width:100%;">${yerOpt(binaYerId)}</select></div>
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <div style="font-weight:700;margin-bottom:6px;">📅 Referans Hafta Şablonu
          <span style="font-weight:400;font-size:12px;color:var(--ink-muted);"> — haftalık yer değişimi bu tabloya göre yapılır</span>
        </div>
        <div style="font-size:12px;color:var(--ink-muted);margin-bottom:6px;">
          Bu haftaki yerler: <strong>Bahçe</strong> ve <strong>Okul Binası</strong>. Sonraki hafta otomatik ters çevrilir.
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>
            <th style="padding:4px 6px;text-align:left;font-size:12px;background:var(--bg-secondary,#f5f5f5);">Gün</th>
            <th style="padding:4px 6px;text-align:left;font-size:12px;background:var(--bg-secondary,#f5f5f5);">🌳 Bahçe</th>
            <th style="padding:4px 6px;text-align:left;font-size:12px;background:var(--bg-secondary,#f5f5f5);">🏫 Bina</th>
          </tr></thead>
          <tbody>${refTabloHTML}</tbody>
        </table>
      </div>

      <div style="margin-bottom:8px;">
        <div style="font-weight:700;margin-bottom:6px;">👮 Nöbetçi Amir Listesi
          <span style="font-weight:400;font-size:12px;color:var(--ink-muted);"> — her iş günü sırayla, tatiller atlanır</span>
        </div>
        <select id="oto_amir_sec" multiple style="width:100%;height:120px;">
          ${amirBosHTML}
        </select>
        <div style="font-size:11px;color:var(--ink-muted);margin-top:3px;">Birden fazla seçmek için uzun basın veya Ctrl+tıkla</div>
      </div>

      <div style="background:#fff8e1;border:1px solid #ffd54f;border-radius:6px;padding:8px;font-size:12px;margin-top:10px;">
        ⚠️ Zaten ataması olan günler korunur. Sadece boş günlere yazılır.
      </div>
    </div>`;

  modalAc('🔄 Otomatik Nöbet Dağıtımı', body, nobetOtomatikDagitimUygula, null);
}

/* ── UYGULA ── */
async function nobetOtomatikDagitimUygula() {
  const baslangicVal = document.getElementById('oto_baslangic')?.value;
  const haftaSayisi  = parseInt(document.getElementById('oto_hafta')?.value || '8');
  const bahceYerId   = document.getElementById('oto_yer_bahce')?.value;
  const binaYerId    = document.getElementById('oto_yer_bina')?.value;

  if (!baslangicVal) { toast('Başlangıç tarihi seçin.'); return; }
  if (!bahceYerId || !binaYerId || bahceYerId === binaYerId) {
    toast('Bahçe ve Bina için farklı nöbet yerleri seçin.'); return;
  }

  // Referans hafta oku
  const referansHafta = {};
  let referansDolu = true;
  for (let g = 1; g <= 5; g++) {
    const bahce = document.getElementById(`ref_bahce_${g}`)?.value || '';
    const bina  = document.getElementById(`ref_bina_${g}`)?.value  || '';
    if (!bahce || !bina) { referansDolu = false; }
    referansHafta[g] = { bahce, bina };
  }
  if (!referansDolu) { toast('Referans hafta tablosundaki tüm günleri doldurun.'); return; }

  // Amir listesi
  const amirSel = document.getElementById('oto_amir_sec');
  const amirListesi = amirSel
    ? Array.from(amirSel.selectedOptions).map(o => o.value)
    : (_nobetRotasyonSablon?.amirListesi || []);

  modalKapat();
  toast('Nöbet programı oluşturuluyor…');

  // Başlangıç Pazartesi'ye hizala
  const baslangic = new Date(baslangicVal + 'T00:00:00');
  const hw = baslangic.getDay() || 7;
  baslangic.setDate(baslangic.getDate() - hw + 1);

  // Amir sırasını belirle: mevcut şablondan devam et
  const mevcutAmirSayac = _nobetRotasyonSablon?.amirSayac || 0;
  let amirSayac = mevcutAmirSayac;

  // Son haftanın durumunu belirle
  // sonHafta.iso varsa: o haftadaki bahçe/bina kişileri bize "önceki durum"
  // Başlangıç haftası için: sonHafta yoksa referansHafta kullan
  // Her yeni hafta: önceki haftanın bahçe↔bina'sını ters çevir
  const oncekiHafta = (_nobetRotasyonSablon?.sonHafta && _nobetRotasyonSablon.sonHafta.iso)
    ? _nobetRotasyonSablon.sonHafta
    : referansHafta; // İlk kullanım: referans = önceki hafta gibi davran

  let batch = db.batch();
  let batchSayac = 0;
  let toplamAtama = 0, toplamAmir = 0, atlananTatil = 0;

  // sonHafta takibi (en son üretilen haftayı kaydedeceğiz)
  let yeniSonHafta = null;

  for (let h = 0; h < haftaSayisi; h++) {
    // Bu haftanın Pazartesi ISO'su
    const haftaPzt = new Date(baslangic);
    haftaPzt.setDate(baslangic.getDate() + h * 7);
    const haftaPztISO = nobetTarihISO(haftaPzt.getFullYear(), haftaPzt.getMonth(), haftaPzt.getDate());

    // Bu haftanın şablonu: önceki hafta ters çevrilmiş
    // h=0 için: oncekiHafta ters çevrilir (referans haftasının tersi = ilk üretilen hafta)
    // h=1 için: h=0'ın tersi, yani referans haftasıyla aynı
    // ... böylece hafta bittikçe otomatik yer değişimi olur
    const buHaftaSablon = {};
    for (let g = 1; g <= 5; g++) {
      const onceki = (h === 0 ? oncekiHafta : null); // h>0 için anlık hesap
      // oncekiHafta yerine yinelemeli takip: bir önceki h'nin şablonunu kullanmak gerekiyor
      // Bunu dışarıda tutuyoruz — aşağıda çözüyoruz
      buHaftaSablon[g] = null; // aşağıda doldurulacak
    }
  }

  // Daha temiz yaklaşım: aktif şablonu döngüde tut
  let aktifSablon = {}; // her hafta başında güncellenir
  for (let g = 1; g <= 5; g++) {
    // İlk hafta: oncekiHafta'nın TERSİ (çünkü referansHafta = önceki hafta)
    aktifSablon[g] = {
      bahce: oncekiHafta[g]?.bina  || '',
      bina:  oncekiHafta[g]?.bahce || ''
    };
  }

  for (let h = 0; h < haftaSayisi; h++) {
    const haftaPzt = new Date(baslangic);
    haftaPzt.setDate(baslangic.getDate() + h * 7);
    const haftaPztISO = nobetTarihISO(haftaPzt.getFullYear(), haftaPzt.getMonth(), haftaPzt.getDate());

    for (let g = 1; g <= 5; g++) {
      const d = new Date(haftaPzt);
      d.setDate(haftaPzt.getDate() + g - 1);
      const iso = nobetTarihISO(d.getFullYear(), d.getMonth(), d.getDate());

      // Tatil veya haftasonu → atla
      if (nobetHaftasonuMu(d.getFullYear(), d.getMonth(), d.getDate())) continue;
      if (nobetTatilMi(iso)) { atlananTatil++; continue; }

      const bahceOgrId = aktifSablon[g]?.bahce;
      const binaOgrId  = aktifSablon[g]?.bina;
      const bahceOgr   = bahceOgrId ? ogretmenler.find(o => o.id === bahceOgrId) : null;
      const binaOgr    = binaOgrId  ? ogretmenler.find(o => o.id === binaOgrId)  : null;

      // Bahçe ataması
      if (bahceOgr && !nobetAtamalari.find(a => a.tarih === iso && a.yerId === bahceYerId)) {
        const ref = db.collection(COL.nobetAtamalari).doc();
        batch.set(ref, { tarih: iso, yerId: bahceYerId, ogretmenAdSoyad: bahceOgr.ad+' '+bahceOgr.soyad, ogretmenId: bahceOgr.id });
        batchSayac++; toplamAtama++;
      }

      // Bina ataması
      if (binaOgr && !nobetAtamalari.find(a => a.tarih === iso && a.yerId === binaYerId)) {
        const ref = db.collection(COL.nobetAtamalari).doc();
        batch.set(ref, { tarih: iso, yerId: binaYerId, ogretmenAdSoyad: binaOgr.ad+' '+binaOgr.soyad, ogretmenId: binaOgr.id });
        batchSayac++; toplamAtama++;
      }

      // Nöbetçi Amir
      if (amirListesi.length > 0 && !nobetciAmirleri.find(a => a.tarih === iso)) {
        const amirId = amirListesi[amirSayac % amirListesi.length];
        const amirOgr = ogretmenler.find(o => o.id === amirId);
        if (amirOgr) {
          const ref = db.collection(COL.nobetciAmirleri).doc();
          batch.set(ref, { tarih: iso, ad: amirOgr.ad+' '+amirOgr.soyad, telefon: amirOgr.telefon||'', ogretmenId: amirOgr.id });
          batchSayac++; toplamAmir++;
        }
        amirSayac++;
      }

      if (batchSayac >= 400) { await batch.commit(); batch = db.batch(); batchSayac = 0; }
    }

    // Bu hafta tamamlandı — sonHafta olarak kaydet
    yeniSonHafta = { iso: haftaPztISO };
    for (let g = 1; g <= 5; g++) yeniSonHafta[g] = { ...aktifSablon[g] };

    // Bir sonraki hafta için şablonu ters çevir
    const sonrakiSablon = {};
    for (let g = 1; g <= 5; g++) {
      sonrakiSablon[g] = { bahce: aktifSablon[g].bina, bina: aktifSablon[g].bahce };
    }
    aktifSablon = sonrakiSablon;
  }

  if (batchSayac > 0) await batch.commit();

  // Şablonu Firestore'a kaydet
  await db.collection(COL.nobetRotasyon).doc('sablon').set({
    yerler: { bahce: bahceYerId, bina: binaYerId },
    referansHafta,
    amirListesi,
    amirSayac,
    sonHafta: yeniSonHafta,
    guncelleme: new Date().toISOString().slice(0, 10)
  });

  const parcalar = [`${toplamAtama} nöbet ataması`];
  if (toplamAmir > 0)   parcalar.push(`${toplamAmir} nöbetçi amir`);
  if (atlananTatil > 0) parcalar.push(`${atlananTatil} tatil günü atlandı`);
  toast('✅ Tamamlandı: ' + parcalar.join(' · ') + '.');
  renderNobetTakvimi();
}
