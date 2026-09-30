"""Make a static IBM Plex Sans SemiBold from the built site's own variable font, for the burned subtitles.
Needs `npm run build` to have run: the font is one of the woff2 files Next put in .next/static/media."""
import glob, os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
WORK = os.environ.get("NOIR_DEMO_WORK") or os.path.join(HERE, "work")
os.makedirs(os.path.join(WORK, "fonts"), exist_ok=True)

src = None
for path in sorted(glob.glob(os.path.join(ROOT, ".next", "static", "media", "*.woff2"))):
    try:
        f = TTFont(path)
    except Exception:
        continue
    cmap = f.getBestCmap() or {}
    family = f["name"].getDebugName(1) or ""
    if "Plex Sans" in family and "fvar" in f and 0x41 in cmap and 0x3A in cmap:  # the Latin file, not the Cyrillic or Greek ones
        src = f
        print("using", os.path.basename(path), family)
        break
if src is None:
    sys.exit("IBM Plex Sans (Latin, variable) not found in .next/static/media: run `npm run build` first.")

inst = instancer.instantiateVariableFont(src, {"wght": 600})
for rec in list(inst["name"].names):
    if rec.nameID in (1, 16):
        inst["name"].setName("NOIR Plex Semibold", rec.nameID, rec.platformID, rec.platEncID, rec.langID)
    elif rec.nameID in (2, 17):
        inst["name"].setName("Regular", rec.nameID, rec.platformID, rec.platEncID, rec.langID)
    elif rec.nameID == 4:
        inst["name"].setName("NOIR Plex Semibold", 4, rec.platformID, rec.platEncID, rec.langID)
    elif rec.nameID == 6:
        inst["name"].setName("NOIRPlex-Semibold", 6, rec.platformID, rec.platEncID, rec.langID)
inst["OS/2"].usWeightClass = 400  # one static face, named for itself: ask for it by name, plain
inst.flavor = None
out = os.path.join(WORK, "fonts", "NOIRPlexSemibold.ttf")
inst.save(out)
print("wrote", out)
