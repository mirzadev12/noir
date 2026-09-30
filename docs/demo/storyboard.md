# Demo video — storyboard

A one-minute film of NOIR. The product shots are a screen recording of the production build in
recorded mode (`DEMO_MODE=true`), so every name, address and figure on screen is what NOIR shows:
nothing in them is drawn for the film. Generated clips are used only to open and close it, and each
starts from a real frame in [`frames/`](frames/).

## What exists

| File | What it is |
| --- | --- |
| `frames/01-hall.png` … `frames/10-wallet-trace.png` | Ten key frames, 1920×1080, captured from the production build on 30 Sep 2026 with motion at rest |
| `noir-walkthrough.webm` (not in the repository: 21 MB) | The recorded walkthrough, 56 s, 1920×1080, motion on. Re-record it with the steps under "Recording it again" |

## Shots

| # | Seconds | Source | On screen | Line to say |
| --- | --- | --- | --- | --- |
| 1 | 0–5 | generated from `frames/01-hall.png` | The hall: the claim, the trace panel below it | "An investigator has a wallet and no idea which exchange to write to." |
| 2 | 5–13 | walkthrough 0:03–0:11 | The trace draws: MEXC funded it, the wallet, a hop, Binance's own wallet; a branch to an address on the OFAC list | "NOIR follows it both ways: back to the exchange that funded it, forward to the exchange account that received its money." |
| 3 | 13–21 | walkthrough 0:11–0:19 | The counted figures, then the desk as a departures board | "Every figure here is counted from the repository. Every traced wallet is filed under the exchange it leads to." |
| 4 | 21–25 | walkthrough 0:20–0:24 | Many cases meeting at one exchange | "Many cases, one exchange, one request." |
| 5 | 25–33 | walkthrough 0:24–0:32 | The desk: the sign naming the next exchange to write to, the board | "The desk says who to write to next, and what is overdue." |
| 6 | 33–44 | walkthrough 0:32–0:43 | One exchange's page, then its request as an A4 letter | "One consolidated request per exchange. The legal basis is left blank for the officer." |
| 7 | 44–52 | walkthrough 0:43–0:52 | One wallet's page: its own trace, drawn from its own record | "Each attribution states how much evidence was seen, and carries the hash of every chain response it read." |
| 8 | 52–57 | generated from `frames/02-trace.png`, or walkthrough 0:54–0:56 | The hall again | "NOIR. Every unknown wallet has a destination." |

Lines that must not be said: that attribution is "accurate" to a percentage (confidence is how much
evidence was seen), that SAHYOG integration is live (it is designed), that any statute is printed on
a request, or any amount in rupees.

## Generated clips

Model: Seedance 2.5, image-to-video from a real frame, 16:9. A video model redraws what it is
given, so small type can come out wrong: keep the clips short, keep the camera moving slowly, and
cut to the recording before anyone reads a figure. Discard a clip in which a name, an address or a
number has changed.

Shot 1, five seconds:

```bash
higgsfield generate create seedance_2_5 --mode omni_reference --start-image docs/demo/frames/01-hall.png --duration 5 --resolution 1080p --aspect_ratio 16:9 --prompt "Slow, steady push-in on a dark software console on a near-black ground. Keep every word, letter and number exactly as in the image; add no text and no new interface elements. Thin electric-blue route lines glow softly and a faint light travels along them left to right. No camera shake, no people, no logos." --wait
```

Shot 8, five seconds:

```bash
higgsfield generate create seedance_2_5 --mode omni_reference --start-image docs/demo/frames/02-trace.png --duration 5 --resolution 1080p --aspect_ratio 16:9 --prompt "Slow, steady pull-back from a dark software console showing a flow diagram of connected boxes. Keep every word, letter and number exactly as in the image; add no text and no new interface elements. A soft electric-blue light travels along the connecting lines in the direction of the arrows. No camera shake, no people, no logos." --wait
```

What they cost, as quoted by the CLI on 30 Sep 2026: 12 credits a second at 1080p (five seconds is
60 credits, so the two clips are 120), or 56 credits for eight seconds at 720p. Ask again before
spending:

```bash
higgsfield generate cost seedance_2_5 --mode omni_reference --start-image docs/demo/frames/01-hall.png --duration 5 --resolution 1080p --aspect_ratio 16:9
```

The account the CLI is signed in to held 0 credits on 30 Sep 2026, so nothing has been generated.
Without the generated clips the film is complete as the walkthrough alone: shots 1 and 8 become the
first three and the last two seconds of the recording.

## Recording it again

1. `npm run build`, then `DEMO_MODE=true npx next start -p 3032` with a desk that holds the recorded
   cases (on an empty desk, **Load the recorded cases**).
2. Record a 1920×1080 browser window, motion on, in this order: `/` (hold three seconds, scroll to
   the trace and hold five, then the counted figures, the board, the many-cases diagram), `/desk`
   (the sign, then the board), `/vasp/MEXC` (then its wallets), `/vasp/MEXC/request`,
   `/wallet/TTQd8Bo1nhKEVgkKJVP3SRYZ1nDNStckvj?chain=tron` (scroll to the trace and hold five),
   `/cases`, `/`.
3. The trace draws once when its page opens; open the page, then start the scroll.
