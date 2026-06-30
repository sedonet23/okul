/* ====================================================================
   js/personel.js
   PERSONEL İŞLERİ MODÜLÜ — sürekli işçi, hizmetli, memur vb. öğretmen
   kadrosu dışındaki personelin kayıtları. Dilekçe Sistemi bu kayıtları
   kullanır. Veri modeli (bkz. firebase-init.js COL.personel):
     personel : {adSoyad, tc, telefon, adres, gorev, notlar}
   ==================================================================== */

let personelListesi = [];

const PERSONEL_GOREV_SECENEKLERI = [
  'Sürekli İşçi', 'Hizmetli', 'Memur', 'Güvenlik Görevlisi',
  'Aşçı', 'Kaloriferci', 'Temizlik Görevlisi', 'Diğer'
];

function personelGorevSecenekleriHtml(seciliGorev){
  return PERSONEL_GOREV_SECENEKLERI.map(g =>
    `<option value="${escapeHtml(g)}" ${seciliGorev===g?'selected':''}>${escapeHtml(g)}</option>`
  ).join('');
}

function renderPersonelListesi(){
  const hedef = document.getElementById('personelListesi');
  if(!hedef) return;
  const aramaEl = document.getElementById('personelArama');
  const arama = (aramaEl ? aramaEl.value : '').toLocaleLowerCase('tr');

  let liste = [...personelListesi];
  if (arama) {
    liste = liste.filter(p =>
      (p.adSoyad||'').toLocaleLowerCase('tr').includes(arama) ||
      (p.tc||'').includes(arama) ||
      (p.gorev||'').toLocaleLowerCase('tr').includes(arama)
    );
  }
  liste.sort((a,b)=>(a.adSoyad||'').localeCompare(b.adSoyad||'','tr'));

  hedef.innerHTML = liste.length ? liste.map(p=>`
    <div class="evrak-row" style="cursor:pointer;" onclick="personelDetayAc('${p.id}')">
      <div class="evrak-body">
        <div class="evrak-title">${escapeHtml(p.adSoyad||'İsimsiz Personel')} <span class="badge badge-blue">${escapeHtml(p.gorev||'Personel')}</span></div>
        <div class="evrak-meta">
          ${p.tc ? 'TC: '+escapeHtml(p.tc) : 'TC kaydı yok'}${p.telefon ? ' · 📞 '+escapeHtml(p.telefon) : ''}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); personelModalAc('${p.id}')">Düzenle</button>
    </div>
  `).join('') : '<div class="empty-state">Henüz personel eklenmedi. "+ Yeni Personel" ile ekleyin.</div>';
}

function personelAramaGuncelle(){ renderPersonelListesi(); }

/* ---------- personel detay paneli ---------- */
function personelDetayAc(id){
  const p = personelListesi.find(x=>x.id===id);
  if(!p) return;

  document.getElementById('detayBaslik').textContent = p.adSoyad || 'Personel';
  document.getElementById('detayAltBaslik').textContent = p.gorev || 'Personel';
  document.getElementById('detayDuzenleBtn').onclick = ()=>{ detayPanelKapat(); personelModalAc(id); };
  const _raporBtn = document.getElementById('detayRaporBtn');
  if (_raporBtn) {
    _raporBtn.onclick = () => {
      detayPanelKapat();
      if (typeof DilekceSistemi !== 'undefined' && DilekceSistemi.ac) {
        DilekceSistemi.ac(id);
      } else {
        alert('Dilekçe modülü yüklenemedi (js/dilekce.js eksik olabilir). Sayfayı yenileyip tekrar deneyin.');
      }
    };
  }

  document.getElementById('detayBody').innerHTML = `
    <div style="padding:14px 18px;">
      <div class="detay-card">
        <h4>👤 Personel Bilgileri</h4>
        <div class="detay-row">Görev: <span class="badge badge-blue">${escapeHtml(p.gorev||'—')}</span></div>
        <div class="detay-row">TC Kimlik No: ${escapeHtml(p.tc||'—')}</div>
        <div class="detay-row">📞 Telefon: ${escapeHtml(p.telefon||'—')}</div>
        <div class="detay-row">🏠 Adres: ${escapeHtml(p.adres||'—')}</div>
        ${p.notlar ? `<div class="detay-row detay-row-muted">📝 ${escapeHtml(p.notlar)}</div>` : ''}
        <div class="detay-row" style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-takip-cizelge" onclick="detayPanelKapat(); if(typeof DilekceSistemi!=='undefined') DilekceSistemi.ac('${p.id}'); else alert('Dilekçe modülü yüklenemedi.');">📄 Dilekçe Oluştur</button>
          <button class="btn-takip-cizelge" onclick="detayPanelKapat(); if(typeof PuantajSistemi!=='undefined') PuantajSistemi.ac('${p.id}'); else alert('Puantaj modülü yüklenemedi.');">🗓️ Puantaj / İmza Sirküsü</button>
        </div>
      </div>
      <div class="detay-card">
        <h4 class="detay-card-header">
          <span class="detay-card-title">📅 İzin / Rapor Kayıtları</span>
          <span class="detay-card-actions">
            <button class="btn btn-amber btn-sm" onclick="personelIzinModalAc('${p.id}')">➕ Kayıt Ekle</button>
          </span>
        </h4>
        <div id="pIzinListesi"></div>
      </div>
    </div>
  `;
  if (typeof renderPersonelIzinListesi === 'function') renderPersonelIzinListesi(id);

  document.getElementById('detayOverlay').classList.add('active'); document.body.classList.add('modal-open');
}

