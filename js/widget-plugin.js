/**
 * widget-plugin.js
 * Capacitor'ın native WidgetPlugin'ini çağırır.
 * Tarayıcıda çalışırken no-op (sessizce yok sayar).
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
      guncelle: async () => {},
      veriAl:   async () => ({})
    };
  }
  return _plugin;
}

export const WidgetPlugin = {
  async guncelle(data) {
    const p = await _getPlugin();
    return p.guncelle(data);
  },
  async veriAl() {
    const p = await _getPlugin();
    return p.veriAl();
  }
};
