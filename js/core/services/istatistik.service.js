/* ================================================================
   js/core/services/istatistik.service.js
   KULLANICI İSTATİSTİKLERİ MODÜLÜ

   Her kullanıcı için TEK bir özet belge tutulur (oy_kullaniciIstatistikleri,
   belge ID = uid). Sayaçlar FieldValue.increment() ile atomik artırılır,
   böylece 14 kullanıcı için gereksiz detay-log koleksiyonu / okuma maliyeti
   olmaz — admin panelini açtığında tek bir toplu okuma yeterli olur.

   Kayıt noktaları (bu dosya DIŞINDA, ilgili yerlere tek satır eklendi):
   - js/auth.js            → girişte IstatistikService.girisKaydet()
   - js/app.js (sekmeAc)   → sayfa değişince IstatistikService.sayfaZiyaretiKaydet(tab)
   - notlar.service.js     → yeni not eklenince IstatistikService.notEklemeKaydet()
   - dokumanlar.service.js → dosya yüklenince IstatistikService.dosyaYuklemeKaydet()

   Oturum süresi bu dosya İÇİNDE, kendi kendine (visibilitychange/beforeunload
   dinleyicileriyle) takip edilir — başka dosyaya dokunmaya gerek yok.
   ================================================================ */

const IstatistikService = {

  _kimlik(){
    if(typeof AKTIF_KULLANICI === 'undefined' || !AKTIF_KULLANICI) return null;
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : { ad: '' };
    return { uid: AKTIF_KULLANICI.uid, ad: kimlik.ad || AKTIF_KULLANICI.ad || AKTIF_KULLANICI.kullaniciAdi || 'Kullanıcı' };
  },

  _belgeRef(uid){
    return db.collection(COL.kullaniciIstatistikleri).doc(uid);
  },

  /* Ortak: belge yoksa oluşturur (merge:true), varsa günceller. Hatalar
     sessizce loglanır — istatistik kaydı asla kullanıcının asıl işlemini
     (not kaydetme, dosya yükleme vb.) engellememeli/başarısız kılmamalı. */
  async _guncelle(alanlar){
    const ben = this._kimlik();
    if(!ben || !ben.uid || !db) return;
    try{
      await this._belgeRef(ben.uid).set({
        ad: ben.ad,
        guncellenmeTarihi: firebase.firestore.FieldValue.serverTimestamp(),
        ...alanlar
      }, { merge: true });
    }catch(e){
      console.warn('İstatistik kaydedilemedi (yoksayıldı):', e);
    }
  },

  girisKaydet(){
    this._guncelle({
      girisSayisi: firebase.firestore.FieldValue.increment(1),
      sonGiris: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  dosyaYuklemeKaydet(){
    this._guncelle({ dosyaYuklemeSayisi: firebase.firestore.FieldValue.increment(1) });
  },

  /* ---------- YENİ: Depolama sınırları (kategori bazlı kota) ----------
     Kategori: 'mesaj' | 'duyuru' | 'dokuman' | 'takvim'. Kullanım verisi
     depolamaKullanimi.{kategori} alanında bayt cinsinden tutulur. Bkz.
     js/core/services/depolama-sinir.service.js (kota kontrolü burada
     DEĞİL, orada yapılır — bu servis sadece sayaç tutar). */
  depolamaKullanimEkle(kategori, bayt){
    if(!bayt || !kategori) return;
    this._guncelle({ [`depolamaKullanimi.${kategori}`]: firebase.firestore.FieldValue.increment(bayt) });
  },
  depolamaKullanimCikar(kategori, bayt){
    if(!bayt || !kategori) return;
    this._guncelle({ [`depolamaKullanimi.${kategori}`]: firebase.firestore.FieldValue.increment(-bayt) });
  },
  /* Toplu silme gibi durumlarda (ör. bir konuşmanın TÜM mesajları silinirken)
     dosyalar İSTEĞİ YAPAN kişiden BAŞKA birine ait olabilir — bu yüzden
     _guncelle()'in aksine (her zaman "şu an giriş yapmış kişi" varsayar) bu
     fonksiyon hedef uid'i açıkça alır. */
  depolamaKullanimCikarUid(uid, kategori, bayt){
    if(!bayt || !kategori || !uid || !db) return;
    db.collection(COL.kullaniciIstatistikleri).doc(uid).set({
      [`depolamaKullanimi.${kategori}`]: firebase.firestore.FieldValue.increment(-bayt)
    }, { merge:true }).catch(e => console.warn('İstatistik (depolama) güncellenemedi (yoksayıldı):', e));
  },

  notEklemeKaydet(){
    this._guncelle({ notEklemeSayisi: firebase.firestore.FieldValue.increment(1) });
  },

  sayfaZiyaretiKaydet(sayfaAdi){
    if(!sayfaAdi) return;
    // Nested alan adı (dot-path) — Firestore'da bir "map" alanı olarak saklanır.
    this._guncelle({ [`sayfaZiyaretleri.${sayfaAdi}`]: firebase.firestore.FieldValue.increment(1) });
  },

  sureEkle(saniye){
    if(!saniye || saniye < 1) return;
    this._guncelle({ toplamSureSaniye: firebase.firestore.FieldValue.increment(Math.round(saniye)) });
  },

  /* Admin paneli için: tüm kullanıcıların istatistik özetlerini tek
     seferde çeker (14 kullanıcı için tek bir okuma grubu — maliyetsiz). */
  async tumIstatistikleriGetir(){
    const snap = await db.collection(COL.kullaniciIstatistikleri).get();
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  }
};

/* ---------- Oturumda geçirilen süre: kendi kendine takip ---------- */
(function _oturumSuresiTakibiKur(){
  let baslangic = Date.now();
  let aktif = !document.hidden;

  function _kaydetVeSifirla(){
    if(!aktif) return;
    const gecenSaniye = (Date.now() - baslangic) / 1000;
    IstatistikService.sureEkle(gecenSaniye);
    baslangic = Date.now();
  }

  document.addEventListener('visibilitychange', () => {
    if(document.hidden){
      _kaydetVeSifirla();
      aktif = false;
    } else {
      aktif = true;
      baslangic = Date.now();
    }
  });

  // Sekme/pencere kapanırken son dilimi de kaydetmeyi dener.
  // (Ağ isteği tamamlanmayabilir, bu normaldir — kritik bir veri değil.)
  window.addEventListener('beforeunload', _kaydetVeSifirla);
})();
