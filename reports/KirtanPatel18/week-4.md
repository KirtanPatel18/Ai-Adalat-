# Week 4 — Kirtan Patel

**Team:** Team F — Evals & Telemetry
**Module owned:** Citation-correctness eval framework
**Week of:** 2026-06-08

---

## What I shipped this week

- Replaced `--fixture` CLI arg with `--dataset` in `packages/evals/src/run.ts` — matches issue #288 spec. Dataset ID maps to `fixtures/<dataset_id>.json`. [PR #315](https://github.com/Trionic-Interns/trionic-ai-adalat/pull/315)
- New comparison dashboard at `apps/web/app/admin/evals/comparison/page.tsx` — multi-model A/B table showing `citation_validity_rate` live, pending columns marked for hallucination/completeness/cost/latency. Built as own file, not touching Ayush's `page.tsx`. [PR #315](https://github.com/Trionic-Interns/trionic-ai-adalat/pull/315)
- Added `per_llm_dashboard` eval_type filter to citation-validity dashboard — carried from Week 3 stash, now live. [PR #315](https://github.com/Trionic-Interns/trionic-ai-adalat/pull/315)
- Wrote `packages/evals/INTEGRATION.md` — documents eval-runner pattern, `EvalRunResult` shape, `eval_runs` table filters, and per-team instructions for @Ayush5112006 (#289) and @parth-thakkar304 (#290). [PR #315](https://github.com/Trionic-Interns/trionic-ai-adalat/pull/315)
- Fixed broken conflict markers in `packages/evals/src/run.ts` and `packages/evals/tsconfig.json` introduced by Kaushal's self-merged PR #319 — restored `rootDir: '..'`, clean merged `run.ts` combining `--dataset` arg + Kaushal's metric calls with `try/catch` dynamic imports. [PR #323](https://github.com/Trionic-Interns/trionic-ai-adalat/pull/323) — merged by Dhruv.
- Synced `evals/harness-week-4` with main after PR #323 merged — resolved encoding-only conflict in `run.ts` (em dash vs hyphen), pushed clean branch. PR #315 conflict-free.
- Reviewed Ayush's PR #308 (evals/w4-observability-289) — verified `run.ts`, `tsconfig.json`, API files, and `page.tsx` move to `[locale]/` path. Approved from Evals team side.
- Coordinated with @KaushalVora193 on PR #322 conflict resolution — explained root cause (PR #319 self-merge → PR #323 fix → conflict in his new branch), guided him to resolve and keep dynamic import pattern.

---

## Demo

Multi-model harness run against 10 real RTI fixtures:

```bash
pnpm exec tsx src/run.ts --dataset rti-week3 --models claude-sonnet-4-20250514
```

Comparison dashboard at `/admin/evals/comparison` — multi-model citation validity table, one column per model.

Citation validity dashboard at `/admin/evals/citation-validity` — per-run results with `per_llm_dashboard` filter live.

---

## Metrics

| Metric                                  | Value | Notes                                                       |
| --------------------------------------- | ----- | ----------------------------------------------------------- |
| PRs opened                              | 2     | PR #315 (Week 4 harness), PR #323 (conflict fix)            |
| PRs merged                              | 1     | PR #323 — merged by Dhruv                                   |
| PRs open                                | 1     | PR #315 — conflict-free, awaiting review                    |
| PRs reviewed                            | 1     | PR #308 (Ayush) — approved                                  |
| citation_validity_rate (rti-week3.json) | 84.6% | 11/13 citations valid — confirmed this session              |
| Fixtures available                      | 10    | rti-week3.json — RTI only                                   |
| Dashboard pages                         | 2     | `/admin/evals/citation-validity`, `/admin/evals/comparison` |
| Integration docs                        | 1     | `packages/evals/INTEGRATION.md`                             |
| Teams documented                        | 2     | Ayush (#289), Parth (#290)                                  |

---

## Blockers

- **Multi-model real runs** — waiting on @YugGandhi PR #316 (DeepSeek wiring, has conflict in `router.config.ts`) + API keys only available on Vercel.
- **15 fixtures (cheque-bounce + consumer-complaint)** — waiting on @malaysheta PR #321 (Planner breadth, blocked on @om-patel91 confirming template IDs).
- **Hallucination rate + completeness columns** — waiting on @KaushalVora193 PR #322 (conflict resolved by Kaushal today, pending Dhruv merge).
- **Cost/run + p95 latency columns** — waiting on @om-patel91 GET route fix (`eval_runs` table reads, no PR seen yet).
- **Comparison table placement in `apps/web/app/admin/evals/page.tsx`** — waiting on manager reply on issue #288. Built own page at `/admin/evals/comparison` in the interim.

---

## Next week

- Add cheque-bounce + consumer-complaint fixtures (15 total) once Malaysheta's PR #321 merges
- Wire multi-model real runs (Claude + GPT-4o + DeepSeek) once Yug's PR #316 merges and API keys are available
- Fill pending comparison dashboard columns (hallucination, completeness, cost, latency) once dependent PRs merge
- Confirm comparison table placement decision with manager re: #288

---

### Mentor feedback (filled by repo manager Friday 7 PM IST)

>
