/* ====================================================================
   BİLDİRİM KONTROL BETİĞİ
   GitHub Actions tarafından her 15 dakikada bir çalıştırılır.
   Firestore'daki hatırlatıcı ve görevleri kontrol eder,
   vadesi gelmiş olanlar için push bildirimi gönderir.

   GitHub Secrets'a eklenmesi gereken:
   FIREBASE_SERVICE_ACCOUNT → Firebase Console > Proje Ayarları >
   Hizmet Hesapları > Yeni Özel Anahtar Oluştur (JSON içeriği)
   ==================================================================== */

const admin = require('firebase-admin');

function pad(n){ return n.toString().padStart(2,'0'); }

function turkiyeSimdi(){
  const simdi = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const tarih = `${simdi.getUTCFullYear()}-${pad(simdi.getUTCMonth()+1)}-${pad(simdi.getUTCDate())}`;
  const saat  = `${pad(simdi.getUTCHours())}:${pad(simdi.getUTCMinutes())}`;
  return { tarih, saat, tam: `${tarih} ${saat}` };
}

async function main(){
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if(!json){
    console.error('FIREBASE_SERVICE_ACCOUNT secret eksik!');
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
  const db = admin.firestore();

  const { tarih: bugun, tam: simdi } = turkiyeSimdi();
  console.log('Kontrol zamanı (TR):', simdi);

  const gonderilecekler = [];

  // Hatırlatıcılar
  const hSnap = await db.collection('oy_hatirlaticilar').get();
  hSnap.forEach(doc => {
    const v = doc.data();
    if(v.tamamlandi || v.bildirimGonderildi || !v.tarih) return;
    const esik = `${v.tarih} ${v.saat || '00:00'}`;
    if(esik <= simdi){
      gonderilecekler.push({
        baslik: `⏰ Hatırlatıcı: ${v.baslik || ''}`,
        govde:  v.aciklama || `${v.tarih}${v.saat ? ' ' + v.saat : ''}`,
        col: 'oy_hatirlaticilar', id: doc.id
      });
    }
  });

  // Görevler
  const gSnap = await db.collection('oy_gorevler').get();
  gSnap.forEach(doc => {
    const v = doc.data();
    if(v.durum === 'tamamlandi' || v.bildirimGonderildi || !v.sonTarih) return;
    if(v.sonTarih <= bugun){
      gonderilecekler.push({
        baslik: `✅ Görev Vadesi: ${v.baslik || ''}`,
        govde:  v.aciklama || `Son tarih: ${v.sonTarih}`,
        col: 'oy_gorevler', id: doc.id
      });
    }
  });

  // Periyodik işler
  const pSnap = await db.collection('oy_periyodikIsler').get();
  pSnap.forEach(doc => {
    const v = doc.data();
    if(v.tamamlandi || v.bildirimGonderildi || !v.bitisTarihi) return;
    if(v.bitisTarihi <= bugun){
      gonderilecekler.push({
        baslik: `📋 Periyodik İş: ${v.baslik || ''}`,
        govde:  `Bitiş tarihi: ${v.bitisTarihi}`,
        col: 'oy_periyodikIsler', id: doc.id
      });
    }
  });

  if(gonderilecekler.length === 0){
    console.log('Gönderilecek bildirim yok.');
    return;
  }

  // Cihaz tokenları
  const cSnap = await db.collection('oy_cihazTokenleri').get();
  const tokenDocs = cSnap.docs.map(d => ({ id: d.id, token: d.data().token }));
  const tokens = tokenDocs.map(t => t.token).filter(Boolean);

  if(tokens.length === 0){
    console.log('Kayıtlı cihaz yok — yine de bildirimGonderildi işaretleniyor.');
  }

  const gecersiz = new Set();

  for(const item of gonderilecekler){
    if(tokens.length > 0){
      try{
        const res = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: { title: item.baslik, body: item.govde }
        });
        res.responses.forEach((r, i) => {
          if(!r.success){
            const kod = r.error?.code || '';
            if(kod.includes('not-registered') || kod.includes('invalid-registration')){
              gecersiz.add(tokens[i]);
            }
            console.warn('Hata:', kod);
          }
        });
        console.log(`Gönderildi: "${item.baslik}" (${res.successCount}/${tokens.length})`);
      } catch(err){
        console.error('FCM hatası:', err.message);
      }
    }
    await db.collection(item.col).doc(item.id).update({ bildirimGonderildi: true });
  }

  // Geçersiz tokenları temizle
  for(const t of gecersiz){
    const doc = tokenDocs.find(d => d.token === t);
    if(doc) await db.collection('oy_cihazTokenleri').doc(doc.id).delete();
  }

  console.log(`Toplam ${gonderilecekler.length} bildirim işlendi.`);
}

main().catch(err => { console.error(err); process.exit(1); });
