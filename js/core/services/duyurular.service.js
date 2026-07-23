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
  duyuruSil(id, resimler){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    // Önce ekli görselleri Storage'dan temizle (biri başarısız olsa da
    // belge silme işlemi engellenmesin — yetim bir dosya, silinmiş bir
    // duyurudan daha az sorunlu).
    const gorselSilmeler = (resimler || []).map(r =>
      DuyurularRepository.resimSil(r.storagePath).catch(() => {}).then(()=>{
        if(r.boyut && typeof IstatistikService !== 'undefined') IstatistikService.depolamaKullanimCikar('duyuru', r.boyut);
      })
    );
    return Promise.all(gorselSilmeler).then(() => DuyurularRepository.duyuruSil(id));
  },

  /* ---------- Arşivleme (YENİ) ----------
     "Sil" artık normal akışta kullanılmıyor — duyuru kalıcı olarak
     kaybolmasın diye önce arşive kaldırılıyor (görünürlükten kalkıyor
     ama veri/görseller silinmiyor). Kalıcı silme sadece Arşiv ekranından
     yapılabilir (duyuruSil hâlâ o amaçla duruyor). */
  duyuruArsivle(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return DuyurularRepository.duyuruGuncelle(id, { arsivlendi: true, arsivTarihi: new Date().toISOString() });
  },
  duyuruArsivdenCikar(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return DuyurularRepository.duyuruGuncelle(id, { arsivlendi: false, arsivTarihi: null });
  },

  /* ---------- Görsel duyuru desteği (YENİ) ---------- */
  async resimYukle(dosya, ilerlemeCb){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(typeof DepolamaSinirService !== 'undefined'){
      const izin = await DepolamaSinirService.yuklemeIzniVarMi('duyuru', dosya.size);
      if(!izin.izinVar) return Promise.reject(new Error('depolama-siniri:' + izin.mesaj));
    }
    const sonuc = await DuyurularRepository.resimYukle(dosya, ilerlemeCb);
    if(typeof IstatistikService !== 'undefined') IstatistikService.depolamaKullanimEkle('duyuru', dosya.size);
    return { ...sonuc, boyut: dosya.size };
  },
  resimSil(storagePath, boyut){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(boyut && typeof IstatistikService !== 'undefined') IstatistikService.depolamaKullanimCikar('duyuru', boyut);
    return DuyurularRepository.resimSil(storagePath);
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
