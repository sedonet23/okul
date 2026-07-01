/* ====================================================================
   ANA UYGULAMA MANTIĞI
   ==================================================================== */

const GUNLER = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];
const GUNADI = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const ONCELIKLER = ['Düşük','Orta','Yüksek'];
const EVRAK_TURLERI = ['Gelen Evrak','Giden Evrak','İç Yazışma','Tutanak','Diğer'];
const EVRAK_DURUMLARI = ['Beklemede','İşlemde','Tamamlandı','Arşivlendi'];

let ogretmenler=[], dersProgrami=[], hatirlaticilar=[], gorevler=[], evrakTakibi=[], notlar=[];
let dersListesi=[];
let bransListesi=[];
let seciliSinif = '';
let hatirlaticiFiltre = 'tumu';
let evrakFiltre = 'tumu';
let baglantilarKuruldu = false;

/* ---------- yardımcılar ---------- */
/* ============== VERİ SEKMESİ (merkezi Excel içe aktarma) ============== */
function renderVeriSekmesi(){
  const sinifSel = document.getElementById('veriSinifSecimi');
  if(sinifSel){
    const onceki = sinifSel.value;
    sinifSel.innerHTML = '<option value="">Sınıf seçiniz…</option>' + siniflar
      .sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'))
      .map(s=>`<option value="${s.id}">${escapeHtml(s.ad)}</option>`).join('');
    if(onceki) sinifSel.value = onceki;
  }
  const servisSel = document.getElementById('veriServisSecimi');
  if(servisSel){
    const onceki = servisSel.value;
    servisSel.innerHTML = '<option value="">Servis seçiniz…</option>' + servisler
      .sort((a,b)=>(a.guzergah||'').localeCompare(b.guzergah||'','tr'))
      .map(s=>`<option value="${s.id}" data-ad="${escapeHtml(s.guzergah||'')}">${escapeHtml(s.guzergah||'—')}</option>`).join('');
    if(onceki) servisSel.value = onceki;
  }
}
function veriOgrenciExcelYukle(input){
  const sinifId = document.getElementById('veriSinifSecimi').value;
  if(!sinifId){ toast('Önce sınıf seçin.'); input.value=''; return; }
  if(input.files[0]) ogrenciVeliExceliIceAktar(input.files[0], sinifId);
  input.value='';
}
function veriServisOgrenciExcelYukle(input){
  const sel = document.getElementById('veriServisSecimi');
  const servisId = sel.value;
  if(!servisId){ toast('Önce servis seçin.'); input.value=''; return; }
  const servisAdi = sel.selectedOptions[0]?.dataset.ad || '';
  if(input.files[0]) servisOgrenciExceliIceAktar(input.files[0], servisId, servisAdi);
  input.value='';
}

