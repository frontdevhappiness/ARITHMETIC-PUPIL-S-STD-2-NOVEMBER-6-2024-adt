from pathlib import Path
import json

from PIL import Image, ImageDraw, ImageFont


root = Path(__file__).resolve().parents[1]
report = json.loads((root / ".audit/image-edge-fragment-report.json").read_text())
candidates = report["suspicious"]
columns = 3
cell_width, cell_height = 400, 310
rows = (len(candidates) + columns - 1) // columns
sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), "#d8d8d8")
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default()

for index, candidate in enumerate(candidates):
    filename = candidate["filename"]
    column, row = index % columns, index // columns
    left, top = column * cell_width, row * cell_height
    draw.rectangle((left + 5, top + 5, left + cell_width - 5, top + cell_height - 5), fill="white", outline="#555555")
    image = Image.open(root / "images" / filename).convert("RGBA")
    available = (cell_width - 30, cell_height - 86)
    scale = min(available[0] / image.width, available[1] / image.height, 2.5)
    resized = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
    x = left + (cell_width - resized.width) // 2
    y = top + 10 + (available[1] - resized.height) // 2
    sheet.paste(resized, (x, y), resized if resized.getextrema()[3] != (255, 255) else None)
    draw.text((left + 12, top + cell_height - 64), filename, fill="black", font=font)
    draw.text((left + 12, top + cell_height - 47), ", ".join(candidate["flags"]), fill="#8b0000", font=font)
    draw.text((left + 12, top + cell_height - 30), ", ".join(candidate["pages"]), fill="#444444", font=font)

target = root / ".audit/image-edge-candidates-contact-sheet.png"
sheet.save(target, optimize=True)
print({"candidates": len(candidates), "target": str(target)})
