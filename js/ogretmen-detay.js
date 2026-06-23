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
  detaySinifId = null;
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

  document.getElementById('detayOverlay').classList.add('active');
}
