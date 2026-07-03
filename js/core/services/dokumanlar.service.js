/* ================================================================
   js/core/services/dokumanlar.service.js
   DÖKÜMANLAR MODÜLÜ — YETKİ KONTROLÜ

   - Her yazma işleminden önce duzenleyebilir('dokumanlar') kontrolü yapar.
   - db değişkenine DOĞRUDAN dokunmaz — sadece DokumanlarRepository çağırır.
   - Dosya okuma/IndexedDB işlemleri UI katmanında kalır (bkz. repository notu).
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const DokumanlarService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('dokumanlar')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  dokumanEkle(meta){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return DokumanlarRepository.dokumanEkle(meta);
  },
  dokumanSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return DokumanlarRepository.dokumanSil(id);
  }
};
