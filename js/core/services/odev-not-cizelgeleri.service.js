/* ================================================================
   js/core/services/odev-not-cizelgeleri.service.js
   ÖDEV TAKİP + NOT ÇİZELGESİ — İŞ KURALLARI + SAHİPLİK KONTROLÜ

   NOT: Diğer çizelgeler (cizelgeler.service.js) ROL bazlı yetki kontrolü
   kullanıyor (paylaşılan/herkese açık kayıtlar). Bu ikisi ise KİŞİSEL —
   yetki kontrolü rol değil SAHİPLİK'e dayanıyor: sadece oluşturan
   öğretmen (sahipUid) veya admin düzenleyebilir/silebilir.

   - db değişkenine DOĞRUDAN dokunmaz — sadece Repository çağırır.
   - Hiçbir DOM işlemi yapmaz (confirm/toast UI katmanında kalır).
   ================================================================ */

const OdevNotCizelgeleriService = {
  sahibiMiyimYaAdminMiyim(kayit){
    if(typeof AKTIF_KULLANICI === 'undefined' || !AKTIF_KULLANICI) return false;
    if(AKTIF_KULLANICI.admin === true) return true;
    return !!kayit && kayit.sahipUid === AKTIF_KULLANICI.uid;
  },

  _sahiplikKontrol(kayit){
    if(!this.sahibiMiyimYaAdminMiyim(kayit)){
      toast('Bu çizelgeyi sadece oluşturan öğretmen veya yönetici düzenleyebilir.');
      return false;
    }
    return true;
  },

  /** Yeni çizelge oluştur — sahipUid otomatik olarak aktif kullanıcıya atanır. */
  cizelgeOlustur(tip, veri){
    if(typeof AKTIF_KULLANICI === 'undefined' || !AKTIF_KULLANICI){
      toast('Çizelge oluşturmak için giriş yapmış olmalısınız.');
      return Promise.reject(new Error('girissiz'));
    }
    return OdevNotCizelgeleriRepository.kayitEkle(tip, { ...veri, sahipUid: AKTIF_KULLANICI.uid });
  },

  cizelgeSil(tip, kayit){
    if(!this._sahiplikKontrol(kayit)) return Promise.reject(new Error('yetkisiz'));
    return OdevNotCizelgeleriRepository.kayitSil(tip, kayit.id);
  },

  cizelgeAdiGuncelle(tip, kayit, yeniAd){
    if(!this._sahiplikKontrol(kayit)) return Promise.reject(new Error('yetkisiz'));
    return OdevNotCizelgeleriRepository.alanGuncelle(tip, kayit.id, 'ad', yeniAd);
  },

  /** Sütun (ödev/değerlendirme kalemi) ekle — başlık + opsiyonel tarih. */
  sutunEkle(tip, kayit, baslik, tarih){
    if(!this._sahiplikKontrol(kayit)) return Promise.reject(new Error('yetkisiz'));
    const yeniSutun = { id: 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), baslik, tarih: tarih || null };
    const sutunlar = [...(kayit.sutunlar || []), yeniSutun];
    return OdevNotCizelgeleriRepository.alanGuncelle(tip, kayit.id, 'sutunlar', sutunlar);
  },
  sutunSil(tip, kayit, sutunId){
    if(!this._sahiplikKontrol(kayit)) return Promise.reject(new Error('yetkisiz'));
    const sutunlar = (kayit.sutunlar || []).filter(s => s.id !== sutunId);
    return OdevNotCizelgeleriRepository.alanGuncelle(tip, kayit.id, 'sutunlar', sutunlar);
  },

  /** Öğrenci ekle (sınıf listesinden otomatik gelenlere ek olarak elle). */
  ogrenciEkle(tip, kayit, ad){
    if(!this._sahiplikKontrol(kayit)) return Promise.reject(new Error('yetkisiz'));
    const yeniOgrenci = { id: 'o_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ad };
    const ogrenciler = [...(kayit.ogrenciler || []), yeniOgrenci];
    return OdevNotCizelgeleriRepository.alanGuncelle(tip, kayit.id, 'ogrenciler', ogrenciler);
  },
  ogrenciSil(tip, kayit, ogrenciId){
    if(!this._sahiplikKontrol(kayit)) return Promise.reject(new Error('yetkisiz'));
    const ogrenciler = (kayit.ogrenciler || []).filter(o => o.id !== ogrenciId);
    return OdevNotCizelgeleriRepository.alanGuncelle(tip, kayit.id, 'ogrenciler', ogrenciler);
  },

  /** Tek hücreyi güncelle (ödev durumu / not). deger=null ise hücre boşa döner. */
  hucreGuncelle(tip, kayit, ogrenciId, sutunId, deger){
    if(!this._sahiplikKontrol(kayit)) return Promise.reject(new Error('yetkisiz'));
    return OdevNotCizelgeleriRepository.hucreGuncelle(tip, kayit.id, ogrenciId + '_' + sutunId, deger);
  }
};
