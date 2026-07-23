/* ================================================================
   js/core/services/depolama-sinir.service.js
   DEPOLAMA SINIRLARI — kategori bazlı (mesaj / duyuru / dokuman / takvim)
   depolama kotası. Her kategori Ayarlar > Depolama Sınırları'ndan ayrı
   ayrı açılıp kapatılabilir ve ayrı bir MB sınırı olabilir. Belirli
   kullanıcılar admin tarafından TÜM sınırlardan muaf tutulabilir
   (oy_kullanicilar/{uid}.depolamaMuaf — bkz. js/istatistikler.js).

   Kullanım verisi: oy_kullaniciIstatistikleri/{uid}.depolamaKullanimi.{kategori}
   (bayt) — sayaç bu dosyada DEĞİL, IstatistikService'te tutulur/güncellenir
   (bkz. depolamaKullanimEkle/Cikar). Bu dosya SADECE ayarları okur/yazar ve
   "yükleme yapılabilir mi" kararını verir — Pragmatik-Mimari-Tasarimi.md §2
   ile tutarlı: iş kuralı burada, ham Firestore erişimi de burada (tek bir
   ayar dokümanı olduğu için ayrı bir repository dosyasına gerek görülmedi).

   Kullanan yerler: dokumanlar/duyurular/mesajlasma/akademik-takvim
   servislerindeki yükleme fonksiyonları, upload öncesi
   DepolamaSinirService.yuklemeIzniVarMi(kategori, dosya.size) çağırır.
   ================================================================ */

const DEPOLAMA_KATEGORILERI = ['mesaj', 'duyuru', 'dokuman', 'takvim'];
const DEPOLAMA_KATEGORI_ADLARI = {
  mesaj:   'Mesajlaşma Dosyaları',
  duyuru:  'Duyurular Galerisi',
  dokuman: 'Dokümanlar',
  takvim:  'Akademik Takvim'
};

const DepolamaSinirService = {
  _ref(){ return db.collection(COL.depolamaAyarlari).doc('ayarlar'); },

  varsayilanAyarlar(){
    const t = {};
    DEPOLAMA_KATEGORILERI.forEach(k => { t[k] = { aktif: true, MB: 100 }; });
    return t;
  },

  /* Eksik kategori/alanları varsayılanla tamamlayarak her zaman TAM bir
     obje döndürür — Ayarlar formu ve kota kontrolü hep aynı şekle güvenebilsin. */
  _tamamla(veri){
    const tam = this.varsayilanAyarlar();
    DEPOLAMA_KATEGORILERI.forEach(k => { if(veri && veri[k]) tam[k] = { ...tam[k], ...veri[k] }; });
    return tam;
  },

  dinle(callback, hataCb){
    return this._ref().onSnapshot(
      doc => callback(this._tamamla(doc.exists ? doc.data() : null)),
      hataCb || hataGoster
    );
  },

  kaydet(ayarlar){
    if(!(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin)){
      return Promise.reject(new Error('yetkisiz'));
    }
    return this._ref().set(ayarlar, { merge:true });
  },

  /* Belirtilen kategoride yeni bir dosya yüklenip yüklenemeyeceğini
     kontrol eder. Şu durumlarda HER ZAMAN izin verir (fail-open — kota
     kontrolü asla kullanıcının asıl işlemini kilitleyecek bir hataya
     dönüşmemeli):
       - o kategori için sınır kapalıysa
       - kullanıcı muaf tutulmuşsa (depolamaMuaf:true)
       - kontrol sırasında bir hata oluşursa (ör. çevrimdışı) */
  async yuklemeIzniVarMi(kategori, yeniBayt){
    if(typeof AKTIF_KULLANICI === 'undefined' || !AKTIF_KULLANICI) return { izinVar:true };
    try{
      const ayarSnap = await this._ref().get();
      const ayar = (ayarSnap.exists && ayarSnap.data()[kategori]) || { aktif:false, MB:100 };
      if(!ayar.aktif) return { izinVar:true };

      const kulSnap = await db.collection(COL.kullanicilar).doc(AKTIF_KULLANICI.uid).get();
      if(kulSnap.exists && kulSnap.data().depolamaMuaf) return { izinVar:true };

      const istSnap = await db.collection(COL.kullaniciIstatistikleri).doc(AKTIF_KULLANICI.uid).get();
      const mevcutBayt = (istSnap.exists && istSnap.data().depolamaKullanimi && istSnap.data().depolamaKullanimi[kategori]) || 0;
      const sinirBayt = ayar.MB * 1024 * 1024;
      if(mevcutBayt + (yeniBayt||0) > sinirBayt){
        const kalanMB = Math.max(0, (sinirBayt - mevcutBayt) / (1024*1024)).toFixed(1);
        return {
          izinVar:false,
          mesaj:`${DEPOLAMA_KATEGORI_ADLARI[kategori] || kategori} için depolama sınırınıza (${ayar.MB} MB) ulaştınız. Kalan: ${kalanMB} MB.`
        };
      }
      return { izinVar:true };
    }catch(e){
      console.warn('[Depolama Sınırı] Kontrol başarısız, izin verildi:', e);
      return { izinVar:true };
    }
  }
};
