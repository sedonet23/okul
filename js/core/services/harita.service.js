/* ================================================================
   js/core/services/harita.service.js
   HARİTA MODÜLÜ — YETKİ KONTROLÜ

   - Her yazma işleminden önce duzenleyebilir('harita') kontrolü yapar.
   - Güzergah kaydını (COL.servisler'i etkiler) TasimaRepository üzerinden
     yapar — bkz. harita.repository.js notu.
   - db değişkenine DOĞRUDAN dokunmaz.
   - DÜZELTME: Favoriler eskiden TAMAMEN PAYLAŞIMLIYDI — herkesin
     eklediği favori herkese görünüyordu (kimin nereye gittiği, sık
     kullandığı adresler gibi kişisel bilgiler istemsizce ifşa
     oluyordu). Artık her favori sahibiyle damgalanıyor; görüntüleme ve
     silme SADECE sahibi + admin ile sınırlı (dokumanlar modülüyle aynı desen).
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const HaritaService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('harita')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  _kendiKimlik(){
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : { ad: '' };
    return {
      uid: (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null,
      ad: kimlik.ad || 'Kullanıcı',
      adminMi: typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true
    };
  },

  /* Bir favorinin mevcut kullanıcıya görünüp görünmeyeceğini belirler:
     admin her favoriyi görür; diğerleri SADECE kendi ekledikleri
     favorileri görür. Eski (olusturanUid alanı olmayan) kayıtlar
     geriye dönük uyumluluk için sadece admin'e görünür (sahipsiz veri
     kimseye rastgele gösterilmesin diye). */
  favoriGorunurMu(f){
    const ben = this._kendiKimlik();
    if(ben.adminMi) return true;
    return !!(ben.uid && f.olusturanUid === ben.uid);
  },
  gorunurFavoriler(hamListe){
    return (hamListe||[]).filter(f => this.favoriGorunurMu(f));
  },
  favoriSilinebilirMi(f){
    const ben = this._kendiKimlik();
    if(ben.adminMi) return true;
    return !!(ben.uid && f.olusturanUid === ben.uid);
  },

  favoriEkle(veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    const ben = this._kendiKimlik();
    return HaritaRepository.favoriEkle({ ...veri, olusturanUid: ben.uid, olusturanAdi: ben.ad });
  },
  favoriSil(id, mevcutFavori){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(mevcutFavori && !this.favoriSilinebilirMi(mevcutFavori)) return Promise.reject(new Error('sahip-degil'));
    return HaritaRepository.favoriSil(id);
  },
  guzergahKaydet(servisId, mesafeKm, koordinatlar){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return TasimaRepository.servisGuncelle(servisId, {
      guzergahMesafe: mesafeKm,
      guzergahKoordinatlar: koordinatlar
    });
  }
};
