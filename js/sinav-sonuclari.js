/* =============================================================
   js/sinav-sonuclari.js
   DENEME VE TEST SONUÇLARI — iki bağımsız liste (kullanıcı isteği:
   "test sonuçları ayrı deneme sonuçları ayrı olacak"), aynı UI/mantığı
   paylaşır (bkz. SinavSonuclariServisOlustur fabrikası). Sonuç girişi
   TÜM öğretmenlere açık (sadece admin değil).
   ============================================================= */
let denemeSinavListesi = [];
let testSinavListesi = [];
let _ssAcikTur = null;    // 'deneme' | 'test' — hangi liste ekranı açık
let _ssAcikSinavId = null;

function _ssServis(tur){ return tur==='deneme' ? DenemeSonuclariService : TestSonuclariService; }
function _ssListe(tur){ return tur==='deneme' ? denemeSinavListesi : testSinavListesi; }
function _ssBaslik(tur){ return tur==='deneme' ? '📊 Deneme Sonuçları' : '📝 Test Sonuçları'; }
function _ssSinav(tur, id){ return _ssListe(tur).find(s=>s.id===id); }
function _ssNetHesapla(dogru, yanlis){
  const d = parseFloat(dogru)||0, y = parseFloat(yanlis)||0;
  return parseFloat((d - y/3).toFixed(3));
}

function sinavSonuclariBaglantisiniKur(){
  DenemeSonuclariService.sinavlariDinle(v => {
    denemeSinavListesi = v;
    if (_ssAcikTur==='deneme' && document.getElementById('ssListeOverlay')) _ssListeCiz();
    if (_ssAcikTur==='deneme' && document.getElementById('ssDetayOverlay')) _ssDetayCiz();
  });
  TestSonuclariService.sinavlariDinle(v => {
    testSinavListesi = v;
    if (_ssAcikTur==='test' && document.getElementById('ssListeOverlay')) _ssListeCiz();
    if (_ssAcikTur==='test' && document.getElementById('ssDetayOverlay')) _ssDetayCiz();
  });
}

/* ================================================================
   LİSTE EKRANI
   ================================================================ */
