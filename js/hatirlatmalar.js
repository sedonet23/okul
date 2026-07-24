/* ================================================================
   js/hatirlatmalar.js
   HATIRLATMA SİSTEMİ — giriş yapan öğretmene, son tarihi yaklaşan/geçmiş
   ve HENÜZ TAMAMLANMAMIŞ işlerini/evraklarını uygulama her açıldığında
   bir pop-up ile hatırlatır. Kaynaklar:

     1. Görevler          (sorumluOgretmenIdler, sonTarih, durum)
     2. Evrak Takibi      (sorumluOgretmenIdler, tarih, durum)
     3. Nöbet             (bugünkü atama, defterDolduruldu)
     4. Sosyal Kulüp      (aylık tik — Ekim-Haziran; + Yıllık Plan ve
                           Toplum Hizmeti Planı için ayrı tek seferlik tarih)
     5. Rehberlik         (aylık tik; + Yıllık Çalışma Planı için ayrı tarih)
     6. Maarif Model      (aylık tik — Eylül-Haziran)
     7. Zümre / ŞÖK       (1.Dönem/2.Dönem/Yıl Sonu — HER BİRİNİN kendi tarihi)
     8. BEP Planı         (Yıllık Ders Planı + BEP Planı — ayrı ayrı tarih)
     9. Belirli Gün/Hafta (tarihBaslangic, ogretmenIdler, kontroller[0])
    10. Kontrol Listeleri (her MADDENİN kendi tarihi, yayinda, her
                           öğretmenin kendi tamamlama kaydı)
    11. Yazılı Sınav      (ogretmenId, tarih — yaklaşan sınav hatırlatması)

   AYLIK RAPORLAR İÇİN TESLİM MANTIĞI: bir ayın raporu, BİR SONRAKİ ayın
   ilk haftasına (7'sine) kadar teslim edilebilir kabul edilir (örn. Eylül
   raporu Ekim'in ilk haftasında) — bkz. _htSonrakiAyIlkHaftasiISO().

   Tamamlanma HER ZAMAN kendi modülünde işaretlenir (bu dosya hiçbir
   yerde "tamamlandı" YAZMAZ) — bir madde tamamlanınca bir sonraki
   taramada kendiliğinden listeden düşer. "Tamam" sadece pop-up'ı kapatır
   (iş bitmediği sürece bir sonraki açılışta yine çıkar); "Ertele" birkaç
   saat boyunca tekrar göstermez (yerel, cihaza özel).
   ================================================================ */

let hatirlatmaAyarlariGuncel = { gunSayisi: 3, erteleSaat: 4 };
let _hatirlatmaGosterildi = false; // bu oturumda (sayfa tam yüklemesinde) zaten gösterildi mi?

function hatirlatmaAyarlariBaglantisiniKur(){
  db.collection(COL.hatirlatmaAyarlari).doc('ayarlar').onSnapshot(doc=>{
    if(doc.exists) hatirlatmaAyarlariGuncel = { gunSayisi: 3, erteleSaat: 4, ...doc.data() };
    renderHatirlatmaAyarForm();
  }, err=>console.warn('Hatırlatma ayarları dinlenemedi:', err));
}

function renderHatirlatmaAyarForm(){
  const kutu = document.getElementById('hatirlatmaAyarForm');
  if(!kutu) return;
  kutu.innerHTML = `
    <div class="form-row">
      <div class="form-group" style="max-width:220px;">
        <label>Kaç gün kala hatırlatma başlasın?</label>
        <input type="number" id="hatirlatmaGunSayisiInput" min="1" step="1" value="${hatirlatmaAyarlariGuncel.gunSayisi}">
      </div>
      <div class="form-group" style="max-width:220px;">
        <label>"Ertele" kaç saat gizlesin?</label>
        <input type="number" id="hatirlatmaErteleSaatInput" min="1" step="1" value="${hatirlatmaAyarlariGuncel.erteleSaat}">
      </div>
    </div>
    <button class="btn btn-ghost btn-sm" onclick="hatirlatmaGunSayisiKaydet()">💾 Kaydet</button>`;
}
function hatirlatmaGunSayisiKaydet(){
  const gunEl = document.getElementById('hatirlatmaGunSayisiInput');
  const erteleEl = document.getElementById('hatirlatmaErteleSaatInput');
  const gun = parseInt(gunEl.value);
  const ertele = parseInt(erteleEl.value);
  if(!gun || gun < 1){ toast('Geçerli bir gün sayısı girin.'); return; }
  if(!ertele || ertele < 1){ toast('Geçerli bir saat değeri girin.'); return; }
  if(!(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin)){ toast('Bu işlem için yetkiniz yok.'); return; }
  db.collection(COL.hatirlatmaAyarlari).doc('ayarlar').set({ gunSayisi: gun, erteleSaat: ertele }, { merge:true })
    .then(()=>toast('Kaydedildi.')).catch(err=>toast('Hata: '+err.message));
}

