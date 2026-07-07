/* =============================================================
   js/ogretmen-liste-olusturucu.js
   ÖĞRETMENE ÖZEL ÖĞRENCİ LİSTESİ OLUŞTURUCU  (Kayıtlı Çizelgeler)
   ---------------------------------------------------------------
   Girişli öğretmen, ders programında girdiği (veya sınıf öğretmeni
   olduğu) sınıflardan birini seçer; istediği sütunları işaretler,
   isterse boş özel sütun ekler, ÖNİZLEME TABLOSUNDAKİ HER HÜCREYE
   doğrudan elle veri girebilir (not, imza, açıklama vb.) ve bu
   tabloyu bir isimle "çizelge" olarak kaydedebilir. Bir sınıf için
   birden fazla çizelge (ör. "Türkçe 1.Dönem 1.Yazılı", "Yoklama —
   Ekim") kaydedip, dilediği zaman açıp güncelleyebilir, tekrar
   yazdırabilir/dışa aktarabilir — kağıt üstünde tuttuğu not
   çizelgesinin dijital karşılığı gibi.
   Çıktı: Yazdır (dikey/yatay, zebra desenli), Excel (.xlsx) ve PDF.
   ============================================================= */

const OL_HAZIR_SUTUNLAR = [
  { key: 'siraNo',     label: 'Sıra No',    fn: (v, i) => String(i + 1) },
  { key: 'ogrenciAdi', label: 'Ad Soyad',   fn: v => v.ogrenciAdi || '' },
  { key: 'ogrenciNo',  label: 'Öğrenci No', fn: v => v.ogrenciNo  || '' },
  { key: 'cinsiyet',   label: 'Cinsiyet',   fn: v => v.cinsiyet   || '' },
  { key: 'veliAdi',    label: 'Veli Adı',   fn: v => v.veliAdi    || '' },
  { key: 'yakinlik',   label: 'Yakınlık',   fn: v => v.yakinlik1 || v.yakinlik || '' },
  { key: 'telefon1',   label: 'Telefon 1',  fn: v => v.telefon1 || v.telefon || '' },
  { key: 'telefon2',   label: 'Telefon 2',  fn: v => v.telefon2   || '' },
  { key: 'adres',      label: 'Adres',      fn: v => v.adres      || '' },
  { key: 'servisAdi',  label: 'Servis',     fn: v => v.servisAdi  || '' },
  { key: 'notlar',     label: 'Notlar',     fn: v => v.notlar     || '' },
];

let _olSeciliSinif = '';
let _olLogoDataUri = null;
let _olPdfFontBase64 = null;

/* ---------- ÇALIŞMA VERİSİ (satırlar) ----------
   Önizleme tablosundaki tüm hücrelerin GERÇEK kaynağı burasıdır.
   Sınıf seçildiğinde sınıf listesinden (veliler koleksiyonu) bir
   "anlık görüntü" olarak doldurulur; sonrasında tamamen elle
   düzenlenebilir ve bağımsız olarak kaydedilir — yani sınıf listesi
   sonradan değişse bile kaydedilmiş çizelge kendi verisini korur.
   Satır nesneleri OL_HAZIR_SUTUNLAR alan adlarıyla birebir eşleşir
   (ogrenciAdi, ogrenciNo, ...) + özel sütunların kendi id'leri. */
let _olSatirlar = [];
let _olAcikCizelgeId = null;   // null = henüz kaydedilmemiş yeni çizelge
let _olKayitliCizelgeler = []; // seçili sınıf için kayıtlı çizelgelerin önbelleği

/* ---------- PDF fontunu önbellekle ----------
   jsPDF'in yerleşik fontları (Helvetica vb.) WinAnsi kodlamasını
   kullanıyor ve Türkçe'ye özgü ı, ğ, ş, İ, Ğ, Ş karakterlerini
   içermiyor — bu yüzden "Sınıfı" gibi kelimeler "S1n1f1" şeklinde
   bozuk çıkıyordu. Çözüm: Türkçe karakterleri destekleyen bir Unicode
   TTF fontu (Roboto) çalışma anında indirip PDF'e gömüyoruz. */
async function olPdfFontBase64Getir() {
  if (_olPdfFontBase64 !== null) return _olPdfFontBase64;
  try {
    const resp = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.12/fonts/Roboto/Roboto-Regular.ttf');
    const buf = await resp.arrayBuffer();
    _olPdfFontBase64 = olArrayBufferToBase64(buf);
  } catch (e) {
    console.warn('PDF fontu yüklenemedi, Türkçe karakterler bozuk görünebilir:', e);
    _olPdfFontBase64 = '';
  }
  return _olPdfFontBase64;
}

function olArrayBufferToBase64(buffer) {
  let ikili = '';
  const bytes = new Uint8Array(buffer);
  const parcaBoyu = 0x8000; // büyük dosyalarda call-stack taşmasını önlemek için parça parça
  for (let i = 0; i < bytes.length; i += parcaBoyu) {
    ikili += String.fromCharCode.apply(null, bytes.subarray(i, i + parcaBoyu));
  }
  return btoa(ikili);
}

/* ---------- okul logosunu data URI olarak önbellekle ----------
   Yazdırma penceresi/PDF, sayfanın normal DOM bağlamının dışında
   (blob URL / native plugin) render edildiği için "assets/..." gibi
   göreli yollar çözülemiyor — bu yüzden logoyu bir kere base64'e
   çevirip önbellekte tutuyoruz. */
async function olLogoDataUriGetir() {
  if (_olLogoDataUri) return _olLogoDataUri;
  try {
    const resp = await fetch('assets/icon-192.png');
    const blob = await resp.blob();
    _olLogoDataUri = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  } catch (e) { console.warn('Okul logosu yüklenemedi:', e); _olLogoDataUri = ''; }
  return _olLogoDataUri;
}

/* ---------- öğretmenin girdiği sınıflar ---------- */
function olKendiSiniflarim() {
  const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
  if (!ben) return [];
  const set = new Set();
  dersProgrami.filter(d => d.ogretmenId === ben.id).forEach(d => { if (d.sinif) set.add(d.sinif); });
  siniflar.filter(s => s.sinifOgretmeniId === ben.id).forEach(s => set.add(s.ad));
  return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
}

function olSablonId(sinifAdi) {
  const ben = bagliOgretmenimGetir();
  return `${ben.id}__${sinifAdi}`.replace(/[^\w\-]/g, '_');
}

