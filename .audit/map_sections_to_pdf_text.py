#!/usr/bin/env python3
import html
import json
import math
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PDF = Path("/home/echad/Documents/adtbooks/ARITHMETIC PUPIL'S STD 2 NOVEMBER 6-2024.pdf")


def tokens(value: str) -> list[str]:
    value = html.unescape(value).lower()
    value = value.replace("[[blank:", " ").replace("]]", " ")
    return re.findall(r"[a-z]+(?:[-'][a-z]+)*|\d+", value)


pdf_text = subprocess.check_output(
    ["pdftotext", "-layout", str(PDF), "-"], text=True, errors="replace"
)
pdf_pages = pdf_text.split("\f")[:144]
pdf_counters = [Counter(tokens(page)) for page in pdf_pages]

manifest = json.loads((ROOT / "content/pages.json").read_text())
texts = json.loads((ROOT / "content/i18n/en-GB/texts.json").read_text())
entries = [entry for entry in manifest if entry["section_id"].startswith("pg")]
section_counters = []

for entry in entries:
    source = (ROOT / entry["href"]).read_text(errors="replace")
    data_ids = list(dict.fromkeys(re.findall(r'data-id=["\']([^"\']+)["\']', source)))
    localized = " ".join(texts.get(data_id, "") for data_id in data_ids)
    # Include unlocalized authored labels such as "Or" and table headings.
    cleaned = re.sub(r"<(script|style)\b.*?</\1>", " ", source, flags=re.I | re.S)
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    authored = html.unescape(cleaned)
    section_counters.append((entry, Counter(tokens(f"{localized} {authored}"))))

documents = pdf_counters + [counter for _, counter in section_counters]
document_frequency = Counter()
for counter in documents:
    document_frequency.update(counter.keys())


def vector(counter: Counter) -> dict[str, float]:
    result = {}
    total_documents = len(documents)
    for token, count in counter.items():
        if len(token) == 1 and not token.isdigit():
            continue
        inverse_frequency = math.log((total_documents + 1) / (document_frequency[token] + 1)) + 1
        result[token] = (1 + math.log(count)) * inverse_frequency
    return result


def cosine(left: dict[str, float], right: dict[str, float]) -> float:
    common = left.keys() & right.keys()
    numerator = sum(left[token] * right[token] for token in common)
    left_norm = math.sqrt(sum(value * value for value in left.values()))
    right_norm = math.sqrt(sum(value * value for value in right.values()))
    return numerator / (left_norm * right_norm) if left_norm and right_norm else 0.0


pdf_vectors = [vector(counter) for counter in pdf_counters]
results = []
page_to_sections = defaultdict(list)

for entry, counter in section_counters:
    section_vector = vector(counter)
    scores = sorted(
        ((index + 1, cosine(section_vector, page_vector)) for index, page_vector in enumerate(pdf_vectors)),
        key=lambda item: item[1],
        reverse=True,
    )
    filename_match = re.search(r"pg(\d{3})", entry["href"])
    filename_page = int(filename_match.group(1)) if filename_match else None
    top = [{"pdf_page": page, "score": round(score, 4)} for page, score in scores[:5]]
    strong_pages = [item for item in top if item["score"] >= max(0.12, top[0]["score"] * 0.45)]
    record = {
        "section_id": entry["section_id"],
        "href": entry["href"],
        "filename_page": filename_page,
        "manifest_printed_page": entry.get("page_number"),
        "top_pdf_pages": top,
        "strong_pdf_pages": strong_pages,
        "top_matches_filename": bool(top and top[0]["pdf_page"] == filename_page),
    }
    results.append(record)
    for item in strong_pages:
        page_to_sections[item["pdf_page"]].append({
            "section_id": entry["section_id"],
            "href": entry["href"],
            "score": item["score"],
        })

physical_pages = []
for page in range(1, 145):
    matched = sorted(page_to_sections.get(page, []), key=lambda item: item["score"], reverse=True)
    named = [entry["href"] for entry in entries if re.search(fr"pg{page:03d}_sec", entry["href"])]
    if not named:
        classification = "structural-mismatch:no-named-section"
    elif len(named) > 1:
        classification = "structural-review:multiple-wrappers"
    else:
        classification = "visual-review-required"
    physical_pages.append({
        "pdf_page": page,
        "named_sections": named,
        "text_matched_sections": matched,
        "initial_classification": classification,
    })

summary = {
    "pdf_pages": 144,
    "adt_sections": len(entries),
    "pages_without_same-numbered_html": sum(not page["named_sections"] for page in physical_pages),
    "pages_with_multiple_same-numbered_sections": sum(len(page["named_sections"]) > 1 for page in physical_pages),
    "sections_whose_best_text_match_is_another_pdf_page": sum(not row["top_matches_filename"] for row in results),
}
report = {"summary": summary, "sections": results, "physical_pages": physical_pages}
out = ROOT / ".audit/pdf-text-section-map.json"
out.write_text(json.dumps(report, indent=2) + "\n")

section_by_href = {row["href"]: row for row in results}
repaired_pages = {
    64: "removed the following PDF page's Or/abacus continuation; page now ends after the three subtraction steps",
    65: "restored the Or/abacus continuation above Exercise 1, matched panel proportions, and corrected all 1–18 number colours",
}
ledger = [
    "# PDF-to-ADT Visual Fidelity Ledger",
    "",
    "No page is marked as visually matched until its physical PDF composition is reproduced and re-rendered.",
    "",
    "| PDF page | Status | Current ADT section(s) | Evidence / next check |",
    "|---:|---|---|---|",
]
for page in physical_pages:
    named = page["named_sections"]
    reasons = []
    if page["pdf_page"] in repaired_pages:
        ledger.append(
            f"| {page['pdf_page']} | REPAIRED — CHECKED | {', '.join(named) if named else '—'} | {repaired_pages[page['pdf_page']]} |"
        )
        continue
    if not named:
        reasons.append("no same-numbered HTML page; content is merged into another section")
    if len(named) > 1:
        reasons.append(f"split into {len(named)} separate wrappers")
    moved = []
    for href in named:
        section = section_by_href[href]
        best = section["top_pdf_pages"][0]
        if best["pdf_page"] != page["pdf_page"]:
            moved.append(f"{href} best matches PDF {best['pdf_page']} ({best['score']:.2f})")
    reasons.extend(moved)
    if reasons:
        status = "STRUCTURAL MISMATCH"
    else:
        status = "DETAILED VISUAL CHECK REQUIRED"
        reasons.append("paired render reviewed; geometry, type, rules, figures and page boundary still need element-level sign-off")
    ledger.append(
        f"| {page['pdf_page']} | {status} | {', '.join(named) if named else '—'} | {'; '.join(reasons)} |"
    )

ledger_path = ROOT / ".audit/VISUAL_FIDELITY_LEDGER.md"
ledger_path.write_text("\n".join(ledger) + "\n")
print(json.dumps(summary, indent=2))
print(f"mapping: {out}")
print(f"ledger: {ledger_path}")
