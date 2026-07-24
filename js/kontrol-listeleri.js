/* =============================================================
   js/kontrol-listeleri.js
   KONTROL LİSTELERİ — genel amaçlı, renkli/ikonlu yapılacaklar listesi
   modülü. "Yıl Sonu İşlemleri" ilk örnek liste; admin dilediği kadar
   başka liste ekleyebilir (ör. "Yıl Başı İşlemleri"). Her öğretmen
   kendi tamamlama durumunu işaretler (kimse başkasınınkini göremez/
   değiştiremez); admin ise madde bazında kaç öğretmenin işaretlediğini
   özet olarak görebilir.
   ============================================================= */
let kontrolListeleri = [];         // [{id, ad, aciklama, sira, maddeler:[...]}]
let _klAcikListeId = null;
let _klTamamlanan = new Set();     // açık listede, GİRİŞ YAPAN öğretmenin işaretlediği madde ID'leri
let _klTumTamamlamaAboneligi = null; // admin özet ekranı açıkken aktif dinleyici (kapatılabilsin diye saklanıyor)

/* ================================================================
   SİMGE (İKON) PAKETİ ve RENK PAKETİ — madde ekle/düzenle formlarında
   kullanılan hazır seçim grid'leri.
   ================================================================ */
const KL_IKON_PAKETI = [
  // Ofis & Belgeler
  // 🏠 Genel
    '🏠','🏫','🏢','🏛️','🌐','📍','🧭','🚩','🚀','✨',
    '⭐','🌟','💎','🎯','🧩','🪄','🧠','🤖','💬','📢',


  // 👨‍🎓 Öğrenciler

    '👶','🧒','👧','👦','🧑','👩','👨','🎒','📛','🪪',
    '🙋','🙋‍♀️','🙋‍♂️','🙇','🙇‍♀️','🙇‍♂️','🧑‍🎓','👩‍🎓','👨‍🎓','🧍',

  // 👨‍🏫 Öğretmenler

    '👩‍🏫','👨‍🏫','🧑‍🏫','👩‍💼','👨‍💼','🧑‍💼','🧑‍💻',
    '👩‍💻','👨‍💻','👔','🪪','🎤','📚','📝','💡','🤝',


  // 👥 Personel
  
    '👷','👮','👩‍⚕️','👨‍⚕️','🧑‍⚕️','🧹','🧑‍🔧',
    '👨‍🔧','👩‍🔧','👨‍🍳','👩‍🍳','🛠️','🧰' ,

  // 📚 Eğitim
    '📚','📖','📘','📙','📕','📗','📓','📔','📒',
    '📝','✏️','🖊️','🖋️','📐','📏','🧮','🔢',
    '🎓','🏫','📑','📄',


  // 🧪 Laboratuvar
    '🔬','🧪','⚗️','🧫','🧬','🦠','🌡️',
    '🔭','🪐','🌍','🌎','🌏','⚛️',


  // 💻 Teknoloji
    '💻','🖥️','⌨️','🖱️','📱','📲','☎️',
    '🛜','📡','📶','☁️','🔌','🔋',
    '💾','💿','🖴','🖨️',


  // 📝 Sınav
    '📝','📄','📋','✍️','🖊️','🖋️',
    '📊','📈','📉','💯','🏆','🥇',
    '🏅','🎖️','⭐','🎯',

  // ✅ Yoklama
    '✅','☑️','✔️','❌','⭕','🟢','🔴',
    '🟡','🟠','🟣','⚪','⚫','🚸',

  // 🚌 Servis
    '🚌','🚐','🚏','🛣️','🧭',
    '🗺️','⛽','🚦','🛞','🚗',
  

  // 🍽️ Yemekhane
    '🍽️','🥄','🍴','🥣','🥛','🧃',
    '🍎','🍌','🥪','🍲','🍚','🥗',

  // ⚕️ Sağlık
    '🩺','💊','🩹','❤️','🫀','🧼',
    '🩸','🌡️','🚑','🏥','🧑‍⚕️',

  // 🔒 Güvenlik
    '🔒','🔓','🔑','🗝️','🛡️',
    '🚨','🧯','🔥','📹','🎥',
    '🚧','⚠️','⛔',

  // 💰 Finans
    '💰','💵','💶','💷','💴',
    '💳','🪙','💸','🏦','🧾',

  // 📁 Evrak
    '📁','📂','🗂️','🗃️','🗄️',
    '📄','📃','📑','📰','📜',
    '📎','🖇️','📌',

  // 📢 İletişim
    '📢','📣','📯','🔔','🔕',
    '📨','📩','✉️','📬','📮',
    '📞','☎️','💬','🗨️',

  // 📅 Takvim
    '📅','🗓️','📆','🗒️',
    '⏰','⌛','⏳','🕐','🕑',
    '🕒','🕓','🕔',

  // ⚙️ Yönetim
    '⚙️','🔧','🔨','🪛','🛠️',
    '🧰','🧩','📋','📌','📍',
    '🧭','🏛️',

  // 🏃 Etkinlik
    '🎨','🎭','🎤','🎵','🎼',
    '🎹','🎸','🥁','🎺','🎻',
    '⚽','🏀','🏐','🏓','🎾',
    '🏃','🏋️','🤸','🚴',

  // 📊 İstatistik
    '📊','📈','📉','📋','🧮',
    '🎯','📌','📍','🔍','🔎',

  // 🤖 Yapay Zeka
    '🤖','🧠','✨','💡','🪄',
    '🔮','⚡','🌟','💬','📡'
];
const KL_RENK_PAKETI = ['#1E88E5','#43A047','#FB8C00','#8E24AA','#00897B','#D81B60','#FFB300','#7E57C2', '#1E88E5','#43A047','#FB8C00','#8E24AA','#00897B','#D81B60','#FFB300','#7E57C2',
  '#1976D2','#2196F3','#42A5F5','#00ACC1','#26C6DA','#0097A7','#2E7D32','#4CAF50','#66BB6A','#7CB342','#8BC34A','#9CCC65',
  '#F57C00','#FF9800','#FFA726','#FFC107','#FFD54F','#E53935','#F4511E','#EF5350','#EC407A','#F06292',
  '#9C27B0','#AB47BC','#5E35B1','#3949AB','#3F51B5','#5C6BC0','#009688','#26A69A','#795548','#8D6E63','#546E7A','#607D8B',
  '#78909C','#37474F','#263238','#5E81AC','#00B8D4','#00C853','#64DD17','#FFD600','#FF6D00','#FF1744','#C51162','#651FFF',
  '#304FFE','#00E5FF','#1DE9B6','#AEEA00' ];

