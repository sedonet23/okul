package com.koruk.okul;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * OkulWidget — Ana ekran widget'ı.
 * 4 sayfalık kaydırmalı (StackView) yapı: Etkinlikler / Notlarım / Nöbetçiler / Haberler.
 * Sayfa içerikleri OkulWidgetStackService (RemoteViewsService) üzerinden gelir.
 * Veriler, uygulama açıkken JS tarafından (widget-bridge.js) SharedPreferences'a
 * JSON olarak kaydedilir; widget internet bağlantısı gerektirmeden bunları okur.
 */
public class OkulWidget extends AppWidgetProvider {

    public static final String PREFS_NAME = "OkulWidgetPrefs";

    public static final String KEY_OKUL = "widget_okul";

    public static final String KEY_ETKINLIK_JSON = "widget_etkinlik_json";
    public static final String KEY_NOT_JSON      = "widget_not_json";
    public static final String KEY_NOBET_JSON    = "widget_nobet_json";
    public static final String KEY_HABER_JSON    = "widget_haber_json";

    public static final String KEY_HAVA_IKON      = "widget_hava_ikon";
    public static final String KEY_HAVA_SICAKLIK  = "widget_hava_sicaklik";
    public static final String KEY_HAVA_ACIKLAMA  = "widget_hava_aciklama";

    // Not ekle deep-link extra anahtarı (StackView'daki bir sayfaya tıklayınca kullanılabilir)
    public static final String EXTRA_PAGE = "page";
    public static final String PAGE_NOTLAR = "notlar";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager mgr, int widgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String okulAdi = prefs.getString(KEY_OKUL, "Okul Yönetim Paneli");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_okul);
        views.setTextViewText(R.id.widget_okul_adi, okulAdi);

        // StackView'a veri sağlayan servisi bağla. Her widget örneği kendi
        // intent'ine widgetId'yi Uri'ye gömerek benzersiz olmalı, yoksa Android
        // birden fazla widget örneğini aynı adapter'la karıştırabilir.
        Intent stackIntent = new Intent(context, OkulWidgetStackService.class);
        stackIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        stackIntent.setData(Uri.parse(stackIntent.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_stack, stackIntent);

        // Yığındaki herhangi bir sayfaya dokununca uygulamayı aç.
        Intent intentAna = new Intent(context, MainActivity.class);
        intentAna.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent piTemplate = PendingIntent.getActivity(context, 0, intentAna,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
        views.setPendingIntentTemplate(R.id.widget_stack, piTemplate);

        mgr.updateAppWidget(widgetId, views);
        mgr.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_stack);
    }

    /**
     * JavaScript tarafından çağrılır (WidgetPlugin.sayfalariGuncelle üzerinden).
     * 4 sayfanın verisini + hava durumunu SharedPreferences'a yazar ve
     * StackView'ı yeniden çizdirir.
     */
    public static void sayfalariGuncelle(Context context,
                                          String okul,
                                          String etkinlikJson,
                                          String notJson,
                                          String nobetJson,
                                          String haberJson,
                                          String havaIkon,
                                          String havaSicaklik,
                                          String havaAciklama) {
        SharedPreferences.Editor ed = context
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        ed.putString(KEY_OKUL, okul != null ? okul : "");
        ed.putString(KEY_ETKINLIK_JSON, guvenliJson(etkinlikJson));
        ed.putString(KEY_NOT_JSON, guvenliJson(notJson));
        ed.putString(KEY_NOBET_JSON, guvenliJson(nobetJson));
        ed.putString(KEY_HABER_JSON, guvenliJson(haberJson));
        ed.putString(KEY_HAVA_IKON, havaIkon != null ? havaIkon : "⛅");
        ed.putString(KEY_HAVA_SICAKLIK, havaSicaklik != null ? havaSicaklik : "--°");
        ed.putString(KEY_HAVA_ACIKLAMA, havaAciklama != null ? havaAciklama : "—");
        ed.apply();

        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        ComponentName comp = new ComponentName(context, OkulWidget.class);
        int[] ids = mgr.getAppWidgetIds(comp);
        for (int id : ids) {
            updateWidget(context, mgr, id);
        }
    }

    private static String guvenliJson(String s) {
        return (s == null || s.trim().isEmpty()) ? "[]" : s;
    }
}
