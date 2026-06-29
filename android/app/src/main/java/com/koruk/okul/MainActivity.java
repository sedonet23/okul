package com.koruk.okul;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private SwipeRefreshLayout swipeRefresh;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetPlugin.class);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
        setupPullToRefresh();
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
