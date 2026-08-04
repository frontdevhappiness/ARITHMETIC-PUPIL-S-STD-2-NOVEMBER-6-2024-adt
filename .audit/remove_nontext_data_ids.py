#!/usr/bin/env python3
"""Remove data-id attributes mistakenly attached to non-text decoration."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPORT = json.loads((ROOT / ".audit" / "structural-report.json").read_text(encoding="utf-8"))


def main() -> None:
    removed = []
    by_file: dict[str, list[str]] = {}
    for issue in REPORT["content"]["missing_text_ids"]:
        data_id = issue["data_id"]
        # Quiz section IDs identify the activity itself; they are not text IDs.
        if re.fullmatch(r"qz\d+", data_id):
            continue
        by_file.setdefault(issue["href"], []).append(data_id)

    for filename, data_ids in by_file.items():
        path = ROOT / filename
        original = path.read_text(encoding="utf-8")
        updated = original
        for data_id in data_ids:
            needle = f' data-id="{data_id}"'
            if needle in updated:
                updated = updated.replace(needle, "")
                removed.append({"href": filename, "data_id": data_id})
        if updated != original:
            path.write_text(updated, encoding="utf-8")

    print(json.dumps({"removed": len(removed), "items": removed}, indent=2))


if __name__ == "__main__":
    main()
