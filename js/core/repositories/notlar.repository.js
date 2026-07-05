/* ================================================================
   js/core/repositories/notlar.repository.js
   NOTLAR MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI (notlar)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/notlar.service.js

   Not: "Kişisel kayıt" görünürlük filtresi (kisiselKayitGorunurMu) ve
   sahipUid damgalama kuralı js/app.js'te tanımlıdır çünkü aynı kural
   hatirlaticilar/gorevler koleksiyonları için de kullanılıyor (bu
   koleksiyonların henüz kendi modül dosyaları yok — bkz. Pragmatik-
   Mimari-Tasarimi.md notu). NotlarService bu paylaşılan fonksiyonu çağırır.
   ================================================================ */

const NotlarRepository = {
  notlariDinle(callback, hataCb){
    return db.collection(COL.notlar).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  notEkle(veri){ return db.collection(COL.notlar).add({ ...veri, eklenmeTarihi: new Date().toISOString(), guncellenmeTarihi: new Date().toISOString() }); },
  // DÜZELTME: guncellenmeTarihi damgası eklendi — yedekten geri yükleme
  // artık bu notun backup'tan SONRA düzenlenip düzenlenmediğini bu alana
  // bakarak anlıyor (bkz. app.js yedektenGeriYukle). Bu damga olmadan,
  // eski bir yedeği geri yüklemek yeni yapılmış düzenlemeleri sessizce
  // eziyordu.
  notGuncelle(id, veri){ return db.collection(COL.notlar).doc(id).update({ ...veri, guncellenmeTarihi: new Date().toISOString() }); },
  notSil(id){ return db.collection(COL.notlar).doc(id).delete(); },
  /* Grid'den hızlı todo-toggle için: sadece maddeler alanını günceller. */
  notMaddeleriGuncelle(id, maddeler){ return db.collection(COL.notlar).doc(id).update({ maddeler, guncellenmeTarihi: new Date().toISOString() }); }
};
