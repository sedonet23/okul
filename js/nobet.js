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
   OTOMATİK HAFTALIK ROTASYON DAĞITIMI  (v2)
   ====================================================================
   Çalışma mantığı:
   ─ İki nöbet yeri seçilir: YER-1 (örn. Bahçe) ve YER-2 (örn. Okul Binası)
   ─ Öğretmenler Grup A ve Grup B olarak ikiye ayrılır
   ─ Hafta 1 → Grup A Yer-1'de, Grup B Yer-2'de
     Hafta 2 → Grup A Yer-2'de, Grup B Yer-1'de  (yer değişimi)
     ...ve böyle devam eder
   ─ Her iş günü için sıradaki öğretmen atanır (round-robin)
   ─ Tatil günleri atlanır; o günün ataması yapılmaz
     ama haftanın grubu değişmez (tatil rotasyonu bozmaz)
   ─ Nöbetçi Amir: ayrı bir öğretmen listesi, her iş günü sırayla
   ─ Zaten ataması olan günler korunur (üzerine yazılmaz)
   ==================================================================== */

function nobetOtomatikDagitimModalAc() {
  const yerler = nobetYerSirali();
  if (yerler.length < 2) {
    toast('Otomatik dağıtım için en az 2 nöbet yeri gerekli.'); return;
  }
  if (ogretmenler.length === 0) {
    toast('Öğretmen listesi boş.'); return;
  }

  // Başlangıç: bu haftanın Pazartesi'si
  const bugun = new Date();
  const haftaGun = bugun.getDay() || 7;
  const pzt = new Date(bugun);
  pzt.setDate(bugun.getDate() - haftaGun + 1);
  const baslangicISO = nobetTarihISO(pzt.getFullYear(), pzt.getMonth(), pzt.getDate());

  // Nöbet yeri seçim satırları (ilk ikisi varsayılan seçili)
  const yerSecimHTML = yerler.map((y, i) => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border,#eee);">
      <span style="flex:1;font-weight:600;">${escapeHtml(y.ad)}</span>
      <select id="oto_yer_${y.id}" style="width:140px;">
        <option value="yer1" ${i===0?'selected':''}>📍 Yer 1 (ilk hafta A)</option>
        <option value="yer2" ${i===1?'selected':''}>📍 Yer 2 (ilk hafta B)</option>
        <option value="yoksay" ${i>1?'selected':''}>— Yoksay (manuel)</option>
      </select>
    </div>`).join('');

  // Öğretmen satırları
  const siraliOgr = [...ogretmenler].sort((a,b) =>
    (a.ad+' '+a.soyad).localeCompare(b.ad+' '+b.soyad,'tr'));

  const ogrSecimHTML = siraliOgr.map(o => `
    <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border,#eee);">
      <span style="flex:1;font-size:13px;">${escapeHtml(o.ad+' '+o.soyad)}</span>
      <select id="oto_ogr_${o.id}" style="width:150px;">
        <option value="A">Grup A</option>
        <option value="B">Grup B</option>
        <option value="amir">👮 Nöbetçi Amir</option>
        <option value="yoksay">— Katılmasın</option>
      </select>
    </div>`).join('');

  const body = `
    <div style="max-height:70vh;overflow-y:auto;padding-right:6px;">

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
        <div>
          <label style="font-weight:700;display:block;margin-bottom:5px;">Başlangıç (Pazartesi)</label>
          <input type="date" id="oto_baslangic" value="${baslangicISO}" style="width:100%;">
        </div>
        <div>
          <label style="font-weight:700;display:block;margin-bottom:5px;">Kaç hafta?</label>
          <select id="oto_hafta" style="width:100%;">
            <option value="4">4 hafta (~1 ay)</option>
            <option value="8" selected>8 hafta (~2 ay)</option>
            <option value="12">12 hafta (~3 ay)</option>
            <option value="16">16 hafta (~4 ay)</option>
          </select>
        </div>
      </div>

      <div style="background:var(--bg-secondary,#f5f7ff);border-radius:8px;padding:10px;margin-bottom:16px;font-size:12px;color:var(--ink-muted);">
        <strong>Rotasyon:</strong> Grup A ilk hafta Yer-1'de, Grup B Yer-2'de nöbet tutar.
        Sonraki hafta yerler değişir. Tatil günleri atlanır, rotasyon bozulmaz.
        Nöbetçi Amir listesi her iş günü sırayla döner.
      </div>

      <div style="margin-bottom:16px;">
        <div style="font-weight:700;margin-bottom:8px;">🗺️ Nöbet Yerleri</div>
        ${yerSecimHTML}
      </div>

      <div style="margin-bottom:8px;">
        <div style="font-weight:700;margin-bottom:4px;">👤 Öğretmenler</div>
        <div style="font-size:12px;color:var(--ink-muted);margin-bottom:8px;">
          Grup A ve Grup B Yer-1/Yer-2 arasında haftalık döner.
          Nöbetçi Amir ayrı listeden her gün sırayla atanır.
        </div>
        ${ogrSecimHTML}
      </div>

      <div style="background:#fff8e1;border:1px solid #ffd54f;border-radius:6px;padding:8px;font-size:12px;margin-top:12px;">
        ⚠️ Zaten ataması olan günler korunur. Sadece boş günlere yazılır.
      </div>
    </div>`;

  modalAc('🔄 Otomatik Nöbet Dağıtımı', body, nobetOtomatikDagitimUygula, null);
}

async function nobetOtomatikDagitimUygula() {
  // --- Girdi oku ---
  const baslangicVal = document.getElementById('oto_baslangic').value;
  const haftaSayisi  = parseInt(document.getElementById('oto_hafta').value);
  if (!baslangicVal) { toast('Başlangıç tarihi seçin.'); return; }

  // Başlangıcı kesin Pazartesi yap
  const baslangic = new Date(baslangicVal + 'T00:00:00');
  const hw = baslangic.getDay() || 7;
  baslangic.setDate(baslangic.getDate() - hw + 1);

  // Nöbet yerleri
  const yerler = nobetYerSirali();
  const yer1 = yerler.filter(y => document.getElementById('oto_yer_' + y.id)?.value === 'yer1');
  const yer2 = yerler.filter(y => document.getElementById('oto_yer_' + y.id)?.value === 'yer2');

  if (yer1.length === 0 || yer2.length === 0) {
    toast('Hem Yer-1 hem Yer-2 seçili olmalı.'); return;
  }

  // Öğretmen grupları
  const siraliOgr = [...ogretmenler].sort((a,b) =>
    (a.ad+' '+a.soyad).localeCompare(b.ad+' '+b.soyad,'tr'));
  const grupA  = siraliOgr.filter(o => document.getElementById('oto_ogr_' + o.id)?.value === 'A');
  const grupB  = siraliOgr.filter(o => document.getElementById('oto_ogr_' + o.id)?.value === 'B');
  const amirGr = siraliOgr.filter(o => document.getElementById('oto_ogr_' + o.id)?.value === 'amir');

  if (grupA.length === 0 || grupB.length === 0) {
    toast('Grup A ve Grup B\'de en az birer öğretmen olmalı.'); return;
  }

  modalKapat();
  toast('Nöbet programı oluşturuluyor…');

  // Round-robin sayaçları — tüm haftalara yayılan tek sayaç
  let sayacA = 0;   // Grup A sırası
  let sayacB = 0;   // Grup B sırası
  let sayacAmir = 0; // Amir sırası

  let batch = db.batch();
  let batchSayac = 0;
  let toplamAtama = 0;
  let toplamAmir  = 0;
  let atlananTatil = 0;

  for (let h = 0; h < haftaSayisi; h++) {
    // Çift hafta (0,2,4…): Grup A → Yer1, Grup B → Yer2
    // Tek hafta  (1,3,5…): Grup A → Yer2, Grup B → Yer1
    const aYer1 = (h % 2 === 0);
    const yer1Grubu = aYer1 ? grupA : grupB;
    const yer2Grubu = aYer1 ? grupB : grupA;

    for (let g = 0; g < 5; g++) { // Pzt=0 … Cum=4
      const d = new Date(baslangic);
      d.setDate(baslangic.getDate() + h * 7 + g);
      const iso = nobetTarihISO(d.getFullYear(), d.getMonth(), d.getDate());

      // Tatil veya haftasonu → atla, sayaçlar ilerlemez
      if (nobetTatilMi(iso) || nobetHaftasonuMu(d.getFullYear(), d.getMonth(), d.getDate())) {
        if (nobetTatilMi(iso)) atlananTatil++;
        continue;
      }

      const yazBatch = (yerId, ogr) => {
        if (nobetAtamalari.find(a => a.tarih === iso && a.yerId === yerId)) return false;
        const ref = db.collection(COL.nobetAtamalari).doc();
        batch.set(ref, { tarih: iso, yerId, ogretmenAdSoyad: ogr.ad+' '+ogr.soyad, ogretmenId: ogr.id });
        batchSayac++; toplamAtama++;
        return true;
      };

      // Yer1 atamaları
      for (const yer of yer1) {
        if (yer1Grubu.length === 0) continue;
        const ogr = aYer1
          ? grupA[sayacA % grupA.length]
          : grupB[sayacB % grupB.length];
        if (yazBatch(yer.id, ogr)) {
          if (aYer1) sayacA++; else sayacB++;
        }
      }

      // Yer2 atamaları
      for (const yer of yer2) {
        if (yer2Grubu.length === 0) continue;
        const ogr = aYer1
          ? grupB[sayacB % grupB.length]
          : grupA[sayacA % grupA.length];
        if (yazBatch(yer.id, ogr)) {
          if (aYer1) sayacB++; else sayacA++;
        }
      }

      // Nöbetçi Amir
      if (amirGr.length > 0) {
        const mevcutAmir = nobetciAmirleri.find(a => a.tarih === iso);
        if (!mevcutAmir) {
          const amir = amirGr[sayacAmir % amirGr.length];
          sayacAmir++;
          const ref = db.collection(COL.nobetciAmirleri).doc();
          batch.set(ref, {
            tarih: iso,
            ad: amir.ad + ' ' + amir.soyad,
            telefon: amir.telefon || '',
            ogretmenId: amir.id
          });
          batchSayac++; toplamAmir++;
        }
      }

      if (batchSayac >= 400) {
        await batch.commit();
        batch = db.batch(); batchSayac = 0;
      }
    }
  }

  if (batchSayac > 0) await batch.commit();

  const parcalar = [`${toplamAtama} nöbet ataması`];
  if (toplamAmir > 0)   parcalar.push(`${toplamAmir} nöbetçi amir`);
  if (atlananTatil > 0) parcalar.push(`${atlananTatil} tatil günü atlandı`);
  toast('✅ Tamamlandı: ' + parcalar.join(' · ') + '.');
  renderNobetTakvimi();
}
