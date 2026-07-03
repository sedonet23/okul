/* ====================================================================
   js/periyodik.js
   PERİYODİK İŞLER — UI KATMANI — okul taşıma, ek ders, puantaj, işkur
   gibi her ay tekrarlayan idari işler. İş türleri tamamen serbest
   (kullanıcı kendi oluşturur). Her kayıt: iş adı + başlangıç/bitiş tarihi
   + tamamlandı tiki + opsiyonel not. Liste, bitiş (yoksa başlangıç)
   tarihinin ay/yılına göre gruplanır. Bitiş tarihi yaklaşınca/geçince
   check-and-notify.js üzerinden push bildirimi gönderilir.

   Katmanlı mimari: bkz. docs/Pragmatik-Mimari-Tasarimi.md §2
     UI (bu dosya)          → sadece DOM + PeriyodikService çağrısı, db bilmez
     js/core/services/periyodik.service.js    → iş kuralı + yetki kontrolü
     js/core/repositories/periyodik.repository.js → TEK Firestore erişim noktası
   ==================================================================== */

let periyodikIsler = [];
let periyodikSablonu = [];

/* Sedat'ın okulda her ay tekrarlayan rutin işleri — kullanıcı bunları
   "Şablonu Düzenle" ile istediği gibi değiştirebilir/silebilir/ekleyebilir.
   Gün sayıları ayın kaçıncı günü olduğunu belirtir (ör. 1-5 = ayın ilk 5 günü). */
const PERIYODIK_SABLON_VARSAYILAN = [
  { isAdi:'Personel Puantaj İşlemleri', baslangicGun:1,  bitisGun:5  },
  { isAdi:'Ek Ders İşlemleri',          baslangicGun:1,  bitisGun:10 },
  { isAdi:'İŞKUR İşlemleri',            baslangicGun:1,  bitisGun:7  },
  { isAdi:'Maaş Değişiklikleri',        baslangicGun:15, bitisGun:20 },
  { isAdi:'Taşıma İşlemleri',           baslangicGun:1,  bitisGun:3  },
  { isAdi:'Nöbet İşlemleri',            baslangicGun:25, bitisGun:30 },
];

/* not: gün→ISO tarih dönüşümü artık PeriyodikService._gunToISO() içinde (buAyinGorevleriniOlustur akışı) */

function periyodikGrupAnahtari(p){
  const t = p.bitis || p.baslangic;
  if(!t) return '9999-99';
  return t.slice(0,7); // 'YYYY-MM'
}
function periyodikGrupEtiketi(anahtar){
  if(anahtar==='9999-99') return 'TARİHSİZ';
  const [y,m] = anahtar.split('-');
  return `${AYLAR[parseInt(m)-1]} ${y}`;
}

function renderPeriyodikIsler(){
  const hedef = document.getElementById('periyodikIslerListesi');
  if(!hedef) return;
  if(periyodikIsler.length===0){
    hedef.innerHTML = '<div class="empty-state">Henüz periyodik iş eklenmedi. "+ Yeni İş" ile okul taşıma, ek ders, puantaj, İŞKUR gibi tekrarlayan işlerini ekleyebilirsin.</div>';
    return;
  }
  const gruplar = {};
  periyodikIsler.forEach(p=>{
    const k = periyodikGrupAnahtari(p);
    (gruplar[k]=gruplar[k]||[]).push(p);
  });
  const anahtarlar = Object.keys(gruplar).sort();
  let html = '';
  anahtarlar.forEach(k=>{
    html += `<div class="bgh-ay-baslik">${escapeHtml(periyodikGrupEtiketi(k))}</div>`;
    gruplar[k].sort((a,b)=>(a.baslangic||'').localeCompare(b.baslangic||'')).forEach(p=>{
      const bugun = todayISO();
      const gecikmis = !p.tamamlandi && p.bitis && p.bitis < bugun;
      html += `<div class="bgh-row">
        <div class="cz-check ${p.tamamlandi?'on':''}" onclick="periyodikToggle('${p.id}',${!p.tamamlandi})">${p.tamamlandi?'✓':''}</div>
        <div class="bgh-main">
          <div class="bgh-title">${escapeHtml(p.isAdi)} ${gecikmis?'<span class="badge badge-brick">Gecikti</span>':''}</div>
          <div class="bgh-meta">${formatTarih(p.baslangic)} – ${formatTarih(p.bitis)}${p.not?' · '+escapeHtml(p.not):''}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="periyodikModalAc('${p.id}')">Düzenle</button>
      </div>`;
    });
  });
  hedef.innerHTML = html;
}

