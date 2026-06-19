/* ====================================================================
   GİRİŞ / ÇIKIŞ
   Tek yönetici hesabı kullanılır. Bu hesabı Firebase Console >
   Authentication > Users sekmesinden elle oluşturmanız gerekir
   (e-posta + şifre ile "Add user").
   ==================================================================== */

function girisEkraniGoster(){
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('app').classList.remove('ready');
}
function girisEkraniGizle(){
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.add('ready');
}

function girisYap(e){
  e.preventDefault();
  const epostaEl = document.getElementById('loginEposta');
  const sifreEl = document.getElementById('loginSifre');
  const hataEl = document.getElementById('loginHata');
  hataEl.classList.remove('show');
  auth.signInWithEmailAndPassword(epostaEl.value.trim(), sifreEl.value)
    .catch(err=>{
      hataEl.textContent = 'Giriş başarısız: e-posta veya şifre hatalı.';
      hataEl.classList.add('show');
      console.error(err);
    });
}

function cikisYap(){
  auth.signOut();
}

function authDinleyiciKur(){
  auth.onAuthStateChanged(kullanici=>{
    if(kullanici){
      girisEkraniGizle();
      uygulamaBaslat();
    } else {
      girisEkraniGoster();
    }
  });
}
