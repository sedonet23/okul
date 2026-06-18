/* ====================================================================
   FIREBASE MESSAGING SERVICE WORKER
   Bu dosya, uygulama/tarayıcı kapalıyken gelen push bildirimlerini
   yakalar ve ekranda gösterir. Bu dosya root dizinde (index.html ile
   aynı seviyede) olmalı.

   ÖNEMLİ: js/firebase-init.js dosyasına girdiğiniz aynı firebaseConfig
   değerlerini buraya da girmeniz gerekir (service worker'lar sayfanın
   diğer script'lerini paylaşamaz, bu yüzden kopyalanmış halidir).
   ==================================================================== */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCxLLlLCA0Deu7dcQchUWeY5cR5ur5FSkc",
  authDomain: "okul-6e302.firebaseapp.com",
  projectId: "okul-6e302",
  storageBucket: "okul-6e302.firebasestorage.app",
  messagingSenderId: "738103486583",
  appId: "1:738103486583:web:da91129b1a08f2463efe72"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const baslik = (payload.notification && payload.notification.title) || 'Okul Yönetimi';
  const secenekler = {
    body: (payload.notification && payload.notification.body) || '',
    data: payload.data || {}
  };
  self.registration.showNotification(baslik, secenekler);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('./index.html'));
});
