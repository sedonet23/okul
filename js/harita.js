/* ====================================================================
   js/harita.js
   HARİTA MODÜLÜ — Leaflet.js + OpenStreetMap
   - Haritaya tıklayarak güzergah noktası ekle
   - Nominatim ile yer adı arama
   - Toplam mesafe hesapla
   - Servise bağla ve kaydet
   ==================================================================== */

let haritaOrnek       = null;   // Leaflet map instance
let haritaMarkerlar   = [];     // L.Marker[]
let haritaPolyline    = null;   // L.Polyline
let haritaKoordinatlar= [];     // [{lat, lng, ad}]
let haritaBaslatildi  = false;

/* ================================================================
   Başlatma
   ================================================================ */
function haritaBaslat() {
  if (haritaBaslatildi) {
    haritaOrnek && haritaOrnek.invalidateSize();
    return;
  }

  // Türkiye merkezi
  haritaOrnek = L.map('haritaKonteyner', { zoomControl: true }).setView([39.0, 35.0], 6);

  // Katmanlar
  const katmanSokak = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  });

  const katmanUydu = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri — Esri, DigitalGlobe, GeoEye, Earthstar Geographics',
    maxZoom: 19,
  });

  const katmanUyduEtiket = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    attribution: '',
    maxZoom: 19,
    opacity: 0.8,
  });

  katmanSokak.addTo(haritaOrnek);
  haritaOrnek._aktifKatman = 'sokak';

  // Katman değiştirme butonu
  const katmanBtn = L.Control.extend({
    options: { position: 'topright' },
    onAdd: () => {
      const div = L.DomUtil.create('div');
      div.innerHTML = `
        <button id="haritaKatmanBtn" onclick="haritaKatmanDegistir()"
          style="background:#fff;border:2px solid rgba(0,0,0,0.2);border-radius:6px;
          padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;
          box-shadow:0 2px 6px rgba(0,0,0,0.15);">🛰 Uydu</button>`;
      L.DomEvent.disableClickPropagation(div);
      return div;
    }
  });

  // Konuma git butonu
  const konumBtn = L.Control.extend({
    options: { position: 'topright' },
    onAdd: () => {
      const div = L.DomUtil.create('div');
      div.innerHTML = `
        <button onclick="haritaKonumaGit()"
          style="background:#fff;border:2px solid rgba(0,0,0,0.2);border-radius:6px;
          padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer;
          box-shadow:0 2px 6px rgba(0,0,0,0.15);">📍 Konumum</button>`;
      L.DomEvent.disableClickPropagation(div);
      return div;
    }
  });

  haritaOrnek.addControl(new katmanBtn());
  haritaOrnek.addControl(new konumBtn());

  haritaOrnek._katmanSokak      = katmanSokak;
  haritaOrnek._katmanUydu       = katmanUydu;
  haritaOrnek._katmanUyduEtiket = katmanUyduEtiket;

  haritaOrnek.on('click', e => haritaNoktaEkle(e.latlng.lat, e.latlng.lng));

  // Sağ tık → favori ekle
  haritaOrnek.on('contextmenu', e => {
    L.popup()
      .setLatLng(e.latlng)
      .setContent(`<div style="text-align:center;padding:2px 0;">
        <button onclick="haritaFavoriEkleModal(${e.latlng.lat}, ${e.latlng.lng}, ''); haritaOrnek.closePopup();"
          style="padding:5px 14px;background:#f59e0b;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
          ⭐ Favoriye Ekle
        </button></div>`)
      .openOn(haritaOrnek);
  });

  // Favori bağlantısını başlat
  if (typeof haritaFavorilerBaglantisiKur === 'function') haritaFavorilerBaglantisiKur();
  haritaBaslatildi = true;
}

/* ================================================================
   Katman değiştirme
   ================================================================ */
function haritaKatmanDegistir() {
  const m   = haritaOrnek;
  const btn = document.getElementById('haritaKatmanBtn');
  if (m._aktifKatman === 'sokak') {
    m.removeLayer(m._katmanSokak);
    m.addLayer(m._katmanUydu);
    m.addLayer(m._katmanUyduEtiket);
    m._aktifKatman = 'uydu';
    if (btn) btn.innerHTML = '🗺 Sokak';
  } else {
    m.removeLayer(m._katmanUydu);
    m.removeLayer(m._katmanUyduEtiket);
    m.addLayer(m._katmanSokak);
    m._aktifKatman = 'sokak';
    if (btn) btn.innerHTML = '🛰 Uydu';
  }
}