/* ---------- modal ---------- */
function personelModalAc(id){
  const p = id ? personelListesi.find(x=>x.id===id) : null;
  const body = `
    <div class="form-group"><label>Ad Soyad</label><input id="f_pAd" value="${p?escapeHtml(p.adSoyad||''):''}" placeholder="örn: Şahin ERASLAN"></div>
    <div class="form-row">
      <div class="form-group"><label>TC Kimlik No</label><input id="f_pTc" value="${p?escapeHtml(p.tc||''):''}" maxlength="11" inputmode="numeric" placeholder="11 haneli TC kimlik no"></div>
      <div class="form-group"><label>Telefon</label><input id="f_pTel" value="${p?escapeHtml(p.telefon||''):''}" placeholder="örn: 0538 863 57 78"></div>
    </div>
    <div class="form-group"><label>Görev</label>
      <select id="f_pGorev">${personelGorevSecenekleriHtml(p?p.gorev:'')}</select>
    </div>
    <div class="form-group"><label>Adres</label><textarea id="f_pAdres" rows="2" placeholder="örn: Fevzi Çakmak Mh. Tekağaç Sk. No:34/5 Merkez / Elazığ">${p?escapeHtml(p.adres||''):''}</textarea></div>
    <div class="form-group"><label>Notlar</label><textarea id="f_pNotlar" rows="2">${p?escapeHtml(p.notlar||''):''}</textarea></div>
  `;
  modalAc(p?'Personel Düzenle':'Yeni Personel', body, ()=>{
    const adSoyad = document.getElementById('f_pAd').value.trim();
    if(!adSoyad){ toast('Ad Soyad zorunludur.'); return; }
    const tc = document.getElementById('f_pTc').value.trim();
    if(tc && !/^\d{11}$/.test(tc)){ toast('TC Kimlik No 11 haneli rakamlardan oluşmalıdır.'); return; }
    kaydet(COL.personel, p?p.id:null, {
      adSoyad,
      tc,
      telefon: document.getElementById('f_pTel').value.trim(),
      gorev: document.getElementById('f_pGorev').value,
      adres: document.getElementById('f_pAdres').value.trim(),
      notlar: document.getElementById('f_pNotlar').value.trim(),
    });
    modalKapat();
  }, p ? ()=>{ if(confirm('Bu personel kaydını silmek istediğinize emin misiniz?')){ db.collection(COL.personel).doc(p.id).delete(); modalKapat(); } } : null);
}

/* ---------- FIRESTORE BAĞLANTISI ---------- */
function personelBaglantilariKur(){
  db.collection(COL.personel).onSnapshot(s=>{
    personelListesi = s.docs.map(d=>({id:d.id,...d.data()}));
    renderPersonelListesi();
  }, hataGoster);
}
