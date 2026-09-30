# YouTube and the slides

The film is 2 min 52 s at 1080p, with the AI voiceover and the subtitles burned in. Files are in
`Videos\NOIR-demo\`: `noir-demo.mp4` (1080p master, for YouTube), `noir-demo-720p.mp4` (for the slides) and
`noir-demo.srt`.

## Upload

1. YouTube Studio, Create, Upload videos, choose `noir-demo.mp4`.
2. Paste the title and description below. Audience: not made for kids. Visibility: Unlisted is enough if the
   portal takes a link; Public if it asks for one.
3. The subtitles are already in the picture. You do not need to upload `noir-demo.srt`. If you want YouTube's
   own caption track as well (search, translation, the CC button), upload it under Subtitles, Add, Upload
   file, With timing; viewers who switch CC on will then see the words twice, so build the version without
   burned subtitles first (`python assemble.py --no-subs` in `video/`) and upload that one instead.
4. Copy the link into the portal and into the last slide.

## Title

NOIR: Attributing Unknown Crypto Wallets to the Nearest VASP | SIH 2026 (SIH26182)

(82 characters; YouTube allows 100. Drop the last part if you would rather not name the event in the title.)

## Description

NOIR takes an unknown cryptocurrency wallet and finds the nearest VASP in both directions: the exchange
account that received its money, and the exchange that funded it. It files the wallet on one shared desk under
the exchange it leads to, so an officer drafts one consolidated request per exchange (KYC, access logs,
transaction history, preservation and, where an account is known, a freeze) and records what the exchange did.

What to know about it
- Attribution is a deterministic lookup against a provenance-tagged table. No language model decides it.
- Confidence is how much evidence was seen, in words. It is never a probability.
- An unreadable wallet is never reported as empty.
- No statute is printed on a request; the officer writes the legal basis.
- Tracing is live for TRON, Ethereum and Polygon (USDT). Other chains are recognised and screened against the
  OFAC list, not traced. SAHYOG integration is designed, not live.
- The film runs on recorded chain reads of real wallets, marked "Recorded" on screen.

Live site: https://noir-lmot.onrender.com/
Source: https://github.com/mirzadev12/noir

The narration is an AI-generated voice. Subtitles are burned in.

Chapters
0:00 The problem
0:12 One wallet, traced both ways
0:35 What NOIR can name
0:50 Filing wallets, and the desk
1:27 One exchange, one request
2:03 What each exchange did
2:15 One wallet's own file
2:28 What NOIR does not say

## Tags

crypto tracing, blockchain analytics, VASP, cybercrime, law enforcement, USDT, TRON, Ethereum, Polygon,
OFAC, FIU-IND, wallet attribution, cryptocurrency investigation

## In the slides

Insert, Video, This Device, and pick `noir-demo-720p.mp4` (14 MB, so the deck stays light). Under Playback set
Start to When Clicked, and leave Play Full Screen on. For a deck that will be opened online, insert the
YouTube link instead (Insert, Video, Online Video) and keep the file as the fallback.
