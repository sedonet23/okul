/* ================================================================
   js/kullanici-yonetimi.js — UI KATMANI
   AŞAMA 2: Rol tabanlı yetkilendirme + Kullanıcı Yönetimi ekranı.

   Admin, sabit rol adları yerine kendi rollerini tanımlar (ör. "Yönetici",
   "Öğretmen"), her rolde 29 modülün her biri için Gizle / Görüntüle /
   Düzenle seçer, sonra kullanıcılara bu rolü atar.

   NOT: Bu aşamada yetkiler sidebar'da modül gizleme/gösterme olarak
   uygulanır. Sayfa içindeki tekil ekle/düzenle/sil butonlarının ve
   Firestore güvenlik kurallarının rol bazında sıkılaştırılması
   AŞAMA 3'te yapılacak.

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya)          → sadece DOM + KullaniciYonetimiService çağrısı
     js/core/services/kullanici-yonetimi.service.js    → iş kuralı + yetki kontrolü
     js/core/repositories/kullanici-yonetimi.repository.js → TEK Firestore erişim noktası
   Not: js/auth.js'teki İLK giriş belgesi oluşturma/okuma (bkz. authDinleyiciKur)
   bilinçli olarak dışarıda bırakıldı — kullanıcının henüz hiçbir yetkisi
   olmadığı bootstrap anıdır, repository/service katmanına uygun değildir.
   ================================================================ */

const MODUL_LISTESI = [
  {grup:'Genel', modul:'ogretmenler', ad:'Öğretmenler'},
  {grup:'Genel', modul:'ogretmenHassasBilgi', ad:'Öğretmen Hassas Bilgileri (İzin/Rapor, Belge Durumu)'},
  {grup:'Genel', modul:'siniflar', ad:'Sınıflar'},
  {grup:'Genel', modul:'ogrenciler', ad:'Öğrenciler'},
  {grup:'Genel', modul:'arama', ad:'Arama'},
  {grup:'Genel', modul:'dersProgrami', ad:'Ders Programı'},
  {grup:'Genel', modul:'nobet', ad:'Nöbet Programı'},
  {grup:'Genel', modul:'takvim', ad:'Takvim'},
  {grup:'Genel', modul:'evrak', ad:'Evrak Takibi'},
  {grup:'Genel', modul:'notlar', ad:'Notlar'},
  {grup:'Genel', modul:'tasima', ad:'Taşıma'},
  {grup:'Genel', modul:'personel', ad:'Personel İşleri'},
  {grup:'Genel', modul:'harita', ad:'Harita'},
  {grup:'Genel', modul:'sinavIslemleri', ad:'Sınav İşlemleri'},
  {grup:'Genel', modul:'optikOkuma', ad:'Optik Okuma (OMR)'},
  {grup:'Genel', modul:'dokumanlar', ad:'Dökümanlar'},
  {grup:'Genel', modul:'haberler', ad:'Haberler'},
  {grup:'Genel', modul:'duyurular', ad:'Duyuru Panosu'},
  {grup:'Genel', modul:'anket', ad:'Anketler'},
  {grup:'Genel', modul:'mevzuat', ad:'Mevzuat'},
  {grup:'Genel', modul:'mesajlasma', ad:'Mesajlaşma'},
  {grup:'Genel', modul:'sistemAyarlari', ad:'Sistem Ayarları (Ders Saatleri, Ders/Branş Listesi)'},
  {grup:'Çizelgeler', modul:'sosyalKulupler', ad:'Sosyal Kulüpler'},
  {grup:'Çizelgeler', modul:'belirliGunler', ad:'Belirli Gün & Haftalar'},
  {grup:'Çizelgeler', modul:'zumre', ad:'Zümre'},
  {grup:'Çizelgeler', modul:'sok', ad:'ŞÖK'},
  {grup:'Çizelgeler', modul:'bepPlani', ad:'Yıllık / BEP Planı'},
  {grup:'Çizelgeler', modul:'rehberlik', ad:'Rehberlik'},
  {grup:'Çizelgeler', modul:'maarifRapor', ad:'Maarif Model Raporlar'},
  {grup:'Çizelgeler', modul:'digerEvrak', ad:'Diğer Evraklar'},
  {grup:'Çizelgeler', modul:'periyodikIsler', ad:'Aylık İşler'},
  {grup:'Çizelgeler', modul:'odevTakip', ad:'Ödev Takip Çizelgesi'},
  {grup:'Çizelgeler', modul:'notCizelgesi', ad:'Not Çizelgesi'},
  {grup:'Yönetim', modul:'okulBilgileri', ad:'Okul Bilgileri'},
  {grup:'Yönetim', modul:'veri', ad:'Veri'},
  {grup:'Yönetim', modul:'ayarlar', ad:'Ayarlar'},
];
const _CIZELGELER_MODULLERI = MODUL_LISTESI.filter(m=>m.grup==='Çizelgeler').map(m=>m.modul);

/* ---------- Yetki yardımcı fonksiyonları ---------- */
// DÜZELTME: "Sınav İşlemleri" sayfası Yazılı/Deneme olarak iki ayrı
// sekmeye bölündü (bkz. index.html), ama mevcut roller hâlâ tek bir
// 'sinavIslemleri' izni üzerinden yapılandırılmış. Adminlerin tüm
// rolleri yeniden ayarlamasına gerek kalmasın diye bu iki yeni sekme
// ID'si, yetki kontrolünde şeffafça 'sinavIslemleri'ye eşleniyor.
const MODUL_ALIAS = { yaziliSinavlar:'sinavIslemleri', denemeSinavlari:'sinavIslemleri' };
function yetkiSeviyesi(modul){
  modul = MODUL_ALIAS[modul] || modul;
  if(!AKTIF_KULLANICI) return 'gizle';
  if(AKTIF_KULLANICI.admin === true) return 'duzenle'; // süper admin: her şeye tam erişim
  if(AKTIF_ROL && AKTIF_ROL.yetkiler && AKTIF_ROL.yetkiler[modul]) return AKTIF_ROL.yetkiler[modul];
  return 'gizle';
}
function gorebilir(modul){ const s = yetkiSeviyesi(modul); return s === 'duzenle' || s === 'goruntule'; }
function duzenleyebilir(modul){ return yetkiSeviyesi(modul) === 'duzenle'; }
function kullaniciYonetimiYetkisiVar(){
  return !!(AKTIF_KULLANICI && AKTIF_KULLANICI.admin) || !!(AKTIF_ROL && AKTIF_ROL.kullaniciYonetimi);
}

