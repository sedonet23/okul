/* ====================================================================
   js/ogrenciler-arama.js
   1. renderOgrenciler()  — Öğrenciler sekmesi (veliler[] kaynağı)
   2. globalAramaYap()   — Tüm kayıtlarda arama
   3. Öğretmen profil fotoğrafı desteği (profilFotoyukle / profilFotoGoster)
   ====================================================================
   Mevcut koleksiyon yapısı değiştirilmedi; veliler[], ogretmenler[],
   servisler[], evrakTakibi[], notlar[], personelListesi[] kullanılır.

   Mimari not (bkz. docs/Pragmatik-Mimari-Tasarimi.md §2, §8): Bu dosyadaki
   TEK Firestore erişimi (profil fotoğrafı yükleme) COL.ogretmenler'e
   yazıyor — bu koleksiyon henüz kendi repository/service katmanına
   taşınmadı ("ogretmenler" ayrı bir migration adımı gerektiriyor,
   bilinçli olarak ertelendi), bu yüzden doğrudan db erişimi bırakıldı.
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
   ================================================================ */
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

/* Tek bir öğrenci satırının HTML'i — hem Öğrenciler sekmesinde hem Arama
   sonuçlarında kullanılır. NOT: bu fonksiyon önceden çağrılıyor ama hiçbir
   yerde TANIMLANMAMIŞTI — bu yüzden hem Öğrenciler sekmesi hem de Arama
   ("Tümü" dahil) her öğrenci satırı çizilmeye çalışıldığında sessizce
   hata verip (ReferenceError) yarım kalıyordu. */
