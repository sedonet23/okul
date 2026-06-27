/* ====================================================================
   ÇİZELGELER MODÜLÜ — cizelgeler.js  v3
   · Sosyal Kulüpler  (danışman öğretmen = listeden seçim, metin yok)
   · Maarif Model Aylık Raporlar — tam düzenlenebilir + kaydet
   · Yıllık / BEP Planı, Zümre, ŞÖK, Rehberlik — aynı şekilde
   · Belirli Gün Ve Haftalar — tarih + öğretmen ataması
   · Öğretmen profili: renderOgretmenBelgeDurumu(ogretmenId)
     → tüm belge tiplerinde o öğretmene ait kayıtları gösterir
   ==================================================================== */

/* ---- ortak veri deposu (app.js tarafından doldurulur) ---- */
let cizelgeVerileri = {
  sosyalKulupler: [],
  sok:            [],
  zumre:          [],
  bepPlani:       [],
  rehberlik:      [],
  maarifRapor:    []
};

/* ---- Firestore koleksiyon adları (firebase-init.js COL'dan) ---- */
function _cCol(tip){ return COL[tip]; }

/* ---- yardımcılar ---- */
function _pad2(n){ return String(n).padStart(2,'0'); }
function _isoToday(){ const d=new Date(); return `${d.getFullYear()}-${_pad2(d.getMonth()+1)}-${_pad2(d.getDate())}`; }
function _trTarih(iso){ if(!iso) return ''; const p=iso.split('-'); return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:iso; }

function _ogretmenListesiHtml(seciliIdler, inputId){
  const secilenler = Array.isArray(seciliIdler) ? seciliIdler : (seciliIdler ? [seciliIdler] : []);
  return `<div class="ogr-checkbox-liste" id="${inputId}">
    ${(typeof ogretmenler!=='undefined'?ogretmenler:[])
      .sort((a,b)=>a.ad.localeCompare(b.ad,'tr'))
      .map(o=>`<label class="ogr-cb-row">
        <input type="checkbox" value="${o.id}" ${secilenler.includes(o.id)?'checked':''}>
        <span>${escapeHtml(o.ad+' '+o.soyad)}</span>
      </label>`).join('')}
  </div>`;
}

function _secilenOgretmenler(inputId){
  return Array.from(document.querySelectorAll(`#${inputId} input[type=checkbox]:checked`)).map(el=>el.value);
}

function _ogretmenAdi(id){
  if(!id) return '—';
  const o = (typeof ogretmenler!=='undefined'?ogretmenler:[]).find(x=>x.id===id);
  return o ? `${o.ad} ${o.soyad}` : '—';
}

function _ogretmenAdlari(idler){
  if(!idler || !idler.length) return '—';
  return idler.map(id=>_ogretmenAdi(id)).join(', ');
}

/* ================================================================
   SOSYAL KULÜPLER
   ================================================================ */
