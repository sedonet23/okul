/* ================================================================
   js/core/repositories/akademik-takvim.repository.js
   AKADEMİK TAKVİM — tek bir görselin (çalışma takvimi posteri) Storage +
   Firestore erişimi. Tek belge (id: 'aktif') — koleksiyon değil, çünkü
   okul başına TEK bir güncel görsel olur; yeni yükleme eskisinin üzerine
   yazar (dosyaKaydet ile birlikte eski Storage dosyası da silinir).
   ================================================================ */
const AkademikTakvimRepository = {
  dinle(callback, hataCb){
    return db.collection(COL.akademikTakvim).doc('aktif').onSnapshot(
      doc => callback(doc.exists ? { id: doc.id, ...doc.data() } : null),
      hataCb || hataGoster
    );
  },
  gorselKaydet(meta){
    return db.collection(COL.akademikTakvim).doc('aktif').set(meta, { merge:false });
  },
  /* Yol: akademikTakvim/{zamanDamgasi}_{dosyaAdi} — dokumanlar.repository.js
     ile aynı desen. */
  dosyaYukle(dosya, ilerlemeCb){
    return new Promise((resolve, reject)=>{
      const yol = `akademikTakvim/${Date.now()}_${dosya.name}`;
      const ref = storage.ref().child(yol);
      const gorev = ref.put(dosya);
      gorev.on('state_changed',
        (snap)=>{ if(ilerlemeCb) ilerlemeCb(Math.round((snap.bytesTransferred/snap.totalBytes)*100)); },
        (err)=> reject(err),
        async ()=>{
          try{
            const url = await gorev.snapshot.ref.getDownloadURL();
            resolve({ url, storagePath: yol });
          }catch(err){ reject(err); }
        }
      );
    });
  },
  dosyaSil(storagePath){ return storage.ref().child(storagePath).delete(); },
};
