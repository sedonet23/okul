package com.koruk.okul;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.widget.RemoteViews;
import java.util.Calendar;
import org.json.JSONObject;

/**
 * DersZiliWidget — "Bir Sonraki Zil" geri sayım widget'ı.
 * Tüm görsel (halka, rozetler, zaman çizelgesi) DersZiliCizici tarafından
 * TEK bir Bitmap olarak çizilir ve bir ImageView'e basılır — RemoteViews'in
 * kendisi gradyan/halka/noktalı çizgi çizemediği için bu yöntem seçildi.
 *
 * ÖNEMLİ: "Kalan dakika" JS tarafından ÖNCEDEN hesaplanıp gönderilMEZ — JS
 * sadece o günün HAM ders programını (segmentler: bas/bit dakika + başlık)
 * gönderir (bkz. js/widget-bridge.js), gerçek geri sayım her çizimde GÜNCEL
 * saate göre DersZiliHesaplayici tarafından hesaplanır. Böylece uygulama
 * kapalıyken de (sadece aşağıdaki AlarmManager veya Android'in kendi widget
 * yenilemesi tetiklendiğinde) sayaç doğru kalır.
 */
public class DersZiliWidget extends AppWidgetProvider {

    public static final String PREFS_NAME = "DersZiliWidgetPrefs";
    public static final String KEY_JSON = "dz_ham_json";
    private static final long YENILEME_ARALIGI_MS = 60_000; // 1 dakika

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId);
        }
        alarmKur(context);
    }

    @Override
    public void onEnabled(Context context) {
        alarmKur(context);
    }

    @Override
    public void onDisabled(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(alarmPendingIntent(context));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager,
                                           int appWidgetId, Bundle newOptions) {
        // Kullanıcı widget'ı yeniden boyutlandırdığında bitmap'i yeni boyuta göre TEKRAR çiz.
        updateWidget(context, appWidgetManager, appWidgetId);
    }

    /** Her dakika widget'ı kendi kendine tazelemesi için tekrarlayan alarm kurar. */
    private static void alarmKur(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        try {
            am.setRepeating(AlarmManager.RTC, System.currentTimeMillis() + YENILEME_ARALIGI_MS,
                YENILEME_ARALIGI_MS, alarmPendingIntent(context));
        } catch (Exception ignored) {
            // Bazı OEM'lerde kısıtlı olabilir — Android'in kendi 30dk'lık
            // updatePeriodMillis'i (bkz. ders_zili_widget_info.xml) yedek olarak çalışır.
        }
    }

    private static PendingIntent alarmPendingIntent(Context context) {
        Intent intent = new Intent(context, DersZiliWidget.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        ComponentName comp = new ComponentName(context, DersZiliWidget.class);
        int[] ids = AppWidgetManager.getInstance(context).getAppWidgetIds(comp);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        return PendingIntent.getBroadcast(context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    public static void updateWidget(Context context, AppWidgetManager mgr, int widgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String jsonStr = prefs.getString(KEY_JSON, null);

        JSONObject hamVeri;
        try {
            hamVeri = jsonStr != null ? new JSONObject(jsonStr) : null;
        } catch (Exception e) {
            hamVeri = null;
        }

        Calendar simdi = Calendar.getInstance();
        int simdiDk = simdi.get(Calendar.HOUR_OF_DAY) * 60 + simdi.get(Calendar.MINUTE);
        JSONObject veri = DersZiliHesaplayici.hesapla(hamVeri, simdiDk);

        Bundle secenekler = mgr.getAppWidgetOptions(widgetId);
        float yogunluk = context.getResources().getDisplayMetrics().density;
        int minWidthDp = secenekler.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 280);
        int minHeightDp = secenekler.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 170);
        int widthPx = Math.round(minWidthDp * yogunluk);
        int heightPx = Math.round(minHeightDp * yogunluk);

        Bitmap bmp = DersZiliCizici.ciz(context, veri, widthPx, heightPx);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_ders_zili);
        views.setImageViewBitmap(R.id.widget_dz_gorsel, bmp);

        // Widget'a tıklayınca uygulamayı Ders Programı sekmesinde aç
        // (bkz. MainActivity.handleIntent + js/app.js BILDIRIM_KATEGORI_SEKME —
        // aynı 'kategori' extra mekanizması bildirimlerle paylaşılıyor).
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("kategori", "dersProgrami");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(context, 2, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_dz_gorsel, pi);

        mgr.updateAppWidget(widgetId, views);
    }

    /** JavaScript tarafından (WidgetPlugin üzerinden) çağrılır — HAM programı kaydeder. */
    public static void veriGuncelle(Context context, String jsonStr) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putString(KEY_JSON, jsonStr).apply();

        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        ComponentName comp = new ComponentName(context, DersZiliWidget.class);
        int[] ids = mgr.getAppWidgetIds(comp);
        for (int id : ids) updateWidget(context, mgr, id);
    }
}
