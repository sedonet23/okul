/* ====================================================================
   js/mevzuat-asistan.js
   MEVZUAT ASİSTANI MODÜLÜ

   Depolama: Firestore DEĞİL — tamamen cihaz içi IndexedDB (tek kullanıcı
   için tasarlandı, Firestore kotasını hiç harcamaz). Google Drive'a
   otomatik yedekleniyor (bkz. app.js yedekVerisiOlustur/yedektenGeriYukle
   — bu dosyadaki mevzuatTumVeriyiOku()/mevzuatYedektenYukle() ile bağlanır).

   Veri modeli:
     kayitlar : {id, baslik, kaynak, kategori, eklenmeTarihi, chunkSayisi}
     chunklar : {id, mevzuatId, indeks, baslik, metin, anahtarKelimeler:[...]}

   Akış:
     1) Kullanıcı mevzuat metnini yapıştırır → madde/paragraf bazlı
        chunk'lara bölünür → IndexedDB'ye yazılır.
     2) Soru sorulduğunda, TÜM işlem cihazda: basit anahtar kelime
        skorlamasıyla en alakalı birkaç chunk seçilir.
     3) Sadece o birkaç chunk, MEVZUAT'A ÖZEL, Gemini tabanlı ayrı bir
        Cloudflare Worker'a (bkz. MEVZUAT_ASISTAN_API_URL) "context"
        olarak gönderilir, soru cevaplanır. Genel AI Asistan'ın kullandığı
        Llama tabanlı Worker'dan (js/asistan.js ASISTAN_API_URL) TAMAMEN
        AYRI — biri diğerini etkilemez. Gemini'ye geçilme sebebi: Llama,
        "sadece verilen metne dayan, madde uydurma" talimatına yeterince
        uymuyordu; Gemini bu konuda belirgin şekilde daha güvenilir.
   ==================================================================== */

const MEVZUAT_ASISTAN_API_URL = 'https://koruk-mevzuat-asistan.sedonet23.workers.dev/';

const MEVZUAT_DB_ADI = 'okulMevzuatDB';
const MEVZUAT_DB_SURUM = 1;
let _mevzuatDbHandle = null;

let mevzuatKayitlari = [];   // {id, baslik, kaynak, kategori, eklenmeTarihi, chunkSayisi}
let mevzuatSohbetGecmisi = []; // [{role:'user'|'model', text}]
let mevzuatYukleniyor = false;
let mevzuatAltGorunum = 'kaynaklar'; // 'kaynaklar' | 'sohbet'

/* ---------- IndexedDB temel katman ---------- */
function _mevzuatDbAc(){
  return new Promise((resolve, reject)=>{
    if(_mevzuatDbHandle){ resolve(_mevzuatDbHandle); return; }
    const istek = indexedDB.open(MEVZUAT_DB_ADI, MEVZUAT_DB_SURUM);
    istek.onupgradeneeded = (e)=>{
      const db = e.target.result;
      if(!db.objectStoreNames.contains('kayitlar')){
        db.createObjectStore('kayitlar', { keyPath: 'id' });
      }
      if(!db.objectStoreNames.contains('chunklar')){
        const cs = db.createObjectStore('chunklar', { keyPath: 'id' });
        cs.createIndex('mevzuatId', 'mevzuatId', { unique: false });
      }
    };
    istek.onsuccess = (e)=>{ _mevzuatDbHandle = e.target.result; resolve(_mevzuatDbHandle); };
    istek.onerror = (e)=> reject(e.target.error);
  });
}

function _mevzuatStoreIslem(storeAdi, mod, islevGorevi){
  return _mevzuatDbAc().then(db=> new Promise((resolve, reject)=>{
    const tx = db.transaction(storeAdi, mod);
    const store = tx.objectStore(storeAdi);
    const sonuc = islevGorevi(store);
    tx.oncomplete = ()=> resolve(sonuc);
    tx.onerror = ()=> reject(tx.error);
  }));
}

function _mevzuatTumKayitlariOku(){
  return _mevzuatDbAc().then(db=> new Promise((resolve, reject)=>{
    const tx = db.transaction('kayitlar', 'readonly');
    const req = tx.objectStore('kayitlar').getAll();
    req.onsuccess = ()=> resolve(req.result || []);
    req.onerror = ()=> reject(req.error);
  }));
}

