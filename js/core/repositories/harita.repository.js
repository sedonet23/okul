/* ================================================================
   js/core/repositories/harita.repository.js
   HARİTA MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (haritaFavoriler)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / delete()
   çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü, hiçbir DOM
   işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/harita.service.js

   Not: Servis güzergahını (mesafe/koordinatlar) servis kaydına yazma
   işlemi COL.servisler'i etkiler — bu koleksiyonun TEK Firestore erişim
   noktası TasimaRepository'dir (bkz. tasima.repository.js), bu yüzden
   burada tekrarlanmadı; HaritaService doğrudan TasimaRepository çağırır.
   ================================================================ */

const HaritaRepository = {
  favorileriDinle(callback, hataCb){
    return db.collection(COL.haritaFavoriler).orderBy('olusturmaTarihi', 'desc').onSnapshot(
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || (err => console.warn('Favori bağlantı hatası:', err))
    );
  },
  favoriEkle(veri){
    return db.collection(COL.haritaFavoriler).add({ ...veri, olusturmaTarihi: firebase.firestore.FieldValue.serverTimestamp() });
  },
  favoriSil(id){ return db.collection(COL.haritaFavoriler).doc(id).delete(); }
};