/* ================================================================
   Mevcut konuma git
   ================================================================ */
function haritaKonumaGit() {
  if (!navigator.geolocation) { toast('Tarayıcınız konum özelliğini desteklemiyor.'); return; }
  toast('Konum alınıyor...');
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      haritaOrnek.setView([lat, lng], 16);
      // Mavi konum halkası
      if (haritaOrnek._konumDairesi) haritaOrnek.removeLayer(haritaOrnek._konumDairesi);
      haritaOrnek._konumDairesi = L.circle([lat, lng], {
        radius: pos.coords.accuracy / 2,
        color: '#2196F3', fillColor: '#2196F3', fillOpacity: 0.15, weight: 2,
      }).addTo(haritaOrnek);
      // Nokta eklemek ister misin popup
      L.popup()
        .setLatLng([lat, lng])
        .setContent(`<div style="text-align:center;padding:4px 0;">
          <strong>Mevcut Konumunuz</strong><br>
          <button onclick="haritaNoktaEkle(${lat}, ${lng}, 'Mevcut Konum'); haritaOrnek.closePopup();"
            style="margin-top:6px;padding:4px 12px;background:#2196F3;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;">
            + Güzergaha Ekle
          </button></div>`)
        .openOn(haritaOrnek);
    },
    err => {
      const mesajlar = {
        1: 'Konum izni reddedildi.',
        2: 'Konum alınamadı.',
        3: 'Konum isteği zaman aşımına uğradı.',
      };
      toast(mesajlar[err.code] || 'Konum hatası.');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

/* ================================================================
   Nokta ekleme
   ================================================================ */
function haritaNoktaEkle(lat, lng, ad) {
  const sira  = haritaKoordinatlar.length + 1;
  const etiket= ad || `Nokta ${sira}`;

  const marker = L.marker([lat, lng], {
    draggable: true,
    icon: haritaOzelIkon(sira),
  }).addTo(haritaOrnek);

  const markerIdx = haritaKoordinatlar.length; // bu marker'ın eklenecek index'i
  marker.bindPopup(() => {
    const idx = haritaMarkerlar.indexOf(marker);
    const div = document.createElement('div');
    div.style.minWidth = '140px';
    div.innerHTML = `<strong>${etiket}</strong><br><small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small>`;
    const btn = document.createElement('button');
    btn.textContent = '🗑 Sil';
    btn.style.cssText = 'margin-top:6px;padding:3px 10px;background:#e53e3e;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;display:block;';
    btn.onclick = () => { haritaMarkerSil(marker); haritaOrnek.closePopup(); };
    div.appendChild(btn);
    return div;
  }).openPopup();

  marker.on('dragend', e => {
    const idx = haritaMarkerlar.indexOf(marker);
    if (idx === -1) return;
    const pos = e.target.getLatLng();
    haritaKoordinatlar[idx].lat = pos.lat;
    haritaKoordinatlar[idx].lng = pos.lng;
    haritaCizgiGuncelle(); // async — OSRM'e istek atar
  });

  haritaKoordinatlar.push({ lat, lng, ad: etiket });
  haritaMarkerlar.push(marker);
  haritaCizgiGuncelle();
  haritaBilgiGuncelle();
}

function haritaOzelIkon(numara) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#2196F3;color:#fff;font-weight:700;font-size:12px;
      width:26px;height:26px;border-radius:50%;display:flex;
      align-items:center;justify-content:center;
      border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);">
      ${numara}
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/* ================================================================
   Nokta silme
   ================================================================ */
function haritaNoktaSil(idx) {
  // idx artık marker nesnesinin o anki indexini bulmak için kullanılıyor
  // ama popup açıldığı andaki index kaymış olabilir, marker referansından bul
  if (idx < 0 || idx >= haritaMarkerlar.length) return;
  haritaOrnek.removeLayer(haritaMarkerlar[idx]);
  haritaMarkerlar.splice(idx, 1);
  haritaKoordinatlar.splice(idx, 1);

  // Numaraları güncelle
  haritaMarkerlar.forEach((m, i) => {
    m.setIcon(
      haritaKoordinatlar[i]?.ad === 'Ara Nokta' ? haritaAraNokIkon(i+1) : haritaOzelIkon(i+1)
    );
  });

  haritaCizgiGuncelle();
  haritaBilgiGuncelle();
}