/* ---------- Sidebar filtreleme ---------- */
function sidebarYetkiUygula(){
  document.querySelectorAll('.nav-tab[data-tab]').forEach(btn=>{
    const modul = btn.dataset.tab;
    if(modul === 'panel' || modul === 'kullaniciYonetimi' || modul === 'istatistikler' || modul === 'ogretmenListe') return; // ayrı ele alınıyor
    btn.style.display = gorebilir(modul) ? '' : 'none';
  });

  // Alt mobil menü çubuğu (.bn-item) — masaüstü yan menüyle aynı mantık.
  // 'panel' (Ana Sayfa) her zaman görünür; '+' (Hızlı Ekle) butonu modül
  // etiketi taşımadığı için buradan etkilenmez, içeriği ayrıca filtrelenir.
  // 'dersNobetProgramim' bir yetki modülü DEĞİL — hesaba bağlı öğretmen kaydı
  // olup olmamasına göre gösterilir (bkz. aşağıdaki _bnIkinciItemAyarla).
  document.querySelectorAll('.bn-item[data-tab]').forEach(btn=>{
    const modul = btn.dataset.tab;
    if(modul === 'panel' || modul === 'dersNobetProgramim' || btn.id === 'bnIkinciItem') return;
    btn.style.display = gorebilir(modul) ? '' : 'none';
  });
  if(typeof _bnIkinciItemAyarla === 'function') _bnIkinciItemAyarla();

  // "Çizelgeler" ve diğer akordiyon gruplarındaki modüllerin TAMAMI
  // gizliyse, üst başlığı/ayırıcıyı da gizle — boş/tıklanamaz bir grup
  // başlığı gösterilmesin diye. Her grup için: [ayırıcı id, toggle
  // (checkbox+label) id, o gruptaki data-tab değerleri].
  const _NAV_GRUPLARI = [
    { ayirac:'ayiracKisiler',    check:'kisilerCheck',    moduller:['ogretmenler','siniflar','ogrenciler','personel'] },
    { ayirac:'ayiracProgram',    check:'programCheck',    moduller:['dersProgrami','nobet','takvim','sinavIslemleri'] },
    { ayirac:'ayiracIletisim',   check:'iletisimCheck',   moduller:['mesajlasma','haberler','duyurular','anket'] },
    { ayirac:'ayiracBelgeler',   check:'belgelerCheck',   moduller:['evrak','dokumanlar','notlar','mevzuat'] },
    { ayirac:'ayiracUlasim',     check:'ulasimCheck',     moduller:['tasima','harita'] },
    { ayirac:'ayiracCizelgeler', check:'cizelgelerCheck', moduller:_CIZELGELER_MODULLERI },
  ];
  _NAV_GRUPLARI.forEach(g=>{
    const hepsiGizli = g.moduller.every(m => !gorebilir(m));
    const ayiracEl = document.getElementById(g.ayirac);
    const toggleEl = document.querySelector(`label[for="${g.check}"]`);
    if(ayiracEl) ayiracEl.style.display = hepsiGizli ? 'none' : '';
    if(toggleEl) toggleEl.style.display = hepsiGizli ? 'none' : '';
  });

  const kyBtn = document.querySelector('.nav-tab[data-tab="kullaniciYonetimi"]');
  if(kyBtn) kyBtn.style.display = kullaniciYonetimiYetkisiVar() ? '' : 'none';

  // İstatistikler paneli de sadece admin/yetkili kullanıcıya görünür —
  // kişisel giriş/aktivite verileri diğer öğretmenlere gösterilmemeli.
  const istBtn = document.querySelector('.nav-tab[data-tab="istatistikler"]');
  if(istBtn) istBtn.style.display = kullaniciYonetimiYetkisiVar() ? '' : 'none';

  // "Öğrenci Listesi Oluştur" bir rol-izin modülü DEĞİL — hesaba bağlı
  // öğretmen kaydı (ders programında en az bir sınıfı olan) varsa
  // herkese gösterilir; admin dahil, izin sekmesinden yönetilmez.
  const olBtn = document.querySelector('.nav-tab[data-tab="ogretmenListe"]');
  if(olBtn){
    const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
    olBtn.style.display = ben ? '' : 'none';
  }

  if(typeof dashboardYetkiUygula === 'function') dashboardYetkiUygula();
}

/* Alt menünün 2. butonu: hesaba bağlı bir öğretmen kaydı varsa "Ders ve Nöbet
   Programım" (öğretmenin günlük ihtiyacına daha yakın), yoksa normal
   "Evraklar" gösterilir. bagliOgretmenimGetir() veri henüz yüklenmediyse null
   dönebilir — sidebarYetkiUygula() veri güncellemelerinde tekrar çağrıldığı
   için bu kendiliğinden düzelir (bkz. avatar/selamlama ile aynı desen). */
/* Alt menünün 2. butonu: SÜPER ADMİN'de "Çizelgeler", hesabına bağlı bir
   öğretmen kaydı olan (ve admin olmayan) kullanıcıda "Ders ve Nöbet
   Programım", ikisi de değilse normal "Evraklar" gösterilir. Admin
   kontrolü öğretmen bağlantısından ÖNCELİKLİDİR — bir admin hesabı aynı
   zamanda bir öğretmene bağlıysa bile admin için "Çizelgeler" gösterilir
   (öğretmenlik bilgisi burada değil "Programım" sayfasında zaten mevcut). */
