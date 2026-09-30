# Demo film

A 2 min 52 s film of NOIR for the submission slides and for YouTube. It is a screen recording of the
production build in recorded mode (`DEMO_MODE=true`), so every name, address and figure on screen is what
NOIR shows and nothing is drawn for the film. The narration is an AI voice (Kokoro, open weights, run on the
CPU of the machine that made the film) and the subtitles are burned in.

## Files

| File | What it is |
| --- | --- |
| `noir-demo.srt` | The 39 subtitle cues, the same words as the burned-in ones, for YouTube's caption upload |
| `youtube.md` | Title, description, chapters and the upload and slide steps |
| `video/` | The scripts that make the film, and `narration.json`, its script. `video/README.md` says how to run them |
| `frames/` | Ten key frames at 1920x1080, made for the generated clips this film first planned; usable as thumbnails |

The film itself (`noir-demo.mp4`, 1080p, 38 MB; `noir-demo-720p.mp4`, 14 MB, for slides and phones) is not in
the repository: it is in `Videos\NOIR-demo\` on the machine that made it, and `video/README.md` rebuilds it.

## Script, by scene

| From | On screen | Narration (these words are also the subtitles) |
| --- | --- | --- |
| 0:00 | The hall: the claim, then the trace panel scrolls into view | A cyber-fraud complaint comes in. The money has already moved, through wallets nobody can name. The investigator has an address, and one question: which exchange do I write to? |
| 0:12 | One recorded wallet traced both ways; each node is picked out as it is named | NOIR answers it. It follows each wallet both ways. Back, to the exchange that funded it. Forward, to the exchange account that received its money. This is a real wallet, from a recorded read of the TRON chain. MEXC funded one of its payers. Its money passed through one hop and reached Binance's own wallet. And part of it reached an address on the OFAC sanctions list. |
| 0:35 | The counted figures: 17 exchanges, 1,043 listed addresses | Attribution is a deterministic lookup, not a guess. No language model decides it. NOIR can name seventeen exchanges across TRON, Ethereum and Polygon, and screens every wallet against more than a thousand sanctioned addresses. |
| 0:50 | Three wallets pasted, a case reference typed, filed to the desk | Filing is one step. Paste one address, or five hundred, from one case or many. Each line is checked before a single chain is read. |
| 1:00 | The desk: the next exchange to write to, follow-ups, OFAC flags, the departures board | Every wallet lands on one shared desk, under the exchange it leads to. At the top, NOIR names the exchange to write to next, and what needs following up. Wallets that touch a sanctioned address are flagged before any request is sent. Below is a departures board: each exchange, the wallets waiting on it, the money that moved, whether it is registered with FIU-IND, and whether its request has gone. |
| 1:27 | One exchange's page: how to reach it, the wallets that lead there, evidence in words | Open an exchange, and every wallet that leads there is on one page, from every case, in both directions. NOIR records how the exchange receives a law-enforcement request, copied from the exchange's own page. Each wallet states how much evidence was seen, in words. Never a percentage. |
| 1:45 | The asks, one click, and the letter with its blank legal-basis line | Then one click drafts one consolidated request: KYC, access logs, transaction history, preservation, and a freeze where the account is known. It prints as a letter. The legal basis is left blank, for the officer to supply. |
| 2:03 | The register of requests and what each exchange did | NOIR records what each exchange did with it: acknowledged, sent the data, froze the account, refused, or did not answer. And it warns when a reply is late. |
| 2:15 | One wallet's own file: its trace, route, patterns and the hash of every chain response | Every wallet keeps its own file: the trace, the route, the patterns observed, and a hash of every chain response it was read from. So an attribution can be checked again, by anyone. |
| 2:28 | The Method page: what is built, what is partial, what NOIR does not say | NOIR also says what it cannot do. Its method page lists what is built, what is partial, and what is not. An unreadable wallet is never reported as empty. And confidence is how much evidence was seen, never a chance of being right. |
| 2:45 | The hall again, then the end card | NOIR. Every unknown wallet has a destination. |

Nothing in the narration says that attribution is accurate to a percentage (confidence is how much evidence
was seen), that SAHYOG integration is live (it is designed), that a statute is printed on a request, or
any amount in rupees. The wallet in the trace is a recorded read of a real wallet, and the narration says so.

## Why a recording, and where Higgsfield stands

The plan was to open and close the film with Seedance 2.5 clips generated from key frames in `frames/`. Two
things ruled that out on 30 Sep 2026. The account the Higgsfield CLI is signed in to is on the free plan with
0 credits, so no generation can run. And a video model redraws what it is given, which is wrong for a film
whose value is that the figures on screen are the site's own. So the picture is the site itself, driven by
`video/record.cjs`, and the voice is generated locally instead of with `seed_audio`.

If credits are added, both can be swapped in without changing anything else:

- Voice: `higgsfield generate create seed_audio --prompt "<line>" --voice_type preset --voice_id <id> --wait`
  is quoted at 0.3 credits a take, so the 26 takes are about 8 credits. Save each take as
  `work/audio/NN.wav` (24 kHz mono) and run `assemble.py` again; timings are read from the takes.
- Opening and closing clips: `higgsfield generate create seedance_2_5 --mode omni_reference --start-image
  docs/demo/frames/01-hall.png --duration 5 --resolution 1080p --aspect_ratio 16:9 --prompt "<prompt>" --wait`
  is 12 credits a second at 1080p (60 for five seconds). Keep the prompt to slow camera movement and light
  along the lines, say that every word and number must stay as in the image, and discard a clip in which any
  name, address or figure has changed.
