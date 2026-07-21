/* =============================================================
   js/yillik-plan-tohum-veri.js
   5 MEB ünitelendirilmiş yıllık plan dokümanından (Fen Bilimleri,
   Matematik, Müzik: 6.sınıf — Görsel Sanatlar: 5.sınıf — İngilizce:
   6.sınıf) ayıklanan içerik + ortak "Ana Başlık" havuzu. Sadece
   js/yillik-plan.js > yillikPlanOrnekVerileriIceAktar() tarafından,
   admin bir kez tıkladığında Firestore'a yazılır — sayfa her
   açıldığında OTOMATİK çalışmaz.
   ============================================================= */
const YILLIK_PLAN_TOHUM_VERI = {
 "baslikKatalogu": [
  {
   "id": "tema",
   "ad": "Tema",
   "sira": 0
  },
  {
   "id": "icerikCercevesi",
   "ad": "İçerik Çerçevesi",
   "sira": 1
  },
  {
   "id": "ogrenmeCiktilari",
   "ad": "Öğrenme Çıktıları",
   "sira": 2
  },
  {
   "id": "surecBilesenleri",
   "ad": "Süreç Bileşenleri",
   "sira": 3
  },
  {
   "id": "ogrenmeKanitlari",
   "ad": "Öğrenme Kanıtları",
   "sira": 4
  },
  {
   "id": "disiplinlerArasiIliskiler",
   "ad": "Disiplinler Arası İlişkiler",
   "sira": 5
  },
  {
   "id": "degerlendirme",
   "ad": "Değerlendirme",
   "sira": 6
  },
  {
   "id": "sosyalDuygusalOgrenme",
   "ad": "Sosyal-Duygusal Öğrenme Becerileri",
   "sira": 7
  },
  {
   "id": "degerler",
   "ad": "Değerler",
   "sira": 8
  },
  {
   "id": "okuryazarlikBecerileri",
   "ad": "Okuryazarlık Becerileri",
   "sira": 9
  },
  {
   "id": "ogrenmeAlani",
   "ad": "Öğrenme Alanı",
   "sira": 10
  },
  {
   "id": "yontemTeknikler",
   "ad": "Yöntem ve Teknikler",
   "sira": 11
  },
  {
   "id": "aracGerecMateryaller",
   "ad": "Araç-Gereç ve Materyaller",
   "sira": 12
  },
  {
   "id": "etkinlikler",
   "ad": "Etkinlikler",
   "sira": 13
  },
  {
   "id": "aciklamalar",
   "ad": "Açıklamalar",
   "sira": 14
  },
  {
   "id": "sanatDegerleriTemelBeceriler",
   "ad": "Sanat Değerlerimiz ve Temel Beceriler",
   "sira": 15
  },
  {
   "id": "surecDosyasi",
   "ad": "Süreç Dosyası",
   "sira": 16
  },
  {
   "id": "functions",
   "ad": "Functions",
   "sira": 17
  },
  {
   "id": "languageTasks",
   "ad": "Language Tasks and Study Skills/Methods",
   "sira": 18
  },
  {
   "id": "materials",
   "ad": "Materials",
   "sira": 19
  }
 ],
 "tanimlar": [
  {
   "dersAdi": "Fen Bilimleri",
   "seviye": 6,
   "egitimOgretimYili": "2026-2027",
   "sutunlar": [
    "tema",
    "icerikCercevesi",
    "ogrenmeCiktilari",
    "surecBilesenleri",
    "ogrenmeKanitlari",
    "disiplinlerArasiIliskiler",
    "degerlendirme"
   ],
   "satirlar": [
    {
     "ay": "EYLÜL",
     "hafta": "1.HAFTA(08-14)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "OKUL TEMELLİ PLANLAMA*",
      "ogrenmeCiktilari": "OKUL TEMELLİ PLANLAMA*",
      "surecBilesenleri": "OKUL TEMELLİ PLANLAMA*",
      "icerikCercevesi": "OKUL TEMELLİ PLANLAMA*",
      "ogrenmeKanitlari": "OKUL TEMELLİ PLANLAMA*",
      "disiplinlerArasiIliskiler": "OKUL TEMELLİ PLANLAMA*"
     }
    },
    {
     "ay": "EYLÜL",
     "hafta": "2.HAFTA(15-21)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "1. ÜNİTE: GÜNEŞ SİSTEMİ VE TUTULMALAR",
      "ogrenmeCiktilari": "İ 1. Bölüm: Güneş Sistemi FB.6.1.1.1. Güneş sistemindeki gezegenleri niteliklerine göre sınıflandırabilme FB.6.1.1.2. Güneş sistemi ile ilgili bilimsel model oluşturabilme",
      "surecBilesenleri": "a) Güneş sistemindeki gezegenlerin niteliklerini belirler. b) Güneş sistemindeki gezegenleri niteliklerine göre ayrıştırır. c) Güneş sistemindeki gezegenleri niteliklerine göre gruplandırır. ç) Güneş sistemindeki gezegenleri niteliklerine göre etiketler. a) Güneş sistemi ile ilgili model önerir. b) Güneş sistemi ile ilgili hazırladığı modelini geliştirir.",
      "icerikCercevesi": "Güneş Sistemi ve Gezegenler",
      "ogrenmeKanitlari": "kısa cevaplı testler, anlam çözümleme tablosu, eşleştirme testleri, yapılandırılmış grid, dallanmış ağaç, boşluk doldurma, açık uçlu sorular ve performans görevleri kullanılabilir",
      "disiplinlerArasiIliskiler": "Görsel Sanatlar, Türkçe"
     }
    },
    {
     "ay": "EYLÜL",
     "hafta": "3.HAFTA(22-28)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "1. ÜNİTE: GÜNEŞ SİSTEMİ VE TUTULMALAR",
      "ogrenmeCiktilari": "2. Bölüm: Güneş ve Ay Tutulmaları FB.6.1.2.1. Güneş ve Ay tutulması ile ilgili bilimsel çıkarım yapabilme",
      "surecBilesenleri": "a) Güneş ve Ay tutulmasının niteliklerini tanımlar. b) Güneş ve Ay tutulması ile ilgili topladığı verileri kaydeder. c) Güneş ve Ay tutulmasını değerlendirir",
      "icerikCercevesi": "Güneş ve Ay Tutulmaları",
      "ogrenmeKanitlari": "kısa cevaplı testler, anlam çözümleme tablosu, eşleştirme testleri, yapılandırılmış grid, dallanmış ağaç, boşluk doldurma, açık uçlu sorular ve performans görevleri kullanılabilir",
      "disiplinlerArasiIliskiler": "Görsel Sanatlar, Türkçe"
     }
    },
    {
     "ay": "EKİM",
     "hafta": "4.HAFTA(29-05)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "1. ÜNİTE: GÜNEŞ SİSTEMİ VE TUTULMALAR",
      "ogrenmeCiktilari": "FB.6.1.2.2. Güneş ve Ay tutulması ile ilgili bilimsel model oluşturabilme",
      "surecBilesenleri": "a) Güneş ve Ay tutulması ile ilgili model önerir. b) Güneş ve Ay tutulması ile ilgili modelini geliştirir.",
      "icerikCercevesi": "Güneş ve Ay Tutulmaları",
      "ogrenmeKanitlari": "kısa cevaplı testler, anlam çözümleme tablosu, eşleştirme testleri, yapılandırılmış grid, dallanmış ağaç, boşluk doldurma, açık uçlu sorular ve performans görevleri kullanılabilir",
      "disiplinlerArasiIliskiler": "Görsel Sanatlar, Türkçe"
     }
    },
    {
     "ay": "EKİM",
     "hafta": "5.HAFTA(06-12)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "2. ÜNİTE: KUVVETİN ETKİSİNDE HAREKET",
      "ogrenmeCiktilari": "1. Bölüm: Bileşke Kuvvet FB.6.2.1.1. Bir cisme etki eden aynı doğrultudaki kuvvetler arasındaki ilişkileri açıklayarak bileşke kuvveti yapılandırabilme",
      "surecBilesenleri": "kuvveti yapılandırabilme a) Bir cisme etki eden aynı doğrultudaki kuvvetleri inceleyerek aralarındaki mantıksal ilişkileri ortaya koyar. b) Bir cisme etki eden aynı doğrultudaki kuvvetler arasındaki ilişkileri yapılandırarak bileşke kuvveti açıklar.",
      "icerikCercevesi": "Bileşke Kuvvet",
      "ogrenmeKanitlari": "çalışma kâğıdı, V diyagramı ve performans görevleri kullanılabilir. Ayrıca ünite sürecinde ortaya çıkan öğrenci ürünleri değerlendirme amaçlı kullanılabilir.",
      "disiplinlerArasiIliskiler": "Matematik"
     }
    },
    {
     "ay": "EKİM",
     "hafta": "6.HAFTA(13-19)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "2. ÜNİTE: KUVVETİN ETKİSİNDE HAREKET",
      "ogrenmeCiktilari": "FB.6.2.1.2. Dengelenmiş ve dengelenmemiş kuvvetlerin etkisi altındaki bir cismin hareketine yönelik deney yapabilme",
      "surecBilesenleri": "a) Dengelenmiş ve dengelenmemiş kuvvetlerin bir cismin hareketine etkisini gösteren deney düzeneği tasarlar. b) Dengelenmiş ve dengelenmemiş kuvvetlerin bir cismin hareketine etkisini analiz eder",
      "icerikCercevesi": "Dengelenmiş ve Dengelenmemiş Kuvvetler",
      "ogrenmeKanitlari": "çalışma kâğıdı, V diyagramı ve performans görevleri kullanılabilir. Ayrıca ünite sürecinde ortaya çıkan öğrenci ürünleri değerlendirme amaçlı kullanılabilir.",
      "disiplinlerArasiIliskiler": "Matematik"
     }
    },
    {
     "ay": "EKİM",
     "hafta": "7.HAFTA(20-26)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "2. ÜNİTE: KUVVETİN ETKİSİNDE HAREKET",
      "ogrenmeCiktilari": "2.Bölüm Sabit Süratli ve Sabit Hızlı Hareket FB.6.2.2.1. Sürat ve hız kavramlarını karşılaştırabilme",
      "surecBilesenleri": "a) Sürat ve hız kavramlarına ilişkin özellikleri belirler. b) Sürat ve hız kavramlarına ilişkin benzerlikleri listeler. c) Sürat ve hız kavramlarına ilişkin farklılıkları listeler.",
      "icerikCercevesi": "Sürat ve Hız İlişkisi",
      "ogrenmeKanitlari": "çalışma kâğıdı, V diyagramı ve performans görevleri kullanılabilir. Ayrıca ünite sürecinde ortaya çıkan öğrenci ürünleri değerlendirme amaçlı kullanılabilir.",
      "disiplinlerArasiIliskiler": "Matematik"
     }
    },
    {
     "ay": "EKİM-KASIM",
     "hafta": "8.HAFTA(27-02)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "3. ÜNİTE: CANLILARDA SİSTEMLER3. ÜNİTE: CANLILARDA SİSTEMLER3. ÜNİTE: CANLILARDA SİSTEMLER",
      "ogrenmeCiktilari": "1. Bölüm: Bitki ve Hayvanlarda Üreme, Büyüme ve Gelişme FB.6.3.1.1. Eşeyli ve eşeysiz üremeyi karşılaştırabilme FB.6.3.1.2. Bitkilerde üreme, büyüme ve gelişme hakkında bilimsel çıkarım yapabilme1. Bölüm: Bitki ve Hayvanlarda Üreme, Büyüme ve Gelişme FB.6.3.1.1. Eşeyli ve eşeysiz üremeyi karşılaştırabilme FB.6.3.1.2. Bitkilerde üreme, büyüme ve gelişme hakkında bilimsel çıkarım yapabilme1. Bölüm: Bitki ve Hayvanlarda Üreme, Büyüme ve Gelişme FB.6.3.1.1. Eşeyli ve eşeysiz üremeyi karşılaştırabilme FB.6.3.1.2. Bitkilerde üreme, büyüme ve gelişme hakkında bilimsel çıkarım yapabilme",
      "surecBilesenleri": "a) Eşeyli ve eşeysiz üreme ile ilgili özellikleri belirler. b) Eşeyli ve eşeysiz üreme ile benzerlikleri listeler. c) Eşeyli ve eşeysiz üreme ile ilgili farklılıkları listeler. a) Bitkilerde üreme, büyüme ve gelişmeye etki eden temel faktörleri tanımlar. b) Bitkilerde üreme, büyüme ve gelişmeye etki eden temel faktörlere ilişkin topladığı verileri kaydeder. c) Bitkilerde üreme, büyüme ve gelişmeye etki eden temel faktörlere ilişkin verileri değerlendirir.a) Eşeyli ve eşeysiz üreme ile ilgili özellikleri belirler. b) Eşeyli ve eşeysiz üreme ile benzerlikleri listeler. c) Eşeyli ve eşeysiz üreme ile ilgili farklılıkları listeler. a) Bitkilerde üreme, büyüme ve gelişmeye etki eden temel faktörleri tanımlar. b) Bitkilerde üreme, büyüme ve gelişmeye etki eden temel faktörlere ilişkin topladığı verileri kaydeder. c) Bitkilerde üreme, büyüme ve gelişmeye etki eden temel faktörlere ilişkin verileri değerlendirir.a) Eşeyli ve eşeysiz üreme ile ilgili özellikleri belirler. b) Eşeyli ve eşeysiz üreme ile benzerlikleri listeler. c) Eşeyli ve eşeysiz üreme ile ilgili farklılıkları listeler. a) Bitkilerde üreme, büyüme ve gelişmeye etki eden temel faktörleri tanımlar. b) Bitkilerde üreme, büyüme ve gelişmeye etki eden temel faktörlere ilişkin topladığı verileri kaydeder. c) Bitkilerde üreme, büyüme ve gelişmeye etki eden temel faktörlere ilişkin verileri değerlendirir.",
      "icerikCercevesi": "Bitki ve Hayvanlarda Üreme, Büyüme ve GelişmeBitki ve Hayvanlarda Üreme, Büyüme ve GelişmeBitki ve Hayvanlarda Üreme, Büyüme ve Gelişme",
      "ogrenmeKanitlari": "çalışma kâğıdı, tanılayıcı dallanmış ağaç, yapılandırılmış grid, açık uçlu sorular ve performans görevleri kullanılabilir.çalışma kâğıdı, tanılayıcı dallanmış ağaç, yapılandırılmış grid, açık uçlu sorular ve performans görevleri kullanılabilir.çalışma kâğıdı, tanılayıcı dallanmış ağaç, yapılandırılmış grid, açık uçlu sorular ve performans görevleri kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe, Görsel SanatlarTürkçe, Görsel SanatlarTürkçe, Görsel Sanatlar",
      "degerlendirme": "Cumhuriyet Bayramı"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "9.HAFTA(03-09)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "3. ÜNİTE: CANLILARDA SİSTEMLER",
      "ogrenmeCiktilari": "FB.6.3.1.3. Tohumun çimlenmesine etki eden faktörlere ilişkin hipotez oluşturabilme",
      "surecBilesenleri": "a) Tohumun çimlenmesine etki eden faktörleri tanımlar. b) Tohumun çimlenmesine etki eden faktörlerin neden sonuç ilişkilerini belirler. c) Tohumun çimlenmesine etki eden faktörlere ait değişkenleri belirler. ç) Tohumun çimlenmesine etki eden faktörlere ait belirlediği değişkenleri kontrol eder. d) Tohumun çimlenmesine etki eden faktörlere ait önerme sunar.",
      "icerikCercevesi": "Bitki ve Hayvanlarda Üreme, Büyüme ve Gelişme",
      "ogrenmeKanitlari": "çalışma kâğıdı, tanılayıcı dallanmış ağaç, yapılandırılmış grid, açık uçlu sorular ve performans görevleri kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe, Görsel Sanatlar",
      "degerlendirme": "Kızılay Haftası"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "10.HAFTA(17-23)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "3. ÜNİTE: CANLILARDA SİSTEMLER",
      "ogrenmeCiktilari": "FB.6.3.1.4. Hayvanlarda üreme, büyüme ve gelişme hakkında bilimsel çıkarım yapabilme",
      "surecBilesenleri": "a) Hayvanlarda üreme, büyüme ve gelişmeye etki eden temel faktörleri tanımlar. b) Hayvanlarda üreme, büyüme ve gelişmeye etki eden temel faktörlere ilişkin topladığı verileri kaydeder. c) Hayvanlarda üreme, büyüme ve gelişmeye etki eden temel faktörlere ilişkin verileri değerlendirir.",
      "icerikCercevesi": "Bitki ve Hayvanlarda Üreme, Büyüme ve Gelişme",
      "ogrenmeKanitlari": "çalışma kâğıdı, tanılayıcı dallanmış ağaç, yapılandırılmış grid, açık uçlu sorular ve performans görevleri kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe, Görsel Sanatlar",
      "degerlendirme": "Dünya Çocuk Hakları Günü"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "11.HAFTA(24-30)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "3. ÜNİTE: CANLILARDA SİSTEMLER",
      "ogrenmeCiktilari": "FB.6.3.1.5. İnsanda üremeyi sağlayan yapı ve organlar arasındaki ilişkileri çözümleyebilme",
      "surecBilesenleri": "a) İnsanda üremeyi sağlayan yapı ve organları poster/şema üzerinde belirler. b) İnsanda üremeyi sağlayan yapı ve organlar arasındaki ilişkileri belirler.",
      "icerikCercevesi": "Bitki ve Hayvanlarda Üreme, Büyüme ve Gelişme",
      "ogrenmeKanitlari": "çalışma kâğıdı, tanılayıcı dallanmış ağaç, yapılandırılmış grid, açık uçlu sorular ve performans görevleri kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe, Görsel Sanatlar",
      "degerlendirme": "Öğretmenler Günü"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "12.HAFTA(01-07)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "3. ÜNİTE: CANLILARDA SİSTEMLER",
      "ogrenmeCiktilari": "2. Bölüm: Denetleyici ve Düzenleyici Sistemler FB.6.3.2.1. Sinir sisteminin görevlerini model üzerinde gözlemleyebilme FB.6.3.2.2. İç salgı bezlerinin vücut için önemini yapılandırabilme",
      "surecBilesenleri": "a) Sinir sisteminin özelliklerini tanımlar. b) Sinir sistemini model üzerinde inceler. c) Sinir sisteminin görevlerini açıklar a) İç salgı bezlerini inceleyerek mantıksal ilişkiler ortaya koyar. b) İç salgı bezlerinin vücut için önemini uyumlu bir bütün olarak açıklar.",
      "icerikCercevesi": "Bitki ve Hayvanlarda Üreme, Büyüme ve Gelişme",
      "ogrenmeKanitlari": "çalışma kâğıdı, tanılayıcı dallanmış ağaç, yapılandırılmış grid, açık uçlu sorular ve performans görevleri kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe, Görsel Sanatlar",
      "degerlendirme": "Dünya Engelliler Günü"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "13.HAFTA(08-14)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "3. ÜNİTE: CANLILARDA SİSTEMLER",
      "ogrenmeCiktilari": "FB.6.3.2.3. Çocukluktan ergenliğe geçişte oluşan bedensel ve ruhsal değişimleri genelleyebilme",
      "surecBilesenleri": "a) Çocukluktan ergenliğe geçişte oluşan değişimler hakkında bilgi toplar. b) Çocukluktan ergenliğe geçişte oluşan değişimlerden ortak olanları belirler. c) Çocukluktan ergenliğe geçişte oluşan değişimlerden ortak olmayanları belirler. ç) Çocukluktan ergenliğe geçişte oluşan değişimlerle ilgili örüntüler üzerinden genellemede bulunur",
      "icerikCercevesi": "Bitki ve Hayvanlarda Üreme, Büyüme ve Gelişme",
      "ogrenmeKanitlari": "çalışma kâğıdı, tanılayıcı dallanmış ağaç, yapılandırılmış grid, açık uçlu sorular ve performans görevleri kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe, Görsel Sanatlar"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "14.HAFTA(15-21)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "3. ÜNİTE: CANLILARDA SİSTEMLER",
      "ogrenmeCiktilari": "FB.6.3.2.4. Denetleyici ve düzenleyici sistemlerin sağlığı için yapılması gerekenlerle ilgili bilgi toplayabilme",
      "surecBilesenleri": "a) Denetleyici ve düzenleyici sistemlerin sağlığı ile ilgili bilgiye ulaşmak için kullanacağı araçları belirler. b) Denetleyici ve düzenleyici sağlığı hakkında bilgiler bulur. c) Denetleyici ve düzenleyici sağlığı konusunda bulduğu bilgileri doğrular. ç) Denetleyici ve düzenleyici sağlığı konusunda ulaştığı bilgileri kaydeder.",
      "icerikCercevesi": "Denetleyici ve Düzenleyici Sistemler",
      "ogrenmeKanitlari": "çalışma kâğıdı, tanılayıcı dallanmış ağaç, yapılandırılmış grid, açık uçlu sorular ve performans görevleri kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe, Görsel Sanatlar"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "15.HAFTA(22-28)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "4. ÜNİTE: IŞIĞIN YANSIMASI VE RENKLER",
      "ogrenmeCiktilari": "1. Bölüm: Işığın Yansıması FB.6.4.1.1. Işığın farklı yüzeylerdeki yansıma olaylarına ilişkin bilimsel çıkarım yapabilme",
      "surecBilesenleri": "a) Işığın farklı yüzeylerdeki yansıma olaylarının niteliklerini tanımlar. b) şığın farklı yüzeylerdeki yansıma olayları ile ilgili topladığı verileri kaydeder. c) Işığın farklı yüzeylerdeki yansımasını düzgün ve dağınık yansıma olarak değerlendirir",
      "icerikCercevesi": "Işığın yansıması",
      "ogrenmeKanitlari": "çalışma kâğıdı, yapılandırılmış grid, kontrol listesi, doğru-yanlış testleri ve açık uçlu sorular, tanılayıcı dallanmış ağaç, eşleştirme, dereceli puanlama anahtarı ve performans görevi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe, Görsel Sanatlar"
     }
    },
    {
     "ay": "ARALIK-OCAK",
     "hafta": "16.HAFTA(29-04)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "4. ÜNİTE: IŞIĞIN YANSIMASI VE RENKLER4. ÜNİTE: IŞIĞIN YANSIMASI VE RENKLER",
      "ogrenmeCiktilari": "FB.6.4.1.2. Işığın yansımasında gelen ışın, yansıyan ışın ve yüzeyin normali arasındaki ilişkiyi kanıt kullanarak açıklayabilmeFB.6.4.1.2. Işığın yansımasında gelen ışın, yansıyan ışın ve yüzeyin normali arasındaki ilişkiyi kanıt kullanarak açıklayabilme",
      "surecBilesenleri": "a) Işığın yansımasına ilişkin deneysel verileri kaydeder. b) Işığın yansımasına ilişkin veri setleri oluşturur. c) Işığın yansımasına dair topladığı verilere dayalı açıklama yapar.a) Işığın yansımasına ilişkin deneysel verileri kaydeder. b) Işığın yansımasına ilişkin veri setleri oluşturur. c) Işığın yansımasına dair topladığı verilere dayalı açıklama yapar.",
      "icerikCercevesi": "Düzgün ve dağınık yansıma Yansıma kanunlarıDüzgün ve dağınık yansıma Yansıma kanunları",
      "ogrenmeKanitlari": "çalışma kâğıdı, yapılandırılmış grid, kontrol listesi, doğru-yanlış testleri ve açık uçlu sorular, tanılayıcı dallanmış ağaç, eşleştirme, dereceli puanlama anahtarı ve performans görevi kullanılabilir.çalışma kâğıdı, yapılandırılmış grid, kontrol listesi, doğru-yanlış testleri ve açık uçlu sorular, tanılayıcı dallanmış ağaç, eşleştirme, dereceli puanlama anahtarı ve performans görevi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe, Görsel SanatlarTürkçe, Görsel Sanatlar",
      "degerlendirme": "Yılbaşı Tatili"
     }
    },
    {
     "ay": "OCAK",
     "hafta": "17.HAFTA(05-11)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "4. ÜNİTE: IŞIĞIN YANSIMASI VE RENKLER",
      "ogrenmeCiktilari": "2. Bölüm: Aynalar FB.6.4.2.1. Günlük hayattaki ayna çeşitlerine ilişkin bilimsel çıkarım yapabilme",
      "surecBilesenleri": "a) Ayna çeşitlerinin niteliklerini deneyerek tanımlar. b) Ayna çeşitlerini kullanarak özelliklerine yönelik topladığı verileri kaydeder. c) Günlük yaşamdaki aynaları düz, çukur ve tümsek ayna olarak özelliklerine göre değerlendirir.",
      "icerikCercevesi": "Ayna çeşitlerinde görüntü özellikleri Aynaların kullanım alanları",
      "ogrenmeKanitlari": "çalışma kâğıdı, yapılandırılmış grid, kontrol listesi, doğru-yanlış testleri ve açık uçlu sorular, tanılayıcı dallanmış ağaç, eşleştirme, dereceli puanlama anahtarı ve performans görevi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe, Görsel Sanatlar"
     }
    },
    {
     "ay": "OCAK",
     "hafta": "18.HAFTA(12-18)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "4. ÜNİTE: IŞIĞIN YANSIMASI VE RENKLER4. ÜNİTE: IŞIĞIN YANSIMASI VE RENKLER",
      "ogrenmeCiktilari": "2. Bölüm: Aynalar FB.6.4.2.1. Günlük hayattaki ayna çeşitlerine ilişkin bilimsel çıkarım yapabilme2. Bölüm: Aynalar FB.6.4.2.1. Günlük hayattaki ayna çeşitlerine ilişkin bilimsel çıkarım yapabilme",
      "surecBilesenleri": "a) Ayna çeşitlerinin niteliklerini deneyerek tanımlar. b) Ayna çeşitlerini kullanarak özelliklerine yönelik topladığı verileri kaydeder. c) Günlük yaşamdaki aynaları düz, çukur ve tümsek ayna olarak özelliklerine göre değerlendirir.a) Ayna çeşitlerinin niteliklerini deneyerek tanımlar. b) Ayna çeşitlerini kullanarak özelliklerine yönelik topladığı verileri kaydeder. c) Günlük yaşamdaki aynaları düz, çukur ve tümsek ayna olarak özelliklerine göre değerlendirir.",
      "icerikCercevesi": "Ayna çeşitlerinde görüntü özellikleri Aynaların kullanım alanlarıAyna çeşitlerinde görüntü özellikleri Aynaların kullanım alanları",
      "ogrenmeKanitlari": "çalışma kâğıdı, yapılandırılmış grid, kontrol listesi, doğru-yanlış testleri ve açık uçlu sorular, tanılayıcı dallanmış ağaç, eşleştirme, dereceli puanlama anahtarı ve performans görevi kullanılabilir.çalışma kâğıdı, yapılandırılmış grid, kontrol listesi, doğru-yanlış testleri ve açık uçlu sorular, tanılayıcı dallanmış ağaç, eşleştirme, dereceli puanlama anahtarı ve performans görevi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe, Görsel SanatlarTürkçe, Görsel Sanatlar",
      "degerlendirme": "Birinci Dönemin Sona Ermesi"
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "19.HAFTA(02-08)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "OKUL TEMELLİ PLANLAMA*",
      "ogrenmeCiktilari": "OKUL TEMELLİ PLANLAMA*",
      "surecBilesenleri": "OKUL TEMELLİ PLANLAMA*",
      "icerikCercevesi": "OKUL TEMELLİ PLANLAMA*",
      "ogrenmeKanitlari": "OKUL TEMELLİ PLANLAMA*",
      "disiplinlerArasiIliskiler": "OKUL TEMELLİ PLANLAMA*",
      "degerlendirme": "İkinci Yarıyıl Başlangıcı"
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "20.HAFTA(09-15)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "4. ÜNİTE: IŞIĞIN YANSIMASI VE RENKLER",
      "ogrenmeCiktilari": "3. Bölüm: Işığın Soğurulması FB.6.4.3.1. Işığın madde ile etkileşimi sonucunda soğurulabileceğini gözlemleyebilme",
      "surecBilesenleri": "a) Işığın madde ile etkileşimine yönelik nitelikleri tanımlar. b) Işığın madde ile etkileşimine yönelik topladığı verileri kaydeder. c) Işığın madde tarafından soğurulabileceğini elde ettiği veriler doğrultusunda açıklar",
      "icerikCercevesi": "Işığın soğurulması",
      "ogrenmeKanitlari": "çalışma kâğıdı, yapılandırılmış grid, kontrol listesi, doğru-yanlış testleri ve açık uçlu sorular, tanılayıcı dallanmış ağaç, eşleştirme, dereceli puanlama anahtarı ve performans görevi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Matematik"
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "21.HAFTA(16-22)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "4. ÜNİTE: IŞIĞIN YANSIMASI VE RENKLER",
      "ogrenmeCiktilari": "FB.6.4.3.2. Beyaz ışığın tüm ışık renklerinin bileşiminden oluştuğuna ilişkin bilimsel çıkarım yapabilme",
      "surecBilesenleri": "a) Beyaz ışığı oluşturan nitelikleri tanımlar. b) Beyaz ışığın oluşumuna ilişkin topladığı verileri kaydeder. c) Beyaz ışığın oluşumuna dair verileri değerlendirir.",
      "icerikCercevesi": "Beyaz ışığı oluşturan renkler",
      "ogrenmeKanitlari": "çalışma kâğıdı, yapılandırılmış grid, kontrol listesi, doğru-yanlış testleri ve açık uçlu sorular, tanılayıcı dallanmış ağaç, eşleştirme, dereceli puanlama anahtarı ve performans görevi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Matematik"
     }
    },
    {
     "ay": "ŞUBAT-MART",
     "hafta": "22.HAFTA(23-01)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "4. ÜNİTE: IŞIĞIN YANSIMASI VE RENKLER",
      "ogrenmeCiktilari": "FB.6.4.3.3. Cisimlerin siyah, beyaz ve renkli görünmesinin nedenini gözlem verileriyle açıklayabilme",
      "surecBilesenleri": "a) Cisimlerin siyah, beyaz ve renkli görünmesine yönelik nitelikleri tanımlar. b) Cisimlerin siyah, beyaz ve renkli görünmesine yönelik verileri kaydeder. c) Cisimlerin siyah, beyaz ve renkli görünmesine yönelik verileri açıklar",
      "icerikCercevesi": "Cisimlerin renkli görülmesi",
      "ogrenmeKanitlari": "çalışma kâğıdı, yapılandırılmış grid, kontrol listesi, doğru-yanlış testleri ve açık uçlu sorular, tanılayıcı dallanmış ağaç, eşleştirme, dereceli puanlama anahtarı ve performans görevi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Matematik"
     }
    },
    {
     "ay": "MART",
     "hafta": "23.HAFTA(02-08)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "4. ÜNİTE: IŞIĞIN YANSIMASI VE RENKLER",
      "ogrenmeCiktilari": "FB.6.4.3.4. Güneş enerjisinin günlük hayat ve teknolojideki yenilikçi uygulamalarına ilişkin eleştirel düşünebilme",
      "surecBilesenleri": "l düşünebilme a) Güneş enerjisinin günlük yaşam ve teknolojideki yenilikçi uygulamalarına ilişkin fikirleri sorgular. b) Güneş enerjisinin günlük yaşam ve teknolojideki yenilikçi uygulamalarına ilişkin akıl yürütür. c) Güneş enerjisinin günlük yaşam ve teknolojideki yenilikçi uygulamalarına ilişkin ulaştığı çıkarımları yansıtır.",
      "icerikCercevesi": "Güneş ışığının günlük yaşamda kullanım alanları",
      "ogrenmeKanitlari": "çalışma kâğıdı, yapılandırılmış grid, kontrol listesi, doğru-yanlış testleri ve açık uçlu sorular, tanılayıcı dallanmış ağaç, eşleştirme, dereceli puanlama anahtarı ve performans görevi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Matematik"
     }
    },
    {
     "ay": "MART",
     "hafta": "24.HAFTA(09-15)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "5. ÜNİTE: MADDENİN AYIRT EDİCİ ÖZELLİKLERİ",
      "ogrenmeCiktilari": "1. Bölüm: Genleşme ve Büzülme FB.6.5.1.1. Isı etkisiyle maddelerin genleşip büzüleceğine yönelik bilimsel gözleme dayalı tahmin edebilme",
      "surecBilesenleri": "a) Ön bilgi ve deneyimiyle maddelerin genleşip büzüleceğine yönelik önerme oluşturur. b) Gözleme dayalı olan ve olmayan günlük yaşam ile ilişkili önermeleri karşılaştırır.",
      "icerikCercevesi": "Isı ve Madde Etkileşimi",
      "ogrenmeKanitlari": "kısa cevaplı test, doğru-yanlış testi, yazılı yoklama ve eşleştirme testi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Sosyal Bilgiler, Matematik"
     }
    },
    {
     "ay": "MART",
     "hafta": "25.HAFTA(23-29)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "5. ÜNİTE: MADDENİN AYIRT EDİCİ ÖZELLİKLERİ",
      "ogrenmeCiktilari": "1. Bölüm: Genleşme ve Büzülme FB.6.5.1.1. Isı etkisiyle maddelerin genleşip büzüleceğine yönelik bilimsel gözleme dayalı tahmin edebilme",
      "surecBilesenleri": "c) Tahminlerini temellendirmek için gözlem verilerinden sonuç çıkarır. ç) Günlük yaşam ile ilişkili gözlemlenmemiş duruma ilişkin tahminde bulunur. d) Tahminlerin geçerliğini sorgular.",
      "icerikCercevesi": "Isı ve Madde Etkileşimi",
      "ogrenmeKanitlari": "kısa cevaplı test, doğru-yanlış testi, yazılı yoklama ve eşleştirme testi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Sosyal Bilgiler, Matematik",
      "degerlendirme": "SINAV HAFTASI"
     }
    },
    {
     "ay": "MART-NİSAN",
     "hafta": "26.HAFTA(30-05)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "5. ÜNİTE: MADDENİN AYIRT EDİCİ ÖZELLİKLERİ",
      "ogrenmeCiktilari": "2. Bölüm: Maddenin Hâl Değişim Noktaları FB.6.5.2.1. Maddelerin erime, donma ve kaynama noktasını gösteren deney yapabilme",
      "surecBilesenleri": "a) Maddelerin erime, donma ve kaynama noktasını gösteren deney tasarlar. b) Deney ile ilgili ölçme ve veri analizi yapar.",
      "icerikCercevesi": "Maddenin Hâl Değişim Noktaları",
      "ogrenmeKanitlari": "kısa cevaplı test, doğru-yanlış testi, yazılı yoklama ve eşleştirme testi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Sosyal Bilgiler, Matematik"
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "27.HAFTA(06-12)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "5. ÜNİTE: MADDENİN AYIRT EDİCİ ÖZELLİKLERİ",
      "ogrenmeCiktilari": "3. Bölüm: Yoğunluk FB.6.5.3.1. Yoğunluğa ilişkin hesaplamalar yaparak bilimsel veriye dayalı tahmin edebilme",
      "surecBilesenleri": "a) Yoğunluğa ilişkin verilere veya ön bilgilerine dayalı önerme oluşturur. b) Yoğunluğa ilişkin veriye dayalı ve dayalı olmayan önermeleri karşılaştırır.",
      "icerikCercevesi": "Yoğunluk",
      "ogrenmeKanitlari": "kısa cevaplı test, doğru-yanlış testi, yazılı yoklama ve eşleştirme testi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Sosyal Bilgiler, Matematik"
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "28.HAFTA(13-19)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "5. ÜNİTE: MADDENİN AYIRT EDİCİ ÖZELLİKLERİ",
      "ogrenmeCiktilari": "3. Bölüm: Yoğunluk FB.6.5.3.1. Yoğunluğa ilişkin hesaplamalar yaparak bilimsel veriye dayalı tahmin edebilme",
      "surecBilesenleri": "c) Yoğunluğa ilişkin hesaplama ve tahmin yapar. ç) Tahminlerin geçerliğini sorgular",
      "icerikCercevesi": "Yoğunluk",
      "ogrenmeKanitlari": "kısa cevaplı test, doğru-yanlış testi, yazılı yoklama ve eşleştirme testi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Sosyal Bilgiler, Matematik"
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "29.HAFTA(20-26)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "5. ÜNİTE: MADDENİN AYIRT EDİCİ ÖZELLİKLERİ",
      "ogrenmeCiktilari": "FB.6.5.3.2. Deneyler sonucunda çeşitli maddelerin yoğunluklarına ilişkin tümdengelimsel akıl yürütebilme",
      "surecBilesenleri": "a) Çeşitli maddelerin yoğunluklarına ilişkin hipotezler kurarak test eder. b) Geçerli hipotezleri yeni durumları açıklamak için kullanır",
      "icerikCercevesi": "Yoğunluk",
      "ogrenmeKanitlari": "kısa cevaplı test, doğru-yanlış testi, yazılı yoklama ve eşleştirme testi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Sosyal Bilgiler, Matematik",
      "degerlendirme": "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı"
     }
    },
    {
     "ay": "NİSAN-MAYIS",
     "hafta": "30.HAFTA(27-03)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "5. ÜNİTE: MADDENİN AYIRT EDİCİ ÖZELLİKLERİ",
      "ogrenmeCiktilari": "FB.6.5.3.3. Suyun katı ve sıvı hâllerine ait yoğunlukları karşılaştırarak bu durumun canlılar için önemi hakkında bilimsel çıkarımlar yapabilme",
      "surecBilesenleri": "a) Suyun katı ve sıvı hâlleri ile ilgili nitelikleri açıklar. b) Suyun katı ve sıvı hâllerine ait yoğunlukları ile ilgili topladığı verileri kaydeder. c) Suyun katı ve sıvı hâllerine ait yoğunluk farkının canlılar için önemli olduğunu değerlendirir",
      "icerikCercevesi": "Yoğunluk",
      "ogrenmeKanitlari": "kısa cevaplı test, doğru-yanlış testi, yazılı yoklama ve eşleştirme testi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Sosyal Bilgiler, Matematik",
      "degerlendirme": "1 Mayıs İşçi Bayramı"
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "31.HAFTA(04-10)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "5. ÜNİTE: MADDENİN AYIRT EDİCİ ÖZELLİKLERİ",
      "ogrenmeCiktilari": "FB.6.5.3.4. Yoğunluk ile ilgili bilimsel model oluşturabilme",
      "surecBilesenleri": "a) Yoğunluk ile ilgili model önerir. b) Yeni kanıtlarla modeli yeniler.",
      "icerikCercevesi": "Yoğunluk",
      "ogrenmeKanitlari": "kısa cevaplı test, doğru-yanlış testi, yazılı yoklama ve eşleştirme testi kullanılabilir.",
      "disiplinlerArasiIliskiler": "Sosyal Bilgiler, Matematik"
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "32.HAFTA(11-17)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "6. ÜNİTE: ELEKTRİĞİN İLETİMİ VE DİRENÇ",
      "ogrenmeCiktilari": "1. Bölüm: Elektriğin İletimi FB.6.6.1.1. Maddelerin elektriği iletme durumlarını gösteren deney yapabilme",
      "surecBilesenleri": "a) Maddelerin iletme durumlarını test etmek için elektrik devresi kurar. b) Deney sonucuna göre maddelerin elektrik iletme durumları ile ilgili analiz yapar",
      "icerikCercevesi": "Elektriğin İletimi",
      "ogrenmeKanitlari": "eşleştirme testi, çalışma kâğıdı, açık uçlu sorular ve performans görevleri kullanılabilir. Ayrıca ünite sürecinde ortaya çıkan öğrenci ürünleri değerlendirme amaçlı kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe"
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "33.HAFTA(18-24)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "6. ÜNİTE: ELEKTRİĞİN İLETİMİ VE DİRENÇ",
      "ogrenmeCiktilari": "2. Bölüm: Elektriksel Direnç ve Bağlı Olduğu Faktörler FB.6.6.2.1. Elektrik devresindeki ampulün parlaklığının bağlı olduğu değişkenleri belirlemeye yönelik deney yapabilme",
      "surecBilesenleri": "a) Elektrik devresindeki ampulün parlaklığının bağlı olduğu değişkenleri belirleyebilecek bir deney tasarlar.",
      "icerikCercevesi": "Elektriksel Direnç ve Bağlı Olduğu Faktörler",
      "ogrenmeKanitlari": "eşleştirme testi, çalışma kâğıdı, açık uçlu sorular ve performans görevleri kullanılabilir. Ayrıca ünite sürecinde ortaya çıkan öğrenci ürünleri değerlendirme amaçlı kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe",
      "degerlendirme": "19 Mayıs Atatürk’ü Anma Gençlik ve Spor Bayramı"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "34.HAFTA(01-07)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "6. ÜNİTE: ELEKTRİĞİN İLETİMİ VE DİRENÇ",
      "ogrenmeCiktilari": "2. Bölüm: Elektriksel Direnç ve Bağlı Olduğu Faktörler FB.6.6.2.1. Elektrik devresindeki ampulün parlaklığının bağlı olduğu değişkenleri belirlemeye yönelik deney yapabilme",
      "surecBilesenleri": "b) Ampulün parlaklığının bağlı olduğu değişkenlere yönelik ölçüm yaparak analiz eder.",
      "icerikCercevesi": "Elektriksel Direnç ve Bağlı Olduğu Faktörler",
      "ogrenmeKanitlari": "eşleştirme testi, çalışma kâğıdı, açık uçlu sorular ve performans görevleri kullanılabilir. Ayrıca ünite sürecinde ortaya çıkan öğrenci ürünleri değerlendirme amaçlı kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "35.HAFTA(08-14)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "6. ÜNİTE: ELEKTRİĞİN İLETİMİ VE DİRENÇ",
      "ogrenmeCiktilari": "FB.6.6.2.2. Ayarlanabilir direncin ampulün parlaklığına etkilerine yönelik bilimsel çıkarım yapabilme",
      "surecBilesenleri": "a) Reosta kullanarak elektriksel direnci belirler. b) Direncin değişkenliğini dikkate alarak topladığı verileri kaydeder.",
      "icerikCercevesi": "Elektriksel Direnç ve Bağlı Olduğu Faktörler",
      "ogrenmeKanitlari": "eşleştirme testi, çalışma kâğıdı, açık uçlu sorular ve performans görevleri kullanılabilir. Ayrıca ünite sürecinde ortaya çıkan öğrenci ürünleri değerlendirme amaçlı kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe",
      "degerlendirme": "SINAV HAFTASI"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "36.HAFTA(15-21)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "6. ÜNİTE: ELEKTRİĞİN İLETİMİ VE DİRENÇ",
      "ogrenmeCiktilari": "FB.6.6.2.2. Ayarlanabilir direncin ampulün parlaklığına etkilerine yönelik bilimsel çıkarım yapabilme",
      "surecBilesenleri": "c) Ampulün parlaklığı üzerinde elektriksel direncin etkili olduğunu değerlendirir",
      "icerikCercevesi": "Elektriksel Direnç ve Bağlı Olduğu Faktörler",
      "ogrenmeKanitlari": "eşleştirme testi, çalışma kâğıdı, açık uçlu sorular ve performans görevleri kullanılabilir. Ayrıca ünite sürecinde ortaya çıkan öğrenci ürünleri değerlendirme amaçlı kullanılabilir.",
      "disiplinlerArasiIliskiler": "Türkçe"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "37.HAFTA(22-28)",
     "saat": "4 SAAT",
     "degerler": {
      "tema": "Yıl Sonu faaliyet",
      "ogrenmeCiktilari": "Yıl Sonu faaliyet",
      "surecBilesenleri": "Yıl Sonu faaliyet",
      "icerikCercevesi": "Yıl Sonu faaliyet",
      "ogrenmeKanitlari": "Yıl Sonu faaliyet",
      "disiplinlerArasiIliskiler": "Yıl Sonu faaliyet",
      "degerlendirme": "Ders Yılının Sona ermesi"
     }
    }
   ]
  },
  {
   "dersAdi": "Matematik",
   "seviye": 6,
   "egitimOgretimYili": "2026-2027",
   "sutunlar": [
    "tema",
    "icerikCercevesi",
    "ogrenmeCiktilari",
    "surecBilesenleri",
    "sosyalDuygusalOgrenme",
    "degerler",
    "okuryazarlikBecerileri",
    "degerlendirme"
   ],
   "satirlar": [
    {
     "ay": "EYLÜL",
     "hafta": "1.HAFTA(08-14)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "SAYILAR VE NİCELİKLER(1)",
      "icerikCercevesi": "Doğal Sayıların Çarpanları ve Katları",
      "ogrenmeCiktilari": "MAT.6.1.1. Karşılaştığı problem durumlarında bir doğal sayının çarpan ve katlarına yönelik muhakeme yapabilme",
      "surecBilesenleri": "a) Karşılaştığı durumlarda bir doğal sayının çarpan ve katlarına yönelik varsa yımlarda bulunur. b) Varsayımına yönelik örnek durumların içerdiği ilişkileri inceleyerek bir doğal sayının çarpan ve katlarına ilişkin genellemeleri belirler. c) Elde ettiği genellemelerin varsayımını karşılayıp karşılamadığını çeşitli mo dellerle gösterir. ç) Varsayımı ile ilgili ulaştığı sonuca yönelik doğrulayabileceği matematiksel bir önermeyi sözel ya da sembolik temsil ile sunar. d) Farklı problemlerin pratik yoldan çözümüne yönelik oluşturduğu önermenin gerekçelerini sunar. e) Önermenin geçerliliğini destekleyen kapsayıcı örnekler verir. f) İşe koştuğu doğrulamanın benzer önermelere uygulanıp uygulanamayaca- ğını değerlendirir.",
      "sosyalDuygusalOgrenme": "SDB2.1. İletişim SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık",
      "degerler": "D9. Merhamet D14. Saygı",
      "okuryazarlikBecerileri": "OB1. Bilgi Okuryazarlığı OB4. Görsel Okuryazarlık",
      "degerlendirme": "Tanılayıcı dallanmış ağaç Öz değerlendirme Akran değerlendirme Grup değerlendirme izleme testi Gelişim raporu Performans görevi"
     }
    },
    {
     "ay": "EYLÜL",
     "hafta": "2.HAFTA(15-21)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "SAYILAR VE NİCELİKLER(1)",
      "icerikCercevesi": "Doğal Sayıların Çarpanları ve Katları",
      "ogrenmeCiktilari": "MAT.6.1.2. Bir doğal sayının 2, 3, 4, 5, 6, 9 ve 10 ile tam bölünebilme kriterlerine ilişkin çıkarım yapabilme",
      "surecBilesenleri": "a) Bir doğal sayının katlarını veya basamak değerlerini dikkate alarak 2, 3, 4, 5, 6, 9 ve 10’a tam bölünebilme kriterleri ile ilgili varsayımlarda bulunur. b) 2, 3, 4, 5, 6, 9 ve 10’un katlarını ve basamak değerlerini inceleyerek genellemeleri belirler. c) Elde ettiği genellemelerin, varsayımını karşılayıp karşılamadığını örnekler ile sınar. ç) Bir doğal sayının 2, 3, 4, 5, 6, 9 ve 10 ile tam bölünebilmesindeki kriterlere ilişkin önerme sunar. d) Bir doğal sayının 2, 3, 4, 5, 6, 9 ve 10 ile tam bölünebilmesindeki kriterlerin farklı durumlarda kullanışlılığını değerlendirir."
     }
    },
    {
     "ay": "EYLÜL",
     "hafta": "3.HAFTA(22-28)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "SAYILAR VE NİCELİKLER(1)",
      "icerikCercevesi": "Doğal Sayıların Çarpanları ve Katları",
      "ogrenmeCiktilari": "MAT.6.1.3. Bir doğal sayının asal olma durumunu ve asal çarpanlarını çözümleyebilme MAT.6.1.4. Günlük hayat problemleri ya da matematiksel durumlar üzerinden ortak kat ve ortak böleni yorumlayabilme",
      "surecBilesenleri": "MAT.6.1.3 a) Bir doğal sayının asal olup olmadığını ve asal çarpanlarını belirler. b) Asal sayıların özelliklerini ve bir doğal sayı ile asal çarpanları arasındaki iliş- kileri belirler. MAT.6.1.4. a) Problemlerde ya da matematiksel durumlarda verilen iki sayının ortak katlarını ve ortak bölenlerini inceler. b) İncelediği ortak kat veya ortak bölen ilişkilerini çizim, tablo ve sayı doğrusu gibi matematiksel temsillerle ifade eder. c) İki sayının ortak katlarını ve ortak bölenlerini kendi ifadelerini kullanarak açıklar."
     }
    },
    {
     "ay": "EKİM",
     "hafta": "4.HAFTA(29-05)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "İSTATİSTİKSEL ARAŞTIRMA SÜRECİ",
      "icerikCercevesi": "Kategorik ve Nicel (Kesikli) Veri Dağılımları",
      "ogrenmeCiktilari": "MAT.6.5.1. Kategorik veya nicel (kesikli) veri ile çalışabilme ve veriye dayalı karar verebilme",
      "surecBilesenleri": "a) Kategorik veya nicel (kesikli) veriye dayanan istatistiksel araştırma gerekti ren durumları fark eder. b) Kategorik veya nicel (kesikli) veriye dayanan betimleme veya karşılaştırma gerektirebilecek araştırma soruları oluşturur. c) Kategorik veya nicel (kesikli) veriye ulaşmak için plan yapar. ç) Kategorik veya nicel (kesikli) veriye ve araştırma sorusuna uygun anket soruları hazırlar. d) Anketi kullanarak veri toplar veya hazır veriye ulaşır. e) Veri görselleştirme (kök-yaprak gösterimi, nokta grafiği gibi) ve özetleme (aritmetik ortalama, ortanca ve tepe değer) araçlarını seçme gerekçelerini belirtir. f) Toplanan veriyi uygun araçlarla analiz eder. g) Araştırma sonuçlarını elde eder. ğ) Araştırmada ulaştığı sonuçlara yönelik gerekçeler sunar. h) Araştırma sonuçlarının araştırma sorusuna ne düzeyde cevap verdiğini de- ğerlendirir. ı) Araştırma süreci adımlarını değerlendirerek araştırma sürecine uygun ol mayan adımları yeniden planlar.",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık SDB3.2. Esneklik SDB3.3. Sorumlu Karar Verme",
      "degerler": "D1. Adalet D3. Çalışkanlık D5. Duyarlılık D6. Dürüstlük D8. Mahremiyet D14. Saygı D17. Tasarruf",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlı OB3. Finansal Okuryazarlık",
      "degerlendirme": "Akran değerlendirme formu Çalışma kâğıdı Performans görevi"
     }
    },
    {
     "ay": "EKİM",
     "hafta": "5.HAFTA(06-12)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "İSTATİSTİKSEL ARAŞTIRMA SÜRECİ",
      "icerikCercevesi": "Kategorik ve Nicel (Kesikli) Veri Dağılımları",
      "ogrenmeCiktilari": "MAT.6.5.1. Kategorik veya nicel (kesikli) veri ile çalışabilme ve veriye dayalı karar verebilme",
      "surecBilesenleri": "a) Kategorik veya nicel (kesikli) veriye dayanan istatistiksel araştırma gerekti ren durumları fark eder. b) Kategorik veya nicel (kesikli) veriye dayanan betimleme veya karşılaştırma gerektirebilecek araştırma soruları oluşturur. c) Kategorik veya nicel (kesikli) veriye ulaşmak için plan yapar. ç) Kategorik veya nicel (kesikli) veriye ve araştırma sorusuna uygun anket so ruları hazırlar. d) Anketi kullanarak veri toplar veya hazır veriye ulaşır. e) Veri görselleştirme (kök-yaprak gösterimi, nokta grafiği gibi) ve özetleme (aritmetik ortalama, ortanca ve tepe değer) araçlarını seçme gerekçelerini belirtir. f) Toplanan veriyi uygun araçlarla analiz eder. g) Araştırma sonuçlarını elde eder. ğ) Araştırmada ulaştığı sonuçlara yönelik gerekçeler sunar. h) Araştırma sonuçlarının araştırma sorusuna ne düzeyde cevap verdiğini de- ğerlendirir. ı) Araştırma süreci adımlarını değerlendirerek araştırma sürecine uygun ol mayan adımları yeniden planlar.",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık SDB3.2. Esneklik SDB3.3. Sorumlu Karar Verme",
      "degerler": "D1. Adalet D3. Çalışkanlık D5. Duyarlılık D6. Dürüstlük D8. Mahremiyet D14. Saygı D17. Tasarruf",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlı OB3. Finansal Okuryazarlık",
      "degerlendirme": "Akran değerlendirme formu Çalışma kâğıdı Performans görevi"
     }
    },
    {
     "ay": "EKİM",
     "hafta": "6.HAFTA(13-19)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "İSTATİSTİKSEL ARAŞTIRMA SÜRECİ",
      "icerikCercevesi": "Kategorik ve Nicel (Kesikli) Veri Dağılımları",
      "ogrenmeCiktilari": "MAT.6.5.1. Kategorik veya nicel (kesikli) veri ile çalışabilme ve veriye dayalı karar verebilme",
      "surecBilesenleri": "a) Kategorik veya nicel (kesikli) veriye dayanan istatistiksel araştırma gerekti ren durumları fark eder. b) Kategorik veya nicel (kesikli) veriye dayanan betimleme veya karşılaştırma gerektirebilecek araştırma soruları oluşturur. c) Kategorik veya nicel (kesikli) veriye ulaşmak için plan yapar. ç) Kategorik veya nicel (kesikli) veriye ve araştırma sorusuna uygun anket so ruları hazırlar. d) Anketi kullanarak veri toplar veya hazır veriye ulaşır. e) Veri görselleştirme (kök-yaprak gösterimi, nokta grafiği gibi) ve özetleme (aritmetik ortalama, ortanca ve tepe değer) araçlarını seçme gerekçelerini belirtir. f) Toplanan veriyi uygun araçlarla analiz eder. g) Araştırma sonuçlarını elde eder. ğ) Araştırmada ulaştığı sonuçlara yönelik gerekçeler sunar. h) Araştırma sonuçlarının araştırma sorusuna ne düzeyde cevap verdiğini de- ğerlendirir. ı) Araştırma süreci adımlarını değerlendirerek araştırma sürecine uygun ol mayan adımları yeniden planlar.",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık SDB3.2. Esneklik SDB3.3. Sorumlu Karar Verme",
      "degerler": "D1. Adalet D3. Çalışkanlık D5. Duyarlılık D6. Dürüstlük D8. Mahremiyet D14. Saygı D17. Tasarruf",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlı OB3. Finansal Okuryazarlık",
      "degerlendirme": "Akran değerlendirme formu Çalışma kâğıdı Performans görevi"
     }
    },
    {
     "ay": "EKİM",
     "hafta": "7.HAFTA(20-26)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "İSTATİSTİKSEL ARAŞTIRMA SÜRECİ",
      "icerikCercevesi": "Kategorik ve Nicel (Kesikli) Veri Dağılımları",
      "ogrenmeCiktilari": "MAT.6.5.1. Kategorik veya nicel (kesikli) veri ile çalışabilme ve veriye dayalı karar verebilme",
      "surecBilesenleri": "a) Kategorik veya nicel (kesikli) veriye dayanan istatistiksel araştırma gerektiren durumları fark eder. b) Kategorik veya nicel (kesikli) veriye dayanan betimleme veya karşılaştırma gerektirebilecek araştırma soruları oluşturur. c) Kategorik veya nicel (kesikli) veriye ulaşmak için plan yapar. ç) Kategorik veya nicel (kesikli) veriye ve araştırma sorusuna uygun anket soruları hazırlar. d) Anketi kullanarak veri toplar veya hazır veriye ulaşır. e) Veri görselleştirme (kök-yaprak gösterimi, nokta grafiği gibi) ve özetleme (aritmetik ortalama, ortanca ve tepe değer) araçlarını seçme gerekçelerini belirtir. f) Toplanan veriyi uygun araçlarla analiz eder. g) Araştırma sonuçlarını elde eder. ğ) Araştırmada ulaştığı sonuçlara yönelik gerekçeler sunar. h) Araştırma sonuçlarının araştırma sorusuna ne düzeyde cevap verdiğini de- ğerlendirir. ı) Araştırma süreci adımlarını değerlendirerek araştırma sürecine uygun olmayan adımları yeniden planlar.",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık SDB3.2. Esneklik SDB3.3. Sorumlu Karar Verme",
      "degerler": "D1. Adalet D3. Çalışkanlık D5. Duyarlılık D6. Dürüstlük D8. Mahremiyet D14. Saygı D17. Tasarruf",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlı OB3. Finansal Okuryazarlık",
      "degerlendirme": "Akran değerlendirme formu Çalışma kâğıdı Performans görevi"
     }
    },
    {
     "ay": "EKİM-KASIM",
     "hafta": "8.HAFTA(27-02)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "İSTATİSTİKSEL ARAŞTIRMA SÜRECİİSTATİSTİKSEL ARAŞTIRMA SÜRECİİSTATİSTİKSEL ARAŞTIRMA SÜRECİ",
      "icerikCercevesi": "Kategorik ve Nicel (Kesikli) Veri DağılımlarıKategorik ve Nicel (Kesikli) Veri DağılımlarıKategorik ve Nicel (Kesikli) Veri Dağılımları",
      "ogrenmeCiktilari": "MAT.6.5.2. Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı is tatistiksel sonuç veya yorumları tartışabilmeMAT.6.5.2. Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı is tatistiksel sonuç veya yorumları tartışabilmeMAT.6.5.2. Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı is tatistiksel sonuç veya yorumları tartışabilme",
      "surecBilesenleri": "a) Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı istatistiksel sonuç veya yorumlara yönelik istatistiksel temellendirme yapar. b) Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı istatistiksel sonuç veya yorumlara yönelik hataları ya da yanlılıkları tespit eder. c) Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı istatistiksel sonuç veya yorumları çürütür ya da kabul eder.a) Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı istatistiksel sonuç veya yorumlara yönelik istatistiksel temellendirme yapar. b) Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı istatistiksel sonuç veya yorumlara yönelik hataları ya da yanlılıkları tespit eder. c) Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı istatistiksel sonuç veya yorumları çürütür ya da kabul eder.a) Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı istatistiksel sonuç veya yorumlara yönelik istatistiksel temellendirme yapar. b) Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı istatistiksel sonuç veya yorumlara yönelik hataları ya da yanlılıkları tespit eder. c) Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı istatistiksel sonuç veya yorumları çürütür ya da kabul eder.",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık SDB3.2. Esneklik SDB3.3. Sorumlu Karar VermeSDB1.2. Öz Düzenleme/Kendini Düzenleme SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık SDB3.2. Esneklik SDB3.3. Sorumlu Karar VermeSDB1.2. Öz Düzenleme/Kendini Düzenleme SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık SDB3.2. Esneklik SDB3.3. Sorumlu Karar Verme",
      "degerler": "D1. Adalet D3. Çalışkanlık D5. Duyarlılık D6. Dürüstlük D8. Mahremiyet D14. Saygı D17. TasarrufD1. Adalet D3. Çalışkanlık D5. Duyarlılık D6. Dürüstlük D8. Mahremiyet D14. Saygı D17. TasarrufD1. Adalet D3. Çalışkanlık D5. Duyarlılık D6. Dürüstlük D8. Mahremiyet D14. Saygı D17. Tasarruf",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlı OB3. Finansal OkuryazarlıkOB2. Dijital Okuryazarlı OB3. Finansal OkuryazarlıkOB2. Dijital Okuryazarlı OB3. Finansal Okuryazarlık",
      "degerlendirme": "Akran değerlendirme formu Çalışma kâğıdı Performans göreviAkran değerlendirme formu Çalışma kâğıdı Performans göreviAkran değerlendirme formu Çalışma kâğıdı Performans görevi\nCumhuriyet Bayramı"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "9.HAFTA(03-09)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "İSTATİSTİKSEL ARAŞTIRMA SÜRECİ SAYILAR VE NİCELİKLER(2)",
      "icerikCercevesi": "Kategorik ve Nicel (Kesikli) Veri Dağılımları Kesirlerle İşlemler",
      "ogrenmeCiktilari": "MAT.6.5.2. Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı is tatistiksel sonuç veya yorumları tartışabilme MAT.6.1.5. Gerçek yaşam durumlarında ondalık gösterimlerin basamak değerlerini kesir lerden yararlanarak yorumlayabilme",
      "surecBilesenleri": "MAT.6.5.2. Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı istatistiksel sonuç veya yorumlara yönelik istatistiksel temellendirme yapar. b) Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı istatistiksel sonuç veya yorumlara yönelik hataları ya da yanlılıkları tespit eder. c) Başkaları tarafından oluşturulan kategorik veya nicel (kesikli) veriye dayalı istatistiksel sonuç veya yorumları çürütür ya da kabul eder. MAT.6.1.5 a) Ondalık gösterimlerin basamak değerlerini inceler. b) Ondalık gösterimlerin basamak değerlerini paydası 10, 100 ve 1000 olan kesirlerin toplamlarını kullanarak yeniden ifade eder. c) Ondalık gösterimlerin basamak değerlerini kendi cümleleriyle açıklar.",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık",
      "degerler": "D4. Dostluk D5. Duyarlılık D14.Saygı D16. Sorumluluk D17. Tasarruf D18. Temizlik D19.Vatanseverlik",
      "okuryazarlikBecerileri": "OB1. Bilgi Okuryazarlığı OB3. Finansal Okuryazarlık OB8. Sürdürülebilirlik Okuryazarlığı",
      "degerlendirme": "Çalışma kâğıdı Açık uçlu sorular İzleme testi Sayı kartları Görsel kartlar Performans görevi\nKızılay Haftası"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "10.HAFTA(17-23)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "SAYILAR VE NİCELİKLER(2)",
      "icerikCercevesi": "Kesirlerle İşlemler",
      "ogrenmeCiktilari": "MAT.6.1.6. Kesir ve bölme işlemi arasındaki ilişkiye yönelik tümevarımsal akıl yürütebilme",
      "surecBilesenleri": "a) Kağıt-kalemle ve hesap makinesinde bölme işlemi gerçekleştirerek kesirlerin ondalık gösterimlerine ilişkin gözlem yapar. b) Kesirlerin sonlu ve devirli ondalık gösterimlerine ait örüntüleri belirler. c) Örüntülerde keşfedilen ilişkileri geneller.",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık",
      "degerler": "D4. Dostluk D5. Duyarlılık D14.Saygı D16. Sorumluluk D17. Tasarruf D18. Temizlik D19.Vatanseverlik",
      "okuryazarlikBecerileri": "OB1. Bilgi Okuryazarlığı OB3. Finansal Okuryazarlık OB8. Sürdürülebilirlik Okuryazarlığı",
      "degerlendirme": "Çalışma kâğıdı Açık uçlu sorular İzleme testi Sayı kartları Görsel kartlar Performans görevi\nDünya Çocuk Hakları Günü"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "11.HAFTA(24-30)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "SAYILAR VE NİCELİKLER(2)",
      "icerikCercevesi": "Kesirlerle İşlemler",
      "ogrenmeCiktilari": "MAT.6.1.7. Karşılaştığı günlük hayat ya da matematiksel durumlarda standart uzunluk ölçme birimlerini değerlendirebilme",
      "surecBilesenleri": "a) Standart ölçme birimlerini kullanarak ölçme yapar. b) Ölçme sonuçlarını belirlediği ölçme birimleri ile karşılaştırır. c) Karşılaştırmalarına ilişkin yargıda bulunur.",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık",
      "degerler": "D4. Dostluk D5. Duyarlılık D14.Saygı D16. Sorumluluk D17. Tasarruf D18. Temizlik D19.Vatanseverlik",
      "okuryazarlikBecerileri": "OB1. Bilgi Okuryazarlığı OB3. Finansal Okuryazarlık OB8. Sürdürülebilirlik Okuryazarlığı",
      "degerlendirme": "Çalışma kâğıdı Açık uçlu sorular İzleme testi Sayı kartları Görsel kartlar Performans görevi\nÖğretmenler Günü"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "12.HAFTA(01-07)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "Kesirlerle İşlemler",
      "icerikCercevesi": "MAT.6.1.8. Gerçek yaşam durumlarında karşılaşılan kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem gerektiren problemleri çözebilme",
      "ogrenmeCiktilari": "a) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde sayı ve işlem bileşenlerini belirler. b) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde verilenler ile istenenlerin gerektirdiği işlemler arasındaki ilişkiyi belirler. c) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde problem bağlamına uygun temsilleri (şekil, tablo, diyagram gibi) kullanır. ç) Kullanılan temsil üzerinden problemi kendi ifadeleri ile açıklar. d) Problemlerin sonucuna ilişkin tahminde bulunur ve işlemleri gerçekleştirmek için stratejiler geliştirir. e) Stratejileri işe koşarak problemleri çözer. f) Çözüm yollarını kontrol eder ve çözüme ulaştırmayan stratejiyi değiştirir. g) Problemlerin çözümü için kullandığı veya geliştirdiği stratejileri gözden geçirerek kısa yolları değerlendirir. ğ) Kullandığı strateji veya stratejileri farklı problemlerin çözümlerine geneller. h) Genellemenin geçerliliğini değerlendirir.",
      "surecBilesenleri": "a) Standart ölçme birimlerini kullanarak ölçme yapar. b) Ölçme sonuçlarını belirlediği ölçme birimleri ile karşılaştırır. c) Karşılaştırmalarına ilişkin yargıda bulunur.",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık",
      "degerler": "D4. Dostluk D5. Duyarlılık D14.Saygı D16. Sorumluluk D17. Tasarruf D18. Temizlik D19.Vatanseverlik",
      "okuryazarlikBecerileri": "OB1. Bilgi Okuryazarlığı OB3. Finansal Okuryazarlık OB8. Sürdürülebilirlik Okuryazarlığı",
      "degerlendirme": "Çalışma kâğıdı Açık uçlu sorular İzleme testi Sayı kartları Görsel kartlar Performans görevi\nDünya Engelliler Günü"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "13.HAFTA(08-14)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "Kesirlerle İşlemler",
      "icerikCercevesi": "MAT.6.1.8. Gerçek yaşam durumlarında karşılaşılan kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem gerektiren problemleri çözebilme",
      "ogrenmeCiktilari": "a) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde sayı ve işlem bileşenlerini belirler. b) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde verilenler ile istenenlerin gerektirdiği işlemler arasındaki ilişkiyi belirler. c) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde problem bağlamına uygun temsilleri (şekil, tablo, diyagram gibi) kullanır. ç) Kullanılan temsil üzerinden problemi kendi ifadeleri ile açıklar. d) Problemlerin sonucuna ilişkin tahminde bulunur ve işlemleri gerçekleştirmek için stratejiler geliştirir. e) Stratejileri işe koşarak problemleri çözer. f) Çözüm yollarını kontrol eder ve çözüme ulaştırmayan stratejiyi değiştirir. g) Problemlerin çözümü için kullandığı veya geliştirdiği stratejileri gözden geçirerek kısa yolları değerlendirir. ğ) Kullandığı strateji veya stratejileri farklı problemlerin çözümlerine geneller. h) Genellemenin geçerliliğini değerlendirir.",
      "surecBilesenleri": "a) Standart ölçme birimlerini kullanarak ölçme yapar. b) Ölçme sonuçlarını belirlediği ölçme birimleri ile karşılaştırır. c) Karşılaştırmalarına ilişkin yargıda bulunur.",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık",
      "degerler": "D4. Dostluk D5. Duyarlılık D14.Saygı D16. Sorumluluk D17. Tasarruf D18. Temizlik D19.Vatanseverlik",
      "okuryazarlikBecerileri": "OB1. Bilgi Okuryazarlığı OB3. Finansal Okuryazarlık OB8. Sürdürülebilirlik Okuryazarlığı",
      "degerlendirme": "Çalışma kâğıdı Açık uçlu sorular İzleme testi Sayı kartları Görsel kartlar Performans görevi"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "14.HAFTA(15-21)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "Kesirlerle İşlemler",
      "icerikCercevesi": "MAT.6.1.8. Gerçek yaşam durumlarında karşılaşılan kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem gerektiren problemleri çözebilme",
      "ogrenmeCiktilari": "a) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde sayı ve işlem bileşenlerini belirler. b) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde veri lenler ile istenenlerin gerektirdiği işlemler arasındaki ilişkiyi belirler. c) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde prob lem bağlamına uygun temsilleri (şekil, tablo, diyagram gibi) kullanır. ç) Kullanılan temsil üzerinden problemi kendi ifadeleri ile açıklar. d) Problemlerin sonucuna ilişkin tahminde bulunur ve işlemleri gerçekleştir mek için stratejiler geliştirir. e) Stratejileri işe koşarak problemleri çözer. f) Çözüm yollarını kontrol eder ve çözüme ulaştırmayan stratejiyi değiştirir. g) Problemlerin çözümü için kullandığı veya geliştirdiği stratejileri gözden geçi rerek kısa yolları değerlendirir. ğ) Kullandığı strateji veya stratejileri farklı problemlerin çözümlerine geneller. h) Genellemenin geçerliliğini değerlendirir",
      "surecBilesenleri": "a) Standart ölçme birimlerini kullanarak ölçme yapar. b) Ölçme sonuçlarını belirlediği ölçme birimleri ile karşılaştırır. c) Karşılaştırmalarına ilişkin yargıda bulunur.",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık",
      "degerler": "D4. Dostluk D5. Duyarlılık D14.Saygı D16. Sorumluluk D17. Tasarruf D18. Temizlik D19.Vatanseverlik",
      "okuryazarlikBecerileri": "OB1. Bilgi Okuryazarlığı OB3. Finansal Okuryazarlık OB8. Sürdürülebilirlik Okuryazarlığı",
      "degerlendirme": "Çalışma kâğıdı Açık uçlu sorular İzleme testi Sayı kartları Görsel kartlar Performans görevi"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "15.HAFTA(22-28)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "SAYILAR VE NİCELİKLER(2)",
      "icerikCercevesi": "Kesirlerle İşlemler",
      "ogrenmeCiktilari": "MAT.6.1.8. Gerçek yaşam durumlarında karşılaşılan kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem gerektiren problemleri çözebilme",
      "surecBilesenleri": "a) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde sayı ve işlem bileşenlerini belirler. b) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde verilenler ile istenenlerin gerektirdiği işlemler arasındaki ilişkiyi belirler. c) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde problem bağlamına uygun temsilleri (şekil, tablo, diyagram gibi) kullanır. ç) Kullanılan temsil üzerinden problemi kendi ifadeleri ile açıklar. d) Problemlerin sonucuna ilişkin tahminde bulunur ve işlemleri gerçekleştirmek için stratejiler geliştirir. e) Stratejileri işe koşarak problemleri çözer. f) Çözüm yollarını kontrol eder ve çözüme ulaştırmayan stratejiyi değiştirir. g) Problemlerin çözümü için kullandığı veya geliştirdiği stratejileri gözden geçirerek kısa yolları değerlendirir. ğ) Kullandığı strateji veya stratejileri farklı problemlerin çözümlerine geneller. h) Genellemenin geçerliliğini değerlendirir",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık",
      "degerler": "D4. Dostluk D5. Duyarlılık D14.Saygı D16. Sorumluluk D17. Tasarruf D18. Temizlik D19.Vatanseverlik",
      "okuryazarlikBecerileri": "OB1. Bilgi Okuryazarlığı OB3. Finansal Okuryazarlık OB8. Sürdürülebilirlik Okuryazarlığı",
      "degerlendirme": "Çalışma kâğıdı Açık uçlu sorular İzleme testi Sayı kartları Görsel kartlar Performans görevi"
     }
    },
    {
     "ay": "ARALIK-OCAK",
     "hafta": "16.HAFTA(29-04)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "SAYILAR VE NİCELİKLER(2)SAYILAR VE NİCELİKLER(2)",
      "icerikCercevesi": "Kesirlerle İşlemlerKesirlerle İşlemler",
      "ogrenmeCiktilari": "MAT.6.1.8. Gerçek yaşam durumlarında karşılaşılan kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem gerektiren problemleri çözebilmeMAT.6.1.8. Gerçek yaşam durumlarında karşılaşılan kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem gerektiren problemleri çözebilme",
      "surecBilesenleri": "MAT.6.1.8 a) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde sayı ve işlem bileşenlerini belirler. b) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde verilenler ile istenenlerin gerektirdiği işlemler arasındaki ilişkiyi belirler. c) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde problem bağlamına uygun temsilleri (şekil, tablo, diyagram gibi) kullanır. ç) Kullanılan temsil üzerinden problemi kendi ifadeleri ile açıklar. d) Problemlerin sonucuna ilişkin tahminde bulunur ve işlemleri gerçekleştirmek için stratejiler geliştirir. e) Stratejileri işe koşarak problemleri çözer. f) Çözüm yollarını kontrol eder ve çözüme ulaştırmayan stratejiyi değiştirir. g) Problemlerin çözümü için kullandığı veya geliştirdiği stratejileri gözden geçirerek kısa yolları değerlendirir. ğ) Kullandığı strateji veya stratejileri farklı problemlerin çözümlerine geneller. h) Genellemenin geçerliliğini değerlendirirMAT.6.1.8 a) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde sayı ve işlem bileşenlerini belirler. b) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde verilenler ile istenenlerin gerektirdiği işlemler arasındaki ilişkiyi belirler. c) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde problem bağlamına uygun temsilleri (şekil, tablo, diyagram gibi) kullanır. ç) Kullanılan temsil üzerinden problemi kendi ifadeleri ile açıklar. d) Problemlerin sonucuna ilişkin tahminde bulunur ve işlemleri gerçekleştirmek için stratejiler geliştirir. e) Stratejileri işe koşarak problemleri çözer. f) Çözüm yollarını kontrol eder ve çözüme ulaştırmayan stratejiyi değiştirir. g) Problemlerin çözümü için kullandığı veya geliştirdiği stratejileri gözden geçirerek kısa yolları değerlendirir. ğ) Kullandığı strateji veya stratejileri farklı problemlerin çözümlerine geneller. h) Genellemenin geçerliliğini değerlendirir",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim SDB2.2. İş Birliği SDB2.3. Sosyal FarkındalıkSDB1.2. Öz Düzenleme/Kendini Düzenleme SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim SDB2.2. İş Birliği SDB2.3. Sosyal Farkındalık",
      "degerler": "D4. Dostluk D5. Duyarlılık D14.Saygı D16. Sorumluluk D17. Tasarruf D18. Temizlik D19.VatanseverlikD4. Dostluk D5. Duyarlılık D14.Saygı D16. Sorumluluk D17. Tasarruf D18. Temizlik D19.Vatanseverlik",
      "okuryazarlikBecerileri": "OB1. Bilgi Okuryazarlığı OB3. Finansal Okuryazarlık OB8. Sürdürülebilirlik OkuryazarlığıOB1. Bilgi Okuryazarlığı OB3. Finansal Okuryazarlık OB8. Sürdürülebilirlik Okuryazarlığı",
      "degerlendirme": "Çalışma kâğıdı Açık uçlu sorular İzleme testi Sayı kartları Görsel kartlar Performans göreviÇalışma kâğıdı Açık uçlu sorular İzleme testi Sayı kartları Görsel kartlar Performans görevi\nYılbaşı Tatili"
     }
    },
    {
     "ay": "OCAK",
     "hafta": "17.HAFTA(05-11)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "VERİDEN OLASILIĞA",
      "icerikCercevesi": "Kesirlerle İşlemler Deneysel Olasılık",
      "ogrenmeCiktilari": "MAT.6.1.8. Gerçek yaşam durumlarında karşılaşılan kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem gerektiren problemleri çözebilme MAT.6.6.1. Bir olayın olasılığını gözleme dayalı tahmin edebilme",
      "surecBilesenleri": "MAT.6.1.8 a) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde sayı ve işlem bileşenlerini belirler. b) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde verilenler ile istenenlerin gerektirdiği işlemler arasındaki ilişkiyi belirler. c) Kesir, ondalık ve yüzde gösterimleri ile ilgili dört işlem problemlerinde problem bağlamına uygun temsilleri (şekil, tablo, diyagram gibi) kullanır. ç) Kullanılan temsil üzerinden problemi kendi ifadeleri ile açıklar. d) Problemlerin sonucuna ilişkin tahminde bulunur ve işlemleri gerçekleştirmek için stratejiler geliştirir. e) Stratejileri işe koşarak problemleri çözer. f) Çözüm yollarını kontrol eder ve çözüme ulaştırmayan stratejiyi değiştirir. g) Problemlerin çözümü için kullandığı veya geliştirdiği stratejileri gözden geçirerek kısa yolları değerlendirir. ğ) Kullandığı strateji veya stratejileri farklı problemlerin çözümlerine geneller. h) Genellemenin geçerliliğini değerlendirir MAT.6.6.1. a) Bir olayın olasılığı ile deneylerden elde ettiği veriyi ilişkilendirir. b) Deneye ait tekrar sayısı ile deneyin çıktılarının göreli sıklıklarının ilişkisine yönelik çıkarım yapar. c) Çıkarımlardan hareketle olasılık değerini hesaplama için göreli sıklığın kullanı- mına yönelik yargıda bulunur.",
      "sosyalDuygusalOgrenme": "SDB2.2. İş Birliği",
      "degerler": "D3. Çalışkanlık",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlık OB4. Görsel Okuryazarlık",
      "degerlendirme": "Çalışma kâğıdı Performans görevi Öz değerlendirme Akran değerlendirme Grup değerlendirme formları"
     }
    },
    {
     "ay": "OCAK",
     "hafta": "18.HAFTA(12-18)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "VERİDEN OLASILIĞAVERİDEN OLASILIĞA",
      "icerikCercevesi": "Deneysel OlasılıkDeneysel Olasılık",
      "ogrenmeCiktilari": "MAT.6.6.1. Bir olayın olasılığını gözleme dayalı tahmin edebilmeMAT.6.6.1. Bir olayın olasılığını gözleme dayalı tahmin edebilme",
      "surecBilesenleri": "MAT.6.6.1. a) Bir olayın olasılığı ile deneylerden elde ettiği veriyi ilişkilendirir. b) Deneye ait tekrar sayısı ile deneyin çıktılarının göreli sıklıklarının ilişkisine yönelik çıkarım yapar. c) Çıkarımlardan hareketle olasılık değerini hesaplama için göreli sıklığın kullanı- mına yönelik yargıda bulunur.MAT.6.6.1. a) Bir olayın olasılığı ile deneylerden elde ettiği veriyi ilişkilendirir. b) Deneye ait tekrar sayısı ile deneyin çıktılarının göreli sıklıklarının ilişkisine yönelik çıkarım yapar. c) Çıkarımlardan hareketle olasılık değerini hesaplama için göreli sıklığın kullanı- mına yönelik yargıda bulunur.",
      "sosyalDuygusalOgrenme": "SDB2.2. İş BirliğiSDB2.2. İş Birliği",
      "degerler": "D3. ÇalışkanlıkD3. Çalışkanlık",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlık OB4. Görsel OkuryazarlıkOB2. Dijital Okuryazarlık OB4. Görsel Okuryazarlık",
      "degerlendirme": "Çalışma kâğıdı Performans görevi Öz değerlendirme Akran değerlendirme Grup değerlendirme formlarıÇalışma kâğıdı Performans görevi Öz değerlendirme Akran değerlendirme Grup değerlendirme formları\nBirinci Dönemin Sona Ermesi"
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "19.HAFTA(02-08)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "GEOMETRİK ŞEKİLLER",
      "icerikCercevesi": "İki Paralel Doğrunun Bir Kesenile Oluşturduğu Açılar Üçgenin Açıları Yamuk, Paralelkenar, Eşkenar Dörtgen, Dikdörtgen ve Karenin Kenar, Açı ve Köşegen Özellikleri",
      "ogrenmeCiktilari": "MAT.6.3.1. Düzlemde iki paralel doğru ve bir kesen ile oluşan açıları sınıflandırabilme",
      "surecBilesenleri": "a) Düzlemde iki paralel doğru ve bir kesen ile oluşan açıları belirler. b) Düzlemde iki paralel doğru ve bir kesen ile oluşan açıları ayrıştırır. c) Düzlemde iki paralel doğru ve bir kesen ile oluşan açıları tasnif eder. ç) Bu tasnife göre açıları adlandırır",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme, SDB2.1. İletişim, SDB3.3. Sorumlu Karar Verme",
      "degerler": "D3. Çalışkanlık D4. Dostluk D16. Sorumluluk",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlık",
      "degerlendirme": "Çalışma kağıdı Performans görevi Zihin haritası İzleme testi\nİkinci Yarıyıl Başlangıcı"
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "20.HAFTA(09-15)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "GEOMETRİK ŞEKİLLER",
      "icerikCercevesi": "İki Paralel Doğrunun Bir Kesenile Oluşturduğu Açılar Üçgenin Açıları Yamuk, Paralelkenar, Eşkenar Dörtgen, Dikdörtgen ve Karenin Kenar, Açı ve Köşegen Özellikleri",
      "ogrenmeCiktilari": "MAT.6.3.2. Matematiksel araç ve teknolojiden yararlanarak iki paralel doğrunun iki ke senle oluşturduğu şekillerin özelliklerine dair çıkarım yapabilme",
      "surecBilesenleri": "a) Düzlemde iki paralel doğrunun iki kesenle oluşturduğu şekillerin özelliklerine dair varsayımda bulunur. b) Oluşan şekilleri çeşitli özelliklerine göre listeler. c) Oluşan şekilleri kenar ve açı özelliklerini dikkate alarak varsayımları ile kar- şılaştırır. ç) Oluşan şekillerin iç açılarının ölçüleri toplamına ve yamuk, paralelkenar, eş- kenar dörtgen, dikdörtgen, karenin ortak özelliklerine dair önermeler sunar. d) Sunduğu önermelerin dörtgenlerin sınıflandırılmasına yönelik katkısını de- ğerlendirir.",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme, SDB2.1. İletişim, SDB3.3. Sorumlu Karar Verme",
      "degerler": "D3. Çalışkanlık D4. Dostluk D16. Sorumluluk",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlık",
      "degerlendirme": "Çalışma kağıdı Performans görevi Zihin haritası İzleme testi"
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "21.HAFTA(16-22)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "GEOMETRİK ŞEKİLLER",
      "icerikCercevesi": "İki Paralel Doğrunun Bir Kesenile Oluşturduğu Açılar Üçgenin Açıları Yamuk, Paralelkenar, Eşkenar Dörtgen, Dikdörtgen ve Karenin Kenar, Açı ve Köşegen Özellikleri",
      "ogrenmeCiktilari": "MAT.6.3.3. Matematiksel araç ve teknolojiden yararlanarak birbirlerini ortalayan doğru parçalarını köşegen kabul eden dörtgenlere yönelik çıkarım yapabilme",
      "surecBilesenleri": "a) Birbirlerini ortalayan doğru parçalarını köşegen kabul eden dörtgenlere yö- nelik varsayımlarda bulunur. b) Birbirlerini ortalayan doğru parçalarını köşegen kabul eden dörtgenleri oluş- turur ve listeler. c) Oluşturulan dörtgenleri varsayımları ile karşılaştırır. ç) Özelliklerine bağlı olarak birbirlerini ortalayan doğru parçalarını köşegen kabul eden dörtgenlere yönelik önermeler sunar. d) Sunduğu önermelerin dörtgenlerin farklı yollardan tanımlanmasına yönelik katkısını değerlendirir.",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme, SDB2.1. İletişim, SDB3.3. Sorumlu Karar Verme",
      "degerler": "D3. Çalışkanlık D4. Dostluk D16. Sorumluluk",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlık",
      "degerlendirme": "Çalışma kağıdı Performans görevi Zihin haritası İzleme testi"
     }
    },
    {
     "ay": "ŞUBAT-MART",
     "hafta": "22.HAFTA(23-01)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "GEOMETRİK ŞEKİLLER",
      "icerikCercevesi": "İki Paralel Doğrunun Bir Kesenile Oluşturduğu Açılar Üçgenin Açıları Yamuk, Paralelkenar, Eşkenar Dörtgen, Dikdörtgen ve Karenin Kenar, Açı ve Köşegen Özellikleri",
      "ogrenmeCiktilari": "MAT.6.3.4. Üçgen, yamuk, paralelkenar, eşkenar dörtgen, dikdörtgen ve karenin açıları ile ilgili problemleri çözebilme",
      "surecBilesenleri": "MAT.6.3.4. a) Üçgen, yamuk, paralelkenar, eşkenar dörtgen, dikdörtgen ve karenin açıları ile ilgili problemlerde matematiksel bileşenleri (şekil, açı ölçüsü, kenar uzunluğu, paralellik, diklik gibi) belirler. b) Matematiksel bileşenler arasındaki ilişkiyi belirler. c) Problem bağlamındaki temsilleri farklı temsillere dönüştürür. ç) Matematiksel temsillere dönüştürdüğü problemi kendi ifadeleri ile açıklar. d) Problemin çözümü için stratejiler geliştirir. e) Belirlenen stratejileri çözüm için uygular. f) Çözüm yollarını kontrol eder ve çözüme ulaştırmayan stratejiyi değiştirir. g) Problemin çözümü için kullandığı veya geliştirdiği stratejileri gözden geçirerek alternatif çözüm yollarını değerlendirir. ğ) Kullandığı strateji veya stratejileri farklı problemlerin çözümlerine geneller. h) Genellemenin geçerliliğini matematiksel örneklerle değerlendirir",
      "sosyalDuygusalOgrenme": "SDB1.2. Öz Düzenleme/Kendini Düzenleme, SDB2.1. İletişim, SDB3.3. Sorumlu Karar Verme",
      "degerler": "D3. Çalışkanlık D4. Dostluk D16. Sorumluluk",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlık",
      "degerlendirme": "Çalışma kağıdı Performans görevi Zihin haritası İzleme testi"
     }
    },
    {
     "ay": "MART",
     "hafta": "23.HAFTA(02-08)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "İŞLEMLERLE CEBİRSEL DÜŞÜNME VE DEĞİŞİMLER",
      "icerikCercevesi": "Cebirsel İfadeler",
      "ogrenmeCiktilari": "MAT.6.2.1. Gerçek yaşam durumlarında bilinen niceliklerden bilinmeyen niceliklere ilişkin muhakeme yapabilme",
      "surecBilesenleri": "a) Gerçek yaşam durumlarında nicelikleri belirler. b) Nicelikler arasındaki ilişkileri tablo temsili kullanarak belirler. c) Nicelikler arasındaki ilişkileri cebirsel olarak ifade eder. ç) Cebirsel ifadenin anlamını kendi cümleleri ile açıklar. d) Yorumladığı cebirsel ifadelere karşılık gelen durumlara yönelik varsayımda bulunur. e) Verilen cebirsel ifadelere yönelik varsayımda bulunduğu durumları inceleyerek değişkenlerin ve cebirsel ifadelerin anlamlarına yönelik genellemeleri belirler. f) Elde ettiği genellemelerin varsayımını karşılayıp karşılamadığını farklı sözel ve cebirsel ifadeler ile sınar. g) Doğrulayabileceği sözel ve cebirsel ifadeleri farklı değişken ve değerlerle sö- zel ve cebirsel olarak yeniden ifade eder. ğ) Cebirsel ifadelerin matematiğin farklı alanlarında ve gerçek yaşam durumlarında kullanımına yönelik katkısını ifade eder.",
      "sosyalDuygusalOgrenme": "SDB2.1. İletişim SDB2.3. Sosyal Farkındalık",
      "degerler": "D5. Duyarlılık, D9. Merhamet D17. Tasarruf D20. Yardımseverlik",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlık",
      "degerlendirme": "İzleme testleri Çalışma kâğıtları Performans görevleri"
     }
    },
    {
     "ay": "MART",
     "hafta": "24.HAFTA(09-15)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "İŞLEMLERLE CEBİRSEL DÜŞÜNME VE DEĞİŞİMLER",
      "icerikCercevesi": "Cebirsel İfadeler",
      "ogrenmeCiktilari": "MAT.6.2.1. Gerçek yaşam durumlarında bilinen niceliklerden bilinmeyen niceliklere ilişkin muhakeme yapabilme",
      "surecBilesenleri": "a) Gerçek yaşam durumlarında nicelikleri belirler. b) Nicelikler arasındaki ilişkileri tablo temsili kullanarak belirler. c) Nicelikler arasındaki ilişkileri cebirsel olarak ifade eder. ç) Cebirsel ifadenin anlamını kendi cümleleri ile açıklar. d) Yorumladığı cebirsel ifadelere karşılık gelen durumlara yönelik varsayımda bulunur. e) Verilen cebirsel ifadelere yönelik varsayımda bulunduğu durumları inceleyerek değişkenlerin ve cebirsel ifadelerin anlamlarına yönelik genellemeleri belirler. f) Elde ettiği genellemelerin varsayımını karşılayıp karşılamadığını farklı sözel ve cebirsel ifadeler ile sınar. g) Doğrulayabileceği sözel ve cebirsel ifadeleri farklı değişken ve değerlerle sö- zel ve cebirsel olarak yeniden ifade eder. ğ) Cebirsel ifadelerin matematiğin farklı alanlarında ve gerçek yaşam durumlarında kullanımına yönelik katkısını ifade eder.",
      "sosyalDuygusalOgrenme": "SDB2.1. İletişim SDB2.3. Sosyal Farkındalık",
      "degerler": "D5. Duyarlılık, D9. Merhamet D17. Tasarruf D20. Yardımseverlik",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlık",
      "degerlendirme": "İzleme testleri Çalışma kâğıtları Performans görevleri"
     }
    },
    {
     "ay": "MART",
     "hafta": "25.HAFTA(23-29)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "İŞLEMLERLE CEBİRSEL DÜŞÜNME VE DEĞİŞİMLER",
      "icerikCercevesi": "Cebirsel İfadeler",
      "ogrenmeCiktilari": "MAT.6.2.1. Gerçek yaşam durumlarında bilinen niceliklerden bilinmeyen niceliklere ilişkin muhakeme yapabilme",
      "surecBilesenleri": "a) Gerçek yaşam durumlarında nicelikleri belirler. b) Nicelikler arasındaki ilişkileri tablo temsili kullanarak belirler. c) Nicelikler arasındaki ilişkileri cebirsel olarak ifade eder. ç)Cebirsel ifadenin anlamını kendi cümleleri ile açıklar. d) Yorumladığı cebirsel ifadelere karşılık gelen durumlara yönelik varsayımda bulunur. e) Verilen cebirsel ifadelere yönelik varsayımda bulunduğu durumları inceleyerek değişkenlerin ve cebirsel ifadelerin anlamlarına yönelik genellemeleri belirler. f) Elde ettiği genellemelerin varsayımını karşılayıp karşılamadığını farklı sözel ve cebirsel ifadeler ile sınar. g) Doğrulayabileceği sözel ve cebirsel ifadeleri farklı değişken ve değerlerle sö- zel ve cebirsel olarak yeniden ifade eder. ğ) Cebirsel ifadelerin matematiğin farklı alanlarında ve gerçek yaşam durumlarında kullanımına yönelik katkısını ifade eder.",
      "sosyalDuygusalOgrenme": "SDB2.1. İletişim SDB2.3. Sosyal Farkındalık",
      "degerler": "D5. Duyarlılık, D9. Merhamet D17. Tasarruf D20.Yardımseverlik",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlık",
      "degerlendirme": "İzleme testleri Çalışma kâğıtları Performans görevleri\nSINAV HAFTASI"
     }
    },
    {
     "ay": "MART-NİSAN",
     "hafta": "26.HAFTA(30-05)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "İŞLEMLERLE CEBİRSEL DÜŞÜNME VE DEĞİŞİMLER",
      "icerikCercevesi": "Cebirsel İfadeler",
      "ogrenmeCiktilari": "MAT.6.2.2. Sayı ve şekil örüntülerini yorumlayabilme",
      "surecBilesenleri": "a) Sayı ve şekil örüntülerindeki ilişkileri inceler. b) İncelediği ilişkileri tablo, grafik ve sözel temsiller aracılığıyla ifade eder. c) Farklı temsillerle gösterilen ilişkilerden yola çıkarak örüntülerdeki yapıları cebirsel olarak ifade eder",
      "sosyalDuygusalOgrenme": "SDB2.1. İletişim SDB2.3. Sosyal Farkındalık",
      "degerler": "D5. Duyarlılık, D9. Merhamet D17. Tasarruf D20.Yardımseverlik",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlık",
      "degerlendirme": "İzleme testleri Çalışma kâğıtları Performans görevleri"
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "27.HAFTA(06-12)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "İŞLEMLERLE CEBİRSEL DÜŞÜNME VE DEĞİŞİMLER",
      "icerikCercevesi": "Cebirsel İfadeler",
      "ogrenmeCiktilari": "MAT.6.2.2. Sayı ve şekil örüntülerini yorumlayabilme",
      "surecBilesenleri": "a) Sayı ve şekil örüntülerindeki ilişkileri inceler. b) İncelediği ilişkileri tablo, grafik ve sözel temsiller aracılığıyla ifade eder. c) Farklı temsillerle gösterilen ilişkilerden yola çıkarak örüntülerdeki yapıları cebirsel olarak ifade eder",
      "sosyalDuygusalOgrenme": "SDB2.1. İletişim SDB2.3. Sosyal Farkındalık",
      "degerler": "D5. Duyarlılık, D9. Merhamet D17. Tasarruf D20.Yardımseverlik",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlık",
      "degerlendirme": "İzleme testleri Çalışma kâğıtları Performans görevleri"
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "28.HAFTA(13-19)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "İŞLEMLERLE CEBİRSEL DÜŞÜNME VE DEĞİŞİMLER",
      "icerikCercevesi": "Cebirsel İfadeler",
      "ogrenmeCiktilari": "MAT.6.2.3. Cebirsel ifadeler içeren durumlardaki algoritmaları yorumlayabilme",
      "surecBilesenleri": "a) Cebirsel ifadeler içeren durumlardaki algoritmik yapıyı inceler. b) İncelediği durumlardaki algoritmik yapıyı tablo temsiline veya cebirsel ifadelere dönüştürür. c) Dönüştürdüğü algoritmik yapının içerdiği matematiksel ilişkileri sözel olarak ifade eder.",
      "sosyalDuygusalOgrenme": "SDB2.1. İletişim SDB2.3. Sosyal Farkındalık",
      "degerler": "D5. Duyarlılık, D9. Merhamet D17. Tasarruf D20.Yardımseverlik",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlık",
      "degerlendirme": "İzleme testleri Çalışma kâğıtları Performans görevleri"
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "29.HAFTA(20-26)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "İŞLEMLERLE CEBİRSEL DÜŞÜNME VE DEĞİŞİMLER",
      "icerikCercevesi": "Cebirsel İfadeler",
      "ogrenmeCiktilari": "MAT.6.2.3. Cebirsel ifadeler içeren durumlardaki algoritmaları yorumlayabilme",
      "surecBilesenleri": "MAT.6.2.3 a) Cebirsel ifadeler içeren durumlardaki algoritmik yapıyı inceler. b) İncelediği durumlardaki algoritmik yapıyı tablo temsiline veya cebirsel ifadelere dönüştürür. c) Dönüştürdüğü algoritmik yapının içerdiği matematiksel ilişkileri sözel olarak ifade eder.",
      "sosyalDuygusalOgrenme": "SDB2.1. İletişim SDB2.3. Sosyal Farkındalık",
      "degerler": "D5. Duyarlılık, D9. Merhamet D17. Tasarruf D20.Yardımseverlik",
      "okuryazarlikBecerileri": "OB2. Dijital Okuryazarlık",
      "degerlendirme": "İzleme testleri Çalışma kâğıtları Performans görevleri\n23 Nisan Ulusal Egemenlik ve Çocuk Bayramı"
     }
    },
    {
     "ay": "NİSAN-MAYIS",
     "hafta": "30.HAFTA(27-03)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "GEOMETRİK NİCELİKLER",
      "icerikCercevesi": "Uzunluk ve Alan Ölçme Birimleri Arasındaki İlişki",
      "ogrenmeCiktilari": "MAT.6.4.1. Uzunluk ve alan ölçme birimleri arasındaki ilişkilerle ilgili analojik akıl yürüte bilme",
      "surecBilesenleri": "a) Uzunluk ve alan ölçme birimleri arasındaki ilişkileri gözlemler. b) Uzunluk ve alan ölçme birimleri arasındaki ilişkiyi tespit eder. c) Uzunluk ve alan ölçme birimleri arasında kurulan ilişkiden hareketle alan ölçme birimleri arasındaki ilişkiye dair çıkarım yapar.",
      "sosyalDuygusalOgrenme": "SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim, SDB2.2. İş Birliği SDB3.1. Uyum SDB3.3. Sorumlu Karar Verme",
      "degerler": "D7. Estetik D10. Mütevazılık D14. Saygı",
      "okuryazarlikBecerileri": "OB2.Dijital Okuryazarlık OB4. Görsel Okuryazarlık",
      "degerlendirme": "İzleme testleri Zihin haritası Performans görevi Çalışma kâğıdı\n1 Mayıs İşçi Bayramı"
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "31.HAFTA(04-10)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "GEOMETRİK NİCELİKLER",
      "icerikCercevesi": "Uzunluk ve Alan Ölçme Birimleri Arasındaki İlişki",
      "ogrenmeCiktilari": "MAT.6.4.2. Dikdörtgenin alan bağıntısına yönelik deneyimlerini paralelkenar ve üçgenin alan bağıntılarına yansıtabilme",
      "surecBilesenleri": "a) Dikdörtgenin alan bağıntısını gözden geçirir. b) Dikdörtgenin alan bağıntısından yola çıkarak paralelkenar ve üçgenin alan bağıntıları hakkında çıkarım yapar. c) Çıkarımını farklı örnekler üzerinden değerlendirir",
      "sosyalDuygusalOgrenme": "SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim, SDB2.2. İş Birliği SDB3.1. Uyum SDB3.3. Sorumlu Karar Verme",
      "degerler": "D7. Estetik D10. Mütevazılık D14. Saygı",
      "okuryazarlikBecerileri": "OB2.Dijital Okuryazarlık OB4. Görsel Okuryazarlık",
      "degerlendirme": "İzleme testleri Zihin haritası Performans görevi Çalışma kâğıdı"
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "32.HAFTA(11-17)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "GEOMETRİK NİCELİKLER",
      "icerikCercevesi": "Uzunluk ve Alan Ölçme Birimleri Arasındaki İlişki",
      "ogrenmeCiktilari": "MAT.6.4.3. Geometrik şekillerin alanları ile modellenen gerçek yaşam durumlarına yöne lik problem çözebilme",
      "surecBilesenleri": "a) Geometrik şekillerin alanları ile modellenen gerçek yaşam probleminde ilgili matematiksel bileşenleri (alan, şekil, uzunluk, alan ölçme birimleri gibi) belirler. b) Matematiksel bileşenler arasındaki ilişkiyi belirler. c) Problem bağlamıyla ilişkili verilenleri uygun matematiksel temsillere dönüş- türür. ç) Matematiksel temsillere dönüştürdüğü problemi kendi ifadeleri ile açıklar. d) Problemin sonucuna ilişkin tahminde bulunur ve işlemleri gerçekleştirmek için stratejiler geliştirir. e) Belirlediği stratejileri çözüm için uygular. f) Çözüm yollarını kontrol eder ve çözüme ulaştırmayan stratejiyi değiştirir. g) Problemin çözümü için kullandığı veya geliştirdiği stratejileri gözden geçire rek alternatif çözüm yollarını değerlendirir. ğ) Kullandığı strateji veya stratejileri farklı problemlerin çözümlerine geneller. h) Genellemenin geçerliliğini matematiksel örneklerle değerlendirir.",
      "sosyalDuygusalOgrenme": "SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim, SDB2.2. İş Birliği SDB3.1. Uyum SDB3.3. Sorumlu Karar Verme",
      "degerler": "D7. Estetik D10. Mütevazılık D14. Saygı",
      "okuryazarlikBecerileri": "OB2.Dijital Okuryazarlık OB4. Görsel Okuryazarlık",
      "degerlendirme": "İzleme testleri Zihin haritası Performans görevi Çalışma kâğıdı"
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "33.HAFTA(18-24)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "GEOMETRİK NİCELİKLER",
      "icerikCercevesi": "Uzunluk ve Alan Ölçme Birimleri Arasındaki İlişki",
      "ogrenmeCiktilari": "MAT.6.4.3. Geometrik şekillerin alanları ile modellenen gerçek yaşam durumlarına yöne lik problem çözebilme",
      "surecBilesenleri": "a) Geometrik şekillerin alanları ile modellenen gerçek yaşam probleminde ilgili matematiksel bileşenleri (alan, şekil, uzunluk, alan ölçme birimleri gibi) be lirler. b) Matematiksel bileşenler arasındaki ilişkiyi belirler. c) Problem bağlamıyla ilişkili verilenleri uygun matematiksel temsillere dönüş- türür. ç) Matematiksel temsillere dönüştürdüğü problemi kendi ifadeleri ile açıklar. d) Problemin sonucuna ilişkin tahminde bulunur ve işlemleri gerçekleştirmek için stratejiler geliştirir. e) Belirlediği stratejileri çözüm için uygular. f) Çözüm yollarını kontrol eder ve çözüme ulaştırmayan stratejiyi değiştirir. g) Problemin çözümü için kullandığı veya geliştirdiği stratejileri gözden geçire rek alternatif çözüm yollarını değerlendirir. ğ) Kullandığı strateji veya stratejileri farklı problemlerin çözümlerine genel ler. h) Genellemenin geçerliliğini matematiksel örneklerle değerlendirir",
      "sosyalDuygusalOgrenme": "SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim, SDB2.2. İş Birliği SDB3.1. Uyum SDB3.3. Sorumlu Karar Verme",
      "degerler": "D7. Estetik D10. Mütevazılık D14. Saygı",
      "okuryazarlikBecerileri": "OB2.Dijital Okuryazarlık OB4. Görsel Okuryazarlık",
      "degerlendirme": "İzleme testleri Zihin haritası Performans görevi Çalışma kâğıdı\n19 Mayıs Atatürk’ü Anma Gençlik ve Spor Bayramı"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "34.HAFTA(01-07)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "GEOMETRİK NİCELİKLER",
      "icerikCercevesi": "Uzunluk ve Alan Ölçme Birimleri Arasındaki İlişki",
      "ogrenmeCiktilari": "MAT.6.4.4. Çemberin uzunluğu ile çap uzunluğu arasındaki ilişkiye yönelik çıkarım yapa bilme",
      "surecBilesenleri": "a) Çemberin uzunluğu ile çap uzunluğu arasındaki ilişkiye yönelik varsayımlarda bulunur. b) Çemberlerin uzunlukları ile çap uzunlukları arasındaki ilişkileri listeler. c) Çemberin uzunluğu ile çap uzunluğu arasındaki ilişkiyi varsayımlarıyla karşı- laştırır. ç) Çemberin uzunluğu ile çap uzunluğu arasındaki ilişkiye yönelik önermeler sunar. d) Elde ettiği ilişkiye yönelik değerlendirmeler yapar.",
      "sosyalDuygusalOgrenme": "SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim, SDB2.2. İş Birliği SDB3.1. Uyum SDB3.3. Sorumlu Karar Verme",
      "degerler": "D7. Estetik D10. Mütevazılık D14. Saygı",
      "okuryazarlikBecerileri": "OB2.Dijital Okuryazarlık OB4. Görsel Okuryazarlık",
      "degerlendirme": "İzleme testleri Zihin haritası Performans görevi Çalışma kâğıdı"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "35.HAFTA(08-14)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "GEOMETRİK NİCELİKLER",
      "icerikCercevesi": "Uzunluk ve Alan Ölçme Birimleri Arasındaki İlişki",
      "ogrenmeCiktilari": "MAT.6.4.4. Çemberin uzunluğu ile çap uzunluğu arasındaki ilişkiye yönelik çıkarım yapa bilme",
      "surecBilesenleri": "a) Çemberin uzunluğu ile çap uzunluğu arasındaki ilişkiye yönelik varsayımlarda bulunur. b) Çemberlerin uzunlukları ile çap uzunlukları arasındaki ilişkileri listeler. c) Çemberin uzunluğu ile çap uzunluğu arasındaki ilişkiyi varsayımlarıyla karşı- laştırır. ç) Çemberin uzunluğu ile çap uzunluğu arasındaki ilişkiye yönelik önermeler sunar. d) Elde ettiği ilişkiye yönelik değerlendirmeler yapar.",
      "sosyalDuygusalOgrenme": "SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim, SDB2.2. İş Birliği SDB3.1. Uyum SDB3.3. Sorumlu Karar Verme",
      "degerler": "D7. Estetik D10. Mütevazılık D14. Saygı",
      "okuryazarlikBecerileri": "OB2.Dijital Okuryazarlık OB4. Görsel Okuryazarlık",
      "degerlendirme": "İzleme testleri Zihin haritası Performans görevi Çalışma kâğıdı\nSINAV HAFTASI"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "36.HAFTA(15-21)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "GEOMETRİK NİCELİKLER",
      "icerikCercevesi": "Uzunluk ve Alan Ölçme Birimleri Arasındaki İlişki",
      "ogrenmeCiktilari": "MAT.6.4.5. Çap veya yarıçap uzunluğu verilen bir çemberin uzunluğu ile ilgili problemleri çözebilme",
      "surecBilesenleri": "a) Çap veya yarıçap uzunluğu verilen bir çemberin uzunluğu ile ilgili problemlerde ilgili matematiksel bileşenleri (çap, yarıçap, çevre uzunluğu gibi) belirler. b) Matematiksel bileşenler arasındaki ilişkiyi belirler.",
      "sosyalDuygusalOgrenme": "SDB1.3. Öz Yansıtma/Kendine Uyarlama SDB2.1. İletişim, SDB2.2. İş Birliği SDB3.1. Uyum SDB3.3. Sorumlu Karar Verme",
      "degerler": "D7. Estetik D10. Mütevazılık D14. Saygı",
      "okuryazarlikBecerileri": "OB2.Dijital Okuryazarlık OB4. Görsel Okuryazarlık",
      "degerlendirme": "İzleme testleri Zihin haritası Performans görevi Çalışma kâğıdı"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "37.HAFTA(22-28)",
     "saat": "5 SAAT",
     "degerler": {
      "tema": "Yıl Sonu faaliyet",
      "icerikCercevesi": "Yıl Sonu faaliyet",
      "ogrenmeCiktilari": "Yıl Sonu faaliyet",
      "surecBilesenleri": "Yıl Sonu faaliyet",
      "sosyalDuygusalOgrenme": "Yıl Sonu faaliyet",
      "degerler": "Yıl Sonu faaliyet",
      "degerlendirme": "Yıl Sonu faaliyet\nDers Yılının Sona ermesi"
     }
    }
   ]
  },
  {
   "dersAdi": "Müzik",
   "seviye": 6,
   "egitimOgretimYili": "2026-2027",
   "sutunlar": [
    "tema",
    "ogrenmeAlani",
    "ogrenmeCiktilari",
    "yontemTeknikler",
    "aracGerecMateryaller",
    "etkinlikler",
    "aciklamalar",
    "degerler",
    "degerlendirme"
   ],
   "satirlar": [
    {
     "ay": "EYLÜL",
     "hafta": "1.HAFTA(08-14)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "1.ÜNİTE İstiklâl Marşı ve Marşlarımız",
      "ogrenmeAlani": "Mü. 6. A. DİNLEME - SÖYLEME",
      "ogrenmeCiktilari": "Mü.6.A.1. İstiklâl Marşı’nı birlikte söyler.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Kulaktan Şarkı Öğretimi Uygulama Taklit etme Söyleme",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Eşlik Çalgısı Blokflüt, Melodika. İstiklal Marşı Kayıtları EBA kaynakları.",
      "etkinlikler": "1. ETKİNLİK • \"İstiklal Marşı’nın nefes işaretlerinden önce gelen sözcükleri örnekteki gibi daire içine alır. \"İstiklal Marşı’nı anlamını hissederek ve nefes yerlerine uyarak söyler. 2. ETKİNLİK •\"İstiklal Marşı’nı kitaptaki tabloyu takip ederek dinler. • \"İstiklal Marşı’nı doğru tonlama ve vurguyla, tablodaki vuruşlara ve nefes yerlerine dikkat ederek müzik eşliğinde söyler.",
      "aciklamalar": "a) Öğrencilerin İstiklâl Marşı’nı nefes yerlerine uygun olarak söylemeleri sağlanır. b) Öğrencilerin İstiklâl Marşı’nı söylerken doğru tonlama ve vurgu yapmaları sağlanır.",
      "degerler": "Çalışkanlık, Duyarlılık, Eşitlik, Özgürlük, Saygı, Sorumluluk, Vatansever-lik Vefa"
     }
    },
    {
     "ay": "EYLÜL",
     "hafta": "2.HAFTA(15-21)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "1.ÜNİTE İstiklâl Marşı ve Marşlarımız",
      "ogrenmeAlani": "Mü. 6. A. DİNLEME - SÖYLEME",
      "ogrenmeCiktilari": "Mü.6.A.1. İstiklâl Marşı’nı birlikte söyler.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Kulaktan Şarkı Öğretimi Uygulama Taklit etme Söyleme",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Fon Kartonu Eşlik Çalgısı Blokflüt, Melodika. İstiklal Marşı Kayıtları EBA kaynakları.",
      "etkinlikler": "3. ETKİNLİK \"İstiklal Marşı’nı yazıldığı dönemi düşünerek dinler. Sınıf 4 ya da 5 gruba ayrılır. Görseli ve kelimeleri inceler. Kelimelerden istediklerini kullanarak iki mısra oluşturur. Sınıfça oluşturduğu şarkı sözünü okur. 4. ETKİNLİK Milletler için bayrağın önemi hakkındaki görüşlerini paylaşır. “Bayrağım” marşını dinler. Marşı anlamını hissederek ve nefes yerlerine uyarak söyler.",
      "aciklamalar": "a) Öğrencilerin İstiklâl Marşı’nı nefes yerlerine uygun olarak söylemeleri sağlanır. b) Öğrencilerin İstiklâl Marşı’nı söylerken doğru tonlama ve vurgu yapmaları sağlanır. Dağarcıkta bulunan “Türkiye’miz” adlı şarkı dinlenebilir, söylenebilir. (100.Sayfa)",
      "degerler": "Çalışkanlık, Duyarlılık, Eşitlik, Özgürlük, Saygı, Sorumluluk, Vatansever-lik Vefa"
     }
    },
    {
     "ay": "EYLÜL",
     "hafta": "3.HAFTA(22-28)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "1.ÜNİTE İnsan Sesinin Oluşumu",
      "ogrenmeAlani": "Mü. 6. B. MÜZİKSEL ALGI VE BİLGİLENME",
      "ogrenmeCiktilari": "Mü.6.B.4. İnsan sesinin oluşumunu kavrar.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Kulaktan Şarkı Öğretimi, Uygulama. Taklit etme Söyleme",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Eşlik Çalgısı Ses Organlarına ait görseller EBA kaynakları.",
      "etkinlikler": "5. ETKİNLİK • Diyafram kasını çalıştırmak için egzersizler yapar. • Rahat ve dik durumdayken doğru diyafram nefesi alır. • Aldığı nefesi “sssss” “ssst” sesiyle kesik kesik verir. • Verilen ezgiyi diyafram nefesi alarak seslendirir.",
      "aciklamalar": "Ses ve solunum organları tanıtılarak bu organların ses kaynakları olduğu vurgulanmalı, ses ile işitme arasındaki ilişki üzerinde durulmalıdır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Paylaşma, Sorumluluk"
     }
    },
    {
     "ay": "EKİM",
     "hafta": "4.HAFTA(29-05)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "1.ÜNİTE İnsan Sesinin Oluşumu",
      "ogrenmeAlani": "Mü. 6. B. MÜZİKSEL ALGI VE BİLGİLENME",
      "ogrenmeCiktilari": "Mü.6.B.4. İnsan sesinin oluşumunu kavrar.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Kulaktan Şarkı Öğretimi, Uygulama. Taklit etme Söyleme,",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Eşlik Çalgısı Ses Organlarına ait görseller EBA kaynakları.",
      "etkinlikler": "5. ETKİNLİK • Diyafram kasını çalıştırmak için egzersizler yapar. • Rahat ve dik durumdayken doğru diyafram nefesi alır. • Aldığı nefesi “sssss” “ssst” sesiyle kesik kesik verir. • Verilen ezgiyi diyafram nefesi alarak seslendirir.",
      "aciklamalar": "Ses ve solunum organları tanıtılarak bu organların ses kaynakları olduğu vurgulanmalı, ses ile işitme arasındaki ilişki üzerinde durulmalıdır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Paylaşma, Sorumluluk,"
     }
    },
    {
     "ay": "EKİM",
     "hafta": "5.HAFTA(06-12)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "1.ÜNİTE Ses Değişimi",
      "ogrenmeAlani": "Mü. 6. B. MÜZİKSEL ALGI VE BİLGİLENME",
      "ogrenmeCiktilari": "Mü.6.B.3. Ergenlik dönemi ses değişim özelliklerini fark eder.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Kulaktan Şarkı Öğretimi, Uygulama. Taklit etme Söyleme",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Eşlik Çalgısı Ses Organlarına ait görseller EBA kaynakları.",
      "etkinlikler": "6. ETKİNLİK “Samsun’dan Doğan Güneş” şarkısını dinler. • Vücudunu rahat ve dik bir konumda tutar. • Diyafram nefesi alarak şarkıyı hafif bir sesle bağırmadan söyler. • Dilerseniz şarkıya çalgınızla eşlik edebilirsiniz Dağarcıkta bulunan “Hayata Renk Ver” adlı şarkı dinlenebilir, söylenebilir. (100.Sayfa)",
      "aciklamalar": "“Mutasyon” kavramı açıklanır. Çocuk ve yetişkin sesleri arasındaki farklılıkları düşünerek düşüncelerini arkadaşları ile paylaşır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Paylaşma, Sorumluluk"
     }
    },
    {
     "ay": "EKİM",
     "hafta": "6.HAFTA(13-19)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "1.ÜNİTE Nota Çalışmaları ve Do Notası",
      "ogrenmeAlani": "Mü. 6. B. MÜZİKSEL ALGI VE BİLGİLENME Mü. 6. A. DİNLEME - SÖYLEME",
      "ogrenmeCiktilari": "Mü.6.B.1. Temel müzik yazı ve ögelerini kullanır. Mü.6.A.3. Öğrendiği notaları seslendirir.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma, Uygulama. Taklit etme Söyleme, Çalma Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. EBA kaynakları. Nota ve İşaret Kartları.",
      "etkinlikler": "7.ETKİNLİK Re-La arasındaki notaları yazar. Vuruş kavramını bilir. 1 vuruşu bilir. Notanın tanımını yapar. Nota sürelerini yazar. Do notasını verilir. Ek çizgi kavramını bilir.",
      "aciklamalar": "a) Do-ince do aralığındaki notalar, uzatma bağı, hece bağı, tekrar işaretleri (röpriz, dolap), basit ölçü (3/8), bileşik ölçü (6/8) ve aksak ölçü (5/8) ile onaltılık nota ve onaltılık sus değeri verilmelidir. b) Değiştirici işaretler (diyez, bemol, natürel) verilmelidir Öğrencilere kalın do-ince do aralığındaki notaları algılamaya yönelik seslendirme çalışmaları öğretmenin çalgı eşliği desteği ile yaptırılmalıdır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk"
     }
    },
    {
     "ay": "EKİM",
     "hafta": "7.HAFTA(20-26)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "1.ÜNİTE Nota Çalışmaları ve Do Notası",
      "ogrenmeAlani": "Mü. 6. A. DİNLEME - SÖYLEME",
      "ogrenmeCiktilari": "Mü.6.A.2. Millî birlik ve beraberlik duygusunu güçlendiren marşlarımızı doğru söyler.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Kulaktan Şarkı Öğretimi Uygulama Taklit etme Söyleme",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Eşlik Çalgısı Marş Kayıtları EBA kaynakları.",
      "etkinlikler": "7. ETKİNLİK Verilen dizeklere do notasını örnekteki gibi yazar. • \"Cumhuriyet\" marşındaki do notalarını bularak renkli kalemle işaretler. • Marşı dinler ve marşı nefes yerlerine uyarak doğru seslerle söyler",
      "aciklamalar": "a) Millî, dinî ve manevi günler ile belirli gün ve haftalarda bu kazanıma yer verilmelidir. b) Öğrencilerin önemli gün ve haftalar dolayısıyla düzenlenecek Atatürk ile ilgili müzik etkinliklerine katılmaları için gerekli yönlendirmeler yapılmalıdır. Bu etkinliklerde öğrenciler, oluşturdukları özgün çalışmaları da sergileyebilirler.",
      "degerler": "Çalışkanlık, Duyarlılık, Eşitlik, Özgürlük, Saygı, Sorumluluk, Vatansever-lik Vefa"
     }
    },
    {
     "ay": "EKİM-KASIM",
     "hafta": "8.HAFTA(27-02)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "2.ÜNİTE Atatürk ve Müzik2.ÜNİTE Atatürk ve Müzik2.ÜNİTE Atatürk ve Müzik",
      "ogrenmeAlani": "Mü. 6. D. MÜZİK KÜLTÜRÜMü. 6. D. MÜZİK KÜLTÜRÜMü. 6. D. MÜZİK KÜLTÜRÜ",
      "ogrenmeCiktilari": "Mü.6.D.2. Atatürk’ün müzikle ilgili temel görüşlerini anlar.Mü.6.D.2. Atatürk’ün müzikle ilgili temel görüşlerini anlar.Mü.6.D.2. Atatürk’ün müzikle ilgili temel görüşlerini anlar.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Söyleme.Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Söyleme.Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Söyleme.",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Atatürk ve Müzik konulu kaynaklar EBA kaynakları. Eser notalarıDers Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Atatürk ve Müzik konulu kaynaklar EBA kaynakları. Eser notalarıDers Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Atatürk ve Müzik konulu kaynaklar EBA kaynakları. Eser notaları",
      "etkinlikler": "1. ETKİNLİK • Mustafa Kemal Atatürk’ün sevdiği türkülerden biri olan “Yörük Ali” türküsünü dinler. • Türküyü nefes yerlerine uyarak söyler. • Mustafa Kemal Atatürk'ün sevdiği şarkı ve türküleri kütüphane, genel ağ (internet) vb. kaynakları kullanarak araştırır. • Yaptığı araştırma sonucu edindiği bilgileri sınıfta paylaşır.1. ETKİNLİK • Mustafa Kemal Atatürk’ün sevdiği türkülerden biri olan “Yörük Ali” türküsünü dinler. • Türküyü nefes yerlerine uyarak söyler. • Mustafa Kemal Atatürk'ün sevdiği şarkı ve türküleri kütüphane, genel ağ (internet) vb. kaynakları kullanarak araştırır. • Yaptığı araştırma sonucu edindiği bilgileri sınıfta paylaşır.1. ETKİNLİK • Mustafa Kemal Atatürk’ün sevdiği türkülerden biri olan “Yörük Ali” türküsünü dinler. • Türküyü nefes yerlerine uyarak söyler. • Mustafa Kemal Atatürk'ün sevdiği şarkı ve türküleri kütüphane, genel ağ (internet) vb. kaynakları kullanarak araştırır. • Yaptığı araştırma sonucu edindiği bilgileri sınıfta paylaşır.",
      "aciklamalar": "a) Atatürk’ün müzikle ilgili görüşlerini anlamak için Türk müziğinin gelişimi ile ilgili sözlerinden yola çıkılır. Örneğin öğrencilerin Atatürk’ün “Ulusun ince duygularını düşüncelerini anlatan, yüksek deyişlerini, söyleyişlerini toplamak, onları genel musiki kurallarına göre işlemek gerekir, ancak Türk ulusal musikisi böyle yükselebilir, evrensel musiki de yerini alabilir.” vb. sözlerinden yola çıkılarak müziğe ilişkin görüşlerini tanımaları sağlanır. b) Öğrencilerin müzikle ilgili araştırmalarında bilgisayar, internet ve kütüphanelerden yararlanabilmelerine ilişkin yönlendirmeler yapılır.a) Atatürk’ün müzikle ilgili görüşlerini anlamak için Türk müziğinin gelişimi ile ilgili sözlerinden yola çıkılır. Örneğin öğrencilerin Atatürk’ün “Ulusun ince duygularını düşüncelerini anlatan, yüksek deyişlerini, söyleyişlerini toplamak, onları genel musiki kurallarına göre işlemek gerekir, ancak Türk ulusal musikisi böyle yükselebilir, evrensel musiki de yerini alabilir.” vb. sözlerinden yola çıkılarak müziğe ilişkin görüşlerini tanımaları sağlanır. b) Öğrencilerin müzikle ilgili araştırmalarında bilgisayar, internet ve kütüphanelerden yararlanabilmelerine ilişkin yönlendirmeler yapılır.a) Atatürk’ün müzikle ilgili görüşlerini anlamak için Türk müziğinin gelişimi ile ilgili sözlerinden yola çıkılır. Örneğin öğrencilerin Atatürk’ün “Ulusun ince duygularını düşüncelerini anlatan, yüksek deyişlerini, söyleyişlerini toplamak, onları genel musiki kurallarına göre işlemek gerekir, ancak Türk ulusal musikisi böyle yükselebilir, evrensel musiki de yerini alabilir.” vb. sözlerinden yola çıkılarak müziğe ilişkin görüşlerini tanımaları sağlanır. b) Öğrencilerin müzikle ilgili araştırmalarında bilgisayar, internet ve kütüphanelerden yararlanabilmelerine ilişkin yönlendirmeler yapılır.",
      "degerler": "Duyarlılık, Özgürlük, Paylaşma, Saygı, Sevgi, Sorumluluk, Vatansever-lik VefaDuyarlılık, Özgürlük, Paylaşma, Saygı, Sevgi, Sorumluluk, Vatansever-lik VefaDuyarlılık, Özgürlük, Paylaşma, Saygı, Sevgi, Sorumluluk, Vatansever-lik Vefa",
      "degerlendirme": "Cumhuriyet Bayramı"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "9.HAFTA(03-09)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "2.ÜNİTE Atatürk ve Müzik",
      "ogrenmeAlani": "Mü. 6. D. MÜZİK KÜLTÜRÜ",
      "ogrenmeCiktilari": "Mü.6.D.6. Atatürk’ün sevdiği türkü ve şarkıları tanır.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Söyleme.",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Atatürk ve Müzik konulu kaynaklar EBA kaynakları. Eser notaları",
      "etkinlikler": "2. ETKİNLİK • “Atatürk Kalbimde” şarkısını dinler. • Şarkıyı anlamını hissederek ve nefes yerlerine uyarak söyler. • Atatürk'ü anma etkinliklerinde bu şarkıyı seslendiriniz. Atatürk’ün sevdiği türkü ve şarkılar dinletilir. Dağarcıkta bulunan “Zobalarında Guru Da Meşe Yanıyor” adlı şarkı dinlenebilir. (100.Sayfa)",
      "aciklamalar": "Eserler “Kırmızı Gülün Alı Var”, “Vardar Ovası”, “Estergon Kalâ’sı” gibi Atatürk’ün sevdiği türkü ve şarkılardan seçilir.",
      "degerler": "Duyarlılık, Özgürlük, Paylaşma, Saygı, Sevgi, Sorumluluk, Vatansever-lik Vefa",
      "degerlendirme": "Kızılay Haftası"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "10.HAFTA(17-23)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "2.ÜNİTE Si ve İnce Do Notaları",
      "ogrenmeAlani": "Mü. 6. B. MÜZİKSEL ALGI VE BİLGİLENME Mü. 6. A. DİNLEME - SÖYLEME",
      "ogrenmeCiktilari": "Mü.6.B.1. Temel müzik yazı ve ögelerini kullanır. Mü.6.A.3. Öğrendiği notaları seslendirir.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma, Uygulama. Taklit etme Söyleme, Çalma Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. EBA kaynakları. Nota ve İşaret Kartları.",
      "etkinlikler": "3-4-5. ETKİNLİK • Verilen dizeklere si ve ince do notasını örneklerdeki gibi yazar. • Verilen ezgideki ve \"Müzik Yapalım\" şarkısındaki si ve ince do notalarını bularak işaretler. • Ezgiyi öğretmen eşliğinde notaların vuruşlarına dikkat ederek seslendirir. • \"Müzik Yapalım\" şarkısını dinler ve nefes yerlerine uyarak seslendirir. Dağarcıkta bulunan “Anlat Bana Öğretmenim” adlı şarkı dinlenebilir, söylenebilir. (104.Sayfa)",
      "aciklamalar": "a) Do-ince do aralığındaki notalar, uzatma bağı, hece bağı, tekrar işaretleri (röpriz, dolap), basit ölçü (3/8), bileşik ölçü (6/8) ve aksak ölçü (5/8) ile onaltılık nota ve onaltılık sus değeri verilmelidir. b) Değiştirici işaretler (diyez, bemol, natürel) verilmelidir. Öğrencilere kalın do-ince do aralığındaki notaları algılamaya yönelik seslendirme çalışmaları öğretmenin çalgı eşliği desteği ile yaptırılmalıdır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk",
      "degerlendirme": "Dünya Çocuk Hakları Günü"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "11.HAFTA(24-30)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "2.ÜNİTE Tekrar İşaretleri",
      "ogrenmeAlani": "Mü. 6. B. MÜZİKSEL ALGI VE BİLGİLENME Mü. 6. C. MÜZİKSEL YARATICILIK",
      "ogrenmeCiktilari": "Mü.6.B.1. Temel müzik yazı ve ögelerini kullanır. Mü.6.C.1. Dinlediği farklı türdeki müziklerle ilgili duygu ve düşüncelerini farklı anlatım yollarıyla ifade eder.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma, Uygulama. Taklit etme Söyleme, Çalma Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. EBA kaynakları. Nota ve İşaret Kartları.",
      "etkinlikler": "6-7. ETKİNLİK • \"Tebessüm\" şarkısını dinler. • Şarkıdaki röpriz ve dolapları bularak işaretler. • Şarkıyı nefes yerlerine ve tekrar işaretlerine uyarak söyler. • Şarkıyla ilgili hislerinden yola çıkarak bir resim yapar. • “Işık Saçarız” şarkısını dinler, nefes yerlerine ve tekrar işaretlerine uyarak söyler. • Şarkıya kendi oluşturduğu hareketlerle eşlik eder.",
      "aciklamalar": "a) Do-ince do aralığındaki notalar, uzatma bağı, hece bağı, tekrar işaretleri (röpriz, dolap), basit ölçü (3/8), bileşik ölçü (6/8) ve aksak ölçü (5/8) ile onaltılık nota ve onaltılık sus değeri verilmelidir. b) Değiştirici işaretler (diyez, bemol, natürel) verilmelidir. Öğrencilerin dinledikleri farklı türlerdeki müzikler ile ilgili düşüncelerini özgün anlatım yollarıyla (resim yapma, harekete dönüştürme, öykü ve şiir yazma vb.) ifade etmeleri istenir.",
      "degerler": "Arkadaşlık, Çalışkanlık, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk",
      "degerlendirme": "Öğretmenler Günü"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "12.HAFTA(01-07)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "3.ÜNİTE Onaltılık Nota",
      "ogrenmeAlani": "Mü. 6. B. MÜZİKSEL ALGI VE BİLGİLENME",
      "ogrenmeCiktilari": "Mü.6.B.1. Temel müzik yazı ve ögelerini kullanır.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma, Uygulama. Taklit etme Söyleme, Çalma Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. EBA kaynakları. Nota ve İşaret Kartları.",
      "etkinlikler": "1-2. ETKİNLİK Verilen sözcüklerin karşılarına yazılan ritim kalıplarını gösterildiği şekilde sınıfça uygulanır. Ritimlerinin üstüne Van, İzmir, Ankara, Karaman ve Gelibolu sözcüklerinden uygun olanları yazar. Sözcüklere uygun olan ritim kalıbını verilen dizek üzerine sol notası ile yazar. • \"Çınar\" şarkısının içerisinde bulunan onaltılık notaları işaretler. Şarkıyı dinler, söyler.",
      "aciklamalar": "a) Do-ince do aralığındaki notalar, uzatma bağı, hece bağı, tekrar işaretleri (röpriz, dolap), basit ölçü (3/8), bileşik ölçü (6/8) ve aksak ölçü (5/8) ile onaltılık nota ve onaltılık sus değeri verilmelidir. b) Değiştirici işaretler (diyez, bemol, natürel) verilmelidir.",
      "degerler": "Arkadaşlık, Çalışkanlık, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk",
      "degerlendirme": "Dünya Engelliler Günü"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "13.HAFTA(08-14)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "3.ÜNİTE Ses Değiştirici İşaretler",
      "ogrenmeAlani": "Mü. 6. B. MÜZİKSEL ALGI VE BİLGİLENME",
      "ogrenmeCiktilari": "Mü.6.B.1. Temel müzik yazı ve ögelerini kullanır.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma, Uygulama. Taklit etme Söyleme, Çalma Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. EBA kaynakları. Nota ve İşaret Kartları.",
      "etkinlikler": "3. ETKİNLİK • “Güzel Yurdum” şarkısının notalarını inceler. • Şarkı içerisinde ses değiştirici işaret alan notaları renkli kalemle işaretler. • Şarkıyı dinler. Şarkıyı nefes yerlerine uyarak söyler.",
      "aciklamalar": "a) Do-ince do aralığındaki notalar, uzatma bağı, hece bağı, tekrar işaretleri (röpriz, dolap), basit ölçü (3/8), bileşik ölçü (6/8) ve aksak ölçü (5/8) ile onaltılık nota ve onaltılık sus değeri verilmelidir. b) Değiştirici işaretler (diyez, bemol, natürel) verilmelidir.",
      "degerler": "Arkadaşlık, Çalışkanlık, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "14.HAFTA(15-21)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "3.ÜNİTE Ses Değiştirici İşaretler",
      "ogrenmeAlani": "Mü. 6. B. MÜZİKSEL ALGI VE BİLGİLENME",
      "ogrenmeCiktilari": "Mü.6.B.1. Temel müzik yazı ve ögelerini kullanır.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma, Uygulama. Taklit etme Söyleme, Çalma Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. EBA kaynakları. Nota ve İşaret Kartları.",
      "etkinlikler": "4. ETKİNLİK • “Deniz Üstü Köpürür” türküsünün notalarını inceler. • Türkü içerisinde ses değiştirici işaret alan notaları renkli kalemle işaretler. • Türküyü dinler ve nefes yerlerine uyarak söyler.",
      "aciklamalar": "a) Do-ince do aralığındaki notalar, uzatma bağı, hece bağı, tekrar işaretleri (röpriz, dolap), basit ölçü (3/8), bileşik ölçü (6/8) ve aksak ölçü (5/8) ile onaltılık nota ve onaltılık sus değeri verilmelidir. b) Değiştirici işaretler (diyez, bemol, natürel) verilmelidir.",
      "degerler": "Arkadaşlık, Çalışkanlık, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "15.HAFTA(22-28)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "3.ÜNİTE Müzikte Hız",
      "ogrenmeAlani": "Mü. 6. A. DİNLEME – SÖYLEME Mü. 6. B. MÜZİKSEL ALGI VE BİLGİLENME",
      "ogrenmeCiktilari": "Mü.6.A.5. Seslendirdiği müziklerde hız ve gürlük basamaklarını uygular. Mü.6.B.2. Müziklerde aynı ve farklı bölümleri ritim çalgılarıyla ayırt eder.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Kulaktan Şarkı Öğretimi, Uygulama. Taklit etme Canlandır-ma Söyleme",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. EBA kaynakları. Ritim Çalgıları. Metronom",
      "etkinlikler": "5. ETKİNLİK • “Dostluk Oyunu” şarkısında kullanılan hız terimlerini inceler. • Şarkıyı dinler ve nefes yerlerine, hız terimlerine uyarak söyler. • Sınıf üç gruba ayrılır. Söyleme, ritim eşliği ve hareket eşliği yapılır.",
      "aciklamalar": "a) Öğrencilerin dağarcıklarındaki ezgilerden, seviyelerine uygun olanları seslendirmelerine yönelik etkinlikler düzenlenir. b) Öğrenilen değişik hız ve gürlük basamaklarının müziksel anlatımdaki yeri ve önemi vurgulanmalıdır. Düzeye uygun iki ve üç bölümlü şarkı, türkü vb. örnekler verilmelidir.",
      "degerler": "Arkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk"
     }
    },
    {
     "ay": "ARALIK-OCAK",
     "hafta": "16.HAFTA(29-04)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "3.ÜNİTE Müzikte Gürlük3.ÜNİTE Müzikte Gürlük",
      "ogrenmeAlani": "Mü. 6. A. DİNLEME – SÖYLEME Mü. 6. C. MÜZİKSEL YARATICILIKMü. 6. A. DİNLEME – SÖYLEME Mü. 6. C. MÜZİKSEL YARATICILIK",
      "ogrenmeCiktilari": "Mü.6.A.5. Seslendirdiği müziklerde hız ve gürlük basamaklarını uygular. Mü.6.C.4. Müziklerde aynı ve farklı bölümleri dansa dönüştürür.Mü.6.A.5. Seslendirdiği müziklerde hız ve gürlük basamaklarını uygular. Mü.6.C.4. Müziklerde aynı ve farklı bölümleri dansa dönüştürür.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Kulaktan Şarkı Öğretimi, Uygulama. Taklit etme Canlandır-ma SöylemeAnlatım, Soru-cevap, Kulaktan Şarkı Öğretimi, Uygulama. Taklit etme Canlandır-ma Söyleme",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. EBA kaynakları. Ritim Çalgıları.Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. EBA kaynakları. Ritim Çalgıları.",
      "etkinlikler": "6-7. ETKİNLİK • “Bir Dünya Bırakın” şarkısında kullanılan gürlük terimlerini işaretler. Şarkıyı dinler, nefes yerlerine ve gürlük terimlerine uyarak söyler. • Şarkının içindeki farklı bölümleri belirler, ritim çalgısı ya da beden müziği (alkış vb.) kullanarak oluşturduğu ritimlerle eşlik eder. “Sen Bu Yaylaları Yayliyamazsun” türküsünü gürlük terimlerine uyarak söyler.6-7. ETKİNLİK • “Bir Dünya Bırakın” şarkısında kullanılan gürlük terimlerini işaretler. Şarkıyı dinler, nefes yerlerine ve gürlük terimlerine uyarak söyler. • Şarkının içindeki farklı bölümleri belirler, ritim çalgısı ya da beden müziği (alkış vb.) kullanarak oluşturduğu ritimlerle eşlik eder. “Sen Bu Yaylaları Yayliyamazsun” türküsünü gürlük terimlerine uyarak söyler.",
      "aciklamalar": "a) Öğrencilerin dağarcıklarındaki ezgilerden, seviyelerine uygun olanları seslendirmelerine yönelik etkinlikler düzenlenir. b) Öğrenilen değişik hız ve gürlük basamaklarının müziksel anlatımdaki yeri ve önemi vurgulanmalıdır. Düzeye uygun iki ve üç bölümlü şarkı, türkü vb. örnekler verilmelidir.a) Öğrencilerin dağarcıklarındaki ezgilerden, seviyelerine uygun olanları seslendirmelerine yönelik etkinlikler düzenlenir. b) Öğrenilen değişik hız ve gürlük basamaklarının müziksel anlatımdaki yeri ve önemi vurgulanmalıdır. Düzeye uygun iki ve üç bölümlü şarkı, türkü vb. örnekler verilmelidir.",
      "degerler": "Arkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Paylaşma, Sabır, Saygı, Sevgi, SorumlulukArkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk",
      "degerlendirme": "Yılbaşı Tatili"
     }
    },
    {
     "ay": "OCAK",
     "hafta": "17.HAFTA(05-11)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "4.ÜNİTE Ülkemize Ait Başlıca Müzik Türleri",
      "ogrenmeAlani": "Mü. 6. D. MÜZİK KÜLTÜRÜ",
      "ogrenmeCiktilari": "Mü.6.D.1. Yurdumuza ait başlıca müzik türlerini ayırt eder. Mü.6.D.4. Türk müziği kültürünü tanır.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Canlandır-ma Söyleme, Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Eşlik Çalgıları Ritim Çalgıları. Eser notaları",
      "etkinlikler": "1. ETKİNLİK Bir Türk sanat müziği eseri olan “ Otomobil Uçar Gider” şarkısını dinleyiniz. • Şarkıyı nefes yerlerine uyarak söyleyiniz.",
      "aciklamalar": "Türk halk müziği, Türk sanat müziği, dinî müzik, mehter müziği ve çok sesli Türk müziklerinden seçkin örnekler (Örneğin Muharrem Ertaş, Neşet Ertaş, Tanbûrî Cemil Bey, Çekiç Ali, Zeki Müren gibi önemli müzisyenler tarafından icra edilen eserler) öğrencilerin ses sınırlarına ve sınıf düzeyine uygun olarak verilmelidir.",
      "degerler": "Arkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Özgürlük, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk, Vatansever-lik Vefa"
     }
    },
    {
     "ay": "OCAK",
     "hafta": "18.HAFTA(12-18)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "4.ÜNİTE Ülkemize Ait Başlıca Müzik Türleri4.ÜNİTE Ülkemize Ait Başlıca Müzik Türleri",
      "ogrenmeAlani": "Mü. 6. D. MÜZİK KÜLTÜRÜMü. 6. D. MÜZİK KÜLTÜRÜ",
      "ogrenmeCiktilari": "Mü.6.D.3. Yurdumuza ait müzik türlerinin kültürümüzün bir değeri ve zenginliği olduğunu fark eder.Mü.6.D.3. Yurdumuza ait müzik türlerinin kültürümüzün bir değeri ve zenginliği olduğunu fark eder.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Canlandır-ma Söyleme, GösteriAnlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Canlandır-ma Söyleme, Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Eşlik Çalgıları Ritim Çalgıları. Eser notalarıDers Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Eşlik Çalgıları Ritim Çalgıları. Eser notaları",
      "etkinlikler": "4.ETKİNLİK • Çok sesli Türk müziği türünde Erdal Tuğcular'a ait \"Bar\" (s.103) adlı eseri, Mehter müziği türünde İsmail Hakkı Bey'e ait \"Eski Ordu Marşı\" (s.104) adlı eseri, Dinî müzik türünde Yunus Emre'ye ait \"Ben Ağlarım Yane Yane\" adlı eseri dinler. • Bu türlere ait eserleri kütüphane, genel ağ (internet) vb. kaynakları kullanarak araştırır, edindiği bilgileri sınıfta paylaşır.4.ETKİNLİK • Çok sesli Türk müziği türünde Erdal Tuğcular'a ait \"Bar\" (s.103) adlı eseri, Mehter müziği türünde İsmail Hakkı Bey'e ait \"Eski Ordu Marşı\" (s.104) adlı eseri, Dinî müzik türünde Yunus Emre'ye ait \"Ben Ağlarım Yane Yane\" adlı eseri dinler. • Bu türlere ait eserleri kütüphane, genel ağ (internet) vb. kaynakları kullanarak araştırır, edindiği bilgileri sınıfta paylaşır.",
      "aciklamalar": "Türk müziği kültürüne felsefesi ve eserleriyle katkıda bulunmuş; Dede Efendi, Tanbûrî Cemil Bey, Âşık Veysel gibi şahsiyetler vurgulanmalıdır.Türk müziği kültürüne felsefesi ve eserleriyle katkıda bulunmuş; Dede Efendi, Tanbûrî Cemil Bey, Âşık Veysel gibi şahsiyetler vurgulanmalıdır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Özgürlük, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk, Vatansever-lik VefaArkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Özgürlük, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk, Vatansever-lik Vefa",
      "degerlendirme": "Birinci Dönemin Sona Ermesi"
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "19.HAFTA(02-08)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "4.ÜNİTE Ülkemize Ait Başlıca Müzik Türleri",
      "ogrenmeAlani": "Mü. 6. D. MÜZİK KÜLTÜRÜ",
      "ogrenmeCiktilari": "Mü.6.D.1. Yurdumuza ait başlıca müzik türlerini ayırt eder. Mü.6.D.4. Türk müziği kültürünü tanır.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Canlandır-ma Söyleme, Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Bağlama Eşlik Çalgıları Ritim Çalgıları. Eser notaları",
      "etkinlikler": "2. ETKİNLİK • Bir Türk halk müziği eseri olan “Nar Danesi” türküsünü dinler. • Türküyü nefes yerlerine uyarak söyler.",
      "aciklamalar": "Türk halk müziği, Türk sanat müziği, dinî müzik, mehter müziği ve çok sesli Türk müziklerinden seçkin örnekler (Örneğin Muharrem Ertaş, Neşet Ertaş, Tanbûrî Cemil Bey, Çekiç Ali, Zeki Müren gibi önemli müzisyenler tarafından icra edilen eserler) öğrencilerin ses sınırlarına ve sınıf düzeyine uygun olarak verilmelidir. Türk müziği kültürüne felsefesi ve eserleriyle katkıda bulunmuş; Dede Efendi, Tanbûrî Cemil Bey, Âşık Veysel gibi şahsiyetler vurgulanmalıdır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Özgürlük, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk, Vatansever-lik Vefa",
      "degerlendirme": "İkinci Yarıyıl Başlangıcı"
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "20.HAFTA(09-15)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "4.ÜNİTE Ülkemize Ait Başlıca Müzik Türleri",
      "ogrenmeAlani": "Mü. 6. D. MÜZİK KÜLTÜRÜ",
      "ogrenmeCiktilari": "Mü.6.D.1. Yurdumuza ait başlıca müzik türlerini ayırt eder. Mü.6.D.4. Türk müziği kültürünü tanır.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Canlandır-ma Söyleme, Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Bağlama Eşlik Çalgıları Ritim Çalgıları. Eser notaları",
      "etkinlikler": "3. ETKİNLİK • \"Tiridine Bandım\" türküsünü dinler. • Türküyü nefes yerlerine uyarak söyler. • Türkünün farklı bölümlerini belirleyerek bu bölümlere değişik dans figürleri ile eşlik eder.",
      "aciklamalar": "Türk halk müziği, Türk sanat müziği, dinî müzik, mehter müziği ve çok sesli Türk müziklerinden seçkin örnekler (Örneğin Muharrem Ertaş, Neşet Ertaş, Tanbûrî Cemil Bey, Çekiç Ali, Zeki Müren gibi önemli müzisyenler tarafından icra edilen eserler) öğrencilerin ses sınırlarına ve sınıf düzeyine uygun olarak verilmelidir. Türk müziği kültürüne felsefesi ve eserleriyle katkıda bulunmuş; Dede Efendi, Tanbûrî Cemil Bey, Âşık Veysel gibi şahsiyetler vurgulanmalıdır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Özgürlük, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk, Vatansever-lik Vefa"
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "21.HAFTA(16-22)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "4.ÜNİTE Ülkemize Ait Başlıca Müzik Türleri",
      "ogrenmeAlani": "Mü. 6. D. MÜZİK KÜLTÜRÜ",
      "ogrenmeCiktilari": "Mü.6.D.1. Yurdumuza ait başlıca müzik türlerini ayırt eder. Mü.6.D.3. Yurdumuza ait müzik türlerinin kültürümüzün bir değeri ve zenginliği olduğunu fark eder.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Canlandır-ma Söyleme, Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Eşlik Çalgıları Ritim Çalgıları. Eser notaları",
      "etkinlikler": "4.ETKİNLİK • Çok sesli Türk müziği türünde Erdal Tuğcular'a ait \"Bar\" (s.103) adlı eseri, Mehter müziği türünde İsmail Hakkı Bey'e ait \"Eski Ordu Marşı\" (s.104) adlı eseri, Dinî müzik türünde Yunus Emre'ye ait \"Ben Ağlarım Yane Yane\" adlı eseri dinler. • Bu türlere ait eserleri kütüphane, genel ağ (internet) vb. kaynakları kullanarak araştırır, edindiği bilgileri sınıfta paylaşır.",
      "aciklamalar": "Türk halk müziği, Türk sanat müziği, dinî müzik, mehter müziği ve çok sesli Türk müziklerinden seçkin örnekler (Örneğin Muharrem Ertaş, Neşet Ertaş, Tanbûrî Cemil Bey, Çekiç Ali, Zeki Müren gibi önemli müzisyenler tarafından icra edilen eserler) öğrencilerin ses sınırlarına ve sınıf düzeyine uygun olarak verilmelidir.",
      "degerler": "Arkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Özgürlük, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk, Vatansever-lik Vefa"
     }
    },
    {
     "ay": "ŞUBAT-MART",
     "hafta": "22.HAFTA(23-01)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "4.ÜNİTE Hece Bağı ve Uzatma Bağı",
      "ogrenmeAlani": "Mü. 6. B. MÜZİKSEL ALGI VE BİLGİLENME",
      "ogrenmeCiktilari": "Mü.6.B.1. Temel müzik yazı ve ögelerini kullanır.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma, Uygulama. Taklit etme Söyleme, Çalma Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. EBA kaynakları. Nota ve İşaret Kartları.",
      "etkinlikler": "5.ETKİNLİK • “Çanakkale Türküsü”nün notalarındaki hece bağlarını renkli kalemle işaretler. • Türküyü dinler. • Türküyü nefes yerlerine uyarak söyler.",
      "aciklamalar": "a) Do-ince do aralığındaki notalar, uzatma bağı, hece bağı, tekrar işaretleri (röpriz, dolap), basit ölçü (3/8), bileşik ölçü (6/8) ve aksak ölçü (5/8) ile onaltılık nota ve onaltılık sus değeri verilmelidir. b) Değiştirici işaretler (diyez, bemol, natürel) verilmelidir.",
      "degerler": "Arkadaşlık, Çalışkanlık, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk"
     }
    },
    {
     "ay": "MART",
     "hafta": "23.HAFTA(02-08)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "4.ÜNİTE Hece Bağı ve Uzatma Bağı",
      "ogrenmeAlani": "Mü. 6. B. MÜZİKSEL ALGI VE BİLGİLENME",
      "ogrenmeCiktilari": "Mü.6.B.1. Temel müzik yazı ve ögelerini kullanır.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma, Uygulama. Taklit etme Söyleme, Çalma Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. EBA kaynakları. Nota ve İşaret Kartları.",
      "etkinlikler": "6.ETKİNLİK • “Çemberimde Gül Oya” türküsündeki uzatma bağlarını renkli kalemle işaretler. • Türküyü dinler. • Türküyü nefes yerlerine uyarak söyler.",
      "aciklamalar": "a) Do-ince do aralığındaki notalar, uzatma bağı, hece bağı, tekrar işaretleri (röpriz, dolap), basit ölçü (3/8), bileşik ölçü (6/8) ve aksak ölçü (5/8) ile onaltılık nota ve onaltılık sus değeri verilmelidir. b) Değiştirici işaretler (diyez, bemol, natürel) verilmelidir.",
      "degerler": "Arkadaşlık, Çalışkanlık, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk"
     }
    },
    {
     "ay": "MART",
     "hafta": "24.HAFTA(09-15)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "1.ÜNİTE İstiklâl Marşı ve Marşlarımız",
      "ogrenmeAlani": "Mü. 6. A. DİNLEME - SÖYLEME",
      "ogrenmeCiktilari": "Mü.6.A.1. İstiklâl Marşı’nı birlikte söyler.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Kulaktan Şarkı Öğretimi Uygulama Taklit etme Söyleme",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Eşlik Çalgısı Blokflüt, Melodika. İstiklal Marşı Kayıtları EBA kaynakları.",
      "etkinlikler": "1. ETKİNLİK • \"İstiklal Marşı’nın nefes işaretlerinden önce gelen sözcükleri örnekteki gibi daire içine alır. \"İstiklal Marşı’nı anlamını hissederek ve nefes yerlerine uyarak söyler. 2. ETKİNLİK •\"İstiklal Marşı’nı kitaptaki tabloyu takip ederek dinler. • \"İstiklal Marşı’nı doğru tonlama ve vurguyla, tablodaki vuruşlara ve nefes yerlerine dikkat ederek müzik eşliğinde söyler.",
      "aciklamalar": "a) Öğrencilerin İstiklâl Marşı’nı nefes yerlerine uygun olarak söylemeleri sağlanır. b) Öğrencilerin İstiklâl Marşı’nı söylerken doğru tonlama ve vurgu yapmaları sağlanır.",
      "degerler": "Çalışkanlık, Duyarlılık, Eşitlik, Özgürlük, Saygı, Sorumluluk, Vatansever-lik Vefa"
     }
    },
    {
     "ay": "MART",
     "hafta": "25.HAFTA(23-29)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "4.ÜNİTE Atatürk’ün Türk Müziğine İlişkin Görüşleri",
      "ogrenmeAlani": "Mü. 6. A. DİNLEME - SÖYLEME",
      "ogrenmeCiktilari": "Mü.6.A.2. Millî birlik ve beraberlik duygusunu güçlendiren marşlarımızı doğru söyler.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Söyleme,",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Belirli günlerle ilgili şarkılar. Atatürk ve Müzik konulu kaynaklar EBA kaynakları.",
      "etkinlikler": "8. ETKİNLİK • “Hoş Gelişler Ola” türküsünü dinler. • Türküyü nefes yerlerine uyarak söyler. “Çanakkale Türküsünü” söyler.",
      "aciklamalar": "a) Millî, dinî ve manevi günler ile belirli gün ve haftalarda bu kazanıma yer verilmelidir. b) Öğrencilerin önemli gün ve haftalar dolayısıyla düzenlenecek Atatürk ile ilgili müzik etkinliklerine katılmaları için gerekli yönlendirmeler yapılmalıdır. Bu etkinliklerde öğrenciler, oluşturdukları özgün çalışmaları da sergileyebilirler.",
      "degerler": "Çalışkanlık, Duyarlılık, Eşitlik, Özgürlük, Saygı, Sorumluluk, Vatansever-lik Vefa",
      "degerlendirme": "SINAV HAFTASI"
     }
    },
    {
     "ay": "MART-NİSAN",
     "hafta": "26.HAFTA(30-05)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "5.ÜNİTE Türk Müziğinde Makamsal Yapı",
      "ogrenmeAlani": "Mü. 6. A. DİNLEME – SÖYLEME",
      "ogrenmeCiktilari": "Mü.6.A.6. Türk müziğinin makamsal bir yapıda olduğunu fark eder. Mü.6.A.4. Farklı ritmik yapıdaki müzikleri seslendirir.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Canlandır-ma Söyleme, Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Eşlik Çalgıları Ritim Çalgıları. Eser notaları",
      "etkinlikler": "1. ETKİNLİK • Nikriz makamındaki “Türkiye’miz” şarkısını (s.100) ve “Zobalarında Guru da Meşe” (s.104) türküsünü dinler. • Nikriz makamındaki “Kahve Yemen’den Gelir” türküsünü dinler. • “Kahve Yemen’den Gelir” türküsünü nefes yerlerine uyarak seslendirir.",
      "aciklamalar": "Türk müziğinin temel dokusu göz önünde bulundurularak öğrencilerin nihavent ve nikriz makamlarını ayırt edebilmelerine yönelik dinleti (türkü, şarkı, alıştırma vb.) çalışmaları yapılmalıdır. Örneğin önce sınıf düzeyinde istenen makamlardan birine yönelik dinleti çalışmaları yapılır. Öğrenciler ilk makamı işitsel olarak algıladıktan sonra diğer makama yönelik dinleti yapılır. Sonra her iki makama yönelik karışık eserler dinletilir ve öğrencilerden eserlerin hangi makama ait olduklarını bulmaları istenir. Müzikler kulaktan öğretilmiş basit, bileşik ve aksak ölçülerle sınırlı olmalıdır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Özgürlük, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk, Vatansever-lik Vefa"
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "27.HAFTA(06-12)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "5.ÜNİTE Türk Müziğinde Makamsal Yapı",
      "ogrenmeAlani": "Mü. 6. A. DİNLEME – SÖYLEME",
      "ogrenmeCiktilari": "Mü.6.A.6. Türk müziğinin makamsal bir yapıda olduğunu fark eder. Mü.6.A.4. Farklı ritmik yapıdaki müzikleri seslendirir.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Canlandır-ma Söyleme, Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Eşlik Çalgıları Ritim Çalgıları. Eser notaları",
      "etkinlikler": "2. ETKİNLİK • Nihavent makamındaki “Anlat Bana Öğretmenim” (s.101) ve “Sevgiyle Büyürüz Biz” (s.102) şarkılarını dinler. • Nihavent makamında bir eser olan “Türkiye’min Dört Yanında” şarkısını dinler. • “Türkiye’min Dört Yanında” şarkısını nefes yerlerine uyarak seslendirir.",
      "aciklamalar": "Öğrenciler ilk makamı işitsel olarak algıladıktan sonra nihavent makamına yönelik dinleti yapılır. Sonra her iki makama yönelik karışık eserler dinletilir ve öğrencilerden eserlerin hangi makama ait olduklarını bulmaları istenir. Müzikler kulaktan öğretilmiş basit, bileşik ve aksak ölçülerle sınırlı olmalıdır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Özgürlük, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk, Vatansever-lik Vefa"
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "28.HAFTA(13-19)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "5.ÜNİTE Türk Müziğinde Makamsal Yapı",
      "ogrenmeAlani": "Mü. 6. A. DİNLEME – SÖYLEME",
      "ogrenmeCiktilari": "Mü.6.A.6. Türk müziğinin makamsal bir yapıda olduğunu fark eder. Mü.6.A.4. Farklı ritmik yapıdaki müzikleri seslendirir.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Canlandır-ma Söyleme, Gösteri",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Eşlik Çalgıları Ritim Çalgıları. Eser notaları",
      "etkinlikler": "3. ETKİNLİK • Verilen farklı makamlardaki şarkı ve türküleri dinler. • Dinlediği şarkı ve türküleri ilişkili oldukları makamlarla eşleştirir. • “Yollar ve Vatanım” şarkısını tekrar dinler. • Şarkıyı nefes yerlerine uyarak seslendirir.",
      "aciklamalar": "Öğrenciler eserlerin makamlarını belirlemede belli bir başarı elde ettikten sonra bu makamlardan farklı karakterde üçüncü bir makama ait eserler de arada bir sorulur ancak bu makamla ilgili ayrıntıya girilmez. Her çalışma sınıf düzeyinde istenen makamlara yönelik söyleme etkinlikleri ile desteklenerek öğrencilerde makamsal farkındalık sağlanır. Müzikler kulaktan öğretilmiş basit, bileşik ve aksak ölçülerle sınırlı olmalıdır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Özgürlük, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk, Vatansever-lik Vefa"
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "29.HAFTA(20-26)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "5.ÜNİTE Ezgiye Ritim Oluşturma",
      "ogrenmeAlani": "Mü. 6. C. MÜZİKSEL YARATICILIK",
      "ogrenmeCiktilari": "Mü.6.C.3. Ezgilere kendi oluşturduğu ritim kalıbı ile eşlik eder.",
      "yontemTeknikler": "Sunum Kulaktan Şarkı Öğretimi, Uygulama. Taklit etme Canlandır-ma Söyleme,",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Ritim Çalgıları.",
      "etkinlikler": "4.ETKİNLİK • “Sevgi Çiçekleri” şarkısını dinler. Şarkıyı nefes yerlerine uyarak söyler. • Şarkının notaları altında verilen çizgiye zaman belirtecini dikkate alarak oluşturduğu ritim notalarını yazar. • Şarkıyı söylerken ritim çalgıları ya da beden müziği (alkış sesi vb.) kullanarak yazdığı ritmi Seslendirir.",
      "aciklamalar": "Öğrendiği süre değerleri, zaman belirteçleri ve usullerle sınırlı olmalıdır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk,",
      "degerlendirme": "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı"
     }
    },
    {
     "ay": "NİSAN-MAYIS",
     "hafta": "30.HAFTA(27-03)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "4.ÜNİTE Atatürk’ün Türk Müziğine İlişkin Görüşleri",
      "ogrenmeAlani": "Mü. 6. D. MÜZİK KÜLTÜRÜ",
      "ogrenmeCiktilari": "Mü.6.D.2. Atatürk’ün müzikle ilgili temel görüşlerini anlar.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Söyleme,",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Belirli günlerle ilgili şarkılar. Atatürk ve Müzik konulu kaynaklar EBA kaynakları.",
      "etkinlikler": "7.ETKİNLİK • “Dünya Çocuk Bayramı” şarkısını dinler. • Şarkıyı nefes yerlerine uyarak söyler.",
      "aciklamalar": "a) Atatürk’ün müzikle ilgili görüşlerini anlamak için Türk müziğinin gelişimi ile ilgili sözlerinden yola çıkılır. Örneğin öğrencilerin Atatürk’ün “Ulusun ince duygularını düşüncelerini anlatan, yüksek deyişlerini, söyleyişlerini toplamak, onları genel musiki kurallarına göre işlemek gerekir, ancak Türk ulusal musikisi böyle yükselebilir, evrensel musiki de yerini alabilir.” vb. sözlerinden yola çıkılarak müziğe ilişkin görüşlerini tanımaları sağlanır. b) Öğrencilerin müzikle ilgili araştırmalarında bilgisayar, internet ve kütüphanelerden yararlanabilmelerine ilişkin yönlendirmeler yapılır.",
      "degerler": "Çalışkanlık, Duyarlılık, Eşitlik, Özgürlük, Saygı, Sevgi, Sorumluluk, Vatansever-lik Vefa",
      "degerlendirme": "1 Mayıs İşçi Bayramı"
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "31.HAFTA(04-10)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "5.ÜNİTE Ezgiye Ritim Oluşturma",
      "ogrenmeAlani": "Mü. 6. C. MÜZİKSEL YARATICILIK",
      "ogrenmeCiktilari": "Mü.6.C.2. Farklı ritmik yapıdaki müzikleri harekete dönüştürür.",
      "yontemTeknikler": "Sunum Kulaktan Şarkı Öğretimi, Uygulama. Taklit etme Canlandır-ma Söyleme,",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Ritim Çalgıları.",
      "etkinlikler": "5.ETKİNLİK • “Bana Bir Şarkı Söyle” şarkısını dinler. • Şarkıyı nefes yerlerine uyarak söyler. • Şarkıyı beden müziği (alkış vb.) ya da ritim çalgılarıyla eşlik ederek seslendirir. • Sınıf İki gruba ayrılarak birinci grup şarkıyı söyler, ikinci grup şarkıya ritimle eşlik eder.",
      "aciklamalar": "Kulaktan öğrenilmiş basit ve aksak ölçüler verilmelidir.",
      "degerler": "Arkadaşlık, Çalışkanlık, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk."
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "32.HAFTA(11-17)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "5.ÜNİTE Ezgi Oluşturma ve Müzik Teknolojisi",
      "ogrenmeAlani": "Mü. 6. C. MÜZİKSEL YARATICILIK",
      "ogrenmeCiktilari": "Mü.6.C.6. Müzikle ilgili araştırma ve çalışmalarında bilişim teknolojilerinden yararlanır.",
      "yontemTeknikler": "Sunum Kulaktan Şarkı Öğretimi, Uygulama. Taklit etme Canlandır-ma Söyleme,",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Ritim Çalgıları. Nota yazım ve müzik düzenleme programları.",
      "etkinlikler": "6.ETKİNLİK • Verilen boş ölçülerde üzerlerinde yazan tartım kalıplarını kullanır, öğrendiği notaları istediği gibi yerleştirerek ezgi oluşturur. Ezgiye söz de yazabilir. • Oluşturduğu ezgiyi sınıfta seslendirir. • Oluşturduğu ezgiyi nota yazım ve müzik düzenleme programlarını kullanarak bilgisayara kaydedebilirsiniz.",
      "aciklamalar": "a) Öğrenciler kendi çalışmalarını (beste, düzenleme vb.) bilgisayarlı müzik kayıt teknolojilerini kullanarak kaydeder. Örneğin bireysel olarak veya grup oluşturarak, çalışmalarını nota yazım programları ile notaya alma; müzik-ses düzenleme programları ile de kaydetme ve düzenleme etkinlikleri yaparlar. b) İnternet ortamında müzik dinlerken siber güvenliğe ve etik kurallara dikkat edilmesi gerekliliği hatırlatılır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk."
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "33.HAFTA(18-24)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "1ÜNİTE Ses Değişimi",
      "ogrenmeAlani": "Mü. 6. A. DİNLEME - SÖYLEME",
      "ogrenmeCiktilari": "Mü.6.A.2. Millî birlik ve beraberlik duygusunu güçlendiren marşlarımızı doğru söyler.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Söyleme,",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Belirli günlerle ilgili şarkılar. Atatürk ve Müzik konulu kaynaklar EBA kaynakları.",
      "etkinlikler": "6. ETKİNLİK “Samsun’dan Doğan Güneş” şarkısını dinler. • Vücudunu rahat ve dik bir konumda tutar. • Diyafram nefesi alarak şarkıyı hafif bir sesle bağırmadan söyler. • Dilerseniz şarkıya çalgınızla eşlik edebilirsiniz",
      "aciklamalar": "a) Millî, dinî ve manevi günler ile belirli gün ve haftalarda bu kazanıma yer verilmelidir. b) Öğrencilerin önemli gün ve haftalar dolayısıyla düzenlenecek Atatürk ile ilgili müzik etkinliklerine katılmaları için gerekli yönlendirmeler yapılmalıdır. Bu etkinliklerde öğrenciler, oluşturdukları özgün çalışmaları da sergileyebilirler. Eserler “Kırmızı Gülün Alı Var”, “Vardar Ovası”, “Estergon Kalâ’sı” gibi Atatürk’ün sevdiği türkü ve şarkılardan seçilir.",
      "degerler": "Çalışkanlık, Duyarlılık, Eşitlik, Özgürlük, Saygı, Sorumluluk, Vatansever-lik Vefa",
      "degerlendirme": "19 Mayıs Atatürk’ü Anma Gençlik ve Spor Bayramı"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "34.HAFTA(01-07)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "4.ÜNİTE Atatürk’ün Türk Müziğine İlişkin Görüşleri",
      "ogrenmeAlani": "Mü. 6. A. DİNLEME - SÖYLEME",
      "ogrenmeCiktilari": "Mü.6.A.2. Millî birlik ve beraberlik duygusunu güçlendiren marşlarımızı doğru söyler.",
      "yontemTeknikler": "Anlatım, Soru-cevap, Araştırma Sunum Kulaktan Şarkı Öğretimi, Uygulama. Söyleme,",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Belirli günlerle ilgili şarkılar. Atatürk ve Müzik konulu kaynaklar EBA kaynakları.",
      "etkinlikler": "8. ETKİNLİK • “Hoş Gelişler Ola” türküsünü dinler. • Türküyü nefes yerlerine uyarak söyler. “Gençlik Marşını” söyler.",
      "aciklamalar": "a) Millî, dinî ve manevi günler ile belirli gün ve haftalarda bu kazanıma yer verilmelidir. b) Öğrencilerin önemli gün ve haftalar dolayısıyla düzenlenecek Atatürk ile ilgili müzik etkinliklerine katılmaları için gerekli yönlendirmeler yapılmalıdır. Bu etkinliklerde öğrenciler, oluşturdukları özgün çalışmaları da sergileyebilirler.",
      "degerler": "Çalışkanlık, Duyarlılık, Eşitlik, Özgürlük, Saygı, Sorumluluk, Vatansever-lik Vefa"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "35.HAFTA(08-14)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "5.ÜNİTE Ezgi Oluşturma ve Müzik Teknolojisi",
      "ogrenmeAlani": "Mü. 6. C. MÜZİKSEL YARATICILIK",
      "ogrenmeCiktilari": "Mü.6.C.5. Kendi oluşturduğu ezgileri seslendirir.",
      "yontemTeknikler": "Sunum Kulaktan Şarkı Öğretimi, Uygulama. Taklit etme Canlandır-ma Söyleme",
      "aracGerecMateryaller": "Ders Kitabı, Etkileşimli Tahta, Blokflüt, Melodika. Ritim Çalgıları. Nota yazım ve müzik düzenleme programları.",
      "etkinlikler": "6.ETKİNLİK • Verilen boş ölçülerde üzerlerinde yazan tartım kalıplarını kullanır, öğrendiği notaları istediği gibi yerleştirerek ezgi oluşturur. Ezgiye söz de yazabilir. • Oluşturduğu ezgiyi sınıfta seslendirir. • Oluşturduğu ezgiyi nota yazım ve müzik düzenleme programlarını kullanarak bilgisayara kaydedebilirsiniz.",
      "aciklamalar": "a) Ezgi denemeleri; öğrenilen zaman belirteçleri ve süre değerleri ile sınırlandırılmalıdır. b) Öğrencilerin oluşturdukları ezgileri bireysel veya toplu olarak seslendirmeleri sağlanır. Mehter müziği türünde İsmail Hakkı Bey'e ait \"Eski Ordu Marşı\" (s.104) adlı eseri dinler. (İstanbul´un Fethi (29 Mayıs))",
      "degerler": "Arkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Eşitlik, İyilikseverlik Özgürlük, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk, Vefa",
      "degerlendirme": "SINAV HAFTASI"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "36.HAFTA(15-21)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "5.ÜNİTE Ezgi Oluşturma ve Müzik Teknolojisi",
      "ogrenmeAlani": "Mü. 6. A. DİNLEME – SÖYLEME Mü. 6. D. MÜZİK KÜLTÜRÜ",
      "ogrenmeCiktilari": "Mü.6.A.7. Müzik çalışmalarını sergiler. Mü.6.D.5. Dinlediği çeşitli türdeki müziklerden hem bireysel hem de ortak sınıf arşivini geliştirir.",
      "yontemTeknikler": "Uygulama. Araştırma Sunum Taklit etme Canlandır-ma Söyleme, Çalma Gösteri",
      "aracGerecMateryaller": "Etkileşimli Tahta, Blokflüt, Melodika, Ritim Çalgıları.",
      "etkinlikler": "7.ETKİNLİK • Severek dinlediği müzikleri ve kendine ait müzik çalışmalarını bilişim teknolojilerini kullanarak taşınabilir belleğe kaydeder. Böylece kendi müzik arşivini oluşturur. • Müzik arşivindeki müzikleri diğer arkadaşları ile paylaşarak ortak bir sınıf arşivi oluşturur. Bireysel ve grup performansları sergilenir.",
      "aciklamalar": "Öğrencilerin müzikle ilgili eser ve edinimlerini sunabilecekleri ortamlar oluşturulur. a) Öğrencilerin müzik alanı ile ilgili edindikleri veya ürettikleri her türlü çalışmayı (eser ses kayıtları, nota yazıları vb.) sınıflandırıp çeşitli bilişim teknolojisi gereçlerinin (bilgisayar, çeşitli bellek birimleri vb.) desteğiyle gerek yazılı gerek sayısal (dijital) veri olarak bir müzik arşivi oluşturmaları sağlanır. b) İnternet ortamında müzik dinlerken siber güvenliğe ve etik kurallara dikkat edilmesi gerekliliği hatırlatılır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Eşitlik, İyilikseverlik Özgürlük, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk, Vefa"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "37.HAFTA(22-28)",
     "saat": "1 SAAT",
     "degerler": {
      "tema": "5.ÜNİTE Ezgi Oluşturma ve Müzik Teknolojisi",
      "ogrenmeAlani": "Mü. 6. A. DİNLEME – SÖYLEME Mü. 6. D. MÜZİK KÜLTÜRÜ",
      "ogrenmeCiktilari": "Mü.6.A.7. Müzik çalışmalarını sergiler. Mü.6.D.5. Dinlediği çeşitli türdeki müziklerden hem bireysel hem de ortak sınıf arşivini geliştirir.",
      "yontemTeknikler": "Uygulama. Araştırma Sunum Taklit etme Canlandır-ma Söyleme, Çalma Gösteri",
      "aracGerecMateryaller": "Etkileşimli Tahta, Blokflüt, Melodika, Ritim Çalgıları.",
      "etkinlikler": "7.ETKİNLİK • Severek dinlediği müzikleri ve kendine ait müzik çalışmalarını bilişim teknolojilerini kullanarak taşınabilir belleğe kaydeder. Böylece kendi müzik arşivini oluşturur. • Müzik arşivindeki müzikleri diğer arkadaşları ile paylaşarak ortak bir sınıf arşivi oluşturur. Bireysel ve grup performansları sergilenir.",
      "aciklamalar": "Öğrencilerin müzikle ilgili eser ve edinimlerini sunabilecekleri ortamlar oluşturulur. a) Öğrencilerin müzik alanı ile ilgili edindikleri veya ürettikleri her türlü çalışmayı (eser ses kayıtları, nota yazıları vb.) sınıflandırıp çeşitli bilişim teknolojisi gereçlerinin (bilgisayar, çeşitli bellek birimleri vb.) desteğiyle gerek yazılı gerek sayısal (dijital) veri olarak bir müzik arşivi oluşturmaları sağlanır. b) İnternet ortamında müzik dinlerken siber güvenliğe ve etik kurallara dikkat edilmesi gerekliliği hatırlatılır.",
      "degerler": "Arkadaşlık, Çalışkanlık, Duyarlılık, Estetik, Eşitlik, İyilikseverlik Özgürlük, Paylaşma, Sabır, Saygı, Sevgi, Sorumluluk, Vefa",
      "degerlendirme": "Ders Yılının Sona ermesi"
     }
    }
   ]
  },
  {
   "dersAdi": "Görsel Sanatlar",
   "seviye": 5,
   "egitimOgretimYili": "2026-2027",
   "sutunlar": [
    "sanatDegerleriTemelBeceriler",
    "ogrenmeCiktilari",
    "tema",
    "surecDosyasi",
    "degerlendirme"
   ],
   "satirlar": [
    {
     "ay": "EYLÜL",
     "hafta": "1.HAFTA(08-14)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "&İmgesel nedir? &Sanat eseri nedir? &Sanatçı kimdir? #Sevgi, saygı, hoşgörü",
      "ogrenmeCiktilari": "G.5.1.1 Görsel sanat çalışmasını oluştururken uygulama basamaklarını kullanır, (beyin fırtınası ile başlayan, fikirleri sentezleme,",
      "tema": "Sanat malzemelerini tanıyalım” Öğrencilere kullanılacak malzemelerin tanıtılması. 35x25 veya 35x50 resim kâğıdı, suluboya, pastel, guaş boya, resim fırçaları vb. malzemeler",
      "surecDosyasi": "öğrencilerin bu malzemeleri önceden bilip bilmedikleri sorulur. _Kesinlikle seyyar satıcılarının sattığı sanat malzemelerin alınmaması söylenir."
     }
    },
    {
     "ay": "EYLÜL",
     "hafta": "2.HAFTA(15-21)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "Tasarlama, eskiz yapma detaylandırma ve sanat çalışma sını oluşturmaya kadar sürecin bilinmesi ve uygulanması sağlanır.)"
     }
    },
    {
     "ay": "EYLÜL",
     "hafta": "3.HAFTA(22-28)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "*Atatürk’ün sanat ve sanatçıya verdiği önemle ilgili söyleşi. =Dijital yetkinlik &Üslup nedir? &Soyut ve somut nedir",
      "ogrenmeCiktilari": "G.5.1.7 Görsel sanat çalışmalarını oluştururken sanat elemanlarını ve tasarım ilkelerini kullanır. Renk, doku, form, değer ve denge",
      "tema": "“Sanatın Anlayalım ve renkleri keşfedelim “ Öğrencilerin sanatsal bilgi ve becerilerini temellendirmek boya tekniklerinde bilinç geliştirmek amaçlı çalışmalar ve bilgiler sunmak. ($) Sosyal bir etkinlik olarak sanatın parasal kazanım etkinlikleri üstüne söyleşiler.",
      "surecDosyasi": "+Öğrencilerden bildikleri Hikâyeleri anlatmaları istenir. Kısa bir hikâyenin ürün dosyasına eklenebileceği söylenir. +En sevdikleri hikâyenin adı sorulur. _Malzemeleri düzenli kullanır ve temiz tutar."
     }
    },
    {
     "ay": "EKİM",
     "hafta": "4.HAFTA(29-05)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.2.1 Farklı kültürlerin sanatı ve sanatçıları arasında benzerlik ve farklılıkları açıklar"
     }
    },
    {
     "ay": "EKİM",
     "hafta": "5.HAFTA(06-12)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.3.5.Kendi görsel sanat çalışmasını analiz eder.."
     }
    },
    {
     "ay": "EKİM",
     "hafta": "6.HAFTA(13-19)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "(!)1.Ders içi performans Değerlendirme"
     }
    },
    {
     "ay": "EKİM",
     "hafta": "7.HAFTA(20-26)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "Sorumluluk, güven, samimiyet =Ana dilde iletişim",
      "ogrenmeCiktilari": "G.5.2.1 Farklı kültürlerin sanatı ve sanatçıları arasında benzerlik ve farklılıkları açıklar.",
      "tema": "Sanatçıyı anlamak ve sanatla yaşamaya ne dersin?” Farklı yerlerde yaşasalar bile ressamların aynı konuları çizebileceğinden bahsedilir. Öğrencilere resim sanatçılarının eserlerini araştırmaları istenir ve bulunan sanat eserinin aynı bakım görseli yapılmaya çalışılır. Röprodüksiyon çalışması",
      "surecDosyasi": "Öğrencilere bazı ressamlardan sokak manzaraları resimleri gösterilir. +Bulunduğunu yörenin kültürel değerleri nelerdir? +Kültürümüzde etik kurallar nelerdir?"
     }
    },
    {
     "ay": "EKİM-KASIM",
     "hafta": "8.HAFTA(27-02)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "&Sanat eleştiri nedir? &Sanat Estetiği nedir&Sanat eleştiri nedir? &Sanat Estetiği nedir&Sanat eleştiri nedir? &Sanat Estetiği nedir",
      "ogrenmeCiktilari": "G.5.3.4 Bir sanat eserini yapıldığı dönem ve şartlara göre analiz eder.G.5.3.4 Bir sanat eserini yapıldığı dönem ve şartlara göre analiz eder.G.5.3.4 Bir sanat eserini yapıldığı dönem ve şartlara göre analiz eder.",
      "degerlendirme": "Cumhuriyet Bayramı"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "9.HAFTA(03-09)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.2.4.Kullanılan sanat malzemeleri ile görsel sanat alanındaki meslekler arasında ilişki kurar.",
      "degerlendirme": "Kızılay Haftası"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "10.HAFTA(17-23)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.1.4 Gözlemlerinden yola çıkarak orantılarına uygun insan figürü çizer.(!)2.Ders içi performans Değerlendirme",
      "degerlendirme": "Dünya Çocuk Hakları Günü"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "11.HAFTA(24-30)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "&Perspektif nedir? Kaça ayrılır? *Atatürk’ün bilim ve sanata verdiği önem konusu. #Doğruluk ve inanç =Yabancı dillerde iletişim",
      "ogrenmeCiktilari": "G.5.1.3 Görsel sanat çalışmasında hava(renk) perspektifini(derinlik) kullanır. Çizgisel ve hava perspektifi öğrenir.",
      "tema": "“Derinlerin sırlarını keşfedelim” Gösterilen resimlerin içeriği hakkında konuşulur. Öğrenciler gösterilen resimlerden etkilenerek istedikleri bir manzarayı çizer. Çalışmalar sulu boya ile renklendirilir.",
      "surecDosyasi": "+Öğrencilere geçmişten günümüze doğru bazı ressamların peyzaj ve çizgisel derinlik resimleri gösterilir. _Sınıf içi etkinlik kurallarına uyar ve çevresine örnek olur.",
      "degerlendirme": "Öğretmenler Günü"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "12.HAFTA(01-07)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.1.2 Görsel sanat çalışmasında mekân olgusunu göstermek için ölçü ve oranı kullanır.",
      "degerlendirme": "Dünya Engelliler Günü"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "13.HAFTA(08-14)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.3.2.Seçilen eserin görsel özelliklerini analiz eder."
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "14.HAFTA(15-21)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.1.6.Üç boyutlu sanat malzemelerini kullanarak rölyef veya heykel oluşturur.",
      "tema": "Atık objeler sanat olsun” Öğrenciler anlatılanlar ışığında değişik türde ahşap, metal veya plastik atık malzemelerle uyarlama (asamblaj) çalışmaları yaparlar.",
      "surecDosyasi": "Öğrencilerle seramik, heykel, mimari, resim ve fotoğraf sanatı hakkında konuşulur, bu sanatların hangi malzemelerden yapıldığı sorulur."
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "15.HAFTA(22-28)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.2.4.Kullanılan sanat malzemeleri ile görsel sanat alanındaki meslekler arasında ilişki kurar.(!)Ürün dosyası değerlendirme"
     }
    },
    {
     "ay": "ARALIK-OCAK",
     "hafta": "16.HAFTA(29-04)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.3.5.Kendi görsel sanat çalışmasını analiz eder. İçinde bulunduğu çevre ve şartlara göre oluşturduğu çalışmasını ifade etmesi sağlanır. Heykeltıraşın eserlerini oluşturmak için kil, metal, taş, bronz, alçı, ahşap vb. malzemeleri kullandığı Örneğindeki gibi sanat alanındaki meslekler ve kullanılan malzemeler üzerinde durulur.G.5.3.5.Kendi görsel sanat çalışmasını analiz eder. İçinde bulunduğu çevre ve şartlara göre oluşturduğu çalışmasını ifade etmesi sağlanır. Heykeltıraşın eserlerini oluşturmak için kil, metal, taş, bronz, alçı, ahşap vb. malzemeleri kullandığı Örneğindeki gibi sanat alanındaki meslekler ve kullanılan malzemeler üzerinde durulur.",
      "degerlendirme": "Yılbaşı Tatili"
     }
    },
    {
     "ay": "OCAK",
     "hafta": "17.HAFTA(05-11)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "Matematiksel yetkinlik ve bilim/teknolojide temel yetkinlikler",
      "ogrenmeCiktilari": "G.5.3.5.Kendi görsel sanat çalışmasını analiz eder. İçinde bulunduğu çevre ve şartlara göre oluşturduğu çalışmasını ifade etmesi sağlanır. Heykeltıraşın eserlerini oluşturmak için kil, metal, taş, bronz, alçı, ahşap vb. malzemeleri kullandığı Örneğindeki gibi sanat alanındaki meslekler ve kullanılan malzemeler üzerinde durulur.",
      "tema": "Gelin yaptıklarımızı değerlendirelim. Birinci dönemin değerlendirilmesi. ($) Etik Kurallar ve sosyal bir birey olma üstüne söyleyişi.",
      "surecDosyasi": "_Ders işlenişinde makas vs. gibi araçlar öğretmen gözetiminde kullanılmalı ve kullanım mantığı öğretilmelidir"
     }
    },
    {
     "ay": "OCAK",
     "hafta": "18.HAFTA(12-18)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.3.5.Kendi görsel sanat çalışmasını analiz eder. İçinde bulunduğu çevre ve şartlara göre oluşturduğu çalışmasını ifade etmesi sağlanır. Heykeltıraşın eserlerini oluşturmak için kil, metal, taş, bronz, alçı, ahşap vb. malzemeleri kullandığı Örneğindeki gibi sanat alanındaki meslekler ve kullanılan malzemeler üzerinde durulur.G.5.3.5.Kendi görsel sanat çalışmasını analiz eder. İçinde bulunduğu çevre ve şartlara göre oluşturduğu çalışmasını ifade etmesi sağlanır. Heykeltıraşın eserlerini oluşturmak için kil, metal, taş, bronz, alçı, ahşap vb. malzemeleri kullandığı Örneğindeki gibi sanat alanındaki meslekler ve kullanılan malzemeler üzerinde durulur.",
      "degerlendirme": "Birinci Dönemin Sona Ermesi"
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "19.HAFTA(02-08)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "&Dostluk” &yardımseverlik Kroma; Bir rengin parlaklıktan donukluğa doğru geçişi. =Kültürel farkındalık ve ifade",
      "ogrenmeCiktilari": "G.5.1.7 Görsel sanat çalışmalarını oluştururken sanat elemanlarını ve tasarım ilkelerini kullanır. Renk, doku, form, değer ve denge,",
      "tema": "Şablon ve Baskı Nedir? Merak ediyor musun?” Öğrencilerden Şablon ve Baskı teknikleri konusunda çalışmalar yapmaları sağlanır. Bu konuda eserler üreten sanatçılar ve eserleri araştırılabilir.",
      "surecDosyasi": "Öğrencilere Baskı tekniklerinden oluşan çalışmalar gösterilir. +Bir Baskı tasarımın olsa nasıl bir çalışma tasarlardın? +En beğendiğin Şablon ve baskı Tekniği hangileridir? *Üç boyutlu sanat nedir? Rölyef nedir?",
      "degerlendirme": "İkinci Yarıyıl Başlangıcı"
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "20.HAFTA(09-15)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.2.4 Kullanılan sanat malzemeleri ve görsel sanat alanındaki meslekler arasında ilişki kurar."
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "21.HAFTA(16-22)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.3.5.Kendi görsel sanat çalışmasını analiz eder."
     }
    },
    {
     "ay": "ŞUBAT-MART",
     "hafta": "22.HAFTA(23-01)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.1.5.Görsel sanat çalışmasında farklı malzemeleri kullanır.(!)1.Ders içi performans Değerlendirme"
     }
    },
    {
     "ay": "MART",
     "hafta": "23.HAFTA(02-08)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "Mekân Boşluk doluluk. Vurgu Odak nokta, baskın. &Oran-orantı; Gerçekçi, abartılı.",
      "ogrenmeCiktilari": "G.5.2.3.Müzeler ile görsel sanatları ilişkilendirir Müze, müze türleri ve müzelerin kültürel mirasa katkıları üzerinde durulur",
      "tema": "Bir Mimari Deha: Mimar Sinan” Öğrenciler Üstat Mimar Sinan’ın Hayatı ve Çıraklık-Kalfalık ve Ustalık dönemine ait Mimari yapılarının adını araştırmaları istenir bu sunumlar dosya ve pano sunumu olabilir. ($) Mimari ve heykelde el işçiliği üretim alanları hakkında ticari bir söyleşi.",
      "surecDosyasi": "Öğrencilere Mimar Sinan‘nın kaç tane eser yaptığını ve bunu kaç sende bitirdiğini araştırmaları söylenir. +Öğrencilere yapı çeşitlerini araştırmaları söylenir. |-Solvent içermeyen yapıştırıcıların kullanılması sağlanır *Mimari hangi sanat alanında yer almaktadır?"
     }
    },
    {
     "ay": "MART",
     "hafta": "24.HAFTA(09-15)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "Vatanseverlik ve gelecek = Öğrenmeyi öğrenme",
      "ogrenmeCiktilari": "G.5.1.6.Üç boyutlu sanat malzemelerini kullanarak rölyef veya heykel oluşturur."
     }
    },
    {
     "ay": "MART",
     "hafta": "25.HAFTA(23-29)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.2.2 Geçmişte ve günümüzde yapılmış olan sanat eserleri arasındaki farklılıkları belirler.",
      "degerlendirme": "SINAV HAFTASI"
     }
    },
    {
     "ay": "MART-NİSAN",
     "hafta": "26.HAFTA(30-05)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": ". G.5.3.7 Görsel çalışmasında etik kurallara uyar. (!) 2.Ders içi performans Değerlendirme)"
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "27.HAFTA(06-12)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "&Grafik sanatlar nedir? &Grafik ürünler hangileridir?",
      "ogrenmeCiktilari": "G.5.3.1 Doğal ve inşa edilmiş çevreyi karşılaştırır",
      "tema": "Renkli küçük objelerle Sanat Yapalım” Öğrenciler istedikleri malzemelerle mozaik çalışması yaparlar. (fon kartonu, pul, boncuk, renkli taş….vb.)",
      "surecDosyasi": "Solvent içermeyen yapıştırıcılar tercih edilir. +mozaik müzesi ile ilgili görseller izletilir. +Öğrencilere Van Googh hakkında araştırma yapmaları söylenir. +Yöresindeki kültürel mekânları araştırır +Bulunduğun yörenin kaç tane müzesi var"
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "28.HAFTA(13-19)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "Efendimizi (SAS) Anma ve Kutlu Doğum Haftası",
      "ogrenmeCiktilari": "G.5.3.3 Seçilen sanat eserinin içeriğini yorumlar"
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "29.HAFTA(20-26)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "Sosyal ve vatandaşlıkla ilgili yetkinlikler.",
      "ogrenmeCiktilari": "G.5.3.4 Bir sanat eserini yapıldığı dönem ve şartlara göre analiz eder",
      "degerlendirme": "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı"
     }
    },
    {
     "ay": "NİSAN-MAYIS",
     "hafta": "30.HAFTA(27-03)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.3.6 Sanat eserlerinin neden farklı değerlendirildiğini öğrenir.",
      "degerlendirme": "1 Mayıs İşçi Bayramı"
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "31.HAFTA(04-10)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "&Doku çeşitleri nelerdir? *Atatürk’ün sanata verdiği önem #Tarihine sahip çıkmak, geleceği anlamak",
      "ogrenmeCiktilari": "G.5.1.2 Görsel sanat çalışmasında mekân olgusunu göstermek için ölçü ve oranı kullanır",
      "tema": "Bir Bahçe Hayalin Var mı?” Öğrencilerden kendi hayallerindeki Bahçeyi çizmeleri istenir. Çalışmalar istenilen boya tekniğiyle boyanır. İsteyen öğrenci çalışmasını üç boyutlu olarak tasarlayabilir. ($)Sanat ve Zanaat kazanım alanları usta ve çırak ilişkisi üstüne sohbet.",
      "surecDosyasi": "+Sanatçının Peyzaj veya doğa resimlerinde neler var? -Nasıl bir bahçeniz olsun isterdiniz? +Bizlere hayallerini anlat. -Sergi salonlarında gezerken gayet yapıcı ve sanata değer veren bir birey olmak üstüne söyleşi. +En beğendiğin Şablon ve baskı Tekniği hangileridir? *Üç boyutlu sanat nedir? Rölyef nedir?"
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "32.HAFTA(11-17)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "&Sanat eleştiri nedir? &Sanat Estetiği nedir",
      "ogrenmeCiktilari": "G.5.2.2 Geçmişte ve günümüzde yapılmış olan sanat eserleri arasındaki farklılıkları belirler."
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "33.HAFTA(18-24)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.1.5.Görsel sanat çalışmasında farklı malzemeleri kullanır.",
      "degerlendirme": "19 Mayıs Atatürk’ü Anma Gençlik ve Spor Bayramı"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "34.HAFTA(01-07)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.3.5.Kendi görsel sanat çalışmasını analiz eder. G.5.3.7 Görsel çalışmasında etik kurallara uyar."
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "35.HAFTA(08-14)",
     "saat": "1 SAAT",
     "degerler": {
      "ogrenmeCiktilari": "G.5.3.3 Seçilen sanat eserinin içeriğini yorumlar (!)Proje Değerlendirme",
      "degerlendirme": "SINAV HAFTASI"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "36.HAFTA(15-21)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "İnisiyatif alma ve girişimcilik algısı.",
      "ogrenmeCiktilari": "G.5.1.7 Görsel sanat çalışmalarını oluştururken sanat elemanlarını ve tasarım ilkelerini kullanır. Renk, doku, form, değer ve denge,",
      "tema": "Hayat Sergimizle Güzel” Çocukların Yaptıkları eserlerden oluşan bir sergi sunumu yapılır",
      "surecDosyasi": "+Öğrencilere Baskı tekniklerinden oluşan çalışmalar gösterilir. +Bir Baskı tasarımın olsa nasıl bir çalışma tasarlardın?"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "37.HAFTA(22-28)",
     "saat": "1 SAAT",
     "degerler": {
      "sanatDegerleriTemelBeceriler": "İnisiyatif alma ve girişimcilik algısı.",
      "ogrenmeCiktilari": "G.5.1.7 Görsel sanat çalışmalarını oluştururken sanat elemanlarını ve tasarım ilkelerini kullanır. Renk, doku, form, değer ve denge,",
      "tema": "Hayat Sergimizle Güzel” Çocukların Yaptıkları eserlerden oluşan bir sergi sunumu yapılır",
      "surecDosyasi": "+Öğrencilere Baskı tekniklerinden oluşan çalışmalar gösterilir. +Bir Baskı tasarımın olsa nasıl bir çalışma tasarlardın?",
      "degerlendirme": "Ders Yılının Sona ermesi"
     }
    }
   ]
  },
  {
   "dersAdi": "İngilizce",
   "seviye": 6,
   "egitimOgretimYili": "2026-2027",
   "sutunlar": [
    "functions",
    "tema",
    "languageTasks",
    "materials",
    "degerlendirme"
   ],
   "satirlar": [
    {
     "ay": "EYLÜL",
     "hafta": "1.HAFTA(08-14)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing what people do regularly (Making simple inquiries) Telling the time, days and dates",
      "tema": "Unit 1: Life",
      "languageTasks": "Listening • Students will be able to recognize phrases, words, and expressions related to repeated actions. Students will be able to talk about repeated actions. Spoken Production • Students will be able to use a series of phrases and simple expressions to express their repeated actions. • Students will be able to tell the time and days. Reading • Students will be able to understand short and simple texts, such as personal narratives about repeated actions.",
      "materials": "Contexts Advertisements Cartoons - Charts Conversations Illustrations - Lists - Notices Picture strip story Postcards - Posters - Songs Stories - Tables Videos - Websites Tasks/Activities Chants and Songs Drama (Role Play, Simulation, Pantomime) Games - Information Transfer Labeling Matching Questions and Answers Reordering True/False/No information Assignments • Students prepare a visual dictionary by including new vocabulary items. • Students conduct a survey about their classmates’ favorite school/after-school activities and prepare a poster."
     }
    },
    {
     "ay": "EYLÜL",
     "hafta": "2.HAFTA(15-21)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing what people do regularly (Making simple inquiries) Telling the time, days and dates",
      "tema": "Unit 1: Life",
      "languageTasks": "Listening • Students will be able to recognize phrases, words, and expressions related to repeated actions. Students will be able to talk about repeated actions. Spoken Production • Students will be able to use a series of phrases and simple expressions to express their repeated actions. • Students will be able to tell the time and days. Reading • Students will be able to understand short and simple texts, such as personal narratives about repeated actions.",
      "materials": "Contexts Advertisements Cartoons - Charts Conversations Illustrations - Lists - Notices Picture strip story Postcards - Posters - Songs Stories - Tables Videos - Websites Tasks/Activities Chants and Songs Drama (Role Play, Simulation, Pantomime) Games - Information Transfer Labeling Matching Questions and Answers Reordering True/False/No information Assignments • Students prepare a visual dictionary by including new vocabulary items. • Students conduct a survey about their classmates’ favorite school/after-school activities and prepare a poster."
     }
    },
    {
     "ay": "EYLÜL",
     "hafta": "3.HAFTA(22-28)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing what people do regularly (Making simple inquiries) Telling the time, days and dates",
      "tema": "Unit 1: Life",
      "languageTasks": "Listening • Students will be able to recognize phrases, words, and expressions related to repeated actions. Students will be able to talk about repeated actions. Spoken Production • Students will be able to use a series of phrases and simple expressions to express their repeated actions. • Students will be able to tell the time and days. Reading • Students will be able to understand short and simple texts, such as personal narratives about repeated actions.",
      "materials": "Contexts Advertisements Cartoons - Charts Conversations Illustrations - Lists - Notices Picture strip story Postcards - Posters - Songs Stories - Tables Videos - Websites Tasks/Activities Chants and Songs Drama (Role Play, Simulation, Pantomime) Games - Information Transfer Labeling Matching Questions and Answers Reordering True/False/No information Assignments • Students prepare a visual dictionary by including new vocabulary items. • Students conduct a survey about their classmates’ favorite school/after-school activities and prepare a poster."
     }
    },
    {
     "ay": "EKİM",
     "hafta": "4.HAFTA(29-05)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Accepting and refusing Describing what people do regularly Expressing likes and dislikes",
      "tema": "Unit 2: Yummy Breakfast",
      "languageTasks": "Listening • Students will be able to identify the names of different food in an oral text. Spoken Interaction • Students will be able to ask people about their food preferences. Spoken Production • Students will be able to express their opinions about the food they like and don’t like. Reading • Students will be able to understand short and simple texts about food and preferences. • Students will be able to understand the label of food products.",
      "materials": "Contexts Advertisements Cartoons Charts Conversations Illustrations - Lists - Menus Notices Picture strip story Postcards - Posters - Songs Stories - Tables Videos - Websites Tasks/Activities Games Drama (Role Play, Simulation, Pantomime) Information - Transfer Labeling Questions and Answers True/False/No information Assignments • Students prepare a poster that shows and categorizes different food and drinks for breakfast. • In pairs students act out a role play about the food and drinks they like/don’t like."
     }
    },
    {
     "ay": "EKİM",
     "hafta": "5.HAFTA(06-12)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Accepting and refusing Describing what people do regularly Expressing likes and dislikes",
      "tema": "Unit 2: Yummy Breakfast",
      "languageTasks": "Listening • Students will be able to identify the names of different food in an oral text. Spoken Interaction • Students will be able to ask people about their food preferences. Spoken Production • Students will be able to express their opinions about the food they like and don’t like. Reading • Students will be able to understand short and simple texts about food and preferences. • Students will be able to understand the label of food products.",
      "materials": "Contexts Advertisements Cartoons Charts Conversations Illustrations - Lists - Menus Notices Picture strip story Postcards - Posters - Songs Stories - Tables Videos - Websites Tasks/Activities Games Drama (Role Play, Simulation, Pantomime) Information - Transfer Labeling Questions and Answers True/False/No information Assignments • Students prepare a poster that shows and categorizes different food and drinks for breakfast. • In pairs students act out a role play about the food and drinks they like/don’t like."
     }
    },
    {
     "ay": "EKİM",
     "hafta": "6.HAFTA(13-19)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Accepting and refusing Describing what people do regularly Expressing likes and dislikes",
      "tema": "Unit 2: Yummy Breakfast",
      "languageTasks": "Listening • Students will be able to identify the names of different food in an oral text. Spoken Interaction • Students will be able to ask people about their food preferences. Spoken Production • Students will be able to express their opinions about the food they like and don’t like. Reading • Students will be able to understand short and simple texts about food and preferences. • Students will be able to understand the label of food products.",
      "materials": "Contexts Advertisements Cartoons Charts Conversations Illustrations - Lists - Menus Notices Picture strip story Postcards - Posters - Songs Stories - Tables Videos - Websites Tasks/Activities Games Drama (Role Play, Simulation, Pantomime) Information - Transfer Labeling Questions and Answers True/False/No information Assignments • Students prepare a poster that shows and categorizes different food and drinks for breakfast. • In pairs students act out a role play about the food and drinks they like/don’t like."
     }
    },
    {
     "ay": "EKİM",
     "hafta": "7.HAFTA(20-26)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing places (Making comparisons) Describing what people are doing now (Making simple inquiries)",
      "tema": "Unit 3: Downtown",
      "languageTasks": "Listening • Students will be able to identify expressions and phrases related to present events. • Students will be able to pick up the expressions in a dialogue comparing things. Spoken Interaction • Students will be able to ask people questions about what they are doing at the moment. • Students will be able to ask people to compare things. Spoken Production • Students will be able to describe people doing different actions. • Students will be able to make comparisons between two things. Reading • Students will be able to understand visually supported, short and simple texts.",
      "materials": "Contexts Brochures Conversations Illustrations Maps Magazines Podcasts Signs Songs Stories Videos Websites Tasks/Activities Drama (Role Play, Simulation, Pantomime) Information/Opinion Gap Information Transfer Games Labeling Matching Question and Answers True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • Students take/draw a picture of their street/ neighborhood in the morning and describe what everyone is doing (they can use professions as well). • Students prepare a poster comparing their hometown with another city."
     }
    },
    {
     "ay": "EKİM-KASIM",
     "hafta": "8.HAFTA(27-02)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing places (Making comparisons) Describing what people are doing now (Making simple inquiries)Describing places (Making comparisons) Describing what people are doing now (Making simple inquiries)Describing places (Making comparisons) Describing what people are doing now (Making simple inquiries)",
      "tema": "Unit 3: DowntownUnit 3: DowntownUnit 3: Downtown",
      "languageTasks": "Listening • Students will be able to identify expressions and phrases related to present events. • Students will be able to pick up the expressions in a dialogue comparing things. Spoken Interaction • Students will be able to ask people questions about what they are doing at the moment. • Students will be able to ask people to compare things. Spoken Production • Students will be able to describe people doing different actions. • Students will be able to make comparisons between two things. Reading • Students will be able to understand visually supported, short and simple texts.Listening • Students will be able to identify expressions and phrases related to present events. • Students will be able to pick up the expressions in a dialogue comparing things. Spoken Interaction • Students will be able to ask people questions about what they are doing at the moment. • Students will be able to ask people to compare things. Spoken Production • Students will be able to describe people doing different actions. • Students will be able to make comparisons between two things. Reading • Students will be able to understand visually supported, short and simple texts.Listening • Students will be able to identify expressions and phrases related to present events. • Students will be able to pick up the expressions in a dialogue comparing things. Spoken Interaction • Students will be able to ask people questions about what they are doing at the moment. • Students will be able to ask people to compare things. Spoken Production • Students will be able to describe people doing different actions. • Students will be able to make comparisons between two things. Reading • Students will be able to understand visually supported, short and simple texts.",
      "materials": "Contexts Brochures Conversations Illustrations Maps Magazines Podcasts Signs Songs Stories Videos Websites Tasks/Activities Drama (Role Play, Simulation, Pantomime) Information/Opinion Gap Information Transfer Games Labeling Matching Question and Answers True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • Students take/draw a picture of their street/ neighborhood in the morning and describe what everyone is doing (they can use professions as well). • Students prepare a poster comparing their hometown with another city.Contexts Brochures Conversations Illustrations Maps Magazines Podcasts Signs Songs Stories Videos Websites Tasks/Activities Drama (Role Play, Simulation, Pantomime) Information/Opinion Gap Information Transfer Games Labeling Matching Question and Answers True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • Students take/draw a picture of their street/ neighborhood in the morning and describe what everyone is doing (they can use professions as well). • Students prepare a poster comparing their hometown with another city.Contexts Brochures Conversations Illustrations Maps Magazines Podcasts Signs Songs Stories Videos Websites Tasks/Activities Drama (Role Play, Simulation, Pantomime) Information/Opinion Gap Information Transfer Games Labeling Matching Question and Answers True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • Students take/draw a picture of their street/ neighborhood in the morning and describe what everyone is doing (they can use professions as well). • Students prepare a poster comparing their hometown with another city.",
      "degerlendirme": "Cumhuriyet Bayramı"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "9.HAFTA(03-09)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing places (Making comparisons) Describing what people are doing now (Making simple inquiries)",
      "tema": "Unit 3: Downtown",
      "languageTasks": "Listening • Students will be able to identify expressions and phrases related to present events. • Students will be able to pick up the expressions in a dialogue comparing things. Spoken Interaction • Students will be able to ask people questions about what they are doing at the moment. • Students will be able to ask people to compare things. Spoken Production • Students will be able to describe people doing different actions. • Students will be able to make comparisons between two things. Reading • Students will be able to understand visually supported, short and simple texts.",
      "materials": "Contexts Brochures Conversations Illustrations Maps Magazines Podcasts Signs Songs Stories Videos Websites Tasks/Activities Drama (Role Play, Simulation, Pantomime) Information/Opinion Gap Information Transfer Games Labeling Matching Question and Answers True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • Students take/draw a picture of their street/ neighborhood in the morning and describe what everyone is doing (they can use professions as well). • Students prepare a poster comparing their hometown with another city.",
      "degerlendirme": "Kızılay Haftası"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "10.HAFTA(17-23)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing the weather Making simple inquiries Expressing emotions",
      "tema": "Unit 4: Weather and Emotions",
      "languageTasks": "Listening • Students will be able to pick up specific information from short oral texts about weather conditions and emotions. Spoken Interaction • Students will be able to ask people about the weather. Spoken Production • Students will be able to talk about the weather and their emotions in a simple way. Reading • Students will be able to understand short and simple texts about the weather, weather conditions and emotions.",
      "materials": "Contexts Brochures Cartoons Conversations Illustrations Maps Magazines Podcasts Signs Songs Stories Videos Websites Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answers True/False/No information Assignments • Students prepare a chart for weather forecast and include visuals in the chart. • Students act out weather conditions by using different emotions in various situations.",
      "degerlendirme": "Dünya Çocuk Hakları Günü"
     }
    },
    {
     "ay": "KASIM",
     "hafta": "11.HAFTA(24-30)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing the weather Making simple inquiries Expressing emotions",
      "tema": "Unit 4: Weather and Emotions",
      "languageTasks": "Listening • Students will be able to pick up specific information from short oral texts about weather conditions and emotions. Spoken Interaction • Students will be able to ask people about the weather. Spoken Production • Students will be able to talk about the weather and their emotions in a simple way. Reading • Students will be able to understand short and simple texts about the weather, weather conditions and emotions.",
      "materials": "Contexts Brochures Cartoons Conversations Illustrations Maps Magazines Podcasts Signs Songs Stories Videos Websites Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answers True/False/No information Assignments • Students prepare a chart for weather forecast and include visuals in the chart. • Students act out weather conditions by using different emotions in various situations.",
      "degerlendirme": "Öğretmenler Günü"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "12.HAFTA(01-07)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing the weather Making simple inquiries Expressing emotions",
      "tema": "Unit 4: Weather and Emotions",
      "languageTasks": "Listening • Students will be able to pick up specific information from short oral texts about weather conditions and emotions. Spoken Interaction • Students will be able to ask people about the weather. Spoken Production • Students will be able to talk about the weather and their emotions in a simple way. Reading • Students will be able to understand short and simple texts about the weather, weather conditions and emotions.",
      "materials": "Contexts Brochures Cartoons Conversations Illustrations Maps Magazines Podcasts Signs Songs Stories Videos Websites Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answers True/False/No information Assignments • Students prepare a chart for weather forecast and include visuals in the chart. • Students act out weather conditions by using different emotions in various situations.",
      "degerlendirme": "Dünya Engelliler Günü"
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "13.HAFTA(08-14)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing the weather Making simple inquiries Expressing emotions",
      "tema": "Unit 4: Weather and Emotions",
      "languageTasks": "Listening • Students will be able to pick up specific information from short oral texts about weather conditions and emotions. Spoken Interaction • Students will be able to ask people about the weather. Spoken Production • Students will be able to talk about the weather and their emotions in a simple way. Reading • Students will be able to understand short and simple texts about the weather, weather conditions and emotions.",
      "materials": "Contexts Brochures Cartoons Conversations Illustrations Maps Magazines Podcasts Signs Songs Stories Videos Websites Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answers True/False/No information Assignments • Students prepare a chart for weather forecast and include visuals in the chart. • Students act out weather conditions by using different emotions in various situations."
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "14.HAFTA(15-21)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing places Expressing feelings Expressing likes and dislikes Stating personal opinions",
      "tema": "Unit 5: At The Fair",
      "languageTasks": "Listening • Students will be able to recognize the words related to the expression of emotions. Spoken Interaction • Students will be able to talk about and express the feelings and personal opinions about places and things. Spoken Production • Students will be able to use various simple expressions to state the feelings and personal opinions about places and things. Reading • Students will be able to understand general meaning in simple texts related to the feelings and personal opinions about places and things. • Students will be able to read specific information on a poster about a certain place.",
      "materials": "Contexts Advertisements Brochures Cartoons Conversations Illustrations Maps Magazines Podcasts Posters Songs Stories Videos Tasks/Activities Chants and Songs Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answers True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • In groups, students prepare a poster of a fair and then they talk about their feelings and personal opinions concerning the fair poster."
     }
    },
    {
     "ay": "ARALIK",
     "hafta": "15.HAFTA(22-28)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing places Expressing feelings Expressing likes and dislikes Stating personal opinions",
      "tema": "Unit 5: At The Fair",
      "languageTasks": "Listening • Students will be able to recognize the words related to the expression of emotions. Spoken Interaction • Students will be able to talk about and express the feelings and personal opinions about places and things. Spoken Production • Students will be able to use various simple expressions to state the feelings and personal opinions about places and things. Reading • Students will be able to understand general meaning in simple texts related to the feelings and personal opinions about places and things. • Students will be able to read specific information on a poster about a certain place.",
      "materials": "Contexts Advertisements Brochures Cartoons Conversations Illustrations Maps Magazines Podcasts Posters Songs Stories Videos Tasks/Activities Chants and Songs Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answers True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • In groups, students prepare a poster of a fair and then they talk about their feelings and personal opinions concerning the fair poster."
     }
    },
    {
     "ay": "ARALIK-OCAK",
     "hafta": "16.HAFTA(29-04)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing places Expressing feelings Expressing likes and dislikes Stating personal opinionsDescribing places Expressing feelings Expressing likes and dislikes Stating personal opinions",
      "tema": "Unit 5: At The FairUnit 5: At The Fair",
      "languageTasks": "Listening • Students will be able to recognize the words related to the expression of emotions. Spoken Interaction • Students will be able to talk about and express the feelings and personal opinions about places and things. Spoken Production • Students will be able to use various simple expressions to state the feelings and personal opinions about places and things. Reading • Students will be able to understand general meaning in simple texts related to the feelings and personal opinions about places and things. • Students will be able to read specific information on a poster about a certain place.Listening • Students will be able to recognize the words related to the expression of emotions. Spoken Interaction • Students will be able to talk about and express the feelings and personal opinions about places and things. Spoken Production • Students will be able to use various simple expressions to state the feelings and personal opinions about places and things. Reading • Students will be able to understand general meaning in simple texts related to the feelings and personal opinions about places and things. • Students will be able to read specific information on a poster about a certain place.",
      "materials": "Contexts Advertisements Brochures Cartoons Conversations Illustrations Maps Magazines Podcasts Posters Songs Stories Videos Tasks/Activities Chants and Songs Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answers True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • In groups, students prepare a poster of a fair and then they talk about their feelings and personal opinions concerning the fair poster.Contexts Advertisements Brochures Cartoons Conversations Illustrations Maps Magazines Podcasts Posters Songs Stories Videos Tasks/Activities Chants and Songs Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answers True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • In groups, students prepare a poster of a fair and then they talk about their feelings and personal opinions concerning the fair poster.",
      "degerlendirme": "Yılbaşı Tatili"
     }
    },
    {
     "ay": "OCAK",
     "hafta": "17.HAFTA(05-11)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing places Expressing feelings Expressing likes and dislikes Stating personal opinions",
      "tema": "Unit 5: At The Fair",
      "languageTasks": "Listening • Students will be able to recognize the words related to the expression of emotions. Spoken Interaction • Students will be able to talk about and express the feelings and personal opinions about places and things. Spoken Production • Students will be able to use various simple expressions to state the feelings and personal opinions about places and things. Reading • Students will be able to understand general meaning in simple texts related to the feelings and personal opinions about places and things. • Students will be able to read specific information on a poster about a certain place.",
      "materials": "Contexts Advertisements Brochures Cartoons Conversations Illustrations Maps Magazines Podcasts Posters Songs Stories Videos Tasks/Activities Chants and Songs Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answers True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • In groups, students prepare a poster of a fair and then they talk about their feelings and personal opinions concerning the fair poster."
     }
    },
    {
     "ay": "OCAK",
     "hafta": "18.HAFTA(12-18)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Describing places Expressing feelings Expressing likes and dislikes Stating personal opinionsDescribing places Expressing feelings Expressing likes and dislikes Stating personal opinions",
      "tema": "Unit 5: At The FairUnit 5: At The Fair",
      "languageTasks": "Listening • Students will be able to recognize the words related to the expression of emotions. Spoken Interaction • Students will be able to talk about and express the feelings and personal opinions about places and things. Spoken Production • Students will be able to use various simple expressions to state the feelings and personal opinions about places and things. Reading • Students will be able to understand general meaning in simple texts related to the feelings and personal opinions about places and things. • Students will be able to read specific information on a poster about a certain place.Listening • Students will be able to recognize the words related to the expression of emotions. Spoken Interaction • Students will be able to talk about and express the feelings and personal opinions about places and things. Spoken Production • Students will be able to use various simple expressions to state the feelings and personal opinions about places and things. Reading • Students will be able to understand general meaning in simple texts related to the feelings and personal opinions about places and things. • Students will be able to read specific information on a poster about a certain place.",
      "materials": "Contexts Advertisements Brochures Cartoons Conversations Illustrations Maps Magazines Podcasts Posters Songs Stories Videos Tasks/Activities Chants and Songs Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answers True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • In groups, students prepare a poster of a fair and then they talk about their feelings and personal opinions concerning the fair poster.Contexts Advertisements Brochures Cartoons Conversations Illustrations Maps Magazines Podcasts Posters Songs Stories Videos Tasks/Activities Chants and Songs Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answers True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • In groups, students prepare a poster of a fair and then they talk about their feelings and personal opinions concerning the fair poster.",
      "degerlendirme": "Birinci Dönemin Sona Ermesi"
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "19.HAFTA(02-08)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Talking about past occupations Asking personal questions Telling the time, days and dates",
      "tema": "Unit 6: Occupations",
      "languageTasks": "Listening • Students will be able to understand familiar words and simple phrases concerning people’s occupations in clear oral texts. • Students will be able to understand the time, days and dates. Spoken Interaction • Students will be able to talk about occupations. Spoken Production • Students will be able to ask personal questions. • Students will be able to state the dates. Reading • Students will be able to understand familiar words and simple sentences about occupations and the dates. Writing Students will be able to produce a piece of writing about occupations and the dates.",
      "materials": "Contexts Advertisements Brochures Cartoons Conversations Illustrations Magazines Postcards Posters Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Matching Labeling Questions and Answers Reordering Storytelling True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • Students find out the occupations of their family members and write what they do.",
      "degerlendirme": "İkinci Yarıyıl Başlangıcı"
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "20.HAFTA(09-15)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Talking about past occupations Asking personal questions Telling the time, days and dates",
      "tema": "Unit 6: Occupations",
      "languageTasks": "Listening • Students will be able to understand familiar words and simple phrases concerning people’s occupations in clear oral texts. • Students will be able to understand the time, days and dates. Spoken Interaction • Students will be able to talk about occupations. Spoken Production • Students will be able to ask personal questions. • Students will be able to state the dates. Reading • Students will be able to understand familiar words and simple sentences about occupations and the dates. Writing Students will be able to produce a piece of writing about occupations and the dates.",
      "materials": "Contexts Advertisements Brochures Cartoons Conversations Illustrations Magazines Postcards Posters Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Matching Labeling Questions and Answers Reordering Storytelling True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • Students find out the occupations of their family members and write what they do."
     }
    },
    {
     "ay": "ŞUBAT",
     "hafta": "21.HAFTA(16-22)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Talking about past occupations Asking personal questions Telling the time, days and dates",
      "tema": "Unit 6: Occupations",
      "languageTasks": "Listening • Students will be able to understand familiar words and simple phrases concerning people’s occupations in clear oral texts. • Students will be able to understand the time, days and dates. Spoken Interaction • Students will be able to talk about occupations. Spoken Production • Students will be able to ask personal questions. • Students will be able to state the dates. Reading • Students will be able to understand familiar words and simple sentences about occupations and the dates. Writing Students will be able to produce a piece of writing about occupations and the dates.",
      "materials": "Contexts Advertisements Brochures Cartoons Conversations Illustrations Magazines Postcards Posters Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Matching Labeling Questions and Answers Reordering Storytelling True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items. • Students find out the occupations of their family members and write what they do."
     }
    },
    {
     "ay": "ŞUBAT-MART",
     "hafta": "22.HAFTA(23-01)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Talking about past events (Making simple inquiries)",
      "tema": "Unit 7: Holidays",
      "languageTasks": "Listening • Students will be able to spot the activities about holidays in oral texts. Spoken Interaction • Students will be able to talk about their holidays. Spoken Production • Students will be able to describe past activities and personal experiences. Reading • Students will be able to understand short, simple sentences and expressions related to past activities. Writing • Students will be able to write short and simple pieces in various forms about holidays.",
      "materials": "Contexts Advertisements Brochures Cartoons Conversations Illustrations Maps Magazines Postcards Posters Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Making Puppets Matching Labeling Questions and Answers Reordering Storytelling True/False/No information Assignments • Students prepare a postcard and write about what they did on their holiday. • Students prepare a pamphlet showing different places for different holiday activities in their country."
     }
    },
    {
     "ay": "MART",
     "hafta": "23.HAFTA(02-08)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Talking about past events (Making simple inquiries)",
      "tema": "Unit 7: Holidays",
      "languageTasks": "Listening • Students will be able to spot the activities about holidays in oral texts. Spoken Interaction • Students will be able to talk about their holidays. Spoken Production • Students will be able to describe past activities and personal experiences. Reading • Students will be able to understand short, simple sentences and expressions related to past activities. Writing • Students will be able to write short and simple pieces in various forms about holidays.",
      "materials": "Contexts Advertisements Brochures Cartoons Conversations Illustrations Maps Magazines Postcards Posters Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Making Puppets Matching Labeling Questions and Answers Reordering Storytelling True/False/No information Assignments • Students prepare a postcard and write about what they did on their holiday. • Students prepare a pamphlet showing different places for different holiday activities in their country."
     }
    },
    {
     "ay": "MART",
     "hafta": "24.HAFTA(09-15)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Talking about past events (Making simple inquiries)",
      "tema": "Unit 7: Holidays",
      "languageTasks": "Listening • Students will be able to spot the activities about holidays in oral texts. Spoken Interaction • Students will be able to talk about their holidays. Spoken Production • Students will be able to describe past activities and personal experiences. Reading • Students will be able to understand short, simple sentences and expressions related to past activities. Writing • Students will be able to write short and simple pieces in various forms about holidays.",
      "materials": "Contexts Advertisements Brochures Cartoons Conversations Illustrations Maps Magazines Postcards Posters Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Making Puppets Matching Labeling Questions and Answers Reordering Storytelling True/False/No information Assignments • Students prepare a postcard and write about what they did on their holiday. • Students prepare a pamphlet showing different places for different holiday activities in their country."
     }
    },
    {
     "ay": "MART",
     "hafta": "25.HAFTA(23-29)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Talking about locations of things and people Talking about past events",
      "tema": "Unit 8: Bookworms",
      "languageTasks": "Listening • Students will be able to listen to the instructions and locate things. • Students will be able to understand past events in oral texts. Spoken Interaction • Students will be able to talk about the locations of people and things. • Students will be able to talk about past events with definite time. Spoken Production • Students will be able to describe the locations of people and things. • Students will be able to describe past events with definite time. Reading • Students will be able to understand short, simple sentences and expressions about past events with definite time. Writing • Students will be able to write about past events with definite time. • Students will be able to write about the locations of people and things.",
      "materials": "Contexts Brochures Captions Cartoons Conversations Illustrations Magazines Probes/Realia Podcasts Posters Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Matching Labeling Questions and Answers Reordering Storytelling True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items.",
      "degerlendirme": "SINAV HAFTASI"
     }
    },
    {
     "ay": "MART-NİSAN",
     "hafta": "26.HAFTA(30-05)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Talking about locations of things and people Talking about past events",
      "tema": "Unit 8: Bookworms",
      "languageTasks": "Listening • Students will be able to listen to the instructions and locate things. • Students will be able to understand past events in oral texts. Spoken Interaction • Students will be able to talk about the locations of people and things. • Students will be able to talk about past events with definite time. Spoken Production • Students will be able to describe the locations of people and things. • Students will be able to describe past events with definite time. Reading • Students will be able to understand short, simple sentences and expressions about past events with definite time. Writing • Students will be able to write about past events with definite time. • Students will be able to write about the locations of people and things.",
      "materials": "Contexts Brochures Captions Cartoons Conversations Illustrations Magazines Probes/Realia Podcasts Posters Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Matching Labeling Questions and Answers Reordering Storytelling True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items."
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "27.HAFTA(06-12)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Talking about locations of things and people Talking about past events",
      "tema": "Unit 8: Bookworms",
      "languageTasks": "Listening • Students will be able to listen to the instructions and locate things. • Students will be able to understand past events in oral texts. Spoken Interaction • Students will be able to talk about the locations of people and things. • Students will be able to talk about past events with definite time. Spoken Production • Students will be able to describe the locations of people and things. • Students will be able to describe past events with definite time. Reading • Students will be able to understand short, simple sentences and expressions about past events with definite time. Writing • Students will be able to write about past events with definite time. • Students will be able to write about the locations of people and things.",
      "materials": "Contexts Brochures Captions Cartoons Conversations Illustrations Magazines Probes/Realia Podcasts Posters Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Matching Labeling Questions and Answers Reordering Storytelling True/False/No information Assignments • Students keep expanding their visual dictionary by including new vocabulary items."
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "28.HAFTA(13-19)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Giving & responding to simple instructions",
      "tema": "Unit 9: Saving The Planet",
      "languageTasks": "Listening • Students will be able to recognize appropriate attitudes to save energy and to protect the environment. • Students will be able to understand suggestions related to the protection of the environment in simple oral texts. Spoken Interaction • Students will be able to give each other suggestions about the protection of the environment. Spoken Production • Students will be able to talk to people about the protection of the environment. Reading • Students will be able to understand the texts about the protection of the environment. • Students will be able to follow short, simple written instructions. Writing Students will be able to write simple pieces about the protection of the environment.",
      "materials": "Contexts Advertisements Blogs Brochures Captions Cartoons Conversations Illustrations Magazines Notes and Messages Podcasts Posters Signs Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answer Reordering Storytelling True/False/No information Assignments • Students prepare slogans/notes/posters about saving energy at school and hang them on the walls."
     }
    },
    {
     "ay": "NİSAN",
     "hafta": "29.HAFTA(20-26)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Giving & responding to simple instructions",
      "tema": "Unit 9: Saving The Planet",
      "languageTasks": "Listening • Students will be able to recognize appropriate attitudes to save energy and to protect the environment. • Students will be able to understand suggestions related to the protection of the environment in simple oral texts. Spoken Interaction • Students will be able to give each other suggestions about the protection of the environment. Spoken Production • Students will be able to talk to people about the protection of the environment. Reading • Students will be able to understand the texts about the protection of the environment. • Students will be able to follow short, simple written instructions. Writing Students will be able to write simple pieces about the protection of the environment.",
      "materials": "Contexts Advertisements Blogs Brochures Captions Cartoons Conversations Illustrations Magazines Notes and Messages Podcasts Posters Signs Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answer Reordering Storytelling True/False/No information Assignments • Students prepare slogans/notes/posters about saving energy at school and hang them on the walls.",
      "degerlendirme": "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı"
     }
    },
    {
     "ay": "NİSAN-MAYIS",
     "hafta": "30.HAFTA(27-03)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Giving & responding to simple instructions",
      "tema": "Unit 9: Saving The Planet",
      "languageTasks": "Listening • Students will be able to recognize appropriate attitudes to save energy and to protect the environment. • Students will be able to understand suggestions related to the protection of the environment in simple oral texts. Spoken Interaction • Students will be able to give each other suggestions about the protection of the environment. Spoken Production • Students will be able to talk to people about the protection of the environment. Reading • Students will be able to understand the texts about the protection of the environment. • Students will be able to follow short, simple written instructions. Writing Students will be able to write simple pieces about the protection of the environment.",
      "materials": "Contexts Advertisements Blogs Brochures Captions Cartoons Conversations Illustrations Magazines Notes and Messages Podcasts Posters Signs Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answer Reordering Storytelling True/False/No information Assignments • Students prepare slogans/notes/posters about saving energy at school and hang them on the walls.",
      "degerlendirme": "1 Mayıs İşçi Bayramı"
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "31.HAFTA(04-10)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Giving & responding to simple instructions",
      "tema": "Unit 9: Saving The Planet",
      "languageTasks": "Listening • Students will be able to recognize appropriate attitudes to save energy and to protect the environment. • Students will be able to understand suggestions related to the protection of the environment in simple oral texts. Spoken Interaction • Students will be able to give each other suggestions about the protection of the environment. Spoken Production • Students will be able to talk to people about the protection of the environment. Reading • Students will be able to understand the texts about the protection of the environment. • Students will be able to follow short, simple written instructions. Writing Students will be able to write simple pieces about the protection of the environment.",
      "materials": "Contexts Advertisements Blogs Brochures Captions Cartoons Conversations Illustrations Magazines Notes and Messages Podcasts Posters Signs Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answer Reordering Storytelling True/False/No information Assignments • Students prepare slogans/notes/posters about saving energy at school and hang them on the walls."
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "32.HAFTA(11-17)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Talking about stages of a procedure Making simple inquiries Talking about past events",
      "tema": "Unit 10: Democracy",
      "languageTasks": "Listening • Students will be able to recognize some key features related to the concept of democracy. Spoken Interaction • Students will be able to talk about the stages of classroom president polls. Spoken Production • Students will be able to give short descriptions of past and present events. • Students will be able to talk about the concept of democracy. Reading • Students will be able to recognize familiar words and simple phrases related to the concept of democracy. Writing • Students will be able to write simple pieces about concepts related to democracy.",
      "materials": "Contexts Advertisements Blogs Brochures Captions Cartoons Conversations Illustrations Magazines Notes and Messages Podcasts Postes Signs Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answer Reordering Storytelling True/False/No information Assignments • Students complete and reflect on their visual dictionaries. • Students work in groups and create an election campaign poster for classroom presidency."
     }
    },
    {
     "ay": "MAYIS",
     "hafta": "33.HAFTA(18-24)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Talking about stages of a procedure Making simple inquiries Talking about past events",
      "tema": "Unit 10: Democracy",
      "languageTasks": "Listening • Students will be able to recognize some key features related to the concept of democracy. Spoken Interaction • Students will be able to talk about the stages of classroom president polls. Spoken Production • Students will be able to give short descriptions of past and present events. • Students will be able to talk about the concept of democracy. Reading • Students will be able to recognize familiar words and simple phrases related to the concept of democracy. Writing • Students will be able to write simple pieces about concepts related to democracy.",
      "materials": "Contexts Advertisements Blogs Brochures Captions Cartoons Conversations Illustrations Magazines Notes and Messages Podcasts Postes Signs Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answer Reordering Storytelling True/False/No information Assignments • Students complete and reflect on their visual dictionaries. • Students work in groups and create an election campaign poster for classroom presidency.",
      "degerlendirme": "19 Mayıs Atatürk’ü Anma Gençlik ve Spor Bayramı"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "34.HAFTA(01-07)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Talking about stages of a procedure Making simple inquiries Talking about past events",
      "tema": "Unit 10: Democracy",
      "languageTasks": "Listening • Students will be able to recognize some key features related to the concept of democracy. Spoken Interaction • Students will be able to talk about the stages of classroom president polls. Spoken Production • Students will be able to give short descriptions of past and present events. • Students will be able to talk about the concept of democracy. Reading • Students will be able to recognize familiar words and simple phrases related to the concept of democracy. Writing • Students will be able to write simple pieces about concepts related to democracy.",
      "materials": "Contexts Advertisements Blogs Brochures Captions Cartoons Conversations Illustrations Magazines Notes and Messages Podcasts Postes Signs Songs Stories Videos Tasks/Activities Drama (Role Play, Simulation, Pantomime) Find Someone Who … Games Information/Opinion Gap Information Transfer Labeling Matching Question and Answer Reordering Storytelling True/False/No information Assignments • Students complete and reflect on their visual dictionaries. • Students work in groups and create an election campaign poster for classroom presidency."
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "35.HAFTA(08-14)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Revision of the past subjects",
      "tema": "Revision of the past subjects",
      "languageTasks": "Revision of the past subjects",
      "materials": "Revision of the past subjects",
      "degerlendirme": "SINAV HAFTASI"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "36.HAFTA(15-21)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Consolidation",
      "tema": "Consolidation",
      "languageTasks": "Consolidation",
      "materials": "Consolidation"
     }
    },
    {
     "ay": "HAZİRAN",
     "hafta": "37.HAFTA(22-28)",
     "saat": "3 SAAT",
     "degerler": {
      "functions": "Consolidation",
      "tema": "Consolidation",
      "languageTasks": "Consolidation",
      "materials": "Consolidation",
      "degerlendirme": "Ders Yılının Sona ermesi"
     }
    }
   ]
  }
 ]
};
