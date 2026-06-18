/* ====================================================================
   GİRİŞ / ÇIKIŞ — Devre dışı bırakıldı, uygulama herkese açık
   ==================================================================== */

function girisEkraniGoster(){
  // Devre dışı
}

function girisEkraniGizle(){
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').style.display = 'flex';
  document.getElementById('app').classList.add('ready');
}

function girisYap(e){
  if(e) e.preventDefault();
}

function cikisYap(){
  // Devre dışı
}

function authDinleyiciKur(){
  girisEkraniGizle();
  if(typeof uygulamaBaslat === 'function') uygulamaBaslat();
}
