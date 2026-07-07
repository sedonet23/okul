package com.koruk.okul;

import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * StatusBarPlugin – Android durum çubuğu (status bar) ve gezinme çubuğu
 * (navigation bar) arka plan rengini ve ikon stilini JS tarafından dinamik
 * olarak değiştirmeye yarar.
 *
 * JS çağrımı:
 *   window.Capacitor.Plugins.StatusBarPlugin.temaUygula({
 *     renk: '#1B3A3A',
 *     acikMi: false   // false = açık ikonlar (koyu arka plan), true = koyu ikonlar
 *   });
 */
@CapacitorPlugin(name = "StatusBarPlugin")
public class StatusBarPlugin extends Plugin {

    @PluginMethod
    public void temaUygula(PluginCall call) {
        final String renk = call.getString("renk", "#0A7A7A");
        final boolean acikMi = Boolean.TRUE.equals(call.getBoolean("acikMi", false));

        getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    Window window = getActivity().getWindow();
                    int parsedColor = parseColor(renk);

                    // Status Bar ve Navigation Bar arka plan rengi (API 21+)
                    window.setStatusBarColor(parsedColor);
                    window.setNavigationBarColor(parsedColor);

                    // İkon rengi — API seviyesine göre uygun yöntemi seç
                    setSystemBarIconColor(window, acikMi);

                    call.resolve();
                } catch (Exception e) {
                    call.reject("StatusBar güncellenemedi: " + e.getMessage());
                }
            }
        });
    }

    /**
     * System bar ikon rengini ayarlar.
     * acikMi=true  → koyu ikonlar (açık/nötr arka plan üzerinde)
     * acikMi=false → açık ikonlar (koyu arka plan üzerinde)
     */
    @SuppressWarnings("deprecation")
    private void setSystemBarIconColor(Window window, boolean acikMi) {
        View decor = window.getDecorView();
        int flags = decor.getSystemUiVisibility();

        if (acikMi) {
            // Koyu ikonlar
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
        } else {
            // Açık ikonlar
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
        }
        decor.setSystemUiVisibility(flags);
    }

    private int parseColor(String hex) {
        try {
            if (hex == null || hex.isEmpty()) return Color.parseColor("#0A7A7A");
            String temiz = hex.trim();
            if (!temiz.startsWith("#")) temiz = "#" + temiz;
            return Color.parseColor(temiz);
        } catch (Exception e) {
            return Color.parseColor("#0A7A7A");
        }
    }
}
