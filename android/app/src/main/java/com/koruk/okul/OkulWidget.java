package com.koruk.okul;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.text.Spannable;
import android.text.SpannableString;
import android.text.style.ForegroundColorSpan;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * OkulWidget — Ana ekran widget'ı.
 * 4 sayfa (Etkinlikler / Notlarım / Nöbetçiler / Haberler) TEK RemoteViews
 * ağacında üst üste (FrameLayout) durur, aynı anda sadece biri görünür olur.
 *
 * Tıklama bölgeleri (StackView DEĞİL, düz RemoteViews olduğu için birden
 * fazla FARKLI tıklama alanı tanımlanabiliyor):
 *   - Başlık satırı (header_X)      → sonraki sayfaya geç
 *   - İçerik alanı (X_container)     → uygulamada ilgili sekmeyi aç (deep-link)
 *   - Hafta okları (Etkinlikler)     → sadece takvim haftasını değiştir
 *   - Yenile butonu (üst şerit)      → widget'ı mevcut verilerle yeniden çizer
 *
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

    private static final String KEY_SAYFA_PREFIX  = "widget_sayfa_";  // + widgetId
    private static final String KEY_HAFTA_PREFIX  = "widget_hafta_";  // + widgetId

    public static final String ACTION_SONRAKI_SAYFA  = "com.koruk.okul.ACTION_SONRAKI_SAYFA";
    public static final String ACTION_ONCEKI_HAFTA   = "com.koruk.okul.ACTION_ONCEKI_HAFTA";
    public static final String ACTION_SONRAKI_HAFTA  = "com.koruk.okul.ACTION_SONRAKI_HAFTA";
    public static final String ACTION_YENILE         = "com.koruk.okul.ACTION_YENILE";
    public static final String EXTRA_WIDGET_ID = AppWidgetManager.EXTRA_APPWIDGET_ID;

    private static final int SAYFA_SAYISI = 4;
    private static final String[] GUN_HARFLERI = {"Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"};

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (action == null) return;

        int widgetId = intent.getIntExtra(EXTRA_WIDGET_ID, -1);
        if (widgetId == -1) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);

        if (ACTION_SONRAKI_SAYFA.equals(action)) {
            int mevcutSayfa = prefs.getInt(KEY_SAYFA_PREFIX + widgetId, 0);
            int sonrakiSayfa = (mevcutSayfa + 1) % SAYFA_SAYISI;
            prefs.edit().putInt(KEY_SAYFA_PREFIX + widgetId, sonrakiSayfa).apply();
            updateWidget(context, mgr, widgetId);

        } else if (ACTION_ONCEKI_HAFTA.equals(action)) {
            int hafta = prefs.getInt(KEY_HAFTA_PREFIX + widgetId, 0);
            prefs.edit().putInt(KEY_HAFTA_PREFIX + widgetId, hafta - 1).apply();
            updateWidget(context, mgr, widgetId);

        } else if (ACTION_SONRAKI_HAFTA.equals(action)) {
            int hafta = prefs.getInt(KEY_HAFTA_PREFIX + widgetId, 0);
            prefs.edit().putInt(KEY_HAFTA_PREFIX + widgetId, hafta + 1).apply();
            updateWidget(context, mgr, widgetId);

        } else if (ACTION_YENILE.equals(action)) {
            // Hafta ofsetini de sıfırlayarak "bugüne" dön ve mevcut verilerle yeniden çiz.
            prefs.edit().putInt(KEY_HAFTA_PREFIX + widgetId, 0).apply();
            updateWidget(context, mgr, widgetId);
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager mgr, int widgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String okulAdi = prefs.getString(KEY_OKUL, "Okul Yönetim Paneli");
        int mevcutSayfa = prefs.getInt(KEY_SAYFA_PREFIX + widgetId, 0);
        int haftaOffset = prefs.getInt(KEY_HAFTA_PREFIX + widgetId, 0);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_okul);
        views.setTextViewText(R.id.widget_okul_adi, okulAdi);

        // --- Sayfa verilerini oku ---
        JSONArray etkinlikler = diziOku(prefs, KEY_ETKINLIK_JSON);
        JSONArray notlar      = diziOku(prefs, KEY_NOT_JSON);
        JSONArray nobetciler  = diziOku(prefs, KEY_NOBET_JSON);
        JSONArray haberler    = diziOku(prefs, KEY_HABER_JSON);
        String havaIkon     = prefs.getString(KEY_HAVA_IKON, "⛅");
        String havaSicaklik = prefs.getString(KEY_HAVA_SICAKLIK, "--°");
        String havaAciklama = prefs.getString(KEY_HAVA_ACIKLAMA, "—");

        doldurEtkinlikler(context, views, etkinlikler, havaIkon, havaSicaklik, havaAciklama, haftaOffset);
        doldurListeSayfasi(context, views, "NOTLARIM", 1, notlar,
                R.id.notlar_container, R.id.notlar_bos, R.id.title_notlar, R.id.dots_notlar,
                "Not yok", "📝");
        doldurListeSayfasi(context, views, "NÖBETÇİLER", 2, nobetciler,
                R.id.nobet_container, R.id.nobet_bos, R.id.title_nobet, R.id.dots_nobet,
                "Bugün nöbetçi ataması yok", "🧑‍🏫");
        doldurListeSayfasi(context, views, "HABERLER", 3, haberler,
                R.id.haberler_container, R.id.haberler_bos, R.id.title_haberler, R.id.dots_haberler,
                "Haber yok", "📰");

        // --- Hangi sayfa görünür? ---
        views.setViewVisibility(R.id.root_etkinlikler, mevcutSayfa == 0 ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.root_notlar,      mevcutSayfa == 1 ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.root_nobet,       mevcutSayfa == 2 ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.root_haberler,    mevcutSayfa == 3 ? View.VISIBLE : View.GONE);

        // --- Tıklama bölgeleri ---
        // 1) Başlık satırları → sonraki sayfaya geç
        Intent sonrakiIntent = new Intent(context, OkulWidget.class);
        sonrakiIntent.setAction(ACTION_SONRAKI_SAYFA);
        sonrakiIntent.putExtra(EXTRA_WIDGET_ID, widgetId);
        PendingIntent piSonraki = PendingIntent.getBroadcast(context, widgetId * 10 + 1, sonrakiIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.header_etkinlikler, piSonraki);
        views.setOnClickPendingIntent(R.id.header_notlar, piSonraki);
        views.setOnClickPendingIntent(R.id.header_nobet, piSonraki);
        views.setOnClickPendingIntent(R.id.header_haberler, piSonraki);

        // 2) Hafta okları → sadece takvimi kaydır (sayfa değişmez)
        Intent oncekiHaftaIntent = new Intent(context, OkulWidget.class);
        oncekiHaftaIntent.setAction(ACTION_ONCEKI_HAFTA);
        oncekiHaftaIntent.putExtra(EXTRA_WIDGET_ID, widgetId);
        PendingIntent piOncekiHafta = PendingIntent.getBroadcast(context, widgetId * 10 + 2, oncekiHaftaIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_hafta_onceki, piOncekiHafta);

        Intent sonrakiHaftaIntent = new Intent(context, OkulWidget.class);
        sonrakiHaftaIntent.setAction(ACTION_SONRAKI_HAFTA);
        sonrakiHaftaIntent.putExtra(EXTRA_WIDGET_ID, widgetId);
        PendingIntent piSonrakiHafta = PendingIntent.getBroadcast(context, widgetId * 10 + 3, sonrakiHaftaIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_hafta_sonraki, piSonrakiHafta);

        // 3) Yenile butonu → mevcut verilerle yeniden çiz + haftayı bugüne sıfırla
        Intent yenileIntent = new Intent(context, OkulWidget.class);
        yenileIntent.setAction(ACTION_YENILE);
        yenileIntent.putExtra(EXTRA_WIDGET_ID, widgetId);
        PendingIntent piYenile = PendingIntent.getBroadcast(context, widgetId * 10 + 4, yenileIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.btn_yenile, piYenile);

        // 4) İçerik alanları → uygulamada ilgili sekmeyi aç (deep-link, bkz. MainActivity.handleIntent)
        views.setOnClickPendingIntent(R.id.content_row_etkinlikler, acmaIntentOlustur(context, "takvim", widgetId, 5));
        views.setOnClickPendingIntent(R.id.notlar_container, acmaIntentOlustur(context, "notlar", widgetId, 6));
        views.setOnClickPendingIntent(R.id.notlar_bos, acmaIntentOlustur(context, "notlar", widgetId, 7));
        views.setOnClickPendingIntent(R.id.nobet_container, acmaIntentOlustur(context, "nobet", widgetId, 8));
        views.setOnClickPendingIntent(R.id.nobet_bos, acmaIntentOlustur(context, "nobet", widgetId, 9));
        views.setOnClickPendingIntent(R.id.haberler_container, acmaIntentOlustur(context, "haberler", widgetId, 10));
        views.setOnClickPendingIntent(R.id.haberler_bos, acmaIntentOlustur(context, "haberler", widgetId, 11));

        mgr.updateAppWidget(widgetId, views);
    }

    /** Uygulamayı açıp ilgili sekmeye (page extra'sı ile) yönlendiren PendingIntent üretir. */
    private static PendingIntent acmaIntentOlustur(Context context, String sayfa, int widgetId, int requestOffset) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("page", sayfa);
        return PendingIntent.getActivity(context, widgetId * 10 + requestOffset, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /**
     * JavaScript tarafından çağrılır (WidgetPlugin.sayfalariGuncelle üzerinden).
     * 4 sayfanın verisini + hava durumunu SharedPreferences'a yazar ve widget'ı günceller.
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

    /* ---------------------------------------------------------------- */

    private static String guvenliJson(String s) {
        return (s == null || s.trim().isEmpty()) ? "[]" : s;
    }

    private static JSONArray diziOku(SharedPreferences p, String key) {
        try {
            return new JSONArray(p.getString(key, "[]"));
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    /** "● ○ ○ ○" şeklinde sayfa göstergesi, aktif sayfa vurgulu. */
    private static CharSequence noktalariOlustur(int aktifIndex) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < SAYFA_SAYISI; i++) {
            sb.append(i == aktifIndex ? "●" : "○");
            if (i < SAYFA_SAYISI - 1) sb.append(" ");
        }
        SpannableString ss = new SpannableString(sb.toString());
        int pos = 0;
        for (int i = 0; i < SAYFA_SAYISI; i++) {
            int color = (i == aktifIndex) ? 0xFF5EEAD4 : 0x55FFFFFF;
            ss.setSpan(new ForegroundColorSpan(color), pos, pos + 1, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
            pos += 2;
        }
        return ss;
    }

    private static RemoteViews satirOlustur(Context context, String emoji, String baslik, String alt) {
        RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_row_pill);
        row.setTextViewText(R.id.row_icon, emoji);
        row.setTextViewText(R.id.row_title, baslik);
        if (alt != null && !alt.isEmpty()) {
            row.setViewVisibility(R.id.row_sub, View.VISIBLE);
            row.setTextViewText(R.id.row_sub, alt);
        } else {
            row.setViewVisibility(R.id.row_sub, View.GONE);
        }
        return row;
    }

    /* ---------- Sayfa 0: Etkinlikler ---------- */
    private static void doldurEtkinlikler(Context context, RemoteViews views, JSONArray etkinlikler,
                                           String havaIkon, String havaSicaklik, String havaAciklama,
                                           int haftaOffset) {
        views.setTextViewText(R.id.title_etkinlikler, "ETKİNLİKLER");
        views.setCharSequence(R.id.dots_etkinlikler, "setText", noktalariOlustur(0));

        // Haftalık takvim (Pazartesi başlangıçlı, haftaOffset ile kaydırılabilir)
        Calendar cal = Calendar.getInstance();
        int gun = cal.get(Calendar.DAY_OF_WEEK);
        int pazartesiFarki = (gun == Calendar.SUNDAY) ? -6 : (Calendar.MONDAY - gun);
        cal.add(Calendar.DAY_OF_MONTH, pazartesiFarki + haftaOffset * 7);
        int bugunGunOfAy = Calendar.getInstance().get(Calendar.DAY_OF_MONTH);
        int bugunAy = Calendar.getInstance().get(Calendar.MONTH);
        int bugunYil = Calendar.getInstance().get(Calendar.YEAR);

        int[] labelIds = {R.id.cal0_label, R.id.cal1_label, R.id.cal2_label, R.id.cal3_label, R.id.cal4_label, R.id.cal5_label, R.id.cal6_label};
        int[] dateIds  = {R.id.cal0_date, R.id.cal1_date, R.id.cal2_date, R.id.cal3_date, R.id.cal4_date, R.id.cal5_date, R.id.cal6_date};

        for (int i = 0; i < 7; i++) {
            views.setTextViewText(labelIds[i], GUN_HARFLERI[i]);
            views.setTextViewText(dateIds[i], String.valueOf(cal.get(Calendar.DAY_OF_MONTH)));
            boolean buGunMu = haftaOffset == 0
                    && cal.get(Calendar.DAY_OF_MONTH) == bugunGunOfAy
                    && cal.get(Calendar.MONTH) == bugunAy
                    && cal.get(Calendar.YEAR) == bugunYil;
            views.setInt(dateIds[i], "setBackgroundResource",
                    buGunMu ? R.drawable.widget_today_bg : android.R.color.transparent);
            cal.add(Calendar.DAY_OF_MONTH, 1);
        }

        // Etkinlik listesi (en fazla 4 satır) — hafta geçmişteyken/gelecekteyken de
        // JS'den gelen "bugünün" verisi gösteriliyor; widget'ın kendi başına farklı
        // günlerin etkinliklerini hesaplama yeteneği yok (veri sadece bugün için gelir).
        views.removeAllViews(R.id.etkinlik_container);
        if (etkinlikler.length() == 0) {
            views.addView(R.id.etkinlik_container, satirOlustur(context, "📅", "Bugün için etkinlik yok", null));
        } else {
            for (int i = 0; i < Math.min(etkinlikler.length(), 4); i++) {
                JSONObject o = etkinlikler.optJSONObject(i);
                if (o == null) continue;
                String saat = o.optString("saat", "");
                String baslik = o.optString("baslik", "");
                String emoji = o.optString("emoji", "🔸");
                views.addView(R.id.etkinlik_container, satirOlustur(context, emoji,
                        (saat.isEmpty() ? baslik : saat + " - " + baslik), null));
            }
        }

        views.setTextViewText(R.id.weather_icon, havaIkon);
        views.setTextViewText(R.id.weather_temp, havaSicaklik);
        views.setTextViewText(R.id.weather_desc, havaAciklama);
    }

    /* ---------- Sayfa 1-3: Notlar / Nöbetçi / Haber ---------- */
    private static void doldurListeSayfasi(Context context, RemoteViews views,
                                            String baslik, int dotIndex, JSONArray veri,
                                            int containerId, int bosId, int titleId, int dotsId,
                                            String bosMetin, String varsayilanEmoji) {
        views.setTextViewText(titleId, baslik);
        views.setCharSequence(dotsId, "setText", noktalariOlustur(dotIndex));

        views.removeAllViews(containerId);
        if (veri.length() == 0) {
            views.setViewVisibility(bosId, View.VISIBLE);
            views.setTextViewText(bosId, bosMetin);
            views.setViewVisibility(containerId, View.GONE);
        } else {
            views.setViewVisibility(bosId, View.GONE);
            views.setViewVisibility(containerId, View.VISIBLE);
            for (int i = 0; i < Math.min(veri.length(), 5); i++) {
                JSONObject o = veri.optJSONObject(i);
                if (o == null) continue;
                String baslikTxt = o.optString("baslik", o.optString("ad", ""));
                String altTxt = o.optString("alt", o.optString("yer", ""));
                String emoji = o.optString("emoji", varsayilanEmoji);
                views.addView(containerId, satirOlustur(context, emoji, baslikTxt, altTxt));
            }
        }
    }
}
