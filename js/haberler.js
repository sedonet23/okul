/* ====================================================================
   js/haberler.js
   HABERLER / DUYURULAR MODÜLÜ — UI KATMANI
   Veri modeli (bkz. firebase-init.js COL):
     haberler        : {baslik, ozet, link, kaynakAdi, kategori, tarih:ISO, manuel:true|false}
     haberKaynaklari : {ad, url, kategori, aktif:true|false}  -- RSS kaynağı, admin panelinden
                        dinamik eklenir/silinir (rss-fetch.js gece cron job'unda okunur).

   Bildirim tercihi: cihazın hangi kategorilerden bildirim almak istediği
   oy_cihazTokenleri dokümanında `kategoriler:[]` alanında tutulur.
   Alan hiç yoksa (eski kayıtlar / henüz seçim yapılmamış cihazlar) TÜM
   kategorilerden bildirim gönderilir (opt-out mantığı — bkz. rss-fetch.js).

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya)          → sadece DOM + HaberlerService çağrısı, db bilmez
     js/core/services/haberler.service.js    → yetki kontrolü
     js/core/repositories/haberler.repository.js → TEK Firestore erişim noktası
   ==================================================================== */

let haberler = [];
let haberKaynaklari = [];
let haberFiltre = 'tumu';
let haberAltGorunum = 'liste'; // 'liste' | 'kaynaklar' | 'bildirimler'

const HABER_VARSAYILAN_KATEGORILER = ['MEB', 'Elazığ', 'Resmî Gazete', 'Genel'];

/* ---------- Firestore bağlantısı (app.js baglantilariKur içinden çağrılır) ----------
   Artık doğrudan db.collection() çağrılmıyor — HaberlerRepository üzerinden dinleniyor. */
function haberlerBaglantilariKur(){
  HaberlerRepository.haberleriDinle(v=>{
    haberler = v;
    renderHaberler();
    renderHaberFiltreler();
    if(typeof renderHaberTicker === 'function') renderHaberTicker();
    if(typeof renderHaberKarusel === 'function') renderHaberKarusel();
    if(typeof globalAramaYap === 'function') globalAramaYap();
  });

  HaberlerRepository.kaynaklariDinle(v=>{
    haberKaynaklari = v;
    haberKaynaklari.sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'));
    renderHaberKaynaklari();
  });
}

/* ---------- yardımcılar ---------- */
function haberKategoriListesiHesapla(){
  const set = new Set(HABER_VARSAYILAN_KATEGORILER);
  haberler.forEach(h=>{ if(h.kategori) set.add(h.kategori); });
  haberKaynaklari.forEach(k=>{ if(k.kategori) set.add(k.kategori); });
  return [...set];
}

function haberKategoriRengi(kat){
  const eslem = { 'MEB':'blue', 'Elazığ':'sage', 'Resmî Gazete':'brick', 'Genel':'amber' };
  if(eslem[kat]) return eslem[kat];
  // bilinmeyen/kullanıcı tanımlı kategoriler için sabit bir renk döngüsü
  const renkler = ['gray','blue','sage','amber','brick','rose'];
  let h = 0; for(const c of (kat||'')) h = (h*31 + c.charCodeAt(0)) % renkler.length;
  return renkler[h];
}

function haberZamanEtiketi(iso){
  if(!iso) return '';
  const t = new Date(iso), simdi = new Date();
  const farkDk = Math.floor((simdi - t) / 60000);
  if(farkDk < 1) return 'az önce';
  if(farkDk < 60) return farkDk + ' dk önce';
  const farkSaat = Math.floor(farkDk / 60);
  if(farkSaat < 24) return farkSaat + ' sa önce';
  const farkGun = Math.floor(farkSaat / 24);
  if(farkGun < 7) return farkGun + ' gün önce';
  return formatTarih(iso.slice(0,10));
}

/* ---------- alt görünüm sekmeleri (Liste / Kaynak Yönetimi / Bildirim Ayarları) ---------- */
function haberAltGorunumSec(g){
  haberAltGorunum = g;
  document.querySelectorAll('#tab-haberler .haber-altsekme-btn').forEach(b=>b.classList.toggle('active', b.dataset.g===g));
  document.querySelectorAll('#tab-haberler .haber-altgorunum').forEach(el=>{
    el.style.display = (el.dataset.g === g) ? '' : 'none';
  });
  if(g === 'bildirimler') renderKategoriTercihleri();
}

