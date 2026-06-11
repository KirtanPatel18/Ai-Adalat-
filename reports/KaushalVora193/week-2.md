# Week 2 — Kaushal Vora

**Team:** Team F — Evals & Telemetry
**Module owned:** Hallucination & completeness eval
<<<<<<< HEAD
**Week of:** 2026-05-29
=======
**Week of:** 2026-05-26
>>>>>>> 72062ff86dee95c969a17a2c1635342e3441178f

---

## What I shipped this week

<<<<<<< HEAD
- Implemented `hallucinationRate` metric using an LLM-as-judge (via `@trionic/agents` LLMRouter) to segment legal claims and flag spans lacking `[CITE:<node_id>]` markers.
- Implemented `completeness` metric using a hybrid approach: regex-heuristics to aggressively identify core structural headers (`pio_address`, `applicant_details`, `information_requested`, `payment_details_declaration`), falling back to an LLM semantic judge if regex checks fail to reach 100%.
- Integrated both metrics into the `EvalRunResult` output in the main test harness (`packages/evals/src/run.ts`).
- Created 10 JSON fixtures simulating different edge cases for RTI applications (`rti-hallucination.json` and `rti-completeness.json`).
=======
- Implemented `packages/evals/src/metrics/hallucinationRate.ts` — counts spans of legal claim sentences in the draft output that do not contain a `[CITE:<node_id>]` marker (target: 0% hallucination rate). [PR pending](https://github.com/Trionic-Interns/trionic-ai-adalat)
- Implemented `packages/evals/src/metrics/completeness.ts` — verifies the presence of required template fields (such as `address`, `subject`, `sections_sought`, and `declaration` for `rti_application`) using custom keyword matching. [PR pending](https://github.com/Trionic-Interns/trionic-ai-adalat)
- Created `packages/evals/fixtures/hallucination_completeness.json` — 5 realistic RTI fixtures to evaluate and test different completeness levels (50%, 75%, 100%) and hallucination rates (0%, 50%, 100%). [PR pending](https://github.com/Trionic-Interns/trionic-ai-adalat)
- Updated `packages/evals/src/run.ts` — wired hallucination and completeness rates into the main harness execution flow and mapped them to `EvalRunResult.metrics` as `{ name: "hallucination_rate", ... }` and `{ name: "completeness_rate", ... }` to comply with `@trionic/shared` types. [PR pending](https://github.com/Trionic-Interns/trionic-ai-adalat)
- Merged the `main` branch to sync all type definitions and schemas with the rest of the cohort.
>>>>>>> 72062ff86dee95c969a17a2c1635342e3441178f

---

## Demo

<<<<<<< HEAD
Here is an example output from the newly enhanced local Eval Harness measuring our two new metrics on a generated draft:

```
==============================================
 Trionic Adalat — Eval Harness
==============================================

Dataset:   rti-hallucination-set
Fixture:   fixtures/rti-hallucination.json
Models:    claude-sonnet-4-20250514
Cases:     5

--- Running model: claude-sonnet-4-20250514 ---

  Fixture: rti-hall-001-perfect
  Citations: 2/2 valid
  Citation Status:    PASS
  Hallucination Rate: 0.0%
  Hallucination Status: PASS
  Completeness Score: 100.0%
  Completeness Status:  PASS
```
=======
The updated harness runs on the new `hallucination_completeness.json` fixture:

```bash
npx tsx src/run.ts --fixture fixtures/hallucination_completeness.json
```

Output showcases:
* Per-fixture validation status showing which citations are invalid, which legal claim spans are uncited (hallucinated), and which required template fields are missing.
* A unified `EvalRunResult` JSON containing the aggregated `citation_validity_rate`, `hallucination_rate`, and `completeness_rate`.
>>>>>>> 72062ff86dee95c969a17a2c1635342e3441178f

---

## Metrics

| Metric | Value | Notes |
|---|---|---|
<<<<<<< HEAD
| PRs merged | 1 | Week 2 Evals PR |
| Fixtures added | 10 | 5 for Hallucination, 5 for Completeness |
| Target Completeness | 100% | Verified via LLM fallback |
| Target Hallucination | 0% | Measured on claim spans |
=======
| PRs opened | 1 | Week-2 evals branch |
| Fixtures created | 1 | `hallucination_completeness.json` (5 test drafts) |
| Metrics implemented | 2 | Hallucination Rate, Completeness Rate |
| Overall Hallucination target met | 0% | Metric registers 0% in perfect drafts |
| Overall Completeness target met | 100% | Metric registers 100% in complete drafts |
>>>>>>> 72062ff86dee95c969a17a2c1635342e3441178f

---

## Blockers

<<<<<<< HEAD
- Found that `npx` and `pnpm` paths were not immediately accessible in some sub-shells, requiring the Trionic team members to execute `pnpm install` manually, but it didn't block the logic implementation.
- API Endpoint (`POST /api/admin/evals/run`) is currently designed to accept only `dataset_id` and `models`, meaning results computation might happen via an async worker. Local harness computes perfectly fine though.
=======
- **None.** Clean integration with Kirtan's harness and shared typescript types.
>>>>>>> 72062ff86dee95c969a17a2c1635342e3441178f

---

## Next week

<<<<<<< HEAD
- Extend `completeness` logic to cover non-RTI templates like Legal Notices and NDAs.
- Optimize LLM prompt tokens for the judge models to reduce telemetry costs.
- Verify that `eval_runs` successfully ingests our new metrics payload from the asynchronous queue.
=======
- Coordinate with Ayush (@ThummarAyush) to map the newly added `hallucination_rate` and `completeness_rate` metrics to the admin dashboard views on `/admin/evals`.
- Expand testing coverage by creating additional fixtures for non-RTI document types (NDA, Legal Notice, Consumer Complaint) with different required sections.
- Sync with Malay's team on replacing mock drafts with real LLM outputs from the pipeline.
>>>>>>> 72062ff86dee95c969a17a2c1635342e3441178f

---

### Mentor feedback (filled by repo manager Friday 7 PM IST)

> 
