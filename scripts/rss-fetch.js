/* ====================================================================
   scripts/rss-fetch.js
   GitHub Actions tarafından her gece çalıştırılır (bkz. .github/workflows/rss-fetch.yml).

   Akış:
     1) oy_haberKaynaklari koleksiyonundaki AKTİF kaynakları okur
        (Kaynak Yönetimi ekranından admin tarafından dinamik eklenir/silinir).
     2) Her kaynağın RSS/Atom beslemesini çeker ve ayrıştırır.
     3) Daha önce eklenmemiş (link ile eşleşen) haberleri oy_haberler'e yazar.
     4) Yeni haberler için, cihazların kategori tercihine göre (oy_cihazTokenleri
        .kategoriler alanı) FCM push bildirimi gönderir. Tercih yoksa/boşsa
        cihaz TÜM kategorilerden bildirim alır (opt-out mantığı).

   GitHub Secrets'a eklenmesi gereken:
   FIREBASE_SERVICE_ACCOUNT → Firebase Console > Proje Ayarları >
   Hizmet Hesapları > Yeni Özel Anahtar Oluştur (JSON içeriği)
   ==================================================================== */

const admin = require('firebase-admin');

/* ---------- basit RSS 2.0 / Atom ayrıştırıcı (ekstra bağımlılık yok) ---------- */
function xmlDecode(s){
  if(!s) return '';
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
    .trim();
}

function stripTags(s){ return xmlDecode(s).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim(); }

function etiketAl(blok, etiket){
  const re = new RegExp('<' + etiket + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + etiket + '>', 'i');
  const m = blok.match(re);
  return m ? m[1] : '';
}

function tarihiIsoYap(ham){
  if(!ham) return new Date().toISOString();
  const d = new Date(ham);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function parseFeedItems(xml){
  let bloklar = xml.match(/<item[\s\S]*?<\/item>/gi);
  if(!bloklar || !bloklar.length) bloklar = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

  const items = [];
  for(const blok of bloklar){
    const baslikHam = etiketAl(blok, 'title');
    let link = etiketAl(blok, 'link');
    if(!link || /^\s*$/.test(link)){
      const hrefMatch = blok.match(/<link[^>]*href=["']([^"']+)["']/i);
      link = hrefMatch ? hrefMatch[1] : '';
    }
    const tarihHam = etiketAl(blok, 'pubDate') || etiketAl(blok, 'updated') || etiketAl(blok, 'published') || '';
    const ozetHam = etiketAl(blok, 'description') || etiketAl(blok, 'summary') || etiketAl(blok, 'content') || '';

    const baslik = stripTags(baslikHam);
    const linkTemiz = xmlDecode(link).trim().split('?')[0]; // utm parametrelerini at, dedup daha sağlıklı olsun
    if(!baslik || !linkTemiz) continue;

    items.push({
      baslik,
      link: linkTemiz,
      tarih: tarihiIsoYap(tarihHam),
      ozet: stripTags(ozetHam).slice(0, 400)
    });
  }
  return items;
}

/* Secret'a kopyala-yapıştır sırasında fazladan karakter/satır eklenmiş
   olabilir (ör. JSON'ın sonuna kazara bir şey daha yapışmış). Önce ham
   metni doğrudan ayrıştırmayı dene; olmazsa ilk '{' ile son '}' arasını
   kırpıp tekrar dene. İkisi de olmazsa anlaşılır bir hata mesajı bas. */
function serviceAccountJsonAyristir(ham){
  if(!ham) return null;
  const metin = ham.trim();
  try{
    return JSON.parse(metin);
  }catch(ilkHata){
    const basla = metin.indexOf('{');
    const bitis = metin.lastIndexOf('}');
    if(basla !== -1 && bitis > basla){
      try{
        return JSON.parse(metin.slice(basla, bitis + 1));
      }catch(ikinciHata){
        console.error('FIREBASE_SERVICE_ACCOUNT geçerli bir JSON değil.');
        console.error('Muhtemel sebep: secret içeriğine fazladan karakter/satır karışmış (kopyala-yapıştır hatası).');
        console.error('İlk hata:', ilkHata.message);
        console.error('İkinci deneme hatası:', ikinciHata.message);
        throw ikinciHata;
      }
    }
    console.error('FIREBASE_SERVICE_ACCOUNT içinde { } bulunamadı — secret boş veya tamamen bozuk olabilir.');
    throw ilkHata;
  }
}

/* ---------- ana akış ---------- */
async function main(){
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if(!json){
    console.error('FIREBASE_SERVICE_ACCOUNT secret eksik!');
    process.exit(1);
  }

  const serviceAccount = serviceAccountJsonAyristir(json);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const kaynakSnap = await db.collection('oy_haberKaynaklari').get();
  const kaynaklar = kaynakSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(k => k.aktif !== false && k.url);

  if(kaynaklar.length === 0){
    console.log('Aktif kaynak yok (Kaynak Yönetimi ekranından ekleyin).');
    return;
  }

  // Tekrar eklememek için mevcut haberlerin linklerini çek
  const mevcutSnap = await db.collection('oy_haberler').orderBy('tarih', 'desc').limit(500).get();
  const mevcutLinkler = new Set(mevcutSnap.docs.map(d => (d.data().link || '').split('?')[0]).filter(Boolean));

  const yeniHaberler = []; // {kaynak, item}

  for(const kaynak of kaynaklar){
    try{
      const res = await fetch(kaynak.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KorukOkulRSSBot/1.0)' }
      });
      if(!res.ok){ console.warn(`Kaynak alınamadı (HTTP ${res.status}): ${kaynak.ad}`); continue; }
      const xml = await res.text();
      const items = parseFeedItems(xml).slice(0, 20); // her kaynaktan en fazla 20 madde işlenir

      let yeniSayisi = 0;
      for(const it of items){
        if(mevcutLinkler.has(it.link)) continue;
        mevcutLinkler.add(it.link); // aynı çalışma içinde tekrar eklenmesin
        yeniHaberler.push({ kaynak, item: it });
        yeniSayisi++;
      }
      console.log(`${kaynak.ad}: ${items.length} madde tarandı, ${yeniSayisi} yeni.`);
    }catch(err){
      console.error(`Kaynak hatası (${kaynak.ad}):`, err.message);
    }
  }

  if(yeniHaberler.length === 0){
    console.log('Yeni haber yok.');
    return;
  }

  // Firestore batch limiti 500 — 400'lük parçalar halinde yaz (güvenli pay)
  for(let i = 0; i < yeniHaberler.length; i += 400){
    const parca = yeniHaberler.slice(i, i + 400);
    const batch = db.batch();
    parca.forEach(({ kaynak, item }) => {
      const ref = db.collection('oy_haberler').doc();
      batch.set(ref, {
        baslik: item.baslik,
        ozet: item.ozet,
        link: item.link,
        kaynakAdi: kaynak.ad,
        kategori: kaynak.kategori || 'Genel',
        tarih: item.tarih,
        manuel: false
      });
    });
    await batch.commit();
  }
  console.log(`${yeniHaberler.length} yeni haber eklendi.`);

  await bildirimGonder(db, yeniHaberler);
}

