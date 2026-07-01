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
    // YENİ: hero kartındaki hava satırı (tıklanınca detay açılır) + konum adı
    var heroSatir = document.getElementById('heroHavaSatir');
    if(heroSatir){
      heroSatir.innerHTML =
        '<span class="hava-ana-ikon" style="font-size:22px;flex-shrink:0;">' + bilgi.e + '</span>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span class="hero-hava-sicaklik">' + Math.round(sicaklik) + '°C</span>' +
            '<span class="hero-hava-aciklama">' + bilgi.t + '</span>' +
          '</div>' +
          '<div id="heroKonumMetni" style="font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;"></div>' +
        '</div>' +
        '<span class="hero-hava-detay-ok">Detaylar ›</span>';
      heroSatir.style.display = 'flex';
    }
  }

  function kartRenderEt(veri){
    // Bağımsız hava durumu kartı kaldırıldı; sadece hero satırını güncelle
    var yukleniyor = document.getElementById('havaDurumuYukleniyor');
    if(yukleniyor) yukleniyor.style.display = 'none';
    // topbarRenderEt heroHavaSatir'ı zaten güncelliyor; burada ek bir şey yapmıyoruz

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
    html += '<div class="hava-ana-ikon" style="font-size:44px;line-height:1;">' + anlikBilgi.e + '</div>';
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
    // Kart artık ana sayfada gösterilmiyor — hero içindeki heroHavaSatir kullanılıyor
    // wrap.style.display = 'block'; // KAPATILDI

    // Ters geocoding ile konum adını al
    try {
      fetch('https://nominatim.openstreetmap.org/reverse?lat=' + _sonLat + '&lon=' + _sonLon + '&format=json&accept-language=tr')
        .then(function(r){ return r.json(); })
        .then(function(geo){
          var el = document.getElementById('havaDurumuKonumAdi');
          var parts = [];
          if(geo.address){
            if(geo.address.neighbourhood) parts.push(geo.address.neighbourhood);
            else if(geo.address.suburb) parts.push(geo.address.suburb);
            if(geo.address.city || geo.address.town || geo.address.county)
              parts.push(geo.address.city || geo.address.town || geo.address.county);
          }
          var konumMetin = parts.length ? parts.join(', ') : (geo.display_name || '').split(',').slice(0,2).join(',');
          if(el) el.textContent = konumMetin;
          // YENİ: Hero'daki konum satırını da güncelle
          var heroKonum = document.getElementById('heroKonumMetni');
          if(heroKonum) heroKonum.textContent = '📍 ' + konumMetin;
          // Tekrar bulamazsa yeni bir tane oluştur
          if(!heroKonum){
            var heroSatirDiv = document.getElementById('heroHavaSatir');
            if(heroSatirDiv){
              var yeni = document.createElement('div');
              yeni.id = 'heroKonumMetni';
              yeni.style.cssText = 'font-size:11px;color:rgba(255,255,255,.65);margin-top:2px;';
              yeni.textContent = '📍 ' + konumMetin;
              var icDiv = heroSatirDiv.querySelector('div');
              if(icDiv) icDiv.appendChild(yeni);
            }
          }
        }).catch(function(){});
    } catch(e) {}
  }

  var _sonLat = null, _sonLon = null, _sonVeri = null;

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
    panel.style.cssText = 'position:fixed;inset:0;z-index:3000;overflow-y:auto;font-family:Inter,sans-serif;';

    // ------- ANA BAŞLIK ------- //
    var html = '<div style="min-height:100vh;background:linear-gradient(160deg,#0B1E4A 0%,#1B3570 50%,#2C509A 100%);">';

    // Üst bar (kapat)
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;position:sticky;top:0;background:rgba(11,30,74,.85);backdrop-filter:blur(12px);z-index:10;">';
    html += '<div style="color:#fff;font-size:16px;font-weight:800;">🌤️ Hava Durumu</div>';
    html += '<button onclick="document.getElementById(\'havaDurumuDetayPanel\').remove()" style="background:rgba(255,255,255,.12);border:none;border-radius:50%;width:36px;height:36px;color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>';
    html += '</div>';

    // Anlık büyük kart
    html += '<div style="padding:24px 20px 16px;text-align:center;">';
    html += '<div style="font-size:72px;line-height:1;margin-bottom:8px;">' + anlik.e + '</div>';
    html += '<div style="font-size:52px;font-weight:800;color:#fff;line-height:1;">' + Math.round(v.current.temperature_2m) + '°C</div>';
    html += '<div style="color:rgba(255,255,255,.75);font-size:15px;margin-top:6px;">' + anlik.t + '</div>';
    html += '<div style="display:flex;justify-content:center;gap:20px;margin-top:14px;">';
    html += '<span style="color:rgba(255,255,255,.70);font-size:13px;">💧 ' + v.current.relative_humidity_2m + '%</span>';
    html += '<span style="color:rgba(255,255,255,.70);font-size:13px;">💨 ' + Math.round(v.current.wind_speed_10m) + ' km/s</span>';
    html += '<span style="color:rgba(255,255,255,.70);font-size:13px;">🌡️ ' + Math.round(v.current.apparent_temperature) + '°C</span>';
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
        html += '<div style="flex:0 0 64px;text-align:center;padding:12px 6px;border-radius:14px;background:' + (aktifMi?'rgba(255,255,255,.25)':'rgba(255,255,255,.08)') + ';border:1px solid ' + (aktifMi?'rgba(255,255,255,.5)':'rgba(255,255,255,.1)') + ';">';
        html += '<div style="color:rgba(255,255,255,.70);font-size:11px;">' + (aktifMi?'Şimdi':hSaat) + '</div>';
        html += '<div style="font-size:22px;margin:6px 0;">' + hBilgi.e + '</div>';
        html += '<div style="color:#fff;font-size:13px;font-weight:700;">' + Math.round(v.hourly.temperature_2m[h]) + '°</div>';
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
      html += '<div style="display:flex;align-items:center;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:14px 16px;gap:12px;">';
      html += '<span style="font-size:28px;flex-shrink:0;">' + gBilgi.e + '</span>';
      html += '<div style="flex:1;"><div style="color:#fff;font-size:13px;font-weight:700;">' + gEtiket + '</div><div style="color:rgba(255,255,255,.60);font-size:11px;margin-top:2px;">' + gBilgi.t + '</div></div>';
      html += '<div style="text-align:right;"><div style="color:#fff;font-size:15px;font-weight:800;">' + Math.round(v.daily.temperature_2m_max[g]) + '°</div><div style="color:rgba(255,255,255,.55);font-size:12px;">' + Math.round(v.daily.temperature_2m_min[g]) + '°</div></div>';
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
      + '&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature'
      + '&hourly=temperature_2m,weather_code'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min'
      + '&timezone=auto&forecast_days=7';

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
