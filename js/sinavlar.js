/* ====================================================================
   js/sinavlar.js
   SINAV İŞLEMLERİ MODÜLÜ
   1) Yazılı Sınavlar: yazılı tarihleri ve yazılı sınav yolları (telafi)
      Veri modeli: oy_sinavlar {sinif, ders, ogretmenId, tarih, saat, tur, notlar}
   2) Deneme Sınavları: tek oturum / iki oturum, başlama-bitiş saati, süre,
      sayısal/sözel bölüm saatleri
      Veri modeli: oy_denemeSinavlari {ad, tarih, oturumTuru, baslamaSaati,
      bitisSaati, sure, sayisalBaslama, sayisalBitis, sozelBaslama, sozelBitis, notlar}
   ==================================================================== */

const SINAV_TURLERI = ['Yazılı', 'Sınav', 'Proje'];

let sinavlar = [];
let denemeSinavlari = [];
let sinavAltSekme = 'yazili';

/* ---------- alt sekme geçişi ---------- */
function sinavAltSekmeSec(s){
  sinavAltSekme = s;
  document.querySelectorAll('#tab-sinavIslemleri .filtre-btn').forEach(b=>b.classList.toggle('active', b.dataset.s===s));
  document.getElementById('sinavYaziliBolum').style.display = s==='yazili' ? '' : 'none';
  document.getElementById('sinavDenemeBolum').style.display = s==='deneme' ? '' : 'none';
}

/* ============== YAZILI SINAVLAR ============== */
function sinavTurRengi(t){ return t==='Sınav Yolu' ? 'amber' : 'sage'; }

function renderSinavlar(){
  const hedef = document.getElementById('sinavlarListesi');
  if(!hedef) return;
  const liste = [...sinavlar].sort((a,b)=>(a.tarih||'').localeCompare(b.tarih||''));
  hedef.innerHTML = liste.length ? liste.map(s=>`
    <div class="evrak-row">
      <div class="evrak-body">
        <div class="evrak-title">${escapeHtml(s.ders||'Ders')} — ${escapeHtml(s.sinif||'')} <span class="badge badge-${sinavTurRengi(s.tur)}">${escapeHtml(s.tur||'Yazılı')}</span></div>
        <div class="evrak-meta">${formatTarih(s.tarih)}${s.dersSaati?' · '+escapeHtml(s.dersSaati)+'. ders':''}${s.ogretmenId?' · '+escapeHtml(ogretmenAdi(s.ogretmenId)):''}${s.senaryoNo?' · '+escapeHtml(s.senaryoNo)+'. Senaryo':''}${s.yayinevi?' ('+escapeHtml(s.yayinevi)+')':''}${s.notlar?' · '+escapeHtml(s.notlar):''}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="sinavModalAc('${s.id}')">Düzenle</button>
    </div>
  `).join('') : '<div class="empty-state">Henüz yazılı sınavı eklenmedi. "+ Yazılı Ekle" ile başlayın.</div>';
}

