/* ====================================================================
   ÇİZELGELER MODÜLÜ — cizelgeler.js  v4
   · Maarif: çoklu sınıf seçimi → her sınıf AYRI Firestore kaydı
   · Sosyal Kulüpler: tik alanı (1.Dönem, 2.Dönem, Yıl Sonu)
   · Belirli Gün Ve Haftalar: sadece "Yapıldı" tiki
   · Zümre / ŞÖK / Yıllık+BEP / Rehberlik: 3 dönem tiki
   · Öğretmen profilinde tüm belgeler görünür
   ==================================================================== */

let cizelgeVerileri = { sosyalKulupler:[], sok:[], zumre:[], bepPlani:[], rehberlik:[], maarifRapor:[] };

/* ---- yardımcılar ---- */
function _pad2(n){ return String(n).padStart(2,'0'); }
function _isoToday(){ const d=new Date(); return `${d.getFullYear()}-${_pad2(d.getMonth()+1)}-${_pad2(d.getDate())}`; }
function _trTarih(iso){ if(!iso) return ''; const p=iso.split('-'); return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:iso; }
function _cCol(tip){ return COL[tip]; }
function _ogretmenAdi(id){ if(!id) return '—'; const o=(typeof ogretmenler!=='undefined'?ogretmenler:[]).find(x=>x.id===id); return o?`${o.ad} ${o.soyad}`:'—'; }
function _ogretmenAdlari(idler){ if(!Array.isArray(idler)||!idler.length) return '—'; return idler.map(_ogretmenAdi).join(', '); }
function _ogretmenListesiHtml(seciliIdler, inputId){
  const sec=Array.isArray(seciliIdler)?seciliIdler:(seciliIdler?[seciliIdler]:[]);
  return `<div class="ogr-checkbox-liste" id="${inputId}">${(typeof ogretmenler!=='undefined'?ogretmenler:[]).sort((a,b)=>a.ad.localeCompare(b.ad,'tr')).map(o=>`<label class="ogr-cb-row"><input type="checkbox" value="${o.id}" ${sec.includes(o.id)?'checked':''}><span>${escapeHtml(o.ad+' '+o.soyad)}</span></label>`).join('')}</div>`;
}
function _secilenIdler(inputId){ return Array.from(document.querySelectorAll(`#${inputId} input[type=checkbox]:checked`)).map(el=>el.value); }
function _ilerlemeHtml(tamam,toplam){ const y=toplam?Math.round(tamam/toplam*100):0; return `<span class="belge-ilerleme-metin">${tamam}/${toplam}</span><div class="belge-ilerleme-bar"><div class="belge-ilerleme-ic" style="width:${y}%"></div></div>`; }
const DONEM_ETIKETLER=['1. Dönem','2. Dönem','Yıl Sonu'];
const AYLAR_TR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

function _donemTikleriHtml(tip,id,k3){
  return `<div class="belge-kontroller">${DONEM_ETIKETLER.map((ad,i)=>`<label class="belge-kontrol-item ${k3[i]?'tamamlandi':''}"><input type="checkbox" ${k3[i]?'checked':''} onchange="belgeKontrolToggle('${tip}','${id}',${i},this.checked)"><span>${ad}</span></label>`).join('')}</div>`;
}
function _tekTikHtml(tip,id,k1){
  const t=!!k1[0];
  return `<div class="belge-kontroller"><label class="belge-kontrol-item ${t?'tamamlandi':''}"><input type="checkbox" ${t?'checked':''} onchange="belgeKontrolToggle('${tip}','${id}',0,this.checked)"><span>Yapıldı</span></label></div>`;
}

/* ================================================================
   CHECKBOX TOGGLE
   ================================================================ */
function belgeKontrolToggle(tip,id,index,deger){
  const liste=tip==='belirliGunler'?belirliGunlerListesi:(cizelgeVerileri[tip]||[]);
  const kayit=liste.find(x=>x.id===id); if(!kayit) return;
  const uzunluk=tip==='maarifRapor'?10:tip==='belirliGunler'?1:3;
  const kontroller=[...(kayit.kontroller||Array(uzunluk).fill(false))];
  while(kontroller.length<uzunluk) kontroller.push(false);
  kontroller[index]=deger;
  const kol=tip==='belirliGunler'?COL.belirliGunler:_cCol(tip);
  db.collection(kol).doc(id).update({kontroller}).then(()=>{
    if(tip==='maarifRapor'){
      document.querySelectorAll(`[onchange*="'maarifRapor','${id}',${index},"]`).forEach(cb=>{
        const lbl=cb.closest('label'); if(!lbl) return;
        lbl.classList.toggle('tamam',deger);
        const ic=lbl.querySelector('.maarif-check,.maarif-bos');
        if(ic) ic.outerHTML=deger?'<span class="maarif-check">✓</span>':'<span class="maarif-bos"></span>';
      });
      return;
    }
    const wrap=document.getElementById(`belge-${id}`); if(!wrap) return;
    const items=wrap.querySelectorAll('.belge-kontrol-item');
    if(items[index]) items[index].classList.toggle('tamamlandi',deger);
    const sayac=wrap.querySelector('.belge-mini-sayac');
    if(sayac){ const y=kontroller.filter(Boolean).length; sayac.textContent=`${y}/${uzunluk}`; sayac.className=`belge-mini-sayac ${y===uzunluk?'tamam':y>0?'kismi':''}`; }
  }).catch(err=>toast('Hata: '+err.message));
}

