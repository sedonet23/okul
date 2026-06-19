/* ====================================================================
   js/excel-import.js
   Excel'den (.xlsx/.xls) veri okuyup Firestore'a yazan fonksiyonlar.
   SheetJS (xlsx) kütüphanesi kullanılır (bkz. index.html script etiketi).
   ==================================================================== */

function normBaslik(deger){
  return String(deger==null?'':deger).toLocaleUpperCase('tr').replace(/\./g,'').replace(/\s+/g,' ').trim();
}
function excelTarihToISO(deger){
  if(deger instanceof Date && !isNaN(deger)) return deger.toISOString().slice(0,10);
  if(typeof deger === 'string') return deger.trim();
  return '';
}
async function workbookOku(file){
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type:'array', cellDates:true });
}
function sayfayiDiziyeCevir(wb, sheetName){
  const ws = wb.Sheets[sheetName];
  if(!ws) return null;
  return XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:null });
}

/* ============== ÖĞRETMENLER ============== */
async function ogretmenExceliIceAktar(file){
  if(!file) return;
  try{
    const wb = await workbookOku(file);
    const aoa = sayfayiDiziyeCevir(wb, wb.SheetNames[0]);
    if(!aoa){ toast('Sayfa okunamadı.'); return; }
    const headerIdx = aoa.findIndex(r=>r.some(c=>normBaslik(c)==='AD' || normBaslik(c)==='AD SOYAD'));
    if(headerIdx === -1){ toast('Başlık satırı bulunamadı (AD / AD SOYAD sütunu gerekli).'); return; }
    const header = aoa[headerIdx].map(normBaslik);
    const col = (...adlar)=>{ for(const a of adlar){ const i = header.indexOf(a); if(i!==-1) return i; } return -1; };
    const cAdSoyad = col('AD SOYAD'); const cAd = col('AD'); const cSoyad = col('SOYAD');
    const cBrans = col('BRANŞ','BRANS'); const cTel = col('TELEFON'); const cEposta = col('E-POSTA','EPOSTA','E POSTA');
    const cSorumlu = col('SORUMLU SINIF','SORUMLU SINIFI');

    let eklenen=0, guncellenen=0;
    for(let i=headerIdx+1;i<aoa.length;i++){
      const row = aoa[i]; if(!row) continue;
      let ad='', soyad='';
      if(cAdSoyad!==-1 && row[cAdSoyad]){ const p=String(row[cAdSoyad]).trim().split(/\s+/); soyad=p.pop()||''; ad=p.join(' '); }
      else { ad = cAd!==-1 ? String(row[cAd]||'').trim() : ''; soyad = cSoyad!==-1 ? String(row[cSoyad]||'').trim() : ''; }
      if(!ad) continue;
      const veri = {
        ad, soyad,
        brans: cBrans!==-1 ? String(row[cBrans]||'').trim() : '',
        telefon: cTel!==-1 ? String(row[cTel]||'').trim() : '',
        eposta: cEposta!==-1 ? String(row[cEposta]||'').trim() : '',
        sorumluSinif: cSorumlu!==-1 ? String(row[cSorumlu]||'').trim() : ''
      };
      const mevcut = ogretmenler.find(o=>o.ad.localeCompare(ad,'tr',{sensitivity:'base'})===0 && o.soyad.localeCompare(soyad,'tr',{sensitivity:'base'})===0);
      if(mevcut){ await db.collection(COL.ogretmenler).doc(mevcut.id).update(veri); guncellenen++; }
      else { await db.collection(COL.ogretmenler).add({...veri, eklenmeTarihi:new Date().toISOString()}); eklenen++; }
    }
    toast(`Öğretmenler içe aktarıldı: ${eklenen} eklendi, ${guncellenen} güncellendi.`);
  }catch(err){ console.error(err); toast('İçe aktarma hatası: '+err.message); }
}

