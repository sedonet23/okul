/* ================================================================
   js/core/services/servis-oturma.service.js
   SERVİS OTURMA PLANI MODÜLÜ — YETKİ KONTROLÜ

   Bu katman:
   - Her yazma işleminden önce duzenleyebilir('tasima') kontrolü yapar
     (servis oturma planı, taşıma modülünün bir alt-verisidir — ayrı bir
     yetki anahtarı tanımlı değil, bkz. js/kullanici-yonetimi.js).
   - db değişkenine DOĞRUDAN dokunmaz — sadece ServisOturmaRepository çağırır.
   - Yerleşim/koltuk şablon mantığı (SO_SABLONLAR) render katmanına sıkı
     bağlı olduğu için bilinçli olarak js/servis-oturma.js içinde bırakıldı
     (bkz. Pragmatik-Mimari-Tasarimi.md §7 — nöbet Excel içe aktarmadaki
     dosya okuma/ayrıştırma için uygulanan pragmatik ayrım ile aynı ilke).
   ================================================================ */

const ServisOturmaService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('tasima')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  planKaydet(servisId, veri, merge){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return ServisOturmaRepository.planKaydet(servisId, veri, merge);
  },
  planGuncelle(servisId, kismiVeri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return ServisOturmaRepository.planGuncelle(servisId, kismiVeri);
  }
};
