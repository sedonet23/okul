/* ================================================================
   js/core/repositories/siniflar.repository.js
   SINIFLAR MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (siniflar + veliler)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() / batch() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki
   kontrolü, hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-
   Tasarimi.md §2). Üstündeki katman: js/core/services/siniflar.service.js

   Not: "veliler" koleksiyonu ayrı bir modül gibi görünse de, veri
   modelinde sınıfa sıkı bağlı (öğrenci/veli kaydı = sınıfın alt kaynağı)
   olduğu için aynı repository altında toplandı — ayrı bir "veliler"
   modülü/dosyası açmak bu ölçekte gereksiz parçalanma olurdu.
   ================================================================ */

const SiniflarRepository = {

  /* ---------- Sınıflar ---------- */
  siniflariDinle(callback, hataCb){
    return db.collection(COL.siniflar).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  sinifEkle(veri){ return db.collection(COL.siniflar).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  sinifGuncelle(id, veri){ return db.collection(COL.siniflar).doc(id).update(veri); },
  sinifSil(id){ return db.collection(COL.siniflar).doc(id).delete(); },
  sinifGetir(id){ return db.collection(COL.siniflar).doc(id).get(); },

  /* ---------- Veliler / Öğrenciler ---------- */
  velileriDinle(callback, hataCb){
    return db.collection(COL.veliler).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  veliEkle(veri){ return db.collection(COL.veliler).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  veliGuncelle(id, veri){ return db.collection(COL.veliler).doc(id).update(veri); },
  veliSil(id){ return db.collection(COL.veliler).doc(id).delete(); },

  /* ---------- Toplu (batch) yazma yardımcıları ----------
     Excel/e-Okul içe aktarma gibi çok-kayıtlı işlemler için. Batch'in
     İÇİNDEKİ iş kuralı (hangi kayıt eşleşti, hangisi yeni) servis
     katmanına ait; burada sadece ilkel operasyonlar var. */
  yeniBatch(){ return db.batch(); },
  batchSinifYaz(batch, veri, id){
    const ref = id ? db.collection(COL.siniflar).doc(id) : db.collection(COL.siniflar).doc();
    batch.set(ref, veri, { merge: true });
  },
  batchVeliYaz(batch, veri, id){
    const ref = id ? db.collection(COL.veliler).doc(id) : db.collection(COL.veliler).doc();
    batch.set(ref, veri, { merge: true });
  },
  batchVeliSil(batch, id){ batch.delete(db.collection(COL.veliler).doc(id)); },
  batchCommit(batch){ return batch.commit(); }
};
