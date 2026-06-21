/* ====================================================================
   js/cizelgeler.js
   Excel'deki 6 "X işaretli takip çizelgesi" sayfasını (Sosyal Kulüpler,
   ŞÖK, ZÜMRE, Yıllık/BEP Planı, Rehberlik, Maarif Model Aylık Raporlar)
   tek bir genel modülle yönetir. Her satır bir Firestore dokümanıdır;
   sütunlar sabittir (gerçek Excel çizelgesinden alınmıştır), hücreye
   tıklayınca o sütun için tik açılır/kapanır.

   Ayrıca farklı şekle sahip iki çizelgeyi de içerir:
   - Belirli Gün ve Haftalar (ay gruplu görev listesi)
   - Diğer Evraklar (öğretmen/evrak/sınıf/tarih + teslim tiki)
   ==================================================================== */

const AYLAR_TAM = ['EYLÜL','EKİM','KASIM','ARALIK','OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN'];

function slugAnahtar(metin){
  const harfler = { 'ı':'i','İ':'i','ş':'s','Ş':'s','ğ':'g','Ğ':'g','ü':'u','Ü':'u','ö':'o','Ö':'o','ç':'c','Ç':'c' };
  return String(metin).split('').map(c=>harfler[c]||c).join('')
    .toLocaleLowerCase('en').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
}

/* Her çizelge tipinin sabit sütun listesi ve satır alanları */
const CIZELGE_TANIMLARI = {
  sosyalKulupler: {
    baslik: 'Sosyal Kulüpler', tabloId: 'sosyalKuluplerTablo',
    rowEtiket: 'Kulüp Adı', extraAlan: 'danisman', extraEtiket: 'Danışman Öğretmen',
    kolonlar: ['YILLIK PLAN','TOPLUM HİZMET PLANI', ...AYLAR_TAM, 'YIL SONU RAPORU']
  },
  sok: {
    baslik: 'ŞÖK', tabloId: 'sokTablo',
    rowEtiket: 'Sınıf', extraAlan: null,
    kolonlar: ['SENE BAŞI','2. DÖNEM','SENE SONU']
  },
  zumre: {
    baslik: 'Zümre', tabloId: 'zumreTablo',
    rowEtiket: 'Zümre / Ders', extraAlan: null,
    kolonlar: ['SENE BAŞI','2. DÖNEM','SENE SONU']
  },
  bepPlani: {
    baslik: 'Yıllık / BEP Planı', tabloId: 'bepTablo',
    rowEtiket: 'Öğretmen / Sınıf', extraAlan: null,
    kolonlar: ['Yıllık Plan','BEP']
  },
  rehberlik: {
    baslik: 'Rehberlik', tabloId: 'rehberlikTablo',
    rowEtiket: 'Sınıf', extraAlan: 'danisman', extraEtiket: 'Danışman Öğretmen',
    kolonlar: ['YILLIK PLAN','DÖNEM SONU RAPORU','YIL SONU RAPORU', ...AYLAR_TAM]
  },
  maarifRapor: {
    baslik: 'Maarif Model Aylık Raporlar', tabloId: 'maarifTablo',
    rowEtiket: 'Ders', extraAlan: 'sinifGrubu', extraEtiket: 'Sınıf',
    kolonlar: [...AYLAR_TAM, 'SENE SONU']
  }
};

/* tip -> dizi önbelleği (onSnapshot ile doldurulur, bkz. app.js baglantilariKur) */
let cizelgeVerileri = { sosyalKulupler: [], sok: [], zumre: [], bepPlani: [], rehberlik: [], maarifRapor: [] };
let belirliGunlerListesi = [];
let digerEvrakListesi = [];

