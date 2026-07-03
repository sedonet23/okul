/* ================================================================
   js/core/repositories/kullanici-yonetimi.repository.js
   KULLANICI YÖNETİMİ MODÜLÜ — TEK FIRESTORE ERİŞİM NOKTASI
   (roller + kullanicilar)

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/kullanici-yonetimi.service.js

   Not: Bu modülün yetki kontrolü diğerlerinden farklıdır — genel
   duzenleyebilir(modul) sistemine değil, ayrı bir bayrağa
   (kullaniciYonetimiYetkisiVar()) bağlıdır, çünkü bu modül BİZZAT o
   yetki sistemini yönetir (roller ve kimin hangi modülü düzenleyebileceği).
   Kullanıcının Google girişiyle otomatik oluşturulan ilk belgesi
   (js/auth.js) ve kullanıcının kendi öğretmen profilini güncellemesi
   (COL.ogretmenler — henüz kendi repository'si olmayan bir koleksiyon)
   bilinçli olarak bu dosyanın dışında bırakıldı.
   ================================================================ */

const KullaniciYonetimiRepository = {

  /* ---------- Roller ---------- */
  rolleriDinle(callback, hataCb){
    return db.collection(COL.roller).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || (err => console.warn('Roller dinlenemedi:', err))
    );
  },
  rolEkle(veri){ return db.collection(COL.roller).add(veri); },
  rolGuncelle(id, veri){ return db.collection(COL.roller).doc(id).update(veri); },
  rolSil(id){ return db.collection(COL.roller).doc(id).delete(); },

  /* ---------- Kullanıcılar ---------- */
  kullanicilariDinle(callback, hataCb){
    return db.collection(COL.kullanicilar).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || (err => console.warn('Kullanıcılar dinlenemedi:', err))
    );
  },
  kullaniciGuncelle(uid, veri){ return db.collection(COL.kullanicilar).doc(uid).update(veri); }
};
