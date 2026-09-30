"""Turn the recorded take into the film: screen frames on their own clock, each spoken take laid where its
line began, subtitles cut from the same lines, encoded as H.264 + AAC.

  python assemble.py            -> work/out/noir-demo.mp4 (subtitles burned in), noir-demo.srt, voice.wav
  python assemble.py --no-subs  -> work/out/noir-demo-clean.mp4 (no burned subtitles)

Needs ffmpeg with libass: set FFMPEG to its path, or install imageio-ffmpeg (requirements.txt) and it is found.
"""
import io, json, math, os, re, subprocess, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(os.environ.get("NOIR_DEMO_WORK") or os.path.join(HERE, "work"))
if os.environ.get("FFMPEG"):
    FF = os.environ["FFMPEG"]
else:
    import imageio_ffmpeg

    FF = imageio_ffmpeg.get_ffmpeg_exe()
NO_SUBS = "--no-subs" in sys.argv
FPS = 30
os.makedirs("out", exist_ok=True)

take = json.load(io.open("take.json", encoding="utf8"))
tl = json.load(io.open("timeline.json", encoding="utf8"))
START, END = take["videoStart"], take["videoEnd"]
T = END - START
lines = {l["idx"]: l for s in tl["scenes"] for l in s["lines"]}
scene_of = {l["idx"]: s["id"] for s in tl["scenes"] for l in s["lines"]}

# ------------------------------------------------------------------ the voice
SR = 24000
voice = np.zeros(int((T + 2) * SR), dtype=np.float32)
for m in take["marks"]:
    w, sr = sf.read(f"audio/{m['idx']:02d}.wav", dtype="float32")
    assert sr == SR, sr
    ramp = int(0.008 * SR)
    w = w.copy()
    w[:ramp] *= np.linspace(0, 1, ramp)
    w[-ramp:] *= np.linspace(1, 0, ramp)
    off = int(round((m["t"] - START) * SR))
    voice[off : off + len(w)] += w
sf.write("out/voice.wav", voice, SR, subtype="PCM_16")
print(f"voice: {len(voice) / SR:.1f}s")

# -------------------------------------------------------------- the subtitles
MAXCH = 84  # two lines of about forty-two


