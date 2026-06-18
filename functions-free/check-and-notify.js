/* ====================================================================
   BÄ°LDÄ°RÄ°M KONTROL BETÄ°ÄÄ°
   GitHub Actions tarafÄ±ndan zamanlanmÄ±ÅŸ olarak (varsayÄ±lan: her 15
   dakikada bir) Ã§alÄ±ÅŸtÄ±rÄ±lÄ±r. Firestore'daki hatÄ±rlatÄ±cÄ± ve gÃ¶revleri
   kontrol eder, vadesi gelmiÅŸ ve henÃ¼z bildirimi gÃ¶nderilmemiÅŸ olanlar
   iÃ§in kayÄ±tlÄ± tÃ¼m cihazlara Firebase Cloud Messaging ile push
   bildirimi gÃ¶nderir.

   Gerekli ortam deÄŸiÅŸkeni: FIREBASE_SERVICE_ACCOUNT
   (Firebase Console > Proje AyarlarÄ± > Hizmet HesaplarÄ± > Yeni Ã–zel
   Anahtar OluÅŸtur ile indirilen JSON dosyasÄ±nÄ±n TAM Ä°Ã‡ERÄ°ÄÄ°.
   Bu deÄŸer GitHub deposunda Settings > Secrets and variables > Actions
   bÃ¶lÃ¼mÃ¼ne "FIREBASE_SERVICE_ACCOUNT" adÄ±yla eklenmelidir. ASLA kod
   iÃ§ine veya depoya yazÄ±lmamalÄ±dÄ±r.)
   ==================================================================== */
const admin = require('firebase-admin');

function pad(n){ return n.toString().padStart(2, '0'); }

// TÃ¼rkiye sabit UTC+3 kullanÄ±r (yaz saati uygulamasÄ± yoktur).
function turkiyeSimdi(){
  const simdi = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const tarihISO = `${simdi.getUTCFullYear()}-${pad(simdi.getUTCMonth() + 1)}-${pad(simdi.getUTCDate())}`;
  const saatHHMM = `${pad(simdi.getUTCHours())}:${pad(simdi.getUTCMinutes())}`;
  return { tarihISO, saatHHMM };
}

async function main(){
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if(!serviceAccountJson){
    console.error('FIREBASE_SERVICE_ACCOUNT ortam deÄŸiÅŸkeni bulunamadÄ±. GitHub Secrets ayarlarÄ±nÄ± kontrol edin.');
    process.exit(1);
  }
  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const { tarihISO: bugunISO, saatHHMM: suankiSaat } = turkiyeSimdi();
  const esikSimdi = `${bugunISO} ${suankiSaat}`;
  console.log(`Kontrol zamanÄ± (TÃ¼rkiye saatiyle): ${esikSimdi}`);

  const gonderilecekler = []; // {baslik, govde, koleksiyon, docId}

  const hatirlaticiSnap = await db.collection('oy_hatirlaticilar').get();
  hatirlaticiSnap.forEach(doc=>{
    const v = doc.data();
    if(v.tamamlandi || v.bildirimGonderildi || !v.tarih) return;
    const esik = `${v.tarih} ${v.saat || '00:00'}`;
    if(esik <= esikSimdi){
      gonderilecekler.push({
        baslik: `HatÄ±rlatÄ±cÄ±: ${v.baslik || ''}`,
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
        baslik: `GÃ¶rev Vadesi: ${v.baslik || ''}`,
        govde: v.aciklama || `Son tarih: ${v.sonTarih}`,
        koleksiyon: 'oy_gorevler',
        docId: doc.id
      });
    }
  });

  if(gonderilecekler.length === 0){
    console.log('GÃ¶nderilecek bildirim yok.');
    return;
  }

  const cihazSnap = await db.collection('oy_cihazTokenleri').get();
  const tokenDocs = cihazSnap.docs.map(d=>({ id: d.id, token: d.data().token }));
  const tokens = tokenDocs.map(t=>t.token).filter(Boolean);

  if(tokens.length === 0){
    console.log('KayÄ±tlÄ± cihaz token bulunamadÄ±. Uygulamada Ayarlar > Bildirimleri AÃ§ ile bir cihaz kaydedin.');
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
            console.warn('GÃ¶nderim hatasÄ±:', kod);
          }
        });
        console.log(`GÃ¶nderildi: "${item.baslik}" (${yanit.successCount}/${tokens.length} cihaza ulaÅŸtÄ±)`);
      }catch(err){
        console.error('GÃ¶nderim sÄ±rasÄ±nda hata:', err.message);
      }
    }
    // AynÄ± bildirimi tekrar tekrar gÃ¶ndermemek iÃ§in iÅŸaretle.
    await db.collection(item.koleksiyon).doc(item.docId).update({ bildirimGonderildi: true });
  }

  for(const t of gecersizTokenler){
    const eslesen = tokenDocs.find(td=>td.token===t);
    if(eslesen) await db.collection('oy_cihazTokenleri').doc(eslesen.id).delete();
  }

  console.log(`Toplam ${gonderilecekler.length} bildirim iÅŸlendi.`);
}

main().catch(err=>{
  console.error('Beklenmeyen hata:', err);
  process.exit(1);
});
