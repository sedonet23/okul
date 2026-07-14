/**
 * topluTarama.js
 * Çoklu optik form tarama oturumu yönetimi.
 * Sınavlar localStorage'da kalıcı olarak saklanır.
 *
 * window.TopluTarama API:
 *   .baslat(sinavAdi)             → yeni oturum başlat, localStorage'a kaydet
 *   .ekle(omrSonuc)               → taranan formu ekle, puan hesapla
 *   .sil(index)                   → sonucu sil
 *   .temizle()                    → aktif oturumu sıfırla
 *   .sonuclar()                   → aktif oturum sonuçları
 *   .ozet()                       → {toplamOgrenci, ortPuan, ...}
 *   .aktifSinavBilgisi()          → aktif sınav {id, sinavAdi, ...} veya null
 *   .sinavlariListele()           → localStorage'daki tüm sınavlar
 *   .sinaviYukle(id)              → kayıtlı sınavı aktif oturum olarak aç
 *   .sinaviSil(id)                → localStorage'dan sil
 *   .yenidenHesapla()             → aktif anahtar ile tüm puanları yeniden hesapla
 *   .ogrenciAta(idx, ogrenci)     → belirli sonuca öğrenci bilgisi ata
 *   .cevabiGuncelle(idx,ders,soruNo,harf) → tek cevabı güncelle, puan yenile
 */