// Marker nesnesinden index bularak sil — popup'larda kullan
function haritaMarkerSil(marker) {
  const idx = haritaMarkerlar.indexOf(marker);
  if (idx === -1) return;
  haritaNoktaSil(idx);
}

function haritaTemizle() {
  haritaMarkerlar.forEach(m => haritaOrnek.removeLayer(m));
  haritaMarkerlar    = [];
  haritaKoordinatlar = [];
  if (haritaPolyline) { haritaOrnek.removeLayer(haritaPolyline); haritaPolyline = null; }
  haritaBilgiGuncelle();
  document.getElementById('haritaServisSec').value = '';
}

/* ================================================================
   Yol rotası ve mesafe (OSRM)
   ================================================================ */
let _osrmToplamMesafe = 0; // metre

async function haritaCizgiGuncelle() {
  if (haritaPolyline) { haritaOrnek.removeLayer(haritaPolyline); haritaPolyline = null; }
  if (haritaKoordinatlar.length < 2) { _osrmToplamMesafe = 0; haritaBilgiGuncelle(); return; }

  haritaBilgiYukleniyor();

  try {
    // OSRM public API — koordinatlar lon,lat sırasıyla
    const coords = haritaKoordinatlar.map(k => `${k.lng},${k.lat}`).join(';');
    const url    = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res    = await fetch(url);
    const data   = await res.json();

    if (data.code !== 'Ok' || !data.routes?.length) {
      toast('Yol rotası alınamadı, kuş uçuşu mesafe gösteriliyor.');
      _osrmToplamMesafe = haritaKusBakisiMesafe();
      haritaPolyline = L.polyline(
        haritaKoordinatlar.map(k => [k.lat, k.lng]),
        { color: '#f59e0b', weight: 4, opacity: 0.8, dashArray: '8,4' }
      ).addTo(haritaOrnek);
    } else {
      _osrmToplamMesafe = data.routes[0].distance;
      // GeoJSON koordinatlarını [lat,lng] dizisine çevir
      const rotaNoktalar = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      haritaPolyline = L.polyline(rotaNoktalar, {
        color: '#2196F3', weight: 5, opacity: 0.85
      }).addTo(haritaOrnek);

      // Çizgiye tıklayınca ara nokta ekle
      haritaPolyline.on('click', e => {
        L.DomEvent.stopPropagation(e);
        haritaAraNokataEkle(e.latlng.lat, e.latlng.lng);
      });
    }
  } catch (e) {
    console.warn('OSRM hatası:', e);
    _osrmToplamMesafe = haritaKusBakisiMesafe();
    haritaPolyline = L.polyline(
      haritaKoordinatlar.map(k => [k.lat, k.lng]),
      { color: '#f59e0b', weight: 4, opacity: 0.8, dashArray: '8,4' }
    ).addTo(haritaOrnek);
  }

  haritaBilgiGuncelle();
}

function haritaKusBakisiMesafe() {
  let toplam = 0;
  for (let i = 1; i < haritaKoordinatlar.length; i++) {
    toplam += L.latLng(haritaKoordinatlar[i-1].lat, haritaKoordinatlar[i-1].lng)
               .distanceTo(L.latLng(haritaKoordinatlar[i].lat, haritaKoordinatlar[i].lng));
  }
  return toplam;
}

function haritaBilgiYukleniyor() {
  const mesafeEl = document.getElementById('haritaMesafe');
  if (mesafeEl) mesafeEl.textContent = '⏳ Hesaplanıyor...';
}

function haritaBilgiGuncelle() {
  const mesafeEl  = document.getElementById('haritaMesafe');
  const noktaEl   = document.getElementById('haritaNoktaSayisi');
  const kaydetBtn = document.getElementById('haritaKaydetBtn');
  if (!mesafeEl) return;

  const km = (_osrmToplamMesafe / 1000).toFixed(2);
  noktaEl.textContent  = `${haritaKoordinatlar.length} nokta`;
  mesafeEl.textContent = haritaKoordinatlar.length >= 2 ? `${km} km (yol)` : '—';
  if (kaydetBtn) kaydetBtn.disabled = haritaKoordinatlar.length < 2;
}

