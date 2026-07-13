// js/app.js

import {
    startCamera,
    capturePhoto,
    stopCamera
} from "./camera.js";

import { baglaGaleriSecici } from "./galeriSecici.js";
import { formuOkuVeGoster, formuOkuElleKoseliVeGoster } from "./formOkuyucu.js";

// Tarama sonucu olayını dinle ve oturuma ekle
window.addEventListener("omrSonucHazir", function (e) {
    const sonuc = e.detail;
    if (sonuc && sonuc.basarili && window.TopluTarama) {
        window.TopluTarama.ekle(sonuc);
    }
});

// TopluTarama güncellenince UI'ı yenile
window.addEventListener("topluTaramaGuncellendi", function (e) {
    _taramaListesiniYenile(e.detail);
});

function baslat() {

    const startBtn = document.getElementById("start");
    const captureBtn = document.getElementById("capture");
    const stopBtn = document.getElementById("stop");
    const statusText = document.getElementById("statusText");

    if (!startBtn || !captureBtn || !stopBtn) {
        console.error("Butonlar bulunamadı.");
        return;
    }

    startBtn.addEventListener("click", async () => {
        try {
            statusText.textContent = "Kamera açılıyor...";
            await startCamera();
            statusText.textContent = "Kamera hazır";
        } catch (error) {
            console.error(error);
            statusText.textContent = "Kamera açılamadı";
        }
    });

    captureBtn.addEventListener("click", async () => {
        try {
            statusText.textContent = "Fotoğraf işleniyor...";
            await capturePhoto();
        } catch (error) {
            console.error(error);
            statusText.textContent = "Fotoğraf çekilemedi";
        }
    });

    stopBtn.addEventListener("click", () => {
        try {
            stopCamera();
            statusText.textContent = "Kamera kapatıldı";
        } catch (error) {
            console.error(error);
            statusText.textContent = "Kapatma hatası";
        }
    });

    baglaGaleriSecici("galeriInput", "canvas");

    const sinavTuruSelect = document.getElementById("sinavTuru");
    const ozelAlanlar = document.getElementById("ozelAlanlar");

    if (sinavTuruSelect && ozelAlanlar) {
        sinavTuruSelect.addEventListener("change", () => {
            ozelAlanlar.style.display = sinavTuruSelect.value === "ozel" ? "block" : "none";
        });
    }

    // ── Cevap anahtarı bağlamaları ──
    _cevapAnahtariBaglantilari();

    // ── Toplu tarama bağlamaları ──
    _topluTaramaBaglantilari();

    // Sayfa yüklenince mevcut anahtarı göster
    _anahtarDurumGuncelle();
}

// ─────────────────────────────────────────────────────────────────────
// CEVAP ANAHTARI
// ─────────────────────────────────────────────────────────────────────

let _mevcutDersler = []; // [{dersAdi, soruSayisi, sikSayisi}] — o an seçili sınav türünün ders listesi

function _cevapAnahtariBaglantilari() {

    // Excel yükleme
    const excelInput = document.getElementById("anahtarExcelInput");
    if (excelInput) {
        excelInput.addEventListener("change", async function () {
            const file = this.files[0];
            if (!file) return;
            try {
                _anahtarDurumYaz("Yükleniyor...", "yukleniyor");
                await window.CevapAnahtari.exceldenYukle(file);
                _anahtarDurumGuncelle();
                _seciliDersiYenidenCiz();
                this.value = "";
            } catch (err) {
                alert("Excel yükleme hatası: " + err.message);
                _anahtarDurumYaz("Yükleme başarısız", "hata");
            }
        });
    }

    // Tümünü sil
    const temizleBtn = document.getElementById("anahtarTemizleBtn");
    if (temizleBtn) {
        temizleBtn.addEventListener("click", () => {
            if (confirm("Cevap anahtarındaki TÜM işaretlemeler silinsin mi?")) {
                window.CevapAnahtari.temizle();
                _anahtarDurumGuncelle();
                _seciliDersiYenidenCiz();
            }
        });
    }

    // Excel olarak dışa aktar
    const disaAktarBtn = document.getElementById("anahtarDisaAktarBtn");
    if (disaAktarBtn) {
        disaAktarBtn.addEventListener("click", async () => {
            try {
                disaAktarBtn.disabled = true;
                disaAktarBtn.textContent = "Hazırlanıyor...";
                await window.DisaAktar.cevapAnahtariniIndir();
            } catch (e) {
                alert("Dışa aktarma hatası: " + e.message);
            } finally {
                disaAktarBtn.disabled = false;
                disaAktarBtn.textContent = "⬇️ Dışa Aktar";
            }
        });
    }

    // Ders seçimi değişince o dersin soru ızgarasını çiz
    const dersSecici = document.getElementById("manuelDersSecici");
    if (dersSecici) {
        dersSecici.addEventListener("change", _seciliDersiYenidenCiz);
    }

    // Sınav türü / soru-şık sayısı değişince ders listesini yenile
    // (bu alanlar Kağıtlar sekmesinde ama cevap anahtarının hangi
    // derslerden oluştuğunu belirler)
    ["sinavTuru", "soruSayisi", "sikSayisi"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", _dersSeciciYenile);
            el.addEventListener("input", _dersSeciciYenile);
        }
    });

    _dersSeciciYenile();
}

