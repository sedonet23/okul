/* ================================================================
   js/core/services/siniflar.service.js
   SINIFLAR MODÜLÜ — İŞ KURALLARI + YETKİ KONTROLÜ

   Bu katman:
   - Her yazma işleminden önce duzenleyebilir('siniflar') kontrolü yapar.
   - Sınıf adı benzersizliği, öğrenci/veli eşleştirme (Excel, e-Okul)
     gibi saf iş mantığını barındırır.
   - db değişkenine DOĞRUDAN dokunmaz — sadece SiniflarRepository çağırır.
   - Hiçbir DOM işlemi yapmaz (confirm/prompt/modal UI katmanında kalır).
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const SiniflarService = {

  /* ---------- Yetki yardımcı ---------- */
  _yetkiKontrol(){
    if(!duzenleyebilir('siniflar')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  /* ================= SINIFLAR ================= */
  adBenzersizMi(siniflarListesi, ad, haricId){
    return !(siniflarListesi || []).find(x => x.ad === ad && (!haricId || x.id !== haricId));
  },
  sinifKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? SiniflarRepository.sinifGuncelle(mevcutId, veri) : SiniflarRepository.sinifEkle(veri);
  },
  sinifSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return SiniflarRepository.sinifSil(id);
  },

  /* ================= VELİLER / ÖĞRENCİLER ================= */
  veliKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return mevcutId ? SiniflarRepository.veliGuncelle(mevcutId, veri) : SiniflarRepository.veliEkle(veri);
  },
  veliSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return SiniflarRepository.veliSil(id);
  },

  /* ================= SAF EŞLEME MANTIĞI (iş kuralı, DOM yok) ================= */
  /* Ad/soyad karşılaştırmasında TR yerel duyarlılığı ile eşleştirir. */
  _turkceEsitMi(a, b){
    return String(a||'').localeCompare(String(b||''), 'tr', { sensitivity: 'base' }) === 0;
  },
  sinifBul(siniflarListesi, ad){
    return (siniflarListesi || []).find(s => this._turkceEsitMi(s.ad, ad));
  },
  ogretmenBul(ogretmenlerListesi, adSoyad){
    return (ogretmenlerListesi || []).find(o => this._turkceEsitMi(`${o.ad} ${o.soyad}`, adSoyad));
  },
  servisBul(servislerListesi, servisAdi){
    return (servislerListesi || []).find(s => this._turkceEsitMi(s.servisAdi, servisAdi));
  },
  veliEslesenBul(velilerListesi, sinifId, ogrenciAdi){
    return (velilerListesi || []).find(v =>
      this._turkceEsitMi(v.ogrenciAdi, ogrenciAdi) && (!sinifId || v.sinifId === sinifId)
    );
  },
  /* e-Okul: numara varsa numaradan, yoksa adı-soyadıyla eşleştirir. */
  eOkulEslesenBul(mevcutOgrenciler, ogrenciNo, ogrenciAdi){
    return (mevcutOgrenciler || []).find(v =>
      (ogrenciNo && v.ogrenciNo === ogrenciNo) ||
      (!ogrenciNo && this._turkceEsitMi(v.ogrenciAdi, ogrenciAdi))
    );
  },
  eOkulCinsiyetNormallestir(deger){
    const v = String(deger || '').toLocaleLowerCase('tr');
    if(v.includes('kız') || v.includes('kiz')) return 'Kız';
    if(v.includes('erkek')) return 'Erkek';
    return '';
  },

  /* ================= TOPLU İÇE AKTARMA (yetki kontrollü, batch yazma) ================= */
  /* Öğrenci/Veli Excel içe aktarma — satır satır eşle/yaz, sonucu {eklenen, guncellenen} döner. */
  async ogrenciVeliListesiIceAktar(satirlar, velilerListesi){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    let eklenen = 0, guncellenen = 0;
    for(const veri of satirlar){
      const mevcut = this.veliEslesenBul(velilerListesi, veri.sinifId, veri.ogrenciAdi);
      if(mevcut){ await SiniflarRepository.veliGuncelle(mevcut.id, veri); guncellenen++; }
      else { await SiniflarRepository.veliEkle(veri); eklenen++; }
    }
    return { eklenen, guncellenen };
  },

  /* Sınıf Excel içe aktarma */
  async sinifListesiIceAktar(satirlar, siniflarListesi){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    let eklenen = 0, guncellenen = 0;
    for(const veri of satirlar){
      const mevcut = this.sinifBul(siniflarListesi, veri.ad);
      if(mevcut){ await SiniflarRepository.sinifGuncelle(mevcut.id, veri); guncellenen++; }
      else { await SiniflarRepository.sinifEkle({ ...veri, ogrenciSayisi: 0, kizSayisi: 0, erkekSayisi: 0 }); eklenen++; }
    }
    return { eklenen, guncellenen };
  },

  /* e-Okul onay ekranı sonrası: bloklar halinde eşleştirilmiş planları
     tek seferde (batch) yazar; her sınıf için kız/erkek/toplam sayaçlarını
     da günceller. planlar: [{ sinifId, eslesmeler:[{o, eslesen}], silinecekler:[{id}] }] */
  async eOkulPlanlariniUygula(planlar){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    let eklenecek = 0, guncellenecek = 0, silinecek = 0;
    let batch = SiniflarRepository.yeniBatch();
    let sayac = 0;
    const commitVeDevamEt = async () => { await SiniflarRepository.batchCommit(batch); batch = SiniflarRepository.yeniBatch(); sayac = 0; };

    for(const plan of planlar){
      for(const { o, eslesen } of plan.eslesmeler){
        const veri = { sinifId: plan.sinifId, ogrenciAdi: o.ogrenciAdi, ogrenciNo: o.ogrenciNo, cinsiyet: o.cinsiyet };
        if(eslesen){
          SiniflarRepository.batchVeliYaz(batch, veri, eslesen.id);
          guncellenecek++;
        } else {
          SiniflarRepository.batchVeliYaz(batch, {
            ...veri, veliAdi: '', yakinlik1: '', yakinlik2: '', yakinlik3: '',
            telefon1: '', telefon2: '', telefon3: '', adres: '', servisId: '', servisAdi: '', notlar: '',
            eklenmeTarihi: new Date().toISOString()
          });
          eklenecek++;
        }
        sayac++;
        if(sayac >= 400) await commitVeDevamEt();
      }
      for(const v of plan.silinecekler){
        SiniflarRepository.batchVeliSil(batch, v.id);
        silinecek++;
        sayac++;
        if(sayac >= 400) await commitVeDevamEt();
      }
      const kiz = plan.eslesmeler.filter(x => x.o.cinsiyet === 'Kız').length;
      const erkek = plan.eslesmeler.filter(x => x.o.cinsiyet === 'Erkek').length;
      SiniflarRepository.batchSinifYaz(batch, { kizSayisi: kiz, erkekSayisi: erkek, ogrenciSayisi: kiz + erkek }, plan.sinifId);
      sayac++;
      if(sayac >= 400) await commitVeDevamEt();
    }
    if(sayac > 0) await SiniflarRepository.batchCommit(batch);
    return { eklenecek, guncellenecek, silinecek };
  }
};