/* ---------- Yardımcı tarih fonksiyonları ---------- */
function _htGunFarki(hedefISO){
  // hedefISO bugünden kaç gün SONRA (negatifse kaç gün ÖNCE geçmiş).
  const bugun = new Date(); bugun.setHours(0,0,0,0);
  const hedef = new Date(hedefISO + 'T00:00:00');
  return Math.round((hedef - bugun) / (1000*60*60*24));
}
function _htSonrakiAyIlkHaftasiISO(yil, ayIndex0){
  // DÜZELTME: Önceden "o ayın son günü" kullanılıyordu. Sedat'ın isteğiyle
  // artık her ayın raporu, BİR SONRAKİ ayın ilk haftasına kadar teslim
  // edilebiliyor (örn. Eylül raporu Ekim'in ilk haftasında) — bu yüzden
  // son tarih, bir sonraki ayın 7'si olarak kabul ediliyor.
  let sonrakiAy = ayIndex0 + 1, sonrakiYil = yil;
  if(sonrakiAy > 11){ sonrakiAy = 0; sonrakiYil += 1; }
  return `${sonrakiYil}-${String(sonrakiAy+1).padStart(2,'0')}-07`;
}

/* ---------- Aylık çizelge türleri (Kulüp/Rehberlik/Maarif) ---------- */
const HT_AYLIK_TIP_AYARI = {
  sosyalKulupler: { aylar:['Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'], baslangicIndex:2, ad:'Sosyal Kulüp Aylık Rapor', ogretmenAlani:'ogretmenIdler' },
  rehberlik:      { aylar:['Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'], baslangicIndex:1, ad:'Rehberlik Aylık Rapor', ogretmenAlani:'ogretmenId' },
  maarifRapor:    { aylar:['Eyl','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'], baslangicIndex:0, ad:'Maarif Model Aylık Rapor', ogretmenAlani:'ogretmenId' },
};
const HT_AY_KISA_ADLARI = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

function _htAylikTaramalar(ogretmenId, gunSayisi){
  const sonuc = [];
  const su = new Date();
  Object.entries(HT_AYLIK_TIP_AYARI).forEach(([tip, ayar])=>{
    (cizelgeVerileri[tip] || []).forEach(kayit=>{
      const idlerAlaniDizi = ayar.ogretmenAlani === 'ogretmenIdler';
      const buOgretmeninMi = idlerAlaniDizi ? (kayit.ogretmenIdler||[]).includes(ogretmenId) : kayit.ogretmenId === ogretmenId;
      if(!buOgretmeninMi) return;
      const kontroller = kayit.kontroller || [];
      // Bu ayın (ve henüz tiklenmemiş geçmiş ayların) hepsini tara —
      // okul yılı başlangıcından bugüne kadar, ileri tarihli aylar hariç.
      ayar.aylar.forEach((ayKisaAdi, i)=>{
        const kontrolIndex = ayar.baslangicIndex + i;
        if(kontroller[kontrolIndex]) return; // zaten tiklenmiş
        // Bu ay, okul yılının hangi takvim ay/yılına denk geliyor? Kısa
        // ay adından mevcut/geçen yılki en yakın karşılığı bulunur.
        const ayIndex0 = HT_AY_KISA_ADLARI.indexOf(ayKisaAdi);
        if(ayIndex0 === -1) return;
        // Okul yılı Eylül-Haziran arası sürer; Eylül-Aralık cari takvim
        // yılında, Ocak-Haziran BİR SONRAKİ takvim yılındadır. Bugüne en
        // yakın GEÇMİŞ veya bugünkü karşılığı seçilir.
        let aday = _htSonrakiAyIlkHaftasiISO(su.getFullYear(), ayIndex0);
        if(new Date(aday) > su){ aday = _htSonrakiAyIlkHaftasiISO(su.getFullYear()-1, ayIndex0); }
        // Aday hâlâ çok eskideyse (>400 gün önce) muhtemelen alakasız bir
        // önceki okul yılına ait — atla.
        const fark = _htGunFarki(aday);
        if(fark < -400) return;
        if(fark <= gunSayisi){
          sonuc.push({
            kaynak: tip, baslik: `${ayar.ad} — ${ayKisaAdi}`,
            altBaslik: kayit.ders || kayit.sinif || kayit.rapor || '',
            gunFarki: fark, git: ()=>{ if(typeof sekmeAc==='function') sekmeAc(tip); }
          });
        }
      });
    });
  });
  return sonuc;
}

