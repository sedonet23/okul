package com.koruk.okul;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.SweepGradient;
import android.graphics.Typeface;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * DersZiliCizici — "Ders Zili Geri Sayım" widget'ının GÖRSELİNİ tek bir
 * Bitmap olarak çizer (RemoteViews'in yapamadığı gradyanlı halka, noktalı
 * zaman çizelgesi ve rozetler için). Tasarım, onaylanan HTML önizlemesiyle
 * birebir eşleşecek şekilde koordinatlandırılmıştır.
 *
 * Beklenen JSON veri biçimi (bkz. js/widget-bridge.js):
 * {
 *   "kalanDakika": 14,
 *   "ilerlemeOran": 0.64,        // 0–1, halkada dolu görünen kısım (kalan süre oranı)
 *   "aktifBaslik": "FİZİK",
 *   "aktifYer": "(102)",
 *   "sonrakiBaslik": "TARİH",
 *   "sonrakiYer": "(205)",
 *   "durumMetni": null,          // doluysa (örn. "Bugün ders yok") halka yerine bu gösterilir
 *   "zaman": [ {"saat":"08:30","etiket":"1. Ders","simdi":false}, ... ]
 * }
 */
public class DersZiliCizici {

    public static Bitmap ciz(Context ctx, JSONObject veri, int widthPx, int heightPx) {
        float yogunluk = ctx.getResources().getDisplayMetrics().density;
        Bitmap bmp = Bitmap.createBitmap(Math.max(widthPx, 1), Math.max(heightPx, 1), Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);

        float w = widthPx, h = heightPx;

        // ---------- Dış metal çerçeve + iç cam panel ----------
        RectF disKutu = new RectF(0, 0, w, h);
        float disRadius = 20 * yogunluk;
        Paint disPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        disPaint.setShader(new LinearGradient(0, 0, w, h,
            new int[]{Color.parseColor("#CFD3D8"), Color.parseColor("#4A4E54"), Color.parseColor("#D4D8DC")},
            new float[]{0f, 0.45f, 1f}, Shader.TileMode.CLAMP));
        c.drawRoundRect(disKutu, disRadius, disRadius, disPaint);

        float kenar = 2.4f * yogunluk;
        RectF icKutu = new RectF(kenar, kenar, w - kenar, h - kenar);
        float icRadius = disRadius - kenar;
        Paint icPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        icPaint.setShader(new LinearGradient(icKutu.left, icKutu.top, icKutu.right, icKutu.bottom,
            new int[]{Color.parseColor("#1C2B31"), Color.parseColor("#101A1E"), Color.parseColor("#0B1215")},
            new float[]{0f, 0.55f, 1f}, Shader.TileMode.CLAMP));
        c.drawRoundRect(icKutu, icRadius, icRadius, icPaint);

        float pad = 16 * yogunluk;
        float ix = icKutu.left + pad;
        float iw = icKutu.width() - pad * 2;
        float iy = icKutu.top + 14 * yogunluk;

        // ---------- Başlık satırı ----------
        Paint baslikPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        baslikPaint.setColor(Color.parseColor("#F2F4F5"));
        baslikPaint.setTextSize(12.5f * yogunluk);
        baslikPaint.setTypeface(Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD));
        baslikPaint.setLetterSpacing(0.06f);

        Paint emojiPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        emojiPaint.setTextSize(15 * yogunluk);
        c.drawText("\uD83D\uDD14", ix, iy + 11 * yogunluk, emojiPaint); // 🔔

        c.drawText("DERS ZİLİ GERİ SAYIM", ix + 24 * yogunluk, iy + 10 * yogunluk, baslikPaint);

        Paint gearPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        gearPaint.setTextSize(14 * yogunluk);
        gearPaint.setColor(Color.parseColor("#6D7B80"));
        String gear = "\u2699"; // ⚙
        float gearW = gearPaint.measureText(gear);
        c.drawText(gear, ix + iw - gearW, iy + 10 * yogunluk, gearPaint);

        // Altın gradyan ayraç çizgisi
        float ayracY = iy + 20 * yogunluk;
        Paint ayracPaint = new Paint();
        ayracPaint.setShader(new LinearGradient(ix, 0, ix + iw * 0.65f, 0,
            new int[]{Color.parseColor("#E8B44A"), Color.parseColor("#00E8B44A")},
            null, Shader.TileMode.CLAMP));
        ayracPaint.setStrokeWidth(2 * yogunluk);
        c.drawLine(ix, ayracY, ix + iw, ayracY, ayracPaint);
        Paint ayracAltPaint = new Paint();
        ayracAltPaint.setColor(Color.argb(36, 255, 255, 255));
        ayracAltPaint.setStrokeWidth(1 * yogunluk);
        c.drawLine(ix, ayracY + 2 * yogunluk, ix + iw, ayracY + 2 * yogunluk, ayracAltPaint);

