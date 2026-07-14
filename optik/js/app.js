// js/app.js

import { startCamera, capturePhoto, stopCamera } from './camera.js';
import { baglaGaleriSecici } from './galeriSecici.js';
import { formuOkuVeGoster, formuOkuElleKoseliVeGoster } from './formOkuyucu.js';

// ─── Sabit form şablonları (layoutEngine'deki türlere karşılık gelir) ───
const BUILTIN_SABLONLAR = [
    { id: 'lgs',       ad: 'LGS',              soruSayisi: 90, sikSayisi: 4, tip: 'KULLANICI' },
    { id: 'bursluluk', ad: 'Bursluluk Sınavı', soruSayisi: 80, sikSayisi: 4, tip: 'KULLANICI' },
];
const KULLANICI_SABLON_KEY = 'oy_optik_sablonlar';

function _kullaniciSablonlariniOku() {
    try { return JSON.parse(localStorage.getItem(KULLANICI_SABLON_KEY) || '[]'); } catch(e) { return []; }
}
function _tumSablonlar() {
    return [...BUILTIN_SABLONLAR, ..._kullaniciSablonlariniOku()];
}

// ─── Seçili optik form (Yeni Sınav modalı için) ───
let _secilenOptikForm = null;

// ─── Aktif ana sekme ───
let _aktifNav = 'sinavlar';

// ─── Tarama sonucu → oturuma ekle ───
window.addEventListener('omrSonucHazir', function(e) {
    const sonuc = e.detail;
    if (sonuc && sonuc.basarili && window.TopluTarama) window.TopluTarama.ekle(sonuc);
});

window.addEventListener('topluTaramaGuncellendi', function(e) {
    _taramaListesiniYenile(e.detail);
    _sinavListesiniCiz(); // durum güncellenebilir
});

window.addEventListener('topluTaramaDepoHatasi', function() {
    alert('⚠️ Depolama alanı doldu.\nEski sınavlardan bazılarını silip yer açın.');
});

// ════════════════════════════════════════════════════════════════
// BAŞLAT
// ════════════════════════════════════════════════════════════════
function baslat() {
    _kamerayiBaglat();
    _anaNavBaglantilari();
    _sinavListesiniCiz();
    _optikFormListesiniCiz();
    _ogrenciListesiniCiz();
    _yeniSinavModalBaglantilari();
    _optikFormModalBaglantilari();
    _cevapAnahtariBaglantilari();
    _topluTaramaBaglantilari();
    _ogrenciAtaBaglantilari();
    _sinavDetayBaglantilari();
    _manuelGirisBaglantilari();

    // Sayfa yüklenince aktif oturumu ekrana yansıt
    if (window.TopluTarama && window.TopluTarama.aktifSinavBilgisi()) {
        const sonuclar = window.TopluTarama.sonuclar();
        if (sonuclar.length) {
            _raporPanelleriniGoster();
            _taramaListesiniYenile({ sonuclar, ozet: window.TopluTarama.ozet() });
        }
    }
    _anahtarDurumGuncelle();
}

// ════════════════════════════════════════════════════════════════
// KAMERA
// ════════════════════════════════════════════════════════════════
function _kamerayiBaglat() {
    const startBtn   = document.getElementById('start');
    const captureBtn = document.getElementById('capture');
    const stopBtn    = document.getElementById('stop');
    const statusText = document.getElementById('statusText');

    if (!startBtn || !captureBtn || !stopBtn) return;

    startBtn.addEventListener('click', async () => {
        try { statusText.textContent = 'Kamera açılıyor...'; await startCamera(); statusText.textContent = 'Kamera hazır'; }
        catch (e) { statusText.textContent = 'Kamera açılamadı'; }
    });
    captureBtn.addEventListener('click', async () => {
        try { statusText.textContent = 'Fotoğraf işleniyor...'; await capturePhoto(); }
        catch (e) { statusText.textContent = 'Fotoğraf çekilemedi'; }
    });
    stopBtn.addEventListener('click', () => {
        try { stopCamera(); statusText.textContent = 'Kamera kapatıldı'; }
        catch (e) { /* sessiz */ }
    });

    baglaGaleriSecici('galeriInput', 'canvas');
}

// ════════════════════════════════════════════════════════════════
// ANA NAVİGASYON (Sınavlar / Öğrenciler / Optikler)
// ════════════════════════════════════════════════════════════════
function _anaNavBaglantilari() {
    const navBtnler = document.querySelectorAll('.nav-btn[data-nav]');
    navBtnler.forEach(btn => {
        btn.addEventListener('click', () => _anaNavGec(btn.dataset.nav));
    });

    // Sınav detayından geri dön
    const geriBtn = document.getElementById('geriBtn');
    if (geriBtn) geriBtn.addEventListener('click', _sinavDetayKapat);
}

function _anaNavGec(nav) {
    _aktifNav = nav;

    // Başlık
    const basliklar = { sinavlar: 'Sınavlar', ogrenciler: 'Öğrenciler', optikler: 'Optik Formlar' };
    const hBaslik = document.getElementById('headerBaslik');
    if (hBaslik) hBaslik.textContent = basliklar[nav] || nav;

    // Nav buton aktif
    document.querySelectorAll('.nav-btn[data-nav]').forEach(b =>
        b.classList.toggle('aktif', b.dataset.nav === nav)
    );

    // Panel göster
    ['panelSinavlar','panelOgrenciler','panelOptikler'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('aktif', id === 'panel' + _navKimlik(nav));
    });

    // FABlar
    document.getElementById('fabYeniSinav').style.display  = nav === 'sinavlar'  ? 'flex' : 'none';
    document.getElementById('fabOptikForm').style.display  = nav === 'optikler'  ? 'flex' : 'none';
    document.getElementById('fabTara').style.display       = 'none';
}

function _navKimlik(nav) {
    return { sinavlar: 'Sinavlar', ogrenciler: 'Ogrenciler', optikler: 'Optikler' }[nav] || nav;
}

