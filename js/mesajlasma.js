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
    const okunmamisMi = okunmayan > 0;
    const sonMetin = k.sonMesaj ? (k.sonMesaj.gonderenUid===ben ? 'Siz: ' : '') + (k.sonMesaj.metin || (k.sonMesaj.dosyaMi ? '📎 Dosya' : '')) : 'Henüz mesaj yok.';
    const saat = k.guncellenmeTarihi ? _mesajSaatYaz(k.guncellenmeTarihi) : '';
    // YENİ: Grup değilse karşı tarafın gerçek profil fotoğrafı (varsa)
    // gösterilir; yoksa (veya grup ise) baş harf/👥 rozetine düşer.
    const digerUid = k.grupMu ? null : Object.keys(k.katilimciAdlari||{}).find(u=>u!==ben);
    const fotoUrl = !k.grupMu && digerUid ? (k.katilimciFotolari && k.katilimciFotolari[digerUid]) : '';
    const avatarIcerik = fotoUrl
      ? `<img src="${fotoUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : (k.grupMu ? '👥' : escapeHtml((baslik[0]||'?').toUpperCase()));
    return `<div class="konusma-karti" onclick="mesajKonusmaAc('${k.id}')">
      <div class="konusma-avatar">${avatarIcerik}</div>
      <div style="flex:1;min-width:0;">
        <div class="konusma-satir-ust">
          <span class="konusma-baslik ${okunmamisMi?'okunmamis':''}">${escapeHtml(baslik)}</span>
          <span class="konusma-saat ${okunmamisMi?'okunmamis':''}">${saat}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
          <span class="konusma-onizleme ${okunmamisMi?'okunmamis':''}">${escapeHtml(sonMetin)}</span>
          ${okunmamisMi ? `<span class="badge badge-red" style="border-radius:999px;flex-shrink:0;">${okunmayan>9?'9+':okunmayan}</span>` : ''}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" style="flex-shrink:0;color:#c0392b;" title="Sohbeti sil" onclick="event.stopPropagation(); mesajKonusmaSil('${k.id}')">🗑️</button>
    </div>`;
  }).join('');
}

function mesajKonusmaSil(konusmaId){
  const k = konusmalar.find(x=>x.id===konusmaId);
  if(!k) return;
  if(!confirm('Bu sohbeti ve içindeki TÜM mesajları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
  MesajlasmaService.konusmaSil(konusmaId, k)
    .then(()=>{
      toast('Sohbet silindi.');
      if(_aktifKonusmaId === konusmaId) detayPanelKapat();
    })
    .catch(err=>{
      if(err.message==='sahip-degil'){ toast('Bu sohbeti silme yetkiniz yok.'); return; }
      if(err.message!=='yetkisiz') toast('Hata: '+err.message);
    });
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
  const avatarEl = document.getElementById('detayAvatar');
  if(avatarEl){
    avatarEl.style.display = 'flex';
    const digerUid = k.grupMu ? null : Object.keys(k.katilimciAdlari||{}).find(u=>u!==ben);
    const fotoUrl = !k.grupMu && digerUid ? (k.katilimciFotolari && k.katilimciFotolari[digerUid]) : '';
    avatarEl.innerHTML = fotoUrl
      ? `<img src="${fotoUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : escapeHtml(k.grupMu ? '👥' : (baslik[0]||'?').toUpperCase());
  }
  const arkaplanBtn = document.getElementById('detayMesajArkaplanBtn');
  if(arkaplanBtn) arkaplanBtn.style.display = '';
}

/* Bir konuşmada, mevcut kullanıcının kendi mesajlarının "okundu" sayılıp
   sayılmayacağını belirler. Mesaj bazlı okunma zaman damgası tutulmuyor
   (veri modeli sadece konuşma bazlı okunmamış SAYACI tutuyor) — bu yüzden
   YAKLAŞIK bir gösterge kullanılıyor: karşı taraf(lar)ın bu konuşmadaki
   okunmamış sayısı 0 ise TÜM mesajlarım okunmuş kabul edilir (✓✓),
   değilse sadece gönderilmiş sayılır (✓). Grup sohbetinde herkes okumuşsa
   ✓✓ gösterilir. */
function _digerlerininTumuOkudumu(k, ben){
  const digerUidler = (k.katilimciUidler || []).filter(u => u !== ben);
  if(!digerUidler.length) return false;
  return digerUidler.every(uid => !(k.okunmayanlar && k.okunmayanlar[uid] > 0));
}

