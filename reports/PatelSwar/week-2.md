# Week-2 Report — Patel Swar

**Team:** Team E — Indic

**Issue:** #124 — Gujarati glossary seed (Week 2)

**Branch:** `/-week-2` (draft)

**Week of:** 2026-05-26

Summary
- Seeded the first 30 English → Gujarati legal glossary entries and added a Gujarati glossary file so translation infra can consume Gujarati terms during Week-2 work.

What I changed
- Added Gujarati glossary file: `packages/translation/data/glossary.gu.json` (30 draft entries).
- Seeded Gujarati entries into `packages/translation/data/glossary.json` as part of the shared seed set.

Files added/updated
- `packages/translation/data/glossary.gu.json` — 30 draft Gujarati entries (EN→GU) (draft status).
- `packages/translation/data/glossary.json` — updated seed entries (EN→GU entries appended).

Acceptance criteria (from issue)
- First 30 EN→Gujarati legal terms present in glossary (seeded) — Complete (draft entries added).
- i18n message file for Gujarati seeded (matches next-intl setup) — Glossary file added; next-intl message integration pending Vraj's setup validation.

How I tested
- Verified JSON validity for the new file in `packages/translation/data/`.
- Ensured entry shape matches `glossary.hi.json` contract used by translation lookup.

Next steps
- Create the `/-week-2` branch, commit these changes, and push a draft PR for review.
- Coordinate with Megh to confirm any node_id/snapshot differences and update translations if required.
- Prepare a 60-second demo note and include it in `reports/week-2.md` for Demo Day.




Owner: Patel Swar
