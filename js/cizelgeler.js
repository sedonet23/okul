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
    html += `<tr><td class="cz-rowlabel"><span>${escapeHtml(satir.ad||'')}${tanim.extraAlan && satir[tanim.extraAlan] ? `<span class="cz-extra">${escapeHtml(satir[tanim.extraAlan])}</span>` : ''}</span></td>`;
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
          <div class="bgh-meta">${escapeHtml(e.tarih||'')}${e.gorevliOgretmen?' · '+escapeHtml(e.gorevliOgretmen):''}</div>
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
  const body = `
    <div class="form-group"><label>Başlık</label><input id="f_bghBaslik" value="${e?escapeHtml(e.baslik):''}" placeholder="örn: Cumhuriyet Bayramı"></div>
    <div class="form-group"><label>Tarih / Dönem</label><input id="f_bghTarih" value="${e?escapeHtml(e.tarih||''):''}" placeholder="örn: 29 Ekim ya da 'Ekim ayının 3. haftası'"></div>
    <div class="form-group"><label>Ay Grubu</label><input id="f_bghAyGrubu" value="${e?escapeHtml(e.ayGrubu||''):''}" placeholder="örn: EKİM"></div>
    <div class="form-group"><label>Görevli Öğretmen(ler)</label><input id="f_bghGorevli" value="${e?escapeHtml(e.gorevliOgretmen||''):''}"></div>
  `;
  modalAc(e?'Etkinliği Düzenle':'Yeni Etkinlik', body, ()=>{
    const baslik = document.getElementById('f_bghBaslik').value.trim();
    if(!baslik){ toast('Başlık zorunludur.'); return; }
    const veri = {
      baslik, tarih: document.getElementById('f_bghTarih').value.trim(),
      ayGrubu: document.getElementById('f_bghAyGrubu').value.trim().toLocaleUpperCase('tr'),
      gorevliOgretmen: document.getElementById('f_bghGorevli').value.trim()
    };
    const islem = e ? db.collection(COL.belirliGunler).doc(e.id).update(veri)
                     : db.collection(COL.belirliGunler).add({...veri, tamamlandi:false, sira: belirliGunlerListesi.length+1});
    islem.then(()=>{ toast('Kaydedildi.'); modalKapat(); }).catch(err=>toast('Hata: '+err.message));
  }, e ? ()=>{ if(confirm('Bu etkinliği silmek istiyor musunuz?')){ db.collection(COL.belirliGunler).doc(e.id).delete(); modalKapat(); } } : null);
}

/* ============== DİĞER EVRAKLAR ============== */
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