/* ================================================================
   renderCizelge — dağıtıcı
   ================================================================ */
function renderCizelge(tip){
  const tid={sosyalKulupler:'sosyalKuluplerTablo',sok:'sokTablo',zumre:'zumreTablo',bepPlani:'bepTablo',rehberlik:'rehberlikTablo',maarifRapor:'maarifTablo'}[tip];
  const el=document.getElementById(tid); if(!el) return;
  const veri=cizelgeVerileri[tip]||[];
  if(tip==='sosyalKulupler'){ _renderSosyalKulupler(el,veri); return; }
  if(tip==='maarifRapor'){    _renderMaarifMatris(el,veri);    return; }
  _renderDonemTablosu(el,tip,veri);
}

/* ================================================================
   SOSYAL KULÜPLER
   ================================================================ */
function sosyalKulupModalAc(id){
  const k=id?cizelgeVerileri.sosyalKulupler.find(x=>x.id===id):null;
  const body=`
    <div class="form-group"><label>Kulüp Adı</label><input id="f_kulupAdi" value="${k?escapeHtml(k.ad):''}"></div>
    <div class="form-group"><label>Danışman Öğretmenler</label>${_ogretmenListesiHtml(k?k.ogretmenIdler||[]:[],'f_kulupOgr')}</div>
    <div class="form-group" style="display:flex;align-items:center;gap:10px;">
      <label style="margin:0;">Aktif Kulüp</label>
      <input type="checkbox" id="f_aktif" style="width:auto;" ${!k||k.aktif!==false?'checked':''}>
    </div>`;
  modalAc(k?'Kulüp Düzenle':'Yeni Kulüp',body,()=>{
    const ad=document.getElementById('f_kulupAdi').value.trim();
    if(!ad){toast('Kulüp adı zorunludur.');return;}
    kaydet(COL.sosyalKulupler,k?k.id:null,{ad,ogretmenIdler:_secilenIdler('f_kulupOgr'),aktif:document.getElementById('f_aktif').checked,kontroller:k?(k.kontroller||[false,false,false]):[false,false,false]});
    modalKapat();
  },k?()=>{if(confirm('Bu kulübü silmek istiyor musunuz?')){db.collection(COL.sosyalKulupler).doc(k.id).delete();modalKapat();}}:null);
}
function sosyalKuluplerKaydet(){ toast('Değişiklikler otomatik kaydediliyor.'); }
function renderSosyalKuluplerListesi(){ renderCizelge('sosyalKulupler'); }

function _renderSosyalKulupler(el,veri){
  if(!veri.length){el.innerHTML='<p class="empty-state">Henüz kulüp eklenmedi.</p>';return;}
  el.innerHTML=`<div class="kulup-grid">${veri.map(k=>{
    const k3=k.kontroller||[false,false,false];
    const t=k3.filter(Boolean).length;
    return `<div class="kulup-kart ${k.aktif===false?'kulup-pasif':''}" id="belge-${k.id}">
      <div class="kulup-kart-baslik">
        <span>${escapeHtml(k.ad)}</span>
        ${k.aktif===false?'<span class="badge badge-gray">Pasif</span>':'<span class="badge badge-sage">Aktif</span>'}
      </div>
      <div class="kulup-ogretmenler">${k.ogretmenIdler&&k.ogretmenIdler.length?k.ogretmenIdler.map(id=>`<span class="ogr-badge">${escapeHtml(_ogretmenAdi(id))}</span>`).join(''):'<span style="color:var(--ink-muted);font-size:12px;">Öğretmen atanmadı</span>'}</div>
      <div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:6px;">
        <span class="belge-mini-sayac ${t===3?'tamam':t>0?'kismi':''}">${t}/3</span>
        <button class="btn btn-ghost btn-sm" onclick="sosyalKulupModalAc('${k.id}')">Düzenle</button>
      </div>
      ${_donemTikleriHtml('sosyalKulupler',k.id,k3)}
    </div>`;
  }).join('')}</div>`;
}

/* ================================================================
   DÖNEM TABLOSU — Zümre, ŞÖK, Yıllık/BEP, Rehberlik
   ================================================================ */