function sinavSonuclariAc(tur){
  _ssAcikTur = tur;
  const ov = document.createElement('div');
  ov.id = 'ssListeOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9400;background:var(--bg-app);overflow-y:auto;overscroll-behavior:contain;';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-sidebar);color:var(--ink-on-dark);position:sticky;top:0;z-index:2;">
      <button class="btn btn-ghost btn-sm" onclick="sinavSonuclariKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Kapat</button>
      <div style="font-weight:700;font-size:14px;">${_ssBaslik(tur)}</div>
      <div style="display:flex;gap:6px;">
        ${tur==='deneme' ? `<button class="btn btn-ghost btn-sm" onclick="_ssSinifRaporuModalAc()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="Sınıf bazlı tüm deneme raporu">🖨 Sınıf Raporu</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="_ssYeniSinavOlustur('${tur}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">➕ Yeni</button>
      </div>
    </div>
    <div id="ssListeGovde" style="padding:16px 16px 90px;"></div>
  `;
  _ssListeCiz();
}
function sinavSonuclariKapat(){
  const ov = document.getElementById('ssListeOverlay');
  if (ov) ov.remove();
  _ssAcikTur = null;
  document.body.classList.remove('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
}
function _ssListeCiz(){
  const govde = document.getElementById('ssListeGovde');
  if (!govde) return;
  const liste = _ssListe(_ssAcikTur);
  govde.innerHTML = liste.length ? liste.map(s => {
    const ogrSayisi = (s.sonuclar||[]).length;
    return `
    <div class="card dash-card-clickable" style="margin-bottom:10px;" onclick="_ssDetayAc('${_ssAcikTur}','${s.id}')">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong>${escapeHtml(s.ad)}</strong>
          <div style="font-size:12px;color:var(--ink-muted);margin-top:2px;">${escapeHtml(s.tarih||'')} · ${s.sinifSeviyesi?s.sinifSeviyesi+'. Sınıf · ':''}${ogrSayisi} öğrenci · ${(s.dersler||[]).length} ders</div>
        </div>
        <span style="color:var(--ink-muted);">›</span>
      </div>
    </div>`;
  }).join('') : '<p class="empty-state">Henüz sınav eklenmemiş.</p>';
}
function _ssYeniSinavOlustur(tur){
  const body = `
    <div class="form-group"><label>Sınav Adı</label><input id="f_ssAd" placeholder="örn: 1. Deneme Sınavı"></div>
    <div class="form-row">
      <div class="form-group"><label>Tarih</label><input type="date" id="f_ssTarih" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="form-group" style="flex:0 0 110px;"><label>Sınıf Seviyesi</label>
        <select id="f_ssSeviye"><option value="">—</option>${[1,2,3,4,5,6,7,8].map(n=>`<option value="${n}">${n}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group"><label>Ölçülen Dersler (virgülle ayırın)</label><textarea id="f_ssDersler" rows="2" placeholder="Türkçe, Matematik, Fen Bilimleri, İnkılap Tarihi, Din Kültürü, İngilizce"></textarea></div>
  `;
  modalAc(`➕ Yeni ${tur==='deneme'?'Deneme':'Test'}`, body, () => {
    const ad = document.getElementById('f_ssAd').value.trim();
    const dersler = document.getElementById('f_ssDersler').value.split(',').map(s=>s.trim()).filter(Boolean);
    if (!ad){ toast('Sınav adı zorunludur.'); return; }
    if (!dersler.length){ toast('En az bir ders girmelisiniz.'); return; }
    const veri = {
      ad, tarih: document.getElementById('f_ssTarih').value,
      sinifSeviyesi: document.getElementById('f_ssSeviye').value ? parseInt(document.getElementById('f_ssSeviye').value,10) : null,
      dersler, sonuclar: [],
      olusturanAdi: (typeof _hesapKimligi==='function' ? (_hesapKimligi().ad||'') : ''),
      olusturmaTarihi: new Date().toISOString(),
    };
    _ssServis(tur).sinavEkle(veri)
      .then(()=>toast('Sınav oluşturuldu — şimdi sonuçları girebilirsiniz.'))
      .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  });
}
function _ssSinavSilOnay(tur, sinavId){
  const s = _ssSinav(tur, sinavId);
  if (!s) return;
  if (!confirm(`"${s.ad}" sınavını ve TÜM öğrenci sonuçlarını silmek istediğinize emin misiniz?`)) return;
  _ssServis(tur).sinavSil(sinavId)
    .then(()=>{ toast('Silindi.'); _ssDetayKapat(false); })
    .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ================================================================
   DETAY EKRANI — öğrenci ekleme (sınıf seç) + manuel D/Y girişi + Excel
   ================================================================ */
function _ssDetayAc(tur, sinavId){
  _ssAcikTur = tur; _ssAcikSinavId = sinavId;
  const s = _ssSinav(tur, sinavId);
  if (!s) { toast('Sınav bulunamadı.'); return; }
  sinavSonuclariKapat();

  const ov = document.createElement('div');
  ov.id = 'ssDetayOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9400;background:var(--bg-app);overflow-y:auto;overscroll-behavior:contain;';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);
  _ssAcikTur = tur;

  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-sidebar);color:var(--ink-on-dark);position:sticky;top:0;z-index:2;gap:6px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm" onclick="_ssDetayKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Geri</button>
      <div style="font-weight:700;font-size:13px;flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(s.ad)}</div>
      <button class="btn btn-ghost btn-sm" onclick="_ssSinavSilOnay('${tur}','${sinavId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;">🗑️</button>
    </div>
    <div style="padding:12px 16px 4px;display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm" onclick="_ssSinifOgrencileriEkleModalAc('${tur}','${sinavId}')">➕ Sınıftan Öğrenci Ekle</button>
      <button class="btn btn-ghost btn-sm" onclick="_ssSinavRaporuYazdir('${tur}','${sinavId}')">🖨 Sonuç Raporu</button>
      <button class="btn btn-ghost btn-sm" onclick="_ssExcelSablonIndir('${tur}','${sinavId}')">📥 Excel Şablonu İndir</button>
      <input type="file" id="ssExcelInput" accept=".xlsx,.xls" style="display:none;" onchange="_ssExcelIceAktar('${tur}','${sinavId}', this.files[0]); this.value='';">
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('ssExcelInput').click()">📤 Excel'den İçe Aktar</button>
      <button class="btn btn-amber btn-sm" onclick="_ssSonuclariKaydet('${tur}','${sinavId}')" style="margin-left:auto;">💾 Kaydet</button>
    </div>
    <div id="ssDetayGovde" style="padding:8px 16px 90px;overflow-x:auto;"></div>
  `;
  _ssDetayCiz();
}
function _ssDetayKapat(geriDonme){
  const ov = document.getElementById('ssDetayOverlay');
  if (ov) ov.remove();
  document.body.classList.remove('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
  const tur = _ssAcikTur;
  _ssAcikSinavId = null;
  if (geriDonme !== false && tur) sinavSonuclariAc(tur);
}
function _ssDetayCiz(){
  const s = _ssSinav(_ssAcikTur, _ssAcikSinavId);
  const govde = document.getElementById('ssDetayGovde');
  if (!s || !govde) return;
  const dersler = s.dersler||[];
  const sonuclar = (s.sonuclar||[]).slice().sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));

  if (!sonuclar.length){
    govde.innerHTML = '<p class="empty-state">Henüz öğrenci eklenmedi — "Sınıftan Öğrenci Ekle" ile başlayın.</p>';
    return;
  }
  govde.innerHTML = `
    <table class="table" style="min-width:${300+dersler.length*140}px;">
      <thead><tr>
        <th style="position:sticky;left:0;background:var(--bg-app);">Öğrenci</th>
        ${dersler.map(d=>`<th colspan="2" style="text-align:center;">${escapeHtml(d)}</th>`).join('')}
        <th>Toplam Net</th><th></th>
      </tr>
      <tr><th style="position:sticky;left:0;background:var(--bg-app);"></th>
        ${dersler.map(()=>`<th style="font-size:10px;">D</th><th style="font-size:10px;">Y</th>`).join('')}
        <th></th><th></th>
      </tr></thead>
      <tbody>
        ${sonuclar.map((o,ri) => `
          <tr data-ogrenci-id="${o.ogrenciId}">
            <td style="position:sticky;left:0;background:var(--bg-app);font-weight:600;white-space:nowrap;cursor:pointer;color:var(--brand);" onclick="if(typeof ogrenciSinavSonuclariGoster==='function') ogrenciSinavSonuclariGoster('${o.ogrenciId}')">${escapeHtml(o.ogrenciAdi)}</td>
            ${dersler.map(d => {
              const ds = (o.dersSonuclari||{})[d] || {};
              return `<td><input type="number" min="0" class="ss-d" data-ders="${escapeHtml(d)}" value="${ds.dogru??''}" style="width:52px;" oninput="_ssSatirNetGuncelle(${ri})"></td>
                      <td><input type="number" min="0" class="ss-y" data-ders="${escapeHtml(d)}" value="${ds.yanlis??''}" style="width:52px;" oninput="_ssSatirNetGuncelle(${ri})"></td>`;
            }).join('')}
            <td><strong id="ssToplamNet_${ri}">${(o.toplamNet??0).toFixed(2)}</strong></td>
            <td><button class="btn btn-ghost btn-sm" onclick="_ssOgrenciSilOnay(${ri})" style="color:#c0392b;">✕</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
function _ssSatirNetGuncelle(satirIndex){
  const tr = document.querySelectorAll('#ssDetayGovde tbody tr')[satirIndex];
  if (!tr) return;
  let toplam = 0;
  tr.querySelectorAll('.ss-d').forEach(inp => {
    const ders = inp.dataset.ders;
    const y = tr.querySelector(`.ss-y[data-ders="${CSS.escape(ders)}"]`);
    toplam += _ssNetHesapla(inp.value, y ? y.value : 0);
  });
  const el = document.getElementById('ssToplamNet_'+satirIndex);
  if (el) el.textContent = toplam.toFixed(2);
}
function _ssOgrenciSilOnay(satirIndex){
  const s = _ssSinav(_ssAcikTur, _ssAcikSinavId);
  if (!s) return;
  const sonuclar = (s.sonuclar||[]).slice().sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));
  const hedef = sonuclar[satirIndex];
  if (!hedef || !confirm(`"${hedef.ogrenciAdi}" bu sınavdan çıkarılsın mı?`)) return;
  const yeniSonuclar = (s.sonuclar||[]).filter(o=>o.ogrenciId!==hedef.ogrenciId);
  _ssServis(_ssAcikTur).sinavGuncelle(s.id, { sonuclar: yeniSonuclar })
    .then(()=>toast('Çıkarıldı.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}
/* Ekrandaki TÜM input değerlerini okuyup tek seferde kaydeder. */
function _ssSonuclariKaydet(tur, sinavId){
  const s = _ssSinav(tur, sinavId);
  if (!s) return;
  const dersler = s.dersler||[];
  const satirlar = Array.from(document.querySelectorAll('#ssDetayGovde tbody tr'));
  const sonuclar = satirlar.map(tr => {
    const ogrenciId = tr.dataset.ogrenciId;
    const mevcut = (s.sonuclar||[]).find(o=>o.ogrenciId===ogrenciId) || {};
    const dersSonuclari = {};
    let toplamNet = 0;
    dersler.forEach(d => {
      const dInp = tr.querySelector(`.ss-d[data-ders="${CSS.escape(d)}"]`);
      const yInp = tr.querySelector(`.ss-y[data-ders="${CSS.escape(d)}"]`);
      const dogru = dInp && dInp.value !== '' ? parseInt(dInp.value,10) : 0;
      const yanlis = yInp && yInp.value !== '' ? parseInt(yInp.value,10) : 0;
      const net = _ssNetHesapla(dogru, yanlis);
      dersSonuclari[d] = { dogru, yanlis, net };
      toplamNet += net;
    });
    return { ogrenciId, ogrenciAdi: mevcut.ogrenciAdi, sinif: mevcut.sinif, dersSonuclari, toplamNet: +toplamNet.toFixed(2) };
  });
  _ssServis(tur).sinavGuncelle(sinavId, { sonuclar })
    .then(()=>toast('Sonuçlar kaydedildi.'))
    .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ================================================================
   SINIFTAN ÖĞRENCİ EKLEME
   ================================================================ */
function _ssSinifOgrencileriEkleModalAc(tur, sinavId){
  const siniflarListesi = (typeof siniflar!=='undefined' ? siniflar : []).slice().sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'));
  const body = `
    <div style="display:flex;flex-direction:column;gap:2px;max-height:55vh;overflow-y:auto;">
      ${siniflarListesi.map(sn=>`
        <button class="btn btn-ghost btn-sm" style="justify-content:space-between;text-align:left;" onclick="modalKapat();_ssSinifOgrencileriniEkle('${tur}','${sinavId}','${sn.id}')">
          <span>${escapeHtml(sn.ad)}${sn.seviye?' · '+sn.seviye+'. Sınıf':''}</span><span>›</span>
        </button>`).join('') || '<p class="empty-state">Sınıf bulunamadı.</p>'}
    </div>`;
  modalAc('Sınıf Seçin', body, null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
}
function _ssSinifOgrencileriniEkle(tur, sinavId, sinifId){
  const s = _ssSinav(tur, sinavId);
  const sn = (typeof siniflar!=='undefined' ? siniflar : []).find(x=>x.id===sinifId);
  if (!s || !sn) return;
  const mevcutIdler = new Set((s.sonuclar||[]).map(o=>o.ogrenciId));
  const ogrenciler = (typeof veliler!=='undefined' ? veliler : []).filter(v=>v.sinifId===sinifId && !mevcutIdler.has(v.id));
  if (!ogrenciler.length){ toast('Bu sınıftaki öğrenciler zaten listede ya da sınıf boş.'); return; }
  const yeniSonuclar = (s.sonuclar||[]).concat(ogrenciler.map(o => ({
    ogrenciId: o.id, ogrenciAdi: o.ogrenciAdi, sinif: sn.ad, dersSonuclari: {}, toplamNet: 0,
  })));
  _ssServis(tur).sinavGuncelle(sinavId, { sonuclar: yeniSonuclar })
    .then(()=>toast(`${ogrenciler.length} öğrenci eklendi.`))
    .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ================================================================
   EXCEL ŞABLONU İNDİR / İÇE AKTAR — mevcut xlsx (SheetJS) kütüphanesi
   ve bu uygulamadaki excel-import.js'teki workbookOku/sayfayiDiziyeCevir/
   normBaslik yardımcılarıyla aynı desen kullanılıyor.
   ================================================================ */
function _ssExcelSablonIndir(tur, sinavId){
  const s = _ssSinav(tur, sinavId);
  if (!s) return;
  const dersler = s.dersler||[];
  const basliklar = ['Öğrenci No','Öğrenci Adı Soyadı'];
  dersler.forEach(d => { basliklar.push(`${d} Doğru`); basliklar.push(`${d} Yanlış`); });
  const satirlar = [basliklar];
  (s.sonuclar||[]).forEach(o => {
    const row = [ (typeof veliler!=='undefined' ? (veliler.find(v=>v.id===o.ogrenciId)||{}).ogrenciNo : '') || '', o.ogrenciAdi || '' ];
    dersler.forEach(d => {
      const ds = (o.dersSonuclari||{})[d] || {};
      row.push(ds.dogru ?? ''); row.push(ds.yanlis ?? '');
    });
    satirlar.push(row);
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(satirlar);
  XLSX.utils.book_append_sheet(wb, ws, 'Sonuçlar');
  XLSX.writeFile(wb, `${s.ad.replace(/[^\wçğıöşüÇĞİÖŞÜ ]/g,'')}_sablon.xlsx`);
}
async function _ssExcelIceAktar(tur, sinavId, file){
  if (!file) return;
  const s = _ssSinav(tur, sinavId);
  if (!s) return;
  try {
    const wb = await workbookOku(file);
    const aoa = sayfayiDiziyeCevir(wb, wb.SheetNames[0]);
    if (!aoa || !aoa.length){ toast('Sayfa okunamadı.'); return; }
    const header = aoa[0].map(normBaslik);
    const cNo = header.indexOf(normBaslik('Öğrenci No'));
    const cAd = header.findIndex(h => h.includes(normBaslik('Öğrenci Adı')));
    const dersKolonlari = (s.dersler||[]).map(d => ({
      ders: d,
      cD: header.indexOf(normBaslik(`${d} Doğru`)),
      cY: header.indexOf(normBaslik(`${d} Yanlış`)),
    }));

    const ogrenciler = (typeof veliler!=='undefined' ? veliler : []);
    const sonuclar = (s.sonuclar||[]).slice();
    let eslesen=0, eslesmeyen=0;

    for (let i=1;i<aoa.length;i++){
      const row = aoa[i]; if (!row || !row.some(c=>c!==undefined && c!=='')) continue;
      const no = cNo!==-1 ? String(row[cNo]||'').trim() : '';
      const ad = cAd!==-1 ? String(row[cAd]||'').trim() : '';
      if (!no && !ad) continue;
      const ogrenci = ogrenciler.find(v => (no && String(v.ogrenciNo||'').trim()===no) || (ad && (v.ogrenciAdi||'').trim().toLocaleUpperCase('tr')===ad.toLocaleUpperCase('tr')));
      if (!ogrenci){ eslesmeyen++; continue; }
      eslesen++;
      const dersSonuclari = {}; let toplamNet = 0;
      dersKolonlari.forEach(({ders,cD,cY}) => {
        const dogru = cD!==-1 ? parseInt(row[cD],10)||0 : 0;
        const yanlis = cY!==-1 ? parseInt(row[cY],10)||0 : 0;
        const net = _ssNetHesapla(dogru, yanlis);
        dersSonuclari[ders] = { dogru, yanlis, net };
        toplamNet += net;
      });
      const mevcutIdx = sonuclar.findIndex(o=>o.ogrenciId===ogrenci.id);
      const kayit = { ogrenciId: ogrenci.id, ogrenciAdi: ogrenci.ogrenciAdi, sinif: (typeof siniflar!=='undefined' ? (siniflar.find(sn=>sn.id===ogrenci.sinifId)||{}).ad : '') || '', dersSonuclari, toplamNet: +toplamNet.toFixed(2) };
      if (mevcutIdx!==-1) sonuclar[mevcutIdx] = kayit; else sonuclar.push(kayit);
    }
    await _ssServis(tur).sinavGuncelle(sinavId, { sonuclar });
    toast(`İçe aktarıldı: ${eslesen} öğrenci işlendi${eslesmeyen?`, ${eslesmeyen} satır eşleşmedi`:''}.`);
  } catch (err) {
    if (err.message!=='yetkisiz') toast('İçe aktarma hatası: '+err.message);
  }
}

/* ================================================================
   ÖĞRENCİ SONUÇ SAYFASI — bir öğrencinin TÜM deneme+test sonuçları,
   trend grafiğiyle birlikte. Sınıflar modülündeki öğrenci detay
   ekranından "📊 Sınav Sonuçları" ile açılır.
   ================================================================ */
let _ssOgrenciGrafik = null; // Chart.js örneği — yeniden çizerken eskisini yok etmek için

function ogrenciSinavSonuclariGoster(ogrenciId){
  const ogrenci = (typeof veliler!=='undefined' ? veliler : []).find(v=>v.id===ogrenciId);
  if (!ogrenci) { toast('Öğrenci bulunamadı.'); return; }

  const ov = document.createElement('div');
  ov.id = 'ssOgrenciOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9400;background:var(--bg-app);overflow-y:auto;overscroll-behavior:contain;';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-sidebar);color:var(--ink-on-dark);position:sticky;top:0;z-index:2;">
      <button class="btn btn-ghost btn-sm" onclick="_ssOgrenciSonucKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Kapat</button>
      <div style="font-weight:700;font-size:13px;flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📊 ${escapeHtml(ogrenci.ogrenciAdi)}</div>
      <button class="btn btn-ghost btn-sm" onclick="_ssOgrenciRaporuYazdir('${ogrenciId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;">🖨</button>
    </div>
    <div style="padding:16px 16px 90px;">
      <div class="card" style="margin-bottom:14px;"><canvas id="ssOgrenciGrafikCanvas" height="180"></canvas></div>
      <div id="ssOgrenciDenemeListesi"></div>
      <div id="ssOgrenciTestListesi" style="margin-top:16px;"></div>
    </div>
  `;
  _ssOgrenciSonuclariCiz(ogrenciId);
}
function _ssOgrenciSonucKapat(){
  const ov = document.getElementById('ssOgrenciOverlay');
  if (ov) ov.remove();
  if (_ssOgrenciGrafik) { _ssOgrenciGrafik.destroy(); _ssOgrenciGrafik = null; }
  document.body.classList.remove('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
}
function _ssOgrenciBirListeCiz(elId, baslik, ikon, liste, ogrenciId){
  const el = document.getElementById(elId);
  if (!el) return;
  const eslesenler = liste
    .map(s => ({ sinav:s, sonuc:(s.sonuclar||[]).find(o=>o.ogrenciId===ogrenciId) }))
    .filter(x => x.sonuc)
    .sort((a,b) => (b.sinav.tarih||'').localeCompare(a.sinav.tarih||''));
  el.innerHTML = `<h3 style="font-size:14px;margin-bottom:8px;">${ikon} ${baslik}</h3>` + (
    eslesenler.length ? eslesenler.map(({sinav,sonuc}) => `
      <div class="card" style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div><strong>${escapeHtml(sinav.ad)}</strong><div style="font-size:11px;color:var(--ink-muted);">${escapeHtml(sinav.tarih||'')}</div></div>
          <div style="font-weight:700;color:var(--brand);font-size:16px;">${sonuc.toplamNet.toFixed(2)}</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
          ${Object.keys(sonuc.dersSonuclari||{}).map(d => {
            const ds = sonuc.dersSonuclari[d];
            return `<span class="badge badge-gray" title="${d}">${escapeHtml(d.slice(0,3))}: ${ds.net.toFixed(1)}</span>`;
          }).join('')}
        </div>
      </div>`).join('') : `<p class="empty-state">Henüz ${baslik.toLocaleLowerCase('tr')} kaydı yok.</p>`
  );
}
function _ssOgrenciSonuclariCiz(ogrenciId){
  _ssOgrenciBirListeCiz('ssOgrenciDenemeListesi', 'Deneme Sonuçları', '📊', denemeSinavListesi, ogrenciId);
  _ssOgrenciBirListeCiz('ssOgrenciTestListesi', 'Test Sonuçları', '📝', testSinavListesi, ogrenciId);

  // ---- Trend grafiği: toplam net, tarihe göre, deneme ve test ayrı çizgi ----
  const canvas = document.getElementById('ssOgrenciGrafikCanvas');
  if (!canvas || typeof Chart === 'undefined') return;
  const veriSecCiz = (liste) => liste
    .map(s => ({ sinav:s, sonuc:(s.sonuclar||[]).find(o=>o.ogrenciId===ogrenciId) }))
    .filter(x => x.sonuc)
    .sort((a,b) => (a.sinav.tarih||'').localeCompare(b.sinav.tarih||''))
    .map(x => ({ x: x.sinav.tarih, y: x.sonuc.toplamNet }));
  const denemeVeri = veriSecCiz(denemeSinavListesi);
  const testVeri = veriSecCiz(testSinavListesi);

  if (_ssOgrenciGrafik) { _ssOgrenciGrafik.destroy(); _ssOgrenciGrafik = null; }
  if (!denemeVeri.length && !testVeri.length){
    canvas.parentElement.innerHTML = '<p class="empty-state">Grafik için henüz yeterli veri yok.</p>';
    return;
  }
  _ssOgrenciGrafik = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { datasets: [
      { label:'Deneme Net', data:denemeVeri, borderColor:'#1F6FD1', backgroundColor:'#1F6FD1', tension:.25 },
      { label:'Test Net', data:testVeri, borderColor:'#D81B60', backgroundColor:'#D81B60', tension:.25 },
    ]},
    options: {
      responsive:true,
      scales: { x:{ type:'category' }, y:{ beginAtZero:true } },
      plugins: { legend:{ position:'bottom' } },
    },
  });
}

/* ================================================================
   RAPORLAR — üçü de mevcut _raporPenceresiniAc boru hattını kullanır
   (okul logosu/başlığı, Android yazdırma vb. zaten çözülmüş).
   ================================================================ */
const SS_RAPOR_STIL = `<style>
  .ss-rapor-tablo{ border-collapse:collapse; width:100%; }
  .ss-rapor-tablo th, .ss-rapor-tablo td{ border:1px solid #999; padding:4px 6px; font-size:10.5px; text-align:center; }
  .ss-rapor-tablo thead th{ background:#0A6E6E; color:#fff; }
  .ss-rapor-tablo td.ss-ad{ text-align:left; font-weight:600; }
</style>`;

/* ---- 1) Bir sınavın tüm öğrenci sonuçları (sıralı) ---- */
function _ssSinavRaporuYazdir(tur, sinavId){
  const s = _ssSinav(tur, sinavId);
  if (!s || typeof _raporPenceresiniAc !== 'function') return;
  const dersler = s.dersler||[];
  const siralı = (s.sonuclar||[]).slice().sort((a,b)=>b.toplamNet-a.toplamNet);
  const okulAdi = (typeof okulBilgileriAyari!=='undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) || '';
  let html = SS_RAPOR_STIL + `<table class="ss-rapor-tablo"><thead><tr>
    <th>Sıra</th><th>Öğrenci</th><th>Sınıf</th>
    ${dersler.map(d=>`<th>${escapeHtml(d)}<br>Net</th>`).join('')}
    <th>Toplam Net</th>
  </tr></thead><tbody>`;
  siralı.forEach((o,i) => {
    html += `<tr><td>${i+1}</td><td class="ss-ad">${escapeHtml(o.ogrenciAdi)}</td><td>${escapeHtml(o.sinif||'')}</td>
      ${dersler.map(d=>`<td>${((o.dersSonuclari||{})[d]||{}).net?.toFixed(2) ?? '—'}</td>`).join('')}
      <td style="font-weight:700;">${o.toplamNet.toFixed(2)}</td></tr>`;
  });
  html += `</tbody></table>`;
  _raporPenceresiniAc(html, `${s.ad} — Sonuç Raporu`.toLocaleUpperCase('tr'), { ortaliBaslik:true, ustBaslik: okulAdi, yon:'yatay' });
}

/* ---- 2) Bir öğrencinin tüm deneme+test geçmişi ---- */
function _ssOgrenciRaporuYazdir(ogrenciId){
  const ogrenci = (typeof veliler!=='undefined' ? veliler : []).find(v=>v.id===ogrenciId);
  if (!ogrenci || typeof _raporPenceresiniAc !== 'function') return;
  const okulAdi = (typeof okulBilgileriAyari!=='undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) || '';
  const tumKayitlar = [
    ...denemeSinavListesi.map(s=>({s, tur:'Deneme'})),
    ...testSinavListesi.map(s=>({s, tur:'Test'})),
  ].map(({s,tur}) => ({ s, tur, sonuc:(s.sonuclar||[]).find(o=>o.ogrenciId===ogrenciId) }))
   .filter(x=>x.sonuc)
   .sort((a,b)=>(a.s.tarih||'').localeCompare(b.s.tarih||''));

  let html = SS_RAPOR_STIL + `<table class="ss-rapor-tablo"><thead><tr>
    <th>Tarih</th><th>Tür</th><th>Sınav Adı</th><th>Ders Netleri</th><th>Toplam Net</th>
  </tr></thead><tbody>`;
  tumKayitlar.forEach(({s,tur,sonuc}) => {
    const dersMetni = Object.keys(sonuc.dersSonuclari||{}).map(d=>`${d}: ${sonuc.dersSonuclari[d].net.toFixed(1)}`).join(' · ');
    html += `<tr><td>${escapeHtml(s.tarih||'')}</td><td>${tur}</td><td class="ss-ad">${escapeHtml(s.ad)}</td><td style="text-align:left;font-size:9.5px;">${escapeHtml(dersMetni)}</td><td style="font-weight:700;">${sonuc.toplamNet.toFixed(2)}</td></tr>`;
  });
  html += `</tbody></table>`;
  _raporPenceresiniAc(html, `${ogrenci.ogrenciAdi} — Sınav Sonuçları Raporu`.toLocaleUpperCase('tr'), { ortaliBaslik:true, ustBaslik: okulAdi, yon:'yatay' });
}

/* ---- 3) Sınıf bazlı TÜM deneme sonuçları (net + basitleştirilmiş puan) ----
   Puan: gerçek LGS puanı değil — her SINAVIN KENDİ katılımcılarından
   hesaplanan ortalama/std sapmaya göre T-skoru (50 ortalama, 10 sapma).
   LgsPuanHesapla.standartPuanHesapla ile aynı, optik sistemle tutarlı. */
function _ssSinifRaporuModalAc(){
  const siniflarListesi = (typeof siniflar!=='undefined' ? siniflar : []).slice().sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'));
  const body = `
    <div style="display:flex;flex-direction:column;gap:2px;max-height:55vh;overflow-y:auto;">
      ${siniflarListesi.map(sn=>`
        <button class="btn btn-ghost btn-sm" style="justify-content:space-between;text-align:left;" onclick="modalKapat();_ssSinifRaporuYazdir('${sn.id}')">
          <span>${escapeHtml(sn.ad)}</span><span>›</span>
        </button>`).join('') || '<p class="empty-state">Sınıf bulunamadı.</p>'}
    </div>`;
  modalAc('Sınıf Seçin — Tüm Deneme Raporu', body, null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
}
function _ssSinifRaporuYazdir(sinifId){
  const sn = (typeof siniflar!=='undefined' ? siniflar : []).find(x=>x.id===sinifId);
  if (!sn || typeof _raporPenceresiniAc !== 'function') return;
  const sinifOgrencileri = (typeof veliler!=='undefined' ? veliler : []).filter(v=>v.sinifId===sinifId);
  // Bu sınıftan en az bir öğrencinin katıldığı denemeler, tarihe göre
  const denemeler = denemeSinavListesi
    .filter(s => (s.sonuclar||[]).some(o => sinifOgrencileri.some(og=>og.id===o.ogrenciId)))
    .sort((a,b)=>(a.tarih||'').localeCompare(b.tarih||''));
  if (!denemeler.length){ toast('Bu sınıfa ait deneme sonucu bulunamadı.'); return; }

  // Her deneme için (TÜM katılımcılarından, sadece bu sınıftan değil) ortalama/std sapma
  const istatistik = {};
  denemeler.forEach(s => {
    const netler = (s.sonuclar||[]).map(o=>o.toplamNet);
    const ort = LgsPuanHesapla.ortalamaHesapla(netler);
    const sapma = LgsPuanHesapla.stdSapmaHesapla(netler, ort);
    istatistik[s.id] = { ort, sapma };
  });

  const okulAdi = (typeof okulBilgileriAyari!=='undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) || '';
  let html = SS_RAPOR_STIL + `<table class="ss-rapor-tablo"><thead><tr>
    <th rowspan="2">Öğrenci</th>
    ${denemeler.map(s=>`<th colspan="2">${escapeHtml(s.ad)}<br><span style="font-weight:400;font-size:9px;">${escapeHtml(s.tarih||'')}</span></th>`).join('')}
  </tr><tr>${denemeler.map(()=>`<th style="font-size:9px;">Net</th><th style="font-size:9px;">Puan*</th>`).join('')}</tr></thead><tbody>`;
  sinifOgrencileri.slice().sort((a,b)=>(a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr')).forEach(og => {
    html += `<tr><td class="ss-ad">${escapeHtml(og.ogrenciAdi)}</td>`;
    denemeler.forEach(s => {
      const sonuc = (s.sonuclar||[]).find(o=>o.ogrenciId===og.id);
      if (!sonuc){ html += `<td>—</td><td>—</td>`; return; }
      const { ort, sapma } = istatistik[s.id];
      const puan = LgsPuanHesapla.standartPuanHesapla(sonuc.toplamNet, ort, sapma);
      html += `<td>${sonuc.toplamNet.toFixed(2)}</td><td>${puan.toFixed(1)}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>
    <p style="font-size:9px;color:#666;margin-top:6px;">* Puan, gerçek LGS puanı değildir — bu sınavın kendi katılımcılarına göre hesaplanan basitleştirilmiş standart puandır (ortalama 50, standart sapma 10).</p>`;
  _raporPenceresiniAc(html, `${sn.ad} — Tüm Deneme Sonuçları`.toLocaleUpperCase('tr'), { ortaliBaslik:true, ustBaslik: okulAdi, yon:'yatay' });
}
