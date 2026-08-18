#!/usr/bin/env python3
"""Refresh generated offline-preloader entries from the current bundle files."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PRELOADER = ROOT / "assets" / "offline-preloader.js"
PREFIX = "var INLINE = "
SUFFIX_MARKER = ";\n  var BASE_DIR"


def main() -> None:
    source = PRELOADER.read_text(encoding="utf-8")
    value_start = source.index(PREFIX) + len(PREFIX)
    value_end = source.index(SUFFIX_MARKER, value_start)
    inline = json.loads(source[value_start:value_end])

    refreshed = []
    removed = []
    for key, old_value in list(inline.items()):
        relative = key[2:] if key.startswith("./") else key
        local_file = ROOT / relative
        if not local_file.is_file():
            del inline[key]
            removed.append(key)
            continue
        if local_file.suffix == ".json":
            inline[key] = json.loads(local_file.read_text(encoding="utf-8"))
        elif isinstance(old_value, str):
            inline[key] = local_file.read_text(encoding="utf-8")
        else:
            continue
        refreshed.append(key)

    encoded = json.dumps(inline, ensure_ascii=False, separators=(",", ":"))
    PRELOADER.write_text(
        source[:value_start] + encoded + source[value_end:],
        encoding="utf-8",
    )
    print(json.dumps({"refreshed": len(refreshed), "removed": len(removed)}, indent=2))


if __name__ == "__main__":
    main()
