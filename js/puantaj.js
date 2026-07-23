/* =============================================
   js/puantaj.js
   PERSONEL PUANTAJ VE İMZA SİRKÜSÜ MODÜLÜ — UI KATMANI
   Excel referans: ŞAHİN_PUANTAJ-İMZA_SİRKÜSÜ — sayfa düzeni,
   satır/sütun yerleşimi ve kod sözlüğü birebir esas alınmıştır.
   Bağımlılıklar: firebase-init.js, personel.js, app.js

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya)          → sadece DOM + PersonelService çağrısı, db bilmez
     js/core/services/personel.service.js    → iş kuralı + yetki kontrolü
     js/core/repositories/personel.repository.js → TEK Firestore erişim noktası
   ============================================= */

(function() {
  'use strict';

  // --- İzin türleri ve Excel kod sözlüğü (PUANTAJ sayfası AK3:AR3 + E16:Q19 referans) ---
  const IZIN_TUR_KOD = {
    'YILLIK İZİNLİ': 'Y',
    'RAPORLU': 'R',
    'ÜCRETSİZ MAZERET İZNİ': 'M',
    'CUMARTESİ ÇALIŞMASI': 'CÇ',
    'PAZAR TAM ÇALIŞMASI': 'PÇ',
    'UBGT TAM ÇALIŞMASI': 'UBGT'
  };
  const IZIN_TURLERI = Object.keys(IZIN_TUR_KOD);
  const KOD_X = 'X';      // normal çalışma (varsayılan)
  const KOD_H = 'H';      // hafta tatili (Cmt/Paz otomatik)
  const KOD_T = 'T';      // resmi tatil (nöbet modülündeki resmiTatiller ile paylaşılan liste)

  const GUNLER_KISA = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const AY_ISIMLERI = [
    'Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
    'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'
  ];

  // --- Durum ---
  let _personelId = null;
  let _personel = null;
  let personelIzinler = [];  // tüm personellerin izin kayıtları (global, baglantilariKur ile dolar)
  let _ptYazdirmaHandler = null; // aktif overlay'in yazdırma fonksiyonu (overlay her açıldığında yeniden atanır)
  let _ptIndirmeHandler = null;  // aktif overlay'in HTML indirme fonksiyonu

  // --- Yardımcılar ---

  function _isoTarih(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function _parseIso(iso) {
    const [y,m,d] = iso.split('-').map(Number);
    return new Date(y, m-1, d);
  }
  function _tarihTr(d) {
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  }
  function _haftaSonuMu(d) {
    const g = d.getDay();
    return g === 0 || g === 6; // 0=Pazar, 6=Cumartesi
  }

  function _getOkulBilgisi() {
    // YENİ: Kişinin fiilen çalıştığı okula göre (İlkokul/Ortaokul) doğru okul
    // adı kullanılır; her iki okulda da çalışıyorsa ya da belirtilmemişse
    // birleşik okul adına düşülür (bkz. js/app.js kisiyeGoreOkulAdi()).
    let okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi)
      ? okulBilgileriAyari.okulAdi : 'KORUK İLK - ORTAOKULU';
    if (_personel && typeof kisiyeGoreOkulAdi === 'function') okulAdi = kisiyeGoreOkulAdi(_personel);
    let mudurAd = '';
    if (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && typeof ogretmenler !== 'undefined') {
      const mudur = ogretmenler.find(o => o.id === okulBilgileriAyari.mudurId);
      if (mudur) mudurAd = (mudur.ad||'') + ' ' + (mudur.soyad||'');
      mudurAd = mudurAd.trim();
    }
    return { okulAdi, mudurAd };
  }

  // Bir tarih için, o personelin izin kaydı var mı? Varsa türünü döndürür.
  function _gunIzinTuru(iso, izinKayitlari) {
    const k = izinKayitlari.find(x => iso >= x.baslangic && iso <= x.bitis);
    return k ? k.tur : null;
  }

  // Paylaşılan resmi tatil listesi (js/nobet.js > resmiTatiller, app.js baglantilariKur ile
  // gerçek zamanlı senkron tutulur). Puantaj modülü bu listeyi salt-okunur kullanır; ekleme/
  // silme NobetService üzerinden yapılır ki Nöbet modülüyle TEK kaynak olarak kalsın.
  function _resmiTatilVeri(iso) {
    return (typeof resmiTatiller !== 'undefined' && resmiTatiller) ? resmiTatiller.find(function(t){ return t.tarih === iso; }) : null;
  }
  function _resmiTatilListesi(baslangicIso, bitisIso) {
    return ((typeof resmiTatiller !== 'undefined' && resmiTatiller) ? resmiTatiller : [])
      .filter(function(t){ return t.tarih >= baslangicIso && t.tarih <= bitisIso; })
      .sort(function(a,b){ return a.tarih.localeCompare(b.tarih); });
  }

  // Excel mantığı: izin yoksa, resmi tatil yoksa ve hafta sonuysa "HAFTA TATİLİ", değilse boş (normal gün)
  function _gunDurumMetni(iso, dt, izinKayitlari) {
    const izin = _gunIzinTuru(iso, izinKayitlari);
    if (izin) return izin;
    if (_resmiTatilVeri(iso)) return 'RESMİ TATİL';
    if (_haftaSonuMu(dt)) return 'HAFTA TATİLİ';
    return '';
  }

  // PUANTAJ kodunu üretir (Excel E5 formülü ile birebir aynı mantık + resmi tatil eklentisi)
  function _gunKodu(iso, dt, izinKayitlari) {
    const durum = _gunDurumMetni(iso, dt, izinKayitlari);
    if (durum === '') return KOD_X;
    if (durum === 'RESMİ TATİL') return KOD_T;
    if (durum === 'HAFTA TATİLİ') return KOD_H;
    return IZIN_TUR_KOD[durum] || '';
  }

  function _ayAraligiBasligi(baslangicIso, bitisIso) {
    const b = _parseIso(baslangicIso), s = _parseIso(bitisIso);
    const bAy = b.getMonth(), sAy = s.getMonth();
    const bYil = b.getFullYear(), sYil = s.getFullYear();
    if (bAy === sAy && bYil === sYil) return AY_ISIMLERI[bAy].toLocaleUpperCase('tr') + ' ' + bYil;
    if (bYil === sYil) return AY_ISIMLERI[bAy].toLocaleUpperCase('tr') + ' - ' + AY_ISIMLERI[sAy].toLocaleUpperCase('tr') + ' ' + bYil;
    return AY_ISIMLERI[bAy].toLocaleUpperCase('tr') + ' ' + bYil + ' - ' + AY_ISIMLERI[sAy].toLocaleUpperCase('tr') + ' ' + sYil;
  }

  function _gunListesiUret(baslangicIso, bitisIso) {
    const liste = [];
    let dt = _parseIso(baslangicIso);
    const bitisDt = _parseIso(bitisIso);
    while (dt <= bitisDt) {
      liste.push({ iso: _isoTarih(dt), tarih: new Date(dt) });
      dt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()+1);
    }
    return liste;
  }

  // =========================================================
  // İZİN KAYITLARI — CRUD (Personel detay panelinden yönetilir)
  // =========================================================

  function izinKayitlariniGetir(personelId) {
    return (typeof personelIzinler !== 'undefined' ? personelIzinler : [])
      .filter(function(k){ return k.personelId === personelId; })
      .sort(function(a,b){ return (a.baslangic||'').localeCompare(b.baslangic||''); });
  }

  function renderPersonelIzinListesi(personelId) {
    const hedef = document.getElementById('pIzinListesi');
    if (!hedef) return;
    const liste = izinKayitlariniGetir(personelId);
    hedef.innerHTML = liste.length ? liste.map(function(k){
      return '<div class="evrak-row">' +
        '<div class="evrak-body">' +
          '<div class="evrak-title">' + escapeHtml(k.tur) + ' <span class="badge badge-blue">' + (IZIN_TUR_KOD[k.tur]||'') + '</span></div>' +
          '<div class="evrak-meta">' + escapeHtml(_tarihTr(_parseIso(k.baslangic))) + ' — ' + escapeHtml(_tarihTr(_parseIso(k.bitis))) + (k.aciklama ? ' · '+escapeHtml(k.aciklama) : '') + '</div>' +
        '</div>' +
        '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); personelIzinModalAc(\'' + personelId + '\',\'' + k.id + '\')">Düzenle</button>' +
      '</div>';
    }).join('') : '<div class="empty-state" style="padding:14px;">Bu personel için izin/rapor kaydı yok.</div>';
  }

  function personelIzinModalAc(personelId, izinId) {
    const k = izinId ? personelIzinler.find(function(x){ return x.id === izinId; }) : null;
    const izinSecenekleriHtml = IZIN_TURLERI.map(function(t){
      return '<option value="' + escapeHtml(t) + '" ' + (k && k.tur===t ? 'selected':'') + '>' + escapeHtml(t) + ' (' + IZIN_TUR_KOD[t] + ')</option>';
    }).join('');

    const body =
      '<div class="form-group"><label>İzin / Durum Türü</label>' +
        '<select id="f_izinTur">' + izinSecenekleriHtml + '</select>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group"><label>Başlangıç Tarihi</label><input id="f_izinBaslangic" type="date" value="' + (k?escapeHtml(k.baslangic||''):'') + '"></div>' +
        '<div class="form-group"><label>Bitiş Tarihi</label><input id="f_izinBitis" type="date" value="' + (k?escapeHtml(k.bitis||''):'') + '"></div>' +
      '</div>' +
      '<div class="form-group"><label>Açıklama (opsiyonel)</label><input id="f_izinAciklama" value="' + (k?escapeHtml(k.aciklama||''):'') + '" placeholder="örn: Dilekçe no, rapor no vb."></div>';

    modalAc(k?'İzin Kaydını Düzenle':'Yeni İzin / Durum Kaydı', body, function(){
      const tur = document.getElementById('f_izinTur').value;
      const baslangic = document.getElementById('f_izinBaslangic').value;
      const bitis = document.getElementById('f_izinBitis').value;
      if (!PersonelService.tarihAraligiGecerliMi(baslangic, bitis)) { toast('Başlangıç ve bitiş tarihi zorunludur, bitiş başlangıçtan önce olamaz.'); return; }
      PersonelService.izinKaydet(k?k.id:null, {
        personelId: personelId,
        tur: tur,
        baslangic: baslangic,
        bitis: bitis,
        aciklama: document.getElementById('f_izinAciklama').value.trim()
      }).then(function(){ toast('Kaydedildi.'); }).catch(function(err){ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
      modalKapat();
      setTimeout(function(){ if (typeof personelDetayAc === 'function') personelDetayAc(personelId); }, 300);
    }, k ? function(){
      if (confirm('Bu izin kaydını silmek istediğinize emin misiniz?')) {
        PersonelService.izinSil(k.id).catch(function(err){ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
        modalKapat();
        setTimeout(function(){ if (typeof personelDetayAc === 'function') personelDetayAc(personelId); }, 300);
      }
    } : null);
  }

  /* Artık doğrudan db.collection() çağrılmıyor — PersonelRepository üzerinden dinleniyor. */
  function personelIzinBaglantilariKur() {
    PersonelRepository.izinleriDinle(function(v){
      personelIzinler = v;
      // Personel detay paneli açıkken (izin kaydı ekleme/silme sonrası veya
      // başka bir cihazdan gelen değişiklikte) listeyi canlı güncelle —
      // bkz. js/ogretmen-izin.js'teki eşdeğer desen.
      const overlay = document.getElementById('detayOverlay');
      if (overlay && overlay.classList.contains('active') && window._acikPersonelDetayId) {
        renderPersonelIzinListesi(window._acikPersonelDetayId);
      }
    });
  }

  // =========================================================
  // İMZA SİRKÜSÜ — A4 Dikey, Excel "İMZA SİRKÜSÜ" sayfası referans
  // =========================================================

  function _imzaSirkususHtml(state) {
    const okul = _getOkulBilgisi();
    const gunler = _gunListesiUret(state.baslangic, state.bitis);
    const izinKayitlari = izinKayitlariniGetir(state.personelId);

    const satirlarHtml = gunler.map(function(g){
      const durum = _gunDurumMetni(g.iso, g.tarih, izinKayitlari);
      const gunAdi = GUNLER_KISA[g.tarih.getDay()];
      const hs = _haftaSonuMu(g.tarih) || !!_resmiTatilVeri(g.iso);
      return '<tr class="' + (hs?'pz-hs':'') + '">' +
        '<td class="pz-tarih">' + _tarihTr(g.tarih) + ', ' + escapeHtml(gunAdi) + '</td>' +
        '<td class="pz-durum">' + escapeHtml(durum) + '</td>' +
        '<td class="pz-durum">' + escapeHtml(durum) + '</td>' +
        '<td class="pz-imza"></td>' +
        '<td class="pz-imza"></td>' +
        '<td class="pz-imza"></td>' +
        '<td class="pz-imza"></td>' +
      '</tr>';
    }).join('');

    return '<!DOCTYPE html>' +
'<html lang="tr">' +
'<head>' +
'<meta charset="UTF-8">' +
'<title>' + escapeHtml(state.adSoyad||'Personel') + ' — İmza Sirküsü</title>' +
'<style>' +
'  @page { size: A4 portrait; margin: 8mm; }' +
'  * { box-sizing: border-box; margin: 0; padding: 0; }' +
'  body { font-family: Calibri, Arial, sans-serif; color: #000; background: #fff; font-size: 9pt; }' +
'  table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 2.5px solid #000; }' +
'  td, th { border: 1px solid #000; padding: 2px 4px; overflow: hidden; }' +
'  col.pz-c-tarih { width: 24%; }' +
'  col.pz-c-durum { width: 17%; }' +
'  col.pz-c-imza { width: 9.5%; }' +
'  .pz-baslik-ana { font-size: 14pt; font-weight: 700; text-align: center; padding: 6px; border-bottom: 1.5px solid #000 !important; }' +
'  .pz-isim-satir { font-size: 10pt; font-weight: 700; text-align: center; background: #ECE9D8; padding: 4px; border-bottom: 1.5px solid #000 !important; }' +
'  .pz-tarih-baslik { background: #ECE9D8; text-align: center; font-weight: 700; border-right: 1.5px solid #000 !important; }' +
'  .pz-tc-satir { font-size: 9.5pt; font-weight: 700; text-align: center; padding: 4px; background: #ECE9D8; }' +
'  .pz-bos-bej { background: #ECE9D8; border-left: 1.5px solid #000 !important; }' +
'  .pz-sg-ac-baslik { font-size: 7.5pt; font-weight: 700; text-align: center; background: #ECE9D8; padding: 3px 2px; border-bottom: 2px solid #000 !important; }' +
'  .pz-tarih { text-align: left; font-weight: 700; white-space: nowrap; border-right: 1.5px solid #000 !important; padding-left: 6px; font-size: 7pt; }' +
'  .pz-durum { text-align: center; font-weight: 700; font-size: 7pt; }' +
'  .pz-imza { font-size: 7pt; }' +
'  tr.pz-hs td.pz-durum { background: #f5f5f5; }' +
'  tbody tr td { border-bottom: 1px solid #999; }' +
'  .pz-onay-blok { margin-top: 8px; text-align: right; }' +
'  .pz-onay-blok .ad { font-weight: 700; font-size: 9pt; }' +
'  .pz-onay-blok .unvan { font-size: 8pt; color: #333; }' +
'  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }' +
'</style>' +
'</head>' +
'<body>' +
'  <table>' +
'    <colgroup>' +
'      <col class="pz-c-tarih">' +
'      <col class="pz-c-durum"><col class="pz-c-durum">' +
'      <col class="pz-c-imza"><col class="pz-c-imza"><col class="pz-c-imza"><col class="pz-c-imza">' +
'    </colgroup>' +
'    <thead>' +
'      <tr><td class="pz-baslik-ana" colspan="7">' + escapeHtml(okul.okulAdi.toLocaleUpperCase('tr')) + ' SÜREKLİ VE GEÇİCİ İŞÇİLERE AİT İMZA SİRKÜSÜ</td></tr>' +
'      <tr><td class="pz-isim-satir" colspan="7">İSİM SOYİSİM</td></tr>' +
'      <tr>' +
'        <td rowspan="2" class="pz-tarih-baslik">TARİH</td>' +
'        <td class="pz-tc-satir" colspan="2">' + escapeHtml(state.adSoyad||'') + '<br>TC NO: ' + escapeHtml(state.tc||'') + '</td>' +
'        <td class="pz-bos-bej" colspan="4"></td>' +
'      </tr>' +
'      <tr>' +
'        <th class="pz-sg-ac-baslik">SABAH GİRİŞ</th>' +
'        <th class="pz-sg-ac-baslik">AKŞAM ÇIKIŞ</th>' +
'        <th class="pz-sg-ac-baslik pz-bos-bej"></th><th class="pz-sg-ac-baslik pz-bos-bej"></th><th class="pz-sg-ac-baslik pz-bos-bej"></th><th class="pz-sg-ac-baslik pz-bos-bej"></th>' +
'      </tr>' +
'    </thead>' +
'    <tbody>' + satirlarHtml + '</tbody>' +
'  </table>' +
'  <div class="pz-onay-blok">' +
'    <div style="font-size:8pt;font-weight:700;">ONAY</div>' +
'    <div class="ad">' + escapeHtml(okul.mudurAd||'') + '</div>' +
'    <div class="unvan">Okul Müdürü</div>' +
'  </div>' +
'</body>' +
'</html>';
  }

  // =========================================================
  // PUANTAJ — A4 Yatay, Excel "PUANTAJ" sayfası referans
  // =========================================================

  function _puantajHtml(state) {
    const okul = _getOkulBilgisi();
    const gunler = _gunListesiUret(state.baslangic, state.bitis);
    const izinKayitlari = izinKayitlariniGetir(state.personelId);
    const ayBasligi = _ayAraligiBasligi(state.baslangic, state.bitis);
    const yil = _parseIso(state.baslangic).getFullYear();

    const gunBasliklariHtml = gunler.map(function(g){
      const hs = _haftaSonuMu(g.tarih) || !!_resmiTatilVeri(g.iso);
      return '<th class="pt-gun-baslik ' + (hs?'pt-hs-baslik':'') + '"><div class="pt-rot-wrap"><div class="pt-rot">' + _tarihTr(g.tarih) + ', ' + escapeHtml(GUNLER_KISA[g.tarih.getDay()]) + '</div></div></th>';
    }).join('');

    const kodlar = gunler.map(function(g){ return _gunKodu(g.iso, g.tarih, izinKayitlari); });
    const kodHucreleriHtml = gunler.map(function(g,i){
      const hs = _haftaSonuMu(g.tarih) || !!_resmiTatilVeri(g.iso);
      return '<td class="' + (hs?'pt-hs-hucre':'') + '">' + escapeHtml(kodlar[i]) + '</td>';
    }).join('');

    const sayim = { X:0, H:0, T:0, Y:0, M:0, R:0, 'CÇ':0, 'PÇ':0, UBGT:0 };
    kodlar.forEach(function(k){ if (sayim.hasOwnProperty(k)) sayim[k]++; });
    const toplam = sayim.X + sayim.H + sayim.T + sayim.Y;

    // Excel'de personel satırının altında 9 boş satır daha bulunuyor (toplam 10 satırlık kadro alanı).
    const bosHucreSayisi = gunler.length + 10; // gün sütunları + 10 özet sütunu (NORMAL..TOPLAM, RESMİ TATİL dahil)
    let bosSatirlarHtml = '';
    for (let s = 2; s <= 10; s++) {
      bosSatirlarHtml += '<tr><td class="pt-sno">' + s + '</td><td class="pt-ad"></td><td class="pt-tc"></td>' +
        '<td></td>'.repeat(bosHucreSayisi) + '</tr>';
    }

    const ayKisaBaslik = ayBasligi.split(' ').slice(0,-1).join(' ');

    return '<!DOCTYPE html>' +
'<html lang="tr">' +
'<head>' +
'<meta charset="UTF-8">' +
'<title>' + escapeHtml(state.adSoyad||'Personel') + ' — Puantaj Cetveli</title>' +
'<style>' +
'  @page { size: A4 landscape; margin: 6mm; }' +
'  * { box-sizing: border-box; margin: 0; padding: 0; }' +
'  body { font-family: \'Times New Roman\', Times, serif; color: #000; background: #fff; font-size: 8pt; }' +
'  table { width: 100%; border-collapse: collapse; }' +
'  .pt-ana-tablo { table-layout: fixed; }' +
'  td, th { border: 1px solid #000; padding: 1px 2px; overflow: hidden; }' +
'  .pt-ust-tablo { border: 2.5px solid #000; }' +
'  .pt-ust-tablo td { border: 1.5px solid #000; }' +
'  .pt-okul-adi { font-size: 22pt; font-weight: 700; text-align: center; padding: 4px; border-right: 1.5px solid #000 !important; }' +
'  .pt-cetvel-baslik { font-size: 13pt; font-weight: 700; text-align: center; }' +
'  .pt-ay-yil { font-size: 10.5pt; font-weight: 700; text-align: center; }' +
'  .pt-ana-tablo { border: 2.5px solid #000; }' +
'  .pt-ana-tablo th { font-size: 7pt; font-weight: 700; text-align: center; background: #f2f2f2; height: 105px; vertical-align: bottom; padding: 0 0 4px; border: 1px solid #000; }' +
'  .pt-ana-tablo thead tr:last-child th { border-bottom: 1.5px solid #000; }' +
'  .pt-hs-baslik { color: #c00; }' +
'  .pt-rot-wrap { position: relative; height: 100px; width: 100%; overflow: hidden; }' +
'  .pt-rot { position: absolute; bottom: 2px; left: 50%; width: 98px; transform-origin: 0 100%; transform: rotate(-90deg) translateX(0); white-space: nowrap; font-size: 6.3pt; line-height: 1; overflow: hidden; text-overflow: ellipsis; }' +
'  .pt-ana-tablo td { text-align: center; font-size: 7.5pt; font-weight: 700; border: 1px solid #000; }' +
'  .pt-ana-tablo tbody tr:first-child td { border-bottom: 1.5px solid #000; }' +
'  .pt-hs-hucre { color: #c00; }' +
'  .pt-sno { width: 4.5mm; }' +
'  .pt-ad { width: 34mm; text-align: left !important; font-weight: 400 !important; }' +
'  .pt-tc { width: 17mm; }' +
'  .pt-gun-baslik { width: 5mm; }' +
'  .pt-ozet { width: 5.5mm; font-size: 7pt; }' +
'  .pt-kod-aciklama { margin-top: 6px; display: flex; gap: 24px; font-size: 8pt; }' +
'  .pt-kod-aciklama table { width: auto; }' +
'  .pt-kod-aciklama td { border: none; padding: 1px 6px; }' +
'  .pt-kod-aciklama .k { color: #c00; font-weight: 700; }' +
'  .pt-onay-kutu { margin-top: 6px; border: 2.5px solid #000; width: 260px; text-align: center; padding: 6px; }' +
'  .pt-onay-kutu .baslik { font-size: 8pt; font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 6px; }' +
'  .pt-onay-kutu .ad { font-size: 10pt; font-weight: 700; }' +
'  .pt-alt-satir { display: flex; justify-content: space-between; align-items: flex-end; }' +
'  .pt-not { font-size: 7pt; max-width: 480px; }' +
'  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }' +
'</style>' +
'</head>' +
'<body>' +
'  <table class="pt-ust-tablo">' +
'    <tr>' +
'      <td colspan="6" class="pt-okul-adi">' + escapeHtml(okul.okulAdi.toLocaleUpperCase('tr')) + '</td>' +
'    </tr>' +
'    <tr>' +
'      <td class="pt-cetvel-baslik" colspan="3">PUANTAJ CETVELİ</td>' +
'      <td class="pt-ay-yil">AY: ' + escapeHtml(ayKisaBaslik) + '</td>' +
'      <td class="pt-ay-yil" colspan="2">YIL: ' + yil + '</td>' +
'    </tr>' +
'  </table>' +
'  <table class="pt-ana-tablo">' +
'    <thead>' +
'      <tr>' +
'        <th class="pt-sno" rowspan="2">S.NO</th>' +
'        <th class="pt-ad" rowspan="2">ADI VE SOYADI</th>' +
'        <th class="pt-tc" rowspan="2">T.C NO</th>' +
'        ' + gunBasliklariHtml +
'        <th class="pt-ozet" rowspan="2"><div class="pt-rot-wrap"><div class="pt-rot">NORMAL ÇALIŞMA</div></div></th>' +
'        <th class="pt-ozet" rowspan="2"><div class="pt-rot-wrap"><div class="pt-rot">HAFTA TATİLİ</div></div></th>' +
'        <th class="pt-ozet" rowspan="2"><div class="pt-rot-wrap"><div class="pt-rot">RESMİ TATİL</div></div></th>' +
'        <th class="pt-ozet" rowspan="2"><div class="pt-rot-wrap"><div class="pt-rot">YILLIK İZİN</div></div></th>' +
'        <th class="pt-ozet" rowspan="2"><div class="pt-rot-wrap"><div class="pt-rot">ÜCRETSİZ MAZERET İZNİ</div></div></th>' +
'        <th class="pt-ozet" rowspan="2"><div class="pt-rot-wrap"><div class="pt-rot">RAPORLU</div></div></th>' +
'        <th class="pt-ozet" rowspan="2"><div class="pt-rot-wrap"><div class="pt-rot">CUMARTESİ ÇALIŞMASI</div></div></th>' +
'        <th class="pt-ozet" rowspan="2"><div class="pt-rot-wrap"><div class="pt-rot">PAZAR TAM ÇALIŞMASI</div></div></th>' +
'        <th class="pt-ozet" rowspan="2"><div class="pt-rot-wrap"><div class="pt-rot">UBGT ÇALIŞMASI</div></div></th>' +
'        <th class="pt-ozet" rowspan="2"><div class="pt-rot-wrap"><div class="pt-rot">TOPLAM</div></div></th>' +
'      </tr>' +
'    </thead>' +
'    <tbody>' +
'      <tr>' +
'        <td class="pt-sno">1</td>' +
'        <td class="pt-ad">' + escapeHtml(state.adSoyad||'') + '</td>' +
'        <td class="pt-tc">' + escapeHtml(state.tc||'') + '</td>' +
'        ' + kodHucreleriHtml +
'        <td>' + sayim.X + '</td>' +
'        <td>' + sayim.H + '</td>' +
'        <td>' + sayim.T + '</td>' +
'        <td>' + sayim.Y + '</td>' +
'        <td>' + sayim.M + '</td>' +
'        <td>' + sayim.R + '</td>' +
'        <td>' + sayim['CÇ'] + '</td>' +
'        <td>' + sayim['PÇ'] + '</td>' +
'        <td>' + sayim.UBGT + '</td>' +
'        <td>' + toplam + '</td>' +
'      </tr>' +
'      ' + bosSatirlarHtml +
'    </tbody>' +
'  </table>' +
'  <div class="pt-alt-satir">' +
'    <div>' +
'      <table class="pt-kod-aciklama"><tr><td>' +
'        <table>' +
'          <tr><td class="k">NORMAL ÇALIŞMA</td><td>X</td><td class="k" style="padding-left:18px;">RAPORLU</td><td>R</td></tr>' +
'          <tr><td class="k">YILLIK İZİNLİ</td><td>Y</td><td class="k" style="padding-left:18px;">ÜCRETSİZ MAZERET İZNİ</td><td>M</td></tr>' +
'          <tr><td class="k">HAFTA TATİLİ</td><td>H</td><td class="k" style="padding-left:18px;">CUMARTESİ ÇALIŞMASI</td><td>CÇ</td></tr>' +
'          <tr><td class="k">RESMİ TATİL</td><td>T</td><td class="k" style="padding-left:18px;">UBGT TAM ÇALIŞMASI</td><td>UBGT</td></tr>' +
'          <tr><td class="k">PAZAR TAM ÇALIŞMASI</td><td>PÇ</td></tr>' +
'        </table>' +
'      </td></tr></table>' +
'      <div class="pt-not">' +
'        NOT:<br>' +
'        *PUANTAJLAR HER AYIN EN GEÇ 5\'İNDE MAAŞ MÜTEMETLİĞİ (İŞÇİ) BÖLÜMÜNE ELDEN TESLİM EDİLECEK<br>' +
'        *ZAMANINDA TESLİM EDİLMEYEN VE EKSİKLİKLERDEN PUANTAJ DÜZENLEYEN MÜDÜRLÜKLER SORUMLUDUR' +
'      </div>' +
'    </div>' +
'    <div class="pt-onay-kutu">' +
'      <div class="baslik">OKUL / KURUM MÜDÜRÜ / İMZA</div>' +
'      <div class="ad">' + escapeHtml(okul.mudurAd||'') + '</div>' +
'    </div>' +
'  </div>' +
'</body>' +
'</html>';
  }

  // =========================================================
  // Overlay (in-page) — ay/dönem seçimi + önizleme + yazdırma
  // =========================================================

  function _overlayOlustur() {
    if (document.getElementById('ptOverlay')) return document.getElementById('ptOverlay');

    const ov = document.createElement('div');
    ov.id = 'ptOverlay';
    ov.style.cssText = 'position:fixed; inset:0; z-index:99999; background:#525659; display:flex; flex-direction:column;';
    ov.innerHTML =
      '<div id="ptToolbar" style="display:flex; align-items:center; justify-content:space-between; gap:10px; background: linear-gradient(135deg,#1b5e20,#2e7d32); color:#fff; padding:10px 14px; flex-wrap:wrap;">' +
        '<span style="font-weight:700;font-size:14px;">🗓️ Puantaj ve İmza Sirküsü</span>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button id="ptTabImza" style="background:rgba(255,255,255,.35);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">📋 İmza Sirküsü</button>' +
          '<button id="ptTabPuantaj" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">📊 Puantaj</button>' +
          '<button id="ptPrintBtn" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">🖨️ Yazdır</button>' +
          '<button id="ptIndirBtn" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">💾 HTML İndir</button>' +
          '<button id="ptCloseBtn" style="background:rgba(220,0,0,.4);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">✕ Kapat</button>' +
        '</div>' +
      '</div>' +
      '<div style="flex:1 1 auto; overflow:auto; display:flex; flex-wrap:wrap; gap:16px; padding:16px; justify-content:center; align-items:flex-start;">' +
        '<div id="ptFormPanel" style="background:#fff; border-radius:10px; padding:16px; width:300px; max-width:100%; box-shadow:0 4px 14px rgba(0,0,0,.3); font-family:\'Segoe UI\',Arial,sans-serif;"></div>' +
        '<iframe id="ptFrame" style="width:210mm; min-height:297mm; border:none; background:#fff; box-shadow:0 4px 18px rgba(0,0,0,.4);"></iframe>' +
      '</div>';
    document.body.appendChild(ov);
    document.body.classList.add('pt-overlay-acik');

    ov.querySelector('#ptCloseBtn').onclick = function(){
      ov.remove();
      document.body.classList.remove('pt-overlay-acik');
      if (typeof _menuyeGeriDon === 'function') _menuyeGeriDon();
    };
    ov.querySelector('#ptPrintBtn').onclick = function(){
      if (typeof _ptYazdirmaHandler === 'function') {
        _ptYazdirmaHandler();
      }
    };
    ov.querySelector('#ptIndirBtn').onclick = function(){
      if (typeof _ptIndirmeHandler === 'function') {
        _ptIndirmeHandler();
      }
    };

    return ov;
  }

  function _personelSeciciHtml(state) {
    const liste = (typeof personelListesi !== 'undefined' && personelListesi) ? personelListesi.slice() : [];
    liste.sort(function(a,b){ return (a.adSoyad||'').localeCompare(b.adSoyad||'', 'tr'); });
    const secenekler = '<option value="">— Personel seçin —</option>' +
      liste.map(function(p){
        const secili = p.id === state.personelId ? ' selected' : '';
        return '<option value="' + escapeHtml(p.id) + '"' + secili + '>' + escapeHtml(p.adSoyad||'İsimsiz') + '</option>';
      }).join('');
    return '<div style="margin-bottom:14px;">' +
        '<label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Personel</label>' +
        '<select id="pt_personel" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;background:#fff;">' + secenekler + '</select>' +
      '</div>';
  }

  function _tatilYonetimHtml(state) {
    const tatiller = _resmiTatilListesi(state.baslangic, state.bitis);
    const listeHtml = tatiller.length
      ? tatiller.map(function(t){
          return '<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #e6dfc2;font-size:11.5px;">' +
            '<span style="flex:1;">' + escapeHtml(_tarihTr(_parseIso(t.tarih))) + (t.aciklama ? ' — ' + escapeHtml(t.aciklama) : '') + '</span>' +
            '<button type="button" class="pt-tatil-sil" data-id="' + escapeHtml(t.id) + '" title="Kaldır" style="background:none;border:none;color:#b00020;cursor:pointer;font-size:13px;padding:2px 4px;">🗑</button>' +
          '</div>';
        }).join('')
      : '<div style="font-size:11.5px;color:#888;padding:4px 0;">Bu dönemde resmi tatil eklenmemiş.</div>';
    return '<div style="margin-top:14px;padding:10px;background:#fdf3e3;border-radius:8px;">' +
        '<h4 style="font-size:12.5px;font-weight:700;color:#7a4a00;margin-bottom:8px;">🎉 Resmi Tatiller</h4>' +
        '<div id="pt_tatilListe" style="margin-bottom:10px;">' + listeHtml + '</div>' +
        '<div style="display:flex;gap:6px;margin-bottom:6px;">' +
          '<input id="pt_tatilTarih" type="date" style="flex:1;padding:6px 7px;border:1px solid #ccc;border-radius:6px;font-size:12.5px;">' +
        '</div>' +
        '<input id="pt_tatilAciklama" type="text" placeholder="Açıklama (örn: 19 Mayıs)" style="width:100%;padding:6px 7px;border:1px solid #ccc;border-radius:6px;font-size:12.5px;margin-bottom:6px;">' +
        '<button type="button" id="pt_tatilEkleBtn" style="width:100%;background:#c98a1e;border:none;color:#fff;border-radius:6px;padding:7px;font-size:12.5px;font-weight:700;cursor:pointer;">+ Tatil Ekle</button>' +
        '<div style="font-size:10.5px;color:#7a5c00;margin-top:6px;line-height:1.4;">Bu liste Nöbet modülüyle ortaktır; eklenen/kaldırılan tatiller nöbet takviminde de yansır.</div>' +
      '</div>';
  }

  function _formPanelHtml(state) {
    return '<h3 style="font-size:15px;margin-bottom:14px;color:#1b5e20;">Dönem Seçimi</h3>' +
      _personelSeciciHtml(state) +
      '<div style="margin-bottom:12px;">' +
        '<label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Başlangıç Tarihi</label>' +
        '<input id="pt_baslangic" type="date" value="' + escapeHtml(state.baslangic||'') + '" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">' +
      '</div>' +
      '<div style="margin-bottom:16px;">' +
        '<label style="font-size:12.5px;font-weight:700;color:#555;display:block;margin-bottom:5px;">Bitiş Tarihi</label>' +
        '<input id="pt_bitis" type="date" value="' + escapeHtml(state.bitis||'') + '" style="width:100%;padding:7px 8px;border:1px solid #ccc;border-radius:6px;font-size:13px;">' +
      '</div>' +
      '<div style="background:#f0f7f0;border-radius:8px;padding:10px;font-size:11.5px;color:#444;line-height:1.6;">' +
        '<div><strong>Personel:</strong> ' + escapeHtml(state.adSoyad||'—') + '</div>' +
        '<div><strong>TC:</strong> ' + escapeHtml(state.tc||'—') + '</div>' +
        '<div><strong>Görev:</strong> ' + escapeHtml(state.gorev||'—') + '</div>' +
      '</div>' +
      '<div style="margin-top:12px;padding:10px;background:#fff8e1;border-radius:8px;font-size:11px;color:#7a5c00;line-height:1.5;">' +
        '💡 İzin, rapor ve mazeret kayıtlarını personel detay panelindeki "İzin / Rapor Kayıtları" bölümünden ekleyebilirsiniz. Buradaki dönemde otomatik olarak işlenir.' +
      '</div>' +
      _tatilYonetimHtml(state);
  }

  function _overlayDoldur(ov) {
    const bugun = new Date();
    const ayBaslangic = new Date(bugun.getFullYear(), bugun.getMonth(), 1);
    const ayBitis = new Date(bugun.getFullYear(), bugun.getMonth()+1, 0);

    const state = {
      personelId: _personelId,
      adSoyad: _personel ? _personel.adSoyad : '',
      tc: _personel ? _personel.tc : '',
      gorev: _personel ? _personel.gorev : '',
      baslangic: _isoTarih(ayBaslangic),
      bitis: _isoTarih(ayBitis),
      aktifSekme: 'imza'
    };

    const formPanel = ov.querySelector('#ptFormPanel');
    const frame = ov.querySelector('#ptFrame');
    const tabImza = ov.querySelector('#ptTabImza');
    const tabPuantaj = ov.querySelector('#ptTabPuantaj');

    function _sekmeGuncelle() {
      const aktif = 'rgba(255,255,255,.35)', pasif = 'rgba(255,255,255,.2)';
      tabImza.style.background = state.aktifSekme === 'imza' ? aktif : pasif;
      tabPuantaj.style.background = state.aktifSekme === 'puantaj' ? aktif : pasif;
    }

    function render() {
      formPanel.innerHTML = _formPanelHtml(state);
      frame.srcdoc = state.aktifSekme === 'imza' ? _imzaSirkususHtml(state) : _puantajHtml(state);
      _sekmeGuncelle();
      _bagla();
    }

    function _bagla() {
      formPanel.querySelector('#pt_personel').onchange = function(e){
        const secilenId = e.target.value || null;
        const secilenPersonel = (secilenId && typeof personelListesi !== 'undefined')
          ? personelListesi.find(function(p){ return p.id === secilenId; }) || null
          : null;
        state.personelId = secilenId;
        state.adSoyad = secilenPersonel ? secilenPersonel.adSoyad : '';
        state.tc = secilenPersonel ? secilenPersonel.tc : '';
        state.gorev = secilenPersonel ? secilenPersonel.gorev : '';
        _personelId = secilenId;
        _personel = secilenPersonel;
        render();
      };
      formPanel.querySelector('#pt_baslangic').onchange = function(e){
        state.baslangic = e.target.value;
        frame.srcdoc = state.aktifSekme === 'imza' ? _imzaSirkususHtml(state) : _puantajHtml(state);
        _tatilListesiGuncelle();
      };
      formPanel.querySelector('#pt_bitis').onchange = function(e){
        state.bitis = e.target.value;
        frame.srcdoc = state.aktifSekme === 'imza' ? _imzaSirkususHtml(state) : _puantajHtml(state);
        _tatilListesiGuncelle();
      };
      formPanel.querySelector('#pt_tatilEkleBtn').onclick = function(){
        const tarihEl = formPanel.querySelector('#pt_tatilTarih');
        const aciklamaEl = formPanel.querySelector('#pt_tatilAciklama');
        const tarih = tarihEl.value;
        const aciklama = aciklamaEl.value.trim();
        if (!tarih) { toast('Lütfen bir tarih seçin.'); return; }
        if (_resmiTatilVeri(tarih)) { toast('Bu tarih zaten resmi tatil listesinde.'); return; }
        NobetService.tatilEkle({ tarih: tarih, aciklama: aciklama })
          .then(function(){
            tarihEl.value = '';
            aciklamaEl.value = '';
            toast('Resmi tatil eklendi.');
            setTimeout(function(){ _tatilListesiGuncelle(); frame.srcdoc = state.aktifSekme === 'imza' ? _imzaSirkususHtml(state) : _puantajHtml(state); }, 400);
          })
          .catch(function(err){ if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
      };
      _tatilSilButonlariBagla(formPanel);
    }

    function _tatilSilButonlariBagla(kapsam) {
      const silButonlari = kapsam.querySelectorAll('.pt-tatil-sil');
      for (let i = 0; i < silButonlari.length; i++) {
        silButonlari[i].onclick = function(e){
          const id = e.currentTarget.getAttribute('data-id');
          if (!confirm('Bu resmi tatili kaldırmak istiyor musunuz?')) return;
          NobetService.tatilSil(id)
            .then(function(){
              toast('Resmi tatil kaldırıldı.');
              setTimeout(function(){ _tatilListesiGuncelle(); frame.srcdoc = state.aktifSekme === 'imza' ? _imzaSirkususHtml(state) : _puantajHtml(state); }, 400);
            })
            .catch(function(err){ if (err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
        };
      }
    }

    function _tatilListesiGuncelle() {
      const blok = formPanel.querySelector('#pt_tatilListe');
      if (!blok) return;
      const tatiller = _resmiTatilListesi(state.baslangic, state.bitis);
      blok.innerHTML = tatiller.length
        ? tatiller.map(function(t){
            return '<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #e6dfc2;font-size:11.5px;">' +
              '<span style="flex:1;">' + escapeHtml(_tarihTr(_parseIso(t.tarih))) + (t.aciklama ? ' — ' + escapeHtml(t.aciklama) : '') + '</span>' +
              '<button type="button" class="pt-tatil-sil" data-id="' + escapeHtml(t.id) + '" title="Kaldır" style="background:none;border:none;color:#b00020;cursor:pointer;font-size:13px;padding:2px 4px;">🗑</button>' +
            '</div>';
          }).join('')
        : '<div style="font-size:11.5px;color:#888;padding:4px 0;">Bu dönemde resmi tatil eklenmemiş.</div>';
      _tatilSilButonlariBagla(blok);
    }

    function _yazdir() {
      const html = state.aktifSekme === 'imza' ? _imzaSirkususHtml(state) : _puantajHtml(state);
      const isAdi = (state.aktifSekme === 'imza' ? 'Imza_Sirkusu_' : 'Puantaj_') +
        (state.adSoyad || 'personel').replace(/\s+/g, '_');

      if (typeof uygulamaHtmlYazdir === 'function') {
        uygulamaHtmlYazdir(html, isAdi, 'yatay');
        return;
      }

      // Ortak yardımcı yüklenememişse (beklenmedik durum) son çare: doğrudan window.print()
      try { window.print(); } catch(e) { toast('Yazdırma başlatılamadı: ' + e.message); }
    }

    function _htmlIndir() {
      const html = state.aktifSekme === 'imza' ? _imzaSirkususHtml(state) : _puantajHtml(state);
      const dosyaAdi = (state.aktifSekme === 'imza' ? 'imza_sirkusu_' : 'puantaj_') +
        (state.adSoyad || 'personel').replace(/\s+/g, '_') + '.html';
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = dosyaAdi;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
      if (typeof toast === 'function') {
        toast('Dosya indirildi. İndirilenler klasöründen açıp Chrome\'da Yazdır / PDF olarak kaydet diyebilirsiniz.');
      }
    }

    _ptYazdirmaHandler = _yazdir;
    _ptIndirmeHandler = _htmlIndir;

    tabImza.onclick = function(){ state.aktifSekme = 'imza'; render(); };
    tabPuantaj.onclick = function(){ state.aktifSekme = 'puantaj'; render(); };

    render();
  }

  // --- Public API ---
  window.PuantajSistemi = {
    ac: function(personelId) {
      _personelId = personelId || null;
      _personel = (_personelId && typeof personelListesi !== 'undefined')
        ? personelListesi.find(function(p){ return p.id === _personelId; }) || null
        : null;

      const ov = _overlayOlustur();
      _overlayDoldur(ov);
    }
  };

  // personel.js'in detay panelinden çağrılabilmesi için global izin yönetim fonksiyonları
  window.renderPersonelIzinListesi = renderPersonelIzinListesi;
  window.personelIzinModalAc = personelIzinModalAc;
  window.izinKayitlariniGetir = izinKayitlariniGetir;
  window.personelIzinBaglantilariKur = personelIzinBaglantilariKur;

})();
