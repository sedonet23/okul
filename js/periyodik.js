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
  }, hataGoster);
}
