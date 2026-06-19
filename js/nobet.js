// AYLIK NÖBET MODÜLÜ MOTORU
let nobetYerleri = dbMock.get('nobet_yerleri', ["Bahçe", "1. Kat Koridor", "Kantin Katı"]);
let nobetAtamalari = dbMock.get('nobet_atamalari', {}); // Format: {'2026-06-03': {'Bahçe': 'Ahmet Y.', 'amir': 'Mehmet T.', 'amirTel': '05...'} }

function initNobetModulu() {
    const aySecici = document.getElementById('nobet-ay-secici');
    if(!aySecici.value) {
        const simdi = new Date();
        aySecici.value = simdi.getFullYear() + "-" + (simdi.getMonth()+1).toString().padStart(2, '0');
    }
    
    aySecici.removeEventListener('change', loadAylikNobetTablosu);
    aySecici.addEventListener('change', loadAylikNobetTablosu);
    
    loadAylikNobetTablosu();
    renderNobetYerleriListesi();
}

function loadAylikNobetTablosu() {
    const ayVal = document.getElementById('nobet-ay-secici').value; // Örn: "2026-06"
    if(!ayVal) return;

    const [yil, ay] = ayVal.split('-').map(Number);
    const thead = document.getElementById('aylik-nobet-header');
    const tbody = document.getElementById('aylik-nobet-body');

    // Tablo Başlıklarını Çiz (Dinamik Nöbet Yerleri + Amir)
    let headerHtml = `<tr><th class="sticky-col" style="background:var(--logo-koyu-yesil)">Tarih / Gün</th>`;
    nobetYerleri.forEach(yer => {
        headerHtml += `<th>${yer}</th>`;
    });
    headerHtml += `<th style="background:#1e293b">Nöbetçi Amir (Adı Soyadı)</th>`;
    headerHtml += `<th style="background:#1e293b">Amir Telefon</th></tr>`;
    thead.innerHTML = headerHtml;

    // Ayın günlerini oluştur
    tbody.innerHTML = '';
    const toplamGun = new Date(yil, ay, 0).getDate();

    for(let g=1; g<=toplamGun; g++) {
        const tarihStr = `${yil}-${ay.toString().padStart(2,'0')}-${g.toString().padStart(2,'0')}`;
        const tarihObje = new Date(yil, ay - 1, g);
        const gunAdi = tarihObje.toLocaleDateString('tr-TR', { weekday: 'long' });
        const haftaSonuMu = tarihObje.getDay() === 0 || tarihObje.getDay() === 6;

        let tr = document.createElement('tr');
        if(haftaSonuMu) {
            tr.style.background = "#f1f5f9";
            tr.style.color = var(--text-muted);
        }

        let tdTarih = `<td class="sticky-col"><strong>${g.toString().padStart(2,'0')}.${ay.toString().padStart(2,'0')}.${yil}</strong> <br><span style="font-size:11px; color:var(--text-muted)">${gunAdi}</span></td>`;
        let tdHücreler = '';

        // Nöbet konum seçim alanları veya kilitli hücreler
        nobetYerleri.forEach(yer => {
            if(haftaSonuMu) {
                tdHücreler += `<td style="background:#e2e8f0; text-align:center; font-size:12px; font-weight:500;">HAFTASONU</td>`;
            } else {
                const atanmisOgrId = nobetAtamalari[tarihStr]?.[yer] || '';
                let options = `<option value="">- Seçin -</option>`;
                ogretmenler.forEach(o => {
                    options += `<option value="${o.ad}" ${atanmisOgrId === o.ad ? 'selected' : ''}>${o.ad}</option>`;
                });
                tdHücreler += `<td><select onchange="saveNobetAtama('${tarihStr}', '${yer}', this.value)" style="width:100%; padding:4px; font-size:13px;">${options}</select></td>`;
            }
        });

        // Serbest Metin Amir Bilgileri Hücreleri
        if(haftaSonuMu) {
            tdHücreler += `<td style="background:#cbd5e1;">-</td><td style="background:#cbd5e1;">-</td>`;
        } else {
            const amirAd = nobetAtamalari[tarihStr]?.amir || '';
            const amirTel = nobetAtamalari[tarihStr]?.amirTel || '';
            tdHücreler += `
                <td><input type="text" value="${amirAd}" placeholder="Amir Adı" onchange="saveAmirAtama('${tarihStr}', 'amir', this.value)" style="width:100%; padding:4px;"></td>
                <td><input type="tel" value="${amirTel}" placeholder="05..." onchange="saveAmirAtama('${tarihStr}', 'amirTel', this.value)" style="width:100%; padding:4px;"></td>
            `;
        }

        tr.innerHTML = tdTarih + tdHücreler;
        tbody.appendChild(tr);
    }
}

