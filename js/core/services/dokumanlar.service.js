/* ================================================================
   js/core/services/dokumanlar.service.js
   DÖKÜMANLAR MODÜLÜ — YETKİ KONTROLÜ + GÖRÜNÜRLÜK KURALI

   - Her yazma işleminden önce duzenleyebilir('dokumanlar') kontrolü yapar.
   - db değişkenine DOĞRUDAN dokunmaz — sadece DokumanlarRepository çağırır.
   - DÜZELTME (v3): Dökümanlara görünürlük eklendi —
       'herkes'  : okulda herkes görür (admin + tüm öğretmenler)
       'kisisel' : sadece EKLEYEN kişi + admin görür
     Admin olmayan (öğretmen) kullanıcılar SADECE 'kisisel' döküman
     ekleyebilir — 'herkes' seçeneği formda bile gösterilmez, ama arka
     planda da (burada) zorlanır; UI'daki seçim asla tek başına yeterli
     güvence değildir. Admin her iki türü de ekleyebilir.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const DokumanlarService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('dokumanlar')){ toast('Bu işlem için yetkiniz yok.'); return false; }
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

  /* Dosyayı Storage'a yükler + Firestore metadata kaydını oluşturur.
     ilerlemeCb(yuzde) yükleme sırasında UI'ı güncellemek için çağrılır.
     hariciUrl verilirse (Google Drive vb.) dosya yüklemesi atlanır. */
  async dokumanEkle(metaTaban, dosya, ilerlemeCb){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    const ben = this._kendiKimlik();
    // DÜZELTME: 'herkes' görünürlüğü sadece admin seçebilir — öğretmen
    // formda görünürlük seçemediği için zaten metaTaban.gorunurluk hiç
    // gelmez, ama biri teknik yolla zorlarsa bile burada ezilir.
    const gorunurluk = ben.adminMi && metaTaban.gorunurluk === 'herkes' ? 'herkes' : 'kisisel';
    let meta = { ...metaTaban, gorunurluk, olusturanUid: ben.uid, olusturanAdi: ben.ad };
    if(dosya){
      const { url, storagePath } = await DokumanlarRepository.dosyaYukle(dosya, ilerlemeCb);
      meta = { ...meta, dosyaUrl: url, storagePath, dosyaAdi: dosya.name, dosyaBoyutu: dosya.size, dosyaTipi: dosya.type };
    }
    return DokumanlarRepository.dokumanEkle(meta);
  },
  async dokumanSil(id, storagePath){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(storagePath) await DokumanlarRepository.dosyaSil(storagePath).catch(()=>{});
    return DokumanlarRepository.dokumanSil(id);
  }
};
