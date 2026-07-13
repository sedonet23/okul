/**
 * topluTarama.js
 * --------------
 * Çoklu optik form tarama oturumu yönetimi.
 * Her taranan formun ham OMR sonucunu, puanlama sonucunu, öğrenci
 * bilgisini VE düzeltilmiş kağıt görüntüsünü localStorage'a KALICI olarak
 * kaydeder. Sınavlar arasında geçiş yapılabilir, geçmiş sınavlar
 * listelenip tekrar açılabilir.
 *
 * Depolama modeli (localStorage anahtarı: "optikSinavlarDeposu"):
 *   {
 *     aktifSinavId: "s_...",
 *     sinavlar: [
 *       {
 *         id, sinavAdi, baslangic, sonGuncelleme,
 *         sonuclar: [
 *           { id, sira, ogrenci, cevaplar, puan, kagitGoruntusu, tarih, elleDuzenlendiMi }
 *         ]
 *       }
 *     ]
 *   }
 *
 * Dışa aktarılan API (window.TopluTarama):
 *   .baslat(sinavAdi)                          → yeni oturum başlat (kalıcı)
 *   .ekle(omrSonuc)                             → taranan formu ekle, puan hesapla, kaydet
 *   .sonuclar()                                 → aktif oturumun tüm sonuçları
 *   .ozet()                                     → {toplamOgrenci, ortPuan, ...}
 *   .sil(index)                                 → belirli bir sonucu sil
 *   .temizle()                                  → aktif oturumun sonuçlarını temizle
 *   .ogrenciAta(index, ogrenciBilgisi)           → taramayı bir öğrenciye ata
 *   .yenidenHesapla()                           → TÜM sonuçları güncel cevap anahtarıyla yeniden puanla
 *   .cevabiGuncelle(index, ders, soruNo, harf)   → elle işaretleme düzelt, o kaydı yeniden puanla
 *   .kagitGoruntusuGetir(index)                  → o kaydın saklı kağıt görüntüsünü (dataURL) döner
 *   .sinavlariListele()                          → kayıtlı TÜM sınavların özeti
 *   .sinaviYukle(id)                             → başka bir kayıtlı sınavı aktif yap
 *   .sinaviSil(id)                               → kayıtlı bir sınavı kalıcı olarak sil
 *   .aktifSinavBilgisi()                         → {id, sinavAdi} ya da null
 */

