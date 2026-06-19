// FAKE/MOCK FIREBASE VE FIRESTORE YAPISI (GERÇEK BAĞLANTI İÇİN KENDİ VERİLERİNİZİ EKLEYEBİLİRSİNİZ)
// LocalStorage tabanlı bir yedekleme mekanizmasıyla entegre edilmiştir.
const dbMock = {
    get: (key, defaultVal = []) => JSON.parse(localStorage.getItem('oys_' + key)) || defaultVal,
    set: (key, val) => localStorage.setItem('oys_' + key, JSON.stringify(val))
};

// GLOBAL DURUM YÖNETİMİ
let aktifSekme = 'dashboard';
let dersSaatleri = dbMock.get('ders_saatleri', [
    { no: 1, basla: "08:30", bitis: "09:10" },
    { no: 2, basla: "09:20", bitis: "10:00" },
    { no: 3, basla: "10:10", bitis: "10:50" },
    { no: 4, basla: "11:00", bitis: "11:40" },
    { no: 5, basla: "12:30", bitis: "13:10" },
    { no: 6, basla: "13:20", bitis: "14:00" },
    { no: 7, basla: "14:10", bitis: "14:50" }
]);
let ogretmenler = dbMock.get('ogretmenler', []);
let gorevler = dbMock.get('gorevler', []);
let notlar = dbMock.get('notlar', []);
let periyodikIsler = dbMock.get('periyodik_isler', []);

// UYGULAMA BAŞLANGICI
document.addEventListener("DOMContentLoaded", () => {
    initLiveDate();
    initDersSaatleriAyarlari();
    renderOgretmenler();
    renderNotlar();
    renderGorevler();
    renderPeriyodikIsler();
    
    // Canlı Dashboard Döngüsü (Her dakika başı çalışır)
    runLiveDashboard();
    setInterval(runLiveDashboard, 60000);
});

// SEKMELER ARASI GEÇİŞ
function switchTab(tabId) {
    aktifSekme = tabId;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu li').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById(`${tabId}-tab`);
    if(targetTab) targetTab.classList.add('active');
    
    // Tetikleyici menü elemanını bul ve aktif et
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    for(let item of menuItems) {
        if(item.textContent.toLowerCase().includes(tabId === 'notlar-gorevler' ? 'notlar' : tabId.substring(0,4))) {
            item.classList.add('active');
            break;
        }
    }

    if(tabId === 'nobet') initNobetModulu();
    if(tabId === 'cizelgeler') initCizelgeModulu();
}

// POPUP / MODAL KONTROLLERİ
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// CANLI ANA SAYFA (DASHBOARD) MOTORU
function initLiveDate() {
    const bugun = new Date();
    document.getElementById('live-date').textContent = bugun.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
}

function runLiveDashboard() {
    initLiveDate();
    const simdi = new Date();
    const suAnkiSaat = simdi.getHours().toString().padStart(2, '0') + ":" + simdi.getMinutes().toString().padStart(2, '0');
    
    let durumMetni = "Okul Saatleri Dışındayız";
    let kalanSureMetni = "--:--";
    let aktifDersNo = -1;
    let ogleArasiSonrasi = parseInt(document.getElementById('ayarlar-ogle-arasi-sonrasi')?.value || 4);

    // Ders saatleri tespiti ve Geri Sayım Hesaplama
    for (let i = 0; i < dersSaatleri.length; i++) {
        const d = dersSaatleri[i];
        if (suAnkiSaat >= d.basla && suAnkiSaat <= d.bitis) {
            durumMetni = `${d.no}. Ders Saatindeyiz`;
            kalanSureMetni = `Bitime ${dakikaFarki(suAnkiSaat, d.bitis)} dk kaldı`;
            aktifDersNo = d.no;
            break;
        }
        // Teneffüs kontrolü
        if (i < dersSaatleri.length - 1) {
            const sonrakiDers = dersSaatleri[i+1];
            if (suAnkiSaat > d.bitis && suAnkiSaat < sonrakiDers.basla) {
                if (d.no === ogleArasiSonrasi) {
                    durumMetni = "Öğle Arasındayız";
                    kalanSureMetni = `Ders Başlangıcına ${dakikaFarki(suAnkiSaat, sonrakiDers.basla)} dk`;
                } else {
                    durumMetni = `Teneffüsteyiz (${d.no}. Ders Çıktısı)`;
                    kalanSureMetni = `Derse ${dakikaFarki(suAnkiSaat, sonrakiDers.basla)} dk`;
                }
                break;
            }
        }
    }

    document.getElementById('zil-durum-metni').textContent = durumMetni;
    document.getElementById('zil-kalan-sure').textContent = kalanSureMetni;

    // Günün Nöbetçilerini Çek (nobet.js ile entegre)
    if(typeof updateDashboardNobetçileri === 'function') {
        updateDashboardNobetçileri(simdi.toISOString().split('T')[0]);
    }
    
    // Canlı Ders Durum Matrisini Çiz
    renderDashboardDersMatrisi(aktifDersNo);
    renderDashboardOzetler();
}

