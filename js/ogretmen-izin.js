/* ====================================================================
   js/ogretmen-izin.js
   ÖĞRETMEN İZİN / RAPOR TAKİP MODÜLÜ — UI KATMANI
   Personel İşleri'ndeki (hizmetli/memur) puantaj-bağlantılı izin
   sisteminden TAMAMEN AYRI — öğretmenler puantaj/bordro koduna
   dahil değil, bu modül sadece takip amaçlıdır. Kayıtlar öğretmenin
   profiline (öğretmen detay paneli) bağlıdır.

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya)          → sadece DOM + OgretmenIzinService çağrısı, db bilmez
     js/core/services/ogretmen-izin.service.js    → iş kuralı + yetki kontrolü
     js/core/repositories/ogretmen-izin.repository.js → TEK Firestore erişim noktası
   ==================================================================== */

const OGRETMEN_IZIN_TURLERI = [
  'Yıllık İzin', 'Sağlık Raporu', 'Mazeret İzni', 'Doğum İzni',
  'Refakat İzni', 'Ücretsiz İzin', 'Görevlendirme', 'Diğer'
];

let ogretmenIzinleri = [];

/* ---------- Firestore bağlantısı ----------
   Artık doğrudan db.collection() çağrılmıyor — OgretmenIzinRepository üzerinden dinleniyor. */
function ogretmenIzinBaglantilariKur(){
  OgretmenIzinRepository.izinleriDinle(v=>{
    ogretmenIzinleri = v;
    if(typeof renderOgretmenler === 'function') renderOgretmenler();
    if(typeof renderBugunIzinliOgretmenler === 'function') renderBugunIzinliOgretmenler();
    if(document.getElementById('detayOverlay')?.classList.contains('active') && window._acikOgretmenDetayId){
      renderOgretmenIzinBolumu(window._acikOgretmenDetayId);
    }
  });
}

/* ---------- yardımcılar ---------- */
function _izinKayitlariniGetirOgretmen(ogretmenId){
  return ogretmenIzinleri
    .filter(k => k.ogretmenId === ogretmenId)
    .sort((a,b) => (b.baslangic||'').localeCompare(a.baslangic||''));
}

/* Bugün izinli/raporlu olan öğretmenin aktif kaydını döndürür (yoksa null) */
function _bugunIzinliMi(ogretmenId){
  const bugun = todayISO();
  return ogretmenIzinleri.find(k => k.ogretmenId === ogretmenId && k.baslangic <= bugun && bugun <= k.bitis) || null;
}

/* not: gün sayısı hesaplama artık OgretmenIzinService.gunSayisiHesapla() içinde */

/* ---------- öğretmen listesi / detay paneli rozeti ---------- */
function ogretmenIzinRozeti(ogretmenId){
  const aktif = _bugunIzinliMi(ogretmenId);
  if(!aktif) return '';
  const ikon = aktif.tur === 'Sağlık Raporu' ? '🏥' : '📋';
  return ` <span class="badge badge-brick">${ikon} ${escapeHtml(aktif.tur)}</span>`;
}