function sinavModalAc(id){
  const s = id ? sinavlar.find(x=>x.id===id) : null;

  // Sınıf çoklu seçim
  const mevcutSiniflar = s ? (s.siniflar||s.sinif||'').split(',').map(x=>x.trim()).filter(Boolean) : [];
  const sinifCheckboxlar = (typeof siniflar!=='undefined'&&siniflar.length)
    ? [...siniflar].sort((a,b)=>a.ad.localeCompare(b.ad,'tr')).map(sn=>{
        const sec = mevcutSiniflar.includes(sn.ad);
        return `<label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;white-space:nowrap;padding:3px 0;">
          <input type="checkbox" class="snSinifCb" value="${escapeHtml(sn.ad)}" ${sec?'checked':''}>${escapeHtml(sn.ad)}
        </label>`;
      }).join('')
    : '<span style="color:var(--ink-muted);font-size:12px;">Önce sınıf ekleyin</span>';

  const body = `
    <div class="form-group">
      <label>Sınıf(lar)</label>
      <div style="border:1px solid var(--border);border-radius:var(--radius-md);padding:8px 10px;
        max-height:130px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:4px 14px;">
        ${sinifCheckboxlar}
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Dönem</label>
        <select id="f_snDonem">
          <option value="1. Dönem" ${(s?s.donem:'')==='1. Dönem'?'selected':''}>1. Dönem</option>
          <option value="2. Dönem" ${(s?s.donem:'')==='2. Dönem'?'selected':''}>2. Dönem</option>
        </select>
      </div>
      <div class="form-group"><label>Yazılı Sırası</label>
        <select id="f_snSirasi">
          <option value="1. Yazılı" ${(s?s.yaziliSirasi:'')==='1. Yazılı'?'selected':''}>1. Yazılı</option>
          <option value="2. Yazılı" ${(s?s.yaziliSirasi:'')==='2. Yazılı'?'selected':''}>2. Yazılı</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>Ders</label>${dersSelectHtml('f_snDers', s?s.ders||'':'')}</div>
    <div class="form-group"><label>Öğretmen</label>
      <select id="f_snOgretmen">${ogretmenSecenekleri(s?s.ogretmenId:'')}</select>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Tarih</label><input type="date" id="f_snTarih" value="${s?s.tarih:todayISO()}"></div>
      <div class="form-group"><label>Kaçıncı Ders <span style="font-weight:400;color:var(--ink-muted);">(isteğe bağlı)</span></label>
        <input type="number" id="f_snDersSaati" min="1" max="8" placeholder="örn: 3" value="${s?(s.dersSaati||''):''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Senaryo No <span style="font-weight:400;color:var(--ink-muted);">(isteğe bağlı)</span></label>
        <input type="number" id="f_snSenaryoNo" min="1" placeholder="örn: 2" value="${s?(s.senaryoNo||''):''}">
      </div>
      <div class="form-group"><label>Yayınevi <span style="font-weight:400;color:var(--ink-muted);">(isteğe bağlı)</span></label>
        <input id="f_snYayinevi" placeholder="örn: MEB, Berkay..." value="${s?escapeHtml(s.yayinevi||''):''}">
      </div>
    </div>
    <div class="form-group"><label>Notlar</label>
      <textarea id="f_snNotlar" rows="2">${s?escapeHtml(s.notlar||''):''}</textarea>
    </div>
  `;

  modalAc(s?'Sınav Düzenle':'Yazılı Sınav Ekle', body, ()=>{
    const seciliSiniflar = [...document.querySelectorAll('.snSinifCb:checked')].map(c=>c.value);
    if(!seciliSiniflar.length){ toast('En az bir sınıf seçin.'); return; }
    const ders = document.getElementById('f_snDers').value.trim();
    if(!ders){ toast('Ders zorunludur.'); return; }
    kaydet(COL.sinavlar, s?s.id:null, {
      siniflar: seciliSiniflar.join(', '),
      sinif: seciliSiniflar[0], // geriye dönük uyumluluk
      ders,
      ogretmenId: document.getElementById('f_snOgretmen').value,
      tarih: document.getElementById('f_snTarih').value,
      donem: document.getElementById('f_snDonem').value,
      yaziliSirasi: document.getElementById('f_snSirasi').value,
      dersSaati: document.getElementById('f_snDersSaati').value,
      tur: document.getElementById('f_snTur').value,
      senaryoNo: document.getElementById('f_snSenaryoNo').value,
      yayinevi: document.getElementById('f_snYayinevi').value.trim(),
      notlar: document.getElementById('f_snNotlar').value.trim()
    });
    modalKapat();
  }, s ? ()=>{ if(confirm('Bu sınav kaydını silmek istiyor musunuz?')){ db.collection(COL.sinavlar).doc(s.id).delete(); modalKapat(); } } : null);
}

