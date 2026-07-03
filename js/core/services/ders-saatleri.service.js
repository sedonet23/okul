/* ================================================================
   js/core/services/ders-saatleri.service.js
   DERS SAATLERİ (ZİL ÇALMA) MODÜLÜ — YETKİ KONTROLÜ

   Bu katman:
   - Her yazma işleminden önce duzenleyebilir('sistemAyarlari') kontrolü
     yapar. DÜZELTME: eskiden genel 'ayarlar' anahtarını kullanıyordu, ama
     bu ekran "Ayarlar" sayfasındaki tema/bildirim gibi herkese açık
     ayarlardan farklı olarak okul çapında bir SİSTEM ayarı — bu yüzden
     ayrı bir yetki anahtarına taşındı (bkz. js/kullanici-yonetimi.js
     MODUL_LISTESI 'sistemAyarlari').
   - db değişkenine DOĞRUDAN dokunmaz — sadece DersSaatleriRepository çağırır.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const DersSaatleriService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('sistemAyarlari')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  ayarlariKaydet(veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return DersSaatleriRepository.ayarlariKaydet(veri);
  }
};
