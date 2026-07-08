/* ====================================================================
   js/core/servis-yerlesim-sema.js  (FAZ 1)
   Servis Yerleşim Editörü — VERİ ŞEMASI + ŞABLONLAR + MİGRASYON
   ────────────────────────────────────────────────────────────────────
   Bu dosya SO_SABLONLAR tanımını (eskiden js/servis-oturma.js içindeydi)
   ve yeni "elements" tabanlı JSON şemasını barındırır.

   ELEMENT ŞEMASI (Firestore: servisOturma/{servisId}.elements):
   { id, type, seatNumber, studentId, row, column, x, y, rotation,
     locked, visible, color, properties }
   - type: 'koltuk' | 'arka-koltuk' | 'sofor'
   - properties: { konum, kapiSag, soforYani, studentName, stop, note, reserved }

   GERİYE DÖNÜK UYUMLULUK:
   Eski belgeler {yerlesim, koltuklar} alanlarını kullanır (bkz. eski
   servis-oturma.js v5.0 başlığı). Bu dosyadaki dönüştürücüler ile:
     - eski → yeni: _soYerlesimKoltuklariElementeCevir()
     - yeni → eski: _soElementleriYerlesimKoltuklaraCevir()
   Her kayıt işleminde HER İKİ şema da yazılır; böylece eski rapor/
   yazdırma kodu (soRaporGovdeHtml, js/raporlama.js) FAZ 3'e kadar
   değişmeden çalışmaya devam eder.

   Yeni araç tipi eklemek için: SO_SABLONLAR nesnesine yeni bir anahtar
   ekleyip _soDuzenAYerlesim / _soDuzenBYerlesim fonksiyonlarından
   birini uygun sıra sayısıyla çağırmak yeterlidir.
   ==================================================================== */

const SO_SEMA_VERSIYON = 2;

/* ================================================================
   DÜZEN ÜRETİCİLER (eski algoritmayla birebir aynı — kanıtlanmış mantık)
   ================================================================ */
function _soDuzenAYerlesim(siraMax = 7) {
  // 2+1 düzen (Ducato, Transit, Sprinter, Crafter tipi minibüsler)
  const y = [];
  y.push({ sira: 0, konum: 'sag-ic',  soforYani: false, aktif: true });
  y.push({ sira: 0, konum: 'sag-dis', soforYani: false, aktif: true });
  y.push({ sira: 1, konum: 'sol-dis', kapiSag: true, aktif: true });
  y.push({ sira: 1, konum: 'sol-ic',  kapiSag: true, aktif: true });
  for (let s = 2; s <= siraMax; s++) {
    y.push({ sira: s, konum: 'sol-dis', aktif: true });
    y.push({ sira: s, konum: 'sol-ic',  aktif: true });
    y.push({ sira: s, konum: 'sag-dis', aktif: true });
  }
  for (let k = 0; k < 4; k++) y.push({ sira: siraMax + 1, konum: 'arka', aktif: true });
  return y;
}

function _soDuzenBYerlesim(siraMax = 5) {
  // 2+2 düzen (Büyük servis, midibüs tipi)
  const y = [];
  y.push({ sira: 0, konum: 'sol-dis', soforYani: true, kapiSag: true, aktif: true });
  for (let s = 1; s <= siraMax; s++) {
    y.push({ sira: s, konum: 'sol-dis', aktif: true });
    y.push({ sira: s, konum: 'sol-ic',  aktif: true });
    y.push({ sira: s, konum: 'sag-ic',  aktif: true });
    y.push({ sira: s, konum: 'sag-dis', aktif: true });
  }
  y.push({ sira: siraMax + 1, konum: 'sol-dis', kapiSag: true, aktif: true });
  y.push({ sira: siraMax + 1, konum: 'sol-ic',  kapiSag: true, aktif: true });
  for (let k = 0; k < 4; k++) y.push({ sira: siraMax + 2, konum: 'arka', aktif: true });
  return y;
}

/* Hangi şablonlar 2+1 (A) / 2+2 (B) ailesinden — Sıra Ekle/Sil ve
   render mantığı bu ailelere göre çalışır. Yeni bir 2+1 veya 2+2
   araç eklerken ilgili diziye anahtarı eklemek yeterlidir. */
const SO_DUZEN_A_SABLONLAR = ['ducato', 'ford-transit', 'mercedes-sprinter', 'vw-crafter'];
const SO_DUZEN_B_SABLONLAR = ['buyuk', 'midibus'];
function _soDuzenTipi(sablon) { return SO_DUZEN_B_SABLONLAR.includes(sablon) ? 'B' : 'A'; }

/* ================================================================
   ŞABLON TANIMLARI — 7 hazır araç tipi + özel/manuel
   ================================================================ */
