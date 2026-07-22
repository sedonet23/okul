/* =============================================================
   js/kontrol-listeleri-tohum-veri.js
   "Okullarda Yıl Sonunda Yapılacak İş ve İşlemler" — kullanıcının
   paylaştığı referans görseldeki 19 maddenin tohum verisi. Sadece
   js/kontrol-listeleri.js > kontrolListesiOrnekIceAktar() admin bir kez
   tıkladığında Firestore'a yazılır.
   ============================================================= */
const KONTROL_LISTESI_TOHUM_VERI = {
  ad: 'Yıl Sonu İşlemleri',
  aciklama: 'Okullarda yıl sonunda yapılacak iş ve işlemler',
  maddeler: [
    { ikon:'💻', renk:'#1E88E5', metin:'Yazılı, sözlü (ders içi etkinlik) ve proje notlarının e-okula girilmesi' },
    { ikon:'💬', renk:'#43A047', metin:'E-Okuldaki karne görüşlerinin doldurulması' },
    { ikon:'👨‍👩‍👧', renk:'#FB8C00', metin:'Sınıf Rehber Öğretmeni olduğumuz sınıfın davranış notlarının girilmesi' },
    { ikon:'📚', renk:'#8E24AA', metin:'Sınıf Kitaplığı oluşturulması ve öğrencilerin okuduğu kitapların e-okula girilmesi' },
    { ikon:'📋', renk:'#00897B', metin:'Proje Ödevi ve Ders İçi Katılım Çizelgelerinin hazırlanarak idareye teslim edilmesi' },
    { ikon:'📝', renk:'#FFB300', metin:'Not fişlerinin kontrol edilerek imzalanması' },
    { ikon:'👥', renk:'#D81B60', metin:'Yıl Sonu Zümre Toplantı Tutanağının yapılarak idareye teslim edilmesi' },
    { ikon:'🧑‍🤝‍🧑', renk:'#1E88E5', metin:'Yıl Sonu Şube Öğretmenler Kurulu Toplantısının yapılarak idareye teslim edilmesi' },
    { ikon:'✅', renk:'#43A047', metin:'Şube Öğretmenler Kuruluna kalan öğrencilerin "Geçti" diye işaretlenmesi' },
    { ikon:'🤝', renk:'#8E24AA', metin:'Yıl Sonu Rehberlik Faaliyet Raporlarının yapılarak idareye teslim edilmesi' },
    { ikon:'👨‍👩‍👧‍👦', renk:'#7E57C2', metin:'Yıl Sonu Kulüp Çalışmaları ve Toplum Hizmeti Raporlarının yapılarak idareye teslim edilmesi' },
    { ikon:'🧑‍🏫', renk:'#00897B', metin:'Kulüp Etkinlikleri Danışman Öğretmen Görüşünün İşlenmesi' },
    { ikon:'📊', renk:'#FB8C00', metin:'Yıl Sonu Ders Kesim Raporlarının idareye teslim edilmesi' },
    { ikon:'📑', renk:'#D81B60', metin:'Yazılı kâğıtlarının Yazılı Kâğıtları Teslim Tutanağı ile birlikte idareye teslim edilmesi' },
    { ikon:'📖', renk:'#43A047', metin:'Yıl Sonu DYK-Yetiştirme Kursu Raporlarının hazırlanarak idareye teslim edilmesi' },
    { ikon:'📔', renk:'#00897B', metin:'Ders defterlerindeki eksikliklerin doldurulması' },
    { ikon:'📈', renk:'#1E88E5', metin:'Sınav Analizlerinin yapılarak idareye teslim edilmesi' },
    { ikon:'📊', renk:'#8E24AA', metin:'5., 6., 9. ve 10. Sınıflarda e-okul Gelişim Raporlarının doldurulması' },
    { ikon:'📋', renk:'#00897B', metin:'5., 6., 9. ve 10. Sınıflarda TYMM (Maarif Modeli) Değerlendirilerek idareye teslim edilmesi' },
  ],
};
