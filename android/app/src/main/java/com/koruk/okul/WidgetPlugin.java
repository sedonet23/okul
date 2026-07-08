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
 *   WidgetPlugin.sayfalariGuncelle({ okul, etkinlikJson, notJson, nobetJson, haberJson,
 *                                     havaIkon, havaSicaklik, havaAciklama });
 */
@CapacitorPlugin(name = "WidgetPlugin")
public class WidgetPlugin extends Plugin {

    /** Ana ekran widget'ının 4 sayfasını (Etkinlikler/Notlarım/Nöbetçiler/Haberler) günceller. */
    @PluginMethod
    public void sayfalariGuncelle(PluginCall call) {
        String okul         = call.getString("okul", "");
        String etkinlikJson = call.getString("etkinlikJson", "[]");
        String notJson      = call.getString("notJson", "[]");
        String nobetJson    = call.getString("nobetJson", "[]");
        String haberJson    = call.getString("haberJson", "[]");
        String havaIkon     = call.getString("havaIkon", "⛅");
        String havaSicaklik = call.getString("havaSicaklik", "--°");
        String havaAciklama = call.getString("havaAciklama", "—");

        OkulWidget.sayfalariGuncelle(getContext(), okul, etkinlikJson, notJson,
                nobetJson, haberJson, havaIkon, havaSicaklik, havaAciklama);
        call.resolve();
    }

    @PluginMethod
    public void veriAl(PluginCall call) {
        android.content.SharedPreferences p = getContext()
            .getSharedPreferences(OkulWidget.PREFS_NAME, android.content.Context.MODE_PRIVATE);
        JSObject ret = new JSObject();
        ret.put("okul",         p.getString(OkulWidget.KEY_OKUL, ""));
        ret.put("etkinlikJson", p.getString(OkulWidget.KEY_ETKINLIK_JSON, "[]"));
        ret.put("notJson",      p.getString(OkulWidget.KEY_NOT_JSON, "[]"));
        ret.put("nobetJson",    p.getString(OkulWidget.KEY_NOBET_JSON, "[]"));
        ret.put("haberJson",    p.getString(OkulWidget.KEY_HABER_JSON, "[]"));
        call.resolve(ret);
    }

    /* ---------- Ders Zili Geri Sayım widget'ı (bkz. DersZiliWidget/DersZiliCizici) ----------
       JS tek bir JSON string gönderir — o günün HAM segment listesi (bas/bit dakika +
       başlık/yer). Gerçek "kalan dakika" hesaplaması JS'de DEĞİL, native tarafta
       (DersZiliHesaplayici) her çizimde güncel saate göre yapılır — böylece uygulama
       kapalıyken de sayaç doğru kalır. */
    @PluginMethod
    public void dersZiliGuncelle(PluginCall call) {
        String veriJson = call.getString("veriJson", "{}");
        DersZiliWidget.veriGuncelle(getContext(), veriJson);
        call.resolve();
    }
}
