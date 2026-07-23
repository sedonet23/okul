/* ================================================================
   js/depolama-sinirlari.js
   Ayarlar > "Depolama Sınırları" bölümünün render mantığı. Veri kaynağı:
   js/core/services/depolama-sinir.service.js (DepolamaSinirService).
   Her kategori (mesaj/duyuru/dokuman/takvim) kendi satırında ayrı ayrı
   aç/kapa + MB girişine sahiptir; her satırın kendi "Kaydet" butonu vardır.
   ================================================================ */

let depolamaAyarlariGuncel = null;

function depolamaSinirlariBaglantisiKur(){
  if(typeof DepolamaSinirService === 'undefined') return;
  DepolamaSinirService.dinle(ayarlar => {
    depolamaAyarlariGuncel = ayarlar;
    renderDepolamaSinirlariForm();
  });
}

function renderDepolamaSinirlariForm(){
  const kutu = document.getElementById('depolamaSinirlariForm');
  if(!kutu) return;
  const ayarlar = depolamaAyarlariGuncel || DepolamaSinirService.varsayilanAyarlar();
  kutu.innerHTML = DEPOLAMA_KATEGORILERI.map(kategori => {
    const a = ayarlar[kategori] || { aktif:true, MB:100 };
    return `
      <div class="depolama-sinir-satir" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--border);">
        <label style="display:flex;align-items:center;gap:8px;flex:1;min-width:180px;font-weight:700;font-size:13px;">
          <input type="checkbox" id="depSinir_${kategori}_aktif" ${a.aktif ? 'checked' : ''}>
          ${DEPOLAMA_KATEGORI_ADLARI[kategori] || kategori}
        </label>
        <input type="number" id="depSinir_${kategori}_mb" value="${a.MB}" min="1" step="1" style="width:90px;flex:0 0 auto;" placeholder="MB">
        <span style="font-size:12px;color:var(--ink-muted);flex:0 0 auto;">MB / kullanıcı</span>
        <button class="btn btn-ghost btn-sm" style="flex:0 0 auto;" onclick="depolamaSinirSatiriKaydet('${kategori}')">💾 Kaydet</button>
      </div>`;
  }).join('');
}

function depolamaSinirSatiriKaydet(kategori){
  const aktifEl = document.getElementById(`depSinir_${kategori}_aktif`);
  const mbEl = document.getElementById(`depSinir_${kategori}_mb`);
  if(!aktifEl || !mbEl) return;
  const mb = parseInt(mbEl.value);
  if(!mb || mb < 1){ toast('Geçerli bir MB değeri girin.'); return; }
  DepolamaSinirService.kaydet({ [kategori]: { aktif: aktifEl.checked, MB: mb } })
    .then(()=> toast(`${DEPOLAMA_KATEGORI_ADLARI[kategori] || kategori} sınırı kaydedildi.`))
    .catch(err => { if(err.message!=='yetkisiz') toast('Hata: '+err.message); else toast('Bu işlem için yetkiniz yok.'); });
}
