/* ====================================================================
   FIREBASE YAPILANDIRMASI
   Bu bilgileri Firebase Console > Proje Ayarları > Genel sekmesinden,
   "Web uygulaması" eklediğinizde size verilen değerlerle doldurun.
   Bu değerler (apiKey dahil) GİZLİ DEĞİLDİR — güvenlik Firestore
   Kuralları (firestore.rules) ve giriş ekranı ile sağlanır, bu yüzden
   bu dosyayı GitHub'a (genel depoda olsa bile) göndermekte sorun yoktur.
   ==================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyDJUE-Guw0JD04xXMHPnQURtLXG91H9pCI",
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
  digerEvrak:'oy_digerEvrak',
  // --- YENİ: Nöbet modülü + Periyodik İşler + Ders Saatleri ---
  nobetYerleri:'oy_nobetYerleri',       // {ad, sira}
  nobetAtamalari:'oy_nobetAtamalari',   // {tarih:'YYYY-MM-DD', yerId, ogretmenAdi}
  nobetciAmirleri:'oy_nobetciAmirleri', // {tarih:'YYYY-MM-DD', ad, telefon}
  resmiTatiller:'oy_resmiTatiller',     // {tarih:'YYYY-MM-DD', aciklama}
  periyodikIsler:'oy_periyodikIsler',   // {isAdi, baslangic, bitis, tamamlandi, not, bildirimGonderildi}
  dersSaatleri:'oy_dersSaatleri',       // tek doküman (id:'ayarlar'): {dersler:[{baslangic,bitis}], ogleArasindanSonraDers, ogleArasiSuresi}
  // --- YENİ: Sınıflar modülü ---
  siniflar:'oy_siniflar',               // {ad, seviye, sube, ogrenciSayisi, kizSayisi, erkekSayisi, sinifOgretmeniId, derslik, notlar}
  veliler:'oy_veliler',                 // {sinifId, ogrenciAdi, veliAdi, telefon, not}
  // --- YENİ: Taşıma modülü (v4.0) ---
  servisler:'oy_servisler',             // {servisAdi, guzergah, soforAdi, soforTelefon, ogrenciSayisi, durum:'Aktif'|'Pasif', notlar}
  // --- YENİ: Periyodik İşler aylık şablonu (v4.0) ---
  periyodikSablon:'oy_periyodikSablon', // tek doküman (id:'sablon'): {gorevler:[{isAdi, baslangicGun, bitisGun}]}
  // --- YENİ: Okul Bilgileri (v4.0) ---
  okulBilgileri:'oy_okulBilgileri'      // tek doküman (id:'ayarlar'): {okulAdi, mudurId}
                                         // NOT: Müdür Yardımcıları için ayrı koleksiyon YOK — bilinçli tasarım kararı:
                                         // "Müdür Yardımcısı" zaten oy_ogretmenler içinde bir ünvan seçeneğidir (bkz. app.js OGRETMEN_UNVANLARI).
                                         // Aynı kişi için iki ayrı kayıt (öğretmen + MY) tutmak veri tekrarına ve
                                         // senkron sorunlarına yol açar; bu yüzden MY listesi öğretmenler içinden
                                         // unvan==='Müdür Yardımcısı' filtresiyle hesaplanır (bkz. app.js muduYardimcilari()).
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
    // Veriler cihaz hafızasında (IndexedDB) tutulsun, uygulama offline açılabilsin.
    db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
      if(err.code === 'failed-precondition'){
        console.warn('Offline destek: birden fazla sekme açık, sadece ilk sekmede etkin.');
      } else if(err.code === 'unimplemented'){
        console.warn('Offline destek: bu tarayıcı desteklemiyor.');
      } else {
        console.warn('Offline destek etkinleştirilemedi:', err);
      }
    });
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
