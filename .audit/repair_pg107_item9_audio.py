#!/usr/bin/env python3
"""Repair item 9 narration using existing ADT Studio voice segments."""

from __future__ import annotations

import copy
import json
import shutil
from pathlib import Path

import gi

gi.require_version("Gst", "1.0")
from gi.repository import Gst  # noqa: E402


ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / "content" / "i18n" / "en-GB"
AUDIO = I18N / "audio"
TIMECODES = I18N / "timecode" / "timecode_output.json"
BACKUP = ROOT / ".audit" / "replaced-pg107-item9-audio"
WORK = ROOT / ".audit" / "pg107-item9-audio-parts"
IMAGE_ID = "pg107_im010_seg009_v1"


def wait_for_end(pipeline: Gst.Pipeline, timeout: int = 20) -> None:
    bus = pipeline.get_bus()
    message = bus.timed_pop_filtered(
        timeout * Gst.SECOND,
        Gst.MessageType.ERROR | Gst.MessageType.EOS,
    )
    if message is None:
        pipeline.set_state(Gst.State.NULL)
        raise TimeoutError("GStreamer pipeline timed out")
    if message.type == Gst.MessageType.ERROR:
        error, debug = message.parse_error()
        pipeline.set_state(Gst.State.NULL)
        raise RuntimeError(f"GStreamer error: {error}; {debug}")


def extract(source: Path, destination: Path, start: float, end: float) -> None:
    pipeline = Gst.parse_launch(
        f'filesrc location="{source}" ! decodebin ! audioconvert ! audioresample ! '
        "audio/x-raw,format=S16LE,channels=1,rate=24000 ! "
        "lamemp3enc target=bitrate bitrate=64 cbr=true ! id3v2mux ! "
        f'filesink location="{destination}"'
    )
    pipeline.set_state(Gst.State.PAUSED)
    result, _, _ = pipeline.get_state(10 * Gst.SECOND)
    if result == Gst.StateChangeReturn.FAILURE:
        pipeline.set_state(Gst.State.NULL)
        raise RuntimeError(f"Could not preroll {source}")
    if not pipeline.seek(
        1.0,
        Gst.Format.TIME,
        Gst.SeekFlags.FLUSH | Gst.SeekFlags.ACCURATE,
        Gst.SeekType.SET,
        int(start * Gst.SECOND),
        Gst.SeekType.SET,
        int(end * Gst.SECOND),
    ):
        pipeline.set_state(Gst.State.NULL)
        raise RuntimeError(f"Could not seek {source}")
    pipeline.set_state(Gst.State.PLAYING)
    wait_for_end(pipeline)
    pipeline.set_state(Gst.State.NULL)


def concatenate(parts: list[Path], destination: Path) -> None:
    branches = " ".join(
        f'filesrc location="{part}" ! decodebin ! audioconvert ! audioresample ! '
        "audio/x-raw,format=S16LE,channels=1,rate=24000 ! c."
        for part in parts
    )
    pipeline = Gst.parse_launch(
        "concat name=c ! audioconvert ! audioresample ! "
        "audio/x-raw,format=S16LE,channels=1,rate=24000 ! "
        "lamemp3enc target=bitrate bitrate=64 cbr=true ! id3v2mux ! "
        f'filesink location="{destination}" {branches}'
    )
    pipeline.set_state(Gst.State.PLAYING)
    wait_for_end(pipeline)
    pipeline.set_state(Gst.State.NULL)


def main() -> None:
    Gst.init(None)
    BACKUP.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)

    narration = AUDIO / f"{IMAGE_ID}.mp3"
    original = BACKUP / narration.name
    if not original.exists():
        shutil.copyfile(narration, original)

    parts_spec = [
        (original, 0.00, 0.78, "chain-of"),
        (AUDIO / "pg107_n0035.mp3", 0.00, 0.82, "four"),
        (original, 1.18, 4.58, "connected-through-last"),
        (original, 2.92, 3.20, "two"),
        (original, 4.96, 5.72, "unshaded"),
    ]
    parts = []
    for source, start, end, label in parts_spec:
        part = WORK / f"{label}.mp3"
        extract(source, part, start, end)
        parts.append(part)
    repaired = WORK / f"{IMAGE_ID}-fixed.mp3"
    concatenate(parts, repaired)
    shutil.copyfile(repaired, narration)

    # The corrected figure shows two of four circles shaded, so item 9 is Yes.
    answer_id = "pg107_sec001_ans_item-9"
    answer_audio = AUDIO / f"{answer_id}.mp3"
    answer_backup = BACKUP / answer_audio.name
    if not answer_backup.exists():
        shutil.copyfile(answer_audio, answer_backup)
    shutil.copyfile(AUDIO / "pg107_sec001_ans_item-1.mp3", answer_audio)

    timecodes = json.loads(TIMECODES.read_text(encoding="utf-8"))
    for layer in timecodes[IMAGE_ID]["timecodes"]:
        if not isinstance(layer, dict):
            continue
        for word in layer.get("word_timestamps", []):
            if str(word.get("text", "")).lower() == "five":
                word["text"] = "four"
            elif str(word.get("text", "")).lower() == "three":
                word["text"] = "two"
    timecodes[answer_id] = copy.deepcopy(timecodes["pg107_sec001_ans_item-1"])
    TIMECODES.write_text(
        json.dumps(timecodes, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"narration": IMAGE_ID, "answer": "Yes"}, indent=2))


if __name__ == "__main__":
    main()
