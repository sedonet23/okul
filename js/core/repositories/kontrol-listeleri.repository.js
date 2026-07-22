/* ================================================================
   js/core/repositories/kontrol-listeleri.repository.js
   KONTROL LİSTELERİ — genel amaçlı, YENİDEN KULLANILABİLİR kontrol
   listesi altyapısı ("Yıl Sonu İşlemleri" ilk örneği, ileride "Yıl
   Başı İşlemleri" gibi başka listeler de aynı yapıyla eklenebilir).

   oy_kontrolListeleri/{listeId}: {ad, aciklama, sira, olusturmaTarihi,
     maddeler:[{id, sira, ikon, renk, metin}]}
   oy_kontrolListeTamamlama/{ogretmenId}_{listeId}: {ogretmenId, listeId,
     tamamlananMaddeIdler:[maddeId,...]}
   ================================================================ */
const KontrolListeleriRepository = {
  listeleriDinle(callback, hataCb){
    return db.collection(COL.kontrolListeleri).orderBy('sira').onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  listeEkle(veri){ return db.collection(COL.kontrolListeleri).add(veri); },
  listeGuncelle(id, veri){ return db.collection(COL.kontrolListeleri).doc(id).update(veri); },
  listeSil(id){ return db.collection(COL.kontrolListeleri).doc(id).delete(); },

  /* ---- Öğretmenin kendi tamamlama durumu ---- */
  tamamlamaGetir(ogretmenId, listeId){
    return db.collection(COL.kontrolListeTamamlama).doc(`${ogretmenId}_${listeId}`).get();
  },
  tamamlamaKaydet(ogretmenId, listeId, tamamlananMaddeIdler){
    return db.collection(COL.kontrolListeTamamlama).doc(`${ogretmenId}_${listeId}`)
      .set({ ogretmenId, listeId, tamamlananMaddeIdler }, { merge:true });
  },
  /* ---- Admin özeti: bir listenin TÜM öğretmen tamamlama kayıtları ---- */
  tumTamamlamalariDinle(listeId, callback, hataCb){
    return db.collection(COL.kontrolListeTamamlama).where('listeId','==',listeId).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
};
