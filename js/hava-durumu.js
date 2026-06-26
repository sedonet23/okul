// hava-durumu.js
// Open-Meteo (tahmin) + OpenStreetMap Nominatim (ters geocoding) kullanır.
// Google Weather'ın kamuya açık bir API'si bulunmamaktadır; bu kombinasyon
// aynı veri kaynaklarını (ECMWF/GFS modelleri) ücretsiz ve key'siz sunar.

(function(){
  'use strict';

  var _sonVeri   = null;   // son çekilen ham veri
  var _sonKonum  = null;   // { lat, lon, sehir, ilce }
  var _guncelleniyor = false;

  /* ── WMO hava kodları ── */
  var WMO = {
    0:{e:'☀️',t:'Açık'},1:{e:'🌤️',t:'Az Bulutlu'},2:{e:'⛅',t:'Parçalı Bulutlu'},
    3:{e:'☁️',t:'Bulutlu'},45:{e:'🌫️',t:'Sisli'},48:{e:'🌫️',t:'Kırağı Sisi'},
    51:{e:'🌦️',t:'Hafif Çisenti'},53:{e:'🌦️',t:'Çisenti'},55:{e:'🌧️',t:'Yoğun Çisenti'},
    56:{e:'🌧️',t:'Donucu Çisenti'},57:{e:'🌧️',t:'Yoğun Donucu Çisenti'},
    61:{e:'🌦️',t:'Hafif Yağmur'},63:{e:'🌧️',t:'Yağmur'},65:{e:'🌧️',t:'Şiddetli Yağmur'},
    66:{e:'🌧️',t:'Donucu Yağmur'},67:{e:'🌧️',t:'Şiddetli Donucu Yağmur'},
    71:{e:'🌨️',t:'Hafif Kar'},73:{e:'🌨️',t:'Kar'},75:{e:'❄️',t:'Yoğun Kar'},
    77:{e:'❄️',t:'Kar Taneleri'},80:{e:'🌦️',t:'Hafif Sağanak'},81:{e:'🌧️',t:'Sağanak'},
    82:{e:'⛈️',t:'Şiddetli Sağanak'},85:{e:'🌨️',t:'Hafif Kar Sağanağı'},
    86:{e:'❄️',t:'Yoğun Kar Sağanağı'},95:{e:'⛈️',t:'Gök Gürültülü Fırtına'},
    96:{e:'⛈️',t:'Dolu ile Fırtına'},99:{e:'⛈️',t:'Şiddetli Dolu ile Fırtına'}
  };

  function wmo(kod){ return WMO[kod] || {e:'🌡️',t:'Bilinmiyor'}; }

  function gunEtiketi(tarihStr, i){
    if(i===0) return 'Bugün';
    if(i===1) return 'Yarın';
    var d = new Date(tarihStr);
    var s = d.toLocaleDateString('tr-TR',{weekday:'short'});
    return s.charAt(0).toUpperCase()+s.slice(1);
  }

  /* ── Topbar mini göstergesi ── */
  function topbarRenderEt(kod, sicaklik, sehir){
    var el = document.getElementById('topbarHava');
    if(!el) return;
    var b = wmo(kod);
    el.innerHTML = '<span>'+b.e+'</span><span>'+Math.round(sicaklik)+'°</span>'
      +(sehir?'<span style="font-size:12px;opacity:.75;">'+sehir+'</span>':'');
    el.title = b.t+(sehir?' — '+sehir:'');
    el.style.display = 'flex';
  }

  /* ── Ana kart ── */
  function kartRenderEt(veri, konum){
    var wrap = document.getElementById('havaDurumuKartWrap');
    var kart = document.getElementById('havaDurumuKart');
    if(!wrap||!kart) return;

    var b = wmo(veri.current.weather_code);
    var sicak = Math.round(veri.current.temperature_2m);
    var nem   = veri.current.relative_humidity_2m != null
                  ? Math.round(veri.current.relative_humidity_2m)+'%' : '—';
    var ruzgar = veri.current.wind_speed_10m != null
                  ? Math.round(veri.current.wind_speed_10m)+' km/s' : '—';
    var hissi  = veri.current.apparent_temperature != null
                  ? Math.round(veri.current.apparent_temperature)+'°C' : '—';
    var sehirAd = konum ? (konum.ilce&&konum.sehir&&konum.ilce!==konum.sehir
                    ? konum.ilce+', '+konum.sehir : konum.sehir||'') : '';
    var guncSaat = new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});

    var html = '';

    // Üst satır: konum + güncelle butonu
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;">';
    html += '<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--ink-muted);min-width:0;">';
    html += '<span>📍</span>';
    html += '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(sehirAd||'Konum alındı')+'</span>';
    html += '</div>';
    html += '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">';
    html += '<span style="font-size:11px;color:var(--ink-muted);">'+guncSaat+'</span>';
    html += '<button id="havaGuncelleBtn" onclick="window._havaGuncelle()" title="Yenile" '
          + 'style="background:none;border:1.5px solid var(--border);border-radius:8px;'
          + 'padding:4px 8px;cursor:pointer;font-size:14px;color:var(--ink-muted);'
          + 'transition:all .15s;display:flex;align-items:center;gap:4px;">'
          + '<span id="havaGuncelleIkon">🔄</span>'
          + '</button>';
    html += '</div></div>';

    // Ana bilgi: emoji + sıcaklık + açıklama
    html += '<div onclick="window._havaDetayAc()" style="cursor:pointer;display:flex;align-items:center;gap:16px;margin-bottom:14px;'
          + 'padding:14px;border-radius:12px;background:linear-gradient(135deg,var(--brand-light,#e6f4f4),rgba(42,157,157,.1));'
          + 'transition:box-shadow .15s;" '
          + 'onmouseover="this.style.boxShadow=\'0 4px 12px rgba(10,110,110,.15)\'" '
          + 'onmouseout="this.style.boxShadow=\'none\'">';
    html += '<div style="font-size:52px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.1));">'+b.e+'</div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="font-size:32px;font-weight:800;line-height:1;letter-spacing:-1px;">'+sicak+'°C</div>';
    html += '<div style="font-size:14px;font-weight:600;color:var(--ink-soft);margin-top:2px;">'+b.t+'</div>';
    html += '<div style="display:flex;gap:12px;margin-top:6px;flex-wrap:wrap;">';
    html += '<span style="font-size:12px;color:var(--ink-muted);">💧 '+nem+'</span>';
    html += '<span style="font-size:12px;color:var(--ink-muted);">💨 '+ruzgar+'</span>';
    html += '<span style="font-size:12px;color:var(--ink-muted);">🌡️ Hissedilen '+hissi+'</span>';
    html += '</div></div>';
    html += '<div style="font-size:11px;color:var(--ink-muted);align-self:flex-start;margin-top:4px;">Detaylar ›</div>';
    html += '</div>';

    // 5 günlük tahmin
    html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;">';
    for(var i=0;i<Math.min(veri.daily.time.length,5);i++){
      var gb = wmo(veri.daily.weather_code[i]);
      var yagis = veri.daily.precipitation_sum ? (veri.daily.precipitation_sum[i]||0) : 0;
      html += '<div onclick="window._havaDetayAc('+i+')" style="text-align:center;padding:10px 4px;border-radius:10px;'
            + 'background:rgba(128,128,128,.07);cursor:pointer;transition:background .12s;" '
            + 'onmouseover="this.style.background=\'rgba(10,110,110,.12)\'" '
            + 'onmouseout="this.style.background=\'rgba(128,128,128,.07)\'">';
      html += '<div style="font-size:11.5px;color:var(--ink-muted);margin-bottom:4px;font-weight:600;">'+gunEtiketi(veri.daily.time[i],i)+'</div>';
      html += '<div style="font-size:22px;">'+gb.e+'</div>';
      html += '<div style="font-size:11.5px;margin-top:4px;"><strong>'+Math.round(veri.daily.temperature_2m_max[i])+'°</strong>'
            + '<span style="color:var(--ink-muted);"> / '+Math.round(veri.daily.temperature_2m_min[i])+'°</span></div>';
      if(yagis>0) html += '<div style="font-size:10px;color:#3b82f6;margin-top:2px;">💧'+yagis.toFixed(1)+'mm</div>';
      html += '</div>';
    }
    html += '</div>';

    kart.innerHTML = html;
    wrap.style.display = 'block';
  }

  /* ── Detay modalı ── */
  function detayAc(gunIndex){
    if(!_sonVeri) return;
    var veri   = _sonVeri;
    var konum  = _sonKonum;
    var idx    = gunIndex || 0;

    var sehirAd = konum ? (konum.ilce&&konum.sehir&&konum.ilce!==konum.sehir
                    ? konum.ilce+', '+konum.sehir : konum.sehir||'') : '';

    // Günlük seçici
    var sekmeler = '';
    for(var i=0;i<Math.min(veri.daily.time.length,5);i++){
      sekmeler += '<button onclick="window._havaDetaySekme('+i+')" id="havaDetaySekme'+i+'" '
        +'style="padding:6px 12px;border-radius:8px;border:1.5px solid '+(i===idx?'var(--brand)':'var(--border)')+';'
        +'background:'+(i===idx?'var(--brand)':'transparent')+';color:'+(i===idx?'#fff':'var(--ink-muted)')+';'
        +'cursor:pointer;font-size:12px;font-weight:600;font-family:var(--font-body);transition:all .12s;">'
        +gunEtiketi(veri.daily.time[i],i)+'</button>';
    }

    var gb = wmo(veri.daily.weather_code[idx]);
    var tarih = new Date(veri.daily.time[idx]).toLocaleDateString('tr-TR',{day:'numeric',month:'long',weekday:'long'});

    var icerik = '';
    icerik += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">'+sekmeler+'</div>';
    icerik += '<div style="font-size:12px;color:var(--ink-muted);margin-bottom:12px;">'+tarih+(sehirAd?' — '+sehirAd:'')+'</div>';

    // Büyük emoji + sıcaklık
    icerik += '<div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">';
    icerik += '<div style="font-size:56px;line-height:1;">'+gb.e+'</div>';
    icerik += '<div>';
    icerik += '<div style="font-size:28px;font-weight:800;">'+Math.round(veri.daily.temperature_2m_max[idx])+'° / '+Math.round(veri.daily.temperature_2m_min[idx])+'°</div>';
    icerik += '<div style="font-size:14px;color:var(--ink-muted);">'+gb.t+'</div>';
    icerik += '</div></div>';

    // Detay grid
    var satirlar = [];
    if(veri.daily.precipitation_sum)
      satirlar.push(['💧','Yağış',((veri.daily.precipitation_sum[idx]||0).toFixed(1)+' mm')]);
    if(veri.daily.precipitation_probability_max)
      satirlar.push(['🌂','Yağış İhtimali',((veri.daily.precipitation_probability_max[idx]||0)+'%')]);
    if(veri.daily.wind_speed_10m_max)
      satirlar.push(['💨','Maks. Rüzgar',(Math.round(veri.daily.wind_speed_10m_max[idx])+' km/s')]);
    if(veri.daily.uv_index_max)
      satirlar.push(['☀️','UV İndeksi',(veri.daily.uv_index_max[idx]!=null?veri.daily.uv_index_max[idx]:'—')]);
    if(veri.daily.sunrise)
      satirlar.push(['🌅','Gün Doğumu',(veri.daily.sunrise[idx]?veri.daily.sunrise[idx].split('T')[1]:'—')]);
    if(veri.daily.sunset)
      satirlar.push(['🌇','Gün Batımı',(veri.daily.sunset[idx]?veri.daily.sunset[idx].split('T')[1]:'—')]);

    if(satirlar.length){
      icerik += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
      for(var s=0;s<satirlar.length;s++){
        icerik += '<div style="padding:10px 12px;border-radius:10px;background:rgba(128,128,128,.07);">';
        icerik += '<div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">'+satirlar[s][0]+' '+satirlar[s][1]+'</div>';
        icerik += '<div style="font-size:15px;font-weight:700;">'+satirlar[s][2]+'</div>';
        icerik += '</div>';
      }
      icerik += '</div>';
    }

    // Mevcut anlık veriler (sadece bugün sekmesinde)
    if(idx===0 && veri.current){
      var cb = wmo(veri.current.weather_code);
      icerik += '<div style="margin-top:14px;padding:12px;border-radius:10px;border:1.5px solid var(--border);">';
      icerik += '<div style="font-size:12px;font-weight:700;color:var(--ink-muted);margin-bottom:8px;">ŞU AN</div>';
      icerik += '<div style="display:flex;gap:12px;flex-wrap:wrap;">';
      icerik += '<span>'+cb.e+' <strong>'+Math.round(veri.current.temperature_2m)+'°C</strong></span>';
      if(veri.current.relative_humidity_2m!=null)
        icerik += '<span>💧 <strong>'+veri.current.relative_humidity_2m+'%</strong></span>';
      if(veri.current.wind_speed_10m!=null)
        icerik += '<span>💨 <strong>'+Math.round(veri.current.wind_speed_10m)+' km/s</strong></span>';
      if(veri.current.apparent_temperature!=null)
        icerik += '<span>🌡️ Hissedilen <strong>'+Math.round(veri.current.apparent_temperature)+'°C</strong></span>';
      icerik += '</div></div>';
    }

    if(konum && konum.lat){
      icerik += '<div style="margin-top:14px;font-size:11px;color:var(--ink-muted);text-align:right;">';
      icerik += '📍 '+konum.lat.toFixed(4)+', '+konum.lon.toFixed(4);
      if(sehirAd) icerik += ' — '+sehirAd;
      icerik += '</div>';
    }

    // Modal aç (projenin mevcut modal sistemini kullan)
    var modalTitle = document.getElementById('modalTitle');
    var modalBody  = document.getElementById('modalBody');
    var modalSilBtn = document.getElementById('modalSilBtn');
    var modalKaydetBtn = document.getElementById('modalKaydetBtn');
    var modalOverlay = document.getElementById('modalOverlay');
    if(modalTitle && modalBody && modalOverlay){
      modalTitle.textContent = '🌤️ Hava Durumu Detayları';
      modalBody.innerHTML = icerik;
      if(modalSilBtn)    modalSilBtn.style.display='none';
      if(modalKaydetBtn) modalKaydetBtn.style.display='none';
      modalOverlay.style.display='flex';
      // Kaydet butonunu gizli tut (sadece kapat)
      if(modalKaydetBtn){
        modalKaydetBtn.style.display='none';
        // Vazgeç yerine Kapat yazısı
        var vazgecBtn = modalOverlay.querySelector('.btn-ghost');
        if(vazgecBtn) vazgecBtn.textContent='Kapat';
      }
    } else {
      // Fallback: kendi basit modal
      var m = document.createElement('div');
      m.id = 'havaDetayModal';
      m.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);'
        +'z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
      m.innerHTML = '<div style="background:var(--bg-card,#fff);border-radius:18px;padding:24px;'
        +'max-width:480px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 24px 56px rgba(0,0,0,.3);">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
        +'<h3 style="margin:0;font-size:17px;">🌤️ Hava Durumu Detayları</h3>'
        +'<button onclick="document.getElementById(\'havaDetayModal\').remove()" '
        +'style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--ink-muted);">✕</button>'
        +'</div>'+icerik+'</div>';
      m.addEventListener('click',function(e){if(e.target===m)m.remove();});
      document.body.appendChild(m);
    }

    // Sekme değiştirici global fonksiyon
    window._havaDetaySekme = function(i){
      var eski = document.getElementById('modalOverlay')||document.getElementById('havaDetayModal');
      if(eski) {
        // Modalı kapat ve yeniden aç
        if(eski.id==='modalOverlay') eski.style.display='none';
        else eski.remove();
      }
      detayAc(i);
    };
  }

  /* ── Ters geocoding: koordinat → şehir adı ── */
  function konumAdiniGetir(lat, lon, cb){
    fetch('https://nominatim.openstreetmap.org/reverse?lat='+lat+'&lon='+lon+'&format=json&accept-language=tr')
      .then(function(r){ return r.json(); })
      .then(function(d){
        var a = d.address || {};
        var ilce  = a.town || a.district || a.suburb || a.village || a.county || '';
        var sehir = a.city || a.state || a.province || '';
        cb({ lat:lat, lon:lon, ilce:ilce, sehir:sehir });
      })
      .catch(function(){ cb({ lat:lat, lon:lon, ilce:'', sehir:'' }); });
  }

  /* ── Hava durumu API çağrısı ── */
  function havaDurumuGetir(lat, lon){
    var url = 'https://api.open-meteo.com/v1/forecast'
      + '?latitude='+lat+'&longitude='+lon
      + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min,'
      + 'precipitation_sum,precipitation_probability_max,wind_speed_10m_max,'
      + 'uv_index_max,sunrise,sunset'
      + '&timezone=auto&forecast_days=5';

    fetch(url)
      .then(function(r){
        if(!r.ok) throw new Error('HTTP '+r.status);
        return r.json();
      })
      .then(function(veri){
        if(!veri||!veri.current||!veri.daily) throw new Error('Yanıt biçimi hatalı');
        _sonVeri = veri;
        konumAdiniGetir(lat, lon, function(konum){
          _sonKonum = konum;
          topbarRenderEt(veri.current.weather_code, veri.current.temperature_2m, konum.sehir||konum.ilce);
          kartRenderEt(veri, konum);
          guncelleIkonSifirla();
        });
      })
      .catch(function(err){
        console.warn('Hava durumu alınamadı:', err.message);
        var kart = document.getElementById('havaDurumuKart');
        if(kart) kart.innerHTML = '<div style="color:var(--ink-muted);font-size:13px;padding:8px;">⚠️ Hava durumu verisi alınamadı.</div>';
        guncelleIkonSifirla();
      });
  }

  function guncelleIkonSifirla(){
    _guncelleniyor = false;
    var ikon = document.getElementById('havaGuncelleIkon');
    if(ikon) ikon.style.animation='none';
  }

  /* ── Global fonksiyonlar (HTML onclick kullanımı için) ── */
  window._havaGuncelle = function(){
    if(_guncelleniyor||!_sonKonum) return;
    _guncelleniyor = true;
    var ikon = document.getElementById('havaGuncelleIkon');
    if(ikon) ikon.style.animation='havaDonus 1s linear infinite';
    havaDurumuGetir(_sonKonum.lat, _sonKonum.lon);
  };

  window._havaDetayAc = function(i){ detayAc(i||0); };

  /* ── CSS animasyon ── */
  var stil = document.createElement('style');
  stil.textContent = '@keyframes havaDonus{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
  document.head.appendChild(stil);

  /* ── Başlat ── */
  function konumIsteVeBaslat(){
    if(!('geolocation' in navigator)){
      var kart = document.getElementById('havaDurumuKart');
      if(kart) kart.innerHTML = '<div style="color:var(--ink-muted);font-size:13px;padding:8px;">📍 Bu cihaz konum servisini desteklemiyor.</div>';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function(p){ havaDurumuGetir(p.coords.latitude, p.coords.longitude); },
      function(hata){
        console.warn('Konum izni alınamadı:', hata.message);
        var yukleniyor = document.getElementById('havaDurumuYukleniyor');
        if(yukleniyor){
          yukleniyor.innerHTML = '<span style="font-size:22px;">🚫</span>'
            +'<span>Konum izni verilmedi. Hava durumu gösterilemiyor.</span>';
        }
      },
      { enableHighAccuracy:false, timeout:8000, maximumAge:300000 }
    );
  }

  konumIsteVeBaslat();

})();