function _bnIkinciItemAyarla(){
  const btn = document.getElementById('bnIkinciItem');
  if(!btn) return;
  const ikon = btn.querySelector('.bn-ico');
  const etiket = btn.querySelector('.bn-label');
  const adminMi = typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true;
  const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;

  if(adminMi){
    btn.dataset.tab = 'sosyalKulupler';
    btn.setAttribute('onclick', "sekmeAc('sosyalKulupler'); bottomNavAktifYap(this);");
    if(ikon) ikon.setAttribute('data-lucide', 'bar-chart-3');
    if(etiket) etiket.textContent = 'Çizelgeler';
    btn.style.display = '';
  } else if(ben){
    btn.dataset.tab = 'dersNobetProgramim';
    btn.setAttribute('onclick', "sekmeAc('dersNobetProgramim'); bottomNavAktifYap(this);");
    if(ikon) ikon.setAttribute('data-lucide', 'book-open');
    if(etiket) etiket.textContent = 'Programım';
    btn.style.display = '';
  } else {
    btn.dataset.tab = 'evrak';
    btn.setAttribute('onclick', "sekmeAc('evrak'); bottomNavAktifYap(this);");
    if(ikon) ikon.setAttribute('data-lucide', 'file-text');
    if(etiket) etiket.textContent = 'Evraklar';
    btn.style.display = gorebilir('evrak') ? '' : 'none';
  }
  // İkon Lucide SVG'sine dönüştüğü için textContent artık işe yaramaz;
  // data-lucide attribute'u yukarıda güncellendi, gerçek çizim burada.
  if(typeof window.ikonYenile === 'function') window.ikonYenile();
}

/* ---------- Anasayfa (Genel Bakış) kişiselleştirme ----------
   data-yetki-modul taşıyan her dashboard kartını, o modülü göremeyen
   kullanıcılar için gizler. Statik kartlar burada; dinamik üretilen
   kartlar (dashStats istatistik şeridi, dashHizliBakis rozetleri)
   kendi gorebilir() kontrolünü js/app.js > renderDashboard() içinde yapar. */
/* Not: eskiden sadece #tab-panel (anasayfa) içini taradı; artık [data-yetki-modul]
   taşıyan HERHANGİ bir eleman için çalışır (ör. Ayarlar sekmesindeki "Sistem
   Ayarları" bölümleri) — isim geriye dönük uyumluluk için korundu. */
function dashboardYetkiUygula(){
  document.querySelectorAll('[data-yetki-modul]').forEach(el=>{
    const modul = el.dataset.yetkiModul;
    const izinliMi = gorebilir(modul);
    el.classList.toggle('yetkisiz-gizli', !izinliMi);
    if(!izinliMi){
      el.setAttribute('style', (el.getAttribute('style')||'') + ';display:none!important;');
    } else if(el.style.display === 'none' && !el.id){
      // Bilinen "başlangıçta gizli, veri gelince açılan" kartlar (id'li olanlar,
      // örn. bugunIzinliKart) kendi render fonksiyonlarının kontrolüne bırakılır;
      // id'siz statik kartlarda inline display:none'ı temizle.
      el.style.removeProperty('display');
    }
  });
}
let ROLLER_CACHE = [];
let YONETIM_KULLANICILAR_CACHE = [];
let _duzenlenenRolId = null;

function kullaniciYonetimiDinleyiciKur(){
  if(!db) return;
  KullaniciYonetimiRepository.rolleriDinle(v=>{
    ROLLER_CACHE = v;
    renderRoller();
    renderYonetimKullanicilari();
  });
  KullaniciYonetimiRepository.kullanicilariDinle(v=>{
    YONETIM_KULLANICILAR_CACHE = v;
    renderYonetimKullanicilari();
  });
}

function kullaniciYonetimiAltSekmeSec(sekme){
  document.querySelectorAll('[data-ky-sekme]').forEach(b=>b.classList.toggle('active', b.dataset.kySekme===sekme));
  const rBolum = document.getElementById('ky-bolum-roller');
  const kBolum = document.getElementById('ky-bolum-kullanicilar');
  if(rBolum) rBolum.style.display = sekme === 'roller' ? '' : 'none';
  if(kBolum) kBolum.style.display = sekme === 'kullanicilar' ? '' : 'none';
}

/* ---------- Roller ---------- */
function renderRoller(){
  const el = document.getElementById('rolListesi');
  if(!el) return;
  if(!ROLLER_CACHE.length){
    el.innerHTML = '<p class="empty-state">Henüz rol tanımlanmadı. Aşağıdaki "Yeni Rol" düğmesiyle başlayın (ör. "Yönetici", "Öğretmen").</p>';
    return;
  }
  const siraliRoller = [...ROLLER_CACHE].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'));
  el.innerHTML = siraliRoller.map(r=>{
    const kullaniciSayisi = YONETIM_KULLANICILAR_CACHE.filter(k=>k.rolId===r.id).length;
    return `<div class="card" style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
        <div>
          <div style="font-weight:700;font-size:15px;">${escapeHtml(r.ad||'İsimsiz Rol')}</div>
          <div style="font-size:12.5px;color:var(--ink-muted);">${kullaniciSayisi} kullanıcı${r.kullaniciYonetimi ? ' · 👑 Kullanıcı Yönetimi yetkili' : ''}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="rolFormAc('${r.id}')">Düzenle</button>
      </div>
    </div>`;
  }).join('');
}

