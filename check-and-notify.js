/* ====================================================================
   BİLDİRİM KONTROL BETİĞİ – TEK SEFERLİK ÇALIŞTIRMA MODU
   GitHub Actions (.github/workflows/notify.yml) her 15 dakikada bir
   bu dosyayı "node check-and-notify.js" ile çalıştırır, iş bitince
   process kapanır.

   Gerekli ortam değişkeni (GitHub > Settings > Secrets > Actions):
     FIREBASE_SERVICE_ACCOUNT  → Firebase service account JSON içeriği
   ==================================================================== */

const admin = require('firebase-admin');

let db;

function firebaseBaslat() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) { console.error('FIREBASE_SERVICE_ACCOUNT eksik!'); process.exit(1); }
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
  db = admin.firestore();
}

function pad(n) { return n.toString().padStart(2, '0'); }

function turkiyeSimdi() {
  const simdi = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const tarihISO  = `${simdi.getUTCFullYear()}-${pad(simdi.getUTCMonth()+1)}-${pad(simdi.getUTCDate())}`;
  const saatHHMM  = `${pad(simdi.getUTCHours())}:${pad(simdi.getUTCMinutes())}`;
  return { tarihISO, saatHHMM };
}

async function kontrolEt() {
  const { tarihISO: bugun, saatHHMM: saat } = turkiyeSimdi();
  const esikSimdi = `${bugun} ${saat}`;
  console.log(`Kontrol: ${esikSimdi}`);

  const gonderilecekler = [];

  // Hatırlatıcılar
  const hSnap = await db.collection('oy_hatirlaticilar').get();
  hSnap.forEach(doc => {
    const v = doc.data();
    if (v.tamamlandi || v.bildirimGonderildi || !v.tarih) return;
    const esik = `${v.tarih} ${v.saat || '00:00'}`;
    if (esik <= esikSimdi) {
      gonderilecekler.push({
        baslik: `⏰ Hatırlatıcı: ${v.baslik || ''}`,
        govde:  v.aciklama || `${v.tarih}${v.saat ? ' ' + v.saat : ''}`,
        koleksiyon: 'oy_hatirlaticilar', docId: doc.id
      });
    }
  });

  // Görevler
  const gSnap = await db.collection('oy_gorevler').get();
  gSnap.forEach(doc => {
    const v = doc.data();
    if (v.durum === 'tamamlandi' || v.bildirimGonderildi || !v.sonTarih) return;
    if (v.sonTarih <= bugun) {
      gonderilecekler.push({
        baslik: `✅ Görev Vadesi: ${v.baslik || ''}`,
        govde:  v.aciklama || `Son tarih: ${v.sonTarih}`,
        koleksiyon: 'oy_gorevler', docId: doc.id
      });
    }
  });

  // Periyodik işler
  const pSnap = await db.collection('oy_periyodikIsler').get();
  pSnap.forEach(doc => {
    const v = doc.data();
    if (v.tamamlandi || v.bildirimGonderildi || !v.bitis) return;
    if (v.bitis <= bugun) {
      gonderilecekler.push({
        baslik: `📋 Periyodik İş: ${v.isAdi || ''}`,
        govde:  v.not || `Bitiş: ${v.bitis}`,
        koleksiyon: 'oy_periyodikIsler', docId: doc.id
      });
    }
  });

  if (gonderilecekler.length === 0) {
    console.log('Genel bildirim yok.');
  }

  // FCM Tokenları (genel — hatırlatıcı/görev/periyodik için TÜM cihazlara gider)
  const cSnap = await db.collection('oy_cihazTokenleri').get();
  const tokenDocs = cSnap.docs.map(d => ({ id: d.id, token: d.data().token, uid: d.data().uid || null }));
  const tokens = tokenDocs.map(t => t.token).filter(Boolean);

  const gecersiz = new Set();

  for (const item of gonderilecekler) {
    if (tokens.length > 0) {
      try {
        const yanit = await admin.messaging().sendEachForMulticast({
          tokens,
          // 'notification' alanı yerine sadece 'data' göndermek, ön/arka plan
          // fark etmeksizin bildirimin kendi Java kodumuzdan (özel logo/ikon)
          // geçmesini garantiler.
          data: { kategori: 'genel', baslik: item.baslik, icerik: item.govde }
        });
        yanit.responses.forEach((r, i) => {
          if (!r.success) {
            const kod = r.error?.code || '';
            if (kod.includes('not-registered') || kod.includes('invalid-registration')) {
              gecersiz.add(tokens[i]);
            }
            console.warn('Hata:', kod);
          }
        });
        console.log(`Gönderildi: "${item.baslik}" (${yanit.successCount}/${tokens.length})`);
      } catch (err) {
        console.error('FCM hatası:', err.message);
      }
    }
    await db.collection(item.koleksiyon).doc(item.docId).update({ bildirimGonderildi: true });
  }

  // ---- Mesajlaşma bildirimleri (HEDEFLİ — sadece o konuşmanın katılımcılarına) ----
  let mesajGonderilen = 0;
  const kSnap = await db.collection('oy_konusmalar').get();
  for (const kDoc of kSnap.docs) {
    const k = kDoc.data();
    if (!k.sonMesaj || !k.sonMesaj.tarih) continue;
    const sonBildirilen = k.sonBildirilenMesajTarihi || '';
    if (k.sonMesaj.tarih <= sonBildirilen) continue;

    const aliciUidler = (k.katilimciUidler || []).filter(uid => uid !== k.sonMesaj.gonderenUid);
    const aliciTokenlari = tokenDocs.filter(t => t.uid && aliciUidler.includes(t.uid)).map(t => t.token);

    if (aliciTokenlari.length > 0) {
      const baslik = k.grupMu ? `${k.grupAdi || 'Grup'} — ${k.katilimciAdlari?.[k.sonMesaj.gonderenUid] || 'Biri'}` : (k.katilimciAdlari?.[k.sonMesaj.gonderenUid] || 'Yeni mesaj');
      try {
        const yanit = await admin.messaging().sendEachForMulticast({
          tokens: aliciTokenlari,
          data: { kategori: 'genel', baslik: `💬 ${baslik}`, icerik: k.sonMesaj.metin.slice(0, 120) }
        });
        yanit.responses.forEach((r, i) => {
          if (!r.success) {
            const kod = r.error?.code || '';
            if (kod.includes('not-registered') || kod.includes('invalid-registration')) gecersiz.add(aliciTokenlari[i]);
          }
        });
        mesajGonderilen++;
        console.log(`Mesaj bildirimi gönderildi: konuşma ${kDoc.id} (${yanit.successCount}/${aliciTokenlari.length})`);
      } catch (err) {
        console.error('Mesaj FCM hatası:', err.message);
      }
    }
    await db.collection('oy_konusmalar').doc(kDoc.id).update({ sonBildirilenMesajTarihi: k.sonMesaj.tarih });
  }

  // Geçersiz tokenları temizle
  for (const t of gecersiz) {
    const eslesen = tokenDocs.find(d => d.token === t);
    if (eslesen) await db.collection('oy_cihazTokenleri').doc(eslesen.id).delete();
  }

  return { gonderilen: gonderilecekler.length, mesajBildirimGonderilen: mesajGonderilen };
}

// ── Tek seferlik çalıştırma ──────────────────────────────────────────
(async () => {
  try {
    firebaseBaslat();
    const sonuc = await kontrolEt();
    console.log('Tamamlandı:', JSON.stringify(sonuc));
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err.message);
    process.exit(1);
  }
})();