function sosyalKulupModalAc(id){
  const k = id ? cizelgeVerileri.sosyalKulupler.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Kulüp Adı</label><input id="f_kulupAdi" value="${k?escapeHtml(k.ad):''}"></div>
    <div class="form-group">
      <label>Danışman Öğretmenler <span style="font-size:11px;color:var(--ink-muted);">(birden fazla seçebilirsiniz)</span></label>
      ${_ogretmenListesiHtml(k?k.ogretmenIdler:[], 'f_kulupOgretmenler')}
    </div>
    <div class="form-group" style="display:flex;align-items:center;gap:10px;">
      <label style="margin:0;">Aktif Kulüp</label>
      <input type="checkbox" id="f_aktif" style="width:auto;" ${!k||k.aktif!==false?'checked':''}>
    </div>
  `;
  modalAc(k?'Kulüp Düzenle':'Yeni Kulüp', body, ()=>{
    const ad = document.getElementById('f_kulupAdi').value.trim();
    if(!ad){ toast('Kulüp adı zorunludur.'); return; }
    const ogretmenIdler = _secilenOgretmenler('f_kulupOgretmenler');
    kaydet(COL.sosyalKulupler, k?k.id:null, {
      ad,
      ogretmenIdler,
      aktif: document.getElementById('f_aktif').checked
    });
    modalKapat();
  }, k?()=>{ if(confirm('Bu kulübü silmek istiyor musunuz?')){ db.collection(COL.sosyalKulupler).doc(k.id).delete(); modalKapat(); } }:null);
}

function sosyalKuluplerKaydet(){ toast('Kayıt otomatik gerçekleşiyor.'); }

function renderSosyalKuluplerListesi(){
  const el = document.getElementById('sosyalKuluplerListesi');
  if(el) el.style.display = 'none';
  renderCizelge('sosyalKulupler');
}

function renderCizelge(tip){
  const tablo = {
    sosyalKulupler: 'sosyalKuluplerTablo',
    sok:            'sokTablo',
    zumre:          'zumreTablo',
    bepPlani:       'bepTablo',
    rehberlik:      'rehberlikTablo',
    maarifRapor:    'maarifTablo'
  }[tip];

  const el = document.getElementById(tablo);
  if(!el) return;

  const veri = cizelgeVerileri[tip] || [];

  if(tip === 'sosyalKulupler'){
    _renderSosyalKulupler(el, veri); return;
  }
  if(tip === 'maarifRapor'){
    _renderMaarifMatris(el, veri); return;
  }
  if(tip === 'bepPlani' || tip === 'rehberlik'){
    _renderBelgeTablosu(el, tip, veri, true); return;
  }
  _renderBelgeTablosu(el, tip, veri, false);
}

/* ---- Sosyal Kulüpler grid ---- */
function _renderSosyalKulupler(el, veri){
  if(!veri.length){
    el.innerHTML = '<p class="empty-state">Henüz kulüp eklenmedi.</p>'; return;
  }
  el.innerHTML = `<div class="kulup-grid">${veri.map(k=>`
    <div class="kulup-kart ${k.aktif===false?'kulup-pasif':''}">
      <div class="kulup-kart-baslik">
        <span>${escapeHtml(k.ad)}</span>
        ${k.aktif===false?'<span class="badge badge-gray">Pasif</span>':'<span class="badge badge-sage">Aktif</span>'}
      </div>
      <div class="kulup-ogretmenler">${k.ogretmenIdler&&k.ogretmenIdler.length
        ? k.ogretmenIdler.map(id=>`<span class="ogr-badge">${escapeHtml(_ogretmenAdi(id))}</span>`).join('')
        : '<span style="color:var(--ink-muted);font-size:12px;">Öğretmen atanmadı</span>'
      }</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="sosyalKulupModalAc('${k.id}')">Düzenle</button>
    </div>`).join('')}</div>`;
}

/* ---- Maarif Model: DERS × AY matris görünümü ---- */
function _renderMaarifMatris(el, veri){
  if(!veri.length){
    el.innerHTML='<p class="empty-state">Henüz kayıt eklenmedi. "+" ile ekleyin.</p>'; return;
  }

  const RAPOR_AYLARI = ['Eyl','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'];

  // Öğretmene göre grupla; ogretmenId boş olanları gösterme
  const gruplar = {};
  veri.forEach(k=>{
    if(!k.ogretmenId) return; // eski/bozuk kayıt — atla
    if(!gruplar[k.ogretmenId]) gruplar[k.ogretmenId]=[];
    gruplar[k.ogretmenId].push(k);
  });

  if(!Object.keys(gruplar).length){
    el.innerHTML='<p class="empty-state">Öğretmen atanmış kayıt yok.</p>'; return;
  }

  let html = '';
  Object.entries(gruplar).forEach(([ogId, kayitlar])=>{
    const ogAdi = _ogretmenAdi(ogId);
    const tamamSay  = kayitlar.reduce((t,k)=>(k.kontroller||[]).filter(Boolean).length+t, 0);
    const toplamSay = kayitlar.length * 10;
    const yuzde = toplamSay ? Math.round(tamamSay/toplamSay*100) : 0;

    html += `<div class="maarif-grup">
      <div class="belge-ogretmen-baslik" style="border-radius:var(--radius-md) var(--radius-md) 0 0;">
        <span class="belge-ogretmen-adi">${escapeHtml(ogAdi)}</span>
        <span class="belge-ilerleme-metin">${tamamSay}/${toplamSay}</span>
        <div class="belge-ilerleme-bar"><div class="belge-ilerleme-ic" style="width:${yuzde}%"></div></div>
      </div>
      <div class="maarif-tablo-wrap">
        <table class="maarif-tablo">
          <thead><tr>
            <th class="maarif-th-ders">DERS / SINIF</th>
            ${RAPOR_AYLARI.map(a=>`<th>${a}</th>`).join('')}
            <th></th>
          </tr></thead>
          <tbody>`;

    kayitlar
      .sort((a,b)=>(a.ders||'').localeCompare(b.ders||'','tr'))
      .forEach(k=>{
        const kontroller = k.kontroller || Array(10).fill(false);
        // sinifler: string (eski) veya array (yeni çoklu)
        const sinifStr = Array.isArray(k.sinifler)
          ? k.sinifler.join(', ')
          : (k.sinif || k.sinifler || '');

        html += `<tr>
          <td class="maarif-td-ders">
            <div class="maarif-ders-adi">${escapeHtml(k.ders||k.rapor||'—')}</div>
            ${sinifStr?`<div class="maarif-sinif">${escapeHtml(sinifStr)}</div>`:''}
          </td>
          ${RAPOR_AYLARI.map((_,i)=>{
            const tamam = !!kontroller[i];
            return `<td class="maarif-td-cb">
              <label class="maarif-cb-label${tamam?' tamam':''}" title="${RAPOR_AYLARI[i]}">
                <input type="checkbox" ${tamam?'checked':''}
                  onchange="belgeKontrolToggle('maarifRapor','${k.id}',${i},this.checked)">
                ${tamam?'<span class="maarif-check">✓</span>':'<span class="maarif-bos"></span>'}
              </label>
            </td>`;
          }).join('')}
          <td><button class="btn btn-ghost btn-sm" onclick="cizelgeSatirModalAc('maarifRapor','${k.id}')" title="Düzenle">✎</button></td>
        </tr>`;
      });

    html += `</tbody></table></div></div>`;
  });

  el.innerHTML = html;
}

/* Maarif matris için kontrol toggle — checkbox label'ı da anında güncelle */
/* ---- Genel belge tablosu (maarifRapor, zumre, sok, bepPlani, rehberlik) ---- */
const CIZELGE_META = {
  maarifRapor: {
    baslik: 'Maarif Model Aylık Raporlar',
    alanlar: [
      { key:'ogretmenId', etiket:'Öğretmen',  tip:'ogretmen' },
      { key:'ders',       etiket:'Ders',       tip:'ders' },
      { key:'sinifler',   etiket:'Sınıflar',   tip:'sinif_coklu' },
      { key:'aciklama',   etiket:'Açıklama',   tip:'textarea', opsiyonel:true }
    ],
    // kontroller[0..9] = Eyl..Haz ayları — her satır için ayrı
    kontroller: ['Eyl','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz']
  },
  zumre: {
    baslik: 'Zümre Toplantıları',
    alanlar: [
      { key:'ogretmenId', etiket:'Öğretmen', tip:'ogretmen' },
      { key:'brans',      etiket:'Branş/Ders',tip:'metin' },
      { key:'donem',      etiket:'Dönem',    tip:'donem' },
      { key:'aciklama',   etiket:'Notlar',   tip:'textarea', opsiyonel:true }
    ],
    kontroller: [
      'Tutanak Hazırlandı',
      'İmzalandı',
      'Müdüre Teslim Edildi',
      'Arşivlendi'
    ]
  },
  sok: {
    baslik: 'ŞÖK – Şiddet Önleme Kurulu',
    alanlar: [
      { key:'ogretmenId', etiket:'Öğretmen', tip:'ogretmen' },
      { key:'tarih',      etiket:'Tarih',    tip:'tarih' },
      { key:'konu',       etiket:'Konu',     tip:'metin' },
      { key:'aciklama',   etiket:'Notlar',   tip:'textarea', opsiyonel:true }
    ],
    kontroller: [
      'Toplantı Yapıldı',
      'Tutanak Hazırlandı',
      'Onaylandı',
      'Arşivlendi'
    ]
  },
  bepPlani: {
    baslik: 'Yıllık / BEP Planları',
    alanlar: [
      { key:'ogretmenId', etiket:'Öğretmen',  tip:'ogretmen' },
      { key:'sinif', etiket:'Sınıf', tip:'sinif' },
      { key:'tur',        etiket:'Plan Türü', tip:'select', secenekler:['Yıllık Plan','BEP Planı','Ünite Planı'] },
      { key:'donem',      etiket:'Dönem',     tip:'donem' },
      { key:'aciklama',   etiket:'Notlar',    tip:'textarea', opsiyonel:true }
    ],
    kontroller: [
      'Plan Hazırlandı',
      'Müdüre Teslim Edildi',
      'Onaylandı',
      'Dijital Yükleme Yapıldı'
    ]
  },
  rehberlik: {
    baslik: 'Rehberlik',
    alanlar: [
      { key:'ogretmenId', etiket:'Öğretmen',   tip:'ogretmen' },
      { key:'sinif', etiket:'Sınıf', tip:'sinif' },
      { key:'ay',         etiket:'Ay',          tip:'ay' },
      { key:'konu',       etiket:'Konu/Etkinlik',tip:'metin' },
      { key:'aciklama',   etiket:'Notlar',      tip:'textarea', opsiyonel:true }
    ],
    kontroller: [
      'Etkinlik Yapıldı',
      'Kayıt Tutuldu',
      'Müdüre Bildirildi'
    ]
  }
};

const AYLAR_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const DONEMLER = ['1. Dönem','2. Dönem','Yıl Sonu'];

function _renderBelgeTablosu(el, tip, veri, kompakt){
  const meta = CIZELGE_META[tip];
  if(!meta){ el.innerHTML='<p class="empty-state">Yapılandırma bulunamadı.</p>'; return; }

  if(!veri.length){
    el.innerHTML=`<p class="empty-state">Henüz kayıt eklenmedi. Sağ üstten "+" ile ekleyebilirsiniz.</p>`; return;
  }

  // Öğretmene göre grupla
  const gruplar = {};
  veri.forEach(kayit=>{
    const ogId = kayit.ogretmenId || '__yok__';
    if(!gruplar[ogId]) gruplar[ogId] = [];
    gruplar[ogId].push(kayit);
  });

  let html = '';
  Object.entries(gruplar).forEach(([ogId, kayitlar])=>{
    const ogAdi = ogId==='__yok__' ? 'Öğretmen Atanmamış' : _ogretmenAdi(ogId);
    const teslimSay = kayitlar.reduce((t,k)=>{
      const kontroller = k.kontroller||[];
      return t + kontroller.filter(Boolean).length;
    },0);
    const toplamKontrol = kayitlar.length * (meta.kontroller.length);
    const yuzde = toplamKontrol ? Math.round(teslimSay/toplamKontrol*100) : 0;

    html += `<div class="belge-ogretmen-grup">
      <div class="belge-ogretmen-baslik">
        <span class="belge-ogretmen-adi">${escapeHtml(ogAdi)}</span>
        <span class="belge-ilerleme-metin">${teslimSay}/${toplamKontrol} tamamlandı</span>
        <div class="belge-ilerleme-bar"><div class="belge-ilerleme-ic" style="width:${yuzde}%;"></div></div>
      </div>`;

    kayitlar.forEach(kayit=>{
      html += _belgeKaydHtml(tip, kayit, meta);
    });
    html += '</div>';
  });

  el.innerHTML = html;
}

function _belgeKaydHtml(tip, kayit, meta){
  // Özet satır bilgisi
  const ozet = meta.alanlar
    .filter(a=>a.key!=='ogretmenId' && a.key!=='aciklama')
    .map(a=>{
      let v = kayit[a.key]||'';
      if(a.tip==='ay') v = AYLAR_TR[parseInt(v)-1]||v;
      if(a.tip==='sinif_coklu') v = Array.isArray(v) ? v.join(', ') : v;
      return v ? escapeHtml(String(v)) : '';
    }).filter(Boolean).join(' · ');

  const kontroller = kayit.kontroller || [];
  const tamamSay = kontroller.filter(Boolean).length;

  return `<div class="belge-kayit" id="belge-${kayit.id}">
    <div class="belge-kayit-baslik">
      <div>
        <div class="belge-kayit-ozet">${ozet||'(detay yok)'}</div>
        ${kayit.aciklama?`<div class="belge-kayit-not">${escapeHtml(kayit.aciklama)}</div>`:''}
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
        <span class="belge-mini-sayac ${tamamSay===meta.kontroller.length?'tamam':tamamSay>0?'kismi':''}">${tamamSay}/${meta.kontroller.length}</span>
        <button class="btn btn-ghost btn-sm" onclick="cizelgeSatirModalAc('${tip}','${kayit.id}')">Düzenle</button>
      </div>
    </div>
    <div class="belge-kontroller">
      ${meta.kontroller.map((kAdi,i)=>`
        <label class="belge-kontrol-item ${kontroller[i]?'tamamlandi':''}">
          <input type="checkbox" ${kontroller[i]?'checked':''}
            onchange="belgeKontrolToggle('${tip}','${kayit.id}',${i},this.checked)">
          <span>${escapeHtml(kAdi)}</span>
        </label>`).join('')}
    </div>
  </div>`;
}

/* ---- Checkbox toggle — anında Firestore'a yaz ---- */
function belgeKontrolToggle(tip, id, index, deger){
  const kayit = (cizelgeVerileri[tip]||[]).find(x=>x.id===id);
  if(!kayit) return;

  // maarifRapor matris: 10 ay sütunu
  const uzunluk = tip==='maarifRapor'
    ? 10
    : (CIZELGE_META[tip]?.kontroller?.length || 4);

  const kontroller = [...(kayit.kontroller||Array(uzunluk).fill(false))];
  while(kontroller.length < uzunluk) kontroller.push(false);
  kontroller[index] = deger;

  db.collection(_cCol(tip)).doc(id).update({ kontroller })
    .then(()=>{
      if(tip === 'maarifRapor'){
        // Matris label'ını güncelle
        const labels = document.querySelectorAll(`tr td .maarif-cb-label`);
        // Satır içindeki ilgili label'ı bul — checkbox'ın input'undan parent al
        const allCb = document.querySelectorAll(`[onchange*="'maarifRapor','${id}',${index},"]`);
        allCb.forEach(cb=>{
          const lbl = cb.closest('label');
          if(!lbl) return;
          lbl.classList.toggle('tamam', deger);
          lbl.querySelector('.maarif-check, .maarif-bos').outerHTML =
            deger ? '<span class="maarif-check">✓</span>' : '<span class="maarif-bos"></span>';
        });
        return;
      }
      // Diğer tipler: label sınıfı güncelle
      const item = document.querySelectorAll(`#belge-${id} .belge-kontrol-item`)[index];
      if(item) item.classList.toggle('tamamlandi', deger);
      const sayac = document.querySelector(`#belge-${id} .belge-mini-sayac`);
      if(sayac){
        const yeni = kontroller.filter(Boolean).length;
        const top  = uzunluk;
        sayac.textContent = `${yeni}/${top}`;
        sayac.className = `belge-mini-sayac ${yeni===top?'tamam':yeni>0?'kismi':''}`;
      }
    })
    .catch(err=>toast('Hata: '+err.message));
}