function dakikaFarki(erkenSaat, gecSaat) {
    const [h1, m1] = erkenSaat.split(':').map(Number);
    const [h2, m2] = gecSaat.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
}

// ÖĞRETMEN İŞLEMLERİ (CRUD & DETAY PANELİ)
function saveOgretmen(e) {
    e.preventDefault();
    const id = document.getElementById('ogretmen-id').value;
    const yeniOgr = {
        id: id || 'ogr_' + Date.now(),
        ad: document.getElementById('ogr-ad').value,
        unvan: document.getElementById('ogr-unvan').value,
        derece: document.getElementById('ogr-derece').value,
        kademe: document.getElementById('ogr-kademe').value,
        brans: document.getElementById('ogr-brans').value,
        tel: document.getElementById('ogr-tel').value,
        program: id ? (ogretmenler.find(o => o.id === id)?.program || {}) : {} // Mevcut programı koru
    };

    if(id) {
        ogretmenler = ogretmenler.map(o => o.id === id ? yeniOgr : o);
    } else {
        ogretmenler.push(yeniOgr);
    }
    
    dbMock.set('ogretmenler', ogretmenler);
    renderOgretmenler();
    closeModal('ogretmen-modal');
    document.getElementById('ogretmen-form').reset();
    document.getElementById('ogretmen-id').value = '';
}