/* ============== GENEL ÇİZELGE RENDER + CRUD ============== */
function renderCizelge(tip){
  const tanim = CIZELGE_TANIMLARI[tip];
  const hedef = document.getElementById(tanim.tabloId);
  if(!hedef) return;
  const liste = [...cizelgeVerileri[tip]].sort((a,b)=> (a.ad||'').localeCompare(b.ad||'','tr'));

  if(liste.length === 0){
    hedef.innerHTML = `<div class="empty-state">Henüz kayıt yok. "+ Yeni" ile ekleyin veya Excel'den içe aktarın.</div>`;
    return;
  }

  let html = `<table class="cizelge"><thead><tr><th class="cz-rowlabel-th">${escapeHtml(tanim.rowEtiket)}</th>`;
  tanim.kolonlar.forEach(k=>{ html += `<th>${escapeHtml(k)}</th>`; });
  html += `<th></th></tr></thead><tbody>`;

  liste.forEach(satir=>{
    const durumlar = satir.durumlar || {};
    html += `<tr><td class="cz-rowlabel"><span class="cz-rowlabel-main" title="${escapeHtml(satir.ad||'')}">${escapeHtml(satir.ad||'')}</span>${tanim.extraAlan && satir[tanim.extraAlan] ? `<span class="cz-extra" title="${escapeHtml(satir[tanim.extraAlan])}">${escapeHtml(satir[tanim.extraAlan])}</span>` : ''}</td>`;
    tanim.kolonlar.forEach(k=>{
      const anahtar = slugAnahtar(k);
      const acik = !!durumlar[anahtar];
      html += `<td><div class="cz-check ${acik?'on':''}" onclick="cizelgeHucreToggle('${tip}','${satir.id}','${anahtar}',${!acik})">${acik?'✓':''}</div></td>`;
    });
    html += `<td><button class="cz-del" title="Satırı sil" onclick="cizelgeSatirSil('${tip}','${satir.id}')">🗑</button></td></tr>`;
  });
  html += `</tbody></table>`;
  hedef.innerHTML = html;
}

function cizelgeHucreToggle(tip, id, anahtar, yeniDeger){
  db.collection(COL[tip]).doc(id).update({ [`durumlar.${anahtar}`]: yeniDeger })
    .catch(err=>toast('Güncellenemedi: '+err.message));
}

function cizelgeSatirModalAc(tip){
  const tanim = CIZELGE_TANIMLARI[tip];
  const body = `
    <div class="form-group"><label>${escapeHtml(tanim.rowEtiket)}</label><input id="f_czAd" placeholder="örn: ${escapeHtml(tanim.rowEtiket)}"></div>
    ${tanim.extraAlan ? `<div class="form-group"><label>${escapeHtml(tanim.extraEtiket)}</label><input id="f_czExtra"></div>` : ''}
  `;
  modalAc(`${tanim.baslik} — Yeni Satır`, body, ()=>{
    const ad = document.getElementById('f_czAd').value.trim();
    if(!ad){ toast('Bu alan zorunludur.'); return; }
    const veri = { ad, durumlar: {} };
    if(tanim.extraAlan) veri[tanim.extraAlan] = document.getElementById('f_czExtra').value.trim();
    db.collection(COL[tip]).add({ ...veri, eklenmeTarihi: new Date().toISOString() })
      .then(()=>{ toast('Satır eklendi.'); modalKapat(); })
      .catch(err=>toast('Eklenemedi: '+err.message));
  }, null);
}

function cizelgeSatirSil(tip, id){
  if(!confirm('Bu satırı silmek istediğinize emin misiniz?')) return;
  db.collection(COL[tip]).doc(id).delete()
    .then(()=>toast('Satır silindi.'))
    .catch(err=>toast('Silinemedi: '+err.message));
}

