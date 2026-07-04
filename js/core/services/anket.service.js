/* ================================================================
   js/core/services/anket.service.js
   ANKETLER MODÜLÜ — YETKİ KONTROLÜ

   - Anket OLUŞTURMA/KAPATMA/SİLME sadece admin.
   - Oy verme: modülü görebilen (gizli değilse) HERKES.
   - Detaylı sonuç (kim ne oy verdi): SADECE admin — anketleri zaten
     sadece admin oluşturduğu için "anketi oluşturan" ile "admin" aynı
     kişi grubu oluyor, ayrıca bir "olusturanUid" kontrolüne gerek yok.
   - db değişkenine DOĞRUDAN dokunmaz — sadece AnketRepository çağırır.
   ================================================================ */
const AnketService = {

  _kendiKimlik(){
    const kimlik = (typeof _hesapKimligi === 'function') ? _hesapKimligi() : { ad: '' };
    return {
      uid: (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null,
      ad: kimlik.ad || 'Kullanıcı',
      adminMi: typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin === true
    };
  },

  detayliSonucGorebilirMi(){
    return this._kendiKimlik().adminMi;
  },

  async anketOlustur(soru, secenekMetinleri, coklu){
    const ben = this._kendiKimlik();
    if(!ben.adminMi){ toast('Anket oluşturmak için yetkiniz yok.'); throw new Error('yetkisiz'); }
    if(!soru || !soru.trim()){ throw new Error('soru-gerekli'); }
    const gecerliSecenekler = (secenekMetinleri||[]).map(s=>s.trim()).filter(Boolean);
    if(gecerliSecenekler.length < 2){ throw new Error('yetersiz-secenek'); }

    const secenekler = gecerliSecenekler.map((metin, i) => ({ id: 'sk' + i + '_' + Date.now(), metin }));
    return AnketRepository.anketEkle({
      soru: soru.trim(),
      secenekler,
      coklu: !!coklu,
      aktif: true,
      olusturanUid: ben.uid,
      olusturanAdi: ben.ad,
      olusturmaTarihi: firebase.firestore.FieldValue.serverTimestamp(),
      oylar: {}
    });
  },

  async oyVer(anket, seciliSecenekIdler){
    const ben = this._kendiKimlik();
    if(!ben.uid) throw new Error('kimlik-yok');
    if(!gorebilir('anket')){ toast('Bu işlem için yetkiniz yok.'); throw new Error('yetkisiz'); }
    if(!anket.aktif){ toast('Bu anket kapatılmış, artık oy kullanılamaz.'); throw new Error('kapali'); }
    if(!seciliSecenekIdler.length){ toast('En az bir seçenek işaretleyin.'); return; }
    if(!anket.coklu && seciliSecenekIdler.length > 1){ toast('Bu ankette sadece tek seçenek işaretleyebilirsiniz.'); return; }

    const oylar = { ...(anket.oylar||{}) };
    oylar[ben.uid] = { secenekIdler: seciliSecenekIdler, ad: ben.ad, tarih: new Date().toISOString() };
    return AnketRepository.anketGuncelle(anket.id, { oylar });
  },

  async anketKapat(id, kapatilsinMi){
    const ben = this._kendiKimlik();
    if(!ben.adminMi){ toast('Bu işlem için yetkiniz yok.'); throw new Error('yetkisiz'); }
    return AnketRepository.anketGuncelle(id, { aktif: !kapatilsinMi });
  },

  async anketSil(id){
    const ben = this._kendiKimlik();
    if(!ben.adminMi){ toast('Bu işlem için yetkiniz yok.'); throw new Error('yetkisiz'); }
    return AnketRepository.anketSil(id);
  },

  /* Bir anketin sonuçlarını hesaplar: her seçenek için oy sayısı + yüzde,
     toplam katılımcı sayısı. Sayımlar HER ZAMAN oylar map'inden anlık
     hesaplanır (ayrı bir sayaç tutulmuyor) — bu, bir kişi oyunu
     değiştirdiğinde çifte sayım riskini ortadan kaldırır. */
  sonuclariHesapla(anket){
    const oylar = anket.oylar || {};
    const katilimciSayisi = Object.keys(oylar).length;
    const sayaçlar = {};
    anket.secenekler.forEach(s => sayaçlar[s.id] = 0);
    Object.values(oylar).forEach(oy => {
      (oy.secenekIdler||[]).forEach(id => { if(sayaçlar[id] !== undefined) sayaçlar[id]++; });
    });
    const sonuc = anket.secenekler.map(s => ({
      id: s.id, metin: s.metin, sayi: sayaçlar[s.id],
      yuzde: katilimciSayisi ? Math.round(sayaçlar[s.id] / katilimciSayisi * 100) : 0
    }));
    return { katilimciSayisi, secenekSonuclari: sonuc };
  },

  kendiOyunuGetir(anket){
    const ben = this._kendiKimlik();
    if(!ben.uid || !anket.oylar) return null;
    return anket.oylar[ben.uid] || null;
  }
};