def chunks(text):
    """Split one spoken line into pieces that fit two subtitle rows, at sentence ends and then at commas."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    pieces = []
    for s in sentences:
        while len(s) > MAXCH:
            cut = max((m.end() for m in re.finditer(r"[,:;]\s", s[: MAXCH - 6])), default=0)
            if cut < 30:
                cut = s.rfind(" ", 0, MAXCH)
            pieces.append(s[:cut].strip())
            s = s[cut:].strip()
        pieces.append(s)
    merged = []
    for p in pieces:  # keep short sentences together
        if merged and len(merged[-1]) + 1 + len(p) <= MAXCH:
            merged[-1] += " " + p
        else:
            merged.append(p)
    return merged


def two_rows(text):
    """Balance a piece over one or two rows, breaking at the space nearest the middle."""
    if len(text) <= 44:
        return text
    mid = len(text) / 2
    spaces = [m.start() for m in re.finditer(" ", text)]
    cut = min(spaces, key=lambda i: abs(i - mid))
    return text[:cut] + "\\N" + text[cut + 1 :]


def pauses(w, sr, thr=0.010, min_len=0.12):
    """Silences inside a take, as (start, end) seconds: where one sentence or clause ends and the next begins."""
    hop = int(0.01 * sr)
    n = len(w) // hop
    rms = np.sqrt(np.mean(w[: n * hop].reshape(n, hop) ** 2, axis=1))
    quiet = rms < thr
    out, i = [], 0
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            if (j - i) * 0.01 >= min_len:
                out.append((i * 0.01, j * 0.01))
            i = j
        else:
            i += 1
    return out


def snap(bounds, found, reach=0.9):
    """Move each estimated boundary to the nearest real pause, in order, when one is within reach."""
    got, last = [], -1.0
    for b in bounds:
        pick = min((p for p in found if p[0] > last), key=lambda p: abs((p[0] + p[1]) / 2 - b), default=None)
        if pick is not None and abs((pick[0] + pick[1]) / 2 - b) <= reach:
            got.append(pick)
            last = pick[0]
        else:
            got.append((b, b))
            last = b
    return got


events = []  # (start, end, text) on the film's clock
marks = sorted(take["marks"], key=lambda m: m["t"])
for i, m in enumerate(marks):
    ln = lines[m["idx"]]
    t0 = m["t"] - START
    parts = chunks(ln["show"])
    weights = [max(1, len(p)) for p in parts]
    total = sum(weights)
    est, acc = [], 0.0
    for w in weights[:-1]:
        acc += w
        est.append(ln["dur"] * acc / total)
    w_take, _ = sf.read(f"audio/{m['idx']:02d}.wav", dtype="float32")
    cuts = snap(est, pauses(w_take, SR))
    starts = [0.0] + [max(c[1] - 0.05, c[0]) for c in cuts]
    ends = [min(c[0] + 0.14, c[1]) if c[1] > c[0] else c[0] for c in cuts] + [ln["dur"]]
    for k, p in enumerate(parts):
        events.append([max(0.0, t0 + starts[k] - 0.06), t0 + ends[k], p, k == len(parts) - 1])
# a little linger after the last piece of a line, never into the next
for i, e in enumerate(events):
    nxt = events[i + 1][0] if i + 1 < len(events) else T
    e[1] = min(e[1] + (0.28 if e[3] else 0.0), nxt - 0.02, T)


def ts_ass(t):
    cs = int(round(t * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def ts_srt(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


ass = [
    "[Script Info]", "ScriptType: v4.00+", "PlayResX: 1920", "PlayResY: 1080", "WrapStyle: 2", "ScaledBorderAndShadow: yes", "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: Sub,NOIR Plex Semibold,44,&H00F7F5F4,&H00F7F5F4,&H1C0B0807,&H1C0B0807,0,0,0,0,100,100,0,0,3,12,0,2,120,120,54,1",
    "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
]
srt = []
for n, (a, b, text, _last) in enumerate(events, 1):
    ass.append(f"Dialogue: 0,{ts_ass(a)},{ts_ass(b)},Sub,,0,0,0,,{two_rows(text)}")
    srt += [str(n), f"{ts_srt(a)} --> {ts_srt(b)}", text.replace("\\N", " "), ""]
io.open("out/subs.ass", "w", encoding="utf8", newline="\n").write("\n".join(ass) + "\n")
io.open("out/noir-demo.srt", "w", encoding="utf8", newline="\n").write("\n".join(srt))
print(f"subtitles: {len(events)} events")

# ---------------------------------------------------------------- the picture
frames = take["frames"]
seg = []
for i, f in enumerate(frames):
    s = max(f["t"] - START, 0.0)
    e = (frames[i + 1]["t"] - START) if i + 1 < len(frames) else T
    if e <= 0 or e - s < 0.0005:
        continue
    seg.append((f["name"], e - s))
with io.open("out/frames.txt", "w", encoding="utf8", newline="\n") as fh:
    fh.write("ffconcat version 1.0\n")
    for name, d in seg:
        fh.write(f"file '../take/{name}'\nduration {d:.4f}\n")
    fh.write(f"file '../take/{seg[-1][0]}'\n")
print(f"picture: {len(seg)} frames over {sum(d for _, d in seg):.1f}s (film {T:.1f}s)")

# ----------------------------------------------------------------- the encode
out = "out/noir-demo-clean.mp4" if NO_SUBS else "out/noir-demo.mp4"
subs = "" if NO_SUBS else ",subtitles=out/subs.ass:fontsdir=fonts"
vf = (
    f"[0:v]fps={FPS},scale=1920:1080:flags=lanczos+accurate_rnd:in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,"
    f"format=yuv420p{subs},fade=t=in:st=0:d=0.6,fade=t=out:st={T - 0.9:.2f}:d=0.9[v]"
)
af = f"[1:a]highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,aformat=channel_layouts=stereo,afade=t=in:st=0:d=0.4,afade=t=out:st={T - 1.3:.2f}:d=1.3[a]"
cmd = [
    FF, "-hide_banner", "-loglevel", "error", "-y",
    "-f", "concat", "-safe", "0", "-i", "out/frames.txt", "-i", "out/voice.wav",
    "-filter_complex", vf + ";" + af, "-map", "[v]", "-map", "[a]", "-t", f"{T:.3f}",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", out,
]
subprocess.run(cmd, check=True)
print("wrote", out, f"{os.path.getsize(out) / 1e6:.1f} MB")
