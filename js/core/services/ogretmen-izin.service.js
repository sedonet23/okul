/* ================================================================
   js/core/services/ogretmen-izin.service.js
   ÖĞRETMEN İZİN / RAPOR TAKİP MODÜLÜ — İŞ KURALLARI + YETKİ KONTROLÜ

   Bu katman:
   - Her yazma işleminden önce duzenleyebilir('ogretmenler') kontrolü yapar
     (öğretmen izin kayıtları öğretmen profiline bağlı — ayrı bir yetki
     anahtarı tanımlı değil, bkz. js/kullanici-yonetimi.js).
   - Gün sayısı hesaplama gibi saf iş kurallarını barındırır.
   - İzin kaydıyla otomatik bitiş-hatırlatıcısı oluşturma/silme iş akışını
     tek bir yerden orkestre eder (eskiden js/ogretmen-izin.js içinde
     doğrudan Firestore'a dokunarak yapılıyordu).
   - db değişkenine DOĞRUDAN dokunmaz — sadece OgretmenIzinRepository çağırır.
   (bkz. Pragmatik-Mimari-Tasarimi.md §2, §5)
   ================================================================ */

const OgretmenIzinService = {

  _yetkiKontrol(){
    if(!duzenleyebilir('ogretmenler')){ toast('Bu işlem için yetkiniz yok.'); return false; }
    return true;
  },

  gunSayisiHesapla(baslangic, bitis){
    const b1 = new Date(baslangic + 'T00:00:00');
    const b2 = new Date(bitis + 'T00:00:00');
    return Math.round((b2 - b1) / 86400000) + 1;
  },
  tarihAraligiGecerliMi(baslangic, bitis){
    return !!(baslangic && bitis) && bitis >= baslangic;
  },
  _isoTarihYaz(d){
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  },

  /* İzin kaydeder; varsa eski bitiş-hatırlatıcısını siler, gerekiyorsa
     (bitiş bugünden ileriyse) yenisini oluşturup izin kaydına bağlar. */
  async izinKaydet(mevcutId, eskiHatirlaticiId, adSoyad, veri){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');

    if(eskiHatirlaticiId) await OgretmenIzinRepository.hatirlaticiSil(eskiHatirlaticiId);

    let hatirlaticiId = null;
    const bitisTarihi = new Date(veri.bitis + 'T00:00:00');
    const hatirlaticiTarihi = new Date(bitisTarihi.getTime() - 86400000);
    if(hatirlaticiTarihi >= new Date(todayISO()+'T00:00:00')){
      const hRef = await OgretmenIzinRepository.hatirlaticiEkle({
        baslik: `🏥 ${adSoyad} — ${veri.tur} bitiyor`,
        tarih: this._isoTarihYaz(hatirlaticiTarihi),
        saat: '',
        oncelik: 'Orta',
        aciklama: `${veri.tur} kaydı ${formatTarih(veri.bitis)} tarihinde sona eriyor.`,
        tamamlandi: false,
        bildirimGonderildi: false
      });
      hatirlaticiId = hRef.id;
    }
    veri = { ...veri, hatirlaticiId };

    return mevcutId ? OgretmenIzinRepository.izinGuncelle(mevcutId, veri) : OgretmenIzinRepository.izinEkle(veri);
  },

  async izinSil(id, hatirlaticiId){
    if(!this._yetkiKontrol()) throw new Error('yetkisiz');
    if(hatirlaticiId) await OgretmenIzinRepository.hatirlaticiSil(hatirlaticiId);
    return OgretmenIzinRepository.izinSil(id);
  }
};
