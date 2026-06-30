/* ====================================================================
   js/ogrenciler-arama.js
   1. renderOgrenciler()  — Öğrenciler sekmesi (veliler[] kaynağı)
   2. globalAramaYap()   — Tüm kayıtlarda arama
   3. Öğretmen profil fotoğrafı desteği (profilFotoyukle / profilFotoGoster)
   ====================================================================
   Mevcut koleksiyon yapısı değiştirilmedi; veliler[], ogretmenler[],
   servisler[], evrakTakibi[], notlar[], personelListesi[] kullanılır.
   ==================================================================== */

/* ================================================================
   ÖĞRETMEN PROFİL FOTOĞRAFI
   Firestore'daki öğretmen dokümanına "profilFotoUrl" (base64 veya
   Drive linki) alanı eklenir. ogretmenModalAc() mevcut işlevini
   korur; biz sadece detay panelinde avatarı gösteriyoruz.
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
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = function() {
    const file = inp.files[0]; if (!file) return;
    if (file.size > 500 * 1024) { toast('Fotoğraf 500 KB\'dan küçük olmalı.'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
      const base64 = e.target.result;
      if (typeof db !== 'undefined' && typeof COL !== 'undefined') {
        db.collection(COL.ogretmenler).doc(ogretmenId).update({ profilFotoUrl: base64 })
          .then(() => { toast('Profil fotoğrafı kaydedildi.'); ogretmenDetayAc(ogretmenId); })
          .catch(err => toast('Hata: ' + err.message));
      }
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}

/* ogretmenDetayAc() çağrıldıktan sonra avatar ve fotoğraf butonunu enjekte eder */
function detayPanelineProfilFotoEkle(ogretmenId) {
  const head = document.querySelector('.detay-head');
  if (!head || head.querySelector('.detay-profil-foto')) return;
  const wrap = document.createElement('div');
  wrap.className = 'detay-profil-foto';
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;';
  wrap.innerHTML = profilFotoGoster(ogretmenId) +
    `<button onclick="profilFotoYukle('${ogretmenId}')" style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:8px;padding:4px 10px;color:#fff;font-size:11px;cursor:pointer;">📷</button>`;
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
      const harf = (v.ogrenciAdi||'?')[0].toUpperCase();
      const tel  = v.telefon ? `<a href="tel:${escapeHtml(v.telefon)}" style="color:var(--brand);font-size:12px;">📞 ${escapeHtml(v.telefon)}</a>` : '';
      html += `<div class="detay-row" style="display:flex;align-items:center;gap:12px;padding:10px 0;">
        <div style="width:36px;height:36px;border-radius:var(--icon-shape,50%);background:var(--brand-light);color:var(--brand);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${harf}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;color:var(--ink);font-size:14px;">${escapeHtml(v.ogrenciAdi||'—')}</div>
          <div style="font-size:12px;color:var(--ink-muted);">Veli: ${escapeHtml(v.veliAdi||'—')}${v.yakinlik?' ('+escapeHtml(v.yakinlik)+')':''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">${tel}</div>
      </div>`;
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
        html += `<div class="detay-row" style="cursor:pointer;" onclick="ogretmenDetayAc('${o.id}'); sekmeAc('ogretmenler');">
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
        const sAdi = (typeof siniflar !== 'undefined' ? (siniflar.find(s=>s.id===v.sinifId)||{}).ad : '') || '?';
        html += `<div class="detay-row">
          <div style="flex:1;">
            <div style="font-weight:700;color:var(--ink);">${escapeHtml(v.ogrenciAdi||'—')}</div>
            <div style="font-size:12px;color:var(--ink-muted);">Sınıf: ${escapeHtml(sAdi)} · Veli: ${escapeHtml(v.veliAdi||'—')}</div>
          </div>
          ${v.telefon ? `<a href="tel:${escapeHtml(v.telefon)}" style="color:var(--brand);font-size:12px;">📞 ${escapeHtml(v.telefon)}</a>` : ''}
        </div>`;
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
        html += `<div class="detay-row"><div style="flex:1;">
          <div style="font-weight:700;color:var(--ink);">${escapeHtml((p.ad||'')+' '+(p.soyad||''))}</div>
          <div style="font-size:12px;color:var(--ink-muted);">${escapeHtml(p.gorev||p.unvan||'')}</div>
        </div>
        ${p.telefon?`<a href="tel:${escapeHtml(p.telefon)}" style="color:var(--brand);font-size:12px;">📞 ${escapeHtml(p.telefon)}</a>`:''}
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