/** Şu an seçili sınav türünün (LGS/Bursluluk/Özel) ders + soru sayısı listesini layoutEngine'den çıkarır. */
function _formunDersListesiniCikar() {
    try {
        const sinavTuruSelect = document.getElementById("sinavTuru");
        const sinavTuru = sinavTuruSelect ? sinavTuruSelect.value : "lgs";
        const params = { sinavTuru };

        if (sinavTuru === "ozel") {
            params.soruSayisi = parseInt(document.getElementById("soruSayisi").value, 10) || 20;
            params.sikSayisi = parseInt(document.getElementById("sikSayisi").value, 10) || 4;
        }

        const layout = window.LayoutEngine.layoutHesapla(params);
        const form = layout.formlar[0];

        if (form.bolumler) {
            const liste = [];
            form.bolumler.forEach((b) => {
                b.dersSutunlari.forEach((d) => {
                    liste.push({
                        dersAdi: d.dersAdi,
                        soruSayisi: d.sorular.length,
                        sikSayisi: d.sorular[0].sikler.length
                    });
                });
            });
            return liste;
        } else if (form.izgara) {
            return [{
                dersAdi: "Genel",
                soruSayisi: form.izgara.sorular.length,
                sikSayisi: form.izgara.sorular[0].sikler.length
            }];
        }

        return [];

    } catch (e) {
        console.error("Ders listesi çıkarılamadı:", e);
        return [];
    }
}

/** Ders seçici <select>'i günceller ve ilk dersin soru ızgarasını çizer. */
function _dersSeciciYenile() {

    _mevcutDersler = _formunDersListesiniCikar();

    const dersSecici = document.getElementById("manuelDersSecici");
    if (!dersSecici) return;

    if (_mevcutDersler.length === 0) {
        dersSecici.innerHTML = "<option>(ders bulunamadı)</option>";
        document.getElementById("manuelSorularAlani").innerHTML = "";
        return;
    }

    dersSecici.innerHTML = _mevcutDersler.map((d, i) =>
        `<option value="${i}">${d.dersAdi} (${d.soruSayisi} soru)</option>`
    ).join("");

    dersSecici.selectedIndex = 0;
    _seciliDersiYenidenCiz();
}

function _seciliDersiYenidenCiz() {
    const dersSecici = document.getElementById("manuelDersSecici");
    if (!dersSecici || _mevcutDersler.length === 0) return;

    const secim = _mevcutDersler[dersSecici.selectedIndex] || _mevcutDersler[0];
    _soruIzgarasiCiz(secim.dersAdi, secim.soruSayisi, secim.sikSayisi);
}

