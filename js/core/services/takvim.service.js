/* ================================================================
   js/core/services/takvim.service.js
   TAKVİM MODÜLÜ — İŞ KURALLARI + YETKİ KONTROLÜ (hatirlaticilar + gorevler)

   Bu katman:
   - Her yazma işleminden önce duzenleyebilir('takvim') kontrolü yapar.
   - Yeni kayıt eklerken, tam yetkili olmayan kullanıcının kaydını KİŞİSEL
     olarak damgalar (sahipUid) — bu kural eskiden js/app.js'teki genel
     kaydet() fonksiyonunda gizliydi, artık burada açık ve modüle özel
     (bkz. notlar.service.js'teki aynı desen).
   - Görünürlük filtresini (kisiselKayitGorunurMu — app.js'te tanımlı,
     notlar ile paylaşılıyor) uygular.
   - db değişkenine DOĞRUDAN dokunmaz — sadece TakvimRepository çağırır.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const TakvimService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('takvim')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  /* Ham listeyi görünürlük kuralına göre filtreler (bkz. js/app.js kisiselKayitGorunurMu). */
  gorunurListele(hamListe){
    return (typeof kisiselKayitGorunurMu === 'function')
      ? hamListe.filter(kisiselKayitGorunurMu)
      : hamListe;
  },
  // DÜZELTME: Artık admin de dahil HERKESİN yeni kaydı sahipUid ile damgalanır
  // — "kimse kimsenin hatırlatıcı/görevini göremesin" kuralı için her kaydın
  // bir sahibi olması gerekiyor; sahipsiz kayıtlar artık öğretmenlere hiç
  // görünmüyor (bkz. app.js kisiselKayitGorunurMu).
  _sahipDamgasiUygula(mevcutId, veri){
    if(!mevcutId && typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI){
      return { ...veri, sahipUid: AKTIF_KULLANICI.uid };
    }
    return veri;
  },

  /* ================= HATIRLATICILAR / ETKİNLİKLER ================= */
  hatirlaticiKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    veri = this._sahipDamgasiUygula(mevcutId, veri);
    return mevcutId ? TakvimRepository.hatirlaticiGuncelle(mevcutId, veri) : TakvimRepository.hatirlaticiEkle(veri);
  },
  hatirlaticiSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return TakvimRepository.hatirlaticiSil(id);
  },
  hatirlaticiTamamlandiGuncelle(id, deger){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return TakvimRepository.hatirlaticiGuncelle(id, { tamamlandi: deger });
  },

  /* ================= GÖREVLER ================= */
  gorevKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    veri = this._sahipDamgasiUygula(mevcutId, veri);
    return mevcutId ? TakvimRepository.gorevGuncelle(mevcutId, veri) : TakvimRepository.gorevEkle(veri);
  },
  gorevSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return TakvimRepository.gorevSil(id);
  },
  gorevDurumGuncelle(id, durum){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return TakvimRepository.gorevGuncelle(id, { durum });
  },
  gorevTamamlandiGuncelle(id, deger){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return TakvimRepository.gorevGuncelle(id, { tamamlandi: deger, durum: deger ? 'tamamlandi' : 'yapilacak' });
  }
};
