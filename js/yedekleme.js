/* ====================================================================
   js/yedekleme.js
   Tüm verileri (yedekVerisiOlustur() — bkz. app.js) belirli aralıklarla
   otomatik veya elle Google Drive'a JSON olarak yedekler.

   KURULUM GEREKLİ:
   1) https://console.cloud.google.com adresinde bir proje açın (ya da
      mevcut Firebase projenizi kullanın).
   2) "API ve Hizmetler > Kütüphane" kısmından "Google Drive API"yi etkinleştirin.
   3) "API ve Hizmetler > Kimlik Bilgileri > Kimlik Bilgisi Oluştur > OAuth İstemci
      Kimliği" ile "Web uygulaması" türünde bir istemci oluşturun.
      Yetkili JavaScript kaynakları kısmına GitHub Pages adresinizi ekleyin
      (örn: https://kullaniciadi.github.io).
   4) Oluşan İstemci Kimliğini (Client ID) aşağıdaki GOOGLE_CLIENT_ID alanına yapıştırın.
   ==================================================================== */

const GOOGLE_CLIENT_ID = "738103486583-c4r0acm0h4msqn04ntu5dkvgl545jvnt.apps.googleusercontent.com";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_KLASOR_ADI = "Okul Yönetim Paneli Yedekleri";
const YEDEK_ARALIGI_GUN = 7; // otomatik yedekleme sıklığı

let driveTokenClient = null;
let driveErisimTokeni = null;

/* Native Capacitor ortamında mı? */
function _driveIsNative(){
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

/* APK'da Google Drive desteklenmiyor — bölümü gizle */
function driveNativeGizle(){
  if(!_driveIsNative()) return;
  // Drive kartını gizle
  const btn = document.getElementById('driveYedekBtn');
  if(btn){
    const kart = btn.closest('.card');
    if(kart){
      kart.style.display = 'none';
    }
  }
}

function driveYapilandirmaEksikMi(){
  return GOOGLE_CLIENT_ID === "BURAYA_GOOGLE_CLIENT_ID";
}

function driveDurumGuncelle(metin, hata){
  const el = document.getElementById('driveYedekDurum');
  if(el){ el.textContent = metin; el.style.color = hata ? 'var(--danger, #c0392b)' : 'var(--ink-muted)'; }
}

function driveGisHazirla(){
  return new Promise((resolve, reject)=>{
    if(typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2){
      reject(new Error('Google Identity Services yüklenemedi. İnternet bağlantınızı kontrol edin.'));
      return;
    }
    if(driveTokenClient){ resolve(); return; }
    driveTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: ()=>{} // her çağrıda yeniden atanacak
    });
    resolve();
  });
}

function driveErisimIste(){
  return new Promise(async (resolve, reject)=>{
    try{
      await driveGisHazirla();
      driveTokenClient.callback = (yanit)=>{
        if(yanit.error){ reject(new Error(yanit.error)); return; }
        driveErisimTokeni = yanit.access_token;
        resolve(driveErisimTokeni);
      };
      driveTokenClient.requestAccessToken({ prompt: driveErisimTokeni ? '' : 'consent' });
    }catch(e){ reject(e); }
  });
}

async function driveKlasorIdGetir(){
  const arama = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    `name='${DRIVE_KLASOR_ADI}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  )}&fields=files(id,name)`, { headers: { Authorization: `Bearer ${driveErisimTokeni}` } });
  const veri = await arama.json();
  if(veri.files && veri.files.length) return veri.files[0].id;

  const olustur = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${driveErisimTokeni}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: DRIVE_KLASOR_ADI, mimeType: 'application/vnd.google-apps.folder' })
  });
  const yeniKlasor = await olustur.json();
  return yeniKlasor.id;
}

async function driveDosyaYukle(klasorId, dosyaAdi, jsonMetin){
  const sinir = 'oyYedekSinir';
  const metadata = { name: dosyaAdi, parents: [klasorId], mimeType: 'application/json' };
  const govde =
    `--${sinir}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${sinir}\r\nContent-Type: application/json\r\n\r\n${jsonMetin}\r\n--${sinir}--`;

  const yanit = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${driveErisimTokeni}`, 'Content-Type': `multipart/related; boundary=${sinir}` },
    body: govde
  });
  if(!yanit.ok) throw new Error('Drive yükleme hatası: ' + yanit.status);
  return yanit.json();
}

async function driveyeYedekleAt(otomatikMi){
  if(driveYapilandirmaEksikMi()){
    if(!otomatikMi) toast('Google Drive yedekleme henüz yapılandırılmadı. js/yedekleme.js içindeki GOOGLE_CLIENT_ID alanını doldurun.');
    return;
  }
  try{
    driveDurumGuncelle('Drive yetkilendirmesi bekleniyor...');
    await driveErisimIste();
    driveDurumGuncelle('Yedekleniyor...');
    const yedek = yedekVerisiOlustur();
    const dosyaAdi = `okul-yedek-${todayISO()}.json`;
    const klasorId = await driveKlasorIdGetir();
    await driveDosyaYukle(klasorId, dosyaAdi, JSON.stringify(yedek, null, 2));
    localStorage.setItem('oySonDriveYedek', new Date().toISOString());
    driveDurumGuncelle(`Son yedek: ${new Date().toLocaleString('tr-TR')} ✓`);
    if(!otomatikMi) toast('Yedek Google Drive\'a kaydedildi: ' + DRIVE_KLASOR_ADI);
  }catch(e){
    console.error(e);
    driveDurumGuncelle('Yedekleme başarısız: ' + e.message, true);
    if(!otomatikMi) toast('Drive yedekleme hatası: ' + e.message);
  }
}

function driveOtomatikYedekKontrolEt(){
  if(_driveIsNative()) return; // APK'da Drive desteklenmiyor
  if(driveYapilandirmaEksikMi()) return;
  const son = localStorage.getItem('oySonDriveYedek');
  const aradanGecenGun = son ? (Date.now() - new Date(son).getTime()) / 86400000 : Infinity;
  if(aradanGecenGun >= YEDEK_ARALIGI_GUN){
    // Otomatik yedekte kullanıcıdan izin istemeden token isteği gönderilemez
    // (tarayıcı politikası); bu yüzden kullanıcı uygulamayı her açtığında
    // sessizce dener, daha önce bir kez izin verdiyse token'sız çalışır.
    driveyeYedekleAt(true);
  } else {
    const kalan = Math.ceil(YEDEK_ARALIGI_GUN - aradanGecenGun);
    driveDurumGuncelle(son ? `Son yedek: ${new Date(son).toLocaleString('tr-TR')} (sonraki: ${kalan} gün sonra)` : 'Henüz yedeklenmedi');
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  driveNativeGizle(); // APK'da Drive kartını gizle
  const manuelBtn = document.getElementById('driveYedekBtn');
  if(manuelBtn) manuelBtn.addEventListener('click', ()=>driveyeYedekleAt(false));
  setTimeout(driveOtomatikYedekKontrolEt, 4000); // diğer veriler yüklensin diye küçük gecikme
});
