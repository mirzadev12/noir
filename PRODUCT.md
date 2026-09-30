# NOIR — product truth

Working name; the team will rename it later.

## What it is

A VASP attribution and request-routing desk for Indian law enforcement, built for
SIH 2026 problem statement SIH26182 (MHA · I4C, CIS Division): *Automated Attribution of
Unknown Cryptocurrency Wallets to Nearest Virtual Asset Service Providers (VASPs) through
Blockchain Intelligence APIs*.

## Who uses it, and where

An investigator in I4C or a state cyber cell, at a desk in a government office in
daylight, working through wallets that surface during investigations — often unhosted
wallets whose VASP is unknown. Their job with each wallet is to decide which VASP to write
to, and to send that VASP a lawful disclosure or freezing request. They work from files,
registers and letters; the output of this tool goes into those.

## The mechanism

Wallets from many cases are filed on one shared desk. For each, NOIR finds the nearest
VASP on both sides: where its money went (the exchange and the customer deposit address
that received it) and where its money came from (the exchange that funded its payers). It
states each attribution with a confidence and an evidence tier, checks the VASP against the
FIU-IND registration list and records the VASP's law-enforcement channel. The desk groups
every wallet under the VASP it routes to, so the officer drafts **one consolidated request
per VASP** — KYC, access logs, transaction history, preservation and, where an account is
known, a freeze — and tracks what the VASP did with it.

## What must stay true

- Attribution is a deterministic lookup against a provenance-tagged table. No language
  model decides an attribution.
- Confidence is how much evidence was seen, never a probability of being right.
- An unreadable wallet is never reported as empty.
- No statute is printed on a request; the officer supplies the legal basis.
- SAHYOG integration is designed, not live. Nothing claims otherwise.
- Tracing is live for TRON, Ethereum and Polygon (USDT). Other chains are recognised and
  screened against OFAC, not traced.

## Brand commitments

- Name: NOIR (placeholder).
- Look: a dark, precise console with a departures-board desk; see DESIGN.md. NOIR is its
  own product and is never presented alongside or compared with any other.
