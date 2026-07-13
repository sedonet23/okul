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
    _gecmisSinavlariCiz();
});

// Kalıcı depoya (localStorage) yazma başarısız olduysa (kota dolmuş
// olabilir — çok sayıda kağıt görüntüsü birikmiştir) kullanıcıyı uyar.
window.addEventListener("topluTaramaDepoHatasi", function () {
    alert(
        "⚠️ Tarama kaydedilirken depolama alanı doldu.\n\n" +
        "Cihazın yerel depolaması (localStorage) dolmuş olabilir. Eski " +
        "sınavlardan bazılarını (Raporlar sekmesi → Kayıtlı Sınavlar → Sil) " +
        "silip yer açman gerekebilir."
    );
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
    _ogrenciAtaBaglantilari();
    _sinavDetayBaglantilari();
    _gecmisSinavlariCiz();

    // Sayfa yeniden yüklendiğinde (ör. iframe kapatılıp açıldığında) daha
    // önce kalıcı depoya kaydedilmiş aktif bir sınav oturumu varsa, o
    // oturumu hemen ekrana yansıt (topluTarama.js'in kendi başlangıç
    // olayına güvenmiyoruz — dinamik import ile yarış durumu olabilir).
    if (window.TopluTarama && window.TopluTarama.aktifSinavBilgisi()) {
        const sonuclar = window.TopluTarama.sonuclar();
        if (sonuclar.length) {
            _oturumPanelleriGoster();
            _taramaListesiniYenile({ sonuclar, ozet: window.TopluTarama.ozet() });
        }
    }

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
            _oturumPanelleriGoster();
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

    // Cevap anahtarında değişiklik yapıldıktan sonra, o anahtarla henüz
    // puanlanmamış (veya eski anahtarla puanlanmış) tüm sonuçları güncel
    // anahtara göre yeniden değerlendirmek için. Ham işaretlemeler
    // (öğrencinin/okumanın işaretlediği şıklar) DEĞİŞMEZ, sadece puan.
    const yenidenHesaplaBtn = document.getElementById("yenidenHesaplaBtn");
    if (yenidenHesaplaBtn) {
        yenidenHesaplaBtn.addEventListener("click", () => {
            const sayi = (window.TopluTarama.sonuclar() || []).length;
            if (!sayi) {
                alert("Yeniden hesaplanacak sonuç yok.");
                return;
            }
            if (confirm(`${sayi} öğrencinin sonucu, GÜNCEL cevap anahtarına göre yeniden hesaplansın mı?`)) {
                window.TopluTarama.yenidenHesapla();
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

// ─────────────────────────────────────────────────────────────────────
// ÖĞRENCİ ATAMA (otomatik okumanın tanıyamadığı taramaları elle düzeltme)
// ─────────────────────────────────────────────────────────────────────

function _ogrenciAtaBaglantilari() {

    const overlay = document.getElementById("ogrenciAtaOverlay");
    const kapatBtn = document.getElementById("ataKapatBtn");
    const sinifSecici = document.getElementById("ataSinifSecici");
    const ogrenciListesi = document.getElementById("ataOgrenciListesi");
    const bagimsizUyari = document.getElementById("ataBagimsizUyari");

    if (!overlay || !sinifSecici || !ogrenciListesi) return;

    let _aktifIdx = null;

    function _veriKaynagi() {
        try {
            if (window.parent && window.parent !== window && window.parent.OptikVeriKaynagi) {
                return window.parent.OptikVeriKaynagi;
            }
        } catch (e) { /* çapraz köken erişim engeli — bağımsız çalışıyor demektir */ }
        return null;
    }

    function _sinifDoldur() {
        const kaynak = _veriKaynagi();
        if (!kaynak) {
            sinifSecici.style.display = "none";
            ogrenciListesi.innerHTML = "";
            bagimsizUyari.style.display = "block";
            return;
        }
        bagimsizUyari.style.display = "none";
        sinifSecici.style.display = "";
        const siniflar = kaynak.siniflarGetir();
        sinifSecici.innerHTML = '<option value="">— Sınıf seçin —</option>' +
            siniflar.map((s) => `<option value="${s.id}">${s.ad}</option>`).join("");
    }

    function _ogrencileriCiz() {
        const kaynak = _veriKaynagi();
        const sinifId = sinifSecici.value;
        if (!kaynak || !sinifId) {
            ogrenciListesi.innerHTML = "";
            return;
        }
        const sinifAdi = sinifSecici.options[sinifSecici.selectedIndex].textContent;
        const ogrenciler = kaynak.ogrencilerGetir(sinifId);
        if (!ogrenciler.length) {
            ogrenciListesi.innerHTML = '<p class="card-empty">Bu sınıfta kayıtlı öğrenci yok.</p>';
            return;
        }
        ogrenciListesi.innerHTML = ogrenciler.map((o, i) =>
            `<button type="button" class="ogrenci-secim-satiri" style="width:100%;border:none;text-align:left;" data-i="${i}">
                ${o.adSoyad}${o.ogrenciNo ? ` <span style="color:var(--text-faint);">(No: ${o.ogrenciNo})</span>` : ""}
            </button>`
        ).join("");
        ogrenciListesi.querySelectorAll("button").forEach((btn) => {
            btn.addEventListener("click", () => {
                const o = ogrenciler[parseInt(btn.dataset.i, 10)];
                if (_aktifIdx !== null && window.TopluTarama && window.TopluTarama.ogrenciAta) {
                    window.TopluTarama.ogrenciAta(_aktifIdx, { adSoyad: o.adSoyad, ogrenciNo: o.ogrenciNo, sinif: sinifAdi });
                }
                _kapat();
            });
        });
    }

    function _ac(idx) {
        _aktifIdx = idx;
        sinifSecici.value = "";
        ogrenciListesi.innerHTML = "";
        _sinifDoldur();
        overlay.classList.add("acik");
    }

    function _kapat() {
        overlay.classList.remove("acik");
        _aktifIdx = null;
    }

    sinifSecici.addEventListener("change", _ogrencileriCiz);
    kapatBtn.addEventListener("click", _kapat);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) _kapat(); });

    // _taramaListesiniYenile()'deki "🔗 Öğrenci Ata" bağlantılarından
    // erişilebilmesi için global olarak açığa çıkar.
    window._ogrenciAtaAc = _ac;

}

function _oturumPanelleriGoster() {
    document.getElementById("oturumBilgi").style.display = "flex";
    document.getElementById("taramaSonucListesi").style.display = "block";
}

// ─────────────────────────────────────────────────────────────────────
// KAYITLI SINAVLAR (localStorage'da kalıcı duran tüm sınavların listesi)
// ─────────────────────────────────────────────────────────────────────

function _gecmisSinavlariCiz() {

    const alan = document.getElementById("gecmisSinavlarListesi");
    if (!alan) return;

    const liste = window.TopluTarama.sinavlariListele();

    if (!liste.length) {
        alan.innerHTML = '<p class="liste-bos">Henüz kayıtlı sınav yok.</p>';
        return;
    }

    alan.innerHTML = liste.map((s) => {
        const tarih = s.sonGuncelleme ? new Date(s.sonGuncelleme).toLocaleString("tr-TR") : "";
        const ort = s.ortPuan != null ? `Ort: ${s.ortPuan}%` : "Henüz puanlanmadı";
        return `<div class="gecmis-sinav-satiri ${s.aktifMi ? "aktif" : ""}">
            <div class="gecmis-sinav-bilgi">
                <strong>${s.sinavAdi}</strong>
                <small>${s.ogrenciSayisi} öğrenci · ${ort} · ${tarih}</small>
            </div>
            <div class="gecmis-sinav-butonlar">
                ${s.aktifMi
                    ? '<span class="etiket-aktif">✓ Açık</span>'
                    : `<button type="button" class="btn-kucuk gecmis-ac-btn" data-id="${s.id}">📂 Aç</button>`
                }
                <button type="button" class="btn-kucuk btn-tehlike gecmis-sil-btn" data-id="${s.id}">🗑️</button>
            </div>
        </div>`;
    }).join("");

    alan.querySelectorAll(".gecmis-ac-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
            window.TopluTarama.sinaviYukle(this.dataset.id);
            _oturumPanelleriGoster();
        });
    });

    alan.querySelectorAll(".gecmis-sil-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
            if (confirm("Bu sınav ve tüm tarama kayıtları kalıcı olarak silinsin mi?")) {
                window.TopluTarama.sinaviSil(this.dataset.id);
            }
        });
    });
}