const CIZELGE_META={
  zumre:    { baslik:'Zümre Toplantıları',
    alanlar:[
      {key:'ogretmenId', etiket:'Öğretmen',              tip:'ogretmen'},
      {key:'brans',      etiket:'Branş/Ders',             tip:'brans'},
      {key:'sinif',      etiket:'Sınıf (opsiyonel)',      tip:'sinif', opsiyonel:true},
      {key:'aciklama',   etiket:'Notlar',                 tip:'textarea', opsiyonel:true}
    ]
  },
  sok: { baslik:'ŞÖK – Şube Öğretmenler Kurulu',
    alanlar:[
      {key:'ogretmenId', etiket:'Öğretmen', tip:'ogretmen'},
      {key:'sinif',      etiket:'Sınıf',    tip:'sinif'},
      {key:'konu',       etiket:'Konu',     tip:'metin'},
      {key:'aciklama',   etiket:'Notlar',   tip:'textarea', opsiyonel:true}
    ]
  },
  bepPlani: { baslik:'Yıllık / BEP Planları',
    alanlar:[
      {key:'ogretmenId', etiket:'Öğretmen',  tip:'ogretmen'},
      /* sinif ve tur çoklu — bepPlani için özel modal (_bepModal) kullanılır */
    ],
    _ozel: true
  },
  rehberlik:{ baslik:'Rehberlik',
    alanlar:[
      {key:'ogretmenId', etiket:'Öğretmen',       tip:'ogretmen'},
      {key:'sinif',      etiket:'Sınıf',            tip:'sinif'},
      {key:'konu',       etiket:'Konu/Etkinlik',    tip:'metin'},
      {key:'aciklama',   etiket:'Notlar',            tip:'textarea', opsiyonel:true}
    ]
  }
};

function _renderDonemTablosu(el,tip,veri){
  const meta=CIZELGE_META[tip];
  if(!meta){el.innerHTML='<p class="empty-state">Yapılandırma bulunamadı.</p>';return;}
  if(!veri.length){el.innerHTML='<p class="empty-state">Henüz kayıt eklenmedi.</p>';return;}
  const gruplar={};
  veri.forEach(k=>{const ogId=k.ogretmenId||'__yok__';if(!gruplar[ogId])gruplar[ogId]=[];gruplar[ogId].push(k);});
  let html='';
  Object.entries(gruplar).forEach(([ogId,kayitlar])=>{
    const ogAdi=ogId==='__yok__'?'Öğretmen Atanmamış':_ogretmenAdi(ogId);
    const tamam=kayitlar.reduce((t,k)=>(k.kontroller||[]).filter(Boolean).length+t,0);
    const toplam=kayitlar.length*3;
    html+=`<div class="belge-ogretmen-grup"><div class="belge-ogretmen-baslik"><span class="belge-ogretmen-adi">${escapeHtml(ogAdi)}</span>${_ilerlemeHtml(tamam,toplam)}</div>`;
    kayitlar.forEach(k=>{
      const k3=k.kontroller||[false,false,false];
      const ozet=meta.alanlar.filter(a=>a.key!=='ogretmenId'&&a.key!=='aciklama').map(a=>{let v=k[a.key]||'';return v?escapeHtml(String(v)):'';}).filter(Boolean).join(' · ');
      const mt=k3.filter(Boolean).length;
      html+=`<div class="belge-kayit" id="belge-${k.id}">
        <div class="belge-kayit-baslik">
          <div class="belge-kayit-ozet">${ozet||'(detay yok)'}</div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
            <span class="belge-mini-sayac ${mt===3?'tamam':mt>0?'kismi':''}">${mt}/3</span>
            <button class="btn btn-ghost btn-sm" onclick="cizelgeSatirModalAc('${tip}','${k.id}')">Düzenle</button>
          </div>
        </div>
        ${_donemTikleriHtml(tip,k.id,k3)}
      </div>`;
    });
    html+='</div>';
  });
  el.innerHTML=html;
}

/* ================================================================
   GENEL MODAL
   ================================================================ */
