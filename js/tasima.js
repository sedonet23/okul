/* ====================================================================
   js/tasima.js
   TAŞIMA MODÜLÜ — UI KATMANI — servis araçları, şoför adı/telefonu ve
   güzergah bilgilerinin takibi. Veri modeli (bkz. firebase-init.js COL):
     servisler : {servisAdi, guzergah, soforAdi, soforTelefon,
                  ogrenciSayisi, durum:'Aktif'|'Pasif', notlar}

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya)          → sadece DOM + TasimaService çağrısı, db bilmez
     js/core/services/tasima.service.js    → iş kuralı + yetki kontrolü
     js/core/repositories/tasima.repository.js → TEK Firestore erişim noktası
   ==================================================================== */

let servisler = [];
let servisFiltre = 'tumu';

function servisDurumRengi(d){ return d==='Pasif' ? 'gray' : 'sage'; }

/* ---------- liste ---------- */
function renderServisler(){
  const hedef = document.getElementById('servislerListesi');
  if(!hedef) return;
  let liste = servisFiltre==='tumu' ? servisler : servisler.filter(s=>s.durum===servisFiltre);
  liste = [...liste].sort((a,b)=>(a.servisAdi||'').localeCompare(b.servisAdi||'','tr'));

  hedef.innerHTML = liste.length ? liste.map(s=>`
    <div class="evrak-row" style="cursor:pointer;" onclick="servisDetayAc('${s.id}')">
      <div class="evrak-body">
        <div class="evrak-title">${escapeHtml(s.servisAdi||'Servis')} <span class="badge badge-${servisDurumRengi(s.durum)}">${escapeHtml(s.durum||'Aktif')}</span></div>
        <div class="evrak-meta">
          ${s.soforAdi ? 'Şoför: '+escapeHtml(s.soforAdi) : 'Şoför bilgisi yok'}${s.soforTelefon ? ' · '+escapeHtml(s.soforTelefon) : ''}${s.guzergah ? ' · '+escapeHtml(s.guzergah) : ''}${s.ogrenciSayisi ? ' · '+s.ogrenciSayisi+' öğrenci' : ''}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); servisModalAc('${s.id}')">Düzenle</button>
    </div>
  `).join('') : '<div class="empty-state">Henüz servis aracı eklenmedi. "+ Yeni Servis" ile ekleyin.</div>';
}

function servisFiltreSec(f){
  servisFiltre = f;
  document.querySelectorAll('#tab-tasima .filtre-btn').forEach(b=>b.classList.toggle('active', b.dataset.f===f));
  renderServisler();
}