/** Seçili ders için 1..soruSayisi arası satırları, her birinde A/B/C/D daireleriyle çizer. */
function _soruIzgarasiCiz(dersAdi, soruSayisi, sikSayisi) {

    const alan = document.getElementById("manuelSorularAlani");
    if (!alan) return;

    const mevcutAnahtar = window.CevapAnahtari.getir();
    const dersKaydi = mevcutAnahtar && (mevcutAnahtar.dersler || []).find((d) => d.dersAdi === dersAdi);
    const cevapMap = {};
    if (dersKaydi) dersKaydi.anahtarlar.forEach((a) => { cevapMap[a.soruNo] = a.dogru; });

    const harfler = [];
    for (let i = 0; i < sikSayisi; i++) harfler.push(String.fromCharCode(65 + i));

    alan.innerHTML = "";

    for (let soruNo = 1; soruNo <= soruSayisi; soruNo++) {

        const satir = document.createElement("div");
        satir.className = "manuel-satir";

        const no = document.createElement("span");
        no.className = "soru-no";
        no.textContent = soruNo + ")";
        satir.appendChild(no);

        const sikGrubu = document.createElement("div");
        sikGrubu.className = "sik-grubu";

        harfler.forEach((harf) => {

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "sik-daire";
            btn.textContent = harf;
            if (cevapMap[soruNo] === harf) btn.classList.add("secili");

            btn.addEventListener("click", () => {
                const yeniDegerMi = !btn.classList.contains("secili");
                sikGrubu.querySelectorAll(".sik-daire").forEach((b) => b.classList.remove("secili"));
                if (yeniDegerMi) btn.classList.add("secili");
                _cevabiKaydet(dersAdi, sikSayisi, soruNo, yeniDegerMi ? harf : null);
            });

            sikGrubu.appendChild(btn);

        });

        satir.appendChild(sikGrubu);
        alan.appendChild(satir);

    }
}

/** Tek bir sorunun doğru cevabını kaydeder (dogruHarf null ise o soruyu anahtardan kaldırır). */
function _cevabiKaydet(dersAdi, sikSayisi, soruNo, dogruHarf) {

    const mevcut = window.CevapAnahtari.getir() || { dersler: [] };
    if (!mevcut.dersler) mevcut.dersler = [];

    let ders = mevcut.dersler.find((d) => d.dersAdi === dersAdi);
    if (!ders) {
        ders = { dersAdi, anahtarlar: [] };
        mevcut.dersler.push(ders);
    }

    ders.anahtarlar = (ders.anahtarlar || []).filter((a) => a.soruNo !== soruNo);
    if (dogruHarf) ders.anahtarlar.push({ soruNo, dogru: dogruHarf });
    ders.anahtarlar.sort((a, b) => a.soruNo - b.soruNo);

    mevcut.sikSayisi = Math.max(mevcut.sikSayisi || 4, sikSayisi);
    mevcut.guncellemeTarihi = new Date().toISOString();

    window.CevapAnahtari.kaydet(mevcut);
    _anahtarDurumGuncelle();

}

function _anahtarDurumGuncelle() {
    const anahtar = window.CevapAnahtari.getir();
    const disaAktarBtn = document.getElementById("anahtarDisaAktarBtn");

    if (!anahtar || (anahtar.dersler || []).every((d) => (d.anahtarlar || []).length === 0)) {
        _anahtarDurumYaz("Cevap anahtarı yüklenmedi", "anahtar-yok");
        document.getElementById("anahtarTemizleBtn").style.display = "none";
        if (disaAktarBtn) disaAktarBtn.style.display = "none";
        return;
    }

    const toplamSoru = (anahtar.dersler || []).reduce(
        (t, d) => t + (d.anahtarlar || []).length, 0
    );

    _anahtarDurumYaz(
        `✅ ${toplamSoru} soru işaretlendi · ${(anahtar.dersler || []).length} ders`,
        "anahtar-var"
    );
    document.getElementById("anahtarTemizleBtn").style.display = "inline-flex";
    if (disaAktarBtn) disaAktarBtn.style.display = "inline-flex";
}

function _anahtarDurumYaz(mesaj, sinif) {
    const el = document.getElementById("anahtarDurum");
    if (!el) return;
    el.textContent = mesaj;
    el.className = "anahtar-durum " + sinif;
}

// ─────────────────────────────────────────────────────────────────────
// TOPLU TARAMA
// ─────────────────────────────────────────────────────────────────────

