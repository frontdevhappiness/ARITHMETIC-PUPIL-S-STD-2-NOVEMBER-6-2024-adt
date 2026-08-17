import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TIMECODES_PATH = ROOT / "content/i18n/en-GB/timecode/timecode_output.json"
SOURCE_PATH = Path("/tmp/batch2_composite_timecodes.json")
timecodes = json.loads(TIMECODES_PATH.read_text())
source = json.loads(SOURCE_PATH.read_text())
lines = TIMECODES_PATH.read_text().splitlines()

desired = {
    text_id: {"timecodes": [None, {"word_timestamps": data["words"]}]}
    for text_id, data in source.items()
}

missing = [text_id for text_id in desired if text_id not in timecodes]
if len(sys.argv) == 2 and sys.argv[1] == "--missing-count":
    print(len(missing))
    raise SystemExit

if len(sys.argv) == 2 and sys.argv[1] == "--append-missing":
    last = len(lines) - 2
    while last >= 0 and not lines[last].strip():
        last -= 1
    print("*** Begin Patch")
    print(f"*** Update File: {TIMECODES_PATH}")
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
for text_id, value in desired.items():
    if text_id in spans and timecodes.get(text_id) != value:
        changes.append((*spans[text_id], text_id))
changes.sort()

if len(sys.argv) == 2 and sys.argv[1] == "--count":
    print(len(changes))
    raise SystemExit

limit = int(sys.argv[1]) if len(sys.argv) > 1 else len(changes)
changes = changes[:limit]
print("*** Begin Patch")
print(f"*** Update File: {TIMECODES_PATH}")
for start, end, text_id in changes:
    print("@@")
    for old_line in lines[start:end + 1]:
        print(f"-{old_line}")
    block = json.dumps({text_id: desired[text_id]}, indent=2).splitlines()[1:-1]
    if lines[end].endswith(","):
        block[-1] += ","
    for new_line in block:
        print(f"+{new_line}")
print("*** End Patch")
