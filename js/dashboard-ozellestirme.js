/* ====================================================================
   js/dashboard-ozellestirme.js
   ANASAYFA (GENEL BAKIŞ) ÖZELLEŞTİRME — Kullanıcı kontrolünde kart
   seçimi + sıralaması.

   Tasarım notları:
   - Bu bir KİŞİSEL cihaz tercihidir (tema/renk paketi gibi) — Firestore'a
     YAZILMAZ, sadece localStorage'da tutulur. Cihazlar arası senkronize
     olmaz ama Firestore kotasını hiç kullanmaz ve anında uygulanır.
   - Hiçbir kart, kullanıcının GÖREMEYECEĞİ bir modülü açığa çıkarmaz —
     bu sistem sadece "görebildiği kartlar arasından hangilerini,
     hangi sırada göreceğini" belirler. Asıl yetki kontrolü (data-yetki-modul,
     dashboardYetkiUygula) her zaman ÖNCE çalışır ve önceliklidir.
   - Kayıtlı tercih YOKSA (hiç özelleştirme yapılmamışsa) TÜM kartlar eski
     davranışla (yetkiye göre) gösterilir — geriye dönük uyumluluk için.
     Sınır (KART_LIMITI) sadece kullanıcı düzenleme ekranını kullanırken
     seçim yaparken uygulanır.
   ==================================================================== */

const DASHBOARD_KART_KATALOGU = [
  { id:'bugunIzinli',        ad:'🏥 Bugün İzinli Öğretmenler' },
  { id:'duyuruPanosu',       ad:'📢 Duyuru Panosu' },
  { id:'haberTicker',        ad:'📰 Haberler (kayan bant)' },
  { id:'istatistikSeridi',   ad:'📊 İstatistik Şeridi (Personel/Öğrenci/Servis/Evrak)' },
  { id:'hizliBakis',         ad:'👁️ Hızlı Bakış Rozetleri' },
  { id:'haberKarusel',       ad:'📰 Son Haberler (karusel)' },
  { id:'okulSitesiKart',     ad:'🏫 Okul Sitemizden (görselli, yatay kayan)' },
  { id:'hizliIslemler',      ad:'⚡ Hızlı İşlemler' },
  { id:'gununNobetcileri',   ad:'🛡️ Günün Nöbetçileri' },
  { id:'ogretmenOzel',       ad:'📚 Bugünkü Derslerim / Bu Haftaki Nöbetim' },
  { id:'sinavlarim',         ad:'📝 Sınavlarım' },
  { id:'mesajlarim',         ad:'💬 Mesajlarım' },
  { id:'sonDokumanlar',      ad:'📁 Son Eklenen Dökümanlar' },
  { id:'bekleyenEvrak',      ad:'📄 Bekleyen Evrak Listesi' },
  { id:'suankiDers',         ad:'📚 Şu Anki Ders Saatinde' },
  { id:'bugununProgrami',    ad:'🗓️ Bugünün Ders Programı' },
  { id:'haftaninNobetcileri',ad:'👮 Bu Haftanın Nöbetçileri' },
  { id:'etkinlikGorev',      ad:'⏰ Yaklaşan Etkinlikler & Görevler' },
  { id:'belirliGunler',      ad:'🎉 Yaklaşan Belirli Gün ve Haftalar' },
  { id:'miniTakvim',         ad:'📅 Bu Ay (mini takvim)' },
  { id:'ajanda',             ad:'🗓️ Ajanda' },
  { id:'notDefteri',         ad:'📝 Not Defteri' },
];
// DÜZELTME: 12 kart sınırı kaldırıldı — artık katalogdaki tüm kartlar
// seçilebilir. Sabit kaldırıldı, ilk kullanımda (hiç tercih yokken)
// varsayılan artık TÜM kartlar oluyor.
const DASHBOARD_TERCIH_ANAHTARI = 'oyDashboardDuzeni_v1';

function _dashboardTercihiOku(){
  try{
    const ham = localStorage.getItem(DASHBOARD_TERCIH_ANAHTARI);
    if(!ham) return null;
    const veri = JSON.parse(ham);
    if(!Array.isArray(veri.secili)) return null;
    return veri;
  }catch(e){ return null; }
}
function _dashboardTercihiYaz(seciliIdListesi){
  try{ localStorage.setItem(DASHBOARD_TERCIH_ANAHTARI, JSON.stringify({ secili: seciliIdListesi })); }
  catch(e){}
}

