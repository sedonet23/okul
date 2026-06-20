# 🏫 Okul Yönetim Paneli v3 - Kurulum ve Kullanım Rehberi

## 📦 İçerik
Bu paket, okul yönetim sisteminin tüm gerekli dosyalarını içerir:

### Klasör Yapısı
```
okul-yonetim-paneli/
├── index.html              (Ana HTML dosyası)
├── manifest.json           (PWA manifest)
├── firestore.rules         (Firestore güvenlik kuralları)
├── firebase-messaging-sw.js (Service worker)
├── README.md               (Orijinal dokümantasyon)
├── DEGISIKLIKLER.md        (Yapılan değişiklikler)
│
├── css/
│   └── styles.css          (Tüm stil dosyaları - guncellenmiş)
│
├── js/
│   ├── app.js              (Ana uygulama mantığı - guncellenmiş)
│   ├── ui.js               (Tema ve menü - guncellenmiş)
│   ├── cizelgeler.js       (Çizelge yönetimi - guncellenmiş)
│   ├── siniflar.js         (Sınıf yönetimi)
│   ├── ogretmen-detay.js   (Öğretmen popup - guncellenmiş)
│   ├── auth.js             (Kimlik doğrulama)
│   ├── firebase-init.js    (Firebase ayarları - DEĞIŞTIRILMELI)
│   ├── excel-import.js     (Excel içe aktarma)
│   ├── nobet.js            (Nöbet programı)
│   ├── ders-saatleri.js    (Ders saatleri)
│   ├── periyodik.js        (Periyodik işler)
│   └── push.js             (Push bildirimleri)
│
├── assets/
│   ├── icon-32.png
│   ├── icon-180.png
│   ├── icon-192.png
│   ├── icon-512.png
│   └── logo.png
│
└── functions-free/         (Cloud Functions dosyaları)
```

## 🚀 Kurulum Adımları

### 1. Dosyaları Sunucuya Yükleyin
```bash
# Tüm dosyaları web sunucunuza yükleyin
# Örneğin: FTP, SSH, Git, vb. ile

# Klasör yapısı:
/var/www/html/okul-yonetim/
```

