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
 * Bugünün nöbetçileri, zil sayacı, ders programı ve yaklaşan belgeler gösterilir.
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
    public static final String KEY_ZIL    = "widget_zil";

    // Not ekle deep-link extra anahtarı
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

        String okulAdi = prefs.getString(KEY_OKUL,  "Okul Yönetim Paneli");
        String tarih   = prefs.getString(KEY_TARIH, "—");
        String nobet   = prefs.getString(KEY_NOBET,  "Nöbet verisi yok.\nUygulamayı açınız.");
        String ders    = prefs.getString(KEY_DERS,   "Ders programı yok.\nUygulamayı açınız.");
        String belge   = prefs.getString(KEY_BELGE,  "—");
        String zil     = prefs.getString(KEY_ZIL,    "Zil bilgisi yok");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_okul);

        views.setTextViewText(R.id.widget_okul_adi,     okulAdi);
        views.setTextViewText(R.id.widget_tarih,        tarih);
        views.setTextViewText(R.id.widget_nobet_icerik, nobet);
        views.setTextViewText(R.id.widget_ders_icerik,  ders);
        views.setTextViewText(R.id.widget_belge_icerik, belge);
        views.setTextViewText(R.id.widget_zil_icerik,   zil);

        // Widget'a tıklayınca uygulamayı aç (ana sayfa)
        Intent intentAna = new Intent(context, MainActivity.class);
        PendingIntent piAna = PendingIntent.getActivity(context, 0, intentAna,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, piAna);

        // "Not Ekle" butonuna tıklayınca not sayfasına yönlendir
        Intent intentNot = new Intent(context, MainActivity.class);
        intentNot.putExtra(EXTRA_PAGE, PAGE_NOTLAR);
        intentNot.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent piNot = PendingIntent.getActivity(context, 1, intentNot,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_not_btn, piNot);

        mgr.updateAppWidget(widgetId, views);
    }

    /**
     * JavaScript tarafından çağrılır (WidgetPlugin üzerinden).
     * Veriyi SharedPreferences'a kaydeder, widget'ı günceller.
     */
    public static void veriGuncelle(Context context,
                                     String okul, String tarih,
                                     String nobet, String ders,
                                     String belge, String zil) {
        SharedPreferences.Editor ed = context
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit();
        ed.putString(KEY_OKUL,  okul  != null ? okul  : "");
        ed.putString(KEY_TARIH, tarih != null ? tarih : "");
        ed.putString(KEY_NOBET, nobet != null ? nobet : "");
        ed.putString(KEY_DERS,  ders  != null ? ders  : "");
        ed.putString(KEY_BELGE, belge != null ? belge : "");
        ed.putString(KEY_ZIL,   zil   != null ? zil   : "");
        ed.apply();

        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        ComponentName comp = new ComponentName(context, OkulWidget.class);
        int[] ids = mgr.getAppWidgetIds(comp);
        for (int id : ids) updateWidget(context, mgr, id);
    }
}
