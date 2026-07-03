/* ================================================================
   js/core/services/push.service.js
   PUSH BİLDİRİM MODÜLÜ

   Bu modülde yetki kontrolü YOK — cihaz kaydı ve bildirim kategori
   tercihi, her kullanıcının kendi cihazı için yaptığı kişisel bir
   ayardır, içerik/veri düzenleme yetkisi ile ilgisizdir (bkz.
   push.repository.js notu). Katman yine de tutarlılık için var:
   db değişkenine DOĞRUDAN dokunmaz, sadece PushRepository çağırır.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const PushService = {
  cihazKaydet(token, veri){ return PushRepository.cihazKaydet(token, veri); },
  kategorileriGuncelle(token, kategoriler){ return PushRepository.kategorileriGuncelle(token, kategoriler); }
};
