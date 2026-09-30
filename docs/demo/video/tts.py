"""Speak every narration line with a local neural voice (Kokoro, open weights, runs on the CPU) and write
each take's duration into work/timeline.json. The first run downloads the voice model (about 350 MB) into work/."""
import io, json, os, sys, urllib.request
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.environ.get("NOIR_DEMO_WORK") or os.path.join(HERE, "work")
os.makedirs(os.path.join(WORK, "audio"), exist_ok=True)
N = json.load(io.open(os.path.join(HERE, "narration.json"), encoding="utf8"))
os.chdir(WORK)

RELEASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
for f in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
    if not os.path.exists(f):
        print("downloading", f)
        urllib.request.urlretrieve(RELEASE + f, f)
k = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")

# The phonemiser stresses "Ethereum" on the wrong syllable; say it as people do.
FIX = {"ˌiːθɚɹˈiːəm": "ɪθˈɪɹiəm"}


def trim(x, sr, thr=0.006, pad=0.05):
    """Cut the silence the model leaves at either end, keeping a breath of it."""
    loud = np.where(np.abs(x) > thr)[0]
    if len(loud) == 0:
        return x
    a = max(0, loud[0] - int(pad * sr))
    b = min(len(x), loud[-1] + int(pad * sr))
    return x[a:b]


idx = 0
total = 0.0
for sc in N["scenes"]:
    for ln in sc["lines"]:
        ph = k.tokenizer.phonemize(ln["say"], N["lang"])
        for a, b in FIX.items():
            ph = ph.replace(a, b)
        samples, sr = k.create(ph, voice=N["voice"], speed=N["speed"], lang=N["lang"], is_phonemes=True)
        samples = trim(np.asarray(samples, dtype=np.float32), sr)
        peak = float(np.max(np.abs(samples)))
        sf.write(f"audio/{idx:02d}.wav", samples, sr, subtype="PCM_16")
        ln["idx"] = idx
        ln["dur"] = round(len(samples) / sr, 3)
        ln["sr"] = sr
        total += ln["dur"]
        print(f"{idx:02d} {sc['id']:9s} {ln['dur']:6.2f}s peak {peak:.2f} rms {float(np.sqrt(np.mean(samples**2))):.3f} | {ln['show'][:70]}")
        idx += 1

json.dump(N, io.open("timeline.json", "w", encoding="utf8"), indent=1, ensure_ascii=False)
print(f"lines {idx}, speech {total:.1f}s")
