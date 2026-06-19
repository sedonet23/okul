/* ================================================================
   GİRİŞ / ÇIKIŞ
   ================================================================ */

function girisEkraniGoster(){
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('app').classList.remove('ready');
  document.getElementById('app').style.display = 'none';
}

function girisEkraniGizle(){
  document.getElementById('loginScreen').classList.add('hidden');
  const appEl = document.getElementById('app');
  appEl.style.display = '';       // CSS'e bırak
  appEl.classList.add('ready');   // eski CSS: #app.ready { display:flex }
  appEl.style.cssText = appEl.style.cssText; // force reflow
}

function girisYap(e){
  e.preventDefault();
  const epostaEl = document.getElementById('loginEposta');
  const sifreEl  = document.getElementById('loginSifre');
  const hataEl   = document.getElementById('loginHata');
  hataEl.classList.remove('show');

  auth.signInWithEmailAndPassword(epostaEl.value.trim(), sifreEl.value)
    .catch(err => {
      hataEl.textContent = 'Giriş başarısız: e-posta veya şifre hatalı.';
      hataEl.classList.add('show');
      console.error(err);
    });
}

function cikisYap(){
  auth.signOut();
}

function authDinleyiciKur(){
  auth.onAuthStateChanged(kullanici => {
    if(kullanici){
      girisEkraniGizle();
      if(typeof uygulamaBaslat === 'function') uygulamaBaslat();
    } else {
      girisEkraniGoster();
    }
  });
}