function rolFormAc(id){
  _duzenlenenRolId = id;
  const rol = id === 'yeni' ? {ad:'', kullaniciYonetimi:false, yetkiler:{}} : (ROLLER_CACHE.find(r=>r.id===id) || {ad:'', kullaniciYonetimi:false, yetkiler:{}});
  const alan = document.getElementById('rolFormAlani');
  if(!alan) return;

  const gruplar = {};
  MODUL_LISTESI.forEach(m=>{ (gruplar[m.grup] = gruplar[m.grup] || []).push(m); });
  const seviyeler = [['gizle','🚫 Gizle'],['goruntule','👁 Görüntüle'],['duzenle','✏️ Düzenle']];

  let gridHtml = '';
  Object.keys(gruplar).forEach(grupAdi=>{
    gridHtml += `<div class="rol-grup-baslik">${escapeHtml(grupAdi)}</div>`;
    gruplar[grupAdi].forEach(m=>{
      const mevcut = (rol.yetkiler && rol.yetkiler[m.modul]) || 'gizle';
      gridHtml += `<div class="rol-satir">
        <div class="rol-satir-ad">${escapeHtml(m.ad)}</div>
        <div class="rol-satir-secim">
          ${seviyeler.map(([deger,etiket])=>`
            <label class="rol-radio">
              <input type="radio" name="rol_${m.modul}" value="${deger}" ${mevcut===deger?'checked':''}>
              <span>${etiket}</span>
            </label>`).join('')}
        </div>
      </div>`;
    });
  });

  alan.innerHTML = `
    <div class="card" style="margin-top:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
        <input type="text" id="rolAdInput" placeholder="Rol adı (ör. Öğretmen)" value="${escapeHtml(rol.ad||'')}" style="flex:1;min-width:180px;">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;white-space:nowrap;">
          <input type="checkbox" id="rolKullaniciYonetimiInput" ${rol.kullaniciYonetimi?'checked':''}>
          👑 Kullanıcı Yönetimi yetkisi
        </label>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <span style="font-size:12px;color:var(--ink-muted);font-weight:600;">Toplu ayarla:</span>
        <button type="button" class="btn btn-ghost btn-sm" onclick="rolModulHepsiniAyarla('duzenle')">✏️ Tümünü Düzenle Yap</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="rolModulHepsiniAyarla('goruntule')">👁 Tümünü Görüntüle Yap</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="rolModulHepsiniAyarla('gizle')">🚫 Tümünü Gizle Yap</button>
      </div>
      <div id="rolModulGrid">${gridHtml}</div>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;align-items:center;">
        <button class="btn btn-primary" onclick="rolKaydet()">Kaydet</button>
        <button class="btn btn-ghost" onclick="rolFormKapat()">İptal</button>
        ${id !== 'yeni' ? `<button class="btn btn-ghost" style="margin-left:auto;color:#c0392b;" onclick="rolSil('${id}')">Rolü Sil</button>` : ''}
      </div>
    </div>`;
  alan.scrollIntoView({behavior:'smooth', block:'start'});
}

/* Rol formundaki 29 modülün TÜMÜNÜ tek tıkla aynı seviyeye ("gizle" |
   "goruntule" | "duzenle") ayarlar — geniş yetkili roller (ör. "Yönetici")
   tanımlarken her modülü tek tek işaretlemek yerine hepsini "Düzenle" yapıp
   sadece istisnaları elle değiştirmeyi sağlar. Henüz kaydedilmez; "Kaydet"
   butonuna basılana kadar sadece formdaki seçimleri değiştirir. */
function rolModulHepsiniAyarla(seviye){
  MODUL_LISTESI.forEach(m=>{
    const radio = document.querySelector(`input[name="rol_${m.modul}"][value="${seviye}"]`);
    if(radio) radio.checked = true;
  });
}

function rolFormKapat(){
  _duzenlenenRolId = null;
  const alan = document.getElementById('rolFormAlani');
  if(alan) alan.innerHTML = '';
}

function rolKaydet(){
  const ad = (document.getElementById('rolAdInput')?.value || '').trim();
  if(!ad){ toast('Rol adı girin.'); return; }
  const kullaniciYonetimi = !!document.getElementById('rolKullaniciYonetimiInput')?.checked;
  const yetkiler = {};
  MODUL_LISTESI.forEach(m=>{
    const secili = document.querySelector(`input[name="rol_${m.modul}"]:checked`);
    yetkiler[m.modul] = secili ? secili.value : 'gizle';
  });
  if(!db){ toast('Firebase bağlantısı yok.'); return; }
  const veri = { ad, kullaniciYonetimi, yetkiler };
  const mevcutId = (_duzenlenenRolId && _duzenlenenRolId !== 'yeni') ? _duzenlenenRolId : null;
  KullaniciYonetimiService.rolKaydet(mevcutId, veri)
    .then(()=>{ toast('Rol kaydedildi.'); rolFormKapat(); })
    .catch(err=>{ if(err.message!=='yetkisiz') hataGoster(err); });
}

function rolSil(id){
  const kullaniciSayisi = YONETIM_KULLANICILAR_CACHE.filter(k=>k.rolId===id).length;
  if(kullaniciSayisi > 0){
    toast(`Bu role atanmış ${kullaniciSayisi} kullanıcı var, önce onların rolünü değiştirin.`);
    return;
  }
  if(!confirm('Bu rolü silmek istediğinize emin misiniz?')) return;
  KullaniciYonetimiService.rolSil(id, kullaniciSayisi)
    .then(()=>{ toast('Rol silindi.'); rolFormKapat(); })
    .catch(err=>{ if(err.message!=='yetkisiz' && !err.message.startsWith('rol-kullanimda:')) hataGoster(err); });
}

/* ---------- Kullanıcılar ---------- */
/* Google hesap adı yerine, hesaba bağlı öğretmen kaydı varsa ONUN adı ve
   fotoğrafı gösterilir (bkz. js/auth.js sidebarHesapGuncelle'deki aynı mantık). */
function _kullaniciGoruntulenecekAd(k){
  const o = k.bagliOgretmenId ? (typeof ogretmenler!=='undefined' ? ogretmenler.find(x=>x.id===k.bagliOgretmenId) : null) : null;
  if(o) return `${o.ad||''} ${o.soyad||''}`.trim() || (k.ad || 'İsimsiz');
  return k.ad || 'İsimsiz';
}
function _kullaniciGoruntulenecekFoto(k){
  const o = k.bagliOgretmenId ? (typeof ogretmenler!=='undefined' ? ogretmenler.find(x=>x.id===k.bagliOgretmenId) : null) : null;
  return (o && o.profilFotoUrl) || k.fotoUrl || 'assets/icon-192.png';
}

