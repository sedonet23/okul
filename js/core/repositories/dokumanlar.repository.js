/* ================================================================
   js/core/repositories/dokumanlar.repository.js
   DÖKÜMANLAR MODÜLÜ — TEK FIRESTORE + STORAGE ERİŞİM NOKTASI

   Bu dosyada SADECE db.collection() / storage.ref() / onSnapshot() /
   add() / delete() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki
   kontrolü, hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-
   Tasarimi.md §2). Üstündeki katman: js/core/services/dokumanlar.service.js

   DÜZELTME (v2): Dosya içeriği artık Firebase Storage'da tutuluyor —
   eskiden IndexedDB (cihaz hafızası) kullanılıyordu, bu da dosyaların
   sadece yükleyen kişinin cihazında kalmasına ve paylaşılamamasına
   sebep oluyordu.
   ================================================================ */

const DokumanlarRepository = {
  dokumanlariDinle(callback, hataCb){
    return db.collection(COL.dokumanlar).orderBy('yuklenmeTarihi', 'desc').onSnapshot(
      snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  /* Not: meta zaten kendi zaman damgasını (serverTimestamp) taşıyor —
     diğer repository'lerdeki otomatik eklenmeTarihi damgası burada
     bilinçli olarak uygulanmıyor. */
  dokumanEkle(meta){ return db.collection(COL.dokumanlar).add(meta); },
  dokumanSil(id){ return db.collection(COL.dokumanlar).doc(id).delete(); },

  /* ---------- Dosya (Firebase Storage) ----------
     Yol: dokumanlar/{zamanDamgasi}_{dosyaAdi}
     DÜZELTME (v2): Daha önce dosya içeriği IndexedDB'de (cihaz hafızası)
     tutuluyordu — bu, dosyayı yükleyen kişi DIŞINDA kimsenin dosyayı
     göremediği anlamına geliyordu (paylaşılan bir arşiv için elverişsizdi).
     Artık Firebase Storage kullanılıyor, herkes her cihazdan erişebilir. */
  dosyaYukle(dosya, ilerlemeCb){
    return new Promise((resolve, reject)=>{
      const yol = `dokumanlar/${Date.now()}_${dosya.name}`;
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
  dosyaSil(storagePath){ return storage.ref().child(storagePath).delete(); }
};