function _klSeciciGridHtml(inputId, tip, secili){
  const secenekler = tip==='ikon' ? KL_IKON_PAKETI : KL_RENK_PAKETI;
  const grid = secenekler.map(deger => {
    const aktifMi = deger === secili;
    if (tip==='ikon'){
      return `<button type="button" class="kl-secici-btn" data-inputid="${inputId}" data-tip="ikon" data-deger="${deger}"
        onclick="_klSecimYap(this)"
        style="width:34px;height:34px;font-size:17px;border-radius:8px;border:2px solid ${aktifMi?'var(--brand)':'transparent'};background:${aktifMi?'rgba(0,0,0,0.06)':'transparent'};cursor:pointer;">${deger}</button>`;
    }
    return `<button type="button" class="kl-secici-btn" data-inputid="${inputId}" data-tip="renk" data-deger="${deger}"
      onclick="_klSecimYap(this)"
      style="width:30px;height:30px;border-radius:50%;background:${deger};border:3px solid ${aktifMi?'#000':'transparent'};box-shadow:0 0 0 1px rgba(0,0,0,0.15);cursor:pointer;"></button>`;
  }).join('');
  const ozelSatir = tip==='ikon' ? `
    <div style="display:flex;align-items:center;gap:6px;margin-top:6px;padding-top:6px;border-top:1px solid var(--border-soft);">
      <input id="${inputId}_ozel" type="text" maxlength="2" placeholder="Emoji gir…"
        style="width:60px;height:34px;font-size:20px;text-align:center;border:1px solid var(--border-soft);border-radius:8px;background:var(--bg-card,#fff);">
      <button type="button" onclick="_klOzelEmojiEkle('${inputId}')"
        style="height:34px;padding:0 10px;border-radius:8px;border:1px solid var(--border-soft);background:var(--brand,#1E88E5);color:#fff;font-size:13px;cursor:pointer;">Ekle</button>
      <span style="font-size:11.5px;color:var(--ink-muted);">Listede olmayan bir emoji kullanabilirsin.</span>
    </div>` : '';
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;max-height:160px;overflow-y:auto;padding:6px;border:1px solid var(--border-soft);border-radius:8px;">${grid}</div>${ozelSatir}`;
}
function _klOzelEmojiEkle(inputId){
  const inp = document.getElementById(inputId + '_ozel');
  if (!inp) return;
  const deger = inp.value.trim();
  if (!deger){ toast('Bir emoji gir.'); return; }
  const input = document.getElementById(inputId);
  if (input) input.value = deger;
  const onizleme = document.getElementById(inputId + '_onizleme');
  if (onizleme) onizleme.textContent = deger;
  // grid'deki seçim vurgularını temizle
  const grid = document.querySelector(`[data-inputid="${inputId}"]`)?.parentElement;
  if (grid) Array.from(grid.querySelectorAll('.kl-secici-btn')).forEach(b => {
    b.style.border = '2px solid transparent';
    b.style.background = 'transparent';
  });
  inp.value = '';
  toast('Simge seçildi: ' + deger);
}
function _klSecimYap(btn){
  const inputId = btn.getAttribute('data-inputid');
  const deger = btn.getAttribute('data-deger');
  const input = document.getElementById(inputId);
  if (input) input.value = deger;
  const onizlemeId = inputId + '_onizleme';
  const onizleme = document.getElementById(onizlemeId);
  if (onizleme){
    if (btn.getAttribute('data-tip')==='ikon') onizleme.textContent = deger;
    else onizleme.style.background = deger;
  }
  // aynı grid içindeki diğer butonların aktif görünümünü kaldır
  const grid = btn.parentElement;
  if (grid) Array.from(grid.children).forEach(b => {
    const aktif = b === btn;
    if (b.getAttribute('data-tip')==='ikon'){
      b.style.border = aktif ? '2px solid var(--brand)' : '2px solid transparent';
      b.style.background = aktif ? 'rgba(0,0,0,0.06)' : 'transparent';
    } else {
      b.style.border = aktif ? '3px solid #000' : '3px solid transparent';
    }
  });
}
/* Bağlı Evrak — bir maddeye BİRDEN FAZLA kayıt (ör. birden fazla öğretmen)
   bağlanabilir. Native <select> tek seçime izin verdiği için (Android'de
   radio-liste gibi görünüyordu), checkbox listesine çevrildi. */
function _klBagliKayitSeciciHtml(tip, seciliIdler){
  const kayitlar = tip ? (cizelgeVerileri[tip]||[]) : [];
  if (!kayitlar.length) return '<p style="font-size:12px;color:var(--ink-muted);padding:6px 0;">Bu tipte kayıt bulunamadı.</p>';
  return `<div style="display:flex;flex-direction:column;max-height:220px;overflow-y:auto;border:1px solid var(--border-soft);border-radius:8px;padding:4px 6px;">
    ${kayitlar.map(k=>`
      <label style="display:flex;align-items:center;gap:8px;padding:7px 4px;border-bottom:1px solid var(--border-soft);font-weight:400;">
        <input type="checkbox" class="kl-bagli-kayit-chk" value="${k.id}" onchange="_klBagliKayitDegisti()" ${seciliIdler.includes(k.id)?'checked':''} style="width:18px;height:18px;flex-shrink:0;">
        <span style="flex:1;font-size:13px;">${escapeHtml(_klBagliKayitEtiketi(tip,k))}</span>
      </label>`).join('')}
  </div>`;
}
function _klBagliKayitSeciliIdler(){
  return Array.from(document.querySelectorAll('.kl-bagli-kayit-chk:checked')).map(el=>el.value);
}
function _klMaddeFormBody(mevcutIkon, mevcutRenk, mevcutMetin, mevcutTarih, mevcutHedefTip, mevcutHedefOgretmenIdler, mevcutBagliEvrak){
  const ikon = mevcutIkon || '📌';
  const renk = mevcutRenk || KL_RENK_PAKETI[0];
  const hedefTip = mevcutHedefTip || 'herkes';
  const bgTip = mevcutBagliEvrak ? mevcutBagliEvrak.tip : '';
  // Geriye dönük uyumluluk: eski kayıtlarda tekil "kayitId" vardı.
  const bgKayitIdler = mevcutBagliEvrak ? (mevcutBagliEvrak.kayitIdler || (mevcutBagliEvrak.kayitId ? [mevcutBagliEvrak.kayitId] : [])) : [];
  const bgKontrolIndex = mevcutBagliEvrak ? mevcutBagliEvrak.kontrolIndex : '';
  const bgKayitListesiHtml = bgTip ? _klBagliKayitSeciciHtml(bgTip, bgKayitIdler) : '';
  const bgDonemHtml = bgTip ? (KL_BAGLI_EVRAK_TIPLERI[bgTip].kontrolEtiketleri||[]).map((e,i)=>`<option value="${i}" ${i===bgKontrolIndex?'selected':''}>${escapeHtml(e)}</option>`).join('') : '';
  return `
    <input type="hidden" id="f_klMIkon" value="${ikon}">
    <input type="hidden" id="f_klMRenk" value="${renk}">
    <div class="form-row" style="gap:14px;">
      <div style="flex-shrink:0;text-align:center;">
        <div id="f_klMIkon_onizleme" style="width:44px;height:44px;border-radius:50%;background:rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 4px;">${ikon}</div>
        <div id="f_klMRenk_onizleme" style="width:20px;height:20px;border-radius:50%;background:${renk};margin:0 auto;border:1px solid rgba(0,0,0,0.2);"></div>
      </div>
      <div style="flex:1;">
        <div class="form-group"><label>Simge Seç</label>${_klSeciciGridHtml('f_klMIkon','ikon',ikon)}</div>
      </div>
    </div>
    <div class="form-group"><label>Renk Seç</label>${_klSeciciGridHtml('f_klMRenk','renk',renk)}</div>
    <div class="form-group"><label>Madde Metni</label><textarea id="f_klMMetin" rows="3" placeholder="Yapılacak işin açıklaması">${escapeHtml(mevcutMetin||'')}</textarea></div>

    <div class="form-group"><label>Bağlı Evrak (opsiyonel)</label>
      <select id="f_klMBagliTip" onchange="_klBagliTipDegisti(this)">
        <option value="">— Bağımsız madde (kendi tarihini/hedefini aşağıdan girin) —</option>
        ${Object.entries(KL_BAGLI_EVRAK_TIPLERI).map(([k,v])=>`<option value="${k}" ${k===bgTip?'selected':''}>${v.ad}</option>`).join('')}
      </select>
      <p style="font-size:11px;color:var(--ink-muted);margin-top:4px;">Seçilirse tarih ve tik otomatik o kayıttan alınır — Çizelgeler'den işaretlenince burası da, buradan işaretlenince Çizelgeler de otomatik güncellenir.</p>
    </div>
    <div class="form-group" id="f_klMBagliKayitKutu" style="display:${bgTip?'':'none'};">
      <label>Hangi Kayıt(lar)? <span style="font-weight:400;color:var(--ink-muted);">(birden fazla seçebilirsiniz)</span></label>
      <div id="f_klMBagliKayitListesi">${bgKayitListesiHtml}</div>
    </div>
    <div class="form-group" id="f_klMBagliDonemKutu" style="display:${bgTip?'':'none'};">
      <label>Hangi Dönem / Ay?</label>
      <select id="f_klMBagliKontrolIndex" ${bgKayitIdler.length?'':'disabled'}>
        <option value="">— Seçiniz —</option>${bgDonemHtml}
      </select>
    </div>

    <div id="f_klMBagimsizAlanlar" style="display:${bgTip?'none':''};">
      <div class="form-group"><label>Son Tarih (opsiyonel — hatırlatma sistemine dahil edilir)</label><input type="date" id="f_klMTarih" value="${mevcutTarih||''}"></div>
      <div class="form-group"><label>Bu madde kimi ilgilendiriyor?</label>
        <select id="f_klMHedefTip" onchange="document.getElementById('f_klMHedefOzelKutu').style.display = this.value==='ozel' ? '' : 'none';">
          <option value="herkes" ${hedefTip==='herkes'?'selected':''}>Herkes (tüm öğretmenler)</option>
          <option value="ilkokul" ${hedefTip==='ilkokul'?'selected':''}>Sadece İlkokul öğretmenleri</option>
          <option value="ortaokul" ${hedefTip==='ortaokul'?'selected':''}>Sadece Ortaokul öğretmenleri</option>
          <option value="ozel" ${hedefTip==='ozel'?'selected':''}>Belirli öğretmen(ler)</option>
        </select>
      </div>
      <div id="f_klMHedefOzelKutu" style="display:${hedefTip==='ozel'?'':'none'};">
        ${sorumluOgretmenSeciciHtml(mevcutHedefOgretmenIdler||[], 'f_klMHedefOgr')}
      </div>
    </div>
  `;
}

