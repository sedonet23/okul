package com.koruk.okul;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.SweepGradient;
import android.graphics.drawable.Drawable;
import android.view.View;
import androidx.core.content.ContextCompat;

/**
 * LogoPullRefreshView — "aşağı çekince yenile" göstergesi.
 * Standart Android'in dairesel dönen spinner'ı yerine: okul logosu ortada
 * SABİT durur, etrafında teal tonlarında gradyanlı bir halka döner/dolar.
 *
 * Kullanım: LogoSwipeRefreshLayout bu view'i tek bir gösterge olarak
 * yerleştirir; çekme sırasında setProgress(0..1) çağrılır (halka dolar),
 * bırakılınca setSpinning(true) ile sürekli dönme animasyonuna geçer.
 *
 * Logo yükleme yöntemi OkulFirebaseMessagingService.okulLogosuBitmapAl()
 * ile birebir aynı gerekçeyle Drawable+Canvas kullanır: ic_launcher_round
 * Android 8+'ta adaptif (XML tabanlı) bir kaynak olduğundan
 * BitmapFactory.decodeResource() ile okunamaz, sessizce null döner.
 */
public class LogoPullRefreshView extends View {

    private static final int RING_COLOR_START = 0xFF0A7A7A; // --brand
    private static final int RING_COLOR_END    = 0xFF7FD4C7; // açık teal
    private static final int RING_TRACK_COLOR  = 0x1F0A7A7A; // hafif iz (arka plan halkası)
    private static final float RING_STROKE_DP  = 3.2f;
    private static final float LOGO_PADDING_DP = 6f; // halka ile logo arasındaki boşluk

    private final Paint trackPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint ringPaint  = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint logoBgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint shadowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint logoPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF ringRect = new RectF();

    private Bitmap logoBitmap;
    private BitmapShader logoShader;

    private float progress = 0f;      // 0..1 — çekme mesafesiyle dolan halka
    private float spinAngle = 0f;     // sürekli dönme sırasında güncel açı
    private boolean spinning = false;
    private ValueAnimator spinAnimator;

    public LogoPullRefreshView(Context context) {
        super(context);
        init(context);
    }

    private void init(Context context) {
        float density = context.getResources().getDisplayMetrics().density;

        trackPaint.setStyle(Paint.Style.STROKE);
        trackPaint.setStrokeWidth(RING_STROKE_DP * density);
        trackPaint.setColor(RING_TRACK_COLOR);
        trackPaint.setStrokeCap(Paint.Cap.ROUND);

        ringPaint.setStyle(Paint.Style.STROKE);
        ringPaint.setStrokeWidth(RING_STROKE_DP * density);
        ringPaint.setStrokeCap(Paint.Cap.ROUND);

        logoBgPaint.setStyle(Paint.Style.FILL);
        logoBgPaint.setColor(Color.WHITE);

        shadowPaint.setStyle(Paint.Style.FILL);
        shadowPaint.setColor(0x330A7A7A);

        setLayerType(View.LAYER_TYPE_SOFTWARE, null); // Paint.setShadowLayer düzgün çalışsın

        logoBitmap = okulLogosuBitmapAl(context);
        setWillNotDraw(false);
    }

