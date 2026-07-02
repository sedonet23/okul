/* ================================================================
   js/kullanici-yonetimi.js
   AŞAMA 2: Rol tabanlı yetkilendirme + Kullanıcı Yönetimi ekranı.

   Admin, sabit rol adları yerine kendi rollerini tanımlar (ör. "Yönetici",
   "Öğretmen"), her rolde 29 modülün her biri için Gizle / Görüntüle /
   Düzenle seçer, sonra kullanıcılara bu rolü atar.

   NOT: Bu aşamada yetkiler sidebar'da modül gizleme/gösterme olarak
   uygulanır. Sayfa içindeki tekil ekle/düzenle/sil butonlarının ve
   Firestore güvenlik kurallarının rol bazında sıkılaştırılması
   AŞAMA 3'te yapılacak.
   ================================================================ */

const MODUL_LISTESI = [
  {grup:'Genel', modul:'ogretmenler', ad:'Öğretmenler'},
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
  {grup:'Genel', modul:'dokumanlar', ad:'Dökümanlar'},
  {grup:'Genel', modul:'haberler', ad:'Haberler'},
  {grup:'Genel', modul:'mevzuat', ad:'Mevzuat'},
  {grup:'Genel', modul:'asistan', ad:'AI Asistan'},
  {grup:'Çizelgeler', modul:'sosyalKulupler', ad:'Sosyal Kulüpler'},
  {grup:'Çizelgeler', modul:'belirliGunler', ad:'Belirli Gün & Haftalar'},
  {grup:'Çizelgeler', modul:'zumre', ad:'Zümre'},
  {grup:'Çizelgeler', modul:'sok', ad:'ŞÖK'},
  {grup:'Çizelgeler', modul:'bepPlani', ad:'Yıllık / BEP Planı'},
  {grup:'Çizelgeler', modul:'rehberlik', ad:'Rehberlik'},
  {grup:'Çizelgeler', modul:'maarifRapor', ad:'Maarif Model Raporlar'},
  {grup:'Çizelgeler', modul:'digerEvrak', ad:'Diğer Evraklar'},
  {grup:'Çizelgeler', modul:'periyodikIsler', ad:'Aylık İşler'},
  {grup:'Yönetim', modul:'okulBilgileri', ad:'Okul Bilgileri'},
  {grup:'Yönetim', modul:'veri', ad:'Veri'},
  {grup:'Yönetim', modul:'ayarlar', ad:'Ayarlar'},
];
const _CIZELGELER_MODULLERI = MODUL_LISTESI.filter(m=>m.grup==='Çizelgeler').map(m=>m.modul);

/* ---------- Yetki yardımcı fonksiyonları ---------- */
function yetkiSeviyesi(modul){
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
    if(modul === 'panel' || modul === 'kullaniciYonetimi') return; // ayrı ele alınıyor
    btn.style.display = gorebilir(modul) ? '' : 'none';
  });

  // "Çizelgeler" alt grubundaki modüllerin tamamı gizliyse üst başlığı/ayırıcıyı da gizle.
  const hepsiGizli = _CIZELGELER_MODULLERI.every(m => !gorebilir(m));
  document.querySelector('label[for="cizelgelerCheck"]')?.style && (document.querySelector('label[for="cizelgelerCheck"]').style.display = hepsiGizli ? 'none' : '');
  document.querySelector('.nav-separator') && (document.querySelector('.nav-separator').style.display = hepsiGizli ? 'none' : '');

  const kyBtn = document.querySelector('.nav-tab[data-tab="kullaniciYonetimi"]');
  if(kyBtn) kyBtn.style.display = kullaniciYonetimiYetkisiVar() ? '' : 'none';
}

/* ---------- Veri dinleme ---------- */
let ROLLER_CACHE = [];
let YONETIM_KULLANICILAR_CACHE = [];
let _duzenlenenRolId = null;

