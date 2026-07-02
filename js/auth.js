/* ================================================================
   js/auth.js
   AŞAMA 1: Google ile giriş + admin onaylı çok kullanıcılı erişim.

   Kullanıcı belgeleri Firestore'da COL.kullanicilar (oy_kullanicilar)
   altında tutulur:
     { uid, email, ad, fotoUrl, admin:false, aktif:false, yetkiler:{} }

   İlk girişte kullanıcı belgesi otomatik "aktif:false" ile oluşturulur.
   Admin, Firebase Console > Firestore'dan (ya da ileride eklenecek
   Kullanıcı Yönetimi ekranından) bu alanı true yapmadan kullanıcı
   uygulamaya giremez — bkz. firestore.rules.

   İLK ADMİN HESABINI AKTİF ETME (tek seferlik, elle yapılır):
   1) Bu haliyle siteye girip Google ile bir kez giriş yap.
      ("Hesap Onayı Bekleniyor" ekranı gelecek, normaldir.)
   2) Firebase Console > Firestore Database > oy_kullanicilar koleksiyonuna git.
   3) Kendi e-postana ait belgeyi bul, aktif alanını true, admin alanını
      true yap.
   4) Sayfayı yenile — artık admin olarak giriş yapmış olacaksın.
   ================================================================ */

let AKTIF_KULLANICI = null; // { uid, email, ad, fotoUrl, admin, aktif, rolId, bagliOgretmenId }
let AKTIF_ROL = null;       // { id, ad, kullaniciYonetimi, yetkiler:{modul:'gizle'|'goruntule'|'duzenle'} }

function girisEkraniGoster(){
  document.getElementById('girisEkrani')?.classList.add('active');
  document.getElementById('onayBekleniyorEkrani')?.classList.remove('active');
  const app = document.getElementById('app');
  if(app) app.classList.remove('ready','show');
}
function girisEkraniGizle(){
  document.getElementById('girisEkrani')?.classList.remove('active');
}
function onayBekleniyorGoster(){
  document.getElementById('onayBekleniyorEkrani')?.classList.add('active');
  document.getElementById('girisEkrani')?.classList.remove('active');
  const app = document.getElementById('app');
  if(app) app.classList.remove('ready','show');
}
function onayBekleniyorGizle(){
  document.getElementById('onayBekleniyorEkrani')?.classList.remove('active');
}

function googleIleGirisYap(){
  if(!auth){ alert('Firebase henüz hazır değil, lütfen sayfayı yenileyin.'); return; }
  const saglayici = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(saglayici).catch(err=>{
    console.error('Google giriş hatası:', err);
    if(err.code !== 'auth/popup-closed-by-user'){
      alert('Giriş yapılamadı: ' + (err.message || err.code));
    }
  });
}

function girisYap(e){ if(e) e.preventDefault(); googleIleGirisYap(); }

function cikisYap(){
  AKTIF_KULLANICI = null;
  if(auth) auth.signOut();
}

function sidebarHesapGuncelle(user){
  const kutu = document.getElementById('sidebarHesap');
  if(!kutu) return;
  if(!user){ kutu.style.display = 'none'; return; }
  kutu.style.display = 'flex';
  const avatar = document.getElementById('hesapAvatar');
  const ad = document.getElementById('hesapAd');
  const email = document.getElementById('hesapEmail');
  if(avatar) avatar.src = user.photoURL || 'assets/icon-192.png';
  if(ad) ad.textContent = user.displayName || 'Kullanıcı';
  if(email) email.textContent = user.email || '';
}

function authDinleyiciKur(){
  if(!auth){ girisEkraniGoster(); return; }
  auth.onAuthStateChanged(async (user) => {
    if(!user){
      sidebarHesapGuncelle(null);
      AKTIF_KULLANICI = null;
      girisEkraniGoster();
      return;
    }
    try{
      const ref = db.collection(COL.kullanicilar).doc(user.uid);
      const snap = await ref.get();
      if(!snap.exists){
        const yeniBelge = {
          uid: user.uid,
          email: user.email || '',
          ad: user.displayName || '',
          fotoUrl: user.photoURL || '',
          admin: false,
          aktif: false,
          yetkiler: {},
          olusturmaTarihi: firebase.firestore.FieldValue.serverTimestamp()
        };
        await ref.set(yeniBelge);
        AKTIF_KULLANICI = yeniBelge;
      } else {
        AKTIF_KULLANICI = snap.data();
      }

      sidebarHesapGuncelle(user);

      if(!AKTIF_KULLANICI.aktif){
        onayBekleniyorGoster();
        return;
      }

      // Kullanıcının rolünü oku (varsa) — sidebar ve modül yetkileri buna göre ayarlanır.
      AKTIF_ROL = null;
      if(AKTIF_KULLANICI.rolId){
        try{
          const rolSnap = await db.collection(COL.roller).doc(AKTIF_KULLANICI.rolId).get();
          if(rolSnap.exists) AKTIF_ROL = { id: rolSnap.id, ...rolSnap.data() };
        }catch(e){ console.warn('Rol okunamadı:', e); }
      }
      if(typeof sidebarYetkiUygula === 'function') sidebarYetkiUygula();
      if(typeof kullaniciYonetimiYetkisiVar === 'function' && kullaniciYonetimiYetkisiVar()
         && typeof kullaniciYonetimiDinleyiciKur === 'function') kullaniciYonetimiDinleyiciKur();

      onayBekleniyorGizle();
      girisEkraniGizle();
      const app = document.getElementById('app');
      if(app) app.classList.add('ready','show');
      if(typeof uygulamaBaslat === 'function') uygulamaBaslat();

    }catch(err){
      console.error('Kullanıcı belgesi kontrol edilemedi:', err);
      alert('Hesap bilgileri okunamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.\n\n' + (err.message || ''));
      auth.signOut();
    }
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('hesapCikisBtn')?.addEventListener('click', ()=>{
    if(confirm('Hesabınızdan çıkış yapmak istediğinize emin misiniz?')) cikisYap();
  });
});
