/* ================================================================
   js/core/services/akademik-takvim.service.js
   Yetki: HERKES görebilir (girisYapmis yeterli — okulun genel çalışma
   takvimi, gizli bir şey değil); SADECE admin görseli değiştirebilir.
   ================================================================ */
const AkademikTakvimService = {
  _adminMi(){
    return typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true;
  },
  dinle(cb, hataCb){ return AkademikTakvimRepository.dinle(cb, hataCb); },

  async gorselYukle(dosya, ilerlemeCb, mevcut){
    if(!this._adminMi()){ if(typeof toast==='function') toast('Sadece admin görseli değiştirebilir.'); throw new Error('yetkisiz'); }
    const { url, storagePath } = await AkademikTakvimRepository.dosyaYukle(dosya, ilerlemeCb);
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : { ad: 'Admin' };
    await AkademikTakvimRepository.gorselKaydet({
      gorselUrl: url, storagePath,
      guncellenmeTarihi: firebase.firestore.FieldValue.serverTimestamp(),
      yukleyenAdi: kimlik.ad || 'Admin',
    });
    // Eski dosyayı Storage'dan temizle (yeni yükleme başarıyla kaydedildikten SONRA)
    if(mevcut && mevcut.storagePath && mevcut.storagePath !== storagePath){
      AkademikTakvimRepository.dosyaSil(mevcut.storagePath).catch(()=>{});
    }
  },
};
