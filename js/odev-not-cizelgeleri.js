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

   TASLAK + KAYDET MODELİ: Detay ekranı açılınca kayıt bir TASLAK olarak
   yerel hafızaya kopyalanır (_oncTaslak). Hücre tıklama, sütun/öğrenci
   ekleme-çıkarma SADECE taslağı değiştirir, Firestore'a hiçbir şey
   yazılmaz — ekran her değişiklikte taslaktan yeniden çizilir. Sadece
   "💾 Kaydet" butonuna basılınca taslağın TAMAMI tek seferde Firestore'a
   yazılır. Kaydedilmemiş değişiklik varken kapatılırsa onay istenir ve
   kaydedilmezse değişiklikler sessizce atılır.

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
function _oncDerinKopya(o){ return JSON.parse(JSON.stringify(o || {})); }

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
        <button class="btn btn-ghost btn-sm" onclick="oncSil('${tip}','${k.id}')" title="Çizelgeyi sil">🗑️</button>
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

  const otomatikOgrenciler = (typeof veliler !== 'undefined' ? veliler : [])
    .filter(v => v.sinifId === sinifId)
    .map(v => ({ id: 'o_' + v.id, ad: v.ogrenciAdi || '(isimsiz)' }));

  const veri = { ad, sinifId, ogrenciler: otomatikOgrenciler, sutunlar: [], hucreler: {} };
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
   DETAY (TABLO) GÖRÜNÜMÜ — taslak + kaydet modeli
   --------------------------------------------------------------- */
let _oncAcikTip = null;
let _oncAcikId = null;
let _oncTaslak = null;
let _oncKirliMi = false;