/* ================================================================
   GENEL KAYIT MODAL (maarifRapor, zumre, sok, bepPlani, rehberlik)
   ================================================================ */
function cizelgeSatirModalAc(tip, id){
  const meta = CIZELGE_META[tip];
  if(!meta){ toast('Bilinmeyen çizelge tipi: '+tip); return; }

  const kayit = id ? (cizelgeVerileri[tip]||[]).find(x=>x.id===id) : null;

  let bodyHtml = '';
  meta.alanlar.forEach(alan=>{
    const val = kayit ? (kayit[alan.key]||'') : '';
    bodyHtml += `<div class="form-group"><label>${escapeHtml(alan.etiket)}</label>`;

    if(alan.tip==='ogretmen'){
      bodyHtml += `<select id="f_${alan.key}">
        <option value="">— Seçiniz —</option>
        ${(typeof ogretmenler!=='undefined'?ogretmenler:[])
          .sort((a,b)=>a.ad.localeCompare(b.ad,'tr'))
          .map(o=>`<option value="${o.id}" ${o.id===val?'selected':''}>${escapeHtml(o.ad+' '+o.soyad)}</option>`)
          .join('')}
      </select>`;
    } else if(alan.tip==='ders'){
      bodyHtml += `<select id="f_${alan.key}">
        <option value="">— Ders Seçiniz —</option>
        ${(typeof dersListesi!=='undefined'?[...dersListesi].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr')):[])
          .map(d=>`<option value="${escapeHtml(d.ad)}" ${d.ad===val?'selected':''}>${escapeHtml(d.ad)}</option>`)
          .join('')}
      </select>`;
    } else if(alan.tip==='sinif_coklu'){
      const seciliSinifler = Array.isArray(val) ? val : (val ? [val] : []);
      bodyHtml += `<div class="ogr-checkbox-liste" id="f_${alan.key}" style="max-height:160px;">
        ${(typeof siniflar!=='undefined'?[...siniflar].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr')):[])
          .map(s=>`<label class="ogr-cb-row">
            <input type="checkbox" value="${escapeHtml(s.ad)}" ${seciliSinifler.includes(s.ad)?'checked':''}>
            <span>${escapeHtml(s.ad)}</span>
          </label>`).join('')}
      </div>`;
    } else if(alan.tip==='textarea'){
      bodyHtml += `<textarea id="f_${alan.key}" rows="2">${escapeHtml(val)}</textarea>`;
    } else if(alan.tip==='tarih'){
      bodyHtml += `<input type="date" id="f_${alan.key}" value="${val||_isoToday()}">`;
    } else if(alan.tip==='ay'){
      bodyHtml += `<select id="f_${alan.key}">
        <option value="">— Seçiniz —</option>
        ${AYLAR_TR.map((ay,i)=>`<option value="${i+1}" ${String(i+1)===String(val)?'selected':''}>${ay}</option>`).join('')}
      </select>`;
    } else if(alan.tip==='sinif'){
      bodyHtml += `<select id="f_${alan.key}">
        <option value="">— Sınıf Seçiniz —</option>
        ${(typeof siniflar!=='undefined'?[...siniflar].sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr')):[])
          .map(s=>`<option value="${escapeHtml(s.ad)}" ${s.ad===val?'selected':''}>${escapeHtml(s.ad)}</option>`)
          .join('')}
      </select>`;
    } else if(alan.tip==='donem'){
      bodyHtml += `<select id="f_${alan.key}">
        <option value="">— Seçiniz —</option>
        ${DONEMLER.map(d=>`<option ${d===val?'selected':''}>${d}</option>`).join('')}
      </select>`;
    } else if(alan.tip==='select'){
      bodyHtml += `<select id="f_${alan.key}">
        <option value="">— Seçiniz —</option>
        ${(alan.secenekler||[]).map(s=>`<option ${s===val?'selected':''}>${s}</option>`).join('')}
      </select>`;
    } else {
      bodyHtml += `<input id="f_${alan.key}" value="${escapeHtml(val)}">`;
    }
    bodyHtml += '</div>';
  });

  modalAc(
    kayit ? `${meta.baslik} — Düzenle` : `${meta.baslik} — Yeni Kayıt`,
    bodyHtml,
    ()=>{
      // zorunlu alan kontrolü
      const zorunlu = meta.alanlar.filter(a=>!a.opsiyonel);
      for(const alan of zorunlu){
        if(alan.tip==='sinif_coklu'){
          const sec = _secilenOgretmenler(`f_${alan.key}`); // checkbox'lar aynı pattern
          if(!sec.length){ toast('"Sınıf" seçimi zorunludur — en az bir sınıf seçin.'); return; }
          continue;
        }
        const v = document.getElementById(`f_${alan.key}`)?.value?.trim();
        if(!v){ toast(`"${alan.etiket}" alanı zorunludur.`); return; }
      }

      const veri = {};
      meta.alanlar.forEach(alan=>{
        if(alan.tip==='sinif_coklu'){
          veri[alan.key] = _secilenOgretmenler(`f_${alan.key}`);
        } else {
          const el = document.getElementById(`f_${alan.key}`);
          veri[alan.key] = el ? el.value.trim() : '';
        }
      });
      // Kontrolleri koru (yeni kayıtta boş dizi — maarifRapor için 10, diğerleri meta.kontroller.length)
      const kontrolUzunluk = tip==='maarifRapor' ? 10 : meta.kontroller.length;
      veri.kontroller = kayit
        ? kayit.kontroller || Array(kontrolUzunluk).fill(false)
        : Array(kontrolUzunluk).fill(false);

      kaydet(_cCol(tip), kayit?kayit.id:null, veri);
      modalKapat();
    },
    kayit ? ()=>{
      if(confirm('Bu kaydı silmek istiyor musunuz?')){
        db.collection(_cCol(tip)).doc(kayit.id).delete();
        modalKapat();
      }
    } : null
  );
}

