import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt")
CAPTURES = ROOT / ".audit" / "reader-130-186"
SOURCES = ROOT / ".audit" / "source-pages"
OUTPUT = CAPTURES / "contact-sheets"
OUTPUT.mkdir(parents=True, exist_ok=True)

report = json.loads((CAPTURES / "report.json").read_text())
font = ImageFont.load_default(size=18)
small = ImageFont.load_default(size=15)

CELL_W = 380
CELL_H = 500
GAP = 20
HEADER = 34
ROWS = 4


def contain(image: Image.Image, width: int, height: int) -> Image.Image:
    copy = image.convert("RGB")
    copy.thumbnail((width, height), Image.Resampling.LANCZOS)
    return copy


for batch_start in range(0, len(report), ROWS):
    batch = report[batch_start : batch_start + ROWS]
    sheet = Image.new(
        "RGB",
        (CELL_W * 2 + GAP, 42 + len(batch) * (HEADER + CELL_H + 12)),
        "white",
    )
    draw = ImageDraw.Draw(sheet)
    first = batch[0]["readerPage"]
    last = batch[-1]["readerPage"]
    draw.text((10, 10), f"PDF source (left) / ADT reader pages {first}-{last} (right)", fill="black", font=font)

    for row, item in enumerate(batch):
        top = 42 + row * (HEADER + CELL_H + 12)
        section_id = item["section_id"]
        physical = int(section_id[2:5]) if section_id.startswith("pg") else None
        left_label = f"PDF {physical:03d}" if physical else "No direct PDF page"
        right_label = f"Reader {item['readerPage']}: {section_id}"
        draw.text((8, top), left_label, fill="#111827", font=small)
        draw.text((CELL_W + GAP + 8, top), right_label, fill="#111827", font=small)

        if physical:
            source_path = SOURCES / f"page-{physical:03d}.jpg"
            if source_path.exists():
                source = contain(Image.open(source_path), CELL_W, CELL_H)
                sheet.paste(source, ((CELL_W - source.width) // 2, top + HEADER))

        capture_path = CAPTURES / item.get("capture", "")
        if capture_path.exists():
            capture = contain(Image.open(capture_path), CELL_W, CELL_H)
            x = CELL_W + GAP + (CELL_W - capture.width) // 2
            sheet.paste(capture, (x, top + HEADER))

        line_y = top + HEADER + CELL_H + 6
        draw.line((0, line_y, CELL_W * 2 + GAP, line_y), fill="#d1d5db", width=1)

    sheet.save(OUTPUT / f"reader-{first:03d}-{last:03d}.jpg", quality=90)

print(f"Created {len(list(OUTPUT.glob('*.jpg')))} reader-range contact sheets")