/* ---------- sekme açılışı ---------- */
function ogretmenListeSekmesiAc() {
  const panel = document.getElementById('tab-ogretmenListe');
  if (!panel) return;
  const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;

  if (!ben) {
    document.getElementById('olIcerik').innerHTML =
      `<div class="card" style="text-align:center;color:var(--ink-muted);padding:30px;">
        Bu bölüm, hesabınıza bağlı bir öğretmen kaydı gerektirir.
      </div>`;
    return;
  }

  const siniflarim = olKendiSiniflarim();
  const secenekler = siniflarim.map(ad => `<option value="${escapeHtml(ad)}">${escapeHtml(ad)}</option>`).join('');
  olLogoDataUriGetir(); // arka planda önbelleğe al, sonucu bekleme

  document.getElementById('olIcerik').innerHTML = `
    <div class="card" style="margin-bottom:14px;">
      <label style="font-weight:600;font-size:13px;display:block;margin-bottom:6px;">Sınıf Seçin</label>
      <select id="olSinifSecici" style="width:100%;max-width:320px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;" onchange="olSinifSecildi(this.value)">
        <option value="">— Sınıf seçiniz —</option>
        ${secenekler}
      </select>
      ${!siniflarim.length ? '<div style="margin-top:8px;font-size:12.5px;color:var(--ink-muted);">Ders programında kayıtlı bir sınıfınız bulunamadı.</div>' : ''}
    </div>
    <div id="olCalismaAlani"></div>
  `;
}

/* ---------- sınıf seçildiğinde ---------- */
async function olSinifSecildi(sinifAdi) {
  _olSeciliSinif = sinifAdi;
  _olAcikCizelgeId = null;
  const alan = document.getElementById('olCalismaAlani');
  if (!sinifAdi) { alan.innerHTML = ''; return; }

  alan.innerHTML = `<div class="card" style="color:var(--ink-muted);">Yükleniyor…</div>`;

  // Sınıf için kayıtlı bir "sütun düzeni" şablonu var mı? (isteğe bağlı, sadece kolon tercihleri)
  let sablon = null;
  try {
    const dogSnap = await db.collection('oy_ogretmenListeSablon').doc(olSablonId(sinifAdi)).get();
    if (dogSnap.exists) sablon = dogSnap.data();
  } catch (e) { console.error('Şablon okunamadı:', e); }

  // Çalışma verisi: sınıf listesinden anlık görüntü al
  _olSatirlar = olSatirlariRosterdenOlustur();

  await olCalismaAlaniOlustur(sablon, '');
}

/* ---------- sınıf listesinden (veliler) satır anlık görüntüsü oluştur ---------- */
function olSatirlariRosterdenOlustur() {
  return olOgrencileriGetir().map(v => ({
    ogrenciAdi: v.ogrenciAdi || '',
    ogrenciNo:  v.ogrenciNo  || '',
    cinsiyet:   v.cinsiyet   || '',
    veliAdi:    v.veliAdi    || '',
    yakinlik1:  v.yakinlik1 || v.yakinlik || '',
    telefon1:   v.telefon1 || v.telefon || '',
    telefon2:   v.telefon2   || '',
    adres:      v.adres      || '',
    servisAdi:  v.servisAdi  || '',
    notlar:     v.notlar     || '',
  }));
}

/* ---------- çalışma alanını (form + önizleme) çiz ----------
   sablon: { secilenKeyler, sutunSirasi, ozelSutunlar, baslikBilgisi } biçiminde
   hem "sütun düzeni şablonu" hem de kayıtlı bir "çizelge" olabilir. */
