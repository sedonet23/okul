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
 * Beklenen JSON veri biçimi (bkz. js/widget-bridge.js ve DersZiliHesaplayici):
 * {
 *   "kalanDeger": 14,            // "kalanDakika" da desteklenir (geriye dönük uyumluluk)
 *   "kalanBirim": "DAKİKA",      // örn. tatil modunda "GÜN"
 *   "kalanEtiket": "KALDI",      // örn. tatil modunda "OKULA KALAN"
 *   "ilerlemeOran": 0.64,        // 0–1, halkada dolu görünen kısım (kalan süre oranı)
 *   "aktifBaslik": "FİZİK",
 *   "aktifYer": "(102)",
 *   "sonrakiBaslik": "TARİH",
 *   "sonrakiYer": "(205)",
 *   "durumMetni": null,          // doluysa (örn. "Bugün ders yok") halka yerine bu gösterilir
 *   "altNot": null,              // "zaman" yokken (geniş mod) halkanın altına yazılan ek not
 *   "zaman": [ {"saat":"08:30","etiket":"1. Ders","simdi":false}, ... ]  // varsa dar mod (rozet+çizelge) kullanılır
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

        // "zaman" listesi sadece normal ders gunlerinde dolar (bkz. DersZiliHesaplayici).
        // Tatil modu / "ders yok" gibi durumlarda sag taraftaki rozet+cizelge paneli
        // gosterilecek bir sey olmadigindan, halkayi tum genisleyen genis moda gecilir.
        JSONArray zamanListesi = veri.optJSONArray("zaman");
        boolean genisMod = (zamanListesi == null);

        // ---------- Sol taraf: "Bir Sonraki Zil" + halka ----------
        float solGenislik = genisMod ? iw : iw * 0.46f;
        float solMerkezX = ix + solGenislik / 2f;

        Paint altBaslikPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        altBaslikPaint.setColor(Color.parseColor("#EEF2F3"));
        altBaslikPaint.setTextSize(12f * yogunluk);
        altBaslikPaint.setTypeface(Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD));
        altBaslikPaint.setTextAlign(Paint.Align.CENTER);
        altBaslikPaint.setLetterSpacing(0.01f);
        float altBaslikY = govdeY + 10 * yogunluk;
        c.drawText("BİR SONRAKİ ZİL", solMerkezX, altBaslikY, altBaslikPaint);

        // Halka artik neredeyse tum dikey/yatay alani kapliyor (onceki surumde
        // kenar paylari cok fazlaydi, bu yuzden "buyume olmadi" hissi veriyordu).
        float halkaBoyut = Math.min(solGenislik - 2 * yogunluk, govdeH - 14 * yogunluk);
        halkaBoyut = Math.max(halkaBoyut, genisMod ? 100 * yogunluk : 82 * yogunluk);
        float halkaCx = solMerkezX;
        float halkaCy = altBaslikY + 6 * yogunluk + halkaBoyut / 2f;
        float kalinlik = 13 * yogunluk;
        float halkaR = halkaBoyut / 2f - kalinlik / 2f - 1 * yogunluk;
        RectF halkaRect = new RectF(halkaCx - halkaR, halkaCy - halkaR, halkaCx + halkaR, halkaCy + halkaR);

        Paint halkaArkaPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        halkaArkaPaint.setStyle(Paint.Style.STROKE);
        halkaArkaPaint.setStrokeWidth(kalinlik);
        halkaArkaPaint.setColor(Color.argb(20, 255, 255, 255));
        c.drawOval(halkaRect, halkaArkaPaint);

        // Halka değeri — yeşilden turuncuya SweepGradient
        double ilerlemeOran = veri.optDouble("ilerlemeOran", 0.5);
        if (ilerlemeOran < 0) ilerlemeOran = 0;
        if (ilerlemeOran > 1) ilerlemeOran = 1;
        float sweepAci = (float) (360 * ilerlemeOran);

        Paint halkaPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        halkaPaint.setStyle(Paint.Style.STROKE);
        halkaPaint.setStrokeWidth(kalinlik);
        halkaPaint.setStrokeCap(Paint.Cap.ROUND);

        // ÖNEMLİ: SweepGradient rengi daima tam 360° üzerine sabit konumlarla
        // yerleştirilir. Halka her zaman -90°'den (saat 12) başlayıp sadece
        // sweepAci kadar çizildiği için, sabit 0–1 konumlu bir gradyan kullanılırsa
        // dolan kısım kısaysa (örn. birkaç dakika kaldığında) sadece dar bir renk
        // dilimi görünüyor, dolan kısım uzunsa da eski renk dizisinin başı ve sonu
        // aynı olmadığından (yeşil ≠ koyu turuncu) tam da halkanın açılma
        // noktasında SERT bir dikiş (ani renk sıçraması) oluşuyordu — "sadece 2
        // renk var" şikayeti buradan geliyordu.
        // Çözüm: renk duraklarını HER SEFERİNDE mevcut sweepAci'ye göre ölçekle,
        // böylece yeşilden turuncuya tam geçiş her zaman çizilen kısmın TAMAMINA
        // yayılır (kısa dilimde de, uzun dilimde de kademeli görünür) ve
        // görünmeyen kısımda kalan dikiş hiç çizilmez.
        float t = Math.max(sweepAci / 360f, 0.0001f);
        float[] temelKonum = {0f, 0.25f, 0.5f, 0.75f, 1f};
        float[] olcekliKonum = new float[temelKonum.length];
        for (int i = 0; i < temelKonum.length; i++) olcekliKonum[i] = temelKonum[i] * t;

        SweepGradient sweep = new SweepGradient(halkaCx, halkaCy,
            new int[]{
                Color.parseColor("#4FBF6A"), // yeşil (halka başlangıcı)
                Color.parseColor("#8CC24E"), // yeşil-sarı arası
                Color.parseColor("#E0B23F"), // sarı-turuncu
                Color.parseColor("#E0983F"), // orta turuncu
                Color.parseColor("#E0703F")  // koyu turuncu (halkanın ucu / şimdiki an)
            },
            olcekliKonum);
        android.graphics.Matrix sweepMatrix = new android.graphics.Matrix();
        sweepMatrix.postRotate(-90, halkaCx, halkaCy);
        sweep.setLocalMatrix(sweepMatrix);
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
            // Ders/teneffus icin dakika, tatil modu icin gun sayisi - alanlar genericlestirildi
            // (bkz DersZiliHesaplayici: kalanDeger/kalanBirim/kalanEtiket, geriye donuk
            // uyumluluk icin kalanDakika/"DAKIKA" varsayilanlarina duser).
            // Kullanicinin istegiyle: "KALDI 3 DAKİKA" yerine, alt satirda "3 dakika
            // kaldi" seklinde dogal okunan bir sira kullaniliyor. Ust etiket satiri
            // sadece acikca verilmisse (orn. tatil modunda "OKULA KALAN") gosterilir.
            int kalanDeger = veri.optInt("kalanDeger", veri.optInt("kalanDakika", 0));
            String birim = veri.optString("kalanBirim", "DAKİKA");
            String etiket = veri.optString("kalanEtiket", "");
            java.util.Locale trLocale = new java.util.Locale("tr", "TR");
            String altYazi = birim.toLowerCase(trLocale) + " kaldı";
            boolean etiketVar = etiket != null && !etiket.isEmpty();

            Paint kalanEtiketPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            kalanEtiketPaint.setColor(Color.parseColor("#9DB3AD"));
            kalanEtiketPaint.setTextSize(clampPx(halkaR * 0.20f, 7f * yogunluk, 9f * yogunluk));
            kalanEtiketPaint.setTypeface(Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD));
            kalanEtiketPaint.setTextAlign(Paint.Align.CENTER);
            kalanEtiketPaint.setLetterSpacing(0.1f);

            Paint sayiPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            sayiPaint.setColor(Color.WHITE);
            sayiPaint.setTextSize(clampPx(halkaR * 0.82f, 18f * yogunluk, 36f * yogunluk));
            sayiPaint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.BOLD));
            sayiPaint.setTextAlign(Paint.Align.CENTER);

            Paint birimPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            birimPaint.setColor(Color.parseColor("#CFE0DA"));
            birimPaint.setTextSize(clampPx(halkaR * 0.20f, 7f * yogunluk, 9.5f * yogunluk));
            birimPaint.setTypeface(Typeface.create(Typeface.DEFAULT_BOLD, Typeface.BOLD));
            birimPaint.setTextAlign(Paint.Align.CENTER);
            birimPaint.setLetterSpacing(0.02f);

            // Satirlari, gercek yukseklikleriyle (FontMetrics) dikeyde ortalayarak
            // diz - boylece halka/font boyutu ne olursa olsun satirlar birbirine
            // girmez (eski sabit ofsetli duzende bu oluyordu).
            Paint.FontMetrics fmE = kalanEtiketPaint.getFontMetrics();
            Paint.FontMetrics fmS = sayiPaint.getFontMetrics();
            Paint.FontMetrics fmB = birimPaint.getFontMetrics();
            float etiketH = etiketVar ? (fmE.descent - fmE.ascent) : 0f;
            float sayiH = fmS.descent - fmS.ascent;
            float birimH = fmB.descent - fmB.ascent;
            float araBosluk = Math.max(halkaR * 0.05f, 2 * yogunluk);
            float ustBosluk = etiketVar ? araBosluk : 0f;

            float toplamY = etiketH + ustBosluk + sayiH + araBosluk + birimH;
            float baslangicY = halkaCy - toplamY / 2f;

            if (etiketVar) {
                c.drawText(etiket, halkaCx, baslangicY - fmE.ascent, kalanEtiketPaint);
            }
            c.drawText(String.valueOf(kalanDeger), halkaCx,
                baslangicY + etiketH + ustBosluk - fmS.ascent, sayiPaint);
            c.drawText(altYazi, halkaCx,
                baslangicY + etiketH + ustBosluk + sayiH + araBosluk - fmB.ascent, birimPaint);
        }

        // Genis modda (tatil vb.) halkanin altina ek bir aciklama satiri (orn. tam tarih)
        String altNot = veri.optString("altNot", null);
        if (genisMod && altNot != null && !altNot.isEmpty() && !"null".equals(altNot)) {
            Paint altNotPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            altNotPaint.setColor(Color.parseColor("#9DB3AD"));
            altNotPaint.setTextSize(10.5f * yogunluk);
            altNotPaint.setTextAlign(Paint.Align.CENTER);
            float altNotY = halkaCy + halkaR + 24 * yogunluk;
            drawSarilmisMetin(c, altNot, halkaCx, altNotY, solGenislik - 24 * yogunluk, altNotPaint, 13 * yogunluk);
        }

        // ---------- Sağ taraf: ders rozetleri + zaman çizelgesi ----------
        // Genis modda (tatil / ders yok) gosterilecek rozet ya da zaman satiri
        // olmadigindan bu blok tamamen atlanir; halka zaten tum genisligi kaplar.
        if (genisMod) return bmp;

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
        // Rozetin altında iki satır yazı var: ders adı (kutu.bottom+10dp) ve yer
        // (kutu.bottom+19dp). Önceki 22dp boşluk bu ikinci satırla çakışıyordu
        // ("İngilizce (5-A)" ile "00:05 (İngilizce)" üst üste biniyordu) —
        // zaman çizelgesini daha aşağıdan başlatarak aralarına net boşluk konuldu.
        float zamanY = rozetY + rozetBoyut + 34 * yogunluk;
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

    /** Bir degeri [min,max] araligina sikistirir - font boyutlarini halka boyutuna gore olceklerken kullanilir. */
    private static float clampPx(float deger, float min, float max) {
        return Math.max(min, Math.min(deger, max));
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
