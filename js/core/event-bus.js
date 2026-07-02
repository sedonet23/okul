/* ================================================================
   js/core/event-bus.js
   HAFİF, OPSİYONEL EVENT BUS

   AMAÇ: Modüllerin birbirinin iç detayını bilmeden, yan etki
   niteliğindeki işlemler için (bildirim, log, dashboard güncelleme
   gibi) haberleşebilmesi.

   KULLANIM İLKESİ (bkz. Pragmatik-Mimari-Tasarimi.md §4):
   - Aynı modül içindeki senkron akışlar İÇİN KULLANILMAZ
     (örn. "kaydet → doğrula → yaz → listeyi yenile" doğrudan
     fonksiyon çağrısı olarak kalır).
   - Sadece modüller arası, birbirini tanımaması gereken
     bağlantılarda kullanılır.
   - Bu dosya eklendiğinde HİÇBİR mevcut davranış değişmez;
     kullanılmaya başlanması ayrı, bilinçli kararlarla olur.

   Kullanım:
     EventBus.yayinla('evrak:olusturuldu', { evrakId, sinifId });
     EventBus.dinle('evrak:olusturuldu', (veri) => { ... });
   ================================================================ */

const EventBus = (function(){
  const dinleyiciler = {}; // { olayAdi: [fn, fn, ...] }

  return {
    yayinla(olayAdi, veri){
      (dinleyiciler[olayAdi] || []).forEach(fn => {
        try{ fn(veri); }catch(e){ console.error(`EventBus dinleyici hatası (${olayAdi}):`, e); }
      });
    },
    dinle(olayAdi, fn){
      if(!dinleyiciler[olayAdi]) dinleyiciler[olayAdi] = [];
      dinleyiciler[olayAdi].push(fn);
      return () => {
        dinleyiciler[olayAdi] = dinleyiciler[olayAdi].filter(f => f !== fn);
      };
    }
  };
})();