/* Bir Firebase Auth UID'sinden görüntülenecek kullanıcı adını bulur
   (bağlı öğretmen kaydı varsa onun adı, yoksa Google adı) — notlar/takvim
   gibi modüllerde "kim eklemiş" etiketi için admin görünümünde kullanılır.
   YONETIM_KULLANICILAR_CACHE sadece Kullanıcı Yönetimi yetkisi olanlarda
   dolu olduğundan, bu fonksiyon pratikte sadece admin/yönetici oturumunda
   anlamlı sonuç verir. */
function _sahipAdiGetir(uid){
  if(!uid) return '';
  if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && uid === AKTIF_KULLANICI.uid) return 'Ben';
  const k = (typeof YONETIM_KULLANICILAR_CACHE !== 'undefined' ? YONETIM_KULLANICILAR_CACHE : []).find(x=>x.id===uid);
  if(!k) return 'Bilinmeyen Kullanıcı';
  return _kullaniciGoruntulenecekAd(k);
}

function renderYonetimKullanicilari(){
  const el = document.getElementById('kullaniciYonetimListesi');
  if(!el) return;
  if(!YONETIM_KULLANICILAR_CACHE.length){
    el.innerHTML = '<p class="empty-state">Henüz kullanıcı yok.</p>';
    return;
  }
  const siraliListe = [...YONETIM_KULLANICILAR_CACHE].sort((a,b)=>{
    if(!!a.aktif !== !!b.aktif) return a.aktif ? 1 : -1; // onay bekleyenler üstte
    return _kullaniciGoruntulenecekAd(a).localeCompare(_kullaniciGoruntulenecekAd(b),'tr');
  });
  el.innerHTML = siraliListe.map(k=>{
    const rolAdi = k.admin ? '👑 Süper Admin' : (ROLLER_CACHE.find(r=>r.id===k.rolId)?.ad || 'Rol atanmadı');
    return `<div class="card" style="margin-bottom:10px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <img src="${_kullaniciGoruntulenecekFoto(k)}" style="width:38px;height:38px;border-radius:50%;flex-shrink:0;object-fit:cover;">
      <div style="flex:1;min-width:160px;">
        <div style="font-weight:700;font-size:14px;">${escapeHtml(_kullaniciGoruntulenecekAd(k))} ${!k.aktif ? '<span class="status-badge status-bekleme">Onay Bekliyor</span>' : ''}</div>
        <div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(k.kullaniciAdi ? '@'+k.kullaniciAdi : (k.email || ''))} · ${escapeHtml(rolAdi)}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="kullaniciDuzenleAc('${k.id}')">Düzenle</button>
    </div>`;
  }).join('');
}

function kullaniciDuzenleAc(uid){
  const k = YONETIM_KULLANICILAR_CACHE.find(u=>u.id===uid);
  if(!k) return;
  const rolSecenekleri = [...ROLLER_CACHE].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'))
    .map(r=>`<option value="${r.id}" ${k.rolId===r.id?'selected':''}>${escapeHtml(r.ad)}</option>`).join('');
  const ogretmenSecenekleri = (typeof ogretmenler !== 'undefined' ? ogretmenler : [])
    .slice().sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'))
    .map(o=>`<option value="${o.id}" ${k.bagliOgretmenId===o.id?'selected':''}>${escapeHtml((o.ad||'')+' '+(o.soyad||''))}</option>`).join('');

  const bodyHtml = `
    <label>Kullanıcı Adı</label>
    <input type="text" value="${escapeHtml(k.kullaniciAdi || k.email || '')}" disabled>
    <button type="button" class="btn btn-ghost btn-sm" style="margin:6px 0 4px;" onclick="sifreSifirlaModalAc('${uid}')">🔑 Şifre Sıfırla / Yeni Giriş Bilgisi Ver</button>
    <label>Rol</label>
    <select id="fKullaniciRol"><option value="">— Rol seçilmedi —</option>${rolSecenekleri}</select>
    <label>Bağlı Öğretmen Kaydı <span style="font-weight:400;color:var(--ink-muted);">(kişisel veri filtresi için)</span></label>
    <select id="fKullaniciOgretmen"><option value="">— Bağlantı yok —</option>${ogretmenSecenekleri}</select>
    <label style="display:flex;align-items:center;gap:8px;margin-top:12px;">
      <input type="checkbox" id="fKullaniciAktif" ${k.aktif?'checked':''}> Hesap aktif (uygulamaya girebilir)
    </label>
    <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
      <input type="checkbox" id="fKullaniciAdmin" ${k.admin?'checked':''}> 👑 Süper Admin (tüm yetkileri bypass eder — dikkatli kullanın)
    </label>
  `;
  modalAc('Kullanıcıyı Düzenle: ' + _kullaniciGoruntulenecekAd(k), bodyHtml, ()=>kullaniciKaydet(uid), null, 'Kaydet');
}

