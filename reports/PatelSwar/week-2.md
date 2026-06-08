# Week 2 — Patel Swar

**Team:** Team E — Indic

**Module owned:** Gujarati glossary + legal translation handoff

**Week of:** 25-05-2026

---

## What I shipped this week

- Seeded the first 30 EN→Gujarati glossary entries into `packages/translation/data/glossary.json` (legal & consumer domains).
- Ensured the new entries follow the same schema as the Hindi glossary so downstream tooling can reuse `lookupGlossary()` unchanged.
- Updated the repo-tracked glossary fixture; entries are `language: "gu"` and marked `status: "approved"` for seeding.

---

## Demo

Demo focus: show the `glossary.json` diff and how Gujarati entries align with existing Hindi entries.

Summary:

- The file `packages/translation/data/glossary.json` now contains 30 additional Gujarati entries.
- These entries cover core contract, consumer, procedure, and general legal terms to bootstrap the translator flow.

---

## Metrics

| Metric | Value | Notes |
|---|---:|---|
| Seeded terms | 30 | First pass EN→GU seed |
| Files modified | 1 | `packages/translation/data/glossary.json` |
| PR status | Draft pending | Branch + draft PR to be opened |

---

## Blockers

- Final canonical review of Gujarati terms depends on Megh (glossary infra and review process).
- PageIndex node IDs are still stabilizing; most new entries are term-only and may be enriched later with `node_id` values.

---

## Next week

- Create a `week-2/gujarati-glossary` branch and open a draft PR with this change.
- Coordinate with Megh for final term canonicalisation and any required schema fields (e.g., `node_id`, `act_code`).
- Expand the glossary to the next 30 terms and run a basic integration smoke-test with the Translator Agent stubs.

---

### Mentor feedback (filled by repo manager Friday 7 PM IST)

> <repo manager writes 1 line here>
