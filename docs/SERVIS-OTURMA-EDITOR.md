# Servis Yerleşim Editörü - Tam Entegrasyon Kılavuzu

## 📖 İçerik

1. [Hızlı Başlangıç](#hızlı-başlangıç)
2. [Dosya Yapısı](#dosya-yapısı)
3. [Entegrasyon Adımları](#entegrasyon-adımları)
4. [API Referansı](#api-referansı)
5. [Firestore Şeması](#firestore-şeması)
6. [Kullanıcı Arayüzü](#kullanıcı-arayüzü)
7. [Özellikler](#özellikler)
8. [Sorun Giderme](#sorun-giderme)

---

## 🚀 Hızlı Başlangıç

### Temel Kullanım

```javascript
// Editörü başlat
ServisYerlesimiEditor.init('servis-id-buraya');

// Araç şablonunu değiştir
ServisYerlesimiEditor.selectTemplate('fordTransit');

// Düzenleme modunu aç
ServisYerlesimiEditor.toggleEditMode();

// Kaydet
ServisYerlesimiEditor.saveLayout();
```

### HTML'e Ekleme

```html
<!-- Sayfa içinde konteyner oluştur -->
<div class="soe-container" data-service-id="servis-123"></div>

<!-- CSS ve JS'i yükle -->
<link rel="stylesheet" href="css/servis-oturma-editor.css">
<script src="js/servis-oturma-editor.js" defer></script>
```

---

## 📁 Dosya Yapısı

```
okul/
├── css/
│   └── servis-oturma-editor.css        # Tüm stil ve animasyonlar
├── js/
│   └── servis-oturma-editor.js         # Core motoru
├── html-modules/
│   └── servis-oturma-editor.html       # HTML şablonu
└── docs/
    └── SERVIS-OTURMA-EDITOR.md         # Bu dosya
```

---

## 🔧 Entegrasyon Adımları

### Adım 1: CSS ve JS Dosyalarını Yükle

`index.html` dosyasının `<head>` bölümüne ekle:

```html
<link rel="stylesheet" href="css/servis-oturma-editor.css">
```

`index.html` dosyasının sonuna ekle (diğer script'lerden sonra):

```html
<script src="js/servis-oturma-editor.js" defer></script>
```

### Adım 2: HTML Modülünü Entegre Et

`index.html` dosyasında `tab-tasima` sekmesinin ardından ekle:

```html
<!-- SERVIS OTURMA EDITÖRÜ -->
<section id="tab-servis-oturma-editor" class="tab-panel" style="display: none;">
  <div class="page-header">
    <div>
      <div class="page-title">💺 Servis Yerleşim Editörü</div>
      <div class="page-sub">Araç koltuk düzenini sürükle-bırak ile düzenleyin</div>
    </div>
    <div class="page-header-actions">
      <button class="btn btn-ghost btn-sm" onclick="location.reload()">🔄 Yenile</button>
      <button class="btn btn-ghost btn-sm" onclick="window.print()">🖨️ Yazdır</button>
      <button class="btn btn-amber" id="soe-edit-toggle" 
        onclick="ServisYerlesimiEditor.toggleEditMode()">
        ✏️ Düzenlemeyi Aç
      </button>
    </div>
  </div>

  <div class="soe-container" data-service-id="">
    <!-- Bilgi kartı -->
    <div class="card">
      <div class="soe-info-card">
        <div class="soe-info-card-left">
          <h2>🚌 Servis Adı</h2>
          <div class="soe-info-card-row">
            <span class="soe-info-card-label">Şoför</span>
            <span class="soe-info-card-value">—</span>
          </div>
          <div class="soe-info-card-row">
            <span class="soe-info-card-label">Araç</span>
            <span class="soe-info-card-value">—</span>
          </div>
        </div>
        <div class="soe-info-card-right">
          <div class="soe-info-card-row">
            <span class="soe-info-card-label">Koltuk</span>
            <span class="soe-info-card-value">0 / 0</span>
          </div>
          <div class="soe-info-card-row">
            <span class="soe-info-card-label">Doluluk</span>
            <span class="soe-info-card-value">%0</span>
          </div>
          <div class="soe-capacity-bar">
            <div class="soe-capacity-fill" style="width: 0%"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Araç tipi seçimi -->
    <div class="soe-vehicle-selector">
      <h3>🚐 Araç Tipi Seçin</h3>
      <div class="soe-vehicle-buttons"></div>
    </div>

    <!-- Toolbar -->
    <div class="soe-toolbar" style="display: none;"></div>

    <!-- Canvas -->
    <div class="card">
      <h3 style="margin: 0 0 16px 0; font-size: 14px;">
        🎯 Yerleşim Düzeni
        <span style="float: right; font-size: 12px; color: var(--ink-muted);">
          Koltuk seçmek için tıklayın • Sürükleyerek taşıyın
        </span>
      </h3>
      <div class="soe-canvas-wrapper">
        <div class="soe-canvas"></div>
      </div>
    </div>
  </div>
</section>
```

### Adım 3: Navigasyon Menüsüne Ekle

`index.html` dosyasında Ulaşım menüsüne ekle:

```html
<button class="nav-tab nav-sub-tab" data-tab="servis-oturma-editor">
  <i class="nt-ico" data-lucide="chair"></i>
  <span class="nt-label">Oturma Düzeni</span>
</button>
```

### Adım 4: Global Fonksiyon Ekle

`js/app.js` dosyasında ekle:

```javascript
// Servis Oturma Editörünü Aç
function acServisOturamaEdt(serviceId) {
  const container = document.querySelector('.soe-container');
  if (container) {
    container.dataset.serviceId = serviceId;
    ServisYerlesimiEditor.init(serviceId);
    sekmeAc('servis-oturma-editor');
  }
}

// Servis listesinden çağır
// <button onclick="acServisOturamaEdt('id')">💺 Düzenle</button>
```

### Adım 5: Servis Modal'a Buton Ekle

Mevcut servis modal'ında "Oturma Planı Düzenle" butonu ekle:

```html
<button class="btn btn-ghost btn-sm" onclick="acServisOturamaEdt(this.dataset.serviceId)">
  💺 Oturma Planı
</button>
```

---

## 🔌 API Referansı

### Ana Metotlar

#### `init(serviceId)`
Editörü başlatır ve Firestore'dan verileri yükler.

```javascript
ServisYerlesimiEditor.init('servis-123');
```

#### `selectTemplate(templateType)`
Araç şablonunu seçer ve otomatik düzeni uygular.

```javascript
ServisYerlesimiEditor.selectTemplate('fordTransit');
// Seçenekler: 'fiatDucato', 'fordTransit', 'mercedesSprinter', 'vwCrafter', 'bigBus', 'minibus', 'custom'
```

#### `toggleEditMode()`
Düzenleme modunu aç/kapat.

```javascript
ServisYerlesimiEditor.toggleEditMode();
```

#### `saveLayout()`
Güncel yerleşimi Firestore'a kaydeder.

```javascript
await ServisYerlesimiEditor.saveLayout();
```

#### `assignStudent(seatId, studentId)`
Koltuk için öğrenci atar.

```javascript
ServisYerlesimiEditor.assignStudent('seat-1', 'student-id-123');
```

#### `removeStudent(seatId)`
Koltuktaki öğrenciyi kaldırır.

```javascript
ServisYerlesimiEditor.removeStudent('seat-1');
```

#### `undo()` / `redo()`
Geri al / Yinele işlemi.

```javascript
ServisYerlesimiEditor.undo();
ServisYerlesimiEditor.redo();
```

#### `addSeat()` / `deleteSeat()`
Koltuk ekle / sil (seçili koltuk).

```javascript
ServisYerlesimiEditor.addSeat();
ServisYerlesimiEditor.deleteSeat();
```

#### `addRow()` / `deleteRow()`
Satır ekle / sil.

```javascript
ServisYerlesimiEditor.addRow();
ServisYerlesimiEditor.deleteRow();
```

### State Yapısı

```javascript
ServisYerlesimiEditor.state = {
  serviceId: 'servis-id',
  serviceName: 'Bekiroğlu Servisi',
  driverName: 'Engin Kuytu',
  vehicleModel: 'Fiat Ducato',
  vehicleType: 'fiatDucato',
  totalSeats: 16,
  filledSeats: 8,
  capacity: 16,
  editMode: false,
  currentData: {
    elements: [],
    rows: [
      {
        id: 'row-1',
        type: 'row',
        seats: [
          {
            id: 'seat-1',
            type: 'seat',
            seatNumber: 1,
            studentId: null,
            status: 'empty', // 'empty', 'filled', 'disabled', 'editing'
            locked: false,
            x: 0,
            y: 0
          }
        ]
      }
    ]
  },
  selectedSeat: null,
  draggedElement: null,
  history: [],
  historyIndex: -1,
  studentList: []
};
```

---

## 📊 Firestore Şeması

### `oy_servisler` Koleksiyonu

```javascript
{
  id: 'servis-1',
  name: 'Bekiroğlu Servisi',
  driver: 'Engin Kuytu',
  driverPhone: '5551234567',
  vehicleModel: 'Fiat Ducato',
  vehicleType: 'fiatDucato',
  vehiclePlate: '34 KD 1234',
  capacity: 16,
  status: 'Aktif', // 'Aktif', 'Pasif'
  
  // Yerleşim JSON'ı
  seatingLayout: {
    elements: [],
    rows: [
      {
        id: 'row-1',
        type: 'row',
        seats: [
          {
            id: 'seat-1',
            type: 'seat',
            seatNumber: 1,
            studentId: 'student-123',
            status: 'filled',
            locked: false,
            color: '#4CAF50',
            properties: {
              note: 'Güvenli sürüş',
              specialNeeds: false
            }
          }
        ]
      }
    ]
  },
  
  filledSeats: 12,
  totalSeats: 16,
  lastModified: Timestamp.now(),
  createdAt: Timestamp.now()
}
```

### `oy_ogrenciler` Koleksiyonu

Öğrenci listesi otomatik olarak yüklenir:

```javascript
{
  id: 'student-123',
  name: 'Ali Yılmaz',
  sınıf: '5/A',
  durak: 'Köy Merkezi',
  veliAdı: 'Mehmet Yılmaz',
  telefon: '5559876543'
}
```

---

## 🎨 Kullanıcı Arayüzü

### Renk Şeması

- **Boş Koltuk**: Beyaz (#FFFFFF)
- **Dolu Koltuk**: Yeşil (var(--green))
- **Seçili Koltuk**: Sarı (#FFC107)
- **Devre Dışı**: Kırmızı (#EF5350)
- **Düzenleniyor**: Mavi (#2196F3)

### Animasyonlar

- Slide Up: 300ms (bottom sheet açılırken)
- Pulse Plus: 2s (boş koltuk animasyonu)
- Drag: Anlık (sürükleme sırasında)
- Transitions: 250ms (varsayılan)

### Responsive Breakpoints

- **Tablet**: 768px (2 sütun)
- **Telefon**: 480px (1 sütun, küçük koltuklar)

---

## ⚡ Özellikler

### ✅ Tamamlanan

- [x] Material Design 3 tasarımı
- [x] Dark Mode tam desteği
- [x] Mobile-first responsive layout
- [x] Sürükle-bırak (Drag & Drop)
- [x] 7 araç şablonu
- [x] Öğrenci atama/kaldırma
- [x] Bottom Sheet koltuk özellikleri
- [x] Geri al / Yinele (Undo/Redo)
- [x] Firestore entegrasyonu
- [x] Yazdırma desteği
- [x] Dinamik satır yönetimi
- [x] Canlı koltuk sayacı
- [x] Kapasitesi göstergesi

### 🔄 Gelecek Sürümler

- [ ] Acil çıkış ikonları
- [ ] Kapı konumlandırması
- [ ] Koridor ayarlama
- [ ] Şoför koltuğu seçimi
- [ ] PDF rapor oluşturma
- [ ] Koltuk renk özelleştirmesi
- [ ] Toplu öğrenci ataması
- [ ] Şablon kaydetme/yükleme

---

## 🐛 Sorun Giderme

### Editör Açılmıyor

```javascript
// Kontrol et
if (typeof ServisYerlesimiEditor === 'undefined') {
  console.error('JS dosyası yüklenemedi');
}

// Firestore kontrol et
if (typeof db === 'undefined') {
  console.error('Firebase başlatılmamış');
}
```

### Veriler Kaydedilmiyor

```javascript
// Firestore kurallarını kontrol et
// firestore.rules dosyasında yazma izni var mı?

// Test et
await ServisYerlesimiEditor.saveLayout()
  .then(() => console.log('✅ Kaydedildi'))
  .catch(err => console.error('❌ Hata:', err));
```

### Koltuklar Render Edilmiyor

```javascript
// Console kontrol et
console.log(ServisYerlesimiEditor.state.currentData);

// Öğrenci listesi yüklü mü?
console.log(ServisYerlesimiEditor.state.studentList);

// Canvas DOM öğesi var mı?
console.log(document.querySelector('.soe-canvas'));
```

### Dark Mode Sorunları

```javascript
// CSS değişkenleri kontrol et
const style = getComputedStyle(document.documentElement);
console.log('Tema:', style.getPropertyValue('--soe-card-bg'));
```

---

## 📱 Mobil Kullanımı

### Dokunmatik İşlemleri

1. **Koltuk Seçme**: Bir kez dokunun
2. **Sürükleme**: Uzun basın (500ms) + sürükleyin
3. **Bottom Sheet**: Koltuktan sonra otomatik açılır
4. **Toolbar**: Düzenleme modu açıldığında görünür

### Optimizasyon

- Koltuk boyutu mobilde otomatik küçülür
- Toolbar yatay kaydırılabilir
- Bottom Sheet tam ekran modal olur
- Canvas'ı dock'ta kaydırılabilir

---

## 📝 Örnek Kullanım Senaryosu

```javascript
// 1. Sayfa yüklendikten sonra
async function servisOturamaAc(serviceId) {
  // Konteyner ayarla
  document.querySelector('.soe-container').dataset.serviceId = serviceId;

  // Editörü başlat
  ServisYerlesimiEditor.init(serviceId);

  // Sekmeye geç
  sekmeAc('servis-oturma-editor');
}

// 2. Araç tipi değiştir
function aracTipiniBaglaTipi(tip) {
  ServisYerlesimiEditor.selectTemplate(tip);
}

// 3. Öğrenci ata
function ogrenciAta(seatId, studentId) {
  ServisYerlesimiEditor.assignStudent(seatId, studentId);
}

// 4. Kaydet
async function duzenKaydet() {
  try {
    await ServisYerlesimiEditor.saveLayout();
    alert('✅ Yerleşim başarıyla kaydedildi!');
  } catch (err) {
    alert('❌ Hata: ' + err.message);
  }
}

// 5. Yazdır
function duzenYazdir() {
  window.print();
}
```

---

## 🔐 Güvenlik

### Firestore Kuralları

Düzenlemek için `firestore.rules` dosyasını güncelleyin:

```firestore
match /oy_servisler/{servisId} {
  allow read: if true;
  allow write: if request.auth != null;
}

match /oy_ogrenciler/{ogrenciId} {
  allow read: if true;
}
```

### Veri Doğrulama

Tüm koltuk verileri Firestore'a kaydedilmeden önce doğrulanır:

```javascript
// Otomatik doğrulama
{
  seatNumber: number,
  studentId: string | null,
  status: 'empty' | 'filled' | 'disabled' | 'editing',
  locked: boolean
}
```

---

## 📞 Destek

Sorunlar için GitHub Issues'da bildir:
https://github.com/sedonet23/okul/issues

---

**Son Güncelleme**: 2026-07-08  
**Sürüm**: 1.0.0  
**Durum**: Üretim Hazırı ✅