/* ---------- servis detay paneli ---------- */
function servisDetayAc(id){
  const s = servisler.find(x=>x.id===id);
  if(!s) return;

  document.getElementById('detayBaslik').textContent = s.servisAdi || 'Servis';
  document.getElementById('detayAltBaslik').textContent = [
    s.guzergah ? ('Güzergah: ' + s.guzergah) : '',
    s.durum || 'Aktif'
  ].filter(Boolean).join(' · ');
  document.getElementById('detayDuzenleBtn').onclick = ()=>{ detayPanelKapat(); servisModalAc(id); };
  const _raporBtn = document.getElementById('detayRaporBtn');
  if (_raporBtn) {
    _raporBtn.onclick = () => {
      if (typeof TasimaTakipAc === 'function') {
        TasimaTakipAc(id);
      } else if (typeof TasimaTakip !== 'undefined' && TasimaTakip.ac) {
        TasimaTakip.ac(id);
      } else {
        alert('Takip Çizelgesi modülü yüklenemedi (js/tasima-takip.js eksik olabilir). Sayfayı yenileyip tekrar deneyin.');
      }
    };
  }

  const servisOgrencileri = ogrencileriSinifSiralaSirala(veliler.filter(v=>v.servisId===id));
  const baskanIdSeti = new Set(Array.isArray(s.baskanlar) ? s.baskanlar : []);

  const ogrenciListeHtml = servisOgrencileri.length
    ? servisOgrencileri.map(v=>{
        const sinifObj = siniflar.find(s=>s.id===v.sinifId);
        const sinifAdi = sinifObj ? sinifObj.ad : (v.sinifId||'—');
        const telefonlar = [v.telefon1||v.telefon, v.telefon2, v.telefon3].filter(Boolean).map(t=>telefonEtiketle(v,t)).join(' · ');
        const baskanMi = baskanIdSeti.has(v.id);
        return `
        <div class="detay-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <span>
            <strong>${baskanMi?'👑 ':''}${escapeHtml(v.ogrenciAdi)}</strong>
            ${v.ogrenciNo ? ` <span class="detay-row-muted">No: ${escapeHtml(v.ogrenciNo)}</span>` : ''}
            <span class="badge badge-blue">${escapeHtml(sinifAdi)}</span>
            ${v.cinsiyet ? ` <span class="badge badge-${v.cinsiyet==='Kız'?'rose':'blue'}">${escapeHtml(v.cinsiyet)}</span>` : ''}
            ${baskanMi ? ` <span class="badge badge-amber">Servis Başkanı</span>` : ''}
            <br>👤 ${escapeHtml(v.veliAdi||'—')}
            ${telefonlar ? `<br><span class="detay-row-muted">📞 ${telefonlar}</span>` : ''}
          </span>
        </div>`;
      }).join('')
    : '<p class="empty-state">Bu serviste kayıtlı öğrenci yok.</p>';

  document.getElementById('detayBody').innerHTML = `
    <div style="padding:14px 18px;">
      <div class="detay-card">
        <h4>🚌 Servis Bilgileri</h4>
        <div class="detay-row">👨‍✈️ Şoför: ${escapeHtml(s.soforAdi||'—')}${s.soforTelefon ? ' · 📞 ' + escapeHtml(s.soforTelefon) : ''}</div>
        ${s.plaka ? `<div class="detay-row">🚘 Plaka: <strong>${escapeHtml(s.plaka)}</strong></div>` : ''}
        <div class="detay-row">🗺️ Güzergah: ${escapeHtml(s.guzergah||'—')}</div>
        <div class="detay-row">Durum: <span class="badge badge-${servisDurumRengi(s.durum)}">${escapeHtml(s.durum||'Aktif')}</span></div>
        ${(()=>{
          const baskanIdleri = Array.isArray(s.baskanlar) ? s.baskanlar : [];
          if (!baskanIdleri.length) return '';
          const baskanAdlari = baskanIdleri
            .map(bid => veliler.find(v=>v.id===bid))
            .filter(Boolean)
            .map(v=>escapeHtml(v.ogrenciAdi||''));
          if (!baskanAdlari.length) return '';
          return `<div class="detay-row">👑 Servis Başkanı${baskanAdlari.length>1?'ları':''}: <strong>${baskanAdlari.join(', ')}</strong></div>`;
        })()}
        ${s.guzergahMesafe ? `<div class="detay-row">📏 Güzergah Mesafesi: <strong>${s.guzergahMesafe} km</strong>
          <button class="btn btn-ghost btn-sm" style="margin-left:8px;" onclick="detayPanelKapat(); haritaSekmesiAc(); setTimeout(()=>haritaGuzergahiYukle('${s.id}'),200)">🗺️ Haritada Gör</button>
        </div>` : `<div class="detay-row" style="color:var(--ink-muted);font-size:12px;">📏 Güzergah mesafesi henüz ölçülmedi.
          <button class="btn btn-ghost btn-sm" style="margin-left:8px;" onclick="detayPanelKapat(); haritaSekmesiAc(); setTimeout(()=>{ document.getElementById('haritaServisSec').value='${s.id}'; haritaServisSecildiRender('${s.id}'); },200)">🗺️ Ölç</button>
        </div>`}
        ${s.notlar ? `<div class="detay-row detay-row-muted">📝 ${escapeHtml(s.notlar)}</div>` : ''}
        <div class="detay-row" style="margin-top:8px;">
          <button class="btn-takip-cizelge" onclick="TasimaTakipAc('${s.id}')">📋 Aylık Takip Çizelgesi</button>
          <button class="btn-denetim-formu" onclick="ServisDenetimAc('${s.id}')">📄 Denetim Formu Yazdır</button>
        </div>
      </div>
      <div class="detay-card">
        <h4 class="detay-card-header">
          <span class="detay-card-title">🧑‍🎓 Servis Öğrenci Listesi (${servisOgrencileri.length})</span>
          <span class="detay-card-actions">
            <button class="btn btn-ghost btn-sm" onclick="servisOgrenciExcelIceAktarModalAc('${id}')">📥 Excel'den Ekle</button>
            <button class="btn btn-amber btn-sm" onclick="servisOgrenciEkleModalAc('${id}')">➕ Öğrenci Ekle</button>
            <button class="btn btn-ghost btn-sm" onclick="servisListeOlusturModalAc('${id}')">📋 Liste Oluştur</button>
          </span>
        </h4>
        ${ogrenciListeHtml}
      </div>
    </div>
  `;

  document.getElementById('detayOverlay').classList.add('active'); document.body.classList.add('modal-open');
  if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);
  if(typeof saltOkumaDetayUygula === 'function') saltOkumaDetayUygula('tasima');
}

