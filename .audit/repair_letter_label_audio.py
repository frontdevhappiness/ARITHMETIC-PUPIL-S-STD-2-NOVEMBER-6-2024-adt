#!/usr/bin/env python3
"""Repair corrupted standalone-letter clips with verified ADT Studio voice audio."""

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
BACKUP = ROOT / ".audit" / "replaced-letter-audio"
SOURCE_DESCRIPTION = AUDIO / "pg139_im005.mp3"


def extract_mp3(source: Path, destination: Path, start: float, end: float) -> None:
    """Accurately extract a time range and re-encode it as a browser-safe MP3."""
    pipeline = Gst.parse_launch(
        f'filesrc location="{source}" ! decodebin ! audioconvert ! audioresample ! '
        "audio/x-raw,format=S16LE,channels=1,rate=24000 ! "
        "lamemp3enc target=bitrate bitrate=64 cbr=true ! id3v2mux ! "
        f'filesink location="{destination}"'
    )
    pipeline.set_state(Gst.State.PAUSED)
    state_result, _, _ = pipeline.get_state(10 * Gst.SECOND)
    if state_result == Gst.StateChangeReturn.FAILURE:
        pipeline.set_state(Gst.State.NULL)
        raise RuntimeError(f"Could not preroll {source}")

    ok = pipeline.seek(
        1.0,
        Gst.Format.TIME,
        Gst.SeekFlags.FLUSH | Gst.SeekFlags.ACCURATE,
        Gst.SeekType.SET,
        int(start * Gst.SECOND),
        Gst.SeekType.SET,
        int(end * Gst.SECOND),
    )
    if not ok:
        pipeline.set_state(Gst.State.NULL)
        raise RuntimeError(f"Could not seek {source}")

    pipeline.set_state(Gst.State.PLAYING)
    bus = pipeline.get_bus()
    while True:
        message = bus.timed_pop_filtered(
            15 * Gst.SECOND,
            Gst.MessageType.ERROR | Gst.MessageType.EOS,
        )
        if message is None:
            pipeline.set_state(Gst.State.NULL)
            raise TimeoutError(f"Timed out extracting {destination}")
        if message.type == Gst.MessageType.ERROR:
            error, debug = message.parse_error()
            pipeline.set_state(Gst.State.NULL)
            raise RuntimeError(f"GStreamer error: {error}; {debug}")
        if message.type == Gst.MessageType.EOS:
            break
    pipeline.set_state(Gst.State.NULL)


def preserve_original(text_id: str) -> None:
    source = AUDIO / f"{text_id}.mp3"
    destination = BACKUP / source.name
    if source.exists() and not destination.exists():
        shutil.copyfile(source, destination)


def install(source: Path, text_ids: list[str]) -> None:
    for text_id in text_ids:
        preserve_original(text_id)
        shutil.copyfile(source, AUDIO / f"{text_id}.mp3")


def set_timecode(data: dict, text_ids: list[str], letter: str, end: float) -> None:
    for text_id in text_ids:
        data[text_id] = {
            "timecodes": [
                None,
                {
                    "word_timestamps": [
                        {"text": letter, "start": 0, "end": end}
                    ]
                },
            ]
        }


def with_easy_read(*text_ids: str) -> list[str]:
    return [item for text_id in text_ids for item in (text_id, f"{text_id}_easy_read")]


def main() -> None:
    Gst.init(None)
    BACKUP.mkdir(parents=True, exist_ok=True)
    temporary = ROOT / ".audit" / "letter-audio-extracts"
    temporary.mkdir(parents=True, exist_ok=True)

    # Reuse the book's clear, isolated A/B/C recordings.
    a_ids = with_easy_read("pg133_n0013", "pg133_n0020", "pg136_n0025")
    b_ids = with_easy_read("pg133_n0015", "pg133_n0022", "pg136_n0028")
    c_ids = with_easy_read("pg139_sec001_ans_item-2")
    install(AUDIO / "pg126_n0008.mp3", a_ids)
    install(AUDIO / "pg126_n0011.mp3", b_ids)
    install(AUDIO / "pg136_n0031.mp3", c_ids)

    # F, H and I are cleanly spoken in this ADT Studio-generated image description.
    extracts = {
        "F": (13.84, 14.48, with_easy_read("pg136_n0041")),
        "H": (17.24, 17.90, with_easy_read("pg136_n0048")),
        "I": (19.22, 19.84, with_easy_read("pg136_n0051")),
    }
    for letter, (start, end, text_ids) in extracts.items():
        output = temporary / f"letter-{letter.lower()}.mp3"
        extract_mp3(SOURCE_DESCRIPTION, output, start, end)
        install(output, text_ids)

    timecodes = json.loads(TIMECODES.read_text(encoding="utf-8"))
    set_timecode(timecodes, a_ids, "A", 1.16)
    set_timecode(timecodes, b_ids, "B", 1.18)
    set_timecode(timecodes, c_ids, "C", 0.82)
    for letter, (start, end, text_ids) in extracts.items():
        set_timecode(timecodes, text_ids, letter, round(end - start, 2))
    TIMECODES.write_text(
        json.dumps(timecodes, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "repaired_ids": a_ids + b_ids + c_ids + [
                    text_id
                    for _, (_, _, text_ids) in extracts.items()
                    for text_id in text_ids
                ],
                "backup": str(BACKUP),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
