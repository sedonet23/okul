/* ================================================================
   js/odev-not-cizelgeleri.js
   ÖDEV TAKİP ÇİZELGESİ + NOT ÇİZELGESİ (UI katmanı)

   İki özellik de aynı iskeleti paylaşır (tip: 'odevTakip' | 'notCizelgesi'):
   - Sınıf seçilince öğrenci listesi otomatik gelir (veliler'den), öğretmen
     elle öğrenci ekleyip çıkarabilir.
   - Sütun sayısı sınırsız; her sütun bir başlık + opsiyonel tarih taşır.
   - Ödev Takip hücresi: boş → ✓ (yaptı) → ✗ (yapmadı) → boş (tıkla-döngü)
   - Not Çizelgesi hücresi: çizelge oluşturulurken seçilen moda göre
     ya artı/eksi (boş → + → − → boş) ya da sayısal puan (inline input)
   - Görünürlük: sadece oluşturan öğretmen + admin (bkz. service katmanı)

   Veri katmanı: OdevNotCizelgeleriRepository / OdevNotCizelgeleriService
   (bkz. js/core/repositories, js/core/services)
   ================================================================ */

let odevTakipListesi = [];
let notCizelgesiListesi = [];

const ONC_BASLIK = { odevTakip: 'Ödev Takip Çizelgesi', notCizelgesi: 'Not Çizelgesi' };

function _oncListesi(tip){ return tip === 'odevTakip' ? odevTakipListesi : notCizelgesiListesi; }
function _oncSinifAdi(sinifId){
  const sn = (typeof siniflar !== 'undefined' ? siniflar : []).find(s => s.id === sinifId);
  return sn ? `${sn.ad}${sn.sube ? '-' + sn.sube : ''}` : '—';
}

/* ---------------------------------------------------------------
   LİSTE GÖRÜNÜMÜ — kart grid + "Yeni Çizelge" butonu
   --------------------------------------------------------------- */
function renderOncListesi(tip){
  const el = document.getElementById(tip === 'odevTakip' ? 'odevTakipListesi' : 'notCizelgesiListesi');
  if(!el) return;
  const kayitlar = _oncListesi(tip);

  const kartlar = kayitlar.map(k => `
    <div class="card onc-kart" style="padding:14px;display:flex;flex-direction:column;gap:8px;">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
        <div>
          <div style="font-weight:700;font-size:15px;">${escapeHtml(k.ad || '(isimsiz)')}</div>
          <div style="font-size:12px;opacity:.7;">${escapeHtml(_oncSinifAdi(k.sinifId))} · ${(k.ogrenciler||[]).length} öğrenci · ${(k.sutunlar||[]).length} sütun</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="oncSil('${tip}','${k.id}')" title="Sil">🗑️</button>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary btn-sm" style="flex:1;" onclick="oncDetayAc('${tip}','${k.id}')">Aç</button>
        <button class="btn btn-ghost btn-sm" onclick="oncPdfIndir('${tip}','${k.id}')">🖨️ PDF</button>
      </div>
    </div>
  `).join('');

  el.innerHTML = `
    <div style="margin-bottom:14px;">
      <button class="btn btn-primary" onclick="oncYeniModalAc('${tip}')">+ Yeni ${escapeHtml(ONC_BASLIK[tip])}</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;">
      ${kartlar || `<div style="opacity:.6;padding:20px;">Henüz bir ${escapeHtml(ONC_BASLIK[tip])} oluşturmadınız.</div>`}
    </div>
  `;
}

/* ---------------------------------------------------------------
   YENİ ÇİZELGE MODALI
   --------------------------------------------------------------- */