/* ================================================================
   Yer adı arama (Nominatim)
   ================================================================ */
let _aramaTimeout = null;

function haritaAramaYap() {
  const q = document.getElementById('haritaAramaInput')?.value.trim();
  if (!q || q.length < 3) return;
  clearTimeout(_aramaTimeout);
  _aramaTimeout = setTimeout(() => _nominatimAra(q), 500);
}

async function _nominatimAra(q) {
  const sonucDiv = document.getElementById('haritaAramaSonuc');
  sonucDiv.innerHTML = '<div style="padding:8px;color:var(--ink-muted);font-size:13px;">Aranıyor...</div>';
  sonucDiv.style.display = 'block';

  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=tr&limit=5&accept-language=tr`,
      { headers: { 'Accept-Language': 'tr' } }
    );
    const data = await res.json();

    if (!data.length) {
      sonucDiv.innerHTML = '<div style="padding:8px;color:var(--ink-muted);font-size:13px;">Sonuç bulunamadı.</div>';
      return;
    }

    sonucDiv.innerHTML = data.map((r, i) => `
      <div style="padding:8px 10px;border-bottom:1px solid var(--border);font-size:13px;display:flex;align-items:center;gap:6px;">
        <div style="flex:1;cursor:pointer;" onclick="haritaAramaSec(${r.lat}, ${r.lon}, '${escapeHtml(r.display_name.split(',')[0])}')"
          onmouseover="this.style.color='#2196F3'" onmouseout="this.style.color=''">
          <strong>${escapeHtml(r.display_name.split(',')[0])}</strong>
          <div style="font-size:11px;color:var(--ink-muted);">${escapeHtml(r.display_name.split(',').slice(1,3).join(','))}</div>
        </div>
        <button onclick="haritaFavoriEkleModal(${r.lat}, ${r.lon}, '${escapeHtml(r.display_name.split(',')[0])}'); document.getElementById('haritaAramaSonuc').style.display='none';"
          style="flex-shrink:0;background:none;border:none;font-size:16px;cursor:pointer;padding:2px 4px;" title="Favoriye ekle">⭐</button>
      </div>`).join('');
  } catch (e) {
    sonucDiv.innerHTML = '<div style="padding:8px;color:#e53e3e;font-size:13px;">Bağlantı hatası.</div>';
  }
}

function haritaAramaSec(lat, lng, ad) {
  document.getElementById('haritaAramaSonuc').style.display = 'none';
  document.getElementById('haritaAramaInput').value = '';
  haritaOrnek.setView([lat, lng], 15);
  haritaNoktaEkle(parseFloat(lat), parseFloat(lng), ad);
}

/* ================================================================
   Servise kaydet
   ================================================================ */
async function haritaKaydet() {
  const servisId = document.getElementById('haritaServisSec')?.value;
  if (!servisId) { toast('Lütfen bir servis seçin.'); return; }
  if (haritaKoordinatlar.length < 2) { toast('En az 2 nokta gerekli.'); return; }

  const mesafeKm = parseFloat((_osrmToplamMesafe / 1000).toFixed(2));

  try {
    await HaritaService.guzergahKaydet(
      servisId,
      mesafeKm,
      haritaKoordinatlar.map(k => ({ lat: k.lat, lng: k.lng, ad: k.ad }))
    );
    toast(`Güzergah kaydedildi: ${mesafeKm} km`);
    haritaServisSecildiRender(servisId);
  } catch (e) {
    toast('Kayıt hatası: ' + (e.message==='yetkisiz' ? 'Bu işlem için yetkiniz yok.' : e.message));
  }
}

/* ================================================================
   Servis seçilince mevcut güzergahı yükle
   ================================================================ */
function haritaServisSecildiRender(servisId) {
  const bilgiEl = document.getElementById('haritaServisBilgi');
  if (!bilgiEl) return;
  const s = servisler.find(x => x.id === servisId);
  if (!s) { bilgiEl.innerHTML = ''; return; }

  bilgiEl.innerHTML = s.guzergahMesafe
    ? `<span style="font-size:13px;color:var(--ink-muted);">
        Kayıtlı mesafe: <strong>${s.guzergahMesafe} km</strong>
        ${s.guzergahKoordinatlar?.length ? `· ${s.guzergahKoordinatlar.length} nokta` : ''}
        <button class="btn btn-ghost btn-sm" style="margin-left:8px;" onclick="haritaGuzergahiYukle('${servisId}')">Haritada Göster</button>
       </span>`
    : `<span style="font-size:13px;color:var(--ink-muted);">Henüz güzergah kaydedilmemiş.</span>`;
}

function haritaGuzergahiYukle(servisId) {
  const s = servisler.find(x => x.id === servisId);
  if (!s?.guzergahKoordinatlar?.length) return;

  haritaTemizle();
  document.getElementById('haritaServisSec').value = servisId;

  s.guzergahKoordinatlar.forEach(k => haritaNoktaEkle(k.lat, k.lng, k.ad));

  // Tüm noktaları göster
  const bounds = L.latLngBounds(s.guzergahKoordinatlar.map(k => [k.lat, k.lng]));
  haritaOrnek.fitBounds(bounds, { padding: [40, 40] });
}

/* ================================================================
   Render — servis seçim listesi
   ================================================================ */
function renderHaritaServisler() {
  const sel = document.getElementById('haritaServisSec');
  if (!sel) return;
  const secili = sel.value;
  sel.innerHTML = '<option value="">— Servis seçin —</option>' +
    [...servisler]
      .sort((a, b) => (a.servisAdi||'').localeCompare(b.servisAdi||'', 'tr'))
      .map(s => `<option value="${s.id}" ${secili===s.id?'selected':''}>${escapeHtml(s.servisAdi||'Servis')}${s.guzergahMesafe?' ('+s.guzergahMesafe+' km)':''}</option>`)
      .join('');
  if (secili) haritaServisSecildiRender(secili);
}

/* ================================================================
   FAVORİLER
   ================================================================ */
let haritaFavoriler     = [];
let haritaFavoriMarkerlar = {};  // id → L.Marker

/* ---------- Firestore bağlantısı ---------- */
function haritaFavorilerBaglantisiKur() {
  HaritaRepository.favorileriDinle(v => {
    haritaFavoriler = v;
    renderHaritaFavoriler();
    haritaFavoriMarkerlariGuncelle();
  });
}

/* ---------- Favori marker ikonları ---------- */
function haritaFavoriIkon() {
  return L.divIcon({
    className: '',
    html: `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">⭐</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function haritaFavoriMarkerlariGuncelle() {
  if (!haritaOrnek) return;

  // Eskimiş markerları temizle
  Object.keys(haritaFavoriMarkerlar).forEach(id => {
    if (!haritaFavoriler.find(f => f.id === id)) {
      haritaOrnek.removeLayer(haritaFavoriMarkerlar[id]);
      delete haritaFavoriMarkerlar[id];
    }
  });

  // Yeni / mevcut markerları güncelle
  haritaFavoriler.forEach(f => {
    if (haritaFavoriMarkerlar[f.id]) return; // zaten var
    const m = L.marker([f.lat, f.lng], { icon: haritaFavoriIkon(), zIndexOffset: -100 })
      .addTo(haritaOrnek);
    m.bindPopup(`
      <div style="min-width:160px;">
        <strong>⭐ ${escapeHtml(f.ad)}</strong>
        ${f.aciklama ? `<div style="font-size:12px;color:#666;margin-top:2px;">${escapeHtml(f.aciklama)}</div>` : ''}
        <div style="display:flex;gap:6px;margin-top:8px;">
          <button onclick="haritaFavoriGuzergahaEkle('${f.id}')"
            style="flex:1;padding:4px 0;background:#2196F3;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;">
            + Güzergaha Ekle
          </button>
          <button onclick="haritaFavoriSil('${f.id}')"
            style="padding:4px 8px;background:#e53e3e;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;">
            🗑
          </button>
        </div>
      </div>`);
    haritaFavoriMarkerlar[f.id] = m;
  });
}