// ════════════════════════════════════════════════════════════════
// SINAV DETAY EKRANI
// ════════════════════════════════════════════════════════════════
function _sinavDetayAc(sinav) {
    // Aktif sınav olarak yükle
    window.TopluTarama.sinaviYukle(sinav.id);

    // sinavTuru hidden input'u güncelle (cevap anahtarı için)
    const st = document.getElementById('sinavTuru');
    if (st) {
        st.value = sinav.optikFormId || 'lgs';
        st.dispatchEvent(new Event('change'));
    }
    const ss = document.getElementById('soruSayisi');
    if (ss && sinav.soruSayisi) ss.value = sinav.soruSayisi;

    // Başlık
    const baslik = document.getElementById('sinavDetayBaslik');
    if (baslik) baslik.textContent = sinav.sinavAdi;

    // Ekran geçişi
    document.getElementById('ekranAna').style.display       = 'none';
    document.getElementById('ekranSinavDetay').style.display = 'flex';

    // FAB
    document.getElementById('fabYeniSinav').style.display = 'none';
    document.getElementById('fabOptikForm').style.display = 'none';
    document.getElementById('fabTara').style.display      = 'flex';

    // Raporlar panelini doldur
    const sonuclar = window.TopluTarama.sonuclar();
    if (sonuclar.length) {
        _raporPanelleriniGoster();
        _taramaListesiniYenile({ sonuclar, ozet: window.TopluTarama.ozet() });
    } else {
        _raporPanelleriniGizle();
    }

    _anahtarDurumGuncelle();
    _dersSeciciYenile();
}

function _sinavDetayKapat() {
    document.getElementById('ekranSinavDetay').style.display = 'none';
    document.getElementById('ekranAna').style.display        = 'flex';
    _anaNavGec(_aktifNav);
    _sinavListesiniCiz(); // liste yenilensin
}

// ════════════════════════════════════════════════════════════════
// SINAV LİSTESİ
// ════════════════════════════════════════════════════════════════
let _sinavFiltre = 'tumu';

function _sinavListesiniCiz() {
    const alan = document.getElementById('sinavListesi');
    if (!alan) return;

    const liste = window.TopluTarama.sinavlariListele();

    // Sayaçları güncelle
    const tumu    = liste.length;
    const okundu  = liste.filter(s => s.durum === 'okundu').length;
    const bekliyor= liste.filter(s => s.durum === 'bekliyor').length;
    _setText('sayTumu',    tumu);
    _setText('sayOkundu',  okundu);
    _setText('sayBekliyor',bekliyor);

    // Filtre uygula
    const filtreli = _sinavFiltre === 'tumu' ? liste :
                     liste.filter(s => s.durum === _sinavFiltre);

    if (!filtreli.length) {
        alan.innerHTML = `<div class="liste-bos-alan">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity=".3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p>${_sinavFiltre === 'tumu' ? 'Henüz sınav yok.' : 'Bu filtrede sınav yok.'}</p>
        </div>`;
        return;
    }

    alan.innerHTML = filtreli.map(s => {
        const tarihStr = s.tarih ? new Date(s.tarih).toLocaleDateString('tr-TR') : '';
        const durumEtiket = s.durum === 'okundu'
            ? `<span class="durum-badge durum-okundu">OKUNDU (${s.ogrenciSayisi})</span>`
            : `<span class="durum-badge durum-bekliyor">BEKLİYOR</span>`;
        const ikonRenk = s.durum === 'okundu' ? 'sinav-ikon-yesil' : 'sinav-ikon-turuncu';
        return `<div class="sinav-kart" data-id="${s.id}">
            <div class="sinav-ikon-wrap ${ikonRenk}">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div class="sinav-kart-bilgi">
                <strong class="sinav-kart-ad">${_html(s.sinavAdi)}</strong>
                <small class="sinav-kart-alt">${tarihStr}</small>
            </div>
            ${durumEtiket}
            <button class="sinav-menu-btn" data-id="${s.id}" title="Seçenekler">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
            </button>
        </div>`;
    }).join('');

    // Tıklama: sınav detayına git
    alan.querySelectorAll('.sinav-kart').forEach(kart => {
        kart.addEventListener('click', function(e) {
            if (e.target.closest('.sinav-menu-btn')) return;
            const id = kart.dataset.id;
            const sinav = liste.find(s => s.id === id);
            if (sinav) _sinavDetayAc(sinav);
        });
    });

    // 3 nokta menüsü → silme
    alan.querySelectorAll('.sinav-menu-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = btn.dataset.id;
            const sinav = liste.find(s => s.id === id);
            if (!sinav) return;
            if (confirm(`"${sinav.sinavAdi}" sınavını ve tüm tarama kayıtlarını sil?`)) {
                window.TopluTarama.sinaviSil(id);
                _sinavListesiniCiz();
            }
        });
    });

    // Filtre chip'leri
    document.querySelectorAll('.chip[data-filtre]').forEach(chip => {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.chip[data-filtre]').forEach(c => c.classList.remove('aktif'));
            chip.classList.add('aktif');
            _sinavFiltre = chip.dataset.filtre;
            _sinavListesiniCiz();
        });
    });
}

// ════════════════════════════════════════════════════════════════
// OPTİK FORM LİSTESİ
// ════════════════════════════════════════════════════════════════
function _optikFormListesiniCiz() {
    const alan = document.getElementById('optikFormListesi');
    if (!alan) return;

    const sablonlar = _tumSablonlar();
    _setText('optikSayTumu', sablonlar.length);
    _setText('optikSayKullanici', sablonlar.filter(s => s.tip === 'KULLANICI').length);
    _setText('optikSayStandart', sablonlar.filter(s => s.tip !== 'KULLANICI').length);

    if (!sablonlar.length) { alan.innerHTML = '<p class="liste-bos">Henüz optik form şablonu yok.</p>'; return; }

    alan.innerHTML = sablonlar.map(s => `
        <div class="sinav-kart" data-sid="${s.id}">
            <div class="sinav-ikon-wrap sinav-ikon-mavi">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div class="sinav-kart-bilgi">
                <strong class="sinav-kart-ad">${_html(s.ad)}</strong>
                <small class="sinav-kart-alt">${s.soruSayisi} Soru</small>
            </div>
            <span class="durum-badge durum-kullanici">${s.tip}</span>
            <button class="sinav-menu-btn" data-sid="${s.id}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
            </button>
        </div>`).join('');

    // Tıkla → PDF oluştur modalını aç, bu şablonu seç
    alan.querySelectorAll('.sinav-kart').forEach(kart => {
        kart.addEventListener('click', function(e) {
            if (e.target.closest('.sinav-menu-btn')) return;
            const sid = kart.dataset.sid;
            const sablon = sablonlar.find(s => s.id === sid);
            if (sablon) _optikFormModalAc(sablon);
        });
    });
}

// ════════════════════════════════════════════════════════════════
// ÖĞRENCİ LİSTESİ
// ════════════════════════════════════════════════════════════════
let _ogrenciTumListe = [];
let _aktifSinifFiltre = '';

function _veriKaynagi() {
    try {
        if (window.parent && window.parent !== window && window.parent.OptikVeriKaynagi)
            return window.parent.OptikVeriKaynagi;
    } catch(e) {}
    return null;
}