/* Anasayfa render edildikten SONRA çağrılır (renderDashboard() sonunda).
   Kayıtlı bir tercih varsa: seçilmeyenleri gizler, seçilenleri
   kaydedilen sıraya göre DOM'da yeniden dizer. Tercih yoksa hiçbir şey
   yapmaz (mevcut yetkiye-göre-göster davranışı aynen sürer). */
function dashboardOzellestirmeUygula(){
  const tercih = _dashboardTercihiOku();
  const anaKap = document.querySelector('#tab-panel');
  if(!anaKap) return;

  anaKap.querySelectorAll('[data-kart-id]').forEach(el=>{
    el.classList.remove('kullanici-gizledi');
  });

  if(!tercih) return; // hiç özelleştirme yapılmamış — dokunma

  const gecerliIdler = new Set(DASHBOARD_KART_KATALOGU.map(k=>k.id));
  const secili = tercih.secili.filter(id=>gecerliIdler.has(id));

  // Seçilmeyenleri gizle
  anaKap.querySelectorAll('[data-kart-id]').forEach(el=>{
    if(!secili.includes(el.dataset.kartId)) el.classList.add('kullanici-gizledi');
  });

  // Seçilenleri kaydedilen sırayla yeniden diz (hero'dan hemen sonra)
  const hero = anaKap.querySelector('.dash-hero');
  let referans = hero;
  secili.forEach(id=>{
    const el = anaKap.querySelector(`[data-kart-id="${id}"]`);
    if(!el) return;
    if(referans && referans.nextSibling === el){ referans = el; return; }
    anaKap.insertBefore(el, referans ? referans.nextSibling : anaKap.firstChild);
    referans = el;
  });
}

/* ---------- Özelleştirme modalı ---------- */
function dashboardOzellestirModalAc(){
  const tercih = _dashboardTercihiOku();
  const tumIdler = DASHBOARD_KART_KATALOGU.map(k=>k.id);
  const secili = tercih ? tercih.secili.filter(id=>tumIdler.includes(id)) : tumIdler.slice();

  window._dkoSeciliGecici = secili.slice();

  modalAc('⚙️ Anasayfayı Düzenle', '<div class="empty-state">Yükleniyor…</div>',
    () => {
      _dashboardTercihiYaz(window._dkoSeciliGecici);
      modalKapat();
      if(typeof renderDashboard === 'function') renderDashboard();
      toast('Anasayfa düzeni kaydedildi.');
    },
    null, '💾 Kaydet'
  );
  _dashboardOzellestirModalIcerikYaz();
}

function _dashboardOzellestirModalIcerikYaz(){
  const govde = document.getElementById('modalBody');
  if(!govde) return;
  const secili = window._dkoSeciliGecici || [];
  const kalanlar = DASHBOARD_KART_KATALOGU.filter(k=>!secili.includes(k.id));

  const seciliHtml = secili.length ? secili.map((id, i)=>{
    const k = DASHBOARD_KART_KATALOGU.find(x=>x.id===id);
    if(!k) return '';
    return `<div style="display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;margin-bottom:6px;background:var(--nm-bg);">
      <span style="flex:1;font-size:13.5px;">${escapeHtml(k.ad)}</span>
      <button type="button" class="btn btn-ghost btn-sm" ${i===0?'disabled style="opacity:.3;"':''} onclick="_dkoTasi('${id}',-1)">⬆</button>
      <button type="button" class="btn btn-ghost btn-sm" ${i===secili.length-1?'disabled style="opacity:.3;"':''} onclick="_dkoTasi('${id}',1)">⬇</button>
      <button type="button" class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="_dkoKaldir('${id}')">✕</button>
    </div>`;
  }).join('') : '<p class="empty-state">Henüz kart seçilmedi.</p>';

  const kalanlarHtml = kalanlar.length ? kalanlar.map(k=>`
    <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px dashed var(--border);border-radius:10px;margin-bottom:6px;">
      <span style="flex:1;font-size:13.5px;color:var(--ink-muted);">${escapeHtml(k.ad)}</span>
      <button type="button" class="btn btn-amber btn-sm" onclick="_dkoEkle('${k.id}')">+ Ekle</button>
    </div>`).join('') : '<p class="empty-state">Tüm kartlar zaten seçili.</p>';

  govde.innerHTML = `
    <div style="font-size:12px;color:var(--ink-muted);margin-bottom:10px;">
      Yukarı/aşağı oklarla sırasını değiştirebilirsiniz. Bu tercih sadece bu cihazda geçerlidir.
    </div>
    <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;">✅ Seçili Kartlarım (${secili.length})</div>
    <div style="max-height:220px;overflow-y:auto;margin-bottom:14px;">${seciliHtml}</div>
    <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;">➕ Eklenebilir Kartlar</div>
    <div style="max-height:180px;overflow-y:auto;">${kalanlarHtml}</div>
    <button type="button" class="btn btn-ghost btn-sm" style="margin-top:14px;width:100%;" onclick="_dkoVarsayilanaDon()">↺ Varsayılana Dön (tümünü göster)</button>
  `;
}