/* ---------- Favori ekle (haritaya tıklayarak veya aramadan) ---------- */
function haritaFavoriEkleModal(lat, lng, adOneri) {
  const body = `
    <div class="form-group">
      <label>Konum Adı</label>
      <input id="fav_ad" value="${escapeHtml(adOneri || '')}" placeholder="örn: Okul, Durak 1..." style="width:100%;" autofocus>
    </div>
    <div class="form-group">
      <label>Açıklama (isteğe bağlı)</label>
      <input id="fav_aciklama" placeholder="Kısa not..." style="width:100%;">
    </div>
    <div style="font-size:12px;color:var(--ink-muted);margin-top:4px;">
      📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}
    </div>`;

  modalAc('⭐ Favoriye Ekle', body, async () => {
    const ad = document.getElementById('fav_ad').value.trim();
    if (!ad) { toast('Konum adı zorunludur.'); return; }
    try {
      await HaritaService.favoriEkle({
        ad,
        aciklama: document.getElementById('fav_aciklama').value.trim(),
        lat, lng,
      });
      toast(`"${ad}" favorilere eklendi.`);
      modalKapat();
    } catch (e) {
      toast(e.message==='yetkisiz' ? 'Bu işlem için yetkiniz yok.' : 'Hata: ' + e.message);
    }
  }, null);
}

