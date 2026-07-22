/* ================================================================
   js/core/repositories/sinav-sonuclari.repository.js
   SINAV SONUÇLARI — Deneme ve Test sonuçları TAMAMEN AYRI koleksiyonlarda
   tutulur (kullanıcı isteği: "test sonuçları ayrı deneme sonuçları ayrı
   olacak") ama AYNI şemayı kullandıkları için tek bir FABRİKA fonksiyonu
   ile iki bağımsız repository üretiliyor — kod tekrarı yok, veri karışmıyor.

   Belge şeması (her iki koleksiyon için de aynı):
   { ad, tarih, sinifSeviyesi, dersler:[dersAdi,...], olusturanAdi,
     olusturmaTarihi,
     sonuclar:[{ ogrenciId, ogrenciAdi, sinif,
                 dersSonuclari:{ dersAdi:{dogru,yanlis,net} },
                 toplamNet }] }
   ================================================================ */
function SinavSonuclariRepositoryOlustur(koleksiyonAdi){
  return {
    sinavlariDinle(callback, hataCb){
      return db.collection(koleksiyonAdi).orderBy('tarih','desc').onSnapshot(
        s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
        hataCb || hataGoster
      );
    },
    sinavEkle(veri){ return db.collection(koleksiyonAdi).add(veri); },
    sinavGuncelle(id, veri){ return db.collection(koleksiyonAdi).doc(id).update(veri); },
    sinavSil(id){ return db.collection(koleksiyonAdi).doc(id).delete(); },
    /* Bir öğrencinin BU koleksiyondaki tüm sınavlardaki sonuçlarını
       taramak için sınav listesi zaten yerelde (dinleniyor) olduğundan
       ayrı bir sorguya gerek yok — js/sinav-sonuclari.js içinde
       filtrelenip kullanılıyor. */
  };
}