/* ============== DENEME SINAVLARI ============== */
function saatDakikayaEkle(saat, dakika){
  if(!saat || dakika==null || isNaN(dakika)) return '';
  const [h,m] = saat.split(':').map(Number);
  let toplam = h*60+m+Number(dakika);
  toplam = ((toplam % (24*60)) + 24*60) % (24*60);
  const yh = Math.floor(toplam/60), ym = toplam%60;
  return `${String(yh).padStart(2,'0')}:${String(ym).padStart(2,'0')}`;
}
function dakikayiMetneCevir(dk){
  if(dk==null || isNaN(dk) || dk==='') return '';
  dk = Number(dk);
  return `${Math.floor(dk/60)} sa ${dk%60} dk`;
}
function denemeSureHesapla(baslama, bitis){
  if(!baslama || !bitis) return '';
  const [bh,bm] = baslama.split(':').map(Number);
  const [eh,em] = bitis.split(':').map(Number);
  let dk = (eh*60+em) - (bh*60+bm);
  if(dk < 0) dk += 24*60;
  return dakikayiMetneCevir(dk);
}

function renderDenemeSinavlari(){
  const hedef = document.getElementById('denemeSinavlariListesi');
  if(!hedef) return;
  const liste = [...denemeSinavlari].sort((a,b)=>(a.tarih||'').localeCompare(b.tarih||''));
  hedef.innerHTML = liste.length ? liste.map(d=>`
    <div class="evrak-row">
      <div class="evrak-body">
        <div class="evrak-title">${escapeHtml(d.ad||'Deneme Sınavı')} <span class="badge badge-blue">${escapeHtml(d.oturumTuru||'Tek Oturum')}</span></div>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-soft);">
            <span style="font-size:16px;">📅</span>
            <span>${formatTarih(d.tarih)}</span>
          </div>
          ${d.oturumTuru==='İki Oturum' ? `
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-soft);">
              <span style="font-size:16px;">📝</span>
              <span><strong>Sözel:</strong> ${escapeHtml(d.sozelBaslama||'—')}–${escapeHtml(d.sozelBitis||'—')} (${dakikayiMetneCevir(d.sozelSuresiDk)})</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-soft);">
              <span style="font-size:16px;">🔢</span>
              <span><strong>Sayısal:</strong> ${escapeHtml(d.sayisalBaslama||'—')}–${escapeHtml(d.sayisalBitis||'—')} (${dakikayiMetneCevir(d.sayisalSuresiDk)})</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-soft);">
              <span style="font-size:16px;">⏸️</span>
              <span><strong>Ara:</strong> ${dakikayiMetneCevir(d.araSureDk)}</span>
            </div>
          ` : `
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-soft);">
              <span style="font-size:16px;">⏱️</span>
              <span><strong>${escapeHtml(d.baslamaSaati||'—')}–${escapeHtml(d.bitisSaati||'—')}</strong> (${denemeSureHesapla(d.baslamaSaati,d.bitisSaati)})</span>
            </div>
          `}
          ${d.sinflar?`<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-soft);">
            <span style="font-size:16px;">👥</span>
            <span><strong>Sınıflar:</strong> ${escapeHtml(d.sinflar)}</span>
          </div>`:''}
          ${d.notlar?`<div style="display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--ink-soft);">
            <span style="font-size:16px;margin-top:1px;">💬</span>
            <span>${escapeHtml(d.notlar)}</span>
          </div>`:''}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="denemeModalAc('${d.id}')">Düzenle</button>
    </div>
  `).join('') : '<div class="empty-state">Henüz deneme sınavı eklenmedi. "+ Deneme Sınavı Ekle" ile başlayın.</div>';
}

function denemeOturumAlanlariniGoster(oturum){
  document.getElementById('denemeTekOturumAlanlari').style.display = oturum==='İki Oturum' ? 'none' : '';
  document.getElementById('denemeIkiOturumAlanlari').style.display = oturum==='İki Oturum' ? '' : 'none';
  denemeHesapla();
}