/* Bir ISO tarihi "Bugün" / "Dün" / "3 Temmuz 2026" olarak biçimlendirir —
   tarih ayırıcı rozetlerinde kullanılır. */
function _mesajGunEtiketi(iso){
  if(!iso) return '';
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '';
  const bugun = new Date(); bugun.setHours(0,0,0,0);
  const dun = new Date(bugun); dun.setDate(dun.getDate()-1);
  const gun = new Date(d); gun.setHours(0,0,0,0);
  if(gun.getTime() === bugun.getTime()) return 'Bugün';
  if(gun.getTime() === dun.getTime()) return 'Dün';
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}`;
}

function _mesajlariRenderEt(){
  const body = document.getElementById('detayBody');
  if(!body || !_aktifKonusmaId) return;
  const ben = (typeof AKTIF_KULLANICI !== 'undefined' && AKTIF_KULLANICI) ? AKTIF_KULLANICI.uid : null;
  const k = konusmalar.find(x => x.id === _aktifKonusmaId);
  const herkesOkudMu = k ? _digerlerininTumuOkudumu(k, ben) : false;
  const siralanmis = [...mesajlar].sort((a,b)=>(a.tarih||'').localeCompare(b.tarih||''));

  let sonGunEtiketi = null;
  let akisHtml = '';

  siralanmis.forEach((m, i)=>{
    const gunEtiketi = _mesajGunEtiketi(m.tarih);
    if(gunEtiketi !== sonGunEtiketi){
      akisHtml += `<div class="mesaj-tarih-ayirici"><span>${escapeHtml(gunEtiketi)}</span></div>`;
      sonGunEtiketi = gunEtiketi;
    }

    const kendisiMi = m.gonderenUid === ben;
    const onceki = siralanmis[i-1];
    const sonraki = siralanmis[i+1];
    // Gruplama: bir önceki/sonraki mesaj AYNI gönderenden ve AYNI gün içindeyse
    // araya sıkıştırılır (isim/boşluk sadece grubun ilk mesajında gösterilir).
    const oncekiAyniGrup = onceki && onceki.gonderenUid === m.gonderenUid && _mesajGunEtiketi(onceki.tarih) === gunEtiketi;
    const sonrakiAyniGrup = sonraki && sonraki.gonderenUid === m.gonderenUid && _mesajGunEtiketi(sonraki.tarih) === gunEtiketi;
    const grupSinifi = oncekiAyniGrup ? (sonrakiAyniGrup ? 'grup-orta' : 'grup-son') : (sonrakiAyniGrup ? 'grup-ilk' : '');

    const silinebilirMi = MesajlasmaService.mesajSilinebilirMi(m);
    const yonSinifi = kendisiMi ? 'kendi' : 'karsi';

    const tikHtml = kendisiMi
      ? `<span class="mesaj-tik ${herkesOkudMu?'okundu':''}">${herkesOkudMu?'✓✓':'✓'}</span>`
      : '';

    const icerikHtml = m.dosya
      ? _dosyaBalonuHtml(m.dosya, kendisiMi)
      : `<div class="mesaj-balon-govde ${yonSinifi} ${grupSinifi}">${escapeHtml(m.metin)}</div>`;

    // YENİ: Karşı taraf(lar)ın mesajlarının yanında küçük bir avatar
    // (baş harf rozeti) gösterilir — WhatsApp'taki gibi, özellikle grup
    // sohbetlerinde kimin yazdığını görsel olarak ayırt etmeyi kolaylaştırır.
    // YENİ: Karşı taraf(lar)ın mesajlarının yanında gerçek profil fotoğrafı
    // (varsa) gösterilir — konuşma oluşturulurken damgalanan katilimciFotolari
    // alanından okunur. Fotoğraf yoksa baş harf rozetine düşer.
    const fotoUrl = !kendisiMi && k ? (k.katilimciFotolari && k.katilimciFotolari[m.gonderenUid]) : '';
    const avatarHtml = !kendisiMi
      ? `<div class="mesaj-mini-avatar">${fotoUrl ? `<img src="${fotoUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : escapeHtml(((m.gonderenAdi||'?')[0]||'?').toUpperCase())}</div>`
      : '';

    akisHtml += `<div style="display:flex;flex-direction:column;width:100%;align-items:${kendisiMi?'flex-end':'flex-start'};margin-bottom:${oncekiAyniGrup?'2px':'10px'};">
      ${(!kendisiMi && !oncekiAyniGrup) ? `<div class="mesaj-gonderen-adi" style="color:var(--brand);margin-left:34px;">${escapeHtml(m.gonderenAdi||'')}</div>` : ''}
      <div style="display:flex;align-items:flex-end;gap:6px;max-width:82%;">
        ${(kendisiMi && silinebilirMi) ? `<button class="btn-mesaj-sil" title="Mesajı sil" onclick="mesajTekSil('${m.id}')">🗑️</button>` : ''}
        ${avatarHtml}
        ${icerikHtml}
        ${(!kendisiMi && silinebilirMi) ? `<button class="btn-mesaj-sil" title="Mesajı sil" onclick="mesajTekSil('${m.id}')">🗑️</button>` : ''}
      </div>
      <div class="mesaj-satir-alt" style="${!kendisiMi?'margin-left:34px;':''}">${_mesajSaatYaz(m.tarih)}${tikHtml}</div>
    </div>`;
  });

  const kabarcikHtml = siralanmis.length ? akisHtml : '<p class="empty-state">Henüz mesaj yok — ilk mesajı gönderin.</p>';

  body.innerHTML = `
    <div id="mesajAkisKutusu" class="mesaj-akis-kutusu" style="display:flex;flex-direction:column;min-height:200px;">${kabarcikHtml}</div>
    <div id="mesajYuklemeDurumu" style="display:none;font-size:12px;color:var(--ink-muted);margin-top:6px;"></div>
    <div style="position:sticky;bottom:0;background:var(--bg-card);padding-top:10px;margin-top:10px;">
      <input type="file" id="mesajDosyaInput" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" style="display:none;" onchange="mesajDosyaSecildi(this.files[0]); this.value='';">
      <div id="mesajEmojiPaneli" class="mesaj-emoji-paneli" style="display:none;"></div>
      <div class="mesaj-giris-satiri">
        <button class="mesaj-ek-btn" title="Emoji" onclick="mesajEmojiPaneliAcKapat()">😊</button>
        <button class="mesaj-ek-btn" title="Dosya ekle" onclick="document.getElementById('mesajDosyaInput').click()">📎</button>
        <input id="mesajMetinInput" placeholder="Mesaj yazın…" onkeydown="if(event.key==='Enter'){mesajGonderTikla();}">
        <button class="mesaj-gonder-btn" onclick="mesajGonderTikla()" title="Gönder">➤</button>
      </div>
    </div>`;
  const kutu = document.getElementById('mesajAkisKutusu');
  if(kutu) kutu.scrollIntoView({block:'end'});
  _mesajArkaplanUygula();
}