function kontrolListeleriBaglantisiniKur(){
  KontrolListeleriService.listeleriDinle(v => {
    kontrolListeleri = v;
    if (document.getElementById('kontrolListeleriOverlay')) _klAnaEkraniCiz();
    if (document.getElementById('klDetayOverlay')) _klDetayCiz();
  });
}

/* ================================================================
   ANA EKRAN — Liste Listesi
   ================================================================ */
function kontrolListeleriAc(){
  const ov = document.createElement('div');
  ov.id = 'kontrolListeleriOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9400;background:var(--bg-app);overflow-y:auto;overscroll-behavior:none;';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  const yetkiVar = typeof duzenleyebilir==='function' && duzenleyebilir('kontrolListeleri');
  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-sidebar);color:var(--ink-on-dark);position:sticky;top:0;z-index:2;">
      <button class="btn btn-ghost btn-sm" onclick="kontrolListeleriKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Kapat</button>
      <div style="font-weight:700;font-size:14px;">📋 Kontrol Listeleri</div>
      <div>${yetkiVar ? `<button class="btn btn-ghost btn-sm" onclick="kontrolListesiYeniOlustur()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">➕ Yeni Liste</button>` : ''}</div>
    </div>
    <div id="klAnaGovde" style="padding:16px 16px calc(16px + env(safe-area-inset-bottom, 0px) + 90px);"></div>
  `;
  _klAnaEkraniCiz();
}
function kontrolListeleriKapat(){
  const ov = document.getElementById('kontrolListeleriOverlay');
  if (ov) ov.remove();
  document.body.classList.remove('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
}
function _klAnaEkraniCiz(){
  const govde = document.getElementById('klAnaGovde');
  if (!govde) return;
  const yetkiVar = typeof duzenleyebilir==='function' && duzenleyebilir('kontrolListeleri');
  // YENİ: Taslak (yayinda:false) listeler sadece düzenleme yetkisi olanlara
  // (admin) görünür — diğer kullanıcılara "zamanı gelince" açılana kadar
  // gizli kalır (bkz. _klAyarlarModalAc). Eski kayıtlarda yayinda alanı
  // hiç yoksa (undefined) geriye dönük uyumluluk için YAYINDA sayılır.
  const gorunenListeler = yetkiVar ? kontrolListeleri : kontrolListeleri.filter(l => l.yayinda !== false);

  if (!gorunenListeler.length){
    govde.innerHTML = `<p class="empty-state">Henüz bir kontrol listesi yok.</p>` +
      (yetkiVar ? `<button class="btn btn-amber btn-sm" style="margin-top:10px;" onclick="kontrolListesiOrnekIceAktar()">⇪ "Yıl Sonu İşlemleri" Örneğini İçe Aktar</button>` : '');
    return;
  }
  govde.innerHTML = gorunenListeler.map(l => `
    <div class="card dash-card-clickable" style="margin-bottom:10px;display:flex;align-items:center;gap:10px;" onclick="_klListeyeGit('${l.id}')">
      <span style="font-size:22px;">📋</span>
      <div style="flex:1;"><strong>${escapeHtml(l.ad)}</strong>${(yetkiVar && l.yayinda===false)?' <span class="badge badge-amber">Taslak</span>':''}
        <div style="font-size:12px;color:var(--ink-muted);">${(l.maddeler||[]).length} madde${l.aciklama?' · '+escapeHtml(l.aciklama):''}</div>
      </div>
      ${yetkiVar ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); _klAyarlarModalAc('${l.id}')" title="Liste Ayarları">⚙️</button>` : ''}
      <span style="color:var(--ink-muted);">›</span>
    </div>
  `).join('') + (yetkiVar ? `<button class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="kontrolListesiOrnekIceAktar()">⇪ "Yıl Sonu İşlemleri" Örneğini İçe Aktar</button>` : '');
}
function _klListeyeGit(listeId){
  kontrolListeleriKapat();
  _klDetayAc(listeId);
}

/* ================================================================
   DETAY EKRANI — renkli/ikonlu madde listesi + öğretmenin kendi
   onay kutuları + (admin) madde ekle/sil/sırala + tamamlama özeti.
   ================================================================ */
function _klDetayAc(listeId){
  _klAcikListeId = listeId;
  const liste = kontrolListeleri.find(l=>l.id===listeId);
  if (!liste) { toast('Liste bulunamadı.'); return; }

  const ov = document.createElement('div');
  ov.id = 'klDetayOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9400;background:var(--bg-app);overflow-y:auto;overscroll-behavior:none;';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(false);

  const yetkiVar = typeof duzenleyebilir==='function' && duzenleyebilir('kontrolListeleri');
  ov.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-sidebar);color:var(--ink-on-dark);position:sticky;top:0;z-index:2;gap:6px;">
      <button class="btn btn-ghost btn-sm" onclick="_klDetayKapat()" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">← Geri</button>
      <div id="klDetayBaslik" style="font-weight:700;font-size:13px;flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(liste.ad)}</div>
      <button class="btn btn-ghost btn-sm" onclick="_klYazdir('${listeId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="Yazdır">🖨️</button>
      ${yetkiVar ? `
        <button class="btn btn-ghost btn-sm" onclick="_klOzetGosterModalAc('${listeId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="Tamamlama özeti">📊</button>
        <button class="btn btn-ghost btn-sm" onclick="_klAyarlarModalAc('${listeId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;" title="Liste Ayarları (tarih/görünürlük)">⚙️</button>
        <button class="btn btn-ghost btn-sm" onclick="_klMaddeEkleModalAc('${listeId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;font-weight:700;">➕</button>
        <button class="btn btn-ghost btn-sm" onclick="_klListeSilOnay('${listeId}')" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.40);color:#fff;">🗑️</button>
      ` : ''}
    </div>
    <div id="klDetayOzet" style="padding:10px 16px 0;"></div>
    <div id="klDetayGovde" style="padding:12px 16px calc(24px + env(safe-area-inset-bottom, 0px) + 90px);"></div>
  `;

  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  if (ben){
    KontrolListeleriService.tamamlamaGetir(ben.id, listeId).then(doc => {
      _klTamamlanan = new Set((doc.exists && doc.data().tamamlananMaddeIdler) || []);
      _klDetayCiz();
    }).catch(()=>{ _klTamamlanan = new Set(); _klDetayCiz(); });
  } else {
    _klTamamlanan = new Set();
    _klDetayCiz();
  }
}
function _klDetayKapat(geriDonme){
  const ov = document.getElementById('klDetayOverlay');
  if (ov) ov.remove();
  _klAcikListeId = null;
  document.body.classList.remove('modal-open');
  if (typeof _pullToRefreshAyarla === 'function') _pullToRefreshAyarla(true);
  if (geriDonme !== false) kontrolListeleriAc(); // liste-listesi ekranına dön (sadece kullanıcı "Geri" derse)
}
/* YENİ: Her maddenin kendi hedef kitlesi olabilir — Herkes / İlkokul /
   Ortaokul / Belirli Öğretmenler (bkz. _klMaddeFormBody). Admin (yetkiVar)
   yönetebilmek için HER ZAMAN tüm maddeleri görür; sıradan bir öğretmen
   ise sadece kendisini ilgilendiren maddeleri görür/işaretleyebilir. */
