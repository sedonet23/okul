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

function menuDaralt(){ document.body.classList.toggle('nav-collapsed'); }
function menuAcKapat(){ document.body.classList.toggle('nav-open'); }
function menuKapat(){ document.body.classList.remove('nav-open'); }

/* ---------- accordion (Ayarlar > Ders Saatleri, v4.0.1) FIX ---------- */
function toggleAccordion(headerEl){
  const content = headerEl.nextElementSibling;
  if(!content) return;
  
  const aciliyor = !headerEl.classList.contains('open');
  
  if(aciliyor){
    // AÇILIYOR: max-height'ı scrollHeight'ı set et
    content.style.maxHeight = content.scrollHeight + 'px';
    headerEl.classList.add('open');
    content.classList.add('open');
  } else {
    // KAPANIYOR: max-height'ı 0 yap (CSS transition ile animate)
    content.style.maxHeight = '0';
    headerEl.classList.remove('open');
    content.classList.remove('open');
  }
  
  // Animasyon bitince max-height'ı temizle
  const onTransitionEnd = ()=>{
    if(aciliyor){
      content.style.maxHeight = 'none';
    }
    content.removeEventListener('transitionend', onTransitionEnd);
  };
  content.addEventListener('transitionend', onTransitionEnd);
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