async function olCalismaAlaniOlustur(sablon, cizelgeAdi) {
  const alan = document.getElementById('olCalismaAlani');
  sablon = sablon || {};

  const seciliKeyler = sablon.secilenKeyler || OL_HAZIR_SUTUNLAR.map(c => c.key);
  const ozelSutunlarKaynak = sablon.ozelSutunlar || [];
  const bs = sablon.baslikBilgisi || {};

  // Kayıtlı bir sıralama varsa onu kullan; yoksa varsayılan tanım sırası.
  // Şablonda olmayan (yeni eklenmiş) sütunlar listenin sonuna eklenir.
  let sutunSirasi = (sablon.sutunSirasi || []).filter(k => OL_HAZIR_SUTUNLAR.some(c => c.key === k));
  OL_HAZIR_SUTUNLAR.forEach(c => { if (!sutunSirasi.includes(c.key)) sutunSirasi.push(c.key); });

  const checkboxler = sutunSirasi.map(key => {
    const col = OL_HAZIR_SUTUNLAR.find(c => c.key === key);
    if (!col) return '';
    return `
    <div class="ol-sutun-satir" data-key="${col.key}" style="display:flex;align-items:center;gap:4px;padding:5px 4px;border-bottom:1px solid var(--border);">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;">
        <input type="checkbox" class="ol-sutun-check" value="${col.key}" ${seciliKeyler.includes(col.key) ? 'checked' : ''} style="cursor:pointer;width:15px;height:15px;flex-shrink:0;">
        <span>${escapeHtml(col.label)}</span>
      </label>
      <button type="button" class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:13px;" onclick="olSutunTasi(this,-1)" title="Yukarı taşı">▲</button>
      <button type="button" class="btn btn-ghost btn-sm" style="padding:2px 9px;font-size:13px;" onclick="olSutunTasi(this,1)" title="Aşağı taşı">▼</button>
    </div>`;
  }).join('');

  // Eski şablonlarda ozelSutunlar düz string dizisiydi (["Konuşma","Yazılı"]) —
  // geriye dönük uyumluluk için burada {id,label} nesnesine çeviriyoruz.
  const ozelSutunHtml = ozelSutunlarKaynak
    .map(k => olOzelSutunSatiri(typeof k === 'string' ? { label: k } : k))
    .join('');

  const ben = bagliOgretmenimGetir();
  const _okulAdi = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.okulAdi) ? okulBilgileriAyari.okulAdi : '';
  const _yil = (() => { const y = new Date().getFullYear(); return `${y}-${y + 1}`; })();
  const _ogretmenAdSoyad = ben ? `${ben.ad || ''} ${ben.soyad || ''}`.trim() : '';
  const _ogretmenBrans = ben ? (ben.brans || '') : '';
  const _mudur = (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari && okulBilgileriAyari.mudurId)
    ? ogretmenler.find(o => o.id === okulBilgileriAyari.mudurId) : null;
  const _mudurAdSoyad = _mudur ? `${_mudur.ad || ''} ${_mudur.soyad || ''}`.trim() : '';

  const inputStil = 'width:100%;padding:5px 9px;border:1px solid var(--border);border-radius:6px;font-size:13px;';
  const satir = (id, placeholder, deger, gosterVarsayilan) => `
    <div style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;">
      <input id="${id}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(deger)}" style="${inputStil}">
      <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer;">
        <input type="checkbox" id="${id}Goster" ${gosterVarsayilan ? 'checked' : ''}> Göster
      </label>
    </div>`;

  alan.innerHTML = `
    <div class="card" style="margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Kayıtlı Çizelgeler</div>
      <p style="font-size:12.5px;color:var(--ink-muted);margin-bottom:10px;">Bu sınıf için birden fazla çizelge (not çizelgesi, yoklama vb.) oluşturup adlandırarak kaydedebilir, istediğiniz zaman açıp düzenleyebilirsiniz.</p>
      <div id="olCizelgeListesi" style="margin-bottom:10px;">
        <div style="font-size:12.5px;color:var(--ink-muted);padding:6px 2px;">Yükleniyor…</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="olYeniCizelge()">+ Yeni Çizelge</button>
    </div>

    <div class="card" style="margin-bottom:14px;">
      <label style="font-weight:600;font-size:13px;display:block;margin-bottom:6px;">Çizelge Adı</label>
      <input id="olCizelgeAdi" placeholder="Örn: Türkçe 1. Dönem 1. Yazılı Not Çizelgesi" value="${escapeHtml(cizelgeAdi || '')}" style="${inputStil}max-width:420px;">
      <div id="olCizelgeDurumMetni" style="font-size:11.5px;color:var(--ink-muted);margin-top:6px;">${_olAcikCizelgeId ? 'Mevcut bir çizelgeyi düzenliyorsunuz — "Çizelgeyi Kaydet" değişiklikleri üzerine yazar.' : 'Kaydettiğinizde yeni bir çizelge olarak eklenir.'}</div>
    </div>

    <div class="card" style="margin-bottom:14px;">
      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Başlık Bilgileri (İsteğe Bağlı)</div>
      <div style="display:grid;gap:7px;">
        ${satir('olOkulAdi', 'Okul Adı', bs.okulAdi ?? _okulAdi, bs.okulAdiGoster ?? true)}
        ${satir('olEgitimYili', 'Eğitim-Öğretim Yılı', bs.egitimYili ?? _yil, bs.egitimYiliGoster ?? true)}
        ${satir('olAltBaslik', 'Alt Başlık (isteğe bağlı, örn: Veli Toplantısı Listesi)', bs.altBaslik ?? '', bs.altBaslikGoster ?? false)}
      </div>

      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">İmza / Onay Satırı (İsteğe Bağlı)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="display:grid;gap:7px;">
          ${satir('olOgretmenAdSoyad', 'Öğretmen Ad Soyad', bs.ogretmenAdSoyad ?? _ogretmenAdSoyad, bs.ogretmenGoster ?? true)}
          ${satir('olOgretmenBrans', 'Branş', bs.ogretmenBrans ?? _ogretmenBrans, bs.ogretmenBransGoster ?? true)}
        </div>
        <div style="display:grid;gap:7px;">
          ${satir('olMudurAdSoyad', 'Okul Müdürü Ad Soyad', bs.mudurAdSoyad ?? _mudurAdSoyad, bs.mudurGoster ?? true)}
          ${satir('olMudurUnvan', 'Ünvan', bs.mudurUnvan ?? 'Okul Müdürü', bs.mudurUnvanGoster ?? true)}
        </div>
      </div>

      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">Sütunları Seç ve Sırala</div>
      <div style="font-size:11.5px;color:var(--ink-muted);margin-bottom:6px;">▲ / ▼ ile sütunların sırasını değiştirebilirsiniz.</div>
      <div id="olSutunListesi" style="display:flex;flex-direction:column;padding:4px 10px;background:var(--nm-bg,#f0f0f3);border-radius:8px;">
        ${checkboxler}
      </div>

      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">Özel Sütun Ekle</div>
      <div style="font-size:11.5px;color:var(--ink-muted);margin-bottom:6px;">Not, puan, imza vb. elle dolduracağınız sütunlar için kullanın — aşağıdaki önizleme tablosundaki hücrelere doğrudan yazabilirsiniz.</div>
      <div id="olOzelSutunListesi" style="display:flex;flex-direction:column;gap:6px;">${ozelSutunHtml}</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="olOzelSutunEkle()">+ Özel Sütun Ekle</button>

      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px;">Sayfa Yönü</div>
      <div style="display:flex;gap:16px;">
        <label style="display:flex;align-items:center;gap:5px;cursor:pointer;">
          <input type="radio" name="olYon" value="portrait" ${(bs.yon ?? 'portrait') === 'portrait' ? 'checked' : ''}> Dikey (A4)
        </label>
        <label style="display:flex;align-items:center;gap:5px;cursor:pointer;">
          <input type="radio" name="olYon" value="landscape" ${bs.yon === 'landscape' ? 'checked' : ''}> Yatay (A4)
        </label>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">
        <button class="btn btn-amber" onclick="olCizelgeyiKaydet()">💾 Çizelgeyi Kaydet</button>
        <button class="btn btn-ghost" onclick="olOnizlemeGuncelle()">🔄 Önizlemeyi Güncelle</button>
        <button class="btn btn-ghost" onclick="olSablonKaydet()">📌 Sütun Düzenini Şablon Yap</button>
        <button class="btn btn-ghost" onclick="olYazdir()">🖨️ Yazdır</button>
        <button class="btn btn-ghost" onclick="olExcelAktar()">📊 Excel'e Aktar</button>
        <button class="btn btn-ghost" onclick="olPdfAktar()">📄 PDF'e Aktar</button>
      </div>
    </div>

    <div class="card">
      <div style="font-size:11px;font-weight:700;color:var(--ink-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Önizleme — hücrelere doğrudan tıklayıp yazabilirsiniz</div>
      <div id="olOnizlemeAlani" style="overflow-x:auto;"></div>
    </div>
  `;

  olOnizlemeGuncelle();
  olCizelgeleriYenile(); // kayıtlı çizelge listesini arka planda getir
}

