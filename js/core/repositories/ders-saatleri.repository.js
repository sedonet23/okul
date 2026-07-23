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
  // YENİ: Gerçek zamanlı dinleyici bazı cihazlarda (IndexedDB'de takılı kalmış
  // eski bir kopya yüzünden) süresiz olarak bayat veri gösterebiliyor — özellikle
  // "tatil modu" gibi nadiren değişen ama kritik bir alanda bu fark edilmesi zor
  // bir hataya yol açıyordu. Bu, önbelleği BİLİNÇLİ olarak atlayıp doğrudan
  // sunucudan tek seferlik okuma yapar (bkz. ders-saatleri.js
  // dersSaatleriBaglantisiKur — dinleyiciyle çelişirse bunun sonucu esas alınır).
  ayarlariSunucudanOku(){
    return db.collection(COL.dersSaatleri).doc('ayarlar').get({ source: 'server' })
      .then(doc => doc.exists ? doc.data() : null);
  },
  ayarlariKaydet(veri){ return db.collection(COL.dersSaatleri).doc('ayarlar').set(veri); }
};
