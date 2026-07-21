/* =============================================================
   js/yillik-plan.js
   YILLIK PLAN MODÜLÜ
   ---------------------------------------------------------------
   MEB ünitelendirilmiş yıllık ders planlarının uygulama içi hâli.
   Her ders+seviye için bir "Plan Tanımı" vardır; her tanım, ortak
   bir "Ana Başlık" havuzundan (Tema, Kazanım, Etkinlik vb.) kendi
   kullandığı alt kümeyi seçer — dersler arasında sütun yapısı farklı
   olduğu için (bkz. Fen Bilimleri vs. Müzik vs. İngilizce şablonları)
   sabit sütunlu TEK bir tablo yerine bu esnek yapı kullanılıyor.

   Öğretmen, okuttuğu ders(ler) için hangi plan tanımını takip
   edeceğini SEÇER (bu seçim tamamen kişiseldir, kimseyi etkilemez).
   Haftalık kart görünümü bu ekranın ana kullanım şeklidir; referans
   tasarım (kullanıcının paylaştığı ekran görüntüsü) buna göre
   uygulanmıştır: turkuaz banner + tarih aralığı, ekranı-açık-tut
   kilidi, doldurulmuş başlıklar pill+metin olarak, boş olanlar hiç
   gösterilmez, alt gezinme "N / Toplam".
   ============================================================= */

let yillikPlanBasliklari = [];   // Ana Başlık havuzu — {id, ad, sira}
let yillikPlanTanimlari  = [];   // Plan tanımları  — {id, dersAdi, seviye, egitimOgretimYili, sutunlar:[baslikId,...], satirlar:[...]}
let _yplOgretmenSecimleri = null; // {ogretmenId, planIdler:[...]} — giriş yapan öğretmenin kendi seçimi
let _yplAcikPlanId = null;       // haftalık kart ekranında şu an açık olan plan
let _yplAcikHaftaIndex = 0;
let _yplWakeLock = null;         // Screen Wake Lock API tutamacı

/* ---------- Firestore bağlantısı (app.js baglantilariKur içinden, koşulsuz) ----------
   NOT: sosyalKulupler ile aynı gerekçe — plan tanımları ve başlık havuzu
   sadece "Yıllık Plan" sekmesine değil, Profilim üzerinden de erişilebilir
   olacağı için (ileride), tembel değil koşulsuz başlatılıyor. */
function yillikPlanBaglantilariniKur(){
  YillikPlanService.basliklariDinle(v => {
    yillikPlanBasliklari = v;
    if (typeof renderYillikPlanAnaSayfa === 'function') renderYillikPlanAnaSayfa();
  });
  YillikPlanService.tanimlariDinle(v => {
    yillikPlanTanimlari = v;
    if (typeof renderYillikPlanAnaSayfa === 'function') renderYillikPlanAnaSayfa();
  });
}

/* ================================================================
   TARİH YARDIMCILARI
   "hafta" alanı MEB dosyalarında "1.HAFTA(08-14)" biçiminde serbest
   metin olarak geliyor; buradan hafta no + gün aralığını çıkarıp,
   tanımın "egitimOgretimYili" alanına (örn. "2026-2027") göre GERÇEK
   takvim tarihine çeviriyoruz. Yıl alanı sonradan değişirse tarihler
   otomatik yeniden hesaplanır (hiçbir yerde sabit ISO tarih saklanmaz).
   ================================================================ */
const YPL_AY_NO = {
  'EYLÜL':9,'EKİM':10,'KASIM':11,'ARALIK':12,'OCAK':1,'ŞUBAT':2,
  'MART':3,'NİSAN':4,'MAYIS':5,'HAZİRAN':6,'TEMMUZ':7,'AĞUSTOS':8,
};
function _yplHaftaAyristir(hafta){
  const m = /\((\d{1,2})-(\d{1,2})\)/.exec(hafta || '');
  if (!m) return null;
  return { gunBaslangic: parseInt(m[1],10), gunBitis: parseInt(m[2],10) };
}
/* egitimOgretimYili "2026-2027" gibi bir metin — Eylül-Aralık ilk yıla,
   Ocak-Ağustos ikinci yıla denk gelir. */
function _yplSatirTarihAraligi(satir, egitimOgretimYili){
  const ayNo = YPL_AY_NO[(satir.ay||'').toLocaleUpperCase('tr')];
  const gunler = _yplHaftaAyristir(satir.hafta);
  if (!ayNo || !gunler) return null;
  const yillar = (egitimOgretimYili||'').split('-').map(y=>parseInt(y,10));
  if (yillar.length!==2 || !yillar[0]) return null;
  const yil1 = ayNo>=9 ? yillar[0] : yillar[1];
  let ayBitisNo = ayNo, yilBitis = yil1;
  if (gunler.gunBitis < gunler.gunBaslangic){ // ay sınırını aşan hafta (örn. 29 Eylül - 05 Ekim)
    ayBitisNo = ayNo===12 ? 1 : ayNo+1;
    yilBitis = ayBitisNo===1 && ayNo===12 ? yil1+1 : yil1;
  }
  const bas = new Date(yil1, ayNo-1, gunler.gunBaslangic);
  const bit = new Date(yilBitis, ayBitisNo-1, gunler.gunBitis);
  return { baslangic: bas, bitis: bit };
}
function _yplTarihMetni(satir, egitimOgretimYili){
  const ar = _yplSatirTarihAraligi(satir, egitimOgretimYili);
  if (!ar) return satir.hafta || '';
  const g = d => d.getDate();
  const aylar = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  const ayAdi = d => aylar[d.getMonth()];
  if (ar.baslangic.getMonth() === ar.bitis.getMonth()){
    return `${g(ar.baslangic)} – ${g(ar.bitis)} ${ayAdi(ar.bitis)}`;
  }
  return `${g(ar.baslangic)} ${ayAdi(ar.baslangic)} – ${g(ar.bitis)} ${ayAdi(ar.bitis)}`;
}
/* Bugünün tarihine en yakın / içine düşen hafta index'ini bulur —
   "şu an neredeyiz" gösterimi ve varsayılan açılış haftası için. */
function _yplBugunHaftaIndex(tanim){
  if (!tanim || !tanim.satirlar || !tanim.satirlar.length) return 0;
  const bugun = new Date(); bugun.setHours(0,0,0,0);
  for (let i=0;i<tanim.satirlar.length;i++){
    const ar = _yplSatirTarihAraligi(tanim.satirlar[i], tanim.egitimOgretimYili);
    if (!ar) continue;
    if (bugun >= ar.baslangic && bugun <= ar.bitis) return i;
  }
  // Bugün aralık dışındaysa (tatil/yaz), en yakın gelecekteki haftayı bul
  for (let i=0;i<tanim.satirlar.length;i++){
    const ar = _yplSatirTarihAraligi(tanim.satirlar[i], tanim.egitimOgretimYili);
    if (ar && ar.baslangic >= bugun) return i;
  }
  return 0;
}

