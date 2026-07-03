/* ================================================================
   js/core/repositories/sinavlar.repository.js
   SINAV İŞLEMLERİ MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI
   (sinavlar + denemeSinavlari)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/sinavlar.service.js
   ================================================================ */

const SinavlarRepository = {

  /* ---------- Yazılı Sınavlar ---------- */
  sinavlariDinle(callback, hataCb){
    return db.collection(COL.sinavlar).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  sinavEkle(veri){ return db.collection(COL.sinavlar).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  sinavGuncelle(id, veri){ return db.collection(COL.sinavlar).doc(id).update(veri); },
  sinavSil(id){ return db.collection(COL.sinavlar).doc(id).delete(); },

  /* ---------- Deneme Sınavları ---------- */
  denemeSinavlariniDinle(callback, hataCb){
    return db.collection(COL.denemeSinavlari).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  denemeEkle(veri){ return db.collection(COL.denemeSinavlari).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  denemeGuncelle(id, veri){ return db.collection(COL.denemeSinavlari).doc(id).update(veri); },
  denemeSil(id){ return db.collection(COL.denemeSinavlari).doc(id).delete(); }
};
