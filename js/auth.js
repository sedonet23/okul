/* ================================================================
   js/auth.js
   AŞAMA 3: Google girişi KALDIRILDI — Kullanıcı Adı / Şifre girişine
   geçildi. Firebase Auth'un e-posta/şifre sağlayıcısı teknik olarak
   "e-posta formatında" bir değer istediği için, kullanıcının girdiği
   basit KULLANICI ADI arka planda sahte bir e-postaya çevrilir
   (bkz. kullaniciAdiEmaileDonustur). Kullanıcı bunun farkında değildir,
   sadece kullanıcı adı+şifre görür/girer.

   Hesaplar artık Google ile KENDİLİĞİNDEN oluşmuyor — SADECE admin,
   Kullanıcı Yönetimi ekranından yeni kullanıcı adı+şifre oluşturarak
   hesap açabilir (bkz. js/core/services/kullanici-hesap.service.js).

   ŞİFRE SIFIRLAMA NOTU: Sahte e-posta kullanıldığı için Firebase'in
   yerleşik "şifremi unuttum" e-postası hiçbir yere ulaşmaz. Bu yüzden
   şifre sıfırlama admin tarafından yapılır: admin o kişi için YENİ bir
   kullanıcı adı + geçici şifre oluşturur, eski hesabı devre dışı
   bırakılır (bkz. adminYeniGirisBilgisiOlustur). Aynı kullanıcı adıyla
   devam edilemez ama öğretmen kaydı/verileri hiç etkilenmez.

   İLK ADMİN HESABINI OLUŞTURMA (tek seferlik, elle yapılır):
   1) Firebase Console > Authentication > Users > "Add user".
      E-posta alanına: kullaniciadi@korukokuluportal.com gibi bir değer
      (kullanacağınız kullanıcı adı + @korukokuluportal.com) ve bir şifre girin.
   2) Firebase Console > Firestore Database > oy_kullanicilar koleksiyonuna
      git, YENİ bir belge oluştur — belge ID'si = Authentication'da oluşan
      UID (Users listesinde görünür). İçeriği:
        { uid: "<UID>", email: "kullaniciadi@korukokuluportal.com",
          kullaniciAdi: "kullaniciadi", ad: "Adınız Soyadınız",
          admin: true, aktif: true, yetkiler: {} }
   3) Uygulamayı açıp bu kullanıcı adı/şifre ile giriş yapın.
   ================================================================ */

const KULLANICI_ADI_DOMAIN = 'korukokuluportal.com';

let AKTIF_KULLANICI = null; // { uid, email, kullaniciAdi, ad, admin, aktif, rolId, bagliOgretmenId }
let AKTIF_ROL = null;       // { id, ad, kullaniciYonetimi, yetkiler:{modul:'gizle'|'goruntule'|'duzenle'} }

/* Basit kullanıcı adını Firebase'in kabul ettiği e-posta formatına çevirir.
   Sadece harf/rakam/nokta/tire/alt çizgi bırakılır, Türkçe karakterler
   sadeleştirilir, küçük harfe çevrilir. */
function kullaniciAdiEmaileDonustur(kullaniciAdi){
  const sade = (kullaniciAdi||'').trim().toLocaleLowerCase('tr')
    .replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9._-]/g,'');
  return `${sade}@${KULLANICI_ADI_DOMAIN}`;
}

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

function _girisHatasiGoster(mesaj){
  const el = document.getElementById('girisHataMetni');
  if(!el) return;
  el.textContent = mesaj;
  el.style.display = mesaj ? '' : 'none';
}

