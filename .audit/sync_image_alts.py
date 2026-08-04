#!/usr/bin/env python3
"""Synchronize inline image alt fallbacks with localized ADT descriptions."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEXTS = json.loads(
    (ROOT / "content" / "i18n" / "en-GB" / "texts.json").read_text(encoding="utf-8")
)
IMG_RE = re.compile(r"<img\b[^>]*>", re.IGNORECASE | re.DOTALL)
DATA_ID_RE = re.compile(r'\bdata-id="([^"]+)"')
ALT_RE = re.compile(r'\balt="[^"]*"')


def sync_tag(match: re.Match[str]) -> str:
    tag = match.group(0)
    data_id_match = DATA_ID_RE.search(tag)
    if not data_id_match or not ALT_RE.search(tag):
        return tag
    description = TEXTS.get(data_id_match.group(1), "").strip()
    if not description:
        return tag
    replacement = f'alt="{html.escape(description, quote=True)}"'
    return ALT_RE.sub(replacement, tag, count=1)


def main() -> None:
    changed_files = 0
    changed_tags = 0
    for path in sorted(ROOT.glob("*.html")):
        original = path.read_text(encoding="utf-8")
        updated, count = IMG_RE.subn(sync_tag, original)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed_files += 1
            changed_tags += count
    print(json.dumps({"changed_files": changed_files, "processed_image_tags": changed_tags}))


if __name__ == "__main__":
    main()