function kullaniciYonetimiDinleyiciKur(){
  if(!db) return;
  db.collection(COL.roller).onSnapshot(snap=>{
    ROLLER_CACHE = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderRoller();
    renderYonetimKullanicilari();
  }, err=>console.warn('Roller dinlenemedi:', err));

  db.collection(COL.kullanicilar).onSnapshot(snap=>{
    YONETIM_KULLANICILAR_CACHE = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderYonetimKullanicilari();
  }, err=>console.warn('Kullanıcılar dinlenemedi:', err));
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
      <div id="rolModulGrid">${gridHtml}</div>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;align-items:center;">
        <button class="btn btn-primary" onclick="rolKaydet()">Kaydet</button>
        <button class="btn btn-ghost" onclick="rolFormKapat()">İptal</button>
        ${id !== 'yeni' ? `<button class="btn btn-ghost" style="margin-left:auto;color:#c0392b;" onclick="rolSil('${id}')">Rolü Sil</button>` : ''}
      </div>
    </div>`;
  alan.scrollIntoView({behavior:'smooth', block:'start'});
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
  const islem = (_duzenlenenRolId && _duzenlenenRolId !== 'yeni')
    ? db.collection(COL.roller).doc(_duzenlenenRolId).update(veri)
    : db.collection(COL.roller).add(veri);
  islem.then(()=>{ toast('Rol kaydedildi.'); rolFormKapat(); }).catch(hataGoster);
}

function rolSil(id){
  const kullaniciSayisi = YONETIM_KULLANICILAR_CACHE.filter(k=>k.rolId===id).length;
  if(kullaniciSayisi > 0){
    toast(`Bu role atanmış ${kullaniciSayisi} kullanıcı var, önce onların rolünü değiştirin.`);
    return;
  }
  if(!confirm('Bu rolü silmek istediğinize emin misiniz?')) return;
  db.collection(COL.roller).doc(id).delete().then(()=>{ toast('Rol silindi.'); rolFormKapat(); }).catch(hataGoster);
}

/* ---------- Kullanıcılar ---------- */
function renderYonetimKullanicilari(){
  const el = document.getElementById('kullaniciYonetimListesi');
  if(!el) return;
  if(!YONETIM_KULLANICILAR_CACHE.length){
    el.innerHTML = '<p class="empty-state">Henüz kullanıcı yok.</p>';
    return;
  }
  const siraliListe = [...YONETIM_KULLANICILAR_CACHE].sort((a,b)=>{
    if(!!a.aktif !== !!b.aktif) return a.aktif ? 1 : -1; // onay bekleyenler üstte
    return (a.ad||'').localeCompare(b.ad||'','tr');
  });
  el.innerHTML = siraliListe.map(k=>{
    const rolAdi = k.admin ? '👑 Süper Admin' : (ROLLER_CACHE.find(r=>r.id===k.rolId)?.ad || 'Rol atanmadı');
    return `<div class="card" style="margin-bottom:10px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <img src="${k.fotoUrl || 'assets/icon-192.png'}" style="width:38px;height:38px;border-radius:50%;flex-shrink:0;object-fit:cover;">
      <div style="flex:1;min-width:160px;">
        <div style="font-weight:700;font-size:14px;">${escapeHtml(k.ad || 'İsimsiz')} ${!k.aktif ? '<span class="status-badge status-bekleme">Onay Bekliyor</span>' : ''}</div>
        <div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(k.email || '')} · ${escapeHtml(rolAdi)}</div>
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
    <label>E-posta</label>
    <input type="text" value="${escapeHtml(k.email || '')}" disabled>
    <label>Rol</label>
    <select id="fKullaniciRol"><option value="">— Rol seçilmedi —</option>${rolSecenekleri}</select>
    <label>Bağlı Öğretmen Kaydı <span style="font-weight:400;color:var(--ink-muted);">(kişisel veri filtresi — Aşama 3'te devreye girecek)</span></label>
    <select id="fKullaniciOgretmen"><option value="">— Bağlantı yok —</option>${ogretmenSecenekleri}</select>
    <label style="display:flex;align-items:center;gap:8px;margin-top:12px;">
      <input type="checkbox" id="fKullaniciAktif" ${k.aktif?'checked':''}> Hesap aktif (uygulamaya girebilir)
    </label>
    <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
      <input type="checkbox" id="fKullaniciAdmin" ${k.admin?'checked':''}> 👑 Süper Admin (tüm yetkileri bypass eder — dikkatli kullanın)
    </label>
  `;
  modalAc('Kullanıcıyı Düzenle: ' + (k.ad || k.email), bodyHtml, ()=>kullaniciKaydet(uid), null, 'Kaydet');
}

function kullaniciKaydet(uid){
  const rolId = document.getElementById('fKullaniciRol')?.value || null;
  const bagliOgretmenId = document.getElementById('fKullaniciOgretmen')?.value || null;
  const aktif = !!document.getElementById('fKullaniciAktif')?.checked;
  const admin = !!document.getElementById('fKullaniciAdmin')?.checked;
  if(!db){ toast('Firebase bağlantısı yok.'); return; }
  if(uid === AKTIF_KULLANICI?.uid && !aktif){
    toast('Kendi hesabınızı pasif yapamazsınız.');
    return;
  }
  db.collection(COL.kullanicilar).doc(uid).update({ rolId, bagliOgretmenId, aktif, admin })
    .then(()=>{ toast('Kullanıcı güncellendi.'); modalKapat(); })
    .catch(hataGoster);
}