/* ================= LİSTE + FİLTRE ================= */
function renderHaberFiltreler(){
  const hedef = document.getElementById('haberFiltreler');
  if(!hedef) return;
  const kategoriler = haberKategoriListesiHesapla();
  hedef.innerHTML = `<button class="btn btn-ghost btn-sm filtre-btn ${haberFiltre==='tumu'?'active':''}" data-f="tumu" onclick="haberFiltreSec('tumu')">Tümü</button>` +
    kategoriler.map(k=>`<button class="btn btn-ghost btn-sm filtre-btn ${haberFiltre===k?'active':''}" data-f="${escapeHtml(k)}" onclick="haberFiltreSec('${escapeHtml(k)}')">${escapeHtml(k)}</button>`).join('');
}

function haberFiltreSec(f){
  haberFiltre = f;
  document.querySelectorAll('#tab-haberler .filtre-btn').forEach(b=>b.classList.toggle('active', b.dataset.f===f));
  renderHaberler();
}

function renderHaberler(){
  const hedef = document.getElementById('haberlerListesi');
  if(!hedef) return;
  let liste = haberFiltre==='tumu' ? haberler : haberler.filter(h=>h.kategori===haberFiltre);

  hedef.innerHTML = liste.length ? liste.map(h=>`
    <div class="evrak-row">
      <div class="evrak-body" style="cursor:${h.link?'pointer':'default'};" ${h.link?`onclick="window.open('${escapeHtml(h.link)}','_blank')"`:''}>
        <div class="evrak-title">
          ${escapeHtml(h.baslik||'Başlıksız')}
          ${h.kategori ? `<span class="badge badge-${haberKategoriRengi(h.kategori)}">${escapeHtml(h.kategori)}</span>` : ''}
          ${h.manuel ? `<span class="badge badge-gray">Duyuru</span>` : ''}
        </div>
        <div class="evrak-meta">
          ${escapeHtml(h.kaynakAdi||'Bilinmeyen kaynak')} · ${haberZamanEtiketi(h.tarih)}
          ${h.ozet ? ' · ' + escapeHtml(h.ozet.slice(0,120)) + (h.ozet.length>120?'…':'') : ''}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); haberModalAc('${h.id}')">Düzenle</button>
    </div>
  `).join('') : '<div class="empty-state">Bu kategoride haber/duyuru yok.</div>';
}