function _ogrenciListesiniCiz() {
    const alan = document.getElementById('ogrenciListesi');
    const chipKap = document.getElementById('sinifChipleri');
    if (!alan) return;

    const kaynak = _veriKaynagi();
    if (!kaynak) {
        alan.innerHTML = '<div class="liste-bos-alan"><p>Bu özellik, uygulama içinden açıldığında kullanılabilir.</p></div>';
        return;
    }

    const siniflar = kaynak.siniflarGetir();

    // Chip'leri oluştur
    if (chipKap) {
        const chipScroll = chipKap.querySelector('.chip-scroll') || chipKap;
        chipScroll.innerHTML = `<button class="chip ${_aktifSinifFiltre===''?'aktif':''}" data-sinif="">Tümü</button>` +
            siniflar.map(s => `<button class="chip ${_aktifSinifFiltre===s.id?'aktif':''}" data-sinif="${s.id}">${s.ad}</button>`).join('');
        chipScroll.querySelectorAll('.chip').forEach(c => {
            c.addEventListener('click', () => {
                _aktifSinifFiltre = c.dataset.sinif;
                chipScroll.querySelectorAll('.chip').forEach(x => x.classList.toggle('aktif', x.dataset.sinif === _aktifSinifFiltre));
                _filtreliOgrencileriCiz();
            });
        });
    }

    // Tüm öğrencileri yükle
    _ogrenciTumListe = [];
    siniflar.forEach(s => {
        const ogrenciler = kaynak.ogrencilerGetir(s.id);
        ogrenciler.forEach(o => { o._sinifAdi = s.ad; o._sinifId = s.id; _ogrenciTumListe.push(o); });
    });

    // Arama
    const aramaEl = document.getElementById('ogrenciArama');
    if (aramaEl) {
        aramaEl.addEventListener('input', _filtreliOgrencileriCiz);
    }

    _filtreliOgrencileriCiz();
}

function _filtreliOgrencileriCiz() {
    const alan = document.getElementById('ogrenciListesi');
    if (!alan) return;
    const aramaEl = document.getElementById('ogrenciArama');
    const aramaMetni = aramaEl ? aramaEl.value.trim().toLocaleLowerCase('tr') : '';

    let liste = _ogrenciTumListe;
    if (_aktifSinifFiltre) liste = liste.filter(o => o._sinifId === _aktifSinifFiltre);
    if (aramaMetni) liste = liste.filter(o =>
        (o.adSoyad||'').toLocaleLowerCase('tr').includes(aramaMetni) ||
        (o.ogrenciNo||'').includes(aramaMetni) ||
        (o._sinifAdi||'').toLocaleLowerCase('tr').includes(aramaMetni)
    );

    if (!liste.length) {
        alan.innerHTML = '<div class="liste-bos-alan"><p>Öğrenci bulunamadı.</p></div>';
        return;
    }

    alan.innerHTML = liste.map((o, i) => {
        const renkler = ['#2196F3','#4CAF50','#FF9800','#9C27B0','#F44336','#009688'];
        const renk = renkler[i % renkler.length];
        const harf = (o.adSoyad||'?')[0].toUpperCase();
        const fotoHtml = o.fotoUrl
            ? `<img class="ogr-avatar" src="${o.fotoUrl}" alt="${_html(o.adSoyad)}">`
            : `<div class="ogr-avatar ogr-avatar-harf" style="background:${renk};">${harf}</div>`;
        return `<div class="ogr-satir">
            ${fotoHtml}
            <div class="ogr-bilgi">
                <strong>${_html(o.adSoyad)}</strong>
                <small>${_html(o._sinifAdi)} &bull; ${o.ogrenciNo||'—'}</small>
            </div>
            <button class="sinav-menu-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
            </button>
        </div>`;
    }).join('');
}

// ════════════════════════════════════════════════════════════════
// YENİ SINAV MODALI
// ════════════════════════════════════════════════════════════════
function _yeniSinavModalBaglantilari() {
    const modal    = document.getElementById('yeniSinavModal');
    const kapatBtn = document.getElementById('ysMoKapat');
    const kaydetBtn= document.getElementById('ysMoKaydet');
    const fabBtn   = document.getElementById('fabYeniSinav');
    const formSecEl= document.getElementById('ysOptikFormSec');

    // Bugünün tarihi
    const tarihEl = document.getElementById('ysTarih');
    if (tarihEl) tarihEl.value = new Date().toISOString().split('T')[0];

    function _ac() {
        _secilenOptikForm = null;
        const metinEl = document.getElementById('ysOptikFormMetin');
        if (metinEl) { metinEl.textContent = 'Optik Form Seçin'; metinEl.classList.add('mo-yer-tutucu'); }
        const adEl = document.getElementById('ysSinavAd');
        if (adEl) adEl.value = '';
        if (modal) modal.classList.add('acik');
    }
    function _kapat() { if (modal) modal.classList.remove('acik'); }

    if (fabBtn)   fabBtn.addEventListener('click', _ac);
    if (kapatBtn) kapatBtn.addEventListener('click', _kapat);
    if (modal)    modal.addEventListener('click', e => { if (e.target === modal) _kapat(); });

    // Optik form seçici → Optikler listesini bottom sheet olarak göster
    if (formSecEl) {
        formSecEl.addEventListener('click', () => _optikFormSeciciAc());
    }

    if (kaydetBtn) {
        kaydetBtn.addEventListener('click', () => {
            const ad = (document.getElementById('ysSinavAd')?.value || '').trim();
            if (!ad) { alert('Sınav adı zorunlu!'); return; }
            if (!_secilenOptikForm) { alert('Optik form seçin!'); return; }

            const tarih  = document.getElementById('ysTarih')?.value || new Date().toISOString().split('T')[0];
            const yanlis = document.getElementById('ysYanlisHesap')?.value || 'oldugugibi';
            const klasor = document.getElementById('ysKlasor')?.value?.trim() || '';

            window.TopluTarama.baslat({
                sinavAdi:       ad,
                optikFormId:    _secilenOptikForm.id,
                optikFormAd:    _secilenOptikForm.ad,
                soruSayisi:     _secilenOptikForm.soruSayisi,
                sikSayisi:      _secilenOptikForm.sikSayisi || 4,
                yanlisHesaplama:yanlis,
                klasor,
                tarih
            });

            _kapat();
            _sinavListesiniCiz();

            // Yeni oluşturulan sınavı hemen aç
            const yeniListe = window.TopluTarama.sinavlariListele();
            if (yeniListe.length) _sinavDetayAc(yeniListe[0]);
        });
    }
}

