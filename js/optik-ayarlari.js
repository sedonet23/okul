/* ====================================================================
   js/optik-ayarlari.js
   OPTİK OKUMA — PUAN REFERANS AYARLARI (LGS / Bursluluk)

   Önceden optik modülünün kendi "Sınavlar" ekranındaki ⋮ menüsünden
   (bkz. optik/js/app.js eski puanReferansSheetAc/sheetPuanReferans)
   herkes tarafından değiştirilebilen bir ayardı — MEB'in açıkladığı
   Türkiye ortalaması/standart sapma/MinTASP-MaxTASP gibi resmî istatistik
   verileri olduğu için artık SADECE admin tarafından, buradan yönetiliyor.

   Optik'in KENDİ hesaplama kodu (DB.puanReferansGetir/Kaydet,
   lgsPuanHesapla.js) hiç değiştirilmedi — bu ekran optik'in ZATEN
   kullandığı AYNI localStorage anahtarlarına (oy_op_puanref_lgs,
   oy_op_puanref_bursluluk) doğrudan yazıyor. Optik ayrı bir iframe olsa
   da AYNI origin'de çalıştığı için bu anahtarlar paylaşılıyor —
   optik/js/app.js içinde HİÇBİR değişiklik gerekmedi.

   Ders listesi + katsayılar optik'in KENDİ modüllerinden (layoutEngine.js,
   lgsPuanHesapla.js — bu sayfada da <script> ile yüklü, bkz. index.html)
   türetiliyor, burada AYRICA elle kopyalanmıyor — liste optik'te
   değişirse burada da otomatik güncel kalır.

   İki katmanlı saklama — js/proje-degerlendirme.js ile aynı desen, TEK
   fark: birincil katman optik'in KENDİ anahtarı (localStorage'da zaten
   JSON nesnesi olarak duruyor, ayrıca bir LS_ANAHTAR icat edilmedi):
     1) localStorage (oy_op_puanref_<tür> — optik'in kendi formatı).
     2) oy_okulBilgileri/ayarlar (bulut, SADECE admin yazabilir) — ortak
        varsayılan; cihazda hiç kayıt yokken otomatik çekilir.
   ==================================================================== */

