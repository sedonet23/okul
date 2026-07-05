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
     DÜZELTME (v5 — varsayılan güvenlik yönü değişti): Eskiden alan hiç
     yoksa (eski kayıtlar) "her zaman görünür" sayılıyordu — bu, okulun
     "herkes başkasının dökümanını görmesin" beklentisiyle çelişiyordu.
     Artık SADECE açıkça gorunurluk==='herkes' olan kayıtlar herkese
     görünür; hem 'kisisel' HEM DE alanı hiç olmayan eski kayıtlar artık
     "özel" sayılır (sadece sahibi + admin görür). Var olan eski
     dökümanların sahiplerinin görmeye devam etmesi için ekstra bir
     göç/migration script'ine gerek yok — bu kural sadece görüntülemeyi
     etkiliyor, veriyi değiştirmiyor. */
  gorunurMu(d){
    if(!d) return false;
    if(d.gorunurluk === 'herkes') return true;
    const ben = this._kendiKimlik();
    if(ben.adminMi) return true;
    return !!(ben.uid && d.olusturanUid === ben.uid);
  },
  gorunurListele(hamListe){
    return (hamListe||[]).filter(d => this.gorunurMu(d));
  },

  /* Bir dökümanın görünürlüğünü SONRADAN değiştirir — SADECE admin
     kullanabilir. Böylece admin, başkasının yüklediği "özel" bir
     dökümanı isterse "herkese açık" yapabilir (ya da tersi). */
  gorunurlukDegistirilebilirMi(){
    return this._kendiKimlik().adminMi;
  },
  async dokumanGorunurlukGuncelle(id, yeniGorunurluk){
    if(!this.gorunurlukDegistirilebilirMi()) return Promise.reject(new Error('yetkisiz'));
    return DokumanlarRepository.dokumanGuncelle(id, { gorunurluk: yeniGorunurluk });
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