// ─────────────────────────────────────────────────────────────────────
// SINAV KAĞIDI DETAYI / ELLE DÜZENLEME
// (Raporlar sekmesinde bir öğrenci sonucuna tıklanınca açılır)
// ─────────────────────────────────────────────────────────────────────

function _sinavDetayBaglantilari() {

    const overlay = document.getElementById("sinavDetayOverlay");
    const kapatBtn = document.getElementById("detayKapatBtn");
    if (!overlay || !kapatBtn) return;

    function _kapat() {
        overlay.classList.remove("acik");
    }

    kapatBtn.addEventListener("click", _kapat);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) _kapat(); });

    // _taramaListesiniYenile()'deki "🔍 Gör" bağlantılarından erişilebilmesi
    // için global olarak açığa çıkar.
    window._sinavDetayAc = function (idx) {
        _detayCiz(idx);
        overlay.classList.add("acik");
    };

}

/** Bir öğrencinin kağıt görüntüsünü + soru bazlı doğru/yanlış/boş
 * durumunu çizer; her soruya tıklanarak işaretli şık elle değiştirilebilir. */
function _detayCiz(idx) {

    const kayit = (window.TopluTarama.sonuclar() || [])[idx];
    if (!kayit) return;

    const ogr = kayit.ogrenci || {};
    const baslikEl = document.getElementById("detayBaslik");
    if (baslikEl) {
        const ad = ogr.adSoyad || ogr.ad_soyad || "(isimsiz)";
        baslikEl.textContent = `🔍 ${ad}${ogr.ogrenciNo ? " · No: " + ogr.ogrenciNo : ""}`;
    }

    const ozetEl = document.getElementById("detayOzetSatiri");
    if (ozetEl) {
        const p = kayit.puan;
        const pText = p.toplam != null ? `${p.toplam}%` : "—";
        ozetEl.innerHTML = `
            <span class="detay-puan">${pText}</span>
            <span>D:${p.dogru ?? "—"}</span>
            <span>Y:${p.yanlis ?? "—"}</span>
            <span>B:${p.bos ?? "—"}</span>
            ${kayit.elleDuzenlendiMi ? '<span class="etiket-elle">✏️ elle düzenlendi</span>' : ""}
        `;
    }

    const goruntuAlani = document.getElementById("detayGoruntuAlani");
    if (goruntuAlani) {
        goruntuAlani.innerHTML = kayit.kagitGoruntusu
            ? `<img src="${kayit.kagitGoruntusu}" alt="Taranan kağıt" class="detay-kagit-img">`
            : '<p class="card-empty">Bu kayıt için saklanmış kağıt görüntüsü yok.</p>';
    }

    const sorularAlani = document.getElementById("detaySorularAlani");
    if (!sorularAlani) return;

    // Detayları derse göre grupla (dersiz formlarda ders null/"Genel" olur).
    const gruplar = {};
    (kayit.puan.detay || []).forEach((d) => {
        const dersAdi = d.ders && d.ders !== "null" ? d.ders : "Genel";
        if (!gruplar[dersAdi]) gruplar[dersAdi] = [];
        gruplar[dersAdi].push(d);
    });

    sorularAlani.innerHTML = Object.keys(gruplar).map((dersAdi) => {

        const sorular = gruplar[dersAdi].sort((a, b) => a.soruNo - b.soruNo);
        // Şık sayısını bu dersteki mevcut işaretlemelerden/anahtardan tahmin
        // et; hiçbiri yoksa güvenli varsayılan olarak 5'e kadar destekle.
        const dersKaydi = _mevcutDersler.find((d) => d.dersAdi === dersAdi);
        const sikSayisi = dersKaydi ? dersKaydi.sikSayisi : 5;
        const harfler = [];
        for (let i = 0; i < sikSayisi; i++) harfler.push(String.fromCharCode(65 + i));

        const satirlar = sorular.map((s) => {
            const durumSinif = s.durum === "dogru" ? "detay-dogru" : s.durum === "yanlis" ? "detay-yanlis" : "detay-bos";
            const sikDugmeleri = harfler.map((h) => {
                const seciliMi = s.isaretli === h;
                const dogruMu = s.dogru === h;
                let ekSinif = "";
                if (dogruMu) ekSinif += " dogru-sik";
                if (seciliMi) ekSinif += " secili";
                return `<button type="button" class="sik-daire${ekSinif}" data-ders="${dersAdi}" data-soru="${s.soruNo}" data-harf="${h}">${h}</button>`;
            }).join("");

            return `<div class="manuel-satir detay-satir ${durumSinif}">
                <span class="soru-no">${s.soruNo})</span>
                <div class="sik-grubu">${sikDugmeleri}</div>
            </div>`;
        }).join("");

        return `<div class="detay-ders-grubu">
            <h3 class="detay-ders-basligi">${dersAdi}</h3>
            ${satirlar}
        </div>`;

    }).join("");

    sorularAlani.querySelectorAll(".sik-daire").forEach((btn) => {
        btn.addEventListener("click", function () {
            const ders = this.dataset.ders;
            const soruNo = parseInt(this.dataset.soru, 10);
            const harf = this.dataset.harf;
            const zatenSeciliMi = this.classList.contains("secili");
            window.TopluTarama.cevabiGuncelle(idx, ders, soruNo, zatenSeciliMi ? null : harf);
            _detayCiz(idx); // güncel puan/işaretle yeniden çiz
        });
    });
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
            const ad = ogr.adSoyad || ogr.ad_soyad || null;
            const adHtml = ad
                ? ad
                : `<button type="button" class="ogrenci-ata-link" data-idx="${idx}">🔗 Ad bilgisi yok — Öğrenci Ata</button>`;
            const p = r.puan;
            const pText = p.toplam != null ? `${p.toplam}%` : "—";
            const renkSinif = p.toplam >= 70 ? "puan-yuksek" : p.toplam >= 40 ? "puan-orta" : "puan-dusuk";

            return `<div class="tarama-kayit">
                <span class="tarama-sira">${r.sira}</span>
                <div class="tarama-bilgi">
                    <strong>${adHtml}</strong>
                    <small>${ogr.ogrenciNo || ""} · ${ogr.sinif || ""} · ${r.tarih || ""}${r.elleDuzenlendiMi ? " · ✏️ elle düzenlendi" : ""}</small>
                </div>
                <div class="tarama-puan ${renkSinif}">${pText}</div>
                <div class="tarama-detay">D:${p.dogru ?? "—"} Y:${p.yanlis ?? "—"} B:${p.bos ?? "—"}</div>
                <div class="tarama-aksiyonlar">
                    <button type="button" class="btn-gor-kayit" data-idx="${idx}" title="Kağıdı gör / elle düzenle">🔍</button>
                    <button type="button" class="btn-sil-kayit" data-idx="${idx}">✕</button>
                </div>
            </div>`;
        }).join("");

        liste.querySelectorAll(".btn-gor-kayit").forEach(btn => {
            btn.addEventListener("click", function () {
                if (typeof window._sinavDetayAc === "function") {
                    window._sinavDetayAc(parseInt(this.dataset.idx, 10));
                }
            });
        });

        liste.querySelectorAll(".btn-sil-kayit").forEach(btn => {
            btn.addEventListener("click", function () {
                window.TopluTarama.sil(parseInt(this.dataset.idx, 10));
            });
        });

        liste.querySelectorAll(".ogrenci-ata-link").forEach(btn => {
            btn.addEventListener("click", function () {
                if (typeof window._ogrenciAtaAc === "function") {
                    window._ogrenciAtaAc(parseInt(this.dataset.idx, 10));
                }
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
