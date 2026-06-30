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