/* ---------- Yeni kullanıcı oluşturma (admin) ---------- */
function yeniKullaniciModalAc(){
  const rolSecenekleri = [...ROLLER_CACHE].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'))
    .map(r=>`<option value="${r.id}">${escapeHtml(r.ad)}</option>`).join('');
  const ogretmenSecenekleri = (typeof ogretmenler !== 'undefined' ? ogretmenler : [])
    .slice().sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'))
    .map(o=>`<option value="${o.id}">${escapeHtml((o.ad||'')+' '+(o.soyad||''))}</option>`).join('');

  const bodyHtml = `
    <label>Ad Soyad</label>
    <input type="text" id="fyAd" placeholder="örn: Hasret Çeçen">
    <label>Kullanıcı Adı <span style="font-weight:400;color:var(--ink-muted);">(giriş için kullanılacak, boşluksuz)</span></label>
    <input type="text" id="fyKullaniciAdi" placeholder="örn: hasret.cecen" autocapitalize="none">
    <label>Geçici Şifre <span style="font-weight:400;color:var(--ink-muted);">(en az 6 karakter)</span></label>
    <input type="text" id="fySifre" placeholder="örn: Okul2026!">
    <label>Rol</label>
    <select id="fyRol"><option value="">— Rol seçilmedi —</option>${rolSecenekleri}</select>
    <label>Bağlı Öğretmen Kaydı</label>
    <select id="fyOgretmen"><option value="">— Bağlantı yok —</option>${ogretmenSecenekleri}</select>
    <label style="display:flex;align-items:center;gap:8px;margin-top:12px;">
      <input type="checkbox" id="fyAdmin"> 👑 Süper Admin
    </label>
    <div style="font-size:12px;color:var(--ink-muted);margin-top:10px;">Oluşturulan kullanıcı adı ve şifreyi bu kişiye siz iletmelisiniz.</div>
  `;
  modalAc('➕ Yeni Kullanıcı Oluştur', bodyHtml, ()=>yeniKullaniciKaydet(), null, 'Oluştur');
}

async function yeniKullaniciKaydet(){
  const ad = document.getElementById('fyAd').value.trim();
  const kullaniciAdi = document.getElementById('fyKullaniciAdi').value.trim();
  const sifre = document.getElementById('fySifre').value;
  const rolId = document.getElementById('fyRol').value || null;
  const bagliOgretmenId = document.getElementById('fyOgretmen').value || null;
  const admin = !!document.getElementById('fyAdmin').checked;

  if(!ad || !kullaniciAdi){ toast('Ad Soyad ve Kullanıcı Adı zorunludur.'); return; }
  if(!sifre || sifre.length < 6){ toast('Şifre en az 6 karakter olmalıdır.'); return; }
  if(!kullaniciYonetimiYetkisiVar()){ toast('Bu işlem için yetkiniz yok.'); return; }

  const kaydetBtn = document.getElementById('modalKaydetBtn');
  if(kaydetBtn){ kaydetBtn.disabled = true; kaydetBtn.textContent = 'Oluşturuluyor…'; }
  try{
    const sonuc = await adminYeniKullaniciOlustur(kullaniciAdi, sifre, { ad, rolId, bagliOgretmenId, admin });
    toast(`Kullanıcı oluşturuldu: ${kullaniciAdi} — şifreyi kendisine iletin.`);
    modalKapat();
  }catch(err){
    console.error(err);
    let mesaj = 'Hata: ' + err.message;
    if(err.code === 'auth/email-already-in-use') mesaj = 'Bu kullanıcı adı zaten kullanılıyor, başka bir tane seçin.';
    if(err.code === 'auth/weak-password') mesaj = 'Şifre çok zayıf, en az 6 karakter olmalı.';
    toast(mesaj);
  }finally{
    if(kaydetBtn){ kaydetBtn.disabled = false; kaydetBtn.textContent = 'Oluştur'; }
  }
}

/* ---------- Şifre sıfırlama (admin) — bkz. js/auth.js dosya başı notu ---------- */
function sifreSifirlaModalAc(uid){
  const k = YONETIM_KULLANICILAR_CACHE.find(u=>u.id===uid);
  if(!k) return;
  const bodyHtml = `
    <p style="font-size:13px;color:var(--ink-muted);margin-bottom:10px;">
      Eski kullanıcı adı (<strong>${escapeHtml(k.kullaniciAdi||k.email||'')}</strong>) devre dışı bırakılacak,
      bu kişi için YENİ bir kullanıcı adı ve şifre oluşturulacak. Rolü ve bağlı öğretmen kaydı korunur.
    </p>
    <label>Yeni Kullanıcı Adı</label>
    <input type="text" id="fsYeniKullaniciAdi" placeholder="örn: hasret.cecen2" autocapitalize="none">
    <label>Yeni Şifre <span style="font-weight:400;color:var(--ink-muted);">(en az 6 karakter)</span></label>
    <input type="text" id="fsYeniSifre" placeholder="örn: Okul2026!">
  `;
  modalAc('🔑 Şifre Sıfırla — ' + _kullaniciGoruntulenecekAd(k), bodyHtml, ()=>sifreSifirlaKaydet(uid), null, 'Sıfırla');
}

async function sifreSifirlaKaydet(uid){
  const k = YONETIM_KULLANICILAR_CACHE.find(u=>u.id===uid);
  if(!k) return;
  const yeniKullaniciAdi = document.getElementById('fsYeniKullaniciAdi').value.trim();
  const yeniSifre = document.getElementById('fsYeniSifre').value;
  if(!yeniKullaniciAdi){ toast('Yeni kullanıcı adı zorunludur.'); return; }
  if(!yeniSifre || yeniSifre.length < 6){ toast('Şifre en az 6 karakter olmalıdır.'); return; }

  const kaydetBtn = document.getElementById('modalKaydetBtn');
  if(kaydetBtn){ kaydetBtn.disabled = true; kaydetBtn.textContent = 'İşleniyor…'; }
  try{
    const sonuc = await adminSifreSifirlaYeniHesapla(k, yeniKullaniciAdi, yeniSifre);
    toast(`Yeni giriş bilgileri oluşturuldu: ${yeniKullaniciAdi} — kendisine iletin.`);
    modalKapat();
  }catch(err){
    console.error(err);
    let mesaj = 'Hata: ' + err.message;
    if(err.code === 'auth/email-already-in-use') mesaj = 'Bu kullanıcı adı zaten kullanılıyor, başka bir tane seçin.';
    toast(mesaj);
  }finally{
    if(kaydetBtn){ kaydetBtn.disabled = false; kaydetBtn.textContent = 'Sıfırla'; }
  }
}

