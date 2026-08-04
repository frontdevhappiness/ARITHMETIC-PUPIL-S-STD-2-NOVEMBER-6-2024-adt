#!/usr/bin/env python3
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "content/pages.json").read_text())
page_entries = [entry for entry in manifest if entry["section_id"].startswith("pg")]

source_to_sections = defaultdict(list)
sections = []

for entry in page_entries:
    href = entry["href"]
    html = (ROOT / href).read_text(errors="replace")
    ids = re.findall(r'data-id=["\'](pg\d{3})_[^"\']+["\']', html)
    counts = Counter(ids)
    prefixes = sorted(counts)
    record = {
        "section_id": entry["section_id"],
        "href": href,
        "manifest_page_number": entry.get("page_number"),
        "content_page_prefixes": prefixes,
        "content_id_counts": dict(sorted(counts.items())),
    }
    sections.append(record)
    for prefix in prefixes:
        source_to_sections[int(prefix[2:])].append({
            "section_id": entry["section_id"],
            "href": href,
            "id_count": counts[prefix],
        })

mapping = []
for page in range(1, 145):
    containers = source_to_sections.get(page, [])
    mapping.append({
        "pdf_page": page,
        "containers": containers,
        "container_count": len(containers),
    })

merged = [section for section in sections if len(section["content_page_prefixes"]) > 1]
split = [row for row in mapping if row["container_count"] > 1]
missing = [row["pdf_page"] for row in mapping if row["container_count"] == 0]

report = {
    "summary": {
        "pdf_pages": 144,
        "adt_content_sections": len(sections),
        "sections_containing_multiple_pdf_page_prefixes": len(merged),
        "pdf_pages_split_across_multiple_sections": len(split),
        "pdf_pages_without_page-prefixed_content_ids": len(missing),
    },
    "missing_pdf_pages": missing,
    "merged_sections": merged,
    "split_pdf_pages": split,
    "mapping": mapping,
}

out = ROOT / ".audit/pdf-adt-mapping.json"
out.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report["summary"], indent=2))
print(f"mapping: {out}")
