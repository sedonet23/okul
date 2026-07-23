/* ================================================================
   js/core/services/mesajlasma.service.js
   MESAJLAŞMA MODÜLÜ — İŞ KURALLARI + YETKİ KONTROLÜ

   Bu katman:
   - Konuşma listesini görmek için gorebilir('mesajlasma'), yeni konuşma
     başlatmak/mesaj göndermek için duzenleyebilir('mesajlasma') kontrolü
     yapar.
   - Aynı iki kişi arasında birden fazla 1-1 konuşma açılmasını engeller
     (var olanı bulup kullanır).
   - Okunmamış mesaj sayaçlarını (okunmayanlar) günceller.
   - db değişkenine DOĞRUDAN dokunmaz — sadece MesajlasmaRepository çağırır.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const MesajlasmaService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('mesajlasma')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  _kendiKimlik(){
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : { ad: '', fotoUrl: '' };
    return {
      uid: (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null,
      ad: kimlik.ad || 'Kullanıcı',
      foto: kimlik.fotoUrl || ''
    };
  },

  /* Bir öğretmen kaydına bağlı hesabın uid'ini bulur. Hesap yoksa/hiç giriş
     yapmadıysa null döner (çağıran taraf uygun mesajı gösterir). */
  async _ogretmenUidBul(ogretmenId){
    const snap = await MesajlasmaRepository.kullaniciUidBulOgretmenId(ogretmenId);
    if(snap.empty) return null;
    return snap.docs[0].id;
  },

  /* Bir öğretmenle 1-1 konuşma başlatır — varsa mevcut konuşmayı bulup
     döner, yoksa yeni oluşturur. mevcutKonusmalar: UI'da zaten yüklü olan
     konuşma listesi (gereksiz Firestore sorgusu yapmamak için). */
  async konusmaBaslatOgretmenIle(ogretmenId, ogretmenAdi, mevcutKonusmalar, ogretmenFotoUrl){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    const ben = this._kendiKimlik();
    if(!ben.uid) throw new Error('kimlik-yok');
    const digerUid = await this._ogretmenUidBul(ogretmenId);
    if(!digerUid) throw new Error('hesap-yok');
    if(digerUid === ben.uid) throw new Error('kendine-mesaj');

    const varOlan = (mevcutKonusmalar||[]).find(k =>
      !k.grupMu && k.katilimciUidler.length===2 &&
      k.katilimciUidler.includes(ben.uid) && k.katilimciUidler.includes(digerUid)
    );
    if(varOlan) return varOlan.id;

    const ref = await MesajlasmaRepository.konusmaOlustur({
      katilimciUidler: [ben.uid, digerUid],
      katilimciAdlari: { [ben.uid]: ben.ad, [digerUid]: ogretmenAdi },
      // YENİ: Katılımcıların profil fotoğrafları da konuşma oluşturulurken
      // "damgalanıyor" — isimlerle aynı yaklaşım (canlı değil, oluşturma
      // anındaki fotoğraf saklanıyor; kişi sonradan fotoğrafını değiştirirse
      // eski konuşmalarda eski fotoğraf görünmeye devam eder — isimlerdeki
      // mevcut davranışla tutarlı).
      katilimciFotolari: { [ben.uid]: ben.foto || '', [digerUid]: ogretmenFotoUrl || '' },
      grupMu: false,
      sonMesaj: null,
      okunmayanlar: { [ben.uid]: 0, [digerUid]: 0 }
    });
    return ref.id;
  },

  /* Grup konuşması oluşturur. katilimcilar: [{uid, ad, foto}, ...] (kendisi hariç). */
  async grupOlustur(grupAdi, katilimcilar){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    const ben = this._kendiKimlik();
    if(!ben.uid) throw new Error('kimlik-yok');
    if(!grupAdi || !grupAdi.trim()) throw new Error('grup-adi-gerekli');
    if(!katilimcilar.length) throw new Error('katilimci-gerekli');

    const katilimciUidler = [ben.uid, ...katilimcilar.map(k=>k.uid)];
    const katilimciAdlari = { [ben.uid]: ben.ad };
    const katilimciFotolari = { [ben.uid]: ben.foto || '' };
    const okunmayanlar = { [ben.uid]: 0 };
    katilimcilar.forEach(k => { katilimciAdlari[k.uid] = k.ad; katilimciFotolari[k.uid] = k.foto || ''; okunmayanlar[k.uid] = 0; });

    const ref = await MesajlasmaRepository.konusmaOlustur({
      katilimciUidler, katilimciAdlari, katilimciFotolari, grupMu: true, grupAdi: grupAdi.trim(),
      sonMesaj: null, okunmayanlar
    });
    return ref.id;
  },

  /* Mesaj gönderir + konuşma özetini (son mesaj, okunmamış sayaçları) günceller. */
  async mesajGonder(konusmaId, metin, mevcutKonusma){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    const temizMetin = (metin||'').trim();
    if(!temizMetin) throw new Error('mesaj-bos');
    const ben = this._kendiKimlik();
    if(!ben.uid) throw new Error('kimlik-yok');

    await MesajlasmaRepository.mesajEkle({
      konusmaId, gonderenUid: ben.uid, gonderenAdi: ben.ad, metin: temizMetin
    });

    const yeniOkunmayanlar = { ...(mevcutKonusma?.okunmayanlar || {}) };
    (mevcutKonusma?.katilimciUidler || []).forEach(uid=>{
      yeniOkunmayanlar[uid] = uid === ben.uid ? 0 : (yeniOkunmayanlar[uid]||0) + 1;
    });
    return MesajlasmaRepository.konusmaGuncelle(konusmaId, {
      sonMesaj: { metin: temizMetin, gonderenUid: ben.uid, tarih: new Date().toISOString() },
      guncellenmeTarihi: new Date().toISOString(),
      okunmayanlar: yeniOkunmayanlar
    });
  },

  /* Bir konuşmayı "okundu" işaretler (kendi okunmamış sayacını sıfırlar). */
  okunduIsaretle(konusmaId, mevcutKonusma){
    const ben = this._kendiKimlik();
    if(!ben.uid || !mevcutKonusma) return Promise.resolve();
    if(!mevcutKonusma.okunmayanlar || !mevcutKonusma.okunmayanlar[ben.uid]) return Promise.resolve();
    const yeniOkunmayanlar = { ...mevcutKonusma.okunmayanlar, [ben.uid]: 0 };
    return MesajlasmaRepository.konusmaGuncelle(konusmaId, { okunmayanlar: yeniOkunmayanlar });
  },

  /* ---------- Dosya eki ---------- */
  // İzin verilen türler: PDF, Word, Excel, Resim — bkz. kullanıcı isteği.
  _IZIN_VERILEN_TURLER: {
    'application/pdf': { etiket: 'PDF', ikon: '📕' },
    'application/msword': { etiket: 'Word', ikon: '📘' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { etiket: 'Word', ikon: '📘' },
    'application/vnd.ms-excel': { etiket: 'Excel', ikon: '📗' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { etiket: 'Excel', ikon: '📗' },
    'image/jpeg': { etiket: 'Resim', ikon: '🖼️', gorselMi: true },
    'image/png': { etiket: 'Resim', ikon: '🖼️', gorselMi: true },
    'image/gif': { etiket: 'Resim', ikon: '🖼️', gorselMi: true },
    'image/webp': { etiket: 'Resim', ikon: '🖼️', gorselMi: true },
  },
  _MAKS_DOSYA_BOYUTU: 10 * 1024 * 1024, // 10 MB

  dosyaTuruBilgisi(mimeTuru){ return this._IZIN_VERILEN_TURLER[mimeTuru] || null; },

  /* Dosya ekiyle mesaj gönderir. ilerlemeCb(yuzde) yükleme sırasında UI'ı
     güncellemek için çağrılır. */
  async mesajGonderDosyaIle(konusmaId, dosya, mevcutKonusma, ilerlemeCb){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    const turBilgisi = this.dosyaTuruBilgisi(dosya.type);
    if(!turBilgisi) throw new Error('desteklenmeyen-tur');
    if(dosya.size > this._MAKS_DOSYA_BOYUTU) throw new Error('dosya-cok-buyuk');
    const ben = this._kendiKimlik();
    if(!ben.uid) throw new Error('kimlik-yok');

    if(typeof DepolamaSinirService !== 'undefined'){
      const izin = await DepolamaSinirService.yuklemeIzniVarMi('mesaj', dosya.size);
      if(!izin.izinVar) throw new Error('depolama-siniri:' + izin.mesaj);
    }

    const { url, storagePath } = await MesajlasmaRepository.dosyaYukle(konusmaId, dosya, ilerlemeCb);
    if(typeof IstatistikService !== 'undefined') IstatistikService.depolamaKullanimEkle('mesaj', dosya.size);

    await MesajlasmaRepository.mesajEkle({
      konusmaId, gonderenUid: ben.uid, gonderenAdi: ben.ad, metin: '',
      dosya: { ad: dosya.name, url, storagePath, tur: dosya.type, boyut: dosya.size, etiket: turBilgisi.etiket, gorselMi: !!turBilgisi.gorselMi }
    });

    const ozetMetin = `${turBilgisi.ikon} ${dosya.name}`;
    const yeniOkunmayanlar = { ...(mevcutKonusma?.okunmayanlar || {}) };
    (mevcutKonusma?.katilimciUidler || []).forEach(uid=>{
      yeniOkunmayanlar[uid] = uid === ben.uid ? 0 : (yeniOkunmayanlar[uid]||0) + 1;
    });
    return MesajlasmaRepository.konusmaGuncelle(konusmaId, {
      sonMesaj: { metin: ozetMetin, gonderenUid: ben.uid, tarih: new Date().toISOString() },
      guncellenmeTarihi: new Date().toISOString(),
      okunmayanlar: yeniOkunmayanlar
    });
  },

  /* Toplam okunmamış mesaj sayısı (bildirim rozetinde kullanılır). */
  toplamOkunmayan(konusmalar){
    const ben = this._kendiKimlik();
    if(!ben.uid) return 0;
    return (konusmalar||[]).reduce((top,k)=> top + ((k.okunmayanlar && k.okunmayanlar[ben.uid]) || 0), 0);
  },

  /* Bir mesajı bu kullanıcının silip silemeyeceğini belirler: admin her
     zaman silebilir; mesajın sahibi de kendi mesajını silebilir. */
  mesajSilinebilirMi(mesaj){
    if(typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin) return true;
    const ben = this._kendiKimlik();
    return !!(ben.uid && mesaj && mesaj.gonderenUid === ben.uid);
  },

  /* Tek bir mesajı siler. Dosya ekiyse Storage'daki dosyayı da temizler.
     Not: konuşma listesindeki "son mesaj" önizlemesi bilinçli olarak
     GÜNCELLENMEZ (basitlik için) — silinen mesaj son mesajsa, yeni bir
     mesaj gelene kadar önizlemede görünmeye devam eder. */
  async mesajSil(mesaj){
    if(!this.mesajSilinebilirMi(mesaj)) throw new Error('sahip-degil');
    if(mesaj.dosya && mesaj.dosya.storagePath){
      await MesajlasmaRepository.dosyaSil(mesaj.dosya.storagePath).catch(()=>{});
      if(mesaj.dosya.boyut && typeof IstatistikService !== 'undefined'){
        IstatistikService.depolamaKullanimCikarUid(mesaj.gonderenUid, 'mesaj', mesaj.dosya.boyut);
      }
    }
    return MesajlasmaRepository.mesajSil(mesaj.id);
  },

  /* Bir konuşmayı (ve TÜM mesajlarını + varsa dosya eklerini) tamamen
     siler — hem kendisi hem karşı taraf için. Katılımcılardan biri
     (veya admin) silebilir. */
  async konusmaSil(konusmaId, mevcutKonusma){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    const ben = this._kendiKimlik();
    const katilimciMi = mevcutKonusma && (mevcutKonusma.katilimciUidler||[]).includes(ben.uid);
    const adminMi = typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin;
    if(!katilimciMi && !adminMi) throw new Error('sahip-degil');
    const { kullaniciBazliBayt } = await MesajlasmaRepository.mesajlariTopluSil(konusmaId);
    if(kullaniciBazliBayt && typeof IstatistikService !== 'undefined'){
      Object.entries(kullaniciBazliBayt).forEach(([uid, bayt]) => IstatistikService.depolamaKullanimCikarUid(uid, 'mesaj', bayt));
    }
    return MesajlasmaRepository.konusmaSil(konusmaId);
  }
};
