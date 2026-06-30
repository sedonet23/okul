/* =============================================
   js/puantaj.js
   PERSONEL PUANTAJ VE İMZA SİRKÜSÜ MODÜLÜ
   Excel referans: ŞAHİN_PUANTAJ-İMZA_SİRKÜSÜ — sayfa düzeni,
   satır/sütun yerleşimi ve kod sözlüğü birebir esas alınmıştır.
   Bağımlılıklar: firebase-init.js, personel.js, app.js
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

  const GUNLER_KISA = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const AY_ISIMLERI = [
    'Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
    'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'
  ];

  // --- Durum ---
  let _personelId = null;
  let _personel = null;
  let personelIzinler = [];  // tüm personellerin izin kayıtları (global, baglantilariKur ile dolar)

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
    const okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi)
      ? okulBilgileriAyari.okulAdi : 'KORUK İLK - ORTAOKULU';
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

  // Excel mantığı: izin yoksa ve hafta sonuysa "HAFTA TATİLİ", değilse boş (normal gün)
  function _gunDurumMetni(iso, dt, izinKayitlari) {
    const izin = _gunIzinTuru(iso, izinKayitlari);
    if (izin) return izin;
    if (_haftaSonuMu(dt)) return 'HAFTA TATİLİ';
    return '';
  }

  // PUANTAJ kodunu üretir (Excel E5 formülü ile birebir aynı mantık)
  function _gunKodu(iso, dt, izinKayitlari) {
    const durum = _gunDurumMetni(iso, dt, izinKayitlari);
    if (durum === '') return KOD_X;
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
      if (!baslangic || !bitis) { toast('Başlangıç ve bitiş tarihi zorunludur.'); return; }
      if (bitis < baslangic) { toast('Bitiş tarihi başlangıçtan önce olamaz.'); return; }
      kaydet(COL.personelIzinler, k?k.id:null, {
        personelId: personelId,
        tur: tur,
        baslangic: baslangic,
        bitis: bitis,
        aciklama: document.getElementById('f_izinAciklama').value.trim()
      });
      modalKapat();
      setTimeout(function(){ if (typeof personelDetayAc === 'function') personelDetayAc(personelId); }, 300);
    }, k ? function(){
      if (confirm('Bu izin kaydını silmek istediğinize emin misiniz?')) {
        db.collection(COL.personelIzinler).doc(k.id).delete();
        modalKapat();
        setTimeout(function(){ if (typeof personelDetayAc === 'function') personelDetayAc(personelId); }, 300);
      }
    } : null);
  }

  function personelIzinBaglantilariKur() {
    db.collection(COL.personelIzinler).onSnapshot(function(s){
      personelIzinler = s.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
    }, hataGoster);
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
      const hs = _haftaSonuMu(g.tarih);
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
'  table { width: 100%; border-collapse: collapse; }' +
'  .pz-baslik-tablo, .pz-ana-tablo { border: 2.5px solid #000; }' +
'  td, th { border: 1px solid #000; padding: 2px 4px; }' +
'  .pz-baslik-ana { font-size: 14pt; font-weight: 700; text-align: center; padding: 6px; border-bottom: 1.5px solid #000 !important; }' +
'  .pz-isim-satir { font-size: 10pt; font-weight: 700; text-align: center; background: #ECE9D8; padding: 4px; border-bottom: 1.5px solid #000 !important; }' +
'  .pz-tarih-baslik { background: #ECE9D8; text-align: center; font-weight: 700; border-right: 1.5px solid #000 !important; }' +
'  .pz-tc-satir { font-size: 9.5pt; font-weight: 700; text-align: center; padding: 4px; background: #ECE9D8; }' +
'  .pz-bos-bej { background: #ECE9D8; }' +
'  .pz-ana-tablo th { font-size: 7.5pt; font-weight: 700; text-align: center; background: #ECE9D8; padding: 3px 2px; }' +
'  .pz-ana-tablo td { font-size: 7pt; vertical-align: middle; }' +
'  .pz-tarih { text-align: left; font-weight: 700; white-space: nowrap; width: 26%; border-right: 1.5px solid #000 !important; padding-left: 6px; }' +
'  .pz-durum { text-align: center; font-weight: 700; width: 11%; }' +
'  .pz-imza { width: 12.5%; }' +
'  tr.pz-hs td.pz-durum { background: #f5f5f5; }' +
'  .pz-ana-tablo tr td { border-bottom: 1px solid #999; }' +
'  .pz-onay-blok { margin-top: 8px; text-align: right; }' +
'  .pz-onay-blok .ad { font-weight: 700; font-size: 9pt; }' +
'  .pz-onay-blok .unvan { font-size: 8pt; color: #333; }' +
'  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }' +
'</style>' +
'</head>' +
'<body>' +
'  <table class="pz-baslik-tablo">' +
'    <tr><td class="pz-baslik-ana" colspan="7">' + escapeHtml(okul.okulAdi.toLocaleUpperCase('tr')) + ' SÜREKLİ VE GEÇİCİ İŞÇİLERE AİT İMZA SİRKÜSÜ</td></tr>' +
'    <tr><td class="pz-isim-satir" colspan="7">İSİM SOYİSİM</td></tr>' +
'    <tr>' +
'      <td rowspan="2" class="pz-tarih-baslik">TARİH</td>' +
'      <td class="pz-tc-satir" colspan="2">' + escapeHtml(state.adSoyad||'') + '<br>TC NO: ' + escapeHtml(state.tc||'') + '</td>' +
'      <td class="pz-bos-bej" colspan="4"></td>' +
'    </tr>' +
'    <tr>' +
'      <th>SABAH GİRİŞ</th>' +
'      <th>AKŞAM ÇIKIŞ</th>' +
'      <th class="pz-bos-bej"></th><th class="pz-bos-bej"></th><th class="pz-bos-bej"></th><th class="pz-bos-bej"></th>' +
'    </tr>' +
'  </table>' +
'  <table class="pz-ana-tablo">' +
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
      const hs = _haftaSonuMu(g.tarih);
      return '<th class="pt-gun-baslik ' + (hs?'pt-hs-baslik':'') + '"><div class="pt-rot-wrap"><div class="pt-rot">' + _tarihTr(g.tarih) + ', ' + escapeHtml(GUNLER_KISA[g.tarih.getDay()]) + '</div></div></th>';
    }).join('');

    const kodlar = gunler.map(function(g){ return _gunKodu(g.iso, g.tarih, izinKayitlari); });
    const kodHucreleriHtml = gunler.map(function(g,i){
      const hs = _haftaSonuMu(g.tarih);
      return '<td class="' + (hs?'pt-hs-hucre':'') + '">' + escapeHtml(kodlar[i]) + '</td>';
    }).join('');

    const sayim = { X:0, H:0, Y:0, M:0, R:0, 'CÇ':0, 'PÇ':0, UBGT:0 };
    kodlar.forEach(function(k){ if (sayim.hasOwnProperty(k)) sayim[k]++; });
    const toplam = sayim.X + sayim.H + sayim.Y;

    // Excel'de personel satırının altında 9 boş satır daha bulunuyor (toplam 10 satırlık kadro alanı).
    const bosHucreSayisi = gunler.length + 9; // gün sütunları + 9 özet sütunu (NORMAL..TOPLAM)
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
'  .pt-ana-tablo th { font-size: 7pt; font-weight: 700; text-align: center; background: #f2f2f2; height: 95px; vertical-align: bottom; padding: 0 0 4px; border: 1px solid #000; }' +
'  .pt-ana-tablo thead tr:last-child th { border-bottom: 1.5px solid #000; }' +
'  .pt-hs-baslik { color: #c00; }' +
'  .pt-rot-wrap { position: relative; height: 90px; overflow: visible; }' +
'  .pt-rot { position: absolute; bottom: 4px; left: 50%; transform-origin: left bottom; transform: rotate(-90deg); white-space: nowrap; font-size: 7pt; line-height: 1; }' +
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
'      <td rowspan="2" colspan="3" class="pt-okul-adi" style="width:220px;">' + escapeHtml(okul.okulAdi.toLocaleUpperCase('tr')) + '</td>' +
'      <td class="pt-cetvel-baslik">PUANTAJ CETVELİ</td>' +
'      <td class="pt-ay-yil">AY: ' + escapeHtml(ayKisaBaslik) + '</td>' +
'      <td class="pt-ay-yil">YIL: ' + yil + '</td>' +
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
'          <tr><td class="k">PAZAR TAM ÇALIŞMASI</td><td>PÇ</td><td class="k" style="padding-left:18px;">UBGT TAM ÇALIŞMASI</td><td>UBGT</td></tr>' +
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
          '<button id="ptPrintBtn" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">🖨️ Yazdır / PDF</button>' +
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
    };
    ov.querySelector('#ptPrintBtn').onclick = function(){
      const fr = ov.querySelector('#ptFrame');
      fr.contentWindow.focus();
      fr.contentWindow.print();
    };

    return ov;
  }

  function _formPanelHtml(state) {
    return '<h3 style="font-size:15px;margin-bottom:14px;color:#1b5e20;">Dönem Seçimi</h3>' +
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
      '</div>';
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
      formPanel.querySelector('#pt_baslangic').onchange = function(e){
        state.baslangic = e.target.value;
        frame.srcdoc = state.aktifSekme === 'imza' ? _imzaSirkususHtml(state) : _puantajHtml(state);
      };
      formPanel.querySelector('#pt_bitis').onchange = function(e){
        state.bitis = e.target.value;
        frame.srcdoc = state.aktifSekme === 'imza' ? _imzaSirkususHtml(state) : _puantajHtml(state);
      };
    }

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
