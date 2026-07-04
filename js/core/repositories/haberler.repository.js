/* ================================================================
   js/core/repositories/haberler.repository.js
   HABERLER / DUYURULAR MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI
   (haberler + haberKaynaklari + cihazlar[bildirim tercihi])

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() / set() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki
   kontrolü, hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-
   Tasarimi.md §2). Üstündeki katman: js/core/services/haberler.service.js
   ================================================================ */

const HaberlerRepository = {

  /* ---------- Haberler ---------- */
  /* DÜZELTME: limit(200) yetersiz kalıyordu — çok sık yayın yapan bir
     kaynak (örn. Meb Personel), daha seyrek yayın yapan başka bir
     kaynağın (örn. Elazığ Meb Duyurular) haberlerini "en yeni 200"
     penceresinden tamamen dışarı itebiliyordu; o haberler Firestore'da
     var olmasına rağmen uygulamada HİÇ yüklenmiyordu. Limit artırıldı. */
  haberleriDinle(callback, hataCb){
    return db.collection(COL.haberler).orderBy('tarih', 'desc').limit(600).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  haberEkle(veri){ return db.collection(COL.haberler).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  haberGuncelle(id, veri){ return db.collection(COL.haberler).doc(id).update(veri); },
  haberSil(id){ return db.collection(COL.haberler).doc(id).delete(); },

  /* ---------- Haber Kaynakları (RSS) ---------- */
  kaynaklariDinle(callback, hataCb){
    return db.collection(COL.haberKaynaklari).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  kaynakEkle(veri){ return db.collection(COL.haberKaynaklari).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  kaynakGuncelle(id, veri){ return db.collection(COL.haberKaynaklari).doc(id).update(veri); },
  kaynakSil(id){ return db.collection(COL.haberKaynaklari).doc(id).delete(); }
};
