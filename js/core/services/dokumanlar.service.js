/* ================================================================
   js/core/services/dokumanlar.service.js
   DÖKÜMANLAR MODÜLÜ — YETKİ KONTROLÜ

   - Her yazma işleminden önce duzenleyebilir('dokumanlar') kontrolü yapar.
   - db değişkenine DOĞRUDAN dokunmaz — sadece DokumanlarRepository çağırır.
   - DÜZELTME (v2): Dosya artık Firebase Storage'da tutuluyor (eskiden
     IndexedDB — bkz. repository notu); dosya yükleme + Firestore metadata
     kaydını TEK bir işlem olarak burada birleştiriyoruz.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const DokumanlarService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('dokumanlar')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  /* Dosyayı Storage'a yükler + Firestore metadata kaydını oluşturur.
     ilerlemeCb(yuzde) yükleme sırasında UI'ı güncellemek için çağrılır.
     hariciUrl verilirse (Google Drive vb.) dosya yüklemesi atlanır. */
  async dokumanEkle(metaTaban, dosya, ilerlemeCb){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    let meta = { ...metaTaban };
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
