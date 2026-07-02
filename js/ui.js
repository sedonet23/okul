/* ====================================================================
   js/ui.js
   Hamburger menü (masaüstünde daraltma, mobilde çekmece) ve
   açık/koyu tema değiştirme düğmeleri.
   ==================================================================== */

function temaUygula(tema){
  if(tema === 'dark'){
    document.documentElement.setAttribute('data-theme','dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const emoji = tema === 'dark' ? '☀️' : '🌙';
  const b1 = document.getElementById('temaDugmesi');
  const b2 = document.getElementById('temaDugmesiTopbar');
  if(b1) b1.textContent = emoji;
  if(b2) b2.textContent = emoji;
  localStorage.setItem('oyTema', tema);
}
function temaDegistir(){
  const guncelTema = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  temaUygula(guncelTema);
}

/* ---------- YENİ: Tema paketi (vurgu rengi) seçimi ---------- */
const RENK_PAKETLERI = ['teal','mavi','yesil','mor','turuncu','kirmizi'];
function renkUygula(paket){
  if(!RENK_PAKETLERI.includes(paket)) paket = 'teal';
  document.documentElement.setAttribute('data-accent', paket);
  localStorage.setItem('oyRenkPaketi', paket);
  document.querySelectorAll('.renk-paketi-secenek').forEach(el=>{
    el.classList.toggle('aktif', el.dataset.paket === paket);
  });
}
function renkPaketiBaslat(){
  const kayitli = localStorage.getItem('oyRenkPaketi') || 'teal';
  renkUygula(kayitli);
}

function menuDaralt(){ document.body.classList.toggle('nav-collapsed'); }
function menuAcKapat(){ document.body.classList.toggle('nav-open'); }
function menuKapat(){ document.body.classList.remove('nav-open'); }

/* ---------- accordion (Ayarlar > Ders Saatleri, v4.0) ---------- */
function toggleAccordion(headerEl){
  const content = headerEl.nextElementSibling;
  const aciliyor = !headerEl.classList.contains('open');
  headerEl.classList.toggle('open', aciliyor);
  if(content) content.classList.toggle('open', aciliyor);
}

function uygulamadanCik(){
  if(!confirm('Uygulamadan çıkmak istediğinize emin misiniz?')) return;
  // PWA (standalone) modda sekmeyi kapatmayı dener; tarayıcı sekmesinde
  // güvenlik nedeniyle window.close() çalışmazsa kullanıcıyı bilgilendirir.
  window.close();
  setTimeout(()=>{
    if(!document.hidden){
      toast('Tarayıcı bu sekmenin otomatik kapatılmasına izin vermiyor. Sekmeyi elle kapatabilirsiniz.');
    }
  }, 300);
}

document.addEventListener('DOMContentLoaded', ()=>{
  temaUygula(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  renkPaketiBaslat();

  // YENİ: Karşılamayı sayfa yüklenince hemen güncelle (Firestore bekleme)
  (function selamGuncelle(){
    const el = document.getElementById('heroSelamla') || document.querySelector('.dash-hero-hi');
    if(!el) return;
    const s = new Date().getHours();
    const selam = s < 6 ? 'İyi geceler' : s < 11 ? 'Günaydın' : s < 18 ? 'Tünaydın' : s < 22 ? 'İyi akşamlar' : 'İyi geceler';
    // DÜZELTME: artık gerçek giriş yapan hesabın kimliğini kullanıyor (bkz. _hesapKimligi),
    // sabit "Sedat Bey" yazmıyor. Bu aşamada AKTIF_KULLANICI/ogretmenler henüz yüklenmemiş
    // olabilir; o yüzden bilgi yoksa isim eklemeden sadece selamlıyor, renderDashboard()
    // veriler gelince metni zaten güncelliyor.
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : {ad:''};
    const kullaniciAdi = kimlik.ad ? (kimlik.ad.split(' ')[0] + (kimlik.hitap ? ' ' + kimlik.hitap : '')) : '';
    el.textContent = kullaniciAdi ? `${selam}, ${kullaniciAdi} 👋` : `${selam} 👋`;
  })();

  const temaBtn1 = document.getElementById('temaDugmesi');
  const temaBtn2 = document.getElementById('temaDugmesiTopbar');
  if(temaBtn1) temaBtn1.addEventListener('click', temaDegistir);
  if(temaBtn2) temaBtn2.addEventListener('click', temaDegistir);

  const cikisBtn = document.getElementById('cikisBtn');
  if(cikisBtn) cikisBtn.addEventListener('click', uygulamadanCik);

  const sidebarHamburger = document.getElementById('sidebarHamburger');
  const topbarHamburger = document.getElementById('topbarHamburger');
  if(sidebarHamburger) sidebarHamburger.addEventListener('click', menuDaralt);
  if(topbarHamburger) topbarHamburger.addEventListener('click', menuAcKapat);

  document.body.addEventListener('click', (e)=>{
    if(!document.body.classList.contains('nav-open')) return;
    const sidebar = document.querySelector('.sidebar');
    if(sidebar && !sidebar.contains(e.target) && e.target !== topbarHamburger && !(topbarHamburger && topbarHamburger.contains(e.target))){
      menuKapat();
    }
  });

  document.querySelectorAll('.nav-tab').forEach(btn=>{
    btn.addEventListener('click', menuKapat);
  });

  /* ---------- Kenardan kaydırma (swipe) ile menü aç/kapa ----------
     Ekranın sol kenarına yakın (ilk ~28px) başlayan sağa doğru kaydırma
     menüyü açar. Menü açıkken herhangi bir yerden sola kaydırma kapatır.
     Dikey kaydırmayla (sayfa scroll'u) karışmaması için hareketin büyük
     ölçüde yatay olması şartı aranır. */
  (function swipeMenuKur(){
    const ESIK = 50;              // px — menüyü tetiklemek için gereken minimum yatay kaydırma
    let basX = 0, basY = 0, izleniyor = false, kenardanBasladi = false;

    function duzenlenebilirMi(el){
      if(!el || !el.closest) return false;
      return !!el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]');
    }

    document.addEventListener('touchstart', (e)=>{
      if(e.touches.length !== 1) return;
      // Bir metin kutusu/textarea/düzenlenebilir alan üzerindeyse jest
      // algılamasını TAMAMEN devre dışı bırak — hem imleç sürüklerken
      // yanlışlıkla menü açılmasın, hem de klavye/IME ile olası
      // etkileşimden tamamen kaçınılmış olsun.
      if(duzenlenebilirMi(e.target)){ izleniyor = false; return; }
      basX = e.touches[0].clientX;
      basY = e.touches[0].clientY;
      // Ekranın SOL YARISINDAN başlayan her dokunuş açma jesti sayılır —
      // sadece kenardan değil, ekranın ortasına kadar herhangi bir yerden
      // sağa doğru kaydırınca menü açılabilsin diye.
      kenardanBasladi = basX <= (window.innerWidth * 0.5);
      izleniyor = true;
    }, { passive:true });

    document.addEventListener('touchend', (e)=>{
      if(!izleniyor) return;
      izleniyor = false;
      if(duzenlenebilirMi(e.target)) return;
      const bitis = e.changedTouches[0];
      const dx = bitis.clientX - basX;
      const dy = Math.abs(bitis.clientY - basY);
      // Sabit piksel eşiği yerine ORAN kullanıyoruz: yatay hareket, dikey
      // hareketin en az 1.2 katı olsun yeterli — doğal (tam düz olmayan)
      // kaydırmaları da kabul eder, ama dikey scroll'la karışmaz.
      if(dy > Math.abs(dx) * 0.8) return;

      const acikMi = document.body.classList.contains('nav-open');
      if(!acikMi && kenardanBasladi && dx > ESIK){
        menuAcKapat();
      } else if(acikMi && dx < -ESIK){
        menuKapat();
      }
    }, { passive:true });
  })();

  /* ---------- Çizelgeler açılır menüsü (sol menü) ----------
     Event delegation kullanılır: buton DOM'a sonradan eklenmiş/başka bir
     script tarafından yeniden oluşturulmuş olsa bile çalışmaya devam eder. */
  document.addEventListener('click', (e)=>{
    const toggleBtn = e.target.closest('#cizelgelerToggle');
    if(!toggleBtn) return;
    e.preventDefault();
    e.stopPropagation();
    const menu = document.getElementById('cizelgelerMenu');
    if(!menu) return;
    const aciliyor = getComputedStyle(menu).display === 'none';
    menu.style.display = aciliyor ? 'flex' : 'none';
    toggleBtn.classList.toggle('open', aciliyor);
    const ok = toggleBtn.querySelector('.toggle-arrow');
    if(ok) ok.textContent = aciliyor ? '▼' : '▶';
  });
});

/* ================================================================
   KULLANICI SEÇİMİ (aktif profil) — topbar avatarına tıklayınca açılır.
   Bu modal ve topbar avatar butonu index.html'de zaten vardı ama bu
   fonksiyonlar hiç yazılmamıştı; bu yüzden butona basınca hiçbir şey
   olmuyordu ve karşılama metni her zaman sabit "Sedat Bey" yazıyordu.
   Seçim localStorage'da 'oyAktifKullaniciId' / 'oyAktifKullaniciTip'
   olarak tutulur ('ogretmen' | 'personel').
   ================================================================ */
function kullaniciSecModalAc(){
  const modal = document.getElementById('kullaniciSecModal');
  const liste = document.getElementById('kullaniciSecListe');
  if(!modal || !liste) return;

  const aktifId = localStorage.getItem('oyAktifKullaniciId') || '';
  const kisiler = [];
  (typeof ogretmenler !== 'undefined' ? ogretmenler : []).forEach(o=>{
    const ad = ((o.ad||'')+' '+(o.soyad||'')).trim();
    if(ad) kisiler.push({ id:o.id, tip:'ogretmen', ad, rol: o.unvan || o.brans || 'Öğretmen' });
  });
  (typeof personelListesi !== 'undefined' ? personelListesi : []).forEach(p=>{
    const ad = (p.ad || p.adSoyad || '').trim();
    if(ad) kisiler.push({ id:p.id, tip:'personel', ad, rol: p.gorev || 'Personel' });
  });
  kisiler.sort((a,b)=>a.ad.localeCompare(b.ad,'tr'));

  let html = `<button onclick="kullaniciSec('','')" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px 12px;border-radius:12px;border:1px solid ${!aktifId?'var(--brand)':'var(--border)'};background:${!aktifId?'var(--brand-light)':'none'};cursor:pointer;">
    <div style="width:34px;height:34px;border-radius:50%;background:var(--nm-bg);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">👤</div>
    <div style="flex:1;"><div style="font-weight:700;color:var(--ink);font-size:14px;">Genel (kişiselleştirme yok)</div></div>
    ${!aktifId ? '<span style="color:var(--brand);font-size:18px;">✓</span>' : ''}
  </button>`;

  if(!kisiler.length){
    html += '<p class="empty-state" style="margin-top:10px;">Henüz öğretmen/personel kaydı yok.</p>';
  } else {
    html += kisiler.map(k => `
      <button onclick="kullaniciSec('${k.id}','${k.tip}')" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px 12px;border-radius:12px;border:1px solid ${k.id===aktifId?'var(--brand)':'var(--border)'};background:${k.id===aktifId?'var(--brand-light)':'none'};cursor:pointer;">
        <div style="width:34px;height:34px;border-radius:50%;background:var(--brand-light);color:var(--brand);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${escapeHtml((k.ad[0]||'?').toUpperCase())}</div>
        <div style="flex:1;">
          <div style="font-weight:700;color:var(--ink);font-size:14px;">${escapeHtml(k.ad)}</div>
          <div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(k.rol)}</div>
        </div>
        ${k.id===aktifId ? '<span style="color:var(--brand);font-size:18px;">✓</span>' : ''}
      </button>`).join('');
  }

  liste.innerHTML = html;
  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function kullaniciSecModalKapat(){
  const modal = document.getElementById('kullaniciSecModal');
  if(modal) modal.style.display = 'none';
  document.body.classList.remove('modal-open');
}

function kullaniciSec(id, tip){
  if(id){
    localStorage.setItem('oyAktifKullaniciId', id);
    localStorage.setItem('oyAktifKullaniciTip', tip);
  } else {
    localStorage.removeItem('oyAktifKullaniciId');
    localStorage.removeItem('oyAktifKullaniciTip');
  }
  // "Genel (kişiselleştirme yok)" seçilse bile bu, bir SEÇİM yapıldığını
  // gösterir — bu işaret olmadan boş oyAktifKullaniciId ile "hiç
  // sorulmadı" durumu ayırt edilemez, her açılışta tekrar sorardı.
  localStorage.setItem('oyKullaniciSecimiYapildi', '1');
  aktifKullaniciyiGuncelle();
  if(typeof renderDashboard === 'function') renderDashboard();
  kullaniciSecModalKapat();
}

/* ================================================================
   DÜZELTME: Bu fonksiyon eskiden SADECE localStorage'daki elle seçilmiş
   'oyAktifKullaniciId' değerine bakıyordu. Bu değer cihaza (tarayıcıya)
   bağlıydı, Google hesabına değil — bu yüzden aynı cihazda farklı bir
   Google hesabıyla giriş yapıldığında bile önceden seçilmiş kişinin
   (ör. Sedat) adı/fotoğrafı görünmeye devam ediyordu.
   Artık öncelik gerçek giriş yapan hesaba göre belirleniyor:
     1) Yöneticinin "Kullanıcı Yönetimi"nden hesaba bağladığı öğretmen/
        personel kaydı (Bağlı Öğretmen Kaydı alanı) — bu kayıttaki
        cinsiyete göre "Bey"/"Hanım" hitabı da otomatik belirlenir.
     2) Google hesabının kendi adı/profil fotoğrafı (cinsiyet bilinmediği
        için hitap eklenmez, sadece isim gösterilir)
     3) (yalnızca yukarıdakiler yoksa) cihazda eskiden elle seçilmiş kişi
   ================================================================ */
function _hitapUret(cinsiyet){
  const c = (cinsiyet||'').toLowerCase();
  if(c === 'kadin' || c === 'kadın') return 'Hanım';
  if(c === 'erkek') return 'Bey';
  return '';
}
function _hesapKimligi(){
  let ad = '', fotoUrl = '', hitap = '';
  const bagliId = (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.bagliOgretmenId : null;
  if(bagliId){
    const o = (typeof ogretmenler !== 'undefined') ? ogretmenler.find(x=>x.id===bagliId) : null;
    if(o){ ad = ((o.ad||'')+' '+(o.soyad||'')).trim(); fotoUrl = o.profilFotoUrl || ''; hitap = _hitapUret(o.cinsiyet); }
    if(!ad){
      const p = (typeof personelListesi !== 'undefined') ? personelListesi.find(x=>x.id===bagliId) : null;
      if(p){ ad = (p.ad || p.adSoyad || '').trim(); fotoUrl = fotoUrl || p.profilFotoUrl || ''; hitap = _hitapUret(p.cinsiyet); }
    }
  }
  if(!ad && typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI){
    ad = AKTIF_KULLANICI.ad || '';
    fotoUrl = fotoUrl || AKTIF_KULLANICI.fotoUrl || '';
  }
  if(!ad){
    const id = localStorage.getItem('oyAktifKullaniciId');
    if(id){
      const o = (typeof ogretmenler !== 'undefined') ? ogretmenler.find(x=>x.id===id) : null;
      if(o){ ad = ((o.ad||'')+' '+(o.soyad||'')).trim(); fotoUrl = fotoUrl || o.profilFotoUrl || ''; hitap = hitap || _hitapUret(o.cinsiyet); }
      if(!ad){
        const p = (typeof personelListesi !== 'undefined') ? personelListesi.find(x=>x.id===id) : null;
        if(p){ ad = (p.ad || p.adSoyad || '').trim(); fotoUrl = fotoUrl || p.profilFotoUrl || ''; hitap = hitap || _hitapUret(p.cinsiyet); }
      }
    }
  }
  return { ad, fotoUrl, hitap };
}

function aktifKullaniciyiGuncelle(){
  const avatarEl = document.getElementById('topbarAvatar');
  if(!avatarEl) return;
  const { ad, fotoUrl } = _hesapKimligi();
  if(!ad){ avatarEl.innerHTML = '👤'; return; }

  if(fotoUrl){
    avatarEl.innerHTML = `<img src="${escapeHtml(fotoUrl)}" alt="Profil" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;" onerror="this.parentElement.textContent = (this.parentElement.dataset.baslar || '👤');">`;
    const basHarf = ad.split(/\s+/).map(p=>p[0]).join('').slice(0,2).toUpperCase();
    avatarEl.dataset.baslar = basHarf || '👤';
  } else {
    const bas = ad.split(/\s+/).map(p=>p[0]).join('').slice(0,2).toUpperCase();
    avatarEl.textContent = bas || '👤';
  }
}

// Uygulama açılışında (Firestore bağlanmadan önce bile) avatarı güncelle —
// localStorage'daki önbellek verisiyle veya boşsa nötr 👤 ikonuyla.
document.addEventListener('DOMContentLoaded', ()=>{
  if(typeof aktifKullaniciyiGuncelle === 'function') aktifKullaniciyiGuncelle();
});