// Tüm hesaplanan (salt okunur) alanları, girilen saat/süre değerlerine göre günceller.
function denemeHesapla(){
  const oturum = document.getElementById('f_dnOturum').value;
  if(oturum==='İki Oturum'){
    const sozelBaslama = document.getElementById('f_dnSozBas').value;
    const sozelSuresi = parseInt(document.getElementById('f_dnSozSure').value) || 0;
    const araSuresi = parseInt(document.getElementById('f_dnAraSure').value) || 0;
    const sayisalSuresi = parseInt(document.getElementById('f_dnSaySure').value) || 0;

    const sozelBitis = saatDakikayaEkle(sozelBaslama, sozelSuresi);
    const sayisalBaslama = saatDakikayaEkle(sozelBitis, araSuresi);
    const sayisalBitis = saatDakikayaEkle(sayisalBaslama, sayisalSuresi);

    document.getElementById('f_dnSozBit').value = sozelBitis;
    document.getElementById('f_dnSayBas').value = sayisalBaslama;
    document.getElementById('f_dnSayBit').value = sayisalBitis;
  } else {
    const baslama = document.getElementById('f_dnTekBaslama').value;
    const sure = parseInt(document.getElementById('f_dnTekSure').value) || 0;
    document.getElementById('f_dnTekBitis').value = saatDakikayaEkle(baslama, sure);
  }
}