function cizelgeSatirModalAc(tip,id){
  if(tip==='maarifRapor'){_maarifModal(id||null);return;}
  if(tip==='bepPlani'){_bepModal(id||null);return;}
  const meta=CIZELGE_META[tip]; if(!meta){toast('Bilinmeyen tip: '+tip);return;}
  const kayit=id?(cizelgeVerileri[tip]||[]).find(x=>x.id===id):null;
  let bodyHtml='';
  meta.alanlar.forEach(alan=>{
    const val=kayit?(kayit[alan.key]||''):'';
    bodyHtml+=`<div class="form-group"><label>${escapeHtml(alan.etiket)}</label>`;
    if(alan.tip==='ogretmen'){
      bodyHtml+=`<select id="f_${alan.key}"><option value="">— Seçiniz —</option>${(typeof ogretmenler!=='undefined'?ogretmenler:[]).sort((a,b)=>a.ad.localeCompare(b.ad,'tr')).map(o=>`<option value="${o.id}" ${o.id===val?'selected':''}>${escapeHtml(o.ad+' '+o.soyad)}</option>`).join('')}</select>`;
    } else if(alan.tip==='brans'){
      bodyHtml+=`<select id="f_${alan.key}"><option value="">— Seçiniz —</option>${(typeof bransListesi!=='undefined'?[...bransListesi].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr')):[]).map(b=>`<option value="${escapeHtml(b.ad)}" ${b.ad===val?'selected':''}>${escapeHtml(b.ad)}</option>`).join('')}</select>`;
    } else if(alan.tip==='sinif'){
      const opt=alan.opsiyonel?'<option value="">— Seçiniz (opsiyonel) —</option>':'<option value="">— Seçiniz —</option>';
      bodyHtml+=`<select id="f_${alan.key}">${opt}${(typeof siniflar!=='undefined'?[...siniflar].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr')):[]).map(s=>`<option value="${escapeHtml(s.ad)}" ${s.ad===val?'selected':''}>${escapeHtml(s.ad)}</option>`).join('')}</select>`;
    } else if(alan.tip==='select'){
      bodyHtml+=`<select id="f_${alan.key}"><option value="">— Seçiniz —</option>${(alan.secenekler||[]).map(s=>`<option ${s===val?'selected':''}>${s}</option>`).join('')}</select>`;
    } else if(alan.tip==='textarea'){
      bodyHtml+=`<textarea id="f_${alan.key}" rows="2">${escapeHtml(val)}</textarea>`;
    } else {
      bodyHtml+=`<input id="f_${alan.key}" value="${escapeHtml(val)}">`;
    }
    bodyHtml+='</div>';
  });
  modalAc(kayit?`${meta.baslik} — Düzenle`:`${meta.baslik} — Yeni Kayıt`,bodyHtml,()=>{
    for(const alan of meta.alanlar.filter(a=>!a.opsiyonel)){
      const v=document.getElementById(`f_${alan.key}`)?.value?.trim();
      if(!v){toast(`"${alan.etiket}" zorunludur.`);return;}
    }
    const veri={};
    meta.alanlar.forEach(alan=>{const el2=document.getElementById(`f_${alan.key}`);veri[alan.key]=el2?el2.value.trim():'';});
    veri.kontroller=kayit?(kayit.kontroller||[false,false,false]):[false,false,false];
    kaydet(_cCol(tip),kayit?kayit.id:null,veri);
    modalKapat();
  },kayit?()=>{if(confirm('Bu kaydı silmek istiyor musunuz?')){db.collection(_cCol(tip)).doc(kayit.id).delete();modalKapat();}}:null);
}

/* ================================================================
   YILLIK / BEP — Sınıf çoklu + Plan Türü çoklu → ayrı kayıtlar
   ================================================================ */
