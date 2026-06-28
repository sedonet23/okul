{
  "name": "okul-bildirim-servis",
  "version": "1.0.0",
  "main": "check-and-notify.js",
  "scripts": {
    "start": "node check-and-notify.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "firebase-admin": "^12.0.0"
  },
  "engines": {
    "node": ">=18"
  }
}        yanit.responses.forEach((r, i)=>{
          if(!r.success){
            const kod = r.error && r.error.code;
            if(kod === 'messaging/registration-token-not-registered' || kod === 'messaging/invalid-registration-token'){
              gecersizTokenler.add(tokens[i]);
            }
            console.warn('Gönderim hatası:', kod);
          }
        });
        console.log(`Gönderildi: "${item.baslik}" (${yanit.successCount}/${tokens.length} cihaza ulaştı)`);
      }catch(err){
        console.error('Gönderim sırasında hata:', err.message);
      }
    }
    // Aynı bildirimi tekrar tekrar göndermemek için işaretle.
    await db.collection(item.koleksiyon).doc(item.docId).update({ bildirimGonderildi: true });
  }

  for(const t of gecersizTokenler){
    const eslesen = tokenDocs.find(td=>td.token===t);
    if(eslesen) await db.collection('oy_cihazTokenleri').doc(eslesen.id).delete();
  }

  console.log(`Toplam ${gonderilecekler.length} bildirim işlendi.`);
}

main().catch(err=>{
  console.error('Beklenmeyen hata:', err);
  process.exit(1);
});
