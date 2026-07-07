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

async function widgetGuncelle() {
  if (!_kapasitorVarMi()) return;

  const plugin = _widgetPlugin();
  if (!plugin) {
    console.warn('[Widget] WidgetPlugin bulunamadı');
    return;
  }

  try {
    const bugunGun = _bugunGunAdi();
    const tarih = _bugunTarihStr();
    const bugunISO = new Date().toISOString().slice(0, 10);

    // --- Tatil Modu Kontrolü ---
    const tatilModu = !!(typeof dersSaatleriAyarlari !== 'undefined' &&
                         dersSaatleriAyarlari && dersSaatleriAyarlari.tatilModu);
    const tatilNotu = tatilModu
      ? (tatilModuNotuOlustur(dersSaatleriAyarlari) || 'Okul tatilde')
      : null;

    // --- Nöbet ---
    let nobetMetin = tatilModu ? `🏖️ ${tatilNotu}` : 'Nöbet yok';
    const _nobetAtamalari = (typeof nobetAtamalari !== 'undefined') ? nobetAtamalari : [];
    const _nobetYerleri   = (typeof nobetYerleri   !== 'undefined') ? nobetYerleri   : [];
    if (!tatilModu && _nobetAtamalari.length) {
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
    let dersMetin = tatilModu ? `🏖️ ${tatilNotu}` : 'Ders yok';
    const _dersProgrami = (typeof dersProgrami !== 'undefined') ? dersProgrami : [];
    if (!tatilModu && _dersProgrami.length) {
      const bugunDersler = _dersProgrami
        .filter(d => d.gun === bugunGun)
        .sort((a, b) => (a.saat || 0) - (b.saat || 0));
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
    let zilMetin = tatilModu ? '' : 'Zil programı yok';
    if (!tatilModu) try {
      if (typeof dersSaatleriSegmentleri === 'function') {
        const segmentler = dersSaatleriSegmentleri();
        const simdiDk = new Date().getHours() * 60 + new Date().getMinutes();
        const zilSaatleri = segmentler.map(s => {
          const h = Math.floor(s.bas / 60);
          const m = s.bas % 60;
          return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        });
        if (typeof hesaplaZilSayaci === 'function') {
          zilMetin = hesaplaZilSayaci(zilSaatleri);
        } else {
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
      console.warn('[Widget] Zil hesap hatası:', ze);
    }

    await plugin.guncelle({
      okul:  okulAdi,
      tarih: tarih,
      nobet: nobetMetin,
      ders:  dersMetin,
      belge: belgeMetin,
      zil:   zilMetin
    });

    console.log('[Widget] Güncellendi:', { nobet: nobetMetin, ders: dersMetin });

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
    return { tatilModu: true, tatilNotu: not || 'Okul tatilde' };
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
