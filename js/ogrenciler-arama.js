/* ====================================================================
   js/ogrenciler-arama.js
   1. renderOgrenciler()  — Öğrenciler sekmesi (veliler[] kaynağı)
   2. globalAramaYap()   — Tüm kayıtlarda arama
   3. Öğretmen profil fotoğrafı desteği (profilFotoyukle / profilFotoGoster)
   ====================================================================
   Mevcut koleksiyon yapısı değiştirilmedi; veliler[], ogretmenler[],
   servisler[], evrakTakibi[], notlar[], personelListesi[] kullanılır.
   ==================================================================== */

/* label>input onchange tarafından çağrılır */
function profilFotoIsle(inputEl, ogretmenId) {
  const file = inputEl.files[0];
  if (!file) return;
  toast('Fotoğraf işleniyor…');

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX = 400;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.80);

      if (typeof db !== 'undefined' && typeof COL !== 'undefined') {
        db.collection(COL.ogretmenler).doc(ogretmenId)
          .update({ profilFotoUrl: base64 })
          .then(() => {
            const o = (typeof ogretmenler !== 'undefined') ? ogretmenler.find(x => x.id === ogretmenId) : null;
            if (o) o.profilFotoUrl = base64;
            toast('✓ Profil fotoğrafı kaydedildi!');
            detayPanelineProfilFotoEkle(ogretmenId);
          })
          .catch(err => toast('Hata: ' + err.message));
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ================================================================
   ÖĞRETMEN PROFİL FOTOĞRAFI — görüntüleme yardımcısı
function profilFotoGoster(ogretmenId) {
  const o = (typeof ogretmenler !== 'undefined') ? ogretmenler.find(x => x.id === ogretmenId) : null;
  if (!o) return '';
  if (o.profilFotoUrl) {
    return `<img src="${escapeHtml(o.profilFotoUrl)}" style="width:70px;height:70px;border-radius:var(--icon-shape,50%);object-fit:cover;border:3px solid rgba(255,255,255,.4);flex-shrink:0;" alt="Profil">`;
  }
  const harf = ((o.ad || '')[0] || '') + ((o.soyad || '')[0] || '');
  return `<div style="width:70px;height:70px;border-radius:var(--icon-shape,50%);background:rgba(255,255,255,.22);border:2px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;flex-shrink:0;">${escapeHtml(harf.toUpperCase())}</div>`;
}

/* Profil fotoğrafı yükleme: detay panelindeki "📷 Fotoğraf" butonuna bağlanır */
function profilFotoYukle(ogretmenId) {
  // Mevcut gizli input'u bul veya oluştur
  let inp = document.getElementById('_profilFotoInput');
  if (!inp) {
    inp = document.createElement('input');
    inp.id = '_profilFotoInput';
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.setAttribute('capture', 'environment'); // mobilde kamera/galeri seçeneği
    inp.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;';
    document.body.appendChild(inp);
  }

  // Önceki listener'ı temizle
  inp.onchange = null;
  inp.value = '';

  inp.onchange = function() {
    const file = inp.files[0];
    inp.value = '';
    if (!file) return;

    toast('Fotoğraf işleniyor…');

    // FileReader ile oku, sonra Canvas ile küçült
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX = 400;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.80);

        if (typeof db !== 'undefined' && typeof COL !== 'undefined') {
          toast('Firestore\'a kaydediliyor…');
          db.collection(COL.ogretmenler).doc(ogretmenId)
            .update({ profilFotoUrl: base64 })
            .then(() => {
              const o = (typeof ogretmenler !== 'undefined') ? ogretmenler.find(x => x.id === ogretmenId) : null;
              if (o) o.profilFotoUrl = base64;
              toast('✓ Profil fotoğrafı kaydedildi!');
              const old = document.querySelector('.detay-profil-foto');
              if (old) old.remove();
              detayPanelineProfilFotoEkle(ogretmenId);
            })
            .catch(err => {
              console.error('Profil foto hata:', err);
              toast('Hata: ' + err.message);
            });
        } else {
          toast('Veritabanı bağlantısı bulunamadı.');
        }
      };
      img.onerror = () => toast('Resim yüklenemedi.');
      img.src = e.target.result;
    };
    reader.onerror = () => toast('Dosya okunamadı.');
    reader.readAsDataURL(file);
  };

  // Direkt click — bu fonksiyon zaten bir onclick'ten çağrılıyor olmalı
  inp.click();
}

