/* ================================================================
   js/core/services/duyurular.service.js
   DUYURU PANOSU MODÜLÜ — İŞ KURALLARI + YETKİ KONTROLÜ

   - Duyuru ekleme/düzenleme/silme için duzenleyebilir('duyurular')
     kontrolü yapar (Haberler modülünden AYRI bir yetki — sadece
     yöneticiler duyuru girebilsin isteniyor, RSS/haber yönetimiyle
     karıştırılmasın diye ayrı tutuldu).
   - "Okudum" işaretleme yetki gerektirmez — herkes kendi okuma kaydını
     bırakabilir (bu bir içerik düzenleme değil, kişisel bir eylemdir).
   - db değişkenine DOĞRUDAN dokunmaz — sadece DuyurularRepository çağırır.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const DuyurularService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('duyurular')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  duyuruKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(mevcutId) return DuyurularRepository.duyuruGuncelle(mevcutId, veri);
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : { ad: '' };
    return DuyurularRepository.duyuruEkle({
      ...veri,
      tarih: new Date().toISOString(),
      olusturanUid: (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null,
      olusturanAdi: kimlik.ad || 'Yönetici',
      okuyanlar: {}
    });
  },
  duyuruSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return DuyurularRepository.duyuruSil(id);
  },

  /* Herkes kendi "okudum" kaydını bırakabilir — içerik değiştirmediği için yetki gerektirmez. */
  okunduIsaretle(id){
    const uid = (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null;
    if(!uid) return Promise.reject(new Error('kimlik-yok'));
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : { ad: '' };
    return DuyurularRepository.okunduIsaretle(id, uid, { ad: kimlik.ad || 'Kullanıcı', tarih: new Date().toISOString() });
  },
  benOkudumMu(duyuru){
    const uid = (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null;
    return !!(uid && duyuru?.okuyanlar && duyuru.okuyanlar[uid]);
  }
};
