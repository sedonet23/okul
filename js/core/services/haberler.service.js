/* ================================================================
   js/core/services/haberler.service.js
   HABERLER / DUYURULAR MODÜLÜ — YETKİ KONTROLÜ

   - Duyuru/kaynak yazma işlemlerinden önce duzenleyebilir('haberler')
     kontrolü yapar.
   - Cihaz bildirim kategori tercihi kişisel/cihaza özgü bir ayardır,
     içerik düzenleme yetkisi gerektirmez — bilerek kontrolsüz bırakıldı
     (orijinal davranışla aynı).
   - db değişkenine DOĞRUDAN dokunmaz — sadece HaberlerRepository çağırır.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const HaberlerService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('haberler')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  haberKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? HaberlerRepository.haberGuncelle(mevcutId, veri) : HaberlerRepository.haberEkle(veri);
  },
  haberSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return HaberlerRepository.haberSil(id);
  },
  kaynakKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? HaberlerRepository.kaynakGuncelle(mevcutId, veri) : HaberlerRepository.kaynakEkle(veri);
  },
  kaynakSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return HaberlerRepository.kaynakSil(id);
  },
  /* Yetki kontrolsüz — her kullanıcı kendi cihazının bildirim tercihini ayarlayabilir.
     COL.cihazlar'ın TEK Firestore erişim noktası PushRepository'dir (bkz. push.repository.js). */
  cihazKategoriTercihiKaydet(token, kategoriler){
    return PushRepository.kategorileriGuncelle(token, kategoriler);
  }
};