// Optik form seçim bottom sheet (basit modal içi liste)
function _optikFormSeciciAc() {
    const sablonlar = _tumSablonlar();
    const secici = document.createElement('div');
    secici.className = 'form-secici-overlay';
    secici.innerHTML = `<div class="form-secici-panel">
        <div class="form-secici-baslik">
            <strong>Optik Form Seçin</strong>
            <button class="kamera-kapat-btn" id="formSecKapatBtn">✕</button>
        </div>
        <div class="form-secici-liste">
            ${sablonlar.map(s => `<button class="form-secici-satir" data-id="${s.id}">
                <div class="sinav-ikon-wrap sinav-ikon-mavi" style="width:36px;height:36px;min-width:36px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div style="flex:1;text-align:left;">
                    <div style="font-weight:600;">${_html(s.ad)}</div>
                    <small style="color:var(--text-faint);">${s.soruSayisi} Soru</small>
                </div>
                <span class="durum-badge durum-kullanici">${s.tip}</span>
            </button>`).join('')}
        </div>
    </div>`;
    document.body.appendChild(secici);
    setTimeout(() => secici.classList.add('acik'), 10);

    function _kapat() { secici.classList.remove('acik'); setTimeout(() => secici.remove(), 300); }
    secici.querySelector('#formSecKapatBtn').addEventListener('click', _kapat);
    secici.addEventListener('click', e => { if (e.target === secici) _kapat(); });

    secici.querySelectorAll('.form-secici-satir').forEach(btn => {
        btn.addEventListener('click', () => {
            const sablon = sablonlar.find(s => s.id === btn.dataset.id);
            if (!sablon) return;
            _secilenOptikForm = sablon;
            const metinEl = document.getElementById('ysOptikFormMetin');
            if (metinEl) { metinEl.textContent = sablon.ad + ' (' + sablon.soruSayisi + ' Soru)'; metinEl.classList.remove('mo-yer-tutucu'); }
            _kapat();
        });
    });
}

// ════════════════════════════════════════════════════════════════
// OPTİK FORM MODALI (PDF üretimi)
// ════════════════════════════════════════════════════════════════
function _optikFormModalBaglantilari() {
    const modal    = document.getElementById('optikFormModal');
    const kapatBtn = document.getElementById('optikMoKapat');
    const fabBtn   = document.getElementById('fabOptikForm');

    function _kapat() { if (modal) modal.classList.remove('acik'); }

    if (fabBtn)   fabBtn.addEventListener('click', () => { if (modal) modal.classList.add('acik'); });
    if (kapatBtn) kapatBtn.addEventListener('click', _kapat);
    if (modal)    modal.addEventListener('click', e => { if (e.target === modal) _kapat(); });
}

function _optikFormModalAc(sablon) {
    const modal = document.getElementById('optikFormModal');
    if (!modal) return;
    const st = document.getElementById('sinavTuru');
    if (st) { st.value = sablon.id; st.dispatchEvent(new Event('change')); }
    if (sablon.id === 'ozel' || !['lgs','bursluluk'].includes(sablon.id)) {
        const ss = document.getElementById('soruSayisi');
        const sk = document.getElementById('sikSayisi');
        if (ss) ss.value = sablon.soruSayisi || 20;
        if (sk) sk.value = sablon.sikSayisi  || 4;
        const oa = document.getElementById('ozelAlanlar');
        if (oa) oa.style.display = 'block';
    }
    modal.classList.add('acik');
}

// ════════════════════════════════════════════════════════════════
// CEVAP ANAHTARI
// ════════════════════════════════════════════════════════════════
let _mevcutDersler = [];

function _cevapAnahtariBaglantilari() {
    const excelInput = document.getElementById('anahtarExcelInput');
    if (excelInput) {
        excelInput.addEventListener('change', async function() {
            const file = this.files[0]; if (!file) return;
            try {
                _anahtarDurumYaz('Yükleniyor...','yukleniyor');
                await window.CevapAnahtari.exceldenYukle(file);
                _anahtarDurumGuncelle(); _seciliDersiYenidenCiz(); this.value='';
            } catch(e) { alert('Excel yükleme hatası: '+e.message); _anahtarDurumYaz('Yükleme başarısız','hata'); }
        });
    }
    const temizleBtn = document.getElementById('anahtarTemizleBtn');
    if (temizleBtn) {
        temizleBtn.addEventListener('click', () => {
            if (confirm('Cevap anahtarındaki TÜM işaretlemeler silinsin mi?')) {
                window.CevapAnahtari.temizle(); _anahtarDurumGuncelle(); _seciliDersiYenidenCiz();
            }
        });
    }
    const disaAktarBtn = document.getElementById('anahtarDisaAktarBtn');
    if (disaAktarBtn) {
        disaAktarBtn.addEventListener('click', async () => {
            try { disaAktarBtn.disabled=true; disaAktarBtn.textContent='Hazırlanıyor...'; await window.DisaAktar.cevapAnahtariniIndir(); }
            catch(e) { alert('Dışa aktarma hatası: '+e.message); }
            finally { disaAktarBtn.disabled=false; disaAktarBtn.textContent='⬇️ Dışa Aktar'; }
        });
    }
    const dersSecici = document.getElementById('manuelDersSecici');
    if (dersSecici) dersSecici.addEventListener('change', _seciliDersiYenidenCiz);

    ['sinavTuru','soruSayisi','sikSayisi'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.addEventListener('change', _dersSeciciYenile); el.addEventListener('input', _dersSeciciYenile); }
    });
    _dersSeciciYenile();
}

function _formunDersListesiniCikar() {
    try {
        const sinavTuru = (document.getElementById('sinavTuru')?.value) || 'lgs';
        const params = { sinavTuru };
        if (sinavTuru === 'ozel') {
            params.soruSayisi = parseInt(document.getElementById('soruSayisi')?.value||'20',10) || 20;
            params.sikSayisi  = parseInt(document.getElementById('sikSayisi')?.value||'4',10) || 4;
        }
        const layout = window.LayoutEngine.layoutHesapla(params);
        const form   = layout.formlar[0];
        if (form.bolumler) {
            const liste = [];
            form.bolumler.forEach(b => b.dersSutunlari.forEach(d => {
                liste.push({ dersAdi:d.dersAdi, soruSayisi:d.sorular.length, sikSayisi:d.sorular[0].sikler.length });
            }));
            return liste;
        } else if (form.izgara) {
            return [{ dersAdi:'Genel', soruSayisi:form.izgara.sorular.length, sikSayisi:form.izgara.sorular[0].sikler.length }];
        }
        return [];
    } catch(e) { return []; }
}

