/* ================================================================
   js/core/repositories/servis-oturma.repository.js
   SERVİS OTURMA PLANI MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (servisOturma)

   Bu dosyada SADECE db.collection() / onSnapshot() / set() / update() /
   get() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/servis-oturma.service.js

   Veri modeli: her belge ID'si = servisId (bkz. js/servis-oturma.js başlığı).
   ================================================================ */

const ServisOturmaRepository = {

  planlariDinle(callback, hataCb){
    return db.collection(COL.servisOturma).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || (err => console.warn('servisOturma:', err))
    );
  },
  /* merge=true: mevcut alanları koruyarak birleştirir (kaydet). merge=false: belgeyi tamamen değiştirir (yerleşim/koltuk yeniden yazımı). */
  planKaydet(servisId, veri, merge){
    return db.collection(COL.servisOturma).doc(servisId).set(veri, { merge: !!merge });
  },
  planGuncelle(servisId, kismiVeri){
    return db.collection(COL.servisOturma).doc(servisId).update(kismiVeri);
  },
  /* tasima-takip.js yedek veri kaynağı için: servisId'ye ait planı sorgular. */
  planServisIdIleGetir(servisId){
    return db.collection(COL.servisOturma).where('servisId', '==', servisId).get();
  }
};