/* ============== DERS PROGRAMI ============== */
async function dersProgramiExceliIceAktar(file){
  if(!file) return;
  try{
    const wb = await workbookOku(file);
    const aoa = sayfayiDiziyeCevir(wb, wb.SheetNames[0]);
    if(!aoa){ toast('Sayfa okunamadı.'); return; }
    const headerIdx = aoa.findIndex(r=>r.some(c=>normBaslik(c)==='SINIF') && r.some(c=>normBaslik(c)==='GÜN' || normBaslik(c)==='GUN'));
    if(headerIdx === -1){ toast('Başlık satırı bulunamadı (Sınıf / Gün / Saat / Ders / Öğretmen sütunları gerekli).'); return; }
    const header = aoa[headerIdx].map(normBaslik);
    const col = (...adlar)=>{ for(const a of adlar){ const i = header.indexOf(a); if(i!==-1) return i; } return -1; };
    const cSinif=col('SINIF'), cGun=col('GÜN','GUN'), cSaat=col('SAAT','DERS SAATİ'), cDers=col('DERS'), cOgretmen=col('ÖĞRETMEN','OGRETMEN');

    let eklenen=0, guncellenen=0;
    for(let i=headerIdx+1;i<aoa.length;i++){
      const row = aoa[i]; if(!row) continue;
      const sinif = cSinif!==-1 ? String(row[cSinif]||'').trim() : '';
      const gun = cGun!==-1 ? String(row[cGun]||'').trim() : '';
      const saat = cSaat!==-1 ? parseInt(row[cSaat]) : NaN;
      const ders = cDers!==-1 ? String(row[cDers]||'').trim() : '';
      if(!sinif || !gun || !ders || isNaN(saat)) continue;
      const ogretmenAdSoyad = cOgretmen!==-1 ? String(row[cOgretmen]||'').trim() : '';
      const ogretmenObj = ogretmenler.find(o=>(`${o.ad} ${o.soyad}`).localeCompare(ogretmenAdSoyad,'tr',{sensitivity:'base'})===0);
      const veri = { sinif, gun, saat, ders, ogretmenId: ogretmenObj ? ogretmenObj.id : '' };
      const mevcut = dersProgrami.find(d=>d.sinif===sinif && d.gun===gun && d.saat===saat);
      if(mevcut){ await db.collection(COL.dersProgrami).doc(mevcut.id).update(veri); guncellenen++; }
      else { await db.collection(COL.dersProgrami).add({...veri, eklenmeTarihi:new Date().toISOString()}); eklenen++; }
    }
    toast(`Ders programı içe aktarıldı: ${eklenen} eklendi, ${guncellenen} güncellendi.`);
  }catch(err){ console.error(err); toast('İçe aktarma hatası: '+err.message); }
}

/* ============== NÖBET PROGRAMI ============== */
async function nobetExceliIceAktar(file){
  if(!file) return;
  try{
    const wb = await workbookOku(file);
    const aoa = sayfayiDiziyeCevir(wb, wb.SheetNames[0]);
    if(!aoa){ toast('Sayfa okunamadı.'); return; }
    const headerIdx = aoa.findIndex(r=>r.some(c=>normBaslik(c)==='KONUM' || normBaslik(c)==='NÖBET YERİ') && r.some(c=>normBaslik(c)==='GÜN'||normBaslik(c)==='GUN'));
    if(headerIdx === -1){ toast('Başlık satırı bulunamadı (Konum / Gün / Öğretmen sütunları gerekli).'); return; }
    const header = aoa[headerIdx].map(normBaslik);
    const col = (...adlar)=>{ for(const a of adlar){ const i = header.indexOf(a); if(i!==-1) return i; } return -1; };
    const cKonum=col('KONUM','NÖBET YERİ'), cGun=col('GÜN','GUN'), cOgretmen=col('ÖĞRETMEN','OGRETMEN');

    let eklenen=0, guncellenen=0;
    for(let i=headerIdx+1;i<aoa.length;i++){
      const row = aoa[i]; if(!row) continue;
      const konum = cKonum!==-1 ? String(row[cKonum]||'').trim() : '';
      const gun = cGun!==-1 ? String(row[cGun]||'').trim() : '';
      const ogretmenAdSoyad = cOgretmen!==-1 ? String(row[cOgretmen]||'').trim() : '';
      if(!konum || !gun || !ogretmenAdSoyad) continue;
      const ogretmenObj = ogretmenler.find(o=>(`${o.ad} ${o.soyad}`).localeCompare(ogretmenAdSoyad,'tr',{sensitivity:'base'})===0);
      if(!ogretmenObj) continue;
      const veri = { konum, gun, ogretmenId: ogretmenObj.id };
      const mevcut = nobetProgrami.find(n=>n.konum===konum && n.gun===gun);
      if(mevcut){ await db.collection(COL.nobet).doc(mevcut.id).update(veri); guncellenen++; }
      else { await db.collection(COL.nobet).add(veri); eklenen++; }
    }
    toast(`Nöbet programı içe aktarıldı: ${eklenen} eklendi, ${guncellenen} güncellendi.`);
  }catch(err){ console.error(err); toast('İçe aktarma hatası: '+err.message); }
}

