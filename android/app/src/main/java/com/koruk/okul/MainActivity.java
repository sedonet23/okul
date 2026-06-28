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
    }
}