/* ---------- Kategorili emoji seçici (harici kütüphane gerekmez) ---------- */
const MESAJ_EMOJI_KATEGORILERI = {
  '😊': ['😀','😁','😂','🤣','😊','🙂','😉','😍','🥰','😘','😜','🤪','😎','🤗','🙄','😴','🤔','😅','🥲','😇',
         '😢','😭','😡','🤬','😱','😨','🥶','🤒','🤧','😷','🤢','🥳','😏','😬','🫡','🤭','😳','🥹','😤','🫠'],
  '🖐️': ['👍','👎','👏','🙏','💪','✌️','🤝','👋','🤞','👌','🤟','🤙','👊','✊','🖐️','☝️','👇','👉','👈','🤲'],
  '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️'],
  '🐾': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦋','🐝'],
  '🍕': ['🍎','🍌','🍕','🍔','🍟','🌭','🍿','🍩','🍪','🎂','🍰','🍫','🍭','☕','🍵','🥤','🍉','🍓','🍇','🥐'],
  '⭐': ['✅','❌','⭐','🌟','🔥','💯','⚡','🎉','🎊','📌','📍','⏰','⏳','🎯','🎁','🏆','📢','📝','❗','❓'],
  '🇹🇷': ['🇹🇷','🏫','📚','🎓','✏️','📖','🖊️','🚌','🏆','🎈','🎵','☀️','🌧️','❄️','🌈','🌙','⛄','🌸','🍀','🎄'],
};
let _mesajEmojiAktifKategori = '😊';

