/* ====================================================================
   js/sistem-bar.js
   Android durum çubuğu ve gezinme çubuğu rengini uygulamanın
   arka plan rengiyle (--nm-bg) senkronize tutar.
   ==================================================================== */
(function () {
  'use strict';

  function cssRenk(degisken) {
    try {
      return getComputedStyle(document.documentElement).getPropertyValue(degisken).trim() || null;
    } catch (e) { return null; }
  }

  // WCAG parlaklık — 0.35 eşiği: üstü açık zemin (koyu ikon), altı koyu zemin (açık ikon)
  function parlaklik(hex) {
    try {
      const t = hex.replace('#','');
      const r = parseInt(t.slice(0,2),16)/255, g = parseInt(t.slice(2,4),16)/255, b = parseInt(t.slice(4,6),16)/255;
      const l = c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
      return 0.2126*l(r) + 0.7152*l(g) + 0.0722*l(b);
    } catch(e) { return 0; }
  }

  function sistemBarTemaUygula() {
    try {
      if (!window.Capacitor) return;
      const Plugin = window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBarPlugin;
      if (!Plugin || typeof Plugin.temaUygula !== 'function') return;

      // Her zaman arka plan rengi (--nm-bg) — açık: #E0E5EC, koyu: #1C2A2E
      const renk = cssRenk('--nm-bg') || '#E0E5EC';
      const acikMi = parlaklik(renk) > 0.35; // açık zemin → koyu ikonlar gerekir

      Plugin.temaUygula({ renk, acikMi }).catch(function(e) {
        console.warn('[SistemBar]', e);
      });
    } catch (e) {
      console.warn('[SistemBar] Hata:', e);
    }
  }

  function temaGozlemcisiniKur() {
    new MutationObserver(function(mutasyonlar) {
      for (const m of mutasyonlar) {
        if (m.attributeName === 'data-theme') { sistemBarTemaUygula(); break; }
      }
    }).observe(document.documentElement, { attributes: true });
  }

  function baslat() {
    sistemBarTemaUygula();
    temaGozlemcisiniKur();
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) sistemBarTemaUygula();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', baslat);
  } else {
    baslat();
  }

  window.sistemBarTemaUygula = sistemBarTemaUygula;
})();
