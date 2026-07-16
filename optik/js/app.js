// js/app.js — Optik Okuma Ana Modülü

import { baglaGaleriSecici } from './galeriSecici.js';
import { ayarlariGetir, ayarlariKaydet, ayarlariSifirla, VARSAYILAN as HASSASIYET_VARSAYILAN } from './hassasiyetAyarlari.js';

// ════════════════════════════════════════════════════════════════
// VERİ KATMANI (localStorage)
// ════════════════════════════════════════════════════════════════
const DB = {
    _oku(k, def) { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? def; } catch { return def; } },
    _yaz(k, v)   { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },

    // Sınavlar
    sinavlariGetir()        { return this._oku('oy_op_sinavlar', []); },
    sinavKaydet(s)          {
        const liste = this.sinavlariGetir().filter(x => x.id !== s.id);
        s.guncelleme = new Date().toISOString();
        liste.unshift(s);
        this._yaz('oy_op_sinavlar', liste);
    },
    sinaviSil(id)           {
        this._yaz('oy_op_sinavlar', this.sinavlariGetir().filter(s => s.id !== id));
        localStorage.removeItem('oy_op_sonuc_' + id);
        localStorage.removeItem('oy_op_anahtar_' + id);
    },
    sinaviBul(id)           { return this.sinavlariGetir().find(s => s.id === id) || null; },

    // Sonuçlar (taranmış kağıtlar)
    sonuclariGetir(sid)     { return this._oku('oy_op_sonuc_' + sid, []); },
    sonucKaydet(sid, sonuc) {
        const liste = this.sonuclariGetir(sid).filter(s => s.id !== sonuc.id);
        sonuc.tarih = sonuc.tarih || new Date().toLocaleDateString('tr-TR');
        liste.push(sonuc);
        if (!this._yaz('oy_op_sonuc_' + sid, liste)) {
            // Sıkıştır
            const kucuk = liste.map(s => ({ ...s, kagitGoruntusu: null }));
            this._yaz('oy_op_sonuc_' + sid, kucuk);
        }
    },
    sonucSil(sid, sonucId)  {
        this._yaz('oy_op_sonuc_' + sid, this.sonuclariGetir(sid).filter(s => s.id !== sonucId));
    },

    // Cevap Anahtarı
    anahtariGetir(sid)      { return this._oku('oy_op_anahtar_' + sid, { dersler: [] }); },
    anahtarKaydet(sid, a)   { a.guncelleme = new Date().toISOString(); this._yaz('oy_op_anahtar_' + sid, a); },

    // LGS Puanı — MEB'in açıkladığı gerçek istatistikler (Türkiye ort./std sapma, MinTASP/MaxTASP)
    // Puan referans ayarları (Türkiye ortalaması/std sapma/TASP aralığı):
    // sınav TÜRÜNE göre GLOBAL saklanır (ör. 'lgs', 'bursluluk') — tek bir
    // sınava değil, o türdeki TÜM sınavlara uygulanır. Böylece her yeni
    // deneme için aynı referans verisini tekrar tekrar girmeye gerek kalmaz.
    puanReferansGetir(sinavTuru)       { return this._oku('oy_op_puanref_' + sinavTuru, { dersIstatistik: {}, minTasp: null, maxTasp: null }); },
    puanReferansKaydet(sinavTuru, a)   { this._yaz('oy_op_puanref_' + sinavTuru, a); },
};

// ════════════════════════════════════════════════════════════════
// OPTİK FORM ŞABLONLARI
// ════════════════════════════════════════════════════════════════
const SABLONLAR = [
    { id: 'lgs',       ad: 'LGS',              soruSayisi: 90, sikSayisi: 4 },
    { id: 'bursluluk', ad: 'Bursluluk Sınavı', soruSayisi: 80, sikSayisi: 4 },
    { id: 'ozel',      ad: 'Özel Sınav',       soruSayisi: null, sikSayisi: 4 },
];

function sablonBul(id) { return SABLONLAR.find(s => s.id === id) || null; }

/**
 * Bir sınav TÜRÜNE (ör. 'lgs', 'bursluluk') ait ders listesini, gerçek bir
 * sınav kaydına ihtiyaç duymadan doğrudan LayoutEngine şablonundan çıkarır.
 * LGS/Bursluluk ders listesi türe göre SABİTTİR (özelleştirilemez), bu
 * yüzden global puan referans ayarları ekranı gibi belirli bir sınava bağlı
 * olmayan yerlerde de kullanılabilir.
 */
function _formTuruDersleriniGetir(sinavTuru) {
    try {
        const layout = window.LayoutEngine.layoutHesapla({ sinavTuru });
        const form   = layout.formlar[0];
        if (form.bolumler) {
            const dersler = [];
            form.bolumler.forEach(b => b.dersSutunlari.forEach(d => {
                dersler.push({ dersAdi: d.dersAdi, soruSayisi: d.sorular.length, sikSayisi: d.sorular[0]?.sikler.length || 4 });
            }));
            return dersler;
        } else if (form.izgara) {
            return [{ dersAdi: 'Genel', soruSayisi: form.izgara.sorular.length, sikSayisi: form.izgara.sorular[0]?.sikler.length || 4 }];
        }
    } catch (e) { console.warn('Ders listesi alınamadı', e); }
    return [{ dersAdi: 'Genel', soruSayisi: 20, sikSayisi: 4 }];
}

function formDersleriniGetir(sinavId) {
    const sinav  = DB.sinaviBul(sinavId);
    const formId = sinav?.optikFormId || 'lgs';
    if (formId === 'ozel') return _ozelSinavDersleriGetir(sinav);
    return _formTuruDersleriniGetir(formId);
}

/** Özel sınavlar için ders listesi, sınavın KENDİ soru/şık sayısına göre üretilir (sabit şablon değil). */
function _ozelSinavDersleriGetir(sinav) {
    try {
        const layout = window.LayoutEngine.layoutHesapla({
            sinavTuru: 'ozel',
            soruSayisi: sinav?.soruSayisi || 20,
            sikSayisi: sinav?.sikSayisi || 4,
            sayfaDuzeni: 'otomatik',
        });
        const form = layout.formlar[0];
        if (form.izgara) {
            return [{ dersAdi: 'Genel', soruSayisi: form.izgara.sorular.length, sikSayisi: form.izgara.sorular[0]?.sikler.length || 4 }];
        }
    } catch (e) { console.warn('Özel sınav ders listesi alınamadı', e); }
    return [{ dersAdi: 'Genel', soruSayisi: sinav?.soruSayisi || 20, sikSayisi: sinav?.sikSayisi || 4 }];
}

// ════════════════════════════════════════════════════════════════
// ANA UYGULAMA VERİ KAYNAĞI (ana okul uygulamasından)
// ════════════════════════════════════════════════════════════════
function veriKaynagi() {
    try { if (window.parent !== window && window.parent.OptikVeriKaynagi) return window.parent.OptikVeriKaynagi; } catch {}
    return null;
}

// ════════════════════════════════════════════════════════════════
// NAVİGASYON
// ════════════════════════════════════════════════════════════════
let _aktifSinavId = null;
let _aktifSonucId = null;

/**
 * Aktif sınavın türünü/soru-şık sayısını diğer (modül olmayan) betiklere
 * (bkz. formOkuyucu.js testFormunuOlustur) açar — okuma sırasında hangi
 * form düzeninin (LGS/Bursluluk/Özel) bekleneceğini belirlemek için.
 */
window.OptikAktifSinavTuru = function () {
    const sinav = DB.sinaviBul(_aktifSinavId);
    if (!sinav) return { sinavTuru: 'lgs' };
    if (sinav.optikFormId === 'ozel') {
        return { sinavTuru: 'ozel', soruSayisi: sinav.soruSayisi || 20, sikSayisi: sinav.sikSayisi || 4 };
    }
    return { sinavTuru: sinav.optikFormId || 'lgs' };
};

const Ekranlar = {
    sinavlar:     document.getElementById('ekranSinavlar'),
    yeniSinav:    document.getElementById('ekranYeniSinav'),
    sinavDetay:   document.getElementById('ekranSinavDetay'),
    ogrDetay:     document.getElementById('ekranOgrDetay'),
    optikOlustur: document.getElementById('ekranOptikOlustur'),
    manuelKagit:  document.getElementById('ekranManuelKagit'),
    lgsPuan:      document.getElementById('ekranLgsPuan'),
};

function ekranGit(id) {
    Object.values(Ekranlar).forEach(e => e?.classList.remove('aktif'));
    Ekranlar[id]?.classList.add('aktif');
}

// ════════════════════════════════════════════════════════════════
// GERİ TUŞU KÖPRÜSÜ (ana uygulamadan çağrılır — bkz. js/app.js
// geriTusuIsle, js/optik-entegrasyon.js). Telefonun donanım geri
// tuşuna basılınca Optik aracının TAMAMINI kapatmak yerine, önce
// kendi iç durumunu (köşe seçimi/ayarlar/sheet/kamera/alt ekran)
// bir kademe geri alır; hiçbir iç durum kalmadığında false döner
// ve üst uygulama tüm aracı kapatır.
// ════════════════════════════════════════════════════════════════
const _EKRAN_USTU = {
    yeniSinav: 'sinavlar',
    sinavDetay: 'sinavlar',
    ogrDetay: 'sinavDetay',
    optikOlustur: 'sinavDetay',
    manuelKagit: 'sinavDetay',
    lgsPuan: 'sinavDetay',
};

function _aktifEkranId() {
    for (const id in Ekranlar) {
        if (Ekranlar[id]?.classList.contains('aktif')) return id;
    }
    return null;
}

window.optikGeriTusuIsle = function () {
    // 1) Köşe seçim ekranı (manuel köşe düzeltme) açıksa onu kapat.
    const koseAlani = document.getElementById('koseSecimAlani');
    if (koseAlani && koseAlani.style.display !== 'none') {
        const iptalBtn = document.getElementById('koseIptal');
        if (iptalBtn) iptalBtn.click(); else koseAlani.style.display = 'none';
        return true;
    }

    // 2) Kamera ayarlar sheet'i açıksa kapat.
    const ayarSheet = document.getElementById('kameraAyarSheet');
    if (ayarSheet && !ayarSheet.hidden) { ayarSheet.hidden = true; return true; }

    // 3) Canlı tarama sonuç kartı gösteriliyorsa kapat.
    const kart = document.getElementById('canliSonucKart');
    if (kart && !kart.hidden) { kart.hidden = true; return true; }

    // 4) Herhangi bir bottom-sheet (Kağıt Ekle, Form Seç, Onay) açıksa kapat.
    const acikSheet = document.querySelector('.bs-overlay:not([hidden])');
    if (acikSheet) { acikSheet.hidden = true; return true; }

    // 5) Kamera ekranı açıksa (tarama modundaysa) kamerayı kapat — bir
    //    önceki ekrana (genelde sınav detayı) döner.
    const kameraOv = document.getElementById('kameraOverlay');
    if (kameraOv && !kameraOv.hidden) {
        if (typeof kameraKapat === 'function') kameraKapat();
        return true;
    }

    // 6) Kök olmayan bir ekrandaysa bir üst ekrana dön.
    const aktif = _aktifEkranId();
    if (aktif && aktif !== 'sinavlar' && _EKRAN_USTU[aktif]) {
        ekranGit(_EKRAN_USTU[aktif]);
        return true;
    }

    // 7) Kökteyiz (sınav listesi, hiçbir şey açık değil) — üst uygulama
    //    tüm Optik aracını kapatsın.
    return false;
};