function mesajEmojiPaneliAcKapat(){
  const panel = document.getElementById('mesajEmojiPaneli');
  if(!panel) return;
  if(panel.style.display === 'none' || !panel.style.display){
    _mesajEmojiPaneliCiz();
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}
function _mesajEmojiPaneliCiz(){
  const panel = document.getElementById('mesajEmojiPaneli');
  if(!panel) return;
  const sekmelerHtml = Object.keys(MESAJ_EMOJI_KATEGORILERI).map(k=>
    `<button type="button" class="mesaj-emoji-sekme ${k===_mesajEmojiAktifKategori?'aktif':''}" onclick="mesajEmojiKategoriSec('${k}')">${k}</button>`
  ).join('');
  const emojilerHtml = MESAJ_EMOJI_KATEGORILERI[_mesajEmojiAktifKategori].map(e=>
    `<button type="button" class="mesaj-emoji-btn" onclick="mesajEmojiEkle('${e}')">${e}</button>`
  ).join('');
  panel.innerHTML = `
    <div class="mesaj-emoji-sekmeler">${sekmelerHtml}</div>
    <div class="mesaj-emoji-grid">${emojilerHtml}</div>
  `;
}
function mesajEmojiKategoriSec(kategori){
  _mesajEmojiAktifKategori = kategori;
  _mesajEmojiPaneliCiz();
}
function mesajEmojiEkle(emoji){
  const input = document.getElementById('mesajMetinInput');
  if(!input) return;
  input.value += emoji;
  input.focus();
}

/* ---------- Sohbet arka planı seçici ---------- */
const MESAJ_ARKAPLAN_SECENEKLERI = {
  varsayilan: { ad: 'Varsayılan', css: '' },
  yesilDoku: { ad: 'Yeşil Doku', css: 'radial-gradient(circle at 20% 20%, rgba(37,140,110,.08) 0%, transparent 40%), radial-gradient(circle at 80% 60%, rgba(37,140,110,.08) 0%, transparent 40%)' },
  gokyuzu: { ad: 'Gökyüzü', css: 'linear-gradient(180deg, rgba(135,206,250,.15) 0%, transparent 60%)' },
  kum: { ad: 'Kum', css: 'linear-gradient(180deg, rgba(237,201,175,.18) 0%, transparent 60%)' },
  lavanta: { ad: 'Lavanta', css: 'linear-gradient(180deg, rgba(190,170,230,.18) 0%, transparent 60%)' },
  noktali: { ad: 'Noktalı', css: 'radial-gradient(circle, rgba(120,120,120,.15) 1px, transparent 1px)', boyut: '14px 14px' },
};
function _mesajArkaplanOku(){
  try{ return localStorage.getItem('oyMesajArkaplan') || 'varsayilan'; }catch(e){ return 'varsayilan'; }
}
function _mesajArkaplanUygula(){
  const kutu = document.getElementById('mesajAkisKutusu');
  if(!kutu) return;
  const secim = MESAJ_ARKAPLAN_SECENEKLERI[_mesajArkaplanOku()] || MESAJ_ARKAPLAN_SECENEKLERI.varsayilan;
  kutu.style.backgroundImage = secim.css || '';
  kutu.style.backgroundSize = secim.boyut || '';
}
function mesajArkaplanPaneliAc(){
  const secenekler = Object.entries(MESAJ_ARKAPLAN_SECENEKLERI).map(([id, s])=>
    `<button type="button" class="mesaj-arkaplan-secenek ${_mesajArkaplanOku()===id?'aktif':''}" onclick="mesajArkaplanSec('${id}')">
      <span class="mesaj-arkaplan-onizleme" style="background-image:${s.css};background-size:${s.boyut||'auto'};"></span>
      <span>${escapeHtml(s.ad)}</span>
    </button>`
  ).join('');
  modalAc('🎨 Sohbet Arka Planı', `<div class="mesaj-arkaplan-liste">${secenekler}</div>`, null, null, null);
  const kb = document.getElementById('modalKaydetBtn');
  if(kb) kb.style.display = 'none';
}
function mesajArkaplanSec(id){
  try{ localStorage.setItem('oyMesajArkaplan', id); }catch(e){}
  _mesajArkaplanUygula();
  modalKapat();
}

/* Bir dosya ekini balon içinde gösterir: resimse önizleme (tıklayınca
   büyütür), PDF ise gömülü görüntüleyici, Word/Excel ise indirme kartı. */
function _dosyaBalonuHtml(dosya, kendisiMi){
  const boyutMetin = dosya.boyut ? (dosya.boyut/1024/1024).toFixed(1)+' MB' : '';
  if(dosya.gorselMi){
    return `<div style="max-width:220px;">
      <img src="${dosya.url}" alt="${escapeHtml(dosya.ad)}" style="width:100%;border-radius:12px;cursor:pointer;display:block;" onclick="window.open('${dosya.url}','_blank')">
    </div>`;
  }
  if(dosya.tur === 'application/pdf'){
    return `<div style="max-width:280px;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg-card);">
      <iframe src="${dosya.url}" style="width:100%;height:180px;border:none;"></iframe>
      <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;">
        <span style="font-size:18px;">📕</span>
        <div style="flex:1;min-width:0;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(dosya.ad)}</div>
        <a href="${dosya.url}" target="_blank" download="${escapeHtml(dosya.ad)}" class="btn btn-ghost btn-sm">İndir</a>
      </div>
    </div>`;
  }
  // Word / Excel — sadece indirme kartı (tarayıcıda görüntülenemiyor)
  return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:${kendisiMi?'var(--brand)':'var(--nm-bg)'};color:${kendisiMi?'#fff':'var(--ink)'};max-width:240px;">
    <span style="font-size:22px;">${dosya.etiket==='Excel'?'📗':'📘'}</span>
    <div style="flex:1;min-width:0;">
      <div style="font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(dosya.ad)}</div>
      <div style="font-size:10.5px;opacity:.8;">${dosya.etiket}${boyutMetin?' · '+boyutMetin:''}</div>
    </div>
    <a href="${dosya.url}" target="_blank" download="${escapeHtml(dosya.ad)}" style="color:inherit;font-size:18px;">⬇️</a>
  </div>`;
}

function mesajDosyaSecildi(dosya){
  if(!dosya || !_aktifKonusmaId) return;
  const turBilgisi = MesajlasmaService.dosyaTuruBilgisi(dosya.type);
  if(!turBilgisi){ toast('Desteklenmeyen dosya türü. Sadece PDF, Word, Excel ve resim gönderebilirsiniz.'); return; }
  if(dosya.size > MesajlasmaService._MAKS_DOSYA_BOYUTU){ toast('Dosya çok büyük (maks. 10 MB).'); return; }

  const durumEl = document.getElementById('mesajYuklemeDurumu');
  if(durumEl){ durumEl.style.display=''; durumEl.textContent = `${turBilgisi.ikon} ${dosya.name} yükleniyor… %0`; }

  const k = konusmalar.find(x=>x.id===_aktifKonusmaId);
  MesajlasmaService.mesajGonderDosyaIle(_aktifKonusmaId, dosya, k, (yuzde)=>{
    if(durumEl) durumEl.textContent = `${turBilgisi.ikon} ${dosya.name} yükleniyor… %${yuzde}`;
  }).then(()=>{
    if(durumEl) durumEl.style.display='none';
  }).catch(err=>{
    if(durumEl) durumEl.style.display='none';
    if(err.message==='desteklenmeyen-tur'){ toast('Desteklenmeyen dosya türü.'); return; }
    if(err.message==='dosya-cok-buyuk'){ toast('Dosya çok büyük (maks. 10 MB).'); return; }
    if(err.message!=='yetkisiz') toast('Yükleme hatası: '+err.message);
  });
}

function mesajTekSil(mesajId){
  const m = mesajlar.find(x=>x.id===mesajId);
  if(!m) return;
  if(!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;
  MesajlasmaService.mesajSil(m).catch(err=>{
    if(err.message==='sahip-degil'){ toast('Bu mesajı silme yetkiniz yok.'); return; }
    toast('Hata: '+err.message);
  });
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
  const avatarEl = document.getElementById('detayAvatar');
  if(avatarEl){ avatarEl.style.display = 'none'; avatarEl.textContent = ''; }
  const arkaplanBtn = document.getElementById('detayMesajArkaplanBtn');
  if(arkaplanBtn) arkaplanBtn.style.display = 'none';
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
        ${secenekler.map(o=>`<option value="${o.id}" data-ad="${escapeHtml(o.ad+' '+o.soyad)}" data-foto="${escapeHtml(o.profilFotoUrl||'')}">${escapeHtml(o.ad+' '+o.soyad)}</option>`).join('')}
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
    const foto = sel.selectedOptions[0].dataset.foto;
    try{
      const konusmaId = await MesajlasmaService.konusmaBaslatOgretmenIle(ogretmenId, ad, konusmalar, foto);
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
          <input type="checkbox" class="f_grupKatilimci" value="${o.id}" data-ad="${escapeHtml(o.ad+' '+o.soyad)}" data-foto="${escapeHtml(o.profilFotoUrl||'')}">
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
        return uid ? { uid, ad: cb.dataset.ad, foto: cb.dataset.foto } : null;
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