function girisFormGonder(e){
  if(e) e.preventDefault();
  if(!auth){ _girisHatasiGoster('Firebase henüz hazır değil, lütfen sayfayı yenileyin.'); return; }
  const kullaniciAdi = document.getElementById('girisKullaniciAdi').value.trim();
  const sifre = document.getElementById('girisSifre').value;
  if(!kullaniciAdi || !sifre){ _girisHatasiGoster('Kullanıcı adı ve şifre zorunludur.'); return; }

  const btn = document.getElementById('girisBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'Giriş yapılıyor…'; }
  _girisHatasiGoster('');

  const email = kullaniciAdiEmaileDonustur(kullaniciAdi);
  auth.signInWithEmailAndPassword(email, sifre)
    .catch(err=>{
      console.error('Giriş hatası:', err);
      const kod = err && err.code;
      let mesaj = 'Giriş yapılamadı. Lütfen tekrar deneyin.';
      if(kod === 'auth/user-not-found' || kod === 'auth/wrong-password' || kod === 'auth/invalid-credential'){
        mesaj = 'Kullanıcı adı veya şifre hatalı.';
      } else if(kod === 'auth/too-many-requests'){
        mesaj = 'Çok fazla hatalı deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.';
      } else if(kod === 'auth/user-disabled'){
        mesaj = 'Bu hesap devre dışı bırakılmış. Yöneticinizle iletişime geçin.';
      }
      _girisHatasiGoster(mesaj);
    })
    .finally(()=>{
      if(btn){ btn.disabled = false; btn.textContent = 'Giriş Yap'; }
    });
}

function cikisYap(){
  // YENİ: Eskiden sadece AKTIF_KULLANICI=null + signOut() yapılıyordu — ama
  // uygulama boyunca açılan onlarca Firestore dinleyicisi (onSnapshot) hiç
  // kapatılmıyordu. Sonuç: (1) çıkış sonrası bu dinleyiciler hâlâ açık kalıp
  // sunucudan cevap almaya çalışınca "Missing or insufficient permissions"
  // hatası fırlatıyordu (oturum artık yok); (2) yeni kullanıcı girişinde
  // eski dinleyiciler/render edilmiş ekranlar temizlenmediği için önceki
  // kullanıcının verisi bir süre görünmeye devam ediyordu. Tüm dinleyicileri
  // tek tek bulup kapatmak yerine (bu kod tabanında onlarca farklı yerde
  // açılıyorlar), TAM SAYFA YENİLEMESİ ile aynı sonucu garanti ediyoruz —
  // "yenileyince düzeliyor" gözleminin doğruladığı gibi, sayfa yeniden
  // yüklenince tüm dinleyiciler ve durum sıfırdan, temiz kuruluyor.
  if(auth){
    auth.signOut().finally(() => { window.location.reload(); });
  } else {
    window.location.reload();
  }
}

/* ================================================================
   ADMİN: Yeni kullanıcı adı/şifre oluşturma (ikincil Firebase App
   örneği ile — asıl admin oturumunu ETKİLEMEZ). Firebase Auth client
   SDK'sının bilinen bir kısıtlaması: createUserWithEmailAndPassword()
   çağıran oturumu otomatik olarak yeni kullanıcıya geçirir. Bunu
   önlemek için AYRI, geçici bir Firebase App örneği kullanılır.
   ================================================================ */
function _yardimciAuthAl(){
  if(!window._yardimciFirebaseApp){
    window._yardimciFirebaseApp = firebase.initializeApp(firebaseConfig, 'yardimciOturum_' + Date.now());
  }
  return window._yardimciFirebaseApp.auth();
}

/* kullaniciAdi+sifre ile YENİ bir Firebase Auth hesabı ve eşleşen
   oy_kullanicilar belgesi oluşturur. Admin'in mevcut oturumunu etkilemez.
   ekBilgiler: { ad, rolId, bagliOgretmenId, admin } */
async function adminYeniKullaniciOlustur(kullaniciAdi, sifre, ekBilgiler){
  ekBilgiler = ekBilgiler || {};
  const email = kullaniciAdiEmaileDonustur(kullaniciAdi);
  const yardimciAuth = _yardimciAuthAl();
  const cred = await yardimciAuth.createUserWithEmailAndPassword(email, sifre);
  const uid = cred.user.uid;
  const belge = {
    uid, email, kullaniciAdi,
    ad: ekBilgiler.ad || kullaniciAdi,
    admin: !!ekBilgiler.admin,
    aktif: true,
    rolId: ekBilgiler.rolId || null,
    bagliOgretmenId: ekBilgiler.bagliOgretmenId || null,
    yetkiler: {},
    olusturmaTarihi: firebase.firestore.FieldValue.serverTimestamp()
  };
  await db.collection(COL.kullanicilar).doc(uid).set(belge);
  await yardimciAuth.signOut();
  return { uid, email };
}

/* "Şifre sıfırlama" (basit yol — bkz. dosya başındaki not): Eski
   hesabı devre dışı bırakır (aktif:false), aynı kişi için YENİ bir
   kullanıcı adı+şifre ile hesap oluşturur, aynı role/öğretmen kaydına
   bağlar. Kullanıcı adı değişir ama tüm veriler (rol, bağlı öğretmen)
   korunur. */
async function adminSifreSifirlaYeniHesapla(eskiKullaniciBelgesi, yeniKullaniciAdi, yeniSifre){
  await db.collection(COL.kullanicilar).doc(eskiKullaniciBelgesi.id).update({ aktif:false, sifreSifirlandiEskiHesap:true });
  return adminYeniKullaniciOlustur(yeniKullaniciAdi, yeniSifre, {
    ad: eskiKullaniciBelgesi.ad,
    rolId: eskiKullaniciBelgesi.rolId,
    bagliOgretmenId: eskiKullaniciBelgesi.bagliOgretmenId,
    admin: eskiKullaniciBelgesi.admin
  });
}

/* ================================================================
   KENDİ ŞİFRESİNİ DEĞİŞTİRME (herkes kendi hesabında yapabilir)
   ================================================================ */
async function kendiSifremiDegistir(mevcutSifre, yeniSifre){
  const user = auth.currentUser;
  if(!user) throw new Error('oturum-yok');
  const cred = firebase.auth.EmailAuthProvider.credential(user.email, mevcutSifre);
  await user.reauthenticateWithCredential(cred);
  await user.updatePassword(yeniSifre);
}

function sidebarHesapGuncelle(user){
  const kutu = document.getElementById('sidebarHesap');
  if(!kutu) return;
  if(!user){ kutu.style.display = 'none'; return; }
  kutu.style.display = 'flex';
  const avatar = document.getElementById('hesapAvatar');
  const ad = document.getElementById('hesapAd');
  const email = document.getElementById('hesapEmail');
  // Hesaba bağlı öğretmen kaydı varsa adının/fotoğrafının yerine ONUN
  // adı ve fotoğrafı gösterilir.
  const bagliVarMi = !!(AKTIF_KULLANICI && AKTIF_KULLANICI.bagliOgretmenId);
  const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
  // DÜZELTME: Bağlı bir öğretmen kaydı VARSA ama ogretmenler dizisi henüz
  // yüklenmediyse (ben===null geçici olarak), isim/fotoğrafa GEÇİCİ OLARAK
  // düşülmez — veri henüz yoksa mevcut görünüm korunur.
  const ogretmenlerYuklendiMi = typeof ogretmenler !== 'undefined' && ogretmenler.length > 0;
  if(bagliVarMi && !ben && !ogretmenlerYuklendiMi) return;
  if(avatar) avatar.src = (ben && ben.profilFotoUrl) || 'assets/icon-192.png';
  if(ad) ad.textContent = ben ? `${ben.ad||''} ${ben.soyad||''}`.trim() : (AKTIF_KULLANICI?.ad || AKTIF_KULLANICI?.kullaniciAdi || 'Kullanıcı');
  if(email) email.textContent = AKTIF_KULLANICI?.kullaniciAdi ? '@'+AKTIF_KULLANICI.kullaniciAdi : (user.email || '');
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
        // DÜZELTME: Artık hesaplar kendiliğinden oluşmuyor (Google girişi
        // kaldırıldı) — bu duruma sadece admin'in Kullanıcı Yönetimi'nden
        // OLUŞTURMAYI UNUTTUĞU bir hesapla giriş denendiğinde düşülür.
        console.error('Bu hesap için oy_kullanicilar belgesi bulunamadı:', user.uid);
        alert('Hesabınız için gerekli kayıt bulunamadı. Lütfen yöneticinizle iletişime geçin.');
        auth.signOut();
        return;
      }
      AKTIF_KULLANICI = { id: snap.id, ...snap.data() };

      sidebarHesapGuncelle(user);

      // Hesaba bağlı tema rengi tercihini geri yükle (tarayıcı verileri
      // silinmiş olsa bile) — kaydet=false: bu sadece Firestore'dan okunan
      // değeri UYGULAMAK içindir, tekrar Firestore'a yazmaz.
      if(typeof renkUygula === 'function'){
        try{
          const tercihSnap = await db.collection('oy_kullaniciTercihleri').doc(user.uid).get();
          if(tercihSnap.exists && tercihSnap.data().renkPaketi) renkUygula(tercihSnap.data().renkPaketi, false);
        }catch(e){ console.warn('Renk tercihi okunamadı:', e); }
      }

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

      // Bağlı öğretmen kaydı varsa, eski "aktif kullanıcı" mekanizmasını
      // (localStorage) otomatik doldur — dashboard selamlaması, topbar
      // avatarı ve isim gösterimi kendiliğinden bu öğretmene göre şekillenir.
      if(AKTIF_KULLANICI.bagliOgretmenId){
        localStorage.setItem('oyAktifKullaniciId', AKTIF_KULLANICI.bagliOgretmenId);
        localStorage.setItem('oyAktifKullaniciTip', 'ogretmen');
        localStorage.setItem('oyKullaniciSecimiYapildi', '1');
        if(typeof aktifKullaniciyiGuncelle === 'function') aktifKullaniciyiGuncelle();
      }
      if(typeof kullaniciYonetimiYetkisiVar === 'function' && kullaniciYonetimiYetkisiVar()
         && typeof kullaniciYonetimiDinleyiciKur === 'function') kullaniciYonetimiDinleyiciKur();

      onayBekleniyorGizle();
      girisEkraniGizle();
      const app = document.getElementById('app');
      if(app) app.classList.add('ready','show');
      if(typeof IstatistikService !== 'undefined') IstatistikService.girisKaydet();
      if(typeof uygulamaBaslat === 'function') uygulamaBaslat();

    }catch(err){
      console.error('Kullanıcı belgesi kontrol edilemedi:', err);
      alert('Hesap bilgileri okunamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.\n\n' + (err.message || ''));
      auth.signOut();
    }
  });
}

