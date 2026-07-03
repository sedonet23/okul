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
  haberleriDinle(callback, hataCb){
    return db.collection(COL.haberler).orderBy('tarih', 'desc').limit(200).onSnapshot(
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