/* ---------- servise öğrenci ekleme modalı ---------- */
function servisOgrenciEkleModalAc(servisId){
  const s = servisler.find(x=>x.id===servisId);
  if(!s) return;

  // Sınıf seçenekleri
  const sinifSecenekleri = siniflar
    .sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'))
    .map(sn=>`<option value="${sn.id}">${escapeHtml(sn.ad)}</option>`).join('');

  const body = `
    <p style="margin:0 0 10px;color:var(--ink-muted);font-size:13px;">
      Servise eklenecek öğrencileri seçin: <strong>${escapeHtml(s.servisAdi)}</strong>
    </p>
    <div class="form-group">
      <label>Sınıf Seçin</label>
      <select id="sv_sinifSec" onchange="servisOgrenciSinifSecildi('${servisId}')">
        <option value="">— Sınıf seçin —</option>
        ${sinifSecenekleri}
      </select>
    </div>
    <div id="sv_ogrenciListeDiv" style="max-height:320px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:4px;display:none;">
    </div>
    <div id="sv_seciliSayac" style="font-size:13px;color:var(--ink-muted);margin-top:6px;"></div>
  `;

  modalAc(`Öğrenci Ekle — ${escapeHtml(s.servisAdi)}`, body, ()=>{
    const sinifId = document.getElementById('sv_sinifSec').value;
    if(!sinifId){ toast('Lütfen sınıf seçin.'); return; }
    const checkboxlar = document.querySelectorAll('#sv_ogrenciListeDiv input[type=checkbox]:checked');
    if(!checkboxlar.length){ toast('En az bir öğrenci seçin.'); return; }

    const secilenIdler = Array.from(checkboxlar).map(cb=>cb.value);
    TasimaService.ogrencileriServiseAta(secilenIdler, servisId, s.servisAdi).then(()=>{
      toast(`${secilenIdler.length} öğrenci servise eklendi.`);
      modalKapat();
      servisDetayAc(servisId);
    }).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
  });
}