function kullaniciKaydet(uid){
  const rolId = document.getElementById('fKullaniciRol')?.value || null;
  const bagliOgretmenId = document.getElementById('fKullaniciOgretmen')?.value || null;
  const aktif = !!document.getElementById('fKullaniciAktif')?.checked;
  const admin = !!document.getElementById('fKullaniciAdmin')?.checked;
  if(!db){ toast('Firebase bağlantısı yok.'); return; }
  KullaniciYonetimiService.kullaniciKaydet(uid, { rolId, bagliOgretmenId, aktif, admin }, AKTIF_KULLANICI?.uid)
    .then(()=>{ toast('Kullanıcı güncellendi.'); modalKapat(); })
    .catch(err=>{
      if(err.message==='kendini-pasif-yapamaz'){ toast('Kendi hesabınızı pasif yapamazsınız.'); return; }
      if(err.message!=='yetkisiz') hataGoster(err);
    });
}

/* ================================================================
   AŞAMA 3: Sayfa içi yetki uygulaması + Profilim
   ================================================================ */

/* 'goruntule' yetkili modüllerde bölüme .salt-okuma sınıfı ekler ve
   içindeki yazma (ekle/düzenle/sil/işaretle) tetikleyici butonları/
   kontrolleri gizler — CSS bu sınıf altındaki ekle/kaydet/sil
   butonlarını da ayrıca gizler (bkz. styles.css .salt-okuma kuralları).

   Not: Bu, tamamen görsel bir katmandır — asıl güvenlik zaten Service
   katmanındaki duzenleyebilir()/yetki kontrollerinde sağlanıyor (bkz.
   Pragmatik-Mimari-Tasarimi.md §5). Yani burada gözden kaçan bir buton
   olsa bile, tıklandığında ilgili xxxService fonksiyonu kaydı reddeder.
   Bu yüzden desen tabanlı (yüzde yüz mükemmel olmayan) bir yaklaşım
   burada kabul edilebilir; amaç kullanıcı deneyimini düzeltmek. */