(function () {
  'use strict';

  const TURLER = ['lgs', 'bursluluk'];

  function _adminMi() {
    return typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true;
  }

  function _lsAnahtar(sinavTuru) { return 'oy_op_puanref_' + sinavTuru; }
  function _bulutAlani(sinavTuru) { return 'optikPuanReferans_' + sinavTuru; }

  function _bosAyar() { return { dersIstatistik: {}, minTasp: null, maxTasp: null }; }

  function _bulutVarsayilaniniGetir(sinavTuru) {
    if (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari[_bulutAlani(sinavTuru)]) {
      return okulBilgileriAyari[_bulutAlani(sinavTuru)];
    }
    return null;
  }

  function _ayariYukle(sinavTuru) {
    try {
      const ham = localStorage.getItem(_lsAnahtar(sinavTuru));
      if (ham) return JSON.parse(ham);
    } catch (e) { /* yoksay */ }
    return _bulutVarsayilaniniGetir(sinavTuru) || _bosAyar();
  }

  async function _ayariKaydet(sinavTuru, ayar) {
    if (!_adminMi()) { toast('Bu işlem için yetkiniz yok.'); return; }
    try { localStorage.setItem(_lsAnahtar(sinavTuru), JSON.stringify(ayar)); } catch (e) { /* önemli değil */ }
    try {
      await db.collection(COL.okulBilgileri).doc('ayarlar').set({ [_bulutAlani(sinavTuru)]: ayar }, { merge: true });
      toast((sinavTuru === 'bursluluk' ? 'Bursluluk' : 'LGS') + ' puan referansları kaydedildi.');
    } catch (e) {
      toast('Bulutla senkronize edilemedi (bu cihazda kaydedildi): ' + e.message);
    }
  }

  /** optik/js/app.js _formTuruDersleriniGetir() ile AYNI türetme — optik'in
   *  kendi layoutEngine.js'i burada da yüklü olduğu için tek kaynaktan gelir. */
  function _dersleriGetir(sinavTuru) {
    try {
      const layout = window.LayoutEngine.layoutHesapla({ sinavTuru });
      const form = layout.formlar[0];
      if (form.bolumler) {
        const dersler = [];
        form.bolumler.forEach(b => b.dersSutunlari.forEach(d => dersler.push({ dersAdi: d.dersAdi })));
        return dersler;
      } else if (form.izgara) {
        return [{ dersAdi: 'Genel' }];
      }
    } catch (e) { console.warn('[OptikAyarlari] Ders listesi alınamadı', e); }
    return [];
  }

  function _icerikHtml(sinavTuru) {
    const dersler = _dersleriGetir(sinavTuru);
    const ayar = _ayariYukle(sinavTuru);
    const ortEtiket = sinavTuru === 'bursluluk' ? 'Referans Ortalama (geçmiş yıl/tahmini)' : 'Türkiye Ortalaması';

    const dersSatirlari = dersler.map(d => {
      const kayitli = (ayar.dersIstatistik || {})[d.dersAdi] || {};
      const katsayi = (typeof window.LgsPuanHesapla !== 'undefined' && window.LgsPuanHesapla.dersKatsayisi)
        ? window.LgsPuanHesapla.dersKatsayisi(d.dersAdi, sinavTuru) : '?';
      return `
        <div class="lgs-ayar-ders-satir">
          <span class="lgs-ayar-ders-baslik">${escapeHtml(d.dersAdi)} <small style="color:var(--ink-muted);font-weight:400;">(katsayı ${katsayi})</small></span>
          <div class="lgs-ayar-inputlar">
            <label>${escapeHtml(ortEtiket)}
              <input type="number" step="0.01" class="opr-ort" data-ders="${escapeHtml(d.dersAdi)}" data-tur="${sinavTuru}" value="${kayitli.ortalama ?? ''}" placeholder="tahmini">
            </label>
            <label>Standart Sapma
              <input type="number" step="0.01" class="opr-std" data-ders="${escapeHtml(d.dersAdi)}" data-tur="${sinavTuru}" value="${kayitli.stdSapma ?? ''}" placeholder="tahmini">
            </label>
          </div>
        </div>`;
    }).join('');

    return `
      ${dersSatirlari}
      <div class="lgs-ayar-genel-satir">
        <label>MinTASP
          <input type="number" step="0.01" class="opr-mintasp" data-tur="${sinavTuru}" value="${ayar.minTasp ?? ''}" placeholder="tahmini">
        </label>
        <label>MaxTASP
          <input type="number" step="0.01" class="opr-maxtasp" data-tur="${sinavTuru}" value="${ayar.maxTasp ?? ''}" placeholder="tahmini">
        </label>
      </div>
      <button type="button" class="btn btn-amber btn-sm" style="margin-top:10px;" onclick="_optikPuanReferansKaydetTikla('${sinavTuru}')">Kaydet</button>
    `;
  }

  window._optikPuanReferansKaydetTikla = function (sinavTuru) {
    const kap = document.getElementById(sinavTuru === 'bursluluk' ? 'optikPuanReferansBurslulukAlan' : 'optikPuanReferansLgsAlan');
    if (!kap) return;
    const dersIstatistik = {};
    kap.querySelectorAll('.opr-ort').forEach(input => {
      const dersAdi = input.dataset.ders;
      const stdInput = kap.querySelector(`.opr-std[data-ders="${CSS.escape(dersAdi)}"]`);
      const ort = input.value.trim(), std = stdInput?.value.trim();
      if (ort !== '' && std !== '') dersIstatistik[dersAdi] = { ortalama: parseFloat(ort), stdSapma: parseFloat(std) };
    });
    const minTaspVal = kap.querySelector('.opr-mintasp')?.value.trim();
    const maxTaspVal = kap.querySelector('.opr-maxtasp')?.value.trim();
    _ayariKaydet(sinavTuru, {
      dersIstatistik,
      minTasp: minTaspVal !== '' ? parseFloat(minTaspVal) : null,
      maxTasp: maxTaspVal !== '' ? parseFloat(maxTaspVal) : null,
    });
  };

  window.optikPuanReferansSekmeSec = function (sinavTuru) {
    TURLER.forEach(t => {
      const alan = document.getElementById(t === 'bursluluk' ? 'optikPuanReferansBurslulukAlan' : 'optikPuanReferansLgsAlan');
      const btn = document.querySelector(`[data-opr-sekme="${t}"]`);
      if (alan) alan.style.display = (t === sinavTuru) ? '' : 'none';
      if (btn) btn.classList.toggle('active', t === sinavTuru);
    });
  };

  function renderOptikAyarlari() {
    const lgsAlan = document.getElementById('optikPuanReferansLgsAlan');
    const burslulukAlan = document.getElementById('optikPuanReferansBurslulukAlan');
    if (!lgsAlan && !burslulukAlan) return;
    if (lgsAlan) lgsAlan.innerHTML = _icerikHtml('lgs');
    if (burslulukAlan) burslulukAlan.innerHTML = _icerikHtml('bursluluk');
  }

  window.renderOptikAyarlari = renderOptikAyarlari;
})();
