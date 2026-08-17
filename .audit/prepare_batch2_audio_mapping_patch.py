import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = [
    "qz001.html", "pg010_sec001.html", "pg011_sec001.html", "pg012_sec001.html",
    "pg012_sec002.html", "qz002.html", "pg013_sec001.html", "pg014_sec001.html",
    "pg014_sec002.html", "pg016_sec001.html",
]
TEXTS_PATH = ROOT / "content/i18n/en-GB/texts.json"
AUDIOS_PATH = ROOT / "content/i18n/en-GB/audios.json"

texts = json.loads(TEXTS_PATH.read_text())
audios = json.loads(AUDIOS_PATH.read_text())
ids = set()
for page in PAGES:
    ids.update(re.findall(r'data-id=["\']([^"\']+)', (ROOT / page).read_text()))

changes_by_id = {}
for text_id in sorted(ids):
    for candidate in (text_id, f"{text_id}_easy_read"):
        if candidate not in audios:
            continue
        value = texts.get(candidate, "").strip()
        if not re.fullmatch(r"\d{3}", value):
            continue
        new_audio = f"stdnum_enGB_{value}.mp3"
        old_audio = audios[candidate]
        if old_audio != new_audio:
            changes_by_id[candidate] = (old_audio, new_audio)

audio_lines = AUDIOS_PATH.read_text().splitlines()
changes = []
for line_number, line in enumerate(audio_lines):
    match = re.match(r'  "([^"]+)": "([^"]+)",?$', line)
    if match and match.group(1) in changes_by_id:
        old_audio, new_audio = changes_by_id[match.group(1)]
        changes.append((line_number, match.group(1), old_audio, new_audio))

if len(sys.argv) == 2 and sys.argv[1] == "--count":
    print(len(changes))
    raise SystemExit

start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
limit = int(sys.argv[2]) if len(sys.argv) > 2 else len(changes)
changes = changes[start:start + limit]

print("*** Begin Patch")
print(f"*** Update File: {AUDIOS_PATH}")
groups = []
for change in changes:
    if not groups or change[0] - groups[-1][-1][0] > 6:
        groups.append([change])
    else:
        groups[-1].append(change)

for group in groups:
    print("@@")
    replacements = {line_number: (text_id, old_audio, new_audio) for line_number, text_id, old_audio, new_audio in group}
    for line_number in range(group[0][0], group[-1][0] + 1):
        if line_number in replacements:
            text_id, old_audio, new_audio = replacements[line_number]
            comma = "," if audio_lines[line_number].endswith(",") else ""
            print(f'-  "{text_id}": "{old_audio}"{comma}')
            print(f'+  "{text_id}": "{new_audio}"{comma}')
        else:
            print(f' {audio_lines[line_number]}')
print("*** End Patch")
