#!/usr/bin/env python3
"""Remove answer-rule rows accidentally included in pg107 figure crops."""

import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "images"
BACKUPS = ROOT / ".audit" / "source-image-backups"

# The y coordinate is the source PNG's baked-in dashed answer rule. Crop a
# small white margin above it; the actual figure remains untouched.
rule_rows = {
    "pg107_im001.png": 105,
    "pg107_im002.png": 102,
    "pg107_im003.png": 106,
    "pg107_im004.png": 110,
    "pg107_im005.png": 108,
    "pg107_im006.png": 109,
    "pg107_im007.png": 109,
    "pg107_im008.png": 91,
}

BACKUPS.mkdir(parents=True, exist_ok=True)
for filename, rule_y in rule_rows.items():
    source = IMAGES / filename
    backup = BACKUPS / filename
    if not backup.exists():
        shutil.copyfile(source, backup)
    original = Image.open(backup)
    cleaned = original.crop((0, 0, original.width, rule_y - 5))
    cleaned.save(source, optimize=True)
    print(filename, original.size, "->", cleaned.size)
