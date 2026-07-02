package com.koruk.okul;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * PrintPlugin – Android'in çıplak WebView bileşeni window.print() JS API'sini
 * DESTEKLEMEZ (bu sadece Chrome tarayıcı uygulamasında var). Bu yüzden
 * uygulama içindeki yazdırma butonları window.print() ile sessizce
 * başarısız oluyordu. Bu plugin, verilen HTML'i görünmez ayrı bir WebView'e
 * yükleyip Android'in kendi PrintManager'ı üzerinden GERÇEK sistem
 * yazdırma/önizleme diyaloğunu açar — bu diyalog kendi geri/iptal
 * tuşlarına sahiptir, ayrıca "PDF olarak kaydet" seçeneğini de içerir.
 *
 * Kullanım (JS tarafı):
 *   window.Capacitor.Plugins.PrintPlugin.yazdir({ html, isAdi });
 */
@CapacitorPlugin(name = "PrintPlugin")
public class PrintPlugin extends Plugin {

    @PluginMethod
    public void yazdir(PluginCall call) {
        String html = call.getString("html");
        String isAdi = call.getString("isAdi", "Koruk_Okul_Belge");
        String yon = call.getString("yon", "dikey");
        if (html == null || html.isEmpty()) {
            call.reject("html parametresi gerekli");
            return;
        }
        final String belgeAdi = isAdi;
        final boolean yatayMi = "yatay".equals(yon);

        getActivity().runOnUiThread(() -> {
            WebView yazdirmaWebView = new WebView(getContext());
            yazdirmaWebView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    yazdirDiyaloguAc(view, belgeAdi, yatayMi);
                }
            });
            yazdirmaWebView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
        });

        call.resolve();
    }

    private void yazdirDiyaloguAc(WebView webView, String isAdi, boolean yatayMi) {
        PrintManager printManager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
        if (printManager == null) return;
        PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(isAdi);
        PrintAttributes.Builder ozellikler = new PrintAttributes.Builder();
        // Not: Bu sadece Android'in yazdırma diyaloğunda hangi yönün ÖNTANIMLI
        // seçili geleceğini belirler — kullanıcı diyalogda istediği an
        // "Yönlendirme" seçeneğinden değiştirebilir, kilitli değildir.
        ozellikler.setMediaSize(yatayMi
            ? android.print.PrintAttributes.MediaSize.ISO_A4.asLandscape()
            : android.print.PrintAttributes.MediaSize.ISO_A4);
        printManager.print(isAdi, adapter, ozellikler.build());
    }
}