/* ---------- Favori sil ---------- */
async function haritaFavoriSil(id) {
  const f = haritaFavoriler.find(x => x.id === id);
  if (!confirm(`"${f?.ad || 'Bu konum'}" favorilerden silinsin mi?`)) return;
  try {
    await HaritaService.favoriSil(id);
    if (haritaFavoriMarkerlar[id]) {
      haritaOrnek.removeLayer(haritaFavoriMarkerlar[id]);
      delete haritaFavoriMarkerlar[id];
    }
    toast('Favori silindi.');
  } catch (e) {
    toast(e.message==='yetkisiz' ? 'Bu işlem için yetkiniz yok.' : 'Hata: ' + e.message);
  }
}

/* ---------- Favoriden güzergaha ekle ---------- */
function haritaFavoriGuzergahaEkle(id) {
  const f = haritaFavoriler.find(x => x.id === id);
  if (!f) return;
  haritaOrnek.closePopup();
  haritaNoktaEkle(f.lat, f.lng, f.ad);
  haritaOrnek.setView([f.lat, f.lng], 15);
}

/* ---------- Favori listesi render ---------- */
function renderHaritaFavoriler() {
  const liste = document.getElementById('haritaFavoriListe');
  if (!liste) return;

  if (!haritaFavoriler.length) {
    liste.innerHTML = '<div style="padding:12px;color:var(--ink-muted);font-size:13px;text-align:center;">Henüz favori yok.<br>Haritaya sağ tıklayın<br>veya arama sonucundan ekleyin.</div>';
    return;
  }

  liste.innerHTML = haritaFavoriler.map(f => `
    <div style="padding:8px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;">
      <div style="flex:1;min-width:0;cursor:pointer;" onclick="haritaFavoriOdakla('${f.id}')">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">⭐ ${escapeHtml(f.ad)}</div>
        ${f.aciklama ? `<div style="font-size:11px;color:var(--ink-muted);">${escapeHtml(f.aciklama)}</div>` : ''}
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm" onclick="haritaFavoriGuzergahaEkle('${f.id}')" title="Güzergaha ekle">+</button>
        <button class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="haritaFavoriSil('${f.id}')" title="Sil">🗑</button>
      </div>
    </div>`).join('');
}

function haritaFavoriOdakla(id) {
  const f = haritaFavoriler.find(x => x.id === id);
  if (!f || !haritaOrnek) return;
  haritaOrnek.setView([f.lat, f.lng], 16);
  haritaFavoriMarkerlar[id]?.openPopup();
}

/* ================================================================
   TAM EKRAN
   ================================================================ */
let _haritaTamEkranAktif = false;

