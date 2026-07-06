"""Audio tools for Tool Hub, powered by a bundled static ffmpeg.

ffmpeg is a separate executable (not a pip package). We ship it inside the
PyInstaller bundle via imageio-ffmpeg and locate it at runtime, so the packaged
app needs no system ffmpeg. In dev we fall back to imageio-ffmpeg's copy.
"""
import os
import re
import subprocess
import sys
import tempfile


def ffmpeg_path():
    """Locate the ffmpeg executable, frozen bundle first, dev fallback second."""
    if getattr(sys, "frozen", False):
        base = sys._MEIPASS  # type: ignore[attr-defined]
        for name in os.listdir(base):
            if name.startswith("ffmpeg"):
                p = os.path.join(base, name)
                try:
                    os.chmod(p, 0o755)
                except OSError:
                    pass
                return p
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


# output format -> ffmpeg audio codec
_CODECS = {
    "mp3": ["-c:a", "libmp3lame"],
    "wav": ["-c:a", "pcm_s16le"],
    "flac": ["-c:a", "flac"],
    "m4a": ["-c:a", "aac"],
    "aac": ["-c:a", "aac"],
    "ogg": ["-c:a", "libvorbis"],
}
_LOSSY = {"mp3", "m4a", "aac", "ogg"}


def _run(mid_args, in_bytes, in_ext, out_ext):
    """Write input to a temp file, run ffmpeg, return the output bytes."""
    with tempfile.TemporaryDirectory() as d:
        inp = os.path.join(d, f"in.{in_ext}")
        outp = os.path.join(d, f"out.{out_ext}")
        with open(inp, "wb") as f:
            f.write(in_bytes)
        cmd = [ffmpeg_path(), "-y", "-hide_banner", "-i", inp, *mid_args, outp]
        proc = subprocess.run(cmd, capture_output=True)
        if proc.returncode != 0 or not os.path.exists(outp):
            tail = proc.stderr.decode("utf-8", "ignore").strip().splitlines()[-4:]
            raise RuntimeError("ffmpeg failed: " + " | ".join(tail))
        with open(outp, "rb") as f:
            return f.read()


def get_duration(in_bytes, in_ext):
    """Return the media duration in seconds, or None if it can't be read."""
    with tempfile.TemporaryDirectory() as d:
        inp = os.path.join(d, f"in.{in_ext}")
        with open(inp, "wb") as f:
            f.write(in_bytes)
        proc = subprocess.run([ffmpeg_path(), "-hide_banner", "-i", inp], capture_output=True)
        m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", proc.stderr.decode("utf-8", "ignore"))
        if m:
            h, mn, s = m.groups()
            return int(h) * 3600 + int(mn) * 60 + float(s)
    return None


def convert(in_bytes, in_ext, out_format, bitrate=None):
    args = list(_CODECS.get(out_format, []))
    if bitrate and out_format in _LOSSY:
        args += ["-b:a", f"{int(bitrate)}k"]
    return _run(args, in_bytes, in_ext, out_format), out_format


def trim(in_bytes, in_ext, start, end):
    """Cut the segment between start and end (seconds), re-encoding for accuracy."""
    args = ["-ss", str(float(start)), "-to", str(float(end))]
    return _run(args, in_bytes, in_ext, in_ext), in_ext


def adjust_volume(in_bytes, in_ext, db):
    return _run(["-af", f"volume={float(db)}dB"], in_bytes, in_ext, in_ext), in_ext


def normalize(in_bytes, in_ext):
    """EBU R128 loudness normalisation to a common target."""
    return _run(["-af", "loudnorm=I=-16:TP=-1.5:LRA=11"], in_bytes, in_ext, in_ext), in_ext


def fade(in_bytes, in_ext, fade_in=0.0, fade_out=0.0):
    filters = []
    if fade_in and fade_in > 0:
        filters.append(f"afade=t=in:st=0:d={float(fade_in)}")
    if fade_out and fade_out > 0:
        dur = get_duration(in_bytes, in_ext)
        if dur:
            filters.append(f"afade=t=out:st={max(0.0, dur - float(fade_out))}:d={float(fade_out)}")
    args = ["-af", ",".join(filters)] if filters else []
    return _run(args, in_bytes, in_ext, in_ext), in_ext


def extract_audio(in_bytes, in_ext, out_format="mp3", bitrate=192):
    """Pull the audio track out of a video file."""
    args = ["-vn"] + list(_CODECS.get(out_format, []))
    if bitrate and out_format in _LOSSY:
        args += ["-b:a", f"{int(bitrate)}k"]
    return _run(args, in_bytes, in_ext, out_format), out_format
