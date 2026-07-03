/* ================================================================
   js/core/services/periyodik.service.js
   PERİYODİK İŞLER MODÜLÜ — İŞ KURALLARI + YETKİ KONTROLÜ

   - Her yazma işleminden önce duzenleyebilir('periyodikIsler') kontrolü yapar.
   - Aylık şablondan o ayın gerçek tarihli görevlerini oluşturma (tekrar
     eden/var olanları atlama) iş kuralını barındırır.
   - db değişkenine DOĞRUDAN dokunmaz — sadece PeriyodikRepository çağırır.
   - Hiçbir DOM işlemi yapmaz (confirm/prompt/modal UI katmanında kalır).
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const PeriyodikService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('periyodikIsler')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  /* ================= PERİYODİK İŞLER ================= */
  isKaydet(mevcutId, veri){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    if(mevcutId) return PeriyodikRepository.isGuncelle(mevcutId, veri);
    return PeriyodikRepository.isEkle({ ...veri, eklenmeTarihi: new Date().toISOString() });
  },
  isSil(id){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return PeriyodikRepository.isSil(id);
  },
  tamamlandiGuncelle(id, deger){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return PeriyodikRepository.isGuncelle(id, { tamamlandi: deger });
  },

  /* ================= AYLIK ŞABLON ================= */
  sabloniKaydet(gorevler){
    if(!this._yetkiKontrol()) return Promise.reject(new Error('yetkisiz'));
    return PeriyodikRepository.sabloniKaydet(gorevler);
  },

  /* ================= "BU AYIN GÖREVLERİNİ OLUŞTUR" ================= */
  _gunToISO(yil, ay0, gun){
    const sonGun = new Date(yil, ay0+1, 0).getDate();
    return `${yil}-${String(ay0+1).padStart(2,'0')}-${String(Math.min(Math.max(gun,1), sonGun)).padStart(2,'0')}`;
  },
  _grupAnahtari(p){
    const t = p.bitis || p.baslangic;
    return t ? t.slice(0,7) : '9999-99';
  },
  /* Şablondaki her satır için, bu ayda henüz oluşturulmamışsa yeni bir
     periyodik iş kaydı oluşturur. {olusturulan, atlanan} döner. */
  async buAyinGorevleriniOlustur(sablon, mevcutIsler){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    if(!sablon.length) throw new Error('sablon-bos');
    const d = new Date();
    const yil = d.getFullYear(), ay0 = d.getMonth();
    let olusturulan = 0, atlanan = 0;
    for(const g of sablon){
      if(!g.isAdi) continue;
      const baslangic = this._gunToISO(yil, ay0, g.baslangicGun);
      const bitis = this._gunToISO(yil, ay0, g.bitisGun);
      const ayAnahtari = bitis.slice(0,7);
      const zatenVar = mevcutIsler.some(p => p.isAdi===g.isAdi && this._grupAnahtari(p)===ayAnahtari);
      if(zatenVar){ atlanan++; continue; }
      await PeriyodikRepository.isEkle({ isAdi:g.isAdi, baslangic, bitis, tamamlandi:false, not:'', bildirimGonderildi:false });
      olusturulan++;
    }
    return { olusturulan, atlanan };
  }
};
