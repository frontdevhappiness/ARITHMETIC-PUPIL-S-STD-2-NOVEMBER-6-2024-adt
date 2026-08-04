from pathlib import Path

from PIL import Image


root = Path(__file__).resolve().parents[1]
source = root / "images/pg120_im003_seg002_v1.png"
target = root / "images/pg120_im003_seg002_v2.png"

image = Image.open(source).convert("RGBA")
pixels = image.load()
width, height = image.size

# The extraction crop contains an unrelated football slice in columns 0–14,
# followed by clean white separation through column 31. Repaint only the area
# before that separator so the flask artwork (starting at column 32) is kept
# byte-for-byte.
separator_end = 31
for y in range(height):
    for x in range(separator_end):
        pixels[x, y] = (255, 255, 255, 255)

target.parent.mkdir(parents=True, exist_ok=True)
image.save(target, optimize=True)
print({"source": source.name, "target": target.name, "cleared_columns": separator_end})
