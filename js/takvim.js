/* ====================================================================
   TAKVİM MODÜLÜ  — takvim.js
   · Aylık takvim grid (güne tıkla → etkinlik veya görev ekle)
   · Etkinlik  = eski hatırlatıcı + tekrarlama (haftalık/aylık)
   · Görev     = son tarihli iş, basit tamamlandı toggle
   · Ajanda    = bugünden itibaren 30 gün liste
   · Dashboard: renderDashHatirlaticilar, renderDashMiniTakvim,
                renderDashYillikGorunum
   ==================================================================== */

/* ---- durum ---- */
let _takvimYil  = new Date().getFullYear();
let _takvimAy   = new Date().getMonth(); // 0-based

/* ---- yardımcılar ---- */
function _pad2(n){ return String(n).padStart(2,'0'); }
function _isoToday(){ const d=new Date(); return `${d.getFullYear()}-${_pad2(d.getMonth()+1)}-${_pad2(d.getDate())}`; }
function _trFormatTarih(iso){ if(!iso) return ''; const p=iso.split('-'); return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:iso; }

/* Görev tamamlandı mı? Eski kanban durum alanını da destekler */
function gorevTamamlandiMi(g){ return g.tamamlandi===true || g.durum==='tamamlandi'; }

/* Bir etkinliğin (hatırlatıcının) verilen gün için aktif olup olmadığını hesapla */
function etkinlikBuGundeAktifMi(h, isoGun){
  // Tekrar yoksa sadece kendi tarihine bak
  if(!h.tekrar || !h.tekrar.tip) return h.tarih === isoGun;
  if(h.tarih > isoGun) return false; // başlangıç gelecekte
  if(h.tekrar.bitisISOtarihi && isoGun > h.tekrar.bitisISOtarihi) return false;
  if(h.tarih === isoGun) return true;

  const baslangic = new Date(h.tarih + 'T00:00:00');
  const hedef     = new Date(isoGun  + 'T00:00:00');

  if(h.tekrar.tip === 'haftalik'){
    const farkMs = hedef - baslangic;
    const farkGun = Math.round(farkMs / 86400000);
    return farkGun % 7 === 0;
  }
  if(h.tekrar.tip === 'aylik'){
    return baslangic.getDate() === hedef.getDate();
  }
  return false;
}

/* Görev rengi: son tarihe göre */
function gorevRenkSinifi(g){
  if(gorevTamamlandiMi(g)) return 'gorev-tamam';
  if(!g.sonTarih) return 'gorev-normal';
  const bugun = _isoToday();
  const fark  = Math.ceil((new Date(g.sonTarih+'T00:00:00') - new Date(bugun+'T00:00:00')) / 86400000);
  if(fark < 0)  return 'gorev-gecmis';
  if(fark === 0) return 'gorev-bugun';
  if(fark <= 3)  return 'gorev-yakin';
  if(fark <= 7)  return 'gorev-orta';
  return 'gorev-normal';
}

/* ---- veri güncellenince çağrılır (app.js'den) ---- */
function takvimVeriGuncelle(){
  takvimGridRender();
  takvimAjandaRender();
  renderDashHatirlaticilar();
  renderDashMiniTakvim();
  renderDashYillikGorunum();
}

/* ================================================================
   AY NAVİGASYONU
   ================================================================ */
function takvimAyDegistir(delta){
  _takvimAy += delta;
  if(_takvimAy > 11){ _takvimAy = 0;  _takvimYil++; }
  if(_takvimAy <  0){ _takvimAy = 11; _takvimYil--; }
  takvimGridRender();
  takvimAjandaRender();
}
function takvimBugunGit(){
  const d = new Date();
  _takvimYil = d.getFullYear();
  _takvimAy  = d.getMonth();
  takvimGridRender();
  takvimAjandaRender();
}

/* ================================================================
   AYLIK GRİD
   ================================================================ */
const _AYLAR_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const _GUN_ETIKETI = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

