#!/usr/bin/env python3
"""Read-only structural audit for this ADT bundle."""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / "content" / "i18n" / "en-GB"


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title_id = None
        self.page_section_id = None
        self.data_ids: list[str] = []
        self.images: list[dict[str, str]] = []
        self.headings: list[int] = []
        self.tables: list[dict[str, int | bool]] = []
        self._current_table = None
        self.landmarks: list[str] = []
        self.nested_asides = 0

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = {key: value or "" for key, value in attrs_list}
        if tag == "meta" and attrs.get("name") == "title-id":
            self.title_id = attrs.get("content")
        if tag == "meta" and attrs.get("name") == "page-section-id":
            self.page_section_id = attrs.get("content")
        if attrs.get("data-id"):
            self.data_ids.append(attrs["data-id"])
        if tag == "img":
            self.images.append(attrs)
        if re.fullmatch(r"h[1-6]", tag):
            self.headings.append(int(tag[1]))
        if tag in {"main", "nav", "aside"} or attrs.get("role") in {
            "main", "navigation", "complementary", "banner", "contentinfo"
        }:
            if tag == "aside" and self.landmarks:
                self.nested_asides += 1
            self.landmarks.append(tag)
        if tag == "table":
            self._current_table = {
                "td": 0,
                "th": 0,
                "presentation": attrs.get("role") in {"presentation", "none"},
            }
            self.tables.append(self._current_table)
        elif self._current_table and tag in {"td", "th"}:
            self._current_table[tag] += 1

    def handle_endtag(self, tag: str) -> None:
        if tag == "table":
            self._current_table = None
        if self.landmarks and tag == self.landmarks[-1]:
            self.landmarks.pop()


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    pages = load_json(ROOT / "content" / "pages.json")
    texts = load_json(I18N / "texts.json")
    audios = load_json(I18N / "audios.json")
    html_files = sorted(ROOT.glob("*.html"))
    parsed = {}

    for path in html_files:
        parser = PageParser()
        parser.feed(path.read_text(encoding="utf-8"))
        parsed[path.name] = parser

    missing_hrefs = []
    title_mismatches = []
    index_mismatches = []
    for index, entry in enumerate(pages, start=1):
        href = entry["href"]
        path = ROOT / href
        if not path.exists():
            missing_hrefs.append(href)
            continue
        parser = parsed[href]
        if parser.title_id != entry["section_id"]:
            title_mismatches.append({
                "href": href,
                "manifest": entry["section_id"],
                "html": parser.title_id,
            })
        if parser.page_section_id != str(index):
            index_mismatches.append({
                "href": href,
                "expected": index,
                "html": parser.page_section_id,
            })

    occurrences: dict[str, list[str]] = defaultdict(list)
    missing_text_ids = []
    missing_image_files = []
    image_description_issues = []
    visible_images_missing_alt = []
    visible_image_audio_issues = []
    image_alt_text_mismatches = []
    heading_skips = []
    table_risks = []
    nested_asides = []

    for filename, parser in parsed.items():
        for data_id in parser.data_ids:
            occurrences[data_id].append(filename)
            if data_id not in texts:
                missing_text_ids.append({"href": filename, "data_id": data_id})
        for image in parser.images:
            src = image.get("src", "")
            data_id = image.get("data-id", "")
            is_hidden = image.get("aria-hidden") == "true" or "hidden" in image.get("class", "").split()
            if src and not (ROOT / src).exists():
                missing_image_files.append({"href": filename, "src": src})
            if not is_hidden and "alt" not in image:
                visible_images_missing_alt.append({"href": filename, "src": src, "reason": "missing"})
            if not is_hidden and data_id and not image.get("alt", "").strip():
                visible_images_missing_alt.append({"href": filename, "src": src, "reason": "empty"})
            if not is_hidden and data_id and (data_id not in texts or not texts.get(data_id, "").strip()):
                image_description_issues.append({"href": filename, "data_id": data_id})
            if not is_hidden and data_id in texts and data_id not in audios:
                visible_image_audio_issues.append({"href": filename, "data_id": data_id})
            if not is_hidden and data_id in texts and image.get("alt", "").strip():
                html_alt = " ".join(image["alt"].split())
                localized_alt = " ".join(texts[data_id].split())
                if html_alt != localized_alt:
                    image_alt_text_mismatches.append({
                        "href": filename,
                        "data_id": data_id,
                        "html_alt": html_alt,
                        "localized_text": localized_alt,
                    })
        for previous, current in zip(parser.headings, parser.headings[1:]):
            if current > previous + 1:
                heading_skips.append({"href": filename, "from": previous, "to": current})
        for number, table in enumerate(parser.tables, start=1):
            if table["td"] and not table["th"] and not table["presentation"]:
                table_risks.append({"href": filename, "table": number, **table})
        if parser.nested_asides:
            nested_asides.append({"href": filename, "count": parser.nested_asides})

    duplicate_ids = {
        data_id: files for data_id, files in occurrences.items() if len(files) > 1
    }
    missing_audio_mappings = sorted(
        data_id for data_id in texts if data_id not in audios
    )
    missing_audio_files = [
        {"data_id": data_id, "filename": filename}
        for data_id, filename in audios.items()
        if not (I18N / "audio" / filename).exists()
    ]
    orphan_audio_mappings = sorted(
        data_id for data_id in audios if data_id not in texts
    )

    report = {
        "summary": {
            "manifest_entries": len(pages),
            "html_files": len(html_files),
            "text_entries": len(texts),
            "audio_mappings": len(audios),
            "image_elements": sum(len(page.images) for page in parsed.values()),
            "tables": sum(len(page.tables) for page in parsed.values()),
        },
        "navigation": {
            "missing_hrefs": missing_hrefs,
            "title_mismatches": title_mismatches,
            "page_section_id_mismatches": index_mismatches,
        },
        "content": {
            "missing_text_ids": missing_text_ids,
            "duplicate_data_ids": duplicate_ids,
            "missing_image_files": missing_image_files,
            "image_description_issues": image_description_issues,
            "visible_images_missing_alt": visible_images_missing_alt,
            "visible_image_audio_issues": visible_image_audio_issues,
            "image_alt_text_mismatches": image_alt_text_mismatches,
        },
        "audio": {
            "missing_mappings": missing_audio_mappings,
            "missing_files": missing_audio_files,
            "orphan_mappings": orphan_audio_mappings,
        },
        "accessibility": {
            "heading_skips": heading_skips,
            "tables_without_headers_or_presentation_role": table_risks,
            "nested_asides": nested_asides,
        },
    }

    output = ROOT / ".audit" / "structural-report.json"
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    counts = {
        "missing_hrefs": len(missing_hrefs),
        "title_mismatches": len(title_mismatches),
        "page_section_id_mismatches": len(index_mismatches),
        "missing_text_ids": len(missing_text_ids),
        "duplicate_data_ids": len(duplicate_ids),
        "missing_image_files": len(missing_image_files),
        "image_description_issues": len(image_description_issues),
        "visible_images_missing_alt": len(visible_images_missing_alt),
        "visible_image_audio_issues": len(visible_image_audio_issues),
        "image_alt_text_mismatches": len(image_alt_text_mismatches),
        "missing_audio_mappings": len(missing_audio_mappings),
        "missing_audio_files": len(missing_audio_files),
        "heading_skips": len(heading_skips),
        "table_risks": len(table_risks),
        "nested_asides": len(nested_asides),
    }
    print(json.dumps(counts, indent=2))


if __name__ == "__main__":
    main()
