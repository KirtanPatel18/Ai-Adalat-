/**
 * tracing/index.ts
 * Owner: Umrania Yug (Tracing / observability layer)
 *
 * Public API for the tracing module.
 * Persists AgentTrace records to Supabase `agent_traces` table.
 *
 * Week 1: persistence is a console.log stub.
 * TODO (Week 2): wire real Supabase client from packages/db.
 */

import type { AgentTrace } from "@trionic/shared";
export { buildTrace, buildErrorTrace } from "./tracer.js";
export type { TraceInput } from "./tracer.js";

/**
 * Persist a trace to the database (or log it in Week 1 stub mode).
 *
 * @param trace - The AgentTrace to persist.
 * @returns void — fire-and-forget; errors are caught and logged, never thrown.
 */
export async function persistTrace(trace: AgentTrace): Promise<void> {
  // ─── STUB (Week 1) ────────────────────────────────────────────────────────
  // Just log so we can see traces during development.
  console.log(
    `[Trace] agent=${trace.agent} model=${trace.model} ` +
    `tokens=${trace.tokens_in}+${trace.tokens_out} ` +
    `cost=$${trace.cost_usd.toFixed(6)} ` +
    `latency=${trace.latency_ms}ms ` +
    `status=${trace.status}`
  );

  // ─── TODO (Week 2): Real Supabase persistence ──────────────────────────────
  // import { supabase } from "@trionic/db";
  // const { error } = await supabase.from("agent_traces").insert(trace);
  // if (error) console.error("[Trace] Failed to persist trace:", error.message);
  // ──────────────────────────────────────────────────────────────────────────
}