function _dkoTasi(id, yon){
  const liste = window._dkoSeciliGecici;
  const i = liste.indexOf(id);
  const j = i + yon;
  if(i<0 || j<0 || j>=liste.length) return;
  [liste[i], liste[j]] = [liste[j], liste[i]];
  _dashboardOzellestirModalIcerikYaz();
}
function _dkoKaldir(id){
  window._dkoSeciliGecici = window._dkoSeciliGecici.filter(x=>x!==id);
  _dashboardOzellestirModalIcerikYaz();
}
function _dkoEkle(id){
  window._dkoSeciliGecici.push(id);
  _dashboardOzellestirModalIcerikYaz();
}
function _dkoVarsayilanaDon(){
  localStorage.removeItem(DASHBOARD_TERCIH_ANAHTARI);
  modalKapat();
  if(typeof renderDashboard === 'function') renderDashboard();
  toast('Anasayfa varsayılan düzenine döndürüldü.');
}

/* ====================================================================
   ALT-ÖĞE SEÇİCİ (kart İÇİNDEKİ öğelerin seçimi/sıralaması)
   Örn: Hızlı Bakış'ın 4 rozetten hangilerini göstereceği, İstatistik
   Şeridi'nin 4 kartından hangilerinin görüneceği, Hızlı İşlemler'in
   8 kısayolundan hangilerinin görüneceği. Üst düzey kart seçiminden
   (yukarıdaki DASHBOARD_KART_KATALOGU) BAĞIMSIZ, ayrı bir localStorage
   anahtarı kullanır — her kartın kendi iç düzeni ayrı saklanır.
   ==================================================================== */
const DASHBOARD_ALT_KATALOG = {
  hizliBakis: { limit:4, ogeler:[
    {id:'acikGorev',    ad:'📌 Açık Görev Sayısı'},
    {id:'bugunkuDers',  ad:'📚 Bugünkü Ders Sayısı'},
    {id:'hatirlatici',  ad:'⏰ Hatırlatıcı Sayısı'},
    {id:'sinavlarim',   ad:'📝 Sınavlarım / Sınav Sayısı'},
  ]},
  istatistikSeridi: { limit:6, ogeler:[
    {id:'personel',   ad:'👨‍🏫 Personel Sayısı'},
    {id:'ogrenciler', ad:'🧑‍🎓 Öğrenci Sayısı'},
    {id:'servis',     ad:'🚌 Servis Sayısı'},
    {id:'evrak',      ad:'📄 Bekleyen Evrak Sayısı'},
    {id:'sinif',      ad:'🏫 Sınıf Sayısı'},
    {id:'ilkokulOgrenci',   ad:'🧑‍🎓 İlkokul Öğrenci Sayısı'},
    {id:'ortaokulOgrenci',  ad:'🧑‍🎓 Ortaokul Öğrenci Sayısı'},
    {id:'ilkokulOgretmen',  ad:'👨‍🏫 İlkokul Öğretmen Sayısı'},
    {id:'ortaokulOgretmen', ad:'👨‍🏫 Ortaokul Öğretmen Sayısı'},
  ]},
  hizliIslemler: { limit:8, ogeler:[
    {id:'personel',       ad:'👥 Personel'},
    {id:'siniflar',       ad:'🏫 Sınıflar'},
    {id:'nobet',          ad:'🛡️ Nöbet'},
    {id:'servis',         ad:'🚌 Servis'},
    {id:'evrak',          ad:'📄 Evrak'},
    {id:'raporlar',       ad:'📊 Raporlar / Dökümanlar'},
    {id:'takvim',         ad:'📅 Takvim'},
    {id:'notlar',         ad:'📝 Notlar'},
    {id:'cizelgeler',     ad:'⋯ Çizelgeler'},
    {id:'mesajlar',       ad:'💬 Mesajlar'},
    {id:'duyurular',      ad:'📢 Duyurular'},
    {id:'sinavIslemleri', ad:'📝 Sınav İşlemleri'},
  ]},
};

