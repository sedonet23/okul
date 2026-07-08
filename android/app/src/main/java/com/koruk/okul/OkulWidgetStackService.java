package com.koruk.okul;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * OkulWidgetStackService — ana ekran widget'ındaki StackView'ı besler.
 * 4 sayfa: 0=Etkinlikler, 1=Notlarım, 2=Nöbetçiler, 3=Haberler.
 * Veriler JS tarafından (widget-bridge.js → WidgetPlugin.sayfalariGuncelle)
 * SharedPreferences'a JSON olarak yazılır, burada okunup RemoteViews'e basılır.
 */
public class OkulWidgetStackService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new OkulStackFactory(getApplicationContext());
    }

    static class OkulStackFactory implements RemoteViewsFactory {

        private static final int SAYFA_SAYISI = 4;
        private static final String[] GUN_HARFLERI = {"Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"};

        private final Context context;
        private JSONArray etkinlikler = new JSONArray();
        private JSONArray notlar = new JSONArray();
        private JSONArray nobetciler = new JSONArray();
        private JSONArray haberler = new JSONArray();
        private String havaIkon = "⛅", havaSicaklik = "--°", havaAciklama = "—";

        OkulStackFactory(Context context) {
            this.context = context;
        }

        @Override
        public void onCreate() {
            onDataSetChanged();
        }

        @Override
        public void onDataSetChanged() {
            SharedPreferences p = context.getSharedPreferences(OkulWidget.PREFS_NAME, Context.MODE_PRIVATE);
            etkinlikler = diziOku(p, OkulWidget.KEY_ETKINLIK_JSON);
            notlar      = diziOku(p, OkulWidget.KEY_NOT_JSON);
            nobetciler  = diziOku(p, OkulWidget.KEY_NOBET_JSON);
            haberler    = diziOku(p, OkulWidget.KEY_HABER_JSON);
            havaIkon      = p.getString(OkulWidget.KEY_HAVA_IKON, "⛅");
            havaSicaklik  = p.getString(OkulWidget.KEY_HAVA_SICAKLIK, "--°");
            havaAciklama  = p.getString(OkulWidget.KEY_HAVA_ACIKLAMA, "—");
        }

        private JSONArray diziOku(SharedPreferences p, String key) {
            try {
                return new JSONArray(p.getString(key, "[]"));
            } catch (Exception e) {
                return new JSONArray();
            }
        }

        @Override
        public void onDestroy() { }

        @Override
        public int getCount() { return SAYFA_SAYISI; }

        @Override
        public long getItemId(int position) { return position; }

        @Override
        public boolean hasStableIds() { return true; }

        @Override
        public int getViewTypeCount() { return SAYFA_SAYISI; }

        @Override
        public RemoteViews getLoadingView() { return null; }

        @Override
        public RemoteViews getViewAt(int position) {
            switch (position) {
                case 0:  return sayfaEtkinlikler();
                case 1:  return sayfaListe(R.layout.widget_page_notlar, "NOTLARIM", 1,
                                            notlar, "notlar_container", "notlar_bos",
                                            "Not yok", "📝");
                case 2:  return sayfaListe(R.layout.widget_page_nobet, "NÖBETÇİLER", 2,
                                            nobetciler, "nobet_container", "nobet_bos",
                                            "Bugün nöbetçi ataması yok", "🧑‍🏫");
                default: return sayfaListe(R.layout.widget_page_haberler, "HABERLER", 3,
                                            haberler, "haberler_container", "haberler_bos",
                                            "Haber yok", "📰");
            }
        }

        /* ---------- Sayfa 0: Etkinlikler ---------- */
        private RemoteViews sayfaEtkinlikler() {
            RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_page_etkinlikler);
            v.setTextViewText(R.id.page_title, "ETKİNLİKLER");
            v.setCharSequence(R.id.page_dots, "setText", noktalariOlustur(0));

            // Haftalık takvim (Pazartesi başlangıçlı, bugünün haftası)
            Calendar cal = Calendar.getInstance();
            int gun = cal.get(Calendar.DAY_OF_WEEK); // 1=Pazar ... 7=Cumartesi
            int pazartesiFarki = (gun == Calendar.SUNDAY) ? -6 : (Calendar.MONDAY - gun);
            cal.add(Calendar.DAY_OF_MONTH, pazartesiFarki);
            int bugunGunOfAy = Calendar.getInstance().get(Calendar.DAY_OF_MONTH);
            int bugunAy = Calendar.getInstance().get(Calendar.MONTH);

            int[] labelIds = {R.id.cal0_label, R.id.cal1_label, R.id.cal2_label, R.id.cal3_label, R.id.cal4_label, R.id.cal5_label, R.id.cal6_label};
            int[] dateIds  = {R.id.cal0_date, R.id.cal1_date, R.id.cal2_date, R.id.cal3_date, R.id.cal4_date, R.id.cal5_date, R.id.cal6_date};

            for (int i = 0; i < 7; i++) {
                v.setTextViewText(labelIds[i], GUN_HARFLERI[i]);
                v.setTextViewText(dateIds[i], String.valueOf(cal.get(Calendar.DAY_OF_MONTH)));
                boolean buGunMu = cal.get(Calendar.DAY_OF_MONTH) == bugunGunOfAy && cal.get(Calendar.MONTH) == bugunAy;
                v.setInt(dateIds[i], "setBackgroundResource",
                        buGunMu ? R.drawable.widget_today_bg : android.R.color.transparent);
                cal.add(Calendar.DAY_OF_MONTH, 1);
            }

            // Etkinlik listesi (en fazla 4 satır)
            v.removeAllViews(R.id.etkinlik_container);
            if (etkinlikler.length() == 0) {
                v.addView(R.id.etkinlik_container, bosSatir("Bugün için etkinlik yok", "📅"));
            } else {
                for (int i = 0; i < Math.min(etkinlikler.length(), 4); i++) {
                    JSONObject o = etkinlikler.optJSONObject(i);
                    if (o == null) continue;
                    String saat = o.optString("saat", "");
                    String baslik = o.optString("baslik", "");
                    String emoji = o.optString("emoji", "🔸");
                    v.addView(R.id.etkinlik_container, satirOlustur(emoji,
                            (saat.isEmpty() ? baslik : saat + " - " + baslik), null));
                }
            }

            // Hava durumu
            v.setTextViewText(R.id.weather_icon, havaIkon);
            v.setTextViewText(R.id.weather_temp, havaSicaklik);
            v.setTextViewText(R.id.weather_desc, havaAciklama);

            // PendingIntentTemplate'in çalışması için her sayfa kendi tıklama
            // "doldurma" intent'ini bildirmek zorunda (aksi halde dokunma tepki vermez).
            v.setOnClickFillInIntent(R.id.page_root, new Intent());
            return v;
        }

        /* ---------- Sayfa 1-3: Basit liste sayfaları (Notlar / Nöbetçi / Haber) ---------- */
        private RemoteViews sayfaListe(int layoutRes, String baslik, int dotIndex,
                                        JSONArray veri, String containerName, String bosName,
                                        String bosMetin, String varsayilanEmoji) {
            RemoteViews v = new RemoteViews(context.getPackageName(), layoutRes);
            v.setTextViewText(R.id.page_title, baslik);
            v.setCharSequence(R.id.page_dots, "setText", noktalariOlustur(dotIndex));

            int containerId = idBul(containerName);
            int bosId = idBul(bosName);

            v.removeAllViews(containerId);
            if (veri.length() == 0) {
                v.setViewVisibility(bosId, android.view.View.VISIBLE);
                v.setTextViewText(bosId, bosMetin);
                v.setViewVisibility(containerId, android.view.View.GONE);
            } else {
                v.setViewVisibility(bosId, android.view.View.GONE);
                v.setViewVisibility(containerId, android.view.View.VISIBLE);
                for (int i = 0; i < Math.min(veri.length(), 5); i++) {
                    JSONObject o = veri.optJSONObject(i);
                    if (o == null) continue;
                    String baslikTxt = o.optString("baslik", o.optString("ad", ""));
                    String altTxt = o.optString("alt", o.optString("yer", ""));
                    String emoji = o.optString("emoji", varsayilanEmoji);
                    v.addView(containerId, satirOlustur(emoji, baslikTxt, altTxt));
                }
            }
            v.setOnClickFillInIntent(R.id.page_root, new Intent());
            return v;
        }

        private int idBul(String name) {
            return context.getResources().getIdentifier(name, "id", context.getPackageName());
        }

        private RemoteViews satirOlustur(String emoji, String baslik, String alt) {
            RemoteViews row = new RemoteViews(context.getPackageName(), R.layout.widget_row_pill);
            row.setTextViewText(R.id.row_icon, emoji);
            row.setTextViewText(R.id.row_title, baslik);
            if (alt != null && !alt.isEmpty()) {
                row.setViewVisibility(R.id.row_sub, android.view.View.VISIBLE);
                row.setTextViewText(R.id.row_sub, alt);
            } else {
                row.setViewVisibility(R.id.row_sub, android.view.View.GONE);
            }
            return row;
        }

        private RemoteViews bosSatir(String metin, String emoji) {
            return satirOlustur(emoji, metin, null);
        }

        /** "● ○ ○ ○" şeklinde sayfa göstergesi, aktif sayfa vurgulu. */
        private CharSequence noktalariOlustur(int aktifIndex) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < SAYFA_SAYISI; i++) {
                sb.append(i == aktifIndex ? "●" : "○");
                if (i < SAYFA_SAYISI - 1) sb.append(" ");
            }
            android.text.SpannableString ss = new android.text.SpannableString(sb.toString());
            int pos = 0;
            for (int i = 0; i < SAYFA_SAYISI; i++) {
                int len = 1;
                int color = (i == aktifIndex) ? 0xFF5EEAD4 : 0x55FFFFFF;
                ss.setSpan(new android.text.style.ForegroundColorSpan(color), pos, pos + len,
                        android.text.Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
                pos += 2; // karakter + boşluk
            }
            return ss;
        }
    }
}
