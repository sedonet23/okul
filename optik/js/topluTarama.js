/**
 * topluTarama.js
 * --------------
 * Çoklu optik form tarama oturumu yönetimi.
 * Her taranan formun ham OMR sonucunu, puanlama sonucunu ve
 * öğrenci bilgisini bellekte biriktirir.
 *
 * Dışa aktarılan API (window.TopluTarama):
 *   .baslat(sinavAdi)         → oturumu sıfırla
 *   .ekle(omrSonuc)           → taranan formu listeye ekle, puan hesapla
 *   .sonuclar()               → tüm sonuçları döner
 *   .ozet()                   → {toplamOgrenci, ortPuan, ...}
 *   .sil(index)               → belirli bir sonucu sil
 *   .temizle()                → tüm oturumu temizle
 */

window.TopluTarama = (function () {

    let _oturum = {
        sinavAdi: "",
        baslangic: null,
        sonuclar: []
    };

    // ----------------------------------------------------------------
    // Oturum yönetimi
    // ----------------------------------------------------------------

    function baslat(sinavAdi) {
        _oturum = {
            sinavAdi: sinavAdi || "İsimsiz Sınav",
            baslangic: new Date().toISOString(),
            sonuclar: []
        };
        _uiGuncelle();
    }

    function temizle() {
        _oturum.sonuclar = [];
        _uiGuncelle();
    }

    function sil(index) {
        if (index >= 0 && index < _oturum.sonuclar.length) {
            _oturum.sonuclar.splice(index, 1);
            _uiGuncelle();
        }
    }

    function sonuclar() {
        return _oturum.sonuclar;
    }

    function ozet() {
        const liste = _oturum.sonuclar;
        if (!liste.length) return { toplamOgrenci: 0 };

        const puanlar = liste.map(r => r.puan.toplam).filter(p => typeof p === "number");
        const ort = puanlar.length
            ? puanlar.reduce((a, b) => a + b, 0) / puanlar.length
            : 0;

        return {
            toplamOgrenci: liste.length,
            ortPuan: Math.round(ort * 100) / 100,
            enYuksek: Math.max(...puanlar),
            enDusuk: Math.min(...puanlar),
            sinavAdi: _oturum.sinavAdi
        };
    }

    // ----------------------------------------------------------------
    // Yeni tarama ekle
    // ----------------------------------------------------------------

    function ekle(omrSonuc) {
        if (!omrSonuc || !omrSonuc.basarili) return null;

        const anahtar = window.CevapAnahtari ? window.CevapAnahtari.getir() : null;
        const puan = anahtar ? _puanHesapla(omrSonuc.cevaplar, anahtar) : _puansizOzet(omrSonuc.cevaplar);

        const kayit = {
            id: Date.now(),
            sira: _oturum.sonuclar.length + 1,
            ogrenci: omrSonuc.ogrenciKimlik || {},
            cevaplar: omrSonuc.cevaplar,
            puan,
            tarih: new Date().toLocaleTimeString("tr-TR")
        };

        _oturum.sonuclar.push(kayit);
        _uiGuncelle();

        return kayit;
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
            detail: { sonuclar: _oturum.sonuclar, ozet: ozet() }
        });
        window.dispatchEvent(event);
    }

    return { baslat, ekle, sil, temizle, sonuclar, ozet };

})();
