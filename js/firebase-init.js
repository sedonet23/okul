/* ====================================================================
   FIREBASE YAPILANDIRMASI
   Bu bilgileri Firebase Console > Proje Ayarları > Genel sekmesinden,
   "Web uygulaması" eklediğinizde size verilen değerlerle doldurun.
   Bu değerler (apiKey dahil) GİZLİ DEĞİLDİR — güvenlik Firestore
   Kuralları (firestore.rules) ve giriş ekranı ile sağlanır, bu yüzden
   bu dosyayı GitHub'a (genel depoda olsa bile) göndermekte sorun yoktur.
   ==================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyCxLLlLCA0Deu7dcQchUWeY5cR5ur5FSkc",
  authDomain: "okul-6e302.firebaseapp.com",
  projectId: "okul-6e302",
  storageBucket: "okul-6e302.firebasestorage.app",
  messagingSenderId: "738103486583",
  appId: "1:738103486583:web:da91129b1a08f2463efe72"
};

// Firebase Console > Proje Ayarları > Cloud Messaging > Web yapılandırması
// (Web push sertifikaları) bölümünden alacağınız genel (public) anahtar.
const VAPID_KEY = "BATuvupnzSActFxWlfg12dtT-hYMIkND9S_lfA1B-FYHIwJ0aya0HHJ4fRRfifZ5PlKETpRLnnugzOz5zjgi3u4";

const COL = {
  ogretmenler:'oy_ogretmenler',
  dersProgrami:'oy_dersProgrami',
  nobet:'oy_nobetProgrami',
  hatirlaticilar:'oy_hatirlaticilar',
  gorevler:'oy_gorevler',
  evrak:'oy_evrakTakibi',
  notlar:'oy_notlar',
  cihazlar:'oy_cihazTokenleri',
  sosyalKulupler:'oy_sosyalKulupler',
  belirliGunler:'oy_belirliGunler',
  zumre:'oy_zumre',
  sok:'oy_sok',
  bepPlani:'oy_bepPlani',
  rehberlik:'oy_rehberlik',
  maarifRapor:'oy_maarifRapor',
  digerEvrak:'oy_digerEvrak'
};

let db = null;
let auth = null;
let messaging = null;
let firebaseHazir = false;

function yapilandirmaEksikMi(){
  return firebaseConfig.apiKey === "BURAYA_API_KEY";
}

function firebaseyiBaslat(){
  if(yapilandirmaEksikMi()){
    document.getElementById('configWarning').classList.add('active');
    return false;
  }
  try{
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    firebaseHazir = true;
    try{
      if(firebase.messaging.isSupported()) messaging = firebase.messaging();
    }catch(e){ console.warn('Bu tarayıcı push bildirimlerini desteklemiyor.', e); }
    return true;
  }catch(e){
    console.error(e);
    document.getElementById('configWarning').classList.add('active');
    return false;
  }
}