function detayPanelineProfilFotoEkle(ogretmenId) {
  const head = document.querySelector('.detay-head');
  if (!head) return;
  const eskiWrap = head.querySelector('.detay-profil-foto');
  if (eskiWrap) eskiWrap.remove();

  const wrap = document.createElement('div');
  wrap.className = 'detay-profil-foto';
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;';

  // Gizli file input — label ile tetiklenir (mobilde en güvenilir yöntem)
  const inputId = '_profilFotoLabelInput_' + ogretmenId;
  wrap.innerHTML = profilFotoGoster(ogretmenId) +
    `<label for="${inputId}" style="display:inline-block;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:8px;padding:5px 12px;color:#fff;font-size:11px;cursor:pointer;">📷 Fotoğraf</label>
     <input id="${inputId}" type="file" accept="image/*" style="display:none;" onchange="profilFotoIsle(this,'${ogretmenId}')">`;

  head.insertBefore(wrap, head.firstChild);
}

/* ================================================================
   ÖĞRENCİLER MODÜLÜ
   ================================================================ */
let _aramaKategori = 'hepsi';

function renderOgrenciler() {
  if (typeof veliler === 'undefined') return;
  const aramaEl = document.getElementById('ogrenciArama');
  const sinifEl = document.getElementById('ogrenciSinifFiltre');
  const cinsEl  = document.getElementById('ogrenciCinsiyetFiltre');
  const listeEl = document.getElementById('ogrencilerListe');
  const ozet    = document.getElementById('ogrencilerOzet');
  if (!listeEl) return;

  const q      = (aramaEl ? aramaEl.value : '').toLocaleLowerCase('tr').trim();
  const sinifF = sinifEl ? sinifEl.value : '';
  const cinsF  = cinsEl  ? cinsEl.value  : '';

  // Sınıf filtre dolduruluyor (ilk çalışmada)
  if (sinifEl && sinifEl.options.length <= 1 && typeof siniflar !== 'undefined') {
    siniflar.slice().sort((a,b)=>String(a.ad).localeCompare(String(b.ad),'tr')).forEach(s => {
      if (!sinifEl.querySelector(`option[value="${s.id}"]`)) {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.ad;
        sinifEl.appendChild(opt);
      }
    });
  }

  let liste = veliler.filter(v => {
    if (sinifF && v.sinifId !== sinifF) return false;
    if (cinsF && (v.cinsiyet || '') !== cinsF) return false;
    if (q) {
      const hay = [v.ogrenciAdi, v.veliAdi, v.telefon, v.eposta,
        (typeof siniflar !== 'undefined' ? (siniflar.find(s=>s.id===v.sinifId)||{}).ad : '')
      ].join(' ').toLocaleLowerCase('tr');
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a,b) => (a.ogrenciAdi||'').localeCompare(b.ogrenciAdi||'','tr'));

  if (ozet) ozet.textContent = `${liste.length} öğrenci`;

  if (!liste.length) {
    listeEl.innerHTML = '<p class="empty-state">Kayıt bulunamadı.</p>';
    return;
  }

  // Sınıfa göre grupla
  const gruplar = {};
  liste.forEach(v => {
    const sinifAdi = (typeof siniflar !== 'undefined' ? (siniflar.find(s=>s.id===v.sinifId)||{}).ad : '') || 'Sınıfsız';
    if (!gruplar[sinifAdi]) gruplar[sinifAdi] = [];
    gruplar[sinifAdi].push(v);
  });

  let html = '';
  Object.keys(gruplar).sort((a,b)=>a.localeCompare(b,'tr')).forEach(sinifAdi => {
    html += `<div class="card" style="margin-bottom:12px;">
      <h3 style="margin-bottom:10px;">🏫 ${escapeHtml(sinifAdi)} <span style="font-weight:400;font-size:12px;color:var(--ink-muted);">(${gruplar[sinifAdi].length} öğrenci)</span></h3>
      <div style="display:flex;flex-direction:column;gap:0;">`;
    gruplar[sinifAdi].forEach(v => {
      html += _ogrenciSatirHtml(v, sinifAdi);
    });
    html += '</div></div>';
  });
  listeEl.innerHTML = html;
}


/* ================================================================
   GLOBAL ARAMA — gelişmiş, çoklu kriter, servis bazlı öğrenci
   ================================================================ */
// _aramaKategori zaten yukarıda tanımlı
let _seciliServisler = new Set(); // çoklu servis filtresi
let _seciliSiniflar  = new Set(); // çoklu sınıf filtresi

function aramaKatSec(btn) {
  document.querySelectorAll('.arama-kat').forEach(b => b.classList.remove('aktif'));
  btn.classList.add('aktif');
  _aramaKategori = btn.dataset.kat || 'hepsi';
  globalAramaYap();
}

function globalAramaTemizle() {
  const inp = document.getElementById('globalAramaInput');
  if (inp) { inp.value = ''; inp.focus(); }
  globalAramaYap();
}

function gelismisFiltreSifirla() {
  _seciliServisler.clear();
  _seciliSiniflar.clear();
  document.getElementById('aramaCinsiyetFiltre').value = '';
  document.querySelectorAll('.arama-filtre-chip.secili').forEach(c => c.classList.remove('secili'));
  globalAramaYap();
}

function aramaFiltreTikla(set, id, el) {
  if (set.has(id)) { set.delete(id); el.classList.remove('secili'); }
  else             { set.add(id);    el.classList.add('secili'); }
  console.log('[Arama] servisler seçili:', [..._seciliServisler], 'veliler:', typeof veliler !== 'undefined' ? veliler.length : 'TANIMSIZ');
  globalAramaYap();
}

/* Gelişmiş filtre seçeneklerini (servis + sınıf chip'leri) doldur */
function aramaGelismisFiltreDoldur() {
  const servisEl = document.getElementById('aramaServisSecenekleri');
  const sinifEl  = document.getElementById('aramaSinifSecenekleri');
  if (!servisEl || !sinifEl) return;

  // Her seferinde yenile (veriler sonradan yüklenmiş olabilir)
  if (typeof servisler !== 'undefined' && servisler.length > 0) {
    servisEl.innerHTML = '';
    servisler.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm arama-filtre-chip' + (_seciliServisler.has(s.id) ? ' secili' : '');
      btn.textContent = '🚌 ' + (s.servisAdi || '—');
      btn.onclick = () => aramaFiltreTikla(_seciliServisler, s.id, btn);
      servisEl.appendChild(btn);
    });
  }
  if (typeof siniflar !== 'undefined' && siniflar.length > 0) {
    sinifEl.innerHTML = '';
    siniflar.slice().sort((a,b)=>String(a.ad).localeCompare(String(b.ad),'tr')).forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-sm arama-filtre-chip' + (_seciliSiniflar.has(s.id) ? ' secili' : '');
      btn.textContent = '🏫 ' + (s.ad || '—');
      btn.onclick = () => aramaFiltreTikla(_seciliSiniflar, s.id, btn);
      sinifEl.appendChild(btn);
    });
  }
}