function _dersSeciciYenile() {
    _mevcutDersler = _formunDersListesiniCikar();
    const dersSecici = document.getElementById('manuelDersSecici');
    if (!dersSecici) return;
    if (!_mevcutDersler.length) { dersSecici.innerHTML='<option>(ders bulunamadı)</option>'; document.getElementById('manuelSorularAlani').innerHTML=''; return; }
    dersSecici.innerHTML = _mevcutDersler.map((d,i)=>`<option value="${i}">${d.dersAdi} (${d.soruSayisi} soru)</option>`).join('');
    dersSecici.selectedIndex=0; _seciliDersiYenidenCiz();
}

function _seciliDersiYenidenCiz() {
    const dersSecici=document.getElementById('manuelDersSecici');
    if (!dersSecici||!_mevcutDersler.length) return;
    const secim=_mevcutDersler[dersSecici.selectedIndex]||_mevcutDersler[0];
    _soruIzgarasiCiz(secim.dersAdi, secim.soruSayisi, secim.sikSayisi);
}

function _soruIzgarasiCiz(dersAdi, soruSayisi, sikSayisi) {
    const alan=document.getElementById('manuelSorularAlani');
    if (!alan) return;
    const mevcutAnahtar=window.CevapAnahtari.getir();
    const dersKaydi=mevcutAnahtar&&(mevcutAnahtar.dersler||[]).find(d=>d.dersAdi===dersAdi);
    const cevapMap={};
    if (dersKaydi) dersKaydi.anahtarlar.forEach(a=>{cevapMap[a.soruNo]=a.dogru;});
    const harfler=[]; for(let i=0;i<sikSayisi;i++) harfler.push(String.fromCharCode(65+i));
    alan.innerHTML='';
    for (let soruNo=1;soruNo<=soruSayisi;soruNo++) {
        const satir=document.createElement('div'); satir.className='manuel-satir';
        const no=document.createElement('span'); no.className='soru-no'; no.textContent=soruNo+')'; satir.appendChild(no);
        const sikGrubu=document.createElement('div'); sikGrubu.className='sik-grubu';
        harfler.forEach(harf=>{
            const btn=document.createElement('button'); btn.type='button'; btn.className='sik-daire'; btn.textContent=harf;
            if(cevapMap[soruNo]===harf) btn.classList.add('secili');
            btn.addEventListener('click',()=>{
                const yeni=!btn.classList.contains('secili');
                sikGrubu.querySelectorAll('.sik-daire').forEach(b=>b.classList.remove('secili'));
                if(yeni) btn.classList.add('secili');
                _cevabiKaydet(dersAdi, sikSayisi, soruNo, yeni?harf:null);
            });
            sikGrubu.appendChild(btn);
        });
        satir.appendChild(sikGrubu); alan.appendChild(satir);
    }
}

function _cevabiKaydet(dersAdi, sikSayisi, soruNo, dogruHarf) {
    const mevcut=window.CevapAnahtari.getir()||{dersler:[]};
    if(!mevcut.dersler) mevcut.dersler=[];
    let ders=mevcut.dersler.find(d=>d.dersAdi===dersAdi);
    if(!ders){ders={dersAdi,anahtarlar:[]};mevcut.dersler.push(ders);}
    ders.anahtarlar=(ders.anahtarlar||[]).filter(a=>a.soruNo!==soruNo);
    if(dogruHarf) ders.anahtarlar.push({soruNo,dogru:dogruHarf});
    ders.anahtarlar.sort((a,b)=>a.soruNo-b.soruNo);
    mevcut.sikSayisi=Math.max(mevcut.sikSayisi||4,sikSayisi);
    mevcut.guncellemeTarihi=new Date().toISOString();
    window.CevapAnahtari.kaydet(mevcut); _anahtarDurumGuncelle();
}

function _anahtarDurumGuncelle() {
    const anahtar=window.CevapAnahtari.getir();
    const disaBtn=document.getElementById('anahtarDisaAktarBtn');
    const temBtn=document.getElementById('anahtarTemizleBtn');
    if(!anahtar||(anahtar.dersler||[]).every(d=>(d.anahtarlar||[]).length===0)){
        _anahtarDurumYaz('Cevap anahtarı yüklenmedi','anahtar-yok');
        if(temBtn) temBtn.style.display='none';
        if(disaBtn) disaBtn.style.display='none';
        return;
    }
    const toplam=(anahtar.dersler||[]).reduce((t,d)=>t+(d.anahtarlar||[]).length,0);
    _anahtarDurumYaz(`✅ ${toplam} soru işaretlendi · ${(anahtar.dersler||[]).length} ders`,'anahtar-var');
    if(temBtn) temBtn.style.display='inline-flex';
    if(disaBtn) disaBtn.style.display='inline-flex';
}
function _anahtarDurumYaz(mesaj, sinif) {
    const el=document.getElementById('anahtarDurum');
    if(!el) return; el.textContent=mesaj; el.className='anahtar-durum '+sinif;
}

// ════════════════════════════════════════════════════════════════
// TOPLU TARAMA
// ════════════════════════════════════════════════════════════════
function _topluTaramaBaglantilari() {
    const sifirlaBtn=document.getElementById('oturumSifirlaBtn');
    if(sifirlaBtn){
        sifirlaBtn.addEventListener('click',()=>{
            if(confirm('Tüm tarama sonuçları silinsin mi?')) window.TopluTarama.temizle();
        });
    }
    const yenidenBtn=document.getElementById('yenidenHesaplaBtn');
    if(yenidenBtn){
        yenidenBtn.addEventListener('click',()=>{
            const sayi=(window.TopluTarama.sonuclar()||[]).length;
            if(!sayi){alert('Yeniden hesaplanacak sonuç yok.');return;}
            if(confirm(`${sayi} öğrencinin sonucu güncel anahtara göre yeniden hesaplansın mı?`))
                window.TopluTarama.yenidenHesapla();
        });
    }
    const pdfBtn=document.getElementById('pdfRaporBtn');
    if(pdfBtn){
        pdfBtn.addEventListener('click',async()=>{
            try{pdfBtn.disabled=true;pdfBtn.textContent='Oluşturuluyor...';
                await window.DisaAktar.pdfRaporuIndir(window.TopluTarama.sonuclar(),window.TopluTarama.ozet());
            }catch(e){alert('PDF hatası: '+e.message);}
            finally{pdfBtn.disabled=false;pdfBtn.textContent='📄 PDF Rapor';}
        });
    }
    const excelBtn=document.getElementById('excelRaporBtn');
    if(excelBtn){
        excelBtn.addEventListener('click',async()=>{
            try{excelBtn.disabled=true;excelBtn.textContent='Oluşturuluyor...';
                await window.DisaAktar.excelIndir(window.TopluTarama.sonuclar(),window.TopluTarama.ozet());
            }catch(e){alert('Excel hatası: '+e.message);}
            finally{excelBtn.disabled=false;excelBtn.textContent='📊 Excel İndir';}
        });
    }
}

