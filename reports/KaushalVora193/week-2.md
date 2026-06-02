# Week 2 — Kaushal Vora

**Team:** Team F — Evals & Telemetry
**Module owned:** Hallucination & completeness eval
**Week of:** 2026-05-26

---

## What I shipped this week

- Implemented `packages/evals/src/metrics/hallucinationRate.ts` — counts spans of legal claim sentences in the draft output that do not contain a `[CITE:<node_id>]` marker (target: 0% hallucination rate). [PR pending](https://github.com/Trionic-Interns/trionic-ai-adalat)
- Implemented `packages/evals/src/metrics/completeness.ts` — verifies the presence of required template fields (such as `address`, `subject`, `sections_sought`, and `declaration` for `rti_application`) using custom keyword matching. [PR pending](https://github.com/Trionic-Interns/trionic-ai-adalat)
- Created `packages/evals/fixtures/hallucination_completeness.json` — 5 realistic RTI fixtures to evaluate and test different completeness levels (50%, 75%, 100%) and hallucination rates (0%, 50%, 100%). [PR pending](https://github.com/Trionic-Interns/trionic-ai-adalat)
- Updated `packages/evals/src/run.ts` — wired hallucination and completeness rates into the main harness execution flow and mapped them to `EvalRunResult.metrics` as `{ name: "hallucination_rate", ... }` and `{ name: "completeness_rate", ... }` to comply with `@trionic/shared` types. [PR pending](https://github.com/Trionic-Interns/trionic-ai-adalat)
- Merged the `main` branch to sync all type definitions and schemas with the rest of the cohort.

---

## Demo

The updated harness runs on the new `hallucination_completeness.json` fixture:

```bash
npx tsx src/run.ts --fixture fixtures/hallucination_completeness.json
```

Output showcases:
* Per-fixture validation status showing which citations are invalid, which legal claim spans are uncited (hallucinated), and which required template fields are missing.
* A unified `EvalRunResult` JSON containing the aggregated `citation_validity_rate`, `hallucination_rate`, and `completeness_rate`.

---

## Metrics

| Metric | Value | Notes |
|---|---|---|
| PRs opened | 1 | Week-2 evals branch |
| Fixtures created | 1 | `hallucination_completeness.json` (5 test drafts) |
| Metrics implemented | 2 | Hallucination Rate, Completeness Rate |
| Overall Hallucination target met | 0% | Metric registers 0% in perfect drafts |
| Overall Completeness target met | 100% | Metric registers 100% in complete drafts |

---

## Blockers

- **None.** Clean integration with Kirtan's harness and shared typescript types.

---

## Next week

- Coordinate with Ayush (@ThummarAyush) to map the newly added `hallucination_rate` and `completeness_rate` metrics to the admin dashboard views on `/admin/evals`.
- Expand testing coverage by creating additional fixtures for non-RTI document types (NDA, Legal Notice, Consumer Complaint) with different required sections.
- Sync with Malay's team on replacing mock drafts with real LLM outputs from the pipeline.

---

### Mentor feedback (filled by repo manager Friday 7 PM IST)

> 