/* ================================================================
   BELİRLİ GÜN VE HAFTALAR
   ================================================================ */
let belirliGunlerListesi = [];

function belirliGunModalAc(id){
  const e = id ? belirliGunlerListesi.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Etkinlik Adı</label><input id="f_ad" value="${e?escapeHtml(e.ad):''}"></div>
    <div class="form-row">
      <div class="form-group"><label>Başlangıç Tarihi</label><input type="date" id="f_tarihBaslangic" value="${e?e.tarihBaslangic:_isoToday()}"></div>
      <div class="form-group"><label>Bitiş Tarihi (opsiyonel)</label><input type="date" id="f_tarihBitis" value="${e&&e.tarihBitis?e.tarihBitis:''}"></div>
    </div>
    <div class="form-group">
      <label>Sorumlu Öğretmenler <span style="font-size:11px;color:var(--ink-muted);">(birden fazla seçebilirsiniz)</span></label>
      ${_ogretmenListesiHtml(e?e.ogretmenIdler||[]:[], 'f_bgOgretmenler')}
    </div>
    <div class="form-group"><label>Notlar</label><textarea id="f_aciklama" rows="2">${e?escapeHtml(e.aciklama||''):''}</textarea></div>
    <div class="form-group" style="display:flex;align-items:center;gap:10px;">
      <label style="margin:0;">Tamamlandı</label>
      <input type="checkbox" id="f_tamam" style="width:auto;" ${e&&e.tamamlandi?'checked':''}>
    </div>
  `;
  modalAc(e?'Etkinlik Düzenle':'Yeni Etkinlik', body, ()=>{
    const ad = document.getElementById('f_ad').value.trim();
    const tarihBaslangic = document.getElementById('f_tarihBaslangic').value;
    if(!ad || !tarihBaslangic){ toast('Ad ve tarih zorunludur.'); return; }
    kaydet(COL.belirliGunler, e?e.id:null, {
      ad, tarihBaslangic,
      tarihBitis: document.getElementById('f_tarihBitis').value,
      ogretmenIdler: _secilenOgretmenler('f_bgOgretmenler'),
      aciklama: document.getElementById('f_aciklama').value.trim(),
      tamamlandi: document.getElementById('f_tamam').checked
    });
    modalKapat();
  }, e?()=>{ if(confirm('Silmek istiyor musunuz?')){ db.collection(COL.belirliGunler).doc(e.id).delete(); modalKapat(); } }:null);
}

function renderBelirliGunler(){
  const el = document.getElementById('belirliGunlerTablo');
  if(!el) return;
  const liste = [...belirliGunlerListesi].sort((a,b)=>(a.tarihBaslangic||'').localeCompare(b.tarihBaslangic||''));
  if(!liste.length){ el.innerHTML='<p class="empty-state">Henüz etkinlik eklenmedi.</p>'; return; }

  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;">${liste.map(e=>`
    <div class="belge-kayit ${e.tamamlandi?'belge-tamam':''}">
      <div class="belge-kayit-baslik">
        <div>
          <div class="belge-kayit-ozet">${escapeHtml(e.ad)}</div>
          <div class="belge-kayit-not">
            ${_trTarih(e.tarihBaslangic)}${e.tarihBitis?' – '+_trTarih(e.tarihBitis):''}
            ${e.ogretmenIdler&&e.ogretmenIdler.length?' · '+_ogretmenAdlari(e.ogretmenIdler):''}
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
          ${e.tamamlandi?'<span class="badge badge-sage">✓ Tamamlandı</span>':'<span class="badge badge-amber">Bekliyor</span>'}
          <button class="btn btn-ghost btn-sm" onclick="belirliGunModalAc('${e.id}')">Düzenle</button>
        </div>
      </div>
      ${e.aciklama?`<div class="belge-kayit-not" style="margin-top:4px;">${escapeHtml(e.aciklama)}</div>`:''}
    </div>`).join('')}</div>`;
}

