# Servis Yerleşim Editörü - Hızlı Başlangıç

## 🚀 5 Dakikada Başla

### 1️⃣ CSS ve JS'i Yükle

`index.html` dosyasına ekle:

```html
<!-- HEAD sekmesine -->
<link rel="stylesheet" href="css/servis-oturma-editor.css">

<!-- BODY sonuna (diğer script'lerden sonra) -->
<script src="js/servis-oturma-editor.js" defer></script>
```

### 2️⃣ HTML Sekmesini Ekle

`index.html` dosyasında `tab-tasima` sekmesinden sonra ekle:

```html
<section id="tab-servis-oturma-editor" class="tab-panel" style="display: none;">
  <div class="page-header">
    <div>
      <div class="page-title">💺 Servis Yerleşim Editörü</div>
      <div class="page-sub">Araç koltuk düzenini sürükle-bırak ile düzenleyin</div>
    </div>
    <div class="page-header-actions">
      <button class="btn btn-ghost btn-sm" onclick="location.reload()">🔄 Yenile</button>
      <button class="btn btn-ghost btn-sm" onclick="window.print()">🖨️ Yazdır</button>
      <button class="btn btn-amber" onclick="ServisYerlesimiEditor.toggleEditMode()">✏️ Düzenlemeyi Aç</button>
    </div>
  </div>

  <div class="soe-container" data-service-id="">
    <!-- Bilgi kartı, araç seçimi, canvas vs. JavaScript tarafından render edilir -->
  </div>
</section>
```

### 3️⃣ Menüye Ekle

Ulaşım menüsüne buton ekle:

```html
<button class="nav-tab nav-sub-tab" data-tab="servis-oturma-editor">
  <i class="nt-ico" data-lucide="chair"></i>
  <span class="nt-label">Oturma Düzeni</span>
</button>
```

### 4️⃣ Global Fonksiyon Ekle

`index.html` sonunda:

```javascript
<script>
  window.acServisOturamaEdt = function(serviceId) {
    document.querySelector('.soe-container').dataset.serviceId = serviceId;
    ServisYerlesimiEditor.init(serviceId);
    sekmeAc('servis-oturma-editor');
  };
</script>
```

### 5️⃣ Servis Listesine Buton Ekle

Servis kartında:

```html
<button onclick="acServisOturamaEdt('${servisId}')">💺 Oturma Planı</button>
```

---

## 📱 Kullanım

### Editörü Aç

```javascript
acServisOturamaEdt('servis-123');
```

### Araç Şablonu Seç

- ✅ Fiat Ducato
- ✅ Ford Transit
- ✅ Mercedes Sprinter
- ✅ Volkswagen Crafter
- ✅ Büyük Servis
- ✅ Midibüs
- ✅ Özel Tasarım

### Öğrenci Ata

1. Koltuk seç
2. Aç açılan Bottom Sheet'ten öğrenci seç
3. Otomatik kaydedilir

### Sürükle-Bırak

1. Koltuk üzerine uzun bas (500ms)
2. Taşı
3. Başka koltuğa bırak

### Kaydet

**Ctrl + S** veya "Kaydet" butonu

---

## 🔧 API

```javascript
// Başlat
ServisYerlesimiEditor.init('servis-id');

// Araç değiştir
ServisYerlesimiEditor.selectTemplate('fordTransit');

// Düzenleme modu
ServisYerlesimiEditor.toggleEditMode();

// Koltuk ekle
ServisYerlesimiEditor.addSeat();

// Öğrenci ata
ServisYerlesimiEditor.assignStudent('seat-1', 'student-id');

// Kaydet
await ServisYerlesimiEditor.saveLayout();

// Geri Al / Yinele
ServisYerlesimiEditor.undo();
ServisYerlesimiEditor.redo();
```

---

## 🎨 Özellikler

✅ Material Design 3  
✅ Dark Mode  
✅ Mobile-first  
✅ Sürükle-bırak  
✅ Geri Al / Yinele  
✅ 7 araç şablonu  
✅ Bottom Sheet detaylar  
✅ Firestore entegre  
✅ Yazdırma desteği  

---

## 🐛 Sorun Giderme

### Editör açılmıyor

```javascript
// Kontrol et
console.log(typeof ServisYerlesimiEditor);
console.log(typeof db);
```

### Veriler kaydedilmiyor

```javascript
// Firebase konsolu aç
await ServisYerlesimiEditor.saveLayout()
  .then(() => console.log('✅'))
  .catch(err => console.error(err));
```

### Dark Mode çalışmıyor

```javascript
// Tema kontrol et
document.documentElement.getAttribute('data-theme');
```

---

## 📚 Tam Döküman

Ayrıntılar için bkz: `docs/SERVIS-OTURMA-EDITOR.md`
