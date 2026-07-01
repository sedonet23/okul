package com.koruk.okul;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

/**
 * SavePlugin – Android'in çıplak WebView bileşeni, tarayıcıların standart
 * "blob indirme" (<a download>) davranışını DESTEKLEMEZ. Bu yüzden şablon
 * (xlsx) ve yedek (json) indirme butonları sessizce hiçbir şey yapmıyordu.
 * Bu plugin, base64 olarak gönderilen veriyi doğrudan MediaStore üzerinden
 * cihazın "İndirilenler" (Downloads) klasörüne yazar. İsteğe bağlı olarak,
 * kaydettikten hemen sonra Android'in yerleşik "Paylaş" menüsünü açarak
 * dosyayı Drive/WhatsApp/e-posta gibi herhangi bir yere göndermeyi
 * kolaylaştırır — ayrı bir Google Drive girişi/OAuth kurulumu gerekmez,
 * kullanıcının telefonunda zaten kurulu olan Drive uygulamasını kullanır.
 *
 * Kullanım (JS tarafı):
 *   window.Capacitor.Plugins.SavePlugin.kaydet({ base64, dosyaAdi, mimeTuru, paylas: true });
 */
@CapacitorPlugin(name = "SavePlugin")
public class SavePlugin extends Plugin {

    @PluginMethod
    public void kaydet(PluginCall call) {
        String base64 = call.getString("base64");
        String dosyaAdi = call.getString("dosyaAdi", "koruk_okul_dosya");
        String mimeTuru = call.getString("mimeTuru", "application/octet-stream");
        boolean paylas = Boolean.TRUE.equals(call.getBoolean("paylas", false));

        if (base64 == null || base64.isEmpty()) {
            call.reject("base64 parametresi gerekli");
            return;
        }

        try {
            byte[] veri = Base64.decode(base64, Base64.DEFAULT);
            Context context = getContext();
            ContentResolver resolver = context.getContentResolver();

            ContentValues degerler = new ContentValues();
            degerler.put(MediaStore.MediaColumns.DISPLAY_NAME, dosyaAdi);
            degerler.put(MediaStore.MediaColumns.MIME_TYPE, mimeTuru);

            Uri hedefUri;
            boolean mediaStoreUriMi = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q;
            if (mediaStoreUriMi) {
                degerler.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                hedefUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, degerler);
            } else {
                java.io.File indirilenler = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                java.io.File hedefDosya = new java.io.File(indirilenler, dosyaAdi);
                hedefUri = Uri.fromFile(hedefDosya);
            }

            if (hedefUri == null) {
                call.reject("Hedef dosya oluşturulamadı");
                return;
            }

            OutputStream cikisAkisi = mediaStoreUriMi
                ? resolver.openOutputStream(hedefUri)
                : new java.io.FileOutputStream(hedefUri.getPath());

            if (cikisAkisi == null) {
                call.reject("Dosya yazma akışı açılamadı");
                return;
            }
            cikisAkisi.write(veri);
            cikisAkisi.flush();
            cikisAkisi.close();

            // Paylaşım istenmişse ve content:// URI (MediaStore, API 29+) varsa
            // native "Paylaş" diyaloğunu aç — Drive, WhatsApp, e-posta vb. her
            // yere gönderilebilir. Eski cihazlarda (file:// URI) StrictMode
            // güvenlik kısıtlaması yüzünden bu adım atlanır, dosya yine de
            // İndirilenler klasöründe kalır.
            if (paylas && mediaStoreUriMi) {
                try {
                    Intent paylasimNiyeti = new Intent(Intent.ACTION_SEND);
                    paylasimNiyeti.setType(mimeTuru);
                    paylasimNiyeti.putExtra(Intent.EXTRA_STREAM, hedefUri);
                    paylasimNiyeti.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    Intent secici = Intent.createChooser(paylasimNiyeti, "Yedeği Kaydet / Paylaş");
                    secici.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(secici);
                } catch (Exception paylasHatasi) {
                    // Paylaşım açılamasa da dosya zaten kaydedildi, sorun değil.
                }
            }

            JSObject sonuc = new JSObject();
            sonuc.put("yol", "İndirilenler/" + dosyaAdi);
            sonuc.put("uri", hedefUri.toString());
            call.resolve(sonuc);
        } catch (Exception e) {
            call.reject("Dosya kaydedilemedi: " + e.getMessage(), e);
        }
    }
}
