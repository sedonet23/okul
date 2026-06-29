/* ====================================================================
   js/formlar.js  —  Yazdırılabilir Okul Formları  v1.0
   ─────────────────────────────────────────────────────────────────
   İçerik:
     1. ÖĞRENCİ TANIMA FORMU       — formOgrenciTanimaAc()
     2. İZİN DİLEKÇESİ ŞABLONLARI — formIzinDilekceAc()
     3. ÇEVRİMDIŞI ÖNBELLEK DURUMU — swDurumGoster()
   ─────────────────────────────────────────────────────────────────
   Bağımlılıklar (app.js üzerinden global):
     ogretmenler[], siniflar[], veliler[], okulBilgileriAyari,
     db, COL, escapeHtml(), toast(), modalAc(), modalKapat()
   ==================================================================== */

/* ─── Yardımcı: Bugünün tarihini GG.AA.YYYY formatında döndür ─── */
function bugunTarih(){ const d=new Date(); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`; }

/* ─── Yardımcı: Yeni pencerede yazdır ─── */
function formuYazdir(htmlIcerik, baslik='Okul Formu'){
  const pencere = window.open('','_blank','width=900,height=700');
  pencere.document.write(`<!DOCTYPE html><html lang="tr"><head>
    <meta charset="UTF-8">
    <title>${baslik}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Times New Roman',serif;font-size:12pt;color:#000;background:#fff;padding:20mm 20mm 20mm 25mm}
      h1{font-size:14pt;text-align:center;font-weight:700;margin-bottom:4px}
      h2{font-size:12pt;text-align:center;font-weight:400;margin-bottom:16px}
      .okul-ust{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:16px}
      .okul-ust .il{font-size:10pt;margin-bottom:2px}
      table{width:100%;border-collapse:collapse;margin:10px 0}
      table td,table th{border:1px solid #000;padding:5px 8px;font-size:11pt}
      table th{background:#eee;font-weight:700;text-align:left}
      .alan-kutu{border:1px solid #000;min-height:28px;padding:4px 8px;margin:4px 0;width:100%}
      .alan-satir{display:flex;gap:16px;margin:6px 0}
      .alan-satir .alan-grup{flex:1}
      .alan-grup label{font-size:10pt;font-weight:700;display:block;margin-bottom:2px}
      .imza-alani{display:flex;justify-content:space-between;margin-top:32px}
      .imza-kutu{text-align:center;width:200px}
      .imza-kutu .cizgi{border-bottom:1px solid #000;height:48px;margin-bottom:4px}
      .imza-kutu p{font-size:10pt}
      .metin-blok{line-height:1.8;margin:10px 0;text-align:justify}
      .tarih-yer{text-align:right;margin-bottom:20px}
      .baslik-blok{text-align:center;margin:20px 0}
      .baslik-blok .tip{font-size:11pt;font-weight:700;text-decoration:underline;margin-bottom:8px}
      .onay-kare{display:inline-block;width:12px;height:12px;border:1px solid #000;margin-right:4px;vertical-align:middle}
      p{margin:6px 0}
      @media print{body{padding:10mm 15mm 10mm 20mm}@page{margin:0}}
    </style>
  </head><body>${htmlIcerik}<script>window.onload=()=>{window.print();}<\/script></body></html>`);
  pencere.document.close();
}

/* ══════════════════════════════════════════════════════════════════
   1. ÖĞRENCİ TANIMA FORMU
   ══════════════════════════════════════════════════════════════════ */
function formOgrenciTanimaAc(){
  /* Sınıf seçenekleri */
  const sinifOpts = (typeof siniflar!=='undefined'?siniflar:[])
    .sort((a,b)=>a.ad.localeCompare(b.ad,'tr'))
    .map(s=>`<option value="${s.id}">${escapeHtml(s.ad)}</option>`).join('');

  const body = `
    <p style="font-size:12px;color:var(--ink-muted);margin-bottom:14px;">
      Formu doldurun, ardından <strong>Yazdır</strong> butonuna basın.
      Firestore'a kaydetmek için <strong>Kaydet</strong> kullanın.
    </p>
    <div class="form-row">
      <div class="form-group" style="flex:2">
        <label>Öğrenci Adı Soyadı *</label>
        <input id="ft_ogrenciAdi" placeholder="Ad Soyad">
      </div>
      <div class="form-group">
        <label>Öğrenci No</label>
        <input id="ft_ogrenciNo" placeholder="1024" inputmode="numeric">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Sınıf *</label>
        <select id="ft_sinif"><option value="">— Seçiniz —</option>${sinifOpts}</select>
      </div>
      <div class="form-group">
        <label>Cinsiyet</label>
        <select id="ft_cinsiyet">
          <option value="">—</option>
          <option>Kız</option>
          <option>Erkek</option>
        </select>
      </div>
      <div class="form-group">
        <label>Doğum Tarihi</label>
        <input id="ft_dogumTarihi" type="date">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:2">
        <label>Doğum Yeri</label>
        <input id="ft_dogumYeri" placeholder="İl / İlçe">
      </div>
      <div class="form-group" style="flex:2">
        <label>TC Kimlik No</label>
        <input id="ft_tcNo" placeholder="12345678900" maxlength="11" inputmode="numeric">
      </div>
    </div>
    <hr style="margin:12px 0;opacity:.3">
    <div class="form-row">
      <div class="form-group" style="flex:2">
        <label>Anne Adı Soyadı</label>
        <input id="ft_anneAdi" placeholder="Ad Soyad">
      </div>
      <div class="form-group" style="flex:2">
        <label>Anne Telefon</label>
        <input id="ft_anneTel" placeholder="05xx xxx xx xx" inputmode="tel">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:2">
        <label>Baba Adı Soyadı</label>
        <input id="ft_babaAdi" placeholder="Ad Soyad">
      </div>
      <div class="form-group" style="flex:2">
        <label>Baba Telefon</label>
        <input id="ft_babaTel" placeholder="05xx xxx xx xx" inputmode="tel">
      </div>
    </div>
    <div class="form-group">
      <label>Ev Adresi</label>
      <input id="ft_adres" placeholder="Mahalle, Sokak No, İlçe">
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:2">
        <label>Önceki Okul</label>
        <input id="ft_oncekiOkul" placeholder="Okul adı ve ili">
      </div>
      <div class="form-group">
        <label>Nakil Tarihi</label>
        <input id="ft_nakilTarihi" type="date">
      </div>
    </div>
    <hr style="margin:12px 0;opacity:.3">
    <div class="form-group">
      <label>Sağlık Durumu / Kronik Hastalık</label>
      <textarea id="ft_saglik" rows="2" placeholder="Varsa açıklayın (astım, şeker, alerji vb.)"></textarea>
    </div>
    <div class="form-group">
      <label>Acil Durumda Ulaşılacak Kişi</label>
      <input id="ft_acilKisi" placeholder="Ad Soyad — Yakınlık — Telefon">
    </div>
    <div class="form-group">
      <label>Servis Durumu</label>
      <select id="ft_servis">
        <option value="Kullanmıyor">Servis kullanmıyor</option>
        <option value="Okul Servisi">Okul servisi kullanıyor</option>
        <option value="Belediye">Belediye aracı</option>
        <option value="Yürüyerek">Yürüyerek geliyor</option>
        <option value="Aile">Aile taşıyor</option>
      </select>
    </div>
    <div class="form-group">
      <label>Notlar</label>
      <textarea id="ft_notlar" rows="2" placeholder="Eklemek istediğiniz bilgiler..."></textarea>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;">
      <button class="btn btn-ghost btn-sm" onclick="formOgrenciTanimayazdir()">🖨️ Yazdır / PDF</button>
    </div>
  `;

  modalAc('📋 Öğrenci Tanıma Formu', body, ()=>{
    /* Firestore'a kaydet — oy_veliler koleksiyonuna ekler */
    const ogrenciAdi = document.getElementById('ft_ogrenciAdi').value.trim();
    const sinifId    = document.getElementById('ft_sinif').value;
    if(!ogrenciAdi || !sinifId){ toast('Öğrenci adı ve sınıf zorunludur.'); return; }
    const veri = {
      ogrenciAdi,
      ogrenciNo   : document.getElementById('ft_ogrenciNo').value.trim(),
      sinifId,
      cinsiyet    : document.getElementById('ft_cinsiyet').value,
      dogumTarihi : document.getElementById('ft_dogumTarihi').value,
      dogumYeri   : document.getElementById('ft_dogumYeri').value.trim(),
      tcNo        : document.getElementById('ft_tcNo').value.trim(),
      anneAdi     : document.getElementById('ft_anneAdi').value.trim(),
      anneTel     : document.getElementById('ft_anneTel').value.trim(),
      babaAdi     : document.getElementById('ft_babaAdi').value.trim(),
      babaTel     : document.getElementById('ft_babaTel').value.trim(),
      adres       : document.getElementById('ft_adres').value.trim(),
      oncekiOkul  : document.getElementById('ft_oncekiOkul').value.trim(),
      nakilTarihi : document.getElementById('ft_nakilTarihi').value,
      saglik      : document.getElementById('ft_saglik').value.trim(),
      acilKisi    : document.getElementById('ft_acilKisi').value.trim(),
      servis      : document.getElementById('ft_servis').value,
      notlar      : document.getElementById('ft_notlar').value.trim(),
      formDoldurmaTarihi: new Date().toISOString(),
    };
    db.collection(COL.veliler).add({...veri, eklenmeTarihi: new Date().toISOString()})
      .then(()=>{ toast('Öğrenci kaydedildi.'); modalKapat(); })
      .catch(err=>toast('Hata: '+err.message));
  });
}

/* Yazdır fonksiyonu — modal açıkken çağrılır */
function formOgrenciTanimayazdir(){
  const okulAdi   = (okulBilgileriAyari&&okulBilgileriAyari.okulAdi)||'KORUK İLK - ORTAOKULU';
  const mudurObj  = okulBilgileriAyari&&okulBilgileriAyari.mudurId
    ? (typeof ogretmenler!=='undefined'?ogretmenler:[]).find(o=>o.id===okulBilgileriAyari.mudurId) : null;
  const mudurAdi  = mudurObj ? `${mudurObj.ad} ${mudurObj.soyad}` : '…………………………………………';

  const adi    = document.getElementById('ft_ogrenciAdi').value.trim() || '…………………………………………';
  const no     = document.getElementById('ft_ogrenciNo').value.trim()  || '…………';
  const sinifId= document.getElementById('ft_sinif').value;
  const sinifAd= sinifId ? ((typeof siniflar!=='undefined'?siniflar:[]).find(s=>s.id===sinifId)||{}).ad||'……' : '……';
  const cinsiyet = document.getElementById('ft_cinsiyet').value || '……';
  const dogum    = document.getElementById('ft_dogumTarihi').value
    ? new Date(document.getElementById('ft_dogumTarihi').value).toLocaleDateString('tr-TR') : '……………………';
  const dogumYer = document.getElementById('ft_dogumYeri').value.trim()  || '……………………………';
  const tc       = document.getElementById('ft_tcNo').value.trim()         || '……………………………';
  const anne     = document.getElementById('ft_anneAdi').value.trim()      || '……………………………………';
  const anneTel  = document.getElementById('ft_anneTel').value.trim()      || '…………………………';
  const baba     = document.getElementById('ft_babaAdi').value.trim()      || '……………………………………';
  const babaTel  = document.getElementById('ft_babaTel').value.trim()      || '…………………………';
  const adres    = document.getElementById('ft_adres').value.trim()        || '…………………………………………………………………………';
  const oncekiOkul = document.getElementById('ft_oncekiOkul').value.trim() || '……………………………………………………';
  const nakilTar = document.getElementById('ft_nakilTarihi').value
    ? new Date(document.getElementById('ft_nakilTarihi').value).toLocaleDateString('tr-TR') : '……………………';
  const saglik   = document.getElementById('ft_saglik').value.trim()       || 'Bildirilmemiştir.';
  const acilKisi = document.getElementById('ft_acilKisi').value.trim()     || '…………………………………………………………';
  const servis   = document.getElementById('ft_servis').value              || '……………………';
  const notlar   = document.getElementById('ft_notlar').value.trim()       || '—';

  const html = `
    <div class="okul-ust">
      <div class="il">KARAMAN İLİ ERMENEK İLÇESİ MİLLÎ EĞİTİM MÜDÜRLÜĞÜ</div>
      <h1>${okulAdi}</h1>
      <h2>ÖĞRENCİ TANIMA FORMU</h2>
    </div>

    <table>
      <tr><th colspan="4" style="background:#ddd;text-align:center;">KİŞİSEL BİLGİLER</th></tr>
      <tr>
        <th>Adı Soyadı</th><td colspan="3">${adi}</td>
      </tr>
      <tr>
        <th>Öğrenci No</th><td>${no}</td>
        <th>Sınıf</th><td>${sinifAd}</td>
      </tr>
      <tr>
        <th>Cinsiyet</th><td>${cinsiyet}</td>
        <th>Doğum Tarihi</th><td>${dogum}</td>
      </tr>
      <tr>
        <th>Doğum Yeri</th><td>${dogumYer}</td>
        <th>TC Kimlik No</th><td>${tc}</td>
      </tr>
    </table>

    <table>
      <tr><th colspan="4" style="background:#ddd;text-align:center;">AİLE BİLGİLERİ</th></tr>
      <tr>
        <th>Anne Adı Soyadı</th><td>${anne}</td>
        <th>Telefon</th><td>${anneTel}</td>
      </tr>
      <tr>
        <th>Baba Adı Soyadı</th><td>${baba}</td>
        <th>Telefon</th><td>${babaTel}</td>
      </tr>
      <tr>
        <th>Ev Adresi</th><td colspan="3">${adres}</td>
      </tr>
    </table>

    <table>
      <tr><th colspan="4" style="background:#ddd;text-align:center;">EĞİTİM BİLGİLERİ</th></tr>
      <tr>
        <th>Önceki Okul</th><td colspan="2">${oncekiOkul}</td>
        <th>Nakil Tarihi</th>
      </tr>
      <tr>
        <td colspan="3"></td><td>${nakilTar}</td>
      </tr>
      <tr>
        <th>Ulaşım</th><td colspan="3">${servis}</td>
      </tr>
    </table>

    <table>
      <tr><th colspan="2" style="background:#ddd;text-align:center;">SAĞLIK VE ACİL BİLGİLER</th></tr>
      <tr><th style="width:200px;">Sağlık Durumu</th><td>${saglik}</td></tr>
      <tr><th>Acil Kişi</th><td>${acilKisi}</td></tr>
    </table>

    ${notlar&&notlar!=='—'?`<table><tr><th style="background:#ddd;">Notlar</th></tr><tr><td>${notlar}</td></tr></table>`:''}

    <div class="imza-alani" style="margin-top:36px;">
      <div class="imza-kutu">
        <div class="cizgi"></div>
        <p><strong>Veli İmzası</strong></p>
        <p style="font-size:9pt;margin-top:2px;">${anne} / ${baba}</p>
      </div>
      <div class="imza-kutu">
        <div class="cizgi"></div>
        <p><strong>Okul Müdürü</strong></p>
        <p style="font-size:9pt;margin-top:2px;">${mudurAdi}</p>
      </div>
    </div>
    <p style="text-align:right;font-size:10pt;margin-top:10px;">Tarih: ${bugunTarih()}</p>
  `;
  formuYazdir(html, 'Öğrenci Tanıma Formu');
}


/* ══════════════════════════════════════════════════════════════════
   2. İZİN DİLEKÇESİ ŞABLONLARI
   ══════════════════════════════════════════════════════════════════ */

const IZIN_TURLERI = [
  { deger:'yillik',   etiket:'Yıllık İzin',        gun:null,  aciklama:'Yıllık izin hakkından kullanmak istiyorum.' },
  { deger:'mazeret',  etiket:'Mazeret İzni (1 Gün)',gun:1,     aciklama:'Acil bir mazeretle karşılaştığım için bugün göreve gelemeyeceğim.' },
  { deger:'hastalik', etiket:'Hastalık / Rapor',    gun:null,  aciklama:'Sağlık durumum nedeniyle doktor raporum bulunmaktadır.' },
  { deger:'ucretsiz', etiket:'Ücretsiz İzin',       gun:null,  aciklama:'Kişisel nedenlerle ücretsiz izin talep ediyorum.' },
  { deger:'diger',    etiket:'Diğer',               gun:null,  aciklama:'' },
];

function formIzinDilekceAc(){
  const ogrtOpts = (typeof ogretmenler!=='undefined'?ogretmenler:[])
    .sort((a,b)=>a.ad.localeCompare(b.ad,'tr'))
    .map(o=>`<option value="${o.id}">${escapeHtml(o.ad+' '+o.soyad)} — ${escapeHtml(o.brans||o.unvan||'')}</option>`).join('');

  const izinTurOpts = IZIN_TURLERI.map(t=>`<option value="${t.deger}">${t.etiket}</option>`).join('');

  const body = `
    <p style="font-size:12px;color:var(--ink-muted);margin-bottom:14px;">
      Dilekçeyi doldurun ve <strong>Yazdır</strong> butonuna basın.
    </p>
    <div class="form-group">
      <label>Dilekçeyi Yazan Öğretmen *</label>
      <select id="fd_ogretmen"><option value="">— Seçiniz —</option>${ogrtOpts}</select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>İzin Türü *</label>
        <select id="fd_izinTur" onchange="izinTurDegisti()">${izinTurOpts}</select>
      </div>
      <div class="form-group">
        <label>Başlangıç Tarihi *</label>
        <input id="fd_baslangic" type="date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group" id="fd_bitisGrup">
        <label>Bitiş Tarihi</label>
        <input id="fd_bitis" type="date">
      </div>
    </div>
    <div class="form-group">
      <label>Mazeret / Açıklama</label>
      <textarea id="fd_aciklama" rows="3" placeholder="İzin gerekçenizi buraya yazın..."></textarea>
    </div>
    <div class="form-group">
      <label>Vekil Öğretmen (opsiyonel)</label>
      <select id="fd_vekil"><option value="">— Vekil atanmadı —</option>${ogrtOpts}</select>
    </div>
    <div style="margin-top:16px;">
      <button class="btn btn-ghost btn-sm" onclick="formIzinDilekceYazdir()">🖨️ Yazdır / PDF</button>
    </div>
  `;
  modalAc('📄 İzin Dilekçesi', body, null);
  /* izin türü değişince açıklama otomatik doldur */
  setTimeout(()=>{
    const sel = document.getElementById('fd_izinTur');
    if(sel) sel.dispatchEvent(new Event('change'));
  }, 100);
}

function izinTurDegisti(){
  const tur = (document.getElementById('fd_izinTur')||{}).value;
  const turObj = IZIN_TURLERI.find(t=>t.deger===tur);
  const acEl = document.getElementById('fd_aciklama');
  if(acEl && turObj && turObj.aciklama) acEl.value = turObj.aciklama;
}

function formIzinDilekceYazdir(){
  const okulAdi  = (okulBilgileriAyari&&okulBilgileriAyari.okulAdi)||'KORUK İLK - ORTAOKULU';
  const mudurObj = okulBilgileriAyari&&okulBilgileriAyari.mudurId
    ? (typeof ogretmenler!=='undefined'?ogretmenler:[]).find(o=>o.id===okulBilgileriAyari.mudurId) : null;
  const mudurAdi = mudurObj ? `${mudurObj.ad} ${mudurObj.soyad}` : '…………………………';

  const ogrtId  = document.getElementById('fd_ogretmen').value;
  const ogrtObj = ogrtId ? (typeof ogretmenler!=='undefined'?ogretmenler:[]).find(o=>o.id===ogrtId) : null;
  if(!ogrtObj){ toast('Öğretmen seçiniz.'); return; }

  const turVal  = document.getElementById('fd_izinTur').value;
  const turObj  = IZIN_TURLERI.find(t=>t.deger===turVal)||{etiket:'İzin'};
  const bas     = document.getElementById('fd_baslangic').value;
  const bit     = document.getElementById('fd_bitis').value;
  const aciklama= document.getElementById('fd_aciklama').value.trim()||'';
  const vekilId = document.getElementById('fd_vekil').value;
  const vekilObj= vekilId ? (typeof ogretmenler!=='undefined'?ogretmenler:[]).find(o=>o.id===vekilId) : null;

  const basTarih = bas ? new Date(bas).toLocaleDateString('tr-TR') : bugunTarih();
  const bitTarih = bit ? new Date(bit).toLocaleDateString('tr-TR') : '';

  /* Gün sayısı hesapla */
  let gunSayisi = '';
  if(bas && bit){
    const ms = new Date(bit)-new Date(bas);
    const g  = Math.round(ms/86400000)+1;
    gunSayisi = g > 0 ? `${g} (${g}) iş günü` : '';
  }

  const html = `
    <div class="okul-ust">
      <div class="il">KARAMAN İLİ ERMENEK İLÇESİ MİLLÎ EĞİTİM MÜDÜRLÜĞÜ</div>
      <h1>${okulAdi}</h1>
    </div>

    <div class="tarih-yer">
      Ermenek, ${bugunTarih()}
    </div>

    <div class="baslik-blok">
      <div class="tip">${turObj.etiket.toUpperCase()} DİLEKÇESİ</div>
    </div>

    <p><strong>SAYIN ${mudurAdi}</strong><br>
    <strong>${okulAdi} OKUL MÜDÜRLÜĞÜNE</strong></p>

    <div class="metin-blok">
      <p>
        Okulunuzda <strong>${escapeHtml(ogrtObj.brans||ogrtObj.unvan||'Öğretmen')}</strong>
        olarak görev yapmaktayım. ${aciklama}
      </p>
      ${gunSayisi ? `<p>İzin Tarihleri: <strong>${basTarih}</strong>${bitTarih?' — <strong>'+bitTarih+'</strong>':''}&nbsp;&nbsp;|&nbsp;&nbsp;Süre: <strong>${gunSayisi}</strong></p>` : `<p>İzin Tarihi: <strong>${basTarih}</strong></p>`}
      ${vekilObj ? `<p>İzinli olduğum süre zarfında derslerime <strong>${escapeHtml(vekilObj.ad+' '+vekilObj.soyad)}</strong> öğretmen bakacaktır.</p>` : ''}
      <p>Gereğini saygılarımla arz ederim.</p>
    </div>

    <div class="imza-alani">
      <div style="width:300px;">
        <p style="font-size:10pt;"><strong>Ad Soyad:</strong> ${escapeHtml(ogrtObj.ad+' '+ogrtObj.soyad)}</p>
        <p style="font-size:10pt;"><strong>Branş:</strong> ${escapeHtml(ogrtObj.brans||ogrtObj.unvan||'—')}</p>
        ${ogrtObj.tcNo?`<p style="font-size:10pt;"><strong>TC Kimlik No:</strong> ${escapeHtml(ogrtObj.tcNo)}</p>`:''}
        ${ogrtObj.telefon?`<p style="font-size:10pt;"><strong>Telefon:</strong> ${escapeHtml(ogrtObj.telefon)}</p>`:''}
      </div>
      <div class="imza-kutu">
        <div class="cizgi"></div>
        <p><strong>İmza</strong></p>
        <p style="font-size:9pt;margin-top:2px;">${escapeHtml(ogrtObj.ad+' '+ogrtObj.soyad)}</p>
      </div>
    </div>

    <hr style="margin-top:40px;border:1px solid #000;">
    <table style="margin-top:10px;font-size:10pt;">
      <tr>
        <th style="background:#eee;width:120px;">ONAY</th>
        <td>
          <span class="onay-kare"></span> Uygun görülmüştür. &nbsp;&nbsp;
          <span class="onay-kare"></span> Uygun görülmemiştir.
        </td>
      </tr>
      <tr>
        <th style="background:#eee;">Müdür İmzası</th>
        <td style="height:50px;"></td>
      </tr>
    </table>
  `;
  formuYazdir(html, 'İzin Dilekçesi');
}


/* ══════════════════════════════════════════════════════════════════
   3. ÇEVRİMDIŞI / SW ÖNBELLEK DURUMU (Ayarlar sekmesinde gösterilir)
   ══════════════════════════════════════════════════════════════════ */
async function swDurumGuncelle(){
  const el = document.getElementById('swDurumBilgi');
  if(!el) return;

  if(!('serviceWorker' in navigator)){
    el.innerHTML = '<span style="color:var(--color-error);">⚠️ Service Worker desteklenmiyor.</span>';
    return;
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if(!reg){
      el.innerHTML = '<span style="color:var(--color-warning);">🔄 Service Worker henüz yüklenmedi.</span>';
      return;
    }

    const durum = reg.active ? 'Aktif ✅' : reg.installing ? 'Yükleniyor 🔄' : reg.waiting ? 'Güncelleme Bekliyor ⏳' : 'Bilinmiyor';
    const kapsam = reg.scope || '—';

    /* Önbellekteki dosya sayısı */
    let dosyaSayisi = '—';
    if('caches' in window){
      try {
        const anahtarlar = await caches.keys();
        const oyCaches = anahtarlar.filter(k=>k.startsWith('oy-cache'));
        if(oyCaches.length){
          const cache = await caches.open(oyCaches[0]);
          const istekler = await cache.keys();
          dosyaSayisi = istekler.length + ' dosya';
        }
      } catch(e){ dosyaSayisi = 'Okunamadı'; }
    }

    el.innerHTML = `
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr><td style="padding:4px 0;color:var(--ink-muted);width:160px;">SW Durumu</td><td><strong>${durum}</strong></td></tr>
        <tr><td style="padding:4px 0;color:var(--ink-muted);">Önbellek</td><td><strong>${dosyaSayisi}</strong></td></tr>
        <tr><td style="padding:4px 0;color:var(--ink-muted);">Kapsam</td><td style="font-size:11px;">${kapsam}</td></tr>
      </table>
    `;
  } catch(e){
    el.innerHTML = `<span style="color:var(--color-error);">Hata: ${e.message}</span>`;
  }
}

async function swOnbellekTemizle(){
  if(!confirm('Önbellek temizlenecek. Uygulama bir sonraki açılışta tüm dosyaları yeniden indirecek. Devam edilsin mi?')) return;
  try {
    const anahtarlar = await caches.keys();
    await Promise.all(anahtarlar.map(k=>caches.delete(k)));
    toast('Önbellek temizlendi. Sayfayı yenileyebilirsiniz.');
    swDurumGuncelle();
  } catch(e){
    toast('Hata: '+e.message);
  }
}

async function swGuncelle(){
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if(reg){ await reg.update(); toast('Güncelleme kontrol edildi.'); swDurumGuncelle(); }
    else { toast('Service Worker kaydı bulunamadı.'); }
  } catch(e){ toast('Hata: '+e.message); }
}

/* Sayfa yüklenince SW durumunu otomatik göster */
document.addEventListener('DOMContentLoaded', ()=>{
  setTimeout(swDurumGuncelle, 1500);
});
