# The submission text

What to paste into the submission form. The one-page document that says in short what NOIR does was made as
a shareable doc in the team's Claude account; its text is the same as below, in the same order.

## Video title

NOIR: Attributing Unknown Crypto Wallets to the Nearest VASP | SIH 2026 (SIH26182)

## Description

NOIR names the exchange an investigator should write to about an unknown crypto wallet, in both directions, and drafts one request per exchange for every case that leads there.

For each wallet it finds the nearest VASP on both sides: the exchange account that received its USDT (the account a freeze must name) and the exchange that funded it. Every result states how much evidence was seen, in words, and keeps the hash of every chain response it read. Wallets are screened against the OFAC list, and each exchange against the FIU-IND registration list, with its law-enforcement channel copied from its own page.

Wallets from many cases are filed on one shared desk under the exchange they lead to. NOIR drafts one consolidated request per exchange (KYC, access logs, transaction history, preservation and, where an account is known, a freeze) as a print-ready letter, then records what the exchange did and warns when a reply is late.

Attribution is a deterministic lookup, not a language model. Confidence is how much evidence was seen, never a probability. An unreadable wallet is never reported as empty. Tracing is live for TRON, Ethereum and Polygon (USDT); other chains are recognised and screened, not traced. SAHYOG integration is designed, not live.

Live site: https://noir-lmot.onrender.com/
Source: https://github.com/mirzadev12/noir
Demo film: (the YouTube link, once the film is uploaded)

The description is 1,376 characters. If the form allows less, the first paragraph (176 characters) stands alone.

## Figures in the one-page document

Counted from `data/` and the code on 30 Sep 2026, and printed in the document: 17 VASPs across TRON, Ethereum and
Polygon; 565 deposit addresses; 14 law-enforcement channels; 1,043 OFAC-listed addresses (list of 18 Sep 2026);
18 capabilities, of which 13 are built, 4 partial and 1 not built; 282 automated tests, all passing. They are the
same figures the landing page counts at build time. Recount them before changing any of them.