function renderOgretmenler() {
    const tbody = document.getElementById('ogretmen-liste-body');
    if(!tbody) return;
    tbody.innerHTML = ogretmenler.length === 0 ? `<tr><td colspan="6" class="text-center">Kayıtlı öğretmen bulunamadı.</td></tr>` : '';
    
    ogretmenler.forEach(o => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        // Satıra tıklayınca detay paneli açılacak (İstek üzerine butonlar izole edildi)
        tr.addEventListener('click', (e) => {
            if(!e.target.closest('.action-buttons')) openOgretmenDetay(o.id);
        });

        tr.innerHTML = `
            <td><strong>${o.ad}</strong></td>
            <td><span class="badge status-box">${o.unvan}</span></td>
            <td>${o.derece} / ${o.kademe}</td>
            <td>${o.brans}</td>
            <td>${o.tel}</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="editOgretmen('${o.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteOgretmen('${o.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editOgretmen(id) {
    const o = ogretmenler.find(ogr => ogr.id === id);
    if(!o) return;
    document.getElementById('ogretmen-id').value = o.id;
    document.getElementById('ogr-ad').value = o.ad;
    document.getElementById('ogr-unvan').value = o.unvan;
    document.getElementById('ogr-derece').value = o.derece;
    document.getElementById('ogr-kademe').value = o.kademe;
    document.getElementById('ogr-brans').value = o.brans;
    document.getElementById('ogr-tel').value = o.tel;
    document.getElementById('ogretmen-modal-title').textContent = "Öğretmen Bilgilerini Güncelle";
    openModal('ogretmen-modal');
}

function deleteOgretmen(id) {
    if(confirm("Bu öğretmeni ve tüm ilişkili verilerini silmek istediğinize emin misiniz?")) {
        ogretmenler = ogretmenler.filter(o => o.id !== id);
        dbMock.set('ogretmenler', ogretmenler);
        renderOgretmenler();
    }
}

// GELİŞMİŞ ÖĞRETMEN DETAY PANELİ MOTORU (TÜM VERİLERİ AGREGASYON EDER)
function openOgretmenDetay(id) {
    const o = ogretmenler.find(ogr => ogr.id === id);
    if(!o) return;

    document.getElementById('detay-ogr-ad').textContent = o.ad;
    document.getElementById('detay-ogr-altbilgi').textContent = `${o.unvan} — Derece Kademe: ${o.derece}/${o.kademe}`;
    document.getElementById('detay-brans').textContent = o.brans;
    document.getElementById('detay-tel').textContent = o.tel;

    // Çizelgeler ve Kulüplerden tarama yap (cizelgeler.js verisinden)
    const cizelgeVerileri = dbMock.get('cizelgeler_veri', {});
    let katildigiKulup = "Atanmamış";
    let sokDurum = "Yok", zumreDurum = "Yok", maarifDurum = "İşlem Yapılmadı";

    Object.keys(cizelgeVerileri).forEach(kulupAdi => {
        if(cizelgeVerileri[kulupAdi][o.id]) {
            const v = cizelgeVerileri[kulupAdi][o.id];
            if(v.kulup) katildigiKulup = kulupAdi;
            if(v.sok) sokDurum = "Üye / Katılımcı";
            if(v.zumre) zumreDurum = "Zümre Başkanı / Üyesi";
            if(v.maarif) maarifDurum = "Tamamlandı";
        }
    });

    document.getElementById('detay-kulup').textContent = katildigiKulup;
    document.getElementById('detay-sok').textContent = sokDurum;
    document.getElementById('detay-zumre').textContent = zumreDurum;
    document.getElementById('detay-maarif').textContent = maarifDurum;

    // 7 Ders Saati Programını Yazdır
    const gunler = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
    const tbody = document.getElementById('detay-ders-program-body');
    tbody.innerHTML = '';
    
    gunler.forEach(gun => {
        let tr = document.createElement('tr');
        let tdGun = `<td><strong>${gun}</strong></td>`;
        let tdDersler = '';
        
        for(let h=1; h<=7; h++) {
            if(h === 5 && document.getElementById('ayarlar-ogle-arasi-sonrasi').value == 4) {
                tdDersler += `<td style="background:#fffadb; font-weight:bold; font-size:11px;">ÖĞLE ARASI</td>`;
            }
            const dersHücre = o.program?.[gun]?.[h] || '-';
            tdDersler += `<td>${dersHücre}</td>`;
        }
        tr.innerHTML = tdGun + tdDersler;
        tbody.appendChild(tr);
    });

    openModal('ogretmen-detay-modal');
}

function switchModalTab(tabId) {
    document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.modal-tab-panel').forEach(p => p.classList.remove('active'));
    
    event.currentTarget.classList.add('active');
    document.getElementById(`${tabId}-content`).classList.add('active');
}

// DERS SAATLERİ AYARLARI KONTROLLERİ
function initDersSaatleriAyarlari() {
    const tbody = document.getElementById('ders-saatleri-inputs-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    dersSaatleri.forEach(d => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${d.no}. Ders Saati</strong></td>
                <td><input type="time" id="ders-basla-${d.no}" value="${d.basla}" class="form-control"></td>
                <td><input type="time" id="ders-bitis-${d.no}" value="${d.bitis}" class="form-control"></td>
            </tr>
        `;
    });
}

function saveDersSaatleri() {
    for(let h=1; h<=7; h++) {
        dersSaatleri[h-1].basla = document.getElementById(`ders-basla-${h}`).value;
        dersSaatleri[h-1].bitis = document.getElementById(`ders-bitis-${h}`).value;
    }
    dbMock.set('ders_saatleri', dersSaatleri);
    alert("7 Ders saati ve zil takvimi başarıyla güncellendi.");
    runLiveDashboard();
}

// DASHBOARD EK BİLEŞENLERİ VERİ İŞLEME
function renderDashboardDersMatrisi(aktifDersNo) {
    const tbody = document.getElementById('dash-aktif-dersler-tablo').getElementsByTagName('tbody')[0];
    if(aktifDersNo === -1) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--text-muted)">Şu an aktif bir ders saati içinde değiliz.</td></tr>`;
        return;
    }
    
    const bugunGun = new Date().toLocaleDateString('tr-TR', { weekday: 'long' });
    let veriVar = false;
    tbody.innerHTML = '';

    ogretmenler.forEach(o => {
        const dersAktivite = o.program?.[bugunGun]?.[aktifDersNo];
        if(dersAktivite && dersAktivite !== '-') {
            veriVar = true;
            tbody.innerHTML += `<tr><td><strong>${dersAktivite}</strong></td><td>Müfredat Dersi</td><td>${o.ad}</td></tr>`;
        }
    });

    if(!veriVar) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--text-muted)">Bu ders saatine ait ders programı verisi bulunamadı.</td></tr>`;
    }
}

