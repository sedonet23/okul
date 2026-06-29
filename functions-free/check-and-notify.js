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
    console.log('Gönderilecek bildirim yok.');
    return { gonderilen: 0 };
  }

  // FCM Tokenları
  const cSnap = await db.collection('oy_cihazTokenleri').get();
  const tokenDocs = cSnap.docs.map(d => ({ id: d.id, token: d.data().token }));
  const tokens = tokenDocs.map(t => t.token).filter(Boolean);

  if (tokens.length === 0) {
    console.log('Kayıtlı cihaz yok — yine de işaretleniyor.');
  }

  const gecersiz = new Set();

  for (const item of gonderilecekler) {
    if (tokens.length > 0) {
      try {
        const yanit = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: { title: item.baslik, body: item.govde }
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

  // Geçersiz tokenları temizle
  for (const t of gecersiz) {
    const eslesen = tokenDocs.find(d => d.token === t);
    if (eslesen) await db.collection('oy_cihazTokenleri').doc(eslesen.id).delete();
  }

  return { gonderilen: gonderilecekler.length };
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