function renderYaklasanEtkinlikler(){
  const el = document.getElementById('dashYaklasanEtkinlikler');
  if(!el) return;
  const bugun = _isoToday();
  const yaklasan = belirliGunlerListesi
    .filter(e=>!e.tamamlandi && e.tarihBaslangic >= bugun)
    .sort((a,b)=>a.tarihBaslangic.localeCompare(b.tarihBaslangic))
    .slice(0,4);
  el.innerHTML = yaklasan.length
    ? yaklasan.map(e=>`<div class="dash-row">🎉 ${_trTarih(e.tarihBaslangic)} — ${escapeHtml(e.ad)}</div>`).join('')
    : '<p class="empty-state">Yaklaşan etkinlik yok.</p>';
}

/* ================================================================
   ÖĞRETMEN PROFİLİNDE BELGE DURUMU
   renderOgretmenBelgeDurumu(ogretmenId)
   → ogretmen-detay.js tarafından çağrılır
   ================================================================ */
function renderOgretmenBelgeDurumu(ogretmenId){
  const TIPLER = [
    { tip:'maarifRapor', etiket:'Maarif Raporları' },
    { tip:'bepPlani',    etiket:'Yıllık / BEP Planları' },
    { tip:'zumre',       etiket:'Zümre Toplantıları' },
    { tip:'sok',         etiket:'ŞÖK Kayıtları' },
    { tip:'rehberlik',   etiket:'Rehberlik' }
  ];

  const belirliGun = belirliGunlerListesi.filter(e=>
    e.ogretmenIdler && e.ogretmenIdler.includes(ogretmenId)
  );

  const sosyalKulup = cizelgeVerileri.sosyalKulupler.filter(k=>
    k.ogretmenIdler && k.ogretmenIdler.includes(ogretmenId)
  );

  let html = '';

  // Sosyal kulüpler
  if(sosyalKulup.length){
    html += `<div class="belge-grup-baslik">🎭 Sosyal Kulüpler</div>`;
    html += sosyalKulup.map(k=>`<div class="belge-kayit" style="margin-bottom:6px;">
      <div class="belge-kayit-baslik">
        <span class="belge-kayit-ozet">${escapeHtml(k.ad)}</span>
        <span class="badge badge-${k.aktif!==false?'sage':'gray'}">${k.aktif!==false?'Aktif':'Pasif'}</span>
      </div>
    </div>`).join('');
  }

  // Belirli gün ve haftalar
  if(belirliGun.length){
    html += `<div class="belge-grup-baslik">🎉 Belirli Gün Ve Haftalar</div>`;
    html += belirliGun.map(e=>`<div class="belge-kayit ${e.tamamlandi?'belge-tamam':''}" style="margin-bottom:6px;">
      <div class="belge-kayit-baslik">
        <div>
          <div class="belge-kayit-ozet">${escapeHtml(e.ad)}</div>
          <div class="belge-kayit-not">${_trTarih(e.tarihBaslangic)}</div>
        </div>
        ${e.tamamlandi?'<span class="badge badge-sage">✓</span>':'<span class="badge badge-amber">Bekliyor</span>'}
      </div>
    </div>`).join('');
  }

  // Diğer çizelge tipleri
  TIPLER.forEach(({tip, etiket})=>{
    const meta = CIZELGE_META[tip];
    const kayitlar = (cizelgeVerileri[tip]||[]).filter(k=>k.ogretmenId===ogretmenId);
    if(!kayitlar.length) return;

    const tamamSay = kayitlar.reduce((t,k)=> t + (k.kontroller||[]).filter(Boolean).length, 0);
    const toplamKontrol = kayitlar.length * meta.kontroller.length;
    const yuzde = toplamKontrol ? Math.round(tamamSay/toplamKontrol*100) : 0;

    html += `<div class="belge-grup-baslik">${etiket}
      <span class="belge-mini-sayac ${tamamSay===toplamKontrol&&toplamKontrol>0?'tamam':tamamSay>0?'kismi':''}"
        style="margin-left:8px;">${tamamSay}/${toplamKontrol}</span>
    </div>`;

    kayitlar.forEach(kayit=>{
      const kontroller = kayit.kontroller || [];
      const ozetAlanlar = meta.alanlar.filter(a=>a.key!=='ogretmenId'&&a.key!=='aciklama');
      const ozet = ozetAlanlar.map(a=>{
        let v = kayit[a.key]||'';
        if(a.tip==='ay') v = AYLAR_TR[parseInt(v)-1]||v;
        if(a.tip==='sinif_coklu') v = Array.isArray(v) ? v.join(', ') : v;
        return v?escapeHtml(String(v)):'';
      }).filter(Boolean).join(' · ');

      html += `<div class="belge-kayit" style="margin-bottom:8px;">
        <div class="belge-kayit-baslik">
          <div class="belge-kayit-ozet">${ozet||'(detay yok)'}</div>
        </div>
        <div class="belge-kontroller">
          ${meta.kontroller.map((kAdi,i)=>`
            <label class="belge-kontrol-item ${kontroller[i]?'tamamlandi':''}">
              <input type="checkbox" ${kontroller[i]?'checked':''}
                onchange="belgeKontrolToggle('${tip}','${kayit.id}',${i},this.checked)">
              <span>${escapeHtml(kAdi)}</span>
            </label>`).join('')}
        </div>
      </div>`;
    });
  });

  if(!html) html = '<p class="empty-state">Bu öğretmene ait belge kaydı yok.</p>';

  return html;
}