function _yplBaslikAdi(id){ const b = yillikPlanBasliklari.find(x=>x.id===id); return b ? b.ad : id; }
function _yplTanim(id){ return yillikPlanTanimlari.find(t=>t.id===id); }

/* ================================================================
   ORTAK TABLO HTML — hem "Tüm Planı Görüntüle" ekran önizlemesinde
   hem de yazdırma çıktısında AYNI fonksiyon kullanılır (tekrar yok).
   ================================================================ */
function _yplTabloHtml(tanim){
  const sutunlar = tanim.sutunlar || [];
  let html = `<table><thead><tr><th>Ay</th><th>Hafta</th><th>Saat</th>`;
  sutunlar.forEach(sid => { html += `<th>${escapeHtml(_yplBaslikAdi(sid))}</th>`; });
  html += `</tr></thead><tbody>`;
  (tanim.satirlar||[]).forEach(satir => {
    html += `<tr><td>${escapeHtml(satir.ay||'')}</td><td>${escapeHtml(_yplTarihMetni(satir, tanim.egitimOgretimYili))}</td><td>${escapeHtml(satir.saat||'')}</td>`;
    sutunlar.forEach(sid => {
      html += `<td style="text-align:left;white-space:pre-line;">${escapeHtml((satir.degerler||{})[sid]||'')}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

/* İmza/başlık bloğu — kulüp raporundaki iki-uçlu yerleşimle birebir aynı
   desen: öğretmen solda, müdür sağda. */
function _yplImzaBlogu(){
  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  const benAdi = ben ? `${ben.ad||''} ${ben.soyad||''}`.trim() : '';
  const benBrans = ben ? (ben.brans||'') : '';
  const mudurId = (typeof okulBilgileriAyari!=='undefined' && okulBilgileriAyari) ? okulBilgileriAyari.mudurId : null;
  const mudur = mudurId ? (typeof ogretmenler!=='undefined' ? ogretmenler.find(o=>o.id===mudurId) : null) : null;
  const mudurAdi = mudur ? `${mudur.ad||''} ${mudur.soyad||''}`.trim() : '';
  const mudurUnvan = (mudur && mudur.unvan) ? mudur.unvan : 'Okul Müdürü';
  if (!benAdi && !mudurAdi) return '';
  return `<div style="display:flex;justify-content:space-between;gap:40px;flex-wrap:wrap;margin-top:36px;">
    <div style="text-align:center;">
      <div style="font-weight:700;font-size:12px;color:#1a1a1a;">${escapeHtml(benAdi||'—')}</div>
      <div style="font-size:10px;color:#666;margin-top:2px;">${escapeHtml(benBrans||'Öğretmen')}</div>
    </div>
    <div style="text-align:center;">
      <div style="font-weight:700;font-size:12px;color:#1a1a1a;">${escapeHtml(mudurAdi||'—')}</div>
      <div style="font-size:10px;color:#666;margin-top:2px;">${escapeHtml(mudurUnvan)}</div>
    </div>
  </div>`;
}

/* Rapor başlığı: Eğitim-Öğretim Yılı, Okul Adı, Ders Adı, Sınıf Adı —
   istenen 4 alan da burada, _raporPenceresiniAc'ın ustBaslik + ortaliBaslik
   seçenekleriyle birlikte kullanılıyor (raporlama.js'teki kulüp raporuyla
   aynı, halihazırda Android/Türkçe/z-index sorunları çözülmüş boru hattı). */
function yillikPlaniYazdir(planId){
  const tanim = _yplTanim(planId);
  if (!tanim || typeof _raporPenceresiniAc !== 'function') return;
  const okulAdi = (typeof okulBilgileriAyari!=='undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) || 'Okul Yönetim Paneli';
  const seviyeMetni = `${tanim.seviye}. Sınıf`;
  const baslik = `${tanim.egitimOgretimYili||''} EĞİTİM ÖĞRETİM YILI — ${(tanim.dersAdi||'').toLocaleUpperCase('tr')} DERSİ — ${seviyeMetni} — ÜNİTELENDİRİLMİŞ YILLIK PLAN`.toLocaleUpperCase('tr');
  const html = _yplTabloHtml(tanim) + _yplImzaBlogu();
  _raporPenceresiniAc(html, baslik, { ortaliBaslik:true, ustBaslik: okulAdi });
}

/* "Tüm Planı Görüntüle" — ekranda kaydırılabilir tam tablo önizlemesi,
   yazdırmayla aynı içerik üretici fonksiyonu kullanır. */
function yillikPlanTumunuGoster(planId){
  const tanim = _yplTanim(planId);
  if (!tanim) return;
  const gov = `
    <div style="font-size:12px;color:var(--ink-muted);margin-bottom:10px;">
      ${escapeHtml(tanim.egitimOgretimYili||'')} · ${escapeHtml(tanim.dersAdi||'')} · ${tanim.seviye}. Sınıf
    </div>
    <div style="overflow-x:auto;">${_yplTabloHtml(tanim)}</div>
  `;
  modalAc(`📖 ${tanim.dersAdi} — Tüm Plan`, gov, null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
}

/* ================================================================
   EKRANI AÇIK TUTMA (Wake Lock) — kilit ikonunun tek görevi bu;
   "salt okunur" ile HİÇBİR ilgisi yok. Tarayıcı desteklemiyorsa
   (Screen Wake Lock API), buton sessizce devre dışı kalır.
   ================================================================ */
async function _yplEkraniAcikTut(ac){
  try {
    if (ac){
      if ('wakeLock' in navigator){
        _yplWakeLock = await navigator.wakeLock.request('screen');
        _yplWakeLock.addEventListener('release', () => { _yplWakeLock = null; _yplKilitIkonuGuncelle(); });
      } else {
        toast('Bu cihaz/tarayıcı ekranı açık tutma özelliğini desteklemiyor.');
        return;
      }
    } else if (_yplWakeLock) {
      await _yplWakeLock.release();
      _yplWakeLock = null;
    }
  } catch (e) { console.warn('Wake lock hatası:', e); }
  _yplKilitIkonuGuncelle();
}
function _yplKilitIkonuGuncelle(){
  const btn = document.getElementById('yplKilitBtn');
  if (!btn) return;
  const acik = !!_yplWakeLock;
  btn.textContent = acik ? '🔒' : '🔓';
  btn.title = acik ? 'Ekran açık kalıyor — kapatmak için dokunun' : 'Ekranın kararmasını engellemek için dokunun';
}
function yplKilitTikla(){ _yplEkraniAcikTut(!_yplWakeLock); }

/* ================================================================
   HAFTALIK KART GÖRÜNÜMÜ
   ================================================================ */
function yillikPlanHaftaAc(planId, haftaIndex){
  const tanim = _yplTanim(planId);
  if (!tanim) { toast('Plan bulunamadı.'); return; }
  _yplAcikPlanId = planId;
  _yplAcikHaftaIndex = Math.max(0, Math.min(haftaIndex ?? _yplBugunHaftaIndex(tanim), (tanim.satirlar||[]).length - 1));

  const ov = document.createElement('div');
  ov.id = 'yplHaftaOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9600;background:var(--bg-app);overflow-y:auto;';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-sidebar);color:var(--ink-on-dark);position:sticky;top:0;z-index:2;">
      <button class="btn btn-ghost btn-sm" onclick="yillikPlanHaftaKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Kapat</button>
      <div style="text-align:center;flex:1;font-weight:700;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 8px;">${escapeHtml(tanim.dersAdi)} · ${tanim.seviye}. Sınıf</div>
      <div style="display:flex;gap:4px;">
        <button class="btn btn-ghost btn-sm" id="yplKilitBtn" onclick="yplKilitTikla()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-size:16px;" title="Ekranın kararmasını engellemek için dokunun">🔓</button>
        <button class="btn btn-ghost btn-sm" onclick="yplMenuAc('${planId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">⋮</button>
      </div>
    </div>
    <div id="yplHaftaGovde"></div>
  `;
  _yplHaftaGovdeCiz();
}
function yillikPlanHaftaKapat(){
  if (_yplWakeLock) _yplEkraniAcikTut(false);
  const ov = document.getElementById('yplHaftaOverlay');
  if (ov) ov.remove();
  document.body.classList.remove('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
}
function _yplHaftaGovdeCiz(){
  const tanim = _yplTanim(_yplAcikPlanId);
  const govde = document.getElementById('yplHaftaGovde');
  if (!tanim || !govde) return;
  const satirlar = tanim.satirlar || [];
  const satir = satirlar[_yplAcikHaftaIndex];
  if (!satir) { govde.innerHTML = '<p class="empty-state" style="padding:24px;">Bu planda hafta bulunmuyor.</p>'; return; }

  const pilller = (tanim.sutunlar||[]).map(sid => {
    const deger = (satir.degerler||{})[sid];
    if (!deger) return ''; // veri yoksa başlık HİÇ gösterilmez
    return `
      <div style="margin-bottom:18px;">
        <span style="display:inline-block;background:var(--brand);color:#fff;font-weight:700;font-size:13px;padding:8px 16px;border-radius:20px;margin-bottom:10px;">${escapeHtml(_yplBaslikAdi(sid))}</span>
        <div style="font-size:14.5px;color:var(--ink);white-space:pre-line;line-height:1.5;">${escapeHtml(deger)}</div>
      </div>`;
  }).join('');

  govde.innerHTML = `
    <div style="background:var(--brand);color:#fff;text-align:center;font-size:20px;font-weight:700;padding:16px;">
      ${escapeHtml(_yplTarihMetni(satir, tanim.egitimOgretimYili))}
    </div>
    <div style="background:var(--brand-light);padding:20px 18px 90px;min-height:calc(100vh - 130px);">
      ${pilller || '<p class="empty-state">Bu hafta için içerik girilmemiş.</p>'}
      <div id="yplNotAlani"></div>
    </div>
    <div style="position:sticky;bottom:0;background:var(--bg-app);border-top:1px solid var(--border);padding:10px 16px;display:flex;align-items:center;justify-content:space-between;">
      <button class="btn btn-ghost btn-sm" ${_yplAcikHaftaIndex===0?'disabled style="opacity:.3;"':''} onclick="yplHaftaDegistir(-1)">‹ Önceki</button>
      <span style="font-size:12.5px;color:var(--ink-muted);font-weight:600;">${_yplAcikHaftaIndex+1} / ${satirlar.length}</span>
      <button class="btn btn-ghost btn-sm" ${_yplAcikHaftaIndex===satirlar.length-1?'disabled style="opacity:.3;"':''} onclick="yplHaftaDegistir(1)">Sonraki ›</button>
    </div>
  `;
  _yplNotAlaniCiz();
}
function yplHaftaDegistir(delta){
  const tanim = _yplTanim(_yplAcikPlanId);
  if (!tanim) return;
  const yeni = _yplAcikHaftaIndex + delta;
  if (yeni < 0 || yeni >= (tanim.satirlar||[]).length) return;
  _yplAcikHaftaIndex = yeni;
  _yplHaftaGovdeCiz();
  const ov = document.getElementById('yplHaftaOverlay');
  if (ov) ov.scrollTop = 0;
}

/* ================================================================
   HAFTAYA ÖZEL NOT — genel Notlar modülünden bağımsız, sadece bu
   hafta+plan+öğretmen üçlüsüne ait TEK bir bilgi notu.
   ================================================================ */
let _yplNotVerisi = {}; // {planId: {haftaIndex: metin}} — açık planın notları önbelleği
function _yplNotAlaniCiz(){
  const alan = document.getElementById('yplNotAlani');
  if (!alan) return;
  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  if (!ben){ alan.innerHTML = ''; return; }
  const cached = (_yplNotVerisi[_yplAcikPlanId]||{})[_yplAcikHaftaIndex];
  if (cached !== undefined){
    _yplNotAlaniDoldur(cached);
  } else {
    alan.innerHTML = `<div style="text-align:center;padding:10px;"><span style="font-size:12px;color:var(--ink-muted);">Not yükleniyor…</span></div>`;
    YillikPlanService.notlariGetir(ben.id, _yplAcikPlanId).then(doc => {
      const notlar = (doc.exists && doc.data().notlar) || {};
      _yplNotVerisi[_yplAcikPlanId] = notlar;
      if (_yplAcikPlanId && document.getElementById('yplNotAlani')) _yplNotAlaniDoldur(notlar[_yplAcikHaftaIndex] || '');
    }).catch(()=>{ _yplNotAlaniDoldur(''); });
  }
}
function _yplNotAlaniDoldur(metin){
  const alan = document.getElementById('yplNotAlani');
  if (!alan) return;
  if (metin){
    alan.innerHTML = `
      <div style="background:#fff;border:1px solid rgba(0,0,0,0.12);border-radius:12px;padding:14px;margin-top:8px;">
        <div style="font-size:11px;font-weight:700;color:var(--brand);margin-bottom:6px;">📝 NOTUM</div>
        <div style="font-size:13.5px;white-space:pre-line;margin-bottom:10px;">${escapeHtml(metin)}</div>
        <button class="btn btn-ghost btn-sm" onclick="yplNotDuzenle()">Düzenle</button>
      </div>`;
  } else {
    alan.innerHTML = `<button class="btn btn-ghost btn-sm" style="margin-top:8px;" onclick="yplNotDuzenle()">📝 Not Ekle</button>`;
  }
}
function yplNotDuzenle(){
  const mevcut = (_yplNotVerisi[_yplAcikPlanId]||{})[_yplAcikHaftaIndex] || '';
  const body = `<div class="form-group"><label>Bu haftayla ilgili notunuz</label><textarea id="f_yplNot" rows="4" placeholder="örn. bu hafta materyal getirilecek, önceki konuyla bağlantı kurulacak...">${escapeHtml(mevcut)}</textarea></div>`;
  modalAc('📝 Hafta Notu', body, () => {
    const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
    if (!ben){ modalKapat(); return; }
    const metin = document.getElementById('f_yplNot').value.trim();
    _yplNotVerisi[_yplAcikPlanId] = _yplNotVerisi[_yplAcikPlanId] || {};
    _yplNotVerisi[_yplAcikPlanId][_yplAcikHaftaIndex] = metin;
    YillikPlanService.notKaydet(ben.id, _yplAcikPlanId, _yplAcikHaftaIndex, metin)
      .then(()=>toast('Not kaydedildi.'))
      .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
    _yplNotAlaniDoldur(metin);
  });
}

/* ================================================================
   ⋮ SEÇENEKLER MENÜSÜ — Tüm Planı Görüntüle / Haftaya Git / Yazdır
   ================================================================ */
function yplMenuAc(planId){
  const body = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <button class="btn btn-ghost" style="justify-content:flex-start;" onclick="modalKapat();yillikPlanTumunuGoster('${planId}')">📖 Tüm Planı Görüntüle</button>
      <button class="btn btn-ghost" style="justify-content:flex-start;" onclick="modalKapat();yillikPlanHaftayaGit('${planId}')">🗓 Haftaya Git</button>
      <button class="btn btn-ghost" style="justify-content:flex-start;" onclick="modalKapat();yillikPlaniYazdir('${planId}')">🖨 Planı Yazdır</button>
    </div>`;
  modalAc('Seçenekler', body, null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
}
function yillikPlanHaftayaGit(planId){
  const tanim = _yplTanim(planId);
  if (!tanim) return;
  const body = `
    <div style="display:flex;flex-direction:column;gap:2px;max-height:60vh;overflow-y:auto;">
      ${(tanim.satirlar||[]).map((s,i)=>`
        <button class="btn btn-ghost btn-sm" style="justify-content:space-between;text-align:left;" onclick="modalKapat();yillikPlanHaftaGit(${i})">
          <span>${escapeHtml(s.ay||'')} · ${escapeHtml(_yplTarihMetni(s, tanim.egitimOgretimYili))}</span>
          <span style="color:var(--ink-muted);">${i+1}</span>
        </button>`).join('')}
    </div>`;
  modalAc('🗓 Haftaya Git', body, null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
}
function yillikPlanHaftaGit(index){
  _yplAcikHaftaIndex = index;
  _yplHaftaGovdeCiz();
  const ov = document.getElementById('yplHaftaOverlay');
  if (ov) ov.scrollTop = 0;
}

/* ================================================================
   ANA EKRAN — "Takip Ettiğim Planlar" (herkes) + "Plan Tanımları
   Yönetimi" (sadece yillikPlan düzenleme yetkisi olan admin).
   ================================================================ */
function renderYillikPlanAnaSayfa(){
  const panel = document.getElementById('tab-yillikPlan');
  if (!panel) return;
  const yetkiVar = typeof duzenleyebilir==='function' && duzenleyebilir('yillikPlan');
  const yonBtn = document.getElementById('yplYonetimButonlari');
  const yonKart = document.getElementById('yplYonetimKarti');
  if (yonBtn) yonBtn.style.display = yetkiVar ? 'flex' : 'none';
  if (yonKart) yonKart.style.display = yetkiVar ? '' : 'none';

  _yplTakipListesiCiz();
  if (yetkiVar) _yplTanimListesiCiz();
}

function _yplTakipListesiCiz(){
  const el = document.getElementById('yplTakipListesi');
  if (!el) return;
  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  if (!ben){ el.innerHTML = '<p class="empty-state">Profilinize bağlı bir öğretmen kaydı bulunamadı.</p>'; return; }

  if (!_yplOgretmenSecimleri || _yplOgretmenSecimleri._ogretmenId !== ben.id){
    el.innerHTML = '<p class="empty-state">Yükleniyor…</p>';
    YillikPlanService.secimGetir(ben.id).then(doc => {
      _yplOgretmenSecimleri = { _ogretmenId: ben.id, planIdler: (doc.exists && doc.data().planIdler) || [] };
      _yplTakipListesiCiz();
    }).catch(()=>{ _yplOgretmenSecimleri = { _ogretmenId: ben.id, planIdler: [] }; _yplTakipListesiCiz(); });
    return;
  }

  const takipEdilenler = _yplOgretmenSecimleri.planIdler.map(id=>_yplTanim(id)).filter(Boolean);
  el.innerHTML = takipEdilenler.length ? takipEdilenler.map(t=>{
    const bugunIndex = _yplBugunHaftaIndex(t);
    const bugunSatir = (t.satirlar||[])[bugunIndex];
    const tema = bugunSatir ? ((bugunSatir.degerler||{})[t.sutunlar[0]] || '') : '';
    return `
      <div class="detay-row" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;" onclick="yillikPlanHaftaAc('${t.id}')">
        <div>
          <div style="font-weight:700;">${escapeHtml(t.dersAdi)} <span style="color:var(--ink-muted);font-weight:400;">· ${t.seviye}. Sınıf</span></div>
          ${tema ? `<div style="font-size:11.5px;color:var(--ink-muted);margin-top:2px;">Bu hafta: ${escapeHtml(tema.slice(0,60))}${tema.length>60?'…':''}</div>` : ''}
        </div>
        <span style="color:var(--ink-muted);">›</span>
      </div>`;
  }).join('') : '<p class="empty-state">Henüz bir plan seçmediniz. Aşağıdaki "Plan Ekle" ile başlayın.</p>';
}

function yillikPlanSecimModalAc(){
  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  if (!ben){ toast('Profilinize bağlı bir öğretmen kaydı bulunamadı.'); return; }
  const secili = new Set((_yplOgretmenSecimleri && _yplOgretmenSecimleri.planIdler) || []);
  const gruplu = {};
  yillikPlanTanimlari.forEach(t=>{ (gruplu[t.dersAdi] = gruplu[t.dersAdi] || []).push(t); });

  const body = `
    <p style="font-size:12px;color:var(--ink-muted);margin-bottom:10px;">Okuttuğunuz ders(ler)e ait planları işaretleyin.</p>
    <div style="max-height:55vh;overflow-y:auto;">
      ${Object.keys(gruplu).sort((a,b)=>a.localeCompare(b,'tr')).map(ders=>`
        <div style="margin-bottom:10px;">
          <div style="font-weight:700;font-size:12.5px;margin-bottom:4px;">${escapeHtml(ders)}</div>
          ${gruplu[ders].sort((a,b)=>a.seviye-b.seviye).map(t=>`
            <label class="ogr-cb-row"><input type="checkbox" class="ypl-secim-cb" value="${t.id}" ${secili.has(t.id)?'checked':''}><span>${t.seviye}. Sınıf — ${escapeHtml(t.egitimOgretimYili||'')}</span></label>
          `).join('')}
        </div>`).join('') || '<p class="empty-state">Henüz hiç plan tanımı oluşturulmamış.</p>'}
    </div>`;
  modalAc('🎯 Plan Ekle / Değiştir', body, () => {
    const yeniSecim = Array.from(document.querySelectorAll('.ypl-secim-cb:checked')).map(cb=>cb.value);
    YillikPlanService.secimKaydet(ben.id, yeniSecim).then(()=>{
      _yplOgretmenSecimleri = { _ogretmenId: ben.id, planIdler: yeniSecim };
      _yplTakipListesiCiz();
      toast('Kaydedildi.');
    }).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  });
}

/* ================================================================
   ADMİN — Plan Tanımları Yönetimi
   ================================================================ */
function _yplTanimListesiCiz(){
  const el = document.getElementById('yplTanimListesi');
  if (!el) return;
  el.innerHTML = yillikPlanTanimlari.length ? yillikPlanTanimlari
    .sort((a,b)=> a.seviye-b.seviye || (a.dersAdi||'').localeCompare(b.dersAdi||'','tr'))
    .map(t=>`
      <div class="detay-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div>
          <div style="font-weight:700;">${escapeHtml(t.dersAdi)} <span class="badge badge-blue">${t.seviye}. Sınıf</span></div>
          <div style="font-size:11.5px;color:var(--ink-muted);margin-top:2px;">${escapeHtml(t.egitimOgretimYili||'')} · ${(t.satirlar||[]).length} hafta · ${(t.sutunlar||[]).length} başlık</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" onclick="yillikPlanTumunuGoster('${t.id}')">👁 Görüntüle</button>
          <button class="btn btn-ghost btn-sm" onclick="yillikPlanTanimModalAc('${t.id}')">Düzenle</button>
          <button class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="yillikPlanTanimSilOnay('${t.id}')">Sil</button>
        </div>
      </div>`).join('') : '<p class="empty-state">Henüz plan tanımı yok. "Yeni Plan Tanımı" veya "Örnek Planları İçe Aktar" ile başlayın.</p>';
}

function yillikPlanTanimModalAc(id){
  const t = id ? _yplTanim(id) : null;
  const secili = new Set(t ? t.sutunlar : []);
  const body = `
    <div class="form-row">
      <div class="form-group"><label>Ders Adı</label><input id="f_yplDers" value="${t?escapeHtml(t.dersAdi):''}" placeholder="örn: Fen Bilimleri"></div>
      <div class="form-group" style="flex:0 0 110px;"><label>Sınıf Seviyesi</label>
        <select id="f_yplSeviye">${[1,2,3,4,5,6,7,8].map(s=>`<option value="${s}" ${t&&t.seviye===s?'selected':''}>${s}. Sınıf</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group"><label>Eğitim-Öğretim Yılı</label><input id="f_yplYil" value="${t?escapeHtml(t.egitimOgretimYili||''):'2026-2027'}" placeholder="örn: 2026-2027"></div>
    <div class="form-group">
      <label>Bu Ders Hangi Ana Başlıkları Kullansın?</label>
      <div class="ogr-checkbox-liste">
        ${yillikPlanBasliklari.map(b=>`<label class="ogr-cb-row"><input type="checkbox" class="ypl-baslik-cb" value="${b.id}" ${secili.has(b.id)?'checked':''}><span>${escapeHtml(b.ad)}</span></label>`).join('') || '<p class="empty-state">Önce "Ana Başlıklar" ekranından başlık ekleyin.</p>'}
      </div>
      <p style="font-size:11px;color:var(--ink-muted);margin-top:4px;">Sadece işaretlediğiniz başlıklar bu derste gösterilir; veri girilmeyen hafta+başlık kombinasyonu otomatik atlanır.</p>
    </div>
    ${t ? `<button type="button" class="btn btn-ghost btn-sm" onclick="modalKapat();yillikPlanHaftaSatirlariniDuzenle('${t.id}')">📋 Hafta Satırlarını Düzenle (${(t.satirlar||[]).length})</button>` : ''}
  `;
  modalAc(t?'Plan Tanımını Düzenle':'Yeni Plan Tanımı', body, () => {
    const dersAdi = document.getElementById('f_yplDers').value.trim();
    if (!dersAdi){ toast('Ders adı zorunludur.'); return; }
    const sutunlar = Array.from(document.querySelectorAll('.ypl-baslik-cb:checked')).map(cb=>cb.value);
    const veri = {
      dersAdi,
      seviye: parseInt(document.getElementById('f_yplSeviye').value, 10),
      egitimOgretimYili: document.getElementById('f_yplYil').value.trim(),
      sutunlar,
    };
    if (t){
      YillikPlanService.tanimGuncelle(t.id, veri).then(()=>toast('Kaydedildi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    } else {
      veri.satirlar = [];
      YillikPlanService.tanimEkle(veri).then(()=>toast('Plan tanımı oluşturuldu — şimdi hafta satırlarını ekleyebilirsiniz.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    }
    modalKapat();
  }, t ? () => { if(confirm(`"${t.dersAdi} — ${t.seviye}. Sınıf" plan tanımını silmek istediğinize emin misiniz?`)){ YillikPlanService.tanimSil(t.id).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }); modalKapat(); } } : null);
}
function yillikPlanTanimSilOnay(id){
  const t = _yplTanim(id);
  if (!t) return;
  if (!confirm(`"${t.dersAdi} — ${t.seviye}. Sınıf" plan tanımını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
  YillikPlanService.tanimSil(id).then(()=>toast('Silindi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ================================================================
   ADMİN — Ana Başlık Havuzu Yönetimi
   ================================================================ */
function yillikPlanBaslikYonetimiAc(){
  const body = `
    <p style="font-size:12px;color:var(--ink-muted);margin-bottom:10px;">Bu liste tüm derslerin ortak kullandığı başlık havuzudur. Yeni bir ders farklı bir başlığa ihtiyaç duyarsa buradan ekleyin.</p>
    <div id="yplBaslikListesi" style="display:flex;flex-direction:column;gap:4px;max-height:45vh;overflow-y:auto;margin-bottom:10px;">
      ${yillikPlanBasliklari.map(b=>`
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-soft);">
          <span>${escapeHtml(b.ad)}</span>
          <button type="button" class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="_yplBaslikSil('${b.id}')">Sil</button>
        </div>`).join('') || '<p class="empty-state">Henüz başlık yok.</p>'}
    </div>
    <div class="form-row" style="align-items:flex-end;">
      <div class="form-group" style="flex:1;"><label>Yeni Başlık Adı</label><input id="f_yplYeniBaslik" placeholder="örn: Etkinlikler"></div>
      <button type="button" class="btn btn-amber btn-sm" onclick="_yplBaslikEkle()">Ekle</button>
    </div>`;
  modalAc('🏷️ Ana Başlıklar', body, null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
}
function _yplBaslikEkle(){
  const input = document.getElementById('f_yplYeniBaslik');
  const ad = input.value.trim();
  if (!ad) return;
  YillikPlanService.baslikEkle({ ad, sira: yillikPlanBasliklari.length })
    .then(()=>{ input.value=''; setTimeout(yillikPlanBaslikYonetimiAc, 250); })
    .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}
function _yplBaslikSil(id){
  const kullaniliyor = yillikPlanTanimlari.some(t=>(t.sutunlar||[]).includes(id));
  if (kullaniliyor && !confirm('Bu başlık en az bir plan tanımında kullanılıyor. Yine de silmek istiyor musunuz? (O plandaki bu başlığa ait veriler artık gösterilmez, ama silinmez.)')) return;
  YillikPlanService.baslikSil(id).then(()=>setTimeout(yillikPlanBaslikYonetimiAc, 250)).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ================================================================
   ADMİN — Hafta Satırlarını Düzenle (manuel bakım)
   ================================================================ */
function yillikPlanHaftaSatirlariniDuzenle(planId){
  const t = _yplTanim(planId);
  if (!t) return;
  const body = `
    <div style="display:flex;flex-direction:column;gap:2px;max-height:55vh;overflow-y:auto;margin-bottom:10px;">
      ${(t.satirlar||[]).map((s,i)=>`
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-soft);">
          <span style="font-size:12.5px;">${i+1}. ${escapeHtml(s.ay||'')} — ${escapeHtml(_yplTarihMetni(s, t.egitimOgretimYili))}</span>
          <div style="display:flex;gap:4px;">
            <button type="button" class="btn btn-ghost btn-sm" onclick="modalKapat();_yplSatirDuzenleModalAc('${planId}',${i})">Düzenle</button>
            <button type="button" class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="_yplSatirSil('${planId}',${i})">Sil</button>
          </div>
        </div>`).join('') || '<p class="empty-state">Henüz hafta satırı yok.</p>'}
    </div>
    <button type="button" class="btn btn-amber btn-sm" onclick="modalKapat();_yplSatirDuzenleModalAc('${planId}', null)">➕ Yeni Hafta Ekle</button>
  `;
  modalAc(`📋 ${t.dersAdi} — Hafta Satırları`, body, null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
  document.getElementById('modalKaydetBtn').style.display = 'none';
}
function _yplSatirDuzenleModalAc(planId, index){
  const t = _yplTanim(planId);
  if (!t) return;
  const satir = (index!==null && index!==undefined) ? t.satirlar[index] : null;
  const body = `
    <div class="form-row">
      <div class="form-group"><label>Ay</label><input id="f_yplAy" value="${satir?escapeHtml(satir.ay):''}" placeholder="örn: EYLÜL"></div>
      <div class="form-group"><label>Hafta (gün aralığı ile)</label><input id="f_yplHafta" value="${satir?escapeHtml(satir.hafta):''}" placeholder="örn: 1.HAFTA(08-14)"></div>
      <div class="form-group" style="flex:0 0 90px;"><label>Saat</label><input id="f_yplSaat" value="${satir?escapeHtml(satir.saat):''}" placeholder="4 SAAT"></div>
    </div>
    ${(t.sutunlar||[]).map(sid=>`
      <div class="form-group"><label>${escapeHtml(_yplBaslikAdi(sid))}</label><textarea id="f_ypl_${sid}" rows="2">${satir?escapeHtml((satir.degerler||{})[sid]||''):''}</textarea></div>
    `).join('')}
  `;
  modalAc(satir?'Hafta Satırını Düzenle':'Yeni Hafta Ekle', body, () => {
    const yeniSatir = {
      ay: document.getElementById('f_yplAy').value.trim(),
      hafta: document.getElementById('f_yplHafta').value.trim(),
      saat: document.getElementById('f_yplSaat').value.trim(),
      degerler: {},
    };
    (t.sutunlar||[]).forEach(sid => {
      const val = document.getElementById(`f_ypl_${sid}`).value.trim();
      if (val) yeniSatir.degerler[sid] = val;
    });
    const satirlar = (t.satirlar||[]).slice();
    if (index!==null && index!==undefined) satirlar[index] = yeniSatir; else satirlar.push(yeniSatir);
    YillikPlanService.tanimGuncelle(t.id, { satirlar })
      .then(()=>{ toast('Kaydedildi.'); modalKapat(); setTimeout(()=>yillikPlanHaftaSatirlariniDuzenle(planId), 250); })
      .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
  });
}
function _yplSatirSil(planId, index){
  const t = _yplTanim(planId);
  if (!t || !confirm('Bu hafta satırını silmek istediğinize emin misiniz?')) return;
  const satirlar = (t.satirlar||[]).slice();
  satirlar.splice(index, 1);
  YillikPlanService.tanimGuncelle(t.id, { satirlar })
    .then(()=>{ toast('Silindi.'); setTimeout(()=>yillikPlanHaftaSatirlariniDuzenle(planId), 250); })
    .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ================================================================
   ADMİN — Örnek Planları İçe Aktar (tek seferlik, YILLIK_PLAN_TOHUM_VERI)
   Zaten mevcut aynı ders+seviye tanımı varsa TEKRAR eklemez (idempotent).
   ================================================================ */
function yillikPlanOrnekVerileriIceAktar(){
  if (typeof YILLIK_PLAN_TOHUM_VERI === 'undefined'){ toast('Tohum veri dosyası bulunamadı.'); return; }
  if (!confirm('Fen Bilimleri, Matematik, Müzik (6.sınıf), Görsel Sanatlar (5.sınıf) ve İngilizce (6.sınıf) örnek yıllık planları içe aktarılacak. Devam edilsin mi?')) return;

  const baslikIslemleri = YILLIK_PLAN_TOHUM_VERI.baslikKatalogu
    .filter(b => !yillikPlanBasliklari.some(mevcut => mevcut.ad === b.ad))
    .map(b => YillikPlanService.baslikEkle({ ad: b.ad, sira: yillikPlanBasliklari.length + b.sira }));

  Promise.all(baslikIslemleri).then(() => {
    // Başlık id eşleştirmesi ADA göre yapılıyor (Firestore id'leri farklı
    // olacağı için tohum veride kullanılan kısa key'ler değil, GÜNCEL
    // başlık listesindeki id'ler kullanılmalı).
    setTimeout(() => {
      const adIdEslesme = {};
      yillikPlanBasliklari.forEach(b => { adIdEslesme[b.ad] = b.id; });
      const kisaAdHaritasi = {};
      YILLIK_PLAN_TOHUM_VERI.baslikKatalogu.forEach(b => { kisaAdHaritasi[b.id] = b.ad; });

      const tanimIslemleri = YILLIK_PLAN_TOHUM_VERI.tanimlar
        .filter(t => !yillikPlanTanimlari.some(m => m.dersAdi === t.dersAdi && m.seviye === t.seviye))
        .map(t => {
          const sutunlar = t.sutunlar.map(kisaId => adIdEslesme[kisaAdHaritasi[kisaId]]).filter(Boolean);
          const satirlar = t.satirlar.map(s => {
            const degerler = {};
            Object.keys(s.degerler||{}).forEach(kisaId => {
              const gercekId = adIdEslesme[kisaAdHaritasi[kisaId]];
              if (gercekId) degerler[gercekId] = s.degerler[kisaId];
            });
            return { ay: s.ay, hafta: s.hafta, saat: s.saat, degerler };
          });
          return YillikPlanService.tanimEkle({
            dersAdi: t.dersAdi, seviye: t.seviye, egitimOgretimYili: t.egitimOgretimYili,
            sutunlar, satirlar,
          });
        });
      Promise.all(tanimIslemleri).then(() => toast(`${tanimIslemleri.length} plan içe aktarıldı.`))
        .catch(err => toast('Hata: '+err.message));
    }, 600); // Firestore dinleyicisinin yeni başlıkları yillikPlanBasliklari'na yansıtması için kısa bekleme
  }).catch(err => { if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ================================================================
   WORD (.docx) DOSYASINDAN İÇE AKTARMA
   ---------------------------------------------------------------
   Uygulamada zaten yüklü olan mammoth.js (bkz. js/dokuman-okuyucu.js)
   ile istemci tarafında (sunucuya hiç gitmeden) dosyayı HTML'e çevirip
   içindeki EN BÜYÜK tabloyu satır/sütun olarak ayrıştırıyoruz. Her ders
   farklı sütun adları kullandığı için (Fen Bilimleri'nde "ÜNİTE",
   Müzik'te "ÜNİTE KONU" vb.) sütun eşleştirmesini KULLANICI yapar —
   ilk 3 sütun otomatik olarak Ay/Hafta/Saat'e önerilir (MEB
   şablonlarının tamamında bu sıradadır), geri kalanlar için "Ana
   Başlık" havuzundan seçim yapılır ya da yeni başlık oluşturulur.
   ================================================================ */
let _yplIceAktarSatirlar = null; // [[hücre, hücre, ...], ...] — ayrıştırılan ham tablo (0. satır: başlıklar)

function yillikPlanWordIceAktarAc(){
  if (typeof mammoth === 'undefined'){ toast('Word okuma kütüphanesi yüklenemedi.'); return; }
  _yplIceAktarSatirlar = null;
  const body = `
    <div class="form-row">
      <div class="form-group"><label>Ders Adı</label><input id="f_yplwDers" placeholder="örn: Sosyal Bilgiler"></div>
      <div class="form-group" style="flex:0 0 110px;"><label>Sınıf Seviyesi</label>
        <select id="f_yplwSeviye">${[1,2,3,4,5,6,7,8].map(s=>`<option value="${s}" ${s===6?'selected':''}>${s}. Sınıf</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group"><label>Eğitim-Öğretim Yılı</label><input id="f_yplwYil" value="2026-2027"></div>
    <div class="form-group">
      <label>Yıllık Plan Dosyası (.docx)</label>
      <input type="file" id="f_yplwDosya" accept=".docx" onchange="_yplWordDosyaSecildi(this.files[0])">
    </div>
    <div id="yplwEslesmeAlani"></div>
  `;
  modalAc('⇪ Word\'den İçe Aktar', body, () => _yplIceAktarKaydet(), null, 'Sütunları Eşleştirdim, Kaydet');
  // Eşleştirme yapılmadan kaydedilemesin diye, tablo ayrıştırılana kadar buton devre dışı
  const kaydetBtn = document.getElementById('modalKaydetBtn');
  if (kaydetBtn) kaydetBtn.disabled = true;
}

async function _yplWordDosyaSecildi(dosya){
  const alan = document.getElementById('yplwEslesmeAlani');
  if (!dosya || !alan) return;
  alan.innerHTML = `<p style="font-size:12px;color:var(--ink-muted);padding:10px 0;">Dosya okunuyor…</p>`;
  try {
    const buf = await dosya.arrayBuffer();
    const sonuc = await mammoth.convertToHtml({ arrayBuffer: buf });
    const gecici = document.createElement('div');
    gecici.innerHTML = sonuc.value;
    const tablolar = Array.from(gecici.querySelectorAll('table'));
    if (!tablolar.length){ alan.innerHTML = `<p style="color:#c0392b;font-size:12px;">Bu dosyada bir tablo bulunamadı.</p>`; return; }
    // Birden fazla tablo varsa en çok satırlı olanı (asıl yıllık plan tablosu) kullan.
    const tablo = tablolar.sort((a,b)=> b.querySelectorAll('tr').length - a.querySelectorAll('tr').length)[0];
    const satirlarDom = Array.from(tablo.querySelectorAll('tr'));
    _yplIceAktarSatirlar = satirlarDom.map(tr =>
      Array.from(tr.querySelectorAll('th,td')).map(td => (td.textContent||'').replace(/\s+/g,' ').replace(/^[#=]+/,'').trim())
    );
    _yplEslesmeFormuCiz();
  } catch (e) {
    alan.innerHTML = `<p style="color:#c0392b;font-size:12px;">Dosya okunamadı: ${escapeHtml(e.message)}</p>`;
  }
}

function _yplEslesmeFormuCiz(){
  const alan = document.getElementById('yplwEslesmeAlani');
  if (!alan || !_yplIceAktarSatirlar || !_yplIceAktarSatirlar.length) return;
  const basliklar = _yplIceAktarSatirlar[0];
  const ornekSatir = _yplIceAktarSatirlar[1] || [];
  const sistemSecenekleri = ['','ay','hafta','saat'];
  const sistemEtiket = { ay:'Ay (sistem)', hafta:'Hafta (sistem)', saat:'Saat (sistem)' };

  alan.innerHTML = `
    <p style="font-size:12px;color:var(--ink-muted);margin:10px 0;">${basliklar.length} sütun, ${_yplIceAktarSatirlar.length-1} veri satırı bulundu. Her sütunun neyi karşıladığını seçin — MEB şablonlarında ilk 3 sütun genelde Ay/Hafta/Saat'tir, otomatik önerdik.</p>
    <div style="display:flex;flex-direction:column;gap:8px;max-height:45vh;overflow-y:auto;">
      ${basliklar.map((baslikMetni, i) => `
        <div style="border:1px solid var(--border);border-radius:8px;padding:8px 10px;">
          <div style="font-weight:700;font-size:12.5px;">${escapeHtml(baslikMetni || '(başlıksız sütun)')}</div>
          <div style="font-size:11px;color:var(--ink-muted);margin:2px 0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">örn: ${escapeHtml((ornekSatir[i]||'').slice(0,60))}</div>
          <select class="ypl-eslesme-select" data-index="${i}" onchange="_yplEslesmeYeniBaslikGoster(this)">
            <option value="">— Yoksay (bu sütunu alma) —</option>
            <optgroup label="Sistem Alanları">
              ${sistemSecenekleri.slice(1).map(s=>`<option value="sys:${s}" ${i===sistemSecenekleri.indexOf(s)?'selected':''}>${sistemEtiket[s]}</option>`).join('')}
            </optgroup>
            <optgroup label="Ana Başlıklar">
              ${yillikPlanBasliklari.map(b=>`<option value="baslik:${b.id}">${escapeHtml(b.ad)}</option>`).join('')}
              <option value="yeni">+ Yeni Başlık Oluştur…</option>
            </optgroup>
          </select>
          <input type="text" class="ypl-yeni-baslik-input" data-index="${i}" placeholder="Yeni başlık adı" style="display:none;margin-top:6px;">
        </div>
      `).join('')}
    </div>
  `;
  const kaydetBtn = document.getElementById('modalKaydetBtn');
  if (kaydetBtn) kaydetBtn.disabled = false;
}
function _yplEslesmeYeniBaslikGoster(selectEl){
  const input = selectEl.parentElement.querySelector('.ypl-yeni-baslik-input');
  if (input) input.style.display = selectEl.value === 'yeni' ? 'block' : 'none';
}

function _yplIceAktarKaydet(){
  const dersAdi = document.getElementById('f_yplwDers').value.trim();
  if (!dersAdi){ toast('Ders adı zorunludur.'); return; }
  if (!_yplIceAktarSatirlar){ toast('Önce bir dosya seçip sütunları eşleştirin.'); return; }
  const seviye = parseInt(document.getElementById('f_yplwSeviye').value, 10);
  const egitimOgretimYili = document.getElementById('f_yplwYil').value.trim();

  const selectler = Array.from(document.querySelectorAll('.ypl-eslesme-select'));
  const yeniBaslikIslemleri = []; // {index, ad} — kaydetme sırasında gerçek id'ye çevrilecek
  const eslesme = {}; // index -> {tur:'sys'|'baslik', deger}
  selectler.forEach(sel => {
    const idx = parseInt(sel.dataset.index, 10);
    const val = sel.value;
    if (!val) return;
    if (val === 'yeni'){
      const ad = sel.parentElement.querySelector('.ypl-yeni-baslik-input').value.trim();
      if (ad) yeniBaslikIslemleri.push({ index: idx, ad });
    } else if (val.startsWith('sys:')){
      eslesme[idx] = { tur:'sys', deger: val.slice(4) };
    } else if (val.startsWith('baslik:')){
      eslesme[idx] = { tur:'baslik', deger: val.slice(7) };
    }
  });

  const satirlarHam = _yplIceAktarSatirlar.slice(1);
  const kaydetBtn = document.getElementById('modalKaydetBtn');
  if (kaydetBtn){ kaydetBtn.disabled = true; kaydetBtn.textContent = 'Kaydediliyor…'; }

  Promise.all(yeniBaslikIslemleri.map(y => YillikPlanService.baslikEkle({ ad: y.ad, sira: yillikPlanBasliklari.length })
    .then(ref => { eslesme[y.index] = { tur:'baslik', deger: ref.id }; })))
    .then(() => {
      const sutunlar = [];
      Object.keys(eslesme).forEach(idx => {
        const e = eslesme[idx];
        if (e.tur === 'baslik' && !sutunlar.includes(e.deger)) sutunlar.push(e.deger);
      });
      const satirlar = satirlarHam.filter(r => r.some(c=>c)).map(r => {
        const satir = { ay:'', hafta:'', saat:'', degerler:{} };
        Object.keys(eslesme).forEach(idx => {
          const e = eslesme[idx];
          const metin = (r[idx] || '').trim();
          if (!metin) return;
          if (e.tur === 'sys') satir[e.deger] = metin;
          else satir.degerler[e.deger] = metin;
        });
        return satir;
      });
      return YillikPlanService.tanimEkle({ dersAdi, seviye, egitimOgretimYili, sutunlar, satirlar });
    })
    .then(() => { toast(`İçe aktarıldı — ${satirlarHam.length} satır.`); modalKapat(); })
    .catch(err => {
      if (kaydetBtn){ kaydetBtn.disabled = false; kaydetBtn.textContent = 'Sütunları Eşleştirdim, Kaydet'; }
      if (err.message!=='yetkisiz') toast('Hata: '+err.message);
    });
}
