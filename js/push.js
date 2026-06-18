/* ====================================================================
   PUSH BİLDİRİM İZNİ VE CİHAZ KAYDI
   Kullanıcı "Bildirimleri Aç" butonuna bastığında tarayıcıdan bildirim
   izni istenir, bir FCM token alınır ve bu token Firestore'a kaydedilir.
   GitHub Actions üzerinde çalışan check-and-notify.js betiği, vadesi
   gelen hatırlatıcı/görevler için bu token'lara bildirim gönderir.
   ==================================================================== */

function pushDurumGuncelle(){
  const dot = document.getElementById('pushDot');
  const metin = document.getElementById('pushMetin');
  if(!('Notification' in window)){
    metin.textContent = 'Bu tarayıcı bildirimleri desteklemiyor.';
    return;
  }
  if(Notification.permission === 'granted'){
    dot.classList.add('on');
    metin.textContent = 'Bildirimler açık.';
  } else if(Notification.permission === 'denied'){
    metin.textContent = 'Bildirimler engellendi. Tarayıcı site ayarlarından izin vermeniz gerekiyor.';
  } else {
    metin.textContent = 'Bildirimler henüz açılmadı.';
  }
}

async function bildirimleriAc(){
  if(!messaging){ toast('Bu tarayıcı/ortam push bildirimlerini desteklemiyor.'); return; }
  try{
    const izin = await Notification.requestPermission();
    if(izin !== 'granted'){ toast('Bildirim izni verilmedi.'); pushDurumGuncelle(); return; }
    const kayit = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
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

function pushOnMessageDinleyiciKur(){
  if(!messaging) return;
  messaging.onMessage(payload=>{
    const baslik = payload.notification ? payload.notification.title : 'Bildirim';
    const govde = payload.notification ? payload.notification.body : '';
    toast(`${baslik}: ${govde}`);
  });
}

