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
   GLOBAL ARAMA
   ================================================================ */
function aramaKatSec(btn) {
  document.querySelectorAll('.arama-kat').forEach(b => b.classList.remove('aktif'));
  btn.classList.add('aktif');
  _aramaKategori = btn.dataset.kat || 'hepsi';
  globalAramaYap();
}

function globalAramaYap() {
  const inp = document.getElementById('globalAramaInput');
  const q   = (inp ? inp.value : '').toLocaleLowerCase('tr').trim();
  const out = document.getElementById('globalAramaSonuclar');
  if (!out) return;
  if (!q) { out.innerHTML = '<p class="empty-state" style="margin-top:32px;">Aramak için yazmaya başlayın…</p>'; return; }

  let html = '';
  const kat = _aramaKategori;

  /* Öğretmenler */
  if (kat === 'hepsi' || kat === 'ogretmen') {
    const hits = (typeof ogretmenler !== 'undefined' ? ogretmenler : []).filter(o =>
      [o.ad, o.soyad, o.brans, o.unvan, o.telefon, o.eposta].join(' ').toLocaleLowerCase('tr').includes(q)
    );
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

  /* Öğrenciler / Veliler */
  if (kat === 'hepsi' || kat === 'ogrenci') {
    const hits = (typeof veliler !== 'undefined' ? veliler : []).filter(v =>
      [v.ogrenciAdi, v.veliAdi, v.telefon, v.eposta,
        (typeof siniflar !== 'undefined' ? (siniflar.find(s=>s.id===v.sinifId)||{}).ad : '')
      ].join(' ').toLocaleLowerCase('tr').includes(q)
    );
    if (hits.length) {
      html += `<div class="card" style="margin-bottom:12px;"><h3>👨‍🎓 Öğrenciler / Veliler (${hits.length})</h3>`;
      hits.slice(0, 30).forEach(v => {
        html += _ogrenciSatirHtml(v, (typeof siniflar !== 'undefined' ? (siniflar.find(s=>s.id===v.sinifId)||{}).ad : '') || '?');
      });
      if (hits.length > 30) html += `<p style="font-size:12px;color:var(--ink-muted);padding:8px 0;">+${hits.length-30} daha — aramayı daraltın.</p>`;
      html += '</div>';
    }
  }

  /* Personel */
  if (kat === 'hepsi' || kat === 'personel') {
    const liste = typeof personelListesi !== 'undefined' ? personelListesi : [];
    const hits  = liste.filter(p => [p.ad, p.soyad, p.gorev, p.unvan, p.telefon].join(' ').toLocaleLowerCase('tr').includes(q));
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

  /* Servis / Şoför */
  if (kat === 'hepsi' || kat === 'servis') {
    const liste = typeof servisler !== 'undefined' ? servisler : [];
    const hits  = liste.filter(s => [s.servisAdi, s.soforAdi, s.soforTelefon, s.plaka, s.guzergah].join(' ').toLocaleLowerCase('tr').includes(q));
    if (hits.length) {
      html += `<div class="card" style="margin-bottom:12px;"><h3>🚌 Servis / Şoför (${hits.length})</h3>`;
      hits.forEach(s => {
        html += `<div class="detay-row" style="cursor:pointer;" onclick="sekmeAc('tasima')">
          <div style="flex:1;">
            <div style="font-weight:700;color:var(--ink);">${escapeHtml(s.servisAdi||'—')}</div>
            <div style="font-size:12px;color:var(--ink-muted);">Şoför: ${escapeHtml(s.soforAdi||'—')} ${s.plaka?'· '+escapeHtml(s.plaka):''}</div>
          </div>
          ${s.soforTelefon?`<a href="tel:${escapeHtml(s.soforTelefon)}" style="color:var(--brand);font-size:12px;">📞 ${escapeHtml(s.soforTelefon)}</a>`:''}
        </div>`;
      });
      html += '</div>';
    }
  }

  /* Evrak */
  if (kat === 'hepsi' || kat === 'evrak') {
    const liste = typeof evrakTakibi !== 'undefined' ? evrakTakibi : [];
    const hits  = liste.filter(e => [e.ad, e.tur, e.aciklama, e.durum].join(' ').toLocaleLowerCase('tr').includes(q));
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

  /* Notlar */
  if (kat === 'hepsi' || kat === 'not') {
    const liste = typeof notlar !== 'undefined' ? notlar : [];
    const hits  = liste.filter(n => [n.baslik, String(n.icerik||'')].join(' ').toLocaleLowerCase('tr').includes(q));
    if (hits.length) {
      html += `<div class="card" style="margin-bottom:12px;"><h3>📝 Notlar (${hits.length})</h3>`;
      hits.forEach(n => {
        const ozet = String(n.icerik||'').slice(0,80);
        html += `<div class="detay-row" style="cursor:pointer;" onclick="sekmeAc('notlar')">
          <div style="flex:1;"><div style="font-weight:700;color:var(--ink);">${escapeHtml(n.baslik||'—')}</div>
          ${ozet?`<div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(ozet)}…</div>`:''}</div>
        </div>`;
      });
      html += '</div>';
    }
  }

  if (!html) html = '<p class="empty-state" style="margin-top:24px;">Sonuç bulunamadı.</p>';
  out.innerHTML = html;
}

/* ================================================================
   ÖĞRENCİ DETAY MODALI
   Mevcut .detay-overlay / .detay-panel (öğretmen için kullanılan)
   yapısını yeniden kullanır. ogretmenDetayAc() ile aynı HTML
   kabuğuna yazılır, böylece ekstra HTML eklemeye gerek kalmaz.
   ================================================================ */
function ogrenciDetayAc(vId) {
  const v = (typeof veliler !== 'undefined') ? veliler.find(x => x.id === vId) : null;
  if (!v) return;

  const sinifAdi = (typeof siniflar !== 'undefined') ? (siniflar.find(s => s.id === v.sinifId) || {}).ad || '—' : '—';
  const servisAdi = (typeof servisler !== 'undefined' && v.servisId) ? (servisler.find(s => s.id === v.servisId) || {}).servisAdi || '—' : '—';

  // Öğretmen detay panelini yeniden kullan (aynı overlay)
  const overlay = document.getElementById('detayOverlay');
  if (!overlay) return;

  document.getElementById('detayBaslik').textContent = v.ogrenciAdi || '—';
  document.getElementById('detayAltBaslik').textContent = `${sinifAdi} · ${v.cinsiyet || ''}`;

  const duzenleBtn = document.getElementById('detayDuzenleBtn');
  if (duzenleBtn) {
    duzenleBtn.textContent = '✏️ Düzenle';
    duzenleBtn.onclick = () => { detayPanelKapat(); veliModalAc(vId); };
  }
  const raporBtn = document.getElementById('detayRaporBtn');
  if (raporBtn) raporBtn.style.display = 'none';

  // Telefon satırı yardımcı
  const telSatir = (tel, yak) => tel
    ? `<a href="tel:${escapeHtml(tel)}" style="display:flex;align-items:center;gap:8px;color:var(--brand);font-size:13px;padding:8px 0;border-bottom:1px solid var(--border-soft);">
        <span style="min-width:56px;font-weight:600;color:var(--ink-muted);font-size:11px;">${escapeHtml(yak||'Telefon')}</span>
        <span>${escapeHtml(tel)}</span>
        <span style="margin-left:auto;font-size:16px;">📞</span>
       </a>` : '';

  const tel1 = v.telefon1 || v.telefon || '';
  const yak1 = v.yakinlik1 || v.yakinlik || 'Veli';
  const tel2 = v.telefon2 || '';
  const yak2 = v.yakinlik2 || 'Veli 2';
  const tel3 = v.telefon3 || '';
  const yak3 = v.yakinlik3 || 'Veli 3';

  document.getElementById('detayBody').innerHTML = `
    <div style="padding:14px 18px;display:flex;flex-direction:column;gap:14px;">

      <!-- Kişisel Bilgiler -->
      <div class="detay-card">
        <h4>👤 Öğrenci Bilgileri</h4>
        ${v.ogrenciNo ? `<div class="detay-row"><span class="detay-row-muted">Öğrenci No</span><strong>${escapeHtml(v.ogrenciNo)}</strong></div>` : ''}
        <div class="detay-row"><span class="detay-row-muted">Sınıf</span><strong>${escapeHtml(sinifAdi)}</strong></div>
        ${v.cinsiyet ? `<div class="detay-row"><span class="detay-row-muted">Cinsiyet</span><span class="badge badge-${v.cinsiyet==='Kız'?'rose':'blue'}">${escapeHtml(v.cinsiyet)}</span></div>` : ''}
        ${servisAdi !== '—' ? `<div class="detay-row"><span class="detay-row-muted">Servis</span>${escapeHtml(servisAdi)}</div>` : ''}
        ${v.adres ? `<div class="detay-row"><span class="detay-row-muted">Adres</span>${escapeHtml(v.adres)}</div>` : ''}
      </div>

      <!-- Veli İletişim -->
      <div class="detay-card">
        <h4>📞 Veli İletişim</h4>
        <div style="margin-bottom:4px;font-weight:700;color:var(--ink);">${escapeHtml(v.veliAdi || '—')}</div>
        ${telSatir(tel1, yak1)}
        ${telSatir(tel2, yak2)}
        ${telSatir(tel3, yak3)}
        ${v.eposta ? `<div class="detay-row"><a href="mailto:${escapeHtml(v.eposta)}" style="color:var(--brand);">✉️ ${escapeHtml(v.eposta)}</a></div>` : ''}
      </div>

      <!-- WhatsApp hızlı buton -->
      ${tel1 ? `<a href="https://wa.me/9${tel1.replace(/[^0-9]/g,'')}" target="_blank" rel="noopener"
          style="display:flex;align-items:center;justify-content:center;gap:8px;background:#25D366;color:#fff;border-radius:12px;padding:12px;font-weight:700;font-size:14px;text-decoration:none;">
          <span style="font-size:20px;">💬</span> WhatsApp ile İletişim
        </a>` : ''}
    </div>`;

  // Profil avatar
  setTimeout(() => {
    const head = document.querySelector('.detay-head');
    if (head) {
      const old = head.querySelector('.detay-profil-foto');
      if (old) old.remove();
      const wrap = document.createElement('div');
      wrap.className = 'detay-profil-foto';
      wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;';
      const harf = (v.ogrenciAdi || '?')[0].toUpperCase();
      wrap.innerHTML = `<div style="width:60px;height:60px;border-radius:var(--icon-shape,50%);background:rgba(255,255,255,.22);border:2px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;">${harf}</div>`;
      head.insertBefore(wrap, head.firstChild);
    }
  }, 10);

  overlay.classList.add('active');
  document.body.classList.add('modal-open');
}

/* ================================================================
   GLOBAL ARAMA — tıklanabilir detay yönlendirme (fonksiyon güncellendi)
   ================================================================ */

// renderOgrenciler içindeki satırları tıklanabilir hale getir
function _ogrenciSatirHtml(v, sinifAdi) {
  const harf  = (v.ogrenciAdi || '?')[0].toUpperCase();
  const tel   = v.telefon1 || v.telefon || '';
  return `<div class="detay-row" style="cursor:pointer;" onclick="ogrenciDetayAc('${v.id}')">
    <div style="width:36px;height:36px;border-radius:var(--icon-shape,50%);background:var(--brand-light);color:var(--brand);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${harf}</div>
    <div style="flex:1;min-width:0;padding-left:10px;">
      <div style="font-weight:700;color:var(--ink);font-size:14px;">${escapeHtml(v.ogrenciAdi || '—')}</div>
      <div style="font-size:12px;color:var(--ink-muted);">Veli: ${escapeHtml(v.veliAdi || '—')}${v.yakinlik ? ' ('+escapeHtml(v.yakinlik)+')' : ''}</div>
    </div>
    ${tel ? `<a href="tel:${escapeHtml(tel)}" onclick="event.stopPropagation()" style="color:var(--brand);font-size:12px;flex-shrink:0;">📞</a>` : ''}
    <span style="color:var(--ink-muted);font-size:18px;margin-left:6px;">›</span>
  </div>`;
}