        float govdeY = ayracY + 20 * yogunluk;
        float govdeH = icKutu.bottom - 14 * yogunluk - govdeY;

        // ---------- Sol taraf: "Bir Sonraki Zil" + halka ----------
        float solGenislik = iw * 0.46f;
        float solMerkezX = ix + solGenislik / 2f;

        Paint altBaslikPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        altBaslikPaint.setColor(Color.parseColor("#EEF2F3"));
        altBaslikPaint.setTextSize(13.5f * yogunluk);
        altBaslikPaint.setTypeface(Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD));
        altBaslikPaint.setTextAlign(Paint.Align.CENTER);
        altBaslikPaint.setLetterSpacing(0.01f);
        float altBaslikY = govdeY + 12 * yogunluk;
        c.drawText("BİR SONRAKİ ZİL", solMerkezX, altBaslikY, altBaslikPaint);

        float halkaBoyut = Math.min(solGenislik - 8 * yogunluk, govdeH - 34 * yogunluk);
        halkaBoyut = Math.max(halkaBoyut, 60 * yogunluk);
        float halkaCx = solMerkezX;
        float halkaCy = altBaslikY + 16 * yogunluk + halkaBoyut / 2f;
        float halkaR = halkaBoyut / 2f - 6 * yogunluk;
        RectF halkaRect = new RectF(halkaCx - halkaR, halkaCy - halkaR, halkaCx + halkaR, halkaCy + halkaR);

        // Halka arka planı (soluk)
        Paint halkaArkaPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        halkaArkaPaint.setStyle(Paint.Style.STROKE);
        halkaArkaPaint.setStrokeWidth(9 * yogunluk);
        halkaArkaPaint.setColor(Color.argb(20, 255, 255, 255));
        c.drawOval(halkaRect, halkaArkaPaint);

        // Halka değeri — yeşilden turuncuya SweepGradient
        double ilerlemeOran = veri.optDouble("ilerlemeOran", 0.5);
        if (ilerlemeOran < 0) ilerlemeOran = 0;
        if (ilerlemeOran > 1) ilerlemeOran = 1;
        float sweepAci = (float) (360 * ilerlemeOran);

        Paint halkaPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        halkaPaint.setStyle(Paint.Style.STROKE);
        halkaPaint.setStrokeWidth(9 * yogunluk);
        halkaPaint.setStrokeCap(Paint.Cap.ROUND);
        SweepGradient sweep = new SweepGradient(halkaCx, halkaCy,
            new int[]{Color.parseColor("#4FBF6A"), Color.parseColor("#E0B23F"), Color.parseColor("#E0703F"), Color.parseColor("#E0703F")},
            new float[]{0f, 0.55f, 0.999f, 1f});
        halkaPaint.setShader(sweep);
        c.drawArc(halkaRect, -90, sweepAci, false, halkaPaint);

        // Halka merkezindeki metin
        String durumMetni = veri.optString("durumMetni", null);
        if (durumMetni != null && !durumMetni.isEmpty() && !"null".equals(durumMetni)) {
            Paint durumPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            durumPaint.setColor(Color.parseColor("#CFE0DA"));
            durumPaint.setTextSize(11 * yogunluk);
            durumPaint.setTextAlign(Paint.Align.CENTER);
            durumPaint.setTypeface(Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD));
            drawSarilmisMetin(c, durumMetni, halkaCx, halkaCy, halkaR * 1.5f, durumPaint, 13 * yogunluk);
        } else {
            int kalanDakika = veri.optInt("kalanDakika", 0);
            Paint kalanEtiketPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            kalanEtiketPaint.setColor(Color.parseColor("#9DB3AD"));
            kalanEtiketPaint.setTextSize(8.5f * yogunluk);
            kalanEtiketPaint.setTypeface(Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD));
            kalanEtiketPaint.setTextAlign(Paint.Align.CENTER);
            kalanEtiketPaint.setLetterSpacing(0.1f);
            c.drawText("KALDI", halkaCx, halkaCy - 14 * yogunluk, kalanEtiketPaint);

            Paint sayiPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            sayiPaint.setColor(Color.WHITE);
            sayiPaint.setTextSize(Math.min(halkaR * 0.95f, 30 * yogunluk));
            sayiPaint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
            sayiPaint.setTextAlign(Paint.Align.CENTER);
            c.drawText(String.valueOf(kalanDakika), halkaCx, halkaCy + 8 * yogunluk, sayiPaint);

            Paint birimPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            birimPaint.setColor(Color.parseColor("#CFE0DA"));
            birimPaint.setTextSize(8.5f * yogunluk);
            birimPaint.setTypeface(Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD));
            birimPaint.setTextAlign(Paint.Align.CENTER);
            birimPaint.setLetterSpacing(0.08f);
            c.drawText("DAKİKA", halkaCx, halkaCy + 19 * yogunluk, birimPaint);
        }

        // ---------- Sağ taraf: ders rozetleri + zaman çizelgesi ----------
        float sagX = ix + solGenislik + 10 * yogunluk;
        float sagGenislik = iw - solGenislik - 10 * yogunluk;

        Paint panelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        panelPaint.setColor(Color.argb(10, 255, 255, 255));
        RectF panelRect = new RectF(sagX, govdeY, sagX + sagGenislik, govdeY + govdeH);
        c.drawRoundRect(panelRect, 10 * yogunluk, 10 * yogunluk, panelPaint);

        float rozetY = govdeY + 10 * yogunluk;
        float rozetBoyut = 26 * yogunluk;
        float rozetGenislik = sagGenislik * 0.38f;

        String aktifBaslik = veri.optString("aktifBaslik", "—");
        String aktifYer = veri.optString("aktifYer", "");
        String sonrakiBaslik = veri.optString("sonrakiBaslik", "—");
        String sonrakiYer = veri.optString("sonrakiYer", "");

        rozetCiz(c, sagX + rozetGenislik / 2f, rozetY, rozetBoyut, aktifBaslik, aktifYer,
            Color.parseColor("#3FAE5C"), Color.parseColor("#2C7F43"), yogunluk);

        Paint okPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        okPaint.setColor(Color.parseColor("#5F7570"));
        okPaint.setTextSize(11 * yogunluk);
        okPaint.setTextAlign(Paint.Align.CENTER);
        c.drawText("\u2192", sagX + sagGenislik / 2f, rozetY + rozetBoyut / 2f + 4 * yogunluk, okPaint);

        rozetCiz(c, sagX + sagGenislik - rozetGenislik / 2f, rozetY, rozetBoyut, sonrakiBaslik, sonrakiYer,
            Color.parseColor("#E08A3C"), Color.parseColor("#B0621F"), yogunluk);

        // Noktalı zaman çizelgesi
        float zamanY = rozetY + rozetBoyut + 22 * yogunluk;
        float zamanX = sagX + 12 * yogunluk;
        float noktaX = sagX + 6 * yogunluk;

        Paint cizgiPaint = new Paint();
        cizgiPaint.setColor(Color.argb(40, 255, 255, 255));
        cizgiPaint.setStrokeWidth(1 * yogunluk);
        Path dashPath = new Path();
        dashPath.moveTo(noktaX, zamanY - 6 * yogunluk);
        dashPath.lineTo(noktaX, panelRect.bottom - 6 * yogunluk);
        android.graphics.DashPathEffect dash = new android.graphics.DashPathEffect(new float[]{3 * yogunluk, 4 * yogunluk}, 0);
        cizgiPaint.setPathEffect(dash);
        c.drawPath(dashPath, cizgiPaint);

        JSONArray zamanListesi = veri.optJSONArray("zaman");
        if (zamanListesi != null) {
            float satirYuk = 15.5f * yogunluk;
            float mevcutY = zamanY;
            int maxSatir = Math.max(1, (int) ((panelRect.bottom - zamanY) / satirYuk));
            int n = Math.min(zamanListesi.length(), maxSatir);
            for (int i = 0; i < n; i++) {
                JSONObject satir = zamanListesi.optJSONObject(i);
                if (satir == null) continue;
                String saat = satir.optString("saat", "");
                String etiket = satir.optString("etiket", "");
                boolean simdiMi = satir.optBoolean("simdi", false);
                String metin = saat + (etiket.isEmpty() ? "" : " (" + etiket + ")");

                if (simdiMi) {
                    Paint vurguArka = new Paint(Paint.ANTI_ALIAS_FLAG);
                    vurguArka.setColor(Color.parseColor("#E8B44A"));
                    RectF vurguRect = new RectF(zamanX - 4 * yogunluk, mevcutY - 9 * yogunluk, sagX + sagGenislik - 8 * yogunluk, mevcutY + 3 * yogunluk);
                    c.drawRoundRect(vurguRect, 5 * yogunluk, 5 * yogunluk, vurguArka);
                    Paint vurguYazi = new Paint(Paint.ANTI_ALIAS_FLAG);
                    vurguYazi.setColor(Color.parseColor("#101A1E"));
                    vurguYazi.setTextSize(9 * yogunluk);
                    vurguYazi.setTypeface(Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD));
                    c.drawText(metin, zamanX, mevcutY, vurguYazi);
                } else {
                    Paint noktaPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                    noktaPaint.setColor(Color.parseColor("#5F7570"));
                    c.drawCircle(noktaX, mevcutY - 3 * yogunluk, 2.2f * yogunluk, noktaPaint);

                    Paint satirYazi = new Paint(Paint.ANTI_ALIAS_FLAG);
                    satirYazi.setColor(Color.parseColor("#9FB0AB"));
                    satirYazi.setTextSize(9 * yogunluk);
                    c.drawText(metin, zamanX, mevcutY, satirYazi);
                }
                mevcutY += satirYuk;
            }
        }

        return bmp;
    }

    /** Rozetleri (renkli yuvarlatılmış kare + baş harf + ders adı + yer) çizer. */
    private static void rozetCiz(Canvas c, float merkezX, float y, float boyut,
                                  String baslik, String yer, int renk1, int renk2, float yogunluk) {
        RectF kutu = new RectF(merkezX - boyut / 2f, y, merkezX + boyut / 2f, y + boyut);
        Paint arkaPlan = new Paint(Paint.ANTI_ALIAS_FLAG);
        arkaPlan.setShader(new LinearGradient(kutu.left, kutu.top, kutu.left, kutu.bottom,
            new int[]{renk1, renk2}, null, Shader.TileMode.CLAMP));
        c.drawRoundRect(kutu, 8 * yogunluk, 8 * yogunluk, arkaPlan);

        String harf = (baslik != null && !baslik.isEmpty()) ? baslik.substring(0, 1).toUpperCase() : "?";
        Paint harfPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        harfPaint.setColor(Color.WHITE);
        harfPaint.setTextSize(boyut * 0.5f);
        harfPaint.setTypeface(Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD));
        harfPaint.setTextAlign(Paint.Align.CENTER);
        Paint.FontMetrics fm = harfPaint.getFontMetrics();
        float harfY = kutu.centerY() - (fm.ascent + fm.descent) / 2f;
        c.drawText(harf, merkezX, harfY, harfPaint);

        Paint baslikPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        baslikPaint.setColor(Color.parseColor("#EEF2F2"));
        baslikPaint.setTextSize(8 * yogunluk);
        baslikPaint.setTypeface(Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD));
        baslikPaint.setTextAlign(Paint.Align.CENTER);
        c.drawText(baslik == null ? "" : baslik, merkezX, kutu.bottom + 10 * yogunluk, baslikPaint);

        if (yer != null && !yer.isEmpty()) {
            Paint yerPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            yerPaint.setColor(Color.parseColor("#8EA19B"));
            yerPaint.setTextSize(7 * yogunluk);
            yerPaint.setTextAlign(Paint.Align.CENTER);
            c.drawText(yer, merkezX, kutu.bottom + 19 * yogunluk, yerPaint);
        }
    }

    /** Halka merkezine sığdırmak için basit satır kaydırma (uzun "durum" metinleri için). */
    private static void drawSarilmisMetin(Canvas c, String metin, float cx, float cy, float maxGenislik, Paint p, float satirYuk) {
        String[] kelimeler = metin.split(" ");
        StringBuilder satir = new StringBuilder();
        java.util.List<String> satirlar = new java.util.ArrayList<>();
        for (String k : kelimeler) {
            String aday = satir.length() == 0 ? k : satir + " " + k;
            if (p.measureText(aday) > maxGenislik && satir.length() > 0) {
                satirlar.add(satir.toString());
                satir = new StringBuilder(k);
            } else {
                satir = new StringBuilder(aday);
            }
        }
        if (satir.length() > 0) satirlar.add(satir.toString());
        float baslangicY = cy - (satirlar.size() - 1) * satirYuk / 2f;
        for (int i = 0; i < satirlar.size(); i++) {
            c.drawText(satirlar.get(i), cx, baslangicY + i * satirYuk, p);
        }
    }
}
