/* ================================================================
   js/core/repositories/mesajlasma.repository.js
   MESAJLAŞMA MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (konusmalar + mesajlar)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   get() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/mesajlasma.service.js

   Not: Mesajlar alt-koleksiyon değil, düz (flat) koleksiyon olarak
   tutulur (konusmaId alanıyla ilişkilendirilir) — projedeki tüm diğer
   koleksiyonlarla aynı düz yapı deseni izlenir. Sorgularda orderBy
   kullanılmaz (Firestore bileşik index gerektirmemesi için); sıralama
   servis/UI katmanında istemci tarafında yapılır.
   ================================================================ */

const MesajlasmaRepository = {

  /* ---------- Konuşmalar ---------- */
  konusmalariDinle(uid, callback, hataCb){
    return db.collection(COL.konusmalar).where('katilimciUidler', 'array-contains', uid).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  konusmaOlustur(veri){ return db.collection(COL.konusmalar).add({ ...veri, guncellenmeTarihi: new Date().toISOString() }); },
  konusmaGuncelle(id, veri){ return db.collection(COL.konusmalar).doc(id).update(veri); },
  konusmaSil(id){ return db.collection(COL.konusmalar).doc(id).delete(); },

  /* ---------- Mesajlar ---------- */
  mesajlariDinle(konusmaId, callback, hataCb){
    return db.collection(COL.mesajlar).where('konusmaId', '==', konusmaId).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  mesajEkle(veri){ return db.collection(COL.mesajlar).add({ ...veri, tarih: new Date().toISOString() }); },
  mesajSil(id){ return db.collection(COL.mesajlar).doc(id).delete(); },
  /* Bir konuşmaya ait TÜM mesajları (ve varsa dosya eklerini) toplu siler
     (konuşma silinirken kullanılır).
     DÜZELTME: Bu fonksiyon önceden bu dosyada İKİ KEZ tanımlanmıştı — JS'de
     bir obje literal'inde aynı isim tekrar edince SONUNCUSU geçerli olur,
     yani dosya temizleyen (Storage silen) İLK tanım hiç çalışmıyordu; tüm
     mesaj ekleri konuşma silindiğinde Storage'da YETİM kalıyordu. Tekrar
     eden ikinci (temizlik yapmayan) tanım kaldırıldı. Silinen dosyaların
     toplam boyutu da döndürülür — depolama kullanım sayacından düşülebilsin
     diye (bkz. mesajlasma.service.js). */
  async mesajlariTopluSil(konusmaId){
    const snap = await db.collection(COL.mesajlar).where('konusmaId', '==', konusmaId).get();
    if(snap.empty) return { kullaniciBazliBayt: {} };
    // NOT: bir konuşmadaki dosyalar BİRDEN FAZLA farklı gönderene ait
    // olabilir — depolama sayacından doğru kişiden düşülebilsin diye
    // gönderen uid'sine göre gruplanıyor (bkz. mesajlasma.service.js).
    const kullaniciBazliBayt = {};
    await Promise.all(snap.docs.map(d=>{
      const veri = d.data();
      if(veri.dosya && veri.dosya.boyut && veri.gonderenUid){
        kullaniciBazliBayt[veri.gonderenUid] = (kullaniciBazliBayt[veri.gonderenUid]||0) + veri.dosya.boyut;
      }
      return veri.dosya && veri.dosya.storagePath ? this.dosyaSil(veri.dosya.storagePath).catch(()=>{}) : Promise.resolve();
    }));
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return { kullaniciBazliBayt };
  },

  /* ---------- Dosya eki (Firebase Storage) ----------
     Yol: mesajDosyalari/{konusmaId}/{zamanDamgasi}_{dosyaAdi}
     Not: Storage, bu koleksiyonların aksine Firestore DEĞİLDİR — ayrı bir
     Firebase ürünüdür, kendi güvenlik kuralları (Storage Rules) gerekir. */
  dosyaYukle(konusmaId, dosya, ilerlemeCb){
    return new Promise((resolve, reject)=>{
      const yol = `mesajDosyalari/${konusmaId}/${Date.now()}_${dosya.name}`;
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

  /* ---------- Kullanıcı dizini (mesajlaşılacak kişiyi bulmak için) ----------
     Not: Bu tek seferlik (canlı dinleme değil) bir sorgu — herkesin TÜM
     kullanıcı hesapları koleksiyonunu (e-posta, admin bayrağı içerir)
     canlı dinlemesini gerektirmeden, sadece "bu öğretmenin hesabı var mı,
     uid'i ne" sorusuna cevap verir. */
  kullaniciUidBulOgretmenId(ogretmenId){
    return db.collection(COL.kullanicilar).where('bagliOgretmenId', '==', ogretmenId).limit(1).get();
  }
};
