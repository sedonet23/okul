/* ================================================================
   js/core/services/notlar.service.js
   NOTLAR MODÜLÜ — İŞ KURALLARI + YETKİ KONTROLÜ

   Bu katman:
   - Her yazma işleminden önce duzenleyebilir('notlar') kontrolü yapar.
   - Yeni not eklerken, tam yetkili olmayan kullanıcının kaydını KİŞİSEL
     olarak damgalar (sahipUid) — bu kural önceden js/app.js'teki genel
     kaydet() fonksiyonunda gizliydi, artık burada açık ve modüle özel.
   - Görünürlük filtresini (kisiselKayitGorunurMu — app.js'te tanımlı,
     hatirlaticilar/gorevler ile paylaşılıyor) uygular.
   - db değişkenine DOĞRUDAN dokunmaz — sadece NotlarRepository çağırır.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const NotlarService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('notlar')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  /* Ham listeyi görünürlük kuralına göre filtreler (kişisel notlar yalnız
     sahibine ve adminlere görünür — bkz. js/app.js kisiselKayitGorunurMu). */
  gorunurListele(hamListe){
    return (typeof kisiselKayitGorunurMu === 'function')
      ? hamListe.filter(kisiselKayitGorunurMu)
      : hamListe;
  },

  notKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    // DÜZELTME: Artık admin de dahil HERKESİN yeni notu sahipUid ile damgalanır
    // — "kimse kimsenin notunu göremesin" kuralı (öğretmenler birbirinden gizli,
    // admin her şeyi görür) için her kaydın bir sahibi olması gerekiyor;
    // sahipsiz kayıtlar artık öğretmenlere hiç görünmüyor (bkz. app.js
    // kisiselKayitGorunurMu).
    if(!mevcutId && typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI){
      veri = { ...veri, sahipUid: AKTIF_KULLANICI.uid };
    }
    return mevcutId ? NotlarRepository.notGuncelle(mevcutId, veri) : NotlarRepository.notEkle(veri);
  },
  notSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return NotlarRepository.notSil(id);
  },
  notMaddeleriGuncelle(id, maddeler){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return NotlarRepository.notMaddeleriGuncelle(id, maddeler);
  }
};
