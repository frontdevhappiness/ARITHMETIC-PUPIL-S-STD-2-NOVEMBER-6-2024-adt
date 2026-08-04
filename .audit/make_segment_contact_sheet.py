from pathlib import Path
import re

from PIL import Image, ImageDraw, ImageFont


root = Path(__file__).resolve().parents[1]
references = set()
for html in root.glob("*.html"):
    text = html.read_text(errors="ignore")
    references.update(re.findall(r'<img\b[^>]*\bsrc=["\']images/([^"\']+_seg[^"\']+)["\']', text, re.I))

assets = sorted(references)
columns = 3
cell_width, cell_height = 360, 260
rows = (len(assets) + columns - 1) // columns
sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), "#d8d8d8")
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default()

for index, filename in enumerate(assets):
    column, row = index % columns, index // columns
    left, top = column * cell_width, row * cell_height
    draw.rectangle((left + 5, top + 5, left + cell_width - 5, top + cell_height - 5), fill="white", outline="#555555", width=1)
    image = Image.open(root / "images" / filename).convert("RGBA")
    available = (cell_width - 30, cell_height - 65)
    scale = min(available[0] / image.width, available[1] / image.height, 3.0)
    resized = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
    x = left + (cell_width - resized.width) // 2
    y = top + 12 + (available[1] - resized.height) // 2
    sheet.paste(resized, (x, y), resized if resized.getextrema()[3] != (255, 255) else None)
    draw.text((left + 12, top + cell_height - 42), filename, fill="black", font=font)
    draw.text((left + 12, top + cell_height - 25), f"{image.width} x {image.height}", fill="#444444", font=font)

target = root / ".audit" / "segment-assets-contact-sheet.png"
sheet.save(target, optimize=True)
print({"assets": len(assets), "target": str(target)})
