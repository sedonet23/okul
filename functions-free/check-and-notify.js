/* ====================================================================
   BİLDİRİM KONTROL BETİĞİ – HTTP SUNUCU MODU
   Render.com üzerinde çalışır. cron-job.org her 1 dakikada bir
   /kontrol endpoint'ini çağırır.

   Gerekli ortam değişkenleri (Render.com > Environment):
     FIREBASE_SERVICE_ACCOUNT  → Firebase service account JSON içeriği
     CRON_SECRET               → cron-job.org ile paylaşılan gizli anahtar
   ==================================================================== */

const admin   = require('firebase-admin');
const express = require('express');

const app  = express();
let dbReady = false;
let db;

// Firebase'i bir kez başlat
function firebaseBaslat() {
  if (dbReady) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) { console.error('FIREBASE_SERVICE_ACCOUNT eksik!'); process.exit(1); }
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
  db = admin.firestore();
  dbReady = true;
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
          // DÜZELTME: 'notification' alanı, uygulama ARKA PLANDAYKEN
          // Android'in KENDİ otomatik bildirim gösterimini tetikliyordu —
          // bu da OkulFirebaseMessagingService.java > onMessageReceived()'ı
          // (dolayısıyla özel okul logosu/büyük ikon kodunu) tamamen ATLIYORDU.
          // Sadece 'data' göndermek, HER durumda (ön/arka plan fark etmeksizin)
          // bildirimin bizim kendi Java kodumuzdan geçmesini garantiler.
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
  // DÜZELTME: Diğer bildirimlerin aksine mesajlar TÜM cihazlara değil, SADECE
  // ilgili konuşmanın katılımcılarına (gönderen hariç) gönderilir — bu yüzden
  // oy_cihazTokenleri artık uid alanı taşıyor (bkz. js/push.js).
  let mesajGonderilen = 0;
  const kSnap = await db.collection('oy_konusmalar').get();
  for (const kDoc of kSnap.docs) {
    const k = kDoc.data();
    if (!k.sonMesaj || !k.sonMesaj.tarih) continue;
    const sonBildirilen = k.sonBildirilenMesajTarihi || '';
    if (k.sonMesaj.tarih <= sonBildirilen) continue; // bu mesaj için zaten bildirim gönderildi

    const aliciUidler = (k.katilimciUidler || []).filter(uid => uid !== k.sonMesaj.gonderenUid);
    const aliciTokenlari = tokenDocs.filter(t => t.uid && aliciUidler.includes(t.uid)).map(t => t.token);

    if (aliciTokenlari.length > 0) {
      const baslik = k.grupMu ? `${k.grupAdi || 'Grup'} — ${k.katilimciAdlari?.[k.sonMesaj.gonderenUid] || 'Biri'}` : (k.katilimciAdlari?.[k.sonMesaj.gonderenUid] || 'Yeni mesaj');
      try {
        const yanit = await admin.messaging().sendEachForMulticast({
          tokens: aliciTokenlari,
          // DÜZELTME: bkz. yukarıdaki genel bildirim notu — aynı sebep.
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

// ── Sağlık kontrolü ──────────────────────────────────────────────────
app.get('/', (req, res) => res.send('OK'));

// ── Cron endpoint ─────────────────────────────────────────────────────
app.get('/kontrol', async (req, res) => {
  // Güvenlik: cron-job.org header kontrolü
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['x-cron-secret'] !== secret) {
    return res.status(401).send('Unauthorized');
  }

  try {
    firebaseBaslat();
    const sonuc = await kontrolEt();
    res.status(200).json({ ok: true, ...sonuc });
  } catch (err) {
    console.error('Hata:', err.message);
    res.status(500).json({ ok: false, hata: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu çalışıyor: port ${PORT}`));