// Arama sekmesi açılınca ve Gelişmiş Filtreler toggle'lanınca chip'leri doldur
document.addEventListener('DOMContentLoaded', () => {
  // details elementi toggle edilince yenile
  document.addEventListener('toggle', (e) => {
    if (e.target && e.target.id === 'gelistirmisFiltreler') {
      aramaGelismisFiltreDoldur();
    }
  }, true);
});

function globalAramaYap() {
  aramaGelismisFiltreDoldur(); // chip'ler dolmamışsa doldur
  const inp = document.getElementById('globalAramaInput');
  const q   = (inp ? inp.value : '').toLocaleLowerCase('tr').trim();
  const cinsEl = document.getElementById('aramaCinsiyetFiltre');
  const cinsF  = cinsEl ? cinsEl.value : '';
  const out = document.getElementById('globalAramaSonuclar');
  if (!out) return;

  const hicKriter = !q && _seciliServisler.size === 0 && _seciliSiniflar.size === 0 && !cinsF;
  if (hicKriter) {
    out.innerHTML = '<p class="empty-state" style="margin-top:32px;">Aramak için yazmaya başlayın veya filtre seçin…</p>';
    return;
  }

  const kat = _aramaKategori;
  let html = '';

  /* ---- Öğretmenler ---- */
  if (kat === 'hepsi' || kat === 'ogretmen') {
    const hits = (typeof ogretmenler !== 'undefined' ? ogretmenler : []).filter(o => {
      if (!q) return false;
      return [o.ad, o.soyad, o.brans, o.unvan, o.telefon, o.eposta].join(' ').toLocaleLowerCase('tr').includes(q);
    });
    if (hits.length) {
      html += `<div class="card" style="margin-bottom:12px;"><h3>👩‍🏫 Öğretmenler (${hits.length})</h3>`;
      hits.forEach(o => {
        html += `<div class="detay-row" style="cursor:pointer;" onclick="ogretmenDetayAc('${o.id}')">
          ${profilFotoGoster(o.id).replace('width:70px;height:70px','width:36px;height:36px').replace('font-size:22px','font-size:13px')}
          <div style="flex:1;padding:6px 0 6px 10px;">
            <div style="font-weight:700;color:var(--ink);">${escapeHtml((o.ad||'')+' '+(o.soyad||''))}</div>
            <div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(o.brans||'')} ${o.unvan?'· '+escapeHtml(o.unvan):''}</div>
          </div>
          <span style="color:var(--ink-muted);font-size:18px;">›</span>
        </div>`;
      });
      html += '</div>';
    }
  }

  /* ---- Öğrenciler / Veliler (metin + servis + sınıf + cinsiyet filtresi) ---- */
  if (kat === 'hepsi' || kat === 'ogrenci') {
    const tumVeliler = typeof veliler !== 'undefined' ? veliler : [];

    // Servis bazlı öğrenci: servis adına göre eşleştir
    let servisIdlerdenGelen = new Set();
    if (typeof servisler !== 'undefined' && q) {
      servisler.filter(s => (s.servisAdi||'').toLocaleLowerCase('tr').includes(q)).forEach(s => {
        servisIdlerdenGelen.add(s.id);
      });
    }

    const hits = tumVeliler.filter(v => {
      // Çoklu servis filtresi (chip'ten) — servisId veya servisAdi ile eşleştir
      if (_seciliServisler.size > 0) {
        const servisIdEslesti = _seciliServisler.has(v.servisId);
        // servisId yoksa servisAdi veya notlar alanında servis adı geçiyor mu bak
        const seciliServisAdlari = typeof servisler !== 'undefined'
          ? servisler.filter(s => _seciliServisler.has(s.id)).map(s => (s.servisAdi||'').toLocaleLowerCase('tr'))
          : [];
        const servisAdEslesti = seciliServisAdlari.some(ad =>
          (v.servisAdi||v.servis||v.servisId||'').toLocaleLowerCase('tr').includes(ad)
        );
        if (!servisIdEslesti && !servisAdEslesti) return false;
      }
      // Çoklu sınıf filtresi
      if (_seciliSiniflar.size > 0 && !_seciliSiniflar.has(v.sinifId)) return false;
      // Cinsiyet filtresi
      if (cinsF === 'kiz' && !['Kız','K','kiz','kız'].includes(v.cinsiyet)) return false;
      if (cinsF === 'erkek' && !['Erkek','E','erkek'].includes(v.cinsiyet)) return false;

      if (!q) return true; // sadece filtre ile çalışıyor — chip seçiliyse tüm eşleşenler gelir

      // Chip aktifken q sadece ek daraltma (ad/veli üzerinden)
      if (_seciliServisler.size > 0 || _seciliSiniflar.size > 0) {
        return [v.ogrenciAdi, v.veliAdi, v.telefon].join(' ').toLocaleLowerCase('tr').includes(q);
      }

      // Chip yokken: ad/veli/sınıf VEYA servis adı üzerinden tam arama
      const sAdi = (typeof siniflar !== 'undefined') ? (siniflar.find(s=>s.id===v.sinifId)||{}).ad||'' : '';
      const metinEslesti = [v.ogrenciAdi, v.veliAdi, v.telefon, v.eposta, sAdi].join(' ').toLocaleLowerCase('tr').includes(q);
      const servisEslesti = servisIdlerdenGelen.has(v.servisId);
      return metinEslesti || servisEslesti;
    });

    if (hits.length) {
      const baslik = _seciliServisler.size > 0 || _seciliSiniflar.size > 0
        ? `Filtreli Öğrenciler (${hits.length})`
        : servisIdlerdenGelen.size > 0 ? `🚌 Servis Öğrencileri (${hits.length})` : `👨‍🎓 Öğrenciler (${hits.length})`;
      html += `<div class="card" style="margin-bottom:12px;"><h3>${baslik}</h3>`;
      hits.slice(0, 50).forEach(v => {
        const sAdi = (typeof siniflar !== 'undefined') ? (siniflar.find(s=>s.id===v.sinifId)||{}).ad||'?' : '?';
        html += _ogrenciSatirHtml(v, sAdi);
      });
      if (hits.length > 50) html += `<p style="font-size:12px;color:var(--ink-muted);padding:8px 0;">+${hits.length-50} daha — aramayı daraltın.</p>`;
      html += '</div>';
    }
  }

  /* ---- Personel ---- */
  if (kat === 'hepsi' || kat === 'personel') {
    const liste = typeof personelListesi !== 'undefined' ? personelListesi : [];
    const hits  = q ? liste.filter(p => [p.ad, p.soyad, p.gorev, p.unvan, p.telefon].join(' ').toLocaleLowerCase('tr').includes(q)) : [];
    if (hits.length) {
      html += `<div class="card" style="margin-bottom:12px;"><h3>🧑‍💼 Personel (${hits.length})</h3>`;
      hits.forEach(p => {
        html += `<div class="detay-row" style="cursor:pointer;" onclick="personelDetayAc('${p.id}')">
          <div style="width:36px;height:36px;border-radius:var(--icon-shape,50%);background:var(--brand-light);color:var(--brand);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${((p.ad||'?')[0]).toUpperCase()}</div>
          <div style="flex:1;padding-left:10px;">
            <div style="font-weight:700;color:var(--ink);">${escapeHtml((p.ad||'')+' '+(p.soyad||''))}</div>
            <div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(p.gorev||p.unvan||'')}</div>
          </div>
          ${p.telefon?`<a href="tel:${escapeHtml(p.telefon)}" onclick="event.stopPropagation()" style="color:var(--brand);font-size:12px;">📞</a>`:''}
          <span style="color:var(--ink-muted);font-size:18px;margin-left:6px;">›</span>
        </div>`;
      });
      html += '</div>';
    }
  }

  /* ---- Servis (sadece servis kartı, öğrenciler ayrıca üstte gösteriliyor) ---- */
  if (kat === 'hepsi' || kat === 'servis') {
    const liste = typeof servisler !== 'undefined' ? servisler : [];
    const hits  = q ? liste.filter(s => [s.servisAdi, s.soforAdi, s.soforTelefon, s.plaka, s.guzergah].join(' ').toLocaleLowerCase('tr').includes(q)) : [];
    if (hits.length) {
      html += `<div class="card" style="margin-bottom:12px;"><h3>🚌 Servis / Şoför (${hits.length})</h3>`;
      hits.forEach(s => {
        const ogrSay = (typeof veliler!=='undefined') ? veliler.filter(v=>v.servisId===s.id).length : '';
        html += `<div class="detay-row" style="cursor:pointer;" onclick="sekmeAc('tasima')">
          <div style="flex:1;">
            <div style="font-weight:700;color:var(--ink);">${escapeHtml(s.servisAdi||'—')}</div>
            <div style="font-size:12px;color:var(--ink-muted);">Şoför: ${escapeHtml(s.soforAdi||'—')} ${s.plaka?'· '+escapeHtml(s.plaka):''} ${ogrSay?'· '+ogrSay+' öğrenci':''}</div>
          </div>
          ${s.soforTelefon?`<a href="tel:${escapeHtml(s.soforTelefon)}" onclick="event.stopPropagation()" style="color:var(--brand);font-size:12px;">📞</a>`:''}
        </div>`;
      });
      html += '</div>';
    }
  }

  /* ---- Evrak ---- */
  if (kat === 'hepsi' || kat === 'evrak') {
    const liste = typeof evrakTakibi !== 'undefined' ? evrakTakibi : [];
    const hits  = q ? liste.filter(e => [e.ad, e.tur, e.aciklama, e.durum].join(' ').toLocaleLowerCase('tr').includes(q)) : [];
    if (hits.length) {
      html += `<div class="card" style="margin-bottom:12px;"><h3>📄 Evrak (${hits.length})</h3>`;
      hits.forEach(e => {
        html += `<div class="detay-row" style="cursor:pointer;" onclick="sekmeAc('evrak')">
          <div style="flex:1;"><div style="font-weight:700;color:var(--ink);">${escapeHtml(e.ad||'—')}</div>
          <div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(e.tur||'')} · ${escapeHtml(e.durum||'')} · ${escapeHtml(e.tarih||'')}</div></div>
          <span style="color:var(--ink-muted);">›</span>
        </div>`;
      });
      html += '</div>';
    }
  }

  /* ---- Notlar ---- */
  if (kat === 'hepsi' || kat === 'not') {
    const liste = typeof notlar !== 'undefined' ? notlar : [];
    const hits  = q ? liste.filter(n => [n.baslik, String(n.icerik||'')].join(' ').toLocaleLowerCase('tr').includes(q)) : [];
    if (hits.length) {
      html += `<div class="card" style="margin-bottom:12px;"><h3>📝 Notlar (${hits.length})</h3>`;
      hits.forEach(n => {
        html += `<div class="detay-row" style="cursor:pointer;" onclick="sekmeAc('notlar')">
          <div style="flex:1;"><div style="font-weight:700;color:var(--ink);">${escapeHtml(n.baslik||'—')}</div>
          ${n.icerik?`<div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(String(n.icerik).slice(0,80))}…</div>`:''}</div>
        </div>`;
      });
      html += '</div>';
    }
  }

  if (!html) html = '<p class="empty-state" style="margin-top:24px;">Sonuç bulunamadı.</p>';
  out.innerHTML = html;
}

/* ---- Filtre chip CSS yardımcısı (JS'ten ekleniyor) ---- */
(function(){ const s=document.createElement('style'); s.textContent='.arama-filtre-chip.secili{background:var(--brand)!important;color:#fff!important;border-color:var(--brand)!important;}'; document.head.appendChild(s); })();
