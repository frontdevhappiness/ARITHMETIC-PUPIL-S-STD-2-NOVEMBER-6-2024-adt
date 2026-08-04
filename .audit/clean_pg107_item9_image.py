#!/usr/bin/env python3
"""Remove neighbouring PDF text/rules from the extracted item-9 figure."""

import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "pg107_im010_seg009_v1.png"
BACKUP = ROOT / ".audit" / "source-image-backups" / SOURCE.name

BACKUP.parent.mkdir(parents=True, exist_ok=True)
if not BACKUP.exists():
    shutil.copyfile(SOURCE, BACKUP)

# The actual linked-circle figure occupies this box. Everything outside it is
# an adjacent question number, answer rules, page-frame line or crop artefact.
original = Image.open(BACKUP)
original.crop((82, 55, 260, 124)).save(SOURCE, optimize=True)
print({"source": original.size, "cleaned": Image.open(SOURCE).size})