function _mevzuatTumChunklariOku(){
  return _mevzuatDbAc().then(db=> new Promise((resolve, reject)=>{
    const tx = db.transaction('chunklar', 'readonly');
    const req = tx.objectStore('chunklar').getAll();
    req.onsuccess = ()=> resolve(req.result || []);
    req.onerror = ()=> reject(req.error);
  }));
}

function _mevzuatChunklariGetir(mevzuatId){
  return _mevzuatDbAc().then(db=> new Promise((resolve, reject)=>{
    const tx = db.transaction('chunklar', 'readonly');
    const idx = tx.objectStore('chunklar').index('mevzuatId');
    const req = idx.getAll(IDBKeyRange.only(mevzuatId));
    req.onsuccess = ()=> resolve(req.result || []);
    req.onerror = ()=> reject(req.error);
  }));
}

/* ---------- Firestore/Drive yedekleme köprüsü (bkz. app.js) ---------- */
async function mevzuatTumVeriyiOku(){
  const [kayitlar, chunklar] = await Promise.all([_mevzuatTumKayitlariOku(), _mevzuatTumChunklariOku()]);
  return { kayitlar, chunklar };
}

async function mevzuatYedektenYukle(veri){
  if(!veri) return;
  const kayitlar = Array.isArray(veri.kayitlar) ? veri.kayitlar : [];
  const chunklar = Array.isArray(veri.chunklar) ? veri.chunklar : [];
  await _mevzuatStoreIslem('kayitlar', 'readwrite', (store)=>{
    kayitlar.forEach(k=> store.put(k));
  });
  await _mevzuatStoreIslem('chunklar', 'readwrite', (store)=>{
    chunklar.forEach(c=> store.put(c));
  });
  await mevzuatKayitlariYenile();
}

/* ---------- başlangıç ---------- */
async function mevzuatBaslangicYukle(){
  try{ await mevzuatKayitlariYenile(); }
  catch(e){ console.warn('Mevzuat verisi yüklenemedi:', e.message); }
}
document.addEventListener('DOMContentLoaded', ()=> setTimeout(mevzuatBaslangicYukle, 800));

async function mevzuatKayitlariYenile(){
  mevzuatKayitlari = await _mevzuatTumKayitlariOku();
  mevzuatKayitlari.sort((a,b)=> (b.eklenmeTarihi||'').localeCompare(a.eklenmeTarihi||''));
  renderMevzuatKayitlari();
}

/* ---------- chunk'lama ----------
   Türkçe mevzuat metinlerinde en yaygın kalıp "MADDE 1-", "Madde 1."
   şeklindedir. Bu kalıp bulunursa ona göre bölünür; bulunamazsa
   paragraflara (boş satır) göre, o da yoksa sabit uzunlukta bölünür. */
function _mevzuatMetniChunklaraBol(metin){
  const temiz = (metin || '').replace(/\r\n/g, '\n').trim();
  if(!temiz) return [];

  const maddeRegex = /(?=^\s*MADDE\s+\d+\s*[-–.]|^\s*Madde\s+\d+\s*[-–.])/gim;
  let parcalar = temiz.split(maddeRegex).map(p=>p.trim()).filter(Boolean);

  if(parcalar.length <= 1){
    parcalar = temiz.split(/\n{2,}/).map(p=>p.trim()).filter(Boolean);
  }

  // Hâlâ tek parçaysa (biçimlendirilmemiş uzun metin) sabit uzunlukta böl
  if(parcalar.length <= 1 && temiz.length > 1200){
    parcalar = [];
    for(let i = 0; i < temiz.length; i += 1000){
      parcalar.push(temiz.slice(i, i + 1000));
    }
  }
  if(parcalar.length === 0) parcalar = [temiz];

  return parcalar.map((p, i)=>{
    const ilkSatir = p.split('\n')[0].trim();
    const baslik = ilkSatir.length <= 80 ? ilkSatir : `Bölüm ${i + 1}`;
    return { baslik, metin: p, anahtarKelimeler: _mevzuatAnahtarKelimelerCikar(p) };
  });
}

