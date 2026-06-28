/* ====================================================================
   js/ogretmen-detay.js
   Öğretmen listesinde bir satıra tıklayınca açılan, salt-okunur detay
   paneli. Ders programı, nöbetler, kulüp/rehberlik danışmanlığı, belirli
   gün görevleri ve diğer evrak kayıtları içinden o öğretmenle ilişkili
   olanları otomatik toplar. "Düzenle" butonu ayrı ve değişmeden kalır.
   ==================================================================== */

function adGeciyorMu(haystack, adSoyad){
  if(!haystack || !adSoyad) return false;
  return String(haystack).toLocaleLowerCase('tr').includes(String(adSoyad).toLocaleLowerCase('tr'));
}

function detayPanelKapat(){
  document.getElementById('detayOverlay').classList.remove('active');
  document.body.classList.remove('modal-open');
  detaySinifId = null;
}

function ogretmenDetayAc(id){
  const o = ogretmenler.find(x=>x.id===id);
  if(!o) return;
  const adSoyad = `${o.ad} ${o.soyad}`;

  document.getElementById('detayBaslik').textContent = adSoyad;
  document.getElementById('detayAltBaslik').textContent = [o.unvan||'Öğretmen', o.brans].filter(Boolean).join(' · ');
  document.getElementById('detayDuzenleBtn').onclick = ()=>{ detayPanelKapat(); ogretmenModalAc(id); };
  document.getElementById('detayRaporBtn').onclick = ()=>{ ogretmenRaporOlustur(id); };

  /* ---- Ders Programı ---- */
  const dersleri = dersProgrami.filter(d=>d.ogretmenId===id).sort((a,b)=> GUNLER.indexOf(a.gun)-GUNLER.indexOf(b.gun) || a.saat-b.saat);
  const dersHtml = dersleri.length ? dersleri.map(d=>
    `<div class="detay-row"><span class="badge badge-blue">${escapeHtml(d.gun)} · ${d.saat}.</span> ${escapeHtml(d.sinif)} — ${escapeHtml(d.ders)}</div>`
  ).join('') : '<p class="empty-state">Ders programında kaydı yok.</p>';

  /* ---- Nöbetler (bugünden itibaren, tarihe göre sıralı) ---- */
  const bugunISO = todayISO();
  const nobetleri = (typeof nobetAtamalari!=='undefined' ? nobetAtamalari : [])
    .filter(a=> a.ogretmenId===id || adGeciyorMu(a.ogretmenAdSoyad, adSoyad))
    .sort((a,b)=>a.tarih.localeCompare(b.tarih));
  const gelecekNobetler = nobetleri.filter(n=>n.tarih>=bugunISO);
  const gosterilecekNobetler = (gelecekNobetler.length ? gelecekNobetler : nobetleri.slice(-8)).slice(0,8);
  const nobetHtml = nobetleri.length ? (
    gosterilecekNobetler.map(n=>{
      const yer = (typeof nobetYerleri!=='undefined' ? nobetYerleri.find(y=>y.id===n.yerId) : null);
      return `<div class="detay-row">${formatTarih(n.tarih)} — ${escapeHtml(yer?yer.ad:'?')}</div>`;
    }).join('') + (nobetleri.length>gosterilecekNobetler.length ? `<div class="detay-row-muted">+${nobetleri.length-gosterilecekNobetler.length} kayıt daha (Nöbet Programı sekmesinde)</div>` : '')
  ) : '<p class="empty-state">Nöbet ataması yok.</p>';

  /* ---- Kulüp / Rehberlik danışmanlığı ---- */
  const kulupler = (cizelgeVerileri.sosyalKulupler||[]).filter(s=> adGeciyorMu(s.danisman, adSoyad) || (s.ogretmenler && s.ogretmenler.includes(id)));
  const kulupHtml = kulupler.length ? kulupler.map(k=>{
    const belirliGunler = (belirliGunlerListesi||[]).filter(e=>adGeciyorMu(e.gorevliOgretmen, k.ad));
    const ilgiliGunler = belirliGunler.length ? belirliGunler.map(e=>
      `<span class="cz-check ${e.tamamlandi?'on':''}" style="display:inline-flex;margin-right:4px;font-size:10px;">${e.tamamlandi?'✓':''}</span>`
    ).join('') : '';
    return `<div class="detay-row">${escapeHtml(k.ad)}${ilgiliGunler ? `<span style="margin-left:8px;color:var(--ink-muted);font-size:11px;">Görevler: ${ilgiliGunler}</span>` : ''}</div>`;
  }).join('') : '<p class="empty-state">Danışmanı olduğu kulüp yok.</p>';

  const rehberlikler = (cizelgeVerileri.rehberlik||[]).filter(s=>adGeciyorMu(s.danisman, adSoyad));
  const rehberlikHtml = rehberlikler.length ? rehberlikler.map(r=>`<div class="detay-row">${escapeHtml(r.ad)} (sınıf danışmanlığı)</div>`).join('') : '';

  /* ---- Yıllık / BEP Planı (en iyi eşleşme — satır adı öğretmen adını içeriyorsa) ---- */
  const bepKayitlari = (cizelgeVerileri.bepPlani||[]).filter(b=>adGeciyorMu(b.ad, adSoyad));
  const bepHtml = bepKayitlari.length ? bepKayitlari.map(b=>`<div class="detay-row">${escapeHtml(b.ad)}</div>`).join('') : '';

  /* ---- Belirli Gün ve Haftalar ---- */
  const belirliGunler = (belirliGunlerListesi||[]).filter(e=> (e.gorevliOgretmenler && e.gorevliOgretmenler.includes(id)) || adGeciyorMu(e.gorevliOgretmen, adSoyad));
  const belirliGunHtml = belirliGunler.length ? belirliGunler.map(e=>
    `<div class="detay-row"><span class="cz-check ${e.tamamlandi?'on':''}" style="margin-right:6px;display:inline-flex;">${e.tamamlandi?'✓':''}</span>${escapeHtml(e.baslik)} <span class="detay-row-muted">${escapeHtml(e.tarih||'')}</span></div>`
  ).join('') : '<p class="empty-state">Görevli olduğu etkinlik yok.</p>';

  /* ---- Yazılı Sınavlar ---- */
  const yaziliSinavlari = (typeof sinavlar !== 'undefined' ? sinavlar : [])
    .filter(s => s.ogretmenId === id || (s.siniflar && dersleri.some(d => s.siniflar.includes(d.sinif) && s.ders === d.ders)))
    .sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''));

  const yaziliHtml = yaziliSinavlari.length
    ? `<table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#0A6E6E;color:#fff;">
          <th style="padding:5px 8px;text-align:left;font-size:11px;">Tarih</th>
          <th style="padding:5px 8px;text-align:left;font-size:11px;">Sınıf</th>
          <th style="padding:5px 8px;text-align:left;font-size:11px;">Ders</th>
          <th style="padding:5px 8px;text-align:left;font-size:11px;">Dönem / Sıra</th>
          <th style="padding:5px 8px;text-align:left;font-size:11px;">Tür</th>
        </tr></thead>
        <tbody>${yaziliSinavlari.map((s, i) => `
          <tr style="${i % 2 === 1 ? 'background:#f7f9f9;' : ''}">
            <td style="padding:4px 8px;font-size:11px;">${escapeHtml(s.tarih ? formatTarih(s.tarih) : '—')}</td>
            <td style="padding:4px 8px;font-size:11px;font-weight:600;">${escapeHtml(s.siniflar || s.sinif || '—')}</td>
            <td style="padding:4px 8px;font-size:11px;">${escapeHtml(s.ders || '—')}</td>
            <td style="padding:4px 8px;font-size:11px;">${escapeHtml([s.donem, s.yaziliSirasi].filter(Boolean).join(' · ') || '—')}</td>
            <td style="padding:4px 8px;font-size:11px;">${escapeHtml(s.tur || '—')}</td>
          </tr>`).join('')}
        </tbody>
       </table>`
    : '<p style="color:#888;font-style:italic;">Yazılı sınav kaydı yok.</p>';

  /* ---- Diğer Evraklar ---- */
  const evraklar = (digerEvrakListesi||[]).filter(e=> (e.ogretmen||'').localeCompare(adSoyad,'tr',{sensitivity:'base'})===0);
  const evrakHtml = evraklar.length ? evraklar.map(e=>
    `<div class="detay-row">${escapeHtml(e.evrakTuru)} ${e.sinif?'· '+escapeHtml(e.sinif):''} <span class="detay-row-muted">${formatTarih(e.tarih)}</span></div>`
  ).join('') : '<p class="empty-state">Evrak kaydı yok.</p>';

  document.getElementById('detayBody').innerHTML = `
    <div class="detay-card">
      <h4>Temel Bilgiler</h4>
      <div class="detay-row" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span>Telefon: ${escapeHtml(o.telefon||'—')}</span>
        <button class="btn btn-success btn-sm${o.telefon?'':' od-disabled'}" ${o.telefon?`onclick="telefonAra('${(o.telefon||'').replace(/'/g,'')}')"`:' disabled'}>📞 Ara</button>
        <button class="btn btn-ghost btn-sm${o.telefon?'':' od-disabled'}" ${o.telefon?`onclick="whatsappGonder('${(o.telefon||'').replace(/'/g,'')}','Merhaba')"`:' disabled'} title="WhatsApp">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:3px;color:#25D366;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>WhatsApp
        </button>
      </div>
      <div class="detay-row">E-posta: ${escapeHtml(o.eposta||'—')}</div>
      ${o.sorumluSinif?`<div class="detay-row">Sorumlu Sınıf: ${escapeHtml(o.sorumluSinif)}</div>`:''}
      ${o.kariyerBasamagi && o.kariyerBasamagi!=='Öğretmen' ? `<div class="detay-row">Kariyer Basamağı: <span class="status-badge status-${kariyerBasamagiRengi(o.kariyerBasamagi)}">${escapeHtml(o.kariyerBasamagi)}</span></div>` : ''}
      ${(o.derece||o.kademe)?`<div class="detay-row">${o.derece?'Derece: '+o.derece:''}${o.derece&&o.kademe?' · ':''}${o.kademe?'Kademe: '+o.kademe:''}</div>`:''}
      ${o.notlar?`<div class="detay-row detay-row-muted">${escapeHtml(o.notlar)}</div>`:''}
    </div>
    <div class="detay-card"><h4>Ders Programı</h4>${dersHtml}</div>
    <div class="detay-card"><h4>Nöbetler</h4>${nobetHtml}</div>
    <div class="detay-card"><h4>Kulüp Danışmanlığı</h4>${kulupHtml}${rehberlikHtml}${bepHtml}</div>
    <div class="detay-card"><h4>Belirli Gün ve Haftalar</h4>${belirliGunHtml}</div>
    <div class="detay-card"><h4>Diğer Evrak</h4>${evrakHtml}</div>
  `;

  document.getElementById('detayOverlay').classList.add('active'); document.body.classList.add('modal-open');
}

