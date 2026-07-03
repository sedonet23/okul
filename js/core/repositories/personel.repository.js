/* ================================================================
   js/core/repositories/personel.repository.js
   PERSONEL MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (personel + personelIzinler)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/personel.service.js

   Not: "personelIzinler" (izin/rapor kayıtları — Puantaj/İmza Sirküsü
   modülünün kaynak verisi) ayrı bir modül gibi görünse de, veri modelinde
   personele sıkı bağlı olduğu ve tek yetki anahtarı ('personel') altında
   yönetildiği için aynı repository altında toplandı.
   ================================================================ */

const PersonelRepository = {

  /* ---------- Personel ---------- */
  personelDinle(callback, hataCb){
    return db.collection(COL.personel).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  personelEkle(veri){ return db.collection(COL.personel).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  personelGuncelle(id, veri){ return db.collection(COL.personel).doc(id).update(veri); },
  personelSil(id){ return db.collection(COL.personel).doc(id).delete(); },

  /* ---------- Personel İzin/Rapor Kayıtları ---------- */
  izinleriDinle(callback, hataCb){
    return db.collection(COL.personelIzinler).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  izinEkle(veri){ return db.collection(COL.personelIzinler).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  izinGuncelle(id, veri){ return db.collection(COL.personelIzinler).doc(id).update(veri); },
  izinSil(id){ return db.collection(COL.personelIzinler).doc(id).delete(); }
};