function _raporPanelleriniGoster() {
    const ob=document.getElementById('oturumBilgi');
    const tl=document.getElementById('taramaSonucListesi');
    const ym=document.getElementById('taramaYokMesaji');
    if(ob) ob.style.display='flex';
    if(tl) tl.style.display='block';
    if(ym) ym.style.display='none';
}
function _raporPanelleriniGizle() {
    const ob=document.getElementById('oturumBilgi');
    const tl=document.getElementById('taramaSonucListesi');
    const da=document.getElementById('disaAktarPanel');
    const ym=document.getElementById('taramaYokMesaji');
    if(ob) ob.style.display='none';
    if(tl) tl.style.display='none';
    if(da) da.style.display='none';
    if(ym) ym.style.display='block';
}

// ════════════════════════════════════════════════════════════════
// ÖĞRENCİ ATAMA OVERLAY
// ════════════════════════════════════════════════════════════════
function _ogrenciAtaBaglantilari() {
    const overlay=document.getElementById('ogrenciAtaOverlay');
    const kapatBtn=document.getElementById('ataKapatBtn');
    const sinifSecici=document.getElementById('ataSinifSecici');
    const ogrenciListesi=document.getElementById('ataOgrenciListesi');
    const bagimsizUyari=document.getElementById('ataBagimsizUyari');
    if(!overlay||!sinifSecici||!ogrenciListesi) return;
    let _aktifIdx=null;
    function _ataVeriKaynagi(){ return _veriKaynagi(); }
    function _sinifDoldur(){
        const kaynak=_ataVeriKaynagi();
        if(!kaynak){sinifSecici.style.display='none';ogrenciListesi.innerHTML='';bagimsizUyari.style.display='block';return;}
        bagimsizUyari.style.display='none';sinifSecici.style.display='';
        const siniflar=kaynak.siniflarGetir();
        sinifSecici.innerHTML='<option value="">— Sınıf seçin —</option>'+siniflar.map(s=>`<option value="${s.id}">${s.ad}</option>`).join('');
    }
    function _ogrencileriCiz(){
        const kaynak=_ataVeriKaynagi();const sinifId=sinifSecici.value;
        if(!kaynak||!sinifId){ogrenciListesi.innerHTML='';return;}
        const sinifAdi=sinifSecici.options[sinifSecici.selectedIndex].textContent;
        const ogrenciler=kaynak.ogrencilerGetir(sinifId);
        if(!ogrenciler.length){ogrenciListesi.innerHTML='<p class="card-empty">Bu sınıfta kayıtlı öğrenci yok.</p>';return;}
        ogrenciListesi.innerHTML=ogrenciler.map((o,i)=>`<button type="button" class="ogrenci-secim-satiri" style="width:100%;border:none;text-align:left;" data-i="${i}">${o.adSoyad}${o.ogrenciNo?` <span style="color:var(--text-faint);">(No: ${o.ogrenciNo})</span>`:''}</button>`).join('');
        ogrenciListesi.querySelectorAll('button').forEach(btn=>{
            btn.addEventListener('click',()=>{
                const o=ogrenciler[parseInt(btn.dataset.i,10)];
                if(_aktifIdx!==null&&window.TopluTarama&&window.TopluTarama.ogrenciAta)
                    window.TopluTarama.ogrenciAta(_aktifIdx,{adSoyad:o.adSoyad,ogrenciNo:o.ogrenciNo,sinif:sinifAdi});
                _kapat();
            });
        });
    }
    function _ac(idx){_aktifIdx=idx;sinifSecici.value='';ogrenciListesi.innerHTML='';_sinifDoldur();overlay.classList.add('acik');}
    function _kapat(){overlay.classList.remove('acik');_aktifIdx=null;}
    sinifSecici.addEventListener('change',_ogrencileriCiz);
    kapatBtn.addEventListener('click',_kapat);
    overlay.addEventListener('click',e=>{if(e.target===overlay)_kapat();});
    window._ogrenciAtaAc=_ac;
}

// ════════════════════════════════════════════════════════════════
// SINAV KAĞIT DETAY OVERLAY
// ════════════════════════════════════════════════════════════════
function _sinavDetayBaglantilari() {
    const overlay=document.getElementById('sinavDetayOverlay');
    const kapatBtn=document.getElementById('detayKapatBtn');
    if(!overlay||!kapatBtn) return;
    function _kapat(){overlay.classList.remove('acik');}
    kapatBtn.addEventListener('click',_kapat);
    overlay.addEventListener('click',e=>{if(e.target===overlay)_kapat();});
    window._sinavDetayAc=function(idx){ _detayCiz(idx); overlay.classList.add('acik'); };
}

