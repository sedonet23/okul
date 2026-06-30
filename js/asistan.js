/* ====================================================================
   AI ASİSTAN MODÜLÜ
   Form, rapor, nöbet önerisi, liste, dilekçe, not, hatırlatıcı/görev
   taslakları üretir. AI hiçbir zaman doğrudan Firestore'a yazmaz;
   kullanıcı taslağı onaylayıp "Kaydet"e bastığında ilgili modülün
   mevcut kaydet() / koleksiyon yapısı kullanılır.
   ==================================================================== */

// ↓↓↓ Worker'ı deploy ettikten sonra burayı kendi Worker URL'inle değiştir
const ASISTAN_API_URL = "https://okul-ai-asistan.sedonet23.workers.dev";

let asistanGecmis = []; // [{role:'user'|'model', text}]
let asistanYukleniyor = false;

function asistanPanelRender() {
  const kutu = document.getElementById('asistanMesajlar');
  if (!kutu) return;
  kutu.innerHTML = asistanGecmis.map(m => `
    <div class="asistan-msg asistan-msg-${m.role}">
      <div class="asistan-msg-bubble">${escapeHtml(m.text).replace(/\n/g, '<br>')}</div>
    </div>
  `).join('') + (asistanYukleniyor ? `
    <div class="asistan-msg asistan-msg-model">
      <div class="asistan-msg-bubble asistan-typing">Yazıyor…</div>
    </div>` : '');
  kutu.scrollTop = kutu.scrollHeight;
}

/* ---------- Uygulama verisinden AI için kısa özet üret ---------- */
function asistanVeriOzeti() {
  try {
    const bugun = _isoToday ? _isoToday() : new Date().toISOString().slice(0,10);
    const parcalar = [];
    parcalar.push(`Bugünün tarihi: ${bugun}`);

    if (typeof ogretmenler !== 'undefined' && ogretmenler.length) {
      parcalar.push(`Öğretmenler (${ogretmenler.length}): ` + ogretmenler
        .map(o => `${o.ad || ''} ${o.soyad || ''}${o.brans ? ' ('+o.brans+')' : ''}`.trim())
        .join(', '));
    }

    if (typeof siniflar !== 'undefined' && siniflar.length) {
      parcalar.push(`Sınıflar (${siniflar.length}): ` + siniflar
        .map(s => {
          const ogr = (typeof veliler !== 'undefined') ? veliler.filter(v => v.sinifId === s.id).length : (s.ogrenciSayisi || 0);
          return `${s.seviye || ''}-${s.sube || ''} (${ogr} öğrenci)`;
        })
        .join(', '));
    }

    if (typeof gorevler !== 'undefined' && gorevler.length) {
      const acik = gorevler.filter(g => !(g.tamamlandi === true || g.durum === 'tamamlandi'));
      parcalar.push(`Açık görevler (${acik.length}): ` + acik.slice(0, 15)
        .map(g => `${g.baslik || ''}${g.tarih ? ' ('+g.tarih+')' : ''}`)
        .join(', '));
    }

    if (typeof hatirlaticilar !== 'undefined' && hatirlaticilar.length) {
      parcalar.push(`Hatırlatıcılar (${hatirlaticilar.length}): ` + hatirlaticilar.slice(0, 15)
        .map(h => `${h.baslik || ''}${h.tarih ? ' ('+h.tarih+')' : ''}`)
        .join(', '));
    }

    if (typeof notlar !== 'undefined' && notlar.length) {
      parcalar.push(`Not sayısı: ${notlar.length}`);
    }

    if (typeof nobetAtamalari !== 'undefined' && nobetAtamalari.length) {
      const yakin = nobetAtamalari.filter(n => n.tarih >= bugun).sort((a,b)=> a.tarih.localeCompare(b.tarih)).slice(0, 20);
      parcalar.push(`Yaklaşan nöbet atamaları: ` + yakin
        .map(n => `${n.tarih} - ${n.ogretmenAdi || ''}`)
        .join(', '));
    }

    if (typeof evrakTakibi !== 'undefined' && evrakTakibi.length) {
      parcalar.push(`Evrak takibi kayıt sayısı: ${evrakTakibi.length}`);
    }

    return parcalar.join('\n');
  } catch (e) {
    console.warn('asistanVeriOzeti hata:', e);
    return '';
  }
}


