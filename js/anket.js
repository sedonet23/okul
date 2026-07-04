/* ================================================================
   js/anket.js — ANKETLER modülü UI katmanı
   ================================================================ */
let anketler = [];

function anketlerBaglantisiKur(){
  AnketRepository.anketleriDinle(v => {
    anketler = v;
    renderAnketler();
  });
}

function renderAnketler(){
  const hedef = document.getElementById('anketListesi');
  if(!hedef) return;
  const adminMi = AnketService.detayliSonucGorebilirMi();
  const yeniBtn = document.getElementById('anketYeniBtn');
  if(yeniBtn) yeniBtn.style.display = adminMi ? '' : 'none';

  if(!anketler.length){
    hedef.innerHTML = '<p class="empty-state">Henüz anket yok.' + (adminMi ? ' "+ Yeni Anket" ile ilk anketi oluşturun.' : '') + '</p>';
    return;
  }

  hedef.innerHTML = anketler.map(a=>{
    const kendiOyu = AnketService.kendiOyunuGetir(a);
    const { katilimciSayisi } = AnketService.sonuclariHesapla(a);
    return `<div class="card dash-card-clickable" style="margin-bottom:10px;" onclick="anketDetayAc('${a.id}')">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
        <div style="font-weight:700;font-size:15px;">${escapeHtml(a.soru)}</div>
        <span class="badge badge-${a.aktif?'sage':'gray'}" style="flex-shrink:0;">${a.aktif?'Aktif':'Kapalı'}</span>
      </div>
      <div style="font-size:12px;color:var(--ink-muted);margin-top:6px;">
        ${a.coklu ? '☑️ Çoklu seçim' : '🔘 Tekli seçim'} · ${katilimciSayisi} kişi oy kullandı
        ${kendiOyu ? ' · ✅ Oy kullandınız' : (a.aktif ? ' · ⏳ Henüz oy kullanmadınız' : '')}
      </div>
    </div>`;
  }).join('');
}

/* ---------- Anket oluşturma (admin) ---------- */
function anketOlusturModalAc(){
  window._anketFormSecenekSayaci = 2;
  const body = `
    <label>Soru</label>
    <input id="f_anketSoru" placeholder="örn: Yıl sonu pikniği için hangi tarihi tercih edersiniz?">
    <label style="margin-top:10px;">Seçenekler</label>
    <div id="anketSecenekAlanlari">
      <input class="f_anketSecenek" placeholder="Seçenek 1" style="margin-bottom:6px;">
      <input class="f_anketSecenek" placeholder="Seçenek 2" style="margin-bottom:6px;">
    </div>
    <button type="button" class="btn btn-ghost btn-sm" onclick="anketSecenekEkle()">➕ Seçenek Ekle</button>
    <label style="display:flex;align-items:center;gap:8px;margin-top:14px;">
      <input type="checkbox" id="f_anketCoklu"> Çoklu seçime izin ver (kişi birden fazla seçenek işaretleyebilir)
    </label>
  `;
  modalAc('📊 Yeni Anket Oluştur', body, () => anketOlusturKaydet(), null, '💾 Oluştur');
}
function anketSecenekEkle(){
  window._anketFormSecenekSayaci++;
  const alan = document.getElementById('anketSecenekAlanlari');
  const input = document.createElement('input');
  input.className = 'f_anketSecenek';
  input.placeholder = `Seçenek ${window._anketFormSecenekSayaci}`;
  input.style.marginBottom = '6px';
  alan.appendChild(input);
}
async function anketOlusturKaydet(){
  const soru = document.getElementById('f_anketSoru').value;
  const secenekler = Array.from(document.querySelectorAll('.f_anketSecenek')).map(i=>i.value);
  const coklu = document.getElementById('f_anketCoklu').checked;
  try{
    await AnketService.anketOlustur(soru, secenekler, coklu);
    toast('Anket oluşturuldu.');
    modalKapat();
  }catch(err){
    if(err.message === 'soru-gerekli') toast('Soru zorunludur.');
    else if(err.message === 'yetersiz-secenek') toast('En az 2 dolu seçenek girin.');
    else if(err.message !== 'yetkisiz') toast('Hata: ' + err.message);
  }
}