/* ============== BELİRLİ GÜN VE HAFTALAR ============== */
function renderBelirliGunler(){
  const hedef = document.getElementById('belirliGunlerTablo');
  if(!hedef) return;
  if(belirliGunlerListesi.length === 0){
    hedef.innerHTML = `<div class="empty-state">Henüz etkinlik eklenmedi.</div>`;
    return;
  }
  const gruplar = {};
  const siraNo = [...belirliGunlerListesi].sort((a,b)=>(a.sira||0)-(b.sira||0));
  siraNo.forEach(e=>{
    const grup = e.ayGrubu || 'DİĞER';
    (gruplar[grup] = gruplar[grup]||[]).push(e);
  });
  let html = '';
  Object.keys(gruplar).forEach(grup=>{
    html += `<div class="bgh-ay-baslik">${escapeHtml(grup)}</div>`;
    gruplar[grup].forEach(e=>{
      html += `<div class="bgh-row">
        <div class="cz-check ${e.tamamlandi?'on':''}" onclick="belirliGunToggle('${e.id}',${!e.tamamlandi})">${e.tamamlandi?'✓':''}</div>
        <div class="bgh-main">
          <div class="bgh-title">${escapeHtml(e.baslik)}</div>
          <div class="bgh-meta">${e.tarihISO?formatTarih(e.tarihISO)+' · ':''}${escapeHtml(e.tarih||'')}${e.gorevliOgretmen?' · '+escapeHtml(e.gorevliOgretmen):''}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="belirliGunModalAc('${e.id}')">Düzenle</button>
      </div>`;
    });
  });
  hedef.innerHTML = html;
}
function belirliGunToggle(id, deger){
  db.collection(COL.belirliGunler).doc(id).update({tamamlandi:deger}).catch(err=>toast('Hata: '+err.message));
}
function belirliGunModalAc(id){
  const e = id ? belirliGunlerListesi.find(x=>x.id===id) : null;
  const seciliIdler = (e && e.gorevliOgretmenler) ? e.gorevliOgretmenler : [];
  const body = `
    <div class="form-group"><label>Başlık</label><input id="f_bghBaslik" value="${e?escapeHtml(e.baslik):''}" placeholder="örn: Cumhuriyet Bayramı"></div>
    <div class="form-row">
      <div class="form-group"><label>Tarih (anasayfada hatırlatma için)</label><input type="date" id="f_bghTarihISO" value="${e?(e.tarihISO||''):''}"></div>
      <div class="form-group"><label>Tarih / Dönem (serbest metin)</label><input id="f_bghTarih" value="${e?escapeHtml(e.tarih||''):''}" placeholder="örn: 29 Ekim ya da 'Ekim ayının 3. haftası'"></div>
    </div>
    <div class="form-group"><label>Ay Grubu</label><input id="f_bghAyGrubu" value="${e?escapeHtml(e.ayGrubu||''):''}" placeholder="örn: EKİM"></div>
    <div class="form-group">
      <label>Görevli Öğretmen(ler)</label>
      <div id="bghOgretmenSecimi" class="multi-select-list">
        ${ogretmenler.length ? ogretmenler.map(o=>`
          <div class="multi-select-item">
            <input type="checkbox" id="bgh_o_${o.id}" value="${o.id}" ${seciliIdler.includes(o.id)?'checked':''}>
            <label for="bgh_o_${o.id}">${escapeHtml(o.ad+' '+o.soyad)}</label>
          </div>`).join('') : '<p class="empty-state">Önce Öğretmenler sekmesinden öğretmen ekleyin.</p>'}
      </div>
      ${(e && e.gorevliOgretmen && !seciliIdler.length) ? `<div class="detay-row-muted" style="margin-top:6px;font-size:12px;">Excel'den içe aktarılan eski kayıt: "${escapeHtml(e.gorevliOgretmen)}" — yukarıdan seçim yaparsanız güncellenir.</div>` : ''}
    </div>
  `;
  modalAc(e?'Etkinliği Düzenle':'Yeni Etkinlik', body, ()=>{
    const baslik = document.getElementById('f_bghBaslik').value.trim();
    if(!baslik){ toast('Başlık zorunludur.'); return; }
    const seciliOgretmenler = Array.from(document.querySelectorAll('#bghOgretmenSecimi input[type="checkbox"]:checked')).map(el=>el.value);
    const gorevliOgretmen = seciliOgretmenler.length ? seciliOgretmenler.map(oid=>ogretmenAdi(oid)).join(', ') : (e?e.gorevliOgretmen||'':'');
    const veri = {
      baslik, tarih: document.getElementById('f_bghTarih').value.trim(),
      tarihISO: document.getElementById('f_bghTarihISO').value,
      ayGrubu: document.getElementById('f_bghAyGrubu').value.trim().toLocaleUpperCase('tr'),
      gorevliOgretmenler: seciliOgretmenler, gorevliOgretmen
    };
    const islem = e ? db.collection(COL.belirliGunler).doc(e.id).update(veri)
                     : db.collection(COL.belirliGunler).add({...veri, tamamlandi:false, sira: belirliGunlerListesi.length+1});
    islem.then(()=>{ toast('Kaydedildi.'); modalKapat(); renderYaklasanEtkinlikler(); }).catch(err=>toast('Hata: '+err.message));
  }, e ? ()=>{ if(confirm('Bu etkinliği silmek istiyor musunuz?')){ db.collection(COL.belirliGunler).doc(e.id).delete(); modalKapat(); } } : null);
}

/* ---- Anasayfa: Yaklaşan Belirli Gün/Haftalar widget'ı ---- */
function yaklasanGunSayisi(tarihISO){
  const bugun = new Date(); bugun.setHours(0,0,0,0);
  const hedef = new Date(tarihISO+'T00:00:00');
  return Math.round((hedef - bugun) / 86400000);
}
function renderYaklasanEtkinlikler(){
  const hedef = document.getElementById('dashYaklasanEtkinlikler');
  if(!hedef) return;
  const YAKLASAN_GUN_PENCERESI = 30; // bu kaç gün içindekiler gösterilsin
  const liste = belirliGunlerListesi
    .filter(e => e.tarihISO && !e.tamamlandi)
    .map(e => ({...e, kalanGun: yaklasanGunSayisi(e.tarihISO)}))
    .filter(e => e.kalanGun >= 0 && e.kalanGun <= YAKLASAN_GUN_PENCERESI)
    .sort((a,b)=>a.kalanGun-b.kalanGun)
    .slice(0,6);
  hedef.innerHTML = liste.length ? liste.map(e=>{
    const kalanMetin = e.kalanGun===0 ? 'Bugün' : e.kalanGun===1 ? 'Yarın' : `${e.kalanGun} gün sonra`;
    return `<div class="dash-row" style="cursor:pointer;" onclick="sekmeAc('belirliGunler'); belirliGunModalAc('${e.id}');">
      <span class="badge badge-amber">${kalanMetin}</span> ${escapeHtml(e.baslik)}
      ${e.gorevliOgretmen?`<span style="color:var(--text-muted)"> — ${escapeHtml(e.gorevliOgretmen)}</span>`:''}
    </div>`;
  }).join('') : '<p class="empty-state">Önümüzdeki 30 gün içinde planlı etkinlik yok.</p>';
}


function renderDigerEvrak(){
  const hedef = document.getElementById('digerEvrakTablo');
  if(!hedef) return;
  if(digerEvrakListesi.length === 0){
    hedef.innerHTML = `<div class="empty-state">Henüz evrak kaydı yok.</div>`;
    return;
  }
  const liste = [...digerEvrakListesi].sort((a,b)=>(b.tarih||'').localeCompare(a.tarih||''));
  hedef.innerHTML = liste.map(e=>`
    <div class="evrak-row">
      <div class="cz-check ${e.teslimEdildi?'on':''}" onclick="digerEvrakToggle('${e.id}',${!e.teslimEdildi})" title="Teslim edildi mi?">${e.teslimEdildi?'✓':''}</div>
      <div class="evrak-body">
        <div class="evrak-title">${escapeHtml(e.evrakTuru||'Evrak')} <span class="badge badge-gray">${escapeHtml(e.sinif||'—')}</span></div>
        <div class="evrak-meta">${escapeHtml(e.ogretmen||'—')} · ${formatTarih(e.tarih)}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="digerEvrakModalAc('${e.id}')">Düzenle</button>
    </div>
  `).join('');
}
function digerEvrakToggle(id, deger){
  db.collection(COL.digerEvrak).doc(id).update({teslimEdildi:deger}).catch(err=>toast('Hata: '+err.message));
}
function digerEvrakModalAc(id){
  const e = id ? digerEvrakListesi.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Öğretmen</label><input id="f_deOgretmen" value="${e?escapeHtml(e.ogretmen):''}"></div>
    <div class="form-group"><label>Evrak Çeşidi</label><input id="f_deTuru" value="${e?escapeHtml(e.evrakTuru):''}" placeholder="örn: Veli Toplantı Tutanağı"></div>
    <div class="form-group"><label>Sınıf</label><input id="f_deSinif" value="${e?escapeHtml(e.sinif||''):''}" placeholder="örn: 5-A"></div>
    <div class="form-group"><label>Tarih</label><input type="date" id="f_deTarih" value="${e?e.tarih:todayISO()}"></div>
  `;
  modalAc(e?'Evrakı Düzenle':'Yeni Evrak', body, ()=>{
    const ogretmen = document.getElementById('f_deOgretmen').value.trim();
    const evrakTuru = document.getElementById('f_deTuru').value.trim();
    if(!ogretmen || !evrakTuru){ toast('Öğretmen ve evrak çeşidi zorunludur.'); return; }
    const veri = { ogretmen, evrakTuru, sinif: document.getElementById('f_deSinif').value.trim(), tarih: document.getElementById('f_deTarih').value };
    const islem = e ? db.collection(COL.digerEvrak).doc(e.id).update(veri)
                     : db.collection(COL.digerEvrak).add({...veri, teslimEdildi:true});
    islem.then(()=>{ toast('Kaydedildi.'); modalKapat(); }).catch(err=>toast('Hata: '+err.message));
  }, e ? ()=>{ if(confirm('Bu evrak kaydını silmek istiyor musunuz?')){ db.collection(COL.digerEvrak).doc(e.id).delete(); modalKapat(); } } : null);
}

