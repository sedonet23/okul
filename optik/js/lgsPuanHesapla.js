// js/lgsPuanHesapla.js
//
// MEB'in resmî LGS puan hesaplama mantığına BİREBİR uygun, PARAMETRİK hesaplama
// modülü. Klasik <script> — window.LgsPuanHesapla ile dışa açılır.
//
// ÖNEMLİ: Gerçek MEB puanı ancak sınava giren TÜM öğrencilerin verileriyle (Türkiye
// geneli ortalama/standart sapma, MinTASP/MaxTASP) hesaplanabilir; bu değerler sınav
// tamamlandıktan SONRA MEB tarafından açıklanır. Bu modül, bu değerler "harici"
// (dışarıdan) parametre olarak VERİLDİĞİNDE MEB'in resmî yöntemini birebir uygular.
// Değerler verilmezse, aynı formülle ama SINAVIN KENDİ VERİLERİNDEN tahmini olarak
// hesaplar ve sonucu her zaman "tahmini" (gerçek değil) olarak işaretler.
//
// ── ADIMLAR (resmî MEB sırası) ──
//   1) Net             = Doğru − (Yanlış ÷ 3)                         [boş sorular hariç]
//   2) Türkiye Ort.     = Σ(Netler) ÷ Öğrenci Sayısı                    [ders bazında, HARİCİ]
//   3) Std. Sapma       = √( Σ(Net − Ortalama)² ÷ Öğrenci Sayısı )      [ders bazında, HARİCİ]
//   4) Standart Puan(SP)= 10 × ((Net − Ortalama) ÷ Std.Sapma) + 50
//   5) Ağırlıklı SP(ASP)= SP × Katsayı  (Türkçe/Matematik/Fen=4, İnkılap/Din/İngilizce=1)
//   6) TASP             = Σ(Tüm derslerin ASP'leri)
//   7) MSP              = 100 + 400 × ((TASP − MinTASP) ÷ (MaxTASP − MinTASP))  [HARİCİ]

