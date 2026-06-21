/* Okul Yönetim Paneli — Service Worker
   Uygulama kabuğunu (app shell) önbelleğe alır, internet olmadan açılabilmeyi sağlar.
   Firestore verileri ayrıca firebase-init.js içindeki enablePersistence ile
   tarayıcı/cihaz hafızasında (IndexedDB) tutulur — bu dosya sadece statik dosyaları yönetir. */

const CACHE_ADI = 'oy-cache-v2';

const ONBELLEGE_ALINACAKLAR = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/ui.js',
  './js/firebase-init.js',
  './js/nobet.js',
  './js/periyodik.js',
  './js/tasima.js',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_ADI).then((cache) => cache.addAll(ONBELLEGE_ALINACAKLAR))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((isimler) =>
      Promise.all(isimler.filter((i) => i !== CACHE_ADI).map((i) => caches.delete(i)))
    )
  );
  self.clients.claim();
});

// Strateji: Firebase/Google istekleri ağa bırakılır (cache'lenmez).
// Statik dosyalar için: önce ağ, ağ başarısızsa önbellekten dön (stale-while-offline).
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (event.request.method !== 'GET') return;
  if (url.includes('firestore.googleapis.com') || url.includes('googleapis.com') || url.includes('gstatic.com/firebasejs')) {
    return; // Firebase SDK ve Firestore trafiğine dokunma
  }

  event.respondWith(
    fetch(event.request)
      .then((yanit) => {
        const kopya = yanit.clone();
        caches.open(CACHE_ADI).then((cache) => cache.put(event.request, kopya));
        return yanit;
      })
      .catch(() => caches.match(event.request).then((onbellek) => onbellek || caches.match('./index.html')))
  );
});
