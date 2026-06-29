package com.koruk.okul;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * WidgetPlugin – JavaScript'ten native widget'a veri köprüsü.
 * Kullanım (JS tarafı):
 *   import { WidgetPlugin } from './widget-plugin';
 *   WidgetPlugin.guncelle({ okul, tarih, nobet, ders, belge, zil });
 */
@CapacitorPlugin(name = "WidgetPlugin")
public class WidgetPlugin extends Plugin {

    @PluginMethod
    public void guncelle(PluginCall call) {
        String okul  = call.getString("okul",  "");
        String tarih = call.getString("tarih", "");
        String nobet = call.getString("nobet", "");
        String ders  = call.getString("ders",  "");
        String belge = call.getString("belge", "");
        String zil   = call.getString("zil",   "");

        OkulWidget.veriGuncelle(getContext(), okul, tarih, nobet, ders, belge, zil);
        call.resolve();
    }

    @PluginMethod
    public void veriAl(PluginCall call) {
        android.content.SharedPreferences p = getContext()
            .getSharedPreferences(OkulWidget.PREFS_NAME, android.content.Context.MODE_PRIVATE);
        JSObject ret = new JSObject();
        ret.put("okul",  p.getString(OkulWidget.KEY_OKUL,  ""));
        ret.put("tarih", p.getString(OkulWidget.KEY_TARIH, ""));
        ret.put("nobet", p.getString(OkulWidget.KEY_NOBET, ""));
        ret.put("ders",  p.getString(OkulWidget.KEY_DERS,  ""));
        ret.put("belge", p.getString(OkulWidget.KEY_BELGE, ""));
        ret.put("zil",   p.getString(OkulWidget.KEY_ZIL,   ""));
        call.resolve(ret);
    }
}
