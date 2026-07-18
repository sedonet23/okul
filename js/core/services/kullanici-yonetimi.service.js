/* ================================================================
   js/core/services/kullanici-yonetimi.service.js
   KULLANICI YÖNETİMİ MODÜLÜ — İŞ KURALLARI + YETKİ KONTROLÜ

   - Her yazma işleminden önce kullaniciYonetimiYetkisiVar() kontrolü
     yapar (genel duzenleyebilir(modul) sisteminden AYRI bir bayrak —
     bkz. js/kullanici-yonetimi.js).
   - "Role atanmış kullanıcı varsa silme" ve "kendi hesabını pasif
     yapamama" gibi iş kurallarını barındırır.
   - db değişkenine DOĞRUDAN dokunmaz — sadece KullaniciYonetimiRepository
     çağırır.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const KullaniciYonetimiService = {

  _yetkiKontrol(){
    if(!kullaniciYonetimiYetkisiVar()){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  /* ================= ROLLER ================= */
  rolKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? KullaniciYonetimiRepository.rolGuncelle(mevcutId, veri) : KullaniciYonetimiRepository.rolEkle(veri);
  },
  /* atanmisKullaniciSayisi: bu role atanmış kaç kullanıcı olduğu (UI'daki
     önbellekten hesaplanır) — varsa silme engellenir. */
  rolSil(id, atanmisKullaniciSayisi){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(atanmisKullaniciSayisi > 0) return Promise.reject(new Error('rol-kullanimda:' + atanmisKullaniciSayisi));
    return KullaniciYonetimiRepository.rolSil(id);
  },

  /* ================= KULLANICILAR ================= */
  /* kendiUid: işlemi yapan kullanıcının uid'i — kendi hesabını pasif
     yapmasını engellemek için. */
  kullaniciKaydet(uid, veri, kendiUid){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(uid === kendiUid && !veri.aktif) return Promise.reject(new Error('kendini-pasif-yapamaz'));
    return KullaniciYonetimiRepository.kullaniciGuncelle(uid, veri);
  },
  /* kendiUid: kendi hesabını silemesin diye (kilitli kalır). */
  kullaniciSil(uid, kendiUid){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(uid === kendiUid) return Promise.reject(new Error('kendini-silemez'));
    return KullaniciYonetimiRepository.kullaniciSil(uid);
  }
};