function oncDetayAc(tip, id){
  const kaynakKayit = _oncListesi(tip).find(k => k.id === id);
  if(!kaynakKayit){ toast('Çizelge bulunamadı.'); return; }

  _oncAcikTip = tip; _oncAcikId = id;
  _oncTaslak = _oncDerinKopya(kaynakKayit);
  _oncKirliMi = false;

  const overlayEski = document.getElementById('oncDetayOverlay'); if(overlayEski) overlayEski.remove();

  const ov = document.createElement('div');
  ov.id = 'oncDetayOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9500;background:var(--bg-app,#f4f5f7);display:flex;flex-direction:column;';
  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:linear-gradient(135deg,#1b5e20,#2e7d32);padding:10px 14px;flex-wrap:wrap;">
      <span id="oncDetayBaslik" style="font-weight:700;font-size:14px;color:#fff;"></span>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button style="${_oncButonStil('#fff','#1b5e20')}" onclick="oncSutunEkleModalAc()">+ Sütun</button>
        <button style="${_oncButonStil('#fff','#1b5e20')}" onclick="oncOgrenciEkleModalAc()">+ Öğrenci</button>
        <button id="oncKaydetBtn" style="${_oncButonStil('#fff','#e65100')}" onclick="oncKaydet()">💾 Kaydet</button>
        <button style="${_oncButonStil('#fff','#1b5e20')}" onclick="oncPdfIndir('${tip}','${id}')">🖨️ PDF</button>
        <button style="${_oncButonStil('#fff','#c62828')}" onclick="oncDetayKapatIste()">✕ Kapat</button>
      </div>
    </div>
    <div id="oncKirliUyari" style="display:none;background:#fff3cd;color:#7a5b00;padding:6px 14px;font-size:12.5px;font-weight:600;">
      ⚠️ Kaydedilmemiş değişiklikleriniz var — kapatmadan önce "💾 Kaydet"e basın.
    </div>
    <div style="flex:1;overflow:auto;padding:14px;">
      <div id="oncDetayTablo"></div>
    </div>
  `;
  document.body.appendChild(ov);
  _oncDetayRender();
}

function _oncButonStil(yaziRengi, zeminRengi){
  return `background:${zeminRengi};color:${yaziRengi};border:1px solid rgba(255,255,255,.5);border-radius:7px;padding:6px 12px;font-size:12.5px;font-weight:700;cursor:pointer;`;
}

function oncDetayKapatIste(){
  if(!_oncKirliMi){ oncDetayKapat(); return; }
  uygulamaOnayAl('Kaydedilmemiş değişiklikleriniz var. Kaydetmeden kapatırsanız bu değişiklikler kaybolacak. Yine de kapatılsın mı?').then(onay => {
    if(onay) oncDetayKapat();
  });
}

function oncDetayKapat(){
  const ov = document.getElementById('oncDetayOverlay'); if(ov) ov.remove();
  _oncAcikTip = null; _oncAcikId = null; _oncTaslak = null; _oncKirliMi = false;
}

function _oncKirliIsaretle(){
  _oncKirliMi = true;
  const uyari = document.getElementById('oncKirliUyari');
  if(uyari) uyari.style.display = 'block';
}

function oncDetayCanliGuncelle(){
  if(!document.getElementById('oncDetayOverlay')) return;
  if(_oncKirliMi) return;
  const guncelKayit = _oncListesi(_oncAcikTip).find(k => k.id === _oncAcikId);
  if(guncelKayit) _oncTaslak = _oncDerinKopya(guncelKayit);
  _oncDetayRender();
}

function _oncDetayRender(){
  const kayit = _oncTaslak;
  const baslikEl = document.getElementById('oncDetayBaslik');
  const tabloEl = document.getElementById('oncDetayTablo');
  if(!kayit || !tabloEl) return;
  if(baslikEl) baslikEl.textContent = `${ONC_BASLIK[_oncAcikTip]} — ${kayit.ad}`;
  tabloEl.innerHTML = _oncTabloHtmlUret(_oncAcikTip, kayit, true);
}

async function oncKaydet(){
  const kayit = _oncTaslak;
  if(!kayit) return;
  const btn = document.getElementById('oncKaydetBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'Kaydediliyor…'; }
  try{
    await OdevNotCizelgeleriService.taslagiKaydet(_oncAcikTip, kayit);
    _oncKirliMi = false;
    const uyari = document.getElementById('oncKirliUyari');
    if(uyari) uyari.style.display = 'none';
    toast('Kaydedildi.');
  }catch(e){
    console.error(e);
  }finally{
    if(btn){ btn.disabled = false; btn.textContent = '💾 Kaydet'; }
  }
}

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
      const sinif = deger === 'yapti' ? 'onc-td-yapti' : (deger === 'yapmadi' ? 'onc-td-yapmadi' : 'onc-td-bos');
      const tikla = etkilesimliMi ? `onclick="oncHucreTikla('${ogrenciId}','${sutunId}')"` : '';
      return `<td class="onc-td ${sinif}" ${tikla} style="text-align:center;cursor:${etkilesimliMi ? 'pointer' : 'default'};font-weight:800;font-size:16px;min-width:44px;">${sembol}</td>`;
    }
    if(hucreModu === 'puan'){
      if(etkilesimliMi){
        return `<td class="onc-td onc-td-bos" style="text-align:center;min-width:56px;"><input type="number" value="${deger !== undefined && deger !== null ? deger : ''}" style="width:48px;text-align:center;border:1px solid var(--border);border-radius:6px;padding:3px;background:var(--bg-card);color:var(--ink);" onchange="oncPuanGirildi('${ogrenciId}','${sutunId}', this.value)" /></td>`;
      }
      return `<td class="onc-td onc-td-bos" style="text-align:center;min-width:44px;">${deger !== undefined && deger !== null ? deger : ''}</td>`;
    }
    const sembol = deger === 'arti' ? '+' : (deger === 'eksi' ? '−' : '');
    const sinif = deger === 'arti' ? 'onc-td-arti' : (deger === 'eksi' ? 'onc-td-eksi' : 'onc-td-bos');
    const tikla = etkilesimliMi ? `onclick="oncHucreTikla('${ogrenciId}','${sutunId}')"` : '';
    return `<td class="onc-td ${sinif}" ${tikla} style="text-align:center;cursor:${etkilesimliMi ? 'pointer' : 'default'};font-weight:800;font-size:16px;min-width:44px;">${sembol}</td>`;
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
    <th class="onc-th" style="min-width:70px;padding:6px 4px;font-size:12px;">
      ${escapeHtml(s.baslik)}${s.tarih ? `<div style="font-weight:400;opacity:.75;font-size:10.5px;">${_trTarih(s.tarih)}</div>` : ''}
      ${etkilesimliMi ? `<button class="onc-sil-ikon" onclick="oncSutunSil('${s.id}')" title="Sütunu sil">🗑️</button>` : ''}
    </th>
  `).join('');

  const satirlarHtml = ogrenciler.map(o => `
    <tr>
      <td class="onc-td onc-td-ad" style="padding:6px 8px;font-size:13px;white-space:nowrap;">
        ${escapeHtml(o.ad)}
        ${etkilesimliMi ? `<button class="onc-sil-ikon" onclick="oncOgrenciSil('${o.id}')" title="Öğrenciyi sil" style="margin-left:6px;">🗑️</button>` : ''}
      </td>
      ${sutunlar.map(s => hucreGoster(o.id, s.id)).join('')}
      <td class="onc-td onc-td-toplam" style="text-align:center;font-weight:700;font-size:12px;">${toplamGoster(o.id)}</td>
    </tr>
  `).join('');

  return `
    <table style="border-collapse:collapse;width:100%;">
      <thead>
        <tr>
          <th class="onc-th" style="text-align:left;padding:6px 8px;">Öğrenci</th>
          ${sutunBaslikHtml}
          <th class="onc-th" style="min-width:70px;">Toplam</th>
        </tr>
      </thead>
      <tbody>${satirlarHtml}</tbody>
    </table>
  `;
}