const MEVZUAT_STOP_KELIME = new Set(['ve','veya','ile','bir','bu','da','de','ki','için','olan','olarak',
  'ise','gibi','çok','daha','en','ya','ancak','fakat','madde','fıkra','bent','göre','şu','o','her']);

function _mevzuatAnahtarKelimelerCikar(metin){
  const kelimeler = (metin.toLocaleLowerCase('tr'))
    .replace(/[^\wçğıöşü\s]/gi, ' ')
    .split(/\s+/)
    .filter(k => k.length > 2 && !MEVZUAT_STOP_KELIME.has(k));
  return [...new Set(kelimeler)].slice(0, 60);
}

/* Türkçe eklemeli (agglutinative) bir dil: "izin" sorulur, metinde
   "iznin", "izinli", "izinlerini" geçer — tam kelime eşleşmesi bunları
   YAKALAYAMAZ. Önceki sürüm sadece "ilk 5 karaktere kırp" yapıyordu; bu,
   "izin"(4 harf, kırpılmıyor) ile "izinli"(6 harf, "izinl"e kırpılıyor)
   gibi durumlarda gövdeleri birbirinden FARKLI çıkarıp eşleşmeyi
   kaçırıyordu. Bunun yerine bilinen ekleri sondan gerçekten kesiyoruz,
   sonra kalanı normalize ediyoruz. Kusursuz bir Türkçe kök bulma
   algoritması değildir ama önceki yönteme göre çok daha isabetlidir. */
const MEVZUAT_EKLER = [
  'lerinden','larından','lerinin','larının','lerine','larına','lerini','larını',
  'ndeki','ndaki','leri','ları','lere','lara','lerde','larda','lerden','lardan',
  'lerin','ların','nden','ndan','ndeki','ndaki','sında','sinde','sunda','sünde',
  'sına','sine','suna','süne','sinin','sının','sunun','sünün','ecek','acak',
  'yordu','miş','mış','muş','müş','yor','dir','dır','dur','dür','siz','sız',
  'suz','süz','nin','nın','nun','nün','nde','nda','den','dan','te','ta','de','da',
  'li','lı','lu','lü','ci','cı','cu','cü','çi','çı','çu','çü','ler','lar',
  'nı','ni','nu','nü','ın','in','un','ün','ı','i','u','ü','e','a'
].sort((a,b)=> b.length - a.length); // en uzun ek önce denenir

function _mevzuatGovdeCikar(kelime){
  let k = kelime;
  for(const ek of MEVZUAT_EKLER){
    if(k.length - ek.length >= 3 && k.endsWith(ek)){
      k = k.slice(0, k.length - ek.length);
      break; // sadece en uzun eşleşen tek eki kes, üst üste kesme (aşırı kısaltmayı önler)
    }
  }
  return k.length > 6 ? k.slice(0, 6) : k;
}

/* ---------- toplu içe aktarma ----------
   Beklenen JSON formatı: [{ baslik, kaynak, kategori, metin }, ...]
   Aynı 'kaynak' (URL) ile daha önce eklenmiş kayıtlar atlanır (tekrar
   içe aktarınca kopya oluşmaz). */
function _dosyaMetniOku(dosya){
  // Bazı Android WebView sürümlerinde File.text() sessizce başarısız
  // olabiliyor; FileReader daha geniş uyumluluğa sahip.
  return new Promise((resolve, reject)=>{
    const okuyucu = new FileReader();
    okuyucu.onload = ()=> resolve(okuyucu.result);
    okuyucu.onerror = ()=> reject(okuyucu.error || new Error('Dosya okunamadı'));
    okuyucu.readAsText(dosya, 'utf-8');
  });
}

