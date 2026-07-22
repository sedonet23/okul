/* ================================================================
   js/core/services/sinav-sonuclari.service.js
   Yetki: "Tüm öğretmenler girebilsin" (kullanıcı kararı) — bu modülü
   Görüntüle yetkisiyle kullanan HERKES sınav oluşturabilir/düzenleyebilir/
   silebilir. Admin, rolden bu modülü tamamen gizleyerek erişimi
   kısıtlayabilir (bkz. Kullanıcı Yönetimi), ama açıksa herkes eşit yetkili.
   ================================================================ */
function SinavSonuclariServisOlustur(koleksiyonAdi, modulAdi){
  const repo = SinavSonuclariRepositoryOlustur(koleksiyonAdi);
  return {
    _yetkiVar(){ return typeof gorebilir==='function' && gorebilir(modulAdi); },
    sinavlariDinle(cb, hataCb){ return repo.sinavlariDinle(cb, hataCb); },
    sinavEkle(veri){
      if(!this._yetkiVar()){ if(typeof toast==='function') toast('Bu modülü kullanma yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
      return repo.sinavEkle(veri);
    },
    sinavGuncelle(id, veri){
      if(!this._yetkiVar()){ if(typeof toast==='function') toast('Bu modülü kullanma yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
      return repo.sinavGuncelle(id, veri);
    },
    sinavSil(id){
      if(!this._yetkiVar()){ if(typeof toast==='function') toast('Bu modülü kullanma yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
      return repo.sinavSil(id);
    },
  };
}
const DenemeSonuclariService = SinavSonuclariServisOlustur(COL.denemeSonuclari, 'denemeSonuclari');
const TestSonuclariService = SinavSonuclariServisOlustur(COL.testSonuclari, 'testSonuclari');
