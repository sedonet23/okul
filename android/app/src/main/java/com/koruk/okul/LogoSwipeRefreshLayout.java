package com.koruk.okul;

import android.animation.ValueAnimator;
import android.content.Context;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.ViewConfiguration;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.webkit.WebView;
import android.widget.FrameLayout;

/**
 * LogoSwipeRefreshLayout — WebViewAwareSwipeRefreshLayout'un yerini alır.
 *
 * AndroidX SwipeRefreshLayout kendi dairesel CircularProgressDrawable'ını
 * kullanır ve bunu özel bir View ile değiştirmeye izin vermez (renk/boyut
 * dışında). Bu yüzden "aşağı çekince yenile" jestinin kendisini (dokunma
 * takibi, eşik, geri yaylanma) burada yeniden uyguluyoruz; görsel kısmı
 * LogoPullRefreshView üstleniyor (logo sabit, halka dönüyor).
 *
 * WebView'in KENDİ scrollY'sini kontrol etme mantığı, eski
 * WebViewAwareSwipeRefreshLayout.canChildScrollUp()'tan birebir taşındı —
 * aynı sebep: standart View kaydırma sistemi WebView'in iç durumuyla her
 * zaman senkron olmuyor.
 *
 * NOT: Bir ara web'deki (HTML demo) davranışına benzetmek için içeriğin
 * (WebView) parmakla birlikte kaymasını, kare-kök tabanlı "rubber-band"
 * direncini ve OvershootInterpolator'ı denedik — ama gerçek cihazda bu,
 * ÇALIŞAN bir deneyimi bozdu (içerik aşağı kayıp arkada koyu bir boşluk
 * bırakıyordu, dönme/bekleme davranışı da bozuluyordu). Geri alındı.
 * Eğer ileride tekrar denenirse, "arkadaki boşluk" sorununun kaynağı
 * muhtemelen FrameLayout'un kendi arka planının (webView'in ardından
 * görünen alan) şeffaf/uygulama temasıyla eşleşmemesidir — o kısım
 * çözülmeden içerik kaydırma denemesi tekrar aynı soruna yol açar.
 */
public class LogoSwipeRefreshLayout extends FrameLayout {

    public interface OnRefreshListener {
        void onRefresh();
    }

    private static final float DAMPING              = 0.6f; // parmak mesafesi -> görsel mesafe oranı
    private static final int   TRIGGER_DISTANCE_DP   = 135;  // bu kadar (dp) çekilince yenileme tetiklenir
    private static final int   INDICATOR_SIZE_DP     = 48;
    private static final int   INDICATOR_TOP_MARGIN_DP = 80; // eskiden 14dp — çok üstte/başlığın içinde kalıyordu
    private static final int   SPRING_BACK_MS        = 220;

    private final WebView webView;
    private final LogoPullRefreshView indicator;
    private final int touchSlop;
    private final float triggerDistancePx;
    private final float hiddenTranslationY; // indicator'ın tamamen gizliyken durduğu translationY

    private float downY;
    private boolean dragging = false;
    private boolean refreshing = false;
    private boolean pullEnabled = true;
    private float currentDampedDy = 0f;
    private OnRefreshListener listener;
    private ValueAnimator springAnimator;

    public LogoSwipeRefreshLayout(Context context, WebView webView) {
        super(context);
        this.webView = webView;

        float density = context.getResources().getDisplayMetrics().density;
        this.touchSlop = ViewConfiguration.get(context).getScaledTouchSlop();
        this.triggerDistancePx = TRIGGER_DISTANCE_DP * density;

        int indicatorSizePx = Math.round(INDICATOR_SIZE_DP * density);
        int topMarginPx = Math.round(INDICATOR_TOP_MARGIN_DP * density);
        this.hiddenTranslationY = -(indicatorSizePx + topMarginPx);

        indicator = new LogoPullRefreshView(context);
        FrameLayout.LayoutParams indicatorLp = new FrameLayout.LayoutParams(indicatorSizePx, indicatorSizePx);
        indicatorLp.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        indicatorLp.topMargin = topMarginPx;
        indicator.setTranslationY(hiddenTranslationY);
        indicator.setVisibility(INVISIBLE); // konum/kırpma her ne olursa olsun kesin gizli başlasın

        addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        addView(indicator, indicatorLp);
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        // Savunma amaçlı: Activity yeniden oluşturulsa/WebView korunsa bile
        // her ihtimale karşı temiz bir başlangıç durumu garanti edilir.
        webView.setTranslationY(0f);
        indicator.setTranslationY(hiddenTranslationY);
        indicator.setVisibility(INVISIBLE);
        currentDampedDy = 0f;
    }

