import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = [
    "pg017_sec001.html", "pg018_sec001.html", "qz003.html", "pg019_sec001.html",
    "pg020_sec001.html", "pg021_sec001.html", "pg022_sec001.html", "qz004.html",
    "pg024_sec001.html", "pg025_sec001.html",
]
BOOKWIDE = os.environ.get("BOOKWIDE_LABELS") == "8_19"
if BOOKWIDE:
    PAGES = sorted(path.name for path in ROOT.glob("*.html"))
TEXTS = json.loads((ROOT / "content/i18n/en-GB/texts.json").read_text())
AUDIOS_PATH = ROOT / "content/i18n/en-GB/audios.json"
TIMECODES_PATH = ROOT / "content/i18n/en-GB/timecode/timecode_output.json"
DURATIONS = {
    number: float(duration)
    for number, duration in (line.split() for line in Path("/tmp/batch3_label_durations.txt").read_text().splitlines())
}

base_ids = set()
for page in PAGES:
    html = (ROOT / page).read_text()
    for text_id in re.findall(r'data-id=["\']([^"\']+)', html):
        value = TEXTS.get(text_id, "").strip()
        if re.fullmatch(r"\d{1,2}\.", value) and (not BOOKWIDE or value in {"8.", "19."}):
            base_ids.add(text_id)

targets = []
for base_id in sorted(base_ids):
    for text_id in (base_id, f"{base_id}_easy_read"):
        value = TEXTS.get(text_id, "").strip()
        if re.fullmatch(r"\d{1,2}\.", value):
            targets.append((text_id, value[:-1]))


def emit_audio_patch():
    lines = AUDIOS_PATH.read_text().splitlines()
    wanted = {text_id: f"stdnum_enGB_{number}.mp3" for text_id, number in targets}
    print("*** Begin Patch")
    print(f"*** Update File: {AUDIOS_PATH}")
    for index, line in enumerate(lines):
        match = re.match(r'  "([^"]+)": "([^"]+)"(,?)$', line)
        if not match or match.group(1) not in wanted or match.group(2) == wanted[match.group(1)]:
            continue
        print("@@")
        print(f"-{line}")
        print(f'+  "{match.group(1)}": "{wanted[match.group(1)]}"{match.group(3)}')
    print("*** End Patch")


def emit_timecode_patch():
    lines = TIMECODES_PATH.read_text().splitlines()
    timecodes = json.loads(TIMECODES_PATH.read_text())
    spans = {}
    line_number = 1
    while line_number < len(lines) - 1:
        match = re.match(r'^  "([^"]+)": \{$', lines[line_number])
        if not match:
            line_number += 1
            continue
        start = line_number
        depth = 0
        while line_number < len(lines):
            depth += lines[line_number].count("{") - lines[line_number].count("}")
            if depth == 0:
                spans[match.group(1)] = (start, line_number)
                line_number += 1
                break
            line_number += 1

    desired = {
        text_id: {"timecodes": [None, {"word_timestamps": [{
            "text": number, "start": 0, "end": DURATIONS[number],
        }]}]}
        for text_id, number in targets
    }
    missing = [text_id for text_id in desired if text_id not in spans]
    print("*** Begin Patch")
    print(f"*** Update File: {TIMECODES_PATH}")
    for text_id, value in sorted(
        ((text_id, value) for text_id, value in desired.items() if text_id in spans),
        key=lambda item: spans[item[0]][0],
    ):
        if timecodes[text_id] == value:
            continue
        start, end = spans[text_id]
        print("@@")
        for old_line in lines[start:end + 1]:
            print(f"-{old_line}")
        block = json.dumps({text_id: value}, indent=2).splitlines()[1:-1]
        if lines[end].endswith(","):
            block[-1] += ","
        for new_line in block:
            print(f"+{new_line}")
    if missing:
        last = len(lines) - 2
        while last >= 0 and not lines[last].strip():
            last -= 1
        print("@@")
        print(f"-{lines[last]}")
        print(f"+{lines[last]},")
        for index, text_id in enumerate(missing):
            block = json.dumps({text_id: desired[text_id]}, indent=2).splitlines()[1:-1]
            if index < len(missing) - 1:
                block[-1] += ","
            for line in block:
                print(f"+{line}")
    print("*** End Patch")


if sys.argv[1] == "audios":
    emit_audio_patch()
elif sys.argv[1] == "timecodes":
    emit_timecode_patch()
else:
    raise SystemExit("Use audios or timecodes")
