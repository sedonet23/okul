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
    var bilgi = havaKoduOku(kod);
    var el = document.getElementById('topbarHava');
    if(el){
      el.innerHTML = '<span>' + bilgi.e + '</span><span>' + Math.round(sicaklik) + '°</span>';
      el.title = bilgi.t;
      el.style.display = 'flex';
    }
    // localStorage'dan önceki konum adını al (nominatim gelmeden önce göster)
    var kayitliKonum = '';
    try { kayitliKonum = localStorage.getItem('oyHavaKonum') || ''; } catch(e){}

    var heroSatir = document.getElementById('heroHavaSatir');
    if(heroSatir){
      heroSatir.innerHTML =
        '<span class="hava-ana-ikon" style="font-size:22px;flex-shrink:0;">' + bilgi.e + '</span>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span class="hero-hava-sicaklik">' + Math.round(sicaklik) + '°C</span>' +
            '<span class="hero-hava-aciklama">' + bilgi.t + '</span>' +
          '</div>' +
          '<div id="heroKonumMetni" style="font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;">' +
            (kayitliKonum ? '📍 ' + kayitliKonum : '') +
          '</div>' +
        '</div>' +
        '<span class="hero-hava-detay-ok">Detaylar ›</span>';
      heroSatir.style.display = 'flex';
    }
  }

  function kartRenderEt(veri){
    // Bağımsız hava durumu kartı kaldırıldı; sadece hero satırını ve
    // detay panelindeki konum adını güncelliyoruz. (Not: eski kod burada
    // artık DOM'da bulunmayan bir "kart" elemanına yazıyordu ve bu satır
    // hata fırlatıp aşağıdaki ters-geocoding kodunun hiç çalışmamasına
    // sebep oluyordu — konum bu yüzden hiçbir yerde görünmüyordu.)
    var yukleniyor = document.getElementById('havaDurumuYukleniyor');
    if(yukleniyor) yukleniyor.style.display = 'none';

    // Ters geocoding ile konum adını al
    try {
      fetch('https://nominatim.openstreetmap.org/reverse?lat=' + _sonLat + '&lon=' + _sonLon + '&format=json&accept-language=tr')
        .then(function(r){ return r.json(); })
        .then(function(geo){
          var parts = [];
          if(geo.address){
            if(geo.address.neighbourhood) parts.push(geo.address.neighbourhood);
            else if(geo.address.suburb) parts.push(geo.address.suburb);
            if(geo.address.city || geo.address.town || geo.address.county)
              parts.push(geo.address.city || geo.address.town || geo.address.county);
          }
          var konumMetin = parts.length ? parts.join(', ') : (geo.display_name || '').split(',').slice(0,2).join(',');
          if(!konumMetin) return;

          _sonKonumAdi = konumMetin;
          // localStorage'a kaydet — bir sonraki açılışta hemen göster
          try { localStorage.setItem('oyHavaKonum', konumMetin); } catch(e) {}

          konumHerYereYaz(konumMetin);
        }).catch(function(){});
    } catch(e) {}
  }

  // Konum metnini; ana sayfa hero'su, hava durumu detay paneli ve topbar
  // başlığında bulunan her yere yazar.
  function konumHerYereYaz(konumMetin){
    // 1) Ana sayfa hero satırı
    var heroKonum = document.getElementById('heroKonumMetni');
    if(heroKonum){
      heroKonum.textContent = '📍 ' + konumMetin;
    } else {
      var heroSatirDiv = document.getElementById('heroHavaSatir');
      if(heroSatirDiv){
        var icDiv = heroSatirDiv.querySelector('div');
        if(icDiv){
          var yeni = document.createElement('div');
          yeni.id = 'heroKonumMetni';
          yeni.style.cssText = 'font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;';
          yeni.textContent = '📍 ' + konumMetin;
          icDiv.appendChild(yeni);
        }
      }
    }

    // 2) Hava durumu detay paneli (açıksa)
    var detayKonum = document.getElementById('havDetayKonumMetni');
    if(detayKonum) detayKonum.textContent = '📍 ' + konumMetin;

    // 3) Topbar hava rozeti tooltip'i
    var topbarEl = document.getElementById('topbarHava');
    if(topbarEl && !topbarEl.title) topbarEl.title = konumMetin;
  }

  var _sonLat = null, _sonLon = null, _sonVeri = null, _sonKonumAdi = null;
  try { _sonKonumAdi = localStorage.getItem('oyHavaKonum') || null; } catch(e){}

  function havaDurumuDetayKapat(){
    const p = document.getElementById('havaDurumuDetayPanel');
    if(p) p.remove();
    if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
  }
  window.havaDurumuDetayKapat = havaDurumuDetayKapat;

  function havaDurumuDetayAc(){
    if(!_sonVeri) return;
    var v = _sonVeri;
    var anlik = havaKoduOku(v.current.weather_code);
    var simdiSaat = new Date().getHours();

    // Mevcut panel varsa kaldır
    var eskiPanel = document.getElementById('havaDurumuDetayPanel');
    if(eskiPanel) eskiPanel.remove();

    var panel = document.createElement('div');
    panel.id = 'havaDurumuDetayPanel';
    panel.style.cssText = 'position:fixed;inset:0;z-index:8000;overflow-y:auto;overflow-x:hidden;font-family:Inter,sans-serif;padding-bottom:80px;';
    // DÜZELTME (kaydırma): bu panel diğer detay panellerinin aksine
    // pull-to-refresh'i hiç kapatmıyordu — panel içinde kaydırırken
    // (özellikle en üstten yukarı doğru) native "aşağı çekince yenile"
    // hareketiyle çakışıp kaydırmayı bozuyordu.
    if(typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

    // ------- ANA BAŞLIK ------- //
    var html = '<div style="min-height:100vh;background:linear-gradient(160deg,#0B1E4A 0%,#1B3570 50%,#2C509A 100%);">';

    // Üst bar (kapat)
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;position:sticky;top:0;background:rgba(11,30,74,.92);backdrop-filter:blur(12px);z-index:10;">';
    html += '<div>';
    html += '<div style="color:#fff;font-size:16px;font-weight:800;">🌤️ Hava Durumu</div>';
    html += '<div id="havDetayKonumMetni" style="color:rgba(255,255,255,.65);font-size:11px;margin-top:2px;">' + (_sonKonumAdi ? '📍 ' + _sonKonumAdi : 'Konum alınıyor…') + '</div>';
    html += '</div>';
    html += '<button onclick="havaDurumuDetayKapat()" style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:50%;width:38px;height:38px;color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>';
    html += '</div>';

    // Rüzgar yönü oku
    function ruzgarYonu(derece){
      var yonler = ['K','KD','D','GD','G','GB','B','KB'];
      return yonler[Math.round(derece / 45) % 8];
    }

    // Anlık büyük kart
    html += '<div style="padding:24px 20px 16px;text-align:center;">';
    html += '<div style="font-size:72px;line-height:1;margin-bottom:8px;">' + anlik.e + '</div>';
    html += '<div style="font-size:52px;font-weight:800;color:#fff;line-height:1;">' + Math.round(v.current.temperature_2m) + '°C</div>';
    html += '<div style="color:rgba(255,255,255,.75);font-size:15px;margin-top:6px;">' + anlik.t + '</div>';

    // Satır 1: nem, rüzgar, hissedilen
    html += '<div style="display:flex;justify-content:center;gap:16px;margin-top:14px;flex-wrap:wrap;">';
    html += '<span style="color:rgba(255,255,255,.70);font-size:13px;">💧 ' + v.current.relative_humidity_2m + '%</span>';
    html += '<span style="color:rgba(255,255,255,.70);font-size:13px;">💨 ' + Math.round(v.current.wind_speed_10m) + ' km/s ' + ruzgarYonu(v.current.wind_direction_10m) + '</span>';
    html += '<span style="color:rgba(255,255,255,.70);font-size:13px;">🌡️ ' + Math.round(v.current.apparent_temperature) + '°C</span>';
    html += '</div>';

    // Satır 2: basınç, görüş mesafesi, UV, yağış
    html += '<div style="display:flex;justify-content:center;gap:16px;margin-top:8px;flex-wrap:wrap;">';
    html += '<span style="color:rgba(255,255,255,.60);font-size:12px;">⬇️ ' + Math.round(v.current.surface_pressure) + ' hPa</span>';
    html += '<span style="color:rgba(255,255,255,.60);font-size:12px;">👁 ' + (v.current.visibility >= 1000 ? Math.round(v.current.visibility/1000) + ' km' : v.current.visibility + ' m') + '</span>';
    html += '<span style="color:rgba(255,255,255,.60);font-size:12px;">☀️ UV ' + (v.current.uv_index || 0) + '</span>';
    if(v.current.precipitation > 0) html += '<span style="color:rgba(255,255,255,.60);font-size:12px;">🌧 ' + v.current.precipitation + ' mm</span>';
    html += '</div></div>';

    // Sekme çubuğu
    html += '<div id="havDetayTabBar" style="display:flex;gap:6px;padding:0 20px 16px;">';
    ['saatlik','gunluk','haftalik'].forEach(function(tab, i){
      var etiket = ['⏱ Saatlik','📅 7 Günlük','🗓 Aylık'][i];
      var aktif = i===0 ? 'background:rgba(255,255,255,.25);border:1px solid rgba(255,255,255,.4);font-weight:700;' : 'background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);';
      html += '<button onclick="havDetayTabGoster(\'' + tab + '\')" id="havTab_' + tab + '" style="flex:1;padding:9px 4px;border-radius:12px;color:#fff;font-size:12px;font-family:Inter,sans-serif;cursor:pointer;' + aktif + '">' + etiket + '</button>';
    });
    html += '</div>';

    // --- SAATLİK ---
    html += '<div id="havPanelSaatlik" style="padding:0 20px 20px;">';
    html += '<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;">';
    if(v.hourly && v.hourly.time){
      var baslangic = simdiSaat;
      for(var h=baslangic; h<baslangic+24 && h<v.hourly.time.length; h++){
        var hBilgi = havaKoduOku(v.hourly.weather_code[h]);
        var hSaat = v.hourly.time[h].split('T')[1] || (h%24)+':00';
        var aktifMi = h===baslangic;
        var hYagis = v.hourly.precipitation_probability ? v.hourly.precipitation_probability[h] : 0;
        html += '<div style="flex:0 0 68px;text-align:center;padding:12px 6px;border-radius:14px;background:' + (aktifMi?'rgba(255,255,255,.25)':'rgba(255,255,255,.08)') + ';border:1px solid ' + (aktifMi?'rgba(255,255,255,.5)':'rgba(255,255,255,.1)') + ';">';
        html += '<div style="color:rgba(255,255,255,.70);font-size:11px;">' + (aktifMi?'Şimdi':hSaat) + '</div>';
        html += '<div style="font-size:22px;margin:6px 0;">' + hBilgi.e + '</div>';
        html += '<div style="color:#fff;font-size:13px;font-weight:700;">' + Math.round(v.hourly.temperature_2m[h]) + '°</div>';
        if(v.hourly.relative_humidity_2m) html += '<div style="color:rgba(255,255,255,.55);font-size:10px;margin-top:3px;">💧' + v.hourly.relative_humidity_2m[h] + '%</div>';
        if(hYagis > 0) html += '<div style="color:rgba(100,180,255,.85);font-size:10px;">🌧' + hYagis + '%</div>';
        html += '</div>';
      }
    }
    html += '</div></div>';

    // --- 7 GÜNLÜK ---
    html += '<div id="havPanelGunluk" style="display:none;padding:0 20px 20px;">';
    html += '<div style="display:flex;flex-direction:column;gap:8px;">';
    for(var g=0; g<v.daily.time.length; g++){
      var gBilgi = havaKoduOku(v.daily.weather_code[g]);
      var gEtiket = g===0?'Bugün':g===1?'Yarın':new Date(v.daily.time[g]).toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'short'});
      var gYagis = v.daily.precipitation_sum ? v.daily.precipitation_sum[g] : 0;
      var gYagisOlas = v.daily.precipitation_probability_max ? v.daily.precipitation_probability_max[g] : 0;
      var gUV = v.daily.uv_index_max ? v.daily.uv_index_max[g] : 0;
      var gRuzgar = v.daily.wind_speed_10m_max ? Math.round(v.daily.wind_speed_10m_max[g]) : 0;
      var gDogus = v.daily.sunrise ? v.daily.sunrise[g].split('T')[1] : '';
      var gBatis = v.daily.sunset ? v.daily.sunset[g].split('T')[1] : '';
      html += '<div style="background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:14px 16px;">';
      html += '<div style="display:flex;align-items:center;gap:12px;">';
      html += '<span style="font-size:28px;flex-shrink:0;">' + gBilgi.e + '</span>';
      html += '<div style="flex:1;"><div style="color:#fff;font-size:13px;font-weight:700;">' + gEtiket + '</div><div style="color:rgba(255,255,255,.60);font-size:11px;margin-top:2px;">' + gBilgi.t + '</div></div>';
      html += '<div style="text-align:right;"><div style="color:#fff;font-size:15px;font-weight:800;">' + Math.round(v.daily.temperature_2m_max[g]) + '°</div><div style="color:rgba(255,255,255,.55);font-size:12px;">' + Math.round(v.daily.temperature_2m_min[g]) + '°</div></div>';
      html += '</div>';
      // Alt detay satırı
      html += '<div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;">';
      if(gYagisOlas > 0) html += '<span style="color:rgba(100,180,255,.85);font-size:11px;">🌧 ' + gYagisOlas + '%' + (gYagis > 0 ? ' · ' + gYagis + ' mm' : '') + '</span>';
      if(gRuzgar > 0) html += '<span style="color:rgba(255,255,255,.55);font-size:11px;">💨 ' + gRuzgar + ' km/s</span>';
      if(gUV > 0) html += '<span style="color:rgba(255,255,255,.55);font-size:11px;">☀️ UV ' + gUV + '</span>';
      if(gDogus) html += '<span style="color:rgba(255,200,80,.75);font-size:11px;">🌅 ' + gDogus + '</span>';
      if(gBatis) html += '<span style="color:rgba(255,150,50,.75);font-size:11px;">🌇 ' + gBatis + '</span>';
      html += '</div>';
      html += '</div>';
    }
    html += '</div></div>';

    // --- AYLIK (7 günlük veriyi döngüyle genişletip 4 hafta göster) ---
    html += '<div id="havPanelHaftalik" style="display:none;padding:0 20px 20px;">';
    html += '<p style="color:rgba(255,255,255,.55);font-size:11px;margin-bottom:10px;">* 7 günlük tahmin döngüsünden oluşturulmuştur.</p>';
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px;">';
    ['P','S','Ç','P','C','C','P'].forEach(function(g){ html += '<div style="text-align:center;color:rgba(255,255,255,.50);font-size:10px;padding:4px 0;">' + g + '</div>'; });
    html += '</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">';
    for(var m=0; m<28; m++){
      var mIdx = m % v.daily.time.length;
      var mBilgi = havaKoduOku(v.daily.weather_code[mIdx]);
      var mTarih = new Date(); mTarih.setDate(mTarih.getDate() + m);
      var mGun = mTarih.getDate();
      html += '<div style="text-align:center;padding:8px 2px;border-radius:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.06);">';
      html += '<div style="color:rgba(255,255,255,.50);font-size:9px;">' + mGun + '</div>';
      html += '<div style="font-size:16px;margin:3px 0;">' + mBilgi.e + '</div>';
      html += '<div style="color:#fff;font-size:10px;font-weight:700;">' + Math.round(v.daily.temperature_2m_max[mIdx]) + '°</div>';
      html += '</div>';
    }
    html += '</div></div>';
    html += '</div>'; // gradient wrapper

    panel.innerHTML = html;
    document.body.appendChild(panel);
  }

  window.havDetayTabGoster = function(tab){
    ['saatlik','gunluk','haftalik'].forEach(function(t){
      var p = document.getElementById('havPanelSaatlik'===('havPanel'+t.charAt(0).toUpperCase()+t.slice(1))?'havPanelSaatlik':'havPanel'+t.charAt(0).toUpperCase()+t.slice(1));
      var btn = document.getElementById('havTab_'+t);
      var aktif = t===tab;
      if(document.getElementById('havPanel'+t.charAt(0).toUpperCase()+t.slice(1)))
        document.getElementById('havPanel'+t.charAt(0).toUpperCase()+t.slice(1)).style.display = aktif?'block':'none';
      if(btn){ btn.style.background = aktif?'rgba(255,255,255,.25)':'rgba(255,255,255,.08)'; btn.style.border = aktif?'1px solid rgba(255,255,255,.4)':'1px solid rgba(255,255,255,.12)'; btn.style.fontWeight = aktif?'700':'400'; }
    });
  };

  function havaDurumuGetir(lat, lon){
    var url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude=' + lat + '&longitude=' + lon
      + '&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m,apparent_temperature,precipitation,surface_pressure,visibility,uv_index'
      + '&hourly=temperature_2m,weather_code,relative_humidity_2m,precipitation_probability,wind_speed_10m,uv_index'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,wind_speed_10m_max,sunrise,sunset'
      + '&timezone=auto&forecast_days=7';

    fetch(url)
      .then(function(res){
        if(!res.ok) throw new Error('Hava durumu isteği başarısız: ' + res.status);
        return res.json();
      })
      .then(function(veri){
        if(!veri || !veri.current || !veri.daily) throw new Error('Beklenmeyen yanıt biçimi');
        _sonLat = lat; _sonLon = lon; _sonVeri = veri;
        // Ana ekran widget'ı (widget-bridge.js) bu modülün içine giremediği için
        // son hava durumu verisini window üzerinden dışa açıyoruz.
        window.sonHavaVerisi = {
          kod: veri.current.weather_code,
          sicaklik: veri.current.temperature_2m
        };
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
  window.havaKoduOku = havaKoduOku; // widget-bridge.js widget'a emoji/açıklama çevirmek için kullanır

})();