function servisOgrenciSinifSecildi(servisId){
  const sinifId = document.getElementById('sv_sinifSec').value;
  const div = document.getElementById('sv_ogrenciListeDiv');
  const sayac = document.getElementById('sv_seciliSayac');
  if(!sinifId){ div.style.display='none'; sayac.textContent=''; return; }

  const sinifOgrencileri = veliler
    .filter(v=>v.sinifId===sinifId)
    .sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));

  if(!sinifOgrencileri.length){
    div.innerHTML='<p class="empty-state" style="padding:12px;">Bu sınıfta kayıtlı öğrenci yok.</p>';
    div.style.display='block';
    return;
  }

  div.innerHTML = sinifOgrencileri.map(v=>{
    const zatenServiste = v.servisId === servisId;
    const baskaSehirde = v.servisId && v.servisId !== servisId;
    const etiketi = zatenServiste
      ? ` <span class="badge badge-sage">Bu serviste</span>`
      : baskaSehirde
        ? ` <span class="badge badge-amber">Başka serviste: ${escapeHtml(v.servisAdi||'')}</span>`
        : '';
    return `
      <label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--border);cursor:pointer;${zatenServiste?'opacity:0.5;':''}">
        <input type="checkbox" value="${v.id}" ${zatenServiste?'disabled checked':''} onchange="servisOgrenciSecimGuncelle()">
        <span>
          <strong>${escapeHtml(v.ogrenciAdi)}</strong>
          ${v.ogrenciNo ? `<span class="detay-row-muted"> No:${escapeHtml(v.ogrenciNo)}</span>` : ''}
          ${etiketi}
        </span>
      </label>`;
  }).join('');
  div.style.display = 'block';
  servisOgrenciSecimGuncelle();
}

function servisOgrenciSecimGuncelle(){
  const sayac = document.getElementById('sv_seciliSayac');
  if(!sayac) return;
  const secili = document.querySelectorAll('#sv_ogrenciListeDiv input[type=checkbox]:not(:disabled):checked').length;
  sayac.textContent = secili ? `${secili} öğrenci seçildi` : '';
}

/* ---------- Excel'den servise öğrenci aktarma modalı ---------- */
function servisOgrenciExcelIceAktarModalAc(servisId){
  const s = servisler.find(x=>x.id===servisId);
  if(!s) return;
  const body = `
    <p style="margin:0 0 10px;color:var(--ink-muted);font-size:13px;">
      Excel dosyasından <strong>${escapeHtml(s.servisAdi)}</strong> servisine öğrenci ekler.
    </p>
    <div class="form-group">
      <label>Excel Dosyası (.xlsx / .xls)</label>
      <input type="file" id="sv_excelDosya" accept=".xlsx,.xls">
    </div>
    <p style="font-size:12px;color:var(--ink-muted);margin:8px 0 0;">
      Şablon sütunları: <strong>Öğrenci Adı · Öğrenci No · Cinsiyet · Veli Adı · Yakınlık · Telefon 1 · Telefon 2 · Telefon 3 · Adres · Sınıf · Notlar</strong><br>
      Sınıf sütunundaki değer, mevcut sınıf adlarıyla eşleştirilir.
    </p>
  `;
  modalAc(`Excel'den Öğrenci Ekle — ${escapeHtml(s.servisAdi)}`, body, ()=>{
    const dosya = document.getElementById('sv_excelDosya').files[0];
    if(!dosya){ toast('Lütfen Excel dosyası seçin.'); return; }
    servisOgrenciExceliIceAktar(dosya, servisId, s.servisAdi);
    modalKapat();
    setTimeout(()=>servisDetayAc(servisId), 1500);
  });
}

