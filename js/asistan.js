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

/* ---------- Uygulama verisinden AI için tam özet üret ---------- */
function asistanVeriOzeti() {
  try {
    const bugun = (typeof _isoToday === 'function') ? _isoToday() : new Date().toISOString().slice(0,10);
    const sinifAdi = id => {
      if (typeof siniflar === 'undefined') return '?';
      const s = siniflar.find(x => x.id === id);
      return s ? `${s.seviye || ''}-${s.sube || ''}` : '?';
    };
    const ogretmenAdiX = id => {
      if (typeof ogretmenler === 'undefined') return '?';
      const o = ogretmenler.find(x => x.id === id);
      return o ? `${o.ad || ''} ${o.soyad || ''}`.trim() : '?';
    };

    const veri = { bugun };

    if (typeof ogretmenler !== 'undefined') {
      veri.ogretmenler = ogretmenler.map(o => ({ ad: `${o.ad||''} ${o.soyad||''}`.trim(), brans: o.brans || '', unvan: o.unvan || '', telefon: o.telefon || '' }));
    }
    if (typeof siniflar !== 'undefined') {
      veri.siniflar = siniflar.map(s => ({
        sinif: `${s.seviye||''}-${s.sube||''}`,
        ogrenciSayisi: (typeof veliler !== 'undefined') ? veliler.filter(v=>v.sinifId===s.id).length : (s.ogrenciSayisi||0),
        sinifOgretmeni: ogretmenAdiX(s.sinifOgretmeniId),
        derslik: s.derslik || ''
      }));
    }
    if (typeof veliler !== 'undefined') {
      veri.ogrenciler = veliler.map(v => ({ ad: v.ogrenciAdi || '', sinif: sinifAdi(v.sinifId), veliAdi: v.veliAdi || '', telefon: v.telefon || '' }));
    }
    if (typeof gorevler !== 'undefined') {
      veri.gorevler = gorevler.map(g => ({ baslik: g.baslik||'', tarih: g.tarih||'', tamamlandi: !!(g.tamamlandi===true||g.durum==='tamamlandi'), aciklama: g.aciklama||'' }));
    }
    if (typeof hatirlaticilar !== 'undefined') {
      veri.hatirlaticilar = hatirlaticilar.map(h => ({ baslik: h.baslik||'', tarih: h.tarih||'', aciklama: h.aciklama||'', tamamlandi: !!h.tamamlandi }));
    }
    if (typeof notlar !== 'undefined') {
      veri.notlar = notlar.map(n => ({ baslik: n.baslik||'', tip: n.tip||'', icerik: n.tip==='metin' ? String(n.icerik||'').slice(0,800) : '' }));
    }
    if (typeof evrakTakibi !== 'undefined') {
      veri.evrakTakibi = evrakTakibi.map(e => ({ ...e, id: undefined }));
    }
    if (typeof nobetYerleri !== 'undefined') veri.nobetYerleri = nobetYerleri.map(y => y.ad);
    if (typeof nobetAtamalari !== 'undefined') {
      veri.nobetAtamalari = nobetAtamalari.map(n => ({ tarih: n.tarih, yer: n.yerId, ogretmen: n.ogretmenAdi }));
    }
    if (typeof nobetciAmirleri !== 'undefined') {
      veri.nobetciAmirleri = nobetciAmirleri.map(n => ({ tarih: n.tarih, ad: n.ad }));
    }
    if (typeof resmiTatiller !== 'undefined') veri.resmiTatiller = resmiTatiller.map(r => ({ tarih: r.tarih, aciklama: r.aciklama }));
    if (typeof periyodikIsler !== 'undefined') {
      veri.periyodikIsler = periyodikIsler.map(p => ({ isAdi: p.isAdi, baslangic: p.baslangic, bitis: p.bitis, tamamlandi: !!p.tamamlandi }));
    }
    if (typeof sinavlar !== 'undefined') {
      veri.sinavlar = sinavlar.map(s => ({ sinif: s.sinif, ders: s.ders, ogretmen: ogretmenAdiX(s.ogretmenId), tarih: s.tarih, saat: s.saat, tur: s.tur }));
    }
    if (typeof denemeSinavlari !== 'undefined') {
      veri.denemeSinavlari = denemeSinavlari.map(d => ({ ad: d.ad, tarih: d.tarih }));
    }
    if (typeof servisler !== 'undefined') {
      veri.servisler = servisler.map(s => ({
        servisAdi: s.servisAdi, soforAdi: s.soforAdi, soforTelefon: s.soforTelefon,
        plaka: s.plaka || '', guzergah: s.guzergah || '', mesafe: s.mesafe || '',
        ogrenciSayisi: s.ogrenciSayisi, durum: s.durum,
        ogrenciler: (typeof veliler !== 'undefined') ? veliler.filter(v=>v.servisId===s.id).map(v=>v.ogrenciAdi) : []
      }));
    }
    if (typeof personelListesi !== 'undefined') {
      veri.personel = personelListesi.map(p => ({ ad: p.ad, soyad: p.soyad, gorev: p.gorev || p.unvan }));
    }
    if (typeof dokumanlarListesi !== 'undefined') {
      veri.dokumanlar = dokumanlarListesi.map(d => ({ ad: d.ad || d.dosyaAdi }));
    }
    if (typeof okulBilgileriAyari !== 'undefined' && okulBilgileriAyari) {
      veri.okulBilgileri = { okulAdi: okulBilgileriAyari.okulAdi || '', mudur: ogretmenAdiX(okulBilgileriAyari.mudurId) };
    }
    if (typeof cizelgeVerileri !== 'undefined') {
      veri.cizelgeler = {};
      Object.keys(cizelgeVerileri).forEach(tip => {
        veri.cizelgeler[tip] = (cizelgeVerileri[tip]||[]).map(c => ({ baslik: c.baslik || c.ad || '', tamamlandi: !!c.tamamlandi }));
      });
    }
    if (typeof belirliGunlerListesi !== 'undefined') {
      veri.belirliGunler = belirliGunlerListesi.map(b => ({ ad: b.ad, baslangic: b.baslangic, bitis: b.bitis }));
    }
    if (typeof digerEvrakListesi !== 'undefined') {
      veri.digerEvrak = digerEvrakListesi.map(d => ({ baslik: d.baslik, tamamlandi: !!d.tamamlandi }));
    }

    let json = JSON.stringify(veri);
    const LIMIT = 180000; // çok büyürse Gemini isteği reddedebilir, güvenli sınır
    if (json.length > LIMIT) {
      json = json.slice(0, LIMIT) + ' …(veri çok büyük olduğu için kısaltıldı)';
    }
    return json;
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
      NotlarService.notKaydet(null, {
        baslik: document.getElementById('asistanTaslakBaslik').value,
        tip: 'metin',
        icerik: document.getElementById('asistanTaslakIcerik').value,
        renk: 'sari'
      }).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
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
      NotlarService.notKaydet(null, {
        baslik: document.getElementById('asistanTaslakBaslik').value,
        tip: 'metin',
        icerik: document.getElementById('asistanTaslakIcerik').value,
        renk: 'mavi'
      }).catch(err=>{ if(err.message!=='yetkisiz') toast('Hata: '+err.message); });
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
