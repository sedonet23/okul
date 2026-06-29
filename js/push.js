/* ====================================================================
   PUSH BİLDİRİM İZNİ VE CİHAZ KAYDI
   - Web (tarayıcı): FCM Web SDK + Service Worker
   - Android APK (Capacitor): Native PushNotifications plugin
   ==================================================================== */

/* Capacitor native ortamda mı çalışıyoruz? */
function isNative(){
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function pushDurumGuncelle(){
  const dot   = document.getElementById('pushDot');
  const metin = document.getElementById('pushMetin');
  if(!metin) return;

  if(isNative()){
    // Native durum async — başlangıçta kısa metin yeterli
    metin.textContent = 'Bildirim durumu kontrol ediliyor...';
    _nativePushDurumKontrol(dot, metin);
    return;
  }

  if(!('Notification' in window)){
    metin.textContent = 'Bu tarayıcı bildirimleri desteklemiyor.';
    return;
  }
  if(Notification.permission === 'granted'){
    if(dot) dot.classList.add('on');
    metin.textContent = 'Bildirimler açık.';
  } else if(Notification.permission === 'denied'){
    metin.textContent = 'Bildirimler engellendi. Tarayıcı site ayarlarından izin vermeniz gerekiyor.';
  } else {
    metin.textContent = 'Bildirimler henüz açılmadı.';
  }
}

async function _nativePushDurumKontrol(dot, metin){
  try {
    const { PushNotifications } = await import('https://cdn.jsdelivr.net/npm/@capacitor/push-notifications@6/dist/index.js');
    const perm = await PushNotifications.checkPermissions();
    if(perm.receive === 'granted'){
      if(dot) dot.classList.add('on');
      metin.textContent = 'Bildirimler açık (native).';
    } else {
      metin.textContent = 'Bildirimler henüz açılmadı.';
    }
  } catch(e){
    metin.textContent = 'Bildirim durumu alınamadı.';
  }
}

async function bildirimleriAc(){
  if(isNative()){
    await _nativeBildirimleriAc();
    return;
  }
  // ── Web yolu ────────────────────────────────────────────────────────
  if(!messaging){ toast('Bu tarayıcı/ortam push bildirimlerini desteklemiyor.'); return; }
  try{
    const izin = await Notification.requestPermission();
    if(izin !== 'granted'){ toast('Bildirim izni verilmedi.'); pushDurumGuncelle(); return; }
    const kayit = await navigator.serviceWorker.register('/okul/firebase-messaging-sw.js');
    const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: kayit });
    if(!token){ toast('Token alınamadı, lütfen tekrar deneyin.'); return; }
    await db.collection(COL.cihazlar).doc(encodeURIComponent(token)).set({
      token, eklenmeTarihi: new Date().toISOString(), tarayici: navigator.userAgent
    });
    toast('Bildirimler açıldı, bu cihaz kaydedildi.');
    pushDurumGuncelle();
  }catch(err){
    console.error(err);
    toast('Bildirim açma hatası: '+err.message);
  }
}

async function _nativeBildirimleriAc(){
  try {
    const { PushNotifications } = await import('https://cdn.jsdelivr.net/npm/@capacitor/push-notifications@6/dist/index.js');

    // İzin iste
    let perm = await PushNotifications.checkPermissions();
    if(perm.receive === 'prompt'){
      perm = await PushNotifications.requestPermissions();
    }
    if(perm.receive !== 'granted'){
      toast('Bildirim izni verilmedi.');
      return;
    }

    // Kayıt listener'larını kur (tekrar eklememeye dikkat)
    PushNotifications.addListener('registration', async (tokenObj) => {
      const token = tokenObj.value;
      try {
        await db.collection(COL.cihazlar).doc(encodeURIComponent(token)).set({
          token,
          eklenmeTarihi: new Date().toISOString(),
          tarayici: 'Android-Native'
        });
        toast('Bildirimler açıldı, cihaz kaydedildi.');
        pushDurumGuncelle();
      } catch(e){
        toast('Token kaydedilemedi: ' + e.message);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      toast('Bildirim kayıt hatası: ' + JSON.stringify(err));
    });

    // Foreground bildirim dinleyicisi
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      toast(`${notification.title || 'Bildirim'}: ${notification.body || ''}`);
    });

    // Kayıt başlat
    await PushNotifications.register();

  } catch(e){
    console.error(e);
    toast('Native bildirim hatası: ' + e.message);
  }
}

function pushOnMessageDinleyiciKur(){
  if(isNative()) return; // Native için listener zaten _nativeBildirimleriAc'ta kurulur
  if(!messaging) return;
  messaging.onMessage(payload=>{
    const baslik = payload.notification ? payload.notification.title : 'Bildirim';
    const govde  = payload.notification ? payload.notification.body  : '';
    toast(`${baslik}: ${govde}`);
  });
}
