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
    if(typeof DepolamaSinirService !== 'undefined'){
      const izin = await DepolamaSinirService.yuklemeIzniVarMi('takvim', dosya.size);
      if(!izin.izinVar) throw new Error('depolama-siniri:' + izin.mesaj);
    }
    const { url, storagePath } = await AkademikTakvimRepository.dosyaYukle(dosya, ilerlemeCb);
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : { ad: 'Admin' };
    const yeniVeri = {
      gorselUrl: url, storagePath, dosyaBoyutu: dosya.size,
      guncellenmeTarihi: firebase.firestore.FieldValue.serverTimestamp(),
      yukleyenAdi: kimlik.ad || 'Admin',
    };
    await AkademikTakvimRepository.gorselKaydet(yeniVeri);
    if(typeof IstatistikService !== 'undefined') IstatistikService.depolamaKullanimEkle('takvim', dosya.size);
    // Eski dosyayı Storage'dan temizle (yeni yükleme başarıyla kaydedildikten SONRA)
    if(mevcut && mevcut.storagePath && mevcut.storagePath !== storagePath){
      AkademikTakvimRepository.dosyaSil(mevcut.storagePath).catch(()=>{});
      if(mevcut.dosyaBoyutu && typeof IstatistikService !== 'undefined') IstatistikService.depolamaKullanimCikar('takvim', mevcut.dosyaBoyutu);
    }
    return yeniVeri;
  },
};