function olOzelSutunSatiri(kolon) {
  const id = (kolon && kolon.id) || ('ozel_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  const label = (kolon && kolon.label) || '';
  return `
    <div class="ol-ozel-sutun-satir" data-id="${id}" style="display:flex;gap:6px;align-items:center;">
      <input class="ol-ozel-sutun-input" type="text" placeholder="Sütun adı (örn: Konuşma, Yazılı, İmza)" value="${escapeHtml(label)}"
        style="flex:1;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px;" oninput="olOnizlemeGuncelle()">
      <button class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="this.parentElement.remove();olOnizlemeGuncelle()">✕</button>
    </div>`;
}

function olOzelSutunEkle() {
  const kap = document.getElementById('olOzelSutunListesi');
  if (!kap) return;
  kap.insertAdjacentHTML('beforeend', olOzelSutunSatiri(null));
  olOnizlemeGuncelle();
}

/* ---------- sütun sırasını değiştir (yukarı/aşağı) ---------- */
function olSutunTasi(btn, yon) {
  const satir = btn.closest('.ol-sutun-satir');
  if (!satir) return;
  if (yon < 0) {
    const onceki = satir.previousElementSibling;
    if (onceki) satir.parentElement.insertBefore(satir, onceki);
  } else {
    const sonraki = satir.nextElementSibling;
    if (sonraki) satir.parentElement.insertBefore(sonraki, satir);
  }
  olOnizlemeGuncelle();
}

/* ---------- seçili sütunları topla (ekrandaki güncel sıraya göre) ---------- */
function olTumSutunlariGetir() {
  const seciliSutunlar = [...document.querySelectorAll('.ol-sutun-satir')]
    .map(satir => satir.querySelector('.ol-sutun-check'))
    .filter(el => el && el.checked)
    .map(el => OL_HAZIR_SUTUNLAR.find(c => c.key === el.value))
    .filter(Boolean);

  const ozelSutunlar = [...document.querySelectorAll('.ol-ozel-sutun-satir')]
    .map(el => ({ id: el.dataset.id, label: (el.querySelector('.ol-ozel-sutun-input')?.value || '').trim() }))
    .filter(o => o.label)
    .map(o => ({ key: o.id, label: o.label, fn: v => v[o.id] || '' }));

  return [...seciliSutunlar, ...ozelSutunlar];
}

/* ---------- başlık / imza bilgilerini topla ---------- */
function olBaslikBilgisiGetir() {
  const g = id => document.getElementById(id);
  const gv = id => g(id)?.value?.trim() || '';
  const gc = id => g(id)?.checked ?? false;
  return {
    yon: document.querySelector('input[name="olYon"]:checked')?.value || 'portrait',
    okulAdi: gv('olOkulAdi'), okulAdiGoster: gc('olOkulAdiGoster'),
    egitimYili: gv('olEgitimYili'), egitimYiliGoster: gc('olEgitimYiliGoster'),
    altBaslik: gv('olAltBaslik'), altBaslikGoster: gc('olAltBaslikGoster'),
    ogretmenAdSoyad: gv('olOgretmenAdSoyad'), ogretmenGoster: gc('olOgretmenAdSoyadGoster'),
    ogretmenBrans: gv('olOgretmenBrans'), ogretmenBransGoster: gc('olOgretmenBransGoster'),
    mudurAdSoyad: gv('olMudurAdSoyad'), mudurGoster: gc('olMudurAdSoyadGoster'),
    mudurUnvan: gv('olMudurUnvan'), mudurUnvanGoster: gc('olMudurUnvanGoster'),
  };
}

/* ---------- canlı sınıf listesi (veliler koleksiyonu) ---------- */
function olOgrencileriGetir() {
  const s = siniflar.find(x => x.ad === _olSeciliSinif);
  const sinifId = s ? s.id : _olSeciliSinif;
  return veliler
    .filter(v => v.sinifId === sinifId || v.sinifId === _olSeciliSinif)
    .sort((a, b) => (a.ogrenciAdi || '').localeCompare(b.ogrenciAdi || '', 'tr'));
}

/* ---------- önizleme (düzenlenebilir tablo) ---------- */
function olOnizlemeGuncelle() {
  const alan = document.getElementById('olOnizlemeAlani');
  if (!alan) return;
  const sutunlar = olTumSutunlariGetir();

  if (!sutunlar.length) { alan.innerHTML = '<div style="color:var(--ink-muted);">En az bir sütun seçin.</div>'; return; }

  const ortalanacakAnahtarlar = ['siraNo', 'ogrenciNo'];
  const th = sutunlar.map(c => `<th style="padding:6px 8px;background:#1B3A5C;color:#fff;text-align:${ortalanacakAnahtarlar.includes(c.key) ? 'center' : 'left'};font-size:12px;border:1px solid #1B3A5C;">${escapeHtml(c.label)}</th>`).join('')
    + `<th style="width:34px;background:#1B3A5C;border:1px solid #1B3A5C;"></th>`;

  const tr = _olSatirlar.map((satir, i) => {
    const hucreler = sutunlar.map(c => {
      if (c.key === 'siraNo') {
        return `<td style="padding:5px 8px;font-size:12.5px;border:1px solid #e4e8ec;text-align:center;color:var(--ink-muted);">${i + 1}</td>`;
      }
      const deger = c.fn(satir, i);
      return `<td style="padding:2px;border:1px solid #e4e8ec;text-align:${ortalanacakAnahtarlar.includes(c.key) ? 'center' : 'left'};">
        <input type="text" value="${escapeHtml(deger)}" data-row="${i}" data-key="${c.key}" oninput="olHucreDegisti(this)"
          style="width:100%;min-width:60px;border:none;background:transparent;padding:4px 6px;font-size:12.5px;text-align:inherit;color:inherit;">
      </td>`;
    }).join('');
    return `<tr style="${i % 2 === 1 ? 'background:#f2f5f8;' : ''}">${hucreler}
      <td style="border:1px solid #e4e8ec;text-align:center;">
        <button type="button" class="btn btn-ghost btn-sm" style="color:#c0392b;padding:2px 7px;" onclick="olSatirSil(${i})" title="Satırı sil">✕</button>
      </td></tr>`;
  }).join('');

  alan.innerHTML = `
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>${th}</tr></thead>
      <tbody>${tr}</tbody>
    </table>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;flex-wrap:wrap;gap:8px;">
      <button class="btn btn-ghost btn-sm" onclick="olSatirEkle()">+ Satır Ekle</button>
      <div style="font-size:12px;color:var(--ink-muted);">Toplam satır: <strong>${_olSatirlar.length}</strong></div>
    </div>
  `;
}

/* Bir hücreye yazıldıkça anında çalışma verisine (_olSatirlar) yaz —
   tüm tabloyu yeniden çizmiyoruz ki yazarken imleç/odak kaybolmasın. */
function olHucreDegisti(input) {
  const i = parseInt(input.dataset.row, 10);
  const key = input.dataset.key;
  if (!_olSatirlar[i] || !key) return;
  _olSatirlar[i][key] = input.value;
}

function olSatirEkle() {
  _olSatirlar.push({ ogrenciAdi: '', ogrenciNo: '', cinsiyet: '', veliAdi: '', yakinlik1: '', telefon1: '', telefon2: '', adres: '', servisAdi: '', notlar: '' });
  olOnizlemeGuncelle();
}

function olSatirSil(i) {
  if (!confirm('Bu satırı silmek istiyor musunuz?')) return;
  _olSatirlar.splice(i, 1);
  olOnizlemeGuncelle();
}

/* ---------- sütun düzenini "şablon" olarak kaydet (sadece kolon tercihleri, veri yok) ---------- */
async function olSablonKaydet() {
  if (!_olSeciliSinif) { toast('Önce bir sınıf seçin.'); return; }
  const sutunSirasi = [...document.querySelectorAll('.ol-sutun-satir')].map(satir => satir.dataset.key);
  const seciliKeyler = [...document.querySelectorAll('.ol-sutun-check')].filter(el => el.checked).map(el => el.value);
  const ozelSutunlar = [...document.querySelectorAll('.ol-ozel-sutun-satir')]
    .map(el => ({ id: el.dataset.id, label: (el.querySelector('.ol-ozel-sutun-input')?.value || '').trim() }))
    .filter(o => o.label);
  const ben = bagliOgretmenimGetir();

  try {
    await db.collection('oy_ogretmenListeSablon').doc(olSablonId(_olSeciliSinif)).set({
      ogretmenId: ben.id,
      sinif: _olSeciliSinif,
      secilenKeyler: seciliKeyler,
      sutunSirasi: sutunSirasi,
      ozelSutunlar: ozelSutunlar,
      baslikBilgisi: olBaslikBilgisiGetir(),
      guncellenme: new Date().toISOString(),
    });
    toast('Sütun düzeni şablon olarak kaydedildi. Bu sınıf için yeni bir çizelge oluşturduğunuzda varsayılan olarak gelecek.');
  } catch (e) {
    console.error(e);
    toast('Şablon kaydedilemedi.');
  }
}

/* ====================================================================
   KAYITLI ÇİZELGELER — isimli, kalıcı, elle düzenlenebilir tablolar.
   Bir sınıf için istenildiği kadar çizelge oluşturulup saklanabilir.
   ==================================================================== */

async function olKayitliCizelgeleriGetir(sinifAdi) {
  const ben = bagliOgretmenimGetir();
  if (!ben) return [];
  try {
    const qs = await db.collection('oy_ogretmenListeKayit')
      .where('ogretmenId', '==', ben.id)
      .where('sinif', '==', sinifAdi)
      .get();
    return qs.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.guncellenme || '').localeCompare(a.guncellenme || ''));
  } catch (e) {
    console.error('Kayıtlı çizelgeler okunamadı:', e);
    return [];
  }
}