/* ============== ÇİZELGE YARDIMCISI: satır bul-veya-ekle + tik birleştir ============== */
async function cizelgeSatirUpsert(tip, ad, extraObj, durumlarPatch){
  if(!ad) return;
  const tanim = CIZELGE_TANIMLARI[tip];
  const mevcut = cizelgeVerileri[tip].find(s=>{
    if(s.ad.localeCompare(ad,'tr',{sensitivity:'base'})!==0) return false;
    if(tanim.extraAlan && extraObj && extraObj[tanim.extraAlan]){
      return (s[tanim.extraAlan]||'').localeCompare(extraObj[tanim.extraAlan],'tr',{sensitivity:'base'})===0;
    }
    return true;
  });
  if(mevcut){
    const birlesikDurumlar = { ...(mevcut.durumlar||{}) };
    Object.entries(durumlarPatch).forEach(([k,v])=>{ if(v) birlesikDurumlar[k]=true; });
    const guncelleme = { durumlar: birlesikDurumlar };
    if(extraObj) Object.assign(guncelleme, extraObj);
    await db.collection(COL[tip]).doc(mevcut.id).update(guncelleme);
    return 'guncellendi';
  } else {
    await db.collection(COL[tip]).add({ ad, ...(extraObj||{}), durumlar: durumlarPatch, eklenmeTarihi:new Date().toISOString() });
    return 'eklendi';
  }
}

/* ============== TÜM ÇİZELGELERİ TEK EXCEL'DEN İÇE AKTAR ============== */
async function tumCizelgeleriIceAktar(file){
  if(!file) return;
  try{
    const wb = await workbookOku(file);
    const eslesen = [];
    for(const adi of wb.SheetNames){
      const n = normBaslik(adi);
      if(n.includes('SOSYAL KULÜP') || n.includes('SOSYAL KULUP')) eslesen.push(['sosyalKulupler', adi]);
      else if(n.includes('BELİRLİ GÜN') || n.includes('BELIRLI GUN')) eslesen.push(['belirliGunler', adi]);
      else if(n.includes('ŞÖK') || n.includes('SOK')) eslesen.push(['sok', adi]);
      else if(n.includes('ZÜMRE') || n.includes('ZUMRE')) eslesen.push(['zumre', adi]);
      else if(n.includes('BEP')) eslesen.push(['bepPlani', adi]);
      else if(n.includes('REHBERLİK') || n.includes('REHBERLIK')) eslesen.push(['rehberlik', adi]);
      else if(n.includes('MAARİF') || n.includes('MAARIF')) eslesen.push(['maarifRapor', adi]);
      else if(n.includes('DİĞER') || n.includes('DIGER')) eslesen.push(['digerEvrak', adi]);
    }
    if(eslesen.length === 0){ toast('Excel sekme adları tanınamadı. Sekme adlarını kontrol edin.'); return; }

    const sonuc = { eklenen:0, guncellenen:0, atlanan:0 };
    for(const [tip, sheetName] of eslesen){
      const aoa = sayfayiDiziyeCevir(wb, sheetName);
      if(!aoa) continue;
      if(tip==='sosyalKulupler') await ieSosyalKulupler(aoa, sonuc);
      else if(tip==='sok') await ieSokZumreBep('sok', aoa, sonuc);
      else if(tip==='zumre') await ieSokZumreBep('zumre', aoa, sonuc);
      else if(tip==='bepPlani') await ieBep(aoa, sonuc);
      else if(tip==='rehberlik') await ieRehberlik(aoa, sonuc);
      else if(tip==='maarifRapor') await ieMaarif(aoa, sonuc);
      else if(tip==='belirliGunler') await ieBelirliGunler(aoa, sonuc);
      else if(tip==='digerEvrak') await ieDigerEvrak(aoa, sonuc);
    }
    toast(`İçe aktarma tamamlandı: ${sonuc.eklenen} eklendi, ${sonuc.guncellenen} güncellendi, ${sonuc.atlanan} atlandı.`);
  }catch(err){ console.error(err); toast('İçe aktarma hatası: '+err.message); }
}

