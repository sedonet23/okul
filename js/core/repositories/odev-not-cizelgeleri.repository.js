/* ================================================================
   js/core/repositories/odev-not-cizelgeleri.repository.js
   ÖDEV TAKİP + NOT ÇİZELGESİ — TEK FIRESTORE ERİŞİM NOKTASI
   (bkz. js/core/repositories/cizelgeler.repository.js ile aynı desen)

   İki koleksiyon de "tip" parametresiyle genelleştirilmiş şekilde
   yönetilir: 'odevTakip' | 'notCizelgesi' (bkz. firebase-init.js: COL).

   Bu dosyada SADECE db.collection() / onSnapshot() / add() / update() /
   delete() çağrıları bulunur. Hiçbir iş kuralı, hiçbir yetki kontrolü,
   hiçbir DOM işlemi burada yapılmaz (bkz. Pragmatik-Mimari-Tasarimi.md §2).
   Üstündeki katman: js/core/services/odev-not-cizelgeleri.service.js

   GÖRÜNÜRLÜK NOTU: Bu çizelgeler "sadece sahibi + admin görsün" kuralıyla
   tasarlandı — ama uygulamanın genel Firestore kuralları (firestore.rules)
   VARSAYILAN olarak giriş yapmış herkese okuma/yazma izni veriyor (diğer
   tüm koleksiyonlarda da aynı — bu uygulamanın genel güven modeli, burada
   yeni bir istisna açılmadı). Gizlilik burada İSTEMCİ TARAFINDA sağlanıyor:
   admin olmayan kullanıcılar için sorgu zaten sadece kendi sahipUid'siyle
   filtreleniyor (aşağıda), yani liste ekranında başkasının çizelgesi hiç
   görünmüyor/indirilmiyor — ama bu bir sunucu-taraflı güvenlik duvarı
   DEĞİL, mevcut mimariyle aynı seviyede bir gizlilik katmanıdır.
   ================================================================ */

const OdevNotCizelgeleriRepository = {
  /**
   * adminMi=false ise sorgu sahipUid ile sınırlanır (sadece kendi
   * çizelgeleri); admin=true ise TÜM kayıtlar dinlenir.
   */
  kayitlariDinle(tip, aktifUid, adminMi, callback, hataCb){
    let ref = db.collection(COL[tip]);
    if(!adminMi){
      ref = ref.where('sahipUid', '==', aktifUid);
    }
    return ref.onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  kayitEkle(tip, veri){
    return db.collection(COL[tip]).add({ ...veri, olusturmaTarihi: new Date().toISOString() });
  },
  kayitGuncelle(tip, id, veri){
    return db.collection(COL[tip]).doc(id).update(veri);
  },
  kayitSil(tip, id){
    return db.collection(COL[tip]).doc(id).delete();
  },
  /** Tek bir hücreyi günceller — tüm dokümanı yeniden yazmadan (dot-path). */
  hucreGuncelle(tip, id, hucreAnahtari, deger){
    return db.collection(COL[tip]).doc(id).update({ ['hucreler.' + hucreAnahtari]: deger });
  },
  /** Sütun ekle/çıkar veya öğrenci ekle/çıkar gibi tüm-alan güncellemeleri için. */
  alanGuncelle(tip, id, alanAdi, deger){
    return db.collection(COL[tip]).doc(id).update({ [alanAdi]: deger });
  },
  /** Taslak kaydı — sutunlar/ogrenciler/hucreler alanlarını TEK bir update() ile yazar. */
  taslakKaydet(tip, id, sutunlar, ogrenciler, hucreler){
    return db.collection(COL[tip]).doc(id).update({ sutunlar, ogrenciler, hucreler });
  }
};
