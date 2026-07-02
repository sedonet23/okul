/* ================================================================
   js/core/utils.js
   ORTAK YARDIMCI FONKSİYONLAR

   Bu dosya, modüller arasında tekrar eden yardımcı işlevleri tek bir
   Utils nesnesi altında toplar. AMAÇ: yeni yazılan kodun (repository/
   service katmanları ve yeni modüller) bu fonksiyonları tekrar
   yazmak yerine buradan çağırması.

   ÖNEMLİ — GERİYE DÖNÜK UYUMLULUK:
   Mevcut dosyalarda (örn. js/app.js içindeki escapeHtml) bu
   fonksiyonların birebir kopyaları hâlâ duruyor ve çalışmaya devam
   ediyor. Bu dosya onların yerini ALMIYOR, üzerine YAZMIYOR — sadece
   yeni kod için tek bir kaynak sunuyor. Eski kopyalar, ilgili modül
   migrate edilirken (bkz. Pragmatik-Mimari-Tasarimi.md §8) tek tek
   kaldırılıp buraya yönlendirilecek.
   ================================================================ */

const Utils = {

  /* ---- HTML güvenliği ---- */
  escapeHtml(str){
    if(str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /* ---- Tarih/saat yardımcıları ---- */
  pad2(n){
    return n.toString().padStart(2, '0');
  },

  isoToday(){
    const d = new Date();
    return `${d.getFullYear()}-${this.pad2(d.getMonth()+1)}-${this.pad2(d.getDate())}`;
  },

  turkiyeSimdi(){
    const simdi = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const tarih = `${simdi.getUTCFullYear()}-${this.pad2(simdi.getUTCMonth()+1)}-${this.pad2(simdi.getUTCDate())}`;
    const saat  = `${this.pad2(simdi.getUTCHours())}:${this.pad2(simdi.getUTCMinutes())}`;
    return { tarih, saat, tam: `${tarih} ${saat}` };
  },

  /* ---- Ortak silme onayı ----
     Mevcut kodda 15+ yerde tekrar eden
     "if(confirm('...emin misiniz?')){ ... }" deseninin ortak hali.
     Kullanım: Utils.onayliSil('Bu kaydı silmek istediğinize emin misiniz?', () => { ...silme işlemi... }); */
  onayliSil(mesaj, islemFn){
    if(confirm(mesaj || 'Bu kaydı silmek istediğinize emin misiniz?')){
      islemFn();
    }
  },

  /* ---- Basit debounce (arama kutuları, otomatik kaydetme vb. için ileride kullanılabilir) ---- */
  debounce(fn, gecikmeMs){
    let zamanlayici = null;
    return function(...args){
      clearTimeout(zamanlayici);
      zamanlayici = setTimeout(() => fn.apply(this, args), gecikmeMs || 300);
    };
  }
};
