import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = [
    "qz001.html", "pg010_sec001.html", "pg011_sec001.html", "pg012_sec001.html",
    "pg012_sec002.html", "qz002.html", "pg013_sec001.html", "pg014_sec001.html",
    "pg014_sec002.html", "pg016_sec001.html",
]
texts = json.loads((ROOT / "content/i18n/en-GB/texts.json").read_text())
audios = json.loads((ROOT / "content/i18n/en-GB/audios.json").read_text())
timecodes = json.loads((ROOT / "content/i18n/en-GB/timecode/timecode_output.json").read_text())
audio_dir = ROOT / "content/i18n/en-GB/audio"
failures = []
checked = 0

for page in PAGES:
    html = (ROOT / page).read_text()
    for text_id in set(re.findall(r'data-id=["\']([^"\']+)', html)):
        if text_id in {"qz001", "qz002"}:
            continue
        checked += 1
        if text_id not in texts:
            failures.append(f"{page}: missing text {text_id}")
            continue
        candidates = [text_id]
        if f"{text_id}_easy_read" in texts:
            candidates.append(f"{text_id}_easy_read")
        for candidate in candidates:
            audio = audios.get(candidate)
            if not audio:
                failures.append(f"{candidate}: missing audio mapping")
            elif not (audio_dir / audio).is_file():
                failures.append(f"{candidate}: missing audio file {audio}")
            if candidate not in timecodes:
                failures.append(f"{candidate}: missing timecodes")
            value = texts[candidate].strip()
            if re.fullmatch(r"\d{3}", value):
                expected = f"stdnum_enGB_{value}.mp3"
                if audio != expected:
                    failures.append(f"{candidate}: expected {expected}, got {audio}")
                words = timecodes.get(candidate, {}).get("timecodes", [None, {}])[1].get("word_timestamps", [])
                if len(words) != 1 or words[0].get("text") != value:
                    failures.append(f"{candidate}: invalid numeric highlight timestamps")

print(json.dumps({"checked_data_ids": checked, "failures": failures}, indent=2))
raise SystemExit(bool(failures))