async function sifremiDegistirTikla(){
  const mevcut = document.getElementById('fSpMevcutSifre').value;
  const yeni = document.getElementById('fSpYeniSifre').value;
  const tekrar = document.getElementById('fSpYeniSifreTekrar').value;
  if(!mevcut || !yeni){ toast('Tüm alanları doldurun.'); return; }
  if(yeni.length < 6){ toast('Yeni şifre en az 6 karakter olmalıdır.'); return; }
  if(yeni !== tekrar){ toast('Yeni şifreler eşleşmiyor.'); return; }
  try{
    await kendiSifremiDegistir(mevcut, yeni);
    toast('Şifreniz güncellendi.');
    document.getElementById('fSpMevcutSifre').value = '';
    document.getElementById('fSpYeniSifre').value = '';
    document.getElementById('fSpYeniSifreTekrar').value = '';
  }catch(err){
    console.error(err);
    let mesaj = 'Şifre değiştirilemedi: ' + err.message;
    if(err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') mesaj = 'Mevcut şifreniz hatalı.';
    if(err.code === 'auth/weak-password') mesaj = 'Yeni şifre çok zayıf, en az 6 karakter olmalı.';
    toast(mesaj);
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('hesapCikisBtn')?.addEventListener('click', ()=>{
    if(confirm('Hesabınızdan çıkış yapmak istediğinize emin misiniz?')) cikisYap();
  });
});
