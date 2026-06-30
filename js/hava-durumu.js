// hava-durumu.js
// Open-Meteo API kullanır (key gerektirmez). Konum her sayfa açılışında
// cihazdan istenir; izin verilmezse widget'lar sessizce gizli kalır.

(function(){
  'use strict';

  // WMO hava kodu -> { emoji, açıklama }
  var WMO_KODLARI = {
    0:  { e:'☀️', t:'Açık' },
    1:  { e:'🌤️', t:'Az Bulutlu' },
    2:  { e:'⛅', t:'Parçalı Bulutlu' },
    3:  { e:'☁️', t:'Bulutlu' },
    45: { e:'🌫️', t:'Sisli' },
    48: { e:'🌫️', t:'Kırağı Sisi' },
    51: { e:'🌦️', t:'Hafif Çisenti' },
    53: { e:'🌦️', t:'Çisenti' },
    55: { e:'🌧️', t:'Yoğun Çisenti' },
    56: { e:'🌧️', t:'Donucu Çisenti' },
    57: { e:'🌧️', t:'Yoğun Donucu Çisenti' },
    61: { e:'🌦️', t:'Hafif Yağmur' },
    63: { e:'🌧️', t:'Yağmur' },
    65: { e:'🌧️', t:'Şiddetli Yağmur' },
    66: { e:'🌧️', t:'Donucu Yağmur' },
    67: { e:'🌧️', t:'Şiddetli Donucu Yağmur' },
    71: { e:'🌨️', t:'Hafif Kar' },
    73: { e:'🌨️', t:'Kar' },
    75: { e:'❄️', t:'Yoğun Kar' },
    77: { e:'❄️', t:'Kar Taneleri' },
    80: { e:'🌦️', t:'Hafif Sağanak' },
    81: { e:'🌧️', t:'Sağanak' },
    82: { e:'⛈️', t:'Şiddetli Sağanak' },
    85: { e:'🌨️', t:'Hafif Kar Sağanağı' },
    86: { e:'❄️', t:'Yoğun Kar Sağanağı' },
    95: { e:'⛈️', t:'Gök Gürültülü Fırtına' },
    96: { e:'⛈️', t:'Dolu ile Fırtına' },
    99: { e:'⛈️', t:'Şiddetli Dolu ile Fırtına' }
  };

  function havaKoduOku(kod){
    return WMO_KODLARI[kod] || { e:'🌡️', t:'Bilinmiyor' };
  }

  function gunEtiketi(tarihStr, index){
    if(index === 0) return 'Bugün';
    if(index === 1) return 'Yarın';
    var d = new Date(tarihStr);
    var etiket = d.toLocaleDateString('tr-TR', { weekday:'short' });
    return etiket.charAt(0).toUpperCase() + etiket.slice(1);
  }

  function topbarRenderEt(kod, sicaklik){
    var el = document.getElementById('topbarHava');
    var bilgi = havaKoduOku(kod);
    if(el){
      el.innerHTML =
        '<span>' + bilgi.e + '</span>' +
        '<span>' + Math.round(sicaklik) + '°</span>';
      el.title = bilgi.t;
      el.style.display = 'flex';
    }
    // YENİ: dashboard hero kartındaki kompakt hava durumu özeti
    var heroEl = document.getElementById('heroHava');
    if(heroEl){
      heroEl.innerHTML =
        '<span class="hero-hava-ico">' + bilgi.e + '</span>' +
        '<span class="hero-hava-sicaklik">' + Math.round(sicaklik) + '°C</span>' +
        '<span class="hero-hava-aciklama">' + bilgi.t + '</span>';
      heroEl.style.display = 'flex';
    }
  }

  function kartRenderEt(veri){
    var wrap = document.getElementById('havaDurumuKartWrap');
    var kart = document.getElementById('havaDurumuKart');
    if(!wrap || !kart) return;
    var yukleniyor = document.getElementById('havaDurumuYukleniyor');
    if(yukleniyor) yukleniyor.remove();

    var anlikBilgi = havaKoduOku(veri.current.weather_code);

    // Konum adını topbar'dan al veya koordinatlardan oluştur
    var konumAdi = '';
    try {
      var topbarEl = document.getElementById('topbarHava');
      if(topbarEl && topbarEl.title) konumAdi = topbarEl.title;
    } catch(e) {}

    var nem      = veri.current.relative_humidity_2m;
    var ruzgar   = Math.round(veri.current.wind_speed_10m);
    var hissedilen = Math.round(veri.current.apparent_temperature);

    // Ana sıcaklık kutusu — koyu gradient arka plan
    var html = '<div style="background:linear-gradient(145deg,#0F3E50,#071E28);border-radius:14px;padding:16px 14px;margin-bottom:12px;cursor:pointer;" onclick="havaDurumuDetayAc()">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;">';
    html += '<div style="display:flex;align-items:center;gap:14px;">';
    html += '<div style="font-size:44px;line-height:1;">' + anlikBilgi.e + '</div>';
    html += '<div>';
    html += '<div style="font-size:28px;font-weight:800;color:#ffffff;">' + Math.round(veri.current.temperature_2m) + '°C</div>';
    html += '<div style="color:rgba(255,255,255,0.80);font-size:13px;margin-top:2px;">' + anlikBilgi.t + '</div>';
    html += '</div>';
    html += '</div>';
    html += '<span style="color:rgba(255,255,255,0.60);font-size:12px;">Detaylar ›</span>';
    html += '</div>';
    html += '<div style="display:flex;gap:14px;margin-top:10px;">';
    html += '<span style="color:rgba(255,255,255,0.75);font-size:12px;">💧 ' + nem + '%</span>';
    html += '<span style="color:rgba(255,255,255,0.75);font-size:12px;">💨 ' + ruzgar + ' km/s</span>';
    html += '<span style="color:rgba(255,255,255,0.75);font-size:12px;">🌡️ Hissedilen ' + hissedilen + '°C</span>';
    html += '</div>';
    html += '</div>';

    // Tahmin günleri
    html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;">';
    for(var i=0; i<veri.daily.time.length; i++){
      var gunBilgi = havaKoduOku(veri.daily.weather_code[i]);
      html += '<div style="text-align:center;padding:8px 2px;border-radius:10px;background:rgba(128,128,128,0.12);">';
      html += '<div style="font-size:12px;color:var(--ink-soft);margin-bottom:4px;">' + gunEtiketi(veri.daily.time[i], i) + '</div>';
      html += '<div style="font-size:20px;">' + gunBilgi.e + '</div>';
      html += '<div style="font-size:12px;margin-top:4px;"><strong style="color:var(--ink);">' + Math.round(veri.daily.temperature_2m_max[i]) + '°</strong><span style="color:var(--ink-muted);"> / ' + Math.round(veri.daily.temperature_2m_min[i]) + '°</span></div>';
      html += '</div>';
    }
    html += '</div>';

    // Konum + saat satırı
    var simdi = new Date();
    var saatStr = simdi.getHours().toString().padStart(2,'0') + ':' + simdi.getMinutes().toString().padStart(2,'0');
    var konumHTML = '<div id="havaDurumuKonumSatir" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">';
    konumHTML += '<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-muted);">';
    konumHTML += '<span>📍</span><span id="havaDurumuKonumAdi">Konum alınıyor…</span></div>';
    konumHTML += '<div style="display:flex;align-items:center;gap:6px;">';
    konumHTML += '<span style="font-size:12px;color:var(--ink-muted);">' + saatStr + '</span>';
    konumHTML += '<button onclick="konumIsteVeBaslat()" style="background:var(--nm-bg);border:none;box-shadow:2px 2px 5px rgba(163,177,198,0.50),-2px -2px 5px rgba(255,255,255,0.70);border-radius:8px;padding:4px 8px;cursor:pointer;font-size:14px;" title="Yenile">🔄</button>';
    konumHTML += '</div></div>';

    kart.innerHTML = konumHTML + html;
    wrap.style.display = 'block';

    // Ters geocoding ile konum adını al
    try {
      fetch('https://nominatim.openstreetmap.org/reverse?lat=' + _sonLat + '&lon=' + _sonLon + '&format=json&accept-language=tr')
        .then(function(r){ return r.json(); })
        .then(function(geo){
          var el = document.getElementById('havaDurumuKonumAdi');
          if(!el) return;
          var parts = [];
          if(geo.address){
            if(geo.address.neighbourhood) parts.push(geo.address.neighbourhood);
            else if(geo.address.suburb) parts.push(geo.address.suburb);
            if(geo.address.city || geo.address.town || geo.address.county)
              parts.push(geo.address.city || geo.address.town || geo.address.county);
          }
          el.textContent = parts.length ? parts.join(', ') : (geo.display_name || '').split(',').slice(0,2).join(',');
        }).catch(function(){});
    } catch(e) {}
  }

  var _sonLat = null, _sonLon = null, _sonVeri = null;

  function havaDurumuDetayAc(){
    if(!_sonVeri) return;
    var v = _sonVeri;
    var anlik = havaKoduOku(v.current.weather_code);
    var panel = document.createElement('div');
    panel.id = 'havaDurumuDetayPanel';
    panel.style.cssText = 'position:fixed;inset:0;z-index:2000;background:var(--nm-bg);overflow-y:auto;padding:20px;';
    var html = '<div style="max-width:480px;margin:0 auto;">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">';
    html += '<h2 style="font-size:18px;font-weight:700;color:var(--ink);">🌤️ Hava Durumu Detayı</h2>';
    html += "<button onclick=\"document.getElementById('havaDurumuDetayPanel').remove()\" style=\"background:var(--nm-bg);border:none;box-shadow:3px 3px 7px rgba(163,177,198,0.55),-3px -3px 7px rgba(255,255,255,0.75);border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer;color:var(--ink)\">✕ Vazgeç</button>";
    html += '</div>';
    // Ana bilgi
    html += '<div style="background:linear-gradient(145deg,#0F3E50,#071E28);border-radius:14px;padding:20px;margin-bottom:14px;">';
    html += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">';
    html += '<span style="font-size:52px;">' + anlik.e + '</span>';
    html += '<div>';
    html += '<div style="font-size:36px;font-weight:800;color:#fff;">' + Math.round(v.current.temperature_2m) + '°C</div>';
    html += '<div style="color:rgba(255,255,255,0.80);font-size:14px;">' + anlik.t + '</div>';
    html += '</div></div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
    html += '<div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:10px;">';
    html += '<div style="color:rgba(255,255,255,0.60);font-size:11px;margin-bottom:4px;">NEM</div>';
    html += '<div style="color:#fff;font-size:18px;font-weight:700;">💧 ' + v.current.relative_humidity_2m + '%</div></div>';
    html += '<div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:10px;">';
    html += '<div style="color:rgba(255,255,255,0.60);font-size:11px;margin-bottom:4px;">RÜZGAR</div>';
    html += '<div style="color:#fff;font-size:18px;font-weight:700;">💨 ' + Math.round(v.current.wind_speed_10m) + ' km/s</div></div>';
    html += '<div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:10px;grid-column:1/-1;">';
    html += '<div style="color:rgba(255,255,255,0.60);font-size:11px;margin-bottom:4px;">HİSSEDİLEN SICAKLIK</div>';
    html += '<div style="color:#fff;font-size:18px;font-weight:700;">🌡️ ' + Math.round(v.current.apparent_temperature) + '°C</div></div>';
    html += '</div></div>';
    // 5 günlük tahmin
    html += '<div style="color:var(--ink-muted);font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-bottom:8px;">5 GÜNLÜK TAHMİN</div>';
    html += '<div style="display:flex;flex-direction:column;gap:8px;">';
    for(var i=0;i<v.daily.time.length;i++){
      var g = havaKoduOku(v.daily.weather_code[i]);
      var etiket = i===0?'Bugün':i===1?'Yarın':new Date(v.daily.time[i]).toLocaleDateString('tr-TR',{weekday:'long'});
      html += '<div style="display:flex;align-items:center;justify-content:space-between;background:var(--nm-bg);box-shadow:3px 3px 7px rgba(163,177,198,0.55),-3px -3px 7px rgba(255,255,255,0.75);border-radius:12px;padding:12px 14px;">';
      html += '<span style="font-size:13px;font-weight:600;color:var(--ink);min-width:80px;">' + etiket + '</span>';
      html += '<span style="font-size:22px;">' + g.e + '</span>';
      html += '<span style="font-size:12px;color:var(--ink-muted);">' + g.t + '</span>';
      html += '<span style="font-size:13px;font-weight:700;color:var(--ink);">' + Math.round(v.daily.temperature_2m_max[i]) + '° <span style="font-weight:400;color:var(--ink-muted);">/ ' + Math.round(v.daily.temperature_2m_min[i]) + '°</span></span>';
      html += '</div>';
    }
    html += '</div></div>';
    panel.innerHTML = html;
    document.body.appendChild(panel);
  }

  function havaDurumuGetir(lat, lon){
    var url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=' + lat + '&longitude=' + lon
      + '&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min'
      + '&timezone=auto&forecast_days=5';

    fetch(url)
      .then(function(res){
        if(!res.ok) throw new Error('Hava durumu isteği başarısız: ' + res.status);
        return res.json();
      })
      .then(function(veri){
        if(!veri || !veri.current || !veri.daily) throw new Error('Beklenmeyen yanıt biçimi');
        _sonLat = lat; _sonLon = lon; _sonVeri = veri;
        topbarRenderEt(veri.current.weather_code, veri.current.temperature_2m);
        kartRenderEt(veri);
      })
      .catch(function(err){
        console.warn('Hava durumu alınamadı:', err.message);
      });
  }

  function konumIsteVeBaslat(){
    if(!('geolocation' in navigator)){
      console.warn('Bu cihaz/tarayıcı konum servisini desteklemiyor, hava durumu gösterilmeyecek.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function(pozisyon){
        havaDurumuGetir(pozisyon.coords.latitude, pozisyon.coords.longitude);
      },
      function(hata){
        console.warn('Konum izni alınamadı, hava durumu gösterilmeyecek:', hata.message);
        var yukleniyor = document.getElementById('havaDurumuYukleniyor');
        if(yukleniyor){
          yukleniyor.innerHTML =
            '<span style="font-size:22px;">🚫</span>' +
            '<span>Konum izni verilmedi. Hava durumu gösterilemiyor.</span>';
        }
      },
      { enableHighAccuracy:false, timeout:8000, maximumAge:0 }
    );
  }

  konumIsteVeBaslat();
  window.havaDurumuDetayAc = havaDurumuDetayAc;
  window.konumIsteVeBaslat = konumIsteVeBaslat;

})();
