/* ================================================================
   js/core/services/nobet.service.js
   NÖBET MODÜLÜ — İŞ KURALLARI + YETKİ KONTROLÜ

   Bu katman:
   - Her yazma işleminden önce duzenleyebilir('nobet') kontrolü yapar.
   - Rotasyon hesaplama ve Excel eşleme gibi saf iş mantığını barındırır.
   - db değişkenine DOĞRUDAN dokunmaz — sadece NobetRepository çağırır.
   - Hiçbir DOM işlemi yapmaz (confirm/prompt/modal UI katmanında kalır).
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const NobetService = {

  /* ---------- Yetki yardımcı ---------- */
  _yetkiKontrol(){
    if(!duzenleyebilir('nobet')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  /* ================= NÖBET YERLERİ ================= */
  yeriEkle(ad){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return NobetRepository.yerEkle({ ad, sira: (window.nobetYerleri || []).length + 1, eklenmeTarihi: new Date().toISOString() });
  },
  yeriGuncelle(id, yeniAd){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return NobetRepository.yerGuncelle(id, { ad: yeniAd });
  },
  async yeriSil(id, baglıAtamalar){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    const batch = NobetRepository.yeniBatch();
    batch.delete(db.collection(COL.nobetYerleri).doc(id));
    (baglıAtamalar || []).forEach(a => NobetRepository.batchAtamaSil(batch, a.id));
    return NobetRepository.batchCommit(batch);
  },

  /* ================= RESMİ TATİLLER ================= */
  tatilEkle(veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return NobetRepository.tatilEkle(veri);
  },
  tatilSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return NobetRepository.tatilSil(id);
  },

  /* ================= ATAMA / AMİR KAYDI ================= */
  atamaKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? NobetRepository.atamaGuncelle(mevcutId, veri) : NobetRepository.atamaEkle(veri);
  },
  atamaSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return NobetRepository.atamaSil(id);
  },
  /* YENİ: Hatırlatma sistemi için — nöbetçi öğretmen kendi "nöbet
     defterini doldurdum" işaretini koyabilir. Genel nöbet düzenleme
     yetkisine (admin/duzenleyebilir) BAKILMAZ — sadece atamanın kendisine
     ait olması (ya da admin olması) yeterlidir. */
  defterDolduToggle(atama, deger){
    const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
    const adminMi = typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI && AKTIF_KULLANICI.admin;
    if(!adminMi && (!ben || atama.ogretmenId !== ben.id)) return Promise.reject(new Error('sahip-degil'));
    return NobetRepository.atamaGuncelle(atama.id, { defterDolduruldu: !!deger });
  },
  amirKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? NobetRepository.amirGuncelle(mevcutId, veri) : NobetRepository.amirEkle(veri);
  },
  amirSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return NobetRepository.amirSil(id);
  },

  /* ================= SAF YARDIMCI FONKSİYONLAR (iş kuralı, DOM yok) ================= */
  tarihISO(y, m, d){ return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; },
  haftasonuMu(y, m, d){ const g = new Date(y,m,d).getDay(); return g===0 || g===6; },
  tatilMi(resmiTatiller, iso){ return resmiTatiller.find(t=>t.tarih===iso); },
  yerSirali(nobetYerleri){ return [...nobetYerleri].sort((a,b)=>(a.sira||0)-(b.sira||0)); },
  haftaAraligi(tarihISO){
    const d = new Date(tarihISO+'T00:00:00');
    const gun = d.getDay() || 7;
    const pazartesi = new Date(d); pazartesi.setDate(d.getDate()-gun+1);
    const gunler = [];
    for(let i=0;i<5;i++){ const x=new Date(pazartesi); x.setDate(pazartesi.getDate()+i); gunler.push(this.tarihISO(x.getFullYear(), x.getMonth(), x.getDate())); }
    return gunler;
  },

  /* ================= EXCEL İÇE AKTARMA — EŞLEME MANTIĞI ================= */
  excelAdiSadelestir(metin){
    return String(metin||'').replace(/\(.*?\)/g,'').trim();
  },
  excelTarihHucresiISO(deger){
    if(deger instanceof Date && !isNaN(deger)) return deger.toISOString().slice(0,10);
    if(typeof deger === 'number'){
      const ms = Math.round((deger - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if(!isNaN(d)) return d.toISOString().slice(0,10);
    }
    return null;
  },
  excelOgretmenEslestir(ogretmenler, adSoyad){
    const aranan = this.excelAdiSadelestir(adSoyad).toLocaleLowerCase('tr');
    if(!aranan) return null;
    return ogretmenler.find(o => `${o.ad} ${o.soyad}`.toLocaleLowerCase('tr').trim() === aranan) || null;
  },

  /* Onaylanmış eşlemeleri Firestore'a yazar. UI bu fonksiyonu, kullanıcı
     eşleme ekranını onayladıktan SONRA çağırır. */
  async exceliUygula({ satirlar, baslikIdx, tarihCol, amirCol, eslemeler, nobetYerleri, nobetAtamalari, nobetciAmirleri, ogretmenler }){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));

    // 1) Eşlenen etiketlere karşılık gelen nöbet yerlerini bul/oluştur.
    const yerIdMap = {};
    let yeniSira = nobetYerleri.length;
    for(const e of eslemeler){
      const etiketTemiz = (e.etiket||'').trim().replace(/\s+/g,' ');
      const mevcutYer = nobetYerleri.find(y => (y.ad||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('tr') === etiketTemiz.toLocaleLowerCase('tr'));
      if(mevcutYer){
        yerIdMap[e.index] = mevcutYer.id;
      } else {
        yeniSira++;
        const ref = await NobetRepository.yerEkle({ ad: etiketTemiz, sira: yeniSira, eklenmeTarihi: new Date().toISOString() });
        yerIdMap[e.index] = ref.id;
      }
    }

    let atamaSayisi = 0, amirSayisi = 0, gunSayisi = 0;
    let batch = NobetRepository.yeniBatch(), batchSayac = 0;

    for(let r=baslikIdx+2; r<satirlar.length; r++){
      const satir = satirlar[r] || [];
      if(!satir.length || satir.every(v=>v==='')) continue;
      const iso = this.excelTarihHucresiISO(satir[tarihCol]);
      if(!iso) continue;
      gunSayisi++;

      for(const e of eslemeler){
        const ham = satir[e.index];
        if(!ham || String(ham).trim()==='') continue;
        const adSoyad = this.excelAdiSadelestir(ham);
        const ogretmenObj = this.excelOgretmenEslestir(ogretmenler, adSoyad);
        const yerId = yerIdMap[e.index];
        const mevcut = nobetAtamalari.find(a=>a.tarih===iso && a.yerId===yerId);
        const veri = { tarih: iso, yerId, ogretmenAdSoyad: ogretmenObj?`${ogretmenObj.ad} ${ogretmenObj.soyad}`:adSoyad, ogretmenId: ogretmenObj?ogretmenObj.id:null };
        NobetRepository.batchAtamaYaz(batch, veri, mevcut ? mevcut.id : null);
        batchSayac++; atamaSayisi++;
      }

      const amirHam = satir[amirCol];
      if(amirHam && String(amirHam).trim()!==''){
        const adSoyad = this.excelAdiSadelestir(amirHam);
        const ogretmenObj = this.excelOgretmenEslestir(ogretmenler, adSoyad);
        const mevcutAmir = nobetciAmirleri.find(a=>a.tarih===iso);
        const veri = { tarih: iso, ad: adSoyad, telefon: ogretmenObj?(ogretmenObj.telefon||''):'', ogretmenId: ogretmenObj?ogretmenObj.id:null };
        NobetRepository.batchAmirYaz(batch, veri, mevcutAmir ? mevcutAmir.id : null);
        batchSayac++; amirSayisi++;
      }

      if(batchSayac>=400){ await NobetRepository.batchCommit(batch); batch = NobetRepository.yeniBatch(); batchSayac=0; }
    }
    if(batchSayac>0) await NobetRepository.batchCommit(batch);

    return { gunSayisi, atamaSayisi, amirSayisi };
  },

  /* ================= OTOMATİK HAFTALIK ROTASYON DAĞITIMI =================
     MANTIK (bkz. eski js/nobet.js v7 yorumu):
     - Referans hafta = "bu hafta kim nerede" bilgisi
     - Sistem üretirken: her öğretmenin referanstaki yerinden başlar
     - Her nöbet tutulduğunda yer tersine çevrilir
     - Tatil: o günü atla, yer tersine çevir
     - Ay üretiminde: Firestore'dan önceki son atamaya bakılır
     ======================================================================= */
  async otomatikDagitimUygula({ hedefYil, hedefAy, bahceYerId, binaYerId, referansHafta, amirListesi, mevcutAmirSayac, nobetAtamalari, nobetciAmirleri, ogretmenler, nobetTatilMiFn }){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));

    const ayBasISO = `${hedefYil}-${String(hedefAy+1).padStart(2,'0')}-01`;
    const ayBitGun = new Date(hedefYil, hedefAy+1, 0).getDate();
    const ayBitISO = `${hedefYil}-${String(hedefAy+1).padStart(2,'0')}-${String(ayBitGun).padStart(2,'0')}`;

    // Seçilen ayı temizle
    const silAtamalar = nobetAtamalari.filter(a => a.tarih >= ayBasISO && a.tarih <= ayBitISO && (a.yerId === bahceYerId || a.yerId === binaYerId));
    const silAmirler  = nobetciAmirleri.filter(a => a.tarih >= ayBasISO && a.tarih <= ayBitISO);

    let silBatch = NobetRepository.yeniBatch(), silSayac = 0;
    for(const a of [...silAtamalar, ...silAmirler]){
      if(silAtamalar.includes(a)) NobetRepository.batchAtamaSil(silBatch, a.id);
      else silBatch.delete(db.collection(COL.nobetciAmirleri).doc(a.id));
      if(++silSayac >= 400){ await NobetRepository.batchCommit(silBatch); silBatch = NobetRepository.yeniBatch(); silSayac = 0; }
    }
    if(silSayac > 0) await NobetRepository.batchCommit(silBatch);

    toast('Nöbet programı oluşturuluyor…');

    // Her öğretmenin başlangıç yerini belirle (referans haftadan önceki son atamaya göre)
    const ogrSonAtama = {};
    try{
      const sorgu = await NobetRepository.atamalariOncesiGetir(ayBasISO);
      for(const doc of sorgu.docs){
        const a = doc.data();
        if(!a.ogretmenId) continue;
        if(a.yerId !== bahceYerId && a.yerId !== binaYerId) continue;
        if(!ogrSonAtama[a.ogretmenId] || a.tarih > ogrSonAtama[a.ogretmenId].tarih){
          ogrSonAtama[a.ogretmenId] = { tarih: a.tarih, yerId: a.yerId };
        }
      }
    }catch(e){ console.warn('Önceki atamalar:', e); }

    const ogrIlkYer = {};
    for(let g=1; g<=5; g++){
      const ref = referansHafta[g];
      for(const [ogrId, refYerId] of [[ref.bahce, bahceYerId],[ref.bina, binaYerId]]){
        if(ogrId in ogrIlkYer) continue;
        const son = ogrSonAtama[ogrId];
        ogrIlkYer[ogrId] = !son ? refYerId
          : (son.yerId === refYerId ? (refYerId === bahceYerId ? binaYerId : bahceYerId) : refYerId);
      }
    }

    const ayIlkGun = new Date(hedefYil, hedefAy, 1);
    const g0 = ayIlkGun.getDay() || 7;
    const gercekIlkPzt = new Date(hedefYil, hedefAy, 1 - g0 + 1);

    let amirSayac = mevcutAmirSayac || 0;
    let yazBatch = NobetRepository.yeniBatch(), yazSayac = 0;
    let toplamAtama = 0, toplamAmir = 0, atlananTatil = 0;
    const ogrNobetSayisi = {};

    const haftaPzt = new Date(gercekIlkPzt);
    while(true){
      for(let g=1; g<=5; g++){
        const d = new Date(haftaPzt);
        d.setDate(haftaPzt.getDate() + g - 1);
        const iso = this.tarihISO(d.getFullYear(), d.getMonth(), d.getDate());

        if(d.getMonth() !== hedefAy || d.getFullYear() !== hedefYil) continue;
        if(nobetTatilMiFn(iso)){ atlananTatil++; continue; }

        const ref = referansHafta[g];
        const bahceOgr = ogretmenler.find(o => o.id === ref.bahce);
        const binaOgr  = ogretmenler.find(o => o.id === ref.bina);

        if(bahceOgr){
          const n = ogrNobetSayisi[bahceOgr.id] || 0;
          const ilk = ogrIlkYer[bahceOgr.id] || bahceYerId;
          const ters = ilk === bahceYerId ? binaYerId : bahceYerId;
          const yerId = n % 2 === 0 ? ilk : ters;
          NobetRepository.batchAtamaYaz(yazBatch, { tarih: iso, yerId, ogretmenAdSoyad: bahceOgr.ad+' '+bahceOgr.soyad, ogretmenId: bahceOgr.id });
          yazSayac++; toplamAtama++;
          ogrNobetSayisi[bahceOgr.id] = n + 1;
        }
        if(binaOgr){
          const n = ogrNobetSayisi[binaOgr.id] || 0;
          const ilk = ogrIlkYer[binaOgr.id] || binaYerId;
          const ters = ilk === bahceYerId ? binaYerId : bahceYerId;
          const yerId = n % 2 === 0 ? ilk : ters;
          NobetRepository.batchAtamaYaz(yazBatch, { tarih: iso, yerId, ogretmenAdSoyad: binaOgr.ad+' '+binaOgr.soyad, ogretmenId: binaOgr.id });
          yazSayac++; toplamAtama++;
          ogrNobetSayisi[binaOgr.id] = n + 1;
        }
        if(amirListesi.length > 0){
          const amirId = amirListesi[amirSayac % amirListesi.length];
          const amirOgr = ogretmenler.find(o => o.id === amirId);
          if(amirOgr){
            NobetRepository.batchAmirYaz(yazBatch, { tarih: iso, ad: amirOgr.ad+' '+amirOgr.soyad, telefon: amirOgr.telefon||'', ogretmenId: amirOgr.id });
            yazSayac++; toplamAmir++;
          }
          amirSayac++;
        }
        if(yazSayac >= 400){ await NobetRepository.batchCommit(yazBatch); yazBatch = NobetRepository.yeniBatch(); yazSayac = 0; }
      }
      haftaPzt.setDate(haftaPzt.getDate() + 7);
      if(haftaPzt.getMonth() > hedefAy && haftaPzt.getFullYear() >= hedefYil) break;
      if(haftaPzt.getFullYear() > hedefYil) break;
    }
    if(yazSayac > 0) await NobetRepository.batchCommit(yazBatch);

    await NobetRepository.rotasyonKaydet({
      yerler: { bahce: bahceYerId, bina: binaYerId },
      referansHafta, amirListesi, amirSayac,
      guncelleme: new Date().toISOString().slice(0,10)
    });

    return { toplamAtama, toplamAmir, atlananTatil };
  }
};
