/* =============================================
   js/tasima-takip.js
   TAŞIMA TAKİP ÇİZELGESİ MODÜLÜ
   Bağımlılıklar: firebase-init.js, tasima.js, nobet.js, app.js
   ============================================= */

(function() {
  'use strict';

  const AY_ISIMLERI = [
    'Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
    'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'
  ];

  const GUNLER = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];

  const SABIT_LISTE_BOYU = 30; // en az 30 kişilik sabit liste

  // Durum değişkenleri
  let _servisId   = null;
  let _servis     = null;
  let _yil        = new Date().getFullYear();
  let _ay         = new Date().getMonth();
  let _veri       = {};
  let _ogrenciler = [];
  let _listeBoyu  = 30;
  let _autoSaveTimer = null;

  // --- Yardımcı fonksiyonlar ---

  function _lsKey() {
    return `tasima_takip_${_servisId}_${_yil}_${String(_ay+1).padStart(2,'0')}`;
  }

  function _isoTarih(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  // Nöbet sayfasındaki resmi tatil listesini kullan (global resmiTatiller + nobetTatilMi)
  function _isResmiTatil(iso) {
    if (typeof nobetTatilMi === 'function') {
      const t = nobetTatilMi(iso);
      return t ? (t.aciklama || 'Resmi Tatil') : null;
    }
    if (typeof resmiTatiller !== 'undefined' && Array.isArray(resmiTatiller)) {
      const t = resmiTatiller.find(x => x.tarih === iso);
      return t ? (t.aciklama || 'Resmi Tatil') : null;
    }
    return null;
  }

  function _yukle() {
    try { _veri = JSON.parse(localStorage.getItem(_lsKey()) || '{}'); }
    catch(e) { _veri = {}; }
  }

  function _veriTopla() {
    const tbody = document.getElementById('ttTbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr[data-tarih]').forEach(tr => {
      const t = tr.dataset.tarih;
      const ins = tr.querySelectorAll('input[type="text"], input[type="number"]');
      if (ins.length >= 4) {
        const e = { gSaat: ins[0].value, gSayi: ins[1].value,
                    aSaat: ins[2].value, aSayi: ins[3].value };
        if (Object.values(e).some(v => v !== '' && v !== '0')) _veri[t] = e;
      }
    });
  }

  // Öğrenci listesi: oturma planı -> veliler koleksiyonu -> servis.ogrenciSayisi'ne göre boş satır
  async function _getOgrenciler(servisId) {
    let liste = [];

    // 1. oy_servisOturma koleksiyonu (servis-oturma.js)
    try {
      const snap = await db.collection(COL.servisOturma)
        .where('servisId','==', servisId).get();
      if (!snap.empty) {
        snap.docs.forEach(doc => {
          const koltuklar = doc.data().koltuklar || {};
          Object.values(koltuklar).forEach(k => {
            if (k && k.ogrenciAdi) {
              let sinifAdi = k.sinifAdi || '';
              if (!sinifAdi && k.sinifId && typeof siniflar !== 'undefined') {
                const sObj = siniflar.find(s => s.id === k.sinifId);
                if (sObj) sinifAdi = sObj.ad;
              }
              liste.push({ ad: k.ogrenciAdi, sinif: sinifAdi });
            }
          });
        });
      }
    } catch(e) {}

    // 2. oy_veliler koleksiyonu (tasima.js - veliler global) — daha güvenilir, sınıf bilgisi her zaman var
    if (!liste.length && typeof veliler !== 'undefined') {
      const svVeliler = veliler.filter(v => v.servisId === servisId)
        .sort((a,b) => (a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));
      liste = svVeliler.map(v => {
        const sinifObj = (typeof siniflar !== 'undefined')
          ? siniflar.find(s => s.id === v.sinifId) : null;
        return { ad: v.ogrenciAdi || '', sinif: sinifObj ? sinifObj.ad : '' };
      });
    }

    // Sınıf adı eksik kalanları doldurmaya çalış (oturma planından gelen kayıtlar için)
    if (typeof veliler !== 'undefined' && typeof siniflar !== 'undefined') {
      liste = liste.map(o => {
        if (o.sinif) return o;
        const vMatch = veliler.find(v => (v.ogrenciAdi||'').trim() === (o.ad||'').trim());
        if (vMatch) {
          const sObj = siniflar.find(s => s.id === vMatch.sinifId);
          if (sObj) return { ...o, sinif: sObj.ad };
        }
        return o;
      });
    }

    // En az SABIT_LISTE_BOYU satır olacak şekilde boş satırlarla tamamla
    // (gerçek öğrenci sayısı daha fazlaysa liste büyütülür, her zaman çift sayıda tutulur)
    let hedefBoy = SABIT_LISTE_BOYU;
    if (liste.length > hedefBoy) {
      hedefBoy = liste.length;
      if (hedefBoy % 2 !== 0) hedefBoy++;
    }
    while (liste.length < hedefBoy) liste.push({ ad: '', sinif: '' });
    _listeBoyu = hedefBoy;

    return liste;
  }

  // Müdür ve Müdür Yardımcısı bilgilerini getir
  function _getMudurBilgileri() {
    let mudurAd = '', mudurYrdAd = '';
    if (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && typeof ogretmenler !== 'undefined') {
      const mudur = ogretmenler.find(o => o.id === okulBilgileriAyari.mudurId);
      if (mudur) mudurAd = `${mudur.ad||''} ${mudur.soyad||''}`.trim();
    }
    if (typeof ogretmenler !== 'undefined') {
      const yrd = ogretmenler.find(o => (o.unvan||'').trim() === 'Müdür Yardımcısı');
      if (yrd) mudurYrdAd = `${yrd.ad||''} ${yrd.soyad||''}`.trim();
    }
    return { mudurAd, mudurYrdAd };
  }

  // --- Modal HTML ---

  function _createModal() {
    if (document.getElementById('ttModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
    <div id="ttModal" onclick="if(event.target===this)TasimaTakip.kapat()">
      <div class="tt-container" onclick="event.stopPropagation()">

        <!-- Header -->
        <div class="tt-header">
          <div class="tt-header-left">
            <button class="tt-btn-icon" onclick="TasimaTakip.ayDegistir(-1)" title="Önceki Ay">◀</button>
            <span class="tt-ay-label" id="ttAyLabel"></span>
            <button class="tt-btn-icon" onclick="TasimaTakip.ayDegistir(1)" title="Sonraki Ay">▶</button>
          </div>
          <div class="tt-header-center">
            <span id="ttHeaderBaslik">TAŞIMA TAKİP ÇİZELGESİ</span>
          </div>
          <div class="tt-header-right">
            <button class="tt-btn-action" onclick="TasimaTakip.kaydet()">💾 Kaydet</button>
            <button class="tt-btn-action" onclick="TasimaTakip.yazdir()">🖨️ Yazdır</button>
            <button class="tt-btn-action" onclick="TasimaTakip.excelIndir()">📊 Excel</button>
            <button class="tt-btn-kapat" onclick="TasimaTakip.kapat()">✕</button>
          </div>
        </div>

        <!-- Yazdırılacak Alan -->
        <div class="tt-print-area" id="ttPrintArea">
          <!-- Sayfa Başlığı -->
          <div class="tt-sayfa-baslik">
            <div class="tt-baslik-1" id="ttBaslik1"></div>
            <div class="tt-baslik-2" id="ttBaslik2"></div>
          </div>

          <!-- Üst Bilgi Tablosu -->
          <table class="tt-info-tablo">
            <tr>
              <td class="tt-lbl">SERVİS ADI</td>
              <td id="ttGuzergah" colspan="3"></td>
              <td class="tt-lbl">CEP NO</td>
              <td id="ttCep"></td>
              <td class="tt-lbl">AİT OLDUĞU AY</td>
              <td id="ttAy"></td>
            </tr>
            <tr>
              <td class="tt-lbl">SÜRÜCÜ</td>
              <td id="ttSofor" colspan="3"></td>
              <td class="tt-lbl">PLAKA</td>
              <td id="ttPlaka" colspan="3"></td>
            </tr>
          </table>

          <!-- Öğrenci Listesi -->
          <div class="tt-ogrenci-grid" id="ttOgrenciGrid"></div>

          <!-- Ana Tablo -->
          <div class="tt-tablo-wrap">
            <table class="tt-ana-tablo" id="ttAnaTablo">
              <thead>
                <tr>
                  <th class="tt-th-tarih" rowspan="2">TARİH</th>
                  <th class="tt-th-sabah" colspan="4">ÖĞLE</th>
                  <th class="tt-th-aksam" colspan="4">AKŞAM</th>
                </tr>
                <tr>
                  <th class="tt-th-sub">GELİŞ<br>SAATİ</th>
                  <th class="tt-th-sub">GELEN<br>SAYI</th>
                  <th class="tt-th-sub">ŞOFÖR<br>İMZA</th>
                  <th class="tt-th-sub">N.ÖĞRT<br>İMZA</th>
                  <th class="tt-th-sub">ÇIKIŞ<br>SAATİ</th>
                  <th class="tt-th-sub">GİDEN<br>SAYI</th>
                  <th class="tt-th-sub">ŞOFÖR<br>İMZA</th>
                  <th class="tt-th-sub">N.ÖĞRT<br>İMZA</th>
                </tr>
              </thead>
              <tbody id="ttTbody"></tbody>
            </table>
          </div>

          <!-- İmza Alanı -->
          <div class="tt-imza-satir">
            <div class="tt-imza-kutu">
              <div class="tt-imza-unvan">Müdür Yardımcısı</div>
              <div class="tt-imza-ad" id="ttMudurYrdAd"></div>
            </div>
            <div class="tt-imza-kutu">
              <div class="tt-imza-unvan">Okul Müdürü</div>
              <div class="tt-imza-ad" id="ttMudurAd"></div>
            </div>
          </div>
        </div><!-- /tt-print-area -->

      </div>
    </div>`);
  }

  // --- Render fonksiyonları ---

  function _renderBaslik() {
    const ayAdi = `${AY_ISIMLERI[_ay]} - ${_yil}`;
    const set = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v||''; };
    set('ttAyLabel', ayAdi);
    set('ttBaslik1', 'KORUK İLK-ORTAOKULU');
    set('ttBaslik2', `${ayAdi} TAŞIMA TAKİP ÇİZELGESİ`);
    if (!_servis) return;
    set('ttGuzergah', _servis.servisAdi || '');
    set('ttCep',      _servis.soforTelefon || '');
    set('ttAy',       ayAdi);
    set('ttSofor',    _servis.soforAdi || '');
    set('ttPlaka',    _servis.plaka || '');
    const { mudurAd, mudurYrdAd } = _getMudurBilgileri();
    set('ttMudurAd',    mudurAd);
    set('ttMudurYrdAd', mudurYrdAd);
  }

  function _renderOgrenciler() {
    const grid = document.getElementById('ttOgrenciGrid');
    if (!grid) return;
    const yarisi = Math.ceil(_listeBoyu / 2);
    const sol    = _ogrenciler.slice(0, yarisi);
    const sag    = _ogrenciler.slice(yarisi, _listeBoyu);

    function kolHtml(liste, baslangic) {
      return `<div class="tt-ogr-col">
        <div class="tt-ogr-head">
          <span>SIRA</span><span>ÖĞRENCİ ADI SOYADI</span><span>SINIF</span>
        </div>
        ${liste.map((o,i) => `
        <div class="tt-ogr-row">
          <span>${baslangic+i+1}</span>
          <span class="tt-ogr-ad">${escapeHtml(o.ad||'')}</span>
          <span>${escapeHtml(o.sinif||'')}</span>
        </div>`).join('')}
      </div>`;
    }
    grid.innerHTML = kolHtml(sol, 0) + kolHtml(sag, yarisi);
  }

  function _renderTablo() {
    const tbody = document.getElementById('ttTbody');
    if (!tbody) return;
    const sonGun = new Date(_yil, _ay+1, 0).getDate();
    let html = '';
    for (let g = 1; g <= sonGun; g++) {
      const dt  = new Date(_yil, _ay, g);
      const iso = _isoTarih(dt);
      const gn  = dt.getDay();
      const hs  = gn === 0 || gn === 6;
      const tatil = !hs ? _isResmiTatil(iso) : null;
      // İstenen format: "1 Haziran 2026 Pazartesi"
      const tarihStr = `${g} ${AY_ISIMLERI[_ay]} ${_yil} ${GUNLER[gn]}`;
      const vd  = _veri[iso] || {};

      if (hs) {
        html += `<tr class="tt-hs" data-tarih="${iso}">
          <td class="tt-tarih-hucre">${tarihStr}</td>
          ${'<td class="tt-hs-cell">Hafta Sonu</td>'.repeat(8)}
        </tr>`;
      } else if (tatil) {
        html += `<tr class="tt-tatil" data-tarih="${iso}" title="${escapeHtml(tatil)}">
          <td class="tt-tarih-hucre">${tarihStr}</td>
          ${'<td class="tt-tatil-cell">Resmi Tatil</td>'.repeat(8)}
        </tr>`;
      } else {
        html += `<tr class="tt-gun" data-tarih="${iso}">
          <td class="tt-tarih-hucre">${tarihStr}</td>
          <td><input type="text" inputmode="numeric" maxlength="5" placeholder="" value="${vd.gSaat||''}" oninput="TasimaTakip._otoKaydet()"></td>
          <td><input type="number" min="0" max="999" value="${vd.gSayi||''}" placeholder="0" oninput="TasimaTakip._otoKaydet()"></td>
          <td class="tt-imza-hucre"></td>
          <td class="tt-imza-hucre"></td>
          <td><input type="text" inputmode="numeric" maxlength="5" placeholder="" value="${vd.aSaat||''}" oninput="TasimaTakip._otoKaydet()"></td>
          <td><input type="number" min="0" max="999" value="${vd.aSayi||''}" placeholder="0" oninput="TasimaTakip._otoKaydet()"></td>
          <td class="tt-imza-hucre"></td>
          <td class="tt-imza-hucre"></td>
        </tr>`;
      }
    }
    tbody.innerHTML = html;
  }

  // --- Public API ---
  window.TasimaTakip = {

    _otoKaydet() {
      clearTimeout(_autoSaveTimer);
      _autoSaveTimer = setTimeout(() => this.kaydet(true), 2000);
    },

    async ac(servisId) {
      _servisId = servisId;
      _yil = new Date().getFullYear();
      _ay  = new Date().getMonth();

      _createModal();

      _servis = (typeof servisler !== 'undefined')
        ? servisler.find(s => s.id === servisId) || null
        : null;

      _ogrenciler = await _getOgrenciler(servisId);
      _yukle();

      _renderBaslik();
      _renderOgrenciler();
      _renderTablo();

      document.getElementById('ttModal').style.display = 'flex';
      document.body.classList.add('modal-open');
    },

    ayDegistir(delta) {
      this.kaydet(true);
      _ay += delta;
      if (_ay < 0)  { _ay = 11; _yil--; }
      if (_ay > 11) { _ay = 0;  _yil++; }
      _yukle();
      _renderBaslik();
      _renderTablo();
    },

    kaydet(sessiz = false) {
      _veriTopla();
      localStorage.setItem(_lsKey(), JSON.stringify(_veri));
      if (!sessiz && typeof toast === 'function') toast('Çizelge kaydedildi ✓');
    },

    kapat() {
      this.kaydet(true);
      const m = document.getElementById('ttModal');
      if (m) m.style.display = 'none';
      document.body.classList.remove('modal-open');
    },

    yazdir() {
      this.kaydet(true);
      window.print();
    },

    excelIndir() {
      this.kaydet(true);
      const ayAdi  = `${AY_ISIMLERI[_ay]}_${_yil}`;
      const plaka  = _servis ? (_servis.plaka || 'arac') : 'arac';
      const sonGun = new Date(_yil, _ay+1, 0).getDate();
      let csv = `\uFEFFKORUK İLK-ORTAOKULU ${AY_ISIMLERI[_ay]} ${_yil} TAŞIMA TAKİP ÇİZELGESİ\n`;
      csv += `Servis Adı:;${_servis?.servisAdi||''};Şoför:;${_servis?.soforAdi||''};Plaka:;${_servis?.plaka||''}\n\n`;
      csv += `TARİH;GELİŞ SAATİ;GELEN SAYI;ÇIKIŞ SAATİ;GİDEN SAYI\n`;
      for (let g = 1; g <= sonGun; g++) {
        const dt  = new Date(_yil, _ay, g);
        const iso = _isoTarih(dt);
        const hs  = dt.getDay()===0||dt.getDay()===6;
        const tatil = !hs ? _isResmiTatil(iso) : null;
        const tar = `${g} ${AY_ISIMLERI[_ay]} ${_yil} ${GUNLER[dt.getDay()]}`;
        if (hs) { csv += `${tar};Hafta Sonu;Hafta Sonu;Hafta Sonu;Hafta Sonu\n`; }
        else if (tatil) { csv += `${tar};Resmi Tatil;Resmi Tatil;Resmi Tatil;Resmi Tatil\n`; }
        else {
          const vd = _veri[iso] || {};
          csv += `${tar};${vd.gSaat||''};${vd.gSayi||''};${vd.aSaat||''};${vd.aSayi||''}\n`;
        }
      }
      const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `tasima_takip_${plaka}_${ayAdi}.csv`;
      a.click(); URL.revokeObjectURL(url);
      if (typeof toast === 'function') toast('Excel indiriliyor...');
    }
  };

})();