/* ================================================================
   ÖĞRETMEN PROFİL RAPORU
   _raporPenceresiniAc kullanır (raporlama.js'de tanımlı).
   ================================================================ */

function ogretmenRaporOlustur(id) {
  const o = ogretmenler.find(x => x.id === id);
  if (!o) return;
  const adSoyad = `${o.ad} ${o.soyad}`.trim();

  /* ---- Ders Programı ---- */
  const dersleri = dersProgrami
    .filter(d => d.ogretmenId === id)
    .sort((a, b) => GUNLER.indexOf(a.gun) - GUNLER.indexOf(b.gun) || a.saat - b.saat);

  // Haftalık program tablosu
  const programSatirlar = GUNLER.map(gun => {
    const gunDersleri = dersleri.filter(d => d.gun === gun);
    if (!gunDersleri.length) return '';
    return gunDersleri.map(d =>
      `<tr>
        <td style="width:90px;font-weight:600;color:#0A6E6E;">${escapeHtml(gun)}</td>
        <td style="width:40px;text-align:center;">${d.saat}. ders</td>
        <td style="font-weight:600;">${escapeHtml(d.sinif)}</td>
        <td>${escapeHtml(d.ders)}</td>
      </tr>`
    ).join('');
  }).join('');

  const dersTabloHtml = dersleri.length
    ? `<table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#0A6E6E;color:#fff;">
          <th style="padding:5px 8px;text-align:left;">Gün</th>
          <th style="padding:5px 8px;text-align:center;">Saat</th>
          <th style="padding:5px 8px;text-align:left;">Sınıf</th>
          <th style="padding:5px 8px;text-align:left;">Ders</th>
        </tr></thead>
        <tbody>${programSatirlar}</tbody>
       </table>`
    : '<p style="color:#888;font-style:italic;">Ders programında kaydı yok.</p>';

  /* ---- Toplam ders saati ---- */
  const toplamDers = dersleri.length;
  const siniflar2 = [...new Set(dersleri.map(d => d.sinif))].join(', ');

  /* ---- Nöbetler ---- */
  const bugunISO = todayISO();
  const nobetleri = (typeof nobetAtamalari !== 'undefined' ? nobetAtamalari : [])
    .filter(a => a.ogretmenId === id || adGeciyorMu(a.ogretmenAdSoyad, adSoyad))
    .sort((a, b) => a.tarih.localeCompare(b.tarih));

  const nobetTabloHtml = nobetleri.length
    ? `<table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#0A6E6E;color:#fff;">
          <th style="padding:5px 8px;text-align:left;">Tarih</th>
          <th style="padding:5px 8px;text-align:left;">Gün</th>
          <th style="padding:5px 8px;text-align:left;">Nöbet Yeri</th>
        </tr></thead>
        <tbody>${nobetleri.map(n => {
          const yer = (typeof nobetYerleri !== 'undefined' ? nobetYerleri.find(y => y.id === n.yerId) : null);
          const tarih = new Date(n.tarih);
          const gunAdi = tarih.toLocaleDateString('tr-TR', { weekday: 'long' });
          const gectiMi = n.tarih < bugunISO;
          return `<tr style="${gectiMi ? 'color:#aaa;' : ''}">
            <td style="padding:4px 8px;">${formatTarih(n.tarih)}</td>
            <td style="padding:4px 8px;">${gunAdi}</td>
            <td style="padding:4px 8px;">${escapeHtml(yer ? yer.ad : '?')}</td>
          </tr>`;
        }).join('')}</tbody>
       </table>`
    : '<p style="color:#888;font-style:italic;">Nöbet ataması yok.</p>';

  /* ---- Sosyal Kulüpler ---- */
  const kulupler = (cizelgeVerileri.sosyalKulupler || [])
    .filter(s => adGeciyorMu(s.danisman, adSoyad) || (s.ogretmenler && s.ogretmenler.includes(id)));
  const kulupHtml = kulupler.length
    ? kulupler.map(k => `<div style="padding:3px 0;border-bottom:1px solid #eee;">📌 ${escapeHtml(k.ad)}</div>`).join('')
    : '<p style="color:#888;font-style:italic;">Danışmanı olduğu kulüp yok.</p>';

  /* ---- Rehberlik ---- */
  const rehberlikler = (cizelgeVerileri.rehberlik || []).filter(s => adGeciyorMu(s.danisman, adSoyad));
  const rehberlikHtml = rehberlikler.length
    ? rehberlikler.map(r => `<div style="padding:3px 0;border-bottom:1px solid #eee;">🏫 ${escapeHtml(r.ad)} — Rehberlik Danışmanı</div>`).join('')
    : '';

  /* ---- Belirli Gün ve Haftalar ---- */
  const belirliGunler = (belirliGunlerListesi || [])
    .filter(e => (e.gorevliOgretmenler && e.gorevliOgretmenler.includes(id)) || adGeciyorMu(e.gorevliOgretmen, adSoyad));
  const belirliGunHtml = belirliGunler.length
    ? `<table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#0A6E6E;color:#fff;">
          <th style="padding:5px 8px;text-align:left;">Etkinlik</th>
          <th style="padding:5px 8px;text-align:left;">Tarih</th>
          <th style="padding:5px 8px;text-align:center;">Durum</th>
        </tr></thead>
        <tbody>${belirliGunler.map(e => `
          <tr>
            <td style="padding:4px 8px;">${escapeHtml(e.baslik)}</td>
            <td style="padding:4px 8px;">${escapeHtml(e.tarih || '—')}</td>
            <td style="padding:4px 8px;text-align:center;">${e.tamamlandi ? '✅' : '⏳'}</td>
          </tr>`).join('')}</tbody>
       </table>`
    : '<p style="color:#888;font-style:italic;">Görevli olduğu etkinlik yok.</p>';

  /* ---- Belge Durumu ---- */
  const AYLAR_RAPOR = ['Eyl','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'];
  const DONEM_RAPOR = ['1. Dönem','2. Dönem','Yıl Sonu'];
  const KULUP_RAPOR = ['Yıllık Plan','Toplum Hizm.','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz','Sene Sonu'];
  const REHB_RAPOR  = ['Yıllık Plan','Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz','1.D.Sonu','Sene Sonu'];
  const BEP_RAPOR   = ['Yıllık Ders Planı','BEP Planı'];

  // Yatay tablo: üstte başlıklar, altta ✅/⬜
  function yarayTabloHtml(baslik, kolonAdlari, kArr) {
    const thler = kolonAdlari.map(ad =>
      `<th style="padding:4px 5px;text-align:center;font-size:9px;white-space:nowrap;background:#0A6E6E;color:#fff;border:1px solid #075757;">${escapeHtml(ad)}</th>`
    ).join('');
    const tdler = kolonAdlari.map((_, i) => {
      const tamam = Array.isArray(kArr) ? !!kArr[i] : false;
      return `<td style="padding:4px 5px;text-align:center;font-size:14px;border:1px solid #ddd;">${tamam ? '✅' : '⬜'}</td>`;
    }).join('');
    return `<div style="margin-bottom:12px;overflow-x:auto;">
      <div style="font-size:10.5px;font-weight:700;color:#0A5050;padding:3px 0 4px;">${escapeHtml(baslik)}</div>
      <table style="border-collapse:collapse;min-width:100%;">
        <thead><tr>${thler}</tr></thead>
        <tbody><tr>${tdler}</tr></tbody>
      </table>
    </div>`;
  }

  let belgeDurumHtml = '';

  // Sosyal Kulüpler
  const kulupBelge = (cizelgeVerileri.sosyalKulupler || []).filter(s =>
    adGeciyorMu(s.danisman, adSoyad) || (s.ogretmenler && s.ogretmenler.includes(id))
  );
  if (kulupBelge.length) {
    belgeDurumHtml += '<div style="font-weight:700;font-size:11px;color:#555;margin-bottom:8px;letter-spacing:.3px;">🎭 SOSYAL KULÜPLER</div>';
    kulupBelge.forEach(k => {
      const k12 = Array.isArray(k.kontroller) ? k.kontroller
        : KULUP_RAPOR.map((_, i) => !!(k.durumlar && Object.values(k.durumlar)[i]));
      belgeDurumHtml += yarayTabloHtml(k.ad || '—', KULUP_RAPOR, k12);
    });
  }

  // Maarif Raporları
  const maarifKayitlar = (cizelgeVerileri.maarifRapor || []).filter(k => k.ogretmenId === id);
  if (maarifKayitlar.length) {
    belgeDurumHtml += '<div style="font-weight:700;font-size:11px;color:#555;margin:12px 0 8px;letter-spacing:.3px;">📊 MAARİF MODEL RAPORLARI</div>';
    maarifKayitlar.forEach(k => {
      const k10 = Array.isArray(k.kontroller) ? k.kontroller : [];
      belgeDurumHtml += yarayTabloHtml(
        `${k.ders || '—'}${k.sinif ? ' · ' + k.sinif : ''}`,
        AYLAR_RAPOR, k10
      );
    });
  }

  // Zümre
  const zumreKayitlar = (cizelgeVerileri.zumre || []).filter(k =>
    k.ogretmenId === id || adGeciyorMu(k.ad, adSoyad)
  );
  if (zumreKayitlar.length) {
    belgeDurumHtml += '<div style="font-weight:700;font-size:11px;color:#555;margin:12px 0 8px;letter-spacing:.3px;">👥 ZÜMRE</div>';
    zumreKayitlar.forEach(k => {
      const kArr = Array.isArray(k.kontroller) ? k.kontroller
        : DONEM_RAPOR.map((_, i) => !!(k.durumlar && Object.values(k.durumlar)[i]));
      belgeDurumHtml += yarayTabloHtml(k.ad || k.brans || '—', DONEM_RAPOR, kArr);
    });
  }

  // ŞÖK
  const sokKayitlar = (cizelgeVerileri.sok || []).filter(k =>
    k.ogretmenId === id || adGeciyorMu(k.ad, adSoyad)
  );
  if (sokKayitlar.length) {
    belgeDurumHtml += '<div style="font-weight:700;font-size:11px;color:#555;margin:12px 0 8px;letter-spacing:.3px;">📋 ŞÖK</div>';
    sokKayitlar.forEach(k => {
      const kArr = Array.isArray(k.kontroller) ? k.kontroller
        : DONEM_RAPOR.map((_, i) => !!(k.durumlar && Object.values(k.durumlar)[i]));
      belgeDurumHtml += yarayTabloHtml(k.ad || '—', DONEM_RAPOR, kArr);
    });
  }

  // Rehberlik
  const rehberlikBelge = (cizelgeVerileri.rehberlik || []).filter(k =>
    k.ogretmenId === id || adGeciyorMu(k.danisman, adSoyad)
  );
  if (rehberlikBelge.length) {
    belgeDurumHtml += '<div style="font-weight:700;font-size:11px;color:#555;margin:12px 0 8px;letter-spacing:.3px;">🧭 REHBERLİK</div>';
    rehberlikBelge.forEach(k => {
      const k12 = Array.isArray(k.kontroller) ? k.kontroller
        : REHB_RAPOR.map((_, i) => !!(k.durumlar && Object.values(k.durumlar)[i]));
      belgeDurumHtml += yarayTabloHtml(k.ad || '—', REHB_RAPOR, k12);
    });
  }

  // BEP
  const bepKayitlar2 = (cizelgeVerileri.bepPlani || []).filter(k =>
    k.ogretmenId === id || adGeciyorMu(k.ad, adSoyad)
  );
  if (bepKayitlar2.length) {
    belgeDurumHtml += '<div style="font-weight:700;font-size:11px;color:#555;margin:12px 0 8px;letter-spacing:.3px;">📌 BEP PLANI</div>';
    bepKayitlar2.forEach(k => {
      const kArr = Array.isArray(k.kontroller) ? k.kontroller
        : BEP_RAPOR.map((_, i) => !!(k.durumlar && Object.values(k.durumlar)[i]));
      belgeDurumHtml += yarayTabloHtml(k.ad || '—', BEP_RAPOR, kArr);
    });
  }

  if (!belgeDurumHtml) {
    belgeDurumHtml = '<p style="color:#888;font-style:italic;">Belge kaydı yok.</p>';
  }

  /* ---- Yazılı Sınavlar ---- */
  const yaziliSinavlari = (typeof sinavlar !== 'undefined' ? sinavlar : [])
    .filter(s => s.ogretmenId === id || (s.siniflar && dersleri.some(d => s.siniflar.includes(d.sinif) && s.ders === d.ders)))
    .sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''));

  const yaziliHtml = yaziliSinavlari.length
    ? `<table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#0A6E6E;color:#fff;">
          <th style="padding:5px 8px;text-align:left;font-size:11px;">Tarih</th>
          <th style="padding:5px 8px;text-align:left;font-size:11px;">Sınıf</th>
          <th style="padding:5px 8px;text-align:left;font-size:11px;">Ders</th>
          <th style="padding:5px 8px;text-align:left;font-size:11px;">Dönem / Sıra</th>
          <th style="padding:5px 8px;text-align:left;font-size:11px;">Tür</th>
        </tr></thead>
        <tbody>${yaziliSinavlari.map((s, i) => `
          <tr style="${i % 2 === 1 ? 'background:#f7f9f9;' : ''}">
            <td style="padding:4px 8px;font-size:11px;">${escapeHtml(s.tarih ? formatTarih(s.tarih) : '—')}</td>
            <td style="padding:4px 8px;font-size:11px;font-weight:600;">${escapeHtml(s.siniflar || s.sinif || '—')}</td>
            <td style="padding:4px 8px;font-size:11px;">${escapeHtml(s.ders || '—')}</td>
            <td style="padding:4px 8px;font-size:11px;">${escapeHtml([s.donem, s.yaziliSirasi].filter(Boolean).join(' · ') || '—')}</td>
            <td style="padding:4px 8px;font-size:11px;">${escapeHtml(s.tur || '—')}</td>
          </tr>`).join('')}
        </tbody>
       </table>`
    : '<p style="color:#888;font-style:italic;">Yazılı sınav kaydı yok.</p>';

  /* ---- Diğer Evraklar ---- */
  const evraklar = (digerEvrakListesi || [])
    .filter(e => (e.ogretmen || '').localeCompare(adSoyad, 'tr', { sensitivity: 'base' }) === 0);
  const evrakHtml = evraklar.length
    ? evraklar.map(e =>
        `<div style="padding:3px 0;border-bottom:1px solid #eee;">📄 ${escapeHtml(e.evrakTuru)}${e.sinif ? ' · ' + escapeHtml(e.sinif) : ''} <span style="color:#aaa;font-size:11px;">${formatTarih(e.tarih)}</span></div>`
      ).join('')
    : '<p style="color:#888;font-style:italic;">Evrak kaydı yok.</p>';

  /* ---- HTML Rapor ---- */
  const tarih = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  const okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari?.okulAdi) || '';

  const icerik = `
    <style>
      .ogr-rapor-bolum { margin-bottom: 18px; }
      .ogr-rapor-bolum h3 {
        font-size: 12px; font-weight: 700; color: #0A6E6E;
        border-bottom: 1.5px solid #0A6E6E; padding-bottom: 3px; margin-bottom: 8px;
        text-transform: uppercase; letter-spacing: .5px;
      }
      .ogr-bilgi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 11px; }
      .ogr-bilgi-grid .lbl { color: #888; }
      .ogr-bilgi-grid .val { font-weight: 600; color: #111; }
      table tbody tr:nth-child(even) { background: #f7f9f9; }
      table tbody td { font-size: 11px; }
      table thead th { font-size: 11px; }
    </style>

    <!-- Öğretmen Bilgileri -->
    <div class="ogr-rapor-bolum">
      <h3>👤 Kişisel Bilgiler</h3>
      <div class="ogr-bilgi-grid">
        <span class="lbl">Adı Soyadı</span><span class="val">${escapeHtml(adSoyad)}</span>
        <span class="lbl">Ünvan</span><span class="val">${escapeHtml(o.unvan || '—')}</span>
        <span class="lbl">Branş</span><span class="val">${escapeHtml(o.brans || '—')}</span>
        <span class="lbl">Kariyer Basamağı</span><span class="val">${escapeHtml(o.kariyerBasamagi || '—')}</span>
        <span class="lbl">Derece / Kademe</span><span class="val">${o.derece || o.kademe ? `${o.derece || '—'} / ${o.kademe || '—'}` : '—'}</span>
        <span class="lbl">Sorumlu Sınıf</span><span class="val">${escapeHtml(o.sorumluSinif || '—')}</span>
        <span class="lbl">Telefon</span><span class="val">${escapeHtml(o.telefon || '—')}</span>
        <span class="lbl">E-Posta</span><span class="val">${escapeHtml(o.eposta || '—')}</span>
      </div>
    </div>

    <!-- Ders Programı -->
    <div class="ogr-rapor-bolum">
      <h3>📅 Haftalık Ders Programı <span style="font-weight:400;font-size:10px;color:#888;">(${toplamDers} ders saati${siniflar2 ? ' · ' + siniflar2 : ''})</span></h3>
      ${dersTabloHtml}
    </div>

    <!-- Nöbet -->
    <div class="ogr-rapor-bolum">
      <h3>🛡️ Nöbet Çizelgesi <span style="font-weight:400;font-size:10px;color:#888;">(${nobetleri.length} kayıt)</span></h3>
      ${nobetTabloHtml}
    </div>

    <!-- Kulüp & Rehberlik -->
    <div class="ogr-rapor-bolum">
      <h3>🎭 Sosyal Kulüp & Rehberlik</h3>
      ${kulupHtml}
      ${rehberlikHtml}
    </div>

    <!-- Belirli Gün -->
    <div class="ogr-rapor-bolum">
      <h3>📆 Belirli Gün ve Haftalar</h3>
      ${belirliGunHtml}
    </div>

    <!-- Yazılı Sınavlar -->
    <div class="ogr-rapor-bolum">
      <h3>✏️ Yazılı Sınavlar</h3>
      ${yaziliHtml}
    </div>

    <!-- Belge Durumu -->
    <div class="ogr-rapor-bolum">
      <h3>📁 Belge Durumu</h3>
      ${belgeDurumHtml}
    </div>

    <!-- Evrak -->
    <div class="ogr-rapor-bolum">
      <h3>📋 Diğer Evraklar</h3>
      ${evrakHtml}
    </div>
  `;

  _raporPenceresiniAc(icerik, `${adSoyad} — Öğretmen Profil Raporu`, { ortaliBaslik: false });
}
