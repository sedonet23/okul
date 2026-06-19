# Okul Yönetim Paneli

Bulut tabanlı, çok modüllü okul yönetim uygulaması. Öğretmen bilgileri, ders programı, nöbet programı, hatırlatıcılar, görev takibi, evrak takibi, genel notlar ve okulda tutulan resmi takip çizelgeleri (Sosyal Kulüpler, Belirli Gün ve Haftalar, ŞÖK, Zümre, Yıllık/BEP Planı, Rehberlik, Maarif Model Aylık Raporlar, Diğer Evraklar) modüllerini içerir. Bu çizelgeler Excel dosyanızdan tek tıkla içe aktarılabilir. Vadesi gelen hatırlatıcı/görevler için **GitHub Actions** üzerinden çalışan bir betik, **Firebase Cloud Messaging** ile telefonunuza/tarayıcınıza push bildirimi gönderir — tamamen ücretsiz.

## Nasıl çalışıyor (kısaca)

- **Arayüz**: Tek sayfalık web uygulaması (PWA), Firebase Firestore'a gerçek zamanlı bağlanır. GitHub Pages ile ücretsiz yayınlanır.
- **Veritabanı**: Firebase Firestore (ücretsiz Spark plan yeterli).
- **Bildirimler**: Cloud Functions/Blaze plan **kullanılmıyor**. Onun yerine GitHub Actions her 15 dakikada bir çalışan küçük bir Node.js betiği (`functions-free/check-and-notify.js`) ile Firestore'u kontrol ediyor ve vadesi gelmiş kayıtlar için Firebase Cloud Messaging üzerinden bildirim gönderiyor. Bu yüzden bildirimler "saniyesinde anlık" değil, **en fazla ~15 dakika gecikmeli**dir.
- **Güvenlik**: Tek yönetici hesabıyla giriş yapılır (Firebase Authentication). Uygulama herkese açık bir adreste barındığı için bu giriş ekranı olmadan veriler korumasız kalırdı.
- **Evrak takibi**: Dosya yükleme yok (Firebase Storage yeni projelerde ücretli plan gerektirebiliyor) — onun yerine bir "Dosya Linki" alanına Google Drive/OneDrive gibi bir bağlantı yapıştırıyorsunuz.

## Kurulum Adımları

