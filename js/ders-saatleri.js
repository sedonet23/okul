/* ====================================================================
   js/ders-saatleri.js
   Zil çalma saatleri (7 ders + öğle arası) — tamamen esnek/düzenlenebilir.
   Ders Programı tablosundaki saat etiketlerini, teneffüs sürelerini ve
   Genel Bakış sayfasındaki "zile kaç dakika kaldı" canlı sayacını besler.
   ==================================================================== */

let dersSaatleriAyarlari = null; // Firestore'dan gelen { donemler:[...], ogleArasi:{...} } ya da null (henüz kaydedilmemiş)

function pad2(n){ return n.toString().padStart(2,'0'); }
function dakikaToSaat(dk){ dk=((dk%1440)+1440)%1440; return `${pad2(Math.floor(dk/60))}:${pad2(dk%60)}`; }
function saatToDakika(hhmm){
  if(!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return 0;
  const [h,m] = hhmm.split(':').map(x=>parseInt(x)||0);
  return h*60+m;
}

/* Varsayılan: 1. ders 08:30'da başlar, her ders 40 dk, dersler arası 10 dk
   teneffüs, 4. dersten sonra 50 dk öğle arası. Kullanıcı bunların tamamını
   Ayarlar sayfasından serbestçe değiştirebilir. */
function dersSaatleriVarsayilan(){
  const dersSure=40, teneffusSure=10, ogleSure=50, ogleSonrakiDers=4;
  let dk = 8*60+30;
  const donemler = [];
  for(let s=1;s<=7;s++){
    const bas=dk, bit=dk+dersSure;
    donemler.push({ saat:s, baslangic:dakikaToSaat(bas), bitis:dakikaToSaat(bit) });
    dk = bit + (s===ogleSonrakiDers ? ogleSure : teneffusSure);
  }
  const ogleBasDonem = donemler.find(d=>d.saat===ogleSonrakiDers);
  const ogleBitDonem = donemler.find(d=>d.saat===ogleSonrakiDers+1);
  return {
    donemler,
    ogleArasi: {
      sonrakiDers: ogleSonrakiDers,
      baslangic: ogleBasDonem ? ogleBasDonem.bitis : '12:10',
      bitis: ogleBitDonem ? ogleBitDonem.baslangic : '13:00'
    }
  };
}

function dersSaatiBilgisi(saatNo){
  const ayar = dersSaatleriAyarlari || dersSaatleriVarsayilan();
  return ayar.donemler.find(d=>d.saat===saatNo) || null;
}

/* Tüm günü (7 ders + öğle arası) zaman sırasına göre tek bir dizi haline getirir. */
function dersSaatleriSegmentleri(){
  const ayar = dersSaatleriAyarlari || dersSaatleriVarsayilan();
  const segs = (ayar.donemler||[]).map(d=>({
    tip:'ders', saat:d.saat, bas:saatToDakika(d.baslangic), bit:saatToDakika(d.bitis), etiket:`${d.saat}. Ders`
  }));
  if(ayar.ogleArasi && ayar.ogleArasi.baslangic && ayar.ogleArasi.bitis){
    segs.push({ tip:'ogle', bas:saatToDakika(ayar.ogleArasi.baslangic), bit:saatToDakika(ayar.ogleArasi.bitis), etiket:'Öğle Arası' });
  }
  segs.sort((a,b)=>a.bas-b.bas);
  return segs;
}

/* Bir ders saatinden sonraki boşluğun (teneffüs/öğle arası) bilgisini döner. */
function sonrakiSegmentBilgisi(saatNo){
  const segs = dersSaatleriSegmentleri();
  const idx = segs.findIndex(s=>s.tip==='ders' && s.saat===saatNo);
  if(idx===-1 || idx===segs.length-1) return null;
  const bu = segs[idx], sonraki = segs[idx+1];
  return { sonrakiTip: sonraki.tip, fark: sonraki.bas - bu.bit, sonrakiEtiket: sonraki.etiket };
}

/* Şu anki dakikaya göre: derste mi, teneffüste mi, öğle arasında mı,
   yoksa okul saatleri dışında mı olduğumuzu ve zile kalan dakikayı hesaplar. */
function suankiDersDurumu(){
  const segs = dersSaatleriSegmentleri();
  if(!segs.length) return { durum:'yok' };
  const simdi = new Date();
  const simdiDk = simdi.getHours()*60 + simdi.getMinutes();
  for(let i=0;i<segs.length;i++){
    const s = segs[i];
    if(simdiDk>=s.bas && simdiDk<s.bit){
      return { durum: s.tip==='ogle'?'ogle':'ders', etiket:s.etiket, saat:s.saat||null, kalanDk: s.bit-simdiDk };
    }
    if(simdiDk < s.bas){
      return { durum:'teneffus', etiket:s.etiket, saat:s.saat||null, kalanDk: s.bas-simdiDk };
    }
  }
  return { durum:'bitti' };
}

/* ---------- Ayarlar sayfası formu ---------- */
function renderDersSaatleriForm(){
  const hedef = document.getElementById('dersSaatleriForm');
  if(!hedef) return;
  const ayar = dersSaatleriAyarlari || dersSaatleriVarsayilan();
  
  let html = `<div style="margin-bottom:16px;">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
      <div>
        <label style="font-size:12px;font-weight:600;color:var(--ink-soft);display:block;margin-bottom:6px;">İlk Ders Başlama</label>
        <input type="time" id="dsr_autoBaslama" value="${ayar.donemler[0]?.baslangic||'08:30'}" 
               onchange="otomatikDersSaatleriniHesapla()">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:var(--ink-soft);display:block;margin-bottom:6px;">Ders Süresi (dk)</label>
        <input type="number" id="dsr_autoSure" value="40" min="15" max="60" onchange="otomatikDersSaatleriniHesapla()">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:var(--ink-soft);display:block;margin-bottom:6px;">Teneffüs (dk)</label>
        <input type="number" id="dsr_autoTeneffus" value="10" min="5" max="30" onchange="otomatikDersSaatleriniHesapla()">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
      <div>
        <label style="font-size:12px;font-weight:600;color:var(--ink-soft);display:block;margin-bottom:6px;">Öğle Arası (dk)</label>
        <input type="number" id="dsr_autoOgle" value="50" min="30" max="90" onchange="otomatikDersSaatleriniHesapla()">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;color:var(--ink-soft);display:block;margin-bottom:6px;">Öğle Arası Sonrası</label>
        <select id="dsr_autoOgleSonrasi" onchange="otomatikDersSaatleriniHesapla()">
          ${[1,2,3,4,5,6,7].map(n=>`<option value="${n}" ${ayar.ogleArasi.sonrakiDers===n?'selected':''}>Ders ${n} sonra</option>`).join('')}
        </select>
      </div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="otomatikDersSaatleriniHesapla()" style="margin-bottom:12px;">🔄 Otomatik Hesapla</button>
  </div>`;
  
  html += '<div class="ders-saat-list" style="max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-md);padding:8px;margin-bottom:12px;">';
  ayar.donemler.forEach(d=>{
    html += `<div class="ders-saat-row" style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--border-soft);">
      <span class="dsr-no" style="min-width:50px;font-weight:600;color:var(--ink-soft);">${d.saat}. Ders</span>
      <input type="time" id="dsr_bas_${d.saat}" value="${d.baslangic}" style="flex:1;">
      <span class="dsr-ayrac" style="color:var(--ink-muted);">–</span>
      <input type="time" id="dsr_bit_${d.saat}" value="${d.bitis}" style="flex:1;">
    </div>`;
  });
  html += '</div>';
  html += `<div class="ders-saat-ogle" style="border:1px solid var(--border);border-radius:var(--radius-md);padding:12px;margin-bottom:12px;background:var(--bg-app-soft);">
    <div class="dsr-ogle-baslik" style="font-weight:600;margin-bottom:10px;color:var(--ink);">Öğle Arası Ayarları</div>
    <div class="ders-saat-row" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <select id="dsr_ogleSonrasi" style="flex:1;min-width:120px;">${[1,2,3,4,5,6,7].map(n=>`<option value="${n}" ${ayar.ogleArasi.sonrakiDers===n?'selected':''}>${n}. dersten sonra</option>`).join('')}</select>
      <input type="time" id="dsr_ogleBas" value="${ayar.ogleArasi.baslangic}" style="flex:1;min-width:80px;">
      <span class="dsr-ayrac" style="color:var(--ink-muted);">–</span>
      <input type="time" id="dsr_ogleBit" value="${ayar.ogleArasi.bitis}" style="flex:1;min-width:80px;">
    </div>
  </div>
  <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">
    <button class="btn btn-primary" onclick="dersSaatleriKaydet()">Kaydet</button>
    <button class="btn btn-ghost" onclick="dersSaatleriVarsayilanaSifirla()">Varsayılana Sıfırla (40 dk)</button>
  </div>`;
  hedef.innerHTML = html;
}

/* Otomatik ders saatleri hesaplama fonksiyonu */
function otomatikDersSaatleriniHesapla(){
  const baslama = document.getElementById('dsr_autoBaslama').value;
  const dersSure = parseInt(document.getElementById('dsr_autoSure').value) || 40;
  const teneffus = parseInt(document.getElementById('dsr_autoTeneffus').value) || 10;
  const ogle = parseInt(document.getElementById('dsr_autoOgle').value) || 50;
  const ogleSonrasi = parseInt(document.getElementById('dsr_autoOgleSonrasi').value) || 4;
  
  if(!baslama) return;
  
  const [h, m] = baslama.split(':').map(Number);
  let dakika = h * 60 + m;
  
  // 7 dersin saatlerini hesapla
  for(let i = 1; i <= 7; i++){
    const bas = dakikaToSaat(dakika);
    const bit = dakikaToSaat(dakika + dersSure);
    
    document.getElementById(`dsr_bas_${i}`).value = bas;
    document.getElementById(`dsr_bit_${i}`).value = bit;
    
    // Bir sonraki dersin başlangıcı
    dakika += dersSure + (i === ogleSonrasi ? ogle : teneffus);
  }
  
  // Öğle arası saatlerini güncelle
  const ogleSonrakiDers = document.getElementById(`dsr_bas_${ogleSonrasi + 1}`);
  const ogleSonrasıDers = document.getElementById(`dsr_bit_${ogleSonrasi}`);
  if(ogleSonrasıDers && ogleSonrakiDers){
    document.getElementById('dsr_ogleBas').value = ogleSonrasıDers.value;
    document.getElementById('dsr_ogleBit').value = ogleSonrakiDers.value;
  }
}
function dersSaatleriKaydet(){
  const donemler = [1,2,3,4,5,6,7].map(n=>({
    saat:n,
    baslangic: document.getElementById('dsr_bas_'+n).value || '00:00',
    bitis: document.getElementById('dsr_bit_'+n).value || '00:00'
  }));
  const ogleArasi = {
    sonrakiDers: parseInt(document.getElementById('dsr_ogleSonrasi').value),
    baslangic: document.getElementById('dsr_ogleBas').value || '',
    bitis: document.getElementById('dsr_ogleBit').value || ''
  };
  db.collection(COL.dersSaatleri).doc('ayarlar').set({ donemler, ogleArasi })
    .then(()=>toast('Ders saatleri kaydedildi.'))
    .catch(err=>toast('Hata: '+err.message));
}
function dersSaatleriVarsayilanaSifirla(){
  if(!confirm('Ders saatlerini varsayılana (40 dk ders, 10 dk teneffüs) sıfırlamak istiyor musunuz?')) return;
  db.collection(COL.dersSaatleri).doc('ayarlar').set(dersSaatleriVarsayilan())
    .then(()=>toast('Varsayılana sıfırlandı.'))
    .catch(err=>toast('Hata: '+err.message));
}