function _altTercihAnahtari(kartId){ return 'oyDashboardAlt_'+kartId+'_v1'; }
function _altTercihOku(kartId){
  const katalog = DASHBOARD_ALT_KATALOG[kartId];
  if(!katalog) return [];
  try{
    const ham = localStorage.getItem(_altTercihAnahtari(kartId));
    if(ham){
      const liste = JSON.parse(ham);
      if(Array.isArray(liste)) return liste.filter(id=>katalog.ogeler.some(o=>o.id===id));
    }
  }catch(e){}
  // Varsayılan: kataloğun ilk (limit) kadar öğesi, tanımlı sırayla.
  return katalog.ogeler.map(o=>o.id).slice(0, katalog.limit);
}
function _altTercihYaz(kartId, seciliListe){
  try{ localStorage.setItem(_altTercihAnahtari(kartId), JSON.stringify(seciliListe)); }catch(e){}
}

function dashboardAltDuzenModalAc(kartId){
  const katalog = DASHBOARD_ALT_KATALOG[kartId];
  if(!katalog) return;
  window._dkoAltAnahtar = kartId;
  window._dkoAltSeciliGecici = _altTercihOku(kartId).slice();
  modalAc('✏️ Düzenle', '<div class="empty-state">Yükleniyor…</div>',
    () => {
      _altTercihYaz(kartId, window._dkoAltSeciliGecici);
      modalKapat();
      if(typeof renderDashboard === 'function') renderDashboard();
      toast('Kaydedildi.');
    },
    null, '💾 Kaydet'
  );
  _dashboardAltModalIcerikYaz();
}

function _dashboardAltModalIcerikYaz(){
  const govde = document.getElementById('modalBody');
  if(!govde) return;
  const kartId = window._dkoAltAnahtar;
  const katalog = DASHBOARD_ALT_KATALOG[kartId];
  const secili = window._dkoAltSeciliGecici || [];
  const kalanlar = katalog.ogeler.filter(o=>!secili.includes(o.id));

  const seciliHtml = secili.length ? secili.map((id,i)=>{
    const o = katalog.ogeler.find(x=>x.id===id);
    if(!o) return '';
    return `<div style="display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;margin-bottom:6px;background:var(--nm-bg);">
      <span style="flex:1;font-size:13.5px;">${escapeHtml(o.ad)}</span>
      <button type="button" class="btn btn-ghost btn-sm" ${i===0?'disabled style="opacity:.3;"':''} onclick="_dkoAltTasi('${id}',-1)">⬆</button>
      <button type="button" class="btn btn-ghost btn-sm" ${i===secili.length-1?'disabled style="opacity:.3;"':''} onclick="_dkoAltTasi('${id}',1)">⬇</button>
      <button type="button" class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="_dkoAltKaldir('${id}')">✕</button>
    </div>`;
  }).join('') : '<p class="empty-state">Hiç öğe seçilmedi.</p>';

  const kalanlarHtml = kalanlar.length ? kalanlar.map(o=>`
    <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px dashed var(--border);border-radius:10px;margin-bottom:6px;">
      <span style="flex:1;font-size:13.5px;color:var(--ink-muted);">${escapeHtml(o.ad)}</span>
      <button type="button" class="btn btn-amber btn-sm" onclick="_dkoAltEkle('${o.id}')">+ Ekle</button>
    </div>`).join('') : '<p class="empty-state">Tüm öğeler zaten seçili.</p>';

  govde.innerHTML = `
    <div style="font-size:12px;color:var(--ink-muted);margin-bottom:10px;">En fazla <strong>${katalog.limit}</strong> öğe seçebilirsiniz.</div>
    <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;">✅ Seçili (${secili.length}/${katalog.limit})</div>
    <div style="max-height:220px;overflow-y:auto;margin-bottom:14px;">${seciliHtml}</div>
    <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;">➕ Eklenebilir</div>
    <div style="max-height:180px;overflow-y:auto;">${kalanlarHtml}</div>
  `;
}
function _dkoAltTasi(id, yon){
  const liste = window._dkoAltSeciliGecici;
  const i = liste.indexOf(id); const j = i+yon;
  if(i<0||j<0||j>=liste.length) return;
  [liste[i],liste[j]] = [liste[j],liste[i]];
  _dashboardAltModalIcerikYaz();
}
function _dkoAltKaldir(id){
  window._dkoAltSeciliGecici = window._dkoAltSeciliGecici.filter(x=>x!==id);
  _dashboardAltModalIcerikYaz();
}
function _dkoAltEkle(id){
  const katalog = DASHBOARD_ALT_KATALOG[window._dkoAltAnahtar];
  if(window._dkoAltSeciliGecici.length >= katalog.limit){
    toast(`En fazla ${katalog.limit} öğe seçebilirsiniz.`);
    return;
  }
  window._dkoAltSeciliGecici.push(id);
  _dashboardAltModalIcerikYaz();
}

