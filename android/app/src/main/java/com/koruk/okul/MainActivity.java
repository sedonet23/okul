package com.koruk.okul;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;

public class MainActivity extends BridgeActivity {

    private SwipeRefreshLayout swipeRefresh;
    private long sonGeriTusuZamani = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetPlugin.class);
        registerPlugin(PushNotificationsPlugin.class);
        registerPlugin(PrintPlugin.class);
        registerPlugin(SavePlugin.class);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
        setupPullToRefresh();
        kenarJestiniAyir();
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

    private void setupPullToRefresh() {
        WebView webView = getBridge().getWebView();
        android.view.ViewGroup parent = (android.view.ViewGroup) webView.getParent();
        if (parent == null) return;

        swipeRefresh = new SwipeRefreshLayout(this);
        swipeRefresh.setColorSchemeColors(0xFF0A6E6E, 0xFF1A9E9E);

        int index = parent.indexOfChild(webView);
        parent.removeView(webView);

        android.widget.FrameLayout.LayoutParams lp = new android.widget.FrameLayout.LayoutParams(
            android.view.ViewGroup.LayoutParams.MATCH_PARENT,
            android.view.ViewGroup.LayoutParams.MATCH_PARENT
        );
        swipeRefresh.setLayoutParams(lp);
        swipeRefresh.addView(webView);
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
    }
}