function _detayCiz(idx) {
    const kayit=(window.TopluTarama.sonuclar()||[])[idx];
    if(!kayit) return;
    const ogr=kayit.ogrenci||{};
    const baslikEl=document.getElementById('detayBaslik');
    if(baslikEl){const ad=ogr.adSoyad||ogr.ad_soyad||'(isimsiz)';baslikEl.textContent=`🔍 ${ad}${ogr.ogrenciNo?' · No: '+ogr.ogrenciNo:''}`;}
    const ozetEl=document.getElementById('detayOzetSatiri');
    if(ozetEl){const p=kayit.puan;const pText=p.toplam!=null?`${p.toplam}%`:'—';
        ozetEl.innerHTML=`<span class="detay-puan">${pText}</span><span>D:${p.dogru??'—'}</span><span>Y:${p.yanlis??'—'}</span><span>B:${p.bos??'—'}</span>${kayit.elleDuzenlendiMi?'<span class="etiket-elle">✏️ elle düzenlendi</span>':''}`;}
    const goruntuAlani=document.getElementById('detayGoruntuAlani');
    if(goruntuAlani){goruntuAlani.innerHTML=kayit.kagitGoruntusu?`<img src="${kayit.kagitGoruntusu}" alt="Taranan kağıt" class="detay-kagit-img">`:'<p class="card-empty">Kağıt görüntüsü yok.</p>';}
    const sorularAlani=document.getElementById('detaySorularAlani');
    if(!sorularAlani) return;
    const gruplar={};
    (kayit.puan.detay||[]).forEach(d=>{const da=d.ders&&d.ders!=='null'?d.ders:'Genel';if(!gruplar[da])gruplar[da]=[];gruplar[da].push(d);});
    sorularAlani.innerHTML=Object.keys(gruplar).map(dersAdi=>{
        const sorular=gruplar[dersAdi].sort((a,b)=>a.soruNo-b.soruNo);
        const dersKaydi=_mevcutDersler.find(d=>d.dersAdi===dersAdi);
        const sikSayisi=dersKaydi?dersKaydi.sikSayisi:5;
        const harfler=[]; for(let i=0;i<sikSayisi;i++) harfler.push(String.fromCharCode(65+i));
        const satirlar=sorular.map(s=>{
            const durumSinif=s.durum==='dogru'?'detay-dogru':s.durum==='yanlis'?'detay-yanlis':'detay-bos';
            const sikDugmeleri=harfler.map(h=>{const seciliMi=s.isaretli===h;const dogruMu=s.dogru===h;let ekSinif='';if(dogruMu)ekSinif+=' dogru-sik';if(seciliMi)ekSinif+=' secili';
                return `<button type="button" class="sik-daire${ekSinif}" data-ders="${dersAdi}" data-soru="${s.soruNo}" data-harf="${h}">${h}</button>`;
            }).join('');
            return `<div class="manuel-satir detay-satir ${durumSinif}"><span class="soru-no">${s.soruNo})</span><div class="sik-grubu">${sikDugmeleri}</div></div>`;
        }).join('');
        return `<div class="detay-ders-grubu"><h3 class="detay-ders-basligi">${dersAdi}</h3>${satirlar}</div>`;
    }).join('');
    sorularAlani.querySelectorAll('.sik-daire').forEach(btn=>{
        btn.addEventListener('click',function(){
            const ders=this.dataset.ders,soruNo=parseInt(this.dataset.soru,10),harf=this.dataset.harf;
            const zaten=this.classList.contains('secili');
            window.TopluTarama.cevabiGuncelle(idx,ders,soruNo,zaten?null:harf);
            _detayCiz(idx);
        });
    });
}

// ════════════════════════════════════════════════════════════════
// TARAMA LİSTESİ
// ════════════════════════════════════════════════════════════════
function _taramaListesiniYenile({ sonuclar, ozet }) {
    const sayac=document.getElementById('oturumSayac');
    if(sayac) sayac.textContent=`${ozet.toplamOgrenci} öğrenci tarandı`;
    const liste=document.getElementById('taramaSonucListesi');
    if(!liste) return;
    if(sonuclar.length===0){
        liste.innerHTML=''; _raporPanelleriniGizle(); return;
    }
    _raporPanelleriniGoster();
    liste.innerHTML=sonuclar.map((r,idx)=>{
        const ogr=r.ogrenci||{};
        const ad=ogr.adSoyad||ogr.ad_soyad||null;
        const adHtml=ad?ad:`<button type="button" class="ogrenci-ata-link" data-idx="${idx}">🔗 Ad bilgisi yok — Öğrenci Ata</button>`;
        const p=r.puan;const pText=p.toplam!=null?`${p.toplam}%`:'—';
        const renkSinif=p.toplam>=70?'puan-yuksek':p.toplam>=40?'puan-orta':'puan-dusuk';
        return `<div class="tarama-kayit">
            <span class="tarama-sira">${r.sira}</span>
            <div class="tarama-bilgi"><strong>${adHtml}</strong><small>${ogr.ogrenciNo||''} · ${ogr.sinif||''} · ${r.tarih||''}${r.elleDuzenlendiMi?' · ✏️ elle düzenlendi':''}</small></div>
            <div class="tarama-puan ${renkSinif}">${pText}</div>
            <div class="tarama-detay">D:${p.dogru??'—'} Y:${p.yanlis??'—'} B:${p.bos??'—'}</div>
            <div class="tarama-aksiyonlar">
                <button type="button" class="btn-gor-kayit" data-idx="${idx}" title="Kağıdı gör">🔍</button>
                <button type="button" class="btn-sil-kayit" data-idx="${idx}">✕</button>
            </div>
        </div>`;
    }).join('');
    liste.querySelectorAll('.btn-gor-kayit').forEach(btn=>{btn.addEventListener('click',function(){if(typeof window._sinavDetayAc==='function')window._sinavDetayAc(parseInt(this.dataset.idx,10));});});
    liste.querySelectorAll('.btn-sil-kayit').forEach(btn=>{btn.addEventListener('click',function(){window.TopluTarama.sil(parseInt(this.dataset.idx,10));});});
    liste.querySelectorAll('.ogrenci-ata-link').forEach(btn=>{btn.addEventListener('click',function(){if(typeof window._ogrenciAtaAc==='function')window._ogrenciAtaAc(parseInt(this.dataset.idx,10));});});
    const disaPanel=document.getElementById('disaAktarPanel');
    const ozetEl=document.getElementById('ozetSatirlar');
    if(disaPanel&&ozetEl&&sonuclar.length>0){
        disaPanel.style.display='block';
        ozetEl.innerHTML=`<span>📊 Ortalama: <strong>${ozet.ortPuan??'—'}</strong></span><span>⬆️ En yüksek: <strong>${ozet.enYuksek??'—'}</strong></span><span>⬇️ En düşük: <strong>${ozet.enDusuk??'—'}</strong></span>`;
    }
}

// ════════════════════════════════════════════════════════════════
// MANUEL GİRİŞ
// ════════════════════════════════════════════════════════════════
let _manuelCevaplar = {}; // { dersAdi: { soruNo: 'A'|'B'|'C'|'D'|null } }
let _manuelDersler  = []; // _mevcutDersler ile aynı format

