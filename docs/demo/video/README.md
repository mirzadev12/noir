# Making the film

`record.cjs` drives the production build through the script in `narration.json`, `tts.py` speaks the script,
`assemble.py` lays the voice on the recording, cuts the subtitles from the same words and encodes the MP4.
Everything it makes goes in `work/` (ignored by git), or in the folder named by `NOIR_DEMO_WORK`.

Tested on Windows 11 with Python 3.12, Node 24 and Google Chrome 154.

## Once

```bash
python -m venv .venv
.venv/Scripts/pip install -r docs/demo/video/requirements.txt     # .venv/bin/pip on macOS and Linux
npm install --no-save playwright-core                              # drives your installed Chrome
npm run build                                                      # the film records the production build
```

## Every take

1. Start the site on a desk with nothing filed, in recorded mode, then stage the demo desk. The take files
   three wallets and drafts a request, so restage before each one.

   ```bash
   DEMO_MODE=true NOIR_STATE_DIR="$(mktemp -d)" npx next start -p 3036
   node docs/demo/video/stage-desk.mjs            # nine wallets under three cases, three requests at three stages
   ```

2. Speak the script, make the subtitle font and record:

   ```bash
   .venv/Scripts/python docs/demo/video/tts.py    # first run downloads the voice model (350 MB) into work/
   .venv/Scripts/python docs/demo/video/font.py   # IBM Plex Sans SemiBold, from the site's own font
   node docs/demo/video/record.cjs                # about three minutes; leave the machine alone
   ```

3. Build the film:

   ```bash
   .venv/Scripts/python docs/demo/video/assemble.py               # work/out/noir-demo.mp4 with subtitles, and noir-demo.srt
   .venv/Scripts/python docs/demo/video/assemble.py --no-subs     # work/out/noir-demo-clean.mp4
   ```

   ffmpeg is taken from `imageio-ffmpeg`; set `FFMPEG` to use your own (it needs libass for the subtitles).
   The encode takes about four minutes.

## Changing the script

`narration.json` holds each line twice: `show` is the subtitle and `say` is what the voice reads, spelled so it
is pronounced (`Noir`, `Mex C`, `F I U India`). Scenes and lines are numbered in the order they are spoken, and
the cues in `record.cjs` refer to them (`L.trace[2]` is the third line of the `trace` scene), so adding or
removing a line means editing its scene's cues too. The hold on each line is its take's length, so nothing
else needs retiming.
