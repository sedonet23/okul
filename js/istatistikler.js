/* ================================================================
   js/istatistikler.js
   "Kullanıcı İstatistikleri" panelinin render mantığı. Veri kaynağı:
   js/core/services/istatistik.service.js (IstatistikService).
   Sadece admin / kullaniciYonetimi yetkisi olanlar bu sekmeyi görebilir
   (bkz. js/kullanici-yonetimi.js sidebarYetkiUygula).
   ================================================================ */

function _istSureFormat(saniye){
  saniye = saniye || 0;
  const saat = Math.floor(saniye / 3600);
  const dk = Math.floor((saniye % 3600) / 60);
  if(saat > 0) return `${saat} sa ${dk} dk`;
  if(dk > 0) return `${dk} dk`;
  return `${Math.round(saniye)} sn`;
}

function _istTarihFormat(ts){
  if(!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function _istEnCokZiyaretEdilen(sayfaZiyaretleri){
  if(!sayfaZiyaretleri) return '—';
  const girdiler = Object.entries(sayfaZiyaretleri);
  if(!girdiler.length) return '—';
  girdiler.sort((a,b) => b[1] - a[1]);
  const [sayfa, sayi] = girdiler[0];
  return `${sayfa} (${sayi})`;
}

/* YENİ: Bayt değerini okunaklı MB metnine çevirir (depolama sınırları
   özelliği için — bkz. js/core/services/depolama-sinir.service.js). */
function _istMbFormat(bayt){
  if(!bayt) return '0 MB';
  return (bayt / (1024*1024)).toFixed(1) + ' MB';
}

/* Bir kullanıcının 4 kategorideki depolama kullanımını tek satırda,
   kompakt şekilde gösterir. */
function _istDepolamaKullanimHucresi(depolamaKullanimi){
  const d = depolamaKullanimi || {};
  return DEPOLAMA_KATEGORILERI.map(k => {
    const kisaAd = { mesaj:'Mesaj', duyuru:'Duyuru', dokuman:'Dök.', takvim:'Takv.' }[k] || k;
    return `<div style="white-space:nowrap;">${kisaAd}: ${_istMbFormat(d[k])}</div>`;
  }).join('');
}

function istKullaniciMuafDegistir(uid, checkboxEl){
  if(typeof KullaniciYonetimiService === 'undefined') return;
  const yeniDeger = checkboxEl.checked;
  const kendiUid = (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null;
  KullaniciYonetimiService.kullaniciKaydet(uid, { depolamaMuaf: yeniDeger }, kendiUid)
    .then(()=> toast(yeniDeger ? 'Kullanıcı depolama sınırlarından muaf tutuldu.' : 'Muafiyet kaldırıldı.'))
    .catch(err=>{ checkboxEl.checked = !yeniDeger; if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

async function renderIstatistikler(){
  if(typeof kullaniciYonetimiYetkisiVar === 'function' && !kullaniciYonetimiYetkisiVar()){
    toast('Bu sayfayı görüntüleme yetkiniz yok.');
    return;
  }

  const govde = document.getElementById('istatistikTabloGovde');
  const ozetKutu = document.getElementById('istatistikOzetKartlari');
  if(!govde) return;

  try{
    const liste = await IstatistikService.tumIstatistikleriGetir();
    // YENİ: depolamaMuaf bayrağı oy_kullanicilar'da tutulur (istatistik
    // belgesinde değil) — burada tek seferlik ayrı bir okuma ile alınıp
    // uid'e göre eşleniyor.
    let muafHaritasi = {};
    try{
      const kulSnap = await db.collection(COL.kullanicilar).get();
      kulSnap.docs.forEach(d => { muafHaritasi[d.id] = !!d.data().depolamaMuaf; });
    }catch(e){ console.warn('Kullanıcı muafiyet bilgisi alınamadı:', e); }

    if(!liste.length){
      govde.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--ink-muted);padding:20px;">Henüz kayıtlı istatistik yok. Kullanıcılar uygulamayı kullandıkça burada birikecek.</td></tr>';
      if(ozetKutu) ozetKutu.innerHTML = '';
      return;
    }

    // En çok giriş yapan / en çok kullanan kişiye göre büyükten küçüğe sırala.
    liste.sort((a,b) => (b.girisSayisi||0) - (a.girisSayisi||0));

    // Üst özet kartları (toplam kullanıcı, toplam giriş, toplam süre).
    const toplamGiris = liste.reduce((t,k)=>t+(k.girisSayisi||0), 0);
    const toplamSure = liste.reduce((t,k)=>t+(k.toplamSureSaniye||0), 0);
    const toplamDosya = liste.reduce((t,k)=>t+(k.dosyaYuklemeSayisi||0), 0);
    const toplamNot = liste.reduce((t,k)=>t+(k.notEklemeSayisi||0), 0);
    if(ozetKutu){
      ozetKutu.innerHTML = `
        <div class="ist-kart"><div class="ist-kart-deger">${liste.length}</div><div class="ist-kart-etiket">Kayıtlı Kullanıcı</div></div>
        <div class="ist-kart"><div class="ist-kart-deger">${toplamGiris}</div><div class="ist-kart-etiket">Toplam Giriş</div></div>
        <div class="ist-kart"><div class="ist-kart-deger">${_istSureFormat(toplamSure)}</div><div class="ist-kart-etiket">Toplam Kullanım Süresi</div></div>
        <div class="ist-kart"><div class="ist-kart-deger">${toplamDosya}</div><div class="ist-kart-etiket">Toplam Dosya Yükleme</div></div>
        <div class="ist-kart"><div class="ist-kart-deger">${toplamNot}</div><div class="ist-kart-etiket">Toplam Not Ekleme</div></div>
      `;
    }

    govde.innerHTML = liste.map(k => `
      <tr>
        <td><strong>${k.ad || 'Bilinmiyor'}</strong></td>
        <td>${k.girisSayisi || 0}</td>
        <td>${_istTarihFormat(k.sonGiris)}</td>
        <td>${k.dosyaYuklemeSayisi || 0}</td>
        <td>${k.notEklemeSayisi || 0}</td>
        <td>${_istSureFormat(k.toplamSureSaniye)}</td>
        <td>${_istEnCokZiyaretEdilen(k.sayfaZiyaretleri)}</td>
        <td>${_istDepolamaKullanimHucresi(k.depolamaKullanimi)}</td>
        <td style="text-align:center;">
          <label style="display:flex;align-items:center;gap:5px;justify-content:center;white-space:nowrap;cursor:pointer;">
            <input type="checkbox" ${muafHaritasi[k.uid] ? 'checked' : ''} onchange="istKullaniciMuafDegistir('${k.uid}', this)">
            <span style="font-size:11px;color:var(--ink-muted);">Muaf</span>
          </label>
        </td>
      </tr>
    `).join('');

  }catch(e){
    console.error('İstatistikler yüklenemedi:', e);
    govde.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--danger,#d33);padding:20px;">İstatistikler yüklenirken hata oluştu: ' + (e.message||'') + '</td></tr>';
  }
}