window.TopluTarama = (function () {

    const DEPO_ANAHTARI = 'topluTarama_sinavlar';

    let _oturum = {
        id: null,
        sinavAdi: '',
        baslangic: null,
        sonGuncelleme: null,
        sonuclar: []
    };

    // ----------------------------------------------------------------
    // localStorage yardımcıları
    // ----------------------------------------------------------------

    function _depoyuOku() {
        try {
            return JSON.parse(localStorage.getItem(DEPO_ANAHTARI) || '{}');
        } catch (e) { return {}; }
    }

    function _depoyaYaz(depo) {
        try {
            localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(depo));
        } catch (e) {
            console.warn('topluTarama: localStorage yazma hatası', e);
        }
    }

    function _oturumKaydet() {
        if (!_oturum.id) return;
        const depo = _depoyuOku();
        _oturum.sonGuncelleme = new Date().toISOString();
        depo[_oturum.id] = _oturum;
        _depoyaYaz(depo);
    }

    // ----------------------------------------------------------------
    // Oturum yönetimi
    // ----------------------------------------------------------------

    function baslat(sinavAdi) {
        _oturum = {
            id: 'sinav_' + Date.now(),
            sinavAdi: sinavAdi || 'İsimsiz Sınav',
            baslangic: new Date().toISOString(),
            sonGuncelleme: new Date().toISOString(),
            sonuclar: []
        };
        _oturumKaydet();
        _uiGuncelle();
    }

    function temizle() {
        _oturum.sonuclar = [];
        _oturumKaydet();
        _uiGuncelle();
    }

    function sil(index) {
        if (index >= 0 && index < _oturum.sonuclar.length) {
            _oturum.sonuclar.splice(index, 1);
            // Sıra numaralarını düzelt
            _oturum.sonuclar.forEach(function(r, i) { r.sira = i + 1; });
            _oturumKaydet();
            _uiGuncelle();
        }
    }

    function sonuclar() {
        return _oturum.sonuclar;
    }

    function aktifSinavBilgisi() {
        if (!_oturum.id) return null;
        return {
            id: _oturum.id,
            sinavAdi: _oturum.sinavAdi,
            baslangic: _oturum.baslangic,
            ogrenciSayisi: _oturum.sonuclar.length
        };
    }

    function sinavlariListele() {
        const depo = _depoyuOku();
        return Object.values(depo)
            .sort(function(a, b) { return (b.sonGuncelleme || '').localeCompare(a.sonGuncelleme || ''); })
            .map(function(s) {
                const puanlar = (s.sonuclar || [])
                    .map(function(r) { return r.puan && r.puan.toplam; })
                    .filter(function(p) { return typeof p === 'number'; });
                const ortPuan = puanlar.length
                    ? Math.round(puanlar.reduce(function(a, b) { return a + b; }, 0) / puanlar.length * 10) / 10
                    : null;
                return {
                    id: s.id,
                    sinavAdi: s.sinavAdi,
                    baslangic: s.baslangic,
                    sonGuncelleme: s.sonGuncelleme,
                    ogrenciSayisi: (s.sonuclar || []).length,
                    ortPuan: ortPuan,
                    aktifMi: s.id === _oturum.id
                };
            });
    }

    function sinaviYukle(id) {
        const depo = _depoyuOku();
        if (!depo[id]) return;
        _oturum = depo[id];
        _uiGuncelle();
    }

    function sinaviSil(id) {
        const depo = _depoyuOku();
        delete depo[id];
        _depoyaYaz(depo);
        if (_oturum.id === id) {
            _oturum = { id: null, sinavAdi: '', baslangic: null, sonGuncelleme: null, sonuclar: [] };
        }
        _uiGuncelle();
    }

    // ----------------------------------------------------------------
    // Tarama ekle
    // ----------------------------------------------------------------

    function ekle(omrSonuc) {
        if (!omrSonuc || !omrSonuc.basarili) return null;

        const anahtar = window.CevapAnahtari ? window.CevapAnahtari.getir() : null;
        const puan = anahtar ? _puanHesapla(omrSonuc.cevaplar, anahtar) : _puansizOzet(omrSonuc.cevaplar);

        const omrKimlik = omrSonuc.ogrenciKimlik || {};
        let ogrenciBilgisi = { ...omrKimlik };

        const omrNo = omrKimlik.ogrenciNo;
        // "??19", "0019" gibi formatları temizle: soru işareti ve sıfırları at
        const omrNoTemiz = omrNo ? omrNo.replace(/[^0-9]/g, '') : '';
        if (omrNoTemiz && parseInt(omrNoTemiz, 10) > 0) {
            const temizNo = String(parseInt(omrNoTemiz, 10));
            ogrenciBilgisi = { ...omrKimlik, ogrenciNo: temizNo };
            try {
                const bulunan = _ogrenciNoIleGetir(temizNo);
                if (bulunan) {
                    ogrenciBilgisi = {
                        ...omrKimlik,
                        ogrenciNo: temizNo,
                        adSoyad: bulunan.adSoyad || bulunan.ad || '',
                        sinif: bulunan.sinif || '',
                        firestoreId: bulunan._id || null
                    };
                }
            } catch (e) {
                console.warn('Öğrenci arama hatası:', e);
            }
        }

        const kayit = {
            id: Date.now(),
            sira: _oturum.sonuclar.length + 1,
            ogrenci: ogrenciBilgisi,
            cevaplar: omrSonuc.cevaplar,
            puan: puan,
            tarih: new Date().toLocaleTimeString('tr-TR')
        };

        _oturum.sonuclar.push(kayit);
        _oturumKaydet();
        _uiGuncelle();
        return kayit;
    }

    // ----------------------------------------------------------------
    // Düzenleme fonksiyonları
    // ----------------------------------------------------------------

    function ogrenciAta(idx, ogrenci) {
        if (idx < 0 || idx >= _oturum.sonuclar.length) return;
        _oturum.sonuclar[idx].ogrenci = { ..._oturum.sonuclar[idx].ogrenci, ...ogrenci };
        _oturumKaydet();
        _uiGuncelle();
    }

    function cevabiGuncelle(idx, ders, soruNo, harf) {
        if (idx < 0 || idx >= _oturum.sonuclar.length) return;
        const kayit = _oturum.sonuclar[idx];
        const cevap = kayit.cevaplar.find(function(c) {
            return c.ders === ders && c.soruNo === soruNo;
        });
        if (!cevap) return;
        cevap.isaretliSik = harf;
        const anahtar = window.CevapAnahtari ? window.CevapAnahtari.getir() : null;
        kayit.puan = anahtar ? _puanHesapla(kayit.cevaplar, anahtar) : _puansizOzet(kayit.cevaplar);
        _oturumKaydet();
        _uiGuncelle();
    }

    function yenidenHesapla() {
        const anahtar = window.CevapAnahtari ? window.CevapAnahtari.getir() : null;
        _oturum.sonuclar.forEach(function(kayit) {
            kayit.puan = anahtar
                ? _puanHesapla(kayit.cevaplar, anahtar)
                : _puansizOzet(kayit.cevaplar);
        });
        _oturumKaydet();
        _uiGuncelle();
    }

    // ----------------------------------------------------------------
    // Öğrenci arama (OptikVeriKaynagi köprüsü)
    // ----------------------------------------------------------------

    function _ogrenciNoIleGetir(ogrenciNo) {
        try {
            const kaynak = window.parent && window.parent.OptikVeriKaynagi;
            if (kaynak && typeof kaynak.ogrencilerGetir === 'function') {
                const siniflar = kaynak.siniflarGetir ? kaynak.siniflarGetir() : [];
                for (const sinif of siniflar) {
                    const liste = kaynak.ogrencilerGetir(sinif.id);
                    const bulunan = liste.find(function(o) {
                        return String(o.ogrenciNo) === String(ogrenciNo);
                    });
                    if (bulunan) {
                        return { adSoyad: bulunan.adSoyad, sinif: sinif.ad, ogrenciNo: bulunan.ogrenciNo };
                    }
                }
            }
        } catch (e) {
            console.warn('OptikVeriKaynagi erişim hatası:', e);
        }
        return null;
    }

    // ----------------------------------------------------------------
    // Puanlama
    // ----------------------------------------------------------------

    function ozet() {
        const liste = _oturum.sonuclar;
        if (!liste.length) return { toplamOgrenci: 0 };
        const puanlar = liste.map(function(r) { return r.puan.toplam; }).filter(function(p) { return typeof p === 'number'; });
        const ort = puanlar.length ? puanlar.reduce(function(a, b) { return a + b; }, 0) / puanlar.length : 0;
        return {
            toplamOgrenci: liste.length,
            ortPuan: Math.round(ort * 100) / 100,
            enYuksek: puanlar.length ? Math.max.apply(null, puanlar) : null,
            enDusuk: puanlar.length ? Math.min.apply(null, puanlar) : null,
            sinavAdi: _oturum.sinavAdi
        };
    }

    function _puanHesapla(cevaplar, anahtar) {
        const anahtarMap = {};
        let toplamSoru = 0;
        for (const ders of (anahtar.dersler || [])) {
            for (const { soruNo, dogru } of (ders.anahtarlar || [])) {
                const key = ders.dersAdi !== 'Genel' ? `${ders.dersAdi}:${soruNo}` : `${soruNo}`;
                anahtarMap[key] = dogru;
                toplamSoru++;
            }
        }
        let dogru = 0, yanlis = 0, bos = 0;
        const detay = [];
        for (const cevap of cevaplar) {
            const key = (cevap.ders && cevap.ders !== 'null') ? `${cevap.ders}:${cevap.soruNo}` : `${cevap.soruNo}`;
            const dogruSik = anahtarMap[key];
            const isaretli = cevap.isaretliSik || null;
            let durum;
            if (!isaretli) { durum = 'bos'; bos++; }
            else if (dogruSik && isaretli === dogruSik) { durum = 'dogru'; dogru++; }
            else { durum = 'yanlis'; yanlis++; }
            detay.push({ ders: cevap.ders, soruNo: cevap.soruNo, isaretli, dogru: dogruSik || null, durum });
        }
        const toplam = toplamSoru > 0 ? Math.round((dogru / toplamSoru) * 100 * 10) / 10 : 0;
        return { dogru, yanlis, bos, toplamSoru, toplam, detay };
    }

    function _puansizOzet(cevaplar) {
        const bos = cevaplar.filter(function(c) { return !c.isaretliSik; }).length;
        return {
            dogru: null, yanlis: null, bos, toplamSoru: cevaplar.length, toplam: null,
            detay: cevaplar.map(function(c) {
                return { ders: c.ders, soruNo: c.soruNo, isaretli: c.isaretliSik || null, dogru: null, durum: 'bilinmiyor' };
            })
        };
    }

    // ----------------------------------------------------------------
    // UI güncelleme
    // ----------------------------------------------------------------

    function _uiGuncelle() {
        window.dispatchEvent(new CustomEvent('topluTaramaGuncellendi', {
            detail: { sonuclar: _oturum.sonuclar, ozet: ozet() }
        }));
    }

    return {
        baslat, ekle, sil, temizle,
        sonuclar, ozet,
        aktifSinavBilgisi,
        sinavlariListele, sinaviYukle, sinaviSil,
        yenidenHesapla, ogrenciAta, cevabiGuncelle
    };

})();