async function olCizelgeleriYenile() {
  const kap = document.getElementById('olCizelgeListesi');
  if (!kap) return;
  const liste = await olKayitliCizelgeleriGetir(_olSeciliSinif);
  _olKayitliCizelgeler = liste;

  if (!kap) return; // sınıf değiştirilmiş olabilir, DOM artık farklı

  if (!liste.length) {
    kap.innerHTML = `<div style="font-size:12.5px;color:var(--ink-muted);padding:6px 2px;">Bu sınıf için henüz kayıtlı bir çizelge yok. Aşağıdaki formu doldurup "Çizelgeyi Kaydet" ile ilkini oluşturabilirsiniz.</div>`;
    return;
  }

  kap.innerHTML = liste.map(c => `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 6px;border-bottom:1px solid var(--border);${c.id === _olAcikCizelgeId ? 'background:var(--nm-bg,#f0f0f3);border-radius:8px;' : ''}">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:13px;">${escapeHtml(c.ad || 'İsimsiz Çizelge')}${c.id === _olAcikCizelgeId ? ' <span style="font-weight:400;color:var(--ink-muted);font-size:11.5px;">(açık)</span>' : ''}</div>
        <div style="font-size:11.5px;color:var(--ink-muted);">${c.guncellenme ? new Date(c.guncellenme).toLocaleDateString('tr-TR') : ''} · ${(c.satirlar || []).length} satır</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="olCizelgeAc('${c.id}')">Aç</button>
      <button class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="olCizelgeSil('${c.id}')">Sil</button>
    </div>`).join('');
}

function olYeniCizelge() {
  if (!_olSeciliSinif) { toast('Önce bir sınıf seçin.'); return; }
  _olAcikCizelgeId = null;
  _olSatirlar = olSatirlariRosterdenOlustur();
  olCalismaAlaniOlustur(null, '');
  toast('Yeni çizelge — güncel sınıf listesinden dolduruldu. Dilediğiniz gibi düzenleyip bir ad vererek kaydedebilirsiniz.');
}

async function olCizelgeAc(id) {
  const c = (_olKayitliCizelgeler || []).find(x => x.id === id);
  if (!c) { toast('Çizelge bulunamadı, liste yenileniyor…'); olCizelgeleriYenile(); return; }
  _olAcikCizelgeId = id;
  _olSatirlar = Array.isArray(c.satirlar) ? c.satirlar.map(s => ({ ...s })) : [];
  await olCalismaAlaniOlustur({
    secilenKeyler: c.secilenKeyler,
    sutunSirasi: c.sutunSirasi,
    ozelSutunlar: c.ozelSutunlar,
    baslikBilgisi: c.baslikBilgisi,
  }, c.ad || '');
  toast(`"${c.ad || 'Çizelge'}" açıldı — düzenleyip tekrar kaydedebilirsiniz.`);
}