    public void setOnRefreshListener(OnRefreshListener listener) {
        this.listener = listener;
    }

    /** PullToRefreshPlugin bunu çağırıyor (modal açıkken jesti geçici kapatmak için). */
    public void setPullEnabled(boolean enabled) {
        this.pullEnabled = enabled;
        if (!enabled && dragging) {
            dragging = false;
            springBackTo(0);
        }
    }

    public void setRefreshing(boolean refreshing) {
        if (this.refreshing == refreshing) return;
        this.refreshing = refreshing;
        if (refreshing) {
            indicator.setSpinning(true);
            springBackTo(triggerDistancePx); // gösterge açık kalsın, dönerek yenilensin
        } else {
            indicator.setSpinning(false);
            springBackTo(0); // yenileme bitti, gösterge + içerik başa dönsün
        }
    }

    public boolean isRefreshing() {
        return refreshing;
    }

    private boolean canChildScrollUp() {
        return webView != null && webView.getScrollY() > 0;
    }

    @Override
    public boolean onInterceptTouchEvent(MotionEvent ev) {
        if (!pullEnabled || refreshing) return false;
        switch (ev.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                downY = ev.getY();
                dragging = false;
                return false; // WebView önce kendi kaydırmasını denesin
            case MotionEvent.ACTION_MOVE: {
                if (canChildScrollUp()) return false;
                float dy = ev.getY() - downY;
                if (dy > touchSlop) {
                    dragging = true;
                    return true; // jesti üstleniyoruz
                }
                return false;
            }
            default:
                return false;
        }
    }

    @Override
    public boolean onTouchEvent(MotionEvent ev) {
        if (!pullEnabled || refreshing) return false;
        switch (ev.getActionMasked()) {
            case MotionEvent.ACTION_MOVE: {
                if (!dragging) return false;
                float rawDy = Math.max(0f, ev.getY() - downY);
                float dampedDy = rawDy * DAMPING;
                applyPull(dampedDy);
                return true;
            }
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL: {
                if (!dragging) return false;
                dragging = false;
                if (currentDampedDy >= triggerDistancePx) {
                    setRefreshing(true);
                    if (listener != null) listener.onRefresh();
                } else {
                    springBackTo(0);
                }
                return true;
            }
        }
        return false;
    }

    /** Çekme sırasında SADECE göstergeyi (üstte şeffaf bir katman olarak) hareket
        ettirir — içerik (WebView) yerinde sabit kalır, ekran aşağı kaymaz. */
    private void applyPull(float dampedDy) {
        currentDampedDy = dampedDy;
        float revealed = hiddenTranslationY + dampedDy;
        indicator.setTranslationY(Math.min(0f, revealed));
        indicator.setProgress(dampedDy / triggerDistancePx);
        indicator.setVisibility(dampedDy > 0.5f ? VISIBLE : INVISIBLE);
    }

    /** Belirtilen mesafeye (0 = tamamen kapalı, triggerDistancePx = tam açık) yumuşakça döner. */
    private void springBackTo(float targetDampedDy) {
        if (springAnimator != null) springAnimator.cancel();
        float startDampedDy = currentDampedDy;
        springAnimator = ValueAnimator.ofFloat(startDampedDy, targetDampedDy);
        springAnimator.setDuration(SPRING_BACK_MS);
        springAnimator.setInterpolator(new DecelerateInterpolator());
        springAnimator.addUpdateListener(a -> applyPull((float) a.getAnimatedValue()));
        springAnimator.start();
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        if (springAnimator != null) { springAnimator.cancel(); springAnimator = null; }
    }
}
