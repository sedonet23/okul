/* ====================================================================
   js/mesajlasma.js
   MESAJLAŞMA MODÜLÜ — UI KATMANI (v1 — MVP)
   1-1 ve grup metin mesajlaşması. Konuşma listesi bu sekmede, mesaj
   akışı paylaşılan detay panelinde (#detayOverlay) açılır.

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya)          → sadece DOM + MesajlasmaService çağrısı, db bilmez
     js/core/services/mesajlasma.service.js    → iş kuralı + yetki kontrolü
     js/core/repositories/mesajlasma.repository.js → TEK Firestore erişim noktası

   NOT (v1 sınırları — bilinçli MVP kapsamı):
   - Dosya/görsel eki yok, sadece metin.
   - "Yazıyor…" göstergesi ve okundu-bildirimi (mavi tik) yok — sadece
     konuşma listesinde okunmamış SAYISI var.
   - Mesaj silme/düzenleme yok.
   ==================================================================== */

let konusmalar = [];
let mesajlar = [];
let _aktifKonusmaId = null;
let _mesajDinleyiciKaldir = null;
let _sonBilinenMesajTarihleri = {}; // konusmaId -> son görülen sonMesaj.tarih (yeni mesaj algılamak için)
let _mesajBaloncukIlkYuklemeAtlandi = false; // sayfa ilk açıldığında zaten var olan mesajlar için baloncuk göstermesin

