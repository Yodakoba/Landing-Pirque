# Dibuja los puntos numerados sobre cada foto, para revisarlas a ojo:
#   python3 pruebas/ejemplo/marcar.py <carpeta de salida>
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'ayuda') + '/'
O = sys.argv[1]
os.makedirs(O, exist_ok=True)
P = json.load(open(D + 'puntos.json'))
try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
except Exception: f = ImageFont.load_default()
for k, v in P.items():
    im = Image.open(D + k + '.jpg').convert('RGB'); d = ImageDraw.Draw(im); W, H = im.size
    for i, p in enumerate(v['puntos']):
        x, y = p['x'] / 100 * W, p['y'] / 100 * H
        d.ellipse([x - 22, y - 22, x + 22, y + 22], fill=(200, 30, 30), outline='white', width=3)
        d.text((x - 8, y - 15), str(i + 1), fill='white', font=f)
    im.save(O + '/' + k + '.png')
print(len(P))
