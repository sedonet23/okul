/* ================================================================
   js/core/repositories/periyodik.repository.js
   PERİYODİK İŞLER MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI
   (periyodikIsler + periyodikSablon)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() / set() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki
   kontrolü, hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-
   Tasarimi.md §2). Üstündeki katman: js/core/services/periyodik.service.js
   ================================================================ */

const PeriyodikRepository = {

  /* ---------- Periyodik İşler ---------- */
  islerDinle(callback, hataCb){
    return db.collection(COL.periyodikIsler).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  isEkle(veri){ return db.collection(COL.periyodikIsler).add(veri); },
  isGuncelle(id, veri){ return db.collection(COL.periyodikIsler).doc(id).update(veri); },
  isSil(id){ return db.collection(COL.periyodikIsler).doc(id).delete(); },

  /* ---------- Aylık Şablon (tek belge, id='sablon') ---------- */
  sabloniDinle(callback, hataCb){
    return db.collection(COL.periyodikSablon).doc('sablon').onSnapshot(
      doc => callback(doc.exists ? (doc.data().gorevler || []) : []),
      hataCb || hataGoster
    );
  },
  sabloniKaydet(gorevler){ return db.collection(COL.periyodikSablon).doc('sablon').set({ gorevler }); }
};
