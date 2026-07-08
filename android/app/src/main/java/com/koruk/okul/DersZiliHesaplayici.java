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

    public static JSONObject hesapla(JSONObject ham, int simdiDk, long simdiMillis) {
        JSONObject sonuc = new JSONObject();
        try {
            if (ham == null) { sonuc.put("durumMetni", "Uygulamayı açınız"); return sonuc; }

            if (ham.optBoolean("tatilModu", false)) {
                String tatilNotu = ham.optString("tatilNotu", "Okul tatilde");
                Integer kalanGun = gunFarkiHesapla(ham.optString("okulAcilisTarihi", null), simdiMillis);

                if (kalanGun != null && kalanGun > 0) {
                    // Halka merkezinde ders/teneffüs ile aynı düzende (etiket + büyük
                    // sayı + birim) gün sayısını göster; alt not olarak tam tarihi ekle.
                    sonuc.put("kalanDeger", (int) kalanGun);
                    sonuc.put("kalanBirim", "GÜN");
                    sonuc.put("kalanEtiket", "OKULA KALAN");
                    sonuc.put("altNot", tatilNotu);
                } else if (kalanGun != null && kalanGun == 0) {
                    sonuc.put("durumMetni", "Bugün okul açılıyor! \uD83C\uDF89");
                } else {
                    // Tarih girilmemiş veya geçmişte kalmış — eski davranışa (düz metin) düş.
                    sonuc.put("durumMetni", tatilNotu);
                }
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

    /**
     * "YYYY-MM-DD" biçimindeki okul açılış tarihi ile şu anki zaman arasındaki
     * TAM GÜN farkını hesaplar (saat farkını yok sayıp gece yarısına göre
     * karşılaştırır, böylece "bugün" her zaman 0 çıkar). Tarih boşsa/okunamazsa
     * null döner (çağıran taraf eski metin-tabanlı davranışa düşer).
     */
    private static Integer gunFarkiHesapla(String tarihStr, long simdiMillis) {
        if (tarihStr == null || tarihStr.isEmpty() || "null".equals(tarihStr)) return null;
        try {
            String[] parcalar = tarihStr.split("-");
            if (parcalar.length != 3) return null;
            int yil = Integer.parseInt(parcalar[0]);
            int ay = Integer.parseInt(parcalar[1]) - 1;
            int gun = Integer.parseInt(parcalar[2]);

            java.util.Calendar hedef = java.util.Calendar.getInstance();
            hedef.set(yil, ay, gun, 0, 0, 0);
            hedef.set(java.util.Calendar.MILLISECOND, 0);

            java.util.Calendar bugun = java.util.Calendar.getInstance();
            bugun.setTimeInMillis(simdiMillis);
            bugun.set(java.util.Calendar.HOUR_OF_DAY, 0);
            bugun.set(java.util.Calendar.MINUTE, 0);
            bugun.set(java.util.Calendar.SECOND, 0);
            bugun.set(java.util.Calendar.MILLISECOND, 0);

            long farkMs = hedef.getTimeInMillis() - bugun.getTimeInMillis();
            return (int) Math.round(farkMs / 86400000.0);
        } catch (Exception e) {
            return null;
        }
    }
}