const _SALT_OKUMA_GIZLE_DESENLERI = [
  /ModalAc\(/, /ModalAcById\(/, /EkleModal\(/,
  /Sil\(/, /SilOnay\(/, /Toggle\(/, /Kaydet\(/, /Guncelle\(/, /Duzenle\(/, /Gonder\(/,
  /Ekle\(/, /Cikar\(/, /CikarNegatif\(/, /Olustur\(/, /Ata\(/,
  /IceAktar\(/, /Import\(/, /Isle\(/, /FotoYukle\(/,
];
/* Rapor/yazdırma/görüntüleme amaçlı, veri YAZMAYAN fonksiyonlar — yanlışlıkla
   gizlenmesin diye yukarıdaki desenlerden istisna tutulur. */
const _SALT_OKUMA_ISTISNA_DESENLERI = [
  /Rapor/i, /Yazdir/i, /Sirku/i, /DetayAc\(/, /DetayModalAc\(/,
  /hizliEkleModalAc/, /profilVeyaSecimAc/,
  /ListeOlustur/i, /OnayModalAc\(/,
  // DÜZELTME: Dökümanlar modülü artık genel Görüntüle/Düzenle seviyesinden
  // BAĞIMSIZ, kendi sahiplik tabanlı yetkilendirmesini kullanıyor (bkz.
  // js/core/services/dokumanlar.service.js) — ekleme herkese açık (kendi
  // kişisel dökümanı için), silme sadece sahip/admin'e açık. Bu yüzden
  // genel salt-okuma mekanizması bu iki butona hiç karışmamalı.
  /dokumanYukleModalAc/, /dokumanSilOnay\(/,
];
function _saltOkumaYazmaTetikleyicisiMi(oc){
  if(!oc) return false;
  const gizlenmeli = _SALT_OKUMA_GIZLE_DESENLERI.some(r=>r.test(oc));
  if(!gizlenmeli) return false;
  return !_SALT_OKUMA_ISTISNA_DESENLERI.some(r=>r.test(oc));
}
/* KRİTİK DÜZELTME: Bu fonksiyon önceden "saltOkumaMi" parametresi almıyordu
   ve eşleşen her butonu/kontrolü YETKİDEN BAĞIMSIZ olarak gizliyor/devre
   dışı bırakıyordu — süper admin dahil HERKESİ etkileyen ciddi bir hataydı.
   Artık sadece saltOkumaMi===true iken kısıtlama uygulanır; false ise
   (düzenleme yetkisi varsa) önceki kısıtlamalar varsa temizlenir. */
function saltOkumaButonlariUygula(panel, saltOkumaMi){
  if(!panel) return;
  panel.querySelectorAll('[onclick]').forEach(el=>{
    if(saltOkumaMi && _saltOkumaYazmaTetikleyicisiMi(el.getAttribute('onclick'))) el.classList.add('salt-okuma-gizli');
    else el.classList.remove('salt-okuma-gizli');
  });
  // Checkbox/select gibi onchange ile kayıt tetikleyen kontroller (örn. tamamlandı
  // tikleri, "aktif" seçimi) — bunlar gizlenmez, devre dışı bırakılır (disabled).
  // Dosya seçici (input type=file, örn. "Fotoğraf yükle") ise görünen eleman
  // gerçekte kendisine bağlı <label for="..."> olduğundan, o da ayrıca gizlenir.
  panel.querySelectorAll('[onchange]').forEach(el=>{
    const yazmaTetikleyici = saltOkumaMi && _saltOkumaYazmaTetikleyicisiMi(el.getAttribute('onchange'));
    if(yazmaTetikleyici){
      el.dataset.saltOkumaDisabled = '1';
      el.disabled = true;
      if(el.tagName==='INPUT' && el.type==='file' && el.id){
        const etiket = panel.querySelector(`label[for="${el.id}"]`);
        if(etiket) etiket.classList.add('salt-okuma-gizli');
      }
    } else if(el.dataset.saltOkumaDisabled){
      delete el.dataset.saltOkumaDisabled;
      el.disabled = false;
      if(el.tagName==='INPUT' && el.type==='file' && el.id){
        const etiket = panel.querySelector(`label[for="${el.id}"]`);
        if(etiket) etiket.classList.remove('salt-okuma-gizli');
      }
    }
  });
}
/* ---------- Detay panelleri (öğretmen/personel/sınıf/servis) için salt-okuma ----------
   #detayOverlay tab-panel'lerin DIŞINDA, paylaşılan tek bir overlay olduğu için
   saltOkumaUygula(tab) buraya hiç ulaşmıyordu. Detay panelini açan her modül
   (ogretmen-detay.js, personel.js, siniflar.js, tasima.js) panel açıldıktan
   hemen sonra bunu kendi modül adıyla çağırır. */
function saltOkumaDetayUygula(modul){
  const overlay = document.getElementById('detayOverlay');
  if(!overlay) return;
  const saltOkumaMi = !duzenleyebilir(modul);
  overlay.classList.toggle('salt-okuma', saltOkumaMi);
  saltOkumaButonlariUygula(overlay, saltOkumaMi);
}

function saltOkumaUygula(tab){
  const panel = document.getElementById('tab-'+tab);
  if(!panel) return;
  const saltOkumaMi = !duzenleyebilir(tab);
  panel.classList.toggle('salt-okuma', saltOkumaMi);
  saltOkumaButonlariUygula(panel, saltOkumaMi);
}

/* Girişli kullanıcının bağlı olduğu öğretmen kaydı */
function bagliOgretmenimGetir(){
  if(!AKTIF_KULLANICI || !AKTIF_KULLANICI.bagliOgretmenId) return null;
  return (typeof ogretmenler !== 'undefined' ? ogretmenler : []).find(o=>o.id===AKTIF_KULLANICI.bagliOgretmenId) || null;
}

/* Topbar avatar tıklaması: bağlı öğretmeni olan kullanıcı kendi profilini
   görür; admin/bağsız kullanıcı eski kullanıcı seçme modalını görür. */
/* DÜZELTME: Eskiden bağlı öğretmen kaydı yoksa "Kullanıcı Seç" modalı
   açılırdı — bu özellik tamamen kaldırıldı (bkz. js/ui.js notu). Artık
   bağlantısız hesaplar (genelde admin/idari hesap) için sadece bilgi
   mesajı gösterilir; süper adminler Kullanıcı Yönetimi'ne yönlendirilir. */
function profilVeyaSecimAc(){
  const ben = bagliOgretmenimGetir();
  if(ben && typeof ogretmenDetayAc === 'function'){ ogretmenDetayAc(ben.id); return; }
  if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin){
    toast('Hesabınıza bağlı bir öğretmen kaydı yok. (Süper admin hesabı)');
  } else {
    toast('Hesabınıza bağlı bir öğretmen kaydı yok. Yöneticinizden Kullanıcı Yönetimi\'nden bağlamasını isteyin.');
  }
}

/* Kendi profilinde SADECE foto/telefon/e-posta güncellenebilir. */
function profilimDuzenleAc(){
  const ben = bagliOgretmenimGetir();
  if(!ben){ toast('Hesabınıza bağlı öğretmen kaydı yok.'); return; }
  const body = `
    <div class="form-group"><label>Profil Fotoğrafı URL</label><input id="f_pfFoto" value="${escapeHtml(ben.profilFotoUrl||'')}" placeholder="https://..."></div>
    <div class="form-group"><label>Telefon</label><input id="f_pfTel" value="${escapeHtml(ben.telefon||'')}"></div>
    <div class="form-group"><label>E-Posta</label><input id="f_pfMail" value="${escapeHtml(ben.eposta||'')}"></div>
    <p class="page-sub">Diğer bilgileriniz (branş, ünvan, evrak durumları vb.) yalnızca okul yönetimi tarafından güncellenebilir.</p>`;
  modalAc('Bilgilerimi Güncelle', body, ()=>{
    // not: COL.ogretmenler henüz kendi repository/service katmanına taşınmadı
    // (bkz. Pragmatik-Mimari-Tasarimi.md §8 — "ogretmenler" ayrı bir migration
    // adımı gerektiriyor, bilinçli olarak ertelendi), bu yüzden burada
    // doğrudan db erişimi bırakıldı.
    db.collection(COL.ogretmenler).doc(ben.id).update({
      profilFotoUrl: document.getElementById('f_pfFoto').value.trim(),
      telefon: document.getElementById('f_pfTel').value.trim(),
      eposta: document.getElementById('f_pfMail').value.trim()
    }).then(()=>{ toast('Bilgileriniz güncellendi.'); modalKapat(); }).catch(hataGoster);
  }, null, 'Kaydet');
}

/* Detay paneli açılırken çağrılır: düzenleme yetkisi yoksa panel
   salt-okuma olur; kendi profiliyse sınırlı düzenleme butonu görünür. */
function detayPanelYetkiUygula(ogretmenId){
  const duzBtn = document.getElementById('detayDuzenleBtn');
  const overlay = document.getElementById('detayOverlay');
  if(!overlay) return;
  const tamYetki = duzenleyebilir('ogretmenler');
  const kendisiMi = !!(AKTIF_KULLANICI && AKTIF_KULLANICI.bagliOgretmenId === ogretmenId);
  overlay.classList.toggle('salt-okuma', !tamYetki);
  if(duzBtn){
    if(tamYetki){
      duzBtn.style.display=''; duzBtn.textContent='Düzenle';
      duzBtn.onclick = ()=>{ detayPanelKapat(); ogretmenModalAc(ogretmenId); };
    } else if(kendisiMi){
      duzBtn.style.display=''; duzBtn.textContent='Bilgilerimi Güncelle';
      duzBtn.onclick = ()=> profilimDuzenleAc();
    } else {
      duzBtn.style.display='none';
    }
  }
}