/* ---------- Firestore bağlantısı (app.js baglantilariKur içinden çağrılır) ---------- */
function mesajlasmaBaglantilariKur(){
  if(!gorebilir('mesajlasma')) return;
  const uid = (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null;
  if(!uid) return;
  MesajlasmaRepository.konusmalariDinle(uid, v=>{
    _yeniMesajVarMiKontrolEt(v, uid);
    konusmalar = v;
    renderKonusmaListesi();
    if(typeof renderMesajRozeti === 'function') renderMesajRozeti();
    if(_aktifKonusmaId){
      const guncel = konusmalar.find(k=>k.id===_aktifKonusmaId);
      if(guncel) _mesajBasligiGuncelle(guncel);
    }
  });
}

/* Önceki durumla karşılaştırıp YENİ gelen (kendi göndermediğimiz, şu an
   açık olmayan bir konuşmadaki) mesajları tespit eder ve baloncuk gösterir.
   İlk yüklemede (uygulama daha yeni açıldığında) baloncuk göstermez —
   sadece bundan SONRA gelen gerçek yeni mesajlarda tetiklenir. */
function _yeniMesajVarMiKontrolEt(yeniKonusmalar, benUid){
  if(!_mesajBaloncukIlkYuklemeAtlandi){
    yeniKonusmalar.forEach(k=>{ if(k.sonMesaj) _sonBilinenMesajTarihleri[k.id] = k.sonMesaj.tarih; });
    _mesajBaloncukIlkYuklemeAtlandi = true;
    return;
  }
  yeniKonusmalar.forEach(k=>{
    if(!k.sonMesaj) return;
    const oncekiTarih = _sonBilinenMesajTarihleri[k.id];
    const yeniMi = k.sonMesaj.tarih !== oncekiTarih;
    _sonBilinenMesajTarihleri[k.id] = k.sonMesaj.tarih;
    if(!yeniMi) return;
    if(k.sonMesaj.gonderenUid === benUid) return; // kendi mesajımız
    if(_aktifKonusmaId === k.id) return; // zaten bu konuşmayı açık okuyor
    const baslik = k.grupMu ? (k.grupAdi || 'Grup') : (k.katilimciAdlari?.[k.sonMesaj.gonderenUid] || 'Yeni mesaj');
    mesajBaloncuguGoster(k.id, baslik, k.sonMesaj.metin);
  });
}

let _mesajBaloncukZamanlayici = null;
let _mesajBaloncukKonusmaId = null;
function mesajBaloncuguGoster(konusmaId, baslik, metin){
  const el = document.getElementById('mesajBaloncugu');
  if(!el) return;
  _mesajBaloncukKonusmaId = konusmaId;
  document.getElementById('mesajBaloncukAvatar').textContent = (baslik[0]||'💬').toUpperCase();
  document.getElementById('mesajBaloncukBaslik').textContent = baslik;
  document.getElementById('mesajBaloncukMetin').textContent = metin;
  el.style.display = 'flex';
  if(_mesajBaloncukZamanlayici) clearTimeout(_mesajBaloncukZamanlayici);
  _mesajBaloncukZamanlayici = setTimeout(mesajBaloncuguKapat, 6000);
}
function mesajBaloncuguKapat(){
  const el = document.getElementById('mesajBaloncugu');
  if(el) el.style.display = 'none';
  if(_mesajBaloncukZamanlayici){ clearTimeout(_mesajBaloncukZamanlayici); _mesajBaloncukZamanlayici = null; }
}
function mesajBaloncuguTiklandi(){
  const konusmaId = _mesajBaloncukKonusmaId;
  mesajBaloncuguKapat();
  if(konusmaId){ sekmeAc('mesajlasma'); setTimeout(()=>mesajKonusmaAc(konusmaId), 150); }
}


/* Bildirim çanı / alt menüde toplam okunmamış mesaj sayısı gösterir. */
function renderMesajRozeti(){
  const rozet = document.getElementById('mesajRozeti');
  if(!rozet) return;
  const toplam = MesajlasmaService.toplamOkunmayan(konusmalar);
  rozet.textContent = toplam > 9 ? '9+' : String(toplam);
  rozet.style.display = toplam > 0 ? '' : 'none';
}

/* ---------- Konuşma listesi ---------- */
function renderKonusmaListesi(){
  const hedef = document.getElementById('mesajKonusmaListesi');
  if(!hedef) return;
  const ben = (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null;
  const siralanmis = [...konusmalar].sort((a,b)=>(b.guncellenmeTarihi||'').localeCompare(a.guncellenmeTarihi||''));
  if(!siralanmis.length){
    hedef.innerHTML = '<p class="empty-state">Henüz bir konuşmanız yok. "+ Yeni Mesaj" ile başlayın.</p>';
    return;
  }
  hedef.innerHTML = siralanmis.map(k=>{
    const baslik = k.grupMu ? (k.grupAdi || 'Grup') : Object.entries(k.katilimciAdlari||{}).find(([uid])=>uid!==ben)?.[1] || 'Kullanıcı';
    const okunmayan = (k.okunmayanlar && k.okunmayanlar[ben]) || 0;
    const sonMetin = k.sonMesaj ? (k.sonMesaj.gonderenUid===ben ? 'Siz: ' : '') + k.sonMesaj.metin : 'Henüz mesaj yok.';
    return `<div class="card dash-card-clickable" style="margin-bottom:8px;display:flex;align-items:center;gap:10px;" onclick="mesajKonusmaAc('${k.id}')">
      <div style="width:40px;height:40px;border-radius:50%;background:var(--brand-light);color:var(--brand);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">${k.grupMu?'👥':escapeHtml((baslik[0]||'?').toUpperCase())}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;${okunmayan?'':''}">${escapeHtml(baslik)}</div>
        <div style="font-size:12.5px;color:var(--ink-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(sonMetin)}</div>
      </div>
      ${okunmayan ? `<span class="badge badge-red" style="border-radius:999px;flex-shrink:0;">${okunmayan>9?'9+':okunmayan}</span>` : ''}
    </div>`;
  }).join('');
}

/* ---------- Mesaj akışı (paylaşılan detay panelinde açılır) ---------- */
function mesajKonusmaAc(konusmaId){
  const k = konusmalar.find(x=>x.id===konusmaId);
  if(!k) return;
  _aktifKonusmaId = konusmaId;

  document.getElementById('detayDuzenleBtn').style.display = 'none';
  document.getElementById('detayRaporBtn').style.display = 'none';
  _mesajBasligiGuncelle(k);

  if(_mesajDinleyiciKaldir) _mesajDinleyiciKaldir();
  _mesajDinleyiciKaldir = MesajlasmaRepository.mesajlariDinle(konusmaId, v=>{
    mesajlar = v;
    _mesajlariRenderEt();
    if(typeof saltOkumaDetayUygula === 'function') saltOkumaDetayUygula('mesajlasma');
  });

  MesajlasmaService.okunduIsaretle(konusmaId, k).catch(()=>{});

  document.getElementById('detayOverlay').classList.add('active');
  document.body.classList.add('modal-open');
}

function _mesajBasligiGuncelle(k){
  const ben = (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null;
  const baslik = k.grupMu ? (k.grupAdi || 'Grup') : Object.entries(k.katilimciAdlari||{}).find(([uid])=>uid!==ben)?.[1] || 'Kullanıcı';
  document.getElementById('detayBaslik').textContent = baslik;
  document.getElementById('detayAltBaslik').textContent = k.grupMu ? `${(k.katilimciUidler||[]).length} kişi` : '';
}

function _mesajlariRenderEt(){
  const body = document.getElementById('detayBody');
  if(!body || !_aktifKonusmaId) return;
  const ben = (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null;
  const siralanmis = [...mesajlar].sort((a,b)=>(a.tarih||'').localeCompare(b.tarih||''));
  const kabarcikHtml = siralanmis.length
    ? siralanmis.map(m=>{
        const kendisiMi = m.gonderenUid === ben;
        return `<div style="display:flex;flex-direction:column;align-items:${kendisiMi?'flex-end':'flex-start'};margin-bottom:8px;">
          ${!kendisiMi ? `<div style="font-size:11px;color:var(--ink-muted);margin-bottom:2px;">${escapeHtml(m.gonderenAdi||'')}</div>` : ''}
          <div style="max-width:78%;padding:8px 12px;border-radius:14px;background:${kendisiMi?'var(--brand)':'var(--nm-bg)'};color:${kendisiMi?'#fff':'var(--ink)'};font-size:14px;white-space:pre-wrap;word-break:break-word;">${escapeHtml(m.metin)}</div>
          <div style="font-size:10px;color:var(--ink-muted);margin-top:2px;">${_mesajSaatYaz(m.tarih)}</div>
        </div>`;
      }).join('')
    : '<p class="empty-state">Henüz mesaj yok — ilk mesajı gönderin.</p>';

  body.innerHTML = `
    <div id="mesajAkisKutusu" style="display:flex;flex-direction:column;min-height:200px;">${kabarcikHtml}</div>
    <div style="position:sticky;bottom:0;background:var(--bg-card);padding-top:10px;margin-top:10px;border-top:1px solid var(--border);display:flex;gap:8px;">
      <input id="mesajMetinInput" placeholder="Mesaj yazın…" style="flex:1;" onkeydown="if(event.key==='Enter'){mesajGonderTikla();}">
      <button class="btn btn-primary btn-sm" onclick="mesajGonderTikla()">Gönder</button>
    </div>`;
  const kutu = document.getElementById('mesajAkisKutusu');
  if(kutu) kutu.scrollIntoView({block:'end'});
}

function _mesajSaatYaz(iso){
  if(!iso) return '';
  const d = new Date(iso);
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}

function mesajGonderTikla(){
  const input = document.getElementById('mesajMetinInput');
  if(!input || !_aktifKonusmaId) return;
  const metin = input.value;
  const k = konusmalar.find(x=>x.id===_aktifKonusmaId);
  input.value = '';
  MesajlasmaService.mesajGonder(_aktifKonusmaId, metin, k).catch(err=>{
    if(err.message==='mesaj-bos') return;
    if(err.message!=='yetkisiz') toast('Hata: '+err.message);
  });
}

/* Detay paneli kapanınca mesaj dinleyicisini de durdur (bkz. app.js detayPanelKapat
   fonksiyonu zaten overlay'i kapatıyor — burada sadece dinleyici temizliği yapılır). */
function _mesajPaneliTemizle(){
  if(_mesajDinleyiciKaldir){ _mesajDinleyiciKaldir(); _mesajDinleyiciKaldir = null; }
  _aktifKonusmaId = null;
  document.getElementById('detayDuzenleBtn').style.display = '';
  document.getElementById('detayRaporBtn').style.display = '';
}

/* ---------- Yeni mesaj / yeni grup ---------- */
function yeniKonusmaModalAc(){
  const ben = (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null;
  const bagliOgretmen = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
  const secenekler = (typeof ogretmenler !== 'undefined' ? ogretmenler : [])
    .filter(o => !bagliOgretmen || o.id !== bagliOgretmen.id)
    .sort((a,b)=>`${a.ad} ${a.soyad}`.localeCompare(`${b.ad} ${b.soyad}`,'tr'));

  const body = `
    <div class="form-group">
      <label>Kiminle mesajlaşmak istiyorsunuz?</label>
      <select id="f_mesajKisi" style="width:100%;">
        <option value="">Öğretmen seçiniz…</option>
        ${secenekler.map(o=>`<option value="${o.id}" data-ad="${escapeHtml(o.ad+' '+o.soyad)}">${escapeHtml(o.ad+' '+o.soyad)}</option>`).join('')}
      </select>
    </div>
    <div style="font-size:12px;color:var(--ink-muted);margin-top:8px;">Not: Seçilen kişinin uygulamaya en az bir kez giriş yapmış olması gerekir.</div>
    <button type="button" class="btn btn-ghost btn-sm" style="margin-top:14px;" onclick="modalKapat(); grupOlusturModalAc();">👥 Bunun yerine grup oluştur</button>
  `;
  modalAc('+ Yeni Mesaj', body, async ()=>{
    const sel = document.getElementById('f_mesajKisi');
    const ogretmenId = sel.value;
    if(!ogretmenId){ toast('Bir kişi seçin.'); return; }
    const ad = sel.selectedOptions[0].dataset.ad;
    try{
      const konusmaId = await MesajlasmaService.konusmaBaslatOgretmenIle(ogretmenId, ad, konusmalar);
      modalKapat();
      setTimeout(()=>mesajKonusmaAc(konusmaId), 150);
    }catch(err){
      if(err.message==='hesap-yok'){ toast('Bu öğretmenin henüz uygulamaya bağlı bir hesabı yok.'); return; }
      if(err.message==='kendine-mesaj'){ toast('Kendinize mesaj gönderemezsiniz.'); return; }
      if(err.message!=='yetkisiz') toast('Hata: '+err.message);
    }
  }, null);
}

function grupOlusturModalAc(){
  const bagliOgretmen = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
  const secenekler = (typeof ogretmenler !== 'undefined' ? ogretmenler : [])
    .filter(o => !bagliOgretmen || o.id !== bagliOgretmen.id)
    .sort((a,b)=>`${a.ad} ${a.soyad}`.localeCompare(`${b.ad} ${b.soyad}`,'tr'));

  const body = `
    <div class="form-group"><label>Grup Adı</label><input id="f_grupAdi" placeholder="örn: 5/A Sınıf Öğretmenleri" style="width:100%;"></div>
    <div class="form-group">
      <label>Katılımcılar</label>
      <div style="max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;padding:8px;">
        ${secenekler.map(o=>`<label style="display:flex;align-items:center;gap:8px;padding:6px 4px;">
          <input type="checkbox" class="f_grupKatilimci" value="${o.id}" data-ad="${escapeHtml(o.ad+' '+o.soyad)}">
          ${escapeHtml(o.ad+' '+o.soyad)}
        </label>`).join('')}
      </div>
    </div>
  `;
  modalAc('👥 Grup Oluştur', body, async ()=>{
    const grupAdi = document.getElementById('f_grupAdi').value.trim();
    const secililer = Array.from(document.querySelectorAll('.f_grupKatilimci:checked'));
    if(!grupAdi){ toast('Grup adı zorunludur.'); return; }
    if(!secililer.length){ toast('En az bir katılımcı seçin.'); return; }
    try{
      const uidCozumleri = await Promise.all(secililer.map(async cb=>{
        const uid = await MesajlasmaService._ogretmenUidBul(cb.value);
        return uid ? { uid, ad: cb.dataset.ad } : null;
      }));
      const gecerliler = uidCozumleri.filter(Boolean);
      const eksik = secililer.length - gecerliler.length;
      if(!gecerliler.length){ toast('Seçilen kişilerin hiçbirinin uygulamaya bağlı bir hesabı yok.'); return; }
      const konusmaId = await MesajlasmaService.grupOlustur(grupAdi, gecerliler);
      modalKapat();
      if(eksik) toast(`${eksik} kişi hesabı olmadığı için gruba eklenemedi.`);
      setTimeout(()=>mesajKonusmaAc(konusmaId), 150);
    }catch(err){
      if(err.message!=='yetkisiz') toast('Hata: '+err.message);
    }
  }, null);
}