async function olCizelgeSil(id) {
  const c = (_olKayitliCizelgeler || []).find(x => x.id === id);
  if (!confirm(`"${c ? c.ad : 'Bu çizelgeyi'}" silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
  try {
    await db.collection('oy_ogretmenListeKayit').doc(id).delete();
    if (_olAcikCizelgeId === id) {
      _olAcikCizelgeId = null;
      const adEl = document.getElementById('olCizelgeAdi');
      if (adEl) adEl.value = '';
      const durumEl = document.getElementById('olCizelgeDurumMetni');
      if (durumEl) durumEl.textContent = 'Kaydettiğinizde yeni bir çizelge olarak eklenir.';
    }
    toast('Çizelge silindi.');
    olCizelgeleriYenile();
  } catch (e) {
    console.error(e);
    toast('Çizelge silinemedi.');
  }
}

async function olCizelgeyiKaydet() {
  if (!_olSeciliSinif) { toast('Önce bir sınıf seçin.'); return; }
  const adEl = document.getElementById('olCizelgeAdi');
  const ad = (adEl?.value || '').trim();
  if (!ad) { toast('Lütfen çizelgeye bir ad verin (örn: "Türkçe 1. Dönem 1. Yazılı").'); adEl?.focus(); return; }

  try {
    const ben = (typeof bagliOgretmenimGetir === 'function') ? bagliOgretmenimGetir() : null;
    if (!ben || !ben.id) { toast('Öğretmen kaydınız bulunamadı, çizelge kaydedilemedi.'); return; }

    const sutunSirasi = [...document.querySelectorAll('.ol-sutun-satir')].map(satir => satir.dataset.key);
    const seciliKeyler = [...document.querySelectorAll('.ol-sutun-check')].filter(el => el.checked).map(el => el.value);
    const ozelSutunlar = [...document.querySelectorAll('.ol-ozel-sutun-satir')]
      .map(el => ({ id: el.dataset.id, label: (el.querySelector('.ol-ozel-sutun-input')?.value || '').trim() }))
      .filter(o => o.label);

    const veri = {
      ogretmenId: ben.id,
      sinif: _olSeciliSinif,
      ad,
      secilenKeyler: seciliKeyler,
      sutunSirasi,
      ozelSutunlar,
      satirlar: _olSatirlar,
      baslikBilgisi: olBaslikBilgisiGetir(),
      guncellenme: new Date().toISOString(),
    };

    if (_olAcikCizelgeId) {
      await db.collection('oy_ogretmenListeKayit').doc(_olAcikCizelgeId).update(veri);
    } else {
      veri.olusturulma = veri.guncellenme;
      const ref = await db.collection('oy_ogretmenListeKayit').add(veri);
      _olAcikCizelgeId = ref.id;
      const durumEl = document.getElementById('olCizelgeDurumMetni');
      if (durumEl) durumEl.textContent = 'Mevcut bir çizelgeyi düzenliyorsunuz — "Çizelgeyi Kaydet" değişiklikleri üzerine yazar.';
    }
    toast(`"${ad}" kaydedildi.`);
    olCizelgeleriYenile();
  } catch (e) {
    console.error('Çizelge kaydedilemedi (detay):', e);
    toast('Çizelge kaydedilemedi: ' + (e && e.message ? e.message : 'bilinmeyen hata — ayrıntı için konsola bakın'));
  }
}

/* ---------- yazdırma (dikey/yatay seçilebilir + zebra desen) ---------- */
async function olYazdir() {
  const sutunlar = olTumSutunlariGetir();
  const ogrenciler = _olSatirlar;
  if (!sutunlar.length) { toast('En az bir sütun seçin.'); return; }

  const bs = olBaslikBilgisiGetir();
  const logo = await olLogoDataUriGetir();

  const ortalanacakAnahtarlar = ['siraNo', 'ogrenciNo'];
  const thHTML = sutunlar.map(c => `<th class="${ortalanacakAnahtarlar.includes(c.key) ? 'ortali' : ''}">${escapeHtml(c.label)}</th>`).join('');
  const trHTML = ogrenciler.map((v, i) =>
    `<tr>${sutunlar.map(c => `<td class="${ortalanacakAnahtarlar.includes(c.key) ? 'ortali' : ''}">${escapeHtml(c.fn(v, i))}</td>`).join('')}</tr>`
  ).join('');

  const metaParcalar = [];
  if (bs.egitimYiliGoster && bs.egitimYili) metaParcalar.push(escapeHtml(bs.egitimYili) + ' Eğitim-Öğretim Yılı');

  const imzaSol = bs.ogretmenGoster
    ? `Öğretmen: <strong>${escapeHtml(bs.ogretmenAdSoyad || '...............................')}</strong>` +
      (bs.ogretmenBransGoster && bs.ogretmenBrans ? `<br>${escapeHtml(bs.ogretmenBrans)}` : '') +
      `<br><br>İmza: .......................`
    : '';
  const imzaSag = bs.mudurGoster
    ? `${bs.mudurUnvanGoster && bs.mudurUnvan ? escapeHtml(bs.mudurUnvan) : 'Okul Müdürü'}: <strong>${escapeHtml(bs.mudurAdSoyad || '...............................')}</strong>` +
      `<br><br>İmza: .......................`
    : '';

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(_olSeciliSinif)} Öğrenci Listesi</title>
<style>
  @page { size: A4 ${bs.yon}; margin: 1.2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; }
  .header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; border-bottom: 2px solid #333; padding-bottom: 10px; }
  .header .logo { width: 64px; height: 64px; object-fit: contain; flex-shrink: 0; }
  .header .metin { flex: 1; text-align: center; }
  .header .logo-bosluk { width: 64px; flex-shrink: 0; }
  .header .okul { font-size: 15px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; }
  .header .baslik { font-size: 13px; font-weight: 600; margin-top: 5px; }
  .header .alt-baslik { font-size: 11px; margin-top: 3px; color: #444; }
  .header .meta { font-size: 10px; color: #666; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background: #1B3A5C; color: #fff; padding: 5px 6px; text-align: left; font-size: 10px; font-weight: 600; white-space: nowrap; border: 1px solid #1B3A5C; }
  td { padding: 4px 6px; border: 1px solid #ddd; vertical-align: top; }
  th.ortali, td.ortali { text-align: center; }
  tr:nth-child(even) td { background: #f7f7f7; }
  tr:last-child td { border-bottom: 2px solid #333; }
  .ogrenci-sayisi { margin-top: 8px; font-size: 10px; color: #444; text-align: right; }
  .footer { margin-top: 16px; display: flex; justify-content: space-between; font-size: 10px; color: #444; line-height: 1.8; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    ${logo ? `<img class="logo" src="${logo}" alt="Okul Logosu">` : ''}
    <div class="metin">
      ${bs.okulAdiGoster && bs.okulAdi ? `<div class="okul">${escapeHtml(bs.okulAdi)}</div>` : ''}
      <div class="baslik">${escapeHtml(_olSeciliSinif)} Sınıfı Öğrenci Listesi</div>
      ${bs.altBaslikGoster && bs.altBaslik ? `<div class="alt-baslik">${escapeHtml(bs.altBaslik)}</div>` : ''}
      ${metaParcalar.length ? `<div class="meta">${metaParcalar.join(' &nbsp;·&nbsp; ')}</div>` : ''}
    </div>
    ${logo ? `<div class="logo-bosluk"></div>` : ''}
  </div>
  <table>
    <thead><tr>${thHTML}</tr></thead>
    <tbody>${trHTML}</tbody>
  </table>
  <div class="ogrenci-sayisi">Toplam öğrenci sayısı: <strong>${ogrenciler.length}</strong></div>
  ${(imzaSol || imzaSag) ? `<div class="footer"><div>${imzaSol}</div><div style="text-align:right;">${imzaSag}</div></div>` : ''}
</body>
</html>`;

  // Android'de window.open + window.print() çıplak WebView'de çalışmıyor —
  // uygulama genelinde kullanılan ortak yazdırma yardımcısı (native
  // PrintPlugin / blob-URL fallback) üzerinden yazdırılıyor.
  uygulamaHtmlYazdir(html, `${_olSeciliSinif}_Ogrenci_Listesi`, bs.yon === 'landscape' ? 'yatay' : 'dikey');
}

/* ---------- Excel'e aktar ----------
   Not: Bu projede daha önce kullanılan SheetJS'in (XLSX) ücretsiz sürümü
   .xlsx yazarken hücre biçimlendirmesi (kalın yazı, dolgu rengi, kenarlık,
   donmuş satır) uygulayamıyor — sadece ham veri yazılabiliyor. Bu yüzden
   yazma işlemi için, uygulamada zaten yüklü olan ve tam biçimlendirme
   desteği sunan ExcelJS kütüphanesi kullanılıyor (bkz. dokuman-okuyucu.js
   içindeki aynı gerekçe). */
async function olExcelAktar() {
  const sutunlar = olTumSutunlariGetir();
  const ogrenciler = _olSatirlar;
  if (!sutunlar.length) { toast('En az bir sütun seçin.'); return; }
  if (typeof ExcelJS === 'undefined') { toast('Excel kütüphanesi yüklenemedi.'); return; }

  const bs = olBaslikBilgisiGetir();
  const sutunSayisi = sutunlar.length;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet((_olSeciliSinif || 'Liste').slice(0, 31));
  ws.columns = sutunlar.map(() => ({ width: 18 }));

  let satirNo = 1;
  const baslikSatiriEkle = (metin, { boyut = 11, renk = 'FF1B3A5C', yukseklik = 18 } = {}) => {
    ws.mergeCells(satirNo, 1, satirNo, sutunSayisi);
    const hucre = ws.getCell(satirNo, 1);
    hucre.value = metin;
    hucre.alignment = { horizontal: 'center', vertical: 'middle' };
    hucre.font = { bold: true, size: boyut, color: { argb: renk } };
    ws.getRow(satirNo).height = yukseklik;
    satirNo++;
  };

  if (bs.okulAdiGoster && bs.okulAdi) baslikSatiriEkle(bs.okulAdi, { boyut: 13 });
  baslikSatiriEkle(`${_olSeciliSinif} Sınıfı Öğrenci Listesi`, { boyut: 12 });
  if (bs.altBaslikGoster && bs.altBaslik) baslikSatiriEkle(bs.altBaslik, { boyut: 10, renk: 'FF444444' });
  if (bs.egitimYiliGoster && bs.egitimYili) baslikSatiriEkle(`${bs.egitimYili} Eğitim-Öğretim Yılı`, { boyut: 9, renk: 'FF666666', yukseklik: 16 });
  satirNo++; // boş satır

  const basliklarRowNo = satirNo;
  const basliklarRow = ws.getRow(basliklarRowNo);
  const kenarlikIncGri = { style: 'thin', color: { argb: 'FFB8C2CC' } };
  const ortalanacakAnahtarlar = ['siraNo', 'ogrenciNo'];
  sutunlar.forEach((c, i) => {
    const hucre = basliklarRow.getCell(i + 1);
    hucre.value = c.label;
    hucre.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    hucre.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B3A5C' } };
    hucre.alignment = { horizontal: ortalanacakAnahtarlar.includes(c.key) ? 'center' : 'left', vertical: 'middle' };
    hucre.border = { top: kenarlikIncGri, left: kenarlikIncGri, bottom: kenarlikIncGri, right: kenarlikIncGri };
  });
  basliklarRow.height = 20;
  satirNo++;

  ogrenciler.forEach((v, i) => {
    const row = ws.getRow(satirNo);
    sutunlar.forEach((c, ci) => {
      const hucre = row.getCell(ci + 1);
      hucre.value = c.fn(v, i);
      hucre.font = { size: 10 };
      hucre.border = { top: kenarlikIncGri, left: kenarlikIncGri, bottom: kenarlikIncGri, right: kenarlikIncGri };
      hucre.alignment = { vertical: 'middle', horizontal: ortalanacakAnahtarlar.includes(c.key) ? 'center' : 'left' };
      if (i % 2 === 1) hucre.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };
    });
    satirNo++;
  });

  const toplamHucre = ws.getCell(satirNo, 1);
  ws.mergeCells(satirNo, 1, satirNo, sutunSayisi);
  toplamHucre.value = `Toplam öğrenci sayısı: ${ogrenciler.length}`;
  toplamHucre.font = { italic: true, size: 9, color: { argb: 'FF444444' } };
  toplamHucre.alignment = { horizontal: 'right' };

  ws.views = [{ state: 'frozen', ySplit: basliklarRowNo }];

  const dosyaAdi = `${_olSeciliSinif}_Ogrenci_Listesi.xlsx`;
  const mimeTuru = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  try {
    const buffer = await wb.xlsx.writeBuffer();
    // Android'in çıplak WebView'i <a download> ile blob indirmeyi
    // desteklemiyor — bu yüzden uygulama genelindeki ortak kaydetme
    // yardımcısı (native SavePlugin / blob fallback) kullanılıyor.
    if (typeof uygulamaDosyaKaydet === 'function') {
      uygulamaDosyaKaydet(olArrayBufferToBase64(buffer), dosyaAdi, mimeTuru);
    } else {
      const blob = new Blob([buffer], { type: mimeTuru });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = dosyaAdi; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  } catch (e) {
    console.error('Excel oluşturulamadı:', e);
    toast('Excel oluşturulamadı.');
  }
}

/* ---------- PDF'e aktar ---------- */
async function olPdfAktar() {
  const sutunlar = olTumSutunlariGetir();
  const ogrenciler = _olSatirlar;
  if (!sutunlar.length) { toast('En az bir sütun seçin.'); return; }
  if (typeof window.jspdf === 'undefined') { toast('PDF kütüphanesi yüklenemedi.'); return; }

  const bs = olBaslikBilgisiGetir();
  const logo = await olLogoDataUriGetir();
  const fontB64 = await olPdfFontBase64Getir();
  const fontAdi = fontB64 ? 'Roboto' : 'helvetica'; // Roboto Türkçe karakterleri (ı,ğ,ş,İ,Ğ,Ş) destekliyor
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: bs.yon === 'landscape' ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });

  if (fontB64) {
    doc.addFileToVFS('Roboto-Regular.ttf', fontB64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  }
  doc.setFont(fontAdi, 'normal');

  const logoBoyutu = 26; // mm — daha büyük logo
  const logoX = 12, logoY = 8;
  const metinX = logo ? logoX + logoBoyutu + 5 : 14; // logonun sağından yeterli boşluk bırak
  if (logo) {
    try { doc.addImage(logo, 'PNG', logoX, logoY, logoBoyutu, logoBoyutu); } catch (e) { console.warn('PDF logo eklenemedi:', e); }
  }

  let y = 14;
  if (bs.okulAdiGoster && bs.okulAdi) { doc.setFontSize(9); doc.text(bs.okulAdi, metinX, y); y += 6; }
  doc.setFontSize(12);
  doc.text(`${_olSeciliSinif} Sınıfı Öğrenci Listesi`, metinX, y); y += 6;
  if (bs.altBaslikGoster && bs.altBaslik) { doc.setFontSize(9); doc.text(bs.altBaslik, metinX, y); y += 5; }
  if (bs.egitimYiliGoster && bs.egitimYili) { doc.setFontSize(8); doc.setTextColor(100); doc.text(`${bs.egitimYili} Eğitim-Öğretim Yılı`, metinX, y); doc.setTextColor(0); y += 4; }
  y = Math.max(y, logo ? logoY + logoBoyutu + 4 : y);

  // Sıra No / Öğrenci No sütunları ortaya hizalı olsun (kullanıcı sütun sırasını
  // değiştirebildiği için indeksi burada, güncel sıraya göre buluyoruz).
  const ortalanacakAnahtarlar = ['siraNo', 'ogrenciNo'];
  const sutunStilleri = {};
  sutunlar.forEach((c, i) => {
    if (ortalanacakAnahtarlar.includes(c.key)) sutunStilleri[i] = { halign: 'center' };
  });

  doc.autoTable({
    startY: y + 2,
    head: [sutunlar.map(c => c.label)],
    body: ogrenciler.map((v, i) => sutunlar.map(c => c.fn(v, i))),
    theme: 'grid', // sütunlar arasında da kenarlık olsun
    styles: { fontSize: 8, cellPadding: 1.5, font: fontAdi, fontStyle: 'normal', lineWidth: 0.1, lineColor: [200, 200, 200] },
    headStyles: { fillColor: [27, 58, 92], textColor: 255, font: fontAdi, fontStyle: 'normal', lineColor: [27, 58, 92] },
    columnStyles: sutunStilleri,
    alternateRowStyles: { fillColor: [247, 247, 247] }, // zebra desen
    didDrawPage: (data) => {
      // İmza/onay satırı — sadece son sayfada
      if (data.pageNumber === doc.internal.getNumberOfPages()) {
        const yFooter = data.cursor.y + 14;
        const sayfaGenislik = doc.internal.pageSize.getWidth();
        doc.setFont(fontAdi, 'normal');
        doc.setFontSize(8);
        if (bs.ogretmenGoster) {
          const brans = bs.ogretmenBransGoster && bs.ogretmenBrans ? ` (${bs.ogretmenBrans})` : '';
          doc.text(`Öğretmen: ${bs.ogretmenAdSoyad || '...............................'}${brans}`, 14, yFooter);
          doc.text('İmza: .......................', 14, yFooter + 6);
        }
        if (bs.mudurGoster) {
          const unvan = bs.mudurUnvanGoster && bs.mudurUnvan ? bs.mudurUnvan : 'Okul Müdürü';
          doc.text(`${unvan}: ${bs.mudurAdSoyad || '...............................'}`, sayfaGenislik - 90, yFooter);
          doc.text('İmza: .......................', sayfaGenislik - 90, yFooter + 6);
        }
      }
    },
  });

  const dosyaAdi = `${_olSeciliSinif}_Ogrenci_Listesi.pdf`;

  // Android'in çıplak WebView'i doc.save() (blob + <a download>) ile
  // dosya indirmeyi desteklemiyor — bu yüzden ortak kaydetme yardımcısı
  // (native SavePlugin / blob fallback) üzerinden kaydediliyor.
  if (typeof uygulamaDosyaKaydet === 'function') {
    const datauri = doc.output('datauristring');
    const base64 = datauri.split('base64,')[1];
    uygulamaDosyaKaydet(base64, dosyaAdi, 'application/pdf');
  } else {
    doc.save(dosyaAdi); // yardımcı yoksa eski yönteme dön
  }
}
