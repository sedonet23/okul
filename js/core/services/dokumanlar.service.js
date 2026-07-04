/* ================================================================
   js/core/services/dokumanlar.service.js
   DÖKÜMANLAR MODÜLÜ — YETKİ KONTROLÜ + GÖRÜNÜRLÜK KURALI

   DÜZELTME (v4) — yetki modeli netleştirildi:
   - EKLEME: 'dokumanlar' modülünü GÖREBİLEN (Görüntüle veya Düzenle,
     Gizle değil) HERKES kendi kişisel dökümanını ekleyebilir. Bu artık
     "Düzenle" seviyesine bağlı DEĞİL — aksi halde "Görüntüle" yetkili
     bir öğretmen kendi dökümanını bile ekleyemiyordu.
   - SİLME: SADECE admin veya dökümanı ekleyen kişi silebilir — bu da
     genel modül yetki seviyesinden (Görüntüle/Düzenle) TAMAMEN BAĞIMSIZ.
     Önceden "Düzenle" yetkisi tek başına yeterliydi, bu da "Düzenle"
     yetkili herhangi bir öğretmenin ADMİN'İN dökümanını bile
     silebilmesine sebep oluyordu.
   - GÖRÜNÜRLÜK: 'herkes' (okulda herkes görür) sadece ADMİN seçebilir;
     öğretmen her zaman 'kisisel' (sadece kendisi + admin) ekler.
   - db değişkenine DOĞRUDAN dokunmaz — sadece DokumanlarRepository çağırır.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const DokumanlarService = {

  _kendiKimlik(){
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : { ad: '' };
    return {
      uid: (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null,
      ad: kimlik.ad || 'Kullanıcı',
      adminMi: typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true
    };
  },

  /* Bir dökümanın mevcut kullanıcıya görünüp görünmeyeceğini belirler.
     'herkes' (veya eski/gorunurluk alanı hiç olmayan kayıtlar — geriye
     dönük uyumluluk) her zaman görünür; 'kisisel' sadece admin veya
     kaydı ekleyen kişiye görünür. */
  gorunurMu(d){
    if(!d || d.gorunurluk !== 'kisisel') return true;
    const ben = this._kendiKimlik();
    if(ben.adminMi) return true;
    return !!(ben.uid && d.olusturanUid === ben.uid);
  },
  gorunurListele(hamListe){
    return (hamListe||[]).filter(d => this.gorunurMu(d));
  },

  /* Bir dökümanı mevcut kullanıcının silip silemeyeceğini belirler:
     admin her zaman silebilir; değilse SADECE dökümanı ekleyen kişi
     silebilir. Genel modül yetki seviyesinden (Görüntüle/Düzenle)
     bağımsızdır — bkz. dosya başındaki not. */
  dokumanSilinebilirMi(d){
    const ben = this._kendiKimlik();
    if(ben.adminMi) return true;
    return !!(ben.uid && d && d.olusturanUid === ben.uid);
  },

  /* Dosyayı Storage'a yükler + Firestore metadata kaydını oluşturur.
     ilerlemeCb(yuzde) yükleme sırasında UI'ı güncellemek için çağrılır.
     hariciUrl verilirse (Google Drive vb.) dosya yüklemesi atlanır. */
  async dokumanEkle(metaTaban, dosya, ilerlemeCb){
    // DÜZELTME: Artık duzenleyebilir('dokumanlar') DEĞİL, gorebilir(...)
    // kontrol ediliyor — modülü görebilen (Görüntüle dahil) herkes kendi
    // kişisel dökümanını ekleyebilsin diye.
    if(!gorebilir('dokumanlar')){ toast('Bu işlem için yetkiniz yok.'); throw new Error('yetkisiz'); }
    const ben = this._kendiKimlik();
    // 'herkes' görünürlüğü sadece admin seçebilir — öğretmen formda
    // görünürlük seçemediği için zaten metaTaban.gorunurluk hiç gelmez,
    // ama biri teknik yolla zorlarsa bile burada ezilir.
    const gorunurluk = ben.adminMi && metaTaban.gorunurluk === 'herkes' ? 'herkes' : 'kisisel';
    let meta = { ...metaTaban, gorunurluk, olusturanUid: ben.uid, olusturanAdi: ben.ad };
    if(dosya){
      const { url, storagePath } = await DokumanlarRepository.dosyaYukle(dosya, ilerlemeCb);
      meta = { ...meta, dosyaUrl: url, storagePath, dosyaAdi: dosya.name, dosyaBoyutu: dosya.size, dosyaTipi: dosya.type };
    }
    return DokumanlarRepository.dokumanEkle(meta);
  },
  async dokumanSil(id, storagePath, mevcutDokuman){
    if(!this.dokumanSilinebilirMi(mevcutDokuman)) return Promise.reject(new Error('sahip-degil'));
    if(storagePath) await DokumanlarRepository.dosyaSil(storagePath).catch(()=>{});
    return DokumanlarRepository.dokumanSil(id);
  }
};
