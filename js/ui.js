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

/* ---------- accordion (Ayarlar > Ders Saatleri, v4.0) ---------- */
function toggleAccordion(headerEl){
  const content = headerEl.nextElementSibling;
  const aciliyor = !headerEl.classList.contains('open');
  headerEl.classList.toggle('open', aciliyor);
  if(content) content.classList.toggle('open', aciliyor);
}

document.addEventListener('DOMContentLoaded', ()=>{
  temaUygula(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  const temaBtn1 = document.getElementById('temaDugmesi');
  const temaBtn2 = document.getElementById('temaDugmesiTopbar');
  if(temaBtn1) temaBtn1.addEventListener('click', temaDegistir);
  if(temaBtn2) temaBtn2.addEventListener('click', temaDegistir);

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

  /* ---------- Çizelgeler açılır menüsü (sol menü) ---------- */
  const cizelgelerToggle = document.getElementById('cizelgelerToggle');
  const cizelgelerMenu = document.getElementById('cizelgelerMenu');
  if(cizelgelerToggle && cizelgelerMenu){
    cizelgelerToggle.addEventListener('click', ()=>{
      const aciliyor = cizelgelerMenu.style.display === 'none';
      cizelgelerMenu.style.display = aciliyor ? 'block' : 'none';
      cizelgelerToggle.classList.toggle('open', aciliyor);
      const ok = cizelgelerToggle.querySelector('.toggle-arrow');
      if(ok) ok.textContent = aciliyor ? '▼' : '▶';
    });
  }
});
