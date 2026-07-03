/* ================================================================
   js/core/services/tasima.service.js
   TAŞIMA MODÜLÜ — İŞ KURALLARI + YETKİ KONTROLÜ (servisler)

   Bu katman:
   - Her yazma işleminden önce duzenleyebilir('tasima') kontrolü yapar.
   - Öğrencileri servise toplu atama gibi, servisler + veliler
     koleksiyonlarını birlikte etkileyen iş akışlarını yürütür.
   - db değişkenine DOĞRUDAN dokunmaz — sadece TasimaRepository ve
     (öğrenci ataması için) SiniflarRepository çağırır.
   - Hiçbir DOM işlemi yapmaz (confirm/prompt/modal UI katmanında kalır).
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const TasimaService = {

  /* ---------- Yetki yardımcı ---------- */
  _yetkiKontrol(){
    if(!duzenleyebilir('tasima')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  /* ================= SERVİSLER ================= */
  servisKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? TasimaRepository.servisGuncelle(mevcutId, veri) : TasimaRepository.servisEkle(veri);
  },
  servisSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return TasimaRepository.servisSil(id);
  },

  /* ================= ÖĞRENCİ ↔ SERVİS ATAMASI (veliler koleksiyonunu etkiler) =================
     Not: "veliler" koleksiyonunun TEK Firestore erişim noktası SiniflarRepository'dir
     (bkz. Pragmatik-Mimari-Tasarimi.md — sınıf/öğrenci veri modeli siniflar modülüne ait).
     Bu fonksiyon, taşıma modülünün iş akışı olarak öğrencilere servis ataması yapar. */
  ogrencileriServiseAta(ogrenciIdListesi, servisId, servisAdi){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return Promise.all(
      ogrenciIdListesi.map(vId => SiniflarRepository.veliGuncelle(vId, { servisId, servisAdi }))
    );
  }
};
