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

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(haritaOrnek);

  haritaOrnek.on('click', e => haritaNoktaEkle(e.latlng.lat, e.latlng.lng));
  haritaBaslatildi = true;
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

  marker.bindPopup(`
    <div style="min-width:140px;">
      <strong>${etiket}</strong><br>
      <small>${lat.toFixed(5)}, ${lng.toFixed(5)}</small><br>
      <button onclick="haritaNoktaSil(${haritaKoordinatlar.length})"
        style="margin-top:6px;padding:3px 10px;background:#e53e3e;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;">
        🗑 Sil
      </button>
    </div>`
  ).openPopup();

  marker.on('dragend', e => {
    const idx = haritaMarkerlar.indexOf(marker);
    if (idx === -1) return;
    const pos = e.target.getLatLng();
    haritaKoordinatlar[idx].lat = pos.lat;
    haritaKoordinatlar[idx].lng = pos.lng;
    haritaCizgiGuncelle();
    haritaBilgiGuncelle();
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
  if (idx < 0 || idx >= haritaMarkerlar.length) return;
  haritaOrnek.removeLayer(haritaMarkerlar[idx]);
  haritaMarkerlar.splice(idx, 1);
  haritaKoordinatlar.splice(idx, 1);

  // Numaraları güncelle
  haritaMarkerlar.forEach((m, i) => {
    m.setIcon(haritaOzelIkon(i + 1));
  });

  haritaCizgiGuncelle();
  haritaBilgiGuncelle();
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
   Çizgi ve mesafe
   ================================================================ */
function haritaCizgiGuncelle() {
  if (haritaPolyline) haritaOrnek.removeLayer(haritaPolyline);
  if (haritaKoordinatlar.length < 2) { haritaPolyline = null; return; }

  haritaPolyline = L.polyline(
    haritaKoordinatlar.map(k => [k.lat, k.lng]),
    { color: '#2196F3', weight: 4, opacity: 0.8, dashArray: '8,4' }
  ).addTo(haritaOrnek);
}

function haritaMesafeHesapla() {
  if (haritaKoordinatlar.length < 2) return 0;
  let toplam = 0;
  for (let i = 1; i < haritaKoordinatlar.length; i++) {
    const a = L.latLng(haritaKoordinatlar[i-1].lat, haritaKoordinatlar[i-1].lng);
    const b = L.latLng(haritaKoordinatlar[i].lat,   haritaKoordinatlar[i].lng);
    toplam += a.distanceTo(b);
  }
  return toplam;
}

function haritaBilgiGuncelle() {
  const mesafeEl  = document.getElementById('haritaMesafe');
  const noktaEl   = document.getElementById('haritaNoktaSayisi');
  const kaydetBtn = document.getElementById('haritaKaydetBtn');
  if (!mesafeEl) return;

  const m = haritaMesafeHesapla();
  const km = (m / 1000).toFixed(2);

  noktaEl.textContent  = `${haritaKoordinatlar.length} nokta`;
  mesafeEl.textContent = haritaKoordinatlar.length >= 2 ? `${km} km` : '—';
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
      <div onclick="haritaAramaSec(${r.lat}, ${r.lon}, '${escapeHtml(r.display_name.split(',')[0])}')"
        style="padding:8px 10px;cursor:pointer;border-bottom:1px solid var(--border);font-size:13px;"
        onmouseover="this.style.background='rgba(33,150,243,0.08)'" onmouseout="this.style.background=''">
        <strong>${escapeHtml(r.display_name.split(',')[0])}</strong>
        <div style="font-size:11px;color:var(--ink-muted);">${escapeHtml(r.display_name.split(',').slice(1,3).join(','))}</div>
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

  const mesafeM  = haritaMesafeHesapla();
  const mesafeKm = parseFloat((mesafeM / 1000).toFixed(2));

  try {
    await db.collection(COL.servisler).doc(servisId).update({
      guzergahMesafe: mesafeKm,
      guzergahKoordinatlar: haritaKoordinatlar.map(k => ({ lat: k.lat, lng: k.lng, ad: k.ad })),
    });
    toast(`Güzergah kaydedildi: ${mesafeKm} km`);
    haritaServisSecildiRender(servisId);
  } catch (e) {
    toast('Kayıt hatası: ' + e.message);
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
