// GELİŞMİŞ EXCEL PARSER VE İÇE AKTARIM MOTORU
document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById('excel-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleExcelImport);
    }
});

function handleExcelImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = evt.target.result;
            const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
            
            // İlk sayfayı baz alıyoruz
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Veriyi JSON formatına (Header'ları dizi halinde alacak şekilde) dönüştür
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
            
            if (rows.length < 2) {
                alert("Geçersiz Excel formatı. Başlık satırı ve en az bir veri satırı olmalıdır.");
                return;
            }

            parseNobetExcel(rows);
        } catch (err) {
            console.error(err);
            alert("Excel dosyası okunurken teknik bir hata oluştu: " + err.message);
        }
    };
    reader.readAsBinaryString(file);
}

function parseNobetExcel(rows) {
    // 1. Satır başlıklarını analiz et
    const headers = rows[0].map(h => h.toString().trim().toUpperCase());
    
    let tarihIdx = -1;
    let amirIdx = -1;
    let amirTelIdx = -1;
    let dinamikKonumlar = [];

    headers.forEach((h, idx) => {
        if (h.includes("TARİH") || h.includes("TARIH")) tarihIdx = idx;
        else if (h.includes("AMİR") || h.includes("AMIR") || h.includes("BAŞKAN")) amirIdx = idx;
        else if (h.includes("TEL") || h.includes("TELEFON")) amirTelIdx = idx;
        else if (h !== "" && !h.includes("GÜN") && !h.includes("GUN")) {
            // Tarih, Gün ve Amir dışındaki her sütun bir nöbet yeridir (Bahçe, Kantin, Katlar vb.)
            dinamikKonumlar.push({ index: idx, name: rows[0][idx].toString().trim() });
        }
    });

    if (tarihIdx === -1) {
        alert("Excel tablosunda 'TARİH' sütunu bulunamadı! Lütfen kontrol edin.");
        return;
    }

    // Yeni nöbet yerlerini mevcut listeye entegre et (Yoksa otomatik ekle)
    let guncelNobetYerleri = dbMock.get('nobet_yerleri', []);
    dinamikKonumlar.forEach(dk => {
        if (!guncelNobetYerleri.includes(dk.name)) {
            guncelNobetYerleri.push(dk.name);
        }
    });
    dbMock.set('nobet_yerleri', guncelNobetYerleri);
    nobetYerleri = guncelNobetYerleri; // nobet.js global değişkenini güncelle

    // 2. Satırları oku ve takvim tarihine göre işle
    let guncelAtamalari = dbMock.get('nobet_atamalari', {});

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[tarihIdx]) continue; // Boş tarih satırını atla

        let rawTarih = row[tarihIdx];
        let isoTarihStr = "";

        // Tarih formatını güvenli hale getir (Excel tarih objesi veya String formatı)
        if (rawTarih instanceof Date) {
            isoTarihStr = rawTarih.toISOString().split('T')[0];
        } else {
            // Örn: "03.06.2026" veya "2026-06-03" string ise
            const parcalar = rawTarih.toString().split(/[-.]/);
            if (parcalar.length === 3) {
                if (parcalar[0].length === 4) { // YYYY-MM-DD
                    isoTarihStr = `${parcalar[0]}-${parcalar[1].padStart(2,'0')}-${parcalar[2].padStart(2,'0')}`;
                } else { // DD.MM.YYYY
                    isoTarihStr = `${parcalar[2]}-${parcalar[1].padStart(2,'0')}-${parcalar[0].padStart(2,'0')}`;
                }
            }
        }

        if (!isoTarihStr || isoTarihStr.includes("NaN")) continue;

        // Satırdaki verilerin 'HAFTASONU' veya 'TATİL' olup olmadığını kontrol et
        const satirMetni = row.join("").toUpperCase();
        if (satirMetni.includes("HAFTASONU") || satirMetni.includes("TATİL") || satirMetni.includes("TATIL")) {
            continue; // Bu günleri pas geç, sistem otomatik kilitleyecek
        }

        // Objeyi hazırla
        if (!guncelAtamalari[isoTarihStr]) guncelAtamalari[isoTarihStr] = {};

        // Konum atamalarını yerleştir
        dinamikKonumlar.forEach(dk => {
            const ogrAdi = row[dk.index] ? row[dk.index].toString().trim() : "";
            if (ogrAdi) {
                guncelAtamalari[isoTarihStr][dk.name] = ogrAdi;
            }
        });

        // Amir bilgilerini yerleştir
        if (amirIdx !== -1 && row[amirIdx]) {
            guncelAtamalari[isoTarihStr]["amir"] = row[amirIdx].toString().trim();
        }
        if (amirTelIdx !== -1 && row[amirTelIdx]) {
            guncelAtamalari[isoTarihStr]["amirTel"] = row[amirTelIdx].toString().trim();
        }
    }

    // Değişiklikleri kaydet ve arayüzü yenile
    dbMock.set('nobet_atamalari', guncelAtamalari);
    nobetAtamalari = guncelAtamalari; // nobet.js global verisini güncelle
    
    // Aktif ay görünümünü yüklenen excelin ayına eşitle
    const ilkTarihKey = Object.keys(guncelAtamalari).pop();
    if(ilkTarihKey) {
        document.getElementById('nobet-ay-secici').value = ilkTarihKey.substring(0, 7);
    }

    alert("Excel listesindeki nöbet yerleri, tarihler ve nöbetçi öğretmen atamaları başarıyla sisteme aktarıldı!");
    loadAylikNobetTablosu();
    runLiveDashboard();
    document.getElementById('excel-file-input').value = ""; // Inputu sıfırla
}
