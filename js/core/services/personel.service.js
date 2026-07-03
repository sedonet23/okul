/* ================================================================
   js/core/services/personel.service.js
   PERSONEL MODÜLÜ — İŞ KURALLARI + YETKİ KONTROLÜ (personel + personelIzinler)

   Bu katman:
   - Her yazma işleminden önce duzenleyebilir('personel') kontrolü yapar.
     (personelIzinler de aynı yetki anahtarını kullanır — ayrı bir
     yetki modülü tanımlı değil, bkz. js/kullanici-yonetimi.js)
   - TC kimlik no doğrulama gibi saf iş kurallarını barındırır.
   - db değişkenine DOĞRUDAN dokunmaz — sadece PersonelRepository çağırır.
   - Hiçbir DOM işlemi yapmaz (confirm/prompt/modal UI katmanında kalır).
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const PersonelService = {

  /* ---------- Yetki yardımcı ---------- */
  _yetkiKontrol(){
    if(!duzenleyebilir('personel')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  /* ================= SAF DOĞRULAMA (iş kuralı, DOM yok) ================= */
  tcGecerliMi(tc){
    return !tc || /^\d{11}$/.test(tc);
  },
  tarihAraligiGecerliMi(baslangic, bitis){
    return !!(baslangic && bitis) && bitis >= baslangic;
  },

  /* ================= PERSONEL ================= */
  personelKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? PersonelRepository.personelGuncelle(mevcutId, veri) : PersonelRepository.personelEkle(veri);
  },
  personelSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return PersonelRepository.personelSil(id);
  },

  /* ================= İZİN / RAPOR KAYITLARI ================= */
  izinKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? PersonelRepository.izinGuncelle(mevcutId, veri) : PersonelRepository.izinEkle(veri);
  },
  izinSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return PersonelRepository.izinSil(id);
  }
};
