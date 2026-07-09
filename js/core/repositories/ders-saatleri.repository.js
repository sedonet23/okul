/* ================================================================
   js/core/repositories/ders-saatleri.repository.js
   DERS SAATLERİ (ZİL ÇALMA) MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI
   (dersSaatleri — tek belge, id='ayarlar')

   Bu dosyada SADECE db.collection() / onSnapshot() / set() çağrıları
   bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü, hiçbir DOM işlemi
   burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/ders-saatleri.service.js
   ================================================================ */

const DersSaatleriRepository = {
  ayarlariDinle(callback, hataCb){
    // includeMetadataChanges:true — çağıran taraf (ders-saatleri.js) bu sayede
    // verinin gerçekten SUNUCUDAN mı geldiğini, yoksa cihazın eski yerel
    // önbelleğinden mi okunduğunu (doc.metadata.fromCache) ayırt edebiliyor.
    return db.collection(COL.dersSaatleri).doc('ayarlar').onSnapshot(
      { includeMetadataChanges: true },
      doc => callback(doc.exists ? doc.data() : null, doc.metadata),
      hataCb || hataGoster
    );
  },
  ayarlariKaydet(veri){ return db.collection(COL.dersSaatleri).doc('ayarlar').set(veri); }
};
