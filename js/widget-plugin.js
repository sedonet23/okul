/**
 * widget-plugin.js
 * Capacitor'ın native WidgetPlugin'ini çağırır.
 * Tarayıcıda çalışırken no-op (sessizce yok sayar).
 *
 * Kullanım (app.js veya periyodik.js tarafından):
 *   import { WidgetPlugin } from './widget-plugin.js';
 *   import { hesaplaZilSayaci } from './widget-plugin.js';
 *
 *   const zil = hesaplaZilSayaci(zilListesi); // ["08:00","08:40","09:30",...]
 *   WidgetPlugin.sayfalariGuncelle({
 *     okul, etkinlikJson, notJson, nobetJson, haberJson,
 *     havaIkon, havaSicaklik, havaAciklama
 *   });
 */

let _plugin = null;

async function _getPlugin() {
  if (_plugin) return _plugin;
  try {
    const { registerPlugin } = await import('https://cdn.jsdelivr.net/npm/@capacitor/core@6/dist/index.js');
    _plugin = registerPlugin('WidgetPlugin');
  } catch {
    // Tarayıcıda çalışıyor, plugin yok
    _plugin = {
      sayfalariGuncelle: async () => {},
      veriAl:            async () => ({})
    };
  }
  return _plugin;
}

/**
 * Zil sayacı metni hesaplar.
 * @param {string[]} zilSaatleri - ["08:00","08:40","09:30",...] formatında saatler
 * @returns {string} - Örn: "Sonraki zil: 10:40 · 12 dk" veya "Dersler bitti"
 */
export function hesaplaZilSayaci(zilSaatleri) {
  if (!zilSaatleri || zilSaatleri.length === 0) return "Zil programı yok";

  const simdi = new Date();
  const simdiDk = simdi.getHours() * 60 + simdi.getMinutes();

  for (const saat of zilSaatleri) {
    const [h, m] = saat.split(':').map(Number);
    const saatDk = h * 60 + m;
    const fark = saatDk - simdiDk;

    if (fark > 0) {
      if (fark < 60) {
        return `Sonraki zil: ${saat} · ${fark} dk`;
      } else {
        const hStr = Math.floor(fark / 60);
        const mStr = fark % 60;
        return `Sonraki zil: ${saat} · ${hStr}s ${mStr > 0 ? mStr + 'dk' : ''}`.trim();
      }
    } else if (fark === 0) {
      return `🔔 Zil çalıyor: ${saat}`;
    }
  }

  return "Dersler bitti";
}

export const WidgetPlugin = {
  async sayfalariGuncelle(data) {
    const p = await _getPlugin();
    return p.sayfalariGuncelle(data);
  },
  async veriAl() {
    const p = await _getPlugin();
    return p.veriAl();
  }
};
