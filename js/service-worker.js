/* ====================================================================
   Okul Yönetim Paneli — Service Worker  v5
   · Uygulama kabuğu (app shell) tam önbelleklenir → internet olmadan açılır
   · Firestore verisi: firebase-init.js'deki enablePersistence() → IndexedDB
   · Strateji: statik dosyalar "Cache First", dış kaynaklar "Network First"
   ==================================================================== */

const CACHE_ADI = 'oy-cache-v20';

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
  './js/app.js',
  './js/ui.js',
  './js/push.js',
  /* JS — modüller */
  './js/cizelgeler.js',
  './js/takvim.js',
  './js/nobet.js',
  './js/periyodik.js',
  './js/tasima.js',
  './js/servis-oturma.js',
  './js/raporlama.js',
  './js/sinavlar.js',
  './js/notlar.js',
  './js/siniflar.js',
  './js/ogretmen-detay.js',
  './js/ders-saatleri.js',
  './js/excel-import.js',
  './js/yedekleme.js',
  './js/hava-durumu.js',
  './js/asistan.js',
  './js/ogrenciler-arama.js',
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
