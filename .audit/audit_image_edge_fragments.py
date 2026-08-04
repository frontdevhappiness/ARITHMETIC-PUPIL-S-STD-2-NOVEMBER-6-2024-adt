from pathlib import Path
import json
import re
from statistics import median

from PIL import Image


root = Path(__file__).resolve().parents[1]
references = {}
for html in root.glob("*.html"):
    text = html.read_text(errors="ignore")
    for filename in re.findall(r'<img\b[^>]*\bsrc=["\']images/([^"\']+)', text, re.I):
        references.setdefault(filename, set()).add(html.name)


def runs(values: list[bool]) -> list[tuple[int, int]]:
    result = []
    start = None
    for index, active in enumerate(values + [False]):
        if active and start is None:
            start = index
        elif not active and start is not None:
            result.append((start, index - 1))
            start = None
    return result


def inspect(filename: str) -> dict:
    path = root / "images" / filename
    image = Image.open(path).convert("RGBA")
    # Downsample only for analysis; preserve full edge/gap relationships.
    image.thumbnail((500, 500), Image.Resampling.LANCZOS)
    width, height = image.size
    pixels = image.load()
    corners = [pixels[0, 0], pixels[width - 1, 0], pixels[0, height - 1], pixels[width - 1, height - 1]]
    background = tuple(int(median(pixel[channel] for pixel in corners)) for channel in range(3))

    def foreground(pixel) -> bool:
        if pixel[3] < 12:
            return False
        return sum(abs(pixel[channel] - background[channel]) for channel in range(3)) > 65

    column_counts = [sum(foreground(pixels[x, y]) for y in range(height)) for x in range(width)]
    row_counts = [sum(foreground(pixels[x, y]) for x in range(width)) for y in range(height)]
    column_runs = runs([count >= max(2, round(height * 0.012)) for count in column_counts])
    row_runs = runs([count >= max(2, round(width * 0.012)) for count in row_counts])

    flags = []
    if len(column_runs) >= 2:
        first, last = column_runs[0], column_runs[-1]
        if first[0] <= 1 and first[1] - first[0] + 1 <= width * 0.25 and column_runs[1][0] - first[1] >= 5:
            flags.append("small-left-edge-fragment")
        if last[1] >= width - 2 and last[1] - last[0] + 1 <= width * 0.25 and last[0] - column_runs[-2][1] >= 5:
            flags.append("small-right-edge-fragment")
    if len(row_runs) >= 2:
        first, last = row_runs[0], row_runs[-1]
        if first[0] <= 1 and first[1] - first[0] + 1 <= height * 0.25 and row_runs[1][0] - first[1] >= 5:
            flags.append("small-top-edge-fragment")
        if last[1] >= height - 2 and last[1] - last[0] + 1 <= height * 0.25 and last[0] - row_runs[-2][1] >= 5:
            flags.append("small-bottom-edge-fragment")

    return {
        "filename": filename,
        "pages": sorted(references[filename]),
        "size": [width, height],
        "flags": flags,
        "column_runs": column_runs,
        "row_runs": row_runs,
    }


results = [inspect(filename) for filename in sorted(references) if (root / "images" / filename).is_file()]
suspicious = [result for result in results if result["flags"]]
report = {"referenced_assets": len(results), "suspicious": suspicious}
(root / ".audit/image-edge-fragment-report.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({"referenced_assets": len(results), "suspicious_count": len(suspicious), "suspicious": suspicious}, indent=2))
