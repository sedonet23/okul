/* ================================================================
   js/core/repositories/dokumanlar.repository.js
   DÖKÜMANLAR MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (dokumanlar metadata)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / delete()
   çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü, hiçbir DOM
   işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/dokumanlar.service.js

   Not: Dosyanın kendisi IndexedDB'de (cihaz hafızası) tutulur — bu
   Firestore'un sorumluluğunda değil, js/dokumanlar.js'teki idb* yardımcı
   fonksiyonlarında (bilinçli olarak UI/altyapı katmanında) kalıyor.
   ================================================================ */

const DokumanlarRepository = {
  dokumanlariDinle(callback, hataCb){
    return db.collection(COL.dokumanlar).orderBy('yuklenmeTarihi', 'desc').onSnapshot(
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  /* Not: meta zaten kendi zaman damgasını (serverTimestamp) taşıyor —
     diğer repository'lerdeki otomatik eklenmeTarihi damgası burada
     bilinçli olarak uygulanmıyor. */
  dokumanEkle(meta){ return db.collection(COL.dokumanlar).add(meta); },
  dokumanSil(id){ return db.collection(COL.dokumanlar).doc(id).delete(); }
};