function _ogrenciSatirHtml(v, sinifAdi) {
  const telefonlar = [v.telefon1 || v.telefon, v.telefon2, v.telefon3].filter(Boolean).join(' · ');
  return `
    <div class="detay-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer;" onclick="ogrenciDetayModalAc('${v.id}')">
      <span>
        <strong>${escapeHtml(v.ogrenciAdi || '—')}</strong>
        ${v.ogrenciNo ? `<span class="detay-row-muted"> No:${escapeHtml(v.ogrenciNo)}</span>` : ''}
        ${v.cinsiyet ? `<span class="badge badge-${v.cinsiyet === 'Kız' ? 'rose' : 'blue'}">${escapeHtml(v.cinsiyet)}</span>` : ''}
        ${v.servisAdi ? `<span class="badge badge-amber">🚌 ${escapeHtml(v.servisAdi)}</span>` : ''}
        <br><span style="font-size:12px;color:var(--ink-muted);">${escapeHtml(sinifAdi || '—')} · ${escapeHtml(v.veliAdi || '—')}</span>
        ${telefonlar ? `<br><span style="font-size:12px;color:var(--ink-muted);">📞 ${escapeHtml(telefonlar)}</span>` : ''}
      </span>
      <span style="color:var(--ink-muted);font-size:18px;">›</span>
    </div>`;
}

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

  // Kriter yokken de (yazmaya başlamadan / filtre seçmeden) tüm kayıtları
  // listele — kullanıcı isterse kendi metniyle ya da gelişmiş filtrelerle
  // daraltabilsin.
  const kat = _aramaKategori;
  let html = '';

  /* ---- Öğretmenler ---- */
  if (kat === 'hepsi' || kat === 'ogretmen') {
    const tumOgretmenler = typeof ogretmenler !== 'undefined' ? ogretmenler : [];
    const hits = q
      ? tumOgretmenler.filter(o => [o.ad, o.soyad, o.brans, o.unvan, o.telefon, o.eposta].join(' ').toLocaleLowerCase('tr').includes(q))
      : tumOgretmenler;
    if (hits.length) {
      html += `<div class="card" style="margin-bottom:12px;"><h3>👩‍🏫 Öğretmenler (${hits.length})</h3>`;
      hits.slice(0, 50).forEach(o => {
        html += `<div class="detay-row" style="cursor:pointer;" onclick="ogretmenDetayAc('${o.id}')">
          ${profilFotoGoster(o.id).replace('width:70px;height:70px','width:36px;height:36px').replace('font-size:22px','font-size:13px')}
          <div style="flex:1;padding:6px 0 6px 10px;">
            <div style="font-weight:700;color:var(--ink);">${escapeHtml((o.ad||'')+' '+(o.soyad||''))}</div>
            <div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(o.brans||'')} ${o.unvan?'· '+escapeHtml(o.unvan):''}</div>
          </div>
          <span style="color:var(--ink-muted);font-size:18px;">›</span>
        </div>`;
      });
      if (hits.length > 50) html += `<p style="font-size:12px;color:var(--ink-muted);padding:8px 0;">+${hits.length-50} daha — aramayı daraltın.</p>`;
      html += '</div>';
    }
  }

  /* ---- Öğrenciler / Veliler (metin + servis + sınıf + cinsiyet filtresi) ---- */
  if (kat === 'hepsi' || kat === 'ogrenci') {
    const tumVeliler = typeof veliler !== 'undefined' ? veliler : [];

    const hits = tumVeliler.filter(v => {
      // Çoklu servis filtresi (chip'ten) — servisId veya servisAdi ile eşleştir
      if (_seciliServisler.size > 0) {
        const servisIdEslesti = _seciliServisler.has(v.servisId);
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

      if (!q) return true; // chip/cinsiyet filtresiyle çalışıyor, metin yok

      // Metin arama: ad/veli/telefon/eposta/sınıf adı VEYA servis adı üzerinden —
      // chip seçili olsun ya da olmasın her zaman aynı geniş eşleşme kullanılır.
      // (Önceki sürümde chip aktifken metin sadece isimle eşleşiyordu; bu da
      // "Tümü" sekmesinde servis adı yazınca öğrencilerin hiç çıkmamasına yol açıyordu.)
      const sAdi = (typeof siniflar !== 'undefined') ? (siniflar.find(s=>s.id===v.sinifId)||{}).ad||'' : '';
      const sonServisAdi = (typeof servisler !== 'undefined') ? (servisler.find(s=>s.id===v.servisId)||{}).servisAdi||'' : '';
      const hay = [v.ogrenciAdi, v.veliAdi, v.telefon, v.eposta, sAdi, sonServisAdi, v.servisAdi]
        .join(' ').toLocaleLowerCase('tr');
      return hay.includes(q);
    });

    if (hits.length) {
      const baslik = _seciliServisler.size > 0 || _seciliSiniflar.size > 0
        ? `Filtreli Öğrenciler (${hits.length})`
        : `👨‍🎓 Öğrenciler (${hits.length})`;
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
    const hits  = q ? liste.filter(p => [p.ad, p.soyad, p.gorev, p.unvan, p.telefon].join(' ').toLocaleLowerCase('tr').includes(q)) : liste;
    if (hits.length) {
      html += `<div class="card" style="margin-bottom:12px;"><h3>🧑‍💼 Personel (${hits.length})</h3>`;
      hits.slice(0, 50).forEach(p => {
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
      if (hits.length > 50) html += `<p style="font-size:12px;color:var(--ink-muted);padding:8px 0;">+${hits.length-50} daha — aramayı daraltın.</p>`;
      html += '</div>';
    }
  }

  /* ---- Servis (sadece servis kartı, öğrenciler ayrıca üstte gösteriliyor) ---- */
  if (kat === 'hepsi' || kat === 'servis') {
    const liste = typeof servisler !== 'undefined' ? servisler : [];
    const hits  = q ? liste.filter(s => [s.servisAdi, s.soforAdi, s.soforTelefon, s.plaka, s.guzergah].join(' ').toLocaleLowerCase('tr').includes(q)) : liste;
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
    const hits  = q ? liste.filter(e => [e.ad, e.tur, e.aciklama, e.durum].join(' ').toLocaleLowerCase('tr').includes(q)) : liste;
    if (hits.length) {
      html += `<div class="card" style="margin-bottom:12px;"><h3>📄 Evrak (${hits.length})</h3>`;
      hits.slice(0, 50).forEach(e => {
        html += `<div class="detay-row" style="cursor:pointer;" onclick="sekmeAc('evrak')">
          <div style="flex:1;"><div style="font-weight:700;color:var(--ink);">${escapeHtml(e.ad||'—')}</div>
          <div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(e.tur||'')} · ${escapeHtml(e.durum||'')} · ${escapeHtml(e.tarih||'')}</div></div>
          <span style="color:var(--ink-muted);">›</span>
        </div>`;
      });
      if (hits.length > 50) html += `<p style="font-size:12px;color:var(--ink-muted);padding:8px 0;">+${hits.length-50} daha — aramayı daraltın.</p>`;
      html += '</div>';
    }
  }

  /* ---- Notlar ---- */
  if (kat === 'hepsi' || kat === 'not') {
    const liste = typeof notlar !== 'undefined' ? notlar : [];
    const hits  = q ? liste.filter(n => [n.baslik, String(n.icerik||'')].join(' ').toLocaleLowerCase('tr').includes(q)) : liste;
    if (hits.length) {
      html += `<div class="card" style="margin-bottom:12px;"><h3>📝 Notlar (${hits.length})</h3>`;
      hits.slice(0, 50).forEach(n => {
        html += `<div class="detay-row" style="cursor:pointer;" onclick="sekmeAc('notlar')">
          <div style="flex:1;"><div style="font-weight:700;color:var(--ink);">${escapeHtml(n.baslik||'—')}</div>
          ${n.icerik?`<div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(String(n.icerik).slice(0,80))}…</div>`:''}</div>
        </div>`;
      });
      if (hits.length > 50) html += `<p style="font-size:12px;color:var(--ink-muted);padding:8px 0;">+${hits.length-50} daha — aramayı daraltın.</p>`;
      html += '</div>';
    }
  }

  /* ---- Çizelgeler ---- */
  if (kat === 'hepsi' || kat === 'cizelge') {
    const CIZELGE_TIPLERI = {
      sosyalKulupler: '🎯 Sosyal Kulüp',
      sok:            '📋 ŞÖK',
      zumre:          '👥 Zümre',
      bepPlani:       '📘 Yıllık Plan / BEP',
      rehberlik:      '🧭 Rehberlik',
      maarifRapor:    '📊 Maarif Raporu'
    };
    const cVerileri = typeof cizelgeVerileri !== 'undefined' ? cizelgeVerileri : {};
    const bGunler   = typeof belirliGunlerListesi !== 'undefined' ? belirliGunlerListesi : [];
    const digerE    = typeof digerEvrakListesi !== 'undefined' ? digerEvrakListesi : [];

    const hits = [];
    Object.keys(CIZELGE_TIPLERI).forEach(tip => {
      (cVerileri[tip] || []).forEach(k => {
        const ogrAdi = k.ogretmenId
          ? (typeof _ogretmenAdi === 'function' ? _ogretmenAdi(k.ogretmenId) : '')
          : (k.ogretmenIdler && typeof _ogretmenAdlari === 'function' ? _ogretmenAdlari(k.ogretmenIdler) : '');
        const baslik = k.ad || k.ders || k.rapor || k.brans || 'Kayıt';
        const hay = [baslik, k.sinif, k.aciklama, ogrAdi].join(' ').toLocaleLowerCase('tr');
        if (!q || hay.includes(q)) hits.push({ tip, label: CIZELGE_TIPLERI[tip], baslik, alt: [k.sinif, ogrAdi].filter(Boolean).join(' · ') });
      });
    });
    bGunler.forEach(k => {
      const ogrAdi = k.ogretmenIdler && typeof _ogretmenAdlari === 'function' ? _ogretmenAdlari(k.ogretmenIdler) : '';
      const hay = [k.ad, k.aciklama, ogrAdi].join(' ').toLocaleLowerCase('tr');
      if (!q || hay.includes(q)) hits.push({ tip: 'belirliGunler', label: '📅 Belirli Gün/Hafta', baslik: k.ad || 'Kayıt', alt: ogrAdi });
    });
    digerE.forEach(k => {
      const hay = [k.ad, k.aciklama].join(' ').toLocaleLowerCase('tr');
      if (!q || hay.includes(q)) hits.push({ tip: 'digerEvrak', label: '🗂️ Diğer Evrak', baslik: k.ad || 'Kayıt', alt: '' });
    });

    if (hits.length) {
      html += `<div class="card" style="margin-bottom:12px;"><h3>🗂️ Çizelgeler (${hits.length})</h3>`;
      hits.slice(0, 50).forEach(h => {
        html += `<div class="detay-row" style="cursor:pointer;" onclick="sekmeAc('${h.tip}')">
          <div style="flex:1;">
            <div style="font-weight:700;color:var(--ink);">${escapeHtml(h.baslik)}</div>
            <div style="font-size:12px;color:var(--ink-muted);">${h.label}${h.alt ? ' · ' + escapeHtml(h.alt) : ''}</div>
          </div>
          <span style="color:var(--ink-muted);font-size:18px;">›</span>
        </div>`;
      });
      if (hits.length > 50) html += `<p style="font-size:12px;color:var(--ink-muted);padding:8px 0;">+${hits.length-50} daha — aramayı daraltın.</p>`;
      html += '</div>';
    }
  }

  if (!html) html = '<p class="empty-state" style="margin-top:24px;">Sonuç bulunamadı.</p>';
  out.innerHTML = html;
}

/* ================================================================
   ARAMA SONUÇLARINI YAZDIR
   ================================================================ */
function globalAramaYazdir() {
  const out = document.getElementById('globalAramaSonuclar');
  if (!out || !out.innerHTML.trim()) { toast('Yazdırılacak sonuç yok.'); return; }

  const inp = document.getElementById('globalAramaInput');
  const q   = inp ? inp.value.trim() : '';
  const tarih = new Date().toLocaleDateString('tr-TR');

  const pencere = window.open('', '_blank');
  if (!pencere) { toast('Yazdırma penceresi açılamadı. Pop-up engelleyiciyi kontrol edin.'); return; }

  pencere.document.write(`
    <html>
    <head>
      <meta charset="utf-8">
      <title>Arama Sonuçları</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
        h1 { font-size: 18px; margin-bottom: 2px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 18px; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; break-inside: avoid; }
        .card h3 { font-size: 14px; margin: 0 0 8px 0; border-bottom: 1px solid #eee; padding-bottom: 6px; }
        .detay-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f2f2f2; }
        .detay-row:last-child { border-bottom: none; }
        .detay-row img, .detay-row > div[style*="border-radius"] { display: none; }
        .detay-row-muted { color: #777; }
        .badge { font-size: 10px; border: 1px solid #ccc; border-radius: 6px; padding: 1px 6px; margin-left: 4px; }
        a { color: #222; text-decoration: none; }
        span[style*="font-size:18px"] { display: none; }
      </style>
    </head>
    <body>
      <h1>🔍 Arama Sonuçları</h1>
      <div class="meta">${q ? `Arama: "${escapeHtml(q)}" · ` : 'Tüm kayıtlar · '}${tarih}</div>
      ${out.innerHTML}
    </body>
    </html>
  `);
  pencere.document.close();
  pencere.focus();
  setTimeout(() => pencere.print(), 300);
}

/* ---- Filtre chip CSS yardımcısı (JS'ten ekleniyor) ---- */
(function(){ const s=document.createElement('style'); s.textContent='.arama-filtre-chip.secili{background:var(--brand)!important;color:#fff!important;border-color:var(--brand)!important;}'; document.head.appendChild(s); })();