/* ---------- manuel duyuru ekle/düzenle ---------- */
function haberModalAc(id){
  const h = id ? haberler.find(x=>x.id===id) : null;
  const kategoriler = haberKategoriListesiHesapla();
  const body = `
    <div class="form-group"><label>Başlık</label><input type="text" id="f_hbBaslik" value="${h?escapeHtml(h.baslik||''):''}" placeholder="Duyuru başlığı"></div>
    <div class="form-group"><label>Özet / İçerik</label><textarea id="f_hbOzet" rows="3" placeholder="Kısa açıklama">${h?escapeHtml(h.ozet||''):''}</textarea></div>
    <div class="form-group"><label>Bağlantı (opsiyonel)</label><input type="url" id="f_hbLink" value="${h?escapeHtml(h.link||''):''}" placeholder="https://..."></div>
    <div class="form-group">
      <label>Kategori</label>
      <input type="text" id="f_hbKategori" list="hbKategoriListesi" value="${h?escapeHtml(h.kategori||'Genel'):'Genel'}">
      <datalist id="hbKategoriListesi">${kategoriler.map(k=>`<option value="${escapeHtml(k)}">`).join('')}</datalist>
    </div>
  `;
  modalAc(h ? 'Duyuruyu Düzenle' : '+ Yeni Duyuru', body, ()=>{
    const baslik = document.getElementById('f_hbBaslik').value.trim();
    if(!baslik){ toast('Başlık zorunlu.'); return; }
    HaberlerService.haberKaydet(h?h.id:null, {
      baslik,
      ozet: document.getElementById('f_hbOzet').value.trim(),
      link: document.getElementById('f_hbLink').value.trim(),
      kategori: document.getElementById('f_hbKategori').value.trim() || 'Genel',
      kaynakAdi: h ? (h.kaynakAdi || 'Okul (Manuel)') : 'Okul (Manuel)',
      tarih: h ? h.tarih : new Date().toISOString(),
      manuel: true
    }).then(()=>toast('Kaydedildi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  }, h ? ()=>{ if(confirm('Bu duyuruyu silmek istediğinize emin misiniz?')){ HaberlerService.haberSil(h.id).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }); modalKapat(); } } : null);
}

/* ================= KAYNAK YÖNETİMİ (dinamik RSS kaynakları) ================= */
function renderHaberKaynaklari(){
  const hedef = document.getElementById('haberKaynaklariListesi');
  if(!hedef) return;
  hedef.innerHTML = haberKaynaklari.length ? haberKaynaklari.map(k=>`
    <div class="evrak-row">
      <div class="evrak-body">
        <div class="evrak-title">
          ${escapeHtml(k.ad||'Kaynak')}
          <span class="badge badge-${haberKategoriRengi(k.kategori)}">${escapeHtml(k.kategori||'Genel')}</span>
          <span class="badge badge-${k.aktif===false?'gray':'sage'}">${k.aktif===false?'Pasif':'Aktif'}</span>
        </div>
        <div class="evrak-meta" style="word-break:break-all;">${escapeHtml(k.url||'')}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="haberKaynagiModalAc('${k.id}')">Düzenle</button>
    </div>
  `).join('') : '<div class="empty-state">Henüz kaynak eklenmedi. "+ Yeni Kaynak" ile RSS/Atom bağlantısı ekleyin.</div>';
}

function haberKaynagiModalAc(id){
  const k = id ? haberKaynaklari.find(x=>x.id===id) : null;
  const kategoriler = haberKategoriListesiHesapla();
  const body = `
    <div class="form-group"><label>Kaynak Adı</label><input type="text" id="f_hkAd" value="${k?escapeHtml(k.ad||''):''}" placeholder="Örn: MEB Duyurular"></div>
    <div class="form-group"><label>RSS/Atom Bağlantısı</label><input type="url" id="f_hkUrl" value="${k?escapeHtml(k.url||''):''}" placeholder="https://.../feed"></div>
    <div class="form-group">
      <label>Kategori</label>
      <input type="text" id="f_hkKategori" list="hkKategoriListesi" value="${k?escapeHtml(k.kategori||'Genel'):'Genel'}">
      <datalist id="hkKategoriListesi">${kategoriler.map(x=>`<option value="${escapeHtml(x)}">`).join('')}</datalist>
    </div>
    <div class="form-group" style="display:flex;align-items:center;gap:10px;">
      <label style="margin:0;">Aktif (cron job bu kaynağı taramaya devam etsin)</label>
      <input type="checkbox" id="f_hkAktif" style="width:auto;" ${(!k || k.aktif!==false)?'checked':''}>
    </div>
  `;
  modalAc(k ? 'Kaynağı Düzenle' : '+ Yeni Kaynak', body, ()=>{
    const ad = document.getElementById('f_hkAd').value.trim();
    const url = document.getElementById('f_hkUrl').value.trim();
    if(!ad || !url){ toast('Kaynak adı ve bağlantı zorunlu.'); return; }
    HaberlerService.kaynakKaydet(k?k.id:null, {
      ad, url,
      kategori: document.getElementById('f_hkKategori').value.trim() || 'Genel',
      aktif: document.getElementById('f_hkAktif').checked
    }).then(()=>toast('Kaydedildi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  }, k ? ()=>{ if(confirm('Bu kaynağı silmek istediğinize emin misiniz? (Daha önce çekilmiş haberler silinmez.)')){ HaberlerService.kaynakSil(k.id).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }); modalKapat(); } } : null);
}

/* ================= KATEGORİ BAZLI BİLDİRİM TERCİHİ ================= */
function haberKategoriTercihleriOku(){
  try{
    const ham = localStorage.getItem('haberKategoriTercihleri');
    return ham ? JSON.parse(ham) : null; // null = henüz seçim yapılmadı → tümü
  }catch(e){ return null; }
}

function renderKategoriTercihleri(){
  const hedef = document.getElementById('haberKategoriTercihleriKutu');
  if(!hedef) return;
  const kategoriler = haberKategoriListesiHesapla();
  const secili = haberKategoriTercihleriOku();
  const hepsiSecili = !secili; // tercih yoksa hepsi işaretli görünsün
  hedef.innerHTML = kategoriler.map(k=>`
    <label class="ogr-cb-row">
      <input type="checkbox" class="hb-kategori-cb" value="${escapeHtml(k)}" ${hepsiSecili || (secili && secili.includes(k)) ? 'checked' : ''}>
      <span>${escapeHtml(k)}</span>
    </label>
  `).join('');
}

async function haberKategoriTercihleriKaydet(){
  const secili = [...document.querySelectorAll('#tab-haberler .hb-kategori-cb:checked')].map(cb=>cb.value);
  localStorage.setItem('haberKategoriTercihleri', JSON.stringify(secili));
  const token = typeof cihazTokenGetir === 'function' ? cihazTokenGetir() : null;
  if(token && db){
    try{
      await HaberlerService.cihazKategoriTercihiKaydet(token, secili);
      toast('Bildirim tercihleri kaydedildi.');
    }catch(e){ toast('Hata: ' + e.message); }
  } else {
    toast('Tercih cihazda kaydedildi. Bildirimleri açtığınızda otomatik senkronize edilecek.');
  }
}

/* ================= DASHBOARD: TICKER (kayan bant) ================= */
function renderHaberTicker(){
  const hedef = document.getElementById('haberTicker');
  if(!hedef) return;
  const sonHaberler = haberler.slice(0, 10);
  if(!sonHaberler.length){ hedef.style.display = 'none'; return; }
  hedef.style.display = '';
  const icerik = sonHaberler.map(h=>`<span class="ticker-item" onclick="sekmeAc('haberler')">📰 ${escapeHtml(h.baslik||'')}</span>`).join('<span class="ticker-ayrac">•</span>');
  // akıcı döngü için içeriği iki kez yazıyoruz (CSS animasyonu %-50 kayınca sıfırlanır)
  hedef.innerHTML = `<div class="ticker-track">${icerik}<span class="ticker-ayrac">•</span>${icerik}</div>`;
}

/* ================= DASHBOARD: KARUSEL (son 5 haber, kart kaydırmalı) ================= */
let _haberKaruselIndex = 0;
let _haberKaruselTimer = null;

function renderHaberKarusel(){
  const hedef = document.getElementById('haberKarusel');
  const wrap = document.getElementById('haberKaruselKart');
  if(!hedef || !wrap) return;
  const sonHaberler = haberler.slice(0, 5);
  if(!sonHaberler.length){ wrap.style.display = 'none'; return; }
  wrap.style.display = '';

  hedef.innerHTML = sonHaberler.map(h=>`
    <div class="karusel-slide" onclick="${h.link?`window.open('${escapeHtml(h.link)}','_blank')`:`sekmeAc('haberler')`}">
      <div class="karusel-kategori badge badge-${haberKategoriRengi(h.kategori)}">${escapeHtml(h.kategori||'Genel')}</div>
      <div class="karusel-baslik">${escapeHtml(h.baslik||'')}</div>
      <div class="karusel-meta">${escapeHtml(h.kaynakAdi||'')} · ${haberZamanEtiketi(h.tarih)}</div>
    </div>
  `).join('');

  const noktalar = document.getElementById('haberKaruselNoktalar');
  if(noktalar){
    noktalar.innerHTML = sonHaberler.map((_,i)=>`<span class="karusel-nokta ${i===0?'active':''}" onclick="haberKaruselGit(${i})"></span>`).join('');
  }

  _haberKaruselIndex = 0;
  haberKaruselUygula();
  clearInterval(_haberKaruselTimer);
  if(sonHaberler.length > 1){
    _haberKaruselTimer = setInterval(()=> haberKaruselGit((_haberKaruselIndex+1) % sonHaberler.length), 5000);
  }
}

function haberKaruselGit(i){
  _haberKaruselIndex = i;
  haberKaruselUygula();
}

function haberKaruselUygula(){
  const hedef = document.getElementById('haberKarusel');
  if(!hedef) return;
  hedef.style.transform = `translateX(-${_haberKaruselIndex * 100}%)`;
  document.querySelectorAll('#haberKaruselNoktalar .karusel-nokta').forEach((n,i)=>n.classList.toggle('active', i===_haberKaruselIndex));
}