const SO_SABLONLAR = {
  ducato: {
    ad: 'Fiat Ducato', ikon: '🚐', aciklama: '2+1 düzen, orta boy',
    yerlesimUret(siraMax = 7) { return _soDuzenAYerlesim(siraMax); },
  },
  'ford-transit': {
    ad: 'Ford Transit', ikon: '🚐', aciklama: '2+1 düzen, kompakt',
    yerlesimUret(siraMax = 6) { return _soDuzenAYerlesim(siraMax); },
  },
  'mercedes-sprinter': {
    ad: 'Mercedes Sprinter', ikon: '🚐', aciklama: '2+1 düzen, uzun şasi',
    yerlesimUret(siraMax = 8) { return _soDuzenAYerlesim(siraMax); },
  },
  'vw-crafter': {
    ad: 'Volkswagen Crafter', ikon: '🚐', aciklama: '2+1 düzen',
    yerlesimUret(siraMax = 7) { return _soDuzenAYerlesim(siraMax); },
  },
  buyuk: {
    ad: 'Büyük Servis', ikon: '🚍', aciklama: '2+2 düzen + arka sıra',
    yerlesimUret(siraMax = 5) { return _soDuzenBYerlesim(siraMax); },
  },
  midibus: {
    ad: 'Midibüs', ikon: '🚌', aciklama: '2+2 düzen, orta boy',
    yerlesimUret(siraMax = 7) { return _soDuzenBYerlesim(siraMax); },
  },
  ozel: {
    ad: 'Özel Tasarım', ikon: '🛠️', aciklama: 'Manuel yerleşim (yakında tam destek)',
    yerlesimUret() { return []; },
  },
};

/* ================================================================
   DÖNÜŞTÜRÜCÜLER — eski (yerlesim/koltuklar) ⇄ yeni (elements)
   ================================================================ */

/* Eski yerleşim dizisi + koltuklar → yeni element dizisi.
   Dizi SIRASI korunur: element[idx] her zaman legacy "no" = idx+1'e karşılık gelir. */
function _soYerlesimKoltuklariElementeCevir(yerlesim, koltuklar) {
  koltuklar = koltuklar || [];
  return (yerlesim || []).map((yuva, idx) => {
    const no = idx + 1;
    const koltuk = koltuklar.find(k => k.no === no);
    const tip = yuva.soforYani ? 'sofor' : (yuva.konum === 'arka' ? 'arka-koltuk' : 'koltuk');
    return {
      id: 'el_' + no,
      type: tip,
      seatNumber: yuva.soforYani ? null : no,
      studentId: koltuk?.ogrenciId || null,
      row: yuva.sira,
      column: idx,
      x: null, y: null, rotation: 0,
      locked: !!koltuk?.kilit,
      visible: yuva.aktif !== false,
      color: koltuk?.renk || null,
      properties: {
        konum: yuva.konum || '',
        kapiSag: !!yuva.kapiSag,
        soforYani: !!yuva.soforYani,
        studentName: koltuk?.ogrenciAdi || '',
        stop: koltuk?.durak || '',
        note: koltuk?.not || '',
        reserved: !!koltuk?.rezerve,
      },
    };
  });
}

/* Yeni element dizisi → eski {yerlesim, koltuklar} (rapor/yazdırma uyumluluğu için) */
function _soElementleriYerlesimKoltuklaraCevir(elements) {
  const yerlesim = [];
  const koltuklar = [];
  (elements || []).forEach((el, idx) => {
    const no = idx + 1;
    const p = el.properties || {};
    const yuva = { sira: el.row, konum: p.konum || '', aktif: el.visible !== false };
    if (p.soforYani) yuva.soforYani = true;
    if (p.kapiSag) yuva.kapiSag = true;
    yerlesim.push(yuva);

    if (el.type !== 'sofor' && (el.studentId || p.studentName || p.reserved || p.stop || p.note || el.color || el.locked)) {
      koltuklar.push({
        no,
        ogrenciId: el.studentId || null,
        ogrenciAdi: p.studentName || '',
        rezerve: !!p.reserved,
        durak: p.stop || '',
        not: p.note || '',
        renk: el.color || null,
        kilit: !!el.locked,
      });
    }
  });
  return { yerlesim, koltuklar };
}

/* Verilen plan belgesinden (yeni veya eski şema) her zaman güncel element dizisini üretir. */
function soPlanElementleriGetir(plan, sablon) {
  const sb = sablon || plan?.sablon || 'ducato';
  if (plan?.elements?.length) return plan.elements;
  const yerlesim = plan?.yerlesim?.length ? plan.yerlesim : (SO_SABLONLAR[sb]?.yerlesimUret() || []);
  return _soYerlesimKoltuklariElementeCevir(yerlesim, plan?.koltuklar || []);
}

/* Eski formatlı (elements alanı olmayan) ama kayıtlı bir plan mı? */
function soPlanMigrasyonGerekliMi(plan) {
  return !!plan && !!(plan.yerlesim || plan.koltuklar) && !plan.elements;
}

/* Bir servisId için elements + legacy alanlarını TEK SEFERDE kaydeder. */
function _soPlanKaydetElements(servisId, sablon, elements, merge) {
  const { yerlesim, koltuklar } = _soElementleriYerlesimKoltuklaraCevir(elements);
  return ServisOturmaService.planKaydet(servisId, {
    servisId, sablon, elements, yerlesim, koltuklar,
    semaVersiyon: SO_SEMA_VERSIYON,
    guncellendi: new Date().toISOString(),
  }, merge);
}

/* Hero kart / özet istatistikleri */
function soElementIstatistik(elements) {
  const koltuklar = (elements || []).filter(e => e.type !== 'sofor' && e.visible !== false);
  const dolu    = koltuklar.filter(e => e.studentId || e.properties?.studentName).length;
  const rezerve = koltuklar.filter(e => e.properties?.reserved && !(e.studentId || e.properties?.studentName)).length;
  const toplam  = koltuklar.length;
  const bos     = Math.max(0, toplam - dolu - rezerve);
  const doluluk = toplam ? Math.round((dolu / toplam) * 100) : 0;
  return { toplam, dolu, bos, rezerve, doluluk };
}