function takvimGridRender(){
  const baslikEl = document.getElementById('takvimAyBasligi');
  if(baslikEl) baslikEl.textContent = `${_AYLAR_TR[_takvimAy]} ${_takvimYil}`;

  const gridEl = document.getElementById('takvimGrid');
  if(!gridEl) return;

  const bugunISO  = _isoToday();
  const ilkGun    = new Date(_takvimYil, _takvimAy, 1);
  const sonGun    = new Date(_takvimYil, _takvimAy+1, 0);
  // Haftanın ilk günü: Pazartesi=0
  let baslamaOffset = ilkGun.getDay() - 1; // JS: 0=Pazar
  if(baslamaOffset < 0) baslamaOffset = 6;

  let html = '<div class="takvim-gun-basliklari">';
  _GUN_ETIKETI.forEach(g => html += `<div class="takvim-gun-etiket">${g}</div>`);
  html += '</div><div class="takvim-gunler">';

  // Boş hücreler
  for(let i=0; i<baslamaOffset; i++) html += '<div class="takvim-hucre bos"></div>';

  for(let gun=1; gun<=sonGun.getDate(); gun++){
    const isoGun = `${_takvimYil}-${_pad2(_takvimAy+1)}-${_pad2(gun)}`;
    const bugunku = isoGun === bugunISO;

    // Bu gündeki etkinlikler
    const etkinlikler = (typeof hatirlaticilar !== 'undefined' ? hatirlaticilar : [])
      .filter(h => etkinlikBuGundeAktifMi(h, isoGun));

    // Bu gündeki görevler (son tarih bu gün olanlar)
    const gorevBuGun = (typeof gorevler !== 'undefined' ? gorevler : [])
      .filter(g => g.sonTarih === isoGun);

    // Periyodik işler (başlangıç veya bitiş bu gün)
    const periyodikBuGun = (typeof periyodikIsler !== 'undefined' ? periyodikIsler : [])
      .filter(p => !p.tamamlandi && (p.baslangic === isoGun || p.bitis === isoGun));

    let noktaHtml = '';
    if(etkinlikler.length){
      noktaHtml += `<div class="takvim-nokta-satir">`;
      etkinlikler.slice(0,3).forEach(h=>{
        noktaHtml += `<span class="takvim-nokta etkinlik-nokta oncelik-${(h.oncelik||'Orta').toLocaleLowerCase('tr')}" title="${escapeHtml(h.baslik)}"></span>`;
      });
      if(etkinlikler.length>3) noktaHtml += `<span class="takvim-nokta-sayi">+${etkinlikler.length-3}</span>`;
      noktaHtml += `</div>`;
    }
    if(gorevBuGun.length){
      noktaHtml += `<div class="takvim-nokta-satir">`;
      gorevBuGun.slice(0,3).forEach(g=>{
        noktaHtml += `<span class="takvim-nokta gorev-nokta ${gorevRenkSinifi(g)}" title="${escapeHtml(g.baslik)}"></span>`;
      });
      if(gorevBuGun.length>3) noktaHtml += `<span class="takvim-nokta-sayi">+${gorevBuGun.length-3}</span>`;
      noktaHtml += `</div>`;
    }
    if(periyodikBuGun.length){
      noktaHtml += `<div class="takvim-nokta-satir">`;
      periyodikBuGun.slice(0,3).forEach(p=>{
        noktaHtml += `<span class="takvim-nokta periyodik-nokta" title="${escapeHtml(p.isAdi||'Periyodik')}"></span>`;
      });
      if(periyodikBuGun.length>3) noktaHtml += `<span class="takvim-nokta-sayi">+${periyodikBuGun.length-3}</span>`;
      noktaHtml += `</div>`;
    }

    html += `<div class="takvim-hucre${bugunku?' bugun':''}" onclick="takvimGunTikla('${isoGun}')">
      <div class="takvim-gun-no">${gun}</div>
      ${noktaHtml}
    </div>`;
  }

  html += '</div>';
  gridEl.innerHTML = html;
}

/* ================================================================
   AJANDA (bugün + 30 gün)
   ================================================================ */