function _manuelGirisBaglantilari() {
    const overlay   = document.getElementById('manuelGirisOverlay');
    const kapatBtn  = document.getElementById('manuelKapatBtn');
    const kaydetBtn = document.getElementById('manuelKaydetBtn');
    const sheet     = document.getElementById('kagitEkleSheet');
    const btnManuel = document.getElementById('btnManuel');
    const dersSecici= document.getElementById('manuelDersSecici2');

    if (!overlay) return;

    function _ac() {
        if (sheet) sheet.classList.remove('acik');
        // Form adını ve dersleri al
        _manuelCevaplar = {};
        _manuelDersler  = _formunDersListesiniCikar();

        // Form adı
        const sinav = window.TopluTarama.aktifSinavBilgisi();
        const formAdiEl = document.getElementById('manuelFormAdiLabel');
        if (formAdiEl) formAdiEl.textContent = (sinav && sinav.sinavAdi) ? sinav.sinavAdi : '—';

        // Ders dropdown
        if (dersSecici) {
            dersSecici.innerHTML = _manuelDersler.map((d,i)=>
                `<option value="${i}">${d.dersAdi}</option>`
            ).join('');
            dersSecici.selectedIndex = 0;
        }

        // Alanları temizle
        ['manuelNumara','manuelSinif','manuelAdSoyad'].forEach(id=>{
            const el=document.getElementById(id); if(el) el.value='';
        });
        const kit = document.getElementById('manuelKitapcik');
        if(kit) kit.value = '';

        overlay.style.display = 'flex';
        _manuelIzgaraCiz();
        _manuelIstatistikGuncelle();
    }

    function _kapat() {
        overlay.style.display = 'none';
    }

    if (btnManuel) btnManuel.addEventListener('click', _ac);
    if (kapatBtn)  kapatBtn.addEventListener('click', _kapat);

    // Ders değişince ızgarayı yenile (önce mevcut seçimleri kaydet)
    if (dersSecici) {
        dersSecici.addEventListener('change', _manuelIzgaraCiz);
    }

    // Temizle butonları
    document.querySelectorAll('.manuel-temizle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const hedef = document.getElementById(btn.dataset.hedef);
            if (hedef) hedef.value = '';
        });
    });

    // Kaydet
    if (kaydetBtn) {
        kaydetBtn.addEventListener('click', () => {
            const adSoyad  = document.getElementById('manuelAdSoyad')?.value.trim() || '';
            const ogrNo    = document.getElementById('manuelNumara')?.value.trim() || '';
            const sinif    = document.getElementById('manuelSinif')?.value.trim() || '';
            const kitapcik = document.getElementById('manuelKitapcik')?.value || '';

            // cevaplar nesnesini oluştur: { dersAdi: { soruNo: harf } }
            const cevaplar = {};
            _manuelDersler.forEach(d => {
                const dersMap = _manuelCevaplar[d.dersAdi] || {};
                cevaplar[d.dersAdi] = {};
                for (let i = 1; i <= d.soruSayisi; i++) {
                    cevaplar[d.dersAdi][i] = dersMap[i] || null;
                }
            });

            // Sentetik OMR sonucu oluştur
            const sonuc = {
                basarili: true,
                cevaplar,
                ogrenciKimlik: {
                    adSoyad,
                    ogrenciNo: ogrNo,
                    sinif,
                    kitapcikTuru: kitapcik
                },
                kagitGoruntusu: null,
                manuelGiris: true
            };

            // TopluTarama'ya ekle
            if (window.TopluTarama) {
                window.TopluTarama.ekle(sonuc);
            }

            _kapat();
        });
    }
}

function _manuelIzgaraCiz() {
    const dersSecici = document.getElementById('manuelDersSecici2');
    const alan       = document.getElementById('manuelSoruIzgarasi');
    if (!alan || !dersSecici || !_manuelDersler.length) return;

    const idx    = parseInt(dersSecici.value || '0', 10);
    const ders   = _manuelDersler[idx] || _manuelDersler[0];
    if (!ders) return;

    const dersAdi   = ders.dersAdi;
    const soruSayisi= ders.soruSayisi;
    const sikSayisi = ders.sikSayisi || 4;
    const harfler   = [];
    for (let i=0;i<sikSayisi;i++) harfler.push(String.fromCharCode(65+i));

    if (!_manuelCevaplar[dersAdi]) _manuelCevaplar[dersAdi] = {};
    const dersMap = _manuelCevaplar[dersAdi];

    alan.innerHTML = '';
    for (let soruNo=1; soruNo<=soruSayisi; soruNo++) {
        const satir = document.createElement('div');
        satir.className = 'manuel-soru-satiri';

        const no = document.createElement('span');
        no.className = 'soru-no';
        no.textContent = soruNo + ')';
        satir.appendChild(no);

        const sikGrubu = document.createElement('div');
        sikGrubu.className = 'sik-grubu manuel-sik-grubu';

        harfler.forEach(harf => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sik-daire manuel-sik';
            btn.textContent = harf;
            if (dersMap[soruNo] === harf) btn.classList.add('secili');

            btn.addEventListener('click', () => {
                const zaten = btn.classList.contains('secili');
                sikGrubu.querySelectorAll('.sik-daire').forEach(b => b.classList.remove('secili'));
                if (!zaten) {
                    btn.classList.add('secili');
                    dersMap[soruNo] = harf;
                } else {
                    dersMap[soruNo] = null;
                }
                _manuelIstatistikGuncelle();
            });

            sikGrubu.appendChild(btn);
        });

        satir.appendChild(sikGrubu);

        // Ayraç çizgi
        const hr = document.createElement('div');
        hr.className = 'soru-ayrac';
        satir.appendChild(hr);

        alan.appendChild(satir);
    }
}

function _manuelIstatistikGuncelle() {
    const anahtar = window.CevapAnahtari ? window.CevapAnahtari.getir() : null;
    let topD=0, topY=0, topB=0;

    _manuelDersler.forEach(d => {
        const dersMap = _manuelCevaplar[d.dersAdi] || {};
        const dersAnahtarKaydi = anahtar && (anahtar.dersler||[]).find(x=>x.dersAdi===d.dersAdi);
        const dogruMap = {};
        if (dersAnahtarKaydi) dersAnahtarKaydi.anahtarlar.forEach(a=>{ dogruMap[a.soruNo]=a.dogru; });

        for (let i=1; i<=d.soruSayisi; i++) {
            const isaretli = dersMap[i];
            if (!isaretli) { topB++; }
            else if (dogruMap[i] && dogruMap[i] === isaretli) { topD++; }
            else { topY++; }
        }
    });

    const net = (topD - topY/4).toFixed(2);
    _setText('manuelD', topD);
    _setText('manuelY', topY);
    _setText('manuelB', topB);
    _setText('manuelN', net);
    _setText('manuelNetSkor', net);
}

// ════════════════════════════════════════════════════════════════
// YARDIMCILAR
// ════════════════════════════════════════════════════════════════
function _setText(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }
function _html(str) { return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ════════════════════════════════════════════════════════════════
// BAŞLAT
// ════════════════════════════════════════════════════════════════
if (document.readyState==='loading') { window.addEventListener('DOMContentLoaded', baslat); }
else { baslat(); }
