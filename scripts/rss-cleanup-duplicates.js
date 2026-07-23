/* ====================================================================
   scripts/rss-cleanup-duplicates.js

   TEK SEFERLİK temizlik betiği. rss-fetch.js'deki 200 kayıtlık pencere
   hatası yüzünden bazı kaynaklarda (özellikle Elazığ Meb Duyurular gibi
   eski maddeleri hep aynı besleme penceresinde tutan kaynaklarda) AYNI
   haber defalarca eklenmiş olabilir. Bu betik oy_haberler koleksiyonunu
   tarar, her kaynak+link (link yoksa kaynak+başlık) grubunda BİRDEN
   FAZLA kayıt varsa en eskisini (tarih olarak en küçük) saklar, geri
   kalanları siler.

   Nasıl çalıştırılır (GitHub Actions üzerinden, telefondan da tetiklenebilir):
     .github/workflows/rss-cleanup-duplicates.yml dosyasındaki
     "Run workflow" butonuna basmanız yeterli.

   Manuel/lokal çalıştırma:
     FIREBASE_SERVICE_ACCOUNT ortam değişkenine service account JSON'ını
     koyup: node scripts/rss-cleanup-duplicates.js
   ==================================================================== */

const admin = require('firebase-admin');

function serviceAccountJsonAyristir(ham){
  if(!ham) return null;
  const metin = ham.trim();
  try{ return JSON.parse(metin); }
  catch(ilkHata){
    const basla = metin.indexOf('{');
    const bitis = metin.lastIndexOf('}');
    if(basla !== -1 && bitis > basla){
      try{ return JSON.parse(metin.slice(basla, bitis + 1)); }
      catch(ikinciHata){
        console.error('FIREBASE_SERVICE_ACCOUNT geçerli bir JSON değil.');
        throw ikinciHata;
      }
    }
    throw ilkHata;
  }
}

async function main(){
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if(!json){
    console.error('FIREBASE_SERVICE_ACCOUNT secret eksik!');
    process.exit(1);
  }
  const serviceAccount = serviceAccountJsonAyristir(json);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  console.log('oy_haberler koleksiyonu taranıyor...');
  const snap = await db.collection('oy_haberler').get();
  console.log(`Toplam ${snap.size} kayıt bulundu.`);

  // Gruplama anahtarı: aynı kaynak + aynı link (utm vs. atılmış) ya da
  // link yoksa aynı kaynak + normalize edilmiş başlık.
  const gruplar = new Map();
  snap.docs.forEach(d => {
    const v = d.data();
    const linkTemiz = (v.link || '').split('?')[0];
    const anahtar = linkTemiz
      ? `${v.kaynakAdi || ''}|link:${linkTemiz}`
      : `${v.kaynakAdi || ''}|baslik:${(v.baslik || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim()}`;
    if(!gruplar.has(anahtar)) gruplar.set(anahtar, []);
    gruplar.get(anahtar).push({ id: d.id, ...v });
  });

  const silinecekIdler = [];
  let etkilenenGrupSayisi = 0;
  for(const [, kayitlar] of gruplar){
    if(kayitlar.length <= 1) continue;
    etkilenenGrupSayisi++;
    // En eskisini (tarih en küçük olanı) sakla, diğerlerini sil.
    kayitlar.sort((a, b) => new Date(a.tarih) - new Date(b.tarih));
    const saklanan = kayitlar[0];
    const tekrarlar = kayitlar.slice(1);
    console.log(`"${saklanan.kaynakAdi}" — "${saklanan.baslik}": 1 saklanacak, ${tekrarlar.length} tekrar silinecek`);
    tekrarlar.forEach(k => silinecekIdler.push(k.id));
  }

  console.log(`${etkilenenGrupSayisi} grup birden fazla kayıt içeriyordu. Toplam silinecek: ${silinecekIdler.length}`);

  if(silinecekIdler.length === 0){
    console.log('Silinecek tekrar kayıt yok, koleksiyon zaten temiz.');
    return;
  }

  for(let i = 0; i < silinecekIdler.length; i += 400){
    const parca = silinecekIdler.slice(i, i + 400);
    const batch = db.batch();
    parca.forEach(id => batch.delete(db.collection('oy_haberler').doc(id)));
    await batch.commit();
    console.log(`${Math.min(i + 400, silinecekIdler.length)}/${silinecekIdler.length} silindi...`);
  }

  console.log('Temizlik tamamlandı.');
}

main().catch(err => { console.error(err); process.exit(1); });