### 2. Firebase Ayarlarını Yapılandırın
`js/firebase-init.js` dosyasını açıp, Firebase proje bilgilerinizi ekleyin:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const VAPID_KEY = "YOUR_VAPID_PUBLIC_KEY";
```

### 3. Firestore Veritabanını Hazırlayın
Firebase Console'da:
1. Firestore Database oluşturun (Test mode ile başlayabilir)
2. Koleksiyonları oluşturun:
   - `ogretmenler`
   - `siniflar`
   - `veliler`
   - `dersProgrami`
   - `nobet`
   - `hatirlaticilar`
   - `gorevler`
   - `evrakTakibi`
   - `notlar`
   - `sosyalKulupler`
   - `belirliGunler`
   - `digerEvrak`
   - `zumre`
   - `bepPlani`
   - `rehberlik`
   - `maarifRapor`
   - `periyodikIsler`
   - `dersSaatleri`
   - `nobetYerleri`

### 4. Tarayıcıda Açın
```
http://localhost/okul-yonetim/index.html
```

## 🎯 Yeni Özellikler

### 1. Tema Ayarları
- **Açık Tema (Varsayılan)**: Uygulama açık temada başlar
- **Koyu Tema**: Sağ üst köşedeki 🌙 butonuna tıklayarak geçiş yapın

### 2. Menü Yapısı
- **Açılır Menü**: Çizelgeler bölümü tıklanabilir menü olarak açılıp kapanıyor
- **Kompakt**: Tüm çizelge seçenekleri bir başlık altında gruplanmış

### 3. Excel Şablonları
**Ayarlar** sekmesine gidin:
1. "Excel Şablonlarını İndir" butonuna tıklayın
2. Hazır şablonlar indirilecek
3. Yerel olarak doldurun
4. "Excel Dosyası Yükle" butonuna tıklayarak sisteme ekleyin

### 4. Sosyal Kulüpler Yönetimi
**Sosyal Kulüpler** sekmesi:
- **Kulüp Yönetimi Paneli**:
  - ✓ Aktif/Pasif toggle
  - Birden fazla öğretmen seçme
  - Düzenleme butonu
- **Kaydet Butonu**: Tüm değişiklikleri birden kaydet

#### Kulüp Ekleme/Düzenleme:
```
1. "+ Yeni Kulüp" butonuna tıklayın
2. Kulüp adını girin
3. Danışman öğretmen adını girin
4. Öğretmenleri seçin (checkbox ile birden fazla)
5. Aktif/Pasif ayarını yapın
6. "Kaydet" butonuna tıklayın
```

### 5. Sınıflar Popup
Sınıflar bölümünde bir sınıfa tıklandığında:
- **Bilgiler Sekmesi**: Temel sınıf bilgileri
- **Ders Programı Sekmesi**: Haftalık ders programı
- **Veli Bilgileri Sekmesi**: Veli iletişim listesi

### 6. Öğretmen Detay Popup
Öğretmen listesinden bir öğretmene tıklandığında:
- Temel bilgiler
- Ders programı
- Nöbetler
- **Kulüp Danışmanlığı**: Danışmanı olduğu kulüplerin belirli gün/haftaları
- Belirli gün ve haftalar (tik durumu gösterilir ✓)
- Diğer evraklar

## 📊 Veri Yapısı

### Sosyal Kulüpler (sosyalKulupler)
```javascript
{
  id: "auto-generated",
  ad: "Robotik Kulübü",
  danisman: "Öğretmen Adı",
  ogretmenler: ["ogretmen_id_1", "ogretmen_id_2"],  // Array - birden fazla
  aktif: true,  // Boolean - aktif/pasif
  durumlar: {
    "yillik_plan": true,
    "toplum_hizmeti": false,
    // ... diğer aylar
  },
  eklenmeTarihi: "2024-01-01T10:00:00.000Z"
}
```

### Belirli Gün ve Haftalar (belirliGunler)
```javascript
{
  id: "auto-generated",
  baslik: "Cumhuriyet Bayramı",
  tarih: "29 Ekim",
  ayGrubu: "EKİM",
  gorevliOgretmen: "Öğretmen Adı",
  tamamlandi: false,
  sira: 1,
  eklenmeTarihi: "2024-01-01T10:00:00.000Z"
}
```

## 🎨 Tema Renkleri

### Açık Tema
- Arka plan: `#F5F2E6` (krem)
- Yazı rengi: `#1B2620` (koyu yeşil)
- Sidebar: `#0B3D2B` (koyu yeşil)

### Koyu Tema
- Arka plan: `#11201A` (çok koyu)
- Yazı rengi: `#F2F8F4` (açık)
- Sidebar: `#07241A` (çok koyu yeşil)

## 🔧 Sorun Giderme

### "Firebase bağlantısı yok" hatası
→ `js/firebase-init.js` dosyasında Firebase ayarlarını kontrol edin

### Öğretmen listesi boş gözüküyor
→ Firestore'da `ogretmenler` koleksiyonuna veri eklediğinizden emin olun

### Excel şablonları indirilmiyor
→ Tarayıcı konsolunda (F12) hata olup olmadığını kontrol edin

### Tema değişmiyor
→ localStorage'ı temizleyin: DevTools → Application → Clear Storage

## 📱 Mobil Cihazlar
- Responsive tasarım: Tüm ekran boyutlarında çalışır
- Hamburger menü: Mobilde otomatik açılır/kapanır
- Touch friendly: Tüm butonlar mobil için optimize edilmiş

## 🔒 Güvenlik Notları
1. Production'da `firestore.rules` dosyasını düzenleyin
2. Test Mode'dan kurtulun
3. VAPID anahtarlarını gizleyin
4. Düzenli yedeklemeler yapın

## 📞 Destek ve Güncellemeler
- Herhangi bir sorun için Firebase Console'u kontrol edin
- Hata günlüklerini tarayıcı konsolunda (F12) görüntüleyin
- Tüm değişiklikleri `DEGISIKLIKLER.md` dosyasında bulabilirsiniz

## 📄 Lisans ve Kullanım Koşulları
Bu yazılım eğitim ve yönetim amaçları için açık kaynak olarak sunulmaktadır.

---

**Sürüm**: 3.1  
**Son Güncelleme**: 20 Haziran 2026  
**Durum**: Production Ready ✅