/* ---------- Belirli Gün ve Haftalar ---------- */
function _htBelirliGunTaramalari(ogretmenId, gunSayisi){
  return (belirliGunlerListesi||[])
    .filter(e => (e.ogretmenIdler||[]).includes(ogretmenId) && !(e.kontroller && e.kontroller[0]) && e.tarihBaslangic)
    .map(e => ({ kaynak:'belirliGunler', baslik:`Belirli Gün/Hafta: ${e.ad}`, altBaslik:'', gunFarki:_htGunFarki(e.tarihBaslangic), git: ()=>{ if(typeof sekmeAc==='function') sekmeAc('belirliGunler'); } }))
    .filter(x => x.gunFarki <= gunSayisi);
}

/* ---------- Zümre / ŞÖK — YENİ: kendi kayıtlarındaki 3 AYRI dönem tarihi
   (tarih1/tarih2/tarih3 — 1.Dönem/2.Dönem/Yıl Sonu, bkz. js/cizelgeler.js
   CIZELGE_META). Her dönem kendi tarihine göre AYRI AYRI değerlendirilir;
   sadece o dönemin tiki işaretlenmemişse ve o dönemin kendi tarihi
   yaklaşıyorsa/geçtiyse hatırlatma üretir. ---------- */
const HT_ZUMRE_SOK_ADLARI = { zumre:'Zümre Toplantısı', sok:'ŞÖK' };
const HT_DONEM_ALAN_ADLARI = ['tarih1','tarih2','tarih3'];
const HT_DONEM_ETIKETLERI = ['1. Dönem','2. Dönem','Yıl Sonu'];
function _htZumreSokTaramalari(ogretmenId, gunSayisi){
  const sonuc = [];
  ['zumre','sok'].forEach(tip=>{
    (cizelgeVerileri[tip] || []).forEach(kayit=>{
      if(kayit.ogretmenId !== ogretmenId) return;
      HT_DONEM_ALAN_ADLARI.forEach((alan, i)=>{
        const tarih = kayit[alan];
        if(!tarih || (kayit.kontroller||[])[i]) return; // tarih girilmemiş ya da zaten tiklenmiş
        const fark = _htGunFarki(tarih);
        if(fark > gunSayisi) return;
        sonuc.push({
          kaynak:tip, baslik:`${HT_ZUMRE_SOK_ADLARI[tip]} — ${HT_DONEM_ETIKETLERI[i]}: ${kayit.brans||kayit.konu||kayit.sinif||''}`.trim(),
          altBaslik:kayit.sinif&&kayit.brans?kayit.sinif:'', gunFarki:fark, git: ()=>{ if(typeof sekmeAc==='function') sekmeAc(tip); }
        });
      });
    });
  });
  return sonuc;
}

/* ---------- Tek seferlik planlar — Sosyal Kulüp (Yıllık Plan, Toplum
   Hizmeti), Rehberlik (Yıllık Çalışma Planı), BEP (Yıllık Ders Planı, BEP
   Planı). Her biri kendi kaydındaki tek bir tarih alanı + kendi kontrol
   index'ine (kontroller dizisindeki konumuna) göre değerlendirilir. ---------- */
