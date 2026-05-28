# Week 2 — Kirtan Patel

**Team:** Team F — Evals & Telemetry
**Module owned:** Citation-correctness eval framework
**Week of:** 2026-05-26

---

## What I shipped this week

- Updated `packages/evals/src/types.ts` — removed duplicate type definitions, now imports `AgentTrace`, `EvalMetric`, `EvalRunResult` from `@trionic/shared` as per Week-2 contracts. [PR #138](https://github.com/Trionic-Interns/trionic-ai-adalat/pull/138)
- Created `packages/evals/fixtures/rti.json` — 5 canned RTI drafts (3 valid citations, 2 with hallucinated/bad citations) for citation validity eval. [PR #138](https://github.com/Trionic-Interns/trionic-ai-adalat/pull/138)
- Updated `packages/evals/src/metrics/citationValidity.ts` — now uses `pageindex.get_text` contract from Samarth's `agnoTool.ts` to validate citations. Returns null for invalid/hallucinated nodes. [PR #138](https://github.com/Trionic-Interns/trionic-ai-adalat/pull/138)
- Updated `packages/evals/src/run.ts` — accepts `--fixture` and `--models` CLI args, computes `citation_validity_rate` across all fixtures, builds `EvalRunResult` per `@trionic/shared` contract, and calls `POST /api/admin/evals/run` to write results to `eval_runs` table. [PR #138](https://github.com/Trionic-Interns/trionic-ai-adalat/pull/138)
- Added `@trionic/shared` as workspace dependency in `packages/evals/package.json`. [PR #138](https://github.com/Trionic-Interns/trionic-ai-adalat/pull/138)
- Reviewed teammate reports and RFCs — Parth's usage analytics dashboard RFC and week-1 report as Evals team lead.

---

## Demo

Harness runs against RTI fixture set and computes citation validity:

```bash
# Single fixture (default)
pnpm test

# Multi-fixture with CLI args
npx tsx src/run.ts --fixture fixtures/rti.json --models claude-sonnet-4-20250514
```

Output shows per-fixture pass/fail, invalid citation node IDs, overall `citation_validity_rate`, and `EvalRunResult` JSON matching `@trionic/shared` contract.

---

## Metrics

| Metric                                        | Value | Notes                                                         |
| --------------------------------------------- | ----- | ------------------------------------------------------------- |
| PRs opened                                    | 1     | PR #138 — harness week-2                                      |
| Fixtures created                              | 1     | `rti.json` — 5 canned RTI drafts                              |
| Valid fixtures                                | 3     | rti-001, rti-002, rti-003                                     |
| Bad citation fixtures                         | 2     | rti-004, rti-005                                              |
| citation_validity_rate (rti.json)             | 71.4% | 5/7 citations valid — bad ones correctly detected             |
| citation_validity_rate (rti-english-001.json) | 100%  | All citations valid                                           |
| Types removed (duplicates)                    | 2     | `AgentTrace`, `CiteMarker` moved to `@trionic/shared` imports |

---

## Blockers

- `pageindex.get_text` real implementation pending Samarth's PR (`pageindex/query-api-week-2`) merge — currently using mock that matches his exact contract. Will swap import once merged.
- `eval_runs` API write works in code but skips gracefully when Next.js server is not running locally — will work correctly in deployed environment.

---

## Next week

- Replace mock `pageindex.get_text` with real import once Samarth's PR merges into main
- Add hallucination rate metric (P1) — coordinate with Kaushal once he joins org
- Add relevance scoring metric (P1)
- Add more fixtures covering IPC, Contract Act, CrPC
- Coordinate with Ayush on connecting `citation_validity_rate` results to his per-LLM dashboard

---

### Mentor feedback (filled by repo manager Friday 7 PM IST)

>