function takvimAjandaRender(){
  const el = document.getElementById('takvimAjanda');
  if(!el) return;

  const bugunISO = _isoToday();
  const bitis    = new Date(); bitis.setDate(bitis.getDate()+30);
  const bitisISO = `${bitis.getFullYear()}-${_pad2(bitis.getMonth()+1)}-${_pad2(bitis.getDate())}`;

  const satirlar = [];

  // Etkinlikler (hatırlatıcılar)
  (typeof hatirlaticilar !== 'undefined' ? hatirlaticilar : []).forEach(h=>{
    if(h.tamamlandi) return;
    if(!h.tekrar || !h.tekrar.tip){
      if(h.tarih >= bugunISO && h.tarih <= bitisISO){
        satirlar.push({ iso: h.tarih, tip: 'etkinlik', obj: h });
      }
    } else {
      const bas = new Date(Math.max(new Date(h.tarih+'T00:00:00'), new Date(bugunISO+'T00:00:00')));
      const bit = new Date(Math.min(bitis, h.tekrar.bitisISOtarihi ? new Date(h.tekrar.bitisISOtarihi+'T00:00:00') : bitis));
      for(let d=new Date(bas); d<=bit; d.setDate(d.getDate()+1)){
        const iso = `${d.getFullYear()}-${_pad2(d.getMonth()+1)}-${_pad2(d.getDate())}`;
        if(etkinlikBuGundeAktifMi(h, iso)) satirlar.push({ iso, tip: 'etkinlik', obj: h });
      }
    }
  });

  // Görevler
  (typeof gorevler !== 'undefined' ? gorevler : []).forEach(g=>{
    if(gorevTamamlandiMi(g)) return;
    if(g.sonTarih && g.sonTarih >= bugunISO && g.sonTarih <= bitisISO){
      satirlar.push({ iso: g.sonTarih, tip: 'gorev', obj: g });
    }
  });

  // Periyodik işler — başlangıç, bitiş tarihleri + gecikmiş olanlar
  (typeof periyodikIsler !== 'undefined' ? periyodikIsler : []).forEach(p=>{
    if(p.tamamlandi) return;
    if(p.baslangic && p.baslangic >= bugunISO && p.baslangic <= bitisISO){
      satirlar.push({ iso: p.baslangic, tip: 'periyodik', obj: p, altTip: 'baslangic' });
    }
    if(p.bitis && p.bitis >= bugunISO && p.bitis <= bitisISO && p.bitis !== p.baslangic){
      satirlar.push({ iso: p.bitis, tip: 'periyodik', obj: p, altTip: 'bitis' });
    }
    // Bitiş geçmişte ama tamamlanmamış → bugün göster
    if(p.bitis && p.bitis < bugunISO){
      satirlar.push({ iso: bugunISO, tip: 'periyodik', obj: p, altTip: 'gecmis' });
    }
  });

  satirlar.sort((a,b)=>(a.iso+(a.obj.saat||'')).localeCompare(b.iso+(b.obj.saat||'')));

  if(!satirlar.length){ el.innerHTML = '<p class="empty-state">Önümüzdeki 30 günde etkinlik veya görev yok.</p>'; return; }

  const gruplar = {};
  satirlar.forEach(s=>{ if(!gruplar[s.iso]) gruplar[s.iso]=[]; gruplar[s.iso].push(s); });

  let html = '';
  // Yanıp sönen bildirim: bugün veya yarın biten periyodik iş var mı?
  const bugun = new Date(); bugun.setHours(0,0,0,0);
  const yarin = new Date(bugun); yarin.setDate(yarin.getDate()+1);
  const yarinISO = `${yarin.getFullYear()}-${_pad2(yarin.getMonth()+1)}-${_pad2(yarin.getDate())}`;
  const acilPeriyodik = (typeof periyodikIsler!=='undefined'?periyodikIsler:[])
    .filter(p=>!p.tamamlandi && p.bitis && (p.bitis===bugunISO||p.bitis===yarinISO));
  if(acilPeriyodik.length){
    html += `<div class="periyodik-uyari-banner">⚡ <strong>${acilPeriyodik.length} görevin</strong> teslim tarihi bugün veya yarın: ${acilPeriyodik.map(p=>escapeHtml(p.isAdi||'—')).join(', ')}</div>`;
  }

  Object.keys(gruplar).sort().forEach(iso=>{
    html += `<div class="ajanda-tarih-grup">
      <div class="ajanda-tarih-baslik">${_trFormatTarih(iso)}${iso===bugunISO?' <span class="badge badge-sage">Bugün</span>':''}</div>`;
    gruplar[iso].forEach(s=>{
      if(s.tip==='etkinlik'){
        const h = s.obj;
        html += `<div class="ajanda-satir ajanda-etkinlik">
          <span class="ajanda-tip-ikon">⏰</span>
          <div class="ajanda-icerik">
            <div class="ajanda-baslik">${escapeHtml(h.baslik)}${h.tekrar&&h.tekrar.tip?' 🔁':''}</div>
            <div class="ajanda-meta">${h.saat?h.saat+' · ':''}${h.oncelik||'Orta'}${h.aciklama?' · '+escapeHtml(h.aciklama):''}</div>
          </div>
          <div class="ajanda-aksiyonlar">
            <input type="checkbox" title="Tamamlandı" ${h.tamamlandi?'checked':''} onchange="hatirlaticiToggleAjanda('${h.id}',this.checked)">
            <button class="btn btn-ghost btn-sm" onclick="takvimEtkinlikDuzenle('${h.id}')">Düzenle</button>
          </div>
        </div>`;
      } else if(s.tip==='gorev'){
        const g = s.obj;
        html += `<div class="ajanda-satir ajanda-gorev ${gorevRenkSinifi(g)}">
          <span class="ajanda-tip-ikon">✅</span>
          <div class="ajanda-icerik">
            <div class="ajanda-baslik">${escapeHtml(g.baslik)}</div>
            <div class="ajanda-meta">Son tarih: ${_trFormatTarih(g.sonTarih)} · ${g.oncelik||'Orta'}${g.aciklama?' · '+escapeHtml(g.aciklama):''}</div>
          </div>
          <div class="ajanda-aksiyonlar">
            <input type="checkbox" title="Tamamlandı" ${gorevTamamlandiMi(g)?'checked':''} onchange="gorevToggleAjanda('${g.id}',this.checked)">
            <button class="btn btn-ghost btn-sm" onclick="takvimGorevDuzenle('${g.id}')">Düzenle</button>
          </div>
        </div>`;
      } else if(s.tip==='periyodik'){
        const p = s.obj;
        const gecmis = s.altTip==='gecmis';
        const acil = !gecmis && (p.bitis===bugunISO||p.bitis===yarinISO);
        const metaMetin = gecmis
          ? `⚠️ Gecikmiş — Teslim: ${_trFormatTarih(p.bitis)}`
          : s.altTip==='baslangic'
            ? `Başlangıç: ${_trFormatTarih(s.iso)}${p.bitis?' · Teslim: '+_trFormatTarih(p.bitis):''}`
            : `Teslim: ${_trFormatTarih(s.iso)}`;
        html += `<div class="ajanda-satir ajanda-periyodik${acil||gecmis?' ajanda-periyodik-acil':''}">
          <span class="ajanda-tip-ikon">🔄</span>
          <div class="ajanda-icerik">
            <div class="ajanda-baslik">${escapeHtml(p.isAdi||'Periyodik İş')}${acil||gecmis?' <span class="periyodik-pulse">●</span>':''}</div>
            <div class="ajanda-meta">${metaMetin}</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="sekmeAc('periyodikIsler')">Git</button>
        </div>`;
      }
    });
    html += '</div>';
  });

  el.innerHTML = html;
}

