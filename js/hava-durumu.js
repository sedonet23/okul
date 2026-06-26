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
    if(!el) return;
    var bilgi = havaKoduOku(kod);
    el.innerHTML =
      '<span>' + bilgi.e + '</span>' +
      '<span>' + Math.round(sicaklik) + '°</span>';
    el.title = bilgi.t;
    el.style.display = 'flex';
  }

  function kartRenderEt(veri){
    var wrap = document.getElementById('havaDurumuKartWrap');
    var kart = document.getElementById('havaDurumuKart');
    if(!wrap || !kart) return;
    var yukleniyor = document.getElementById('havaDurumuYukleniyor');
    if(yukleniyor) yukleniyor.remove();

    var anlikBilgi = havaKoduOku(veri.current.weather_code);

    // Ana sıcaklık kutusu — koyu gradient arka plan
    var html = '<div style="background:linear-gradient(145deg,#0F3E50,#071E28);border-radius:14px;padding:16px 14px;margin-bottom:12px;">';
    html += '<div style="display:flex;align-items:center;gap:14px;">';
    html += '<div style="font-size:44px;line-height:1;">' + anlikBilgi.e + '</div>';
    html += '<div>';
    html += '<div style="font-size:28px;font-weight:800;color:#ffffff;">' + Math.round(veri.current.temperature_2m) + '°C</div>';
    html += '<div style="color:rgba(255,255,255,0.80);font-size:13px;margin-top:2px;">' + anlikBilgi.t + '</div>';
    html += '</div>';
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

    kart.innerHTML = html;
    wrap.style.display = 'block';
  }

  function havaDurumuGetir(lat, lon){
    var url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=' + lat + '&longitude=' + lon
      + '&current=temperature_2m,weather_code'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min'
      + '&timezone=auto&forecast_days=5';

    fetch(url)
      .then(function(res){
        if(!res.ok) throw new Error('Hava durumu isteği başarısız: ' + res.status);
        return res.json();
      })
      .then(function(veri){
        if(!veri || !veri.current || !veri.daily) throw new Error('Beklenmeyen yanıt biçimi');
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

})();