function xMi(deger){ return normBaslik(deger) === 'X'; }

async function ieSosyalKulupler(aoa, sonuc){
  const headerIdx = aoa.findIndex(r=>r.some(c=>normBaslik(c)==='KULÜP ADI' || normBaslik(c)==='KULUP ADI'));
  if(headerIdx===-1){ sonuc.atlanan++; return; }
  const header = aoa[headerIdx];
  const colAd = header.findIndex(c=>normBaslik(c)==='KULÜP ADI' || normBaslik(c)==='KULUP ADI');
  const colDanisman = colAd+1, colKolonStart = colAd+2;
  const tanim = CIZELGE_TANIMLARI.sosyalKulupler;
  for(let i=headerIdx+1;i<aoa.length;i++){
    const row = aoa[i]; if(!row || !row[colAd]) continue;
    const ad = String(row[colAd]).trim(); if(!ad) continue;
    const durumlar = {};
    tanim.kolonlar.forEach((k,idx)=>{ if(xMi(row[colKolonStart+idx])) durumlar[slugAnahtar(k)] = true; });
    const r = await cizelgeSatirUpsert('sosyalKulupler', ad, { danisman: String(row[colDanisman]||'').trim() }, durumlar);
    sonuc[r==='eklendi'?'eklenen':'guncellenen']++;
  }
}

async function ieSokZumreBep_kolonBul(aoa){
  return aoa.findIndex(r=>r.some(c=>normBaslik(c)==='SENE BAŞI' || normBaslik(c)==='SENE BASI'));
}
async function ieSokZumreBep(tip, aoa, sonuc){
  const headerIdx = await ieSokZumreBep_kolonBul(aoa);
  if(headerIdx===-1){ sonuc.atlanan++; return; }
  const header = aoa[headerIdx];
  const colKolonStart = header.findIndex(c=>normBaslik(c)==='SENE BAŞI' || normBaslik(c)==='SENE BASI');
  const colAd = colKolonStart-1;
  const tanim = CIZELGE_TANIMLARI[tip];
  for(let i=headerIdx+1;i<aoa.length;i++){
    const row = aoa[i]; if(!row || colAd<0 || !row[colAd]) continue;
    const ad = String(row[colAd]).trim(); if(!ad) continue;
    const durumlar = {};
    tanim.kolonlar.forEach((k,idx)=>{ if(xMi(row[colKolonStart+idx])) durumlar[slugAnahtar(k)] = true; });
    const r = await cizelgeSatirUpsert(tip, ad, null, durumlar);
    sonuc[r==='eklendi'?'eklenen':'guncellenen']++;
  }
}

