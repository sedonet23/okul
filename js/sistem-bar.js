/* ====================================================================
   js/sistem-bar.js
   Android durum çubuğu (status bar) ve gezinme çubuğu (navigation bar)
   rengini uygulamanın aktif temasıyla senkronize tutar.

   Çalışma mantığı:
   - CSS değişkenlerinden aktif tema rengini okur
   - Capacitor StatusBarPlugin üzerinden native Java'ya renk/stil gönderir
   - Tema değiştiğinde, uygulama açıldığında ve ön plana geldiğinde çalışır
   - Capacitor yoksa (web/PWA ortamı) sessizce devre dışı kalır
   ==================================================================== */

(function () {
  'use strict';

  // ---- Yardımcı: CSS değişkeninden hesaplanan rengi al ----
  function cssRenk(degisken) {
    try {
      const deger = getComputedStyle(document.documentElement)
        .getPropertyValue(degisken)
        .trim();
      return deger || null;
    } catch (e) {
      return null;
    }
  }

  // ---- Aktif tema rengini belirle ----
  // Açık tema: topbar arka planı (--nm-bg = #E0E5EC gibi açık nötr)
  // Koyu tema: sidebar arka planı (#1C2A2E gibi koyu teal)
  // Her iki durumda sidebar rengi status bar için daha uygun görünür —
  // sidebar marka rengini taşır, topbar nötr.
  function aktifRenkleriAl() {
    const koyuMu = document.documentElement.getAttribute('data-theme') === 'dark';

    let statusRenk, navRenk;

    if (koyuMu) {
      // Koyu tema: koyu sidebar tonu
      statusRenk = cssRenk('--bg-sidebar') || '#0E1A1C';
      navRenk    = cssRenk('--nm-bg')      || '#1C2A2E';
    } else {
      // Açık tema: marka rengi (sidebar tonu)
      statusRenk = cssRenk('--bg-sidebar') || '#1B3A3A';
      navRenk    = cssRenk('--nm-bg')      || '#E0E5EC';
    }

    return { statusRenk, navRenk, koyuMu };
  }

  // ---- Tek renk mi? İkonlar okunabilir mi? ----
  // Hex rengin görecel parlaklığını hesapla (W3C WCAG formülü).
  // > 0.35 → açık zemin (koyu ikonlar gerekir), ≤ 0.35 → koyu zemin.
  function parlaklikHesapla(hex) {
    try {
      const temiz = hex.replace('#', '');
      const r = parseInt(temiz.substring(0, 2), 16) / 255;
      const g = parseInt(temiz.substring(2, 4), 16) / 255;
      const b = parseInt(temiz.substring(4, 6), 16) / 255;
      const lineer = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      return 0.2126 * lineer(r) + 0.7152 * lineer(g) + 0.0722 * lineer(b);
    } catch (e) {
      return 0;
    }
  }

  // ---- Ana fonksiyon: Status Bar + Navigation Bar güncelle ----
  function sistemBarTemaUygula() {
    try {
      // Capacitor yoksa (web tarayıcısında çalışıyorsa) çık
      if (typeof window === 'undefined' || !window.Capacitor) return;
      const Plugin = window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBarPlugin;
      if (!Plugin || typeof Plugin.temaUygula !== 'function') return;

      const { statusRenk, navRenk, koyuMu } = aktifRenkleriAl();

      // Status bar için parlaklık kontrolü (ikonlar okunabilir olsun)
      const parlaklik = parlaklikHesapla(statusRenk);
      const acikIkonlar = parlaklik <= 0.35; // koyu zemin = açık ikonlar gerekmez

      // Plugin'e gönder — tek çağrıyla hem status hem nav bar
      Plugin.temaUygula({
        renk:   statusRenk,  // status bar rengi
        acikMi: !acikIkonlar // true → koyu ikonlar (açık tema), false → açık ikonlar (koyu tema)
      }).catch(function (err) {
        // Sessizce yut; tarayıcıda / eski cihazda hata verebilir
        console.warn('[SistemBar] temaUygula hatası:', err);
      });

    } catch (e) {
      console.warn('[SistemBar] Beklenmeyen hata:', e);
    }
  }

  // ---- Tema değişikliğini izle (MutationObserver) ----
  // ui.js'deki temaUygula() fonksiyonu data-theme niteliğini değiştirir.
  // MutationObserver bu değişikliği anında yakalar.
  function temaGozlemcisiniKur() {
    const gozlemci = new MutationObserver(function (mutasyonlar) {
      for (const m of mutasyonlar) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          sistemBarTemaUygula();
          break;
        }
      }
    });
    gozlemci.observe(document.documentElement, { attributes: true });
  }

  // ---- Uygulama ön plana gelince yeniden uygula (visibility change) ----
  function gorunurlukDinleyicisiniKur() {
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        sistemBarTemaUygula();
      }
    });

    // Capacitor'un kendi uygulama durumu olayı (varsa)
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      try {
        window.Capacitor.Plugins.App.addListener('appStateChange', function (state) {
          if (state && state.isActive) {
            sistemBarTemaUygula();
          }
        });
      } catch (e) { /* yoksay */ }
    }
  }

  // ---- Başlatma ----
  function baslat() {
    // İlk uygulama
    sistemBarTemaUygula();
    // Tema değişikliği izleme
    temaGozlemcisiniKur();
    // Ön plana gelme izleme
    gorunurlukDinleyicisiniKur();
  }

  // DOM hazır olunca başlat (veya hemen çalıştır)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', baslat);
  } else {
    baslat();
  }

  // Global erişim — gerekirse diğer modüllerden manuel tetikleme için
  window.sistemBarTemaUygula = sistemBarTemaUygula;
})();
