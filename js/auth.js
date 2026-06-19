/* ================================================================
   js/auth.js
   GİRİŞ EKRANI KALDIRILDI — uygulama artık oturum açma gerektirmeden
   doğrudan çalışır. Firestore kuralları da "allow read, write: if true"
   olarak açıldı (bkz. firestore.rules). Bu fonksiyonlar geriye dönük
   uyumluluk için boş/no-op bırakıldı; index.html'de login formu yok.
   ================================================================ */

function girisEkraniGoster(){ /* no-op: login ekranı kaldırıldı */ }
function girisEkraniGizle(){
  const app = document.getElementById('app');
  if(app) app.classList.add('ready','show');
}
function girisYap(e){ if(e) e.preventDefault(); }
function cikisYap(){ /* no-op: girişsiz modda çıkış işlemi yok */ }

function authDinleyiciKur(){
  // Oturum kontrolü yapılmadan uygulama doğrudan başlatılır.
  girisEkraniGizle();
  if(typeof uygulamaBaslat === 'function') uygulamaBaslat();
}
