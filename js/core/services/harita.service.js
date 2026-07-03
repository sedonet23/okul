/* ================================================================
   js/core/services/harita.service.js
   HARİTA MODÜLÜ — YETKİ KONTROLÜ

   - Her yazma işleminden önce duzenleyebilir('harita') kontrolü yapar.
   - Güzergah kaydını (COL.servisler'i etkiler) TasimaRepository üzerinden
     yapar — bkz. harita.repository.js notu.
   - db değişkenine DOĞRUDAN dokunmaz.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const HaritaService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('harita')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  favoriEkle(veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return HaritaRepository.favoriEkle(veri);
  },
  favoriSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return HaritaRepository.favoriSil(id);
  },
  guzergahKaydet(servisId, mesafeKm, koordinatlar){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return TasimaRepository.servisGuncelle(servisId, {
      guzergahMesafe: mesafeKm,
      guzergahKoordinatlar: koordinatlar
    });
  }
};
