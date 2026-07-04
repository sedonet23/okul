/* =============================================
   js/maas-degisiklik.js
   MAAŞ DEĞİŞİKLİĞİ BİLDİRİM FORMU
   Kullanıcının kullandığı Excel formuyla (8 bölüm: A-H) birebir aynı
   satır/sütun düzeni, başlık ve not metinleri. Veri girişi normal form
   alanlarıyla yapılır (satır ekle/çıkar), "Yazdır/PDF" ise Excel'deki
   görünüme sadık, A4'e uygun bir çıktı üretir.

   Mimari not: Bu modül Firestore'a hiç yazmaz — personelListesi'nden
   (zaten yüklü) kişi seçilince TC/Ad/Görev otomatik doldurulur, ay'a
   özel olaylar (ayrılma nedeni, terfi tarihi vb.) elle girilir. Form
   verisi sayfa yenilenince sıfırlanır — kalıcı saklama istenirse ayrı
   bir aşamada eklenebilir.
   ============================================= */

(function() {
  'use strict';

  const AYLAR_TR = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];

  let _state = null;

  function _bosState() {
    const simdi = new Date();
    return {
      ay: AYLAR_TR[simdi.getMonth()],
      yil: simdi.getFullYear(),
      gecenAyPersonelSayisi: (typeof personelListesi !== 'undefined' ? personelListesi.length : 0),
      buAyGiren: 0,
      buAyCikan: 0,
      aylikSizIzinde: 0,
      B: [], C: [], D: [], E: [], F: [], G: [], H: []
    };
  }

  function _bosSatir(bolum) {
    switch(bolum) {
      case 'B': case 'C': return { tc:'', ad:'', gorev:'', tarih:'', neden:'' };
      case 'D': return { tc:'', ad:'', gorev:'', eskiDerece:'', eskiKademe:'', yeniDerece:'', yeniKademe:'', terfiTarihi:'' };
      case 'E': return { tc:'', ad:'', onceki:'', yeni:'' };
      case 'F': return { tc:'', ad:'', neden:'', hesapNo:'', oran:'' };
      case 'G': return { tc:'', ad:'', baslama:'', bitis:'', gunSayisi:'' };
      case 'H': return { tc:'', ad:'', ayrilanSendika:'', ayrilmaTarihi:'', girilenSendika:'', girmeTarihi:'', uyelikNo:'' };
    }
  }

  function _personelSecenekleriHtml(seciliTc) {
    const liste = (typeof personelListesi !== 'undefined' ? personelListesi : []).slice()
      .sort((a,b)=>(a.adSoyad||'').localeCompare(b.adSoyad||'','tr'));
    return '<option value="">— Personel seç (TC/Ad/Görev otomatik dolar) —</option>' +
      liste.map(p => `<option value="${p.id}" ${seciliTc===p.tc?'selected':''}>${escapeHtml(p.adSoyad||'')}</option>`).join('');
  }

  function _personelSecildi(bolum, index, personelId) {
    const p = (typeof personelListesi !== 'undefined' ? personelListesi : []).find(x=>x.id===personelId);
    const satir = _state[bolum][index];
    if (p) {
      satir.tc = p.tc || ''; satir.ad = p.adSoyad || ''; satir.gorev = p.gorev || '';
    } else {
      satir.tc = ''; satir.ad = ''; satir.gorev = '';
    }
    _render();
  }

  /* ---------- Bölüm form panelleri (veri girişi) ---------- */

  function _satirEkle(bolum) {
    _state[bolum].push(_bosSatir(bolum));
    _render();
  }
  function _satirSil(bolum, index) {
    _state[bolum].splice(index, 1);
    _render();
  }

  function _bolumBCHtml(bolum, baslik) {
    const satirlar = _state[bolum];
    return `
      <div class="mdf-bolum">
        <div class="mdf-bolum-baslik">${baslik}</div>
        ${satirlar.map((s,i)=>`
          <div class="mdf-satir">
            <select onchange="MaasDegisiklikFormu._personelSec('${bolum}',${i},this.value)" style="flex:2;">${_personelSecenekleriHtml(s.tc)}</select>
            <input type="date" value="${s.tarih}" onchange="MaasDegisiklikFormu._alanGuncelle('${bolum}',${i},'tarih',this.value)" style="flex:1;" title="${bolum==='B'?'Görevden Ayrıldığı Tarih':'Göreve Başlama Tarihi'}">
            <input type="text" value="${escapeHtml(s.neden)}" placeholder="${bolum==='B'?'Ayrılma Nedeni':'Başlama Nedeni'}" onchange="MaasDegisiklikFormu._alanGuncelle('${bolum}',${i},'neden',this.value)" style="flex:2;">
            <button type="button" class="mdf-satir-sil" onclick="MaasDegisiklikFormu._satirSilTikla('${bolum}',${i})">✕</button>
          </div>`).join('') || '<p class="empty-state" style="margin:6px 0;">Kayıt yok.</p>'}
        <button type="button" class="btn btn-ghost btn-sm" onclick="MaasDegisiklikFormu._satirEkleTikla('${bolum}')">➕ Satır Ekle</button>
      </div>`;
  }

  function _bolumDHtml() {
    const satirlar = _state.D;
    return `
      <div class="mdf-bolum">
        <div class="mdf-bolum-baslik">D) Terfi Edecek Personel <span style="font-weight:400;">(İntibak, Derece/Kademe Terfii)</span></div>
        ${satirlar.map((s,i)=>`
          <div class="mdf-satir" style="flex-wrap:wrap;">
            <select onchange="MaasDegisiklikFormu._personelSec('D',${i},this.value)" style="flex:2 1 160px;">${_personelSecenekleriHtml(s.tc)}</select>
            <input type="number" value="${s.eskiDerece}" placeholder="Eski Derece" onchange="MaasDegisiklikFormu._alanGuncelle('D',${i},'eskiDerece',this.value)" style="width:80px;">
            <input type="number" value="${s.eskiKademe}" placeholder="Eski Kademe" onchange="MaasDegisiklikFormu._alanGuncelle('D',${i},'eskiKademe',this.value)" style="width:80px;">
            <input type="number" value="${s.yeniDerece}" placeholder="Yeni Derece" onchange="MaasDegisiklikFormu._alanGuncelle('D',${i},'yeniDerece',this.value)" style="width:80px;">
            <input type="number" value="${s.yeniKademe}" placeholder="Yeni Kademe" onchange="MaasDegisiklikFormu._alanGuncelle('D',${i},'yeniKademe',this.value)" style="width:80px;">
            <input type="date" value="${s.terfiTarihi}" onchange="MaasDegisiklikFormu._alanGuncelle('D',${i},'terfiTarihi',this.value)" style="flex:1 1 130px;" title="Terfi Tarihi">
            <button type="button" class="mdf-satir-sil" onclick="MaasDegisiklikFormu._satirSilTikla('D',${i})">✕</button>
          </div>`).join('') || '<p class="empty-state" style="margin:6px 0;">Kayıt yok.</p>'}
        <button type="button" class="btn btn-ghost btn-sm" onclick="MaasDegisiklikFormu._satirEkleTikla('D')">➕ Satır Ekle</button>
      </div>`;
  }

  function _bolumEHtml() {
    const satirlar = _state.E;
    return `
      <div class="mdf-bolum">
        <div class="mdf-bolum-baslik">E) Maaş Değişikliği Yapılacak Personel <span style="font-weight:400;">(Aile/Çocuk Yrd., Ünvan, Kariyer Basamağı, Tazminat vb.)</span></div>
        ${satirlar.map((s,i)=>`
          <div class="mdf-satir">
            <select onchange="MaasDegisiklikFormu._personelSec('E',${i},this.value)" style="flex:1.5;">${_personelSecenekleriHtml(s.tc)}</select>
            <input type="text" value="${escapeHtml(s.onceki)}" placeholder="Önceki Durumu" onchange="MaasDegisiklikFormu._alanGuncelle('E',${i},'onceki',this.value)" style="flex:2;">
            <input type="text" value="${escapeHtml(s.yeni)}" placeholder="Yeni Durumu" onchange="MaasDegisiklikFormu._alanGuncelle('E',${i},'yeni',this.value)" style="flex:2;">
            <button type="button" class="mdf-satir-sil" onclick="MaasDegisiklikFormu._satirSilTikla('E',${i})">✕</button>
          </div>`).join('') || '<p class="empty-state" style="margin:6px 0;">Kayıt yok.</p>'}
        <button type="button" class="btn btn-ghost btn-sm" onclick="MaasDegisiklikFormu._satirEkleTikla('E')">➕ Satır Ekle</button>
      </div>`;
  }

  function _bolumFHtml() {
    const satirlar = _state.F;
    return `
      <div class="mdf-bolum">
        <div class="mdf-bolum-baslik">F) Kesintiler <span style="font-weight:400;">(İcra, Nafaka, Ceza, İkraz vb.)</span></div>
        ${satirlar.map((s,i)=>`
          <div class="mdf-satir">
            <select onchange="MaasDegisiklikFormu._personelSec('F',${i},this.value)" style="flex:1.5;">${_personelSecenekleriHtml(s.tc)}</select>
            <input type="text" value="${escapeHtml(s.neden)}" placeholder="Kesintinin Nedeni" onchange="MaasDegisiklikFormu._alanGuncelle('F',${i},'neden',this.value)" style="flex:1.5;">
            <input type="text" value="${escapeHtml(s.hesapNo)}" placeholder="Ödeneceği Yer/Hesap No" onchange="MaasDegisiklikFormu._alanGuncelle('F',${i},'hesapNo',this.value)" style="flex:1.5;">
            <input type="text" value="${escapeHtml(s.oran)}" placeholder="Oranı/Miktarı" onchange="MaasDegisiklikFormu._alanGuncelle('F',${i},'oran',this.value)" style="flex:1;">
            <button type="button" class="mdf-satir-sil" onclick="MaasDegisiklikFormu._satirSilTikla('F',${i})">✕</button>
          </div>`).join('') || '<p class="empty-state" style="margin:6px 0;">Kayıt yok.</p>'}
        <button type="button" class="btn btn-ghost btn-sm" onclick="MaasDegisiklikFormu._satirEkleTikla('F')">➕ Satır Ekle</button>
      </div>`;
  }

  function _bolumGHtml() {
    const satirlar = _state.G;
    return `
      <div class="mdf-bolum">
        <div class="mdf-bolum-baslik">G) Raporlu Gün <span style="font-weight:400;">(7 günü geçen istirahat raporları)</span></div>
        ${satirlar.map((s,i)=>`
          <div class="mdf-satir">
            <select onchange="MaasDegisiklikFormu._personelSec('G',${i},this.value)" style="flex:1.5;">${_personelSecenekleriHtml(s.tc)}</select>
            <input type="date" value="${s.baslama}" onchange="MaasDegisiklikFormu._alanGuncelle('G',${i},'baslama',this.value)" style="flex:1;" title="Raporun Başlama Tarihi">
            <input type="date" value="${s.bitis}" onchange="MaasDegisiklikFormu._alanGuncelle('G',${i},'bitis',this.value)" style="flex:1;" title="Raporun Bitiş Tarihi">
            <input type="number" value="${s.gunSayisi}" placeholder="Kesinti Gün Sayısı" onchange="MaasDegisiklikFormu._alanGuncelle('G',${i},'gunSayisi',this.value)" style="width:110px;">
            <button type="button" class="mdf-satir-sil" onclick="MaasDegisiklikFormu._satirSilTikla('G',${i})">✕</button>
          </div>`).join('') || '<p class="empty-state" style="margin:6px 0;">Kayıt yok.</p>'}
        <button type="button" class="btn btn-ghost btn-sm" onclick="MaasDegisiklikFormu._satirEkleTikla('G')">➕ Satır Ekle</button>
      </div>`;
  }

  function _bolumHHtml() {
    const satirlar = _state.H;
    return `
      <div class="mdf-bolum">
        <div class="mdf-bolum-baslik">H) Sendika Bilgi Değişikliği <span style="font-weight:400;">(Giriş/Çıkışlar)</span></div>
        ${satirlar.map((s,i)=>`
          <div class="mdf-satir" style="flex-wrap:wrap;">
            <select onchange="MaasDegisiklikFormu._personelSec('H',${i},this.value)" style="flex:2 1 160px;">${_personelSecenekleriHtml(s.tc)}</select>
            <input type="text" value="${escapeHtml(s.ayrilanSendika)}" placeholder="Ayrıldığı Sendika Adı" onchange="MaasDegisiklikFormu._alanGuncelle('H',${i},'ayrilanSendika',this.value)" style="flex:1 1 130px;">
            <input type="date" value="${s.ayrilmaTarihi}" onchange="MaasDegisiklikFormu._alanGuncelle('H',${i},'ayrilmaTarihi',this.value)" style="flex:1 1 110px;" title="Ayrılma Tarihi">
            <input type="text" value="${escapeHtml(s.girilenSendika)}" placeholder="Girdiği Sendika Adı" onchange="MaasDegisiklikFormu._alanGuncelle('H',${i},'girilenSendika',this.value)" style="flex:1 1 130px;">
            <input type="date" value="${s.girmeTarihi}" onchange="MaasDegisiklikFormu._alanGuncelle('H',${i},'girmeTarihi',this.value)" style="flex:1 1 110px;" title="Giriş Tarihi">
            <input type="text" value="${escapeHtml(s.uyelikNo)}" placeholder="Üyelik No" onchange="MaasDegisiklikFormu._alanGuncelle('H',${i},'uyelikNo',this.value)" style="width:90px;">
            <button type="button" class="mdf-satir-sil" onclick="MaasDegisiklikFormu._satirSilTikla('H',${i})">✕</button>
          </div>`).join('') || '<p class="empty-state" style="margin:6px 0;">Kayıt yok.</p>'}
        <button type="button" class="btn btn-ghost btn-sm" onclick="MaasDegisiklikFormu._satirEkleTikla('H')">➕ Satır Ekle</button>
      </div>`;
  }

  function _formGovdesiHtml() {
    return `
      <div class="mdf-bolum">
        <div class="mdf-bolum-baslik">A) Mevcut Personel Sayısı</div>
        <div class="mdf-satir" style="flex-wrap:wrap;">
          <label class="mdf-mini-etiket">Geçen Ay Personel Sayısı<input type="number" value="${_state.gecenAyPersonelSayisi}" onchange="MaasDegisiklikFormu._alanGuncelleKok('gecenAyPersonelSayisi',this.value)"></label>
          <label class="mdf-mini-etiket">Bu Ay Giren<input type="number" value="${_state.buAyGiren}" onchange="MaasDegisiklikFormu._alanGuncelleKok('buAyGiren',this.value)"></label>
          <label class="mdf-mini-etiket">Bu Ay Çıkan<input type="number" value="${_state.buAyCikan}" onchange="MaasDegisiklikFormu._alanGuncelleKok('buAyCikan',this.value)"></label>
          <label class="mdf-mini-etiket">Aylıksız İzinde Kesilen<input type="number" value="${_state.aylikSizIzinde}" onchange="MaasDegisiklikFormu._alanGuncelleKok('aylikSizIzinde',this.value)"></label>
        </div>
        <div style="font-size:12px;color:var(--ink-muted);margin-top:4px;">
          💡 "Geçen Ay Personel Sayısı" varsayılan olarak şu anki personel sayınızdan (${(typeof personelListesi!=='undefined'?personelListesi.length:0)}) alındı — geçen ayki gerçek sayı farklıysa üzerine yazın. "Bu Ay Ödeme Yapılacak Personel Sayısı" yazdırırken otomatik hesaplanır.
        </div>
      </div>
      ${_bolumBCHtml('B', 'B) Ayrılan Personel')}
      ${_bolumBCHtml('C', 'C) Başlayan Personel')}
      ${_bolumDHtml()}
      ${_bolumEHtml()}
      ${_bolumFHtml()}
      ${_bolumGHtml()}
      ${_bolumHHtml()}
    `;
  }

  function _render() {
    const panel = document.getElementById('mdfFormPanel');
    if (panel) panel.innerHTML = _formGovdesiHtml();
    const ayEl = document.getElementById('mdf_ay');
    const yilEl = document.getElementById('mdf_yil');
    if (ayEl) ayEl.value = _state.ay;
    if (yilEl) yilEl.value = _state.yil;
  }

  /* ---------- Yazdırma / A4 çıktı üretimi (Excel formuna sadık) ---------- */

  function _tarihTr(iso) {
    if (!iso) return '..... / ..... / ..........';
    const [y,m,d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function _satirlarHtml(bolum, kolonlar) {
    const satirlar = _state[bolum];
    const bosSatirSayisi = Math.max(0, 5 - satirlar.length);
    let html = satirlar.map(s => `<tr>${kolonlar.map(k=>`<td>${escapeHtml(k.fmt ? k.fmt(s[k.alan]) : (s[k.alan]||''))}</td>`).join('')}</tr>`).join('');
    for (let i=0;i<bosSatirSayisi;i++) html += `<tr>${kolonlar.map(()=>`<td>&nbsp;</td>`).join('')}</tr>`;
    return html;
  }

  function _yazdirmaHtmlUret() {
    const okul = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari) || {};
    const okulAdi = okul.okulAdi || 'KORUK İLK-ORTAOKULU';
    const mudur = okul.mudurAdi || okulBilgileriAyari?.okulMuduru || '';

    const buAyOdemeYapilacak = (_state.gecenAyPersonelSayisi||0) + (_state.buAyGiren||0) - (_state.buAyCikan||0) - (_state.aylikSizIzinde||0);

    const style = `
      @page { size: A4 portrait; margin: 8mm; }
      * { box-sizing:border-box; }
      body { font-family:Arial,Helvetica,sans-serif; font-size:8.5pt; color:#000; }
      table { width:100%; border-collapse:collapse; margin-bottom:2mm; }
      td, th { border:1px solid #000; padding:1.5px 3px; vertical-align:middle; }
      .mdf-baslik { text-align:center; font-weight:bold; font-size:13pt; padding:4px; border:1px solid #000; margin-bottom:1mm; }
      .mdf-bolum-baslik-hucre { font-weight:bold; font-style:italic; background:#eaf1e0; font-size:8pt; padding:3px; border:1px solid #000; }
      .mdf-th { font-weight:bold; text-align:center; background:#f3f3f3; font-size:7.5pt; }
      .mdf-not { font-size:6.8pt; font-style:italic; text-align:center; vertical-align:middle; }
      @media print { body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    `;

    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Maaş Değişikliği Bildirim Formu</title><style>${style}</style></head><body>
      <div class="mdf-baslik">MAAŞ DEĞİŞİKLİĞİ BİLDİRİM FORMU</div>
      <table>
        <tr><td style="width:15%;font-weight:bold;">KURUMUN ADI</td><td style="width:55%;">${escapeHtml(okulAdi)}</td><td style="width:15%;font-weight:bold;">İLGİLİ AY-YIL</td><td style="width:15%;">${_state.ay} ${_state.yil}</td></tr>
      </table>

      <table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="5">A) MEVCUT PERSONEL SAYISI ; (Bu ay içinde görevde olan)</td></tr>
        <tr class="mdf-th"><td>GEÇEN AY PERSONEL SAYISI</td><td>BU AY İÇİNDE GİREN PERSONEL SAYISI</td><td>BU AY İÇİNDE ÇIKAN PERSONEL SAYISI</td><td>AYLIKSIZ İZİNDE (GSSP) KES. PER. SAYISI</td><td>BU AY ÖDEME YAPILACAK PERSONEL SAYISI</td></tr>
        <tr style="text-align:center;"><td>${_state.gecenAyPersonelSayisi||0}</td><td>${_state.buAyGiren||0}</td><td>${_state.buAyCikan||0}</td><td>${_state.aylikSizIzinde||0}</td><td>${buAyOdemeYapilacak}</td></tr>
      </table>

      <table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="6">B) AYRILAN PERSONELİN : (Geçen ay bordroda olup bu ay maaş bordrosunda girmeyecek ayrılan, aylıksız izinli personel)</td></tr>
        <tr class="mdf-th"><td style="width:12%;">Pers. TC No</td><td style="width:20%;">Adı Soyadı</td><td style="width:15%;">Görevi/Branşı</td><td style="width:13%;">Gör. Ayrıldığı Tarih</td><td style="width:25%;">Ayrılma Nedeni</td><td style="width:15%;" rowspan="7" class="mdf-not">(Kararname, Ayrılma yazısı, Maaş nakil Belgesi, Askere Çağrı Pusulası, aylıksız İzin Onayı...vb)</td></tr>
        ${_satirlarHtml('B', [{alan:'tc'},{alan:'ad'},{alan:'gorev'},{alan:'tarih', fmt:_tarihTr},{alan:'neden'}])}
      </table>

      <table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="6">C) BAŞLAYAN PERSONELİN : (Bu ay ilk defa maaş bordrosuna girecek yeni gelen veya aylıksız izinden dönen personel)</td></tr>
        <tr class="mdf-th"><td style="width:12%;">Pers. TC No</td><td style="width:20%;">Adı Soyadı</td><td style="width:15%;">Görevi/Branşı</td><td style="width:13%;">Göreve Başlama Tarihi</td><td style="width:25%;">Göreve Başlama Nedeni</td><td style="width:15%;" rowspan="7" class="mdf-not">Göreve Başlama yazısı, Kararname, Maaşnakil Belgesi, Askerlik terhis...vb.</td></tr>
        ${_satirlarHtml('C', [{alan:'tc'},{alan:'ad'},{alan:'gorev'},{alan:'tarih', fmt:_tarihTr},{alan:'neden'}])}
      </table>

      <table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="7">D) TERFİ EDECEK PERSONELİN : (Bu ay içinde İntibak, Derece ve Kademe Terfii işlemi yapılacak personel)</td></tr>
        <tr class="mdf-th"><td rowspan="2" style="width:12%;">Pers. TC No</td><td rowspan="2" style="width:18%;">Adı Soyadı</td><td rowspan="2" style="width:14%;">Görevi/Branşı</td><td colspan="2">Eski</td><td colspan="2">Yeni</td></tr>
        <tr class="mdf-th"><td>Derecesi</td><td>Kademesi</td><td>Derecesi</td><td>Kademesi</td></tr>
        ${_state.D.map(s=>`<tr><td>${escapeHtml(s.tc)}</td><td>${escapeHtml(s.ad)}</td><td>${escapeHtml(s.gorev)}</td><td style="text-align:center;">${escapeHtml(s.eskiDerece)}</td><td style="text-align:center;">${escapeHtml(s.eskiKademe)}</td><td style="text-align:center;">${escapeHtml(s.yeniDerece)}</td><td style="text-align:center;">${escapeHtml(s.yeniKademe)}</td></tr>`).join('') || '<tr><td colspan="7">&nbsp;</td></tr>'}
      </table>

      <table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="4">E) MAAŞ DEĞİŞİKLİĞİ YAPILACAK PERSONELİN : (Bu ay içinde Aile ve Çocuk Yardımı, Ünvan ve Kariyer Basamağı ile Aylıklar, Sosyal Yardımlar ve Tazminatlar, Vergi Matrahındaki değişiklikler varsa..vb)</td></tr>
        <tr class="mdf-th"><td style="width:12%;">Pers. TC No</td><td style="width:20%;">Adı Soyadı</td><td style="width:34%;">Önceki Durumu</td><td style="width:34%;">Yeni Durumu</td></tr>
        ${_satirlarHtml('E', [{alan:'tc'},{alan:'ad'},{alan:'onceki'},{alan:'yeni'}])}
      </table>

      <table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="5">F) KESİNTİLER : (Bu ay içinde İcra, Nafaka, Ceza, İkraz gibi yasal kesintiler..vb)</td></tr>
        <tr class="mdf-th"><td style="width:12%;">Pers. TC No</td><td style="width:18%;">Adı Soyadı</td><td style="width:23%;">Kesintinin Nedeni</td><td style="width:24%;">Ödeneceği Yer/Hesap No</td><td style="width:23%;">Oranı/Miktarı</td></tr>
        ${_satirlarHtml('F', [{alan:'tc'},{alan:'ad'},{alan:'neden'},{alan:'hesapNo'},{alan:'oran'}])}
      </table>

      <table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="5">G) RAPORLU GÜN : (Bu yıl içinde 7 günü geçen ve daha önce kesintisi yapılmamış olan istirahat raporlu gün sayısı toplamı)</td></tr>
        <tr class="mdf-th"><td style="width:12%;">Pers. TC No</td><td style="width:23%;">Adı Soyadı</td><td style="width:20%;">Raporun Başlama Tarihi</td><td style="width:20%;">Raporun Bitiş Tarihi</td><td style="width:25%;">7 Günden Sonra Maaştan Kesinti Yapılacak Gün Sayısı</td></tr>
        ${_satirlarHtml('G', [{alan:'tc'},{alan:'ad'},{alan:'baslama', fmt:_tarihTr},{alan:'bitis', fmt:_tarihTr},{alan:'gunSayisi'}])}
      </table>

      <table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="7">H) SENDİKA BİLGİ DEĞİŞİKLİĞİ YAPILACAK PERSONELİN : (Bu ay içinde Sendikaya Giriş ve Çıkışlar..vb)</td></tr>
        <tr class="mdf-th"><td rowspan="2" style="width:12%;">Pers. TC No</td><td rowspan="2" style="width:16%;">Adı Soyadı</td><td colspan="2">Ayrıldığı Sendikanın</td><td colspan="3">Girdiği Sendikanın</td></tr>
        <tr class="mdf-th"><td>Adı</td><td>A.Tarihi</td><td>Adı</td><td>G.Tarihi</td><td>Üyelik No</td></tr>
        ${_state.H.map(s=>`<tr><td>${escapeHtml(s.tc)}</td><td>${escapeHtml(s.ad)}</td><td>${escapeHtml(s.ayrilanSendika)}</td><td>${_tarihTr(s.ayrilmaTarihi)}</td><td>${escapeHtml(s.girilenSendika)}</td><td>${_tarihTr(s.girmeTarihi)}</td><td>${escapeHtml(s.uyelikNo)}</td></tr>`).join('') || '<tr><td colspan="7">&nbsp;</td></tr>'}
      </table>

      <p style="margin-top:4mm;">Kurumumuzun <strong>${_state.ay} ${_state.yil}</strong> ayına ait personel maaşlarında esas alınacak değişiklik durumu kayıtlarımıza uygun olarak yukarıya çıkarılmış olup istenen belgeler ekte sunulmuştur.</p>

      <table style="margin-top:8mm;width:60%;margin-left:40%;">
        <tr><td style="border:none;text-align:right;">${_tarihTr(new Date().toISOString().slice(0,10))}</td></tr>
        <tr><td style="border:none;text-align:center;font-weight:bold;">Okul/Kurum Yetkilisinin</td></tr>
        <tr><td style="border:none;"><br>Adı Soyadı: ${escapeHtml(mudur)}<br>Ünvanı: Okul Müdürü<br>İmzası:</td></tr>
      </table>
    </body></html>`;
    return html;
  }

  function _yazdir() {
    const html = _yazdirmaHtmlUret();
    if (typeof uygulamaHtmlYazdir === 'function') {
      uygulamaHtmlYazdir(html, 'Maas_Degisiklik_Formu', 'dikey');
    } else {
      const pencere = window.open('', '_blank');
      pencere.document.write(html);
      pencere.document.close();
      setTimeout(()=>pencere.print(), 300);
    }
  }

  /* ---------- Overlay ---------- */

  function _overlayOlustur() {
    if (document.getElementById('mdfOverlay')) return document.getElementById('mdfOverlay');
    const ov = document.createElement('div');
    ov.id = 'mdfOverlay';
    ov.style.cssText = `position:fixed; inset:0; z-index:99999; background:#525659; display:flex; flex-direction:column;`;
    ov.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; background:linear-gradient(135deg,#1b5e20,#2e7d32); color:#fff; padding:10px 14px; flex-wrap:wrap;">
        <span style="font-weight:700;font-size:14px;">📋 Maaş Değişikliği Bildirim Formu</span>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <select id="mdf_ay" style="border-radius:6px;border:none;padding:6px 8px;font-size:13px;">${AYLAR_TR.map(a=>`<option value="${a}">${a}</option>`).join('')}</select>
          <input id="mdf_yil" type="number" style="width:80px;border-radius:6px;border:none;padding:6px 8px;font-size:13px;">
          <button id="mdfPrintBtn" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">🖨️ Yazdır / PDF</button>
          <button id="mdfCloseBtn" style="background:rgba(220,0,0,.4);border:none;color:#fff;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;">✕ Kapat</button>
        </div>
      </div>
      <div style="flex:1 1 auto; overflow:auto; padding:16px; display:flex; justify-content:center;">
        <div id="mdfFormPanel" style="background:#fff; border-radius:10px; padding:18px; max-width:760px; width:100%; box-shadow:0 4px 14px rgba(0,0,0,.3); font-family:'Segoe UI',Arial,sans-serif;"></div>
      </div>
    `;
    document.body.appendChild(ov);
    document.body.classList.add('dlk-overlay-acik');
    if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);
    ov.style.overscrollBehaviorY = 'contain';
    document.documentElement.style.overscrollBehaviorY = 'contain';

    ov.querySelector('#mdfCloseBtn').onclick = () => {
      ov.remove();
      document.body.classList.remove('dlk-overlay-acik');
      document.documentElement.style.overscrollBehaviorY = '';
      if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
    };
    ov.querySelector('#mdfPrintBtn').onclick = _yazdir;
    ov.querySelector('#mdf_ay').onchange = (e) => { _state.ay = e.target.value; };
    ov.querySelector('#mdf_yil').onchange = (e) => { _state.yil = parseInt(e.target.value,10) || _state.yil; };

    return ov;
  }

  function ac() {
    _state = _bosState();
    const ov = _overlayOlustur();
    _render();
    document.getElementById('mdf_ay').value = _state.ay;
    document.getElementById('mdf_yil').value = _state.yil;
  }

  window.MaasDegisiklikFormu = {
    ac,
    _satirEkleTikla: _satirEkle,
    _satirSilTikla: _satirSil,
    _personelSec: _personelSecildi,
    _alanGuncelle: (bolum, i, alan, deger) => { _state[bolum][i][alan] = deger; },
    _alanGuncelleKok: (alan, deger) => { _state[alan] = parseInt(deger,10) || 0; }
  };
})();
