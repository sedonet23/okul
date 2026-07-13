/* =============================================
   js/dilekce.js
   PERSONEL DİLEKÇE SİSTEMİ
   A4, yazdırmaya tam uyumlu, resmi dilekçe formatı.
   Bağımlılıklar: firebase-init.js, personel.js, app.js

   Mimari not (bkz. docs/Pragmatik-Mimari-Tasarimi.md §2): Bu modül
   hiçbir Firestore okuma/yazma işlemi yapmaz — yalnızca personel.js'ten
   gelen personel verisiyle istemci tarafında dilekçe HTML'i üretir ve
   yazdırır. Bu nedenle repository/service katmanı gerektirmiyor.
   ============================================= */

(function() {
  'use strict';

  const IZIN_TURLERI = [
    'Yıllık İzin', 'Mazeret İzni', 'Hastalık İzni', 'Ücretsiz İzin',
    'Refakat İzni', 'Doğum İzni', 'Babalık İzni', 'Diğer'
  ];

  // YENİ: Dilekçe sistemi artık sadece personel izin dilekçesiyle sınırlı
  // değil — birden fazla dilekçe TÜRÜ arasında seçim yapılabiliyor. Her
  // türün kendi form alanları, otomatik gövde metni ve kayıtlı varsayılan
  // şablonu var (bkz. DILEKCE_TURLERI, _formPanelHtml*, _dilekceSayfaHtml*).
  const DILEKCE_TURLERI = [
    { key: 'personelIzin', ad: 'Personel İzin Dilekçesi' },
    { key: 'diplomaKayit', ad: 'Diploma Kayıt Örneği Talep Dilekçesi' },
    { key: 'diplomaKayitCevap', ad: 'Diploma Kayıt Örneği (Okul Cevabı)' }
  ];

  // --- Sayıyı Türkçe yazıya çevirme (1-999 arası izin süreleri için yeterli) ---
  const BIRLER = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
  const ONLAR  = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];

  function sayiyiYaziyaCevir(n) {
    n = parseInt(n, 10);
    if (isNaN(n) || n <= 0) return '';
    if (n < 100) {
      const onlarBasamak = Math.floor(n / 10);
      const birlerBasamak = n % 10;
      const onlarKelime = ONLAR[onlarBasamak] || '';
      const birlerKelime = BIRLER[birlerBasamak] || '';
      return [onlarKelime, birlerKelime].filter(Boolean).join(' ');
    }
    if (n === 100) return 'yüz';
    if (n < 1000) {
      const yuzlerBasamak = Math.floor(n / 100);
      const kalan = n % 100;
      const yuzlerKelime = (yuzlerBasamak === 1 ? 'yüz' : BIRLER[yuzlerBasamak] + ' yüz');
      return [yuzlerKelime, sayiyiYaziyaCevir(kalan)].filter(Boolean).join(' ');
    }
    return String(n); // çok büyük sayılar için fallback
  }

  // --- Yardımcılar ---

  function _getOkulBilgisi() {
    const okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi)
      ? okulBilgileriAyari.okulAdi : 'KORUK ORTAOKULU';
    const il = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.il) || '';
    const ilce = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.ilce) || '';
    const mebMudurlugu = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.mebMudurlugu) || '';
    return { okulAdi, il, ilce, mebMudurlugu };
  }

  // --- Durum ---
  let _personelId = null;
  let _personel = null;
  let _baslangicTuru = 'personelIzin';

  // --- HTML üretimi ---

  function _otomatikGovdeMetni(state) {
    const sure = parseInt(state.sure, 10) || 0;
    const sureYazi = sayiyiYaziyaCevir(sure);
    return `     Okulunuzda ${state.gorev || '...........................'} olarak görev yapmaktayım. ` +
      `${state.baslamaTarihi || '....../....../............'} tarihinden itibaren ` +
      `${sure || '......'} (${sureYazi || '..........'}) gün ` +
      `${state.izinTuru || '...........................'} hakkımı kullanmak istiyorum.`;
  }

  function _otomatikGovdeMetniDiploma(state, okulAdi) {
    const okul = okulAdi || '...........................';
    return `${state.mezuniyetTarihi || '....../....../............'} tarihinde ${okul}'ndan mezun oldum. ` +
      `Diplomamı kaybettiğimden tarafıma diploma kayıt örneği düzenlenmesi hususunda;`;
  }

  function _otomatikGovdeMetniDiplomaCevap(state, okulAdi) {
    const okul = okulAdi || '...........................';
    const kizOglu = state.kizOglu || 'kızı/oğlu';
    return `Dilekçe sahibi ${state.tc || '..........................'} T.C. Kimlik Nolu, ` +
      `${state.dogumTarihi || '....../....../............'} doğumlu, ` +
      `${state.babaAdi || '...........................'} ${kizOglu} ${state.adSoyad || '...........................'}'ın ` +
      `${okul}'ndan (${state.ogrenimSuresi || '.....'} yıllık) ` +
      `${state.diplomaTarihi || '....../....../............'} tarih ve ${state.diplomaSayisi || '............'} sayılı ` +
      `diplomayı almaya hak kazandığı resmi kayıtların incelenmesinden anlaşılmıştır.`;
  }

  function _varsayilanMuduAdi() {
    const okul = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari) || {};
    return (okul.mudurId && typeof ogretmenAdi === 'function') ? (ogretmenAdi(okul.mudurId) || '') : '';
  }

  function _dilekceStilBlogu(hizalamaCss) {
    return `
  @page { size: A4 portrait; margin: 25mm 25mm 20mm 30mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
    background: #fff;
  }

  [contenteditable="true"] { outline: none; cursor: text; }
  #dlkSayfaIcerik:hover { background: rgba(46,125,50,0.03); }
  #dlkSayfaIcerik:focus { background: rgba(46,125,50,0.05); }

  .dlk-ust-baslik {
    text-align: center;
    margin-bottom: 40mm;
  }
  .dlk-okul-adi { font-weight: 700; text-transform: uppercase; }
  .dlk-il { font-weight: 700; text-transform: uppercase; margin-top: 2px; }

  .dlk-govde {
    ${hizalamaCss}
    margin-bottom: 10mm;
  }

  .dlk-kapanis {
    margin-bottom: 18mm;
  }

  .dlk-imza-blok {
    text-align: right;
    margin-bottom: 26mm;
  }
  .dlk-tarih { margin-bottom: 2mm; }
  .dlk-imza-bosluk { height: 16mm; }
  .dlk-ad-soyad { font-weight: 400; }

  .dlk-alt-bilgi { text-align: left; line-height: 1.9; }
  .dlk-alt-bilgi div { margin-bottom: 1mm; }

  .dlk-diploma-baslik { text-align:center; font-weight:700; text-decoration:underline; margin: 2mm 0 6mm; }
  .dlk-bilgi-tablosu { margin-bottom: 8mm; border-collapse: collapse; }
  .dlk-bilgi-tablosu td { padding: 1.2mm 0; vertical-align: top; }
  .dlk-bilgi-etiket { font-weight: 700; padding-right: 6mm; white-space: nowrap; }
  .dlk-bilgi-iki-nokta { padding-right: 4mm; }

  .dlk-alt-satir { display:flex; justify-content:space-between; align-items:flex-start; gap:10mm; margin-bottom:26mm; }
  .dlk-adres-blok { text-align:left; flex:1 1 auto; }
  .dlk-alt-satir .dlk-imza-blok { text-align:right; margin-bottom:0; flex:0 0 auto; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #dlkSayfaIcerik:hover, #dlkSayfaIcerik:focus { background: transparent; }
  }
`;
  }

  function _dlkScriptBlogu() {
    return `
    document.getElementById('dlkSayfaIcerik').addEventListener('input', function(){
      window.parent.postMessage({ tip: 'dlkIcerikDuzenlendi', deger: this.innerHTML }, '*');
    });
`;
  }

  // Kullanıcının tamamen elle düzenlediği içeriği (innerHTML) aynı stil/script sarmalayıcısına koyup
  // tam bir HTML belgesi üretir.
  function _sablonSar(icerikHtml, hizalama) {
    const hizalamaCss = {
      'iki-yana': 'text-align: justify; text-align-last: left;',
      'sola':     'text-align: left;',
      'ortala':   'text-align: center;'
    }[hizalama] || 'text-align: justify; text-align-last: left;';

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>Dilekçe</title>
<style>${_dilekceStilBlogu(hizalamaCss)}</style>
</head>
<body>
  <div id="dlkSayfaIcerik" contenteditable="true">${icerikHtml}</div>
  <script>${_dlkScriptBlogu()}</script>
</body>
</html>`;
  }

  function _dilekceSayfaHtml(state) {
    // Kullanıcı sayfanın tamamını elle düzenlediyse, o HTML'i aynen geri bas —
    // değişken alanlar artık üretilmiyor, tamamen kullanıcının kontrolünde.
    if (state.tamIcerikManuel !== null && state.tamIcerikManuel !== undefined) {
      return _sablonSar(state.tamIcerikManuel, state.hizalama || 'iki-yana');
    }

    const hizalama = state.hizalama || 'iki-yana';
    const hizalamaCss = {
      'iki-yana': 'text-align: justify; text-align-last: left;',
      'sola':     'text-align: left;',
      'ortala':   'text-align: center;'
    }[hizalama] || 'text-align: justify; text-align-last: left;';

    const { icerikHtml, baslik } = (state.dilekceTuru === 'diplomaKayitCevap')
      ? _dilekceIcerikDiplomaCevap(state)
      : (state.dilekceTuru === 'diplomaKayit')
        ? _dilekceIcerikDiploma(state)
        : _dilekceIcerikPersonelIzin(state);

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(baslik)}</title>
<style>${_dilekceStilBlogu(hizalamaCss)}</style>
</head>
<body>
  <div id="dlkSayfaIcerik" contenteditable="true">${icerikHtml}</div>
  <script>${_dlkScriptBlogu()}</script>
</body>
</html>`;
  }

  function _dilekceIcerikPersonelIzin(state) {
    const okul = _getOkulBilgisi();
    const okulAdi = (state.okulAdiManuel || okul.okulAdi || '').toLocaleUpperCase('tr');
    const il = (okul.il || '').toLocaleUpperCase('tr');

    const govdeMetni = (state.govdeManuel !== null && state.govdeManuel !== undefined)
      ? state.govdeManuel
      : _otomatikGovdeMetni(state);

    const kapanisMetni = '        Gereğini olurlarınıza arz ederim.';
    const tarihMetni = '....../....../............';

    const icerikHtml = `
    <div class="dlk-ust-baslik">
      <div class="dlk-okul-adi">${escapeHtml(okulAdi)} MÜDÜRLÜĞÜNE</div>
      <div class="dlk-il">${escapeHtml(il)}</div>
    </div>

    <div class="dlk-govde">${escapeHtml(govdeMetni)}</div>

    <div class="dlk-kapanis">${escapeHtml(kapanisMetni)}</div>

    <div class="dlk-imza-blok">
      <div class="dlk-tarih">${escapeHtml(tarihMetni)}</div>
      <div class="dlk-imza-bosluk">&nbsp;</div>
      <div class="dlk-ad-soyad">${escapeHtml(state.adSoyad||'')}</div>
    </div>

    <div class="dlk-alt-bilgi">
      <div>TC: ${escapeHtml(state.tc||'')}</div>
      <div>Cep No: ${escapeHtml(state.telefon||'')}</div>
      <div>Adres: ${escapeHtml(state.adres||'')}</div>
    </div>
`;
    return { icerikHtml, baslik: `${state.adSoyad||'Personel'} — Dilekçe` };
  }

  function _dilekceIcerikDiploma(state) {
    const okul = _getOkulBilgisi();
    const okulAdi = (state.okulAdiManuel || okul.okulAdi || '').toLocaleUpperCase('tr');
    const il = (okul.il || '').toLocaleUpperCase('tr');

    const govdeMetni = (state.govdeManuel !== null && state.govdeManuel !== undefined)
      ? state.govdeManuel
      : _otomatikGovdeMetniDiploma(state, state.okulAdiManuel || okul.okulAdi || '');

    const kapanisMetni = '     Gereğini arz ederim.';
    const tarihMetni = '....../....../............';

    const icerikHtml = `
    <div class="dlk-ust-baslik">
      <div class="dlk-okul-adi">${escapeHtml(okulAdi)} MÜDÜRLÜĞÜNE</div>
      <div class="dlk-il">${escapeHtml(il)}</div>
    </div>

    <div class="dlk-diploma-baslik">Dilekçe Sahibinin;</div>
    <table class="dlk-bilgi-tablosu">
      <tr><td class="dlk-bilgi-etiket">T.C. Kimlik No.su</td><td class="dlk-bilgi-iki-nokta">:</td><td>${escapeHtml(state.tc||'')}</td></tr>
      <tr><td class="dlk-bilgi-etiket">Adı ve Soyadı</td><td class="dlk-bilgi-iki-nokta">:</td><td>${escapeHtml(state.adSoyad||'')}</td></tr>
      <tr><td class="dlk-bilgi-etiket">Baba Adı</td><td class="dlk-bilgi-iki-nokta">:</td><td>${escapeHtml(state.babaAdi||'')}</td></tr>
      <tr><td class="dlk-bilgi-etiket">Anne Adı</td><td class="dlk-bilgi-iki-nokta">:</td><td>${escapeHtml(state.anneAdi||'')}</td></tr>
      <tr><td class="dlk-bilgi-etiket">Doğum Yeri</td><td class="dlk-bilgi-iki-nokta">:</td><td>${escapeHtml(state.dogumYeri||'')}</td></tr>
      <tr><td class="dlk-bilgi-etiket">Doğum Tarihi</td><td class="dlk-bilgi-iki-nokta">:</td><td>${escapeHtml(state.dogumTarihi||'')}</td></tr>
      <tr><td class="dlk-bilgi-etiket">Mezun Olduğu Sınıf</td><td class="dlk-bilgi-iki-nokta">:</td><td>${escapeHtml(state.mezunSinif||'')}</td></tr>
    </table>

    <div class="dlk-govde">${escapeHtml(govdeMetni)}</div>
    <div class="dlk-kapanis">${escapeHtml(kapanisMetni)}</div>

    <div class="dlk-alt-satir">
      <div class="dlk-adres-blok">Adres: ${escapeHtml(state.adres||'')}</div>
      <div class="dlk-imza-blok">
        <div>imza</div>
        <div class="dlk-tarih" style="margin-top:2mm;">${escapeHtml(tarihMetni)}</div>
        <div class="dlk-ad-soyad">${escapeHtml(state.adSoyad||'')}</div>
      </div>
    </div>
`;
    return { icerikHtml, baslik: `${state.adSoyad||'Diploma Kayıt Örneği'} — Dilekçe` };
  }

  function _dilekceIcerikDiplomaCevap(state) {
    const okul = _getOkulBilgisi();
    const okulAdi = (state.okulAdiManuel || okul.okulAdi || '').toLocaleUpperCase('tr');
    const il = (okul.il || '').toLocaleUpperCase('tr');

    const govdeMetni = (state.govdeManuel !== null && state.govdeManuel !== undefined)
      ? state.govdeManuel
      : _otomatikGovdeMetniDiplomaCevap(state, state.okulAdiManuel || okul.okulAdi || '');

    const tarihMetni = '....../....../............';
    const muduAdi = (state.muduAdiManuel !== null && state.muduAdiManuel !== undefined && state.muduAdiManuel !== '')
      ? state.muduAdiManuel
      : _varsayilanMuduAdi();

    const icerikHtml = `
    <div class="dlk-ust-baslik">
      <div class="dlk-il">T.C.</div>
      <div class="dlk-il">${escapeHtml(il)} VALİLİĞİ</div>
      <div class="dlk-okul-adi">${escapeHtml(okulAdi)} MÜDÜRLÜĞÜ</div>
    </div>

    <div class="dlk-diploma-baslik">DİPLOMA KAYIT ÖRNEĞİ</div>

    <div class="dlk-govde" style="text-indent:10mm;">${escapeHtml(govdeMetni)}</div>

    <div class="dlk-alt-satir" style="margin-top:14mm;">
      <div class="dlk-adres-blok">
        <div>Adres: ${escapeHtml(state.adres||'')}</div>
        <div style="margin-top:6mm;">Cep No: ${escapeHtml(state.cepNo||'')}</div>
      </div>
      <div class="dlk-imza-blok">
        <div class="dlk-tarih">${escapeHtml(tarihMetni)}</div>
        <div style="margin-top:6mm;">${escapeHtml(muduAdi)}</div>
        <div>Okul Müdürü</div>
      </div>
    </div>
`;
    return { icerikHtml, baslik: `${state.adSoyad||'Diploma Kayıt Örneği'} — Okul Cevabı` };
  }

  // --- Overlay (in-page) form + önizleme ---

  function _overlayOlustur() {
    if (document.getElementById('dlkOverlay')) return document.getElementById('dlkOverlay');

    const ov = document.createElement('div');
    ov.id = 'dlkOverlay';
    ov.style.cssText = `
      position:fixed; inset:0; z-index:99999; background:#525659;
      display:flex; flex-direction:column;
    `;
    ov.innerHTML = `
      <div id="dlkToolbar" style="
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        background: linear-gradient(135deg,#1b5e20,#2e7d32); color:#fff;
        padding:10px 14px; flex-wrap:wrap;
      ">
        <span style="font-weight:700;font-size:14px;">📄 Dilekçe Sistemi</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="dlkSablonKaydetBtn" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;" title="Şu anki belge metnini ve hizalamasını varsayılan şablon olarak kaydet">💾 Şablonu Kaydet</button>
          <button id="dlkPrintBtn" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">🖨️ Yazdır / PDF</button>
          <button id="dlkCloseBtn" style="background:rgba(220,0,0,.4);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">✕ Kapat</button>
        </div>
      </div>
      <div style="flex:1 1 auto; overflow:auto; display:flex; flex-wrap:wrap; gap:16px; padding:16px; justify-content:center; align-items:flex-start;">
        <div id="dlkFormPanel" style="
          background:#fff; border-radius:10px; padding:16px; width:340px; max-width:100%;
          box-shadow:0 4px 14px rgba(0,0,0,.3); font-family:'Segoe UI',Arial,sans-serif;
        "></div>
        <div style="display:flex;flex-direction:column;align-items:stretch;width:210mm;max-width:100%;">
          <div id="dlkIframeArac" style="margin-bottom:6px;"></div>
          <iframe id="dlkFrame" style="width:100%; min-height:297mm; border:none; background:#fff; box-shadow:0 4px 18px rgba(0,0,0,.4);"></iframe>
        </div>
      </div>
    `;
    document.body.appendChild(ov);
    document.body.classList.add('dlk-overlay-acik');
    // DÜZELTME: Bu tam ekran pencere, standart modal/detay paneli
    // sisteminin dışında olduğu için daha önce modallar için eklediğimiz
    // "aşağı çekince yenile" korumasının kapsamına hiç girmemişti —
    // sayfa içinde kaydırırken bazen native yenileme jesti araya giriyordu.
    if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);
    // Web/PWA sürümünde ise tarayıcının KENDİ "aşağı çekince yenile"
    // hareketi devrede olabilir (native eklentiden bağımsız) — bunu da
    // CSS ile devre dışı bırakıyoruz, overlay kapanınca geri alıyoruz.
    ov.style.overscrollBehaviorY = 'contain';
    document.documentElement.style.overscrollBehaviorY = 'contain';

    // DÜZELTME: Zengin editör araç çubuğu artık form panelinde değil,
    // düzenlenen belgenin (iframe) HEMEN ÜSTÜNDE — kullanıcı hangi
    // alanı biçimlendirdiğini görsel olarak net anlasın diye. Sadece
    // bir kez yerleştirilip bağlanıyor (form alanları her yeniden
    // çizildiğinde bu alan etkilenmiyor).
    const iframeAracKutusu = ov.querySelector('#dlkIframeArac');
    if(iframeAracKutusu && typeof zenginEditorAracCubugu === 'function'){
      iframeAracKutusu.innerHTML = zenginEditorAracCubugu('dlkFrame');
      if(typeof zenginEditorBaglantiKur === 'function') zenginEditorBaglantiKur('dlkFrame');
    }

    ov.querySelector('#dlkCloseBtn').onclick = () => {
      ov.remove();
      document.body.classList.remove('dlk-overlay-acik');
      document.documentElement.style.overscrollBehaviorY = '';
      if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
      if (typeof _menuyeGeriDon === 'function') _menuyeGeriDon();
    };
    ov.querySelector('#dlkPrintBtn').onclick = () => {
      const fr = ov.querySelector('#dlkFrame');
      if(!fr || !fr.contentWindow){ toast('Belge henüz yüklenmedi, birkaç saniye sonra tekrar deneyin.'); return; }
      // DÜZELTME: Android (Capacitor WebView) window.print()'i desteklemiyor —
      // web sürümünde çalışıp APK'da sessizce hiçbir şey yapmamasının sebebi
      // buydu. Native yazdırma köprüsü varsa (uygulamaHtmlYazdir, diğer
      // modüllerdeki gibi) önce onu kullan; yoksa (web) eski davranışa devam et.
      if (typeof uygulamaHtmlYazdir === 'function') {
        const dogFrame = fr.contentDocument;
        const html = dogFrame ? dogFrame.documentElement.outerHTML : null;
        if (!html) { toast('Belge içeriği okunamadı, birkaç saniye sonra tekrar deneyin.'); return; }
        uygulamaHtmlYazdir(html, 'Dilekce', 'dikey');
        return;
      }
      // DÜZELTME: print() çağrısı setTimeout içine alınmıştı — bu, çağrıyı
      // kullanıcının tıklama anından (senkron kullanıcı jesti) "koparıyor".
      // Birçok mobil tarayıcı (özellikle Android Chrome), print()'in TAM
      // OLARAK tıklamayla aynı anda (senkron) çağrılmasını şart koşuyor;
      // aksi halde SESSİZCE hiçbir şey yapmıyor (hata bile vermiyor) —
      // "yazdır butonu tepki vermiyor" şikayetinin sebebi buydu.
      fr.contentWindow.focus();
      fr.contentWindow.print();
    };

    return ov;
  }

  function _sablonAnahtari(tur) {
    // Geriye dönük uyumluluk: personel izin dilekçesi eskiden beri
    // 'dilekceVarsayilanSablon' anahtarını kullanıyordu, değiştirmedik.
    if (tur === 'diplomaKayit') return 'dilekceVarsayilanSablonDiploma';
    if (tur === 'diplomaKayitCevap') return 'dilekceVarsayilanSablonDiplomaCevap';
    return 'dilekceVarsayilanSablon';
  }

  function _turSecimiHtml(state) {
    const secenekler = DILEKCE_TURLERI.map(t =>
      `<option value="${t.key}" ${state.dilekceTuru===t.key?'selected':''}>${escapeHtml(t.ad)}</option>`
    ).join('');
    return `
      <div style="margin-bottom:14px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Dilekçe Türü</label>
        <select id="dlk_tur" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;font-weight:700;">
          ${secenekler}
        </select>
      </div>`;
  }

  function _formPanelHtmlPersonelIzin(state) {
    const personelSecenekleri = (typeof personelListesi !== 'undefined' ? personelListesi : [])
      .slice()
      .sort((a,b)=>(a.adSoyad||'').localeCompare(b.adSoyad||'','tr'))
      .map(p => `<option value="${p.id}" ${state.personelId===p.id?'selected':''}>${escapeHtml(p.adSoyad||'')}</option>`)
      .join('');

    const izinTurleriHtml = IZIN_TURLERI.map(t =>
      `<option value="${escapeHtml(t)}" ${state.izinTuru===t?'selected':''}>${escapeHtml(t)}</option>`
    ).join('');

    return `
      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Personel</label>
        <select id="dlk_personel" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
          <option value="">— Personel seçin —</option>
          ${personelSecenekleri}
        </select>
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Okul Adı (manuel düzenlenebilir)</label>
        <input id="dlk_okulAdi" value="${escapeHtml(state.okulAdiManuel||'')}" placeholder="Okul Bilgilerinden otomatik gelir" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">İzin Türü</label>
        <select id="dlk_izinTuru" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
          ${izinTurleriHtml}
        </select>
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Başlangıç Tarihi</label>
        <input id="dlk_baslamaTarihi" type="date" value="${escapeHtml(state.baslamaTarihiIso||'')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <div style="margin-bottom:16px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">İzin Süresi (gün)</label>
        <input id="dlk_sure" type="number" min="1" max="365" value="${state.sure||''}" placeholder="örn: 2" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>
    `;
  }

  function _formPanelHtmlDiploma(state) {
    return `
      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Adı ve Soyadı</label>
        <input id="dlk_adSoyad" value="${escapeHtml(state.adSoyad||'')}" placeholder="örn: Ali VELİ" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">T.C. Kimlik No</label>
        <input id="dlk_tc" value="${escapeHtml(state.tc||'')}" maxlength="11" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <div style="flex:1;">
          <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Baba Adı</label>
          <input id="dlk_babaAdi" value="${escapeHtml(state.babaAdi||'')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
        </div>
        <div style="flex:1;">
          <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Anne Adı</label>
          <input id="dlk_anneAdi" value="${escapeHtml(state.anneAdi||'')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Doğum Yeri</label>
        <input id="dlk_dogumYeri" value="${escapeHtml(state.dogumYeri||'')}" placeholder="örn: Koruk – Merkez/Elazığ" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <div style="flex:1;">
          <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Doğum Tarihi</label>
          <input id="dlk_dogumTarihi" type="date" value="${escapeHtml(state.dogumTarihiIso||'')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
        </div>
        <div style="flex:1;">
          <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Mezuniyet Tarihi</label>
          <input id="dlk_mezuniyetTarihi" type="date" value="${escapeHtml(state.mezuniyetTarihiIso||'')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Mezun Olduğu Sınıf</label>
        <input id="dlk_mezunSinif" value="${escapeHtml(state.mezunSinif||'')}" placeholder="örn: 5. Sınıf" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Adres</label>
        <input id="dlk_adres" value="${escapeHtml(state.adres||'')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Okul Adı (manuel düzenlenebilir)</label>
        <input id="dlk_okulAdi" value="${escapeHtml(state.okulAdiManuel||'')}" placeholder="Okul Bilgilerinden otomatik gelir" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>
    `;
  }

  function _formPanelHtmlDiplomaCevap(state) {
    return `
      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Adı ve Soyadı</label>
        <input id="dlk_adSoyad" value="${escapeHtml(state.adSoyad||'')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">T.C. Kimlik No</label>
        <input id="dlk_tc" value="${escapeHtml(state.tc||'')}" maxlength="11" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <div style="flex:2;">
          <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Baba Adı</label>
          <input id="dlk_babaAdi" value="${escapeHtml(state.babaAdi||'')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
        </div>
        <div style="flex:1;">
          <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Kız/Oğul</label>
          <select id="dlk_kizOglu" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
            <option value="kızı" ${state.kizOglu==='kızı'?'selected':''}>kızı</option>
            <option value="oğlu" ${state.kizOglu==='oğlu'?'selected':''}>oğlu</option>
          </select>
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Doğum Tarihi</label>
        <input id="dlk_dogumTarihi" type="date" value="${escapeHtml(state.dogumTarihiIso||'')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <div style="flex:1;">
          <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Öğrenim Süresi (yıllık)</label>
          <input id="dlk_ogrenimSuresi" type="number" min="1" max="12" value="${escapeHtml(state.ogrenimSuresi||'')}" placeholder="örn: 5" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
        </div>
        <div style="flex:1;">
          <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Diploma Tarihi</label>
          <input id="dlk_diplomaTarihi" type="date" value="${escapeHtml(state.diplomaTarihiIso||'')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Diploma Sayısı</label>
        <input id="dlk_diplomaSayisi" value="${escapeHtml(state.diplomaSayisi||'')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <div style="flex:2;">
          <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Adres</label>
          <input id="dlk_adres" value="${escapeHtml(state.adres||'')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
        </div>
        <div style="flex:1;">
          <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Cep No</label>
          <input id="dlk_cepNo" value="${escapeHtml(state.cepNo||'')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Okul Müdürü Adı Soyadı</label>
        <input id="dlk_muduAdi" value="${escapeHtml(state.muduAdiManuel||'')}" placeholder="${escapeHtml(_varsayilanMuduAdi() || 'Okul ayarlarından otomatik gelir')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Okul Adı (manuel düzenlenebilir)</label>
        <input id="dlk_okulAdi" value="${escapeHtml(state.okulAdiManuel||'')}" placeholder="Okul Bilgilerinden otomatik gelir" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>
    `;
  }

  function _formPanelHtml(state) {
    const turAlaniHtml = state.dilekceTuru === 'diplomaKayitCevap'
      ? _formPanelHtmlDiplomaCevap(state)
      : (state.dilekceTuru === 'diplomaKayit')
        ? _formPanelHtmlDiploma(state)
        : _formPanelHtmlPersonelIzin(state);

    const kayitliVarMi = typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari[_sablonAnahtari(state.dilekceTuru)];

    return `
      <h3 style="font-size:15px;margin-bottom:14px;color:#1b5e20;">Dilekçe Bilgileri</h3>

      ${_turSecimiHtml(state)}

      ${turAlaniHtml}

      <div style="margin-bottom:16px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Paragraf Hizalama</label>
        <select id="dlk_hizalama" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
          <option value="iki-yana" ${state.hizalama==='iki-yana'?'selected':''}>İki Yana Yaslı (resmi)</option>
          <option value="sola" ${state.hizalama==='sola'?'selected':''}>Sola Yaslı</option>
          <option value="ortala" ${state.hizalama==='ortala'?'selected':''}>Ortala</option>
        </select>
      </div>

      <div style="margin-bottom:16px;padding:10px;background:#fff8e1;border-radius:8px;font-size:11.5px;color:#7a5c00;line-height:1.5;">
        💡 Sağdaki A4 sayfasının tamamı (okul adı, metin, tarih, imza alanı, alt bilgiler) üzerine doğrudan tıklayıp serbestçe düzenlenebilir.
        <button id="dlk_govdeSifirla" class="btn btn-ghost btn-sm btn-block" style="margin-top:6px;">↺ Bu Dilekçeyi Şablona Sıfırla</button>
        ${kayitliVarMi ? `<button id="dlk_kayitliSablonSil" class="btn btn-danger btn-sm btn-block" style="margin-top:6px;">🗑️ Kayıtlı Varsayılan Şablonu Sil (fabrika ayarına dön)</button>` : ''}
      </div>

      <div id="dlk_bilgiKutusu" style="background:#f0f7f0;border-radius:8px;padding:10px;font-size:12px;color:#444;line-height:1.6;"></div>
    `;
  }

  function _bilgiKutusuGuncelle(panel, state) {
    const kutu = panel.querySelector('#dlk_bilgiKutusu');
    if (!kutu) return;
    if (state.dilekceTuru === 'diplomaKayit' || state.dilekceTuru === 'diplomaKayitCevap') {
      kutu.innerHTML = '💡 Bu belge türü personel kaydına bağlı değildir — tüm bilgileri elle girin.';
      return;
    }
    if (!state.personelId) {
      kutu.innerHTML = 'Personel seçtiğinizde TC, telefon, adres ve görev bilgileri otomatik dolacaktır.';
      return;
    }
    kutu.innerHTML = `
      <div><strong>TC:</strong> ${escapeHtml(state.tc||'—')}</div>
      <div><strong>Telefon:</strong> ${escapeHtml(state.telefon||'—')}</div>
      <div><strong>Görev:</strong> ${escapeHtml(state.gorev||'—')}</div>
      <div><strong>Adres:</strong> ${escapeHtml(state.adres||'—')}</div>
    `;
  }


  function _tarihIsoToTr(iso) {
    if (!iso) return '';
    const [y,m,d] = iso.split('-');
    if (!y||!m||!d) return '';
    return `${d} / ${m} / ${y}`;
  }

  function _overlayDoldur(ov) {
    // DÜZELTME (YENİ): Daha önce "Şablonu Kaydet" ile kaydedilmiş bir
    // varsayılan şablon varsa (okul ayarlarında saklanır), her yeni
    // dilekçe bu şablonla başlar — kullanıcı aynı düzenlemeyi her
    // seferinde tekrar yapmak zorunda kalmaz. Kayıtlı şablon yoksa
    // (ilk kullanım) fabrika varsayılanı (null => otomatik metin) kullanılır.
    // Her dilekçe TÜRÜNÜN kendi kayıtlı şablonu var (bkz. _sablonAnahtari).
    const baslangicTuru = _baslangicTuru || 'personelIzin';
    const kayitliSablon = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari[_sablonAnahtari(baslangicTuru)]) || null;

    const state = {
      dilekceTuru: baslangicTuru,
      personelId: _personelId,
      adSoyad: _personel ? _personel.adSoyad : '',
      tc: _personel ? _personel.tc : '',
      telefon: _personel ? _personel.telefon : '',
      adres: _personel ? _personel.adres : '',
      gorev: _personel ? _personel.gorev : '',
      izinTuru: IZIN_TURLERI[0],
      baslamaTarihiIso: '',
      baslamaTarihi: '',
      sure: '',
      // Diploma Kayıt Örneği Talep Dilekçesi alanları:
      babaAdi: '', anneAdi: '', dogumYeri: '',
      dogumTarihiIso: '', dogumTarihi: '',
      mezuniyetTarihiIso: '', mezuniyetTarihi: '',
      mezunSinif: '',
      // Diploma Kayıt Örneği (Okul Cevabı) alanları:
      kizOglu: 'kızı', ogrenimSuresi: '',
      diplomaTarihiIso: '', diplomaTarihi: '', diplomaSayisi: '',
      cepNo: '', muduAdiManuel: '',
      okulAdiManuel: '',
      govdeManuel: null,   // null => otomatik metin üretilir; kullanıcı düzenlerse buraya yazılır
      hizalama: kayitliSablon ? (kayitliSablon.hizalama || 'iki-yana') : 'iki-yana', // 'iki-yana' | 'sola' | 'ortala'
      tamIcerikManuel: kayitliSablon ? kayitliSablon.icerik : null // dolu olduğunda tüm sayfa kayıtlı/elle yazılmış haliyle gösterilir
    };


    const formPanel = ov.querySelector('#dlkFormPanel');
    const frame = ov.querySelector('#dlkFrame');

    const sablonKaydetBtn = ov.querySelector('#dlkSablonKaydetBtn');
    if(sablonKaydetBtn){
      sablonKaydetBtn.onclick = async () => {
        if(!confirm('Şu an ekranda gördüğünüz belge metni ve hizalaması, BUNDAN SONRA açılacak "' + (DILEKCE_TURLERI.find(t=>t.key===state.dilekceTuru)||{}).ad + '" dilekçeleri için varsayılan başlangıç şablonu olarak kaydedilecek. Devam edilsin mi?')) return;
        try{
          const dogFrame = frame.contentDocument;
          const icerikEl = dogFrame && dogFrame.getElementById('dlkSayfaIcerik');
          if(!icerikEl){ toast('Belge içeriği okunamadı, birkaç saniye sonra tekrar deneyin.'); return; }
          await db.collection(COL.okulBilgileri).doc('ayarlar').set({
            [_sablonAnahtari(state.dilekceTuru)]: { icerik: icerikEl.innerHTML, hizalama: state.hizalama }
          }, { merge: true });
          toast('✅ Şablon kaydedildi — bundan sonraki dilekçeler bu şablonla açılacak.');
        }catch(e){
          toast('Hata: ' + e.message);
        }
      };
    }

    function render() {
      formPanel.innerHTML = _formPanelHtml(state);
      _bilgiKutusuGuncelle(formPanel, state);
      frame.srcdoc = _dilekceSayfaHtml(state);
      _bagla();
    }

    function _serbestDuzenlemeKorumasi() {
      // Kullanıcı tüm sayfayı elle değiştirdiyse, form alanlarından yapılacak bir
      // değişiklik bu düzenlemeyi sileceği için önce onay isteriz.
      if (state.tamIcerikManuel !== null && state.tamIcerikManuel !== undefined) {
        const devamEt = confirm('Dilekçe metnini elle düzenlediniz. Form alanından değişiklik yaparsanız bu serbest düzenleme silinip şablona dönülecek. Devam edilsin mi?');
        if (!devamEt) return false;
        state.tamIcerikManuel = null;
      }
      return true;
    }

    function _bagla() {
      const alan = (id) => formPanel.querySelector(id);

      const turSelect = alan('#dlk_tur');
      if (turSelect) turSelect.onchange = (e) => {
        if (!_serbestDuzenlemeKorumasi()) { e.target.value = state.dilekceTuru; return; }
        const yeniTur = e.target.value;
        if (yeniTur === state.dilekceTuru) return;
        state.dilekceTuru = yeniTur;
        // Tür değişince o türe ait kayıtlı varsayılan şablon varsa onunla başla,
        // yoksa (fabrika) otomatik metne dön.
        const kayitliSablon = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari[_sablonAnahtari(yeniTur)]) || null;
        state.govdeManuel = null;
        state.hizalama = kayitliSablon ? (kayitliSablon.hizalama || 'iki-yana') : 'iki-yana';
        state.tamIcerikManuel = kayitliSablon ? kayitliSablon.icerik : null;
        render();
      };

      const personelSelect = alan('#dlk_personel');
      if (personelSelect) personelSelect.onchange = (e) => {
        if (!_serbestDuzenlemeKorumasi()) { e.target.value = state.personelId || ''; return; }
        const pid = e.target.value;
        state.personelId = pid;
        const p = (typeof personelListesi !== 'undefined') ? personelListesi.find(x=>x.id===pid) : null;
        if (p) {
          state.adSoyad = p.adSoyad || '';
          state.tc = p.tc || '';
          state.telefon = p.telefon || '';
          state.adres = p.adres || '';
          state.gorev = p.gorev || '';
        } else {
          state.adSoyad = ''; state.tc = ''; state.telefon = ''; state.adres = ''; state.gorev = '';
        }
        // Personel değişince elle yazılmış eski metin yeni personele uymayacağından otomatik metne dönülür.
        state.govdeManuel = null;
        render();
      };
      const okulAdiInput0 = alan('#dlk_okulAdi');
      if (okulAdiInput0) okulAdiInput0.oninput = (e) => {
        if (!_serbestDuzenlemeKorumasi()) return;
        state.okulAdiManuel = e.target.value;
        frame.srcdoc = _dilekceSayfaHtml(state);
      };
      const izinTuruSelect = alan('#dlk_izinTuru');
      if (izinTuruSelect) izinTuruSelect.onchange = (e) => {
        if (!_serbestDuzenlemeKorumasi()) { e.target.value = state.izinTuru; return; }
        state.izinTuru = e.target.value;
        frame.srcdoc = _dilekceSayfaHtml(state);
      };
      const baslamaTarihiInput = alan('#dlk_baslamaTarihi');
      if (baslamaTarihiInput) baslamaTarihiInput.onchange = (e) => {
        if (!_serbestDuzenlemeKorumasi()) { e.target.value = state.baslamaTarihiIso || ''; return; }
        state.baslamaTarihiIso = e.target.value;
        state.baslamaTarihi = _tarihIsoToTr(e.target.value);
        frame.srcdoc = _dilekceSayfaHtml(state);
      };
      const sureInput = alan('#dlk_sure');
      if (sureInput) sureInput.oninput = (e) => {
        if (!_serbestDuzenlemeKorumasi()) return;
        state.sure = e.target.value;
        frame.srcdoc = _dilekceSayfaHtml(state);
      };

      // --- Diploma Kayıt Örneği Talep Dilekçesi alanları ---
      const basitAlanBagla = (id, stateAlani) => {
        const el = alan(id);
        if (!el) return;
        el.oninput = (e) => {
          if (!_serbestDuzenlemeKorumasi()) return;
          state[stateAlani] = e.target.value;
          frame.srcdoc = _dilekceSayfaHtml(state);
        };
      };
      basitAlanBagla('#dlk_adSoyad', 'adSoyad');
      basitAlanBagla('#dlk_tc', 'tc');
      basitAlanBagla('#dlk_babaAdi', 'babaAdi');
      basitAlanBagla('#dlk_anneAdi', 'anneAdi');
      basitAlanBagla('#dlk_dogumYeri', 'dogumYeri');
      basitAlanBagla('#dlk_mezunSinif', 'mezunSinif');
      basitAlanBagla('#dlk_adres', 'adres');

      const dogumTarihiInput = alan('#dlk_dogumTarihi');
      if (dogumTarihiInput) dogumTarihiInput.onchange = (e) => {
        if (!_serbestDuzenlemeKorumasi()) { e.target.value = state.dogumTarihiIso || ''; return; }
        state.dogumTarihiIso = e.target.value;
        state.dogumTarihi = _tarihIsoToTr(e.target.value);
        frame.srcdoc = _dilekceSayfaHtml(state);
      };
      const mezuniyetTarihiInput = alan('#dlk_mezuniyetTarihi');
      if (mezuniyetTarihiInput) mezuniyetTarihiInput.onchange = (e) => {
        if (!_serbestDuzenlemeKorumasi()) { e.target.value = state.mezuniyetTarihiIso || ''; return; }
        state.mezuniyetTarihiIso = e.target.value;
        state.mezuniyetTarihi = _tarihIsoToTr(e.target.value);
        frame.srcdoc = _dilekceSayfaHtml(state);
      };

      // --- Diploma Kayıt Örneği (Okul Cevabı) alanları ---
      basitAlanBagla('#dlk_ogrenimSuresi', 'ogrenimSuresi');
      basitAlanBagla('#dlk_diplomaSayisi', 'diplomaSayisi');
      basitAlanBagla('#dlk_cepNo', 'cepNo');
      basitAlanBagla('#dlk_muduAdi', 'muduAdiManuel');

      const kizOgluSelect = alan('#dlk_kizOglu');
      if (kizOgluSelect) kizOgluSelect.onchange = (e) => {
        if (!_serbestDuzenlemeKorumasi()) { e.target.value = state.kizOglu || 'kızı'; return; }
        state.kizOglu = e.target.value;
        frame.srcdoc = _dilekceSayfaHtml(state);
      };
      const diplomaTarihiInput = alan('#dlk_diplomaTarihi');
      if (diplomaTarihiInput) diplomaTarihiInput.onchange = (e) => {
        if (!_serbestDuzenlemeKorumasi()) { e.target.value = state.diplomaTarihiIso || ''; return; }
        state.diplomaTarihiIso = e.target.value;
        state.diplomaTarihi = _tarihIsoToTr(e.target.value);
        frame.srcdoc = _dilekceSayfaHtml(state);
      };

      const hizalamaSelect = alan('#dlk_hizalama');
      if (hizalamaSelect) hizalamaSelect.onchange = (e) => {
        state.hizalama = e.target.value;
        // Hizalama, serbest düzenlenmiş içerikte de uygulanabilir (içeriği bozmaz).
        frame.srcdoc = _dilekceSayfaHtml(state);
      };
      const govdeSifirlaBtn = alan('#dlk_govdeSifirla');
      if (govdeSifirlaBtn) govdeSifirlaBtn.onclick = () => {
        state.govdeManuel = null;
        state.okulAdiManuel = '';
        state.tamIcerikManuel = null;
        const okulAdiInput = alan('#dlk_okulAdi');
        if (okulAdiInput) okulAdiInput.value = '';
        frame.srcdoc = _dilekceSayfaHtml(state);
      };
      const kayitliSablonSilBtn = alan('#dlk_kayitliSablonSil');
      if(kayitliSablonSilBtn){
        kayitliSablonSilBtn.onclick = async () => {
          if(!confirm('Kayıtlı varsayılan şablon silinsin mi? Bundan sonra dilekçeler yeniden fabrika (otomatik) metniyle açılacak.')) return;
          try{
            await db.collection(COL.okulBilgileri).doc('ayarlar').set({
              [_sablonAnahtari(state.dilekceTuru)]: firebase.firestore.FieldValue.delete()
            }, { merge: true });
            state.tamIcerikManuel = null;
            frame.srcdoc = _dilekceSayfaHtml(state);
            toast('Kayıtlı şablon silindi.');
            render();
          }catch(e){ toast('Hata: ' + e.message); }
        };
      }
    }

    // İframe içindeki contenteditable alandan gelen düzenleme bildirimlerini dinle.
    // Birden fazla DilekceSistemi.ac() çağrısında dinleyici tekrar tekrar eklenmesin diye
    // window üzerinde tek bir handler tutuyoruz.
    window.removeEventListener('message', window._dlkMessageHandler || (()=>{}));
    window._dlkMessageHandler = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.tip === 'dlkIcerikDuzenlendi') {
        state.tamIcerikManuel = e.data.deger;
      }
    };
    window.addEventListener('message', window._dlkMessageHandler);

    render();
  }

  // --- Public API ---
  window.DilekceSistemi = {
    ac(personelId) {
      _baslangicTuru = 'personelIzin';
      _personelId = personelId || null;
      _personel = (_personelId && typeof personelListesi !== 'undefined')
        ? personelListesi.find(p => p.id === _personelId) || null
        : null;

      const ov = _overlayOlustur();
      _overlayDoldur(ov);
    },
    // YENİ: Diploma Kayıt Örneği Talep Dilekçesi — personel kaydına bağlı
    // değil, bu yüzden personelId almaz. Kullanıcı overlay içindeki
    // "Dilekçe Türü" seçiciyle de bu türe geçebilir; bu sadece direkt
    // kısayol (örn. ileride ayrı bir buton eklenirse).
    acDiploma() {
      _baslangicTuru = 'diplomaKayit';
      _personelId = null;
      _personel = null;

      const ov = _overlayOlustur();
      _overlayDoldur(ov);
    },
    // YENİ: Diploma Kayıt Örneği (Okul Cevabı) — okulun dilekçeye verdiği
    // resmi cevap belgesi. Personel kaydına bağlı değildir.
    acDiplomaCevap() {
      _baslangicTuru = 'diplomaKayitCevap';
      _personelId = null;
      _personel = null;

      const ov = _overlayOlustur();
      _overlayDoldur(ov);
    }
  };

})();