async function mevzuatTopluIceAktar(dosya){
  if(!dosya){ console.warn('mevzuatTopluIceAktar: dosya seçilmedi.'); return; }
  toast('İçe aktarılıyor, lütfen bekleyin…');

  try{
    let liste;
    try{
      const metin = await _dosyaMetniOku(dosya);
      liste = JSON.parse(metin);
      if(!Array.isArray(liste)) throw new Error('Dosya bir dizi (array) içermiyor.');
    }catch(e){
      console.error('mevzuatTopluIceAktar - dosya okuma/parse hatası:', e);
      toast('Dosya okunamadı: ' + e.message);
      return;
    }

    const mevcutKaynaklar = new Set(mevzuatKayitlari.map(k => k.kaynak).filter(Boolean));
    let eklenen = 0, atlanan = 0, hatali = 0;

    for(const oge of liste){
      try{
        if(!oge.baslik || !oge.metin || !oge.metin.trim()){ hatali++; continue; }
        if(oge.kaynak && mevcutKaynaklar.has(oge.kaynak)){ atlanan++; continue; }

        const parcalar = _mevzuatMetniChunklaraBol(oge.metin);
        if(parcalar.length === 0){ hatali++; continue; }

        const mevzuatId = 'mv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const kayit = {
          id: mevzuatId, baslik: oge.baslik, kaynak: oge.kaynak || '', kategori: oge.kategori || 'Genel',
          eklenmeTarihi: new Date().toISOString(), chunkSayisi: parcalar.length
        };
        const chunklar = parcalar.map((p, i)=> ({
          id: mevzuatId + '_c' + i, mevzuatId, indeks: i, baslik: p.baslik, metin: p.metin, anahtarKelimeler: p.anahtarKelimeler
        }));

        await _mevzuatStoreIslem('kayitlar', 'readwrite', (store)=> store.put(kayit));
        await _mevzuatStoreIslem('chunklar', 'readwrite', (store)=> chunklar.forEach(c=> store.put(c)));
        if(oge.kaynak) mevcutKaynaklar.add(oge.kaynak);
        eklenen++;
      }catch(e){
        console.error('Toplu içe aktarmada bir kayıt atlandı:', oge && oge.baslik, e);
        hatali++;
      }
    }

    toast(`İçe aktarma tamamlandı: ${eklenen} eklendi, ${atlanan} zaten vardı, ${hatali} hatalı.`);
    const girdi = document.getElementById('mvTopluDosya');
    if(girdi) girdi.value = '';
    await mevzuatKayitlariYenile();
  }catch(genelHata){
    console.error('mevzuatTopluIceAktar - beklenmeyen hata:', genelHata);
    toast('İçe aktarma sırasında beklenmeyen bir hata oluştu: ' + genelHata.message);
  }
}

/* ---------- yeni mevzuat ekleme ---------- */
async function mevzuatEkle(){
  const baslik = document.getElementById('f_mvBaslik').value.trim();
  const kaynak = document.getElementById('f_mvKaynak').value.trim();
  const kategori = document.getElementById('f_mvKategori').value.trim() || 'Genel';
  const metin = document.getElementById('f_mvMetin').value;

  if(!baslik || !metin || !metin.trim()){ toast('Başlık ve metin zorunlu.'); return; }

  const parcalar = _mevzuatMetniChunklaraBol(metin);
  if(parcalar.length === 0){ toast('Metinden bölüm çıkarılamadı.'); return; }

  const mevzuatId = 'mv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const kayit = { id: mevzuatId, baslik, kaynak, kategori, eklenmeTarihi: new Date().toISOString(), chunkSayisi: parcalar.length };
  const chunklar = parcalar.map((p, i)=> ({
    id: mevzuatId + '_c' + i, mevzuatId, indeks: i, baslik: p.baslik, metin: p.metin, anahtarKelimeler: p.anahtarKelimeler
  }));

  await _mevzuatStoreIslem('kayitlar', 'readwrite', (store)=> store.put(kayit));
  await _mevzuatStoreIslem('chunklar', 'readwrite', (store)=> chunklar.forEach(c=> store.put(c)));

  toast(`"${baslik}" eklendi (${parcalar.length} bölüm).`);
  modalKapat();
  await mevzuatKayitlariYenile();
}

