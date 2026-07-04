/* =============================================
   js/maas-degisiklik.js
   MAAŞ DEĞİŞİKLİĞİ BİLDİRİM FORMU
   Kullanıcının Excel formuyla (8 bölüm: A-H) birebir aynı satır/sütun
   düzeni, başlık ve not metinleri. Yazdırma çıktısı YATAY (A4 landscape)
   ve SADECE veri girilmiş/gizlenmemiş satırları + o bölümün başlığını
   gösterir — boş bölümler çıktıda hiç görünmez.

   D-E-F-G-H bölümleri TÜM personel (öğretmenler + diğer personel)
   listesiyle ÖNCEDEN DOLU gelir (isim/TC/görev otomatik) — admin o ay
   ilgisi olmayan satırları "🗑️ Gizle" ile gizler, ilgisi olanlara sadece
   o aya özel bilgiyi (terfi tarihi, kesinti nedeni vb.) girer.
   B-C bölümleri (ayrılan/başlayan) roster'da BULUNMAYAN kişilerle
   ilgili olduğu için boş başlar, "➕ Satır Ekle" ile elle eklenir.

   Mimari not: Firestore'a hiç yazmaz; sayfa yenilenince form sıfırlanır.
   ============================================= */

(function() {
  'use strict';

  const AYLAR_TR = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];

  let _state = null;

  /* Öğretmenler + diğer personeli TEK ortak formata indirger. */
  function _tumRoster() {
    const ogr = (typeof ogretmenler !== 'undefined' ? ogretmenler : []).map(o => ({
      id: 'o_' + o.id, tc: o.tcNo || '', ad: `${o.ad||''} ${o.soyad||''}`.trim(), gorev: o.unvan || o.brans || 'Öğretmen'
    }));
    const per = (typeof personelListesi !== 'undefined' ? personelListesi : []).map(p => ({
      id: 'p_' + p.id, tc: p.tc || '', ad: p.adSoyad || '', gorev: p.gorev || 'Personel'
    }));
    return [...ogr, ...per].sort((a,b)=>a.ad.localeCompare(b.ad,'tr'));
  }

  function _bosState() {
    const simdi = new Date();
    const roster = _tumRoster();
    return {
      ay: AYLAR_TR[simdi.getMonth()],
      yil: simdi.getFullYear(),
      gecenAyPersonelSayisi: roster.length,
      buAyGiren: 0,
      buAyCikan: 0,
      aylikSizIzinde: 0,
      B: [], C: [],
      D: roster.map(r => ({ tc:r.tc, ad:r.ad, gorev:r.gorev, eskiDerece:'', eskiKademe:'', yeniDerece:'', yeniKademe:'', terfiTarihi:'', gizli:true })),
      E: roster.map(r => ({ tc:r.tc, ad:r.ad, onceki:'', yeni:'', gizli:true })),
      F: roster.map(r => ({ tc:r.tc, ad:r.ad, neden:'', hesapNo:'', oran:'', gizli:true })),
      G: roster.map(r => ({ tc:r.tc, ad:r.ad, baslama:'', bitis:'', gunSayisi:'', gizli:true })),
      H: roster.map(r => ({ tc:r.tc, ad:r.ad, ayrilanSendika:'', ayrilmaTarihi:'', girilenSendika:'', girmeTarihi:'', uyelikNo:'', gizli:true }))
    };
  }

  function _bosSatirBC() { return { tc:'', ad:'', gorev:'', tarih:'', neden:'' }; }

  function _personelSecenekleriHtml(seciliTc) {
    const liste = (typeof personelListesi !== 'undefined' ? personelListesi : []).slice()
      .sort((a,b)=>(a.adSoyad||'').localeCompare(b.adSoyad||'','tr'));
    return '<option value="">— Personel seç (TC/Ad/Görev otomatik dolar) —</option>' +
      liste.map(p => `<option value="${p.id}" ${seciliTc===p.tc?'selected':''}>${escapeHtml(p.adSoyad||'')}</option>`).join('');
  }

  function _personelSecildiBC(bolum, index, personelId) {
    const p = (typeof personelListesi !== 'undefined' ? personelListesi : []).find(x=>x.id===personelId);
    const satir = _state[bolum][index];
    if (p) { satir.tc = p.tc || ''; satir.ad = p.adSoyad || ''; satir.gorev = p.gorev || ''; }
    else { satir.tc = ''; satir.ad = ''; satir.gorev = ''; }
    _render();
  }

  function _satirEkleBC(bolum) { _state[bolum].push(_bosSatirBC()); _render(); }
  function _satirSilBC(bolum, index) { _state[bolum].splice(index, 1); _render(); }
  function _satirGizleAc(bolum, index) { _state[bolum][index].gizli = !_state[bolum][index].gizli; _render(); }

  function _bolumBCHtml(bolum, baslik) {
    const satirlar = _state[bolum];
    return `
      <div class="mdf-bolum">
        <div class="mdf-bolum-baslik">${baslik}</div>
        ${satirlar.map((s,i)=>`
          <div class="mdf-satir">
            <select onchange="MaasDegisiklikFormu._personelSecBC('${bolum}',${i},this.value)" style="flex:2;">${_personelSecenekleriHtml(s.tc)}</select>
            <input type="date" value="${s.tarih}" onchange="MaasDegisiklikFormu._alanGuncelle('${bolum}',${i},'tarih',this.value)" style="flex:1;" title="${bolum==='B'?'Görevden Ayrıldığı Tarih':'Göreve Başlama Tarihi'}">
            <input type="text" value="${escapeHtml(s.neden)}" placeholder="${bolum==='B'?'Ayrılma Nedeni':'Başlama Nedeni'}" onchange="MaasDegisiklikFormu._alanGuncelle('${bolum}',${i},'neden',this.value)" style="flex:2;">
            <button type="button" class="mdf-satir-sil" onclick="MaasDegisiklikFormu._satirSilBCTikla('${bolum}',${i})">✕</button>
          </div>`).join('') || '<p class="mdf-bos-not">Kayıt yok.</p>'}
        <button type="button" class="btn btn-ghost btn-sm" onclick="MaasDegisiklikFormu._satirEkleBCTikla('${bolum}')">➕ Satır Ekle</button>
      </div>`;
  }

  function _rosterSatirBaslikHtml(bolum, i, s) {
    const gizliMi = s.gizli;
    return `<div class="mdf-satir mdf-roster-satir ${gizliMi?'mdf-gizli-satir':''}" style="flex-wrap:wrap;">
      <div class="mdf-roster-kisi" style="flex:1 1 100%;display:flex;align-items:center;gap:8px;">
        <button type="button" class="mdf-goster-gizle-btn ${gizliMi?'':'aktif'}" onclick="MaasDegisiklikFormu._satirGizleAcTikla('${bolum}',${i})">${gizliMi?'👁️ Göster':'🗑️ Gizle'}</button>
        <strong style="font-size:12.5px;">${escapeHtml(s.ad)}</strong>
        <span style="font-size:11px;color:#777;">${escapeHtml(s.gorev||'')} · TC: ${escapeHtml(s.tc||'—')}</span>
      </div>`;
  }

  function _bolumDHtml() {
    const satirlar = _state.D;
    return `
      <div class="mdf-bolum">
        <div class="mdf-bolum-baslik">D) Terfi Edecek Personel <span style="font-weight:400;">(İntibak, Derece/Kademe Terfii)</span></div>
        <div style="font-size:11px;color:#777;margin-bottom:6px;">💡 Derece/Kademe bilgisi sistemde henüz takip edilmiyor — eski/yeni değerleri elle girmeniz gerekiyor. Bu ay terfi ALMAYAN kişileri "🗑️ Gizle" ile listeden kaldırın.</div>
        ${satirlar.map((s,i)=>`
          ${_rosterSatirBaslikHtml('D',i,s)}
          ${!s.gizli ? `
            <input type="number" value="${s.eskiDerece}" placeholder="Eski Derece" onchange="MaasDegisiklikFormu._alanGuncelle('D',${i},'eskiDerece',this.value)" style="width:80px;">
            <input type="number" value="${s.eskiKademe}" placeholder="Eski Kademe" onchange="MaasDegisiklikFormu._alanGuncelle('D',${i},'eskiKademe',this.value)" style="width:80px;">
            <input type="number" value="${s.yeniDerece}" placeholder="Yeni Derece" onchange="MaasDegisiklikFormu._alanGuncelle('D',${i},'yeniDerece',this.value)" style="width:80px;">
            <input type="number" value="${s.yeniKademe}" placeholder="Yeni Kademe" onchange="MaasDegisiklikFormu._alanGuncelle('D',${i},'yeniKademe',this.value)" style="width:80px;">
            <input type="date" value="${s.terfiTarihi}" onchange="MaasDegisiklikFormu._alanGuncelle('D',${i},'terfiTarihi',this.value)" style="flex:1 1 130px;" title="Terfi Tarihi">
          ` : ''}
          </div>`).join('')}
      </div>`;
  }

  function _bolumEHtml() {
    const satirlar = _state.E;
    return `
      <div class="mdf-bolum">
        <div class="mdf-bolum-baslik">E) Maaş Değişikliği Yapılacak Personel <span style="font-weight:400;">(Aile/Çocuk Yrd., Ünvan, Kariyer Basamağı, Tazminat vb.)</span></div>
        ${satirlar.map((s,i)=>`
          ${_rosterSatirBaslikHtml('E',i,s)}
          ${!s.gizli ? `
            <input type="text" value="${escapeHtml(s.onceki)}" placeholder="Önceki Durumu" onchange="MaasDegisiklikFormu._alanGuncelle('E',${i},'onceki',this.value)" style="flex:2 1 200px;">
            <input type="text" value="${escapeHtml(s.yeni)}" placeholder="Yeni Durumu" onchange="MaasDegisiklikFormu._alanGuncelle('E',${i},'yeni',this.value)" style="flex:2 1 200px;">
          ` : ''}
          </div>`).join('')}
      </div>`;
  }

  function _bolumFHtml() {
    const satirlar = _state.F;
    return `
      <div class="mdf-bolum">
        <div class="mdf-bolum-baslik">F) Kesintiler <span style="font-weight:400;">(İcra, Nafaka, Ceza, İkraz vb.)</span></div>
        ${satirlar.map((s,i)=>`
          ${_rosterSatirBaslikHtml('F',i,s)}
          ${!s.gizli ? `
            <input type="text" value="${escapeHtml(s.neden)}" placeholder="Kesintinin Nedeni" onchange="MaasDegisiklikFormu._alanGuncelle('F',${i},'neden',this.value)" style="flex:1 1 150px;">
            <input type="text" value="${escapeHtml(s.hesapNo)}" placeholder="Ödeneceği Yer/Hesap No" onchange="MaasDegisiklikFormu._alanGuncelle('F',${i},'hesapNo',this.value)" style="flex:1 1 150px;">
            <input type="text" value="${escapeHtml(s.oran)}" placeholder="Oranı/Miktarı" onchange="MaasDegisiklikFormu._alanGuncelle('F',${i},'oran',this.value)" style="flex:1 1 100px;">
          ` : ''}
          </div>`).join('')}
      </div>`;
  }

  function _bolumGHtml() {
    const satirlar = _state.G;
    return `
      <div class="mdf-bolum">
        <div class="mdf-bolum-baslik">G) Raporlu Gün <span style="font-weight:400;">(7 günü geçen istirahat raporları)</span></div>
        ${satirlar.map((s,i)=>`
          ${_rosterSatirBaslikHtml('G',i,s)}
          ${!s.gizli ? `
            <input type="date" value="${s.baslama}" onchange="MaasDegisiklikFormu._alanGuncelle('G',${i},'baslama',this.value)" style="flex:1 1 130px;" title="Raporun Başlama Tarihi">
            <input type="date" value="${s.bitis}" onchange="MaasDegisiklikFormu._alanGuncelle('G',${i},'bitis',this.value)" style="flex:1 1 130px;" title="Raporun Bitiş Tarihi">
            <input type="number" value="${s.gunSayisi}" placeholder="Kesinti Gün Sayısı" onchange="MaasDegisiklikFormu._alanGuncelle('G',${i},'gunSayisi',this.value)" style="width:110px;">
          ` : ''}
          </div>`).join('')}
      </div>`;
  }

  function _bolumHHtml() {
    const satirlar = _state.H;
    return `
      <div class="mdf-bolum">
        <div class="mdf-bolum-baslik">H) Sendika Bilgi Değişikliği <span style="font-weight:400;">(Giriş/Çıkışlar)</span></div>
        ${satirlar.map((s,i)=>`
          ${_rosterSatirBaslikHtml('H',i,s)}
          ${!s.gizli ? `
            <input type="text" value="${escapeHtml(s.ayrilanSendika)}" placeholder="Ayrıldığı Sendika Adı" onchange="MaasDegisiklikFormu._alanGuncelle('H',${i},'ayrilanSendika',this.value)" style="flex:1 1 130px;">
            <input type="date" value="${s.ayrilmaTarihi}" onchange="MaasDegisiklikFormu._alanGuncelle('H',${i},'ayrilmaTarihi',this.value)" style="flex:1 1 110px;" title="Ayrılma Tarihi">
            <input type="text" value="${escapeHtml(s.girilenSendika)}" placeholder="Girdiği Sendika Adı" onchange="MaasDegisiklikFormu._alanGuncelle('H',${i},'girilenSendika',this.value)" style="flex:1 1 130px;">
            <input type="date" value="${s.girmeTarihi}" onchange="MaasDegisiklikFormu._alanGuncelle('H',${i},'girmeTarihi',this.value)" style="flex:1 1 110px;" title="Giriş Tarihi">
            <input type="text" value="${escapeHtml(s.uyelikNo)}" placeholder="Üyelik No" onchange="MaasDegisiklikFormu._alanGuncelle('H',${i},'uyelikNo',this.value)" style="width:90px;">
          ` : ''}
          </div>`).join('')}
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
        <div class="mdf-bos-not">💡 "Geçen Ay Personel Sayısı" şu anki toplam personel sayınızdan (${_tumRoster().length}) alındı — farklıysa üzerine yazın.</div>
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
  }

  function _tarihTr(iso) {
    if (!iso) return '..... / ..... / ..........';
    const [y,m,d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  function _gorunurSatirlar(bolum) { return _state[bolum].filter(s => !s.gizli); }

  function _yazdirmaHtmlUret() {
    const okul = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari) || {};
    const okulAdi = okul.okulAdi || 'KORUK İLK-ORTAOKULU';
    const mudur = (okul.mudurId && typeof ogretmenAdi === 'function') ? ogretmenAdi(okul.mudurId) : '';

    const buAyOdemeYapilacak = (_state.gecenAyPersonelSayisi||0) + (_state.buAyGiren||0) - (_state.buAyCikan||0) - (_state.aylikSizIzinde||0);

    const gorunurB = _gorunurSatirlar('B'), gorunurC = _gorunurSatirlar('C'), gorunurD = _gorunurSatirlar('D'),
          gorunurE = _gorunurSatirlar('E'), gorunurF = _gorunurSatirlar('F'), gorunurG = _gorunurSatirlar('G'), gorunurH = _gorunurSatirlar('H');

    const style = `
      @page { size: A4 landscape; margin: 8mm; }
      * { box-sizing:border-box; }
      body { font-family:Arial,Helvetica,sans-serif; font-size:8.5pt; color:#000; }
      table { width:100%; border-collapse:collapse; margin-bottom:2mm; }
      td, th { border:1px solid #000; padding:1.5px 4px; vertical-align:middle; }
      .mdf-baslik { text-align:center; font-weight:bold; font-size:13pt; padding:4px; border:1px solid #000; margin-bottom:1mm; }
      .mdf-bolum-baslik-hucre { font-weight:bold; font-style:italic; background:#eaf1e0; font-size:8pt; padding:3px; border:1px solid #000; }
      .mdf-th { font-weight:bold; text-align:center; background:#f3f3f3; font-size:7.5pt; }
      .mdf-not { font-size:6.8pt; font-style:italic; text-align:center; vertical-align:middle; }
      @media print { body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
    `;

    const bolumB = gorunurB.length ? `<table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="6">B) AYRILAN PERSONELİN : (Geçen ay bordroda olup bu ay maaş bordrosunda girmeyecek ayrılan, aylıksız izinli personel)</td></tr>
        <tr class="mdf-th"><td style="width:12%;">Pers. TC No</td><td style="width:20%;">Adı Soyadı</td><td style="width:15%;">Görevi/Branşı</td><td style="width:13%;">Gör. Ayrıldığı Tarih</td><td style="width:25%;">Ayrılma Nedeni</td><td style="width:15%;" rowspan="${gorunurB.length+1}" class="mdf-not">(Kararname, Ayrılma yazısı, Maaş nakil Belgesi, Askere Çağrı Pusulası, aylıksız İzin Onayı...vb)</td></tr>
        ${gorunurB.map(s=>`<tr><td>${escapeHtml(s.tc)}</td><td>${escapeHtml(s.ad)}</td><td>${escapeHtml(s.gorev)}</td><td>${_tarihTr(s.tarih)}</td><td>${escapeHtml(s.neden)}</td></tr>`).join('')}
      </table>` : '';

    const bolumC = gorunurC.length ? `<table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="6">C) BAŞLAYAN PERSONELİN : (Bu ay ilk defa maaş bordrosuna girecek yeni gelen veya aylıksız izinden dönen personel)</td></tr>
        <tr class="mdf-th"><td style="width:12%;">Pers. TC No</td><td style="width:20%;">Adı Soyadı</td><td style="width:15%;">Görevi/Branşı</td><td style="width:13%;">Göreve Başlama Tarihi</td><td style="width:25%;">Göreve Başlama Nedeni</td><td style="width:15%;" rowspan="${gorunurC.length+1}" class="mdf-not">Göreve Başlama yazısı, Kararname, Maaşnakil Belgesi, Askerlik terhis...vb.</td></tr>
        ${gorunurC.map(s=>`<tr><td>${escapeHtml(s.tc)}</td><td>${escapeHtml(s.ad)}</td><td>${escapeHtml(s.gorev)}</td><td>${_tarihTr(s.tarih)}</td><td>${escapeHtml(s.neden)}</td></tr>`).join('')}
      </table>` : '';

    const bolumD = gorunurD.length ? `<table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="7">D) TERFİ EDECEK PERSONELİN : (Bu ay içinde İntibak, Derece ve Kademe Terfii işlemi yapılacak personel)</td></tr>
        <tr class="mdf-th"><td rowspan="2" style="width:12%;">Pers. TC No</td><td rowspan="2" style="width:18%;">Adı Soyadı</td><td rowspan="2" style="width:14%;">Görevi/Branşı</td><td colspan="2">Eski</td><td colspan="2">Yeni</td><td rowspan="2">Terfi Tarihi</td></tr>
        <tr class="mdf-th"><td>Derecesi</td><td>Kademesi</td><td>Derecesi</td><td>Kademesi</td></tr>
        ${gorunurD.map(s=>`<tr><td>${escapeHtml(s.tc)}</td><td>${escapeHtml(s.ad)}</td><td>${escapeHtml(s.gorev)}</td><td style="text-align:center;">${escapeHtml(s.eskiDerece)}</td><td style="text-align:center;">${escapeHtml(s.eskiKademe)}</td><td style="text-align:center;">${escapeHtml(s.yeniDerece)}</td><td style="text-align:center;">${escapeHtml(s.yeniKademe)}</td><td>${_tarihTr(s.terfiTarihi)}</td></tr>`).join('')}
      </table>` : '';

    const bolumE = gorunurE.length ? `<table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="4">E) MAAŞ DEĞİŞİKLİĞİ YAPILACAK PERSONELİN : (Aile/Çocuk Yrd., Ünvan, Kariyer Basamağı, Tazminat, Vergi Matrahı değişiklikleri vb.)</td></tr>
        <tr class="mdf-th"><td style="width:12%;">Pers. TC No</td><td style="width:20%;">Adı Soyadı</td><td style="width:34%;">Önceki Durumu</td><td style="width:34%;">Yeni Durumu</td></tr>
        ${gorunurE.map(s=>`<tr><td>${escapeHtml(s.tc)}</td><td>${escapeHtml(s.ad)}</td><td>${escapeHtml(s.onceki)}</td><td>${escapeHtml(s.yeni)}</td></tr>`).join('')}
      </table>` : '';

    const bolumF = gorunurF.length ? `<table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="5">F) KESİNTİLER : (İcra, Nafaka, Ceza, İkraz gibi yasal kesintiler..vb)</td></tr>
        <tr class="mdf-th"><td style="width:12%;">Pers. TC No</td><td style="width:18%;">Adı Soyadı</td><td style="width:23%;">Kesintinin Nedeni</td><td style="width:24%;">Ödeneceği Yer/Hesap No</td><td style="width:23%;">Oranı/Miktarı</td></tr>
        ${gorunurF.map(s=>`<tr><td>${escapeHtml(s.tc)}</td><td>${escapeHtml(s.ad)}</td><td>${escapeHtml(s.neden)}</td><td>${escapeHtml(s.hesapNo)}</td><td>${escapeHtml(s.oran)}</td></tr>`).join('')}
      </table>` : '';

    const bolumG = gorunurG.length ? `<table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="5">G) RAPORLU GÜN : (7 günü geçen ve daha önce kesintisi yapılmamış istirahat raporlu gün sayısı toplamı)</td></tr>
        <tr class="mdf-th"><td style="width:12%;">Pers. TC No</td><td style="width:23%;">Adı Soyadı</td><td style="width:20%;">Raporun Başlama Tarihi</td><td style="width:20%;">Raporun Bitiş Tarihi</td><td style="width:25%;">7 Günden Sonra Kesinti Yapılacak Gün Sayısı</td></tr>
        ${gorunurG.map(s=>`<tr><td>${escapeHtml(s.tc)}</td><td>${escapeHtml(s.ad)}</td><td>${_tarihTr(s.baslama)}</td><td>${_tarihTr(s.bitis)}</td><td style="text-align:center;">${escapeHtml(s.gunSayisi)}</td></tr>`).join('')}
      </table>` : '';

    const bolumH = gorunurH.length ? `<table>
        <tr><td class="mdf-bolum-baslik-hucre" colspan="7">H) SENDİKA BİLGİ DEĞİŞİKLİĞİ YAPILACAK PERSONELİN : (Sendikaya Giriş ve Çıkışlar..vb)</td></tr>
        <tr class="mdf-th"><td rowspan="2" style="width:12%;">Pers. TC No</td><td rowspan="2" style="width:16%;">Adı Soyadı</td><td colspan="2">Ayrıldığı Sendikanın</td><td colspan="3">Girdiği Sendikanın</td></tr>
        <tr class="mdf-th"><td>Adı</td><td>A.Tarihi</td><td>Adı</td><td>G.Tarihi</td><td>Üyelik No</td></tr>
        ${gorunurH.map(s=>`<tr><td>${escapeHtml(s.tc)}</td><td>${escapeHtml(s.ad)}</td><td>${escapeHtml(s.ayrilanSendika)}</td><td>${_tarihTr(s.ayrilmaTarihi)}</td><td>${escapeHtml(s.girilenSendika)}</td><td>${_tarihTr(s.girmeTarihi)}</td><td>${escapeHtml(s.uyelikNo)}</td></tr>`).join('')}
      </table>` : '';

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

      ${bolumB}${bolumC}${bolumD}${bolumE}${bolumF}${bolumG}${bolumH}

      <p style="margin-top:4mm;">Kurumumuzun <strong>${_state.ay} ${_state.yil}</strong> ayına ait personel maaşlarında esas alınacak değişiklik durumu kayıtlarımıza uygun olarak yukarıya çıkarılmış olup istenen belgeler ekte sunulmuştur.</p>

      <table style="margin-top:8mm;width:50%;margin-left:50%;">
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
      uygulamaHtmlYazdir(html, 'Maas_Degisiklik_Formu', 'yatay');
    } else {
      const pencere = window.open('', '_blank');
      pencere.document.write(html);
      pencere.document.close();
      setTimeout(()=>pencere.print(), 300);
    }
  }

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
        <div id="mdfFormPanel" class="mdf-panel" style="background:#fff; border-radius:10px; padding:18px; max-width:760px; width:100%; box-shadow:0 4px 14px rgba(0,0,0,.3); font-family:'Segoe UI',Arial,sans-serif;"></div>
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
    _overlayOlustur();
    _render();
    document.getElementById('mdf_ay').value = _state.ay;
    document.getElementById('mdf_yil').value = _state.yil;
  }

  window.MaasDegisiklikFormu = {
    ac,
    _satirEkleBCTikla: _satirEkleBC,
    _satirSilBCTikla: _satirSilBC,
    _satirGizleAcTikla: _satirGizleAc,
    _personelSecBC: _personelSecildiBC,
    _alanGuncelle: (bolum, i, alan, deger) => { _state[bolum][i][alan] = deger; },
    _alanGuncelleKok: (alan, deger) => { _state[alan] = parseInt(deger,10) || 0; }
  };
})();
