/* ================================================================
   GİRİŞ / ÇIKIŞ
   ================================================================ */

function girisEkraniGoster(){
  document.getElementById('loginScreen').classList.remove('hidden');
}

function girisEkraniGizle(){
  document.getElementById('loginScreen').classList.add('hidden');
  const appEl = document.getElementById('app');
  appEl.classList.add('ready');
}

function girisYap(e){
  e.preventDefault();
  const epostaEl = document.getElementById('loginEposta');
  const sifreEl  = document.getElementById('loginSifre');
  const hataEl   = document.getElementById('loginHata');
  const btn      = e.target.querySelector('button[type=submit]');
  
  hataEl.classList.remove('show');
  if(btn) btn.disabled = true;

  if(!auth){
    hataEl.textContent = 'Firebase bağlantısı kurulamadı. Sayfayı yenileyip tekrar deneyin.';
    hataEl.classList.add('show');
    if(btn) btn.disabled = false;
    return;
  }

  auth.signInWithEmailAndPassword(epostaEl.value.trim(), sifreEl.value)
    .then(() => {
      if(btn) btn.disabled = false;
    })
    .catch(err => {
      const mesajlar = {
        'auth/user-not-found':    'Bu e-posta ile kayıtlı kullanıcı bulunamadı.',
        'auth/wrong-password':    'Şifre hatalı.',
        'auth/invalid-email':     'Geçersiz e-posta adresi.',
        'auth/too-many-requests': 'Çok fazla başarısız deneme. Lütfen bekleyin.',
        'auth/invalid-credential':'E-posta veya şifre hatalı.',
      };
      hataEl.textContent = mesajlar[err.code] || ('Hata: ' + err.code);
      hataEl.classList.add('show');
      console.error('Auth hatası:', err.code, err.message);
      if(btn) btn.disabled = false;
    });
}

function cikisYap(){
  if(auth) auth.signOut();
}

function authDinleyiciKur(){
  if(!auth) return;
  auth.onAuthStateChanged(kullanici => {
    if(kullanici){
      girisEkraniGizle();
      if(typeof uygulamaBaslat === 'function') uygulamaBaslat();
    } else {
      girisEkraniGoster();
    }
  });
}
