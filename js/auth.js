/* ====================================================================
   GİRİŞ / ÇIKIŞ — Devre dışı bırakıldı, uygulama herkese açık
   ==================================================================== */

function girisEkraniGoster(){
  // Giriş ekranı devre dışı
}
function girisEkraniGizle(){
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.add('ready');
}

function girisYap(e){
  if(e) e.preventDefault();
}

function cikisYap(){
  // Devre dışı
}

function authDinleyiciKur(){
  // Giriş atlanıyor, uygulama direkt başlatılıyor
  girisEkraniGizle();
  uygulamaBaslat();
}
