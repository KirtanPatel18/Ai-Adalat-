# Week 2 — Kaushal Vora

**Team:** Team F — Evals & Telemetry
**Module owned:** Hallucination & completeness eval
**Week of:** 2026-05-29

---

## What I shipped this week

- Implemented `hallucinationRate` metric using an LLM-as-judge (via `@trionic/agents` LLMRouter) to segment legal claims and flag spans lacking `[CITE:<node_id>]` markers.
- Implemented `completeness` metric using a hybrid approach: regex-heuristics to aggressively identify core structural headers (`pio_address`, `applicant_details`, `information_requested`, `payment_details_declaration`), falling back to an LLM semantic judge if regex checks fail to reach 100%.
- Integrated both metrics into the `EvalRunResult` output in the main test harness (`packages/evals/src/run.ts`).
- Created 10 JSON fixtures simulating different edge cases for RTI applications (`rti-hallucination.json` and `rti-completeness.json`).

---

## Demo

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

---

## Metrics

| Metric | Value | Notes |
|---|---|---|
| PRs merged | 1 | Week 2 Evals PR |
| Fixtures added | 10 | 5 for Hallucination, 5 for Completeness |
| Target Completeness | 100% | Verified via LLM fallback |
| Target Hallucination | 0% | Measured on claim spans |

---

## Blockers

- Found that `npx` and `pnpm` paths were not immediately accessible in some sub-shells, requiring the Trionic team members to execute `pnpm install` manually, but it didn't block the logic implementation.
- API Endpoint (`POST /api/admin/evals/run`) is currently designed to accept only `dataset_id` and `models`, meaning results computation might happen via an async worker. Local harness computes perfectly fine though.

---

## Next week

- Extend `completeness` logic to cover non-RTI templates like Legal Notices and NDAs.
- Optimize LLM prompt tokens for the judge models to reduce telemetry costs.
- Verify that `eval_runs` successfully ingests our new metrics payload from the asynchronous queue.

---

### Mentor feedback (filled by repo manager Friday 7 PM IST)

> 
