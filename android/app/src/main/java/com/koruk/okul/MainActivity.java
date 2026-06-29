package com.koruk.okul;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Widget plugin'i kaydet
        registerPlugin(WidgetPlugin.class);
        super.onCreate(savedInstanceState);
        // Uygulama kapalıyken widget'tan açıldıysa intent'i işle
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Bildirimden deep link gelirse JS'e aktar
        String kategori = intent.getStringExtra("kategori");
        if (kategori != null) {
            getBridge().getWebView().evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('bildirimAcildi', " +
                "{ detail: { kategori: '" + kategori + "' } }));",
                null
            );
        }
        // Widget "Not Ekle" butonundan gelirse JS'e aktar
        handleIntent(intent);
    }

    /**
     * Intent içindeki "page" extra'sını JS tarafına CustomEvent olarak iletir.
     * Widget'taki not butonu → MainActivity'e page="notlar" gönderir.
     * JS tarafında: window.addEventListener('widgetSayfaAc', e => navigate(e.detail.page))
     */
    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String page = intent.getStringExtra("page");
        if (page != null) {
            // WebView hazır olmayabilir, kısa gecikmeyle gönder
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