function denemeModalAc(id){
  const d = id ? denemeSinavlari.find(x=>x.id===id) : null;
  const oturum = d ? (d.oturumTuru||'Tek Oturum') : 'Tek Oturum';
  const body = `
    <div class="form-group"><label>Deneme Sınavı Adı</label><input id="f_dnAd" value="${d?escapeHtml(d.ad||''):''}" placeholder="örn: 3. Deneme Sınavı"></div>
    <div class="form-row">
      <div class="form-group"><label>Tarih</label><input type="date" id="f_dnTarih" value="${d?d.tarih:todayISO()}"></div>
      <div class="form-group"><label>Oturum Türü</label>
        <select id="f_dnOturum" onchange="denemeOturumAlanlariniGoster(this.value)">
          <option ${oturum==='Tek Oturum'?'selected':''}>Tek Oturum</option>
          <option ${oturum==='İki Oturum'?'selected':''}>İki Oturum</option>
        </select>
      </div>
    </div>

    <div id="denemeTekOturumAlanlari" style="display:${oturum==='İki Oturum'?'none':''};">
      <div class="form-row">
        <div class="form-group"><label>Başlama Saati</label><input type="time" id="f_dnTekBaslama" value="${d?(d.baslamaSaati||''):''}" oninput="denemeHesapla()"></div>
        <div class="form-group"><label>Sınav Süresi (dakika)</label><input type="number" min="0" id="f_dnTekSure" value="${d?(d.sinavSuresiDk||''):''}" oninput="denemeHesapla()"></div>
      </div>
      <div class="form-group"><label>Bitiş Saati (otomatik hesaplanır)</label><input type="time" id="f_dnTekBitis" value="${d?(d.bitisSaati||''):''}" disabled></div>
    </div>

    <div id="denemeIkiOturumAlanlari" style="display:${oturum==='İki Oturum'?'':'none'};">
      <div class="form-row">
        <div class="form-group"><label>Sözel Bölüm Başlama Saati</label><input type="time" id="f_dnSozBas" value="${d?(d.sozelBaslama||''):''}" oninput="denemeHesapla()"></div>
        <div class="form-group"><label>Sözel Bölüm Süresi (dakika)</label><input type="number" min="0" id="f_dnSozSure" value="${d?(d.sozelSuresiDk||''):''}" oninput="denemeHesapla()"></div>
      </div>
      <div class="form-group"><label>Sözel Bölüm Bitişi (otomatik)</label><input type="time" id="f_dnSozBit" value="${d?(d.sozelBitis||''):''}" disabled></div>

      <div class="form-group"><label>Oturumlar Arası Süre (dakika)</label><input type="number" min="0" id="f_dnAraSure" value="${d?(d.araSureDk||''):''}" oninput="denemeHesapla()"></div>

      <div class="form-group"><label>Sayısal Bölüm Başlaması (otomatik)</label><input type="time" id="f_dnSayBas" value="${d?(d.sayisalBaslama||''):''}" disabled></div>
      <div class="form-row">
        <div class="form-group"><label>Sayısal Bölüm Süresi (dakika)</label><input type="number" min="0" id="f_dnSaySure" value="${d?(d.sayisalSuresiDk||''):''}" oninput="denemeHesapla()"></div>
        <div class="form-group"><label>Sayısal Bölüm Bitişi (otomatik)</label><input type="time" id="f_dnSayBit" value="${d?(d.sayisalBitis||''):''}" disabled></div>
      </div>
    </div>

    <div class="form-group"><label>Bu denemeyi yapacak sınıflar</label>
      <div id="f_dnSinflarKutu" style="border:1px solid var(--border);border-radius:var(--radius-md);padding:8px;max-height:150px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:6px;">
        ${(typeof siniflar!=='undefined'&&siniflar.length?[...siniflar].sort((a,b)=>a.ad.localeCompare(b.ad,'tr')):[]).map(s=>{
          const mevcutSec = d && (d.sinflar||'').split(',').map(x=>x.trim()).includes(s.ad);
          return '<label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;white-space:nowrap;"><input type=\"checkbox\" class=\"dnSinifCb\" value=\"'+escapeHtml(s.ad)+'\" '+(mevcutSec?'checked':'')+'>'+escapeHtml(s.ad)+'</label>';
        }).join('')}
        ${(!siniflar||siniflar.length===0)?'<span style="color:var(--ink-muted);font-size:12px;">Önce sınıf ekleyin</span>':''}
      </div>
    </div>
    <div class="form-group"><label>Notlar</label><textarea id="f_dnNotlar" rows="2">${d?escapeHtml(d.notlar||''):''}</textarea></div>
  `;
  modalAc(d?'Deneme Sınavı Düzenle':'Deneme Sınavı Ekle', body, ()=>{
    const ad = document.getElementById('f_dnAd').value.trim();
    if(!ad){ toast('Deneme sınavı adı zorunludur.'); return; }
    const oturumTuru = document.getElementById('f_dnOturum').value;
    denemeHesapla();

    let veri = { ad, tarih: document.getElementById('f_dnTarih').value, oturumTuru, notlar: document.getElementById('f_dnNotlar').value.trim(), sinflar: Array.from(document.querySelectorAll('.dnSinifCb:checked')).map(c=>c.value).join(', ') };

    if(oturumTuru==='İki Oturum'){
      const sozelBaslama = document.getElementById('f_dnSozBas').value;
      const sozelSuresiDk = parseInt(document.getElementById('f_dnSozSure').value)||0;
      const sozelBitis = document.getElementById('f_dnSozBit').value;
      const araSureDk = parseInt(document.getElementById('f_dnAraSure').value)||0;
      const sayisalBaslama = document.getElementById('f_dnSayBas').value;
      const sayisalSuresiDk = parseInt(document.getElementById('f_dnSaySure').value)||0;
      const sayisalBitis = document.getElementById('f_dnSayBit').value;
      veri = {...veri,
        sozelBaslama, sozelSuresiDk, sozelBitis, araSureDk,
        sayisalBaslama, sayisalSuresiDk, sayisalBitis,
        baslamaSaati: sozelBaslama, bitisSaati: sayisalBitis,
        sinavSuresiDk: ''
      };
    } else {
      const baslamaSaati = document.getElementById('f_dnTekBaslama').value;
      const sinavSuresiDk = parseInt(document.getElementById('f_dnTekSure').value)||0;
      const bitisSaati = document.getElementById('f_dnTekBitis').value;
      veri = {...veri,
        baslamaSaati, bitisSaati, sinavSuresiDk,
        sozelBaslama:'', sozelSuresiDk:'', sozelBitis:'', araSureDk:'', sayisalBaslama:'', sayisalSuresiDk:'', sayisalBitis:''
      };
    }
    kaydet(COL.denemeSinavlari, d?d.id:null, veri);
    modalKapat();
  }, d ? ()=>{ if(confirm('Bu deneme sınavı kaydını silmek istiyor musunuz?')){ db.collection(COL.denemeSinavlari).doc(d.id).delete(); modalKapat(); } } : null);
}

