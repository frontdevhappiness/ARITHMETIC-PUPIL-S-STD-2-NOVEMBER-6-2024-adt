import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TIMECODES_PATH = ROOT / "content/i18n/en-GB/timecode/timecode_output.json"
AUDIOS_PATH = ROOT / "content/i18n/en-GB/audios.json"
TEXTS_PATH = ROOT / "content/i18n/en-GB/texts.json"
DURATIONS_PATH = Path("/tmp/batch2_stdnum_durations.txt")

audios = json.loads(AUDIOS_PATH.read_text())
texts = json.loads(TEXTS_PATH.read_text())
durations = {
    number: float(duration)
    for number, duration in (line.split() for line in DURATIONS_PATH.read_text().splitlines())
}
timecodes = json.loads(TIMECODES_PATH.read_text())
lines = TIMECODES_PATH.read_text().splitlines()

def desired(text_id):
    number = texts[text_id].strip()
    return {
        "timecodes": [None, {"word_timestamps": [{
            "text": number,
            "start": 0,
            "end": durations[number],
        }]}]
    }

targets = []
for text_id, audio in audios.items():
    match = re.fullmatch(r"stdnum_enGB_(\d{3})\.mp3", audio)
    if match and text_id in texts and texts[text_id].strip() == match.group(1):
        targets.append(text_id)

missing = [text_id for text_id in targets if text_id not in timecodes]
if len(sys.argv) == 2 and sys.argv[1] == "--missing-count":
    print(len(missing))
    raise SystemExit

if len(sys.argv) == 2 and sys.argv[1] == "--append-missing":
    if not missing:
        print("*** Begin Patch\n*** End Patch")
        raise SystemExit
    last = len(lines) - 2
    while last >= 0 and not lines[last].strip():
        last -= 1
    print("*** Begin Patch")
    print(f"*** Update File: {TIMECODES_PATH}")
    print("@@")
    print(f"-{lines[last]}")
    print(f"+{lines[last]},")
    for index, text_id in enumerate(missing):
        block = json.dumps({text_id: desired(text_id)}, indent=2).splitlines()[1:-1]
        if index < len(missing) - 1:
            block[-1] += ","
        for line in block:
            print(f"+{line}")
    print("*** End Patch")
    raise SystemExit

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

changes = []
for text_id in targets:
    if text_id in spans and timecodes[text_id] != desired(text_id):
        changes.append((spans[text_id][0], spans[text_id][1], text_id))
changes.sort()

if len(sys.argv) == 2 and sys.argv[1] == "--count":
    print(len(changes))
    raise SystemExit

limit = int(sys.argv[1]) if len(sys.argv) > 1 else len(changes)
changes = changes[:limit]
groups = []
for change in changes:
    if not groups or change[0] - groups[-1][-1][1] > 3:
        groups.append([change])
    else:
        groups[-1].append(change)

print("*** Begin Patch")
print(f"*** Update File: {TIMECODES_PATH}")
for group in groups:
    print("@@")
    replacements = {start: (end, text_id) for start, end, text_id in group}
    cursor = group[0][0]
    final_line = group[-1][1]
    while cursor <= final_line:
        if cursor in replacements:
            end, text_id = replacements[cursor]
            for old_line in lines[cursor:end + 1]:
                print(f"-{old_line}")
            block = json.dumps({text_id: desired(text_id)}, indent=2).splitlines()[1:-1]
            if lines[end].endswith(","):
                block[-1] += ","
            for new_line in block:
                print(f"+{new_line}")
            cursor = end + 1
        else:
            print(f" {lines[cursor]}")
            cursor += 1
print("*** End Patch")
