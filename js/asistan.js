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
      body: JSON.stringify({ messages: asistanGecmis })
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