/* ---------- modal ---------- */
function servisModalAc(id){
  const s = id ? servisler.find(x=>x.id===id) : null;

  // Servisteki öğrenciler (Servis Başkanı seçimi için) — sadece düzenleme modunda, servis zaten kayıtlıysa
  const servisOgrencileri = s ? ogrencileriSinifSiralaSirala(veliler.filter(v=>v.servisId===s.id)) : [];
  const baskanlar = (s && Array.isArray(s.baskanlar)) ? s.baskanlar : [];
  const baskanHtml = servisOgrencileri.length
    ? `<div id="f_svBaskanListesi" style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:4px;">
        ${servisOgrencileri.map(v=>{
          const sn = siniflar.find(x=>x.id===v.sinifId);
          return `<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid var(--border);cursor:pointer;">
            <input type="checkbox" value="${v.id}" ${baskanlar.includes(v.id)?'checked':''}>
            <span>${escapeHtml(v.ogrenciAdi||'')}${sn?' — '+escapeHtml(sn.ad):''}</span>
          </label>`;
        }).join('')}
      </div>`
    : `<p class="empty-state" style="padding:8px 0;font-size:12px;">${s ? 'Bu serviste henüz kayıtlı öğrenci yok.' : 'Servis başkanı seçimi, servis kaydedildikten ve öğrenciler eklendikten sonra yapılabilir.'}</p>`;

  const body = `
    <div class="form-group"><label>Servis Adı</label><input id="f_svAd" value="${s?escapeHtml(s.servisAdi||''):''}" placeholder="örn: 1. Servis — Mavi Güzergah"></div>
    <div class="form-group"><label>Güzergah</label><input id="f_svGuzergah" value="${s?escapeHtml(s.guzergah||''):''}" placeholder="örn: Merkez · Yeşilköy · Okul"></div>
    <div class="form-row">
      <div class="form-group"><label>Şoför Adı</label><input id="f_svSofor" value="${s?escapeHtml(s.soforAdi||''):''}"></div>
      <div class="form-group"><label>Şoför Telefonu</label><input id="f_svTel" value="${s?escapeHtml(s.soforTelefon||''):''}" placeholder="örn: 0532 000 00 00"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Plaka</label><input id="f_svPlaka" value="${s?escapeHtml(s.plaka||''):''}" placeholder="örn: 34 ABC 123" style="text-transform:uppercase;"></div>
      <div class="form-group"><label>Durum</label>
        <select id="f_svDurum">
          <option value="Aktif" ${!s||s.durum==='Aktif'?'selected':''}>Aktif</option>
          <option value="Pasif" ${s&&s.durum==='Pasif'?'selected':''}>Pasif</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>Öğrenci Sayısı</label><input id="f_svOgrenci" type="number" min="0" value="${s&&s.ogrenciSayisi!=null?s.ogrenciSayisi:0}"></div>
    <div class="form-group">
      <label>👑 Servis Başkanı / Başkanları</label>
      ${baskanHtml}
    </div>
    <div class="form-group"><label>Notlar</label><textarea id="f_svNotlar" rows="2">${s?escapeHtml(s.notlar||''):''}</textarea></div>
  `;
  modalAc(s?'Servis Düzenle':'Yeni Servis', body, ()=>{
    const servisAdi = document.getElementById('f_svAd').value.trim();
    if(!servisAdi){ toast('Servis adı zorunludur.'); return; }
    const baskanCheckboxlar = document.querySelectorAll('#f_svBaskanListesi input[type=checkbox]:checked');
    const seciliBaskanlar = Array.from(baskanCheckboxlar).map(cb=>cb.value);
    TasimaService.servisKaydet(s?s.id:null, {
      servisAdi,
      guzergah: document.getElementById('f_svGuzergah').value.trim(),
      soforAdi: document.getElementById('f_svSofor').value.trim(),
      soforTelefon: document.getElementById('f_svTel').value.trim(),
      plaka: document.getElementById('f_svPlaka').value.trim().toUpperCase(),
      ogrenciSayisi: parseInt(document.getElementById('f_svOgrenci').value)||0,
      durum: document.getElementById('f_svDurum').value,
      baskanlar: seciliBaskanlar,
      notlar: document.getElementById('f_svNotlar').value.trim(),
    }).then(()=>toast('Kaydedildi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  }, s ? ()=>{ if(confirm('Bu servis kaydını silmek istediğinize emin misiniz?')){ TasimaService.servisSil(s.id).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }); modalKapat(); } } : null);
}

/* ---------- FIRESTORE BAĞLANTISI (app.js baglantilariKur içinden çağrılır) ----------
   Artık doğrudan db.collection() çağrılmıyor — TasimaRepository üzerinden dinleniyor. */
function tasimaBaglantilariKur(){
  TasimaRepository.servisleriDinle(s=>{
    servisler = s;
    renderServisler();
    renderVeriSekmesi();
    if(typeof renderHaritaServisler === 'function') renderHaritaServisler();
    if(typeof globalAramaYap === 'function') globalAramaYap();
    if(typeof onbellekKaydet === 'function') onbellekKaydet();
  });
}

/* ================================================================
   SERVİS LİSTE OLUŞTUR
   ================================================================ */

const SERVIS_LISTE_SUTUNLAR = [
  { key: 'siraNo',     label: 'Sıra No',    fn: (v, i) => String(i + 1) },
  { key: 'ogrenciAdi', label: 'Ad Soyad',   fn: v => v.ogrenciAdi || '' },
  { key: 'ogrenciNo',  label: 'Öğrenci No', fn: v => v.ogrenciNo  || '' },
  { key: 'sinif',      label: 'Sınıf',      fn: v => { const sn = siniflar.find(s=>s.id===v.sinifId); return sn ? sn.ad : (v.sinifId||''); } },
  { key: 'cinsiyet',   label: 'Cinsiyet',   fn: v => v.cinsiyet   || '' },
  { key: 'baskan',     label: 'Servis Başkanı', fn: (v, i, servis) => (servis && Array.isArray(servis.baskanlar) && servis.baskanlar.includes(v.id)) ? '👑 Evet' : '' },
  { key: 'veliAdi',    label: 'Veli Adı',   fn: v => v.veliAdi    || '' },
  { key: 'yakinlik',   label: 'Yakınlık',   fn: v => v.yakinlik1 || v.yakinlik || '' },
  { key: 'telefon1',   label: 'Telefon 1',  fn: v => v.telefon1 || v.telefon || '' },
  { key: 'telefon2',   label: 'Telefon 2',  fn: v => v.telefon2   || '' },
  { key: 'adres',      label: 'Adres',      fn: v => v.adres      || '' },
  { key: 'notlar',     label: 'Notlar',     fn: v => v.notlar     || '' },
];

function servisListeOlusturModalAc(servisId) {
  const s = servisler.find(x => x.id === servisId);
  if (!s) return;

  const _okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) ? okulBilgileriAyari.okulAdi : '';
  const _yil = (() => { const y = new Date().getFullYear(); return `${y}-${y+1}`; })();
  const inputStil = 'width:100%;padding:5px 9px;border:1px solid var(--border);border-radius:6px;font-size:13px;';
  const bolum = (lbl) => `<div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">${lbl}</div>`;

  const checkboxler = SERVIS_LISTE_SUTUNLAR.map(col => `
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:3px 0;">
      <input type="checkbox" value="${col.key}" checked style="cursor:pointer;width:15px;height:15px;">
      <span>${escapeHtml(col.label)}</span>
    </label>`).join('');

  const body = `
    ${bolum('Sayfa Yönü')}
    <div style="display:flex;gap:16px;">
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;">
        <input type="radio" name="svListeYon" value="portrait" checked> Dikey (A4)
      </label>
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;">
        <input type="radio" name="svListeYon" value="landscape"> Yatay (A4)
      </label>
    </div>

    ${bolum('Başlık Bilgileri')}
    <div style="display:grid;gap:7px;">
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="sv_lb_okulAdi" placeholder="Okul Adı" value="${escapeHtml(_okulAdi)}" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="sv_lb_okulAdiGoster" checked> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="sv_lb_baslik" placeholder="Liste Başlığı" value="${escapeHtml(s.servisAdi||'Servis')} Öğrenci Listesi" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="sv_lb_baslikGoster" checked> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="sv_lb_altBaslik" placeholder="Alt Başlık (isteğe bağlı)" value="${s.guzergah ? escapeHtml(s.guzergah) : ''}" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="sv_lb_altBaslikGoster" ${s.guzergah?'checked':''}> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="sv_lb_egitimYili" placeholder="Eğitim-Öğretim Yılı" value="${escapeHtml(_yil)}" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="sv_lb_egitimYiliGoster" checked> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="sv_lb_tarih" placeholder="Tarih" value="${new Date().toLocaleDateString('tr-TR')}" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="sv_lb_tarihGoster" checked> Göster</label>
      </div>
    </div>

    ${bolum('İmza / Onay Satırı')}
    <div style="display:grid;gap:7px;">
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="sv_lb_sofor" placeholder="Şoför Adı" value="${escapeHtml(s.soforAdi||'')}" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="sv_lb_soforGoster" checked> Göster</label>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
        <input id="sv_lb_mudur" placeholder="Müdür / Onay Kişisi Adı" value="" style="${inputStil}">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;"><input type="checkbox" id="sv_lb_mudurGoster" checked> Göster</label>
      </div>
    </div>

    ${bolum('Sütunları Seç')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;padding:10px;background:var(--nm-bg,#f0f0f3);border-radius:8px;">
      ${checkboxler}
    </div>

    ${bolum('Özel Sütun Ekle (Boş)')}
    <div id="sv_ozelSutunListesi" style="display:flex;flex-direction:column;gap:6px;"></div>
    <button class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="servisListeOzelSutunEkle()">+ Özel Sütun Ekle</button>
  `;

  modalAc(`📋 Liste Oluştur — ${escapeHtml(s.servisAdi||'Servis')}`, body, () => {
    servisListesiYazdir(servisId);
  }, null, '🖨️ Listeyi Yazdır');
}

function servisListeOzelSutunEkle() {
  const kap = document.getElementById('sv_ozelSutunListesi');
  if (!kap) return;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:6px;align-items:center;';
  div.innerHTML = `
    <input class="sv-ozel-sutun-input" type="text" placeholder="Sütun adı (örn: İniş Durağı)"
      style="flex:1;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px;">
    <button class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="this.parentElement.remove()">✕</button>
  `;
  kap.appendChild(div);
}

function servisListesiYazdir(servisId) {
  const s = servisler.find(x => x.id === servisId);
  if (!s) return;

  const seciliKeyler = [...document.querySelectorAll('#modalBody input[type=checkbox]')]
    .filter(el => el.checked && !el.id.startsWith('sv_lb_'))
    .map(el => el.value);
  const seciliSutunlar = SERVIS_LISTE_SUTUNLAR.filter(c => seciliKeyler.includes(c.key));

  const ozelSutunlar = [...document.querySelectorAll('.sv-ozel-sutun-input')]
    .map(el => el.value.trim()).filter(Boolean)
    .map(label => ({ key: '_ozel_' + label, label, fn: () => '' }));

  const tumSutunlar = [...seciliSutunlar, ...ozelSutunlar];
  if (!tumSutunlar.length) { toast('En az bir sütun seçin.'); return; }

  const g = id => document.getElementById(id);
  const gv = id => g(id)?.value?.trim() || '';
  const gc = id => g(id)?.checked ?? false;

  const yon        = document.querySelector('input[name="svListeYon"]:checked')?.value || 'portrait';
  const okulAdi    = gv('sv_lb_okulAdi');
  const baslik     = gv('sv_lb_baslik') || `${s.servisAdi||'Servis'} Öğrenci Listesi`;
  const altBaslik  = gv('sv_lb_altBaslik');
  const egitimYili = gv('sv_lb_egitimYili');
  const tarih      = gv('sv_lb_tarih') || new Date().toLocaleDateString('tr-TR');
  const sofor      = gv('sv_lb_sofor');
  const mudur      = gv('sv_lb_mudur');

  const gosterOkul     = gc('sv_lb_okulAdiGoster');
  const gosterBaslik   = gc('sv_lb_baslikGoster');
  const gosterAlt      = gc('sv_lb_altBaslikGoster');
  const gosterYil      = gc('sv_lb_egitimYiliGoster');
  const gosterTarih    = gc('sv_lb_tarihGoster');
  const gosterSofor    = gc('sv_lb_soforGoster');
  const gosterMudur    = gc('sv_lb_mudurGoster');

  const ogrenciler = ogrencileriSinifSiralaSirala(veliler.filter(v => v.servisId === servisId));

  const thHTML = tumSutunlar.map(c => `<th>${escapeHtml(c.label)}</th>`).join('');
  const trHTML = ogrenciler.map((v, i) =>
    `<tr>${tumSutunlar.map(c => `<td>${escapeHtml(c.fn(v, i, s))}</td>`).join('')}</tr>`
  ).join('');

  const metaParcalar = [];
  if (gosterYil && egitimYili) metaParcalar.push(escapeHtml(egitimYili) + ' Eğitim-Öğretim Yılı');
  if (gosterTarih && tarih) metaParcalar.push(escapeHtml(tarih));

  const imzaSol = gosterSofor
    ? `Şoför: ${sofor ? `<strong>${escapeHtml(sofor)}</strong>` : '...............................'}<br><br>İmza: .......................`
    : '';
  const imzaSag = gosterMudur
    ? `Müdür: ${mudur ? `<strong>${escapeHtml(mudur)}</strong>` : '...............................'}<br><br>İmza: .......................`
    : '';

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(baslik)}</title>
<style>
  @page { size: A4 ${yon}; margin: 1.2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; }
  .header { text-align: center; margin-bottom: 14px; border-bottom: 2px solid #333; padding-bottom: 10px; }
  .header .okul { font-size: 15px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; }
  .header .baslik { font-size: 13px; font-weight: 600; margin-top: 5px; }
  .header .alt-baslik { font-size: 11px; margin-top: 3px; color: #444; }
  .header .meta { font-size: 10px; color: #666; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background: #333; color: #fff; padding: 5px 6px; text-align: left; font-size: 10px; font-weight: 600; white-space: nowrap; }
  td { padding: 4px 6px; border-bottom: 1px solid #ddd; vertical-align: top; }
  tr:nth-child(even) td { background: #f7f7f7; }
  tr:last-child td { border-bottom: 2px solid #333; }
  .ogrenci-sayisi { margin-top: 8px; font-size: 10px; color: #444; text-align: right; }
  .footer { margin-top: 16px; display: flex; justify-content: space-between; font-size: 10px; color: #444; line-height: 1.8; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    ${gosterOkul && okulAdi ? `<div class="okul">${escapeHtml(okulAdi)}</div>` : ''}
    ${gosterBaslik ? `<div class="baslik">${escapeHtml(baslik)}</div>` : ''}
    ${gosterAlt && altBaslik ? `<div class="alt-baslik">${escapeHtml(altBaslik)}</div>` : ''}
    ${metaParcalar.length ? `<div class="meta">${metaParcalar.join(' &nbsp;·&nbsp; ')}</div>` : ''}
  </div>
  <table>
    <thead><tr>${thHTML}</tr></thead>
    <tbody>${trHTML}</tbody>
  </table>
  <div class="ogrenci-sayisi">Toplam öğrenci sayısı: <strong>${ogrenciler.length}</strong></div>
  ${(imzaSol || imzaSag) ? `<div class="footer"><div>${imzaSol}</div><div style="text-align:right;">${imzaSag}</div></div>` : ''}
</body>
</html>`;

  modalKapat();
  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.focus(); w.print(); };
}
