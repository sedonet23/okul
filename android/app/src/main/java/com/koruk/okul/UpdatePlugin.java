package com.koruk.okul;

import android.content.Intent;
import android.net.Uri;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/* YENİ: Uygulama İçi Otomatik Güncelleme
   ----------------------------------------------------------------
   Bu uygulama Google Play üzerinden değil, doğrudan APK dosyası olarak
   dağıtıldığı için Play Store'un otomatik güncelleme sistemi devrede
   değil. Bu eklenti, JS tarafının verdiği bir indirme linkinden yeni
   APK'yı arka planda indirip, indirme biter bitmez Android'in kendi
   "Yüklemek istiyor musunuz?" kurulum ekranını otomatik açar — kullanıcı
   artık tarayıcıya/İndirilenler klasörüne gitmek zorunda kalmaz, sadece
   son onay için "Yükle"ye dokunur (Android güvenliği gereği bu son adım
   hiçbir uygulama tarafından atlanamaz, Play Store dahil).

   JS tarafı kullanımı:
     window.Capacitor.Plugins.UpdatePlugin.indirVeKur({ url: "https://.../app-release.apk" })
   ---------------------------------------------------------------- */
@CapacitorPlugin(name = "UpdatePlugin")
public class UpdatePlugin extends Plugin {

    @PluginMethod
    public void indirVeKur(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("İndirme linki (url) gerekli.");
            return;
        }

        new Thread(() -> {
            HttpURLConnection baglanti = null;
            try {
                File hedefDosya = new File(getContext().getCacheDir(), "koruk-okul-guncelleme.apk");

                URL adres = new URL(url);
                baglanti = (HttpURLConnection) adres.openConnection();
                baglanti.setInstanceFollowRedirects(true);
                baglanti.connect();

                if (baglanti.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    call.reject("İndirme başarısız (HTTP " + baglanti.getResponseCode() + ")");
                    return;
                }

                try (InputStream girisAkisi = baglanti.getInputStream();
                     FileOutputStream cikisAkisi = new FileOutputStream(hedefDosya)) {
                    byte[] arabellek = new byte[8192];
                    int okunanBayt;
                    while ((okunanBayt = girisAkisi.read(arabellek)) != -1) {
                        cikisAkisi.write(arabellek, 0, okunanBayt);
                    }
                }

                getActivity().runOnUiThread(() -> {
                    try {
                        Uri apkUri = FileProvider.getUriForFile(
                            getContext(),
                            getContext().getPackageName() + ".fileprovider",
                            hedefDosya
                        );
                        Intent kurulumIntenti = new Intent(Intent.ACTION_VIEW);
                        kurulumIntenti.setDataAndType(apkUri, "application/vnd.android.package-archive");
                        kurulumIntenti.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        getContext().startActivity(kurulumIntenti);

                        JSObject sonuc = new JSObject();
                        sonuc.put("basarili", true);
                        call.resolve(sonuc);
                    } catch (Exception e) {
                        call.reject("Kurulum ekranı açılamadı: " + e.getMessage());
                    }
                });
            } catch (Exception e) {
                call.reject("İndirme hatası: " + e.getMessage());
            } finally {
                if (baglanti != null) baglanti.disconnect();
            }
        }).start();
    }
}
