/* ================================================================
   js/core/repositories/takvim.repository.js
   TAKVİM MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (hatirlaticilar + gorevler)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/takvim.service.js

   Not: "hatirlaticilar" ve "gorevler" koleksiyonları hem js/takvim.js
   (Aylık Takvim/Ajanda görünümü) hem de js/app.js'teki genel "Hızlı Ekle"
   butonundan açılan modallar tarafından kullanılıyor — TEK erişim noktası
   burası, her iki UI de bu repository'yi çağırır.
   ================================================================ */

const TakvimRepository = {

  /* ---------- Hatırlatıcılar (Etkinlikler) ---------- */
  hatirlaticilariDinle(callback, hataCb){
    return db.collection(COL.hatirlaticilar).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  hatirlaticiEkle(veri){ return db.collection(COL.hatirlaticilar).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  hatirlaticiGuncelle(id, veri){ return db.collection(COL.hatirlaticilar).doc(id).update(veri); },
  hatirlaticiSil(id){ return db.collection(COL.hatirlaticilar).doc(id).delete().catch(()=>{}); },

  /* ---------- Görevler ---------- */
  gorevleriDinle(callback, hataCb){
    return db.collection(COL.gorevler).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  gorevEkle(veri){ return db.collection(COL.gorevler).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  gorevGuncelle(id, veri){ return db.collection(COL.gorevler).doc(id).update(veri); },
  gorevSil(id){ return db.collection(COL.gorevler).doc(id).delete(); }
};
