package com.koruk.okul;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * DersZiliHesaplayici — JS'den gelen HAM ders programını (gün içindeki
 * segmentler: başlangıç/bitiş dakikası + başlık/yer) alıp, o ANKİ saate göre
 * "kalan dakika / ilerleme oranı / aktif-sonraki ders" gibi GÖRÜNTÜLENECEK
 * değerleri hesaplar.
 *
 * Bu hesaplamanın native tarafta yapılmasının sebebi: uygulama kapalıyken de
 * (sadece Android'in kendi widget alarmı tetiklendiğinde) sayacın DOĞRU
 * kalması gerekiyor — JS her seferinde çalışmadığı için "kalan dakika" gibi
 * anlık değerleri JS'de önceden hesaplayıp göndermek, uygulama kapandığı anda
 * bu değerlerin bayatlamasına yol açardı.
 *
 * Beklenen HAM veri (bkz. js/widget-bridge.js):
 * {
 *   "tatilModu": true|false, "tatilNotu": "...",
 *   "dersYok": true|false, "durumMetniOzel": "...",
 *   "segmentler": [ {"bas":510,"bit":550,"baslik":"FİZİK","yer":"(102)"}, ... ]  // dakika/gün
 * }
 */
public class DersZiliHesaplayici {

    public static JSONObject hesapla(JSONObject ham, int simdiDk) {
        JSONObject sonuc = new JSONObject();
        try {
            if (ham == null) { sonuc.put("durumMetni", "Uygulamayı açınız"); return sonuc; }

            if (ham.optBoolean("tatilModu", false)) {
                sonuc.put("durumMetni", ham.optString("tatilNotu", "Okul tatilde"));
                return sonuc;
            }
            if (ham.optBoolean("dersYok", false)) {
                sonuc.put("durumMetni", ham.optString("durumMetniOzel", "Uygulamayı açınız"));
                return sonuc;
            }

            JSONArray segmentler = ham.optJSONArray("segmentler");
            if (segmentler == null || segmentler.length() == 0) {
                sonuc.put("durumMetni", "Zil programı yok");
                return sonuc;
            }

            // Zaman çizelgesi satırları (her segment kendi başlangıcıyla görünür)
            JSONArray zaman = new JSONArray();
            int aktifIndex = -1;
            for (int i = 0; i < segmentler.length(); i++) {
                JSONObject s = segmentler.getJSONObject(i);
                int bas = s.getInt("bas"), bit = s.getInt("bit");
                boolean simdiMi = simdiDk >= bas && simdiDk < bit;
                if (simdiMi) aktifIndex = i;

                JSONObject satir = new JSONObject();
                satir.put("saat", String.format("%02d:%02d", bas / 60, bas % 60));
                satir.put("etiket", s.optString("baslik", ""));
                satir.put("simdi", simdiMi);
                zaman.put(satir);
            }
            sonuc.put("zaman", zaman);

            if (aktifIndex == -1) {
                int sonrakiIndex = -1;
                for (int i = 0; i < segmentler.length(); i++) {
                    if (segmentler.getJSONObject(i).getInt("bas") > simdiDk) { sonrakiIndex = i; break; }
                }
                if (sonrakiIndex == -1) {
                    sonuc.put("durumMetni", "Bugünkü dersler bitti");
                } else if (sonrakiIndex == 0) {
                    sonuc.put("durumMetni", "Okul henüz açılmadı");
                } else {
                    // Teneffüsteyiz: sonraki segment başlayana kadar geri sayım.
                    // Teneffüsün toplam süresi arayüzde gösterilmediği için halka sabit yarım çiziliyor.
                    JSONObject sonrakiSeg = segmentler.getJSONObject(sonrakiIndex);
                    int kalan = sonrakiSeg.getInt("bas") - simdiDk;
                    sonuc.put("kalanDakika", kalan);
                    sonuc.put("ilerlemeOran", 0.5);
                    sonuc.put("aktifBaslik", "TENEFFÜS");
                    sonuc.put("aktifYer", "");
                    sonuc.put("sonrakiBaslik", sonrakiSeg.optString("baslik", ""));
                    sonuc.put("sonrakiYer", sonrakiSeg.optString("yer", ""));
                }
            } else {
                JSONObject seg = segmentler.getJSONObject(aktifIndex);
                int bas = seg.getInt("bas"), bit = seg.getInt("bit");
                int kalan = bit - simdiDk;
                int toplam = bit - bas;
                sonuc.put("kalanDakika", kalan);
                sonuc.put("ilerlemeOran", toplam > 0 ? (double) kalan / toplam : 0);
                sonuc.put("aktifBaslik", seg.optString("baslik", ""));
                sonuc.put("aktifYer", seg.optString("yer", ""));
                if (aktifIndex + 1 < segmentler.length()) {
                    JSONObject sonrakiSeg = segmentler.getJSONObject(aktifIndex + 1);
                    sonuc.put("sonrakiBaslik", sonrakiSeg.optString("baslik", ""));
                    sonuc.put("sonrakiYer", sonrakiSeg.optString("yer", ""));
                } else {
                    sonuc.put("sonrakiBaslik", "Gün Sonu");
                    sonuc.put("sonrakiYer", "");
                }
            }
        } catch (Exception e) {
            try { sonuc.put("durumMetni", "Veri okunamadı"); } catch (Exception ignored) {}
        }
        return sonuc;
    }
}
