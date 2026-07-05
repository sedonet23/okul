/* =============================================
   js/dokuman-okuyucu.js
   UYGULAMA İÇİ DÖKÜMAN OKUYUCU
   PDF (pdf.js), Excel (SheetJS — sayfa=sekme) ve
   Word (mammoth.js — yükseklik bazlı yapay sayfalama)
   dosyalarını tam ekran, sayfa çevirici + sayfa seçici +
   pinch-zoom ile uygulama içinde gösterir.

   DÜZELTME: dokumanlar.js'deki dokumanAc() eskiden
   window.open(url,'_blank') kullanıyordu — Android'de
   harici tarayıcı seçiciyi tetikliyordu ve hiçbir sayfa
   kontrolü yoktu. Artık desteklenen türler için bu okuyucu
   devreye giriyor; desteklenmeyen türlerde eski davranış korunur.
   ============================================= */

(function() {
  'use strict';

  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const DESTEKLENEN_UZANTILAR = ['pdf', 'xlsx', 'xls', 'docx'];

  function _uzanti(ad) {
    return (ad || '').split('.').pop().toLowerCase();
  }

  let _state = null;
  let _pdfDoc = null;
  let _xlsxWb = null;
  let _docxSayfalar = [];

  function _sayfayaGit(ov, index) {
    if (!_state || index < 0 || index >= _state.toplamSayfa) return;
    _state.zoom = 1;
    _state.panX = 0;
    _state.panY = 0;
    if (_state.tur === 'pdf') _pdfSayfaRenderEt(ov, index);
    else if (_state.tur === 'xlsx') _xlsxSayfaRenderEt(ov, index);
    else if (_state.tur === 'docx') _docxSayfaRenderEt(ov, index);
    _thumbAktifIsaretle(ov);
  }

  function _sayacGuncelle(ov) {
    const el = ov.querySelector('#dokOkuyucuSayac');
    if (el) el.textContent = `${_state.sayfaIndex + 1} / ${_state.toplamSayfa}`;
  }

  /* ---- PDF ---- */
  async function _pdfYukle(ov, url) {
    const govde = ov.querySelector('#dokOkuyucuGovde');
    try {
      _pdfDoc = await pdfjsLib.getDocument(url).promise;
      _state.tur = 'pdf';
      _state.toplamSayfa = _pdfDoc.numPages;
      govde.style.overflow = 'hidden';
      govde.style.touchAction = 'none';
      govde.innerHTML = `<canvas id="dokOkuyucuCanvas" style="background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.5);"></canvas>`;
      await _pdfSayfaRenderEt(ov, 0);
      _thumbBarKur(ov);
    } catch (e) {
      govde.innerHTML = `<div style="color:#fff;padding:20px;text-align:center;">Belge yüklenemedi: ${escapeHtml(e.message)}</div>`;
    }
  }

  async function _pdfSayfaRenderEt(ov, index) {
    const page = await _pdfDoc.getPage(index + 1);
    const canvas = ov.querySelector('#dokOkuyucuCanvas');
    const govde = ov.querySelector('#dokOkuyucuGovde');
    const maxGenislik = govde.clientWidth - 20;
    const maxYukseklik = govde.clientHeight - 20;
    const taban = page.getViewport({ scale: 1 });
    const sigmaOlcek = Math.min(maxGenislik / taban.width, maxYukseklik / taban.height);
    // Zoom için ekstra çözünürlük payı bırakmak adına 2x fazla render ediyoruz —
    // CSS transform ile 2x'e kadar zoom pikselleşmeden kalır.
    const viewport = page.getViewport({ scale: sigmaOlcek * 2 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = (taban.width * sigmaOlcek) + 'px';
    canvas.style.height = (taban.height * sigmaOlcek) + 'px';
    canvas.style.transform = 'scale(1)';
    canvas.style.transformOrigin = 'center center';
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    _state.sayfaIndex = index;
    _sayacGuncelle(ov);
  }

  function _pdfThumbLazyKur(ov, bar) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (!entry.isIntersecting) return;
        const chip = entry.target;
        if (chip.dataset.render === '1') return;
        chip.dataset.render = '1';
        const idx = parseInt(chip.dataset.index, 10);
        const page = await _pdfDoc.getPage(idx + 1);
        const viewport = page.getViewport({ scale: 0.18 });
        const c = document.createElement('canvas');
        c.width = viewport.width; c.height = viewport.height;
        await page.render({ canvasContext: c.getContext('2d'), viewport }).promise;
        chip.innerHTML = '';
        chip.appendChild(c);
        io.unobserve(chip);
      });
    }, { root: bar, threshold: 0.1 });
    Array.from(bar.children).forEach(c => io.observe(c));
  }

  /* ---- Excel (sayfa = sekme) — ExcelJS: hücre rengi/yazı tipi/hizalama/
     birleştirilmiş hücreleri okuyabiliyor (SheetJS'in ücretsiz sürümü okuyamıyordu) ---- */
  async function _xlsxYukle(ov, url) {
    const govde = ov.querySelector('#dokOkuyucuGovde');
    try {
      const buf = await (await fetch(url)).arrayBuffer();
      _xlsxWb = new ExcelJS.Workbook();
      await _xlsxWb.xlsx.load(buf);
      _state.tur = 'xlsx';
      _state.toplamSayfa = _xlsxWb.worksheets.length;
      govde.style.overflow = 'auto';
      govde.style.touchAction = 'pan-x pan-y';
      govde.style.alignItems = 'flex-start';
      govde.style.justifyContent = 'flex-start';
      govde.innerHTML = `<div id="dokOkuyucuXlsxSarici" style="background:#fff;padding:14px;transform-origin:top left;flex-shrink:0;box-sizing:border-box;"></div>`;
      _xlsxSayfaRenderEt(ov, 0);
      _thumbBarKur(ov);
    } catch (e) {
      govde.innerHTML = `<div style="color:#fff;padding:20px;text-align:center;">Belge yüklenemedi: ${escapeHtml(e.message)}</div>`;
    }
  }

  // ARGB ("FFRRGGBB") -> CSS hex rengi
  function _argbCss(argb) {
    if (!argb || argb.length < 6) return null;
    const hex = argb.length === 8 ? argb.slice(2) : argb;
    return '#' + hex;
  }

  function _kenarlikCss(kenar) {
    if (!kenar || !kenar.style) return '1px solid #ddd';
    const kalinlik = { thin: '1px', hair: '1px', medium: '2px', thick: '3px', double: '3px' }[kenar.style] || '1px';
    const renk = (kenar.color && kenar.color.argb) ? _argbCss(kenar.color.argb) : '#999';
    return `${kalinlik} solid ${renk}`;
  }

  function _hucreMetni(hucre) {
    const v = hucre.value;
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return escapeHtml(v.toLocaleDateString('tr-TR'));
    if (typeof v === 'object') {
      if (v.richText) return v.richText.map(p => escapeHtml(p.text || '')).join('');
      if (v.result !== undefined && v.result !== null) return escapeHtml(String(v.result)); // formül sonucu
      if (v.text) return escapeHtml(String(v.text));
      return escapeHtml(String(v));
    }
    return escapeHtml(String(v));
  }

  function _sayfaninHtmlBul(ws) {
    // Birleştirilmiş hücreleri haritala: master hücreye rowspan/colspan,
    // diğer hücreleri (aynı birleşimin geri kalanı) atla.
    const master = {};
    const gizli = new Set();
    (ws.model.merges || []).forEach(aralik => {
      const [bas, son] = aralik.split(':');
      const b = ws.getCell(bas), s = ws.getCell(son);
      master[`${b.row}-${b.col}`] = { rowspan: s.row - b.row + 1, colspan: s.col - b.col + 1 };
      for (let r = b.row; r <= s.row; r++) for (let c = b.col; c <= s.col; c++) {
        if (r === b.row && c === b.col) continue;
        gizli.add(`${r}-${c}`);
      }
    });

    let html = '<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;">';
    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      html += '<tr>';
      for (let c = 1; c <= ws.columnCount; c++) {
        const anahtar = `${r}-${c}`;
        if (gizli.has(anahtar)) continue;
        const hucre = row.getCell(c);
        const yayilma = master[anahtar];
        const stiller = ['padding:4px 8px'];

        if (hucre.fill && hucre.fill.type === 'pattern' && hucre.fill.pattern === 'solid' && hucre.fill.fgColor && hucre.fill.fgColor.argb) {
          const renk = _argbCss(hucre.fill.fgColor.argb);
          if (renk && renk.toLowerCase() !== '#000000') stiller.push(`background-color:${renk}`);
        }
        if (hucre.font) {
          if (hucre.font.bold) stiller.push('font-weight:700');
          if (hucre.font.italic) stiller.push('font-style:italic');
          if (hucre.font.underline) stiller.push('text-decoration:underline');
          if (hucre.font.size) stiller.push(`font-size:${hucre.font.size}px`);
          if (hucre.font.color && hucre.font.color.argb) {
            const renk = _argbCss(hucre.font.color.argb);
            if (renk) stiller.push(`color:${renk}`);
          }
        }
        const hiz = hucre.alignment;
        stiller.push(`text-align:${(hiz && hiz.horizontal) || 'left'}`);
        stiller.push(`vertical-align:${(hiz && hiz.vertical === 'middle') ? 'middle' : 'top'}`);
        stiller.push(hiz && hiz.wrapText ? 'white-space:normal' : 'white-space:nowrap');

        const kb = hucre.border || {};
        stiller.push(`border-top:${_kenarlikCss(kb.top)}`);
        stiller.push(`border-left:${_kenarlikCss(kb.left)}`);
        stiller.push(`border-bottom:${_kenarlikCss(kb.bottom)}`);
        stiller.push(`border-right:${_kenarlikCss(kb.right)}`);

        const ozellikler = yayilma
          ? `${yayilma.rowspan > 1 ? `rowspan="${yayilma.rowspan}"` : ''} ${yayilma.colspan > 1 ? `colspan="${yayilma.colspan}"` : ''}`
          : '';
        html += `<td ${ozellikler} style="${stiller.join(';')}">${_hucreMetni(hucre)}</td>`;
      }
      html += '</tr>';
    }
    return html + '</table>';
  }

  function _xlsxSayfaRenderEt(ov, index) {
    const ws = _xlsxWb.worksheets[index];
    const sarici = ov.querySelector('#dokOkuyucuXlsxSarici');
    const govde = ov.querySelector('#dokOkuyucuGovde');
    sarici.style.transform = 'none';
    sarici.innerHTML = `<h4 style="margin-bottom:8px;font-family:Arial,sans-serif;color:#111;white-space:nowrap;">${escapeHtml(ws.name)}</h4>${_sayfaninHtmlBul(ws)}`;
    // Doğal boyutuna göre ekrana tam sığacak ölçeği hesapla (PDF'teki gibi) —
    // zoom bundan itibaren bir ÇARPAN: zoom=1 -> tam sığdırılmış, zoom=4 -> 4x yakın.
    const dogalGenislik = sarici.scrollWidth || 1;
    // NOT: Sadece GENİŞLİĞE göre sığdırıyoruz (yükseklik değil) — aksi halde
    // uzun bir sayfa tüm sayfayı sığdırmak için aşırı küçülüyor ("daralmış"
    // görünüm). Yükseklik fazlası zaten normal şekilde kaydırılıyor.
    _state.tabanOlcek = Math.min(govde.clientWidth / dogalGenislik, 1);
    sarici.style.transformOrigin = 'top left';
    sarici.style.transform = `scale(${_state.tabanOlcek * _state.zoom})`;
    _state.sayfaIndex = index;
    _sayacGuncelle(ov);
  }

  /* ---- Word (mammoth.js + yaklaşık A4 yüksekliğine göre sayfalama) ---- */
  async function _docxYukle(ov, url) {
    const govde = ov.querySelector('#dokOkuyucuGovde');
    try {
      const buf = await (await fetch(url)).arrayBuffer();
      const sonuc = await mammoth.convertToHtml({ arrayBuffer: buf });
      _docxSayfalar = _htmlSayfalaraBol(sonuc.value);
      _state.tur = 'docx';
      _state.toplamSayfa = _docxSayfalar.length;
      govde.style.overflow = 'auto';
      govde.style.touchAction = 'pan-x pan-y';
      govde.style.alignItems = 'flex-start';
      govde.style.justifyContent = 'flex-start';
      govde.innerHTML = `<div id="dokOkuyucuDocxSarici" style="background:#fff;width:max-content;min-width:210mm;min-height:250mm;padding:18mm;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif;font-size:12pt;line-height:1.5;color:#111;flex-shrink:0;transform-origin:top left;"></div>`;
      _docxSayfaRenderEt(ov, 0);
      _thumbBarKur(ov);
    } catch (e) {
      govde.innerHTML = `<div style="color:#fff;padding:20px;text-align:center;">Belge yüklenemedi: ${escapeHtml(e.message)}</div>`;
    }
  }

  // NOT: Word dosyalarının gerçek sayfa sınırları (yazı tipi/yazıcı ayarına
  // göre değiştiği için) tarayıcıda tam olarak bilinemez. Burada içerik
  // bloklarını ölçüp yaklaşık A4 yüksekliğine göre "sanal sayfalara"
  // bölüyoruz — orijinal Word sayfa numaralarıyla birebir eşleşmeyebilir,
  // ama sayfa çevirme deneyimini işlevsel şekilde sağlar.
  function _htmlSayfalaraBol(html) {
    const olcum = document.createElement('div');
    olcum.style.cssText = 'position:absolute; left:-9999px; top:0; width:174mm; font-family:Segoe UI,Arial,sans-serif; font-size:12pt; line-height:1.5;';
    document.body.appendChild(olcum);
    olcum.innerHTML = html;
    const SAYFA_YUKSEKLIK_PX = 950; // ~A4 içerik alanı yaklaşık değeri
    const sayfalar = [];
    let mevcut = '';
    let yukseklik = 0;
    Array.from(olcum.children).forEach((c) => {
      const h = c.offsetHeight || 20;
      if (yukseklik + h > SAYFA_YUKSEKLIK_PX && mevcut) {
        sayfalar.push(mevcut);
        mevcut = '';
        yukseklik = 0;
      }
      mevcut += c.outerHTML;
      yukseklik += h;
    });
    if (mevcut) sayfalar.push(mevcut);
    document.body.removeChild(olcum);
    return sayfalar.length ? sayfalar : [html];
  }

  function _docxSayfaRenderEt(ov, index) {
    const sarici = ov.querySelector('#dokOkuyucuDocxSarici');
    const govde = ov.querySelector('#dokOkuyucuGovde');
    sarici.style.transform = 'none';
    sarici.innerHTML = _docxSayfalar[index] || '';
    const dogalGenislik = sarici.scrollWidth || 1;
    // NOT: Sadece GENİŞLİĞE göre sığdırıyoruz — görselli/uzun sayfalarda
    // tüm yüksekliği sığdırmaya çalışmak aşırı küçültmeye ("daralmış"
    // görünüm) sebep oluyordu. Fazla yükseklik normal kaydırmayla görülür.
    _state.tabanOlcek = Math.min(govde.clientWidth / dogalGenislik, 1);
    sarici.style.transformOrigin = 'top left';
    sarici.style.transform = `scale(${_state.tabanOlcek * _state.zoom})`;
    _state.sayfaIndex = index;
    _sayacGuncelle(ov);
  }

  /* ---- Küçük resim (thumbnail) şeridi ---- */
  function _thumbBarKur(ov) {
    const bar = ov.querySelector('#dokOkuyucuThumbBar');
    bar.innerHTML = '';
    for (let i = 0; i < _state.toplamSayfa; i++) {
      const chip = document.createElement('div');
      chip.dataset.index = i;
      chip.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:50px;height:64px;margin-right:6px;border:2px solid transparent;border-radius:6px;background:#fff;color:#333;font-size:11px;cursor:pointer;overflow:hidden;vertical-align:top;';
      if (_state.tur === 'xlsx') {
        chip.textContent = _xlsxWb.worksheets[i].name;
        chip.style.padding = '4px';
        chip.style.whiteSpace = 'normal';
        chip.style.textAlign = 'center';
        chip.style.lineHeight = '1.2';
      } else {
        chip.textContent = i + 1;
      }
      chip.onclick = () => _sayfayaGit(ov, i);
      bar.appendChild(chip);
    }
    if (_state.tur === 'pdf') _pdfThumbLazyKur(ov, bar);
    _thumbAktifIsaretle(ov);
  }

  function _thumbAktifIsaretle(ov) {
    const bar = ov.querySelector('#dokOkuyucuThumbBar');
    if (!bar) return;
    Array.from(bar.children).forEach((c, i) => {
      c.style.borderColor = (i === _state.sayfaIndex) ? '#2e7d32' : 'transparent';
    });
  }

  /* ---- Dokunma jestleri: swipe (sayfa çevirme) + pinch (zoom) ---- */
  function _mesafe(t1, t2) {
    const dx = t1.clientX - t2.clientX, dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function _zoomUygula(ov) {
    const canvas = ov.querySelector('#dokOkuyucuCanvas');
    if (canvas) {
      canvas.style.transform = `translate(${_state.panX || 0}px, ${_state.panY || 0}px) scale(${_state.zoom})`;
      return;
    }
    const hedef = ov.querySelector('#dokOkuyucuXlsxSarici') || ov.querySelector('#dokOkuyucuDocxSarici');
    if (hedef) hedef.style.transform = `scale(${(_state.tabanOlcek || 1) * _state.zoom})`;
  }

  function _jestleriBagla(ov) {
    const govde = ov.querySelector('#dokOkuyucuGovde');
    let baslangicMesafe = 0, baslangicZoom = 1;
    let swipeBaslangicX = null;
    let surukleniyor = false, surukleBaslangicX = 0, surukleBaslangicY = 0, panBaslangicX = 0, panBaslangicY = 0;

    govde.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        baslangicMesafe = _mesafe(e.touches[0], e.touches[1]);
        baslangicZoom = _state.zoom;
        swipeBaslangicX = null;
        surukleniyor = false;
      } else if (e.touches.length === 1) {
        if (_state.tur === 'pdf' && _state.zoom > 1.02) {
          // Yakınlaştırılmış PDF'te tek parmak = gezinme (pan), sayfa çevirme değil.
          surukleniyor = true;
          surukleBaslangicX = e.touches[0].clientX;
          surukleBaslangicY = e.touches[0].clientY;
          panBaslangicX = _state.panX || 0;
          panBaslangicY = _state.panY || 0;
        } else {
          swipeBaslangicX = e.touches[0].clientX;
        }
      }
    }, { passive: true });

    govde.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const mesafe = _mesafe(e.touches[0], e.touches[1]);
        _state.zoom = Math.min(4, Math.max(1, baslangicZoom * (mesafe / baslangicMesafe)));
        if (_state.zoom <= 1.02) { _state.panX = 0; _state.panY = 0; }
        _zoomUygula(ov);
      } else if (e.touches.length === 1 && surukleniyor) {
        _state.panX = panBaslangicX + (e.touches[0].clientX - surukleBaslangicX);
        _state.panY = panBaslangicY + (e.touches[0].clientY - surukleBaslangicY);
        _zoomUygula(ov);
      }
    }, { passive: true });

    govde.addEventListener('touchend', (e) => {
      if (!surukleniyor && _state.tur === 'pdf' && swipeBaslangicX !== null && _state.zoom <= 1.02 && e.changedTouches.length === 1) {
        const fark = e.changedTouches[0].clientX - swipeBaslangicX;
        if (Math.abs(fark) > 60) {
          if (fark < 0) _sayfayaGit(ov, _state.sayfaIndex + 1);
          else _sayfayaGit(ov, _state.sayfaIndex - 1);
        }
      }
      swipeBaslangicX = null;
      surukleniyor = false;
    });
  }

  /* ---- Overlay iskeleti ---- */
  function _overlayAc(url, ad, uzanti) {
    const eski = document.getElementById('dokOkuyucuOverlay');
    if (eski) eski.remove();

    const ov = document.createElement('div');
    ov.id = 'dokOkuyucuOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#3a3a3a;display:flex;flex-direction:column;';
    ov.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:linear-gradient(135deg,#1b5e20,#2e7d32);color:#fff;padding:10px 12px;flex-wrap:wrap;">
        <span style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:48vw;">${escapeHtml(ad || 'Belge')}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span id="dokOkuyucuSayac" style="background:rgba(255,255,255,.2);border-radius:6px;padding:4px 10px;font-size:12.5px;cursor:pointer;">…</span>
          <button id="dokOkuyucuKapat" style="background:rgba(220,0,0,.4);border:none;color:#fff;border-radius:7px;padding:6px 12px;font-size:13px;font-weight:700;">✕</button>
        </div>
      </div>
      <div id="dokOkuyucuGovde" style="flex:1 1 auto;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#525659;">
        <div style="color:#fff;font-size:13px;">Yükleniyor…</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:10px;padding:8px;background:#2b2b2b;">
        <button id="dokOkuyucuOnceki" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:20px;width:40px;height:40px;font-size:18px;">‹</button>
        <button id="dokOkuyucuThumbToggle" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12.5px;">▦ Sayfalar</button>
        <button id="dokOkuyucuSonraki" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:20px;width:40px;height:40px;font-size:18px;">›</button>
      </div>
      <div id="dokOkuyucuThumbBar" style="display:none;overflow-x:auto;white-space:nowrap;background:#1e1e1e;padding:8px;"></div>
    `;
    document.body.appendChild(ov);
    document.body.classList.add('dlk-overlay-acik');
    if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

    ov.querySelector('#dokOkuyucuKapat').onclick = () => {
      ov.remove();
      document.body.classList.remove('dlk-overlay-acik');
      if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
      _state = null; _pdfDoc = null; _xlsxWb = null; _docxSayfalar = [];
    };
    ov.querySelector('#dokOkuyucuOnceki').onclick = () => _sayfayaGit(ov, _state.sayfaIndex - 1);
    ov.querySelector('#dokOkuyucuSonraki').onclick = () => _sayfayaGit(ov, _state.sayfaIndex + 1);
    ov.querySelector('#dokOkuyucuThumbToggle').onclick = () => {
      const bar = ov.querySelector('#dokOkuyucuThumbBar');
      bar.style.display = (bar.style.display === 'none') ? 'flex' : 'none';
    };
    ov.querySelector('#dokOkuyucuSayac').onclick = () => {
      const girilen = prompt(`Sayfa numarası (1-${_state.toplamSayfa}):`, _state.sayfaIndex + 1);
      if (girilen === null) return;
      const n = parseInt(girilen, 10);
      if (!isNaN(n)) _sayfayaGit(ov, n - 1);
    };

    _state = { url, ad, uzanti, sayfaIndex: 0, toplamSayfa: 0, zoom: 1, panX: 0, panY: 0, tabanOlcek: 1, tur: null };
    _jestleriBagla(ov);

    if (uzanti === 'pdf') _pdfYukle(ov, url);
    else if (uzanti === 'xlsx' || uzanti === 'xls') _xlsxYukle(ov, url);
    else if (uzanti === 'docx') _docxYukle(ov, url);

    return ov;
  }

  // --- Public API ---
  window.DokumanOkuyucu = {
    destekliMi(adVeyaUzanti) {
      return DESTEKLENEN_UZANTILAR.includes(_uzanti(adVeyaUzanti));
    },
    ac(url, ad) {
      const uzanti = _uzanti(ad);
      if (!DESTEKLENEN_UZANTILAR.includes(uzanti)) {
        window.open(url, '_blank');
        return;
      }
      _overlayAc(url, ad, uzanti);
    }
  };

})();
