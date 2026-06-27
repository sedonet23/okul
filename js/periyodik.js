/* ====================================================================
   js/periyodik.js
   PERİYODİK İŞLER — okul taşıma, ek ders, puantaj, işkur gibi her ay
   tekrarlayan idari işler. İş türleri tamamen serbest (kullanıcı kendi
   oluşturur). Her kayıt: iş adı + başlangıç/bitiş tarihi + tamamlandı
   tiki + opsiyonel not. Liste, bitiş (yoksa başlangıç) tarihinin
   ay/yılına göre gruplanır. Bitiş tarihi yaklaşınca/geçince
   check-and-notify.js üzerinden push bildirimi gönderilir.
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

function gunToISO(yil, ay0, gun){
  const sonGun = new Date(yil, ay0+1, 0).getDate();
  return `${yil}-${pad2(ay0+1)}-${pad2(Math.min(Math.max(gun,1), sonGun))}`;
}

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
  db.collection(COL.periyodikIsler).doc(id).update({tamamlandi:deger}).catch(err=>toast('Hata: '+err.message));
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
    kaydet(COL.periyodikIsler, p?p.id:null, {
      isAdi, baslangic, bitis,
      not: document.getElementById('f_pNot').value.trim(),
      tamamlandi: p ? !!p.tamamlandi : false,
      bildirimGonderildi: p ? (bitisDegisti ? false : !!p.bildirimGonderildi) : false
    });
    modalKapat();
  }, p ? ()=>{ if(confirm('Bu işi silmek istiyor musunuz?')){ db.collection(COL.periyodikIsler).doc(p.id).delete(); modalKapat(); } } : null);
}

function periyodikBaglantilariKur(){
  db.collection(COL.periyodikIsler).onSnapshot(s=>{
    periyodikIsler = s.docs.map(d=>({id:d.id,...d.data()}));
    renderPeriyodikIsler();
    if(typeof takvimVeriGuncelle==='function') takvimVeriGuncelle();
  }, hataGoster);
  db.collection(COL.periyodikSablon).doc('sablon').onSnapshot(doc=>{
    periyodikSablonu = doc.exists ? (doc.data().gorevler||[]) : [];
    renderPeriyodikSablonOzet();
  }, hataGoster);
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
    db.collection(COL.periyodikSablon).doc('sablon').set({ gorevler })
      .then(()=>{ toast('Şablon kaydedildi.'); modalKapat(); })
      .catch(err=>toast('Hata: '+err.message));
  }, null);
}

async function periyodikAyOlustur(){
  if(!periyodikSablonu.length){ toast('Önce "Şablonu Düzenle" ile görevlerinizi tanımlayın.'); return; }
  const d = new Date();
  const yil = d.getFullYear(), ay0 = d.getMonth();
  let olusturulan = 0, atlanan = 0;
  for(const g of periyodikSablonu){
    if(!g.isAdi) continue;
    const baslangic = gunToISO(yil, ay0, g.baslangicGun);
    const bitis = gunToISO(yil, ay0, g.bitisGun);
    const ayAnahtari = bitis.slice(0,7);
    const zatenVar = periyodikIsler.some(p=>p.isAdi===g.isAdi && periyodikGrupAnahtari(p)===ayAnahtari);
    if(zatenVar){ atlanan++; continue; }
    try{
      await db.collection(COL.periyodikIsler).add({ isAdi:g.isAdi, baslangic, bitis, tamamlandi:false, not:'', bildirimGonderildi:false });
      olusturulan++;
    }catch(err){ toast('Hata: '+err.message); return; }
  }
  toast(olusturulan ? `${olusturulan} görev oluşturuldu${atlanan?`, ${atlanan} zaten vardı`:''}.` : 'Bu ayın tüm şablon görevleri zaten mevcut.');
}
