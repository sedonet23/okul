/* ================================================================
   js/core/repositories/sinif-oturma.repository.js
   SINIF İÇİ OTURMA PLANI MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (sinifOturma)

   Bu dosyada SADECE db.collection() / onSnapshot() / set() / get() çağrıları
   bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü, hiçbir DOM işlemi burada
   yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2, servis-oturma.repository.js
   ile aynı desen). Üstündeki katman: js/core/services/sinif-oturma.service.js

   Veri modeli: her belge ID'si = sinifId (bir sınıfın tek bir oturma planı olur).
   ================================================================ */

const SinifOturmaRepository = {
  planGetir(sinifId){
    return db.collection(COL.sinifOturma).doc(sinifId).get();
  },
  planDinle(sinifId, callback, hataCb){
    return db.collection(COL.sinifOturma).doc(sinifId).onSnapshot(
      d => callback(d.exists ? { id: d.id, ...d.data() } : null),
      hataCb || (err => console.warn('sinifOturma:', err))
    );
  },
  planKaydet(sinifId, veri){
    return db.collection(COL.sinifOturma).doc(sinifId).set(veri, { merge: false });
  },
};
