/**
 * widget-bridge.js
 * Uygulamada Firestore verisi yüklenince widget'ı günceller.
 * index.html'de app.js'den sonra yüklenmelidir.
 *
 * Gereksinim: Capacitor (Android APK) ortamında çalışır.
 * Tarayıcıda sessizce görmezden gelir.
 */

// Capacitor mevcut mu?
function _kapasitorVarMi() {
  return typeof window !== 'undefined' &&
         typeof window.Capacitor !== 'undefined' &&
         window.Capacitor.getPlatform() === 'android';
}

// Türkçe gün adı
function _bugunGunAdi() {
  const gunler = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  return gunler[new Date().getDay()];
}

// Türkçe tarih formatı
function _bugunTarihStr() {
  return new Date().toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric', weekday: 'short'
  });
}

/**
 * Widget verisini güncelle.
 * app.js'deki snapshot listener'lardan çağrılır.
 */
async function widgetGuncelle() {
  if (!_kapasitorVarMi()) return;

  try {
    const { WidgetPlugin } = await import('./widget-plugin.js');
    const bugunGun = _bugunGunAdi();
    const tarih = _bugunTarihStr();

    // ── Nöbet ──
    let nobetMetin = 'Nöbet yok';
    if (typeof nobetAtamalari !== 'undefined' && nobetAtamalari.length) {
      const bugun = new Date().toISOString().slice(0, 10);
      const bugunNobetler = nobetAtamalari.filter(n => n.tarih === bugun);
      if (bugunNobetler.length) {
        nobetMetin = bugunNobetler.map(n => {
          const yer = typeof nobetYerleri !== 'undefined'
            ? (nobetYerleri.find(y => y.id === n.yerId)?.ad || '?')
            : '?';
          const ogr = typeof ogretmenAdi === 'function' ? ogretmenAdi(n.ogretmenId) : n.ogretmenId;
          return `${ogr} · ${yer}`;
        }).join('\n');
      }
    }

    // ── Bugünkü Dersler ──
    let dersMetin = 'Ders yok';
    if (typeof dersProgrami !== 'undefined' && dersProgrami.length) {
      const bugunDersler = dersProgrami
        .filter(d => d.gun === bugunGun)
        .sort((a, b) => a.saat - b.saat)
        .slice(0, 5); // Max 5 satır
      if (bugunDersler.length) {
        dersMetin = bugunDersler.map(d =>
          `${d.saat}. ${d.sinif} → ${d.ders}`
        ).join('\n');
      }
    }

    // ── Yaklaşan Belgeler ──
    let belgeMetin = '—';
    const yaklasanlar = [];
    const bugunISO = new Date().toISOString().slice(0, 10);
    const limitISO = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Yazılı sınavlar
    if (typeof sinavlar !== 'undefined') {
      sinavlar
        .filter(s => s.tarih >= bugunISO && s.tarih <= limitISO)
        .forEach(s => yaklasanlar.push(`📝 ${s.ders} (${s.siniflar || s.sinif}) · ${s.tarih}`));
    }

    if (yaklasanlar.length) {
      belgeMetin = yaklasanlar.slice(0, 3).join('\n');
    }

    // ── Okul Adı ──
    const okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari?.okulAdi)
      ? okulBilgileriAyari.okulAdi
      : 'Okul Yönetim Paneli';

    await WidgetPlugin.guncelle({
      okul:  okulAdi,
      tarih: tarih,
      nobet: nobetMetin,
      ders:  dersMetin,
      belge: belgeMetin
    });

  } catch (e) {
    console.warn('Widget güncellenemedi:', e);
  }
}

// Uygulama ilk açıldığında ve veri yüklenince güncelle
document.addEventListener('DOMContentLoaded', () => {
  // Veri yüklenmesi için biraz bekle
  setTimeout(widgetGuncelle, 3000);
});

// Ön plana gelince tekrar güncelle
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    setTimeout(widgetGuncelle, 1000);
  }
});