/* ---------- FIRESTORE BAĞLANTISI (app.js baglantilariKur içinden çağrılır) ---------- */
function sinavBaglantilariKur(){
  db.collection(COL.sinavlar).onSnapshot(s=>{
    sinavlar = s.docs.map(d=>({id:d.id,...d.data()}));
    renderSinavlar();
  }, hataGoster);
  db.collection(COL.denemeSinavlari).onSnapshot(s=>{
    denemeSinavlari = s.docs.map(d=>({id:d.id,...d.data()}));
    renderDenemeSinavlari();
  }, hataGoster);
}

/* ================================================================
   YAZILI SINAV RAPORU
   ================================================================ */
function sinavRaporModalAc() {
  if (!sinavlar.length) { toast('Henüz sınav kaydı yok.'); return; }

  const tumSiniflar = [...new Set(
    sinavlar.flatMap(s => (s.siniflar||s.sinif||'').split(',').map(x=>x.trim()).filter(Boolean))
  )].sort((a,b)=>a.localeCompare(b,'tr'));

  const _okulAdi = (typeof okulBilgileriAyari!=='undefined' && okulBilgileriAyari?.okulAdi) ? okulBilgileriAyari.okulAdi : '';
  const _yil = (()=>{ const y=new Date().getFullYear(); return `${y}-${y+1}`; })();
  const inputStil = 'width:100%;padding:5px 9px;border:1px solid var(--border);border-radius:6px;font-size:13px;';
  const bolum = lbl => `<div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">${lbl}</div>`;

  const sinifCblar = tumSiniflar.map(sn=>`
    <label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer;padding:2px 0;">
      <input type="checkbox" class="rprSinifCb" value="${escapeHtml(sn)}" checked>${escapeHtml(sn)}
    </label>`).join('');

  const kolonlar = [
    {key:'siniflar', label:'Sınıf'},
    {key:'donem',    label:'Dönem'},
    {key:'ders',     label:'Ders'},
    {key:'tarih',    label:'Tarih'},
    {key:'dersSaati',label:'Kaçıncı Ders'},
    {key:'tur',      label:'Tür'},
    {key:'ogretmen', label:'Öğretmen'},
    {key:'senaryoNo',label:'Senaryo No'},
    {key:'yayinevi', label:'Yayınevi'},
    {key:'notlar',   label:'Notlar'},
  ];
  const kolonCblar = kolonlar.map(k=>`
    <label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer;padding:2px 0;">
      <input type="checkbox" class="rprKolonCb" value="${k.key}" ${['siniflar','ders','tarih','tur','senaryoNo','yayinevi'].includes(k.key)?'checked':''}>${k.label}
    </label>`).join('');

  const body = `
    ${bolum('Sayfa Yönü')}
    <div style="display:flex;gap:16px;">
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;"><input type="radio" name="rprYon" value="portrait" checked> Dikey (A4)</label>
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;"><input type="radio" name="rprYon" value="landscape"> Yatay (A4)</label>
    </div>
    ${bolum('Başlık Bilgileri')}
    <div style="display:grid;gap:7px;">
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="rpr_okulAdi" placeholder="Okul Adı" value="${escapeHtml(_okulAdi)}" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="rpr_okulGoster" checked> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="rpr_baslik" placeholder="Rapor Başlığı" value="Yazılı Sınav Takvimi" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="rpr_baslikGoster" checked> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="rpr_egitimYili" placeholder="Eğitim-Öğretim Yılı" value="${escapeHtml(_yil)}" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="rpr_yilGoster" checked> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="rpr_tarih" value="${new Date().toLocaleDateString('tr-TR')}" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="rpr_tarihGoster" checked> Göster</label>
      </div>
    </div>
    ${bolum('Dönem ve Yazılı Sırası')}
    <div style="display:flex;gap:20px;flex-wrap:wrap;">
      <div>
        <div style="font-size:11px;color:var(--ink-muted);margin-bottom:4px;">Dönem</div>
        <div style="display:flex;gap:12px;">
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;"><input type="radio" name="rprDonem" id="rpr_d1" value="1. Dönem" checked> 1. Dönem</label>
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;"><input type="radio" name="rprDonem" id="rpr_d2" value="2. Dönem"> 2. Dönem</label>
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--ink-muted);margin-bottom:4px;">Yazılı Sırası</div>
        <div style="display:flex;gap:12px;">
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;"><input type="radio" name="rprSirasi" id="rpr_s1" value="1. Yazılı" checked> 1. Yazılı</label>
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;"><input type="radio" name="rprSirasi" id="rpr_s2" value="2. Yazılı"> 2. Yazılı</label>
        </div>
      </div>
    </div>
    ${bolum('Sınıf Filtresi')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;padding:8px 10px;background:var(--nm-bg,#f0f0f3);border-radius:8px;">
      ${sinifCblar}
    </div>
    ${bolum('Kolonlar')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;padding:8px 10px;background:var(--nm-bg,#f0f0f3);border-radius:8px;">
      ${kolonCblar}
    </div>
  `;

  modalAc('🖨️ Yazılı Sınav Raporu', body, sinavRaporYazdir, null);
  const kb = document.getElementById('modalKaydetBtn');
  if (kb) kb.textContent = '🖨️ Yazdır';
}

