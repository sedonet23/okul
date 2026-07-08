/**
 * widget-bridge.js
 * Uygulamada Firestore verisi yüklenince widget'ı günceller.
 * index.html'de app.js'den SONRA yüklenmeli.
 */

function _kapasitorVarMi() {
  try {
    return typeof window !== 'undefined' &&
           typeof window.Capacitor !== 'undefined' &&
           window.Capacitor.isNativePlatform();
  } catch(e){ return false; }
}

function _widgetPlugin() {
  if (!_kapasitorVarMi()) return null;
  // Capacitor 6: window.Capacitor.Plugins veya registerPlugin ile erişim
  if (window.Capacitor?.Plugins?.WidgetPlugin) {
    return window.Capacitor.Plugins.WidgetPlugin;
  }
  // registerPlugin ile kaydet (henüz kayıtlı değilse)
  try {
    const p = window.Capacitor.registerPlugin('WidgetPlugin');
    if (p) return p;
  } catch(e) {}
  return null;
}

function _bugunGunAdi() {
  const gunler = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  return gunler[new Date().getDay()];
}

function _bugunTarihStr() {
  return new Date().toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric', weekday: 'short'
  });
}

/**
 * Ana ekran widget'ının 4 sayfasını (Etkinlikler / Notlarım / Nöbetçiler / Haberler)
 * ve saat/hava kartını besler. bkz. OkulWidget.java / OkulWidgetStackService.java
 */
async function widgetGuncelle() {
  if (!_kapasitorVarMi()) return;

  const plugin = _widgetPlugin();
  if (!plugin) {
    console.warn('[Widget] WidgetPlugin bulunamadı');
    return;
  }

  try {
    const bugunGun = _bugunGunAdi();
    const bugunISO = new Date().toISOString().slice(0, 10);

    const tatilModu = !!(typeof dersSaatleriAyarlari !== 'undefined' &&
                         dersSaatleriAyarlari && dersSaatleriAyarlari.tatilModu);
    const tatilNotu = tatilModu
      ? (typeof tatilModuNotuOlustur === 'function' ? tatilModuNotuOlustur(dersSaatleriAyarlari) : null) || 'Okul tatilde'
      : null;

    // --- Sayfa 1: Etkinlikler (bugünün ders programı) ---
    let etkinlikler = [];
    if (tatilModu) {
      etkinlikler = [{ emoji: '🏖️', saat: '', baslik: tatilNotu }];
    } else {
      const _dersProgrami = (typeof dersProgrami !== 'undefined') ? dersProgrami : [];
      etkinlikler = _dersProgrami
        .filter(d => d.gun === bugunGun)
        .sort((a, b) => (a.saat || 0) - (b.saat || 0))
        .slice(0, 4)
        .map(d => ({ emoji: '📚', saat: `${d.saat}.`, baslik: `${d.sinif} - ${d.ders}` }));
    }

    // --- Sayfa 2: Notlarım (bana ait en güncel notlar) ---
    let notlarListe = [];
    if (typeof notlar !== 'undefined' && notlar.length) {
      const benimUid = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.uid : null;
      notlarListe = notlar
        .filter(n => !n.sahipUid || n.sahipUid === benimUid)
        .sort((a, b) => (b.eklenmeTarihi || '').localeCompare(a.eklenmeTarihi || ''))
        .slice(0, 4)
        .map(n => ({
          emoji: '📝',
          baslik: n.baslik || '(Başlıksız)',
          alt: (n.eklenmeTarihi || '').slice(0, 10)
        }));
    }

    // --- Sayfa 3: Nöbetçiler (bugün) ---
    let nobetciListe = [];
    const _nobetAtamalari = (typeof nobetAtamalari !== 'undefined') ? nobetAtamalari : [];
    const _nobetYerleri   = (typeof nobetYerleri   !== 'undefined') ? nobetYerleri   : [];
    if (tatilModu) {
      nobetciListe = [{ emoji: '🏖️', ad: tatilNotu, yer: '' }];
    } else if (_nobetAtamalari.length) {
      nobetciListe = _nobetAtamalari
        .filter(n => n.tarih === bugunISO)
        .slice(0, 4)
        .map(n => ({
          emoji: '🧑‍🏫',
          ad: typeof ogretmenAdi === 'function' ? ogretmenAdi(n.ogretmenId) : (n.ogretmenAdSoyad || n.ogretmenId || '?'),
          yer: _nobetYerleri.find(y => y.id === n.yerId)?.ad || ''
        }));
    }

    // --- Sayfa 4: Haberler (en güncel) ---
    let haberlerListe = [];
    if (typeof haberler !== 'undefined' && haberler.length) {
      haberlerListe = [...haberler]
        .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''))
        .slice(0, 4)
        .map(h => ({
          emoji: '📰',
          baslik: h.baslik || 'Başlıksız',
          alt: typeof haberZamanEtiketi === 'function' ? haberZamanEtiketi(h.tarih) : (h.tarih || '').slice(0, 10)
        }));
    }

    // --- Hava durumu (window.sonHavaVerisi, bkz. hava-durumu.js) ---
    let havaIkon = '⛅', havaSicaklik = '--°', havaAciklama = '—';
    try {
      const hv = (typeof window !== 'undefined') ? window.sonHavaVerisi : null;
      if (hv && typeof window.havaKoduOku === 'function') {
        const bilgi = window.havaKoduOku(hv.kod);
        havaIkon = bilgi.e;
        havaAciklama = bilgi.t;
        havaSicaklik = `${Math.round(hv.sicaklik)}°`;
      }
    } catch (we) {
      console.warn('[Widget] Hava durumu okunamadı:', we);
    }

    // --- Okul Adı ---
    const okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari?.okulAdi)
      ? okulBilgileriAyari.okulAdi : 'Okul Yönetim Paneli';

    await plugin.sayfalariGuncelle({
      okul: okulAdi,
      etkinlikJson: JSON.stringify(etkinlikler),
      notJson: JSON.stringify(notlarListe),
      nobetJson: JSON.stringify(nobetciListe),
      haberJson: JSON.stringify(haberlerListe),
      havaIkon, havaSicaklik, havaAciklama
    });

    console.log('[Widget] Güncellendi:', { etkinlikler, notlarListe, nobetciListe, haberlerListe });

  } catch (e) {
    console.warn('[Widget] Güncellenemedi:', e);
  }
}

