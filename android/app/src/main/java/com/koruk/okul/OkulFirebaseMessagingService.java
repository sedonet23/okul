package com.koruk.okul;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/**
 * FCM push bildirimleri yakalar.
 * Bildirim kategorileri: nobet, belge, sinav, genel
 * Deep link: intent://okul/#Intent;scheme=koruk;...
 */
public class OkulFirebaseMessagingService extends FirebaseMessagingService {

    // Bildirim kanalları
    private static final String CH_NOBET  = "ch_nobet";
    private static final String CH_BELGE  = "ch_belge";
    private static final String CH_SINAV  = "ch_sinav";
    private static final String CH_GENEL  = "ch_genel";

    @Override
    public void onCreate() {
        super.onCreate();
        kanalOlustur(CH_NOBET, "Nöbet Bildirimleri",   NotificationManager.IMPORTANCE_HIGH);
        kanalOlustur(CH_BELGE, "Belge Bildirimleri",   NotificationManager.IMPORTANCE_DEFAULT);
        kanalOlustur(CH_SINAV, "Sınav Bildirimleri",   NotificationManager.IMPORTANCE_HIGH);
        kanalOlustur(CH_GENEL, "Genel Bildirimler",    NotificationManager.IMPORTANCE_DEFAULT);
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();
        String kategori = data.getOrDefault("kategori", "genel");
        String baslik   = data.getOrDefault("baslik",   "Okul Yönetim Paneli");
        String icerik   = data.getOrDefault("icerik",   "");
        String deepLink = data.getOrDefault("deepLink", "");

        // Bildirim kanalını seç
        String kanal;
        int renk;
        switch (kategori) {
            case "nobet":  kanal = CH_NOBET; renk = Color.parseColor("#0A6E6E"); break;
            case "belge":  kanal = CH_BELGE; renk = Color.parseColor("#6366f1"); break;
            case "sinav":  kanal = CH_SINAV; renk = Color.parseColor("#d97706"); break;
            default:       kanal = CH_GENEL; renk = Color.parseColor("#0A6E6E"); break;
        }

        // Tıklama intent'i — deep link varsa oraya, yoksa ana sayfaya
        Intent intent;
        if (!deepLink.isEmpty()) {
            intent = new Intent(Intent.ACTION_VIEW, Uri.parse(deepLink));
        } else {
            intent = new Intent(this, MainActivity.class);
            intent.putExtra("kategori", kategori);
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);

        Uri sesUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, kanal)
            .setSmallIcon(R.drawable.ic_notification)
            .setLargeIcon(okulLogosuBitmapAl())
            .setContentTitle(baslik)
            .setContentText(icerik)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(icerik))
            .setColor(renk)
            .setAutoCancel(true)
            .setSound(sesUri)
            .setContentIntent(pi);

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        nm.notify((int) System.currentTimeMillis(), builder.build());
    }

    @Override
    public void onNewToken(String token) {
        // Token yenilenince uygulamaya bildir (JS tarafı dinleyebilir)
        super.onNewToken(token);
    }

    /* Bildirimde tam renkli okul logosunu "büyük ikon" olarak göstermek
       için uygulama simgesini bitmap olarak yükler.
       DÜZELTME: Android 8.0+ (API 26+) cihazlarda ic_launcher_round,
       BitmapFactory.decodeResource() ile OKUNAMAYAN özel bir "adaptif
       ikon" (XML tabanlı, katmanlı) kaynağına dönüşüyor — sessizce null
       dönüyordu, büyük ikon hiç görünmüyordu. Şimdi Drawable+Canvas
       kullanılıyor; bu yöntem hem eski düz PNG ikonları hem de yeni
       adaptif ikonları doğru şekilde bitmap'e çiziyor. */
    private Bitmap okulLogosuBitmapAl() {
        try {
            Drawable drawable = ContextCompat.getDrawable(this, R.mipmap.ic_launcher_round);
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

    private void kanalOlustur(String id, String ad, int onem) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel kanal = new NotificationChannel(id, ad, onem);
            kanal.enableLights(true);
            kanal.enableVibration(true);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(kanal);
        }
    }
}