function _topluTaramaBaglantilari() {

    const oturumBaslatBtn = document.getElementById("oturumBaslatBtn");
    if (oturumBaslatBtn) {
        oturumBaslatBtn.addEventListener("click", () => {
            const ad = document.getElementById("sinavAdiInput").value.trim() || "İsimsiz Sınav";
            window.TopluTarama.baslat(ad);
            document.getElementById("oturumBilgi").style.display = "flex";
            document.getElementById("taramaSonucListesi").style.display = "block";
        });
    }

    const sifirlaBtn = document.getElementById("oturumSifirlaBtn");
    if (sifirlaBtn) {
        sifirlaBtn.addEventListener("click", () => {
            if (confirm("Tüm tarama sonuçları silinsin mi?")) {
                window.TopluTarama.temizle();
            }
        });
    }

    const pdfBtn = document.getElementById("pdfRaporBtn");
    if (pdfBtn) {
        pdfBtn.addEventListener("click", async () => {
            try {
                pdfBtn.disabled = true;
                pdfBtn.textContent = "Oluşturuluyor...";
                await window.DisaAktar.pdfRaporuIndir(
                    window.TopluTarama.sonuclar(),
                    window.TopluTarama.ozet()
                );
            } catch (e) {
                alert("PDF hatası: " + e.message);
            } finally {
                pdfBtn.disabled = false;
                pdfBtn.textContent = "📄 PDF Rapor";
            }
        });
    }

    const excelBtn = document.getElementById("excelRaporBtn");
    if (excelBtn) {
        excelBtn.addEventListener("click", async () => {
            try {
                excelBtn.disabled = true;
                excelBtn.textContent = "Oluşturuluyor...";
                await window.DisaAktar.excelIndir(
                    window.TopluTarama.sonuclar(),
                    window.TopluTarama.ozet()
                );
            } catch (e) {
                alert("Excel hatası: " + e.message);
            } finally {
                excelBtn.disabled = false;
                excelBtn.textContent = "📊 Excel İndir";
            }
        });
    }
}

function _taramaListesiniYenile({ sonuclar, ozet }) {

    const sayac = document.getElementById("oturumSayac");
    if (sayac) sayac.textContent = `${ozet.toplamOgrenci} öğrenci tarandı`;

    const liste = document.getElementById("taramaSonucListesi");
    if (!liste) return;

    if (sonuclar.length === 0) {
        liste.innerHTML = '<p class="liste-bos">Henüz tarama yapılmadı.</p>';
    } else {
        liste.innerHTML = sonuclar.map((r, idx) => {
            const ogr = r.ogrenci || {};
            const ad = ogr.adSoyad || ogr.ad_soyad || "Ad bilgisi yok";
            const p = r.puan;
            const pText = p.toplam != null ? `${p.toplam}%` : "—";
            const renkSinif = p.toplam >= 70 ? "puan-yuksek" : p.toplam >= 40 ? "puan-orta" : "puan-dusuk";

            return `<div class="tarama-kayit">
                <span class="tarama-sira">${r.sira}</span>
                <div class="tarama-bilgi">
                    <strong>${ad}</strong>
                    <small>${ogr.ogrenciNo || ""} · ${ogr.sinif || ""} · ${r.tarih || ""}</small>
                </div>
                <div class="tarama-puan ${renkSinif}">${pText}</div>
                <div class="tarama-detay">D:${p.dogru ?? "—"} Y:${p.yanlis ?? "—"} B:${p.bos ?? "—"}</div>
                <button type="button" class="btn-sil-kayit" data-idx="${idx}">✕</button>
            </div>`;
        }).join("");

        liste.querySelectorAll(".btn-sil-kayit").forEach(btn => {
            btn.addEventListener("click", function () {
                window.TopluTarama.sil(parseInt(this.dataset.idx, 10));
            });
        });
    }

    // Özet paneli
    const disaPanel = document.getElementById("disaAktarPanel");
    const ozetEl = document.getElementById("ozetSatirlar");
    if (disaPanel && ozetEl && sonuclar.length > 0) {
        disaPanel.style.display = "block";
        ozetEl.innerHTML = `
            <span>📊 Ortalama: <strong>${ozet.ortPuan ?? "—"}</strong></span>
            <span>⬆️ En yüksek: <strong>${ozet.enYuksek ?? "—"}</strong></span>
            <span>⬇️ En düşük: <strong>${ozet.enDusuk ?? "—"}</strong></span>
        `;
    } else if (disaPanel && sonuclar.length === 0) {
        disaPanel.style.display = "none";
    }
}

// ─────────────────────────────────────────────────────────────────────
// Başlat
// ─────────────────────────────────────────────────────────────────────
if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", baslat);
} else {
    baslat();
}