const HT_TEK_SEFERLIK_AYARI = [
  { tip:'sosyalKulupler', alan:'yillikPlanTarihi',      kontrolIndex:0, ad:'Sosyal Kulüp — Yıllık Plan',          ogretmenAlani:'ogretmenIdler' },
  { tip:'sosyalKulupler', alan:'toplumHizmetiTarihi',   kontrolIndex:1, ad:'Sosyal Kulüp — Toplum Hizmeti Planı', ogretmenAlani:'ogretmenIdler' },
  { tip:'rehberlik',      alan:'yillikPlanTarihi',      kontrolIndex:0, ad:'Rehberlik — Yıllık Çalışma Planı',    ogretmenAlani:'ogretmenId' },
  { tip:'bepPlani',       alan:'yillikDersPlaniTarihi', kontrolIndex:0, ad:'Yıllık Ders Planı',                   ogretmenAlani:'ogretmenId' },
  { tip:'bepPlani',       alan:'bepPlaniTarihi',        kontrolIndex:1, ad:'BEP Planı',                          ogretmenAlani:'ogretmenId' },
];
function _htTekSeferlikTaramalari(ogretmenId, gunSayisi){
  const sonuc = [];
  HT_TEK_SEFERLIK_AYARI.forEach(ayar=>{
    (cizelgeVerileri[ayar.tip] || []).forEach(kayit=>{
      const idlerAlaniDizi = ayar.ogretmenAlani === 'ogretmenIdler';
      const buOgretmeninMi = idlerAlaniDizi ? (kayit[ayar.ogretmenAlani]||[]).includes(ogretmenId) : kayit[ayar.ogretmenAlani] === ogretmenId;
      if(!buOgretmeninMi) return;
      const tarih = kayit[ayar.alan];
      if(!tarih || (kayit.kontroller||[])[ayar.kontrolIndex]) return;
      const fark = _htGunFarki(tarih);
      if(fark > gunSayisi) return;
      sonuc.push({ kaynak:ayar.tip, baslik:ayar.ad, altBaslik:kayit.ad||kayit.brans||kayit.sinif||'', gunFarki:fark, git: ()=>{ if(typeof sekmeAc==='function') sekmeAc(ayar.tip); } });
    });
  });
  return sonuc;
}

/* ---------- Görevler ve Evrak (genel atanmış işler) ---------- */
function _htGorevTaramalari(ogretmenId, gunSayisi){
  return (typeof gorevler!=='undefined'?gorevler:[])
    .filter(g => (g.sorumluOgretmenIdler||[]).includes(ogretmenId) && g.durum!=='tamamlandi' && g.sonTarih)
    .map(g => ({ kaynak:'gorev', baslik:`Görev: ${g.baslik}`, altBaslik:g.aciklama||'', gunFarki:_htGunFarki(g.sonTarih), git: ()=>{ if(typeof sekmeAc==='function') sekmeAc('takvim'); } }))
    .filter(x => x.gunFarki <= gunSayisi);
}
function _htEvrakTaramalari(ogretmenId, gunSayisi){
  return (typeof evrakTakibi!=='undefined'?evrakTakibi:[])
    .filter(e => (e.sorumluOgretmenIdler||[]).includes(ogretmenId) && e.durum!=='Tamamlandı' && e.durum!=='Arşivlendi' && e.tarih)
    .map(e => ({ kaynak:'evrak', baslik:`Evrak: ${e.evrakAdi}`, altBaslik:e.aciklama||'', gunFarki:_htGunFarki(e.tarih), git: ()=>{ if(typeof sekmeAc==='function') sekmeAc('evrak'); } }))
    .filter(x => x.gunFarki <= gunSayisi);
}