function haritaTamEkran() {
  const konteyner = document.getElementById('haritaKonteyner');
  const btn       = document.getElementById('haritaTamEkranBtn');
  if (!konteyner) return;

  if (!_haritaTamEkranAktif) {
    // Tam ekrana gir
    konteyner.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9998;border-radius:0;border:none;';
    btn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:9999;background:#fff;border:2px solid rgba(0,0,0,0.2);border-radius:6px;padding:5px 9px;font-size:16px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);line-height:1;';
    btn.textContent = '✕';
    btn.title = 'Tam Ekrandan Çık';
    document.body.style.overflow = 'hidden';
    _haritaTamEkranAktif = true;
  } else {
    // Tam ekrandan çık
    konteyner.style.cssText = 'width:100%;height:60vh;min-height:340px;border-radius:12px;overflow:hidden;border:1px solid var(--border);';
    btn.style.cssText = 'position:absolute;bottom:10px;right:10px;z-index:1000;background:#fff;border:2px solid rgba(0,0,0,0.2);border-radius:6px;padding:5px 9px;font-size:16px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);line-height:1;';
    btn.textContent = '⛶';
    btn.title = 'Tam Ekran';
    document.body.style.overflow = '';
    _haritaTamEkranAktif = false;
  }
  setTimeout(() => haritaOrnek && haritaOrnek.invalidateSize(), 50);
}

// ESC ile tam ekrandan çık
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _haritaTamEkranAktif) haritaTamEkran();
});

/* ================================================================
   ARA NOKTA — Çizgiye tıklayarak güzergahı farklı yola çek
   ================================================================ */
function haritaAraNokataEkle(lat, lng) {
  // En yakın iki nokta arasına sıraya ekle
  if (haritaKoordinatlar.length < 2) return;

  let enYakinIdx = 0;
  let enYakinMesafe = Infinity;
  const tiklanenL = L.latLng(lat, lng);

  for (let i = 0; i < haritaKoordinatlar.length - 1; i++) {
    const a = L.latLng(haritaKoordinatlar[i].lat, haritaKoordinatlar[i].lng);
    const b = L.latLng(haritaKoordinatlar[i+1].lat, haritaKoordinatlar[i+1].lng);
    // Segment orta noktasına mesafe
    const orta = L.latLng((a.lat+b.lat)/2, (a.lng+b.lng)/2);
    const d = tiklanenL.distanceTo(orta);
    if (d < enYakinMesafe) { enYakinMesafe = d; enYakinIdx = i; }
  }

  // Ara nokta olduğunu belirt (farklı renk)
  const sira = enYakinIdx + 2; // araya girdiği pozisyon
  const marker = L.marker([lat, lng], {
    draggable: true,
    icon: haritaAraNokIkon(),
  }).addTo(haritaOrnek);

  marker.bindPopup(() => {
    const div = document.createElement('div');
    div.style.minWidth = '130px';
    div.innerHTML = `<strong>Ara Nokta</strong><br><small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small>`;
    const btn = document.createElement('button');
    btn.textContent = '🗑 Sil';
    btn.style.cssText = 'margin-top:6px;padding:3px 10px;background:#e53e3e;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;display:block;';
    btn.onclick = () => { haritaMarkerSil(marker); haritaOrnek.closePopup(); };
    div.appendChild(btn);
    return div;
  }).openPopup();

  marker.on('dragend', e => {
    const idx = haritaMarkerlar.indexOf(marker);
    if (idx === -1) return;
    const pos = e.target.getLatLng();
    haritaKoordinatlar[idx].lat = pos.lat;
    haritaKoordinatlar[idx].lng = pos.lng;
    haritaCizgiGuncelle();
  });

  // Listeye ve marker dizisine sıraya ekle
  haritaKoordinatlar.splice(enYakinIdx + 1, 0, { lat, lng, ad: 'Ara Nokta' });
  haritaMarkerlar.splice(enYakinIdx + 1, 0, marker);

  // Tüm marker numaralarını güncelle
  haritaMarkerlar.forEach((m, i) => m.setIcon(
    haritaKoordinatlar[i].ad === 'Ara Nokta' ? haritaAraNokIkon(i+1) : haritaOzelIkon(i+1)
  ));

  haritaCizgiGuncelle();
  haritaBilgiGuncelle();
}

function haritaAraNokIkon(numara) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#ff9800;color:#fff;font-weight:700;font-size:11px;
      width:22px;height:22px;border-radius:50%;display:flex;
      align-items:center;justify-content:center;
      border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,0.3);">
      ${numara || '·'}
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}
