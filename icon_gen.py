from PIL import Image
import os, urllib.request

url = "https://sedonet23.github.io/okul/assets/icon-512.png"
urllib.request.urlretrieve(url, "/tmp/logo.png")
img = Image.open("/tmp/logo.png").convert("RGBA")

boyutlar = {
    "android/app/src/main/res/mipmap-mdpi": 48,
    "android/app/src/main/res/mipmap-hdpi": 72,
    "android/app/src/main/res/mipmap-xhdpi": 96,
    "android/app/src/main/res/mipmap-xxhdpi": 144,
    "android/app/src/main/res/mipmap-xxxhdpi": 192,
}

for klasor, boyut in boyutlar.items():
    os.makedirs(klasor, exist_ok=True)
    r = img.resize((boyut, boyut), Image.LANCZOS)
    r.save(f"{klasor}/ic_launcher.png")
    r.save(f"{klasor}/ic_launcher_round.png")
    print(f"{boyut}x{boyut} OK")

print("Ikonlar hazir!")
