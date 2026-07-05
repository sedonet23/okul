/* ================================================================
   js/core/repositories/duyurular.repository.js
   DUYURU PANOSU MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (duyurular)

   Haberler/RSS modülünden TAMAMEN BAĞIMSIZDIR — ayrı koleksiyon, ayrı
   yetki, ayrı okundu-takibi.

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/duyurular.service.js
   ================================================================ */

const DuyurularRepository = {
  duyurulariDinle(callback, hataCb){
    return db.collection(COL.duyurular).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  duyuruEkle(veri){ return db.collection(COL.duyurular).add(veri); },
  duyuruGuncelle(id, veri){ return db.collection(COL.duyurular).doc(id).update(veri); },
  duyuruSil(id){ return db.collection(COL.duyurular).doc(id).delete(); },
  /* Okundu işaretleme: sadece kendi alanını (okuyanlar.{uid}) günceller —
     tüm belgeyi değil, iç içe (nested) tek bir alanı hedefler. */
  okunduIsaretle(id, uid, veri){
    return db.collection(COL.duyurular).doc(id).update({ [`okuyanlar.${uid}`]: veri });
  },

  /* ---------- Görsel duyuru desteği (YENİ) ----------
     Yol: duyurular/{zamanDamgasi}_{dosyaAdi} — dokumanlar.repository.js'deki
     dosyaYukle() ile birebir aynı desen. */
  resimYukle(dosya, ilerlemeCb){
    return new Promise((resolve, reject) => {
      const yol = `duyurular/${Date.now()}_${dosya.name}`;
      const ref = storage.ref().child(yol);
      const gorev = ref.put(dosya);
      gorev.on('state_changed',
        (snap) => { if (ilerlemeCb) ilerlemeCb(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)); },
        (err) => reject(err),
        async () => {
          try {
            const url = await gorev.snapshot.ref.getDownloadURL();
            resolve({ url, storagePath: yol });
          } catch (err) { reject(err); }
        }
      );
    });
  },
  resimSil(storagePath){ return storage.ref().child(storagePath).delete(); }
};