### 1) Firebase projesi oluşturun
[console.firebase.google.com](https://console.firebase.google.com) → "Add project" → adını verin (Blaze'e geçmeyin, **Spark/ücretsiz plan yeterli**).

### 2) Web uygulaması ekleyin
Proje genel ayarlarında "</>" simgesine tıklayıp bir web uygulaması ekleyin. Size verilen `firebaseConfig` nesnesindeki değerleri kopyalayın.

- `js/firebase-init.js` dosyasını açın, `BURAYA_...` yazan tüm alanları bu değerlerle değiştirin.
- `firebase-messaging-sw.js` dosyasını açın, **aynı değerleri** oradaki `firebase.initializeApp({...})` bloğuna da girin (servis çalışanları sayfa script'lerini paylaşamadığı için bu bilgi iki yerde tekrar edilir).

### 3) Authentication'ı açın ve tek yönetici hesabınızı oluşturun
Firebase Console → Authentication → "Get started" → Sign-in method'dan **E-posta/Şifre**'yi etkinleştirin. Sonra Users sekmesinden "Add user" ile kendi e-posta + şifrenizi elle oluşturun. Uygulamaya bu bilgilerle giriş yapacaksınız.

### 4) Firestore'u açın ve güvenlik kurallarını yapıştırın
Firebase Console → Firestore Database → "Create database" (üretim modunda başlatabilirsiniz). Sonra **Rules** sekmesine gidip bu depodaki `firestore.rules` dosyasının içeriğini yapıştırıp **Publish** deyin.

### 5) Cloud Messaging'i açın ve VAPID anahtarı oluşturun
Proje Ayarları → Cloud Messaging sekmesi → "Web configuration" → "Generate key pair". Oluşan anahtarı kopyalayıp `js/firebase-init.js` içindeki `VAPID_KEY` değişkenine yapıştırın.

### 6) Servis hesabı (service account) anahtarı oluşturun
Proje Ayarları → Service accounts → "Generate new private key". İnen JSON dosyasını açıp **tüm içeriğini** kopyalayın (bir sonraki adımda kullanacaksınız). **Bu dosyayı asla GitHub'a yüklemeyin.**

### 7) GitHub deposu oluşturun
Bu klasördeki tüm dosyaları yeni bir GitHub deposuna yükleyin (genel "public" depo önerilir — bu sayede GitHub Actions dakika sınırı olmaz; depoda kişisel veri ya da gizli anahtar olmadığı için bunun bir güvenlik riski yoktur, gizli bilgi sadece Firestore'da ve GitHub Secrets'ta tutulur).

### 8) GitHub Secret ekleyin
Depo → Settings → Secrets and variables → Actions → "New repository secret":
- Adı: `FIREBASE_SERVICE_ACCOUNT`
- Değeri: 6. adımda indirdiğiniz JSON dosyasının tam içeriği

### 9) GitHub Pages'i açın
Depo → Settings → Pages → Source: "Deploy from a branch" → Branch: `main` / `root` → Save. Birkaç dakika içinde size bir `https://kullaniciadi.github.io/depo-adi/` adresi verilecek.

### 10) GitHub Actions'ın çalıştığını doğrulayın
Depo → Actions sekmesi → "Hatırlatma ve Görev Bildirimleri" iş akışını göreceksiniz. "Run workflow" ile elle bir kez tetikleyip loglarda hata olup olmadığını kontrol edebilirsiniz.

### 11) Uygulamaya giriş yapın ve bildirimleri açın
9. adımdaki adresi açın, 3. adımda oluşturduğunuz e-posta/şifre ile giriş yapın. Ayarlar sekmesinden "Bildirimleri Aç" butonuna tıklayıp tarayıcı izni verin — bu cihaz artık bildirim alacak şekilde kayıtlı.

## Excel'den veri içe aktarma

- **Öğretmenler / Ders Programı / Nöbet Programı** sekmelerinde "Excel'den İçe Aktar" butonuyla kendi Excel dosyanızı (ilgili Türkçe başlıklı sütunlarla: Ad/Soyad, Branş vb.) yükleyebilirsiniz.
- **Çizelgeler** (Sosyal Kulüpler, Belirli Gün ve Haftalar, ŞÖK, Zümre, Yıllık/BEP Planı, Rehberlik, Maarif Model Aylık Raporlar, Diğer Evraklar) için **Ayarlar > "Excel Çizelgelerini İçe Aktar"** bölümünden, okulunuzda kullandığınız çizelge dosyasını (örn. `EVRAK_TAKİP.xlsx` gibi çok sekmeli bir dosya) tek seferde yükleyebilirsiniz. Sekme adları otomatik tanınır (örn. "Sosyal Kulüpler Takip", "ŞÖK", "ZÜMRE" vb.); eşleşmeyen sekmeler atlanır.
- İçe aktarma, var olan satırları **siler ya da üzerine yazmaz** — aynı isimde bir satır bulursa mevcut tikleri koruyarak günceller, yoksa yeni satır ekler. Bu yüzden dosyayı dönem içinde tekrar tekrar yükleyebilirsiniz.
- Çizelgelerdeki sütun başlıkları (aylar, dönemler vb.) sabittir ve gerçek okul çizelgelerinin yapısına göre koddadır; hücreye tıklayarak da elle tikleyebilirsiniz.



`.github/workflows/notify.yml` dosyasındaki `cron: '*/15 * * * *'` satırını değiştirerek sıklığı ayarlayabilirsiniz (örn. `*/5 * * * *` = 5 dakika). Not: Özel (private) depolarda çok sık çalıştırmak aylık ücretsiz dakika sınırını (~2000 dk/ay) aşabilir; genel (public) depolarda bu sınır yoktur.

## Sınırlamalar (dürüst olmak gerekirse)

- Bildirimler en fazla ~15 dakika gecikmeli gelir, gerçek "anlık" push değildir (bu, sıfır maliyetle elde edilebilecek en yakın yaklaşımdır).
- GitHub'ın zamanlanmış görevleri yoğun saatlerde birkaç dakika ileri gidebilir; bu garanti edilen bir SLA değildir.
- iOS'ta web push bildirimleri yalnızca uygulama "Ana Ekrana Ekle" ile yüklenmişse çalışır (Safari 16.4+).
- Evrak modülünde gerçek dosya yükleme yoktur, sadece harici bir bağlantı (link) saklanır.