(function (global) {

    // ── Resmî MEB ders–katsayı eşlemesi (6 LGS dersi, sabit) ──
    // Anahtarlar normalize edilmiş (küçük harf, tr-TR) ders adlarıdır.
    const DERS_KATSAYI_TABLOSU = {
        'türkçe': 4,
        'matematik': 4,
        'fen bilimleri': 4,
        't.c. inkılap tarihi ve atatürkçülük': 1,
        'din kültürü ve ahlak bilgisi': 1,
        'i̇ngilizce': 1, // 'İngilizce'.toLocaleLowerCase('tr-TR')
    };
    // Esnek eşleme için anahtar kelimeler (cevap anahtarındaki ders adı birebir
    // yukarıdaki gibi yazılmamış olabilir; örn. sadece "İnkılap" veya "Yabancı Dil").
    const ANAHTAR_KELIME_KATSAYI = [
        { anahtarlar: ['türkçe', 'turkce'], katsayi: 4 },
        { anahtarlar: ['matematik'], katsayi: 4 },
        { anahtarlar: ['fen'], katsayi: 4 },
        { anahtarlar: ['inkılap', 'inkilap', 'atatürkçülük', 'ataturkculuk'], katsayi: 1 },
        { anahtarlar: ['din kültürü', 'din kulturu', 'ahlak'], katsayi: 1 },
        { anahtarlar: ['ingilizce', 'i̇ngilizce', 'yabancı dil', 'yabanci dil'], katsayi: 1 },
    ];

    function normalizeDersAdi(dersAdi) {
        return (dersAdi || '').trim().toLocaleLowerCase('tr-TR');
    }

    /**
     * Ders adına göre resmî MEB katsayısını döndürür.
     * Birebir eşleşme bulunamazsa anahtar-kelime bazlı esnek eşleşmeye düşer;
     * o da bulunamazsa varsayılan olarak 1 (yardımcı ders) döner.
     * @param {string} dersAdi
     * @returns {number}
     */
    function dersKatsayisi(dersAdi) {
        const ad = normalizeDersAdi(dersAdi);
        if (ad in DERS_KATSAYI_TABLOSU) return DERS_KATSAYI_TABLOSU[ad];
        const eslesen = ANAHTAR_KELIME_KATSAYI.find(k => k.anahtarlar.some(a => ad.includes(a)));
        return eslesen ? eslesen.katsayi : 1;
    }

    // ── 1) Net ── Boş sorular hesaba katılmaz (dogru/yanlis sayısına zaten dahil değildir).
    /**
     * @param {number} dogru
     * @param {number} yanlis
     * @returns {number}
     */
    function netHesapla(dogru, yanlis) {
        const d = dogru || 0, y = yanlis || 0;
        return parseFloat((d - y / 3).toFixed(3));
    }

    // ── 2) Ortalama ── (dışarıdan verilmezse tahmini hesap için kullanılır)
    /**
     * @param {number[]} netler
     * @returns {number}
     */
    function ortalamaHesapla(netler) {
        if (!netler.length) return 0;
        return netler.reduce((a, b) => a + b, 0) / netler.length;
    }

    // ── 3) Standart Sapma ── Standart Sapma = √(Σ(Net−Ortalama)² / Öğrenci Sayısı)
    /**
     * @param {number[]} netler
     * @param {number} ortalama
     * @returns {number}
     */
    function stdSapmaHesapla(netler, ortalama) {
        if (!netler.length) return 0;
        const kareToplam = netler.reduce((acc, net) => acc + Math.pow(net - ortalama, 2), 0);
        return Math.sqrt(kareToplam / netler.length);
    }

    // ── 4) Standart Puan ── SP = 10 × ((Net − Ortalama) / StdSapma) + 50
    /**
     * @param {number} net
     * @param {number} ortalama
     * @param {number} stdSapma
     * @returns {number}
     */
    function standartPuanHesapla(net, ortalama, stdSapma) {
        if (!stdSapma || stdSapma <= 0) return 50; // herkes aynı neti aldıysa fark yok sayılır
        return 10 * ((net - ortalama) / stdSapma) + 50;
    }

    // ── 5) Ağırlıklı Standart Puan ── ASP = SP × Katsayı
    /**
     * @param {number} standartPuan
     * @param {number} katsayi
     * @returns {number}
     */
    function agirlikliPuanHesapla(standartPuan, katsayi) {
        return standartPuan * katsayi;
    }

    // ── 6) TASP ── Tüm derslerin ASP'leri toplamı
    /**
     * @param {number[]} aspDegerleri
     * @returns {number}
     */
    function taspHesapla(aspDegerleri) {
        return aspDegerleri.reduce((a, b) => a + b, 0);
    }

    // ── 7) MSP ── MSP = 100 + 400 × ((TASP−MinTASP) / (MaxTASP−MinTASP))
    /**
     * @param {number} tasp
     * @param {number} minTasp
     * @param {number} maxTasp
     * @returns {number}
     */
    function mspHesapla(tasp, minTasp, maxTasp) {
        const aralik = maxTasp - minTasp;
        if (!aralik || aralik <= 0) return 300; // tüm öğrenciler eşit TASP aldıysa orta değer
        return 100 + 400 * ((tasp - minTasp) / aralik);
    }

    /**
     * Bir sonucun dersDetay'ından (app.js puanHesapla çıktısı: {dersAdi,d,y,b,net})
     * yalnızca d/y sayılarını kullanarak resmî LGS net'ini üretir. dersDetay.net
     * (y/4 kuralı, genel karne net'i) burada YOK SAYILIR.
     * @param {{d:number,y:number,b:number}} detay
     */
    function detaydanNetHesapla(detay) {
        return netHesapla(detay?.d || 0, detay?.y || 0);
    }

    /**
     * Bir sınavın tüm sonuçlarından LGS puan raporu üretir.
     *
     * @param {Array} sonuclar - DB.sonuclariGetir(sinavId): her biri {ogrenci, puan:{dersDetay:[{dersAdi,d,y,b}]}}
     * @param {Array} dersler  - formDersleriniGetir(sinavId): [{dersAdi, ...}]
     * @param {{
     *   dersIstatistik?: Object.<string,{ortalama:number, stdSapma:number}>,  // ders adı -> {ortalama, stdSapma} (Türkiye geneli / harici)
     *   minTasp?: number,
     *   maxTasp?: number
     * }} [harici] - MEB tarafından açıklanan gerçek istatistikler. Verilmeyen alanlar
     *   sınavın kendi verisinden TAHMİNİ olarak hesaplanır ve öyle işaretlenir.
     *
     * @returns {{
     *   gecerliSayisi: number,
     *   dersIstatistik: Array<{dersAdi:string, ortalama:number, stdSapma:number, katsayi:number, kaynak:'gercek'|'tahmini'}>,
     *   minTasp: number, maxTasp: number, taspKaynak: 'gercek'|'tahmini',
     *   ogrenciler: Array<{sonucId:string, ogrenci:object, dersPuanlari:Array, tasp:number, msp:number}>,
     *   sinavOrtalamaMsp: number,
     *   tamamiGercek: boolean  // hem ders istatistikleri hem MinTASP/MaxTASP harici verildiyse true
     * }}
     */
    function sinavRaporuHesapla(sonuclar, dersler, harici) {
        harici = harici || {};
        const hariciDersIstatistik = harici.dersIstatistik || {};

        const gecerliSonuclar = (sonuclar || []).filter(s => s?.puan?.dersDetay?.length);

        // Ders adı -> [net, net, ...] (yalnızca dışarıdan istatistik VERİLMEYEN
        // dersler için gerekli — ama yine de teşhis amacıyla hepsini topluyoruz)
        const dersNetleri = {};
        dersler.forEach(d => { dersNetleri[d.dersAdi] = []; });
        gecerliSonuclar.forEach(sonuc => {
            sonuc.puan.dersDetay.forEach(detay => {
                if (!(detay.dersAdi in dersNetleri)) dersNetleri[detay.dersAdi] = [];
                dersNetleri[detay.dersAdi].push(detaydanNetHesapla(detay));
            });
        });

        // Ders bazlı istatistik: harici verilmişse ONU kullan (gerçek), yoksa
        // sınavın kendi verisinden tahmin et.
        const dersIstatistik = Object.keys(dersNetleri).map(dersAdi => {
            const harici_ = hariciDersIstatistik[dersAdi];
            if (harici_ && Number.isFinite(harici_.ortalama) && Number.isFinite(harici_.stdSapma)) {
                return {
                    dersAdi,
                    ortalama: harici_.ortalama,
                    stdSapma: harici_.stdSapma,
                    katsayi: dersKatsayisi(dersAdi),
                    kaynak: 'gercek',
                };
            }
            const netler = dersNetleri[dersAdi];
            const ortalama = ortalamaHesapla(netler);
            const stdSapma = stdSapmaHesapla(netler, ortalama);
            return {
                dersAdi,
                ortalama: parseFloat(ortalama.toFixed(3)),
                stdSapma: parseFloat(stdSapma.toFixed(3)),
                katsayi: dersKatsayisi(dersAdi),
                kaynak: 'tahmini',
            };
        });
        const istatistikMap = {};
        dersIstatistik.forEach(i => { istatistikMap[i.dersAdi] = i; });

        // Öğrenci bazlı: Net -> SP -> ASP -> TASP
        const ogrenciler = gecerliSonuclar.map(sonuc => {
            const dersPuanlari = sonuc.puan.dersDetay.map(detay => {
                const ist = istatistikMap[detay.dersAdi] || { ortalama: 0, stdSapma: 0, katsayi: dersKatsayisi(detay.dersAdi) };
                const net = detaydanNetHesapla(detay);
                const standartPuan = standartPuanHesapla(net, ist.ortalama, ist.stdSapma);
                const agirlikliPuan = agirlikliPuanHesapla(standartPuan, ist.katsayi);
                return {
                    dersAdi: detay.dersAdi,
                    net,
                    standartPuan: parseFloat(standartPuan.toFixed(2)),
                    katsayi: ist.katsayi,
                    agirlikliPuan: parseFloat(agirlikliPuan.toFixed(2)),
                };
            });
            const tasp = parseFloat(taspHesapla(dersPuanlari.map(d => d.agirlikliPuan)).toFixed(2));
            return { sonucId: sonuc.id, ogrenci: sonuc.ogrenci || {}, dersPuanlari, tasp };
        });

        // MinTASP / MaxTASP: harici verilmişse ONU kullan (gerçek), yoksa sınavın
        // kendi TASP dağılımından tahmin et.
        const taspDegerleri = ogrenciler.map(o => o.tasp);
        let minTasp, maxTasp, taspKaynak;
        if (Number.isFinite(harici.minTasp) && Number.isFinite(harici.maxTasp)) {
            minTasp = harici.minTasp; maxTasp = harici.maxTasp; taspKaynak = 'gercek';
        } else {
            minTasp = taspDegerleri.length ? Math.min(...taspDegerleri) : 0;
            maxTasp = taspDegerleri.length ? Math.max(...taspDegerleri) : 0;
            taspKaynak = 'tahmini';
        }

        ogrenciler.forEach(o => { o.msp = parseFloat(mspHesapla(o.tasp, minTasp, maxTasp).toFixed(1)); });
        ogrenciler.sort((a, b) => b.msp - a.msp);

        const sinavOrtalamaMsp = ogrenciler.length
            ? parseFloat((ogrenciler.reduce((a, o) => a + o.msp, 0) / ogrenciler.length).toFixed(1))
            : 0;

        const tamamiGercek = taspKaynak === 'gercek' && dersIstatistik.every(d => d.kaynak === 'gercek');

        return {
            gecerliSayisi: gecerliSonuclar.length,
            dersIstatistik,
            minTasp: parseFloat((+minTasp).toFixed(2)),
            maxTasp: parseFloat((+maxTasp).toFixed(2)),
            taspKaynak,
            ogrenciler,
            sinavOrtalamaMsp,
            tamamiGercek,
        };
    }

    global.LgsPuanHesapla = {
        // Adım adım saf formüller (dışarıdan da tek tek kullanılabilir)
        netHesapla,
        ortalamaHesapla,
        stdSapmaHesapla,
        standartPuanHesapla,
        agirlikliPuanHesapla,
        taspHesapla,
        mspHesapla,
        dersKatsayisi,
        // Üst seviye rapor
        sinavRaporuHesapla,
    };

})(window);