/* ================================================================
   GÜNE TIKLA → MODAL
   ================================================================ */
function takvimGunTikla(isoGun){
  // Bu gündeki içerikleri göster + ekle seçeneği
  const etkinlikler = (typeof hatirlaticilar !== 'undefined' ? hatirlaticilar : []).filter(h=>etkinlikBuGundeAktifMi(h,isoGun));
  const gunGorevler = (typeof gorevler !== 'undefined' ? gorevler : []).filter(g=>g.sonTarih===isoGun);

  let listHtml = '';
  if(etkinlikler.length || gunGorevler.length){
    listHtml = '<div style="margin-bottom:14px;">';
    etkinlikler.forEach(h=>{
      listHtml += `<div class="ajanda-satir ajanda-etkinlik" style="cursor:pointer;" onclick="takvimEtkinlikDuzenle('${h.id}')">
        <span>⏰</span> <span>${escapeHtml(h.baslik)}</span>
        <span class="badge badge-${oncelikRengi(h.oncelik||'Orta')}" style="margin-left:auto;">${h.oncelik||'Orta'}</span>
      </div>`;
    });
    gunGorevler.forEach(g=>{
      listHtml += `<div class="ajanda-satir ajanda-gorev ${gorevRenkSinifi(g)}" style="cursor:pointer;" onclick="takvimGorevDuzenle('${g.id}')">
        <span>✅</span> <span>${escapeHtml(g.baslik)}</span>
        ${gorevTamamlandiMi(g)?'<span class="badge badge-sage" style="margin-left:auto;">Tamamlandı</span>':''}
      </div>`;
    });
    listHtml += '</div>';
  }

  const body = `
    ${listHtml}
    <p style="font-size:13px;color:var(--ink-muted);margin-bottom:10px;">Bu güne ne eklemek istersiniz?</p>
    <div style="display:flex;gap:10px;">
      <button class="btn btn-primary" style="flex:1;" onclick="modalKapat(); takvimEtkinlikEkle('${isoGun}')">⏰ Etkinlik (Hatırlatıcı)</button>
      <button class="btn btn-amber"   style="flex:1;" onclick="modalKapat(); takvimGorevEkle('${isoGun}')">✅ Görev</button>
    </div>
  `;

  const baslik = _trFormatTarih(isoGun);
  // Sadece görüntüleme — kaydet butonu yok
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = baslik;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalSilBtn').style.display = 'none';
  document.getElementById('modalKaydetBtn').style.display = 'none';
  overlay.classList.add('active');
}