// ════════════════════════════════════════════════════════════════
// EKRAN 1 — SINAVLAR LİSTESİ
// ════════════════════════════════════════════════════════════════
function sinavlariRender() {
    const liste = DB.sinavlariGetir();
    const bosEl = document.getElementById('sinavBosAlan');
    const listEl = document.getElementById('sinavListesi');
    if (!listEl) return;
    bosEl.style.display = liste.length ? 'none' : 'flex';
    listEl.innerHTML = liste.map(s => {
        const sonuclar = DB.sonuclariGetir(s.id);
        const okunduSayisi = sonuclar.length;
        const badge = okunduSayisi > 0
            ? `<span class="durum-badge badge-okundu">OKUNDU (${okunduSayisi})</span>`
            : `<span class="durum-badge badge-bekliyor">BEKLİYOR</span>`;
        const ikonRenk = okunduSayisi > 0 ? '#E8F5E9' : '#FFF3E0';
        const ikonRenkS = okunduSayisi > 0 ? '#2E7D32' : '#E65100';
        return `<div class="sinav-kart" data-id="${s.id}">
            <div class="sinav-kart-ikon" style="background:${ikonRenk};">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${ikonRenkS}" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <div class="sinav-kart-bilgi">
                <span class="sinav-kart-ad">${_h(s.ad)}</span>
                <small class="sinav-kart-alt">${s.optikFormAd || ''} · ${_tarih(s.olusturma)}</small>
            </div>
            ${badge}
            <button class="menu-btn" data-id="${s.id}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
            </button>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.sinav-kart').forEach(kart => {
        kart.addEventListener('click', e => {
            if (e.target.closest('.menu-btn')) return;
            sinavDetayAc(kart.dataset.id);
        });
    });
    listEl.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const s = DB.sinaviBul(btn.dataset.id);
            if (!s) return;
            sheetOnay(`"${s.ad}" sınavını sil?`, `Bu işlem geri alınamaz.`, () => {
                DB.sinaviSil(btn.dataset.id);
                sinavlariRender();
            });
        });
    });
}

// ════════════════════════════════════════════════════════════════
// EKRAN 2 — YENİ SINAV
// ════════════════════════════════════════════════════════════════
let _ysSablonSecilen = null;

function yeniSinavAc() {
    _ysSablonSecilen = null;
    document.getElementById('ysSinavAd').value = '';
    document.getElementById('ysOptikFormAdi').textContent = 'Form seçin...';
    document.getElementById('ysOptikFormAdi').style.color = 'var(--text-faint)';
    const ozelBlok = document.getElementById('ysOzelAyarBlok');
    if (ozelBlok) ozelBlok.hidden = true;
    const ozelSoru = document.getElementById('ysOzelSoruSayisi');
    if (ozelSoru) ozelSoru.value = '';
    _ogrenciSeciminiRender();
    ekranGit('yeniSinav');
}

function _ogrenciSeciminiRender() {
    const kap = document.getElementById('ysOgrenciSecimAlani');
    if (!kap) return;
    const kaynak = veriKaynagi();
    if (!kaynak) {
        kap.innerHTML = '<p class="ogr-secim-bilgi">Uygulama içinden açıldığında öğrenci seçimi aktif olur.</p>';
        return;
    }
    const siniflar = kaynak.siniflarGetir();
    kap.innerHTML = siniflar.map(s => {
        const ogrenciler = kaynak.ogrencilerGetir(s.id);
        return `<div class="sinif-grup">
            <div class="sinif-baslik" data-sinif="${s.id}">
                <input type="checkbox" class="sinif-cb" data-sinif="${s.id}" id="sinifCb_${s.id}">
                <label for="sinifCb_${s.id}" style="flex:1;cursor:pointer;">
                    <strong>${_h(s.ad)}</strong>
                </label>
                <small>${ogrenciler.length} öğrenci</small>
                <svg width="16" height="16" class="sinif-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div class="ogr-secim-listesi-kap" id="ogrListeKap_${s.id}">
                ${ogrenciler.map(o => `
                    <div class="ogr-secim-satir">
                        <input type="checkbox" class="sinif-cb ogr-cb" id="ogrCb_${o.id}" data-sinif="${s.id}" data-ogr="${o.id}" style="accent-color:var(--accent);">
                        <label for="ogrCb_${o.id}" style="flex:1;cursor:pointer;">${_h(o.adSoyad)}</label>
                        <small>${o.ogrenciNo || ''}</small>
                    </div>`).join('')}
            </div>
        </div>`;
    }).join('');

    // Sınıf toggle
    kap.querySelectorAll('.sinif-baslik').forEach(baslik => {
        baslik.addEventListener('click', e => {
            if (e.target.classList.contains('sinif-cb') || e.target.tagName === 'LABEL') return;
            const sinifId = baslik.dataset.sinif;
            const listKap = document.getElementById('ogrListeKap_' + sinifId);
            listKap?.classList.toggle('acik');
        });
    });
    // Sınıf checkbox → tüm öğrencileri seç
    kap.querySelectorAll('.sinif-cb[data-sinif]').forEach(cb => {
        if (cb.dataset.ogr) return;
        cb.addEventListener('change', () => {
            const sinifId = cb.dataset.sinif;
            kap.querySelectorAll(`.ogr-cb[data-sinif="${sinifId}"]`).forEach(oCb => oCb.checked = cb.checked);
        });
    });
}

function _seciliOgrIdleri() {
    const kap = document.getElementById('ysOgrenciSecimAlani');
    return [...kap.querySelectorAll('.ogr-cb:checked')].map(cb => cb.dataset.ogr);
}

function yeniSinavKaydet() {
    const ad = document.getElementById('ysSinavAd').value.trim();
    if (!ad) { alert('Sınav adı gerekli!'); return; }
    if (!_ysSablonSecilen) { alert('Optik form seçin!'); return; }

    let soruSayisi = _ysSablonSecilen.soruSayisi;
    let sikSayisi  = _ysSablonSecilen.sikSayisi;

    // Yanlış cevap etkisi artık sınav türünden BAĞIMSIZ, her zaman ekrandaki
    // seçiciden okunuyor (varsayılan/seçili değer 3 — LGS/Bursluluk resmî kuralı).
    const yEtki = parseInt(document.getElementById('ysYanlisEtkisi')?.value, 10);
    let yanlisKatsayisi = Number.isFinite(yEtki) && yEtki > 0 ? yEtki : (yEtki === 0 ? null : 3);

    if (_ysSablonSecilen.id === 'ozel') {
        soruSayisi = parseInt(document.getElementById('ysOzelSoruSayisi')?.value, 10);
        if (!soruSayisi || soruSayisi < 1) { alert('Özel sınav için geçerli bir soru sayısı girin!'); return; }
        sikSayisi = parseInt(document.getElementById('ysOzelSikSayisi')?.value, 10) || 4;

        // Girilen soru sayısının GERÇEKTEN bir sayfa düzenine sığıp sığmadığını
        // burada, kaydetmeden ÖNCE kontrol et — sığmıyorsa sınav hiç
        // oluşturulmasın, kullanıcı daha sonra "Optik Form Oluştur" ekranında
        // anlaşılması güç bir PDF hatasıyla karşılaşmasın.
        try {
            window.LayoutEngine?.sayfaDuzeniOner(soruSayisi, sikSayisi);
        } catch (e) {
            alert(`${soruSayisi} soru bu şık sayısıyla tek sayfaya sığmıyor. Şu an bu ayarlarla en fazla desteklenen soru sayısını kontrol edip daha düşük bir değer girin (girdiğiniz sayıyı bir daha kontrol edin — yanlışlıkla fazladan rakam girilmiş olabilir).`);
            return;
        }
    }

    const sinav = {
        id:           'sinav_' + Date.now(),
        ad,
        optikFormId:  _ysSablonSecilen.id,
        optikFormAd:  _ysSablonSecilen.ad,
        soruSayisi,
        sikSayisi,
        yanlisKatsayisi,
        ogrenciIdleri: _seciliOgrIdleri(),
        olusturma:    new Date().toISOString(),
    };
    DB.sinavKaydet(sinav);
    sinavlariRender();
    sinavDetayAc(sinav.id);
}

// ════════════════════════════════════════════════════════════════
// EKRAN 3 — SINAV DETAY
// ════════════════════════════════════════════════════════════════
function sinavDetayAc(sinavId) {
    _aktifSinavId = sinavId;
    const sinav = DB.sinaviBul(sinavId);
    if (!sinav) return;
    document.getElementById('sinavDetayBaslik').textContent = sinav.ad;
    // form adını kamera başlığına yaz
    const kFAdi = document.getElementById('kameraFormAdi');
    if (kFAdi) kFAdi.textContent = sinav.optikFormAd || sinav.optikFormId;
    const kmAdi = document.getElementById('kmFormAdi');
    if (kmAdi) kmAdi.textContent = sinav.optikFormAd || sinav.optikFormId;
    // Sınav türü hidden input (eski engine uyumluluğu)
    let stEl = document.getElementById('sinavTuru');
    if (!stEl) { stEl = document.createElement('input'); stEl.type='hidden'; stEl.id='sinavTuru'; document.body.appendChild(stEl); }
    stEl.value = sinav.optikFormId || 'lgs';
    let ssEl = document.getElementById('soruSayisi');
    if (!ssEl) { ssEl = document.createElement('input'); ssEl.type='hidden'; ssEl.id='soruSayisi'; document.body.appendChild(ssEl); }
    ssEl.value = sinav.soruSayisi || 90;
    _s('raporLgsEtiket', sinav.optikFormId === 'bursluluk' ? 'İOKBS (Bursluluk) Puanı' : 'LGS Puanı');

    sekmeAktiflestir('kagitlar');
    kagitlariRender();
    anahtarPaneliniRender();
    ekranGit('sinavDetay');
}

// Sekme sistemi
let _aktifSekme = 'kagitlar';
function sekmeAktiflestir(sekme) {
    _aktifSekme = sekme;
    document.querySelectorAll('#sekmeBar .sekme').forEach(b =>
        b.classList.toggle('aktif', b.dataset.sekme === sekme)
    );
    document.querySelectorAll('.sekme-panel').forEach(p =>
        p.classList.toggle('aktif', p.id === 'panel' + sekme.charAt(0).toUpperCase() + sekme.slice(1))
    );
    // FAB görünürlüğü
    const fabKume = document.getElementById('kagitFabKume');
    if (fabKume) fabKume.style.display = sekme === 'kagitlar' ? 'flex' : 'none';
}

// ════════════════════════════════════════════════════════════════
// KAĞITLAR SEKMESİ
// ════════════════════════════════════════════════════════════════
let _kagitFiltreSinif = '';

function kagitlariRender() {
    if (!_aktifSinavId) return;
    const sonuclar = DB.sonuclariGetir(_aktifSinavId);
    const bosEl    = document.getElementById('kagitBosAlan');
    const listEl   = document.getElementById('kagitListesi');
    const sinav    = DB.sinaviBul(_aktifSinavId);
    if (!listEl) return;

    // Sınıf filtre chip'leri
    const siniflar = [...new Set(sonuclar.map(r => r.ogrenci?.sinif).filter(Boolean))].sort();
    const chipKap  = document.getElementById('kagitSinifFiltre');
    if (chipKap) {
        chipKap.innerHTML = `<button class="chip ${_kagitFiltreSinif===''?'aktif':''}" data-sinif="">Tümü ${sonuclar.length}</button>` +
            siniflar.map(s => `<button class="chip ${_kagitFiltreSinif===s?'aktif':''}" data-sinif="${_h(s)}">${_h(s)} ${sonuclar.filter(r=>r.ogrenci?.sinif===s).length}</button>`).join('');
        chipKap.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
            _kagitFiltreSinif = c.dataset.sinif;
            kagitlariRender();
        }));
    }

    // Arama
    const aramaEl = document.getElementById('kagitArama');
    if (aramaEl && !aramaEl._bound) {
        aramaEl._bound = true;
        aramaEl.addEventListener('input', kagitlariRender);
    }
    const aramaMetni = aramaEl?.value.trim().toLocaleLowerCase('tr') || '';

    let liste = sonuclar;
    if (_kagitFiltreSinif) liste = liste.filter(r => r.ogrenci?.sinif === _kagitFiltreSinif);
    if (aramaMetni) liste = liste.filter(r =>
        (r.ogrenci?.adSoyad || '').toLocaleLowerCase('tr').includes(aramaMetni) ||
        (r.ogrenci?.ogrenciNo || '').includes(aramaMetni) ||
        (r.ogrenci?.sinif || '').toLocaleLowerCase('tr').includes(aramaMetni)
    );

    bosEl.style.display = sonuclar.length === 0 ? 'flex' : 'none';
    if (sonuclar.length === 0) { listEl.innerHTML = ''; return; }

    const RENKLER = ['#1565C0','#2E7D32','#E65100','#6A1B9A','#00695C','#C62828'];
    const formAd  = sinav?.optikFormAd || 'Puan';
    const sinavTuru = sinav?.optikFormId; // 'lgs' | 'bursluluk' | 'ozel' | ...

    // Puanı sınav türüne göre hesapla: LGS'de sabit formül, Bursluluk'ta
    // resmî İOKBS (TASP) yöntemi — ikisi dışındaki (ör. "özel", az sorulu
    // bir test) formlarda hiçbir puan formülü GEÇERLİ DEĞİL, bu yüzden
    // puan gösterilmez (yalnızca D/Y/B/N görünür).
    const puanMap = {}; // sonucId -> puan (number) | undefined
    if (sinavTuru === 'lgs') {
        sonuclar.forEach(r => {
            const sonuc = window.LgsPuanHesapla?.sabitFormulPuanHesapla(r.puan?.dersDetay || []);
            if (sonuc) puanMap[r.id] = sonuc.puan;
        });
    } else if (sinavTuru === 'bursluluk') {
        const dersler = formDersleriniGetir(_aktifSinavId);
        const harici = _lgsHariciVeriyiHazirla('bursluluk');
        const rapor = window.LgsPuanHesapla?.sinavRaporuHesapla(sonuclar, dersler, harici, 'bursluluk');
        (rapor?.ogrenciler || []).forEach(o => { puanMap[o.sonucId] = o.msp; });
    }

    // Puana göre büyükten küçüğe sırala (puanı olmayanlar — ör. özel form
    // ya da henüz hesaplanamamış kayıtlar — listenin sonuna düşer).
    liste = liste.slice().sort((a, b) => {
        const pa = puanMap[a.id], pb = puanMap[b.id];
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return pb - pa;
    });

    listEl.innerHTML = liste.map((r, i) => {
        const ogr   = r.ogrenci || {};
        const ad    = ogr.adSoyad || '(isimsiz)';
        const harf1 = ad[0]?.toUpperCase() || '?';
        const harf2 = ad.split(' ')[1]?.[0]?.toUpperCase() || '';
        const renk  = RENKLER[i % RENKLER.length];
        const p     = r.puan || {};

        const puan = puanMap[r.id];
        const puanBadgeHtml = puan != null
            ? (() => {
                const puanSinif = puan >= 350 ? 'puan-yuksek' : puan >= 250 ? 'puan-orta' : 'puan-dusuk';
                return `<span class="puan-badge ${puanSinif}">
                    <span class="puan-badge-sayi">${puan.toFixed(1)}</span>
                    <span class="puan-badge-ad">${_h(formAd)}</span>
                </span>`;
            })()
            : '';

        // D/Y/B/N — net, puanHesapla() tarafından sınavın kendi yanlış cevap
        // katsayısıyla (bkz. _sinavYanlisKatsayisi) zaten hesaplanmış hâliyle.
        const d = p.toplamD || 0, y = p.toplamY || 0, b = p.toplamB || 0;
        const net = (p.toplamNet != null ? p.toplamNet : (d - y / 3)).toFixed(2);

        return `<div class="kagit-kart" data-id="${r.id}">
            <div class="kagit-avatar" style="background:${renk};">${harf1}${harf2}</div>
            <div class="kagit-bilgi">
                <span class="kagit-ad">${_h(ad)}</span>
                <small class="kagit-alt">${_h(ogr.sinif||'')} · ${_h(ogr.ogrenciNo||'—')}</small>
                <div class="kagit-dvb">
                    <span class="kagit-dvb-d">D:${d}</span>
                    <span class="kagit-dvb-y">Y:${y}</span>
                    <span class="kagit-dvb-b">B:${b}</span>
                    <span class="kagit-dvb-n">N:${net}</span>
                </div>
            </div>
            ${puanBadgeHtml}
            <button class="menu-btn" data-id="${r.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
            </button>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.kagit-kart').forEach(kart => {
        kart.addEventListener('click', e => {
            if (e.target.closest('.menu-btn')) return;
            ogrDetayAc(kart.dataset.id);
        });
    });
    listEl.querySelectorAll('.menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const r = DB.sonuclariGetir(_aktifSinavId).find(x => x.id === btn.dataset.id);
            sheetOnay(`"${r?.ogrenci?.adSoyad || 'Bu kayıt'}" silinsin mi?`, 'Bu işlem geri alınamaz.', () => {
                DB.sonucSil(_aktifSinavId, btn.dataset.id);
                kagitlariRender();
            });
        });
    });
}