function mevzuatEkleModalAc(){
  const body = `
    <div class="form-group"><label>Başlık</label><input type="text" id="f_mvBaslik" placeholder="Örn: Milli Eğitim Bakanlığı Personeli İzin Yönergesi"></div>
    <div class="form-group"><label>Kaynak (opsiyonel)</label><input type="text" id="f_mvKaynak" placeholder="Örn: mevzuat.gov.tr, Resmî Gazete"></div>
    <div class="form-group"><label>Kategori</label><input type="text" id="f_mvKategori" list="mvKategoriListesi" placeholder="Genel" value="Genel">
      <datalist id="mvKategoriListesi">${[...new Set(mevzuatKayitlari.map(k=>k.kategori).filter(Boolean))].map(k=>`<option value="${escapeHtml(k)}">`).join('')}</datalist>
    </div>
    <div class="form-group"><label>Mevzuat Metni</label><textarea id="f_mvMetin" rows="10" placeholder="Metni buraya yapıştırın (MADDE 1-, MADDE 2- şeklinde bölünmüş olması aramayı daha isabetli yapar)"></textarea></div>
    <div class="page-sub">PDF'ten metin çıkaramıyorsan, dosyayı bu sohbete yükleyip "bu PDF'in metnini çıkar" diyebilirsin, çıkan metni buraya yapıştırırsın.</div>
  `;
  modalAc('+ Yeni Mevzuat Ekle', body, mevzuatEkle, null, 'Bölerek Kaydet');
}

/* ---------- kayıt listesi ---------- */
function renderMevzuatKayitlari(){
  const hedef = document.getElementById('mevzuatKayitlariListesi');
  if(!hedef) return;
  hedef.innerHTML = mevzuatKayitlari.length ? mevzuatKayitlari.map(k=>`
    <div class="evrak-row">
      <div class="evrak-body">
        <div class="evrak-title">${escapeHtml(k.baslik)} <span class="badge badge-blue">${escapeHtml(k.kategori||'Genel')}</span></div>
        <div class="evrak-meta">${k.kaynak ? escapeHtml(k.kaynak) + ' · ' : ''}${k.chunkSayisi||0} bölüm · ${isoYereleCevir(k.eklenmeTarihi).tarih}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="mevzuatSil('${k.id}')">Sil</button>
    </div>
  `).join('') : '<div class="empty-state">Henüz mevzuat eklenmedi. "+ Yeni Mevzuat Ekle" ile başla.</div>';
}

async function mevzuatSil(id){
  if(!confirm('Bu mevzuatı ve tüm bölümlerini silmek istediğinize emin misiniz?')) return;
  const chunklar = await _mevzuatChunklariGetir(id);
  await _mevzuatStoreIslem('chunklar', 'readwrite', (store)=> chunklar.forEach(c=> store.delete(c.id)));
  await _mevzuatStoreIslem('kayitlar', 'readwrite', (store)=> store.delete(id));
  toast('Silindi.');
  await mevzuatKayitlariYenile();
}

/* ---------- alt görünüm sekmeleri ---------- */
function mevzuatAltGorunumSec(g){
  mevzuatAltGorunum = g;
  document.querySelectorAll('#tab-mevzuat .mevzuat-altsekme-btn').forEach(b=>b.classList.toggle('active', b.dataset.g===g));
  document.querySelectorAll('#tab-mevzuat .mevzuat-altgorunum').forEach(el=> el.style.display = (el.dataset.g===g) ? '' : 'none');
}

