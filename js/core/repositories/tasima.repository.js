/* ================================================================
   js/core/repositories/tasima.repository.js
   TAŞIMA MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (servisler)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/tasima.service.js

   Not: Servis araçlarının koltuk/oturma planı verisi (COL.servisOturma)
   ayrı bir veri modeli olduğu için js/servis-oturma.js ile birlikte
   ayrı bir repository'de (servis-oturma.repository.js) yönetiliyor.
   ================================================================ */

const TasimaRepository = {

  /* ---------- Servisler ---------- */
  servisleriDinle(callback, hataCb){
    return db.collection(COL.servisler).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  servisEkle(veri){ return db.collection(COL.servisler).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  servisGuncelle(id, veri){ return db.collection(COL.servisler).doc(id).update(veri); },
  servisSil(id){ return db.collection(COL.servisler).doc(id).delete(); }
};
