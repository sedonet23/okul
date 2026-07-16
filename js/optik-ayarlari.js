/* ====================================================================
   js/optik-ayarlari.js
   OPTİK OKUMA — SINAV DEĞERLENDİRME KATSAYISI (yanlış cevap etkisi)

   Daha önce optik modülünün "Yeni Sınav" ekranında HER sınav için ayrı
   ayrı sorulan bir alandı (bkz. optik/index.html eski "Yanlış Cevap
   Etkisi" bloğu) — artık okul çapında TEK bir varsayılan olarak, sadece
   admin tarafından, buradan yönetiliyor. optik/js/app.js yeniSinavKaydet()
   bu değeri doğrudan localStorage'dan okur (optik ayrı bir iframe olsa da
   AYNI origin'de çalıştığı için localStorage paylaşılıyor — Firestore'a
   optik tarafından hiç dokunulmuyor, mimari izolasyon bozulmuyor).

   İki katmanlı saklama — js/proje-degerlendirme.js ile BİREBİR aynı desen:
     1) localStorage (birincil, cihaza özel, internetsiz de çalışır).
     2) oy_okulBilgileri/ayarlar (bulut, SADECE admin yazabilir) — ortak
        varsayılan; cihazda hiç kayıt yokken otomatik çekilir.
   ==================================================================== */

(function () {
  'use strict';

  const LS_ANAHTAR = 'optikYanlisKatsayisi';
  const OKUL_AYAR_ALANI = 'optikYanlisKatsayisi';
  const VARSAYILAN = 0; // Etkisiz — yanlış cevap net'i düşürmez (bkz. kullanıcı isteği: varsayılan etkisiz olsun)

  function _adminMi() {
    return typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true;
  }

  function _bulutVarsayilaniniGetir() {
    if (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari[OKUL_AYAR_ALANI] != null) {
      return okulBilgileriAyari[OKUL_AYAR_ALANI];
    }
    return null;
  }

  function katsayiYukle() {
    try {
      const ham = localStorage.getItem(LS_ANAHTAR);
      if (ham !== null && ham !== '') return parseInt(ham, 10);
    } catch (e) { /* yoksay */ }
    const bulut = _bulutVarsayilaniniGetir();
    return bulut != null ? bulut : VARSAYILAN;
  }

  async function katsayiKaydet(deger) {
    if (!_adminMi()) { toast('Bu işlem için yetkiniz yok.'); return; }
    try { localStorage.setItem(LS_ANAHTAR, String(deger)); } catch (e) { /* önemli değil */ }
    try {
      await db.collection(COL.okulBilgileri).doc('ayarlar').set({ [OKUL_AYAR_ALANI]: deger }, { merge: true });
      toast('Sınav değerlendirme katsayısı kaydedildi.');
    } catch (e) {
      toast('Bulutla senkronize edilemedi (bu cihazda kaydedildi): ' + e.message);
    }
  }

  function renderOptikAyarlari() {
    const secim = document.getElementById('optikYanlisKatsayisiSecim');
    if (!secim) return;
    secim.value = String(katsayiYukle());
  }

  window.optikKatsayiKaydetTikla = function () {
    const secim = document.getElementById('optikYanlisKatsayisiSecim');
    if (!secim) return;
    const deger = parseInt(secim.value, 10);
    katsayiKaydet(Number.isFinite(deger) ? deger : VARSAYILAN);
  };
  window.renderOptikAyarlari = renderOptikAyarlari;
})();
