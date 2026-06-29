/**
 * widget-bridge.js
 * Uygulamada Firestore verisi yüklenince widget'ı günceller.
 */

function _kapasitorVarMi() {
  try {
    return typeof window !== 'undefined' &&
           typeof window.Capacitor !== 'undefined' &&
           window.Capacitor.isNativePlatform();
  } catch(e){ return false; }
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

async function widgetGuncelle() {
  if (!_kapasitorVarMi()) return;

  // Yöntem 1: Capacitor.Plugins üzerinden
  // Yöntem 2: window.WidgetPlugin (MainActivity tarafından expose edilmiş olabilir)
  const plugin = window.Capacitor?.Plugins?.WidgetPlugin || window.WidgetPlugin;
  if (!plugin) {
    console.warn('WidgetPlugin bulunamadı');
    return;
  }

  try {
    const bugunGun = _bugunGunAdi();
    const tarih = _bugunTarihStr();
    const bugunISO = new Date().toISOString().slice(0, 10);

    // --- Nöbet ---
    let nobetMetin = 'Nöbet yok';
    const _nobetAtamalari = (typeof nobetAtamalari !== 'undefined') ? nobetAtamalari : [];
    const _nobetYerleri   = (typeof nobetYerleri   !== 'undefined') ? nobetYerleri   : [];
    if (_nobetAtamalari.length) {
      const bugunNobetler = _nobetAtamalari.filter(n => n.tarih === bugunISO);
      if (bugunNobetler.length) {
        nobetMetin = bugunNobetler.map(n => {
          const yer = _nobetYerleri.find(y => y.id === n.yerId)?.ad || '?';
          const ogr = typeof ogretmenAdi === 'function'
            ? ogretmenAdi(n.ogretmenId)
            : (n.ogretmenAdSoyad || n.ogretmenId || '?');
          return `${ogr} · ${yer}`;
        }).join('\n');
      }
    }

    // --- Bugünkü Dersler ---
    let dersMetin = 'Ders yok';
    const _dersProgrami = (typeof dersProgrami !== 'undefined') ? dersProgrami : [];
    if (_dersProgrami.length) {
      const bugunDersler = _dersProgrami
        .filter(d => d.gun === bugunGun)
        .sort((a, b) => (a.saat || 0) - (b.saat || 0))
        .slice(0, 5);
      if (bugunDersler.length) {
        dersMetin = bugunDersler.map(d => `${d.saat}. ${d.sinif} → ${d.ders}`).join('\n');
      }
    }

    // --- Yaklaşan Belgeler ---
    let belgeMetin = '—';
    const yaklasanlar = [];
    const limitISO = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (typeof sinavlar !== 'undefined' && sinavlar.length) {
      sinavlar
        .filter(s => s.tarih >= bugunISO && s.tarih <= limitISO)
        .forEach(s => yaklasanlar.push(`${s.ders} (${s.siniflar || s.sinif}) · ${s.tarih}`));
    }
    if (yaklasanlar.length) belgeMetin = yaklasanlar.slice(0, 3).join('\n');

    // --- Okul Adı ---
    const okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari?.okulAdi)
      ? okulBilgileriAyari.okulAdi : 'Okul Yönetim Paneli';

    // --- Zil Sayacı ---
    let zilMetin = 'Zil programı yok';
    try {
      if (typeof dersSaatleriSegmentleri === 'function') {
        const segmentler = dersSaatleriSegmentleri();
        const simdi = new Date();
        const simdiDk = simdi.getHours() * 60 + simdi.getMinutes();
        // Tüm segment başlangıç saatlerini zil listesi olarak kullan
        const zilSaatleri = segmentler.map(s => {
          const h = Math.floor(s.bas / 60);
          const m = s.bas % 60;
          return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        });
        if (typeof hesaplaZilSayaci === 'function') {
          zilMetin = hesaplaZilSayaci(zilSaatleri);
        } else {
          // Basit hesap: en yakın ileriki zil
          for (const saat of zilSaatleri) {
            const [h, m] = saat.split(':').map(Number);
            const fark = (h * 60 + m) - simdiDk;
            if (fark > 0) {
              zilMetin = fark < 60
                ? `Sonraki zil: ${saat} · ${fark} dk`
                : `Sonraki zil: ${saat} · ${Math.floor(fark/60)}s ${fark%60>0?fark%60+'dk':''}`.trim();
              break;
            }
          }
          if (zilMetin === 'Zil programı yok') zilMetin = 'Dersler bitti';
        }
      }
    } catch(ze) {
      console.warn('Zil hesap hatası:', ze);
    }

    await plugin.guncelle({
      okul:  okulAdi,
      tarih: tarih,
      nobet: nobetMetin,
      ders:  dersMetin,
      belge: belgeMetin,
      zil:   zilMetin
    });

  } catch (e) {
    console.warn('Widget güncellenemedi:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(widgetGuncelle, 3000);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    setTimeout(widgetGuncelle, 1000);
  }
});