function renderDashboardOzetler() {
    // Son notları listele
    const notesDest = document.getElementById('dash-son-notlar');
    if(notesDest) {
        notesDest.innerHTML = notlar.length === 0 ? '<p style="font-size:13px; color:var(--text-muted)">Not bulunmuyor.</p>' : '';
        notlar.slice(-2).reverse().forEach(n => {
            notesDest.innerHTML += `
                <div class="card" style="background:var(--logo-krem); margin:0; padding:12px; border-left:4px solid var(--logo-altin)">
                    <h5 style="color:var(--logo-koyu-yesil)">${n.baslik}</h5>
                    <p style="font-size:12px; margin-top:4px;">${n.icerik.substring(0,60)}...</p>
                </div>`;
        });
    }

    // Kritik görevleri ve yaklaşan periyodik işleri listele
    const taskDest = document.getElementById('dash-kritik-isler');
    if(taskDest) {
        taskDest.innerHTML = '';
        let sayac = 0;
        gorevler.filter(g => g.durum !== 'Tamamlandı').slice(0,2).forEach(g => {
            sayac++;
            taskDest.innerHTML += `<li><i class="fa-solid fa-triangle-exclamation" style="color:red"></i> <strong>${g.baslik}</strong> (Son: ${g.tarih})</li>`;
        });
        periyodikIsler.filter(p => !p.tamamlandi).slice(0,2).forEach(p => {
            sayac++;
            taskDest.innerHTML += `<li><i class="fa-solid fa-clock-rotate-left" style="color:orange"></i> Periyodik: <strong>${p.ad}</strong> (Bitiş: ${p.bitis})</li>`;
        });
        if(sayac === 0) taskDest.innerHTML = '<li style="color:var(--text-muted)">Bekleyen acil idari süreç bulunmuyor.</li>';
    }
}

// NOTLAR VE KANBAN GÖREV SİSTEMİ
function saveNot(e) {
    e.preventDefault();
    notlar.push({
        id: 'not_' + Date.now(),
        baslik: document.getElementById('not-baslik').value,
        icerik: document.getElementById('not-icerik').value
    });
    dbMock.set('notlar', notlar);
    renderNotlar();
    document.getElementById('not-form').reset();
    runLiveDashboard();
}

function renderNotlar() {
    const dest = document.getElementById('notlar-liste-hedef');
    if(!dest) return;
    dest.innerHTML = '';
    notlar.slice().reverse().forEach(n => {
        dest.innerHTML += `
            <div class="card" style="padding:12px; margin-bottom:10px; background:#fafafa; border:1px solid #ddd;">
                <div style="display:flex; justify-content:between; align-items:center">
                    <strong style="color:var(--logo-koyu-yesil)">${n.baslik}</strong>
                    <i class="fa-solid fa-trash" style="cursor:pointer; color:red; font-size:12px;" onclick="deleteNot('${n.id}')"></i>
                </div>
                <p style="font-size:13px; margin-top:5px; color:#444">${n.icerik}</p>
            </div>`;
    });
}

function deleteNot(id) {
    notlar = notlar.filter(n => n.id !== id);
    dbMock.set('notlar', notlar);
    renderNotlar();
    runLiveDashboard();
}

// GÖREVLER (KANBAN) MOTORU
function saveGorev(e) {
    e.preventDefault();
    gorevler.push({
        id: 'task_' + Date.now(),
        baslik: document.getElementById('gor-baslik').value,
        oncelik: document.getElementById('gor-oncelik').value,
        tarih: document.getElementById('gor-tarih').value,
        durum: 'Bekliyor'
    });
    dbMock.set('gorevler', gorevler);
    renderGorevler();
    closeModal('gorev-modal');
    document.getElementById('gorev-form').reset();
    runLiveDashboard();
}

function renderGorevler() {
    const cols = { 'Bekliyor': 'kanban-bekliyor', 'İşlemde': 'kanban-islemde', 'Tamamlandı': 'kanban-tamamlandi' };
    Object.keys(cols).forEach(k => {
        const el = document.getElementById(cols[k]);
        if(el) el.innerHTML = '';
    });

    gorevler.forEach(g => {
        const dest = document.getElementById(cols[g.durum]);
        if(!dest) return;
        
        let oncelikRenk = g.oncelik === 'Yüksek' ? 'red' : (g.oncelik === 'Orta' ? 'orange' : 'green');
        dest.innerHTML += `
            <div class="card" style="padding:12px; margin-bottom:10px; border-top: 3px solid ${oncelikRenk}">
                <h5 style="margin-bottom:5px;">${g.baslik}</h5>
                <p style="font-size:11px; color:var(--text-muted)">Son Tarih: ${g.tarih}</p>
                <div style="margin-top:8px; display:flex; justify-content:space-between;">
                    <select onchange="moveGorev('${g.id}', this.value)" style="font-size:11px; padding:2px;">
                        <option value="Bekliyor" ${g.durum==='Bekliyor'?'selected':''}>Bekliyor</option>
                        <option value="İşlemde" ${g.durum==='İşlemde'?'selected':''}>İşlemde</option>
                        <option value="Tamamlandı" ${g.durum==='Tamamlandı'?'selected':''}>Tamamlandı</option>
                    </select>
                    <i class="fa-solid fa-trash-can" style="color:red; cursor:pointer; font-size:12px;" onclick="deleteGorev('${g.id}')"></i>
                </div>
            </div>`;
    });
}