/* ====================================================================
   YENİ WIDGET İÇERİKLERİ (Sınavlarım / Mesajlarım / Son Dökümanlar / Bekleyen Evrak)
   ==================================================================== */
function _dashboardYeniWidgetleriDoldur(){
  // ---- Sınavlarım ----
  const sinavKart = document.getElementById('sinavlarim');
  const sinavEl = document.getElementById('dashSinavlarim');
  if(sinavKart && sinavEl){
    const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
    if(ben && typeof sinavlar !== 'undefined'){
      const yaklasanlar = sinavlar.filter(s=>s.ogretmenId===ben.id && s.tarih>=todayISO()).sort((a,b)=>a.tarih.localeCompare(b.tarih)).slice(0,4);
      sinavKart.style.display = yaklasanlar.length ? '' : 'none';
      sinavEl.innerHTML = yaklasanlar.map(s=>`<div class="dash-row"><span class="badge badge-blue">${formatTarih(s.tarih)}</span> ${escapeHtml(s.sinif||'')} — ${escapeHtml(s.ders||'')}</div>`).join('') || '<p class="empty-state">Yaklaşan sınavınız yok.</p>';
    } else { sinavKart.style.display = 'none'; }
  }

  // ---- Mesajlarım ----
  const mesajKart = document.getElementById('mesajlarim');
  const mesajEl = document.getElementById('dashMesajlarim');
  if(mesajKart && mesajEl){
    if(typeof konusmalar !== 'undefined' && typeof MesajlasmaService !== 'undefined'){
      const ben = typeof AKTIF_KULLANICI!=='undefined' && AKTIF_KULLANICI ? AKTIF_KULLANICI.uid : null;
      const okunmamislar = konusmalar.filter(k=>k.okunmayanlar && k.okunmayanlar[ben] > 0)
        .sort((a,b)=>(b.guncellenmeTarihi||'').localeCompare(a.guncellenmeTarihi||'')).slice(0,4);
      mesajKart.style.display = okunmamislar.length ? '' : 'none';
      mesajEl.innerHTML = okunmamislar.map(k=>{
        const baslik = k.grupMu ? (k.grupAdi||'Grup') : Object.entries(k.katilimciAdlari||{}).find(([uid])=>uid!==ben)?.[1] || 'Kullanıcı';
        return `<div class="dash-row">💬 <strong>${escapeHtml(baslik)}</strong> — ${escapeHtml((k.sonMesaj?.metin||'').slice(0,40))}</div>`;
      }).join('') || '<p class="empty-state">Okunmamış mesajınız yok.</p>';
    } else { mesajKart.style.display = 'none'; }
  }

  // ---- Son Eklenen Dökümanlar ----
  const dokKart = document.getElementById('sonDokumanlar');
  const dokEl = document.getElementById('dashSonDokumanlar');
  if(dokKart && dokEl){
    if(typeof dokumanlarListesi !== 'undefined' && dokumanlarListesi.length){
      const sonlar = [...dokumanlarListesi].slice(0,4);
      dokKart.style.display = '';
      dokEl.innerHTML = sonlar.map(d=>`<div class="dash-row">📁 ${escapeHtml(d.ad||d.dosyaAdi||'Belge')}</div>`).join('');
    } else { dokKart.style.display = 'none'; }
  }

  // ---- Bekleyen Evrak ----
  const evrakKart = document.getElementById('bekleyenEvrak');
  const evrakEl = document.getElementById('dashBekleyenEvrak');
  if(evrakKart && evrakEl){
    if(typeof evrakTakibi !== 'undefined'){
      const bekleyen = evrakTakibi.filter(e=>e.durum!=='Tamamlandı' && e.durum!=='Arşivlendi').slice(0,4);
      evrakKart.style.display = bekleyen.length ? '' : 'none';
      evrakEl.innerHTML = bekleyen.map(e=>`<div class="dash-row">📄 ${escapeHtml(e.evrakAdi||'Evrak')} <span class="badge badge-${typeof evrakRengi==='function' ? evrakRengi(e.durum) : 'amber'}">${escapeHtml(e.durum||'')}</span></div>`).join('') || '<p class="empty-state">Bekleyen evrak yok.</p>';
    } else { evrakKart.style.display = 'none'; }
  }
}