function _klMaddeHedefEtiketi(m){
  if(!m.hedefTip || m.hedefTip==='herkes') return '';
  if(m.hedefTip==='ilkokul') return '🧒 İlkokul';
  if(m.hedefTip==='ortaokul') return '🎓 Ortaokul';
  if(m.hedefTip==='ozel') return '👤 ' + (typeof _ogretmenAdlari==='function' ? _ogretmenAdlari(m.hedefOgretmenIdler||[]) : 'Belirli Öğretmenler');
  return '';
}
function _klMaddeBenimleIlgiliMi(m){
  if(m.baglıEvrak){
    // Geriye dönük uyumluluk: eski kayıtlarda tekil "kayitId" vardı.
    const kayitIdler = m.baglıEvrak.kayitIdler || (m.baglıEvrak.kayitId ? [m.baglıEvrak.kayitId] : []);
    const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
    if(!ben) return true;
    return kayitIdler.some(kayitId => {
      const kayit = (cizelgeVerileri[m.baglıEvrak.tip]||[]).find(k=>k.id===kayitId);
      return _klBagliKayitOgretmenIdleri(m.baglıEvrak.tip, kayit).includes(ben.id);
    });
  }
  if(!m.hedefTip || m.hedefTip==='herkes') return true;
  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  if(!ben) return true; // öğretmen bağlantısı olmayan hesaplar (yönetici vb.) kısıtlanmaz
  if(m.hedefTip==='ilkokul') return typeof kademeFiiliListesi==='function' && kademeFiiliListesi(ben).includes('ilkokul');
  if(m.hedefTip==='ortaokul') return typeof kademeFiiliListesi==='function' && kademeFiiliListesi(ben).includes('ortaokul');
  if(m.hedefTip==='ozel') return (m.hedefOgretmenIdler||[]).includes(ben.id);
  return true;
}

/* Bir maddeyi ekranda/yazdırmada gösterilecek SATIRLARA açar. Bağımsız
   maddede tek satır döner; bağlı maddede kayitIdler'deki HER kayıt için
   ayrı bir satır döner (her kaydın kendi tamamlanma/tarih/öğretmen bilgisi
   ile) — böylece aynı madde birden fazla öğretmene bağlanabilir. */