/* ---------- Nöbet (sadece BUGÜN) ---------- */
function _htNobetTaramalari(ogretmenId){
  const bugunISO = todayISO();
  return (typeof nobetAtamalari!=='undefined'?nobetAtamalari:[])
    .filter(a => a.tarih===bugunISO && a.ogretmenId===ogretmenId && !a.defterDolduruldu)
    .map(a => {
      const yer = (typeof nobetYerleri!=='undefined'?nobetYerleri:[]).find(y=>y.id===a.yerId);
      return { kaynak:'nobet', baslik:`Bugün nöbetçisiniz: ${yer?yer.ad:'?'}`, altBaslik:'Nöbet defterini doldurmayı unutmayın', gunFarki:0, git: ()=>{ if(typeof sekmeAc==='function') sekmeAc('nobet'); } };
    });
}

/* ---------- Yazılı Sınav (yaklaşan sınav — sadece kendi sınavı) ---------- */
function _htSinavTaramalari(ogretmenId, gunSayisi){
  return (typeof sinavlar!=='undefined'?sinavlar:[])
    .filter(s => s.ogretmenId===ogretmenId && s.tarih)
    .map(s => ({ kaynak:'sinav', baslik:`Yazılı Sınav: ${s.ders||''} ${s.sinif||''}`.trim(), altBaslik:s.saat?('Saat: '+s.saat):'', gunFarki:_htGunFarki(s.tarih), git: ()=>{ if(typeof sekmeAc==='function') sekmeAc('yaziliSinavlar'); } }))
    .filter(x => x.gunFarki >= 0 && x.gunFarki <= gunSayisi); // geçmiş sınavlar için hatırlatmaya gerek yok
}

/* ---------- Kontrol Listeleri (ASENKRON — her liste için ayrı bir tamamlama okuması gerekir) ----------
   DÜZELTME: Tarih artık LİSTE seviyesinde değil, her MADDENİN kendi
   "tarih" alanında (bkz. js/kontrol-listeleri.js _klMaddeFormBody) —
   Sedat'ın isteğiyle liste bazlı tarih kaldırıldı. Bu yüzden her liste
   için tamamlama kaydı bir kez okunur, sonra o listenin İÇİNDEKİ her
   maddenin kendi tarihine göre ayrı ayrı değerlendirilir. */
async function _htKontrolListesiTaramalari(ogretmenId, gunSayisi){
  const sonuc = [];
  const listeler = (typeof kontrolListeleri!=='undefined'?kontrolListeleri:[])
    .filter(l => l.yayinda !== false && (l.maddeler||[]).some(m=>m.tarih));
  for(const liste of listeler){
    let tamamlanan;
    try{
      const doc = await KontrolListeleriService.tamamlamaGetir(ogretmenId, liste.id);
      tamamlanan = new Set((doc.exists && doc.data().tamamlananMaddeIdler) || []);
    }catch(e){ console.warn('Kontrol listesi taraması başarısız:', liste.ad, e); continue; }
    (liste.maddeler||[]).forEach(madde=>{
      if(!madde.tarih || tamamlanan.has(madde.id)) return;
      const fark = _htGunFarki(madde.tarih);
      if(fark > gunSayisi) return;
      sonuc.push({
        kaynak:'kontrolListesi', baslik:`Kontrol Listesi: ${liste.ad}`, altBaslik:madde.metin||'',
        gunFarki:fark, git: ()=>{ if(typeof kontrolListeleriAc==='function'){ kontrolListeleriAc(); setTimeout(()=>_klListeyeGit(liste.id), 300); } }
      });
    });
  }
  return sonuc;
}

/* ---------- Ana toplama fonksiyonu ---------- */
async function hatirlatmalariTopla(){
  const ben = bagliOgretmenimGetir();
  if(!ben) return [];
  const gunSayisi = hatirlatmaAyarlariGuncel.gunSayisi || 3;
  const senkron = [
    ..._htGorevTaramalari(ben.id, gunSayisi),
    ..._htEvrakTaramalari(ben.id, gunSayisi),
    ..._htNobetTaramalari(ben.id),
    ..._htAylikTaramalar(ben.id, gunSayisi),
    ..._htZumreSokTaramalari(ben.id, gunSayisi),
    ..._htTekSeferlikTaramalari(ben.id, gunSayisi),
    ..._htBelirliGunTaramalari(ben.id, gunSayisi),
    ..._htSinavTaramalari(ben.id, gunSayisi),
  ];
  const asenkron = (typeof KontrolListeleriService!=='undefined') ? await _htKontrolListesiTaramalari(ben.id, gunSayisi) : [];
  const hepsi = [...senkron, ...asenkron];
  hepsi.sort((a,b)=>a.gunFarki-b.gunFarki); // en geciken/en yakın en üstte
  return hepsi;
}