function sinavRaporYazdir() {
  const gc  = id => document.getElementById(id)?.checked ?? false;
  const gv  = id => document.getElementById(id)?.value?.trim() || '';
  const yon = document.querySelector('input[name="rprYon"]:checked')?.value || 'portrait';

  const okulAdi    = gc('rpr_okulGoster')    ? gv('rpr_okulAdi')    : '';
  const egitimYili = gc('rpr_yilGoster')     ? gv('rpr_egitimYili') : '';
  const tarih      = gc('rpr_tarihGoster')   ? gv('rpr_tarih')      : '';
  // Başlığı dönem + sıraya göre otomatik oluştur
  const baslikMetin = gc('rpr_baslikGoster')
    ? `${egitimYili ? egitimYili+' EĞİTİM ÖĞRETİM YILI ' : ''}${seciliDonem.toUpperCase()} ${seciliSirasi.toUpperCase()} SINAV TARİHLERİ`
    : '';
  const baslik = baslikMetin;

  const seciliSiniflar = [...document.querySelectorAll('.rprSinifCb:checked')].map(c=>c.value);
  const seciliKolonlar = [...document.querySelectorAll('.rprKolonCb:checked')].map(c=>c.value);
  const seciliDonem  = document.querySelector('input[name="rprDonem"]:checked')?.value || '1. Dönem';
  const seciliSirasi = document.querySelector('input[name="rprSirasi"]:checked')?.value || '1. Yazılı';
  const seciliDonemler = [seciliDonem];

  if (!seciliSiniflar.length) { toast('En az bir sınıf seçin.'); return; }
  if (!seciliKolonlar.length) { toast('En az bir kolon seçin.'); return; }

  const kolonBilgi = [
    {key:'siniflar', label:'Sınıf',         fn: s => s.siniflar||s.sinif||''},
    {key:'donem',    label:'Dönem',          fn: s => s.donem||''},
    {key:'ders',     label:'Ders',           fn: s => s.ders||''},
    {key:'tarih',    label:'Tarih',          fn: s => formatTarih(s.tarih)},
    {key:'dersSaati',label:'Kaçıncı Ders',  fn: s => s.dersSaati ? s.dersSaati+'. ders' : ''},
    {key:'tur',      label:'Tür',            fn: s => s.tur||''},
    {key:'ogretmen', label:'Öğretmen',       fn: s => s.ogretmenId ? ogretmenAdi(s.ogretmenId) : ''},
    {key:'senaryoNo',label:'Senaryo No',     fn: s => s.senaryoNo ? s.senaryoNo+'. Senaryo' : ''},
    {key:'yayinevi', label:'Yayınevi',       fn: s => s.yayinevi||''},
    {key:'notlar',   label:'Notlar',         fn: s => s.notlar||''},
  ].filter(k => seciliKolonlar.includes(k.key));

  // Sınıfa göre grupla, tarihe göre sırala
  const gruplar = {};
  sinavlar
    .filter(s => {
      const sSiniflar = (s.siniflar||s.sinif||'').split(',').map(x=>x.trim());
      const donemOk  = seciliDonemler.includes(s.donem||'1. Dönem');
      const sirasiOk = s.yaziliSirasi === seciliSirasi;
      return sSiniflar.some(sn => seciliSiniflar.includes(sn)) && donemOk && sirasiOk;
    })
    .sort((a,b)=>(a.tarih||'').localeCompare(b.tarih||''))
    .forEach(s => {
      const sSiniflar = (s.siniflar||s.sinif||'').split(',').map(x=>x.trim())
        .filter(sn => seciliSiniflar.includes(sn));
      sSiniflar.forEach(sn => {
        if (!gruplar[sn]) gruplar[sn] = [];
        gruplar[sn].push(s);
      });
    });

  const thHTML = kolonBilgi.map(k=>`<th>${k.label}</th>`).join('');

  const tabloHTML = Object.entries(gruplar).sort(([a],[b])=>a.localeCompare(b,'tr')).map(([sn, kayitlar])=>`
    <tr><td colspan="${kolonBilgi.length}" style="background:#d0e4f0;color:#1a2e44;font-weight:700;font-size:11px;padding:5px 8px;letter-spacing:.4px;border:1px solid #b8cfe0;">
      📚 ${sn} Sınıfı
    </td></tr>
    ${kayitlar.map(s=>`<tr>${kolonBilgi.map(k=>`<td>${k.fn(s)||'—'}</td>`).join('')}</tr>`).join('')}
  `).join('');

  const metaParcalar = [tarih].filter(Boolean);

  const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<title>${baslik||'Yazılı Sınav Takvimi'}</title>
<style>
  @page{size:A4 ${yon};margin:1.2cm;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#111;}
  .header{text-align:center;margin-bottom:14px;border-bottom:2px solid #333;padding-bottom:10px;}
  .header .okul{font-size:15px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;}
  .header .baslik{font-size:13px;font-weight:600;margin-top:5px;}
  .header .meta{font-size:10px;color:#666;margin-top:4px;}
  table{width:100%;border-collapse:collapse;margin-top:4px;}
  th{background:#e8f0f7;color:#1a2e44;padding:5px 6px;text-align:left;font-size:10px;font-weight:700;white-space:nowrap;border:1px solid #b8cfe0;}
  td{padding:4px 6px;border:1px solid #ddd;vertical-align:top;}
  tr:nth-child(even) td{background:#f7f9fc;}
  .toplam{margin-top:8px;font-size:10px;color:#444;text-align:right;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<div class="header">
  ${okulAdi?`<div class="okul">${okulAdi}</div>`:''}
  ${baslik?`<div class="baslik">${baslik}</div>`:''}
  ${metaParcalar.length?`<div class="meta">${metaParcalar.join(' &nbsp;·&nbsp; ')}</div>`:''}
</div>
<table>
  <thead><tr>${thHTML}</tr></thead>
  <tbody>${tabloHTML}</tbody>
</table>
<div class="toplam">Toplam: ${sinavlar.filter(s=>{const ss=(s.siniflar||s.sinif||'').split(',').map(x=>x.trim());return ss.some(sn=>seciliSiniflar.includes(sn));}).length} kayıt</div>
</body></html>`;

  modalKapat();
  const w = window.open('','_blank','width=900,height=700');
  w.document.write(html);
  w.document.close();
  w.onload = ()=>{ w.focus(); w.print(); };
}