// ════════════════════════════════════════════════════════════════
// ÖĞRENCİ / KAĞIT DETAY
// ════════════════════════════════════════════════════════════════
let _ogrDetayDersler = [];

function ogrDetayAc(sonucId) {
    _aktifSonucId = sonucId;
    const sonuc = DB.sonuclariGetir(_aktifSinavId).find(s => s.id === sonucId);
    if (!sonuc) return;

    const ogr = sonuc.ogrenci || {};
    document.getElementById('ogrDetayAd').textContent     = ogr.adSoyad || 'Kağıt Detayı';
    document.getElementById('ogrDetayAdSoyad').value = ogr.adSoyad || '';
    document.getElementById('ogrDetayNo').value      = ogr.ogrenciNo || '';
    document.getElementById('ogrDetaySinif').value   = ogr.sinif || '';

    // Resim (doğru/yanlış baloncuk renklendirmeli)
    ogrDetayResimCiz(sonuc);

    // Ders listesi
    _ogrDetayDersler = formDersleriniGetir(_aktifSinavId);
    const dersSecici = document.getElementById('ogrDetayDers');
    dersSecici.innerHTML = _ogrDetayDersler.map((d, i) => `<option value="${i}">${d.dersAdi}</option>`).join('');
    dersSecici.selectedIndex = 0;
    ogrDetayIzgaraCiz(sonuc);
    ogrDetayIstatistikGuncelle(sonuc);

    // İçerik/Resim sekme sıfırla
    document.querySelectorAll('.ir-sekme').forEach(b => b.classList.toggle('aktif', b.dataset.ir === 'icerik'));
    document.getElementById('irIcerik').classList.add('aktif');
    document.getElementById('irResim').classList.remove('aktif');

    ekranGit('ogrDetay');
}

/**
 * "Resim" sekmesinde taranan kağıt görüntüsünün ÜZERİNE, öğrencinin
 * işaretlediği/doğru cevabın hangi baloncuk olduğunu gösteren yarı
 * saydam renkli daireler çizer:
 *   - Yeşil: işaretlenen şık doğru
 *   - Kırmızı: işaretlenen şık yanlış
 *   - Sarı: yanlış (veya boş) cevaplı sorularda doğru şıkkın kendisi
 * "İçerik" sekmesindeki renklendirmeyle aynı mantığı kullanır.
 *
 * Baloncuk piksel koordinatları (sonuc.baloncukNoktalari) sadece bu
 * güncellemeden SONRA taranan kağıtlarda mevcuttur — eski kayıtlarda
 * yoksa düz görüntü gösterilir.
 * @param {object} sonuc
 */
function ogrDetayResimCiz(sonuc) {
    const resimAl = document.getElementById('ogrDetayResimAlani');
    if (!resimAl) return;

    if (!sonuc.kagitGoruntusu) {
        resimAl.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-faint);">Görüntü yok</div>';
        return;
    }

    if (!sonuc.baloncukNoktalari || !sonuc.baloncukNoktalari.length) {
        // Bu güncellemeden ÖNCE taranmış eski bir kayıt — baloncuk
        // koordinatı yok, düz görüntü göster.
        resimAl.innerHTML = `<img src="${sonuc.kagitGoruntusu}" alt="Taranan kağıt">`;
        return;
    }

    const anahtar = DB.anahtariGetir(_aktifSinavId);
    const dogruMapTum = {}; // "dersAdi|soruNo" -> doğru harf
    (anahtar.dersler || []).forEach(d => {
        (d.anahtarlar || []).forEach(a => { dogruMapTum[d.dersAdi + '|' + a.soruNo] = a.dogru; });
    });

    const cevaplar = sonuc.cevaplar || {};
    const kagitGoruntusu = sonuc.kagitGoruntusu;
    const baloncukNoktalari = sonuc.baloncukNoktalari;

    const img = new Image();
    img.onload = () => {
        // Ekran arada başka bir öğrenciye geçmiş olabilir — geç gelen
        // yükleme eski görüntüyü üzerine çizmesin.
        if (sonuc.id !== _aktifSonucId) return;

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        baloncukNoktalari.forEach(soru => {
            const dogruHarf = dogruMapTum[soru.ders + '|' + soru.soruNo];
            if (!dogruHarf) return; // bu soru için cevap anahtarı girilmemiş
            const isaretli = (cevaplar[soru.ders] || {})[soru.soruNo] || null;

            soru.sikler.forEach(sik => {
                let renk = null;
                if (isaretli && sik.harf === isaretli) {
                    renk = (isaretli === dogruHarf) ? 'rgba(76,175,80,0.55)' : 'rgba(244,67,54,0.55)';
                } else if (sik.harf === dogruHarf && isaretli !== dogruHarf) {
                    renk = 'rgba(255,193,7,0.6)'; // doğru cevap işareti (sarı)
                }
                if (!renk) return;
                ctx.beginPath();
                ctx.arc(sik.x, sik.y, sik.r, 0, Math.PI * 2);
                ctx.fillStyle = renk;
                ctx.fill();
            });
        });

        resimAl.innerHTML = '';
        resimAl.appendChild(canvas);
    };
    img.onerror = () => {
        resimAl.innerHTML = `<img src="${kagitGoruntusu}" alt="Taranan kağıt">`;
    };
    img.src = kagitGoruntusu;
}

/**
 * "Resim" sekmesindeki kağıt görüntüsüne (öğrenci detayında dokununca)
 * tam ekran, iki parmakla yakınlaştırılabilir/kaydırılabilir bir
 * görüntüleyici açar — js/duyurular.js'deki duyuruLightboxAcById ile
 * AYNI pinch-zoom/pan deseni (tek görsel, ok/sayaç yok).
 * @param {string} kaynakUrl - img.src ya da canvas.toDataURL() çıktısı
 */
function ogrDetayResimBuyutAc(kaynakUrl) {
    if (!kaynakUrl) return;
    const eski = document.getElementById('ogrResimBuyutOverlay');
    if (eski) eski.remove();

    const ov = document.createElement('div');
    ov.id = 'ogrResimBuyutOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,.92);display:flex;flex-direction:column;';
    ov.innerHTML = `
      <div style="display:flex;justify-content:flex-end;padding:10px;">
        <button id="orbKapat" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:20px;width:36px;height:36px;font-size:18px;cursor:pointer;">✕</button>
      </div>
      <div id="orbGovde" style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;touch-action:none;">
        <img id="orbResim" src="${kaynakUrl}" style="max-width:92%;max-height:92%;object-fit:contain;border-radius:6px;transform-origin:center center;">
      </div>
      <div style="text-align:center;color:rgba(255,255,255,.6);padding:10px;font-size:12px;">İki parmakla yakınlaştırın</div>
    `;
    document.body.appendChild(ov);

    ov.querySelector('#orbKapat').onclick = () => ov.remove();

    let zoom = 1, panX = 0, panY = 0;
    const resimEl = ov.querySelector('#orbResim');
    function transformUygula() {
        resimEl.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    }

    let baslangicX = null, baslangicY = null;
    let surukleniyor = false, panBaslX = 0, panBaslY = 0;
    let pinchBaslangic = 0, zoomBaslangic = 1;
    const govdeEl = ov.querySelector('#orbGovde');

    function mesafe(t1, t2) {
        const dx = t1.clientX - t2.clientX, dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    govdeEl.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            pinchBaslangic = mesafe(e.touches[0], e.touches[1]);
            zoomBaslangic = zoom;
            surukleniyor = false;
        } else if (e.touches.length === 1 && zoom > 1.02) {
            surukleniyor = true;
            baslangicX = e.touches[0].clientX;
            baslangicY = e.touches[0].clientY;
            panBaslX = panX; panBaslY = panY;
        }
    }, { passive: true });

    govdeEl.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            const m = mesafe(e.touches[0], e.touches[1]);
            zoom = Math.min(4, Math.max(1, zoomBaslangic * (m / pinchBaslangic)));
            if (zoom <= 1.02) { panX = 0; panY = 0; }
            transformUygula();
        } else if (e.touches.length === 1 && surukleniyor) {
            panX = panBaslX + (e.touches[0].clientX - baslangicX);
            panY = panBaslY + (e.touches[0].clientY - baslangicY);
            transformUygula();
        }
    }, { passive: true });

    govdeEl.addEventListener('touchend', () => { surukleniyor = false; });

    // Çift dokunma: yakınlaştır/eski haline döndür.
    let sonDokunma = 0;
    govdeEl.addEventListener('touchend', (e) => {
        const simdi = Date.now();
        if (simdi - sonDokunma < 300 && e.changedTouches.length === 1) {
            zoom = zoom > 1.02 ? 1 : 2.2;
            panX = 0; panY = 0;
            transformUygula();
        }
        sonDokunma = simdi;
    });
}

function ogrDetayIzgaraCiz(sonuc) {
    const dersSecici = document.getElementById('ogrDetayDers');
    const alan       = document.getElementById('ogrDetaySorular');
    if (!alan || !dersSecici || !_ogrDetayDersler.length) return;

    const idx     = parseInt(dersSecici.value || '0', 10);
    const ders    = _ogrDetayDersler[idx] || _ogrDetayDersler[0];
    const dersAdi = ders.dersAdi;

    const anahtar = DB.anahtariGetir(_aktifSinavId);
    const dKaydi  = (anahtar.dersler || []).find(d => d.dersAdi === dersAdi);
    const dogruMap = {};
    (dKaydi?.anahtarlar || []).forEach(a => { dogruMap[a.soruNo] = a.dogru; });

    const cevaplar     = sonuc.cevaplar || {};
    const dersCevaplar = cevaplar[dersAdi] || {};

    const harfler = [];
    for (let i = 0; i < ders.sikSayisi; i++) harfler.push(String.fromCharCode(65 + i));

    // DVB özeti
    let d = 0, y = 0, b = 0;
    for (let n = 1; n <= ders.soruSayisi; n++) {
        const isr = dersCevaplar[n] || null;
        const dg  = dogruMap[n] || null;
        if (!isr) b++; else if (dg && isr === dg) d++; else y++;
    }
    const dvbEl = document.getElementById('ogrDetayDersDvb');
    if (dvbEl) dvbEl.innerHTML =
        `<span style="color:#4CAF50;">D:${d}</span>
         <span style="color:#F44336;">Y:${y}</span>
         <span>B:${b}</span>`;

    alan.innerHTML = '';
    for (let soruNo = 1; soruNo <= ders.soruSayisi; soruNo++) {
        const isaretli = dersCevaplar[soruNo] || null;
        const dogru    = dogruMap[soruNo] || null;
        const anahtarVar = !!dogru;

        const satir = document.createElement('div');
        satir.className = 'ogr-soru-satiri';

        const no = document.createElement('span');
        no.className = 'soru-no';
        if (anahtarVar && !isaretli)      no.style.color = 'var(--text-faint)';
        else if (anahtarVar && isaretli === dogru) no.style.color = '#4CAF50';
        else if (anahtarVar && isaretli !== dogru) no.style.color = '#F44336';
        no.textContent = soruNo + ')';
        satir.appendChild(no);

        const grup = document.createElement('div');
        grup.className = 'sik-grubu';
        harfler.forEach(harf => {
            const btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'sik-daire'; btn.textContent = harf;
            if (anahtarVar) {
                if (isaretli === harf && dogru === harf) btn.classList.add('ogr-dogru');
                else if (isaretli === harf && dogru !== harf) btn.classList.add('ogr-yanlis');
                else if (dogru === harf) btn.classList.add('dogru-border');
            } else {
                if (isaretli === harf) btn.classList.add('manuel-sec');
            }
            btn.addEventListener('click', () => {
                const son = DB.sonuclariGetir(_aktifSinavId).find(s => s.id === _aktifSonucId);
                if (!son) return;
                if (!son.cevaplar) son.cevaplar = {};
                if (!son.cevaplar[dersAdi]) son.cevaplar[dersAdi] = {};
                const zaten = son.cevaplar[dersAdi][soruNo] === harf;
                son.cevaplar[dersAdi][soruNo] = zaten ? null : harf;
                son.puan = puanHesapla(son.cevaplar, DB.anahtariGetir(_aktifSinavId), _ogrDetayDersler, _sinavYanlisKatsayisi(_aktifSinavId));
                DB.sonucKaydet(_aktifSinavId, son);
                ogrDetayIzgaraCiz(son);
                ogrDetayResimCiz(son);
                ogrDetayIstatistikGuncelle(son);
            });
            grup.appendChild(btn);
        });
        satir.appendChild(grup);
        alan.appendChild(satir);
    }
}

function ogrDetayIstatistikGuncelle(sonuc) {
    const p = sonuc.puan || {};
    _s('ogrDetayNet',  p.toplamNet?.toFixed(2) ?? '0.0');
    const sinav = DB.sinaviBul(_aktifSinavId);
    _s('ogrDetayFormPuan', `${sinav?.optikFormAd || 'Net'}: ${p.toplamNet?.toFixed(1) ?? '—'}`);
    _s('ogrAltD', p.toplamD ?? 0);
    _s('ogrAltY', p.toplamY ?? 0);
    _s('ogrAltB', p.toplamB ?? 0);
    _s('ogrAltN', p.toplamNet?.toFixed(2) ?? '0.0');
}