/* ---------- kategori bazlı FCM bildirimi ---------- */
async function bildirimGonder(db, yeniHaberler){
  const cSnap = await db.collection('oy_cihazTokenleri').get();
  const cihazlar = cSnap.docs.map(d => ({ id: d.id, token: d.data().token, kategoriler: d.data().kategoriler }));
  if(cihazlar.length === 0){ console.log('Kayıtlı cihaz yok, bildirim atlanıyor.'); return; }

  // Spam'i önlemek için kategori bazında tek özet bildirim gönderilir
  const kategoriGruplari = {};
  yeniHaberler.forEach(({ kaynak, item }) => {
    const kat = kaynak.kategori || 'Genel';
    (kategoriGruplari[kat] = kategoriGruplari[kat] || []).push(item);
  });

  const gecersiz = new Set();

  for(const kat of Object.keys(kategoriGruplari)){
    const haberler = kategoriGruplari[kat];
    // Tercih boş/yoksa (opt-out) TÜM kategorilerden bildirim alır
    const hedefTokenler = cihazlar
      .filter(c => c.token && (!Array.isArray(c.kategoriler) || c.kategoriler.length === 0 || c.kategoriler.includes(kat)))
      .map(c => c.token);

    if(hedefTokenler.length === 0) continue;

    const baslik = haberler.length === 1 ? `📰 ${kat}` : `📰 ${kat} — ${haberler.length} yeni haber`;
    const govde = haberler.length === 1 ? haberler[0].baslik : haberler.slice(0, 3).map(h => h.baslik).join(' • ');

    try{
      const res = await admin.messaging().sendEachForMulticast({
        tokens: hedefTokenler,
        notification: { title: baslik, body: govde },
        data: { kategori: kat, tip: 'haber' }
      });
      res.responses.forEach((r, i) => {
        if(!r.success){
          const kod = (r.error && r.error.code) || '';
          if(kod.includes('not-registered') || kod.includes('invalid-registration')) gecersiz.add(hedefTokenler[i]);
        }
      });
      console.log(`Bildirim gönderildi (${kat}): ${res.successCount}/${hedefTokenler.length}`);
    }catch(err){
      console.error(`FCM hatası (${kat}):`, err.message);
    }
  }

  for(const t of gecersiz){
    const doc = cihazlar.find(c => c.token === t);
    if(doc) await db.collection('oy_cihazTokenleri').doc(doc.id).delete();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
