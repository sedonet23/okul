package com.koruk.okul;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/* JS tarafından modal/detay paneli gibi İÇ KAYDIRMALI bir alan açıkken
   native "aşağı çekince yenile" (pull-to-refresh) jestini geçici olarak
   kapatmak için kullanılır. Sebep: WebViewAwareSwipeRefreshLayout (bkz.
   MainActivity) sadece WebView'in KENDİ (dış) scrollY'sini kontrol
   ediyor — modal içindeki bir <div style="overflow-y:auto"> listenin
   kaydırma durumundan haberi yok. Bu yüzden modal içinde listeyi aşağı
   kaydırmaya çalışırken bazen yenileme jesti tetiklenip kaydırma iptal
   oluyordu. Çözüm: modal açıkken JS bu eklentiyi çağırıp jesti tamamen
   devre dışı bırakır, modal kapanınca tekrar açar. */
@CapacitorPlugin(name = "PullToRefreshPlugin")
public class PullToRefreshPlugin extends Plugin {

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", true));
        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> activity.setPullToRefreshEnabled(enabled));
        }
        call.resolve();
    }

    /* YENİ: JS tarafı (auth.js: uygulamaBaslat() sonrası) uygulamanın
       GERÇEKTEN kullanılabilir olduğu anı bildirmek için bunu çağırır —
       pull-to-refresh göstergesi artık sabit bir süre tahmin etmek yerine
       bu sinyali bekleyip HEMEN kapanabiliyor (bkz. MainActivity.markAppReady). */
    @PluginMethod
    public void appHazir(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            activity.runOnUiThread(activity::markAppReady);
        }
        call.resolve();
    }
}