/* ================================================================
   ETKİNLİK (HATIRLATİCİ) MODAL
   ================================================================ */
function takvimYeniEkleAc(tip){
  if(tip==='gorev') takvimGorevEkle(_isoToday());
  else takvimEtkinlikEkle(_isoToday());
}

function takvimEtkinlikEkle(isoGun){ _takvimEtkinlikModal(null, isoGun); }
function takvimEtkinlikDuzenle(id){
  const h = (typeof hatirlaticilar !== 'undefined' ? hatirlaticilar : []).find(x=>x.id===id);
  if(h) _takvimEtkinlikModal(h, null);
}

function _takvimEtkinlikModal(h, varsayilanGun){
  const tarih = h ? h.tekrar&&h.tekrar.tip ? h.tarih : h.tarih : (varsayilanGun || _isoToday());
  const tekrarTip = h && h.tekrar ? h.tekrar.tip : '';
  const tekrarBitis = h && h.tekrar ? (h.tekrar.bitisISOtarihi||'') : '';

  const body = `
    <div class="form-group"><label>Başlık</label><input id="f_baslik" value="${h?escapeHtml(h.baslik):''}"></div>
    <div class="form-row">
      <div class="form-group"><label>Tarih</label><input type="date" id="f_tarih" value="${tarih}"></div>
      <div class="form-group"><label>Saat (opsiyonel)</label><input type="time" id="f_saat" value="${h&&h.saat?h.saat:''}"></div>
    </div>
    <div class="form-group"><label>Öncelik</label>
      <select id="f_oncelik">
        ${['Düşük','Orta','Yüksek'].map(o=>`<option ${o===(h?h.oncelik:'Orta')?'selected':''}>${o}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Açıklama</label><textarea id="f_aciklama" rows="2">${h?escapeHtml(h.aciklama||''):''}</textarea></div>
    <div class="form-group"><label>Tekrarlama</label>
      <select id="f_tekrar" onchange="takvimTekrarDegisti()">
        <option value="" ${!tekrarTip?'selected':''}>Tekrar Yok</option>
        <option value="haftalik" ${tekrarTip==='haftalik'?'selected':''}>Her Hafta</option>
        <option value="aylik"    ${tekrarTip==='aylik'   ?'selected':''}>Her Ay</option>
      </select>
    </div>
    <div id="f_tekrar_bitis_wrap" style="display:${tekrarTip?'block':'none'};">
      <div class="form-group"><label>Tekrar Bitiş (opsiyonel)</label><input type="date" id="f_tekrar_bitis" value="${tekrarBitis}"></div>
    </div>
    <div class="form-group" style="display:flex;align-items:center;gap:10px;">
      <label style="margin:0;">🔔 Push Bildirimi</label>
      <input type="checkbox" id="f_bildirim" style="width:auto;" ${h&&h.bildirimGonderildi===false&&!h.tamamlandi?'':'checked'}>
    </div>
    ${h?'<p style="font-size:11.5px;color:var(--ink-muted);">Tarih/saat değiştirirseniz bildirim sıfırlanır.</p>':''}
  `;

  modalAc(h?'Etkinlik Düzenle':'Etkinlik Ekle', body, ()=>{
    const baslik = document.getElementById('f_baslik').value.trim();
    const tarihVal = document.getElementById('f_tarih').value;
    if(!baslik || !tarihVal){ toast('Başlık ve tarih zorunludur.'); return; }
    const saatVal = document.getElementById('f_saat').value;
    const tarihSaatDegisti = h && (h.tarih!==tarihVal || (h.saat||'')!==saatVal);
    const tekrarVal = document.getElementById('f_tekrar').value;
    const tekrarBitisVal = document.getElementById('f_tekrar_bitis')?.value || '';
    const bildirim = document.getElementById('f_bildirim').checked;

    const veri = {
      baslik, tarih: tarihVal, saat: saatVal,
      oncelik: document.getElementById('f_oncelik').value,
      aciklama: document.getElementById('f_aciklama').value.trim(),
      tamamlandi: h ? !!h.tamamlandi : false,
      bildirimGonderildi: h ? (tarihSaatDegisti ? false : !!h.bildirimGonderildi) : false,
      tekrar: tekrarVal ? { tip: tekrarVal, bitisISOtarihi: tekrarBitisVal || null } : null
    };
    if(!bildirim) veri.bildirimGonderildi = true; // bildirimi kapat → gönderilmiş say
    kaydet(COL.hatirlaticilar, h?h.id:null, veri);
    modalKapat();
  }, h ? ()=>{ if(confirm('Bu etkinliği silmek istiyor musunuz?')){ db.collection(COL.hatirlaticilar).doc(h.id).delete(); modalKapat(); } } : null);
}

function takvimTekrarDegisti(){
  const val = document.getElementById('f_tekrar')?.value;
  const wrap = document.getElementById('f_tekrar_bitis_wrap');
  if(wrap) wrap.style.display = val ? 'block' : 'none';
}

function hatirlaticiToggleAjanda(id, deger){
  db.collection(COL.hatirlaticilar).doc(id).update({tamamlandi: deger});
}

/* ================================================================
   GÖREV MODAL
   ================================================================ */
function takvimGorevEkle(isoGun){ _takvimGorevModal(null, isoGun); }
function takvimGorevDuzenle(id){
  const g = (typeof gorevler !== 'undefined' ? gorevler : []).find(x=>x.id===id);
  if(g) _takvimGorevModal(g, null);
}

function _takvimGorevModal(g, varsayilanGun){
  const tamam = g ? gorevTamamlandiMi(g) : false;
  const body = `
    <div class="form-group"><label>Başlık</label><input id="f_baslik" value="${g?escapeHtml(g.baslik):''}"></div>
    <div class="form-group"><label>Açıklama</label><textarea id="f_aciklama" rows="2">${g?escapeHtml(g.aciklama||''):''}</textarea></div>
    <div class="form-group"><label>Son Tarih (opsiyonel)</label><input type="date" id="f_sonTarih" value="${g&&g.sonTarih?g.sonTarih:(varsayilanGun||'')}"></div>
    <div class="form-group"><label>Öncelik</label>
      <select id="f_oncelik">
        ${['Düşük','Orta','Yüksek'].map(o=>`<option ${o===(g?g.oncelik:'Orta')?'selected':''}>${o}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" style="display:flex;align-items:center;gap:10px;">
      <label style="margin:0;">✅ Tamamlandı</label>
      <input type="checkbox" id="f_tamam" style="width:auto;" ${tamam?'checked':''}>
    </div>
  `;

  modalAc(g?'Görev Düzenle':'Görev Ekle', body, ()=>{
    const baslik = document.getElementById('f_baslik').value.trim();
    if(!baslik){ toast('Başlık zorunludur.'); return; }
    const sonTarih = document.getElementById('f_sonTarih').value;
    const tamamlandi = document.getElementById('f_tamam').checked;
    const sonTarihDegisti = g && (g.sonTarih||'') !== sonTarih;
    kaydet(COL.gorevler, g?g.id:null, {
      baslik, aciklama: document.getElementById('f_aciklama').value.trim(),
      sonTarih, oncelik: document.getElementById('f_oncelik').value,
      tamamlandi,
      durum: tamamlandi ? 'tamamlandi' : 'yapilacak', // geriye dönük uyumluluk
      bildirimGonderildi: g ? (sonTarihDegisti ? false : !!g.bildirimGonderildi) : false
    });
    modalKapat();
  }, g ? ()=>{ if(confirm('Bu görevi silmek istiyor musunuz?')){ db.collection(COL.gorevler).doc(g.id).delete(); modalKapat(); } } : null);
}

function gorevToggleAjanda(id, deger){
  db.collection(COL.gorevler).doc(id).update({ tamamlandi: deger, durum: deger?'tamamlandi':'yapilacak' });
}

/* ================================================================
   DASHBOARD — Yaklaşan Etkinlikler & Görevler
   ================================================================ */
function renderDashAjanda(){
  const el = document.getElementById('dashAjanda');
  if(!el) return;
  const bugun = _isoToday();
  const items = [];

  (typeof hatirlaticilar !== 'undefined' ? hatirlaticilar : [])
    .filter(h=>!h.tamamlandi && h.tarih >= bugun)
    .forEach(h=> items.push({ iso: h.tarih, saat: h.saat||'', baslik: h.baslik, ikon:'⏰', renk:'#2563EB' }));

  (typeof gorevler !== 'undefined' ? gorevler : [])
    .filter(g=>!gorevTamamlandiMi(g) && g.sonTarih && g.sonTarih >= bugun)
    .forEach(g=> items.push({ iso: g.sonTarih, saat:'', baslik: g.baslik, ikon:'✅', renk:'#16A34A' }));

  items.sort((a,b)=>(a.iso+a.saat).localeCompare(b.iso+b.saat));
  const gorunenler = items.slice(0,8);

  if(!gorunenler.length){
    el.innerHTML = '<p class="empty-state">Yaklaşan etkinlik veya görev yok.</p>';
    return;
  }

  // Tarihe göre grupla
  const gruplar = {};
  gorunenler.forEach(x=>{
    if(!gruplar[x.iso]) gruplar[x.iso]=[];
    gruplar[x.iso].push(x);
  });

  el.innerHTML = Object.keys(gruplar).map(iso=>{
    const tarihMetin = iso===bugun ? 'Bugün' : _trFormatTarih(iso);
    const satirlar = gruplar[iso].map(x=>`
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-soft);">
        <span style="font-size:16px;flex-shrink:0;">${x.ikon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(x.baslik)}</div>
          ${x.saat?`<div style="font-size:11px;color:var(--ink-muted);">${x.saat}</div>`:''}
        </div>
      </div>`).join('');
    return `<div style="margin-bottom:8px;">
      <div style="font-size:11px;font-weight:800;color:var(--brand);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">${tarihMetin}</div>
      ${satirlar}
    </div>`;
  }).join('');
}

function renderDashHatirlaticilar(){
  const el = document.getElementById('dashHatirlaticilar');
  if(!el) return;
  const bugun = _isoToday();
  const yaklasan = [];

  (typeof hatirlaticilar !== 'undefined' ? hatirlaticilar : [])
    .filter(h=>!h.tamamlandi && h.tarih >= bugun)
    .sort((a,b)=>(a.tarih+(a.saat||'')).localeCompare(b.tarih+(b.saat||'')))
    .slice(0,3)
    .forEach(h=> yaklasan.push({ iso: h.tarih, baslik: h.baslik, ikon:'⏰' }));

  (typeof gorevler !== 'undefined' ? gorevler : [])
    .filter(g=>!gorevTamamlandiMi(g) && g.sonTarih && g.sonTarih >= bugun)
    .sort((a,b)=>(a.sonTarih||'').localeCompare(b.sonTarih||''))
    .slice(0,3)
    .forEach(g=> yaklasan.push({ iso: g.sonTarih, baslik: g.baslik, ikon:'✅' }));

  yaklasan.sort((a,b)=>a.iso.localeCompare(b.iso));

  el.innerHTML = yaklasan.length
    ? yaklasan.slice(0,5).map(x=>`<div class="dash-row">${x.ikon} ${_trFormatTarih(x.iso)} — ${escapeHtml(x.baslik)}</div>`).join('')
    : '<p class="empty-state">Yaklaşan etkinlik veya görev yok.</p>';
}

/* ================================================================
   DASHBOARD — Mini Takvim (bu ay)
   ================================================================ */
function renderDashMiniTakvim(){
  const el = document.getElementById('dashMiniTakvim');
  if(!el) return;

  const bugun = new Date();
  const yil   = bugun.getFullYear();
  const ay    = bugun.getMonth();
  const bugunISO = _isoToday();

  const ilkGun = new Date(yil, ay, 1);
  const sonGun = new Date(yil, ay+1, 0);
  let offset = ilkGun.getDay() - 1; if(offset<0) offset=6;

  let html = `<div class="mini-takvim-baslik">${_AYLAR_TR[ay]} ${yil}</div>`;
  html += '<div class="mini-takvim-grid">';
  _GUN_ETIKETI.forEach(g=> html+=`<div class="mini-gun-etiket">${g[0]}</div>`);
  for(let i=0;i<offset;i++) html+='<div class="mini-hucre bos"></div>';
  for(let d=1;d<=sonGun.getDate();d++){
    const iso = `${yil}-${_pad2(ay+1)}-${_pad2(d)}`;
    const aktifMi = (typeof hatirlaticilar!=='undefined'?hatirlaticilar:[]).some(h=>etkinlikBuGundeAktifMi(h,iso)&&!h.tamamlandi)
      || (typeof gorevler!=='undefined'?gorevler:[]).some(g=>g.sonTarih===iso&&!gorevTamamlandiMi(g));
    html += `<div class="mini-hucre${iso===bugunISO?' bugun':''}${aktifMi?' has-event':''}">${d}</div>`;
  }
  html += '</div>';
  el.innerHTML = html;
}

/* ================================================================
   DASHBOARD — Yıllık Görünüm
   ================================================================ */
function renderDashYillikGorunum(){
  const el = document.getElementById('dashYillikGorunum');
  if(!el) return;

  const yil    = new Date().getFullYear();
  const bugunISO = _isoToday();
  const hList  = typeof hatirlaticilar !== 'undefined' ? hatirlaticilar : [];
  const gList  = typeof gorevler      !== 'undefined' ? gorevler      : [];

  let html = '<div class="yillik-grid">';
  for(let ay=0; ay<12; ay++){
    const sonGun = new Date(yil, ay+1, 0).getDate();
    let yogunluk = 0;
    for(let gun=1; gun<=sonGun; gun++){
      const iso = `${yil}-${_pad2(ay+1)}-${_pad2(gun)}`;
      const hSay = hList.filter(h=>etkinlikBuGundeAktifMi(h,iso)&&!h.tamamlandi).length;
      const gSay = gList.filter(g=>g.sonTarih===iso&&!gorevTamamlandiMi(g)).length;
      yogunluk += hSay + gSay;
    }
    const seviye = yogunluk===0?0:yogunluk<3?1:yogunluk<7?2:3;
    const ayISO  = `${yil}-${_pad2(ay+1)}`;
    html += `<div class="yillik-ay yillik-yogunluk-${seviye}" title="${_AYLAR_TR[ay]}: ${yogunluk} etkinlik/görev"
      onclick="takvimAyaGit(${ay},${yil})">
      <div class="yillik-ay-ad">${_AYLAR_TR[ay].substring(0,3)}</div>
      ${yogunluk>0?`<div class="yillik-sayac">${yogunluk}</div>`:''}
    </div>`;
  }
  html += '</div>';
  el.innerHTML = html;
}

function takvimAyaGit(ay, yil){
  _takvimAy  = ay;
  _takvimYil = yil;
  sekmeAc('takvim');
  takvimGridRender();
  takvimAjandaRender();
}

/* ================================================================
   BAŞLATMA
   ================================================================ */
document.addEventListener('DOMContentLoaded', ()=>{
  // Takvim sekmesi açılınca render et
  document.querySelectorAll('.nav-tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(btn.dataset.tab === 'takvim'){
        takvimGridRender();
        takvimAjandaRender();
      }
    });
  });

  // Periyodik işler değişince takvimi güncelle
  // (periyodik.js global periyodikIsler array'ini dolduruyor — değişimi izle)
  let _periyodikSayac = 0;
  setInterval(()=>{
    const yeniSayac = (typeof periyodikIsler !== 'undefined') ? periyodikIsler.length : 0;
    if(yeniSayac !== _periyodikSayac){
      _periyodikSayac = yeniSayac;
      takvimGridRender();
      takvimAjandaRender();
      renderDashMiniTakvim && renderDashMiniTakvim();
      renderDashYillikGorunum && renderDashYillikGorunum();
    }
  }, 2000);
});