function periyodikToggle(id, deger){
  PeriyodikService.tamamlandiGuncelle(id, deger).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
}

function periyodikModalAc(id){
  const p = id ? periyodikIsler.find(x=>x.id===id) : null;
  const turler = [...new Set(periyodikIsler.map(x=>x.isAdi).filter(Boolean))];
  const body = `
    <div class="form-group"><label>İş Adı</label>
      <input id="f_pIsAdi" list="periyodikTurListesi" value="${p?escapeHtml(p.isAdi):''}" placeholder="örn: Okul Taşıma İşlemleri">
      <datalist id="periyodikTurListesi">${turler.map(t=>`<option value="${escapeHtml(t)}">`).join('')}</datalist>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Başlangıç</label><input type="date" id="f_pBaslangic" value="${p?p.baslangic||'':todayISO()}"></div>
      <div class="form-group"><label>Bitiş</label><input type="date" id="f_pBitis" value="${p?p.bitis||'':''}"></div>
    </div>
    <div class="form-group"><label>Not (opsiyonel)</label><textarea id="f_pNot" rows="2">${p?escapeHtml(p.not||''):''}</textarea></div>
    ${p?'<p style="font-size:11.8px;color:var(--ink-muted);">Bitiş tarihini değiştirirseniz push bildirimi tekrar gönderim için sıfırlanır.</p>':''}
  `;
  modalAc(p?'Periyodik İşi Düzenle':'Yeni Periyodik İş', body, ()=>{
    const isAdi = document.getElementById('f_pIsAdi').value.trim();
    const baslangic = document.getElementById('f_pBaslangic').value;
    if(!isAdi || !baslangic){ toast('İş adı ve başlangıç tarihi zorunludur.'); return; }
    const bitis = document.getElementById('f_pBitis').value;
    const bitisDegisti = p && (p.bitis||'') !== bitis;
    PeriyodikService.isKaydet(p?p.id:null, {
      isAdi, baslangic, bitis,
      not: document.getElementById('f_pNot').value.trim(),
      tamamlandi: p ? !!p.tamamlandi : false,
      bildirimGonderildi: p ? (bitisDegisti ? false : !!p.bildirimGonderildi) : false
    }).then(()=>toast('Kaydedildi.')).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
    modalKapat();
  }, p ? ()=>{ if(confirm('Bu işi silmek istiyor musunuz?')){ PeriyodikService.isSil(p.id).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); }); modalKapat(); } } : null);
}

function periyodikBaglantilariKur(){
  PeriyodikRepository.islerDinle(v=>{
    periyodikIsler = v;
    renderPeriyodikIsler();
    if(typeof takvimVeriGuncelle==='function') takvimVeriGuncelle();
  });
  PeriyodikRepository.sabloniDinle(v=>{
    periyodikSablonu = v;
    renderPeriyodikSablonOzet();
  });
}

/* ============== AYLIK ŞABLON ============== */
function renderPeriyodikSablonOzet(){
  const hedef = document.getElementById('periyodikSablonOzet');
  if(!hedef) return;
  hedef.textContent = periyodikSablonu.length
    ? `${periyodikSablonu.length} görev tanımlı — "Bu Ayın Görevlerini Oluştur" ile tek tıkla ekleyebilirsiniz.`
    : 'Henüz şablon tanımlanmadı. "Şablonu Düzenle" ile puantaj, ek ders, İŞKUR gibi her ay tekrarlayan görevlerinizi bir kez tanımlayın.';
}

