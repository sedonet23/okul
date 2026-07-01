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
    // YENİ: localStorage'daki aktif kullanıcıyı oku (ogretmenler henüz yüklenmemiş olabilir, sadece id var)
    const kullaniciAdi = (function(){
      const id = localStorage.getItem('oyAktifKullaniciId');
      if(!id) return 'Sedat Bey';
      const o = (typeof ogretmenler !== 'undefined') ? ogretmenler.find(x=>x.id===id) : null;
      if(o) return (o.ad||'').split(' ')[0] + ' Bey';
      const p = (typeof personelListesi !== 'undefined') ? personelListesi.find(x=>x.id===id) : null;
      if(p) return ((p.ad||p.adSoyad||'').split(' ')[0]) + ' Bey';
      return 'Sedat Bey';
    })();
    el.textContent = selam + ', ' + kullaniciAdi + ' 👋';
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
  aktifKullaniciyiGuncelle();
  if(typeof renderDashboard === 'function') renderDashboard();
  kullaniciSecModalKapat();
}

function aktifKullaniciyiGuncelle(){
  const avatarEl = document.getElementById('topbarAvatar');
  if(!avatarEl) return;
  const id = localStorage.getItem('oyAktifKullaniciId');
  if(!id){ avatarEl.textContent = '👤'; return; }
  let ad = '';
  const o = (typeof ogretmenler !== 'undefined') ? ogretmenler.find(x=>x.id===id) : null;
  if(o) ad = ((o.ad||'')+' '+(o.soyad||'')).trim();
  if(!ad){
    const p = (typeof personelListesi !== 'undefined') ? personelListesi.find(x=>x.id===id) : null;
    if(p) ad = (p.ad || p.adSoyad || '').trim();
  }
  if(!ad){ avatarEl.textContent = '👤'; return; }
  const bas = ad.split(/\s+/).map(p=>p[0]).join('').slice(0,2).toUpperCase();
  avatarEl.textContent = bas || '👤';
}

// Uygulama açılışında (Firestore bağlanmadan önce bile) avatarı güncelle —
// localStorage'daki önbellek verisiyle veya boşsa nötr 👤 ikonuyla.
document.addEventListener('DOMContentLoaded', ()=>{
  if(typeof aktifKullaniciyiGuncelle === 'function') aktifKullaniciyiGuncelle();
});
