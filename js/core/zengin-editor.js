/* ================================================================
   js/core/zengin-editor.js
   PAYLAŞILAN ZENGİN METİN EDİTÖRÜ ARAÇ ÇUBUĞU
   ----------------------------------------------------------------
   Resmi belge modüllerinde (Dilekçe, Tutanak, Tebliğ-Tebellüğ Belgesi,
   Görevlendirme Belgesi, Maaş Değişikliği Bildirimi) kullanılan ortak
   bir biçimlendirme araç çubuğu. Her modül, belgesini bir <iframe>
   içinde contenteditable olarak gösteriyor (A4 sayfa boyutu/yazdırma
   stilini izole tutmak için) — bu modül, o iframe'in İÇİNDEKİ
   düzenlenebilir alana kalın/italik/hizalama/liste gibi biçimlendirme
   uygulayan basit bir araç çubuğu üretir ve bağlar.

   Kullanım:
     1) Form panelinizin HTML'ine şunu ekleyin:
          ${zenginEditorAracCubugu('benimIframeId')}
     2) İframe DOM'a eklenip İÇERİĞİ YÜKLENDİKTEN SONRA şunu çağırın:
          zenginEditorBaglantiKur('benimIframeId');
        (iframe'in kendi belgesi her yeniden yazıldığında —
        iframe.srcdoc/document.write değiştiğinde — TEKRAR çağırmanız
        gerekir, çünkü execCommand hedefi olan document nesnesi yenilenir.)

   Not: document.execCommand() modern tarayıcılarda "deprecated" olarak
   işaretlenmiş olsa da, TÜM güncel tarayıcılarda (Chrome, Edge,
   Safari, Firefox) hâlâ tam destekleniyor ve basit biçimlendirme
   ihtiyaçları için harici bir kütüphane gerektirmeyen en pratik çözüm.
   ================================================================ */

function zenginEditorAracCubugu(hedefIframeId){
  return `
  <div class="zed-toolbar" data-hedef="${hedefIframeId}">
    <button type="button" data-cmd="bold" title="Kalın"><b>K</b></button>
    <button type="button" data-cmd="italic" title="İtalik"><i>İ</i></button>
    <button type="button" data-cmd="underline" title="Altı Çizili"><u>A</u></button>
    <span class="zed-ayrac"></span>
    <button type="button" data-cmd="justifyLeft" title="Sola Yasla">⬅</button>
    <button type="button" data-cmd="justifyCenter" title="Ortala">⬌</button>
    <button type="button" data-cmd="justifyFull" title="İki Yana Yasla">☰</button>
    <span class="zed-ayrac"></span>
    <button type="button" data-cmd="insertUnorderedList" title="Madde İşaretli Liste">• Liste</button>
    <button type="button" data-cmd="insertOrderedList" title="Numaralı Liste">1. Liste</button>
    <span class="zed-ayrac"></span>
    <select data-cmd="fontSize" title="Yazı Boyutu">
      <option value="2">Küçük</option>
      <option value="3" selected>Normal</option>
      <option value="5">Büyük</option>
      <option value="6">Çok Büyük</option>
    </select>
    <button type="button" data-cmd="removeFormat" title="Biçimlendirmeyi Temizle">Temizle</button>
  </div>`;
}

function zenginEditorBaglantiKur(hedefIframeId){
  const toolbar = document.querySelector(`.zed-toolbar[data-hedef="${hedefIframeId}"]`);
  if(!toolbar) return;

  const _komutCalistir = (cmd, deger) => {
    const iframe = document.getElementById(hedefIframeId);
    if(!iframe || !iframe.contentDocument) return;
    // Editör alanına odaklanmadan execCommand doğru hedefe uygulanmaz.
    iframe.contentWindow.focus();
    try{ iframe.contentDocument.execCommand(cmd, false, deger || null); }catch(e){}
  };

  toolbar.querySelectorAll('button[data-cmd]').forEach(btn=>{
    btn.onclick = (e) => { e.preventDefault(); _komutCalistir(btn.dataset.cmd); };
  });
  const boyutSecici = toolbar.querySelector('select[data-cmd="fontSize"]');
  if(boyutSecici){
    boyutSecici.onchange = () => _komutCalistir('fontSize', boyutSecici.value);
  }
}
