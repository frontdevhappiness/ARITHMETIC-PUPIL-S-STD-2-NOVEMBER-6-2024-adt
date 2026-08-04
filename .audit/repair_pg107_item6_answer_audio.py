#!/usr/bin/env python3
"""Align question 6 answer audio/timestamps with its unequal shaded figure."""

import copy
import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / "content" / "i18n" / "en-GB"
AUDIO = I18N / "audio"
TIMECODES = I18N / "timecode" / "timecode_output.json"
BACKUP = ROOT / ".audit" / "replaced-pg107-item6-audio.mp3"

destination = AUDIO / "pg107_sec001_ans_item-6.mp3"
if not BACKUP.exists():
    shutil.copyfile(destination, BACKUP)
shutil.copyfile(AUDIO / "pg107_sec001_ans_item-5.mp3", destination)

timecodes = json.loads(TIMECODES.read_text(encoding="utf-8"))
timecodes["pg107_sec001_ans_item-6"] = copy.deepcopy(
    timecodes["pg107_sec001_ans_item-5"]
)
TIMECODES.write_text(
    json.dumps(timecodes, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print("pg107 item 6 answer audio: No")
