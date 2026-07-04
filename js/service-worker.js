/* ====================================================================
   Okul Yönetim Paneli — Service Worker  v5
   · Uygulama kabuğu (app shell) tam önbelleklenir → internet olmadan açılır
   · Firestore verisi: firebase-init.js'deki enablePersistence() → IndexedDB
   · Strateji: statik dosyalar "Cache First", dış kaynaklar "Network First"
   ==================================================================== */

const CACHE_ADI = 'oy-cache-v85';

/* ---- Önbelleğe alınacak tüm uygulama dosyaları ---- */
const ONBELLEGE_ALINACAKLAR = [
  './',
  './index.html',
  './manifest.json',
  /* CSS */
  './css/styles.css',
  /* JS — çekirdek */
  './js/firebase-init.js',
  './js/auth.js',
  './js/kullanici-yonetimi.js',
  './js/app.js',
  './js/ui.js',
  './js/push.js',
  /* JS — core (repository / service katmanı) */
  './js/core/utils.js',
  './js/core/store.js',
  './js/core/event-bus.js',
  './js/core/repositories/nobet.repository.js',
  './js/core/services/nobet.service.js',
  './js/core/repositories/siniflar.repository.js',
  './js/core/services/siniflar.service.js',
  './js/core/repositories/personel.repository.js',
  './js/core/services/personel.service.js',
  './js/core/repositories/tasima.repository.js',
  './js/core/services/tasima.service.js',
  './js/core/repositories/servis-oturma.repository.js',
  './js/core/services/servis-oturma.service.js',
  './js/core/repositories/notlar.repository.js',
  './js/core/services/notlar.service.js',
  './js/core/repositories/sinavlar.repository.js',
  './js/core/services/sinavlar.service.js',
  './js/core/repositories/ogretmen-izin.repository.js',
  './js/core/services/ogretmen-izin.service.js',
  './js/core/repositories/ders-saatleri.repository.js',
  './js/core/services/ders-saatleri.service.js',
  './js/core/repositories/dokumanlar.repository.js',
  './js/core/services/dokumanlar.service.js',
  './js/core/repositories/harita.repository.js',
  './js/core/services/harita.service.js',
  './js/core/repositories/cizelgeler.repository.js',
  './js/core/services/cizelgeler.service.js',
  './js/core/repositories/mesajlasma.repository.js',
  './js/core/services/mesajlasma.service.js',
  './js/core/repositories/duyurular.repository.js',
  './js/core/services/duyurular.service.js',
  /* JS — modüller */
  './js/cizelgeler.js',
  './js/mesajlasma.js',
  './js/duyurular.js',
  './js/dashboard-ozellestirme.js',
  './js/takvim.js',
  './js/nobet.js',
  './js/periyodik.js',
  './js/tasima.js',
  './js/tasima-takip.js',
  './js/servis-oturma.js',
  './js/haberler.js',
  './js/mevzuat-asistan.js',
  './js/raporlama.js',
  './js/sinavlar.js',
  './js/notlar.js',
  './js/siniflar.js',
  './js/ogretmen-detay.js',
  './js/ogretmen-izin.js',
  './js/ders-saatleri.js',
  './js/personel.js',
  './js/puantaj.js',
  './js/dilekce.js',
  './js/dokumanlar.js',
  './js/harita.js',
  './js/excel-import.js',
  './js/yedekleme.js',
  './js/hava-durumu.js',
  './js/ogrenciler-arama.js',
  './js/widget-bridge.js',
  /* Varlıklar */
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-180.png',
];

/* ---- INSTALL: tüm dosyaları önbellekle ---- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_ADI).then((cache) => {
      // Her dosyayı tek tek dene; biri başarısız olursa diğerleri yine önbelleklenir
      return Promise.allSettled(
        ONBELLEGE_ALINACAKLAR.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Önbelleklenemedi:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

/* ---- ACTIVATE: eski önbellekleri temizle ---- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((isimler) =>
      Promise.all(
        isimler
          .filter((i) => i !== CACHE_ADI)
          .map((i) => caches.delete(i))
      )
    )
  );
  self.clients.claim();
});

/* ---- FETCH stratejisi ---- */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  /* 1. Firebase / Google API trafiği → her zaman ağdan, SW karışmaz
        (Firestore kendi offline katmanını yönetir) */
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('accounts.google.com') ||
    url.includes('fcm.googleapis.com') ||
    url.includes('firebase') && url.includes('googleapis')
  ) {
    return;
  }

  /* 2. CDN'den gelen harici kütüphaneler (xlsx, fonts) → Network First, cache fallback */
  if (
    url.includes('cdnjs.cloudflare.com') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((yanit) => {
          const kopya = yanit.clone();
          caches.open(CACHE_ADI).then(c => c.put(event.request, kopya));
          return yanit;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  /* 3. Uygulama dosyaları → Cache First (offline'da anında açılır)
        Arka planda ağdan kontrol et, fark varsa cache güncelle (stale-while-revalidate) */
  event.respondWith(
    caches.open(CACHE_ADI).then(async (cache) => {
      const onbellek = await cache.match(event.request);
      const agIstegi = fetch(event.request)
        .then((yanit) => {
          if (yanit && yanit.status === 200) {
            cache.put(event.request, yanit.clone());
          }
          return yanit;
        })
        .catch(() => null);

      /* Önbellekte varsa hemen dön, arka planda güncelle */
      if (onbellek) {
        agIstegi; // fire-and-forget
        return onbellek;
      }

      /* Önbellekte yoksa ağdan getir */
      const agYanit = await agIstegi;
      if (agYanit) return agYanit;

      /* Her ikisi de başarısızsa offline sayfası döndür */
      return cache.match('./index.html');
    })
  );
});

/* ---- Push bildirimleri (mevcut haliyle korundu) ---- */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let veri;
  try { veri = event.data.json(); }
  catch (e) { veri = { title: 'Koruk Okul Paneli', body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(veri.title || 'Koruk Okul Paneli', {
      body:    veri.body    || '',
      icon:    veri.icon    || './assets/icon-192.png',
      badge:   veri.badge   || './assets/icon-192.png',
      data:    veri.data    || {},
      tag:     veri.tag     || 'okul-panel',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes('index.html') || client.url.endsWith('/')) {
          return client.focus();
        }
      }
      return clients.openWindow('./index.html');
    })
  );
});
