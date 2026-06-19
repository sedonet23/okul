/* ================================================================
   GİRİŞ / ÇIKIŞ — DEVRE DIŞI
   Uygulama herkese açık çalışıyor.
   ================================================================ */

function girisEkraniGoster(){ }

function girisEkraniGizle(){
  const ls = document.getElementById('loginScreen');
  if(ls) ls.style.display = 'none';
  const app = document.getElementById('app');
  if(app){ app.style.display = 'flex'; app.classList.add('ready','show'); }
}

function girisYap(e){ if(e) e.preventDefault(); }

function cikisYap(){ }

function authDinleyiciKur(){
  girisEkraniGizle();
  if(typeof uygulamaBaslat === 'function') uygulamaBaslat();
}
