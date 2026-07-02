/* ================================================================
   js/core/store.js
   HAFİF STATE YÖNETİMİ (AppStore)

   AMAÇ: Dağınık global değişkenler (AKTIF_KULLANICI, AKTIF_ROL vb.)
   yerine, anahtar bazlı, aboneliklenebilir tek bir state kaynağı.

   ÖNEMLİ — GERİYE DÖNÜK UYUMLULUK:
   Bu dosya, mevcut AKTIF_KULLANICI / AKTIF_ROL global değişkenlerini
   bu aşamada KALDIRMAZ veya DEĞİŞTİRMEZ. auth.js hâlâ eskisi gibi
   çalışmaya devam ediyor. AppStore, yeni yazılacak service/repository
   kodunun kullanacağı paralel bir yapı olarak eklendi. auth.js'in
   AppStore'u da güncelleyecek şekilde bağlanması, ayrı bir migration
   adımında (onay alınarak) yapılacak.

   Kullanım:
     AppStore.ayarla('kullanici', kullaniciObjesi);
     const k = AppStore.getir('kullanici');
     AppStore.abone('kullanici', (yeniDeger) => { ... });
   ================================================================ */

const AppStore = (function(){
  const durum = {
    kullanici: null,
    rol: null,
    tema: 'light'
  };
  const dinleyiciler = {}; // { anahtar: [fn, fn, ...] }

  return {
    getir(anahtar){
      return durum[anahtar];
    },
    ayarla(anahtar, deger){
      durum[anahtar] = deger;
      (dinleyiciler[anahtar] || []).forEach(fn => {
        try{ fn(deger); }catch(e){ console.error(`AppStore dinleyici hatası (${anahtar}):`, e); }
      });
    },
    abone(anahtar, fn){
      if(!dinleyiciler[anahtar]) dinleyiciler[anahtar] = [];
      dinleyiciler[anahtar].push(fn);
      // Abonelikten çıkma fonksiyonu döner
      return () => {
        dinleyiciler[anahtar] = dinleyiciler[anahtar].filter(f => f !== fn);
      };
    }
  };
})();