function periyodikSablonSatirHtml(g){
  return `
    <div class="sablon-satir" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
      <input class="sb_isAdi" style="flex:2;min-width:0;" value="${escapeHtml(g.isAdi||'')}" placeholder="İş Adı, örn: Personel Puantaj İşlemleri">
      <input class="sb_bas" type="number" min="1" max="31" style="flex:0 0 48px;min-width:48px;" value="${g.baslangicGun||1}" title="Başlangıç günü">
      <input class="sb_bit" type="number" min="1" max="31" style="flex:0 0 48px;min-width:48px;" value="${g.bitisGun||1}" title="Bitiş günü">
      <button class="cz-del" title="Satırı kaldır" onclick="this.closest('.sablon-satir').remove()">🗑</button>
    </div>`;
}
function periyodikSablonSatirEkle(){
  document.getElementById('sablonSatirlari').insertAdjacentHTML('beforeend', periyodikSablonSatirHtml({isAdi:'',baslangicGun:1,bitisGun:1}));
}
function periyodikSablonModalAc(){
  const liste = periyodikSablonu.length ? periyodikSablonu : PERIYODIK_SABLON_VARSAYILAN;
  const body = `
    <p style="color:var(--ink-muted);font-size:13px;margin-bottom:10px;">İş adını ve ayın kaçıncı gününden kaçıncı gününe kadar yapılacağını girin (örn. 1-5 = ayın ilk 5 günü). "Bu Ayın Görevlerini Oluştur" dediğinizde bu satırlar, içinde bulunduğunuz ayın gerçek tarihlerine dönüştürülür.</p>
    <div style="display:flex;gap:8px;font-size:11.5px;color:var(--ink-muted);margin-bottom:6px;">
      <div style="flex:2;">İş Adı</div><div style="flex:0 0 48px;text-align:center;">Başl.</div><div style="flex:0 0 48px;text-align:center;">Bitiş</div><div style="width:30px;"></div>
    </div>
    <div id="sablonSatirlari">${liste.map(periyodikSablonSatirHtml).join('')}</div>
    <button class="btn btn-ghost btn-sm" style="margin-top:4px;" onclick="periyodikSablonSatirEkle()">+ Görev Satırı Ekle</button>
  `;
  modalAc('Aylık Şablonu Düzenle', body, ()=>{
    const gorevler = Array.from(document.querySelectorAll('#sablonSatirlari .sablon-satir')).map(satir=>({
      isAdi: satir.querySelector('.sb_isAdi').value.trim(),
      baslangicGun: parseInt(satir.querySelector('.sb_bas').value)||1,
      bitisGun: parseInt(satir.querySelector('.sb_bit').value)||1,
    })).filter(g=>g.isAdi);
    PeriyodikService.sabloniKaydet(gorevler)
      .then(()=>{ toast('Şablon kaydedildi.'); modalKapat(); })
      .catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
  }, null);
}

async function periyodikAyOlustur(){
  if(!periyodikSablonu.length){ toast('Önce "Şablonu Düzenle" ile görevlerinizi tanımlayın.'); return; }
  try{
    const { olusturulan, atlanan } = await PeriyodikService.buAyinGorevleriniOlustur(periyodikSablonu, periyodikIsler);
    toast(olusturulan ? `${olusturulan} görev oluşturuldu${atlanan?`, ${atlanan} zaten vardı`:''}.` : 'Bu ayın tüm şablon görevleri zaten mevcut.');
  }catch(err){
    if(err.message!=='yetkisiz' && err.message!=='sablon-bos') toast('Hata: '+err.message);
  }
}