function _klMaddeSatirlariUret(m){
  if(m.baglıEvrak){
    const tip = m.baglıEvrak.tip;
    const kontrolIndex = m.baglıEvrak.kontrolIndex;
    // Geriye dönük uyumluluk: eski kayıtlarda tekil "kayitId" vardı.
    const kayitIdler = m.baglıEvrak.kayitIdler || (m.baglıEvrak.kayitId ? [m.baglıEvrak.kayitId] : []);
    return kayitIdler.map(kayitId => {
      const kayit = (cizelgeVerileri[tip]||[]).find(k=>k.id===kayitId);
      return {
        kayitId,
        tamamMi: _klBagliEvrakTamamMi(tip, kayit, kontrolIndex),
        tarih: _klBagliEvrakTarihi(tip, kayit, kontrolIndex),
        ogretmenIdleri: _klBagliKayitOgretmenIdleri(tip, kayit),
        etiket: `🔗 ${KL_BAGLI_EVRAK_TIPLERI[tip].ad} — ${_klBagliKayitEtiketi(tip, kayit)} (${(KL_BAGLI_EVRAK_TIPLERI[tip].kontrolEtiketleri||[])[kontrolIndex]||''})`,
      };
    });
  }
  return [{ kayitId:null, tamamMi:_klTamamlanan.has(m.id), tarih:m.tarih, ogretmenIdleri:null, etiket:'' }];
}
function _klDetayCiz(){
  const liste = kontrolListeleri.find(l=>l.id===_klAcikListeId);
  const govde = document.getElementById('klDetayGovde');
  const ozetEl = document.getElementById('klDetayOzet');
  if (!liste || !govde) return;
  const yetkiVar = typeof duzenleyebilir==='function' && duzenleyebilir('kontrolListeleri');
  const baslikEl = document.getElementById('klDetayBaslik');
  if(baslikEl) baslikEl.textContent = liste.ad; // liste adı Ayarlar'dan değiştirilmiş olabilir — üstteki başlık da tazelenir
  const tumMaddeler = (liste.maddeler||[]).slice().sort((a,b)=>a.sira-b.sira);
  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;

  // Her maddeyi (bağlıysa kayıt başına) satırlara aç; admin hepsini görür,
  // sıradan öğretmen sadece kendisiyle ilgili satırları görür.
  const satirlar = [];
  tumMaddeler.forEach(m => {
    _klMaddeSatirlariUret(m).forEach(s => {
      let ilgiliMi;
      if (m.baglıEvrak) ilgiliMi = yetkiVar ? true : (!ben ? true : (s.ogretmenIdleri||[]).includes(ben.id));
      else ilgiliMi = yetkiVar ? true : _klMaddeBenimleIlgiliMi(m);
      if (ilgiliMi) satirlar.push({ madde:m, ...s });
    });
  });

  if (ozetEl){
    const toplam = satirlar.length;
    const tamam = satirlar.filter(s=>s.tamamMi).length;
    ozetEl.innerHTML = toplam ? `<div style="font-size:12.5px;font-weight:700;color:var(--brand);">${tamam} / ${toplam} tamamlandı</div>` : '';
  }

  if(!satirlar.length){
    govde.innerHTML = '<p class="empty-state">Bu listede sizinle ilgili bir madde yok.</p>';
    return;
  }

  const gosterilenMaddeIdler = new Set();
  govde.innerHTML = satirlar.map((s,i) => {
    const m = s.madde;
    const gecikmisMi = !s.tamamMi && s.tarih && new Date(s.tarih) < new Date(todayISO());
    const hedefEtiketi = yetkiVar ? _klMaddeHedefEtiketi(m) : '';
    // Aynı maddenin (bağlıysa) birden çok satırı olabilir — düzenle/sil
    // butonları maddenin TÜMÜNÜ etkilediği için sadece ilk satırda gösterilir.
    const ilkGosterim = !gosterilenMaddeIdler.has(m.id);
    gosterilenMaddeIdler.add(m.id);
    const kayitIdParam = s.kayitId ? `,'${s.kayitId}'` : '';
    return `
    <div class="card" style="display:flex;align-items:center;gap:12px;margin-bottom:10px;border-left:5px solid ${m.renk||'var(--brand)'};${s.tamamMi?'opacity:.55;':''}">
      <div style="width:36px;height:36px;border-radius:50%;background:${m.renk||'var(--brand)'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0;">${i+1}</div>
      <div style="font-size:22px;flex-shrink:0;">${m.ikon||'📌'}</div>
      <div style="flex:1;font-size:13.5px;line-height:1.4;${s.tamamMi?'text-decoration:line-through;':''}">
        ${escapeHtml(m.metin||'')}
        ${s.tarih ? `<div style="font-size:11px;margin-top:2px;${gecikmisMi?'color:var(--red-danger,#dc2626);font-weight:700;':'color:var(--ink-muted);'}">📅 Son Tarih: ${formatTarih(s.tarih)}${gecikmisMi?' (gecikti)':''}</div>` : ''}
        ${hedefEtiketi ? `<div style="font-size:11px;margin-top:2px;color:var(--brand);">${hedefEtiketi}</div>` : ''}
        ${(yetkiVar && s.etiket) ? `<div style="font-size:11px;margin-top:2px;color:var(--brand);">${escapeHtml(s.etiket)}</div>` : ''}
      </div>
      <label style="flex-shrink:0;display:flex;align-items:center;">
        <input type="checkbox" ${s.tamamMi?'checked':''} onchange="_klMaddeIsaretle('${m.id}', this.checked${kayitIdParam})" style="width:22px;height:22px;accent-color:var(--brand);">
      </label>
      ${(yetkiVar && ilkGosterim) ? `<button class="btn btn-ghost btn-sm" onclick="_klMaddeDuzenleModalAc('${liste.id}','${m.id}')" style="flex-shrink:0;color:var(--brand);padding:4px 8px;" title="Düzenle">✏️</button>` : ''}
      ${(yetkiVar && ilkGosterim) ? `<button class="btn btn-ghost btn-sm" onclick="_klMaddeSilOnay('${liste.id}','${m.id}')" style="flex-shrink:0;color:#c0392b;padding:4px 8px;" title="Sil">✕</button>` : ''}
    </div>`;
  }).join('') || '<p class="empty-state">Bu listede henüz madde yok.</p>';
}
function _klMaddeIsaretle(maddeId, isaretli, kayitId){
  const liste = kontrolListeleri.find(l=>l.id===_klAcikListeId);
  const madde = liste && (liste.maddeler||[]).find(m=>m.id===maddeId);
  if(madde && madde.baglıEvrak){
    // Bağlı madde: gerçek kaynak Çizelgeler'deki kayıt — burada YAZILMAZ,
    // doğrudan o kaydın kontrolü güncellenir (tek gerçek kaynak). Madde
    // birden fazla kayda bağlıysa, o satırın kendi kayitId'si kullanılır.
    _klBagliEvrakToggle(madde.baglıEvrak.tip, kayitId, madde.baglıEvrak.kontrolIndex, isaretli)
      .then(()=>_klDetayCiz())
      .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); _klDetayCiz(); });
    return;
  }
  const ben = (typeof bagliOgretmenimGetir==='function') ? bagliOgretmenimGetir() : null;
  if (!ben) return;
  if (isaretli) _klTamamlanan.add(maddeId); else _klTamamlanan.delete(maddeId);
  KontrolListeleriService.tamamlamaKaydet(ben.id, _klAcikListeId, Array.from(_klTamamlanan))
    .catch(err => { if (err.message!=='yetkisiz') toast('Hata: '+err.message); });
  _klDetayCiz();
}

/* ================================================================
   YAZDIRMA — liste, A4 dikey formatta okul adı başlığıyla yazdırılır.
   Diğer modüllerdeki ortak yazdırma alt yapısı (_raporOverlayOlustur +
   uygulamaHtmlYazdir) kullanılıyor: önizleme overlay'i iframe(srcdoc)
   ile açılır, "Yazdır" tuşuna basınca native (Android/Capacitor) ise
   PrintPlugin, değilse tarayıcı blob penceresi + window.print() devreye
   girer — böylece hem Android hem web'de çalışır.
   ================================================================ */