    /* bkz. OkulFirebaseMessagingService.okulLogosuBitmapAl() — aynı yöntem,
       adaptif ikonu (ic_launcher_round) güvenli şekilde Bitmap'e çevirir. */
    private static Bitmap okulLogosuBitmapAl(Context context) {
        try {
            Drawable drawable = ContextCompat.getDrawable(context, R.mipmap.ic_launcher_round);
            if (drawable == null) return null;
            int genislik = drawable.getIntrinsicWidth() > 0 ? drawable.getIntrinsicWidth() : 192;
            int yukseklik = drawable.getIntrinsicHeight() > 0 ? drawable.getIntrinsicHeight() : 192;
            Bitmap bitmap = Bitmap.createBitmap(genislik, yukseklik, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            drawable.draw(canvas);
            return bitmap;
        } catch (Exception e) {
            return null;
        }
    }

    /** Çekme mesafesiyle orantılı ilerleme (0..1). Dönme sırasında dikkate alınmaz. */
    public void setProgress(float p) {
        this.progress = Math.max(0f, Math.min(1f, p));
        if (!spinning) invalidate();
    }

    /** true: bırakıldıktan sonraki "yenileniyor" durumunda sürekli döner. */
    public void setSpinning(boolean spin) {
        if (this.spinning == spin) return;
        this.spinning = spin;
        if (spin) {
            if (spinAnimator != null) spinAnimator.cancel();
            spinAnimator = ValueAnimator.ofFloat(0f, 360f);
            spinAnimator.setDuration(900);
            spinAnimator.setRepeatCount(ValueAnimator.INFINITE);
            spinAnimator.setInterpolator(new android.view.animation.LinearInterpolator());
            spinAnimator.addUpdateListener(a -> {
                spinAngle = (float) a.getAnimatedValue();
                invalidate();
            });
            spinAnimator.start();
        } else {
            if (spinAnimator != null) { spinAnimator.cancel(); spinAnimator = null; }
            spinAngle = 0f;
            invalidate();
        }
    }

    public boolean isSpinning() {
        return spinning;
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        if (logoBitmap != null) {
            logoShader = new BitmapShader(logoBitmap, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP);
        }
        float density = getResources().getDisplayMetrics().density;
        float stroke = RING_STROKE_DP * density;
        float inset = stroke / 2f;
        ringRect.set(inset, inset, w - inset, h - inset);

        int[] colors = { RING_COLOR_START, RING_COLOR_END, RING_COLOR_START };
        SweepGradient gradient = new SweepGradient(w / 2f, h / 2f, colors, null);
        ringPaint.setShader(gradient);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int w = getWidth(), h = getHeight();
        if (w == 0 || h == 0) return;
        float density = getResources().getDisplayMetrics().density;

        // Arka iz halkası (her zaman tam çember, hafif renkte)
        canvas.drawOval(ringRect, trackPaint);

        // İlerleme/dönme yayı
        canvas.save();
        float startAngle;
        float sweepAngle;
        if (spinning) {
            startAngle = spinAngle - 90f;
            sweepAngle = 100f; // sabit uzunlukta bir yay, dönerek "yükleniyor" hissi verir
        } else {
            startAngle = -90f;
            sweepAngle = 360f * progress;
        }
        if (sweepAngle > 0) {
            canvas.drawArc(ringRect, startAngle, sweepAngle, false, ringPaint);
        }
        canvas.restore();

        // Logo — her zaman dik, sabit; sadece çekme ilerledikçe hafifçe büyüyüp belirginleşir
        float logoPadding = (LOGO_PADDING_DP + RING_STROKE_DP) * density;
        float logoDiameter = Math.min(w, h) - logoPadding * 2f;
        if (logoDiameter <= 0) return;
        float cx = w / 2f, cy = h / 2f;
        float logoRadius = logoDiameter / 2f;

        shadowPaint.setAlpha(spinning ? 140 : (int) (80 + 60 * progress));
        canvas.drawCircle(cx, cy + logoRadius * 0.08f, logoRadius * 1.02f, shadowPaint);
        canvas.drawCircle(cx, cy, logoRadius, logoBgPaint);

        if (logoShader != null) {
            canvas.save();
            canvas.translate(cx - logoRadius, cy - logoRadius);
            float scale = (logoDiameter) / logoBitmap.getWidth();
            android.graphics.Matrix matrix = new android.graphics.Matrix();
            matrix.setScale(scale, scale);
            logoShader.setLocalMatrix(matrix);
            logoPaint.setShader(logoShader);
            canvas.drawCircle(logoRadius, logoRadius, logoRadius * 0.98f, logoPaint);
            canvas.restore();
        }
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        if (spinAnimator != null) { spinAnimator.cancel(); spinAnimator = null; }
    }
}
