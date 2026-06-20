/* ====================================================================
   BİLDİRİM KONTROL BETİĞİ
   GitHub Actions tarafından zamanlanmış olarak (varsayılan: her 15
   dakikada bir) çalıştırılır. Firestore'daki hatırlatıcı ve görevleri
   kontrol eder, vadesi gelmiş ve henüz bildirimi gönderilmemiş olanlar
   için kayıtlı tüm cihazlara Firebase Cloud Messaging ile push
   bildirimi gönderir.

   Gerekli ortam değişkeni: FIREBASE_SERVICE_ACCOUNT
   (Firebase Console > Proje Ayarları > Hizmet Hesapları > Yeni Özel
   Anahtar Oluştur ile indirilen JSON dosyasının TAM İÇERİĞİ.
   Bu değer GitHub deposunda Settings > Secrets and variables > Actions
   bölümüne "FIREBASE_SERVICE_ACCOUNT" adıyla eklenmelidir. ASLA kod
   içine veya depoya yazılmamalıdır.)
   ==================================================================== */
const admin = require('firebase-admin');

function pad(n){ return n.toString().padStart(2, '0'); }

// Türkiye sabit UTC+3 kullanır (yaz saati uygulaması yoktur).
function turkiyeSimdi(){
  const simdi = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const tarihISO = `${simdi.getUTCFullYear()}-${pad(simdi.getUTCMonth() + 1)}-${pad(simdi.getUTCDate())}`;
  const saatHHMM = `${pad(simdi.getUTCHours())}:${pad(simdi.getUTCMinutes())}`;
  return { tarihISO, saatHHMM };
}

async function main(){
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if(!serviceAccountJson){
    console.error('FIREBASE_SERVICE_ACCOUNT ortam değişkeni bulunamadı. GitHub Secrets ayarlarını kontrol edin.');
    process.exit(1);
  }
  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const { tarihISO: bugunISO, saatHHMM: suankiSaat } = turkiyeSimdi();
  const esikSimdi = `${bugunISO} ${suankiSaat}`;
  console.log(`Kontrol zamanı (Türkiye saatiyle): ${esikSimdi}`);

  const gonderilecekler = []; // {baslik, govde, koleksiyon, docId}

  const hatirlaticiSnap = await db.collection('oy_hatirlaticilar').get();
  hatirlaticiSnap.forEach(doc=>{
    const v = doc.data();
    if(v.tamamlandi || v.bildirimGonderildi || !v.tarih) return;
    const esik = `${v.tarih} ${v.saat || '00:00'}`;
    if(esik <= esikSimdi){
      gonderilecekler.push({
        baslik: `Hatırlatıcı: ${v.baslik || ''}`,
        govde: v.aciklama || `Tarih: ${v.tarih}${v.saat ? ' ' + v.saat : ''}`,
        koleksiyon: 'oy_hatirlaticilar',
        docId: doc.id
      });
    }
  });

  const gorevSnap = await db.collection('oy_gorevler').get();
  gorevSnap.forEach(doc=>{
    const v = doc.data();
    if(v.durum === 'tamamlandi' || v.bildirimGonderildi || !v.sonTarih) return;
    if(v.sonTarih <= bugunISO){
      gonderilecekler.push({
        baslik: `Görev Vadesi: ${v.baslik || ''}`,
        govde: v.aciklama || `Son tarih: ${v.sonTarih}`,
        koleksiyon: 'oy_gorevler',
        docId: doc.id
      });
    }
  });

  const periyodikSnap = await db.collection('oy_periyodikIsler').get();
  periyodikSnap.forEach(doc=>{
    const v = doc.data();
    if(v.tamamlandi || v.bildirimGonderildi || !v.bitis) return;
    if(v.bitis <= bugunISO){
      gonderilecekler.push({
        baslik: `Periyodik İş Vadesi: ${v.isAdi || ''}`,
        govde: v.not || `Bitiş tarihi: ${v.bitis}`,
        koleksiyon: 'oy_periyodikIsler',
        docId: doc.id
      });
    }
  });

  if(gonderilecekler.length === 0){
    console.log('Gönderilecek bildirim yok.');
    return;
  }

  const cihazSnap = await db.collection('oy_cihazTokenleri').get();
  const tokenDocs = cihazSnap.docs.map(d=>({ id: d.id, token: d.data().token }));
  const tokens = tokenDocs.map(t=>t.token).filter(Boolean);

  if(tokens.length === 0){
    console.log('Kayıtlı cihaz token bulunamadı. Uygulamada Ayarlar > Bildirimleri Aç ile bir cihaz kaydedin.');
  }

  const gecersizTokenler = new Set();

  for(const item of gonderilecekler){
    if(tokens.length > 0){
      try{
        const yanit = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: { title: item.baslik, body: item.govde }
        });
        yanit.responses.forEach((r, i)=>{
          if(!r.success){
            const kod = r.error && r.error.code;
            if(kod === 'messaging/registration-token-not-registered' || kod === 'messaging/invalid-registration-token'){
              gecersizTokenler.add(tokens[i]);
            }
            console.warn('Gönderim hatası:', kod);
          }
        });
        console.log(`Gönderildi: "${item.baslik}" (${yanit.successCount}/${tokens.length} cihaza ulaştı)`);
      }catch(err){
        console.error('Gönderim sırasında hata:', err.message);
      }
    }
    // Aynı bildirimi tekrar tekrar göndermemek için işaretle.
    await db.collection(item.koleksiyon).doc(item.docId).update({ bildirimGonderildi: true });
  }

  for(const t of gecersizTokenler){
    const eslesen = tokenDocs.find(td=>td.token===t);
    if(eslesen) await db.collection('oy_cihazTokenleri').doc(eslesen.id).delete();
  }

  console.log(`Toplam ${gonderilecekler.length} bildirim işlendi.`);
}

main().catch(err=>{
  console.error('Beklenmeyen hata:', err);
  process.exit(1);
});
