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
}

function ogretmenDetayAc(id){
  const o = ogretmenler.find(x=>x.id===id);
  if(!o) return;
  const adSoyad = `${o.ad} ${o.soyad}`;

  document.getElementById('detayBaslik').textContent = adSoyad;
  document.getElementById('detayAltBaslik').textContent = [o.unvan||'Öğretmen', o.brans].filter(Boolean).join(' · ');
  document.getElementById('detayDuzenleBtn').onclick = ()=>{ detayPanelKapat(); ogretmenModalAc(id); };

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
  const kulupler = (cizelgeVerileri.sosyalKulupler||[]).filter(s=>adGeciyorMu(s.danisman, adSoyad));
  const kulupHtml = kulupler.length ? kulupler.map(k=>`<div class="detay-row">${escapeHtml(k.ad)}</div>`).join('') : '<p class="empty-state">Danışmanı olduğu kulüp yok.</p>';

  const rehberlikler = (cizelgeVerileri.rehberlik||[]).filter(s=>adGeciyorMu(s.danisman, adSoyad));
  const rehberlikHtml = rehberlikler.length ? rehberlikler.map(r=>`<div class="detay-row">${escapeHtml(r.ad)} (sınıf danışmanlığı)</div>`).join('') : '';

  /* ---- Yıllık / BEP Planı (en iyi eşleşme — satır adı öğretmen adını içeriyorsa) ---- */
  const bepKayitlari = (cizelgeVerileri.bepPlani||[]).filter(b=>adGeciyorMu(b.ad, adSoyad));
  const bepHtml = bepKayitlari.length ? bepKayitlari.map(b=>`<div class="detay-row">${escapeHtml(b.ad)}</div>`).join('') : '';

  /* ---- Belirli Gün ve Haftalar ---- */
  const belirliGunler = (belirliGunlerListesi||[]).filter(e=>adGeciyorMu(e.gorevliOgretmen, adSoyad));
  const belirliGunHtml = belirliGunler.length ? belirliGunler.map(e=>
    `<div class="detay-row"><span class="cz-check ${e.tamamlandi?'on':''}" style="margin-right:6px;display:inline-flex;">${e.tamamlandi?'✓':''}</span>${escapeHtml(e.baslik)} <span class="detay-row-muted">${escapeHtml(e.tarih||'')}</span></div>`
  ).join('') : '<p class="empty-state">Görevli olduğu etkinlik yok.</p>';

  /* ---- Diğer Evraklar ---- */
  const evraklar = (digerEvrakListesi||[]).filter(e=> (e.ogretmen||'').localeCompare(adSoyad,'tr',{sensitivity:'base'})===0);
  const evrakHtml = evraklar.length ? evraklar.map(e=>
    `<div class="detay-row">${escapeHtml(e.evrakTuru)} ${e.sinif?'· '+escapeHtml(e.sinif):''} <span class="detay-row-muted">${formatTarih(e.tarih)}</span></div>`
  ).join('') : '<p class="empty-state">Evrak kaydı yok.</p>';

  document.getElementById('detayBody').innerHTML = `
    <div class="detay-card">
      <h4>Temel Bilgiler</h4>
      <div class="detay-row">Telefon: ${escapeHtml(o.telefon||'—')}</div>
      <div class="detay-row">E-posta: ${escapeHtml(o.eposta||'—')}</div>
      ${o.sorumluSinif?`<div class="detay-row">Sorumlu Sınıf: ${escapeHtml(o.sorumluSinif)}</div>`:''}
      ${(o.derece||o.kademe)?`<div class="detay-row">${o.derece?'Derece: '+o.derece:''}${o.derece&&o.kademe?' · ':''}${o.kademe?'Kademe: '+o.kademe:''}</div>`:''}
      ${o.notlar?`<div class="detay-row detay-row-muted">${escapeHtml(o.notlar)}</div>`:''}
    </div>
    <div class="detay-card"><h4>Ders Programı</h4>${dersHtml}</div>
    <div class="detay-card"><h4>Nöbetler</h4>${nobetHtml}</div>
    <div class="detay-card"><h4>Kulüp Danışmanlığı</h4>${kulupHtml}${rehberlikHtml}${bepHtml}</div>
    <div class="detay-card"><h4>Belirli Gün ve Haftalar</h4>${belirliGunHtml}</div>
    <div class="detay-card"><h4>Diğer Evrak</h4>${evrakHtml}</div>
  `;

  document.getElementById('detayOverlay').classList.add('active');
}
