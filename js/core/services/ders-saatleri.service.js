/* ================================================================
   js/core/services/ders-saatleri.service.js
   DERS SAATLERİ (ZİL ÇALMA) MODÜLÜ — YETKİ KONTROLÜ

   Bu katman:
   - Her yazma işleminden önce duzenleyebilir('ayarlar') kontrolü yapar
     (bu ekran genel "Ayarlar" sayfası altında yer alıyor — bkz.
     js/kullanici-yonetimi.js).
   - db değişkenine DOĞRUDAN dokunmaz — sadece DersSaatleriRepository çağırır.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const DersSaatleriService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('ayarlar')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  ayarlariKaydet(veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return DersSaatleriRepository.ayarlariKaydet(veri);
  }
};