async function asistanGonder() {
  const input = document.getElementById('asistanInput');
  const metin = (input.value || '').trim();
  if (!metin || asistanYukleniyor) return;

  asistanGecmis.push({ role: 'user', text: metin });
  input.value = '';
  asistanYukleniyor = true;
  asistanPanelRender();

  try {
    const res = await fetch(ASISTAN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: asistanGecmis, context: asistanVeriOzeti() })
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error || 'Bilinmeyen hata');
    }

    asistanYukleniyor = false;

    if (data.toolCall) {
      asistanGecmis.push({ role: 'model', text: `(taslak hazırlandı: ${asistanArayuzAdi(data.toolCall.name)})` });
      asistanPanelRender();
      asistanTaslakGoster(data.toolCall);
    } else {
      asistanGecmis.push({ role: 'model', text: data.text || '(boş yanıt)' });
      asistanPanelRender();
    }
  } catch (err) {
    asistanYukleniyor = false;
    asistanGecmis.push({ role: 'model', text: '⚠️ Hata: ' + err.message });
    asistanPanelRender();
  }
}

function asistanArayuzAdi(toolName) {
  return {
    taslak_not: 'Not',
    taslak_gorev: 'Görev',
    taslak_hatirlatici: 'Hatırlatıcı',
    taslak_metin: 'Belge / Metin'
  }[toolName] || toolName;
}

function asistanInputEnter(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    asistanGonder();
  }
}

/* ---------- Taslak önizleme + onay kartı ---------- */
function asistanTaslakGoster(toolCall) {
  const { name, args } = toolCall;
  let baslikAlani, icerikAlani, kaydetFn;

  if (name === 'taslak_not') {
    baslikAlani = args.baslik || '';
    icerikAlani = args.icerik || '';
    kaydetFn = () => {
      kaydet(COL.notlar, null, {
        baslik: document.getElementById('asistanTaslakBaslik').value,
        tip: 'metin',
        icerik: document.getElementById('asistanTaslakIcerik').value,
        renk: 'sari'
      });
    };
  } else if (name === 'taslak_gorev') {
    baslikAlani = args.baslik || '';
    icerikAlani = (args.tarih ? `Tarih: ${args.tarih}\n` : '') + (args.aciklama || '');
    kaydetFn = () => {
      kaydet(COL.gorevler, null, {
        baslik: document.getElementById('asistanTaslakBaslik').value,
        aciklama: document.getElementById('asistanTaslakIcerik').value,
        tarih: args.tarih || _isoToday(),
        tamamlandi: false,
        durum: 'yapilacak'
      });
    };
  } else if (name === 'taslak_hatirlatici') {
    baslikAlani = args.baslik || '';
    icerikAlani = (args.tarih ? `Tarih: ${args.tarih}\n` : '') + (args.aciklama || '');
    kaydetFn = () => {
      kaydet(COL.hatirlaticilar, null, {
        baslik: document.getElementById('asistanTaslakBaslik').value,
        aciklama: document.getElementById('asistanTaslakIcerik').value,
        tarih: args.tarih || _isoToday(),
        tamamlandi: false
      });
    };
  } else if (name === 'taslak_metin') {
    baslikAlani = args.baslik || '';
    icerikAlani = args.icerik || '';
    kaydetFn = () => {
      kaydet(COL.notlar, null, {
        baslik: document.getElementById('asistanTaslakBaslik').value,
        tip: 'metin',
        icerik: document.getElementById('asistanTaslakIcerik').value,
        renk: 'mavi'
      });
    };
  } else {
    return;
  }

  const bodyHtml = `
    <div class="form-group">
      <label>Başlık</label>
      <input type="text" id="asistanTaslakBaslik" value="${escapeHtml(baslikAlani)}">
    </div>
    <div class="form-group">
      <label>İçerik (düzenleyebilirsiniz)</label>
      <textarea id="asistanTaslakIcerik" rows="10">${escapeHtml(icerikAlani)}</textarea>
    </div>
    <div style="font-size:12px;color:var(--text-muted,#888);margin-top:6px;">
      Bu metni kopyalayıp ilgili dilekçe/form şablonuna da yapıştırabilirsiniz.
      "Kaydet" derseniz ${asistanArayuzAdi(name)} olarak ${name === 'taslak_metin' || name === 'taslak_not' ? 'Notlar' : (name === 'taslak_gorev' ? 'Görevler' : 'Hatırlatıcılar')} listesine eklenir.
    </div>
  `;

  modalAc(`Taslak Onayı — ${asistanArayuzAdi(name)}`, bodyHtml, () => {
    kaydetFn();
    modalKapat();
    toast('Taslak kaydedildi.');
  }, null, 'Kaydet');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('asistanGonderBtn')?.addEventListener('click', asistanGonder);
  document.getElementById('asistanInput')?.addEventListener('keydown', asistanInputEnter);
});
