/**
 * tracing/index.ts
 * Owner: Umrania Yug (Tracing / observability layer)
 *
 * Public API for the tracing module.
 * Persists AgentTrace records to Supabase `agent_traces` table.
 */

// Local minimal AgentTrace type to avoid importing shared package during build.
// Keep in sync with packages/shared/src when that package is used by the build.
type AgentTrace = {
  agent: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number;
  status: string;
};
import { redactPII } from "./tracer.js";

// ─── Exports ──────────────────────────────────────────────────────────────────
// Everything other agents need is exported from here

export { Tracer } from "./tracer.js";
export { buildTrace, buildErrorTrace, redactPII } from "./tracer.js";
export type { TraceInput, TraceHandle, EndOptions } from "./tracer.js";

// ─── persistTrace ─────────────────────────────────────────────────────────────

/**
 * Save a trace to Supabase agent_traces table.
 *
 * Week 2: Supabase insert is stubbed — ready to wire when @trionic/db is available.
 *
 * IMPORTANT:
 * - Full content (including PII) is saved to DB — this is allowed per spec
 * - PII is redacted ONLY before sending errors to Sentry
 */
export async function persistTrace(trace: AgentTrace): Promise<void> {
  try {

    // ── TODO: Replace this stub with real Supabase client ──────────────────
    // import { supabase } from "@trionic/db";
    // const { error } = await supabase
    //   .from("agent_traces")
    //   .insert(trace);
    // if (error) throw error;
    // ───────────────────────────────────────────────────────────────────────

    // Stub: print to console so we can verify during development
    console.log(
      `[Trace] agent=${trace.agent}` +
      ` model=${trace.model}` +
      ` tokens=${trace.tokens_in}+${trace.tokens_out}` +
      ` cost=$${trace.cost_usd.toFixed(6)}` +
      ` latency=${trace.latency_ms}ms` +
      ` status=${trace.status}`
    );

  } catch (err) {
    // Redact PII before sending to Sentry
    const safeMessage = redactPII(
      err instanceof Error ? err.message : String(err)
    );
    console.error("[Trace] Failed to persist trace:", safeMessage);
    // TODO: Sentry.captureException(new Error(safeMessage))
  }
}