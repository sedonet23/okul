package com.koruk.okul;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * OkulWidget — Ana ekran widget'ı
 * Bugünün nöbetçileri, ders programı ve yaklaşan belgeler gösterilir.
 * Veriler, uygulama açıkken SharedPreferences'a kaydedilir.
 * Widget buradan okur, internet bağlantısı gerektirmez.
 */
public class OkulWidget extends AppWidgetProvider {

    public static final String PREFS_NAME = "OkulWidgetPrefs";
    public static final String KEY_NOBET  = "widget_nobet";
    public static final String KEY_DERS   = "widget_ders";
    public static final String KEY_BELGE  = "widget_belge";
    public static final String KEY_TARIH  = "widget_tarih";
    public static final String KEY_OKUL   = "widget_okul";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager mgr, int widgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        String okulAdi = prefs.getString(KEY_OKUL,  "Okul Yönetim Paneli");
        String tarih   = prefs.getString(KEY_TARIH, "—");
        String nobet   = prefs.getString(KEY_NOBET,  "Nöbet verisi yok.\nUygulamayı açınız.");
        String ders    = prefs.getString(KEY_DERS,   "Ders programı yok.\nUygulamayı açınız.");
        String belge   = prefs.getString(KEY_BELGE,  "—");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_okul);

        views.setTextViewText(R.id.widget_okul_adi,    okulAdi);
        views.setTextViewText(R.id.widget_tarih,       tarih);
        views.setTextViewText(R.id.widget_nobet_icerik, nobet);
        views.setTextViewText(R.id.widget_ders_icerik,  ders);
        views.setTextViewText(R.id.widget_belge_icerik, belge);

        // Widget'a tıklayınca uygulamayı aç
        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pi);

        mgr.updateAppWidget(widgetId, views);
    }

    /**
     * JavaScript tarafından çağrılır (WidgetPlugin üzerinden).
     * Veriyi SharedPreferences'a kaydeder, widget'ı günceller.
     */
    public static void veriGuncelle(Context context,
                                     String okul, String tarih,
                                     String nobet, String ders, String belge) {
        SharedPreferences.Editor ed = context
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        ed.putString(KEY_OKUL,  okul  != null ? okul  : "");
        ed.putString(KEY_TARIH, tarih != null ? tarih : "");
        ed.putString(KEY_NOBET, nobet != null ? nobet : "");
        ed.putString(KEY_DERS,  ders  != null ? ders  : "");
        ed.putString(KEY_BELGE, belge != null ? belge : "");
        ed.apply();

        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        ComponentName comp = new ComponentName(context, OkulWidget.class);
        int[] ids = mgr.getAppWidgetIds(comp);
        for (int id : ids) updateWidget(context, mgr, id);
    }
}