function _klYazdir(listeId){
  const liste = kontrolListeleri.find(l=>l.id===listeId);
  if (!liste) { toast('Liste bulunamadı.'); return; }
  if (typeof _raporOverlayOlustur !== 'function'){ toast('Yazdırma bileşeni yüklenemedi.'); return; }

  const okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi)
    ? okulBilgileriAyari.okulAdi : 'Koruk İlk-Ortaokulu';
  const tarih = new Date().toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'});
  const maddeler = (liste.maddeler||[]).slice().sort((a,b)=>a.sira-b.sira);
  // Bağlı maddeler (kayıt başına) satıra açılır — böylece birden fazla
  // kayda bağlı bir madde de gerçek tamamlanma durumuyla yazdırılır.
  const satirVerileri = [];
  maddeler.forEach(m => _klMaddeSatirlariUret(m).forEach(s => satirVerileri.push({ madde:m, ...s })));
  const toplam = satirVerileri.length;
  const tamam = satirVerileri.filter(s=>s.tamamMi).length;

  const satirlar = satirVerileri.map((s,i) => {
    const m = s.madde;
    const ekEtiket = s.etiket ? ` <small style="color:#777;">— ${escapeHtml(s.etiket.replace(/^🔗\s*/,''))}</small>` : '';
    return `
      <div class="kl-yzd-satir" style="border-left-color:${m.renk||'#0A7A7A'};">
        <span class="kl-yzd-no">${i+1}</span>
        <span class="kl-yzd-ikon">${m.ikon||'📌'}</span>
        <span class="kl-yzd-metin${s.tamamMi?' tamam':''}">${escapeHtml(m.metin||'')}${ekEtiket}</span>
        <span class="kl-yzd-kutu">${s.tamamMi?'☑':'☐'}</span>
      </div>`;
  }).join('') || '<p style="color:#777;">Bu listede henüz madde yok.</p>';

  const html = `<!DOCTYPE html><html lang="tr"><head>
    <meta charset="UTF-8">
    <title>${escapeHtml(liste.ad)}</title>
    <style>
      @page{ size:A4 portrait; margin:16mm 14mm; }
      *{box-sizing:border-box;}
      body{font-family:'Segoe UI',Arial,sans-serif;font-size:12.5px;color:#111;margin:0;padding:20px;}
      h1{font-size:17px;margin:0 0 2px;text-align:center;}
      .kl-yzd-alt{font-size:11.5px;color:#555;text-align:center;margin-bottom:4px;}
      .kl-yzd-ozet{font-size:12px;font-weight:700;color:#0A7A7A;text-align:center;margin-bottom:16px;}
      .kl-yzd-satir{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #ddd;border-left-width:5px;border-left-style:solid;border-radius:4px;margin-bottom:8px;break-inside:avoid;}
      .kl-yzd-no{width:22px;height:22px;border-radius:50%;background:#0A7A7A;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
      .kl-yzd-ikon{font-size:16px;flex-shrink:0;}
      .kl-yzd-metin{flex:1;line-height:1.4;}
      .kl-yzd-metin.tamam{text-decoration:line-through;color:#777;}
      .kl-yzd-kutu{font-size:18px;flex-shrink:0;}
      @media print{ body{padding:0;} }
    </style>
  </head><body>
    <h1>${escapeHtml(okulAdi)}</h1>
    <div class="kl-yzd-alt">${escapeHtml(liste.ad)}${liste.aciklama?' · '+escapeHtml(liste.aciklama):''} · ${tarih}</div>
    ${toplam ? `<div class="kl-yzd-ozet">${tamam} / ${toplam} tamamlandı</div>` : ''}
    ${satirlar}
  </body></html>`;

  _raporOverlayOlustur(liste.ad, html);
}

/* ================================================================
   ADMİN — Liste ve Madde Yönetimi
   ================================================================ */
