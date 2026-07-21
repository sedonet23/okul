/* =====================================================================
   js/alt-navigasyon.js
   YENİ GEZİNME SİSTEMİ — sidebar'ın yerini alan tek yüzey menü.

   İçerik:
     1) 8 grup + alt öğeler kataloğu (gerçek sekmeAc/araç bağlantılarıyla)
     2) Menü ızgarası (1. katman) + alt liste (2. katman) — DOM'a bu
        dosya tarafından enjekte edilir (index.html'de sadece boş
        konteynerler var, bkz. #altNavKatmanlar)
     3) Profilim sayfası — AKTIF_KULLANICI + ogretmenler eşleşmesinden
        gerçek isim/branş/telefon/e-posta/foto okur
     4) Geri tuşu desteği — history.pushState/popstate KULLANMIYOR (bu,
        uygulamanın kendi native geri tuşu sistemiyle çakışıp "çıkmak
        için tekrar basın" uyarısını yanlış tetikliyordu). Bunun yerine
        AltNav.geriTusu(), js/app.js > geriTusuIsle() içinden çağrılır —
        hem native Android hem web geri tuşu/gesture'ı böylece aynı,
        tek doğru mekanizmadan geçer.

   Tema: yeni CSS token'ı YOK — var(--nm-bg), var(--brand), var(--ink) vb.
   mevcut [data-theme] sistemini kullanıyor, otomatik açık/koyu uyumlu.
   ===================================================================== */
