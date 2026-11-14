#!/usr/bin/env python3
"""Level sound effects to the house loudness and save them as AAC .m4a in assets/sounds.

Every effect is brought to the same loudness (TARGET_DB over its loudest 300 ms), without
letting any peak pass PEAK_CEILING_DB. The in-game volumes in js/audio.js are then the mix.

    python3 scripts/level-sounds.py ~/Downloads/new-sound.mp3 [more files...] [--name new-name]

Needs macOS afconvert. Prints each file's loudness after levelling; files that hit the peak
ceiling end up quieter than TARGET_DB, so give them a higher volume in js/audio.js.
"""
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

OUT = Path(__file__).resolve().parents[1] / "assets/sounds"
TARGET_DB = -14.0
PEAK_CEILING_DB = -1.0
WINDOW_SEC = 0.3


def read_wav(path):
    with wave.open(str(path)) as w:
        rate, channels = w.getframerate(), w.getnchannels()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768
    return data.reshape(-1, channels), rate


def write_wav(path, data, rate):
    pcm = (np.clip(data, -1, 32767 / 32768) * 32768).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(data.shape[1])
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())


def loudest_db(data, rate):
    mono = data.mean(axis=1)
    win = max(1, int(rate * WINDOW_SEC))
    if len(mono) <= win:
        rms = np.sqrt(np.mean(mono ** 2))
    else:
        power = np.convolve(mono ** 2, np.ones(win) / win, mode="valid")
        rms = np.sqrt(power.max())
    return 20 * np.log10(rms + 1e-12)


def level(src, name=None):
    src = Path(src).expanduser()
    out = OUT / f"{name or src.stem}.m4a"
    with tempfile.TemporaryDirectory() as tmp:
        raw, levelled = Path(tmp) / "raw.wav", Path(tmp) / "levelled.wav"
        subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16", str(src), str(raw)], check=True)
        data, rate = read_wav(raw)
        before = loudest_db(data, rate)
        peak_db = 20 * np.log10(np.abs(data).max() + 1e-12)
        gain_db = min(TARGET_DB - before, PEAK_CEILING_DB - peak_db)
        data = data * 10 ** (gain_db / 20)
        write_wav(levelled, data, rate)
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-s", "3", "-u", "vbrq", "110", str(levelled), str(out)], check=True)
    after = loudest_db(data, rate)
    flag = "  (peak-limited)" if after < TARGET_DB - 0.5 else ""
    print(f"{out.name:28s} {before:6.1f} dB -> {after:6.1f} dB  (gain {gain_db:+5.1f} dB){flag}")


if __name__ == "__main__":
    args = sys.argv[1:]
    name = None
    if "--name" in args:
        i = args.index("--name")
        name = args[i + 1]
        del args[i:i + 2]
    if not args:
        sys.exit(__doc__)
    for path in args:
        level(path, name if len(args) == 1 else None)