/* ============== SOSYAL KULÜPLER (ÖZEL) ============== */
function renderSosyalKuluplerListesi(){
  const hedef = document.getElementById('sosyalKuluplerListesi');
  if(!hedef) return;
  
  const liste = [...cizelgeVerileri.sosyalKulupler].sort((a,b)=> (a.ad||'').localeCompare(b.ad||'','tr'));
  
  if(liste.length === 0){
    hedef.style.display = 'none';
    return;
  }
  
  hedef.style.display = 'block';
  hedef.innerHTML = `<div class="card sosyal-kulupler-listesi">
    <h3>Kulüp Yönetimi</h3>
    ${liste.map(k=>`
      <div class="kulup-row">
        <div style="flex:1;">
          <div class="kulup-ad" style="font-weight:600;">${escapeHtml(k.ad)}</div>
          <div style="font-size:12px; color:var(--ink-muted);">
            Danışman: ${escapeHtml(k.danisman||'—')}
          </div>
          ${k.ogretmenler && k.ogretmenler.length > 0 ? `
            <div style="font-size:12px; color:var(--ink-muted); margin-top:4px;">
              Öğretmenler: ${k.ogretmenler.map(oid=>ogretmenAdi(oid)).join(', ')}
            </div>
          ` : ''}
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
            <input type="checkbox" ${k.aktif !== false ? 'checked' : ''} onchange="sosyalKulupDurumDegistir('${k.id}', this.checked)">
            <span style="font-size:12px;">Aktif</span>
          </label>
          <button class="btn btn-ghost btn-sm" onclick="sosyalKulupModalAc('${k.id}')">Düzenle</button>
        </div>
      </div>
    `).join('')}
  </div>`;
}

