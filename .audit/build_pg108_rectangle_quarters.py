#!/usr/bin/env python3
"""Crop the four quarters from the original pg108 rectangle source asset."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "images"
source = Image.open(IMAGES / "pg108_im012.png")

# Boundaries follow the source image's own outer and internal black rules.
crops = {
    "pg108_rect_q1.png": (0, 2, 75, 37),
    "pg108_rect_q2.png": (0, 35, 75, 70),
    "pg108_rect_q3.png": (73, 35, 148, 70),
    "pg108_rect_q4.png": (73, 2, 148, 37),
}

for filename, box in crops.items():
    source.crop(box).save(IMAGES / filename, optimize=True)
    print(filename, box)
