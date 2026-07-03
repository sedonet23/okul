/* ================================================================
   js/core/repositories/ogretmen-izin.repository.js
   ÖĞRETMEN İZİN / RAPOR TAKİP MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI
   (ogretmenIzinleri)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/ogretmen-izin.service.js

   Not: İzin bitişinden bir gün önce otomatik hatırlatıcı oluşturma/silme
   iş akışının parçası olarak "hatirlaticilar" koleksiyonuna da yazılır.
   Bu koleksiyonün henüz kendi modül/repository'si yok (bkz. notlar.repository.js
   notu — hatirlaticilar/gorevler şu an js/app.js'te genel yönetiliyor);
   bu iş akışına özgü minimal erişim burada tanımlandı.
   ================================================================ */

const OgretmenIzinRepository = {

  izinleriDinle(callback, hataCb){
    return db.collection(COL.ogretmenIzinleri).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  izinEkle(veri){ return db.collection(COL.ogretmenIzinleri).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  izinGuncelle(id, veri){ return db.collection(COL.ogretmenIzinleri).doc(id).update(veri); },
  izinSil(id){ return db.collection(COL.ogretmenIzinleri).doc(id).delete(); },

  /* ---------- Otomatik bitiş hatırlatıcısı (hatirlaticilar koleksiyonu) ---------- */
  hatirlaticiEkle(veri){ return db.collection(COL.hatirlaticilar).add({ ...veri, eklenmeTarihi: new Date().toISOString() }); },
  hatirlaticiSil(id){ return db.collection(COL.hatirlaticilar).doc(id).delete().catch(()=>{}); }
};
