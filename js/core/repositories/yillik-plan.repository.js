/* =============================================================
   js/core/repositories/yillik-plan.repository.js
   YILLIK PLAN — Firestore erişim katmanı. Servis (yetki) katmanı
   YillikPlanService içindedir; burada sadece ham CRUD var.
   ============================================================= */
const YillikPlanRepository = {
  /* ---- Ana Başlık Havuzu (Tema, Kazanım, Etkinlik vb.) ---- */
  basliklariDinle(callback, hataCb){
    return db.collection(COL.yillikPlanBasliklari).orderBy('sira').onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  baslikEkle(veri){ return db.collection(COL.yillikPlanBasliklari).add(veri); },
  baslikGuncelle(id, veri){ return db.collection(COL.yillikPlanBasliklari).doc(id).update(veri); },
  baslikSil(id){ return db.collection(COL.yillikPlanBasliklari).doc(id).delete(); },

  /* ---- Plan Tanımları (ders + seviye + satırlar) ---- */
  tanimlariDinle(callback, hataCb){
    return db.collection(COL.yillikPlanTanimlari).onSnapshot(
      s => callback(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      hataCb || hataGoster
    );
  },
  tanimEkle(veri){ return db.collection(COL.yillikPlanTanimlari).add(veri); },
  tanimGuncelle(id, veri){ return db.collection(COL.yillikPlanTanimlari).doc(id).update(veri); },
  tanimSil(id){ return db.collection(COL.yillikPlanTanimlari).doc(id).delete(); },

  /* ---- Öğretmenin takip ettiği plan seçimleri (belge ID = ogretmenId) ---- */
  secimGetir(ogretmenId){ return db.collection(COL.ogretmenYillikPlanSecimleri).doc(ogretmenId).get(); },
  secimKaydet(ogretmenId, planIdler){
    return db.collection(COL.ogretmenYillikPlanSecimleri).doc(ogretmenId).set({ ogretmenId, planIdler }, { merge:true });
  },

  /* ---- Haftalık notlar (belge ID = `${ogretmenId}_${planId}`) ---- */
  notlariGetir(ogretmenId, planId){ return db.collection(COL.yillikPlanNotlari).doc(`${ogretmenId}_${planId}`).get(); },
  notKaydet(ogretmenId, planId, haftaIndex, metin){
    const id = `${ogretmenId}_${planId}`;
    return db.collection(COL.yillikPlanNotlari).doc(id).set(
      { ogretmenId, planId, notlar: { [haftaIndex]: metin } }, { merge:true }
    );
  },
};