function ogrDetayKaydet() {
    const son = DB.sonuclariGetir(_aktifSinavId).find(s => s.id === _aktifSonucId);
    if (!son) return;
    son.ogrenci = {
        ...son.ogrenci,
        adSoyad: document.getElementById('ogrDetayAdSoyad').value,
        ogrenciNo: document.getElementById('ogrDetayNo').value,
        sinif: document.getElementById('ogrDetaySinif').value,
    };
    DB.sonucKaydet(_aktifSinavId, son);
    kagitlariRender();
    ekranGit('sinavDetay');
}

// ── Öğrenci detay: numara girilince ad soyad / sınıfı otomatik doldur ──
function _ogrDetayNoIleAra() {
    const no = document.getElementById('ogrDetayNo').value.trim();
    if (!no) return;
    const bulunan = _manuelTumOgrenciler().find(o => String(o.ogrenciNo || '').trim() === no);
    if (!bulunan) return;
    document.getElementById('ogrDetayAdSoyad').value = bulunan.adSoyad || '';
    document.getElementById('ogrDetaySinif').value   = bulunan.sinifAd || '';
    document.getElementById('ogrDetayAd').textContent = bulunan.adSoyad || 'Kağıt Detayı';
}

// ════════════════════════════════════════════════════════════════
// PUAN HESAPLAMA
// ════════════════════════════════════════════════════════════════
/**
 * @param {number|null} yanlisKatsayisi - kaç yanlış 1 doğruyu götürür (varsayılan 3 —
 *        LGS/Bursluluk resmî kuralı). null/0 verilirse yanlış hiç puan kaybettirmez.
 *        DÜZELTME: burada eskiden sabit y/4 kullanılıyordu, bu LGS/Bursluluk'ın resmî
 *        y/3 kuralıyla ÇELİŞİYORDU (kart rozetindeki net ile öğrenci detayındaki net
 *        farklı çıkıyordu) — artık tek doğru kaynak burası, varsayılan 3'e düzeltildi.
 */
function puanHesapla(cevaplar, anahtar, dersler, yanlisKatsayisi = 3) {
    const cezaHesapla = (y) => (yanlisKatsayisi ? y / yanlisKatsayisi : 0);
    let topD = 0, topY = 0, topB = 0;
    const dersDetay = [];
    dersler.forEach(ders => {
        const dersAdi  = ders.dersAdi;
        const dKaydi   = (anahtar.dersler || []).find(d => d.dersAdi === dersAdi);
        const dogruMap = {};
        (dKaydi?.anahtarlar || []).forEach(a => { dogruMap[a.soruNo] = a.dogru; });
        const dersCevaplar = (cevaplar || {})[dersAdi] || {};
        let d = 0, y = 0, b = 0;
        for (let n = 1; n <= ders.soruSayisi; n++) {
            const isr = dersCevaplar[n] || null;
            const dg  = dogruMap[n] || null;
            if (!isr) b++; else if (dg && isr === dg) d++; else y++;
        }
        const net = d - cezaHesapla(y);
        topD += d; topY += y; topB += b;
        dersDetay.push({ dersAdi, d, y, b, net: parseFloat(net.toFixed(2)) });
    });
    const toplamNet = topD - cezaHesapla(topY);
    return { toplamD: topD, toplamY: topY, toplamB: topB, toplamNet: parseFloat(toplamNet.toFixed(2)), dersDetay };
}

/** Bir sınav kaydından, o sınavda kullanılacak yanlış cevap katsayısını okur (kayıtta yoksa 3 — LGS/Bursluluk resmî kuralı varsayılan olarak kullanılır). */
function _sinavYanlisKatsayisi(sinavId) {
    const sinav = DB.sinaviBul(sinavId);
    if (!sinav) return 3;
    return sinav.yanlisKatsayisi ?? 3;
}

// ════════════════════════════════════════════════════════════════
// LGS PUANI RAPORU (bkz. js/lgsPuanHesapla.js)
// ════════════════════════════════════════════════════════════════

/**
 * DB'de saklanan (sınav türüne göre GLOBAL) puan referans ayarını
 * (bazı alanları boş/null olabilir) LgsPuanHesapla'nın beklediği "harici"
 * formatına çevirir — yalnızca dolu (geçerli sayı) alanlar dahil edilir,
 * böylece eksik olanlar tahmini hesaplanmaya devam eder.
 * @param {string} sinavTuru - 'lgs' | 'bursluluk'
 */
function _lgsHariciVeriyiHazirla(sinavTuru) {
    const ayar = DB.puanReferansGetir(sinavTuru);
    const dersIstatistik = {};
    Object.keys(ayar.dersIstatistik || {}).forEach(dersAdi => {
        const d = ayar.dersIstatistik[dersAdi] || {};
        const ort = parseFloat(d.ortalama), std = parseFloat(d.stdSapma);
        if (Number.isFinite(ort) && Number.isFinite(std)) dersIstatistik[dersAdi] = { ortalama: ort, stdSapma: std };
    });
    const harici = { dersIstatistik };
    const minT = parseFloat(ayar.minTasp), maxT = parseFloat(ayar.maxTasp);
    if (Number.isFinite(minT)) harici.minTasp = minT;
    if (Number.isFinite(maxT)) harici.maxTasp = maxT;
    return harici;
}

