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
      ? okulBilgileriAyari.okulAdi : 'KORUK İLK - ORTAOKULU';
    const il = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.il) || '';
    const ilce = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.ilce) || '';
    const mebMudurlugu = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.mebMudurlugu) || '';
    return { okulAdi, il, ilce, mebMudurlugu };
  }

  // --- Durum ---
  let _personelId = null;
  let _personel = null;

  // --- HTML üretimi ---

  function _otomatikGovdeMetni(state) {
    const sure = parseInt(state.sure, 10) || 0;
    const sureYazi = sayiyiYaziyaCevir(sure);
    return `Okulunuzda ${state.gorev || '...........................'} olarak görev yapmaktayım. ` +
      `${state.baslamaTarihi || '....../....../............'} tarihinden itibaren ` +
      `${sure || '......'} (${sureYazi || '..........'}) gün ` +
      `${state.izinTuru || '...........................'} hakkımı kullanmak istiyorum.`;
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

    const okul = _getOkulBilgisi();
    const okulAdi = (state.okulAdiManuel || okul.okulAdi || '').toLocaleUpperCase('tr');
    const il = (okul.il || '').toLocaleUpperCase('tr');

    const govdeMetni = (state.govdeManuel !== null && state.govdeManuel !== undefined)
      ? state.govdeManuel
      : _otomatikGovdeMetni(state);

    const kapanisMetni = 'Gereğini olurlarınıza arz ederim.';
    const tarihMetni = '....../....../............';

    const hizalama = state.hizalama || 'iki-yana';
    const hizalamaCss = {
      'iki-yana': 'text-align: justify; text-align-last: left;',
      'sola':     'text-align: left;',
      'ortala':   'text-align: center;'
    }[hizalama] || 'text-align: justify; text-align-last: left;';

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

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(state.adSoyad||'Personel')} — Dilekçe</title>
<style>${_dilekceStilBlogu(hizalamaCss)}</style>
</head>
<body>
  <div id="dlkSayfaIcerik" contenteditable="true">${icerikHtml}</div>
  <script>${_dlkScriptBlogu()}</script>
