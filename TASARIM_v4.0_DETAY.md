# KORUK İLK - ORTAOKULU YÖNETİM PANELİ v4.0
## Mor & Kurumsal Tema - Tasarım Detayı

### 🎨 RENKLENDİRME SİSTEMİ

**Ana Renkler:**
- Mor (#7C3AED) - Ana vurgu, butonlar, başlıklar
- Yeşil (#10B981) - Başarı, tamamlanan
- Kırmızı (#EF4444) - Hata, uyarı
- Mavi (#3B82F6) - Bilgi, öğrenci
- Turuncu (#F97316) - Personel/diğer

**Kategori İkonları + Renkleri:**
```
👥 Öğrenci → Mavi (#3B82F6)
👨‍🏫 Öğretmen → Yeşil (#10B981)
📚 Sınıf → Mor (#7C3AED)
👔 Personel → Turuncu (#F97316)
```

### ✅ YAPILANLAR (v3 Koruma)
- Genel Bakış (dashboard)
- Sınıflar sekmesi
- Öğretmen detay paneli
- Okul Bilgileri, Veli İletişim, Taşıma
- Excel şablonları indirme
- Diğer Evrak'ta Kaydet/Vazgeç
- Sosyal kulüpler yönetimi
- Belirli gün ve haftalar

### 🆕 YENİ ÖZELLİKLER (v4)

#### 1. MÜ Yardımcıları Listesi
- Okul Bilgileri'nde ad+telefon ile
- Nöbet'te buradan seçim

#### 2. Öğretmen Kariyer Basamağı
- Açılır liste: Öğretmen / Uzman / Başöğretmen

#### 3. Ders Saatleri → Accordion
- Ayarlar'ın altında açılır/kapanır

#### 4. Öğretmen Seçimi (Dropdown)
- Sosyal Kulüpler danışmanı
- Rehberlik danışmanı
- Diğer Evrak öğretmeni
- Nöbet ataması (liste dışı yazım engelle)
- Belirli Gün/Haftalar → çoklu seçim

#### 5. Sosyal Kulüpler Düzenleme
- Satır yanında ✎ Düzenle butonu
- Kulüp adı + danışman değiştirebilir

### 📊 ETKİLENECEK DOSYALAR

| Dosya | Değişiklik |
|-------|-----------|
| css/styles.css | Mor renk değişkenleri, istatistik kartları, accordion |
| index.html | Form yapıları, MÜ Yardımcıları, Kariyer Basamağı |
| app.js | Dashboard, MÜ Yardımcıları listesi |
| cizelgeler.js | Sosyal kulüpler düzenleme, çoklu seçim |
| nobet.js | Nöbet dropdown (liste dışı engelle) |
| excel-import.js | Nöbet import'ında yeni öğretmen ekle |
| ogretmen-detay.js | Kariyer basamağı alanı |
| firebase-init.js | Yeni koleksiyonlar |

### 🎯 ÖNCELİK SIRASI

1. ✅ CSS - Renk sistemi (TAM)
2. ⏳ HTML - Form/Modal yapıları
3. ⏳ app.js - Dashboard, MÜ Yardımcıları
4. ⏳ cizelgeler.js - Sosyal kulüpler
5. ⏳ nobet.js - Dropdown
6. ⏳ ogretmen-detay.js - Kariyer basamağı
7. ⏳ firebase-init.js - Koleksiyonlar

---

**Durum:** 1/7 adım tamamlandı
**ETA:** ~30-45 dakika
