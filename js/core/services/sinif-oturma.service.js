/* ================================================================
   js/core/services/sinif-oturma.service.js
   SINIF İÇİ OTURMA PLANI MODÜLÜ — YETKİ KONTROLÜ

   Bu katman:
   - Her yazma işleminden önce duzenleyebilir('siniflar') kontrolü yapar
     (oturma planı, Sınıflar modülünün bir alt-verisidir — servis oturma
     planının 'tasima' iznine bağlı olması ile aynı ilke, bkz.
     servis-oturma.service.js).
   - db değişkenine DOĞRUDAN dokunmaz — sadece SinifOturmaRepository çağırır.
   ================================================================ */

const SinifOturmaService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('siniflar')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  planGetir(sinifId){
    return SinifOturmaRepository.planGetir(sinifId);
  },
  planDinle(sinifId, callback, hataCb){
    return SinifOturmaRepository.planDinle(sinifId, callback, hataCb);
  },
  planKaydet(sinifId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return SinifOturmaRepository.planKaydet(sinifId, veri);
  }
};
