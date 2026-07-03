/* ================================================================
   js/core/services/cizelgeler.service.js
   ÇİZELGELER MODÜLÜ — İŞ KURALLARI + YETKİ KONTROLÜ

   Her "tip" (sosyalKulupler, sok, zumre, bepPlani, rehberlik, maarifRapor,
   belirliGunler, digerEvrak) js/kullanici-yonetimi.js'de KENDİ yetki
   anahtarına sahiptir — bu yüzden yetki kontrolü burada tip parametreli.

   - db değişkenine DOĞRUDAN dokunmaz — sadece CizelgelerRepository çağırır.
   - Hiçbir DOM işlemi yapmaz (confirm/prompt/modal UI katmanında kalır).
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const CizelgelerService = {

  _yetkiKontrol(tip){
    if(!duzenleyebilir(tip)){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  kayitKaydet(tip, mevcutId, veri){
    if(!this._yetkiKontrol(tip)) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? CizelgelerRepository.kayitGuncelle(tip, mevcutId, veri) : CizelgelerRepository.kayitEkle(tip, veri);
  },
  kayitSil(tip, id){
    if(!this._yetkiKontrol(tip)) return Promise.reject(new Error('yetkisiz'));
    return CizelgelerRepository.kayitSil(tip, id);
  },
  kontrolToggle(tip, id, kontroller){
    if(!this._yetkiKontrol(tip)) return Promise.reject(new Error('yetkisiz'));
    return CizelgelerRepository.kontrolleriGuncelle(tip, id, kontroller);
  },
  /* bepPlani / maarifRapor: birden çok sınıf seçilince her sınıf için ayrı
     kayıt oluşturur (eskiden js/cizelgeler.js içinde tekrar eden bir
     Promise dizisi olarak yazılıyordu). */
  async cokluKayitOlustur(tip, veriTabani, sinifAlanAdi, seciliSiniflar){
    if(!this._yetkiKontrol(tip)) throw new Error('yetkisiz');
    for(const sinif of seciliSiniflar){
      await CizelgelerRepository.kayitEkle(tip, { ...veriTabani, [sinifAlanAdi]: sinif });
    }
    return seciliSiniflar.length;
  }
};
