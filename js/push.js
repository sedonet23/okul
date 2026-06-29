/* ====================================================================
   PUSH BİLDİRİM İZNİ VE CİHAZ KAYDI
   ==================================================================== */

function isNative(){
  try {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform());
  } catch(e){ return false; }
}

async function _getNativePush(){
  // Yöntem 1: window.Capacitor.Plugins
  if(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications){
    return window.Capacitor.Plugins.PushNotifications;
  }
  // Yöntem 2: global Capacitor
  if(typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.PushNotifications){
    return Capacitor.Plugins.PushNotifications;
  }
  throw new Error('PushNotifications plugin bulunamadi');
}

function pushDurumGuncelle(){
  const dot   = document.getElementById('pushDot');
  const metin = document.getElementById('pushMetin');
  if(!metin) return;

  if(isNative()){
    metin.textContent = 'Kontrol ediliyor...';
    setTimeout(()=> _nativePushDurumKontrol(dot, metin), 2000);
    return;
  }

  if(!('Notification' in window)){
    metin.textContent = 'Bu tarayici bildirimleri desteklemiyor.';
    return;
  }
  if(Notification.permission === 'granted'){
    if(dot) dot.classList.add('on');
    metin.textContent = 'Bildirimler acik.';
  } else if(Notification.permission === 'denied'){
    metin.textContent = 'Bildirimler engellendi.';
  } else {
    metin.textContent = 'Bildirimler henuz acilmadi.';
  }
}

async function _nativePushDurumKontrol(dot, metin){
  try {
    const PushNotifications = await _getNativePush();
    const perm = await PushNotifications.checkPermissions();
    if(perm.receive === 'granted'){
      if(dot) dot.classList.add('on');
      metin.textContent = 'Bildirimler acik.';
    } else {
      metin.textContent = 'Bildirimler henuz acilmadi.';
    }
  } catch(e){
    metin.textContent = 'Bildirim durumu alinامadı.';
    console.warn('Push durum:', e.message);
  }
}

async function bildirimleriAc(){
  if(isNative()){
    await _nativeBildirimleriAc();
    return;
  }
  if(!messaging){ toast('Bu ortam push bildirimleri desteklemiyor.'); return; }
  try{
    const izin = await Notification.requestPermission();
    if(izin !== 'granted'){ toast('Bildirim izni verilmedi.'); pushDurumGuncelle(); return; }
    const kayit = await navigator.serviceWorker.register('/okul/firebase-messaging-sw.js');
    const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: kayit });
    if(!token){ toast('Token alinamadi.'); return; }
    await db.collection(COL.cihazlar).doc(encodeURIComponent(token)).set({
      token, eklenmeTarihi: new Date().toISOString(), tarayici: navigator.userAgent
    });
    toast('Bildirimler acildi.');
    pushDurumGuncelle();
  }catch(err){
    toast('Hata: '+err.message);
  }
}

async function _nativeBildirimleriAc(){
  try {
    const PushNotifications = await _getNativePush();

    let perm = await PushNotifications.checkPermissions();
    if(perm.receive === 'prompt'){
      perm = await PushNotifications.requestPermissions();
    }
    if(perm.receive !== 'granted'){
      toast('Bildirim izni verilmedi.');
      return;
    }

    PushNotifications.addListener('registration', async (tokenObj) => {
      const token = tokenObj.value;
      try {
        await db.collection(COL.cihazlar).doc(encodeURIComponent(token)).set({
          token, eklenmeTarihi: new Date().toISOString(), tarayici: 'Android-Native'
        });
        toast('Bildirimler acildi, cihaz kaydedildi.');
        pushDurumGuncelle();
      } catch(e){
        toast('Token kaydedilemedi: ' + e.message);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      toast('Kayit hatasi: ' + JSON.stringify(err));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      toast((notification.title||'Bildirim') + ': ' + (notification.body||''));
    });

    await PushNotifications.register();

  } catch(e){
    console.error('Native bildirim hatasi:', e);
    toast('Native bildirim hatasi: ' + e.message);
  }
}

function pushOnMessageDinleyiciKur(){
  if(isNative()) return;
  if(!messaging) return;
  messaging.onMessage(payload=>{
    const b = payload.notification||{};
    toast((b.title||'Bildirim') + ': ' + (b.body||''));
  });
}
