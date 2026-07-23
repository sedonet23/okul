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

/* YENİ: RSS öğesinden manşet görselini çıkarır. Sırayla dener:
   1) <enclosure url="..." type="image/..."> (RSS 2.0 standardı)
   2) <media:content url="..."> / <media:thumbnail url="..."> (bazı beslemeler)
   3) description/content HTML'i içine gömülü ilk <img src="..."> */
function gorselAl(blok){
  let m = blok.match(/<enclosure[^>]*\surl=["']([^"']+)["'][^>]*>/i);
  if(m && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(m[1])) return xmlDecode(m[1]);
  m = blok.match(/<media:(?:content|thumbnail)[^>]*\surl=["']([^"']+)["'][^>]*>/i);
  if(m) return xmlDecode(m[1]);
  const govde = etiketAl(blok, 'description') || etiketAl(blok, 'content') || etiketAl(blok, 'content:encoded') || '';
  m = xmlDecode(govde).match(/<img[^>]*\ssrc=["']([^"']+)["']/i);
  if(m) return m[1];
  return '';
}

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
    // YENİ: <guid> (RSS 2.0) / <id> (Atom) — bazı kaynaklarda <link> her
    // taramada değişen bir yönlendirme/oturum parametresi taşıyabiliyor,
    // ama guid/id kalıcı bir kimliktir. Varsa dedup'ta linkten önce bunu
    // kullanıyoruz (bkz. main() içindeki guidAnahtari kontrolü).
    const guidHam = etiketAl(blok, 'guid') || etiketAl(blok, 'id') || '';
    const tarihHam = etiketAl(blok, 'pubDate') || etiketAl(blok, 'updated') || etiketAl(blok, 'published') || '';
    const ozetHam = etiketAl(blok, 'description') || etiketAl(blok, 'summary') || etiketAl(blok, 'content') || '';

    const baslik = stripTags(baslikHam);
    const linkTemiz = xmlDecode(link).trim().split('?')[0]; // utm parametrelerini at, dedup daha sağlıklı olsun
    const guid = xmlDecode(guidHam).trim();
    if(!baslik || !linkTemiz) continue;

    items.push({
      baslik,
      link: linkTemiz,
      guid,
      tarih: tarihiIsoYap(tarihHam),
      ozet: stripTags(ozetHam).slice(0, 400),
      resimUrl: gorselAl(blok)
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
  const tumKaynaklar = kaynakSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  // DÜZELTME: Aktif ama URL'si boş/eksik olan kaynaklar önceden SESSİZCE
  // filtreleniyordu (hiç log satırı yazmadan) — bu yüzden "bir kaynak hiç
  // taranmıyor" durumu fark edilmesi çok zor bir hataya dönüşüyordu.
  // Artık böyle bir kaynak varsa açıkça uyarı basılıyor.
  tumKaynaklar.forEach(k => {
    if(k.aktif !== false && !k.url){
      console.warn(`⚠️ "${k.ad || k.id}" AKTİF ama URL alanı BOŞ — bu kaynak taranamıyor. Kaynak Yönetimi'nden düzenleyip URL girin.`);
    }
  });
  const kaynaklar = tumKaynaklar.filter(k => k.aktif !== false && k.url);

  // YENİ (teşhis): Ders Listesi'nde yaşadığımız "aynı kayıt yanlışlıkla iki
  // kez eklenmiş" sorununun bir benzeri Kaynak Yönetimi'nde de olabilir mi
  // diye kontrol — aynı ad veya aynı URL'e sahip birden fazla aktif kaynak
  // varsa açıkça uyar (ikisi de aynı haberleri ayrı ayrı işleyip birbirini
  // "yeni" sanmasına yol açabilir).
  const adSayaci = {}, urlSayaci = {};
  kaynaklar.forEach(k => {
    adSayaci[k.ad] = (adSayaci[k.ad] || 0) + 1;
    urlSayaci[k.url] = (urlSayaci[k.url] || 0) + 1;
  });
  Object.entries(adSayaci).forEach(([ad, sayi]) => {
    if(sayi > 1) console.warn(`⚠️ "${ad}" adında AKTİF ${sayi} ayrı kaynak kaydı var — Kaynak Yönetimi'nden kontrol edin.`);
  });
  Object.entries(urlSayaci).forEach(([url, sayi]) => {
    if(sayi > 1) console.warn(`⚠️ Aynı URL'e (${url}) sahip AKTİF ${sayi} ayrı kaynak kaydı var — Kaynak Yönetimi'nden kontrol edin.`);
  });

  if(kaynaklar.length === 0){
    console.log('Aktif kaynak yok (Kaynak Yönetimi ekranından ekleyin).');
    return;
  }

  // DÜZELTME (kök sebep): Dedup kontrolü eskiden TÜM kaynaklar birleşik
  // "en yeni 600 haber" penceresine bakıyordu. Sık/güncel tarihli yayın
  // yapan bir kaynak bu pencereyi doldurunca, nadiren güncellenen bir
  // kaynağın (ör. yaz tatilinde haber üretmeyen bir okul/il MEB sitesi)
  // haftalar önce eklenmiş haberleri pencereden düşüyor, kod bunları
  // "daha önce görmedim" sanıp TEKRAR ekliyor ve TEKRAR bildirim
  // gönderiyordu (aynı ~15 haber saatte bir "yeni" görünüyordu). Artık her
  // kaynağın "daha önce eklendi mi" kontrolü SADECE KENDİ geçmişine bakıyor.
  const baslikAnahtariUret = (kaynakAdi, baslik) =>
    `${kaynakAdi || ''}|${(baslik || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim()}`;

  const yeniHaberler = []; // {kaynak, item}

  for(const kaynak of kaynaklar){
    try{
      // YENİ (teşhis): "Elazığ Meb Duyurular" gibi bazı kaynaklarda dedup
      // hâlâ başarısız oluyor — kaynak adı ile ilgili görünmeyen bir
      // uyuşmazlık (fazladan boşluk/karakter, aynı isimde iki ayrı kaynak
      // kaydı, ya da benzeri) olup olmadığını görmek için ayrıntılı log.
      console.log(`--- [TEŞHİS] Kaynak: id=${kaynak.id} ad=${JSON.stringify(kaynak.ad)} url=${kaynak.url}`);

      // DÜZELTME (kök sebep #2): Bu sorgu daha önce .limit(200) ile
      // sınırlıydı. Elazığ Meb Duyurular gibi devlet siteleri RSS'inde
      // Mayıs/Haziran gibi ESKİ duyurular da "son 20 madde" içinde sabit
      // kalabiliyor. Kaynağın toplam kayıt sayısı 200'ü geçtiğinde, bu eski
      // (ama beslemede hâlâ görünen) maddeler dedup penceresinin dışına
      // düşüyor ve script onları "hiç görmedim" sanıp SONSUZ DÖNGÜ halinde
      // tekrar tekrar ekleyip bildirim gönderiyordu. Artık limit yok —
      // kaynağın TÜM geçmişine bakılıyor, böylece hiçbir kayıt pencereden
      // "düşerek" yanlışlıkla yeni sayılamıyor.
      const mevcutKaynakSnap = await db.collection('oy_haberler')
        .where('kaynakAdi', '==', kaynak.ad)
        .orderBy('tarih', 'desc')
        .get();
      console.log(`[TEŞHİS] "${kaynak.ad}" için Firestore'da bulunan mevcut kayıt sayısı: ${mevcutKaynakSnap.size}`);
      if(mevcutKaynakSnap.size > 0){
        const ornek = mevcutKaynakSnap.docs[0].data();
        console.log(`[TEŞHİS] Örnek mevcut kayıt: kaynakAdi=${JSON.stringify(ornek.kaynakAdi)} link=${ornek.link} tarih=${ornek.tarih}`);
      }

      const mevcutLinkler = new Set(mevcutKaynakSnap.docs.map(d => (d.data().link || '').split('?')[0]).filter(Boolean));
      // guid varsa en güvenilir dedup anahtarıdır (linkten bağımsız, kalıcı kimlik).
      const mevcutGuidler = new Set(mevcutKaynakSnap.docs.map(d => d.data().guid || '').filter(Boolean));
      // Bazı kaynaklar aynı haberi her taramada FARKLI bir link ile verebiliyor
      // (yönlendirme/oturum parametresi); başlık eşleşmesi ek güvenlik katmanı.
      const mevcutBaslikAnahtarlari = new Set(
        mevcutKaynakSnap.docs.map(d => baslikAnahtariUret(d.data().kaynakAdi, d.data().baslik))
      );

      const res = await fetch(kaynak.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KorukOkulRSSBot/1.0)' }
      });
      if(!res.ok){ console.warn(`Kaynak alınamadı (HTTP ${res.status}): ${kaynak.ad}`); continue; }
      const xml = await res.text();
      const items = parseFeedItems(xml).slice(0, 20); // her kaynaktan en fazla 20 madde işlenir

      let yeniSayisi = 0;
      for(const it of items){
        const baslikAnahtari = baslikAnahtariUret(kaynak.ad, it.baslik);
        const guidEslesti = it.guid && mevcutGuidler.has(it.guid);
        const linkEslesti = mevcutLinkler.has(it.link);
        const baslikEslesti = mevcutBaslikAnahtarlari.has(baslikAnahtari);
        if(guidEslesti || linkEslesti || baslikEslesti) continue;
        // YENİ (teşhis): "yeni" sayılan her madde için linki logla — bir
        // sonraki run'da bu link mevcutLinkler'de neden yokmuş görebilelim.
        console.log(`[TEŞHİS] YENİ sayıldı -> link=${it.link} guid=${it.guid || '(yok)'} baslik=${JSON.stringify(it.baslik)}`);
        if(it.guid) mevcutGuidler.add(it.guid);
        mevcutLinkler.add(it.link); // aynı çalışma içinde tekrar eklenmesin
        mevcutBaslikAnahtarlari.add(baslikAnahtari);
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
        guid: item.guid || '',
        kaynakAdi: kaynak.ad,
        kategori: kaynak.kategori || 'Genel',
        tarih: item.tarih,
        resimUrl: item.resimUrl || '',
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
        // DÜZELTME: 'notification' alanı kaldırıldı (bkz. check-and-notify.js
        // ile aynı sebep — arka planda Android'in kendi otomatik gösterimini
        // tetikleyip özel okul logosunu atlıyordu). Ayrıca 'baslik'/'icerik'
        // alanları hiç gönderilmiyordu — OkulFirebaseMessagingService.java
        // bunları okuyor, eksik olunca bildirim boş/varsayılan çıkıyordu.
        data: { kategori: 'haberler', baslik, icerik: govde }
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
