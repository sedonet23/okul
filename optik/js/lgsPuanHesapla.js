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

    // ── Resmî MEB İOKBS (bursluluk sınavı) ders–katsayı eşlemesi ──
    // Kaynak: ODSGM "İOKBS Başvuru ve Uygulama Kılavuzu" Tablo-6 —
    // 5,6,7,8. sınıflar için 4 test, hepsi eşit (3) ağırlıklı.
    const BURSLULUK_KATSAYI_TABLOSU = {
        'türkçe': 3,
        'türkçe/türk dili ve edebiyatı': 3,
        'matematik': 3,
        'fen bilimleri': 3,
        'sosyal bilgiler': 3,
        'sosyal bilgiler/sosyal bilimler': 3,
    };
    const BURSLULUK_ANAHTAR_KELIME_KATSAYI = [
        { anahtarlar: ['türkçe', 'turkce'], katsayi: 3 },
        { anahtarlar: ['matematik'], katsayi: 3 },
        { anahtarlar: ['fen'], katsayi: 3 },
        { anahtarlar: ['sosyal'], katsayi: 3 },
    ];

    function normalizeDersAdi(dersAdi) {
        return (dersAdi || '').trim().toLocaleLowerCase('tr-TR');
    }

    /**
     * Ders adına ve sınav türüne göre resmî MEB katsayısını döndürür.
     * Birebir eşleşme bulunamazsa anahtar-kelime bazlı esnek eşleşmeye düşer.
     * - LGS'de hiç eşleşmeyen ders varsayılan olarak 1 (yardımcı ders) sayılır.
     * - Bursluluk (İOKBS) sınavında TÜM testler eşit ağırlıklı (3) olduğu için
     *   hiç eşleşmeyen ders de varsayılan olarak 3 sayılır.
     * @param {string} dersAdi
     * @param {'lgs'|'bursluluk'} [sinavTuru='lgs']
     * @returns {number}
     */
    function dersKatsayisi(dersAdi, sinavTuru) {
        const ad = normalizeDersAdi(dersAdi);
        if (sinavTuru === 'bursluluk') {
            if (ad in BURSLULUK_KATSAYI_TABLOSU) return BURSLULUK_KATSAYI_TABLOSU[ad];
            const eslesenB = BURSLULUK_ANAHTAR_KELIME_KATSAYI.find(k => k.anahtarlar.some(a => ad.includes(a)));
            return eslesenB ? eslesenB.katsayi : 3;
        }
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

    // ────────────────────────────────────────────────────────────────
    // BURSLULUK — STANDARDİZASYONUN TANIMSIZ KALDIĞI DURUM İÇİN
    // BAĞIMSIZ TAHMİNİ FORMÜL (resmi 7 adımlı yöntemin YERİNE GEÇMEZ)
    // ────────────────────────────────────────────────────────────────
    // Resmi yöntem, sınava giren öğrenciler arasında varyans olmasını
    // gerektirir (stdSapma>0, MaxTASP≠MinTASP). Tek öğrenci taratıldığında
    // ya da tüm öğrenciler eşit TASP aldığında bu matematiksel olarak
    // tanımsız kalır — mspHesapla() o durumda performanstan bağımsız sabit
    // 300 döner (bkz. yukarısı). Bu bölüm SADECE o durumda devreye giren,
    // hiçbir dışarıdan veri gerektirmeyen, doğrudan net/soru oranına dayalı
    // basit bir formül sağlar:
    //
    //   Puan = 100 + 400 × ( Σ(Net_ders × Katsayı_ders) / Σ(SoruSayısı_ders × Katsayı_ders) )
    //
    // (ağırlıklı net oranı 0'ın altındaysa 0'a, 1'in üzerindeyse 1'e sabitlenir)

    /**
     * @param {Array<{dersAdi:string, d:number, y:number, soruSayisi?:number}>} dersDetay
     * @param {Array<{dersAdi:string, soruSayisi:number}>} [dersler] - ders başına toplam soru sayısı;
     *   verilmezse dersDetay içindeki soruSayisi, o da yoksa 20 varsayılır.
     * @returns {{puan:number, dersNetleri:Array<{dersAdi:string, net:number, katsayi:number, soruSayisi:number}>}}
     */
    function burslulukTekOgrenciPuanHesapla(dersDetay, dersler) {
        function soruSayisiBul(dersAdi, detay) {
            if (Number.isFinite(detay?.soruSayisi)) return detay.soruSayisi;
            const eslesen = (dersler || []).find(x => normalizeDersAdi(x.dersAdi) === normalizeDersAdi(dersAdi));
            return Number.isFinite(eslesen?.soruSayisi) ? eslesen.soruSayisi : 20;
        }
        let agirlikliNetToplam = 0, agirlikliMaksToplam = 0;
        const dersNetleri = (dersDetay || []).map(detay => {
            const net = detaydanNetHesapla(detay);
            const katsayi = dersKatsayisi(detay.dersAdi, 'bursluluk');
            const soru = soruSayisiBul(detay.dersAdi, detay);
            agirlikliNetToplam += net * katsayi;
            agirlikliMaksToplam += soru * katsayi;
            return { dersAdi: detay.dersAdi, net, katsayi, soruSayisi: soru };
        });
        let oran = agirlikliMaksToplam > 0 ? (agirlikliNetToplam / agirlikliMaksToplam) : 0;
        if (oran < 0) oran = 0;
        if (oran > 1) oran = 1;
        return { puan: parseFloat((100 + 400 * oran).toFixed(1)), dersNetleri };
    }

    // ────────────────────────────────────────────────────────────────
    // SABİT KATSAYILI TAHMİNİ PUAN (yaygın kullanılan formül)
    // ────────────────────────────────────────────────────────────────
    // MEB'in resmî standardizasyon yöntemi (yukarısı) Türkiye ortalaması,
    // standart sapma ve MinTASP/MaxTASP gibi sınav SONRASI açıklanan
    // değerlere ihtiyaç duyar — deneme sınavlarında bunlar YOKTUR.
    // Bu bölüm, hiçbir dışarıdan veri gerektirmeyen, netlerin SABİT
    // katsayılarla çarpılıp toplanmasına dayanan, yaygın kullanılan
    // tahmini puan formülünü uygular:
    //
    //   Puan = TürkçeNet×4.348 + İnkılapNet×1.666 + DinKültürüNet×1.899
    //        + YabancıDilNet×1.5075 + MatematikNet×4.2538 + FenNet×4.1230
    //        + 194.752082

    const SABIT_FORMUL_KATSAYI_TABLOSU = {
        'türkçe': 4.348,
        'matematik': 4.2538,
        'fen bilimleri': 4.1230,
        't.c. inkılap tarihi ve atatürkçülük': 1.666,
        'din kültürü ve ahlak bilgisi': 1.899,
        'i̇ngilizce': 1.5075, // 'İngilizce'.toLocaleLowerCase('tr-TR')
    };
    const SABIT_FORMUL_ANAHTAR_KELIME = [
        { anahtarlar: ['türkçe', 'turkce'], katsayi: 4.348 },
        { anahtarlar: ['matematik'], katsayi: 4.2538 },
        { anahtarlar: ['fen'], katsayi: 4.1230 },
        { anahtarlar: ['inkılap', 'inkilap', 'atatürkçülük', 'ataturkculuk'], katsayi: 1.666 },
        { anahtarlar: ['din kültürü', 'din kulturu', 'ahlak'], katsayi: 1.899 },
        { anahtarlar: ['ingilizce', 'i̇ngilizce', 'yabancı dil', 'yabanci dil'], katsayi: 1.5075 },
    ];
    const SABIT_FORMUL_SABIT = 194.752082;

    /**
     * Ders adına göre sabit formülün katsayısını döndürür. Formülde YER
     * ALMAYAN bir ders ise (ör. özel/ek bir ders eklenmişse) null döner
     * — bu ders toplam puana dahil edilmez.
     * @param {string} dersAdi
     * @returns {number|null}
     */
    function sabitFormulKatsayisi(dersAdi) {
        const ad = normalizeDersAdi(dersAdi);
        if (ad in SABIT_FORMUL_KATSAYI_TABLOSU) return SABIT_FORMUL_KATSAYI_TABLOSU[ad];
        const eslesen = SABIT_FORMUL_ANAHTAR_KELIME.find(k => k.anahtarlar.some(a => ad.includes(a)));
        return eslesen ? eslesen.katsayi : null;
    }

    /**
     * Tek bir öğrencinin sabit katsayılı tahmini LGS puanını hesaplar.
     * @param {Array<{dersAdi:string, d:number, y:number}>} dersDetay - puanHesapla() çıktısındaki dersDetay
     * @returns {{puan:number, dersNetleri:Array<{dersAdi:string, net:number, katsayi:number|null, katki:number}>}}
     */
    function sabitFormulPuanHesapla(dersDetay) {
        let toplam = SABIT_FORMUL_SABIT;
        const dersNetleri = (dersDetay || []).map(detay => {
            const net = detaydanNetHesapla(detay);
            const katsayi = sabitFormulKatsayisi(detay.dersAdi);
            const katki = katsayi != null ? net * katsayi : 0;
            if (katsayi != null) toplam += katki;
            return { dersAdi: detay.dersAdi, net, katsayi, katki: parseFloat(katki.toFixed(3)) };
        });
        return { puan: parseFloat(toplam.toFixed(2)), dersNetleri };
    }

    /**
     * Bir sınavın TÜM sonuçları için sabit katsayılı tahmini puanı hesaplar,
     * puana göre büyükten küçüğe sıralı döner. Hiçbir dışarıdan veri
     * (Türkiye ortalaması vb.) gerektirmez — bu yüzden deneme sınavlarında
     * da (gerçek MEB istatistikleri açıklanmadan önce) kullanılabilir.
     * @param {Array} sonuclar - DB.sonuclariGetir(sinavId): her biri {ogrenci, puan:{dersDetay}}
     * @returns {Array<{sonucId:string, ogrenci:object, puan:number, dersNetleri:Array}>}
     */
    function sinavRaporuSabitFormulHesapla(sonuclar) {
        const gecerli = (sonuclar || []).filter(s => s?.puan?.dersDetay?.length);
        const liste = gecerli.map(sonuc => {
            const { puan, dersNetleri } = sabitFormulPuanHesapla(sonuc.puan.dersDetay);
            return { sonucId: sonuc.id, ogrenci: sonuc.ogrenci || {}, puan, dersNetleri };
        });
        liste.sort((a, b) => b.puan - a.puan);
        return liste;
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
     * @param {'lgs'|'bursluluk'} [sinavTuru='lgs'] - ders katsayı tablosunu seçer.
     *   Bursluluk (İOKBS) sınavında Türkiye ortalaması KAVRAMI yoktur — ortalama/
     *   std sapma/MinTASP/MaxTASP resmî yönteme göre ZATEN sınava giren
     *   öğrencilerin kendi verisinden hesaplanır (bkz. ODSGM İOKBS Kılavuzu), bu
     *   yüzden bursluluk için harici genelde boş {} geçilir.
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
    function sinavRaporuHesapla(sonuclar, dersler, harici, sinavTuru) {
        harici = harici || {};
        sinavTuru = sinavTuru || 'lgs';
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
                    katsayi: dersKatsayisi(dersAdi, sinavTuru),
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
                katsayi: dersKatsayisi(dersAdi, sinavTuru),
                kaynak: 'tahmini',
            };
        });
        const istatistikMap = {};
        dersIstatistik.forEach(i => { istatistikMap[i.dersAdi] = i; });

        // Öğrenci bazlı: Net -> SP -> ASP -> TASP
        const ogrenciler = gecerliSonuclar.map(sonuc => {
            const dersPuanlari = sonuc.puan.dersDetay.map(detay => {
                const ist = istatistikMap[detay.dersAdi] || { ortalama: 0, stdSapma: 0, katsayi: dersKatsayisi(detay.dersAdi, sinavTuru) };
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

        // Standardizasyon tanımsız mı? (aralık<=0 → tek öğrenci ya da tüm
        // öğrenciler eşit TASP aldı). Bu durumda SADECE bursluluk için resmi
        // mspHesapla()'nın döndüreceği sabit 300 yerine, net/soru oranına
        // dayalı bağımsız tahmini formüle düşülür — resmi formülün kendisi
        // (mspHesapla, standartPuanHesapla vb.) DEĞİŞTİRİLMEDEN, sadece n>1
        // ve gerçek varyans olduğunda kullanılmaya devam eder.
        const standardizasyonTanimsizMi = (maxTasp - minTasp) <= 0;
        ogrenciler.forEach(o => {
            if (sinavTuru === 'bursluluk' && standardizasyonTanimsizMi) {
                const sonuc = gecerliSonuclar.find(s => s.id === o.sonucId);
                const yedek = burslulukTekOgrenciPuanHesapla(sonuc.puan.dersDetay, dersler);
                o.msp = yedek.puan;
                o.mspYontemi = 'tek-ogrenci-tahmini';
            } else {
                o.msp = parseFloat(mspHesapla(o.tasp, minTasp, maxTasp).toFixed(1));
                o.mspYontemi = 'resmi';
            }
        });
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
            // true ⇒ MaxTASP=MinTASP (tek öğrenci ya da tüm öğrenciler eşit TASP aldı),
            // resmi standardizasyon tanımsız kaldı. Bursluluk'ta bu durumda ogrenciler[].msp
            // resmi formülle DEĞİL, net/soru oranına dayalı yedek formülle (bkz.
            // burslulukTekOgrenciPuanHesapla, ogrenciler[].mspYontemi==='tek-ogrenci-tahmini') hesaplanır.
            standardizeEdilemedi: standardizasyonTanimsizMi,
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
        // Üst seviye rapor (resmî MEB standardizasyon yöntemi — harici veri gerektirir)
        sinavRaporuHesapla,
        // Sabit katsayılı tahmini puan (harici veri GEREKTİRMEZ — deneme sınavları için)
        sabitFormulKatsayisi,
        sabitFormulPuanHesapla,
        sinavRaporuSabitFormulHesapla,
        // Bursluluk — standardizasyon tanımsız kaldığında (tek öğrenci vb.) kullanılan yedek formül
        burslulukTekOgrenciPuanHesapla,
    };

})(window);
