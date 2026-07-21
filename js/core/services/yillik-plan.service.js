/* =============================================================
   js/core/services/yillik-plan.service.js
   Yetki kuralı:
   - Başlık havuzu + Plan Tanımları (içerik/içe aktarma): sadece
     'yillikPlan' modülünde Düzenle yetkisi olan (admin) değiştirebilir.
   - Bir öğretmenin "hangi planı takip ediyorum" seçimi ve haftalık
     notu: SADECE KENDİ kaydına yazdığı için (başka hiç kimsenin
     verisine dokunmaz) — modülü görebilen (en az Görüntüle) HERKES
     kendi seçimini/notunu yönetebilir; ayrı bir "Düzenle" yetkisi
     şart koşulmaz (tıpkı kulüp danışmanlığındaki dar kapsamlı yazma
     izni gibi, bkz. siniflar.service.js → ogrenciKulupGuncelle).
   ============================================================= */
const YillikPlanService = {
  _yaziYetkisiVar(){ return typeof duzenleyebilir==='function' && duzenleyebilir('yillikPlan'); },
  _goruntuleyebilir(){ return typeof gorebilir==='function' && gorebilir('yillikPlan'); },
  /* ---- Ana Başlık Havuzu ---- */
  basliklariDinle(cb, hataCb){ return YillikPlanRepository.basliklariDinle(cb, hataCb); },
  baslikEkle(veri){
    if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz'));
    return YillikPlanRepository.baslikEkle(veri);
  },
  baslikGuncelle(id, veri){
    if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz'));
    return YillikPlanRepository.baslikGuncelle(id, veri);
  },
  baslikSil(id){
    if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz'));
    return YillikPlanRepository.baslikSil(id);
  },

  /* ---- Plan Tanımları ---- */
  tanimlariDinle(cb, hataCb){ return YillikPlanRepository.tanimlariDinle(cb, hataCb); },
  tanimEkle(veri){
    if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz'));
    return YillikPlanRepository.tanimEkle(veri);
  },
  tanimGuncelle(id, veri){
    if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz'));
    return YillikPlanRepository.tanimGuncelle(id, veri);
  },
  tanimSil(id){
    if(!this._yaziYetkisiVar()) return Promise.reject(new Error('yetkisiz'));
    return YillikPlanRepository.tanimSil(id);
  },

  /* ---- Görüntüleme/yazdırma tercihleri (sütun genişliği, yazı boyutu,
     imza tarihi) — plan İÇERİĞİNİ (dersAdi/seviye/sutunlar/satirlar)
     DEĞİŞTİRMEZ, sadece o teker teker basılırken nasıl göründüğünü
     ayarlar. Bu yüzden 'yillikPlan' modülünü Görüntüle yetkisiyle
     kullanan bir öğretmen de değiştirebilmeli — Düzenle şartı yok
     (Firestore kuralında da bu üç alan ayrıca serbest bırakıldı,
     bkz. firestore.rules). */
  goruntuAyarlariniKaydet(id, { sutunGenislikleri, fontBoyutuPx, imzaTarihi } = {}){
    if(!this._goruntuleyebilir()){ if(typeof toast==='function') toast('Bu modülü kullanma yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
    const veri = {};
    if (sutunGenislikleri !== undefined) veri.sutunGenislikleri = sutunGenislikleri;
    if (fontBoyutuPx !== undefined) veri.fontBoyutuPx = fontBoyutuPx;
    if (imzaTarihi !== undefined) veri.imzaTarihi = imzaTarihi;
    return YillikPlanRepository.tanimGuncelle(id, veri);
  },

  /* ---- Öğretmenin kendi plan seçimi (dar kapsamlı, kendi kaydı) ---- */
  secimGetir(ogretmenId){ return YillikPlanRepository.secimGetir(ogretmenId); },
  secimKaydet(ogretmenId, planIdler){
    if(!this._goruntuleyebilir()){ if(typeof toast==='function') toast('Bu modülü kullanma yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
    return YillikPlanRepository.secimKaydet(ogretmenId, planIdler);
  },

  /* ---- Haftalık kişisel not (dar kapsamlı, kendi kaydı) ---- */
  notlariGetir(ogretmenId, planId){ return YillikPlanRepository.notlariGetir(ogretmenId, planId); },
  notKaydet(ogretmenId, planId, haftaIndex, metin){
    if(!this._goruntuleyebilir()){ if(typeof toast==='function') toast('Bu modülü kullanma yetkiniz yok.'); return Promise.reject(new Error('yetkisiz')); }
    return YillikPlanRepository.notKaydet(ogretmenId, planId, haftaIndex, metin);
  },
};