function escapeHtml(str){
  if(str===null||str===undefined) return '';
  return String(str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
/* Bir sınıf adından ("7-A", "10/B", "Anasınıfı" vb.) sayısal seviyeyi çıkarır.
   Sayı bulunamazsa çok büyük bir değer döndürerek sona atar. */
function sinifSeviyesiCikar(sinifAdi){
  if(!sinifAdi) return 999;
  const m = String(sinifAdi).match(/\d+/);
  return m ? parseInt(m[0], 10) : 999;
}
/* Öğrenci/veli kayıtlarını önce sınıf seviyesine (1->8), sonra şube/isim alfabetik sırasına göre
   sıralar. v.sinifId üzerinden siniflar dizisinde ada erişilir; sinifAdiAlani parametresi farklı
   alan adı kullanan kayıtlar için override sağlar (ör. servis-oturma.js içindeki koltuk verisi). */
function ogrencileriSinifSiralaSirala(liste, opts){
  opts = opts || {};
  const sinifIdAlani = opts.sinifIdAlani || 'sinifId';
  const sinifAdiAlani = opts.sinifAdiAlani || null;
  const adAlani = opts.adAlani || 'ogrenciAdi';
  return [...liste].sort((a,b)=>{
    const sinifAdA = sinifAdiAlani ? (a[sinifAdiAlani]||'') : ((typeof siniflar!=='undefined' && siniflar.find(s=>s.id===a[sinifIdAlani]))?.ad || '');
    const sinifAdB = sinifAdiAlani ? (b[sinifAdiAlani]||'') : ((typeof siniflar!=='undefined' && siniflar.find(s=>s.id===b[sinifIdAlani]))?.ad || '');
    const seviyeA = sinifSeviyesiCikar(sinifAdA);
    const seviyeB = sinifSeviyesiCikar(sinifAdB);
    if (seviyeA !== seviyeB) return seviyeA - seviyeB;
    const subeCmp = sinifAdA.localeCompare(sinifAdB, 'tr');
    if (subeCmp !== 0) return subeCmp;
    return (a[adAlani]||'').localeCompare(b[adAlani]||'', 'tr');
  });
}
/* Bir telefon numarasını, varsa velinin yakınlık derecesiyle ("Anne: 0532...") birlikte biçimlendirir. */
function telefonEtiketle(v, telefon){
  if(!telefon) return '';
  return v && v.yakinlik ? `${escapeHtml(v.yakinlik)}: ${escapeHtml(telefon)}` : escapeHtml(telefon);
}

/* ---------- DERS LİSTESİ ---------- */
const DERS_SELECT_YENI = '__yeni_ders_ekle__';
const BRANS_SELECT_YENI = '__yeni_brans_ekle__';


  // Haftalık ders saati grid HTML (ders ekle/düzenle modalında kullanılır)
  function _haftalikSaatGridHtml(mevcutSaatler) {
    const s = mevcutSaatler || {};
    const gruplar = [
      { baslik: 'İlkokul', seviyeler: [1,2,3,4] },
      { baslik: 'Ortaokul', seviyeler: [5,6,7,8] }
    ];
    return gruplar.map(g => `
      <div style="margin-bottom:6px;">
        <div style="font-size:10px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">${g.baslik}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
          ${g.seviyeler.map(sv => `
            <div style="text-align:center;">
              <div style="font-size:10px;color:var(--ink-muted);margin-bottom:2px;">${sv}. Sınıf</div>
              <input type="number" id="dl_saat_${sv}" min="0" max="10" value="${s[sv]||''}"
                placeholder="—"
                style="width:100%;text-align:center;padding:4px;border:1px solid var(--border);border-radius:6px;font-size:13px;">
            </div>`).join('')}
        </div>
      </div>`).join('');
  }

  function _haftalikSaatOku() {
    const saatler = {};
    [1,2,3,4,5,6,7,8].forEach(sv => {
      const val = parseInt(document.getElementById('dl_saat_' + sv)?.value || '');
      if (!isNaN(val) && val > 0) saatler[sv] = val;
    });
    return Object.keys(saatler).length ? saatler : null;
  }
function dersListesiEkle(){
  const body = `
    <div class="form-group"><label>Ders Adı</label>
      <input id="dl_ad" placeholder="örn: Matematik" style="width:100%;" autofocus></div>
    <div class="form-group"><label>Kısaltma <span style="font-weight:400;color:var(--ink-muted);font-size:12px;">(çarşaf raporda kullanılır)</span></label>
      <input id="dl_kisaltma" placeholder="örn: MAT" maxlength="5" style="width:100%;text-transform:uppercase;"
        oninput="this.value=this.value.toUpperCase()"></div>
    <div class="form-group">
      <label>Haftalık Ders Saati <span style="font-weight:400;color:var(--ink-muted);font-size:12px;">(sınıf seviyesine göre)</span></label>
      ${_haftalikSaatGridHtml()}
    </div>
    <div style="font-size:11px;color:var(--ink-muted);margin-top:4px;">Kısaltma girilmezse ders adının ilk 3 harfi kullanılır. Saat girilmezse norm hesabı yapılmaz.</div>
  `;
  modalAc('📚 Ders Ekle', body, () => {
    const ad = document.getElementById('dl_ad').value.trim();
    const kisaltma = document.getElementById('dl_kisaltma').value.trim().toUpperCase();
    if (!ad) { toast('Ders adı zorunludur.'); return; }
    if (dersListesi.some(d=>(d.ad||'').toLocaleLowerCase('tr')===ad.toLocaleLowerCase('tr'))) { toast('Bu ders zaten listede.'); return; }
    const veri = { ad };
    if (kisaltma) veri.kisaltma = kisaltma;
    const saatler = _haftalikSaatOku();
    if (saatler) veri.haftalikSaatler = saatler;
    db.collection(COL.dersListesi).add(veri)
      .then(()=>{ toast('Ders eklendi.'); modalKapat(); })
      .catch(err=>toast('Hata: '+err.message));
  }, null);
}
function dersListesiSil(id){
  if(!confirm('Bu dersi listeden silmek istiyor musunuz? (Daha önce seçilmiş kayıtlar etkilenmez.)')) return;
  db.collection(COL.dersListesi).doc(id).delete().catch(err=>toast('Hata: '+err.message));
}
function dersKisaltmaDuzenle(id, ad, mevcutKisaltma){
  const kayit = dersListesi.find(d => d.id === id);
  const mevcutSaatler = kayit?.haftalikSaatler || {};
  const body = `
    <div class="form-group"><label>Ders Adı</label>
      <input id="dk_ad" value="${escapeHtml(ad)}" style="width:100%;"></div>
    <div class="form-group"><label>Kısaltma</label>
      <input id="dk_kisaltma" value="${escapeHtml(mevcutKisaltma)}" placeholder="örn: MAT" maxlength="5"
        style="width:100%;text-transform:uppercase;" oninput="this.value=this.value.toUpperCase()"></div>
    <div class="form-group">
      <label>Haftalık Ders Saati <span style="font-weight:400;color:var(--ink-muted);font-size:12px;">(sınıf seviyesine göre)</span></label>
      ${_haftalikSaatGridHtml(mevcutSaatler)}
    </div>
  `;
  modalAc(`✏️ Düzenle — ${escapeHtml(ad)}`, body, () => {
    const yeniAd = document.getElementById('dk_ad').value.trim();
    const kisaltma = document.getElementById('dk_kisaltma').value.trim().toUpperCase();
    if (!yeniAd) { toast('Ders adı boş olamaz.'); return; }
    const veri = { ad: yeniAd };
    if (kisaltma) veri.kisaltma = kisaltma; else veri.kisaltma = '';
    const saatler = _haftalikSaatOku();
    veri.haftalikSaatler = saatler || {};
    db.collection(COL.dersListesi).doc(id).update(veri)
      .then(()=>{ toast('Güncellendi.'); modalKapat(); })
      .catch(err=>toast('Hata: '+err.message));
  }, null);
}
function renderDersListesiYonetim(){
  const hedef = document.getElementById('dersListesiYonetim');
  if(!hedef) return;
  hedef.innerHTML = dersListesi.length ? dersListesi.map(d => {
    const saatOzet = d.haftalikSaatler
      ? Object.entries(d.haftalikSaatler)
          .sort((a,b) => +a[0] - +b[0])
          .map(([sv, st]) => `${sv}.sınıf:${st}s`)
          .join(' ')
      : '';
    return `
    <div class="detay-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <span style="flex:1;min-width:0;">
        📚 ${escapeHtml(d.ad)}
        ${d.kisaltma ? `<span style="font-size:11px;background:var(--accent-muted,#e0f2f2);color:var(--accent,#0A6E6E);border-radius:4px;padding:1px 5px;font-weight:600;margin-left:4px;">${escapeHtml(d.kisaltma)}</span>` : ''}
        ${saatOzet ? `<div style="font-size:10px;color:var(--ink-muted);margin-top:2px;">⏱ ${escapeHtml(saatOzet)}</div>` : ''}
      </span>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm" onclick="dersKisaltmaDuzenle('${d.id}','${escapeHtml(d.ad)}','${escapeHtml(d.kisaltma||'')}')" title="Düzenle">✏️</button>
        <button class="btn btn-ghost btn-sm" onclick="dersListesiSil('${d.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('') : '<p class="empty-state">Henüz ders eklenmedi.</p>';
}
function dersSelectHtml(id, seciliDeger){
  const secili = seciliDeger || '';
  const varMi = !secili || dersListesi.some(d=>d.ad===secili);
  return `<select id="${id}" onchange="dersSelectDegisti('${id}')">
    <option value="">Seçiniz</option>
    ${dersListesi.map(d=>`<option value="${escapeHtml(d.ad)}" ${d.ad===secili?'selected':''}>${escapeHtml(d.ad)}</option>`).join('')}
    ${!varMi && secili ? `<option value="${escapeHtml(secili)}" selected>${escapeHtml(secili)} (listede yok)</option>` : ''}
    <option value="${DERS_SELECT_YENI}">➕ Yeni Ders Ekle…</option>
  </select>`;
}
function dersSelectDegisti(id){
  const el = document.getElementById(id);
  if(!el || el.value !== DERS_SELECT_YENI) return;
  const ad = prompt('Yeni ders adı:');
  if(!ad || !ad.trim()){ el.value=''; return; }
  const temizAd = ad.trim();
  db.collection(COL.dersListesi).add({ ad: temizAd }).then(()=>{
    el.outerHTML = dersSelectHtml(id, temizAd);
  }).catch(err=>toast('Hata: '+err.message));
}

/* ---------- BRANŞ LİSTESİ ---------- */
function bransListesiEkle(){
  const ad = prompt('Yeni branş adı (örn: Sınıf Öğretmenliği):');
  if(!ad || !ad.trim()) return;
  if(bransListesi.some(d=>(d.ad||'').toLocaleLowerCase('tr')===ad.trim().toLocaleLowerCase('tr'))){ toast('Bu branş zaten listede.'); return; }
  db.collection(COL.bransListesi).add({ ad: ad.trim() })
    .then(()=>toast('Branş eklendi.')).catch(err=>toast('Hata: '+err.message));
}
function bransListesiSil(id){
  if(!confirm('Bu branşı listeden silmek istiyor musunuz? (Daha önce seçilmiş kayıtlar etkilenmez.)')) return;
  db.collection(COL.bransListesi).doc(id).delete().catch(err=>toast('Hata: '+err.message));
}
function renderBransListesiYonetim(){
  const hedef = document.getElementById('bransListesiYonetim');
  if(!hedef) return;
  hedef.innerHTML = bransListesi.length ? bransListesi.map(d=>`
    <div class="detay-row" style="display:flex;justify-content:space-between;align-items:center;">
      <span>🎓 ${escapeHtml(d.ad)}</span>
      <button class="btn btn-ghost btn-sm" onclick="bransListesiSil('${d.id}')">🗑️</button>
    </div>`).join('') : '<p class="empty-state">Henüz branş eklenmedi.</p>';
}
function bransSelectHtml(id, seciliDeger){
  const secili = seciliDeger || '';
  const varMi = !secili || bransListesi.some(d=>d.ad===secili);
  return `<select id="${id}" onchange="bransSelectDegisti('${id}')">
    <option value="">Seçiniz</option>
    ${bransListesi.map(d=>`<option value="${escapeHtml(d.ad)}" ${d.ad===secili?'selected':''}>${escapeHtml(d.ad)}</option>`).join('')}
    ${!varMi && secili ? `<option value="${escapeHtml(secili)}" selected>${escapeHtml(secili)} (listede yok)</option>` : ''}
    <option value="${BRANS_SELECT_YENI}">➕ Yeni Branş Ekle…</option>
  </select>`;
}
function bransSelectDegisti(id){
  const el = document.getElementById(id);
  if(!el || el.value !== BRANS_SELECT_YENI) return;
  const ad = prompt('Yeni branş adı:');
  if(!ad || !ad.trim()){ el.value=''; return; }
  const temizAd = ad.trim();
  db.collection(COL.bransListesi).add({ ad: temizAd }).then(()=>{
    el.outerHTML = bransSelectHtml(id, temizAd);
  }).catch(err=>toast('Hata: '+err.message));
}
function todayISO(){ const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function formatTarih(iso){ if(!iso) return ''; const p = iso.split('-'); return p.length===3 ? `${p[2]}.${p[1]}.${p[0]}` : iso; }
function bugunMetni(){ const d=new Date(); return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}, ${GUNADI[d.getDay()]}`; }
function oncelikRengi(o){ if(o==='Yüksek') return 'brick'; if(o==='Orta') return 'amber'; return 'sage'; }
function evrakRengi(durum){ if(durum==='Tamamlandı') return 'sage'; if(durum==='İşlemde') return 'amber'; if(durum==='Arşivlendi') return 'gray'; return 'blue'; }
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>el.classList.remove('show'), 3000);
}

/* ====================================================================
   ORTAK YAZDIRMA YARDIMCISI
   Android'in çıplak WebView bileşeni window.print() JS API'sini
   desteklemiyor (bu yalnızca Chrome tarayıcı uygulamasında var) — bu
   yüzden APK içindeki yazdırma butonları sessizce başarısız oluyordu.

   Native (Capacitor/Android) ortamda: PrintPlugin (bkz. android/.../PrintPlugin.java)
   üzerinden gerçek Android sistem yazdırma/önizleme diyaloğunu açar —
   bu diyalog kendi geri/iptal tuşuna ve "PDF olarak kaydet" seçeneğine
   sahiptir.

   Web/PWA ortamda (native plugin yoksa): Blob URL ile yeni bir pencere
   açar, kullanıcı "Yazdır" butonuna basınca gerçek bir kullanıcı
   etkileşimiyle window.print() tetiklenir (otomatik/timer ile tetiklenen
   print() çağrıları bazı tarayıcılarda engellenebiliyor).
   ==================================================================== */
function uygulamaHtmlYazdir(rawHtml, isAdi){
  isAdi = isAdi || 'Koruk_Okul_Belge';

  const nativeVarMi = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() &&
    window.Capacitor.Plugins && window.Capacitor.Plugins.PrintPlugin);

  if(nativeVarMi){
    try{
      window.Capacitor.Plugins.PrintPlugin.yazdir({ html: rawHtml, isAdi });
      return;
    }catch(e){ console.warn('Native yazdırma başarısız, tarayıcı yöntemine dönülüyor:', e.message); }
  }

  const stilMatch   = rawHtml.match(/<style>([\s\S]*?)<\/style>/);
  const govdeMatch  = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/);
  const baslikMatch = rawHtml.match(/<title>([\s\S]*?)<\/title>/);
  const stil  = stilMatch  ? stilMatch[1]  : '';
  const govde = govdeMatch ? govdeMatch[1] : rawHtml;
  const baslik = baslikMatch ? baslikMatch[1] : isAdi;

  const tamHtml = '<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>' + baslik + '</title><style>' +
    stil +
    '\n .kk-yazdir-toolbar{ display:flex; gap:8px; padding:10px 14px; background:#f3f2ff; align-items:center; }' +
    '\n .kk-yazdir-toolbar button{ padding:7px 16px; border:none; border-radius:6px; font-size:13px; font-weight:700; cursor:pointer; }' +
    '\n .kk-btn-yazdir{ background:#0A6E6E; color:#fff; }' +
    '\n .kk-btn-kapat{ background:#e5e7eb; color:#374151; }' +
    '\n @media print{ .kk-yazdir-toolbar{ display:none !important; } }' +
    '</style></head><body>' +
    '<div class="kk-yazdir-toolbar"><button class="kk-btn-yazdir" onclick="window.print()">🖨️ Yazdır / PDF İndir</button><button class="kk-btn-kapat" onclick="window.close()">✕ Kapat</button></div>' +
    govde +
    '</body></html>';

  try{
    const blob = new Blob([tamHtml], { type:'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if(!win) throw new Error('popup_blocked');
    setTimeout(()=>URL.revokeObjectURL(url), 60000);
  }catch(e2){
    toast('Yazdırma penceresi açılamadı: ' + (e2 && e2.message));
  }
}
window.uygulamaHtmlYazdir = uygulamaHtmlYazdir;

/* ====================================================================
   ORTAK DOSYA KAYDETME/İNDİRME YARDIMCISI
   Android'in çıplak WebView bileşeni tarayıcıların standart blob indirme
   davranışını (<a download>) desteklemiyor — bu yüzden şablon (xlsx) ve
   yedek (json) indirme butonları APK içinde sessizce çalışmıyordu.

   Native (Capacitor/Android) ortamda: SavePlugin üzerinden dosyayı
   doğrudan cihazın "İndirilenler" klasörüne yazar.
   Web/PWA ortamda (native plugin yoksa): klasik blob + <a download> yöntemi.
   ==================================================================== */
function uygulamaDosyaKaydet(base64Veri, dosyaAdi, mimeTuru){
  const nativeVarMi = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() &&
    window.Capacitor.Plugins && window.Capacitor.Plugins.SavePlugin);

  if(nativeVarMi){
    window.Capacitor.Plugins.SavePlugin.kaydet({ base64: base64Veri, dosyaAdi, mimeTuru })
      .then(()=> toast(`"${dosyaAdi}" İndirilenler klasörüne kaydedildi.`))
      .catch(e=> toast('Dosya kaydedilemedi: ' + (e && e.message)));
    return;
  }

  try{
    const ikiliVeri = atob(base64Veri);
    const baytlar = new Uint8Array(ikiliVeri.length);
    for(let i=0; i<ikiliVeri.length; i++) baytlar[i] = ikiliVeri.charCodeAt(i);
    const blob = new Blob([baytlar], { type: mimeTuru });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = dosyaAdi;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }catch(e){
    toast('Dosya indirilemedi: ' + e.message);
  }
}
window.uygulamaDosyaKaydet = uygulamaDosyaKaydet;
function ogretmenSecenekleri(seciliId){
  return '<option value="">Seçiniz</option>' + ogretmenler.map(o=>
    `<option value="${o.id}" ${o.id===seciliId?'selected':''}>${escapeHtml(o.ad+' '+o.soyad)}</option>`
  ).join('');
}
function ogretmenAdi(id){ const o = ogretmenler.find(x=>x.id===id); return o ? `${o.ad} ${o.soyad}` : '—'; }
function kaydet(koleksiyon, id, veri){
  if(!db){ toast('Firebase bağlantısı yok.'); return; }
  const ref = db.collection(koleksiyon);
  const islem = id ? ref.doc(id).update(veri) : ref.add({...veri, eklenmeTarihi: new Date().toISOString()});
  islem.then(()=>toast('Kaydedildi.')).catch(err=>toast('Hata: '+err.message));
}
function hataGoster(err){ console.error(err); toast('Veri hatası: '+err.message); }

/* ---------- modal ---------- */
function modalAc(title, bodyHtml, kaydetFn, silFn, kaydetBtnMetni){
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  const silBtn = document.getElementById('modalSilBtn');
  if(silFn){ silBtn.style.display='inline-flex'; silBtn.onclick = silFn; }
  else { silBtn.style.display='none'; silBtn.onclick=null; }
  const kaydetBtn = document.getElementById('modalKaydetBtn');
  kaydetBtn.style.display = 'inline-flex';
  kaydetBtn.textContent = kaydetBtnMetni || 'Kaydet';
  kaydetBtn.onclick = kaydetFn ? () => {
    try { kaydetFn(); }
    catch(e) { console.error('Kaydet hatası:', e); toast('Hata: ' + e.message); }
  } : null;
  document.getElementById('modalOverlay').classList.add('active');
  document.body.classList.add('modal-open');
}
function modalKapat(){
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.classList.remove('modal-open');
}

/* ============== ÖĞRETMENLER ============== */
function renderOgretmenler(){
  const aramaEl = document.getElementById('ogretmenArama');
  const arama = (aramaEl ? aramaEl.value : '').toLocaleLowerCase('tr');
  let liste = ogretmenler.filter(o => !arama || (o.ad+' '+o.soyad+' '+(o.brans||'')+' '+(o.unvan||'')).toLocaleLowerCase('tr').includes(arama));
  liste.sort((a,b)=>a.ad.localeCompare(b.ad,'tr'));
  document.getElementById('ogretmenlerTablo').innerHTML = liste.length ? liste.map(o=>`
    <tr class="row-clickable" onclick="ogretmenDetayAc('${o.id}')">
      <td>${escapeHtml(o.ad+' '+o.soyad)}</td>
      <td>${escapeHtml(o.unvan||'Öğretmen')}${o.kariyerBasamagi && o.kariyerBasamagi!=='Öğretmen' ? ` <span class="status-badge status-${kariyerBasamagiRengi(o.kariyerBasamagi)}">${escapeHtml(o.kariyerBasamagi)}</span>` : ''}</td>
      <td>${escapeHtml(o.brans||'—')}</td>
      <td>${escapeHtml(o.telefon||'—')}</td>
      <td>${escapeHtml(o.eposta||'—')}</td>
      <td>${escapeHtml(o.sorumluSinif||'—')}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); ogretmenModalAc('${o.id}')">Düzenle</button></td>
    </tr>`).join('') : `<tr><td colspan="7" class="empty-state">Henüz öğretmen eklenmedi.</td></tr>`;
}
const OGRETMEN_UNVANLARI = ['Öğretmen','Müdür','Müdür Yardımcısı','Rehber Öğretmen','İdari Personel'];
const OGRETMEN_KARIYER_BASAMAKLARI = ['Öğretmen','Uzman Öğretmen','Başöğretmen'];
function kariyerBasamagiRengi(k){ if(k==='Başöğretmen') return 'aktif'; if(k==='Uzman Öğretmen') return 'bekleme'; return ''; }
/* Müdür Yardımcıları ayrı bir koleksiyon DEĞİL — öğretmenler listesinden
   unvan==='Müdür Yardımcısı' filtresiyle hesaplanır (bkz. firebase-init.js COL.okulBilgileri yorumu). */
function muduYardimcilari(){
  return ogretmenler.filter(o=>(o.unvan||'').trim()==='Müdür Yardımcısı').sort((a,b)=>a.ad.localeCompare(b.ad,'tr'));
}
function ogretmenModalAc(id, varsayilanUnvan){
  const o = id ? ogretmenler.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Ad</label><input id="f_ad" value="${o?escapeHtml(o.ad):''}"></div>
    <div class="form-group"><label>Soyad</label><input id="f_soyad" value="${o?escapeHtml(o.soyad):''}"></div>
    <div class="form-group"><label>Ünvan</label>
      <select id="f_unvan">
        ${OGRETMEN_UNVANLARI.map(u=>`<option value="${u}" ${(o&&o.unvan===u)||(varsayilanUnvan&&varsayilanUnvan===u)?'selected':''}>${u}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Kariyer Basamağı</label>
      <select id="f_kariyerBasamagi">${OGRETMEN_KARIYER_BASAMAKLARI.map(k=>`<option value="${k}" ${o&&o.kariyerBasamagi===k?'selected':''}>${k}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Branş</label>${bransSelectHtml('f_brans', o?o.brans||'':'')}</div>
    <div class="form-row">
      <div class="form-group"><label>Derece</label><select id="f_derece"><option value="">—</option>${[1,2,3,4,5,6,7,8,9].map(n=>`<option value="${n}" ${o&&o.derece===n?'selected':''}>${n}</option>`).join('')}</select></div>
      <div class="form-group"><label>Kademe</label><select id="f_kademe"><option value="">—</option>${[1,2,3,4].map(n=>`<option value="${n}" ${o&&o.kademe===n?'selected':''}>${n}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label>TC Kimlik No</label><input id="f_tcNo" value="${o?escapeHtml(o.tcNo||''): ''}" placeholder="12345678900" maxlength="11" inputmode="numeric"></div>
    <div class="form-group"><label>Telefon</label><input id="f_telefon" value="${o?escapeHtml(o.telefon||''):''}"></div>
    <div class="form-group"><label>E-posta</label><input id="f_eposta" value="${o?escapeHtml(o.eposta||''):''}"></div>
    <div class="form-row">
      <div class="form-group"><label>Cinsiyet</label><select id="f_cinsiyet">
        <option value="" ${o&&o.cinsiyet?'':'selected'}>Belirtilmedi</option>
        <option value="kadin" ${o&&o.cinsiyet==='kadin'?'selected':''}>Kadın</option>
        <option value="erkek" ${o&&o.cinsiyet==='erkek'?'selected':''}>Erkek</option>
      </select></div>
      <div class="form-group"><label>Rehberlik Sınıfı</label><select id="f_sorumluSinif"><option value="">— Seçiniz —</option>${(typeof siniflar!=="undefined"?[...siniflar].sort((a,b)=>a.ad.localeCompare(b.ad,"tr")):[]).map(s=>`<option value="${escapeHtml(s.ad)}" ${o&&o.sorumluSinif===s.ad?"selected":""}>${escapeHtml(s.ad)}</option>`).join("")}</select></div>
    </div>
    <div class="form-group"><label>Notlar</label><textarea id="f_notlar" rows="2">${o?escapeHtml(o.notlar||''):''}</textarea></div>
  `;
  modalAc(o?'Öğretmen Düzenle':'Öğretmen Ekle', body, ()=>{
    const ad = document.getElementById('f_ad').value.trim();
    const soyad = document.getElementById('f_soyad').value.trim();
    if(!ad || !soyad){ toast('Ad ve soyad zorunludur.'); return; }
    const dereceVal = document.getElementById('f_derece').value;
    const kademeVal = document.getElementById('f_kademe').value;
    kaydet(COL.ogretmenler, o?o.id:null, {
      ad, soyad,
      unvan: document.getElementById('f_unvan').value.trim(),
      kariyerBasamagi: document.getElementById('f_kariyerBasamagi').value,
      brans: document.getElementById('f_brans').value.trim(),
      derece: dereceVal ? parseInt(dereceVal) : null,
      kademe: kademeVal ? parseInt(kademeVal) : null,
      tcNo: document.getElementById('f_tcNo').value.trim(),
      telefon: document.getElementById('f_telefon').value.trim(),
      eposta: document.getElementById('f_eposta').value.trim(),
      cinsiyet: document.getElementById('f_cinsiyet').value,
      sorumluSinif: document.getElementById('f_sorumluSinif').value.trim(),
      notlar: document.getElementById('f_notlar').value.trim(),
    });
    modalKapat();
  }, o ? ()=>{ if(confirm('Bu öğretmeni silmek istediğinize emin misiniz?')){ db.collection(COL.ogretmenler).doc(o.id).delete(); modalKapat(); } } : null);
}

/* ============== OKUL BİLGİLERİ ============== */
let okulBilgileriAyari = null;
function renderMuduYardimcilariListesi(){
  const hedef = document.getElementById('muduYardimcilariListesi');
  if(!hedef) return;
  const liste = muduYardimcilari();
  hedef.innerHTML = liste.length ? `<ul class="mudur-yardimcilari-liste">${liste.map(o=>`
    <li class="mudur-yardimcisi-item">
      <div class="mudur-yardimcisi-info">
        <div class="mudur-yardimcisi-ad">${escapeHtml(o.ad+' '+o.soyad)}</div>
        <div class="mudur-yardimcisi-telefon">${escapeHtml(o.telefon||'Telefon kayıtlı değil')}</div>
      </div>
      <div class="mudur-yardimcisi-actions">
        <button class="btn btn-ghost btn-sm" onclick="ogretmenModalAc('${o.id}')">Düzenle</button>
        <button class="btn btn-ghost btn-sm" onclick="muduYardimcisiListedenCikar('${o.id}')">Çıkar</button>
      </div>
    </li>`).join('')}</ul>` : '<p class="empty-state">Henüz Müdür Yardımcısı eklenmedi.</p>';
}
function muduYardimcisiEkle(){ ogretmenModalAc(null, 'Müdür Yardımcısı'); }
function muduYardimcisiListedenCikar(id){
  if(!confirm('Bu kişiyi Müdür Yardımcıları listesinden çıkarmak istiyor musunuz? (Öğretmen kaydı silinmez, sadece ünvanı "Öğretmen" olarak güncellenir.)')) return;
  db.collection(COL.ogretmenler).doc(id).update({unvan:'Öğretmen'}).then(()=>toast('Listeden çıkarıldı.')).catch(err=>toast('Hata: '+err.message));
}
function renderOkulBilgileriSayfasi(){
  try {
    const adEl = document.getElementById('f_okulAdi');
    const mudurEl = document.getElementById('f_okulMudur');
    const ilEl = document.getElementById('f_okulIl');
    const ilceEl = document.getElementById('f_okulIlce');
    const mebEl = document.getElementById('f_okulMeb');
    if(adEl) adEl.value = (okulBilgileriAyari && okulBilgileriAyari.okulAdi) || 'KORUK İLK - ORTAOKULU';
    if(mudurEl) mudurEl.innerHTML = ogretmenSecenekleri(okulBilgileriAyari ? okulBilgileriAyari.mudurId : '');
    if(ilEl) ilEl.value = (okulBilgileriAyari && okulBilgileriAyari.il) || '';
    if(ilceEl) ilceEl.value = (okulBilgileriAyari && okulBilgileriAyari.ilce) || '';
    if(mebEl) mebEl.value = (okulBilgileriAyari && okulBilgileriAyari.mebMudurlugu) || '';
    if(typeof renderMuduYardimcilariListesi === 'function') renderMuduYardimcilariListesi();
  } catch(e) { console.warn('renderOkulBilgileriSayfasi hata:', e); }
}
function okulBilgileriKaydet(){
  const okulAdi = document.getElementById('f_okulAdi').value.trim();
  const mudurId = document.getElementById('f_okulMudur').value;
  const il = (document.getElementById('f_okulIl')?.value || '').trim().toLocaleUpperCase('tr');
  const ilce = (document.getElementById('f_okulIlce')?.value || '').trim().toLocaleUpperCase('tr');
  const mebMudurlugu = (document.getElementById('f_okulMeb')?.value || '').trim();
  db.collection(COL.okulBilgileri).doc('ayarlar').set({ okulAdi, mudurId, il, ilce, mebMudurlugu })
    .then(()=>toast('Okul bilgileri kaydedildi.'))
    .catch(err=>toast('Hata: '+err.message));
}

/* ============== DERS PROGRAMI ============== */
function dersSiniflari(){ return sinifAdlari(); }
function sinifDegisti(v){ seciliSinif = v; renderDersGrid(); }
function yeniSinifEkleDers(){
  // Sınıf tanımları artık Sınıflar modülünden yönetiliyor.
  sinifModalAc();
}
function renderDersGrid(){
  const sel = document.getElementById('dersSinifSecimi');
  const siniflar = dersSiniflari();
  if(!seciliSinif && siniflar.length) seciliSinif = siniflar[0];
  sel.innerHTML = siniflar.length ? siniflar.map(s=>`<option ${s===seciliSinif?'selected':''}>${escapeHtml(s)}</option>`).join('') : '<option>Sınıf eklenmedi</option>';
  const bugun = GUNADI[new Date().getDay()];
  let html = '<thead><tr><th>Saat</th>' + GUNLER.map(g=>`<th class="${g===bugun?'bugun-kolon':''}">${g}</th>`).join('') + '</tr></thead><tbody>';
  for(let saat=1; saat<=7; saat++){
    const bilgi = dersSaatiBilgisi(saat);
    const saatEtiket = bilgi ? `${saat}. <span class="sch-saat-zaman">${bilgi.baslangic}–${bilgi.bitis}</span>` : `${saat}.`;
    html += `<tr><td class="sch-saat">${saatEtiket}</td>`;
    for(const gun of GUNLER){
      const giris = dersProgrami.find(d=>d.sinif===seciliSinif && d.gun===gun && d.saat===saat);
      if(giris){
        html += `<td class="sch-cell sch-filled" onclick="dersModalAcById('${gun}',${saat},'${giris.id}')"><div class="sch-ders">${escapeHtml(giris.ders)}</div><div class="sch-ogretmen">${escapeHtml(ogretmenAdi(giris.ogretmenId))}</div></td>`;
      } else {
        html += `<td class="sch-cell sch-empty" onclick="dersModalAcById('${gun}',${saat},'')">+</td>`;
      }
    }
    html += '</tr>';
    const ara = sonrakiSegmentBilgisi(saat);
    if(ara && ara.fark>0){
      const araEtiket = ara.sonrakiTip==='ogle' ? `Öğle Arası (${ara.fark} dk)` : `Teneffüs (${ara.fark} dk)`;
      html += `<tr class="sch-ara-row"><td colspan="${GUNLER.length+1}">${araEtiket}</td></tr>`;
    }
  }
  html += '</tbody>';
  document.getElementById('dersGridTablo').innerHTML = html;
}
function dersModalAcById(gun, saat, id){
  const mevcut = id ? dersProgrami.find(d=>d.id===id) : null;
  dersModalAc(gun, saat, mevcut);
}
function dersModalAc(gun, saat, mevcut){
  const body = `
    <div class="form-group"><label>Sınıf</label><input id="f_sinif" value="${escapeHtml(mevcut?mevcut.sinif:(seciliSinif||''))}" placeholder="örn: 5-A"></div>
    <div class="form-group"><label>Gün</label><select id="f_gun">${GUNLER.map(g=>`<option ${g===gun?'selected':''}>${g}</option>`).join('')}</select></div>
    <div class="form-group"><label>Ders Saati</label><select id="f_saat">${[1,2,3,4,5,6,7].map(s=>`<option ${s===saat?'selected':''}>${s}</option>`).join('')}</select></div>
    <div class="form-group"><label>Ders</label>${dersSelectHtml('f_ders', mevcut?mevcut.ders:'')}</div>
    <div class="form-group"><label>Öğretmen</label><select id="f_ogretmen">${ogretmenSecenekleri(mevcut?mevcut.ogretmenId:'')}</select></div>
  `;
  modalAc(mevcut?'Ders Düzenle':'Ders Ekle', body, ()=>{
    const sinif = document.getElementById('f_sinif').value.trim();
    const ders = document.getElementById('f_ders').value.trim();
    if(!sinif || !ders){ toast('Sınıf ve ders alanı zorunludur.'); return; }
    kaydet(COL.dersProgrami, mevcut?mevcut.id:null, {
      sinif, gun: document.getElementById('f_gun').value,
      saat: parseInt(document.getElementById('f_saat').value),
      ders, ogretmenId: document.getElementById('f_ogretmen').value
    });
    seciliSinif = sinif;
    modalKapat();
  }, mevcut ? ()=>{ if(confirm('Bu ders kaydını silmek istiyor musunuz?')){ db.collection(COL.dersProgrami).doc(mevcut.id).delete(); modalKapat(); } } : null);
}

/* Nöbet Programı: bkz. js/nobet.js (tarih bazlı aylık modül) */

/* ============== HATIRLATICILAR ============== */
function hatirlaticiFiltreSec(f){
  hatirlaticiFiltre = f;
  document.querySelectorAll('#tab-hatirlaticilar .filtre-btn').forEach(b=>b.classList.toggle('active', b.dataset.f===f));
  renderHatirlaticilar();
}
function renderHatirlaticilar(){
  let liste = [...hatirlaticilar];
  if(hatirlaticiFiltre==='bekleyen') liste = liste.filter(h=>!h.tamamlandi);
  if(hatirlaticiFiltre==='tamamlanan') liste = liste.filter(h=>h.tamamlandi);
  liste.sort((a,b)=>(a.tarih+(a.saat||'')).localeCompare(b.tarih+(b.saat||'')));
  const bugun = todayISO();
  document.getElementById('hatirlaticiListesi').innerHTML = liste.length ? liste.map(h=>{
    const gecikmis = !h.tamamlandi && h.tarih < bugun;
    return `<div class="reminder-row ${h.tamamlandi?'done':''} ${gecikmis?'overdue':''}">
      <input type="checkbox" style="width:auto;" ${h.tamamlandi?'checked':''} onchange="hatirlaticiTamamlandiToggle('${h.id}', this.checked)">
      <div class="reminder-body">
        <div class="reminder-title">${escapeHtml(h.baslik)}</div>
        <div class="reminder-meta">${formatTarih(h.tarih)}${h.saat?' · '+h.saat:''}${h.kategori?' · '+escapeHtml(h.kategori):''}${h.aciklama?' · '+escapeHtml(h.aciklama):''}</div>
      </div>
      <span class="badge badge-${oncelikRengi(h.oncelik)}">${escapeHtml(h.oncelik||'Orta')}</span>
      <button class="btn btn-ghost btn-sm" onclick="hatirlaticiModalAc('${h.id}')">Düzenle</button>
    </div>`;
  }).join('') : '<p class="empty-state">Hatırlatıcı bulunamadı.</p>';
}
function hatirlaticiTamamlandiToggle(id, deger){ db.collection(COL.hatirlaticilar).doc(id).update({tamamlandi:deger}); }
function hatirlaticiModalAc(id){
  const h = id ? hatirlaticilar.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Başlık</label><input id="f_baslik" value="${h?escapeHtml(h.baslik):''}"></div>
    <div class="form-group"><label>Tarih</label><input type="date" id="f_tarih" value="${h?h.tarih:todayISO()}"></div>
    <div class="form-group"><label>Saat (opsiyonel)</label><input type="time" id="f_saat" value="${h&&h.saat?h.saat:''}"></div>
    <div class="form-group"><label>Öncelik</label><select id="f_oncelik">${ONCELIKLER.map(o=>`<option ${o===(h?h.oncelik:'Orta')?'selected':''}>${o}</option>`).join('')}</select></div>
    <div class="form-group"><label>Açıklama</label><textarea id="f_aciklama" rows="2">${h?escapeHtml(h.aciklama||''):''}</textarea></div>
    ${h?'<p style="font-size:11.8px;color:var(--ink-muted);">Tarih/saat değiştirirseniz push bildirimi tekrar gönderim için sıfırlanır.</p>':''}
  `;
  modalAc(h?'Hatırlatıcı Düzenle':'Hatırlatıcı Ekle', body, ()=>{
    const baslik = document.getElementById('f_baslik').value.trim();
    const tarih = document.getElementById('f_tarih').value;
    if(!baslik || !tarih){ toast('Başlık ve tarih zorunludur.'); return; }
    const saat = document.getElementById('f_saat').value;
    const tarihSaatDegisti = h && (h.tarih !== tarih || (h.saat||'') !== saat);
    kaydet(COL.hatirlaticilar, h?h.id:null, {
      baslik, tarih, saat,
      oncelik: document.getElementById('f_oncelik').value,
      aciklama: document.getElementById('f_aciklama').value.trim(),
      tamamlandi: h ? !!h.tamamlandi : false,
      bildirimGonderildi: h ? (tarihSaatDegisti ? false : !!h.bildirimGonderildi) : false
    });
    modalKapat();
  }, h ? ()=>{ if(confirm('Bu hatırlatıcıyı silmek istiyor musunuz?')){ db.collection(COL.hatirlaticilar).doc(h.id).delete(); modalKapat(); } } : null);
}

/* ============== GÖREVLER ============== */
function renderGorevler(){
  const kolonlar = { yapilacak: document.getElementById('kolonYapilacak'), yapiliyor: document.getElementById('kolonYapiliyor'), tamamlandi: document.getElementById('kolonTamamlandi') };
  Object.values(kolonlar).forEach(k=>k.innerHTML='');
  const sayac = { yapilacak:0, yapiliyor:0, tamamlandi:0 };
  const bugun = todayISO();
  gorevler.forEach(g=>{
    sayac[g.durum] = (sayac[g.durum]||0) + 1;
    const gecikmis = g.durum!=='tamamlandi' && g.sonTarih && g.sonTarih < bugun;
    const div = document.createElement('div');
    div.className = 'task-card';
    div.draggable = true;
    div.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', g.id); div.classList.add('dragging'); });
    div.addEventListener('dragend', ()=> div.classList.remove('dragging'));
    div.innerHTML = `
      <div class="task-title">${escapeHtml(g.baslik)}</div>
      ${g.aciklama?`<div class="task-desc">${escapeHtml(g.aciklama)}</div>`:''}
      <div class="task-meta">
        <span class="badge badge-${oncelikRengi(g.oncelik)}">${escapeHtml(g.oncelik||'Orta')}</span>
        ${g.sonTarih?`<span class="task-due ${gecikmis?'overdue':''}">${formatTarih(g.sonTarih)}</span>`:''}
      </div>
      <div class="task-actions"><button class="btn btn-ghost btn-sm" onclick="gorevModalAc('${g.id}')">Düzenle</button></div>
    `;
    (kolonlar[g.durum]||kolonlar.yapilacak).appendChild(div);
  });
  document.getElementById('sayacYapilacak').textContent = sayac.yapilacak||0;
  document.getElementById('sayacYapiliyor').textContent = sayac.yapiliyor||0;
  document.getElementById('sayacTamamlandi').textContent = sayac.tamamlandi||0;
}
function gorevBirak(e, yeniDurum){
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  if(id) db.collection(COL.gorevler).doc(id).update({durum:yeniDurum});
}
function gorevModalAc(id){
  const g = id ? gorevler.find(x=>x.id===id) : null;
  const durumlar = [['yapilacak','Yapılacak'],['yapiliyor','Yapılıyor'],['tamamlandi','Tamamlandı']];
  const body = `
    <div class="form-group"><label>Başlık</label><input id="f_baslik" value="${g?escapeHtml(g.baslik):''}"></div>
    <div class="form-group"><label>Açıklama</label><textarea id="f_aciklama" rows="2">${g?escapeHtml(g.aciklama||''):''}</textarea></div>
    <div class="form-group"><label>Son Tarih (opsiyonel)</label><input type="date" id="f_sonTarih" value="${g&&g.sonTarih?g.sonTarih:''}"></div>
    <div class="form-group"><label>Öncelik</label><select id="f_oncelik">${ONCELIKLER.map(o=>`<option ${o===(g?g.oncelik:'Orta')?'selected':''}>${o}</option>`).join('')}</select></div>
    <div class="form-group"><label>Durum</label><select id="f_durum">${durumlar.map(([v,l])=>`<option value="${v}" ${v===(g?g.durum:'yapilacak')?'selected':''}>${l}</option>`).join('')}</select></div>
  `;
  modalAc(g?'Görev Düzenle':'Görev Ekle', body, ()=>{
    const baslik = document.getElementById('f_baslik').value.trim();
    if(!baslik){ toast('Başlık zorunludur.'); return; }
    const sonTarih = document.getElementById('f_sonTarih').value;
    const sonTarihDegisti = g && (g.sonTarih||'') !== sonTarih;
    kaydet(COL.gorevler, g?g.id:null, {
      baslik, aciklama: document.getElementById('f_aciklama').value.trim(),
      sonTarih, oncelik: document.getElementById('f_oncelik').value,
      durum: document.getElementById('f_durum').value,
      bildirimGonderildi: g ? (sonTarihDegisti ? false : !!g.bildirimGonderildi) : false
    });
    modalKapat();
  }, g ? ()=>{ if(confirm('Bu görevi silmek istiyor musunuz?')){ db.collection(COL.gorevler).doc(g.id).delete(); modalKapat(); } } : null);
}

/* ============== EVRAK TAKİBİ ============== */
function evrakFiltreSec(f){
  evrakFiltre = f;
  document.querySelectorAll('#tab-evrak .filtre-btn').forEach(b=>b.classList.toggle('active', b.dataset.f===f));
  renderEvrakTakibi();
}
function renderEvrakTakibi(){
  let liste = [...evrakTakibi];
  if(evrakFiltre!=='tumu') liste = liste.filter(e=>e.durum===evrakFiltre);
  liste.sort((a,b)=> (b.tarih||'').localeCompare(a.tarih||''));
  document.getElementById('evrakListesi').innerHTML = liste.length ? liste.map(e=>`
    <div class="evrak-row">
      <div class="evrak-body">
        <div class="evrak-title">${escapeHtml(e.evrakAdi)} <span class="badge badge-gray">${escapeHtml(e.tur||'Diğer')}</span></div>
        <div class="evrak-meta">${formatTarih(e.tarih)}${e.aciklama?' · '+escapeHtml(e.aciklama):''}${e.dosyaLinki?` · <a href="${escapeHtml(e.dosyaLinki)}" target="_blank" rel="noopener">Dosyayı Aç ↗</a>`:''}</div>
      </div>
      <span class="badge badge-${evrakRengi(e.durum)}">${escapeHtml(e.durum)}</span>
      <button class="btn btn-ghost btn-sm" onclick="evrakModalAc('${e.id}')">Düzenle</button>
    </div>
  `).join('') : '<p class="empty-state">Evrak kaydı bulunamadı.</p>';
}
function evrakModalAc(id){
  const e = id ? evrakTakibi.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Evrak Adı</label><input id="f_evrakAdi" value="${e?escapeHtml(e.evrakAdi):''}" placeholder="örn: Veli Dilekçesi - 5A"></div>
    <div class="form-group"><label>Tür</label><select id="f_tur">${EVRAK_TURLERI.map(t=>`<option ${t===(e?e.tur:'Diğer')?'selected':''}>${t}</option>`).join('')}</select></div>
    <div class="form-group"><label>Tarih</label><input type="date" id="f_tarih" value="${e?e.tarih:todayISO()}"></div>
    <div class="form-group"><label>Durum</label><select id="f_durum">${EVRAK_DURUMLARI.map(d=>`<option ${d===(e?e.durum:'Beklemede')?'selected':''}>${d}</option>`).join('')}</select></div>
    <div class="form-group"><label>Dosya Linki (opsiyonel — Drive/OneDrive vb.)</label><input id="f_dosyaLinki" value="${e?escapeHtml(e.dosyaLinki||''):''}" placeholder="https://..."></div>
    <div class="form-group"><label>Açıklama</label><textarea id="f_aciklama" rows="2">${e?escapeHtml(e.aciklama||''):''}</textarea></div>
  `;
  modalAc(e?'Evrak Düzenle':'Evrak Ekle', body, ()=>{
    const evrakAdi = document.getElementById('f_evrakAdi').value.trim();
    if(!evrakAdi){ toast('Evrak adı zorunludur.'); return; }
    kaydet(COL.evrak, e?e.id:null, {
      evrakAdi, tur: document.getElementById('f_tur').value,
      tarih: document.getElementById('f_tarih').value,
      durum: document.getElementById('f_durum').value,
      dosyaLinki: document.getElementById('f_dosyaLinki').value.trim(),
      aciklama: document.getElementById('f_aciklama').value.trim()
    });
    modalKapat();
  }, e ? ()=>{ if(confirm('Bu evrak kaydını silmek istiyor musunuz?')){ db.collection(COL.evrak).doc(e.id).delete(); modalKapat(); } } : null);
}

/* ============== NOTLAR — notlar.js dosyasına taşındı ============== */

/* ============== GENEL BAKIŞ (DASHBOARD) ============== */
function renderDashboard(){
  document.getElementById('panelTarih').textContent = bugunMetni();
  // YENİ: saate göre dinamik karşılama (id bulunamazsa .dash-hero-hi class'ına da bakar)
  const heroSelamlaEl = document.getElementById('heroSelamla') || document.querySelector('.dash-hero-hi');
  if(heroSelamlaEl){
    const saat = new Date().getHours();
    const selam = saat < 6 ? 'İyi geceler' : saat < 11 ? 'Günaydın' : saat < 18 ? 'Tünaydın' : saat < 22 ? 'İyi akşamlar' : 'İyi geceler';
    // Aktif kullanıcı adını al — hiç kullanıcı seçilmemişse isim eklemeden
    // sadece selamla (önceden burada sabit "Sedat Bey" yazıyordu, kullanıcı
    // seçilmemiş olsa bile hep bu isim görünüyordu).
    const kullaniciAdi = (function(){
      const id = localStorage.getItem('oyAktifKullaniciId');
      if(!id) return '';
      const o = (typeof ogretmenler !== 'undefined') ? ogretmenler.find(x=>x.id===id) : null;
      if(o && o.ad) return o.ad.split(' ')[0] + ' Bey';
      const p = (typeof personelListesi !== 'undefined') ? personelListesi.find(x=>x.id===id) : null;
      if(p){ const ad = p.ad || p.adSoyad || ''; if(ad) return ad.split(' ')[0] + ' Bey'; }
      return '';
    })();
    heroSelamlaEl.textContent = kullaniciAdi ? `${selam}, ${kullaniciAdi} 👋` : `${selam} 👋`;
  }
  const bugunGun = GUNADI[new Date().getDay()];
  const toplamOgrenci = siniflar.reduce((t,s)=>t+(parseInt(s.ogrenciSayisi)||0),0);
  const kadinOgretmen = ogretmenler.filter(o=>o.cinsiyet==='kadin').length;
  const erkekOgretmen = ogretmenler.filter(o=>o.cinsiyet==='erkek').length;
  const kadinPersonel = ogretmenler.filter(o=>o.cinsiyet==='kadin'||o.cinsiyet==='Kadın').length
    + ((typeof personelListesi!=='undefined') ? personelListesi.filter(p=>p.cinsiyet==='kadin'||p.cinsiyet==='Kadın').length : 0);
  const erkekPersonel = ogretmenler.filter(o=>o.cinsiyet==='erkek'||o.cinsiyet==='Erkek').length
    + ((typeof personelListesi!=='undefined') ? personelListesi.filter(p=>p.cinsiyet==='erkek'||p.cinsiyet==='Erkek').length : 0);
  const kizOgrenci = (typeof veliler!=='undefined') ? veliler.filter(v=>['Kız','K','kiz','kız'].includes(v.cinsiyet)).length : 0;
  const erkekOgrenci = (typeof veliler!=='undefined') ? veliler.filter(v=>['Erkek','E','erkek'].includes(v.cinsiyet)).length : 0;
  const servisSayisi = (typeof servisler !== 'undefined' && Array.isArray(servisler)) ? servisler.length : 0;
  const acikEvrakSayisi = evrakTakibi.filter(e=>e.durum!=='Tamamlandı' && e.durum!=='Arşivlendi').length;

  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card stat-card-clickable" onclick="sekmeAc('ogretmenler')">
      <div class="stat-card-ico-lg stat-card-ico-blue">👨‍🏫</div>
      <div class="stat-card-num">${ogretmenler.length}</div>
      <div class="stat-card-label">Personel</div>
      ${kadinPersonel||erkekPersonel ? `<div class="stat-card-cinsiyet">🚺${kadinPersonel} 🚹${erkekPersonel}</div>` : ''}
      <div class="stat-card-tumu-bottom">Tümü ›</div>
    </div>
    <div class="stat-card stat-card-clickable" onclick="sekmeAc('ogrenciler')">
      <div class="stat-card-ico-lg stat-card-ico-green">🧑‍🎓</div>
      <div class="stat-card-num">${toplamOgrenci}</div>
      <div class="stat-card-label">Öğrenciler</div>
      ${kizOgrenci||erkekOgrenci ? `<div class="stat-card-cinsiyet">🚺${kizOgrenci} 🚹${erkekOgrenci}</div>` : ''}
      <div class="stat-card-tumu-bottom">Tümü ›</div>
    </div>
    <div class="stat-card stat-card-clickable" onclick="sekmeAc('tasima')">
      <div class="stat-card-ico-lg stat-card-ico-purple">🚌</div>
      <div class="stat-card-num">${servisSayisi}</div>
      <div class="stat-card-label">Servis Sayısı</div>
      <div class="stat-card-tumu-bottom">Tümü ›</div>
    </div>
    <div class="stat-card stat-card-clickable" onclick="sekmeAc('evrak')">
      <div class="stat-card-ico-lg stat-card-ico-amber">📄</div>
      <div class="stat-card-num">${acikEvrakSayisi}</div>
      <div class="stat-card-label">Bekleyen Evrak</div>
      <div class="stat-card-tumu-bottom">Tümü ›</div>
    </div>
  `;
  /* ---- Hızlı Bakış: Kadın/Erkek kaldırıldı (artık öğrenci kartında), diğerleri korundu ---- */
  const hizliBakisEl = document.getElementById('dashHizliBakis');
  if(hizliBakisEl){
    hizliBakisEl.innerHTML = `
      <div class="hb-chip" onclick="sekmeAc('siniflar')"><span class="hb-ico">🏫</span><div><div class="hb-num">${siniflar.length}</div><div class="hb-label">Sınıf</div></div></div>
      <div class="hb-chip" onclick="sekmeAc('ogretmenler')"><span class="hb-ico">🚺🚹</span><div><div class="hb-num">${kadinOgretmen}/${erkekOgretmen}</div><div class="hb-label">Öğretmen</div></div></div>
      <div class="hb-chip" onclick="sekmeAc('gorevler')"><span class="hb-ico">📌</span><div><div class="hb-num">${gorevler.filter(g=>g.durum!=='tamamlandi').length}</div><div class="hb-label">Açık Görev</div></div></div>
      <div class="hb-chip" onclick="sekmeAc('takvim')"><span class="hb-ico">⏰</span><div><div class="hb-num">${hatirlaticilar.filter(h=>!h.tamamlandi).length}</div><div class="hb-label">Hatırlatıcı</div></div></div>
    `;
  }
  /* ---- YENİ: Üst bar bildirim zili rozeti (bekleyen hatırlatıcı sayısı) ---- */
  const bellBadgeEl = document.getElementById('topbarBellBadge');
  if(bellBadgeEl){
    const bekleyenSayi = hatirlaticilar.filter(h=>!h.tamamlandi).length;
    bellBadgeEl.textContent = bekleyenSayi;
    bellBadgeEl.style.display = bekleyenSayi>0 ? 'flex' : 'none';
  }

  const buGunDersler = dersProgrami.filter(d=>d.gun===bugunGun).sort((a,b)=>a.saat-b.saat);
  document.getElementById('dashBugunDersler').innerHTML = (dersSaatleriAyarlari && dersSaatleriAyarlari.tatilModu) ? '<p class="empty-state">🏖️ Tatil modu aktif.</p>' : !GUNLER.includes(bugunGun) ? '<p class="empty-state">Bugün hafta sonu.</p>' :
    (buGunDersler.length ? buGunDersler.map(d=>`<div class="dash-row"><span class="badge badge-blue">${d.saat}.</span> ${escapeHtml(d.sinif)} — ${escapeHtml(d.ders)} <span style="color:var(--ink-muted)">(${escapeHtml(ogretmenAdi(d.ogretmenId))})</span></div>`).join('') : '<p class="empty-state">Bugün için ders programı girilmemiş.</p>');

  /* "Bugün Nöbetçi Öğretmenler" kartı artık js/nobet.js > renderNobetBugunVeHafta() tarafından dolduruluyor. */

  const yaklasan = hatirlaticilar.filter(h=>!h.tamamlandi).sort((a,b)=>(a.tarih+(a.saat||'')).localeCompare(b.tarih+(b.saat||''))).slice(0,5);
  document.getElementById('dashHatirlaticilar').innerHTML = yaklasan.length ? yaklasan.map(h=>`<div class="dash-row">${formatTarih(h.tarih)} — ${escapeHtml(h.baslik)}</div>`).join('') : '<p class="empty-state">Bekleyen hatırlatıcı yok.</p>';

  const dashGorevlerEl = document.getElementById('dashGorevler');
  if(dashGorevlerEl) dashGorevlerEl.innerHTML = `
    <div class="dash-row">Yapılacak: <strong>${gorevler.filter(g=>g.durum==='yapilacak').length}</strong></div>
    <div class="dash-row">Yapılıyor: <strong>${gorevler.filter(g=>g.durum==='yapiliyor').length}</strong></div>
    <div class="dash-row">Tamamlandı: <strong>${gorevler.filter(g=>g.durum==='tamamlandi').length}</strong></div>
  `;

  /* ---- Son Notlar ---- */
  if(typeof renderDashboardNotlar === 'function') renderDashboardNotlar();

  /* ---- Zil sayacı + şu anki ders saatindeki sınıflar ---- */
  renderZilSayaci(bugunGun);
  if(typeof renderYaklasanEtkinlikler === 'function') renderYaklasanEtkinlikler();

  /* ---- Takvim widget'ları ---- */
  if(typeof renderDashHatirlaticilar  === 'function') renderDashHatirlaticilar();
  if(typeof renderDashAjanda         === 'function') renderDashAjanda();
  if(typeof renderDashMiniTakvim      === 'function') renderDashMiniTakvim();
  if(typeof renderDashYillikGorunum   === 'function') renderDashYillikGorunum();

  tatilModuKartlariniUygula();
}

function tatilModuKartlariniUygula(){
  const tatil = !!(dersSaatleriAyarlari && dersSaatleriAyarlari.tatilModu);
  document.querySelectorAll('.tatil-gizle').forEach(el=>{
    if(tatil){
      // setAttribute ile !important inline style — cssText ve setProperty'den daha güvenilir
      el.setAttribute('style', 'display:none!important;visibility:hidden!important;');
    } else {
      el.removeAttribute('style');
    }
  });
  // body class ile CSS tarafını da tetikle
  document.body.classList.toggle('tatil-aktif', tatil);
}

function renderZilSayaci(bugunGun){
  const zilEl = document.getElementById('zilWidget');
  const suankiEl = document.getElementById('dashSuankiDers');
  if(!zilEl) return;
  // YENİ: durum bazlı renklendirme (ders=yeşil, teneffüs/öğle=turuncu, bitti=gri, başlamadı=mavi, tatil=mor)
  // YENİ: hero kartına saate göre sahne (gün doğumu/öğle/gün batımı/gece) uygula
  const heroEl = document.querySelector('.dash-hero');
  if(heroEl){
    const saat2 = new Date().getHours();
    const sahne = (saat2>=5 && saat2<8) ? 'sahne-gundogumu'
      : (saat2>=8 && saat2<17) ? 'sahne-ogle'
      : (saat2>=17 && saat2<20) ? 'sahne-gunbatimi'
      : 'sahne-gece';
    heroEl.classList.remove('sahne-gundogumu','sahne-ogle','sahne-gunbatimi','sahne-gece');
    heroEl.classList.add(sahne);
  }

  function zilDurumSinifAyarla(durumAdi){
    zilEl.classList.remove('durum-ders','durum-teneffus','durum-ogle','durum-bitti','durum-baslamadi','durum-tatil');
    if(durumAdi) zilEl.classList.add('durum-'+durumAdi);
  }
  // Kart görünürlüğü tatilModuKartlariniUygula() tarafından yönetilir
  const ayar = dersSaatleriAyarlari;
  if(ayar && ayar.tatilModu){
    // Tatil modu: gizlenecek kartlar
    // Kart gizleme tatilModuKartlariniUygula() tarafından yapılır
    // Okul açılış sayacı
    const acilisTarihi = ayar.okulAcilisTarihi;
    let sayacHTML = '';
    if(acilisTarihi){
      const acilis = new Date(acilisTarihi + 'T00:00:00');
      const bugun = new Date(); bugun.setHours(0,0,0,0);
      const fark = Math.ceil((acilis - bugun) / (1000*60*60*24));
      if(fark > 0){
        sayacHTML = `<div style="display:flex;align-items:center;justify-content:space-between;">
          <div><div class="zil-etiket">🏖️ Tatil Modu — Okul kapalı</div><div class="zil-alt">${escapeHtml(ayar.tatilModuNotu||'Okulun açılmasına kalan süre')}</div></div>
          <div class="zil-sayac">${fark} <span>gün</span></div>
        </div>`;
      } else if(fark === 0){
        sayacHTML = `<div class="zil-durum">🎉 Bugün okul açılıyor!</div>`;
      } else {
        sayacHTML = `<div class="zil-durum">🏖️ Tatil Modu Aktif${ayar.tatilModuNotu?'<div style="margin-top:6px;font-size:13px;color:var(--ink-muted);font-weight:400;">'+escapeHtml(ayar.tatilModuNotu)+'</div>':''}</div>`;
      }
    } else {
      sayacHTML = `<div class="zil-durum">🏖️ Tatil Modu Aktif${ayar.tatilModuNotu?'<div style="margin-top:6px;font-size:13px;color:var(--ink-muted);font-weight:400;">'+escapeHtml(ayar.tatilModuNotu)+'</div>':''}</div>`;
    }
    zilDurumSinifAyarla('tatil');
    zilEl.innerHTML = sayacHTML;
    return;
  }
  if(!GUNLER.includes(bugunGun)){
    zilDurumSinifAyarla('bitti');
    zilEl.innerHTML = `<div class="zil-durum">🌤️ Bugün hafta sonu — okul saatleri geçerli değil.</div>`;
    if(suankiEl) suankiEl.innerHTML = '<p class="empty-state">Bugün hafta sonu.</p>';
    return;
  }
  const durum = suankiDersDurumu();
  if(durum.durum==='yok'){
    zilDurumSinifAyarla(null);
    zilEl.innerHTML = `<div class="zil-durum">Ders saatleri henüz Ayarlar sayfasından girilmedi.</div>`;
    if(suankiEl) suankiEl.innerHTML = '<p class="empty-state">Ders saatleri girilmeden gösterilemiyor.</p>';
    return;
  }
  const etiketler = { ders:`📖 Şu an ${durum.etiket}`, teneffus:'☕ Teneffüste / derse hazırlanılıyor', ogle:'🍽️ Öğle arasında', bitti:'🏁 Ders saatleri sona erdi', baslamadi:'🔔 Okul henüz başlamadı' };
  const durumPilleri = { ders:'Devam ediyor', teneffus:'Teneffüs', ogle:'Öğle Arası', baslamadi:'Henüz başlamadı', bitti:'Sona erdi' };
  zilDurumSinifAyarla(durum.durum==='ogle' ? 'teneffus' : durum.durum);
  if(durum.durum==='bitti'){
    zilEl.innerHTML = `<div class="zil-durum">🏁 Bugünün ders saatleri sona erdi.</div>`;
  } else {
    const altMetin = durum.durum==='ders' ? `Bitimine kalan süre`
      : durum.durum==='ogle' ? 'Öğle arası bitimine kalan süre'
      : durum.durum==='baslamadi' ? 'Okulun başlamasına kalan süre'
      : `${durum.etiket} başlamasına kalan süre`;
    // YENİ: ilerleme yüzdesi (progBaslangic/progToplamDk varsa hesaplanır, yoksa bar gösterilmez)
    let barHTML = '';
    let saatAraligiHTML = '';
    if(durum.progToplamDk>0){
      const gecenDk = durum.progToplamDk - durum.kalanDk;
      const yuzde = Math.max(0, Math.min(100, Math.round((gecenDk/durum.progToplamDk)*100)));
      barHTML = `<div class="zil-progress"><div class="zil-progress-fill" style="width:${yuzde}%"></div></div>`;
      // YENİ: başlangıç-bitiş saat aralığı (mockup'taki "10:10 - 10:55" satırı)
      const dkSaatStr = dk => { const h=Math.floor(dk/60)%24, m=dk%60; return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); };
      saatAraligiHTML = `<div class="zil-saat-araligi">${dkSaatStr(durum.progBaslangic)} - ${dkSaatStr(durum.progBaslangic+durum.progToplamDk)}</div>`;
    }
    zilEl.innerHTML = `
      <div class="zil-sol">
        <div class="zil-ikon-daire">🔔</div>
        <div>
          <div class="zil-baslik-kucuk">Zil Durumu</div>
          <div class="zil-etiket">${durum.etiket || etiketler[durum.durum]}</div>
          <span class="zil-pill">${durumPilleri[durum.durum]||''}</span>
        </div>
      </div>
      <div class="zil-sag">
        <div class="zil-baslik-kucuk zil-baslik-sag">${altMetin}</div>
        <div class="zil-sayac">${durum.kalanDk} <span>dk</span></div>
        ${barHTML}
        ${saatAraligiHTML}
      </div>
    `;
  }
  if(suankiEl){
    if(durum.durum==='ders'){
      const buSaatDersler = dersProgrami.filter(d=>d.gun===bugunGun && d.saat===durum.saat);
      suankiEl.innerHTML = buSaatDersler.length ? buSaatDersler.map(d=>`<div class="dash-row">${escapeHtml(d.sinif)} — ${escapeHtml(d.ders)} <span style="color:var(--ink-muted)">(${escapeHtml(ogretmenAdi(d.ogretmenId))})</span></div>`).join('') : '<p class="empty-state">Bu saat için ders programı girilmemiş.</p>';
    } else if(durum.durum==='ogle'){
      suankiEl.innerHTML = '<p class="empty-state">Şu an öğle arası.</p>';
    } else if(durum.durum==='baslamadi'){
      suankiEl.innerHTML = `<p class="empty-state">Okul henüz başlamadı — ilk ders: ${escapeHtml(durum.etiket)}.</p>`;
    } else {
      suankiEl.innerHTML = `<p class="empty-state">Şu an teneffüs — sıradaki: ${escapeHtml(durum.etiket)}.</p>`;
    }
  }
}

/* ============== YEDEKLEME ============== */
async function yedekVerisiOlustur(){
  let mevzuat;
  try{ mevzuat = typeof mevzuatTumVeriyiOku === 'function' ? await mevzuatTumVeriyiOku() : undefined; }
  catch(e){ console.warn('Mevzuat verisi yedeğe eklenemedi:', e.message); }

  return {
    tarih: new Date().toISOString(), ogretmenler, dersProgrami, hatirlaticilar, gorevler, evrakTakibi, notlar,
    nobetYerleri, nobetAtamalari, nobetciAmirleri, resmiTatiller, periyodikIsler,
    dersSaatleriAyarlari: dersSaatleriAyarlari || undefined,
    siniflar, veliler, servisler,
    dersListesi: typeof dersListesi !== 'undefined' ? dersListesi : [],
    bransListesi: typeof bransListesi !== 'undefined' ? bransListesi : [],
    okulBilgileri: okulBilgileriAyari || undefined,
    periyodikSablon: periyodikSablonu || undefined,
    sosyalKulupler: cizelgeVerileri.sosyalKulupler, sok: cizelgeVerileri.sok, zumre: cizelgeVerileri.zumre,
    bepPlani: cizelgeVerileri.bepPlani, rehberlik: cizelgeVerileri.rehberlik, maarifRapor: cizelgeVerileri.maarifRapor,
    belirliGunler: typeof belirliGunlerListesi !== 'undefined' ? belirliGunlerListesi : [],
    digerEvrak: typeof digerEvrakListesi !== 'undefined' ? digerEvrakListesi : [],
    sinavlar, denemeSinavlari,
    personel: typeof personelListesi !== 'undefined' ? personelListesi : [],
    mevzuat: mevzuat || undefined
  };
}
async function tumVerileriYedekle(){
  const yedek = await yedekVerisiOlustur();
  const jsonMetin = JSON.stringify(yedek, null, 2);
  // UTF-8 güvenli base64 (Türkçe karakterler için btoa tek başına yetmez)
  const base64Json = btoa(unescape(encodeURIComponent(jsonMetin)));
  uygulamaDosyaKaydet(base64Json, `okul-yedek-${todayISO()}.json`, 'application/json');
}
async function yedektenGeriYukle(file){
  if(!file) return;
  const metin = await file.text();
  try{
    const data = JSON.parse(metin);
    if(!confirm("Yedekteki kayıtlar mevcut verilerinizin üzerine yazılacak (aynı ID'ye sahip olanlar güncellenecek, yeni olanlar eklenecek). Devam edilsin mi?")) return;
    const eslemeler = [
      [data.ogretmenler, COL.ogretmenler],[data.dersProgrami, COL.dersProgrami],
      [data.siniflar, COL.siniflar],[data.veliler, COL.veliler],
      [data.nobetYerleri, COL.nobetYerleri],[data.nobetAtamalari, COL.nobetAtamalari],
      [data.nobetciAmirleri, COL.nobetciAmirleri],[data.resmiTatiller, COL.resmiTatiller],
      [data.hatirlaticilar, COL.hatirlaticilar],[data.gorevler, COL.gorevler],
      [data.evrakTakibi, COL.evrak],[data.notlar, COL.notlar],
      [data.sosyalKulupler, COL.sosyalKulupler],[data.sok, COL.sok],[data.zumre, COL.zumre],
      [data.bepPlani, COL.bepPlani],[data.rehberlik, COL.rehberlik],[data.maarifRapor, COL.maarifRapor],
      [data.belirliGunler, COL.belirliGunler],[data.digerEvrak, COL.digerEvrak],
      [data.periyodikIsler, COL.periyodikIsler],[data.servisler, COL.servisler],
      [data.sinavlar, COL.sinavlar],[data.denemeSinavlari, COL.denemeSinavlari],
      [data.dersListesi, COL.dersListesi],[data.bransListesi, COL.bransListesi],
      [data.personel, COL.personel]
    ];
    for(const [liste, koleksiyon] of eslemeler){
      if(!Array.isArray(liste)) continue;
      for(const oge of liste){
        const {id, ...veri} = oge;
        if(id){ await db.collection(koleksiyon).doc(id).set(veri); }
        else { await db.collection(koleksiyon).add(veri); }
      }
    }
    if(data.dersSaatleriAyarlari){
      await db.collection(COL.dersSaatleri).doc('ayarlar').set(data.dersSaatleriAyarlari);
    }
    if(data.okulBilgileri){
      await db.collection(COL.okulBilgileri).doc('ayarlar').set(data.okulBilgileri);
    }
    if(data.periyodikSablon){
      await db.collection(COL.periyodikSablon).doc('sablon').set({ gorevler: data.periyodikSablon });
    }
    if(data.mevzuat && typeof mevzuatYedektenYukle === 'function'){
      try{ await mevzuatYedektenYukle(data.mevzuat); }
      catch(e){ console.warn('Mevzuat geri yüklenemedi:', e.message); }
    }
    toast('Geri yükleme tamamlandı.');
  }catch(err){
    toast('Geri yükleme hatası: '+err.message);
  }
}

/* ============== FIRESTORE BAĞLANTILARI ============== */
function baglantilariKur(){
  if(baglantilarKuruldu) return;
  baglantilarKuruldu = true;
  db.collection(COL.ogretmenler).onSnapshot(s=>{ ogretmenler = s.docs.map(d=>({id:d.id,...d.data()})); renderOgretmenler(); renderDersGrid(); renderDashboard(); renderOkulBilgileriSayfasi(); if(typeof aktifKullaniciyiGuncelle==='function') aktifKullaniciyiGuncelle(); if(typeof globalAramaYap==='function') globalAramaYap(); onbellekKaydet(); }, hataGoster);
  db.collection(COL.dersProgrami).onSnapshot(s=>{ dersProgrami = s.docs.map(d=>({id:d.id,...d.data()})); renderDersGrid(); renderDashboard(); if(detaySinifId){ const sn=siniflar.find(x=>x.id===detaySinifId); if(sn) sinifDetayDersRender(sn); } if(typeof widgetGuncelle==='function') setTimeout(widgetGuncelle,500); }, hataGoster);
  db.collection(COL.siniflar).onSnapshot(s=>{ siniflar = s.docs.map(d=>({id:d.id,...d.data()})); renderSiniflar(); renderDersGrid(); renderDashboard(); renderVeriSekmesi(); if(detaySinifId){ const sn=siniflar.find(x=>x.id===detaySinifId); if(sn) sinifDetayBilgiRender(sn); } if(typeof globalAramaYap==='function') globalAramaYap(); onbellekKaydet(); }, hataGoster);
  db.collection(COL.veliler).onSnapshot(s=>{ veliler = s.docs.map(d=>({id:d.id,...d.data()})); if(detaySinifId){ const sn=siniflar.find(x=>x.id===detaySinifId); if(sn){ sinifDetayBilgiRender(sn); sinifDetayOgrenciRender(sn); } } if(typeof renderOgrenciler==='function') renderOgrenciler(); if(typeof globalAramaYap==='function') globalAramaYap(); onbellekKaydet(); }, hataGoster);
  nobetBaglantilariKur();
  db.collection(COL.hatirlaticilar).onSnapshot(s=>{ hatirlaticilar = s.docs.map(d=>({id:d.id,...d.data()})); renderHatirlaticilar(); renderDashboard(); }, hataGoster);
  db.collection(COL.gorevler).onSnapshot(s=>{ gorevler = s.docs.map(d=>({id:d.id,...d.data()})); renderGorevler(); renderDashboard(); }, hataGoster);
  db.collection(COL.evrak).onSnapshot(s=>{ evrakTakibi = s.docs.map(d=>({id:d.id,...d.data()})); renderEvrakTakibi(); renderDashboard(); if(typeof globalAramaYap==='function') globalAramaYap(); onbellekKaydet(); }, hataGoster);
  db.collection(COL.notlar).onSnapshot(s=>{ notlar = s.docs.map(d=>({id:d.id,...d.data()})); renderNotlar(); if(typeof renderDashboardNotlar==='function') renderDashboardNotlar(); if(typeof globalAramaYap==='function') globalAramaYap(); onbellekKaydet(); }, hataGoster);

  ['sosyalKulupler','sok','zumre','bepPlani','rehberlik','maarifRapor'].forEach(tip=>{
    db.collection(COL[tip]).onSnapshot(s=>{ cizelgeVerileri[tip] = s.docs.map(d=>({id:d.id,...d.data()})); renderCizelge(tip); if(tip==='sosyalKulupler') renderSosyalKuluplerListesi(); }, hataGoster);
  });
  db.collection(COL.belirliGunler).onSnapshot(s=>{ belirliGunlerListesi = s.docs.map(d=>({id:d.id,...d.data()})); renderBelirliGunler(); renderYaklasanEtkinlikler(); }, hataGoster);
  db.collection(COL.digerEvrak).onSnapshot(s=>{ digerEvrakListesi = s.docs.map(d=>({id:d.id,...d.data()})); if(typeof renderDigerEvrak==='function') renderDigerEvrak(); }, hataGoster);
  periyodikBaglantilariKur();
  tasimaBaglantilariKur();
  if(typeof haberlerBaglantilariKur === 'function') haberlerBaglantilariKur();
  if(typeof servisOturmaBaglantisiKur === "function") servisOturmaBaglantisiKur();
  sinavBaglantilariKur();
  if(typeof dokumanlarBaglantisiKur === 'function') dokumanlarBaglantisiKur();
  db.collection(COL.dersSaatleri).doc('ayarlar').onSnapshot(doc=>{
    dersSaatleriAyarlari = doc.exists ? doc.data() : null;
    renderDersSaatleriForm(); renderDersGrid(); renderDashboard(); tatilModuKartlariniUygula();
    if(typeof widgetGuncelle==='function') setTimeout(widgetGuncelle,500);
  }, hataGoster);
  db.collection(COL.okulBilgileri).doc('ayarlar').onSnapshot(doc=>{
    okulBilgileriAyari = doc.exists ? doc.data() : null;
    renderOkulBilgileriSayfasi();
    if(typeof widgetGuncelle==='function') setTimeout(widgetGuncelle,500);
  }, hataGoster);
  db.collection(COL.dersListesi).onSnapshot(s=>{
    dersListesi = s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'));
    renderDersListesiYonetim();
  }, hataGoster);
  db.collection(COL.bransListesi).onSnapshot(s=>{
    bransListesi = s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.ad||'').localeCompare(b.ad||'','tr'));
    renderBransListesiYonetim();
  }, hataGoster);
  if(typeof personelBaglantilariKur === 'function') personelBaglantilariKur();
  if(typeof personelIzinBaglantilariKur === 'function') personelIzinBaglantilariKur();
}

/* ============== UYGULAMA BAŞLATMA / GEZİNME ============== */
/* ---------- Sekme geçmişi (Android donanım geri tuşu için) ---------- */
let _sekmeGecmisi = ['panel'];
let _geriGidiliyor = false;

function bottomNavAktifYap(el){
  document.querySelectorAll('.bn-item').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
}

function sekmeAc(tab){
  document.querySelectorAll('.nav-tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active', p.id==='tab-'+tab));
  document.querySelectorAll('.bn-item[data-tab]').forEach(b=>b.classList.toggle('active', b.dataset.tab===tab));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // YENİ: açık hava durumu detay panelini kapat
  var wp = document.getElementById('havaDurumuDetayPanel');
  if(wp) wp.remove();
  // YENİ: açık kullanıcı seçim modalını kapat
  var km = document.getElementById('kullaniciSecModal');
  if(km) km.style.display = 'none';
  document.body.classList.remove('modal-open');
  // Arama sekmesi açılınca sonuçları güncelle — veriler henüz yüklenmemiş
  // olabilir, bu yüzden onSnapshot dinleyicileri de globalAramaYap()'ı
  // ayrıca tetikliyor; burada da tazelemek ilk açılışı garantiye alır.
  if(tab === 'arama' && typeof globalAramaYap === 'function') globalAramaYap();

  // Geçmiş yığını: geri tuşuyla gelinen bir geçiş değilse ve aynı sekme
  // tekrar açılmıyorsa geçmişe ekle (Android donanım geri tuşu için).
  if(!_geriGidiliyor && _sekmeGecmisi[_sekmeGecmisi.length-1] !== tab){
    _sekmeGecmisi.push(tab);
    if(_sekmeGecmisi.length > 40) _sekmeGecmisi.shift();
  }
  _geriGidiliyor = false;
}

/* Android MainActivity.onBackPressed() tarafından çağrılır.
   Dönüş değerleri: 'handled' (bir şey kapatıldı/geri gidildi, native hiçbir
   şey yapmasın) veya 'exit' (uygulamanın en üst seviyesindeyiz, native
   çift-basışla-çık mantığını uygulasın). */
function geriTusuIsle(){
  var mo = document.getElementById('modalOverlay');
  if(mo && mo.classList.contains('active')){ modalKapat(); return 'handled'; }

  var deo = document.getElementById('detayOverlay');
  if(deo && deo.classList.contains('active')){ detayPanelKapat(); return 'handled'; }

  var ksm = document.getElementById('kullaniciSecModal');
  if(ksm && ksm.style.display && ksm.style.display !== 'none'){
    if(typeof kullaniciSecModalKapat === 'function') kullaniciSecModalKapat(); else ksm.style.display = 'none';
    return 'handled';
  }

  var hp = document.getElementById('havaDurumuDetayPanel');
  if(hp){ hp.remove(); return 'handled'; }

  var hem = document.getElementById('hizliEkleModal');
  if(hem && hem.style.display && hem.style.display !== 'none'){
    if(typeof hizliEkleModalKapat === 'function') hizliEkleModalKapat(); else hem.style.display = 'none';
    return 'handled';
  }

  if(document.body.classList.contains('nav-open')){ menuKapat(); return 'handled'; }

  if(_sekmeGecmisi.length > 1){
    _sekmeGecmisi.pop();
    var onceki = _sekmeGecmisi[_sekmeGecmisi.length-1];
    _geriGidiliyor = true;
    sekmeAc(onceki);
    return 'handled';
  }

  return 'exit';
}
window.geriTusuIsle = geriTusuIsle;

function haritaSekmesiAc(){
  sekmeAc('harita');
  // Harita başlatmayı bir sonraki tick'e bırak (DOM görünür olduktan sonra)
  setTimeout(()=>{
    if(typeof haritaBaslat === 'function') haritaBaslat();
    if(typeof renderHaritaServisler === 'function') renderHaritaServisler();
  }, 50);
}
function uygulamaBaslat(){
  document.getElementById('bugunMetni').textContent = bugunMetni();
  baglantilariKur();
  // Capacitor'ın initialize olmasını bekle, sonra push durumunu kontrol et
  setTimeout(()=>{
    pushDurumGuncelle();
    pushOnMessageDinleyiciKur();
  }, 1000);
  setInterval(()=>{ renderZilSayaci(GUNADI[new Date().getDay()]); }, 30000);
}

/* ================================================================
   YEREL ÖNBELLEK (localStorage) — Firestore verileri cihazda saklanır,
   uygulama açılır açılmaz (Firestore bağlantısı/IndexedDB beklenmeden)
   en son bilinen veriyle anında dolu gelir. Firestore zaten IndexedDB
   ile offline önbellek tutuyor (bkz. firebase-init.js enablePersistence)
   ama bu ek katman DOMContentLoaded anında SENKRON çalıştığı için ilk
   ekran, Firestore'un kendi önbelleğini açmasını bile beklemeden dolu
   gelir — özellikle yavaş/kararsız bağlantılarda (ör. arama sekmesi)
   fark yaratır.
   ================================================================ */
const _ONBELLEK_ANAHTARI = 'oyVeriOnbellek_v1';

function onbellekYukle(){
  try{
    const ham = localStorage.getItem(_ONBELLEK_ANAHTARI);
    if(!ham) return;
    const v = JSON.parse(ham);
    if(Array.isArray(v.ogretmenler)) ogretmenler = v.ogretmenler;
    if(Array.isArray(v.veliler)) veliler = v.veliler;
    if(Array.isArray(v.siniflar)) siniflar = v.siniflar;
    if(Array.isArray(v.servisler)) servisler = v.servisler;
    if(Array.isArray(v.personelListesi)) personelListesi = v.personelListesi;
    if(Array.isArray(v.evrakTakibi)) evrakTakibi = v.evrakTakibi;
    if(Array.isArray(v.notlar)) notlar = v.notlar;

    // Önbellekten gelen veriyle ekranı hemen çiz — Firestore bağlanınca
    // ilgili onSnapshot dinleyicileri zaten en güncel veriyle üzerine yazacak.
    if(typeof renderOgretmenler==='function') renderOgretmenler();
    if(typeof renderSiniflar==='function') renderSiniflar();
    if(typeof renderOgrenciler==='function') renderOgrenciler();
    if(typeof renderServisler==='function') renderServisler();
    if(typeof renderPersonelListesi==='function') renderPersonelListesi();
    if(typeof renderEvrakTakibi==='function') renderEvrakTakibi();
    if(typeof renderNotlar==='function') renderNotlar();
    if(typeof renderDashboard==='function') renderDashboard();
    if(typeof globalAramaYap==='function') globalAramaYap();
  }catch(e){ console.warn('Yerel önbellek okunamadı:', e); }
}

let _onbellekYaziZamanlayici = null;
function onbellekKaydet(){
  // Art arda gelen snapshot güncellemelerinde tek tek yazmamak için
  // kısa bir gecikmeyle (debounce) topluca kaydeder.
  clearTimeout(_onbellekYaziZamanlayici);
  _onbellekYaziZamanlayici = setTimeout(()=>{
    try{
      localStorage.setItem(_ONBELLEK_ANAHTARI, JSON.stringify({
        ogretmenler, veliler, siniflar, servisler,
        personelListesi, evrakTakibi, notlar
      }));
    }catch(e){ console.warn('Yerel önbellek yazılamadı:', e); }
  }, 400);
}

document.addEventListener('DOMContentLoaded', ()=>{
  // Firestore/ağ beklenmeden, cihazda daha önce kaydedilmiş son veriyle
  // ekranı anında doldur (bkz. yukarıdaki YEREL ÖNBELLEK bölümü).
  onbellekYukle();

  document.querySelectorAll('.nav-tab').forEach(btn=>{
    btn.addEventListener('click', ()=> sekmeAc(btn.dataset.tab));
  });
  document.getElementById('modalOverlay')?.addEventListener('click', e=>{ if(e.target.id==='modalOverlay') modalKapat(); });
  document.getElementById('detayOverlay')?.addEventListener('click', e=>{ if(e.target.id==='detayOverlay') detayPanelKapat(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ modalKapat(); detayPanelKapat(); } });
  document.getElementById('bildirimAcBtn')?.addEventListener('click', bildirimleriAc);

  // Widget "Not Ekle" butonundan gelen deep-link
  // MainActivity, page="notlar" extra'sını JS'e iletir.
  // NOT: sekmeAc() parametresi HTML'deki data-tab değeriyle eşleşmeli.
  //      index.html'de Not sekmesinin data-tab değeri neyse onu kullan.
  window.addEventListener('widgetSayfaAc', (e) => {
    const page = e.detail?.page;
    if (page && typeof sekmeAc === 'function') {
      sekmeAc(page); // page = 'notlar' — index.html'deki data-tab ile eşleş
    }
  });

  try{
    if(firebaseyiBaslat()){
      authDinleyiciKur();
    }
  }catch(err){
    console.error('Başlatma hatası:', err);
    const app = document.getElementById('app');
    if(app) app.classList.add('ready','show');
  }
});

/* ============== ÖĞRENCİ LİSTESİ EXCEL ŞABLONU ============== */
function ogrenciSablonIndir(){
  const wb = XLSX.utils.book_new();
  const basliklar = [
    'Öğrenci Adı', 'Öğrenci No', 'Cinsiyet', 'Veli Adı', 'Yakınlık',
    'Telefon 1', 'Telefon 2', 'Telefon 3', 'Adres', 'Sınıf', 'Servis', 'Notlar'
  ];
  const ornekler = [
    ['Ayşe Demir', '1001', 'Kız', 'Fatma Demir', 'Anne', '0532 000 00 01', '0532 000 00 02', '', 'Merkez Mah. No:5', '5-A', '1. Servis', ''],
    ['Mehmet Kaya', '1002', 'Erkek', 'Ali Kaya', 'Baba', '0533 000 00 01', '', '', 'Yıldız Mah. No:12', '5-B', '', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet([basliklar, ...ornekler]);
  ws['!cols'] = basliklar.map((_,i)=>({wch: i===8||i===0?30:i===3?20:15}));
  XLSX.utils.book_append_sheet(wb, ws, 'Öğrenci Listesi');
  XLSX.writeFile(wb, 'Ogrenci_Listesi_Sablonu.xlsx');
}


function telefonTemizle(t){ return String(t||'').replace(/[^0-9+]/g,''); }
function telefonAra(telefon){ const no=telefonTemizle(telefon); if(no) window.location.href=`tel:${no}`; }
function whatsappGonder(telefon, mesaj){ let no=telefonTemizle(telefon); if(no.startsWith("0")) no="90"+no.substring(1); window.open(`https://wa.me/${no}?text=${encodeURIComponent(mesaj||"")}`,"_blank"); }

/* ================================================================
   EXCEL ŞABLON İNDİRME
   SheetJS ile tarayıcıda şablon oluşturup indirir — sunucu gerektirmez.
   ================================================================ */

const SABLON_TANIMLARI = {
  ogretmenler: {
    baslik: 'ÖĞRETMEN LİSTESİ — İçe Aktarma Şablonu',
    not: '* işaretli alanlar zorunludur.',
    kolonlar: [
      {ad:'Ad', gen:15, zon:true}, {ad:'Soyad', gen:15, zon:true},
      {ad:'Ünvan', gen:20}, {ad:'Branş', gen:20},
      {ad:'Derece', gen:8}, {ad:'Kademe', gen:8},
      {ad:'Telefon', gen:14}, {ad:'E-Posta', gen:22},
      {ad:'Sorumlu Sınıf', gen:14}, {ad:'Not', gen:20}
    ],
    ornek: ['Fatma','Şenocak','Öğretmen','Türkçe','5','3','0532...','fatma@mail.com','5-A','']
  },
  siniflar: {
    baslik: 'SINIF LİSTESİ — İçe Aktarma Şablonu',
    not: 'Sınıf Öğretmeni: uygulamada kayıtlı Ad Soyad formatında yazın.',
    kolonlar: [
      {ad:'Sınıf Adı', gen:12, zon:true}, {ad:'Seviye', gen:10},
      {ad:'Şube', gen:8}, {ad:'Derslik', gen:10}, {ad:'Sınıf Öğretmeni', gen:22}
    ],
    ornek: ['5-A','5','A','D-12','Fatma Şenocak']
  },
  ogrenciler: {
    baslik: 'ÖĞRENCİ / VELİ LİSTESİ — İçe Aktarma Şablonu',
    not: 'Servis: uygulamada kayıtlı servis adını yazın.',
    kolonlar: [
      {ad:'Öğrenci Adı', gen:20, zon:true}, {ad:'Öğrenci No', gen:12},
      {ad:'Cinsiyet', gen:10}, {ad:'Sınıf', gen:10},
      {ad:'Veli Adı', gen:18}, {ad:'Yakınlık', gen:12},
      {ad:'Telefon 1', gen:14}, {ad:'Telefon 2', gen:14}, {ad:'Telefon 3', gen:14},
      {ad:'Adres', gen:25}, {ad:'Servis', gen:18}, {ad:'Notlar', gen:20}
    ],
    ornek: ['Ali Yılmaz','1001','Erkek','5-A','Mehmet Yılmaz','Baba','0532...','','','Merkez Mah.','1. Servis','']
  },
  dersler: {
    baslik: 'DERS LİSTESİ — İçe Aktarma Şablonu',
    not: 'Kısaltma: çarşaf raporda kullanılır (MAT, TÜR, FEN...)',
    kolonlar: [{ad:'Ders Adı', gen:25, zon:true}, {ad:'Kısaltma', gen:12}, {ad:'Not', gen:25}],
    ornek: ['Matematik','MAT','']
  },
  branslar: {
    baslik: 'BRANŞ LİSTESİ — İçe Aktarma Şablonu',
    not: 'Öğretmen kayıtlarında branş alanında açılır listede görünür.',
    kolonlar: [{ad:'Branş Adı', gen:30, zon:true}, {ad:'Not', gen:25}],
    ornek: ['Sınıf Öğretmenliği','']
  },
  dersProgrami: {
    baslik: 'DERS PROGRAMI — İçe Aktarma Şablonu',
    not: 'Saat: 1-7 arası sayı. Gün: Pazartesi/Salı/Çarşamba/Perşembe/Cuma.',
    kolonlar: [
      {ad:'Sınıf', gen:10, zon:true}, {ad:'Gün', gen:12, zon:true},
      {ad:'Saat', gen:8, zon:true}, {ad:'Ders', gen:20, zon:true},
      {ad:'Öğretmen', gen:22}
    ],
    ornek: ['5-A','Pazartesi','1','Matematik','Ünal Balık']
  },
  nobetProgrami: {
    baslik: 'NÖBET PROGRAMI — İçe Aktarma Şablonu',
    not: 'Tatil için "Resmi Tatil", hafta sonu için "Haftasonu" yazın.',
    kolonlar: [
      {ad:'Tarih', gen:14, zon:true}, {ad:'Gün', gen:12, zon:true},
      {ad:'Okul Binası', gen:20}, {ad:'Bahçe', gen:20},
      {ad:'Koridor', gen:20}, {ad:'Nöbetçi Amir', gen:22}
    ],
    ornek: ['01.09.2026','Salı','Fatma Şenocak','Ünal Balık','','Sedat Karagöz']
  },
  servisOgrencileri: {
    baslik: 'SERVİS ÖĞRENCİ LİSTESİ — İçe Aktarma Şablonu',
    not: 'Tek servis için kullanılır. Uygulamada önce servisi seçin.',
    kolonlar: [
      {ad:'Öğrenci Adı', gen:22, zon:true}, {ad:'Öğrenci No', gen:12},
      {ad:'Sınıf', gen:10}, {ad:'Not', gen:25}
    ],
    ornek: ['Ali Yılmaz','1001','5-A','']
  },
  yaziliSinavlar: {
    baslik: 'YAZILI SINAV TAKVİMİ — İçe Aktarma Şablonu',
    not: 'Birden fazla sınıf için virgülle ayırın: "5-A, 6-A". Tür: Yazılı/Sınav/Proje.',
    kolonlar: [
      {ad:'Sınıf(lar)', gen:16, zon:true}, {ad:'Ders', gen:20, zon:true},
      {ad:'Tarih', gen:12, zon:true}, {ad:'Dönem', gen:12},
      {ad:'Yazılı Sırası', gen:14}, {ad:'Tür', gen:10},
      {ad:'Kaçıncı Ders', gen:12}, {ad:'Senaryo No', gen:12},
      {ad:'Yayınevi', gen:14}, {ad:'Notlar', gen:20}
    ],
    ornek: ['5-A, 6-A','Matematik','15.10.2026','1. Dönem','1. Yazılı','Yazılı','3','2','MEB','']
  }
};

function sablonIndir(tip) {
  const t = SABLON_TANIMLARI[tip];
  if (!t) return;

  const wb = XLSX.utils.book_new();
  const ws = {};
  const BASLIK_BG = 'FF0A6E6E', ZORUNLU_BG = 'FFFFF3E0', NOT_BG = 'FFE6F4F4', ORNEK_BG = 'FFF0F8F8';

  // Satır 1: Ana başlık
  ws['A1'] = { v: t.baslik, t: 's' };
  const mergeEnd = XLSX.utils.encode_col(t.kolonlar.length - 1) + '1';

  // Satır 2: Not
  ws['A2'] = { v: '⚠ ' + t.not + ' (* zorunlu alan)', t: 's' };

  // Satır 3: Kolon başlıkları
  t.kolonlar.forEach((k, i) => {
    const hucre = XLSX.utils.encode_cell({r: 2, c: i});
    ws[hucre] = { v: k.ad + (k.zon ? ' *' : ''), t: 's' };
  });

  // Satır 4: Örnek veri
  t.ornek.forEach((v, i) => {
    const hucre = XLSX.utils.encode_cell({r: 3, c: i});
    ws[hucre] = { v: v, t: 's' };
  });

  // Boş veri satırları (5-104)
  ws['!ref'] = `A1:${XLSX.utils.encode_col(t.kolonlar.length - 1)}104`;

  // Sütun genişlikleri
  ws['!cols'] = t.kolonlar.map(k => ({ wch: k.gen || 15 }));

  // Merge: başlık ve not satırı
  ws['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:t.kolonlar.length-1} },
    { s:{r:1,c:0}, e:{r:1,c:t.kolonlar.length-1} }
  ];

  XLSX.utils.book_append_sheet(wb, ws, t.baslik.slice(0, 31));
  const base64Xlsx = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  uygulamaDosyaKaydet(base64Xlsx, `${tip}_sablonu.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function tumSablonlariIndir() {
  Object.keys(SABLON_TANIMLARI).forEach((tip, i) => {
    setTimeout(() => sablonIndir(tip), i * 300);
  });
}