/* ---------- Pop-up UI ---------- */
function _htErtelemeAktifMi(){
  const t = localStorage.getItem('hatirlatmaErteleZamani');
  if(!t) return false;
  return Date.now() < parseInt(t);
}
function hatirlatmaPopupErtele(){
  const saat = hatirlatmaAyarlariGuncel.erteleSaat || 4;
  localStorage.setItem('hatirlatmaErteleZamani', String(Date.now() + saat*60*60*1000));
  const ov = document.getElementById('hatirlatmaPopupOverlay');
  if(ov) ov.remove();
  document.body.classList.remove('modal-open');
  if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
}
function hatirlatmaPopupKapat(){
  const ov = document.getElementById('hatirlatmaPopupOverlay');
  if(ov) ov.remove();
  document.body.classList.remove('modal-open');
  if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
}
function _htMaddeyeGit(index, maddeler){
  const m = maddeler[index];
  hatirlatmaPopupKapat();
  if(m && typeof m.git==='function') m.git();
}

async function hatirlatmalariKontrolEtVeGoster(){
  if(_hatirlatmaGosterildi || _htErtelemeAktifMi()) return;
  let maddeler;
  try{ maddeler = await hatirlatmalariTopla(); }
  catch(e){ console.warn('Hatırlatmalar toplanamadı:', e); return; }
  if(!maddeler.length) return;
  _hatirlatmaGosterildi = true;

  const ov = document.createElement('div');
  ov.id = 'hatirlatmaPopupOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
  ov.innerHTML = `
    <div style="background:var(--bg-card,#fff);width:100%;max-width:520px;height:90vh;border-radius:20px;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden;">
      <div style="padding:16px 18px 8px;border-bottom:1px solid var(--border);">
        <div style="font-weight:800;font-size:16px;">🔔 Hatırlatmalarınız</div>
        <div style="font-size:12.5px;color:var(--ink-muted);margin-top:2px;">${maddeler.length} bekleyen madde — işi tamamlayınca burada görünmeyecek</div>
      </div>
      <div style="overflow-y:auto;flex:1;padding:8px 12px;">
        ${maddeler.map((m,i)=>{
          const gecikmis = m.gunFarki < 0;
          const renk = gecikmis ? 'var(--red-danger,#dc2626)' : (m.gunFarki===0 ? 'var(--amber-deep,#b45309)' : 'var(--ink-muted)');
          const durumMetni = gecikmis ? `${Math.abs(m.gunFarki)} gün gecikti` : (m.gunFarki===0 ? 'Bugün son gün' : `${m.gunFarki} gün kaldı`);
          return `
          <div class="dash-card-clickable" style="padding:12px;border-radius:12px;margin-bottom:8px;border:1px solid var(--border);cursor:pointer;" onclick="_htMaddeyeGit(${i}, window._htGuncelMaddeler)">
            <div style="font-weight:700;font-size:13.5px;">${escapeHtml(m.baslik)}</div>
            ${m.altBaslik?`<div style="font-size:12px;color:var(--ink-muted);margin-top:2px;">${escapeHtml(m.altBaslik)}</div>`:''}
            <div style="font-size:12px;font-weight:700;color:${renk};margin-top:4px;">${durumMetni}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:10px;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--border);">
        <button class="btn btn-ghost" style="flex:1;" onclick="hatirlatmaPopupErtele()">⏰ Ertele (${hatirlatmaAyarlariGuncel.erteleSaat||4} saat)</button>
        <button class="btn btn-primary" style="flex:1;" onclick="hatirlatmaPopupKapat()">Tamam</button>
      </div>
    </div>`;
  window._htGuncelMaddeler = maddeler; // _htMaddeyeGit'in erişebilmesi için
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);
}