function lgsPuanRaporunuAcVeGoster() {
    const sinav      = DB.sinaviBul(_aktifSinavId);
    const sinavTuru  = sinav?.optikFormId === 'bursluluk' ? 'bursluluk' : 'lgs';
    const dersler    = formDersleriniGetir(_aktifSinavId);
    const sonuclar   = DB.sonuclariGetir(_aktifSinavId);

    const bosEl      = document.getElementById('lgsBosAlan');
    const listEl     = document.getElementById('lgsOgrenciListesi');
    const kaynakEl   = document.getElementById('lgsKaynakEtiketi');
    const ayarBtn    = document.getElementById('btnLgsAyarToggle');
    if (!listEl) return;

    _s('lgsPuanBaslik', sinavTuru === 'bursluluk' ? 'İOKBS (Bursluluk) Puanı' : 'LGS Puanı');

    if (sinavTuru === 'bursluluk') {

        // ── Bursluluk (İOKBS): resmî yöntem, ortalama/std sapma/MinTASP/
        // MaxTASP normalde sınava giren öğrencilerin kendi verisinden
        // hesaplanır (bkz. ODSGM İOKBS Kılavuzu). Ama bu, sınıfta TEK
        // öğrenci varsa (ya da tüm öğrenciler eşit TASP aldıysa) standardizasyon
        // matematiksel olarak tanımsız kalır — o yüzden LGS'deki gibi
        // "Referans Verilerini Gir" paneli burada da açık: kullanıcı geçmiş
        // yıllardan bilinen (ya da tahmini) ortalama/std sapma/TASP aralığı
        // girerse, TEK öğrencinin netiyle bile bir puan hesaplanabilir —
        // dışarıdaki "sadece netlerimi giriyorum puanım çıkıyor" hesaplama
        // araçlarının yaptığı da tam olarak bu (geçmiş yıl istatistiklerine
        // dayalı simülasyon).
        if (ayarBtn) ayarBtn.style.display = '';

        const harici = _lgsHariciVeriyiHazirla('bursluluk');
        const rapor = window.LgsPuanHesapla?.sinavRaporuHesapla(sonuclar, dersler, harici, 'bursluluk');
        if (!rapor) return;

        _s('lgsOzetSayi', rapor.gecerliSayisi);
        _s('lgsOzetOrtalama', rapor.sinavOrtalamaMsp != null ? rapor.sinavOrtalamaMsp.toFixed(1) : '—');
        _s('lgsOzetOrtalamaEtiket', 'Sınav Ortalaması (İOKBS Puanı)');

        if (kaynakEl) {
            kaynakEl.textContent = rapor.standardizeEdilemedi
                ? 'İOKBS puanı hesaplanamıyor: standardizasyon için en az 2 farklı öğrenci sonucu (birbirinden farklı TASP) gerekiyor. "MEB Verilerini Gir" panelinden geçmiş yıl/tahmini ortalama-standart sapma-TASP aralığı girerseniz tek öğrenciyle de puan hesaplanabilir. Aşağıda yalnızca doğru/yanlış/boş/net görünüyor.'
                : (rapor.tamamiGercek
                    ? 'Girilen referans verileriyle (geçmiş yıl/tahmini ortalama-standart sapma-TASP aralığı) hesaplandı — resmî sonuçtan farklı olabilir.'
                    : 'İOKBS resmî yöntemiyle hesaplandı: Ham Puan = Doğru − Yanlış/3; ortalama, standart sapma ve TASP aralığı bu sınava giren öğrencilerin kendi verisinden alınır (bkz. ODSGM İOKBS Kılavuzu). Daha güvenilir bir tahmin için "MEB Verilerini Gir" panelinden geçmiş yıl değerlerini girebilirsiniz.');
            kaynakEl.className = 'lgs-kaynak-etiketi';
        }

        if (!rapor.gecerliSayisi) {
            bosEl.style.display = 'flex';
            listEl.innerHTML = '';
            ekranGit('lgsPuan');
            return;
        }
        bosEl.style.display = 'none';

        listEl.innerHTML = rapor.ogrenciler.map((o, i) => {
            const ogr = o.ogrenci || {};
            const detaySatirlari = o.dersPuanlari.map(d => `
            <span>${_h(d.dersAdi)}</span>
            <span>${d.net.toFixed(2)}</span>
            <span>SP ${d.standartPuan.toFixed(1)}</span>
            <span>×${d.katsayi} = ${d.agirlikliPuan.toFixed(1)}</span>
        `).join('');
            return `
        <div class="lgs-ogr-satir" data-idx="${i}">
            <div class="lgs-ogr-ust">
                <span class="lgs-ogr-sira">${i + 1}</span>
                <div class="lgs-ogr-ad">
                    <strong>${_h(ogr.adSoyad || 'İsimsiz')}</strong>
                    <small>${_h(ogr.sinif || '')}${ogr.sinif && ogr.ogrenciNo ? ' · ' : ''}${_h(ogr.ogrenciNo || '')}</small>
                </div>
                <span class="lgs-ogr-msp">${o.msp != null ? o.msp.toFixed(1) : '—'}</span>
            </div>
            <div class="lgs-ogr-detay">
                <span class="lgs-detay-baslik">Ders</span>
                <span class="lgs-detay-baslik">Net (HP)</span>
                <span class="lgs-detay-baslik">Standart</span>
                <span class="lgs-detay-baslik">Ağırlıklı</span>
                ${detaySatirlari}
            </div>
        </div>`;
        }).join('');

        listEl.querySelectorAll('.lgs-ogr-satir').forEach(satir => {
            satir.addEventListener('click', () => {
                satir.querySelector('.lgs-ogr-detay')?.classList.toggle('acik');
            });
        });

        ekranGit('lgsPuan');
        return;
    }

    // ── LGS: sabit katsayılı tahmini puan formülü (ana puan) + resmî
    // yöntemin (Türkiye ortalaması girilirse gerçek, girilmezse bu
    // sınavdan tahmini) MSP'si ikincil bilgi olarak gösterilir.
    if (ayarBtn) ayarBtn.style.display = '';

    const harici      = _lgsHariciVeriyiHazirla('lgs');
    const rapor       = window.LgsPuanHesapla?.sinavRaporuHesapla(sonuclar, dersler, harici, 'lgs');
    const sabitListe  = window.LgsPuanHesapla?.sinavRaporuSabitFormulHesapla(sonuclar) || [];
    if (!rapor) return;

    // Sabit formül puanına göre öğrenci -> puan eşlemesi (sonucId ile)
    const sabitPuanMap = {};
    sabitListe.forEach(s => { sabitPuanMap[s.sonucId] = s; });

    const sabitOrtalama = sabitListe.length
        ? sabitListe.reduce((a, s) => a + s.puan, 0) / sabitListe.length
        : 0;

    _s('lgsOzetSayi', rapor.gecerliSayisi);
    _s('lgsOzetOrtalama', sabitListe.length ? sabitOrtalama.toFixed(1) : '—');
    _s('lgsOzetOrtalamaEtiket', 'Sınav Ortalaması (Tahmini Puan)');

    if (kaynakEl) {
        kaynakEl.textContent = 'Sabit katsayılı tahmini puan formülü kullanıldı (Türkiye ortalaması gerektirmez — deneme sınavı için uygundur).';
        kaynakEl.className = 'lgs-kaynak-etiketi karma';
    }

    if (!rapor.gecerliSayisi) {
        bosEl.style.display = 'flex';
        listEl.innerHTML = '';
        ekranGit('lgsPuan');
        return;
    }
    bosEl.style.display = 'none';

    const istatistikMap = {};
    rapor.dersIstatistik.forEach(i => { istatistikMap[i.dersAdi] = i; });

    // Sıralama: sabit formül puanına göre büyükten küçüğe (bu artık ana puan)
    const siraliOgrenciler = rapor.ogrenciler.slice().sort((a, b) => {
        const pa = sabitPuanMap[a.sonucId]?.puan ?? -Infinity;
        const pb = sabitPuanMap[b.sonucId]?.puan ?? -Infinity;
        return pb - pa;
    });

    listEl.innerHTML = siraliOgrenciler.map((o, i) => {
        const ogr = o.ogrenci || {};
        const sabit = sabitPuanMap[o.sonucId];
        const detaySatirlari = o.dersPuanlari.map(d => {
            const kaynak = istatistikMap[d.dersAdi]?.kaynak || 'tahmini';
            const sabitDers = sabit?.dersNetleri.find(x => x.dersAdi === d.dersAdi);
            return `
            <span>${_h(d.dersAdi)}</span>
            <span>${d.net.toFixed(2)}</span>
            <span>×${sabitDers?.katsayi ?? '—'} = ${sabitDers ? sabitDers.katki.toFixed(1) : '—'}</span>
            <span>SP ${d.standartPuan.toFixed(1)} <span class="lgs-ders-rozet ${kaynak}">${kaynak === 'gercek' ? 'MEB' : 'tahmini'}</span></span>
        `;
        }).join('');
        return `
        <div class="lgs-ogr-satir" data-idx="${i}">
            <div class="lgs-ogr-ust">
                <span class="lgs-ogr-sira">${i + 1}</span>
                <div class="lgs-ogr-ad">
                    <strong>${_h(ogr.adSoyad || 'İsimsiz')}</strong>
                    <small>${_h(ogr.sinif || '')}${ogr.sinif && ogr.ogrenciNo ? ' · ' : ''}${_h(ogr.ogrenciNo || '')}</small>
                </div>
                <div class="lgs-ogr-puanlar">
                    <span class="lgs-ogr-sabit">${sabit ? sabit.puan.toFixed(1) : '—'}</span>
                    <span class="lgs-ogr-msp2">İst. MSP: ${o.msp != null ? o.msp.toFixed(1) : '—'}</span>
                </div>
            </div>
            <div class="lgs-ogr-detay">
                <span class="lgs-detay-baslik">Ders</span>
                <span class="lgs-detay-baslik">Net</span>
                <span class="lgs-detay-baslik">Sabit Katkı</span>
                <span class="lgs-detay-baslik">İst. Standart</span>
                ${detaySatirlari}
            </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.lgs-ogr-satir').forEach(satir => {
        satir.addEventListener('click', () => {
            satir.querySelector('.lgs-ogr-detay')?.classList.toggle('acik');
        });
    });

    ekranGit('lgsPuan');
}

/**
 * "MEB Verilerini Gir / Düzenle" panelini, sınavın dersleri ve DB'de kayıtlı
 * (varsa) değerlerle doldurarak render eder.
 */
/**
 * Bir sınav türü için ders satırları + genel (MinTASP/MaxTASP) satırının
 * HTML'ini üretir — hem rapor ekranındaki panelde hem de global
 * "Puan Referans Ayarları" sheet'inde (bkz. btnSinavlarMenu) ORTAK
 * kullanılır, tek bir yerden değiştirilebilsin diye.
 */
function _puanReferansIcerikHtml(sinavTuru) {
    const dersler = _formTuruDersleriniGetir(sinavTuru);
    const ayar = DB.puanReferansGetir(sinavTuru);
    const ortEtiket = sinavTuru === 'bursluluk' ? 'Referans Ortalama (geçmiş yıl/tahmini)' : 'Türkiye Ortalaması';

    const dersSatirlari = dersler.map(d => {
        const kayitli = (ayar.dersIstatistik || {})[d.dersAdi] || {};
        return `
        <div class="lgs-ayar-ders-satir">
            <span class="lgs-ayar-ders-baslik">${_h(d.dersAdi)} <small style="color:var(--text-faint);font-weight:400;">(katsayı ${window.LgsPuanHesapla?.dersKatsayisi(d.dersAdi, sinavTuru) ?? '?'})</small></span>
            <div class="lgs-ayar-inputlar">
                <label>${_h(ortEtiket)}
                    <input type="number" step="0.01" class="lgs-ayar-ort" data-ders="${_h(d.dersAdi)}" value="${kayitli.ortalama ?? ''}" placeholder="tahmini">
                </label>
                <label>Standart Sapma
                    <input type="number" step="0.01" class="lgs-ayar-std" data-ders="${_h(d.dersAdi)}" value="${kayitli.stdSapma ?? ''}" placeholder="tahmini">
                </label>
            </div>
        </div>`;
    }).join('');

    return `
        ${dersSatirlari}
        <div class="lgs-ayar-genel-satir">
            <label>MinTASP
                <input type="number" step="0.01" class="lgs-ayar-mintasp" value="${ayar.minTasp ?? ''}" placeholder="tahmini">
            </label>
            <label>MaxTASP
                <input type="number" step="0.01" class="lgs-ayar-maxtasp" value="${ayar.maxTasp ?? ''}" placeholder="tahmini">
            </label>
        </div>`;
}

/** Bir konteynerdeki (panel/sheet bölümü) inputlardan okuyup sinavTuru'ne göre GLOBAL kaydeder. */
function _puanReferansKaydet(konteyner, sinavTuru) {
    const dersIstatistik = {};
    konteyner.querySelectorAll('.lgs-ayar-ort').forEach(input => {
        const dersAdi = input.dataset.ders;
        const stdInput = konteyner.querySelector(`.lgs-ayar-std[data-ders="${CSS.escape(dersAdi)}"]`);
        const ort = input.value.trim(), std = stdInput?.value.trim();
        if (ort !== '' && std !== '') dersIstatistik[dersAdi] = { ortalama: parseFloat(ort), stdSapma: parseFloat(std) };
    });
    const minTaspVal = konteyner.querySelector('.lgs-ayar-mintasp')?.value.trim();
    const maxTaspVal = konteyner.querySelector('.lgs-ayar-maxtasp')?.value.trim();
    DB.puanReferansKaydet(sinavTuru, {
        dersIstatistik,
        minTasp: minTaspVal !== '' ? parseFloat(minTaspVal) : null,
        maxTasp: maxTaspVal !== '' ? parseFloat(maxTaspVal) : null,
    });
}

/** Bir kaydet butonuna kısa süreliğine "✓ Kaydedildi" yazdırıp eski hâline döndürür. */
function _kaydetButonuOnayGoster(btn, eskiMetin) {
    if (!btn) return;
    btn.textContent = '✓ Kaydedildi';
    setTimeout(() => { btn.textContent = eskiMetin; }, 1400);
}

/**
 * Sınav listesi ekranındaki ⋮ menüsünden açılan global "Puan Referans
 * Ayarları" sheet'i — LGS ve Bursluluk için ayrı ayrı, sınav TÜRÜNE göre
 * (tek seferlik, tüm sınavlarda geçerli) referans veri girişi sağlar.
 */
function puanReferansSheetAc() {
    const sheet = document.getElementById('sheetPuanReferans');
    if (!sheet) return;

    const bolumRender = (sinavTuru, alanId) => {
        const alan = document.getElementById(alanId);
        if (alan) alan.innerHTML = _puanReferansIcerikHtml(sinavTuru);
    };
    bolumRender('lgs', 'prLgsAlan');
    bolumRender('bursluluk', 'prBurslulukAlan');

    document.getElementById('btnPrLgsKaydet').onclick = (e) => {
        _puanReferansKaydet(document.getElementById('prLgsAlan'), 'lgs');
        _kaydetButonuOnayGoster(e.currentTarget, 'LGS Referanslarını Kaydet');
    };
    document.getElementById('btnPrBurslulukKaydet').onclick = (e) => {
        _puanReferansKaydet(document.getElementById('prBurslulukAlan'), 'bursluluk');
        _kaydetButonuOnayGoster(e.currentTarget, 'Bursluluk Referanslarını Kaydet');
    };
    document.getElementById('btnPuanReferansKapat').onclick = () => sheetKapat('sheetPuanReferans');

    sheetAc('sheetPuanReferans');
}

function _lgsAyarPaneliniRender() {
    const panel = document.getElementById('lgsAyarPanel');
    if (!panel || !_aktifSinavId) return;
    const sinav = DB.sinaviBul(_aktifSinavId);
    const sinavTuru = sinav?.optikFormId === 'bursluluk' ? 'bursluluk' : 'lgs';

    panel.innerHTML = `
        ${_puanReferansIcerikHtml(sinavTuru)}
        <button type="button" class="lgs-ayar-kaydet-btn" id="btnLgsAyarKaydet">Kaydet ve Yeniden Hesapla</button>
        <button type="button" class="lgs-ayar-temizle-btn" id="btnLgsAyarTemizle">Tüm girilen değerleri temizle (tahminiye dön)</button>
        <small class="lgs-ayar-not">Bu değerler ${sinavTuru === 'bursluluk' ? 'Bursluluk' : 'LGS'} türündeki TÜM sınavlarda kullanılır (Ayarlar ⋮ menüsünden de düzenlenebilir).</small>
    `;

    document.getElementById('btnLgsAyarKaydet').addEventListener('click', () => {
        _puanReferansKaydet(panel, sinavTuru);
        lgsPuanRaporunuAcVeGoster();
    });
    document.getElementById('btnLgsAyarTemizle').addEventListener('click', () => {
        DB.puanReferansKaydet(sinavTuru, { dersIstatistik: {}, minTasp: null, maxTasp: null });
        _lgsAyarPaneliniRender();
        lgsPuanRaporunuAcVeGoster();
    });
}

// ════════════════════════════════════════════════════════════════
// ANAHTAR SEKMESİ
// ════════════════════════════════════════════════════════════════
function anahtarPaneliniRender() {
    if (!_aktifSinavId) return;
    const dersler = formDersleriniGetir(_aktifSinavId);
    const dersSecici = document.getElementById('anahDersSecici');
    if (!dersSecici) return;
    dersSecici.innerHTML = dersler.map((d, i) =>
        `<option value="${i}">${d.dersAdi} (${d.soruSayisi} soru)</option>`
    ).join('');
    dersSecici.selectedIndex = 0;
    anahtarIzgaraCiz();
}

function anahtarIzgaraCiz() {
    if (!_aktifSinavId) return;
    const dersSecici = document.getElementById('anahDersSecici');
    const alan       = document.getElementById('anahSoruListesi');
    if (!dersSecici || !alan) return;
    const dersler = formDersleriniGetir(_aktifSinavId);
    const idx     = parseInt(dersSecici.value || '0', 10);
    const ders    = dersler[idx] || dersler[0];
    if (!ders) return;

    const anahtar = DB.anahtariGetir(_aktifSinavId);
    const dKaydi  = (anahtar.dersler || []).find(d => d.dersAdi === ders.dersAdi);
    const cevapMap = {};
    (dKaydi?.anahtarlar || []).forEach(a => { cevapMap[a.soruNo] = a.dogru; });

    const harfler = [];
    for (let i = 0; i < ders.sikSayisi; i++) harfler.push(String.fromCharCode(65 + i));

    alan.innerHTML = '';
    for (let soruNo = 1; soruNo <= ders.soruSayisi; soruNo++) {
        const secili = cevapMap[soruNo] || null;
        const satir = document.createElement('div');
        satir.className = 'anahtar-satir';

        const no = document.createElement('span');
        no.className = 'soru-no'; no.textContent = soruNo + ')'; satir.appendChild(no);

        const grup = document.createElement('div');
        grup.className = 'sik-grubu';
        harfler.forEach(harf => {
            const btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'sik-daire'; btn.textContent = harf;
            if (secili === harf) btn.classList.add('anahtar-sec');
            btn.addEventListener('click', () => {
                const zaten = btn.classList.contains('anahtar-sec');
                grup.querySelectorAll('.sik-daire').forEach(b => b.classList.remove('anahtar-sec'));
                const yeniCevap = zaten ? null : harf;
                if (!zaten) btn.classList.add('anahtar-sec');
                _anahtarCevapKaydet(ders.dersAdi, soruNo, yeniCevap);
                // Sonuçları yeniden hesapla
                _tumSonuclariYenidenHesapla();
            });
            grup.appendChild(btn);
        });
        satir.appendChild(grup);

        const silBtn = document.createElement('button');
        silBtn.className = 'menu-btn'; silBtn.type = 'button';
        silBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        silBtn.addEventListener('click', () => { _anahtarCevapKaydet(ders.dersAdi, soruNo, null); anahtarIzgaraCiz(); _tumSonuclariYenidenHesapla(); });
        satir.appendChild(silBtn);
        alan.appendChild(satir);
    }
}

function _anahtarCevapKaydet(dersAdi, soruNo, dogru) {
    const anahtar = DB.anahtariGetir(_aktifSinavId);
    if (!anahtar.dersler) anahtar.dersler = [];
    let ders = anahtar.dersler.find(d => d.dersAdi === dersAdi);
    if (!ders) { ders = { dersAdi, anahtarlar: [] }; anahtar.dersler.push(ders); }
    ders.anahtarlar = ders.anahtarlar.filter(a => a.soruNo !== soruNo);
    if (dogru) ders.anahtarlar.push({ soruNo, dogru });
    ders.anahtarlar.sort((a, b) => a.soruNo - b.soruNo);
    DB.anahtarKaydet(_aktifSinavId, anahtar);
}

function _tumSonuclariYenidenHesapla() {
    const anahtar = DB.anahtariGetir(_aktifSinavId);
    const dersler = formDersleriniGetir(_aktifSinavId);
    const yanlisKatsayisi = _sinavYanlisKatsayisi(_aktifSinavId);
    DB.sonuclariGetir(_aktifSinavId).forEach(sonuc => {
        sonuc.puan = puanHesapla(sonuc.cevaplar, anahtar, dersler, yanlisKatsayisi);
        DB.sonucKaydet(_aktifSinavId, sonuc);
    });
    if (_aktifSekme === 'kagitlar') kagitlariRender();
}

// ════════════════════════════════════════════════════════════════
// KAMERA
// ════════════════════════════════════════════════════════════════
let _seviyeAktif = false;
let _canliModAktif = false;   // canlı tarama modu açık mı (camera.js ile senkron tutulur)
let _canliKartZamanlayici = null;

function kameraAc() {
    const ov = document.getElementById('kameraOverlay');
    if (!ov) return;
    ov.hidden = false;
    const s = document.getElementById('start');
    if (s) s.click();
    _seviyeBaslat();
    document.getElementById('kameraFormAdi').textContent = DB.sinaviBul(_aktifSinavId)?.optikFormAd || 'LGS';
}

function kameraKapat() {
    const ov = document.getElementById('kameraOverlay');
    if (!ov) return;
    const st = document.getElementById('stop');
    if (st) st.click();
    ov.hidden = true;
    _seviyeKaldir();
    _canliModAktif = false;
    if (_canliKartZamanlayici) { clearTimeout(_canliKartZamanlayici); _canliKartZamanlayici = null; }
    const kart = document.getElementById('canliSonucKart');
    if (kart) kart.hidden = true;
    const ayarSheet = document.getElementById('kameraAyarSheet');
    if (ayarSheet) ayarSheet.hidden = true;
}

function _seviyeGuncelle(e) {
    const halka = document.getElementById('seviyeHalka');
    const nokta = document.getElementById('seviyeNokta');
    const mesaj = document.getElementById('seviyeMesaj');
    if (!halka || !nokta) return;
    const beta  = Math.max(-90, Math.min(90,  e.beta  || 0));
    const gamma = Math.max(-45, Math.min(45,  e.gamma || 0));
    const x = (gamma / 45) * 20, y = (beta / 90) * 20;
    const duz = Math.abs(beta) < 10 && Math.abs(gamma) < 10;
    nokta.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    halka.className = 'seviye-halka ' + (duz ? 'duz' : 'egik');
    nokta.className = 'seviye-nokta ' + (duz ? 'duz' : 'egik');
    if (mesaj) mesaj.textContent = duz ? '✓ Düz' : 'Düzleştirin';
}
function _seviyeBaslat() {
    if (_seviyeAktif) return;
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(r => {
            if (r === 'granted') { window.addEventListener('deviceorientation', _seviyeGuncelle); _seviyeAktif = true; }
        }).catch(() => {});
    } else {
        window.addEventListener('deviceorientation', _seviyeGuncelle);
        _seviyeAktif = true;
    }
}
function _seviyeKaldir() {
    if (!_seviyeAktif) return;
    window.removeEventListener('deviceorientation', _seviyeGuncelle);
    _seviyeAktif = false;
}

// OMR sonucu gelince
window.addEventListener('omrSonucHazir', e => {
    _omrSonucuisle(e.detail);
});
window.addEventListener('omrOkumaTamamlandi', () => {
    // Canlı tarama modunda kamerayı KAPATMA — döngü otomatik olarak
    // sıradaki kağıt için devam eder (bkz. camera.js _canliOtomatikOku).
    if (_canliModAktif) return;
    kameraKapat();
});

function _omrSonucuisle(raw) {
    if (!raw || !_aktifSinavId) return;
    const dersler = formDersleriniGetir(_aktifSinavId);
    const anahtar = DB.anahtariGetir(_aktifSinavId);

    // omrEngine dizi dondurur: [{ders, soruNo, isaretliSik}]
    // puanHesapla nesne bekler: {dersAdi: {soruNo: harf}}
    const cevaplarDizi = Array.isArray(raw.cevaplar) ? raw.cevaplar : [];
    const cevaplarNesne = {};
    cevaplarDizi.forEach(c => {
        if (!c.ders) return;
        if (!cevaplarNesne[c.ders]) cevaplarNesne[c.ders] = {};
        if (c.isaretliSik) cevaplarNesne[c.ders][c.soruNo] = c.isaretliSik;
    });

    // Numara: "0103" -> "103" (leading zero kaldir)
    const kimlik = Object.assign({}, raw.ogrenciKimlik || {});
    if (kimlik.ogrenciNo) {
        const parsed = parseInt(kimlik.ogrenciNo, 10);
        if (!isNaN(parsed)) kimlik.ogrenciNo = String(parsed);
    }

    // Ad soyad eslestir - ana uygulamadan ogrenci verisi varsa
    if (kimlik.ogrenciNo) {
        try {
            const ogrenciler = _manuelTumOgrenciler();
            const eslesme = ogrenciler.find(o =>
                String(parseInt(o.ogrenciNo || '0', 10)) === kimlik.ogrenciNo
            );
            if (eslesme) {
                kimlik.adSoyad = eslesme.adSoyad || kimlik.adSoyad || '';
                kimlik.sinif   = eslesme.sinifAd || kimlik.sinif || '';
            }
        } catch(e) {}
    }

    const sonuc = {
        id:            'sonuc_' + Date.now(),
        ogrenci:       kimlik,
        cevaplar:      cevaplarNesne,
        kagitGoruntusu:raw.kagitGoruntusu || null,
        baloncukNoktalari: raw.baloncukNoktalari || null,
        elleGirildi:   false,
        tarih:         new Date().toLocaleDateString('tr-TR'),
    };
    sonuc.puan = puanHesapla(sonuc.cevaplar, anahtar, dersler, _sinavYanlisKatsayisi(_aktifSinavId));

    // Aynı öğrencinin (öğrenci numarasıyla) bu sınav için daha önce
    // kaydedilmiş bir formu var mı? Varsa sessizce ikinci bir satır daha
    // eklemek yerine kullanıcıya SOR — "Kağıtlar" listesinde aynı
    // öğrenci için iki kayıt birden görünmesin (bkz. kullanıcı geri
    // bildirimi: aynı formu tekrar okutunca yeni kayıt oluşuyordu).
    const noStr = (kimlik.ogrenciNo || '').toString().trim();
    const mevcut = noStr
        ? DB.sonuclariGetir(_aktifSinavId).find(s => (s.ogrenci?.ogrenciNo || '').toString().trim() === noStr)
        : null;

    if (mevcut) {
        sheetOnay(
            `${mevcut.ogrenci?.adSoyad || 'Bu öğrencinin'} zaten kayıtlı bir optik formu var`,
            'Bu numaraya (' + noStr + ') ait bir kayıt zaten mevcut. Yeni taramayla önceki kayıt güncellensin mi? Vazgeçerseniz bu tarama kaydedilmez, önceki kayıt aynen kalır.',
            () => {
                sonuc.id = mevcut.id; // aynı id ile kaydet = DB.sonucKaydet üzerine yazar
                DB.sonucKaydet(_aktifSinavId, sonuc);
                kagitlariRender();
                if (_canliModAktif) _canliKartGoster(sonuc);
            },
            'Güncelle'
        );
        return;
    }

    DB.sonucKaydet(_aktifSinavId, sonuc);
    kagitlariRender();
    if (_canliModAktif) _canliKartGoster(sonuc);
}

/** Canlı tarama modunda: otomatik kaydedilen sonucu birkaç saniye gösteren kart. */
function _canliKartGoster(sonuc) {
    const kart = document.getElementById('canliSonucKart');
    if (!kart) return;
    const o = sonuc.ogrenci || {};
    _s('kskAd', o.adSoyad || '—');
    _s('kskNumara', o.ogrenciNo || '—');
    _s('kskSinif', o.sinif || '—');
    const p = sonuc.puan || {};
    const toplamSoru = (p.toplamD || 0) + (p.toplamY || 0) + (p.toplamB || 0);
    const yuzde = toplamSoru ? ((p.toplamD || 0) / toplamSoru * 100) : null;
    _s('kskPuan', yuzde != null ? yuzde.toFixed(1) : '—');
    _s('kskNet', p.toplamNet != null ? p.toplamNet.toFixed(2) : '—');
    kart.dataset.sonucId = sonuc.id;
    kart.hidden = false;

    if (_canliKartZamanlayici) clearTimeout(_canliKartZamanlayici);
    _canliKartZamanlayici = setTimeout(() => { kart.hidden = true; }, 3500);
}

// ════════════════════════════════════════════════════════════════
// MANUEL KAĞIT GİRİŞİ
// ════════════════════════════════════════════════════════════════
let _manuelCevaplar = {};
let _manuelDersler  = [];
let _manuelSeciliOgrenciId = null;

function manuelKagitAc() {
    _manuelCevaplar = {};
    _manuelDersler  = formDersleriniGetir(_aktifSinavId);
    _manuelSeciliOgrenciId = null;

    document.getElementById('manuelAdSoyad').value = '';
    document.getElementById('manuelNo').value = '';
    document.getElementById('manuelSinif').value = '';
    document.getElementById('manuelKitapcik').value = '';

    const sinav = DB.sinaviBul(_aktifSinavId);
    document.getElementById('manuelFormAdi').textContent = sinav?.optikFormAd || '—';
    document.getElementById('manuelNet').textContent = '0.0';

    const dersEl = document.getElementById('manuelDers');
    dersEl.innerHTML = _manuelDersler.map((d, i) => `<option value="${i}">${d.dersAdi}</option>`).join('');
    dersEl.selectedIndex = 0;

    // Sınıftan seç butonu — sadece ana uygulama içinden açıldığında (öğrenci verisi varsa) göster
    const siniftanSecWrap = document.getElementById('manuelSiniftanSecWrap');
    const sinifListesiKap = document.getElementById('manuelSinifListesi');
    if (siniftanSecWrap) siniftanSecWrap.style.display = veriKaynagi() ? 'block' : 'none';
    if (sinifListesiKap) { sinifListesiKap.style.display = 'none'; sinifListesiKap.innerHTML = ''; }

    manuelIzgaraCiz();
    _manuelIstatistikGuncelle();
    ekranGit('manuelKagit');
}

// ── Öğrenci no ile otomatik bulma ──
function _manuelTumOgrenciler() {
    const kaynak = veriKaynagi();
    if (!kaynak) return [];
    try {
        const siniflar = kaynak.siniflarGetir() || [];
        const tum = [];
        siniflar.forEach(s => {
            (kaynak.ogrencilerGetir(s.id) || []).forEach(o => tum.push({ ...o, sinifAd: s.ad }));
        });
        return tum;
    } catch { return []; }
}

function _manuelOgrenciSecimiUygula(o) {
    document.getElementById('manuelNo').value = o.ogrenciNo || '';
    document.getElementById('manuelAdSoyad').value = o.adSoyad || '';
    document.getElementById('manuelSinif').value = o.sinifAd || '';
    _manuelSeciliOgrenciId = o.id || null;
    const sinifListesiKap = document.getElementById('manuelSinifListesi');
    if (sinifListesiKap) sinifListesiKap.style.display = 'none';
}

function _manuelNoIleAra() {
    const no = document.getElementById('manuelNo').value.trim();
    if (!no) return;
    const bulunan = _manuelTumOgrenciler().find(o => String(o.ogrenciNo || '').trim() === no);
    if (bulunan) _manuelOgrenciSecimiUygula(bulunan);
}

// ── Sınıf seç → öğrenci listesi ──
function _manuelSinifListesiRender() {
    const kap = document.getElementById('manuelSinifListesi');
    const kaynak = veriKaynagi();
    if (!kap || !kaynak) return;
    const siniflar = kaynak.siniflarGetir() || [];
    if (!siniflar.length) { kap.innerHTML = '<p class="ogr-secim-bilgi">Sınıf bulunamadı.</p>'; return; }
    kap.innerHTML = siniflar.map(s => {
        const ogrenciler = kaynak.ogrencilerGetir(s.id) || [];
        return `<div class="sinif-grup">
            <div class="sinif-baslik" data-sinif="${s.id}">
                <span style="flex:1;"><strong>${_h(s.ad)}</strong></span>
                <small>${ogrenciler.length} öğrenci</small>
                <svg width="16" height="16" class="sinif-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div class="ogr-secim-listesi-kap" id="manuelOgrListeKap_${s.id}">
                ${ogrenciler.map(o => `
                    <div class="ogr-secim-satir manuel-ogr-satir" data-ogr="${o.id}">
                        <label style="flex:1;">${_h(o.adSoyad)}</label>
                        <small>${o.ogrenciNo || ''}</small>
                    </div>`).join('')}
            </div>
        </div>`;
    }).join('');

    kap.querySelectorAll('.sinif-baslik').forEach(baslik => {
        baslik.addEventListener('click', () => {
            document.getElementById('manuelOgrListeKap_' + baslik.dataset.sinif)?.classList.toggle('acik');
        });
    });
    kap.querySelectorAll('.manuel-ogr-satir').forEach(satir => {
        satir.addEventListener('click', () => {
            const o = _manuelTumOgrenciler().find(x => x.id === satir.dataset.ogr);
            if (o) { _manuelOgrenciSecimiUygula(o); _manuelIstatistikGuncelle(); }
        });
    });
}

function _manuelSiniftanSecToggle() {
    const kap = document.getElementById('manuelSinifListesi');
    if (!kap) return;
    const acilacak = kap.style.display === 'none';
    if (acilacak && !kap.innerHTML) _manuelSinifListesiRender();
    kap.style.display = acilacak ? 'block' : 'none';
}

function manuelIzgaraCiz() {
    const dersEl = document.getElementById('manuelDers');
    const alan   = document.getElementById('manuelSorular');
    if (!alan || !dersEl || !_manuelDersler.length) return;
    const idx     = parseInt(dersEl.value || '0', 10);
    const ders    = _manuelDersler[idx] || _manuelDersler[0];
    const dersAdi = ders.dersAdi;
    if (!_manuelCevaplar[dersAdi]) _manuelCevaplar[dersAdi] = {};
    const secimler = _manuelCevaplar[dersAdi];
    const harfler  = []; for (let i = 0; i < ders.sikSayisi; i++) harfler.push(String.fromCharCode(65 + i));

    alan.innerHTML = '';
    for (let soruNo = 1; soruNo <= ders.soruSayisi; soruNo++) {
        const secili = secimler[soruNo] || null;
        const satir = document.createElement('div'); satir.className = 'ogr-soru-satiri';
        const no = document.createElement('span'); no.className = 'soru-no'; no.textContent = soruNo + ')'; satir.appendChild(no);
        const grup = document.createElement('div'); grup.className = 'sik-grubu';
        harfler.forEach(harf => {
            const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'sik-daire'; btn.textContent = harf;
            if (secili === harf) btn.classList.add('manuel-sec');
            btn.addEventListener('click', () => {
                const zaten = secimler[soruNo] === harf;
                secimler[soruNo] = zaten ? null : harf;
                manuelIzgaraCiz(); _manuelIstatistikGuncelle();
            });
            grup.appendChild(btn);
        });
        satir.appendChild(grup); alan.appendChild(satir);
    }
}

function _manuelIstatistikGuncelle() {
    const anahtar = DB.anahtariGetir(_aktifSinavId);
    const p = puanHesapla(_manuelCevaplar, anahtar, _manuelDersler, _sinavYanlisKatsayisi(_aktifSinavId));
    _s('manuelD', p.toplamD); _s('manuelY', p.toplamY); _s('manuelB', p.toplamB);
    _s('manuelN', p.toplamNet?.toFixed(2) ?? '0.0');
    _s('manuelNet', p.toplamNet?.toFixed(2) ?? '0.0');
}

function manuelKaydet() {
    const dersler = formDersleriniGetir(_aktifSinavId);
    const anahtar = DB.anahtariGetir(_aktifSinavId);
    const sonuc = {
        id:          'sonuc_' + Date.now(),
        ogrenci: {
            adSoyad:   document.getElementById('manuelAdSoyad').value,
            ogrenciNo: document.getElementById('manuelNo').value,
            sinif:     document.getElementById('manuelSinif').value,
            kitapcikTuru: document.getElementById('manuelKitapcik').value,
            ogrenciId: _manuelSeciliOgrenciId || '',
        },
        cevaplar:    _manuelCevaplar,
        kagitGoruntusu: null,
        elleGirildi: true,
        tarih:       new Date().toLocaleDateString('tr-TR'),
    };
    sonuc.puan = puanHesapla(sonuc.cevaplar, anahtar, dersler, _sinavYanlisKatsayisi(_aktifSinavId));
    DB.sonucKaydet(_aktifSinavId, sonuc);
    kagitlariRender();
    ekranGit('sinavDetay');
}

// ════════════════════════════════════════════════════════════════
// OPTİK FORM OLUŞTUR
// ════════════════════════════════════════════════════════════════
async function optikOlusturAc() {
    document.getElementById('optikOlusturDurum').textContent = '';
    ekranGit('optikOlustur');
}

/** layoutHesapla() için doğru parametreleri üretir — Özel sınavlarda kendi soru/şık sayısını da ekler. */
function _layoutParamlariHazirla(sinav) {
    if (sinav?.optikFormId === 'ozel') {
        return { sinavTuru: 'ozel', soruSayisi: sinav.soruSayisi || 20, sikSayisi: sinav.sikSayisi || 4, sayfaDuzeni: 'otomatik' };
    }
    return { sinavTuru: sinav?.optikFormId };
}

async function bosFormOlustur() {
    const sinav   = DB.sinaviBul(_aktifSinavId);
    const durumEl = document.getElementById('optikOlusturDurum');
    if (!sinav) return;
    durumEl.textContent = 'Oluşturuluyor...';
    try {
        const layout = window.LayoutEngine.layoutHesapla(_layoutParamlariHazirla(sinav));
        const { formPdfOlustur } = await import('./pdfFormGenerator.js');
        const doc = await formPdfOlustur(layout, {
            adSoyad: '', ogrenciNo: '', sinif: '',
            sinavAdi: sinav.ad, kitapcikTuru: '', ogrenciId: '', sinavId: sinav.optikFormId
        });
        const dosyaAdi = sinav.ad.replace(/\s+/g, '_') + '_bos.pdf';
        if (window.DisaAktar && typeof window.DisaAktar.dosyaKaydet === 'function') {
            window.DisaAktar.dosyaKaydet(
                doc.output('datauristring').split(',')[1],
                dosyaAdi,
                'application/pdf',
                () => doc.save(dosyaAdi)
            );
        } else {
            doc.save(dosyaAdi);
        }
        durumEl.textContent = '✅ PDF indirildi.';
    } catch (e) { durumEl.textContent = '❌ Hata: ' + e.message; }
}

async function ogrencilerIcinFormOlustur() {
    const sinav   = DB.sinaviBul(_aktifSinavId);
    const durumEl = document.getElementById('optikOlusturDurum');
    if (!sinav || !sinav.ogrenciIdleri?.length) { alert('Bu sınava öğrenci eklenmemiş.'); return; }
    durumEl.textContent = 'Oluşturuluyor...';
    try {
        const kaynak = veriKaynagi();
        if (!kaynak) { alert('Uygulama içinden açılması gerekiyor.'); return; }
        const layout = window.LayoutEngine.layoutHesapla(_layoutParamlariHazirla(sinav));
        const { topluFormPdfOlustur } = await import('./pdfFormGenerator.js');
        // Seçilen öğrencilerin bilgilerini topla
        const ogrList = [];
        kaynak.siniflarGetir().forEach(s => {
            kaynak.ogrencilerGetir(s.id).forEach(o => {
                if (sinav.ogrenciIdleri.includes(o.id)) {
                    ogrList.push({ adSoyad: o.adSoyad, ogrenciNo: o.ogrenciNo, sinif: s.ad, sinavAdi: sinav.ad, kitapcikTuru: '', ogrenciId: o.id, sinavId: sinav.optikFormId });
                }
            });
        });
        if (!ogrList.length) { alert('Öğrenci bilgisi bulunamadı.'); durumEl.textContent = ''; return; }
        durumEl.textContent = `Oluşturuluyor... (${ogrList.length} öğrenci)`;
        const doc = await topluFormPdfOlustur(layout, ogrList);
        const dosyaAdi = sinav.ad.replace(/\s+/g, '_') + '_ogrenciler.pdf';
        if (window.DisaAktar && typeof window.DisaAktar.dosyaKaydet === 'function') {
            window.DisaAktar.dosyaKaydet(
                doc.output('datauristring').split(',')[1],
                dosyaAdi,
                'application/pdf',
                () => doc.save(dosyaAdi)
            );
        } else {
            doc.save(dosyaAdi);
        }
        durumEl.textContent = `✅ ${ogrList.length} öğrenci için PDF indirildi.`;
    } catch (e) { durumEl.textContent = '❌ Hata: ' + e.message; }
}

// ════════════════════════════════════════════════════════════════
// BOTTOM SHEETS
// ════════════════════════════════════════════════════════════════
function sheetAc(id)   { const el = document.getElementById(id); if (el) el.hidden = false; }
function sheetKapat(id){ const el = document.getElementById(id); if (el) el.hidden = true; }

function sheetOnay(baslik, metin, onayFn, onaylaEtiket) {
    _s('sheetOnayBaslik', baslik);
    _s('sheetOnayMetin', metin);
    const onaylaBtn = document.getElementById('sheetOnayOnayla');
    if (onaylaBtn) onaylaBtn.textContent = onaylaEtiket || 'Sil';
    document.getElementById('sheetOnayOnayla').onclick = () => { sheetKapat('sheetOnay'); onayFn(); };
    sheetAc('sheetOnay');
}

function optikFormSheetAc(onSecim) {
    const liste = document.getElementById('optikFormSeciciListesi');
    if (liste) {
        liste.innerHTML = SABLONLAR.map(s => `
            <button class="bs-liste-satir" data-id="${s.id}">
                <div class="bs-liste-ikon" style="background:#E3F2FD;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E88E5" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div class="bs-liste-bilgi">
                    <strong>${_h(s.ad)}</strong>
                    <small>${s.soruSayisi ? s.soruSayisi + ' Soru' : 'Soru sayısını kendin belirle'}</small>
                </div>
            </button>`).join('');
        liste.querySelectorAll('.bs-liste-satir').forEach(btn => {
            btn.addEventListener('click', () => {
                sheetKapat('sheetOptikForm');
                onSecim(SABLONLAR.find(s => s.id === btn.dataset.id));
            });
        });
    }
    sheetAc('sheetOptikForm');
}

// ════════════════════════════════════════════════════════════════
// GALERİ
// ════════════════════════════════════════════════════════════════
function galeriSecimIsle(dosyalar) {
    if (!dosyalar?.length) return;
    sheetKapat('sheetKagitEkle');
    // galeriSecici.js baglaGaleriSecici fonksiyonu kullanılıyor
    // Her dosya için omrEngine ile işle
    Array.from(dosyalar).forEach(async dosya => {
        const reader = new FileReader();
        reader.onload = async e => {
            const img = new Image();
            img.onload = async () => {
                const cvs = document.getElementById('canvas');
                cvs.width = img.width; cvs.height = img.height;
                cvs.getContext('2d').drawImage(img, 0, 0);
                try {
                    // galeriSecici.js flow'u kullaniliyor - bu satir kaldirildi
                    // formOkuyucu.js ile işle
                    const { formuOkuVeGoster } = await import('./formOkuyucu.js');
                    await formuOkuVeGoster('canvas', 'resultCanvas', 'statusText', 'hataKutusu');
                } catch(err) { console.error('Galeri okuma hatası', err); }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(dosya);
    });
}

// ════════════════════════════════════════════════════════════════
// ANAHTAR EXCEL İÇE/DIŞA AKTAR
// ════════════════════════════════════════════════════════════════
async function anahtarExcelYukle(dosya) {
    try {
        // Önce eski CevapAnahtari modülünü dene
        const kaynak = window.CevapAnahtari;
        if (kaynak?.exceldenYukle) {
            await kaynak.exceldenYukle(dosya);
            const a = kaynak.getir?.();
            if (a?.dersler?.length) { DB.anahtarKaydet(_aktifSinavId, a); anahtarIzgaraCiz(); _tumSonuclariYenidenHesapla(); return; }
        }
        // CSV fallback
        const metin = await dosya.text();
        const satirlar = metin.split('\n').filter(s => s.trim());
        const baslikSatir = satirlar[0].toLowerCase();
        const dersIdx  = baslikSatir.split(',').findIndex(h => h.includes('ders'));
        const soruIdx  = baslikSatir.split(',').findIndex(h => h.includes('soru') || h.includes('no'));
        const cevapIdx = baslikSatir.split(',').findIndex(h => h.includes('cevap') || h.includes('doğru') || h.includes('dogru'));
        if (dersIdx < 0 || soruIdx < 0 || cevapIdx < 0) { alert('CSV formatı tanınmadı. Beklenen sütunlar: Ders, Soru No, Doğru Cevap'); return; }
        const yeniAnahtar = { dersler: [] };
        satirlar.slice(1).forEach(satir => {
            const huc = satir.split(',');
            const dersAdi = (huc[dersIdx] || '').trim();
            const soruNo  = parseInt((huc[soruIdx] || '').trim(), 10);
            const dogru   = (huc[cevapIdx] || '').trim().toUpperCase();
            if (!dersAdi || !soruNo || !dogru) return;
            let ders = yeniAnahtar.dersler.find(d => d.dersAdi === dersAdi);
            if (!ders) { ders = { dersAdi, anahtarlar: [] }; yeniAnahtar.dersler.push(ders); }
            ders.anahtarlar.push({ soruNo, dogru });
        });
        DB.anahtarKaydet(_aktifSinavId, yeniAnahtar);
        anahtarIzgaraCiz();
        _tumSonuclariYenidenHesapla();
        alert(`✅ ${yeniAnahtar.dersler.reduce((t, d) => t + d.anahtarlar.length, 0)} soru cevabı yüklendi.`);
    } catch (e) { alert('İçe aktarma hatası: ' + e.message); }
}

async function anahtarDisaAktar() {
    const anahtar = DB.anahtariGetir(_aktifSinavId);
    const derslerDolu = (anahtar.dersler || []).filter(d => d.anahtarlar?.length);
    if (!derslerDolu.length) { alert('Dışa aktarılacak cevap anahtarı yok.'); return; }

    // SheetJS ile xlsx oluştur
    if (!window.XLSX) {
        await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
        });
    }

    const satirlar = [['Ders', 'Soru No', 'Doğru Cevap']];
    derslerDolu.forEach(d => d.anahtarlar.forEach(a => {
        satirlar.push([d.dersAdi, a.soruNo, a.dogru]);
    }));

    const ws = XLSX.utils.aoa_to_sheet(satirlar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cevap Anahtarı');
    const dosyaAdi = (DB.sinaviBul(_aktifSinavId)?.ad || 'anahtar') + '_cevap_anahtari.xlsx';
    XLSX.writeFile(wb, dosyaAdi);
}

// ════════════════════════════════════════════════════════════════
// BAŞLAT — TÜM OLAY DİNLEYİCİLERİ
// ════════════════════════════════════════════════════════════════
function baslat() {
    // ── Ekran 1: Sınavlar ──
    sinavlariRender();
    document.getElementById('fabYeniSinav').addEventListener('click', yeniSinavAc);
    document.getElementById('btnSinavlarMenu').addEventListener('click', puanReferansSheetAc);

    // ── Ekran 2: Yeni Sınav ──
    document.getElementById('btnYeniSinavKapat').addEventListener('click', () => ekranGit('sinavlar'));
    document.getElementById('btnYeniSinavKaydet').addEventListener('click', yeniSinavKaydet);
    document.getElementById('ysOptikFormSec').addEventListener('click', () => {
        optikFormSheetAc(sablon => {
            _ysSablonSecilen = sablon;
            const metEl = document.getElementById('ysOptikFormAdi');
            metEl.textContent = sablon.soruSayisi ? `${sablon.ad} (${sablon.soruSayisi} Soru)` : sablon.ad;
            metEl.style.color = 'var(--text)';
            const ozelBlok = document.getElementById('ysOzelAyarBlok');
            if (ozelBlok) ozelBlok.hidden = sablon.id !== 'ozel';
        });
    });

    // ── Ekran 3: Sınav Detay ──
    document.getElementById('btnSinavDetayGeri').addEventListener('click', () => { _aktifSinavId = null; ekranGit('sinavlar'); sinavlariRender(); });
    document.getElementById('btnOptikOlustur').addEventListener('click', optikOlusturAc);

    // Sekmeler
    document.querySelectorAll('#sekmeBar .sekme').forEach(btn =>
        btn.addEventListener('click', () => {
            sekmeAktiflestir(btn.dataset.sekme);
            if (btn.dataset.sekme === 'anahtar') anahtarIzgaraCiz();
        })
    );

    // Kağıtlar FABları
    document.getElementById('fabKamera').addEventListener('click', kameraAc);
    document.getElementById('fabKagitEkle').addEventListener('click', () => sheetAc('sheetKagitEkle'));
    document.getElementById('btnPuanYenidenHesapla')?.addEventListener('click', function () {
        this.classList.remove('donuyor');
        void this.offsetWidth; // animasyonu sıfırla, tekrar tetikleyebilmek için
        this.classList.add('donuyor');
        _tumSonuclariYenidenHesapla();
    });

    // ── Ekran 4: Öğrenci Detay ──
    document.getElementById('btnOgrDetayGeri').addEventListener('click', () => { _aktifSonucId = null; ekranGit('sinavDetay'); });
    document.getElementById('btnOgrDetayKaydet').addEventListener('click', ogrDetayKaydet);
    // Kağıt görüntüsüne dokununca tam ekran yakınlaştırılabilir görüntüleyici
    // aç — içerik dinamik olarak img/canvas olarak değiştiği için delege
    // (event delegation) kullanılıyor, o an ne varsa onun kaynağını alır.
    document.getElementById('ogrDetayResimAlani').addEventListener('click', (e) => {
        const img = e.currentTarget.querySelector('img');
        const canvas = e.currentTarget.querySelector('canvas');
        const kaynak = canvas ? canvas.toDataURL('image/png') : (img ? img.src : null);
        if (kaynak) ogrDetayResimBuyutAc(kaynak);
    });
    document.getElementById('ogrDetayNo').addEventListener('change', _ogrDetayNoIleAra);
    document.getElementById('ogrDetayNo').addEventListener('blur', _ogrDetayNoIleAra);
    document.getElementById('ogrDetayDers').addEventListener('change', () => {
        const son = DB.sonuclariGetir(_aktifSinavId).find(s => s.id === _aktifSonucId);
        if (son) ogrDetayIzgaraCiz(son);
    });
    document.querySelectorAll('.ir-sekme').forEach(btn =>
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ir-sekme').forEach(b => b.classList.toggle('aktif', b === btn));
            document.getElementById('irIcerik').classList.toggle('aktif', btn.dataset.ir === 'icerik');
            document.getElementById('irResim').classList.toggle('aktif', btn.dataset.ir === 'resim');
        })
    );
    // Pill sil butonları (öğrenci detay + manuel)
    document.querySelectorAll('.pill-sil').forEach(btn =>
        btn.addEventListener('click', () => {
            const el = document.getElementById(btn.dataset.h);
            if (el) el.value = '';
            if (['manuelNo', 'manuelAdSoyad', 'manuelSinif'].includes(btn.dataset.h)) _manuelSeciliOgrenciId = null;
        })
    );

    // ── Ekran 5: Optik Oluştur ──
    document.getElementById('btnOptikOlusturGeri').addEventListener('click', () => ekranGit('sinavDetay'));
    document.getElementById('btnBosForm').addEventListener('click', bosFormOlustur);
    document.getElementById('btnOgrencilerIcinForm').addEventListener('click', ogrencilerIcinFormOlustur);

    // ── Ekran 6: Manuel Kağıt ──
    document.getElementById('btnManuelKapat').addEventListener('click', () => ekranGit('sinavDetay'));
    document.getElementById('btnLgsPuanGeri').addEventListener('click', () => ekranGit('sinavDetay'));
    document.getElementById('btnLgsAyarToggle').addEventListener('click', () => {
        const panel = document.getElementById('lgsAyarPanel');
        if (!panel) return;
        const acilacak = panel.style.display === 'none';
        if (acilacak) _lgsAyarPaneliniRender();
        panel.style.display = acilacak ? 'flex' : 'none';
    });
    document.getElementById('btnManuelKaydet').addEventListener('click', manuelKaydet);
    document.getElementById('manuelDers').addEventListener('change', manuelIzgaraCiz);
    document.getElementById('btnManuelSiniftanSec').addEventListener('click', _manuelSiniftanSecToggle);
    document.getElementById('manuelNo').addEventListener('change', _manuelNoIleAra);
    document.getElementById('manuelNo').addEventListener('blur', _manuelNoIleAra);
    // Elle sınıf/ad değiştirilirse artık listeden gelen eşleşme geçersiz sayılır
    document.getElementById('manuelAdSoyad').addEventListener('input', () => { _manuelSeciliOgrenciId = null; });

    // ── Kamera ──
    document.getElementById('kameraKapatBtn').addEventListener('click', kameraKapat);
    // galeriInput -> baglaGaleriSecici asagida bagliyor

    // ── Bottom sheets ──
    document.getElementById('sheetKagitEkle').addEventListener('click', e => { if (e.target === e.currentTarget) sheetKapat('sheetKagitEkle'); });
    document.getElementById('sheetOptikForm').addEventListener('click', e => { if (e.target === e.currentTarget) sheetKapat('sheetOptikForm'); });
    document.getElementById('sheetOnay').addEventListener('click', e => { if (e.target === e.currentTarget) sheetKapat('sheetOnay'); });
    document.getElementById('sheetPuanReferans').addEventListener('click', e => { if (e.target === e.currentTarget) sheetKapat('sheetPuanReferans'); });
    document.getElementById('sheetOnayIptal').addEventListener('click', () => sheetKapat('sheetOnay'));
    document.getElementById('bsGaleri').addEventListener('click', () => {
        sheetKapat('sheetKagitEkle');
        const inp = document.getElementById('galeriInputSheet');
        if (inp) inp.click();
    });
    // galeriInputSheet -> baglaGaleriSecici asagida bagliyor
    document.getElementById('bsManuel').addEventListener('click', () => { sheetKapat('sheetKagitEkle'); manuelKagitAc(); });

    // ── Anahtar araçlar ──
    document.getElementById('anahDersSecici').addEventListener('change', anahtarIzgaraCiz);
    document.getElementById('anahtarExcelInput').addEventListener('change', function () {
        if (this.files[0]) anahtarExcelYukle(this.files[0]); this.value = '';
    });
    document.getElementById('btnAnahtarDisaAktar').addEventListener('click', anahtarDisaAktar);
    document.getElementById('btnAnahtarTemizle').addEventListener('click', () => {
        sheetOnay('Cevap anahtarı silinsin mi?', 'Bu işlem geri alınamaz.', () => {
            DB.anahtarKaydet(_aktifSinavId, { dersler: [] });
            anahtarIzgaraCiz(); _tumSonuclariYenidenHesapla();
        });
    });
    document.getElementById('btnMiniAnahtar').addEventListener('click', () => alert('Mini cevap anahtarı yakında'));

    // Raporlar
    document.querySelectorAll('.rapor-satir').forEach(btn =>
        btn.addEventListener('click', async () => {
            const r = btn.dataset.rapor;
            if (r === 'excel') {
                const sonuclar = DB.sonuclariGetir(_aktifSinavId);
                const { DisaAktar } = await import('./disaAktar.js').catch(() => ({ DisaAktar: window.DisaAktar }));
                (DisaAktar || window.DisaAktar)?.excelIndir?.(sonuclar, { sinavAdi: DB.sinaviBul(_aktifSinavId)?.ad });
            } else if (r === 'lgs') {
                lgsPuanRaporunuAcVeGoster();
            } else { alert(`"${btn.querySelector('span').textContent}" raporu yakında eklenecek.`); }
        })
    );

    // galeriSecici.js bağla - hem kamera overlay hem bottom sheet
    baglaGaleriSecici('galeriInput', 'canvas');
    baglaGaleriSecici('galeriInputSheet', 'canvas');

    // Kamera start/stop butonları
    import('./camera.js').then(mod => {
        const startBtn = document.getElementById('start');
        const stopBtn  = document.getElementById('stop');
        const captureBtn = document.getElementById('capture');
        const statusEl = document.getElementById('statusText');
        if (startBtn) startBtn.addEventListener('click', async () => {
            try {
                statusEl.textContent = 'Kamera açılıyor...';
                await (mod.startCamera?.() || window.startCamera?.());
                statusEl.textContent = 'Hazır';
                // Torch butonunu sadece cihaz destekliyorsa göster.
                const torchBtn = document.getElementById('kameraTorchBtn');
                if (torchBtn) {
                    setTimeout(() => {
                        torchBtn.hidden = !mod.torchDesteginiKontrolEt?.();
                    }, 300); // stream track'i hazır olsun diye küçük gecikme
                }
            } catch (e) { statusEl.textContent = 'Kamera açılamadı'; }
        });
        if (stopBtn) stopBtn.addEventListener('click', () => {
            try { mod.stopCamera?.() || window.stopCamera?.(); } catch {}
            _canliModAktif = false;
            const sw = document.getElementById('canliModSwitch');
            if (sw) sw.checked = false;
        });
        if (captureBtn) captureBtn.addEventListener('click', async () => {
            try { statusEl.textContent = 'İşleniyor...'; await (mod.capturePhoto?.() || window.capturePhoto?.()); } catch (e) { statusEl.textContent = 'Fotoğraf alınamadı'; }
        });

        // ── Canlı tarama modu aç/kapat ──
        const canliSw = document.getElementById('canliModSwitch');
        if (canliSw) canliSw.addEventListener('change', () => {
            if (canliSw.checked) {
                _canliModAktif = true;
                mod.canliTaramaBaslat?.(
                    () => { /* sonuç zaten omrSonucHazir olayıyla _omrSonucuisle'a gidiyor */ },
                    (durum) => { if (statusEl) statusEl.textContent = durum === 'okunuyor' ? 'Okunuyor...' : (durum === 'hizalandi' ? 'Hizalandı, sabit tutun...' : 'Kağıt aranıyor...'); }
                );
                captureBtn.style.opacity = '0.45'; // manuel tuş hâlâ çalışır ama vurgu canlı modda
            } else {
                _canliModAktif = false;
                mod.canliTaramaDurdur?.();
                captureBtn.style.opacity = '1';
                if (statusEl) statusEl.textContent = 'Hazır';
            }
        });

        // ── Ayarlar sheet aç/kapat ──
        const menuBtn = document.getElementById('kameraMenuBtn');
        const ayarSheet = document.getElementById('kameraAyarSheet');
        const ayarKapat = document.getElementById('kameraAyarKapat');
        if (menuBtn && ayarSheet) menuBtn.addEventListener('click', () => {
            const a = ayarlariGetir();
            const hy = document.getElementById('hsYuzdelik');
            const hd = document.getElementById('hsDoluluk');
            const hh = document.getElementById('hsHiz');
            if (hy) hy.value = Math.round(a.yuzdelik * 100);
            if (hd) hd.value = Math.round(a.minDoluluk * 100);
            if (hh) hh.value = a.tespitAraligiMs;
            if (canliSw) canliSw.checked = _canliModAktif;
            ayarSheet.hidden = false;
        });
        if (ayarKapat) ayarKapat.addEventListener('click', () => { ayarSheet.hidden = true; });

        const _ayarUygula = () => {
            const hy = document.getElementById('hsYuzdelik');
            const hd = document.getElementById('hsDoluluk');
            const hh = document.getElementById('hsHiz');
            ayarlariKaydet({
                yuzdelik: hy ? Number(hy.value) / 100 : undefined,
                minDoluluk: hd ? Number(hd.value) / 100 : undefined,
                tespitAraligiMs: hh ? Number(hh.value) : undefined,
            });
        };
        ['hsYuzdelik', 'hsDoluluk', 'hsHiz'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', _ayarUygula);
        });
        const hsSifirla = document.getElementById('hsSifirla');
        if (hsSifirla) hsSifirla.addEventListener('click', () => {
            ayarlariSifirla();
            const a = HASSASIYET_VARSAYILAN;
            const hy = document.getElementById('hsYuzdelik');
            const hd = document.getElementById('hsDoluluk');
            const hh = document.getElementById('hsHiz');
            if (hy) hy.value = Math.round(a.yuzdelik * 100);
            if (hd) hd.value = Math.round(a.minDoluluk * 100);
            if (hh) hh.value = a.tespitAraligiMs;
        });

        // ── Kamera flaşı (torch) ──
        const torchBtn = document.getElementById('kameraTorchBtn');
        if (torchBtn) torchBtn.addEventListener('click', async () => {
            const yeniDurum = !mod.torchDurumu?.();
            const basarili = await mod.torchAyarla?.(yeniDurum);
            if (basarili) torchBtn.style.color = yeniDurum ? '#FFD54A' : '#fff';
        });

        // ── Canlı sonuç kartı: Sil / Düzenle ──
        const kskSil = document.getElementById('kskSil');
        const kskDuzenle = document.getElementById('kskDuzenle');
        const kart = document.getElementById('canliSonucKart');
        if (kskSil) kskSil.addEventListener('click', () => {
            const id = kart?.dataset.sonucId;
            if (id && _aktifSinavId) { DB.sonucSil(_aktifSinavId, id); kagitlariRender(); }
            if (kart) kart.hidden = true;
        });
        if (kskDuzenle) kskDuzenle.addEventListener('click', () => {
            if (kart) kart.hidden = true;
            mod.stopCamera?.();
            kameraKapat();
            ekranGit('sinavDetay');
        });
    }).catch(() => {
        // camera.js global fonksiyonlardan kullan
        const startBtn = document.getElementById('start');
        const stopBtn  = document.getElementById('stop');
        const captureBtn = document.getElementById('capture');
        if (startBtn) startBtn.addEventListener('click', () => { try { window.startCamera?.(); } catch {} });
        if (stopBtn) stopBtn.addEventListener('click', () => { try { window.stopCamera?.(); } catch {} });
        if (captureBtn) captureBtn.addEventListener('click', () => { try { window.capturePhoto?.(); } catch {} });
    });
}

// ════════════════════════════════════════════════════════════════
// YARDIMCILAR
// ════════════════════════════════════════════════════════════════
function _s(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function _h(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function _tarih(iso) { if (!iso) return ''; try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return ''; } }

// Başlat
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', baslat);
else baslat();