(function(){
  'use strict';

  /* ---- Yeniden kullanılabilir ikon parçaları (stroke=currentColor) ---- */
  const I = {
    ogretmen: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    ogrenci: '<path d="M2 8 12 3l10 5-10 5-10-5Z"/><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"/>',
    sinif: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 21v-4h6v4"/><path d="M8 7h1M8 11h1M15 7h1M15 11h1"/>',
    liste: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1.5 1.5L7 5"/><path d="m3 12 1.5 1.5L7 11"/><path d="m3 18 1.5 1.5L7 17"/>',
    yazili: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3"/><path d="m9 13 2 2 4-4"/>',
    deneme: '<path d="M9 2v6L4 20a1 1 0 0 0 .9 1.4h14.2A1 1 0 0 0 20 20l-5-12V2"/><path d="M9 2h6"/><path d="M7 15h10"/>',
    puan: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/>',
    olcek: '<path d="m16 3 5 5-13 13-5-5Z"/><path d="m14.5 4.5 1 1M11.5 7.5l1 1M8.5 10.5l1 1M5.5 13.5l1 1"/>',
    mesaj: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    haber: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
    duyuru: '<path d="m3 11 18-5v12L3 13v-2Z"/><path d="M7 13v5a2 2 0 0 0 2 2h1v-6"/>',
    anket: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3"/><path d="M9 9h6M9 13h6M9 17h3"/>',
    takvim: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M3 10h18M8 2v4M16 2v4"/>',
    not: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>',
    otobus: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="7.5" cy="18.5" r="1.6"/><circle cx="16.5" cy="18.5" r="1.6"/><path d="M3 12h18"/>',
    harita: '<path d="M9 3 3 5.5v15L9 18l6 2.5 6-2.5v-15L15 5.5 9 3Z"/><path d="M9 3v15M15 5.5v15"/>',
    klasor: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
    evrak: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>',
    mevzuat: '<path d="M12 6.5C10.5 5 8 4 5 4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1c3 0 5.5 1 7 2.5 1.5-1.5 4-2.5 7-2.5a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1c-3 0-5.5 1-7 2.5Z"/><path d="M12 6.5V21"/>',
    rapor: '<path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12" y="9" width="3" height="9"/><rect x="17" y="6" width="3" height="12"/>',
    odul: '<circle cx="12" cy="8" r="6"/><path d="m9 13.5-2 7 5-3 5 3-2-7"/>',
    kalkan: '<path d="M12 3 4 6v6c0 5 3.5 8.5 8 9.5 4.5-1 8-4.5 8-9.5V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
    kalp: '<path d="M12 20.5s-7.5-4.6-9.5-9.4C1 7.5 3 4 6.5 4c2 0 3.5 1.3 4.5 2.8C12 5.3 13.5 4 15.5 4 19 4 21 7.5 19.5 11.1c-2 4.8-9.5 9.4-9.5 9.4Z"/>',
    pusula: '<circle cx="12" cy="12" r="9"/><path d="m14.5 9.5-1.7 5-5 1.7 1.7-5z"/>',
    pano: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3"/>',
    dosya: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    gorevli: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 2.9-6.8 6.5-6.8"/><circle cx="17.5" cy="16.5" r="2.8"/>',
    banka: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 6v.01M18 18v.01"/>',
    imza: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h5"/><path d="M14 2v6h6"/><path d="m17 14 3 3-6.5 6.5H10v-3.5L16.5 13Z"/>',
    damga: '<path d="M12 3v6"/><rect x="7" y="9" width="10" height="5" rx="1"/><path d="M5 21h14M6 21c0-3 1-5 6-5s6 2 6 5"/>',
    saat: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tarama: '<path d="M4 7V5a2 2 0 0 1 2-2h2M16 3h2a2 2 0 0 1 2 2v2M20 17v2a2 2 0 0 1-2 2h-2M8 21H6a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/>',
    ayarlar: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    bina: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 21v-4h6v4"/><path d="M8 7h1M8 11h1M8 15h1M15 7h1M15 11h1M15 15h1"/>',
    veritabani: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    telefon: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.8 2Z"/>',
    eposta: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>',
    cikis: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    kapa: '<path d="M18 6 6 18M6 6l12 12"/>',
    geri: '<path d="m15 18-6-6 6-6"/>',
    ok: '<path d="m9 6 6 6-6 6"/>',
  };
  const ikonSvg = (key, sz) => `<svg viewBox="0 0 24 24" width="${sz||16}" height="${sz||16}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[key]||''}</svg>`;

  /* ---- Araç fonksiyonu güvenli çağırıcı (yüklenmemişse sessizce uyarır) ---- */
  function cagir(nesneAdi, metod, ...args){
    return function(){
      const n = window[nesneAdi];
      if(n && typeof n[metod] === 'function') n[metod](...args);
      else alert(nesneAdi + ' yüklenemedi.');
    };
  }
  function git(tab, sonra){
    return function(){
      sekmeAc(tab);
      if(typeof sonra === 'function') sonra();
    };
  }

  /* ---- 8 grup kataloğu — gerçek modül/aksiyon bağlantılarıyla ---- */
  const GRUPLAR = [
    { ad:'Öğretmen & Öğrenciler', renk:'#0A9E82', ikon:I.ogretmen, ogeler:[
      {ad:'Öğretmenler', ikon:'ogretmen', modul:'ogretmenler', aksiyon:git('ogretmenler')},
      {ad:'Öğrenciler', ikon:'ogrenci', modul:'ogrenciler', aksiyon:git('ogrenciler')},
      {ad:'Sınıflar', ikon:'sinif', modul:'siniflar', aksiyon:git('siniflar')},
      {ad:'Öğrenci Listesi Oluşturucu', ikon:'liste', modul:null, aksiyon:function(){ sekmeAc('ogretmenListe'); if(typeof ogretmenListeSekmesiAc==='function') ogretmenListeSekmesiAc(); }},
      {ad:'Ödev Takip Çizelgesi', ikon:'liste', modul:'odevTakip', aksiyon:git('odevTakip', function(){ if(typeof renderOncListesi==='function') renderOncListesi('odevTakip'); })},
      {ad:'Not Çizelgesi', ikon:'liste', modul:'notCizelgesi', aksiyon:git('notCizelgesi', function(){ if(typeof renderOncListesi==='function') renderOncListesi('notCizelgesi'); })},
    ]},
    { ad:'Sınavlar ve Not İşlemleri', renk:'#1F6FD1', ikon:I.yazili, ogeler:[
      {ad:'Yazılı Sınavlar', ikon:'yazili', modul:'sinavIslemleri', aksiyon:git('yaziliSinavlar')},
      {ad:'Deneme Sınavları', ikon:'deneme', modul:'sinavIslemleri', aksiyon:git('denemeSinavlari')},
      {ad:'Ders Et. Kat. Puan Dağıtımı', ikon:'puan', modul:'sinavIslemleri', aksiyon:cagir('KriterDagitimAraci','ac')},
      {ad:'Proje Değerlendirme Ölçeği', ikon:'olcek', modul:'sinavIslemleri', aksiyon:cagir('ProjeDegerlendirmeAraci','ac')},
      {ad:'Optik Okuma (OMR)', ikon:'tarama', modul:'optikOkuma', aksiyon:cagir('OptikSistemi','ac')},
    ]},
    { ad:'İletişim & Haberler', renk:'#EE5A45', ikon:I.mesaj, ogeler:[
      {ad:'Mesajlaşma', ikon:'mesaj', modul:'mesajlasma', aksiyon:git('mesajlasma')},
      {ad:'Haberler', ikon:'haber', modul:'haberler', aksiyon:git('haberler')},
      {ad:'Duyurular', ikon:'duyuru', modul:'duyurular', aksiyon:git('duyurular')},
      {ad:'Anketler', ikon:'anket', modul:'anket', aksiyon:git('anket')},
    ]},
    { ad:'Programlar', renk:'#0EA766', ikon:I.takvim, ogeler:[
      {ad:'Ders Programı', ikon:'yazili', modul:'dersProgrami', aksiyon:git('dersProgrami')},
      {ad:'Nöbet Programı', ikon:'kalkan', modul:'nobet', aksiyon:git('nobet')},
    ]},
    { ad:'Takvim & Notlar', renk:'#1F9FD1', ikon:I.takvim, ogeler:[
      {ad:'Takvim', ikon:'takvim', modul:'takvim', aksiyon:git('takvim')},
      {ad:'Notlar', ikon:'not', modul:'notlar', aksiyon:git('notlar')},
    ]},
    { ad:'Taşıma', renk:'#7C52D6', ikon:I.otobus, ogeler:[
      {ad:'Taşıma İşlemleri', ikon:'otobus', modul:'tasima', aksiyon:git('tasima')},
      {ad:'Harita', ikon:'harita', modul:'harita', aksiyon:function(){ if(typeof haritaSekmesiAc==='function') haritaSekmesiAc(); else sekmeAc('harita'); }},
    ]},
    { ad:'Döküman & Evraklar', renk:'#F2A03D', ikon:I.klasor, ogeler:[
      {ad:'Dökümanlar', ikon:'klasor', modul:'dokumanlar', aksiyon:git('dokumanlar')},
      {ad:'Evrak Takibi', ikon:'evrak', modul:'evrak', aksiyon:git('evrak')},
      {ad:'Mevzuat', ikon:'mevzuat', modul:'mevzuat', aksiyon:git('mevzuat')},
      {ad:'Aylık İşler', ikon:'saat', modul:'periyodikIsler', aksiyon:git('periyodikIsler')},
    ], altGrup:{ ad:'Raporlar', ikon:'rapor', ogeler:[
      {ad:'Maarif Model', ikon:'odul', modul:'maarifRapor', aksiyon:git('maarifRapor')},
      {ad:'Belirli Gün ve Haftalar', ikon:'takvim', modul:'belirliGunler', aksiyon:git('belirliGunler')},
      {ad:'ŞÖK', ikon:'kalkan', modul:'sok', aksiyon:git('sok')},
      {ad:'Zümre', ikon:'ogretmen', modul:'zumre', aksiyon:git('zumre')},
      {ad:'Sosyal Kulüpler', ikon:'kalp', modul:'sosyalKulupler', aksiyon:git('sosyalKulupler')},
      {ad:'Rehberlik', ikon:'pusula', modul:'rehberlik', aksiyon:git('rehberlik')},
      {ad:'Yıllık Planlar & BEP Planları', ikon:'pano', modul:'bepPlani', aksiyon:git('bepPlani')},
      {ad:'Diğer Evraklar', ikon:'dosya', modul:'digerEvrak', aksiyon:git('digerEvrak')},
    ]}},
    { ad:'Personel İşleri', renk:'#B5651D', ikon:I.gorevli, ogeler:[
      {ad:'Personeller', ikon:'gorevli', modul:'personel', aksiyon:git('personel')},
      {ad:'Maaş Değişikliği', ikon:'banka', modul:'personel', aksiyon:cagir('MaasDegisiklikFormu','ac')},
      {ad:'Tebliğ-Tebellüğ İmza Sirküsü', ikon:'damga', modul:'personel', aksiyon:cagir('TebligTebellugSirkusu','ac')},
      {ad:'Puantaj & İmza Sirküsü', ikon:'saat', modul:'personel', aksiyon:cagir('PuantajSistemi','ac')},
      {ad:'Dilekçe & İzinler', ikon:'imza', modul:'personel', aksiyon:cagir('DilekceSistemi','ac')},
    ], altGrup:{ ad:'Diploma İşlemleri', ikon:'imza', ogeler:[
      {ad:'Diploma Kayıt Talep Dilekçesi', ikon:'imza', modul:'personel', aksiyon:cagir('DilekceSistemi','acDiploma')},
      {ad:'Diploma Okul Dilekçesi', ikon:'imza', modul:'personel', aksiyon:cagir('DilekceSistemi','acDiplomaCevap')},
    ]}},
    { ad:'Ayarlar', renk:'#4E5A63', ikon:I.ayarlar, ogeler:[
      {ad:'Ayarlar', ikon:'ayarlar', modul:'ayarlar', aksiyon:git('ayarlar')},
      {ad:'Okul Bilgileri', ikon:'bina', modul:'okulBilgileri', aksiyon:git('okulBilgileri')},
      {ad:'Veriler', ikon:'veritabani', modul:'veri', aksiyon:git('veri')},
      {ad:'Kullanıcı İşlemleri', ikon:'kalkan', modul:'kullaniciYonetimi', aksiyon:git('kullaniciYonetimi')},
      {ad:'Kullanıcı İstatistikleri', ikon:'liste', modul:'kullaniciYonetimi', aksiyon:git('istatistikler', function(){ if(typeof renderIstatistikler==='function') renderIstatistikler(); })},
    ]},
  ];

  function ogeGorulebilir(o){
    if(!o.modul) return true;
    return (typeof gorebilir !== 'function') || gorebilir(o.modul);
  }

  /* ---- DOM iskeleti — index.html'deki boş konteynere enjekte edilir ---- */
  function iskeletOlustur(){
    const kok = document.getElementById('altNavKatmanlar');
    if(!kok) return;
    kok.innerHTML = `
      <div class="an-grid-katman" id="anGridKatman">
        <div class="an-panel-baslik">
          <h2>Menü</h2>
          <button class="an-kapat-btn" id="anGridKapat">${ikonSvg('kapa',16)}</button>
        </div>
        <div class="an-kart-grid" id="anKartGrid"></div>
      </div>

      <div class="an-liste-katman" id="anListeKatman">
        <div class="an-liste-baslik" id="anListeBaslik">
          <button class="an-geri-btn" id="anListeGeri">${ikonSvg('geri',16)}</button>
          <h2 id="anListeBaslikMetin">Grup</h2>
        </div>
        <div class="an-liste-govde" id="anListeGovde"></div>
      </div>

      <div class="an-profil-katman" id="anProfilKatman">
        <div class="an-profil-ust" id="anProfilUst">
          <button class="an-geri-btn an-profil-geri" id="anProfilGeri">${ikonSvg('geri',16)}</button>
          <button class="an-profil-kapak-btn" id="anProfilKapakBtn" title="Kapak temasını değiştir">🎨</button>
          <div class="an-profil-avatar" id="anProfilAvatar">${ikonSvg('ogretmen',34)}</div>
          <h2 id="anProfilAd">—</h2>
          <p id="anProfilBrans">—</p>
          <div class="an-profil-iletisim">
            <div class="an-pi-satir">${ikonSvg('telefon',13)}<span id="anProfilTelefon">—</span></div>
            <div class="an-pi-satir">${ikonSvg('eposta',13)}<span id="anProfilEposta">—</span></div>
          </div>
        </div>
        <div class="an-profil-govde">
          <div class="an-profil-grup-baslik">Çizelgelerim</div>
          <div class="an-profil-grup" id="anCizelgelerim"></div>
          <button class="an-cikis-btn" id="anCikisBtn">${ikonSvg('cikis',18)} Oturumu Kapat</button>
        </div>
      </div>
    `;

    gridDoldur();

    document.getElementById('anGridKapat').addEventListener('click', ()=> AltNav.kapat());
    document.getElementById('anListeGeri').addEventListener('click', ()=> AltNav.git('grid'));
    document.getElementById('anProfilGeri').addEventListener('click', ()=> AltNav.kapat());
    document.getElementById('anProfilKapakBtn').addEventListener('click', profilKapakSeciciAc);
    document.getElementById('anCikisBtn').addEventListener('click', async ()=>{
      const mesaj = 'Oturumu kapatmak istediğinize emin misiniz?';
      const onay = typeof uygulamaOnayAl === 'function' ? await uygulamaOnayAl(mesaj) : confirm(mesaj);
      if(!onay) return;
      if(typeof cikisYap === 'function') cikisYap();
      else if(typeof oturumKapat === 'function') oturumKapat();
      else alert('Çıkış fonksiyonu bulunamadı.');
    });
  }

  /* Grup kartlarını (yeniden) çizer — AKTIF_KULLANICI/rol verisi ilk
     çizimden SONRA (asenkron) netleştiğinde tekrar çağrılabilir olması
     için ayrı bir fonksiyon: bkz. AltNav.yenile() ve js/app.js
     uygulamaBaslat(). */
  function gridDoldur(){
    const kartGrid = document.getElementById('anKartGrid');
    if(!kartGrid) return;
    kartGrid.innerHTML = '';
    GRUPLAR.forEach((g,i)=>{
      const gorunurOgeler = g.ogeler.filter(ogeGorulebilir);
      const altGorunur = g.altGrup ? g.altGrup.ogeler.filter(ogeGorulebilir) : [];
      const toplam = gorunurOgeler.length + altGorunur.length;
      if(toplam === 0) return; // yetkisi olmayan kullanıcıya boş grup gösterilmez
      const btn = document.createElement('button');
      btn.className = 'an-grup-kart';
      btn.style.background = `linear-gradient(150deg, ${g.renk}, ${g.renk}cc)`;
      btn.innerHTML = `
        <span class="an-rozet">${toplam}</span>
        <span class="an-ikon-cember">${ikonSvg2(g.ikon,22)}</span>
        <span>${g.ad}</span>`;
      btn.addEventListener('click', ()=> AltNav.git('liste', i));
      kartGrid.appendChild(btn);
    });
  }
  function ikonSvg2(rawInner, sz){
    return `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${rawInner}</svg>`;
  }

  function satirHtml(o, renk){
    return `<button class="an-liste-ogesi" data-aksiyon="1">
      <span class="an-oge-ikon" style="background:${renk}22; color:${renk};">${ikonSvg(o.ikon,15)}</span>
      ${o.ad}
      <span class="an-oge-ok">${ikonSvg('ok',15)}</span>
    </button>`;
  }
  function listeIcerigiDoldur(g, i){
    document.getElementById('anListeBaslik').style.background = `linear-gradient(135deg, ${g.renk}, ${g.renk}cc)`;
    document.getElementById('anListeBaslikMetin').textContent = g.ad;
    const gorunurOgeler = g.ogeler.filter(ogeGorulebilir);
    let html = gorunurOgeler.map(o => satirHtml(o, g.renk)).join('');
    const govde = document.getElementById('anListeGovde');
    let tumOgeler = gorunurOgeler.slice();
    if(g.altGrup){
      const altGorunur = g.altGrup.ogeler.filter(ogeGorulebilir);
      if(altGorunur.length){
        html += `<div class="an-alt-grup-baslik">${ikonSvg(g.altGrup.ikon,13)} ${g.altGrup.ad}</div>`;
        html += `<div class="an-alt-grup-listesi">${altGorunur.map(o => satirHtml(o, g.renk)).join('')}</div>`;
        tumOgeler = tumOgeler.concat(altGorunur);
      }
    }
    govde.innerHTML = html;
    Array.from(govde.querySelectorAll('.an-liste-ogesi')).forEach((el, idx)=>{
      el.addEventListener('click', ()=>{
        // DÜZELTME: Eskiden burada 260ms'lik bir setTimeout gecikmesi vardı
        // (sadece kapanış animasyonunun bitmesini beklemek için — işlevsel
        // bir gereklilik değildi). Android WebView'de render/olay zamanlaması
        // web'den daha yavaş/tutarsız olabildiği için bu gecikme penceresi,
        // arada bir kaçık dokunuşun/durum değişikliğinin araya girip yanlış
        // ekranda kalınmasına sebep olabiliyordu. Artık hedefe hemen gidiliyor.
        AltNav.kapat();
        _donusEkrani = { ekran:'liste', grupIndex:i };
        tumOgeler[idx].aksiyon();
      });
    });
  }

  /* Sadece giriş yapan öğretmenin kendi eklediği/kendisine ait yazılı
     sınavlarını listeler — mevcut Sınav İşlemleri sayfasıyla aynı
     satır görünümünü (evrak-row/evrak-title/badge) kullanır. */
  function sinavlarimGoster(ogretmenId){
    if(typeof sinavlar === 'undefined' || typeof modalAc !== 'function'){
      alert('Sınav modülü yüklenemedi.'); return;
    }
    const kendi = sinavlar.filter(s => s.ogretmenId === ogretmenId).sort((a,b)=>(b.tarih||'').localeCompare(a.tarih||''));
    const gövde = kendi.length ? kendi.map(s => `
      <div class="evrak-row">
        <div class="evrak-body">
          <div class="evrak-title">${escapeHtml(s.ders||'Ders')} — ${escapeHtml(s.sinif||'')} <span class="badge badge-${typeof sinavTurRengi==='function'?sinavTurRengi(s.tur):'sage'}">${escapeHtml(s.tur||'Yazılı')}</span></div>
          <div class="evrak-meta">${formatTarih(s.tarih)}${s.dersSaati?' · '+escapeHtml(s.dersSaati)+'. ders':''}${s.senaryoNo?' · '+escapeHtml(s.senaryoNo)+'. Senaryo':''}${s.yayinevi?' ('+escapeHtml(s.yayinevi)+')':''}${s.notlar?' · '+escapeHtml(s.notlar):''}</div>
        </div>
      </div>`).join('') : '<div class="empty-state">Henüz eklediğiniz bir yazılı sınav yok.</div>';
    modalAc('📝 Sınavlarım', `<div class="evrak-liste">${gövde}</div>`, null, null);
    const kb = document.getElementById('modalKaydetBtn'); if(kb) kb.style.display = 'none';
  }

  /* Ders programı ve nöbet DIŞINDAKİ diğer görev/evrak durumunu — mevcut
     ogretmenRaporOlustur()'daki YAZDIRMA raporuyla aynı filtre mantığıyla
     ama normal (dokunma dostu) liste satırları olarak gösterir. Boş
     kategoriler gizlenir. */
  function digerEvrakDurumuGoster(ogretmenId){
    if(typeof ogretmenler === 'undefined' || typeof adGeciyorMu !== 'function' || typeof modalAc !== 'function'){
      alert('Modül yüklenemedi.'); return;
    }
    const o = ogretmenler.find(x => x.id === ogretmenId);
    if(!o) return;
    const adSoyad = `${o.ad} ${o.soyad}`.trim();
    const cv = typeof cizelgeVerileri !== 'undefined' ? cizelgeVerileri : {};

    // Aynı sütun tanımları ogretmen-detay.js > ogretmenRaporOlustur()'daki
    // ile birebir aynı — "Belge Durumu" bölümünün ekran karşılığı.
    const AYLAR_RAPOR = ['Eyl','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'];
    const DONEM_RAPOR = ['1. Dönem','2. Dönem','Yıl Sonu'];
    const KULUP_RAPOR = ['Yıllık Plan','Toplum Hizm.','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz','Sene Sonu'];
    const REHB_RAPOR  = ['Yıllık Plan','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz','1.D.Sonu','Sene Sonu'];
    const BEP_RAPOR   = ['Yıllık Ders Planı','BEP Planı'];
    function kontrolDizisi(k, kolonlar){
      return Array.isArray(k.kontroller) ? k.kontroller : kolonlar.map((_,i)=> !!(k.durumlar && Object.values(k.durumlar)[i]));
    }

    const kategoriler = [
      { baslik:'Sosyal Kulüpler', ikon:'kalp', renk:'#D6528F', kolonlar:KULUP_RAPOR,
        kayitlar:(cv.sosyalKulupler||[]).filter(s => Array.isArray(s.ogretmenIdler) && s.ogretmenIdler.includes(ogretmenId)),
        adFn:k=>k.ad },
      { baslik:'Rehberlik', ikon:'pusula', renk:'#7C52D6', kolonlar:REHB_RAPOR,
        kayitlar:(cv.rehberlik||[]).filter(k => k.ogretmenId===ogretmenId || adGeciyorMu(k.danisman, adSoyad)),
        adFn:k=>k.ad },
      { baslik:'Zümre', ikon:'ogretmen', renk:'#1F6FD1', kolonlar:DONEM_RAPOR,
        kayitlar:(cv.zumre||[]).filter(k => k.ogretmenId===ogretmenId || adGeciyorMu(k.ad, adSoyad)),
        adFn:k=>k.ad || k.brans },
      { baslik:'ŞÖK', ikon:'kalkan', renk:'#EE5A45', kolonlar:DONEM_RAPOR,
        kayitlar:(cv.sok||[]).filter(k => k.ogretmenId===ogretmenId || adGeciyorMu(k.ad, adSoyad)),
        adFn:k=>k.ad },
      { baslik:'Maarif Model Raporları', ikon:'odul', renk:'#F2A03D', kolonlar:AYLAR_RAPOR,
        kayitlar:(cv.maarifRapor||[]).filter(k => k.ogretmenId===ogretmenId),
        adFn:k=>`${k.ders||'—'}${k.sinif?' · '+k.sinif:''}` },
      { baslik:'Belirli Gün ve Haftalar', ikon:'takvim', renk:'#1F9FD1', kolonlar:null,
        kayitlar:(typeof belirliGunlerListesi!=='undefined'?belirliGunlerListesi:[]).filter(e => (e.gorevliOgretmenler && e.gorevliOgretmenler.includes(ogretmenId)) || adGeciyorMu(e.gorevliOgretmen, adSoyad)),
        adFn:e=>`${e.baslik}${e.tarih?' · '+e.tarih:''}`,
        durumFn:e=> e.tamamlandi ? '✅ Tamamlandı' : '⏳ Bekliyor' },
      { baslik:'Yıllık Plan / BEP Planı', ikon:'pano', renk:'#0A9E82', kolonlar:BEP_RAPOR,
        kayitlar:(cv.bepPlani||[]).filter(k => k.ogretmenId===ogretmenId || adGeciyorMu(k.ad, adSoyad)),
        adFn:k=>k.ad },
      { baslik:'Diğer Evraklar', ikon:'dosya', renk:'#4E5A63', kolonlar:null,
        kayitlar:(typeof digerEvrakListesi!=='undefined'?digerEvrakListesi:[]).filter(e => (e.ogretmen||'').localeCompare(adSoyad,'tr',{sensitivity:'base'})===0),
        adFn:e=>`${e.evrakTuru}${e.sinif?' · '+e.sinif:''}${e.tarih?' · '+formatTarih(e.tarih):''}` },
    ].filter(k => k.kayitlar.length > 0);

    let html;
    if(!kategoriler.length){
      html = '<div class="empty-state">Ders programı ve nöbet dışında kayıtlı bir göreviniz/evrakınız görünmüyor.</div>';
    } else {
      // Not: bu liste sadece BU öğretmene ait kayıtları/tiklerini gösterir
      // (ogretmen-detay.js > ogretmenRaporOlustur ile aynı filtre mantığı) —
      // okulun tüm personelinin durumunu gösteren yönetici sayfalarına
      // (sekmeAc) HİÇ gitmiyor, salt kendi bilgin.
      html = kategoriler.map(k => `
        <div class="an-alt-grup-baslik" style="margin-top:14px;">${ikonSvg(k.ikon,13)} ${k.baslik}</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px;">
          ${k.kayitlar.map(kayit => {
            const kArr = k.kolonlar ? kontrolDizisi(kayit, k.kolonlar) : null;
            const tamamlanan = kArr ? kArr.filter(Boolean).length : null;
            const rozet = kArr ? `${tamamlanan}/${k.kolonlar.length}` : (k.durumFn ? k.durumFn(kayit) : '');
            const kulupMu = k.baslik === 'Sosyal Kulüpler';
            const ogrenciSayisi = kulupMu ? (typeof veliler!=='undefined'?veliler:[]).filter(v=>v.kulupId===kayit.id).length : 0;
            return `
              <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:12px 14px;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:${kArr?'8px':'0'};">
                  <span style="font-weight:700;font-size:13.5px;color:var(--ink);">${escapeHtml(k.adFn(kayit) || '—')}</span>
                  <span style="font-size:11px;font-weight:700;color:${k.renk};background:${k.renk}1a;padding:2px 9px;border-radius:20px;flex-shrink:0;">${escapeHtml(rozet)}</span>
                </div>
                ${kulupMu ? `
                <div style="display:flex;gap:8px;margin-bottom:${kArr?'8px':'0'};flex-wrap:wrap;">
                  <button class="btn btn-amber btn-sm" onclick="kulupOgrenciEkleAc('${kayit.id}')">➕ Öğrenci Ekle</button>
                  <button class="btn btn-ghost btn-sm" onclick="kulupOgrenciListesiYazdir('${kayit.id}')">👥 Öğrenciler (${ogrenciSayisi})</button>
                </div>` : ''}
                ${kArr ? `
                <div style="display:flex;flex-direction:column;gap:6px;">
                  ${k.kolonlar.map((etiket,i) => `
                    <div style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-soft);">
                      <span style="flex-shrink:0;">${kArr[i] ? '✅' : '⬜'}</span>
                      <span>${escapeHtml(etiket)}</span>
                    </div>`).join('')}
                </div>` : ''}
              </div>`;
          }).join('')}
        </div>`).join('');
      html += `<p style="margin-top:14px;font-size:11.5px;color:var(--ink-muted);font-style:italic;">Bu tikleri siz işaretleyemezsiniz — ilgili alan başka bir yetkili tarafından güncellenir.</p>`;
    }
    modalAc('📋 Diğer Görevlerim', html, null, null);
    const kb = document.getElementById('modalKaydetBtn'); if(kb) kb.style.display = 'none';
  }

/* Sadece haftalık ders programını gösterir (öğretmen detay panelinin
     TAMAMI değil) — Profilim > Ders Programım için. */
  function dersProgramimGoster(ogretmenId){
    if(typeof dersProgrami === 'undefined' || typeof modalAc !== 'function'){
      alert('Ders programı modülü yüklenemedi.'); return;
    }
    const GUNLER_TR = (typeof GUNLER !== 'undefined') ? GUNLER : ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];
    const dersler = dersProgrami.filter(d => d.ogretmenId === ogretmenId)
      .sort((a,b)=> GUNLER_TR.indexOf(a.gun) - GUNLER_TR.indexOf(b.gun) || a.saat - b.saat);
    let html;
    if(!dersler.length){
      html = '<div class="empty-state">Ders programınızda kayıt yok.</div>';
    } else {
      html = GUNLER_TR.map(gun=>{
        const gunDersleri = dersler.filter(d => d.gun === gun);
        if(!gunDersleri.length) return '';
        return `<div class="an-alt-grup-baslik" style="margin-top:12px;">${ikonSvg('takvim',13)} ${gun}</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;">
            ${gunDersleri.map(d => `
              <div class="an-liste-ogesi" style="cursor:default;">
                <span class="an-oge-ikon" style="background:#1F6FD122; color:#1F6FD1;">${d.saat}.</span>
                <span>${escapeHtml(d.sinif||'—')} — ${escapeHtml(d.ders||'—')}</span>
              </div>`).join('')}
          </div>`;
      }).join('');
    }
    modalAc('📚 Ders Programım', html, null, null);
    const kb = document.getElementById('modalKaydetBtn'); if(kb) kb.style.display = 'none';
  }

  /* Sadece BU AYIN nöbetlerini gösterir — Profilim > Nöbetlerim için. */
  function nobetlerimGoster(ogretmenId){
    if(typeof nobetAtamalari === 'undefined' || typeof modalAc !== 'function'){
      alert('Nöbet modülü yüklenemedi.'); return;
    }
    const simdi = new Date();
    const buAy = simdi.getMonth(), buYil = simdi.getFullYear();
    const nobetler = nobetAtamalari.filter(n=>{
      if(n.ogretmenId !== ogretmenId || !n.tarih) return false;
      const t = new Date(n.tarih);
      return t.getMonth() === buAy && t.getFullYear() === buYil;
    }).sort((a,b)=> (a.tarih||'').localeCompare(b.tarih||''));
    let html;
    if(!nobetler.length){
      html = '<div class="empty-state">Bu ay için nöbet atamanız yok.</div>';
    } else {
      html = `<div style="display:flex;flex-direction:column;gap:8px;">${nobetler.map(n=>{
        const yer = (typeof nobetYerleri !== 'undefined') ? nobetYerleri.find(y=>y.id===n.yerId) : null;
        const gunAdi = new Date(n.tarih).toLocaleDateString('tr-TR', { weekday:'long' });
        return `<div class="an-liste-ogesi" style="cursor:default;">
          <span class="an-oge-ikon" style="background:#EE5A4522; color:#EE5A45;">${ikonSvg('kalkan',15)}</span>
          <span>${formatTarih(n.tarih)} — ${escapeHtml(gunAdi)} · ${escapeHtml(yer ? yer.ad : '—')}</span>
        </div>`;
      }).join('')}</div>`;
    }
    modalAc('🛡️ Bu Ayki Nöbetlerim', html, null, null);
    const kb2 = document.getElementById('modalKaydetBtn'); if(kb2) kb2.style.display = 'none';
  }

  /* ---- Profil kapağı — özelleştirilebilir tema/desen ----
     Cihazda (localStorage) saklanır; kişisel görsel bir tercih olduğu
     için Firestore'a yazmaya gerek yok. */
  const PROFIL_KAPAK_TEMALARI = [
    {id:'varsayilan', ad:'Varsayılan',  css:'linear-gradient(150deg,var(--brand-dark),var(--brand))'},
    {id:'lacivert',   ad:'Lacivert',    css:'linear-gradient(150deg,#0F2A4A,#1E5C8F)'},
    {id:'gunbatimi',  ad:'Gün Batımı',  css:'linear-gradient(150deg,#7C2D12,#E0762C)'},
    {id:'mor',        ad:'Mor',         css:'linear-gradient(150deg,#3B1466,#8B4FD9)'},
    {id:'orman',      ad:'Orman',       css:'linear-gradient(150deg,#0D3B33,#1E9E7A)'},
    {id:'gece',       ad:'Gece',        css:'linear-gradient(150deg,#0B0F1A,#2A3550)'},
    {id:'gul',        ad:'Gül',         css:'linear-gradient(150deg,#7A1E3D,#D65B85)'},
  ];
  const PROFIL_KAPAK_DESENLERI = [
    {id:'duz',    ad:'Düz'},
    {id:'nokta',  ad:'Noktalı'},
    {id:'cizgi',  ad:'Çizgili'},
  ];
  function _profilKapakOku(){
    try{ return JSON.parse(localStorage.getItem('oy_profilKapak')||'null') || {tema:'varsayilan', desen:'duz'}; }
    catch(e){ return {tema:'varsayilan', desen:'duz'}; }
  }
  function _profilKapakYaz(ayar){
    try{ localStorage.setItem('oy_profilKapak', JSON.stringify(ayar)); }catch(e){}
  }
  function profilKapakUygula(){
    const ust = document.getElementById('anProfilUst');
    if(!ust) return;
    const ayar = _profilKapakOku();
    const tema = PROFIL_KAPAK_TEMALARI.find(t=>t.id===ayar.tema) || PROFIL_KAPAK_TEMALARI[0];
    ust.style.background = tema.css;
    PROFIL_KAPAK_DESENLERI.forEach(d => ust.classList.remove('an-kapak-desen-'+d.id));
    if(ayar.desen && ayar.desen !== 'duz') ust.classList.add('an-kapak-desen-'+ayar.desen);
  }
  function profilKapakSeciciAc(){
    const ayar = _profilKapakOku();
    const html = `
      <div class="an-alt-grup-baslik" style="margin-top:0;">Renk</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;">
        ${PROFIL_KAPAK_TEMALARI.map(t => `
          <button type="button" class="an-kapak-yuvarlak" data-tema="${t.id}" title="${escapeHtml(t.ad)}"
            style="width:42px;height:42px;border-radius:50%;background:${t.css};border:2.5px solid ${ayar.tema===t.id?'var(--brand)':'transparent'};cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.25);"></button>`).join('')}
      </div>
      <div class="an-alt-grup-baslik" style="margin-top:18px;">Desen</div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        ${PROFIL_KAPAK_DESENLERI.map(d => `
          <button type="button" class="an-kapak-desen-sec" data-desen="${d.id}"
            style="flex:1;padding:10px;border-radius:10px;border:1.5px solid ${ayar.desen===d.id?'var(--brand)':'var(--border)'};background:var(--bg-card);color:var(--ink);font-size:12.5px;font-weight:600;cursor:pointer;">${escapeHtml(d.ad)}</button>`).join('')}
      </div>`;
    modalAc('🎨 Profil Kapağı', html, null, null);
    const kb = document.getElementById('modalKaydetBtn'); if(kb) kb.style.display = 'none';
    document.querySelectorAll('.an-kapak-yuvarlak').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const yeni = _profilKapakOku(); yeni.tema = btn.dataset.tema;
        _profilKapakYaz(yeni); profilKapakUygula();
        if(typeof modalKapat === 'function') modalKapat();
      });
    });
    document.querySelectorAll('.an-kapak-desen-sec').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const yeni = _profilKapakOku(); yeni.desen = btn.dataset.desen;
        _profilKapakYaz(yeni); profilKapakUygula();
        if(typeof modalKapat === 'function') modalKapat();
      });
    });
  }

  /* ---- Profilim içeriği — gerçek AKTIF_KULLANICI verisinden ---- */
  function profilDoldur(){
    profilKapakUygula();
    const ad = (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? (AKTIF_KULLANICI.ad || AKTIF_KULLANICI.kullaniciAdi || 'Kullanıcı') : 'Kullanıcı';
    document.getElementById('anProfilAd').textContent = ad;

    const bagliId = (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.bagliOgretmenId : null;
    let ogretmenKaydi = null;
    if(bagliId && typeof ogretmenler !== 'undefined'){
      ogretmenKaydi = ogretmenler.find(o => o.id === bagliId) || null;
    }
    document.getElementById('anProfilBrans').textContent = ogretmenKaydi ? (ogretmenKaydi.brans || 'Öğretmen') : 'Yönetici';
    document.getElementById('anProfilTelefon').textContent = (ogretmenKaydi && ogretmenKaydi.telefon) || 'Kayıtlı değil';
    document.getElementById('anProfilEposta').textContent = (ogretmenKaydi && ogretmenKaydi.eposta) || (AKTIF_KULLANICI && AKTIF_KULLANICI.kullaniciAdi) || '—';

    // Fotoğraf: uygulamanın kendi çözümleme mantığıyla aynı öncelik sırası
    // (bkz. js/kullanici-yonetimi.js > _kullaniciGoruntulenecekFoto) —
    // önce öğretmen kaydındaki profilFotoUrl, yoksa hesap fotoUrl'i.
    const avatarKutu = document.getElementById('anProfilAvatar');
    let fotoSrc = null;
    if(typeof _kullaniciGoruntulenecekFoto === 'function' && typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI){
      const f = _kullaniciGoruntulenecekFoto(AKTIF_KULLANICI);
      if(f && f !== 'assets/icon-192.png') fotoSrc = f;
    } else if(ogretmenKaydi && ogretmenKaydi.profilFotoUrl){
      fotoSrc = ogretmenKaydi.profilFotoUrl;
    }
    avatarKutu.innerHTML = fotoSrc
      ? `<img src="${fotoSrc}" alt="${ad}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
      : ikonSvg('ogretmen', 34);

    // Genel okul istatistikleri (Personel/Öğrenci/Sınıf) kişisel profilde
    // anlamsız/yanıltıcıydı — kaldırıldı.

    const cizelgelerim = [];
    if(bagliId){
      cizelgelerim.push(
        {ad:'Ders Programım', ikon:'yazili', renk:'#1F6FD1', aksiyon:()=> dersProgramimGoster(bagliId)},
        {ad:'Nöbetlerim', ikon:'kalkan', renk:'#EE5A45', aksiyon:()=> nobetlerimGoster(bagliId)},
        {ad:'Sınavlarım', ikon:'olcek', renk:'#0A9E82', aksiyon:()=> sinavlarimGoster(bagliId)},
        {ad:'Diğer Görevlerim (Kulüp, ŞÖK, Zümre, Maarif...)', ikon:'rapor', renk:'#7C52D6', aksiyon:()=> digerEvrakDurumuGoster(bagliId)},
        {ad:'Profil Raporumu Yazdır', ikon:'dosya', renk:'#4E5A63', aksiyon:()=> ogretmenRaporOlustur(bagliId)},
      );
    }
    const cEl = document.getElementById('anCizelgelerim');
    cEl.innerHTML = cizelgelerim.map(o => `
      <button class="an-profil-satir" data-aksiyon="1">
        <span class="an-oge-ikon-flat" style="color:${o.renk};">${ikonSvg(o.ikon,18)}</span>
        <span>${o.ad}</span>
        <span class="an-oge-ok">${ikonSvg('ok',15)}</span>
      </button>`).join('') || '<div style="padding:16px;color:var(--ink-muted);font-size:13px;">Bağlı bir öğretmen kaydı bulunamadı.</div>';
    Array.from(cEl.querySelectorAll('.an-profil-satir')).forEach((el, idx)=>{
      el.addEventListener('click', ()=>{
        // DÜZELTME: Bu satırların hepsi bir modal açıyor (sekmeAc değil),
        // ve modal zaten Profilim'in ÜSTÜNDE görünecek şekilde (daha
        // yüksek z-index) tasarlı — önce Profilim'i kapatmak sadece
        // altındaki Ana Sayfa'nın bir an görünüp modalın onun üstünde
        // açılmasına sebep oluyordu. Artık Profilim açık kalıyor.
        cizelgelerim[idx].aksiyon();
      });
    });
  }

  /* ---- Görünüm durumu — dahili değişkenle, TARAYICI HISTORY API'Sİ
     KULLANILMADAN. İlk sürümde history.pushState/popstate kullanılmıştı
     ama uygulamanın kendi native geri tuşu sistemiyle (geriTusuIsle() +
     app.js'teki tek-tamponlu web popstate taklidi) çakışıp "çıkmak için
     tekrar basın" uyarısını yanlış tetikliyordu. Artık bu panel sadece
     kendi JS durumunu tutuyor; geri tuşu entegrasyonu AltNav.geriTusu()
     üzerinden geriTusuIsle()'a bağlanıyor (bkz. js/app.js). ---- */
  let _ekran = 'ana'; // 'ana' | 'grid' | 'liste' | 'profil'
  let _acikGrupIndex = null;
  let _donusEkrani = null; // {ekran, grupIndex} — menüden bir hedefe geçildiğinde
                            // geri tuşuyla dönülecek nokta (tek kullanımlık hafıza)

  function ekranUygula(){
    const grid = document.getElementById('anGridKatman');
    const liste = document.getElementById('anListeKatman');
    const profil = document.getElementById('anProfilKatman');
    const menuBtn = document.getElementById('bnMenuBtn');
    if(!grid) return;
    grid.classList.toggle('acik', _ekran === 'grid' || _ekran === 'liste');
    if(menuBtn) menuBtn.classList.toggle('an-menu-acik', _ekran === 'grid' || _ekran === 'liste');
    liste.classList.toggle('acik', _ekran === 'liste');
    profil.classList.toggle('acik', _ekran === 'profil');
    if(_ekran === 'liste' && typeof _acikGrupIndex === 'number'){
      listeIcerigiDoldur(GRUPLAR[_acikGrupIndex], _acikGrupIndex);
    }
    if(_ekran === 'profil') profilDoldur();
    // Menü katmanlarından biri açıkken "aşağı çekince yenile" jesti kapatılır —
    // aksi halde grid/liste/profil panelini yukarıdan aşağı kaydırmaya çalışırken
    // native sayfa yenileme jesti araya giriyordu (bkz. js/app.js _pullToRefreshAyarla).
    if(typeof _pullToRefreshAyarla === 'function'){
      _pullToRefreshAyarla(_ekran === 'ana');
    }
  }

  // DÜZELTME (z-index): öğretmen/servis/sınıf detay paneli (#detayOverlay,
  // z-index:9650) veya bir modal (#modalOverlay, z-index:9700) açıkken alt
  // navigasyon butonlarına (Ana Sayfa/Arama/Profilim/Menü) basılınca, geri
  // tuşunda zaten yapılan "önce üstteki paneli kapat" davranışı burada
  // YOKTU — yeni ekran, açık kalan panelin ALTINDA (daha düşük z-index'te)
  // render oluyor ve "sayfa arkada açılıyor" gibi görünüyordu.
  function _ustPanelleriKapat(){
    const mo = document.getElementById('modalOverlay');
    if(mo && mo.classList.contains('active') && typeof modalKapat === 'function') modalKapat();
    const deo = document.getElementById('detayOverlay');
    if(deo && deo.classList.contains('active') && typeof detayPanelKapat === 'function') detayPanelKapat();
  }

  const AltNav = {
    _kuruldu:false,
    kur(){
      if(this._kuruldu) return;
      iskeletOlustur();
      this._kuruldu = true;
    },
    git(ekran, grupIndex){
      this.kur();
      _ustPanelleriKapat();
      _ekran = ekran;
      if(typeof grupIndex === 'number') _acikGrupIndex = grupIndex;
      ekranUygula();
    },
    kapat(){
      _ustPanelleriKapat();
      _ekran = 'ana';
      _donusEkrani = null;
      ekranUygula();
    },
    menuTikla(){
      this.kur();
      _ustPanelleriKapat();
      if(_ekran === 'grid' || _ekran === 'liste'){ this.kapat(); return; }
      _donusEkrani = null; // yeni bir menü oturumu — eski "dönüş noktası" geçersiz
      this.git('grid');
    },
    profilAc(){
      _ustPanelleriKapat();
      _donusEkrani = null;
      this.git('profil');
    },
    /* geriTusuIsle() (js/app.js) tarafından — hem native Android hem web
       geri tuşu emülasyonu için — çağrılır. Açık bir panel varsa bir
       kademe geri gider (liste→grid, grid/profil→ana); panel kapalıysa
       ama menüden bir sekmeye YENİ geçilmişse (bkz. _donusEkrani) o
       menü ekranını geri getirir — aksi halde uygulamanın kendi sekme
       geçmişi/çift-basışla-çık mantığına devam etmesi için false döner. */
    geriTusu(){
      if(_ekran === 'liste'){ this.git('grid'); return true; }
      if(_ekran === 'grid' || _ekran === 'profil'){ this.kapat(); return true; }
      if(_ekran === 'ana' && _donusEkrani){
        const hedef = _donusEkrani; _donusEkrani = null;
        this.git(hedef.ekran, hedef.grupIndex);
        return true;
      }
      return false;
    },
    yenile(){
      if(!this._kuruldu) return;
      gridDoldur();
    },
    hizliNotAc(){
      _ustPanelleriKapat();
      if(typeof notlarModalAc !== 'function'){ alert('Not modülü yüklenemedi.'); return; }
      notlarModalAc();
      // notlar.js'in kendi modalını değiştirmeden, içine plandaki
      // "Notlarım'a Git" kısayolunu ekliyoruz (bkz. önceki önizlemeler).
      setTimeout(()=>{
        const govde = document.getElementById('modalBody');
        if(!govde || govde.querySelector('.an-notlara-git-btn')) return;
        const ayrac = document.createElement('div');
        ayrac.style.cssText = 'height:1px;background:var(--border);margin:14px 0;';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'an-notlara-git-btn';
        btn.style.cssText = 'width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:14px;font-family:inherit;font-size:14px;font-weight:600;color:var(--ink);cursor:pointer;';
        btn.innerHTML = `${ikonSvg('not',20)}<span>Notlarım'a Git</span><span style="margin-left:auto;color:var(--ink-muted);display:flex;">${ikonSvg('ok',16)}</span>`;
        btn.addEventListener('click', ()=>{
          if(typeof modalKapat==='function') modalKapat();
          // DÜZELTME: "Hızlı Not" butonu genelde an-liste-katman/an-grid-katman
          // paneli (z-index:9500) açıkken tıklanıyor. sekmeAc() bu paneli
          // kapatmadığından, Notlar sekmesi panelin ALTINDA açılıp görünmüyordu
          // — kullanıcı menüyü elle kapatana kadar fark etmiyordu.
          AltNav.kapat();
          sekmeAc('notlar');
        });
        govde.appendChild(ayrac);
        govde.appendChild(btn);
      }, 0);
    },
  };
  window.AltNav = AltNav;

  document.addEventListener('DOMContentLoaded', ()=> AltNav.kur());
})();
