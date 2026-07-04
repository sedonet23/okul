/* ================================================================
   js/core/repositories/anket.repository.js
   ANKETLER — ham Firestore erişimi. Yetki kontrolü YOK (bkz. service).
   ================================================================ */
const AnketRepository = {
  anketleriDinle(callback, hataCb){
    return db.collection(COL.anketler).orderBy('olusturmaTarihi', 'desc').onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  anketEkle(veri){
    return db.collection(COL.anketler).add(veri);
  },
  anketGuncelle(id, veri){
    return db.collection(COL.anketler).doc(id).update(veri);
  },
  anketSil(id){
    return db.collection(COL.anketler).doc(id).delete();
  }
};
