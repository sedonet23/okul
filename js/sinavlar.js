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

const SINAV_TURLERI = ['Yazılı', 'Sınav Yolu'];

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
        <div class="evrak-meta">${formatTarih(s.tarih)}${s.saat?' · Saat '+escapeHtml(s.saat):''}${s.ogretmenId?' · '+escapeHtml(ogretmenAdi(s.ogretmenId)):''}${s.notlar?' · '+escapeHtml(s.notlar):''}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="sinavModalAc('${s.id}')">Düzenle</button>
    </div>
  `).join('') : '<div class="empty-state">Henüz yazılı sınavı eklenmedi. "+ Yazılı Ekle" ile başlayın.</div>';
}

function sinavModalAc(id){
  const s = id ? sinavlar.find(x=>x.id===id) : null;
  const body = `
    <div class="form-row">
      <div class="form-group"><label>Sınıf</label><input id="f_snSinif" value="${s?escapeHtml(s.sinif||''):''}" placeholder="örn: 7-A"></div>
      <div class="form-group"><label>Ders</label>${dersSelectHtml('f_snDers', s?s.ders||'':'')}</div>
    </div>
    <div class="form-group"><label>Öğretmen</label><select id="f_snOgretmen">${ogretmenSecenekleri(s?s.ogretmenId:'')}</select></div>
    <div class="form-row">
      <div class="form-group"><label>Tarih</label><input type="date" id="f_snTarih" value="${s?s.tarih:todayISO()}"></div>
      <div class="form-group"><label>Saat</label><input type="time" id="f_snSaat" value="${s?(s.saat||''):''}"></div>
    </div>
    <div class="form-group"><label>Tür</label><select id="f_snTur">${SINAV_TURLERI.map(t=>`<option ${t===(s?s.tur:'Yazılı')?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="form-group"><label>Notlar</label><textarea id="f_snNotlar" rows="2">${s?escapeHtml(s.notlar||''):''}</textarea></div>
  `;
  modalAc(s?'Sınav Düzenle':'Yazılı Sınav Ekle', body, ()=>{
    const sinif = document.getElementById('f_snSinif').value.trim();
    const ders = document.getElementById('f_snDers').value.trim();
    if(!sinif || !ders){ toast('Sınıf ve ders zorunludur.'); return; }
    kaydet(COL.sinavlar, s?s.id:null, {
      sinif, ders,
      ogretmenId: document.getElementById('f_snOgretmen').value,
      tarih: document.getElementById('f_snTarih').value,
      saat: document.getElementById('f_snSaat').value,
      tur: document.getElementById('f_snTur').value,
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

    <div class="form-group"><label>Bu denemeyi yapacak sınıflar (virgülle ayırarak)</label><input id="f_dnSinflar" value="${d?escapeHtml(d.sinflar||''):''}" placeholder="örn: 11-A, 11-B, 12-A"></div>
    <div class="form-group"><label>Notlar</label><textarea id="f_dnNotlar" rows="2">${d?escapeHtml(d.notlar||''):''}</textarea></div>
  `;
  modalAc(d?'Deneme Sınavı Düzenle':'Deneme Sınavı Ekle', body, ()=>{
    const ad = document.getElementById('f_dnAd').value.trim();
    if(!ad){ toast('Deneme sınavı adı zorunludur.'); return; }
    const oturumTuru = document.getElementById('f_dnOturum').value;
    denemeHesapla();

    let veri = { ad, tarih: document.getElementById('f_dnTarih').value, oturumTuru, notlar: document.getElementById('f_dnNotlar').value.trim(), sinflar: document.getElementById('f_dnSinflar').value.trim() };

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
