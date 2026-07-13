/* =============================================
   js/teblig-tebellug.js
   TEBLİĞ-TEBELLÜĞ İMZA SİRKÜSÜ
   Bir resmi yazının (tarih/sayı/konu) hangi öğretmenlere duyurulup
   okunduğunu imza karşılığında belgelemek için kullanılan çizelge.
   Öğretmen açılır listeden seçilir; branşı/görevi otomatik dolar.
   Yazdırma/kapat butonları ve native (Android) yazdırma köprüsü diğer
   modüllerle (dilekçe, maaş formu) aynı mimariyi kullanır.

   Mimari not: Firestore'a yazmaz — sayfa yenilenince form sıfırlanır
   (dilekçe/maaş formu modülleriyle aynı, bkz. docs/Pragmatik-Mimari-Tasarimi.md §2).
   ============================================= */

(function() {
  'use strict';

  let _state = null;

  function _bugunIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function _tarihIsoToTr(iso) {
    if (!iso) return '';
    const [y,m,d] = iso.split('-');
    if (!y||!m||!d) return '';
    return `${d}/${m}/${y}`;
  }

  function _bosSatir() {
    return { ogretmenId: '', ad: '', gorev: '' };
  }

  function _bosState() {
    return {
      tarihIso: _bugunIso(),
      sayi: '',
      konu: '',
      satirlar: [_bosSatir()]
    };
  }

  // GÖREVİ sütunu: "Öğretmen" unvanlılar için branş + " Öğrt." (örn. "Fen Bilimleri Öğrt."),
  // diğer unvanlar (Müdür Yardımcısı, İdari Personel vb.) için doğrudan unvan.
  function _gorevMetni(o) {
    if (!o) return '';
    const unvan = o.unvan || 'Öğretmen';
    if (unvan === 'Öğretmen' && o.brans) return `${o.brans} Öğrt.`;
    return unvan;
  }

  function _ogretmenSecenekleriHtml(seciliId) {
    const liste = (typeof ogretmenler !== 'undefined' ? ogretmenler : []).slice()
      .sort((a,b)=>`${a.ad||''} ${a.soyad||''}`.localeCompare(`${b.ad||''} ${b.soyad||''}`,'tr'));
    return '<option value="">— Öğretmen seçin —</option>' +
      liste.map(o => `<option value="${o.id}" ${seciliId===o.id?'selected':''}>${escapeHtml(`${o.ad||''} ${o.soyad||''}`.trim())}</option>`).join('');
  }

  function _getOkulAdi() {
    return (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi)
      ? okulBilgileriAyari.okulAdi : 'KORUK İLK - ORTAOKULU';
  }

  // --- Sayfa (yazdırma/önizleme) HTML'i ---

  function _sayfaHtml(state) {
    const okulAdi = _getOkulAdi().toLocaleUpperCase('tr');
    const tarihTr = _tarihIsoToTr(state.tarihIso);

    const satirlarHtml = state.satirlar.map((s, i) => `
      <tr>
        <td style="text-align:center;">${i+1}</td>
        <td>${escapeHtml(s.ad||'')}</td>
        <td>${escapeHtml(s.gorev||'')}</td>
        <td>&nbsp;</td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(okulAdi)} — Tebliğ-Tebellüğ İmza Sirküsü</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  * { box-sizing: border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:11pt; color:#111; }
  table { width:100%; border-collapse:collapse; }
  td, th { border:1px solid #000; padding:5px 8px; vertical-align:middle; }
  .ts-baslik { text-align:center; font-weight:700; font-size:13pt; padding:8px; }
  .ts-bilgi-th { text-align:center; font-weight:700; background:#f3f3f3; }
  .ts-not { text-align:center; font-weight:700; padding:10px 6px; }
  .ts-tablo-th { font-weight:700; background:#f3f3f3; }
  .ts-imza-col { width:32%; }
  .ts-sno-col { width:8%; text-align:center; }
  @media print { body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
  <table>
    <tr><td colspan="3" class="ts-baslik">${escapeHtml(okulAdi)} TEBLİĞ-TEBELLÜĞ İMZA SİRKÜSÜ</td></tr>
    <tr>
      <th class="ts-bilgi-th" style="width:20%;">TARİH</th>
      <th class="ts-bilgi-th" style="width:35%;">SAYI</th>
      <th class="ts-bilgi-th">KONU</th>
    </tr>
    <tr>
      <td style="text-align:center;">${escapeHtml(tarihTr)}</td>
      <td style="text-align:center;">${escapeHtml(state.sayi||'')}</td>
      <td>${escapeHtml(state.konu||'')}</td>
    </tr>
  </table>

  <table style="margin-top:6mm;">
    <tr><td class="ts-not">TARİH, SAYI VE KONUSU BELİRTİLEN YAZIYI OKUDUM VE BİLGİ EDİNDİM.</td></tr>
  </table>

  <table style="margin-top:0;">
    <tr>
      <th class="ts-tablo-th ts-sno-col">S.NO</th>
      <th class="ts-tablo-th">ADI VE SOYADI</th>
      <th class="ts-tablo-th">GÖREVİ</th>
      <th class="ts-tablo-th ts-imza-col">İMZA</th>
    </tr>
    ${satirlarHtml}
  </table>
</body>
</html>`;
  }

  // --- Overlay (in-page) form + önizleme ---

  function _overlayOlustur() {
    if (document.getElementById('tsOverlay')) return document.getElementById('tsOverlay');

    const ov = document.createElement('div');
    ov.id = 'tsOverlay';
    ov.style.cssText = `position:fixed; inset:0; z-index:99999; background:#525659; display:flex; flex-direction:column;`;
    ov.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:linear-gradient(135deg,#1b5e20,#2e7d32); color:#fff; padding:10px 14px; flex-wrap:wrap;">
        <span style="font-weight:700;font-size:14px;">📋 Tebliğ-Tebellüğ İmza Sirküsü</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="tsPrintBtn" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">🖨️ Yazdır / PDF</button>
          <button id="tsCloseBtn" style="background:rgba(220,0,0,.4);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">✕ Kapat</button>
        </div>
      </div>
      <div style="flex:1 1 auto; overflow:auto; display:flex; flex-wrap:wrap; gap:16px; padding:16px; justify-content:center; align-items:flex-start;">
        <div id="tsFormPanel" style="background:#fff; border-radius:10px; padding:16px; width:340px; max-width:100%; box-shadow:0 4px 14px rgba(0,0,0,.3); font-family:'Segoe UI',Arial,sans-serif; color:#1a1a1a;"></div>
        <iframe id="tsFrame" style="width:210mm; max-width:100%; min-height:297mm; border:none; background:#fff; box-shadow:0 4px 18px rgba(0,0,0,.4);"></iframe>
      </div>
    `;
    document.body.appendChild(ov);
    document.body.classList.add('dlk-overlay-acik');
    if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);
    ov.style.overscrollBehaviorY = 'contain';
    document.documentElement.style.overscrollBehaviorY = 'contain';

    ov.querySelector('#tsCloseBtn').onclick = () => {
      ov.remove();
      document.body.classList.remove('dlk-overlay-acik');
      document.documentElement.style.overscrollBehaviorY = '';
      if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
      if (typeof _menuyeGeriDon === 'function') _menuyeGeriDon();
    };
    ov.querySelector('#tsPrintBtn').onclick = () => {
      const fr = ov.querySelector('#tsFrame');
      if (!fr || !fr.contentWindow) { toast('Belge henüz yüklenmedi, birkaç saniye sonra tekrar deneyin.'); return; }
      if (typeof uygulamaHtmlYazdir === 'function') {
        const dogFrame = fr.contentDocument;
        const html = dogFrame ? dogFrame.documentElement.outerHTML : null;
        if (!html) { toast('Belge içeriği okunamadı, birkaç saniye sonra tekrar deneyin.'); return; }
        uygulamaHtmlYazdir(html, 'Teblig_Tebellug_Imza_Sirkusu', 'dikey');
        return;
      }
      fr.contentWindow.focus();
      fr.contentWindow.print();
    };

    return ov;
  }

  function _formPanelHtml(state) {
    return `
      <h3 style="font-size:15px;margin-bottom:14px;color:#1b5e20;">Tebliğ Bilgileri</h3>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Tarih</label>
        <input id="ts_tarih" type="date" value="${escapeHtml(state.tarihIso||'')}" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <div style="margin-bottom:12px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Sayı</label>
        <input id="ts_sayi" value="${escapeHtml(state.sayi||'')}" placeholder="örn: E-79137285-730.06-141434214" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <div style="margin-bottom:16px;">
        <label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Konu</label>
        <input id="ts_konu" value="${escapeHtml(state.konu||'')}" placeholder="örn: Milat Projesi" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">
      </div>

      <h3 style="font-size:14px;margin-bottom:10px;color:#1b5e20;">Öğretmenler</h3>
      <div id="ts_satirlar">
        ${state.satirlar.map((s, i) => `
          <div class="ts-satir" data-index="${i}" style="display:flex;gap:6px;margin-bottom:8px;align-items:center;">
            <select class="ts_ogretmenSec" data-index="${i}" style="flex:2;padding:6px 7px;border:1px solid #ccc;border-radius:6px;font-size:12.5px;">
              ${_ogretmenSecenekleriHtml(s.ogretmenId)}
            </select>
            <input class="ts_gorev" data-index="${i}" value="${escapeHtml(s.gorev||'')}" placeholder="Görevi" style="flex:1;padding:6px 7px;border:1px solid #ccc;border-radius:6px;font-size:12.5px;">
            <button class="ts_satirSil" data-index="${i}" style="border:none;background:#fdecea;color:#c0392b;border-radius:6px;width:26px;height:26px;flex-shrink:0;cursor:pointer;font-size:13px;">✕</button>
          </div>`).join('')}
      </div>
      <button id="ts_satirEkle" style="width:100%;padding:8px;border:1px solid #ccc;background:#f0f7f0;border-radius:6px;font-size:12.5px;cursor:pointer;font-weight:700;color:#1b5e20;">➕ Öğretmen Ekle</button>
    `;
  }

  function _overlayDoldur(ov) {
    _state = _bosState();
    const state = _state;
    const formPanel = ov.querySelector('#tsFormPanel');
    const frame = ov.querySelector('#tsFrame');

    function render() {
      formPanel.innerHTML = _formPanelHtml(state);
      frame.srcdoc = _sayfaHtml(state);
      _bagla();
    }

    function _bagla() {
      formPanel.querySelector('#ts_tarih').onchange = (e) => {
        state.tarihIso = e.target.value;
        frame.srcdoc = _sayfaHtml(state);
      };
      formPanel.querySelector('#ts_sayi').oninput = (e) => {
        state.sayi = e.target.value;
        frame.srcdoc = _sayfaHtml(state);
      };
      formPanel.querySelector('#ts_konu').oninput = (e) => {
        state.konu = e.target.value;
        frame.srcdoc = _sayfaHtml(state);
      };

      formPanel.querySelectorAll('.ts_ogretmenSec').forEach(sel => {
        sel.onchange = (e) => {
          const i = parseInt(e.target.dataset.index, 10);
          const oid = e.target.value;
          const o = (typeof ogretmenler !== 'undefined') ? ogretmenler.find(x => x.id === oid) : null;
          state.satirlar[i].ogretmenId = oid;
          state.satirlar[i].ad = o ? `${o.ad||''} ${o.soyad||''}`.trim() : '';
          state.satirlar[i].gorev = o ? _gorevMetni(o) : '';
          render();
        };
      });
      formPanel.querySelectorAll('.ts_gorev').forEach(inp => {
        inp.oninput = (e) => {
          const i = parseInt(e.target.dataset.index, 10);
          state.satirlar[i].gorev = e.target.value;
          frame.srcdoc = _sayfaHtml(state);
        };
      });
      formPanel.querySelectorAll('.ts_satirSil').forEach(btn => {
        btn.onclick = (e) => {
          const i = parseInt(e.target.dataset.index, 10);
          state.satirlar.splice(i, 1);
          if (state.satirlar.length === 0) state.satirlar.push(_bosSatir());
          render();
        };
      });
      formPanel.querySelector('#ts_satirEkle').onclick = () => {
        state.satirlar.push(_bosSatir());
        render();
      };
    }

    render();
  }

  // --- Public API ---
  window.TebligTebellugSirkusu = {
    ac() {
      const ov = _overlayOlustur();
      _overlayDoldur(ov);
    }
  };

})();
