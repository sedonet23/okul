// js/hassasiyetAyarlari.js
//
// Köşe tespiti (blob yöntemi) için MANUEL ayarlanabilir hassasiyet
// parametreleri. localStorage'da saklanır, cihaza/ışık koşuluna özel
// kalıcı olur. omrEngine.js'deki enBuyukKareBlobuBul() bu değerleri
// (verilmezse kendi varsayılanlarını) kullanır — bkz. omrEngine.js.

const ANAHTAR = 'optikHassasiyetAyarlari';

export const VARSAYILAN = {
    yuzdelik: 0.30,        // eşik: bölgenin en koyu %kaçı (0.10-0.50 arası mantıklı)
    minDoluluk: 0.45,      // minimum doluluk oranı (0.20-0.70)
    tespitAraligiMs: 350,  // canlı köşe tespiti döngü aralığı (200-800ms)
};

export function ayarlariGetir() {
    try {
        const ham = localStorage.getItem(ANAHTAR);
        if (!ham) return { ...VARSAYILAN };
        return { ...VARSAYILAN, ...JSON.parse(ham) };
    } catch (e) {
        return { ...VARSAYILAN };
    }
}

export function ayarlariKaydet(kismi) {
    // undefined değerleri (ör. sayfada karşılık gelen input yoksa) mevcut
    // kayıtlı değerin üzerine YAZMASIN diye eleniyor.
    const temiz = {};
    Object.keys(kismi || {}).forEach(k => { if (kismi[k] !== undefined) temiz[k] = kismi[k]; });
    const guncel = { ...ayarlariGetir(), ...temiz };
    try { localStorage.setItem(ANAHTAR, JSON.stringify(guncel)); } catch (e) { /* sorun değil */ }
    return guncel;
}

export function ayarlariSifirla() {
    try { localStorage.removeItem(ANAHTAR); } catch (e) {}
    return { ...VARSAYILAN };
}

// app.js modül olmayan/eski yerlerden de erişebilsin diye window'a da asıyoruz.
window.HassasiyetAyarlari = { VARSAYILAN, ayarlariGetir, ayarlariKaydet, ayarlariSifirla };