/* ================================================================
   ÖĞRETMEN DETAY PANELİNE BELGE SEKMESİ ENJEKSİYONU
   ogretmen-detay.js'in mevcut ogretmenDetayAc çağrısından sonra
   renderOgretmenBelgeDurumu(id) çıktısını panele ekler.
   ================================================================ */
(function(){
  // ogretmen-detay.js yüklenince orijinal ogretmenDetayAc'ı wrap eder
  const _bekle = setInterval(()=>{
    if(typeof ogretmenDetayAc !== 'function') return;
    clearInterval(_bekle);
    const _orijinal = ogretmenDetayAc;
    window.ogretmenDetayAc = function(id){
      _orijinal(id);
      // DOM güncellenince Belgeler bölümünü ekle
      setTimeout(()=>{
        const panel = document.getElementById('detayBody');
        if(!panel) return;
        // Zaten eklenmişse tekrar ekleme
        if(panel.querySelector('.belge-detay-bolum')) return;
        const bolum = document.createElement('div');
        bolum.className = 'belge-detay-bolum';
        bolum.style.cssText = 'margin-top:18px;padding-top:14px;border-top:1px solid var(--border);';
        bolum.innerHTML = `<h3 style="margin-bottom:12px;">📋 Belge Durumu</h3>`
          + (renderOgretmenBelgeDurumu(id)||'<p class="empty-state">Kayıt yok.</p>');
        panel.appendChild(bolum);
      }, 80);
    };
  }, 100);
})();