function _klMaddeIdUret(){ return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function kontrolListesiYeniOlustur(){
  const body = `<div class="form-group"><label>Liste Adı</label><input id="f_klAd" placeholder="örn: Yıl Başı İşlemleri"></div>
    <div class="form-group"><label>Açıklama (opsiyonel)</label><input id="f_klAciklama" placeholder="kısa açıklama"></div>
    <div class="form-group"><label style="display:flex;align-items:center;gap:8px;font-weight:400;"><input type="checkbox" id="f_klYayinda"> Diğer kullanıcılara hemen aç (işaretlemezseniz taslak olarak kalır, sadece siz görürsünüz — istediğiniz zaman "Ayarlar"dan açabilirsiniz)</label></div>`;
  modalAc('➕ Yeni Kontrol Listesi', body, () => {
    const ad = document.getElementById('f_klAd').value.trim();
    if (!ad){ toast('Liste adı zorunludur.'); return; }
    KontrolListeleriService.listeEkle({
      ad, aciklama: document.getElementById('f_klAciklama').value.trim(),
      yayinda: document.getElementById('f_klYayinda').checked,
      sira: kontrolListeleri.length, maddeler: [],
    }).then(()=>toast('Liste oluşturuldu.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  });
}
/* YENİ: Liste oluşturulduktan sonra açıklama/görünürlük değiştirmek için.
   DÜZELTME: Tarih alanları artık LİSTE seviyesinde değil — her MADDENİN
   kendi "Son Tarih" alanı var (bkz. _klMaddeFormBody), Sedat'ın isteğiyle
   buradan kaldırıldı. */
function _klAyarlarModalAc(listeId){
  const liste = kontrolListeleri.find(l=>l.id===listeId);
  if(!liste) return;
  const body = `
    <div class="form-group"><label>Liste Adı</label><input id="f_klAd2" value="${escapeHtml(liste.ad||'')}"></div>
    <div class="form-group"><label>Açıklama</label><input id="f_klAciklama2" value="${escapeHtml(liste.aciklama||'')}"></div>
    <div class="form-group"><label style="display:flex;align-items:center;gap:8px;font-weight:400;"><input type="checkbox" id="f_klYayinda2" ${liste.yayinda?'checked':''}> Diğer kullanıcılara açık (kapatırsanız sadece siz görürsünüz — taslağa döner)</label></div>`;
  modalAc('⚙️ Liste Ayarları', body, () => {
    const ad = document.getElementById('f_klAd2').value.trim();
    if(!ad){ toast('Liste adı zorunludur.'); return; }
    KontrolListeleriService.listeGuncelle(listeId, {
      ad,
      aciklama: document.getElementById('f_klAciklama2').value.trim(),
      yayinda: document.getElementById('f_klYayinda2').checked,
    }).then(()=>toast('Kaydedildi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  });
}
function kontrolListesiOrnekIceAktar(){
  if (typeof KONTROL_LISTESI_TOHUM_VERI === 'undefined'){ toast('Tohum veri dosyası bulunamadı.'); return; }
  if (kontrolListeleri.some(l=>l.ad === KONTROL_LISTESI_TOHUM_VERI.ad)){ toast('Bu liste zaten eklenmiş.'); return; }
  const maddeler = KONTROL_LISTESI_TOHUM_VERI.maddeler.map((m,i) => ({ id:_klMaddeIdUret(), sira:i, ikon:m.ikon, renk:m.renk, metin:m.metin }));
  KontrolListeleriService.listeEkle({
    ad: KONTROL_LISTESI_TOHUM_VERI.ad, aciklama: KONTROL_LISTESI_TOHUM_VERI.aciklama,
    sira: kontrolListeleri.length, maddeler,
  }).then(()=>toast('"Yıl Sonu İşlemleri" listesi eklendi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}
/* ================================================================
   BAĞLI EVRAK — YENİ: bir kontrol listesi maddesi, Çizelgeler modülündeki
   gerçek bir kayda (Zümre/ŞÖK/Yıllık-BEP/Sosyal Kulüp/Rehberlik/Maarif)
   bağlanabilir. Bağlı bir maddenin tarihi ve tamamlanma durumu KENDİ
   alanlarından DEĞİL, doğrudan bağlı olduğu kayıttan okunur — tek bir
   gerçek kaynak (single source of truth): öğretmen ister Kontrol
   Listesi'nden ister Zümre/ŞÖK ekranından işaretlesin, ikisi de aynı
   kayda yazdığı için otomatik senkron olur, aynı işi iki kere
   tiklemeye gerek kalmaz.
   ================================================================ */
const KL_BAGLI_EVRAK_TIPLERI = {
  zumre:          { ad:'Zümre',              kontrolEtiketleri: ['1. Dönem','2. Dönem','Yıl Sonu'] },
  sok:            { ad:'ŞÖK',                kontrolEtiketleri: ['1. Dönem','2. Dönem','Yıl Sonu'] },
  bepPlani:       { ad:'Yıllık / BEP Planı', kontrolEtiketleri: (typeof BEP_KONTROLLER!=='undefined'?BEP_KONTROLLER:['Yıllık Ders Planı','BEP Planı']) },
  sosyalKulupler: { ad:'Sosyal Kulüp',       kontrolEtiketleri: (typeof KULUP_KONTROLLER!=='undefined'?KULUP_KONTROLLER:[]) },
  rehberlik:      { ad:'Rehberlik',          kontrolEtiketleri: (typeof REHBERLIK_KONTROLLER!=='undefined'?REHBERLIK_KONTROLLER:[]) },
  maarifRapor:    { ad:'Maarif Model',       kontrolEtiketleri: (typeof MAARIF_KONTROLLER!=='undefined'?MAARIF_KONTROLLER:[]) },
};
function _klBagliKayitEtiketi(tip, kayit){
  if(!kayit) return '(silinmiş kayıt)';
  const ogAdi = kayit.ogretmenId && typeof _ogretmenAdi==='function' ? _ogretmenAdi(kayit.ogretmenId) : '';
  if(tip==='sosyalKulupler') return kayit.ad || '(isimsiz kulüp)';
  if(tip==='zumre') return `${ogAdi}${kayit.brans?' — '+kayit.brans:''}${kayit.sinif?' ('+kayit.sinif+')':''}`;
  if(tip==='sok') return `${ogAdi}${kayit.sinif?' — '+kayit.sinif:''}`;
  if(tip==='bepPlani') return `${ogAdi}${kayit.brans?' — '+kayit.brans:''}${kayit.sinif?' ('+kayit.sinif+')':''}`;
  if(tip==='rehberlik'||tip==='maarifRapor') return `${ogAdi}${kayit.sinif?' ('+kayit.sinif+')':''}`;
  return kayit.id;
}
function _klBagliKayitOgretmenIdleri(tip, kayit){
  if(!kayit) return [];
  if(tip==='sosyalKulupler') return kayit.ogretmenIdler||[];
  return kayit.ogretmenId ? [kayit.ogretmenId] : [];
}
/* Bağlı bir maddenin ilgili kontrol index'ine denk gelen SON TARİHİNİ
   hesaplar: dönem/tek-seferlik alanlar varsa doğrudan oradan, aylık
   kontroller içinse otomatik ay hesaplamasına düşer (bkz. js/hatirlatmalar.js
   _htOtomatikAyTarihi — Eylül raporu Ekim'in ilk haftasında gibi). */
function _klBagliEvrakTarihi(tip, kayit, kontrolIndex){
  if(!kayit) return null;
  const otomatikAy = (ayKisaAdi) => (typeof _htOtomatikAyTarihi==='function') ? _htOtomatikAyTarihi(ayKisaAdi) : null;
  if(tip==='zumre'||tip==='sok') return kayit['tarih'+(kontrolIndex+1)] || null;
  if(tip==='bepPlani') return kontrolIndex===0 ? (kayit.yillikDersPlaniTarihi||null) : (kayit.bepPlaniTarihi||null);
  if(tip==='sosyalKulupler'){
    if(kontrolIndex===0) return kayit.yillikPlanTarihi||null;
    if(kontrolIndex===1) return kayit.toplumHizmetiTarihi||null;
    if(kontrolIndex>=2 && kontrolIndex<=10) return otomatikAy(['Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'][kontrolIndex-2]);
    return null; // Sene Sonu Rap. (index 11) — otomatik tarihi yok
  }
  if(tip==='rehberlik'){
    if(kontrolIndex===0) return kayit.yillikPlanTarihi||null;
    if(kontrolIndex>=1 && kontrolIndex<=9) return otomatikAy(['Eki','Kas','Ara','Oca','Şub','Mar','Nis','May','Haz'][kontrolIndex-1]);
    return null;
  }
  if(tip==='maarifRapor') return otomatikAy((typeof MAARIF_KONTROLLER!=='undefined'?MAARIF_KONTROLLER:[])[kontrolIndex]);
  return null;
}
/* Bağlı maddenin tamamlanma durumu — gerçek kaydın kendi kontrolleri. */
function _klBagliEvrakTamamMi(tip, kayit, kontrolIndex){
  return !!(kayit && (kayit.kontroller||[])[kontrolIndex]);
}
/* Bağlı maddeyi işaretlemek = gerçek kaydın kontrolünü güncellemek. */
function _klBagliEvrakToggle(tip, kayitId, kontrolIndex, deger){
  const kayit = (cizelgeVerileri[tip]||[]).find(k=>k.id===kayitId);
  if(!kayit) return Promise.reject(new Error('Bağlı kayıt bulunamadı (silinmiş olabilir).'));
  const kontroller = (kayit.kontroller||[]).slice();
  while(kontroller.length <= kontrolIndex) kontroller.push(false);
  kontroller[kontrolIndex] = deger;
  return CizelgelerService.kontrolToggle(tip, kayitId, kontroller);
}
/* Form içindeki bağımlı seçiciler (tip → kayıt → dönem/ay) — kaskad. */
function _klBagliTipDegisti(selectEl){
  const tip = selectEl.value;
  const kayitKutu = document.getElementById('f_klMBagliKayitKutu');
  const donemKutu = document.getElementById('f_klMBagliDonemKutu');
  const bagimsizAlanlar = document.getElementById('f_klMBagimsizAlanlar');
  const kayitListesi = document.getElementById('f_klMBagliKayitListesi');
  const donemSelect = document.getElementById('f_klMBagliKontrolIndex');
  if(!tip){
    if(kayitKutu) kayitKutu.style.display='none';
    if(donemKutu) donemKutu.style.display='none';
    if(bagimsizAlanlar) bagimsizAlanlar.style.display='';
    return;
  }
  if(kayitKutu) kayitKutu.style.display='';
  if(donemKutu) donemKutu.style.display='';
  if(bagimsizAlanlar) bagimsizAlanlar.style.display='none';
  if(kayitListesi) kayitListesi.innerHTML = _klBagliKayitSeciciHtml(tip, []);
  if(donemSelect){
    donemSelect.disabled = true;
    donemSelect.innerHTML = '<option value="">— Önce kayıt seçin —</option>';
  }
}
/* Checkbox listesindeki HERHANGİ bir kayıt işaretlenip kaldırıldığında
   tetiklenir (bkz. _klBagliKayitSeciciHtml). En az bir kayıt seçiliyse
   dönem/ay seçiciyi açar, mevcut seçimi korumaya çalışır. */
function _klBagliKayitDegisti(){
  const tip = document.getElementById('f_klMBagliTip').value;
  const donemSelect = document.getElementById('f_klMBagliKontrolIndex');
  if(!donemSelect) return;
  const seciliVarMi = _klBagliKayitSeciliIdler().length > 0;
  if(!seciliVarMi){
    donemSelect.disabled = true;
    donemSelect.innerHTML = '<option value="">— Önce kayıt seçin —</option>';
    return;
  }
  const mevcutDeger = donemSelect.value;
  const etiketler = (KL_BAGLI_EVRAK_TIPLERI[tip]||{}).kontrolEtiketleri || [];
  donemSelect.disabled = false;
  donemSelect.innerHTML = '<option value="">— Seçiniz —</option>' + etiketler.map((e,i)=>`<option value="${i}" ${String(i)===mevcutDeger?'selected':''}>${escapeHtml(e)}</option>`).join('');
}
function _klListeSilOnay(listeId){
  const liste = kontrolListeleri.find(l=>l.id===listeId);
  if (!liste) return;
  if (!confirm(`"${liste.ad}" listesini SİLMEK istediğinize emin misiniz? Tüm maddeler ve öğretmen işaretlemeleri kaybolur.`)) return;
  KontrolListeleriService.listeSil(listeId)
    .then(()=>{ toast('Silindi.'); _klDetayKapat(); })
    .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}
function _klMaddeEkleModalAc(listeId){
  const body = _klMaddeFormBody('📌', KL_RENK_PAKETI[0], '', '', 'herkes', [], null);
  modalAc('➕ Yeni Madde', body, () => {
    const metin = document.getElementById('f_klMMetin').value.trim();
    if (!metin){ toast('Madde metni zorunludur.'); return; }
    const bgTip = document.getElementById('f_klMBagliTip').value;
    let baglıEvrak = null;
    if(bgTip){
      const bgKayitIdler = _klBagliKayitSeciliIdler();
      const bgDonem = document.getElementById('f_klMBagliKontrolIndex').value;
      if(!bgKayitIdler.length || bgDonem===''){ toast('Bağlı evrak için en az bir kayıt ve dönem/ay seçmelisiniz.'); return; }
      baglıEvrak = { tip:bgTip, kayitIdler:bgKayitIdler, kontrolIndex:parseInt(bgDonem) };
    }
    const liste = kontrolListeleri.find(l=>l.id===listeId);
    const maddeler = (liste.maddeler||[]).slice();
    maddeler.push({
      id:_klMaddeIdUret(), sira:maddeler.length, ikon:document.getElementById('f_klMIkon').value.trim()||'📌',
      renk:document.getElementById('f_klMRenk').value, metin,
      tarih: baglıEvrak ? null : (document.getElementById('f_klMTarih').value||null),
      hedefTip: baglıEvrak ? 'herkes' : document.getElementById('f_klMHedefTip').value,
      hedefOgretmenIdler: baglıEvrak ? [] : _sorumluOgretmenSecili('f_klMHedefOgr'),
      baglıEvrak,
    });
    KontrolListeleriService.listeGuncelle(listeId, { maddeler })
      .then(()=>toast('Madde eklendi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  });
}
function _klMaddeDuzenleModalAc(listeId, maddeId){
  const liste = kontrolListeleri.find(l=>l.id===listeId);
  if (!liste) return;
  const madde = (liste.maddeler||[]).find(m=>m.id===maddeId);
  if (!madde) return;
  const body = _klMaddeFormBody(madde.ikon, madde.renk, madde.metin, madde.tarih, madde.hedefTip, madde.hedefOgretmenIdler, madde.baglıEvrak);
  modalAc('✏️ Maddeyi Düzenle', body, () => {
    const metin = document.getElementById('f_klMMetin').value.trim();
    if (!metin){ toast('Madde metni zorunludur.'); return; }
    const ikon = document.getElementById('f_klMIkon').value.trim()||'📌';
    const renk = document.getElementById('f_klMRenk').value;
    const bgTip = document.getElementById('f_klMBagliTip').value;
    let baglıEvrak = null;
    if(bgTip){
      const bgKayitIdler = _klBagliKayitSeciliIdler();
      const bgDonem = document.getElementById('f_klMBagliKontrolIndex').value;
      if(!bgKayitIdler.length || bgDonem===''){ toast('Bağlı evrak için en az bir kayıt ve dönem/ay seçmelisiniz.'); return; }
      baglıEvrak = { tip:bgTip, kayitIdler:bgKayitIdler, kontrolIndex:parseInt(bgDonem) };
    }
    const tarih = baglıEvrak ? null : (document.getElementById('f_klMTarih').value||null);
    const hedefTip = baglıEvrak ? 'herkes' : document.getElementById('f_klMHedefTip').value;
    const hedefOgretmenIdler = baglıEvrak ? [] : _sorumluOgretmenSecili('f_klMHedefOgr');
    const maddeler = (liste.maddeler||[]).map(m => m.id===maddeId ? { ...m, ikon, renk, metin, tarih, hedefTip, hedefOgretmenIdler, baglıEvrak } : m);
    KontrolListeleriService.listeGuncelle(listeId, { maddeler })
      .then(()=>toast('Madde güncellendi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  });
}
function _klMaddeSilOnay(listeId, maddeId){
  if (!confirm('Bu maddeyi silmek istediğinize emin misiniz?')) return;
  const liste = kontrolListeleri.find(l=>l.id===listeId);
  if (!liste) return;
  const maddeler = (liste.maddeler||[]).filter(m=>m.id!==maddeId).map((m,i)=>({...m, sira:i}));
  KontrolListeleriService.listeGuncelle(listeId, { maddeler })
    .then(()=>toast('Silindi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

/* ---- Admin özeti: madde başına kaç öğretmen işaretlemiş ---- */
function _klOzetGosterModalAc(listeId){
  const liste = kontrolListeleri.find(l=>l.id===listeId);
  if (!liste) return;
  modalAc('📊 Tamamlama Özeti', '<p class="empty-state">Yükleniyor…</p>', null, null);
  document.getElementById('modalKaydetBtn').style.display = 'none';
  if (_klTumTamamlamaAboneligi) { _klTumTamamlamaAboneligi(); _klTumTamamlamaAboneligi = null; }
  _klTumTamamlamaAboneligi = KontrolListeleriService.tumTamamlamalariDinle(listeId, (kayitlar) => {
    const body = document.getElementById('modalBody');
    if (!body) return;
    const maddeler = (liste.maddeler||[]).slice().sort((a,b)=>a.sira-b.sira);
    const sayaclar = {};
    maddeler.forEach(m => sayaclar[m.id] = 0);
    kayitlar.forEach(k => (k.tamamlananMaddeIdler||[]).forEach(id => { if (sayaclar[id]!==undefined) sayaclar[id]++; }));
    body.innerHTML = `
      <p style="font-size:11.5px;color:var(--ink-muted);margin-bottom:8px;">${kayitlar.length} öğretmen bu listeyle ilgili en az bir madde işaretlemiş.</p>
      ${maddeler.map((m,i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-soft);">
          <span style="font-size:16px;">${m.ikon||'📌'}</span>
          <span style="flex:1;font-size:12.5px;">${i+1}. ${escapeHtml((m.metin||'').slice(0,50))}${(m.metin||'').length>50?'…':''}</span>
          <span style="font-weight:700;color:var(--brand);font-size:12.5px;">${sayaclar[m.id]||0}</span>
        </div>`).join('')}
    `;
  });
}
