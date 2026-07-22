/* ================================================================
   js/core/services/kontrol-listeleri.service.js
   Yetki: liste TANIMI (ad/madde ekleme-silme-sıralama) sadece admin;
   bir öğretmenin KENDİ tamamlama işaretlemesi sadece Görüntüle yetkisi
   ister — bu, plan içeriğini değil kendi ilerlemesini değiştirir
   (bkz. yillik-plan.service.js'teki secim/not ile aynı mantık).
   ================================================================ */
const KontrolListeleriService = {
  _yaziYetkisiVar(){ return typeof duzenleyebilir==='function' && duzenleyebilir('kontrolListeleri'); },
  _goruntuleyebilir(){ return typeof gorebilir==='function' && gorebilir('kontrolListeleri'); },

  listeleriDinle(cb, hataCb){ return KontrolListeleriRepository.listeleriDinle(cb, hataCb); },
  listeEkle(veri){
    if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz'));
    return KontrolListeleriRepository.listeEkle(veri);
  },
  listeGuncelle(id, veri){
    if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz'));
    return KontrolListeleriRepository.listeGuncelle(id, veri);
  },
  listeSil(id){
    if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz'));
    return KontrolListeleriRepository.listeSil(id);
  },

  tamamlamaGetir(ogretmenId, listeId){ return KontrolListeleriRepository.tamamlamaGetir(ogretmenId, listeId); },
  tamamlamaKaydet(ogretmenId, listeId, tamamlananMaddeIdler){
    if(!this._goruntuleyebilir()){ if(typeof toast==='function') toast('Bu modülü kullanma yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
    return KontrolListeleriRepository.tamamlamaKaydet(ogretmenId, listeId, tamamlananMaddeIdler);
  },
  tumTamamlamalariDinle(listeId, cb, hataCb){
    if(!this._yaziYetkisiVar()) return null; // sadece admin özet görebilir
    return KontrolListeleriRepository.tumTamamlamalariDinle(listeId, cb, hataCb);
  },
};