function sosyalKulupDurumDegistir(id, aktif){
  const kulup = cizelgeVerileri.sosyalKulupler.find(x=>x.id===id);
  if(kulup) kulup.aktif = aktif;
}

function sosyalKulupModalAc(id){
  const k = id ? cizelgeVerileri.sosyalKulupler.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Kulüp Adı</label><input id="f_kAd" value="${k?escapeHtml(k.ad):''}" placeholder="örn: Robotik Kulübü"></div>
    <div class="form-group"><label>Danışman Öğretmen</label><input id="f_kDanisman" value="${k?escapeHtml(k.danisman||''):''}" placeholder="Danışman adını yazın"></div>
    <div class="form-group">
      <label>Kulüp Öğretmenleri (Birden fazla seçebilirsiniz)</label>
      <div id="ogretmenlerSecimi" style="border:1px solid var(--border); border-radius:6px; padding:12px; max-height:200px; overflow-y:auto; background:var(--bg-app-soft);">
        ${ogretmenler.map(o=>`
          <label style="display:flex; align-items:center; gap:8px; padding:6px 0; cursor:pointer;">
            <input type="checkbox" value="${o.id}" ${k && k.ogretmenler && k.ogretmenler.includes(o.id)?'checked':''}>
            <span>${escapeHtml(o.ad+' '+o.soyad)}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <div class="form-group">
      <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
        <input type="checkbox" id="f_kAktif" ${k && k.aktif !== false ? 'checked' : ''}>
        <span>Aktif Kulüp</span>
      </label>
    </div>
  `;
  modalAc(k?'Kulüp Düzenle':'Yeni Kulüp', body, ()=>{
    const ad = document.getElementById('f_kAd').value.trim();
    if(!ad){ toast('Kulüp adı zorunludur.'); return; }
    
    const seciliOgretmenler = Array.from(document.querySelectorAll('#ogretmenlerSecimi input[type="checkbox"]:checked'))
      .map(el=>el.value);
    
    const veri = {
      ad,
      danisman: document.getElementById('f_kDanisman').value.trim(),
      ogretmenler: seciliOgretmenler,
      aktif: document.getElementById('f_kAktif').checked,
      durumlar: k ? k.durumlar : {}
    };
    
    const islem = k ? db.collection(COL.sosyalKulupler).doc(k.id).update(veri)
                   : db.collection(COL.sosyalKulupler).add({...veri, eklenmeTarihi: new Date().toISOString()});
    
    islem.then(()=>{ toast('Kulüp kaydedildi.'); modalKapat(); })
      .catch(err=>toast('Hata: '+err.message));
  }, k ? ()=>{ if(confirm('Bu kulübü silmek istediğinize emin misiniz?')){ db.collection(COL.sosyalKulupler).doc(k.id).delete(); modalKapat(); } } : null);
}

function sosyalKuluplerKaydet(){
  if(!db){ toast('Firebase bağlantısı yok.'); return; }
  
  let kaydedilen = 0;
  cizelgeVerileri.sosyalKulupler.forEach(k=>{
    if(k.id){
      db.collection(COL.sosyalKulupler).doc(k.id).update({
        aktif: k.aktif !== false ? true : false,
        ogretmenler: k.ogretmenler || [],
        danisman: k.danisman || ''
      }).then(()=>kaydedilen++).catch(err=>console.error('Kaydet hatası:', err));
    }
  });
  
  toast(`✓ ${cizelgeVerileri.sosyalKulupler.length} kulüp kaydedildi.`);
}