</body>
</html>`;
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
        <span style="font-weight:700;font-size:14px;">📄 Personel Dilekçe Sistemi</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="dlkPrintBtn" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">🖨️ Yazdır / PDF</button>
          <button id="dlkCloseBtn" style="background:rgba(220,0,0,.4);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">✕ Kapat</button>
        </div>
      </div>
      <div style="flex:1 1 auto; overflow:auto; display:flex; flex-wrap:wrap; gap:16px; padding:16px; justify-content:center; align-items:flex-start;">
        <div id="dlkFormPanel" style="
          background:#fff; border-radius:10px; padding:16px; width:340px; max-width:100%;
          box-shadow:0 4px 14px rgba(0,0,0,.3); font-family:'Segoe UI',Arial,sans-serif;
        "></div>
        <iframe id="dlkFrame" style="width:210mm; min-height:297mm; border:none; background:#fff; box-shadow:0 4px 18px rgba(0,0,0,.4);"></iframe>
      </div>
    `;
    document.body.appendChild(ov);
    document.body.classList.add('dlk-overlay-acik');

    ov.querySelector('#dlkCloseBtn').onclick = () => {
      ov.remove();
      document.body.classList.remove('dlk-overlay-acik');
    };
    ov.querySelector('#dlkPrintBtn').onclick = () => {
      const fr = ov.querySelector('#dlkFrame');
      fr.contentWindow.focus();
      fr.contentWindow.print();
    };

    return ov;
  }

  function _formPanelHtml(state) {
    const personelSecenekleri = (typeof personelListesi !== 'undefined' ? personelListesi : [])
      .slice()
      .sort((a,b)=>(a.adSoyad||'').localeCompare(b.adSoyad||'','tr'))
      .map(p => `<option value="${p.id}" ${state.personelId===p.id?'selected':''}>${escapeHtml(p.adSoyad||'')}</option>`)
      .join('');

    const izinTurleriHtml = IZIN_TURLERI.map(t =>
      `<option value="${escapeHtml(t)}" ${state.izinTuru===t?'selected':''}>${escapeHtml(t)}</option>`
    ).join('');

    return `
      <h3 style="font-size:15px;margin-bottom:14px;color:#1b5e20;">Dilekçe Bilgileri</h3>

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
        <button id="dlk_govdeSifirla" style="margin-top:6px;width:100%;padding:6px;border:1px solid #d9b840;background:#fff;border-radius:6px;font-size:12px;cursor:pointer;">↺ Tüm Sayfayı Şablona Sıfırla</button>
      </div>

      <div id="dlk_bilgiKutusu" style="background:#f0f7f0;border-radius:8px;padding:10px;font-size:12px;color:#444;line-height:1.6;"></div>
    `;
  }

  function _bilgiKutusuGuncelle(panel, state) {
    const kutu = panel.querySelector('#dlk_bilgiKutusu');
    if (!kutu) return;
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
    const state = {
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
      okulAdiManuel: '',
      govdeManuel: null,   // null => otomatik metin üretilir; kullanıcı düzenlerse buraya yazılır
      hizalama: 'iki-yana', // 'iki-yana' | 'sola' | 'ortala'
      tamIcerikManuel: null // dolu olduğunda tüm sayfa kullanıcının elle yazdığı haliyle gösterilir
    };

    const formPanel = ov.querySelector('#dlkFormPanel');
    const frame = ov.querySelector('#dlkFrame');

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
      formPanel.querySelector('#dlk_personel').onchange = (e) => {
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
      formPanel.querySelector('#dlk_okulAdi').oninput = (e) => {
        if (!_serbestDuzenlemeKorumasi()) return;
        state.okulAdiManuel = e.target.value;
        frame.srcdoc = _dilekceSayfaHtml(state);
      };
      formPanel.querySelector('#dlk_izinTuru').onchange = (e) => {
        if (!_serbestDuzenlemeKorumasi()) { e.target.value = state.izinTuru; return; }
        state.izinTuru = e.target.value;
        frame.srcdoc = _dilekceSayfaHtml(state);
      };
      formPanel.querySelector('#dlk_baslamaTarihi').onchange = (e) => {
        if (!_serbestDuzenlemeKorumasi()) { e.target.value = state.baslamaTarihiIso || ''; return; }
        state.baslamaTarihiIso = e.target.value;
        state.baslamaTarihi = _tarihIsoToTr(e.target.value);
        frame.srcdoc = _dilekceSayfaHtml(state);
      };
      formPanel.querySelector('#dlk_sure').oninput = (e) => {
        if (!_serbestDuzenlemeKorumasi()) return;
        state.sure = e.target.value;
        frame.srcdoc = _dilekceSayfaHtml(state);
      };
      formPanel.querySelector('#dlk_hizalama').onchange = (e) => {
        state.hizalama = e.target.value;
        // Hizalama, serbest düzenlenmiş içerikte de uygulanabilir (içeriği bozmaz).
        frame.srcdoc = _dilekceSayfaHtml(state);
      };
      formPanel.querySelector('#dlk_govdeSifirla').onclick = () => {
        state.govdeManuel = null;
        state.okulAdiManuel = '';
        state.tamIcerikManuel = null;
        const okulAdiInput = formPanel.querySelector('#dlk_okulAdi');
        if (okulAdiInput) okulAdiInput.value = '';
        frame.srcdoc = _dilekceSayfaHtml(state);
      };
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
      _personelId = personelId || null;
      _personel = (_personelId && typeof personelListesi !== 'undefined')
        ? personelListesi.find(p => p.id === _personelId) || null
        : null;

      const ov = _overlayOlustur();
      _overlayDoldur(ov);
    }
  };

})();
