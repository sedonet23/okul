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
  /* Bir konuşmaya ait TÜM mesajları toplu siler (konuşma silinirken kullanılır). */
  async mesajlariTopluSil(konusmaId){
    const snap = await db.collection(COL.mesajlar).where('konusmaId', '==', konusmaId).get();
    if(snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    return batch.commit();
  },

  /* ---------- Kullanıcı dizini (mesajlaşılacak kişiyi bulmak için) ----------
     Not: Bu tek seferlik (canlı dinleme değil) bir sorgu — herkesin TÜM
     kullanıcı hesapları koleksiyonunu (e-posta, admin bayrağı içerir)
     canlı dinlemesini gerektirmeden, sadece "bu öğretmenin hesabı var mı,
     uid'i ne" sorusuna cevap verir. */
  kullaniciUidBulOgretmenId(ogretmenId){
    return db.collection(COL.kullanicilar).where('bagliOgretmenId', '==', ogretmenId).limit(1).get();
  }
};
