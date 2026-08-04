from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/home/echad/Documents/ARITHMETIC-PUPIL-S-STD-2-NOVEMBER-6-2024-adt")
RENDERED = ROOT / ".audit" / "rendered-pages"
SOURCE = ROOT / ".audit" / "source-pages"
OUTPUT = ROOT / ".audit" / "contact-sheets"
OUTPUT.mkdir(parents=True, exist_ok=True)

CELL_WIDTH = 330
CELL_HEIGHT = 410
LABEL_HEIGHT = 28
PAIR_WIDTH = CELL_WIDTH * 2 + 18
ROWS_PER_SHEET = 4

font = ImageFont.load_default(size=18)
small_font = ImageFont.load_default(size=15)


def contain(image: Image.Image, width: int, height: int) -> Image.Image:
    copy = image.convert("RGB")
    copy.thumbnail((width, height), Image.Resampling.LANCZOS)
    return copy


def page_render(page_number: int) -> Image.Image | None:
    parts = sorted(RENDERED.glob(f"pg{page_number:03d}_sec*.jpg"))
    if not parts:
        return None
    opened = [Image.open(part).convert("RGB") for part in parts]
    if len(opened) == 1:
        return opened[0]
    width = max(image.width for image in opened)
    total_height = sum(image.height for image in opened) + 12 * (len(opened) - 1)
    combined = Image.new("RGB", (width, total_height), "#e5e7eb")
    y = 0
    for image in opened:
        combined.paste(image, ((width - image.width) // 2, y))
        y += image.height + 12
    return combined


for sheet_start in range(1, 145, ROWS_PER_SHEET):
    sheet = Image.new("RGB", (PAIR_WIDTH, ROWS_PER_SHEET * (CELL_HEIGHT + LABEL_HEIGHT + 14) + 42), "white")
    draw = ImageDraw.Draw(sheet)
    draw.text((12, 10), f"Original PDF (left) and rendered ADT (right): pages {sheet_start:03d}–{min(sheet_start + ROWS_PER_SHEET - 1, 144):03d}", fill="black", font=font)
    for row, page_number in enumerate(range(sheet_start, min(sheet_start + ROWS_PER_SHEET, 145))):
        y = 42 + row * (CELL_HEIGHT + LABEL_HEIGHT + 14)
        draw.text((8, y), f"PDF {page_number:03d}", fill="#111827", font=small_font)
        draw.text((CELL_WIDTH + 26, y), f"ADT pg{page_number:03d}", fill="#111827", font=small_font)

        source_path = SOURCE / f"page-{page_number:03d}.jpg"
        if source_path.exists():
            source = contain(Image.open(source_path), CELL_WIDTH, CELL_HEIGHT)
            sheet.paste(source, ((CELL_WIDTH - source.width) // 2, y + LABEL_HEIGHT))

        rendered = page_render(page_number)
        if rendered is not None:
            thumb = contain(rendered, CELL_WIDTH, CELL_HEIGHT)
            sheet.paste(thumb, (CELL_WIDTH + 18 + (CELL_WIDTH - thumb.width) // 2, y + LABEL_HEIGHT))

        draw.line((0, y + LABEL_HEIGHT + CELL_HEIGHT + 7, PAIR_WIDTH, y + LABEL_HEIGHT + CELL_HEIGHT + 7), fill="#d1d5db", width=1)

    sheet.save(OUTPUT / f"pages-{sheet_start:03d}-{min(sheet_start + ROWS_PER_SHEET - 1, 144):03d}.jpg", quality=88)

print(f"Created {len(list(OUTPUT.glob('*.jpg')))} contact sheets")