// Uygulama görünür olunca güncelle (arka plandan dönüşte de)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    setTimeout(widgetGuncelle, 1500);
    setTimeout(dersZiliWidgetGuncelle, 1500);
  }
});

/* ====================================================================
   Ders Zili Geri Sayım widget'ı — bkz. DersZiliWidget.java / DersZiliCizici.java
   Burada SADECE veri hesaplanır (kalan dakika, ilerleme oranı, aktif/sonraki
   ders, zaman çizelgesi); görsel çizim tamamen native tarafta yapılıyor.
   ==================================================================== */
function dersZiliEtiketGetir(seg, ben, bugunGun, _dersProgrami) {
  if (!seg) return { baslik: '—', yer: '' };
  if (seg.tip === 'ogle') return { baslik: 'Öğle Arası', yer: '' };
  const kayit = _dersProgrami.find(d => d.ogretmenId === ben.id && d.gun === bugunGun && d.saat === seg.saat);
  return kayit
    ? { baslik: kayit.ders || 'Ders', yer: kayit.sinif ? `(${kayit.sinif})` : '' }
    : { baslik: `${seg.saat}. Ders`, yer: '' };
}

function dersZiliWidgetVerisiHesapla() {
  const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
  const tatilModu = !!(typeof dersSaatleriAyarlari !== 'undefined' && dersSaatleriAyarlari && dersSaatleriAyarlari.tatilModu);

  if (tatilModu) {
    const not = (typeof tatilModuNotuOlustur === 'function') ? tatilModuNotuOlustur(dersSaatleriAyarlari) : '';
    return {
      tatilModu: true,
      tatilNotu: not || 'Okul tatilde',
      // Native taraf (DersZiliHesaplayici), uygulama kapalıyken de "okula kaç
      // gün kaldı"yı GÜNCEL tarihe göre hesaplayabilsin diye ham tarihi de
      // gönderiyoruz — sadece hazır metni (not) göndermek yeterli değil,
      // çünkü metin donuk kalır, gün sayısı ise her gün azalmalı.
      okulAcilisTarihi: (dersSaatleriAyarlari && dersSaatleriAyarlari.okulAcilisTarihi) || null
    };
  }
  if (!ben) return { dersYok: true, durumMetniOzel: 'Uygulamayı açınız' };

  const bugunGun = _bugunGunAdi();
  const segmentler = (typeof dersSaatleriSegmentleri === 'function') ? dersSaatleriSegmentleri() : [];
  if (!segmentler.length) return { dersYok: true, durumMetniOzel: 'Zil programı yok' };

  const _dersProgrami = (typeof dersProgrami !== 'undefined') ? dersProgrami : [];
  const et = (seg) => dersZiliEtiketGetir(seg, ben, bugunGun, _dersProgrami);

  // NOT: "kalan dakika/ilerleme oranı" burada HESAPLANMIYOR — sadece o günün
  // ham saat aralıkları + başlıkları gönderiliyor. Gerçek geri sayım, widget
  // her çizildiğinde (uygulama kapalıyken de) GÜNCEL saate göre native
  // tarafta (DersZiliHesaplayici.java) hesaplanıyor.
  return {
    segmentler: segmentler.map(s => {
      const e = et(s);
      return { bas: s.bas, bit: s.bit, baslik: e.baslik, yer: e.yer };
    })
  };
}

async function dersZiliWidgetGuncelle() {
  if (!_kapasitorVarMi()) return;
  const plugin = _widgetPlugin();
  if (!plugin || !plugin.dersZiliGuncelle) return;
  try {
    const veri = dersZiliWidgetVerisiHesapla();
    await plugin.dersZiliGuncelle({ veriJson: JSON.stringify(veri) });
  } catch (e) {
    console.warn('[Widget] Ders zili widget\'ı güncellenemedi:', e);
  }
}