function saveNobetAtama(tarih, yer, deger) {
    if(!nobetAtamalari[tarih]) nobetAtamalari[tarih] = {};
    nobetAtamalari[tarih][yer] = deger;
    dbMock.set('nobet_atamalari', nobetAtamalari);
    if(tarih === new Date().toISOString().split('T')[0]) runLiveDashboard();
}

function saveAmirAtama(tarih, alan, deger) {
    if(!nobetAtamalari[tarih]) nobetAtamalari[tarih] = {};
    nobetAtamalari[tarih][alan] = deger;
    dbMock.set('nobet_atamalari', nobetAtamalari);
    if(tarih === new Date().toISOString().split('T')[0]) runLiveDashboard();
}

// DASHBOARD İÇİN ANLIK NÖBETÇİ VERİLERİNİ HESAPLAMA VE AKTARMA
function updateDashboardNobetçileri(bugunTarihStr) {
    const amirHedef = document.getElementById('dash-nobetci-amir');
    const telHedef = document.getElementById('dash-amir-tel');
    const listeHedef = document.getElementById('dash-nobetci-listesi');

    const gununVerisi = nobetAtamalari[bugunTarihStr];

    if(gununVerisi) {
        if(amirHedef) amirHedef.textContent = gununVerisi.amir || "Atanmadı";
        if(telHedef) telHedef.textContent = gununVerisi.amirTel || "Telefon Yok";
    } else {
        if(amirHedef) amirHedef.textContent = "Atanmadı";
        if(telHedef) telHedef.textContent = "-";
    }

    if(listeHedef) {
        listeHedef.innerHTML = '';
        let sayac = 0;
        nobetYerleri.forEach(yer => {
            const isim = gununVerisi?.[yer];
            if(isim) {
                sayac++;
                listeHedef.innerHTML += `<li><i class="fa-solid fa-location-dot" style="color:var(--logo-ana-yesil)"></i> <strong>${yer}:</strong> ${isim}</li>`;
            }
        });
        if(sayac === 0) listeHedef.innerHTML = '<li style="color:var(--text-muted)">Bugün için atanmış nöbetçi öğretmen bulunmuyor.</li>';
    }
}

// NÖBET KONUMLARI CRUD İŞLEMLERİ
function saveNobetYeri(e) {
    e.preventDefault();
    const inp = document.getElementById('yeni-nobet-yeri-adi');
    const yeniYer = inp.value.trim();
    if(yeniYer && !nobetYerleri.includes(yeniYer)) {
        nobetYerleri.push(yeniYer);
        dbMock.set('nobet_yerleri', nobetYerleri);
        inp.value = '';
        renderNobetYerleriListesi();
        loadAylikNobetTablosu();
    }
}

function renderNobetYerleriListesi() {
    const dest = document.getElementById('nobet-yerleri-liste-hedef');
    if(!dest) return;
    dest.innerHTML = '';
    nobetYerleri.forEach(yer => {
        dest.innerHTML += `
            <li style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;">
                <span><i class="fa-solid fa-map-pin"></i> ${yer}</span>
                <i class="fa-solid fa-trash-can" style="color:red; cursor:pointer;" onclick="deleteNobetYeri('${yer}')"></i>
            </li>`;
    });
}

function deleteNobetYeri(yerAdi) {
    if(confirm(`"${yerAdi}" konumunu sildiğinizde bu aya ait tüm geçmiş atamalar da temizlenecektir. Onaylıyor musunuz?`)) {
        nobetYerleri = nobetYerleri.filter(y => y !== yerAdi);
        dbMock.set('nobet_yerleri', nobetYerleri);
        
        // Atamalardan eski yerleri temizle
        Object.keys(nobetAtamalari).forEach(tar => {
            if(nobetAtamalari[tar][yerAdi]) delete nobetAtamalari[tar][yerAdi];
        });
        dbMock.set('nobet_atamalari', nobetAtamalari);
        
        renderNobetYerleriListesi();
        loadAylikNobetTablosu();
        runLiveDashboard();
    }
}
