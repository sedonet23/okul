/* ================================================================
   js/core/repositories/cizelgeler.repository.js
   ÇİZELGELER MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI
   (sosyalKulupler, sok, zumre, bepPlani, rehberlik, maarifRapor,
    belirliGunler, digerEvrak)

   Modülün kendisi zaten "tip" parametresiyle 8 farklı koleksiyonu
   genelleştirilmiş şekilde yönetiyordu (bkz. js/cizelgeler.js _cCol());
   bu repository aynı deseni Firestore erişim katmanına taşır.

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/cizelgeler.service.js
   ================================================================ */

const CizelgelerRepository = {
  kayitlariDinle(tip, callback, hataCb){
    return db.collection(COL[tip]).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  kayitEkle(tip, veri){ return db.collection(COL[tip]).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  kayitGuncelle(tip, id, veri){ return db.collection(COL[tip]).doc(id).update(veri); },
  kayitSil(tip, id){ return db.collection(COL[tip]).doc(id).delete(); },
  /* Grid'den hızlı dönem/ay checkbox toggle için: sadece kontroller alanını günceller. */
  kontrolleriGuncelle(tip, id, kontroller){ return db.collection(COL[tip]).doc(id).update({ kontroller }); }
};
