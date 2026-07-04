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
    if(!duzenleyebilir('sistemAyarlari')){ toast('Bu işlem için yetkiniz yok.'); return; }
    db.collection(COL.dersListesi).add(veri)
      .then(()=>{ toast('Ders eklendi.'); modalKapat(); })
      .catch(err=>toast('Hata: '+err.message));
  }, null);
}
function dersListesiSil(id){
  if(!duzenleyebilir('sistemAyarlari')){ toast('Bu işlem için yetkiniz yok.'); return; }
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
    if(!duzenleyebilir('sistemAyarlari')){ toast('Bu işlem için yetkiniz yok.'); return; }
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
  if(!duzenleyebilir('sistemAyarlari')){ toast('Bu işlem için yetkiniz yok.'); return; }
  db.collection(COL.bransListesi).add({ ad: ad.trim() })
    .then(()=>toast('Branş eklendi.')).catch(err=>toast('Hata: '+err.message));
}
function bransListesiSil(id){
  if(!duzenleyebilir('sistemAyarlari')){ toast('Bu işlem için yetkiniz yok.'); return; }
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
/* DÜZELTME: Tam bir ISO zaman damgasını (UTC, ör. new Date().toISOString()
   ile üretilmiş "2026-07-03T14:30:00.000Z") TARAYICI YEREL saatine göre
   "DD.MM.YYYY" ve "HH:MM" olarak ayırır. Ham .slice(0,10)/.slice(11,16)
   kullanmak UTC'yi olduğu gibi gösterir — Türkiye'de (UTC+3) bu her zaman
   3 saat geriden gösterir ve gece yarısına yakın saatlerde YANLIŞ GÜNÜ
   bile gösterebilir. formatTarih() sadece SAF tarih (saatsiz, ör.
   "2026-07-03") değerleri için kullanılmalı; tam zaman damgaları için
   bu fonksiyon kullanılmalı. */
function isoYereleCevir(iso){
  if(!iso) return { tarih:'', saat:'' };
  const d = new Date(iso);
  if(isNaN(d.getTime())) return { tarih:'', saat:'' };
  const tarih = `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()}`;
  const saat = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return { tarih, saat };
}
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
function uygulamaHtmlYazdir(rawHtml, isAdi, yon){
  isAdi = isAdi || 'Koruk_Okul_Belge';
  yon = yon === 'yatay' ? 'yatay' : 'dikey';

  const nativeVarMi = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() &&
    window.Capacitor.Plugins && window.Capacitor.Plugins.PrintPlugin);

  if(nativeVarMi){
    try{
      window.Capacitor.Plugins.PrintPlugin.yazdir({ html: rawHtml, isAdi, yon });
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

/* ---------- DÜZELTME: "Bu uygulamayı kim kullanıyor?" sorma özelliği KALDIRILDI ----------
   Artık herkes kendi Google hesabıyla giriş yapıyor, kimlik Kullanıcı
   Yönetimi'nden kurulan hesap-öğretmen bağlantısıyla (bkz. js/auth.js
   AKTIF_KULLANICI.bagliOgretmenId) otomatik çözülüyor — elle seçim yok. */
let _ilkAcilistaKullaniciSorFlag = false;
function _ilkAcilistaKullaniciSor(){}

/* ====================================================================
   ORTAK DOSYA KAYDETME/İNDİRME YARDIMCISI
   Android'in çıplak WebView bileşeni tarayıcıların standart blob indirme
   davranışını (<a download>) desteklemiyor — bu yüzden şablon (xlsx) ve
   yedek (json) indirme butonları APK içinde sessizce çalışmıyordu.

   Native (Capacitor/Android) ortamda: SavePlugin üzerinden dosyayı
   doğrudan cihazın "İndirilenler" klasörüne yazar.
   Web/PWA ortamda (native plugin yoksa): klasik blob + <a download> yöntemi.
   ==================================================================== */
function uygulamaDosyaKaydet(base64Veri, dosyaAdi, mimeTuru, paylas){
  const nativeVarMi = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() &&
    window.Capacitor.Plugins && window.Capacitor.Plugins.SavePlugin);

  if(nativeVarMi){
    window.Capacitor.Plugins.SavePlugin.kaydet({ base64: base64Veri, dosyaAdi, mimeTuru, paylas: !!paylas })
      .then(()=> { if(!paylas) toast(`"${dosyaAdi}" İndirilenler klasörüne kaydedildi.`); })
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

/* ====================================================================
   OKULA BAŞLAMA YAŞI HESAPLAMA
   5/1/1961 tarihli ve 222 sayılı İlköğretim ve Eğitim Kanunu (madde 3) ve
   Millî Eğitim Bakanlığı Okul Öncesi Eğitim ve İlköğretim Kurumları
   Yönetmeliği (madde 4, 11) hükümlerine göre. "Ay sayısı", seçilen eğitim
   yılının EYLÜL AYI SONU itibarıyla hesaplanır (resmi kural budur).
   ==================================================================== */
function okulaBaslamaYasiHesaplaModalAc(){
  const buYil = new Date().getFullYear();
  let yilSecenekleri = '';
  for(let y = buYil - 1; y <= buYil + 4; y++){
    yilSecenekleri += `<option value="${y}"${y===buYil?' selected':''}>${y} - ${y+1} Eğitim Yılı</option>`;
  }

  const body = `
    <div class="form-group"><label>Çocuğun Doğum Tarihi</label><input type="date" id="f_obyDogum"></div>
    <div class="form-group"><label>Eğitim Yılı</label><select id="f_obyYil">${yilSecenekleri}</select></div>
    <div id="obySonuc" style="margin-top:16px;"></div>
    <p class="page-sub" style="margin-top:14px;">Kaynak: 222 sayılı İlköğretim ve Eğitim Kanunu md.3, MEB Okul Öncesi Eğitim ve İlköğretim Kurumları Yönetmeliği md.4/11. Ay sayısı, seçilen eğitim yılının eylül ayı sonu itibarıyla hesaplanır.</p>
  `;
  modalAc('🎂 Okula Başlama Yaşı Hesapla', body, _okulaBaslamaYasiHesapla, null, 'Hesapla');
}

function _okulaBaslamaYasiHesapla(){
  const dogumEl = document.getElementById('f_obyDogum');
  const yilEl = document.getElementById('f_obyYil');
  const sonucEl = document.getElementById('obySonuc');
  if(!dogumEl.value){ toast('Doğum tarihi girin.'); return; }

  const dogum = new Date(dogumEl.value + 'T00:00:00');
  const egitimYili = parseInt(yilEl.value, 10);
  // "Eylül ayı sonu" = o eğitim yılının 30 Eylül'ü (ay hesaplamasında referans nokta)
  const referans = new Date(egitimYili, 8, 30); // ay index 8 = Eylül

  let ay = (referans.getFullYear() - dogum.getFullYear()) * 12 + (referans.getMonth() - dogum.getMonth());
  if(referans.getDate() < dogum.getDate()) ay--; // gün henüz dolmadıysa bir ay eksilt
  if(ay < 0) ay = 0;

  let durumlar = [];
  if(ay >= 69){
    let ekNot = '';
    if(ay <= 71){
      ekNot = ` Ancak <strong>velinin yazılı talebi ile kayıt bir yıl ertelenebilir veya çocuk okul öncesi eğitime yönlendirilebilir</strong> (Yönetmelik md.11/6-b, sadece 69-71 ay arası için geçerli bir haktır).`;
    }
    durumlar.push({ ikon:'✅', renk:'sage', metin:`<strong>İlkokul 1. sınıfa kaydı zorunludur.</strong> (${egitimYili} Eylül sonu itibarıyla ${ay} aylık — 69 ay ve üzeri.)${ekNot}` });
  } else if(ay >= 66){
    durumlar.push({ ikon:'📝', renk:'amber', metin:`<strong>İlkokul 1. sınıfa velinin yazılı isteğiyle kaydedilebilir.</strong> (${ay} aylık — 66-68 ay arası, zorunlu değil, isteğe bağlı.) Veli istemezse okul öncesi eğitime yönlendirilebilir veya kaydı bir yıl ertelenebilir.` });
  } else {
    // İlkokula henüz uygun değil — ne kadar eksik olduğunu ve hangi eğitim
    // yılında (69 ay dolarak) zorunlu kayıt hakkı doğacağını da göster.
    const eksikAy = 66 - ay; // en erken (isteğe bağlı 66 ay) hakkı için eksik ay
    let zorunluYil = egitimYili;
    while(true){
      const rEylul = new Date(zorunluYil, 8, 30);
      let ayOYil = (rEylul.getFullYear() - dogum.getFullYear()) * 12 + (rEylul.getMonth() - dogum.getMonth());
      if(rEylul.getDate() < dogum.getDate()) ayOYil--;
      if(ayOYil >= 69) break;
      zorunluYil++;
      if(zorunluYil > egitimYili + 10) break; // sonsuz döngü koruması
    }
    durumlar.push({
      ikon:'❌', renk:'brick',
      metin:`<strong>${egitimYili} eğitim yılında ilkokul 1. sınıfa kayıt olamaz.</strong> ${ay} aylık — 66 ay şartını (isteğe bağlı kayıt için) doldurmasına ${eksikAy} ay var. `
        + `Zorunlu kayıt hakkı (69 ay) için <strong>${zorunluYil} - ${zorunluYil+1} eğitim yılı</strong>nı beklemesi gerekiyor`
        + (zorunluYil > egitimYili ? `; isteğe bağlı (veli talebiyle) kayıt hakkı ise bir yıl öncesinde, <strong>${zorunluYil-1} - ${zorunluYil} eğitim yılı</strong>nda doğar.` : '.')
    });
  }

  if(ay >= 57 && ay <= 68){
    durumlar.push({ ikon:'✅', renk:'sage', metin:`<strong>Ana sınıfına kaydedilebilir.</strong> (${ay} aylık — 57-68 ay standart aralığı.)` });
  } else if(ay >= 45 && ay <= 56){
    durumlar.push({ ikon:'📝', renk:'amber', metin:`<strong>Ana sınıfına şartlı kaydedilebilir.</strong> (${ay} aylık — 45-56 ay arası. Okulun kayıt alanında ikamet eden ve bir sonraki yıl ilkokula başlayacak çocukların kaydı yapıldıktan sonra, fiziki imkân varsa kaydedilir.)` });
  }

  if(ay >= 36 && ay <= 68){
    durumlar.push({ ikon:'✅', renk:'sage', metin:`<strong>Anaokuluna kaydedilebilir.</strong> (${ay} aylık — 36-68 ay aralığı.)` });
  }

  if(ay < 36){
    durumlar.push({ ikon:'⏳', renk:'gray', metin:`Henüz okul öncesi eğitim yaşında değil (${ay} aylık, en erken 36 ay gerekir).` });
  }
  if(ay > 71){
    durumlar.push({ ikon:'⚠️', renk:'brick', metin:`Not: 71 ayı geçmiş — normal şartlarda ilkokula başlamış olması beklenir, kayıt/nakil durumu okul idaresince ayrıca değerlendirilmelidir.` });
  }

  sonucEl.innerHTML = `
    <div class="card" style="background:var(--bg-app-soft);margin:0;">
      <div style="font-weight:700;margin-bottom:10px;">📅 ${egitimYili} Eylül sonu itibarıyla: <span style="color:var(--brand);">${ay} aylık</span></div>
      ${durumlar.map(d=>`<div class="evrak-row" style="border:none;padding:8px 0;"><span class="badge badge-${d.renk}" style="flex-shrink:0;">${d.ikon}</span><div style="flex:1;padding-left:8px;font-size:13.5px;line-height:1.5;">${d.metin}</div></div>`).join('')}
    </div>
  `;
}
function ogretmenSecenekleri(seciliId){
  return '<option value="">Seçiniz</option>' + ogretmenler.map(o=>
    `<option value="${o.id}" ${o.id===seciliId?'selected':''}>${escapeHtml(o.ad+' '+o.soyad)}</option>`
  ).join('');
}
function ogretmenAdi(id){ const o = ogretmenler.find(x=>x.id===id); return o ? `${o.ad} ${o.soyad}` : '—'; }
function kaydet(koleksiyon, id, veri){
  if(!db){ toast('Firebase bağlantısı yok.'); return; }
  // not: "kişisel kayıt" (sahipUid) damgalama kuralı artık bu genel fonksiyonda
  // değil — notlar için NotlarService, hatırlatıcı/görev için TakvimService
  // içinde modüle özel olarak uygulanıyor (bkz. Pragmatik-Mimari-Tasarimi.md §5).
  // Bu fonksiyon artık sadece henüz repository/service katmanına taşınmamış
  // eski/az kullanılan koleksiyonlar için bir geçiş yardımcısıdır.
  const ref = db.collection(koleksiyon);
  const islem = id ? ref.doc(id).update(veri) : ref.add({...veri, eklenmeTarihi: new Date().toISOString()});
  islem.then(()=>toast('Kaydedildi.')).catch(err=>toast('Hata: '+err.message));
}

/* Kişisel (sahipUid'li) kayıt görünürlük filtresi: damgasız kayıtlar
   (okul geneli) herkese; damgalılar sahibine ve adminlere görünür. */
/* Kişisel (sahipUid'li) kayıt görünürlük filtresi (notlar, hatırlatıcılar,
   görevler için ortak): Süper admin HER ZAMAN her kaydı görür. Admin
   olmayan bir kullanıcı ise SADECE KENDİ eklediği kayıtları görür —
   başka birinin (veya sahipsiz/eski) kaydı ona hiç gösterilmez. */
function kisiselKayitGorunurMu(k){
  if(typeof AKTIF_KULLANICI === 'undefined' || !AKTIF_KULLANICI) return true;
  if(AKTIF_KULLANICI.admin === true) return true;
  if(!k || !k.sahipUid) return false; // sahipsiz/eski kayıt — artık sadece admin görür
  return k.sahipUid === AKTIF_KULLANICI.uid;
}
function hataGoster(err){ console.error(err); toast('Veri hatası: '+err.message); }

/* ---------- modal ---------- */
/* Native (APK) ortamda modal/detay paneli açıkken "aşağı çekince yenile"
   jestini geçici olarak kapatır — aksi halde modal içindeki bir listeyi
   aşağı kaydırmaya çalışırken bazen sayfa yenileme jesti araya giriyordu
   (bkz. android/.../PullToRefreshPlugin.java). Web sürümünde etkisizdir. */
function _pullToRefreshAyarla(enabled){
  try{
    if(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()
       && window.Capacitor.Plugins && window.Capacitor.Plugins.PullToRefreshPlugin){
      window.Capacitor.Plugins.PullToRefreshPlugin.setEnabled({ enabled });
    }
  }catch(e){}
}

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
  _pullToRefreshAyarla(false);
}
function modalKapat(){
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.classList.remove('modal-open');
  _pullToRefreshAyarla(true);
}

/* ============== ÖĞRETMENLER ============== */
function renderOgretmenler(){
  const aramaEl = document.getElementById('ogretmenArama');
  const arama = (aramaEl ? aramaEl.value : '').toLocaleLowerCase('tr');
  let liste = ogretmenler.filter(o => !arama || (o.ad+' '+o.soyad+' '+(o.brans||'')+' '+(o.unvan||'')).toLocaleLowerCase('tr').includes(arama));
  liste.sort((a,b)=>a.ad.localeCompare(b.ad,'tr'));
  document.getElementById('ogretmenlerTablo').innerHTML = liste.length ? liste.map(o=>`
    <tr class="row-clickable" onclick="ogretmenDetayAc('${o.id}')">
      <td>${escapeHtml(o.ad+' '+o.soyad)}${typeof ogretmenIzinRozeti==='function' ? ogretmenIzinRozeti(o.id) : ''}</td>
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
    const yeniGun = document.getElementById('f_gun').value;
    const yeniSaat = parseInt(document.getElementById('f_saat').value);
    const yeniOgretmenId = document.getElementById('f_ogretmen').value;
    // DÜZELTME: Aynı öğretmen aynı gün+saatte başka bir sınıfa da atanabiliyordu
    // (çakışma kontrolü hiç yoktu). Kaydetmeden önce, bu öğretmenin aynı
    // gün+saatte BAŞKA bir sınıfta zaten dersi olup olmadığını kontrol et.
    if(yeniOgretmenId){
      const cakisan = dersProgrami.find(d=>
        d.ogretmenId === yeniOgretmenId && d.gun === yeniGun && d.saat === yeniSaat &&
        d.sinif !== sinif && (!mevcut || d.id !== mevcut.id)
      );
      if(cakisan){
        toast(`Çakışma: ${ogretmenAdi(yeniOgretmenId)}, ${yeniGun} günü ${yeniSaat}. derste zaten ${cakisan.sinif} sınıfına giriyor.`);
        return;
      }
    }
    kaydet(COL.dersProgrami, mevcut?mevcut.id:null, {
      sinif, gun: yeniGun, saat: yeniSaat, ders, ogretmenId: yeniOgretmenId
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
function hatirlaticiTamamlandiToggle(id, deger){ TakvimService.hatirlaticiTamamlandiGuncelle(id, deger).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }); }
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
    TakvimService.hatirlaticiKaydet(h?h.id:null, {
      baslik, tarih, saat,
      oncelik: document.getElementById('f_oncelik').value,
      aciklama: document.getElementById('f_aciklama').value.trim(),
      tamamlandi: h ? !!h.tamamlandi : false,
      bildirimGonderildi: h ? (tarihSaatDegisti ? false : !!h.bildirimGonderildi) : false
    }).then(()=>toast('Kaydedildi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  }, h ? ()=>{ if(confirm('Bu hatırlatıcıyı silmek istiyor musunuz?')){ TakvimService.hatirlaticiSil(h.id).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }); modalKapat(); } } : null);
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
  if(id) TakvimService.gorevDurumGuncelle(id, yeniDurum).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
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
    TakvimService.gorevKaydet(g?g.id:null, {
      baslik, aciklama: document.getElementById('f_aciklama').value.trim(),
      sonTarih, oncelik: document.getElementById('f_oncelik').value,
      durum: document.getElementById('f_durum').value,
      bildirimGonderildi: g ? (sonTarihDegisti ? false : !!g.bildirimGonderildi) : false
    }).then(()=>toast('Kaydedildi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  }, g ? ()=>{ if(confirm('Bu görevi silmek istiyor musunuz?')){ TakvimService.gorevSil(g.id).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }); modalKapat(); } } : null);
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
    // DÜZELTME: isim/hitap çözümlemesi artık TEK bir yerden (js/ui.js > _hesapKimligi())
    // yapılıyor — burada AYRI ve hatalı (cinsiyeti hiç kontrol etmeyen, her zaman
    // "Bey" ekleyen) bir kopya vardı. İki farklı kod aynı elemanı güncelleyip
    // birbirini eziyor, "önce doğru sonra yanlış" titremesine sebep oluyordu.
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : {ad:''};
    const kullaniciAdi = kimlik.ad ? (kimlik.ad.split(' ')[0] + (kimlik.hitap ? ' ' + kimlik.hitap : '')) : '';
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

  const _statTanimlari = {
    personel: gorebilir('ogretmenler') ? `
    <div class="stat-card stat-card-clickable" onclick="sekmeAc('ogretmenler')">
      <div class="stat-card-ico-lg stat-card-ico-blue">👨‍🏫</div>
      <div class="stat-card-num">${ogretmenler.length}</div>
      <div class="stat-card-label">Personel</div>
      ${kadinPersonel||erkekPersonel ? `<div class="stat-card-cinsiyet">🚺${kadinPersonel} 🚹${erkekPersonel}</div>` : ''}
      <div class="stat-card-tumu-bottom">Tümü ›</div>
    </div>` : '',
    ogrenciler: gorebilir('ogrenciler') ? `
    <div class="stat-card stat-card-clickable" onclick="sekmeAc('ogrenciler')">
      <div class="stat-card-ico-lg stat-card-ico-green">🧑‍🎓</div>
      <div class="stat-card-num">${toplamOgrenci}</div>
      <div class="stat-card-label">Öğrenciler</div>
      ${kizOgrenci||erkekOgrenci ? `<div class="stat-card-cinsiyet">🚺${kizOgrenci} 🚹${erkekOgrenci}</div>` : ''}
      <div class="stat-card-tumu-bottom">Tümü ›</div>
    </div>` : '',
    servis: gorebilir('tasima') ? `
    <div class="stat-card stat-card-clickable" onclick="sekmeAc('tasima')">
      <div class="stat-card-ico-lg stat-card-ico-purple">🚌</div>
      <div class="stat-card-num">${servisSayisi}</div>
      <div class="stat-card-label">Servis Sayısı</div>
      <div class="stat-card-tumu-bottom">Tümü ›</div>
    </div>` : '',
    evrak: gorebilir('evrak') ? `
    <div class="stat-card stat-card-clickable" onclick="sekmeAc('evrak')">
      <div class="stat-card-ico-lg stat-card-ico-amber">📄</div>
      <div class="stat-card-num">${acikEvrakSayisi}</div>
      <div class="stat-card-label">Bekleyen Evrak</div>
      <div class="stat-card-tumu-bottom">Tümü ›</div>
    </div>` : '',
  };
  const _statSirasi = (typeof _altTercihOku === 'function') ? _altTercihOku('istatistikSeridi') : Object.keys(_statTanimlari);
  document.getElementById('dashStats').innerHTML = _statSirasi.map(id => _statTanimlari[id] || '').join('');
  /* ---- Hızlı Bakış: Kadın/Erkek (Öğretmen) kaldırıldı — üstteki "Personel"
     kartında zaten aynı 🚺/🚹 dağılımı gösteriliyordu, tekrar oluyordu.
     Yerine "Bugünkü Ders" sayısı kondu. ---- */
  const bugunkuDersSayisi = dersProgrami.filter(d=>d.gun===bugunGun).length;
  // YENİ: Öğretmene özel — hesabına bağlı bir öğretmen kaydı varsa,
  // yaklaşan (bugün dahil, bugünden ileri) kendi sınav sayısını gösterir.
  const _hbBenOgretmen = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
  const yaklasanSinavSayisi = _hbBenOgretmen
    ? (typeof sinavlar!=='undefined' ? sinavlar : []).filter(s=>s.ogretmenId===_hbBenOgretmen.id && s.tarih>=todayISO()).length
    : 0;
  const hizliBakisEl = document.getElementById('dashHizliBakis');
  if(hizliBakisEl){
    const _hbTanimlari = {
      sinif: gorebilir('siniflar') ? `<div class="hb-chip" onclick="sekmeAc('siniflar')"><span class="hb-ico">🏫</span><div><div class="hb-num">${siniflar.length}</div><div class="hb-label">Sınıf</div></div></div>` : '',
      bugunkuDers: gorebilir('dersProgrami') ? `<div class="hb-chip" onclick="sekmeAc('dersProgrami')"><span class="hb-ico">📚</span><div><div class="hb-num">${bugunkuDersSayisi}</div><div class="hb-label">Bugünkü Ders</div></div></div>` : '',
      acikGorev: gorebilir('takvim') ? `<div class="hb-chip" onclick="sekmeAc('gorevler')"><span class="hb-ico">📌</span><div><div class="hb-num">${gorevler.filter(g=>g.durum!=='tamamlandi').length}</div><div class="hb-label">Açık Görev</div></div></div>` : '',
      hatirlatici: gorebilir('takvim') ? `<div class="hb-chip" onclick="sekmeAc('takvim')"><span class="hb-ico">⏰</span><div><div class="hb-num">${hatirlaticilar.filter(h=>!h.tamamlandi).length}</div><div class="hb-label">Hatırlatıcı</div></div></div>` : '',
      sinavlarim: (_hbBenOgretmen && gorebilir('sinavIslemleri')) ? `<div class="hb-chip" onclick="sekmeAc('sinavIslemleri')"><span class="hb-ico">📝</span><div><div class="hb-num">${yaklasanSinavSayisi}</div><div class="hb-label">Sınavlarım</div></div></div>` : '',
    };
    const _hbSirasi = (typeof _altTercihOku === 'function') ? _altTercihOku('hizliBakis') : Object.keys(_hbTanimlari);
    hizliBakisEl.innerHTML = _hbSirasi.map(id => _hbTanimlari[id] || '').join('');
  }
  /* ---- YENİ: Üst bar bildirim zili rozeti (bekleyen hatırlatıcı + okunmamış duyuru sayısı) ---- */
  if(typeof topbarBildirimRozetiGuncelle === 'function') topbarBildirimRozetiGuncelle();

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
  if(typeof renderHizliIslemler === 'function') renderHizliIslemler();
  if(typeof renderOgretmenOzelKartlar === 'function') renderOgretmenOzelKartlar();
  if(typeof dashboardYetkiUygula === 'function') dashboardYetkiUygula();
  if(typeof _dashboardYeniWidgetleriDoldur === 'function') _dashboardYeniWidgetleriDoldur();
  if(typeof dashboardOzellestirmeUygula === 'function') dashboardOzellestirmeUygula();
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
  // YENİ: Hesabına bağlı bir öğretmen kaydı olan kullanıcı için, şu anki ders
  // saatinde KENDİ dersi varsa "5/A sınıfına Din Kültürü dersin var" gibi
  // kişiye özel bilgiyi zil etiketine ekler.
  let kendiDersEtiketi = '';
  if(durum.durum==='ders'){
    const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
    if(ben){
      const kendiDersi = dersProgrami.find(d=>d.ogretmenId===ben.id && d.gun===bugunGun && d.saat===durum.saat);
      if(kendiDersi) kendiDersEtiketi = ` — <strong>${escapeHtml(kendiDersi.sinif)}</strong> sınıfına <strong>${escapeHtml(kendiDersi.ders)}</strong> dersin var`;
    }
  }
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
          <div class="zil-etiket">${durum.etiket || etiketler[durum.durum]}${kendiDersEtiketi}</div>
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

/* ============== DERS VE NÖBET PROGRAMIM (öğretmene özel sayfa) ==============
   Alt menüdeki "Programım" butonuyla açılır. Haftalık ders programını (gün gün)
   ve yaklaşan nöbet atamalarını (bugünden itibaren) tek sayfada gösterir. */
function renderDersNobetProgramim(){
  const el = document.getElementById('dnpIcerik');
  if(!el) return;
  const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
  if(!ben){
    el.innerHTML = '<p class="empty-state">Hesabınıza bağlı bir öğretmen kaydı yok — bu sayfa sadece öğretmen hesapları içindir.</p>';
    return;
  }

  const bugunGun = GUNADI[new Date().getDay()];
  const bugunISO = todayISO();

  // ---- Haftalık Ders Programı (gün gün) ----
  let dersHtml = '';
  GUNLER.forEach(gun=>{
    const gununDersleri = dersProgrami.filter(d=>d.ogretmenId===ben.id && d.gun===gun).sort((a,b)=>a.saat-b.saat);
    dersHtml += `<div class="card" style="margin-bottom:12px;">
      <h4 style="margin:0 0 8px;">${gun===bugunGun ? '📌 ' : ''}${escapeHtml(gun)}${gun===bugunGun ? ' <span class="badge badge-sage">Bugün</span>' : ''}</h4>
      ${gununDersleri.length
        ? gununDersleri.map(d=>`<div class="dash-row"><span class="badge badge-blue">${d.saat}.</span> ${escapeHtml(d.sinif)} — ${escapeHtml(d.ders)}</div>`).join('')
        : '<p class="empty-state">Bu gün dersiniz yok.</p>'}
    </div>`;
  });

  // ---- Yaklaşan Nöbetlerim (bugünden itibaren, en fazla 14 kayıt) ----
  const nobetlerim = (typeof nobetAtamalari!=='undefined' ? nobetAtamalari : [])
    .filter(a=>a.ogretmenId===ben.id && a.tarih>=bugunISO)
    .sort((a,b)=>a.tarih.localeCompare(b.tarih))
    .slice(0,14);
  const nobetHtml = nobetlerim.length
    ? nobetlerim.map(a=>{
        const yer = (typeof nobetYerleri!=='undefined' ? nobetYerleri.find(y=>y.id===a.yerId) : null);
        const ikon = typeof nobetYeriIkon==='function' ? nobetYeriIkon(yer?yer.ad:'') : '📍';
        return `<div class="dash-row">${a.tarih===bugunISO?'📌 <strong>Bugün</strong> — ':formatTarih(a.tarih)+' — '}${ikon} ${escapeHtml(yer?yer.ad:'?')}</div>`;
      }).join('')
    : '<p class="empty-state">Yaklaşan bir nöbet atamanız yok.</p>';

  el.innerHTML = `
    <div class="card" style="margin-bottom:18px;">
      <h3 style="margin:0 0 10px;">🛡️ Yaklaşan Nöbetlerim</h3>
      ${nobetHtml}
    </div>
    <h3 style="margin:0 0 12px;">📚 Haftalık Ders Programım</h3>
    ${dersHtml}
  `;
}

/* Üst bar bildirim zili rozeti — hem renderDashboard()'dan hem duyuru
   verisi güncellendiğinde (bkz. js/duyurular.js) çağrılır. */
function topbarBildirimRozetiGuncelle(){
  const bellBadgeEl = document.getElementById('topbarBellBadge');
  if(!bellBadgeEl) return;
  const bekleyenHatirlatici = (typeof hatirlaticilar!=='undefined' ? hatirlaticilar : []).filter(h=>!h.tamamlandi).length;
  const okunmamisDuyuru = (typeof duyurular!=='undefined' && typeof DuyurularService!=='undefined')
    ? duyurular.filter(d=>!DuyurularService.benOkudumMu(d)).length : 0;
  const bekleyenSayi = bekleyenHatirlatici + okunmamisDuyuru;
  bellBadgeEl.textContent = bekleyenSayi;
  bellBadgeEl.style.display = bekleyenSayi>0 ? 'flex' : 'none';
}

/* Hızlı İşlemler kartı artık kullanıcı seçimine göre üretiliyor (bkz.
   js/dashboard-ozellestirme.js DASHBOARD_ALT_KATALOG.hizliIslemler). */
function renderHizliIslemler(){
  const el = document.getElementById('hizliIslemlerGrid');
  if(!el) return;
  const tanimlari = {
    personel:       { modul:'personel',    onclick:"sekmeAc('personel');",              ikon:'👥', ikonClass:'qa-personel', label:'Personel' },
    nobet:          { modul:'nobet',       onclick:"sekmeAc('nobet');",                 ikon:'🛡️', ikonClass:'qa-nobet',    label:'Nöbet' },
    servis:         { modul:'tasima',      onclick:"sekmeAc('tasima');",                ikon:'🚌', ikonClass:'qa-evrak',    label:'Servis' },
    evrak:          { modul:'evrak',       onclick:"sekmeAc('evrak'); evrakModalAc();", ikon:'📄', ikonClass:'qa-gorev',    label:'Evrak' },
    raporlar:       { modul:'dokumanlar',  onclick:"sekmeAc('dokumanlar');",            ikon:'📊', ikonClass:'qa-rapor',    label:'Raporlar' },
    takvim:         { modul:'takvim',      onclick:"sekmeAc('takvim');",                ikon:'📅', ikonClass:'qa-takvim',   label:'Takvim' },
    notlar:         { modul:'notlar',      onclick:"notlarModalAc();",                  ikon:'📝', ikonClass:'qa-not',      label:'Notlar' },
    cizelgeler:     { modul:'sosyalKulupler', onclick:"sekmeAc('sosyalKulupler');",      ikon:'⋯',  ikonClass:'qa-daha',     label:'Çizelgeler' },
    mesajlar:       { modul:'mesajlasma',  onclick:"sekmeAc('mesajlasma');",            ikon:'💬', ikonClass:'qa-gorev',    label:'Mesajlar' },
    duyurular:      { modul:'duyurular',   onclick:"sekmeAc('duyurular');",             ikon:'📢', ikonClass:'qa-rapor',    label:'Duyurular' },
    sinavIslemleri: { modul:'sinavIslemleri', onclick:"sekmeAc('sinavIslemleri');",      ikon:'📝', ikonClass:'qa-not',      label:'Sınavlar' },
  };
  const sira = (typeof _altTercihOku === 'function') ? _altTercihOku('hizliIslemler') : Object.keys(tanimlari).slice(0,8);
  el.innerHTML = sira.map(id=>{
    const t = tanimlari[id];
    if(!t) return '';
    return `<div class="qa-item" data-yetki-modul="${t.modul}" onclick="${t.onclick}"><div class="qa-icon ${t.ikonClass}">${t.ikon}</div><div class="qa-label">${t.label}</div></div>`;
  }).join('');
}

/* ============== ÖĞRETMENE ÖZEL ANASAYFA KARTLARI ==============
   Hesabına bağlı bir öğretmen kaydı olan HERKESTE (admin dahil, eğer
   bağlıysa) gösterilir: bugünkü dersleri + bu haftaki nöbeti. Bağlı kayıt
   yoksa (ör. sadece idari bir admin hesabıysa) bölüm tamamen gizlenir. */
function renderOgretmenOzelKartlar(){
  const kutu = document.getElementById('ogretmenOzelKartlar');
  if(!kutu) return;
  const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
  if(!ben){ kutu.style.display = 'none'; return; }
  kutu.style.display = '';

  const bugunGun = GUNADI[new Date().getDay()];
  const bugunISO = todayISO();

  // ---- Bugünkü Derslerim ----
  const dersEl = document.getElementById('ogretmenBugunDersleri');
  if(dersEl){
    if(!GUNLER.includes(bugunGun)){
      dersEl.innerHTML = '<p class="empty-state">Bugün hafta sonu — dersiniz yok.</p>';
    } else {
      const bugunDersleri = dersProgrami.filter(d=>d.ogretmenId===ben.id && d.gun===bugunGun).sort((a,b)=>a.saat-b.saat);
      dersEl.innerHTML = bugunDersleri.length
        ? bugunDersleri.map(d=>`<div class="dash-row"><span class="badge badge-blue">${d.saat}.</span> ${escapeHtml(d.sinif)} — ${escapeHtml(d.ders)}</div>`).join('')
        : '<p class="empty-state">Bugün ders programınızda kaydınız yok.</p>';
    }
  }

  // ---- Bu Haftaki Nöbetim ----
  const nobetEl = document.getElementById('ogretmenHaftaNobeti');
  const nobetKarti = document.getElementById('ogretmenNobetKarti');
  if(nobetEl && typeof nobetHaftaAraligi === 'function'){
    const gunler = nobetHaftaAraligi(bugunISO);
    let buguntNobetciMi = false;
    const satirlar = gunler.map(iso=>{
      const ozet = (typeof nobetGununOzeti === 'function') ? nobetGununOzeti(iso) : {atamalar:[], tatil:false};
      const benimAtamalarim = (ozet.atamalar||[]).filter(a=>a.ogretmenId===ben.id);
      if(!benimAtamalarim.length) return '';
      if(iso===bugunISO) buguntNobetciMi = true;
      const gunAdiKisa = GUNADI[new Date(iso+'T00:00:00').getDay()];
      const yerleriYaz = benimAtamalarim.map(a=>{
        const yer = (typeof nobetYerleri!=='undefined' ? nobetYerleri.find(y=>y.id===a.yerId) : null);
        return (typeof nobetYeriIkon==='function'?nobetYeriIkon(yer?yer.ad:''):'📍') + ' ' + escapeHtml(yer?yer.ad:'?');
      }).join(', ');
      return `<div class="dash-row"${iso===bugunISO?' style="font-weight:700;"':''}>${iso===bugunISO?'📌 <strong>Bugün</strong> — ':gunAdiKisa+' — '}${yerleriYaz}</div>`;
    }).filter(Boolean).join('');
    nobetEl.innerHTML = satirlar || '<p class="empty-state">Bu hafta nöbet atamanız yok.</p>';
    if(nobetKarti) nobetKarti.classList.toggle('ogretmen-bugun-nobetci', buguntNobetciMi);
  }
}


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
  // paylas=true: native ortamda kaydettikten hemen sonra Android'in "Paylaş"
  // menüsünü açar — kullanıcı dosyayı doğrudan Drive/WhatsApp/e-posta gibi
  // istediği yere gönderebilir (ayrı bir Google girişi gerekmeden).
  uygulamaDosyaKaydet(base64Json, `okul-yedek-${todayISO()}.json`, 'application/json', true);
}
/* ---------- Native confirm() yerine kullanılan özel onay modalı ----------
   Bazı Android WebView'lerde native confirm(), kullanıcı dokunuşundan
   birkaç saniye sonra (örn. uzun bir async işlem sonrası) sessizce
   engelleniyor — dialog hiç görünmeden false dönüyor, kullanıcı hiçbir
   şey olmamış gibi hissediyor. Bu, tamamen kendi DOM'umuzda render
   edildiği için o kısıtlamaya tabi değil. */
/* ---------- Kalıcı ilerleme göstergesi (uzun işlemler için) ---------- */
function ilerlemeGoster(mesaj){
  const overlay = document.getElementById('ilerlemeOverlay');
  if(!overlay) return;
  document.getElementById('ilerlemeSpinner').style.display = '';
  document.getElementById('ilerlemeIkon').style.display = 'none';
  document.getElementById('ilerlemeKapatBtn').style.display = 'none';
  document.getElementById('ilerlemeMetin').textContent = mesaj;
  overlay.style.display = 'flex';
}
function ilerlemeGuncelle(mesaj){
  const el = document.getElementById('ilerlemeMetin');
  if(el) el.textContent = mesaj;
}
function ilerlemeTamamlandi(mesaj){
  document.getElementById('ilerlemeSpinner').style.display = 'none';
  const ikon = document.getElementById('ilerlemeIkon');
  ikon.textContent = '✅'; ikon.style.display = '';
  document.getElementById('ilerlemeMetin').textContent = mesaj;
  document.getElementById('ilerlemeKapatBtn').style.display = '';
}
function ilerlemeHataGoster(mesaj){
  document.getElementById('ilerlemeSpinner').style.display = 'none';
  const ikon = document.getElementById('ilerlemeIkon');
  ikon.textContent = '⚠️'; ikon.style.display = '';
  document.getElementById('ilerlemeMetin').textContent = mesaj;
  document.getElementById('ilerlemeKapatBtn').style.display = '';
}
function ilerlemeGizle(){
  const overlay = document.getElementById('ilerlemeOverlay');
  if(overlay) overlay.style.display = 'none';
}

function uygulamaOnayAl(mesaj){
  return new Promise(resolve=>{
    const modal = document.getElementById('ozelOnayModal');
    const mesajEl = document.getElementById('ozelOnayMesaj');
    if(!modal || !mesajEl){ resolve(confirm(mesaj)); return; } // beklenmedik durumda son çare
    mesajEl.textContent = mesaj;
    modal.style.display = 'flex';
    window._ozelOnaySonucVer = (sonuc)=>{
      modal.style.display = 'none';
      window._ozelOnaySonucVer = null;
      resolve(sonuc);
    };
  });
}

function _dosyaMetniOku(dosya){
  // Bazı Android WebView sürümlerinde / bazı dosya kaynaklarında (SAF ile
  // seçilen content:// URI'ler gibi) tek bir okuma yöntemi HİÇ HATA
  // VERMEDEN sonsuza kadar takılı kalabiliyor (örn. arrayBuffer() hiç
  // cevap dönmüyor). Bu yüzden her yönteme bir zaman aşımı (5sn) konuyor —
  // süre dolarsa o yöntem "başarısız" sayılıp bir sonraki denenir.
  const ZAMAN_ASIMI_MS = 5000;

  function zamanAsimliCalistir(sozVerFn, adi){
    return new Promise((resolve, reject)=>{
      let bitti = false;
      const zamanlayici = setTimeout(()=>{
        if(bitti) return;
        bitti = true;
        reject(new Error(adi + ': zaman aşımına uğradı (' + (ZAMAN_ASIMI_MS/1000) + 'sn içinde cevap vermedi)'));
      }, ZAMAN_ASIMI_MS);

      sozVerFn().then(sonuc=>{
        if(bitti) return;
        bitti = true; clearTimeout(zamanlayici); resolve(sonuc);
      }).catch(hata=>{
        if(bitti) return;
        bitti = true; clearTimeout(zamanlayici);
        reject(new Error(adi + ': ' + (hata && hata.message ? hata.message : hata)));
      });
    });
  }

  const fileReaderSozVer = ()=> new Promise((resolve, reject)=>{
    const okuyucu = new FileReader();
    okuyucu.onload = ()=> resolve(okuyucu.result);
    okuyucu.onerror = ()=> reject(okuyucu.error || new Error('bilinmeyen hata'));
    okuyucu.readAsText(dosya, 'utf-8');
  });

  const arrayBufferSozVer = ()=> dosya.arrayBuffer().then(buf => new TextDecoder('utf-8').decode(buf));

  const textSozVer = ()=> {
    if(typeof dosya.text !== 'function') return Promise.reject(new Error('bu tarayıcıda desteklenmiyor'));
    return dosya.text();
  };

  const yontemler = [
    ['FileReader', fileReaderSozVer],
    ['arrayBuffer', arrayBufferSozVer],
    ['File.text()', textSozVer]
  ];

  return (async ()=>{
    const hatalar = [];
    for(const [adi, fn] of yontemler){
      try{
        return await zamanAsimliCalistir(fn, adi);
      }catch(e){
        hatalar.push(e.message);
      }
    }
    throw new Error('Dosya hiçbir yöntemle okunamadı — ' + hatalar.join(' | '));
  })();
}

async function yedektenGeriYukle(file){
  if(!file){ console.warn('yedektenGeriYukle: dosya seçilmedi.'); return; }
  ilerlemeGoster('Yedek dosyası okunuyor…');
  try{
    const metin = await _dosyaMetniOku(file);
    const data = JSON.parse(metin);
    ilerlemeGizle();
    const onaylandi = await uygulamaOnayAl("Yedekteki kayıtlar mevcut verilerinizin üzerine yazılacak (aynı ID'ye sahip olanlar güncellenecek, yeni olanlar eklenecek). Devam edilsin mi?");
    if(!onaylandi) return;
    ilerlemeGoster('Geri yükleniyor… (0 kayıt)');
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

    // Tek tek (await ... await ...) yazmak yerine Firestore BATCH kullan —
    // hem çok daha hızlı (tek ağ gidiş-gelişinde yüzlerce yazma) hem de
    // "hiçbir şey olmuyor" hissi vermeden ilerleme bildirimi eklenebiliyor.
    // Firestore tek batch'te en fazla 500 işlem kabul eder, güvenli pay
    // için 400'de bir commit ediyoruz.
    let toplamKayit = 0;
    let batch = db.batch();
    let batchIcindeki = 0;

    async function batchıCommitEt(){
      if(batchIcindeki === 0) return;
      await batch.commit();
      batch = db.batch();
      batchIcindeki = 0;
    }

    for(const [liste, koleksiyon] of eslemeler){
      if(!Array.isArray(liste)) continue;
      for(const oge of liste){
        const {id, ...veri} = oge;
        const ref = id ? db.collection(koleksiyon).doc(id) : db.collection(koleksiyon).doc();
        batch.set(ref, veri, { merge: true });
        batchIcindeki++;
        toplamKayit++;
        if(batchIcindeki >= 400){
          await batchıCommitEt();
          ilerlemeGuncelle(`Geri yükleniyor… (${toplamKayit} kayıt)`);
        }
      }
    }
    await batchıCommitEt();
    ilerlemeGuncelle('Ek ayarlar geri yükleniyor…');
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
      ilerlemeGuncelle('Mevzuat verileri geri yükleniyor…');
      try{ await mevzuatYedektenYukle(data.mevzuat); }
      catch(e){ console.warn('Mevzuat geri yüklenemedi:', e.message); }
    }
    const yedekDosyaEl = document.getElementById('yedekDosya');
    if(yedekDosyaEl) yedekDosyaEl.value = '';
    ilerlemeTamamlandi(`Geri yükleme tamamlandı — ${toplamKayit} kayıt işlendi.`);
  }catch(err){
    console.error('yedektenGeriYukle hatası:', err);
    ilerlemeHataGoster('Geri yükleme hatası: '+err.message);
  }
}

/* ============== FIRESTORE BAĞLANTILARI ============== */
function baglantilariKur(){
  if(baglantilarKuruldu) return;
  baglantilarKuruldu = true;
  db.collection(COL.ogretmenler).onSnapshot(s=>{ ogretmenler = s.docs.map(d=>({id:d.id,...d.data()})); renderOgretmenler(); renderDersGrid(); renderDashboard(); renderOkulBilgileriSayfasi(); if(typeof aktifKullaniciyiGuncelle==='function') aktifKullaniciyiGuncelle(); if(typeof globalAramaYap==='function') globalAramaYap(); onbellekKaydet(); _ilkAcilistaKullaniciSor(); if(typeof renderBugunIzinliOgretmenler==='function') renderBugunIzinliOgretmenler(); if(typeof sidebarHesapGuncelle==='function' && typeof auth!=='undefined' && auth && auth.currentUser) sidebarHesapGuncelle(auth.currentUser); }, hataGoster);
  db.collection(COL.dersProgrami).onSnapshot(s=>{ dersProgrami = s.docs.map(d=>({id:d.id,...d.data()})); renderDersGrid(); renderDashboard(); if(detaySinifId){ const sn=siniflar.find(x=>x.id===detaySinifId); if(sn) sinifDetayDersRender(sn); } if(typeof widgetGuncelle==='function') setTimeout(widgetGuncelle,500); }, hataGoster);
  sinifBaglantilariKur();
  nobetBaglantilariKur();
  if(typeof takvimBaglantilariKur === 'function') takvimBaglantilariKur();
  db.collection(COL.evrak).onSnapshot(s=>{ evrakTakibi = s.docs.map(d=>({id:d.id,...d.data()})); renderEvrakTakibi(); renderDashboard(); if(typeof globalAramaYap==='function') globalAramaYap(); onbellekKaydet(); }, hataGoster);
  if(typeof notlarBaglantilariKur === 'function') notlarBaglantilariKur();

  if(typeof cizelgelerBaglantilariKur === 'function') cizelgelerBaglantilariKur();
  if(typeof mesajlasmaBaglantilariKur === 'function') mesajlasmaBaglantilariKur();
  if(typeof duyurularBaglantilariKur === 'function') duyurularBaglantilariKur();
  periyodikBaglantilariKur();
  tasimaBaglantilariKur();
  if(typeof ogretmenIzinBaglantilariKur === 'function') ogretmenIzinBaglantilariKur();
  if(typeof haberlerBaglantilariKur === 'function') haberlerBaglantilariKur();
  if(typeof servisOturmaBaglantisiKur === "function") servisOturmaBaglantisiKur();
  sinavBaglantilariKur();
  if(typeof dokumanlarBaglantisiKur === 'function') dokumanlarBaglantisiKur();
  if(typeof dersSaatleriBaglantisiKur === 'function') dersSaatleriBaglantisiKur();
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
  document.body.classList.remove('modal-open');
  // Arama sekmesi açılınca sonuçları güncelle — veriler henüz yüklenmemiş
  // olabilir, bu yüzden onSnapshot dinleyicileri de globalAramaYap()'ı
  // ayrıca tetikliyor; burada da tazelemek ilk açılışı garantiye alır.
  if(tab === 'arama' && typeof globalAramaYap === 'function') globalAramaYap();
  if(tab === 'dersNobetProgramim' && typeof renderDersNobetProgramim === 'function') renderDersNobetProgramim();
  if(typeof saltOkumaUygula === 'function') saltOkumaUygula(tab);

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

/* ---------- Web/PWA: donanım/tarayıcı geri tuşu köprüsü ----------
   DÜZELTME: geriTusuIsle() ve _sekmeGecmisi mekanizması sadece NATİF
   (Capacitor/APK) ortamda çalışıyordu — orada android/.../MainActivity.java
   > onBackPressed() bu fonksiyonu JS köprüsüyle çağırıyor. Web sürümünde
   (Chrome'da PWA/sekme) bu köprünün karşılığı hiç yoktu, bu yüzden geri
   tuşu/hareketi doğrudan sekmeyi/uygulamayı kapatıyordu. Burada aynı
   "önce içeride geri git, en üstteyse çift basışla çık" mantığını
   tarayıcının history.pushState/popstate API'siyle taklit ediyoruz.

   DÜZELTME 2: Başlangıçta arka arkaya 25 kez pushState çağırmak
   (kullanıcı hareketi OLMADAN, tek seferde patlama şeklinde) Chrome'un
   "history manipulation" kötüye kullanım önleme mekanizmasını
   tetikleyebiliyor — tarayıcı bu türden "yapay" kayıtları geri tuşunda
   SESSİZCE ATLAYABİLİYOR, yani tuzağımız hiç işe yaramadan by-pass
   ediliyor. Doğru/standart desen: HER ZAMAN sadece TEK bir tampon
   kaydı tutmak, ve onu SADECE gerçek bir kullanıcı geri hareketine
   (popstate'e) karşılık olarak yeniden doldurmak — bu, gerçek bir
   kullanıcı eylemine bağlı olduğu için kötüye kullanım sayılmıyor. */
(function(){
  const nativeMi = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if(nativeMi) return; // native ortamda MainActivity.java zaten hallediyor

  let _webGeriSonCikisZamani = 0;
  const _buferPushEt = () => { try{ history.pushState({oyGeriBuferi:true}, '', location.href); }catch(e){} };

  _buferPushEt(); // TEK başlangıç tamponu — birden fazla art arda push YAPMA (bkz. yukarıdaki not)

  let _sonPopstateZamani = 0;
  window.addEventListener('popstate', function(){
    // Android'in "geri kaydırma" (predictive back gesture) hareketi bazı
    // cihaz/sürümlerde TEK bir hareket için birden fazla popstate
    // tetikleyebiliyor — çok yakın ardışık olayları (150ms altı) TEK
    // basış say, sadece tamponu tazele.
    const simdiPop = Date.now();
    if(simdiPop - _sonPopstateZamani < 150){ _buferPushEt(); return; }
    _sonPopstateZamani = simdiPop;

    const sonuc = (typeof geriTusuIsle === 'function') ? geriTusuIsle() : 'exit';
    if(sonuc === 'handled'){ _buferPushEt(); return; }

    if(simdiPop - _webGeriSonCikisZamani < 2000){
      return; // ikinci basış — tamponu yeniden kurmuyoruz, tarayıcı gerçekten geri gitsin/sekme kapansın
    }
    _webGeriSonCikisZamani = simdiPop;
    if(typeof toast === 'function') toast('Çıkmak için tekrar geri tuşuna basın');
    _buferPushEt();
  });
})();

function haritaSekmesiAc(){
  sekmeAc('harita');
  // Harita başlatmayı bir sonraki tick'e bırak (DOM görünür olduktan sonra)
  setTimeout(()=>{
    if(typeof haritaBaslat === 'function') haritaBaslat();
    if(typeof renderHaritaServisler === 'function') renderHaritaServisler();
  }, 50);
}
function uygulamaBaslat(){
  // DÜZELTME: #bugunMetni elementi sidebar yeniden tasarımıyla kaldırıldı
  // (logo+okul adı yerine profil kartı kondu) — element artık DOM'da yok,
  // bu yüzden null kontrolü eklendi (aksi halde hata fırlatıp
  // baglantilariKur()'un hiç çalışmamasına sebep olurdu).
  const _bgm = document.getElementById('bugunMetni');
  if(_bgm) _bgm.textContent = bugunMetni();
  baglantilariKur();
  // Capacitor'ın initialize olmasını bekle, sonra push durumunu kontrol et
  setTimeout(()=>{
    pushDurumGuncelle();
    pushOnMessageDinleyiciKur();
  }, 1000);
  setInterval(()=>{ renderZilSayaci(GUNADI[new Date().getDay()]); }, 30000);
  setTimeout(guncellemeKontrolEt, 3000);
}

/* ====================================================================
   YENİ: Uygulama İçi Otomatik Güncelleme (SADECE native/APK ortamında)
   ----------------------------------------------------------------
   Bu APK, Google Play üzerinden değil doğrudan dosya olarak dağıtıldığı
   için Play Store'un otomatik güncelleme sistemi yok. Bunun yerine:
   1) Bu APK'nın KENDİ İÇİNE gömülü sürüm numarası (version.json, build
      sırasında yazılır — bkz. .github/workflows/build-apk.yml) okunur.
   2) GitHub'daki EN SON Release'in sürüm numarasıyla karşılaştırılır
      (bu her zaman canlı/güncel bilgi verir, APK'nın kendisi eski olsa
      bile bu kontrol kodu her çalıştığında GitHub'a soruyor).
   3) Daha yeni bir sürüm varsa, kullanıcıya sorup onaylarsa APK'yı arka
      planda indirip (bkz. android/.../UpdatePlugin.java) kurulum
      ekranını otomatik açar — kullanıcı sadece son "Yükle" onayını verir.
   ==================================================================== */
const GUNCELLEME_REPO = 'sedonet23/okul';

async function guncellemeKontrolEt(){
  const nativeMi = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if(!nativeMi) return; // web sürümü zaten kendiliğinden güncelleniyor (service worker)

  try{
    const yerelRes = await fetch('version.json');
    const yerel = await yerelRes.json();

    const sonRes = await fetch(`https://api.github.com/repos/${GUNCELLEME_REPO}/releases/latest`);
    if(!sonRes.ok) return; // sessizce vazgeç — internet yok / API limiti vb.
    const son = await sonRes.json();
    const sonKod = parseInt(String(son.tag_name || '').replace(/[^0-9]/g,''), 10);
    if(!sonKod || sonKod <= yerel.kod) return; // güncel

    const apkAsset = (son.assets || []).find(a => (a.name||'').endsWith('.apk'));
    if(!apkAsset) return;

    if(!confirm(`Yeni bir sürüm mevcut (v${sonKod}). Şimdi indirip kurmak ister misiniz?`)) return;

    toast('Güncelleme indiriliyor, birazdan kurulum ekranı açılacak…');
    await window.Capacitor.Plugins.UpdatePlugin.indirVeKur({ url: apkAsset.browser_download_url });
  }catch(e){
    console.warn('Güncelleme kontrolü başarısız (sessizce atlandı):', e);
  }
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
