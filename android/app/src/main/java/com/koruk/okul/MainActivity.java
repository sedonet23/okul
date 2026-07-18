package com.koruk.okul;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
// (androidx SwipeRefreshLayout artık kullanılmıyor — bkz. LogoSwipeRefreshLayout)
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;

public class MainActivity extends BridgeActivity {

    private LogoSwipeRefreshLayout swipeRefresh;
    private long sonGeriTusuZamani = 0;
    private android.widget.FrameLayout baslangicYuklemeKatmani;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetPlugin.class);
        registerPlugin(PushNotificationsPlugin.class);
        registerPlugin(PrintPlugin.class);
        registerPlugin(StatusBarPlugin.class);
        registerPlugin(SavePlugin.class);
        registerPlugin(PullToRefreshPlugin.class);
        registerPlugin(UpdatePlugin.class);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
        setupPullToRefresh();
        setupBaslangicYuklemesi();
        kenarJestiniAyir();
    }

    /* YENİ: Uygulama açılışında WebView sayfayı yükleyip JS/CSS/ilk render
       tamamlanana kadar EKRANIN ORTASINDA dönen bir logo göstergesi + kısa
       bir "Bağlanıyor…" yazısı gösterir. Sayfa yüklenince (Capacitor'ın
       resmi WebViewListener.onPageLoaded kancası — WebViewClient'ı
       DEĞİŞTİRMEDEN, bridge'in kendi mekanizmasına eklenir) katman
       kaybolur. Mevcut aşağı-çekince-yenile göstergesinden (LogoPullRefreshView,
       üstte küçük) ayrı, bağımsız bir katmandır — ikisi çakışmaz. */
    private void setupBaslangicYuklemesi() {
        WebView webView = getBridge().getWebView();
        android.view.ViewGroup parent = (android.view.ViewGroup) webView.getParent();
        if (parent == null) return;

        float density = getResources().getDisplayMetrics().density;
        int logoBoyutPx = Math.round(96 * density);

        baslangicYuklemeKatmani = new android.widget.FrameLayout(this);
        baslangicYuklemeKatmani.setBackgroundColor(0xFF0A6E6E); // android:windowBackground / colorPrimary ile birebir — splash'tan WebView'e geçişte "flaş" olmasın

        android.widget.LinearLayout icerik = new android.widget.LinearLayout(this);
        icerik.setOrientation(android.widget.LinearLayout.VERTICAL);
        icerik.setGravity(android.view.Gravity.CENTER);

        LogoPullRefreshView spinner = new LogoPullRefreshView(this);
        android.widget.LinearLayout.LayoutParams spinnerLp =
            new android.widget.LinearLayout.LayoutParams(logoBoyutPx, logoBoyutPx);
        icerik.addView(spinner, spinnerLp);
        spinner.setSpinning(true);

        android.widget.TextView metin = new android.widget.TextView(this);
        metin.setText("Bağlanıyor…");
        metin.setTextColor(0xFFFFFFFF); // koyu teal zemin üzerinde beyaz — kontrast için
        metin.setTextSize(14f);
        android.widget.LinearLayout.LayoutParams metinLp = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        metinLp.topMargin = Math.round(14 * density);
        icerik.addView(metin, metinLp);

        android.widget.FrameLayout.LayoutParams icerikLp = new android.widget.FrameLayout.LayoutParams(
            android.widget.FrameLayout.LayoutParams.WRAP_CONTENT,
            android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
        );
        icerikLp.gravity = android.view.Gravity.CENTER;
        baslangicYuklemeKatmani.addView(icerik, icerikLp);

        // swipeRefresh, webView'i zaten kendi parent'ına eklemiş durumda —
        // bu katmanı EN ÜSTE (son child olarak) ekliyoruz ki her şeyin üzerinde görünsün.
        parent.addView(baslangicYuklemeKatmani, new android.widget.FrameLayout.LayoutParams(
            android.view.ViewGroup.LayoutParams.MATCH_PARENT,
            android.view.ViewGroup.LayoutParams.MATCH_PARENT
        ));

        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView view) {
                baslangicYuklemesiniGizle();
            }
        });
    }

    private void baslangicYuklemesiniGizle() {
        if (baslangicYuklemeKatmani == null) return;
        baslangicYuklemeKatmani.animate()
            .alpha(0f)
            .setDuration(220)
            .withEndAction(() -> {
                if (baslangicYuklemeKatmani != null) {
                    android.view.ViewGroup p = (android.view.ViewGroup) baslangicYuklemeKatmani.getParent();
                    if (p != null) p.removeView(baslangicYuklemeKatmani);
                    baslangicYuklemeKatmani = null;
                }
            })
            .start();
    }

    /* Android 10+ (API 29) sistem "geri" hareket algılaması, ekranın sol
       kenarına yakın başlayan sağa kaydırmaları WebView'e ULAŞTIRMADAN
       kendi başına yutuyor — bu yüzden uygulama içindeki "kaydırınca menü
       aç" jesti hiç tetiklenmiyordu. setSystemGestureExclusionRects ile
       sol kenardan ~36dp'lik bir şeridi sistem hareketinden muaf tutup
       dokunuşun WebView'e (ve dolayısıyla JS'e) ulaşmasını sağlıyoruz. */
    private void kenarJestiniAyir() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return;
        final android.webkit.WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;

        Runnable uygula = () -> {
            int yukseklik = webView.getHeight();
            if (yukseklik <= 0) return;
            float yogunluk = getResources().getDisplayMetrics().density;
            int genislikPx = Math.round(36 * yogunluk);
            webView.setSystemGestureExclusionRects(
                java.util.Collections.singletonList(new android.graphics.Rect(0, 0, genislikPx, yukseklik))
            );
        };

        webView.post(uygula);
        webView.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or_, ob) -> uygula.run());
    }

    /* Donanım geri tuşu: önce web tarafındaki geriTusuIsle() fonksiyonuna
       sor — açık bir modal/detay panel/menü varsa veya sekme geçmişi
       boş değilse JS tarafı kendi içinde geri gider ve 'handled' döner.
       Web tarafı zaten en üst seviyedeyse ('exit') çift basışla çıkış
       uygulanır: ilk basışta uyarı gösterilir, 2 saniye içinde tekrar
       basılırsa uygulama kapanır. */
    @Override
    public void onBackPressed() {
        android.webkit.WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) { super.onBackPressed(); return; }

        webView.evaluateJavascript(
            "(function(){ try { return (typeof geriTusuIsle==='function') ? geriTusuIsle() : 'exit'; } catch(e){ return 'exit'; } })()",
            (String sonuc) -> {
                String temiz = sonuc != null ? sonuc.replace("\"", "") : "exit";
                if ("handled".equals(temiz)) return;

                long simdi = System.currentTimeMillis();
                if (simdi - sonGeriTusuZamani < 2000) {
                    finish();
                } else {
                    sonGeriTusuZamani = simdi;
                    android.widget.Toast.makeText(MainActivity.this, "Çıkmak için tekrar geri tuşuna basın", android.widget.Toast.LENGTH_SHORT).show();
                }
            }
        );
    }

    /* JS tarafından (bkz. PullToRefreshPlugin) modal/detay paneli açıkken
       yenileme jestini geçici olarak kapatmak/açmak için çağrılır. */
    public void setPullToRefreshEnabled(boolean enabled) {
        if (swipeRefresh != null) swipeRefresh.setPullEnabled(enabled);
    }

    private void setupPullToRefresh() {
        WebView webView = getBridge().getWebView();
        android.view.ViewGroup parent = (android.view.ViewGroup) webView.getParent();
        if (parent == null) return;

        int index = parent.indexOfChild(webView);
        parent.removeView(webView); // ÖNEMLİ: yeni konteynerin constructor'ı webView'i kendine
                                     // ekliyor (addView) — önce eski parent'tan çıkarılmalı,
                                     // aksi halde "child already has a parent" hatası oluşur.

        // ÖNEMLİ: LogoSwipeRefreshLayout, WebView'in GERÇEK scrollY
        // değerini doğrudan okuyarak "en üstteyim" kararını verir — bkz.
        // LogoSwipeRefreshLayout.canChildScrollUp() içindeki gerekçe
        // (Android'in genel View kaydırma sistemi WebView'in iç durumuyla
        // her zaman senkron olmuyor).
        swipeRefresh = new LogoSwipeRefreshLayout(this, webView);

        android.widget.FrameLayout.LayoutParams lp = new android.widget.FrameLayout.LayoutParams(
            android.view.ViewGroup.LayoutParams.MATCH_PARENT,
            android.view.ViewGroup.LayoutParams.MATCH_PARENT
        );
        swipeRefresh.setLayoutParams(lp);
        parent.addView(swipeRefresh, index);

        swipeRefresh.setOnRefreshListener(() -> {
            webView.reload();
            swipeRefresh.setRefreshing(false);
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String kategori = intent.getStringExtra("kategori");
        if (kategori != null) {
            getBridge().getWebView().evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('bildirimAcildi', " +
                "{ detail: { kategori: '" + kategori + "' } }));",
                null
            );
        }
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String page = intent.getStringExtra("page");
        if (page != null) {
            getBridge().getWebView().postDelayed(() ->
                getBridge().getWebView().evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('widgetSayfaAc', " +
                    "{ detail: { page: '" + page + "' } }));",
                    null
                ), 300
            );
        }

        // DÜZELTME: Bu extra daha önce sadece onNewIntent() (uygulama zaten
        // açıkken bildirime dokunma) içinde okunuyordu. Uygulama KAPALIYKEN
        // bir bildirime dokunulursa onCreate() çağrılır (onNewIntent değil),
        // ve bu durumda kategori hiç JS'e iletilmiyordu — bildirim uygulamayı
        // açıyor ama ilgili sekmeye hiç gitmiyordu. Soğuk başlatmada JS'in
        // (auth + sekme sistemi) hazır olması için widget'taki gibi bir
        // gecikme kullanılıyor.
        String kategori = intent.getStringExtra("kategori");
        if (kategori != null) {
            getBridge().getWebView().postDelayed(() ->
                getBridge().getWebView().evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('bildirimAcildi', " +
                    "{ detail: { kategori: '" + kategori + "' } }));",
                    null
                ), 800
            );
        }
    }
}