function moveGorev(id, yeniDurum) {
    gorevler = gorevler.map(g => g.id === id ? {...g, durum: yeniDurum} : g);
    dbMock.set('gorevler', gorevler);
    renderGorevler();
    runLiveDashboard();
}

function deleteGorev(id) {
    gorevler = gorevler.filter(g => g.id !== id);
    dbMock.set('gorevler', gorevler);
    renderGorevler();
    runLiveDashboard();
}

// PERİYODİK İDARİ İŞLER MOTORU
function savePeriyodikIs(e) {
    e.preventDefault();
    periyodikIsler.push({
        id: 'peri_' + Date.now(),
        ad: document.getElementById('peri-ad').value,
        baslangic: document.getElementById('peri-baslangic').value,
        bitis: document.getElementById('peri-bitis').value,
        not: document.getElementById('peri-not').value,
        tamamlandi: false
    });
    dbMock.set('periyodik_isler', periyodikIsler);
    renderPeriyodikIsler();
    closeModal('periyodik-modal');
    document.getElementById('periyodik-form').reset();
    runLiveDashboard();
}

function renderPeriyodikIsler() {
    const container = document.getElementById('periyodik-liste-container');
    if(!container) return;
    container.innerHTML = '';

    // Aylara Göre Gruplama İşlemi
    const gruplar = {};
    periyodikIsler.forEach(is => {
        const bTarih = new Date(is.bitis);
        const ayYil = bTarih.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
        if(!gruplar[ayYil]) gruplar[ayYil] = [];
        gruplar[ayYil].push(is);
    });

    if(periyodikIsler.length === 0) {
        container.innerHTML = '<div class="card text-center" style="color:var(--text-muted)">Henüz periyodik idari iş tanımlanmamış.</div>';
        return;
    }

    Object.keys(gruplar).forEach(ay => {
        let ayBlok = document.createElement('div');
        ayBlok.className = 'periyodik-ay-blok';
        ayBlok.innerHTML = `<div class="periyodik-ay-baslik">${ay} Hedefleri</div>`;
        
        gruplar[ay].forEach(is => {
            let kart = document.createElement('div');
            kart.className = `periyodik-is-kart ${is.tamamlandi ? 'tamamlandi' : ''}`;
            kart.innerHTML = `
                <div>
                    <strong>${is.ad}</strong>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:3px;">
                        <i class="fa-solid fa-calendar"></i> Süreç: ${is.baslangic} / ${is.bitis}
                    </div>
                    ${is.not ? `<p style="font-size:12px; color:#555; margin-top:5px; font-style:italic;">Not: ${is.not}</p>` : ''}
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <label style="font-size:12px; font-weight:600; display:flex; align-items:center; gap:5px; cursor:pointer;">
                        <input type="checkbox" ${is.tamamlandi ? 'checked' : ''} onchange="togglePeriyodikIs('${is.id}')"> Tamamlandı
                    </label>
                    <i class="fa-solid fa-trash" style="color:red; cursor:pointer; font-size:14px;" onclick="deletePeriyodikIs('${is.id}')"></i>
                </div>
            `;
            ayBlok.appendChild(kart);
        });
        container.appendChild(ayBlok);
    });
}

function togglePeriyodikIs(id) {
    periyodikIsler = periyodikIsler.map(p => p.id === id ? {...p, tamamlandi: !p.tamamlandi} : p);
    dbMock.set('periyodik_isler', periyodikIsler);
    renderPeriyodikIsler();
    runLiveDashboard();
}

function deletePeriyodikIs(id) {
    if(confirm("Bu periyodik iş kaydını silmek istiyor musunuz?")) {
        periyodikIsler = periyodikIsler.filter(p => p.id !== id);
        dbMock.set('periyodik_isler', periyodikIsler);
        renderPeriyodikIsler();
        runLiveDashboard();
    }
}