async function ieBep(aoa, sonuc){
  const headerIdx = aoa.findIndex(r=>r.some(c=>normBaslik(c)==='BEP'));
  if(headerIdx===-1){ sonuc.atlanan++; return; }
  const header = aoa[headerIdx];
  const colYillik = header.findIndex(c=>normBaslik(c)==='YILLIK PLAN');
  const colBep = header.findIndex(c=>normBaslik(c)==='BEP');
  const colKolonStart = colYillik!==-1 ? colYillik : colBep-1;
  const colAd = colKolonStart-1;
  const tanim = CIZELGE_TANIMLARI.bepPlani;
  for(let i=headerIdx+1;i<aoa.length;i++){
    const row = aoa[i]; if(!row || colAd<0 || !row[colAd]) continue;
    const ad = String(row[colAd]).trim(); if(!ad) continue;
    const durumlar = {};
    tanim.kolonlar.forEach((k,idx)=>{ if(xMi(row[colKolonStart+idx])) durumlar[slugAnahtar(k)] = true; });
    const r = await cizelgeSatirUpsert('bepPlani', ad, null, durumlar);
    sonuc[r==='eklendi'?'eklenen':'guncellenen']++;
  }
}

async function ieRehberlik(aoa, sonuc){
  const headerIdx = aoa.findIndex(r=>r.some(c=>normBaslik(c)==='SINIF') && r.some(c=>normBaslik(c)==='DANIŞMAN ÖĞRETMEN'||normBaslik(c)==='DANISMAN OGRETMEN'));
  if(headerIdx===-1){ sonuc.atlanan++; return; }
  const header = aoa[headerIdx];
  const colAd = header.findIndex(c=>normBaslik(c)==='SINIF');
  const colDanisman = colAd+1, colKolonStart = colAd+2;
  const tanim = CIZELGE_TANIMLARI.rehberlik;
  for(let i=headerIdx+1;i<aoa.length;i++){
    const row = aoa[i]; if(!row || !row[colAd]) continue;
    const ad = String(row[colAd]).trim(); if(!ad) continue;
    const durumlar = {};
    tanim.kolonlar.forEach((k,idx)=>{ if(xMi(row[colKolonStart+idx])) durumlar[slugAnahtar(k)] = true; });
    const r = await cizelgeSatirUpsert('rehberlik', ad, { danisman: String(row[colDanisman]||'').trim() }, durumlar);
    sonuc[r==='eklendi'?'eklenen':'guncellenen']++;
  }
}

async function ieMaarif(aoa, sonuc){
  const ayRowIdx = aoa.findIndex(r=>r.filter(c=>normBaslik(c)==='EYLÜL'||normBaslik(c)==='EYLUL').length>=1);
  if(ayRowIdx===-1){ sonuc.atlanan++; return; }
  const ayRow = aoa[ayRowIdx];
  const grupRow = aoa[ayRowIdx-1] || [];
  const grupBaslangiclari = [];
  ayRow.forEach((c,idx)=>{ if(normBaslik(c)==='EYLÜL'||normBaslik(c)==='EYLUL') grupBaslangiclari.push(idx); });
  const tanim = CIZELGE_TANIMLARI.maarifRapor;
  for(let i=ayRowIdx+1;i<aoa.length;i++){
    const row = aoa[i]; if(!row || !row[1]) continue;
    const ders = String(row[1]).trim(); if(!ders) continue;
    for(const baslangic of grupBaslangiclari){
      let sinifGrubu = grupRow[baslangic];
      if(!sinifGrubu){ for(let k=baslangic;k>=0;k--){ if(grupRow[k]){ sinifGrubu = grupRow[k]; break; } } }
      sinifGrubu = String(sinifGrubu||'').trim();
      const durumlar = {};
      tanim.kolonlar.forEach((k,idx)=>{ if(xMi(row[baslangic+idx])) durumlar[slugAnahtar(k)] = true; });
      const r = await cizelgeSatirUpsert('maarifRapor', ders, { sinifGrubu }, durumlar);
      sonuc[r==='eklendi'?'eklenen':'guncellenen']++;
    }
  }
}

