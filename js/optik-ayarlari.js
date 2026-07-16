/* ====================================================================
   js/optik-ayarlari.js
   OPTİK OKUMA — LGS / BURSLULUK SINAVI DEĞERLENDİRME KATSAYILARI

   LGS ve Bursluluk sınavlarının yanlış cevap katsayısı RESMÎ bir MEB
   kuralıdır (net = doğru − yanlış/katsayı) — bu yüzden optik modülünün
   "Yeni Sınav" ekranında her seferinde tekrar sorulmuyor; okul çapında,
   sadece admin tarafından, buradan TEK SEFERLİK ayarlanıyor. Özel Sınav'ın
   (resmî bir formülü olmadığı için) kendi katsayı seçici hâlâ optik/
   içindeki "Yeni Sınav" ekranında duruyor (bkz. optik/index.html
   #ysYanlisEtkisi) — bu dosya SADECE LGS ve Bursluluk'u kapsar.

   optik/js/app.js yeniSinavKaydet() bu değerleri doğrudan localStorage'dan
   okur (optik ayrı bir iframe olsa da AYNI origin'de çalıştığı için
   localStorage paylaşılıyor — Firestore'a optik tarafından hiç dokunulmuyor).

   İki katmanlı saklama — js/proje-degerlendirme.js ile BİREBİR aynı desen:
     1) localStorage (birincil, cihaza özel, internetsiz de çalışır).
     2) oy_okulBilgileri/ayarlar (bulut, SADECE admin yazabilir) — ortak
        varsayılan; cihazda hiç kayıt yokken otomatik çekilir.
   ==================================================================== */

(function () {
  'use strict';

  const AYARLAR = {
    lgs:        { ls: 'optikLgsKatsayisi',        alan: 'optikLgsKatsayisi',        varsayilan: 3, secimId: 'optikLgsKatsayisiSecim' },
    bursluluk:  { ls: 'optikBurslulukKatsayisi',  alan: 'optikBurslulukKatsayisi',  varsayilan: 3, secimId: 'optikBurslulukKatsayisiSecim' },
  };

  function _adminMi() {
    return typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true;
  }

  function _bulutVarsayilaniniGetir(alan) {
    if (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari[alan] != null) {
      return okulBilgileriAyari[alan];
    }
    return null;
  }

  function _katsayiYukle(anahtarAdi) {
    const a = AYARLAR[anahtarAdi];
    try {
      const ham = localStorage.getItem(a.ls);
      if (ham !== null && ham !== '') return parseInt(ham, 10);
    } catch (e) { /* yoksay */ }
    const bulut = _bulutVarsayilaniniGetir(a.alan);
    return bulut != null ? bulut : a.varsayilan;
  }

  async function _katsayiKaydet(anahtarAdi, deger) {
    const a = AYARLAR[anahtarAdi];
    if (!_adminMi()) { toast('Bu işlem için yetkiniz yok.'); return; }
    try { localStorage.setItem(a.ls, String(deger)); } catch (e) { /* önemli değil */ }
    try {
      await db.collection(COL.okulBilgileri).doc('ayarlar').set({ [a.alan]: deger }, { merge: true });
      toast('Katsayı kaydedildi.');
    } catch (e) {
      toast('Bulutla senkronize edilemedi (bu cihazda kaydedildi): ' + e.message);
    }
  }

  function renderOptikAyarlari() {
    Object.keys(AYARLAR).forEach(anahtarAdi => {
      const secim = document.getElementById(AYARLAR[anahtarAdi].secimId);
      if (secim) secim.value = String(_katsayiYukle(anahtarAdi));
    });
  }

  window.optikKatsayiKaydetTikla = function (anahtarAdi) {
    const a = AYARLAR[anahtarAdi];
    if (!a) return;
    const secim = document.getElementById(a.secimId);
    if (!secim) return;
    const deger = parseInt(secim.value, 10);
    _katsayiKaydet(anahtarAdi, Number.isFinite(deger) ? deger : a.varsayilan);
  };
  window.renderOptikAyarlari = renderOptikAyarlari;
})();
