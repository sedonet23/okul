/* ================================================================
   js/core/services/sinavlar.service.js
   SINAV İŞLEMLERİ MODÜLÜ — YETKİ KONTROLÜ (sinavlar + denemeSinavlari)

   Bu katman:
   - Her yazma işleminden önce duzenleyebilir('sinavIslemleri') kontrolü
     yapar (yetki anahtarı 'sinavlar' değil — bkz. js/kullanici-yonetimi.js,
     sekme id'si de 'tab-sinavIslemleri').
   - YAZILI SINAVLAR için ayrıca KAYIT SAHİPLİĞİ uygular: "Düzenle" yetkili
     bir kullanıcı bile, kendi eklemediği bir yazılı sınav kaydını
     düzenleyemez/silemez — sadece görüntüleyebilir. Süper admin ve
     sahipsiz (sahipUid'siz — eski/paylaşımlı) kayıtlar bu kısıtlamanın
     dışındadır. Deneme sınavlarında bu kısıtlama YOK (ortak kayıt).
   - db değişkenine DOĞRUDAN dokunmaz — sadece SinavlarRepository çağırır.
   - Hiçbir DOM işlemi yapmaz (confirm/prompt/modal UI katmanında kalır).
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const SinavlarService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('sinavIslemleri')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  /* Bir yazılı sınav kaydını mevcut kullanıcının düzenleyip düzenleyemeyeceğini
     belirler: admin her zaman düzenleyebilir; kaydın sahibi de düzenleyebilir;
     sahipUid hiç damgalanmamış (eski/ortak) kayıtlar da düzenlenebilir sayılır. */
  sinavDuzenlenebilirMi(s){
    if(!duzenleyebilir('sinavIslemleri')) return false;
    if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin) return true;
    if(!s || !s.sahipUid) return true; // sahipsiz/eski kayıt — herkese açık
    return !!(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && s.sahipUid === AKTIF_KULLANICI.uid);
  },

  /* ================= YAZILI SINAVLAR ================= */
  /* mevcutKayit: düzenleniyorsa mevcut sınav objesi (sahiplik kontrolü için) — yeni kayıtta null geçilir. */
  sinavKaydet(mevcutId, mevcutKayit, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(mevcutId){
      if(!this.sinavDuzenlenebilirMi(mevcutKayit)) return Promise.reject(new Error('sahip-degil'));
      return SinavlarRepository.sinavGuncelle(mevcutId, veri);
    }
    if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI){
      veri = { ...veri, sahipUid: AKTIF_KULLANICI.uid };
    }
    return SinavlarRepository.sinavEkle(veri);
  },
  sinavSil(id, mevcutKayit){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(!this.sinavDuzenlenebilirMi(mevcutKayit)) return Promise.reject(new Error('sahip-degil'));
    return SinavlarRepository.sinavSil(id);
  },

  /* ================= DENEME SINAVLARI ================= */
  denemeKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? SinavlarRepository.denemeGuncelle(mevcutId, veri) : SinavlarRepository.denemeEkle(veri);
  },
  denemeSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return SinavlarRepository.denemeSil(id);
  }
};