async function ieBelirliGunler(aoa, sonuc){
  const headerIdx = aoa.findIndex(r=>r.some(c=>normBaslik(c).startsWith('SIRA')));
  if(headerIdx===-1){ sonuc.atlanan++; return; }
  const header = aoa[headerIdx];
  const colSira = header.findIndex(c=>normBaslik(c).startsWith('SIRA'));
  const colTarih = colSira+1, colBaslik = colSira+2, colGorevli = colSira+3, colTik = colSira+4;
  let mevcutAyGrubu = '';
  for(let i=headerIdx+1;i<aoa.length;i++){
    const row = aoa[i]; if(!row) continue;
    const siraDeger = row[colSira];
    if(siraDeger===null || siraDeger===undefined || siraDeger==='') {
      const etiketAday = row.find(c=>c!==null && c!==undefined && String(c).trim()!=='');
      if(etiketAday) mevcutAyGrubu = String(etiketAday).replace(/\u00a0/g,' ').trim().toLocaleUpperCase('tr');
      continue;
    }
    if(typeof siraDeger !== 'number') continue;
    const baslik = colBaslik<row.length ? String(row[colBaslik]||'').trim() : '';
    if(!baslik) continue;
    const tarih = excelTarihToISO(row[colTarih]);
    const gorevli = colGorevli<row.length ? String(row[colGorevli]||'').trim() : '';
    const tamamlandi = colTik<row.length ? xMi(row[colTik]) : false;
    const mevcut = belirliGunlerListesi.find(e=>e.baslik.localeCompare(baslik,'tr',{sensitivity:'base'})===0);
    if(mevcut){
      await db.collection(COL.belirliGunler).doc(mevcut.id).update({ tarih, ayGrubu: mevcutAyGrubu, gorevliOgretmen: gorevli, tamamlandi: mevcut.tamamlandi || tamamlandi });
      sonuc.guncellenen++;
    } else {
      await db.collection(COL.belirliGunler).add({ sira: siraDeger, baslik, tarih, ayGrubu: mevcutAyGrubu, gorevliOgretmen: gorevli, tamamlandi });
      sonuc.eklenen++;
    }
  }
}

async function ieDigerEvrak(aoa, sonuc){
  const headerIdx = aoa.findIndex(r=>r.some(c=>normBaslik(c)==='ÖĞRETMEN'||normBaslik(c)==='OGRETMEN'));
  if(headerIdx===-1){ sonuc.atlanan++; return; }
  const header = aoa[headerIdx];
  const colOgretmen = header.findIndex(c=>normBaslik(c)==='ÖĞRETMEN'||normBaslik(c)==='OGRETMEN');
  const colTuru = header.findIndex(c=>normBaslik(c)==='EVRAK ÇEŞİDİ'||normBaslik(c)==='EVRAK CESIDI');
  const colSinif = header.findIndex(c=>normBaslik(c)==='SINIF');
  const colTarih = header.findIndex(c=>normBaslik(c)==='TARİH'||normBaslik(c)==='TARIH');
  for(let i=headerIdx+1;i<aoa.length;i++){
    const row = aoa[i]; if(!row || !row[colOgretmen]) continue;
    const ogretmen = String(row[colOgretmen]||'').trim();
    const evrakTuru = colTuru!==-1 ? String(row[colTuru]||'').trim() : '';
    const sinif = colSinif!==-1 ? String(row[colSinif]||'').trim() : '';
    const tarih = colTarih!==-1 ? excelTarihToISO(row[colTarih]) : '';
    if(!ogretmen || !evrakTuru) continue;
    const zatenVar = digerEvrakListesi.some(e=> e.ogretmen===ogretmen && e.evrakTuru===evrakTuru && e.sinif===sinif && e.tarih===tarih);
    if(zatenVar){ sonuc.atlanan++; continue; }
    await db.collection(COL.digerEvrak).add({ ogretmen, evrakTuru, sinif, tarih, teslimEdildi:true });
    sonuc.eklenen++;
  }
}
