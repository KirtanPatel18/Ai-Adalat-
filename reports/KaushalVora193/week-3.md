# Week 3 — Kaushal Vora

**Team:** Team F — Evals & Telemetry
**Module owned:** Hallucination & completeness eval
**Week of:** 2026-06-02

---

## What I shipped this week

- Merged Kirtan's Week 3 branch `origin/evals/harness-week-3` to pull the **10 real RTI draft fixtures** (`rti-week3.json`) containing real node IDs into the repository. [PR pending](https://github.com/Trionic-Interns/trionic-ai-adalat)
- Updated `packages/evals/src/metrics/completeness.ts` to support key mappings for the new required template fields: `date+signature` and `info sought`.
- Added a default required sections list fallback in `completeness.ts` — if a fixture doesn't specify `ground_truth.required_sections`, it defaults to evaluating the five core RTI template fields (`address`, `subject`, `info sought`, `declaration`, `date+signature`).
- Ran the updated harness against the 10 real RTI drafts in `fixtures/rti-week3.json` to verify hallucination rates and completeness scores under real conditions.
- Verified that all workspace checks (TypeScript compile and test suites) pass cleanly.

---

## Demo

The updated evaluation harness successfully parses and scores Kirtan's 10 real Week 3 RTI stubs:

```bash
pnpm --filter @trionic/evals run test -- --fixture fixtures/rti-week3.json
```

Output highlights:
* Aggregates `citation_validity_rate` (84.6% due to bad citations correctly detected on cases 9 and 10), `hallucination_rate` (20.0% due to uncited claims like "Note that the public authority is required to..."), and `completeness_rate` (32.0% as stubs lack complete address blocks or declarations).
* Emits a valid `EvalRunResult` JSON matching the `@trionic/shared` contract.

---

## Metrics

| Metric | Value | Notes |
|---|---|---|
| Merges completed | 1 | Merged `evals/harness-week-3` |
| Real drafts evaluated | 10 | Case stubs inside `rti-week3.json` |
| citation_validity_rate | 84.6% | 11/13 citations valid (correctly caught invalid ones) |
| hallucination_rate | 20.0% | 3/15 claims uncited (detected and flagged) |
| completeness_rate | 32.0% | 16/50 required fields present across stubs |
| Typecheck errors | 0 | Harness typechecks cleanly |

---

## Blockers

- **None.** Week 3 integration completed successfully.

---

## Next week

- Expand default checking fallbacks to NDAs, Legal Notices, and Cheque Bounce Notices as other teams release their templates.
- Coordinate with Ayush (@ThummarAyush) on updating the dashboard to display the completeness rate and hallucination trends per LLM model.
- Sync with Malay (@malaysheta) on running evals dynamically on the output streams from the active classifier and planner agents.

---

### Mentor feedback (filled by repo manager Friday 7 PM IST)

> 