function oncHucreTikla(ogrenciId, sutunId){
  const kayit = _oncTaslak; if(!kayit) return;
  if(!kayit.hucreler) kayit.hucreler = {};
  const anahtar = ogrenciId + '_' + sutunId;
  const mevcut = kayit.hucreler[anahtar];
  let sonraki;
  if(_oncAcikTip === 'odevTakip'){
    sonraki = mevcut === 'yapti' ? 'yapmadi' : (mevcut === 'yapmadi' ? null : 'yapti');
  } else {
    sonraki = mevcut === 'arti' ? 'eksi' : (mevcut === 'eksi' ? null : 'arti');
  }
  if(sonraki === null) delete kayit.hucreler[anahtar]; else kayit.hucreler[anahtar] = sonraki;
  _oncKirliIsaretle();
  _oncDetayRender();
}

function oncPuanGirildi(ogrenciId, sutunId, deger){
  const kayit = _oncTaslak; if(!kayit) return;
  if(!kayit.hucreler) kayit.hucreler = {};
  const anahtar = ogrenciId + '_' + sutunId;
  if(deger === ''){ delete kayit.hucreler[anahtar]; } else { kayit.hucreler[anahtar] = Number(deger); }
  _oncKirliIsaretle();
}

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
  const kayit = _oncTaslak; if(!kayit) return;
  if(!kayit.sutunlar) kayit.sutunlar = [];
  kayit.sutunlar.push({ id: 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), baslik, tarih: tarih || null });
  _oncKirliIsaretle();
  document.getElementById('oncMiniModal').remove();
  _oncDetayRender();
}
function oncSutunSil(sutunId){
  const kayit = _oncTaslak; if(!kayit) return;
  kayit.sutunlar = (kayit.sutunlar || []).filter(s => s.id !== sutunId);
  _oncKirliIsaretle();
  _oncDetayRender();
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
  const kayit = _oncTaslak; if(!kayit) return;
  if(!kayit.ogrenciler) kayit.ogrenciler = [];
  kayit.ogrenciler.push({ id: 'o_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ad });
  _oncKirliIsaretle();
  document.getElementById('oncMiniModal').remove();
  _oncDetayRender();
}
function oncOgrenciSil(ogrenciId){
  const kayit = _oncTaslak; if(!kayit) return;
  kayit.ogrenciler = (kayit.ogrenciler || []).filter(o => o.id !== ogrenciId);
  _oncKirliIsaretle();
  _oncDetayRender();
}

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