window.TopluTarama = (function () {

    const DEPO_ANAHTARI = "optikSinavlarDeposu";

    let _depo = _depoYukle();
    let _oturum = _aktifOturumBul();

    // ----------------------------------------------------------------
    // Depo (localStorage) yardımcıları
    // ----------------------------------------------------------------

    function _depoYukle() {
        try {
            const ham = localStorage.getItem(DEPO_ANAHTARI);
            if (!ham) return { aktifSinavId: null, sinavlar: [] };
            const ayrisik = JSON.parse(ham);
            if (!ayrisik || !Array.isArray(ayrisik.sinavlar)) {
                return { aktifSinavId: null, sinavlar: [] };
            }
            return ayrisik;
        } catch (e) {
            console.error("Sınav deposu okunamadı, boş depoyla başlanıyor:", e);
            return { aktifSinavId: null, sinavlar: [] };
        }
    }

    /**
     * @returns {boolean} kayıt başarılı mı. Başarısızsa (ör. localStorage
     * kotası doldu — çok sayıda büyük kağıt görüntüsü birikmiş olabilir)
     * çağıran taraf kullanıcıyı uyarabilsin diye false döner.
     */
    function _depoKaydet() {
        try {
            localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(_depo));
            return true;
        } catch (e) {
            console.error("Sınav deposu kaydedilemedi (muhtemelen depolama kotası doldu):", e);
            window.dispatchEvent(new CustomEvent("topluTaramaDepoHatasi", { detail: { hata: e } }));
            return false;
        }
    }

    function _aktifOturumBul() {
        if (!_depo.aktifSinavId) return null;
        return _depo.sinavlar.find((s) => s.id === _depo.aktifSinavId) || null;
    }

    // ----------------------------------------------------------------
    // Oturum yönetimi
    // ----------------------------------------------------------------

    function baslat(sinavAdi) {
        const yeni = {
            id: "s_" + Date.now(),
            sinavAdi: sinavAdi || "İsimsiz Sınav",
            baslangic: new Date().toISOString(),
            sonGuncelleme: new Date().toISOString(),
            sonuclar: []
        };
        _depo.sinavlar.unshift(yeni);
        _depo.aktifSinavId = yeni.id;
        _oturum = yeni;
        _depoKaydet();
        _uiGuncelle();
    }

    function temizle() {
        if (!_oturum) return;
        _oturum.sonuclar = [];
        _oturumDamgala();
        _depoKaydet();
        _uiGuncelle();
    }

    function sil(index) {
        if (!_oturum) return;
        if (index >= 0 && index < _oturum.sonuclar.length) {
            _oturum.sonuclar.splice(index, 1);
            // Kalan kayıtların "sira" numaralarını yeniden düzenle.
            _oturum.sonuclar.forEach((k, i) => { k.sira = i + 1; });
            _oturumDamgala();
            _depoKaydet();
            _uiGuncelle();
        }
    }

    // Otomatik okuma öğrenciyi tanıyamadığında (bkz. "NUMARA" baloncukları
    // net okunamadı → ogrenciKimlik boş/"?" kalır) kullanıcının o taramayı
    // elle bir öğrenciye atayabilmesi için — bkz. js/app.js _ogrenciAtaBaglantilari.
    function ogrenciAta(index, ogrenciBilgisi) {
        if (!_oturum) return;
        if (index >= 0 && index < _oturum.sonuclar.length && ogrenciBilgisi) {
            _oturum.sonuclar[index].ogrenci = ogrenciBilgisi;
            _oturumDamgala();
            _depoKaydet();
            _uiGuncelle();
        }
    }

    function sonuclar() {
        return _oturum ? _oturum.sonuclar : [];
    }

    function ozet() {
        const liste = _oturum ? _oturum.sonuclar : [];
        if (!liste.length) return { toplamOgrenci: 0, sinavAdi: _oturum ? _oturum.sinavAdi : "" };

        const puanlar = liste.map(r => r.puan.toplam).filter(p => typeof p === "number");
        const ort = puanlar.length
            ? puanlar.reduce((a, b) => a + b, 0) / puanlar.length
            : 0;

        return {
            toplamOgrenci: liste.length,
            ortPuan: puanlar.length ? Math.round(ort * 100) / 100 : null,
            enYuksek: puanlar.length ? Math.max(...puanlar) : null,
            enDusuk: puanlar.length ? Math.min(...puanlar) : null,
            sinavAdi: _oturum.sinavAdi
        };
    }

    function aktifSinavBilgisi() {
        if (!_oturum) return null;
        return { id: _oturum.id, sinavAdi: _oturum.sinavAdi };
    }

    function _oturumDamgala() {
        if (_oturum) _oturum.sonGuncelleme = new Date().toISOString();
    }

    // ----------------------------------------------------------------
    // Yeni tarama ekle
    // ----------------------------------------------------------------

    function ekle(omrSonuc) {
        if (!omrSonuc || !omrSonuc.basarili) return null;
        if (!_oturum) baslat("İsimsiz Sınav");

        const anahtar = window.CevapAnahtari ? window.CevapAnahtari.getir() : null;
        const puan = anahtar ? _puanHesapla(omrSonuc.cevaplar, anahtar) : _puansizOzet(omrSonuc.cevaplar);

        const kayit = {
            id: Date.now(),
            sira: _oturum.sonuclar.length + 1,
            ogrenci: omrSonuc.ogrenciKimlik || {},
            // cevaplar: her sorunun HAM (okunan/elle düzenlenen) işaretli şıkkı.
            // Bu, "yenidenHesapla" ve "cevabiGuncelle" için tek doğruluk kaynağıdır.
            cevaplar: (omrSonuc.cevaplar || []).map(c => ({
                ders: c.ders,
                soruNo: c.soruNo,
                isaretliSik: c.isaretliSik || null
            })),
            puan,
            // Kağıdın düzeltilmiş (dewarp edilmiş) görüntüsü — formOkuyucu.js
            // tarafından sıkıştırılmış dataURL olarak eklenir (bkz. _kucukGoruntuUret).
            // Kağıt kaydını her sonuca tıklandığında görüntüleyip elle
            // düzeltme yapabilmek için saklanır.
            kagitGoruntusu: omrSonuc.kagitGoruntusu || null,
            tarih: new Date().toLocaleTimeString("tr-TR"),
            elleDuzenlendiMi: false
        };

        _oturum.sonuclar.push(kayit);
        _oturumDamgala();
        const basarili = _depoKaydet();
        if (!basarili) {
            // Kayıt localStorage'a sığmadıysa (kota doldu) yine de bellekte
            // tut ki oturum devam edebilsin, ama kullanıcı uyarılsın.
            console.warn("Bu tarama kalıcı depoya kaydedilemedi, sadece bellekte tutuluyor.");
        }
        _uiGuncelle();

        return kayit;
    }

    // ----------------------------------------------------------------
    // Yeniden hesaplama (cevap anahtarı değiştiğinde)
    // ----------------------------------------------------------------

    /**
     * Aktif oturumdaki TÜM kayıtları, o an CevapAnahtari'nda duran (güncel)
     * anahtarla yeniden puanlar. Ham işaretlemeler (cevaplar) DEĞİŞMEZ —
     * sadece puan/doğru/yanlış/boş yeniden hesaplanır.
     * @returns {number} yeniden hesaplanan kayıt sayısı
     */
    function yenidenHesapla() {
        if (!_oturum || !_oturum.sonuclar.length) return 0;

        const anahtar = window.CevapAnahtari ? window.CevapAnahtari.getir() : null;

        _oturum.sonuclar.forEach((kayit) => {
            kayit.puan = anahtar
                ? _puanHesapla(kayit.cevaplar, anahtar)
                : _puansizOzet(kayit.cevaplar);
        });

        _oturumDamgala();
        _depoKaydet();
        _uiGuncelle();

        return _oturum.sonuclar.length;
    }

    /**
     * Bir öğrencinin TEK bir sorusunun işaretli şıkkını elle düzeltir
     * (ör. optik okuma yanlış okuduysa, ya da hiç okunamadıysa) ve SADECE
     * o öğrencinin puanını yeniden hesaplar.
     * @param {number} index - sonuclar() dizisindeki sıra
     * @param {string|null} ders - "Genel" ya da null ise dersiz form
     * @param {number} soruNo
     * @param {string|null} yeniHarf - "A"/"B"/... ya da boşa almak için null
     */
    function cevabiGuncelle(index, ders, soruNo, yeniHarf) {
        if (!_oturum) return false;
        if (index < 0 || index >= _oturum.sonuclar.length) return false;

        const kayit = _oturum.sonuclar[index];
        const dersAnahtari = ders && ders !== "null" ? ders : null;

        let cevap = kayit.cevaplar.find((c) =>
            (c.ders || null) === dersAnahtari && c.soruNo === soruNo
        );

        if (!cevap) {
            cevap = { ders: dersAnahtari, soruNo, isaretliSik: null };
            kayit.cevaplar.push(cevap);
        }

        cevap.isaretliSik = yeniHarf || null;
        kayit.elleDuzenlendiMi = true;

        const anahtar = window.CevapAnahtari ? window.CevapAnahtari.getir() : null;
        kayit.puan = anahtar
            ? _puanHesapla(kayit.cevaplar, anahtar)
            : _puansizOzet(kayit.cevaplar);

        _oturumDamgala();
        _depoKaydet();
        _uiGuncelle();

        return true;
    }

    function kagitGoruntusuGetir(index) {
        if (!_oturum || index < 0 || index >= _oturum.sonuclar.length) return null;
        return _oturum.sonuclar[index].kagitGoruntusu || null;
    }

    // ----------------------------------------------------------------
    // Geçmiş sınavlar arasında gezinme
    // ----------------------------------------------------------------

    function sinavlariListele() {
        return _depo.sinavlar.map((s) => {
            const puanlar = s.sonuclar.map(r => r.puan && r.puan.toplam).filter(p => typeof p === "number");
            const ort = puanlar.length ? Math.round((puanlar.reduce((a, b) => a + b, 0) / puanlar.length) * 100) / 100 : null;
            return {
                id: s.id,
                sinavAdi: s.sinavAdi,
                baslangic: s.baslangic,
                sonGuncelleme: s.sonGuncelleme,
                ogrenciSayisi: s.sonuclar.length,
                ortPuan: ort,
                aktifMi: s.id === _depo.aktifSinavId
            };
        });
    }

    function sinaviYukle(id) {
        const bulunan = _depo.sinavlar.find((s) => s.id === id);
        if (!bulunan) return false;
        _depo.aktifSinavId = id;
        _oturum = bulunan;
        _depoKaydet();
        _uiGuncelle();
        return true;
    }

    function sinaviSil(id) {
        const idx = _depo.sinavlar.findIndex((s) => s.id === id);
        if (idx === -1) return false;
        _depo.sinavlar.splice(idx, 1);
        if (_depo.aktifSinavId === id) {
            _depo.aktifSinavId = _depo.sinavlar.length ? _depo.sinavlar[0].id : null;
            _oturum = _aktifOturumBul();
        }
        _depoKaydet();
        _uiGuncelle();
        return true;
    }

    // ----------------------------------------------------------------
    // Puanlama
    // ----------------------------------------------------------------

    function _puanHesapla(cevaplar, anahtar) {

        // Anahtarı düz map'e çevir: "Türkçe:1" → "A"
        const anahtarMap = {};
        let toplamSoru = 0;

        for (const ders of (anahtar.dersler || [])) {
            for (const { soruNo, dogru } of (ders.anahtarlar || [])) {
                const key = ders.dersAdi !== "Genel"
                    ? `${ders.dersAdi}:${soruNo}`
                    : `${soruNo}`;
                anahtarMap[key] = dogru;
                toplamSoru++;
            }
        }

        let dogru = 0, yanlis = 0, bos = 0;
        const detay = [];

        for (const cevap of cevaplar) {
            const key = (cevap.ders && cevap.ders !== "null")
                ? `${cevap.ders}:${cevap.soruNo}`
                : `${cevap.soruNo}`;
            const dogruSik = anahtarMap[key];
            const isaretli = cevap.isaretliSik || null;

            let durum;
            if (!isaretli) {
                durum = "bos";
                bos++;
            } else if (dogruSik && isaretli === dogruSik) {
                durum = "dogru";
                dogru++;
            } else {
                durum = "yanlis";
                yanlis++;
            }

            detay.push({
                ders: cevap.ders,
                soruNo: cevap.soruNo,
                isaretli,
                dogru: dogruSik || null,
                durum
            });
        }

        const toplam = toplamSoru > 0 ? Math.round((dogru / toplamSoru) * 100 * 10) / 10 : 0;

        return { dogru, yanlis, bos, toplamSoru, toplam, detay };
    }

    function _puansizOzet(cevaplar) {
        const isaretli = cevaplar.filter(c => c.isaretliSik).length;
        const bos = cevaplar.length - isaretli;
        return {
            dogru: null, yanlis: null, bos, toplamSoru: cevaplar.length,
            toplam: null,
            detay: cevaplar.map(c => ({
                ders: c.ders, soruNo: c.soruNo,
                isaretli: c.isaretliSik || null,
                dogru: null, durum: "bilinmiyor"
            }))
        };
    }

    // ----------------------------------------------------------------
    // UI güncelleme
    // ----------------------------------------------------------------

    function _uiGuncelle() {
        const event = new CustomEvent("topluTaramaGuncellendi", {
            detail: { sonuclar: sonuclar(), ozet: ozet() }
        });
        window.dispatchEvent(event);
    }

    // Sayfa ilk açıldığında, önceden kayıtlı bir aktif oturum varsa
    // UI'ın onu yansıtabilmesi için bir kez event fırlat.
    if (_oturum) {
        setTimeout(_uiGuncelle, 0);
    }

    return {
        baslat, ekle, sil, ogrenciAta, temizle, sonuclar, ozet,
        yenidenHesapla, cevabiGuncelle, kagitGoruntusuGetir,
        sinavlariListele, sinaviYukle, sinaviSil, aktifSinavBilgisi
    };

})();