/* ---------- cihazda arama (index tabanlı, Firestore'a hiç gitmiyor) ---------- */
async function _mevzuatEnAlakaliChunklariBul(soru, adet){
  adet = adet || 10;
  const sorguKelimeleri = _mevzuatAnahtarKelimelerCikar(soru);
  if(sorguKelimeleri.length === 0) return [];
  const sorguGovdeleri = [...new Set(sorguKelimeleri.map(_mevzuatGovdeCikar))];

  const tumChunklar = await _mevzuatTumChunklariOku();
  let skorlar = tumChunklar.map(c=>{
    const kelimeler = c.anahtarKelimeler || [];
    const govdeSeti = new Set(kelimeler.map(_mevzuatGovdeCikar));
    let skor = 0;
    sorguGovdeleri.forEach(g=>{ if(govdeSeti.has(g)) skor++; });
    // başlıkta geçen gövdeler ekstra ağırlıklı (o bölümün konusu olma ihtimali yüksek)
    if(c.baslik){
      const baslikGovde = _mevzuatAnahtarKelimelerCikar(c.baslik).map(_mevzuatGovdeCikar);
      sorguGovdeleri.forEach(g=>{ if(baslikGovde.includes(g)) skor += 2; });
    }
    return { chunk: c, skor };
  }).filter(x=> x.skor > 0);

  // YEDEK PLAN: gövde eşleşmesi hiç bulunamazsa (ör. kısaltılmış/özel bir
  // ek kalıbı gövde çıkarıcının kaçırdığı bir kelime), ham metin üzerinde
  // doğrudan alt-dize araması yap. Daha yavaş ama çok daha kapsayıcı;
  // sadece gövde araması boş döndüğünde devreye girer.
  if(skorlar.length === 0){
    const sorguKelimeleriUzun = sorguKelimeleri.filter(k=> k.length >= 4);
    if(sorguKelimeleriUzun.length > 0){
      skorlar = tumChunklar.map(c=>{
        const metinKucuk = (c.metin || '').toLocaleLowerCase('tr');
        const baslikKucuk = (c.baslik || '').toLocaleLowerCase('tr');
        let skor = 0;
        sorguKelimeleriUzun.forEach(k=>{
          if(metinKucuk.includes(k)) skor++;
          if(baslikKucuk.includes(k)) skor += 2;
        });
        return { chunk: c, skor };
      }).filter(x=> x.skor > 0);
    }
  }

  skorlar.sort((a,b)=> b.skor - a.skor);
  return skorlar.slice(0, adet).map(x=> x.chunk);
}

/* ---------- sohbet ---------- */
function mevzuatSohbetRender(){
  const kutu = document.getElementById('mevzuatMesajlar');
  if(!kutu) return;
  kutu.innerHTML = mevzuatSohbetGecmisi.map(m=>`
    <div class="asistan-msg asistan-msg-${m.role}">
      <div class="asistan-msg-bubble">${escapeHtml(m.text).replace(/\n/g,'<br>')}</div>
    </div>
  `).join('') + (mevzuatYukleniyor ? `
    <div class="asistan-msg asistan-msg-model"><div class="asistan-msg-bubble asistan-typing">Aranıyor…</div></div>` : '');
  kutu.scrollTop = kutu.scrollHeight;
}

async function mevzuatSoruGonder(){
  const input = document.getElementById('mevzuatInput');
  const soru = (input.value || '').trim();
  if(!soru || mevzuatYukleniyor) return;

  mevzuatSohbetGecmisi.push({ role:'user', text: soru });
  input.value = '';
  mevzuatYukleniyor = true;
  mevzuatSohbetRender();

  try{
    const ilgiliChunklar = await _mevzuatEnAlakaliChunklariBul(soru, 10);

    if(ilgiliChunklar.length === 0){
      mevzuatYukleniyor = false;
      mevzuatSohbetGecmisi.push({ role:'model', text: 'Eklediğin mevzuatlar arasında bu soruyla ilgili bir bölüm bulamadım. Farklı kelimelerle sorabilir ya da ilgili mevzuatı önce ekleyebilirsin.' });
      mevzuatSohbetRender();
      return;
    }

    const baglam = ilgiliChunklar.map(c=>{
      const ustKayit = mevzuatKayitlari.find(k=> k.id === c.mevzuatId);
      return `[Kaynak: ${ustKayit ? ustKayit.baslik : 'Bilinmeyen'} — ${c.baslik}]\n${c.metin}`;
    }).join('\n\n---\n\n');

    // Sistem yönergesi artık worker'ın kendi içinde (SISTEM_YONERGESI) —
    // burada tekrar göndermeye gerek yok, sadece ham soruyu + baglamı yolluyoruz.
    const res = await fetch(MEVZUAT_ASISTAN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', text: soru }
        ],
        context: baglam
      })
    });
    const data = await res.json();
    if(!res.ok || data.error) throw new Error(data.error || 'Bilinmeyen hata');

    mevzuatYukleniyor = false;
    mevzuatSohbetGecmisi.push({ role:'model', text: data.text || '(boş yanıt)' });
    mevzuatSohbetRender();
  }catch(err){
    mevzuatYukleniyor = false;
    mevzuatSohbetGecmisi.push({ role:'model', text: '⚠️ Hata: ' + err.message });
    mevzuatSohbetRender();
  }
}

function mevzuatInputEnter(e){
  if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); mevzuatSoruGonder(); }
}