function _bepModal(id){
  const kayit=id?(cizelgeVerileri.bepPlani||[]).find(x=>x.id===id):null;

  const sinifSecimHtml = kayit
    ? `<select id="f_sinif"><option value="">— Seçiniz —</option>${(typeof siniflar!=='undefined'?[...siniflar].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr')):[]).map(s=>`<option value="${escapeHtml(s.ad)}" ${s.ad===(kayit.sinif||'')?'selected':''}>${escapeHtml(s.ad)}</option>`).join('')}</select>`
    : `<div class="ogr-checkbox-liste" id="f_sinifler" style="max-height:150px;">${(typeof siniflar!=='undefined'?[...siniflar].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr')):[]).map(s=>`<label class="ogr-cb-row"><input type="checkbox" value="${escapeHtml(s.ad)}"><span>${escapeHtml(s.ad)}</span></label>`).join('')}</div>`;

  const turlar = ['Yıllık Plan','BEP Planı'];
  const turSecimHtml = kayit
    ? `<div class="ogr-checkbox-liste" id="f_turler" style="max-height:90px;">${turlar.map(t=>`<label class="ogr-cb-row"><input type="checkbox" value="${t}" ${(kayit.tur||'')=== t ?'checked':''}><span>${t}</span></label>`).join('')}</div>`
    : `<div class="ogr-checkbox-liste" id="f_turler" style="max-height:90px;">${turlar.map(t=>`<label class="ogr-cb-row"><input type="checkbox" value="${t}"><span>${t}</span></label>`).join('')}</div>`;

  const body=`
    <div class="form-group"><label>Öğretmen</label>
      <select id="f_ogretmenId"><option value="">— Seçiniz —</option>${(typeof ogretmenler!=='undefined'?ogretmenler:[]).sort((a,b)=>a.ad.localeCompare(b.ad,'tr')).map(o=>`<option value="${o.id}" ${o.id===(kayit?kayit.ogretmenId:'')?'selected':''}>${escapeHtml(o.ad+' '+o.soyad)}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>${kayit?'Sınıf':'Sınıflar (her sınıf ayrı kayıt)'}</label>${sinifSecimHtml}</div>
    <div class="form-group"><label>${kayit?'Plan Türü':'Plan Türleri (her tür ayrı kayıt)'}</label>${turSecimHtml}</div>
    <div class="form-group"><label>Notlar</label><textarea id="f_aciklama" rows="2">${escapeHtml(kayit?kayit.aciklama||'':'')}</textarea></div>`;

  modalAc(kayit?'Yıllık / BEP Planı — Düzenle':'Yıllık / BEP Planı — Yeni Kayıt',body,()=>{
    const ogretmenId=document.getElementById('f_ogretmenId').value;
    const aciklama=document.getElementById('f_aciklama').value.trim();
    if(!ogretmenId){toast('Öğretmen seçiniz.');return;}

    if(kayit){
      // Düzenleme: tek kayıt
      const sinif=document.getElementById('f_sinif').value;
      const seciliTurler=_secilenIdler('f_turler');
      if(!sinif){toast('Sınıf seçiniz.');return;}
      if(!seciliTurler.length){toast('En az bir plan türü seçiniz.');return;}
      kaydet(COL.bepPlani,kayit.id,{ogretmenId,sinif,tur:seciliTurler.join(', '),aciklama,kontroller:kayit.kontroller||[false,false,false]});
    } else {
      const seciliSinifler=_secilenIdler('f_sinifler');
      const seciliTurler=_secilenIdler('f_turler');
      if(!seciliSinifler.length){toast('En az bir sınıf seçiniz.');return;}
      if(!seciliTurler.length){toast('En az bir plan türü seçiniz.');return;}
      let sayac=0;
      seciliSinifler.forEach(sinif=>{
        seciliTurler.forEach(tur=>{
          db.collection(COL.bepPlani).add({ogretmenId,sinif,tur,aciklama,kontroller:[false,false,false],eklenmeTarihi:new Date().toISOString()}).catch(err=>toast('Hata: '+err.message));
          sayac++;
        });
      });
      toast(`${sayac} kayıt oluşturuldu.`);
    }
    modalKapat();
  },kayit?()=>{if(confirm('Bu kaydı silmek istiyor musunuz?')){db.collection(COL.bepPlani).doc(kayit.id).delete();modalKapat();}}:null);
}

/* ================================================================
   MAARİF MODEL — Modal + Matris
   ================================================================ */
function _maarifModal(id){
  const kayit=id?(cizelgeVerileri.maarifRapor||[]).find(x=>x.id===id):null;
  const sinifSecimHtml=kayit
    ?`<select id="f_sinif"><option value="">— Seçiniz —</option>${(typeof siniflar!=='undefined'?[...siniflar].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr')):[]).map(s=>`<option value="${escapeHtml(s.ad)}" ${s.ad===(kayit.sinif||'')?'selected':''}>${escapeHtml(s.ad)}</option>`).join('')}</select>`
    :`<div class="ogr-checkbox-liste" id="f_sinifler" style="max-height:160px;">${(typeof siniflar!=='undefined'?[...siniflar].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr')):[]).map(s=>`<label class="ogr-cb-row"><input type="checkbox" value="${escapeHtml(s.ad)}"><span>${escapeHtml(s.ad)}</span></label>`).join('')}</div>`;
  const body=`
    <div class="form-group"><label>Öğretmen</label>
      <select id="f_ogretmenId"><option value="">— Seçiniz —</option>${(typeof ogretmenler!=='undefined'?ogretmenler:[]).sort((a,b)=>a.ad.localeCompare(b.ad,'tr')).map(o=>`<option value="${o.id}" ${o.id===(kayit?kayit.ogretmenId:'')?'selected':''}>${escapeHtml(o.ad+' '+o.soyad)}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Ders</label>
      <select id="f_ders"><option value="">— Seçiniz —</option>${(typeof dersListesi!=='undefined'?[...dersListesi].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr')):[]).map(d=>`<option value="${escapeHtml(d.ad)}" ${d.ad===(kayit?kayit.ders:'')?'selected':''}>${escapeHtml(d.ad)}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>${kayit?'Sınıf':'Sınıflar (çoklu seçim — her sınıf ayrı kayıt olur)'}</label>${sinifSecimHtml}</div>
    <div class="form-group"><label>Açıklama (opsiyonel)</label><textarea id="f_aciklama" rows="2">${escapeHtml(kayit?kayit.aciklama||'':'')}</textarea></div>`;
  modalAc(kayit?'Maarif Raporu — Düzenle':'Maarif Raporu — Yeni Kayıt',body,()=>{
    const ogretmenId=document.getElementById('f_ogretmenId').value;
    const ders=document.getElementById('f_ders').value;
    const aciklama=document.getElementById('f_aciklama').value.trim();
    if(!ogretmenId){toast('Öğretmen seçiniz.');return;}
    if(!ders){toast('Ders seçiniz.');return;}
    if(kayit){
      const sinif=document.getElementById('f_sinif').value;
      if(!sinif){toast('Sınıf seçiniz.');return;}
      kaydet(COL.maarifRapor,kayit.id,{ogretmenId,ders,sinif,aciklama,kontroller:kayit.kontroller||Array(10).fill(false)});
    } else {
      const seciliSinifler=_secilenIdler('f_sinifler');
      if(!seciliSinifler.length){toast('En az bir sınıf seçiniz.');return;}
      seciliSinifler.forEach(sinif=>{
        db.collection(COL.maarifRapor).add({ogretmenId,ders,sinif,aciklama,kontroller:Array(10).fill(false),eklenmeTarihi:new Date().toISOString()}).catch(err=>toast('Hata: '+err.message));
      });
      toast(`${seciliSinifler.length} sınıf için kayıt oluşturuldu.`);
    }
    modalKapat();
  },kayit?()=>{if(confirm('Bu kaydı silmek istiyor musunuz?')){db.collection(COL.maarifRapor).doc(kayit.id).delete();modalKapat();}}:null);
}

function _renderMaarifMatris(el,veri){
  if(!veri.length){el.innerHTML='<p class="empty-state">Henüz kayıt eklenmedi.</p>';return;}
  const AYLAR=['Eyl','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'];
  const gruplar={};
  veri.forEach(k=>{if(!k.ogretmenId)return;if(!gruplar[k.ogretmenId])gruplar[k.ogretmenId]=[];gruplar[k.ogretmenId].push(k);});
  if(!Object.keys(gruplar).length){el.innerHTML='<p class="empty-state">Öğretmen atanmış kayıt yok.</p>';return;}
  let html='';
  Object.entries(gruplar).forEach(([ogId,kayitlar])=>{
    const ogAdi=_ogretmenAdi(ogId);
    const tamam=kayitlar.reduce((t,k)=>(k.kontroller||[]).filter(Boolean).length+t,0);
    const toplam=kayitlar.length*10;
    html+=`<div class="maarif-grup"><div class="belge-ogretmen-baslik" style="border-radius:var(--radius-md) var(--radius-md) 0 0;"><span class="belge-ogretmen-adi">${escapeHtml(ogAdi)}</span>${_ilerlemeHtml(tamam,toplam)}</div><div class="maarif-tablo-wrap"><table class="maarif-tablo"><thead><tr><th class="maarif-th-ders">DERS / SINIF</th>${AYLAR.map(a=>`<th>${a}</th>`).join('')}<th></th></tr></thead><tbody>`;
    kayitlar.sort((a,b)=>(a.ders||'').localeCompare(b.ders||'','tr')||(a.sinif||'').localeCompare(b.sinif||'','tr')).forEach(k=>{
      const k10=[...(k.kontroller||[])];while(k10.length<10)k10.push(false);
      html+=`<tr><td class="maarif-td-ders"><div class="maarif-ders-adi">${escapeHtml(k.ders||k.rapor||'—')}</div>${k.sinif?`<div class="maarif-sinif">${escapeHtml(k.sinif)}</div>`:''}</td>${AYLAR.map((_,i)=>{const t=!!k10[i];return `<td class="maarif-td-cb"><label class="maarif-cb-label${t?' tamam':''}" title="${AYLAR[i]}"><input type="checkbox" ${t?'checked':''} onchange="belgeKontrolToggle('maarifRapor','${k.id}',${i},this.checked)">${t?'<span class="maarif-check">✓</span>':'<span class="maarif-bos"></span>'}</label></td>`;}).join('')}<td><button class="btn btn-ghost btn-sm" onclick="cizelgeSatirModalAc('maarifRapor','${k.id}')" title="Düzenle">✎</button></td></tr>`;
    });
    html+=`</tbody></table></div></div>`;
  });
  el.innerHTML=html;
}

/* ================================================================
   BELİRLİ GÜN VE HAFTALAR
   ================================================================ */
let belirliGunlerListesi=[];

function belirliGunModalAc(id){
  const e=id?belirliGunlerListesi.find(x=>x.id===id):null;
  const body=`
    <div class="form-group"><label>Etkinlik Adı</label><input id="f_ad" value="${e?escapeHtml(e.ad):''}"></div>
    <div class="form-row">
      <div class="form-group"><label>Başlangıç Tarihi</label><input type="date" id="f_tarihBaslangic" value="${e?e.tarihBaslangic:_isoToday()}"></div>
      <div class="form-group"><label>Bitiş Tarihi (opsiyonel)</label><input type="date" id="f_tarihBitis" value="${e&&e.tarihBitis?e.tarihBitis:''}"></div>
    </div>
    <div class="form-group"><label>Sorumlu Öğretmenler</label>${_ogretmenListesiHtml(e?e.ogretmenIdler||[]:[],'f_bgOgr')}</div>
    <div class="form-group"><label>Notlar</label><textarea id="f_aciklama" rows="2">${e?escapeHtml(e.aciklama||''):''}</textarea></div>`;
  modalAc(e?'Etkinlik Düzenle':'Yeni Etkinlik',body,()=>{
    const ad=document.getElementById('f_ad').value.trim();
    const tarihBaslangic=document.getElementById('f_tarihBaslangic').value;
    if(!ad||!tarihBaslangic){toast('Ad ve tarih zorunludur.');return;}
    kaydet(COL.belirliGunler,e?e.id:null,{ad,tarihBaslangic,tarihBitis:document.getElementById('f_tarihBitis').value,ogretmenIdler:_secilenIdler('f_bgOgr'),aciklama:document.getElementById('f_aciklama').value.trim(),kontroller:e?(e.kontroller||[false]):[false]});
    modalKapat();
  },e?()=>{if(confirm('Silmek istiyor musunuz?')){db.collection(COL.belirliGunler).doc(e.id).delete();modalKapat();}}:null);
}

function renderBelirliGunler(){
  const el=document.getElementById('belirliGunlerTablo'); if(!el) return;
  const liste=[...belirliGunlerListesi].sort((a,b)=>(a.tarihBaslangic||'').localeCompare(b.tarihBaslangic||''));
  if(!liste.length){el.innerHTML='<p class="empty-state">Henüz etkinlik eklenmedi.</p>';return;}
  el.innerHTML=`<div style="display:flex;flex-direction:column;gap:10px;">${liste.map(e=>{
    const tamam=!!(e.kontroller&&e.kontroller[0]);
    return `<div class="belge-kayit ${tamam?'belge-tamam':''}" id="belge-${e.id}">
      <div class="belge-kayit-baslik">
        <div>
          <div class="belge-kayit-ozet">${escapeHtml(e.ad)}</div>
          <div class="belge-kayit-not">${_trTarih(e.tarihBaslangic)}${e.tarihBitis?' – '+_trTarih(e.tarihBitis):''}${e.ogretmenIdler&&e.ogretmenIdler.length?' · '+_ogretmenAdlari(e.ogretmenIdler):''}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="belirliGunModalAc('${e.id}')">Düzenle</button>
      </div>
      ${_tekTikHtml('belirliGunler',e.id,e.kontroller||[false])}
      ${e.aciklama?`<div class="belge-kayit-not" style="margin-top:4px;">${escapeHtml(e.aciklama)}</div>`:''}
    </div>`;
  }).join('')}</div>`;
}

function renderYaklasanEtkinlikler(){
  const el=document.getElementById('dashYaklasanEtkinlikler'); if(!el) return;
  const bugun=_isoToday();
  const yaklasan=belirliGunlerListesi.filter(e=>!(e.kontroller&&e.kontroller[0])&&e.tarihBaslangic>=bugun).sort((a,b)=>a.tarihBaslangic.localeCompare(b.tarihBaslangic)).slice(0,4);
  el.innerHTML=yaklasan.length?yaklasan.map(e=>`<div class="dash-row">🎉 ${_trTarih(e.tarihBaslangic)} — ${escapeHtml(e.ad)}</div>`).join(''):'<p class="empty-state">Yaklaşan etkinlik yok.</p>';
}

/* ================================================================
   ÖĞRETMEN PROFİLİNDE BELGE DURUMU
   ================================================================ */
function renderOgretmenBelgeDurumu(ogretmenId){
  let html='';

  // Sosyal kulüpler
  const kuluplar=cizelgeVerileri.sosyalKulupler.filter(k=>k.ogretmenIdler&&k.ogretmenIdler.includes(ogretmenId));
  if(kuluplar.length){
    html+=`<div class="belge-grup-baslik">🎭 Sosyal Kulüpler</div>`;
    kuluplar.forEach(k=>{
      const k3=k.kontroller||[false,false,false];const t=k3.filter(Boolean).length;
      html+=`<div class="belge-kayit" id="belge-${k.id}" style="margin-bottom:6px;"><div class="belge-kayit-baslik"><span class="belge-kayit-ozet">${escapeHtml(k.ad)}</span><span class="belge-mini-sayac ${t===3?'tamam':t>0?'kismi':''}">${t}/3</span></div>${_donemTikleriHtml('sosyalKulupler',k.id,k3)}</div>`;
    });
  }

  // Belirli gün ve haftalar
  const bgList=belirliGunlerListesi.filter(e=>e.ogretmenIdler&&e.ogretmenIdler.includes(ogretmenId));
  if(bgList.length){
    html+=`<div class="belge-grup-baslik">🎉 Belirli Gün Ve Haftalar</div>`;
    bgList.forEach(e=>{
      const tamam=!!(e.kontroller&&e.kontroller[0]);
      html+=`<div class="belge-kayit ${tamam?'belge-tamam':''}" id="belge-${e.id}" style="margin-bottom:6px;"><div class="belge-kayit-baslik"><div><div class="belge-kayit-ozet">${escapeHtml(e.ad)}</div><div class="belge-kayit-not">${_trTarih(e.tarihBaslangic)}</div></div></div>${_tekTikHtml('belirliGunler',e.id,e.kontroller||[false])}</div>`;
    });
  }

  // Maarif
  const maarifKayitlar=(cizelgeVerileri.maarifRapor||[]).filter(k=>k.ogretmenId===ogretmenId);
  if(maarifKayitlar.length){
    const t=maarifKayitlar.reduce((s,k)=>(k.kontroller||[]).filter(Boolean).length+s,0);
    const top=maarifKayitlar.length*10;
    html+=`<div class="belge-grup-baslik">📊 Maarif Raporları <span class="belge-mini-sayac ${t===top&&top>0?'tamam':t>0?'kismi':''}" style="margin-left:6px;">${t}/${top}</span></div>`;
    maarifKayitlar.forEach(k=>{
      const k10=[...(k.kontroller||[])];while(k10.length<10)k10.push(false);
      html+=`<div class="belge-kayit" id="belge-${k.id}" style="margin-bottom:4px;"><div class="belge-kayit-ozet">${escapeHtml(k.ders||'—')} · ${escapeHtml(k.sinif||'')}</div><div class="belge-kontroller" style="flex-wrap:wrap;gap:4px;margin-top:4px;">${['Eyl','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'].map((a,i)=>`<label class="belge-kontrol-item ${k10[i]?'tamamlandi':''}"><input type="checkbox" ${k10[i]?'checked':''} onchange="belgeKontrolToggle('maarifRapor','${k.id}',${i},this.checked)"><span>${a}</span></label>`).join('')}</div></div>`;
    });
  }

  // Dönem tikleri
  [{tip:'bepPlani',etiket:'📖 Yıllık / BEP Planları'},{tip:'zumre',etiket:'👥 Zümre'},{tip:'sok',etiket:'📐 ŞÖK'},{tip:'rehberlik',etiket:'🧭 Rehberlik'}].forEach(({tip,etiket})=>{
    const meta=CIZELGE_META[tip];
    const kayitlar=(cizelgeVerileri[tip]||[]).filter(k=>k.ogretmenId===ogretmenId);
    if(!kayitlar.length) return;
    const t=kayitlar.reduce((s,k)=>(k.kontroller||[]).filter(Boolean).length+s,0);
    const top=kayitlar.length*3;
    html+=`<div class="belge-grup-baslik">${etiket} <span class="belge-mini-sayac ${t===top&&top>0?'tamam':t>0?'kismi':''}" style="margin-left:6px;">${t}/${top}</span></div>`;
    kayitlar.forEach(k=>{
      const k3=k.kontroller||[false,false,false];
      const ozet=meta.alanlar.filter(a=>a.key!=='ogretmenId'&&a.key!=='aciklama').map(a=>{let v=k[a.key]||'';return v?escapeHtml(String(v)):'';}).filter(Boolean).join(' · ');
      html+=`<div class="belge-kayit" id="belge-${k.id}" style="margin-bottom:4px;"><div class="belge-kayit-ozet">${ozet||'(detay yok)'}</div>${_donemTikleriHtml(tip,k.id,k3)}</div>`;
    });
  });

  if(!html) html='<p class="empty-state">Bu öğretmene ait belge kaydı yok.</p>';
  return html;
}

/* ================================================================
   ÖĞRETMEN DETAY PANELİ ENJEKSİYONU
   ================================================================ */
(function(){
  const _bekle=setInterval(()=>{
    if(typeof ogretmenDetayAc!=='function') return;
    clearInterval(_bekle);
    const _orig=ogretmenDetayAc;
    window.ogretmenDetayAc=function(id){
      _orig(id);
      setTimeout(()=>{
        const panel=document.getElementById('detayBody'); if(!panel) return;
        if(panel.querySelector('.belge-detay-bolum')) return;
        const bolum=document.createElement('div');
        bolum.className='belge-detay-bolum';
        bolum.style.cssText='margin-top:18px;padding-top:14px;border-top:1px solid var(--border);';
        bolum.innerHTML=`<h3 style="margin-bottom:12px;">📋 Belge Durumu</h3>`+(renderOgretmenBelgeDurumu(id)||'<p class="empty-state">Kayıt yok.</p>');
        panel.appendChild(bolum);
      },80);
    };
  },100);
})();
