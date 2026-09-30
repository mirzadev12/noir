# Backend asks — what L9 did not do, and what it would take

L9 asked for more evidence rows or recorded cases, each with a provenance tag and a source, and
said to skip anything that needs the live network. Every new row of either kind is a live chain
read, so none was added. This file says what was skipped and the command that produces it, so it
can be run deliberately, on a machine with the network, and its output reviewed before it is
committed.

## What was done instead (offline)

- `lib/evidence.ts` counts the provenance the existing rows carry, and `GET /api/registry` serves
  it. `tests/evidence.test.mjs` keeps it true: a tagged wallet without the explorer page that tags
  it, a deposit address without its evidence sentence or without a seed in the same chain's seed
  table, or a recorded case without the moment it was read, fails the build.
- The figures as counted from `data/` on 30 Sep 2026 (re-count before printing them anywhere;
  `evidenceLedger()` is the count):

  | | Total | With provenance |
  | --- | --- | --- |
  | Tagged exchange wallets (seeds) | 37 | 37 name their explorer page |
  | Derived deposit addresses | 565 | 565 carry their evidence; 565 name a seed in the same chain's table |
  | Recorded cases | 14 | 14 say when the chain was read; 13 have their payers recorded |

  By chain: TRON 15 seeds and 241 deposit addresses; Ethereum 12 and 221; Polygon 10 and 103.
  The one recorded case without payers is the Polygon one: NOIR does not run inbound on Polygon.

## Skipped: needs the live network

Each of these reads a chain or a list on the internet. Run them with the app's own scripts; do
not type a row in by hand.

| What | Command | What to check before committing |
| --- | --- | --- |
| More TRON deposit addresses | `node scripts/cluster.mjs` | Each new row has `evidence`, `sweepCount`, `confidence` and a `hotWallet` that is in `data/hot-wallets.json` |
| More Ethereum deposit addresses | `node scripts/cluster-eth.mjs --merge` | Each new row has `evidence` and a `seed` that is in `data/eth/hot-wallets.json` |
| More Polygon deposit addresses | `node scripts/cluster-eth.mjs --chain polygon --merge` | The same, against `data/polygon/hot-wallets.json` |
| A new tagged exchange wallet (a seed) | Add it to the chain's `hot-wallets.json` with the tag as the explorer shows it and `source_url` of the explorer page for that address | The page still shows the tag on the day it is added; note the day in `verified` |
| More recorded TRON cases | `node scripts/freeze-cases.mjs` (dev server up, not in recorded mode) | The case carries the SHA-256 of every chain response and `provenance.generatedAt` |
| More recorded Ethereum or Polygon cases | `node scripts/freeze-eth-cases.mjs [WARM] [--chain polygon]` | The same |
| One named wallet as a recorded case | `node scripts/add-case.mjs <address>` | The same |
| Payers for the recorded cases | `node --import ./tests/register.mjs scripts/freeze-payers.mjs` | A wallet whose payers could not be read is left out, not recorded as having none |
| The OFAC list | `node scripts/refresh-sanctions.mjs` | The publication date in the file moved forward; removals are refused unless asked for |

After any of them: `node --import ./tests/register.mjs --test "tests/*.test.mjs"`. The evidence
test refuses a row without provenance, and the landing, the registry and the figures above
re-count themselves from the files.

## Not asked for, and not done

- No Indian exchange was added as a seed beyond what the tables hold. A seed needs an explorer
  tag for a specific address; `scripts/hunt-indian-vasp.mjs` looks for one and writes down what
  it finds. None is invented.
- Bitcoin, Solana and BNB tracing are not evidence rows; they are readers that do not exist yet
  (`lib/coverage.ts`, item "Chain coverage").
