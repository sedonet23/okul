/**
 * cevapAnahtari.js
 * ----------------
 * Cevap anahtarı yönetimi: manuel giriş, Excel içe aktarma.
 *
 * Dışa aktarılan API:
 *   CevapAnahtari.getir()         → { dersler: [{dersAdi, anahtarlar:[{soruNo,dogru}]}], sikSayisi }
 *   CevapAnahtari.kaydet(nesne)   → void
 *   CevapAnahtari.temizle()       → void
 *   CevapAnahtari.exceldenYukle(file) → Promise<void>
 *   CevapAnahtari.mevcutMu()      → boolean
 *
 * localStorage'da "optik_cevap_anahtari" anahtarıyla saklanır.
 */

window.CevapAnahtari = (function () {

    const DEPO_ANAHTARI = "optik_cevap_anahtari";

    // ----------------------------------------------------------------
    // Temel CRUD
    // ----------------------------------------------------------------

    function getir() {
        try {
            const json = localStorage.getItem(DEPO_ANAHTARI);
            return json ? JSON.parse(json) : null;
        } catch (e) {
            console.warn("Cevap anahtarı okunamadı:", e);
            return null;
        }
    }

    function kaydet(nesne) {
        try {
            localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(nesne));
        } catch (e) {
            console.error("Cevap anahtarı kaydedilemedi:", e);
            throw e;
        }
    }

    function temizle() {
        localStorage.removeItem(DEPO_ANAHTARI);
    }

    function mevcutMu() {
        return localStorage.getItem(DEPO_ANAHTARI) !== null;
    }

    // ----------------------------------------------------------------
    // Excel içe aktarma (SheetJS / XLSX — CDN'den yüklenir)
    // ----------------------------------------------------------------

    /**
     * Beklenen Excel formatı (iki şekil desteklenir):
     *
     * Format 1 — Tek sayfa, sütunlar: Soru | Cevap
     *   Soru  | Cevap
     *   1     | A
     *   2     | B
     *   ...
     *
     * Format 2 — Tek sayfa, sütunlar: Ders | Soru | Cevap
     *   Ders          | Soru | Cevap
     *   Türkçe        | 1    | A
     *   Türkçe        | 2    | C
     *   Matematik     | 1    | B
     *   ...
     *
     * İlk satır her zaman başlık satırıdır.
     */
    async function exceldenYukle(file) {

        if (!window.XLSX) {
            await _xlsxYukle();
        }

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onload = function (e) {
                try {

                    const data = new Uint8Array(e.target.result);
                    const wb = XLSX.read(data, { type: "array" });

                    // İlk sayfayı al
                    const wsAdi = wb.SheetNames[0];
                    const ws = wb.Sheets[wsAdi];
                    const satirlar = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

                    if (satirlar.length < 2) {
                        throw new Error("Excel dosyası boş veya yalnızca başlık içeriyor.");
                    }

                    const baslik = satirlar[0].map(h => String(h).trim().toLowerCase());
                    const anahtarNesnesi = _satirlariIsle(baslik, satirlar.slice(1));

                    kaydet(anahtarNesnesi);
                    resolve(anahtarNesnesi);

                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(new Error("Dosya okunamadı."));
            reader.readAsArrayBuffer(file);

        });
    }

    function _satirlariIsle(baslik, veriSatirlari) {

        // Sütun indekslerini bul (esnek eşleştirme)
        const colDers = _sutunBul(baslik, ["ders", "bölüm", "bolum", "subject"]);
        const colSoru = _sutunBul(baslik, ["soru", "no", "soru no", "question", "num"]);
        const colCevap = _sutunBul(baslik, ["cevap", "doğru", "dogru", "answer", "key"]);

        if (colSoru === -1 || colCevap === -1) {
            throw new Error(
                'Excel başlıklarında "Soru" ve "Cevap" sütunları bulunamadı.\n' +
                'Mevcut başlıklar: ' + baslik.join(', ')
            );
        }

        const dersBazliMap = {}; // dersAdi → [{soruNo, dogru}]

        for (const satir of veriSatirlari) {

            const soruNo = parseInt(String(satir[colSoru]).trim(), 10);
            const dogru = String(satir[colCevap]).trim().toUpperCase();

            if (!soruNo || !dogru) continue;

            let dersAdi = colDers >= 0 ? String(satir[colDers]).trim() : "Genel";
            if (!dersAdi) dersAdi = "Genel";

            if (!dersBazliMap[dersAdi]) dersBazliMap[dersAdi] = [];
            dersBazliMap[dersAdi].push({ soruNo, dogru });
        }

        if (Object.keys(dersBazliMap).length === 0) {
            throw new Error("Excel dosyasında geçerli cevap satırı bulunamadı.");
        }

        // Şık sayısını bul (en büyük şık harfinden)
        let maxSik = 4;
        for (const satirlar of Object.values(dersBazliMap)) {
            for (const { dogru } of satirlar) {
                if (dogru.length === 1) {
                    const kodu = dogru.charCodeAt(0) - 64; // A=1, B=2, ...
                    if (kodu > maxSik) maxSik = kodu;
                }
            }
        }

        return {
            dersler: Object.entries(dersBazliMap).map(([dersAdi, anahtarlar]) => ({
                dersAdi,
                anahtarlar: anahtarlar.sort((a, b) => a.soruNo - b.soruNo)
            })),
            sikSayisi: maxSik,
            yuklenmeTarihi: new Date().toISOString()
        };
    }

    function _sutunBul(baslik, adaylar) {
        for (let i = 0; i < baslik.length; i++) {
            if (adaylar.some(a => baslik[i].includes(a))) return i;
        }
        return -1;
    }

    // SheetJS CDN'den dinamik yükleme
    function _xlsxYukle() {
        return new Promise((resolve, reject) => {
            if (window.XLSX) { resolve(); return; }
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
            s.onload = resolve;
            s.onerror = () => reject(new Error("SheetJS (xlsx) yüklenemedi."));
            document.head.appendChild(s);
        });
    }

    // ----------------------------------------------------------------
    // Public API
    // ----------------------------------------------------------------

    return { getir, kaydet, temizle, mevcutMu, exceldenYukle };

})();