/* ---------- CRUD modal ---------- */
function ogretmenIzinModalAc(ogretmenId, izinId){
  const k = izinId ? ogretmenIzinleri.find(x => x.id === izinId) : null;
  const digerMi = k && !OGRETMEN_IZIN_TURLERI.includes(k.tur);

  const body = `
    <div class="form-group">
      <label>İzin / Durum Türü</label>
      <select id="f_oiTur" onchange="document.getElementById('f_oiDigerWrap').style.display = this.value==='Diğer' ? '' : 'none';">
        ${OGRETMEN_IZIN_TURLERI.map(t => `<option value="${t}" ${(k && (k.tur===t || (digerMi && t==='Diğer'))) ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" id="f_oiDigerWrap" style="${digerMi ? '' : 'display:none;'}">
      <label>Tür (serbest metin)</label>
      <input id="f_oiTurDiger" value="${digerMi ? escapeHtml(k.tur) : ''}" placeholder="Örn: İdari izin">
    </div>
    <div class="form-row">
      <div class="form-group"><label>Başlangıç Tarihi</label><input id="f_oiBaslangic" type="date" value="${k?escapeHtml(k.baslangic||''):''}"></div>
      <div class="form-group"><label>Bitiş Tarihi</label><input id="f_oiBitis" type="date" value="${k?escapeHtml(k.bitis||''):''}"></div>
    </div>
    <div class="form-group"><label>Belge No (rapor/dilekçe no — opsiyonel)</label><input id="f_oiBelgeNo" value="${k?escapeHtml(k.belgeNo||''):''}"></div>
    <div class="form-group"><label>Açıklama (opsiyonel)</label><input id="f_oiAciklama" value="${k?escapeHtml(k.aciklama||''):''}"></div>
    <div class="form-group" style="display:flex;align-items:center;gap:10px;">
      <label style="margin:0;">MEBBİS'e işlendi</label>
      <input type="checkbox" id="f_oiMebbis" style="width:auto;" ${k && k.mebbisIslendiMi ? 'checked' : ''}>
    </div>
  `;

  modalAc(k ? 'İzin Kaydını Düzenle' : 'Yeni İzin / Rapor Kaydı', body, async ()=>{
    const turSecim = document.getElementById('f_oiTur').value;
    const tur = turSecim === 'Diğer' ? document.getElementById('f_oiTurDiger').value.trim() : turSecim;
    const baslangic = document.getElementById('f_oiBaslangic').value;
    const bitis = document.getElementById('f_oiBitis').value;
    if(!tur){ toast('İzin türü zorunlu.'); return; }
    if(!OgretmenIzinService.tarihAraligiGecerliMi(baslangic, bitis)){ toast('Başlangıç ve bitiş tarihi zorunlu, bitiş başlangıçtan önce olamaz.'); return; }

    const ogretmen = ogretmenler.find(o => o.id === ogretmenId);
    const adSoyad = ogretmen ? `${ogretmen.ad} ${ogretmen.soyad}` : 'Öğretmen';

    const veri = {
      ogretmenId,
      tur,
      baslangic, bitis,
      gunSayisi: OgretmenIzinService.gunSayisiHesapla(baslangic, bitis),
      belgeNo: document.getElementById('f_oiBelgeNo').value.trim(),
      aciklama: document.getElementById('f_oiAciklama').value.trim(),
      mebbisIslendiMi: document.getElementById('f_oiMebbis').checked
    };

    modalKapat();
    OgretmenIzinService.izinKaydet(k?k.id:null, k?k.hatirlaticiId:null, adSoyad, veri)
      .then(()=>toast('Kaydedildi.'))
      .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
  }, k ? ()=>{
    if(!confirm('Bu izin kaydını silmek istediğinize emin misiniz?')) return;
    OgretmenIzinService.izinSil(k.id, k.hatirlaticiId).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  } : null);
}

/* not: ISO tarih biçimlendirme artık OgretmenIzinService._isoTarihYaz() içinde */

/* ---------- öğretmen detay panelindeki İzinler bölümü ---------- */
function renderOgretmenIzinBolumu(ogretmenId){
  const hedef = document.getElementById('oiListesi');
  if(!hedef) return;
  const liste = _izinKayitlariniGetirOgretmen(ogretmenId);
  hedef.innerHTML = liste.length ? liste.map(k => `
    <div class="evrak-row">
      <div class="evrak-body">
        <div class="evrak-title">
          ${escapeHtml(k.tur)}
          ${!k.mebbisIslendiMi ? '<span class="badge badge-brick">⚠️ MEBBİS\'e işlenmedi</span>' : '<span class="badge badge-sage">✅ MEBBİS</span>'}
        </div>
        <div class="evrak-meta">${formatTarih(k.baslangic)} — ${formatTarih(k.bitis)} · ${k.gunSayisi} gün${k.belgeNo ? ' · Belge: '+escapeHtml(k.belgeNo) : ''}${k.aciklama ? ' · '+escapeHtml(k.aciklama) : ''}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); ogretmenIzinModalAc('${ogretmenId}','${k.id}')">Düzenle</button>
    </div>
  `).join('') : '<div class="empty-state">İzin/rapor kaydı yok.</div>';
}

/* ---------- Dashboard: Bugün İzinli Öğretmenler ---------- */
function renderBugunIzinliOgretmenler(){
  const kart = document.getElementById('bugunIzinliKart');
  const hedef = document.getElementById('bugunIzinliListesi');
  if(!kart || !hedef) return;

  const bugun = todayISO();
  const bugunGunAdi = GUNADI[new Date().getDay()];
  const aktifKayitlar = ogretmenIzinleri.filter(k => k.baslangic <= bugun && bugun <= k.bitis);

  if(aktifKayitlar.length === 0){ kart.style.display = 'none'; return; }
  kart.style.display = '';

  hedef.innerHTML = aktifKayitlar.map(k => {
    const ogretmen = ogretmenler.find(o => o.id === k.ogretmenId);
    const adSoyad = ogretmen ? `${ogretmen.ad} ${ogretmen.soyad}` : 'Bilinmeyen';
    const bugunkuDersleri = (typeof dersProgrami !== 'undefined' ? dersProgrami : [])
      .filter(d => d.ogretmenId === k.ogretmenId && d.gun === bugunGunAdi)
      .sort((a,b) => a.saat - b.saat);
    const dersMetni = bugunkuDersleri.length
      ? bugunkuDersleri.map(d => `${d.saat}. ders: ${escapeHtml(d.sinif)}`).join(' · ')
      : 'Bugün ders programında kaydı yok';
    const ikon = k.tur === 'Sağlık Raporu' ? '🏥' : '📋';
    return `
      <div class="evrak-row" style="cursor:pointer;" onclick="sekmeAc('ogretmenler'); setTimeout(()=>ogretmenDetayAc('${k.ogretmenId}'), 200);">
        <div class="evrak-body">
          <div class="evrak-title">${ikon} ${escapeHtml(adSoyad)} <span class="badge badge-brick">${escapeHtml(k.tur)}</span></div>
          <div class="evrak-meta">${dersMetni}</div>
        </div>
      </div>`;
  }).join('');
}
