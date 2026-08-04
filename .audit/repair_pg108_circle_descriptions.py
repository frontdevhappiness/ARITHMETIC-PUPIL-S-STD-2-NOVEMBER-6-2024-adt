#!/usr/bin/env python3
"""Swap the spoken left/right words in two otherwise-correct ADT image clips."""

from __future__ import annotations

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
BACKUP = ROOT / ".audit" / "replaced-pg108-description-audio"
WORK = ROOT / ".audit" / "pg108-description-parts"


def run_pipeline(description: str) -> None:
    pipeline = Gst.parse_launch(description)
    pipeline.set_state(Gst.State.PLAYING)
    bus = pipeline.get_bus()
    while True:
        message = bus.timed_pop_filtered(
            20 * Gst.SECOND,
            Gst.MessageType.ERROR | Gst.MessageType.EOS,
        )
        if message is None:
            pipeline.set_state(Gst.State.NULL)
            raise TimeoutError("GStreamer pipeline timed out")
        if message.type == Gst.MessageType.ERROR:
            error, debug = message.parse_error()
            pipeline.set_state(Gst.State.NULL)
            raise RuntimeError(f"GStreamer error: {error}; {debug}")
        if message.type == Gst.MessageType.EOS:
            break
    pipeline.set_state(Gst.State.NULL)


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
    bus = pipeline.get_bus()
    message = bus.timed_pop_filtered(
        15 * Gst.SECOND,
        Gst.MessageType.ERROR | Gst.MessageType.EOS,
    )
    if message is None or message.type == Gst.MessageType.ERROR:
        pipeline.set_state(Gst.State.NULL)
        raise RuntimeError(f"Could not extract {destination}")
    pipeline.set_state(Gst.State.NULL)


def concatenate(parts: list[Path], destination: Path) -> None:
    branches = " ".join(
        f'filesrc location="{part}" ! decodebin ! audioconvert ! audioresample ! '
        "audio/x-raw,format=S16LE,channels=1,rate=24000 ! c."
        for part in parts
    )
    run_pipeline(
        "concat name=c ! audioconvert ! audioresample ! "
        "audio/x-raw,format=S16LE,channels=1,rate=24000 ! "
        "lamemp3enc target=bitrate bitrate=64 cbr=true ! id3v2mux ! "
        f'filesink location="{destination}" {branches}'
    )


def preserve(text_id: str) -> None:
    BACKUP.mkdir(parents=True, exist_ok=True)
    source = AUDIO / f"{text_id}.mp3"
    destination = BACKUP / source.name
    if source.exists() and not destination.exists():
        shutil.copyfile(source, destination)


def main() -> None:
    Gst.init(None)
    WORK.mkdir(parents=True, exist_ok=True)
    original_009 = BACKUP / "pg108_im009.mp3"
    original_010 = BACKUP / "pg108_im010.mp3"
    if not original_009.exists():
        original_009 = AUDIO / "pg108_im009.mp3"
    if not original_010.exists():
        original_010 = AUDIO / "pg108_im010.mp3"

    specifications = {
        "pg108_im009": [
            (original_009, 0.00, 0.66, "009-bottom"),
            (original_010, 0.64, 1.02, "010-left"),
            (original_009, 1.02, 3.40, "009-rest"),
        ],
        "pg108_im010": [
            (original_010, 0.00, 0.64, "010-bottom"),
            (original_009, 0.66, 1.02, "009-right"),
            (original_010, 1.02, 3.75, "010-rest"),
        ],
    }

    repaired = {}
    for text_id, segments in specifications.items():
        parts = []
        for source, start, end, label in segments:
            part = WORK / f"{label}.mp3"
            extract(source, part, start, end)
            parts.append(part)
        output = WORK / f"{text_id}-fixed.mp3"
        concatenate(parts, output)
        repaired[text_id] = output

    for text_id, output in repaired.items():
        for destination_id in (text_id, f"{text_id}_easy_read"):
            preserve(destination_id)
            shutil.copyfile(output, AUDIO / f"{destination_id}.mp3")

    timecodes = json.loads(TIMECODES.read_text(encoding="utf-8"))
    for text_id, replacement in (("pg108_im009", "left"), ("pg108_im010", "right")):
        for destination_id in (text_id, f"{text_id}_easy_read"):
            record = timecodes.get(destination_id)
            if not record:
                continue
            layers = record["timecodes"]
            for layer in layers:
                if not isinstance(layer, dict):
                    continue
                for word in layer.get("word_timestamps", []):
                    if str(word.get("text", "")).lower() in {"left", "right"}:
                        word["text"] = replacement
    TIMECODES.write_text(
        json.dumps(timecodes, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"repaired": sorted(repaired)}, indent=2))


if __name__ == "__main__":
    main()