/* ---------- Anket detayı / oy verme / sonuçlar ---------- */
function anketDetayAc(id){
  const a = anketler.find(x=>x.id===id);
  if(!a) return;
  const adminMi = AnketService.detayliSonucGorebilirMi();
  const kendiOyu = AnketService.kendiOyunuGetir(a);
  const { katilimciSayisi, secenekSonuclari } = AnketService.sonuclariHesapla(a);
  const sonucGosterilsinMi = !!kendiOyu || !a.aktif || adminMi; // oy verdiyse, anket kapalıysa veya admin ise sonuç göster

  let govde = `<div style="font-size:12px;color:var(--ink-muted);margin-bottom:14px;">
    ${a.coklu ? '☑️ Çoklu seçim' : '🔘 Tekli seçim'} · Oluşturan: ${escapeHtml(a.olusturanAdi||'')} ·
    <span class="badge badge-${a.aktif?'sage':'gray'}">${a.aktif?'Aktif':'Kapalı'}</span>
  </div>`;

  if(a.aktif && !sonucGosterilsinMi){
    // Henüz oy vermemiş — oylama formu göster
    const girdiTipi = a.coklu ? 'checkbox' : 'radio';
    govde += `<div id="anketOySecenekleri">` + a.secenekler.map(s=>`
      <label style="display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid var(--border);border-radius:10px;margin-bottom:6px;cursor:pointer;">
        <input type="${girdiTipi}" name="anketOy" value="${s.id}">
        ${escapeHtml(s.metin)}
      </label>`).join('') + `</div>
      <button class="btn btn-amber" style="width:100%;margin-top:8px;" onclick="anketOyGonder('${id}')">Oyumu Gönder</button>`;
  } else {
    // Sonuçları göster (oy vermiş, anket kapalı, veya admin)
    govde += secenekSonuclari.map(s=>{
      const kendiSectimMi = kendiOyu && kendiOyu.secenekIdler.includes(s.id);
      return `<div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:4px;">
          <span style="font-weight:${kendiSectimMi?'700':'400'};">${escapeHtml(s.metin)} ${kendiSectimMi?'✅':''}</span>
          <span style="color:var(--ink-muted);">${s.sayi} oy (%${s.yuzde})</span>
        </div>
        <div style="background:var(--nm-bg);border-radius:999px;height:10px;overflow:hidden;">
          <div style="background:var(--brand);height:100%;width:${s.yuzde}%;border-radius:999px;"></div>
        </div>
      </div>`;
    }).join('') + `<div style="font-size:12px;color:var(--ink-muted);margin-top:6px;">Toplam ${katilimciSayisi} kişi oy kullandı.</div>`;

    if(a.aktif && kendiOyu){
      govde += `<button class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="anketOyDegistirModuAc('${id}')">✏️ Oyumu Değiştir</button>`;
    }

    // Admin'e özel: kim ne oy verdi dökümü
    if(adminMi){
      const kimNeOyVerdi = Object.entries(a.oylar||{}).map(([uid, oy])=>{
        const secilenMetinler = oy.secenekIdler.map(sid => a.secenekler.find(s=>s.id===sid)?.metin || '?').join(', ');
        return `<div class="detay-row" style="font-size:12.5px;"><strong>${escapeHtml(oy.ad)}</strong>: ${escapeHtml(secilenMetinler)}</div>`;
      }).join('');
      govde += `<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border);">
        <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;color:var(--ink-muted);">👑 KİM NE OY VERDİ (sadece admin görür)</div>
        ${kimNeOyVerdi || '<p class="empty-state">Henüz kimse oy kullanmadı.</p>'}
      </div>`;
    }
  }

  if(adminMi){
    govde += `<div style="display:flex;gap:8px;margin-top:16px;">
      <button class="btn btn-ghost btn-sm" onclick="anketKapatToggle('${id}', ${a.aktif})">${a.aktif ? '🔒 Anketi Kapat' : '🔓 Anketi Yeniden Aç'}</button>
    </div>`;
  }

  modalAc(a.soru, govde, null, adminMi ? () => anketSilOnay(id) : null, null);
  const kb = document.getElementById('modalKaydetBtn');
  if(kb) kb.style.display = 'none';
}

function anketOyDegistirModuAc(id){
  const a = anketler.find(x=>x.id===id);
  if(!a) return;
  const kendiOyu = AnketService.kendiOyunuGetir(a);
  const girdiTipi = a.coklu ? 'checkbox' : 'radio';
  const govde = `<div id="anketOySecenekleri">` + a.secenekler.map(s=>{
    const seciliMi = kendiOyu && kendiOyu.secenekIdler.includes(s.id);
    return `<label style="display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid var(--border);border-radius:10px;margin-bottom:6px;cursor:pointer;">
      <input type="${girdiTipi}" name="anketOy" value="${s.id}" ${seciliMi?'checked':''}>
      ${escapeHtml(s.metin)}
    </label>`;
  }).join('') + `</div>
    <button class="btn btn-amber" style="width:100%;margin-top:8px;" onclick="anketOyGonder('${id}')">Oyumu Güncelle</button>`;
  modalAc(a.soru, govde, null, null, null);
  const kb = document.getElementById('modalKaydetBtn');
  if(kb) kb.style.display = 'none';
}

async function anketOyGonder(id){
  const a = anketler.find(x=>x.id===id);
  if(!a) return;
  const secililer = Array.from(document.querySelectorAll('input[name="anketOy"]:checked')).map(i=>i.value);
  try{
    await AnketService.oyVer(a, secililer);
    toast('Oyunuz kaydedildi.');
    modalKapat();
  }catch(err){
    if(!['kimlik-yok','yetkisiz','kapali'].includes(err.message)) toast('Hata: ' + err.message);
  }
}

async function anketKapatToggle(id, suAnAktifMi){
  try{
    await AnketService.anketKapat(id, suAnAktifMi);
    toast(suAnAktifMi ? 'Anket kapatıldı.' : 'Anket yeniden açıldı.');
    modalKapat();
  }catch(err){
    if(err.message !== 'yetkisiz') toast('Hata: ' + err.message);
  }
}

function anketSilOnay(id){
  if(!confirm('Bu anketi silmek istediğinize emin misiniz? Tüm oylar kalıcı olarak silinecek.')) return;
  AnketService.anketSil(id)
    .then(()=>{ toast('Anket silindi.'); modalKapat(); })
    .catch(err=>{ if(err.message !== 'yetkisiz') toast('Hata: ' + err.message); });
}
