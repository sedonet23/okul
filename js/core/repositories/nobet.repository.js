/* ================================================================
   js/core/repositories/nobet.repository.js
   NÖBET MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() / batch() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki
   kontrolü, hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-
   Tasarimi.md §2). Üstündeki katman: js/core/services/nobet.service.js
   ================================================================ */

const NobetRepository = {

  /* ---------- Nöbet Yerleri ---------- */
  yerleriDinle(callback, hataCb){
    return db.collection(COL.nobetYerleri).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  yerEkle(veri){ return db.collection(COL.nobetYerleri).add(veri); },
  yerGuncelle(id, veri){ return db.collection(COL.nobetYerleri).doc(id).update(veri); },
  yerSil(id){ return db.collection(COL.nobetYerleri).doc(id).delete(); },

  /* ---------- Nöbet Atamaları ---------- */
  atamalariDinle(callback, hataCb){
    return db.collection(COL.nobetAtamalari).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  atamaEkle(veri){ return db.collection(COL.nobetAtamalari).add(veri); },
  atamaGuncelle(id, veri){ return db.collection(COL.nobetAtamalari).doc(id).update(veri); },
  atamaSil(id){ return db.collection(COL.nobetAtamalari).doc(id).delete(); },
  /* Belirli bir tarihten önceki atamaları getirir (otomatik dağıtımda "son atama neredeydi" sorgusu için). */
  atamalariOncesiGetir(tarihISO){
    return db.collection(COL.nobetAtamalari).where('tarih', '<', tarihISO).get();
  },

  /* ---------- Nöbetçi Amirler ---------- */
  amirleriDinle(callback, hataCb){
    return db.collection(COL.nobetciAmirleri).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  amirEkle(veri){ return db.collection(COL.nobetciAmirleri).add(veri); },
  amirGuncelle(id, veri){ return db.collection(COL.nobetciAmirleri).doc(id).update(veri); },
  amirSil(id){ return db.collection(COL.nobetciAmirleri).doc(id).delete(); },

  /* ---------- Resmi Tatiller ---------- */
  tatilleriDinle(callback, hataCb){
    return db.collection(COL.resmiTatiller).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  tatilEkle(veri){ return db.collection(COL.resmiTatiller).add(veri); },
  tatilSil(id){ return db.collection(COL.resmiTatiller).doc(id).delete(); },

  /* ---------- Rotasyon Şablonu (otomatik dağıtım hafızası) ---------- */
  rotasyonDinle(callback, hataCb){
    return db.collection(COL.nobetRotasyon).doc('sablon').onSnapshot(
      snap => callback(snap.exists ? snap.data() : null),
      hataCb || (err => console.warn('nobetRotasyon:', err))
    );
  },
  rotasyonKaydet(veri){ return db.collection(COL.nobetRotasyon).doc('sablon').set(veri); },

  /* ---------- Toplu (batch) yazma yardımcıları ----------
     Excel içe aktarma ve otomatik dağıtım gibi çok-kayıtlı işlemler
     için. Batch'in İÇİNDEKİ iş kuralı (hangi kayıt yazılacak, hangi
     sırayla) servis katmanına ait; burada sadece ilkel operasyonlar var. */
  yeniBatch(){ return db.batch(); },
  batchAtamaSil(batch, id){ batch.delete(db.collection(COL.nobetAtamalari).doc(id)); },
  batchAtamaYaz(batch, veri, id){
    const ref = id ? db.collection(COL.nobetAtamalari).doc(id) : db.collection(COL.nobetAtamalari).doc();
    batch.set(ref, veri);
  },
  batchAmirYaz(batch, veri, id){
    const ref = id ? db.collection(COL.nobetciAmirleri).doc(id) : db.collection(COL.nobetciAmirleri).doc();
    batch.set(ref, veri);
  },
  batchYeriYaz(batch, veri, id){
    const ref = id ? db.collection(COL.nobetYerleri).doc(id) : db.collection(COL.nobetYerleri).doc();
    batch.set(ref, veri);
  },
  batchCommit(batch){ return batch.commit(); }
};