function oncYeniModalAc(tip){
  const eski = document.getElementById('oncModal'); if(eski) eski.remove();
  const sinifOpsiyon = (typeof siniflar !== 'undefined' ? siniflar : [])
    .map(s => `<option value="${s.id}">${escapeHtml(s.ad)}${s.sube ? '-' + escapeHtml(s.sube) : ''}</option>`).join('');

  const hucreModuAlani = tip === 'notCizelgesi' ? `
    <label style="display:block;margin-top:10px;font-size:13px;font-weight:600;">Hücre Modu</label>
    <select id="oncHucreModu" class="input">
      <option value="artiEksi">Artı / Eksi (+/-)</option>
      <option value="puan">Sayısal Puan</option>
    </select>
    <div style="font-size:12px;opacity:.7;margin-top:4px;">Bu seçim çizelge oluşturulduktan sonra değiştirilemez.</div>
  ` : '';

  const modal = document.createElement('div');
  modal.id = 'oncModal';
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div class="card" style="width:100%;max-width:420px;margin:16px;padding:20px;">
      <div style="font-weight:700;font-size:16px;margin-bottom:14px;">Yeni ${escapeHtml(ONC_BASLIK[tip])}</div>
      <label style="display:block;font-size:13px;font-weight:600;">Çizelge Adı</label>
      <input id="oncAd" class="input" placeholder="Örn: 7-A Türkçe Ödevleri" />
      <label style="display:block;margin-top:10px;font-size:13px;font-weight:600;">Sınıf</label>
      <select id="oncSinif" class="input"><option value="">— Seçiniz —</option>${sinifOpsiyon}</select>
      ${hucreModuAlani}
      <div style="display:flex;gap:8px;margin-top:18px;">
        <button class="btn btn-ghost" style="flex:1;" onclick="document.getElementById('oncModal').remove()">Vazgeç</button>
        <button class="btn btn-primary" style="flex:1;" onclick="oncOlustur('${tip}')">Oluştur</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function oncOlustur(tip){
  const ad = (document.getElementById('oncAd').value || '').trim();
  const sinifId = document.getElementById('oncSinif').value;
  if(!ad){ toast('Çizelgeye bir isim verin.'); return; }
  if(!sinifId){ toast('Bir sınıf seçin.'); return; }

  // Sınıf listesinden öğrencileri otomatik çek (veliler → ogrenciAdi, sinifId eşleşenler)
  const otomatikOgrenciler = (typeof veliler !== 'undefined' ? veliler : [])
    .filter(v => v.sinifId === sinifId)
    .map(v => ({ id: 'o_' + v.id, ad: v.ogrenciAdi || '(isimsiz)' }));

  const veri = { ad, sinifId, ogrenciler: otomatikOgrenciler, sutunlar: [] };
  if(tip === 'notCizelgesi'){
    veri.hucreModu = document.getElementById('oncHucreModu').value || 'artiEksi';
  }

  try{
    const ref = await OdevNotCizelgeleriService.cizelgeOlustur(tip, veri);
    document.getElementById('oncModal').remove();
    toast('Çizelge oluşturuldu.');
    oncDetayAc(tip, ref.id);
  }catch(e){
    console.error(e);
  }
}

function oncSil(tip, id){
  const kayit = _oncListesi(tip).find(k => k.id === id);
  if(!kayit) return;
  uygulamaOnayAl(`"${kayit.ad}" çizelgesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`).then(onay => {
    if(!onay) return;
    OdevNotCizelgeleriService.cizelgeSil(tip, kayit).then(() => toast('Silindi.'));
  });
}

/* ---------------------------------------------------------------
   DETAY (TABLO) GÖRÜNÜMÜ
   --------------------------------------------------------------- */
let _oncAcikTip = null;
let _oncAcikId = null;

function oncDetayAc(tip, id){
  _oncAcikTip = tip; _oncAcikId = id;
  const overlayEski = document.getElementById('oncDetayOverlay'); if(overlayEski) overlayEski.remove();

  const ov = document.createElement('div');
  ov.id = 'oncDetayOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9998;background:var(--bg,#f4f5f7);display:flex;flex-direction:column;';
  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:linear-gradient(135deg,#1b5e20,#2e7d32);color:#fff;padding:10px 14px;flex-wrap:wrap;">
      <span id="oncDetayBaslik" style="font-weight:700;font-size:14px;"></span>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" style="color:#fff;" onclick="oncSutunEkleModalAc()">+ Sütun</button>
        <button class="btn btn-ghost btn-sm" style="color:#fff;" onclick="oncOgrenciEkleModalAc()">+ Öğrenci</button>
        <button class="btn btn-ghost btn-sm" style="color:#fff;" onclick="oncPdfIndir('${tip}','${id}')">🖨️ PDF</button>
        <button class="btn btn-ghost btn-sm" style="color:#fff;" onclick="oncDetayKapat()">✕ Kapat</button>
      </div>
    </div>
    <div style="flex:1;overflow:auto;padding:14px;">
      <div id="oncDetayTablo"></div>
    </div>
  `;
  document.body.appendChild(ov);
  _oncDetayRender();
}

function oncDetayKapat(){
  const ov = document.getElementById('oncDetayOverlay'); if(ov) ov.remove();
  _oncAcikTip = null; _oncAcikId = null;
}

function _oncGecerliKayit(){
  if(!_oncAcikTip || !_oncAcikId) return null;
  return _oncListesi(_oncAcikTip).find(k => k.id === _oncAcikId) || null;
}

/** Firestore onSnapshot her güncellemede bunu çağırır — açık detay ekranı canlı güncellensin diye. */
function oncDetayCanliGuncelle(){
  if(document.getElementById('oncDetayOverlay')) _oncDetayRender();
}

function _oncDetayRender(){
  const kayit = _oncGecerliKayit();
  const baslikEl = document.getElementById('oncDetayBaslik');
  const tabloEl = document.getElementById('oncDetayTablo');
  if(!kayit || !tabloEl) return;
  if(baslikEl) baslikEl.textContent = `${ONC_BASLIK[_oncAcikTip]} — ${kayit.ad}`;
  tabloEl.innerHTML = _oncTabloHtmlUret(_oncAcikTip, kayit, true);
}

/**
 * Tabloyu üretir. etkilesimliMi=true ise hücreler tıklanabilir (canlı ekran);
 * false ise sadece görüntü (PDF export için statik HTML).
 */
function _oncTabloHtmlUret(tip, kayit, etkilesimliMi){
  const sutunlar = kayit.sutunlar || [];
  const ogrenciler = kayit.ogrenciler || [];
  const hucreler = kayit.hucreler || {};
  const hucreModu = kayit.hucreModu || 'artiEksi';

  function hucreGoster(ogrenciId, sutunId){
    const anahtar = ogrenciId + '_' + sutunId;
    const deger = hucreler[anahtar];
    if(tip === 'odevTakip'){
      const sembol = deger === 'yapti' ? '✓' : (deger === 'yapmadi' ? '✗' : '');
      const renk = deger === 'yapti' ? '#2e7d32' : (deger === 'yapmadi' ? '#c62828' : '#999');
      const tikla = etkilesimliMi ? `onclick="oncHucreTikla('${ogrenciId}','${sutunId}')"` : '';
      return `<td ${tikla} style="text-align:center;cursor:${etkilesimliMi ? 'pointer' : 'default'};color:${renk};font-weight:700;font-size:16px;min-width:44px;">${sembol}</td>`;
    }
    // notCizelgesi
    if(hucreModu === 'puan'){
      if(etkilesimliMi){
        return `<td style="text-align:center;min-width:56px;"><input type="number" value="${deger !== undefined && deger !== null ? deger : ''}" style="width:48px;text-align:center;border:1px solid #ccc;border-radius:6px;padding:3px;" onchange="oncPuanGirildi('${ogrenciId}','${sutunId}', this.value)" /></td>`;
      }
      return `<td style="text-align:center;min-width:44px;">${deger !== undefined && deger !== null ? deger : ''}</td>`;
    }
    // artiEksi
    const sembol = deger === 'arti' ? '+' : (deger === 'eksi' ? '−' : '');
    const renk = deger === 'arti' ? '#2e7d32' : (deger === 'eksi' ? '#c62828' : '#999');
    const tikla = etkilesimliMi ? `onclick="oncHucreTikla('${ogrenciId}','${sutunId}')"` : '';
    return `<td ${tikla} style="text-align:center;cursor:${etkilesimliMi ? 'pointer' : 'default'};color:${renk};font-weight:700;font-size:16px;min-width:44px;">${sembol}</td>`;
  }

  function toplamGoster(ogrenciId){
    if(tip === 'odevTakip'){
      const yapti = sutunlar.filter(s => hucreler[ogrenciId + '_' + s.id] === 'yapti').length;
      return `${yapti}/${sutunlar.length}`;
    }
    if(hucreModu === 'puan'){
      const degerler = sutunlar.map(s => hucreler[ogrenciId + '_' + s.id]).filter(v => v !== undefined && v !== null && v !== '').map(Number);
      if(!degerler.length) return '—';
      const ort = degerler.reduce((a, b) => a + b, 0) / degerler.length;
      return ort.toFixed(1);
    }
    const arti = sutunlar.filter(s => hucreler[ogrenciId + '_' + s.id] === 'arti').length;
    const eksi = sutunlar.filter(s => hucreler[ogrenciId + '_' + s.id] === 'eksi').length;
    return `+${arti} / −${eksi}`;
  }

  const sutunBaslikHtml = sutunlar.map(s => `
    <th style="min-width:70px;padding:6px 4px;font-size:12px;">
      ${escapeHtml(s.baslik)}${s.tarih ? `<div style="font-weight:400;opacity:.7;font-size:10.5px;">${_trTarih(s.tarih)}</div>` : ''}
      ${etkilesimliMi ? `<div><button onclick="oncSutunSil('${s.id}')" style="border:none;background:none;color:#c62828;font-size:11px;cursor:pointer;">sil</button></div>` : ''}
    </th>
  `).join('');

  const satirlarHtml = ogrenciler.map(o => `
    <tr>
      <td style="padding:6px 8px;font-size:13px;white-space:nowrap;">
        ${escapeHtml(o.ad)}
        ${etkilesimliMi ? `<button onclick="oncOgrenciSil('${o.id}')" style="border:none;background:none;color:#c62828;font-size:11px;cursor:pointer;margin-left:6px;">sil</button>` : ''}
      </td>
      ${sutunlar.map(s => hucreGoster(o.id, s.id)).join('')}
      <td style="text-align:center;font-weight:700;font-size:12px;">${toplamGoster(o.id)}</td>
    </tr>
  `).join('');

  return `
    <table style="border-collapse:collapse;width:100%;background:#fff;">
      <thead>
        <tr style="border-bottom:2px solid #ddd;">
          <th style="text-align:left;padding:6px 8px;">Öğrenci</th>
          ${sutunBaslikHtml}
          <th style="min-width:70px;">Toplam</th>
        </tr>
      </thead>
      <tbody>${satirlarHtml}</tbody>
    </table>
  `;
}

function oncHucreTikla(ogrenciId, sutunId){
  const kayit = _oncGecerliKayit(); if(!kayit) return;
  const anahtar = ogrenciId + '_' + sutunId;
  const mevcut = (kayit.hucreler || {})[anahtar];
  let sonraki;
  if(_oncAcikTip === 'odevTakip'){
    sonraki = mevcut === 'yapti' ? 'yapmadi' : (mevcut === 'yapmadi' ? null : 'yapti');
  } else {
    sonraki = mevcut === 'arti' ? 'eksi' : (mevcut === 'eksi' ? null : 'arti');
  }
  OdevNotCizelgeleriService.hucreGuncelle(_oncAcikTip, kayit, ogrenciId, sutunId, sonraki);
}

function oncPuanGirildi(ogrenciId, sutunId, deger){
  const kayit = _oncGecerliKayit(); if(!kayit) return;
  const sayi = deger === '' ? null : Number(deger);
  OdevNotCizelgeleriService.hucreGuncelle(_oncAcikTip, kayit, ogrenciId, sutunId, sayi);
}

/* ---------------------------------------------------------------
   SÜTUN / ÖĞRENCİ EKLEME MODALLARI
   --------------------------------------------------------------- */
function oncSutunEkleModalAc(){
  const eski = document.getElementById('oncMiniModal'); if(eski) eski.remove();
  const modal = document.createElement('div');
  modal.id = 'oncMiniModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div class="card" style="width:100%;max-width:360px;margin:16px;padding:18px;">
      <div style="font-weight:700;margin-bottom:10px;">Yeni Sütun</div>
      <label style="display:block;font-size:13px;font-weight:600;">Başlık</label>
      <input id="oncSutunBaslik" class="input" placeholder="Örn: 1. Ünite Testi" />
      <label style="display:block;margin-top:8px;font-size:13px;font-weight:600;">Tarih (opsiyonel)</label>
      <input id="oncSutunTarih" type="date" class="input" />
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-ghost" style="flex:1;" onclick="document.getElementById('oncMiniModal').remove()">Vazgeç</button>
        <button class="btn btn-primary" style="flex:1;" onclick="oncSutunEkleOnayla()">Ekle</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
function oncSutunEkleOnayla(){
  const baslik = (document.getElementById('oncSutunBaslik').value || '').trim();
  const tarih = document.getElementById('oncSutunTarih').value || null;
  if(!baslik){ toast('Sütun için bir başlık girin.'); return; }
  const kayit = _oncGecerliKayit(); if(!kayit) return;
  OdevNotCizelgeleriService.sutunEkle(_oncAcikTip, kayit, baslik, tarih).then(() => {
    document.getElementById('oncMiniModal').remove();
  });
}
function oncSutunSil(sutunId){
  const kayit = _oncGecerliKayit(); if(!kayit) return;
  OdevNotCizelgeleriService.sutunSil(_oncAcikTip, kayit, sutunId);
}

function oncOgrenciEkleModalAc(){
  const eski = document.getElementById('oncMiniModal'); if(eski) eski.remove();
  const modal = document.createElement('div');
  modal.id = 'oncMiniModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div class="card" style="width:100%;max-width:360px;margin:16px;padding:18px;">
      <div style="font-weight:700;margin-bottom:10px;">Öğrenci Ekle</div>
      <label style="display:block;font-size:13px;font-weight:600;">Ad Soyad</label>
      <input id="oncOgrenciAd" class="input" placeholder="Öğrenci adı" />
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-ghost" style="flex:1;" onclick="document.getElementById('oncMiniModal').remove()">Vazgeç</button>
        <button class="btn btn-primary" style="flex:1;" onclick="oncOgrenciEkleOnayla()">Ekle</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
function oncOgrenciEkleOnayla(){
  const ad = (document.getElementById('oncOgrenciAd').value || '').trim();
  if(!ad){ toast('Öğrenci adı girin.'); return; }
  const kayit = _oncGecerliKayit(); if(!kayit) return;
  OdevNotCizelgeleriService.ogrenciEkle(_oncAcikTip, kayit, ad).then(() => {
    document.getElementById('oncMiniModal').remove();
  });
}
function oncOgrenciSil(ogrenciId){
  const kayit = _oncGecerliKayit(); if(!kayit) return;
  OdevNotCizelgeleriService.ogrenciSil(_oncAcikTip, kayit, ogrenciId);
}

/* ---------------------------------------------------------------
   PDF / YAZDIRMA (mevcut _raporOverlayOlustur ile aynı desen)
   --------------------------------------------------------------- */
function oncPdfIndir(tip, id){
  const kayit = _oncListesi(tip).find(k => k.id === id);
  if(!kayit){ toast('Çizelge bulunamadı.'); return; }
  const tabloHtml = _oncTabloHtmlUret(tip, kayit, false);
  const html = `
    <!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
    <style>
      body{font-family:Arial,sans-serif;padding:16px;}
      h2{margin:0 0 4px 0;}
      .alt{opacity:.7;font-size:13px;margin-bottom:14px;}
      table{border-collapse:collapse;width:100%;}
      th,td{border:1px solid #999;padding:5px;font-size:12px;}
      th{background:#f0f0f0;}
    </style></head><body>
      <h2>${escapeHtml(kayit.ad)}</h2>
      <div class="alt">${escapeHtml(ONC_BASLIK[tip])} · ${escapeHtml(_oncSinifAdi(kayit.sinifId))} · ${_trTarih(_isoToday())}</div>
      ${tabloHtml}
    </body></html>
  `;
  _raporOverlayOlustur(kayit.ad, html);
}

/* ---------------------------------------------------------------
   FIRESTORE BAĞLANTILARI (sahiplik-filtreli dinleme)
   --------------------------------------------------------------- */
function odevNotCizelgeleriBaglantilariKur(){
  if(typeof AKTIF_KULLANICI === 'undefined' || !AKTIF_KULLANICI) return;
  const adminMi = AKTIF_KULLANICI.admin === true;
  OdevNotCizelgeleriRepository.kayitlariDinle('odevTakip', AKTIF_KULLANICI.uid, adminMi, v => {
    odevTakipListesi = v;
    renderOncListesi('odevTakip');
    oncDetayCanliGuncelle();
  });
  OdevNotCizelgeleriRepository.kayitlariDinle('notCizelgesi', AKTIF_KULLANICI.uid, adminMi, v => {
    notCizelgesiListesi = v;
    renderOncListesi('notCizelgesi');
    oncDetayCanliGuncelle();
  });
}
